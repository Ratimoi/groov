import { Text, TouchableOpacity, View, Image } from "react-native";
import type { EventoType } from "../utils/index";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
            <TouchableOpacity activeOpacity={0.8} className="bg-surface-container-high rounded-xl border border-glass-border overflow-hidden flex-col">
              <View className="relative h-64 w-full">
              {data.imagemUrl && (
                <Image 
                  source={{ uri: data.imagemUrl }}
                  className="w-full h-40"
                  resizeMode="cover"
                />
              )}
                <View className="absolute bottom-4 right-4 px-3 py-1 bg-black/60 rounded-full border border-glass-border">
                  <Text className="font-label-caps text-label-caps text-secondary">{preco}</Text>
                </View>
              </View>
              <View className="p-4 flex-col gap-stack-sm">
                <Text className="font-body-sm text-body-sm text-secondary">{formatarDataEvento(data.comecaEm, data.horario)}</Text>
                <Text className="font-headline-md text-headline-md text-on-surface" numberOfLines={1}>{data.titulo}</Text>
                <Text className="font-body-md text-body-md text-on-surface-variant" numberOfLines={1}>{data.nomeLocal}</Text>
              </View>
            </TouchableOpacity>
  );
}
