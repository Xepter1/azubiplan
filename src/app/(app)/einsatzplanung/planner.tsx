"use client";

import {
  type DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { X, AlertTriangle, GripVertical } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type AbsenceLite,
  type DeptBlockLite,
  type RuleContext,
  type SchoolBlockLite,
  type Violation,
  abgeschlosseneWochen,
  violationsFor,
  violationsForCandidate,
} from "@/lib/planner-rules";
import { createPlacement, deletePlacement, updatePlacement } from "./actions";

type Apprentice = {
  id: string;
  vorname: string;
  nachname: string;
  professionId: string | null;
  classId: string | null;
  start: string; // ISO
};
type Department = {
  id: string;
  name: string;
  kapazitaet: number | null;
  professionIds: string[];
};
type Profession = { id: string; bezeichnung: string };
type Soll = Record<string, number | null>;
type Placement = {
  id: string;
  apprenticeId: string;
  departmentId: string;
  departmentName: string;
  von: string; // ISO
  bis: string; // ISO
};

type Mode = "monat" | "woche" | "tag";
type Col = {
  key: string;
  label: string;
  sub?: string;
  startKey: number;
  endKey: number;
  vonStr: string;
  bisStr: string;
  weekend?: boolean;
};
type Edge = "start" | "end";
type DragPayload =
  | { type: "new"; departmentId: string }
  | { type: "resize"; placementId: string; edge: Edge };

const PALETTE = [
  "indigo",
  "emerald",
  "amber",
  "rose",
  "sky",
  "violet",
  "teal",
  "orange",
] as const;
const BAR_CLASS: Record<string, string> = {
  indigo: "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/70 dark:text-indigo-50",
  emerald: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/70 dark:text-emerald-50",
  amber: "bg-amber-100 text-amber-900 dark:bg-amber-900/70 dark:text-amber-50",
  rose: "bg-rose-100 text-rose-900 dark:bg-rose-900/70 dark:text-rose-50",
  sky: "bg-sky-100 text-sky-900 dark:bg-sky-900/70 dark:text-sky-50",
  violet: "bg-violet-100 text-violet-900 dark:bg-violet-900/70 dark:text-violet-50",
  teal: "bg-teal-100 text-teal-900 dark:bg-teal-900/70 dark:text-teal-50",
  orange: "bg-orange-100 text-orange-900 dark:bg-orange-900/70 dark:text-orange-50",
};
const DOT_CLASS: Record<string, string> = {
  indigo: "bg-indigo-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  teal: "bg-teal-500",
  orange: "bg-orange-500",
};

