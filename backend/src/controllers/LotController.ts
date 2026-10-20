import { NextFunction, Request, Response } from "express";
import { getAuthUser } from "../middlewares/auth";
import type { LotServiceContract } from "../types/lot";

export class LotController {
  private lotService: LotServiceContract;

  constructor(lotService: LotServiceContract) {
    this.lotService = lotService;
  }

  findByEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json(await this.lotService.findByEvent(req.params.eventoId));
    } catch (error) {
      next(error);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lot = await this.lotService.findById(req.params.id);
      if (!lot) {
        res.status(404).json({ message: "Lote não encontrado" });
        return;
      }
      res.status(200).json(lot);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(201).json(await this.lotService.create(req.params.eventoId, req.body, getAuthUser(req)));
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lot = await this.lotService.update(req.params.id, req.body, getAuthUser(req));
      if (!lot) {
        res.status(404).json({ message: "Lote não encontrado" });
        return;
      }
      res.status(200).json(lot);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const deleted = await this.lotService.delete(req.params.id, getAuthUser(req));
      if (!deleted) {
        res.status(404).json({ message: "Lote não encontrado" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
