import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyPassword } from "../src/utils/password";
import { logadoComo, logadoUmaVezComo } from "./helpers/auth";
import { prismaError } from "./helpers/prismaErrors";
import { prismaMock, resetPrismaMock } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { default: app } = await import("../src/app");

const SENHA = "senha-segura-123";
const omit = { senha: true };

const usuario = {
  id: "u1",
  nome: "Ana",
  username: "ana",
  email: "ana@example.com",
  papel: "CLIENTE",
};

describe("/usuarios", () => {
  beforeEach(resetPrismaMock);

  describe("POST (cadastro público)", () => {
    const body = { nome: "Ana", username: "ana", email: "ana@example.com", senha: SENHA };

    it("cria o usuário sem exigir login e sem devolver a senha", async () => {
      prismaMock.usuario.create.mockResolvedValue(usuario);

      const res = await request(app).post("/usuarios").send(body);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: "u1", username: "ana" });
      expect(res.body).not.toHaveProperty("senha");
      expect(prismaMock.usuario.create).toHaveBeenCalledWith({
        data: { nome: "Ana", username: "ana", email: "ana@example.com", senha: expect.any(String) },
        omit,
      });
    });

    it("grava a senha com hash, nunca em texto puro", async () => {
      prismaMock.usuario.create.mockResolvedValue(usuario);

      await request(app).post("/usuarios").send(body);

      const gravada = prismaMock.usuario.create.mock.calls[0][0].data.senha;
      expect(gravada).not.toContain(SENHA);
      expect(await verifyPassword(SENHA, gravada)).toBe(true);
      expect(await verifyPassword("outra-senha-123", gravada)).toBe(false);
    });

    it("ignora papel, id e outros campos do corpo (ninguém se cadastra como ADMIN)", async () => {
      prismaMock.usuario.create.mockResolvedValue(usuario);

      await request(app)
        .post("/usuarios")
        .send({ ...body, papel: "ADMIN", id: "forjado", criadoEm: "2000-01-01" });

      const { data } = prismaMock.usuario.create.mock.calls[0][0];
      expect(data).not.toHaveProperty("papel");
      expect(data).not.toHaveProperty("id");
      expect(data).not.toHaveProperty("criadoEm");
    });

    it.each([
      ["ausente", undefined],
      ["curta demais", "1234567"],
      ["que não é texto", 12345678],
    ])("senha %s responde 400 e não grava", async (_nome, senha) => {
      const res = await request(app).post("/usuarios").send({ ...body, senha });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("pelo menos 8 caracteres");
      expect(prismaMock.usuario.create).not.toHaveBeenCalled();
    });

    it("username ou email repetido responde 409", async () => {
      prismaMock.usuario.create.mockRejectedValue(prismaError("P2002", { target: ["username"] }));

      const res = await request(app).post("/usuarios").send(body);

      expect(res.status).toBe(409);
      expect(res.body.fields).toEqual(["username"]);
    });
  });

  describe("GET / (listar)", () => {
    it("sem token responde 401", async () => {
      const res = await request(app).get("/usuarios");

      expect(res.status).toBe(401);
      expect(prismaMock.usuario.findMany).not.toHaveBeenCalled();
    });

    it("CLIENTE não pode listar todos os usuários (403)", async () => {
      const res = await request(app).get("/usuarios").set(logadoComo("CLIENTE"));

      expect(res.status).toBe(403);
      expect(prismaMock.usuario.findMany).not.toHaveBeenCalled();
    });

    it("ADMIN lista, sem as senhas", async () => {
      prismaMock.usuario.findMany.mockResolvedValue([usuario]);

      const res = await request(app).get("/usuarios").set(logadoComo("ADMIN", "adm"));

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(prismaMock.usuario.findMany).toHaveBeenCalledWith({ omit });
    });
  });

  describe("GET /:id/grupos", () => {
    it("sem token responde 401 e não consulta grupos", async () => {
      const res = await request(app).get("/usuarios/u1/grupos");

      expect(res.status).toBe(401);
      expect(prismaMock.grupo.findMany).not.toHaveBeenCalled();
    });

    it("CLIENTE não lista os grupos de outro usuário (403)", async () => {
      const res = await request(app).get("/usuarios/u1/grupos").set(logadoComo("CLIENTE", "u2"));

      expect(res.status).toBe(403);
      expect(prismaMock.grupo.findMany).not.toHaveBeenCalled();
    });

    it("o próprio usuário lista seus grupos e vê se é o líder", async () => {
      prismaMock.grupo.findMany.mockResolvedValue([{ id: "g1", nome: "Galera", liderId: "u1", membros: [] }]);

      const res = await request(app).get("/usuarios/u1/grupos").set(logadoComo("CLIENTE", "u1"));

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: "g1", nome: "Galera", liderId: "u1", membros: [], souLider: true }]);
    });

    it("ADMIN lista os grupos de qualquer usuário", async () => {
      prismaMock.grupo.findMany.mockResolvedValue([]);

      const res = await request(app).get("/usuarios/u1/grupos").set(logadoComo("ADMIN", "adm"));

      expect(res.status).toBe(200);
    });
  });

  describe("GET /:id", () => {
    it("sem token responde 401", async () => {
      const res = await request(app).get("/usuarios/u1");

      expect(res.status).toBe(401);
    });

    it("o próprio usuário vê seus dados", async () => {
      const auth = logadoUmaVezComo("CLIENTE", "u1");
      prismaMock.usuario.findUnique.mockResolvedValueOnce(usuario);

      const res = await request(app).get("/usuarios/u1").set(auth);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe("u1");
      expect(prismaMock.usuario.findUnique).toHaveBeenLastCalledWith({ where: { id: "u1" }, omit });
    });

    it("CLIENTE não vê outro usuário (403, sem consultar o alvo)", async () => {
      const auth = logadoUmaVezComo("CLIENTE", "u2");

      const res = await request(app).get("/usuarios/u1").set(auth);

      expect(res.status).toBe(403);
      expect(prismaMock.usuario.findUnique).toHaveBeenCalledTimes(1); // só a do middleware
    });

    it("ADMIN vê qualquer usuário", async () => {
      const auth = logadoUmaVezComo("ADMIN", "adm");
      prismaMock.usuario.findUnique.mockResolvedValueOnce(usuario);

      const res = await request(app).get("/usuarios/u1").set(auth);

      expect(res.status).toBe(200);
    });

    it("ADMIN consultando id inexistente recebe 404", async () => {
      const auth = logadoUmaVezComo("ADMIN", "adm");
      prismaMock.usuario.findUnique.mockResolvedValueOnce(null);

      const res = await request(app).get("/usuarios/nada").set(auth);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "User not found" });
    });
  });

  describe("PUT /:id", () => {
    it("sem token responde 401", async () => {
      const res = await request(app).put("/usuarios/u1").send({ nome: "X" });

      expect(res.status).toBe(401);
    });

    it("o próprio usuário atualiza seus dados sem tocar na senha", async () => {
      prismaMock.usuario.update.mockResolvedValue({ ...usuario, nome: "Ana Maria" });

      const res = await request(app).put("/usuarios/u1").set(logadoComo("CLIENTE", "u1")).send({ nome: "Ana Maria" });

      expect(res.status).toBe(200);
      expect(res.body.nome).toBe("Ana Maria");
      expect(prismaMock.usuario.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { nome: "Ana Maria" }, omit });
    });

    it("ignora campos fora da lista (id, criadoEm)", async () => {
      prismaMock.usuario.update.mockResolvedValue(usuario);

      await request(app)
        .put("/usuarios/u1")
        .set(logadoComo("CLIENTE", "u1"))
        .send({ nome: "Ana", id: "forjado", criadoEm: "2000-01-01" });

      expect(prismaMock.usuario.update.mock.calls[0][0].data).toEqual({ nome: "Ana" });
    });

    it("senha nova é gravada com hash", async () => {
      prismaMock.usuario.update.mockResolvedValue(usuario);

      const res = await request(app).put("/usuarios/u1").set(logadoComo("CLIENTE", "u1")).send({ senha: SENHA });

      expect(res.status).toBe(200);
      const gravada = prismaMock.usuario.update.mock.calls[0][0].data.senha;
      expect(gravada).not.toBe(SENHA);
      expect(await verifyPassword(SENHA, gravada)).toBe(true);
    });

    it("senha curta responde 400 e não grava", async () => {
      const res = await request(app).put("/usuarios/u1").set(logadoComo("CLIENTE", "u1")).send({ senha: "curta" });

      expect(res.status).toBe(400);
      expect(prismaMock.usuario.update).not.toHaveBeenCalled();
    });

    it("CLIENTE não altera dados de outro usuário (403)", async () => {
      const res = await request(app).put("/usuarios/u1").set(logadoComo("CLIENTE", "u2")).send({ nome: "X" });

      expect(res.status).toBe(403);
      expect(prismaMock.usuario.update).not.toHaveBeenCalled();
    });

    it("CLIENTE não consegue se promover a ADMIN (403)", async () => {
      const res = await request(app).put("/usuarios/u1").set(logadoComo("CLIENTE", "u1")).send({ papel: "ADMIN" });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("ADMIN");
      expect(prismaMock.usuario.update).not.toHaveBeenCalled();
    });

    it("ADMIN altera o papel de outro usuário", async () => {
      prismaMock.usuario.update.mockResolvedValue({ ...usuario, papel: "PRODUTOR" });

      const res = await request(app).put("/usuarios/u1").set(logadoComo("ADMIN", "adm")).send({ papel: "PRODUTOR" });

      expect(res.status).toBe(200);
      expect(prismaMock.usuario.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { papel: "PRODUTOR" }, omit });
    });

    it("ADMIN com papel inexistente recebe 400", async () => {
      const res = await request(app).put("/usuarios/u1").set(logadoComo("ADMIN", "adm")).send({ papel: "REI" });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "papel inválido" });
      expect(prismaMock.usuario.update).not.toHaveBeenCalled();
    });

    it("ADMIN atualizando id inexistente recebe 404 (P2025 é traduzido)", async () => {
      prismaMock.usuario.update.mockRejectedValue(prismaError("P2025"));

      const res = await request(app).put("/usuarios/nada").set(logadoComo("ADMIN", "adm")).send({ nome: "X" });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /:id", () => {
    it("sem token responde 401", async () => {
      const res = await request(app).delete("/usuarios/u1");

      expect(res.status).toBe(401);
    });

    it("o próprio usuário apaga a conta (204, sem corpo)", async () => {
      prismaMock.usuario.delete.mockResolvedValue(usuario);

      const res = await request(app).delete("/usuarios/u1").set(logadoComo("CLIENTE", "u1"));

      expect(res.status).toBe(204);
      expect(res.text).toBe("");
    });

    it("CLIENTE não apaga outro usuário (403)", async () => {
      const res = await request(app).delete("/usuarios/u1").set(logadoComo("CLIENTE", "u2"));

      expect(res.status).toBe(403);
      expect(prismaMock.usuario.delete).not.toHaveBeenCalled();
    });

    it("ADMIN apaga qualquer usuário", async () => {
      prismaMock.usuario.delete.mockResolvedValue(usuario);

      const res = await request(app).delete("/usuarios/u1").set(logadoComo("ADMIN", "adm"));

      expect(res.status).toBe(204);
    });

    it("ADMIN apagando id inexistente recebe 404", async () => {
      prismaMock.usuario.delete.mockRejectedValue(prismaError("P2025"));

      const res = await request(app).delete("/usuarios/nada").set(logadoComo("ADMIN", "adm"));

      expect(res.status).toBe(404);
    });

    it("usuário com dependências responde 409", async () => {
      prismaMock.usuario.delete.mockRejectedValue(prismaError("P2003", { constraint: "fk" }));

      const res = await request(app).delete("/usuarios/u1").set(logadoComo("CLIENTE", "u1"));

      expect(res.status).toBe(409);
    });
  });
});
