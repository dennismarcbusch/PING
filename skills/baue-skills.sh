#!/usr/bin/env bash
# Baut das Skill-Set: verteilt die gemeinsame Referenz in alle Skills, setzt den
# Gesamt-Skill „lernpaket“ aus den fünf Einzel-Skills zusammen und packt jeden
# Skill als ZIP zum Hochladen in Claude: dist/skill_<name>.zip
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

# Gesamt-Skill „lernpaket“: SKILL.md (Wegweiser) ist von Hand gepflegt, alles andere
# wird hier aus den fünf Einzel-Skills erzeugt (nicht von Hand ändern, nicht eingecheckt).
G=lernpaket
[ -f "$G/SKILL.md" ] || { echo "FEHLER: $G/SKILL.md fehlt" >&2; exit 1; }
rm -rf "$G/phasen" "$G/referenz" "$G/vorlagen" "$G/vorlage" "$G/vorlagen-lehrkraft" "$G/scripts"
mkdir -p "$G/phasen" "$G/scripts"
cp -r _gemeinsam "$G/referenz" && rm -rf "$G/referenz/scripts"
cp -r lernpaket-planen/vorlagen "$G/vorlagen"
cp -r lernpaket-bauen/vorlage "$G/vorlage"
cp -r lernpaket-bauen/vorlagen-lehrkraft "$G/vorlagen-lehrkraft"
cp lernpaket-bauen/scripts/paket.py _gemeinsam/scripts/pruefe_paket.py lernpaket-auswerten/scripts/auswerten.py "$G/scripts/"
python3 - "$G" <<'PY'
import re, sys
G = sys.argv[1]
PHASEN = [('lernpaket-planen', 'planen', 'Planen'), ('fragenpool-erstellen', 'fragen', 'Fragen'),
          ('lernpaket-bauen', 'bauen', 'Bauen'), ('lernpaket-pruefen', 'pruefen', 'Prüfen'),
          ('lernpaket-auswerten', 'auswerten', 'Auswerten')]
ZIEL = {alt: (datei, name) for alt, datei, name in PHASEN}
NAMEN = '|'.join(re.escape(a) for a, _, _ in PHASEN)
def verweis(m):
    datei, name = ZIEL[m.group(2)]
    return ('(' if m.group(1) else '') + f'Phase „{name}“ (`phasen/{datei}.md`)'
for alt, datei, name in PHASEN:
    t = open(f'{alt}/SKILL.md', encoding='utf-8').read()
    t = re.sub(r'\A---\n.*?\n---\n+', '', t, flags=re.S)
    t = re.sub(r'`<skill>` steht (?:unten )?für den Ordner, in dem diese SKILL\.md liegt\.',
               '`<skill>` steht für den Ordner des Skills `lernpaket` (dort liegt die SKILL.md mit dem Wegweiser); alle Pfade sind relativ dazu.', t)
    t = re.sub(r'\(Skill `(' + NAMEN + r')`\)', lambda m: f'(Phase „{ZIEL[m.group(1)][1]}“, `phasen/{ZIEL[m.group(1)][0]}.md`)', t)
    t = re.sub(r'(\()?(?:den |dem )?(?:Skill )?`(' + NAMEN + r')`', verweis, t)
    rest = re.findall(NAMEN, t)
    assert not rest, f'{alt}: Verweis nicht umgeschrieben: {rest}'
    kopf = f'<!-- Phase {name} des Skills „lernpaket“. Erzeugt von skills/baue-skills.sh aus skills/{alt}/SKILL.md – nicht von Hand ändern. -->\n\n'
    open(f'{G}/phasen/{datei}.md', 'w', encoding='utf-8').write(kopf + t)
print('Gesamt-Skill lernpaket zusammengesetzt (5 Phasen).')
PY
SKILLS+=("$G")

for s in "${SKILLS[@]}"; do
  out="$DIST/skill_${s}.zip"
  rm -f "$out"
  zip -r -X -q "$out" "$s" -x '*/__pycache__/*' '*.pyc' '*/.DS_Store'
  echo "OK  $out ($(du -h "$out" | cut -f1))"
done
