import type { GroupPurchase } from "../models/GroupPurchaseModel";

export type { GroupPurchase };

export type GroupPurchaseCreateRequest = {
  grupoId: string;
  loteId: string;
  iniciadorId: string;
  participantesIds: string[];
};

export interface GroupPurchaseServiceContract {
  create(data: GroupPurchaseCreateRequest): Promise<GroupPurchase>;
  findAll(): Promise<GroupPurchase[]>;
  findById(id: string): Promise<GroupPurchase | null>;
}
