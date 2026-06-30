import type { ComponentType } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  Briefcase,
  School,
  Building2,
  CalendarX,
  CircleUser,
  ClipboardList,
  Users,
  Settings,
} from "lucide-react";

import type { UserRole } from "@/generated/prisma/enums";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  roles: UserRole[];
};

// Navigation. Welche Einträge ein Nutzer sieht, ergibt sich aus `roles`.
// Admin sieht alles; Azubi nur Mein Profil / Kalender / Noten.
export const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "AUSBILDER"],
  },
  {
    href: "/mein-profil",
    label: "Mein Profil",
    icon: CircleUser,
    roles: ["AZUBI"],
  },
  {
    href: "/mein-kalender",
    label: "Kalender",
    icon: CalendarDays,
    roles: ["AZUBI"],
  },
  {
    href: "/meine-noten",
    label: "Noten",
    icon: ClipboardList,
    roles: ["AZUBI"],
  },
  {
    href: "/meine-abteilung",
    label: "Meine Abteilung",
    icon: Building2,
    roles: ["AUSBILDUNGSBEAUFTRAGTER"],
  },
  {
    href: "/einsatzplanung",
    label: "Einsatzplanung",
    icon: CalendarDays,
    roles: ["ADMIN", "AUSBILDER"],
  },
  {
    href: "/beurteilungen",
    label: "Beurteilungen",
    icon: ClipboardCheck,
    roles: ["ADMIN", "AUSBILDER", "AUSBILDUNGSBEAUFTRAGTER"],
  },
  {
    href: "/auszubildende",
    label: "Auszubildende",
    icon: GraduationCap,
    roles: ["ADMIN", "AUSBILDER"],
  },
  {
    href: "/berufe",
    label: "Berufe",
    icon: Briefcase,
    roles: ["ADMIN", "AUSBILDER"],
  },
  {
    href: "/klassen",
    label: "Klassen",
    icon: School,
    roles: ["ADMIN", "AUSBILDER"],
  },
  {
    href: "/abteilungen",
    label: "Abteilungen",
    icon: Building2,
    roles: ["ADMIN", "AUSBILDER"],
  },
  {
    href: "/sperrzeiten",
    label: "Sperrzeiten",
    icon: CalendarX,
    roles: ["ADMIN", "AUSBILDER"],
  },
  { href: "/benutzer", label: "Benutzer", icon: Users, roles: ["ADMIN"] },
  {
    href: "/einstellungen",
    label: "Einstellungen",
    icon: Settings,
    roles: ["ADMIN"],
  },
];
