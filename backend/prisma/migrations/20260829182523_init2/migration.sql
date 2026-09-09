/*
  Warnings:

  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Event` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Lot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Order` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Ticket` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketValidation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('CLIENTE', 'PRODUTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "StatusEvento" AS ENUM ('RASCUNHO', 'PUBLICADO', 'CANCELADO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('PENDENTE', 'PAGO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusGrupo" AS ENUM ('ABERTO', 'CONFIRMADO', 'EXPIRADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusMembroGrupo" AS ENUM ('CONVIDADO', 'PENDENTE', 'PAGO', 'RECUSADO');

-- CreateEnum
CREATE TYPE "StatusIngresso" AS ENUM ('VALIDO', 'USADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "ResultadoValidacao" AS ENUM ('VALIDO', 'JA_UTILIZADO', 'INVALIDO');

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Lot" DROP CONSTRAINT "Lot_eventId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_eventId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_lotId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_eventId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_lotId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "TicketValidation" DROP CONSTRAINT "TicketValidation_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "TicketValidation" DROP CONSTRAINT "TicketValidation_validatedById_fkey";

-- DropTable
DROP TABLE "Category";

-- DropTable
DROP TABLE "Event";

-- DropTable
DROP TABLE "Lot";

-- DropTable
DROP TABLE "Order";

-- DropTable
DROP TABLE "Ticket";

-- DropTable
DROP TABLE "TicketValidation";

-- DropTable
DROP TABLE "User";

-- DropEnum
DROP TYPE "EventStatus";

-- DropEnum
DROP TYPE "OrderStatus";

-- DropEnum
DROP TYPE "TicketStatus";

-- DropEnum
DROP TYPE "ValidationResult";

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "papel" "Papel" NOT NULL DEFAULT 'CLIENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evento" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "imagemUrl" TEXT,
    "comecaEm" TIMESTAMP(3) NOT NULL,
    "terminaEm" TIMESTAMP(3),
    "nomeLocal" TEXT,
    "cidade" TEXT NOT NULL,
    "categoriaId" TEXT,
    "criadoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lote" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "quantidadeVendida" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "minimoGrupo" INTEGER,
    "descontoGrupo" DECIMAL(5,4),

    CONSTRAINT "Lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "status" "StatusPedido" NOT NULL DEFAULT 'PENDENTE',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "desconto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxaServico" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valor" DECIMAL(10,2) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pagoEm" TIMESTAMP(3),

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grupo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "liderId" TEXT NOT NULL,
    "metaMembros" INTEGER NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "status" "StatusGrupo" NOT NULL DEFAULT 'ABERTO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembroGrupo" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "status" "StatusMembroGrupo" NOT NULL DEFAULT 'CONVIDADO',
    "pedidoId" TEXT,
    "convidadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembroGrupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingresso" (
    "id" TEXT NOT NULL,
    "codigoQr" TEXT NOT NULL,
    "status" "StatusIngresso" NOT NULL DEFAULT 'VALIDO',
    "eventoId" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "donoId" TEXT NOT NULL,
    "emitidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usadoEm" TIMESTAMP(3),

    CONSTRAINT "Ingresso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidacaoIngresso" (
    "id" TEXT NOT NULL,
    "codigoLido" TEXT NOT NULL,
    "ingressoId" TEXT,
    "eventoId" TEXT NOT NULL,
    "validadoPorId" TEXT NOT NULL,
    "resultado" "ResultadoValidacao" NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValidacaoIngresso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_username_key" ON "Usuario"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nome_key" ON "Categoria"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_slug_key" ON "Categoria"("slug");

-- CreateIndex
CREATE INDEX "Evento_cidade_idx" ON "Evento"("cidade");

-- CreateIndex
CREATE INDEX "Lote_eventoId_idx" ON "Lote"("eventoId");

-- CreateIndex
CREATE INDEX "Pedido_usuarioId_idx" ON "Pedido"("usuarioId");

-- CreateIndex
CREATE INDEX "Pedido_eventoId_idx" ON "Pedido"("eventoId");

-- CreateIndex
CREATE INDEX "Grupo_eventoId_idx" ON "Grupo"("eventoId");

-- CreateIndex
CREATE INDEX "Grupo_liderId_idx" ON "Grupo"("liderId");

-- CreateIndex
CREATE UNIQUE INDEX "MembroGrupo_pedidoId_key" ON "MembroGrupo"("pedidoId");

-- CreateIndex
CREATE INDEX "MembroGrupo_usuarioId_idx" ON "MembroGrupo"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "MembroGrupo_grupoId_usuarioId_key" ON "MembroGrupo"("grupoId", "usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Ingresso_codigoQr_key" ON "Ingresso"("codigoQr");

-- CreateIndex
CREATE INDEX "Ingresso_eventoId_idx" ON "Ingresso"("eventoId");

-- CreateIndex
CREATE INDEX "Ingresso_donoId_idx" ON "Ingresso"("donoId");

-- CreateIndex
CREATE INDEX "ValidacaoIngresso_ingressoId_idx" ON "ValidacaoIngresso"("ingressoId");

-- CreateIndex
CREATE INDEX "ValidacaoIngresso_eventoId_idx" ON "ValidacaoIngresso"("eventoId");

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_liderId_fkey" FOREIGN KEY ("liderId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembroGrupo" ADD CONSTRAINT "MembroGrupo_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembroGrupo" ADD CONSTRAINT "MembroGrupo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembroGrupo" ADD CONSTRAINT "MembroGrupo_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingresso" ADD CONSTRAINT "Ingresso_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingresso" ADD CONSTRAINT "Ingresso_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingresso" ADD CONSTRAINT "Ingresso_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingresso" ADD CONSTRAINT "Ingresso_donoId_fkey" FOREIGN KEY ("donoId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidacaoIngresso" ADD CONSTRAINT "ValidacaoIngresso_ingressoId_fkey" FOREIGN KEY ("ingressoId") REFERENCES "Ingresso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidacaoIngresso" ADD CONSTRAINT "ValidacaoIngresso_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidacaoIngresso" ADD CONSTRAINT "ValidacaoIngresso_validadoPorId_fkey" FOREIGN KEY ("validadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
