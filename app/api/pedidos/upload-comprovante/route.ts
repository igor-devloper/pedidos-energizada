// app/api/pedidos/upload-comprovante/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Body = {
  txid: string;
  comprovanteBase64: string;
  valorPago?: number;
};

export async function POST(req: Request) {
  try {
    const { txid, comprovanteBase64, valorPago }: Body = await req.json();

    if (!txid || !comprovanteBase64) {
      return NextResponse.json(
        { error: "txid e comprovante são obrigatórios." },
        { status: 400 }
      );
    }

    const pedido = await prisma.pedido.findUnique({
      where: { txid },
    });

    if (!pedido) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    const updated = await prisma.pedido.update({
      where: { txid },
      data: {
        comprovanteBase64,
        status: "AGUARDANDO_PAGAMENTO",
        valorPago:
          typeof valorPago === "number" && !Number.isNaN(valorPago)
            ? valorPago
            : pedido.valorPago,
      },
    });

    return NextResponse.json({
      ...updated,
      valorTotal: Number(updated.valorTotal),
      valorPago:
        updated.valorPago != null ? Number(updated.valorPago) : null,
    });
  } catch (err) {
    console.error("[POST /api/pedidos/upload-comprovante]", err);
    return NextResponse.json(
      { error: "Erro ao salvar comprovante." },
      { status: 500 }
    );
  }
}
