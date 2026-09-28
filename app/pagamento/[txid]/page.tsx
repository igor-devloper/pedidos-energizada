"use client";

import Script from "next/script";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { calcularTotalComTaxas, type MetodoPagamento, type Parcelas } from "@/lib/calc-tax";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY || "";

declare global {
  interface Window { MercadoPago?: any; }
}

export default function PagamentoPage() {
  const { txid } = useParams<{ txid: string }>();
  const router = useRouter();
  const controller = useRef<any>(null);
  const [pedido, setPedido] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sdkReady, setSdkReady] = useState(false);
  const [brickReady, setBrickReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!txid) return;
    fetch(`/api/pedidos-carrinho/${txid}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Pedido não encontrado.");
        return r.json();
      })
      .then(setPedido)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [txid]);

  const subtotal = useMemo(() => {
    const itens = Array.isArray(pedido?.itemsJson) ? pedido.itemsJson : [];
    return itens.reduce((sum: number, item: any) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0), 0);
  }, [pedido]);

  const taxaServico = Math.max(0, Number(pedido?.valorTotal || 0) - subtotal);

  // O pedido atual ainda não possui metodoPagamento/parcelas em colunas próprias.
  // Por isso recuperamos exatamente a escolha feita no carrinho comparando
  // subtotal + regra de taxa com o valorTotal persistido no pedido.
  const pagamentoEscolhido = useMemo(() => {
    if (!pedido || subtotal <= 0) return null;

    const totalPedido = Number(pedido.valorTotal || 0);
    const quaseIgual = (a: number, b: number) => Math.abs(a - b) < 0.011;

    const pix = calcularTotalComTaxas(subtotal, "pix", 1);
    if (quaseIgual(pix.totalConsumidor, totalPedido)) {
      return { metodo: "pix" as MetodoPagamento, parcelas: 1 as Parcelas, label: "Pix" };
    }

    const boleto = calcularTotalComTaxas(subtotal, "boleto", 1);
    if (quaseIgual(boleto.totalConsumidor, totalPedido)) {
      return { metodo: "boleto" as MetodoPagamento, parcelas: 1 as Parcelas, label: "Boleto" };
    }

    for (let p = 1; p <= 12; p++) {
      const parcelas = p as Parcelas;
      const credito = calcularTotalComTaxas(subtotal, "credito", parcelas);
      if (quaseIgual(credito.totalConsumidor, totalPedido)) {
        return { metodo: "credito" as MetodoPagamento, parcelas, label: `Cartão de crédito${parcelas > 1 ? ` em até ${parcelas}x` : ""}` };
      }
    }

    return null;
  }, [pedido, subtotal]);

  useEffect(() => {
    if (!sdkReady || !pedido || !pagamentoEscolhido || !PUBLIC_KEY || !window.MercadoPago) return;
    let active = true;

    const mount = async () => {
      try {
        const mp = new window.MercadoPago(PUBLIC_KEY, { locale: "pt-BR" });
        const bricks = mp.bricks();
        controller.current = await bricks.create("payment", "paymentBrick_container", {
          initialization: {
            amount: Number(pedido.valorTotal),
            payer: { email: pedido.email || "" },
          },
          customization: {
            visual: { style: { theme: "default" } },
            paymentMethods:
              pagamentoEscolhido?.metodo === "pix"
                ? { bankTransfer: ["pix"] }
                : pagamentoEscolhido?.metodo === "boleto"
                  ? { ticket: ["bolbradesco"] }
                  : pagamentoEscolhido?.metodo === "credito"
                    ? {
                        creditCard: "all",
                        maxInstallments: pagamentoEscolhido.parcelas,
                      }
                    : {},
          },
          callbacks: {
            onReady: () => active && setBrickReady(true),
            onError: (e: any) => {
              console.error("[Mercado Pago Brick]", e);
              active && setError("Não foi possível carregar o checkout. Atualize a página e tente novamente.");
            },
            onSubmit: async ({ formData }: any) => {
              const response = await fetch("/api/checkout/payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ txid, formData }),
              });
              const result = await response.json();
              if (!response.ok) {
                toast.error(result.error || "Pagamento não processado.");
                throw new Error(result.error || "Pagamento não processado.");
              }
              if (result.status === "approved") {
                toast.success("Pagamento aprovado!");
                router.push(`/final?status=success&txid=${txid}`);
              } else if (result.status === "rejected") {
                toast.error("Pagamento recusado. Revise os dados ou escolha outra forma de pagamento.");
              } else {
                router.push(`/final?status=pending&txid=${txid}`);
              }
              return result;
            },
          },
        });
      } catch (e) {
        console.error(e);
        if (active) setError("Não foi possível iniciar o checkout transparente.");
      }
    };

    mount();
    return () => {
      active = false;
      controller.current?.unmount?.();
      controller.current = null;
    };
  }, [sdkReady, pedido, pagamentoEscolhido, router, txid]);

  if (loading) return <main className="min-h-screen bg-slate-50 grid place-items-center"><Loader2 className="h-7 w-7 animate-spin text-blue-800" /></main>;
  if (error && !pedido) return <main className="min-h-screen bg-slate-50 grid place-items-center px-5"><p className="rounded-2xl bg-white p-6 text-red-600 shadow-sm">{error}</p></main>;

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-4 py-6 md:py-10">
      <Script src="https://sdk.mercadopago.com/js/v2" strategy="afterInteractive" onLoad={() => setSdkReady(true)} />
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex items-center justify-between gap-4">
          <button onClick={() => router.push("/")} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-900"><ArrowLeft className="h-4 w-4" /> Loja</button>
          <Image src="/energizada-logo.png" alt="Energizada" width={150} height={56} className="h-12 w-auto object-contain" />
          <div className="hidden items-center gap-2 text-xs font-semibold text-emerald-700 sm:flex"><LockKeyhole className="h-4 w-4" /> Ambiente seguro</div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-8">
            <div className="mb-6">
              <span className="text-xs font-bold uppercase tracking-[.2em] text-blue-700">Pagamento</span>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Finalize sem sair da Energizada</h1>
              <p className="mt-2 text-sm text-slate-500">
                {pagamentoEscolhido
                  ? <>Você escolheu <strong className="font-semibold text-slate-700">{pagamentoEscolhido.label}</strong> no carrinho. Conclua o pagamento abaixo.</>
                  : "Conclua o pagamento abaixo."}
              </p>
            </div>

            {!PUBLIC_KEY ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Configure <strong>NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY</strong> no ambiente da aplicação.</div>
            ) : (
              <>
                {!pagamentoEscolhido && !error && (
                  <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    Não foi possível identificar a forma de pagamento escolhida neste pedido. Volte ao carrinho e tente novamente.
                  </div>
                )}
                {pagamentoEscolhido && !brickReady && !error && <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando pagamento via {pagamentoEscolhido.label}…</div>}
                {error && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
                <div id="paymentBrick_container" />
              </>
            )}
          </section>

          <aside className="rounded-[28px] bg-[#071a52] p-6 text-white shadow-xl lg:sticky lg:top-6">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-yellow-300">Resumo do pedido</p>
            <h2 className="mt-2 text-lg font-extrabold">Pedido #{txid?.slice(0, 8).toUpperCase()}</h2>
            <p className="mt-1 text-xs text-blue-200">{pedido?.nome}</p>

            <div className="my-5 h-px bg-white/10" />
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4 text-blue-100"><span>Produtos</span><span>R$ {subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between gap-4 text-blue-100"><span>Taxa de serviço</span><span>R$ {taxaServico.toFixed(2)}</span></div>
              <div className="h-px bg-white/10" />
              <div className="flex items-end justify-between gap-4"><span className="font-bold">Total</span><span className="text-2xl font-black text-yellow-300">R$ {Number(pedido?.valorTotal || 0).toFixed(2)}</span></div>
            </div>

            <div className="mt-6 space-y-3 rounded-2xl bg-white/7 p-4 text-xs text-blue-100">
              <p className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-yellow-300" /> Pagamento processado com segurança pelo Mercado Pago.</p>
              <p className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-yellow-300" /> O valor acima já inclui a taxa de serviço.</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
