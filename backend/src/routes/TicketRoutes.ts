import { Router } from "express";
import { TicketController } from "../controllers/TicketController";
import { TicketService } from "../services/TicketService";

const router = Router();
const ticketController = new TicketController(new TicketService());

router.get("/", ticketController.findAll);
router.get("/:id", ticketController.findById);

export default router;
