import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "@/contexts/UserContext";
import { CabecalhoGroov } from "../components/CabecalhoGroov";
import { useBuscaUsuarios, MIN_TERMO_BUSCA } from "../hooks/useBuscaUsuarios";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";
import { api, ApiError } from "../utils/api";
import { ROTULO_FUNCAO, type FuncaoEvento, type MembroEquipeApi } from "../utils/equipe";

const DESCRICAO: Record<"PRODUTOR" | "PORTEIRO", string> = {
  PRODUTOR: "Lê QR, edita o evento e os lotes e vê o painel com a receita.",
  PORTEIRO: "Lê QR e vê as entradas, sem ver dinheiro.",
};

// Equipe de UM evento. Só o dono chega aqui: ele aloca produtores e porteiros.
export default function EquipeEvento() {
  const router = useRouter();
  const espacoNavBar = useEspacoNavBar();
  const { token } = useUser();
  const { eventoId, titulo } = useLocalSearchParams<{ eventoId?: string; titulo?: string }>();
  const [equipe, setEquipe] = useState<MembroEquipeApi[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [funcao, setFuncao] = useState<"PRODUTOR" | "PORTEIRO">("PORTEIRO");
  const [salvando, setSalvando] = useState(false);
  const { resultados, buscando } = useBuscaUsuarios(busca);

  const carregar = useCallback(async () => {
    if (!eventoId) return;
    try {
      setEquipe(await api<MembroEquipeApi[]>(`/eventos/${eventoId}/equipe`, { token }));
      setErro("");
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível carregar a equipe.");
    } finally {
      setCarregando(false);
    }
  }, [eventoId, token]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const voltar = () => (router.canGoBack() ? router.back() : router.replace("/meus-eventos"));
  const termoValido = busca.trim().length >= MIN_TERMO_BUSCA;
  const naEquipe = new Set(equipe.map((membro) => membro.usuarioId));

  async function adicionar(username: string) {
    setSalvando(true);
    try {
      setEquipe(await api<MembroEquipeApi[]>(`/eventos/${eventoId}/equipe`, { token, method: "POST", body: { username, funcao } }));
      setBusca("");
    } catch (error) {
      Alert.alert("Não foi possível adicionar", error instanceof ApiError ? error.message : "Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  const remover = (membro: MembroEquipeApi) =>
    Alert.alert("Remover da equipe?", `${membro.usuario.nome} perde o acesso a este evento.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/eventos/${eventoId}/equipe/${membro.usuarioId}`, { token, method: "DELETE" });
            setEquipe((atual) => atual.filter((item) => item.usuarioId !== membro.usuarioId));
          } catch (error) {
            Alert.alert("Não foi possível remover", error instanceof ApiError ? error.message : "Tente de novo.");
          }
        },
      },
    ]);

  const opcoes: ("PORTEIRO" | "PRODUTOR")[] = ["PORTEIRO", "PRODUTOR"];

  return (
    <View className="flex-1 bg-background">
      <CabecalhoGroov esquerda={{ icone: "arrow-back", onPress: voltar, rotulo: "Voltar" }} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: espacoNavBar, gap: 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-1">
          <Text className="font-headline-md text-headline-md text-on-surface">Equipe</Text>
          {!!titulo && <Text className="font-body-sm text-body-sm text-on-surface-variant">{titulo}</Text>}
        </View>

        {carregando && <ActivityIndicator color="#bc13fe" className="my-6" />}
        {!!erro && !carregando && <Text className="font-body-md text-body-md text-error text-center">{erro}</Text>}

        {!carregando && !erro && (
          <>
            <Text className="font-label-caps text-label-caps text-on-surface-variant">ADICIONAR PESSOA</Text>
            <View className="flex-row gap-2">
              {opcoes.map((opcao) => {
                const ativa = opcao === funcao;
                return (
                  <TouchableOpacity
                    key={opcao}
                    onPress={() => setFuncao(opcao)}
                    className={`flex-1 items-center py-2.5 rounded-xl border ${
                      ativa ? "border-primary-container bg-primary-container/20" : "border-white/10 bg-surface-container-low"
                    }`}
                  >
                    <Text className={`font-label-caps text-label-caps uppercase ${ativa ? "text-primary" : "text-on-surface-variant"}`}>
                      {ROTULO_FUNCAO[opcao]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text className="font-body-sm text-[12px] text-on-surface-variant">{DESCRICAO[funcao]}</Text>

            <TextInput
              value={busca}
              onChangeText={setBusca}
              placeholder="Buscar por nome ou @usuário"
              placeholderTextColor="#7d7080"
              autoCapitalize="none"
              autoCorrect={false}
              className="bg-surface-container rounded-xl border border-glass-border px-4 py-3 text-white font-body-md"
            />

            {termoValido && buscando && <ActivityIndicator color="#bc13fe" />}
            {termoValido &&
              resultados.map((pessoa) => (
                <TouchableOpacity
                  key={pessoa.id}
                  disabled={salvando || naEquipe.has(pessoa.id)}
                  onPress={() => void adicionar(pessoa.username)}
                  activeOpacity={0.8}
                  className="flex-row items-center gap-3 bg-surface-container-low border border-white/10 rounded-xl p-3"
                  style={{ opacity: naEquipe.has(pessoa.id) ? 0.5 : 1 }}
                >
                  <View className="w-10 h-10 rounded-full overflow-hidden bg-surface-container">
                    {pessoa.avatarUrl && <Image source={{ uri: pessoa.avatarUrl }} className="w-full h-full" />}
                  </View>
                  <View className="flex-1">
                    <Text className="font-body-md text-body-md font-bold text-white" numberOfLines={1}>
                      {pessoa.nome}
                    </Text>
                    <Text className="font-body-sm text-body-sm text-on-surface-variant">@{pessoa.username}</Text>
                  </View>
                  <MaterialIcons name={naEquipe.has(pessoa.id) ? "check" : "person-add"} size={20} color="#ebb2ff" />
                </TouchableOpacity>
              ))}

            <Text className="font-label-caps text-label-caps text-on-surface-variant">NA EQUIPE</Text>
            {equipe.map((membro) => (
              <View
                key={membro.usuarioId}
                className="flex-row items-center gap-3 bg-surface-container-low border border-white/10 rounded-xl p-3"
              >
                <View className="w-10 h-10 rounded-full overflow-hidden bg-surface-container">
                  {membro.usuario.avatarUrl && <Image source={{ uri: membro.usuario.avatarUrl }} className="w-full h-full" />}
                </View>
                <View className="flex-1">
                  <Text className="font-body-md text-body-md font-bold text-white" numberOfLines={1}>
                    {membro.usuario.nome}
                  </Text>
                  <Text className="font-body-sm text-body-sm text-on-surface-variant">
                    @{membro.usuario.username} • {ROTULO_FUNCAO[membro.funcao as FuncaoEvento]}
                  </Text>
                </View>
                {membro.funcao !== "DONO" && (
                  <TouchableOpacity onPress={() => remover(membro)} accessibilityLabel="Remover da equipe" hitSlop={8}>
                    <MaterialIcons name="person-remove" size={22} color="#ffb4ab" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
