import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function BeurteilungenPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        Beurteilungen
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>In Arbeit</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Dieser Bereich gehört zum Entwurf. Als Nächstes: Beurteilungen je
            Einsatz erfassen und ansehen.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
