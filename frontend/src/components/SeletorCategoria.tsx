import { Text, TouchableOpacity, View } from "react-native";
import { useCategorias } from "../hooks/useCategorias";

type Props = { valor: string | null; onChange: (categoriaId: string | null) => void };

// Chips de categoria: tocar de novo na escolhida tira a categoria.
export function SeletorCategoria({ valor, onChange }: Props) {
  const categorias = useCategorias();
  if (categorias.length === 0) return null;

  return (
    <View className="gap-2">
      <Text className="font-body-sm text-body-sm text-on-surface">Categoria</Text>
      <View className="flex-row flex-wrap gap-2">
        {categorias.map((categoria) => {
          const ativa = categoria.id === valor;
          return (
            <TouchableOpacity
              key={categoria.id}
              onPress={() => onChange(ativa ? null : categoria.id)}
              className={`px-4 py-2 rounded-full border ${
                ativa ? "border-primary-container bg-primary-container/20" : "border-white/10 bg-surface-container-low"
              }`}
            >
              <Text className={`font-body-sm text-body-sm ${ativa ? "text-primary font-bold" : "text-on-surface-variant"}`}>
                {categoria.nome}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
