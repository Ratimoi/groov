import { Share } from "react-native";
import { api } from "./api";

// Link que abre o app na tela de entrada (esquema `groov` do app.json).
export const linkConvite = (codigo: string) => `groov://entrar-grupo?codigo=${codigo}`;

// Pede o código do grupo (só o líder consegue) e abre a folha de compartilhamento do celular.
export async function compartilharConvite(grupoId: string, nomeGrupo: string, token: string | null) {
  const { codigo } = await api<{ codigo: string }>(`/grupos/${grupoId}/convite`, { method: "POST", token });
  await Share.share({
    message:
      `Entra no meu grupo "${nomeGrupo}" no Groov e a gente paga menos no ingresso!\n\n` +
      `Abra o link: ${linkConvite(codigo)}\n` +
      `Ou, no app, vá em Grupos > Entrar com código e digite: ${codigo}`,
  });
}
