import { Request, Response, NextFunction } from "express";
import { getAuthUser } from "../middlewares/auth";
import type { GroupServiceContract } from "../types/group";

export class GroupController {
  private groupService: GroupServiceContract;

  constructor(groupService: GroupServiceContract) {
    this.groupService = groupService;
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const group = await this.groupService.create(req.body, getAuthUser(req));
      res.status(201).json(group);
    } catch (error) {
      next(error);
    }
  };

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json(await this.groupService.findAll(getAuthUser(req)));
    } catch (error) {
      next(error);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const group = await this.groupService.findById(req.params.id, getAuthUser(req));
      if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
      }
      res.status(200).json(group);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const group = await this.groupService.update(req.params.id, req.body, getAuthUser(req));
      if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
      }
      res.status(200).json(group);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const deleted = await this.groupService.delete(req.params.id, getAuthUser(req));
      if (!deleted) {
        res.status(404).json({ message: "Group not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  listMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json(await this.groupService.listMembers(req.params.id, getAuthUser(req)));
    } catch (error) {
      next(error);
    }
  };

  addMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const member = await this.groupService.addMember(req.params.id, req.body, getAuthUser(req));
      res.status(201).json(member);
    } catch (error) {
      next(error);
    }
  };

  removeMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.groupService.removeMember(req.params.id, req.params.usuarioId, getAuthUser(req));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  findByUsuario = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json(await this.groupService.findByUsuario(req.params.id));
    } catch (error) {
      next(error);
    }
  };
}
