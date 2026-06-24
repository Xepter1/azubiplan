import { type CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import {
  ausbildungsdauerJahre,
  ausbildungsjahr,
  bewertungLabel,
  departmentColorMap,
  stationState,
  type StationState,
} from "@/lib/ausbildung";

export const dynamic = "force-dynamic";

const MONTH_FMT = new Intl.DateTimeFormat("de-DE", {
  month: "short",
  year: "numeric",
});

const STATE_LABEL: Record<StationState, string> = {
  erledigt: "erledigt",
  laeuft: "läuft",
  geplant: "geplant",
  offen: "nicht geplant",
};

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export default async function AzubiProfilPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await getActiveTenant();
  const session = await auth();
  const now = new Date();

  const [azubi, departments] = await Promise.all([
    prisma.apprentice.findFirst({
      where: { id, tenantId: tenant.id, deletedAt: null },
      select: {
        vorname: true,
        nachname: true,
        start: true,
        ende: true,
        professionId: true,
        profession: { select: { bezeichnung: true } },
        placements: {
          where: { deletedAt: null },
          select: {
            departmentId: true,
            von: true,
            bis: true,
            evaluation: { select: { bewertung: true } },
          },
        },
      },
    }),
    prisma.department.findMany({
      where: { tenantId: tenant.id, deletedAt: null },
      select: {
        id: true,
        name: true,
        suitableFor: { select: { professionId: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!azubi) notFound();

  const colorOf = departmentColorMap(departments.map((d) => d.id));

  const stations = departments
    .filter(
      (d) =>
        azubi.professionId != null &&
        d.suitableFor.some((s) => s.professionId === azubi.professionId),
    )
    .map((d) => {
      const own = azubi.placements.filter((p) => p.departmentId === d.id);
      const state = stationState(own, now);
      // Bewertung des jüngsten abgeschlossenen Einsatzes in dieser Abteilung.
      const done = own
        .filter((p) => p.bis.getTime() < now.getTime())
        .sort((a, b) => b.bis.getTime() - a.bis.getTime());
      const bewertung = done.find((p) => p.evaluation)?.evaluation?.bewertung;
      return {
        name: d.name,
        color: colorOf[d.id],
        state,
        bewertung: bewertungLabel(bewertung),
      };
    });

  const erledigt = stations.filter((s) => s.state === "erledigt").length;
  const lehrjahr = ausbildungsjahr(azubi.start, now);
  const dauer = ausbildungsdauerJahre(azubi.start, azubi.ende);
  const initials = `${azubi.vorname[0] ?? ""}${azubi.nachname[0] ?? ""}`.toUpperCase();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link
        href="/auszubildende"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Zur Azubi-Liste
      </Link>

      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
        Ausbilder
      </p>
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Azubi-Profil</h1>
      <p className="mb-8 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        Die Balken zeigen den Stationsstand:{" "}
        <span className="font-medium text-foreground">voll = erledigt</span>,{" "}
        <span className="font-medium text-foreground">transparent = geplant</span>,{" "}
        <span className="font-medium text-foreground">leer = noch nicht geplant</span>. Bei
        erledigten Stationen ist die Bewertung direkt einsehbar.
      </p>

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        {/* Stammdaten */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted text-xl font-bold text-muted-foreground">
            {initials}
          </div>
          <h2 className="text-xl font-bold">
            {azubi.vorname} {azubi.nachname}
          </h2>
          <p className="mb-5 text-sm text-muted-foreground">
            {azubi.profession?.bezeichnung ?? "Kein Beruf hinterlegt"}
          </p>

          <dl className="divide-y text-sm">
            <Row label="Ausbildungsstart" value={MONTH_FMT.format(azubi.start)} />
            <Row
              label="Lehrjahr"
              value={`${lehrjahr}. von ${dauer.toLocaleString("de-DE")}`}
            />
            <Row label="Ausbilder" value={session?.user?.name ?? "—"} />
            <Row
              label="Stationen"
              value={`${erledigt} / ${stations.length} erledigt`}
            />
          </dl>
        </div>

        {/* Stationen + Notenspiegel */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Stationen im Beruf
            </span>
            <Legend label="erledigt" style={{ backgroundColor: "#1d4ed8" }} />
            <Legend label="geplant" style={{ backgroundColor: hexA("#1d4ed8", 0.25) }} />
            <Legend
              label="nicht geplant"
              style={{ border: "1px solid var(--border)" }}
            />
          </div>

          {stations.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              Für diesen Beruf sind noch keine geeigneten Abteilungen
              hinterlegt.
            </p>
          ) : (
            <div className="space-y-2.5">
              {stations.map((s) => (
                <StationBar key={s.name} {...s} />
              ))}
            </div>
          )}

          {/* Notenspiegel — Platzhalter, echtes Notenmodul folgt */}
          <p className="mt-8 mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Notenspiegel
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {["Fachtheorie", "Praxis", "WiSo", "Ø gesamt"].map((f) => (
              <div
                key={f}
                className="rounded-xl border border-dashed bg-muted/30 px-4 py-3"
              >
                <p className="text-2xl font-bold text-muted-foreground/50">—</p>
                <p className="text-xs text-muted-foreground">{f}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground/70">
            Noten &amp; Zeugnisse folgen mit dem Beurteilungsmodul.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function Legend({
  label,
  style,
  outlineColor,
}: {
  label: string;
  style?: CSSProperties;
  outlineColor?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className="size-3 rounded-full"
        style={outlineColor ? { border: `2px solid ${outlineColor}` } : style}
      />
      {label}
    </span>
  );
}

function StationBar({
  name,
  color,
  state,
  bewertung,
}: {
  name: string;
  color: string;
  state: StationState;
  bewertung: string | null;
}) {
  // Drei Zustände:
  //  voll        = erledigt (deckende Farbe)
  //  transparent = geplant oder läuft (durchscheinende Farbe)
  //  leer/weiß   = noch nicht geplant (leerer Balken mit feinem Rahmen)
  const fill: CSSProperties =
    state === "erledigt"
      ? { backgroundColor: color }
      : state === "offen"
        ? { backgroundColor: "transparent", border: "1px solid var(--border)" }
        : { backgroundColor: hexA(color, 0.25) };

  return (
    <div className="grid grid-cols-[11rem_1fr_auto] items-center gap-3">
      <span className="truncate text-sm font-medium" title={name}>
        {name}
      </span>
      <span className="h-7 rounded-lg" style={fill} />
      {state === "erledigt" && bewertung ? (
        <Link
          href="/beurteilungen"
          className="inline-flex items-center gap-1 rounded-lg border bg-background px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
        >
          Bewertung · {bewertung}
          <ArrowUpRight className="size-3.5" />
        </Link>
      ) : (
        <span className="w-20 text-right text-xs text-muted-foreground">
          {STATE_LABEL[state]}
        </span>
      )}
    </div>
  );
}
