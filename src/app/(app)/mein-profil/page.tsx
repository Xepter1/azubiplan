import { prisma } from "@/lib/prisma";
import { getActiveTenant, requireSession } from "@/lib/tenant";
import { AzubiProfilView } from "../auszubildende/azubi-profil-view";

export const dynamic = "force-dynamic";

export default async function MeinProfilPage() {
  const session = await requireSession();
  const tenant = await getActiveTenant();

  const azubi = await prisma.apprentice.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id, deletedAt: null },
    select: { id: true },
  });

  if (!azubi) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Mein Profil</h1>
        <p className="text-muted-foreground">
          Mit diesem Login ist noch kein Azubi-Profil verknüpft. Bitte wende dich
          an deinen Ausbilder.
        </p>
      </div>
    );
  }

  return (
    <AzubiProfilView
      apprenticeId={azubi.id}
      editableClass={false}
      context="azubi"
    />
  );
}
