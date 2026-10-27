---
name: lernpaket-bauen
description: Baut ein SCORM-1.2-Lernpaket für die ByCS-Lernplattform aus Drehbuch und Fragenpool mit der PING-Vorlage – einheitlicher Look, Nachweis ab 80 %, Merkblatt. Erst Prototyp, dann Ausbau.
---

# Lernpaket bauen (Phase 4 des Leitfadens)

Du baust aus Drehbuch und Fragenpool ein fertiges SCORM-1.2-Paket (ZIP), das die Lehrkraft in die ByCS-Lernplattform hochlädt. Grundlage ist die **PING-Vorlage** in `vorlage/`: Sie enthält die Engine, die die technischen und didaktischen Muss-Bausteine bereits umsetzt. Du schreibst nur den Inhalt (`js/inhalt.js`) und die paketspezifischen Interaktionen.

**Lies vor dem Start:** `referenz/fragenformat.md` (Inhaltsformat), `referenz/gestaltung.md` (Gestaltungsregeln, v. a. „Orientierung“ und „Aufgaben“), `referenz/technik.md`. Sieh dir `vorlage/js/inhalt.js` an – das Beispielpaket „Bits & Bytes“ zeigt jedes Feld.

`<skill>` steht unten für den Ordner, in dem diese SKILL.md liegt.

## Was die Vorlage schon kann (nicht neu bauen)

Start mit Leitsituation, Ablauf, Lernzielen und Selbsteinschätzung · freiwilliger Vorwissens-Check mit Überspring-Empfehlung · Stationen mit Auftrag, Leitfrage, aufklappbarem Lösungsbeispiel, Steckbrief-Seitenleiste und Kurz-Check („zählt nicht“) · Übungen mit drei gestuften Tipps und Reflexion mit Musterantwort · Nachweis mit Teil A (Handlungsaufgabe) und Teil B (gezogen und gemischt, 2 je Lernziel), Bestehen ab 80 %, bestes Ergebnis zählt · Abschluss mit Auswertung je Lernziel, Empfehlung, Selbsteinschätzung nachher, Merkblatt zum Ergänzen mit PDF und Selbsttest, Ergebnis-PDF · genau ein Weiter-Knopf je Ansicht, Fortschrittsanzeige nach Teilen und Lernzielen · SCORM 1.2 (score, status, objectives je Lernziel, interactions je Frage, suspend_data, Name) · läuft ohne Lernplattform · Tablet und Tastatur.

**`js/engine.js` und `css/stil.css` nicht verändern.** Sie sorgen dafür, dass alle Pakete gleich aussehen und sich gleich bedienen. Fehlt eine Funktion, löse sie in `inhalt.js` (z. B. als Interaktion) und notiere den Wunsch für die Pflege der Vorlage.

## Ablauf

### 0. Voraussetzungen prüfen

Drehbuch (`drehbuch.md`) und Fragenpool sollten vorliegen. Fehlen sie, schlage vor, zuerst `lernpaket-planen` bzw. `fragenpool-erstellen` zu nutzen. Bei kleinen Lücken fragst du gezielt nach.

### 1. Paket anlegen

```bash
python3 <skill>/scripts/paket.py neu <arbeitsordner>/<name> --id ping-<name> --titel "Titel"
```

### 2. Prototyp: eine Station, zwei Fragen

Ersetze den Beispielinhalt in `js/inhalt.js` durch: Titel, Figur, Leitsituation, alle Lernziele, **Station 1 vollständig** (inkl. Interaktion und Lösungsbeispiel) und ihren Kurz-Check. Die übrigen Teile dürfen noch fehlen; die rote Box „Hinweis für Autor:innen“ zeigt dann, was noch fehlt – das ist im Prototyp normal.

Teste (Schritt 5; im Prototyp sind rote Punkte zu Nachweis und Datenübergabe erwartbar, alles andere muss grün sein), baue das ZIP (Schritt 6) und gib es der Lehrkraft mit der Bitte, es auszuprobieren: `index.html` im entpackten Ordner per Doppelklick im Browser öffnen oder das ZIP in einen Testkurs laden. Frage nach Rückmeldung in normaler Sprache: Was ist unklar, zu lang, zu schwer, sieht falsch aus?

### 3. Ausbau

Nach der Rückmeldung alle Stationen, Übungen, den Nachweis (Teil A als Interaktion, Teil B aus dem Pool), Merkblatt, Selbsttest und Vorwissens-Check ergänzen.

Beim Schreiben der Texte:

