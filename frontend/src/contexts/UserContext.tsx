import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { api, ApiError } from "../utils/api";
import { apagarToken, guardarToken, lerToken } from "../utils/sessao";

export type Usuario = {
  id: string;
  nome: string;
  username: string;
  avatarUrl?: string | null;
  email: string;
  papel: "CLIENTE" | "PRODUTOR" | "ADMIN";
};

export type DadosCadastro = { nome: string; username: string; email: string; senha: string; cpf: string };

type UserContextData = {
  user: Usuario | null;
  token: string | null;
  // true enquanto o app confere o token guardado; evita piscar a tela de login.
  carregandoSessao: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  cadastrar: (dados: DadosCadastro) => Promise<void>;
  sair: () => void;
};

const UserContext = createContext<UserContextData>({} as UserContextData);

type RespostaLogin = { token: string; usuario: Usuario };

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [carregandoSessao, setCarregandoSessao] = useState(true);

  // Ao abrir o app, valida o token guardado (o papel é lido do banco a cada requisição).
  useEffect(() => {
    let cancelado = false;
    async function restaurar() {
      try {
        const guardado = await lerToken();
        if (!guardado) return;
        const usuario = await api<Usuario>("/auth/me", { token: guardado });
        if (!cancelado) {
          setToken(guardado);
          setUser(usuario);
        }
      } catch (error) {
        // Token expirado ou usuário apagado: descarta. Falha de rede mantém o token guardado.
        if (error instanceof ApiError && error.status === 401) await apagarToken();
      } finally {
        if (!cancelado) setCarregandoSessao(false);
      }
    }
    restaurar();
    return () => {
      cancelado = true;
    };
  }, []);

  const entrar = useCallback(async (email: string, senha: string) => {
    const resposta = await api<RespostaLogin>("/auth/login", { method: "POST", body: { email: email.trim(), senha } });
    await guardarToken(resposta.token);
    setToken(resposta.token);
    setUser(resposta.usuario);
  }, []);

  const cadastrar = useCallback(
    async (dados: DadosCadastro) => {
      await api("/usuarios", {
        method: "POST",
        body: { ...dados, nome: dados.nome.trim(), username: dados.username.trim(), email: dados.email.trim() },
      });
      await entrar(dados.email, dados.senha);
    },
    [entrar],
  );

  const sair = useCallback(() => {
    apagarToken();
    setToken(null);
    setUser(null);
  }, []);

  const valor = useMemo(
    () => ({ user, token, carregandoSessao, entrar, cadastrar, sair }),
    [user, token, carregandoSessao, entrar, cadastrar, sair],
  );

  return <UserContext.Provider value={valor}>{children}</UserContext.Provider>;
}

export const useUser = () => useContext(UserContext);
