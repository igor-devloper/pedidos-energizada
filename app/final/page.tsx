"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, Clock3, Loader2, ShoppingBag, XCircle, Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CartItem } from "@/lib/cart-types";

type PedidoCarrinho = {
  txid: string;
  nome: string;
  email?: string;
  telefone?: string;
  valorTotal: number | string;
  valorPago?: number | string | null;
  status: string;
  itemsJson: CartItem[];
};

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function FinalContent() {
  const router = useRouter();
  const params = useSearchParams();
  const txid = (params.get("txid") || "").trim();
  const [pedido, setPedido] = useState<PedidoCarrinho | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!txid) { setErro("Pedido não informado."); setLoading(false); return; }
    fetch(`/api/pedidos-carrinho/${txid}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Pedido não encontrado.");
        return res.json();
      })
      .then(setPedido)
      .catch((e) => setErro(e.message || "Não foi possível carregar o pedido."))
      .finally(() => setLoading(false));
  }, [txid]);

  const subtotal = useMemo(() => {
    const itens = Array.isArray(pedido?.itemsJson) ? pedido!.itemsJson : [];
    return itens.reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0), 0);
  }, [pedido]);

  const total = Number(pedido?.valorTotal || 0);
  const taxa = Math.max(0, total - subtotal);
  const pago = pedido?.status === "PAGO" || pedido?.status === "PAGO_METADE";
  const cancelado = pedido?.status === "CANCELADO";

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#f6f7fb]"><Loader2 className="h-7 w-7 animate-spin text-blue-800" /></main>;

  if (erro || !pedido) return (
    <main className="grid min-h-screen place-items-center bg-[#f6f7fb] px-4">
      <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-7 text-center shadow-sm">
        <XCircle className="mx-auto h-10 w-10 text-red-500" />
        <h1 className="mt-4 text-xl font-extrabold text-slate-950">Não encontramos o pedido</h1>
        <p className="mt-2 text-sm text-slate-500">{erro || "Confira o link e tente novamente."}</p>
        <Button onClick={() => router.push("/")} className="mt-6 w-full bg-blue-800 hover:bg-blue-900">Voltar para a loja</Button>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-4 py-6 md:py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <button onClick={() => router.push("/")} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-900"><ArrowLeft className="h-4 w-4" /> Loja</button>
          <Image src="/energizada-logo.png" alt="Energizada" width={150} height={56} className="h-12 w-auto object-contain" />
          <div className="w-12" />
        </header>

        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
          <div className="p-6 text-center md:p-9">
            {pago ? <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" /> : cancelado ? <XCircle className="mx-auto h-14 w-14 text-red-500" /> : <Clock3 className="mx-auto h-14 w-14 text-amber-500" />}
            <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-blue-700">Pedido #{pedido.txid.slice(0, 8).toUpperCase()}</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
              {pago ? "Pagamento confirmado!" : cancelado ? "Pagamento não aprovado" : "Pagamento aguardando confirmação"}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
              {pago
                ? `Tudo certo, ${pedido.nome}. Seu pagamento foi confirmado e o pedido está registrado.`
                : cancelado
                  ? "O pagamento não foi concluído. Você pode voltar ao pedido e realizar uma nova tentativa."
                  : "Seu pedido existe, mas o pagamento ainda não foi confirmado. Pix e boleto podem levar algum tempo para atualizar após o pagamento."}
            </p>
          </div>

          <div className="border-t border-slate-100 p-6 md:p-8">
            <div className="mb-5 flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-blue-800" /><h2 className="font-extrabold text-slate-900">Resumo do pedido</h2></div>
            <div className="space-y-3">
              {(Array.isArray(pedido.itemsJson) ? pedido.itemsJson : []).map((item, index) => (
                <div key={item.id || index} className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 p-4">
                  <div><p className="text-sm font-semibold text-slate-900">{item.label}</p><p className="mt-1 text-xs text-slate-500">Quantidade: {item.quantity}</p></div>
                  <p className="whitespace-nowrap text-sm font-bold text-slate-900">{money(Number(item.unitPrice) * Number(item.quantity))}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-2 border-t border-slate-100 pt-5 text-sm">
              <div className="flex justify-between text-slate-500"><span>Produtos</span><span>{money(subtotal)}</span></div>
              <div className="flex justify-between text-slate-500"><span>Taxa de serviço</span><span>{money(taxa)}</span></div>
              <div className="flex justify-between pt-2 text-lg font-black text-slate-950"><span>Total</span><span>{money(total)}</span></div>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              {!pago && !cancelado && <Button onClick={() => router.push(`/pagamento/${pedido.txid}`)} className="flex-1 bg-blue-800 hover:bg-blue-900">Voltar ao pagamento</Button>}
              {cancelado && <Button onClick={() => router.push(`/pagamento/${pedido.txid}`)} className="flex-1 bg-blue-800 hover:bg-blue-900">Tentar pagar novamente</Button>}
              <Button variant="outline" onClick={() => window.print()} className="flex-1"><Printer className="mr-2 h-4 w-4" />Imprimir pedido</Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function FinalPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#f6f7fb]" />}><FinalContent /></Suspense>;
}
