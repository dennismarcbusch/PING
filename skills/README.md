# Skill-Set „Lernpakete nach Leitfaden“

Fünf Skills für Claude, die den [Leitfaden für evidenzbasierte Lernpakete](../docs/leitfaden-lernpakete.md) umsetzen. Jede Phase des Entwicklungsprozesses (Leitfaden Teil C1) hat einen Skill; alle greifen auf dieselbe Referenz zurück. **Anleitung für Kolleginnen und Kollegen:** [docs/skill-set-anleitung.md](../docs/skill-set-anleitung.md).

| Skill | Phase | Ergebnis |
|---|---|---|
| [`lernpaket-planen`](lernpaket-planen/SKILL.md) | 1–3 Klären, Zielen, Entwerfen | Steckbrief, Lernziel-Nachweis-Tabelle, Drehbuch |
| [`fragenpool-erstellen`](fragenpool-erstellen/SKILL.md) | 2–3 | Fragen im Vorlagenformat + Prüftabelle für die Lehrkraft |
| [`lernpaket-bauen`](lernpaket-bauen/SKILL.md) | 4 Bauen | SCORM-1.2-ZIP aus der PING-Vorlage (erst Prototyp) |
| [`lernpaket-pruefen`](lernpaket-pruefen/SKILL.md) | 5 Erproben | Prüfbericht mit Ampel (Checkliste C6, P1–P13, Technik-Test) |
| [`lernpaket-auswerten`](lernpaket-auswerten/SKILL.md) | 6 Auswerten | Auswertung des Berichtsexports (ohne Namen) mit Änderungsvorschlägen |

## Aufbau

```
skills/
  _gemeinsam/              Quelle der gemeinsamen Referenz (wird in jeden Skill kopiert)
    prinzipien.md          13 Prinzipien mit So geht's, Warum, Prüffrage, Belegen
    prozess-und-struktur.md, gestaltung.md, technik.md, checkliste.md   aus Leitfaden C1–C6
    fragenformat.md        Format von js/inhalt.js (Fragen, Stationen, Interaktionen)
    scripts/pruefe_paket.py  automatischer Paket-Test (nachgebauter SCORM-Player, Playwright)
  lernpaket-*/ , fragenpool-erstellen/   die fünf Skills; referenz/ ist eine Kopie, nicht von Hand ändern
  lernpaket-bauen/vorlage/ PING-Vorlage: index.html, css/stil.css, js/engine.js, js/inhalt.js (Beispiel), imsmanifest.xml
  baue-skills.sh           verteilt die Referenz und baut dist/skill_<name>.zip
```

## Pflege

- **Leitfaden geändert?** Die betroffenen Dateien in `_gemeinsam/` anpassen (sie sind Auszüge aus `docs/leitfaden-lernpakete.md`, Prinzipien als Kurzfassung), dann `skills/baue-skills.sh`.
- **Vorlage geändert?** Nach jeder Änderung an `engine.js` oder `stil.css`: `python3 skills/_gemeinsam/scripts/pruefe_paket.py skills/lernpaket-bauen/vorlage` muss komplett grün sein. Die Engine ist für alle Pakete gleich; paketspezifisches gehört in `inhalt.js`.
- **Veröffentlichen:** Der Release-Workflow baut die Skill-ZIPs mit und legt sie ins Release und auf die Pages-Seite.
- Der ältere Skill `tools/bycs-lernmodul` (HTML-Schnipsel für Textseiten, ohne SCORM) ist in `lernpaket-bauen` aufgegangen: Design-Tokens und Komponenten stecken jetzt in `vorlage/css/stil.css`. Er bleibt für reine Einbettungen ohne Bewertung erhalten.

## Vorlage testen

```bash
python3 skills/_gemeinsam/scripts/pruefe_paket.py skills/lernpaket-bauen/vorlage --bilder /tmp/shots
python3 skills/_gemeinsam/scripts/pruefe_paket.py packages/<name>/src     # auch für ältere Pakete
```

Voraussetzung für den Browser-Teil: `pip install playwright && playwright install chromium`.
