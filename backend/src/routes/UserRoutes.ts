import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { GroupController } from "../controllers/GroupController";
import { GroupService } from "../services/GroupService";
import { authenticate, authorizeSelf } from "../middlewares/auth";
import { UserService } from "../services/UserService";

const router = Router();
const userController = new UserController(new UserService());
const groupController = new GroupController(new GroupService());

router.post("/", userController.create); // cadastro público
router.get("/busca", authenticate, userController.search);
router.get("/:id", authenticate, authorizeSelf, userController.findById);
router.put("/:id", authenticate, authorizeSelf, userController.update);
router.delete("/:id", authenticate, authorizeSelf, userController.delete);
router.get("/:id/grupos", authenticate, authorizeSelf, groupController.findByUsuario);
export default router;
