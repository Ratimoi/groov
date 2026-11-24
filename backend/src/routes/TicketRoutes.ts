import { Router } from "express";
import { TicketController } from "../controllers/TicketController";
import { TicketService } from "../services/TicketService";

const router = Router();
export const ticketController = new TicketController(new TicketService());

router.get("/", ticketController.findAll);
router.get("/:id", ticketController.findById);
router.post("/:id/transferir", ticketController.transfer);

export default router;
