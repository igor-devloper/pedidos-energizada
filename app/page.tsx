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
import { ShoppingBag, Shirt, Tag, Wine } from "lucide-react";

type Produto = {
  id: string;
  titulo: string;
  preco: string;
  subtitulo: string;
  detalhe: string;
  img: string;
  onClick: () => void;
  icon: ReactNode;
};

export default function ProdutosPage() {
  const router = useRouter();

  const goToPedidoUniforme = (tipo: "KIT" | "BLUSA") => {
    router.push(`/pedidos?tipo=${tipo}`);
  };

  const goToCaneca = (produto: "CANECA" | "TIRANTE" | "KIT") => {
    router.push(`/pedidos-canecas?produto=${produto}`);
  };

  const produtos: Produto[] = [
    {
      id: "kit-uniforme",
      titulo: "Kit Uniforme",
      preco: "R$ 90,00",
      subtitulo: "Camisa + Short",
      detalhe: "Uniforme completo oficial da Atlética.",
      img: "/kit.png",
      onClick: () => goToPedidoUniforme("KIT"),
      icon: <ShoppingBag className="h-4 w-4 text-yellow-300" />,
    },
    {
      id: "camisa",
      titulo: "Camisa Oficial",
      preco: "R$ 55,00",
      subtitulo: "Personalizada",
      detalhe: "Nome e número nas costas incluso.",
      img: "/uniforme_camisa.png",
      onClick: () => goToPedidoUniforme("BLUSA"),
      icon: <Shirt className="h-4 w-4 text-yellow-300" />,
    },
    {
      id: "caneca",
      titulo: "Caneca 850 mL",
      preco: "R$ 25,00",
      subtitulo: "Alumínio azul",
      detalhe: "Resistente pra beber e pra jogar.",
      img: "/caneca-verso.png",
      onClick: () => goToCaneca("CANECA"),
      icon: <Wine className="h-4 w-4 text-yellow-300" />,
    },
    {
      id: "tirante",
      titulo: "Tirante",
      preco: "R$ 10,00",
      subtitulo: "Lanyard Energizada",
      detalhe: "Ideal pra carteirinha, chave ou crachá.",
      img: "/tira.png",
      onClick: () => goToCaneca("TIRANTE"),
      icon: <Tag className="h-4 w-4 text-yellow-300" />,
    },
    {
      id: "kit-caneca",
      titulo: "Kit Caneca + Tirante",
      preco: "R$ 30,00",
      subtitulo: "Combo completo",
      detalhe: "Combina bar, arquibancada e resenha.",
      img: "/kit-caneca.png",
      onClick: () => goToCaneca("KIT"),
      icon: <Wine className="h-4 w-4 text-yellow-300" />,
    },
  ];

  return (
    <main className="min-h-screen bg-linear-to-b from-yellow-300 via-blue-800 to-blue-950 px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        {/* LOGO + TÍTULO */}
        <header className="flex flex-col items-center gap-5 text-center">
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
              Toque em um dos produtos abaixo para fazer seu pedido.
            </p>
          </div>
        </header>

        {/* CHAMADA */}
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-blue-100">
            Novos produtos
          </p>
        </div>

        {/* DESKTOP / TABLET – GRADE CENTRALIZADA */}
        <div className="hidden md:flex justify-center">
          <div className="grid grid-cols-5 gap-6">
            {produtos.map((produto) => (
              <ProductCard
                key={produto.id}
                produto={produto}
                wrapperClass="w-full max-w-[260px]"
              />
            ))}
          </div>
        </div>

        {/* MOBILE – CARROSSEL HORIZONTAL FULL WIDTH */}
        <div className="md:hidden -mx-4">
          <div
            className="
              flex gap-4 overflow-x-auto pb-6 px-4
              scrollbar-thin scrollbar-thumb-blue-900/60 scrollbar-track-transparent
            "
          >
            {produtos.map((produto) => (
              <ProductCard
                key={produto.id}
                produto={produto}
                wrapperClass="min-w-[230px] max-w-[240px]"
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
}: {
  produto: Produto;
  wrapperClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={produto.onClick}
      className={`group ${wrapperClass} focus:outline-none`}
    >
      <Card
        className="
          h-full
          bg-blue-950/90
          border border-blue-900/80
          rounded-[22px]
          shadow-lg
          md:shadow-[0_18px_40px_rgba(0,0,0,0.65)]
          transition-all duration-200
          group-hover:border-yellow-300
          group-hover:shadow-yellow-500/25
          group-hover:-translate-y-1
          text-left
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
                {produto.preco}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4">
          <div className="relative mb-3 h-24 rounded-xl overflow-hidden bg-linear-to-br from-blue-900 via-blue-800 to-blue-900">
            <Image
              src={produto.img}
              alt={produto.titulo}
              fill
              className="object-contain"
            />
          </div>

          <p className="text-[11px] text-blue-200 leading-snug">
            {produto.detalhe}
          </p>
        </CardContent>
      </Card>
    </button>
  );
}
