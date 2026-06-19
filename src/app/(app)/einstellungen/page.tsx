import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function EinstellungenPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        Einstellungen
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>In Arbeit</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Dieser Bereich gehört zum Entwurf. Hier kommen später Mandanten- und
            Kontoeinstellungen hin.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
