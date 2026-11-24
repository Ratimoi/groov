import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logadoComo } from "./helpers/auth";
import { programaEquipe } from "./helpers/equipe";
import { prismaError } from "./helpers/prismaErrors";
import { prismaMock, resetPrismaMock } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");

// p1 é o dono do evento, p2 é produtor dele, p3 é porteiro dele; c1 não é da equipe.
const evento = { id: "e1", titulo: "Show", cidade: "Recife", criadoPorId: "p1" };

const lote = {
  id: "l1",
  eventoId: "e1",
  nome: "1º lote",
  preco: "180",
  quantidade: 100,
  quantidadeVendida: 10,
  quantidadeReservada: 5,
  tamanhoGrupo: null,
  descontoGrupo: null,
  prazoGrupoHoras: null,
  criadoEm: new Date("2026-10-01T12:00:00.000Z"),
};

// Lote com compra em grupo configurada e sem reservas.
const loteGrupo = { ...lote, quantidadeReservada: 0, tamanhoGrupo: 4, prazoGrupoHoras: 48, descontoGrupo: "0.1500" };

const criador = () => logadoComo("p1");
const produtor = () => logadoComo("p2");
const porteiro = () => logadoComo("p3");
const estranho = () => logadoComo("c1");
// Conta liberada para resetar o seed: não ganha nenhum poder sobre eventos.
const contaDoSeed = () => logadoComo("adm", true);

