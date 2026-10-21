import { Prisma, Evento, Papel } from "@prisma/client";
import type { EventCreateData, EventUpdateData } from "../utils/eventInput";

export const eventoInclude = {
  categoria: true,
  lotes: { orderBy: { preco: "asc" } },
  atracoes: {
    select: { id: true, nome: true, username: true, avatarUrl: true }
  }
} satisfies Prisma.EventoInclude;

export type EventoCompleto = Prisma.EventoGetPayload<{ include: typeof eventoInclude }>;

export type UsuarioAutenticado = {
  id: string;
  papel: Papel;
};

export interface EventServiceContract {
  findAll(): Promise<EventoCompleto[]>;
  findById(id: string): Promise<Evento | null>;
  create(data: EventCreateData, user: UsuarioAutenticado): Promise<Evento>;
  update(id: string, data: EventUpdateData, user: UsuarioAutenticado): Promise<Evento | null>;
  delete(id: string, user: UsuarioAutenticado): Promise<boolean>;
}
