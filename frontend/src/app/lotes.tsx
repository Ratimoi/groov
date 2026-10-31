import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Share, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCarrinho } from "@/contexts/CarrinhoContext";
import { CabecalhoGroov } from "../components/CabecalhoGroov";
import { CardLote, CardPacoteGrupo } from "../components/CardLote";
import { ALTURA_NAVBAR, MARGEM_INFERIOR_NAVBAR } from "../components/NavBar";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";
import { aceitaGrupo, calcularPedido, formatarReais, type LoteVenda } from "../utils/lote";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

export default function Lotes() {
  const { eventoId } = useLocalSearchParams<{ eventoId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const espacoNavBar = useEspacoNavBar();
  const { carrinho, gruposPorLote } = useCarrinho();
  const [lotes, setLotes] = useState<LoteVenda[]>([]);
  const [tituloEvento, setTituloEvento] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let cancelado = false;
    async function buscaDados() {
      try {
        const [respostaLotes, respostaEvento] = await Promise.all([
          fetch(`${apiUrl}/eventos/${eventoId}/lotes`),
          fetch(`${apiUrl}/eventos/${eventoId}`),
        ]);
        if (!respostaLotes.ok) throw new Error(`HTTP ${respostaLotes.status}`);
        const dadosLotes = await respostaLotes.json();
        const dadosEvento = respostaEvento.ok ? await respostaEvento.json() : null;
        if (!cancelado) {
          setLotes(Array.isArray(dadosLotes) ? dadosLotes : []);
          setTituloEvento(dadosEvento?.titulo ?? "");
        }
      } catch (error) {
        console.error("Erro ao buscar lotes:", error);
        if (!cancelado) setErro(true);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }
    buscaDados();
    return () => {
      cancelado = true;
    };
  }, [eventoId, tentativa]);

  const tentarDeNovo = () => {
    setCarregando(true);
    setErro(false);
    setTentativa((valor) => valor + 1);
  };

  const voltar = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const pedido = calcularPedido(lotes, carrinho, gruposPorLote);
  const temItens = pedido.linhas.length > 0;
  const lotesDeGrupo = lotes.filter(aceitaGrupo);

  const avancar = () => {
    // O pagamento entra na etapa 4; por enquanto o pedido só é montado e conferido.
    Alert.alert("Pedido montado", `Total de ${formatarReais(pedido.total)}. O pagamento será liberado em breve.`);
  };

  return (
    <View className="flex-1 bg-background">
      <CabecalhoGroov
        esquerda={{ icone: "arrow-back", onPress: voltar, rotulo: "Voltar" }}
        direita={{
          icone: "share",
          onPress: () => Share.share({ message: `Ingressos para ${tituloEvento}` }),
          rotulo: "Compartilhar",
        }}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: espacoNavBar + 72 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-stack-lg">
          <Text className="font-headline-lg-mobile text-headline-lg-mobile text-white">Selecionar Ingressos</Text>
          {!!tituloEvento && (
            <Text className="font-body-md text-body-md text-on-surface-variant mt-1">{tituloEvento}</Text>
          )}
        </View>

        {carregando && <ActivityIndicator color="#bc13fe" className="my-10" />}

        {erro && !carregando && (
          <View className="items-center gap-3 py-10">
            <Text className="font-body-md text-body-md text-on-surface text-center">
              Não foi possível carregar os ingressos.
            </Text>
            <TouchableOpacity onPress={tentarDeNovo} className="px-5 py-2 rounded-full border border-primary-container">
              <Text className="font-label-caps text-label-caps text-primary uppercase">Tentar de novo</Text>
            </TouchableOpacity>
          </View>
        )}

        {!carregando && !erro && lotes.length === 0 && (
          <Text className="font-body-md text-body-md text-on-surface-variant text-center my-10">
            Este evento ainda não tem ingressos à venda.
          </Text>
        )}

        {!carregando && !erro && lotes.length > 0 && (
          <>
            <View className="flex-col gap-6 mb-8">
              {lotesDeGrupo.map((lote) => (
                <CardPacoteGrupo data={lote} key={`grupo-${lote.id}`} />
              ))}
              {lotes.map((lote) => (
                <CardLote data={lote} key={lote.id} />
              ))}
            </View>

            <View className="bg-surface-container-low/90 border border-white/10 rounded-xl p-gutter overflow-hidden">
              <LinearGradient
                colors={["rgba(0,238,250,0.05)", "rgba(188,19,254,0.1)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="absolute inset-0"
              />
              <Text className="font-headline-md text-headline-md text-white mb-stack-md">Resumo do Pedido</Text>

              {temItens ? (
                <View className="border-b border-white/10 pb-stack-md mb-stack-md gap-2">
                  {pedido.linhas.map((linha) => (
                    <View key={linha.chave} className="flex-row justify-between items-center">
                      <Text className="flex-1 font-body-sm text-body-sm text-white/90 pr-3">{linha.descricao}</Text>
                      <Text className="font-body-sm text-body-sm text-white">{formatarReais(linha.valor)}</Text>
                    </View>
                  ))}
                  <View className="flex-row justify-between items-center">
                    <Text className="font-body-sm text-body-sm text-white/90">Taxas de Serviço</Text>
                    <Text className="font-body-sm text-body-sm text-white">{formatarReais(pedido.taxa)}</Text>
                  </View>
                </View>
              ) : (
                <Text className="font-body-sm text-body-sm text-on-surface-variant mb-stack-md">
                  Escolha a quantidade de ingressos ou um pacote de grupo.
                </Text>
              )}

              <View className="flex-row justify-between items-center">
                <Text className="font-headline-md text-headline-md text-white">Total</Text>
                <Text className="font-ticket-data text-secondary-container" style={{ fontSize: 22 }}>
                  {formatarReais(pedido.total)}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <View
        className="absolute right-0 w-full px-margin-mobile flex-row justify-end z-50"
        pointerEvents="box-none"
        style={{ bottom: insets.bottom + MARGEM_INFERIOR_NAVBAR + ALTURA_NAVBAR + 12 }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={!temItens}
          onPress={avancar}
          className="rounded-full overflow-hidden"
          style={{ opacity: temItens ? 1 : 0.5, shadowColor: "#bc13fe", shadowOpacity: 0.5, shadowRadius: 16, elevation: temItens ? 10 : 0 }}
        >
          <LinearGradient
            colors={["#00eefa", "#bc13fe"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="px-8 py-3 flex-row items-center gap-2"
          >
            <Text className="text-white font-headline-md text-[18px]">Avançar</Text>
            <MaterialIcons name="arrow-forward" size={22} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}
