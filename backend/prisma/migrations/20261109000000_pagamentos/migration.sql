-- Pagamentos do checkout (Pix e cartão via Mercado Pago, ou simulados).
DO $$ BEGIN
  CREATE TYPE "MetodoPagamento" AS ENUM ('PIX', 'CARTAO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "StatusPagamento" AS ENUM ('PENDENTE', 'APROVADO', 'RECUSADO', 'EXPIRADO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Pagamento" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "metodo" "MetodoPagamento" NOT NULL,
    "status" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "provedor" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "itens" JSONB NOT NULL,
    "externoId" TEXT,
    "pixCopiaECola" TEXT,
    "pixQrCodeBase64" TEXT,
    "checkoutUrl" TEXT,
    "resultado" JSONB,
    "erroEmissao" TEXT,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aprovadoEm" TIMESTAMP(3),
    CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Pagamento_usuarioId_idx" ON "Pagamento"("usuarioId");
CREATE INDEX IF NOT EXISTS "Pagamento_status_expiraEm_idx" ON "Pagamento"("status", "expiraEm");

ALTER TABLE "Pagamento" DROP CONSTRAINT IF EXISTS "Pagamento_usuarioId_fkey";
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
