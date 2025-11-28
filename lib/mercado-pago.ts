import { MercadoPagoConfig, Payment } from "mercadopago"
import crypto from "crypto"

export const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN as string,
})

export const paymentClient = new Payment(mpClient)

export function verifyMercadoPagoSignature(opts: {
  xSignature: string | null
  xRequestId: string | null
  url: string
  bodyDataId?: string | null
}) {
  const { xSignature, xRequestId, url, bodyDataId } = opts

  if (!xSignature || !xRequestId) {
    throw new Error("Missing x-signature or x-request-id")
  }

  const [tsPart, v1Part] = xSignature.split(",")
  const [, ts] = tsPart.split("=")
  const [, v1] = v1Part.split("=")

  if (!ts || !v1) {
    throw new Error("Invalid x-signature format")
  }

  const parsedUrl = new URL(url)
  const dataIdFromQuery =
    parsedUrl.searchParams.get("data.id") ||
    parsedUrl.searchParams.get("id") ||
    null

  const dataId = dataIdFromQuery || bodyDataId || null

  if (!dataId) {
    throw new Error("Missing data.id for signature manifest")
  }

  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET
  if (!secret) {
    console.warn("[MP] MERCADO_PAGO_WEBHOOK_SECRET não definido – pulando validação")
    return
  }

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`

  const generated = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex")

  if (generated !== v1) {
    throw new Error("Invalid Mercado Pago signature")
  }
}
