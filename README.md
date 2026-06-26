# AzubiPlan

Mandantenfähige B2B-SaaS zur **Verwaltung und Verplanung von Auszubildenden**.
Unternehmen legen Azubis und Abteilungen an; Azubis rotieren durch Abteilungen, und
Ausbilder:innen behalten den Überblick, ob alle Pflicht-Lerninhalte abgedeckt sind.

> **Stand:** MVP in Arbeit. Es laufen bereits: Login mit Rollen, App-Shell mit
> rollenabhängiger Navigation, Azubi-Verwaltung, der visuelle **Einsatzplaner**
> (Drag & Drop, Ansichten Monat/Woche/Tag), die **Stammdaten-Pflege** (Berufe +
> Lerninhalte, Abteilungen mit Drag-&-Drop-Zuordnung) und der **RLP-Abdeckungs-Check**
> im Azubi-Profil (was ist abgedeckt, was fehlt).
>
> Das große Bild (Stack-Entscheidungen, Datenmodell, DSGVO, Roadmap):
> **[ARCHITECTURE.md](ARCHITECTURE.md)** · Schnell-Kontext für KI-Sitzungen: **[CLAUDE.md](CLAUDE.md)**

## Tech-Stack
- **Next.js 16** (TypeScript, App Router) — Frontend + Backend in einem Projekt
- **Prisma 7** + **PostgreSQL** (lokal via Docker)
- **Auth.js v5** — Login + Rollen
- **shadcn/ui** + Tailwind CSS 4 — Oberfläche

## Voraussetzungen
- **Node.js 20+** und npm (getestet mit Node 22)
- **Docker Desktop** — für die lokale PostgreSQL-Datenbank (muss laufen)
- **git**

## Schnellstart (lokal)

```bash
# 1. Repo holen
git clone https://github.com/Xepter1/azubiplan.git
cd azubiplan

# 2. Abhängigkeiten installieren (erzeugt automatisch den Prisma-Client)
npm install

# 3. Umgebungsdatei anlegen
cp .env.example .env
#    danach in .env einen echten AUTH_SECRET eintragen, z. B. erzeugt mit:
openssl rand -base64 32     # Ausgabe bei AUTH_SECRET="..." in der .env einsetzen

# 4. Datenbank starten (Docker Desktop muss laufen)
npm run db:up

# 5. Schema anlegen + Demo-Daten einspielen
npm run db:migrate          # legt die Tabellen an
npm run db:seed             # Demo-Mandant, Logins, Azubis, Abteilungen, Rotationen

# 6. App starten
npm run dev
```

App öffnen: **http://localhost:3000**

### Demo-Logins (Passwort jeweils `demo1234`)
| E-Mail | Rolle | sieht … |
|---|---|---|
| `admin@demo.de` | Administrator | alles |
| `ausbilder@demo.de` | Ausbilder:in | Planung, Azubis, Berufe, Abteilungen |
| `beauftragter@demo.de` | Ausbildungsbeauftragte:r | Beurteilungen, Azubis |
| `azubi@demo.de` | Auszubildende:r | nur Dashboard + Beurteilungen |

## Nützliche Befehle
| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver mit Hot Reload |
| `npm run build` | Produktions-Build (prüft auch alle Typen) — vor dem Pushen sinnvoll |
| `npm run db:up` / `npm run db:down` | DB-Container starten / stoppen |
| `npm run db:migrate` | Schema-Migration anwenden bzw. neue erstellen |
| `npm run db:seed` | Demo-Daten neu einspielen (löscht vorher den Demo-Mandanten) |
| `npm run db:studio` | Prisma Studio — Datenbank im Browser ansehen/bearbeiten |
| `npm run db:reset` | DB zurücksetzen + neu migrieren (danach `npm run db:seed`) |
| `npm run lint` | ESLint |

## Projektstruktur (Kurzüberblick)
```
prisma/
  schema.prisma          # Datenmodell — Single Source of Truth
  migrations/            # versionierte DB-Änderungen
  seed.ts                # Demo-Daten (npm run db:seed)
src/
  auth.ts                # Auth.js-Konfiguration (Login, Session, Rollen)
  app/
    login/               # Login-Seite + Server-Action
    (app)/               # geschützter Bereich (Sidebar + Topbar)
      _components/        # Sidebar, Topbar, Navigations-Mapping (nav.ts)
      dashboard/          # rollenabhängiges Dashboard
      auszubildende/      # Azubi-Liste + Profil (Stationen + RLP-Abdeckungs-Cockpit)
      berufe/             # Berufe + Lerninhalte (Kenntnisse/Fähigkeiten/Fertigkeiten)
      abteilungen/        # Abteilungen + Lerninhalt-Zuordnung (Drag & Drop)
      einsatzplanung/     # visueller Planer (Drag & Drop) + Server-Actions
      sperrzeiten/ meine-seite/ benutzer/ beurteilungen/ einstellungen/
    api/auth/            # Auth.js-Endpunkte
  lib/
    prisma.ts            # Prisma-Client (Singleton, @prisma/adapter-pg)
    tenant.ts            # aktiver Mandant aus der Login-Session
    roles.ts, rotation.ts
  generated/prisma/      # generierter Prisma-Client (gitignored, via postinstall)
```

## Gut zu wissen
- **Mandantentrennung** läuft aktuell in der App-Schicht: Jede Abfrage filtert nach
  `tenantId` aus der Session. Als Absicherung *darunter* kommt noch PostgreSQL
  **Row-Level-Security** (siehe [ARCHITECTURE.md](ARCHITECTURE.md)).
- Der **generierte Prisma-Client** (`src/generated/prisma`) wird nicht committet;
  `npm install` erzeugt ihn automatisch neu (`postinstall`-Skript).
- **Geheimnisse** stehen in `.env` und werden **nie** committet. `.env.example` ist die
  Vorlage (Werte passen zur lokalen Docker-DB).

## Zusammenarbeit
- Kleines Team → wir committen klein und nachvollziehbar, aktuell direkt auf `main`.
- Vor dem Pushen kurz `npm run build` laufen lassen — fängt Typ- und Importfehler ab.
- **DSGVO von Tag 1** mitdenken (Minderjährige, §87 BetrVG/Mitbestimmung) — Details und
  Stolpersteine in [ARCHITECTURE.md](ARCHITECTURE.md).
