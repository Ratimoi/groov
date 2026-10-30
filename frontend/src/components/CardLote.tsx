import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GrupoType, LoteType } from '@/utils';
import { useCarrinho } from '@/contexts/CarrinhoContext';
import { useUser } from '@/contexts/UserContext';
import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, ScrollView } from 'react-native'; 

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

type ModalGruposProps = {
  visivel: boolean;
  onClose: () => void;
};

export function ModalGrupos({ visivel, onClose }: ModalGruposProps) {
  const { user } = useUser();  
  const [grupos, setGrupos] = useState<GrupoType[]>([]);
  
  const [grupoSelecionado, setGrupoSelecionado] = useState<string | null>(null);

  useEffect(() => {
      async function buscaDados() {
          if (!user?.id || !visivel) return;

          try {
              const response = await fetch(`${apiUrl}/usuarios/${user.id}/grupos`);
              const dados = await response.json();
              setGrupos(dados);

              console.log("ID:", user?.id);      
              console.log("Grupos:", grupos);       
            } catch (error) {
              console.error("Erro ao buscar grupos:", error);
          }
      }
      buscaDados();
    }, [user?.id, visivel]);

  return (
    <Modal visible={visivel} transparent={true} animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/70" onPress={onClose}>
        <Pressable 
          className="w-full bg-[#1c1b1b] border-t border-[#bc13fe]/40 rounded-t-3xl p-6"
          style={{ shadowColor: '#bc13fe', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 10 }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Cabeçalho */}
          <View className="flex-row items-start justify-between border-b border-white/10 pb-4 mb-4">
            <View>
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="groups" size={24} color="#bc13fe" />
                <Text className="font-headline-md text-headline-md font-bold text-white">Selecionar Grupo</Text>
              </View>
              <Text className="font-body-sm text-body-sm text-[#d4c0d7] mt-1">
                Selecione um grupo ativo para aplicar o desconto coletivo
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1.5 rounded-full bg-white/5 border border-white/10 active:scale-95">
              <MaterialIcons name="close" size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          <ScrollView className="max-h-[60vh] space-y-4" showsVerticalScrollIndicator={false}>
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-1.5">
                <MaterialIcons name="group" size={18} color="#00eefa" />
                <Text className="font-label-caps text-label-caps font-bold text-[#00eefa] tracking-wider">SEUS GRUPOS ATIVOS</Text>
              </View>
              <Text className="text-[12px] font-label-caps text-white/50">{grupos.length} Grupos</Text>
            </View>

            <View className="flex-col gap-2.5 mb-4">
              {Array.isArray(grupos) ? (
                grupos.map((grupo) => {
                  const isSelected = grupoSelecionado === grupo.id;
                  return (
                    <TouchableOpacity
                      key={grupo.id}
                      activeOpacity={0.8}
                      onPress={() => setGrupoSelecionado(grupo.id)}
                      className={`rounded-xl p-3.5 flex-row items-center justify-between overflow-hidden ${
                        isSelected ? 'bg-[#201f1f] border-2 border-[#bc13fe]' : 'bg-[#201f1f] border border-white/10'
                      }`}
                      style={isSelected ? { shadowColor: '#bc13fe', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 4 } : {}}
                    >
                      {isSelected && (
                        <LinearGradient 
                          colors={['rgba(188,19,254,0.1)', 'rgba(0,238,250,0.05)']} 
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} 
                          className="absolute inset-0" 
                        />
                      )}

                      <View className="space-y-1 z-10">
                        <Text className="font-body-md font-bold text-white text-[15px]">
                          {grupo.nome}
                        </Text>
                        <View className="flex-row items-center gap-1.5">
                          <MaterialIcons name="person" size={15} color={isSelected ? "#ebb2ff" : "#d4c0d7"} />
                          <Text className={`text-body-sm text-[12px] ${isSelected ? 'text-[#ebb2ff]' : 'text-[#d4c0d7]'}`}>
                            {grupo.membros.length} participantes
                          </Text>
                        </View>
                      </View>

                      {/* Bolinha de Check */}
                      <View className={`w-7 h-7 rounded-full flex items-center justify-center z-10 ${
                        isSelected ? 'bg-[#bc13fe]' : 'border border-white/20'
                      }`}
                      style={isSelected ? { shadowColor: '#bc13fe', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 10, elevation: 5 } : {}}
                      >
                        {isSelected && <MaterialIcons name="check" size={18} color="#ffffff" />}
                      </View>

                    </TouchableOpacity>
                );
                })
              ) : (
                <Text className="text-white/50 text-center">Nenhum grupo encontrado.</Text>
              )}
            </View>


            <TouchableOpacity activeOpacity={0.7} className="w-full flex-row items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-[#bc13fe]/50 bg-[#bc13fe]/10 mb-4">
              <MaterialIcons name="add" size={20} color="#ebb2ff" />
              <Text className="text-[#ebb2ff] font-label-caps text-label-caps font-bold tracking-wider">Criar Novo Grupo</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Botão Confirmar */}
          <View className="pt-4 border-t border-white/10 mt-2">
            <TouchableOpacity 
              activeOpacity={0.8} 
              onPress={() => {
                console.log("Confirmou o grupo:", grupoSelecionado);
                onClose();
              }} 
              className="rounded-xl overflow-hidden shadow-[0_0_16px_rgba(188,19,254,0.4)]"
            >
              <LinearGradient colors={['#00eefa', '#bc13fe']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} className="py-3.5 items-center justify-center">
                <Text className="text-white font-label-caps text-label-caps font-bold text-center py-3">Confirmar Grupo</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function CardLote({ data }: { data: LoteType }) {
  const { atualizaQuantidade, obterQuantidade } = useCarrinho();
  
  const [modalGrupoVisivel, setModalGrupoVisivel] = useState(false);

  const quantidade = obterQuantidade(data.id)
  const adicionar = () => atualizaQuantidade(data.id, quantidade + 1);
  const remover = () => {
    if (quantidade > 0) atualizaQuantidade(data.id, quantidade - 1);
  };

  const grupo = data.tamanhoGrupo != null ? true : false
  const totalGrupo = (Number(data.preco) || 0) * (data.tamanhoGrupo || 1);
  const porcentagemDesconto = (Number(data.descontoGrupo) || 0) * 100;
  const porcentagemTexto = `${porcentagemDesconto.toFixed(0)}%`;

  return (
    <View 
      className="bg-[#1c1b1b]/80 border border-white/10 rounded-xl p-gutter overflow-hidden"
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 5 }}
    >
      <View className="flex-col gap-gutter">
        <View className="space-y-stack-sm flex-1">
          <View className="flex-row items-center gap-2">
            {grupo ? (
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="groups" size={24} color="#bc13fe" />
                <Text className="font-headline-md text-headline-md font-bold text-white">
                  Pacote de Grupo ({data.tamanhoGrupo}x)
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="person" size={24} color="rgba(255, 255, 255, 0.7)" />
                <Text className="font-headline-md text-headline-md font-bold text-white">{data.nome}</Text>
              </View>
            )}
          </View>
          
          {grupo && (
            <Text className="font-body-sm text-body-sm text-[#d4c0d7] mt-1">
              Compre em grupo e pague menos. Perfeito para sua galera ou para entrar em turmas abertas.          
            </Text>
          )}

          <View className="flex-row items-end gap-1 mt-stack-md">
            <Text className="font-ticket-data font-bold text-[#bc13fe] text-body-lg">{data.preco}</Text>
            <Text className="font-body-sm text-body-sm text-white/50 mb-0.5">/cada</Text>
          </View>
          
          {grupo && (
            <View className="flex-row items-center gap-2">
              <Text className="text-white/60 text-[13px]">
                Total: <Text className="text-white font-medium">R$ {totalGrupo.toFixed(2).replace('.', ',')}</Text>
              </Text>
              <Text className="text-[#ebb2ff] font-label-caps text-[11px] font-semibold tracking-wider">
                ECONOMIZE {porcentagemTexto}
              </Text>
            </View>
          )}
        </View>

        <View className="flex-row items-center mt-stack-md pt-4 border-t border-white/10">
          {grupo == false ? (
            <View className="flex-row items-center bg-[#201f1f] rounded-full p-1 border border-white/10">
              <TouchableOpacity activeOpacity={0.7} onPress={remover} className="w-8 h-8 flex items-center justify-center active:scale-95">
                <MaterialIcons name="remove" size={20} color="rgba(255, 255, 255, 0.6)" />
              </TouchableOpacity>
              <Text className="font-ticket-data text-ticket-data text-white font-bold w-8 text-center">{quantidade}</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={adicionar} className="w-8 h-8 flex items-center justify-center active:scale-95">
                <MaterialIcons name="add" size={20} color="rgba(255, 255, 255, 0.6)" />
              </TouchableOpacity>
            </View>
          ) : (
              <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => setModalGrupoVisivel(true)} 
                className="w-full bg-[#bc13fe]/20 border border-[#bc13fe]/50 px-4 py-2.5 rounded-xl flex-row items-center justify-center gap-2"
              >
                <MaterialIcons name="group-add" size={18} color="#ebb2ff" />
                <Text className="text-[#ebb2ff] font-label-caps text-label-caps font-bold tracking-wider">
                  Selecionar Opção
                </Text>
              </TouchableOpacity>
          )}
        </View>
      </View>

      <ModalGrupos 
        visivel={modalGrupoVisivel} 
        onClose={() => setModalGrupoVisivel(false)} 
      />

    </View>
  );
}

