import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const ROXO: [number, number, number] = [0xbc, 0x13, 0xfe];
const CIANO: [number, number, number] = [0x00, 0xdc, 0xe7];

// Cor do gradiente roxo→ciano na posição t (0 a 1), para o gradiente atravessar a barra
// inteira em vez de recomeçar em cada segmento.
function corNoGradiente(t: number) {
  const [r, g, b] = ROXO.map((canal, i) => Math.round(canal + (CIANO[i] - canal) * t));
  return `rgb(${r}, ${g}, ${b})`;
}

// Progresso de uma compra em grupo: um segmento por participante, preenchido quando ele já pagou.
export function BarraSegmentada({ total, pagos }: { total: number; pagos: number }) {
  return (
    <View className="flex-row gap-1">
      {Array.from({ length: total }, (_, indice) =>
        indice < pagos ? (
          <LinearGradient
            key={indice}
            colors={[corNoGradiente(indice / total), corNoGradiente((indice + 1) / total)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="flex-1 h-2 rounded-full"
          />
        ) : (
          <View key={indice} className="flex-1 h-2 rounded-full bg-surface-container-high" />
        ),
      )}
    </View>
  );
}
