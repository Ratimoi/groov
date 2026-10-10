import { Request, Response, NextFunction } from "express";
import type { GroupServiceContract } from "../types/group";

export class GroupController {
  private groupService: GroupServiceContract;

  constructor(groupService: GroupServiceContract) {
    this.groupService = groupService;
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const group = await this.groupService.create(req.body);
      res.status(201).json(group);
    } catch (error) {
      next(error);
    }
  };

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json(await this.groupService.findAll());
    } catch (error) {
      next(error);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const group = await this.groupService.findById(req.params.id);
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
      const group = await this.groupService.update(req.params.id, req.body);
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
      const deleted = await this.groupService.delete(req.params.id);
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
      res.status(200).json(await this.groupService.listMembers(req.params.id));
    } catch (error) {
      next(error);
    }
  };

  addMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const member = await this.groupService.addMember(req.params.id, req.body);
      res.status(201).json(member);
    } catch (error) {
      next(error);
    }
  };

  removeMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.groupService.removeMember(req.params.id, req.params.usuarioId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
