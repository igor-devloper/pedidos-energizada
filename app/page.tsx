// app/page.tsx
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus } from "lucide-react";

const UNIT_PRICE = 0.9;

const SALGADOS = [
  {
    id: "bolinho_queijo",
    nome: "Bolinho de queijo",
    descricao: "Clássico crocante por fora e cremoso por dentro.",
  },
  {
    id: "empada_frango",
    nome: "Empada de frango",
    descricao: "Massa amanteigada com recheio de frango temperado.",
  },
  {
    id: "empada_doce",
    nome: "Empada doce",
    descricao: "Opção doce para fechar a mesa de salgados.",
  },
  {
    id: "coxinha",
    nome: "Coxinha",
    descricao: "A campeã das festas, bem recheada e sequinha.",
  },
  {
    id: "pastel_acucarado_carne",
    nome: "Pastel açucarado de carne",
    descricao: "Tradicional pastel de carne com toque açucarado.",
  },
  {
    id: "pastel_forno_frango",
    nome: "Pastel de forno de frango",
    descricao: "Assado, leve e com recheio suculento.",
  },
  {
    id: "pastel_frito_carne",
    nome: "Pastel frito de carne",
    descricao: "Pastel frito de carne bem recheado e sequinho.",
  },
] as const;

type SalgadoId = (typeof SALGADOS)[number]["id"];
type QuantidadesState = Record<SalgadoId, number>;

function calcularLimiteTipos(total: number): number {
  if (total < 50) return 0;

  const centenas = Math.floor(total / 100);
  const resto = total % 100;

  let maxTipos = centenas * 3;
  if (resto >= 50) maxTipos += 2;

  return maxTipos;
}

