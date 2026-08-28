import { PrismaClient } from "@prisma/client";

// Singleton do PrismaClient — evita abrir uma conexão nova a cada
// hot-reload do Next em desenvolvimento.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
