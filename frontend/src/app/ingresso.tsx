import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "@/contexts/UserContext";
import { CabecalhoGroov } from "../components/CabecalhoGroov";
import { QrCode } from "../components/QrCode";
import { TransferirIngresso } from "../components/TransferirIngresso";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";
import { api } from "../utils/api";
import { formatarCodigo, type IngressoApi } from "../utils/compras";
import { formatarIntervalo } from "../utils/evento";

const mesmoDia = (data: string) => new Date(data).toDateString() === new Date().toDateString();

function Dado({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <View className="flex-1">
      <Text className="font-label-caps text-[10px] text-on-surface-variant uppercase">{rotulo}</Text>
      <Text className="font-body-md text-body-md font-bold text-white mt-0.5" numberOfLines={2}>
        {valor}
      </Text>
      {!!detalhe && (
        <Text className="font-body-sm text-[11px] text-on-surface-variant" numberOfLines={1}>
          {detalhe}
        </Text>
      )}
    </View>
  );
}

export default function Ingresso() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useUser();
  const espacoNavBar = useEspacoNavBar();
  const [ingresso, setIngresso] = useState<IngressoApi>();
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let cancelado = false;
    async function buscaDados() {
      try {
        const dados = await api<IngressoApi>(`/ingressos/${id}`, { token });
        if (!cancelado) setIngresso(dados);
      } catch (error) {
        console.error("Erro ao buscar ingresso:", error);
        if (!cancelado) setErro(true);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }
    buscaDados();
    return () => {
      cancelado = true;
    };
  }, [id, token]);

  const voltar = () => (router.canGoBack() ? router.back() : router.replace("/perfil"));
  const comoChegar = () => {
    const destino = encodeURIComponent([ingresso?.evento.nomeLocal, ingresso?.evento.cidade].filter(Boolean).join(", "));
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${destino}`);
  };

  const valido = ingresso?.status === "VALIDO";
  const rotuloStatus = ingresso?.status === "USADO" ? "Ingresso já utilizado" : ingresso?.status === "CANCELADO" ? "Ingresso cancelado" : "Passe Ativo • Válido";
  const corStatus = valido ? "#10b981" : "#ffb4ab";

  return (
    <View className="flex-1 bg-background">
      <CabecalhoGroov esquerda={{ icone: "arrow-back", onPress: voltar, rotulo: "Voltar" }} />

      {carregando && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#bc13fe" />
        </View>
      )}

      {!carregando && (erro || !ingresso) && (
        <View className="flex-1 items-center justify-center px-margin-mobile gap-3">
          <Text className="font-body-md text-body-md text-on-surface text-center">Não foi possível abrir este ingresso.</Text>
          <TouchableOpacity onPress={voltar} className="px-5 py-2 rounded-full border border-primary-container">
            <Text className="font-label-caps text-label-caps text-primary uppercase">Voltar</Text>
          </TouchableOpacity>
        </View>
      )}

      {!carregando && ingresso && (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: espacoNavBar }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row items-center gap-2 mb-3">
            <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: corStatus }} />
            <Text className="font-body-sm text-body-sm font-bold" style={{ color: corStatus }}>
              {rotuloStatus}
            </Text>
          </View>

          <View className="bg-surface-container-low border border-white/10 rounded-3xl overflow-hidden">
            <View className="h-44 bg-surface-container-high">
              {ingresso.evento.imagemUrl && (
                <Image source={{ uri: ingresso.evento.imagemUrl }} className="w-full h-full" resizeMode="cover" />
              )}
              {mesmoDia(ingresso.evento.comecaEm) && (
                <View className="absolute right-3 top-3 px-3 py-1 rounded-full bg-black/70 border border-glass-border">
                  <Text className="font-label-caps text-label-caps text-white">• HOJE</Text>
                </View>
              )}
            </View>

            <View className="p-5">
              <Text className="font-headline-md text-headline-md text-white">{ingresso.evento.titulo}</Text>
              <View className="flex-row items-center gap-2 mt-1">
                <MaterialIcons name="calendar-today" size={14} color="#ff6ec7" />
                <Text className="font-body-sm text-body-sm text-on-surface-variant">
                  {formatarIntervalo(ingresso.evento.comecaEm, ingresso.evento.terminaEm)}
                </Text>
              </View>

              <View className="items-center mt-6">
                <View className="bg-white rounded-2xl p-3" style={{ opacity: valido ? 1 : 0.35 }}>
                  <QrCode valor={ingresso.codigoQr} tamanho={190} />
                </View>
                <Text className="font-label-caps text-label-caps text-on-surface-variant mt-5">CÓDIGO DE ENTRADA</Text>
                <Text className="font-ticket-data text-primary-container mt-1" style={{ fontSize: 20 }} selectable>
                  {formatarCodigo(ingresso.codigoQr)}
                </Text>
                <Text className="font-body-sm text-[11px] text-on-surface-variant text-center mt-1">
                  Apresente este código ou o QR code na catraca de entrada
                </Text>
              </View>

              <View className="border-t border-white/10 mt-5 pt-4 gap-4">
                <View className="flex-row gap-4">
                  <Dado rotulo="Local" valor={ingresso.evento.nomeLocal ?? "-"} detalhe={ingresso.evento.cidade} />
                  <Dado rotulo="Tipo / Setor" valor={ingresso.lote.nome} />
                </View>
                <Dado rotulo="Titular" valor={ingresso.dono.nome} detalhe={`@${ingresso.dono.username}`} />
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={comoChegar}
            className="mt-4 flex-row items-center justify-center gap-2 rounded-xl border border-white/15 bg-surface-container-low py-3.5"
          >
            <MaterialIcons name="place" size={18} color="#00eefa" />
            <Text className="font-body-md text-body-md font-bold text-white">Como Chegar</Text>
          </TouchableOpacity>

          {valido && <TransferirIngresso ingresso={ingresso} aoTransferir={() => router.replace("/perfil")} />}
        </ScrollView>
      )}
    </View>
  );
}
