-- CreateEnum
CREATE TYPE "StatusCompraGrupo" AS ENUM ('PENDENTE', 'CONFIRMADA', 'EXPIRADA');

-- CreateEnum
CREATE TYPE "StatusParticipante" AS ENUM ('PENDENTE', 'PAGO', 'REEMBOLSADO');

-- DropForeignKey
ALTER TABLE "Grupo" DROP CONSTRAINT "Grupo_eventoId_fkey";

-- DropForeignKey
ALTER TABLE "Grupo" DROP CONSTRAINT "Grupo_loteId_fkey";

-- DropForeignKey
ALTER TABLE "MembroGrupo" DROP CONSTRAINT "MembroGrupo_pedidoId_fkey";

-- DropIndex
DROP INDEX "Grupo_eventoId_idx";

-- DropIndex
DROP INDEX "MembroGrupo_pedidoId_key";

-- AlterTable
ALTER TABLE "Lote" DROP COLUMN "minimoGrupo",
ADD COLUMN     "prazoGrupoHoras" INTEGER,
ADD COLUMN     "quantidadeReservada" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tamanhoGrupo" INTEGER;

-- AlterTable
ALTER TABLE "Grupo" DROP COLUMN "eventoId",
DROP COLUMN "loteId",
DROP COLUMN "metaMembros",
DROP COLUMN "status";

-- AlterTable
ALTER TABLE "MembroGrupo" DROP COLUMN "convidadoEm",
DROP COLUMN "pedidoId",
DROP COLUMN "status",
ADD COLUMN     "entrouEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropEnum
DROP TYPE "StatusGrupo";

-- DropEnum
DROP TYPE "StatusMembroGrupo";

-- CreateTable
CREATE TABLE "CompraGrupo" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "iniciadorId" TEXT NOT NULL,
    "status" "StatusCompraGrupo" NOT NULL DEFAULT 'PENDENTE',
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompraGrupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipanteCompra" (
    "id" TEXT NOT NULL,
    "compraGrupoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "pedidoId" TEXT,
    "status" "StatusParticipante" NOT NULL DEFAULT 'PENDENTE',

    CONSTRAINT "ParticipanteCompra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompraGrupo_grupoId_idx" ON "CompraGrupo"("grupoId");

-- CreateIndex
CREATE INDEX "CompraGrupo_loteId_idx" ON "CompraGrupo"("loteId");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipanteCompra_pedidoId_key" ON "ParticipanteCompra"("pedidoId");

-- CreateIndex
CREATE INDEX "ParticipanteCompra_usuarioId_idx" ON "ParticipanteCompra"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipanteCompra_compraGrupoId_usuarioId_key" ON "ParticipanteCompra"("compraGrupoId", "usuarioId");

-- AddForeignKey
ALTER TABLE "CompraGrupo" ADD CONSTRAINT "CompraGrupo_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompraGrupo" ADD CONSTRAINT "CompraGrupo_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompraGrupo" ADD CONSTRAINT "CompraGrupo_iniciadorId_fkey" FOREIGN KEY ("iniciadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipanteCompra" ADD CONSTRAINT "ParticipanteCompra_compraGrupoId_fkey" FOREIGN KEY ("compraGrupoId") REFERENCES "CompraGrupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipanteCompra" ADD CONSTRAINT "ParticipanteCompra_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipanteCompra" ADD CONSTRAINT "ParticipanteCompra_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

