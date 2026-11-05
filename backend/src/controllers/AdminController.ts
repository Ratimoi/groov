import { Request, Response, NextFunction } from "express";
import { getAuthUser } from "../middlewares/auth";
import type { AdminService } from "../services/AdminService";

export class AdminController {
  private adminService: AdminService;

  constructor(adminService: AdminService) {
    this.adminService = adminService;
  }

  hideEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json(await this.adminService.hideEvent(req.params.id, req.body));
    } catch (error) {
      next(error);
    }
  };

  showEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json(await this.adminService.showEvent(req.params.id));
    } catch (error) {
      next(error);
    }
  };

  listHiddenEvents = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json(await this.adminService.listHiddenEvents());
    } catch (error) {
      next(error);
    }
  };

  resetSeed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json(await this.adminService.resetarSeed(getAuthUser(req)));
    } catch (error) {
      next(error);
    }
  };
}
