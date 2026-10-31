import { Router } from "express";
import { requireRole } from "../middlewares/auth";
import { TicketController } from "../controllers/TicketController";
import { TicketService } from "../services/TicketService";

const router = Router();
const ticketController = new TicketController(new TicketService());

router.post("/validar", requireRole("ADMIN"), ticketController.validate);
router.get("/", ticketController.findAll);
router.get("/:id", ticketController.findById);

export default router;
