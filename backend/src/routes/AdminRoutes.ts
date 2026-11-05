import { Router } from "express";
import { requireRole } from "../middlewares/auth";
import { AdminController } from "../controllers/AdminController";
import { AdminService } from "../services/AdminService";

const router = Router();
const adminController = new AdminController(new AdminService());

router.get("/eventos/ocultos", requireRole("ADMIN"), adminController.listHiddenEvents);
router.post("/eventos/:id/ocultar", requireRole("ADMIN"), adminController.hideEvent);
router.post("/eventos/:id/reexibir", requireRole("ADMIN"), adminController.showEvent);
router.post("/resetar-seed", requireRole("ADMIN"), adminController.resetSeed);

export default router;
