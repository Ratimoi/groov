import { Evento } from "@prisma/client";
import { EventModel } from "../models/EventModel";
import type { EventCreateData, EventUpdateData } from "../utils/eventInput";
import { EventServiceContract, EventoCompleto, UsuarioAutenticado } from "../types/event";

export class ForbiddenError extends Error {
  status = 403;

  constructor(message = "Você não tem permissão para esta ação.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class EventService implements EventServiceContract {
  private eventModel: EventModel;

  constructor(eventModel: EventModel = new EventModel()) {
    this.eventModel = eventModel;
  }

  async findAll(): Promise<EventoCompleto[]> {
    return this.eventModel.findAll();
  }

  async findById(id: string): Promise<Evento | null> {
    return this.eventModel.findById(id);
  }

  // Só PRODUTOR e ADMIN criam eventos; o criador é o usuário logado
  async create(data: EventCreateData, user: UsuarioAutenticado): Promise<Evento> {
    if (user.papel !== "PRODUTOR" && user.papel !== "ADMIN") {
      throw new ForbiddenError("Apenas produtores podem criar eventos.");
    }
    return this.eventModel.create(data, user.id);
  }

  // ADMIN edita qualquer evento; PRODUTOR só os que ele criou
  async update(id: string, data: EventUpdateData, user: UsuarioAutenticado): Promise<Evento | null> {
    const evento = await this.eventModel.findById(id);
    if (!evento) return null;

    this.verificaDono(evento, user);
    return this.eventModel.update(id, data);
  }

  async delete(id: string, user: UsuarioAutenticado): Promise<boolean> {
    const evento = await this.eventModel.findById(id);
    if (!evento) return false;

    this.verificaDono(evento, user);
    return this.eventModel.delete(id);
  }

  private verificaDono(evento: Evento, user: UsuarioAutenticado): void {
    if (user.papel === "ADMIN") return;
    if (evento.criadoPorId !== user.id) {
      throw new ForbiddenError("Você só pode alterar eventos criados por você.");
    }
  }
}
