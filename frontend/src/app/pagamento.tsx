import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCarrinho } from "@/contexts/CarrinhoContext";
import { useUser } from "@/contexts/UserContext";
import { CabecalhoGroov } from "../components/CabecalhoGroov";
import { ALTURA_NAVBAR, MARGEM_INFERIOR_NAVBAR } from "../components/NavBar";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";
import { useLotesEvento } from "../hooks/useLotesEvento";
import { api, ApiError } from "../utils/api";
import type { CompraGrupoApi, PedidoApi } from "../utils/compras";
import { aceitaGrupo, calcularPedido, formatarReais } from "../utils/lote";

const METODOS = [
  { id: "PIX", rotulo: "Pix", detalhe: "Aprovação imediata", icone: "pix" },
  { id: "CREDITO", rotulo: "Cartão de crédito", detalhe: "Em 1x, sem juros", icone: "credit-card" },
  { id: "DEBITO", rotulo: "Cartão de débito", detalhe: "Aprovação imediata", icone: "payments" },
] as const;

type MetodoId = (typeof METODOS)[number]["id"];

// Segunda etapa da compra: revisa o pedido, escolhe como pagar e conclui. O pagamento é simulado:
// nenhum dado de cartão é pedido nem cobrado, e a API só registra o pedido como pago.
export default function Pagamento() {
  const { eventoId } = useLocalSearchParams<{ eventoId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const espacoNavBar = useEspacoNavBar();
  const { user, token } = useUser();
  const { carrinho, gruposPorLote, atualizaQuantidade, escolherGrupo, definirResultado } = useCarrinho();
  const { lotes, tituloEvento, carregando, erro, tentarDeNovo } = useLotesEvento(eventoId);
  const [metodo, setMetodo] = useState<MetodoId>("PIX");
  const [processando, setProcessando] = useState(false);

  const voltar = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const pedido = calcularPedido(lotes, carrinho, gruposPorLote);
  const temItens = pedido.linhas.length > 0;

  // Vai item por item e, se algo falhar no meio, os itens já pagos saem do carrinho e o usuário é
  // avisado do que ficou pendente.
  const pagar = async () => {
    if (!user) return;
    setProcessando(true);
    const pedidos: PedidoApi[] = [];
    let compraGrupo: CompraGrupoApi | undefined;
    let nomeGrupo: string | undefined;

    try {
      for (const lote of lotes) {
        const quantidade = carrinho[lote.id] ?? 0;
        if (quantidade < 1) continue;
        pedidos.push(await api<PedidoApi>("/pedidos", { method: "POST", token, body: { loteId: lote.id, quantidade } }));
        atualizaQuantidade(lote.id, 0);
      }

      for (const lote of lotes.filter(aceitaGrupo)) {
        const grupo = gruposPorLote[lote.id];
        if (!grupo) continue;
        const membros = await api<{ usuarioId: string }[]>(`/grupos/${grupo.id}/members`, { token });
        const participantesIds = membros.map((membro) => membro.usuarioId).filter((id) => id !== user.id);
        const criada = await api<CompraGrupoApi>("/grupos/compras", {
          method: "POST",
          token,
          body: { grupoId: grupo.id, loteId: lote.id, participantesIds },
        });
        compraGrupo = await api<CompraGrupoApi>(`/grupos/compras/${criada.id}/pagar`, { method: "POST", token });
        nomeGrupo = grupo.nome;
        escolherGrupo(lote.id, null);
      }

      definirResultado({ pedidos, compraGrupo, nomeGrupo, metodo: METODOS.find((item) => item.id === metodo)?.rotulo });
      router.replace("/pagamento-confirmado");
    } catch (error) {
      const motivo = error instanceof ApiError ? error.message : "Tente de novo.";
      const jaPagos = pedidos.length > 0 ? " Os ingressos que já foram pagos estão no seu Perfil." : "";
      Alert.alert("Não foi possível concluir a compra", `${motivo}${jaPagos}`);
    } finally {
      setProcessando(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <CabecalhoGroov esquerda={{ icone: "arrow-back", onPress: voltar, rotulo: "Voltar" }} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: espacoNavBar + 72 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-headline-lg-mobile text-headline-lg-mobile text-white">Pagamento</Text>
        {!!tituloEvento && <Text className="font-body-md text-body-md text-on-surface-variant mt-1">{tituloEvento}</Text>}

        {carregando && <ActivityIndicator color="#bc13fe" className="my-10" />}

        {erro && !carregando && (
          <View className="items-center gap-3 py-10">
            <Text className="font-body-md text-body-md text-on-surface text-center">Não foi possível carregar o pedido.</Text>
            <TouchableOpacity onPress={tentarDeNovo} className="px-5 py-2 rounded-full border border-primary-container">
              <Text className="font-label-caps text-label-caps text-primary uppercase">Tentar de novo</Text>
            </TouchableOpacity>
          </View>
        )}

        {!carregando && !erro && !temItens && (
          <View className="items-center gap-3 py-10">
            <Text className="font-body-md text-body-md text-on-surface-variant text-center">Seu pedido está vazio.</Text>
            <TouchableOpacity onPress={voltar} className="px-5 py-2 rounded-full border border-primary-container">
              <Text className="font-label-caps text-label-caps text-primary uppercase">Escolher ingressos</Text>
            </TouchableOpacity>
          </View>
        )}

        {!carregando && !erro && temItens && (
          <>
            <View className="bg-surface-container-low border border-white/10 rounded-xl p-gutter mt-6">
              <Text className="font-headline-md text-headline-md text-white mb-stack-md">Resumo do Pedido</Text>
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
              <View className="flex-row justify-between items-center">
                <Text className="font-headline-md text-headline-md text-white">Total</Text>
                <Text className="font-ticket-data text-secondary-container" style={{ fontSize: 22 }}>
                  {formatarReais(pedido.total)}
                </Text>
              </View>
            </View>

            <Text className="font-headline-md text-headline-md text-white mt-8 mb-3">Método de Pagamento</Text>
            <View className="gap-3">
              {METODOS.map((item) => {
                const ativo = item.id === metodo;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.8}
                    onPress={() => setMetodo(item.id)}
                    className={`flex-row items-center gap-3 rounded-xl p-4 bg-surface-container-low ${
                      ativo ? "border-2 border-primary-container" : "border border-white/10"
                    }`}
                  >
                    <MaterialIcons name={item.icone} size={24} color={ativo ? "#bc13fe" : "#9d8ba0"} />
                    <View className="flex-1">
                      <Text className="font-body-md text-body-md font-bold text-white">{item.rotulo}</Text>
                      <Text className="font-body-sm text-body-sm text-on-surface-variant">{item.detalhe}</Text>
                    </View>
                    <MaterialIcons name={ativo ? "radio-button-checked" : "radio-button-unchecked"} size={22} color={ativo ? "#bc13fe" : "#9d8ba0"} />
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="flex-row items-center gap-2 mt-4">
              <MaterialIcons name="science" size={14} color="#9d8ba0" />
              <Text className="flex-1 font-body-sm text-[12px] text-on-surface-variant">
                Pagamento simulado: nenhum dado de cartão é pedido e nada é cobrado de verdade.
              </Text>
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
          disabled={!temItens || processando}
          onPress={pagar}
          className="rounded-full overflow-hidden"
          style={{ opacity: temItens && !processando ? 1 : 0.5, shadowColor: "#bc13fe", shadowOpacity: 0.5, shadowRadius: 16, elevation: temItens ? 10 : 0 }}
        >
          <View className="bg-primary-container px-8 py-3 flex-row items-center gap-2">
            {processando ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text className="text-white font-headline-md text-[18px]">Pagar {temItens ? formatarReais(pedido.total) : ""}</Text>
                <MaterialIcons name="lock" size={20} color="#ffffff" />
              </>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
