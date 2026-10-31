-- AlterTable
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE IF NOT EXISTS "AvaliacaoEvento" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nota" INTEGER NOT NULL,
    "comentario" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvaliacaoEvento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AvaliacaoEvento_eventoId_idx" ON "AvaliacaoEvento"("eventoId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AvaliacaoEvento_eventoId_usuarioId_key" ON "AvaliacaoEvento"("eventoId", "usuarioId");

-- AddForeignKey
ALTER TABLE "AvaliacaoEvento" DROP CONSTRAINT IF EXISTS "AvaliacaoEvento_eventoId_fkey";
ALTER TABLE "AvaliacaoEvento" ADD CONSTRAINT "AvaliacaoEvento_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvaliacaoEvento" DROP CONSTRAINT IF EXISTS "AvaliacaoEvento_usuarioId_fkey";
ALTER TABLE "AvaliacaoEvento" ADD CONSTRAINT "AvaliacaoEvento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
