import { createContext, useContext, useState, ReactNode } from 'react';

type CarrinhoContextData = {
  carrinho: Record<string, number>;
  atualizaQuantidade: (loteId: string, quantidade: number) => void;
  obterQuantidade: (loteId: string) => number;
};

const CarrinhoContext = createContext<CarrinhoContextData>({} as CarrinhoContextData);

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});

  const atualizaQuantidade = (loteId: string, quantidade: number) => {
    setCarrinho(prev => ({ ...prev, [loteId]: quantidade }));
  };

  const obterQuantidade = (loteId: string) => {
    return carrinho[loteId] || 0;
  };

  return (
    <CarrinhoContext.Provider value={{ carrinho, atualizaQuantidade, obterQuantidade }}>
      {children}
    </CarrinhoContext.Provider>
  );
}
export const useCarrinho = () => useContext(CarrinhoContext);