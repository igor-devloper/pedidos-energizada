// app/final/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type PedidoCarrinho = {
  txid: string;
  nome: string;
  email: string;
  telefone: string;
  valorTotal: number;
  status: string;
};

function FinalContent() {
  const searchParams = useSearchParams();
  const statusMP = searchParams.get("status");
  const txid = searchParams.get("txid");

  const [pedido, setPedido] = useState<PedidoCarrinho | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!txid) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/pedidos-carrinho/${txid}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setPedido(data);
      } catch (err) {
        console.error(err);
        setPedido(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [txid]);

  if (!txid) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 px-4">
        <p>TXID não informado.</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 px-4">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando pedido…</span>
        </div>
      </main>
    );
  }

  if (!pedido) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 px-4">
        <p>Pedido não encontrado.</p>
      </main>
    );
  }

  const statusTxt =
    statusMP === "success"
      ? "Pagamento aprovado (aguarde a confirmação pela Atlética)."
      : statusMP === "failure"
      ? "Pagamento não aprovado. Você pode tentar novamente."
      : "Pagamento em análise ou pendente.";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-50">
      <div className="max-w-xl mx-auto">
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader>
            <CardTitle>Resumo do pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-semibold">Cliente:</span> {pedido.nome}
            </p>
            <p>
              <span className="font-semibold">TXID:</span> {pedido.txid}
            </p>
            <p>
              <span className="font-semibold">Valor total:</span>{" "}
              {pedido.valorTotal.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
            <p className="mt-4 text-yellow-300">{statusTxt}</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function FinalPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 px-4">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Carregando…</span>
          </div>
        </main>
      }
    >
      <FinalContent />
    </Suspense>
  );
}
