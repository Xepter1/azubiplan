import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, X, BookOpen, CalendarDays, Users, Trash2 } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import {
  addSubject,
  removeSubject,
  createSchoolBlock,
  deleteSchoolBlock,
  softDeleteClass,
} from "../actions";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("de-DE");
const inputCls =
  "h-10 rounded-lg border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function KlasseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await getActiveTenant();

  const [cls, allSubjects] = await Promise.all([
    prisma.schoolClass.findFirst({
      where: { id, tenantId: tenant.id, deletedAt: null },
      select: {
        id: true,
        name: true,
        jahrgang: true,
        profession: { select: { bezeichnung: true } },
        classSubjects: {
          select: { id: true, subject: { select: { id: true, name: true } } },
        },
        schoolBlocks: {
          select: { id: true, von: true, bis: true },
          orderBy: { von: "asc" },
        },
        apprentices: {
          where: { deletedAt: null },
          select: { id: true, vorname: true, nachname: true },
          orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
        },
      },
    }),
    prisma.subject.findMany({
      where: { tenantId: tenant.id, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!cls) notFound();

  const faecher = [...cls.classSubjects].sort((a, b) =>
    a.subject.name.localeCompare(b.subject.name),
  );
  const zugeordnet = new Set(faecher.map((f) => f.subject.id));
  const verfuegbar = allSubjects.filter((s) => !zugeordnet.has(s.id));

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/klassen"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Zu den Klassen
      </Link>

      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
        Klasse
      </p>
      <h1 className="text-3xl font-bold tracking-tight">{cls.name}</h1>
      <p className="mb-8 mt-1 text-sm text-muted-foreground">
        {cls.profession.bezeichnung} · Jahrgang {cls.jahrgang}
      </p>

      {/* Fächer */}
      <div className="mb-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">
            Fächer
            <span className="ml-2 font-normal text-muted-foreground">
              {faecher.length}
            </span>
          </h2>
        </div>

        {faecher.length === 0 ? (
          <p className="mb-5 rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
            Noch keine Fächer. Füge unten das erste hinzu.
          </p>
        ) : (
          <ul className="mb-5 flex flex-wrap gap-2">
            {faecher.map((f) => (
              <li key={f.id}>
                <form action={removeSubject} className="contents">
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="classId" value={cls.id} />
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-background py-1 pl-3 pr-1.5 text-sm">
                    {f.subject.name}
                    <button
                      type="submit"
                      title="Entfernen"
                      className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={addSubject} className="flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="classId" value={cls.id} />
          <input
            name="name"
            required
            list="fach-vorschlaege"
            placeholder="Fach, z. B. „Steuerungstechnik“"
            className={`flex-1 ${inputCls}`}
          />
          <datalist id="fach-vorschlaege">
            {allSubjects.map((s) => (
              <option key={s.id} value={s.name} />
            ))}
          </datalist>
          <button
            type="submit"
            className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" />
            Hinzufügen
          </button>
        </form>

        {verfuegbar.length > 0 && (
          <div className="mt-5 border-t pt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Bereits vorhanden — zum Zuordnen anklicken:
            </p>
            <div className="flex flex-wrap gap-2">
              {verfuegbar.map((s) => (
                <form key={s.id} action={addSubject} className="contents">
                  <input type="hidden" name="classId" value={cls.id} />
                  <input type="hidden" name="subjectId" value={s.id} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-full border border-dashed bg-background px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-solid hover:bg-muted hover:text-foreground"
                  >
                    <Plus className="size-3.5" />
                    {s.name}
                  </button>
                </form>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Berufsschulwochen */}
      <div className="mb-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">
            Berufsschulwochen
            <span className="ml-2 font-normal text-muted-foreground">
              {cls.schoolBlocks.length}
            </span>
          </h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Blockunterricht dieser Klasse — erscheint im Einsatzplaner und blockt
          dort Einsätze (überschreibbar).
        </p>

        <form
          action={createSchoolBlock}
          className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <input type="hidden" name="classId" value={cls.id} />
          <label className="text-sm">
            <span className="mb-1.5 block font-medium">Von</span>
            <input name="von" type="date" required className={inputCls} />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block font-medium">Bis</span>
            <input name="bis" type="date" required className={inputCls} />
          </label>
          <button
            type="submit"
            className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" />
            Hinzufügen
          </button>
        </form>

        {cls.schoolBlocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Berufsschulwochen.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {cls.schoolBlocks.map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <CalendarDays className="size-4 text-muted-foreground" />
                <span className="font-medium">
                  {fmt.format(b.von)} – {fmt.format(b.bis)}
                </span>
                <form action={deleteSchoolBlock} className="ml-auto">
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="classId" value={cls.id} />
                  <button
                    type="submit"
                    title="Löschen"
                    className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Azubis der Klasse */}
      <div className="mb-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">
            Azubis in dieser Klasse
            <span className="ml-2 font-normal text-muted-foreground">
              {cls.apprentices.length}
            </span>
          </h2>
        </div>
        {cls.apprentices.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Azubis zugeordnet. Die Klasse wird im Azubi-Profil gesetzt.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {cls.apprentices.map((a) => (
              <Link
                key={a.id}
                href={`/auszubildende/${a.id}`}
                className="rounded-full border bg-background px-3 py-1 text-sm transition-colors hover:bg-muted"
              >
                {a.vorname} {a.nachname}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Klasse löschen */}
      <form action={softDeleteClass}>
        <input type="hidden" name="id" value={cls.id} />
        <button
          type="submit"
          className="text-sm text-muted-foreground transition-colors hover:text-destructive"
        >
          Klasse löschen
        </button>
      </form>
    </div>
  );
}
