import { Router } from "express";
import { TicketController } from "../controllers/TicketController";
import { TicketService } from "../services/TicketService";

const router = Router();
const ticketController = new TicketController(new TicketService());

// Quem pode validar (gerente do evento ou VALIDADOR) é checado no service.
router.post("/validar", ticketController.validate);
router.get("/", ticketController.findAll);
router.get("/:id", ticketController.findById);
router.post("/:id/transferir", ticketController.transfer);

export default router;
