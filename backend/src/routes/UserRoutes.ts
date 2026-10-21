import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { authenticate, authorizeSelfOrAdmin, requireRole } from "../middlewares/auth";
import { UserService } from "../services/UserService";

const router = Router();
const userController = new UserController(new UserService());

router.post("/", userController.create); // cadastro público
router.get("/", authenticate, requireRole("ADMIN"), userController.findAll);
router.get("/:id", authenticate, authorizeSelfOrAdmin, userController.findById);
router.put("/:id", authenticate, authorizeSelfOrAdmin, userController.update);
router.delete("/:id", authenticate, authorizeSelfOrAdmin, userController.delete);

export default router;
