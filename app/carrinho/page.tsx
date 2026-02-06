// app/carrinho/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RulerDimensionLine, ShoppingCart, Trash2 } from "lucide-react";
import { z } from "zod";
import Image from "next/image";
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
import { Checkbox } from "@/components/ui/checkbox";

import type { Modelo, Tamanho } from "@/lib/cart-types";
import {
  calcularTotalComTaxas,
  type MetodoPagamento,
  type Parcelas,
} from "@/lib/calc-tax";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DialogTrigger } from "@radix-ui/react-dialog";

const modeloLabel = (m?: Modelo) =>
  m === "BRANCA"
    ? "Camisa branca"
    : m === "AZUL"
      ? "Camisa azul"
      : m === "AZUL_SEM_MANGA"
        ? "Camisa azul s/ manga"
        : "-";

/* --------- validação Zod --------- */
const compradorSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(3, "Informe seu nome completo."),
  email: z
    .email("Informe um e-mail válido."),
  telefone: z
    .string()
    .min(14, "Informe um telefone válido.") // (83) 99999-9999 => 15, mas aqui é mínimo
    .max(16, "Telefone inválido."),
});

/* --------- máscara de telefone --------- */
function formatarTelefone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6)
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(
      6,
    )}`;
  // 11 dígitos
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(
    7,
  )}`;
}

