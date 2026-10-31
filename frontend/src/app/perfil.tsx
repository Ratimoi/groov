import { useCallback, useState } from "react";
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useUser } from "@/contexts/UserContext";
import { CabecalhoGroov } from "../components/CabecalhoGroov";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";
import { api } from "../utils/api";
import type { IngressoApi } from "../utils/compras";
import { formatarDataHora } from "../utils/evento";

const ROTULO_STATUS = { VALIDO: "VÁLIDO", USADO: "USADO", CANCELADO: "CANCELADO" } as const;

export default function Perfil() {
  const router = useRouter();
  const espacoNavBar = useEspacoNavBar();
  const { user, token, sair } = useUser();
  const [ingressos, setIngressos] = useState<IngressoApi[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setIngressos(await api<IngressoApi[]>("/ingressos", { token }));
      setErro(false);
    } catch (error) {
      console.error("Erro ao buscar ingressos:", error);
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }, [token]);

  // Recarrega ao voltar para a aba (por exemplo, depois de uma compra).
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  return (
    <View className="flex-1 bg-background">
      <CabecalhoGroov />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: espacoNavBar }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center gap-2">
          <View className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary-container bg-surface-container">
            {user?.avatarUrl && <Image source={{ uri: user.avatarUrl }} className="w-full h-full" />}
          </View>
          <Text className="font-headline-md text-headline-md text-on-surface">{user?.nome}</Text>
          <Text className="font-body-sm text-body-sm text-on-surface-variant">@{user?.username}</Text>
        </View>

        <Text className="font-headline-md text-headline-md text-on-surface mt-8 mb-3">Meus Ingressos</Text>

        {carregando && <ActivityIndicator color="#bc13fe" className="my-6" />}

        {erro && !carregando && (
          <View className="items-center gap-3 py-6">
            <Text className="font-body-md text-body-md text-on-surface text-center">Não foi possível carregar seus ingressos.</Text>
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

        {!carregando && !erro && ingressos.length === 0 && (
          <View className="items-center gap-3 py-6">
            <MaterialIcons name="confirmation-number" size={40} color="#504254" />
            <Text className="font-body-md text-body-md text-on-surface-variant text-center">
              Você ainda não tem ingressos. Escolha um evento e garanta o seu.
            </Text>
            <TouchableOpacity onPress={() => router.push("/")} className="bg-primary-container rounded-xl px-6 py-3">
              <Text className="font-label-caps text-label-caps text-white uppercase">Ver eventos</Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="gap-3">
          {ingressos.map((ingresso) => (
            <TouchableOpacity
              key={ingresso.id}
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: "/ingresso", params: { id: ingresso.id } })}
              className="flex-row items-center gap-3 bg-surface-container-low border border-white/10 rounded-xl p-3"
            >
              <View className="w-16 h-16 rounded-lg overflow-hidden bg-surface-container-high">
                {ingresso.evento.imagemUrl && (
                  <Image source={{ uri: ingresso.evento.imagemUrl }} className="w-full h-full" resizeMode="cover" />
                )}
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="font-body-md text-body-md font-bold text-white" numberOfLines={1}>
                  {ingresso.evento.titulo}
                </Text>
                <Text className="font-body-sm text-body-sm text-on-surface-variant" numberOfLines={1}>
                  {formatarDataHora(ingresso.evento.comecaEm)} • {ingresso.lote.nome}
                </Text>
                <Text
                  className={`font-label-caps text-[10px] ${ingresso.status === "VALIDO" ? "text-secondary-container" : "text-error"}`}
                >
                  {ROTULO_STATUS[ingresso.status]}
                </Text>
              </View>
              <MaterialIcons name="qr-code-2" size={28} color="#ebb2ff" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={sair}
          activeOpacity={0.8}
          className="mt-8 self-center flex-row items-center gap-2 px-6 py-3 rounded-full border border-primary-container/50 bg-primary-container/10"
        >
          <MaterialIcons name="logout" size={18} color="#ebb2ff" />
          <Text className="font-label-caps text-label-caps text-primary uppercase">Sair</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
