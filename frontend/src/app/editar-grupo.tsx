import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "@/contexts/UserContext";
import { CabecalhoGroov } from "../components/CabecalhoGroov";
import { MIN_TERMO_BUSCA, useBuscaUsuarios } from "../hooks/useBuscaUsuarios";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";
import { api, ApiError } from "../utils/api";
import type { CompraGrupoApi, PessoaApi } from "../utils/compras";

type GrupoApi = { id: string; nome: string; liderId: string };
type MembroApi = { usuarioId: string; usuario: PessoaApi };

function Pessoa({ pessoa, detalhe }: { pessoa: PessoaApi; detalhe?: string }) {
  return (
    <>
      <View className="w-11 h-11 rounded-full overflow-hidden bg-surface-container-high">
        {pessoa.avatarUrl && <Image source={{ uri: pessoa.avatarUrl }} className="w-full h-full" />}
      </View>
      <View className="flex-1">
        <Text className="font-body-md text-body-md font-bold text-on-surface" numberOfLines={1}>
          {pessoa.nome}
          {detalhe ? <Text className="font-body-sm text-secondary-container">{`  ${detalhe}`}</Text> : null}
        </Text>
        <Text className="font-body-sm text-body-sm text-on-surface-variant" numberOfLines={1}>
          @{pessoa.username}
        </Text>
      </View>
    </>
  );
}

