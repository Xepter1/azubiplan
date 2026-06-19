"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/generated/prisma/enums";
import { navItems } from "./nav";
import { logout } from "../actions";

export function Sidebar({
  role,
  userName,
  userEmail,
}: {
  role: UserRole;
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const items = navItems.filter((item) => item.roles.includes(role));
  const initial = (userName.trim()[0] ?? "?").toUpperCase();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
          <GraduationCap className="size-5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">AzubiPlan</div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Planning System
          </div>
        </div>
      </div>

      {/* Navigation (rollenabhängig) */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Nutzer-Bereich */}
      <div className="border-t p-3">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
            {initial}
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-medium">{userName}</div>
            <div className="truncate text-xs text-muted-foreground">
              {userEmail}
            </div>
          </div>
        </div>
        <form action={logout} className="mt-1">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
          >
            <LogOut className="size-4" />
            Abmelden
          </Button>
        </form>
      </div>
    </aside>
  );
}
