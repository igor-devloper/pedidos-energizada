// lib/encomendas/dashboard.ts
import { prisma } from "@/lib/db";

type StatusPago = "CONFIRMADO" | "PAGO_METADE";

const STATUS_PAGOS: StatusPago[] = ["CONFIRMADO", "PAGO_METADE"];

export async function getEncomendasDashboardMetrics() {
  const encomendas = await prisma.encomenda.findMany({
    select: {
      status: true,
      valorTotal: true,
      valorPago: true,
      totalItens: true,
    },
  });

  let totalValorEncomendas = 0;   // soma de TODAS as encomendas (independente pagamento)
  let totalRecebido = 0;          // quanto já entrou de dinheiro
  let totalPedidos = 0;
  let totalPedidosPagos = 0;
  let totalPedidosNaoPagos = 0;
  let totalSalgadosPagos = 0;     // total de centos/salgados em encomendas pagas

  for (const e of encomendas) {
    const valorTotal = Number(e.valorTotal ?? 0);
    const valorPago = e.valorPago != null ? Number(e.valorPago) : null;
    const isPago = STATUS_PAGOS.includes(e.status as StatusPago);

    totalPedidos += 1;
    totalValorEncomendas += valorTotal;

    if (isPago) {
      totalPedidosPagos += 1;

      // Se tiver valorPago, usa ele (caso METADE ou outro arranjo),
      // senão considera o valor total como recebido.
      const recebido = valorPago ?? valorTotal;
      totalRecebido += recebido;

      totalSalgadosPagos += e.totalItens ?? 0;
    } else {
      totalPedidosNaoPagos += 1;
    }
  }

  return {
    totalValorEncomendas,
    totalRecebido,
    totalPedidos,
    totalPedidosPagos,
    totalPedidosNaoPagos,
    totalSalgadosPagos,
  };
}
