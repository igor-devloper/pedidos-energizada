import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { paymentClient, verifyMercadoPagoSignature } from "@/lib/mercado-pago";

export const runtime = "nodejs";

// corpo que o MP está mandando (igual ao print)
type MpWebhookBody = {
  action: string; // "payment.updated" | "payment.created" etc
  api_version?: string;
  data: {
    id: string; // id do pagamento: 134933991229
  };
  date_created?: string;
  live_mode?: boolean;
  type: string; // "payment"
  user_id?: string;
};

type StatusInterno = "AGUARDANDO_PAGAMENTO" | "PAGO" | "CANCELADO";

function mapMpStatusToInterno(status?: string): StatusInterno {
  const s = (status || "").toLowerCase();

  if (s === "approved") return "PAGO";
  if (s === "rejected" || s === "cancelled") return "CANCELADO";

  return "AGUARDANDO_PAGAMENTO"; // pending, in_process, etc.
}

async function atualizarPedidoPorPagamento(paymentId: string) {
  // busca detalhes do pagamento no MP
  const payment = (await paymentClient.get({ id: paymentId })) as any;

  const txid = payment.external_reference as string | undefined;
  const mpStatus = payment.status as string | undefined;
  const amount = Number(payment.transaction_amount || 0);

  console.log("[MP webhook] payment:", {
    id: paymentId,
    txid,
    status: mpStatus,
    amount,
  });

  if (!txid) {
    console.warn(
      "[MP webhook] Pagamento sem external_reference (txid).",
      paymentId
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
    // 🔒 valida assinatura (se o secret estiver configurado)
    // try {
    //   verifyMercadoPagoSignature(req);
    // } catch (sigErr) {
    //   console.error("[MP webhook] assinatura inválida:", sigErr);
    //   // ainda assim respondemos 200 pra não ficar em loop
    //   return NextResponse.json({ ok: false, reason: "invalid-signature" }, { status: 200 });
    // }

    const body = (await req.json()) as MpWebhookBody;
    console.log("[MP webhook] body recebido:", body);

    if (body.type !== "payment" || !body.data?.id) {
      // não é evento de pagamento – só confirma pra não repetir
      return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
    }

    await atualizarPedidoPorPagamento(body.data.id);

    // Sempre 200 pro MP entender que foi processado
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[/api/mercadopago/webhook] erro geral:", err);
    // Mesmo com erro, devolve 200 pra evitar 502 lá no painel
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

// Opcionalmente, se o MP mandar algo via GET (algumas ferramentas de teste fazem isso)
export async function GET(req: Request) {
  console.log("[MP webhook] GET", req.url);
  return NextResponse.json({ ok: true });
}
