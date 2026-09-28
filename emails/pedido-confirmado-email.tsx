// emails/pedido-confirmado-email.tsx
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

export interface EmailOrderItem {
  nome: string;
  quantidade: number;
  precoUnitario?: number;
  detalhes?: string[];
}

export interface OrderConfirmationEmailProps {
  customerName: string;
  orderId: string;
  itens?: EmailOrderItem[];
  valorTotal: number;
  valorPago: number;
  pagamento: PaymentOption;
  supportEmail?: string;
  logoSrc?: string;
}

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.atleticaenergizada.shop";

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
    itens = [],
    valorTotal,
    valorPago,
    pagamento,
    supportEmail = "atleticaenergizada@cear.ufpb.br",
    logoSrc = `${baseUrl}/energizada-logo-email.png`,
  } = props;

  const previewText =
    `Seu pagamento foi aprovado – pedido #${orderId}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>

      <Body style={styles.main}>
        <Container style={styles.outerCard}>
          <Section style={styles.logoSection}>
            <Img
              src={logoSrc}
              alt="Atlética Energizada"
              width="160"
              style={{
                display: "block",
                margin: "0 auto",
                height: "auto",
                maxWidth: "160px",
                borderRadius: "16px",
              }}
            />
          </Section>

          <Section style={styles.innerCard}>
            <Text style={styles.hi}>
              Olá, {customerName} ⚡
            </Text>

            <Text style={styles.paragraph}>
              Boa! O seu pedido na{" "}
              <strong>Atlética Energizada</strong> foi
              recebido com sucesso e o pagamento está{" "}
              <strong>aprovado</strong>. Abaixo está o
              resumo com os detalhes do pedido e o valor{" "}
              {pagamento === "metade"
                ? "pago referente à entrada (50%)"
                : "pago na confirmação"}
              .
            </Text>

            <Section style={styles.resumeCard}>
              <Row>
                <Text style={styles.heading}>
                  Resumo do pedido
                </Text>

                <Text style={styles.kv}>
                  <strong>Nº do pedido:</strong>{" "}
                  {orderId}
                </Text>
              </Row>

              {itens.length > 0 && (
                <>
                  <Hr style={styles.itemDivider} />

                  <Text style={styles.itemsTitle}>
                    Produtos
                  </Text>

                  {itens.map((item, index) => (
                    <Section
                      key={`${item.nome}-${index}`}
                      style={styles.itemCard}
                    >
                      <Text style={styles.itemName}>
                        {item.nome}
                      </Text>

                      <Text style={styles.itemMeta}>
                        Quantidade: {item.quantidade}
                        {typeof item.precoUnitario ===
                        "number"
                          ? ` • ${currencyBRL(
                              item.precoUnitario,
                            )} cada`
                          : ""}
                      </Text>

                      {Array.isArray(item.detalhes) &&
                        item.detalhes.map(
                          (detalhe, detalheIndex) => (
                            <Text
                              key={detalheIndex}
                              style={styles.itemDetail}
                            >
                              {detalhe}
                            </Text>
                          ),
                        )}
                    </Section>
                  ))}
                </>
              )}

              <Hr style={styles.itemDivider} />

              <Text style={styles.kv}>
                <strong>Total:</strong>{" "}
                {currencyBRL(valorTotal)}
              </Text>

              <Text style={styles.kv}>
                <strong>
                  {pagamento === "metade"
                    ? "Valor da entrada"
                    : "Valor pago"}
                  :
                </strong>{" "}
                <span style={styles.valorPago}>
                  {currencyBRL(valorPago)}
                </span>
              </Text>
            </Section>

            <Hr style={styles.hr} />

            <Section>
              <Text style={styles.paragraph}>
                Dúvidas ou algum problema? Fale com a
                gente em{" "}
                <Link
                  href={`mailto:${supportEmail}`}
                  style={styles.link}
                >
                  {supportEmail}
                </Link>
                .
              </Text>

              <Text style={styles.footer}>
                Atlética Energizada • João Pessoa / PB •
                Brasil
              </Text>

              <Text style={styles.micro}>
                Você recebeu este e-mail porque realizou
                um pedido no site da Atlética Energizada.
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  main: {
    backgroundColor: "#020617",
    padding: "32px 0",
    fontFamily:
      'Montserrat,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
  },
  outerCard: {
    margin: "0 auto",
    width: "640px",
    maxWidth: "100%",
  },
  logoSection: {
    textAlign: "center" as const,
    marginBottom: "12px",
  },
  innerCard: {
    backgroundColor: "#020617",
    borderRadius: "18px",
    border: "1px solid #1f2937",
    padding: "24px 24px 32px",
    boxShadow: "0 30px 80px rgba(15,23,42,0.8)",
  },
  hi: {
    fontSize: "20px",
    lineHeight: "1.4",
    color: "#e5e7eb",
    margin: "0 0 8px",
    fontWeight: 700 as const,
  },
  paragraph: {
    fontSize: "14px",
    lineHeight: "1.7",
    color: "#cbd5e1",
    margin: "0 0 12px",
  },
  heading: {
    fontSize: "16px",
    fontWeight: 700 as const,
    color: "#facc15",
    marginBottom: "8px",
  },
  resumeCard: {
    backgroundColor: "#0f172a",
    borderRadius: "14px",
    border: "1px solid #334155",
    padding: "16px 18px",
    marginTop: "10px",
    marginBottom: "8px",
  },
  kv: {
    fontSize: "13px",
    lineHeight: "1.6",
    color: "#e5e7eb",
    margin: "4px 0",
  },
  itemsTitle: {
    color: "#facc15",
    fontSize: "12px",
    fontWeight: 700 as const,
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    margin: "12px 0 8px",
  },
  itemCard: {
    backgroundColor: "#111c31",
    borderRadius: "10px",
    padding: "10px 12px",
    margin: "0 0 8px",
  },
  itemName: {
    color: "#f8fafc",
    fontSize: "13px",
    fontWeight: 700 as const,
    lineHeight: "1.5",
    margin: "0 0 3px",
  },
  itemMeta: {
    color: "#cbd5e1",
    fontSize: "12px",
    lineHeight: "1.5",
    margin: "0 0 2px",
  },
  itemDetail: {
    color: "#94a3b8",
    fontSize: "11px",
    lineHeight: "1.5",
    margin: "1px 0",
  },
  itemDivider: {
    borderColor: "#334155",
    margin: "12px 0",
  },
  valorPago: {
    color: "#22c55e",
    fontWeight: 700 as const,
  },
  hr: {
    borderColor: "#1f2937",
    margin: "18px 0 14px",
  },
  link: {
    color: "#facc15",
    textDecoration: "underline",
  },
  footer: {
    color: "#94a3b8",
    fontSize: "11px",
    margin: "6px 0 2px",
  },
  micro: {
    color: "#64748b",
    fontSize: "10px",
    margin: 0,
  },
};
