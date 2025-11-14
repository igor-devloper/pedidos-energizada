// lib/email/resend.ts
import { Resend } from "resend";
import PedidoConfirmadoEmail from "@/emails/pedido-confirmado-email";
import PedidoRecusadoEmail from "@/emails/pedido-recusado-email";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM =
  process.env.VIZINHA_FROM_EMAIL ||
  "Vizinha Salgateria <onboarding@resend.dev>";

type EncomendaEmailData = {
  txid: string;
  nome: string;
  email: string;
  totalItens: number;
  valorTotal: number;
  valorPago?: number | null;
};

export async function sendPedidoConfirmadoEmail(
  encomenda: EncomendaEmailData,
  tipo: "METADE" | "TOTAL"
) {
  const totalNumber = Number(encomenda.valorTotal);
  const valorEntrada =
    tipo === "METADE" ? Number(totalNumber / 2) : totalNumber;

  await resend.emails.send({
    from: FROM,
    to: encomenda.email,
    subject: `Pedido confirmado #${encomenda.txid} — Vizinha Salgateria`,
    react: PedidoConfirmadoEmail({
      nome: encomenda.nome,
      txid: encomenda.txid,
      total: totalNumber,
      valorEntrada,
    }),
  });
}

export async function sendPedidoRecusadoEmail(
  encomenda: Pick<EncomendaEmailData, "nome" | "txid" | "email">,
  motivo?: string
) {
  await resend.emails.send({
    from: FROM,
    to: encomenda.email,
    subject: `Pedido não confirmado #${encomenda.txid} — Vizinha Salgateria`,
    react: PedidoRecusadoEmail({
      nome: encomenda.nome,
      txid: encomenda.txid,
      motivo,
    }),
  });
}
