import { Router } from "express";
import { EventController } from "../controllers/EventController";
import { authenticate, requireRole } from "../middlewares/auth";
import { EventService } from "../services/EventService";

const router = Router();
const eventController = new EventController(new EventService());

router.get("/", eventController.findAll);
router.get("/:id", eventController.findById);

// Escrita: só PRODUTOR e ADMIN. Editar e apagar também exige ser o criador (ou ADMIN), checado no service.
const canWrite = [authenticate, requireRole("PRODUTOR", "ADMIN")];
router.post("/", ...canWrite, eventController.create);
router.put("/:id", ...canWrite, eventController.update);
router.delete("/:id", ...canWrite, eventController.delete);

export default router;
