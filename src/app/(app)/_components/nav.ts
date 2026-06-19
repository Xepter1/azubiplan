import type { ComponentType } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  Building2,
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

const ALL: UserRole[] = [
  "ADMIN",
  "AUSBILDER",
  "AUSBILDUNGSBEAUFTRAGTER",
  "AZUBI",
];

// Navigation. Welche Einträge ein Nutzer sieht, ergibt sich aus `roles`.
// Admin sieht alles; Azubi nur Dashboard + Beurteilungen.
export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ALL },
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
    roles: ALL,
  },
  {
    href: "/auszubildende",
    label: "Auszubildende",
    icon: GraduationCap,
    roles: ["ADMIN", "AUSBILDER", "AUSBILDUNGSBEAUFTRAGTER"],
  },
  {
    href: "/abteilungen",
    label: "Abteilungen",
    icon: Building2,
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
