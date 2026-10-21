-- AlterTable
ALTER TABLE "Evento" ADD COLUMN     "destaque" BOOLEAN DEFAULT false,
ADD COLUMN     "horario" TIME;

-- CreateTable
CREATE TABLE "_AtracoesEvento" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AtracoesEvento_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AtracoesEvento_B_index" ON "_AtracoesEvento"("B");

-- AddForeignKey
ALTER TABLE "_AtracoesEvento" ADD CONSTRAINT "_AtracoesEvento_A_fkey" FOREIGN KEY ("A") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AtracoesEvento" ADD CONSTRAINT "_AtracoesEvento_B_fkey" FOREIGN KEY ("B") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

