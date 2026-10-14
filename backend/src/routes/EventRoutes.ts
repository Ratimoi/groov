import { Router } from "express";
import { EventController } from "../controllers/EventController";
import { EventService } from "../services/EventService";

const router = Router();
const eventController = new EventController(new EventService());

router.get("/", eventController.findAll);
router.get("/:id", eventController.findById);

export default router;