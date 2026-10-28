#!/usr/bin/env python3
"""Hält Leitfaden-Markdown und Skill-Referenz synchron.

  python3 skills/leitfaden_sync.py [--export <markdown-export.md|json>]

--export  Markdown-Export des Leitfaden-Dokuments (Claude Docs). Die Datei wird bereinigt
          (eingebettete Grafiken als Textzeile, Links relativ) und nach
          docs/leitfaden-lernpakete.md geschrieben.
Danach werden aus docs/leitfaden-lernpakete.md die Referenzdateien in skills/_gemeinsam/
neu erzeugt (prozess-und-struktur.md, gestaltung.md, technik.md, checkliste.md).
prinzipien.md und fragenformat.md werden von Hand gepflegt. Zum Schluss skills/baue-skills.sh.
"""
import argparse, base64, datetime, json, os, re

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
MD = os.path.join(REPO, 'docs', 'leitfaden-lernpakete.md')
G = os.path.join(HIER, '_gemeinsam')
QUELLE = 'Quelle: Leitfaden „Evidenzbasierte Lernpakete (SCORM) gestalten“, docs/leitfaden-lernpakete.md im PING-Repository.\n\n'
ERSATZ = {
    r'&#91;embedded content: Mayer \(2017\)[^\]]*\\\]': '*(Diagramm mit den Effektstärken der zwölf Mayer-Prinzipien nach Mayer 2017 und der Re-Analyse von Cromley et al.: nur in der Dokumentfassung. Im Mittel g ≈ 0,37.)*',
    r'&#91;embedded content: Entwicklungsprozess[^\]]*\\\]': '*(Ablaufdiagramm: Klären → Zielen → Entwerfen → Prototyp bauen → Erproben → Einsetzen und auswerten, mit Rücksprüngen nach Erprobung und Auswertung; nur in der Dokumentfassung.)*',
}


def export_uebernehmen(pfad):
    roh = open(pfad, encoding='utf-8').read()
    try:
        md = base64.b64decode(json.loads(roh)['data']['bytes_b64']).decode('utf-8')
    except (json.JSONDecodeError, KeyError, TypeError):
        md = roh
    md = re.sub(r'^(Entwurf) · [A-Z][a-z]{2} \d+, (\d{4}) · @(.+)$', lambda m: f'{m.group(1)} · Stand {datetime.date.today():%d.%m.%Y} · {m.group(3)}', md, count=1, flags=re.M)
    for a, b in ERSATZ.items():
        md = re.sub(a, b, md)
    md = md.replace('Durchgezogene Pfeile zeigen den Regelablauf, gestrichelte die Rücksprünge nach Erprobung und Auswertung.\n\n', '')
    md = md.replace('https://github.com/dennismarcbusch/PING/blob/main/docs/', '').replace('https://github.com/dennismarcbusch/PING/tree/main/skills', '../skills')
    if 'embedded content' in md:
        print('Achtung: unbekannte eingebettete Grafik im Export – bitte von Hand ersetzen.')
    open(MD, 'w', encoding='utf-8').write(md)
    print('docs/leitfaden-lernpakete.md aktualisiert.')


def referenz_erzeugen():
    md = open(MD, encoding='utf-8').read()

    def teil(start, ende):
        a = md.index('## ' + start)
        return md[a:md.index('## ' + ende, a + 3)].strip()
    c1 = teil('Teil C1', 'Teil C2')
    c1 = re.sub(r'\*\(Ablaufdiagramm: (.*?); nur in der Dokumentfassung\.\)\*', r'Ablauf: \1.', c1)
    dateien = {
        'prozess-und-struktur.md': ('# Entwicklungsprozess und Paketstruktur', [c1, teil('Teil C2', 'Teil C3')]),
        'gestaltung.md': ('# Gestaltungsregeln, SeGeL und klassischer Unterricht', [teil('Teil C3', 'Teil C4'), teil('Teil C4', 'Teil C5')]),
        'technik.md': ('# Technische Mindeststandards', [teil('Teil C5', 'Teil C6')]),
        'checkliste.md': ('# Qualitätscheckliste', [teil('Teil C6', 'Teil C7')]),
    }
    for name, (titel, teile) in dateien.items():
        open(os.path.join(G, name), 'w', encoding='utf-8').write(titel + '\n\n' + QUELLE + '\n\n'.join(teile) + '\n')
        print('skills/_gemeinsam/' + name + ' erzeugt.')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--export')
    a = ap.parse_args()
    if a.export:
        export_uebernehmen(a.export)
    referenz_erzeugen()
