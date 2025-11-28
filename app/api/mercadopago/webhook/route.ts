import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { paymentClient, verifyMercadoPagoSignature } from "@/lib/mercado-pago"

export const runtime = "nodejs"
export const maxDuration = 30

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
  try {
    console.log("[v0] [MP webhook] Buscando pagamento:", paymentId)

    const payment = await paymentClient.get({ id: paymentId })

    const txid = payment.external_reference as string | undefined
    const mpStatus = payment.status as string | undefined
    const amount = Number(payment.transaction_amount || 0)

    console.log("[v0] [MP webhook] payment:", {
      id: paymentId,
      txid,
      status: mpStatus,
      amount,
      full_payment: JSON.stringify(payment, null, 2),
    })

    if (!txid) {
      console.warn("[v0] [MP webhook] Pagamento sem external_reference (txid).", paymentId)
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
        "[v0] [MP webhook] PedidoCarrinho atualizado:",
        pedidoAtualizado.id,
        "txid:",
        txid,
        "=>",
        novoStatus,
        "valorPago:",
        amount,
      )
    } catch (dbErr: any) {
      if (dbErr.code === "P2025") {
        console.warn("[v0] [MP webhook] PedidoCarrinho não encontrado para txid:", txid)
      } else {
        console.error("[v0] [MP webhook] Erro ao atualizar banco:", dbErr)
        throw dbErr
      }
    }
  } catch (err: any) {
    console.error("[v0] [MP webhook] Erro ao buscar pagamento:", err.message, err.stack)
    throw err
  }
}

export async function POST(req: Request) {
  try {
    console.log("[v0] [MP webhook] Headers recebidos:", {
      "x-signature": req.headers.get("x-signature"),
      "x-request-id": req.headers.get("x-request-id"),
      "content-type": req.headers.get("content-type"),
    })
    console.log("[v0] [MP webhook] URL:", req.url)

    const bodyText = await req.text()
    console.log("[v0] [MP webhook] Body raw:", bodyText)

    let body: MpWebhookBody
    try {
      body = JSON.parse(bodyText)
    } catch (parseErr) {
      console.error("[v0] [MP webhook] Erro ao fazer parse do body:", parseErr)
      return NextResponse.json({ ok: false, reason: "invalid-json" }, { status: 200 })
    }

    console.log("[v0] [MP webhook] Body parsed:", body)

    const xSignature = req.headers.get("x-signature")
    const xRequestId = req.headers.get("x-request-id")

    if (xSignature && xRequestId) {
      try {
        const verifyReq = new Request(req.url, {
          method: "POST",
          headers: req.headers,
          body: bodyText,
        })
        verifyMercadoPagoSignature(verifyReq, body.data?.id)
        console.log("[v0] [MP webhook] Assinatura validada com sucesso")
      } catch (sigErr: any) {
        console.error("[v0] [MP webhook] Assinatura inválida:", sigErr.message)
        if (process.env.NODE_ENV === "production" && body.live_mode === true) {
          return NextResponse.json({ ok: false, reason: "invalid-signature" }, { status: 200 })
        } else {
          console.warn("[v0] [MP webhook] Continuando apesar da assinatura inválida (modo teste ou dev)")
        }
      }
    } else {
      console.warn("[v0] [MP webhook] Headers de assinatura ausentes - possível teste manual")
    }

    if (body.type !== "payment" || !body.data?.id) {
      console.log("[v0] [MP webhook] Evento ignorado:", body.type)
      return NextResponse.json({ ok: true, ignored: true }, { status: 200 })
    }

    await Promise.race([
      atualizarPedidoPorPagamento(body.data.id),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout de 25s atingido")), 25000)),
    ])

    console.log("[v0] [MP webhook] Processamento concluído com sucesso")
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err: any) {
    console.error("[v0] [MP webhook] Erro geral:", {
      message: err.message,
      stack: err.stack,
      name: err.name,
    })
    return NextResponse.json({ ok: false, error: err.message }, { status: 200 })
  }
}

export async function GET(req: Request) {
  console.log("[v0] [MP webhook] GET", req.url)
  return NextResponse.json({ ok: true, message: "Webhook endpoint ativo" })
}
  