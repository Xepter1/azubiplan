# Änderungsprotokoll

Nachvollziehbare Notizen zu jedem größeren Arbeitsschritt. Neueste Einträge oben.
Format lose angelehnt an [Keep a Changelog](https://keepachangelog.com/de/).

---

## 2026-06-30 — Azubi-Ansicht in 3 Reiter geteilt + Profil/Notenspiegel

Die Azubi-Ansicht „Meine Seite" wurde durch **drei eigene Sidebar-Punkte** ersetzt;
das Profil ist jetzt eine gemeinsame Komponente für Ausbilder und Azubi.

### Azubi: Mein Profil / Kalender / Noten
- `/meine-seite` entfernt. Neue Punkte (nur Rolle AZUBI): **Mein Profil**
  (`/mein-profil`), **Kalender** (`/mein-kalender`), **Noten** (`/meine-noten`).
- Azubi hat kein Dashboard/keine Beurteilungen mehr in der Sidebar; Login landet
  per Redirect auf `/mein-profil`.
- **Mein Profil** nutzt dieselbe Komponente wie das Ausbilder-Profil
  (`auszubildende/azubi-profil-view.tsx`, `AzubiProfilView`) — read-only (Klasse
  nur lesbar). Beide Profilseiten sind jetzt dünne Wrapper.
- **Kalender**: Zeitleiste mit Umschaltung **Tag/Woche/Monat** (Spalten
  clientseitig), Einsätze + Berufsschule/Urlaub/Prüfung; darunter „Mein Urlaub"
  (statt Sperrzeiten) + deaktivierter „Urlaub beantragen".
- **Noten**: eigene Seite, Liste + Ø + „+ Note / Zeugnis" (Fach-Dropdown der
  Klasse; Zeugnis-Upload weiterhin als Hinweis „folgt"). Speichern aktualisiert
  auch den Ø im Profil.

### Notenspiegel im Profil = echte Durchschnitte
- Statt Platzhalter (Fachtheorie/Praxis/WiSo) jetzt **Ø gesamt + je Fach** aus den
  echten Noten. Gilt für Ausbilder- UND Azubi-Profil.

### Beauftragter ohne Dashboard
- Auch der Ausbildungsbeauftragte hat kein Dashboard mehr (Redirect auf
  `/meine-abteilung`). Zweiter zu-bewertender Azubi in der Mechanischen Fertigung
  ergänzt; Bewertung für Leons abgeschlossene Station, damit „Bewertung · gut"
  im Profil neben dem vollen Balken erscheint.

### Bewusst zurückgestellt
- Zeugnis-Datei-Upload, „Urlaub beantragen", Ausbilder-Benachrichtigung bei Noten,
  harte serverseitige Rollensperre je Route (weiterhin Nav-basiert).

---

## 2026-06-27 — Ausbildungsbeauftragten-Ansicht „Meine Abteilung"

Eigene Ansicht für Ausbildungsbeauftragte: wer gerade in der Abteilung ist/ansteht,
Bewertungsbögen für beendete Stationen und Sperrzeiten für die eigene Abteilung.

### Datenmodell
- `Evaluation` um die vier Bewertungskriterien erweitert (`fachlich`,
  `selbststaendigkeit`, `sorgfalt`, `teamverhalten`, je 1–5 Sterne, 5 = beste) plus
  `submittedAt` (null = Entwurf, gesetzt = abgeschickt). `bewertung` (1–6, 1 = beste)
  wird beim Abschicken aus den Sternen abgeleitet und speist das Azubi-Profil.
- Migration `20260627074541_evaluation_bogen`.

### Reiter „Meine Abteilung" (Rolle Ausbildungsbeauftragte:r)
- Route `/meine-abteilung`; Abteilung kommt aus `User.departmentId`.
- Kalenderstrahl mit Umschaltung **Tag / Woche / Monat** (Spalten clientseitig gebaut).
- Azubi-Liste mit Status: läuft / Station beendet → „Bewerten" / geplant / bewertet.
- Bewertungsbogen (4 Sterne-Kriterien + Bemerkung) mit **Zwischenspeichern** (Entwurf)
  und **Abschicken**; abgeschickt erscheint die Note im Azubi-Profil.
- Button **„Sperrzeit hinzufügen"** legt einen `DepartmentBlock` für die eigene
  Abteilung an — sichtbar auch unter `/sperrzeiten` (Admin/Ausbilder).
- Kein Dashboard (bewusst weggelassen). Der Reiter „Auszubildende" wurde dem
  Beauftragten entzogen — er sieht Azubis nur noch über seine Abteilung.

### Seed
- Demo-Einsätze in der Mechanischen Fertigung (läuft / beendet / anstehend) und
  bestehende Bewertungen als „abgeschickt" markiert (inkl. Sterne-Kriterien).

### Bewusst zurückgestellt
- Benachrichtigung von Azubi + Ausbilder beim Abschicken (TODO in `actions.ts`).
- Anzeige aller vier Einzelkriterien im Azubi-Profil (zeigt weiter die Gesamt-Note).
- Harte serverseitige Rollensperre je Route (aktuell Nav-basiert; kommt mit RLS).

---

## 2026-06-26 — Schulklassen, Fächer & klassenbasierte Noten/Berufsschule

Klassen (= Beruf + Jahrgang) als neue Klammer: Sie bündeln die **Fächer** (für die Noten)
und die **Berufsschulwochen** — weil sich der Lehrplan von Jahrgang zu Jahrgang ändern
kann. Anders als bisher ist hier das **Datenmodell erweitert** (neue Migration
`…_school_classes_subjects`); die lokale Demo-DB wurde dafür einmal frisch aufgesetzt.

### Datenmodell
- Neue Modelle: `SchoolClass` (Beruf + `jahrgang`), `Subject` (Fach, pro Mandant
  wiederverwendbar), `ClassSubject` (Klasse ↔ Fach, n:m).
- `Apprentice.classId` — ein Azubi gehört zu einer Klasse.
- `Grade.fach` (Freitext) → `Grade.subjectId` (FK auf `Subject`).
- `SchoolBlock`: `professionId` + `ausbildungsjahr` → `classId` (Berufsschulwoche je Klasse).

### Reiter „Klassen" (Admin/Ausbilder)
- `/klassen`: Klasse anlegen (Name, Beruf, Jahrgang) mit **„Fächer aus … übernehmen"**
  (kopiert die Fächerliste einer Vorlage-Klasse — z. B. *Mechatronik 2027* aus *2026*).
- `/klassen/[id]`: Fächer zuweisen (find-or-create + Chips, Wiederverwendung über Berufe),
  Berufsschulwochen anlegen/löschen, Azubis der Klasse. Actions in `klassen/actions.ts`.

### Azubi → Klasse + Noten
- Azubi-Profil: Klasse per Dropdown setzen (nur Klassen des passenden Berufs).
- „Meine Seite": Noten-Eingabe als **Dropdown der Klassen-Fächer** statt Freitext;
  `addGrade` prüft serverseitig, dass das Fach zur Klasse des Azubis gehört.

### Berufsschulwochen klassenbasiert (Planer + Sperrzeiten)
- Regel-Engine (`planner-rules.ts`): Die Berufsschul-Regel matcht über `apprenticeClass`
  statt Beruf + Lehrjahr; `planner.tsx` / `einsatzplanung/page.tsx` reichen `classId` durch.
- Der Berufsschulplan ist aus `/sperrzeiten` in die Klassen-Ansicht gezogen; Sperrzeiten
  behält Urlaub/Prüfung + Abteilungssperren.

### Seed
- 7 Klassen (u. a. *Fachinformatik 2023/2024/2025* — 2025 mit Extra-Fach „KI & Data
  Science" als Demo für den Jahrgangs-Unterschied), 13 Fächer; Azubis zugeordnet,
  Noten auf Fächer, Berufsschulwochen an Klassen.

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
