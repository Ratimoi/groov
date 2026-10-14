import { Request, Response, NextFunction } from "express";
import { EventServiceContract } from "../types/event";

export class EventController {
  private eventService: EventServiceContract;

  constructor(eventService: EventServiceContract) {
    this.eventService = eventService;
  }

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json(await this.eventService.findAll());
    } catch (error) {
      next(error);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.eventService.findById(req.params.id);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  };

}
