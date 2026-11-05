import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";

export default function Busca() {
  const espacoNavBar = useEspacoNavBar();

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      <View className="flex-1 items-center justify-center" style={{ paddingBottom: espacoNavBar }}>
        <Text className="font-headline-sm text-headline-sm text-on-surface">Busca</Text>
      </View>
    </SafeAreaView>
  );
}
