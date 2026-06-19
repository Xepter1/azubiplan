import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">AzubiPlan</h1>
        <p className="mt-2 text-muted-foreground">
          Auszubildende verwalten und verplanen.
        </p>
      </div>

      <Link href="/azubis" className={cn(buttonVariants({ size: "lg" }))}>
        Zu den Azubis →
      </Link>

      <p className="text-xs text-muted-foreground">
        Frühes Gerüst · Beispieldaten via{" "}
        <code className="rounded bg-muted px-1 py-0.5">npm run db:seed</code>
      </p>
    </main>
  );
}
