// lib/pedido-pos-pagamento.ts
import { prisma } from "@/lib/db";
import { resend } from "@/lib/resend";
import PedidoConfirmadoEnergizadaEmail, {
  type EmailOrderItem,
} from "@/emails/pedido-confirmado-email";

type OrigemConfirmacao = "MERCADO_PAGO" | "MANUAL";

function normalizarItens(itemsJson: unknown): EmailOrderItem[] {
  if (!Array.isArray(itemsJson)) return [];

  return itemsJson.map((item: any) => {
    const nome =
      item?.name ??
      item?.nome ??
      item?.productName ??
      item?.produto ??
      "Produto";

    const quantidade = Math.max(
      1,
      Number(item?.quantity ?? item?.quantidade ?? 1) || 1,
    );

    const precoUnitario = Number(
      item?.unitPrice ?? item?.precoUnitario ?? item?.price ?? 0,
    );

    // Mantém as personalizações sem depender de colunas no Prisma.
    const detalhes: string[] = [];

    const adicionar = (rotulo: string, valor: unknown) => {
      if (valor === undefined || valor === null || valor === "") return;
      detalhes.push(`${rotulo}: ${String(valor)}`);
    };

    adicionar("Tamanho", item?.size ?? item?.tamanho);
    adicionar("Manga", item?.sleeve ?? item?.manga);
    adicionar("Nome", item?.customName ?? item?.nomePersonalizado);
    adicionar("Número", item?.number ?? item?.numero);

    // Caso a estrutura atual guarde opções em um objeto.
    const opcoes = item?.options ?? item?.opcoes ?? item?.personalizacao;
    if (opcoes && typeof opcoes === "object" && !Array.isArray(opcoes)) {
      Object.entries(opcoes).forEach(([chave, valor]) => {
        if (valor === undefined || valor === null || valor === "") return;

        const jaExiste = detalhes.some((d) =>
          d.toLowerCase().startsWith(`${chave.toLowerCase()}:`),
        );

        if (!jaExiste) {
          detalhes.push(`${chave}: ${String(valor)}`);
        }
      });
    }

    return {
      nome: String(nome),
      quantidade,
      precoUnitario:
        Number.isFinite(precoUnitario) && precoUnitario > 0
          ? precoUnitario
          : undefined,
      detalhes,
    };
  });
}

export async function confirmarPedidoPago({
  txid,
  valorPago,
  origem,
}: {
  txid: string;
  valorPago?: number | null;
  origem: OrigemConfirmacao;
}) {
  const atual = await prisma.pedidoCarrinho.findUnique({
    where: { txid },
  });

  if (!atual) {
    throw new Error(`Pedido ${txid} não encontrado.`);
  }

  // Se já estava PAGO, não repetimos as ações pós-pagamento.
  if (atual.status === "PAGO") {
    if (
      valorPago != null &&
      Number.isFinite(valorPago) &&
      Number(atual.valorPago || 0) !== valorPago
    ) {
      return prisma.pedidoCarrinho.update({
        where: { txid },
        data: { valorPago },
      });
    }

    return atual;
  }

  const valorFinal =
    valorPago != null && Number.isFinite(valorPago)
      ? valorPago
      : Number(atual.valorTotal || 0);

  // Evita e-mail duplicado caso webhook e edição manual confirmem juntos.
  const transicao = await prisma.pedidoCarrinho.updateMany({
    where: {
      txid,
      status: { not: "PAGO" },
    },
    data: {
      status: "PAGO",
      valorPago: valorFinal,
    },
  });

  const pedido = await prisma.pedidoCarrinho.findUnique({
    where: { txid },
  });

  if (!pedido) {
    throw new Error(`Pedido ${txid} não encontrado após confirmação.`);
  }

  if (transicao.count === 0) {
    return pedido;
  }

  console.log(
    `[PÓS-PAGAMENTO] Pedido ${txid} confirmado. Origem: ${origem}.`,
  );

  if (!pedido.email) {
    console.log(
      `[PÓS-PAGAMENTO] Pedido ${txid} sem e-mail. Confirmação não enviada.`,
    );
    return pedido;
  }

  const itens = normalizarItens(pedido.itemsJson);

  try {
    await resend.emails.send({
      from: "Atlética Energizada <no-reply@atleticaenergizada.shop>",
      to: pedido.email,
      subject: `Pagamento aprovado - Pedido #${pedido.txid}`,
      react: PedidoConfirmadoEnergizadaEmail({
        customerName: pedido.nome ?? "Cliente Energizada",
        orderId: pedido.txid,
        itens,
        valorTotal: Number(pedido.valorTotal),
        valorPago: Number(pedido.valorPago ?? pedido.valorTotal),
        pagamento: "total",
        supportEmail: "atleticaenergizada@cear.ufpb.br",
        logoSrc:
          "https://www.atleticaenergizada.shop/energizada-logo.png",
      }),
    });

    console.log(
      `[PÓS-PAGAMENTO] E-mail de confirmação enviado para ${pedido.email}.`,
    );
  } catch (emailErr) {
    // O pagamento permanece confirmado mesmo se o envio do e-mail falhar.
    console.error(
      `[PÓS-PAGAMENTO] Erro ao enviar e-mail do pedido ${txid}:`,
      emailErr,
    );
  }

  return pedido;
}
