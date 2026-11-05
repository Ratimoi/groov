import { Router } from "express";
import { EventController } from "../controllers/EventController";
import { RatingController } from "../controllers/RatingController";
import { lotController } from "./LotRoutes";
import { authenticate } from "../middlewares/auth";
import { publishLimiter } from "../middlewares/publishLimiter";
import { TeamController } from "../controllers/TeamController";
import { TeamService } from "../services/TeamService";
import { EventService } from "../services/EventService";
import { RatingService } from "../services/RatingService";

const router = Router();
const eventController = new EventController(new EventService());
const ratingController = new RatingController(new RatingService());
const teamController = new TeamController(new TeamService());

router.get("/", eventController.findAll);
// Antes de "/:id" para "meus" não ser lido como id.
router.get("/meus", authenticate, teamController.myEvents);
router.get("/:id", eventController.findById);
router.get("/:eventoId/lotes", lotController.findByEvent);
router.get("/:id/avaliacoes", ratingController.summary);
router.post("/:id/avaliacoes", authenticate, ratingController.rate);

// Qualquer usuário logado publica um evento e vira o gerente dele. Editar, apagar e montar a equipe
// exige ser o gerente (quem publicou), checado nos services.
router.post("/", authenticate, publishLimiter, eventController.create);
router.put("/:id", authenticate, eventController.update);
router.delete("/:id", authenticate, eventController.delete);
router.post("/:eventoId/lotes", authenticate, lotController.create);

router.get("/:id/afiliado/:codigo", authenticate, teamController.checkCode);
router.get("/:id/promotor", authenticate, teamController.promoterPanel);
router.get("/:id/equipe", authenticate, teamController.list);
router.post("/:id/equipe", authenticate, teamController.add);
router.delete("/:id/equipe/:usuarioId", authenticate, teamController.remove);

export default router;
