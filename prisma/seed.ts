// Seed-Skript: legt einen Demo-Mandanten mit Beispieldaten an.
//   Ausführen:  npm run db:seed
// Idempotent: ein vorhandener Demo-Mandant wird vorher inkl. Daten entfernt.
//
// Hinweis: Wir importieren den generierten Client über einen RELATIVEN Pfad
// (nicht über das @/-Alias), damit das Skript auch außerhalb des Next.js-Bundlers
// (hier: via tsx) läuft.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL ist nicht gesetzt (siehe .env).");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const TENANT_NAME = "Demo GmbH";

async function main() {
  // Vorhandenen Demo-Mandanten samt aller Kinder entfernen (onDelete: Cascade).
  await prisma.tenant.deleteMany({ where: { name: TENANT_NAME } });

  const tenant = await prisma.tenant.create({ data: { name: TENANT_NAME } });

  const fiae = await prisma.profession.create({
    data: {
      tenantId: tenant.id,
      bezeichnung: "Fachinformatiker:in – Anwendungsentwicklung",
    },
  });
  const industrie = await prisma.profession.create({
    data: { tenantId: tenant.id, bezeichnung: "Industriekaufmann/-frau" },
  });

  await prisma.department.createMany({
    data: [
      { tenantId: tenant.id, name: "Softwareentwicklung", kapazitaet: 4 },
      { tenantId: tenant.id, name: "IT-Support", kapazitaet: 2 },
      { tenantId: tenant.id, name: "Einkauf", kapazitaet: 3 },
      { tenantId: tenant.id, name: "Personal", kapazitaet: 2 },
    ],
  });

  await prisma.apprentice.createMany({
    data: [
      {
        tenantId: tenant.id,
        vorname: "Lena",
        nachname: "Bauer",
        professionId: fiae.id,
        start: new Date("2024-09-01"),
        ende: new Date("2027-08-31"),
      },
      {
        tenantId: tenant.id,
        vorname: "Tim",
        nachname: "Schneider",
        professionId: fiae.id,
        start: new Date("2023-09-01"),
        ende: new Date("2026-08-31"),
      },
      {
        tenantId: tenant.id,
        vorname: "Aylin",
        nachname: "Demir",
        professionId: industrie.id,
        start: new Date("2024-09-01"),
        ende: new Date("2027-01-31"),
      },
    ],
  });

  const count = await prisma.apprentice.count({
    where: { tenantId: tenant.id },
  });
  console.log(
    `✅ Seed fertig: Mandant "${tenant.name}" mit ${count} Azubis, 2 Berufen und 4 Abteilungen.`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Seed fehlgeschlagen:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
