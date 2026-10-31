import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useUser } from "@/contexts/UserContext";
import type { GrupoEscolhido } from "../utils/lote";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

type GrupoDaApi = {
  id: string;
  nome: string;
  membros: unknown[];
};

type Props = {
  visivel: boolean;
  grupoAtual?: GrupoEscolhido;
  onClose: () => void;
  onConfirmar: (grupo: GrupoEscolhido) => void;
  onCriarGrupo: () => void;
};

export function ModalGrupos({ visivel, grupoAtual, onClose, onConfirmar, onCriarGrupo }: Props) {
  const { user, token } = useUser();
  const [grupos, setGrupos] = useState<GrupoDaApi[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [selecionado, setSelecionado] = useState<string | null>(grupoAtual?.id ?? null);

  useEffect(() => {
    if (!visivel || !user?.id || !token) return;
    let cancelado = false;

    async function buscaGrupos() {
      try {
        const response = await fetch(`${apiUrl}/usuarios/${user?.id}/grupos`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const dados = await response.json();
        if (!cancelado) {
          setGrupos(Array.isArray(dados) ? dados : []);
          setErro(false);
        }
      } catch (error) {
        console.error("Erro ao buscar grupos:", error);
        if (!cancelado) setErro(true);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    buscaGrupos();
    return () => {
      cancelado = true;
    };
  }, [visivel, user?.id, token]);

  const confirmar = () => {
    const grupo = grupos.find((item) => item.id === selecionado);
    if (!grupo) return;
    onConfirmar({ id: grupo.id, nome: grupo.nome });
    onClose();
  };

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/70" onPress={onClose}>
        <Pressable
          className="w-full bg-surface-container-low border-t border-primary-container/40 rounded-t-3xl p-6"
          style={{ shadowColor: "#bc13fe", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 10 }}
          onPress={(e) => e.stopPropagation()}
        >
          <View className="flex-row items-start justify-between border-b border-white/10 pb-4 mb-4">
            <View className="flex-1 pr-3">
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="groups" size={24} color="#bc13fe" />
                <Text className="font-headline-md text-headline-md text-white">Selecionar Grupo</Text>
              </View>
              <Text className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                Selecione um grupo ativo para aplicar o desconto coletivo
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              accessibilityLabel="Fechar"
              className="p-1.5 rounded-full bg-white/5 border border-white/10"
            >
              <MaterialIcons name="close" size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-1.5">
                <MaterialIcons name="group" size={18} color="#00eefa" />
                <Text className="font-label-caps text-label-caps text-secondary-container">SEUS GRUPOS ATIVOS</Text>
              </View>
              <Text className="font-label-caps text-label-caps text-white/50">
                {grupos.length} {grupos.length === 1 ? "Grupo" : "Grupos"}
              </Text>
            </View>

            {carregando && !erro && <ActivityIndicator color="#bc13fe" className="my-4" />}
            {erro && (
              <Text className="font-body-sm text-body-sm text-error text-center my-3">
                Não foi possível carregar seus grupos.
              </Text>
            )}

            <View className="flex-col gap-2.5 mb-4">
              {grupos.map((grupo) => {
                const ativo = selecionado === grupo.id;
                return (
                  <TouchableOpacity
                    key={grupo.id}
                    activeOpacity={0.8}
                    onPress={() => setSelecionado(grupo.id)}
                    className={`rounded-xl p-3.5 flex-row items-center justify-between overflow-hidden bg-surface-container ${
                      ativo ? "border-2 border-primary-container" : "border border-white/10"
                    }`}
                  >
                    <View className="flex-1 gap-1">
                      <Text className="font-body-md text-body-md font-bold text-white" numberOfLines={1}>
                        {grupo.nome}
                      </Text>
                      <View className="flex-row items-center gap-1.5">
                        <MaterialIcons name="person" size={15} color={ativo ? "#ebb2ff" : "#d4c0d7"} />
                        <Text className={`font-body-sm text-body-sm ${ativo ? "text-primary" : "text-on-surface-variant"}`}>
                          {grupo.membros.length} participantes
                        </Text>
                      </View>
                    </View>
                    <View
                      className={`w-7 h-7 rounded-full items-center justify-center ${
                        ativo ? "bg-primary-container" : "border border-white/20"
                      }`}
                    >
                      {ativo && <MaterialIcons name="check" size={18} color="#ffffff" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                onClose();
                onCriarGrupo();
              }}
              className="w-full flex-row items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-primary-container/50 bg-primary-container/10 mb-4"
            >
              <MaterialIcons name="add" size={20} color="#ebb2ff" />
              <Text className="font-label-caps text-label-caps text-primary">Criar Novo Grupo</Text>
            </TouchableOpacity>
          </ScrollView>

          <View className="pt-4 border-t border-white/10 mt-2">
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={!selecionado}
              onPress={confirmar}
              className="rounded-xl overflow-hidden"
              style={{ opacity: selecionado ? 1 : 0.5 }}
            >
              <LinearGradient
                colors={["#00eefa", "#bc13fe"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="py-3 items-center justify-center"
              >
                <Text className="text-white font-label-caps text-label-caps text-center py-2">Confirmar Grupo</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
