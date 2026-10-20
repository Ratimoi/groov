import { Prisma, Evento } from "@prisma/client";

export const eventoInclude = {
  categoria: true,
  lotes: { orderBy: { preco: "asc" } },
  atracoes: {
    select: { id: true, nome: true, username: true, avatarUrl: true }
  }
} satisfies Prisma.EventoInclude;

export type EventoCompleto = Prisma.EventoGetPayload<{ include: typeof eventoInclude }>;

export interface EventServiceContract {
  findAll(): Promise<EventoCompleto[]>;
  findById(id: string): Promise<Evento | null>;
}