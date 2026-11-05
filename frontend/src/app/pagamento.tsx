import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { FontAwesome6, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCarrinho } from "@/contexts/CarrinhoContext";
import { useUser } from "@/contexts/UserContext";
import { ALTURA_NAVBAR, MARGEM_INFERIOR_NAVBAR } from "../components/NavBar";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";
import { useLotesEvento } from "../hooks/useLotesEvento";
import { api, ApiError } from "../utils/api";
import type { CompraGrupoApi, PedidoApi } from "../utils/compras";
import { aceitaGrupo, calcularPedido, formatarDesconto, formatarReais } from "../utils/lote";

const METODOS = [
  { id: "PIX", rotulo: "Pix", detalhe: "Aprovação imediata", icone: "pix" },
  { id: "CREDITO", rotulo: "Cartão de Crédito", detalhe: "Em até 10x sem juros", icone: "credit-card" },
  { id: "GPAY", rotulo: "Google Pay", detalhe: "Pague com o Google", icone: "google-pay" },
] as const;

type MetodoId = (typeof METODOS)[number]["id"];

// Altura do rodapé com o botão "Finalizar Compra", para o fim da lista não ficar atrás dele.
const ALTURA_RODAPE = 96;

function OpcaoPagamento({
  metodo,
  ativo,
  onPress,
}: {
  metodo: (typeof METODOS)[number];
  ativo: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: ativo }}
      accessibilityLabel={metodo.rotulo}
      className={`flex-row items-center justify-between p-4 rounded-xl ${
        ativo ? "bg-[#0d0c0c] border-2 border-primary-container/40" : "bg-surface-container border-2 border-transparent"
      }`}
      style={ativo ? { shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 2, shadowOffset: { width: 0, height: 4 }, elevation: 3 } : undefined}
    >
      <View className="flex-row items-center gap-[14px] flex-1">
        <View className="h-10 w-10 items-center justify-center bg-primary-container/10 rounded-lg">
          {/* O MaterialIcons não tem Google Pay; o FontAwesome6 tem a logo no estilo "brand". */}
          {metodo.icone === "google-pay" ? (
            <FontAwesome6 name="google-pay" brand size={20} color="#ebb2ff" />
          ) : (
            <MaterialIcons name={metodo.icone} size={20} color="#ebb2ff" />
          )}
        </View>
        <View className="flex-1 gap-1">
          <Text className="font-headline-md text-[16px] text-white">{metodo.rotulo}</Text>
          <Text className="font-body-md text-[13px] text-on-surface-variant">{metodo.detalhe}</Text>
        </View>
      </View>
      <View
        className={`h-[22px] w-[22px] rounded-full border-2 items-center justify-center ${
          ativo ? "bg-primary-container border-primary-container" : "border-white/[0.12]"
        }`}
      >
        {ativo && <MaterialIcons name="check" size={14} color="#ffffff" />}
      </View>
    </Pressable>
  );
}

