// emails/PedidoRecusadoEmail.tsx
import * as React from "react";
import { VizinhaLayout } from "./vizinha-layout";
import { Text, Section, Heading, Hr } from "@react-email/components";

export interface PedidoRecusadoEmailProps {
  nome: string;
  txid: string;
  motivo?: string;
}

export default function PedidoRecusadoEmail({
  nome,
  txid,
  motivo,
}: PedidoRecusadoEmailProps) {
  return (
    <VizinhaLayout
      title={`Pedido não confirmado #${txid}`}
      previewText="Seu pedido não pôde ser confirmado. Veja mais detalhes."
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
          Infelizmente o seu pedido <strong>#{txid}</strong> não pôde ser
          confirmado neste momento.
        </Text>
      </Section>

      <Section
        style={{
          backgroundColor: "#020617",
          borderRadius: 18,
          padding: 20,
          border: "1px solid #b91c1c",
          marginBottom: 16,
        }}
      >
        <Heading
          as="h2"
          style={{
            color: "#f97373",
            fontSize: 16,
            margin: 0,
            marginBottom: 8,
          }}
        >
          O que aconteceu?
        </Heading>

        <Text
          style={{
            color: "#fecaca",
            fontSize: 13,
            lineHeight: "20px",
            margin: "4px 0",
          }}
        >
          {motivo
            ? motivo
            : "O pedido foi cancelado pela equipe da Vizinha Salgateria. Pode ter ocorrido algum problema com o pagamento, disponibilidade de agenda ou informação divergente."}
        </Text>
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
          ℹ️ Precisa de ajuda?
        </Text>
        <Text
          style={{
            color: "#d1d5db",
            fontSize: 13,
            lineHeight: "20px",
            margin: 0,
          }}
        >
          Se você já realizou algum pagamento ou quer refazer o pedido, entre em
          contato com a gente pelo WhatsApp oficial da Vizinha Salgateria para
          avaliarmos o melhor caminho.
        </Text>
      </Section>
    </VizinhaLayout>
  );
}
