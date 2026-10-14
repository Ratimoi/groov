import { Evento } from "@prisma/client";

export interface EventServiceContract {
  findAll(): Promise<Evento[]>;
  findById(id: string): Promise<Evento | null>;
}