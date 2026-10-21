import { useEffect, useState } from "react";
import { Text, View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image } from "react-native";
import { CardEventoDestaque } from "../components/CardEventoDestaque";
import { CardEvento } from "../components/CardEvento";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

export default function HomeScreen() {
  const [eventos, setEventos] = useState<any[]>([]);  
  const [eventoDestaque, setEventoDestaque] = useState<any | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<string>("Festas");


  
  useEffect(() => {
  async function buscaDados() {
    try {
      const response = await fetch(`${apiUrl}/eventos`);
      const resposta = await response.json();
      const dados = resposta.data ?? [];
      
      setEventos(dados);

      const destaques = dados.filter((evento: any) => evento.destaque === true);
      if (destaques.length > 0) {
        const indiceAleatorio = Math.floor(Math.random() * destaques.length);
        setEventoDestaque(destaques[indiceAleatorio]);
      }

    } catch (error) {
      console.error("Erro ao buscar eventos:", error);
    }
  }
  
  buscaDados();
  }, [])

  const eventosFiltrados = eventos.filter(
    (evento) => evento.categoria?.nome === filtroCategoria
  );

  const listaEventos = eventosFiltrados.map( evento => (
    <CardEvento data={evento} key={evento.id} />
  ))

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="pt-8 pb-12 flex-col gap-section-gap"
        showsVerticalScrollIndicator={false}
      >
        {/* Categories */}
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-stack-md px-margin-mobile pb-2"
          >
            <TouchableOpacity onPress={() => setFiltroCategoria("Festas")} className={`px-4 py-2 rounded-full border shadow-md ${ 
              filtroCategoria === "Festas"
                ? " bg-primary-container border border-primary-container"
                :  "border-glass-border bg-surface-container"
            }`}>
              <Text className="font-label-caps text-label-caps text-on-surface">Festas</Text>
            </TouchableOpacity>
           
            <TouchableOpacity onPress={() => setFiltroCategoria("Culturais")} className={`px-4 py-2 rounded-full border shadow-md ${ 
              filtroCategoria === "Culturais"
                ? " bg-primary-container border border-primary-container"
                :  "border-glass-border bg-surface-container"
            }`}>
              <Text className="font-label-caps text-label-caps text-on-surface">Culturais</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFiltroCategoria("Educativos")} className={`px-4 py-2 rounded-full border shadow-md ${ 
              filtroCategoria === "Educativos"
                ? " bg-primary-container border border-primary-container"
                :  "border-glass-border bg-surface-container"
            }`}>
              <Text className="font-label-caps text-label-caps text-on-surface">Educativos</Text>
            </TouchableOpacity>
           
            <TouchableOpacity className="px-4 py-2 rounded-full border border-glass-border bg-surface-container">
              <Text className="font-label-caps text-label-caps text-on-surface">FESTIVAIS</Text>
            </TouchableOpacity>
           
            <TouchableOpacity className="px-4 py-2 rounded-full border border-glass-border bg-surface-container">
              <Text className="font-label-caps text-label-caps text-on-surface">UNDERGROUND</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>


        {/* Featured Parties */}
        <View className="px-margin-mobile">
          <View className="flex-row justify-between items-end mb-stack-lg">
            <Text className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
              Em Destaque
            </Text>
            <TouchableOpacity>
              <Text className="font-body-sm text-body-sm text-secondary">Ver todos</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-col gap-gutter">
            {eventoDestaque && (
              <CardEventoDestaque data={eventoDestaque} key={eventoDestaque.id} />
            )} 
          </View>
        </View>


        {/* Events Near You */}
        <View>
          <View className="px-margin-mobile mb-stack-lg flex-row justify-between items-end">
            <Text className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
              Perto de Você
            </Text>
          </View>
         
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-gutter px-margin-mobile pb-4"
          >
          {listaEventos}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


