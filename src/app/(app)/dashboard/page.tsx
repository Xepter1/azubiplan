import { redirect } from "next/navigation";
import {
  GraduationCap,
  Building2,
  CalendarDays,
  ClipboardCheck,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getActiveTenant, requireSession } from "@/lib/tenant";
import { roleLabel } from "@/lib/roles";
import { rotationStatus } from "@/lib/rotation";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("de-DE");

export default async function DashboardPage() {
  const session = await requireSession();
  // Beauftragte und Azubis haben kein Dashboard → direkt auf ihre Startseite.
  if (session.user.role === "AUSBILDUNGSBEAUFTRAGTER") {
    redirect("/meine-abteilung");
  }
  if (session.user.role === "AZUBI") {
    redirect("/mein-profil");
  }
  const tenant = await getActiveTenant();
  const role = session.user.role;
  const firstName = (session.user.name ?? "Nutzer").split(" ")[0];
  const showStats = role === "ADMIN" || role === "AUSBILDER";

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Willkommen zurück, {firstName}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Du bist angemeldet als {roleLabel[role]}.
        </p>
      </div>

      {showStats ? (
        <AdminOverview tenantId={tenant.id} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Dein Ausbildungsplan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Hier siehst du bald deinen persönlichen Rotationsplan und deine
              Beurteilungen.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

async function AdminOverview({ tenantId }: { tenantId: string }) {
  const now = new Date();
  const [azubiCount, deptCount, rotationCount, evalCount, rotations] =
    await Promise.all([
      prisma.apprentice.count({ where: { tenantId, deletedAt: null } }),
      prisma.department.count({ where: { tenantId, deletedAt: null } }),
      prisma.placement.count({ where: { tenantId, deletedAt: null } }),
      prisma.evaluation.count({ where: { tenantId } }),
      prisma.placement.findMany({
        where: { tenantId, deletedAt: null },
        include: { apprentice: true, department: true },
        orderBy: { von: "desc" },
        take: 5,
      }),
    ]);

  const stats = [
    { label: "Auszubildende", value: azubiCount, icon: GraduationCap },
    { label: "Abteilungen", value: deptCount, icon: Building2 },
    { label: "Rotationen", value: rotationCount, icon: CalendarDays },
    { label: "Beurteilungen", value: evalCount, icon: ClipboardCheck },
  ];

  return (
    <>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="mt-1 text-3xl font-semibold">{s.value}</div>
                </div>
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="size-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aktuelle Rotationen</CardTitle>
        </CardHeader>
        <CardContent>
          {rotations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Noch keine Rotationen geplant.
            </p>
          ) : (
            <ul className="divide-y">
              {rotations.map((r) => {
                const st = rotationStatus(r.von, r.bis, now);
                return (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {r.apprentice.vorname} {r.apprentice.nachname}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {r.department.name}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {dateFmt.format(r.von)} – {dateFmt.format(r.bis)}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          st.cls,
                        )}
                      >
                        {st.label}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
