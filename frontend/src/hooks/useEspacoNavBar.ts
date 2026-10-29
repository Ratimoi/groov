import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ALTURA_NAVBAR, MARGEM_INFERIOR_NAVBAR } from "../components/NavBar";

const FOLGA = 16;

// A NavBar é flutuante (position: absolute), então o conteúdo das telas precisa
// reservar esse espaço no fim, senão a última parte fica atrás dela.
export function useEspacoNavBar() {
  const insets = useSafeAreaInsets();
  return insets.bottom + MARGEM_INFERIOR_NAVBAR + ALTURA_NAVBAR + FOLGA;
}
