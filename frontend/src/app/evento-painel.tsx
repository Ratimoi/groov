import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "@/contexts/UserContext";
import { CabecalhoGroov } from "../components/CabecalhoGroov";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";
import { api, ApiError } from "../utils/api";
import { ROTULO_FUNCAO, type DashboardApi } from "../utils/equipe";
import { formatarDataHora, formatarPreco } from "../utils/evento";

function Numero({ rotulo, valor, cor = "#ffffff" }: { rotulo: string; valor: number | string; cor?: string }) {
  return (
    <View className="flex-1 bg-surface-container-low border border-white/10 rounded-xl p-3 items-center">
      <Text className="font-ticket-data" style={{ fontSize: 22, color: cor }}>
        {valor}
      </Text>
      <Text className="font-label-caps text-[10px] text-on-surface-variant mt-1 text-center">{rotulo}</Text>
    </View>
  );
}

const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

// Painel de UM evento: só quem é da equipe dele chega aqui. O porteiro vê as entradas, mas não o dinheiro.
export default function EventoPainel() {
  const router = useRouter();
  const espacoNavBar = useEspacoNavBar();
  const { token } = useUser();
  const { eventoId } = useLocalSearchParams<{ eventoId?: string }>();
  const [painel, setPainel] = useState<DashboardApi | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    if (!eventoId) return;
    try {
      setPainel(await api<DashboardApi>(`/eventos/${eventoId}/dashboard`, { token }));
      setErro("");
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível carregar o painel.");
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
  const maiorHora = Math.max(1, ...(painel?.entradasPorHora.map((item) => item.total) ?? [1]));

  return (
    <View className="flex-1 bg-background">
      <CabecalhoGroov esquerda={{ icone: "arrow-back", onPress: voltar, rotulo: "Voltar" }} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: espacoNavBar, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {carregando && <ActivityIndicator color="#bc13fe" className="my-6" />}

        {!!erro && !carregando && (
          <View className="items-center gap-3 py-6">
            <Text className="font-body-md text-body-md text-on-surface text-center">{erro}</Text>
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

        {painel && (
          <>
            <View className="gap-1">
              <Text className="font-headline-md text-headline-md text-on-surface">{painel.evento.titulo}</Text>
              <Text className="font-body-sm text-body-sm text-on-surface-variant">
                {formatarDataHora(painel.evento.comecaEm)} • você é {ROTULO_FUNCAO[painel.funcao].toLowerCase()}
              </Text>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() =>
                  router.push({ pathname: "/escanear", params: { eventoId: painel.evento.id, titulo: painel.evento.titulo } })
                }
                activeOpacity={0.8}
                className="flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-xl bg-primary-container"
              >
                <MaterialIcons name="qr-code-scanner" size={20} color="#ffffff" />
                <Text className="font-label-caps text-label-caps text-white uppercase">Ler QR code</Text>
              </TouchableOpacity>

              {painel.funcao === "DONO" && (
                <TouchableOpacity
                  onPress={() =>
                    router.push({ pathname: "/equipe-evento", params: { eventoId: painel.evento.id, titulo: painel.evento.titulo } })
                  }
                  activeOpacity={0.8}
                  className="flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-xl border border-primary-container/60 bg-primary-container/10"
                >
                  <MaterialIcons name="groups" size={20} color="#ebb2ff" />
                  <Text className="font-label-caps text-label-caps text-primary uppercase">Equipe</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text className="font-label-caps text-label-caps text-on-surface-variant">INGRESSOS</Text>
            <View className="flex-row gap-3">
              <Numero rotulo="EMITIDOS" valor={painel.ingressos.emitidos} />
              <Numero rotulo="JÁ ENTRARAM" valor={painel.ingressos.entraram} cor="#10b981" />
              <Numero rotulo="AGUARDANDO" valor={painel.ingressos.aguardando} cor="#00eefa" />
            </View>
            {painel.ingressos.cancelados > 0 && (
              <Text className="font-body-sm text-body-sm text-on-surface-variant">
                {painel.ingressos.cancelados} cancelado(s)
              </Text>
            )}

            {painel.receita !== undefined && (
              <View className="bg-surface-container-low border border-white/10 rounded-xl p-4">
                <Text className="font-label-caps text-[10px] text-on-surface-variant">RECEITA (PEDIDOS PAGOS)</Text>
                <Text className="font-ticket-data text-primary-container mt-1" style={{ fontSize: 24 }}>
                  {formatarPreco(painel.receita)}
                </Text>
              </View>
            )}

            <Text className="font-label-caps text-label-caps text-on-surface-variant">LEITURAS NA PORTARIA</Text>
            <View className="flex-row gap-3">
              <Numero rotulo="LIBERADAS" valor={painel.tentativas.liberadas} cor="#10b981" />
              <Numero rotulo="JÁ USADOS" valor={painel.tentativas.jaUtilizados} cor="#f59e0b" />
              <Numero rotulo="INVÁLIDAS" valor={painel.tentativas.invalidas} cor="#ef4444" />
            </View>

            {painel.entradasPorHora.length > 0 && (
              <>
                <Text className="font-label-caps text-label-caps text-on-surface-variant">ENTRADAS POR HORA</Text>
                <View className="gap-2">
                  {painel.entradasPorHora.map((item) => (
                    <View key={item.hora} className="flex-row items-center gap-3">
                      <Text className="w-12 font-body-sm text-body-sm text-on-surface-variant">{hora(item.hora)}</Text>
                      <View className="flex-1 h-3 rounded-full bg-surface-container overflow-hidden">
                        <View
                          className="h-3 rounded-full bg-primary-container"
                          style={{ width: `${Math.round((item.total / maiorHora) * 100)}%` }}
                        />
                      </View>
                      <Text className="w-8 text-right font-body-sm text-body-sm text-white">{item.total}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            <Text className="font-label-caps text-label-caps text-on-surface-variant">LOTES</Text>
            <View className="gap-3">
              {painel.lotes.length === 0 && (
                <Text className="font-body-sm text-body-sm text-on-surface-variant">Este evento ainda não tem lotes.</Text>
              )}
              {painel.lotes.map((lote) => {
                const ocupados = lote.vendidos + lote.reservados;
                const percentual = lote.quantidade > 0 ? Math.min(100, Math.round((ocupados / lote.quantidade) * 100)) : 0;
                return (
                  <View key={lote.id} className="bg-surface-container-low border border-white/10 rounded-xl p-4 gap-2">
                    <View className="flex-row items-center justify-between">
                      <Text className="font-body-md text-body-md font-bold text-white">{lote.nome}</Text>
                      {lote.preco !== undefined && (
                        <Text className="font-body-sm text-body-sm text-on-surface-variant">{formatarPreco(lote.preco)}</Text>
                      )}
                    </View>
                    <View className="h-2 rounded-full bg-surface-container overflow-hidden">
                      <View className="h-2 rounded-full bg-primary-container" style={{ width: `${percentual}%` }} />
                    </View>
                    <Text className="font-body-sm text-body-sm text-on-surface-variant">
                      {lote.vendidos} vendidos • {lote.reservados} reservados • {lote.disponiveis} disponíveis de {lote.quantidade}
                    </Text>
                  </View>
                );
              })}
            </View>

            {painel.ultimasEntradas.length > 0 && (
              <>
                <Text className="font-label-caps text-label-caps text-on-surface-variant">ÚLTIMAS ENTRADAS</Text>
                <View className="gap-2">
                  {painel.ultimasEntradas.map((entrada) => (
                    <View key={entrada.ingressoId} className="flex-row items-center justify-between">
                      <Text className="flex-1 font-body-sm text-body-sm text-white" numberOfLines={1}>
                        {entrada.dono} • {entrada.lote}
                      </Text>
                      <Text className="font-body-sm text-body-sm text-on-surface-variant">{hora(entrada.usadoEm)}</Text>
                    </View>
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
