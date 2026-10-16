import type { Grupo } from "@prisma/client";
import { GroupMemberModel } from "../models/GroupMemberModel";
import { GroupModel } from "../models/GroupModel";
import type { AuthUser } from "../types/auth";
import type {
  GroupCreateBody,
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

  // O líder é sempre quem está logado: o corpo da requisição não escolhe o líder.
  async create(data: GroupCreateBody, actor: AuthUser): Promise<Grupo> {
    if (typeof data?.nome !== "string" || data.nome.trim() === "") {
      throw new AppError("nome é obrigatório", 400);
    }
    return this.groupModel.create({ nome: data.nome, liderId: actor.id });
  }

  // ADMIN vê todos; os demais, só os grupos de que participam.
  async findAll(actor: AuthUser): Promise<Grupo[]> {
    if (actor.papel === "ADMIN") return this.groupModel.findAll();
    return this.groupModel.findAllByMember(actor.id);
  }

  async findById(id: string, actor: AuthUser): Promise<Grupo | null> {
    return this.findVisibleGroup(id, actor);
  }

  async update(id: string, data: GroupUpdateRequest, actor: AuthUser): Promise<Grupo | null> {
    const group = await this.findVisibleGroup(id, actor);
    if (!group) return null;
    this.assertCanManage(group, actor);
    return this.groupModel.update(id, { nome: data.nome });
  }

  async delete(id: string, actor: AuthUser): Promise<boolean> {
    const group = await this.findVisibleGroup(id, actor);
    if (!group) return false;
    this.assertCanManage(group, actor);
    return this.groupModel.delete(id);
  }

  async listMembers(grupoId: string, actor: AuthUser): Promise<GroupMember[]> {
    await this.findVisibleGroupOrThrow(grupoId, actor);
    return this.groupMemberModel.findByGroup(grupoId);
  }

  async addMember(grupoId: string, data: GroupMemberCreateRequest, actor: AuthUser): Promise<GroupMember> {
    const group = await this.findVisibleGroupOrThrow(grupoId, actor);
    this.assertCanManage(group, actor);
    if (typeof data?.usuarioId !== "string" || data.usuarioId === "") {
      throw new AppError("usuarioId é obrigatório", 400);
    }
    return this.groupMemberModel.create(grupoId, data.usuarioId);
  }

  // O líder (ou ADMIN) remove qualquer membro; cada membro pode sair do grupo por conta própria.
  async removeMember(grupoId: string, usuarioId: string, actor: AuthUser): Promise<void> {
    const group = await this.findVisibleGroupOrThrow(grupoId, actor);
    if (usuarioId !== actor.id) {
      this.assertCanManage(group, actor);
    }
    if (group.liderId === usuarioId) {
      throw new AppError("O líder não pode ser removido do grupo", 400);
    }

    const removed = await this.groupMemberModel.delete(grupoId, usuarioId);
    if (!removed) {
      throw new AppError("Membro não encontrado no grupo", 404);
    }
  }

  // Grupo que o usuário pode ver: ADMIN, o líder ou um membro. Para os demais, é como se não existisse.
  private async findVisibleGroup(grupoId: string, actor: AuthUser): Promise<Grupo | null> {
    const group = await this.groupModel.findById(grupoId);
    if (!group) return null;

    const canSee =
      actor.papel === "ADMIN" ||
      group.liderId === actor.id ||
      (await this.groupMemberModel.isMember(grupoId, actor.id));
    return canSee ? group : null;
  }

  private async findVisibleGroupOrThrow(grupoId: string, actor: AuthUser): Promise<Grupo> {
    const group = await this.findVisibleGroup(grupoId, actor);
    if (!group) {
      throw new AppError("Grupo não encontrado", 404);
    }
    return group;
  }

  private assertCanManage(group: Grupo, actor: AuthUser): void {
    if (actor.papel !== "ADMIN" && group.liderId !== actor.id) {
      throw new AppError("Somente o líder do grupo pode fazer isso", 403);
    }
  }
}
