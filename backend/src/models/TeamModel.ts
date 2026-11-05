import { PrismaClient, type CargoEvento } from "@prisma/client";
import prisma from "../config/prisma";

const usuarioPublico = { select: { id: true, nome: true, username: true, avatarUrl: true } } as const;

export class TeamModel {
  private prismaClient: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prismaClient = prismaClient;
  }

  async list(eventoId: string) {
    return this.prismaClient.eventoMembro.findMany({
      where: { eventoId },
      include: { usuario: usuarioPublico },
      orderBy: { criadoEm: "asc" },
    });
  }

  // Um cargo por pessoa em cada evento: adicionar de novo troca o cargo.
  async upsert(eventoId: string, usuarioId: string, cargo: CargoEvento) {
    return this.prismaClient.eventoMembro.upsert({
      where: { eventoId_usuarioId: { eventoId, usuarioId } },
      create: { eventoId, usuarioId, cargo },
      update: { cargo },
      include: { usuario: usuarioPublico },
    });
  }

  async remove(eventoId: string, usuarioId: string): Promise<boolean> {
    const { count } = await this.prismaClient.eventoMembro.deleteMany({ where: { eventoId, usuarioId } });
    return count > 0;
  }

  async findCargo(eventoId: string, usuarioId: string): Promise<CargoEvento | null> {
    const membro = await this.prismaClient.eventoMembro.findUnique({
      where: { eventoId_usuarioId: { eventoId, usuarioId } },
      select: { cargo: true },
    });
    return membro?.cargo ?? null;
  }

  // Eventos em que a pessoa atua: os que publicou (GERENTE) e os em que está na equipe.
  async findEventsOf(usuarioId: string) {
    const select = {
      id: true,
      titulo: true,
      imagemUrl: true,
      comecaEm: true,
      nomeLocal: true,
      cidade: true,
      ocultoEm: true,
    } as const;
    const [gerenciados, membros] = await Promise.all([
      this.prismaClient.evento.findMany({ where: { criadoPorId: usuarioId }, select, orderBy: { comecaEm: "desc" } }),
      this.prismaClient.eventoMembro.findMany({
        where: { usuarioId },
        select: { cargo: true, evento: { select } },
        orderBy: { criadoEm: "desc" },
      }),
    ]);
    return [
      ...gerenciados.map((evento) => ({ cargo: "GERENTE" as const, evento })),
      ...membros.map((m) => ({ cargo: m.cargo, evento: m.evento })),
    ];
  }

  // Pode validar ingressos de algum evento? (gerente de um evento ou VALIDADOR em algum)
  async canValidateAny(usuarioId: string): Promise<boolean> {
    const [gerencia, validador] = await Promise.all([
      this.prismaClient.evento.count({ where: { criadoPorId: usuarioId } }),
      this.prismaClient.eventoMembro.count({ where: { usuarioId, cargo: "VALIDADOR" } }),
    ]);
    return gerencia > 0 || validador > 0;
  }
}
