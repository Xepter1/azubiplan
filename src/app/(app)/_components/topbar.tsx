"use client";

import { usePathname } from "next/navigation";

import { navItems } from "./nav";

export function TopBar() {
  const pathname = usePathname();
  const current = navItems.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
  );

  return (
    <header className="flex h-14 shrink-0 items-center border-b px-6">
      <h2 className="text-sm font-semibold">{current?.label ?? "AzubiPlan"}</h2>
    </header>
  );
}
