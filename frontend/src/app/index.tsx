import { useEffect, useState } from "react";
import { Text, View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image } from "react-native";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

export default function HomeScreen() {
  const [eventos, setEventos] = useState<any[]>([]);  
  
  useEffect(() => {
  async function buscaDados() {
    try {
      const response = await fetch(`${apiUrl}/filmes`);
      const dados = await response.json();
      
      setEventos(dados);

    } catch (error) {
      console.error("Erro ao buscar eventos:", error);
    }
  }
  
  buscaDados();
  }, [])

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
            <TouchableOpacity className="px-4 py-2 rounded-full bg-primary-container border border-primary-container shadow-md">
              <Text className="font-label-caps text-label-caps text-surface">TECHNO</Text>
            </TouchableOpacity>
           
            <TouchableOpacity className="px-4 py-2 rounded-full border border-glass-border bg-surface-container">
              <Text className="font-label-caps text-label-caps text-on-surface">HIP HOP</Text>
            </TouchableOpacity>
           
            <TouchableOpacity className="px-4 py-2 rounded-full border border-glass-border bg-surface-container">
              <Text className="font-label-caps text-label-caps text-on-surface">OPEN BAR</Text>
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
            {/* Card 1 */}
            <TouchableOpacity activeOpacity={0.8} className="bg-surface-container-high rounded-xl border border-glass-border overflow-hidden flex-col">
              <View className="relative h-64 w-full">
                <Image source={{ uri: eventos[0].}}
                  className="w-full h-full object-cover"
                />
                <View className="absolute top-4 left-4 px-3 py-1 bg-black/60 rounded-full border border-glass-border">
                  <Text className="font-label-caps text-label-caps text-secondary">TECHNO</Text>
                </View>
                <View className="absolute bottom-4 right-4 px-3 py-1 bg-black/60 rounded-full border border-glass-border">
                  <Text className="font-label-caps text-label-caps text-secondary">R$ 180</Text>
                </View>
              </View>
              <View className="p-4 flex-col gap-stack-sm">
                <Text className="font-body-sm text-body-sm text-secondary">SEX, 27 OUT • 23:00</Text>
                <Text className="font-headline-md text-headline-md text-on-surface" numberOfLines={1}>Neon Dreams Warehouse</Text>
                <Text className="font-body-md text-body-md text-on-surface-variant" numberOfLines={1}>Sector 7G Industrial Park</Text>
              </View>
            </TouchableOpacity>


            {/* Card 2 */}
            <TouchableOpacity activeOpacity={0.8} className="bg-surface-container-high rounded-xl border border-glass-border overflow-hidden flex-col">
              <View className="relative h-64 w-full">
                {/* <Image
                  source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC0jKSVy2Ihy8mU0IJ7BeARV857Te00LIfahzUK9VPnDyzRWlMWsKVuLtmM8xM0dfaMFyOhFsNB7PhdiC0xyO1UH4KyNt5wfb9YxHIJ-QB-DSnLyfNXOCBJ9pYFsH4dbrDng2QrBHCshb3He3L70KIXBR6_Y3Fs0YaKx06LJ-H6zgejeAUhiYmCaUPjLX8zga0H8KwAFHfTxcdn3jHG1u4F4x3xrp2wsudc0obtL8lTn-83O2WamQLClg' }}
                  className="w-full h-full object-cover"
                /> */}
                <View className="absolute top-4 left-4 px-3 py-1 bg-black/60 rounded-full border border-glass-border">
                  <Text className="font-label-caps text-label-caps text-secondary">HIP HOP</Text>
                </View>
                <View className="absolute bottom-4 right-4 px-3 py-1 bg-black/60 rounded-full border border-glass-border">
                  <Text className="font-label-caps text-label-caps text-secondary">R$ 90</Text>
                </View>
              </View>
              <View className="p-4 flex-col gap-stack-sm">
                <Text className="font-body-sm text-body-sm text-secondary">SÁB, 28 OUT • 22:00</Text>
                <Text className="font-headline-md text-headline-md text-on-surface" numberOfLines={1}>The Cypher Vol. 4</Text>
                <Text className="font-body-md text-body-md text-on-surface-variant" numberOfLines={1}>Basement 45 Venue</Text>
              </View>
            </TouchableOpacity>
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
            {/* Horiz Card 1 */}
            <TouchableOpacity activeOpacity={0.8} className="w-72 bg-surface-container-high rounded-xl border border-glass-border overflow-hidden flex-col">
              <View className="h-32 w-full relative">
                {/* <Image
                  source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAPK7tmw5DWHwerpoTiuDcuURuRKujB9WrYm-0_rD2RqT_4TIFlRrI9la9_9NmdTjO4DI74kPefMMHEy26nAC9QB3zvRKjr5OSYbZ10ALV2R-6fdViFzpva4_K8o-wUxN1V6Ehwtgc-ThwLvAmsC0fI_lrlOCuc_8Wm0UIh2HUej5_Z9DZ5L61aVZMojn_iOw7wDZE0HeigFC6DHla1t7hXf_tSdFv8zlwYu6tTYE2_uZIDyRs347GQnQ' }}
                  className="w-full h-full object-cover"
                /> */}
              </View>
              <View className="p-4">
                <Text className="font-body-sm text-body-sm text-primary">HOJE • 20:00</Text>
                <Text className="font-body-lg text-body-lg text-on-surface mt-1" numberOfLines={1}>Skyline Open Bar</Text>
                <View className="flex-row justify-between items-center mt-2">
                  <Text className="font-body-sm text-body-sm text-on-surface-variant">0.5 km de distância</Text>
                  <Text className="font-label-caps text-label-caps text-primary">R$ 250</Text>
                </View>
              </View>
            </TouchableOpacity>


            {/* Horiz Card 2 */}
            <TouchableOpacity activeOpacity={0.8} className="w-72 bg-surface-container-high rounded-xl border border-glass-border overflow-hidden flex-col">
              <View className="h-32 w-full relative">
                {/* <Image
                  source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC3I4iOYaTXBEBwmTK6IWxxiGMNH8nFdHmAVSEeovTV7yyFau6niPdpRkza9VIY6ZzInGUoD9MhDz2tXTeORHFm-CqJW5YtELNxGIGJQcTTX0C3w3L9B7DZEtiBlcm9GLPqLgllrtLPaX996VzuEagPw5QMvs4ZNPtxsF112fhi5K2ZiFHogR7LDHo0jy9rjT7XrFFfAEx4DGuPYSoccbpuc6pGnOrHRFFNEZMc5Q-oWRWdxy5GX2eUBg' }}
                  className="w-full h-full object-cover"
                /> */}
              </View>
              <View className="p-4">
                <Text className="font-body-sm text-body-sm text-primary">DOM, 29 OUT • 21:00</Text>
                <Text className="font-body-lg text-body-lg text-on-surface mt-1" numberOfLines={1}>Arena Invites: KNTXT</Text>
                <View className="flex-row justify-between items-center mt-2">
                  <Text className="font-body-sm text-body-sm text-on-surface-variant">2.1 km de distância</Text>
                  <Text className="font-label-caps text-label-caps text-primary">R$ 190</Text>
                </View>
              </View>
            </TouchableOpacity>


            {/* Horiz Card 3 */}
            <TouchableOpacity activeOpacity={0.8} className="w-72 bg-surface-container-high rounded-xl border border-glass-border overflow-hidden flex-col">
              <View className="h-32 w-full relative">
                {/* <Image
                  source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAGlaYdtwJhA5rNLPt7wet2-IusfAbORRUY5x6WMc-nfxnZ04UqRc_Nivk32CaXltz3ZMu-3nogL5NwmUx99vENaR2jw7JDW6_GIWr3DXsGLmfAePSc9w573D0vSiZvqIOEzH81ZWQSXGM2lUQz2VPEEDK67XVSJ6kOJNm4k9HThw0wMiC5b-RYzffAaLhO1CQ3qQ8MlZO8IPjHsnI-6x7eQ9EZJZXojb3kWRg7qvcexOxn3m2xPn2Zlw' }}
                  className="w-full h-full object-cover"
                /> */}
              </View>
              <View className="p-4">
                <Text className="font-body-sm text-body-sm text-primary">QUI, 02 NOV • 23:59</Text>
                <Text className="font-body-lg text-body-lg text-on-surface mt-1" numberOfLines={1}>Bassline Thursdays</Text>
                <View className="flex-row justify-between items-center mt-2">
                  <Text className="font-body-sm text-body-sm text-on-surface-variant">3.5 km de distância</Text>
                  <Text className="font-label-caps text-label-caps text-primary">R$ 80</Text>
                </View>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


