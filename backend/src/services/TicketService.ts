import { TicketModel } from "../models/TicketModel";
import { UserModel } from "../models/UserModel";
import type { AuthUser } from "../types/auth";
import type { Ticket, TicketServiceContract, TicketTransferBody, TicketValidateBody, TicketValidation, ValidationReason } from "../types/ticket";
import { AppError } from "../utils/AppError";
import { asObject, fail } from "../utils/validation";

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

  constructor(ticketModel: TicketModel = new TicketModel(), userModel: UserModel = new UserModel()) {
    this.ticketModel = ticketModel;
    this.userModel = userModel;
  }

  // Só ADMIN valida (a rota exige o papel). `eventoId` é opcional: quando vem, ingresso de outro
  // evento é recusado.
  async validate(body: TicketValidateBody, actor: AuthUser): Promise<TicketValidation> {
    const { codigo, eventoId } = asObject(body);

    if (typeof codigo !== "string" || codigo.trim() === "" || codigo.length > 64) fail("codigo é obrigatório");
    if (eventoId !== undefined && (typeof eventoId !== "string" || eventoId.trim() === "")) fail("eventoId inválido");

    const { resultado, motivo, ingresso } = await this.ticketModel.validate(
      codigo.trim().toUpperCase(),
      eventoId as string | undefined,
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
