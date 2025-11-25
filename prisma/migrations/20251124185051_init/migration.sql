/*
  Warnings:

  - You are about to drop the `Encomenda` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EncomendaItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Modelo" AS ENUM ('BRANCA', 'AZUL', 'AZUL_SEM_MANGA');

-- CreateEnum
CREATE TYPE "Tamanho" AS ENUM ('PP', 'P', 'M', 'G', 'GG', 'XG');

-- CreateEnum
CREATE TYPE "TipoPedido" AS ENUM ('KIT', 'BLUSA');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('AGUARDANDO_PAGAMENTO', 'PAGO', 'CANCELADO');

-- DropForeignKey
ALTER TABLE "EncomendaItem" DROP CONSTRAINT "EncomendaItem_encomendaId_fkey";

-- DropTable
DROP TABLE "Encomenda";

-- DropTable
DROP TABLE "EncomendaItem";

-- DropEnum
DROP TYPE "StatusEncomenda";

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "modelo" "Modelo" NOT NULL,
    "tamanho" "Tamanho" NOT NULL,
    "tipoPedido" "TipoPedido" NOT NULL,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "txid" TEXT NOT NULL,
    "comprovanteBase64" TEXT,
    "status" "Status" NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_txid_key" ON "Pedido"("txid");
