import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";
import { CabecalhoGroov } from "../components/CabecalhoGroov";
import { CardEventoDestaque } from "../components/CardEventoDestaque";
import { CardEvento } from "../components/CardEvento";
import type { EventoType } from "../utils/index";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;
const TODAS = "Todas";

export default function HomeScreen() {
  const espacoNavBar = useEspacoNavBar();
  const [eventos, setEventos] = useState<EventoType[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<string>(TODAS);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let cancelado = false;
    async function buscaDados() {
      try {
        const response = await fetch(`${apiUrl}/eventos?limit=100`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const resposta = await response.json();
        if (!cancelado) setEventos(resposta.data ?? []);
      } catch (error) {
        console.error("Erro ao buscar eventos:", error);
        if (!cancelado) setErro(true);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }
    buscaDados();
    return () => {
      cancelado = true;
    };
  }, [tentativa]);

  const tentarDeNovo = () => {
    setCarregando(true);
    setErro(false);
    setTentativa((valor) => valor + 1);
  };

  const categorias = useMemo(() => {
    const nomes = eventos.map((evento) => evento.categoria?.nome).filter((nome): nome is string => !!nome);
    return [TODAS, ...Array.from(new Set(nomes))];
  }, [eventos]);

  const eventosFiltrados = eventos.filter(
    (evento) => filtroCategoria === TODAS || evento.categoria?.nome === filtroCategoria,
  );
  const destaques = eventosFiltrados.filter((evento) => evento.destaque === true);

  return (
    <View className="flex-1 bg-background">
      <CabecalhoGroov
        esquerda={{ icone: "location-on", rotulo: "Localização" }}
        direita={{ icone: "notifications-none", rotulo: "Notificações" }}
      />
      <ScrollView
        contentContainerClassName="pt-6 flex-col gap-section-gap"
        contentContainerStyle={{ paddingBottom: espacoNavBar }}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-stack-md px-margin-mobile pb-2"
        >
          {categorias.map((categoria) => {
            const ativa = categoria === filtroCategoria;
            return (
              <TouchableOpacity key={categoria} onPress={() => setFiltroCategoria(categoria)} activeOpacity={0.8}>
                {ativa ? (
                  <View className="bg-primary-container px-4 py-2 rounded-full">
                    <Text className="font-label-caps text-label-caps text-white uppercase">{categoria}</Text>
                  </View>
                ) : (
                  <View className="px-4 py-2 rounded-full border border-glass-border bg-surface-container">
                    <Text className="font-label-caps text-label-caps text-on-surface uppercase">{categoria}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {carregando && (
          <View className="items-center gap-2 py-10">
            <ActivityIndicator color="#bc13fe" />
            <Text className="font-body-sm text-body-sm text-on-surface-variant">Carregando eventos…</Text>
          </View>
        )}

        {erro && !carregando && (
          <View className="items-center gap-3 px-margin-mobile py-10">
            <Text className="font-body-md text-body-md text-on-surface text-center">
              Não foi possível carregar os eventos.
            </Text>
            <TouchableOpacity onPress={tentarDeNovo} className="px-5 py-2 rounded-full border border-primary-container">
              <Text className="font-label-caps text-label-caps text-primary uppercase">Tentar de novo</Text>
            </TouchableOpacity>
          </View>
        )}

        {!carregando && !erro && (
          <>
            {destaques.length > 0 && (
              <View className="px-margin-mobile">
                <Text className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mb-stack-lg">
                  Em Destaque
                </Text>
                <View className="flex-col gap-gutter">
                  {destaques.map((evento) => (
                    <CardEventoDestaque data={evento} key={evento.id} />
                  ))}
                </View>
              </View>
            )}

            <View>
              <Text className="px-margin-mobile mb-stack-lg font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
                Perto de Você
              </Text>
              {eventosFiltrados.length === 0 ? (
                <Text className="px-margin-mobile font-body-md text-body-md text-on-surface-variant">
                  Nenhum evento nesta categoria.
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="gap-gutter px-margin-mobile pb-4"
                >
                  {eventosFiltrados.map((evento) => (
                    <CardEvento data={evento} key={evento.id} />
                  ))}
                </ScrollView>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
