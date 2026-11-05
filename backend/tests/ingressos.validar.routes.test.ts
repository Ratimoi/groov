import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logadoComo } from "./helpers/auth";
import { prismaMock, resetPrismaMock, runTransactionCallbacks } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");

// Evento gerenciado por "adm" (o usuário padrão dos testes).
const ingresso = {
  id: "i1",
  codigoQr: "GRV-ABCDEFGHJKLM",
  eventoId: "e1",
  donoId: "u9",
  status: "VALIDO",
  usadoEm: null,
  evento: { criadoPorId: "adm" },
};

function programa(atual: Record<string, unknown> | null, baixas = 1) {
  runTransactionCallbacks();
  prismaMock.ingresso.findUnique.mockResolvedValue(atual);
  prismaMock.ingresso.updateMany.mockResolvedValue({ count: baixas });
  prismaMock.validacaoIngresso.create.mockResolvedValue({});
  // Para código desconhecido: "adm" valida em algum evento.
  prismaMock.evento.count.mockResolvedValue(1);
  prismaMock.eventoMembro.count.mockResolvedValue(0);
}

const validar = (corpo: unknown, papel: "ADMIN" | "CLIENTE" = "CLIENTE", id = "adm") =>
  request(app).post("/ingressos/validar").set(logadoComo(papel, id)).send(corpo as object);

describe("POST /ingressos/validar", () => {
  beforeEach(resetPrismaMock);

  it("sem token responde 401", async () => {
    const res = await request(app).post("/ingressos/validar").send({ codigo: ingresso.codigoQr });

    expect(res.status).toBe(401);
    expect(prismaMock.ingresso.updateMany).not.toHaveBeenCalled();
  });

  it.each(["CLIENTE", "ADMIN"] as const)("%s que não é da equipe do evento recebe 403 e nada é gravado", async (papel) => {
    programa(ingresso);
    prismaMock.eventoMembro.findUnique.mockResolvedValue(null);

    const res = await validar({ codigo: ingresso.codigoQr }, papel, "intruso");

    expect(res.status).toBe(403);
    expect(prismaMock.ingresso.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.validacaoIngresso.create).not.toHaveBeenCalled();
  });

  it("VALIDADOR do evento libera a entrada", async () => {
    programa(ingresso);
    prismaMock.eventoMembro.findUnique.mockResolvedValue({ cargo: "VALIDADOR" });

    const res = await validar({ codigo: ingresso.codigoQr }, "CLIENTE", "val1");

    expect(res.status).toBe(200);
    expect(prismaMock.validacaoIngresso.create.mock.calls[0][0].data.validadoPorId).toBe("val1");
  });

  it("PROMOTOR do evento não valida", async () => {
    programa(ingresso);
    prismaMock.eventoMembro.findUnique.mockResolvedValue({ cargo: "PROMOTOR" });

    const res = await validar({ codigo: ingresso.codigoQr }, "CLIENTE", "prom1");

    expect(res.status).toBe(403);
    expect(prismaMock.ingresso.updateMany).not.toHaveBeenCalled();
  });

  it("código desconhecido para quem não valida em evento nenhum responde 403", async () => {
    programa(null);
    prismaMock.evento.count.mockResolvedValue(0);
    prismaMock.eventoMembro.count.mockResolvedValue(0);

    const res = await validar({ codigo: "GRV-NAOEXISTE00" });

    expect(res.status).toBe(403);
  });

  it.each([
    ["sem corpo", undefined],
    ["sem codigo", {}],
    ["codigo vazio", { codigo: "  " }],
    ["codigo numérico", { codigo: 123 }],
    ["codigo gigante", { codigo: "A".repeat(65) }],
    ["eventoId vazio", { codigo: "GRV-X", eventoId: "" }],
    ["eventoId numérico", { codigo: "GRV-X", eventoId: 1 }],
  ])("%s responde 400", async (_nome, corpo) => {
    const res = await validar(corpo);

    expect(res.status).toBe(400);
    expect(prismaMock.ingresso.updateMany).not.toHaveBeenCalled();
  });

  it("libera a entrada: marca USADO, devolve o ingresso e registra a validação", async () => {
    programa(ingresso);

    const res = await validar({ codigo: " grv-abcdefghjklm " });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ resultado: "VALIDO", mensagem: "Entrada liberada" });
    expect(res.body.ingresso).toMatchObject({ id: "i1", status: "USADO" });
    expect(res.body.ingresso.usadoEm).toEqual(expect.any(String));
    expect(prismaMock.ingresso.findUnique.mock.calls[0][0].where).toEqual({ codigoQr: "GRV-ABCDEFGHJKLM" });
    expect(prismaMock.ingresso.updateMany).toHaveBeenCalledWith({
      where: { id: "i1", status: "VALIDO" },
      data: { status: "USADO", usadoEm: expect.any(Date) },
    });
    expect(prismaMock.validacaoIngresso.create).toHaveBeenCalledWith({
      data: { codigoLido: "GRV-ABCDEFGHJKLM", ingressoId: "i1", eventoId: "e1", validadoPorId: "adm", resultado: "VALIDO" },
    });
  });

  it("código inexistente responde 404 INVALIDO e não registra nada", async () => {
    programa(null);

    const res = await validar({ codigo: "GRV-NAOEXISTE00" });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ resultado: "INVALIDO", mensagem: "Ingresso não encontrado", ingresso: null });
    expect(prismaMock.ingresso.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.validacaoIngresso.create).not.toHaveBeenCalled();
  });

  it("ingresso já usado responde 409 JA_UTILIZADO sem dar baixa de novo", async () => {
    programa({ ...ingresso, status: "USADO" }, 0);

    const res = await validar({ codigo: ingresso.codigoQr });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ resultado: "JA_UTILIZADO", mensagem: "Ingresso já utilizado" });
    expect(prismaMock.validacaoIngresso.create.mock.calls[0][0].data.resultado).toBe("JA_UTILIZADO");
  });

  it("perde a corrida (outro leitor deu baixa entre a leitura e a troca): JA_UTILIZADO", async () => {
    programa(ingresso, 0);

    const res = await validar({ codigo: ingresso.codigoQr });

    expect(res.status).toBe(409);
    expect(res.body.resultado).toBe("JA_UTILIZADO");
  });

  it("ingresso cancelado responde 409 INVALIDO sem dar baixa", async () => {
    programa({ ...ingresso, status: "CANCELADO" });

    const res = await validar({ codigo: ingresso.codigoQr });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ resultado: "INVALIDO", mensagem: "Ingresso cancelado" });
    expect(prismaMock.ingresso.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.validacaoIngresso.create.mock.calls[0][0].data.resultado).toBe("INVALIDO");
  });

  it("com eventoId de outro evento recusa sem dar baixa", async () => {
    programa(ingresso);

    const res = await validar({ codigo: ingresso.codigoQr, eventoId: "e2" });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ resultado: "INVALIDO", mensagem: "Este ingresso é de outro evento" });
    expect(prismaMock.ingresso.updateMany).not.toHaveBeenCalled();
  });

  it("com o eventoId certo libera normalmente", async () => {
    programa(ingresso);

    const res = await validar({ codigo: ingresso.codigoQr, eventoId: "e1" });

    expect(res.status).toBe(200);
  });
});
