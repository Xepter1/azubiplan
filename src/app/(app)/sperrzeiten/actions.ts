"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";

const REVALIDATE = ["/sperrzeiten", "/einsatzplanung"];
function revalidate() {
  for (const p of REVALIDATE) revalidatePath(p);
}

function dateRange(formData: FormData) {
  const von = String(formData.get("von") ?? "");
  const bis = String(formData.get("bis") ?? "");
  if (!von || !bis) throw new Error("Bitte Von- und Bis-Datum angeben.");
  if (von > bis) throw new Error("Das Von-Datum liegt nach dem Bis-Datum.");
  return { von: new Date(von), bis: new Date(bis) };
}

// Sicherstellen, dass eine fremd-ID zum Mandanten gehört.
async function assertOwned(
  model: "apprentice" | "department" | "profession",
  id: string,
  tenantId: string,
) {
  // @ts-expect-error – dynamischer Modellzugriff, alle drei haben tenantId.
  const row = await prisma[model].findFirst({ where: { id, tenantId } });
  if (!row) throw new Error("Datensatz nicht gefunden.");
}

// --- Berufsschulplan ---
export async function createSchoolBlock(formData: FormData) {
  const tenant = await getActiveTenant();
  const professionId = String(formData.get("professionId") ?? "");
  if (!professionId) throw new Error("Bitte einen Beruf wählen.");
  await assertOwned("profession", professionId, tenant.id);
  const jahrRaw = String(formData.get("ausbildungsjahr") ?? "");
  const { von, bis } = dateRange(formData);

  await prisma.schoolBlock.create({
    data: {
      tenantId: tenant.id,
      professionId,
      ausbildungsjahr: jahrRaw ? Number(jahrRaw) : null,
      von,
      bis,
    },
  });
  revalidate();
}

export async function deleteSchoolBlock(formData: FormData) {
  const tenant = await getActiveTenant();
  const id = String(formData.get("id") ?? "");
  await prisma.schoolBlock.deleteMany({ where: { id, tenantId: tenant.id } });
  revalidate();
}

// --- Abwesenheit (Urlaub / Prüfung) ---
export async function createAbsence(formData: FormData) {
  const tenant = await getActiveTenant();
  const apprenticeId = String(formData.get("apprenticeId") ?? "");
  if (!apprenticeId) throw new Error("Bitte einen Azubi wählen.");
  await assertOwned("apprentice", apprenticeId, tenant.id);
  const typ = String(formData.get("typ") ?? "URLAUB");
  const { von, bis } = dateRange(formData);

  await prisma.absenceBlock.create({
    data: {
      tenantId: tenant.id,
      apprenticeId,
      typ: typ as "URLAUB" | "PRUEFUNG" | "PRUEFUNGSVORBEREITUNG",
      von,
      bis,
    },
  });
  revalidate();
}

export async function deleteAbsence(formData: FormData) {
  const tenant = await getActiveTenant();
  const id = String(formData.get("id") ?? "");
  await prisma.absenceBlock.deleteMany({ where: { id, tenantId: tenant.id } });
  revalidate();
}

// --- Abteilungssperre (z. B. Betriebsurlaub) ---
export async function createDeptBlock(formData: FormData) {
  const tenant = await getActiveTenant();
  const departmentId = String(formData.get("departmentId") ?? "");
  if (!departmentId) throw new Error("Bitte eine Abteilung wählen.");
  await assertOwned("department", departmentId, tenant.id);
  const grund = String(formData.get("grund") ?? "").trim() || null;
  const { von, bis } = dateRange(formData);

  await prisma.departmentBlock.create({
    data: { tenantId: tenant.id, departmentId, grund, von, bis },
  });
  revalidate();
}

export async function deleteDeptBlock(formData: FormData) {
  const tenant = await getActiveTenant();
  const id = String(formData.get("id") ?? "");
  await prisma.departmentBlock.deleteMany({ where: { id, tenantId: tenant.id } });
  revalidate();
}
