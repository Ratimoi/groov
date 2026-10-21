import { NextFunction, Request, Response } from "express";
import type { AuthServiceContract } from "../types/auth";
import { AppError } from "../utils/AppError";

export class AuthController {
  private authService: AuthServiceContract;

  constructor(authService: AuthServiceContract) {
    this.authService = authService;
  }

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json(await this.authService.login(req.body));
    } catch (error) {
      next(error);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user ? await this.authService.me(req.user.id) : null;
      if (!user) {
        throw new AppError("Token inválido ou expirado", 401);
      }
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  };
}
