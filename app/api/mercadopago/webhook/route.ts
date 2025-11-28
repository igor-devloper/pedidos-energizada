import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { paymentClient } from "@/lib/mercado-pago"

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
    console.log("[MP webhook] Recebido POST:", req.url)

    const bodyText = await req.text()
    console.log("[MP webhook] Body raw:", bodyText)

    let body: MpWebhookBody
    try {
      body = JSON.parse(bodyText)
    } catch (parseErr) {
      console.error("[MP webhook] JSON inválido:", parseErr)
      // Mesmo com erro, devolve 200 para evitar 502 no MP
      return NextResponse.json({ ok: false, reason: "invalid-json" }, { status: 200 })
    }

    console.log("[MP webhook] Body parsed:", body)

    if (body.type !== "payment" || !body.data?.id) {
      console.log("[MP webhook] Evento ignorado:", body.type)
      return NextResponse.json({ ok: true, ignored: true }, { status: 200 })
    }

    await atualizarPedidoPorPagamento(body.data.id)

    console.log("[MP webhook] Processamento concluído com sucesso")
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err: any) {
    console.error("[MP webhook] Erro geral:", err)
    // IMPORTANTE: ainda devolve 200 para não gerar 502 no painel do MP
    return NextResponse.json({ ok: false, error: err.message }, { status: 200 })
  }
}

export async function GET(req: Request) {
  console.log("[MP webhook] GET", req.url)
  return NextResponse.json({ ok: true, message: "Webhook endpoint ativo" })
}
