import { useEffect, useState } from "react";
import { api } from "../utils/api";

export type CategoriaApi = { id: string; nome: string };

// Categorias para escolher ao criar ou editar um evento (lista pública). Se falhar, a escolha some e o evento
// segue sem categoria.
export function useCategorias() {
  const [categorias, setCategorias] = useState<CategoriaApi[]>([]);

  useEffect(() => {
    let cancelado = false;
    api<CategoriaApi[]>("/categorias")
      .then((dados) => {
        if (!cancelado) setCategorias(dados);
      })
      .catch((error) => console.error("Erro ao buscar categorias:", error));
    return () => {
      cancelado = true;
    };
  }, []);

  return categorias;
}
