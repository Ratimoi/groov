import type { FuncaoEvento } from "@prisma/client";
import { EventTeamModel } from "../models/EventTeamModel";
import type { AuthUser } from "../types/auth";
import { assertPodeNoEvento, type Permissao } from "../utils/eventAccess";

// Descobre a função do usuário no evento e confere se ela permite a ação.
export class EventAccessService {
  private teamModel: EventTeamModel;

  constructor(teamModel: EventTeamModel = new EventTeamModel()) {
    this.teamModel = teamModel;
  }

  funcaoDe(eventoId: string, actor: AuthUser): Promise<FuncaoEvento | null> {
    return this.teamModel.findFuncao(eventoId, actor.id);
  }

  // Devolve a função (útil para decidir o que mostrar) ou responde 403.
  async exigir(eventoId: string, actor: AuthUser, permissao: Permissao): Promise<FuncaoEvento> {
    const funcao = await this.funcaoDe(eventoId, actor);
    assertPodeNoEvento(funcao, permissao);
    return funcao as FuncaoEvento;
  }
}
