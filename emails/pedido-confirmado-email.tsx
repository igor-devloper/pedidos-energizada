// emails/PedidoConfirmadoEnergizadaEmail.tsx
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";

type PaymentOption = "total" | "metade";

export interface OrderConfirmationEmailProps {
  customerName: string;
  orderId: string; // txid
  tamanho: "PP" | "P" | "M" | "G" | "GG" | "XG";
  quantidade: number;
  valorTotal: number;
  valorPago: number;
  pagamento: PaymentOption;
  supportEmail?: string;
  ctaUrl?: string;
  logoSrc?: string;
}

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://www.atleticaenergizada.shop";

const currencyBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);

export default function PedidoConfirmadoEnergizadaEmail(
  props: OrderConfirmationEmailProps,
) {
  const {
    customerName,
    orderId,
    tamanho,
    quantidade,
    valorTotal,
    valorPago,
    pagamento,
    supportEmail = "contato@atleticaenergizada.shop",
    ctaUrl = `${baseUrl}`,
    logoSrc = `${baseUrl}/energizada-logo.png`,
  } = props;

  const previewText = `Seu pedido #${orderId} foi confirmado — ${currencyBRL(
    valorPago,
  )}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>

      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.logoSection}>
            <Img
              src={logoSrc}
              alt="Atlética Energizada"
              width="180"
              height="80"
              style={styles.logo}
            />
          </Section>

          <Section style={{ paddingBottom: 8 }}>
            <Text style={styles.hi}>Olá, {customerName} ⚡</Text>
            <Text style={styles.paragraph}>
              Boa! O seu pedido na <strong>Atlética Energizada</strong> foi
              recebido com sucesso. Abaixo está o resumo com os detalhes do
              pedido e o valor{" "}
              {pagamento === "metade"
                ? "pago referente à entrada (50%)"
                : "pago na confirmação"}
              .
            </Text>
          </Section>

          {/* Resumo do pedido */}
          <Section style={styles.card}>
            <Row>
              <Text style={styles.heading}>Resumo do pedido</Text>
              <Text style={styles.kv}>
                <strong>Nº do pedido:</strong> {orderId}
              </Text>
              <Text style={styles.kv}>
                <strong>Tamanho:</strong> {tamanho}
              </Text>
              <Text style={styles.kv}>
                <strong>Quantidade:</strong> {quantidade}
              </Text>
              <Text style={styles.kv}>
                <strong>Total:</strong> {currencyBRL(valorTotal)}
              </Text>
              <Text style={styles.kv}>
                <strong>
                  {pagamento === "metade" ? "Valor da entrada" : "Valor pago"}:
                </strong>{" "}
                <span style={{ color: "#10b981", fontWeight: 700 }}>
                  {currencyBRL(valorPago)}
                </span>
              </Text>
            </Row>
          </Section>

          <Hr style={styles.hr} />

          {/* Ajuda / rodapé */}
          <Section>
            <Text style={styles.paragraph}>
              Dúvidas ou algum problema? Fale com a gente em{" "}
              <Link href={`mailto:${supportEmail}`} style={styles.link}>
                {supportEmail}
              </Link>
              .
            </Text>

            <Text style={styles.footer}>
              Atlética Energizada • João Pessoa / PB • Brasil
            </Text>
            <Text style={styles.micro}>
              Você recebeu este e-mail porque realizou um pedido no site da
              Atlética Energizada.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  main: {
    backgroundColor: "#020617",
    color: "#ffffff",
    fontFamily:
      '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
    padding: "16px 0",
  },
  logoSection: {
    textAlign: "center" as const,
    padding: "12px 0 20px",
  },
  logo: {
    display: "block",
    margin: "0 auto",
  },
  container: {
    margin: "0 auto",
    padding: "24px 16px 48px",
    width: "600px",
    maxWidth: "100%",
    backgroundColor: "#020617",
    borderRadius: "12px",
    border: "1px solid #1f2937",
  },
  hi: {
    fontSize: "20px",
    lineHeight: "1.4",
    color: "#e5e7eb",
    margin: 0,
    marginBottom: "8px",
  },
  heading: {
    fontSize: "18px",
    fontWeight: 700 as const,
    color: "#facc15",
    marginBottom: "8px",
  },
  paragraph: {
    fontSize: "15px",
    lineHeight: "1.6",
    color: "#cbd5e1",
    margin: 0,
  },
  kv: {
    fontSize: "14px",
    lineHeight: "1.6",
    color: "#e5e7eb",
    margin: "2px 0",
  },
  card: {
    backgroundColor: "#020617",
    border: "1px solid #1f2937",
    borderRadius: "10px",
    padding: "16px",
    marginBottom: "12px",
  },
  code: {
    fontSize: "12px",
    lineHeight: "1.5",
    color: "#e5e7eb",
    backgroundColor: "#020617",
    border: "1px solid #1f2937",
    borderRadius: "8px",
    padding: "12px",
    wordBreak: "break-all" as const,
    fontFamily:
      "ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace",
  },
  small: {
    fontSize: "12px",
    lineHeight: "1.4",
    color: "#94a3b8",
    margin: 0,
  },
  link: {
    color: "#facc15",
    textDecoration: "underline",
  },
  hr: {
    borderColor: "#1f2937",
    margin: "16px 0",
  },
  footer: {
    color: "#94a3b8",
    fontSize: "12px",
    marginBottom: "6px",
  },
  micro: {
    color: "#64748b",
    fontSize: "11px",
    margin: 0,
  },
};
