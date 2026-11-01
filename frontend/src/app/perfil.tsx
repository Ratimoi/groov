import { useCallback, useState } from "react";
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useUser } from "@/contexts/UserContext";
import { CabecalhoGroov } from "../components/CabecalhoGroov";
import { QrCode } from "../components/QrCode";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";
import { api } from "../utils/api";
import { formatarCodigo, type IngressoApi } from "../utils/compras";
import { formatarDataHora } from "../utils/evento";

const ROTULO_STATUS = { VALIDO: "VÁLIDO", USADO: "USADO", CANCELADO: "CANCELADO" } as const;
type Aba = "perfil" | "ingressos";

const ehHoje = (data: string) => new Date(data).toDateString() === new Date().toDateString();

function CardIngresso({ ingresso, aoAbrir }: { ingresso: IngressoApi; aoAbrir: () => void }) {
  const valido = ingresso.status === "VALIDO";
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={aoAbrir}
      className="bg-surface-container-low border border-white/10 rounded-2xl overflow-hidden"
    >
      <View className="h-40 bg-surface-container-high justify-end">
        {ingresso.evento.imagemUrl && (
          <Image source={{ uri: ingresso.evento.imagemUrl }} className="absolute inset-0 w-full h-full" resizeMode="cover" />
        )}
        <View className="absolute inset-0 bg-black/45" />
        {valido && ehHoje(ingresso.evento.comecaEm) && (
          <View className="absolute right-3 top-3 px-3 py-1 rounded-full bg-black/70 border border-glass-border">
            <Text className="font-label-caps text-label-caps text-white">• HOJE</Text>
          </View>
        )}
        {!valido && (
          <View className="absolute right-3 top-3 px-3 py-1 rounded-full bg-black/70 border border-error/60">
            <Text className="font-label-caps text-label-caps text-error">{ROTULO_STATUS[ingresso.status]}</Text>
          </View>
        )}
        <View className="p-4">
          <Text className="font-body-md text-body-md font-bold text-white" numberOfLines={2}>
            {ingresso.evento.titulo}
          </Text>
          <Text className="font-body-sm text-body-sm text-on-surface-variant mt-0.5" numberOfLines={1}>
            {formatarDataHora(ingresso.evento.comecaEm)} • {ingresso.lote.nome}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between p-4 border-t border-dashed border-white/20">
        <View className="flex-1 pr-3">
          <Text className="font-label-caps text-[10px] text-on-surface-variant">CÓDIGO DE ENTRADA</Text>
          <Text className="font-ticket-data text-primary-container mt-1" style={{ fontSize: 17 }} numberOfLines={1}>
            {formatarCodigo(ingresso.codigoQr)}
          </Text>
        </View>
        <View className="bg-white rounded-lg p-1" style={{ opacity: valido ? 1 : 0.35 }}>
          <QrCode valor={ingresso.codigoQr} tamanho={56} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function Perfil() {
  const router = useRouter();
  const espacoNavBar = useEspacoNavBar();
  const { user, token, sair } = useUser();
  const [aba, setAba] = useState<Aba>("perfil");
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

  // Recarrega ao voltar para a aba (por exemplo, depois de uma compra ou transferência).
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const proximos = ingressos.filter((ingresso) => ingresso.status === "VALIDO");
  const anteriores = ingressos.filter((ingresso) => ingresso.status !== "VALIDO");
  const abrir = (ingresso: IngressoApi) => router.push({ pathname: "/ingresso", params: { id: ingresso.id } });

  const abas: { id: Aba; rotulo: string }[] = [
    { id: "perfil", rotulo: "Perfil" },
    { id: "ingressos", rotulo: "Ingressos" },
  ];

  return (
    <View className="flex-1 bg-background">
      <CabecalhoGroov />
      <View className="flex-row gap-6 px-5 pt-4 border-b border-white/10">
        {abas.map((item) => {
          const ativa = item.id === aba;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => setAba(item.id)}
              className="pb-3"
              style={{ borderBottomWidth: 2, borderBottomColor: ativa ? "#bc13fe" : "transparent" }}
            >
              <Text className={`font-body-md text-body-md ${ativa ? "text-primary-container font-bold" : "text-on-surface-variant"}`}>
                {item.rotulo}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: espacoNavBar }}
        showsVerticalScrollIndicator={false}
      >
        {aba === "perfil" && (
          <>
            <View className="items-center gap-2">
              <View className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary-container bg-surface-container">
                {user?.avatarUrl && <Image source={{ uri: user.avatarUrl }} className="w-full h-full" />}
              </View>
              <Text className="font-headline-md text-headline-md text-on-surface">{user?.nome}</Text>
              <Text className="font-body-sm text-body-sm text-on-surface-variant">@{user?.username}</Text>
            </View>

            <TouchableOpacity
              onPress={() => setAba("ingressos")}
              activeOpacity={0.8}
              className="mt-8 flex-row items-center justify-between bg-surface-container-low border border-white/10 rounded-xl p-4"
            >
              <View className="flex-row items-center gap-3">
                <MaterialIcons name="confirmation-number" size={22} color="#ebb2ff" />
                <Text className="font-body-md text-body-md font-bold text-white">Meus Ingressos</Text>
              </View>
              <Text className="font-ticket-data text-primary">{carregando ? "…" : proximos.length}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/meus-dados")}
              activeOpacity={0.8}
              className="mt-3 flex-row items-center justify-between bg-surface-container-low border border-white/10 rounded-xl p-4"
            >
              <View className="flex-row items-center gap-3">
                <MaterialIcons name="manage-accounts" size={22} color="#ebb2ff" />
                <Text className="font-body-md text-body-md font-bold text-white">Meus Dados</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#9d8ba0" />
            </TouchableOpacity>

            {user?.papel === "ADMIN" && (
              <TouchableOpacity
                onPress={() => router.push("/escanear")}
                activeOpacity={0.8}
                className="mt-6 self-center flex-row items-center gap-2 px-6 py-3 rounded-xl bg-primary-container"
              >
                <MaterialIcons name="qr-code-scanner" size={20} color="#ffffff" />
                <Text className="font-label-caps text-label-caps text-white uppercase">Validar ingressos</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={sair}
              activeOpacity={0.8}
              className="mt-6 self-center flex-row items-center gap-2 px-6 py-3 rounded-full border border-primary-container/50 bg-primary-container/10"
            >
              <MaterialIcons name="logout" size={18} color="#ebb2ff" />
              <Text className="font-label-caps text-label-caps text-primary uppercase">Sair</Text>
            </TouchableOpacity>
          </>
        )}

        {aba === "ingressos" && (
          <>
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

            {proximos.length > 0 && (
              <>
                <Text className="font-label-caps text-label-caps text-on-surface-variant mb-3">PRÓXIMOS EVENTOS</Text>
                <View className="gap-4">
                  {proximos.map((ingresso) => (
                    <CardIngresso key={ingresso.id} ingresso={ingresso} aoAbrir={() => abrir(ingresso)} />
                  ))}
                </View>
              </>
            )}

            {anteriores.length > 0 && (
              <>
                <Text className="font-label-caps text-label-caps text-on-surface-variant mt-8 mb-3">UTILIZADOS E CANCELADOS</Text>
                <View className="gap-4">
                  {anteriores.map((ingresso) => (
                    <CardIngresso key={ingresso.id} ingresso={ingresso} aoAbrir={() => abrir(ingresso)} />
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
