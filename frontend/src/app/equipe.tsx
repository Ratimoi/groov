import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "@/contexts/UserContext";
import { CabecalhoGroov } from "../components/CabecalhoGroov";
import { Campo } from "../components/Campo";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";
import { api, ApiError } from "../utils/api";
import { formatarReais } from "../utils/lote";

type Cargo = "PROMOTOR" | "VALIDADOR";

type Membro = {
  id: string;
  usuarioId: string;
  cargo: Cargo;
  codigoAfiliado: string | null;
  usuario: { id: string; nome: string; username: string; avatarUrl: string | null };
  vendas: { pedidos: number; ingressos: number; comissao: string };
};

type EventoPrograma = { titulo: string; descontoAfiliado?: string | null; comissaoPromotor?: string | null };

// "0.1500" -> "15"
const paraPercentual = (fracao?: string | null) => (fracao == null ? "" : String(Math.round(Number(fracao) * 10000) / 100));
// "15" -> "0.1500"; vazio -> null
function paraFracao(pct: string): string | null | undefined {
  const texto = pct.trim().replace(",", ".");
  if (texto === "") return null;
  const n = Number(texto);
  if (!Number.isFinite(n) || n < 0 || n > 99) return undefined;
  return (Math.round(n * 100) / 10000).toFixed(4);
}

