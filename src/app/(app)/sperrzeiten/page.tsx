import { Trash2 } from "lucide-react";

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
import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import {
  createAbsence,
  createDeptBlock,
  deleteAbsence,
  deleteDeptBlock,
} from "./actions";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("de-DE");
const ABSENCE_LABEL: Record<string, string> = {
  URLAUB: "Urlaub",
  PRUEFUNG: "Prüfung",
  PRUEFUNGSVORBEREITUNG: "Prüfungsvorbereitung",
};

const selectCls =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

export default async function SperrzeitenPage() {
  const tenant = await getActiveTenant();
  const tid = tenant.id;

  const [apprentices, departments, absence, deptBlocks] = await Promise.all([
    prisma.apprentice.findMany({
      where: { tenantId: tid, deletedAt: null },
      select: { id: true, vorname: true, nachname: true },
      orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
    }),
    prisma.department.findMany({
      where: { tenantId: tid, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.absenceBlock.findMany({
      where: { tenantId: tid },
      select: {
        id: true,
        typ: true,
        von: true,
        bis: true,
        apprentice: { select: { vorname: true, nachname: true } },
      },
      orderBy: { von: "asc" },
    }),
    prisma.departmentBlock.findMany({
      where: { tenantId: tid },
      select: {
        id: true,
        grund: true,
        von: true,
        bis: true,
        department: { select: { name: true } },
      },
      orderBy: { von: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
        Admin
      </p>
      <h1 className="mb-1 text-3xl font-bold tracking-tight">
        Sperrzeiten &amp; Abwesenheiten
      </h1>
      <p className="mb-8 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        Urlaub, Prüfungen und Abteilungssperren — hier gepflegte Zeiträume
        erscheinen im Rotationsplaner und lösen die Regel-Hinweise aus. Den
        Berufsschulplan pflegst du jetzt je Klasse unter „Klassen“.
      </p>

      <div className="space-y-6">
        {/* Urlaub & Prüfung */}
        <Card>
          <CardHeader>
            <CardTitle>Urlaub &amp; Prüfung</CardTitle>
            <CardDescription>Abwesenheiten einzelner Azubis.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={createAbsence}
              className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-end"
            >
              <div className="grid gap-1.5">
                <Label htmlFor="ab-azubi">Azubi</Label>
                <select id="ab-azubi" name="apprenticeId" className={selectCls} required>
                  {apprentices.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nachname}, {a.vorname}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ab-typ">Art</Label>
                <select id="ab-typ" name="typ" className={selectCls}>
                  <option value="URLAUB">Urlaub</option>
                  <option value="PRUEFUNG">Prüfung</option>
                  <option value="PRUEFUNGSVORBEREITUNG">Prüfungsvorbereitung</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ab-von">Von</Label>
                <Input id="ab-von" name="von" type="date" required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ab-bis">Bis</Label>
                <Input id="ab-bis" name="bis" type="date" required />
              </div>
              <Button type="submit">Hinzufügen</Button>
            </form>

            <BlockList
              empty="Noch keine Abwesenheiten."
              rows={absence.map((a) => ({
                id: a.id,
                title: `${a.apprentice.nachname}, ${a.apprentice.vorname}`,
                sub: ABSENCE_LABEL[a.typ] ?? a.typ,
                von: a.von,
                bis: a.bis,
              }))}
              action={deleteAbsence}
            />
          </CardContent>
        </Card>

        {/* Abteilungssperren */}
        <Card>
          <CardHeader>
            <CardTitle>Abteilungssperren</CardTitle>
            <CardDescription>
              Gesperrte Zeiträume einer Abteilung (z. B. Betriebsurlaub).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={createDeptBlock}
              className="mb-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto_auto] sm:items-end"
            >
              <div className="grid gap-1.5">
                <Label htmlFor="db-dep">Abteilung</Label>
                <select id="db-dep" name="departmentId" className={selectCls} required>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="db-grund">Grund (optional)</Label>
                <Input id="db-grund" name="grund" placeholder="z. B. Betriebsurlaub" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="db-von">Von</Label>
                <Input id="db-von" name="von" type="date" required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="db-bis">Bis</Label>
                <Input id="db-bis" name="bis" type="date" required />
              </div>
              <Button type="submit">Hinzufügen</Button>
            </form>

            <BlockList
              empty="Noch keine Abteilungssperren."
              rows={deptBlocks.map((b) => ({
                id: b.id,
                title: b.department.name,
                sub: b.grund ?? "gesperrt",
                von: b.von,
                bis: b.bis,
              }))}
              action={deleteDeptBlock}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BlockList({
  rows,
  empty,
  action,
}: {
  rows: { id: string; title: string; sub: string; von: Date; bis: Date }[];
  empty: string;
  action: (formData: FormData) => void;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="divide-y rounded-xl border">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
          <span className="font-medium">{r.title}</span>
          <span className="text-muted-foreground">{r.sub}</span>
          <span className="ml-auto text-muted-foreground">
            {fmt.format(r.von)} – {fmt.format(r.bis)}
          </span>
          <form action={action}>
            <input type="hidden" name="id" value={r.id} />
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              aria-label="Löschen"
            >
              <Trash2 className="size-4" />
            </Button>
          </form>
        </li>
      ))}
    </ul>
  );
}
