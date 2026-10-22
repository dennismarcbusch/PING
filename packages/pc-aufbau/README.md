# SCORM-Paket „Aufbau eines modernen PCs“

Stand: 16.10.2026 · SCORM 1.2 · ein Paket (index.html + imsmanifest.xml), selbstgesteuert · Zielgruppe: Fachinformatik-Einstiegsklasse

## Leitidee
PC zerlegen → wieder zusammenbauen → anderen PC nach Kundenauftrag bauen. Teile per Drag & Drop oder per Antippen (erst Teil, dann Platz – tablettauglich).

## Darstellung
3D-Schrägbild ins offene Gehäuse (Blick schräg von vorne-links-unten): Bauteile als Körper mit Tiefe. Sichtbar sind RAM-Module von der Seite, die Lüfter an der Unterseite der Grafikkarte, Kühlerlüfter, Frontlüfter und die Rückwand mit I/O, Slotblechen und Netzteilbuchse. Werkbank und Hotspot-Fragen zeigen das Mainboard stärker geneigt, damit Slots, Kühlkörper und Stecker plastisch wirken.

## Lernziele
- LZ1 Komponenten erkennen (auch in anderer Bauform)
- LZ2 Funktionen beschreiben
- LZ3 Steckplätze & Anschlüsse zuordnen
- LZ4 Sicher & in sinnvoller Reihenfolge (Strom, ESD, Wärmeleitpaste, Airflow)
- LZ5 Kompatibilität nach Kundenauftrag (Sockel, DDR/DIMM, Formfaktor, GPU-Länge, Netzteil)

## Aufbau
- ① Entdecken: Midi-Tower (ATX, Tower-Luftkühler). 11 Bauteile mit Steckbrief untersuchen und ausbauen, Abhängigkeiten (Netzkabel → Seitenteil → Kabel → GPU → M.2 darunter; Kühler → RAM/CPU …). Danach Mainboard-Werkbank mit 15 Details. Steckbrief-Tabelle füllt sich.
- ② Üben: geführter Zusammenbau in 7 Aufgaben (Netzteil, Mainboard, CPU, RAM Dual-Channel A2/B2, Kühler + Wärmeleitpaste, SSD & GPU, Verkabelung/Lüfter/Start mit POST). Kundenauftrag zufällig (AM5/LGA1851, GPU-Länge, Netzteil-W), je Kategorie Fehlteile mit Begründung, 3 gestufte Tipps, Reflexionsfrage.
- ③ Kompetenznachweis: weißes Kompaktgehäuse, Micro-ATX mit anderem Layout (M.2 über der GPU), AIO-Wasserkühlung mit Radiator unter der Decke, Blower-Grafikkarte, RGB-RAM, Bauteile ohne Namen. Teil A: 21 Prüfpunkte, freie Reihenfolge, keine Tipps. Teil B: 12 Fragen aus Pool von 41 (2/4/2/2/2 je LZ; MC, Bild, Hotspot, Zuordnen, Zahl). A und B je 50 %, bestanden ab 70 %.

## Entscheidungen
- Grafikkarten generisch („Grafikkarte A/B/C“ mit Länge/Watt), CPUs real (Ryzen 7 9700X, Core Ultra 7 265K + Fehlteile AM4/LGA1700).
- Im Nachweis wirken sich Fehler im POST aus (Single-Channel, Überhitzung ohne Paste, Wärmestau) statt direkt erklärt zu werden.
- SCORM: score.raw = bestes Ergebnis, lesson_status passed/failed, masteryscore 70, Fortschritt in suspend_data, Name aus cmi.core.student_name vorbelegt; Ergebnis druckbar als PDF.
