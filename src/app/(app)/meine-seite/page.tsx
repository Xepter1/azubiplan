import { prisma } from "@/lib/prisma";
import { getActiveTenant, requireSession } from "@/lib/tenant";
import {
  ausbildungsdauerJahre,
  ausbildungsjahr,
  departmentColorMap,
  stationState,
  type StationState,
} from "@/lib/ausbildung";
import { MeineSeite, type SegKind } from "./meine-seite";

export const dynamic = "force-dynamic";

const MONTHS = [
  "Jan", "Feb", "März", "Apr", "Mai", "Juni",
  "Juli", "Aug", "Sep", "Okt", "Nov", "Dez",
];
const dateFmt = new Intl.DateTimeFormat("de-DE");

// --- Datums-/Wochen-Helfer ---
function addDays(d: Date, n: number) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}
function mondayOf(d: Date) {
  return addDays(d, -((d.getDay() + 6) % 7));
}
const localKey = (d: Date) =>
  d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
const utcKey = (d: Date) =>
  d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
function isoWeekYMD(y: number, m: number, day: number) {
  const date = new Date(Date.UTC(y, m - 1, day));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThu = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const fDay = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - fDay + 3);
  return 1 + Math.round((date.getTime() - firstThu.getTime()) / 604_800_000);
}
const isoWeekLocal = (d: Date) =>
  isoWeekYMD(d.getFullYear(), d.getMonth() + 1, d.getDate());
