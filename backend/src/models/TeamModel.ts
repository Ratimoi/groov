import { PrismaClient, type CargoEvento } from "@prisma/client";
import prisma from "../config/prisma";
import { generateInviteCode } from "../utils/inviteCode";

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

  // Um cargo por pessoa em cada evento: adicionar de novo troca o cargo. Só PROMOTOR tem código de
  // afiliado; quem já tinha um mantém o mesmo ao ser readicionado.
  async upsert(eventoId: string, usuarioId: string, cargo: CargoEvento) {
    const atual = await this.prismaClient.eventoMembro.findUnique({
      where: { eventoId_usuarioId: { eventoId, usuarioId } },
      select: { codigoAfiliado: true },
    });
    const codigoAfiliado = cargo === "PROMOTOR" ? (atual?.codigoAfiliado ?? generateInviteCode()) : null;
    return this.prismaClient.eventoMembro.upsert({
      where: { eventoId_usuarioId: { eventoId, usuarioId } },
      create: { eventoId, usuarioId, cargo, codigoAfiliado },
      update: { cargo, codigoAfiliado },
      include: { usuario: usuarioPublico },
    });
  }

  // Promotor do evento dono do código (o código é único no sistema, mas só vale no evento dele).
  async findAffiliate(eventoId: string, codigo: string) {
    return this.prismaClient.eventoMembro.findFirst({
      where: { eventoId, cargo: "PROMOTOR", codigoAfiliado: codigo },
      select: {
        usuarioId: true,
        codigoAfiliado: true,
        usuario: usuarioPublico,
        evento: { select: { descontoAfiliado: true, comissaoPromotor: true } },
      },
    });
  }

  async findPromoter(eventoId: string, usuarioId: string) {
    return this.prismaClient.eventoMembro.findFirst({
      where: { eventoId, usuarioId, cargo: "PROMOTOR" },
      select: {
        codigoAfiliado: true,
        evento: { select: { titulo: true, descontoAfiliado: true, comissaoPromotor: true } },
      },
    });
  }

  // Vendas pagas por promotor no evento: ingressos e comissão acumulada.
  async salesByPromoter(eventoId: string) {
    const grupos = await this.prismaClient.pedido.groupBy({
      by: ["promotorId"],
      where: { eventoId, status: "PAGO", promotorId: { not: null } },
      _sum: { quantidade: true, comissao: true },
      _count: true,
    });
    return grupos.map((g) => ({
      promotorId: g.promotorId as string,
      pedidos: g._count,
      ingressos: g._sum.quantidade ?? 0,
      comissao: g._sum.comissao ?? 0,
    }));
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
