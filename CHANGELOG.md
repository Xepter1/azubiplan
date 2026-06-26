# Änderungsprotokoll

Nachvollziehbare Notizen zu jedem größeren Arbeitsschritt. Neueste Einträge oben.
Format lose angelehnt an [Keep a Changelog](https://keepachangelog.com/de/).

---

## 2026-06-26 — Berufe & Lerninhalte, Abteilungs-Zuordnung, RLP-Abdeckung

Das **Killer-Feature** aus ARCHITECTURE.md §6 steht: Pflicht-Lerninhalte je Beruf
pflegen, Abteilungen die vermittelten Inhalte zuordnen und im Azubi-Profil sehen, was
abgedeckt ist und was fehlt. **Kein Schema-Umbau** — das Datenmodell (`LearningContent`,
`RequiredContent`, `TaughtContent`) war bereits vorbereitet; neu ist nur die Oberfläche.

### Reiter „Berufe" + Lerninhalte-Verwaltung
**Was:** Neue Stammdaten-Seite `/berufe` (Rolle Admin/Ausbilder), neuer Nav-Eintrag.

- Liste der Berufe mit Anzahl Lerninhalte; Beruf anlegen + löschen (Soft-Delete).
- Beruf-Detail (`/berufe/[id]`): Lerninhalte als entfernbare Chips; Freitext-Eingabe mit
  **„find-or-create"** (gleichnamige Inhalte werden wiederverwendet, nicht doppelt
  angelegt) und Schnell-Zuordnung bereits vorhandener Inhalte aus anderen Berufen.
- Rein über Server Actions + `<form>` gelöst (`berufe/actions.ts`), kein Client-JS nötig.

### Abteilungen: anlegen/bearbeiten + Drag-&-Drop-Zuordnung
**Was:** Die Abteilungsseite war read-only — jetzt anlegen, bearbeiten und zuordnen.

- `/abteilungen`: Abteilung anlegen (Name + Kapazität), Liste verlinkt ins Detail.
- `/abteilungen/[id]`: Stammdaten bearbeiten + **zweispaltige Lerninhalt-Zuordnung** —
  links „vermittelt diese Abteilung", rechts „verfügbar" (mit Hinweis, welche Berufe den
  Inhalt brauchen). **Native HTML5-Drag-&-Drop** (wie der Planer, keine neue Abhängigkeit)
  plus +/×-Knöpfe; optimistisches Update, Server zieht im Hintergrund nach.
- Setzt/entfernt `TaughtContent` (Abteilung ↔ Lerninhalt) in `abteilungen/actions.ts`.

### Azubi-Profil: RLP-Abdeckung (Cockpit)
**Was:** Neuer Abschnitt im Profil (`/auszubildende/[id]`).

- Pro Pflicht-Lerninhalt des Berufs: **abgedeckt** (mit Zeitraum & Abteilung des
  Einsatzes), **eingeplant** (zukünftiger Einsatz) oder **fehlt** (keine vermittelnde
  Abteilung in der Rotation). Fortschrittsbalken „X/Y abgedeckt".
- Status wird automatisch aus den Einsätzen abgeleitet: war/ist der Azubi in einer
  Abteilung, die den Inhalt vermittelt → abgedeckt. Neuer Helfer `contentCoverage` in
  `src/lib/ausbildung.ts`. Stammdaten-Panel zeigt zusätzlich „Lerninhalte X/Y abgedeckt".

