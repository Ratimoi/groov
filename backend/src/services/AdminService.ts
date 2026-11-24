import prisma from "../config/prisma";
import { aplicarSeed } from "../seed/aplicarSeed";
import { AppError } from "../utils/AppError";

export class AdminService {
  // Apaga todos os dados (inclusive os eventos das contas liberadas), menos as próprias contas com
  // `podeResetarSeed`, e recria os dados de demonstração do seed.
  // Recusado em produção: o banco real nunca deve ser zerado por uma chamada da API.
  async resetarSeed(): Promise<{ mensagem: string }> {
    if (process.env.NODE_ENV === "production") {
      throw new AppError("Resetar o banco não é permitido em produção", 403);
    }
    if (!process.env.SEED_PASSWORD) {
      throw new AppError("SEED_PASSWORD não está definida no servidor", 500);
    }

    await prisma.$transaction(
      async (tx) => {
        // Filhos antes dos pais, por causa das chaves estrangeiras.
        await tx.validacaoIngresso.deleteMany();
        await tx.ingresso.deleteMany();
        await tx.participanteCompra.deleteMany();
        await tx.compraGrupo.deleteMany();
        await tx.pedido.deleteMany();
        await tx.avaliacaoEvento.deleteMany();
        await tx.conviteGrupo.deleteMany();
        await tx.membroGrupo.deleteMany();
        await tx.grupo.deleteMany();
        await tx.lote.deleteMany();
        await tx.evento.deleteMany();
        await tx.categoria.deleteMany();
        // Eventos, pedidos e grupos já foram apagados acima, então as contas liberadas ficam sem vínculos.
        await tx.usuario.deleteMany({ where: { podeResetarSeed: false } });

        await aplicarSeed(tx, process.env.SEED_PASSWORD);
      },
      { timeout: 60_000 },
    );

    return { mensagem: "Banco resetado com os dados do seed" };
  }
}
