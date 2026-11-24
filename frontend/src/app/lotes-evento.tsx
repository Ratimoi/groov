import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "@/contexts/UserContext";
import { CabecalhoGroov } from "../components/CabecalhoGroov";
import { CampoTexto as Campo } from "../components/CampoTexto";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";
import { api, ApiError } from "../utils/api";
import { lerPreco } from "../utils/dataHora";
import { formatarPreco } from "../utils/evento";

type LoteApi = {
  id: string;
  nome: string;
  preco: string;
  quantidade: number;
  quantidadeVendida: number;
  quantidadeReservada: number;
  quantidadeDisponivel: number;
  tamanhoGrupo: number | null;
  descontoGrupo: string | null;
  prazoGrupoHoras: number | null;
};

type Formulario = {
  id: string | null; // null = lote novo
  nome: string;
  preco: string;
  quantidade: string;
  grupo: boolean;
  tamanho: string;
  desconto: string; // em %, como a pessoa digita
  prazo: string;
};

const vazio: Formulario = { id: null, nome: "", preco: "", quantidade: "", grupo: false, tamanho: "4", desconto: "10", prazo: "48" };

const doLote = (lote: LoteApi): Formulario => ({
  id: lote.id,
  nome: lote.nome,
  preco: lote.preco.replace(".", ","),
  quantidade: String(lote.quantidade),
  grupo: lote.tamanhoGrupo !== null,
  tamanho: String(lote.tamanhoGrupo ?? 4),
  // O backend guarda a fração (0.1500); aqui a pessoa vê e digita em %.
  desconto: lote.descontoGrupo !== null ? String(Math.round(Number(lote.descontoGrupo) * 10000) / 100).replace(".", ",") : "10",
  prazo: String(lote.prazoGrupoHoras ?? 48),
});