// Segunda etapa da compra: revisa o pedido, escolhe como pagar e conclui. O pagamento é simulado:
// nenhum dado de cartão é pedido nem cobrado, e a API só registra o pedido como pago.
export default function Pagamento() {
  const { eventoId } = useLocalSearchParams<{ eventoId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const espacoNavBar = useEspacoNavBar();
  const { user, token } = useUser();
  const { carrinho, gruposPorLote, atualizaQuantidade, escolherGrupo, definirResultado } = useCarrinho();
  const { lotes, carregando, erro, tentarDeNovo } = useLotesEvento(eventoId);
  const [metodo, setMetodo] = useState<MetodoId>("PIX");
  const [processando, setProcessando] = useState(false);

  const voltar = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const pedido = calcularPedido(lotes, carrinho, gruposPorLote);
  const temItens = pedido.linhas.length > 0;
  const lotesComGrupo = lotes.filter((lote) => aceitaGrupo(lote) && gruposPorLote[lote.id]);
  const podePagar = temItens && !processando;

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
      <View
        className="flex-row items-center justify-between px-5 pb-4 bg-background/80 border-b border-white/[0.12]"
        style={{ paddingTop: insets.top + 16 }}
      >
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={voltar} accessibilityLabel="Voltar" hitSlop={10}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text className="font-headline-md text-[18px] text-white">Forma de Pagamento</Text>
        </View>
        <TouchableOpacity onPress={() => router.replace("/")} accessibilityLabel="Cancelar compra" hitSlop={10}>
          <MaterialIcons name="highlight-off" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: espacoNavBar + ALTURA_RODAPE, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {carregando && <ActivityIndicator color="#bc13fe" className="my-10" />}

        {erro && !carregando && (
          <View className="items-center gap-3 py-10">
            <Text className="font-body-md text-[15px] text-on-surface text-center">Não foi possível carregar o pedido.</Text>
            <TouchableOpacity onPress={tentarDeNovo} className="px-5 py-2 rounded-full border border-primary-container">
              <Text className="font-label-caps text-label-caps text-primary uppercase">Tentar de novo</Text>
            </TouchableOpacity>
          </View>
        )}

        {!carregando && !erro && !temItens && (
          <View className="items-center gap-3 py-10">
            <Text className="font-body-md text-[15px] text-on-surface-variant text-center">Seu pedido está vazio.</Text>
            <TouchableOpacity onPress={voltar} className="px-5 py-2 rounded-full border border-primary-container">
              <Text className="font-label-caps text-label-caps text-primary uppercase">Escolher ingressos</Text>
            </TouchableOpacity>
          </View>
        )}

        {!carregando && !erro && temItens && (
          <>
            <View className="bg-surface-container-low border border-white/[0.12] rounded-xl p-4 gap-3">
              <View className="flex-row items-center justify-between gap-3">
                <Text className="font-headline-md text-[14px] text-white/50 uppercase" style={{ letterSpacing: 0.5 }}>
                  Resumo do Pedido
                </Text>
                <View className="flex-1 items-end gap-1">
                  {lotesComGrupo.map((lote) => (
                    <View key={lote.id} className="flex-row items-center gap-1">
                      <MaterialIcons name="group" size={14} color="#ebb2ff" />
                      <Text className="shrink font-body-md text-[13px] text-primary" numberOfLines={1}>
                        {gruposPorLote[lote.id]?.nome} · {lote.tamanhoGrupo} pessoas
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
              {pedido.linhas.map((linha) => (
                <View key={linha.chave} className="flex-row justify-between items-start gap-3">
                  <Text className={`flex-1 font-body-md ${linha.desconto ? "text-[14px] text-secondary-container" : "text-[15px] text-white"}`}>
                    {linha.descricao}
                  </Text>
                  <Text className={`font-headline-md ${linha.desconto ? "text-[14px] text-secondary-container" : "text-[15px] text-white"}`}>
                    {linha.desconto ? formatarDesconto(linha.valor) : formatarReais(linha.valor)}
                  </Text>
                </View>
              ))}
              <View className="flex-row justify-between items-start gap-3">
                <Text className="flex-1 font-body-md text-[15px] text-white">Taxas de Serviço</Text>
                <Text className="font-headline-md text-[15px] text-white">{formatarReais(pedido.taxa)}</Text>
              </View>
              <View className="border-t border-white/[0.12]" />
              <View className="flex-row justify-between items-center">
                <Text className="font-headline-md text-[16px] text-white">Total a pagar</Text>
                <Text className="font-display-lg text-[20px] text-white">{formatarReais(pedido.total)}</Text>
              </View>
            </View>

            <View className="gap-[6px]">
              <Text className="font-headline-md text-[18px] text-white">Selecione o método de pagamento</Text>
              <Text className="font-body-md text-[14px] text-on-surface-variant">
                Todas as transações são seguras e criptografadas.
              </Text>
            </View>

            <View className="gap-6" accessibilityRole="radiogroup">
              {METODOS.map((item) => (
                <OpcaoPagamento key={item.id} metodo={item} ativo={item.id === metodo} onPress={() => setMetodo(item.id)} />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <View
        className="absolute inset-x-0 px-6 py-4 bg-background/95 z-50"
        style={{ bottom: insets.bottom + MARGEM_INFERIOR_NAVBAR + ALTURA_NAVBAR + 12 }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={!podePagar}
          onPress={pagar}
          accessibilityRole="button"
          accessibilityLabel="Finalizar Compra"
          className="rounded-xl overflow-hidden"
          style={{ opacity: podePagar ? 1 : 0.5, shadowColor: "#bc13fe", shadowOpacity: 0.4, shadowRadius: 8, elevation: podePagar ? 8 : 0 }}
        >
          <LinearGradient
            colors={["#00eefa", "#bc13fe"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="items-center justify-center px-5 py-[14px]"
          >
            {processando ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="font-headline-md text-[16px] leading-5 text-white">Finalizar Compra</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}
