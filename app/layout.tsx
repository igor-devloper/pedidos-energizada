// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Mulish } from "next/font/google";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { CartProvider } from "@/components/cart-provider";

const mulish = Mulish({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mulish",
});

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
    <html lang="pt-BR" className={mulish.variable}>
      <body
        className="
          antialiased
          text-slate-900
          font-sans
          [--font-sans:var(--font-mulish)]
        "
      >
        <CartProvider>{children}</CartProvider>
        <Toaster richColors position="top-center" />
        <Analytics />
      </body>
    </html>
  );
}
