import Link from "next/link";
import { ChevronRight, Plus, Building2, Layers, Users } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { createDepartment } from "./actions";

export const dynamic = "force-dynamic";

export default async function AbteilungenPage() {
  const tenant = await getActiveTenant();

  const departments = await prisma.department.findMany({
    where: { tenantId: tenant.id, deletedAt: null },
    select: {
      id: true,
      name: true,
      kapazitaet: true,
      _count: { select: { taughtContents: true, placements: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
        Stammdaten
      </p>
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Abteilungen</h1>
      <p className="mb-8 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        Lege die Abteilungen an, durch die deine Azubis rotieren. Öffne eine
        Abteilung, um ihr per Drag &amp; Drop die Lerninhalte zuzuordnen, die sie
        vermittelt.
      </p>

      {/* Neue Abteilung anlegen */}
      <form
        action={createDepartment}
        className="mb-8 flex flex-col gap-2 rounded-2xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center"
      >
        <input
          name="name"
          required
          placeholder="Neue Abteilung, z. B. „Sondermaschinenbau“"
          className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <input
          name="kapazitaet"
          type="number"
          min="1"
          placeholder="Kapazität"
          className="h-10 rounded-lg border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-32"
        />
        <button
          type="submit"
          className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          Anlegen
        </button>
      </form>

      {/* Liste der Abteilungen */}
      {departments.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-muted/20 px-5 py-10 text-center text-sm text-muted-foreground">
          Noch keine Abteilungen angelegt.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          {departments.map((d) => (
            <li key={d.id} className="border-b last:border-b-0">
              <Link
                href={`/abteilungen/${d.id}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Building2 className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{d.name}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Layers className="size-3.5" />
                      {d._count.taughtContents}{" "}
                      {d._count.taughtContents === 1 ? "Lerninhalt" : "Lerninhalte"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="size-3.5" />
                      Kapazität {d.kapazitaet ?? "—"}
                    </span>
                    <span>{d._count.placements} Einsätze</span>
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
