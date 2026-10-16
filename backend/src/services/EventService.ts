import { Evento } from "@prisma/client";
import { EventModel } from "../models/EventModel";
import type { AuthUser } from "../types/auth";
import { EventServiceContract } from "../types/event";
import { AppError } from "../utils/AppError";
import { assertEndAfterStart, parseEventCreate, parseEventUpdate } from "../utils/eventInput";
import { Paginated, parsePagination, PaginationQuery, toPaginated } from "../utils/pagination";

export class EventService implements EventServiceContract {
  private eventModel: EventModel;

  constructor(eventModel: EventModel = new EventModel()) {
    this.eventModel = eventModel;
  }

  async findAll(query: PaginationQuery): Promise<Paginated<Evento>> {
    const pagination = parsePagination(query);
    const { events, total } = await this.eventModel.findPage(pagination);
    return toPaginated(events, total, pagination);
  }

  async findById(id: string): Promise<Evento | null> {
    return this.eventModel.findById(id);
  }

  async create(body: unknown, actor: AuthUser): Promise<Evento> {
    return this.eventModel.create(parseEventCreate(body), actor.id);
  }

  async update(id: string, body: unknown, actor: AuthUser): Promise<Evento | null> {
    const event = await this.eventModel.findById(id);
    if (!event) return null;
    this.assertCanManage(event, actor);

    const data = parseEventUpdate(body);
    // O fim precisa continuar depois do início, considerando o que já está salvo.
    assertEndAfterStart(
      data.comecaEm ?? event.comecaEm,
      data.terminaEm !== undefined ? data.terminaEm : event.terminaEm,
    );
    return this.eventModel.update(id, data);
  }

  async delete(id: string, actor: AuthUser): Promise<boolean> {
    const event = await this.eventModel.findById(id);
    if (!event) return false;
    this.assertCanManage(event, actor);
    return this.eventModel.delete(id);
  }

  // Eventos são públicos, então quem não pode gerenciar recebe 403 (e não 404).
  private assertCanManage(event: Evento, actor: AuthUser): void {
    if (actor.papel !== "ADMIN" && event.criadoPorId !== actor.id) {
      throw new AppError("Somente o criador do evento pode fazer isso", 403);
    }
  }
}
