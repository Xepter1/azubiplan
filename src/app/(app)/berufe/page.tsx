import Link from "next/link";
import { ChevronRight, Plus, BookOpen, GraduationCap } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { createProfession } from "./actions";

export const dynamic = "force-dynamic";

export default async function BerufePage() {
  const tenant = await getActiveTenant();

  const professions = await prisma.profession.findMany({
    where: { tenantId: tenant.id, deletedAt: null },
    select: {
      id: true,
      bezeichnung: true,
      _count: { select: { requiredContents: true } },
    },
    orderBy: { bezeichnung: "asc" },
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
        Stammdaten
      </p>
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Berufe</h1>
      <p className="mb-8 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        Lege die Ausbildungsberufe an und hinterlege je Beruf die nötigen
        Lerninhalte (Kenntnisse, Fähigkeiten &amp; Fertigkeiten aus dem
        Rahmenlehrplan). Diese Inhalte tauchen später bei den Abteilungen und im
        Azubi-Profil wieder auf.
      </p>

      {/* Neuen Beruf anlegen */}
      <form
        action={createProfession}
        className="mb-8 flex flex-col gap-2 rounded-2xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center"
      >
        <input
          name="bezeichnung"
          required
          placeholder="Neuer Beruf, z. B. „Mechatroniker:in“"
          className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <button
          type="submit"
          className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          Beruf anlegen
        </button>
      </form>

      {/* Liste der Berufe */}
      {professions.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-muted/20 px-5 py-10 text-center text-sm text-muted-foreground">
          Noch keine Berufe angelegt.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          {professions.map((p) => (
            <li key={p.id} className="border-b last:border-b-0">
              <Link
                href={`/berufe/${p.id}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <GraduationCap className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {p.bezeichnung}
                  </span>
                  <span className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BookOpen className="size-3.5" />
                    {p._count.requiredContents}{" "}
                    {p._count.requiredContents === 1
                      ? "Lerninhalt"
                      : "Lerninhalte"}
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
