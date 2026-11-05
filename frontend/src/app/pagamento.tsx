import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCarrinho } from "@/contexts/CarrinhoContext";
import { useUser } from "@/contexts/UserContext";
import { MetodosPagamento } from "../components/MetodosPagamento";
import { ALTURA_NAVBAR, MARGEM_INFERIOR_NAVBAR } from "../components/NavBar";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";
import { useLotesEvento } from "../hooks/useLotesEvento";
import { api, ApiError } from "../utils/api";
import type { CompraGrupoApi } from "../utils/compras";
import { definirEmAndamento, type MetodoPagamento, type PagamentoApi } from "../utils/pagamentos";
import { aceitaGrupo, calcularPedido, formatarDesconto, formatarReais, totalDoGrupo, type CoberturaGrupo } from "../utils/lote";

// Altura do rodapé com o botão "Finalizar Compra", para o fim da lista não ficar atrás dele.
const ALTURA_RODAPE = 96;

// Segunda etapa da compra: revisa o pedido, escolhe como pagar (Pix ou cartão) e segue para a espera
// da confirmação. Nenhum dado de cartão passa pelo app: o cartão é pago na página do Mercado Pago.
export default function Pagamento() {
  const { eventoId } = useLocalSearchParams<{ eventoId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const espacoNavBar = useEspacoNavBar();
  const { user, token } = useUser();
  const { carrinho, gruposPorLote, afiliado: afiliadoSalvo } = useCarrinho();
  // O código de promotor vale só para o evento em que foi conferido.
  const afiliado = afiliadoSalvo && afiliadoSalvo.eventoId === eventoId ? afiliadoSalvo : null;
  const { lotes, carregando, erro, tentarDeNovo } = useLotesEvento(eventoId);
  const [metodo, setMetodo] = useState<MetodoPagamento>("PIX");
  const [processando, setProcessando] = useState(false);
  const [coberturas, setCoberturas] = useState<Record<string, CoberturaGrupo>>({});

  const voltar = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const pedido = calcularPedido(lotes, carrinho, gruposPorLote, coberturas, afiliado?.desconto ?? 0);
  const temItens = pedido.linhas.length > 0;
  const lotesComGrupo = lotes.filter((lote) => aceitaGrupo(lote) && gruposPorLote[lote.id]);
  const podePagar = temItens && !processando;

  // Monta os itens (pedidos individuais e cotas de grupo) e cria um único pagamento. Os ingressos só
  // são emitidos quando o Mercado Pago aprova; o carrinho só é esvaziado nesse momento.
  const pagar = async () => {
    if (!user) return;
    setProcessando(true);

    try {
      const itens: object[] = [];
      for (const lote of lotes) {
        const quantidade = carrinho[lote.id] ?? 0;
        if (quantidade < 1) continue;
        itens.push({ tipo: "PEDIDO", loteId: lote.id, quantidade, ...(afiliado ? { codigoAfiliado: afiliado.codigo } : {}) });
      }

      let nomeGrupo: string | undefined;
      const pendentes = await api<CompraGrupoApi[]>("/grupos/compras", { token });
      for (const lote of lotes.filter(aceitaGrupo)) {
        const grupo = gruposPorLote[lote.id];
        if (!grupo) continue;
        // Numa nova tentativa a compra em grupo da tentativa anterior ainda está pendente: reaproveita.
        let compra = pendentes.find((c) => c.status === "PENDENTE" && c.lote.id === lote.id && c.grupoId === grupo.id);
        if (!compra) {
          const membros = await api<{ usuarioId: string }[]>(`/grupos/${grupo.id}/members`, { token });
          const participantesIds = membros.map((membro) => membro.usuarioId).filter((id) => id !== user.id);
          compra = await api<CompraGrupoApi>("/grupos/compras", {
            method: "POST",
            token,
            body: { grupoId: grupo.id, loteId: lote.id, participantesIds, ...(afiliado ? { codigoAfiliado: afiliado.codigo } : {}) },
          });
        }
        // "todos": quem iniciou a compra paga também a cota dos outros participantes.
        itens.push({ tipo: "COTA", compraId: compra.id, ...(coberturas[lote.id] === "todos" ? { todos: true } : {}) });
        nomeGrupo = grupo.nome;
      }

      const criado = await api<PagamentoApi>("/pagamentos", { method: "POST", token, body: { metodo, itens } });
      definirEmAndamento({ id: criado.id, lotesDoCarrinho: lotes.map((l) => l.id), nomeGrupo });
      router.replace({ pathname: "/aguardando-pagamento", params: { id: criado.id } });
    } catch (error) {
      Alert.alert("Não foi possível iniciar o pagamento", error instanceof ApiError ? error.message : "Tente de novo.");
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

            {lotesComGrupo.map((lote) => (
              <View key={`cobertura-${lote.id}`} className="gap-3">
                <Text className="font-headline-md text-[18px] text-white">Quem você vai pagar?</Text>
                <Text className="font-body-md text-[14px] text-on-surface-variant">
                  {lote.nome} · {gruposPorLote[lote.id]?.nome}
                </Text>
                <View className="gap-3" accessibilityRole="radiogroup">
                  {(["meu", "todos"] as const).map((opcao) => {
                    const ativo = (coberturas[lote.id] ?? "meu") === opcao;
                    const { pessoas, total } = totalDoGrupo(lote, opcao, afiliado?.desconto ?? 0);
                    return (
                      <Pressable
                        key={opcao}
                        onPress={() => setCoberturas((atual) => ({ ...atual, [lote.id]: opcao }))}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: ativo }}
                        className={`flex-row items-center justify-between p-4 rounded-xl ${
                          ativo ? "bg-[#0d0c0c] border-2 border-primary-container/40" : "bg-surface-container border-2 border-transparent"
                        }`}
                      >
                        <View className="flex-1 gap-1">
                          <Text className="font-headline-md text-[16px] text-white">
                            {opcao === "meu" ? "Só o meu ingresso" : `Todo o grupo (${pessoas} ingressos)`}
                          </Text>
                          <Text className="font-body-md text-[13px] text-on-surface-variant">
                            {opcao === "meu" ? "Cada pessoa paga a própria cota" : "Você paga a cota de todos e os ingressos saem na hora"}
                            {` · ${formatarReais(total)}`}
                          </Text>
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
                  })}
                </View>
              </View>
            ))}

            <View className="gap-[6px]">
              <Text className="font-headline-md text-[18px] text-white">Selecione o método de pagamento</Text>
              <Text className="font-body-md text-[14px] text-on-surface-variant">
                Todas as transações são seguras e criptografadas.
              </Text>
            </View>

            <MetodosPagamento valor={metodo} onChange={setMetodo} />
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
