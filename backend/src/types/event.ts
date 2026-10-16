import { Evento } from "@prisma/client";
import type { AuthUser } from "./auth";
import type { Paginated, PaginationQuery } from "../utils/pagination";

// `body` é o corpo bruto da requisição: o service valida e escolhe os campos permitidos.
// O criador do evento é sempre o usuário logado.
export interface EventServiceContract {
  findAll(query: PaginationQuery): Promise<Paginated<Evento>>;
  findById(id: string): Promise<Evento | null>;
  create(body: unknown, actor: AuthUser): Promise<Evento>;
  update(id: string, body: unknown, actor: AuthUser): Promise<Evento | null>;
  delete(id: string, actor: AuthUser): Promise<boolean>;
}
