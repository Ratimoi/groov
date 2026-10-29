import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LoteType } from '@/utils';
import { useCarrinho } from '@/contexts/CarrinhoContext';

export function CardLote({ data }: { data: LoteType }) {
    const { atualizaQuantidade, obterQuantidade } = useCarrinho();

    const quantidade = obterQuantidade(data.id)

    const adicionar = () => atualizaQuantidade(data.id, quantidade + 1);

    const remover = () => {
        if (quantidade > 0) atualizaQuantidade(data.id, quantidade - 1);
    };


  return (
    <View 
      className="bg-[#1c1b1b]/80 border border-white/10 rounded-xl p-gutter overflow-hidden"
      style={{
        // Sombra suave escura adaptada para mobile (shadow-[0_4px_20px_rgba(0,0,0,0.4)])
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 5,
      }}
    >
      <View className="flex-col gap-gutter">
        
        {/* Informações do Lote */}
        <View className="space-y-stack-sm flex-1">
          
          <View className="flex-row items-center gap-2">
            <MaterialIcons name="person" size={24} color="rgba(255, 255, 255, 0.7)" />
            <Text className="font-headline-md text-headline-md font-bold text-white">
              {data.nome}
            </Text>
          </View>
          
          <Text className="font-body-sm text-body-sm text-[#d4c0d7] mt-1">
            Acesso padrão à pista e áreas comuns.
          </Text>

          {/* Preço */}
          <View className="flex-row items-end gap-1 mt-stack-md">
            <Text className="font-ticket-data text-ticket-data font-bold text-[#bc13fe]">
              {data.preco}
            </Text>
            <Text className="font-body-sm text-body-sm text-white/50 mb-0.5">
              /cada
            </Text>
          </View>

        </View>

        {/* Linha Divisória e Contador */}
        <View className="flex-row items-center mt-stack-md pt-4 border-t border-white/10">
          <View className="flex-row items-center bg-[#201f1f] rounded-full p-1 border border-white/10">
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={remover}
              className="w-8 h-8 flex items-center justify-center active:scale-95"
            >
              <MaterialIcons name="remove" size={20} color="rgba(255, 255, 255, 0.6)" />
            </TouchableOpacity>

            <Text className="font-ticket-data text-ticket-data text-white font-bold w-8 text-center">
              {quantidade}
            </Text>

            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={adicionar}
              className="w-8 h-8 flex items-center justify-center active:scale-95"
            >
              <MaterialIcons name="add" size={20} color="rgba(255, 255, 255, 0.6)" />
            </TouchableOpacity>

          </View>
        </View>

      </View>
    </View>
  );
}