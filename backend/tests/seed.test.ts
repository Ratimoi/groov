import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock, resetPrismaMock } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { aplicarSeed } = await import("../src/seed/aplicarSeed");

const dados = (delegate: { createMany: { mock: { calls: unknown[][] } } }, chamada = 0) =>
  (delegate.createMany.mock.calls[chamada][0] as { data: Record<string, unknown>[] }).data;

describe("seed de demonstração", () => {
  beforeEach(async () => {
    resetPrismaMock();
    await aplicarSeed(prismaMock as never, "senha-do-seed-1");
  });

  it("não cria papel nem administrador: ninguém no seed tem poder global", () => {
    for (const usuario of [...dados(prismaMock.usuario, 0), ...dados(prismaMock.usuario, 1)]) {
      expect(usuario).not.toHaveProperty("papel");
      expect(usuario.podeResetarSeed).toBeUndefined();
    }
  });

  it("os eventos têm datas coerentes, nenhum fica no passado (só o de 'agora' já começou) e sem horario", () => {
    const eventos = dados(prismaMock.evento) as { id: string; comecaEm: Date; terminaEm: Date; horario?: unknown }[];
    const agora = Date.now();
    for (const evento of eventos) {
      expect(evento).not.toHaveProperty("horario");
      expect(evento.terminaEm.getTime()).toBeGreaterThan(evento.comecaEm.getTime());
      expect(evento.terminaEm.getTime()).toBeGreaterThan(agora);
    }
    const emAndamento = eventos.filter((evento) => evento.comecaEm.getTime() <= agora);
    expect(emAndamento.map((evento) => evento.id)).toEqual(["evt-festa-01"]);
  });

  it("todo evento tem o criador como DONO e a equipe de demonstração (produtor e porteiro)", () => {
    const eventos = dados(prismaMock.evento) as { id: string; criadoPorId: string }[];
    const equipe = dados(prismaMock.membroEvento) as { eventoId: string; usuarioId: string; funcao: string }[];
    for (const evento of eventos) {
      expect(equipe).toContainEqual({ eventoId: evento.id, usuarioId: evento.criadoPorId, funcao: "DONO" });
    }
    expect(equipe.filter((membro) => membro.funcao === "PORTEIRO")).toHaveLength(1);
    expect(equipe.filter((membro) => membro.funcao === "PRODUTOR").length).toBeGreaterThan(0);
  });

  it("os lotes têm id único e as vendas de demonstração apontam para lotes e pedidos existentes", () => {
    const lotes = dados(prismaMock.lote) as { id: string; eventoId: string }[];
    const ids = lotes.map((lote) => lote.id);
    expect(new Set(ids).size).toBe(ids.length);

    const pedidos = dados(prismaMock.pedido) as { id: string; loteId: string; quantidade: number; valor: string; subtotal: string }[];
    const ingressos = dados(prismaMock.ingresso) as { loteId: string; pedidoId: string; codigoQr: string; status: string }[];
    for (const pedido of pedidos) expect(ids).toContain(pedido.loteId);
    for (const ingresso of ingressos) expect(pedidos.map((pedido) => pedido.id)).toContain(ingresso.pedidoId);
    expect(ingressos).toHaveLength(pedidos.reduce((total, pedido) => total + pedido.quantidade, 0));
    expect(new Set(ingressos.map((ingresso) => ingresso.codigoQr)).size).toBe(ingressos.length);
    for (const pedido of pedidos) expect(Number(pedido.valor)).toBeCloseTo(Number(pedido.subtotal) * 1.125, 2);
  });

  it("o estoque vendido bate com os ingressos emitidos e as validações só existem para ingressos usados", () => {
    const ingressos = dados(prismaMock.ingresso) as { loteId: string; status: string }[];
    for (const [{ where, data }] of prismaMock.lote.update.mock.calls as [{ where: { id: string }; data: { quantidadeVendida: number } }][]) {
      expect(data.quantidadeVendida).toBe(ingressos.filter((ingresso) => ingresso.loteId === where.id).length);
    }
    const validacoes = dados(prismaMock.validacaoIngresso);
    expect(validacoes).toHaveLength(ingressos.filter((ingresso) => ingresso.status === "USADO").length);
  });
});
