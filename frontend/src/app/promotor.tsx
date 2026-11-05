import { useCallback, useState } from "react";
import { ActivityIndicator, Share, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "@/contexts/UserContext";
import { Tela } from "../components/Tela";
import { api, ApiError } from "../utils/api";
import { formatarReais } from "../utils/lote";

// O módulo da área de transferência é nativo: um APK antigo cairia no compartilhamento comum.
let Clipboard: typeof import("expo-clipboard") | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Clipboard = require("expo-clipboard");
} catch {
  Clipboard = null;
}

type Painel = {
  evento: string;
  codigo: string | null;
  descontoAfiliado: number;
  comissaoPromotor: number;
  pedidos: number;
  ingressos: number;
  comissaoTotal: string;
};

function Numero({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View className="flex-1 bg-surface-container-low border border-white/10 rounded-2xl p-4">
      <Text className="font-label-caps text-[10px] text-on-surface-variant">{rotulo}</Text>
      <Text className="font-ticket-data text-secondary-container mt-1" style={{ fontSize: 20 }} numberOfLines={1}>
        {valor}
      </Text>
    </View>
  );
}

// Painel do promotor: o código para divulgar, as condições e quanto já vendeu.
export default function Promotor() {
  const router = useRouter();
  const { token } = useUser();
  const { eventoId } = useLocalSearchParams<{ eventoId: string }>();
  const [painel, setPainel] = useState<Painel | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setPainel(await api<Painel>(`/eventos/${eventoId}/promotor`, { token }));
      setErro("");
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível carregar o painel.");
    } finally {
      setCarregando(false);
    }
  }, [eventoId, token]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  const voltar = () => (router.canGoBack() ? router.back() : router.replace("/meus-eventos"));

  const link = painel?.codigo ? `groov://detalhes?id=${eventoId}&ref=${painel.codigo}` : "";
  const mensagem = painel
    ? `${painel.evento}\nCompre com o meu código ${painel.codigo}${painel.descontoAfiliado > 0 ? ` e ganhe ${Math.round(painel.descontoAfiliado * 100)}% de desconto` : ""} no app Groov.\n${link}`
    : "";

  const copiar = async () => {
    if (!painel?.codigo) return;
    if (!Clipboard) return void Share.share({ message: painel.codigo });
    await Clipboard.setStringAsync(painel.codigo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <Tela cabecalho={{ esquerda: { icone: "arrow-back", onPress: voltar, rotulo: "Voltar" } }}>
        <Text className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Meu link de promotor</Text>

        {carregando && <ActivityIndicator color="#bc13fe" className="my-10" />}
        {!!erro && !carregando && <Text className="font-body-md text-body-md text-error text-center my-8">{erro}</Text>}

        {painel && (
          <View className="gap-4 mt-2">
            <Text className="font-body-md text-body-md text-on-surface-variant" numberOfLines={2}>
              {painel.evento}
            </Text>

            <View className="bg-surface-container-low border border-primary-container/40 rounded-2xl p-5 items-center gap-2">
              <Text className="font-label-caps text-label-caps text-on-surface-variant">SEU CÓDIGO</Text>
              <Text className="font-ticket-data text-primary-container" style={{ fontSize: 30, letterSpacing: 2 }}>
                {painel.codigo}
              </Text>
              <Text className="font-body-sm text-body-sm text-on-surface-variant text-center">
                {painel.descontoAfiliado > 0
                  ? `Quem usar ganha ${Math.round(painel.descontoAfiliado * 100)}% de desconto.`
                  : "O gerente ainda não definiu desconto para quem usar o código."}
                {painel.comissaoPromotor > 0 ? ` Você recebe ${Math.round(painel.comissaoPromotor * 100)}% sobre cada venda.` : ""}
              </Text>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity onPress={copiar} className="flex-1 flex-row items-center justify-center gap-2 rounded-xl py-4 border border-primary-container">
                <MaterialIcons name={copiado ? "check" : "content-copy"} size={20} color="#ebb2ff" />
                <Text className="font-headline-md text-primary text-[15px]">{copiado ? "Copiado" : "Copiar código"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Share.share({ message: mensagem })}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl py-4 bg-primary-container"
              >
                <MaterialIcons name="share" size={20} color="#ffffff" />
                <Text className="font-headline-md text-white text-[15px]">Compartilhar</Text>
              </TouchableOpacity>
            </View>

            <Text className="font-headline-md text-headline-md text-white mt-2">Minhas vendas</Text>
            <View className="flex-row gap-3">
              <Numero rotulo="PEDIDOS" valor={String(painel.pedidos)} />
              <Numero rotulo="INGRESSOS" valor={String(painel.ingressos)} />
            </View>
            <Numero rotulo="COMISSÃO ACUMULADA" valor={formatarReais(Number(painel.comissaoTotal))} />
            <Text className="font-body-sm text-[12px] text-on-surface-variant">
              A comissão fica registrada aqui; o repasse é combinado diretamente com o gerente do evento.
            </Text>
          </View>
        )}
      </Tela>
  );
}
