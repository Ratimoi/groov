import { useEffect, useMemo, useRef, useState, type ComponentType, type Ref } from "react";
import { Text, View } from "react-native";
import { CENTRO_PADRAO, htmlMapaEventos, htmlSeletorPonto, type CentroMapa, type PontoMapa } from "../utils/mapa";

// O WebView é nativo: um APK antigo cairia no aviso em vez de quebrar a tela.
type WebViewInstancia = import("react-native-webview").WebView;
let WebView: ComponentType<import("react-native-webview").WebViewProps & { ref?: Ref<WebViewInstancia> }> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  WebView = require("react-native-webview").WebView;
} catch {
  WebView = null;
}

function SemMapa({ altura }: { altura: number }) {
  return (
    <View className="items-center justify-center rounded-2xl bg-surface-container-low border border-white/10 px-6" style={{ height: altura }}>
      <Text className="font-body-md text-body-md text-on-surface-variant text-center">Atualize o app para ver o mapa.</Text>
    </View>
  );
}

type PropsMapa = {
  pontos: PontoMapa[];
  centro?: CentroMapa;
  euAqui?: CentroMapa | null;
  altura: number;
  onAbrir: (id: string) => void;
};

// Mapa com os eventos como marcadores; tocar no marcador abre o balão com o botão "Ver evento".
export function MapaEventos({ pontos, centro = CENTRO_PADRAO, euAqui = null, altura, onAbrir }: PropsMapa) {
  // O HTML só muda quando os dados mudam; recarregar o WebView à toa faria o mapa piscar.
  const html = useMemo(() => htmlMapaEventos(pontos, centro, euAqui), [pontos, centro, euAqui]);
  if (!WebView) return <SemMapa altura={altura} />;
  return (
    <View className="rounded-2xl overflow-hidden border border-white/10" style={{ height: altura }}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        javaScriptEnabled
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data) as { tipo: string; id?: string };
            if (msg.tipo === "abrir" && msg.id) onAbrir(msg.id);
          } catch {
            // mensagem que não é nossa
          }
        }}
      />
    </View>
  );
}

type PropsSeletor = {
  ponto: CentroMapa | null;
  centro?: CentroMapa;
  altura?: number;
  onEscolher: (ponto: CentroMapa) => void;
};

// Mapa para marcar o local do evento com um toque.
export function SeletorPonto({ ponto, centro = CENTRO_PADRAO, altura = 260, onEscolher }: PropsSeletor) {
  // O HTML parte do ponto inicial e depois o próprio mapa guarda o marcador.
  const [inicial] = useState(ponto);
  const html = useMemo(() => htmlSeletorPonto(inicial, centro), [inicial, centro]);
  const ref = useRef<WebViewInstancia>(null);

  // Quando o ponto muda por fora (botão "usar minha localização"), move o marcador sem recarregar.
  useEffect(() => {
    if (ponto) ref.current?.injectJavaScript(`window.moverPara&&window.moverPara(${ponto.lat},${ponto.lng});true;`);
  }, [ponto]);

  if (!WebView) return <SemMapa altura={altura} />;
  return (
    <View className="rounded-2xl overflow-hidden border border-white/10" style={{ height: altura }}>
      <WebView
        ref={ref}
        originWhitelist={["*"]}
        source={{ html }}
        javaScriptEnabled
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data) as { tipo: string; lat?: number; lng?: number };
            if (msg.tipo === "ponto" && typeof msg.lat === "number" && typeof msg.lng === "number") {
              onEscolher({ lat: msg.lat, lng: msg.lng });
            }
          } catch {
            // mensagem que não é nossa
          }
        }}
      />
    </View>
  );
}
