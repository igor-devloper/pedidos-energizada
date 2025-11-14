// emails/PedidoConfirmadoEmail.tsx
import * as React from "react";
import { VizinhaLayout } from "./vizinha-layout";
import { Text, Section, Heading, Hr } from "@react-email/components";

export interface PedidoConfirmadoEmailProps {
  nome: string;
  txid: string;
  total: number;
  valorEntrada: number;   // quanto foi pago agora (50% ou 100%)
}

export default function PedidoConfirmadoEmail({
  nome,
  txid,
  total,
  valorEntrada,
}: PedidoConfirmadoEmailProps) {
  const isMetade = valorEntrada < total - 0.01; // simpleszinha

  return (
    <VizinhaLayout
      title={`Pedido confirmado #${txid}`}
      previewText={
        isMetade
          ? "Entrada confirmada! Veja os detalhes da sua encomenda."
          : "Pagamento confirmado! Sua encomenda está 100% garantida."
      }
    >
      <Section style={{ marginBottom: 16 }}>
        <Text
          style={{
            color: "#e5e7eb",
            fontSize: 16,
            lineHeight: "24px",
            marginBottom: 12,
          }}
        >
          Olá, <strong>{nome}</strong> 👋
        </Text>
        <Text
          style={{
            color: "#d1d5db",
            fontSize: 14,
            lineHeight: "22px",
            margin: 0,
          }}
        >
          Recebemos o seu pagamento e está tudo certo! Abaixo você encontra o
          resumo da encomenda e o valor{" "}
          {isMetade ? "da entrada (50%)" : "confirmado"}.
        </Text>
      </Section>

      <Section
        style={{
          backgroundColor: "#020617",
          borderRadius: 18,
          padding: 20,
          border: "1px solid #272b3b",
          marginBottom: 16,
        }}
      >
        <Heading
          as="h2"
          style={{
            color: "#4ade80",
            fontSize: 16,
            margin: 0,
            marginBottom: 8,
          }}
        >
          Resumo do pedido
        </Heading>

        <Text
          style={{
            color: "#e5e7eb",
            fontSize: 13,
            lineHeight: "20px",
            margin: "4px 0",
          }}
        >
          <strong>Nº do pedido:</strong> {txid}
        </Text>
        <Text
          style={{
            color: "#e5e7eb",
            fontSize: 13,
            lineHeight: "20px",
            margin: "4px 0",
          }}
        >
          <strong>Valor total da encomenda:</strong>{" "}
          R$ {total.toFixed(2).replace(".", ",")}
        </Text>
        <Text
          style={{
            color: "#22c55e",
            fontSize: 13,
            lineHeight: "20px",
            margin: "4px 0",
          }}
        >
          <strong>
            {isMetade ? "Valor da entrada (50%):" : "Valor confirmado:"}
          </strong>{" "}
          R$ {valorEntrada.toFixed(2).replace(".", ",")}
        </Text>

        {isMetade && (
          <Text
            style={{
              color: "#fde68a",
              fontSize: 12,
              lineHeight: "18px",
              marginTop: 10,
            }}
          >
            O valor restante poderá ser pago na retirada ou conforme combinado
            com a Vizinha Salgateria. Guarde este e-mail para consulta futura.
          </Text>
        )}
      </Section>

      <Hr style={{ borderColor: "#1f2937", margin: "18px 0" }} />

      <Section>
        <Text
          style={{
            color: "#e5e7eb",
            fontSize: 14,
            lineHeight: "22px",
            marginBottom: 8,
          }}
        >
          📅 Próximos passos
        </Text>
        <Text
          style={{
            color: "#d1d5db",
            fontSize: 13,
            lineHeight: "20px",
            margin: 0,
          }}
        >
          Em breve entraremos em contato pelo WhatsApp para alinhar detalhes de
          data, horário e retirada da sua encomenda.
        </Text>
      </Section>
    </VizinhaLayout>
  );
}
