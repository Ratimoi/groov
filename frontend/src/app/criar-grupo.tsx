import { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "@/contexts/UserContext";
import { CabecalhoGroov } from "../components/CabecalhoGroov";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";
import { api, ApiError } from "../utils/api";

type PessoaBusca = { id: string; nome: string; username: string; avatarUrl: string | null };

const MAX_CONVIDADOS_PADRAO = 49;
const ESPERA_BUSCA_MS = 400;

export default function CriarGrupo() {
  // `tamanho` vem do pacote de grupo do lote (você + convidados); sem ele não há limite além do máximo.
  const { tamanho } = useLocalSearchParams<{ tamanho?: string }>();
  const router = useRouter();
  const { token } = useUser();
  const espacoNavBar = useEspacoNavBar();
  const maxConvidados = tamanho && Number(tamanho) > 1 ? Number(tamanho) - 1 : MAX_CONVIDADOS_PADRAO;

  const [nome, setNome] = useState("");
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<PessoaBusca[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [selecionados, setSelecionados] = useState<PessoaBusca[]>([]);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const termo = busca.trim();
    if (termo.length < 2) return;
    let cancelado = false;
    const espera = setTimeout(async () => {
      setBuscando(true);
      try {
        const dados = await api<PessoaBusca[]>(`/usuarios/busca?q=${encodeURIComponent(termo)}`, { token });
        if (!cancelado) setResultados(dados);
      } catch (error) {
        console.error("Erro na busca de usuários:", error);
        if (!cancelado) setResultados([]);
      } finally {
        if (!cancelado) setBuscando(false);
      }
    }, ESPERA_BUSCA_MS);
    return () => {
      cancelado = true;
      clearTimeout(espera);
    };
  }, [busca, token]);

  const voltar = () => (router.canGoBack() ? router.back() : router.replace("/grupos"));
  const idsSelecionados = new Set(selecionados.map((pessoa) => pessoa.id));
  const cheio = selecionados.length >= maxConvidados;
  // Quem já foi escolhido sempre aparece, mesmo fora do resultado da busca atual.
  const lista = busca.trim().length < 2 ? selecionados : [...selecionados, ...resultados.filter((p) => !idsSelecionados.has(p.id))];

  const alternar = (pessoa: PessoaBusca) => {
    setSelecionados((atual) =>
      idsSelecionados.has(pessoa.id)
        ? atual.filter((item) => item.id !== pessoa.id)
        : atual.length >= maxConvidados
          ? atual
          : [...atual, pessoa],
    );
  };

  const criar = async () => {
    setCriando(true);
    setErro("");
    let grupoId: string | null = null;
    try {
      const grupo = await api<{ id: string }>("/grupos", { method: "POST", token, body: { nome: nome.trim() } });
      grupoId = grupo.id;
      for (const pessoa of selecionados) {
        await api(`/grupos/${grupo.id}/members`, { method: "POST", token, body: { usuarioId: pessoa.id } });
      }
      router.replace("/grupos");
    } catch (error) {
      // O grupo já existe: segue para a lista (os convites faltantes se refazem lá) em vez de
      // deixar o usuário criar um segundo grupo igual.
      if (grupoId) {
        router.replace("/grupos");
        return;
      }
      setErro(error instanceof ApiError ? error.message : "Não foi possível criar o grupo.");
      setCriando(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <CabecalhoGroov esquerda={{ icone: "arrow-back", onPress: voltar, rotulo: "Voltar" }} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: espacoNavBar }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Criar Grupo</Text>
        <Text className="font-body-md text-body-md text-on-surface-variant mt-1 mb-6">
          Junte a galera, garanta benefícios VIP e pague menos.
        </Text>

        <Text className="font-body-sm text-body-sm font-bold text-on-surface mb-2">Nome do Grupo</Text>
        <View className="flex-row items-center gap-3 bg-surface-container-low rounded-xl px-4">
          <MaterialIcons name="groups" size={20} color="#9d8ba0" />
          <TextInput
            value={nome}
            onChangeText={setNome}
            placeholder="Ex.: Galera do Afterlife"
            placeholderTextColor="#7d7080"
            maxLength={100}
            className="flex-1 py-3.5 text-white font-body-md"
          />
        </View>

        <View className="flex-row items-center justify-between mt-8 mb-3">
          <Text className="font-body-md text-body-md font-bold text-on-surface">Convidar Amigos</Text>
          <Text className="font-ticket-data text-ticket-data text-primary">
            {selecionados.length}/{maxConvidados === MAX_CONVIDADOS_PADRAO ? "∞" : maxConvidados} Selecionados
          </Text>
        </View>

        <View className="flex-row items-center gap-3 bg-surface-container-low rounded-xl px-4 mb-3">
          <MaterialIcons name="search" size={20} color="#9d8ba0" />
          <TextInput
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar por nome ou @arroba..."
            placeholderTextColor="#7d7080"
            autoCapitalize="none"
            autoCorrect={false}
            className="flex-1 py-3.5 text-white font-body-md"
          />
          {buscando && <ActivityIndicator size="small" color="#bc13fe" />}
        </View>

        {busca.trim().length >= 2 && !buscando && lista.length === 0 && (
          <Text className="font-body-sm text-body-sm text-on-surface-variant text-center my-3">
            Ninguém encontrado para &quot;{busca.trim()}&quot;.
          </Text>
        )}

        <View className="gap-2">
          {lista.map((pessoa) => {
            const marcado = idsSelecionados.has(pessoa.id);
            const bloqueado = !marcado && cheio;
            return (
              <TouchableOpacity
                key={pessoa.id}
                activeOpacity={0.8}
                disabled={bloqueado}
                onPress={() => alternar(pessoa)}
                className="flex-row items-center gap-3 bg-surface-container rounded-xl p-3"
                style={{ opacity: bloqueado ? 0.5 : 1 }}
              >
                <View className="w-11 h-11 rounded-full overflow-hidden bg-surface-container-high">
                  {pessoa.avatarUrl && <Image source={{ uri: pessoa.avatarUrl }} className="w-full h-full" />}
                </View>
                <View className="flex-1">
                  <Text className="font-body-md text-body-md font-bold text-on-surface" numberOfLines={1}>
                    {pessoa.nome}
                  </Text>
                  <Text className="font-body-sm text-body-sm text-on-surface-variant" numberOfLines={1}>
                    @{pessoa.username}
                  </Text>
                </View>
                <View
                  className={`w-7 h-7 rounded-full items-center justify-center ${
                    marcado ? "bg-primary-container" : "bg-surface-container-lowest"
                  }`}
                >
                  <MaterialIcons name={marcado ? "check" : "add"} size={18} color="#ffffff" />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {!!erro && <Text className="font-body-sm text-body-sm text-error mt-4 text-center">{erro}</Text>}

        <TouchableOpacity
          activeOpacity={0.8}
          disabled={!nome.trim() || criando}
          onPress={criar}
          className="mt-8 bg-primary-container rounded-xl py-4 flex-row items-center justify-center gap-2"
          style={{ opacity: nome.trim() && !criando ? 1 : 0.5, shadowColor: "#bc13fe", shadowOpacity: 0.5, shadowRadius: 16, elevation: 6 }}
        >
          {criando ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <MaterialIcons name="hub" size={20} color="#ffffff" />
              <Text className="font-headline-md text-white text-[16px] uppercase">Criar Grupo</Text>
            </>
          )}
        </TouchableOpacity>
        <View className="flex-row items-center justify-center gap-2 mt-3">
          <MaterialIcons name="lock" size={12} color="#9d8ba0" />
          <Text className="font-body-sm text-[12px] text-on-surface-variant text-center flex-shrink">
            O desconto coletivo será validado quando a meta for completada.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