describe("lotes", () => {
  beforeEach(() => {
    resetPrismaMock();
    prismaMock.evento.findUnique.mockResolvedValue(evento);
    prismaMock.lote.findUnique.mockResolvedValue(lote);
    programaEquipe({ p1: "DONO", p2: "PRODUTOR", p3: "PORTEIRO" });
  });

  describe("GET /eventos/:eventoId/lotes (público)", () => {
    it("lista os lotes com preço em texto, disponibilidade calculada e sem dados internos", async () => {
      prismaMock.lote.findMany.mockResolvedValue([{ ...lote, descontoGrupo: "0.15", tamanhoGrupo: 4, prazoGrupoHoras: 48 }]);

      const res = await request(app).get("/eventos/e1/lotes");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([
        {
          id: "l1",
          eventoId: "e1",
          nome: "1º lote",
          preco: "180.00",
          quantidade: 100,
          quantidadeVendida: 10,
          quantidadeReservada: 5,
          quantidadeDisponivel: 85,
          tamanhoGrupo: 4,
          descontoGrupo: "0.1500",
          prazoGrupoHoras: 48,
          criadoEm: "2026-10-01T12:00:00.000Z",
        },
      ]);
      expect(res.body[0]).not.toHaveProperty("evento");
      expect(prismaMock.lote.findMany).toHaveBeenCalledWith({
        where: { eventoId: "e1" },
        orderBy: [{ criadoEm: "asc" }, { id: "asc" }],
      });
    });

    it("evento sem lotes devolve lista vazia", async () => {
      prismaMock.lote.findMany.mockResolvedValue([]);

      const res = await request(app).get("/eventos/e1/lotes");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("evento inexistente responde 404", async () => {
      prismaMock.evento.findUnique.mockResolvedValue(null);

      const res = await request(app).get("/eventos/nada/lotes");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Evento não encontrado" });
      expect(prismaMock.lote.findMany).not.toHaveBeenCalled();
    });
  });

  describe("GET /lotes/:id (público)", () => {
    it("devolve o lote sem expor o evento embutido", async () => {
      const res = await request(app).get("/lotes/l1");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: "l1", preco: "180.00", quantidadeDisponivel: 85, descontoGrupo: null });
      expect(res.body).not.toHaveProperty("evento");
    });

    it("a disponibilidade nunca fica negativa", async () => {
      prismaMock.lote.findUnique.mockResolvedValue({ ...lote, quantidade: 10, quantidadeVendida: 8, quantidadeReservada: 5 });

      const res = await request(app).get("/lotes/l1");

      expect(res.body.quantidadeDisponivel).toBe(0);
    });

    it("lote inexistente responde 404", async () => {
      prismaMock.lote.findUnique.mockResolvedValue(null);

      const res = await request(app).get("/lotes/nada");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Lote não encontrado" });
    });
  });

  describe("POST /eventos/:eventoId/lotes", () => {
    const valido = { nome: "1º lote", preco: 180, quantidade: 100 };

    beforeEach(() => {
      prismaMock.lote.create.mockImplementation(async ({ data }) => ({
        ...lote,
        quantidadeVendida: 0,
        quantidadeReservada: 0,
        ...data,
      }));
    });

    it("o criador do evento cria o lote", async () => {
      const res = await request(app).post("/eventos/e1/lotes").set(criador()).send(valido);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ nome: "1º lote", preco: "180.00", quantidade: 100, quantidadeDisponivel: 100 });
      expect(prismaMock.lote.create).toHaveBeenCalledWith({
        data: { nome: "1º lote", preco: "180.00", quantidade: 100, eventoId: "e1" },
      });
    });

    it.each([
      [180.5, "180.50"],
      ["90", "90.00"],
      ["0", "0.00"],
      ["99999999.99", "99999999.99"],
    ])("preco %s é gravado como %s (sem erro de ponto flutuante)", async (preco, esperado) => {
      await request(app).post("/eventos/e1/lotes").set(criador()).send({ ...valido, preco });

      expect(prismaMock.lote.create.mock.calls[0][0].data.preco).toBe(esperado);
    });

    it("aceita a configuração de compra em grupo", async () => {
      const res = await request(app)
        .post("/eventos/e1/lotes")
        .set(criador())
        .send({ ...valido, tamanhoGrupo: 4, prazoGrupoHoras: 48, descontoGrupo: 0.15 });

      expect(res.status).toBe(201);
      expect(prismaMock.lote.create.mock.calls[0][0].data).toMatchObject({
        tamanhoGrupo: 4,
        prazoGrupoHoras: 48,
        descontoGrupo: "0.1500",
      });
    });

    it("o produtor do evento também cria lote", async () => {
      const res = await request(app).post("/eventos/e1/lotes").set(produtor()).send(valido);

      expect(res.status).toBe(201);
    });

    it.each([
      ["o porteiro", porteiro],
      ["quem não é da equipe", estranho],
      ["a conta liberada para resetar o seed", contaDoSeed],
    ])("%s recebe 403 e nada é gravado", async (_nome, quem) => {
      const res = await request(app).post("/eventos/e1/lotes").set(quem()).send(valido);

      expect(res.status).toBe(403);
      expect(prismaMock.lote.create).not.toHaveBeenCalled();
    });

    it("sem token responde 401", async () => {
      const res = await request(app).post("/eventos/e1/lotes").send(valido);

      expect(res.status).toBe(401);
    });

    it("evento inexistente responde 404", async () => {
      prismaMock.evento.findUnique.mockResolvedValue(null);

      const res = await request(app).post("/eventos/nada/lotes").set(criador()).send(valido);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Evento não encontrado" });
    });

    it("ignora id, eventoId e os contadores de venda vindos do corpo", async () => {
      await request(app)
        .post("/eventos/e1/lotes")
        .set(criador())
        .send({ ...valido, id: "forjado", eventoId: "outro", quantidadeVendida: 50, quantidadeReservada: 20 });

      const { data } = prismaMock.lote.create.mock.calls[0][0];
      expect(data.eventoId).toBe("e1");
      expect(data).not.toHaveProperty("id");
      expect(data).not.toHaveProperty("quantidadeVendida");
      expect(data).not.toHaveProperty("quantidadeReservada");
    });

    it("a checagem de permissão vem antes da validação", async () => {
      const res = await request(app).post("/eventos/e1/lotes").set(estranho()).send({ nome: "" });

      expect(res.status).toBe(403);
    });

    it.each([
      ["nome ausente", { nome: undefined }, "nome é obrigatório"],
      ["nome vazio", { nome: "  " }, "nome é obrigatório"],
      ["nome longo demais", { nome: "x".repeat(101) }, "nome deve ter no máximo 100 caracteres"],
      ["preco ausente", { preco: undefined }, "preco é obrigatório"],
      ["preco negativo", { preco: -1 }, "preco deve ser um número com no máximo 2 casas decimais"],
      ["preco com 3 casas", { preco: "10.999" }, "preco deve ser um número com no máximo 2 casas decimais"],
      ["preco em notação científica", { preco: "1e3" }, "preco deve ser um número com no máximo 2 casas decimais"],
      ["preco que não é número", { preco: "abc" }, "preco deve ser um número com no máximo 2 casas decimais"],
      ["preco booleano", { preco: true }, "preco deve ser um número com no máximo 2 casas decimais"],
      ["preco acima do limite", { preco: 100000000 }, "preco deve estar entre 0 e 99999999.99"],
      ["quantidade ausente", { quantidade: undefined }, "quantidade é obrigatório"],
      ["quantidade zero", { quantidade: 0 }, "quantidade deve ser um inteiro entre 1 e 1000000"],
      ["quantidade fracionada", { quantidade: 1.5 }, "quantidade deve ser um inteiro entre 1 e 1000000"],
      ["quantidade em texto", { quantidade: "10" }, "quantidade deve ser um inteiro entre 1 e 1000000"],
      ["quantidade acima do limite", { quantidade: 1000001 }, "quantidade deve ser um inteiro entre 1 e 1000000"],
      ["tamanhoGrupo 1", { tamanhoGrupo: 1, prazoGrupoHoras: 24 }, "tamanhoGrupo deve ser um inteiro entre 2 e 50"],
      ["tamanhoGrupo acima de 50", { tamanhoGrupo: 51, prazoGrupoHoras: 24 }, "tamanhoGrupo deve ser um inteiro entre 2 e 50"],
      ["prazoGrupoHoras zero", { tamanhoGrupo: 4, prazoGrupoHoras: 0 }, "prazoGrupoHoras deve ser um inteiro entre 1 e 720"],
      ["prazoGrupoHoras acima de 30 dias", { tamanhoGrupo: 4, prazoGrupoHoras: 721 }, "prazoGrupoHoras deve ser um inteiro entre 1 e 720"],
      ["tamanhoGrupo sem prazo", { tamanhoGrupo: 4 }, "tamanhoGrupo e prazoGrupoHoras devem ser informados juntos"],
      ["prazo sem tamanhoGrupo", { prazoGrupoHoras: 24 }, "tamanhoGrupo e prazoGrupoHoras devem ser informados juntos"],
      ["desconto sem compra em grupo", { descontoGrupo: 0.1 }, "descontoGrupo exige tamanhoGrupo e prazoGrupoHoras"],
      ["desconto de 100%", { tamanhoGrupo: 4, prazoGrupoHoras: 24, descontoGrupo: 1 }, "descontoGrupo deve estar entre 0 e 0.9999"],
      ["desconto negativo", { tamanhoGrupo: 4, prazoGrupoHoras: 24, descontoGrupo: -0.1 }, "descontoGrupo deve ser um número com no máximo 4 casas decimais"],
      ["desconto com 5 casas", { tamanhoGrupo: 4, prazoGrupoHoras: 24, descontoGrupo: "0.12345" }, "descontoGrupo deve ser um número com no máximo 4 casas decimais"],
    ])("%s responde 400 sem gravar", async (_nome, alteracao, mensagem) => {
      const res = await request(app)
        .post("/eventos/e1/lotes")
        .set(criador())
        .send({ ...valido, ...alteracao });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: mensagem });
      expect(prismaMock.lote.create).not.toHaveBeenCalled();
    });

    it("corpo que não é um objeto responde 400", async () => {
      const res = await request(app).post("/eventos/e1/lotes").set(criador()).send([valido]);

      expect(res.status).toBe(400);
    });
  });

  describe("PUT /lotes/:id", () => {
    beforeEach(() => {
      prismaMock.lote.update.mockImplementation(async ({ data }) => ({ ...lote, ...data }));
    });

    it("o criador do evento atualiza só os campos enviados", async () => {
      const res = await request(app).put("/lotes/l1").set(criador()).send({ preco: 200 });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: "l1", preco: "200.00" });
      expect(prismaMock.lote.update).toHaveBeenCalledWith({ where: { id: "l1" }, data: { preco: "200.00" } });
    });

    it("o produtor do evento também atualiza", async () => {
      const res = await request(app).put("/lotes/l1").set(produtor()).send({ nome: "Novo nome" });

      expect(res.status).toBe(200);
    });

    it.each([
      ["o porteiro", porteiro],
      ["quem não é da equipe", estranho],
      ["a conta liberada para resetar o seed", contaDoSeed],
    ])("%s recebe 403 e nada é alterado", async (_nome, quem) => {
      const res = await request(app).put("/lotes/l1").set(quem()).send({ preco: 1 });

      expect(res.status).toBe(403);
      expect(prismaMock.lote.update).not.toHaveBeenCalled();
    });

    it("sem token responde 401", async () => {
      const res = await request(app).put("/lotes/l1").send({ preco: 1 });

      expect(res.status).toBe(401);
    });

    it("lote inexistente responde 404", async () => {
      prismaMock.lote.findUnique.mockResolvedValue(null);

      const res = await request(app).put("/lotes/nada").set(criador()).send({ preco: 1 });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Lote não encontrado" });
    });

    it("lote apagado entre a leitura e a gravação responde 404 (P2025)", async () => {
      prismaMock.lote.update.mockRejectedValue(prismaError("P2025"));

      const res = await request(app).put("/lotes/l1").set(criador()).send({ preco: 1 });

      expect(res.status).toBe(404);
    });

    it("não deixa alterar contadores de venda, eventoId nem id pelo corpo", async () => {
      await request(app)
        .put("/lotes/l1")
        .set(criador())
        .send({ nome: "X", quantidadeVendida: 0, quantidadeReservada: 0, eventoId: "outro", id: "l9" });

      expect(prismaMock.lote.update.mock.calls[0][0].data).toEqual({ nome: "X" });
    });

    it("corpo sem campo válido responde 400", async () => {
      const res = await request(app).put("/lotes/l1").set(criador()).send({ quantidadeVendida: 0 });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Nenhum campo para atualizar" });
    });

    it("nome null responde 400", async () => {
      const res = await request(app).put("/lotes/l1").set(criador()).send({ nome: null });

      expect(res.status).toBe(400);
    });

    describe("proteção das vendas", () => {
      it("não deixa baixar a quantidade abaixo de vendidos + reservados", async () => {
        const res = await request(app).put("/lotes/l1").set(criador()).send({ quantidade: 14 });

        expect(res.status).toBe(409);
        expect(res.body.message).toContain("(15)");
        expect(prismaMock.lote.update).not.toHaveBeenCalled();
      });

      it("aceita baixar a quantidade exatamente até vendidos + reservados", async () => {
        const res = await request(app).put("/lotes/l1").set(criador()).send({ quantidade: 15 });

        expect(res.status).toBe(200);
      });

      it("com reservas, não deixa mudar a configuração de compra em grupo", async () => {
        prismaMock.lote.findUnique.mockResolvedValue({ ...loteGrupo, quantidadeReservada: 4 });

        const res = await request(app).put("/lotes/l1").set(criador()).send({ tamanhoGrupo: 5 });

        expect(res.status).toBe(409);
        expect(res.body.message).toContain("configuração de compra em grupo");
        expect(prismaMock.lote.update).not.toHaveBeenCalled();
      });

      it.each([
        ["prazoGrupoHoras", { prazoGrupoHoras: 72 }],
        ["descontoGrupo", { descontoGrupo: 0.2 }],
      ])("com reservas, mudar %s também é bloqueado", async (_nome, corpo) => {
        prismaMock.lote.findUnique.mockResolvedValue({ ...loteGrupo, quantidadeReservada: 4 });

        const res = await request(app).put("/lotes/l1").set(criador()).send(corpo);

        expect(res.status).toBe(409);
      });

      it("com reservas, reenviar a mesma configuração é aceito (formulário que manda tudo)", async () => {
        prismaMock.lote.findUnique.mockResolvedValue({ ...loteGrupo, quantidadeReservada: 4 });

        const res = await request(app)
          .put("/lotes/l1")
          .set(criador())
          .send({ tamanhoGrupo: 4, prazoGrupoHoras: 48, descontoGrupo: 0.15, preco: 150 });

        expect(res.status).toBe(200);
      });

      it("com reservas, o preço e o nome continuam editáveis", async () => {
        prismaMock.lote.findUnique.mockResolvedValue({ ...loteGrupo, quantidadeReservada: 4 });

        const res = await request(app).put("/lotes/l1").set(criador()).send({ preco: 99, nome: "2º lote" });

        expect(res.status).toBe(200);
      });

      it("sem reservas, a configuração de grupo pode mudar", async () => {
        prismaMock.lote.findUnique.mockResolvedValue(loteGrupo);

        const res = await request(app).put("/lotes/l1").set(criador()).send({ tamanhoGrupo: 6 });

        expect(res.status).toBe(200);
      });
    });

    describe("regra de grupo sobre o resultado final", () => {
      beforeEach(() => {
        prismaMock.lote.findUnique.mockResolvedValue(loteGrupo);
      });

      it("limpar só o prazo deixaria tamanho sem prazo: 400", async () => {
        const res = await request(app).put("/lotes/l1").set(criador()).send({ prazoGrupoHoras: null });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ message: "tamanhoGrupo e prazoGrupoHoras devem ser informados juntos" });
      });

      it("desligar tamanho e prazo mantendo o desconto salvo: 400", async () => {
        const res = await request(app)
          .put("/lotes/l1")
          .set(criador())
          .send({ tamanhoGrupo: null, prazoGrupoHoras: null });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ message: "descontoGrupo exige tamanhoGrupo e prazoGrupoHoras" });
      });

      it("desligar a compra em grupo por inteiro é aceito", async () => {
        const res = await request(app)
          .put("/lotes/l1")
          .set(criador())
          .send({ tamanhoGrupo: null, prazoGrupoHoras: null, descontoGrupo: null });

        expect(res.status).toBe(200);
        expect(prismaMock.lote.update.mock.calls[0][0].data).toEqual({
          tamanhoGrupo: null,
          prazoGrupoHoras: null,
          descontoGrupo: null,
        });
      });

      it("ligar a compra em grupo num lote que não tinha, enviando os dois campos", async () => {
        prismaMock.lote.findUnique.mockResolvedValue({ ...lote, quantidadeReservada: 0 });

        const res = await request(app)
          .put("/lotes/l1")
          .set(criador())
          .send({ tamanhoGrupo: 3, prazoGrupoHoras: 24 });

        expect(res.status).toBe(200);
      });

      it("ligar só o tamanho num lote que não tinha grupo: 400", async () => {
        prismaMock.lote.findUnique.mockResolvedValue({ ...lote, quantidadeReservada: 0 });

        const res = await request(app).put("/lotes/l1").set(criador()).send({ tamanhoGrupo: 3 });

        expect(res.status).toBe(400);
      });
    });
  });

  describe("DELETE /lotes/:id", () => {
    beforeEach(() => {
      prismaMock.lote.findUnique.mockResolvedValue({ ...lote, quantidadeVendida: 0, quantidadeReservada: 0 });
      prismaMock.lote.delete.mockResolvedValue(lote);
    });

    it("o criador do evento apaga um lote sem vendas (204)", async () => {
      const res = await request(app).delete("/lotes/l1").set(criador());

      expect(res.status).toBe(204);
      expect(res.text).toBe("");
      expect(prismaMock.lote.delete).toHaveBeenCalledWith({ where: { id: "l1" } });
    });

    it("o produtor do evento também apaga", async () => {
      const res = await request(app).delete("/lotes/l1").set(produtor());

      expect(res.status).toBe(204);
    });

    it.each([
      ["o porteiro", porteiro],
      ["quem não é da equipe", estranho],
      ["a conta liberada para resetar o seed", contaDoSeed],
    ])("%s recebe 403 e nada é apagado", async (_nome, quem) => {
      const res = await request(app).delete("/lotes/l1").set(quem());

      expect(res.status).toBe(403);
      expect(prismaMock.lote.delete).not.toHaveBeenCalled();
    });

    it("sem token responde 401", async () => {
      const res = await request(app).delete("/lotes/l1");

      expect(res.status).toBe(401);
    });

    it.each([
      ["ingressos vendidos", { quantidadeVendida: 1 }],
      ["ingressos reservados", { quantidadeReservada: 1 }],
    ])("lote com %s não pode ser apagado (409)", async (_nome, parcial) => {
      prismaMock.lote.findUnique.mockResolvedValue({ ...lote, quantidadeVendida: 0, quantidadeReservada: 0, ...parcial });

      const res = await request(app).delete("/lotes/l1").set(criador());

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("vendidos ou reservados");
      expect(prismaMock.lote.delete).not.toHaveBeenCalled();
    });

    it("lote com pedidos ou compras em grupo vinculados responde 409 (P2003)", async () => {
      prismaMock.lote.delete.mockRejectedValue(prismaError("P2003", { constraint: "fk" }));

      const res = await request(app).delete("/lotes/l1").set(criador());

      expect(res.status).toBe(409);
    });

    it("lote inexistente responde 404", async () => {
      prismaMock.lote.findUnique.mockResolvedValue(null);

      const res = await request(app).delete("/lotes/nada").set(criador());

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Lote não encontrado" });
    });
  });
});
