import { Request, Response, NextFunction } from "express";
import { getAuthUser } from "../middlewares/auth";
import type { TeamService } from "../services/TeamService";

export class TeamController {
  constructor(private teamService: TeamService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json(await this.teamService.list(req.params.id, getAuthUser(req)));
    } catch (error) {
      next(error);
    }
  };

  add = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(201).json(await this.teamService.add(req.params.id, req.body, getAuthUser(req)));
    } catch (error) {
      next(error);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.teamService.remove(req.params.id, req.params.usuarioId, getAuthUser(req));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  myEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json(await this.teamService.myEvents(getAuthUser(req)));
    } catch (error) {
      next(error);
    }
  };
}
