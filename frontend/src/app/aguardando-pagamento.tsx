import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, Image, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCarrinho } from "@/contexts/CarrinhoContext";
import { useUser } from "@/contexts/UserContext";
import { Tela } from "../components/Tela";
import { api } from "../utils/api";
import { formatarReais } from "../utils/lote";
import { abrirCheckout, copiar, definirEmAndamento, NOME_METODO, obterEmAndamento, type PagamentoApi } from "../utils/pagamentos";

const INTERVALO_MS = 4000;

function restante(expiraEm: string, agora: number): string {
  const s = Math.max(0, Math.floor((new Date(expiraEm).getTime() - agora) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// Espera a confirmação do pagamento: mostra o Pix ou leva ao checkout do cartão e consulta a API
// até o Mercado Pago aprovar. Só então os ingressos aparecem.
export default function AguardandoPagamento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useUser();
  const { definirResultado, atualizaQuantidade, escolherGrupo } = useCarrinho();
  const [pagamento, setPagamento] = useState<PagamentoApi | null>(null);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const concluido = useRef(false);

  const consultar = useCallback(async () => {
    try {
      const p = await api<PagamentoApi>(`/pagamentos/${id}`, { token });
      setPagamento(p);
      setErro("");
      if (p.status !== "APROVADO" || concluido.current) return;

      concluido.current = true;
      const contexto = obterEmAndamento();
      contexto?.lotesDoCarrinho.forEach((loteId) => {
        atualizaQuantidade(loteId, 0);
        escolherGrupo(loteId, null);
      });
      definirEmAndamento(null);
      if (p.erroEmissao) {
        Alert.alert("Pagamento aprovado", "O pagamento foi aprovado, mas não conseguimos emitir tudo. Fale com o suporte do evento; o que foi emitido está no seu Perfil.");
      }
      if (p.pedidos.length === 0 && p.compras.length === 0) return router.replace("/perfil");
      definirResultado({
        pedidos: p.pedidos,
        compraGrupo: p.compras[0],
        nomeGrupo: contexto?.nomeGrupo,
        metodo: NOME_METODO[p.metodo],
        simulado: p.provedor === "SIMULADO",
      });
      router.replace("/pagamento-confirmado");
    } catch {
      setErro("Sem conexão. Vamos tentar de novo.");
    }
  }, [id, token, atualizaQuantidade, escolherGrupo, definirResultado, router]);

  // Consulta de tempos em tempos e sempre que o app volta ao primeiro plano (ex.: saindo do app do banco).
  useFocusEffect(
    useCallback(() => {
      void consultar();
    }, [consultar]),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setAgora(Date.now());
      if (!concluido.current) void consultar();
    }, INTERVALO_MS);
    const assinatura = AppState.addEventListener("change", (estado) => {
      if (estado === "active") void consultar();
    });
    return () => {
      clearInterval(timer);
      assinatura.remove();
    };
  }, [consultar]);

  const tentarDeNovo = () => {
    definirEmAndamento(null);
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const copiarCodigo = async () => {
    if (!pagamento?.pixCopiaECola) return;
    if (await copiar(pagamento.pixCopiaECola)) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } else {
      Alert.alert("Código Pix", pagamento.pixCopiaECola);
    }
  };

  const encerrado = pagamento?.status === "RECUSADO" || pagamento?.status === "EXPIRADO";

  return (
    <Tela cabecalho={{ esquerda: { icone: "arrow-back", onPress: () => router.replace("/"), rotulo: "Início" } }} gap={16}>
        <Text className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
          {encerrado ? "Pagamento não concluído" : "Aguardando pagamento"}
        </Text>

        {!pagamento && <ActivityIndicator color="#bc13fe" className="my-10" />}
        {!!erro && <Text className="font-body-sm text-body-sm text-on-surface-variant">{erro}</Text>}

        {pagamento && !encerrado && (
          <>
            <View className="bg-surface-container-low border border-white/10 rounded-2xl p-4 items-center gap-1">
              <Text className="font-label-caps text-[10px] text-on-surface-variant">TOTAL</Text>
              <Text className="font-display-lg text-secondary-container" style={{ fontSize: 28 }}>
                {formatarReais(Number(pagamento.valor))}
              </Text>
              <Text className="font-body-sm text-body-sm text-on-surface-variant">Expira em {restante(pagamento.expiraEm, agora)}</Text>
            </View>

            {pagamento.metodo === "PIX" && (
              <View className="gap-4">
                {!!pagamento.pixQrCodeBase64 && (
                  <View className="self-center bg-white p-3 rounded-2xl">
                    <Image source={{ uri: `data:image/png;base64,${pagamento.pixQrCodeBase64}` }} style={{ width: 220, height: 220 }} />
                  </View>
                )}
                <Text className="font-body-sm text-body-sm text-on-surface-variant text-center">
                  Abra o app do seu banco, escolha Pix e leia o QR code, ou use o código copia e cola.
                </Text>
                {!!pagamento.pixCopiaECola && (
                  <>
                    <Text className="font-ticket-data text-on-surface bg-surface-container rounded-xl p-3" numberOfLines={3} selectable style={{ fontSize: 11 }}>
                      {pagamento.pixCopiaECola}
                    </Text>
                    <TouchableOpacity onPress={copiarCodigo} className="flex-row items-center justify-center gap-2 rounded-xl py-4 bg-primary-container">
                      <MaterialIcons name={copiado ? "check" : "content-copy"} size={20} color="#ffffff" />
                      <Text className="font-headline-md text-white text-[15px]">{copiado ? "Código copiado" : "Copiar código Pix"}</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {pagamento.metodo === "CARTAO" && !!pagamento.checkoutUrl && (
              <View className="gap-4">
                <Text className="font-body-sm text-body-sm text-on-surface-variant text-center">
                  Você paga na página segura do Mercado Pago. Os dados do cartão não passam pelo Groov. Depois de pagar, volte aqui.
                </Text>
                <TouchableOpacity
                  onPress={() => void abrirCheckout(pagamento.checkoutUrl as string)}
                  className="flex-row items-center justify-center gap-2 rounded-xl py-4 bg-primary-container"
                >
                  <MaterialIcons name="lock" size={20} color="#ffffff" />
                  <Text className="font-headline-md text-white text-[15px]">Pagar com cartão</Text>
                </TouchableOpacity>
              </View>
            )}

            <View className="flex-row items-center justify-center gap-2 py-2">
              <ActivityIndicator color="#bc13fe" size="small" />
              <Text className="font-body-sm text-body-sm text-on-surface-variant">Confirmando o pagamento automaticamente…</Text>
            </View>
          </>
        )}

        {encerrado && (
          <View className="gap-4 items-center">
            <Text className="font-body-md text-body-md text-on-surface-variant text-center">
              {pagamento?.status === "EXPIRADO"
                ? "O prazo para pagar acabou e nada foi cobrado. Se você já pagou, aguarde alguns minutos: os ingressos aparecem no Perfil."
                : "O pagamento foi recusado e nada foi cobrado."}
            </Text>
            <TouchableOpacity onPress={tentarDeNovo} className="px-6 py-3 rounded-full border border-primary-container">
              <Text className="font-label-caps text-label-caps text-primary uppercase">Tentar de novo</Text>
            </TouchableOpacity>
          </View>
        )}
      </Tela>
  );
}
