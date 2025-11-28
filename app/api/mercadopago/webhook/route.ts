import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { paymentClient, verifyMercadoPagoSignature } from "@/lib/mercado-pago"

export const runtime = "nodejs"
export const maxDuration = 30

type MpWebhookBody = {
  action: string
  api_version?: string
  data: { id: string }
  date_created?: string
  live_mode?: boolean
  type: string
  user_id?: string
}

type StatusInterno = "AGUARDANDO_PAGAMENTO" | "PAGO" | "CANCELADO"

function mapMpStatusToInterno(status?: string): StatusInterno {
  const s = (status || "").toLowerCase()
  if (s === "approved") return "PAGO"
  if (s === "rejected" || s === "cancelled") return "CANCELADO"
  return "AGUARDANDO_PAGAMENTO"
}

async function atualizarPedidoPorPagamento(paymentId: string) {
  console.log("[MP webhook] Buscando pagamento:", paymentId)

  const payment = await paymentClient.get({ id: paymentId })

  const txid = payment.external_reference as string | undefined
  const mpStatus = payment.status as string | undefined
  const amount = Number(payment.transaction_amount || 0)

  console.log("[MP webhook] payment:", {
    id: paymentId,
    txid,
    status: mpStatus,
    amount,
  })

  if (!txid) {
    console.warn("[MP webhook] Pagamento sem external_reference (txid).", paymentId)
    return
  }

  const novoStatus = mapMpStatusToInterno(mpStatus)

  try {
    const pedidoAtualizado = await prisma.pedidoCarrinho.update({
      where: { txid },
      data: {
        status: novoStatus,
        ...(amount > 0 && { valorPago: amount }),
      },
    })

    console.log(
      "[MP webhook] PedidoCarrinho atualizado:",
      pedidoAtualizado.id,
      "txid:",
      txid,
      "=>",
      novoStatus,
      "valorPago:",
      amount,
    )
  } catch (dbErr: any) {
    console.error("[MP webhook] Erro ao atualizar banco:", dbErr)
  }
}

export async function POST(req: Request) {
  try {
    const url = req.url
    const xSignature = req.headers.get("x-signature")
    const xRequestId = req.headers.get("x-request-id")

    const bodyText = await req.text()
    let body: MpWebhookBody

    try {
      body = JSON.parse(bodyText)
    } catch {
      return NextResponse.json({ ok: false, reason: "invalid-json" }, { status: 200 })
    }

    // 🔐 validação de assinatura
    try {
      verifyMercadoPagoSignature({
        xSignature,
        xRequestId,
        url,
        bodyDataId: body.data?.id,
      })
    } catch (e: any) {
      console.error("[MP webhook] assinatura inválida:", e.message)
      // Em prod, se quiser você pode recusar.
      // Para não quebrar no painel do MP, mantemos 200:
      return NextResponse.json({ ok: false, reason: "invalid-signature" }, { status: 200 })
    }

    if (body.type !== "payment" || !body.data?.id) {
      return NextResponse.json({ ok: true, ignored: true }, { status: 200 })
    }

    await atualizarPedidoPorPagamento(body.data.id)

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err: any) {
    console.error("[MP webhook] erro geral:", err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 200 })
  }
}

export async function GET(req: Request) {
  console.log("[MP webhook] GET", req.url)
  return NextResponse.json({ ok: true, message: "Webhook endpoint ativo" })
}
