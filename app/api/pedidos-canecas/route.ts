import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateTxId } from "@/lib/pix";

// 💰 Tabela de preços das canecas
const PRECO_CANECA = 25;
const PRECO_TIRANTE = 10;
const PRECO_KIT = 30;

export async function GET() {
  try {
    const pedidos = await prisma.pedidoCaneca.findMany({
      orderBy: { createdAt: "desc" },
    });

    const data = pedidos.map((p) => ({
      ...p,
      valorTotal: Number(p.valorTotal),
      valorPago: p.valorPago != null ? Number(p.valorPago) : null,
    }));

    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/pedidos-canecas]", err);
    return NextResponse.json(
      { error: "Erro ao listar pedidos de caneca" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      nome,
      email,
      telefone,
      tipoProduto, // "CANECA" | "TIRANTE" | "KIT"
      quantidade,
      observacao,
    } = body;

    if (!nome || !email || !telefone || !tipoProduto || !quantidade) {
      return NextResponse.json(
        { error: "Campos obrigatórios não preenchidos." },
        { status: 400 }
      );
    }

    if (!["CANECA", "TIRANTE", "KIT"].includes(tipoProduto)) {
      return NextResponse.json(
        { error: "Tipo de produto inválido." },
        { status: 400 }
      );
    }

    const qtdNum = Number(quantidade);
    if (!qtdNum || qtdNum <= 0) {
      return NextResponse.json(
        { error: "Quantidade deve ser maior que zero." },
        { status: 400 }
      );
    }

    // 💰 Calcula o valor com base na tabela, não confia em valor vindo do front
    let precoUnitario = PRECO_CANECA;
    if (tipoProduto === "TIRANTE") precoUnitario = PRECO_TIRANTE;
    if (tipoProduto === "KIT") precoUnitario = PRECO_KIT;

    const valorTotal = precoUnitario * qtdNum;

    const txid = generateTxId();

    const pedido = await prisma.pedidoCaneca.create({
      data: {
        nome,
        email,
        telefone,
        tipoProduto,
        quantidade: qtdNum,
        observacao: observacao || null,
        valorTotal,
        txid,
      },
    });

    return NextResponse.json({ txid, pedido });
  } catch (e) {
    console.error("[POST /api/pedidos-canecas]", e);
    return NextResponse.json(
      { error: "Erro ao criar pedido de caneca." },
      { status: 500 }
    );
  }
}
