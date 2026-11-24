import { Prisma } from "@prisma/client";
import { EventDashboardModel } from "../models/EventDashboardModel";
import { EventModel } from "../models/EventModel";
import type { AuthUser } from "../types/auth";
import { AppError } from "../utils/AppError";
import { podeNoEvento } from "../utils/eventAccess";
import { EventAccessService } from "./EventAccessService";

const dinheiro = (valor: unknown) => new Prisma.Decimal((valor ?? 0) as Prisma.Decimal.Value).toFixed(2);

export class EventDashboardService {
  private dashboardModel: EventDashboardModel;
  private eventModel: EventModel;
  private access: EventAccessService;

  constructor(
    dashboardModel: EventDashboardModel = new EventDashboardModel(),
    eventModel: EventModel = new EventModel(),
    access: EventAccessService = new EventAccessService(),
  ) {
    this.dashboardModel = dashboardModel;
    this.eventModel = eventModel;
    this.access = access;
  }

  // Painel de um único evento. Só a equipe dele vê; o porteiro vê as entradas, mas não o dinheiro.
  async get(eventoId: string, actor: AuthUser) {
    const evento = await this.eventModel.findById(eventoId);
    if (!evento) throw new AppError("Evento não encontrado", 404);
    const funcao = await this.access.exigir(eventoId, actor, "VER_DASHBOARD");
    const verReceita = podeNoEvento(funcao, "VER_RECEITA");

    const dados = await this.dashboardModel.collect(eventoId);
    const status = (nome: "VALIDO" | "USADO" | "CANCELADO") =>
      dados.ingressosPorStatus.find((linha) => linha.status === nome)?.total ?? 0;
    const tentativa = (nome: "VALIDO" | "JA_UTILIZADO" | "INVALIDO") =>
      dados.tentativas.find((linha) => linha.resultado === nome)?.total ?? 0;

    const aguardando = status("VALIDO");
    const entraram = status("USADO");
    const cancelados = status("CANCELADO");

    return {
      evento: { id: evento.id, titulo: evento.titulo, comecaEm: evento.comecaEm, terminaEm: evento.terminaEm },
      funcao,
      ingressos: { emitidos: aguardando + entraram + cancelados, aguardando, entraram, cancelados },
      tentativas: {
        liberadas: tentativa("VALIDO"),
        jaUtilizados: tentativa("JA_UTILIZADO"),
        invalidas: tentativa("INVALIDO"),
      },
      entradasPorHora: dados.entradasPorHora,
      ultimasEntradas: dados.ultimasEntradas,
      lotes: dados.lotes.map((lote) => ({
        id: lote.id,
        nome: lote.nome,
        quantidade: lote.quantidade,
        vendidos: lote.quantidadeVendida,
        reservados: lote.quantidadeReservada,
        disponiveis: Math.max(0, lote.quantidade - lote.quantidadeVendida - lote.quantidadeReservada),
        ...(verReceita ? { preco: dinheiro(lote.preco) } : {}),
      })),
      ...(verReceita ? { receita: dinheiro(dados.receita) } : {}),
    };
  }
}
