import { prisma } from "@/lib/prisma";
import { getActiveTenant, requireSession } from "@/lib/tenant";
import {
  MeineAbteilung,
  type AzubiItem,
  type StripPlacement,
} from "./meine-abteilung";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("de-DE");

const localKey = (d: Date) =>
  d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
const utcKey = (d: Date) =>
  d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
function isoWeekYMD(y: number, m: number, day: number) {
  const date = new Date(Date.UTC(y, m - 1, day));
  const dn = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dn + 3);
  const ft = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const fd = (ft.getUTCDay() + 6) % 7;
  ft.setUTCDate(ft.getUTCDate() - fd + 3);
  return 1 + Math.round((date.getTime() - ft.getTime()) / 604_800_000);
}
const isoWeekUtc = (d: Date) =>
  isoWeekYMD(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());

export default async function MeineAbteilungPage() {
  const session = await requireSession();
  const tenant = await getActiveTenant();
  const now = new Date();
  const nowKey = localKey(now);

  const me = await prisma.user.findFirst({
    where: { id: session.user.id, tenantId: tenant.id },
    select: { department: { select: { id: true, name: true } } },
  });

  if (!me?.department) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Meine Abteilung</h1>
        <p className="text-muted-foreground">
          Dir ist noch keine Abteilung zugeordnet. Bitte wende dich an deinen
          Administrator.
        </p>
      </div>
    );
  }
  const dept = me.department;

  const [placements, blocks] = await Promise.all([
    prisma.placement.findMany({
      where: { tenantId: tenant.id, departmentId: dept.id, deletedAt: null },
      select: {
        id: true,
        von: true,
        bis: true,
        apprentice: { select: { vorname: true, nachname: true } },
        evaluation: {
          select: {
            fachlich: true,
            selbststaendigkeit: true,
            sorgfalt: true,
            teamverhalten: true,
            kommentar: true,
            submittedAt: true,
          },
        },
      },
      orderBy: { von: "asc" },
    }),
    prisma.departmentBlock.findMany({
      where: { tenantId: tenant.id, departmentId: dept.id },
      select: { id: true, grund: true, von: true, bis: true },
      orderBy: { von: "asc" },
    }),
  ]);

  const statusOf = (von: Date, bis: Date) => {
    if (utcKey(von) > nowKey) return "geplant" as const;
    if (utcKey(bis) < nowKey) return "beendet" as const;
    return "laeuft" as const;
  };

  // --- Azubi-Liste ---
  const azubis: AzubiItem[] = placements.map((p) => {
    const status = statusOf(p.von, p.bis);
    const name = `${p.apprentice.vorname} ${p.apprentice.nachname}`;
    const ev = p.evaluation;
    const sub =
      status === "laeuft"
        ? `aktuell · KW ${isoWeekUtc(p.von)}–${isoWeekUtc(p.bis)}`
        : status === "beendet"
          ? `Station beendet · KW ${isoWeekUtc(p.bis)}`
          : `anstehend · ab KW ${isoWeekUtc(p.von)}`;
    return {
      placementId: p.id,
      name,
      initials: `${p.apprentice.vorname[0] ?? ""}${p.apprentice.nachname[0] ?? ""}`.toUpperCase(),
      status,
      sub,
      submitted: !!ev?.submittedAt,
      evalValues: {
        fachlich: ev?.fachlich ?? 0,
        selbststaendigkeit: ev?.selbststaendigkeit ?? 0,
        sorgfalt: ev?.sorgfalt ?? 0,
        teamverhalten: ev?.teamverhalten ?? 0,
        kommentar: ev?.kommentar ?? "",
      },
    };
  });
  const rank = { laeuft: 0, beendet: 1, geplant: 2 };
  azubis.sort(
    (a, b) =>
      rank[a.status] - rank[b.status] || a.name.localeCompare(b.name),
  );

  // --- Kalenderstrahl: Rohdaten an den Client (baut Tag/Woche/Monat-Spalten) ---
  const stripPlacements: StripPlacement[] = placements.map((p) => ({
    name: `${p.apprentice.vorname} ${p.apprentice.nachname}`,
    status: statusOf(p.von, p.bis),
    von: p.von.toISOString(),
    bis: p.bis.toISOString(),
  }));

  return (
    <MeineAbteilung
      departmentName={dept.name}
      azubis={azubis}
      stripPlacements={stripPlacements}
      nowISO={now.toISOString()}
      blocks={blocks.map((b) => ({
        id: b.id,
        grund: b.grund ?? "gesperrt",
        zeitraum: `${dateFmt.format(b.von)} – ${dateFmt.format(b.bis)}`,
      }))}
    />
  );
}
