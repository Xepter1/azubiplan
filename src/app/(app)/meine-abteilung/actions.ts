"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getActiveTenant, requireSession } from "@/lib/tenant";

// Abteilung des angemeldeten Ausbildungsbeauftragten (aus User.departmentId).
async function getOwnDepartment() {
  const session = await requireSession();
  const tenant = await getActiveTenant();
  const user = await prisma.user.findFirst({
    where: { id: session.user.id, tenantId: tenant.id },
    select: { departmentId: true },
  });
  if (!user?.departmentId) {
    throw new Error("Dir ist keine Abteilung zugeordnet.");
  }
  return { tenantId: tenant.id, departmentId: user.departmentId, userId: session.user.id };
}

// Bewertungsbogen speichern — als Entwurf (mode=draft) oder abgeschickt (mode=submit).
export async function saveEvaluation(formData: FormData) {
  const { tenantId, departmentId, userId } = await getOwnDepartment();
  const placementId = String(formData.get("placementId") ?? "");
  const mode = String(formData.get("mode") ?? "draft");

  // Sicherheit: Der Einsatz muss zu MEINER Abteilung gehören.
  const placement = await prisma.placement.findFirst({
    where: { id: placementId, tenantId, departmentId, deletedAt: null },
    select: { id: true },
  });
  if (!placement) {
    throw new Error("Einsatz nicht gefunden oder gehört nicht zu deiner Abteilung.");
  }

  const star = (key: string) => {
    const n = Number(formData.get(key));
    return n >= 1 && n <= 5 ? n : null;
  };
  const fachlich = star("fachlich");
  const selbststaendigkeit = star("selbststaendigkeit");
  const sorgfalt = star("sorgfalt");
  const teamverhalten = star("teamverhalten");
  const kommentar = String(formData.get("kommentar") ?? "").trim() || null;

  let bewertung: number | null = null;
  let submittedAt: Date | null = null;
  if (mode === "submit") {
    const stars = [fachlich, selbststaendigkeit, sorgfalt, teamverhalten];
    if (!stars.every((v) => v != null)) {
      throw new Error("Bitte alle vier Kriterien bewerten, bevor du abschickst.");
    }
    // Sterne (5 = beste) → Gesamtnote (1 = beste) fürs Profil.
    const avg = (fachlich! + selbststaendigkeit! + sorgfalt! + teamverhalten!) / 4;
    bewertung = Math.min(5, Math.max(1, Math.round(6 - avg)));
    submittedAt = new Date();
  }

  await prisma.evaluation.upsert({
    where: { placementId },
    create: {
      tenantId,
      placementId,
      fachlich,
      selbststaendigkeit,
      sorgfalt,
      teamverhalten,
      kommentar,
      bewertung,
      submittedAt,
      evaluatorUserId: userId,
    },
    update: {
      fachlich,
      selbststaendigkeit,
      sorgfalt,
      teamverhalten,
      kommentar,
      evaluatorUserId: userId,
      // Note/Abschick-Zeitpunkt nur beim Abschicken setzen (Entwurf lässt sie).
      ...(mode === "submit" ? { bewertung, submittedAt } : {}),
    },
  });

  // TODO (später): Azubi + Ausbilder über abgeschickten Bogen benachrichtigen.
  revalidatePath("/meine-abteilung");
}

// Sperrzeit (z. B. Betriebsurlaub) für die eigene Abteilung anlegen.
// Erscheint auch unter /sperrzeiten (Admin/Ausbilder).
export async function addOwnDepartmentBlock(formData: FormData) {
  const { tenantId, departmentId } = await getOwnDepartment();
  const von = String(formData.get("von") ?? "");
  const bis = String(formData.get("bis") ?? "");
  const grund = String(formData.get("grund") ?? "").trim() || null;
  if (!von || !bis) throw new Error("Bitte Von- und Bis-Datum angeben.");
  if (von > bis) throw new Error("Das Von-Datum liegt nach dem Bis-Datum.");

  await prisma.departmentBlock.create({
    data: { tenantId, departmentId, grund, von: new Date(von), bis: new Date(bis) },
  });
  revalidatePath("/meine-abteilung");
  revalidatePath("/sperrzeiten");
}

export async function deleteOwnDepartmentBlock(formData: FormData) {
  const { tenantId, departmentId } = await getOwnDepartment();
  const id = String(formData.get("id") ?? "");
  await prisma.departmentBlock.deleteMany({ where: { id, tenantId, departmentId } });
  revalidatePath("/meine-abteilung");
  revalidatePath("/sperrzeiten");
}
