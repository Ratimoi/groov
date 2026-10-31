import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useUser } from "@/contexts/UserContext";
import { api, ApiError } from "../utils/api";
import type { IngressoApi } from "../utils/compras";

type Estatistica = { media: number | null; total: number };
type Resumo = { evento: Estatistica; organizador: ({ nome: string } & Estatistica) | null };

const formatar = ({ media, total }: Estatistica) =>
  media === null ? "Sem avaliações ainda" : `${media.toFixed(1).replace(".", ",")} (${total} ${total === 1 ? "avaliação" : "avaliações"})`;

// Nota do evento e do organizador. Quem foi ao evento (ingresso já validado na portaria) também avalia.
export function AvaliacoesEvento({ eventoId }: { eventoId: string }) {
  const { token } = useUser();
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [foi, setFoi] = useState(false);
  const [nota, setNota] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const carregarResumo = useCallback(async () => {
    try {
      setResumo(await api<Resumo>(`/eventos/${eventoId}/avaliacoes`));
    } catch (error) {
      console.error("Erro ao buscar avaliações:", error);
    }
  }, [eventoId]);

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      try {
        const dados = await api<Resumo>(`/eventos/${eventoId}/avaliacoes`);
        if (!cancelado) setResumo(dados);
        const ingressos = await api<IngressoApi[]>("/ingressos", { token });
        if (!cancelado) setFoi(ingressos.some((i) => i.evento.id === eventoId && i.status === "USADO"));
      } catch (error) {
        console.error("Erro ao buscar avaliações:", error);
      }
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, [eventoId, token]);

  const enviar = async () => {
    setEnviando(true);
    setMensagem("");
    try {
      await api(`/eventos/${eventoId}/avaliacoes`, { method: "POST", token, body: { nota } });
      setMensagem("Obrigado pela sua avaliação!");
      await carregarResumo();
    } catch (error) {
      setMensagem(error instanceof ApiError ? error.message : "Não foi possível enviar a avaliação.");
    } finally {
      setEnviando(false);
    }
  };

  if (!resumo) return null;

  return (
    <View className="px-margin-mobile pb-8">
      <Text className="font-headline-md text-headline-md text-white mb-4">Avaliações</Text>
      <View className="bg-surface-container-high border border-primary-container/30 rounded-xl p-stack-md gap-3">
        <View className="flex-row items-center gap-2">
          <MaterialIcons name="star" size={20} color="#f5c518" />
          <Text className="font-body-md text-body-md text-white">Evento: {formatar(resumo.evento)}</Text>
        </View>
        {resumo.organizador && (
          <View className="flex-row items-center gap-2">
            <MaterialIcons name="verified" size={20} color="#00eefa" />
            <Text className="flex-1 font-body-md text-body-md text-white" numberOfLines={2}>
              {resumo.organizador.nome}: {formatar(resumo.organizador)}
            </Text>
          </View>
        )}

        {foi && (
          <View className="border-t border-white/10 pt-3 gap-3">
            <Text className="font-body-sm text-body-sm text-on-surface-variant">Você foi a este evento. Como foi?</Text>
            <View className="flex-row gap-2">
              {[1, 2, 3, 4, 5].map((valor) => (
                <TouchableOpacity key={valor} onPress={() => setNota(valor)} hitSlop={6} accessibilityLabel={`${valor} estrelas`}>
                  <MaterialIcons name={valor <= nota ? "star" : "star-border"} size={34} color={valor <= nota ? "#f5c518" : "#9d8ba0"} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              disabled={nota === 0 || enviando}
              onPress={enviar}
              activeOpacity={0.8}
              className="self-start bg-primary-container rounded-xl px-6 py-3"
              style={{ opacity: nota > 0 && !enviando ? 1 : 0.5 }}
            >
              {enviando ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="font-label-caps text-label-caps text-white uppercase">Enviar avaliação</Text>
              )}
            </TouchableOpacity>
            {!!mensagem && <Text className="font-body-sm text-body-sm text-on-surface-variant">{mensagem}</Text>}
          </View>
        )}
      </View>
    </View>
  );
}
