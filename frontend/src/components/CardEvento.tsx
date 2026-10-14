import { Pressable, Text, TouchableOpacity, View, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { ComponentProps } from "react";
import type { EventoType } from "../utils/index";

export function NavBar({ data }: { data: EventoType }) {
  return (
            <TouchableOpacity activeOpacity={0.8} className="bg-surface-container-high rounded-xl border border-glass-border overflow-hidden flex-col">
              <View className="relative h-64 w-full">
              {data.imagemUrl && (
                <Image 
                  source={{ uri: data.imagemUrl }}
                  className="w-full h-40"
                  resizeMode="cover"
                />
              )}
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
  );
}
