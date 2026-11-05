-- O papel PRODUTOR deixa de existir: quem publica um evento passa a ser o gerente dele
-- (Evento.criadoPorId) e qualquer usuário pode publicar. Os antigos produtores viram CLIENTE.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Papel' AND e.enumlabel = 'PRODUTOR'
  ) THEN
    UPDATE "Usuario" SET "papel" = 'CLIENTE' WHERE "papel" = 'PRODUTOR';
    ALTER TYPE "Papel" RENAME TO "Papel_old";
    CREATE TYPE "Papel" AS ENUM ('CLIENTE', 'ADMIN');
    ALTER TABLE "Usuario" ALTER COLUMN "papel" DROP DEFAULT;
    ALTER TABLE "Usuario" ALTER COLUMN "papel" TYPE "Papel" USING ("papel"::text::"Papel");
    ALTER TABLE "Usuario" ALTER COLUMN "papel" SET DEFAULT 'CLIENTE';
    DROP TYPE "Papel_old";
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CargoEvento') THEN
    CREATE TYPE "CargoEvento" AS ENUM ('PROMOTOR', 'VALIDADOR');
  END IF;
END $$;

-- AlterTable
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "ocultoEm" TIMESTAMP(3);
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "ocultoMotivo" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "EventoMembro" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "cargo" "CargoEvento" NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoMembro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EventoMembro_usuarioId_idx" ON "EventoMembro"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EventoMembro_eventoId_usuarioId_key" ON "EventoMembro"("eventoId", "usuarioId");

-- AddForeignKey
ALTER TABLE "EventoMembro" DROP CONSTRAINT IF EXISTS "EventoMembro_eventoId_fkey";
ALTER TABLE "EventoMembro" ADD CONSTRAINT "EventoMembro_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoMembro" DROP CONSTRAINT IF EXISTS "EventoMembro_usuarioId_fkey";
ALTER TABLE "EventoMembro" ADD CONSTRAINT "EventoMembro_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
