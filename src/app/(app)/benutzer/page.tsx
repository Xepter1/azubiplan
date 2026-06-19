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
import { roleLabel } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function BenutzerPage() {
  const tenant = await getActiveTenant();

  const users = await prisma.user.findMany({
    where: { tenantId: tenant.id, deletedAt: null },
    orderBy: [{ name: "asc" }],
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Benutzer</h1>
      <p className="mb-8 text-sm text-muted-foreground">{users.length} Benutzer</p>

      <Card>
        <CardHeader>
          <CardTitle>Alle Benutzer</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead>Rolle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name ?? "—"}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{roleLabel[u.role]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
