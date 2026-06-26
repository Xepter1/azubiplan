# CLAUDE.md — Projektkontext für AzubiPlan

> Diese Datei wird von Claude Code beim Sitzungsstart **automatisch gelesen**.
> Sie bringt eine neue KI-Sitzung auf Stand, ohne dass alles neu erklärt werden muss.
> Ausführliche Details: **[ARCHITECTURE.md](ARCHITECTURE.md)**.

## Was das ist
AzubiPlan ist eine mandantenfähige B2B-SaaS zur Verwaltung und **Verplanung** von
Auszubildenden. Unternehmen legen Azubis und Abteilungen an; Azubis rotieren durch
Abteilungen, und der Ausbilder stellt sicher, dass alle Pflicht-Lerninhalte
(Ausbildungsrahmenplan) abgedeckt werden. Rollen: Admin, Ausbilder, Azubi,
Ausbildungsbeauftragter.

## Aktueller Status
**Gerüst steht (Stand 2026-06-19).** Lauffähiges Next.js 16 (TypeScript, App Router,
Tailwind 4) + shadcn/ui, Prisma 7 auf PostgreSQL (lokal via Docker). Das Datenmodell aus
Abschnitt 6 ist als `prisma/schema.prisma` umgesetzt, die erste Migration ist angewandt,
und der Prisma-Client-Singleton (`src/lib/prisma.ts`, mit `@prisma/adapter-pg`) steht.

Lokal starten: `npm run db:up` (DB-Container), `npm run db:seed` (Demo-Daten) und
`npm run dev` (App auf http://localhost:3000). Demo-Logins (Passwort `demo1234`):
admin@demo.de (Admin), ausbilder@demo.de, beauftragter@demo.de, azubi@demo.de.

Umgesetzt: **App-Shell** mit rollenabhängiger Sidebar (Route-Gruppe `src/app/(app)`) +
rollenabhängigem Dashboard, **Login** (Auth.js v5, E-Mail + Passwort; Session trägt
`tenantId` + `role` → Mandantentrennung in der App-Schicht) und **Maerix-Branding**
(Logo/Bildmarke/Favicon). Navigations-Mapping (Rolle → Reiter):
`src/app/(app)/_components/nav.ts`. Setup/Onboarding: **[README.md](README.md)**.

Funktionsbereiche (Stand 2026-06-26, Details: **[CHANGELOG.md](CHANGELOG.md)**):
- **Einsatzplaner** (`einsatzplanung/`): Drag & Drop, Ansichten Monat/Woche/Tag,
  Abteilungsfarben + Eignung je Beruf (`DepartmentProfession`). **Regel-Engine**
  (`src/lib/planner-rules.ts`): „!" am Block bei Verstoß (Abteilung voll, Berufsschule,
  Urlaub/Prüfung, gesperrt, Station durchlaufen) — alles überschreibbar.
- **Stammdaten** (`berufe/`, `abteilungen/`): Berufe anlegen + je Beruf Lerninhalte
  (Kenntnisse/Fähigkeiten/Fertigkeiten) pflegen (`RequiredContent`). Abteilungen anlegen/
  bearbeiten und ihnen Lerninhalte **per Drag & Drop** zuordnen (`TaughtContent`). Modelle
  `LearningContent`/`RequiredContent`/`TaughtContent` lagen schon, nur die UI ist neu.
