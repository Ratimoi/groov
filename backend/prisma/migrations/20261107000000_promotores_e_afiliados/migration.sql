-- Programa de promotores: condições no evento, código por promotor e venda atribuída ao promotor.
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "descontoAfiliado" DECIMAL(5,4);
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "comissaoPromotor" DECIMAL(5,4);

ALTER TABLE "EventoMembro" ADD COLUMN IF NOT EXISTS "codigoAfiliado" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "EventoMembro_codigoAfiliado_key" ON "EventoMembro"("codigoAfiliado");
-- Promotores que já existiam ganham um código.
UPDATE "EventoMembro" SET "codigoAfiliado" = UPPER(SUBSTRING(MD5("id") FROM 1 FOR 8))
WHERE "cargo" = 'PROMOTOR' AND "codigoAfiliado" IS NULL;

ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "promotorId" TEXT;
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "codigoAfiliado" TEXT;
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "comissao" DECIMAL(10,2) NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "Pedido_promotorId_idx" ON "Pedido"("promotorId");
ALTER TABLE "Pedido" DROP CONSTRAINT IF EXISTS "Pedido_promotorId_fkey";
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_promotorId_fkey" FOREIGN KEY ("promotorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CompraGrupo" ADD COLUMN IF NOT EXISTS "codigoAfiliado" TEXT;
