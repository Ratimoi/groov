import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { CardLote } from "../components/CardLote";
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventoType } from '@/utils';
import { useCarrinho } from '@/contexts/CarrinhoContext';

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

export default function Lotes() {
    const { eventoId } = useLocalSearchParams();
    const [lotes, setLotes] = useState<any[]>([]);  
    const insets = useSafeAreaInsets();
    const [evento, setEvento] = useState<EventoType>();
    const { carrinho } = useCarrinho();

    const calcularTotal = () => {
        let total = 0;
        lotes?.forEach(lote => {
            const qtd = carrinho[lote.id] || 0;
            total += (lote.preco || 0) * qtd;
        });
        return total;
    };
    
  
  useEffect(() => {
    async function buscaDados() {
        try {
            const response = await fetch(`${apiUrl}/lotes/evento/${eventoId}`);
            const dados = await response.json();
            
            setLotes(dados);

        } catch (error) {
        console.error("Erro ao buscar lotes:", error);
        }
        try {
            const response = await fetch(`${apiUrl}/eventos/${eventoId}`);
            const dados = await response.json();
            
            setEvento(dados);

        } catch (error) {
        console.error("Erro ao buscar evento:", error);
        }
    }
    
    buscaDados();
  }, [])

    const listaLotes = Array.isArray(lotes) ? lotes.map(lote => (
    <CardLote data={lote} key={lote.id} />
    )) : [];

  return (
    <View className="flex-1 bg-background">
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 24, 
          paddingHorizontal: 20,
          paddingBottom: 120, 
        }}
      >
        <View className="mb-stack-lg">
          <Text 
            className="font-headline-lg text-headline-lg-mobile font-bold text-white mb-stack-sm"
            style={{
              textShadowColor: 'rgba(188, 19, 254, 0.3)',
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 8,
            }}
          >
            Selecionar Ingressos
          </Text>
          <Text className="font-body-md text-body-md text-[#c4c7c5]"> {/* text-on-surface-variant */}
            {evento?.titulo}
          </Text>
        </View>
        <View className="flex-col gap-6 mb-8">
            {listaLotes}
        </View>
        <View 
          className="bg-[#1c1b1b]/90 border border-white/10 rounded-xl p-gutter overflow-hidden"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 32, elevation: 8 }}
        >
          {/* Fundo gradiente suave absoluto */}
          <LinearGradient colors={['rgba(0,238,250,0.05)', 'rgba(188,19,254,0.1)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} className="absolute inset-0" />
          
          <Text className="font-headline-md text-headline-md font-bold text-white mb-stack-md">Resumo do Pedido</Text>
            <View className="space-y-2 border-b border-white/10 pb-stack-md mb-stack-md">
            {Array.isArray(lotes) && lotes.map(lote => {
              const quantidade = carrinho[lote.id] || 0;

              if (quantidade === 0) return null;

              const totalDaLinha = quantidade * Number(lote.preco);

              return (
                <View key={lote.id} className="flex-row justify-between items-center mb-2">
                  <Text className="font-body-sm text-body-sm text-white/90">
                    {quantidade}x {lote.nome}
                  </Text>
                  <Text className="font-body-sm font-medium text-white">
                    R$ {totalDaLinha.toFixed(2).replace('.', ',')}
                  </Text>
                </View>
              );
            })}

            {/* Taxa de Serviço (Opcional - Pode manter fixo ou calcular uma % em cima do subtotal depois) */}
            <View className="flex-row justify-between items-center mt-2">
              <Text className="font-body-sm text-body-sm text-[#d4c0d7]">Taxas de Serviço</Text>
              <Text className="font-body-sm font-medium text-[#d4c0d7]">R$ 12,50</Text>
            </View>
            
          </View>
          
          <View className="flex-row justify-between items-center">
            <Text className="font-headline-md text-headline-md font-bold text-white">Total</Text>
            <Text 
              className="font-ticket-data text-ticket-data font-black text-[#00eefa]"
              style={{ textShadowColor: 'rgba(188, 19, 254, 0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 }}
            >
              R$ {calcularTotal()}
            </Text>
          </View>
        </View>

      </ScrollView>

      <View 
        className="absolute bottom-6 right-0 w-full px-margin-mobile flex-row justify-end z-50"
        pointerEvents="box-none" // Essencial para o ScrollView funcionar por baixo
        style={{ paddingBottom: insets.bottom }} // Respeita a barra home do iPhone
      >
        <TouchableOpacity
          activeOpacity={0.8}
          className="rounded-full active:scale-95"
          style={{ shadowColor: '#bc13fe', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 10 }}
        >
          <LinearGradient
            colors={['#00eefa', '#bc13fe']} 
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            className="px-8 py-3 rounded-full flex-row items-center gap-2"
          >
            <Text className="text-white font-headline-md text-[18px] font-bold">
              Avançar
            </Text>
            <MaterialIcons name="arrow-forward" size={22} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

    </View>
  );
}