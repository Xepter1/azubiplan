import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Sidebar } from "./_components/sidebar";
import { TopBar } from "./_components/topbar";

// Alle Seiten der (app)-Gruppe sind nutzerspezifisch → immer dynamisch rendern.
export const dynamic = "force-dynamic";

// Geschütztes App-Layout: ohne Session geht es zum Login.
// Alle Seiten innerhalb der (app)-Gruppe bekommen Sidebar + Topbar.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        role={session.user.role}
        userName={session.user.name ?? "Nutzer"}
        userEmail={session.user.email ?? ""}
      />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
