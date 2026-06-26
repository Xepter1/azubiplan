// Gemeinsame Helfer rund um die Ausbildung: Lehrjahr-Berechnung, Abteilungs-
// farben (konsistent zur Einsatzplanung) und der Stations-Status eines Azubis.
//
// "Station" = eine für den Beruf des Azubis geeignete Abteilung. Ihr Status
// ergibt sich aus den Einsätzen (Placements) des Azubis in dieser Abteilung:
//   erledigt = Einsatz liegt komplett in der Vergangenheit
//   laeuft   = Einsatz läuft gerade
//   geplant  = Einsatz liegt in der Zukunft
//   offen    = es gibt (noch) keinen Einsatz

export type StationState = "erledigt" | "laeuft" | "geplant" | "offen";

// Farbpalette — identische Reihenfolge wie im Planer (planner.tsx), damit eine
// Abteilung überall dieselbe Farbe hat.
export const PALETTE_HEX = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#f43f5e", // rose
  "#0ea5e9", // sky
  "#8b5cf6", // violet
  "#14b8a6", // teal
  "#f97316", // orange
] as const;

// Ordnet jeder Abteilung (per id) eine feste Farbe zu — wie im Planer nach id
// sortiert, damit die Zuordnung über alle Ansichten stabil bleibt.
export function departmentColorMap(
  departmentIds: string[],
): Record<string, string> {
  const map: Record<string, string> = {};
  [...departmentIds]
    .sort((a, b) => a.localeCompare(b))
    .forEach((id, i) => {
      map[id] = PALETTE_HEX[i % PALETTE_HEX.length];
    });
  return map;
}

function dateKey(d: Date) {
  // Placements sind @db.Date → in UTC-Mitternacht. Vergleich auf Tagesebene.
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}
function todayKey(now: Date) {
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

// Status einer Station aus den Einsätzen des Azubis in dieser Abteilung.
export function stationState(
  placements: { von: Date; bis: Date }[],
  now: Date = new Date(),
): StationState {
  const t = todayKey(now);
  let erledigt = false;
  let geplant = false;
  for (const p of placements) {
    const von = dateKey(p.von);
    const bis = dateKey(p.bis);
    if (von <= t && t <= bis) return "laeuft"; // läuft schlägt alles
    if (bis < t) erledigt = true;
    else if (von > t) geplant = true;
  }
  if (erledigt) return "erledigt";
  if (geplant) return "geplant";
  return "offen";
}

// Abdeckung eines einzelnen Lerninhalts (RLP) durch die Rotation des Azubis.
// "abgedeckt" entsteht, wenn der Azubi in einer Abteilung war/ist, die diesen
// Inhalt vermittelt. Zusätzlich zum Status wird der relevante Einsatz (Zeitraum
// + Abteilung) zurückgegeben, damit das Profil "wann & wo" anzeigen kann.
export type CoverageState = "erledigt" | "laeuft" | "geplant" | "offen";

export type ContentCoverage = {
  state: CoverageState;
  von: Date | null;
  bis: Date | null;
  departmentName: string | null;
};

// `candidates` = Einsätze des Azubis in Abteilungen, die den Inhalt vermitteln.
export function contentCoverage(
  candidates: { von: Date; bis: Date; departmentName: string }[],
  now: Date = new Date(),
): ContentCoverage {
  const t = todayKey(now);
  const pick = (p: { von: Date; bis: Date; departmentName: string }): ContentCoverage => ({
    state: "erledigt",
    von: p.von,
    bis: p.bis,
    departmentName: p.departmentName,
  });

  // Läuft gerade → schlägt alles (Inhalt wird aktuell vermittelt).
  const laeuft = candidates.find(
    (p) => dateKey(p.von) <= t && t <= dateKey(p.bis),
  );
  if (laeuft) return { ...pick(laeuft), state: "laeuft" };

  // Jüngster abgeschlossener Einsatz → abgedeckt.
  const erledigt = candidates
    .filter((p) => dateKey(p.bis) < t)
    .sort((a, b) => dateKey(b.bis) - dateKey(a.bis));
  if (erledigt.length) return pick(erledigt[0]);

  // Sonst: nächster geplanter Einsatz → eingeplant.
  const geplant = candidates
    .filter((p) => dateKey(p.von) > t)
    .sort((a, b) => dateKey(a.von) - dateKey(b.von));
  if (geplant.length) return { ...pick(geplant[0]), state: "geplant" };

  return { state: "offen", von: null, bis: null, departmentName: null };
}

// Aktuelles Ausbildungsjahr (1-basiert). Bezugspunkt: Monat/Tag des Starts.
export function ausbildungsjahr(start: Date, now: Date = new Date()): number {
  let years = now.getFullYear() - start.getUTCFullYear();
  const sm = start.getUTCMonth();
  const sd = start.getUTCDate();
  if (now.getMonth() < sm || (now.getMonth() === sm && now.getDate() < sd)) {
    years--;
  }
  return Math.max(1, years + 1);
}

// Gesamtdauer der Ausbildung in Jahren (auf halbe Jahre gerundet, min. 1).
export function ausbildungsdauerJahre(start: Date, ende: Date): number {
  const ms = ende.getTime() - start.getTime();
  const jahre = ms / (365.25 * 24 * 60 * 60 * 1000);
  return Math.max(1, Math.round(jahre * 2) / 2);
}

// Note (1–5) → Klartext für die Anzeige "Bewertung · gut".
export function bewertungLabel(wert: number | null | undefined): string | null {
  if (wert == null) return null;
  return (
    { 1: "sehr gut", 2: "gut", 3: "befriedigend", 4: "ausreichend", 5: "mangelhaft" }[
      wert
    ] ?? null
  );
}
