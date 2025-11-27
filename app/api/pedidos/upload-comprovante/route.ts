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

    // 1) Tenta na tabela de pedidos de uniforme
    let pedido = await prisma.pedido.findUnique({
      where: { txid },
    });

    let origem: "UNIFORME" | "CANECA" | null = null;

    if (pedido) {
      origem = "UNIFORME";
    } else {
      // 2) Se não achou, tenta na tabela de pedidos de caneca
      //    ⚠️ Se o nome do model for diferente, troque PedidoCaneca aqui.
      const pedidoCaneca = await prisma.pedidoCaneca.findUnique({
        where: { txid },
      });

      if (!pedidoCaneca) {
        return NextResponse.json(
          { error: "Pedido não encontrado." },
          { status: 404 }
        );
      }

      pedido = pedidoCaneca as any;
      origem = "CANECA";
    }

    // 3) Atualiza na tabela correta
    const dataUpdate = {
      comprovanteBase64,
      status: "AGUARDANDO_PAGAMENTO" as any,
      valorPago:
        typeof valorPago === "number" && !Number.isNaN(valorPago)
          ? valorPago
          : pedido?.valorPago,
    };

    let updated;

    if (origem === "UNIFORME") {
      updated = await prisma.pedido.update({
        where: { txid },
        data: dataUpdate,
      });
    } else {
      // ⚠️ Se o model for outro, troque aqui também
      updated = await prisma.pedidoCaneca.update({
        where: { txid },
        data: dataUpdate,
      });
    }

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
