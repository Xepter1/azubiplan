// Seed-Skript: Demo-Mandant mit je einem Login pro Rolle + Beispieldaten.
//   Ausführen:  npm run db:seed
// Idempotent: ein vorhandener Demo-Mandant wird vorher inkl. Daten entfernt.
//
// Hinweis: generierter Client über RELATIVEN Pfad (nicht @/-Alias), damit das
// Skript via tsx außerhalb des Next.js-Bundlers läuft.
import "dotenv/config";
import bcrypt from "bcryptjs";
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
  const tenantId = tenant.id;

  // Alle Demo-Logins nutzen dasselbe Passwort.
  const pw = await bcrypt.hash("demo1234", 10);

  // --- Abteilungen ---
  const swe = await prisma.department.create({
    data: { tenantId, name: "Softwareentwicklung", kapazitaet: 4 },
  });
  const itsys = await prisma.department.create({
    data: { tenantId, name: "IT & Systemadministration", kapazitaet: 3 },
  });
  const kundenservice = await prisma.department.create({
    data: { tenantId, name: "Kundenservice", kapazitaet: 3 },
  });
  const einkauf = await prisma.department.create({
    data: { tenantId, name: "Einkauf", kapazitaet: 2 },
  });

  // --- Benutzer (ein Login pro Rolle) ---
  await prisma.user.create({
    data: { tenantId, email: "admin@demo.de", name: "Anna Schmidt", role: "ADMIN", passwordHash: pw },
  });
  await prisma.user.create({
    data: { tenantId, email: "ausbilder@demo.de", name: "Max Vogt", role: "AUSBILDER", passwordHash: pw },
  });
  await prisma.user.create({
    data: {
      tenantId,
      email: "beauftragter@demo.de",
      name: "Petra Klein",
      role: "AUSBILDUNGSBEAUFTRAGTER",
      passwordHash: pw,
      departmentId: swe.id,
    },
  });
  const azubiUser = await prisma.user.create({
    data: { tenantId, email: "azubi@demo.de", name: "Leon Fischer", role: "AZUBI", passwordHash: pw },
  });

  // --- Berufe ---
  const fiae = await prisma.profession.create({
    data: { tenantId, bezeichnung: "Fachinformatiker:in – Anwendungsentwicklung" },
  });
  const industrie = await prisma.profession.create({
    data: { tenantId, bezeichnung: "Industriekaufmann/-frau" },
  });

  // --- Auszubildende ---
  const lisa = await prisma.apprentice.create({
    data: { tenantId, vorname: "Lisa", nachname: "Hoffmann", professionId: fiae.id, start: new Date("2024-09-01"), ende: new Date("2027-08-31") },
  });
  const tim = await prisma.apprentice.create({
    data: { tenantId, vorname: "Tim", nachname: "Wagner", professionId: fiae.id, start: new Date("2023-09-01"), ende: new Date("2026-08-31") },
  });
  const sophie = await prisma.apprentice.create({
    data: { tenantId, vorname: "Sophie", nachname: "Braun", professionId: industrie.id, start: new Date("2024-09-01"), ende: new Date("2027-01-31") },
  });
  const leon = await prisma.apprentice.create({
    data: {
      tenantId,
      vorname: "Leon",
      nachname: "Fischer",
      professionId: fiae.id,
      start: new Date("2025-09-01"),
      ende: new Date("2028-08-31"),
      userId: azubiUser.id, // Azubi-Login mit Datensatz verknüpfen
    },
  });

  // --- Einsätze / Rotationen (Status ergibt sich aus den Daten relativ zu heute) ---
  const timAbgeschlossen = await prisma.placement.create({
    data: { tenantId, apprenticeId: tim.id, departmentId: swe.id, von: new Date("2026-02-01"), bis: new Date("2026-05-31") },
  });
  await prisma.placement.createMany({
    data: [
      { tenantId, apprenticeId: lisa.id, departmentId: itsys.id, von: new Date("2026-06-01"), bis: new Date("2026-08-31") },
      { tenantId, apprenticeId: sophie.id, departmentId: kundenservice.id, von: new Date("2026-01-06"), bis: new Date("2026-04-03") },
      { tenantId, apprenticeId: sophie.id, departmentId: itsys.id, von: new Date("2026-07-01"), bis: new Date("2026-09-30") },
      { tenantId, apprenticeId: leon.id, departmentId: swe.id, von: new Date("2026-06-01"), bis: new Date("2026-08-31") },
      { tenantId, apprenticeId: tim.id, departmentId: einkauf.id, von: new Date("2026-09-01"), bis: new Date("2026-12-15") },
    ],
  });

  // --- Beurteilung (1) auf den abgeschlossenen Einsatz von Tim ---
  const beauftragter = await prisma.user.findFirst({
    where: { tenantId, email: "beauftragter@demo.de" },
  });
  await prisma.evaluation.create({
    data: {
      tenantId,
      placementId: timAbgeschlossen.id,
      bewertung: 2,
      kommentar: "Sehr engagiert, schnelle Auffassungsgabe.",
      evaluatorUserId: beauftragter?.id ?? null,
    },
  });

  console.log(`✅ Seed fertig: Mandant "${tenant.name}" (4 Azubis, 4 Abteilungen, 6 Rotationen, 1 Beurteilung)`);
  console.log("   Logins — Passwort jeweils: demo1234");
  console.log("   • admin@demo.de         → Administrator (sieht alles)");
  console.log("   • ausbilder@demo.de     → Ausbilder:in");
  console.log("   • beauftragter@demo.de  → Ausbildungsbeauftragte:r");
  console.log("   • azubi@demo.de         → Auszubildende:r (nur Dashboard + Beurteilungen)");
}

main()
  .catch((e) => {
    console.error("❌ Seed fehlgeschlagen:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
