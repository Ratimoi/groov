import { Evento } from "@prisma/client";
import { EventModel } from "../models/EventModel";
import { EventServiceContract } from "../types/event";

export class EventService implements EventServiceContract {
  private eventModel: EventModel;

  constructor(eventModel: EventModel = new EventModel()) {
    this.eventModel = eventModel;
  }


  async findAll(): Promise<Evento[]> {
    return this.eventModel.findAll();
  }

  async findById(id: string): Promise<Evento | null> {
    return this.eventModel.findById(id);
  }

}
