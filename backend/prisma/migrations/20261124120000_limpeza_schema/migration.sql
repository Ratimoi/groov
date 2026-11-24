-- Remove o que nenhuma parte do sistema usa mais:
-- "horario" (comecaEm e terminaEm já carregam data e hora) e o enum StatusEvento (nenhum modelo o usa).
ALTER TABLE "Evento" DROP COLUMN "horario";

DROP TYPE "StatusEvento";
