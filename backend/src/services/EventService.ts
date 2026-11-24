import { Evento } from "@prisma/client";
import { EventModel } from "../models/EventModel";
import type { AuthUser } from "../types/auth";
import { EventServiceContract, EventoCompleto } from "../types/event";
import { EventTeamModel, type EventoDaEquipe } from "../models/EventTeamModel";
import { EventAccessService } from "./EventAccessService";
import { assertEndAfterStart, parseEventCreate, parseEventUpdate } from "../utils/eventInput";
import { Paginated, parsePagination, PaginationQuery, toPaginated } from "../utils/pagination";

export class EventService implements EventServiceContract {
  private eventModel: EventModel;
  private teamModel: EventTeamModel;
  private access: EventAccessService;

  constructor(
    eventModel: EventModel = new EventModel(),
    teamModel: EventTeamModel = new EventTeamModel(),
    access: EventAccessService = new EventAccessService(teamModel),
  ) {
    this.eventModel = eventModel;
    this.teamModel = teamModel;
    this.access = access;
  }

  // Eventos em que o usuário tem alguma função (dono, produtor ou porteiro).
  async findMine(actor: AuthUser): Promise<EventoDaEquipe[]> {
    return this.teamModel.findEventsByUser(actor.id);
  }

  async findAll(query: PaginationQuery): Promise<Paginated<EventoCompleto>> {
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
    await this.access.exigir(id, actor, "EDITAR_EVENTO");

    const data = parseEventUpdate(body);
    assertEndAfterStart(
      data.comecaEm ?? event.comecaEm,
      data.terminaEm !== undefined ? data.terminaEm : event.terminaEm,
    );
    return this.eventModel.update(id, data);
  }

  async delete(id: string, actor: AuthUser): Promise<boolean> {
    const event = await this.eventModel.findById(id);
    if (!event) return false;
    await this.access.exigir(id, actor, "APAGAR_EVENTO");
    return this.eventModel.delete(id);
  }
}
