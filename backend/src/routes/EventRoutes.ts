import { Router } from "express";
import { EventController } from "../controllers/EventController";
import { EventTeamController } from "../controllers/EventTeamController";
import { RatingController } from "../controllers/RatingController";
import { lotController } from "./LotRoutes";
import { ticketController } from "./TicketRoutes";
import { authenticate } from "../middlewares/auth";
import { EventDashboardService } from "../services/EventDashboardService";
import { EventService } from "../services/EventService";
import { EventTeamService } from "../services/EventTeamService";
import { RatingService } from "../services/RatingService";

const router = Router();
const eventService = new EventService();
const eventController = new EventController(eventService);
const ratingController = new RatingController(new RatingService());
const teamController = new EventTeamController(new EventTeamService(), new EventDashboardService(), eventService);

router.get("/", eventController.findAll);
// Antes de "/:id", senão "meus" seria lido como um id de evento.
router.get("/meus", authenticate, teamController.mine);
router.get("/:id", eventController.findById);
router.get("/:eventoId/lotes", lotController.findByEvent);
router.get("/:id/avaliacoes", ratingController.summary);
router.post("/:id/avaliacoes", authenticate, ratingController.rate);

// Qualquer pessoa logada cria um evento e vira o DONO dele. Depois, o que cada um pode fazer
// (editar, lotes, equipe, validar QR, painel) depende da função no evento, checada nos services.
router.post("/", authenticate, eventController.create);
router.put("/:id", authenticate, eventController.update);
router.delete("/:id", authenticate, eventController.delete);
router.post("/:eventoId/lotes", authenticate, lotController.create);

// Só a equipe do evento: leitura de QR, painel e gestão da equipe (esta, só o dono).
router.post("/:eventoId/validar", authenticate, ticketController.validate);
router.get("/:eventoId/dashboard", authenticate, teamController.dashboard);
router.get("/:eventoId/equipe", authenticate, teamController.list);
router.post("/:eventoId/equipe", authenticate, teamController.add);
router.delete("/:eventoId/equipe/:usuarioId", authenticate, teamController.remove);

export default router;
