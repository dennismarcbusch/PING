#!/usr/bin/env bash
# Baut aus packages/<name>/src ein SCORM-ZIP: dist/<name>_scorm12.zip
# Aufruf: ./build.sh            (alle Pakete)
#         ./build.sh pc-aufbau  (nur ein Paket)
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p dist
slugs=("$@")
[ ${#slugs[@]} -eq 0 ] && mapfile -t slugs < <(ls packages)
for p in "${slugs[@]}"; do
  src="packages/$p/src"
  [ -f "$src/imsmanifest.xml" ] || { echo "FEHLER: $src/imsmanifest.xml fehlt (muss im Wurzelverzeichnis des Pakets liegen)" >&2; exit 1; }
  out="$PWD/dist/${p}_scorm12.zip"
  rm -f "$out"
  (cd "$src" && zip -r -X -q "$out" .)
  unzip -l "$out" | awk '{print $4}' | grep -qx imsmanifest.xml \
    || { echo "FEHLER: imsmanifest.xml nicht im ZIP-Wurzelverzeichnis ($p)" >&2; exit 1; }
  echo "OK  $out ($(du -h "$out" | cut -f1))"
done
