import { Router } from "express";
import { FeedController } from "../controllers/FeedController";
import { FeedService } from "../services/FeedService";

export const feedController = new FeedController(new FeedService());

const router = Router();
router.get("/", feedController.feed);

export default router;
