import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useCarrinho } from "@/contexts/CarrinhoContext";
import { useUser } from "@/contexts/UserContext";
import { api, ApiError } from "../utils/api";

type Resposta = { codigo: string; descontoAfiliado: number; promotor: { nome: string; username: string } };

// Campo do código de promotor na compra. O código também chega pelo link do promotor (`inicial`).
export function CodigoPromotor({ eventoId, inicial }: { eventoId: string; inicial?: string }) {
  const { token } = useUser();
  const { afiliado, definirAfiliado } = useCarrinho();
  const [texto, setTexto] = useState(inicial ?? "");
  const [conferindo, setConferindo] = useState(false);
  const [erro, setErro] = useState("");
  const jaTentouInicial = useRef(false);

  const aplicado = afiliado && afiliado.eventoId === eventoId ? afiliado : null;

  const aplicar = async (codigo: string) => {
    const limpo = codigo.trim().toUpperCase();
    if (!limpo) return;
    setConferindo(true);
    setErro("");
    try {
      const r = await api<Resposta>(`/eventos/${eventoId}/afiliado/${encodeURIComponent(limpo)}`, { token });
      definirAfiliado({ eventoId, codigo: r.codigo, desconto: r.descontoAfiliado, promotor: r.promotor.nome });
    } catch (e) {
      setErro(e instanceof ApiError && e.status === 404 ? "Código de promotor inválido." : "Não foi possível conferir o código.");
    } finally {
      setConferindo(false);
    }
  };

  useEffect(() => {
    if (inicial && !jaTentouInicial.current && !aplicado) {
      jaTentouInicial.current = true;
      void aplicar(inicial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicial]);

  if (aplicado) {
    return (
      <View className="flex-row items-center justify-between bg-surface-container-low border border-secondary-container/40 rounded-xl p-4 mb-6">
        <View className="flex-1 pr-3">
          <Text className="font-body-md text-body-md font-bold text-white">Código {aplicado.codigo} aplicado</Text>
          <Text className="font-body-sm text-body-sm text-on-surface-variant">
            Promotor: {aplicado.promotor}
            {aplicado.desconto > 0 ? ` • ${Math.round(aplicado.desconto * 100)}% de desconto` : ""}
          </Text>
        </View>
        <TouchableOpacity onPress={() => definirAfiliado(null)} accessibilityLabel="Remover código" hitSlop={8}>
          <MaterialIcons name="close" size={22} color="#9d8ba0" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="mb-6">
      <Text className="font-body-sm text-body-sm text-on-surface mb-2">Tem um código de promotor?</Text>
      <View className="flex-row gap-2">
        <TextInput
          value={texto}
          onChangeText={(v) => {
            setTexto(v.toUpperCase());
            setErro("");
          }}
          placeholder="Código"
          placeholderTextColor="#7d7080"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={16}
          className="flex-1 bg-surface-container rounded-xl border border-glass-border px-4 py-3 text-white font-body-md"
        />
        <TouchableOpacity
          onPress={() => aplicar(texto)}
          disabled={conferindo || !texto.trim()}
          className="px-5 rounded-xl items-center justify-center border border-primary-container"
          style={{ opacity: conferindo || !texto.trim() ? 0.5 : 1 }}
        >
          {conferindo ? <ActivityIndicator color="#ebb2ff" /> : <Text className="font-label-caps text-label-caps text-primary uppercase">Aplicar</Text>}
        </TouchableOpacity>
      </View>
      {!!erro && <Text className="font-body-sm text-body-sm text-error mt-2">{erro}</Text>}
    </View>
  );
}
