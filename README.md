# SCORM-Pakete (Projekt PING)

Interaktive SCORM-1.2-Pakete zu Networking- und IT-Grundlagen für Fachinformatiker an der Berufsschule, gedacht für die ByCS-Lernplattform.

## Pakete

| Ordner | Paket | Steckbrief |
|---|---|---|
| `packages/pc-aufbau` | Aufbau eines modernen PCs | ja |
| `packages/netzwerktopologien` | Netzwerktopologien erleben | offen |
| `packages/shell-yeah` | Shell Yeah! – Linux im Terminal | ja |
| `packages/strukturierte-verkabelung` | Strukturierte Verkabelung – Planspiel | offen |

`tools/bycs-lernmodul` enthält den Skill zum Bauen weiterer Module im einheitlichen Look.

## Struktur und Namen

- Pro Paket ein Ordner `packages/<name>/` mit `README.md` (Steckbrief) und `src/` (der entpackte Paketinhalt, `imsmanifest.xml` direkt in `src/`).
- Name = Kleinbuchstaben mit Bindestrichen. ZIP = `<name>_scorm12.zip`.
- Im Repo liegen Quellen, keine ZIPs (`dist/` ist ignoriert).

## ZIPs bauen

```bash
./build.sh                # alle Pakete -> dist/
./build.sh pc-aufbau      # ein Paket
```

Das Skript bricht ab, wenn `imsmanifest.xml` nicht im Wurzelverzeichnis des ZIPs liegt.

## Veröffentlichen

- Tag `v1.0` setzen und pushen: die GitHub Action baut alle Pakete und hängt die ZIPs an ein Release.
- Tag `pc-aufbau-v1.1`: baut nur dieses Paket.

## Neues Paket anlegen

1. `packages/<name>/src/` mit `index.html` und `imsmanifest.xml` anlegen.
2. `packages/<name>/README.md` nach dem Muster der vorhandenen Steckbriefe schreiben.
3. Zeile in die Tabelle oben eintragen.

## Lizenz

Noch festzulegen (Vorschlag: CC BY-SA 4.0 für Inhalte, MIT für Code). Die Schriften in `packages/shell-yeah/src/fonts` stehen unter der Ubuntu Font License (`UFL-LICENSE.txt`).
