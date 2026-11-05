import prisma from "../config/prisma";
import { aplicarSeed } from "../seed/aplicarSeed";
import type { AuthUser } from "../types/auth";
import { AppError } from "../utils/AppError";

export class AdminService {
  async hideEvent(eventoId: string, body: unknown) {
    const bruto = (body as { motivo?: unknown } | null | undefined)?.motivo;
    const motivo = typeof bruto === "string" ? bruto.trim() : "";
    if (motivo === "") throw new AppError("motivo é obrigatório", 400);
    return this.setHidden(eventoId, { ocultoEm: new Date(), ocultoMotivo: motivo.slice(0, 500) });
  }

  async showEvent(eventoId: string) {
    return this.setHidden(eventoId, { ocultoEm: null, ocultoMotivo: null });
  }

  private async setHidden(eventoId: string, data: { ocultoEm: Date | null; ocultoMotivo: string | null }) {
    const existe = await prisma.evento.findUnique({ where: { id: eventoId }, select: { id: true } });
    if (!existe) throw new AppError("Evento não encontrado", 404);
    return prisma.evento.update({
      where: { id: eventoId },
      data,
      select: { id: true, titulo: true, ocultoEm: true, ocultoMotivo: true },
    });
  }

  listHiddenEvents() {
    return prisma.evento.findMany({
      where: { ocultoEm: { not: null } },
      select: {
        id: true,
        titulo: true,
        ocultoEm: true,
        ocultoMotivo: true,
        criadoPor: { select: { id: true, nome: true, username: true } },
      },
      orderBy: { ocultoEm: "desc" },
    });
  }

  // Apaga todos os dados, menos a conta de quem pediu, e recria os dados de demonstração do seed.
  // Recusado em produção: o banco real nunca deve ser zerado por uma chamada da API.
  async resetarSeed(actor: AuthUser): Promise<{ mensagem: string }> {
    if (process.env.NODE_ENV === "production") {
      throw new AppError("Resetar o banco não é permitido em produção", 403);
    }
    if (!process.env.SEED_PASSWORD) {
      throw new AppError("SEED_PASSWORD não está definida no servidor", 500);
    }

    await prisma.$transaction(
      async (tx) => {
        // Filhos antes dos pais, por causa das chaves estrangeiras.
        await tx.validacaoIngresso.deleteMany();
        await tx.ingresso.deleteMany();
        await tx.participanteCompra.deleteMany();
        await tx.compraGrupo.deleteMany();
        await tx.pedido.deleteMany();
        await tx.avaliacaoEvento.deleteMany();
        await tx.conviteGrupo.deleteMany();
        await tx.membroGrupo.deleteMany();
        await tx.grupo.deleteMany();
        await tx.lote.deleteMany();
        await tx.evento.deleteMany();
        await tx.categoria.deleteMany();
        await tx.usuario.deleteMany({ where: { id: { not: actor.id } } });

        await aplicarSeed(tx, process.env.SEED_PASSWORD);
      },
      { timeout: 60_000 },
    );

    return { mensagem: "Banco resetado com os dados do seed" };
  }
}
