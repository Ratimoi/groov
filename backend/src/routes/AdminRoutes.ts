import { Router } from "express";
import { requireSeedReset } from "../middlewares/auth";
import { AdminController } from "../controllers/AdminController";
import { AdminService } from "../services/AdminService";

const router = Router();
const adminController = new AdminController(new AdminService());

// Não há administrador geral: só contas com `podeResetarSeed` ligado direto no banco chamam isto.
router.post("/resetar-seed", requireSeedReset, adminController.resetSeed);

export default router;
