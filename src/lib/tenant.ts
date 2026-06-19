import { prisma } from "@/lib/prisma";

// Aktueller Mandant.
//
// PROVISORISCH: Solange es noch keinen Login gibt, arbeiten wir mit dem ersten
// (Demo-)Mandanten in der Datenbank. Sobald Auth.js steht, kommt die tenantId
// aus der Session des angemeldeten Users — und zusätzlich erzwingt PostgreSQL
// Row-Level-Security die Trennung auf DB-Ebene.
export async function getActiveTenant() {
  const tenant = await prisma.tenant.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!tenant) {
    throw new Error(
      "Kein Mandant in der Datenbank gefunden. Bitte einmalig `npm run db:seed` ausführen.",
    );
  }

  return tenant;
}
