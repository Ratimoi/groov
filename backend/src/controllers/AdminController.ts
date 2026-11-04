import { Request, Response, NextFunction } from "express";
import { getAuthUser } from "../middlewares/auth";
import type { AdminService } from "../services/AdminService";

export class AdminController {
  private adminService: AdminService;

  constructor(adminService: AdminService) {
    this.adminService = adminService;
  }

  resetSeed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json(await this.adminService.resetarSeed(getAuthUser(req)));
    } catch (error) {
      next(error);
    }
  };
}
