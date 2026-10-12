import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { UserService } from "../services/UserService";

const router = Router();
const userController = new UserController(new UserService());

router.post("/", userController.create);
router.get("/", userController.findAll);
router.get("/:id", userController.findById);
router.put("/:id", userController.update);
router.delete("/:id", userController.delete);

export default router;