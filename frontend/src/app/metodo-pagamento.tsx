import { useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "@/contexts/UserContext";
import { Tela } from "../components/Tela";
import { MetodosPagamento } from "../components/MetodosPagamento";
import { api, ApiError } from "../utils/api";
import { definirEmAndamento, type MetodoPagamento, type PagamentoApi } from "../utils/pagamentos";

// Forma de pagamento da cota de uma compra em grupo (vinda da aba Grupos). Todo pagamento do app
// passa por uma tela de escolha de método; esta cobre o pagamento fora do checkout.
export default function MetodoPagamentoTela() {
  const { compraId, nomeGrupo, evento } = useLocalSearchParams<{ compraId: string; nomeGrupo?: string; evento?: string }>();
  const router = useRouter();
  const { token } = useUser();
  const [metodo, setMetodo] = useState<MetodoPagamento>("PIX");
  const [processando, setProcessando] = useState(false);

  const voltar = () => (router.canGoBack() ? router.back() : router.replace("/grupos"));

  const continuar = async () => {
    setProcessando(true);
    try {
      const p = await api<PagamentoApi>("/pagamentos", {
        method: "POST",
        token,
        body: { metodo, itens: [{ tipo: "COTA", compraId }] },
      });
      definirEmAndamento({ id: p.id, lotesDoCarrinho: [], nomeGrupo });
      router.replace({ pathname: "/aguardando-pagamento", params: { id: p.id } });
    } catch (error) {
      Alert.alert("Não foi possível pagar", error instanceof ApiError ? error.message : "Tente de novo.");
    } finally {
      setProcessando(false);
    }
  };

  return (
    <Tela cabecalho={{ esquerda: { icone: "arrow-back", onPress: voltar, rotulo: "Voltar" } }} gap={20}>
        <View className="gap-1">
          <Text className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Pagar minha cota</Text>
          {!!evento && <Text className="font-body-md text-body-md text-on-surface-variant" numberOfLines={2}>{evento}{nomeGrupo ? ` • ${nomeGrupo}` : ""}</Text>}
        </View>
        <Text className="font-headline-md text-[18px] text-white">Selecione o método de pagamento</Text>
        <MetodosPagamento valor={metodo} onChange={setMetodo} />
        <TouchableOpacity
          onPress={continuar}
          disabled={processando}
          className="rounded-xl py-4 items-center bg-primary-container"
          style={{ opacity: processando ? 0.6 : 1 }}
        >
          {processando ? <ActivityIndicator color="#ffffff" /> : <Text className="font-headline-md text-white text-[16px]">Continuar</Text>}
        </TouchableOpacity>
      </Tela>
  );
}
