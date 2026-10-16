import { Router } from "express";
import rateLimit from "express-rate-limit";
import { AuthController } from "../controllers/AuthController";
import { authenticate } from "../middlewares/auth";
import { AuthService } from "../services/AuthService";

type LoginLimiterOptions = { limit?: number; windowMs?: number; skip?: () => boolean };

// Limita tentativas de login por IP para dificultar adivinhação de senha.
export function createLoginLimiter({
  limit = 10,
  windowMs = 15 * 60 * 1000,
  skip = () => process.env.NODE_ENV === "test",
}: LoginLimiterOptions = {}) {
  return rateLimit({
    windowMs,
    limit,
    skip,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Muitas tentativas de login. Tente novamente mais tarde." },
  });
}

const router = Router();
const authController = new AuthController(new AuthService());

router.post("/login", createLoginLimiter(), authController.login);
router.get("/me", authenticate, authController.me);

export default router;
