"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant";

// Legt einen neuen Beruf an — immer auf den aktiven Mandanten bezogen.
export async function createProfession(formData: FormData) {
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  if (!bezeichnung) {
    throw new Error("Bitte eine Bezeichnung für den Beruf eingeben.");
  }

  const tenantId = await getCurrentTenantId();
  await prisma.profession.create({ data: { tenantId, bezeichnung } });

  revalidatePath("/berufe");
}

// Soft-Delete eines Berufs (deletedAt). Zugeordnete Azubis behalten ihren Bezug.
export async function softDeleteProfession(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const tenantId = await getCurrentTenantId();
  await prisma.profession.updateMany({
    where: { id, tenantId, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/berufe");
  redirect("/berufe");
}

// Ordnet dem Beruf einen Lerninhalt zu. Entweder über die `learningContentId`
// eines bestehenden Inhalts (Chip-Klick) oder per `titel`: ein gleichnamiger
// Inhalt wird wiederverwendet, sonst neu angelegt ("find-or-create").
export async function addRequiredContent(formData: FormData) {
  const professionId = String(formData.get("professionId") ?? "");
  const titel = String(formData.get("titel") ?? "").trim();
  const existingId = String(formData.get("learningContentId") ?? "");

  if (!professionId) throw new Error("Kein Beruf angegeben.");

  const tenantId = await getCurrentTenantId();

  // Sicherstellen, dass der Beruf zu diesem Mandanten gehört.
  const profession = await prisma.profession.findFirst({
    where: { id: professionId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!profession) throw new Error("Beruf nicht gefunden.");

  let learningContentId = existingId;

  if (!learningContentId) {
    if (!titel) throw new Error("Bitte einen Lerninhalt eingeben.");
    // Gleichnamigen Inhalt wiederverwenden (case-insensitive), sonst anlegen.
    const existing = await prisma.learningContent.findFirst({
      where: { tenantId, deletedAt: null, titel: { equals: titel, mode: "insensitive" } },
      select: { id: true },
    });
    learningContentId =
      existing?.id ??
      (await prisma.learningContent.create({ data: { tenantId, titel } })).id;
  }

  // Idempotent: Doppelklick erzeugt keinen Fehler (unique professionId+contentId).
  await prisma.requiredContent.upsert({
    where: {
      professionId_learningContentId: { professionId, learningContentId },
    },
    create: { tenantId, professionId, learningContentId },
    update: {},
  });

  revalidatePath(`/berufe/${professionId}`);
}

// Entfernt die Zuordnung Beruf ↔ Lerninhalt (löscht den Lerninhalt selbst nicht).
export async function removeRequiredContent(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const professionId = String(formData.get("professionId") ?? "");
  if (!id) return;

  const tenantId = await getCurrentTenantId();
  await prisma.requiredContent.deleteMany({ where: { id, tenantId } });

  revalidatePath(`/berufe/${professionId}`);
}
