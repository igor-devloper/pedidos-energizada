// app/api/encomendas/upload-comprovante/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      txid,
      comprovanteBase64,
      valorPago,
    } = body as {
      txid: string;
      comprovanteBase64: string;
      valorPago?: number;
    };

    if (!txid || !comprovanteBase64) {
      return NextResponse.json(
        { error: "txid e comprovante são obrigatórios." },
        { status: 400 }
      );
    }

    const encomenda = await prisma.encomenda.update({
      where: { txid },
      data: {
        comprovanteBase64,
        status: "AGUARDANDO_VALIDACAO",
        valorPago: typeof valorPago === "number" ? valorPago : null,
      },
    });

    return NextResponse.json({ ok: true, encomenda });
  } catch (err: any) {
    console.error("UPLOAD_COMPROVANTE_ERROR", err);

    if (err?.code === "P2025") {
      return NextResponse.json(
        { error: "Encomenda não encontrada para este TXID." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Falha ao salvar comprovante." },
      { status: 500 }
    );
  }
}
