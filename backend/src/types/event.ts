import { Evento } from "@prisma/client";
import type { Paginated, PaginationQuery } from "../utils/pagination";

export interface EventServiceContract {
  findAll(query: PaginationQuery): Promise<Paginated<Evento>>;
  findById(id: string): Promise<Evento | null>;
}
