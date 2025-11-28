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
  telefone: string;
  items: CartItem[];
  metodoPagamento: MetodoPagamento;
  parcelas: Parcelas;
};

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
        { status: 400 }
      );
    }

    // subtotal sem taxas
    const valorBase = items.reduce(
      (sum, i) => sum + i.unitPrice * i.quantity,
      0
    );

    const { totalConsumidor, taxaTotal, taxaPercentual } =
      calcularTotalComTaxas(valorBase, metodoPagamento, parcelas);

    const txid = generateTxId();

    // salva pedido geral
    const pedido = await prisma.pedidoCarrinho.create({
      data: {
        nome,
        email,
        telefone,
        itemsJson: items,
        valorTotal: totalConsumidor,
        // totalConsumidor
        txid,
        status: "AGUARDANDO_PAGAMENTO",
        // se tiver esses campos no schema, pode salvar:
        // valorBase,
        // taxaRepassada: taxaTotal,
        // taxaPercentual,
        // metodoPagamento,
        // parcelas,
      } as any,
    });

    const preference = new Preference(mpClient);
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

    // Itens que o MP vai exibir
    const mpItems = [
      ...items.map((i) => ({
        id: i.productId,
        title: i.label,
        quantity: i.quantity,
        unit_price: Number(i.unitPrice.toFixed(2)),
        currency_id: "BRL" as const,
      })),
      // item extra para repassar a taxa
      ...(taxaTotal > 0
        ? [
            {
              id: "TAXA_SERVICO",
              title: "Taxa de serviço Mercado Pago",
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
      { status: 500 }
    );
  }
}
