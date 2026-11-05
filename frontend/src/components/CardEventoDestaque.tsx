import { Text, TouchableOpacity, View, Image } from "react-native";
import type { EventoType } from "../utils/index";
import { formatarDataHora, formatarPreco, menorPreco } from "../utils/evento";
import { router } from "expo-router";

export function CardEventoDestaque({ data }: { data: EventoType }) {
  const preco = formatarPreco(menorPreco(data.lotes));

  return (
    <TouchableOpacity
      onPress={() => router.push({ pathname: "/detalhes", params: { id: data.id } })}
      activeOpacity={0.8}
      className="bg-surface-container-high rounded-xl border border-glass-border overflow-hidden flex-col"
    >
      <View className="relative h-64 w-full">
        {data.imagemUrl && (
          <Image source={{ uri: data.imagemUrl }} className="w-full h-full" resizeMode="cover" />
        )}
        {data.categoria?.nome && (
          <View className="absolute left-4 top-4 px-3 py-1 bg-black/60 rounded-full border border-glass-border">
            <Text className="font-label-caps text-label-caps text-on-surface uppercase">{data.categoria.nome}</Text>
          </View>
        )}
        {preco !== "" && (
          <View className="absolute bottom-4 right-4 px-3 py-1 bg-black/60 rounded-full border border-glass-border">
            <Text className="font-label-caps text-label-caps text-secondary">{preco}</Text>
          </View>
        )}
      </View>
      <View className="p-4 flex-col gap-stack-sm">
        <Text className="font-body-sm text-body-sm text-secondary">{formatarDataHora(data.comecaEm).toUpperCase()}</Text>
        <Text className="font-headline-md text-headline-md text-on-surface" numberOfLines={1}>{data.titulo}</Text>
        <Text className="font-body-md text-body-md text-on-surface-variant" numberOfLines={1}>{data.nomeLocal}</Text>
      </View>
    </TouchableOpacity>
  );
}
