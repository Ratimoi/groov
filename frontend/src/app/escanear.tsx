import { useRef, useState } from "react";
import { ActivityIndicator, Linking, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUser } from "@/contexts/UserContext";
import { CabecalhoGroov } from "../components/CabecalhoGroov";
import { api, ApiError } from "../utils/api";
import type { ValidacaoApi } from "../utils/compras";

// O módulo da câmera é nativo: um APK antigo (sem ele) receberia esta tela por atualização OTA.
// Carregando dentro do try, o app segue funcionando e a tela pede a versão nova.
let Camera: typeof import("expo-camera") | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Camera = require("expo-camera");
} catch {
  Camera = null;
}

const COR = { VALIDO: "#10b981", JA_UTILIZADO: "#f59e0b", INVALIDO: "#ef4444" } as const;
const ICONE = { VALIDO: "check-circle", JA_UTILIZADO: "history", INVALIDO: "cancel" } as const;

export default function Escanear() {
  const router = useRouter();
  const { token, user } = useUser();
  const [permissao, pedirPermissao] = Camera?.useCameraPermissions() ?? [null, async () => null];
  const [lendo, setLendo] = useState(false);
  const [resultado, setResultado] = useState<ValidacaoApi | null>(null);
  const [falha, setFalha] = useState("");
  const emUso = useRef(false);

  const voltar = () => (router.canGoBack() ? router.back() : router.replace("/perfil"));
  const proximo = () => {
    setResultado(null);
    setFalha("");
    emUso.current = false;
  };

  async function aoLer(codigo: string) {
    if (emUso.current) return;
    emUso.current = true;
    setLendo(true);
    try {
      setResultado(await api<ValidacaoApi>("/ingressos/validar", { token, method: "POST", body: { codigo } }));
    } catch (error) {
      // 404 e 409 também trazem a resposta de validação no corpo.
      const corpo = error instanceof ApiError ? (error.corpo as Partial<ValidacaoApi> | null) : null;
      if (corpo?.resultado && corpo.mensagem) setResultado(corpo as ValidacaoApi);
      else setFalha(error instanceof ApiError ? error.message : "Não foi possível validar. Tente de novo.");
    } finally {
      setLendo(false);
    }
  }

  const cabecalho = <CabecalhoGroov esquerda={{ icone: "arrow-back", onPress: voltar, rotulo: "Voltar" }} />;
  const aviso = (texto: string, acao?: { rotulo: string; onPress: () => void }) => (
    <View className="flex-1 bg-background">
      {cabecalho}
      <View className="flex-1 items-center justify-center px-margin-mobile gap-4">
        <MaterialIcons name="qr-code-scanner" size={48} color="#504254" />
        <Text className="font-body-md text-body-md text-on-surface text-center">{texto}</Text>
        {acao && (
          <TouchableOpacity onPress={acao.onPress} className="bg-primary-container rounded-xl px-6 py-3">
            <Text className="font-label-caps text-label-caps text-white uppercase">{acao.rotulo}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (user?.papel !== "ADMIN") return aviso("Só administradores podem validar ingressos.");
  if (!Camera) return aviso("Esta versão do app não tem leitor de QR code. Instale a versão mais recente do Groov.");
  if (!permissao) return <View className="flex-1 bg-background" />;
  if (!permissao.granted) {
    return aviso(
      "Precisamos da câmera para ler o QR code dos ingressos.",
      permissao.canAskAgain
        ? { rotulo: "Permitir câmera", onPress: () => void pedirPermissao() }
        : { rotulo: "Abrir configurações", onPress: () => void Linking.openSettings() },
    );
  }

  const { CameraView } = Camera;
  const ingresso = resultado?.ingresso;

  return (
    <View className="flex-1 bg-background">
      {cabecalho}
      <View className="flex-1">
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={resultado || falha ? undefined : ({ data }) => void aoLer(data)}
        />

        {!resultado && !falha && (
          <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
            <View className="w-64 h-64 rounded-3xl border-2 border-primary-container" />
            <Text className="font-body-sm text-body-sm text-white mt-6 bg-black/60 px-3 py-1 rounded-full">
              {lendo ? "Validando..." : "Aponte para o QR code do ingresso"}
            </Text>
          </View>
        )}

        {lendo && (
          <View className="absolute inset-0 items-center justify-center bg-black/40">
            <ActivityIndicator color="#bc13fe" size="large" />
          </View>
        )}

        {(resultado || falha) && (
          <View className="absolute inset-x-0 bottom-0 p-5 pb-10 rounded-t-3xl bg-surface-container-low border-t border-white/10 gap-3">
            <View className="flex-row items-center gap-3">
              <MaterialIcons
                name={resultado ? ICONE[resultado.resultado] : "error"}
                size={40}
                color={resultado ? COR[resultado.resultado] : COR.INVALIDO}
              />
              <Text
                className="flex-1 font-headline-md text-headline-md"
                style={{ color: resultado ? COR[resultado.resultado] : COR.INVALIDO }}
              >
                {resultado ? resultado.mensagem : falha}
              </Text>
            </View>

            {!!ingresso && (
              <View className="gap-0.5">
                <Text className="font-body-md text-body-md font-bold text-white" numberOfLines={1}>
                  {ingresso.evento.titulo}
                </Text>
                <Text className="font-body-sm text-body-sm text-on-surface-variant">
                  {ingresso.lote.nome} • {ingresso.dono.nome} (@{ingresso.dono.username})
                </Text>
              </View>
            )}

            <TouchableOpacity onPress={proximo} activeOpacity={0.8} className="bg-primary-container rounded-xl py-3.5 items-center mt-1">
              <Text className="font-label-caps text-label-caps text-white uppercase">Ler próximo</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
