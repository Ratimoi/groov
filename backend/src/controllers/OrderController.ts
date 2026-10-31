import { Request, Response, NextFunction } from "express";
import { getAuthUser } from "../middlewares/auth";
import type { OrderServiceContract } from "../types/order";

export class OrderController {
  private orderService: OrderServiceContract;

  constructor(orderService: OrderServiceContract) {
    this.orderService = orderService;
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(201).json(await this.orderService.create(req.body, getAuthUser(req)));
    } catch (error) {
      next(error);
    }
  };
}
