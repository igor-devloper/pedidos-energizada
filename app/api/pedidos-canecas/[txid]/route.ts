import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ txid: string }> }

export async function GET(_req: Request, { params }: Ctx) {

  try {
    const pedido = await prisma.pedidoCaneca.findUnique({
      where: { txid: (await params).txid },
    });

    if (!pedido) {
      return NextResponse.json(
        { error: "Pedido de caneca não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...pedido,
      valorTotal: Number(pedido.valorTotal),
      valorPago: pedido.valorPago != null ? Number(pedido.valorPago) : null,
    });
  } catch (e) {
    console.error("[GET /api/pedidos-canecas/:txid]", e);
    return NextResponse.json(
      { error: "Erro ao buscar pedido de caneca." },
      { status: 500 }
    );
  }
}
