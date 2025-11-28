import { MercadoPagoConfig, Payment } from "mercadopago"
import crypto from "crypto"

console.log("[MP LIB] Inicializando Mercado Pago...")
console.log("[MP LIB] Token existe?", !!process.env.MERCADO_PAGO_ACCESS_TOKEN)

if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
  console.warn("[v0] [MP] MERCADO_PAGO_ACCESS_TOKEN não definido!")
}

export const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN as string,
})

export const paymentClient = new Payment(mpClient)

console.log("[MP LIB] Payment client criado com sucesso")

export function verifyMercadoPagoSignature(request: Request, dataIdFromBody?: string) {
  console.log("[v0] [MP] Iniciando verificação de assinatura")

  const xSignature = request.headers.get("x-signature")
  const xRequestId = request.headers.get("x-request-id")

  console.log("[v0] [MP] x-signature:", xSignature)
  console.log("[v0] [MP] x-request-id:", xRequestId)

  if (!xSignature || !xRequestId) {
    throw new Error("Missing x-signature or x-request-id header")
  }

  const signatureParts = xSignature.split(",")
  let ts = ""
  let v1 = ""

  for (const part of signatureParts) {
    const [key, value] = part.split("=")
    if (key.trim() === "ts") ts = value.trim()
    if (key.trim() === "v1") v1 = value.trim()
  }

  console.log("[v0] [MP] ts extraído:", ts)
  console.log("[v0] [MP] v1 extraído:", v1)

  if (!ts || !v1) {
    throw new Error("Invalid x-signature header format")
  }

  const url = new URL(request.url)
  const dataId = url.searchParams.get("data.id") || url.searchParams.get("id") || dataIdFromBody

  console.log("[v0] [MP] dataId da URL:", url.searchParams.get("data.id"))
  console.log("[v0] [MP] dataId do body (fallback):", dataIdFromBody)
  console.log("[v0] [MP] dataId final usado:", dataId)

  let manifest = ""
  if (dataId) manifest += `id:${dataId};`
  manifest += `request-id:${xRequestId};`
  manifest += `ts:${ts};`

  console.log("[v0] [MP] Manifest construído:", manifest)

  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET
  if (!secret) {
    console.warn("[v0] [MP] MERCADO_PAGO_WEBHOOK_SECRET não definido – assinatura não será verificada.")
    return
  }

  const hmac = crypto.createHmac("sha256", secret)
  hmac.update(manifest)
  const generatedHash = hmac.digest("hex")

  console.log("[v0] [MP] Hash gerado:", generatedHash)
  console.log("[v0] [MP] Hash esperado (v1):", v1)

  if (generatedHash !== v1) {
    throw new Error(`Invalid Mercado Pago signature - Generated: ${generatedHash}, Expected: ${v1}`)
  }

  console.log("[v0] [MP] Assinatura verificada com sucesso!")
}
