// app/admin/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Eye,
  RefreshCw,
  Search,
  CheckCircle2,
  BanknoteX,
  Wallet,
  Shirt,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";

// recharts + shadcn charts
import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  LabelList,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

/** UNIFORMES **/
type Modelo = "BRANCA" | "AZUL" | "AZUL_SEM_MANGA";
type TipoPedido = "KIT" | "BLUSA";

type Encomenda = {
  id: string;
  txid: string;
  nome: string;
  telefone: string;
  email: string;
  modelo: Modelo;
  tamanho: string;
  tipoPedido: TipoPedido;
  nomeCamisa: string;
  numeroCamisa: string;
  status: string;
  valorTotal: string | number;
  valorPago?: string | number | null;
  comprovanteBase64?: string | null;
  createdAt: string;
};

/** CANECAS / TIRANTES **/
type ProdutoCaneca = "CANECA" | "TIRANTE" | "KIT";

type PedidoCaneca = {
  id: string;
  txid: string;
  nome: string;
  telefone: string;
  email: string;
  produto: ProdutoCaneca;
  quantidade: number;
  status: string;
  valorTotal: string | number;
  valorPago?: string | number | null;
  comprovanteBase64?: string | null;
  createdAt: string;
};

/** TIPO UNIFICADO PRA TABELA / DETALHES **/
type FontePedido = "UNIFORME" | "CANECA";

type PedidoUnificado = {
  id: string;
  txid: string;
  nome: string;
  telefone: string;
  email: string;
  status: string;
  valorTotal: string | number;
  valorPago?: string | number | null;
  comprovanteBase64?: string | null;
  createdAt: string;
  fonte: FontePedido;

  // campos de uniforme
  modelo?: Modelo;
  tamanho?: string;
  tipoPedidoUniforme?: TipoPedido;
  nomeCamisa?: string;
  numeroCamisa?: string;

  // campos de caneca
  produtoCaneca?: ProdutoCaneca;
  quantidade?: number;
};

const currency = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "AGUARDANDO_PAGAMENTO":
      return (
        <Badge className="bg-amber-500/90 hover:bg-amber-500 text-white text-[10px]">
          Aguard. pagamento
        </Badge>
      );
    case "AGUARDANDO_VALIDACAO":
      return (
        <Badge className="bg-sky-500/90 hover:bg-sky-500 text-white text-[10px]">
          Aguard. validação
        </Badge>
      );
    case "PAGO_METADE":
      return (
        <Badge className="bg-violet-500/90 hover:bg-violet-500 text-white text-[10px]">
          Pago metade
        </Badge>
      );
    case "CONFIRMADO":
    case "PAGO":
      return (
        <Badge className="bg-emerald-500/90 hover:bg-emerald-500 text-white text-[10px]">
          Pago total
        </Badge>
      );
    case "CANCELADO":
      return (
        <Badge variant="destructive" className="text-[10px]">
          Cancelado
        </Badge>
      );
    default:
      return (
        <Badge className="bg-slate-200 text-slate-700 text-[10px]">
          {status}
        </Badge>
      );
  }
}

const humanModelo = (m?: Modelo) => {
  if (!m) return "-";
  switch (m) {
    case "BRANCA":
      return "Camisa branca";
    case "AZUL":
      return "Camisa azul";
    case "AZUL_SEM_MANGA":
      return "Camisa azul sem manga";
    default:
      return m;
  }
};

const humanTipoPedidoUniforme = (t?: TipoPedido) =>
  t === "KIT"
    ? "Kit uniforme (camisa + short)"
    : t === "BLUSA"
    ? "Somente camisa"
    : "-";

const humanProdutoCaneca = (p?: ProdutoCaneca) => {
  switch (p) {
    case "CANECA":
      return "Caneca 850 mL";
    case "TIRANTE":
      return "Tirante";
    case "KIT":
      return "Kit caneca + tirante";
    default:
      return "-";
  }
};

