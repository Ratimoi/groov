import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, Share, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useUser } from "@/contexts/UserContext";
import { CabecalhoGroov } from "../components/CabecalhoGroov";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";
import { api, ApiError } from "../utils/api";
import { formatarDataHora } from "../utils/evento";
import { formatarReais } from "../utils/lote";

type Aba = "todos" | "seguindo" | "salvos";

type ItemFeed = {
  id: string;
  titulo: string;
  descricao: string | null;
  imagemUrl: string | null;
  comecaEm: string;
  nomeLocal: string | null;
  cidade: string | null;
  tags: string[];
  organizador: { id: string; nome: string; username: string; avatarUrl: string | null } | null;
  atracoes: { id: string; nome: string }[];
  menorPreco: string | null;
  curtidas: number;
  curtido: boolean;
  salvo: boolean;
  seguindo: boolean;
};

type Pagina = { data: ItemFeed[]; nextCursor: string | null };

const ABAS: { chave: Aba; rotulo: string }[] = [
  { chave: "todos", rotulo: "Para você" },
  { chave: "seguindo", rotulo: "Seguindo" },
  { chave: "salvos", rotulo: "Salvos" },
];

const VAZIO: Record<Aba, string> = {
  todos: "Nenhum evento por aqui ainda.",
  seguindo: "Siga organizadores para ver os eventos deles aqui.",
  salvos: "Toque no marcador de um evento para guardá-lo aqui.",
};

