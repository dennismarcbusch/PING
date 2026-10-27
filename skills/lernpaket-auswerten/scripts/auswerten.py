#!/usr/bin/env python3
"""Wertet einen Berichtsexport der Lernplattform (ByCS/Moodle, Aktivität „Lernpaket“/SCORM) aus.

  python3 auswerten.py <export.csv|export.xlsx> [weitere Dateien] [--inhalt js/inhalt.js]
                       [--anonym anonym.csv] [--bericht auswertung.md] [--bestehen 80]

Schritt 1 – Datenschutz: Spalten mit Namen, E-Mail, Benutzerkennung o. Ä. werden sofort
entfernt und nicht weiterverarbeitet. Mit --anonym wird die bereinigte Tabelle gespeichert.
Schritt 2 – Auswertung (soweit die Daten es hergeben):
  * je Frage: Lösungsquote, Anzahl, häufigste falsche Antworten (Ablenker-Analyse);
    Fragen-IDs der PING-Vorlage haben die Form N<Versuch>_<Frage-ID>, z. B. N2_F07;
  * je Lernziel (cmi.objectives, Spaltenwerte LZ1, LZ2 …): mittlerer Prozentwert;
  * Gesamtbewertung: Verteilung, Bestehensquote.
Markierungen: Lösungsquote unter 40 % = „schwer“ (Frage oder Station prüfen),
über 95 % = „sehr leicht“ (Frage trennt nicht). Das Format der Exporte unterscheidet sich je
nach Bericht; das Skript sucht die Werte deshalb anhand ihres Inhalts, nicht nur der Spaltennamen.
"""
import argparse, collections, csv, io, json, os, re, shutil, statistics, subprocess, sys

PERSON = re.compile(r'(vor-?name|nach-?name|^name$|vollst.*name|full ?name|first ?name|last ?name|surname|e-?mail|benutzer|user(name)?$|login|id-?nummer|id ?number|matrikel|institution|abteilung|department|ip-?adresse|ip address|telefon|phone|adresse|address|stadt|city)', re.I)
ID = re.compile(r'^N(\d+)_([A-Za-z0-9.\-]+)$')
ERG_WORT = {'correct': 1.0, 'richtig': 1.0, 'wrong': 0.0, 'falsch': 0.0, 'incorrect': 0.0}


def lesen(pfad):
    if pfad.lower().endswith(('.xlsx', '.xlsm')):
        try:
            import openpyxl
        except ImportError:
            sys.exit('Für Excel-Dateien wird openpyxl gebraucht: pip install openpyxl')
        wb = openpyxl.load_workbook(pfad, read_only=True, data_only=True)
        zeilen = []
        for ws in wb.worksheets:
            zeilen += [['' if c is None else str(c) for c in r] for r in ws.iter_rows(values_only=True)]
        return zeilen
    roh = open(pfad, 'rb').read()
    for enc in ('utf-8-sig', 'cp1252', 'latin-1'):
        try:
            text = roh.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    try:
        dialekt = csv.Sniffer().sniff(text[:5000], delimiters=',;\t')
    except csv.Error:
        dialekt = csv.excel
    return [r for r in csv.reader(io.StringIO(text), dialekt)]


def anonymisieren(zeilen):
    if not zeilen:
        return zeilen, []
    kopf = zeilen[0]
    weg = [i for i, h in enumerate(kopf) if PERSON.search(str(h).strip())]
    # auch Spalten ohne passenden Namen, deren Inhalt wie E-Mail-Adressen aussieht
    for i in range(len(kopf)):
        werte = [r[i] for r in zeilen[1:] if i < len(r) and r[i]]
        if werte and sum('@' in w and '.' in w for w in werte) > len(werte) / 2 and i not in weg:
            weg.append(i)
    entfernt = [kopf[i] for i in sorted(weg)]
    rein = [[c for i, c in enumerate(r) if i not in weg] for r in zeilen]
    return rein, entfernt


def zahl(s):
    s = str(s).strip().replace('%', '').replace(',', '.')
    try:
        return float(s)
    except ValueError:
        return None


def ergebnis(s):
    t = str(s).strip().lower()
    if t in ERG_WORT:
        return ERG_WORT[t]
    z = zahl(t)
    if z is not None and 0 <= z <= 1 and t not in ('', '0.', '1.'):
        return z
    return None


