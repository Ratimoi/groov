import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCarrinho } from "@/contexts/CarrinhoContext";
import { ModalGrupos } from "./ModalGrupos";
import { disponiveis, formatarReais, resumoGrupo, type LoteVenda } from "../utils/lote";

const SOMBRA = { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 5 };

// Ingresso individual: o usuário escolhe a quantidade.
export function CardLote({ data }: { data: LoteVenda }) {
  const { atualizaQuantidade, obterQuantidade } = useCarrinho();
  const quantidade = obterQuantidade(data.id);
  const restantes = disponiveis(data);
  const esgotado = restantes === 0;

  return (
    <View className="bg-surface-container-low/80 border border-white/10 rounded-xl p-gutter" style={SOMBRA}>
      <View className="flex-row items-center gap-2">
        <MaterialIcons name="person" size={24} color="rgba(255,255,255,0.7)" />
        <Text className="font-headline-md text-headline-md text-white flex-1" numberOfLines={1}>
          {data.nome}
        </Text>
        {esgotado && <Text className="font-label-caps text-label-caps text-error">ESGOTADO</Text>}
      </View>

      <View className="flex-row items-end gap-1 mt-stack-md">
        <Text className="font-ticket-data text-primary-container" style={{ fontSize: 20 }}>
          {formatarReais(Number(data.preco))}
        </Text>
        <Text className="font-body-sm text-body-sm text-white/50 mb-0.5">/cada</Text>
      </View>

      <View className="flex-row items-center justify-between mt-stack-md pt-4 border-t border-white/10">
        <View className="flex-row items-center bg-surface-container rounded-full p-1 border border-white/10">
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityLabel="Diminuir quantidade"
            disabled={quantidade === 0}
            onPress={() => atualizaQuantidade(data.id, quantidade - 1)}
            className="w-9 h-9 items-center justify-center"
            style={{ opacity: quantidade === 0 ? 0.4 : 1 }}
          >
            <MaterialIcons name="remove" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <Text className="font-ticket-data text-white w-8 text-center" style={{ fontSize: 18 }}>
            {quantidade}
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityLabel="Aumentar quantidade"
            disabled={quantidade >= restantes}
            onPress={() => atualizaQuantidade(data.id, quantidade + 1)}
            className="w-9 h-9 items-center justify-center"
            style={{ opacity: quantidade >= restantes ? 0.4 : 1 }}
          >
            <MaterialIcons name="add" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
        {!esgotado && restantes <= 20 && (
          <Text className="font-body-sm text-body-sm text-on-surface-variant">Restam {restantes}</Text>
        )}
      </View>
    </View>
  );
}

// Pacote de grupo: o usuário escolhe o grupo e paga a própria cota com desconto.
export function CardPacoteGrupo({ data }: { data: LoteVenda }) {
  const router = useRouter();
  const { gruposPorLote, escolherGrupo } = useCarrinho();
  const [modalVisivel, setModalVisivel] = useState(false);
  const grupo = gruposPorLote[data.id];
  const { tamanho, unitario, total, totalCheio, economia } = resumoGrupo(data);
  const indisponivel = disponiveis(data) < tamanho;

  return (
    <View
      className={`bg-surface-container-low/80 rounded-xl p-gutter overflow-hidden ${
        grupo ? "border-2 border-primary-container" : "border border-primary-container/50"
      }`}
      style={SOMBRA}
    >
      <View className="absolute right-0 top-0 bg-primary-container px-3 py-1 rounded-bl-lg">
        <Text className="font-label-caps text-label-caps text-white">MELHOR OFERTA</Text>
      </View>

      <View className="flex-row items-center gap-2 mt-3">
        <MaterialIcons name="groups" size={24} color="#bc13fe" />
        <Text className="font-headline-md text-headline-md text-white flex-1" numberOfLines={1}>
          Pacote de Grupo ({tamanho}×)
        </Text>
      </View>
      <Text className="font-body-sm text-body-sm text-on-surface-variant mt-1">
        Compre em grupo e pague menos. {data.nome}, válido para o grupo todo.
      </Text>

      <View className="flex-row items-end gap-1 mt-stack-md">
        <Text className="font-ticket-data text-primary-container" style={{ fontSize: 28 }}>
          {formatarReais(unitario)}
        </Text>
        <Text className="font-body-sm text-body-sm text-white/50 mb-1">/ingresso</Text>
      </View>

      <View className="flex-row items-center gap-2 mt-1 flex-wrap">
        <Text className="text-white/60 text-[13px]">
          Total: <Text className="text-white">{formatarReais(total)}</Text>
        </Text>
        {economia > 0 && (
          <>
            <Text className="text-white/40 text-[13px] line-through">{formatarReais(totalCheio)}</Text>
            <View className="px-2 py-0.5 rounded-full bg-primary-container/20 border border-primary-container/40">
              <Text className="font-label-caps text-label-caps text-primary">ECONOMIZE {formatarReais(economia)}</Text>
            </View>
          </>
        )}
      </View>

      <View className="mt-stack-md pt-4 border-t border-white/10">
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={indisponivel}
          onPress={() => setModalVisivel(true)}
          className="w-full bg-primary-container/20 border border-primary-container/50 px-4 py-2.5 rounded-xl flex-row items-center justify-center gap-2"
          style={{ opacity: indisponivel ? 0.5 : 1 }}
        >
          <MaterialIcons name={grupo ? "check-circle" : "group-add"} size={18} color="#ebb2ff" />
          <Text className="font-label-caps text-label-caps text-primary" numberOfLines={1}>
            {indisponivel ? "Ingressos insuficientes" : grupo ? `Grupo: ${grupo.nome}` : "Selecionar Opção"}
          </Text>
        </TouchableOpacity>
        {grupo && (
          <TouchableOpacity onPress={() => escolherGrupo(data.id, null)} className="self-center mt-2" hitSlop={8}>
            <Text className="font-body-sm text-body-sm text-on-surface-variant underline">Remover grupo</Text>
          </TouchableOpacity>
        )}
      </View>

      <ModalGrupos
        visivel={modalVisivel}
        grupoAtual={grupo}
        tamanho={tamanho}
        onClose={() => setModalVisivel(false)}
        onConfirmar={(escolhido) => escolherGrupo(data.id, escolhido)}
        onCriarGrupo={() => router.push(`/criar-grupo?tamanho=${tamanho}`)}
      />
    </View>
  );
}
