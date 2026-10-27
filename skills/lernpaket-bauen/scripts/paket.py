#!/usr/bin/env python3
"""Werkzeug zum Bauen von Lernpaketen aus der PING-Vorlage.

  python3 paket.py neu <zielordner> --id ping-<name> --titel "Titel"
      Kopiert die Vorlage (Engine, Stil, Beispielinhalt, Manifest) in einen neuen Ordner
      und setzt Identifier und Titel im Manifest. Danach js/inhalt.js ersetzen.

  python3 paket.py zip <paketordner> [--aus <datei.zip>]
      Aktualisiert die Dateiliste im Manifest, gleicht Titel und masteryscore mit
      js/inhalt.js ab und packt das ZIP so, dass imsmanifest.xml im Wurzelverzeichnis liegt.
      Standardname: <name>_scorm12.zip neben dem Paketordner.
"""
import argparse, os, re, shutil, sys, zipfile
from xml.sax.saxutils import escape

HIER = os.path.dirname(os.path.abspath(__file__))
VORLAGE = os.path.join(HIER, '..', 'vorlage')


def neu(a):
    if not re.fullmatch(r'ping-[a-z0-9-]+', a.id):
        sys.exit('Die id muss "ping-" plus Kleinbuchstaben, Ziffern und Bindestriche sein, z. B. ping-dreisatz.')
    if os.path.exists(a.ziel) and os.listdir(a.ziel):
        sys.exit(f'Der Ordner {a.ziel} existiert schon und ist nicht leer.')
    shutil.copytree(VORLAGE, a.ziel, dirs_exist_ok=True)
    m = os.path.join(a.ziel, 'imsmanifest.xml')
    t = open(m, encoding='utf-8').read()
    t = re.sub(r'identifier="ping-[^"]*"', f'identifier="{a.id}"', t, count=1)
    t = re.sub(r'<title>[^<]*</title>', f'<title>{escape(a.titel)}</title>', t)
    open(m, 'w', encoding='utf-8').write(t)
    i = os.path.join(a.ziel, 'js', 'inhalt.js')
    s = open(i, encoding='utf-8').read()
    s = re.sub(r"id: 'ping-[^']*'", f"id: '{a.id}'", s, count=1)
    s = re.sub(r"titel: '[^']*'", "titel: " + repr(a.titel), s, count=1)
    open(i, 'w', encoding='utf-8').write(s)
    print(f'Neues Paket in {a.ziel} angelegt (id {a.id}). Als Nächstes js/inhalt.js mit den Inhalten füllen.')


def zippen(a):
    root = os.path.abspath(a.ordner)
    m = os.path.join(root, 'imsmanifest.xml')
    if not os.path.isfile(m):
        sys.exit('imsmanifest.xml fehlt im Paketordner.')
    t = open(m, encoding='utf-8').read()
    inhalt = os.path.join(root, 'js', 'inhalt.js')
    if os.path.isfile(inhalt):
        s = open(inhalt, encoding='utf-8').read()
        b = re.search(r'bestehen:\s*(\d+)', s)
        if b:
            t = re.sub(r'<adlcp:masteryscore>\d*</adlcp:masteryscore>', f'<adlcp:masteryscore>{b.group(1)}</adlcp:masteryscore>', t)
        ti = re.search(r"titel:\s*'((?:[^'\\]|\\.)*)'", s)
        if ti:
            t = re.sub(r'<title>[^<]*</title>', f'<title>{escape(ti.group(1))}</title>', t)
        i = re.search(r"id:\s*'(ping-[^']*)'", s)
        if i:
            t = re.sub(r'(<manifest[^>]*?identifier=")[^"]*"', r'\g<1>' + i.group(1) + '"', t, count=1)
    dateien = []
    for d, _, fs in os.walk(root):
        for f in sorted(fs):
            rel = os.path.relpath(os.path.join(d, f), root).replace(os.sep, '/')
            if rel != 'imsmanifest.xml' and not f.startswith('.') and '__MACOSX' not in rel:
                dateien.append(rel)
    dateien.sort(key=lambda x: (x != 'index.html', x))
    liste = '\n'.join(f'      <file href="{escape(x)}"/>' for x in dateien)
    t = re.sub(r'(<resource\s[^>]*>)(.*?)(\s*</resource>)', lambda mm: mm.group(1) + '\n' + liste + mm.group(3), t, count=1, flags=re.S)
    open(m, 'w', encoding='utf-8').write(t)
    name = re.search(r'<manifest[^>]*identifier="(?:ping-)?([^"]+)"', t).group(1)
    aus = a.aus or os.path.join(os.path.dirname(root), f'{name}_scorm12.zip')
    if os.path.exists(aus):
        os.remove(aus)
    with zipfile.ZipFile(aus, 'w', zipfile.ZIP_DEFLATED) as z:
        z.write(m, 'imsmanifest.xml')
        for x in dateien:
            z.write(os.path.join(root, x), x)
    print(f'ZIP gebaut: {aus} ({os.path.getsize(aus) // 1024} KB, {len(dateien) + 1} Dateien).')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    n = sub.add_parser('neu'); n.add_argument('ziel'); n.add_argument('--id', required=True); n.add_argument('--titel', required=True)
    z = sub.add_parser('zip'); z.add_argument('ordner'); z.add_argument('--aus')
    a = ap.parse_args()
    neu(a) if a.cmd == 'neu' else zippen(a)


if __name__ == '__main__':
    main()
