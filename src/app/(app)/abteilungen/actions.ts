"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant";

// Kapazität aus dem Formular lesen (leer = null, sonst positive Ganzzahl).
function parseKapazitaet(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Legt eine Abteilung an und springt direkt in deren Bearbeiten-Ansicht,
// damit man sofort Lerninhalte zuordnen kann.
export async function createDepartment(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Bitte einen Namen für die Abteilung eingeben.");
  const kapazitaet = parseKapazitaet(String(formData.get("kapazitaet") ?? ""));

  const tenantId = await getCurrentTenantId();
  const dept = await prisma.department.create({
    data: { tenantId, name, kapazitaet },
  });

  revalidatePath("/abteilungen");
  redirect(`/abteilungen/${dept.id}`);
}

// Aktualisiert Name und Kapazität einer Abteilung.
export async function updateDepartment(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) throw new Error("Name fehlt.");
  const kapazitaet = parseKapazitaet(String(formData.get("kapazitaet") ?? ""));

  const tenantId = await getCurrentTenantId();
  await prisma.department.updateMany({
    where: { id, tenantId, deletedAt: null },
    data: { name, kapazitaet },
  });

  revalidatePath(`/abteilungen/${id}`);
  revalidatePath("/abteilungen");
}

// Soft-Delete einer Abteilung.
export async function softDeleteDepartment(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const tenantId = await getCurrentTenantId();
  await prisma.department.updateMany({
    where: { id, tenantId, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/abteilungen");
  redirect("/abteilungen");
}

// Ordnet der Abteilung einen Lerninhalt zu ("diese Abteilung vermittelt das").
// Wird per Drag & Drop aus der Client-Komponente aufgerufen.
export async function addTaughtContent(
  departmentId: string,
  learningContentId: string,
) {
  if (!departmentId || !learningContentId) return;

  const tenantId = await getCurrentTenantId();
  const dept = await prisma.department.findFirst({
    where: { id: departmentId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!dept) throw new Error("Abteilung nicht gefunden.");

  // Idempotent (unique departmentId+learningContentId) → Doppel-Drop ist harmlos.
  await prisma.taughtContent.upsert({
    where: {
      departmentId_learningContentId: { departmentId, learningContentId },
    },
    create: { tenantId, departmentId, learningContentId },
    update: {},
  });

  revalidatePath(`/abteilungen/${departmentId}`);
}

// Hebt die Zuordnung Abteilung ↔ Lerninhalt wieder auf.
export async function removeTaughtContent(
  departmentId: string,
  learningContentId: string,
) {
  if (!departmentId || !learningContentId) return;

  const tenantId = await getCurrentTenantId();
  await prisma.taughtContent.deleteMany({
    where: { tenantId, departmentId, learningContentId },
  });

  revalidatePath(`/abteilungen/${departmentId}`);
}
