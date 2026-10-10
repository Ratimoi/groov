import { Router } from "express";
import { GroupController } from "../controllers/GroupController";
import { GroupService } from "../services/GroupService";

const router = Router();
const groupController = new GroupController(new GroupService());

router.post("/", groupController.create);
router.get("/", groupController.findAll);
router.get("/:id", groupController.findById);
router.put("/:id", groupController.update);
router.delete("/:id", groupController.delete);

export default router;
