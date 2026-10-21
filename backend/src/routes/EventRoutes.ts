import { Router } from "express";
import { EventController } from "../controllers/EventController";
import { lotController } from "./LotRoutes";
import { authenticate, requireRole } from "../middlewares/auth";
import { EventService } from "../services/EventService";

const router = Router();
const eventController = new EventController(new EventService());

router.get("/", eventController.findAll);
router.get("/:id", eventController.findById);
router.get("/:eventoId/lotes", lotController.findByEvent);

// Escrita: só PRODUTOR e ADMIN. Editar e apagar também exige ser o criador (ou ADMIN), checado no service.
const canWrite = [authenticate, requireRole("PRODUTOR", "ADMIN")];
router.post("/", ...canWrite, eventController.create);
router.put("/:id", ...canWrite, eventController.update);
router.delete("/:id", ...canWrite, eventController.delete);
router.post("/:eventoId/lotes", ...canWrite, lotController.create);

export default router;
