"use client";

import { useState, useMemo, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

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
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

const KIT_PRICE = 90;
const SHIRT_PRICE = 55;

type Modelo = "BRANCA" | "AZUL" | "AZUL_SEM_MANGA" | "";
type TipoPedido = "KIT" | "BLUSA" | "";
type Tamanho = "PP" | "P" | "M" | "G" | "GG" | "XG" | "";

// 🔹 componente que usa useSearchParams
function PedidosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tipoFromUrl = (searchParams.get("tipo") || "").toUpperCase();
  const initialTipo: TipoPedido =
    tipoFromUrl === "KIT" || tipoFromUrl === "BLUSA" ? (tipoFromUrl as TipoPedido) : "";

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  const [modelo, setModelo] = useState<Modelo>("");
  const [tipoPedido, setTipoPedido] = useState<TipoPedido>(initialTipo);
  const [tamanho, setTamanho] = useState<Tamanho>("");

  const [nomeCamisa, setNomeCamisa] = useState("");

  // NOVOS CAMPOS: já tem camisa + opções de número
  const [jaTemCamisa, setJaTemCamisa] = useState(false);
  const [numero1, setNumero1] = useState("");
  const [numero2, setNumero2] = useState("");
  const [numero3, setNumero3] = useState("");
  const [numeroAtual, setNumeroAtual] = useState("");

  const valor = useMemo(() => {
    if (tipoPedido === "KIT") return KIT_PRICE;
    if (tipoPedido === "BLUSA") return SHIRT_PRICE;
    return 0;
  }, [tipoPedido]);

  const normalizaNumero = (v: string) => v.replace(/\D/g, "").slice(0, 2);

  const validaNumero = (v: string) => {
    const limpo = normalizaNumero(v);
    if (!limpo) return false;
    const n = Number(limpo);
    return n >= 0 && n <= 99;
  };

  const handleSubmit = async () => {
    if (!nome || !email || !telefone || !modelo || !tipoPedido || !tamanho) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    if (!nomeCamisa.trim()) {
      toast.error("Informe o nome para vir atrás da camisa.");
      return;
    }

    if (jaTemCamisa) {
      if (!validaNumero(numeroAtual)) {
        toast.error("Informe o número atual da camisa (entre 0 e 99).");
        return;
      }
    } else {
      if (!validaNumero(numero1) || !validaNumero(numero2) || !validaNumero(numero3)) {
        toast.error("Preencha as 3 opções de número entre 0 e 99.");
        return;
      }
    }

    if (valor <= 0) {
      toast.error("Escolha se quer Kit ou só a Blusa.");
      return;
    }

    const numero1Limpo = normalizaNumero(numero1);
    const numero2Limpo = normalizaNumero(numero2);
    const numero3Limpo = normalizaNumero(numero3);
    const numeroAtualLimpo = normalizaNumero(numeroAtual);

    // número principal que vamos gravar (pra manter compatível com o backend atual)
    const numeroCamisaPrincipal = jaTemCamisa
      ? numeroAtualLimpo
      : numero1Limpo;

    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          email,
          telefone,
          modelo,
          tamanho,
          tipoPedido,
          valorTotal: valor,
          nomeCamisa,
          numeroCamisa: numeroCamisaPrincipal,
          jaTemCamisa,
          numeroOpcao1: numero1Limpo || null,
          numeroOpcao2: jaTemCamisa ? null : numero2Limpo || null,
          numeroOpcao3: jaTemCamisa ? null : numero3Limpo || null,
          numeroCamisaAtual: jaTemCamisa ? numeroAtualLimpo : null,
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

  const labelModelo = (m: Modelo) => {
    if (m === "BRANCA") return "Camisa branca";
    if (m === "AZUL") return "Camisa azul";
    if (m === "AZUL_SEM_MANGA") return "Camisa azul sem manga";
    return "-";
  };

  const labelTipo = (t: TipoPedido) => {
    if (t === "KIT") return "Kit (Camisa + Short)";
    if (t === "BLUSA") return "Somente camisa";
    return "-";
  };

  return (
    <main className="min-h-screen bg-linear-to-b from-yellow-300 via-blue-800 to-blue-950 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* HEADER COM A LOGO */}
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
                Uniformes Energizada ⚡
              </h1>
              <p className="text-xs md:text-sm text-blue-100 mt-1">
                Escolha seu modelo, personalize nome e número e finalize seu pedido.
              </p>

              <div className="mt-3 flex flex-wrap justify-center md:justify-start gap-2 text-xs">
                <span className="rounded-full bg-yellow-400 text-blue-900 px-3 py-1 font-bold shadow">
                  Kit: R$ 90 (Camisa + Short)
                </span>
                <span className="rounded-full bg-blue-700 text-yellow-300 px-3 py-1 border border-yellow-400/70">
                  Blusa: R$ 55 (somente camisa)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD PRINCIPAL */}
        <Card className="w-full border-blue-800 bg-blue-950/90 text-white shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-blue-800 pb-3">
            <CardTitle className="text-base md:text-lg font-semibold text-yellow-300 flex items-center gap-2">
              Faça seu pedido
              <span className="text-[10px] md:text-xs text-blue-200 font-normal">
                (* campos obrigatórios)
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              {/* FORMULÁRIO */}
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

                {/* Modelo / tipo / tamanho */}
                <section className="space-y-3">
                  <div>
                    <Label className="text-xs text-blue-200">Modelo da camisa *</Label>
                    <Select onValueChange={(v) => setModelo(v as Modelo)}>
                      <SelectTrigger className="mt-1 bg-blue-900/70 border-blue-700 text-white focus-visible:ring-yellow-400">
                        <SelectValue placeholder="Selecione o modelo" />
                      </SelectTrigger>
                      <SelectContent className="bg-blue-900 text-white border-blue-700">
                        <SelectItem value="BRANCA">Camisa branca</SelectItem>
                        <SelectItem value="AZUL">Camisa azul</SelectItem>
                        <SelectItem value="AZUL_SEM_MANGA">
                          Camisa azul sem manga
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-blue-200">Tipo do pedido *</Label>
                    <Select
                      value={tipoPedido || undefined}
                      onValueChange={(v) => setTipoPedido(v as TipoPedido)}
                    >
                      <SelectTrigger className="mt-1 bg-blue-900/70 border-blue-700 text-white focus-visible:ring-yellow-400">
                        <SelectValue placeholder="Escolha uma opção" />
                      </SelectTrigger>
                      <SelectContent className="bg-blue-900 text-white border-blue-700">
                        <SelectItem value="KIT">Kit (Camisa + Short) — R$ 90</SelectItem>
                        <SelectItem value="BLUSA">
                          Somente camisa — R$ 55
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-blue-200">Tamanho *</Label>
                    <Select onValueChange={(v) => setTamanho(v as Tamanho)}>
                      <SelectTrigger className="mt-1 bg-blue-900/70 border-blue-700 text-white focus-visible:ring-yellow-400">
                        <SelectValue placeholder="Selecione o tamanho" />
                      </SelectTrigger>
                      <SelectContent className="bg-blue-900 text-white border-blue-700">
                        <SelectItem value="PP">PP</SelectItem>
                        <SelectItem value="P">P</SelectItem>
                        <SelectItem value="M">M</SelectItem>
                        <SelectItem value="G">G</SelectItem>
                        <SelectItem value="GG">GG</SelectItem>
                        <SelectItem value="XG">XG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </section>

                <Separator className="bg-blue-800" />

                {/* Nome / número atrás */}
                <section className="space-y-3">
                  <div>
                    <Label className="text-xs text-blue-200">
                      Nome para vir atrás da camisa *
                    </Label>
                    <Input
                      value={nomeCamisa}
                      onChange={(e) => setNomeCamisa(e.target.value.toUpperCase())}
                      placeholder="EX: WAGNER"
                      maxLength={14}
                      className="mt-1 bg-blue-900/70 border-blue-700 text-white placeholder:text-blue-300 uppercase tracking-widest focus-visible:ring-yellow-400"
                    />
                    <p className="mt-1 text-[10px] text-blue-300">
                      Máx. 14 caracteres (será impresso em caixa alta).
                    </p>
                  </div>

                  {/* Caixinha "já tenho camisa" */}
                  <div className="flex items-start gap-2 mt-2">
                    <Checkbox
                      id="jaTemCamisa"
                      checked={jaTemCamisa}
                      onCheckedChange={(v) => setJaTemCamisa(v === true)}
                      className="mt-0.5 border-blue-400 data-[state=checked]:bg-yellow-400 data-[state=checked]:border-yellow-400"
                    />
                    <div>
                      <Label
                        htmlFor="jaTemCamisa"
                        className="text-xs text-blue-100 cursor-pointer"
                      >
                        Já tenho a camisa da Energizada
                      </Label>
                      <p className="text-[10px] text-blue-300">
                        Se você já possui a camisa oficial, marque essa opção
                        e informe o número que você já utiliza.
                      </p>
                    </div>
                  </div>

                  {jaTemCamisa ? (
                    <div>
                      <Label className="text-xs text-blue-200">
                        Número atual da sua camisa *
                      </Label>
                      <Input
                        value={numeroAtual}
                        onChange={(e) =>
                          setNumeroAtual(normalizaNumero(e.target.value))
                        }
                        placeholder="Ex: 10"
                        className="mt-1 bg-blue-900/70 border-blue-700 text-white placeholder:text-blue-300 focus-visible:ring-yellow-400 w-24"
                      />
                      <p className="mt-1 text-[10px] text-blue-300">
                        Número entre 0 e 99 (o mesmo que já está na sua camisa).
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-xs text-blue-200">
                        Opções de número para a camisa *
                      </Label>
                      <p className="text-[10px] text-blue-300">
                        Informe 3 opções de número (caso algum já esteja sendo usado).
                      </p>
                      <div className="flex gap-3">
                        <div>
                          <p className="text-[10px] text-blue-200 mb-1">Opção 1</p>
                          <Input
                            value={numero1}
                            onChange={(e) =>
                              setNumero1(normalizaNumero(e.target.value))
                            }
                            placeholder="10"
                            className="bg-blue-900/70 border-blue-700 text-white placeholder:text-blue-300 focus-visible:ring-yellow-400 w-20"
                          />
                        </div>
                        <div>
                          <p className="text-[10px] text-blue-200 mb-1">Opção 2</p>
                          <Input
                            value={numero2}
                            onChange={(e) =>
                              setNumero2(normalizaNumero(e.target.value))
                            }
                            placeholder="7"
                            className="bg-blue-900/70 border-blue-700 text-white placeholder:text-blue-300 focus-visible:ring-yellow-400 w-20"
                          />
                        </div>
                        <div>
                          <p className="text-[10px] text-blue-200 mb-1">Opção 3</p>
                          <Input
                            value={numero3}
                            onChange={(e) =>
                              setNumero3(normalizaNumero(e.target.value))
                            }
                            placeholder="22"
                            className="bg-blue-900/70 border-blue-700 text-white placeholder:text-blue-300 focus-visible:ring-yellow-400 w-20"
                          />
                        </div>
                      </div>
                      <p className="mt-1 text-[10px] text-blue-300">
                        Números entre 0 e 99. A atlética vai escolher um disponível.
                      </p>
                    </div>
                  )}
                </section>
              </div>

              {/* PREVIEW */}
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-yellow-400 via-yellow-300 to-blue-600 border border-yellow-500 shadow-xl">
                  <div className="relative p-4 space-y-1 bg-linear-to-t from-blue-900/90 via-blue-900/70 to-transparent">
                    <p className="text-xs font-semibold text-blue-900">
                      Preview do pedido
                    </p>
                    <p className="text-sm text-white">
                      <span className="font-semibold">Modelo: </span>
                      {labelModelo(modelo)}
                    </p>
                    <p className="text-sm text-white">
                      <span className="font-semibold">Tipo: </span>
                      {labelTipo(tipoPedido)}
                    </p>
                    <p className="text-sm text-white">
                      <span className="font-semibold">Tamanho: </span>
                      {tamanho || "-"}
                    </p>
                    <p className="text-sm text-white">
                      <span className="font-semibold">Nome atrás: </span>
                      {nomeCamisa || "-"}
                    </p>

                    {jaTemCamisa ? (
                      <p className="text-sm text-white">
                        <span className="font-semibold">Número: </span>
                        {numeroAtual || "-"}{" "}
                        <span className="text-[11px] text-yellow-200">
                          (já tenho camisa)
                        </span>
                      </p>
                    ) : (
                      <p className="text-sm text-white">
                        <span className="font-semibold">Nº preferidos: </span>
                        {[numero1 || "-", numero2 || "-", numero3 || "-"].join(
                          " / "
                        )}
                      </p>
                    )}

                    <p className="mt-2 text-sm font-semibold text-yellow-300">
                      Total:
                      <span className="text-xl font-extrabold ml-1">
                        R$ {valor.toFixed(2)}
                      </span>
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleSubmit}
                  className="w-full rounded-full bg-yellow-400 text-blue-900 font-bold py-5 text-sm md:text-base hover:bg-yellow-500 disabled:bg-yellow-300"
                  disabled={valor <= 0}
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

// 🔹 wrapper com Suspense — é o default export da página
export default function HomePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-blue-950" />}>
      <PedidosContent />
    </Suspense>
  );
}
