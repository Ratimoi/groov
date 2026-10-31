import { TicketModel } from "../models/TicketModel";
import type { AuthUser } from "../types/auth";
import type { Ticket, TicketServiceContract, TicketValidateBody, TicketValidation, ValidationReason } from "../types/ticket";
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

  constructor(ticketModel: TicketModel = new TicketModel()) {
    this.ticketModel = ticketModel;
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
