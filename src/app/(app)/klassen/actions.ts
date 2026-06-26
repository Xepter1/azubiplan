"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant";

// Legt eine Klasse an. Optional werden die Fächer einer Vorlage-Klasse
// übernommen ("Fächer aus Mechatroniker 2026 übernehmen").
export async function createClass(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const professionId = String(formData.get("professionId") ?? "");
  const jahrgangRaw = String(formData.get("jahrgang") ?? "").trim();
  const copyFromId = String(formData.get("copyFromClassId") ?? "");

  if (!name || !professionId || !jahrgangRaw) {
    throw new Error("Bitte Name, Beruf und Jahrgang angeben.");
  }
  const jahrgang = Number.parseInt(jahrgangRaw, 10);
  if (!Number.isFinite(jahrgang)) throw new Error("Ungültiger Jahrgang.");

  const tenantId = await getCurrentTenantId();
  const prof = await prisma.profession.findFirst({
    where: { id: professionId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!prof) throw new Error("Beruf nicht gefunden.");

  const cls = await prisma.schoolClass.create({
    data: { tenantId, name, professionId, jahrgang },
  });

  // Fächer aus der Vorlage-Klasse übernehmen (nur eigene Klassen des Mandanten).
  if (copyFromId) {
    const source = await prisma.classSubject.findMany({
      where: { classId: copyFromId, tenantId },
      select: { subjectId: true },
    });
    if (source.length) {
      await prisma.classSubject.createMany({
        data: source.map((s) => ({
          tenantId,
          classId: cls.id,
          subjectId: s.subjectId,
        })),
        skipDuplicates: true,
      });
    }
  }

  revalidatePath("/klassen");
  redirect(`/klassen/${cls.id}`);
}

// Soft-Delete einer Klasse. Zugeordnete Azubis verlieren nur den Klassenbezug.
export async function softDeleteClass(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const tenantId = await getCurrentTenantId();
  await prisma.schoolClass.updateMany({
    where: { id, tenantId, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/klassen");
  redirect("/klassen");
}

// Fach zur Klasse zuordnen — bestehendes Fach (subjectId) oder per Freitext mit
// "find-or-create" (gleichnamiges Fach wird wiederverwendet).
export async function addSubject(formData: FormData) {
  const classId = String(formData.get("classId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const existingId = String(formData.get("subjectId") ?? "");

  if (!classId) throw new Error("Keine Klasse angegeben.");

  const tenantId = await getCurrentTenantId();
  const cls = await prisma.schoolClass.findFirst({
    where: { id: classId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!cls) throw new Error("Klasse nicht gefunden.");

  let subjectId = existingId;
  if (!subjectId) {
    if (!name) throw new Error("Bitte ein Fach eingeben.");
    const existing = await prisma.subject.findFirst({
      where: { tenantId, deletedAt: null, name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    subjectId =
      existing?.id ??
      (await prisma.subject.create({ data: { tenantId, name } })).id;
  }

  await prisma.classSubject.upsert({
    where: { classId_subjectId: { classId, subjectId } },
    create: { tenantId, classId, subjectId },
    update: {},
  });

  revalidatePath(`/klassen/${classId}`);
}

// Fach-Zuordnung einer Klasse entfernen (Fach selbst bleibt erhalten).
export async function removeSubject(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const classId = String(formData.get("classId") ?? "");
  if (!id) return;

  const tenantId = await getCurrentTenantId();
  await prisma.classSubject.deleteMany({ where: { id, tenantId } });

  revalidatePath(`/klassen/${classId}`);
}

// Berufsschulwoche der Klasse anlegen (wirkt im Einsatzplaner).
export async function createSchoolBlock(formData: FormData) {
  const classId = String(formData.get("classId") ?? "");
  const von = String(formData.get("von") ?? "");
  const bis = String(formData.get("bis") ?? "");

  if (!classId || !von || !bis) {
    throw new Error("Bitte Klasse, Von- und Bis-Datum angeben.");
  }
  if (von > bis) throw new Error("Das Von-Datum liegt nach dem Bis-Datum.");

  const tenantId = await getCurrentTenantId();
  const cls = await prisma.schoolClass.findFirst({
    where: { id: classId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!cls) throw new Error("Klasse nicht gefunden.");

  await prisma.schoolBlock.create({
    data: { tenantId, classId, von: new Date(von), bis: new Date(bis) },
  });

  revalidatePath(`/klassen/${classId}`);
  revalidatePath("/einsatzplanung");
}

export async function deleteSchoolBlock(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const classId = String(formData.get("classId") ?? "");
  if (!id) return;

  const tenantId = await getCurrentTenantId();
  await prisma.schoolBlock.deleteMany({ where: { id, tenantId } });

  revalidatePath(`/klassen/${classId}`);
  revalidatePath("/einsatzplanung");
}
