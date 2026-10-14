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
