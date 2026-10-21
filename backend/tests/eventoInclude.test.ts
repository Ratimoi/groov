import { describe, expect, it } from "vitest";
import { eventoInclude } from "../src/types/event";

// As rotas de eventos são públicas. Toda relação com Usuario precisa listar os campos
// (`select`), porque `true` devolve a linha inteira: senha (hash), e-mail e papel.
const CAMPOS_PUBLICOS = ["avatarUrl", "id", "nome", "username"];

describe("eventoInclude (rotas públicas de eventos)", () => {
  it.each(["criadoPor", "atracoes"] as const)("%s só expõe os campos públicos do usuário", (relacao) => {
    const config = eventoInclude[relacao];

    expect(config).not.toBe(true);
    expect(Object.keys((config as { select: object }).select).sort()).toEqual(CAMPOS_PUBLICOS);
  });

  it("nenhum campo sensível do usuário é selecionado", () => {
    const selecionados = [eventoInclude.criadoPor, eventoInclude.atracoes].flatMap((config) =>
      Object.keys((config as { select: object }).select),
    );

    for (const sensivel of ["senha", "email", "papel", "criadoEm"]) {
      expect(selecionados).not.toContain(sensivel);
    }
  });
});
