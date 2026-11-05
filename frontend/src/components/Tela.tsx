import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";
import { conteudo } from "../utils/layout";
import { CabecalhoGroov } from "./CabecalhoGroov";

type Props = {
  children: ReactNode;
  // Props do cabeçalho; sem elas a tela fica sem cabeçalho.
  cabecalho?: React.ComponentProps<typeof CabecalhoGroov>;
  // Espaço extra no fim, para um rodapé fixo acima da NavBar.
  extra?: number;
  gap?: number;
  topo?: number;
  // Telas com campos de texto.
  formulario?: boolean;
};

// Casca padrão das telas rolláveis: fundo, cabeçalho, margens, coluna centralizada em tablets e
// espaço no fim para a NavBar flutuante. Usar `Tela` evita refazer (e errar) esse cálculo em cada tela.
export function Tela({ children, cabecalho, extra = 16, gap, topo, formulario = false }: Props) {
  const espacoNavBar = useEspacoNavBar();
  const corpo = (
    <ScrollView
      keyboardShouldPersistTaps={formulario ? "handled" : undefined}
      contentContainerStyle={conteudo(espacoNavBar, { extra, gap, topo })}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );

  return (
    <View className="flex-1 bg-background">
      {cabecalho && <CabecalhoGroov {...cabecalho} />}
      {formulario ? (
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {corpo}
        </KeyboardAvoidingView>
      ) : (
        corpo
      )}
    </View>
  );
}
