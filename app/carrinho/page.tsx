// app/carrinho/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart-provider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { CartItem, Modelo, Tamanho } from "@/lib/cart-types";
import { toast } from "sonner";
import { ShoppingCart, Trash2 } from "lucide-react";

const modeloLabel = (m?: Modelo) =>
  m === "BRANCA"
    ? "Camisa branca"
    : m === "AZUL"
    ? "Camisa azul"
    : m === "AZUL_SEM_MANGA"
    ? "Camisa azul s/ manga"
    : "-";

export default function CarrinhoPage() {
  const { items, total, removeItem, updateItem, clearCart } = useCart();
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);

  const hasUniforme = useMemo(
    () => items.some((i) => i.kind === "UNIFORME"),
    [items]
  );

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error("Seu carrinho está vazio.");
      return;
    }
    if (!nome || !email || !telefone) {
      toast.error("Preencha nome, e-mail e telefone.");
      return;
    }

    // valida uniforms preenchidos
    for (const item of items) {
      if (item.kind === "UNIFORME") {
        if (!item.modelo || !item.tamanho || !item.nomeCamisa || !item.numeroCamisa) {
          toast.error(
            "Preencha modelo, tamanho, nome e número da camisa para todos os uniformes."
          );
          return;
        }
      }
    }

    try {
      setLoading(true);
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          email,
          telefone,
          items,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Erro ao iniciar pagamento.");
      }

      const data = await res.json();
      const initPoint: string | undefined = data.initPoint;

      if (!initPoint) throw new Error("URL de pagamento não encontrada.");

      clearCart();
      window.location.href = initPoint; // redireciona pro Mercado Pago
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao redirecionar para pagamento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-linear-to-b from-yellow-300 via-blue-800 to-blue-950 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-blue-950 drop-shadow-sm flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Seu carrinho
            </h1>
            <p className="text-xs md:text-sm text-blue-50/90">
              Revise os produtos, complete os dados e siga para o pagamento.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/")}
            className="border-blue-900 bg-blue-900/50 text-blue-50 hover:bg-blue-900"
          >
            Voltar para produtos
          </Button>
        </header>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          {/* ITENS */}
          <Card className="border-blue-800 bg-blue-950/90 text-white shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-blue-800 pb-3">
              <CardTitle className="text-sm md:text-base font-semibold text-yellow-300">
                Itens do carrinho
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {items.length === 0 ? (
                <p className="text-sm text-blue-200">
                  Nenhum item no carrinho. Volte para a loja e adicione um
                  produto.
                </p>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-blue-800 bg-blue-900/60 p-3 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-yellow-300">
                          {item.label}
                        </p>
                        <p className="text-[11px] text-blue-200">
                          R$ {item.unitPrice.toFixed(2)} cada
                        </p>
                        {item.kind === "CANECA" && (
                          <p className="text-[11px] text-blue-300 mt-1">
                            Tipo: {item.tipoProduto === "CANECA"
                              ? "Caneca 850 mL"
                              : item.tipoProduto === "TIRANTE"
                              ? "Tirante"
                              : "Kit Caneca + Tirante"}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateItem(item.id, {
                              quantity: Math.max(1, item.quantity - 1),
                            })
                          }
                          className="h-7 w-7 rounded-full bg-blue-950 border border-blue-700 text-xs"
                        >
                          -
                        </button>
                        <span className="text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateItem(item.id, {
                              quantity: item.quantity + 1,
                            })
                          }
                          className="h-7 w-7 rounded-full bg-blue-950 border border-blue-700 text-xs"
                        >
                          +
                        </button>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="ml-2 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {item.kind === "UNIFORME" && (
                      <>
                        <Separator className="bg-blue-800" />
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-[11px] text-blue-200">
                              Modelo
                            </Label>
                            <Select
                              value={item.modelo}
                              onValueChange={(v) =>
                                updateItem(item.id, {
                                  modelo: v as Modelo,
                                })
                              }
                            >
                              <SelectTrigger className="bg-blue-950 border-blue-700 text-xs">
                                <SelectValue
                                  placeholder="Selecione"
                                  defaultValue={item.modelo}
                                />
                              </SelectTrigger>
                              <SelectContent className="bg-blue-900 border-blue-700 text-xs">
                                <SelectItem value="BRANCA">
                                  Camisa branca
                                </SelectItem>
                                <SelectItem value="AZUL">
                                  Camisa azul
                                </SelectItem>
                                <SelectItem value="AZUL_SEM_MANGA">
                                  Camisa azul s/ manga
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] text-blue-200">
                              Tamanho
                            </Label>
                            <Select
                              value={item.tamanho}
                              onValueChange={(v) =>
                                updateItem(item.id, {
                                  tamanho: v as Tamanho,
                                })
                              }
                            >
                              <SelectTrigger className="bg-blue-950 border-blue-700 text-xs">
                                <SelectValue placeholder="Tam." />
                              </SelectTrigger>
                              <SelectContent className="bg-blue-900 border-blue-700 text-xs">
                                {["PP", "P", "M", "G", "GG", "XG"].map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] text-blue-200">
                              Nome atrás
                            </Label>
                            <Input
                              value={item.nomeCamisa ?? ""}
                              onChange={(e) =>
                                updateItem(item.id, {
                                  nomeCamisa: e.target.value
                                    .toUpperCase()
                                    .slice(0, 14),
                                })
                              }
                              placeholder="EX: WAGNER"
                              className="bg-blue-950 border-blue-700 text-xs uppercase"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] text-blue-200">
                              Número
                            </Label>
                            <Input
                              value={item.numeroCamisa ?? ""}
                              onChange={(e) =>
                                updateItem(item.id, {
                                  numeroCamisa: e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 2),
                                })
                              }
                              placeholder="10"
                              className="bg-blue-950 border-blue-700 text-xs w-20"
                            />
                          </div>
                        </div>
                        <p className="mt-1 text-[10px] text-blue-300">
                          {modeloLabel(item.modelo)} •{" "}
                          {item.tamanho || "Tam. -"}
                        </p>
                      </>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* DADOS + RESUMO */}
          <div className="space-y-4">
            <Card className="border-blue-800 bg-blue-950/90 text-white shadow-2xl rounded-3xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm md:text-base text-yellow-300">
                  Dados do comprador
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div>
                  <Label className="text-[11px] text-blue-200">Nome *</Label>
                  <Input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="mt-1 bg-blue-900/70 border-blue-700 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-blue-200">E-mail *</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 bg-blue-900/70 border-blue-700 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-blue-200">
                    Telefone *
                  </Label>
                  <Input
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="mt-1 bg-blue-900/70 border-blue-700 text-xs"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-800 bg-blue-950/90 text-white shadow-2xl rounded-3xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm md:text-base text-yellow-300">
                  Resumo
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-between text-xs text-blue-100">
                  <span>Itens</span>
                  <span>{items.length}</span>
                </div>
                <div className="flex justify-between text-sm text-yellow-300 font-semibold">
                  <span>Total</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>

                <Button
                  className="mt-4 w-full rounded-full bg-yellow-400 text-blue-900 font-bold py-3 text-sm hover:bg-yellow-500 disabled:bg-yellow-300"
                  disabled={items.length === 0 || loading}
                  onClick={handleCheckout}
                >
                  {loading ? "Conectando ao Mercado Pago..." : "Pagar com Mercado Pago"}
                </Button>

                {hasUniforme && (
                  <p className="text-[10px] text-blue-200 mt-1">
                    Para uniformes, lembre de completar modelo, tamanho, nome e
                    número antes de pagar.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
