import { Router } from "express";
import { OrderController } from "../controllers/OrderController";
import { requireSimulatedPayment } from "../middlewares/requireSimulatedPayment";
import { OrderService } from "../services/OrderService";

const router = Router();
const orderController = new OrderController(new OrderService());

router.post("/", requireSimulatedPayment, orderController.create);

export default router;
