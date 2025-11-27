// app/final/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function FinalPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const status = searchParams.get("status"); // success | failure | pending
  const txid = searchParams.get("txid");

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");

  useEffect(() => {
    if (status === "success") {
      setTitulo("Pagamento aprovado ✅");
      setDescricao(
        "Seu pagamento foi aprovado pelo Mercado Pago. Em alguns instantes o status já estará atualizado no painel."
      );
    } else if (status === "pending") {
      setTitulo("Pagamento pendente ⏳");
      setDescricao(
        "O Mercado Pago ainda está processando seu pagamento. Assim que for aprovado, atualizaremos o status do seu pedido automaticamente."
      );
    } else if (status === "failure") {
      setTitulo("Pagamento não concluído ❌");
      setDescricao(
        "Seu pagamento não foi concluído ou foi recusado. Você pode tentar novamente."
      );
    } else {
      setTitulo("Retorno de pagamento");
      setDescricao("Não foi possível identificar o status do pagamento.");
    }
  }, [status]);

  return (
    <main className="min-h-screen bg-linear-to-b from-yellow-300 via-blue-800 to-blue-950 px-4 py-8 flex items-center justify-center">
      <Card className="max-w-lg w-full border-blue-800 bg-blue-950/90 text-white shadow-2xl rounded-3xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-yellow-300">
            {titulo}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-blue-100">{descricao}</p>

          {txid && (
            <p className="text-xs text-blue-300">
              Código do pedido: <span className="font-mono">{txid}</span>
            </p>
          )}

          <div className="flex flex-wrap gap-2 mt-4">
            {txid && (
              <Button
                className="bg-yellow-400 text-blue-900 hover:bg-yellow-500"
                onClick={() => router.push(`/pagamento/${txid}`)}
              >
                Ver detalhes / Pix
              </Button>
            )}

            <Button
              variant="outline"
              className="border-blue-700 text-blue-100 hover:bg-blue-900/60"
              onClick={() => router.push("/")}
            >
              Voltar para a loja
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
