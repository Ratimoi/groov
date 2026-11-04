import type { GroupPurchase } from "../models/GroupPurchaseModel";
import type { AuthUser } from "./auth";

export type { GroupPurchase };

export type GroupPurchaseCreateRequest = {
  grupoId: string;
  loteId: string;
  iniciadorId: string;
  participantesIds: string[];
};

// O iniciador é sempre o usuário logado, nunca vem do corpo da requisição.
export type GroupPurchaseCreateBody = Omit<GroupPurchaseCreateRequest, "iniciadorId">;

// `todos: true` = o iniciador paga a cota de todos os participantes ainda pendentes.
export type GroupPurchasePayBody = { todos?: boolean };

export interface GroupPurchaseServiceContract {
  create(data: GroupPurchaseCreateBody, actor: AuthUser): Promise<GroupPurchase>;
  findAll(actor: AuthUser): Promise<GroupPurchase[]>;
  findById(id: string, actor: AuthUser): Promise<GroupPurchase | null>;
  pay(id: string, actor: AuthUser, body?: GroupPurchasePayBody): Promise<GroupPurchase>;
}
