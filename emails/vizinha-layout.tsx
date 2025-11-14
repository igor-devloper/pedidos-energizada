import * as React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Img,
  Section,
  Text,
} from "@react-email/components";

export interface VizinhaLayoutProps {
  title: string;
  previewText?: string;
  children: React.ReactNode;
}

export function VizinhaLayout({
  title,
  previewText,
  children,
}: VizinhaLayoutProps) {
  return (
    <Html>
      <Head>
        <title>{title}</title>
      </Head>

      <Body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: "#ffeef7", // rosa bebê
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* preview (aparece no Gmail) */}
        <Text
          style={{
            display: "none",
            visibility: "hidden",
            opacity: 0,
            height: 0,
            overflow: "hidden",
          }}
        >
          {previewText}
        </Text>

        <Container
          style={{
            maxWidth: 560,
            margin: "32px auto",
            backgroundColor: "#ffffff",
            borderRadius: 20,
            padding: "32px 28px",
            border: "2px solid #f7c1d9",
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          }}
        >
          {/* LOGO */}
          <Section style={{ textAlign: "center", marginBottom: 24 }}>
            <Img
              src="https://www.vizinhasalgateria.site/vizinha-logo.png"
              width="80"
              height="80"
              alt="Vizinha Salgateria"
              style={{
                borderRadius: "50%",
                border: "3px solid #f8b3cb",
                backgroundColor: "#fff",
              }}
            />
            <Text
              style={{
                fontSize: 18,
                fontWeight: 600,
                marginTop: 12,
                color: "#c2185b",
              }}
            >
              Vizinha Salgateria
            </Text>
          </Section>

          {/* CONTEÚDO */}
          <Section>{children}</Section>

          {/* FOOTER */}
          <Section style={{ marginTop: 32, textAlign: "center" }}>
            <Text
              style={{
                color: "#b34465",
                fontSize: 13,
                marginBottom: 6,
              }}
            >
              Vizinha Salgateria · Encomendas de fim de ano
            </Text>

            <Text
              style={{
                color: "#d86b8a",
                fontSize: 12,
                lineHeight: "18px",
              }}
            >
              Este e-mail foi enviado automaticamente.  
              Em caso de dúvida, fale conosco pelo WhatsApp informado no site.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
