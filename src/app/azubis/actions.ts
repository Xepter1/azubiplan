"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";

// Legt einen neuen Azubi an — immer auf den aktiven Mandanten bezogen.
export async function createApprentice(formData: FormData) {
  const vorname = String(formData.get("vorname") ?? "").trim();
  const nachname = String(formData.get("nachname") ?? "").trim();
  const start = String(formData.get("start") ?? "");
  const ende = String(formData.get("ende") ?? "");
  const professionId = String(formData.get("professionId") ?? "");

  if (!vorname || !nachname || !start || !ende) {
    throw new Error("Bitte Vorname, Nachname, Start und Ende ausfüllen.");
  }

  const tenant = await getActiveTenant();

  await prisma.apprentice.create({
    data: {
      tenantId: tenant.id,
      vorname,
      nachname,
      start: new Date(start),
      ende: new Date(ende),
      professionId: professionId || null,
    },
  });

  revalidatePath("/azubis");
}

// Soft-Delete: setzt deletedAt, löscht aber nicht physisch (Audit/Wiederherstellung).
// Der tenantId-Filter stellt sicher, dass nur eigene Datensätze betroffen sind.
export async function softDeleteApprentice(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const tenant = await getActiveTenant();

  await prisma.apprentice.updateMany({
    where: { id, tenantId: tenant.id, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/azubis");
}
