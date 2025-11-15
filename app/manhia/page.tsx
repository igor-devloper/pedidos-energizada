// app/admin/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  XCircle,
  Percent,
  TrendingUp,
  Coins,
  ShoppingBag,
  BanknoteX,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";

type EncomendaItem = {
  id: string;
  tipo: string;
  quantidade: number;
};

type Encomenda = {
  id: string;
  txid: string;
  nome: string;
  telefone: string;
  email: string;
  observacoes: string | null;
  status: string;
  totalItens: number;
  valorTotal: string | number;
  valorPago?: string | number | null;
  comprovanteBase64?: string | null;
  createdAt: string;
  itens: EncomendaItem[];
};

const UNIT_PRICE = 0.9;

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

const humanTipo = (t: string) => {
  switch (t) {
    case "bolinho_queijo":
      return "Bolinho de queijo";
    case "empada_frango":
      return "Empada de frango";
    case "empada_doce":
      return "Empada doce";
    case "coxinha":
      return "Coxinha";
    case "pastel_acucarado_carne":
      return "Pastel açucarado de carne";
    case "pastel_forno_frango":
      return "Pastel de forno de frango";
    case "pastel_frito_carne":
      return "Pastel frito de carne";
    default:
      return t;
  }
};

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
      const res = await fetch("/api/encomendas", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as Encomenda[];
      setEncomendas(data);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível carregar as encomendas");
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

  // ===== KPIs / MÉTRICAS =====
  const {
    totalPedidos,
    totalPedidosPagos,
    totalPedidosNaoPagos,
    totalItens,
    totalItensPagos,
    totalValorEncomendas,
    totalRecebido,
    receitaAReceber
  } = useMemo(() => {
    const stats = {
      totalPedidos: encomendas.length,
      totalPedidosPagos: 0,
      totalPedidosNaoPagos: 0,
      totalItens: 0,
      totalItensPagos: 0,
      totalValorEncomendas: 0,
      totalRecebido: 0,
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

      const isPago =
        e.status === "PAGO_METADE" || e.status === "CONFIRMADO";
      const isNaoPago =
        e.status === "AGUARDANDO_PAGAMENTO" ||
        e.status === "AGUARDANDO_VALIDACAO";

      stats.totalItens += e.totalItens || 0;
      stats.totalValorEncomendas += valorTotal;

      if (isPago) {
        stats.totalPedidosPagos += 1;
        stats.totalItensPagos += e.totalItens || 0;

        let recebido = 0;
        if (e.status === "PAGO_METADE") {
          if (valorPagoRaw != null && !Number.isNaN(valorPagoRaw)) {
            recebido = valorPagoRaw;
          } else {
            recebido = valorTotal / 2;
          }
        } else {
          // CONFIRMADO
          if (valorPagoRaw != null && !Number.isNaN(valorPagoRaw)) {
            recebido = valorPagoRaw;
          } else {
            recebido = valorTotal;
          }
        }
        stats.totalRecebido += recebido;
      } else if (isNaoPago) {
        stats.totalPedidosNaoPagos += 1;
      }
    }
    const receitaAReceberRaw =
      stats.totalValorEncomendas - stats.totalRecebido;
    return {
      ...stats,
      receitaAReceber: receitaAReceberRaw > 0 ? receitaAReceberRaw : 0,
    };
  }, [encomendas]);

  const confirmarEncomenda = async (
    enc: Encomenda,
    tipo: "METADE" | "TOTAL"
  ) => {
    try {
      setActing(enc.txid);
      const res = await fetch("/api/encomendas/admin/confirmar", {
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
          ? "Encomenda confirmada (pago metade)."
          : "Encomenda confirmada (pago total)."
      );
      fetchEncomendas();
    } catch {
      toast.error("Falha ao confirmar encomenda.");
    } finally {
      setActing(null);
    }
  };

  const cancelarEncomenda = async (enc: Encomenda) => {
    try {
      setActing(enc.txid);
      const res = await fetch("/api/encomendas/admin/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txid: enc.txid,
          aprovado: false,
          motivo: "Pagamento divergente.",
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Encomenda cancelada.");
      fetchEncomendas();
    } catch {
      toast.error("Falha ao cancelar encomenda.");
    } finally {
      setActing(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 via-pink-50 to-white px-4 py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        {/* Título */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-pink-700">
              Painel de Encomendas — Vizinha Salgateria
            </h1>
            <p className="text-sm text-pink-500">
              Acompanhe pedidos, pagamentos e confirme as encomendas.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={fetchEncomendas}
            className="border-pink-200 text-pink-700 hover:bg-pink-50"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {/* KPIs estilo "cards" */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Receita recebida */}
          <Card className="border-pink-100 bg-white/90 shadow-sm">
            <CardHeader className="pb-1 flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Receita total recebida
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-slate-900">
                {currency(totalRecebido)}
              </p>
              <p className="text-[11px] text-emerald-600">
                Somente encomendas pagas (total ou parcial)
              </p>
            </CardContent>
          </Card>

          {/* Valor total das encomendas */}
          <Card className="border-pink-100 bg-white/90 shadow-sm">
            <CardHeader className="pb-1 flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Coins className="h-4 w-4 text-pink-600" />
                Valor total das encomendas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-pink-700">
                {currency(totalValorEncomendas)}
              </p>
              <p className="text-[11px] text-slate-500">
                Soma de todas as encomendas registradas
              </p>
            </CardContent>
          </Card>

          {/* Pedidos pagos */}
          <Card className="border-pink-100 bg-white/90 shadow-sm">
            <CardHeader className="pb-1 flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <ShoppingBag className="h-4 w-4 text-emerald-500" />
                Encomendas pagas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-slate-900">
                {totalPedidosPagos}
              </p>
              <p className="text-[11px] text-emerald-600">
                De {totalPedidos} encomendas no total
              </p>
            </CardContent>
          </Card>

          {/* Pedidos não pagos */}
          <Card className="border-pink-100 bg-white/90 shadow-sm">
            <CardHeader className="pb-1 flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <BanknoteX className="h-4 w-4 text-red-500" />
                Encomendas não pagas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-slate-900">
                {totalPedidosNaoPagos}
              </p>
              <p className="text-[11px] text-red-500">
                Aguardando pagamento/validação
              </p>
            </CardContent>
          </Card>

          {/* Total de itens pagos */}
          <Card className="border-pink-100 bg-white/90 shadow-sm">
            <CardHeader className="pb-1 flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <UtensilsCrossed className="h-4 w-4 text-emerald-500" />
                Total de itens pagos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-slate-900">
                {totalItensPagos}
              </p>
              <p className="text-[11px] text-slate-500">
                De {totalItens} itens encomendados no total
              </p>
            </CardContent>
          </Card>
          <Card className="border-pink-100 bg-white/90 shadow-sm">
            <CardHeader className="pb-1 flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Wallet className="h-4 w-4 text-amber-500" />
                Receita a receber
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-slate-900">
                {currency(receitaAReceber)}
              </p>
              <p className="text-[11px] text-amber-600">
                Total das encomendas ainda não recebidas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="border-pink-100 bg-white/95 shadow-sm">
          <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por nome, telefone ou e-mail"
                className="pl-8 border-pink-100 bg-white focus-visible:ring-pink-400"
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
                      ? "bg-pink-600 text-white hover:bg-pink-700"
                      : "border-pink-200 text-pink-700 hover:bg-pink-50"
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

        {/* Tabela */}
        <Card className="border-pink-100 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800">Encomendas</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-pink-100 text-xs text-slate-500">
                <tr>
                  <th className="py-2 pr-4 text-left">Data</th>
                  <th className="py-2 pr-4 text-left">Cliente</th>
                  <th className="py-2 pr-4 text-left">Contato</th>
                  <th className="py-2 pr-4 text-left">Status</th>
                  <th className="py-2 pr-4 text-left">Itens</th>
                  <th className="py-2 pr-4 text-right">Valor</th>
                  <th className="py-2 pr-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-slate-400"
                    >
                      Carregando…
                    </td>
                  </tr>
                ) : filtradas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-slate-400"
                    >
                      Nenhuma encomenda encontrada.
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
                        className="border-b border-pink-50 last:border-0"
                      >
                        <td className="py-3 pr-4 text-xs text-slate-500">
                          {new Date(enc.createdAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="font-medium text-slate-900">
                            {enc.nome}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            TXID {enc.txid}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-xs text-slate-500">
                          <div>{enc.telefone}</div>
                          <div>{enc.email}</div>
                        </td>
                        <td className="py-3 pr-4">
                          <StatusBadge status={enc.status} />
                        </td>
                        <td className="py-3 pr-4 text-slate-800">
                          {enc.totalItens}
                        </td>
                        <td className="py-3 pr-4 text-right font-medium text-pink-700">
                          {currency(valor)}
                        </td>
                        <td className="py-3 pl-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-pink-600 hover:bg-pink-50"
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
                                    <Percent className="h-4 w-4" />
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
                                    <XCircle className="h-4 w-4" />
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

        {/* Dialog detalhes */}
        {/* Dialog detalhes */}
        <Dialog
          open={!!selected}
          onOpenChange={(open) => !open && setSelected(null)}
        >
          <DialogContent
            className="w-full max-w-lg max-h-[80vh] overflow-y-auto border-pink-100 bg-white"
          >
            <DialogHeader>
              <DialogTitle className="text-pink-700">
                Detalhes da encomenda
              </DialogTitle>
            </DialogHeader>

            {selected && (
              <div className="space-y-4">
                {/* Dados principais */}
                <div className="space-y-2 text-sm text-slate-700">
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
                  {selected.observacoes && (
                    <p>
                      <span className="font-semibold">Observações:</span>{" "}
                      {selected.observacoes}
                    </p>
                  )}
                  <p>
                    <span className="font-semibold">Total itens:</span>{" "}
                    {selected.totalItens}
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
                      <span className="font-semibold">
                        Valor pago declarado:
                      </span>{" "}
                      {currency(
                        typeof selected.valorPago === "string"
                          ? parseFloat(selected.valorPago)
                          : Number(selected.valorPago || 0)
                      )}
                    </p>
                  )}
                </div>

                <Separator className="bg-pink-100" />

                {/* Itens */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-800">
                    Itens
                  </p>
                  <ul className="space-y-1 text-sm text-slate-700">
                    {selected.itens.map((i) => (
                      <li
                        key={i.id}
                        className="flex items-center justify-between"
                      >
                        <span>{humanTipo(i.tipo)}</span>
                        <span className="font-medium">
                          {i.quantidade} un
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Comprovante de pagamento */}
                {selected.comprovanteBase64 && (
                  <>
                    <Separator className="bg-pink-100" />
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-800">
                        Comprovante de pagamento
                      </p>
                      <div className="rounded-md border border-pink-100 bg-pink-50/40 p-2">
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