// ==== CONFIG DOS GRÁFICOS ====
// Pizza: 5 tipos de produto
const produtoChartConfig = {
  kitUniforme: {
    label: "Kit uniforme",
    color: "#FACC15",
  },
  camisa: {
    label: "Camisa",
    color: "#F97316",
  },
  caneca: {
    label: "Caneca",
    color: "#22C55E",
  },
  tirante: {
    label: "Tirante",
    color: "#0EA5E9",
  },
  kitCaneca: {
    label: "Kit caneca",
    color: "#A855F7",
  },
} satisfies ChartConfig;

// Barras: modelo da camisa
const modeloChartConfig = {
  pedidos: {
    label: "Pedidos",
    color: "#FACC15",
  },
} satisfies ChartConfig;

export default function AdminPage() {
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [pedidosCaneca, setPedidosCaneca] = useState<PedidoCaneca[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    | "TODAS"
    | "AGUARDANDO_PAGAMENTO"
    | "AGUARDANDO_VALIDACAO"
    | "PAGO_METADE"
    | "CONFIRMADO"
    | "PAGO"
    | "CANCELADO"
  >("TODAS");

  const [selected, setSelected] = useState<PedidoUnificado | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const fetchEncomendas = async () => {
    setLoading(true);
    try {
      const [resUniformes, resCanecas] = await Promise.all([
        fetch("/api/pedidos", { cache: "no-store" }),
        fetch("/api/pedidos-canecas", { cache: "no-store" }),
      ]);

      if (!resUniformes.ok) throw new Error("Erro ao carregar uniformes");

      const uniformes = (await resUniformes.json()) as Encomenda[];
      setEncomendas(uniformes);

      if (resCanecas.ok) {
        const canecas = (await resCanecas.json()) as PedidoCaneca[];
        setPedidosCaneca(canecas);
      } else {
        setPedidosCaneca([]);
      }
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível carregar os pedidos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEncomendas();
  }, []);

  /** une uniformes + canecas em uma lista única para tabela/filtros */
  const pedidosUnificados: PedidoUnificado[] = useMemo(() => {
    const uni: PedidoUnificado[] = [];

    for (const e of encomendas) {
      uni.push({
        id: e.id,
        txid: e.txid,
        nome: e.nome,
        telefone: e.telefone,
        email: e.email,
        status: e.status,
        valorTotal: e.valorTotal,
        valorPago: e.valorPago,
        comprovanteBase64: e.comprovanteBase64 ?? null,
        createdAt: e.createdAt,
        fonte: "UNIFORME",
        modelo: e.modelo,
        tamanho: e.tamanho,
        tipoPedidoUniforme: e.tipoPedido,
        nomeCamisa: e.nomeCamisa,
        numeroCamisa: e.numeroCamisa,
      });
    }

    for (const c of pedidosCaneca) {
      uni.push({
        id: c.id,
        txid: c.txid,
        nome: c.nome,
        telefone: c.telefone,
        email: c.email,
        status: c.status,
        valorTotal: c.valorTotal,
        valorPago: c.valorPago,
        comprovanteBase64: c.comprovanteBase64 ?? null,
        createdAt: c.createdAt,
        fonte: "CANECA",
        produtoCaneca: c.produto,
        quantidade: c.quantidade,
      });
    }

    // ordena do mais recente pro mais antigo
    return uni.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [encomendas, pedidosCaneca]);

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase();

    return pedidosUnificados
      .filter((p) =>
        statusFilter === "TODAS" ? true : p.status === statusFilter
      )
      .filter((p) => {
        if (!q) return true;
        return (
          p.nome.toLowerCase().includes(q) ||
          p.telefone.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
        );
      });
  }, [pedidosUnificados, search, statusFilter]);

  // ===== MÉTRICAS GERAIS (uniformes + canecas) =====
  const {
    totalPedidos,
    totalConfirmados,
    totalKitsUniforme,
    totalBlusas,
    totalValorEncomendas,
    totalRecebido,
    receitaAReceber,
    modeloCounts,
    produtoCounts,
  } = useMemo(() => {
    const stats = {
      totalPedidos: 0,
      totalConfirmados: 0,
      totalKitsUniforme: 0,
      totalBlusas: 0,
      totalValorEncomendas: 0,
      totalRecebido: 0,
      receitaAReceber: 0,
      modeloCounts: {
        BRANCA: 0,
        AZUL: 0,
        AZUL_SEM_MANGA: 0,
      } as Record<Modelo, number>,
      produtoCounts: {
        kitUniforme: 0,
        camisa: 0,
        caneca: 0,
        tirante: 0,
        kitCaneca: 0,
      },
    };

    // UNIFORMES
    for (const e of encomendas) {
      stats.totalPedidos += 1;

      const valorTotal =
        typeof e.valorTotal === "string"
          ? parseFloat(e.valorTotal)
          : Number(e.valorTotal || 0);

      const valorPagoRaw =
        e.valorPago != null
          ? typeof e.valorPago === "string"
            ? parseFloat(e.valorPago)
            : Number(e.valorPago)
          : null;

      stats.totalValorEncomendas += valorTotal;
      stats.modeloCounts[e.modelo] += 1;

      if (e.tipoPedido === "KIT") {
        stats.totalKitsUniforme += 1;
        stats.produtoCounts.kitUniforme += 1;
      }
      if (e.tipoPedido === "BLUSA") {
        stats.totalBlusas += 1;
        stats.produtoCounts.camisa += 1;
      }

      const isConfirmado =
        e.status === "PAGO_METADE" ||
        e.status === "CONFIRMADO" ||
        e.status === "PAGO";

      if (isConfirmado) {
        stats.totalConfirmados += 1;

        let recebido = 0;
        if (e.status === "PAGO_METADE") {
          recebido =
            valorPagoRaw != null && !Number.isNaN(valorPagoRaw)
              ? valorPagoRaw
              : valorTotal / 2;
        } else {
          recebido =
            valorPagoRaw != null && !Number.isNaN(valorPagoRaw)
              ? valorPagoRaw
              : valorTotal;
        }

        stats.totalRecebido += recebido;
      }
    }

    // CANECAS / TIRANTES
    for (const c of pedidosCaneca) {
      stats.totalPedidos += 1;

      const valorTotal =
        typeof c.valorTotal === "string"
          ? parseFloat(c.valorTotal)
          : Number(c.valorTotal || 0);

      const valorPagoRaw =
        c.valorPago != null
          ? typeof c.valorPago === "string"
            ? parseFloat(c.valorPago)
            : Number(c.valorPago)
          : null;

      stats.totalValorEncomendas += valorTotal;

      const qtd = c.quantidade || 1;
      if (c.produto === "CANECA") stats.produtoCounts.caneca += qtd;
      if (c.produto === "TIRANTE") stats.produtoCounts.tirante += qtd;
      if (c.produto === "KIT") stats.produtoCounts.kitCaneca += qtd;

      const isConfirmado =
        c.status === "PAGO_METADE" ||
        c.status === "CONFIRMADO" ||
        c.status === "PAGO";

      if (isConfirmado) {
        stats.totalConfirmados += 1;

        let recebido = 0;
        if (c.status === "PAGO_METADE") {
          recebido =
            valorPagoRaw != null && !Number.isNaN(valorPagoRaw)
              ? valorPagoRaw
              : valorTotal / 2;
        } else {
          recebido =
            valorPagoRaw != null && !Number.isNaN(valorPagoRaw)
              ? valorPagoRaw
              : valorTotal;
        }

        stats.totalRecebido += recebido;
      }
    }

    stats.receitaAReceber =
      stats.totalValorEncomendas - stats.totalRecebido > 0
        ? stats.totalValorEncomendas - stats.totalRecebido
        : 0;

    return stats;
  }, [encomendas, pedidosCaneca]);

  // DADOS PARA GRÁFICOS
  const pieProdutoData = useMemo(
    () => [
      {
        key: "kitUniforme",
        label: "Kit uniforme",
        value: produtoCounts.kitUniforme,
      },
      {
        key: "camisa",
        label: "Camisa",
        value: produtoCounts.camisa,
      },
      {
        key: "caneca",
        label: "Caneca",
        value: produtoCounts.caneca,
      },
      {
        key: "tirante",
        label: "Tirante",
        value: produtoCounts.tirante,
      },
      {
        key: "kitCaneca",
        label: "Kit caneca",
        value: produtoCounts.kitCaneca,
      },
    ],
    [produtoCounts]
  );

  const barModeloData = useMemo(
    () => [
      {
        key: "azulSemManga",
        modeloLabel: "Azul s/ manga",
        pedidos: modeloCounts.AZUL_SEM_MANGA,
        fill: "#22C55E",
      },
      {
        key: "azul",
        modeloLabel: "Azul",
        pedidos: modeloCounts.AZUL,
        fill: "#3B82F6",
      },
      {
        key: "branca",
        modeloLabel: "Branca",
        pedidos: modeloCounts.BRANCA,
        fill: "#F97316",
      },
    ],
    [modeloCounts]
  );

  const confirmarPedido = async (
    ped: PedidoUnificado,
    tipo: "METADE" | "TOTAL"
  ) => {
    try {
      setActing(ped.txid);

      const url =
        ped.fonte === "UNIFORME"
          ? "/api/pedidos/admin/confirmar"
          : "/api/pedidos-canecas/admin/confirmar";

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txid: ped.txid,
          aprovado: true,
          tipo,
        }),
      });

      if (!res.ok) throw new Error();

      toast.success(
        tipo === "METADE"
          ? "Pedido confirmado (pago metade)."
          : "Pedido confirmado (pago total)."
      );
      fetchEncomendas();
    } catch {
      toast.error("Falha ao confirmar pedido.");
    } finally {
      setActing(null);
    }
  };

  const cancelarPedido = async (ped: PedidoUnificado) => {
    try {
      setActing(ped.txid);

      const url =
        ped.fonte === "UNIFORME"
          ? "/api/pedidos/admin/confirmar"
          : "/api/pedidos-canecas/admin/confirmar";

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txid: ped.txid,
          aprovado: false,
          motivo: "Pagamento divergente.",
        }),
      });

      if (!res.ok) throw new Error();
      toast.success("Pedido cancelado.");
      fetchEncomendas();
    } catch {
      toast.error("Falha ao cancelar pedido.");
    } finally {
      setActing(null);
    }
  };

  const getProdutoLabel = (p: PedidoUnificado) => {
    if (p.fonte === "UNIFORME") {
      return p.tipoPedidoUniforme === "KIT" ? "Kit uniforme" : "Camisa";
    }
    return humanProdutoCaneca(p.produtoCaneca);
  };

  return (
    <main className="min-h-screen bg-[#020817] px-4 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        {/* TÍTULO */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-50">
              Painel de Pedidos — Energizada
            </h1>
            <p className="text-sm text-slate-400">
              Acompanhe pedidos de uniformes e produtos (canecas e tirantes).
            </p>
          </div>

          <Button
            variant="outline"
            onClick={fetchEncomendas}
            className="border-slate-700 bg-slate-900/60 text-slate-100 hover:bg-slate-800"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-slate-800 bg-slate-900 text-slate-50 shadow-md">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-slate-300 flex items-center gap-1">
                <Shirt className="h-4 w-4 text-yellow-400" />
                Total de pedidos (todos)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-slate-50">
                {totalPedidos}
              </p>
              <p className="text-[11px] text-slate-400">
                {totalConfirmados} com pagamento registrado
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900 text-slate-50 shadow-md">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-slate-300 flex items-center gap-1">
                <PieChartIcon className="h-4 w-4 text-yellow-400" />
                Kits x Camisas (uniforme)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-100">
                <span className="font-semibold text-yellow-400">
                  {totalKitsUniforme}
                </span>{" "}
                kits •{" "}
                <span className="font-semibold text-yellow-400">
                  {totalBlusas}
                </span>{" "}
                camisas
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Considera apenas pedidos de uniforme
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900 text-slate-50 shadow-md">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-slate-300 flex items-center gap-1">
                <BarChart3 className="h-4 w-4 text-yellow-400" />
                Valor total dos pedidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-slate-50">
                {currency(totalValorEncomendas)}
              </p>
              <p className="text-[11px] text-slate-400">
                Soma de todos os pedidos (uniforme + canecas)
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900 text-slate-50 shadow-md">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-slate-300 flex items-center gap-1">
                <Wallet className="h-4 w-4 text-yellow-400" />
                Recebido x a receber
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-100">
                Recebido:{" "}
                <span className="font-semibold text-emerald-300">
                  {currency(totalRecebido)}
                </span>
              </p>
              <p className="text-sm text-slate-100">
                A receber:{" "}
                <span className="font-semibold text-amber-300">
                  {currency(receitaAReceber)}
                </span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* GRÁFICOS */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Pizza por tipo de produto */}
          <Card className="border-blue-900 bg-[#050816] text-slate-50 shadow-md overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-slate-100 flex items-center gap-1">
                <PieChartIcon className="h-4 w-4 text-yellow-400" />
                Distribuição por tipo de produto
              </CardTitle>
            </CardHeader>

            <CardContent className="pb-6 pt-0">
              {totalPedidos === 0 ? (
                <div className="flex h-64 items-center justify-center text-xs text-slate-500">
                  Sem dados suficientes para o gráfico.
                </div>
              ) : (
                <ChartContainer
                  config={produtoChartConfig}
                  className="mx-auto h-64 w-full max-w-[360px]"
                >
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          hideLabel
                          className="bg-slate-900/95 border-slate-700 text-slate-50 shadow-xl"
                        />
                      }
                    />
                    <Pie
                      data={pieProdutoData}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={4}
                      strokeWidth={4}
                    >
                      {pieProdutoData.map((entry) => (
                        <Cell
                          key={entry.key}
                          fill={`var(--color-${entry.key})`}
                        />
                      ))}

                      <Label
                        content={({ viewBox }) => {
                          if (
                            !viewBox ||
                            !("cx" in viewBox) ||
                            !("cy" in viewBox)
                          )
                            return null;

                          const total = pieProdutoData.reduce(
                            (acc, cur) => acc + cur.value,
                            0
                          );

                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                className="fill-slate-50 text-2xl font-bold"
                              >
                                {total}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 18}
                                className="fill-slate-400 text-xs"
                              >
                                pedidos
                              </tspan>
                            </text>
                          );
                        }}
                      />
                    </Pie>
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Bar por modelo de camisa */}
          <Card className="border-blue-900 bg-[#050816] text-slate-50 shadow-md overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-slate-100 flex items-center gap-1">
                <BarChart3 className="h-4 w-4 text-yellow-400" />
                Pedidos por modelo de camisa
              </CardTitle>
            </CardHeader>

            <CardContent className="pb-6 pt-0">
              {encomendas.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-xs text-slate-500">
                  Sem dados suficientes para o gráfico.
                </div>
              ) : (
                <ChartContainer
                  config={modeloChartConfig}
                  className="h-64 w-full"
                >
                  <BarChart
                    data={barModeloData}
                    margin={{ top: 24, left: 16, right: 16, bottom: 8 }}
                  >
                    <CartesianGrid vertical={false} stroke="#111827" />
                    <XAxis
                      dataKey="modeloLabel"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      stroke="#9ca3af"
                      fontSize={11}
                    />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />

                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          hideLabel
                          className="bg-slate-900/95 border-slate-700 text-slate-100 shadow-xl"
                        />
                      }
                    />

                    <Bar dataKey="pedidos" radius={8}>
                      {barModeloData.map((entry) => (
                        <Cell key={entry.key} fill={entry.fill} />
                      ))}
                      <LabelList
                        dataKey="pedidos"
                        position="top"
                        className="fill-slate-100 text-xs"
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* FILTROS */}
        <Card className="border-slate-800 bg-slate-900 text-slate-50 shadow-md">
          <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Buscar por nome, telefone ou e-mail"
                className="pl-8 border-slate-700 bg-slate-950 text-slate-50 placeholder:text-slate-500 focus-visible:ring-sky-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { id: "TODAS", label: "Todas" },
                { id: "AGUARDANDO_PAGAMENTO", label: "Aguard. pag." },
                { id: "AGUARDANDO_VALIDACAO", label: "Aguard. val." },
                { id: "PAGO_METADE", label: "Pago metade" },
                { id: "CONFIRMADO", label: "Pago total" },
                { id: "PAGO", label: "Pago total (antigo)" },
                { id: "CANCELADO", label: "Cancelado" },
              ].map((opt) => (
                <Button
                  key={opt.id}
                  type="button"
                  size="sm"
                  variant={statusFilter === opt.id ? "default" : "outline"}
                  className={
                    statusFilter === opt.id
                      ? "bg-sky-500 text-slate-900 hover:bg-sky-400 border-sky-400"
                      : "border-slate-700 text-slate-900 hover:bg-slate-800"
                  }
                  onClick={() =>
                    setStatusFilter(opt.id as typeof statusFilter)
                  }
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* TABELA – TODOS OS PEDIDOS */}
        <Card className="border-slate-800 bg-slate-900 text-slate-50 shadow-md">
          <CardHeader>
            <CardTitle className="text-slate-50">
              Pedidos (uniformes e canecas)
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-800 text-xs text-slate-400">
                <tr>
                  <th className="py-2 pr-4 text-left">Data</th>
                  <th className="py-2 pr-4 text-left">Cliente</th>
                  <th className="py-2 pr-4 text-left">Produto / Detalhes</th>
                  <th className="py-2 pr-4 text-left">Status</th>
                  <th className="py-2 pr-4 text-right">Valor</th>
                  <th className="py-2 pr-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-slate-500"
                    >
                      Carregando…
                    </td>
                  </tr>
                ) : filtradas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-slate-500"
                    >
                      Nenhum pedido encontrado.
                    </td>
                  </tr>
                ) : (
                  filtradas.map((ped) => {
                    const valor =
                      typeof ped.valorTotal === "string"
                        ? parseFloat(ped.valorTotal)
                        : Number(ped.valorTotal || 0);

                    const isUniforme = ped.fonte === "UNIFORME";

                    return (
                      <tr
                        key={ped.id}
                        className="border-b border-slate-800 last:border-0"
                      >
                        <td className="py-3 pr-4 text-xs text-slate-400">
                          {new Date(ped.createdAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>

                        <td className="py-3 pr-4">
                          <div className="font-medium text-slate-50">
                            {ped.nome}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            TXID {ped.txid}
                          </div>
                        </td>

                        <td className="py-3 pr-4 text-xs text-slate-100">
                          <div className="font-semibold">
                            {getProdutoLabel(ped)}
                          </div>

                          {isUniforme ? (
                            <>
                              <div>{humanModelo(ped.modelo)}</div>
                              <div>
                                {humanTipoPedidoUniforme(
                                  ped.tipoPedidoUniforme
                                )}
                              </div>
                              <div>
                                Tam:{" "}
                                <span className="font-semibold">
                                  {ped.tamanho}
                                </span>
                              </div>
                              <div>
                                {ped.nomeCamisa} • #{ped.numeroCamisa}
                              </div>
                            </>
                          ) : (
                            <>
                              <div>{humanProdutoCaneca(ped.produtoCaneca)}</div>
                              <div>
                                Qtde:{" "}
                                <span className="font-semibold">
                                  {ped.quantidade ?? 1}
                                </span>
                              </div>
                            </>
                          )}
                        </td>

                        <td className="py-3 pr-4">
                          <StatusBadge status={ped.status} />
                        </td>

                        <td className="py-3 pr-4 text-right font-medium text-sky-400">
                          {currency(valor)}
                        </td>

                        <td className="py-3 pl-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-sky-400 hover:bg-slate-800"
                              title="Ver detalhes"
                              onClick={() => setSelected(ped)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {(ped.status === "AGUARDANDO_VALIDACAO" ||
                              ped.status === "PAGO_METADE" ||
                              ped.status === "AGUARDANDO_PAGAMENTO") && (
                              <>
                                <Button
                                  size="icon-sm"
                                  className="bg-violet-500 hover:bg-violet-600 text-white"
                                  disabled={acting === ped.txid}
                                  onClick={() =>
                                    confirmarPedido(ped, "METADE")
                                  }
                                >
                                  1/2
                                </Button>
                                <Button
                                  size="icon-sm"
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                                  disabled={acting === ped.txid}
                                  onClick={() =>
                                    confirmarPedido(ped, "TOTAL")
                                  }
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon-sm"
                                  variant="destructive"
                                  disabled={acting === ped.txid}
                                  onClick={() => cancelarPedido(ped)}
                                >
                                  <BanknoteX className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* DIALOG DETALHES */}
        <Dialog
          open={!!selected}
          onOpenChange={(open) => !open && setSelected(null)}
        >
          <DialogContent className="w-full max-w-lg max-h-[80vh] overflow-y-auto border-slate-800 bg-slate-900 text-slate-50">
            <DialogHeader>
              <DialogTitle className="text-slate-50">
                Detalhes do pedido
              </DialogTitle>
            </DialogHeader>

            {selected && (
              <div className="space-y-4 text-sm">
                {/* Dados principais */}
                <div className="space-y-2">
                  <p>
                    <span className="font-semibold">Cliente:</span>{" "}
                    {selected.nome}
                  </p>
                  <p>
                    <span className="font-semibold">Telefone:</span>{" "}
                    {selected.telefone}
                  </p>
                  <p>
                    <span className="font-semibold">E-mail:</span>{" "}
                    {selected.email}
                  </p>
                  <p>
                    <span className="font-semibold">Origem:</span>{" "}
                    {selected.fonte === "UNIFORME"
                      ? "Uniforme"
                      : "Caneca / Tirante"}
                  </p>
                  <p>
                    <span className="font-semibold">Produto:</span>{" "}
                    {getProdutoLabel(selected)}
                  </p>

                  {selected.fonte === "UNIFORME" ? (
                    <>
                      <p>
                        <span className="font-semibold">Modelo:</span>{" "}
                        {humanModelo(selected.modelo)}
                      </p>
                      <p>
                        <span className="font-semibold">Tipo:</span>{" "}
                        {humanTipoPedidoUniforme(
                          selected.tipoPedidoUniforme
                        )}
                      </p>
                      <p>
                        <span className="font-semibold">Tamanho:</span>{" "}
                        {selected.tamanho}
                      </p>
                      <p>
                        <span className="font-semibold">
                          Nome / número na camisa:
                        </span>{" "}
                        {selected.nomeCamisa} — #{selected.numeroCamisa}
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        <span className="font-semibold">Produto:</span>{" "}
                        {humanProdutoCaneca(selected.produtoCaneca)}
                      </p>
                      <p>
                        <span className="font-semibold">Quantidade:</span>{" "}
                        {selected.quantidade ?? 1}
                      </p>
                    </>
                  )}

                  <p>
                    <span className="font-semibold">Status:</span>{" "}
                    {selected.status}
                  </p>

                  <p>
                    <span className="font-semibold">Valor total:</span>{" "}
                    {currency(
                      typeof selected.valorTotal === "string"
                        ? parseFloat(selected.valorTotal)
                        : Number(selected.valorTotal || 0)
                    )}
                  </p>

                  {selected.valorPago != null && (
                    <p>
                      <span className="font-semibold">Valor pago:</span>{" "}
                      {currency(
                        typeof selected.valorPago === "string"
                          ? parseFloat(selected.valorPago)
                          : Number(selected.valorPago || 0)
                      )}
                    </p>
                  )}
                </div>

                {/* Comprovante */}
                {selected.comprovanteBase64 && (
                  <>
                    <Separator className="bg-slate-800" />
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-50">
                        Comprovante de pagamento
                      </p>
                      <div className="rounded-md border border-slate-800 bg-slate-950 p-2">
                        <img
                          src={
                            selected.comprovanteBase64.startsWith("data:")
                              ? selected.comprovanteBase64
                              : `data:image/jpeg;base64,${selected.comprovanteBase64}`
                          }
                          alt={`Comprovante de pagamento de ${selected.nome}`}
                          className="max-h-80 w-full rounded object-contain"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
