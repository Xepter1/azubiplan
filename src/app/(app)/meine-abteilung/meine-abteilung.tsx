"use client";

import { type CSSProperties, useMemo, useState, useTransition } from "react";
import { Star, X, CalendarPlus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  addOwnDepartmentBlock,
  deleteOwnDepartmentBlock,
  saveEvaluation,
} from "./actions";

type Status = "laeuft" | "beendet" | "geplant";
export type AzubiItem = {
  placementId: string;
  name: string;
  initials: string;
  status: Status;
  sub: string;
  submitted: boolean;
  evalValues: {
    fachlich: number;
    selbststaendigkeit: number;
    sorgfalt: number;
    teamverhalten: number;
    kommentar: string;
  };
};
export type StripPlacement = {
  name: string;
  status: Status;
  von: string; // ISO
  bis: string; // ISO
};
type Block = { id: string; grund: string; zeitraum: string };
type StripMode = "tag" | "woche" | "monat";

const CRITERIA = [
  { key: "fachlich", label: "Fachliche Leistung" },
  { key: "selbststaendigkeit", label: "Selbstständigkeit" },
  { key: "sorgfalt", label: "Sorgfalt & Sicherheit" },
  { key: "teamverhalten", label: "Teamverhalten" },
] as const;

const STATUS_LABEL: Record<Status, string> = {
  laeuft: "läuft",
  beendet: "beendet",
  geplant: "geplant",
};

export function MeineAbteilung({
  departmentName,
  azubis,
  stripPlacements,
  nowISO,
  blocks,
}: {
  departmentName: string;
  azubis: AzubiItem[];
  stripPlacements: StripPlacement[];
  nowISO: string;
  blocks: Block[];
}) {
  const [selected, setSelected] = useState<AzubiItem | null>(null);
  const [sperrOpen, setSperrOpen] = useState(false);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
            Abteilung
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Azubis &amp; Bewertungsbögen
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setSperrOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          <CalendarPlus className="size-4" />
          Sperrzeit hinzufügen
        </button>
      </div>
      <p className="mb-8 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        Du siehst, wer gerade in der Abteilung{" "}
        <span className="font-medium text-foreground">{departmentName}</span> ist
        und wer ansteht. Endet eine Station, kannst du den Bewertungsbogen
        ausfüllen — abgeschickt wandert er ins Azubi-Profil.
      </p>

      {/* Kalenderstrahl */}
      <section className="mb-6 rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Kalender · {departmentName}
        </h2>
        <Strip placements={stripPlacements} nowISO={nowISO} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Azubi-Liste */}
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">
            Abteilung {departmentName} · aktuell &amp; anstehend
          </h2>
          {azubis.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aktuell sind keine Azubis dieser Abteilung zugeordnet.
            </p>
          ) : (
            <ul className="divide-y">
              {azubis.map((a) => (
                <li
                  key={a.placementId}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                    {a.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.sub}</div>
                  </div>
                  <AzubiAction
                    a={a}
                    active={selected?.placementId === a.placementId}
                    onEvaluate={() => setSelected(a)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Bewertungsbogen */}
        {selected ? (
          <Bogen
            key={selected.placementId}
            azubi={selected}
            onClose={() => setSelected(null)}
          />
        ) : (
          <section className="flex items-center justify-center rounded-2xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            Wähle links bei einer beendeten Station „Bewerten", um den
            Bewertungsbogen zu öffnen.
          </section>
        )}
      </div>

      {/* Sperrzeiten dieser Abteilung */}
      <section className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Sperrzeiten dieser Abteilung</h2>
          <span className="text-xs text-muted-foreground">
            auch sichtbar unter „Sperrzeiten" (Admin/Ausbilder)
          </span>
        </div>
        {blocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Sperrzeiten. Über „Sperrzeit hinzufügen" eintragen.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {blocks.map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="font-medium">{b.grund}</span>
                <span className="ml-auto text-muted-foreground">{b.zeitraum}</span>
                <form action={deleteOwnDepartmentBlock}>
                  <input type="hidden" name="id" value={b.id} />
                  <button
                    type="submit"
                    aria-label="Sperrzeit löschen"
                    className="text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {sperrOpen && (
        <SperrModal
          departmentName={departmentName}
          onClose={() => setSperrOpen(false)}
        />
      )}
    </div>
  );
}

function AzubiAction({
  a,
  active,
  onEvaluate,
}: {
  a: AzubiItem;
  active: boolean;
  onEvaluate: () => void;
}) {
  if (a.status === "laeuft") {
    return (
      <span className="rounded-lg bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
        läuft
      </span>
    );
  }
  if (a.status === "geplant") {
    return (
      <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
        geplant
      </span>
    );
  }
  // beendet
  if (a.submitted) {
    return (
      <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
        bewertet
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onEvaluate}
      className={cn(
        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary/80 text-primary-foreground"
          : "bg-primary text-primary-foreground hover:bg-primary/90",
      )}
    >
      Bewerten
    </button>
  );
}

const MONTHS_SHORT = [
  "Jan", "Feb", "März", "Apr", "Mai", "Juni",
  "Juli", "Aug", "Sep", "Okt", "Nov", "Dez",
];
const MODES: { key: StripMode; label: string }[] = [
  { key: "tag", label: "Tag" },
  { key: "woche", label: "Woche" },
  { key: "monat", label: "Monat" },
];
const COLW: Record<StripMode, number> = { tag: 22, woche: 34, monat: 58 };

type Col = {
  startKey: number;
  endKey: number;
  label: string;
  sub: string | null;
  isNow: boolean;
  weekend?: boolean;
};

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

function buildCols(mode: StripMode, now: Date): Col[] {
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
      const wd = (day.getDay() + 6) % 7;
      cols.push({
        startKey: k,
        endKey: k,
        label: String(day.getDate()),
        sub: i === 0 || day.getDate() === 1 ? MONTHS_SHORT[day.getMonth()] : null,
        isNow: k === t,
        weekend: wd >= 5,
      });
    }
    return cols;
  }
  // woche
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