export default function HomePage() {
  const router = useRouter();

  const [quantidades, setQuantidades] = useState<QuantidadesState>(
    SALGADOS.reduce(
      (acc, item) => ({ ...acc, [item.id]: 0 }),
      {} as QuantidadesState
    )
  );

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [endereco, setEndereco] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const tiposSelecionados = useMemo(
    () => Object.values(quantidades).filter((q) => q > 0).length,
    [quantidades]
  );

  const totalItens = useMemo(
    () => Object.values(quantidades).reduce((acc, v) => acc + v, 0),
    [quantidades]
  );

  const totalValor = useMemo(
    () => totalItens * UNIT_PRICE,
    [totalItens]
  );

  // respeita regra de mínimo 50, 25 por tipo e limite de tipos por quantidade
  const setQuantidadeSafely = (id: SalgadoId, novoValor: number) => {
    setQuantidades((prev) => {
      const atual = prev[id] ?? 0;
      let novo = Math.max(0, isNaN(novoValor) ? 0 : novoValor);

      // se está selecionando, mínimo 25 por tipo
      if (novo > 0 && novo < 25) {
        novo = 25;
      }

      const next = { ...prev, [id]: novo };

      const tiposDepois = Object.values(next).filter((q) => q > 0).length;
      const totalNextItens = Object.values(next).reduce(
        (acc, v) => acc + v,
        0
      );

      const maxTipos = calcularLimiteTipos(totalNextItens);

      if (totalNextItens < 50) {
        // abaixo de 50 não aplico limite de tipos ainda (já vou barrar no submit)
        return next;
      }

      if (tiposDepois > maxTipos && atual === 0 && novo > 0) {
        const msg =
          maxTipos === 2
            ? "Para essa quantidade você pode escolher no máximo 2 tipos de salgados."
            : `Para essa quantidade você pode escolher no máximo ${maxTipos} tipos de salgados.`;
        toast.error(msg);
        return prev;
      }

      return next;
    });
  };

  const handleChangeQuantidade = (id: SalgadoId, delta: number) => {
    const atual = quantidades[id] ?? 0;
    setQuantidadeSafely(id, atual + delta);
  };

  const handleQuantidadeInput = (id: SalgadoId, value: string) => {
    const parsed = Number(value.replace(/\D/g, ""));
    setQuantidadeSafely(id, parsed);
  };

  const handleSubmit = async () => {
    if (!nome || !telefone || !email || !endereco) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    if (totalItens < 50) {
      toast.error("O pedido mínimo é de 50 unidades de salgados.");
      return;
    }

    if (!acceptedTerms) {
      toast.error("Você precisa aceitar o Termo de Uso e Política de Privacidade.");
      return;
    }

    const itens = SALGADOS
      .map((s) => ({
        tipo: s.id,
        quantidade: quantidades[s.id],
      }))
      .filter((i) => i.quantidade > 0);

    try {
      setLoading(true);

      const res = await fetch("/api/encomendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          telefone,
          email,
          endereco,
          observacoes,
          itens,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Falha ao enviar encomenda");
      }

      const data = await res.json();
      const txid: string | undefined = data?.txid ?? data?.encomenda?.txid;

      toast.success("Encomenda enviada! Agora faça o pagamento para confirmar.");

      setQuantidades(
        SALGADOS.reduce(
          (acc, item) => ({ ...acc, [item.id]: 0 }),
          {} as QuantidadesState
        )
      );
      setObservacoes("");
      setAcceptedTerms(false);

      if (txid) {
        router.push(`/pagamento/${txid}`);
      }
      toast.info("Faça o pagamento para confirmar o pedido.");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao enviar encomenda");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 via-pink-50 to-white px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="relative h-25 w-50 md:h-16 md:w-16">
            <Image
              src="/vizinha-logo.png"
              alt="Logo Vizinha Salgateria"
              fill
              className="rounded-full border-[4px] border-pink-300 bg-white object-cover w-full shadow-md shadow-pink-200/80"
            />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-pink-700 md:text-2xl">
              Vizinha Salgateria – Encomendas de Fim de Ano
            </h1>
            <p className="text-xs text-pink-500 md:text-sm">
              Pedido mínimo de <span className="font-semibold">50 unidades</span>.{" "}
              Entre 50 e 99 unidades, até <span className="font-semibold">2 tipos</span>.{" "}
              A cada <span className="font-semibold">100 unidades</span>, mais{" "}
              <span className="font-semibold">3 tipos</span> de salgado.
            </p>
          </div>
        </div>

        <Card className="w-full border-pink-200 bg-white/95 shadow-xl shadow-pink-100/50">
          <CardHeader className="border-b border-pink-100 pb-4">
            <CardTitle className="text-base font-semibold text-pink-700">
              Monte seu pedido
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* GRID DOS SALGADOS */}
            <section className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {SALGADOS.map((salgado) => {
                  const qtd = quantidades[salgado.id] ?? 0;

                  return (
                    <div
                      key={salgado.id}
                      className="rounded-xl border border-pink-100 bg-pink-50/60 p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge className="bg-pink-100 text-pink-700 border border-pink-200">
                          Salgado
                        </Badge>
                        <span className="text-xs font-medium text-pink-500">
                          R$ 0,90 / un
                        </span>
                      </div>

                      <h3 className="mt-2 text-sm font-semibold text-slate-900">
                        {salgado.nome}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {salgado.descricao}
                      </p>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          Quantidade deste tipo
                        </span>

                        <div className="flex items-center gap-1 rounded-full bg-white px-2 py-1 shadow-sm">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 rounded-full border-pink-200 text-pink-500 hover:bg-pink-50"
                            onClick={() => handleChangeQuantidade(salgado.id, -25)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>

                          <Input
                            type="number"
                            min={0}
                            value={qtd === 0 ? "" : qtd}
                            onChange={(e) => handleQuantidadeInput(salgado.id, e.target.value)}
                            className="h-7 w-16 border-none bg-transparent p-0 text-center text-sm font-semibold text-slate-800 focus-visible:ring-0"
                          />

                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 rounded-full border-pink-500 bg-pink-500 text-white hover:bg-pink-600"
                            onClick={() => handleChangeQuantidade(salgado.id, 25)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs font-medium text-pink-600">
                Tipos selecionados:{" "}
                <span className="font-bold">
                  {tiposSelecionados}
                </span>
              </p>
            </section>

            <Separator className="bg-pink-100" />

            {/* FORM DADOS DO CLIENTE */}
            <section className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    Nome completo *
                  </label>
                  <Input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome"
                    className="border-pink-100 bg-white focus-visible:ring-pink-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    Telefone (WhatsApp) *
                  </label>
                  <Input
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(83) 9 0000-0000"
                    className="border-pink-100 bg-white focus-visible:ring-pink-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    E-mail *
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                    className="border-pink-100 bg-white focus-visible:ring-pink-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    Endereço (ou ponto de retirada) *
                  </label>
                  <Input
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Rua, número, bairro"
                    className="border-pink-100 bg-white focus-visible:ring-pink-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">
                  Observações
                </label>
                <Textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: data/horário desejado, restrições, recados..."
                  className="min-h-[72px] border-pink-100 bg-white focus-visible:ring-pink-400"
                />
              </div>
            </section>

            {/* RESUMO */}
            <section className="mt-2 flex flex-col justify-between gap-3 rounded-xl bg-pink-50/80 p-4 text-sm md:flex-row md:items-center">
              <div className="text-xs text-slate-600 md:text-sm">
                Itens:{" "}
                <span className="font-semibold text-slate-900">
                  {totalItens}
                </span>{" "}
                • Unit:{" "}
                <span className="font-semibold text-pink-700">
                  R$ {UNIT_PRICE.toFixed(2)}
                </span>
              </div>
              <div className="text-right text-sm font-semibold text-pink-700 md:text-base">
                Total:{" "}
                <span className="text-lg">
                  R$ {totalValor.toFixed(2)}
                </span>
              </div>
            </section>

            {/* TERMOS LGPD */}
            <section className="space-y-3">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(!!checked)}
                  className="mt-0.5 border-pink-300 data-[state=checked]:bg-pink-500 data-[state=checked]:text-white"
                />
                <label
                  htmlFor="terms"
                  className="text-xs text-slate-600 leading-snug"
                >
                  Declaro que li e aceito o{" "}
                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="text-pink-600 underline underline-offset-2 hover:text-pink-700"
                      >
                        Termo de Uso e Política de Privacidade
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl border-pink-200 bg-white text-slate-800">
                      <DialogHeader>
                        <DialogTitle className="text-pink-700">
                          Termo de Uso e Política de Privacidade
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 text-sm text-slate-700">
                        <p>
                          Ao enviar sua encomenda, você concorda que a
                          <strong> Vizinha Salgateria</strong> utilize os seus
                          dados exclusivamente para organização, contato e
                          emissão de comprovantes referentes a este pedido.
                        </p>
                        <p>
                          Seus dados não serão compartilhados com terceiros para
                          fins comerciais e serão mantidos apenas pelo período
                          necessário para controle das encomendas de fim de ano.
                        </p>
                        <p>
                          De acordo com a LGPD, você pode solicitar a correção ou
                          exclusão das suas informações entrando em contato pelo
                          WhatsApp informado na logo do site ou pelo e-mail que
                          será utilizado no seu pedido.
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>
                  .
                </label>
              </div>
            </section>

            {/* BOTÃO FINAL */}
            <div className="pt-2">
              <Button
                type="button"
                className="flex w-full items-center justify-center rounded-full bg-pink-600 py-5 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:bg-pink-300"
                disabled={loading || totalItens < 50 || !acceptedTerms}
                onClick={handleSubmit}
              >
                {loading ? "Enviando pedido..." : "Continuar para pagamento"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
