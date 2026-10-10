import type { Grupo } from "@prisma/client";
import { GroupModel } from "../models/GroupModel";
import type { GroupCreateRequest, GroupServiceContract, GroupUpdateRequest } from "../types/group";

export class GroupService implements GroupServiceContract {
  private groupModel: GroupModel;

  constructor(groupModel: GroupModel = new GroupModel()) {
    this.groupModel = groupModel;
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
    return this.groupModel.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    return this.groupModel.delete(id);
  }
}
