// app/api/admin/pedidos-carrinho/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const pedidos = await prisma.pedidoCarrinho.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      pedidos.map((p) => ({
        id: p.id,
        txid: p.txid,
        nome: p.nome,
        email: p.email,
        telefone: p.telefone,
        status: p.status,
        valorTotal: p.valorTotal,
        valorPago: p.valorPago,
        itemsJson: p.itemsJson,
        createdAt: p.createdAt,
      }))
    );
  } catch (err) {
    console.error("[GET /api/admin/pedidos-carrinho]", err);
    return NextResponse.json(
      { error: "Erro ao buscar pedidos" },
      { status: 500 }
    );
  }
}
