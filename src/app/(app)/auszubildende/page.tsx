import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import {
  ausbildungsjahr,
  departmentColorMap,
  stationState,
  type StationState,
} from "@/lib/ausbildung";
import { AzubiListe, type AzubiRow } from "./azubi-liste";

export const dynamic = "force-dynamic";

export default async function AuszubildendePage() {
  const tenant = await getActiveTenant();
  const now = new Date();

  const [apprentices, departments, professions] = await Promise.all([
    prisma.apprentice.findMany({
      where: { tenantId: tenant.id, deletedAt: null },
      select: {
        id: true,
        vorname: true,
        nachname: true,
        start: true,
        professionId: true,
        profession: { select: { bezeichnung: true } },
        placements: {
          where: { deletedAt: null },
          select: { departmentId: true, von: true, bis: true },
        },
      },
      orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
    }),
    prisma.department.findMany({
      where: { tenantId: tenant.id, deletedAt: null },
      select: {
        id: true,
        name: true,
        suitableFor: { select: { professionId: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.profession.findMany({
      where: { tenantId: tenant.id, deletedAt: null },
      select: { id: true, bezeichnung: true },
      orderBy: { bezeichnung: "asc" },
    }),
  ]);

  const colorOf = departmentColorMap(departments.map((d) => d.id));

  const rows: AzubiRow[] = apprentices.map((a) => {
    // Stationen = für den Beruf des Azubis geeignete Abteilungen.
    const stations = departments
      .filter(
        (d) =>
          a.professionId != null &&
          d.suitableFor.some((s) => s.professionId === a.professionId),
      )
      .map((d) => {
        const own = a.placements.filter((p) => p.departmentId === d.id);
        return {
          name: d.name,
          color: colorOf[d.id],
          state: stationState(own, now) as StationState,
        };
      });

    return {
      id: a.id,
      vorname: a.vorname,
      nachname: a.nachname,
      professionId: a.professionId,
      beruf: a.profession?.bezeichnung ?? null,
      lehrjahr: ausbildungsjahr(a.start, now),
      stations,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
        Ausbilder
      </p>
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Azubi-Liste</h1>
      <p className="mb-8 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        Du siehst die Liste deiner Azubis — mit Suche, Filter und Sortierung.
        Klicke auf einen Azubi, um sein Profil mit Stationsfortschritt zu öffnen.
      </p>

      <AzubiListe rows={rows} professions={professions} />
    </div>
  );
}
