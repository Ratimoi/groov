import { Image, ScrollView, Share, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCarrinho } from "@/contexts/CarrinhoContext";
import { useUser } from "@/contexts/UserContext";
import { CabecalhoGroov } from "../components/CabecalhoGroov";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";
import { formatarDataHora } from "../utils/evento";
import { arredondar, formatarReais, precoNoGrupo, TAXA_SERVICO } from "../utils/lote";

function Linha({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="font-body-md text-body-md text-on-surface-variant">{rotulo}</Text>
      <Text
        className={destaque ? "font-ticket-data text-secondary-container" : "font-ticket-data text-on-surface"}
        style={{ fontSize: destaque ? 18 : 14 }}
      >
        {valor}
      </Text>
    </View>
  );
}

export default function PagamentoConfirmado() {
  const router = useRouter();
  const { user } = useUser();
  const { resultado, definirResultado } = useCarrinho();
  const espacoNavBar = useEspacoNavBar();

  const sair = (destino: "/" | "/perfil" | "/grupos") => {
    definirResultado(null);
    router.replace(destino);
  };

  if (!resultado) {
    return (
      <View className="flex-1 bg-background">
        <CabecalhoGroov esquerda={{ icone: "arrow-back", onPress: () => router.replace("/"), rotulo: "Início" }} />
        <View className="flex-1 items-center justify-center px-margin-mobile gap-4">
          <Text className="font-body-md text-body-md text-on-surface-variant text-center">Nenhuma compra recente.</Text>
          <TouchableOpacity onPress={() => router.replace("/")} className="px-6 py-3 rounded-full border border-primary-container">
            <Text className="font-label-caps text-label-caps text-primary uppercase">Ver eventos</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { pedidos, compraGrupo, nomeGrupo, metodo } = resultado;
  const meuParticipante = compraGrupo?.participantes.find((participante) => participante.usuarioId === user?.id);
  const evento = pedidos[0]?.evento ?? compraGrupo?.lote.evento;

  // Cota do grupo: preço do lote com desconto mais a taxa, igual ao que o backend cobrou.
  const cotaGrupo = compraGrupo
    ? (() => {
        const cota = precoNoGrupo({ ...compraGrupo.lote, quantidade: 0 });
        return arredondar(cota + arredondar(cota * TAXA_SERVICO));
      })()
    : 0;
  const totalPedidos = pedidos.reduce((soma, pedido) => soma + Number(pedido.valor), 0);
  const totalPago = arredondar(totalPedidos + cotaGrupo);

  const pagos = compraGrupo?.participantes.filter((participante) => participante.status === "PAGO").length ?? 0;
  const totalGrupo = compraGrupo?.participantes.length ?? 0;
  const grupoConfirmado = compraGrupo?.status === "CONFIRMADA";
  const pedidoReferencia = pedidos[0]?.id ?? meuParticipante?.pedidoId ?? "";
  const pendentes = compraGrupo?.participantes.filter((participante) => participante.status === "PENDENTE") ?? [];
  const lembrarAmigos = () =>
    Share.share({
      message: `Falta você pagar sua parte do grupo "${nomeGrupo}" no Groov para garantirmos o desconto de ${evento?.titulo}!`,
    });

  return (
    <View className="flex-1 bg-background">
      <CabecalhoGroov esquerda={{ icone: "close", onPress: () => sair("/"), rotulo: "Fechar" }} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: espacoNavBar }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center">
          <View className="px-3 py-1 rounded-full bg-surface-container-high border border-glass-border mb-5">
            <Text className="font-label-caps text-label-caps text-secondary-container">• PAGAMENTO SIMULADO</Text>
          </View>
          <View className="w-24 h-24 rounded-full bg-primary-container items-center justify-center" style={{ shadowColor: "#bc13fe", shadowOpacity: 0.6, shadowRadius: 24, elevation: 10 }}>
            <MaterialIcons name="check" size={52} color="#ffffff" />
          </View>
          <Text className="font-label-caps text-label-caps text-secondary-container mt-4">STATUS: APROVADO</Text>
          <Text className="font-headline-lg-mobile text-headline-lg-mobile text-white mt-2 text-center">
            Pagamento Confirmado!
          </Text>
          <Text className="font-body-md text-body-md text-on-surface-variant text-center mt-1">
            {compraGrupo && !grupoConfirmado
              ? "Sua cota foi confirmada. Os ingressos de todos serão liberados quando o último membro pagar."
              : "Seu ingresso já está disponível no seu perfil."}
          </Text>
          {!!pedidoReferencia && (
            <View className="flex-row items-center gap-2 px-4 py-2 rounded-full bg-surface-container-high mt-4">
              <MaterialIcons name="receipt" size={16} color="#ebb2ff" />
              <Text className="font-ticket-data text-ticket-data text-on-surface">
                RECIBO #{pedidoReferencia.slice(-8).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View className="bg-surface-container-low border border-white/10 rounded-xl p-4 mt-6">
          {evento && (
            <View className="flex-row items-center gap-3 pb-3 mb-2 border-b border-white/10">
              <View className="w-14 h-14 rounded-lg overflow-hidden bg-surface-container-high">
                {evento.imagemUrl && <Image source={{ uri: evento.imagemUrl }} className="w-full h-full" resizeMode="cover" />}
              </View>
              <View className="flex-1">
                <Text className="font-body-lg text-body-lg font-bold text-white" numberOfLines={1}>
                  {evento.titulo}
                </Text>
                <Text className="font-body-sm text-body-sm text-on-surface-variant" numberOfLines={1}>
                  {formatarDataHora(evento.comecaEm)}
                  {evento.nomeLocal ? ` • ${evento.nomeLocal}` : ""}
                </Text>
              </View>
            </View>
          )}
          {pedidos.map((pedido) => (
            <Linha key={pedido.id} rotulo={`${pedido.quantidade}x ${pedido.lote.nome}`} valor={formatarReais(Number(pedido.valor))} />
          ))}
          {compraGrupo && <Linha rotulo={`Sua cota (${nomeGrupo})`} valor={formatarReais(cotaGrupo)} />}
          <Linha rotulo="Método de cobrança" valor={metodo ? `${metodo} (simulado)` : "Simulado"} />
          <Linha rotulo="Total pago" valor={formatarReais(totalPago)} destaque />
        </View>

        {compraGrupo && (
          <View className="bg-surface-container-low border border-white/10 rounded-xl p-4 mt-4 gap-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="groups" size={20} color="#d4c0d7" />
                <Text className="font-body-md text-body-md font-bold text-white">Status do Grupo</Text>
              </View>
              <View className="px-3 py-1 rounded-full bg-secondary-container/10">
                <Text className="font-label-caps text-label-caps text-secondary-container">
                  {pagos} de {totalGrupo} Pagos
                </Text>
              </View>
            </View>
            <View className="h-2 rounded-full bg-surface-container-high overflow-hidden">
              <View className="h-full rounded-full bg-primary-container" style={{ width: `${totalGrupo ? (pagos / totalGrupo) * 100 : 0}%` }} />
            </View>
            {!grupoConfirmado ? (
              <>
                <Text className="font-body-sm text-body-sm text-on-surface-variant">
                  Faltam {pendentes.length} {pendentes.length === 1 ? "amigo" : "amigos"} para desbloquear.
                </Text>
                <TouchableOpacity
                  onPress={lembrarAmigos}
                  className="flex-row items-center justify-center gap-2 bg-surface-container rounded-lg py-3"
                >
                  <MaterialIcons name="send" size={16} color="#00eefa" />
                  <Text className="font-body-sm text-body-sm font-bold text-secondary-container">Lembrar amigos pendentes</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text className="font-body-sm text-body-sm text-secondary-container">
                Todos pagaram! Os ingressos do grupo foram liberados.
              </Text>
            )}
          </View>
        )}

        <View className="gap-3 mt-6">
          {(pedidos.length > 0 || grupoConfirmado) && (
            <TouchableOpacity
              onPress={() => sair("/perfil")}
              className="rounded-xl bg-primary-container py-4 items-center"
              style={{ shadowColor: "#bc13fe", shadowOpacity: 0.5, shadowRadius: 16, elevation: 6 }}
            >
              <Text className="font-headline-md text-white text-[15px] uppercase">Ver meus ingressos</Text>
            </TouchableOpacity>
          )}
          {compraGrupo && (
            <TouchableOpacity onPress={() => sair("/grupos")} className="rounded-xl bg-surface-container-high py-4 flex-row items-center justify-center gap-2">
              <MaterialIcons name="groups" size={18} color="#ebb2ff" />
              <Text className="font-label-caps text-label-caps text-primary uppercase">Ver progresso do grupo</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