const MONTH_FMT = new Intl.DateTimeFormat("de-DE", { month: "short", year: "numeric" });
const RANGE_FMT = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function addMonths(date: Date, n: number) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}
function addDays(date: Date, n: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}
function startOfQuarter(now: Date) {
  return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
}
function startOfWeek(now: Date) {
  const day = (now.getDay() + 6) % 7;
  return addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), -day);
}
function startOfDay(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
function lastDayOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}
function ymd(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function ymdLocal(d: Date) {
  return ymd(d.getFullYear(), d.getMonth(), d.getDate());
}
function calKey(year: number, monthIndex: number, day: number) {
  return year * 10000 + (monthIndex + 1) * 100 + day;
}
function keyLocal(d: Date) {
  return calKey(d.getFullYear(), d.getMonth(), d.getDate());
}
function isoToKey(iso: string) {
  const dt = new Date(iso);
  return calKey(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
}
function isoWeek(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const fDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - fDayNum + 3);
  return 1 + Math.round((date.getTime() - firstThursday.getTime()) / 604800000);
}
function ausbildungsjahr(startISO: string, now: Date) {
  const s = new Date(startISO);
  let years = now.getFullYear() - s.getUTCFullYear();
  const sm = s.getUTCMonth();
  const sd = s.getUTCDate();
  if (now.getMonth() < sm || (now.getMonth() === sm && now.getDate() < sd)) years--;
  return Math.max(1, years + 1);
}
function defaultAnchor(mode: Mode, now: Date) {
  if (mode === "monat") return startOfQuarter(now);
  if (mode === "woche") return startOfWeek(now);
  return startOfDay(now);
}
function buildColumns(mode: Mode, anchor: Date): Col[] {
  const cols: Col[] = [];
  if (mode === "monat") {
    for (let i = 0; i < 3; i++) {
      const dt = addMonths(anchor, i);
      const y = dt.getFullYear();
      const m = dt.getMonth();
      const last = lastDayOfMonth(y, m);
      cols.push({
        key: `m${y}-${m}`,
        label: MONTH_FMT.format(dt),
        startKey: calKey(y, m, 1),
        endKey: calKey(y, m, last),
        vonStr: ymd(y, m, 1),
        bisStr: ymd(y, m, last),
      });
    }
  } else if (mode === "woche") {
    for (let i = 0; i < 8; i++) {
      const start = addDays(anchor, i * 7);
      const end = addDays(start, 6);
      cols.push({
        key: `w${keyLocal(start)}`,
        label: `KW ${isoWeek(start)}`,
        sub: `${start.getDate()}.${start.getMonth() + 1}.`,
        startKey: keyLocal(start),
        endKey: keyLocal(end),
        vonStr: ymdLocal(start),
        bisStr: ymdLocal(end),
      });
    }
  } else {
    for (let i = 0; i < 14; i++) {
      const dt = addDays(anchor, i);
      const wd = (dt.getDay() + 6) % 7;
      cols.push({
        key: `d${keyLocal(dt)}`,
        label: WEEKDAYS[wd],
        sub: `${dt.getDate()}.`,
        startKey: keyLocal(dt),
        endKey: keyLocal(dt),
        vonStr: ymdLocal(dt),
        bisStr: ymdLocal(dt),
        weekend: wd >= 5,
      });
    }
  }
  return cols;
}

export function Planner({
  apprentices,
  departments,
  professions,
  placements,
  soll,
  schoolBlocks,
  absenceBlocks,
  departmentBlocks,
}: {
  apprentices: Apprentice[];
  departments: Department[];
  professions: Profession[];
  placements: Placement[];
  soll: Soll;
  schoolBlocks: SchoolBlockLite[];
  absenceBlocks: AbsenceLite[];
  departmentBlocks: DeptBlockLite[];
}) {
  const now = useMemo(() => new Date(), []);

  const colorOf = useMemo(() => {
    const map: Record<string, string> = {};
    [...departments]
      .sort((a, b) => a.id.localeCompare(b.id))
      .forEach((dep, i) => {
        map[dep.id] = PALETTE[i % PALETTE.length];
      });
    return map;
  }, [departments]);

  const defaultProfession = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of apprentices) {
      if (a.professionId)
        counts.set(a.professionId, (counts.get(a.professionId) ?? 0) + 1);
    }
    let best = professions[0]?.id ?? "";
    let bestN = -1;
    for (const p of professions) {
      const n = counts.get(p.id) ?? 0;
      if (n > bestN) {
        bestN = n;
        best = p.id;
      }
    }
    return best;
  }, [apprentices, professions]);

  const [professionId, setProfessionId] = useState(defaultProfession);
  const [year, setYear] = useState(0);
  const [mode, setMode] = useState<Mode>("monat");
  const [anchor, setAnchor] = useState(() => startOfQuarter(new Date()));
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [activeResize, setActiveResize] = useState<{
    placementId: string;
    edge: Edge;
  } | null>(null);
  const [preview, setPreview] = useState<{
    placementId: string;
    edge: Edge;
    colIndex: number;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  // Bestätigungsdialog beim Ablegen trotz Regelverletzung.
  const [pendingDrop, setPendingDrop] = useState<{
    apprenticeId: string;
    departmentId: string;
    von: string;
    bis: string;
    departmentName: string;
    violations: Violation[];
  } | null>(null);
  // Schwebender Hover-Tooltip (viewport-fix → nicht vom Scroll-Container
  // abgeschnitten). Für "!"-Hinweise und die Fortschritts-Punkte.
  const [tip, setTip] = useState<{ x: number; y: number; lines: string[] } | null>(
    null,
  );
  function showTip(e: { currentTarget: HTMLElement }, lines: string[]) {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ x: r.left + r.width / 2, y: r.top, lines });
  }
  const hideTip = () => setTip(null);
  const droppedRef = useRef(false);
  const dragGhostRef = useRef<HTMLSpanElement>(null);

  // Zuordnungs-Maps + Regel-Kontext (für "!"-Markierungen und Vorab-Check).
  const apprenticeProfession = useMemo(() => {
    const m: Record<string, string | null> = {};
    for (const a of apprentices) m[a.id] = a.professionId;
    return m;
  }, [apprentices]);
  const apprenticeClass = useMemo(() => {
    const m: Record<string, string | null> = {};
    for (const a of apprentices) m[a.id] = a.classId;
    return m;
  }, [apprentices]);
  const departmentMap = useMemo(() => {
    const m: Record<string, Department> = {};
    for (const d of departments) m[d.id] = d;
    return m;
  }, [departments]);
  const ruleCtx: RuleContext = useMemo(
    () => ({
      placements: placements.map((p) => ({
        id: p.id,
        apprenticeId: p.apprenticeId,
        departmentId: p.departmentId,
        von: p.von,
        bis: p.bis,
      })),
      departments: departmentMap,
      soll,
      school: schoolBlocks,
      absence: absenceBlocks,
      deptBlocks: departmentBlocks,
      apprenticeProfession,
      apprenticeClass,
      today: now.toISOString(),
    }),
    [
      placements,
      departmentMap,
      soll,
      schoolBlocks,
      absenceBlocks,
      departmentBlocks,
      apprenticeProfession,
      apprenticeClass,
      now,
    ],
  );

  // Regelverletzungen je Einsatz EINMAL berechnen (nicht pro Render/Drag-Frame),
  // damit das Ziehen flüssig bleibt.
  const violationsByPlacement = useMemo(() => {
    const m = new Map<string, Violation[]>();
    for (const p of placements) m.set(p.id, violationsFor(p, ruleCtx));
    return m;
  }, [placements, ruleCtx]);

  // Fortschritts-Punkte je Azubi: voll = Station durchlaufen (Soll abgeschlossen),
  // matt = begonnen/laufend. Geplante Zukunft ohne abgeschlossene Zeit → kein Punkt.
  function dotsFor(a: Apprentice) {
    const prof = a.professionId;
    if (!prof) return [] as { id: string; full: boolean }[];
    const today = now.toISOString();
    const tk = isoToKey(today);
    return departments
      .filter((d) => d.professionIds.includes(prof))
      .sort((x, y) => x.id.localeCompare(y.id))
      .map((d) => {
        const own = placements.filter(
          (p) => p.apprenticeId === a.id && p.departmentId === d.id,
        );
        const done = abgeschlosseneWochen(own, a.id, d.id, today);
        const ongoing = own.some(
          (p) => isoToKey(p.von) <= tk && tk <= isoToKey(p.bis),
        );
        if (done <= 0 && !ongoing) return null; // nur Zukunft → kein Punkt
        const sw = soll[`${d.id}:${prof}`];
        return { id: d.id, full: sw != null && done >= sw };
      })
      .filter((x): x is { id: string; full: boolean } => x !== null);
  }

  // Nach dem Speichern (neue Daten vom Server) Vorschau/Drag-Status zurücksetzen.
  useEffect(() => {
    setPreview(null);
    setActiveResize(null);
    droppedRef.current = false;
  }, [placements]);

  const cols = useMemo(() => buildColumns(mode, anchor), [mode, anchor]);

  const filtered = useMemo(
    () =>
      apprentices
        .filter((a) => a.professionId === professionId)
        .filter((a) => year === 0 || ausbildungsjahr(a.start, now) === year)
        .sort((a, b) =>
          `${a.nachname}${a.vorname}`.localeCompare(`${b.nachname}${b.vorname}`),
        ),
    [apprentices, professionId, year, now],
  );

  const suitable = useMemo(
    () => departments.filter((dep) => dep.professionIds.includes(professionId)),
    [departments, professionId],
  );

  // Effektive Grenzen inkl. Live-Vorschau.
  function effKeys(p: Placement) {
    let vonKey = isoToKey(p.von);
    let bisKey = isoToKey(p.bis);
    if (preview && preview.placementId === p.id && cols[preview.colIndex]) {
      if (preview.edge === "start") vonKey = cols[preview.colIndex].startKey;
      else bisKey = cols[preview.colIndex].endKey;
    }
    return { vonKey, bisKey };
  }
  function overlapsCol(p: Placement, c: Col) {
    const { vonKey, bisKey } = effKeys(p);
    return vonKey <= c.endKey && bisKey >= c.startKey;
  }
  // Überlappung eines Sperr-/Abwesenheits-Zeitraums mit einer Spalte.
  function blockOverlapsCol(von: string, bis: string, c: Col) {
    return isoToKey(von) <= c.endKey && isoToKey(bis) >= c.startKey;
  }
  function clampColIndex(p: Placement, edge: Edge, idx: number) {
    if (edge === "end") {
      let startIdx = cols.findIndex((c) => c.endKey >= isoToKey(p.von));
      if (startIdx < 0) startIdx = cols.length - 1;
      return Math.max(idx, startIdx);
    }
    let endIdx = 0;
    cols.forEach((c, i) => {
      if (c.startKey <= isoToKey(p.bis)) endIdx = i;
    });
    return Math.min(idx, endIdx);
  }

  function changeMode(m: Mode) {
    setMode(m);
    setAnchor(defaultAnchor(m, new Date()));
  }
  function shift(dir: number) {
    setAnchor((a) =>
      mode === "monat"
        ? addMonths(a, dir * 3)
        : mode === "woche"
          ? addDays(a, dir * 28)
          : addDays(a, dir * 7),
    );
  }

  function persistCreate(
    apprenticeId: string,
    departmentId: string,
    von: string,
    bis: string,
  ) {
    startTransition(async () => {
      await createPlacement({ apprenticeId, departmentId, von, bis });
    });
  }
  function createInCol(apprenticeId: string, c: Col, departmentId: string) {
    if (!departmentId) return;
    const violations = violationsForCandidate(
      { id: "__candidate__", apprenticeId, departmentId, von: c.vonStr, bis: c.bisStr },
      ruleCtx,
    );
    if (violations.length > 0) {
      // Regel verletzt → erst bestätigen, dann (bewusst) speichern.
      setPendingDrop({
        apprenticeId,
        departmentId,
        von: c.vonStr,
        bis: c.bisStr,
        departmentName: departmentMap[departmentId]?.name ?? "",
        violations,
      });
      return;
    }
    persistCreate(apprenticeId, departmentId, c.vonStr, c.bisStr);
  }
  function resizeToCol(placementId: string, edge: Edge, c: Col) {
    const p = placements.find((x) => x.id === placementId);
    if (!p) return;
    if (edge === "start") {
      const bisDate = p.bis.slice(0, 10);
      const von = c.vonStr > bisDate ? bisDate : c.vonStr;
      startTransition(async () => {
        await updatePlacement({ id: placementId, von });
      });
    } else {
      const vonDate = p.von.slice(0, 10);
      const bis = c.bisStr < vonDate ? vonDate : c.bisStr;
      startTransition(async () => {
        await updatePlacement({ id: placementId, bis });
      });
    }
  }
  function onCellDrop(apprenticeId: string, c: Col, raw: string) {
    let payload: DragPayload | null = null;
    try {
      payload = JSON.parse(raw) as DragPayload;
    } catch {
      return;
    }
    if (!payload) return;
    if (payload.type === "new") createInCol(apprenticeId, c, payload.departmentId);
    else if (payload.type === "resize")
      resizeToCol(payload.placementId, payload.edge, c);
  }
  function handleDelete(id: string) {
    startTransition(async () => {
      await deletePlacement(id);
    });
  }

  function startResize(e: DragEvent, placementId: string, edge: Edge) {
    setPreview(null); // evtl. hängengebliebene Vorschau zurücksetzen
    setActiveResize({ placementId, edge });
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ type: "resize", placementId, edge }),
    );
    e.dataTransfer.effectAllowed = "copy";
    // Drag-Geist verstecken, damit die Live-Vorschau das Feedback ist.
    if (dragGhostRef.current) e.dataTransfer.setDragImage(dragGhostRef.current, 0, 0);
  }
  function endDrag() {
    if (!droppedRef.current) setPreview(null);
    setActiveResize(null);
    setHoverKey(null);
    droppedRef.current = false;
  }

  const colMin = mode === "tag" ? 44 : mode === "woche" ? 72 : 0;
  const gridCols = `180px repeat(${cols.length}, minmax(${colMin}px, 1fr))`;
  const innerMinWidth = 180 + cols.length * (colMin || 120);
  const rangeLabel =
    mode === "monat"
      ? `${MONTH_FMT.format(anchor)} – ${MONTH_FMT.format(addMonths(anchor, 2))}`
      : `${RANGE_FMT.format(anchor)} – ${RANGE_FMT.format(addDays(anchor, mode === "woche" ? 55 : 13))}`;

  return (
    <div className={cn(isPending && "pointer-events-none opacity-70")}>
      {/* unsichtbarer Drag-Geist */}
      <span ref={dragGhostRef} className="pointer-events-none fixed -left-[9999px] top-0 size-0" />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-xs text-muted-foreground">
          Beruf
          <select
            value={professionId}
            onChange={(e) => setProfessionId(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground"
          >
            {professions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.bezeichnung}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Ausbildungsjahr
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground"
          >
            <option value={0}>alle</option>
            <option value={1}>1. Jahr</option>
            <option value={2}>2. Jahr</option>
            <option value={3}>3. Jahr</option>
            <option value={4}>4. Jahr</option>
          </select>
        </label>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border p-0.5">
            {(["monat", "woche", "tag"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => changeMode(m)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                  mode === m
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => shift(-1)}>
              ‹
            </Button>
            <span className="min-w-44 text-center text-sm font-medium">{rangeLabel}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => shift(1)}>
              ›
            </Button>
          </div>
        </div>
      </div>

      {/* Legende */}
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-5 rounded bg-indigo-500" />
          Abteilung — eine Farbe je Abteilung
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-3 w-5 rounded bg-muted"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, color-mix(in oklch, var(--muted-foreground) 18%, transparent) 0 5px, transparent 5px 10px)",
            }}
          />
          Berufsschule
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-5 rounded bg-muted/60" />
          Urlaub
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-5 rounded bg-indigo-100 dark:bg-indigo-950/60" />
          Prüfung / Prüfungsvorb.
        </span>
        <span className="inline-flex items-center gap-1.5 border-l pl-5">
          <span className="size-2 rounded-full bg-indigo-500" />
          voll = Station erledigt
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-indigo-500 opacity-30" />
          matt = begonnen
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="flex size-4 items-center justify-center rounded-full bg-amber-400 text-amber-950">
            <AlertTriangle className="size-2.5" />
          </span>
          Regel verletzt (trotzdem speicherbar)
        </span>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row">
        <Card className="flex-1 overflow-hidden">
          <CardContent className="overflow-x-auto">
            <div style={{ minWidth: innerMinWidth }}>
              <div
                className="grid items-end border-b pb-2 text-xs font-medium text-muted-foreground"
                style={{ gridTemplateColumns: gridCols }}
              >
                <div className="pl-1">Azubi</div>
                {cols.map((c) => (
                  <div
                    key={c.key}
                    className={cn(
                      "px-1 text-center leading-tight",
                      c.weekend && "rounded-t bg-muted/50",
                    )}
                  >
                    <div>{c.label}</div>
                    {c.sub && (
                      <div className="text-[10px] font-normal text-muted-foreground/80">
                        {c.sub}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {filtered.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Keine Azubis für diese Auswahl — Beruf oder Jahr anpassen.
                </p>
              ) : (
                filtered.map((a) => (
                  <div
                    key={a.id}
                    className="grid items-stretch border-b last:border-0"
                    style={{ gridTemplateColumns: gridCols }}
                  >
                    <div className="py-3 pr-3 pl-1">
                      <div className="text-sm font-medium">
                        {a.nachname}, {a.vorname}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{ausbildungsjahr(a.start, now)}. Jahr</span>
                        <span className="flex items-center gap-1">
                          {dotsFor(a).map((d) => {
                            const depName =
                              departmentMap[d.id]?.name ?? "Abteilung";
                            return (
                              <span
                                key={d.id}
                                title={depName}
                                onMouseEnter={(e) => showTip(e, [depName])}
                                onMouseLeave={hideTip}
                                className="-m-1 cursor-default p-1"
                              >
                                <span
                                  className={cn(
                                    "block size-2 rounded-full",
                                    DOT_CLASS[colorOf[d.id]] ?? DOT_CLASS.indigo,
                                    !d.full && "opacity-30",
                                  )}
                                />
                              </span>
                            );
                          })}
                        </span>
                      </div>
                    </div>
                    {cols.map((c, idx) => {
                      const cellKey = `${a.id}:${c.key}`;
                      const cellPlacements = placements.filter(
                        (p) => p.apprenticeId === a.id && overlapsCol(p, c),
                      );
                      const cellOverlays = [
                        ...schoolBlocks
                          .filter(
                            (s) =>
                              s.classId === a.classId &&
                              blockOverlapsCol(s.von, s.bis, c),
                          )
                          .map((s, i) => ({
                            key: `bs${i}`,
                            kind: "bs" as const,
                            von: s.von,
                            bis: s.bis,
                            label: "Berufsschule",
                            short: "BS",
                          })),
                        ...absenceBlocks
                          .filter(
                            (b) =>
                              b.apprenticeId === a.id &&
                              blockOverlapsCol(b.von, b.bis, c),
                          )
                          .map((b, i) => ({
                            key: `ab${i}`,
                            kind:
                              b.typ === "URLAUB"
                                ? ("urlaub" as const)
                                : ("pruefung" as const),
                            von: b.von,
                            bis: b.bis,
                            label: b.typ === "URLAUB" ? "Urlaub" : "Prüfung",
                            short: b.typ === "URLAUB" ? "Urlaub" : "Prüfung",
                          })),
                      ];
                      return (
                        <div
                          key={c.key}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "copy";
                            if (activeResize) {
                              const p = placements.find(
                                (x) => x.id === activeResize.placementId,
                              );
                              if (p && p.apprenticeId === a.id) {
                                const ci = clampColIndex(p, activeResize.edge, idx);
                                setPreview((prev) =>
                                  prev &&
                                  prev.placementId === activeResize.placementId &&
                                  prev.edge === activeResize.edge &&
                                  prev.colIndex === ci
                                    ? prev
                                    : {
                                        placementId: activeResize.placementId,
                                        edge: activeResize.edge,
                                        colIndex: ci,
                                      },
                                );
                              }
                            } else {
                              setHoverKey((k) => (k === cellKey ? k : cellKey));
                            }
                          }}
                          onDragLeave={() =>
                            setHoverKey((k) => (k === cellKey ? null : k))
                          }
                          onDrop={(e) => {
                            e.preventDefault();
                            setHoverKey(null);
                            droppedRef.current = true;
                            onCellDrop(a.id, c, e.dataTransfer.getData("text/plain"));
                          }}
                          className={cn(
                            "flex min-h-16 flex-col justify-center gap-1 border-l py-1.5 transition-colors",
                            c.weekend && "bg-muted/30",
                            hoverKey === cellKey && "bg-indigo-50 dark:bg-indigo-950/40",
                          )}
                        >
                          {cellOverlays.map((o) => {
                            const isStart = !(
                              idx > 0 && blockOverlapsCol(o.von, o.bis, cols[idx - 1])
                            );
                            const isEnd = !(
                              idx < cols.length - 1 &&
                              blockOverlapsCol(o.von, o.bis, cols[idx + 1])
                            );
                            return (
                              <div
                                key={o.key}
                                title={o.label}
                                className={cn(
                                  "flex h-7 items-center overflow-hidden text-xs font-medium",
                                  isStart && "rounded-l-md",
                                  isEnd && "rounded-r-md",
                                  o.kind === "bs" &&
                                    "bg-muted text-muted-foreground/80",
                                  o.kind === "urlaub" &&
                                    "bg-muted/60 text-muted-foreground",
                                  o.kind === "pruefung" &&
                                    "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
                                )}
                                style={
                                  o.kind === "bs"
                                    ? {
                                        backgroundImage:
                                          "repeating-linear-gradient(45deg, color-mix(in oklch, var(--muted-foreground) 18%, transparent) 0 5px, transparent 5px 10px)",
                                      }
                                    : undefined
                                }
                              >
                                {isStart && (
                                  <span className="truncate px-2">{o.short}</span>
                                )}
                              </div>
                            );
                          })}
                          {cellPlacements.map((p) => {
                            const isStart = !(idx > 0 && overlapsCol(p, cols[idx - 1]));
                            const isEnd = !(
                              idx < cols.length - 1 && overlapsCol(p, cols[idx + 1])
                            );
                            const barColor =
                              BAR_CLASS[colorOf[p.departmentId]] ?? BAR_CLASS.indigo;
                            const resizing = preview?.placementId === p.id;
                            const vio = violationsByPlacement.get(p.id) ?? [];
                            return (
                              <div
                                key={p.id}
                                className={cn(
                                  "group/bar relative flex h-7 items-center",
                                  barColor,
                                  isStart && "rounded-l-md",
                                  isEnd && "rounded-r-md",
                                  resizing && "ring-2 ring-foreground/30",
                                  vio.length > 0 &&
                                    "ring-2 ring-amber-500/70 ring-inset",
                                )}
                                title={
                                  vio.length > 0
                                    ? vio.map((v) => "• " + v.text).join("\n")
                                    : undefined
                                }
                              >
                                {isStart && (
                                  <span className="flex min-w-0 items-center gap-1 px-2">
                                    {vio.length > 0 && (
                                      <span
                                        title={vio.map((v) => "• " + v.text).join("\n")}
                                        onMouseEnter={(e) =>
                                          showTip(e, vio.map((v) => v.text))
                                        }
                                        onMouseLeave={hideTip}
                                        className="flex size-4 shrink-0 cursor-default items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow-sm"
                                      >
                                        <AlertTriangle className="size-2.5" />
                                      </span>
                                    )}
                                    <span className="truncate text-xs font-medium">
                                      {p.departmentName}
                                    </span>
                                  </span>
                                )}
                                {isEnd && (
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(p.id)}
                                    className="ml-auto mr-2 shrink-0 opacity-0 transition-opacity group-hover/bar:opacity-100"
                                    aria-label="Einsatz entfernen"
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                )}
                                {isStart && (
                                  <span
                                    draggable
                                    onDragStart={(e) => startResize(e, p.id, "start")}
                                    onDragEnd={endDrag}
                                    title="Anfang ziehen"
                                    className="absolute left-0 top-0 h-full w-2 cursor-ew-resize rounded-l-md bg-black/10 hover:bg-black/30 dark:bg-white/15 dark:hover:bg-white/40"
                                  />
                                )}
                                {isEnd && (
                                  <span
                                    draggable
                                    onDragStart={(e) => startResize(e, p.id, "end")}
                                    onDragEnd={endDrag}
                                    title="Ende ziehen"
                                    className="absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r-md bg-black/10 hover:bg-black/30 dark:bg-white/15 dark:hover:bg-white/40"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="xl:w-64 xl:shrink-0">
          <CardHeader>
            <CardTitle>Abteilungen</CardTitle>
            <p className="text-xs text-muted-foreground">
              Auf eine Woche ziehen &amp; ablegen
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {suitable.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Für diesen Beruf sind keine Abteilungen hinterlegt.
              </p>
            ) : (
              suitable.map((dep) => (
                <div
                  key={dep.id}
                  draggable
                  onDragStart={(e) => {
                    setActiveResize(null);
                    setPreview(null);
                    e.dataTransfer.setData(
                      "text/plain",
                      JSON.stringify({ type: "new", departmentId: dep.id }),
                    );
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onDragEnd={endDrag}
                  className="flex cursor-grab items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm shadow-xs hover:bg-muted active:cursor-grabbing"
                >
                  <span
                    className={cn(
                      "size-3 shrink-0 rounded-full",
                      DOT_CLASS[colorOf[dep.id]] ?? DOT_CLASS.indigo,
                    )}
                  />
                  <span className="truncate">{dep.name}</span>
                  {dep.kapazitaet != null && (
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      max. {dep.kapazitaet}
                    </span>
                  )}
                  <GripVertical className="size-4 shrink-0 text-muted-foreground/50" />
                </div>
              ))
            )}
            <p className="pt-2 text-xs text-muted-foreground">
              Abteilung auf eine Spalte ziehen, um einen Einsatz anzulegen
              (1&nbsp;{mode === "monat" ? "Monat" : mode === "woche" ? "Woche" : "Tag"}).
              Enden ziehen verlängert/verkürzt — die Vorschau läuft live mit.
            </p>
          </CardContent>
        </Card>
      </div>

      {pendingDrop && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setPendingDrop(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                <AlertTriangle className="size-4" />
              </span>
              <h2 className="text-lg font-semibold">Regel verletzt</h2>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {pendingDrop.departmentName}
              </span>{" "}
              verstößt hier gegen{" "}
              {pendingDrop.violations.length === 1
                ? "eine Regel"
                : `${pendingDrop.violations.length} Regeln`}
              :
            </p>
            <ul className="mb-5 space-y-1.5">
              {pendingDrop.violations.map((v, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  {v.text}
                </li>
              ))}
            </ul>
            <p className="mb-4 text-xs text-muted-foreground">
              Du kannst die Zuweisung als bewusste Ausnahme trotzdem speichern.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPendingDrop(null)}
              >
                Abbrechen
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const d = pendingDrop;
                  setPendingDrop(null);
                  persistCreate(d.apprenticeId, d.departmentId, d.von, d.bis);
                }}
              >
                Trotzdem zuweisen
              </Button>
            </div>
          </div>
        </div>
      )}

      {tip && (
        <div
          className="pointer-events-none fixed z-[60] max-w-xs -translate-x-1/2 -translate-y-full rounded-lg bg-foreground px-2.5 py-1.5 text-xs leading-snug text-background shadow-lg"
          style={{ left: tip.x, top: tip.y - 8 }}
        >
          {tip.lines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}