export default function CarrinhoPage() {
  const { items, total, removeItem, updateItem, clearCart } = useCart();
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);

  const [metodoPagamento, setMetodoPagamento] =
    useState<MetodoPagamento>("pix");
  const [parcelas, setParcelas] = useState<Parcelas>(1);

  const hasUniforme = useMemo(
    () => items.some((i) => i.kind === "UNIFORME"),
    [items],
  );

  const resumoTaxas = useMemo(
    () => calcularTotalComTaxas(total, metodoPagamento, parcelas),
    [total, metodoPagamento, parcelas],
  );

  const handleCheckout = async () => {
    if (!items.length) {
      toast.error("Seu carrinho está vazio.");
      return;
    }

    // valida formulário com Zod
    const parsed = compradorSchema.safeParse({
      nome,
      email,
      telefone,
    });

    if (!parsed.success) {
      toast.error(parsed.error.message || "Revise os dados do formulário.");
      return;
    }

    // valida uniformes
    for (const item of items) {
      if (item.kind === "UNIFORME") {
        if (!item.modelo || !item.tamanho || !item.nomeCamisa) {
          toast.error(
            "Preencha modelo, tamanho e nome da camisa para todos os uniformes.",
          );
          return;
        }

        const jaTem = (item as any).jaTemCamisa ?? false;

        if (jaTem) {
          if (!(item as any).numeroCamisaAtual) {
            toast.error(
              "Informe o número que você já utiliza na camisa.",
            );
            return;
          }
        } else {
          const iAny = item as any;
          if (
            !iAny.numeroOpcao1 &&
            !iAny.numeroOpcao2 &&
            !iAny.numeroOpcao3
          ) {
            toast.error(
              "Informe pelo menos uma opção de número para a camisa (até 3 opções).",
            );
            return;
          }
        }
      }
    }

    try {
      setLoading(true);

      // telefone vai para o backend só com dígitos
      const telefoneDigits = telefone.replace(/\D/g, "");

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim(),
          telefone: telefoneDigits,
          items,
          metodoPagamento,
          parcelas,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Erro ao iniciar pagamento.");
      }

      const data = await res.json();
      const initPoint: string | undefined = data.initPoint;

      if (!initPoint) {
        throw new Error("URL de pagamento não encontrada.");
      }

      clearCart();
      window.location.href = initPoint;
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
                            Tipo:{" "}
                            {(item as any).tipoProduto === "CANECA"
                              ? "Caneca 850 mL"
                              : (item as any).tipoProduto === "TIRANTE"
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

                        {/* modelo + tamanho + nome */}
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-[11px] text-blue-200">
                              Modelo
                            </Label>
                            <Select
                              value={item.modelo}
                              onValueChange={(v) =>
                                updateItem(item.id, { modelo: v as Modelo })
                              }
                            >
                              <SelectTrigger className="bg-blue-950 border-blue-700 text-xs">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent className="bg-blue-900 border-blue-700 text-xs text-white">
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
                            <div className="flex items-center gap-4">
                              <Select
                                value={item.tamanho}
                                onValueChange={(v) =>
                                  updateItem(item.id, { tamanho: v as Tamanho })
                                }
                              >
                                <SelectTrigger className="bg-blue-950 border-blue-700 text-xs">
                                  <SelectValue placeholder="Tam." />
                                </SelectTrigger>
                                <SelectContent className="bg-blue-900 border-blue-700 text-xs text-white">
                                  {["PP", "P", "M", "G", "GG", "XG"].map((t) => (
                                    <SelectItem key={t} value={t}>
                                      {t}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Dialog>
                                <DialogTrigger className="">
                                  <Button className="bg-blue-950 border-blue-700 text-xs font-normal">
                                    <RulerDimensionLine size={16} />
                                    <p>Tabela de tamanhos</p>
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-blue-950 border-blue-700">
                                  <DialogTitle className="text-blue-200">Tabela de tamanhos</DialogTitle>

                                  <div className="rounded-4xl overflow-hidden justify-center flex w-auto max-w-2xl max-h-screen">
                                    <Image
                                      src="/tabelaTam.png"
                                      alt="Tabela de tamanhos"
                                      width={300}
                                      height={300}
                                      className="w-full"
                                    />
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
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
                        </div>

                        {/* checkbox: já tenho camisa? */}
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`jaTemCamisa-${item.id}`}
                              checked={(item as any).jaTemCamisa ?? false}
                              onCheckedChange={(checked) =>
                                updateItem(item.id, {
                                  jaTemCamisa: Boolean(checked),
                                  numeroCamisaAtual: "",
                                  numeroOpcao1: "",
                                  numeroOpcao2: "",
                                  numeroOpcao3: "",
                                })
                              }
                            />
                            <Label
                              htmlFor={`jaTemCamisa-${item.id}`}
                              className="text-[11px] text-blue-200 cursor-pointer"
                            >
                              Já tenho camisa da Atlética e quero manter o
                              número que uso hoje.
                            </Label>
                          </div>

                          {(item as any).jaTemCamisa ? (
                            <div className="space-y-1">
                              <Label className="text-[11px] text-blue-200">
                                Número que você já usa na camisa
                              </Label>
                              <Input
                                value={(item as any).numeroCamisaAtual ?? ""}
                                onChange={(e) =>
                                  updateItem(item.id, {
                                    numeroCamisaAtual: e.target.value
                                      .replace(/\D/g, "")
                                      .slice(0, 2),
                                  })
                                }
                                placeholder="10"
                                className="bg-blue-950 border-blue-700 text-xs w-24 text-center"
                              />
                              <p className="text-[10px] text-blue-300">
                                Vamos tentar manter exatamente esse número
                                no novo uniforme.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Label className="text-[11px] text-blue-200">
                                Sugestões de número (até 3 opções)
                              </Label>
                              <div className="grid grid-cols-3 gap-2 max-w-xs">
                                <Input
                                  value={(item as any).numeroOpcao1 ?? ""}
                                  onChange={(e) =>
                                    updateItem(item.id, {
                                      numeroOpcao1: e.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, 2),
                                    })
                                  }
                                  placeholder="1ª"
                                  className="bg-blue-950 border-blue-700 text-xs text-center"
                                />
                                <Input
                                  value={(item as any).numeroOpcao2 ?? ""}
                                  onChange={(e) =>
                                    updateItem(item.id, {
                                      numeroOpcao2: e.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, 2),
                                    })
                                  }
                                  placeholder="2ª"
                                  className="bg-blue-950 border-blue-700 text-xs text-center"
                                />
                                <Input
                                  value={(item as any).numeroOpcao3 ?? ""}
                                  onChange={(e) =>
                                    updateItem(item.id, {
                                      numeroOpcao3: e.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, 2),
                                    })
                                  }
                                  placeholder="3ª"
                                  className="bg-blue-950 border-blue-700 text-xs text-center"
                                />
                              </div>
                              <p className="text-[10px] text-blue-300">
                                A Atlética vai escolher um número que ainda
                                não esteja em uso, respeitando essas
                                preferências.
                              </p>
                            </div>
                          )}

                          <p className="mt-1 text-[10px] text-blue-300">
                            {modeloLabel(item.modelo)} •{" "}
                            {item.tamanho || "Tam. -"}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* DADOS + RESUMO */}
          <div className="space-y-4">
            {/* Dados do comprador */}
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
                    onChange={(e) =>
                      setTelefone(formatarTelefone(e.target.value))
                    }
                    placeholder="(83) 99999-9999"
                    className="mt-1 bg-blue-900/70 border-blue-700 text-xs"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Resumo + método + parcelas */}
            <Card className="border-blue-800 bg-blue-950/90 text-white shadow-2xl rounded-3xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm md:text-base text-yellow-300">
                  Resumo do pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs md:text-sm">
                <div className="space-y-2">
                  <Label className="text-[11px] text-blue-200">
                    Método de pagamento
                  </Label>
                  <Select
                    value={metodoPagamento}
                    onValueChange={(v) =>
                      setMetodoPagamento(v as MetodoPagamento)
                    }
                  >
                    <SelectTrigger className="bg-blue-900/70 border-blue-700 text-xs ">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-blue-900 border-blue-700 text-xs text-white">
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="credito">
                        Cartão de crédito
                      </SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                    </SelectContent>
                  </Select>

                  {metodoPagamento === "credito" && (
                    <div className="mt-2">
                      <Label className="text-[11px] text-blue-200">
                        Parcelamento
                      </Label>
                      <Select
                        value={String(parcelas)}
                        onValueChange={(v) =>
                          setParcelas(Number(v) as Parcelas)
                        }
                      >
                        <SelectTrigger className="bg-blue-900/70 border-blue-700 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-blue-900 border-blue-700 text-xs text-white">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((p) => (
                            <SelectItem key={p} value={String(p)}>
                              {p}x
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Separator className="bg-blue-800 my-2" />

                <div className="flex justify-between text-xs text-blue-100">
                  <span>Subtotal (sem taxas)</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-blue-100">
                  <span>
                    Taxa de serviço{" "}
                    <span className="text-[10px] text-blue-300">
                      ({(resumoTaxas.taxaPercentual * 100).toFixed(2)}%)
                    </span>
                  </span>
                  <span>R$ {resumoTaxas.taxaTotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-sm text-yellow-300 font-semibold">
                  <span>Total com taxas</span>
                  <span>
                    R$ {resumoTaxas.totalConsumidor.toFixed(2)}
                  </span>
                </div>

                <Button
                  className="mt-4 w-full rounded-full bg-yellow-400 text-blue-900 font-bold py-3 text-sm hover:bg-yellow-500 disabled:bg-yellow-300"
                  disabled={items.length === 0 || loading}
                  onClick={handleCheckout}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Finalizar"
                  )}
                </Button>

                {hasUniforme && (
                  <p className="text-[10px] text-blue-200 mt-1">
                    Para uniformes, escolha se já tem camisa (mantendo o
                    número atual) ou informe até 3 opções de número novo.
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
