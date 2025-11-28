// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { MercadoPagoConfig, Preference } from "mercadopago";

import { prisma } from "@/lib/db";
import { CartItem } from "@/lib/cart-types";
import {
  calcularTotalComTaxas,
  type MetodoPagamento,
  type Parcelas,
} from "@/lib/calc-tax";

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
});

function generateTxId() {
  return crypto.randomBytes(10).toString("hex");
}

type Body = {
  nome: string;
  email: string;
  telefone: string; // pode vir com máscara
  items: CartItem[];
  metodoPagamento: MetodoPagamento;
  parcelas: Parcelas;
};

// normaliza número: só dígitos, máximo 2
function normalizarNumeroCamisa(n?: string | number | null): string | null {
  if (n == null) return null;
  const v = String(n).replace(/\D/g, "").slice(0, 2);
  return v || null;
}

/**
 * A partir de um Set com números já usados, escolhe a primeira
 * opção disponível entre até 3 números sugeridos.
 * Já adiciona o escolhido ao Set para não repetir.
 */
function escolherNumeroEntreOpcoes(
  opcoesBrutas: (string | undefined | null)[],
  numerosUsados: Set<string>,
): string | null {
  const opcoes = opcoesBrutas
    .map((o) => normalizarNumeroCamisa(o))
    .filter((o): o is string => Boolean(o));

  for (const opc of opcoes) {
    if (!numerosUsados.has(opc)) {
      numerosUsados.add(opc);
      return opc;
    }
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const {
      nome,
      email,
      telefone,
      items,
      metodoPagamento,
      parcelas,
    }: Body = await req.json();

    if (!nome || !email || !telefone || !items?.length) {
      return NextResponse.json(
        { error: "Dados incompletos para checkout." },
        { status: 400 },
      );
    }

    // telefone só com dígitos
    const telefoneDigits = telefone.replace(/\D/g, "");

    // ===== 1) Buscar números de camisa já usados =====
    const pedidosExistentes = await prisma.pedidoCarrinho.findMany({
      select: { itemsJson: true, status: true },
    });

    const numerosUsados = new Set<string>();

    for (const p of pedidosExistentes) {
      const itens = (p.itemsJson as any[]) ?? [];
      for (const it of itens) {
        if (it?.kind === "UNIFORME") {
          const n = normalizarNumeroCamisa(
            it.numeroCamisa ?? it.numeroCamisaAtual,
          );
          if (n) numerosUsados.add(n);
        }
      }
    }

    // ===== 2) Processar itens e escolher número de camisa =====
    const itensProcessados = await Promise.all(
      items.map(async (item) => {
        if (item.kind !== "UNIFORME") {
          return item;
        }

        const anyItem = item as any;

        let numeroCamisa: string | null = null;

        if (anyItem.jaTemCamisa && anyItem.numeroCamisaAtual) {
          // quem já tem camisa mantém o número atual (sem checar duplicidade)
          numeroCamisa = normalizarNumeroCamisa(anyItem.numeroCamisaAtual);
        } else {
          // novo uniforme -> escolher entre as 3 opções disponíveis
          numeroCamisa = escolherNumeroEntreOpcoes(
            [anyItem.numeroOpcao1, anyItem.numeroOpcao2, anyItem.numeroOpcao3],
            numerosUsados,
          );
        }

        return {
          ...item,
          numeroCamisa, // fica salvo dentro do JSON
        } as CartItem & { numeroCamisa?: string | null };
      }),
    );

    // ===== 3) Calcular valores (subtotal + taxas) =====
    const valorBase = itensProcessados.reduce(
      (sum, i) => sum + i.unitPrice * i.quantity,
      0,
    );

    const { totalConsumidor, taxaTotal, taxaPercentual } =
      calcularTotalComTaxas(valorBase, metodoPagamento, parcelas);

    const txid = generateTxId();

    // ===== 4) Salvar PedidoCarrinho =====
    const pedido = await prisma.pedidoCarrinho.create({
      data: {
        nome,
        email,
        telefone: telefoneDigits,
        itemsJson: itensProcessados, // já com numeroCamisa definido
        valorTotal: totalConsumidor,
        txid,
        status: "AGUARDANDO_PAGAMENTO",
        // se quiser depois, pode adicionar campos extras no schema e salvar:
        // valorBase,
        // taxaRepassada: taxaTotal,
        // taxaPercentual,
        // metodoPagamento,
        // parcelas,
      } as any,
    });

    // ===== 5) Criar preferência no Mercado Pago =====
    const preference = new Preference(mpClient);
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

    const mpItems = [
      ...itensProcessados.map((i) => ({
        id: i.productId,
        title: i.label,
        quantity: i.quantity,
        unit_price: Number(i.unitPrice.toFixed(2)),
        currency_id: "BRL" as const,
      })),
      ...(taxaTotal > 0
        ? [
            {
              id: "TAXA_SERVICO",
              title: "Taxa de serviço",
              quantity: 1,
              unit_price: Number(taxaTotal.toFixed(2)),
              currency_id: "BRL" as const,
            },
          ]
        : []),
    ];

    const pref = await preference.create({
      body: {
        items: mpItems,
        payer: {
          name: nome,
          email,
        },
        external_reference: pedido.txid,
        back_urls: {
          success: `${APP_URL}/final?status=success&txid=${pedido.txid}`,
          failure: `${APP_URL}/final?status=failure&txid=${pedido.txid}`,
          pending: `${APP_URL}/final?status=pending&txid=${pedido.txid}`,
        },
        notification_url: `${APP_URL}/api/mercadopago/webhook`,
        auto_return: "approved",
      },
    });

    return NextResponse.json({
      initPoint: pref.init_point,
      preferenceId: pref.id,
      txid: pedido.txid,
    });
  } catch (err) {
    console.error("[POST /api/checkout]", err);
    return NextResponse.json(
      { error: "Erro ao iniciar checkout." },
      { status: 500 },
    );
  }
}
