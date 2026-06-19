// Status einer Rotation/eines Einsatzes relativ zu heute.
export type RotationStatus = { label: string; cls: string };

export function rotationStatus(
  von: Date,
  bis: Date,
  now: Date = new Date(),
): RotationStatus {
  if (bis.getTime() < now.getTime()) {
    return { label: "Abgeschlossen", cls: "bg-muted text-muted-foreground" };
  }
  if (von.getTime() > now.getTime()) {
    return {
      label: "Geplant",
      cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
    };
  }
  return {
    label: "Aktiv",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  };
}
