import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { createApprentice, logout, softDeleteApprentice } from "./actions";

// Immer frische Daten aus der DB (kein statisches Caching dieser Seite).
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("de-DE");

export default async function AzubisPage() {
  const tenant = await getActiveTenant();

  const [apprentices, professions] = await Promise.all([
    prisma.apprentice.findMany({
      where: { tenantId: tenant.id, deletedAt: null },
      include: { profession: true },
      orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
    }),
    prisma.profession.findMany({
      where: { tenantId: tenant.id, deletedAt: null },
      orderBy: { bezeichnung: "asc" },
    }),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Azubis</h1>
          <p className="text-sm text-muted-foreground">
            Mandant: {tenant.name} · {apprentices.length} aktive Azubis
          </p>
        </div>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            Abmelden
          </Button>
        </form>
      </header>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Neuen Azubi anlegen</CardTitle>
          <CardDescription>
            Pflichtfelder: Vorname, Nachname, Start und Ende.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createApprentice} className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="vorname">Vorname</Label>
              <Input id="vorname" name="vorname" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nachname">Nachname</Label>
              <Input id="nachname" name="nachname" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="start">Start</Label>
              <Input id="start" name="start" type="date" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ende">Ende</Label>
              <Input id="ende" name="ende" type="date" required />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="professionId">Beruf</Label>
              <select
                id="professionId"
                name="professionId"
                defaultValue=""
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="">— kein Beruf —</option>
                {professions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.bezeichnung}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Azubi anlegen</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alle Azubis</CardTitle>
        </CardHeader>
        <CardContent>
          {apprentices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Noch keine Azubis. Lege oben den ersten an — oder führe{" "}
              <code className="rounded bg-muted px-1 py-0.5">npm run db:seed</code>{" "}
              für Beispieldaten aus.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Beruf</TableHead>
                  <TableHead>Zeitraum</TableHead>
                  <TableHead className="text-right">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apprentices.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.nachname}, {a.vorname}
                    </TableCell>
                    <TableCell>{a.profession?.bezeichnung ?? "—"}</TableCell>
                    <TableCell>
                      {dateFmt.format(a.start)} – {dateFmt.format(a.ende)}
                    </TableCell>
                    <TableCell className="text-right">
                      <form action={softDeleteApprentice}>
                        <input type="hidden" name="id" value={a.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          Entfernen
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
