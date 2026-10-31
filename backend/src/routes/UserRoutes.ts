import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { GroupController } from "../controllers/GroupController";
import { GroupService } from "../services/GroupService";
import { authenticate, authorizeSelfOrAdmin, requireRole } from "../middlewares/auth";
import { UserService } from "../services/UserService";

const router = Router();
const userController = new UserController(new UserService());
const groupController = new GroupController(new GroupService());

router.post("/", userController.create); // cadastro público
router.get("/", authenticate, requireRole("ADMIN"), userController.findAll);
router.get("/busca", authenticate, userController.search);
router.get("/:id", authenticate, authorizeSelfOrAdmin, userController.findById);
router.put("/:id", authenticate, authorizeSelfOrAdmin, userController.update);
router.delete("/:id", authenticate, authorizeSelfOrAdmin, userController.delete);
router.get("/:id/grupos", authenticate, authorizeSelfOrAdmin, groupController.findByUsuario);
export default router;
