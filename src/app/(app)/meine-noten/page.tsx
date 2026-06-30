import { prisma } from "@/lib/prisma";
import { getActiveTenant, requireSession } from "@/lib/tenant";
import { MeineNoten } from "./meine-noten";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("de-DE");

export default async function MeineNotenPage() {
  const session = await requireSession();
  const tenant = await getActiveTenant();

  const azubi = await prisma.apprentice.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id, deletedAt: null },
    select: {
      classId: true,
      class: {
        select: {
          classSubjects: {
            select: { subject: { select: { id: true, name: true } } },
          },
        },
      },
      grades: {
        select: {
          id: true,
          wert: true,
          datum: true,
          subject: { select: { name: true } },
        },
        orderBy: { datum: "desc" },
      },
    },
  });

  if (!azubi) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Noten</h1>
        <p className="text-muted-foreground">
          Mit diesem Login ist noch kein Azubi-Profil verknüpft.
        </p>
      </div>
    );
  }

  const grades = azubi.grades.map((g) => ({
    id: g.id,
    fach: g.subject.name,
    wert: Number(g.wert).toLocaleString("de-DE", { minimumFractionDigits: 1 }),
    datum: dateFmt.format(g.datum),
  }));
  const subjects = (azubi.class?.classSubjects ?? [])
    .map((cs) => cs.subject)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <MeineNoten grades={grades} subjects={subjects} hasClass={!!azubi.classId} />
  );
}
