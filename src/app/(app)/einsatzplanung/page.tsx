import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { Planner } from "./planner";

export const dynamic = "force-dynamic";

export default async function EinsatzplanungPage() {
  const tenant = await getActiveTenant();
  const tid = tenant.id;

  const [
    apprentices,
    departments,
    professions,
    placements,
    deptProfessions,
    schoolBlocks,
    absenceBlocks,
    departmentBlocks,
  ] = await Promise.all([
    prisma.apprentice.findMany({
      where: { tenantId: tid, deletedAt: null },
      select: {
        id: true,
        vorname: true,
        nachname: true,
        professionId: true,
        classId: true,
        start: true,
      },
    }),
    prisma.department.findMany({
      where: { tenantId: tid, deletedAt: null },
      select: {
        id: true,
        name: true,
        kapazitaet: true,
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
    prisma.departmentProfession.findMany({
      where: { tenantId: tid },
      select: { departmentId: true, professionId: true, sollWochen: true },
    }),
    prisma.schoolBlock.findMany({
      where: { tenantId: tid },
      select: { classId: true, von: true, bis: true },
    }),
    prisma.absenceBlock.findMany({
      where: { tenantId: tid },
      select: { apprenticeId: true, typ: true, von: true, bis: true },
    }),
    prisma.departmentBlock.findMany({
      where: { tenantId: tid },
      select: { departmentId: true, grund: true, von: true, bis: true },
    }),
  ]);

  const iso = (d: Date) => d.toISOString();
  const soll: Record<string, number | null> = {};
  for (const dp of deptProfessions) {
    soll[`${dp.departmentId}:${dp.professionId}`] = dp.sollWochen;
  }

  return (
    <div className="px-6 py-8">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
        Ausbilder
      </p>
      <h1 className="mb-1 text-3xl font-bold tracking-tight">
        Der Rotationsplaner
      </h1>
      <p className="mb-6 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
        Zeilen sind Azubis, Spalten sind Kalenderwochen. Abteilungen rechts per
        Drag &amp; Drop auf eine Woche ziehen. Verstößt ein Einsatz gegen eine
        Regel (Abteilung voll, Berufsschule, Urlaub/Prüfung, gesperrt oder
        Station bereits durchlaufen), erscheint ein{" "}
        <span className="font-medium text-foreground">!</span> am Block — du kannst
        ihn aber bewusst trotzdem setzen.
      </p>

      <Planner
        apprentices={apprentices.map((a) => ({
          id: a.id,
          vorname: a.vorname,
          nachname: a.nachname,
          professionId: a.professionId,
          classId: a.classId,
          start: a.start.toISOString(),
        }))}
        departments={departments.map((dep) => ({
          id: dep.id,
          name: dep.name,
          kapazitaet: dep.kapazitaet,
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
        soll={soll}
        schoolBlocks={schoolBlocks.map((s) => ({
          classId: s.classId,
          von: iso(s.von),
          bis: iso(s.bis),
        }))}
        absenceBlocks={absenceBlocks.map((a) => ({
          apprenticeId: a.apprenticeId,
          typ: a.typ,
          von: iso(a.von),
          bis: iso(a.bis),
        }))}
        departmentBlocks={departmentBlocks.map((b) => ({
          departmentId: b.departmentId,
          grund: b.grund,
          von: iso(b.von),
          bis: iso(b.bis),
        }))}
      />
    </div>
  );
}
