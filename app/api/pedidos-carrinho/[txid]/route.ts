// app/api/pedidos-carrinho/[txid]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = {
  params: { txid: string };
};

export async function GET(_req: Request, { params }: Params) {
  try {
    const pedido = await prisma.pedidoCarrinho.findUnique({
      where: { txid: params.txid },
    });

    if (!pedido) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json(pedido);
  } catch (err) {
    console.error("[GET /api/pedidos-carrinho/[txid]]", err);
    return NextResponse.json(
      { error: "Erro ao buscar pedido." },
      { status: 500 }
    );
  }
}
