import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "@/contexts/UserContext";
import { CabecalhoGroov } from "../components/CabecalhoGroov";
import { CampoTexto as Campo } from "../components/CampoTexto";
import { SeletorCategoria } from "../components/SeletorCategoria";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";
import { api, ApiError } from "../utils/api";
import { camposDeDataHora, lerDataHora, mascararData, mascararHora } from "../utils/dataHora";
import type { FuncaoEvento } from "../utils/equipe";

type EventoApi = {
  id: string;
  titulo: string;
  cidade: string;
  nomeLocal: string | null;
  descricao: string | null;
  imagemUrl: string | null;
  tags: string[];
  categoriaId: string | null;
  comecaEm: string;
  terminaEm: string | null;
};

const Secao = ({ titulo }: { titulo: string }) => (
  <Text className="font-label-caps text-label-caps text-on-surface-variant mt-2">{titulo}</Text>
);

// Edição do evento: dono e produtor editam; só o dono apaga (a API confere a função de quem chama).
export default function EditarEvento() {
  const router = useRouter();
  const espacoNavBar = useEspacoNavBar();
  const { token } = useUser();
  const { eventoId, funcao } = useLocalSearchParams<{ eventoId?: string; funcao?: FuncaoEvento }>();
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState("");
  const [titulo, setTitulo] = useState("");
  const [cidade, setCidade] = useState("");
  const [local, setLocal] = useState("");
  const [descricao, setDescricao] = useState("");
  const [imagemUrl, setImagemUrl] = useState("");
  const [tags, setTags] = useState("");
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    if (!eventoId) return;
    try {
      const evento = await api<EventoApi>(`/eventos/${eventoId}`);
      setTitulo(evento.titulo);
      setCidade(evento.cidade);
      setLocal(evento.nomeLocal ?? "");
      setDescricao(evento.descricao ?? "");
      setImagemUrl(evento.imagemUrl ?? "");
      setTags((evento.tags ?? []).join(", "));
      setCategoriaId(evento.categoriaId ?? null);
      const inicio = camposDeDataHora(evento.comecaEm);
      setData(inicio.data);
      setHora(inicio.hora);
      const fim = camposDeDataHora(evento.terminaEm);
      setDataFim(fim.data);
      setHoraFim(fim.hora);
      setErroCarga("");
    } catch (error) {
      setErroCarga(error instanceof ApiError ? error.message : "Não foi possível carregar o evento.");
    } finally {
      setCarregando(false);
    }
  }, [eventoId]);

  // Carrega só ao abrir: voltar de outra tela não pode apagar o que a pessoa estava digitando.
  useFocusEffect(
    useCallback(() => {
      if (carregando) carregar();
    }, [carregando, carregar]),
  );

  const voltar = () => (router.canGoBack() ? router.back() : router.replace("/meus-eventos"));

  async function salvar() {
    const comecaEm = lerDataHora(data, hora);
    const temFim = !!(dataFim || horaFim);
    const terminaEm = temFim ? lerDataHora(dataFim, horaFim) : null;

    if (!titulo.trim()) return setErro("O título não pode ficar vazio.");
    if (!cidade.trim()) return setErro("A cidade não pode ficar vazia.");
    if (!comecaEm) return setErro("Informe uma data e hora de início válidas (DD/MM/AAAA e HH:MM).");
    if (temFim && !terminaEm) return setErro("O término precisa de data e hora válidas, ou deixe os dois em branco.");
    if (terminaEm && terminaEm < comecaEm) return setErro("O término não pode ser antes do início.");
    if (imagemUrl.trim() && !/^https?:\/\//i.test(imagemUrl.trim())) return setErro("A imagem deve ser um link http ou https.");

    setSalvando(true);
    setErro("");
    try {
      await api(`/eventos/${eventoId}`, {
        token,
        method: "PUT",
        body: {
          titulo: titulo.trim(),
          cidade: cidade.trim(),
          comecaEm: comecaEm.toISOString(),
          terminaEm: terminaEm ? terminaEm.toISOString() : null,
          nomeLocal: local.trim() || null,
          descricao: descricao.trim() || null,
          imagemUrl: imagemUrl.trim() || null,
          categoriaId,
          tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        },
      });
      voltar();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível salvar. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  const confirmarApagar = () =>
    Alert.alert("Apagar o evento?", "Isso não pode ser desfeito. Evento com lotes vendidos ou reservados não pode ser apagado.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/eventos/${eventoId}`, { token, method: "DELETE" });
            router.replace("/meus-eventos");
          } catch (error) {
            Alert.alert("Não foi possível apagar", error instanceof ApiError ? error.message : "Tente de novo.");
          }
        },
      },
    ]);

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <CabecalhoGroov esquerda={{ icone: "arrow-back", onPress: voltar, rotulo: "Voltar" }} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: espacoNavBar, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Editar evento</Text>

        {carregando && <ActivityIndicator color="#bc13fe" className="my-6" />}
        {!!erroCarga && <Text className="font-body-md text-body-md text-error text-center">{erroCarga}</Text>}

        {!carregando && !erroCarga && (
          <>
            <Secao titulo="O EVENTO" />
            <Campo rotulo="Título *" valor={titulo} onChange={setTitulo} />
            <Campo rotulo="Cidade *" valor={cidade} onChange={setCidade} />
            <Campo rotulo="Local" valor={local} onChange={setLocal} />
            <Campo rotulo="Descrição" valor={descricao} onChange={setDescricao} multilinha />
            <Campo rotulo="Imagem (link)" valor={imagemUrl} onChange={setImagemUrl} teclado="url" placeholder="https://..." />
            <SeletorCategoria valor={categoriaId} onChange={setCategoriaId} />
            <Campo rotulo="Selos" valor={tags} onChange={setTags} placeholder="18+, open bar" ajuda="Separe por vírgula. Até 8 selos." />

            <Secao titulo="QUANDO" />
            <View className="flex-row gap-3">
              <View className="flex-[3]">
                <Campo rotulo="Data de início *" valor={data} onChange={(t) => setData(mascararData(t))} teclado="numeric" placeholder="DD/MM/AAAA" />
              </View>
              <View className="flex-[2]">
                <Campo rotulo="Hora *" valor={hora} onChange={(t) => setHora(mascararHora(t))} teclado="numeric" placeholder="HH:MM" />
              </View>
            </View>
            <View className="flex-row gap-3">
              <View className="flex-[3]">
                <Campo rotulo="Data de término" valor={dataFim} onChange={(t) => setDataFim(mascararData(t))} teclado="numeric" placeholder="DD/MM/AAAA" />
              </View>
              <View className="flex-[2]">
                <Campo rotulo="Hora" valor={horaFim} onChange={(t) => setHoraFim(mascararHora(t))} teclado="numeric" placeholder="HH:MM" />
              </View>
            </View>

            {!!erro && <Text className="font-body-sm text-body-sm text-error text-center">{erro}</Text>}

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={salvando}
              onPress={salvar}
              className="bg-primary-container rounded-xl py-4 items-center"
              style={{ opacity: salvando ? 0.5 : 1 }}
            >
              {salvando ? <ActivityIndicator color="#ffffff" /> : <Text className="font-headline-md text-white text-[16px]">Salvar alterações</Text>}
            </TouchableOpacity>

            {funcao === "DONO" && (
              <TouchableOpacity
                onPress={confirmarApagar}
                activeOpacity={0.8}
                className="rounded-xl py-3.5 items-center border border-error/60 bg-error/10"
              >
                <Text className="font-label-caps text-label-caps text-error uppercase">Apagar evento</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
