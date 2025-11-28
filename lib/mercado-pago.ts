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

type VerifyOpts = {
  xSignature: string | null;
  xRequestId: string | null;
  url: string;
  bodyDataId?: string | null;
};

export function verifyMercadoPagoSignature({
  xSignature,
  xRequestId,
  url,
  bodyDataId,
}: VerifyOpts) {
  console.log("[MP] Iniciando verificação de assinatura");

  if (!xSignature || !xRequestId) {
    throw new Error("Missing x-signature or x-request-id header");
  }

  // x-signature vem como "ts=123,v1=abc" ou "ts=123, v1=abc"
  const normalized = xSignature.replace(/,\s*/g, "&");
  const params = new URLSearchParams(normalized);
  const ts = params.get("ts");
  const v1 = params.get("v1");

  console.log("[MP] x-signature raw:", xSignature);
  console.log("[MP] ts extraído:", ts);
  console.log("[MP] v1 extraído:", v1);

  if (!ts || !v1) {
    throw new Error("Invalid x-signature format");
  }

  const parsedUrl = new URL(url);
  const dataIdFromQuery =
    parsedUrl.searchParams.get("data.id") ||
    parsedUrl.searchParams.get("id") ||
    null;

  const dataId = dataIdFromQuery || bodyDataId || null;

  console.log("[MP] dataId da query:", dataIdFromQuery);
  console.log("[MP] dataId do body:", bodyDataId);
  console.log("[MP] dataId final:", dataId);

  if (!dataId) {
    throw new Error("Missing data.id for signature manifest");
  }

  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) {
    console.warn(
      "[MP] MERCADO_PAGO_WEBHOOK_SECRET não definido – pulando validação",
    );
    return;
  }

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  console.log("[MP] Manifest:", manifest);

  const generated = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  console.log("[MP] Hash gerado:", generated);
  console.log("[MP] Hash esperado (v1):", v1);

  if (generated !== v1) {
    throw new Error("Invalid Mercado Pago signature");
  }

  console.log("[MP] Assinatura válida");
}
