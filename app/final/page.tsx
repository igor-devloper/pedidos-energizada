// app/final/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

import type { CartItem } from "@/lib/cart-types";

type StatusInterno = "AGUARDANDO_PAGAMENTO" | "PAGO" | "PAGO_METADE" | "CANCELADO";

type PedidoCarrinho = {
  txid: string;
  nome: string;
  valorTotal: number;
  status: StatusInterno;
  itemsJson: CartItem[];
};

function FinalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const txid = (searchParams.get("txid") || "").trim();
  const statusQuery = (searchParams.get("status") || "").toLowerCase(); // success/failure/pending

  const [pedido, setPedido] = useState<PedidoCarrinho | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!txid) {
      setErro("TXID não informado.");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/pedidos-carrinho/${txid}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Pedido não encontrado.");
        }

        const data = await res.json();
        setPedido(data);
      } catch (e: any) {
        console.error(e);
        setErro(e.message || "Erro ao carregar pedido.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [txid]);

  // subtotal = soma dos itens (sem taxas)
  const subtotal = useMemo(() => {
    if (!pedido?.itemsJson) return 0;
    return pedido.itemsJson.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
  }, [pedido]);

  const taxa = useMemo(() => {
    if (!pedido) return 0;
    const diff = pedido.valorTotal - subtotal;
    return diff > 0 ? diff : 0;
  }, [pedido, subtotal]);

  const statusLabel = useMemo(() => {
    if (!pedido) return "";
    if (pedido.status === "PAGO" || pedido.status === "PAGO_METADE") {
      return "Pagamento aprovado (aguarde a confirmação pela Atlética).";
    }
    if (pedido.status === "CANCELADO") {
      return "Pagamento não aprovado ou cancelado. Você pode tentar novamente.";
    }
    // aguardando_pagamento
    if (statusQuery === "pending") {
      return "Pagamento em processamento. Assim que o Mercado Pago confirmar, seu pedido será atualizado.";
    }
    return "Estamos aguardando a confirmação do pagamento pelo Mercado Pago.";
  }, [pedido, statusQuery]);

  const statusIcon = useMemo(() => {
    if (!pedido) return null;
    if (pedido.status === "PAGO" || pedido.status === "PAGO_METADE") {
      return (
        <CheckCircle2 className="h-5 w-5 text-green-400 inline-block mr-2" />
      );
    }
    if (pedido.status === "CANCELADO") {
      return <XCircle className="h-5 w-5 text-red-400 inline-block mr-2" />;
    }
    return <Clock className="h-5 w-5 text-yellow-300 inline-block mr-2" />;
  }, [pedido]);

  // telas de loading/erro
  if (loading) {
    return (
      <main className="min-h-screen bg-linear-to-b from-yellow-300 via-blue-800 to-blue-950 flex items-center justify-center px-4">
        <Card className="bg-blue-900/80 border-blue-700 px-8 py-6 shadow-xl text-white">
          <CardContent className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-yellow-400" />
            <p>Carregando resumo do pedido…</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (erro || !pedido) {
    return (
      <main className="min-h-screen bg-linear-to-b from-yellow-300 via-blue-800 to-blue-950 flex items-center justify-center px-4">
        <Card className="bg-red-900/40 border-red-500 px-8 py-6 shadow-xl text-white max-w-lg">
          <CardContent className="space-y-4">
            <p>{erro || "Pedido não encontrado."}</p>
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-blue-900"
            >
              Voltar para a loja
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-yellow-300 via-blue-800 to-blue-950 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        {/* header com logo */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="relative h-20 w-64 md:h-24 md:w-80">
            <Image
              src="/energizada-logo.png"
              alt="Atlética Energizada"
              fill
              className="object-contain drop-shadow-[0_0_18px_rgba(0,0,0,0.6)]"
              priority
            />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-blue-950 drop-shadow-sm text-center">
            Resumo do pedido ⚡
          </h1>
        </div>

        {/* card principal */}
        <Card className="bg-blue-950/90 border-blue-800 text-white shadow-2xl rounded-3xl">
          <CardHeader className="border-b border-blue-800 pb-3">
            <CardTitle className="text-base md:text-lg text-yellow-300">
              Pedido #{pedido.txid.slice(0, 8).toUpperCase()}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* dados principais */}
            <section className="space-y-1 text-sm md:text-base">
              <p>
                <span className="font-semibold text-blue-100">Cliente: </span>
                <span className="text-yellow-200">{pedido.nome}</span>
              </p>
              <p className="text-xs text-blue-300">
                TXID completo: <span className="font-mono">{pedido.txid}</span>
              </p>
            </section>

            {/* itens comprados */}
            <section className="space-y-2 text-xs md:text-sm">
              <h2 className="font-semibold text-yellow-300">
                Itens do pedido
              </h2>
              <div className="rounded-2xl bg-blue-900/60 border border-blue-800 p-3 space-y-1">
                {pedido.itemsJson.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between gap-2 text-blue-100"
                  >
                    <span>
                      {item.label}{" "}
                      <span className="text-[10px] text-blue-300">
                        x{item.quantity}
                      </span>
                    </span>
                    <span>
                      R${" "}
                      {(item.unitPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* resumo financeiro */}
            <section className="space-y-2 text-sm">
              <h2 className="font-semibold text-yellow-300">
                Valores
              </h2>
              <div className="space-y-1 text-blue-100 text-xs md:text-sm">
                <div className="flex justify-between">
                  <span>Subtotal (sem taxas)</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxas Mercado Pago (repassadas)</span>
                  <span>R$ {taxa.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-yellow-300 font-semibold mt-1">
                  <span>Total pago</span>
                  <span>R$ {pedido.valorTotal.toFixed(2)}</span>
                </div>
              </div>
            </section>

            {/* status */}
            <section className="mt-2 text-xs md:text-sm">
              <p className="flex items-center text-yellow-200">
                {statusIcon}
                <span>{statusLabel}</span>
              </p>
              <p className="mt-2 text-[11px] text-blue-300">
                Você receberá a confirmação pela Atlética assim que o pagamento
                for compensado no sistema interno.
              </p>
            </section>

            {/* ações */}
            <section className="pt-2 flex flex-wrap gap-3">
              <Button
                className="rounded-full bg-yellow-400 text-blue-900 font-bold text-xs md:text-sm hover:bg-yellow-500"
                onClick={() => router.push("/")}
              >
                Voltar para a loja
              </Button>

              <Button
                variant="outline"
                className="rounded-full border-blue-500 text-blue-100 text-xs md:text-sm hover:bg-blue-900"
                onClick={() => window.print()}
              >
                Imprimir comprovante
              </Button>
            </section>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function FinalPage() {
  // Suspense resolve o erro de useSearchParams no build
  return (
    <Suspense fallback={<main className="min-h-screen bg-blue-950" />}>
      <FinalContent />
    </Suspense>
  );
}
