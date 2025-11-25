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

/** TIPOS DO PEDIDO (uniformes) */
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

const humanModelo = (m: Modelo) => {
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

const humanTipoPedido = (t: TipoPedido) =>
  t === "KIT" ? "Kit (Camisa + Short)" : "Somente camisa";

// ==== CONFIG DOS GRÁFICOS (shadcn) - tema amarelo Energizada ====
const tipoChartConfig = {
  kit: {
    label: "Kit",
    color: "#FACC15", // amarelo principal
  },
  blusa: {
    label: "Blusa",
    color: "#FBBF24", // amarelo secundário
  },
} satisfies ChartConfig;

const modeloChartConfig = {
  pedidos: {
    label: "Pedidos",
    color: "#FACC15",
  },
} satisfies ChartConfig;

export default function AdminPage() {
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    | "TODAS"
    | "AGUARDANDO_PAGAMENTO"
    | "AGUARDANDO_VALIDACAO"
    | "PAGO_METADE"
    | "CONFIRMADO"
    | "CANCELADO"
  >("TODAS");

  const [selected, setSelected] = useState<Encomenda | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const fetchEncomendas = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pedidos", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as Encomenda[];
      setEncomendas(data);
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

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase();

    return encomendas
      .filter((e) =>
        statusFilter === "TODAS" ? true : e.status === statusFilter
      )
      .filter((e) => {
        if (!q) return true;
        return (
          e.nome.toLowerCase().includes(q) ||
          e.telefone.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q)
        );
      });
  }, [encomendas, search, statusFilter]);

  // ===== MÉTRICAS PARA UNIFORMES =====
  const {
    totalPedidos,
    totalConfirmados,
    totalKits,
    totalBlusas,
    totalValorEncomendas,
    totalRecebido,
    receitaAReceber,
    modeloCounts,
    tipoCounts,
  } = useMemo(() => {
    const stats = {
      totalPedidos: encomendas.length,
      totalConfirmados: 0,
      totalKits: 0,
      totalBlusas: 0,
      totalValorEncomendas: 0,
      totalRecebido: 0,
      receitaAReceber: 0,
      modeloCounts: {
        BRANCA: 0,
        AZUL: 0,
        AZUL_SEM_MANGA: 0,
      } as Record<Modelo, number>,
      tipoCounts: {
        KIT: 0,
        BLUSA: 0,
      } as Record<TipoPedido, number>,
    };

    for (const e of encomendas) {
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
      stats.tipoCounts[e.tipoPedido] += 1;
      stats.modeloCounts[e.modelo] += 1;

      if (e.tipoPedido === "KIT") stats.totalKits += 1;
      if (e.tipoPedido === "BLUSA") stats.totalBlusas += 1;

      const isConfirmado =
        e.status === "PAGO_METADE" || e.status === "CONFIRMADO";

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

    stats.receitaAReceber =
      stats.totalValorEncomendas - stats.totalRecebido > 0
        ? stats.totalValorEncomendas - stats.totalRecebido
        : 0;

    return stats;
  }, [encomendas]);

  // DADOS PARA GRÁFICOS (padrão shadcn + amarelo)
  const pieTipoData = useMemo(
    () => [
      {
        key: "kit",
        tipo: "Kit",
        value: tipoCounts.KIT,
      },
      {
        key: "blusa",
        tipo: "Blusa",
        value: tipoCounts.BLUSA,
      },
    ],
    [tipoCounts]
  );

  const barModeloData = useMemo(
    () => [
      { modelo: "Branca", pedidos: modeloCounts.BRANCA },
      { modelo: "Azul", pedidos: modeloCounts.AZUL },
      { modelo: "Azul s/ manga", pedidos: modeloCounts.AZUL_SEM_MANGA },
    ],
    [modeloCounts]
  );

  const confirmarEncomenda = async (
    enc: Encomenda,
    tipo: "METADE" | "TOTAL"
  ) => {
    try {
      setActing(enc.txid);
      const res = await fetch("/api/pedidos/admin/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txid: enc.txid,
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

  const cancelarEncomenda = async (enc: Encomenda) => {
    try {
      setActing(enc.txid);
      const res = await fetch("/api/pedidos/admin/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txid: enc.txid,
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

  return (
    <main className="min-h-screen bg-[#020817] px-4 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        {/* TÍTULO */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-50">
              Painel de Pedidos — Uniformes Energizada
            </h1>
            <p className="text-sm text-slate-400">
              Acompanhe pedidos, pagamentos e distribuição de kits e camisas.
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
                Total de pedidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-slate-50">
                {totalPedidos}
              </p>
              <p className="text-[11px] text-slate-400">
                {totalConfirmados} já com pagamento registrado
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900 text-slate-50 shadow-md">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-slate-300 flex items-center gap-1">
                <PieChartIcon className="h-4 w-4 text-yellow-400" />
                Kits x Blusas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-100">
                <span className="font-semibold text-yellow-400">
                  {totalKits}
                </span>{" "}
                kits •{" "}
                <span className="font-semibold text-yellow-400">
                  {totalBlusas}
                </span>{" "}
                blusas
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Distribuição geral dos pedidos
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
                Soma de todos os pedidos cadastrados
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
          {/* Donut Kit x Blusa */}
          <Card className="border-blue-900 bg-[#050816] text-slate-50 shadow-md overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-slate-100 flex items-center gap-1">
                <PieChartIcon className="h-4 w-4 text-yellow-400" />
                Distribuição de pedidos (Kit x Blusa)
              </CardTitle>
            </CardHeader>

            <CardContent className="pb-6 pt-0">
              {totalPedidos === 0 ? (
                <div className="flex h-64 items-center justify-center text-xs text-slate-500">
                  Sem dados suficientes para o gráfico.
                </div>
              ) : (
                <ChartContainer
                  config={tipoChartConfig}
                  className="mx-auto h-64 w-full max-w-[320px]"
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
                      data={pieTipoData}
                      dataKey="value"
                      nameKey="tipo"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={4}
                      strokeWidth={4}
                    >
                      {pieTipoData.map((entry) => (
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

                          const total = pieTipoData.reduce(
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

          {/* Bar por modelo */}
          <Card className="border-blue-900 bg-[#050816] text-slate-50 shadow-md overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-slate-100 flex items-center gap-1">
                <BarChart3 className="h-4 w-4 text-yellow-400" />
                Pedidos por modelo de camisa
              </CardTitle>
            </CardHeader>

            <CardContent className="pb-6 pt-0">
              {totalPedidos === 0 ? (
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
                      dataKey="modelo"
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

                    <Bar
                      dataKey="pedidos"
                      radius={8}
                      fill="var(--color-pedidos)"
                    >
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

        {/* TABELA */}
        <Card className="border-slate-800 bg-slate-900 text-slate-50 shadow-md">
          <CardHeader>
            <CardTitle className="text-slate-50">Pedidos</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-800 text-xs text-slate-400">
                <tr>
                  <th className="py-2 pr-4 text-left">Data</th>
                  <th className="py-2 pr-4 text-left">Cliente</th>
                  <th className="py-2 pr-4 text-left">Uniforme</th>
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
                  filtradas.map((enc) => {
                    const valor =
                      typeof enc.valorTotal === "string"
                        ? parseFloat(enc.valorTotal)
                        : Number(enc.valorTotal || 0);

                    return (
                      <tr
                        key={enc.id}
                        className="border-b border-slate-800 last:border-0"
                      >
                        <td className="py-3 pr-4 text-xs text-slate-400">
                          {new Date(enc.createdAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="font-medium text-slate-50">
                            {enc.nome}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            TXID {enc.txid}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-xs text-slate-100">
                          <div>{humanModelo(enc.modelo)}</div>
                          <div>{humanTipoPedido(enc.tipoPedido)}</div>
                          <div>
                            Tam:{" "}
                            <span className="font-semibold">
                              {enc.tamanho}
                            </span>
                          </div>
                          <div>
                            {enc.nomeCamisa} • #{enc.numeroCamisa}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <StatusBadge status={enc.status} />
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
                              onClick={() => setSelected(enc)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {(enc.status === "AGUARDANDO_VALIDACAO" ||
                              enc.status === "PAGO_METADE" ||
                              enc.status === "AGUARDANDO_PAGAMENTO") && (
                              <>
                                <Button
                                  size="icon-sm"
                                  className="bg-violet-500 hover:bg-violet-600 text-white"
                                  disabled={acting === enc.txid}
                                  onClick={() =>
                                    confirmarEncomenda(enc, "METADE")
                                  }
                                >
                                  1/2
                                </Button>
                                <Button
                                  size="icon-sm"
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                                  disabled={acting === enc.txid}
                                  onClick={() =>
                                    confirmarEncomenda(enc, "TOTAL")
                                  }
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon-sm"
                                  variant="destructive"
                                  disabled={acting === enc.txid}
                                  onClick={() => cancelarEncomenda(enc)}
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
                    <span className="font-semibold">Modelo:</span>{" "}
                    {humanModelo(selected.modelo)}
                  </p>
                  <p>
                    <span className="font-semibold">Tipo do pedido:</span>{" "}
                    {humanTipoPedido(selected.tipoPedido)}
                  </p>
                  <p>
                    <span className="font-semibold">Tamanho:</span>{" "}
                    {selected.tamanho}
                  </p>
                  <p>
                    <span className="font-semibold">Nome na camisa:</span>{" "}
                    {selected.nomeCamisa}
                  </p>
                  <p>
                    <span className="font-semibold">Número:</span>{" "}
                    {selected.numeroCamisa}
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
