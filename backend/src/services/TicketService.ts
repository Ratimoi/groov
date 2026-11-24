import { EventModel } from "../models/EventModel";
import { TicketModel } from "../models/TicketModel";
import { UserModel } from "../models/UserModel";
import type { AuthUser } from "../types/auth";
import type { Ticket, TicketServiceContract, TicketTransferBody, TicketValidateBody, TicketValidation, ValidationReason } from "../types/ticket";
import { AppError } from "../utils/AppError";
import { asObject, fail } from "../utils/validation";
import { EventAccessService } from "./EventAccessService";

const MENSAGENS: Record<ValidationReason, string> = {
  OK: "Entrada liberada",
  NAO_ENCONTRADO: "Ingresso não encontrado",
  OUTRO_EVENTO: "Este ingresso é de outro evento",
  CANCELADO: "Ingresso cancelado",
  USADO: "Ingresso já utilizado",
};

export class TicketService implements TicketServiceContract {
  private ticketModel: TicketModel;
  private userModel: UserModel;

  private eventModel: EventModel;
  private access: EventAccessService;

  constructor(
    ticketModel: TicketModel = new TicketModel(),
    userModel: UserModel = new UserModel(),
    eventModel: EventModel = new EventModel(),
    access: EventAccessService = new EventAccessService(),
  ) {
    this.ticketModel = ticketModel;
    this.userModel = userModel;
    this.eventModel = eventModel;
    this.access = access;
  }

  // Quem lê o QR é a equipe do próprio evento (dono, produtor ou porteiro). Um ingresso de outro
  // evento é recusado, mesmo que a pessoa seja da equipe de ambos.
  async validate(eventoId: string, body: TicketValidateBody, actor: AuthUser): Promise<TicketValidation> {
    const { codigo } = asObject(body);
    if (typeof codigo !== "string" || codigo.trim() === "" || codigo.length > 64) fail("codigo é obrigatório");

    if (!(await this.eventModel.findById(eventoId))) throw new AppError("Evento não encontrado", 404);
    await this.access.exigir(eventoId, actor, "VALIDAR_INGRESSO");

    const { resultado, motivo, ingresso } = await this.ticketModel.validate(
      codigo.trim().toUpperCase(),
      eventoId,
      actor.id,
      new Date(),
    );
    return { resultado, mensagem: MENSAGENS[motivo], ingresso };
  }

  // Só o dono transfere, e só ingresso VALIDO. O código muda: o QR antigo para de valer.
  async transfer(id: string, body: TicketTransferBody, actor: AuthUser): Promise<Ticket> {
    const { username } = asObject(body);
    if (typeof username !== "string" || username.trim() === "") fail("username é obrigatório");

    const ticket = await this.findById(id, actor);
    if (!ticket) throw new AppError("Ingresso não encontrado", 404);
    if (ticket.status !== "VALIDO") throw new AppError("Só um ingresso válido pode ser transferido", 409);

    const destinoId = await this.userModel.findIdByUsername(username.trim().replace(/^@/, ""));
    if (!destinoId) throw new AppError("Usuário não encontrado", 404);
    if (destinoId === actor.id) throw new AppError("Você já é o dono deste ingresso", 400);

    const transferido = await this.ticketModel.transfer(id, actor.id, destinoId);
    if (!transferido) throw new AppError("O ingresso não pode mais ser transferido", 409);
    return transferido;
  }

  // Cada usuário vê só os próprios ingressos (inclusive o ADMIN): o código é a chave de entrada.
  async findAll(actor: AuthUser): Promise<Ticket[]> {
    return this.ticketModel.findByOwner(actor.id);
  }

  // Ingresso de outra pessoa se comporta como inexistente (404).
  async findById(id: string, actor: AuthUser): Promise<Ticket | null> {
    const ticket = await this.ticketModel.findById(id);
    return ticket && ticket.donoId === actor.id ? ticket : null;
  }
}
