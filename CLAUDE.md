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
**Planung — es gibt noch keinen Code.** Nächster konkreter Schritt: aus dem Datenmodell
(ARCHITECTURE.md, Abschnitt 6) das **Prisma-Schema** ableiten.

## Entschiedener Stack
- **Next.js** (TypeScript) — Frontend + API in einem Projekt
- **Prisma** — DB-Anbindung (typsicher, Migrationen)
- **PostgreSQL** — Datenbank, mit Row-Level-Security + `tenant_id` für Mandantentrennung
- **shadcn/ui** — UI-Komponenten
- **Auth.js** — Login + Rollen (Keycloak später für Enterprise-SSO)
- **Hetzner** (Deutschland) + Docker — Hosting (DSGVO-Datenstandort)

Noch offen: Prisma vs. Drizzle (Tendenz Prisma); Backend in Next.js vs. später NestJS
(Tendenz: erstmal in Next.js).

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
