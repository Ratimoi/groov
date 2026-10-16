import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      NODE_ENV: "test",
      JWT_SECRET: "segredo-de-teste-com-pelo-menos-32-caracteres",
    },
  },
});