### Demo-Daten (Seed) erweitert
- `prisma/seed.ts`: 21 Lerninhalte, je Beruf zugeordnet (`RequiredContent`) und in
  Abteilungen vermittelt (`TaughtContent`). Geteilte Inhalte (z. B. „Schaltpläne lesen
  und anwenden" bei Mechatroniker + Elektroniker) entstehen nur einmal.
- „Projektmanagement" ist bewusst keiner Abteilung zugeordnet → erscheint dauerhaft
  unter „Fehlt noch" als Demo für die Lückenanzeige.

### Bewusst zurückgestellt
- Lerninhalt-Typen (Kenntnis/Fähigkeit/Fertigkeit getrennt) — aktuell ein flacher Typ.
- Soll-Stunden/-Wochen je Lerninhalt — Abdeckung ist aktuell binär (ja/nein).
- Beruf umbenennen; Rollenprüfung in den Actions (bislang nur Tenant-Filter, wie Bestand).

---

## 2026-06-23 — Azubi-Ansicht, Einsatzplaner-Regeln, Branding

Großer Funktions-Batch. Reihenfolge entspricht den Commits.

### Datenmodell: Planer-Sperren & Soll-Wochen
**Warum:** Der Einsatzplaner soll erkennen, wann ein Einsatz gegen eine Regel
verstößt (Berufsschule, Urlaub/Prüfung, Abteilung gesperrt, Station schon
durchlaufen). Dafür fehlten Modelle.

- Neue Modelle in `prisma/schema.prisma`:
  - `SchoolBlock` — Berufsschul-Blockwochen je Beruf (optional je Ausbildungsjahr).
  - `AbsenceBlock` — Abwesenheit eines Azubis (`AbsenceType`: `URLAUB`,
    `PRUEFUNG`, `PRUEFUNGSVORBEREITUNG`).
  - `DepartmentBlock` — gesperrter Zeitraum einer Abteilung (z. B. Betriebsurlaub).
- Neues Feld `DepartmentProfession.sollWochen` (Int?) — Soll-Dauer, ab der eine
  Station als „durchlaufen" gilt. Wird real noch gepflegt; Demo-Werte im Seed.
- Migration: `prisma/migrations/20260620192355_planner_blocks_and_soll/`.

### Demo-Daten (Seed) erweitert
**Warum:** Die neuen Ansichten sollen mit Beispieldaten gefüllt aussehen.

- `prisma/seed.ts`: Soll-Wochen je Eignung, Berufsschulplan, Urlaub/Prüfung,
  Abteilungssperren, eine Kapazitätsüberschreitung (QS, 3 Azubis bei max. 2),
  Stationsverläufe für Profile (Jonas, Lisa) und vollständige Azubi-Demodaten
  für **Leon Fischer** (`azubi@demo.de`): Einsätze (Softwareentwicklung erledigt,
  IT läuft, QS geplant), Berufsschulwoche, Urlaub und drei Noten.

### Ausbilder: Azubi-Liste & Profil
**Was:** Überarbeitete Liste (`/auszubildende`) + neues Profil (`/auszubildende/[id]`).

- Liste mit Suche, Filter (Beruf/Lehrjahr), Sortierung und Mini-Fortschritt.
- Profil mit Stammdaten, Stationsbalken (**3 Zustände**: voll = erledigt,
  transparent = geplant/läuft, leer = noch nicht geplant), Bewertung je
  abgeschlossener Station und Notenspiegel (Platzhalter).
- Gemeinsame Helfer in `src/lib/ausbildung.ts` (Lehrjahr, Abteilungsfarben,
  Stations-Status) — konsistent zur Einsatzplanung.
- Bewusst zurückgestellt: echte Ausbilder-Zuteilung („nur meine Azubis"),
  Notenspiegel mit echten Daten, „+ Neu"-Anlegen.

### Einsatzplaner: Regel-Hinweise + Sperrzeiten-Verwaltung
**Was:** Regel-Engine + sichtbare Hinweise im Planer, plus Pflege-Oberfläche.

- `src/lib/planner-rules.ts` — reine, client-nutzbare Regel-Engine.
- Beim Ablegen wird geprüft; bei Verstoß erscheint ein „!" am Block mit Hover-
  Tooltip (Grund). **Alle Verstöße sind überschreibbar** — beim Ablegen kommt ein
  Bestätigungsdialog („Trotzdem zuweisen?").
- Kapazität: Bei Überbelegung bekommen **alle** überlappenden Blöcke der Abteilung
  das „!", damit der Grund sichtbar ist.
- „Durchlaufen" zählt nur **abgeschlossene** Wochen (Ende in der Vergangenheit) —
  geplante Zukunft löst es nicht fälschlich aus.
- Fortschritts-Punkte je Azubi, rechte Abteilungs-Palette mit Kapazität.
- Neue Verwaltung `/sperrzeiten` (Rolle Admin/Ausbilder): Berufsschulplan,
  Urlaub/Prüfung, Abteilungssperren anlegen/löschen — wirkt sofort im Planer.

### Azubi: „Meine Seite"
**Was:** Eigene Ansicht für Azubis (`/meine-seite`, Rolle Azubi).

- Tabs **Übersicht / Kalender / Noten**.
- Read-only Wochen-Zeitleiste (eigene Einsätze + Berufsschule/Urlaub/Prüfung).
- „Mein Fortschritt" (gleiche 3 Balken-Zustände wie das Profil).
- „Anstehend"-Liste (Versetzung/Berufsschule/Urlaub).
- **Noten** anlegen/auflisten/löschen über das `Grade`-Modell (inkl. Schnitt).
- Bewusst zurückgestellt: **Zeugnis-Upload** (nur Hinweis „folgt"),
  **Urlaub beantragen** (Button sichtbar, deaktiviert), **Ausbilder-
  Benachrichtigung** bei Noteneingabe (TODO in `actions.ts`).

### Branding: Maerix-Logo
- Bildmarke + Wortmarke in der Sidebar, volles Logo auf der Login-Seite,
  Bildmarke als Favicon (`src/app/icon.svg`).
- Assets unter `public/maerix-logo.svg` und `public/maerix-mark.svg`.

---

## Bis 2026-06-19 (Stand beim Pull)
Gerüst: Next.js 16 + Prisma 7 + PostgreSQL, Auth.js v5 (Login/Rollen,
Mandantentrennung), App-Shell mit rollenabhängiger Navigation, erste
Azubi-Verwaltung und der visuelle Einsatzplaner (Drag & Drop, Monat/Woche/Tag).
Details siehe Git-Historie bis Commit `a413e9b`.
