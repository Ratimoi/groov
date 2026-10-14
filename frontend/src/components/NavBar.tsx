import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { ComponentProps } from "react";

const COR_INATIVA = "#ffffff";

const ABAS = [
  { rota: "index", icone: "home" },
  { rota: "busca", icone: "search" },
  { rota: "grupos", icone: "group" },
  { rota: "perfil", icone: "person" },
] as const;

type BottomTabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];

export function NavBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const rotaAtiva = state.routes[state.index]?.name;

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-4 items-center"
      style={{ bottom: insets.bottom + 20, zIndex: 100, elevation: 100 }}
    >
      <View className="w-full max-w-sm rounded-full border border-surface-container-high/60 bg-surface-container-lowest/90 shadow-2xl">
        <View className="h-16 flex-row items-center justify-around px-space-xs">
          {ABAS.map((aba) => {
            const ativa = rotaAtiva === aba.rota;
            return (
              <Pressable
                key={aba.rota}
                onPress={() => {
                  if (!ativa) navigation.navigate(aba.rota);
                }}
                className="min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-space-xxs"
              >
                <MaterialIcons
                  name={aba.icone}
                  size={22}
                  color={ativa ? "text-primary-container drop-shadow-[0_0_12px_rgba(188,19,254,0.6)]" : COR_INATIVA}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
