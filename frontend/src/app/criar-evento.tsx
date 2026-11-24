import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "@/contexts/UserContext";
import { CabecalhoGroov } from "../components/CabecalhoGroov";
import { CampoTexto as Campo } from "../components/CampoTexto";
import { SeletorCategoria } from "../components/SeletorCategoria";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";
import { api, ApiError } from "../utils/api";
import { lerDataHora, lerPreco, mascararData, mascararHora } from "../utils/dataHora";

const Secao = ({ titulo }: { titulo: string }) => (
  <Text className="font-label-caps text-label-caps text-on-surface-variant mt-2">{titulo}</Text>
);

// Quem cria o evento vira o DONO dele (e depois aloca a equipe). O primeiro lote já nasce junto,
// porque sem lote não há o que vender.
export default function CriarEvento() {
  const router = useRouter();
  const espacoNavBar = useEspacoNavBar();
  const { token } = useUser();
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
  const [nomeLote, setNomeLote] = useState("Inteira");
  const [preco, setPreco] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const voltar = () => (router.canGoBack() ? router.back() : router.replace("/meus-eventos"));

  async function criar() {
    const comecaEm = lerDataHora(data, hora);
    const temFim = !!(dataFim || horaFim);
    const terminaEm = temFim ? lerDataHora(dataFim, horaFim) : null;
    const precoLido = lerPreco(preco);
    const qtd = Number(quantidade);

    if (!titulo.trim()) return setErro("Dê um título ao evento.");
    if (!cidade.trim()) return setErro("Informe a cidade.");
    if (!comecaEm) return setErro("Informe uma data e hora de início válidas (DD/MM/AAAA e HH:MM).");
    if (temFim && !terminaEm) return setErro("O término precisa de data e hora válidas, ou deixe os dois em branco.");
    if (terminaEm && terminaEm < comecaEm) return setErro("O término não pode ser antes do início.");
    if (imagemUrl.trim() && !/^https?:\/\//i.test(imagemUrl.trim())) return setErro("A imagem deve ser um link http ou https.");
    if (!nomeLote.trim()) return setErro("Dê um nome ao lote (ex.: Inteira).");
    if (!precoLido) return setErro("Informe o preço do ingresso (ex.: 80 ou 80,50). Use 0 para gratuito.");
    if (!Number.isInteger(qtd) || qtd < 1) return setErro("Informe quantos ingressos serão vendidos neste lote.");

    const listaTags = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    setSalvando(true);
    setErro("");
    let eventoId = "";
    try {
      const evento = await api<{ id: string }>("/eventos", {
        token,
        method: "POST",
        body: {
          titulo: titulo.trim(),
          cidade: cidade.trim(),
          comecaEm: comecaEm.toISOString(),
          ...(terminaEm ? { terminaEm: terminaEm.toISOString() } : {}),
          ...(local.trim() ? { nomeLocal: local.trim() } : {}),
          ...(descricao.trim() ? { descricao: descricao.trim() } : {}),
          ...(imagemUrl.trim() ? { imagemUrl: imagemUrl.trim() } : {}),
          ...(listaTags.length ? { tags: listaTags } : {}),
          ...(categoriaId ? { categoriaId } : {}),
        },
      });
      eventoId = evento.id;
      await api(`/eventos/${eventoId}/lotes`, {
        token,
        method: "POST",
        body: { nome: nomeLote.trim(), preco: precoLido, quantidade: qtd },
      });
      router.replace({ pathname: "/evento-painel", params: { eventoId } });
    } catch (error) {
      const mensagem = error instanceof ApiError ? error.message : "Não foi possível criar o evento. Tente de novo.";
      if (eventoId) {
        // O evento já existe e é seu; só o lote falhou.
        Alert.alert("Evento criado, mas sem lote", `O lote não foi criado: ${mensagem}`);
        router.replace({ pathname: "/evento-painel", params: { eventoId } });
      } else {
        setErro(mensagem);
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <CabecalhoGroov esquerda={{ icone: "arrow-back", onPress: voltar, rotulo: "Voltar" }} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: espacoNavBar, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-1">
          <Text className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Criar evento</Text>
          <Text className="font-body-md text-body-md text-on-surface-variant">
            Você vira o dono do evento e pode chamar produtores e porteiros para a equipe.
          </Text>
        </View>

        <Secao titulo="O EVENTO" />
        <Campo rotulo="Título *" valor={titulo} onChange={setTitulo} placeholder="Ex.: Noite Neon" />
        <Campo rotulo="Cidade *" valor={cidade} onChange={setCidade} placeholder="Ex.: Porto Alegre" />
        <Campo rotulo="Local" valor={local} onChange={setLocal} placeholder="Ex.: Arena Pulse" />
        <Campo rotulo="Descrição" valor={descricao} onChange={setDescricao} multilinha placeholder="Conte o que vai rolar" />
        <Campo rotulo="Imagem (link)" valor={imagemUrl} onChange={setImagemUrl} teclado="url" placeholder="https://..." />
        <SeletorCategoria valor={categoriaId} onChange={setCategoriaId} />
        <Campo
          rotulo="Selos"
          valor={tags}
          onChange={setTags}
          placeholder="18+, open bar"
          ajuda="Separe por vírgula. Até 8 selos."
        />

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

        <Secao titulo="PRIMEIRO LOTE DE INGRESSOS" />
        <Campo rotulo="Nome do lote *" valor={nomeLote} onChange={setNomeLote} placeholder="Ex.: Inteira" />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Campo rotulo="Preço (R$) *" valor={preco} onChange={setPreco} teclado="numeric" placeholder="80,00" />
          </View>
          <View className="flex-1">
            <Campo rotulo="Quantidade *" valor={quantidade} onChange={(t) => setQuantidade(t.replace(/\D/g, ""))} teclado="numeric" placeholder="200" />
          </View>
        </View>

        {!!erro && <Text className="font-body-sm text-body-sm text-error text-center">{erro}</Text>}

        <TouchableOpacity
          activeOpacity={0.8}
          disabled={salvando}
          onPress={criar}
          className="bg-primary-container rounded-xl py-4 items-center"
          style={{ opacity: salvando ? 0.5 : 1 }}
        >
          {salvando ? <ActivityIndicator color="#ffffff" /> : <Text className="font-headline-md text-white text-[16px]">Criar evento</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
