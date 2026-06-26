"use client";

import { type DragEvent, useMemo, useState, useTransition } from "react";
import { GripVertical, Plus, X, Inbox } from "lucide-react";

import { cn } from "@/lib/utils";
import { addTaughtContent, removeTaughtContent } from "../actions";

export type Lerninhalt = {
  id: string;
  titel: string;
  berufe: string[]; // Berufe, die diesen Inhalt laut RLP benötigen
};

export function AbteilungLerninhalte({
  departmentId,
  contents,
  initialAssigned,
}: {
  departmentId: string;
  contents: Lerninhalt[];
  initialAssigned: string[];
}) {
  // Lokaler State ist führend (optimistisch) — der Server wird im Hintergrund
  // nachgezogen. So bleibt das Draggen flüssig ohne Flackern.
  const [assigned, setAssigned] = useState<Set<string>>(
    () => new Set(initialAssigned),
  );
  const [dragOver, setDragOver] = useState<"assigned" | "available" | null>(null);
  const [, startTransition] = useTransition();

  const byId = useMemo(
    () => new Map(contents.map((c) => [c.id, c])),
    [contents],
  );

  const assignedList = useMemo(
    () =>
      contents
        .filter((c) => assigned.has(c.id))
        .sort((a, b) => a.titel.localeCompare(b.titel)),
    [contents, assigned],
  );
  const availableList = useMemo(
    () =>
      contents
        .filter((c) => !assigned.has(c.id))
        .sort((a, b) => a.titel.localeCompare(b.titel)),
    [contents, assigned],
  );

  function assign(id: string) {
    if (!byId.has(id) || assigned.has(id)) return;
    setAssigned((prev) => new Set(prev).add(id));
    startTransition(() => addTaughtContent(departmentId, id));
  }
  function unassign(id: string) {
    if (!assigned.has(id)) return;
    setAssigned((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    startTransition(() => removeTaughtContent(departmentId, id));
  }

  function onDragStart(e: DragEvent, id: string) {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Linke Spalte: die Abteilung (Dropzone zum Zuordnen) */}
      <Column
        title="Vermittelt diese Abteilung"
        count={assignedList.length}
        highlight={dragOver === "assigned"}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver("assigned");
        }}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(null);
          assign(e.dataTransfer.getData("text/plain"));
        }}
        emptyHint="Ziehe Lerninhalte aus der rechten Spalte hierher."
        empty={assignedList.length === 0}
      >
        {assignedList.map((c) => (
          <Chip
            key={c.id}
            content={c}
            tone="assigned"
            onDragStart={(e) => onDragStart(e, c.id)}
            onAction={() => unassign(c.id)}
          />
        ))}
      </Column>

      {/* Rechte Spalte: verfügbare Lerninhalte (Quelle + Dropzone zum Entfernen) */}
      <Column
        title="Verfügbare Lerninhalte"
        count={availableList.length}
        highlight={dragOver === "available"}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver("available");
        }}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(null);
          unassign(e.dataTransfer.getData("text/plain"));
        }}
        emptyHint="Alle Lerninhalte sind dieser Abteilung zugeordnet."
        empty={availableList.length === 0}
      >
        {availableList.map((c) => (
          <Chip
            key={c.id}
            content={c}
            tone="available"
            onDragStart={(e) => onDragStart(e, c.id)}
            onAction={() => assign(c.id)}
          />
        ))}
      </Column>
    </div>
  );
}

function Column({
  title,
  count,
  highlight,
  empty,
  emptyHint,
  children,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  title: string;
  count: number;
  highlight: boolean;
  empty: boolean;
  emptyHint: string;
  children: React.ReactNode;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-sm transition-colors",
        highlight && "border-primary ring-3 ring-ring/30",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {count}
        </span>
      </div>
      {empty ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center">
          <Inbox className="size-5 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">{emptyHint}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">{children}</ul>
      )}
    </div>
  );
}

function Chip({
  content,
  tone,
  onDragStart,
  onAction,
}: {
  content: Lerninhalt;
  tone: "assigned" | "available";
  onDragStart: (e: DragEvent) => void;
  onAction: () => void;
}) {
  return (
    <li
      draggable
      onDragStart={onDragStart}
      className={cn(
        "group flex cursor-grab items-center gap-2 rounded-xl border bg-background px-2.5 py-2 text-sm transition-colors active:cursor-grabbing",
        tone === "assigned" ? "hover:border-primary/40" : "hover:bg-muted",
      )}
    >
      <GripVertical className="size-4 shrink-0 text-muted-foreground/40" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{content.titel}</span>
        {content.berufe.length > 0 && (
          <span className="block truncate text-xs text-muted-foreground">
            {content.berufe.join(", ")}
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={onAction}
        title={tone === "assigned" ? "Entfernen" : "Zuordnen"}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-lg transition-colors",
          tone === "assigned"
            ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
        )}
      >
        {tone === "assigned" ? (
          <X className="size-4" />
        ) : (
          <Plus className="size-4" />
        )}
      </button>
    </li>
  );
}
