"use client";

import { type CSSProperties, useState, useTransition } from "react";
import { Plus, Sun, Plane, Trash2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { addGrade, deleteGrade } from "./actions";

export type SegKind = "placement" | "bs" | "urlaub" | "pruefung";
type Segment = {
  kind: SegKind;
  color: string;
  label: string;
  start: number;
  span: number;
};
type Week = { kw: number; month: string | null; isNow: boolean };
type Progress = {
  name: string;
  color: string;
  state: "erledigt" | "laeuft" | "geplant" | "offen";
};
type Upcoming = {
  kind: SegKind | "versetzung";
  color: string;
  badge: string;
  title: string;
  sub: string;
};
type Grade = { id: string; fach: string; wert: string; datum: string };
type Subject = { id: string; name: string };
type Profile = {
  name: string;
  beruf: string | null;
  lehrjahr: number;
  dauer: string;
  start: string;
};

const HATCH =
  "repeating-linear-gradient(45deg, color-mix(in oklch, var(--muted-foreground) 18%, transparent) 0 5px, transparent 5px 10px)";

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

type Tab = "uebersicht" | "kalender" | "noten";
const TABS: { key: Tab; label: string }[] = [
  { key: "uebersicht", label: "Übersicht" },
  { key: "kalender", label: "Kalender" },
  { key: "noten", label: "Noten" },
];

export function MeineSeite({
  profile,
  progress,
  weeks,
  segments,
  upcoming,
  grades,
  subjects,
}: {
  profile: Profile;
  progress: Progress[];
  weeks: Week[];
  segments: Segment[];
  upcoming: Upcoming[];
  grades: Grade[];
  subjects: Subject[];
}) {
  const [tab, setTab] = useState<Tab>("uebersicht");
  const [noteOpen, setNoteOpen] = useState(false);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
        Azubi
      </p>
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Meine Seite</h1>
      <p className="mb-8 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        Hier siehst du deinen Durchlauf, deinen Kalender mit Versetzungen,
        Schule, Prüfung und Urlaub — und kannst Noten hinzufügen. Bei jeder
        Noteneingabe wird dein Ausbilder informiert.
      </p>

      <div className="rounded-2xl border bg-card shadow-sm">
        {/* Toolbar */}
        <div className="border-b p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-lg bg-muted p-0.5 text-sm">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "rounded-md px-3 py-1.5 font-medium transition-colors",
                    tab === t.key
                      ? "bg-card shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
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
          <button
            type="button"
            onClick={() => setNoteOpen(true)}
            className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" />
            Note / Zeugnis
          </button>
        </div>

        {/* Inhalt */}
        <div className="p-5">
          {tab === "noten" ? (
            <NotenTab grades={grades} onAdd={() => setNoteOpen(true)} />
          ) : tab === "kalender" ? (
            <section>
              <h3 className="mb-3 text-lg font-bold">Mein Kalender</h3>
              <Timeline weeks={weeks} segments={segments} />
              <Legend />
            </section>
          ) : (
            <div className="space-y-6">
              <section>
                <h3 className="mb-3 text-lg font-bold">Meine nächsten Wochen</h3>
                <Timeline weeks={weeks} segments={segments} />
                <Legend />
              </section>
              <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-xl border p-5">
                  <h3 className="mb-4 text-lg font-bold">Mein Fortschritt</h3>
                  <ProgressList progress={progress} />
                </section>
                <section className="rounded-xl border p-5">
                  <h3 className="mb-4 text-lg font-bold">Anstehend</h3>
                  <UpcomingList upcoming={upcoming} />
                </section>
              </div>
            </div>
          )}
        </div>
      </div>

      {noteOpen && (
        <NoteModal subjects={subjects} onClose={() => setNoteOpen(false)} />
      )}
    </div>
  );
}

