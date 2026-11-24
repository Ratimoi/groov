import { Router } from "express";
import { CategoryController } from "../controllers/CategoryController";
import { CategoryModel } from "../models/CategoryModel";

const router = Router();
const categoryController = new CategoryController(new CategoryModel());

router.get("/", categoryController.findAll);

export default router;
