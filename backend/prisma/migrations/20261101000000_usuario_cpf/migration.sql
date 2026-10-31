-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "cpf" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Usuario_cpf_key" ON "Usuario"("cpf");
