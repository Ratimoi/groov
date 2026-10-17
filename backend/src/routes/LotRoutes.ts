import { Router } from "express";
import { LotController } from "../controllers/LotController";
import { authenticate, requireRole } from "../middlewares/auth";
import { LotService } from "../services/LotService";

const router = Router();
export const lotController = new LotController(new LotService());

// Leitura pública (o app precisa mostrar preços antes do login).
router.get("/:id", lotController.findById);

// Escrita: PRODUTOR ou ADMIN, e ser o criador do evento do lote (ou ADMIN), checado no service.
const canWrite = [authenticate, requireRole("PRODUTOR", "ADMIN")];
router.put("/:id", ...canWrite, lotController.update);
router.delete("/:id", ...canWrite, lotController.delete);

export default router;
