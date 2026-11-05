-- Feed: curtir e salvar eventos, seguir organizadores.
CREATE TABLE IF NOT EXISTS "CurtidaEvento" (
    "eventoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CurtidaEvento_pkey" PRIMARY KEY ("eventoId","usuarioId")
);

CREATE TABLE IF NOT EXISTS "EventoSalvo" (
    "eventoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventoSalvo_pkey" PRIMARY KEY ("eventoId","usuarioId")
);

CREATE TABLE IF NOT EXISTS "Seguidor" (
    "seguidorId" TEXT NOT NULL,
    "seguidoId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Seguidor_pkey" PRIMARY KEY ("seguidorId","seguidoId")
);

CREATE INDEX IF NOT EXISTS "CurtidaEvento_usuarioId_idx" ON "CurtidaEvento"("usuarioId");
CREATE INDEX IF NOT EXISTS "EventoSalvo_usuarioId_idx" ON "EventoSalvo"("usuarioId");
CREATE INDEX IF NOT EXISTS "Seguidor_seguidoId_idx" ON "Seguidor"("seguidoId");

ALTER TABLE "CurtidaEvento" DROP CONSTRAINT IF EXISTS "CurtidaEvento_eventoId_fkey";
ALTER TABLE "CurtidaEvento" ADD CONSTRAINT "CurtidaEvento_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurtidaEvento" DROP CONSTRAINT IF EXISTS "CurtidaEvento_usuarioId_fkey";
ALTER TABLE "CurtidaEvento" ADD CONSTRAINT "CurtidaEvento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventoSalvo" DROP CONSTRAINT IF EXISTS "EventoSalvo_eventoId_fkey";
ALTER TABLE "EventoSalvo" ADD CONSTRAINT "EventoSalvo_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventoSalvo" DROP CONSTRAINT IF EXISTS "EventoSalvo_usuarioId_fkey";
ALTER TABLE "EventoSalvo" ADD CONSTRAINT "EventoSalvo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Seguidor" DROP CONSTRAINT IF EXISTS "Seguidor_seguidorId_fkey";
ALTER TABLE "Seguidor" ADD CONSTRAINT "Seguidor_seguidorId_fkey" FOREIGN KEY ("seguidorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Seguidor" DROP CONSTRAINT IF EXISTS "Seguidor_seguidoId_fkey";
ALTER TABLE "Seguidor" ADD CONSTRAINT "Seguidor_seguidoId_fkey" FOREIGN KEY ("seguidoId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