- Jede Station und Übung beginnt mit einem **Auftrag aus der Leitsituation** („Frau Maier bittet dich …“), nicht mit „Aufgabe 3“.
- Sichtbarer Text kurz (2–5 Sätze), Ausführliches in `vertiefung` oder `steckbrief`. **Bild vor Text**, Beschriftungen direkt im Bild, für Einsteiger einfache Skizzen statt Fotos.
- Lösungsbeispiel mit Begründung je Schritt (`warum`).
- Hervorhebungen sparsam (`<b>`), Farben nur über Variablen (`var(--accent)` ist für Handlungsaufforderungen reserviert).
- Übungen in **anderen** Situationen als die Stationen; Tipps in drei Stufen (Denkanstoß, Teillösung, Lösung mit Begründung).
- Nachweis Teil A: neue Situation, keine Rückmeldung während der Bearbeitung; Prüfpunkte je Lernziel in `auswerten()`.

### 4. Interaktionen schreiben

Vertrag und Regeln stehen in `referenz/fragenformat.md` („Interaktionen“). Kurz:

- `function (box, api) { …; return { loesen, auswerten } }` – `loesen()` ist **Pflicht** (setzt die Musterlösung, der automatische Test braucht es), `auswerten()` nur in Teil A.
- Bedienung mit `<button>`-Elementen (Tastatur), **Antippen statt nur Ziehen**, große Ziele (mind. 40 px).
- Grafiken als Inline-SVG, Beschriftungen im Bild; keine externen Dateien, Schriften, Bibliotheken oder CDNs; keine `alert/confirm/prompt`.
- Rückmeldung nach jedem Versuch mit Begründung (`api.meldung`), Erfolg mit `api.erledigt('…')`.
- Wiederverwendbare Bausteine (wie `bitSchalter` im Beispiel) oben in `inhalt.js` definieren.

### 5. Testen

```bash
python3 <skill>/scripts/pruefe_paket.py <paketordner> --bilder <ordner-fuer-screenshots>
```

Das Skript prüft Manifest, masteryscore 80, externe Verweise, JavaScript-Syntax, Inhalt (Mengen, Feedback, IDs), **löst alle Stationen, Übungen und den Nachweis mit der Musterlösung**, prüft die Datenübergabe an einen nachgebauten SCORM-Player, den Wiedereinstieg, Konsolenfehler, Tablet- und Handy-Breite und den einen Weiter-Knopf.

- Alle roten Punkte beheben. Gelbe Hinweise beheben oder der Lehrkraft begründen.
- **Sieh dir die Screenshots selbst an** (Fünf-Sekunden-Test: Ist sofort klar, was zu tun ist und wo es weitergeht? Ist nichts abgeschnitten?).
- Ist Playwright nicht installiert, versuche `pip install playwright && playwright install chromium`; klappt das nicht, sag der Lehrkraft, dass der Browser-Test fehlt, und bitte sie, das Paket einmal komplett durchzuspielen.
- Rechnungen, Musterlösungen und Zuordnungen fachlich gegenprüfen (bei Zahlen mit Code nachrechnen).

### 6. ZIP bauen und übergeben

```bash
python3 <skill>/scripts/paket.py zip <paketordner>
```

Das aktualisiert die Dateiliste im Manifest, übernimmt Titel, ID und Bestehensgrenze aus `inhalt.js` und legt `<name>_scorm12.zip` neben den Ordner. Gib der Lehrkraft das ZIP und diese Hinweise:

1. In der ByCS-Lernplattform im Kurs eine Aktivität **„Lernpaket“** (SCORM) anlegen und das ZIP hochladen.
2. Empfohlene Einstellungen: Bewertungsmethode „Höchste Bewertung“, Versuche unbegrenzt, Anzeige in neuem Fenster oder mindestens 1000 px breit.
3. Vor dem ersten Einsatz einmal mit einem Schülertestkonto durchspielen (Punktzahl kommt an?).
4. Danach: Review durch eine Kollegin oder einen Kollegen (Skill `lernpaket-pruefen`) und Test mit drei bis fünf Schülern.

Wenn im PING-Repository gearbeitet wird: Quellen nach `packages/<name>/src/`, Steckbrief nach `packages/<name>/README.md`, Planung nach `packages/<name>/planung/`; ZIPs nicht einchecken (`./build.sh` baut sie).

## Änderungen an bestehenden Paketen

Version in `inhalt.js` erhöhen, Änderung im Steckbrief notieren, Fragen-IDs beibehalten (geänderte Frage = neue ID), danach Schritte 5 und 6.

## Grenzen

Fachliche Richtigkeit verantwortet die Lehrkraft; markiere Unsicheres ausdrücklich. Keine echten Schülerdaten, keine echten Firmennamen, keine Tracking- oder Fremddienste.
