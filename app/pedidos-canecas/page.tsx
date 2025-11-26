"use client";

import { useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

type TipoProduto = "CANECA" | "TIRANTE" | "KIT";

const PRECO_CANECA = 25;
const PRECO_TIRANTE = 10;
const PRECO_KIT = 30;

function CanecasContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const produtoFromUrl = (searchParams.get("produto") || "").toUpperCase();
  const initialTipo: TipoProduto =
    produtoFromUrl === "CANECA" ||
    produtoFromUrl === "TIRANTE" ||
    produtoFromUrl === "KIT"
      ? (produtoFromUrl as TipoProduto)
      : "KIT";

  const [tipoProduto, setTipoProduto] = useState<TipoProduto>(initialTipo);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [observacao, setObservacao] = useState("");

  const precoUnitario = useMemo(() => {
    if (tipoProduto === "CANECA") return PRECO_CANECA;
    if (tipoProduto === "TIRANTE") return PRECO_TIRANTE;
    return PRECO_KIT;
  }, [tipoProduto]);

  const valorTotal = useMemo(() => {
    const qtd = Number(quantidade || "0");
    if (!qtd || qtd <= 0) return 0;
    return qtd * precoUnitario;
  }, [quantidade, precoUnitario]);

  const labelProduto = (t: TipoProduto) => {
    if (t === "CANECA") return "Caneca 850 mL";
    if (t === "TIRANTE") return "Tirante Energizada";
    return "Kit Caneca + Tirante";
  };

  const handleSubmit = async () => {
    if (!nome || !email || !telefone || !quantidade) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    const qtdNum = Number(quantidade);
    if (!qtdNum || qtdNum <= 0) {
      toast.error("Quantidade deve ser maior que zero.");
      return;
    }

    if (valorTotal <= 0) {
      toast.error("Verifique o tipo de produto e a quantidade.");
      return;
    }

    try {
      const res = await fetch("/api/pedidos-canecas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          email,
          telefone,
          tipoProduto,
          quantidade: qtdNum,
          observacao,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Erro ao criar pedido.");
      }

      const data = await res.json();
      const txid: string = data.txid ?? data.pedido?.txid;

      toast.success("Pedido criado! Agora é só fazer o PIX.");
      if (txid) router.push(`/pagamento/${txid}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao enviar pedido.");
    }
  };

  return (
    <main className="min-h-screen bg-linear-to-b from-yellow-300 via-blue-800 to-blue-950 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* HEADER */}
        <div className="rounded-3xl bg-blue-900/95 px-6 py-4 shadow-2xl border border-blue-800">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
            <div className="relative w-56 h-16 md:w-72 md:h-20">
              <Image
                src="/energizada-logo.png"
                alt="Atlética Energizada"
                fill
                className="object-contain drop-shadow-[0_0_12px_rgba(0,0,0,0.5)]"
                priority
              />
            </div>

            <div className="flex-1 text-center md:text-left">
              <h1 className="text-xl md:text-2xl font-extrabold text-yellow-300 drop-shadow">
                Canecas & Tirantes Energizados ⚡
              </h1>
              <p className="text-xs md:text-sm text-blue-100 mt-1">
                Escolha o produto, informe a quantidade e finalize seu pedido
                com o mesmo fluxo de pagamento via PIX.
              </p>
            </div>
          </div>
        </div>

        {/* CONTEÚDO */}
        <Card className="w-full border-blue-800 bg-blue-950/90 text-white shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-blue-800 pb-3">
            <CardTitle className="text-base md:text-lg font-semibold text-yellow-300">
              Faça seu pedido de caneca / tirante
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              {/* FORM */}
              <div className="space-y-4">
                {/* Dados pessoais */}
                <section className="space-y-3">
                  <div>
                    <Label className="text-xs text-blue-200">Nome completo *</Label>
                    <Input
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Seu nome"
                      className="mt-1 bg-blue-900/70 border-blue-700 text-white placeholder:text-blue-300 focus-visible:ring-yellow-400"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-blue-200">Email *</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@exemplo.com"
                      className="mt-1 bg-blue-900/70 border-blue-700 text-white placeholder:text-blue-300 focus-visible:ring-yellow-400"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-blue-200">Telefone *</Label>
                    <Input
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      placeholder="(83) 9 0000-0000"
                      className="mt-1 bg-blue-900/70 border-blue-700 text-white placeholder:text-blue-300 focus-visible:ring-yellow-400"
                    />
                  </div>
                </section>

                <Separator className="bg-blue-800" />

                {/* Produto + quantidade */}
                <section className="space-y-3">
                  <div>
                    <Label className="text-xs text-blue-200">Produto *</Label>
                    <Select
                      value={tipoProduto}
                      onValueChange={(v) => setTipoProduto(v as TipoProduto)}
                    >
                      <SelectTrigger className="mt-1 bg-blue-900/70 border-blue-700 text-white focus-visible:ring-yellow-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-blue-900 text-white border-blue-700">
                        <SelectItem value="CANECA">Caneca 850 mL — R$ 25,00</SelectItem>
                        <SelectItem value="TIRANTE">Tirante — R$ 10,00</SelectItem>
                        <SelectItem value="KIT">Kit Caneca + Tirante — R$ 30,00</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-blue-200">Quantidade *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={quantidade}
                      onChange={(e) => setQuantidade(e.target.value)}
                      className="mt-1 bg-blue-900/70 border-blue-700 text-white placeholder:text-blue-300 focus-visible:ring-yellow-400 w-24"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-blue-200">
                      Observações (opcional)
                    </Label>
                    <Input
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                      placeholder="Ex: cores, retirada na sede, etc."
                      className="mt-1 bg-blue-900/70 border-blue-700 text-white placeholder:text-blue-300 focus-visible:ring-yellow-400"
                    />
                  </div>
                </section>
              </div>

              {/* PREVIEW */}
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-yellow-400 via-yellow-300 to-blue-600 border border-yellow-500 shadow-xl">
                  <div className="relative p-4 space-y-2 bg-linear-to-t from-blue-900/90 via-blue-900/70 to-transparent">
                    <p className="text-xs font-semibold text-blue-900">
                      Preview do pedido
                    </p>
                    <p className="text-sm text-white">
                      <span className="font-semibold">Produto: </span>
                      {labelProduto(tipoProduto)}
                    </p>
                    <p className="text-sm text-white">
                      <span className="font-semibold">Qtd.: </span>
                      {quantidade || "0"}
                    </p>
                    <p className="text-sm text-white">
                      <span className="font-semibold">Preço unitário: </span>
                      R$ {precoUnitario.toFixed(2)}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-yellow-300">
                      Total:
                      <span className="text-xl font-extrabold ml-1">
                        R$ {valorTotal.toFixed(2)}
                      </span>
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleSubmit}
                  className="w-full rounded-full bg-yellow-400 text-blue-900 font-bold py-5 text-sm md:text-base hover:bg-yellow-500 disabled:bg-yellow-300"
                  disabled={valorTotal <= 0}
                >
                  Continuar para pagamento
                </Button>

                <p className="text-[11px] text-blue-200 text-center">
                  Após confirmar o pedido você será redirecionado para a tela de PIX
                  para fazer o pagamento e enviar o comprovante.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function CanecasPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-blue-950" />}>
      <CanecasContent />
    </Suspense>
  );
}
