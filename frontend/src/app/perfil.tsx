import { Image, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "@/contexts/UserContext";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";

export default function Perfil() {
  const espacoNavBar = useEspacoNavBar();
  const { user, sair } = useUser();

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      <View className="flex-1 items-center justify-center gap-3 px-margin-mobile" style={{ paddingBottom: espacoNavBar }}>
        <View className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary-container bg-surface-container">
          {user?.avatarUrl && <Image source={{ uri: user.avatarUrl }} className="w-full h-full" />}
        </View>
        <Text className="font-headline-md text-headline-md text-on-surface">{user?.nome}</Text>
        <Text className="font-body-sm text-body-sm text-on-surface-variant">@{user?.username}</Text>
        <TouchableOpacity
          onPress={sair}
          activeOpacity={0.8}
          className="mt-4 flex-row items-center gap-2 px-6 py-3 rounded-full border border-primary-container/50 bg-primary-container/10"
        >
          <MaterialIcons name="logout" size={18} color="#ebb2ff" />
          <Text className="font-label-caps text-label-caps text-primary uppercase">Sair</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
