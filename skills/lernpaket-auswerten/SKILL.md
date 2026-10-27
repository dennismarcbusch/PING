---
name: lernpaket-auswerten
description: Wertet den Berichtsexport der Lernplattform zu einem Lernpaket aus (ohne Namen) – schwere und zu leichte Fragen, Lernziele, Bestehensquote – und leitet Änderungen nach dem PING-Leitfaden ab.
---

# Lernpaket auswerten (Phase 6 des Leitfadens)

Nach dem Einsatz eines Pakets liest du den Berichtsexport aus der ByCS-Lernplattform und zeigst der Lehrkraft, wo das Paket funktioniert und wo nicht. Daraus leitest du konkrete Änderungen ab. Das ist der letzte Schritt im Kreislauf „Design dein Design“: Pakete werden mit echten Daten besser.

**Lies vor dem Start:** `referenz/prinzipien.md` (für die Begründung der Vorschläge), `referenz/fragenformat.md` (Fragen-IDs).

`<skill>` steht für den Ordner, in dem diese SKILL.md liegt.

## Datenschutz zuerst

- Bitte die Lehrkraft, den Export **ohne Namen** zu erstellen oder Namensspalten vorher zu löschen. Das Skript entfernt Spalten mit Namen, E-Mail-Adressen, Benutzernamen u. Ä. trotzdem sofort.
- Nenne nie Namen oder andere Merkmale einzelner Schüler im Gespräch oder im Bericht, auch wenn sie in der Datei stehen. Werte nur zusammengefasst aus, nie für einzelne Personen.
- Freitexte (z. B. Reflexionsantworten, die die Lehrkraft gesammelt hat) nur ohne Namen; fasse sie nach Themen zusammen, ohne Zitate, die eine Person erkennbar machen.
- Speichere keine Rohdaten mit Personenbezug; arbeite mit der bereinigten Datei.

## Export aus der Lernplattform

In der Aktivität „Lernpaket“ unter **Berichte** gibt es Berichte für Bewertungen, Interaktionen (je Frage) und Lernziele. Am meisten bringt der Bericht mit den **Interaktionen**; dazu der mit den **Lernzielen**. Als CSV oder Excel herunterladen. Weiß die Lehrkraft nicht, wo das ist, beschreibe es so allgemein und bitte um einen Screenshot, falls es nicht klappt. Die Bezeichnungen können je nach Version abweichen.

## Ablauf

1. **Bereinigen und auswerten:**

   ```bash
   python3 <skill>/scripts/auswerten.py <export.csv|xlsx> [weitere] --inhalt <paket>/js/inhalt.js --anonym bereinigt.csv --bericht zahlen.md
   ```

   Das Skript erkennt PING-Fragen-IDs (`N<Versuch>_<Frage-ID>`), Lernziel-Werte (`LZ1` …) und Bewertungen anhand des Inhalts. Erkennt es nichts, sieh dir die bereinigte Datei selbst an und werte mit eigenem Code aus.

2. **Vorsicht bei kleinen Zahlen:** Unter etwa 15 Versuchen nur Tendenzen nennen („deutet darauf hin“). Fragen mit weniger als fünf Antworten nicht bewerten.

3. **Deuten – je Befund eine konkrete Änderung:**

   | Befund | Mögliche Ursache | Änderung |
   |---|---|---|
   | Frage unter 40 % | Frage missverständlich, Thema in der Station zu knapp, Fehlvorstellung nicht aufgegriffen | Frage umformulieren (neue ID) oder Station, Beispiel, Kurz-Check stärken (P3, P5, P6) |
   | Eine Falschantwort wird sehr oft gewählt | verbreitete Fehlvorstellung | Feedback dazu schärfen, Fehlvorstellung im Lösungsbeispiel und auf dem Merkblatt ansprechen |
   | Frage über 95 % | zu leicht, Ratehilfe in den Optionen | Ablenker aus echten Fehlern, Anwendung statt Wiedererkennen (P6, P8) |
   | Lernziel deutlich schwächer als die anderen | Station oder Übung dazu fehlt oder ist zu kurz | zusätzliche Übung in neuer Situation, Wiederholungsfrage in späteren Kurz-Checks (P2, P10) |
   | Bestehensquote sehr niedrig | Nachweis prüft Ungeübtes oder ist schwerer als die Übungen | Abgleich Lernziel – Übung – Nachweis (P8); die Grenze von 80 % bleibt |
   | Bestehensquote nahe 100 % bei wenigen Versuchen | Nachweis zu leicht oder Pool zu klein | Pool vergrößern, Teil A anspruchsvoller |

4. **Bericht** `auswertung-<name>.md`: Datengrundlage (ohne Personen), wichtigste Befunde (höchstens fünf), Tabelle der Fragen und Lernziele aus dem Skript, Änderungsvorschläge mit Prinzip und Aufwand (klein/mittel/groß), offene Fragen an die Lehrkraft („Passt das zu deinem Eindruck aus dem Unterricht?“).

Die Lehrkraft entscheidet, welche Änderungen umgesetzt werden.

**Nächster Schritt:** Änderungen mit `lernpaket-bauen` umsetzen (Version erhöhen, geänderte Fragen bekommen neue IDs), mit `lernpaket-pruefen` prüfen.
