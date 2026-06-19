import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Erzwingt eine angemeldete Session — sonst Weiterleitung zum Login.
export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

// tenantId des angemeldeten Users. Quelle der Mandantentrennung in der App-Schicht
// (später zusätzlich durch PostgreSQL Row-Level-Security auf DB-Ebene erzwungen).
export async function getCurrentTenantId() {
  const session = await requireSession();
  return session.user.tenantId;
}

// Vollständiger Mandanten-Datensatz des angemeldeten Users (z.B. für die Anzeige).
export async function getActiveTenant() {
  const tenantId = await getCurrentTenantId();
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    redirect("/login");
  }
  return tenant;
}
