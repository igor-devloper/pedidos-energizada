"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { PixPayment } from "@/components/pix-payment";
import { generatePixQRCode } from "@/lib/pix";

import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PagamentoPage() {
  const params = useParams<{ txid: string }>();
  const txid = params.txid;

  const [pedido, setPedido] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payMode, setPayMode] = useState<"TOTAL" | "METADE">("TOTAL");

  // 🎨 Paleta Energizada
  const BG_1 = "from-blue-950";
  const BG_2 = "via-blue-900";
  const BG_3 = "to-blue-800";

  // Carregar pedido
useEffect(() => {
  const load = async () => {
    try {
      setLoading(true);

      // 1) tenta buscar pedido de uniformes
      let res = await fetch(`/api/pedidos/${txid}`, {
        cache: "no-store",
      });

      // 2) se não achou, tenta buscar pedido de canecas
      if (!res.ok) {
        res = await fetch(`/api/pedidos-canecas/${txid}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Pedido não encontrado.");
        }
      }

      const data = await res.json();
      setPedido(data);
    } catch (e: any) {
      setError(e.message || "Erro ao carregar pedido.");
    } finally {
      setLoading(false);
    }
  };

  if (txid) load();
}, [txid]);


  const valorTotalBase = useMemo(() => {
    if (!pedido) return 0;
    return pedido.valorTotal;
  }, [pedido]);

  const amount = useMemo(() => {
    return payMode === "TOTAL"
      ? valorTotalBase
      : Number((valorTotalBase / 2).toFixed(2));
  }, [valorTotalBase, payMode]);

  const pixPayload = useMemo(() => {
    return amount > 0 ? generatePixQRCode({ amount }) : "";
  }, [amount]);

  // LOADING SCREEN
  if (loading) {
    return (
      <main
        className={`min-h-screen bg-linear-to-b ${BG_1} ${BG_2} ${BG_3} flex items-center justify-center px-4`}
      >
        <Card className="bg-blue-900/40 border-blue-700 px-8 py-6 shadow-xl text-white">
          <CardContent className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-yellow-400" />
            <p>Carregando informações do pagamento…</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  // ERRO OU NÃO ENCONTRADO
  if (error || !pedido) {
    return (
      <main
        className={`min-h-screen bg-linear-to-b ${BG_1} ${BG_2} ${BG_3} flex items-center justify-center px-4`}
      >
        <Card className="bg-red-900/30 border-red-400 px-8 py-6 shadow-xl text-white">
          <CardContent>
            <p>{error || "Pedido não encontrado."}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main
      className={`min-h-screen bg-linear-to-b ${BG_1} ${BG_2} ${BG_3} px-4 py-8`}
    >
      <div className="mx-auto max-w-4xl space-y-6 text-white">
        <div>
          <h1 className="text-2xl font-extrabold text-yellow-400 drop-shadow">
            Finalize o pagamento
          </h1>

          <p className="text-blue-200">
            Pedido em nome de{" "}
            <span className="text-yellow-400 font-bold">{pedido.nome}</span>.
          </p>

          <p className="text-sm text-blue-300 mt-1">
            Valor total da encomenda:{" "}
            <strong className="text-yellow-400">
              R$ {valorTotalBase.toFixed(2)}
            </strong>
          </p>

          <p className="text-xs text-blue-300">
            ⚡ Seu pedido será confirmado após envio do comprovante.
          </p>
        </div>

        {/* Escolher tipo de pagamento */}
        <Card className="bg-blue-900/40 border-blue-700 text-white shadow-lg">
          <CardContent className="flex flex-col gap-3 py-5 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-medium text-blue-200">
              Como deseja pagar agora?
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={payMode === "METADE" ? "default" : "outline"}
                onClick={() => setPayMode("METADE")}
                className={
                  payMode === "METADE"
                    ? "bg-yellow-400 text-blue-900 hover:bg-yellow-500 font-bold"
                    : "border-yellow-300 text-yellow-300 hover:bg-yellow-300/20"
                }
              >
                Metade (R$ {(valorTotalBase / 2).toFixed(2)})
              </Button>

              <Button
                size="sm"
                variant={payMode === "TOTAL" ? "default" : "outline"}
                onClick={() => setPayMode("TOTAL")}
                className={
                  payMode === "TOTAL"
                    ? "bg-yellow-400 text-blue-900 hover:bg-yellow-500 font-bold"
                    : "border-yellow-300 text-yellow-300 hover:bg-yellow-300/20"
                }
              >
                Total (R$ {valorTotalBase.toFixed(2)})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pix Payment */}
        <PixPayment amount={amount} orderId={pedido.txid} pixPayload={pixPayload} />
      </div>
    </main>
  );
}
