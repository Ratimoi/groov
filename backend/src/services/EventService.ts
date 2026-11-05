import { Evento } from "@prisma/client";
import { EventModel, type AtracaoRow } from "../models/EventModel";
import { UserModel } from "../models/UserModel";
import { AppError } from "../utils/AppError";
import type { AuthUser } from "../types/auth";
import { EventServiceContract, EventoCompleto } from "../types/event";
import { assertCanManageEvent } from "../utils/eventAccess";
import {
  assertEndAfterStart,
  parseEventCreate,
  parseEventExtras,
  parseEventUpdate,
  type AtracaoInput,
} from "../utils/eventInput";
import { Paginated, parsePagination, PaginationQuery, toPaginated } from "../utils/pagination";

export class EventService implements EventServiceContract {
  private eventModel: EventModel;

  private userModel: UserModel;

  constructor(eventModel: EventModel = new EventModel(), userModel: UserModel = new UserModel()) {
    this.eventModel = eventModel;
    this.userModel = userModel;
  }

  // Atração com @username marca a conta: ela precisa existir.
  private async resolveAtracoes(lista: AtracaoInput[] | undefined): Promise<AtracaoRow[] | undefined> {
    if (!lista) return undefined;
    return Promise.all(
      lista.map(async ({ nome, fotoUrl, username }) => {
        if (!username) return { nome, fotoUrl, usuarioId: null };
        const usuarioId = await this.userModel.findIdByUsername(username);
        if (!usuarioId) throw new AppError(`Usuário @${username} não encontrado`, 400);
        return { nome, fotoUrl, usuarioId };
      }),
    );
  }

  async findAll(query: PaginationQuery): Promise<Paginated<EventoCompleto>> {
    const pagination = parsePagination(query);
    const { events, total } = await this.eventModel.findPage(pagination);
    return toPaginated(events, total, pagination);
  }

  async findById(id: string): Promise<Evento | null> {
    const evento = await this.eventModel.findById(id);
    // Evento oculto pela moderação some da API pública.
    return evento && !evento.ocultoEm ? evento : null;
  }

  async create(body: unknown, actor: AuthUser): Promise<Evento> {
    const data = parseEventCreate(body);
    const extras = parseEventExtras(body, true);
    const atracoes = await this.resolveAtracoes(extras.atracoes);
    return this.eventModel.create(data, actor.id, { atracoes, lotes: extras.lotes });
  }

  async update(id: string, body: unknown, actor: AuthUser): Promise<Evento | null> {
    const event = await this.eventModel.findById(id);
    if (!event) return null;
    assertCanManageEvent(event.criadoPorId, actor);

    const data = parseEventUpdate(body);
    assertEndAfterStart(
      data.comecaEm ?? event.comecaEm,
      data.terminaEm !== undefined ? data.terminaEm : event.terminaEm,
    );
    const atracoes = await this.resolveAtracoes(parseEventExtras(body, false).atracoes);
    return this.eventModel.update(id, data, atracoes);
  }

  async delete(id: string, actor: AuthUser): Promise<boolean> {
    const event = await this.eventModel.findById(id);
    if (!event) return false;
    assertCanManageEvent(event.criadoPorId, actor);
    return this.eventModel.delete(id);
  }
}
