import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useUser } from "@/contexts/UserContext";
import { CabecalhoGroov } from "../components/CabecalhoGroov";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";
import { api, ApiError } from "../utils/api";
import { formatarDataHora } from "../utils/evento";

type Cargo = "GERENTE" | "PROMOTOR" | "VALIDADOR";

type MeuEvento = {
  cargo: Cargo;
  evento: {
    id: string;
    titulo: string;
    imagemUrl: string | null;
    comecaEm: string;
    nomeLocal: string | null;
    cidade: string;
    ocultoEm: string | null;
  };
};

const ROTULO_CARGO: Record<Cargo, string> = { GERENTE: "GERENTE", PROMOTOR: "PROMOTOR", VALIDADOR: "VALIDADOR" };

function Acao({ icone, texto, onPress, perigo = false }: { icone: React.ComponentProps<typeof MaterialIcons>["name"]; texto: string; onPress: () => void; perigo?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className={`flex-row items-center gap-1.5 px-3 py-2 rounded-lg border ${perigo ? "border-error/50 bg-error/10" : "border-white/15 bg-white/5"}`}
    >
      <MaterialIcons name={icone} size={16} color={perigo ? "#ffb4ab" : "#ebb2ff"} />
      <Text className={`font-body-sm text-body-sm ${perigo ? "text-error" : "text-white"}`}>{texto}</Text>
    </TouchableOpacity>
  );
}

// Eventos que a pessoa gerencia ou em que está na equipe (promotor ou validador).
export default function MeusEventos() {
  const router = useRouter();
  const espacoNavBar = useEspacoNavBar();
  const { token } = useUser();
  const [itens, setItens] = useState<MeuEvento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    try {
      setItens(await api<MeuEvento[]>("/eventos/meus", { token }));
      setErro("");
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível carregar seus eventos.");
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  const voltar = () => (router.canGoBack() ? router.back() : router.replace("/perfil"));

  const apagar = (item: MeuEvento) =>
    Alert.alert("Apagar evento", `Apagar "${item.evento.titulo}"? Isso não pode ser desfeito.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/eventos/${item.evento.id}`, { token, method: "DELETE" });
            setItens((atual) => atual.filter((i) => i.evento.id !== item.evento.id));
          } catch (e) {
            const vendido = e instanceof ApiError && e.status === 409;
            Alert.alert(
              "Não foi possível apagar",
              vendido ? "Este evento já tem ingressos vendidos, então não pode ser apagado." : e instanceof ApiError ? e.message : "Tente de novo.",
            );
          }
        },
      },
    ]);

  return (
    <View className="flex-1 bg-background">
      <CabecalhoGroov esquerda={{ icone: "arrow-back", onPress: voltar, rotulo: "Voltar" }} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: espacoNavBar + 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Meus eventos</Text>
        <Text className="font-body-md text-body-md text-on-surface-variant mt-1 mb-5">
          Os eventos que você publicou ou ajuda a organizar.
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/publicar")}
          activeOpacity={0.85}
          className="flex-row items-center justify-center gap-2 bg-primary-container rounded-xl py-4 mb-6"
        >
          <MaterialIcons name="add-circle-outline" size={22} color="#ffffff" />
          <Text className="font-headline-md text-white text-[16px]">Publicar novo evento</Text>
        </TouchableOpacity>

        {carregando && <ActivityIndicator color="#bc13fe" className="my-10" />}

        {!!erro && !carregando && (
          <View className="items-center gap-3 py-6">
            <Text className="font-body-md text-body-md text-on-surface text-center">{erro}</Text>
            <TouchableOpacity onPress={carregar} className="px-5 py-2 rounded-full border border-primary-container">
              <Text className="font-label-caps text-label-caps text-primary uppercase">Tentar de novo</Text>
            </TouchableOpacity>
          </View>
        )}

        {!carregando && !erro && itens.length === 0 && (
          <Text className="font-body-md text-body-md text-on-surface-variant text-center my-8">
            Você ainda não publicou nem organiza nenhum evento.
          </Text>
        )}

        <View className="gap-4">
          {itens.map((item) => (
            <View key={`${item.cargo}-${item.evento.id}`} className="bg-surface-container-low border border-white/10 rounded-2xl overflow-hidden">
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: "/detalhes", params: { id: item.evento.id } })}
                className="h-32 bg-surface-container-high justify-end"
              >
                {item.evento.imagemUrl && (
                  <Image source={{ uri: item.evento.imagemUrl }} className="absolute inset-0 w-full h-full" resizeMode="cover" />
                )}
                <View className="absolute inset-0 bg-black/45" />
                <View className="absolute left-3 top-3 flex-row gap-2">
                  <View className="px-3 py-1 rounded-full bg-black/70 border border-glass-border">
                    <Text className="font-label-caps text-label-caps text-white">{ROTULO_CARGO[item.cargo]}</Text>
                  </View>
                  {!!item.evento.ocultoEm && (
                    <View className="px-3 py-1 rounded-full bg-black/70 border border-error/60">
                      <Text className="font-label-caps text-label-caps text-error">OCULTO</Text>
                    </View>
                  )}
                </View>
                <View className="p-3">
                  <Text className="font-body-md text-body-md font-bold text-white" numberOfLines={2}>
                    {item.evento.titulo}
                  </Text>
                  <Text className="font-body-sm text-body-sm text-on-surface-variant" numberOfLines={1}>
                    {formatarDataHora(item.evento.comecaEm)} • {item.evento.nomeLocal ?? item.evento.cidade}
                  </Text>
                </View>
              </TouchableOpacity>

              <View className="flex-row flex-wrap gap-2 p-3">
                {item.cargo === "GERENTE" && (
                  <>
                    <Acao icone="edit" texto="Editar" onPress={() => router.push({ pathname: "/publicar", params: { eventoId: item.evento.id } })} />
                    <Acao icone="groups" texto="Equipe" onPress={() => router.push({ pathname: "/equipe", params: { eventoId: item.evento.id } })} />
                    <Acao icone="qr-code-scanner" texto="Validar" onPress={() => router.push("/escanear")} />
                    <Acao icone="delete-outline" texto="Apagar" perigo onPress={() => apagar(item)} />
                  </>
                )}
                {item.cargo === "VALIDADOR" && <Acao icone="qr-code-scanner" texto="Validar ingressos" onPress={() => router.push("/escanear")} />}
                {item.cargo === "PROMOTOR" && (
                  <Acao icone="link" texto="Meu link e vendas" onPress={() => router.push({ pathname: "/promotor", params: { eventoId: item.evento.id } })} />
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
