"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
} from "@/components/ui/card";
import { ShoppingBag, Shirt, Tag, Wine, ShoppingCart } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import type { NewCartItem } from "@/lib/cart-types";

type Produto = {
  id: "KIT_UNIFORME" | "CAMISA" | "CANECA" | "TIRANTE" | "KIT_CANECA";
  titulo: string;
  preco: number;
  subtitulo: string;
  detalhe: string;
  img: string;
  icon: ReactNode;
};

export default function ProdutosPage() {
  const router = useRouter();
  const { addItem, items, total } = useCart();

  const produtos: Produto[] = [
    {
      id: "KIT_UNIFORME",
      titulo: "Kit Uniforme",
      preco: 90,
      subtitulo: "Camisa + Short",
      detalhe: "Uniforme completo oficial da Atlética.",
      img: "/kit.png",
      icon: <ShoppingBag className="h-4 w-4 text-yellow-300" />,
    },
    {
      id: "CAMISA",
      titulo: "Camisa Oficial",
      preco: 55,
      subtitulo: "Personalizada",
      detalhe: "Nome e número nas costas incluso.",
      img: "/uniforme_camisa.png",
      icon: <Shirt className="h-4 w-4 text-yellow-300" />,
    },
    {
      id: "CANECA",
      titulo: "Caneca 850 mL",
      preco: 25,
      subtitulo: "Alumínio azul",
      detalhe: "Resistente pra beber e pra jogar.",
      img: "/caneca-verso.png",
      icon: <Wine className="h-4 w-4 text-yellow-300" />,
    },
    {
      id: "TIRANTE",
      titulo: "Tirante",
      preco: 10,
      subtitulo: "Lanyard Energizada",
      detalhe: "Ideal pra carteirinha, chave ou crachá.",
      img: "/tira.png",
      icon: <Tag className="h-4 w-4 text-yellow-300" />,
    },
    {
      id: "KIT_CANECA",
      titulo: "Kit Caneca + Tirante",
      preco: 30,
      subtitulo: "Combo completo",
      detalhe: "Combina bar, arquibancada e resenha.",
      img: "/kit-caneca.png",
      icon: <Wine className="h-4 w-4 text-yellow-300" />,
    },
  ];

  const handleAddToCart = (produto: Produto) => {
    // mapeia para CartItem genérico; detalhes de uniforme serão preenchidos no carrinho
    if (produto.id === "KIT_UNIFORME" || produto.id === "CAMISA") {
      const item: NewCartItem = {
        kind: "UNIFORME",
        productId: produto.id,
        label: produto.titulo,
        unitPrice: produto.preco,
        quantity: 1,
        tipoPedido: produto.id === "KIT_UNIFORME" ? "KIT" : "BLUSA",
        // extras preenchidos depois
        modelo: undefined,
        tamanho: undefined,
        nomeCamisa: undefined,
        numeroCamisa: undefined,
      };
      addItem(item);
    } else {
      const tipoProduto =
        produto.id === "CANECA"
          ? "CANECA"
          : produto.id === "TIRANTE"
            ? "TIRANTE"
            : "KIT";

      const item: NewCartItem = {
        kind: "CANECA",
        productId: produto.id,
        label: produto.titulo,
        unitPrice: produto.preco,
        quantity: 1,
        tipoProduto,
      };
      addItem(item);
    }
  };

  return (
    <main className="min-h-screen bg-linear-to-b from-yellow-300 via-blue-800 to-blue-950 px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        {/* HEADER */}
        <header className="flex flex-col items-center gap-5 text-center relative">
          {/* botão carrinho */}
          <button
            type="button"
            onClick={() => router.push("/carrinho")}
            className="absolute right-0 top-0 flex items-center gap-2 rounded-full bg-blue-900/80 px-3 py-2 text-xs text-yellow-300 border border-yellow-400 shadow-md"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>{items.length} itens</span>
            <span className="text-[10px] text-blue-100">
              R$ {total.toFixed(2)}
            </span>
          </button>

          <div className="relative h-24 w-64 md:h-28 md:w-80">
            <Image
              src="/energizada-logo.png"
              alt="Atlética Energizada"
              fill
              className="object-contain drop-shadow-[0_0_18px_rgba(0,0,0,0.6)]"
              priority
            />
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-blue-950 drop-shadow-sm">
              Produtos Energizados ⚡
            </h1>
            <p className="mt-1 text-sm md:text-base text-blue-50/90 max-w-xl mx-auto">
              Toque em um dos produtos abaixo para adicionar ao carrinho e
              finalizar tudo junto.
            </p>
          </div>
        </header>

        {/* label */}
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-blue-100">
            Novos produtos
          </p>
        </div>

        {/* DESKTOP */}
        <div className="hidden md:flex justify-center">
          <div className="grid grid-cols-5 gap-6">
            {produtos.map((produto) => (
              <ProductCard
                key={produto.id}
                produto={produto}
                wrapperClass="w-full max-w-[260px]"
                onAdd={() => handleAddToCart(produto)}
              />
            ))}
          </div>
        </div>

        {/* MOBILE */}
        <div className="md:hidden -mx-4">
          <div className="flex gap-4 overflow-x-auto pb-6 px-4 scrollbar-thin scrollbar-thumb-blue-900/60 scrollbar-track-transparent">
            {produtos.map((produto) => (
              <ProductCard
                key={produto.id}
                produto={produto}
                wrapperClass="min-w-[230px] max-w-[240px]"
                onAdd={() => handleAddToCart(produto)}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function ProductCard({
  produto,
  wrapperClass,
  onAdd,
}: {
  produto: Produto;
  wrapperClass?: string;
  onAdd: () => void;
}) {
  return (
    <div className={`group ${wrapperClass}`}>
      <Card
        className="
          h-full bg-blue-950/90 border border-blue-900/80
          rounded-[22px] shadow-lg md:shadow-[0_18px_40px_rgba(0,0,0,0.65)]
          transition-all duration-200
          group-hover:border-yellow-300 group-hover:shadow-yellow-500/25
          group-hover:-translate-y-1 text-left flex flex-col
        "
      >
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-[11px] font-medium text-blue-100">
                {produto.icon}
                <span className="truncate">{produto.titulo}</span>
              </div>
              <CardDescription className="text-[11px] text-blue-300">
                {produto.subtitulo}
              </CardDescription>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-semibold text-yellow-300">
                R$ {produto.preco.toFixed(2)}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4 flex flex-col gap-3">
          <div className="relative h-24 rounded-xl overflow-hidden bg-linear-to-br from-blue-900 via-blue-800 to-blue-900">
            <Image
              src={produto.img}
              alt={produto.titulo}
              fill
              className="object-contain"
            />
          </div>

          <p className="text-[11px] text-blue-200 leading-snug flex-1">
            {produto.detalhe}
          </p>

          <button
            type="button"
            onClick={onAdd}
            className="mt-1 w-full rounded-full bg-yellow-400 text-blue-900 text-xs font-bold py-2 hover:bg-yellow-500"
          >
            Adicionar ao carrinho
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
