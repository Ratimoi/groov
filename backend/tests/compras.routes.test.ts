import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bearer, logadoComo } from "./helpers/auth";
import { prismaMock, resetPrismaMock, runTransactionCallbacks } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");

let AUTH: { Authorization: string };

const AGORA = new Date("2026-11-01T12:00:00.000Z");

// Lote de compra em grupo: 3 pessoas, 24h de prazo, 100 ingressos no total.
const lote = {
  id: "l1",
  eventoId: "e1",
  tamanhoGrupo: 3,
  prazoGrupoHoras: 24,
  quantidade: 100,
  quantidadeVendida: 80,
  quantidadeReservada: 0,
};
const grupo = { id: "g1", nome: "Rolê", liderId: "u1" };
const membros = ["u1", "u2", "u3", "u4"].map((usuarioId) => ({ usuarioId }));
const corpo = { grupoId: "g1", loteId: "l1", iniciadorId: "u1", participantesIds: ["u2", "u3"] };

function cenarioValido() {
  prismaMock.lote.findUnique.mockResolvedValue(lote);
  prismaMock.grupo.findUnique.mockResolvedValue(grupo);
  prismaMock.membroGrupo.findMany.mockResolvedValue(membros);
  prismaMock.participanteCompra.findMany.mockResolvedValue([]);
  runTransactionCallbacks();
  prismaMock.lote.update.mockResolvedValue({ ...lote, quantidadeReservada: 3 });
  prismaMock.compraGrupo.create.mockResolvedValue({ id: "c1", status: "PENDENTE" });
}

