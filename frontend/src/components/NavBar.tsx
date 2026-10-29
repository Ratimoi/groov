import { MaterialIcons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { cssInterop } from "nativewind";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

cssInterop(MaterialIcons, {
  className: { target: "style", nativeStyleToProp: { color: true } },
});

export const ALTURA_NAVBAR = 64;
export const MARGEM_INFERIOR_NAVBAR = 20;

const ABAS = [
  { caminho: "/", label: "Início", icone: "home" },
  { caminho: "/busca", label: "Busca", icone: "search" },
  { caminho: "/grupos", label: "Grupos", icone: "group" },
  { caminho: "/perfil", label: "Perfil", icone: "person" },
] as const;

export function NavBar() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-4 items-center"
      style={{
        bottom: insets.bottom + MARGEM_INFERIOR_NAVBAR,
        zIndex: 100,
        elevation: 100,
      }}
    >
      <View className="w-full max-w-sm rounded-full border border-surface-container-high/60 bg-surface-container-lowest/90 shadow-2xl">
        <View
          className="flex-row items-center justify-around px-base"
          style={{ height: ALTURA_NAVBAR }}
        >
          {ABAS.map((aba) => {
            const ativa = pathname === aba.caminho;
            return (
              <Pressable
                key={aba.caminho}
                accessibilityRole="tab"
                accessibilityLabel={aba.label}
                accessibilityState={{ selected: ativa }}
                onPress={() => {
                  if (!ativa) router.navigate(aba.caminho);
                }}
                className="min-h-[44px] min-w-[56px] items-center justify-center"
              >
              {ativa && (
                <View
                  pointerEvents="none"
                  className="absolute h-11 w-11 rounded-full bg-primary/15"
                />
              )}
              <MaterialIcons
                name={aba.icone}
                size={22}
                className={ativa ? "text-primary" : "text-on-surface-variant"}
              />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}