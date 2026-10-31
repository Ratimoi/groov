import type { Grupo } from "@prisma/client";
import { GroupMemberModel } from "../models/GroupMemberModel";
import { GroupInviteModel } from "../models/GroupInviteModel";
import { GroupModel } from "../models/GroupModel";
import type { AuthUser } from "../types/auth";
import type {
  GroupCreateBody,
  GroupJoinResult,
  GroupMember,
  GroupMemberCreateRequest,
  GroupServiceContract,
  GroupUpdateRequest,
} from "../types/group";
import { AppError } from "../utils/AppError";
import { asObject, fail } from "../utils/validation";

export class GroupService implements GroupServiceContract {
  private groupModel: GroupModel;
  private groupMemberModel: GroupMemberModel;
  private groupInviteModel: GroupInviteModel;

  constructor(
    groupModel: GroupModel = new GroupModel(),
    groupMemberModel: GroupMemberModel = new GroupMemberModel(),
    groupInviteModel: GroupInviteModel = new GroupInviteModel(),
  ) {
    this.groupModel = groupModel;
    this.groupMemberModel = groupMemberModel;
    this.groupInviteModel = groupInviteModel;
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

  // Só o líder (ou ADMIN) gera o convite; o código de um grupo é sempre o mesmo.
  async createInvite(grupoId: string, actor: AuthUser): Promise<{ codigo: string }> {
    const group = await this.findVisibleGroupOrThrow(grupoId, actor);
    this.assertCanManage(group, actor);
    return { codigo: await this.groupInviteModel.findOrCreate(grupoId) };
  }

  // Quem tem o código entra no grupo. Código desconhecido é 404; quem já é membro não duplica.
  async join(body: { codigo?: unknown }, actor: AuthUser): Promise<GroupJoinResult> {
    const { codigo } = asObject(body);
    if (typeof codigo !== "string" || codigo.trim() === "" || codigo.length > 32) fail("codigo é obrigatório");

    const convite = await this.groupInviteModel.findByCode(codigo.trim().toUpperCase());
    if (!convite) throw new AppError("Convite inválido", 404);

    if (await this.groupMemberModel.isMember(convite.grupoId, actor.id)) {
      return { grupo: convite.grupo, jaEraMembro: true };
    }
    await this.groupMemberModel.create(convite.grupoId, actor.id);
    return { grupo: convite.grupo, jaEraMembro: false };
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

  async findByUsuario(usuarioId: string) {
    const grupos = await this.groupModel.findByUsuario(usuarioId);
    return grupos.map((grupo) => ({ ...grupo, souLider: grupo.liderId === usuarioId }));
  }
}