// Líder edita nome e membros; os demais só veem quem está no grupo e podem sair.
export default function EditarGrupo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, token } = useUser();
  const espacoNavBar = useEspacoNavBar();

  const [grupo, setGrupo] = useState<GrupoApi | null>(null);
  const [membros, setMembros] = useState<MembroApi[]>([]);
  const [pedidoPendente, setPedidoPendente] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [nome, setNome] = useState("");
  const [busca, setBusca] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const souLider = !!grupo && grupo.liderId === user?.id;
  const { resultados, buscando } = useBuscaUsuarios(busca, souLider);

  const carregar = useCallback(async () => {
    if (!id) return;
    try {
      const [grupoApi, membrosApi, compras] = await Promise.all([
        api<GrupoApi>(`/grupos/${id}`, { token }),
        api<MembroApi[]>(`/grupos/${id}/members`, { token }),
        api<CompraGrupoApi[]>("/grupos/compras", { token }),
      ]);
      const agora = Date.now();
      setGrupo(grupoApi);
      setNome(grupoApi.nome);
      setMembros(membrosApi);
      setPedidoPendente(
        compras.some(
          (compra) => compra.grupoId === id && compra.status === "PENDENTE" && new Date(compra.expiraEm).getTime() > agora,
        ),
      );
      setErro(false);
    } catch (error) {
      console.error("Erro ao carregar grupo:", error);
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }, [id, token]);

  // A tela fica montada entre visitas: recarrega ao entrar e limpa ao sair, para não mostrar o grupo anterior.
  useFocusEffect(
    useCallback(() => {
      carregar();
      return () => {
        setGrupo(null);
        setMembros([]);
        setBusca("");
        setCarregando(true);
      };
    }, [carregar]),
  );

  const voltar = () => (router.canGoBack() ? router.back() : router.replace("/grupos"));

  const executar = async (titulo: string, acao: () => Promise<unknown>) => {
    setOcupado(true);
    try {
      await acao();
      await carregar();
    } catch (error) {
      Alert.alert(titulo, error instanceof ApiError ? error.message : "Tente de novo.");
    } finally {
      setOcupado(false);
    }
  };

  const salvarNome = () =>
    executar("Renomear grupo", () => api(`/grupos/${id}`, { method: "PUT", token, body: { nome: nome.trim() } }));

  const adicionar = (pessoa: PessoaApi) =>
    executar("Adicionar membro", async () => {
      await api(`/grupos/${id}/members`, { method: "POST", token, body: { usuarioId: pessoa.id } });
      setBusca("");
    });

  const remover = (membro: MembroApi) =>
    Alert.alert("Remover membro?", `${membro.usuario.nome} sai do grupo ${grupo?.nome}.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () =>
          void executar("Remover membro", () => api(`/grupos/${id}/members/${membro.usuarioId}`, { method: "DELETE", token })),
      },
    ]);

  const sair = () =>
    Alert.alert("Sair do grupo?", `Você deixa de fazer parte de ${grupo?.nome}.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          setOcupado(true);
          try {
            await api(`/grupos/${id}/members/${user?.id}`, { method: "DELETE", token });
            router.replace("/grupos");
          } catch (error) {
            Alert.alert("Sair do grupo", error instanceof ApiError ? error.message : "Tente de novo.");
          } finally {
            setOcupado(false);
          }
        },
      },
    ]);

  const idsMembros = new Set(membros.map((membro) => membro.usuarioId));
  const candidatos = resultados.filter((pessoa) => !idsMembros.has(pessoa.id));
  const termoValido = busca.trim().length >= MIN_TERMO_BUSCA;
  const nomeMudou = !!grupo && nome.trim() !== "" && nome.trim() !== grupo.nome;
  const podeMexerEmMembros = souLider && !pedidoPendente && !ocupado;

  return (
    <View className="flex-1 bg-background">
      <CabecalhoGroov esquerda={{ icone: "arrow-back", onPress: voltar, rotulo: "Voltar" }} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: espacoNavBar }}
        showsVerticalScrollIndicator={false}
      >
        {carregando && <ActivityIndicator color="#bc13fe" className="my-10" />}

        {erro && !carregando && (
          <View className="items-center gap-3 py-10">
            <Text className="font-body-md text-body-md text-on-surface text-center">Não foi possível carregar o grupo.</Text>
            <TouchableOpacity
              onPress={() => {
                setCarregando(true);
                carregar();
              }}
              className="px-5 py-2 rounded-full border border-primary-container"
            >
              <Text className="font-label-caps text-label-caps text-primary uppercase">Tentar de novo</Text>
            </TouchableOpacity>
          </View>
        )}

        {grupo && !carregando && !erro && (
          <>
            <Text className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
              {souLider ? "Editar Grupo" : grupo.nome}
            </Text>
            <Text className="font-body-md text-body-md text-on-surface-variant mt-1 mb-6">
              {souLider ? "Mude o nome e quem faz parte do grupo." : "Quem está neste grupo."}
            </Text>

            {pedidoPendente && (
              <View className="flex-row items-start gap-3 rounded-xl border border-primary-container/30 bg-primary-container/10 p-4 mb-6">
                <MaterialIcons name="info-outline" size={18} color="#ebb2ff" />
                <Text className="flex-1 font-body-sm text-body-sm text-primary">
                  O grupo tem um pedido em andamento; espere ele terminar para mudar os membros.
                </Text>
              </View>
            )}

            {souLider && (
              <>
                <Text className="font-body-sm text-body-sm font-bold text-on-surface mb-2">Nome do Grupo</Text>
                <View className="flex-row items-center gap-3 bg-surface-container-low rounded-xl px-4">
                  <MaterialIcons name="groups" size={20} color="#9d8ba0" />
                  <TextInput
                    value={nome}
                    onChangeText={setNome}
                    placeholder="Nome do grupo"
                    placeholderTextColor="#7d7080"
                    maxLength={100}
                    className="flex-1 py-3.5 text-white font-body-md"
                  />
                  <TouchableOpacity
                    disabled={!nomeMudou || ocupado}
                    onPress={salvarNome}
                    style={{ opacity: nomeMudou && !ocupado ? 1 : 0.4 }}
                  >
                    <Text className="font-label-caps text-label-caps text-primary uppercase">Salvar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <Text className="font-body-md text-body-md font-bold text-on-surface mt-8 mb-3">
              Membros ({membros.length})
            </Text>
            <View className="gap-2">
              {membros.map((membro) => {
                const ehLider = membro.usuarioId === grupo.liderId;
                const ehVoce = membro.usuarioId === user?.id;
                return (
                  <View key={membro.usuarioId} className="flex-row items-center gap-3 bg-surface-container rounded-xl p-3">
                    <Pessoa pessoa={membro.usuario} detalhe={ehLider ? "LÍDER" : ehVoce ? "VOCÊ" : undefined} />
                    {souLider && !ehLider && (
                      <TouchableOpacity
                        disabled={!podeMexerEmMembros}
                        onPress={() => remover(membro)}
                        accessibilityLabel={`Remover ${membro.usuario.nome}`}
                        hitSlop={8}
                        style={{ opacity: podeMexerEmMembros ? 1 : 0.4 }}
                      >
                        <MaterialIcons name="person-remove" size={22} color="#ffb4ab" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>

            {souLider && (
              <>
                <Text className="font-body-md text-body-md font-bold text-on-surface mt-8 mb-3">Adicionar Membros</Text>
                <View
                  className="flex-row items-center gap-3 bg-surface-container-low rounded-xl px-4 mb-3"
                  style={{ opacity: pedidoPendente ? 0.5 : 1 }}
                >
                  <MaterialIcons name="search" size={20} color="#9d8ba0" />
                  <TextInput
                    value={busca}
                    onChangeText={setBusca}
                    editable={!pedidoPendente}
                    placeholder="Buscar por nome ou @arroba..."
                    placeholderTextColor="#7d7080"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="flex-1 py-3.5 text-white font-body-md"
                  />
                  {buscando && <ActivityIndicator size="small" color="#bc13fe" />}
                </View>

                {termoValido && !buscando && candidatos.length === 0 && (
                  <Text className="font-body-sm text-body-sm text-on-surface-variant text-center my-3">
                    Ninguém encontrado para &quot;{busca.trim()}&quot;.
                  </Text>
                )}

                <View className="gap-2">
                  {termoValido &&
                    candidatos.map((pessoa) => (
                      <TouchableOpacity
                        key={pessoa.id}
                        activeOpacity={0.8}
                        disabled={!podeMexerEmMembros}
                        onPress={() => adicionar(pessoa)}
                        className="flex-row items-center gap-3 bg-surface-container rounded-xl p-3"
                        style={{ opacity: podeMexerEmMembros ? 1 : 0.5 }}
                      >
                        <Pessoa pessoa={pessoa} />
                        <View className="w-7 h-7 rounded-full items-center justify-center bg-primary-container">
                          <MaterialIcons name="add" size={18} color="#ffffff" />
                        </View>
                      </TouchableOpacity>
                    ))}
                </View>
              </>
            )}

            {!souLider && (
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={pedidoPendente || ocupado}
                onPress={sair}
                className="mt-8 flex-row items-center justify-center gap-2 rounded-xl border border-error/40 py-3.5"
                style={{ opacity: pedidoPendente || ocupado ? 0.5 : 1 }}
              >
                <MaterialIcons name="logout" size={18} color="#ffb4ab" />
                <Text className="font-body-md text-body-md font-bold text-error">Sair do grupo</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
