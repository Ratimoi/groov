import "../../global.css";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useFonts,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { Inter_400Regular } from "@expo-google-fonts/inter";
import {
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
} from "@expo-google-fonts/jetbrains-mono";
import { Tabs } from "expo-router";
import { NavBar } from "../components/NavBar";
import { CarrinhoProvider } from "@/contexts/CarrinhoContext";
import { UserProvider, useUser } from "@/contexts/UserContext";
import { TelaCpf } from "../components/TelaCpf";
import { TelaEntrar } from "../components/TelaEntrar";
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";

// Sem isto o NativeWind ignora o className do LinearGradient (padding, absolute, flex...)
// e os botões com gradiente ficam sem altura.
cssInterop(LinearGradient, { className: "style" });

const queryClient = new QueryClient();

// Sem login o app mostra só a tela de acesso; com login, as abas.
function Conteudo() {
  const { user, carregandoSessao } = useUser();

  if (carregandoSessao) return <View className="flex-1 bg-background" />;
  if (!user) return <TelaEntrar />;
  if (user.temCpf === false) return <TelaCpf />;

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={() => <NavBar />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="busca" />
      <Tabs.Screen name="grupos" />
      <Tabs.Screen name="perfil" />
      <Tabs.Screen name="detalhes" />
      <Tabs.Screen name="lotes" />
      <Tabs.Screen name="criar-grupo" />
      <Tabs.Screen name="pagamento-confirmado" />
      <Tabs.Screen name="ingresso" />
      <Tabs.Screen name="escanear" />
      <Tabs.Screen name="entrar-grupo" />
    </Tabs>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "PlusJakartaSans-Bold": PlusJakartaSans_700Bold,
    "PlusJakartaSans-ExtraBold": PlusJakartaSans_800ExtraBold,
    "Inter-Regular": Inter_400Regular,
    "JetBrainsMono-Medium": JetBrainsMono_500Medium,
    "JetBrainsMono-SemiBold": JetBrainsMono_600SemiBold,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <CarrinhoProvider>
            <View className="flex-1 bg-background">
              <Conteudo />
            </View>
          </CarrinhoProvider>
        </UserProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}