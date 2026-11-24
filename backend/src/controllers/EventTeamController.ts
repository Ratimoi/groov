import { NextFunction, Request, Response } from "express";
import { getAuthUser } from "../middlewares/auth";
import type { EventDashboardService } from "../services/EventDashboardService";
import type { EventService } from "../services/EventService";
import type { EventTeamService } from "../services/EventTeamService";

// Tudo o que é "da equipe do evento": quem sou eu nos eventos, a equipe e o painel.
export class EventTeamController {
  private teamService: EventTeamService;
  private dashboardService: EventDashboardService;
  private eventService: EventService;

  constructor(teamService: EventTeamService, dashboardService: EventDashboardService, eventService: EventService) {
    this.teamService = teamService;
    this.dashboardService = dashboardService;
    this.eventService = eventService;
  }

  mine = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json(await this.eventService.findMine(getAuthUser(req)));
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json(await this.teamService.list(req.params.eventoId, getAuthUser(req)));
    } catch (error) {
      next(error);
    }
  };

  add = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json(await this.teamService.add(req.params.eventoId, req.body, getAuthUser(req)));
    } catch (error) {
      next(error);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.teamService.remove(req.params.eventoId, req.params.usuarioId, getAuthUser(req));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  dashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json(await this.dashboardService.get(req.params.eventoId, getAuthUser(req)));
    } catch (error) {
      next(error);
    }
  };
}
