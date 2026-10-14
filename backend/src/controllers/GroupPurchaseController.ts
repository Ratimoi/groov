import { Request, Response, NextFunction } from "express";
import type { GroupPurchaseServiceContract } from "../types/groupPurchase";

export class GroupPurchaseController {
  private groupPurchaseService: GroupPurchaseServiceContract;

  constructor(groupPurchaseService: GroupPurchaseServiceContract) {
    this.groupPurchaseService = groupPurchaseService;
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const purchase = await this.groupPurchaseService.create(req.body);
      res.status(201).json(purchase);
    } catch (error) {
      next(error);
    }
  };

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json(await this.groupPurchaseService.findAll());
    } catch (error) {
      next(error);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const purchase = await this.groupPurchaseService.findById(req.params.id);
      if (!purchase) {
        res.status(404).json({ message: "Compra em grupo não encontrada" });
        return;
      }
      res.status(200).json(purchase);
    } catch (error) {
      next(error);
    }
  };
}
