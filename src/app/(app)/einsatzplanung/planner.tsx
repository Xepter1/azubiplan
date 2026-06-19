"use client";

import { useMemo, useState, useTransition } from "react";
import { GripVertical, X } from "lucide-react";

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

const MONTH_FMT = new Intl.DateTimeFormat("de-DE", {
  month: "short",
  year: "numeric",
});

function startOfQuarter(now: Date) {
  return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
}
function addMonths(date: Date, n: number) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}
function lastDayOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}
function ymd(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function calKey(year: number, monthIndex: number, day: number) {
  return year * 10000 + (monthIndex + 1) * 100 + day;
}
function isoToKey(iso: string) {
  const dt = new Date(iso);
  return calKey(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
}
function overlapsMonth(p: Placement, m: Date) {
  const y = m.getFullYear();
  const mi = m.getMonth();
  return (
    isoToKey(p.von) <= calKey(y, mi, lastDayOfMonth(y, mi)) &&
    isoToKey(p.bis) >= calKey(y, mi, 1)
  );
}
function ausbildungsjahr(startISO: string, now: Date) {
  const s = new Date(startISO);
  let years = now.getFullYear() - s.getUTCFullYear();
  const sm = s.getUTCMonth();
  const sd = s.getUTCDate();
  if (now.getMonth() < sm || (now.getMonth() === sm && now.getDate() < sd)) {
    years--;
  }
  return Math.max(1, years + 1);
}

type DragPayload =
  | { type: "new"; departmentId: string }
  | { type: "resize"; placementId: string; edge: "start" | "end" };

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
  const [year, setYear] = useState(0); // 0 = alle
  const [quarterStart, setQuarterStart] = useState(() =>
    startOfQuarter(new Date()),
  );
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const months = useMemo(
    () => [0, 1, 2].map((i) => addMonths(quarterStart, i)),
    [quarterStart],
  );

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

  function placementsInMonth(apprenticeId: string, m: Date) {
    return placements.filter(
      (p) => p.apprenticeId === apprenticeId && overlapsMonth(p, m),
    );
  }

  function createInMonth(apprenticeId: string, m: Date, departmentId: string) {
    if (!departmentId) return;
    const y = m.getFullYear();
    const mi = m.getMonth();
    const von = ymd(y, mi, 1);
    const bis = ymd(y, mi, lastDayOfMonth(y, mi));
    startTransition(async () => {
      await createPlacement({ apprenticeId, departmentId, von, bis });
    });
  }

  function resizeToMonth(
    placementId: string,
    edge: "start" | "end",
    m: Date,
  ) {
    const p = placements.find((x) => x.id === placementId);
    if (!p) return;
    const y = m.getFullYear();
    const mi = m.getMonth();

    if (edge === "start") {
      // Start auf Monatsanfang; nicht hinter das Ende rutschen lassen.
      let von = ymd(y, mi, 1);
      if (calKey(y, mi, 1) > isoToKey(p.bis)) {
        const b = new Date(p.bis);
        von = ymd(b.getUTCFullYear(), b.getUTCMonth(), 1);
      }
      startTransition(async () => {
        await updatePlacement({ id: placementId, von });
      });
    } else {
      // Ende auf Monatsende; nicht vor den Start rutschen lassen.
      let bis = ymd(y, mi, lastDayOfMonth(y, mi));
      if (calKey(y, mi, lastDayOfMonth(y, mi)) < isoToKey(p.von)) {
        const v = new Date(p.von);
        const vy = v.getUTCFullYear();
        const vm = v.getUTCMonth();
        bis = ymd(vy, vm, lastDayOfMonth(vy, vm));
      }
      startTransition(async () => {
        await updatePlacement({ id: placementId, bis });
      });
    }
  }

  function onCellDrop(apprenticeId: string, m: Date, raw: string) {
    let payload: DragPayload | null = null;
    try {
      payload = JSON.parse(raw) as DragPayload;
    } catch {
      return;
    }
    if (!payload) return;
    if (payload.type === "new") {
      createInMonth(apprenticeId, m, payload.departmentId);
    } else if (payload.type === "resize") {
      resizeToMonth(payload.placementId, payload.edge, m);
    }
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deletePlacement(id);
    });
  }

  const gridCols = "180px repeat(3, minmax(0, 1fr))";

  return (
    <div className={cn(isPending && "pointer-events-none opacity-70")}>
      {/* Filter */}
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
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setQuarterStart(addMonths(quarterStart, -3))}
          >
            ‹
          </Button>
          <span className="min-w-44 text-center text-sm font-medium">
            {MONTH_FMT.format(months[0])} – {MONTH_FMT.format(months[2])}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setQuarterStart(addMonths(quarterStart, 3))}
          >
            ›
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row">
        {/* Planer-Raster */}
        <Card className="flex-1 overflow-hidden">
          <CardContent className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div
                className="grid items-center border-b pb-2 text-xs font-medium text-muted-foreground"
                style={{ gridTemplateColumns: gridCols }}
              >
                <div className="pl-1">Azubi</div>
                {months.map((m, i) => (
                  <div key={i} className="px-2 text-center">
                    {MONTH_FMT.format(m)}
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
                    {months.map((m, i) => {
                      const key = `${a.id}:${i}`;
                      const cell = placementsInMonth(a.id, m);
                      return (
                        <div
                          key={i}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "copy";
                          }}
                          onDragEnter={() => setHoverKey(key)}
                          onDragLeave={() =>
                            setHoverKey((k) => (k === key ? null : k))
                          }
                          onDrop={(e) => {
                            e.preventDefault();
                            setHoverKey(null);
                            onCellDrop(a.id, m, e.dataTransfer.getData("text/plain"));
                          }}
                          className={cn(
                            "flex min-h-16 flex-col justify-center gap-1 border-l py-1.5 transition-colors",
                            hoverKey === key && "bg-indigo-50 dark:bg-indigo-950/40",
                          )}
                        >
                          {cell.map((p) => {
                            const isStart = !(i > 0 && overlapsMonth(p, months[i - 1]));
                            const isEnd = !(i < 2 && overlapsMonth(p, months[i + 1]));
                            return (
                              <div
                                key={p.id}
                                className={cn(
                                  "group/bar relative flex h-7 items-center bg-indigo-100 text-indigo-900 dark:bg-indigo-900/60 dark:text-indigo-100",
                                  isStart && "rounded-l-md",
                                  isEnd && "rounded-r-md",
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
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData(
                                        "text/plain",
                                        JSON.stringify({
                                          type: "resize",
                                          placementId: p.id,
                                          edge: "start",
                                        }),
                                      );
                                      e.dataTransfer.effectAllowed = "move";
                                    }}
                                    title="Anfang ziehen"
                                    className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize rounded-l-md bg-indigo-400/40 hover:bg-indigo-500/70"
                                  />
                                )}
                                {isEnd && (
                                  <span
                                    draggable
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData(
                                        "text/plain",
                                        JSON.stringify({
                                          type: "resize",
                                          placementId: p.id,
                                          edge: "end",
                                        }),
                                      );
                                      e.dataTransfer.effectAllowed = "move";
                                    }}
                                    title="Ende ziehen"
                                    className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize rounded-r-md bg-indigo-400/40 hover:bg-indigo-500/70"
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

        {/* Abteilungs-Palette */}
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
                    e.dataTransfer.setData(
                      "text/plain",
                      JSON.stringify({ type: "new", departmentId: dep.id }),
                    );
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  className="flex cursor-grab items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm shadow-xs hover:bg-muted active:cursor-grabbing"
                >
                  <GripVertical className="size-4 text-muted-foreground" />
                  <span className="truncate">{dep.name}</span>
                </div>
              ))
            )}
            <p className="pt-2 text-xs text-muted-foreground">
              Abteilung auf einen Monat ziehen, um einen Einsatz anzulegen. Die
              Enden eines Einsatzes kannst du auf andere Monate ziehen, um ihn zu
              verlängern oder zu verkürzen.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
