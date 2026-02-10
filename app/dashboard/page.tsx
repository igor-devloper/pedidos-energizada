// app/admin/page.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Eye, RefreshCw, Search, Shirt, Wallet, BarChart3, PieChartIcon, Package, Download } from "lucide-react"

import { PieChart, Pie, Cell, Label, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

/** TIPOS BÁSICOS (somente para o admin) **/

type StatusInterno = "AGUARDANDO_PAGAMENTO" | "PAGO_METADE" | "PAGO" | "CANCELADO"

type TipoPedidoUniforme = "KIT" | "BLUSA"
type TipoProdutoCaneca = "CANECA" | "TIRANTE" | "KIT"

// Estrutura genérica de item gravado em itemsJson
type ItemCarrinho = {
  kind: "UNIFORME" | "CANECA"
  productId: string
  label: string
  unitPrice: number
  quantity: number

  // uniformes
  tipoPedido?: TipoPedidoUniforme
  modelo?: "BRANCA" | "AZUL" | "AZUL_SEM_MANGA"
  tamanho?: string
  nomeCamisa?: string
  numeroCamisa?: string

  // canecas/tirantes
  tipoProduto?: TipoProdutoCaneca
}

// Pedido vindo da API
type PedidoCarrinho = {
  id: string
  txid: string
  nome: string
  email: string
  telefone: string
  status: StatusInterno | string
  valorTotal: number | string
  valorPago?: number | string | null
  itemsJson: ItemCarrinho[] | any
  createdAt: string
}

// === helpers ===
const currency = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "AGUARDANDO_PAGAMENTO":
      return <Badge className="bg-amber-500/90 hover:bg-amber-500 text-white text-[10px]">Aguard. pagamento</Badge>
    case "PAGO_METADE":
      return <Badge className="bg-violet-500/90 hover:bg-violet-500 text-white text-[10px]">Pago metade</Badge>
    case "PAGO":
      return <Badge className="bg-emerald-500/90 hover:bg-emerald-500 text-white text-[10px]">Pago (MP)</Badge>
    case "CANCELADO":
      return (
        <Badge variant="destructive" className="text-[10px]">
          Cancelado
        </Badge>
      )
    default:
      return <Badge className="bg-slate-200 text-slate-700 text-[10px]">{status}</Badge>
  }
}

// gráficos
const statusChartConfig = {
  aguardando: { label: "Aguardando", color: "#FBBF24" },
  pago: { label: "Pago", color: "#22C55E" },
  metade: { label: "Pago metade", color: "#A855F7" },
  cancelado: { label: "Cancelado", color: "#EF4444" },
} satisfies ChartConfig

const produtoChartConfig = {
  kitUniforme: { label: "Kit uniforme", color: "#FACC15" },
  camisa: { label: "Camisa", color: "#F97316" },
  caneca: { label: "Caneca", color: "#22C55E" },
  tirante: { label: "Tirante", color: "#0EA5E9" },
  kitCaneca: { label: "Kit caneca", color: "#A855F7" },
} satisfies ChartConfig

const precosProdutos = {
  KIT_UNIFORME: 90,
  CAMISA: 55,
  CANECA: 25,
  TIRANTE: 10,
  KIT_CANECA: 30,
}

