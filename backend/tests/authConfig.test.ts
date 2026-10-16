import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { assertAuthConfig, getJwtExpiresIn, getJwtSecret } from "../src/config/auth";
import { signToken } from "../src/utils/token";
import { prismaMock } from "./helpers/prismaMock";

vi.mock("../src/config/prisma", () => ({ default: prismaMock }));

const { createLoginLimiter } = await import("../src/routes/AuthRoutes");

describe("configuração de autenticação", () => {
  const segredoOriginal = process.env.JWT_SECRET;
  afterEach(() => {
    process.env.JWT_SECRET = segredoOriginal;
    delete process.env.JWT_EXPIRES_IN;
  });

  it.each([
    ["ausente", undefined],
    ["vazio", ""],
    ["curto demais (31 caracteres)", "x".repeat(31)],
  ])("JWT_SECRET %s impede a API de subir", (_nome, valor) => {
    if (valor === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = valor;

    expect(() => assertAuthConfig()).toThrow("JWT_SECRET");
  });

  it("JWT_SECRET com 32 caracteres é aceito", () => {
    process.env.JWT_SECRET = "x".repeat(32);

    expect(getJwtSecret()).toBe("x".repeat(32));
    expect(() => assertAuthConfig()).not.toThrow();
  });

  it("sem segredo, assinar um token falha em vez de usar um valor padrão", () => {
    delete process.env.JWT_SECRET;

    expect(() => signToken("u1")).toThrow("JWT_SECRET");
  });

  it("a validade do token é 1d por padrão e configurável por JWT_EXPIRES_IN", () => {
    expect(getJwtExpiresIn()).toBe("1d");

    process.env.JWT_EXPIRES_IN = "15m";
    expect(getJwtExpiresIn()).toBe("15m");
  });
});

describe("limite de tentativas de login", () => {
  function appComLimite(limit: number) {
    const mini = express();
    mini.post("/login", createLoginLimiter({ limit, skip: () => false }), (req, res) => {
      res.json({ ok: true });
    });
    return mini;
  }

  it("bloqueia com 429 depois de estourar o limite, avisando quando tentar de novo", async () => {
    const mini = appComLimite(2);

    expect((await request(mini).post("/login")).status).toBe(200);
    expect((await request(mini).post("/login")).status).toBe(200);
    const bloqueada = await request(mini).post("/login");

    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body).toEqual({ message: "Muitas tentativas de login. Tente novamente mais tarde." });
    expect(bloqueada.headers).toHaveProperty("retry-after");
  });

  it("por padrão não limita durante os testes (NODE_ENV=test)", async () => {
    const mini = express();
    mini.post("/login", createLoginLimiter({ limit: 1 }), (req, res) => {
      res.json({ ok: true });
    });

    for (let i = 0; i < 3; i++) {
      expect((await request(mini).post("/login")).status).toBe(200);
    }
  });
});
