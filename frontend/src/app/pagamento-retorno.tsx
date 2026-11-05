import { useEffect } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { obterEmAndamento } from "../utils/pagamentos";

// Destino do link groov://pagamento-retorno, aberto quando o checkout do cartão termina:
// volta para a espera do pagamento em andamento (ou para o início, se não houver).
export default function PagamentoRetorno() {
  const router = useRouter();
  useEffect(() => {
    const atual = obterEmAndamento();
    if (atual) router.replace({ pathname: "/aguardando-pagamento", params: { id: atual.id } });
    else router.replace("/perfil");
  }, [router]);
  return <View className="flex-1 bg-background" />;
}
