"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getActiveTenant, requireSession } from "@/lib/tenant";

// Eigenen Azubi-Datensatz aus der Login-Session ermitteln.
async function getOwnApprentice() {
  const session = await requireSession();
  const tenant = await getActiveTenant();
  const azubi = await prisma.apprentice.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id, deletedAt: null },
  });
  if (!azubi) throw new Error("Mit diesem Login ist kein Azubi-Profil verknüpft.");
  return { azubi, tenantId: tenant.id };
}

// Note hinzufügen (vom Azubi auf seiner eigenen Seite).
export async function addGrade(formData: FormData) {
  const { azubi, tenantId } = await getOwnApprentice();

  const fach = String(formData.get("fach") ?? "").trim();
  const wertRaw = String(formData.get("wert") ?? "").replace(",", ".");
  const datum = String(formData.get("datum") ?? "");

  if (!fach || !wertRaw || !datum) {
    throw new Error("Bitte Fach, Note und Datum ausfüllen.");
  }
  const wert = Number(wertRaw);
  if (Number.isNaN(wert) || wert < 1 || wert > 6) {
    throw new Error("Die Note muss zwischen 1,0 und 6,0 liegen.");
  }

  await prisma.grade.create({
    data: { tenantId, apprenticeId: azubi.id, fach, wert, datum: new Date(datum) },
  });
  // TODO (später): Ausbilder über neue/​geänderte Note benachrichtigen.
  revalidatePath("/meine-seite");
}

// Note löschen (nur eigene).
export async function deleteGrade(formData: FormData) {
  const { azubi, tenantId } = await getOwnApprentice();
  const id = String(formData.get("id") ?? "");
  await prisma.grade.deleteMany({
    where: { id, tenantId, apprenticeId: azubi.id },
  });
  revalidatePath("/meine-seite");
}
