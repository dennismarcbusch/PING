---
name: lernpaket-pruefen
description: Prüft ein SCORM-Lernpaket gegen Checkliste und Prinzipien des PING-Leitfadens – Technik-Test, Lösbarkeit, Didaktik, Bedienung, Barrierefreiheit. Ergebnis ist ein Prüfbericht mit Ampel.
---

# Lernpaket prüfen (Phase 5 des Leitfadens)

Du prüfst ein fertiges oder fast fertiges Lernpaket (ZIP oder Ordner) und schreibst einen Prüfbericht, mit dem die Lehrkraft und eine zweite Lehrkraft (Review) arbeiten können. Du prüfst Pakete aus der PING-Vorlage genauso wie ältere oder fremde SCORM-Pakete.

**Lies vor dem Start:** `referenz/checkliste.md` (Qualitätscheckliste, Teil C6), `referenz/prinzipien.md` (Prüffragen P1–P13), `referenz/gestaltung.md` (Abschnitt „Orientierung“), `referenz/technik.md`.

`<skill>` steht für den Ordner, in dem diese SKILL.md liegt.

## Ablauf

### 1. Automatischer Test

```bash
python3 <skill>/scripts/pruefe_paket.py <paket.zip oder ordner> --bilder <ordner> --bericht technik.json
```

- Bei Paketen aus der Vorlage (erkennbar an `js/engine.js` bzw. `window.LERNPAKET`) spielt das Skript alle Stationen, Übungen und den Nachweis mit der Musterlösung durch und prüft die Datenübergabe.
- Bei anderen Paketen prüft es Format, Datenübergabe im Code, Laden, Anmeldung, Darstellung und Konsolenfehler. Dann spielst du das Paket zusätzlich selbst durch (Playwright: Start, eine Station, eine Übung, Nachweis abgeben) oder bittest die Lehrkraft darum.
- Fehlt Playwright: `pip install playwright && playwright install chromium` versuchen; sonst `--ohne-browser` und im Bericht vermerken, was nicht getestet wurde.

### 2. Bildschirme ansehen

Sieh dir die Screenshots an und mache für jede Ansicht den **Fünf-Sekunden-Test**: Was ist hier zu tun, wo geht es weiter? Achte auf: genau ein hervorgehobener nächster Schritt, Auftrag oben, alles für die Aufgabe gleichzeitig sichtbar, Beschriftung im Bild statt Legende, keine Deko, Feedback an der Antwort, nichts abgeschnitten auf Tablet-Breite.

### 3. Inhalt lesen

Lies `js/inhalt.js` (bzw. die Texte in `index.html`) und beantworte jede Prüffrage P1–P13 und jeden Punkt der Checkliste mit Befund und Fundstelle. Besonders:

- **P1/P4:** Beginnt jede Station und Übung mit einem Auftrag aus der Leitsituation? Gibt es eine Leitfrage und Rückmeldung?
- **P3:** Lösungsbeispiel vor jedem neuen Aufgabentyp, mit Begründung je Schritt und Frage zum Selbsterklären, überspringbar? Gibt es Aufträge zum Mitdenken (skizzieren, zusammenfassen, erklären)?
- **P6:** Hat jede Falschantwort ein eigenes Feedback, das eine Fehlvorstellung anspricht? Stichprobe von mindestens zehn Fragen, bei kleinen Pools alle.
- **P8:** Jedes Lernziel mit mindestens zwei Fragen oder Prüfpunkten im Nachweis; Lernziele in Schülersprache; nichts geprüft, was nicht geübt wurde.
- **P2/P10:** Hilfe nimmt ab, Situationen wechseln, Wiederholungsfragen ab Station 3, gemischter Nachweis.
- **P11/P13:** Selbsteinschätzung vorher/nachher, Fortschritt, Reflexion mit Musterantwort, Empfehlung; Merkblatt erst nach dem Nachweis.
- **Bestehensgrenze 80 %**, beliebig oft wiederholbar, bestes Ergebnis zählt.

### 4. Barrierefreiheit (Stichprobe)

Mit Playwright: Lässt sich eine Station mit der Tabulatortaste und Enter bedienen? Haben Bilder bzw. SVGs eine Beschreibung (`aria-label`, `alt`)? Wird Information nur über Farbe oder nur über Ton vermittelt? Haben Ton und Video Untertitel oder ein Transkript? Bleibt die Darstellung bei 200 % Zoom nutzbar?

Sprache und Deutsch als Zweitsprache: Gibt es ein Glossar, werden die wichtigsten Begriffe vorab vorgestellt, sind die Sätze kurz? Lange Schachtelsätze und unerklärte Fachwörter nennst du mit Fundstelle.

### 5. Fachliche Punkte

Du darfst Auffälligkeiten melden (z. B. eine Rechnung, die nicht stimmt, eine veraltete Angabe), **hakst den Punkt „Fachlich geprüft“ aber nie selbst ab**. Das ist Aufgabe einer Fachlehrkraft. Rechnungen und Musterlösungen prüfst du mit Code nach.

## Prüfbericht (Ergebnis)

Als Markdown-Datei `pruefbericht-<name>.md`:

1. **Kopf:** Paket, Version, Datum, geprüfte Quelle, was nicht geprüft werden konnte.
2. **Gesamtampel:** 🔴 wenn ein Muss-Punkt nicht erfüllt ist, 🟡 wenn nur Soll-Punkte offen sind oder Muss-Punkte nicht prüfbar waren, 🟢 sonst.
3. **Die drei wichtigsten Änderungen** – konkret und mit Fundstelle („Station 2: Auftrag ergänzen, z. B. …“).
4. **Tabelle Muss-Punkte** (aus der Checkliste): Punkt · Ampel · Befund · Fundstelle · Vorschlag.
5. **Tabelle Soll-Punkte**, gleiche Spalten.
6. **Technik-Test:** Ergebnis des Skripts, zusammengefasst.
7. **Offen für Menschen:** fachliche Prüfung durch eine Fachlehrkraft, Review durch eine zweite Lehrkraft, Test mit drei bis fünf Schülern, Test in der echten ByCS-Lernplattform.

Formuliere Befunde sachlich und als Vorschlag, nicht als Urteil über die Kollegin oder den Kollegen. Ältere Pakete, die vor dem Leitfaden entstanden sind, bekommen dieselben Maßstäbe; weise dann darauf hin, welche Abweichungen mit wenig Aufwand zu beheben sind (z. B. masteryscore) und welche einen größeren Umbau bräuchten.

**Nächster Schritt:** Änderungen mit `lernpaket-bauen` umsetzen und erneut prüfen.
