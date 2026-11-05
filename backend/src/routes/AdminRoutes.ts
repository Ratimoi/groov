import { Router } from "express";
import { requireRole } from "../middlewares/auth";
import { AdminController } from "../controllers/AdminController";
import { AdminService } from "../services/AdminService";

const router = Router();
const adminController = new AdminController(new AdminService());

router.post("/resetar-seed", requireRole("ADMIN"), adminController.resetSeed);

export default router;
