/*
  Warnings:

  - You are about to drop the column `produto` on the `EncomendaItem` table. All the data in the column will be lost.
  - You are about to drop the column `valorUnit` on the `EncomendaItem` table. All the data in the column will be lost.
  - Added the required column `tipo` to the `EncomendaItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "EncomendaItem" DROP CONSTRAINT "EncomendaItem_encomendaId_fkey";

-- AlterTable
ALTER TABLE "EncomendaItem" DROP COLUMN "produto",
DROP COLUMN "valorUnit",
ADD COLUMN     "tipo" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "EncomendaItem" ADD CONSTRAINT "EncomendaItem_encomendaId_fkey" FOREIGN KEY ("encomendaId") REFERENCES "Encomenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
