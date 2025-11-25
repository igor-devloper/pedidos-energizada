import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
type Ctx = { params: Promise<{ txid: string }> }
export async function GET(
  req: Request,
  { params }: Ctx 
) {
  try {
    const pedido = await prisma.pedido.findUnique({
      where: { txid: (await params).txid },
    });

    if (!pedido) {
      return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
    }

    return NextResponse.json(pedido);
  } catch (e) {
    return NextResponse.json(
      { error: "Erro ao buscar pedido." },
      { status: 500 }
    );
  }
}
