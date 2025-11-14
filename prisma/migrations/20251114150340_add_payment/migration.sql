/*
  Warnings:

  - The values [aguardando_pagamento,pago_metade,pago,cancelado] on the enum `StatusEncomenda` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `totalValor` on the `Encomenda` table. All the data in the column will be lost.
  - You are about to drop the column `tipo` on the `EncomendaItem` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[txid]` on the table `Encomenda` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `txid` to the `Encomenda` table without a default value. This is not possible if the table is not empty.
  - Added the required column `valorTotal` to the `Encomenda` table without a default value. This is not possible if the table is not empty.
  - Added the required column `produto` to the `EncomendaItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StatusEncomenda_new" AS ENUM ('AGUARDANDO_PAGAMENTO', 'AGUARDANDO_VALIDACAO', 'CONFIRMADO', 'CANCELADO');
ALTER TABLE "public"."Encomenda" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Encomenda" ALTER COLUMN "status" TYPE "StatusEncomenda_new" USING ("status"::text::"StatusEncomenda_new");
ALTER TYPE "StatusEncomenda" RENAME TO "StatusEncomenda_old";
ALTER TYPE "StatusEncomenda_new" RENAME TO "StatusEncomenda";
DROP TYPE "public"."StatusEncomenda_old";
ALTER TABLE "Encomenda" ALTER COLUMN "status" SET DEFAULT 'AGUARDANDO_PAGAMENTO';
COMMIT;

-- DropForeignKey
ALTER TABLE "EncomendaItem" DROP CONSTRAINT "EncomendaItem_encomendaId_fkey";

-- AlterTable
ALTER TABLE "Encomenda" DROP COLUMN "totalValor",
ADD COLUMN     "comprovanteBase64" TEXT,
ADD COLUMN     "txid" TEXT NOT NULL,
ADD COLUMN     "valorTotal" DECIMAL(10,2) NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'AGUARDANDO_PAGAMENTO';

-- AlterTable
ALTER TABLE "EncomendaItem" DROP COLUMN "tipo",
ADD COLUMN     "produto" TEXT NOT NULL;

-- DropEnum
DROP TYPE "TipoSalgado";

-- CreateIndex
CREATE UNIQUE INDEX "Encomenda_txid_key" ON "Encomenda"("txid");

-- AddForeignKey
ALTER TABLE "EncomendaItem" ADD CONSTRAINT "EncomendaItem_encomendaId_fkey" FOREIGN KEY ("encomendaId") REFERENCES "Encomenda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
