"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Backpack, ShoppingBag, ShoppingCart, Shirt, Sparkles, Tag, Wine } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/components/cart-provider";
import type { NewCartItem } from "@/lib/cart-types";
import { Button } from "@/components/ui/button";

type Produto = {
  id: "KIT_UNIFORME" | "CAMISA" | "KIT_CANECA" | "TIRANTE" | "KIT_TOP_SHORT" | "BANDANA" | "SACOCHILA";
  titulo: string;
  preco: number | null;
  subtitulo: string;
  detalhe: string;
  img?: string;
  icon: ReactNode;
  disponivel?: boolean;
};

const produtos: Produto[] = [
  { id: "KIT_CANECA", titulo: "Caneca 500 ml + tirante", preco: 35, subtitulo: "Combo Energizada", detalhe: "Caneca de 500 ml acompanhada do tirante oficial.", img: "/kit-caneca.png", icon: <Wine className="h-4 w-4" /> },
  { id: "TIRANTE", titulo: "Tirante avulso", preco: 12, subtitulo: "Tirante Energizada", detalhe: "Tirante oficial vendido separadamente.", img: "/tira.png", icon: <Tag className="h-4 w-4" /> },
  { id: "KIT_UNIFORME", titulo: "Kit Uniforme", preco: 90, subtitulo: "Short + Blusa", detalhe: "Escolha a opção com manga ou sem manga no carrinho.", img: "/kit.png", icon: <ShoppingBag className="h-4 w-4" /> },
  { id: "CAMISA", titulo: "Apenas Blusa", preco: 60, subtitulo: "Com ou sem manga", detalhe: "Escolha o modelo e personalize no carrinho.", img: "/uniforme_camisa.png", icon: <Shirt className="h-4 w-4" /> },
  { id: "KIT_TOP_SHORT", titulo: "Kit Uniforme Top + Short", preco: null, subtitulo: "Novidade", detalhe: "Novo conjunto Energizada. Disponível em breve.", icon: <Shirt className="h-4 w-4" />, disponivel: false },
  { id: "BANDANA", titulo: "Bandana", preco: 55, subtitulo: "Novidade", detalhe: "Bandana oficial Energizada.", icon: <Sparkles className="h-4 w-4" /> },
  { id: "SACOCHILA", titulo: "Sacochila", preco: 45, subtitulo: "Novidade", detalhe: "Sacochila oficial Energizada.", icon: <Backpack className="h-4 w-4" /> },
];

export default function ProdutosPage() {
  const router = useRouter();
  const { addItem, items, total } = useCart();
  const quantidade = items.reduce((s, i) => s + i.quantity, 0);

  const add = (produto: Produto) => {
    if (!produto.disponivel && produto.disponivel === false) return;
    if (produto.preco == null) return;
    const item: NewCartItem = produto.id === "KIT_UNIFORME" || produto.id === "CAMISA"
      ? { kind: "UNIFORME", productId: produto.id, label: produto.titulo, unitPrice: produto.preco, quantity: 1, tipoPedido: produto.id === "KIT_UNIFORME" ? "KIT" : "BLUSA", modelo: undefined, tamanho: undefined, nomeCamisa: undefined, numeroCamisa: undefined }
      : { kind: "CANECA", productId: produto.id as any, label: produto.titulo, unitPrice: produto.preco, quantity: 1, tipoProduto: produto.id === "TIRANTE" ? "TIRANTE" : produto.id === "BANDANA" ? "BANDANA" : produto.id === "SACOCHILA" ? "SACOCHILA" : "KIT" } as any;
    addItem(item);
    toast.success(`${produto.titulo} adicionado ao carrinho`);
  };

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950">
      <div className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <Image src="/energizada-logo.png" alt="Atlética Energizada" width={180} height={64} className="h-12 w-auto object-contain" priority />
          <button onClick={() => router.push("/carrinho")} className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm transition hover:border-blue-200 hover:shadow-md">
            <span className="relative"><ShoppingCart className="h-5 w-5 text-blue-900" />{quantidade > 0 && <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-yellow-400 px-1 text-[9px] font-black text-blue-950">{quantidade}</span>}</span>
            <span className="hidden text-left sm:block"><span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Carrinho</span><span className="block text-xs font-extrabold text-slate-900">R$ {total.toFixed(2)}</span></span>
          </button>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 pb-8 pt-10 md:px-6 md:pt-14">
        <div className="overflow-hidden rounded-[32px] bg-[#071a52] px-6 py-9 text-white shadow-xl md:px-10 md:py-12">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-yellow-300"><Sparkles className="h-3.5 w-3.5" /> Loja oficial Energizada</div>
            <h1 className="text-3xl font-black leading-tight tracking-tight md:text-5xl">Produtos Energizados, agora com uma compra mais simples.</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-blue-100 md:text-base">Escolha seus produtos, personalize o uniforme no carrinho e finalize o pagamento com checkout transparente.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
        <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-blue-700">Produtos</p><h2 className="mt-1 text-2xl font-black tracking-tight">Escolha o seu</h2></div><p className="hidden text-sm text-slate-500 md:block">Pagamento seguro no próprio site</p></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {produtos.map((produto) => (
            <article key={produto.id} className="group flex min-h-[390px] flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div className="relative flex h-52 items-center justify-center bg-slate-50 p-5">{produto.img ? <Image src={produto.img} alt={produto.titulo} fill className="object-contain p-5 transition duration-300 group-hover:scale-[1.03]" /> : <div className="grid h-20 w-20 place-items-center rounded-3xl bg-blue-50 text-blue-900">{produto.icon}</div>}</div>
              <div className="flex flex-1 flex-col p-5">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-blue-800">{produto.icon}<span>{produto.subtitulo}</span></div>
                <h3 className="text-lg font-black">{produto.titulo}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">{produto.detalhe}</p>
                <div className="mt-auto pt-5">{produto.preco == null ? <p className="mb-3 text-xl font-black text-blue-950">Em breve</p> : <p className="mb-3 text-xl font-black text-blue-950">R$ {produto.preco.toFixed(2)}</p>}<Button disabled={produto.preco == null || produto.disponivel === false} onClick={() => add(produto)} className="w-full rounded-xl bg-blue-900 font-extrabold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">{produto.preco == null ? "Em breve" : "Adicionar"}{produto.preco != null && <ArrowRight className="ml-2 h-4 w-4" />}</Button></div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