export default function AdminPage() {
  const [pedidos, setPedidos] = useState<PedidoCarrinho[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"TODOS" | StatusInterno | "PAGO_METADE">("TODOS")
  const [selected, setSelected] = useState<PedidoCarrinho | null>(null)
  const [exportando, setExportando] = useState(false)

  const fetchPedidos = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/pedidos-carrinho", {
        cache: "no-store",
      })
      if (!res.ok) throw new Error("Erro ao buscar pedidos")
      const data = (await res.json()) as PedidoCarrinho[]

      // garante array de items
      const normalizados = data.map((p) => ({
        ...p,
        itemsJson: Array.isArray(p.itemsJson) ? p.itemsJson : [],
      }))

      setPedidos(normalizados)
    } catch (err) {
      console.error(err)
      toast.error("Não foi possível carregar os pedidos.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPedidos()
  }, [])

  // ======= filtros =======
  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase()

    return pedidos
      .filter((p) => (statusFilter === "TODOS" ? true : p.status === statusFilter))
      .filter((p) => {
        if (!q) return true
        return (
          p.nome.toLowerCase().includes(q) ||
          p.telefone.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.txid.toLowerCase().includes(q)
        )
      })
  }, [pedidos, search, statusFilter])

  // ======= exportar para Excel =======
  const exportarExcel = async () => {
    if (filtrados.length === 0) {
      toast.error("Nenhum pedido para exportar")
      return
    }

    setExportando(true)
    try {
      const res = await fetch("/api/exportar-pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pedidos: filtrados.map(p => ({
            id: p.id,
            txid: p.txid,
            nome: p.nome,
            email: p.email,
            telefone: p.telefone,
            status: p.status,
            createdAt: p.createdAt,
            itemsJson: p.itemsJson,
          })),
        }),
      })

      if (!res.ok) throw new Error("Erro ao exportar")

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `pedidos-energizada-${new Date().toISOString().split("T")[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("Planilha exportada com sucesso!")
    } catch (err) {
      console.error(err)
      toast.error("Erro ao exportar planilha")
    } finally {
      setExportando(false)
    }
  }

  // ======= métricas gerais =======
  const {
    totalPedidos,
    totalPago,
    totalMetade,
    totalAguardando,
    totalCancelado,
    valorTotal,
    valorRecebido,
    valorAReceber,
    produtoCounts,
    valorLiquido,
    valorLiquidoRecebido,
  } = useMemo(() => {
    let totalPedidos = 0
    let totalPago = 0
    let totalMetade = 0
    let totalAguardando = 0
    let totalCancelado = 0

    let valorTotal = 0
    let valorRecebido = 0
    let valorLiquido = 0
    let valorLiquidoRecebido = 0

    const produtoCounts = {
      kitUniforme: 0,
      camisa: 0,
      caneca: 0,
      tirante: 0,
      kitCaneca: 0,
    }

    for (const p of pedidos) {
      totalPedidos += 1

      const vTotal = typeof p.valorTotal === "string" ? Number.parseFloat(p.valorTotal) : Number(p.valorTotal || 0)
      valorTotal += vTotal

      const pagoRaw =
        p.valorPago != null
          ? typeof p.valorPago === "string"
            ? Number.parseFloat(p.valorPago)
            : Number(p.valorPago)
          : null

      // status
      if (p.status === "PAGO") totalPago += 1
      else if (p.status === "PAGO_METADE") totalMetade += 1
      else if (p.status === "CANCELADO") totalCancelado += 1
      else totalAguardando += 1

      // recebido
      if (p.status === "PAGO") {
        valorRecebido += pagoRaw != null && !Number.isNaN(pagoRaw) ? pagoRaw : vTotal
      } else if (p.status === "PAGO_METADE") {
        valorRecebido += pagoRaw != null && !Number.isNaN(pagoRaw) ? pagoRaw : vTotal / 2
      }

      // conta produtos (por item)
      const items = Array.isArray(p.itemsJson) ? p.itemsJson : []
      let valorLiquidoPedido = 0

      for (const item of items as ItemCarrinho[]) {
        const qty = item.quantity || 1

        if (item.kind === "UNIFORME") {
          if (item.tipoPedido === "KIT") {
            produtoCounts.kitUniforme += qty
            valorLiquidoPedido += precosProdutos.KIT_UNIFORME * qty
          } else {
            produtoCounts.camisa += qty
            valorLiquidoPedido += precosProdutos.CAMISA * qty
          }
        } else if (item.kind === "CANECA") {
          if (item.tipoProduto === "CANECA") {
            produtoCounts.caneca += qty
            valorLiquidoPedido += precosProdutos.CANECA * qty
          } else if (item.tipoProduto === "TIRANTE") {
            produtoCounts.tirante += qty
            valorLiquidoPedido += precosProdutos.TIRANTE * qty
          } else {
            produtoCounts.kitCaneca += qty
            valorLiquidoPedido += precosProdutos.KIT_CANECA * qty
          }
        }
      }

      valorLiquido += valorLiquidoPedido

      if (p.status === "PAGO") {
        valorLiquidoRecebido += valorLiquidoPedido
      }
    }

    const valorAReceber = Math.max(valorTotal - valorRecebido, 0)

    return {
      totalPedidos,
      totalPago,
      totalMetade,
      totalAguardando,
      totalCancelado,
      valorTotal,
      valorRecebido,
      valorAReceber,
      produtoCounts,
      valorLiquido,
      valorLiquidoRecebido,
    }
  }, [pedidos])

  // ======= dados dos gráficos =======
  const pieStatusData = useMemo(
    () => [
      {
        key: "aguardando",
        label: "Aguardando",
        value: totalAguardando,
      },
      {
        key: "pago",
        label: "Pago",
        value: totalPago,
      },
      {
        key: "metade",
        label: "Pago metade",
        value: totalMetade,
      },
      {
        key: "cancelado",
        label: "Cancelado",
        value: totalCancelado,
      },
    ],
    [totalAguardando, totalPago, totalMetade, totalCancelado],
  )

  const barProdutoData = useMemo(
    () => [
      {
        key: "kitUniforme",
        label: "Kit uniforme",
        quantidade: produtoCounts.kitUniforme,
        fill: "#FACC15",
      },
      {
        key: "camisa",
        label: "Camisa",
        quantidade: produtoCounts.camisa,
        fill: "#F97316",
      },
      {
        key: "caneca",
        label: "Caneca",
        quantidade: produtoCounts.caneca,
        fill: "#22C55E",
      },
      {
        key: "tirante",
        label: "Tirante",
        quantidade: produtoCounts.tirante,
        fill: "#0EA5E9",
      },
      {
        key: "kitCaneca",
        label: "Kit caneca",
        quantidade: produtoCounts.kitCaneca,
        fill: "#A855F7",
      },
    ],
    [produtoCounts],
  )

  return (
    <main className="min-h-screen bg-[#020817] px-4 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        {/* TÍTULO */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-50">Painel de Pedidos — Energizada</h1>
            <p className="text-sm text-slate-400">Pedidos gerais pagos via Mercado Pago (carrinho).</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={exportarExcel}
              disabled={exportando || filtrados.length === 0}
              className="border-emerald-700 bg-emerald-900/60 text-emerald-100 hover:bg-emerald-800"
            >
              <Download className="mr-2 h-4 w-4" />
              {exportando ? "Exportando..." : "Exportar Excel"}
            </Button>
            
            <Button
              variant="outline"
              onClick={fetchPedidos}
              className="border-slate-700 bg-slate-900/60 text-slate-100 hover:bg-slate-800"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-slate-800 bg-slate-900 text-slate-50 shadow-md">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-slate-300 flex items-center gap-1">
                <Package className="h-4 w-4 text-yellow-400" />
                Total de pedidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-slate-50">{totalPedidos}</p>
              <p className="text-[11px] text-slate-400">
                {totalPago} pagos • {totalAguardando} aguardando
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900 text-slate-50 shadow-md">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-slate-300 flex items-center gap-1">
                <Shirt className="h-4 w-4 text-yellow-400" />
                Produtos vendidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-100">Uniformes (kits + camisas) e canecas/tirantes combinados.</p>
              <p className="text-[11px] text-slate-400 mt-1">Veja a distribuição no gráfico de barras.</p>
            </CardContent>
          </Card>

          <Card className="border-emerald-800 bg-gradient-to-br from-emerald-950 to-slate-900 text-slate-50 shadow-md">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-emerald-300 flex items-center gap-1">
                <Wallet className="h-4 w-4 text-emerald-400" />
                Valor líquido (sem taxa MP)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-emerald-300">{currency(valorLiquidoRecebido)}</p>
              <p className="text-[11px] text-slate-400">De {currency(valorLiquido)} total em produtos</p>
              <p className="text-[10px] text-emerald-400/70 mt-1">Este é o valor real que você tem (sem taxas)</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900 text-slate-50 shadow-md">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-slate-300 flex items-center gap-1">
                <BarChart3 className="h-4 w-4 text-yellow-400" />
                Recebido x a receber (bruto)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-100">
                Recebido: <span className="font-semibold text-emerald-300">{currency(valorRecebido)}</span>
              </p>
              <p className="text-sm text-slate-100">
                A receber: <span className="font-semibold text-amber-300">{currency(valorAReceber)}</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Valores incluem taxa do Mercado Pago</p>
            </CardContent>
          </Card>
        </div>

        {/* GRÁFICOS */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Pizza por status */}
          <Card className="border-blue-900 bg-[#050816] text-slate-50 shadow-md overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-slate-100 flex items-center gap-1">
                <PieChartIcon className="h-4 w-4 text-yellow-400" />
                Distribuição por status
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-6 pt-0">
              {totalPedidos === 0 ? (
                <div className="flex h-64 items-center justify-center text-xs text-slate-500">
                  Sem dados suficientes para o gráfico.
                </div>
              ) : (
                <ChartContainer config={statusChartConfig} className="mx-auto h-64 w-full max-w-[360px]">
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
                      data={pieStatusData}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={4}
                      strokeWidth={4}
                    >
                      {pieStatusData.map((entry) => (
                        <Cell key={entry.key} fill={`var(--color-${entry.key})`} />
                      ))}
                      <Label
                        content={({ viewBox }) => {
                          if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null

                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={viewBox.cx} y={viewBox.cy} className="fill-slate-50 text-2xl font-bold">
                                {totalPedidos}
                              </tspan>
                              <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 18} className="fill-slate-400 text-xs">
                                pedidos
                              </tspan>
                            </text>
                          )
                        }}
                      />
                    </Pie>
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* barras por tipo de produto */}
          <Card className="border-blue-900 bg-[#050816] text-slate-50 shadow-md overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-slate-100 flex items-center gap-1">
                <BarChart3 className="h-4 w-4 text-yellow-400" />
                Quantidade por tipo de produto
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-6 pt-0">
              {pedidos.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-xs text-slate-500">
                  Sem dados suficientes para o gráfico.
                </div>
              ) : (
                <ChartContainer config={produtoChartConfig} className="h-64 w-full">
                  <BarChart data={barProdutoData} margin={{ top: 24, left: 16, right: 16, bottom: 8 }}>
                    <CartesianGrid vertical={false} stroke="#111827" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      stroke="#9ca3af"
                      fontSize={11}
                    />
                    <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          hideLabel
                          className="bg-slate-900/95 border-slate-700 text-slate-100 shadow-xl"
                        />
                      }
                    />
                    <Bar dataKey="quantidade" radius={8}>
                      {barProdutoData.map((entry) => (
                        <Cell key={entry.key} fill={entry.fill} />
                      ))}
                      <LabelList dataKey="quantidade" position="top" className="fill-slate-100 text-xs" />
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
                placeholder="Buscar por nome, telefone, e-mail ou TXID"
                className="pl-8 border-slate-700 bg-slate-950 text-slate-50 placeholder:text-slate-500 focus-visible:ring-sky-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { id: "TODOS", label: "Todos" },
                { id: "AGUARDANDO_PAGAMENTO", label: "Aguard. pag." },
                { id: "PAGO_METADE", label: "Pago metade" },
                { id: "PAGO", label: "Pago" },
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
                  onClick={() => setStatusFilter(opt.id as typeof statusFilter)}
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
            <CardTitle className="text-slate-50">Pedidos (carrinho + Mercado Pago)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-800 text-xs text-slate-400">
                <tr>
                  <th className="py-2 pr-4 text-left">Data</th>
                  <th className="py-2 pr-4 text-left">Cliente</th>
                  <th className="py-2 pr-4 text-left">Resumo dos itens</th>
                  <th className="py-2 pr-4 text-left">Status</th>
                  <th className="py-2 pr-4 text-right">Total</th>
                  <th className="py-2 pr-4 text-right">Líquido</th>
                  <th className="py-2 pr-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Carregando…
                    </td>
                  </tr>
                ) : filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Nenhum pedido encontrado.
                    </td>
                  </tr>
                ) : (
                  filtrados.map((p) => {
                    const vTotal =
                      typeof p.valorTotal === "string" ? Number.parseFloat(p.valorTotal) : Number(p.valorTotal || 0)

                    const itens = Array.isArray(p.itemsJson) ? (p.itemsJson as ItemCarrinho[]) : []

                    const resumo =
                      itens.length === 0
                        ? "-"
                        : itens.map((i) => `${i.quantity || 1}x ${i.label ?? "Produto"}`).join(" • ")

                    let valorLiquidoPedido = 0
                    for (const item of itens) {
                      const qty = item.quantity || 1
                      if (item.kind === "UNIFORME") {
                        if (item.tipoPedido === "KIT") {
                          valorLiquidoPedido += precosProdutos.KIT_UNIFORME * qty
                        } else {
                          valorLiquidoPedido += precosProdutos.CAMISA * qty
                        }
                      } else if (item.kind === "CANECA") {
                        if (item.tipoProduto === "CANECA") {
                          valorLiquidoPedido += precosProdutos.CANECA * qty
                        } else if (item.tipoProduto === "TIRANTE") {
                          valorLiquidoPedido += precosProdutos.TIRANTE * qty
                        } else {
                          valorLiquidoPedido += precosProdutos.KIT_CANECA * qty
                        }
                      }
                    }

                    return (
                      <tr key={p.id} className="border-b border-slate-800 last:border-0">
                        <td className="py-3 pr-4 text-xs text-slate-400">
                          {new Date(p.createdAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="font-medium text-slate-50">{p.nome}</div>
                          <div className="text-[10px] text-slate-500">TXID {p.txid}</div>
                        </td>
                        <td className="py-3 pr-4 text-xs text-slate-100">{resumo}</td>
                        <td className="py-3 pr-4">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="py-3 pr-4 text-right font-medium text-sky-400">{currency(vTotal)}</td>
                        <td className="py-3 pr-4 text-right font-medium text-sky-400">
                          {currency(valorLiquidoPedido)}
                        </td>
                        <td className="py-3 pl-4 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-sky-400 hover:bg-slate-800"
                            title="Ver detalhes"
                            onClick={() => setSelected(p)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* DIALOG DETALHES */}
        <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
          <DialogContent className="w-full max-w-lg max-h-[80vh] overflow-y-auto border-slate-800 bg-slate-900 text-slate-50">
            <DialogHeader>
              <DialogTitle className="text-slate-50">Detalhes do pedido</DialogTitle>
            </DialogHeader>

            {selected && (
              <div className="space-y-4 text-sm">
                <div className="space-y-1">
                  <p>
                    <span className="font-semibold">Cliente:</span> {selected.nome}
                  </p>
                  <p>
                    <span className="font-semibold">Telefone:</span> {selected.telefone}
                  </p>
                  <p>
                    <span className="font-semibold">E-mail:</span> {selected.email}
                  </p>
                  <p>
                    <span className="font-semibold">TXID:</span> {selected.txid}
                  </p>
                  <p>
                    <span className="font-semibold">Status:</span> {selected.status}
                  </p>
                  <p>
                    <span className="font-semibold">Valor total:</span>{" "}
                    {currency(
                      typeof selected.valorTotal === "string"
                        ? Number.parseFloat(selected.valorTotal)
                        : Number(selected.valorTotal || 0),
                    )}
                  </p>
                  {selected.valorPago != null && (
                    <p>
                      <span className="font-semibold">Valor pago:</span>{" "}
                      {currency(
                        typeof selected.valorPago === "string"
                          ? Number.parseFloat(selected.valorPago)
                          : Number(selected.valorPago || 0),
                      )}
                    </p>
                  )}
                </div>

                <Separator className="bg-slate-800" />

                <div className="space-y-2">
                  <p className="font-semibold">Itens do carrinho</p>
                  <div className="space-y-1 text-xs">
                    {Array.isArray(selected.itemsJson) &&
                      (selected.itemsJson as ItemCarrinho[]).map((i, idx) => (
                        <div key={idx} className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1">
                          <div className="font-semibold">
                            {i.quantity || 1}x {i.label}
                          </div>
                          <div>
                            Unitário: {currency(i.unitPrice || 0)} • Subtotal:{" "}
                            {currency((i.unitPrice || 0) * (i.quantity || 1))}
                          </div>
                          {i.kind === "UNIFORME" && (
                            <div className="mt-1 text-[11px] text-slate-300">
                              {i.tipoPedido === "KIT" ? "Kit uniforme" : "Camisa"}
                              {i.modelo && ` • Modelo: ${i.modelo}`}
                              {i.tamanho && ` • Tam: ${i.tamanho}`}
                              {i.nomeCamisa && ` • Nome: ${i.nomeCamisa} #${i.numeroCamisa}`}
                            </div>
                          )}
                          {i.kind === "CANECA" && (
                            <div className="mt-1 text-[11px] text-slate-300">
                              {i.tipoProduto === "CANECA"
                                ? "Caneca 850 mL"
                                : i.tipoProduto === "TIRANTE"
                                  ? "Tirante"
                                  : "Kit caneca + tirante"}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}