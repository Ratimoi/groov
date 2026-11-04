import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import process from "process";
import { aplicarSeed } from "../src/seed/aplicarSeed";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
    try {
        await aplicarSeed(prisma, process.env.SEED_PASSWORD, console.log);
    } catch (error) {
        console.error("Erro nas Inclusões (Seeds):", error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main()
    .then(() => console.log("Seed finalizado!"))
    .catch(() => process.exit(1));
