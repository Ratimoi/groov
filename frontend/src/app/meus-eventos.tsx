import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useUser } from "@/contexts/UserContext";
import { CabecalhoGroov } from "../components/CabecalhoGroov";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";
import { api } from "../utils/api";
import { ROTULO_FUNCAO, type EventoDaEquipeApi } from "../utils/equipe";
import { formatarDataHora } from "../utils/evento";

// Eventos em que a pessoa tem função (dono, produtor ou porteiro). É daqui que se lê QR e se vê o painel.
export default function MeusEventos() {
  const router = useRouter();
  const espacoNavBar = useEspacoNavBar();
  const { token } = useUser();
  const [eventos, setEventos] = useState<EventoDaEquipeApi[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setEventos(await api<EventoDaEquipeApi[]>("/eventos/meus", { token }));
      setErro(false);
    } catch (error) {
      console.error("Erro ao buscar meus eventos:", error);
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const voltar = () => (router.canGoBack() ? router.back() : router.replace("/perfil"));

  return (
    <View className="flex-1 bg-background">
      <CabecalhoGroov esquerda={{ icone: "arrow-back", onPress: voltar, rotulo: "Voltar" }} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: espacoNavBar, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-headline-md text-headline-md text-on-surface">Meus eventos</Text>
        <Text className="font-body-sm text-body-sm text-on-surface-variant">
          Eventos em que você é dono, produtor ou porteiro. Cada evento tem a sua equipe, o seu painel e o seu leitor de QR.
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/criar-evento")}
          activeOpacity={0.8}
          className="flex-row items-center justify-center gap-2 py-3.5 rounded-xl bg-primary-container"
        >
          <MaterialIcons name="add" size={20} color="#ffffff" />
          <Text className="font-label-caps text-label-caps text-white uppercase">Criar evento</Text>
        </TouchableOpacity>

        {carregando && <ActivityIndicator color="#bc13fe" className="my-6" />}

        {erro && !carregando && (
          <View className="items-center gap-3 py-6">
            <Text className="font-body-md text-body-md text-on-surface text-center">Não foi possível carregar seus eventos.</Text>
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

        {!carregando && !erro && eventos.length === 0 && (
          <View className="items-center gap-3 py-6">
            <MaterialIcons name="event-busy" size={40} color="#504254" />
            <Text className="font-body-md text-body-md text-on-surface-variant text-center">
              Você ainda não faz parte da equipe de nenhum evento. Crie o seu, ou peça ao dono de um evento para te chamar
              para a equipe.
            </Text>
          </View>
        )}

        {eventos.map(({ evento, funcao }) => (
          <TouchableOpacity
            key={evento.id}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: "/evento-painel", params: { eventoId: evento.id } })}
            className="bg-surface-container-low border border-white/10 rounded-2xl p-4 gap-1"
          >
            <View className="flex-row items-center justify-between gap-3">
              <Text className="flex-1 font-body-md text-body-md font-bold text-white" numberOfLines={1}>
                {evento.titulo}
              </Text>
              <View className="px-2.5 py-1 rounded-full bg-primary-container/20 border border-primary-container/50">
                <Text className="font-label-caps text-[10px] text-primary uppercase">{ROTULO_FUNCAO[funcao]}</Text>
              </View>
            </View>
            <Text className="font-body-sm text-body-sm text-on-surface-variant" numberOfLines={1}>
              {formatarDataHora(evento.comecaEm)} • {evento.cidade}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