function placeIn(p: StripPlacement, cols: Col[]) {
  const v = keyIso(p.von);
  const b = keyIso(p.bis);
  let start = -1;
  let end = -1;
  cols.forEach((c, i) => {
    if (v <= c.endKey && b >= c.startKey) {
      if (start < 0) start = i;
      end = i;
    }
  });
  return start < 0 ? null : { start, span: end - start + 1 };
}

function Strip({
  placements,
  nowISO,
}: {
  placements: StripPlacement[];
  nowISO: string;
}) {
  const [mode, setMode] = useState<StripMode>("woche");
  const cols = useMemo(() => buildCols(mode, new Date(nowISO)), [mode, nowISO]);
  const n = cols.length;
  const w = COLW[mode];
  const grid: CSSProperties = {
    gridTemplateColumns: `9rem repeat(${n}, minmax(${w}px, 1fr))`,
  };
  const barCls: Record<Status, string> = {
    laeuft: "bg-indigo-500 text-white",
    geplant: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-200",
    beendet: "bg-muted text-muted-foreground",
  };
  const rows = placements
    .map((p) => ({ p, pos: placeIn(p, cols) }))
    .filter((r): r is { p: StripPlacement; pos: { start: number; span: number } } => r.pos !== null);

  return (
    <div>
      <div className="mb-2 flex justify-end">
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
        <div style={{ minWidth: 144 + n * w }}>
          {/* Kopf */}
          <div className="grid items-end pb-1" style={grid}>
            <div />
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
          {/* Zeilen */}
          {rows.length === 0 ? (
            <p className="border-t py-4 text-center text-sm text-muted-foreground">
              Keine Einsätze im sichtbaren Zeitraum.
            </p>
          ) : (
            rows.map((r, i) => (
              <div
                key={i}
                className="grid items-center border-t py-1.5"
                style={grid}
              >
                <div className="truncate pr-2 text-sm font-medium">{r.p.name}</div>
                <div
                  className={cn(
                    "flex h-7 items-center overflow-hidden rounded-md px-2 text-xs font-medium",
                    barCls[r.p.status],
                  )}
                  style={{ gridColumn: `${r.pos.start + 2} / span ${r.pos.span}` }}
                >
                  <span className="truncate">{STATUS_LABEL[r.p.status]}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          aria-label={`${s} von 5`}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              "size-5",
              s <= value
                ? "fill-primary text-primary"
                : "fill-muted text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}

function Bogen({ azubi, onClose }: { azubi: AzubiItem; onClose: () => void }) {
  const [stars, setStars] = useState({
    fachlich: azubi.evalValues.fachlich,
    selbststaendigkeit: azubi.evalValues.selbststaendigkeit,
    sorgfalt: azubi.evalValues.sorgfalt,
    teamverhalten: azubi.evalValues.teamverhalten,
  });
  const [kommentar, setKommentar] = useState(azubi.evalValues.kommentar);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save(mode: "draft" | "submit") {
    setErr(null);
    setHint(null);
    start(async () => {
      const fd = new FormData();
      fd.set("placementId", azubi.placementId);
      fd.set("mode", mode);
      fd.set("fachlich", String(stars.fachlich));
      fd.set("selbststaendigkeit", String(stars.selbststaendigkeit));
      fd.set("sorgfalt", String(stars.sorgfalt));
      fd.set("teamverhalten", String(stars.teamverhalten));
      fd.set("kommentar", kommentar);
      try {
        await saveEvaluation(fd);
        if (mode === "submit") onClose();
        else setHint("Entwurf gespeichert.");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <section className="rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h2 className="text-lg font-bold">Bewertungsbogen — {azubi.name}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="space-y-4 p-6">
        {CRITERIA.map((c) => (
          <div key={c.key} className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">{c.label}</span>
            <StarRating
              value={stars[c.key]}
              onChange={(v) => setStars((s) => ({ ...s, [c.key]: v }))}
            />
          </div>
        ))}

        <div className="grid gap-1.5 pt-1">
          <label htmlFor="kommentar" className="text-sm font-medium">
            Bemerkung
          </label>
          <textarea
            id="kommentar"
            value={kommentar}
            onChange={(e) => setKommentar(e.target.value)}
            rows={2}
            placeholder="Sorgfältig, fragt aktiv nach …"
            className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        {err && <p className="text-sm text-destructive">{err}</p>}
        {hint && <p className="text-sm text-emerald-600">{hint}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            disabled={pending}
            onClick={() => save("draft")}
            className="inline-flex h-9 items-center rounded-lg border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
          >
            Zwischenspeichern
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => save("submit")}
            className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {pending ? "…" : "Abschicken"}
          </button>
        </div>
      </div>
    </section>
  );
}

function SperrModal({
  departmentName,
  onClose,
}: {
  departmentName: string;
  onClose: () => void;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function handle(formData: FormData) {
    setErr(null);
    start(async () => {
      try {
        await addOwnDepartmentBlock(formData);
        onClose();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-bold">Sperrzeit hinzufügen</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>
        <form action={handle} className="space-y-4 p-6">
          <p className="text-sm text-muted-foreground">
            Gesperrter Zeitraum für{" "}
            <span className="font-medium text-foreground">{departmentName}</span>{" "}
            (z. B. Betriebsurlaub). Erscheint im Planer und unter „Sperrzeiten".
          </p>
          <div className="grid gap-1.5">
            <label htmlFor="grund" className="text-sm font-medium">
              Grund (optional)
            </label>
            <input
              id="grund"
              name="grund"
              placeholder="z. B. Betriebsurlaub"
              className="h-9 rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label htmlFor="von" className="text-sm font-medium">
                Von
              </label>
              <input
                id="von"
                name="von"
                type="date"
                required
                className="h-9 rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="bis" className="text-sm font-medium">
                Bis
              </label>
              <input
                id="bis"
                name="bis"
                type="date"
                required
                className="h-9 rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-lg border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {pending ? "Speichern …" : "Hinzufügen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
