import { Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { MetodoPagamento } from "../utils/pagamentos";

const METODOS: { id: MetodoPagamento; rotulo: string; detalhe: string; icone: "pix" | "credit-card" }[] = [
  { id: "PIX", rotulo: "Pix", detalhe: "Copia e cola ou QR code, aprovação em segundos", icone: "pix" },
  { id: "CARTAO", rotulo: "Cartão de crédito ou débito", detalhe: "Pague na página segura do Mercado Pago", icone: "credit-card" },
];

// Escolha da forma de pagamento. Todo pagamento do app passa por aqui.
export function MetodosPagamento({ valor, onChange }: { valor: MetodoPagamento; onChange: (m: MetodoPagamento) => void }) {
  return (
    <View className="gap-4" accessibilityRole="radiogroup">
      {METODOS.map((metodo) => {
        const ativo = metodo.id === valor;
        return (
          <Pressable
            key={metodo.id}
            onPress={() => onChange(metodo.id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: ativo }}
            accessibilityLabel={metodo.rotulo}
            className={`flex-row items-center justify-between p-4 rounded-xl ${
              ativo ? "bg-[#0d0c0c] border-2 border-primary-container/40" : "bg-surface-container border-2 border-transparent"
            }`}
          >
            <View className="flex-row items-center gap-[14px] flex-1">
              <View className="h-10 w-10 items-center justify-center bg-primary-container/10 rounded-lg">
                <MaterialIcons name={metodo.icone} size={20} color="#ebb2ff" />
              </View>
              <View className="flex-1 gap-1">
                <Text className="font-headline-md text-[16px] text-white">{metodo.rotulo}</Text>
                <Text className="font-body-md text-[13px] text-on-surface-variant">{metodo.detalhe}</Text>
              </View>
            </View>
            <View
              className={`h-[22px] w-[22px] rounded-full border-2 items-center justify-center ${
                ativo ? "bg-primary-container border-primary-container" : "border-white/[0.12]"
              }`}
            >
              {ativo && <MaterialIcons name="check" size={14} color="#ffffff" />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
