// Prisma-Client als Singleton.
// In der Entwicklung sorgt der Next.js-Hot-Reload sonst dafür, dass bei jeder
// Code-Änderung ein neuer PrismaClient (und damit ein neuer DB-Verbindungspool)
// entsteht. Der globale Cache verhindert das.
//
// Prisma 7 ist "Rust-frei" und benötigt einen Treiber-Adapter. Für PostgreSQL
// ist das @prisma/adapter-pg; er baut den Verbindungspool aus DATABASE_URL.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL ist nicht gesetzt (siehe .env / .env.example).",
    );
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
