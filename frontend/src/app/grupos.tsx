import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Grupos() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      <View className="flex-1 items-center justify-center">
        <Text className="font-headline-sm text-headline-sm text-on-surface">Grupos</Text>
      </View>
    </SafeAreaView>
  );
}
