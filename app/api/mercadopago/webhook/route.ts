// app/api/mercadopago/webhook/route.ts
import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { prisma } from "@/lib/db";

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
});

const paymentClient = new Payment(mpClient);

export const runtime = "nodejs";

type StatusInterno = "AGUARDANDO_PAGAMENTO" | "PAGO" | "CANCELADO";

function mapMpStatusToInterno(status?: string): StatusInterno {
  const s = (status || "").toLowerCase();

  if (s === "approved") return "PAGO";
  if (s === "rejected" || s === "cancelled") return "CANCELADO";

  return "AGUARDANDO_PAGAMENTO"; // pending, in_process, etc
}

async function handleWebhook(req: Request) {
  try {
    const url = new URL(req.url);

    // MP pode mandar infos via query string e/ou body
    const topic =
      url.searchParams.get("topic") ||
      url.searchParams.get("type") ||
      undefined;
    const paymentIdQS =
      url.searchParams.get("data.id") || url.searchParams.get("id");

    let paymentId = paymentIdQS;

    if (!paymentId) {
      // tenta pegar do body (algumas configs mandam POST com JSON)
      try {
        const body = (await req.json()) as any;
        if (body?.data?.id) paymentId = String(body.data.id);
      } catch {
        // se não tiver body JSON, ignora
      }
    }

    if (topic !== "payment" || !paymentId) {
      // nada pra fazer, mas responde 200 pra não ficar re-tentando à toa
      return NextResponse.json({ ok: true });
    }

    // Busca detalhes do pagamento no Mercado Pago
    const payment = (await paymentClient.get({
      id: paymentId,
    })) as any;

    const txid = payment.external_reference as string | undefined;
    const mpStatus = payment.status as string | undefined;
    const amount = Number(payment.transaction_amount || 0);

    if (!txid) {
      console.warn(
        "[MP webhook] Pagamento sem external_reference (txid).",
        payment
      );
      return NextResponse.json({ ok: true });
    }

    const novoStatus = mapMpStatusToInterno(mpStatus);

    // Atualiza pedidoCarrinho
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

    // Sempre responde 200 pra não ficar em loop de tentativas
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/mercadopago/webhook] erro", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

export async function GET(req: Request) {
  return handleWebhook(req);
}

export async function POST(req: Request) {
  return handleWebhook(req);
}