function Cartao({
  item,
  meuId,
  onAtualizar,
  onAbrir,
}: {
  item: ItemFeed;
  meuId?: string;
  onAtualizar: (id: string, mudanca: Partial<ItemFeed>) => void;
  onAbrir: (id: string) => void;
}) {
  const { token } = useUser();
  const org = item.organizador;

  // Atualiza na hora e desfaz se o servidor recusar.
  const alternar = async (campo: "curtido" | "salvo" | "seguindo") => {
    const novo = !item[campo];
    const anterior: Partial<ItemFeed> = { [campo]: item[campo], curtidas: item.curtidas };
    const otimista: Partial<ItemFeed> = { [campo]: novo };
    if (campo === "curtido") otimista.curtidas = Math.max(0, item.curtidas + (novo ? 1 : -1));
    onAtualizar(item.id, otimista);

    const caminho =
      campo === "seguindo" ? `/usuarios/${org?.id}/seguir` : `/eventos/${item.id}/${campo === "curtido" ? "curtir" : "salvar"}`;
    try {
      const r = await api<{ curtidas?: number }>(caminho, { token, method: novo ? "POST" : "DELETE" });
      if (campo === "curtido" && typeof r.curtidas === "number") onAtualizar(item.id, { curtidas: r.curtidas });
    } catch {
      onAtualizar(item.id, anterior);
    }
  };

  const compartilhar = () =>
    void Share.share({ message: `${item.titulo} — ${formatarDataHora(item.comecaEm)}\ngroov://detalhes?id=${item.id}` });

  return (
    <View className="mb-6">
      <View className="flex-row items-center px-gutter pb-3 gap-3">
        <Image source={{ uri: org?.avatarUrl ?? "https://i.pravatar.cc/150" }} className="h-10 w-10 rounded-full" />
        <View className="flex-1">
          <Text className="font-body-md text-body-md font-bold text-white" numberOfLines={1}>
            {org?.nome ?? "Groov"}
          </Text>
          <Text className="font-body-sm text-body-sm text-on-surface-variant" numberOfLines={1}>
            {item.nomeLocal ?? item.cidade ?? formatarDataHora(item.comecaEm)}
          </Text>
        </View>
        {org && org.id !== meuId && (
          <TouchableOpacity
            onPress={() => alternar("seguindo")}
            className={`px-4 py-2 rounded-full border ${item.seguindo ? "border-white/20" : "border-primary-container bg-primary-container"}`}
          >
            <Text className={`font-label-caps text-label-caps ${item.seguindo ? "text-on-surface-variant" : "text-white"}`}>
              {item.seguindo ? "Seguindo" : "Seguir"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity activeOpacity={0.9} onPress={() => onAbrir(item.id)}>
        {item.imagemUrl ? (
          <Image source={{ uri: item.imagemUrl }} style={{ width: "100%", aspectRatio: 1 }} resizeMode="cover" />
        ) : (
          <View className="w-full bg-surface-container items-center justify-center" style={{ aspectRatio: 1 }}>
            <MaterialIcons name="celebration" size={56} color="#bc13fe" />
          </View>
        )}
      </TouchableOpacity>

      <View className="flex-row items-center px-gutter pt-3 gap-5">
        <TouchableOpacity onPress={() => alternar("curtido")} accessibilityLabel={item.curtido ? "Descurtir" : "Curtir"} hitSlop={8}>
          <MaterialIcons name={item.curtido ? "favorite" : "favorite-border"} size={28} color={item.curtido ? "#ff4d6d" : "#ffffff"} />
        </TouchableOpacity>
        <TouchableOpacity onPress={compartilhar} accessibilityLabel="Compartilhar" hitSlop={8}>
          <MaterialIcons name="send" size={26} color="#ffffff" />
        </TouchableOpacity>
        <View className="flex-1" />
        <TouchableOpacity onPress={() => alternar("salvo")} accessibilityLabel={item.salvo ? "Remover dos salvos" : "Salvar"} hitSlop={8}>
          <MaterialIcons name={item.salvo ? "bookmark" : "bookmark-border"} size={28} color={item.salvo ? "#00eefa" : "#ffffff"} />
        </TouchableOpacity>
      </View>

      <View className="px-gutter pt-2 gap-1">
        <Text className="font-body-md text-body-md font-bold text-white">
          {item.curtidas} {item.curtidas === 1 ? "curtida" : "curtidas"}
        </Text>
        <Text className="font-headline-md text-headline-md text-white" numberOfLines={2}>
          {item.titulo}
        </Text>
        <Text className="font-body-sm text-body-sm text-secondary-container">{formatarDataHora(item.comecaEm)}</Text>
        {item.atracoes.length > 0 && (
          <Text className="font-body-sm text-body-sm text-on-surface-variant" numberOfLines={1}>
            {item.atracoes.map((a) => a.nome).join(" • ")}
          </Text>
        )}
        {!!item.descricao && (
          <Text className="font-body-sm text-body-sm text-on-surface" numberOfLines={2}>
            {item.descricao}
          </Text>
        )}
        {item.tags.length > 0 && (
          <Text className="font-body-sm text-body-sm text-primary" numberOfLines={1}>
            {item.tags.map((t) => `#${t}`).join(" ")}
          </Text>
        )}
      </View>

      <TouchableOpacity
        onPress={() => onAbrir(item.id)}
        className="mx-gutter mt-3 rounded-xl py-3 items-center bg-primary-container"
        style={{ opacity: item.menorPreco ? 1 : 0.6 }}
      >
        <Text className="font-headline-md text-white text-[15px]">
          {item.menorPreco === null ? "Esgotado • ver evento" : `Ver ingressos • a partir de ${formatarReais(Number(item.menorPreco))}`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// Feed de eventos no estilo de rede social: curtir, salvar, seguir organizadores e comprar.
export default function Feed() {
  const router = useRouter();
  const espacoNavBar = useEspacoNavBar();
  const { user, token } = useUser();
  const [aba, setAba] = useState<Aba>("todos");
  const [itens, setItens] = useState<ItemFeed[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [recarregando, setRecarregando] = useState(false);
  const [buscandoMais, setBuscandoMais] = useState(false);
  const [erro, setErro] = useState("");
  // Descarta respostas de uma aba que já foi trocada.
  const geracao = useRef(0);

  const carregar = useCallback(
    async (proximo: string | null) => {
      const minha = proximo ? geracao.current : ++geracao.current;
      try {
        const qs = `aba=${aba}&limit=10${proximo ? `&cursor=${proximo}` : ""}`;
        const pagina = await api<Pagina>(`/feed?${qs}`, { token });
        if (minha !== geracao.current) return;
        setItens((atual) => (proximo ? [...atual, ...pagina.data.filter((n) => !atual.some((a) => a.id === n.id))] : pagina.data));
        setCursor(pagina.nextCursor);
        setErro("");
      } catch (e) {
        if (minha !== geracao.current) return;
        setErro(e instanceof ApiError ? e.message : "Não foi possível carregar o feed.");
      } finally {
        if (minha === geracao.current) {
          setCarregando(false);
          setRecarregando(false);
          setBuscandoMais(false);
        }
      }
    },
    [aba, token],
  );

  // Ao voltar de um evento o feed recarrega, com curtidas e salvos em dia.
  useFocusEffect(
    useCallback(() => {
      void carregar(null);
    }, [carregar]),
  );

  const trocarAba = (nova: Aba) => {
    if (nova === aba) return;
    setCarregando(true);
    setItens([]);
    setCursor(null);
    setAba(nova);
  };

  const atualizar = useCallback(
    (id: string, mudanca: Partial<ItemFeed>) => {
      setItens((atual) => {
        const alvo = atual.find((i) => i.id === id);
        // Seguir vale para todos os eventos do mesmo organizador.
        if (alvo && "seguindo" in mudanca) {
          return atual.map((i) => (i.organizador?.id === alvo.organizador?.id ? { ...i, ...mudanca } : i));
        }
        // Na aba de salvos, tirar o marcador remove o cartão.
        if (aba === "salvos" && mudanca.salvo === false) return atual.filter((i) => i.id !== id);
        return atual.map((i) => (i.id === id ? { ...i, ...mudanca } : i));
      });
    },
    [aba],
  );

  return (
    <View className="flex-1 bg-background">
      <CabecalhoGroov />
      <View className="flex-row px-gutter gap-2 py-3">
        {ABAS.map((a) => (
          <TouchableOpacity
            key={a.chave}
            onPress={() => trocarAba(a.chave)}
            className={`flex-1 rounded-full py-2 items-center border ${aba === a.chave ? "bg-primary-container border-primary-container" : "border-white/20"}`}
          >
            <Text className={`font-body-md ${aba === a.chave ? "text-white" : "text-on-surface-variant"}`}>{a.rotulo}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {carregando ? (
        <ActivityIndicator color="#bc13fe" className="my-10" />
      ) : (
        <FlatList
          data={itens}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <Cartao item={item} meuId={user?.id} onAtualizar={atualizar} onAbrir={(id) => router.push({ pathname: "/detalhes", params: { id } })} />
          )}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: espacoNavBar + 16 }}
          showsVerticalScrollIndicator={false}
          refreshing={recarregando}
          onRefresh={() => {
            setRecarregando(true);
            void carregar(null);
          }}
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (!cursor || buscandoMais) return;
            setBuscandoMais(true);
            void carregar(cursor);
          }}
          ListEmptyComponent={
            <Text className="font-body-md text-body-md text-center px-gutter my-10" style={{ color: erro ? "#ffb4ab" : "#9d8ba0" }}>
              {erro || VAZIO[aba]}
            </Text>
          }
          ListFooterComponent={buscandoMais ? <ActivityIndicator color="#bc13fe" className="my-4" /> : undefined}
        />
      )}
    </View>
  );
}
