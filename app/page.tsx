// app/uniformes/page.tsx
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingBag, Shirt } from "lucide-react";

export default function UniformesPage() {
  const router = useRouter();

  const goToPedido = (tipo: "KIT" | "BLUSA") => {
    router.push(`/pedidos?tipo=${tipo}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-yellow-300 via-blue-800 to-blue-950 px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        {/* HEADER */}
        <header className="flex flex-col items-center gap-4 text-center">
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
              Uniformes Energizada ⚡
            </h1>
            <p className="mt-1 text-sm md:text-base text-blue-50/90 max-w-xl mx-auto">
              Escolha o uniforme, veja os detalhes e clique em{" "}
              <span className="font-semibold text-yellow-300">comprar</span> para
              personalizar nome e número na próxima etapa.
            </p>
          </div>

          <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs md:text-sm">
            <span className="rounded-full bg-yellow-400 text-blue-900 px-3 py-1 font-bold shadow">
              Kit: R$ 90 (Camisa + Short)
            </span>
            <span className="rounded-full bg-blue-900/70 text-yellow-300 px-3 py-1 border border-yellow-300/70">
              Blusa: R$ 55 (somente camisa)
            </span>
          </div>
        </header>

        <Separator className="bg-blue-900/60" />

        {/* CARDS DOS PRODUTOS */}
        <section className="grid gap-6 md:grid-cols-2">
          {/* KIT CAMISA + SHORT */}
          {/* KIT CAMISA + SHORT */}
          <Card className="bg-blue-950/90 border-blue-800 shadow-2xl rounded-3xl overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-yellow-300 text-lg">
                <span>Kit Completo (Camisa + Short)</span>
                <span className="text-sm font-normal text-yellow-200 whitespace-nowrap">
                  R$ 90,00
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-4">
              {/* 🔥 Imagens lado a lado */}
              <div className="grid grid-cols-2 gap-2 w-full bg-blue-900 border border-blue-800 rounded-2xl">
                <div className="relative aspect-[9/12] rounded-xl overflow-hidden">
                  <Image
                    src="/uniforme_short.png" // troque pelo nome do short
                    alt="Short Energizada"
                    fill
                    className="object-contain p-2"
                  />
                </div>

                <div className="relative aspect-[9/12] rounded-xl overflow-hidden">
                  <Image
                    src="/uniforme_camisa.png" // troque pelo nome da camisa
                    alt="Camisa Energizada"
                    fill
                    className="object-contain p-2"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-2 text-sm text-blue-100">
                <p>
                  O kit inclui:
                  <span className="font-semibold text-yellow-300"> camisa + short oficial</span>{" "}
                  da Atlética Energizada.
                </p>
                <ul className="list-disc list-inside text-xs md:text-sm text-blue-100/90">
                  <li>Camisa azul com detalhes amarelos e efeito de eletricidade;</li>
                  <li>Short azul com laterais amarelas;</li>
                  <li>Personalização de nome e número inclusa;</li>
                  <li>Tamanhos do PP ao XG.</li>
                </ul>
              </div>

              <Button
                className="mt-auto w-full rounded-full bg-yellow-400 text-blue-900 font-bold hover:bg-yellow-500"
                onClick={() => goToPedido("KIT")}
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                Comprar Kit
              </Button>
            </CardContent>
          </Card>


          {/* SOMENTE CAMISA */}
          <Card className="bg-blue-950/90 border-blue-800 shadow-2xl rounded-3xl overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-yellow-300 text-lg">
                <span>Camisa Oficial Energizada</span>
                <span className="text-sm font-normal text-yellow-200">
                  R$ 55,00
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 border border-blue-800">
                <Image
                  src="/uniforme_camisa.png" // 🔧 troque para o PNG só da camisa
                  alt="Camisa oficial Energizada"
                  fill
                  className="object-contain"
                />
              </div>

              <div className="space-y-2 text-sm text-blue-100">
                <p>
                  A clássica{" "}
                  <span className="font-semibold text-yellow-300">
                    camisa azul Energizada
                  </span>{" "}
                  com raios em destaque e detalhes em amarelo.
                </p>
                <ul className="list-disc list-inside text-xs md:text-sm text-blue-100/90">
                  <li>Modelo oficial da Atlética;</li>
                  <li>Personalização de nome e número nas costas;</li>
                  <li>Tecidos leves, ideal para jogo ou resenha;</li>
                  <li>Tamanhos do PP ao XG.</li>
                </ul>
              </div>

              <Button
                className="mt-auto w-full rounded-full bg-yellow-400 text-blue-900 font-bold hover:bg-yellow-500"
                onClick={() => goToPedido("BLUSA")}
              >
                <Shirt className="mr-2 h-4 w-4" />
                Comprar só a camisa
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
