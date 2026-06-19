// Seed-Skript: Demo-Mandant mit je einem Login pro Rolle + Beispieldaten
// (inkl. Berufe, Abteilungen mit Eignung, Azubis verschiedener Jahrgänge, Rotationen).
//   Ausführen:  npm run db:seed
// Idempotent: ein vorhandener Demo-Mandant wird vorher inkl. Daten entfernt.
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
const d = (s: string) => new Date(s);

async function main() {
  await prisma.tenant.deleteMany({ where: { name: TENANT_NAME } });
  const tenant = await prisma.tenant.create({ data: { name: TENANT_NAME } });
  const tenantId = tenant.id;
  const pw = await bcrypt.hash("demo1234", 10);

  // --- Berufe ---
  const fiae = await prisma.profession.create({
    data: { tenantId, bezeichnung: "Fachinformatiker:in – Anwendungsentwicklung" },
  });
  const industrie = await prisma.profession.create({
    data: { tenantId, bezeichnung: "Industriekaufmann/-frau" },
  });
  const mecha = await prisma.profession.create({
    data: { tenantId, bezeichnung: "Mechatroniker:in" },
  });
  const elektro = await prisma.profession.create({
    data: { tenantId, bezeichnung: "Elektroniker:in" },
  });

  // --- Abteilungen ---
  const swe = await prisma.department.create({ data: { tenantId, name: "Softwareentwicklung", kapazitaet: 4 } });
  const itsys = await prisma.department.create({ data: { tenantId, name: "IT & Systemadministration", kapazitaet: 3 } });
  const kundenservice = await prisma.department.create({ data: { tenantId, name: "Kundenservice", kapazitaet: 3 } });
  const einkauf = await prisma.department.create({ data: { tenantId, name: "Einkauf", kapazitaet: 2 } });
  const fertigung = await prisma.department.create({ data: { tenantId, name: "Mechanische Fertigung", kapazitaet: 4 } });
  const montage = await prisma.department.create({ data: { tenantId, name: "Montage", kapazitaet: 4 } });
  const elektrowerkstatt = await prisma.department.create({ data: { tenantId, name: "Elektrowerkstatt", kapazitaet: 3 } });
  const qs = await prisma.department.create({ data: { tenantId, name: "Qualitätssicherung", kapazitaet: 2 } });

  // --- Eignung: welche Abteilung passt zu welchem Beruf ---
  await prisma.departmentProfession.createMany({
    data: [
      { tenantId, departmentId: swe.id, professionId: fiae.id },
      { tenantId, departmentId: itsys.id, professionId: fiae.id },
      { tenantId, departmentId: itsys.id, professionId: elektro.id },
      { tenantId, departmentId: kundenservice.id, professionId: industrie.id },
      { tenantId, departmentId: einkauf.id, professionId: industrie.id },
      { tenantId, departmentId: fertigung.id, professionId: mecha.id },
      { tenantId, departmentId: montage.id, professionId: mecha.id },
      { tenantId, departmentId: montage.id, professionId: elektro.id },
      { tenantId, departmentId: elektrowerkstatt.id, professionId: elektro.id },
      { tenantId, departmentId: elektrowerkstatt.id, professionId: mecha.id },
      { tenantId, departmentId: qs.id, professionId: mecha.id },
      { tenantId, departmentId: qs.id, professionId: fiae.id },
    ],
  });

  // --- Benutzer (ein Login pro Rolle, Passwort: demo1234) ---
  await prisma.user.create({ data: { tenantId, email: "admin@demo.de", name: "Anna Schmidt", role: "ADMIN", passwordHash: pw } });
  await prisma.user.create({ data: { tenantId, email: "ausbilder@demo.de", name: "Max Vogt", role: "AUSBILDER", passwordHash: pw } });
  await prisma.user.create({ data: { tenantId, email: "beauftragter@demo.de", name: "Petra Klein", role: "AUSBILDUNGSBEAUFTRAGTER", passwordHash: pw, departmentId: fertigung.id } });
  const azubiUser = await prisma.user.create({ data: { tenantId, email: "azubi@demo.de", name: "Leon Fischer", role: "AZUBI", passwordHash: pw } });

  // --- Auszubildende ---
  // Bezugspunkt für "Ausbildungsjahr": Start im September. Heute ~2026 → Start 2023 = 3. Jahr.
  const lisa = await prisma.apprentice.create({ data: { tenantId, vorname: "Lisa", nachname: "Hoffmann", professionId: fiae.id, start: d("2024-09-01"), ende: d("2027-08-31") } });
  const tim = await prisma.apprentice.create({ data: { tenantId, vorname: "Tim", nachname: "Wagner", professionId: fiae.id, start: d("2023-09-01"), ende: d("2026-08-31") } });
  const sophie = await prisma.apprentice.create({ data: { tenantId, vorname: "Sophie", nachname: "Braun", professionId: industrie.id, start: d("2024-09-01"), ende: d("2027-01-31") } });
  await prisma.apprentice.create({ data: { tenantId, vorname: "Leon", nachname: "Fischer", professionId: fiae.id, start: d("2025-09-01"), ende: d("2028-08-31"), userId: azubiUser.id } });

  // Mechatroniker:innen im 3. Ausbildungsjahr (Start 2023)
  const jonas = await prisma.apprentice.create({ data: { tenantId, vorname: "Jonas", nachname: "Becker", professionId: mecha.id, start: d("2023-09-01"), ende: d("2027-01-31") } });
  const mia = await prisma.apprentice.create({ data: { tenantId, vorname: "Mia", nachname: "Wolf", professionId: mecha.id, start: d("2023-09-01"), ende: d("2027-01-31") } });
  await prisma.apprentice.createMany({
    data: [
      { tenantId, vorname: "Finn", nachname: "Keller", professionId: mecha.id, start: d("2023-09-01"), ende: d("2027-01-31") },
      { tenantId, vorname: "Emma", nachname: "Richter", professionId: mecha.id, start: d("2023-09-01"), ende: d("2027-01-31") },
      { tenantId, vorname: "Paul", nachname: "Neumann", professionId: mecha.id, start: d("2023-09-01"), ende: d("2027-01-31") },
      // Elektroniker:innen zur Abgrenzung
      { tenantId, vorname: "Ben", nachname: "Schäfer", professionId: elektro.id, start: d("2024-09-01"), ende: d("2028-01-31") },
      { tenantId, vorname: "Clara", nachname: "Lang", professionId: elektro.id, start: d("2023-09-01"), ende: d("2027-01-31") },
    ],
  });

  // --- Einsätze / Rotationen (Status ergibt sich aus den Daten relativ zu heute) ---
  const timAbgeschlossen = await prisma.placement.create({
    data: { tenantId, apprenticeId: tim.id, departmentId: swe.id, von: d("2026-02-01"), bis: d("2026-05-31") },
  });
  await prisma.placement.createMany({
    data: [
      { tenantId, apprenticeId: lisa.id, departmentId: itsys.id, von: d("2026-06-01"), bis: d("2026-08-31") },
      { tenantId, apprenticeId: sophie.id, departmentId: kundenservice.id, von: d("2026-01-06"), bis: d("2026-04-03") },
      { tenantId, apprenticeId: sophie.id, departmentId: itsys.id, von: d("2026-07-01"), bis: d("2026-09-30") },
      { tenantId, apprenticeId: tim.id, departmentId: einkauf.id, von: d("2026-09-01"), bis: d("2026-12-15") },
      // Mechatroniker im aktuellen Quartal (damit der Planer direkt Bars zeigt)
      { tenantId, apprenticeId: jonas.id, departmentId: fertigung.id, von: d("2026-04-01"), bis: d("2026-06-30") },
      { tenantId, apprenticeId: mia.id, departmentId: elektrowerkstatt.id, von: d("2026-05-01"), bis: d("2026-06-30") },
    ],
  });

  // --- Beurteilung (1) auf den abgeschlossenen Einsatz von Tim ---
  const beauftragter = await prisma.user.findFirst({ where: { tenantId, email: "beauftragter@demo.de" } });
  await prisma.evaluation.create({
    data: {
      tenantId,
      placementId: timAbgeschlossen.id,
      bewertung: 2,
      kommentar: "Sehr engagiert, schnelle Auffassungsgabe.",
      evaluatorUserId: beauftragter?.id ?? null,
    },
  });

  const azubiCount = await prisma.apprentice.count({ where: { tenantId } });
  console.log(`✅ Seed fertig: "${tenant.name}" — ${azubiCount} Azubis, 8 Abteilungen, 4 Berufe.`);
  console.log("   Logins — Passwort jeweils: demo1234");
  console.log("   • admin@demo.de  • ausbilder@demo.de  • beauftragter@demo.de  • azubi@demo.de");
}

main()
  .catch((e) => {
    console.error("❌ Seed fehlgeschlagen:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
