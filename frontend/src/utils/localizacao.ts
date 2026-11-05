import type { CentroMapa } from "./mapa";

// O módulo de localização é nativo: um APK antigo cairia aqui em vez de quebrar o app.
let Location: typeof import("expo-location") | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Location = require("expo-location");
} catch {
  Location = null;
}

export type ResultadoLocalizacao = { ok: true; posicao: CentroMapa } | { ok: false; motivo: string };

// Pede permissão (só quando em uso) e devolve a posição atual.
export async function obterPosicao(): Promise<ResultadoLocalizacao> {
  if (!Location) return { ok: false, motivo: "Atualize o app para usar a localização." };
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return { ok: false, motivo: "Sem permissão de localização. Libere nas configurações do aparelho." };
    const atual =
      (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { ok: true, posicao: { lat: atual.coords.latitude, lng: atual.coords.longitude } };
  } catch {
    return { ok: false, motivo: "Não foi possível obter a sua localização. Verifique se o GPS está ligado." };
  }
}