def inhalt_laden(pfad):
    if not pfad or not os.path.isfile(pfad) or not shutil.which('node'):
        return {}
    code = "global.window=global;global.document={createElement:()=>({style:{},setAttribute(){},appendChild(){}})};require(process.argv[1]);" \
           "const P=window.PAKET;console.log(JSON.stringify({lz:P.lernziele,f:P.fragen.map(f=>({id:f.id,lz:f.lz,typ:f.typ,frage:String(f.frage).replace(/<[^>]+>/g,''),opt:(f.optionen||[]).map(o=>String(o.text).replace(/<[^>]+>/g,''))}))}))"
    p = subprocess.run(['node', '-e', code, os.path.abspath(pfad)], capture_output=True, text=True)
    try:
        return json.loads(p.stdout)
    except json.JSONDecodeError:
        return {}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('dateien', nargs='+')
    ap.add_argument('--inhalt')
    ap.add_argument('--anonym')
    ap.add_argument('--bericht')
    ap.add_argument('--bestehen', type=float, default=80)
    a = ap.parse_args()

    fr = collections.defaultdict(lambda: {'n': 0, 's': 0.0, 'falsch': collections.Counter()})
    lz = collections.defaultdict(list)
    noten, zeilen_gesamt, entfernt_alle, anonym = [], 0, set(), []
    for d in a.dateien:
        z, entfernt = anonymisieren(lesen(d))
        entfernt_alle.update(entfernt)
        anonym += z
        if not z:
            continue
        kopf = [str(h).strip().lower() for h in z[0]]
        notenspalten = [i for i, h in enumerate(kopf) if re.search(r'(bewertung|punkte|score|grade|ergebnis$|note$)', h) and not re.search(r'\d', h)]
        for r in z[1:]:
            if not any(str(c).strip() for c in r):
                continue
            zeilen_gesamt += 1
            for i in notenspalten:
                if i < len(r):
                    v = zahl(r[i])
                    if v is not None and 0 <= v <= 100:
                        noten.append(v)
            for i, c in enumerate(r):
                c = str(c).strip()
                m = ID.match(c)
                if m:
                    fid, antwort, erg = m.group(2), None, None
                    for c2 in r[i + 1:i + 6]:
                        if ID.match(str(c2).strip()):
                            break
                        e = ergebnis(c2)
                        if e is not None and erg is None:
                            erg = e
                        elif antwort is None and str(c2).strip():
                            antwort = str(c2).strip()
                    if erg is not None:
                        fr[fid]['n'] += 1
                        fr[fid]['s'] += erg
                        if erg < 1 and antwort:
                            fr[fid]['falsch'][antwort] += 1
                elif re.fullmatch(r'LZ\d+', c):
                    for c2 in r[i + 1:i + 4]:
                        v = zahl(c2)
                        if v is not None and 0 <= v <= 100:
                            lz[c].append(v)
                            break

    meta = inhalt_laden(a.inhalt)
    ftext = {f['id']: f for f in meta.get('f', [])}
    lztext = {x['id']: x['text'] for x in meta.get('lz', [])}
    out = ['# Auswertung des Lernpakets', '']
    out.append(f'Datengrundlage: {len(a.dateien)} Datei(en), {zeilen_gesamt} Datenzeilen.')
    out.append('Entfernte personenbezogene Spalten: ' + (', '.join(sorted(entfernt_alle)) if entfernt_alle else 'keine gefunden') + '.')
    out.append('')
    if noten:
        best = sum(1 for n in noten if n >= a.bestehen)
        out += ['## Gesamtbewertung', '', f'- Anzahl Bewertungen: {len(noten)}', f'- Mittelwert: {statistics.mean(noten):.0f} %, Median: {statistics.median(noten):.0f} %',
                f'- Bestanden (ab {a.bestehen:.0f} %): {best} von {len(noten)} ({best / len(noten) * 100:.0f} %)']
        stufen = collections.Counter(min(int(n // 20), 4) for n in noten)
        out.append('- Verteilung: ' + ', '.join(f'{s * 20}–{s * 20 + 19 if s < 4 else 100} %: {stufen.get(s, 0)}' for s in range(5)))
        out.append('')
    if lz:
        out += ['## Lernziele', '', '| Lernziel | Mittelwert | Anzahl | Hinweis |', '|---|---|---|---|']
        for k in sorted(lz, key=lambda x: int(x[2:])):
            m = statistics.mean(lz[k])
            out.append(f'| {k} {lztext.get(k, "")} | {m:.0f} % | {len(lz[k])} | {"schwach – Stationen dazu prüfen" if m < 60 else ""} |')
        out.append('')
    if fr:
        out += ['## Fragen', '', 'Lösungsquote unter 40 % = schwer (Frage, Feedback oder Station prüfen), über 95 % = sehr leicht (trennt nicht).', '',
                '| Frage | Lernziel | Lösungsquote | Anzahl | Häufigste falsche Antworten | Hinweis |', '|---|---|---|---|---|---|']
        for fid, d in sorted(fr.items(), key=lambda x: x[1]['s'] / max(x[1]['n'], 1)):
            q = d['s'] / d['n'] * 100
            f = ftext.get(fid, {})
            falsch = ', '.join(f'{k} ({v}×)' for k, v in d['falsch'].most_common(3))
            hinweis = 'schwer' if q < 40 else 'sehr leicht' if q > 95 else ''
            if d['n'] < 5:
                hinweis = (hinweis + ', ' if hinweis else '') + 'wenige Daten'
            text = (f.get('frage', '')[:60] + ('…' if len(f.get('frage', '')) > 60 else '')) if f else ''
            out.append(f'| {fid} {text} | {f.get("lz", "")} | {q:.0f} % | {d["n"]} | {falsch} | {hinweis} |')
        out.append('')
        out.append('Antwortkürzel bei Multiple Choice: a, b, c … in der Reihenfolge der Optionen in js/inhalt.js.')
    if not (noten or lz or fr):
        out.append('Keine auswertbaren Werte erkannt. Bitte den Bericht „Interaktionen“ bzw. „Lernziele“ der Aktivität exportieren oder die Spalten von Hand prüfen.')
    text = '\n'.join(out)
    print(text)
    if a.bericht:
        open(a.bericht, 'w', encoding='utf-8').write(text + '\n')
    if a.anonym:
        with open(a.anonym, 'w', newline='', encoding='utf-8') as f:
            csv.writer(f, delimiter=';').writerows(anonym)


if __name__ == '__main__':
    main()
