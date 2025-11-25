// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: "Energizada",
  description: "Faça seu pedido dos produtos Energizados",
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
          text-slate-900
          antialiased
        "
      >


        <main className="flex-1">{children}</main>

        <Toaster richColors position="top-center" />
        <Analytics/>
      </body>
    </html>
  );
}
