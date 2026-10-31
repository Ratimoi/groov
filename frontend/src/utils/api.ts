const apiUrl = process.env.EXPO_PUBLIC_API_URL;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type Opcoes = {
  token?: string | null;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

// Chamada à API do Groov. Erros viram ApiError com a `message` que o backend devolveu.
export async function api<T = unknown>(caminho: string, { token, method = "GET", body }: Opcoes = {}): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(`${apiUrl}${caminho}`, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Sem conexão com o servidor. Tente de novo.", 0);
  }

  if (resposta.status === 204) return undefined as T;

  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    throw new ApiError(dados?.message ?? `Erro ${resposta.status}`, resposta.status);
  }
  return dados as T;
}
