"use client";

import { type CSSProperties, useMemo, useState } from "react";
import { Sun, Plane } from "lucide-react";

import { cn } from "@/lib/utils";

export type KalPlacement = { color: string; label: string; von: string; bis: string };
export type KalBlock = { von: string; bis: string };
type Absence = { typ: "URLAUB" | "PRUEFUNG" | "PRUEFUNGSVORBEREITUNG"; von: string; bis: string };

type Kind = "placement" | "bs" | "urlaub" | "pruefung";
type Mode = "tag" | "woche" | "monat";

const HATCH =
  "repeating-linear-gradient(45deg, color-mix(in oklch, var(--muted-foreground) 18%, transparent) 0 5px, transparent 5px 10px)";
const MONTHS_SHORT = [
  "Jan", "Feb", "März", "Apr", "Mai", "Juni",
  "Juli", "Aug", "Sep", "Okt", "Nov", "Dez",
];
const MODES: { key: Mode; label: string }[] = [
  { key: "tag", label: "Tag" },
  { key: "woche", label: "Woche" },
  { key: "monat", label: "Monat" },
];
const COLW: Record<Mode, number> = { tag: 22, woche: 40, monat: 60 };
const dateFmt = new Intl.DateTimeFormat("de-DE");

const addDays = (d: Date, n: number) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
};
const startOfWeek = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));
const keyOf = (d: Date) =>
  d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
const keyIso = (iso: string) => Number(iso.slice(0, 10).replaceAll("-", ""));
function isoWeek(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dn = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dn + 3);
  const ft = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const fd = (ft.getUTCDay() + 6) % 7;
  ft.setUTCDate(ft.getUTCDate() - fd + 3);
  return 1 + Math.round((date.getTime() - ft.getTime()) / 604_800_000);
}

type Col = {
  startKey: number;
  endKey: number;
  label: string;
  sub: string | null;
  isNow: boolean;
  weekend?: boolean;
};

function buildCols(mode: Mode, now: Date): Col[] {
  const t = keyOf(now);
  const cols: Col[] = [];
  if (mode === "monat") {
    const base = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    for (let i = 0; i < 8; i++) {
      const s = new Date(base.getFullYear(), base.getMonth() + i, 1);
      const e = new Date(s.getFullYear(), s.getMonth() + 1, 0);
      cols.push({
        startKey: keyOf(s),
        endKey: keyOf(e),
        label: MONTHS_SHORT[s.getMonth()],
        sub: i === 0 || s.getMonth() === 0 ? String(s.getFullYear()) : null,
        isNow: keyOf(s) <= t && t <= keyOf(e),
      });
    }
    return cols;
  }
  if (mode === "tag") {
    const start = addDays(startOfWeek(now), -7);
    for (let i = 0; i < 35; i++) {
      const day = addDays(start, i);
      const k = keyOf(day);
      cols.push({
        startKey: k,
        endKey: k,
        label: String(day.getDate()),
        sub: i === 0 || day.getDate() === 1 ? MONTHS_SHORT[day.getMonth()] : null,
        isNow: k === t,
        weekend: (day.getDay() + 6) % 7 >= 5,
      });
    }
    return cols;
  }
  const start = addDays(startOfWeek(now), -21);
  let prevMonth = -1;
  for (let i = 0; i < 16; i++) {
    const von = addDays(start, i * 7);
    const bis = addDays(von, 6);
    cols.push({
      startKey: keyOf(von),
      endKey: keyOf(bis),
      label: String(isoWeek(von)),
      sub: von.getMonth() !== prevMonth ? MONTHS_SHORT[von.getMonth()] : null,
      isNow: keyOf(von) <= t && t <= keyOf(bis),
    });
    prevMonth = von.getMonth();
  }
  return cols;
}

type Seg = { kind: Kind; color: string; label: string; start: number; span: number };

