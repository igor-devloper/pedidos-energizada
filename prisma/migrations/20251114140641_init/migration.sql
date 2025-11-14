-- CreateEnum
CREATE TYPE "StatusEncomenda" AS ENUM ('aguardando_pagamento', 'pago_metade', 'pago', 'cancelado');

-- CreateEnum
CREATE TYPE "TipoSalgado" AS ENUM ('bolinho_queijo', 'empada_frango', 'empada_doce', 'coxinha', 'pastel_acucarado_carne', 'pastel_forno_frango');

-- CreateTable
CREATE TABLE "Encomenda" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "observacoes" TEXT,
    "totalItens" INTEGER NOT NULL,
    "totalValor" DECIMAL(10,2) NOT NULL,
    "status" "StatusEncomenda" NOT NULL DEFAULT 'aguardando_pagamento',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Encomenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncomendaItem" (
    "id" TEXT NOT NULL,
    "encomendaId" TEXT NOT NULL,
    "tipo" "TipoSalgado" NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valorUnit" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "EncomendaItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EncomendaItem" ADD CONSTRAINT "EncomendaItem_encomendaId_fkey" FOREIGN KEY ("encomendaId") REFERENCES "Encomenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
