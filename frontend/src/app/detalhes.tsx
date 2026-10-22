import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Image, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { EventoType } from "@/utils";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

export default function DetalhesEvento() {
  const { id } = useLocalSearchParams();
  const espacoNavBar = useEspacoNavBar();
  const [evento, setEvento] = useState<EventoType>();

  useEffect(() => {
    async function buscaDados() {
      const response = await fetch(`${apiUrl}/eventos/${id}`);
      const dados = await response.json();
      setEvento(dados);
    }
    buscaDados();
  }, []);

  const organizador = evento?.criadoPor;

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{ paddingBottom: espacoNavBar }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Section */}
      <View className="relative w-full aspect-[4/5] overflow-hidden">
        {evento?.imagemUrl && (
          <Image
            source={{ uri: evento.imagemUrl }}
            className="absolute inset-0 w-full h-full"
            resizeMode="cover"
          />
        )}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.6)", "#121214"]} // Ajusta a última cor (hex) para o teu tom exato de "background"
          className="absolute inset-0 z-10"
        />

        <View className="absolute bottom-0 left-0 w-full p-margin-mobile z-20 flex-col gap-stack-md">
          <Text className="font-headline-lg-mobile text-headline-lg-mobile text-white">
            {evento?.titulo}
          </Text>
          <View className="flex-row items-center gap-2">
            <MaterialIcons name="calendar-month" size={16} color="#d4c0d7" />
            <Text className="text-on-surface-variant font-body-sm text-body-sm">
              28 de Out • 22:00 - 06:00
            </Text>
          </View>
        </View>
      </View>

      {/* Countdown Timer */}
      <View className="px-margin-mobile py-8">
        <View className="bg-surface-container-high border border-primary-container/30 rounded-xl flex-row justify-between items-center p-stack-md">
          <View className="flex-col items-center">
            <Text className="font-ticket-data text-ticket-data text-secondary-container">
              14
            </Text>
            <Text className="font-label-caps text-label-caps text-on-surface-variant">
              DIAS
            </Text>
          </View>
          <Text className="text-primary-container font-bold">:</Text>
          <View className="flex-col items-center">
            <Text className="font-ticket-data text-ticket-data text-secondary-container">
              08
            </Text>
            <Text className="font-label-caps text-label-caps text-on-surface-variant">
              HORAS
            </Text>
          </View>
          <Text className="text-primary-container font-bold">:</Text>
          <View className="flex-col items-center">
            <Text className="font-ticket-data text-ticket-data text-secondary-container">
              45
            </Text>
            <Text className="font-label-caps text-label-caps text-on-surface-variant">
              MIN
            </Text>
          </View>
          <Text className="text-primary-container font-bold">:</Text>
          <View className="flex-col items-center">
            <Text className="font-ticket-data text-ticket-data text-secondary-container">
              59
            </Text>
            <Text className="font-label-caps text-label-caps text-on-surface-variant">
              SEG
            </Text>
          </View>
        </View>
      </View>

      {/* Event Description */}
      <View className="px-margin-mobile flex-col pb-8 gap-2">
        <Text className="font-headline-md text-headline-md text-white">
          Sobre a Experiência
        </Text>
        <Text className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
          {evento?.descricao}
        </Text>
        {/* <View className="flex-row gap-2 flex-wrap mt-2">
          <View className="bg-surface-container-highest border border-primary-container/20 rounded-full px-3 py-1">
            <Text className="font-body-sm text-body-sm text-on-surface">
              Classificação 21+
            </Text>
          </View>
          <View className="bg-surface-container-highest border border-primary-container/20 rounded-full px-3 py-1">
            <Text className="font-body-sm text-body-sm text-on-surface">
              Interior/Ar Livre
            </Text>
          </View>
          <View className="bg-surface-container-highest border border-primary-container/20 rounded-full px-3 py-1">
            <Text className="font-body-sm text-body-sm text-on-surface">
              Artes Visuais
            </Text>
          </View>
        </View> */}
      </View>

      <View className="px-margin-mobile pb-8">
        <Text className="font-headline-md text-headline-md text-white mb-4">
          Organizado por
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          className="flex-row items-center gap-stack-md bg-surface-container-high border border-primary-container/30 rounded-xl p-stack-md"
        >
          <View className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-primary-container">
            {organizador?.avatarUrl && (
              <Image
                source={{ uri: organizador.avatarUrl }}
                className="w-full h-full"
              />
            )}
          </View>
          <View className="flex-1">
            <Text className="font-body-lg text-body-lg font-bold text-white">
              {organizador?.nome}
            </Text>
            <View className="flex-row items-center gap-1 mt-1">
              <MaterialIcons name="star" size={14} color="#d4c0d7" />
              <Text className="font-ticket-data text-sm text-primary-container">
                4.9/5
              </Text>
              <Text className="text-on-surface-variant text-xs ml-1">
                (124 Avaliações)
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#a1a1aa" />
        </TouchableOpacity>
      </View>

      {/* Lineup Grid */}
{/* Lineup Grid */}
      {/* Só exibe esta secção se existirem atrações no evento */}
      {evento?.atracoes && evento.atracoes.length > 0 && (
        <View className="px-margin-mobile pb-8">
          <Text className="font-headline-md text-headline-md text-white mb-4">
            Lineup
          </Text>
          <View className="flex-row flex-wrap gap-y-2 gap-x-[2.6%]"> 
            {evento.atracoes.map((atracao) => (
              <View 
                key={atracao.id} 
                className="w-[23%] bg-surface-container-high rounded-lg overflow-hidden border border-primary-container/20"
              >
                <View className="aspect-square relative">
                  <Image
                    source={{ 
                      uri: atracao.avatarUrl ?? "https://i.pravatar.cc/150" 
                    }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </View>
                <View className="p-1 items-center">
                  <Text
                    className="text-[10px] font-bold text-primary"
                    numberOfLines={1}
                  >
                    {atracao.nome.toUpperCase()} 
                  </Text>
                </View>
              </View>
            ))}

          </View>
        </View>
      )}

      <View className="px-margin-mobile flex-col pb-8 gap-2">
        <Text className="font-headline-md text-headline-md text-white">
          Localização
        </Text>
        <View className="bg-surface-container-high border border-primary-container/30 rounded-xl flex-row gap-stack-md items-center py-4 px-3">
          <View className="flex-col flex-1 gap-1">
            <Text className="font-body-sm text-body-sm text-on-surface-variant">
              {evento?.nomeLocal}
            </Text>
            <TouchableOpacity>
              <Text className="text-primary-container font-body-sm text-body-sm underline mt-1">
                Como Chegar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
