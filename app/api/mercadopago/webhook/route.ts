// app/api/mercadopago/webhook/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  paymentClient,
  verifyMercadoPagoSignature,
} from "@/lib/mercado-pago";
import { resend } from "@/lib/resend";
import PedidoConfirmadoEnergizadaEmail from "@/emails/pedido-confirmado-email";
import { PedidoRecusadoEmailProps } from "@/emails/pedido-recusado-email";

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

type StatusInterno = "AGUARDANDO_PAGAMENTO" | "PAGO" | "CANCELADO";

function mapMpStatusToInterno(status?: string): StatusInterno {
  const s = (status || "").toLowerCase();
  if (s === "approved") return "PAGO";
  if (s === "rejected" || s === "cancelled") return "CANCELADO";
  return "AGUARDANDO_PAGAMENTO";
}

type ItemResumo = {
  nome: string;
  tamanho?: string;
  quantidade: number;
};

function montarResumoItens(pedido: any): string {
  // 1) se tiver relação itens
  if (Array.isArray(pedido.itens) && pedido.itens.length > 0) {
    return pedido.itens
      .map((item: any) => {
        const nome = item.nome || "Item";
        const tam = item.tamanho ? ` (${item.tamanho})` : "";
        const qtd = item.quantidade ?? 1;
        return `• ${nome}${tam} x${qtd}`;
      })
      .join("\n");
  }

  // 2) se tiver JSON com itens
  if (pedido.pedidoItensJson) {
    try {
      const arr =
        Array.isArray(pedido.pedidoItensJson)
          ? pedido.pedidoItensJson
          : JSON.parse(pedido.pedidoItensJson as string);

      if (Array.isArray(arr)) {
        return arr
          .map((item: ItemResumo) => {
            const nome = item.nome || "Item";
            const tam = item.tamanho ? ` (${item.tamanho})` : "";
            const qtd = item.quantidade ?? 1;
            return `• ${nome}${tam} x${qtd}`;
          })
          .join("\n");
      }
    } catch (e) {
      console.warn("[MP webhook] erro ao parsear pedidoItensJson:", e);
    }
  }

  // fallback
  const nomeBase = "Kit Caneca + Tirante";
  const tamBase = pedido.tamanho ? ` (${pedido.tamanho})` : "";
  const qtdBase = pedido.quantidade ?? 1;
  return `• ${nomeBase}${tamBase} x${qtdBase}`;
}

async function enviarEmailConfirmacao(pedido: any) {
  if (!pedido.email) {
    console.log(
      "[MP webhook] Pedido sem e-mail, não enviando confirmação (id:",
      pedido.id,
      ")",
    );
    return;
  }

  const resumoItens = montarResumoItens(pedido);
  console.log("[MP webhook] Itens do pedido:\n" + resumoItens);

  try {
    await resend.emails.send({
      from: "Atlética Energizada <no-reply@atleticaenergizada.shop>",
      to: pedido.email,
      subject: `Pagamento aprovado - Pedido #${pedido.txid}`,
      react: PedidoConfirmadoEnergizadaEmail({
        customerName: pedido.nome ?? "Cliente Energizada",
          orderId: pedido.txid,
           tamanho: pedido.tamanho, 
          quantidade: pedido.quantidade, 
          valorTotal: pedido.valorTotal,
          valorPago: pedido.valorPago ?? pedido.valorTotal, 
          pagamento: "total",
          supportEmail: "atleticaenergizada@cear.ufpb.br",
          logoSrc: "https://www.atleticaenergizada.shop/energizada-logo.png"
      }),

    });

    console.log(
      "[MP webhook] E-mail de confirmação enviado para",
      pedido.email,
    );
  } catch (emailErr: any) {
    console.error("[MP webhook] Erro ao enviar e-mail:", emailErr);
  }
}

async function atualizarPedidoPorPagamento(paymentId: string) {
  try {
    console.log("[MP webhook] Buscando pagamento:", paymentId);

    const payment = await paymentClient.get({ id: paymentId });

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
        paymentId,
      );
      return;
    }

    const novoStatus = mapMpStatusToInterno(mpStatus);

    const pedidoAtualizado = await prisma.pedidoCarrinho.update({
      where: { txid },
      data: {
        status: novoStatus,
        ...(amount > 0 && { valorPago: amount }),
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

    const pedidoCompleto = await prisma.pedidoCarrinho.findUnique({
      where: { txid },
      // include: { itens: true }, // se tiver relação itens, descomenta
    });

    if (!pedidoCompleto) {
      console.warn(
        "[MP webhook] Não encontrei pedidoCarrinho após update para txid:",
        txid,
      );
      return;
    }

    if (novoStatus === "PAGO") {
      await enviarEmailConfirmacao(pedidoCompleto);
    }
  } catch (err: any) {
    console.error("[MP webhook] Erro ao buscar/atualizar pagamento:", err);
    throw err;
  }
}

export async function POST(req: Request) {
  try {
    console.log("[MP webhook] Headers:", {
      "x-signature": req.headers.get("x-signature"),
      "x-request-id": req.headers.get("x-request-id"),
      "content-type": req.headers.get("content-type"),
    });
    console.log("[MP webhook] URL:", req.url);

    const bodyText = await req.text();
    console.log("[MP webhook] Body raw:", bodyText);

    let body: MpWebhookBody;
    try {
      body = JSON.parse(bodyText);
    } catch (parseErr) {
      console.error("[MP webhook] Erro ao fazer parse do body:", parseErr);
      return NextResponse.json(
        { ok: false, reason: "invalid-json" },
        { status: 200 },
      );
    }

    console.log("[MP webhook] Body parsed:", body);

    const xSignature = req.headers.get("x-signature");
    const xRequestId = req.headers.get("x-request-id");

    try {
      verifyMercadoPagoSignature({
        xSignature,
        xRequestId,
        url: req.url,
        bodyDataId: body.data?.id,
      });
    } catch (sigErr: any) {
      console.error("[MP webhook] assinatura inválida:", sigErr.message);
      // Para não quebrar o painel do MP, sempre 200:
      // se quiser bloquear em produção, pode colocar uma flag de ambiente aqui.
    }

    if (body.type !== "payment" || !body.data?.id) {
      console.log("[MP webhook] Evento ignorado:", body.type);
      return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
    }

    await Promise.race([
      atualizarPedidoPorPagamento(body.data.id),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout de 25s atingido")), 25000),
      ),
    ]);

    console.log("[MP webhook] Processamento concluído com sucesso");
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("[MP webhook] Erro geral:", {
      message: err.message,
      stack: err.stack,
      name: err.name,
    });
    return NextResponse.json({ ok: false, error: err.message }, { status: 200 });
  }
}

export async function GET(req: Request) {
  console.log("[MP webhook] GET", req.url);
  return NextResponse.json({ ok: true, message: "Webhook endpoint ativo" });
}
