import { Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Acao = {
  icone: React.ComponentProps<typeof MaterialIcons>["name"];
  onPress?: () => void;
  rotulo: string;
};

type Props = {
  esquerda?: Acao;
  direita?: Acao;
  // Sobre a imagem do evento, sem fundo próprio.
  sobreposto?: boolean;
};

export function CabecalhoGroov({ esquerda, direita, sobreposto = false }: Props) {
  const insets = useSafeAreaInsets();

  const botao = (acao?: Acao) =>
    acao ? (
      <TouchableOpacity
        onPress={acao.onPress}
        accessibilityLabel={acao.rotulo}
        hitSlop={8}
        className="h-11 w-11 items-center justify-center"
      >
        <MaterialIcons name={acao.icone} size={24} color="#00eefa" />
      </TouchableOpacity>
    ) : (
      <View className="h-11 w-11" />
    );

  return (
    <View
      className={`flex-row items-center justify-between px-gutter ${
        sobreposto ? "absolute inset-x-0 top-0 z-30 bg-black/30" : "border-b border-glass-border bg-background"
      }`}
      style={{ paddingTop: insets.top, paddingBottom: 4 }}
    >
      {botao(esquerda)}
      <Text className="font-display-lg text-primary-container" style={{ fontSize: 26, letterSpacing: 1 }}>
        GROOV
      </Text>
      {botao(direita)}
    </View>
  );
}
