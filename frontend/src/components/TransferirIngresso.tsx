import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useUser } from "@/contexts/UserContext";
import { api, ApiError } from "../utils/api";
import type { IngressoApi, PessoaApi } from "../utils/compras";

const ESPERA_BUSCA_MS = 400;

type Props = { ingresso: IngressoApi; aoTransferir: () => void };

// Passa o ingresso para outra pessoa: busca por nome ou @, confirma e transfere. O código do
// ingresso muda, então o QR antigo deixa de valer.
export function TransferirIngresso({ ingresso, aoTransferir }: Props) {
  const { token } = useUser();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<PessoaApi[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const termo = busca.trim();
    if (!aberto || termo.length < 2) return;
    let cancelado = false;
    const espera = setTimeout(async () => {
      setBuscando(true);
      try {
        const dados = await api<PessoaApi[]>(`/usuarios/busca?q=${encodeURIComponent(termo)}`, { token });
        if (!cancelado) setResultados(dados);
      } catch (error) {
        console.error("Erro na busca de usuários:", error);
        if (!cancelado) setResultados([]);
      } finally {
        if (!cancelado) setBuscando(false);
      }
    }, ESPERA_BUSCA_MS);
    return () => {
      cancelado = true;
      clearTimeout(espera);
    };
  }, [aberto, busca, token]);

  const transferir = async (pessoa: PessoaApi) => {
    setEnviando(true);
    try {
      await api(`/ingressos/${ingresso.id}/transferir`, { method: "POST", token, body: { username: pessoa.username } });
      Alert.alert("Ingresso transferido", `O ingresso agora é de ${pessoa.nome}.`);
      aoTransferir();
    } catch (error) {
      Alert.alert("Transferência", error instanceof ApiError ? error.message : "Não foi possível transferir.");
      setEnviando(false);
    }
  };

  const confirmar = (pessoa: PessoaApi) =>
    Alert.alert(
      "Transferir ingresso?",
      `${ingresso.evento.titulo} vai para ${pessoa.nome} (@${pessoa.username}). Você perde o acesso a este ingresso.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Transferir", style: "destructive", onPress: () => void transferir(pessoa) },
      ],
    );

  if (!aberto) {
    return (
      <TouchableOpacity
        onPress={() => setAberto(true)}
        className="mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-white/15 bg-surface-container-low py-3.5"
      >
        <MaterialIcons name="swap-horiz" size={18} color="#ebb2ff" />
        <Text className="font-body-md text-body-md font-bold text-white">Transferir ingresso</Text>
      </TouchableOpacity>
    );
  }

  const termoValido = busca.trim().length >= 2;

  return (
    <View className="mt-3 rounded-xl border border-white/15 bg-surface-container-low p-4 gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="font-body-md text-body-md font-bold text-white">Transferir para</Text>
        <TouchableOpacity onPress={() => setAberto(false)} hitSlop={8} disabled={enviando}>
          <Text className="font-label-caps text-label-caps text-primary uppercase">Fechar</Text>
        </TouchableOpacity>
      </View>
      <View className="flex-row items-center gap-3 bg-surface-container rounded-xl px-4">
        <MaterialIcons name="search" size={20} color="#9d8ba0" />
        <TextInput
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar por nome ou @arroba..."
          placeholderTextColor="#7d7080"
          autoCapitalize="none"
          autoCorrect={false}
          className="flex-1 py-3 text-white font-body-md"
        />
        {buscando && <ActivityIndicator size="small" color="#bc13fe" />}
      </View>

      {termoValido && !buscando && resultados.length === 0 && (
        <Text className="font-body-sm text-body-sm text-on-surface-variant text-center">Ninguém encontrado.</Text>
      )}

      {termoValido &&
        resultados.map((pessoa) => (
          <TouchableOpacity
            key={pessoa.id}
            disabled={enviando}
            onPress={() => confirmar(pessoa)}
            activeOpacity={0.8}
            className="flex-row items-center gap-3 bg-surface-container rounded-xl p-3"
          >
            <View className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high">
              {pessoa.avatarUrl && <Image source={{ uri: pessoa.avatarUrl }} className="w-full h-full" />}
            </View>
            <View className="flex-1">
              <Text className="font-body-md text-body-md font-bold text-on-surface" numberOfLines={1}>
                {pessoa.nome}
              </Text>
              <Text className="font-body-sm text-body-sm text-on-surface-variant" numberOfLines={1}>
                @{pessoa.username}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#9d8ba0" />
          </TouchableOpacity>
        ))}
    </View>
  );
}
