import { createContext, useContext, useState, ReactNode } from 'react';
import type { GrupoEscolhido } from '../utils/lote';
import type { ResultadoCompra } from '../utils/compras';

// Código de promotor já conferido na API: dá desconto na compra do evento.
export type Afiliado = { eventoId: string; codigo: string; desconto: number; promotor: string };

type CarrinhoContextData = {
  afiliado: Afiliado | null;
  definirAfiliado: (afiliado: Afiliado | null) => void;
  carrinho: Record<string, number>;
  gruposPorLote: Record<string, GrupoEscolhido | undefined>;
  atualizaQuantidade: (loteId: string, quantidade: number) => void;
  obterQuantidade: (loteId: string) => number;
  escolherGrupo: (loteId: string, grupo: GrupoEscolhido | null) => void;
  limparCarrinho: () => void;
  // Última compra concluída, para a tela de pagamento confirmado.
  resultado: ResultadoCompra | null;
  definirResultado: (resultado: ResultadoCompra | null) => void;
};

const CarrinhoContext = createContext<CarrinhoContextData>({} as CarrinhoContextData);

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [gruposPorLote, setGruposPorLote] = useState<Record<string, GrupoEscolhido | undefined>>({});
  const [resultado, definirResultado] = useState<ResultadoCompra | null>(null);
  const [afiliado, definirAfiliado] = useState<Afiliado | null>(null);

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
    definirAfiliado(null);
  };

  return (
    <CarrinhoContext.Provider
      value={{
        afiliado,
        definirAfiliado,
        carrinho,
        gruposPorLote,
        atualizaQuantidade,
        obterQuantidade,
        escolherGrupo,
        limparCarrinho,
        resultado,
        definirResultado,
      }}
    >
      {children}
    </CarrinhoContext.Provider>
  );
}
export const useCarrinho = () => useContext(CarrinhoContext);
