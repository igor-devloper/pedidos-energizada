import * as React from "react";
import { VizinhaLayout } from "./vizinha-layout";
import { Section, Text, Heading } from "@react-email/components";

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
      title={`Pedido recusado #${txid}`}
      previewText="Sua encomenda não pôde ser aprovada."
    >
      <Section style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 16, color: "#7b2349" }}>
          Olá, <strong>{nome}</strong> 👋
        </Text>

        <Text
          style={{
            fontSize: 14,
            color: "#9c3c5f",
            lineHeight: "22px",
            marginBottom: 20,
          }}
        >
          Infelizmente, seu pedido <strong>não pôde ser aprovado</strong> no
          momento.
        </Text>

        <Section
          style={{
            background: "#ffe3ea",
            border: "2px solid #e8a6b8",
            padding: 18,
            borderRadius: 14,
            marginBottom: 20,
          }}
        >
          <Heading
            as="h3"
            style={{
              fontSize: 16,
              marginBottom: 10,
              color: "#c2185b",
            }}
          >
            ❗ Detalhes
          </Heading>

          <Text style={{ fontSize: 14, color: "#7b2349" }}>
            <strong>Nº do pedido:</strong> {txid}
          </Text>

          {motivo && (
            <Text style={{ fontSize: 14, color: "#7b2349", marginTop: 8 }}>
              <strong>Motivo:</strong> {motivo}
            </Text>
          )}
        </Section>

        <Text style={{ fontSize: 14, color: "#9c3c5f", lineHeight: "22px" }}>
          Se precisar de ajuda, estamos à disposição no WhatsApp.
        </Text>
      </Section>
    </VizinhaLayout>
  );
}
