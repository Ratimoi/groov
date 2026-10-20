import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/utils/password";

describe("password", () => {
  it("gera um hash no formato scrypt$N$r$p$salt$hash, sem conter a senha", async () => {
    const hash = await hashPassword("minha-senha-123");

    expect(hash.split("$")).toHaveLength(6);
    expect(hash.startsWith("scrypt$32768$8$3$")).toBe(true);
    expect(hash).not.toContain("minha-senha-123");
  });

  it("usa um salt diferente a cada chamada (mesma senha, hashes diferentes)", async () => {
    const [a, b] = await Promise.all([hashPassword("minha-senha-123"), hashPassword("minha-senha-123")]);

    expect(a).not.toBe(b);
  });

  it("verifica a senha correta e rejeita a errada", async () => {
    const hash = await hashPassword("minha-senha-123");

    expect(await verifyPassword("minha-senha-123", hash)).toBe(true);
    expect(await verifyPassword("minha-senha-124", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it.each([
    ["texto puro (formato antigo)", "minha-senha-123"],
    ["esquema desconhecido", "bcrypt$10$abc$def$ghi$jkl"],
    ["campos faltando", "scrypt$32768$8$3"],
    ["vazio", ""],
  ])("rejeita hash inválido: %s", async (_nome, armazenado) => {
    expect(await verifyPassword("minha-senha-123", armazenado)).toBe(false);
  });
});
