// app/api/encomendas/[txid]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";


type Ctx = { params: Promise<{ txid: string }> }
export async function GET(
  _req: Request,
  { params }: Ctx
) {
  try {
    const { txid } = await params;

    const encomenda = await prisma.encomenda.findUnique({
      where: { txid },
      include: { itens: true },
    });

    if (!encomenda) {
      return NextResponse.json(
        { error: "Encomenda não encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json(encomenda);
  } catch (err) {
    console.error("GET /api/encomendas/[txid] error", err);
    return NextResponse.json(
      { error: "Erro ao carregar encomenda." },
      { status: 500 }
    );
  }
}
