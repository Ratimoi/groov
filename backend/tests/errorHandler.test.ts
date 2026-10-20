import type { NextFunction, Request, Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../src/middlewares/errorHandler";
import { AppError } from "../src/utils/AppError";
import { prismaError } from "./helpers/prismaErrors";

function run(error: unknown, method = "GET") {
  const json = vi.fn();
  const res = { status: vi.fn().mockReturnThis(), json } as unknown as Response;
  errorHandler(error, { method } as Request, res, vi.fn() as NextFunction);
  return { status: vi.mocked(res.status), json };
}

describe("errorHandler", () => {
  afterEach(() => vi.restoreAllMocks());

  it("AppError usa o status e a mensagem do erro", () => {
    const { status, json } = run(new AppError("Grupo não encontrado", 404));

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ message: "Grupo não encontrado" });
  });

  it("AppError sem status explícito vira 400", () => {
    const { status } = run(new AppError("inválido"));

    expect(status).toHaveBeenCalledWith(400);
  });

  it("P2002 (unicidade) vira 409 e informa os campos", () => {
    const { status, json } = run(prismaError("P2002", { target: ["email"] }));

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ fields: ["email"] }));
  });

  it("P2003 em DELETE vira 409 (registro com dependências)", () => {
    const { status, json } = run(prismaError("P2003", { constraint: "fk" }), "DELETE");

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ constraint: "fk" }));
  });

  it("P2003 fora de DELETE vira 400 (referência inexistente)", () => {
    const { status, json } = run(prismaError("P2003", { constraint: "fk" }), "POST");

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ message: "Referência a registro inexistente", constraint: "fk" });
  });

  it("erro desconhecido vira 500 sem vazar detalhes", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { status, json } = run(new Error("segredo interno"));

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ message: "Erro interno do servidor" });
  });
});
