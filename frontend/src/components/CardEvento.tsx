import { Text, TouchableOpacity, View, Image } from "react-native";
import type { EventoType } from "../utils/index";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { router } from "expo-router";

export function CardEvento({ data }: { data: EventoType }) {

  const lote_atual = data.lotes?.length ? data.lotes[data.lotes.length - 1] : null;
  const preco = lote_atual?.preco;
  
  function formatarDataEvento(comecaEm: Date, horario: Date) {
    if (!comecaEm) return '';

    const dataFormatada = format(new Date(comecaEm), "EEE, dd MMM", { locale: ptBR });

    let horaFormatada = '';
    if (horario) {
      horaFormatada = format(new Date(horario), " '•' HH:mm", { locale: ptBR });
    }

    return (dataFormatada + horaFormatada).toUpperCase();
  }
  
  return (
            <TouchableOpacity  onPress={() => router.push({ pathname: "/detalhes", params: { id: data.id } })} activeOpacity={0.8} className="w-72 bg-surface-container-high rounded-xl border border-glass-border overflow-hidden flex-col">
              <View className="h-32 w-full relative">
                {data.imagemUrl && (
                    <Image 
                    source={{ uri: data.imagemUrl }}
                    className="w-full h-full"
                    resizeMode="cover"
                    />
                )}
              </View>
              <View className="p-4">
                <Text className="font-body-sm text-body-sm text-primary">{formatarDataEvento(data.comecaEm, data.horario)}</Text>
                <Text className="font-body-lg text-body-lg text-on-surface mt-1" numberOfLines={1}>{data.titulo}</Text>
                <View className="flex-row justify-between items-center mt-2">
                  <Text className="font-body-sm text-body-sm text-on-surface-variant">{data.nomeLocal}</Text>
                  <Text className="font-label-caps text-label-caps text-primary">R$ {preco}</Text>
                </View>
              </View>
            </TouchableOpacity>
  );
}