function Chip({ rotulo, ativo, onPress }: { rotulo: string; ativo: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-1 rounded-xl py-3 items-center border ${ativo ? "bg-primary-container border-primary-container" : "border-white/20"}`}
    >
      <Text className={`font-body-md ${ativo ? "text-white" : "text-on-surface-variant"}`}>{rotulo}</Text>
    </TouchableOpacity>
  );
}

// Equipe do evento (só o gerente): promotores, validadores e as condições do programa de promotores.
export default function Equipe() {
  const router = useRouter();
  const espacoNavBar = useEspacoNavBar();
  const { token } = useUser();
  const { eventoId } = useLocalSearchParams<{ eventoId: string }>();
  const [evento, setEvento] = useState<EventoPrograma | null>(null);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [desconto, setDesconto] = useState("");
  const [comissao, setComissao] = useState("");
  const [salvandoPrograma, setSalvandoPrograma] = useState(false);
  const [avisoPrograma, setAvisoPrograma] = useState("");

  const [username, setUsername] = useState("");
  const [cargo, setCargo] = useState<Cargo>("VALIDADOR");
  const [adicionando, setAdicionando] = useState(false);
  const [erroAdd, setErroAdd] = useState("");

  const carregar = useCallback(async () => {
    try {
      const [e, equipe] = await Promise.all([
        api<EventoPrograma>(`/eventos/${eventoId}`),
        api<Membro[]>(`/eventos/${eventoId}/equipe`, { token }),
      ]);
      setEvento(e);
      setDesconto(paraPercentual(e.descontoAfiliado));
      setComissao(paraPercentual(e.comissaoPromotor));
      setMembros(equipe);
      setErro("");
    } catch (err) {
      setErro(err instanceof ApiError && err.status === 403 ? "Só o gerente do evento vê a equipe." : "Não foi possível carregar a equipe.");
    } finally {
      setCarregando(false);
    }
  }, [eventoId, token]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  const voltar = () => (router.canGoBack() ? router.back() : router.replace("/meus-eventos"));

  const salvarPrograma = async () => {
    const d = paraFracao(desconto);
    const c = paraFracao(comissao);
    if (d === undefined || c === undefined) return setAvisoPrograma("Use valores entre 0 e 99.");
    setSalvandoPrograma(true);
    setAvisoPrograma("");
    try {
      await api(`/eventos/${eventoId}`, { token, method: "PUT", body: { descontoAfiliado: d, comissaoPromotor: c } });
      setAvisoPrograma("Condições salvas.");
    } catch (err) {
      setAvisoPrograma(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setSalvandoPrograma(false);
    }
  };

  const adicionar = async () => {
    if (!username.trim()) return setErroAdd("Informe o @ da pessoa.");
    setAdicionando(true);
    setErroAdd("");
    try {
      await api(`/eventos/${eventoId}/equipe`, { token, method: "POST", body: { username: username.trim(), cargo } });
      setUsername("");
      await carregar();
    } catch (err) {
      setErroAdd(err instanceof ApiError ? err.message : "Não foi possível adicionar.");
    } finally {
      setAdicionando(false);
    }
  };

  const remover = (m: Membro) =>
    Alert.alert("Remover da equipe", `Remover @${m.usuario.username} do evento?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/eventos/${eventoId}/equipe/${m.usuarioId}`, { token, method: "DELETE" });
            setMembros((atual) => atual.filter((x) => x.id !== m.id));
          } catch (err) {
            Alert.alert("Não foi possível remover", err instanceof ApiError ? err.message : "Tente de novo.");
          }
        },
      },
    ]);

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <CabecalhoGroov esquerda={{ icone: "arrow-back", onPress: voltar, rotulo: "Voltar" }} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: espacoNavBar + 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Equipe</Text>
        {!!evento && (
          <Text className="font-body-md text-body-md text-on-surface-variant mt-1 mb-5" numberOfLines={2}>
            {evento.titulo}
          </Text>
        )}

        {carregando && <ActivityIndicator color="#bc13fe" className="my-10" />}
        {!!erro && !carregando && <Text className="font-body-md text-body-md text-error text-center my-8">{erro}</Text>}

        {!carregando && !erro && (
          <View className="gap-6">
            <View className="bg-surface-container-low border border-white/10 rounded-2xl p-4 gap-4">
              <Text className="font-headline-md text-headline-md text-white">Programa de promotores</Text>
              <Text className="font-body-sm text-body-sm text-on-surface-variant">
                Quem compra com o código de um promotor ganha desconto, e o promotor recebe a comissão sobre os ingressos vendidos. O desconto não
                soma com o de grupo: vale o maior. Deixe vazio para não ter programa.
              </Text>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Campo rotulo="Desconto do comprador (%)" valor={desconto} onChange={setDesconto} teclado="decimal-pad" placeholder="10" />
                </View>
                <View className="flex-1">
                  <Campo rotulo="Comissão do promotor (%)" valor={comissao} onChange={setComissao} teclado="decimal-pad" placeholder="5" />
                </View>
              </View>
              {!!avisoPrograma && <Text className="font-body-sm text-body-sm text-on-surface-variant">{avisoPrograma}</Text>}
              <TouchableOpacity
                onPress={salvarPrograma}
                disabled={salvandoPrograma}
                className="bg-primary-container rounded-xl py-3 items-center"
                style={{ opacity: salvandoPrograma ? 0.6 : 1 }}
              >
                {salvandoPrograma ? <ActivityIndicator color="#ffffff" /> : <Text className="font-headline-md text-white text-[15px]">Salvar condições</Text>}
              </TouchableOpacity>
            </View>

            <View className="bg-surface-container-low border border-white/10 rounded-2xl p-4 gap-4">
              <Text className="font-headline-md text-headline-md text-white">Adicionar à equipe</Text>
              <Campo rotulo="Usuário" valor={username} onChange={setUsername} placeholder="@usuario" />
              <View className="flex-row gap-3">
                <Chip rotulo="Validador" ativo={cargo === "VALIDADOR"} onPress={() => setCargo("VALIDADOR")} />
                <Chip rotulo="Promotor" ativo={cargo === "PROMOTOR"} onPress={() => setCargo("PROMOTOR")} />
              </View>
              <Text className="font-body-sm text-[12px] text-on-surface-variant">
                {cargo === "VALIDADOR" ? "Lê os QR codes dos ingressos na portaria." : "Divulga o evento com um código próprio, que dá desconto a quem compra."}
              </Text>
              {!!erroAdd && <Text className="font-body-sm text-body-sm text-error">{erroAdd}</Text>}
              <TouchableOpacity
                onPress={adicionar}
                disabled={adicionando}
                className="rounded-xl py-3 items-center border border-primary-container"
                style={{ opacity: adicionando ? 0.6 : 1 }}
              >
                {adicionando ? <ActivityIndicator color="#ebb2ff" /> : <Text className="font-headline-md text-primary text-[15px]">Adicionar</Text>}
              </TouchableOpacity>
            </View>

            <View className="gap-3">
              <Text className="font-headline-md text-headline-md text-white">Quem já está</Text>
              {membros.length === 0 && <Text className="font-body-sm text-body-sm text-on-surface-variant">Ninguém na equipe ainda.</Text>}
              {membros.map((m) => (
                <View key={m.id} className="bg-surface-container-low border border-white/10 rounded-2xl p-4 gap-3">
                  <View className="flex-row items-center gap-3">
                    <Image source={{ uri: m.usuario.avatarUrl ?? "https://i.pravatar.cc/150" }} className="h-11 w-11 rounded-full" />
                    <View className="flex-1">
                      <Text className="font-body-md text-body-md font-bold text-white" numberOfLines={1}>
                        {m.usuario.nome}
                      </Text>
                      <Text className="font-body-sm text-body-sm text-on-surface-variant" numberOfLines={1}>
                        @{m.usuario.username} • {m.cargo === "PROMOTOR" ? "Promotor" : "Validador"}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => remover(m)} accessibilityLabel="Remover da equipe" hitSlop={8}>
                      <MaterialIcons name="delete-outline" size={22} color="#ffb4ab" />
                    </TouchableOpacity>
                  </View>
                  {m.cargo === "PROMOTOR" && (
                    <View className="flex-row justify-between border-t border-white/10 pt-3">
                      <View>
                        <Text className="font-label-caps text-[10px] text-on-surface-variant">CÓDIGO</Text>
                        <Text className="font-ticket-data text-primary-container" style={{ fontSize: 16 }}>
                          {m.codigoAfiliado}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="font-label-caps text-[10px] text-on-surface-variant">VENDAS</Text>
                        <Text className="font-body-sm text-body-sm text-white">
                          {m.vendas.ingressos} ingressos • {formatarReais(Number(m.vendas.comissao))}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
