// app/api/encomendas/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateTxId } from "@/lib/pix";

const UNIT_PRICE = 0.9;

function calcularLimiteTipos(total: number): number {
  if (total < 50) return 0; // abaixo do mínimo não libera tipos

  const centenas = Math.floor(total / 100);
  const resto = total % 100;

  let maxTipos = centenas * 3; // 3 tipos por cento

  // se sobrou pelo menos meio cento (50–99), ganha +2 tipos
  if (resto >= 50) {
    maxTipos += 2;
  }

  // Ex: 50–99 => 0 * 3 + 2 = 2 tipos
  return maxTipos;
}

// POST /api/encomendas  -> cria pedido
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      nome,
      telefone,
      email,
      endereco,
      observacoes,
      itens,
    } = body as {
      nome: string;
      telefone: string;
      email: string;
      endereco: string;
      observacoes?: string;
      itens: { tipo: string; quantidade: number }[];
    };

    if (!nome || !telefone || !email || !endereco) {
      return NextResponse.json(
        { error: "Campos obrigatórios não preenchidos." },
        { status: 400 }
      );
    }

    if (!Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json(
        { error: "Informe ao menos um tipo de salgado." },
        { status: 400 }
      );
    }

    const itensFiltrados = itens
      .map((i) => ({
        tipo: i.tipo,
        quantidade: Number(i.quantidade) || 0,
      }))
      .filter((i) => i.quantidade > 0);

    const totalItens = itensFiltrados.reduce(
      (acc, i) => acc + i.quantidade,
      0
    );

    if (totalItens < 50) {
      return NextResponse.json(
        { error: "O pedido mínimo é de 50 unidades." },
        { status: 400 }
      );
    }

    const maxTipos = calcularLimiteTipos(totalItens);
    if (itensFiltrados.length > maxTipos) {
      return NextResponse.json(
        {
          error: `Para essa quantidade de unidades, você pode escolher no máximo ${maxTipos} tipos de salgados.`,
        },
        { status: 400 }
      );
    }

    const valorTotal = totalItens * UNIT_PRICE;
    const txid = generateTxId();

    const encomenda = await prisma.encomenda.create({
      data: {
        txid,
        nome,
        telefone,
        email,
        observacoes: observacoes || null,
        totalItens,
        valorTotal,
        status: "AGUARDANDO_PAGAMENTO",
        itens: {
          create: itensFiltrados.map((i) => ({
            tipo: i.tipo,
            quantidade: i.quantidade,
          })),
        },
      },
      include: {
        itens: true,
      },
    });

    return NextResponse.json(
      {
        txid,
        encomenda,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/encomendas error", err);
    return NextResponse.json(
      { error: "Erro ao criar pedido." },
      { status: 500 }
    );
  }
}

// GET /api/encomendas  -> lista para o painel admin
export async function GET() {
  try {
    const encomendas = await prisma.encomenda.findMany({
      orderBy: { createdAt: "desc" },
      include: { itens: true },
    });

    return NextResponse.json(encomendas);
  } catch (err) {
    console.error("GET /api/encomendas error", err);
    return NextResponse.json(
      { error: "Erro ao carregar encomendas." },
      { status: 500 }
    );
  }
}
