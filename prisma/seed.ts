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

  // --- Eignung: welche Abteilung passt zu welchem Beruf (inkl. Soll-Wochen) ---
  await prisma.departmentProfession.createMany({
    data: [
      { tenantId, departmentId: swe.id, professionId: fiae.id, sollWochen: 12 },
      { tenantId, departmentId: itsys.id, professionId: fiae.id, sollWochen: 8 },
      { tenantId, departmentId: itsys.id, professionId: elektro.id, sollWochen: 8 },
      { tenantId, departmentId: kundenservice.id, professionId: industrie.id, sollWochen: 10 },
      { tenantId, departmentId: einkauf.id, professionId: industrie.id, sollWochen: 8 },
      { tenantId, departmentId: fertigung.id, professionId: mecha.id, sollWochen: 12 },
      { tenantId, departmentId: montage.id, professionId: mecha.id, sollWochen: 8 },
      { tenantId, departmentId: montage.id, professionId: elektro.id, sollWochen: 8 },
      { tenantId, departmentId: elektrowerkstatt.id, professionId: elektro.id, sollWochen: 6 },
      { tenantId, departmentId: elektrowerkstatt.id, professionId: mecha.id, sollWochen: 6 },
      { tenantId, departmentId: qs.id, professionId: mecha.id, sollWochen: 4 },
      { tenantId, departmentId: qs.id, professionId: fiae.id, sollWochen: 4 },
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
  const leon = await prisma.apprentice.create({ data: { tenantId, vorname: "Leon", nachname: "Fischer", professionId: fiae.id, start: d("2025-09-01"), ende: d("2028-08-31"), userId: azubiUser.id } });

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
      // Mechatronikerin im aktuellen Quartal (damit der Planer direkt Bars zeigt)
      { tenantId, apprenticeId: mia.id, departmentId: elektrowerkstatt.id, von: d("2026-05-01"), bis: d("2026-06-30") },
    ],
  });

  // Stationsverläufe für aussagekräftige Profile (erledigt → läuft → geplant).
  // Lisa (FIAE): Softwareentwicklung abgeschlossen, IT läuft, QS noch offen.
  const lisaSwe = await prisma.placement.create({
    data: { tenantId, apprenticeId: lisa.id, departmentId: swe.id, von: d("2025-09-01"), bis: d("2026-02-28") },
  });
  // Jonas (Mechatroniker, 3. Jahr): zwei Stationen erledigt, eine läuft, QS geplant.
  const jonasMontage = await prisma.placement.create({
    data: { tenantId, apprenticeId: jonas.id, departmentId: montage.id, von: d("2025-09-01"), bis: d("2026-01-31") },
  });
  const jonasElektro = await prisma.placement.create({
    data: { tenantId, apprenticeId: jonas.id, departmentId: elektrowerkstatt.id, von: d("2026-02-01"), bis: d("2026-03-31") },
  });
  await prisma.placement.createMany({
    data: [
      // Jonas: Fertigung läuft aktuell, QS ist eingeplant.
      { tenantId, apprenticeId: jonas.id, departmentId: fertigung.id, von: d("2026-06-01"), bis: d("2026-08-31") },
      { tenantId, apprenticeId: jonas.id, departmentId: qs.id, von: d("2026-10-01"), bis: d("2026-12-20") },
    ],
  });

  // --- Beurteilungen auf abgeschlossene Einsätze ---
  const beauftragter = await prisma.user.findFirst({ where: { tenantId, email: "beauftragter@demo.de" } });
  await prisma.evaluation.createMany({
    data: [
      { tenantId, placementId: timAbgeschlossen.id, bewertung: 2, kommentar: "Sehr engagiert, schnelle Auffassungsgabe.", evaluatorUserId: beauftragter?.id ?? null },
      { tenantId, placementId: lisaSwe.id, bewertung: 2, kommentar: "Solide Einarbeitung, sauberer Code.", evaluatorUserId: beauftragter?.id ?? null },
      { tenantId, placementId: jonasMontage.id, bewertung: 1, kommentar: "Hervorragende handwerkliche Präzision.", evaluatorUserId: beauftragter?.id ?? null },
      { tenantId, placementId: jonasElektro.id, bewertung: 3, kommentar: "Gute Fortschritte, Dokumentation ausbaufähig.", evaluatorUserId: beauftragter?.id ?? null },
    ],
  });

  // --- Berufsschulplan (Blockunterricht) ---
  await prisma.schoolBlock.createMany({
    data: [
      // Mechatroniker 3. Jahr — Blockwoche im Oktober (überschneidet Jonas' QS-Einsatz).
      { tenantId, professionId: mecha.id, ausbildungsjahr: 3, von: d("2026-10-12"), bis: d("2026-10-16") },
      { tenantId, professionId: mecha.id, ausbildungsjahr: 3, von: d("2026-11-23"), bis: d("2026-11-27") },
      // FIAE alle Jahrgänge — Blockwoche im Juli (überschneidet Lisas IT-Einsatz).
      { tenantId, professionId: fiae.id, ausbildungsjahr: null, von: d("2026-07-13"), bis: d("2026-07-17") },
    ],
  });

  // --- Abwesenheiten (Urlaub / Prüfung) ---
  await prisma.absenceBlock.createMany({
    data: [
      // Lisa: Urlaub mitten im IT-Einsatz → Hinweis am Block.
      { tenantId, apprenticeId: lisa.id, typ: "URLAUB", von: d("2026-08-10"), bis: d("2026-08-21") },
      // Jonas: Urlaub über die Feiertage (nach dem QS-Einsatz).
      { tenantId, apprenticeId: jonas.id, typ: "URLAUB", von: d("2026-12-21"), bis: d("2026-12-31") },
      // Tim: Prüfungsvorbereitung im Frühjahr.
      { tenantId, apprenticeId: tim.id, typ: "PRUEFUNGSVORBEREITUNG", von: d("2027-05-03"), bis: d("2027-05-14") },
    ],
  });

  // --- Gesperrte Abteilungszeiträume (Betriebsurlaub) ---
  await prisma.departmentBlock.createMany({
    data: [
      // Fertigung im August dicht → überschneidet Jonas' Fertigungseinsatz.
      { tenantId, departmentId: fertigung.id, grund: "Betriebsurlaub", von: d("2026-08-03"), bis: d("2026-08-14") },
      // Logistik … (Montage) Jahreswechsel gesperrt.
      { tenantId, departmentId: montage.id, grund: "Betriebsurlaub", von: d("2026-12-24"), bis: d("2027-01-02") },
    ],
  });

  // --- Kapazitäts-Demo: QS (max. 2) im Herbst mit 3 Mechatroniker:innen ---
  const mechaAzubis = await prisma.apprentice.findMany({
    where: { tenantId, professionId: mecha.id },
    orderBy: { vorname: "asc" },
  });
  // Jonas hat bereits einen QS-Einsatz (Okt–Dez). Zwei weitere überlappen ihn → 3 > 2.
  const weitere = mechaAzubis.filter((a) => a.id !== jonas.id).slice(0, 2);
  await prisma.placement.createMany({
    data: weitere.map((a) => ({
      tenantId,
      apprenticeId: a.id,
      departmentId: qs.id,
      von: d("2026-10-15"),
      bis: d("2026-12-15"),
    })),
  });

  // --- Demo-Daten für den Azubi-Login (Leon Fischer, azubi@demo.de) ---
  // Drei Stationen: Softwareentwicklung erledigt, IT läuft, QS geplant.
  await prisma.placement.createMany({
    data: [
      { tenantId, apprenticeId: leon.id, departmentId: swe.id, von: d("2026-01-05"), bis: d("2026-04-24") },
      { tenantId, apprenticeId: leon.id, departmentId: itsys.id, von: d("2026-05-04"), bis: d("2026-07-31") },
      { tenantId, apprenticeId: leon.id, departmentId: qs.id, von: d("2026-09-07"), bis: d("2026-11-27") },
    ],
  });
  // Berufsschulwoche bald + Urlaub im Sommer.
  await prisma.schoolBlock.create({
    data: { tenantId, professionId: fiae.id, ausbildungsjahr: null, von: d("2026-06-22"), bis: d("2026-06-26") },
  });
  await prisma.absenceBlock.create({
    data: { tenantId, apprenticeId: leon.id, typ: "URLAUB", von: d("2026-08-10"), bis: d("2026-08-21") },
  });
  // Beispiel-Noten (Berufsschule).
  await prisma.grade.createMany({
    data: [
      { tenantId, apprenticeId: leon.id, fach: "Programmierung", wert: 2.0, datum: d("2026-02-13") },
      { tenantId, apprenticeId: leon.id, fach: "Datenbanken", wert: 1.7, datum: d("2026-04-17") },
      { tenantId, apprenticeId: leon.id, fach: "Wirtschaft & Soziales", wert: 2.3, datum: d("2026-03-20") },
    ],
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
