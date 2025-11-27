// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CartItem } from "@/lib/cart-types";
import crypto from "crypto";
import { MercadoPagoConfig, Preference } from "mercadopago";

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
});

function generateTxId() {
  return crypto.randomBytes(10).toString("hex");
}

type Body = {
  nome: string;
  email: string;
  telefone: string;
  items: CartItem[];
};

export async function POST(req: Request) {
  try {
    const { nome, email, telefone, items }: Body = await req.json();

    if (!nome || !email || !telefone || !items || !items.length) {
      return NextResponse.json(
        { error: "Dados incompletos para checkout." },
        { status: 400 }
      );
    }

    const valorTotal = items.reduce(
      (sum, i) => sum + i.unitPrice * i.quantity,
      0
    );

    const txid = generateTxId();

    const pedido = await prisma.pedidoCarrinho.create({
      data: {
        nome,
        email,
        telefone,
        valorTotal,
        txid,
        itemsJson: items,
        status: "AGUARDANDO_PAGAMENTO",
      },
    });

    const preference = new Preference(mpClient);

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL!; // ex: http://localhost:3000

    const pref = await preference.create({
      body: {
        items: items.map((i) => ({
          id: i.productId,
          title: i.label,
          quantity: i.quantity,
          unit_price: Number(i.unitPrice.toFixed(2)),
          currency_id: "BRL",
        })),
        payer: {
          name: nome,
          email,
        },
        external_reference: pedido.txid,
        back_urls: {
          success: `${APP_URL}/final?status=success&txid=${pedido.txid}`,
          failure: `${APP_URL}/final?status=failure&txid=${pedido.txid}`,
          pending: `${APP_URL}/final?status=pending&txid=${pedido.txid}`,
        },
        notification_url: `${APP_URL}/api/mercadopago/webhook`, // importante!
        auto_return: "approved",
      },
    });

    return NextResponse.json({
      initPoint: pref.init_point,
      preferenceId: pref.id,
      txid: pedido.txid,
    });
  } catch (err) {
    console.error("[POST /api/checkout]", err);
    return NextResponse.json(
      { error: "Erro ao iniciar checkout." },
      { status: 500 }
    );
  }
}
