import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, X, BookOpen } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import {
  addRequiredContent,
  removeRequiredContent,
  softDeleteProfession,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function BerufDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await getActiveTenant();

  const [profession, required, allContents] = await Promise.all([
    prisma.profession.findFirst({
      where: { id, tenantId: tenant.id, deletedAt: null },
      select: { id: true, bezeichnung: true },
    }),
    prisma.requiredContent.findMany({
      where: { professionId: id, tenantId: tenant.id },
      select: { id: true, learningContent: { select: { id: true, titel: true } } },
    }),
    prisma.learningContent.findMany({
      where: { tenantId: tenant.id, deletedAt: null },
      select: { id: true, titel: true },
      orderBy: { titel: "asc" },
    }),
  ]);

  if (!profession) notFound();

  // Zugeordnete Inhalte alphabetisch; bereits zugeordnete IDs für die Abgrenzung.
  const zugeordnet = [...required].sort((a, b) =>
    a.learningContent.titel.localeCompare(b.learningContent.titel),
  );
  const zugeordneteIds = new Set(zugeordnet.map((r) => r.learningContent.id));
  const verfuegbar = allContents.filter((c) => !zugeordneteIds.has(c.id));

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/berufe"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Zu den Berufen
      </Link>

      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
        Beruf
      </p>
      <h1 className="mb-8 text-3xl font-bold tracking-tight">
        {profession.bezeichnung}
      </h1>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">
            Benötigte Lerninhalte
            <span className="ml-2 font-normal text-muted-foreground">
              {zugeordnet.length}
            </span>
          </h2>
        </div>

        {/* Zugeordnete Lerninhalte als entfernbare Chips */}
        {zugeordnet.length === 0 ? (
          <p className="mb-5 rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
            Noch keine Lerninhalte. Füge unten den ersten hinzu.
          </p>
        ) : (
          <ul className="mb-5 flex flex-wrap gap-2">
            {zugeordnet.map((r) => (
              <li key={r.id}>
                <form action={removeRequiredContent} className="contents">
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="professionId" value={profession.id} />
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-background py-1 pl-3 pr-1.5 text-sm">
                    {r.learningContent.titel}
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

        {/* Lerninhalt hinzufügen (Freitext, mit Vorschlägen aus vorhandenen) */}
        <form action={addRequiredContent} className="flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="professionId" value={profession.id} />
          <input
            name="titel"
            required
            list="lerninhalt-vorschlaege"
            placeholder="Lerninhalt, z. B. „Schaltpläne lesen“"
            className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <datalist id="lerninhalt-vorschlaege">
            {allContents.map((c) => (
              <option key={c.id} value={c.titel} />
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

        {/* Schnell-Zuordnung bereits vorhandener Inhalte aus anderen Berufen */}
        {verfuegbar.length > 0 && (
          <div className="mt-5 border-t pt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Bereits vorhanden — zum Zuordnen anklicken:
            </p>
            <div className="flex flex-wrap gap-2">
              {verfuegbar.map((c) => (
                <form key={c.id} action={addRequiredContent} className="contents">
                  <input type="hidden" name="professionId" value={profession.id} />
                  <input type="hidden" name="learningContentId" value={c.id} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-full border border-dashed bg-background px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-solid hover:bg-muted hover:text-foreground"
                  >
                    <Plus className="size-3.5" />
                    {c.titel}
                  </button>
                </form>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Beruf löschen */}
      <form action={softDeleteProfession} className="mt-6">
        <input type="hidden" name="id" value={profession.id} />
        <button
          type="submit"
          className="text-sm text-muted-foreground transition-colors hover:text-destructive"
        >
          Beruf löschen
        </button>
      </form>
    </div>
  );
}
