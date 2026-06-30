"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, X } from "lucide-react";

import { addGrade, deleteGrade } from "./actions";

type Grade = { id: string; fach: string; wert: string; datum: string };
type Subject = { id: string; name: string };

export function MeineNoten({
  grades,
  subjects,
  hasClass,
}: {
  grades: Grade[];
  subjects: Subject[];
  hasClass: boolean;
}) {
  const [open, setOpen] = useState(false);

  const schnitt =
    grades.length > 0
      ? (
          grades.reduce((s, g) => s + Number(g.wert.replace(",", ".")), 0) /
          grades.length
        ).toLocaleString("de-DE", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
      : "—";

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
        Azubi
      </p>
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Noten</h1>
      <p className="mb-8 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        Deine Noten aus der Berufsschule. Du kannst nur Fächer benoten, die zu
        deiner Klasse gehören. Der Durchschnitt erscheint auch in deinem Profil.
      </p>

      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b p-4">
          <div className="text-sm text-muted-foreground">
            Ø {schnitt} · {grades.length} {grades.length === 1 ? "Note" : "Noten"}
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" />
            Note / Zeugnis
          </button>
        </div>

        <div className="p-5">
          {grades.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Noch keine Noten erfasst. Füge über „+ Note" deine erste hinzu.
            </p>
          ) : (
            <ul className="divide-y rounded-xl border">
              {grades.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm"
                >
                  <span className="font-medium">{g.fach}</span>
                  <span className="ml-auto font-semibold tabular-nums">
                    {g.wert}
                  </span>
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
        </div>
      </div>

      {open && (
        <NoteModal
          subjects={subjects}
          hasClass={hasClass}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function NoteModal({
  subjects,
  hasClass,
  onClose,
}: {
  subjects: Subject[];
  hasClass: boolean;
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

        {!hasClass ? (
          <div className="p-6 text-sm text-muted-foreground">
            Dir ist noch keine Klasse zugeordnet — daher gibt es keine Fächer zum
            Benoten. Bitte wende dich an deinen Ausbilder.
          </div>
        ) : subjects.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            Für deine Klasse sind noch keine Fächer hinterlegt.
          </div>
        ) : (
          <form action={handleAdd} className="space-y-4 p-6">
            <div className="grid gap-1.5">
              <label htmlFor="subjectId" className="text-sm font-medium">
                Fach
              </label>
              <select
                id="subjectId"
                name="subjectId"
                required
                defaultValue=""
                className="h-9 rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="" disabled>
                  — Fach wählen —
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
