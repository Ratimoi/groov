import type { Grupo } from "@prisma/client";
import { GroupMemberModel } from "../models/GroupMemberModel";
import { GroupModel } from "../models/GroupModel";
import type {
  GroupCreateRequest,
  GroupMember,
  GroupMemberCreateRequest,
  GroupServiceContract,
  GroupUpdateRequest,
} from "../types/group";
import { AppError } from "../utils/AppError";

export class GroupService implements GroupServiceContract {
  private groupModel: GroupModel;
  private groupMemberModel: GroupMemberModel;

  constructor(
    groupModel: GroupModel = new GroupModel(),
    groupMemberModel: GroupMemberModel = new GroupMemberModel(),
  ) {
    this.groupModel = groupModel;
    this.groupMemberModel = groupMemberModel;
  }

  async create(data: GroupCreateRequest): Promise<Grupo> {
    return this.groupModel.create(data);
  }

  async findAll(): Promise<Grupo[]> {
    return this.groupModel.findAll();
  }

  async findById(id: string): Promise<Grupo | null> {
    return this.groupModel.findById(id);
  }

  async update(id: string, data: GroupUpdateRequest): Promise<Grupo | null> {
    return this.groupModel.update(id, { nome: data.nome });
  }

  async delete(id: string): Promise<boolean> {
    return this.groupModel.delete(id);
  }

  async listMembers(grupoId: string): Promise<GroupMember[]> {
    await this.findGroupOrThrow(grupoId);
    return this.groupMemberModel.findByGroup(grupoId);
  }

  async addMember(grupoId: string, data: GroupMemberCreateRequest): Promise<GroupMember> {
    await this.findGroupOrThrow(grupoId);
    return this.groupMemberModel.create(grupoId, data.usuarioId);
  }

  async removeMember(grupoId: string, usuarioId: string): Promise<void> {
    const group = await this.findGroupOrThrow(grupoId);
    if (group.liderId === usuarioId) {
      throw new AppError("O líder não pode ser removido do grupo", 400);
    }

    const removed = await this.groupMemberModel.delete(grupoId, usuarioId);
    if (!removed) {
      throw new AppError("Membro não encontrado no grupo", 404);
    }
  }

  private async findGroupOrThrow(grupoId: string): Promise<Grupo> {
    const group = await this.groupModel.findById(grupoId);
    if (!group) {
      throw new AppError("Grupo não encontrado", 404);
    }
    return group;
  }
}
