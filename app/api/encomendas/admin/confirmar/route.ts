// app/api/encomendas/admin/confirmar/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  sendPedidoConfirmadoEmail,
  sendPedidoRecusadoEmail,
} from "@/lib/email/resend";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      txid,
      aprovado,
      tipo, // "METADE" | "TOTAL" (quando aprovado)
      motivo,
    } = body as {
      txid: string;
      aprovado: boolean;
      tipo?: "METADE" | "TOTAL";
      motivo?: string;
    };

    if (!txid) {
      return NextResponse.json(
        { error: "txid é obrigatório." },
        { status: 400 }
      );
    }

    if (aprovado) {
      let status: "PAGO_METADE" | "CONFIRMADO" = "CONFIRMADO";
      if (tipo === "METADE") status = "PAGO_METADE";

      const encomenda = await prisma.encomenda.update({
        where: { txid },
        data: { status },
        include: { itens: true },
      });

      // dispara o e-mail de confirmação (meia ou total)
      await sendPedidoConfirmadoEmail(
        {
          txid: encomenda.txid,
          nome: encomenda.nome,
          email: encomenda.email,
          totalItens: encomenda.totalItens,
          valorTotal: Number(encomenda.valorTotal),
          valorPago: encomenda.valorPago
            ? Number(encomenda.valorPago)
            : undefined,
        },
        tipo === "METADE" ? "METADE" : "TOTAL"
      );

      return NextResponse.json({ ok: true, encomenda });
    }

    // caso de reprovação / cancelamento
    const encomenda = await prisma.encomenda.update({
      where: { txid },
      data: { status: "CANCELADO" },
      include: { itens: true },
    });

    await sendPedidoRecusadoEmail(
      {
        txid: encomenda.txid,
        nome: encomenda.nome,
        email: encomenda.email,
      },
      motivo
    );

    return NextResponse.json({ ok: true, encomenda });
  } catch (err: any) {
    console.error("ADMIN_CONFIRMAR_ERROR", err);
    return NextResponse.json(
      { error: "Erro ao atualizar status da encomenda." },
      { status: 500 }
    );
  }
}
