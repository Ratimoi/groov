import { Router } from "express";
import { GroupPurchaseController } from "../controllers/GroupPurchaseController";
import { GroupPurchaseService } from "../services/GroupPurchaseService";

const router = Router();
const groupPurchaseController = new GroupPurchaseController(new GroupPurchaseService());

router.post("/", groupPurchaseController.create);
router.get("/", groupPurchaseController.findAll);
router.get("/:id", groupPurchaseController.findById);

export default router;