export function MeinKalender({
  placements,
  school,
  absences,
  nowISO,
}: {
  placements: KalPlacement[];
  school: KalBlock[];
  absences: Absence[];
  nowISO: string;
}) {
  const [mode, setMode] = useState<Mode>("woche");
  const cols = useMemo(() => buildCols(mode, new Date(nowISO)), [mode, nowISO]);

  const overlaps = (col: Col, von: string, bis: string) =>
    keyIso(von) <= col.endKey && keyIso(bis) >= col.startKey;

  // Pro Spalte genau ein Eintrag (Priorität: Schule > Abwesenheit > Einsatz).
  const segments = useMemo(() => {
    const itemAt = (col: Col): Omit<Seg, "start" | "span"> | null => {
      if (school.some((s) => overlaps(col, s.von, s.bis))) {
        return { kind: "bs", color: "", label: "BS" };
      }
      const abs = absences.find((a) => overlaps(col, a.von, a.bis));
      if (abs) {
        const urlaub = abs.typ === "URLAUB";
        return {
          kind: urlaub ? "urlaub" : "pruefung",
          color: "",
          label: urlaub ? "Urlaub" : "Prüfung",
        };
      }
      const pl = placements.find((p) => overlaps(col, p.von, p.bis));
      if (pl) return { kind: "placement", color: pl.color, label: pl.label };
      return null;
    };
    const out: Seg[] = [];
    let cur: Seg | null = null;
    cols.forEach((c, i) => {
      const item = itemAt(c);
      if (!item) {
        if (cur) out.push(cur);
        cur = null;
        return;
      }
      if (cur && cur.kind === item.kind && cur.label === item.label) {
        cur.span += 1;
      } else {
        if (cur) out.push(cur);
        cur = { ...item, start: i, span: 1 };
      }
    });
    if (cur) out.push(cur);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols, placements, school, absences]);

  const urlaube = absences
    .filter((a) => a.typ === "URLAUB")
    .sort((a, b) => keyIso(a.von) - keyIso(b.von));

  const n = cols.length;
  const w = COLW[mode];
  const grid: CSSProperties = {
    gridTemplateColumns: `repeat(${n}, minmax(${w}px, 1fr))`,
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
        Azubi
      </p>
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Mein Kalender</h1>
      <p className="mb-8 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        Deine Versetzungen, Berufsschulwochen, Prüfungen und Urlaub auf einen
        Blick. Über den Umschalter siehst du Tage, Wochen oder Monate.
      </p>

      {/* Kalenderstrahl */}
      <section className="mb-6 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Zeitleiste
          </h2>
          <div className="inline-flex rounded-lg border p-0.5 text-xs">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-colors",
                  mode === m.key
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div style={{ minWidth: n * w }}>
            <div className="grid items-end pb-1" style={grid}>
              {cols.map((c, i) => (
                <div
                  key={i}
                  className={cn(
                    "px-0.5 text-center",
                    c.isNow && "rounded-t bg-muted/60",
                    c.weekend && "bg-muted/30",
                  )}
                >
                  <div className="text-[10px] leading-tight text-muted-foreground">
                    {c.sub ?? " "}
                  </div>
                  <div className="text-[11px] font-semibold">{c.label}</div>
                </div>
              ))}
            </div>
            <div className="grid gap-x-1 border-t pt-1.5" style={grid}>
              {segments.map((s, i) => (
                <Bar key={i} seg={s} />
              ))}
            </div>
          </div>
        </div>

        <Legend />
      </section>

      {/* Urlaub */}
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Mein Urlaub</h2>
          <button
            type="button"
            disabled
            title="Urlaub beantragen — folgt"
            className="inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-lg border bg-background px-3 text-sm font-medium opacity-60"
          >
            <Plane className="size-4" />
            Urlaub beantragen
          </button>
        </div>
        {urlaube.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Kein Urlaub eingetragen.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {urlaube.map((u, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Sun className="size-4" />
                </span>
                <span className="font-medium">Urlaub</span>
                <span className="ml-auto text-muted-foreground">
                  {dateFmt.format(new Date(u.von))} – {dateFmt.format(new Date(u.bis))}
                </span>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  genehmigt
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Bar({ seg }: { seg: Seg }) {
  const span: CSSProperties = {
    gridColumn: `${seg.start + 1} / span ${seg.span}`,
  };
  const base = "flex h-10 items-center overflow-hidden rounded-lg text-sm font-medium";
  if (seg.kind === "placement") {
    return (
      <div
        style={{ ...span, backgroundColor: seg.color, color: "#fff" }}
        className={cn(base, "px-2.5")}
      >
        <span className="truncate">{seg.label}</span>
      </div>
    );
  }
  if (seg.kind === "bs") {
    return (
      <div
        style={{ ...span, backgroundImage: HATCH }}
        className={cn(base, "justify-center bg-muted text-xs text-muted-foreground/80")}
      >
        BS
      </div>
    );
  }
  if (seg.kind === "urlaub") {
    return (
      <div
        style={span}
        className={cn(base, "justify-center bg-muted/60 text-muted-foreground")}
      >
        <Sun className="size-4" />
      </div>
    );
  }
  return (
    <div
      style={span}
      className={cn(
        base,
        "justify-center bg-indigo-100 text-xs text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
      )}
    >
      Prüfung
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-5 rounded bg-indigo-500" />
        Abteilung
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-5 rounded bg-muted" style={{ backgroundImage: HATCH }} />
        Berufsschule
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="flex h-3 w-5 items-center justify-center rounded bg-muted/60">
          <Sun className="size-2.5" />
        </span>
        Urlaub
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-5 rounded bg-indigo-100 dark:bg-indigo-950/60" />
        Prüfung
      </span>
    </div>
  );
}
