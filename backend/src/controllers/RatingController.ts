import { Request, Response, NextFunction } from "express";
import { getAuthUser } from "../middlewares/auth";
import type { RatingServiceContract } from "../types/rating";

export class RatingController {
  private ratingService: RatingServiceContract;

  constructor(ratingService: RatingServiceContract) {
    this.ratingService = ratingService;
  }

  summary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json(await this.ratingService.summary(req.params.id));
    } catch (error) {
      next(error);
    }
  };

  rate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json(await this.ratingService.rate(req.params.id, req.body, getAuthUser(req)));
    } catch (error) {
      next(error);
    }
  };
}
