import { NextFunction, Request, Response } from "express";
import type { CategoryModel } from "../models/CategoryModel";

export class CategoryController {
  private categoryModel: CategoryModel;

  constructor(categoryModel: CategoryModel) {
    this.categoryModel = categoryModel;
  }

  // Público: o app mostra as categorias ao criar ou editar um evento.
  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json(await this.categoryModel.findAll());
    } catch (error) {
      next(error);
    }
  };
}