// Lotes de UM evento: dono e produtor criam, editam e apagam (a API confere a função de quem chama).
export default function LotesEvento() {
  const router = useRouter();
  const espacoNavBar = useEspacoNavBar();
  const { token } = useUser();
  const { eventoId, titulo } = useLocalSearchParams<{ eventoId?: string; titulo?: string }>();
  const [lotes, setLotes] = useState<LoteApi[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState("");
  const [form, setForm] = useState<Formulario | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    if (!eventoId) return;
    try {
      setLotes(await api<LoteApi[]>(`/eventos/${eventoId}/lotes`));
      setErroCarga("");
    } catch (error) {
      setErroCarga(error instanceof ApiError ? error.message : "Não foi possível carregar os lotes.");
    } finally {
      setCarregando(false);
    }
  }, [eventoId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const voltar = () => (router.canGoBack() ? router.back() : router.replace("/meus-eventos"));
  const mudar = (parcial: Partial<Formulario>) => setForm((atual) => (atual ? { ...atual, ...parcial } : atual));

  async function salvar() {
    if (!form) return;
    const preco = lerPreco(form.preco);
    const quantidade = Number(form.quantidade);
    const tamanho = Number(form.tamanho);
    const prazo = Number(form.prazo);
    const desconto = Number(form.desconto.replace(",", "."));

    if (!form.nome.trim()) return setErro("Dê um nome ao lote.");
    if (!preco) return setErro("Informe o preço (ex.: 80 ou 80,50). Use 0 para gratuito.");
    if (!Number.isInteger(quantidade) || quantidade < 1) return setErro("Informe a quantidade de ingressos do lote.");
    if (form.grupo) {
      if (!Number.isInteger(tamanho) || tamanho < 2 || tamanho > 50) return setErro("O grupo precisa ter de 2 a 50 pessoas.");
      if (!Number.isInteger(prazo) || prazo < 1 || prazo > 720) return setErro("O prazo do grupo vai de 1 a 720 horas.");
      if (!Number.isFinite(desconto) || desconto < 0 || desconto > 99) return setErro("O desconto do grupo vai de 0 a 99%.");
    }

    const corpo = {
      nome: form.nome.trim(),
      preco,
      quantidade,
      // null desliga a compra em grupo; os três campos andam juntos.
      tamanhoGrupo: form.grupo ? tamanho : null,
      prazoGrupoHoras: form.grupo ? prazo : null,
      descontoGrupo: form.grupo ? (desconto / 100).toFixed(4) : null,
    };

    setSalvando(true);
    setErro("");
    try {
      if (form.id) await api(`/lotes/${form.id}`, { token, method: "PUT", body: corpo });
      else await api(`/eventos/${eventoId}/lotes`, { token, method: "POST", body: corpo });
      setForm(null);
      await carregar();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível salvar o lote. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  const confirmarApagar = (lote: LoteApi) =>
    Alert.alert("Apagar o lote?", `"${lote.nome}" será removido. Lote com ingressos vendidos ou reservados não pode ser apagado.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/lotes/${lote.id}`, { token, method: "DELETE" });
            setLotes((atual) => atual.filter((item) => item.id !== lote.id));
          } catch (error) {
            Alert.alert("Não foi possível apagar", error instanceof ApiError ? error.message : "Tente de novo.");
          }
        },
      },
    ]);

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <CabecalhoGroov esquerda={{ icone: "arrow-back", onPress: form ? () => setForm(null) : voltar, rotulo: "Voltar" }} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: espacoNavBar, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-1">
          <Text className="font-headline-md text-headline-md text-on-surface">{form ? (form.id ? "Editar lote" : "Novo lote") : "Lotes"}</Text>
          {!!titulo && <Text className="font-body-sm text-body-sm text-on-surface-variant">{titulo}</Text>}
        </View>

        {form ? (
          <>
            <Campo rotulo="Nome *" valor={form.nome} onChange={(nome) => mudar({ nome })} placeholder="Ex.: Inteira" />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Campo rotulo="Preço (R$) *" valor={form.preco} onChange={(preco) => mudar({ preco })} teclado="numeric" placeholder="80,00" />
              </View>
              <View className="flex-1">
                <Campo
                  rotulo="Quantidade *"
                  valor={form.quantidade}
                  onChange={(t) => mudar({ quantidade: t.replace(/\D/g, "") })}
                  teclado="numeric"
                  placeholder="200"
                />
              </View>
            </View>

            <View className="flex-row items-center justify-between bg-surface-container-low border border-white/10 rounded-xl p-4">
              <View className="flex-1 pr-3">
                <Text className="font-body-md text-body-md font-bold text-white">Compra em grupo</Text>
                <Text className="font-body-sm text-[12px] text-on-surface-variant">Quem compra em grupo ganha desconto.</Text>
              </View>
              <Switch value={form.grupo} onValueChange={(grupo) => mudar({ grupo })} trackColor={{ true: "#bc13fe" }} />
            </View>

            {form.grupo && (
              <View className="gap-4">
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Campo rotulo="Pessoas no grupo" valor={form.tamanho} onChange={(t) => mudar({ tamanho: t.replace(/\D/g, "") })} teclado="numeric" />
                  </View>
                  <View className="flex-1">
                    <Campo rotulo="Desconto (%)" valor={form.desconto} onChange={(desconto) => mudar({ desconto })} teclado="numeric" />
                  </View>
                </View>
                <Campo
                  rotulo="Prazo para o grupo pagar (horas)"
                  valor={form.prazo}
                  onChange={(t) => mudar({ prazo: t.replace(/\D/g, "") })}
                  teclado="numeric"
                  ajuda="Depois desse prazo, a compra em grupo expira."
                />
              </View>
            )}

            {!!erro && <Text className="font-body-sm text-body-sm text-error text-center">{erro}</Text>}

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={salvando}
              onPress={salvar}
              className="bg-primary-container rounded-xl py-4 items-center"
              style={{ opacity: salvando ? 0.5 : 1 }}
            >
              {salvando ? <ActivityIndicator color="#ffffff" /> : <Text className="font-headline-md text-white text-[16px]">Salvar lote</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => {
                setErro("");
                setForm(vazio);
              }}
              activeOpacity={0.8}
              className="flex-row items-center justify-center gap-2 py-3.5 rounded-xl bg-primary-container"
            >
              <MaterialIcons name="add" size={20} color="#ffffff" />
              <Text className="font-label-caps text-label-caps text-white uppercase">Novo lote</Text>
            </TouchableOpacity>

            {carregando && <ActivityIndicator color="#bc13fe" className="my-6" />}
            {!!erroCarga && !carregando && <Text className="font-body-md text-body-md text-error text-center">{erroCarga}</Text>}
            {!carregando && !erroCarga && lotes.length === 0 && (
              <Text className="font-body-md text-body-md text-on-surface-variant text-center">Este evento ainda não tem lotes.</Text>
            )}

            {lotes.map((lote) => (
              <View key={lote.id} className="bg-surface-container-low border border-white/10 rounded-xl p-4 gap-2">
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="flex-1 font-body-md text-body-md font-bold text-white" numberOfLines={1}>
                    {lote.nome}
                  </Text>
                  <Text className="font-body-md text-body-md text-primary">{formatarPreco(lote.preco)}</Text>
                </View>
                <Text className="font-body-sm text-body-sm text-on-surface-variant">
                  {lote.quantidadeVendida} vendidos • {lote.quantidadeReservada} reservados • {lote.quantidadeDisponivel} disponíveis de {lote.quantidade}
                </Text>
                {lote.tamanhoGrupo !== null && (
                  <Text className="font-body-sm text-body-sm text-on-surface-variant">
                    Grupo de {lote.tamanhoGrupo} com {Math.round(Number(lote.descontoGrupo ?? 0) * 100)}% de desconto
                  </Text>
                )}
                <View className="flex-row gap-4 mt-1">
                  <TouchableOpacity
                    onPress={() => {
                      setErro("");
                      setForm(doLote(lote));
                    }}
                    className="flex-row items-center gap-1"
                  >
                    <MaterialIcons name="edit" size={18} color="#ebb2ff" />
                    <Text className="font-label-caps text-label-caps text-primary uppercase">Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmarApagar(lote)} className="flex-row items-center gap-1">
                    <MaterialIcons name="delete-outline" size={18} color="#ffb4ab" />
                    <Text className="font-label-caps text-label-caps text-error uppercase">Apagar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
