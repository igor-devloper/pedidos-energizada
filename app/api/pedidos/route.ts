import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateTxId } from "@/lib/pix";



export async function GET() {
  try {
    const pedidos = await prisma.pedido.findMany({
      orderBy: { createdAt: "desc" },
    });

    const data = pedidos.map((p) => ({
      ...p,
      valorTotal: Number(p.valorTotal),
      valorPago: p.valorPago != null ? Number(p.valorPago) : null,
    }));

    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/pedidos]", err);
    return NextResponse.json(
      { error: "Erro ao listar pedidos" },
      { status: 500 }
    );
  }
}


export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      nome,
      email,
      telefone,
      modelo,
      tamanho,
      tipoPedido,
      valorTotal,
      nomeCamisa,
      numeroCamisa,
    } = body;

    if (
      !nome ||
      !email ||
      !telefone ||
      !modelo ||
      !tamanho ||
      !tipoPedido ||
      !nomeCamisa ||
      !numeroCamisa
    ) {
      return NextResponse.json(
        { error: "Campos obrigatórios não preenchidos." },
        { status: 400 }
      );
    }

    const txid = generateTxId();

    const pedido = await prisma.pedido.create({
      data: {
        nome,
        email,
        telefone,
        modelo,
        tamanho,
        tipoPedido,
        valorTotal,
        nomeCamisa,
        numeroCamisa,
        txid,
      },
    });

    return NextResponse.json({ txid, pedido });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Erro ao criar pedido." },
      { status: 500 }
    );
  }
}