- **Klassen & Schule** (`klassen/`): Schulklasse = Beruf + Jahrgang (`SchoolClass`),
  bündelt **Fächer** (`Subject`/`ClassSubject`, mit „Fächer aus anderer Klasse übernehmen")
  und **Berufsschulwochen** (`SchoolBlock` hängt jetzt an der Klasse, nicht mehr am Beruf).
  Azubis werden im Profil einer Klasse zugeordnet (`Apprentice.classId`).
- **Ausbilder-Ansicht**: Azubi-Liste (Suche/Filter/Sortierung) + Azubi-Profil mit
  Stationsbalken (voll/transparent/leer), Bewertungen und **RLP-Abdeckungs-Cockpit**
  (je Pflicht-Lerninhalt: abgedeckt mit Zeitraum & Abteilung / eingeplant / fehlt —
  abgeleitet aus den Einsätzen). Helfer: `src/lib/ausbildung.ts` (`contentCoverage`).
- **Azubi-Ansicht** (`meine-seite/`): Wochen-Zeitleiste, Fortschritt, Anstehendes,
  **Noten** — der Azubi wählt nur aus den **Fächern seiner Klasse** (`Grade.subjectId`).
- **Verwaltung** `/sperrzeiten` (Admin/Ausbilder): Urlaub/Prüfung + Abteilungssperren
  (`AbsenceBlock`, `DepartmentBlock`). Der Berufsschulplan ist zu den **Klassen** gezogen.

Bewusst zurückgestellt: Ausbilder-Zuteilung („nur meine Azubis"), Zeugnis-Upload,
„Urlaub beantragen", Benachrichtigungen bei Noteneingabe. Bei den Lerninhalten:
Typen (Kenntnis/Fähigkeit/Fertigkeit) noch nicht getrennt, Abdeckung binär (keine
Soll-Stunden je Inhalt), Beruf umbenennen fehlt.

Nächste Schritte: **Row-Level-Security** in PostgreSQL (DB-tiefe Mandantentrennung als
Absicherung *unter* der App-Schicht), danach Beurteilung & echte Noten-Auswertung. Offene
Modellierungs-Fragen stehen als `TODO (klären)` in `prisma/schema.prisma`.

## Entschiedener Stack
- **Next.js** (TypeScript) — Frontend + API in einem Projekt
- **Prisma** — DB-Anbindung (typsicher, Migrationen)
- **PostgreSQL** — Datenbank, mit Row-Level-Security + `tenant_id` für Mandantentrennung
- **shadcn/ui** — UI-Komponenten
- **Auth.js** — Login + Rollen (Keycloak später für Enterprise-SSO)
- **Hetzner** (Deutschland) + Docker — Hosting (DSGVO-Datenstandort)

Entschieden: **Prisma 7** (mit `@prisma/adapter-pg`). Noch offen: Backend in Next.js vs.
später NestJS (Tendenz: erstmal in Next.js).

## Wie hier gearbeitet wird
- **Auf Deutsch antworten.**
- Team = 2 Personen, **nicht tief-technisch** → einfach erklären, klare Empfehlungen
  geben statt Options-Fluten.
- **MVP-first, nicht über-engineeren.** Modularer Monolith, keine Microservices/Kubernetes.
  Die Zielgröße (~2.000 Azubis + 500 Accounts) ist für PostgreSQL klein.
- Performance-Sorgen konkret über Indizes, Pagination und Vermeidung von N+1-Abfragen
  adressieren — nicht über Skalierungs-Technik.
- **Datenschutz/DSGVO** ist kritisch (Minderjährige, §87 BetrVG/Betriebsrat,
  Auftragsverarbeitung) und von Tag 1 mitzudenken.

## Der Plan (Kurzfassung)
- **Phase 1 (MVP):** Auth + Rollen, Mandanten, Azubi-/Abteilungs-Verwaltung, manuelle
  Einsatzplanung mit Lückenanzeige, einfache Beurteilungen + Noten. EU-Hosting, Backups,
  Audit-Log, Export/Löschen.
- **Phase 2:** Benachrichtigungen, Massen-Import, Auswertungen/Dashboards, SSO.
- **Phase 3:** automatische Planungsvorschläge (Constraint-Solver), Analytik, Mobil.

Vollständige Roadmap, Datenmodell, DSGVO-Details und Stolpersteine stehen in
**[ARCHITECTURE.md](ARCHITECTURE.md)**.
