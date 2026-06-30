import { prisma } from "@/lib/prisma";
import { getActiveTenant, requireSession } from "@/lib/tenant";
import { departmentColorMap } from "@/lib/ausbildung";
import { MeinKalender, type KalPlacement, type KalBlock } from "./mein-kalender";

export const dynamic = "force-dynamic";

export default async function MeinKalenderPage() {
  const session = await requireSession();
  const tenant = await getActiveTenant();

  const azubi = await prisma.apprentice.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id, deletedAt: null },
    select: {
      id: true,
      classId: true,
      placements: {
        where: { deletedAt: null },
        select: {
          departmentId: true,
          von: true,
          bis: true,
          department: { select: { name: true } },
        },
      },
    },
  });

  if (!azubi) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Kalender</h1>
        <p className="text-muted-foreground">
          Mit diesem Login ist noch kein Azubi-Profil verknüpft.
        </p>
      </div>
    );
  }

  const [departments, schoolBlocks, absences] = await Promise.all([
    prisma.department.findMany({
      where: { tenantId: tenant.id, deletedAt: null },
      select: { id: true },
      orderBy: { name: "asc" },
    }),
    azubi.classId
      ? prisma.schoolBlock.findMany({
          where: { tenantId: tenant.id, classId: azubi.classId },
          select: { von: true, bis: true },
        })
      : Promise.resolve([]),
    prisma.absenceBlock.findMany({
      where: { tenantId: tenant.id, apprenticeId: azubi.id },
      select: { typ: true, von: true, bis: true },
    }),
  ]);

  const colorOf = departmentColorMap(departments.map((d) => d.id));
  const iso = (d: Date) => d.toISOString();

  const placements: KalPlacement[] = azubi.placements.map((p) => ({
    color: colorOf[p.departmentId],
    label: p.department.name,
    von: iso(p.von),
    bis: iso(p.bis),
  }));
  const school: KalBlock[] = schoolBlocks.map((s) => ({
    von: iso(s.von),
    bis: iso(s.bis),
  }));
  const absencesOut = absences.map((a) => ({
    typ: a.typ as "URLAUB" | "PRUEFUNG" | "PRUEFUNGSVORBEREITUNG",
    von: iso(a.von),
    bis: iso(a.bis),
  }));

  return (
    <MeinKalender
      placements={placements}
      school={school}
      absences={absencesOut}
      nowISO={new Date().toISOString()}
    />
  );
}
