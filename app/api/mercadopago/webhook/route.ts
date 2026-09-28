// app/api/mercadopago/webhook/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  paymentClient,
  verifyMercadoPagoSignature,
} from "@/lib/mercado-pago";
import { confirmarPedidoPago } from "@/lib/pedido-pos-pagamento";

export const runtime = "nodejs";
export const maxDuration = 30;

type MpWebhookBody = {
  action: string;
  api_version?: string;
  data: {
    id: string;
  };
  date_created?: string;
  live_mode?: boolean;
  type: string;
  user_id?: string;
};

type StatusInterno =
  | "AGUARDANDO_PAGAMENTO"
  | "PAGO"
  | "CANCELADO";

function mapMpStatusToInterno(
  status?: string,
): StatusInterno {
  const s = (status || "").toLowerCase();

  if (s === "approved") return "PAGO";

  if (s === "rejected" || s === "cancelled") {
    return "CANCELADO";
  }

  return "AGUARDANDO_PAGAMENTO";
}

async function atualizarPedidoPorPagamento(
  paymentId: string,
) {
  try {
    console.log(
      "[MP webhook] Buscando pagamento:",
      paymentId,
    );

    const payment = await paymentClient.get({
      id: paymentId,
    });

    const txid =
      payment.external_reference as string | undefined;

    const mpStatus =
      payment.status as string | undefined;

    const amount = Number(
      payment.transaction_amount || 0,
    );

    console.log("[MP webhook] payment:", {
      id: paymentId,
      txid,
      status: mpStatus,
      amount,
    });

    if (!txid) {
      console.warn(
        "[MP webhook] Pagamento sem external_reference (txid).",
        paymentId,
      );
      return;
    }

    const novoStatus =
      mapMpStatusToInterno(mpStatus);

    if (novoStatus === "PAGO") {
      const pedido = await confirmarPedidoPago({
        txid,
        valorPago:
          amount > 0 ? amount : undefined,
        origem: "MERCADO_PAGO",
      });

      console.log(
        "[MP webhook] Pedido confirmado:",
        pedido.id,
        "txid:",
        txid,
        "=> PAGO",
        "valorPago:",
        pedido.valorPago,
      );

      return;
    }

    const pedidoAtualizado =
      await prisma.pedidoCarrinho.update({
        where: { txid },
        data: {
          status: novoStatus,
          ...(amount > 0
            ? { valorPago: amount }
            : {}),
        },
      });

    console.log(
      "[MP webhook] PedidoCarrinho atualizado:",
      pedidoAtualizado.id,
      "txid:",
      txid,
      "=>",
      novoStatus,
      "valorPago:",
      amount,
    );
  } catch (err: any) {
    console.error(
      "[MP webhook] Erro ao buscar/atualizar pagamento:",
      err,
    );
    throw err;
  }
}

export async function POST(req: Request) {
  try {
    console.log("[MP webhook] Headers:", {
      "x-signature":
        req.headers.get("x-signature"),
      "x-request-id":
        req.headers.get("x-request-id"),
      "content-type":
        req.headers.get("content-type"),
    });

    console.log("[MP webhook] URL:", req.url);

    const bodyText = await req.text();

    console.log(
      "[MP webhook] Body raw:",
      bodyText,
    );

    let body: MpWebhookBody;

    try {
      body = JSON.parse(bodyText);
    } catch (parseErr) {
      console.error(
        "[MP webhook] Erro ao fazer parse do body:",
        parseErr,
      );

      return NextResponse.json(
        {
          ok: false,
          reason: "invalid-json",
        },
        { status: 200 },
      );
    }

    console.log(
      "[MP webhook] Body parsed:",
      body,
    );

    const xSignature =
      req.headers.get("x-signature");

    const xRequestId =
      req.headers.get("x-request-id");

    try {
      verifyMercadoPagoSignature({
        xSignature,
        xRequestId,
        url: req.url,
        bodyDataId: body.data?.id,
      });
    } catch (sigErr: any) {
      console.error(
        "[MP webhook] assinatura inválida:",
        sigErr.message,
      );

      // Mantido o comportamento atual:
      // responde 200 para não quebrar o painel do Mercado Pago.
    }

    if (
      body.type !== "payment" ||
      !body.data?.id
    ) {
      console.log(
        "[MP webhook] Evento ignorado:",
        body.type,
      );

      return NextResponse.json(
        {
          ok: true,
          ignored: true,
        },
        { status: 200 },
      );
    }

    await Promise.race([
      atualizarPedidoPorPagamento(
        body.data.id,
      ),

      new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                "Timeout de 25s atingido",
              ),
            ),
          25000,
        ),
      ),
    ]);

    console.log(
      "[MP webhook] Processamento concluído com sucesso",
    );

    return NextResponse.json(
      { ok: true },
      { status: 200 },
    );
  } catch (err: any) {
    console.error(
      "[MP webhook] Erro geral:",
      {
        message: err.message,
        stack: err.stack,
        name: err.name,
      },
    );

    return NextResponse.json(
      {
        ok: false,
        error: err.message,
      },
      { status: 200 },
    );
  }
}

export async function GET(req: Request) {
  console.log(
    "[MP webhook] GET",
    req.url,
  );

  return NextResponse.json({
    ok: true,
    message: "Webhook endpoint ativo",
  });
}
