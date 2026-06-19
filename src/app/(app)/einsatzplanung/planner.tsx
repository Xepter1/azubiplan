"use client";

import {
  type DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { X } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createPlacement, deletePlacement, updatePlacement } from "./actions";

type Apprentice = {
  id: string;
  vorname: string;
  nachname: string;
  professionId: string | null;
  start: string; // ISO
};
type Department = { id: string; name: string; professionIds: string[] };
type Profession = { id: string; bezeichnung: string };
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
}: {
  apprentices: Apprentice[];
  departments: Department[];
  professions: Profession[];
  placements: Placement[];
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
  const droppedRef = useRef(false);
  const dragGhostRef = useRef<HTMLSpanElement>(null);

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

  function createInCol(apprenticeId: string, c: Col, departmentId: string) {
    if (!departmentId) return;
    startTransition(async () => {
      await createPlacement({ apprenticeId, departmentId, von: c.vonStr, bis: c.bisStr });
    });
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
                      <div className="text-xs text-muted-foreground">
                        {ausbildungsjahr(a.start, now)}. Jahr
                      </div>
                    </div>
                    {cols.map((c, idx) => {
                      const cellKey = `${a.id}:${c.key}`;
                      const cellPlacements = placements.filter(
                        (p) => p.apprenticeId === a.id && overlapsCol(p, c),
                      );
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
                          {cellPlacements.map((p) => {
                            const isStart = !(idx > 0 && overlapsCol(p, cols[idx - 1]));
                            const isEnd = !(
                              idx < cols.length - 1 && overlapsCol(p, cols[idx + 1])
                            );
                            const barColor =
                              BAR_CLASS[colorOf[p.departmentId]] ?? BAR_CLASS.indigo;
                            const resizing = preview?.placementId === p.id;
                            return (
                              <div
                                key={p.id}
                                className={cn(
                                  "group/bar relative flex h-7 items-center",
                                  barColor,
                                  isStart && "rounded-l-md",
                                  isEnd && "rounded-r-md",
                                  resizing && "ring-2 ring-foreground/30",
                                )}
                              >
                                {isStart && (
                                  <span className="truncate px-2 text-xs font-medium">
                                    {p.departmentName}
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
            <CardTitle>Geeignete Abteilungen</CardTitle>
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
    </div>
  );
}
