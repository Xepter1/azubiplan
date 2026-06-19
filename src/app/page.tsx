import { redirect } from "next/navigation";

// Einstiegspunkt: weiter zum Dashboard. Wer nicht angemeldet ist, wird vom
// (app)-Layout automatisch zum Login geschickt.
export default function Home() {
  redirect("/dashboard");
}
