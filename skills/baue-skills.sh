#!/usr/bin/env bash
# Baut das Skill-Set: verteilt die gemeinsame Referenz in alle Skills und packt
# jeden Skill als ZIP zum Hochladen in Claude: dist/skill_<name>.zip
# Aufruf (im Repo-Wurzelverzeichnis oder hier):  skills/baue-skills.sh
set -euo pipefail
cd "$(dirname "$0")"
SKILLS=(lernpaket-planen fragenpool-erstellen lernpaket-bauen lernpaket-pruefen lernpaket-auswerten)
MIT_PRUEFSKRIPT=(lernpaket-bauen lernpaket-pruefen)
DIST="$(cd .. && pwd)/dist"
mkdir -p "$DIST"

for s in "${SKILLS[@]}"; do
  [ -f "$s/SKILL.md" ] || { echo "FEHLER: $s/SKILL.md fehlt" >&2; exit 1; }
  # Kopf prüfen: name = Ordnername, Beschreibung höchstens 200 Zeichen, keine spitzen Klammern
  python3 - "$s" <<'PY'
import re, sys
s = sys.argv[1]
t = open(f'{s}/SKILL.md', encoding='utf-8').read()
m = re.match(r'---\n(.*?)\n---\n', t, re.S)
assert m, f'{s}: YAML-Kopf fehlt'
k = dict(l.split(':', 1) for l in m.group(1).splitlines() if ':' in l)
name, desc = k.get('name', '').strip(), k.get('description', '').strip()
assert name == s, f'{s}: name im Kopf ist "{name}"'
assert 0 < len(desc) <= 200, f'{s}: Beschreibung hat {len(desc)} Zeichen (höchstens 200)'
assert '<' not in desc and '>' not in desc, f'{s}: Beschreibung enthält spitze Klammern'
PY
  rm -rf "$s/referenz"
  mkdir -p "$s/referenz"
  cp _gemeinsam/*.md "$s/referenz/"
done
for s in "${MIT_PRUEFSKRIPT[@]}"; do
  mkdir -p "$s/scripts"
  cp _gemeinsam/scripts/pruefe_paket.py "$s/scripts/"
done

for s in "${SKILLS[@]}"; do
  out="$DIST/skill_${s}.zip"
  rm -f "$out"
  zip -r -X -q "$out" "$s" -x '*/__pycache__/*' '*.pyc' '*/.DS_Store'
  echo "OK  $out ($(du -h "$out" | cut -f1))"
done
