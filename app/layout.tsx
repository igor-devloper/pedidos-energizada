// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Vizinha Salgateria - Encomendas de Fim de Ano",
  description: "Faça sua encomenda de salgados de fim de ano com a Vizinha Salgateria.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body
        className="
          min-h-screen
          bg-gradient-tx'o-b from-pink-50 via-white to-pink-100
          text-slate-900
          antialiased
        "
      >
        {/* fundo decorativo suave em rosa */}
        <div
          className="pointer-events-none fixed inset-0 opacity-50 -z-10"
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,#f9a8d4_0,transparent_45%),radial-gradient(circle_at_100%_0%,#f472b6_0,transparent_45%),radial-gradient(circle_at_50%_100%,#fce7f3_0,transparent_55%)]" />
        </div>

        {/* container principal */}


        <main className="flex-1 mt-10">{children}</main>

        <footer className="mt-8 border-t border-pink-100 pt-4 text-center text-xs text-pink-500">
          © {new Date().getFullYear()} Vizinha Salgateria · Encomendas via site ·
          WhatsApp (83) 98713-7721
        </footer>

        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
