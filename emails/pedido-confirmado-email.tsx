import * as React from "react";
import { VizinhaLayout } from "./vizinha-layout";
import { Section, Text, Heading, Hr } from "@react-email/components";

export interface PedidoConfirmadoEmailProps {
  nome: string;
  txid: string;
  total: number;
  valorEntrada: number;
}

export default function PedidoConfirmadoEmail({
  nome,
  txid,
  total,
  valorEntrada,
}: PedidoConfirmadoEmailProps) {
  const isMetade = valorEntrada < total - 0.01;

  return (
    <VizinhaLayout
      title={`Pedido confirmado #${txid}`}
      previewText={
        isMetade
          ? "Entrada confirmada! Veja os detalhes da sua encomenda."
          : "Pagamento confirmado! Sua encomenda está garantida."
      }
    >
      <Section style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 16, color: "#7b2349" }}>
          Olá, <strong>{nome}</strong> 👋
        </Text>

        <Text style={{ fontSize: 14, color: "#9c3c5f", lineHeight: "22px" }}>
          Recebemos {isMetade ? "a entrada" : "o pagamento completo"} da sua
          encomenda!  
          Abaixo estão os detalhes.
        </Text>
      </Section>

      <Section
        style={{
          background: "#fff0f6",
          borderRadius: 16,
          padding: 20,
          border: "2px solid #f5b5cc",
          marginBottom: 24,
        }}
      >
        <Heading
          as="h2"
          style={{
            fontSize: 17,
            color: "#c2185b",
            margin: "0 0 10px 0",
          }}
        >
          🎀 Resumo do pedido
        </Heading>

        <Text style={{ color: "#7b2349", fontSize: 14 }}>
          <strong>Nº do pedido:</strong> {txid}
        </Text>

        <Text style={{ color: "#7b2349", fontSize: 14 }}>
          <strong>Valor total:</strong>{" "}
          R$ {total.toFixed(2).replace(".", ",")}
        </Text>

        <Text style={{ color: "#008a4e", fontSize: 14 }}>
          <strong>
            {isMetade ? "Valor pago (50%):" : "Valor confirmado:"}
          </strong>{" "}
          R$ {valorEntrada.toFixed(2).replace(".", ",")}
        </Text>

        {isMetade && (
          <Text style={{ color: "#b34465", fontSize: 13, marginTop: 10 }}>
            O valor restante será pago na retirada.
          </Text>
        )}
      </Section>

      <Hr style={{ borderColor: "#f4b9cf", marginBottom: 24 }} />

      <Section>
        <Heading
          as="h3"
          style={{ fontSize: 16, color: "#c2185b", marginBottom: 8 }}
        >
          📅 Próximos passos
        </Heading>

        <Text style={{ color: "#7b2349", fontSize: 14, lineHeight: "22px" }}>
          Vamos entrar em contato via WhatsApp para combinar data, horário e
          retirada da sua encomenda.
        </Text>
      </Section>
    </VizinhaLayout>
  );
}
