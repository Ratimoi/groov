import { useEffect, useState } from "react";
import { calcularContagem } from "../utils/evento";

export function useContagem(alvo: Date | string | null | undefined) {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const intervalo = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  return calcularContagem(alvo, agora);
}
