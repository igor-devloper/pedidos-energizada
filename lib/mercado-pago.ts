// lib/mercado-pago.ts
import { MercadoPagoConfig, Payment } from "mercadopago";
import crypto from "crypto";

if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
  console.warn("[MP] MERCADO_PAGO_ACCESS_TOKEN não definido!");
}

export const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN as string,
});

export const paymentClient = new Payment(mpClient);

// mesma lógica do exemplo que você mandou, mas em vez de retornar NextResponse,
// lançamos erro se a assinatura for inválida
export function verifyMercadoPagoSignature(request: Request) {
  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");

  if (!xSignature || !xRequestId) {
    throw new Error("Missing x-signature or x-request-id header");
  }

  const signatureParts = xSignature.split(",");
  let ts = "";
  let v1 = "";

  for (const part of signatureParts) {
    const [key, value] = part.split("=");
    if (key.trim() === "ts") ts = value.trim();
    if (key.trim() === "v1") v1 = value.trim();
  }

  if (!ts || !v1) {
    throw new Error("Invalid x-signature header format");
  }

  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id");

  let manifest = "";
  if (dataId) manifest += `id:${dataId};`;
  manifest += `request-id:${xRequestId};`;
  manifest += `ts:${ts};`;

  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[MP] MERCADO_PAGO_WEBHOOK_SECRET não definido – assinatura não será verificada.");
    return;
  }

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(manifest);
  const generatedHash = hmac.digest("hex");

  if (generatedHash !== v1) {
    throw new Error("Invalid Mercado Pago signature");
  }
}
