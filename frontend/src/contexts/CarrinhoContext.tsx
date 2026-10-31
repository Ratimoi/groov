import { createContext, useContext, useState, ReactNode } from 'react';
import type { GrupoEscolhido } from '../utils/lote';

type CarrinhoContextData = {
  carrinho: Record<string, number>;
  gruposPorLote: Record<string, GrupoEscolhido | undefined>;
  atualizaQuantidade: (loteId: string, quantidade: number) => void;
  obterQuantidade: (loteId: string) => number;
  escolherGrupo: (loteId: string, grupo: GrupoEscolhido | null) => void;
  limparCarrinho: () => void;
};

const CarrinhoContext = createContext<CarrinhoContextData>({} as CarrinhoContextData);

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [gruposPorLote, setGruposPorLote] = useState<Record<string, GrupoEscolhido | undefined>>({});

  const atualizaQuantidade = (loteId: string, quantidade: number) => {
    setCarrinho(prev => ({ ...prev, [loteId]: quantidade }));
  };

  const obterQuantidade = (loteId: string) => {
    return carrinho[loteId] || 0;
  };

  const escolherGrupo = (loteId: string, grupo: GrupoEscolhido | null) => {
    setGruposPorLote(prev => ({ ...prev, [loteId]: grupo ?? undefined }));
  };

  const limparCarrinho = () => {
    setCarrinho({});
    setGruposPorLote({});
  };

  return (
    <CarrinhoContext.Provider
      value={{ carrinho, gruposPorLote, atualizaQuantidade, obterQuantidade, escolherGrupo, limparCarrinho }}
    >
      {children}
    </CarrinhoContext.Provider>
  );
}
export const useCarrinho = () => useContext(CarrinhoContext);
