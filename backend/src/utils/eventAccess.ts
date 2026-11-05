import type { AuthUser } from "../types/auth";
import { AppError } from "./AppError";

// Gerente do evento é quem o publicou; o ADMIN cuida do software, não dos eventos (só modera, via /admin).
// Eventos (e seus lotes) são públicos, então quem não pode gerenciar recebe 403, e não 404.
export function assertCanManageEvent(criadoPorId: string | null, actor: AuthUser): void {
  if (criadoPorId !== actor.id) {
    throw new AppError("Somente o criador do evento pode fazer isso", 403);
  }
}
