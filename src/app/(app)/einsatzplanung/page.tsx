import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { rotationStatus } from "@/lib/rotation";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("de-DE");

export default async function EinsatzplanungPage() {
  const tenant = await getActiveTenant();
  const now = new Date();

  const placements = await prisma.placement.findMany({
    where: { tenantId: tenant.id, deletedAt: null },
    include: { apprentice: true, department: true },
    orderBy: { von: "asc" },
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        Einsatzplanung
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Rotationen der Auszubildenden durch die Abteilungen
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Alle Rotationen</CardTitle>
          <CardDescription>
            Entwurf — Anlegen/Bearbeiten und der Abdeckungs-Check folgen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {placements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Noch keine Rotationen vorhanden.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Azubi</TableHead>
                  <TableHead>Abteilung</TableHead>
                  <TableHead>Zeitraum</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {placements.map((p) => {
                  const st = rotationStatus(p.von, p.bis, now);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.apprentice.vorname} {p.apprentice.nachname}
                      </TableCell>
                      <TableCell>{p.department.name}</TableCell>
                      <TableCell>
                        {dateFmt.format(p.von)} – {dateFmt.format(p.bis)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            st.cls,
                          )}
                        >
                          {st.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
