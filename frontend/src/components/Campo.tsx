import { Text, TextInput, View } from "react-native";

type Props = {
  rotulo: string;
  valor: string;
  onChange: (texto: string) => void;
  placeholder?: string;
  teclado?: "default" | "email-address" | "numeric" | "decimal-pad" | "url";
  ajuda?: string;
  multilinha?: boolean;
  maxLength?: number;
  capitalizar?: "none" | "sentences" | "words";
};

// Campo de texto padrão dos formulários do app.
export function Campo({
  rotulo,
  valor,
  onChange,
  placeholder,
  teclado = "default",
  ajuda,
  multilinha = false,
  maxLength,
  capitalizar = "none",
}: Props) {
  return (
    <View className="gap-2">
      <Text className="font-body-sm text-body-sm text-on-surface">{rotulo}</Text>
      <TextInput
        value={valor}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#7d7080"
        keyboardType={teclado}
        autoCapitalize={capitalizar}
        autoCorrect={false}
        multiline={multilinha}
        maxLength={maxLength}
        textAlignVertical={multilinha ? "top" : "center"}
        className="bg-surface-container rounded-xl border border-glass-border px-4 py-3 text-white font-body-md"
        style={multilinha ? { minHeight: 96 } : undefined}
      />
      {!!ajuda && <Text className="font-body-sm text-[12px] text-on-surface-variant">{ajuda}</Text>}
    </View>
  );
}