function Timeline({ weeks, segments }: { weeks: Week[]; segments: Segment[] }) {
  const n = weeks.length;
  const cols = { gridTemplateColumns: `repeat(${n}, minmax(46px, 1fr))` };
  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: n * 46 }}>
        <div className="grid" style={cols}>
          {weeks.map((w, i) => (
            <div
              key={i}
              className={cn(
                "px-1 pb-1 text-center",
                w.isNow && "rounded-t bg-muted/60",
              )}
            >
              <div className="text-[10px] leading-tight text-muted-foreground">
                {w.month ?? " "}
              </div>
              <div className="text-xs font-semibold">{w.kw}</div>
            </div>
          ))}
        </div>
        <div className="grid gap-x-1 border-t pt-1.5" style={cols}>
          {segments.map((s, i) => (
            <Bar key={i} seg={s} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Bar({ seg }: { seg: Segment }) {
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

function ProgressList({ progress }: { progress: Progress[] }) {
  if (progress.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Für deinen Beruf sind noch keine Stationen hinterlegt.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {progress.map((p) => (
        <ProgressRow key={p.name} {...p} />
      ))}
    </div>
  );
}

function ProgressRow({ name, color, state }: Progress) {
  const label =
    state === "erledigt"
      ? "erledigt"
      : state === "laeuft"
        ? "läuft"
        : state === "geplant"
          ? "geplant"
          : "nicht geplant";
  const fill: CSSProperties =
    state === "erledigt"
      ? { backgroundColor: color }
      : state === "offen"
        ? { backgroundColor: "transparent", border: "1px solid var(--border)" }
        : { backgroundColor: hexA(color, 0.25) };
  return (
    <div className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3">
      <span className="truncate text-sm font-semibold" title={name}>
        {name}
      </span>
      <span className="h-3.5 rounded-full" style={fill} />
      <span className="w-20 text-right text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function UpcomingList({ upcoming }: { upcoming: Upcoming[] }) {
  if (upcoming.length === 0) {
    return <p className="text-sm text-muted-foreground">Nichts Anstehendes.</p>;
  }
  return (
    <ul className="divide-y">
      {upcoming.map((u, i) => (
        <li key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <UpcomingBadge u={u} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{u.title}</div>
            <div className="text-xs text-muted-foreground">{u.sub}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function UpcomingBadge({ u }: { u: Upcoming }) {
  const cls =
    "flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white";
  if (u.kind === "versetzung") {
    return (
      <span className={cls} style={{ backgroundColor: u.color }}>
        {u.badge}
      </span>
    );
  }
  if (u.kind === "bs") {
    return <span className={cn(cls, "bg-[#1f2a63]")}>BS</span>;
  }
  if (u.kind === "urlaub") {
    return (
      <span className={cn(cls, "bg-muted-foreground/70")}>
        <Sun className="size-5" />
      </span>
    );
  }
  return <span className={cn(cls, "bg-violet-500")}>Pr</span>;
}

function NotenTab({
  grades,
  onAdd,
}: {
  grades: Grade[];
  onAdd: () => void;
}) {
  const schnitt =
    grades.length > 0
      ? (
          grades.reduce((s, g) => s + Number(g.wert.replace(",", ".")), 0) /
          grades.length
        ).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      : "—";
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold">Meine Noten</h3>
        <span className="text-sm text-muted-foreground">
          Ø {schnitt} · {grades.length} Noten
        </span>
      </div>
      {grades.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Noch keine Noten erfasst. Füge über{" "}
          <button onClick={onAdd} className="font-medium text-primary underline">
            + Note / Zeugnis
          </button>{" "}
          deine erste Note hinzu.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {grades.map((g) => (
            <li
              key={g.id}
              className="flex items-center gap-3 px-4 py-2.5 text-sm"
            >
              <span className="font-medium">{g.fach}</span>
              <span className="ml-auto font-semibold tabular-nums">{g.wert}</span>
              <span className="w-24 text-right text-muted-foreground">
                {g.datum}
              </span>
              <form action={deleteGrade}>
                <input type="hidden" name="id" value={g.id} />
                <button
                  type="submit"
                  aria-label="Note löschen"
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
  );
}

function NoteModal({
  subjects,
  onClose,
}: {
  subjects: Subject[];
  onClose: () => void;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  function handleAdd(formData: FormData) {
    start(async () => {
      try {
        await addGrade(formData);
        setErr(null);
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
          <h2 className="text-lg font-bold">Note / Zeugnis hinzufügen</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        {subjects.length === 0 ? (
          <div className="space-y-4 p-6">
            <p className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              In deiner Klasse sind noch keine Fächer hinterlegt — oder du bist
              noch keiner Klasse zugeordnet. Bitte wende dich an deinen
              Ausbilder.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 items-center rounded-lg border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                Schließen
              </button>
            </div>
          </div>
        ) : (
        <form action={handleAdd} className="space-y-4 p-6">
          <div className="grid gap-1.5">
            <label htmlFor="subject" className="text-sm font-medium">
              Fach
            </label>
            <select
              id="subject"
              name="subjectId"
              required
              defaultValue=""
              className="h-9 rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="" disabled>
                Fach wählen …
              </option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label htmlFor="wert" className="text-sm font-medium">
                Note (1–6)
              </label>
              <input
                id="wert"
                name="wert"
                required
                inputMode="decimal"
                placeholder="2,0"
                className="h-9 rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="datum" className="text-sm font-medium">
                Datum
              </label>
              <input
                id="datum"
                name="datum"
                type="date"
                required
                defaultValue={today}
                className="h-9 rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
          </div>

          <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
            📄 Zeugnis als Datei hochladen — folgt in einem nächsten Schritt.
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
              {pending ? "Speichern …" : "Note speichern"}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
