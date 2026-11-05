import { Router } from "express";
import { LotController } from "../controllers/LotController";
import { authenticate } from "../middlewares/auth";
import { LotService } from "../services/LotService";

const router = Router();
export const lotController = new LotController(new LotService());

// Leitura pública (o app precisa mostrar preços antes do login).
router.get("/:id", lotController.findById);
router.get("/evento/:eventoId", lotController.findByEvent);

// Escrita: usuário logado que seja o gerente do evento do lote (checado no service).
router.put("/:id", authenticate, lotController.update);
router.delete("/:id", authenticate, lotController.delete);

export default router;
