import { AzubiProfilView } from "../azubi-profil-view";

export const dynamic = "force-dynamic";

export default async function AzubiProfilPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AzubiProfilView apprenticeId={id} editableClass context="ausbilder" />
  );
}
