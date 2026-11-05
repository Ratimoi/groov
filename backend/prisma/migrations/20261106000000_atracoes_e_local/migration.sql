-- Atrações com nome livre (foto e conta opcionais) e local com endereço e coordenadas.
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "endereco" TEXT;
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;

CREATE TABLE IF NOT EXISTS "Atracao" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "fotoUrl" TEXT,
    "usuarioId" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Atracao_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Atracao_eventoId_idx" ON "Atracao"("eventoId");
CREATE INDEX IF NOT EXISTS "Atracao_usuarioId_idx" ON "Atracao"("usuarioId");

ALTER TABLE "Atracao" DROP CONSTRAINT IF EXISTS "Atracao_eventoId_fkey";
ALTER TABLE "Atracao" ADD CONSTRAINT "Atracao_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Atracao" DROP CONSTRAINT IF EXISTS "Atracao_usuarioId_fkey";
ALTER TABLE "Atracao" ADD CONSTRAINT "Atracao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Leva as atrações da relação antiga (usuário <-> evento) para a nova tabela e remove a antiga.
DO $$
BEGIN
  IF to_regclass('"_AtracoesEvento"') IS NOT NULL THEN
    INSERT INTO "Atracao" ("id", "eventoId", "nome", "fotoUrl", "usuarioId")
    SELECT md5(j."A" || ':' || j."B"), j."A", u."nome", u."avatarUrl", u."id"
    FROM "_AtracoesEvento" j
    JOIN "Usuario" u ON u."id" = j."B"
    ON CONFLICT ("id") DO NOTHING;
    DROP TABLE "_AtracoesEvento";
  END IF;
END $$;
