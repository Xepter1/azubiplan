import Link from "next/link";
import { ChevronRight, Plus, School, BookOpen, Users } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { createClass } from "./actions";

export const dynamic = "force-dynamic";

const inputCls =
  "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function KlassenPage() {
  const tenant = await getActiveTenant();
  const currentYear = new Date().getFullYear();

  const [classes, professions] = await Promise.all([
    prisma.schoolClass.findMany({
      where: { tenantId: tenant.id, deletedAt: null },
      select: {
        id: true,
        name: true,
        jahrgang: true,
        profession: { select: { bezeichnung: true } },
        _count: { select: { classSubjects: true, apprentices: true } },
      },
      orderBy: [{ jahrgang: "desc" }, { name: "asc" }],
    }),
    prisma.profession.findMany({
      where: { tenantId: tenant.id, deletedAt: null },
      select: { id: true, bezeichnung: true },
      orderBy: { bezeichnung: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
        Stammdaten
      </p>
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Klassen</h1>
      <p className="mb-8 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        Eine Klasse ist ein Jahrgang eines Berufs (z. B. „Mechatroniker 2027“).
        Sie bündelt die <span className="font-medium text-foreground">Fächer</span>{" "}
        (für die Noten) und die{" "}
        <span className="font-medium text-foreground">Berufsschulwochen</span> —
        denn der Lehrplan kann sich von Jahrgang zu Jahrgang ändern.
      </p>

      {/* Neue Klasse anlegen */}
      {professions.length === 0 ? (
        <p className="mb-8 rounded-2xl border border-dashed bg-muted/20 px-5 py-6 text-center text-sm text-muted-foreground">
          Lege zuerst unter{" "}
          <Link href="/berufe" className="font-medium text-primary hover:underline">
            Berufe
          </Link>{" "}
          mindestens einen Beruf an.
        </p>
      ) : (
        <form
          action={createClass}
          className="mb-8 rounded-2xl border bg-card p-4 shadow-sm"
        >
          <p className="mb-3 text-sm font-semibold">Neue Klasse anlegen</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm">
              <span className="mb-1.5 block font-medium">Name</span>
              <input
                name="name"
                required
                placeholder="z. B. Mechatroniker 2027"
                className={inputCls}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1.5 block font-medium">Beruf</span>
              <select name="professionId" required className={inputCls}>
                {professions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.bezeichnung}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1.5 block font-medium">Jahrgang</span>
              <input
                name="jahrgang"
                type="number"
                required
                min="2000"
                max="2100"
                defaultValue={currentYear}
                className={inputCls}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1.5 block font-medium">
                Fächer übernehmen{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </span>
              <select name="copyFromClassId" className={inputCls}>
                <option value="">— keine —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c._count.classSubjects})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Plus className="size-4" />
              Klasse anlegen
            </button>
          </div>
        </form>
      )}

      {/* Liste der Klassen */}
      {classes.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-muted/20 px-5 py-10 text-center text-sm text-muted-foreground">
          Noch keine Klassen angelegt.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          {classes.map((c) => (
            <li key={c.id} className="border-b last:border-b-0">
              <Link
                href={`/klassen/${c.id}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <School className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{c.name}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{c.profession.bezeichnung}</span>
                    <span>Jahrgang {c.jahrgang}</span>
                    <span className="inline-flex items-center gap-1.5">
                      <BookOpen className="size-3.5" />
                      {c._count.classSubjects} Fächer
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="size-3.5" />
                      {c._count.apprentices} Azubis
                    </span>
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