describe("/grupos/compras", () => {
  beforeEach(() => {
    resetPrismaMock();
    AUTH = logadoComo("CLIENTE", "u1");
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("POST (regras de negócio)", () => {
    it("cria a compra, reserva os ingressos e define o prazo pelo lote", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(AGORA);
      cenarioValido();
      // O token precisa ser assinado depois de fixar o relógio, senão já nasce expirado para a API.
      const res = await request(app).post("/grupos/compras").set(bearer("u1")).send(corpo);

      expect(res.status).toBe(201);
      expect(prismaMock.lote.update).toHaveBeenCalledWith({
        where: { id: "l1" },
        data: { quantidadeReservada: { increment: 3 } },
      });
      expect(prismaMock.compraGrupo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            grupoId: "g1",
            loteId: "l1",
            iniciadorId: "u1",
            expiraEm: new Date("2026-11-02T12:00:00.000Z"),
            participantes: { create: [{ usuarioId: "u1" }, { usuarioId: "u2" }, { usuarioId: "u3" }] },
          },
        }),
      );
    });

    it("conta o iniciador uma vez só, mesmo que ele apareça na lista de participantes", async () => {
      cenarioValido();

      const res = await request(app)
        .post("/grupos/compras").set(AUTH)
        .send({ ...corpo, participantesIds: ["u1", "u2", "u3"] });

      expect(res.status).toBe(201);
    });

    it("rejeita participantesIds que não seja uma lista", async () => {
      const res = await request(app)
        .post("/grupos/compras").set(AUTH)
        .send({ ...corpo, participantesIds: "u2" });

      expect(res.status).toBe(400);
      expect(prismaMock.lote.findUnique).not.toHaveBeenCalled();
    });

    it("lote inexistente responde 404", async () => {
      cenarioValido();
      prismaMock.lote.findUnique.mockResolvedValue(null);

      const res = await request(app).post("/grupos/compras").set(AUTH).send(corpo);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Lote não encontrado" });
    });

    it.each([
      ["sem tamanhoGrupo", { tamanhoGrupo: null }],
      ["sem prazoGrupoHoras", { prazoGrupoHoras: null }],
    ])("lote %s não aceita compra em grupo", async (_nome, parcial) => {
      cenarioValido();
      prismaMock.lote.findUnique.mockResolvedValue({ ...lote, ...parcial });

      const res = await request(app).post("/grupos/compras").set(AUTH).send(corpo);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Este lote não aceita compra em grupo" });
    });

    it("grupo inexistente responde 404", async () => {
      cenarioValido();
      prismaMock.grupo.findUnique.mockResolvedValue(null);

      const res = await request(app).post("/grupos/compras").set(AUTH).send(corpo);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Grupo não encontrado" });
    });

    it.each([
      ["menos", ["u2"]],
      ["mais", ["u2", "u3", "u4"]],
    ])("exige exatamente o tamanho do lote (%s participantes)", async (_nome, participantesIds) => {
      cenarioValido();

      const res = await request(app).post("/grupos/compras").set(AUTH).send({ ...corpo, participantesIds });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("exatamente 3 participantes");
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it("rejeita participantes que não pertencem ao grupo e lista quem são", async () => {
      cenarioValido();
      prismaMock.membroGrupo.findMany.mockResolvedValue([{ usuarioId: "u1" }, { usuarioId: "u2" }]);

      const res = await request(app).post("/grupos/compras").set(AUTH).send(corpo);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Usuários não pertencem ao grupo: u3");
    });

    it("rejeita quem já tem compra pendente no mesmo evento (409)", async () => {
      cenarioValido();
      prismaMock.participanteCompra.findMany.mockResolvedValue([{ usuarioId: "u2" }]);

      const res = await request(app).post("/grupos/compras").set(AUTH).send(corpo);

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("u2");
      expect(prismaMock.participanteCompra.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            usuarioId: { in: ["u1", "u2", "u3"] },
            compraGrupo: { status: "PENDENTE", lote: { eventoId: "e1" } },
          }),
        }),
      );
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it("estoque insuficiente responde 409 e não cria a compra", async () => {
      cenarioValido();
      // 98 vendidos + 3 reservados = 101 > 100
      prismaMock.lote.update.mockResolvedValue({ ...lote, quantidadeVendida: 98, quantidadeReservada: 3 });

      const res = await request(app).post("/grupos/compras").set(AUTH).send(corpo);

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ message: "Ingressos insuficientes no lote para esta compra em grupo" });
      expect(prismaMock.compraGrupo.create).not.toHaveBeenCalled();
    });

    it("aceita comprar exatamente os últimos ingressos do lote", async () => {
      cenarioValido();
      // 97 vendidos + 3 reservados = 100, igual à capacidade
      prismaMock.lote.update.mockResolvedValue({ ...lote, quantidadeVendida: 97, quantidadeReservada: 3 });

      const res = await request(app).post("/grupos/compras").set(AUTH).send(corpo);

      expect(res.status).toBe(201);
    });

    it("propaga erro inesperado da transação como 500", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      cenarioValido();
      prismaMock.lote.update.mockRejectedValue(new Error("deadlock"));

      const res = await request(app).post("/grupos/compras").set(AUTH).send(corpo);

      expect(res.status).toBe(500);
    });
  });

  describe("consulta", () => {
    it("GET lista as compras (não pode ser confundido com GET /grupos/:id)", async () => {
      prismaMock.compraGrupo.findMany.mockResolvedValue([{ id: "c1" }]);

      const res = await request(app).get("/grupos/compras").set(AUTH);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: "c1" }]);
      expect(prismaMock.grupo.findUnique).not.toHaveBeenCalled();
    });

    it("GET /:id devolve a compra", async () => {
      prismaMock.compraGrupo.findUnique.mockResolvedValue({ id: "c1" });

      const res = await request(app).get("/grupos/compras/c1").set(AUTH);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: "c1" });
    });

    it("GET /:id inexistente responde 404", async () => {
      prismaMock.compraGrupo.findUnique.mockResolvedValue(null);

      const res = await request(app).get("/grupos/compras/nada").set(AUTH);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Compra em grupo não encontrada" });
    });
  });
});
