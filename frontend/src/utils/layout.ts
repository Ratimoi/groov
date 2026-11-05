import type { ViewStyle } from "react-native";

// Em tablets o conteúdo não estica até as bordas: fica numa coluna centralizada, como a NavBar.
export const LARGURA_MAXIMA = 720;

export const coluna: ViewStyle = { width: "100%", maxWidth: LARGURA_MAXIMA, alignSelf: "center" };

// Estilo padrão do conteúdo rolável das telas: margens laterais, respiro no topo e espaço no fim
// para a NavBar flutuante (e para um rodapé fixo, em `extra`).
export function conteudo(
  espacoNavBar: number,
  { extra = 0, gap, topo = 24, horizontal = 20 }: { extra?: number; gap?: number; topo?: number; horizontal?: number } = {},
): ViewStyle {
  return {
    ...coluna,
    paddingHorizontal: horizontal,
    paddingTop: topo,
    paddingBottom: espacoNavBar + extra,
    ...(gap !== undefined ? { gap } : {}),
  };
}