const isoWeekUtc = (d: Date) =>
  isoWeekYMD(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
const overlaps = (wv: Date, wb: Date, iv: Date, ib: Date) =>
  localKey(wv) <= utcKey(ib) && localKey(wb) >= utcKey(iv);

export default async function MeineSeitePage() {
  const session = await requireSession();
  const tenant = await getActiveTenant();
  const now = new Date();
  const nowKey = localKey(now);

  const azubi = await prisma.apprentice.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id, deletedAt: null },
    select: {
      id: true,
      vorname: true,
      nachname: true,
      start: true,
      ende: true,
      professionId: true,
      classId: true,
      profession: { select: { bezeichnung: true } },
      class: {
        select: {
          classSubjects: {
            select: { subject: { select: { id: true, name: true } } },
          },
        },
      },
      placements: {
        where: { deletedAt: null },
        select: {
          id: true,
          departmentId: true,
          von: true,
          bis: true,
          department: { select: { name: true } },
        },
      },
      grades: {
        select: {
          id: true,
          wert: true,
          datum: true,
          subject: { select: { name: true } },
        },
        orderBy: { datum: "desc" },
      },
    },
  });

  if (!azubi) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Meine Seite</h1>
        <p className="text-muted-foreground">
          Mit diesem Login ist noch kein Azubi-Profil verknüpft. Bitte wende dich
          an deinen Ausbilder.
        </p>
      </div>
    );
  }

  const azYear = ausbildungsjahr(azubi.start, now);
  // Lokale Aliase, damit Closures (weekItem, .filter) den Non-null-Typ behalten.
  const placements = azubi.placements;
  const myProfessionId = azubi.professionId;

  const [departments, schoolBlocks, absences] = await Promise.all([
    prisma.department.findMany({
      where: { tenantId: tenant.id, deletedAt: null },
      select: {
        id: true,
        name: true,
        suitableFor: { select: { professionId: true } },
      },
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
  // Berufsschulwochen kommen aus der Klasse des Azubis (Jahrgangs-genau).
  const mySchool = schoolBlocks;

  // --- Fortschritt (Stationen des Berufs) ---
  const progress = departments
    .filter(
      (d) =>
        myProfessionId != null &&
        d.suitableFor.some((s) => s.professionId === myProfessionId),
    )
    .map((d) => {
      const own = placements.filter((p) => p.departmentId === d.id);
      return {
        name: d.name,
        color: colorOf[d.id],
        state: stationState(own, now) as StationState,
      };
    });

  // --- Zeitleiste: 14 Wochen (3 vor jetzt) ---
  const tlStart = addDays(mondayOf(now), -21);
  const weeks = Array.from({ length: 14 }, (_, i) => {
    const von = addDays(tlStart, i * 7);
    return { von, bis: addDays(von, 6) };
  });

  type Seg = {
    kind: SegKind;
    color: string;
    label: string;
    start: number;
    span: number;
  };
  // Pro Woche genau ein Eintrag (Priorität: Schule > Abwesenheit > Einsatz).
  function weekItem(wv: Date, wb: Date): Omit<Seg, "start" | "span"> | null {
    if (mySchool.some((s) => overlaps(wv, wb, s.von, s.bis))) {
      return { kind: "bs", color: "", label: "BS" };
    }
    const abs = absences.find((a) => overlaps(wv, wb, a.von, a.bis));
    if (abs) {
      const urlaub = abs.typ === "URLAUB";
      return {
        kind: urlaub ? "urlaub" : "pruefung",
        color: "",
        label: urlaub ? "Urlaub" : "Prüfung",
      };
    }
    const pl = placements.find((p) => overlaps(wv, wb, p.von, p.bis));
    if (pl) {
      return {
        kind: "placement",
        color: colorOf[pl.departmentId],
        label: pl.department.name,
      };
    }
    return null;
  }

  const segments: Seg[] = [];
  let cur: Seg | null = null;
  weeks.forEach((w, i) => {
    const item = weekItem(w.von, w.bis);
    if (!item) {
      if (cur) segments.push(cur);
      cur = null;
      return;
    }
    if (cur && cur.kind === item.kind && cur.label === item.label) {
      cur.span += 1;
    } else {
      if (cur) segments.push(cur);
      cur = { ...item, start: i, span: 1 };
    }
  });
  if (cur) segments.push(cur);

  const weekHeaders = weeks.map((w, i) => ({
    kw: isoWeekLocal(w.von),
    month:
      i === 0 || w.von.getMonth() !== weeks[i - 1].von.getMonth()
        ? MONTHS[w.von.getMonth()]
        : null,
    isNow: localKey(w.von) <= nowKey && nowKey <= localKey(w.bis),
  }));

  // --- Anstehend (zukünftige Ereignisse, nach Datum sortiert) ---
  const upcoming: {
    kind: SegKind | "versetzung";
    color: string;
    badge: string;
    title: string;
    sub: string;
    when: number;
  }[] = [];
  for (const p of placements) {
    if (utcKey(p.von) > nowKey) {
      upcoming.push({
        kind: "versetzung",
        color: colorOf[p.departmentId],
        badge: p.department.name.slice(0, 2),
        title: `Versetzung ${p.department.name}`,
        sub: `ab KW ${isoWeekUtc(p.von)}`,
        when: utcKey(p.von),
      });
    }
  }
  for (const s of mySchool) {
    if (utcKey(s.bis) >= nowKey) {
      upcoming.push({
        kind: "bs",
        color: "",
        badge: "BS",
        title: "Berufsschule",
        sub: `KW ${isoWeekUtc(s.von)} · Mo–Fr`,
        when: utcKey(s.von),
      });
    }
  }
  for (const a of absences) {
    if (utcKey(a.bis) >= nowKey) {
      const urlaub = a.typ === "URLAUB";
      upcoming.push({
        kind: urlaub ? "urlaub" : "pruefung",
        color: "",
        badge: urlaub ? "U" : "Pr",
        title: urlaub ? "Urlaub" : "Prüfung",
        sub: `KW ${isoWeekUtc(a.von)} · genehmigt`,
        when: utcKey(a.von),
      });
    }
  }
  upcoming.sort((x, y) => x.when - y.when);

  const grades = azubi.grades.map((g) => ({
    id: g.id,
    fach: g.subject.name,
    wert: Number(g.wert).toLocaleString("de-DE", { minimumFractionDigits: 1 }),
    datum: dateFmt.format(g.datum),
  }));

  // Fächer der Klasse — Auswahl für das Noten-Dropdown.
  const subjects = (azubi.class?.classSubjects ?? [])
    .map((cs) => cs.subject)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <MeineSeite
      profile={{
        name: `${azubi.vorname} ${azubi.nachname}`,
        beruf: azubi.profession?.bezeichnung ?? null,
        lehrjahr: azYear,
        dauer: ausbildungsdauerJahre(azubi.start, azubi.ende).toLocaleString("de-DE"),
        start: `${MONTHS[azubi.start.getUTCMonth()]} ${azubi.start.getUTCFullYear()}`,
      }}
      progress={progress}
      weeks={weekHeaders}
      segments={segments}
      upcoming={upcoming.map(({ when: _when, ...rest }) => rest)}
      grades={grades}
      subjects={subjects}
    />
  );
}
