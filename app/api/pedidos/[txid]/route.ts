// app/api/pedidos-carrinho/[txid]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { confirmarPedidoPago } from "@/lib/pedido-pos-pagamento";

type Ctx = { params: Promise<{ txid: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const pedido = await prisma.pedidoCarrinho.findUnique({
      where: { txid: (await params).txid },
    });

    if (!pedido) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json(pedido);
  } catch (err) {
    console.error("[GET /api/pedidos-carrinho/[txid]]", err);
    return NextResponse.json(
      { error: "Erro ao buscar pedido." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { txid } = await params;
    const body = await req.json();

    const nome = String(body.nome ?? "").trim();
    const email = String(body.email ?? "").trim();
    const telefone = String(body.telefone ?? "").trim();
    const status = String(body.status ?? "").trim();

    if (!nome || !email || !telefone) {
      return NextResponse.json(
        { error: "Nome, e-mail e telefone são obrigatórios." },
        { status: 400 },
      );
    }

    const statusPermitidos = [
      "AGUARDANDO_PAGAMENTO",
      "PAGO",
      "CANCELADO",
    ] as const;

    if (
      !statusPermitidos.includes(
        status as (typeof statusPermitidos)[number],
      )
    ) {
      return NextResponse.json(
        { error: "Status inválido." },
        { status: 400 },
      );
    }

    const atual = await prisma.pedidoCarrinho.findUnique({
      where: { txid },
    });

    if (!atual) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 },
      );
    }

    // Primeiro salva os dados editáveis. Se o novo status for PAGO,
    // deixamos a rotina compartilhada fazer a transição e o pós-pagamento.
    await prisma.pedidoCarrinho.update({
      where: { txid },
      data: {
        nome,
        email,
        telefone,
        ...(status !== "PAGO"
          ? {
              status: status as
                | "AGUARDANDO_PAGAMENTO"
                | "CANCELADO",
            }
          : {}),
      },
    });

    let pedido;

    if (status === "PAGO") {
      pedido = await confirmarPedidoPago({
        txid,
        valorPago: Number(atual.valorTotal || 0),
        origem: "MANUAL",
      });
    } else {
      pedido = await prisma.pedidoCarrinho.findUnique({
        where: { txid },
      });
    }

    return NextResponse.json(pedido);
  } catch (err: any) {
    console.error("[PATCH /api/pedidos-carrinho/[txid]]", err);

    if (err?.code === "P2025") {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Erro ao atualizar pedido." },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { txid } = await params;

    await prisma.pedidoCarrinho.delete({
      where: { txid },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[DELETE /api/pedidos-carrinho/[txid]]", err);

    if (err?.code === "P2025") {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Erro ao excluir pedido." },
      { status: 500 },
    );
  }
}
