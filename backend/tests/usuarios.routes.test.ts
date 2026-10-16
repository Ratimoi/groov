import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock, resetPrismaMock } from "./helpers/prismaMock";
import { prismaError } from "./helpers/prismaErrors";
import { verifyPassword } from "../src/utils/password";

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

  it("POST cria o usuário e responde 201 sem devolver a senha", async () => {
    prismaMock.usuario.create.mockResolvedValue(usuario);
    const body = { nome: "Ana", username: "ana", email: "ana@example.com", senha: SENHA };

    const res = await request(app).post("/usuarios").send(body);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: "u1", username: "ana" });
    expect(res.body).not.toHaveProperty("senha");
    expect(prismaMock.usuario.create).toHaveBeenCalledWith({
      data: { nome: "Ana", username: "ana", email: "ana@example.com", senha: expect.any(String) },
      omit,
    });
  });

  it("POST grava a senha com hash, nunca em texto puro", async () => {
    prismaMock.usuario.create.mockResolvedValue(usuario);

    await request(app).post("/usuarios").send({ ...usuario, senha: SENHA });

    const gravada = prismaMock.usuario.create.mock.calls[0][0].data.senha;
    expect(gravada).not.toBe(SENHA);
    expect(gravada).not.toContain(SENHA);
    expect(await verifyPassword(SENHA, gravada)).toBe(true);
    expect(await verifyPassword("outra-senha-123", gravada)).toBe(false);
  });

  it.each([
    ["ausente", undefined],
    ["curta demais", "1234567"],
    ["que não é texto", 12345678],
  ])("POST com senha %s responde 400 e não grava", async (_nome, senha) => {
    const res = await request(app)
      .post("/usuarios")
      .send({ nome: "Ana", username: "ana", email: "ana@example.com", senha });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("pelo menos 8 caracteres");
    expect(prismaMock.usuario.create).not.toHaveBeenCalled();
  });

  it("POST com username ou email repetido responde 409", async () => {
    prismaMock.usuario.create.mockRejectedValue(prismaError("P2002", { target: ["username"] }));

    const res = await request(app).post("/usuarios").send({ username: "ana", senha: SENHA });

    expect(res.status).toBe(409);
    expect(res.body.fields).toEqual(["username"]);
  });

  it("GET lista os usuários", async () => {
    prismaMock.usuario.findMany.mockResolvedValue([usuario]);

    const res = await request(app).get("/usuarios");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(prismaMock.usuario.findMany).toHaveBeenCalledWith({ omit });
  });

  it("GET /:id devolve o usuário", async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(usuario);

    const res = await request(app).get("/usuarios/u1");

    expect(res.status).toBe(200);
    expect(prismaMock.usuario.findUnique).toHaveBeenCalledWith({ where: { id: "u1" }, omit });
  });

  it("GET /:id inexistente responde 404", async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(null);

    const res = await request(app).get("/usuarios/nada");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "User not found" });
  });

  it("PUT /:id atualiza o usuário sem tocar na senha quando ela não vem no corpo", async () => {
    prismaMock.usuario.update.mockResolvedValue({ ...usuario, nome: "Ana Maria" });

    const res = await request(app).put("/usuarios/u1").send({ nome: "Ana Maria" });

    expect(res.status).toBe(200);
    expect(res.body.nome).toBe("Ana Maria");
    expect(prismaMock.usuario.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { nome: "Ana Maria" }, omit });
  });

  it("PUT /:id com senha nova grava o hash", async () => {
    prismaMock.usuario.update.mockResolvedValue(usuario);

    const res = await request(app).put("/usuarios/u1").send({ senha: SENHA });

    expect(res.status).toBe(200);
    const gravada = prismaMock.usuario.update.mock.calls[0][0].data.senha;
    expect(gravada).not.toBe(SENHA);
    expect(await verifyPassword(SENHA, gravada)).toBe(true);
  });

  it("PUT /:id com senha curta responde 400 e não grava", async () => {
    const res = await request(app).put("/usuarios/u1").send({ senha: "curta" });

    expect(res.status).toBe(400);
    expect(prismaMock.usuario.update).not.toHaveBeenCalled();
  });

  it("PUT /:id inexistente responde 404 (P2025 é traduzido)", async () => {
    prismaMock.usuario.update.mockRejectedValue(prismaError("P2025"));

    const res = await request(app).put("/usuarios/nada").send({ nome: "X" });

    expect(res.status).toBe(404);
  });

  it("DELETE /:id responde 204 sem corpo", async () => {
    prismaMock.usuario.delete.mockResolvedValue(usuario);

    const res = await request(app).delete("/usuarios/u1");

    expect(res.status).toBe(204);
    expect(res.text).toBe("");
  });

  it("DELETE /:id inexistente responde 404", async () => {
    prismaMock.usuario.delete.mockRejectedValue(prismaError("P2025"));

    const res = await request(app).delete("/usuarios/nada");

    expect(res.status).toBe(404);
  });

  it("DELETE /:id com dependências responde 409", async () => {
    prismaMock.usuario.delete.mockRejectedValue(prismaError("P2003", { constraint: "fk" }));

    const res = await request(app).delete("/usuarios/u1");

    expect(res.status).toBe(409);
  });
});
