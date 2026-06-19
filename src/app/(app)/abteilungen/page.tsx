import {
  Card,
  CardContent,
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

export const dynamic = "force-dynamic";

export default async function AbteilungenPage() {
  const tenant = await getActiveTenant();

  const departments = await prisma.department.findMany({
    where: { tenantId: tenant.id, deletedAt: null },
    include: { _count: { select: { placements: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Abteilungen</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        {departments.length} Abteilungen
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Alle Abteilungen</CardTitle>
        </CardHeader>
        <CardContent>
          {departments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Noch keine Abteilungen angelegt.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Kapazität</TableHead>
                  <TableHead className="text-right">Einsätze gesamt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{d.kapazitaet ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {d._count.placements}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
