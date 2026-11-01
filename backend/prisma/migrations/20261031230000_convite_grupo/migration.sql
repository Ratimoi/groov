-- CreateTable
CREATE TABLE IF NOT EXISTS "ConviteGrupo" (
    "codigo" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConviteGrupo_pkey" PRIMARY KEY ("codigo")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ConviteGrupo_grupoId_key" ON "ConviteGrupo"("grupoId");

-- AddForeignKey
ALTER TABLE "ConviteGrupo" DROP CONSTRAINT IF EXISTS "ConviteGrupo_grupoId_fkey";
ALTER TABLE "ConviteGrupo" ADD CONSTRAINT "ConviteGrupo_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
