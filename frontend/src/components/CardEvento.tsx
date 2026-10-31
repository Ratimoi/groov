import { Text, TouchableOpacity, View, Image } from "react-native";
import type { EventoType } from "../utils/index";
import { formatarDataHora, formatarPreco, menorPreco } from "../utils/evento";
import { router } from "expo-router";

export function CardEvento({ data }: { data: EventoType }) {
  const preco = formatarPreco(menorPreco(data.lotes));

  return (
    <TouchableOpacity
      onPress={() => router.push({ pathname: "/detalhes", params: { id: data.id } })}
      activeOpacity={0.8}
      className="w-72 bg-surface-container-high rounded-xl border border-glass-border overflow-hidden flex-col"
    >
      <View className="h-32 w-full relative">
        {data.imagemUrl && (
          <Image source={{ uri: data.imagemUrl }} className="w-full h-full" resizeMode="cover" />
        )}
      </View>
      <View className="p-4">
        <Text className="font-body-sm text-body-sm text-primary">{formatarDataHora(data.comecaEm).toUpperCase()}</Text>
        <Text className="font-body-lg text-body-lg text-on-surface mt-1" numberOfLines={1}>{data.titulo}</Text>
        <View className="flex-row justify-between items-center mt-2">
          <Text className="flex-1 font-body-sm text-body-sm text-on-surface-variant" numberOfLines={1}>
            {data.nomeLocal}
          </Text>
          {preco !== "" && <Text className="font-label-caps text-label-caps text-primary">{preco}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}
