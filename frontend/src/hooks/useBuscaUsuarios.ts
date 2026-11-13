import { useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { api } from "../utils/api";
import type { PessoaApi } from "../utils/compras";

const ESPERA_BUSCA_MS = 400;
export const MIN_TERMO_BUSCA = 2;

// Busca pessoas por nome ou @ com uma espera para não disparar a cada tecla. Com termo curto
// (ou `ativo` falso) não busca e mantém o último resultado: quem usa decide se mostra.
export function useBuscaUsuarios(busca: string, ativo = true) {
  const { token } = useUser();
  const [resultados, setResultados] = useState<PessoaApi[]>([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    const termo = busca.trim();
    if (!ativo || termo.length < MIN_TERMO_BUSCA) return;
    let cancelado = false;
    const espera = setTimeout(async () => {
      setBuscando(true);
      try {
        const dados = await api<PessoaApi[]>(`/usuarios/busca?q=${encodeURIComponent(termo)}`, { token });
        if (!cancelado) setResultados(dados);
      } catch (error) {
        console.error("Erro na busca de usuários:", error);
        if (!cancelado) setResultados([]);
      } finally {
        if (!cancelado) setBuscando(false);
      }
    }, ESPERA_BUSCA_MS);
    return () => {
      cancelado = true;
      clearTimeout(espera);
    };
  }, [ativo, busca, token]);

  return { resultados, buscando };
}
