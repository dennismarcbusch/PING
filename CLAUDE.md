# PING – SCORM-Lernmodule (ByCS)

Interaktive SCORM-1.2-Pakete für die Fachinformatik-Einstiegsklasse (Plattform: ByCS). Ein Modul = ein Paket (`imsmanifest.xml` + `index.html`), selbstgesteuert, tablettauglich. Struktur, Namen und Build: siehe `README.md`.

Projektnotiz im Brain: 10-Projekte/ByCS-Lernmodule

## Konventionen
- Look und Aufbau: Skill `bycs-lernmodul` (Entdecken / Üben / Lernzielkontrolle), Quellen in `tools/bycs-lernmodul`.
- Pro Paket `packages/<name>/` mit `README.md` (Steckbrief) und `src/`; ZIPs nur per `./build.sh` nach `dist/`, nicht einchecken.
- Manifest-Identifier mit Präfix `ping-`.
- Keine personenbezogenen Daten von Schülern.
