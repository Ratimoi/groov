import type { CargoEvento } from "@prisma/client";
import { EventModel } from "../models/EventModel";
import { TeamModel } from "../models/TeamModel";
import { UserModel } from "../models/UserModel";
import type { AuthUser } from "../types/auth";
import { AppError } from "../utils/AppError";
import { assertCanManageEvent } from "../utils/eventAccess";
import { asObject, fail } from "../utils/validation";

const CARGOS: CargoEvento[] = ["PROMOTOR", "VALIDADOR"];

export class TeamService {
  constructor(
    private teamModel: TeamModel = new TeamModel(),
    private eventModel: EventModel = new EventModel(),
    private userModel: UserModel = new UserModel(),
  ) {}

  private async managedEvent(eventoId: string, actor: AuthUser) {
    const evento = await this.eventModel.findById(eventoId);
    if (!evento) throw new AppError("Evento não encontrado", 404);
    assertCanManageEvent(evento.criadoPorId, actor);
    return evento;
  }

  async list(eventoId: string, actor: AuthUser) {
    await this.managedEvent(eventoId, actor);
    return this.teamModel.list(eventoId);
  }

  async add(eventoId: string, body: unknown, actor: AuthUser) {
    const evento = await this.managedEvent(eventoId, actor);
    const { username, cargo } = asObject(body);
    if (typeof username !== "string" || username.trim() === "") fail("username é obrigatório");
    if (typeof cargo !== "string" || !CARGOS.includes(cargo as CargoEvento)) fail("cargo deve ser PROMOTOR ou VALIDADOR");

    const usuarioId = await this.userModel.findIdByUsername(username.trim().replace(/^@/, ""));
    if (!usuarioId) throw new AppError("Usuário não encontrado", 404);
    if (usuarioId === evento.criadoPorId) throw new AppError("O gerente já tem acesso total ao evento", 400);
    return this.teamModel.upsert(eventoId, usuarioId, cargo as CargoEvento);
  }

  async remove(eventoId: string, usuarioId: string, actor: AuthUser): Promise<void> {
    await this.managedEvent(eventoId, actor);
    if (!(await this.teamModel.remove(eventoId, usuarioId))) throw new AppError("Membro não encontrado", 404);
  }

  myEvents(actor: AuthUser) {
    return this.teamModel.findEventsOf(actor.id);
  }

  // Gerente do evento ou VALIDADOR dele.
  async canValidateEvent(eventoId: string, actor: AuthUser, criadoPorId: string | null): Promise<boolean> {
    if (criadoPorId === actor.id) return true;
    return (await this.teamModel.findCargo(eventoId, actor.id)) === "VALIDADOR";
  }

  canValidateAny(actor: AuthUser): Promise<boolean> {
    return this.teamModel.canValidateAny(actor.id);
  }
}
