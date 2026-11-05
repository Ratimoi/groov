import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";
import { CabecalhoGroov } from "../components/CabecalhoGroov";
import { CardEventoDestaque } from "../components/CardEventoDestaque";
import { CardEvento } from "../components/CardEvento";
import { MapaEventos } from "../components/Mapa";
import { obterPosicao } from "../utils/localizacao";
import { formatarDataHora } from "../utils/evento";
import type { CentroMapa, PontoMapa } from "../utils/mapa";
import type { EventoType } from "../utils/index";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;
const TODAS = "Todas";

type Periodo = "qualquer" | "hoje" | "semana";
type Modo = "lista" | "mapa";

const PERIODOS: { chave: Periodo; rotulo: string }[] = [
  { chave: "qualquer", rotulo: "Qualquer data" },
  { chave: "hoje", rotulo: "Hoje" },
  { chave: "semana", rotulo: "7 dias" },
];
const RAIOS = [5, 10, 25, 50];

function intervalo(periodo: Periodo): { de?: string; ate?: string } {
  if (periodo === "qualquer") return {};
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + (periodo === "hoje" ? 1 : 7));
  fim.setMilliseconds(-1);
  return { de: inicio.toISOString(), ate: fim.toISOString() };
}

function Chip({ rotulo, ativo, onPress, icone }: { rotulo: string; ativo: boolean; onPress: () => void; icone?: React.ComponentProps<typeof MaterialIcons>["name"] }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View
        className={`flex-row items-center gap-1 px-4 py-2 rounded-full ${ativo ? "bg-primary-container" : "border border-glass-border bg-surface-container"}`}
      >
        {icone && <MaterialIcons name={icone} size={14} color={ativo ? "#ffffff" : "#e5e2e1"} />}
        <Text className={`font-label-caps text-label-caps uppercase ${ativo ? "text-white" : "text-on-surface"}`}>{rotulo}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const espacoNavBar = useEspacoNavBar();

  const [texto, setTexto] = useState("");
  const [termo, setTermo] = useState("");
  const [categoria, setCategoria] = useState(TODAS);
  const [periodo, setPeriodo] = useState<Periodo>("qualquer");
  const [gratis, setGratis] = useState(false);
  const [modo, setModo] = useState<Modo>("lista");
  const [perto, setPerto] = useState(false);
  const [raioKm, setRaioKm] = useState(25);
  const [posicao, setPosicao] = useState<CentroMapa | null>(null);
  const [avisoLocal, setAvisoLocal] = useState("");
  const [categorias, setCategorias] = useState<string[]>([TODAS]);
  const [tentativa, setTentativa] = useState(0);
  const [resposta, setResposta] = useState<{ chave: string; eventos: EventoType[]; erro: boolean }>({ chave: "", eventos: [], erro: false });

  // Espera o usuário parar de digitar antes de buscar.
  useEffect(() => {
    const t = setTimeout(() => setTermo(texto.trim()), 400);
    return () => clearTimeout(t);
  }, [texto]);

  const consulta = useMemo(() => {
    const p = new URLSearchParams({ limit: "100" });
    if (termo) p.set("q", termo);
    if (categoria !== TODAS) p.set("categoria", categoria);
    if (gratis) p.set("gratis", "true");
    const { de, ate } = intervalo(periodo);
    if (de && ate) {
      p.set("de", de);
      p.set("ate", ate);
    }
    if (perto && posicao) {
      p.set("latitude", String(posicao.lat));
      p.set("longitude", String(posicao.lng));
      p.set("raioKm", String(raioKm));
    }
    return p.toString();
  }, [termo, categoria, gratis, periodo, perto, posicao, raioKm]);

  const chave = `${consulta}#${tentativa}`;

  useEffect(() => {
    let cancelado = false;
    async function buscaDados() {
      try {
        const response = await fetch(`${apiUrl}/eventos?${consulta}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const corpo = await response.json();
        if (cancelado) return;
        const eventos: EventoType[] = corpo.data ?? [];
        setResposta({ chave, eventos, erro: false });
        // As categorias só crescem, para os chips não sumirem quando um filtro esvazia a lista.
        const nomes = eventos.map((e) => e.categoria?.nome).filter((n): n is string => !!n);
        setCategorias((atual) => Array.from(new Set([...atual, ...nomes])));
      } catch (error) {
        console.error("Erro ao buscar eventos:", error);
        if (!cancelado) setResposta({ chave, eventos: [], erro: true });
      }
    }
    buscaDados();
    return () => {
      cancelado = true;
    };
  }, [consulta, chave]);

  const carregando = resposta.chave !== chave;
  const { eventos, erro } = resposta;
  const filtrando = !!termo || categoria !== TODAS || periodo !== "qualquer" || gratis || perto;

  const alternarPerto = async () => {
    if (perto) return setPerto(false);
    setAvisoLocal("");
    if (!posicao) {
      const r = await obterPosicao();
      if (!r.ok) return setAvisoLocal(r.motivo);
      setPosicao(r.posicao);
    }
    setPerto(true);
  };

  const limpar = () => {
    setTexto("");
    setTermo("");
    setCategoria(TODAS);
    setPeriodo("qualquer");
    setGratis(false);
    setPerto(false);
    setAvisoLocal("");
  };

  const pontos: PontoMapa[] = useMemo(
    () =>
      eventos
        .filter((e) => e.latitude != null && e.longitude != null)
        .map((e) => ({
          id: e.id,
          titulo: e.titulo,
          lat: e.latitude as number,
          lng: e.longitude as number,
          detalhe: `${formatarDataHora(e.comecaEm)}${e.nomeLocal ? ` • ${e.nomeLocal}` : ""}`,
        })),
    [eventos],
  );

  const destaques = eventos.filter((evento) => evento.destaque === true);

  return (
    <View className="flex-1 bg-background">
      <CabecalhoGroov
        esquerda={{ icone: "location-on", rotulo: "Localização" }}
        direita={{ icone: "notifications-none", rotulo: "Notificações" }}
      />
      <ScrollView
        contentContainerClassName="pt-4 flex-col gap-4"
        contentContainerStyle={{ paddingBottom: espacoNavBar }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-center gap-3 px-margin-mobile">
          <View className="flex-1 flex-row items-center gap-2 bg-surface-container rounded-full border border-glass-border px-4">
            <MaterialIcons name="search" size={20} color="#9d8ba0" />
            <TextInput
              value={texto}
              onChangeText={setTexto}
              placeholder="Buscar eventos, locais ou selos"
              placeholderTextColor="#7d7080"
              returnKeyType="search"
              maxLength={100}
              className="flex-1 py-3 text-white font-body-md"
            />
            {!!texto && (
              <TouchableOpacity onPress={() => setTexto("")} accessibilityLabel="Limpar busca" hitSlop={8}>
                <MaterialIcons name="close" size={18} color="#9d8ba0" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={() => setModo(modo === "lista" ? "mapa" : "lista")}
            accessibilityLabel={modo === "lista" ? "Ver no mapa" : "Ver em lista"}
            className="h-12 w-12 rounded-full items-center justify-center bg-primary-container"
          >
            <MaterialIcons name={modo === "lista" ? "map" : "view-list"} size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-stack-md px-margin-mobile">
          <Chip rotulo="Perto de mim" icone="my-location" ativo={perto} onPress={alternarPerto} />
          <Chip rotulo="Grátis" ativo={gratis} onPress={() => setGratis(!gratis)} />
          {PERIODOS.map((p) => (
            <Chip key={p.chave} rotulo={p.rotulo} ativo={periodo === p.chave} onPress={() => setPeriodo(p.chave)} />
          ))}
        </ScrollView>

        {perto && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-stack-md px-margin-mobile items-center">
            <Text className="font-body-sm text-body-sm text-on-surface-variant">Raio</Text>
            {RAIOS.map((r) => (
              <Chip key={r} rotulo={`${r} km`} ativo={raioKm === r} onPress={() => setRaioKm(r)} />
            ))}
          </ScrollView>
        )}
        {!!avisoLocal && <Text className="px-margin-mobile font-body-sm text-body-sm text-error">{avisoLocal}</Text>}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-stack-md px-margin-mobile pb-2">
          {categorias.map((nome) => (
            <Chip key={nome} rotulo={nome} ativo={nome === categoria} onPress={() => setCategoria(nome)} />
          ))}
        </ScrollView>

        {carregando && (
          <View className="items-center gap-2 py-10">
            <ActivityIndicator color="#bc13fe" />
            <Text className="font-body-sm text-body-sm text-on-surface-variant">Carregando eventos…</Text>
          </View>
        )}

        {erro && !carregando && (
          <View className="items-center gap-3 px-margin-mobile py-10">
            <Text className="font-body-md text-body-md text-on-surface text-center">Não foi possível carregar os eventos.</Text>
            <TouchableOpacity onPress={() => setTentativa((v) => v + 1)} className="px-5 py-2 rounded-full border border-primary-container">
              <Text className="font-label-caps text-label-caps text-primary uppercase">Tentar de novo</Text>
            </TouchableOpacity>
          </View>
        )}

        {!carregando && !erro && modo === "mapa" && (
          <View className="px-margin-mobile gap-3">
            <MapaEventos
              pontos={pontos}
              centro={posicao ?? undefined}
              euAqui={perto ? posicao : null}
              altura={440}
              onAbrir={(id) => router.push({ pathname: "/detalhes", params: { id } })}
            />
            <Text className="font-body-sm text-body-sm text-on-surface-variant">
              {pontos.length === 0
                ? "Nenhum evento com local marcado nesta busca."
                : `${pontos.length} ${pontos.length === 1 ? "evento" : "eventos"} no mapa${pontos.length < eventos.length ? ` (${eventos.length - pontos.length} sem local marcado)` : ""}.`}
            </Text>
          </View>
        )}

        {!carregando && !erro && modo === "lista" && filtrando && (
          <View className="px-margin-mobile">
            <View className="flex-row items-center justify-between mb-stack-lg">
              <Text className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
                {eventos.length} {eventos.length === 1 ? "resultado" : "resultados"}
              </Text>
              <TouchableOpacity onPress={limpar} hitSlop={8}>
                <Text className="font-label-caps text-label-caps text-primary uppercase">Limpar filtros</Text>
              </TouchableOpacity>
            </View>
            {eventos.length === 0 ? (
              <Text className="font-body-md text-body-md text-on-surface-variant">Nenhum evento encontrado com esses filtros.</Text>
            ) : (
              <View className="flex-col gap-gutter">
                {eventos.map((evento) => (
                  <CardEventoDestaque data={evento} key={evento.id} />
                ))}
              </View>
            )}
          </View>
        )}

        {!carregando && !erro && modo === "lista" && !filtrando && (
          <View className="gap-section-gap">
            {destaques.length > 0 && (
              <View className="px-margin-mobile">
                <Text className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mb-stack-lg">Em Destaque</Text>
                <View className="flex-col gap-gutter">
                  {destaques.map((evento) => (
                    <CardEventoDestaque data={evento} key={evento.id} />
                  ))}
                </View>
              </View>
            )}

            <View>
              <Text className="px-margin-mobile mb-stack-lg font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Próximos eventos</Text>
              {eventos.length === 0 ? (
                <Text className="px-margin-mobile font-body-md text-body-md text-on-surface-variant">Nenhum evento por aqui ainda.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-gutter px-margin-mobile pb-4">
                  {eventos.map((evento) => (
                    <CardEvento data={evento} key={evento.id} />
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
