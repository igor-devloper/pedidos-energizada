// lib/resend.ts
import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  console.warn("[RESEND] RESEND_API_KEY não definido!");
}

export const resend = new Resend(process.env.RESEND_API_KEY as string);
