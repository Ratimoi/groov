import { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "@/contexts/UserContext";
import { CabecalhoGroov } from "../components/CabecalhoGroov";
import { api, ApiError } from "../utils/api";

type Entrada = { grupo: { id: string; nome: string }; jaEraMembro: boolean };

// Abre pelo link `groov://entrar-grupo?codigo=...` ou pelo botão "Entrar com código" em Grupos.
export default function EntrarGrupo() {
  const { codigo: codigoDoLink } = useLocalSearchParams<{ codigo?: string }>();
  const router = useRouter();
  const { token } = useUser();
  const [codigo, setCodigo] = useState((codigoDoLink ?? "").toUpperCase());
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [entrada, setEntrada] = useState<Entrada | null>(null);

  const voltar = () => (router.canGoBack() ? router.back() : router.replace("/grupos"));

  const entrar = async () => {
    setEnviando(true);
    setErro("");
    try {
      setEntrada(await api<Entrada>("/grupos/entrar", { method: "POST", token, body: { codigo: codigo.trim() } }));
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível entrar no grupo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <CabecalhoGroov esquerda={{ icone: "arrow-back", onPress: voltar, rotulo: "Voltar" }} />
      <View className="flex-1 px-5 pt-8">
        {entrada ? (
          <View className="items-center gap-4 mt-10">
            <MaterialIcons name="check-circle" size={56} color="#10b981" />
            <Text className="font-headline-md text-headline-md text-on-surface text-center">
              {entrada.jaEraMembro ? "Você já está em" : "Você entrou em"} {entrada.grupo.nome}
            </Text>
            <TouchableOpacity onPress={() => router.replace("/grupos")} className="bg-primary-container rounded-xl px-8 py-3.5 mt-2">
              <Text className="font-label-caps text-label-caps text-white uppercase">Ver meus grupos</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Entrar em um Grupo</Text>
            <Text className="font-body-md text-body-md text-on-surface-variant mt-1 mb-6">
              Digite o código que o líder do grupo te enviou.
            </Text>
            <TextInput
              value={codigo}
              onChangeText={(texto) => setCodigo(texto.toUpperCase())}
              placeholder="CÓDIGO"
              placeholderTextColor="#7d7080"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={16}
              className="bg-surface-container-low rounded-xl px-4 py-3.5 text-white font-ticket-data text-center"
              style={{ fontSize: 22, letterSpacing: 4 }}
            />
            {!!erro && <Text className="font-body-sm text-body-sm text-error mt-4 text-center">{erro}</Text>}
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={codigo.trim().length < 4 || enviando}
              onPress={entrar}
              className="mt-6 bg-primary-container rounded-xl py-4 items-center"
              style={{ opacity: codigo.trim().length >= 4 && !enviando ? 1 : 0.5 }}
            >
              {enviando ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="font-headline-md text-white text-[16px] uppercase">Entrar no grupo</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}
