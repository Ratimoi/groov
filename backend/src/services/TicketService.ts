import { TicketModel } from "../models/TicketModel";
import type { AuthUser } from "../types/auth";
import type { Ticket, TicketServiceContract } from "../types/ticket";

export class TicketService implements TicketServiceContract {
  private ticketModel: TicketModel;

  constructor(ticketModel: TicketModel = new TicketModel()) {
    this.ticketModel = ticketModel;
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
