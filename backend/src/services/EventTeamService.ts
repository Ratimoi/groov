import type { FuncaoEvento } from "@prisma/client";
import { EventModel } from "../models/EventModel";
import { EventTeamModel, type MembroEquipe } from "../models/EventTeamModel";
import { UserModel } from "../models/UserModel";
import type { AuthUser } from "../types/auth";
import { AppError } from "../utils/AppError";
import { asObject, fail } from "../utils/validation";
import { EventAccessService } from "./EventAccessService";

// Funções que o dono pode atribuir. DONO só nasce com a criação do evento.
const FUNCOES_ATRIBUIVEIS: readonly FuncaoEvento[] = ["PRODUTOR", "PORTEIRO"];

export class EventTeamService {
  private teamModel: EventTeamModel;
  private eventModel: EventModel;
  private userModel: UserModel;
  private access: EventAccessService;

  constructor(
    teamModel: EventTeamModel = new EventTeamModel(),
    eventModel: EventModel = new EventModel(),
    userModel: UserModel = new UserModel(),
    access: EventAccessService = new EventAccessService(teamModel),
  ) {
    this.teamModel = teamModel;
    this.eventModel = eventModel;
    this.userModel = userModel;
    this.access = access;
  }

  async list(eventoId: string, actor: AuthUser): Promise<MembroEquipe[]> {
    await this.guard(eventoId, actor);
    return this.teamModel.findByEvent(eventoId);
  }

  // Adiciona alguém à equipe pelo @username. Se a pessoa já é da equipe, só troca a função.
  async add(eventoId: string, body: unknown, actor: AuthUser): Promise<MembroEquipe[]> {
    await this.guard(eventoId, actor);

    const { username, funcao } = asObject(body);
    if (typeof username !== "string" || username.trim() === "") fail("username é obrigatório");
    if (typeof funcao !== "string" || !FUNCOES_ATRIBUIVEIS.includes(funcao as FuncaoEvento)) {
      fail("funcao deve ser PRODUTOR ou PORTEIRO");
    }

    const usuarioId = await this.userModel.findIdByUsername((username as string).trim().replace(/^@/, ""));
    if (!usuarioId) throw new AppError("Usuário não encontrado", 404);
    if ((await this.teamModel.findFuncao(eventoId, usuarioId)) === "DONO") {
      throw new AppError("O dono do evento não pode mudar de função", 409);
    }

    await this.teamModel.upsert(eventoId, usuarioId, funcao as FuncaoEvento);
    return this.teamModel.findByEvent(eventoId);
  }

  async remove(eventoId: string, usuarioId: string, actor: AuthUser): Promise<void> {
    await this.guard(eventoId, actor);
    if ((await this.teamModel.findFuncao(eventoId, usuarioId)) === "DONO") {
      throw new AppError("O dono do evento não pode ser removido", 409);
    }
    if (!(await this.teamModel.remove(eventoId, usuarioId))) throw new AppError("Essa pessoa não está na equipe", 404);
  }

  private async guard(eventoId: string, actor: AuthUser): Promise<void> {
    if (!(await this.eventModel.findById(eventoId))) throw new AppError("Evento não encontrado", 404);
    await this.access.exigir(eventoId, actor, "GERENCIAR_EQUIPE");
  }
}
