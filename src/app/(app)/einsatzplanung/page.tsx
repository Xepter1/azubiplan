import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { Planner } from "./planner";

export const dynamic = "force-dynamic";

export default async function EinsatzplanungPage() {
  const tenant = await getActiveTenant();
  const tid = tenant.id;

  const [apprentices, departments, professions, placements] = await Promise.all([
    prisma.apprentice.findMany({
      where: { tenantId: tid, deletedAt: null },
      select: {
        id: true,
        vorname: true,
        nachname: true,
        professionId: true,
        start: true,
      },
    }),
    prisma.department.findMany({
      where: { tenantId: tid, deletedAt: null },
      select: {
        id: true,
        name: true,
        suitableFor: { select: { professionId: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.profession.findMany({
      where: { tenantId: tid, deletedAt: null },
      select: { id: true, bezeichnung: true },
      orderBy: { bezeichnung: "asc" },
    }),
    prisma.placement.findMany({
      where: { tenantId: tid, deletedAt: null },
      select: {
        id: true,
        apprenticeId: true,
        departmentId: true,
        von: true,
        bis: true,
        department: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="px-6 py-8">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        Einsatzplanung
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Azubis nach Beruf &amp; Ausbildungsjahr filtern und passende Abteilungen
        per Drag &amp; Drop einplanen.
      </p>

      <Planner
        apprentices={apprentices.map((a) => ({
          id: a.id,
          vorname: a.vorname,
          nachname: a.nachname,
          professionId: a.professionId,
          start: a.start.toISOString(),
        }))}
        departments={departments.map((dep) => ({
          id: dep.id,
          name: dep.name,
          professionIds: dep.suitableFor.map((s) => s.professionId),
        }))}
        professions={professions}
        placements={placements.map((p) => ({
          id: p.id,
          apprenticeId: p.apprenticeId,
          departmentId: p.departmentId,
          departmentName: p.department.name,
          von: p.von.toISOString(),
          bis: p.bis.toISOString(),
        }))}
      />
    </div>
  );
}
