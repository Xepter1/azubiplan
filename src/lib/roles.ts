import type { UserRole } from "@/generated/prisma/enums";

// Anzeigenamen der Rollen (für Begrüßung, Badges etc.).
export const roleLabel: Record<UserRole, string> = {
  ADMIN: "Administrator",
  AUSBILDER: "Ausbilder:in",
  AUSBILDUNGSBEAUFTRAGTER: "Ausbildungsbeauftragte:r",
  AZUBI: "Auszubildende:r",
};
