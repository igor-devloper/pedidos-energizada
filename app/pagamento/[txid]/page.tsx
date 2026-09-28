"use client";

import Script from "next/script";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  LockKeyhole,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { calcularTotalComTaxas, type MetodoPagamento, type Parcelas } from "@/lib/calc-tax";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY || "";

declare global {
  interface Window {
    MercadoPago?: any;
  }
}

type ResultadoPagamento = {
  id?: string | number;
  status?: string;
  statusDetail?: string;
  paymentMethodId?: string;
  paymentTypeId?: string;
  pointOfInteraction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
  transactionDetails?: {
    external_resource_url?: string;
  };
};

export default function PagamentoPage() {
  const { txid } = useParams<{ txid: string }>();
  const router = useRouter();
  const controller = useRef<any>(null);

  const [pedido, setPedido] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sdkReady, setSdkReady] = useState(false);
  const [brickReady, setBrickReady] = useState(false);
  const [error, setError] = useState("");
  const [resultadoPagamento, setResultadoPagamento] = useState<ResultadoPagamento | null>(null);
  const [copiado, setCopiado] = useState(false);

  const carregarPedido = async () => {
    const response = await fetch(`/api/pedidos-carrinho/${txid}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Pedido não encontrado.");
    }

    return response.json();
  };

  useEffect(() => {
    if (!txid) return;

    carregarPedido()
      .then(setPedido)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [txid]);

  const subtotal = useMemo(() => {
    const itens = Array.isArray(pedido?.itemsJson) ? pedido.itemsJson : [];

    return itens.reduce(
      (sum: number, item: any) =>
        sum + Number(item.unitPrice || 0) * Number(item.quantity || 0),
      0,
    );
  }, [pedido]);

  const taxaServico = Math.max(
    0,
    Number(pedido?.valorTotal || 0) - subtotal,
  );

  const pagamentoEscolhido = useMemo(() => {
    if (!pedido || subtotal <= 0) return null;

    const totalPedido = Number(pedido.valorTotal || 0);
    const quaseIgual = (a: number, b: number) =>
      Math.abs(a - b) < 0.011;

    const pix = calcularTotalComTaxas(subtotal, "pix", 1);

    if (quaseIgual(pix.totalConsumidor, totalPedido)) {
      return {
        metodo: "pix" as MetodoPagamento,
        parcelas: 1 as Parcelas,
        label: "Pix",
      };
    }

    const boleto = calcularTotalComTaxas(subtotal, "boleto", 1);

    if (quaseIgual(boleto.totalConsumidor, totalPedido)) {
      return {
        metodo: "boleto" as MetodoPagamento,
        parcelas: 1 as Parcelas,
        label: "Boleto",
      };
    }

    for (let p = 1; p <= 12; p++) {
      const parcelas = p as Parcelas;
      const credito = calcularTotalComTaxas(
        subtotal,
        "credito",
        parcelas,
      );

      if (quaseIgual(credito.totalConsumidor, totalPedido)) {
        return {
          metodo: "credito" as MetodoPagamento,
          parcelas,
          label: `Cartão de crédito${
            parcelas > 1 ? ` em até ${parcelas}x` : ""
          }`,
        };
      }
    }

    return null;
  }, [pedido, subtotal]);

  const pixData =
    resultadoPagamento?.pointOfInteraction?.transaction_data;

  const codigoPix = pixData?.qr_code || "";
  const qrCodeBase64 = pixData?.qr_code_base64 || "";

  const boletoUrl =
    pixData?.ticket_url ||
    resultadoPagamento?.transactionDetails?.external_resource_url ||
    "";

  const pagamentoPendente =
    resultadoPagamento &&
    resultadoPagamento.status !== "approved" &&
    resultadoPagamento.status !== "rejected" &&
    resultadoPagamento.status !== "cancelled";

  useEffect(() => {
    if (!pagamentoPendente || !txid) return;

    const interval = window.setInterval(async () => {
      try {
        const atualizado = await carregarPedido();
        setPedido(atualizado);

        if (atualizado?.status === "PAGO") {
          window.clearInterval(interval);
          toast.success("Pagamento confirmado!");
          router.replace(`/final?txid=${txid}`);
        }
      } catch (e) {
        console.error("[Consulta status do pedido]", e);
      }
    }, 5000);

    return () => window.clearInterval(interval);
  }, [pagamentoPendente, router, txid]);

  useEffect(() => {
    if (
      !sdkReady ||
      !pedido ||
      !pagamentoEscolhido ||
      !PUBLIC_KEY ||
      !window.MercadoPago ||
      resultadoPagamento
    ) {
      return;
    }

    let active = true;

    const mount = async () => {
      try {
        const mp = new window.MercadoPago(PUBLIC_KEY, {
          locale: "pt-BR",
        });

        const bricks = mp.bricks();

        controller.current = await bricks.create(
          "payment",
          "paymentBrick_container",
          {
            initialization: {
              amount: Number(pedido.valorTotal),
              payer: {
                email: pedido.email || "",
              },
            },

            customization: {
              visual: {
                style: {
                  theme: "default",
                },
              },

              paymentMethods:
                pagamentoEscolhido.metodo === "pix"
                  ? {
                      bankTransfer: ["pix"],
                    }
                  : pagamentoEscolhido.metodo === "boleto"
                    ? {
                        ticket: ["bolbradesco"],
                      }
                    : pagamentoEscolhido.metodo === "credito"
                      ? {
                          creditCard: "all",
                          maxInstallments:
                            pagamentoEscolhido.parcelas,
                        }
                      : {},
            },

            callbacks: {
              onReady: () => {
                if (active) setBrickReady(true);
              },

              onError: (e: any) => {
                console.error("[Mercado Pago Brick]", e);

                if (active) {
                  setError(
                    "Não foi possível carregar o checkout. Atualize a página e tente novamente.",
                  );
                }
              },

              onSubmit: async ({ formData }: any) => {
                const response = await fetch(
                  "/api/checkout/payment",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      txid,
                      formData,
                    }),
                  },
                );

                const result: ResultadoPagamento =
                  await response.json();

                if (!response.ok) {
                  const mensagem =
                    (result as any).error ||
                    "Pagamento não processado.";

                  toast.error(mensagem);
                  throw new Error(mensagem);
                }

                if (result.status === "approved") {
                  toast.success("Pagamento aprovado!");
                  router.replace(`/final?txid=${txid}`);
                  return result;
                }

                if (
                  result.status === "rejected" ||
                  result.status === "cancelled"
                ) {
                  toast.error(
                    "Pagamento não aprovado. Revise os dados e tente novamente.",
                  );

                  return result;
                }

                // O Payment Brick não renderiza automaticamente o QR Code
                // retornado pela nossa própria API. Guardamos a resposta
                // para mostrar Pix/boleto diretamente nesta página.
                setResultadoPagamento(result);

                if (pagamentoEscolhido.metodo === "pix") {
                  toast.success(
                    "Pix gerado! Escaneie o QR Code ou use o código Copia e Cola.",
                  );
                } else if (
                  pagamentoEscolhido.metodo === "boleto"
                ) {
                  toast.success(
                    "Boleto gerado! Abra o boleto para concluir o pagamento.",
                  );
                } else {
                  toast.info(
                    "Pagamento em processamento. Aguarde a confirmação.",
                  );
                }

                return result;
              },
            },
          },
        );
      } catch (e) {
        console.error(e);

        if (active) {
          setError(
            "Não foi possível iniciar o checkout transparente.",
          );
        }
      }
    };

    mount();

    return () => {
      active = false;
      controller.current?.unmount?.();
      controller.current = null;
    };
  }, [
    sdkReady,
    pedido,
    pagamentoEscolhido,
    resultadoPagamento,
    router,
    txid,
  ]);

  const copiarPix = async () => {
    if (!codigoPix) return;

    try {
      await navigator.clipboard.writeText(codigoPix);
      setCopiado(true);
      toast.success("Código Pix copiado!");

      window.setTimeout(() => {
        setCopiado(false);
      }, 2500);
    } catch {
      toast.error(
        "Não foi possível copiar automaticamente. Selecione o código abaixo.",
      );
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 grid place-items-center">
        <Loader2 className="h-7 w-7 animate-spin text-blue-800" />
      </main>
    );
  }

  if (error && !pedido) {
    return (
      <main className="min-h-screen bg-slate-50 grid place-items-center px-5">
        <p className="rounded-2xl bg-white p-6 text-red-600 shadow-sm">
          {error}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-4 py-6 md:py-10">
      <Script
        src="https://sdk.mercadopago.com/js/v2"
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
      />

      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex items-center justify-between gap-4">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Loja
          </button>

          <Image
            src="/energizada-logo.png"
            alt="Energizada"
            width={150}
            height={56}
            className="h-12 w-auto object-contain"
          />

          <div className="hidden items-center gap-2 text-xs font-semibold text-emerald-700 sm:flex">
            <LockKeyhole className="h-4 w-4" />
            Ambiente seguro
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-8">
            <div className="mb-6">
              <span className="text-xs font-bold uppercase tracking-[.2em] text-blue-700">
                Pagamento
              </span>

              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                {codigoPix
                  ? "Pague seu pedido via Pix"
                  : boletoUrl
                    ? "Seu boleto está pronto"
                    : "Finalize sem sair da Energizada"}
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                {codigoPix
                  ? "Escaneie o QR Code com o aplicativo do seu banco ou use o Pix Copia e Cola."
                  : boletoUrl
                    ? "Abra o boleto abaixo e conclua o pagamento."
                    : pagamentoEscolhido
                      ? (
                          <>
                            Você escolheu{" "}
                            <strong className="font-semibold text-slate-700">
                              {pagamentoEscolhido.label}
                            </strong>{" "}
                            no carrinho. Conclua o pagamento abaixo.
                          </>
                        )
                      : "Conclua o pagamento abaixo."}
              </p>
            </div>

            {codigoPix ? (
              <div className="mx-auto max-w-xl">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 md:p-7">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-blue-100 text-blue-700">
                      <QrCode className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="font-extrabold text-slate-950">
                        Pix gerado
                      </h2>
                      <p className="text-xs text-slate-500">
                        Aguardando confirmação do pagamento
                      </p>
                    </div>
                  </div>

                  {qrCodeBase64 && (
                    <div className="mb-6 flex justify-center">
                      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                        <img
                          src={`data:image/png;base64,${qrCodeBase64}`}
                          alt="QR Code Pix"
                          className="h-60 w-60 max-w-full object-contain"
                        />
                      </div>
                    </div>
                  )}

                  <label className="mb-2 block text-sm font-bold text-slate-800">
                    Pix Copia e Cola
                  </label>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <textarea
                      readOnly
                      value={codigoPix}
                      rows={4}
                      className="w-full resize-none bg-transparent text-xs leading-5 text-slate-600 outline-none"
                    />

                    <button
                      type="button"
                      onClick={copiarPix}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#071a52] px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-900"
                    >
                      {copiado ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}

                      {copiado
                        ? "Código copiado"
                        : "Copiar código Pix"}
                    </button>
                  </div>

                  <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-700" />
                    Aguardando pagamento...
                  </div>
                </div>
              </div>
            ) : boletoUrl ? (
              <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-blue-700" />

                <h2 className="mt-3 text-xl font-extrabold text-slate-950">
                  Boleto gerado
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Abra o boleto e realize o pagamento. A confirmação
                  pode levar algum tempo após a compensação.
                </p>

                <a
                  href={boletoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#071a52] px-5 py-3 text-sm font-bold text-white"
                >
                  Abrir boleto
                  <ExternalLink className="h-4 w-4" />
                </a>

                <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-700" />
                  Aguardando confirmação...
                </div>
              </div>
            ) : (
              <>
                {!PUBLIC_KEY ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    Configure{" "}
                    <strong>
                      NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY
                    </strong>{" "}
                    no ambiente da aplicação.
                  </div>
                ) : (
                  <>
                    {!pagamentoEscolhido && !error && (
                      <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        Não foi possível identificar a forma de
                        pagamento escolhida neste pedido. Volte ao
                        carrinho e tente novamente.
                      </div>
                    )}

                    {pagamentoEscolhido &&
                      !brickReady &&
                      !error && (
                        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Carregando pagamento via{" "}
                          {pagamentoEscolhido.label}…
                        </div>
                      )}

                    {error && (
                      <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {error}
                      </div>
                    )}

                    <div id="paymentBrick_container" />
                  </>
                )}
              </>
            )}
          </section>

          <aside className="rounded-[28px] bg-[#071a52] p-6 text-white shadow-xl lg:sticky lg:top-6">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-yellow-300">
              Resumo do pedido
            </p>

            <h2 className="mt-2 text-lg font-extrabold">
              Pedido #{txid?.slice(0, 8).toUpperCase()}
            </h2>

            <p className="mt-1 text-xs text-blue-200">
              {pedido?.nome}
            </p>

            <div className="my-5 h-px bg-white/10" />

            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4 text-blue-100">
                <span>Produtos</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between gap-4 text-blue-100">
                <span>Taxa de serviço</span>
                <span>R$ {taxaServico.toFixed(2)}</span>
              </div>

              <div className="h-px bg-white/10" />

              <div className="flex items-end justify-between gap-4">
                <span className="font-bold">Total</span>

                <span className="text-2xl font-black text-yellow-300">
                  R${" "}
                  {Number(
                    pedido?.valorTotal || 0,
                  ).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3 rounded-2xl bg-white/7 p-4 text-xs text-blue-100">
              <p className="flex gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-yellow-300" />
                Pagamento processado com segurança pelo Mercado
                Pago.
              </p>

              <p className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-yellow-300" />
                O valor acima já inclui a taxa de serviço.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
