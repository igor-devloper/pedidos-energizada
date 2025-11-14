// emails/VizinhaLayout.tsx
import * as React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
  Img,
} from "@react-email/components";

interface VizinhaLayoutProps {
  previewText?: string;
  title: string;
  logoUrl?: string;
  children: React.ReactNode;
}

export function VizinhaLayout({
  previewText,
  title,
  logoUrl,
  children,
}: VizinhaLayoutProps) {
  const logo =
    logoUrl || process.env.VIZINHA_LOGO_URL || "https://via.placeholder.com/200x80";

  return (
    <Html>
      <Head />
      {previewText && <title>{previewText}</title>}
      <Body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: "#050816",
          fontFamily: "-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif",
        }}
      >
        <Container
          style={{
            maxWidth: "640px",
            margin: "0 auto",
            padding: "32px 16px",
          }}
        >
          <Section
            style={{
              backgroundColor: "#050816",
              borderRadius: 24,
              padding: 32,
              border: "1px solid #272b3b",
              boxShadow: "0 24px 80px rgba(0,0,0,0.75)",
            }}
          >
            <Section style={{ textAlign: "center", marginBottom: 24 }}>
              <Img
                src={logo}
                width={160}
                alt="Vizinha Salgateria"
                style={{ margin: "0 auto 16px", borderRadius: 9999 }}
              />
              <Heading
                style={{
                  color: "#f9fafb",
                  fontSize: 22,
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                {title}
              </Heading>
            </Section>

            <Hr style={{ borderColor: "#1f2937", margin: "16px 0 24px" }} />

            <Section>{children}</Section>

            <Hr style={{ borderColor: "#1f2937", margin: "24px 0 16px" }} />

            <Text
              style={{
                color: "#9ca3af",
                fontSize: 12,
                lineHeight: "18px",
                textAlign: "center",
                marginTop: 0,
              }}
            >
              Vizinha Salgateria · Encomendas de fim de ano
              <br />
              Este e-mail foi enviado automaticamente. Em caso de dúvida, fale
              com a gente pelo WhatsApp informado no site.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
