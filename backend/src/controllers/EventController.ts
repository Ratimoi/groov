import { Request, Response, NextFunction } from "express";
import { getAuthUser } from "../middlewares/auth";
import { EventServiceContract } from "../types/event";

export class EventController {
  private eventService: EventServiceContract;

  constructor(eventService: EventServiceContract) {
    this.eventService = eventService;
  }

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, limit } = req.query;
      res.status(200).json(await this.eventService.findAll({ page, limit }));
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(201).json(await this.eventService.create(req.body, getAuthUser(req)));
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const event = await this.eventService.update(req.params.id, req.body, getAuthUser(req));
      if (!event) {
        res.status(404).json({ message: "Event not found" });
        return;
      }
      res.status(200).json(event);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const deleted = await this.eventService.delete(req.params.id, getAuthUser(req));
      if (!deleted) {
        res.status(404).json({ message: "Event not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const event = await this.eventService.findById(req.params.id);
      if (!event) {
        res.status(404).json({ message: "Event not found" });
        return;
      }
      res.status(200).json(event);
    } catch (error) {
      next(error);
    }
  };

}
