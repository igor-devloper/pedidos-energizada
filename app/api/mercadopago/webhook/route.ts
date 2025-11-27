// app/api/mercadopago/webhook/route.ts
import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { prisma } from "@/lib/db";

// 👉 MESMO TOKEN DO CHECKOUT
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!, // <--- aqui
});

const paymentClient = new Payment(mpClient);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    // 🔎 tenta pegar o ID pela query
    let paymentId: string | undefined =
      url.searchParams.get("data.id") || url.searchParams.get("id") || undefined;

    // 🔎 lê body cru pra não quebrar se vier vazio
    let body: any = null;
    try {
      const raw = await req.text();
      body = raw ? JSON.parse(raw) : null;
    } catch {
      body = null;
    }

    // payload novo do MP: { action: "payment.updated", data: { id } }
    if (!paymentId && body?.data?.id) {
      paymentId = String(body.data.id);
    }

    // payloads mais antigos podem vir com "resource"
    if (!paymentId && body?.resource) {
      const parts = String(body.resource).split("/");
      paymentId = parts[parts.length - 1];
    }

    if (!paymentId) {
      console.log("[MP webhook] Notificação sem paymentId", {
        query: url.searchParams.toString(),
        body,
      });
      return NextResponse.json({ ok: true });
    }

    console.log("[MP webhook] Recebido paymentId:", paymentId);

    // 👉 Busca detalhes do pagamento no Mercado Pago
    const payment = (await paymentClient.get({
      id: paymentId,
    })) as any;

    const txid = payment.external_reference as string | undefined;
    const mpStatus = payment.status as string | undefined;
    const amount = Number(payment.transaction_amount || 0);

    console.log("[MP webhook] payment.status =", mpStatus, "txid =", txid);

    if (!txid) {
      console.warn(
        "[MP webhook] Pagamento sem external_reference (txid).",
        payment
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
        "[MP webhook] Não encontrou PedidoCarrinho para txid",
        txid,
        err
      );
    }

    // Sempre 200 pro MP não ficar re-tentando
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/mercadopago/webhook] erro", err);
    // Mesmo com erro, devolve 200 pra não ficar em loop
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

export async function GET(req: Request) {
  return handleWebhook(req);
}

export async function POST(req: Request) {
  return handleWebhook(req);
}
