-- Idempotente: o banco de produção já tinha destaque/horario (aplicados fora das migrações).
-- AlterTable
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "destaque" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "horario" TIME;

-- CreateTable
CREATE TABLE IF NOT EXISTS "_AtracoesEvento" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AtracoesEvento_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "_AtracoesEvento_B_index" ON "_AtracoesEvento"("B");

-- AddForeignKey
ALTER TABLE "_AtracoesEvento" DROP CONSTRAINT IF EXISTS "_AtracoesEvento_A_fkey";
ALTER TABLE "_AtracoesEvento" ADD CONSTRAINT "_AtracoesEvento_A_fkey" FOREIGN KEY ("A") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AtracoesEvento" DROP CONSTRAINT IF EXISTS "_AtracoesEvento_B_fkey";
ALTER TABLE "_AtracoesEvento" ADD CONSTRAINT "_AtracoesEvento_B_fkey" FOREIGN KEY ("B") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

