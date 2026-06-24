"use client";

import { type CSSProperties, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  ArrowUpDown,
  Search,
  Check,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { StationState } from "@/lib/ausbildung";

export type Station = { name: string; color: string; state: StationState };
export type AzubiRow = {
  id: string;
  vorname: string;
  nachname: string;
  professionId: string | null;
  beruf: string | null;
  lehrjahr: number;
  stations: Station[];
};
type Profession = { id: string; bezeichnung: string };

type SortKey = "name" | "lehrjahr" | "fortschritt";
const SORT_LABEL: Record<SortKey, string> = {
  name: "Name (A–Z)",
  lehrjahr: "Lehrjahr",
  fortschritt: "Fortschritt",
};

// rgba aus #rrggbb + Alpha (für "geplant" = transparente Färbung).
function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// Stil eines Segments im Mini-Fortschritt:
//  durchlaufen → deckend, geplant → transparent, offen → leer (neutral).
function segStyle(s: Station): CSSProperties {
  if (s.state === "erledigt" || s.state === "laeuft") {
    return { backgroundColor: s.color };
  }
  if (s.state === "geplant") {
    return { backgroundColor: hexA(s.color, 0.28) };
  }
  return { backgroundColor: "var(--muted)" };
}

function initials(vorname: string, nachname: string) {
  return (vorname[0] ?? "").concat(nachname[0] ?? "").toUpperCase();
}
function erledigtCount(r: AzubiRow) {
  return r.stations.filter((s) => s.state === "erledigt" || s.state === "laeuft")
    .length;
}

export function AzubiListe({
  rows,
  professions,
}: {
  rows: AzubiRow[];
  professions: Profession[];
}) {
  const [query, setQuery] = useState("");
  const [berufFilter, setBerufFilter] = useState<string>(""); // "" = alle
  const [jahrFilter, setJahrFilter] = useState<number | null>(null);
  const [sort, setSort] = useState<SortKey>("name");
  const [openMenu, setOpenMenu] = useState<null | "filter" | "sort">(null);

  const jahre = useMemo(
    () => Array.from(new Set(rows.map((r) => r.lehrjahr))).sort((a, b) => a - b),
    [rows],
  );
  const aktiveFilter = (berufFilter ? 1 : 0) + (jahrFilter != null ? 1 : 0);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      const name = `${r.vorname} ${r.nachname}`.toLowerCase();
      if (q && !name.includes(q)) return false;
      if (berufFilter && r.professionId !== berufFilter) return false;
      if (jahrFilter != null && r.lehrjahr !== jahrFilter) return false;
      return true;
    });
    const sorted = [...filtered];
    if (sort === "name") {
      sorted.sort((a, b) =>
        `${a.nachname} ${a.vorname}`.localeCompare(`${b.nachname} ${b.vorname}`),
      );
    } else if (sort === "lehrjahr") {
      sorted.sort((a, b) => a.lehrjahr - b.lehrjahr);
    } else {
      sorted.sort((a, b) => erledigtCount(b) - erledigtCount(a));
    }
    return sorted;
  }, [rows, query, berufFilter, jahrFilter, sort]);

  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <div className="flex rounded-lg bg-muted p-0.5 text-sm">
          <span className="rounded-md bg-card px-3 py-1.5 font-medium shadow-sm">
            Azubis
          </span>
          <Link
            href="/einsatzplanung"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            Kalender
          </Link>
        </div>

        <div className="relative min-w-50 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Azubi suchen …"
            className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        {/* Filter */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === "filter" ? null : "filter")}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm transition-colors hover:bg-muted",
              aktiveFilter > 0 && "border-primary/40 text-foreground",
            )}
          >
            <span className="text-muted-foreground">Filter</span>
            {aktiveFilter > 0 && (
              <span className="flex size-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {aktiveFilter}
              </span>
            )}
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>
          {openMenu === "filter" && (
            <Dropdown onClose={() => setOpenMenu(null)}>
              <p className="px-2 pb-1 pt-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Beruf
              </p>
              <MenuItem
                active={berufFilter === ""}
                onClick={() => setBerufFilter("")}
              >
                Alle Berufe
              </MenuItem>
              {professions.map((p) => (
                <MenuItem
                  key={p.id}
                  active={berufFilter === p.id}
                  onClick={() => setBerufFilter(p.id)}
                >
                  {p.bezeichnung}
                </MenuItem>
              ))}
              <div className="my-1 border-t" />
              <p className="px-2 pb-1 pt-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Lehrjahr
              </p>
              <MenuItem
                active={jahrFilter === null}
                onClick={() => setJahrFilter(null)}
              >
                Alle Jahre
              </MenuItem>
              {jahre.map((j) => (
                <MenuItem
                  key={j}
                  active={jahrFilter === j}
                  onClick={() => setJahrFilter(j)}
                >
                  {j}. Lehrjahr
                </MenuItem>
              ))}
            </Dropdown>
          )}
        </div>

        {/* Sortierung */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === "sort" ? null : "sort")}
            className="flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm transition-colors hover:bg-muted"
            title="Sortieren"
          >
            <ArrowUpDown className="size-4 text-muted-foreground" />
            <span className="hidden text-muted-foreground sm:inline">
              {SORT_LABEL[sort]}
            </span>
          </button>
          {openMenu === "sort" && (
            <Dropdown onClose={() => setOpenMenu(null)}>
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <MenuItem
                  key={k}
                  active={sort === k}
                  onClick={() => setSort(k)}
                >
                  {SORT_LABEL[k]}
                </MenuItem>
              ))}
            </Dropdown>
          )}
        </div>

        {/* + Neu — kommt später */}
        <button
          type="button"
          disabled
          title="Azubi hinzufügen — folgt"
          className="flex h-9 cursor-not-allowed items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground opacity-50"
        >
          <Plus className="size-4" />
          Neu
        </button>
      </div>

      {/* Tabellenkopf */}
      <div className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-4 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <span>Name</span>
        <span>Beruf</span>
        <span className="w-24">Lehrjahr</span>
        <span className="w-32 text-right">Fortschritt</span>
      </div>

      {/* Zeilen */}
      {visible.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">
          Keine Azubis gefunden.
        </p>
      ) : (
        <ul>
          {visible.map((r) => (
            <li key={r.id} className="border-t">
              <Link
                href={`/auszubildende/${r.id}`}
                className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                    {initials(r.vorname, r.nachname)}
                  </span>
                  <span className="font-semibold">
                    {r.vorname} {r.nachname}
                  </span>
                </div>
                <span className="truncate text-sm text-muted-foreground">
                  {r.beruf ?? "—"}
                </span>
                <span className="w-24 text-sm text-muted-foreground">
                  {r.lehrjahr}. LJ
                </span>
                <div className="flex w-32 items-center justify-end gap-2">
                  <Progress stations={r.stations} />
                  <ChevronRight className="size-4 text-muted-foreground/50" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Progress({ stations }: { stations: Station[] }) {
  if (stations.length === 0) {
    return <span className="text-xs text-muted-foreground/60">—</span>;
  }
  return (
    <div className="flex items-center gap-1">
      {stations.map((s, i) => (
        <span
          key={i}
          title={`${s.name}: ${s.state}`}
          className="h-2 w-4 rounded-full"
          style={segStyle(s)}
        />
      ))}
    </div>
  );
}

// Kleines Popover-Menü mit unsichtbarem Backdrop zum Schließen.
function Dropdown({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <>
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 z-10 cursor-default"
      />
      <div className="absolute right-0 z-20 mt-1.5 max-h-80 w-60 overflow-auto rounded-xl border bg-popover p-1 shadow-lg">
        {children}
      </div>
    </>
  );
}

function MenuItem({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
    >
      <Check
        className={cn("size-3.5 shrink-0", active ? "opacity-100" : "opacity-0")}
      />
      <span className="truncate">{children}</span>
    </button>
  );
}
