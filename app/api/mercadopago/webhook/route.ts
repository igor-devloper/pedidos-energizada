// app/api/mercadopago/webhook/route.ts
import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
});

const paymentClient = new Payment(mpClient);

type StatusInterno = "AGUARDANDO_PAGAMENTO" | "PAGO" | "CANCELADO";

function mapMpStatusToInterno(status?: string): StatusInterno {
  const s = (status || "").toLowerCase();
  if (s === "approved") return "PAGO";
  if (s === "rejected" || s === "cancelled") return "CANCELADO";
  return "AGUARDANDO_PAGAMENTO";
}

async function handleWebhook(req: Request) {
  try {
    const url = new URL(req.url);

    // 1) topic / type / action
    const topic =
      url.searchParams.get("topic") ||
      url.searchParams.get("type") ||
      url.searchParams.get("action") ||
      undefined;

    // 2) ID pela query
    let paymentId =
      url.searchParams.get("data.id") || url.searchParams.get("id") || "";

    // 3) Se não veio na query, tenta corpo (JSON ou x-www-form-urlencoded)
    if (!paymentId && req.method === "POST") {
      const contentType = req.headers.get("content-type") || "";

      let body: any = undefined;

      if (contentType.includes("application/json")) {
        body = await req.json().catch(() => undefined);
      } else if (
        contentType.includes("application/x-www-form-urlencoded") ||
        contentType.includes("text/plain")
      ) {
        const text = await req.text().catch(() => "");
        const params = new URLSearchParams(text);
        body = Object.fromEntries(params.entries());
      }

      if (body?.data?.id) paymentId = String(body.data.id);
      else if (body?.id) paymentId = String(body.id);
      else if (body?.resourceId) paymentId = String(body.resourceId);
    }

    // 4) Se não for payment ou não tiver ID, ignora mas devolve 200
    if (topic !== "payment" || !paymentId) {
      console.log("[MP webhook] ignorado", { topic, paymentId });
      return NextResponse.json({ ok: true });
    }

    console.log("[MP webhook] recebida notificação payment", {
      paymentId,
      topic,
      method: req.method,
    });

    // 5) Busca o pagamento no MP
    let payment: any;
    try {
      payment = await paymentClient.get({ id: paymentId });
    } catch (e) {
      console.error("[MP webhook] erro ao buscar payment", paymentId, e);
      // responde 200 pro MP parar de tentar (não queremos loop infinito)
      return NextResponse.json({ ok: true });
    }

    const txid = payment.external_reference as string | undefined;
    const mpStatus = payment.status as string | undefined;
    const amount = Number(payment.transaction_amount ?? 0);

    console.log("[MP webhook] payment recebido", {
      id: paymentId,
      txid,
      mpStatus,
      amount,
    });

    if (!txid) {
      console.warn(
        "[MP webhook] pagamento sem external_reference (txid), nada para atualizar."
      );
      return NextResponse.json({ ok: true });
    }

    const novoStatus = mapMpStatusToInterno(mpStatus);

    try {
      await prisma.pedidoCarrinho.update({
        where: { txid },
        data: {
          status: novoStatus,
          valorPago: amount > 0 ? amount : undefined,
        },
      });

      console.log(
        "[MP webhook] PedidoCarrinho atualizado",
        txid,
        "=>",
        novoStatus,
        "valorPago:",
        amount
      );
    } catch (err) {
      console.warn(
        "[MP webhook] não encontrou PedidoCarrinho para txid",
        txid,
        err
      );
    }

    // Sempre 200 pro MP
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Qualquer exceção que escaparia e viraria 502 cai aqui
    console.error("[/api/mercadopago/webhook] erro inesperado", err);
    // Mesmo com erro, responde 200 pra não gerar mais 502 no painel
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

export async function GET(req: Request) {
  return handleWebhook(req);
}

export async function POST(req: Request) {
  return handleWebhook(req);
}
