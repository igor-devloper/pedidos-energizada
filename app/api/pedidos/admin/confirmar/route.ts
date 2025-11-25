// app/api/pedidos/admin/confirmar/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Body = {
  txid: string;
  aprovado: boolean;
  tipo?: "METADE" | "TOTAL";
  motivo?: string;
};

export async function POST(req: Request) {
  try {
    const { txid, aprovado, tipo }: Body = await req.json();

    if (!txid) {
      return NextResponse.json(
        { error: "txid é obrigatório" },
        { status: 400 }
      );
    }

    const pedido = await prisma.pedido.findUnique({
      where: { txid },
    });

    if (!pedido) {
      return NextResponse.json(
        { error: "Pedido não encontrado" },
        { status: 404 }
      );
    }

    // CANCELADO
    if (!aprovado) {
      const updated = await prisma.pedido.update({
        where: { txid },
        data: {
          status: "CANCELADO",
          // se quiser guardar motivo:
          // motivoCancelamento: motivo ?? null,
        },
      });

      return NextResponse.json({
        ...updated,
        valorTotal: Number(updated.valorTotal),
        valorPago:
          updated.valorPago != null ? Number(updated.valorPago) : null,
      });
    }

    // APROVADO → METADE ou TOTAL
    if (!tipo) {
      return NextResponse.json(
        { error: "Informe o tipo: 'METADE' ou 'TOTAL'." },
        { status: 400 }
      );
    }

    const valorTotal = Number(pedido.valorTotal);
    const valorPago = tipo === "METADE" ? valorTotal / 2 : valorTotal;
    const status = tipo === "METADE" ? "PAGO_METADE" : "PAGO";

    const updated = await prisma.pedido.update({
      where: { txid },
      data: {
        status,
        valorPago,
      },
    });

    return NextResponse.json({
      ...updated,
      valorTotal: Number(updated.valorTotal),
      valorPago:
        updated.valorPago != null ? Number(updated.valorPago) : null,
    });
  } catch (err) {
    console.error("[POST /api/pedidos/admin/confirmar]", err);
    return NextResponse.json(
      { error: "Erro ao confirmar/cancelar pedido" },
      { status: 500 }
    );
  }
}
