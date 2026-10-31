import { Request, Response, NextFunction } from "express";
import { getAuthUser } from "../middlewares/auth";
import type { TicketServiceContract } from "../types/ticket";

export class TicketController {
  private ticketService: TicketServiceContract;

  constructor(ticketService: TicketServiceContract) {
    this.ticketService = ticketService;
  }

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json(await this.ticketService.findAll(getAuthUser(req)));
    } catch (error) {
      next(error);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ticket = await this.ticketService.findById(req.params.id, getAuthUser(req));
      if (!ticket) {
        res.status(404).json({ message: "Ingresso não encontrado" });
        return;
      }
      res.status(200).json(ticket);
    } catch (error) {
      next(error);
    }
  };
}
