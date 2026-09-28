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
  const [formErrors, setFormErrors] = useState<{
    nome?: string;
    email?: string;
    telefone?: string;
  }>({});

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
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const nextErrors = {
        nome: fieldErrors.nome?.[0],
        email: fieldErrors.email?.[0],
        telefone: fieldErrors.telefone?.[0],
      };

      setFormErrors(nextErrors);

      const camposPendentes = [
        nextErrors.nome && "nome",
        nextErrors.email && "e-mail",
        nextErrors.telefone && "telefone",
      ].filter(Boolean);

      toast.error(
        camposPendentes.length === 1
          ? `Confira o campo ${camposPendentes[0]} antes de continuar.`
          : "Preencha corretamente seus dados antes de continuar.",
      );
      return;
    }

    setFormErrors({});

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
      const paymentUrl: string | undefined = data.paymentUrl;

      if (!paymentUrl) {
        throw new Error("Página de pagamento não encontrada.");
      }

      clearCart();
      router.push(paymentUrl);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao iniciar o pagamento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-5 sm:space-y-7">
        <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
              <ShoppingCart className="h-5 w-5" />
              Seu carrinho
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Revise os produtos, complete os dados e siga para o pagamento.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/")}
            className="w-full border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-100 sm:w-auto"
          >
            Voltar para produtos
          </Button>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,.75fr)] lg:items-start">
          {/* ITENS */}
          <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white text-slate-900 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-sm font-semibold text-slate-900 sm:text-base">
                Itens do carrinho
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {items.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Nenhum item no carrinho. Volte para a loja e adicione um
                  produto.
                </p>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {item.label}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          R$ {item.unitPrice.toFixed(2)} cada
                        </p>
                        {item.kind === "CANECA" && (
                          <p className="mt-1 text-[11px] text-slate-400">
                            Tipo:{" "}
                            {(item as any).tipoProduto === "CANECA"
                              ? "Caneca 850 mL"
                              : (item as any).tipoProduto === "TIRANTE"
                                ? "Tirante"
                                : "Kit Caneca + Tirante"}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateItem(item.id, {
                              quantity: Math.max(1, item.quantity - 1),
                            })
                          }
                          className="h-9 w-9 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
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
                          className="h-9 w-9 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          +
                        </button>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="ml-1 rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {item.kind === "UNIFORME" && (
                      <>
                        <Separator className="bg-slate-100" />

                        {/* modelo + tamanho + nome */}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-[11px] text-slate-500">
                              Modelo
                            </Label>
                            <Select
                              value={item.modelo}
                              onValueChange={(v) =>
                                updateItem(item.id, { modelo: v as Modelo })
                              }
                            >
                              <SelectTrigger className="border-slate-200 bg-white text-xs text-slate-900">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent className="border-slate-200 bg-white text-xs text-slate-900">
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
                            <Label className="text-[11px] text-slate-500">
                              Tamanho
                            </Label>
                            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                              <Select
                                value={item.tamanho}
                                onValueChange={(v) =>
                                  updateItem(item.id, { tamanho: v as Tamanho })
                                }
                              >
                                <SelectTrigger className="border-slate-200 bg-white text-xs text-slate-900">
                                  <SelectValue placeholder="Tam." />
                                </SelectTrigger>
                                <SelectContent className="border-slate-200 bg-white text-xs text-slate-900">
                                  {["PP", "P", "M", "G", "GG", "XG"].map((t) => (
                                    <SelectItem key={t} value={t}>
                                      {t}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Dialog>
                                <DialogTrigger className="">
                                  <Button className="border-slate-200 bg-white text-xs text-slate-900 font-normal">
                                    <RulerDimensionLine size={16} />
                                    <p>Tabela de tamanhos</p>
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="border-slate-200 bg-white">
                                  <DialogTitle className="text-slate-900">Tabela de tamanhos</DialogTitle>

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
                            <Label className="text-[11px] text-slate-500">
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
                              className="border-slate-200 bg-white text-xs text-slate-900 uppercase"
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
                              className="text-[11px] text-slate-500 cursor-pointer"
                            >
                              Já tenho camisa da Atlética e quero manter o
                              número que uso hoje.
                            </Label>
                          </div>

                          {(item as any).jaTemCamisa ? (
                            <div className="space-y-1">
                              <Label className="text-[11px] text-slate-500">
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
                                className="border-slate-200 bg-white text-xs text-slate-900 w-24 text-center"
                              />
                              <p className="text-[10px] text-slate-400">
                                Vamos tentar manter exatamente esse número
                                no novo uniforme.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Label className="text-[11px] text-slate-500">
                                Sugestões de número (até 3 opções)
                              </Label>
                              <div className="grid max-w-sm grid-cols-3 gap-2">
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
                                  className="border-slate-200 bg-white text-xs text-slate-900 text-center"
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
                                  className="border-slate-200 bg-white text-xs text-slate-900 text-center"
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
                                  className="border-slate-200 bg-white text-xs text-slate-900 text-center"
                                />
                              </div>
                              <p className="text-[10px] text-slate-400">
                                A Atlética vai escolher um número que ainda
                                não esteja em uso, respeitando essas
                                preferências.
                              </p>
                            </div>
                          )}

                          <p className="mt-1 text-[10px] text-slate-400">
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
          <div className="space-y-4 lg:sticky lg:top-6">
            {/* Dados do comprador */}
            <Card className="rounded-2xl border-slate-200 bg-white text-slate-900 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-900 sm:text-base">
                  Dados do comprador
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div>
                  <Label className="text-[11px] text-slate-500">Nome *</Label>
                  <Input
                    value={nome}
                    onChange={(e) => {
                      setNome(e.target.value);
                      if (formErrors.nome)
                        setFormErrors((prev) => ({ ...prev, nome: undefined }));
                    }}
                    aria-invalid={Boolean(formErrors.nome)}
                    className={`mt-1 bg-white text-sm text-slate-900 ${
                      formErrors.nome
                        ? "border-red-400 focus-visible:ring-red-200"
                        : "border-slate-200"
                    }`}
                  />
                  {formErrors.nome && (
                    <p className="mt-1.5 text-[11px] font-medium text-red-600">
                      {formErrors.nome}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-[11px] text-slate-500">E-mail *</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (formErrors.email)
                        setFormErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    aria-invalid={Boolean(formErrors.email)}
                    className={`mt-1 bg-white text-sm text-slate-900 ${
                      formErrors.email
                        ? "border-red-400 focus-visible:ring-red-200"
                        : "border-slate-200"
                    }`}
                  />
                  {formErrors.email && (
                    <p className="mt-1.5 text-[11px] font-medium text-red-600">
                      {formErrors.email}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-[11px] text-slate-500">
                    Telefone *
                  </Label>
                  <Input
                    value={telefone}
                    onChange={(e) => {
                      setTelefone(formatarTelefone(e.target.value));
                      if (formErrors.telefone)
                        setFormErrors((prev) => ({
                          ...prev,
                          telefone: undefined,
                        }));
                    }}
                    placeholder="(83) 99999-9999"
                    inputMode="tel"
                    aria-invalid={Boolean(formErrors.telefone)}
                    className={`mt-1 bg-white text-sm text-slate-900 ${
                      formErrors.telefone
                        ? "border-red-400 focus-visible:ring-red-200"
                        : "border-slate-200"
                    }`}
                  />
                  {formErrors.telefone && (
                    <p className="mt-1.5 text-[11px] font-medium text-red-600">
                      {formErrors.telefone}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Resumo + método + parcelas */}
            <Card className="rounded-2xl border-slate-200 bg-white text-slate-900 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-900 sm:text-base">
                  Resumo do pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs md:text-sm">
                <div className="space-y-2">
                  <Label className="text-[11px] text-slate-500">
                    Método de pagamento
                  </Label>
                  <Select
                    value={metodoPagamento}
                    onValueChange={(v) =>
                      setMetodoPagamento(v as MetodoPagamento)
                    }
                  >
                    <SelectTrigger className="border-slate-200 bg-white text-sm text-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-200 bg-white text-xs text-slate-900">
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="credito">
                        Cartão de crédito
                      </SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                    </SelectContent>
                  </Select>

                  {metodoPagamento === "credito" && (
                    <div className="mt-2">
                      <Label className="text-[11px] text-slate-500">
                        Parcelamento
                      </Label>
                      <Select
                        value={String(parcelas)}
                        onValueChange={(v) =>
                          setParcelas(Number(v) as Parcelas)
                        }
                      >
                        <SelectTrigger className="border-slate-200 bg-white text-sm text-slate-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-slate-200 bg-white text-xs text-slate-900">
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

                <Separator className="bg-slate-100 my-2" />

                <div className="flex justify-between gap-4 text-xs text-slate-500">
                  <span>Subtotal (sem taxas)</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-4 text-xs text-slate-500">
                  <span>
                    Taxa de serviço{" "}
                    <span className="text-[10px] text-slate-400">
                      ({(resumoTaxas.taxaPercentual * 100).toFixed(2)}%)
                    </span>
                  </span>
                  <span>R$ {resumoTaxas.taxaTotal.toFixed(2)}</span>
                </div>

                <div className="flex items-end justify-between gap-4 border-t border-slate-100 pt-3 text-sm font-semibold text-slate-950">
                  <span>Total a pagar</span>
                  <span>
                    R$ {resumoTaxas.totalConsumidor.toFixed(2)}
                  </span>
                </div>

                <Button
                  className="mt-3 h-12 w-full rounded-xl bg-blue-950 text-sm font-bold text-white shadow-sm transition hover:bg-blue-900 disabled:bg-slate-300"
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
                  <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
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
