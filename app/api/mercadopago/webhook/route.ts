import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { paymentClient } from "@/lib/mercado-pago"

export const runtime = "nodejs"
export const maxDuration = 30
export const dynamic = "force-dynamic"

type MpWebhookBody = {
  action: string
  api_version?: string
  data: {
    id: string
  }
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
  console.log("[WEBHOOK MP] Iniciando atualização para payment:", paymentId)

  const payment = await paymentClient.get({ id: paymentId })

  const txid = payment.external_reference as string | undefined
  const mpStatus = payment.status as string | undefined
  const amount = Number(payment.transaction_amount || 0)

  console.log("[WEBHOOK MP] Dados do pagamento:", {
    id: paymentId,
    txid,
    status: mpStatus,
    amount,
  })

  if (!txid) {
    console.warn("[WEBHOOK MP] Pagamento sem external_reference:", paymentId)
    return
  }

  const novoStatus = mapMpStatusToInterno(mpStatus)

  try {
    await prisma.pedidoCarrinho.update({
      where: { txid },
      data: {
        status: novoStatus,
        ...(amount > 0 && { valorPago: amount }),
      },
    })
    console.log("[WEBHOOK MP] Pedido atualizado:", txid, "=>", novoStatus)
  } catch (err: any) {
    console.error("[WEBHOOK MP] Erro ao atualizar pedido:", err.message)
  }
}

export async function POST(req: Request) {
  console.log("[WEBHOOK MP] ========== WEBHOOK CHAMADO ==========")
  console.log("[WEBHOOK MP] URL:", req.url)
  console.log("[WEBHOOK MP] Headers:", Object.fromEntries(req.headers.entries()))

  try {
    const body = (await req.json()) as MpWebhookBody
    console.log("[WEBHOOK MP] Body recebido:", JSON.stringify(body, null, 2))

    if (body.type !== "payment" || !body.data?.id) {
      console.log("[WEBHOOK MP] Evento ignorado - não é pagamento")
      return NextResponse.json({ ok: true, ignored: true }, { status: 200 })
    }

    await atualizarPedidoPorPagamento(body.data.id)

    console.log("[WEBHOOK MP] Processamento concluído com sucesso")
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err: any) {
    console.error("[WEBHOOK MP] ERRO:", err.message, err.stack)
    return NextResponse.json({ ok: false, error: err.message }, { status: 200 })
  }
}

export async function GET() {
  console.log("[WEBHOOK MP] GET chamado - endpoint ativo")
  return NextResponse.json({ status: "ok", message: "Webhook ativo" }, { status: 200 })
}
