"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";

// Legt einen Einsatz (Rotation) an — per Drag & Drop aus dem Planer.
export async function createPlacement(input: {
  apprenticeId: string;
  departmentId: string;
  von: string; // "YYYY-MM-DD"
  bis: string; // "YYYY-MM-DD"
}) {
  const tenant = await getActiveTenant();

  // Sicherheit: Azubi und Abteilung müssen zum Mandanten gehören.
  const [apprentice, department] = await Promise.all([
    prisma.apprentice.findFirst({
      where: { id: input.apprenticeId, tenantId: tenant.id, deletedAt: null },
    }),
    prisma.department.findFirst({
      where: { id: input.departmentId, tenantId: tenant.id, deletedAt: null },
    }),
  ]);
  if (!apprentice || !department) {
    throw new Error("Azubi oder Abteilung nicht gefunden.");
  }

  await prisma.placement.create({
    data: {
      tenantId: tenant.id,
      apprenticeId: input.apprenticeId,
      departmentId: input.departmentId,
      von: new Date(input.von),
      bis: new Date(input.bis),
    },
  });

  revalidatePath("/einsatzplanung");
}

// Passt Start (von) und/oder Ende (bis) eines Einsatzes an — Resize per Ziehgriff.
export async function updatePlacement(input: {
  id: string;
  von?: string;
  bis?: string;
}) {
  const tenant = await getActiveTenant();
  const existing = await prisma.placement.findFirst({
    where: { id: input.id, tenantId: tenant.id, deletedAt: null },
  });
  if (!existing) return;

  const von = input.von ? new Date(input.von) : existing.von;
  const bis = input.bis ? new Date(input.bis) : existing.bis;
  if (von.getTime() > bis.getTime()) return; // ungültig: Start läge nach Ende

  await prisma.placement.update({
    where: { id: existing.id },
    data: { von, bis },
  });

  revalidatePath("/einsatzplanung");
}

// Entfernt einen Einsatz (Soft-Delete, mandantengeschützt).
export async function deletePlacement(id: string) {
  const tenant = await getActiveTenant();
  await prisma.placement.updateMany({
    where: { id, tenantId: tenant.id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/einsatzplanung");
}
