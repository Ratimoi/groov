import { Evento } from "@prisma/client";
import { EventModel } from "../models/EventModel";
import { EventServiceContract } from "../types/event";
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
}
