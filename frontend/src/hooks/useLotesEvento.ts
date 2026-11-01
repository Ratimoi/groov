import { useEffect, useState } from "react";
import type { LoteVenda } from "../utils/lote";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

// Lotes à venda de um evento (e o título dele), usados na seleção de ingressos e no pagamento.
export function useLotesEvento(eventoId: string | undefined) {
  const [lotes, setLotes] = useState<LoteVenda[]>([]);
  const [tituloEvento, setTituloEvento] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let cancelado = false;
    async function buscaDados() {
      try {
        const [respostaLotes, respostaEvento] = await Promise.all([
          fetch(`${apiUrl}/eventos/${eventoId}/lotes`),
          fetch(`${apiUrl}/eventos/${eventoId}`),
        ]);
        if (!respostaLotes.ok) throw new Error(`HTTP ${respostaLotes.status}`);
        const dadosLotes = await respostaLotes.json();
        const dadosEvento = respostaEvento.ok ? await respostaEvento.json() : null;
        if (!cancelado) {
          setLotes(Array.isArray(dadosLotes) ? dadosLotes : []);
          setTituloEvento(dadosEvento?.titulo ?? "");
        }
      } catch (error) {
        console.error("Erro ao buscar lotes:", error);
        if (!cancelado) setErro(true);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }
    buscaDados();
    return () => {
      cancelado = true;
    };
  }, [eventoId, tentativa]);

  const tentarDeNovo = () => {
    setCarregando(true);
    setErro(false);
    setTentativa((valor) => valor + 1);
  };

  return { lotes, tituloEvento, carregando, erro, tentarDeNovo };
}
