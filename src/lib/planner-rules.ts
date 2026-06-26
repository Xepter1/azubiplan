// Regel-Engine des Einsatzplaners. Reine Funktionen (client-nutzbar).
//
// Alle Regelverletzungen sind "weich": Sie verhindern das Ablegen NICHT, sondern
// markieren den Block mit "!" + Hinweis. Beim Ablegen wird zur Sicherheit noch
// einmal bestätigt. So lassen sich bewusste Ausnahmen (z. B. mehr Azubis als
// Plätze) zulassen.

export type RuleId =
  | "voll"
  | "durchlaufen"
  | "berufsschule"
  | "urlaub"
  | "pruefung"
  | "gesperrt";

export type Violation = { rule: RuleId; text: string };

export type PlacementLite = {
  id: string;
  apprenticeId: string;
  departmentId: string;
  von: string; // ISO
  bis: string; // ISO
};
export type SchoolBlockLite = {
  classId: string;
  von: string;
  bis: string;
};
export type AbsenceLite = {
  apprenticeId: string;
  typ: "URLAUB" | "PRUEFUNG" | "PRUEFUNGSVORBEREITUNG";
  von: string;
  bis: string;
};
export type DeptBlockLite = {
  departmentId: string;
  grund: string | null;
  von: string;
  bis: string;
};
export type DeptLite = { id: string; name: string; kapazitaet: number | null };

export type RuleContext = {
  placements: PlacementLite[];
  departments: Record<string, DeptLite>;
  // Soll-Wochen je `${departmentId}:${professionId}` (null/fehlend = unbekannt).
  soll: Record<string, number | null>;
  school: SchoolBlockLite[];
  absence: AbsenceLite[];
  deptBlocks: DeptBlockLite[];
  apprenticeProfession: Record<string, string | null>;
  apprenticeClass: Record<string, string | null>;
  today: string; // ISO – Bezugspunkt für "abgeschlossen"
};

const dayKey = (iso: string) => Number(iso.slice(0, 10).replaceAll("-", ""));
const overlaps = (aV: number, aB: number, bV: number, bB: number) =>
  aV <= bB && aB >= bV;
function wochen(p: { von: string; bis: string }) {
  const tage =
    (Date.parse(p.bis.slice(0, 10)) - Date.parse(p.von.slice(0, 10))) /
      86_400_000 +
    1;
  return tage / 7;
}

// Welche Einsätze einer Abteilung überschreiten zu irgendeinem Zeitpunkt die
// Kapazität? Gibt die Menge der betroffenen Einsatz-IDs zurück, damit ALLE
// überlappenden Blöcke markiert werden können.
export function overCapacityIds(
  placements: PlacementLite[],
  dept: DeptLite,
): Set<string> {
  const flagged = new Set<string>();
  if (dept.kapazitaet == null) return flagged;
  const ps = placements.filter((p) => p.departmentId === dept.id);
  const points = new Set<number>();
  for (const p of ps) {
    points.add(dayKey(p.von));
    points.add(dayKey(p.bis));
  }
  for (const t of points) {
    const covering = ps.filter(
      (p) => dayKey(p.von) <= t && dayKey(p.bis) >= t,
    );
    if (covering.length > dept.kapazitaet) {
      for (const p of covering) flagged.add(p.id);
    }
  }
  return flagged;
}

// Bereits ABGESCHLOSSENE Wochen eines Azubis in einer Abteilung (Ende < heute).
// Geplante/laufende Einsätze zählen nicht — eine Station gilt erst als
// "durchlaufen", wenn die Zeit tatsächlich absolviert wurde.
export function abgeschlosseneWochen(
  placements: PlacementLite[],
  apprenticeId: string,
  departmentId: string,
  today: string,
) {
  const t = dayKey(today);
  return placements
    .filter(
      (p) =>
        p.apprenticeId === apprenticeId &&
        p.departmentId === departmentId &&
        dayKey(p.bis) < t,
    )
    .reduce((sum, p) => sum + wochen(p), 0);
}

// Verletzungen eines konkreten Einsatzes (für das "!" am Block).
export function violationsFor(
  p: PlacementLite,
  ctx: RuleContext,
): Violation[] {
  const out: Violation[] = [];
  const dept = ctx.departments[p.departmentId];
  if (!dept) return out;
  const pV = dayKey(p.von);
  const pB = dayKey(p.bis);
  const prof = ctx.apprenticeProfession[p.apprenticeId];
  const azClass = ctx.apprenticeClass[p.apprenticeId];

  // Kapazität (Abteilung voll).
  if (overCapacityIds(ctx.placements, dept).has(p.id)) {
    out.push({
      rule: "voll",
      text: `${dept.name} ist voll — mehr als ${dept.kapazitaet} Azubi(s) gleichzeitig.`,
    });
  }

  // Station bereits vollständig durchlaufen — nur ABGESCHLOSSENE Wochen zählen.
  if (prof) {
    const soll = ctx.soll[`${p.departmentId}:${prof}`];
    if (
      soll != null &&
      abgeschlosseneWochen(
        ctx.placements,
        p.apprenticeId,
        p.departmentId,
        ctx.today,
      ) >= soll
    ) {
      out.push({
        rule: "durchlaufen",
        text: `${dept.name} ist bereits vollständig durchlaufen (Soll: ${soll} Wo.).`,
      });
    }
  }

  // Berufsschulwoche (Klasse des Azubis).
  if (
    azClass &&
    ctx.school.some(
      (s) => s.classId === azClass && overlaps(pV, pB, dayKey(s.von), dayKey(s.bis)),
    )
  ) {
    out.push({
      rule: "berufsschule",
      text: "Berufsschulwoche — Azubi ist in der Berufsschule.",
    });
  }

  // Abwesenheit (Urlaub / Prüfung).
  for (const a of ctx.absence) {
    if (a.apprenticeId !== p.apprenticeId) continue;
    if (!overlaps(pV, pB, dayKey(a.von), dayKey(a.bis))) continue;
    if (a.typ === "URLAUB") {
      out.push({ rule: "urlaub", text: "Urlaub — Azubi ist abwesend." });
    } else {
      out.push({
        rule: "pruefung",
        text: "Prüfung/Prüfungsvorbereitung — Azubi ist gebunden.",
      });
    }
  }

  // Abteilung gesperrt (z. B. Betriebsurlaub).
  for (const b of ctx.deptBlocks) {
    if (b.departmentId !== p.departmentId) continue;
    if (!overlaps(pV, pB, dayKey(b.von), dayKey(b.bis))) continue;
    out.push({
      rule: "gesperrt",
      text: `${dept.name} ist gesperrt${b.grund ? ` (${b.grund})` : ""}.`,
    });
  }

  return out;
}

// Verletzungen, die ein NEUER Einsatz hätte (Vorab-Check beim Ablegen).
export function violationsForCandidate(
  candidate: PlacementLite,
  ctx: RuleContext,
): Violation[] {
  return violationsFor(candidate, {
    ...ctx,
    placements: [...ctx.placements, candidate],
  });
}
