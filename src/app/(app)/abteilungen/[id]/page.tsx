import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { updateDepartment, softDeleteDepartment } from "../actions";
import { AbteilungLerninhalte, type Lerninhalt } from "./abteilung-lerninhalte";

export const dynamic = "force-dynamic";

export default async function AbteilungDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await getActiveTenant();

  const [department, taught, allContents] = await Promise.all([
    prisma.department.findFirst({
      where: { id, tenantId: tenant.id, deletedAt: null },
      select: { id: true, name: true, kapazitaet: true },
    }),
    prisma.taughtContent.findMany({
      where: { departmentId: id, tenantId: tenant.id },
      select: { learningContentId: true },
    }),
    prisma.learningContent.findMany({
      where: { tenantId: tenant.id, deletedAt: null },
      select: {
        id: true,
        titel: true,
        requiredFor: {
          select: { profession: { select: { bezeichnung: true, deletedAt: true } } },
        },
      },
      orderBy: { titel: "asc" },
    }),
  ]);

  if (!department) notFound();

  // Lerninhalte für die Drag-&-Drop-Komponente aufbereiten (inkl. „welche Berufe
  // brauchen das"). Inhalte aktiver Berufe zuerst als Hinweis am Chip.
  const contents: Lerninhalt[] = allContents.map((c) => ({
    id: c.id,
    titel: c.titel,
    berufe: Array.from(
      new Set(
        c.requiredFor
          .filter((r) => r.profession.deletedAt === null)
          .map((r) => r.profession.bezeichnung),
      ),
    ),
  }));
  const initialAssigned = taught.map((t) => t.learningContentId);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/abteilungen"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Zu den Abteilungen
      </Link>

      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
        Abteilung
      </p>
      <h1 className="mb-8 text-3xl font-bold tracking-tight">{department.name}</h1>

      {/* Stammdaten bearbeiten */}
      <form
        action={updateDepartment}
        className="mb-8 flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-end"
      >
        <input type="hidden" name="id" value={department.id} />
        <label className="flex-1 text-sm">
          <span className="mb-1.5 block font-medium">Name</span>
          <input
            name="name"
            required
            defaultValue={department.name}
            className="h-10 w-full rounded-lg border bg-background px-3 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </label>
        <label className="text-sm sm:w-40">
          <span className="mb-1.5 block font-medium">Kapazität</span>
          <input
            name="kapazitaet"
            type="number"
            min="1"
            defaultValue={department.kapazitaet ?? ""}
            placeholder="z. B. 4"
            className="h-10 w-full rounded-lg border bg-background px-3 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </label>
        <button
          type="submit"
          className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Speichern
        </button>
      </form>

      {/* Lerninhalte zuordnen (Drag & Drop) */}
      <div className="mb-3 flex items-center gap-2">
        <Layers className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Lerninhalte zuordnen</h2>
      </div>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Ziehe die Kenntnisse, Fähigkeiten &amp; Fertigkeiten, die hier vermittelt
        werden, von rechts nach links — oder nutze die{" "}
        <span className="font-medium text-foreground">+</span>/
        <span className="font-medium text-foreground">×</span>-Schaltflächen. Was
        eine Abteilung vermittelt, zählt im Azubi-Profil als abgedeckt.
      </p>

      <AbteilungLerninhalte
        departmentId={department.id}
        contents={contents}
        initialAssigned={initialAssigned}
      />

      {/* Abteilung löschen */}
      <form action={softDeleteDepartment} className="mt-8">
        <input type="hidden" name="id" value={department.id} />
        <button
          type="submit"
          className="text-sm text-muted-foreground transition-colors hover:text-destructive"
        >
          Abteilung löschen
        </button>
      </form>
    </div>
  );
}
