import { NextResponse } from "next/server";
import crypto from "crypto";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { prisma } from "@/lib/db";

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
  options: { timeout: 10000 },
});

const paymentClient = new Payment(client);

type BrickPayload = {
  txid: string;
  formData: any;
};

export async function POST(req: Request) {
  try {
    const { txid, formData }: BrickPayload = await req.json();

    if (!txid || !formData) {
      return NextResponse.json(
        { error: "Dados de pagamento incompletos." },
        { status: 400 }
      );
    }

    const pedido = await prisma.pedidoCarrinho.findUnique({
      where: { txid },
    });

    if (!pedido) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    // Evita cobrar novamente um pedido que já foi pago.
    if (pedido.status === "PAGO") {
      return NextResponse.json({
        status: "approved",
        statusDetail: "already_paid",
      });
    }

    const body: any = {
      // O valor vem do pedido salvo no banco.
      // Assim o checkout não confia no valor enviado pelo navegador.
      transaction_amount: Number(
        Number(pedido.valorTotal).toFixed(2)
      ),

      token: formData.token || undefined,

      description: `Pedido Energizada #${txid}`,

      installments: Number(
        formData.installments || 1
      ),

      payment_method_id:
        formData.payment_method_id,

      issuer_id:
        formData.issuer_id ||
        formData.issuer ||
        undefined,

      external_reference: txid,

      notification_url:
        `${process.env.NEXT_PUBLIC_APP_URL}/api/mercadopago/webhook`,

      payer: {
        ...(formData.payer || {}),
        email:
          formData.payer?.email ||
          pedido.email,
      },
    };

    // Remove campos opcionais vazios antes de enviar ao Mercado Pago.
    Object.keys(body).forEach((key) => {
      if (body[key] === undefined) {
        delete body[key];
      }
    });

    const payment = await paymentClient.create({
      body,
      requestOptions: {
        idempotencyKey:
          `${txid}-${crypto.randomUUID()}`,
      },
    });

    const status =
      payment.status || "pending";

    /*
     * Status internos existentes no sistema:
     *
     * approved
     *      ↓
     * PAGO
     *
     * pending / in_process / rejected /
     * cancelled / outros
     *      ↓
     * AGUARDANDO_PAGAMENTO
     *
     * Não utilizamos "RECUSADO" porque esse valor
     * não existe no enum Status do Prisma.
     *
     * Além disso, manter AGUARDANDO_PAGAMENTO
     * permite uma nova tentativa caso o cartão
     * seja recusado.
     */
    const statusInterno:
      | "PAGO"
      | "AGUARDANDO_PAGAMENTO" =
      status === "approved"
        ? "PAGO"
        : "AGUARDANDO_PAGAMENTO";

    await prisma.pedidoCarrinho.update({
      where: { txid },

      data: {
        status: statusInterno,

        ...(status === "approved"
          ? {
              valorPago: Number(
                payment.transaction_amount ||
                  pedido.valorTotal
              ),
            }
          : {}),
      },
    });

    return NextResponse.json({
      id: payment.id,

      status,

      statusDetail:
        payment.status_detail,

      paymentMethodId:
        payment.payment_method_id,

      paymentTypeId:
        payment.payment_type_id,

      pointOfInteraction:
        payment.point_of_interaction,

      transactionDetails:
        payment.transaction_details,
    });
  } catch (error: any) {
    console.error(
      "[POST /api/checkout/payment]",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Não foi possível processar o pagamento.",
      },
      { status: 500 }
    );
  }
}