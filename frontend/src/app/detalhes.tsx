import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, ScrollView, Share, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EventoType } from "@/utils";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";
import { useContagem } from "../hooks/useContagem";
import { CabecalhoGroov } from "../components/CabecalhoGroov";
import { formatarIntervalo } from "../utils/evento";
import { ALTURA_NAVBAR, MARGEM_INFERIOR_NAVBAR } from "../components/NavBar";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;
const MAX_ATRACOES_VISIVEIS = 3;

const doisDigitos = (valor: number) => String(valor).padStart(2, "0");

export default function DetalhesEvento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const espacoNavBar = useEspacoNavBar();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [evento, setEvento] = useState<EventoType>();
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const contagem = useContagem(evento?.comecaEm);

  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let cancelado = false;
    async function buscaDados() {
      try {
        const response = await fetch(`${apiUrl}/eventos/${id}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const dados = await response.json();
        if (!cancelado) setEvento(dados);
      } catch (error) {
        console.error("Erro ao buscar evento:", error);
        if (!cancelado) setErro(true);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }
    buscaDados();
    return () => {
      cancelado = true;
    };
  }, [id, tentativa]);

  const tentarDeNovo = () => {
    setCarregando(true);
    setErro(false);
    setTentativa((valor) => valor + 1);
  };

  const voltar = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const compartilhar = () => {
    if (!evento) return;
    Share.share({
      message: `${evento.titulo} - ${formatarIntervalo(evento.comecaEm, evento.terminaEm)} - ${evento.nomeLocal ?? ""}`,
    });
  };

  const comoChegar = () => {
    const destino = encodeURIComponent([evento?.nomeLocal, evento?.cidade].filter(Boolean).join(", "));
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${destino}`);
  };

  const organizador = evento?.criadoPor;
  const atracoes = evento?.atracoes ?? [];
  const atracoesExtras = Math.max(0, atracoes.length - MAX_ATRACOES_VISIVEIS);
  const atracoesVisiveis = atracoes.slice(0, atracoesExtras > 0 ? MAX_ATRACOES_VISIVEIS : atracoes.length);

  const blocoContagem = (valor: number, rotulo: string) => (
    <View className="flex-col items-center min-w-[48px]">
      <Text className="font-ticket-data text-ticket-data text-secondary-container" style={{ fontSize: 22 }}>
        {doisDigitos(valor)}
      </Text>
      <Text className="font-label-caps text-label-caps text-on-surface-variant">{rotulo}</Text>
    </View>
  );

  const cabecalho = (
    <CabecalhoGroov
      sobreposto
      esquerda={{ icone: "arrow-back", onPress: voltar, rotulo: "Voltar" }}
      direita={{ icone: "share", onPress: compartilhar, rotulo: "Compartilhar" }}
    />
  );

  if (carregando || erro || !evento) {
    return (
      <View className="flex-1 bg-background">
        {cabecalho}
        <View className="flex-1 items-center justify-center gap-3 px-margin-mobile">
          {carregando ? (
            <ActivityIndicator color="#bc13fe" />
          ) : (
            <>
              <Text className="font-body-md text-body-md text-on-surface text-center">
                Não foi possível carregar o evento.
              </Text>
              <TouchableOpacity onPress={tentarDeNovo} className="px-5 py-2 rounded-full border border-primary-container">
                <Text className="font-label-caps text-label-caps text-primary uppercase">Tentar de novo</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: espacoNavBar + 64 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="relative w-full aspect-[4/5] overflow-hidden">
          {evento.imagemUrl && (
            <Image source={{ uri: evento.imagemUrl }} className="absolute inset-0 w-full h-full" resizeMode="cover" />
          )}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.6)", "#131313"]}
            className="absolute inset-0 z-10"
          />
          <View className="absolute bottom-0 left-0 w-full p-margin-mobile z-20 flex-col gap-stack-md">
            {evento.categoria?.nome && (
              <View className="self-start px-3 py-1 rounded-full border border-secondary-container/50 bg-secondary-container/10">
                <Text className="font-label-caps text-label-caps text-secondary-container uppercase">
                  {evento.categoria.nome}
                </Text>
              </View>
            )}
            <Text className="font-headline-lg-mobile text-headline-lg-mobile text-white">{evento.titulo}</Text>
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="calendar-month" size={16} color="#00eefa" />
              <Text className="text-on-surface-variant font-body-sm text-body-sm">
                {formatarIntervalo(evento.comecaEm, evento.terminaEm)}
              </Text>
            </View>
          </View>
        </View>

        <View className="px-margin-mobile py-6">
          <View className="bg-surface-container-high border border-primary-container/30 rounded-xl flex-row justify-between items-center p-stack-md">
            {blocoContagem(contagem.dias, "DIAS")}
            <Text className="text-primary-container font-bold">:</Text>
            {blocoContagem(contagem.horas, "HORAS")}
            <Text className="text-primary-container font-bold">:</Text>
            {blocoContagem(contagem.minutos, "MIN")}
            <Text className="text-primary-container font-bold">:</Text>
            {blocoContagem(contagem.segundos, "SEG")}
          </View>
        </View>

        {!!evento.descricao && (
          <View className="px-margin-mobile flex-col pb-8 gap-2">
            <Text className="font-headline-md text-headline-md text-white">Sobre a Experiência</Text>
            <Text className="font-body-md text-body-md text-on-surface-variant">{evento.descricao}</Text>
          </View>
        )}

        {organizador && (
          <View className="px-margin-mobile pb-8">
            <Text className="font-headline-md text-headline-md text-white mb-4">Organizado por</Text>
            <View className="flex-row items-center gap-stack-md bg-surface-container-high border border-primary-container/30 rounded-xl p-stack-md">
              <View className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary-container bg-surface-container">
                {organizador.avatarUrl && (
                  <Image source={{ uri: organizador.avatarUrl }} className="w-full h-full" />
                )}
              </View>
              <View className="flex-1">
                <Text className="font-body-lg text-body-lg font-bold text-white" numberOfLines={1}>
                  {organizador.nome}
                </Text>
                <Text className="font-body-sm text-body-sm text-on-surface-variant" numberOfLines={1}>
                  @{organizador.username}
                </Text>
              </View>
            </View>
          </View>
        )}

        {atracoes.length > 0 && (
          <View className="px-margin-mobile pb-8">
            <Text className="font-headline-md text-headline-md text-white mb-4">Lineup</Text>
            <View className="flex-row gap-stack-md">
              {atracoesVisiveis.map((atracao) => (
                <View
                  key={atracao.id}
                  className="flex-1 bg-surface-container-high rounded-lg overflow-hidden border border-primary-container/20"
                >
                  <View className="aspect-square">
                    <Image
                      source={{ uri: atracao.avatarUrl ?? "https://i.pravatar.cc/150" }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  </View>
                  <View className="p-1 items-center">
                    <Text className="text-[10px] font-bold text-primary" numberOfLines={1}>
                      {atracao.nome.toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))}
              {atracoesExtras > 0 && (
                <View className="flex-1 bg-surface-container-high rounded-lg border border-primary-container/20 items-center justify-center">
                  <Text className="font-ticket-data text-ticket-data text-primary-container">+{atracoesExtras}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View className="px-margin-mobile flex-col pb-8 gap-2">
          <Text className="font-headline-md text-headline-md text-white">Localização</Text>
          <View className="bg-surface-container-high border border-primary-container/30 rounded-xl flex-row items-center py-4 px-4">
            <View className="flex-col flex-1 gap-1">
              <Text className="font-body-lg text-body-lg font-bold text-white">{evento.nomeLocal}</Text>
              <Text className="font-body-sm text-body-sm text-on-surface-variant">{evento.cidade}</Text>
              <TouchableOpacity onPress={comoChegar} className="self-start">
                <Text className="text-primary-container font-body-sm text-body-sm underline mt-1">Como Chegar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {cabecalho}

      <View
        className="absolute right-0 w-full px-margin-mobile flex-row justify-end z-50"
        pointerEvents="box-none"
        style={{ bottom: insets.bottom + MARGEM_INFERIOR_NAVBAR + ALTURA_NAVBAR + 12 }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push(`/lotes?eventoId=${evento.id}`)}
          className="rounded-full overflow-hidden"
          style={{ shadowColor: "#bc13fe", shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 }}
        >
          <LinearGradient
            colors={["#00eefa", "#bc13fe"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="py-3 px-6 flex-row items-center gap-3"
          >
            <MaterialIcons name="confirmation-number" size={18} color="#ffffff" />
            <Text className="text-white font-body-md font-bold">Ingressos</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}
