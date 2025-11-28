// app/api/mercadopago/webhook/route.ts
import { NextResponse } from "next/server";
import { Payment } from "mercadopago";

import { prisma } from "@/lib/db";
import { mpClient, verifyMercadoPagoSignature } from "@/lib/mercado-pago";

export const runtime = "nodejs";

// mapeia status do MP para o status interno
type StatusInterno = "AGUARDANDO_PAGAMENTO" | "PAGO" | "CANCELADO";

function mapMpStatusToInterno(status?: string): StatusInterno {
  const s = (status || "").toLowerCase();

  if (s === "approved") return "PAGO";
  if (s === "rejected" || s === "cancelled") return "CANCELADO";

  // pending, in_process etc.
  return "AGUARDANDO_PAGAMENTO";
}

// Atualiza o PedidoCarrinho a partir de um pagamento do MP
async function updatePedidoFromPayment(payment: any) {
  const txid = payment.external_reference as string | undefined;
  const mpStatus = payment.status as string | undefined;
  const amount = Number(payment.transaction_amount || 0);

  if (!txid) {
    console.warn(
      "[MP webhook] Pagamento sem external_reference (txid).",
      payment.id
    );
    return;
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
}

export async function POST(req: Request) {
  try {
    // 1) valida assinatura
    verifyMercadoPagoSignature(req);

    // 2) lê o body enviado pelo Mercado Pago
    const body = (await req.json()) as any;
    const { type, data } = body;

    console.log("[MP webhook] body recebido:", JSON.stringify(body));

    if (type === "payment" && data?.id) {
      const paymentClient = new Payment(mpClient);

      // 3) busca detalhes completos do pagamento
      const payment = await paymentClient.get({ id: data.id });

      console.log(
        "[MP webhook] payment carregado:",
        payment.id,
        payment.status,
        payment.external_reference
      );

      // 4) atualiza PedidoCarrinho
      await updatePedidoFromPayment(payment);
    } else {
      console.log("[MP webhook] evento ignorado:", type);
    }

    // Sempre responde 200 para o MP não ficar re-tentando
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[/api/mercadopago/webhook] erro:", error);
    // Mesmo com erro, respondemos 200 para não ficar em loop de 502 no painel.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

// (opcionalmente, se o MP fizer GET — em geral não precisa)
export async function GET(req: Request) {
  return NextResponse.json({ ok: true });
}
