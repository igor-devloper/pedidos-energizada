-- AlterEnum
ALTER TYPE "StatusEncomenda" ADD VALUE 'PAGO_METADE';

-- AlterTable
ALTER TABLE "Encomenda" ADD COLUMN     "valorPago" DECIMAL(10,2);
