import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/UserService";

export class UserController {
	private userService: UserService;
	
  constructor(userService: UserService) {
    this.userService = userService;
  }

	create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const user = await this.userService.create(req.body);
			res.status(201).json(user);
		} catch (error) {
			next(error);
		}
	};

	findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			res.status(200).json(await this.userService.findAll());
		} catch (error) {
			next(error);
		}
	};

	findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const user = await this.userService.findById(req.params.id);
			if (!user) {
				res.status(404).json({ message: "User not found" });
				return;
			}
			res.status(200).json(user);
		} catch (error) {
			next(error);
		}
	};

	update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const user = await this.userService.update(req.params.id, req.body);
			if (!user) {
				res.status(404).json({ message: "User not found" });
				return;
			}
			res.status(200).json(user);
		} catch (error) {
			next(error);
		}
	};

	delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const deleted = await this.userService.delete(req.params.id);
			if (!deleted) {
				res.status(404).json({ message: "User not found" });
				return;
			}
			res.status(204).send();
		} catch (error) {
			next(error);
		}
	};
}
