-- Fim do ADMIN geral: a autoridade passa a vir da função da pessoa em cada evento.

-- CreateEnum
CREATE TYPE "FuncaoEvento" AS ENUM ('DONO', 'PRODUTOR', 'PORTEIRO');

-- CreateTable
CREATE TABLE "MembroEvento" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "funcao" "FuncaoEvento" NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembroEvento_pkey" PRIMARY KEY ("id")
);

-- Quem criou cada evento existente vira o DONO dele.
INSERT INTO "MembroEvento" ("id", "eventoId", "usuarioId", "funcao")
SELECT gen_random_uuid()::text, "id", "criadoPorId", 'DONO'
FROM "Evento"
WHERE "criadoPorId" IS NOT NULL;

-- AlterTable
ALTER TABLE "Usuario" DROP COLUMN "papel",
ADD COLUMN     "podeResetarSeed" BOOLEAN NOT NULL DEFAULT false;

-- DropEnum
DROP TYPE "Papel";

-- CreateIndex
CREATE INDEX "MembroEvento_usuarioId_idx" ON "MembroEvento"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "MembroEvento_eventoId_usuarioId_key" ON "MembroEvento"("eventoId", "usuarioId");

-- CreateIndex
CREATE INDEX "ValidacaoIngresso_eventoId_criadoEm_idx" ON "ValidacaoIngresso"("eventoId", "criadoEm");

-- AddForeignKey
ALTER TABLE "MembroEvento" ADD CONSTRAINT "MembroEvento_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembroEvento" ADD CONSTRAINT "MembroEvento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
