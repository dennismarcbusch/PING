#!/usr/bin/env python3
"""Prüft ein SCORM-1.2-Lernpaket gegen die technischen Standards des Leitfadens (Teil C5/C6).

Aufruf:
    python3 pruefe_paket.py <ordner-oder-zip> [--bericht bericht.json] [--bilder ordner] [--ohne-browser]

1. Statische Prüfung (immer): Manifest im Wurzelverzeichnis, SCORM 1.2, masteryscore 80,
   Identifier mit Präfix "ping-", alle Dateien vorhanden und im Manifest, keine externen
   Server, Größe, JavaScript-Syntax (wenn node installiert ist).
2. Browser-Prüfung (wenn Python-Playwright mit Chromium installiert ist): lädt das Paket in
   einem nachgebauten SCORM-1.2-Player, löst bei Paketen aus der Vorlage alle Stationen,
   Übungen und den Nachweis mit der Musterlösung, prüft Datenübergabe, Wiedereinstieg,
   Konsolenfehler, Darstellung auf schmalen Bildschirmen und genau einen Weiter-Knopf.
   Hat das Paket ein Tafelbild (PAKET.tafel), werden alle Szenen und Werkzeuge
   durchgeschaltet und geprüft, dass das Tafelbild nichts an die Lernplattform schreibt.
Ausgabe: Bericht als Text (Ampel je Punkt) und optional als JSON.
"""
import argparse, functools, http.server, json, os, re, shutil, subprocess, sys, tempfile, threading, zipfile
import xml.etree.ElementTree as ET

ERG = []  # (ampel, bereich, text)


def punkt(ok, bereich, text, gelb=False):
    ERG.append(('🟢' if ok else ('🟡' if gelb else '🔴'), bereich, text))


def entpacken(pfad):
    if os.path.isdir(pfad):
        return os.path.abspath(pfad), None
    tmp = tempfile.mkdtemp(prefix='paket_')
    with zipfile.ZipFile(pfad) as z:
        z.extractall(tmp)
    return tmp, tmp


def statisch(root):
    man = os.path.join(root, 'imsmanifest.xml')
    if not os.path.isfile(man):
        punkt(False, 'Format', 'imsmanifest.xml fehlt im Wurzelverzeichnis des Pakets.')
        return None
    punkt(True, 'Format', 'imsmanifest.xml liegt im Wurzelverzeichnis.')
    try:
        tree = ET.parse(man)
    except ET.ParseError as e:
        punkt(False, 'Format', f'imsmanifest.xml ist kein gültiges XML: {e}')
        return None
    r = tree.getroot()
    ns = {'c': 'http://www.imsproject.org/xsd/imscp_rootv1p1p2', 'a': 'http://www.adlnet.org/xsd/adlcp_rootv1p2'}
    sv = r.find('.//c:schemaversion', ns)
    punkt(sv is not None and sv.text.strip() == '1.2', 'Format', f'SCORM-Version: {sv.text.strip() if sv is not None else "fehlt"} (Soll: 1.2).')
    ident = r.get('identifier', '')
    punkt(ident.startswith('ping-'), 'Format', f'Manifest-Identifier "{ident}" ' + ('hat das Präfix ping-.' if ident.startswith('ping-') else 'sollte mit "ping-" beginnen.'), gelb=True)
    ms = r.find('.//a:masteryscore', ns)
    msv = ms.text.strip() if ms is not None and ms.text else None
    punkt(msv == '80', 'Datenübergabe', f'masteryscore im Manifest: {msv or "fehlt"} (Soll: 80).')
    res = r.find('.//c:resource', ns)
    href = res.get('href') if res is not None else None
    punkt(bool(href) and os.path.isfile(os.path.join(root, href or '')), 'Format', f'Startdatei: {href or "fehlt"}.')
    gelistet = {f.get('href') for f in r.findall('.//c:file', ns)}
    vorhanden = set()
    for d, _, fs in os.walk(root):
        for f in fs:
            rel = os.path.relpath(os.path.join(d, f), root).replace(os.sep, '/')
            if rel != 'imsmanifest.xml' and not rel.startswith('__MACOSX'):
                vorhanden.add(rel)
    fehlt = sorted(g for g in gelistet if g and g not in vorhanden)
    nicht = sorted(v for v in vorhanden if v not in gelistet)
    punkt(not fehlt, 'Format', 'Alle im Manifest genannten Dateien sind vorhanden.' if not fehlt else 'Im Manifest genannt, aber nicht vorhanden: ' + ', '.join(fehlt))
    punkt(not nicht, 'Format', 'Alle Dateien sind im Manifest aufgeführt.' if not nicht else 'Nicht im Manifest aufgeführt (Lernplattform lädt sie evtl. trotzdem): ' + ', '.join(nicht[:10]), gelb=True)
    groesse = sum(os.path.getsize(os.path.join(root, v)) for v in vorhanden)
    punkt(groesse < 512 * 1024 * 1024, 'Format', f'Größe: {groesse / 1024:.0f} KB (Grenze ByCS: 512 MB).')
    extern = []
    for v in vorhanden:
        if v.endswith(('.html', '.htm', '.js', '.css')):
            t = open(os.path.join(root, v), encoding='utf-8', errors='ignore').read()
            for m in re.finditer(r'''(?:src|href)\s*=\s*["'](https?:)?//[^"']+|url\(\s*["']?https?://|@import\s+["']?https?://|fetch\(\s*["']https?://''', t):
                extern.append(f'{v}: {m.group(0)[:70]}')
    punkt(not extern, 'Datenschutz', 'Keine Verweise auf externe Server.' if not extern else 'Externe Verweise gefunden: ' + '; '.join(extern[:5]))
    alles = ''.join(open(os.path.join(root, v), encoding='utf-8', errors='ignore').read() for v in vorhanden if v.endswith(('.html', '.js')))
    for feld, text in [('LMSInitialize', 'SCORM-Initialisierung'), ('cmi.core.score.raw', 'Punktzahl'), ('cmi.core.lesson_status', 'Bestanden/Nicht bestanden'), ('cmi.suspend_data', 'Fortschritt (Wiedereinstieg)'), ('cmi.core.student_name', 'Name aus der Lernplattform')]:
        punkt(feld in alles, 'Datenübergabe', f'{text} ({feld}) ' + ('wird verwendet.' if feld in alles else 'fehlt im Code.'), gelb=feld == 'cmi.core.student_name')
    punkt('cmi.objectives' in alles, 'Datenübergabe', 'Ergebnisse je Lernziel (cmi.objectives) ' + ('werden übertragen.' if 'cmi.objectives' in alles else 'werden nicht übertragen (optional).'), gelb=True)
    punkt('cmi.interactions' in alles, 'Datenübergabe', 'Ergebnisse je Frage (cmi.interactions) ' + ('werden übertragen.' if 'cmi.interactions' in alles else 'werden nicht übertragen (optional, aber nötig für die Auswertung je Frage).'), gelb=True)
    medien = re.findall(r'<(audio|video)\b', alles, re.I)
    if medien:
        text_da = re.search(r'<track\b|transkript|untertitel', alles, re.I)
        punkt(bool(text_da), 'Barrierefreiheit', 'Ton/Video vorhanden ' + ('mit Hinweis auf Untertitel oder Transkript.' if text_da else 'ohne erkennbare Untertitel oder Transkript – Gesprochenes muss auch als Text verfügbar sein.'), gelb=True)
    for kw in ['alert(', 'confirm(', 'prompt(']:
        if re.search(r'(?<![\w.])' + re.escape(kw), alles):
            punkt(False, 'Bedienung', f'{kw[:-1]}-Dialog im Code gefunden; Dialoge blockieren in manchen Lernplattformen.', gelb=True)
    if shutil.which('node'):
        for v in sorted(vorhanden):
            if v.endswith('.js'):
                p = subprocess.run(['node', '--check', os.path.join(root, v)], capture_output=True, text=True)
                punkt(p.returncode == 0, 'Technik', f'JavaScript-Syntax {v}: ' + ('in Ordnung.' if p.returncode == 0 else p.stderr.strip().splitlines()[-1]))
    return href


MOCK = r"""
(() => {
  const KEY = '__scorm_mock';
  let d = {}; try { d = JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch (e) {}
  d.calls = d.calls || []; d.v = d.v || {};
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} };
  const log = (f, a, r) => { d.calls.push([f, a, r]); if (d.calls.length > 4000) d.calls.shift(); save(); };
  if (!('cmi.core.student_name' in d.v)) d.v['cmi.core.student_name'] = 'Muster, Max';
  window.__scorm = d;
  window.API = {
    LMSInitialize: a => { log('LMSInitialize', a, 'true'); return 'true'; },
    LMSFinish: a => { log('LMSFinish', a, 'true'); return 'true'; },
    LMSGetValue: k => {
      let r = d.v[k];
      if (k === 'cmi.interactions._count') r = String(Object.keys(d.v).filter(x => /^cmi\.interactions\.\d+\.id$/.test(x)).length);
      if (k === 'cmi.objectives._count') r = String(Object.keys(d.v).filter(x => /^cmi\.objectives\.\d+\.id$/.test(x)).length);
      if (r === undefined) r = '';
      log('LMSGetValue', k, r); return r;
    },
    LMSSetValue: (k, v) => {
      let ok = true;
      if (k === 'cmi.suspend_data' && String(v).length > 4096) ok = false;
      if (k === 'cmi.core.lesson_status' && !['passed','completed','failed','incomplete','browsed','not attempted'].includes(v)) ok = false;
      if (k === 'cmi.core.score.raw' && (isNaN(+v) || +v < 0 || +v > 100)) ok = false;
      if (/^cmi\.interactions\.\d+\.id$/.test(k) && !/^[^\s]{1,255}$/.test(v)) ok = false;
      if (ok) d.v[k] = String(v);
      log('LMSSetValue', [k, String(v).slice(0, 120)], ok ? 'true' : 'false'); return ok ? 'true' : 'false';
    },
    LMSCommit: a => { log('LMSCommit', a, 'true'); return 'true'; },
    LMSGetLastError: () => '0', LMSGetErrorString: () => '', LMSGetDiagnostic: () => ''
  };
})();
"""


def server(root):
    class Leise(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    h = functools.partial(Leise, directory=root)
    s = http.server.ThreadingHTTPServer(('127.0.0.1', 0), h)
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return s


def browser(root, href, bilder):
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        punkt(False, 'Test', 'Browser-Prüfung übersprungen: Python-Playwright ist nicht installiert (pip install playwright && playwright install chromium).', gelb=True)
        return
    srv = server(root)
    url = f'http://127.0.0.1:{srv.server_port}/{href}'
    fehler = []
    with sync_playwright() as pw:
        try:
            b = pw.chromium.launch()
        except Exception as e:
            punkt(False, 'Test', f'Browser-Prüfung übersprungen: Chromium startet nicht ({str(e).splitlines()[0]}).', gelb=True)
            return
        ctx = b.new_context(viewport={'width': 1366, 'height': 900})
        ctx.add_init_script(MOCK)
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: fehler.append(str(e)))
        pg.on('console', lambda m: fehler.append(m.text) if m.type == 'error' else None)
        pg.goto(url)
        pg.wait_for_timeout(600)
        calls = pg.evaluate('window.__scorm.calls.map(c => c[0])')
        punkt('LMSInitialize' in calls, 'Datenübergabe', 'Paket meldet sich beim (nachgebauten) SCORM-Player an.')
        vorlage = pg.evaluate('!!window.LERNPAKET')
        if bilder:
            os.makedirs(bilder, exist_ok=True)
        if not vorlage:
            punkt(False, 'Test', 'Paket stammt nicht aus der PING-Vorlage: nur Laden, Anmeldung und Darstellung geprüft. Aufgaben bitte von Hand durchspielen.', gelb=True)
            if bilder:
                pg.screenshot(path=os.path.join(bilder, 'start.png'), full_page=True)
            _schmal(ctx, url, bilder, None)
        else:
            _vorlage(pg, bilder)
            _schmal(ctx, url, bilder, True)
            _tafel(ctx, url, bilder)
        echte = [f for f in fehler if 'favicon' not in f]
        punkt(not echte, 'Technik', 'Keine Fehler in der Browser-Konsole.' if not echte else 'Konsolenfehler: ' + ' | '.join(echte[:5]))
        b.close()
    srv.shutdown()


def _primaer(pg):
    return pg.evaluate("[...document.querySelectorAll('button.primaer')].filter(b => b.offsetParent !== null).length")


def _klick_weiter(pg):
    pg.click('#weiter')
    pg.wait_for_timeout(150)


def _vorlage(pg, bilder):
    pi = pg.evaluate('LERNPAKET.pruefeInhalt()')
    punkt(not pi['fehler'], 'Inhalt', 'Inhaltsprüfung der Vorlage: keine Fehler.' if not pi['fehler'] else 'Inhaltsfehler: ' + '; '.join(pi['fehler'][:8]))
    for h in pi['hinweise'][:12]:
        punkt(False, 'Inhalt', 'Hinweis: ' + h, gelb=True)
    info = pg.evaluate('({st: PAKET.stationen.map(s => s.id), ue: (PAKET.uebungen||[]).map(u => u.id), a: !!(PAKET.nachweis && PAKET.nachweis.teilA)})')
    ansichten = []
    if bilder:
        pg.screenshot(path=os.path.join(bilder, '0-start.png'), full_page=True)
    ansichten.append(('Start', _primaer(pg)))
    loese = """(() => { LERNPAKET.aktuelleTeile().forEach(t => {
        if (t.art === 'interaktion' && t.obj && t.obj.loesen) t.obj.loesen();
        if (t.art === 'frage') { t.obj.loesungEinsetzen(); const b = t.obj.el.querySelector('button.pruefen'); if (b && !b.hidden) b.click(); }
      }); })()"""
    for i, sid in enumerate(info['st']):
        pg.evaluate(f"LERNPAKET.zeige('entdecken', {i})")
        pg.wait_for_timeout(100)
        ansichten.append((f'Station {sid}', _primaer(pg)))
        if bilder and i == 0:
            pg.screenshot(path=os.path.join(bilder, '1-station.png'), full_page=True)
        pg.evaluate(loese)
    z = pg.evaluate('LERNPAKET.zustand()')
    offen = [s for s in info['st'] if not z['st'].get(s)]
    punkt(not offen, 'Lösbarkeit', 'Alle Stationen sind mit der Musterlösung lösbar.' if not offen else 'Mit der Musterlösung nicht abschließbar: ' + ', '.join(offen))
    for i, uid in enumerate(info['ue']):
        pg.evaluate(f"LERNPAKET.zeige('ueben', {i})")
        pg.wait_for_timeout(100)
        ansichten.append((f'Übung {uid}', _primaer(pg)))
        if bilder and i == 0:
            pg.screenshot(path=os.path.join(bilder, '2-uebung.png'), full_page=True)
        pg.evaluate(loese)
    z = pg.evaluate('LERNPAKET.zustand()')
    offen = [u for u in info['ue'] if not z['ue'].get(u)]
    punkt(not offen, 'Lösbarkeit', 'Alle Übungen sind mit der Musterlösung lösbar.' if not offen else 'Mit der Musterlösung nicht lösbar: ' + ', '.join(offen))
    # Nachweis mit Musterlösung
    pg.evaluate("LERNPAKET.zeige('nachweis')")
    ansichten.append(('Nachweis', _primaer(pg)))
    _klick_weiter(pg)
    if info['a']:
        if bilder:
            pg.screenshot(path=os.path.join(bilder, '3-nachweis-a.png'), full_page=True)
        pg.evaluate(loese)
        _klick_weiter(pg)
    pg.evaluate("LERNPAKET.aktuelleTeile().forEach(t => t.art === 'frage' && t.obj.loesungEinsetzen())")
    if bilder:
        pg.screenshot(path=os.path.join(bilder, '4-nachweis-b.png'), full_page=True)
    _klick_weiter(pg)
    z = pg.evaluate('LERNPAKET.zustand()')
    punkt(z['best'] == 100, 'Lösbarkeit', f'Nachweis mit Musterlösung: {z["best"]} % (Soll: 100 %).')
    v = pg.evaluate('window.__scorm.v')
    punkt(v.get('cmi.core.lesson_status') == 'passed' and v.get('cmi.core.score.raw') == '100', 'Datenübergabe', f'Lernplattform erhält score.raw={v.get("cmi.core.score.raw")} und lesson_status={v.get("cmi.core.lesson_status")}.')
    nobj = len([k for k in v if re.match(r'cmi\.objectives\.\d+\.id$', k)])
    nint = len([k for k in v if re.match(r'cmi\.interactions\.\d+\.id$', k)])
    punkt(nobj > 0 and nint > 0, 'Datenübergabe', f'Übertragen: {nobj} Lernziele (objectives), {nint} Fragen und Prüfpunkte (interactions).')
    abgelehnt = pg.evaluate("window.__scorm.calls.filter(c => c[0] === 'LMSSetValue' && c[2] === 'false').map(c => c[1][0])")
    punkt(not abgelehnt, 'Datenübergabe', 'Alle SCORM-Werte wurden angenommen.' if not abgelehnt else 'Vom Player abgelehnt: ' + ', '.join(sorted(set(abgelehnt))[:6]))
    sd = len(v.get('cmi.suspend_data', ''))
    punkt(0 < sd < 3800, 'Datenübergabe', f'suspend_data: {sd} Zeichen (Grenze 4096).')
    if bilder:
        pg.screenshot(path=os.path.join(bilder, '5-abschluss.png'), full_page=True)
    ansichten.append(('Abschluss', _primaer(pg)))
    # zweiter Versuch ohne Antworten: bestes Ergebnis muss bleiben
    pg.evaluate("LERNPAKET.zeige('nachweis')")
    _klick_weiter(pg)
    if info['a']:
        _klick_weiter(pg)
    _klick_weiter(pg)
    _klick_weiter(pg)
    z = pg.evaluate('LERNPAKET.zustand()')
    v = pg.evaluate('window.__scorm.v')
    punkt(z['n'] == 2 and z['best'] == 100 and v.get('cmi.core.lesson_status') == 'passed', 'Datenübergabe', 'Zweiter, schlechterer Versuch: bestes Ergebnis bleibt erhalten.')
    # Wiedereinstieg
    pg.reload()
    pg.wait_for_timeout(500)
    z2 = pg.evaluate('LERNPAKET.zustand()')
    punkt(z2['n'] == 2 and len(z2['st']) == len(info['st']), 'Technik', 'Wiedereinstieg: Fortschritt ist nach dem Neuladen wieder da.')
    mehrfach = [f'{n} ({k})' for n, k in ansichten if k != 1]
    punkt(not mehrfach, 'Bedienung', 'Jede Ansicht hat genau einen hervorgehobenen Weiter-Knopf.' if not mehrfach else 'Nicht genau ein Weiter-Knopf: ' + ', '.join(mehrfach))


def _schmal(ctx, url, bilder, vorlage):
    for w, h, name in [(768, 1024, 'Tablet'), (390, 844, 'Handy')]:
        pg = ctx.new_page()
        pg.set_viewport_size({'width': w, 'height': h})
        pg.goto(url)
        pg.wait_for_timeout(400)
        teile = ['start', 'entdecken', 'ueben', 'nachweis', 'abschluss'] if vorlage else ['start']
        zu_breit = []
        for t in teile:
            if vorlage:
                pg.evaluate(f"LERNPAKET.zeige('{t}', 0)")
                pg.wait_for_timeout(80)
            sw = pg.evaluate('document.documentElement.scrollWidth')
            if sw > w + 1:
                zu_breit.append(f'{t} ({sw}px)')
            if vorlage:
                sichtbar = pg.evaluate("(() => { const b = document.getElementById('weiter'); if (!b) return true; const r = b.getBoundingClientRect(); return r.bottom <= innerHeight && r.right <= innerWidth && r.width > 0; })()")
                if not sichtbar:
                    zu_breit.append(f'{t}: Weiter-Knopf nicht sichtbar')
        if bilder:
            pg.screenshot(path=os.path.join(bilder, f'schmal-{w}.png'), full_page=False)
        punkt(not zu_breit, 'Bedienung', f'{name} ({w}px): ' + (('kein seitliches Scrollen, Weiter-Knopf sichtbar.' if vorlage else 'kein seitliches Scrollen auf der Startseite.') if not zu_breit else 'Probleme: ' + ', '.join(zu_breit)), gelb=name == 'Handy')
        pg.close()


def _tafel(ctx, url, bilder):
    pg = ctx.new_page()
    pg.set_viewport_size({'width': 1600, 'height': 900})  # Beamer
    fehler = []
    pg.on('pageerror', lambda e: fehler.append(str(e)))
    pg.on('console', lambda m: fehler.append(m.text) if m.type == 'error' else None)
    pg.goto(url)
    pg.wait_for_timeout(500)
    if not pg.evaluate('!!(window.PAKET && PAKET.tafel)'):
        pg.close()
        return
    if not pg.evaluate('!!window.TAFEL'):
        punkt(False, 'Tafelbild', 'PAKET.tafel ist gesetzt, aber js/tafel.js ist nicht eingebunden.')
        pg.close()
        return
    schreib = "window.__scorm.calls.filter(c => c[0] === 'LMSSetValue').length"
    vor = pg.evaluate(schreib)
    zugang = pg.locator('.kopf .tafel-knopf').count() == 1 and pg.locator('#haupt .tafel-hinweis').count() == 1
    punkt(zugang, 'Tafelbild', 'Zugänge vorhanden: Knopf „Tafelbild“ in der Kopfzeile und Hinweis auf der Startseite.' if zugang else 'Knopf in der Kopfzeile oder Hinweis auf der Startseite fehlt.')
    pg.evaluate('TAFEL.oeffnen({})')
    pg.wait_for_timeout(200)
    n = pg.evaluate('TAFEL.zustand().anzahl')
    leer, breit = [], []
    for i in range(n):
        pg.evaluate(f'TAFEL.szene({i})')
        pg.wait_for_timeout(150)
        if pg.evaluate("document.querySelector('.tafel-szene').children.length") == 0:
            leer.append(str(i + 1))
        if bilder:
            pg.screenshot(path=os.path.join(bilder, f'tafel-{i + 1}.png'))
        for k in range(pg.locator('.tafel-werkzeuge button').count()):
            b = pg.locator('.tafel-werkzeuge button').nth(k)
            if b.is_enabled():
                b.click()
                pg.wait_for_timeout(60)
        if pg.evaluate('document.documentElement.scrollWidth') > 1601:
            breit.append(str(i + 1))
    punkt(not leer, 'Tafelbild', f'{n} Szenen; alle zeichnen etwas, alle Werkzeuge einmal ausgelöst.' if not leer else 'Szenen ohne Inhalt: ' + ', '.join(leer))
    if n > 8:
        punkt(False, 'Tafelbild', f'{n} Szenen – für etwa 20 Minuten sind höchstens 6–8 sinnvoll.', gelb=True)
    pg.evaluate('TAFEL.szene(0)')
    pg.locator('.tafel').focus()
    pg.keyboard.press('ArrowRight')
    tasten = n < 2 or pg.evaluate('TAFEL.zustand().szene') == 1
    pg.keyboard.press('Escape')
    pg.wait_for_timeout(100)
    tasten = tasten and not pg.evaluate('TAFEL.zustand().offen')
    punkt(tasten, 'Tafelbild', 'Bedienung per Tastatur (Pfeiltaste, Esc) funktioniert.')
    nach = pg.evaluate(schreib)
    punkt(vor == nach, 'Datenübergabe', 'Tafelbild schreibt nichts an die Lernplattform.' if vor == nach else f'Tafelbild hat {nach - vor} SCORM-Werte geschrieben – es darf nichts speichern.')
    pg2 = ctx.new_page()
    pg2.set_viewport_size({'width': 768, 'height': 1024})
    pg2.goto(url + '#tafel')
    pg2.wait_for_timeout(500)
    z = pg2.evaluate('window.TAFEL && TAFEL.zustand()') or {}
    ok = bool(z.get('offen')) and z.get('praesentation') and not z.get('erklaerungen')
    punkt(ok, 'Tafelbild', 'index.html#tafel startet die Präsentation ohne Erklärungen.' if ok else 'index.html#tafel öffnet die Präsentation nicht richtig.')
    if pg2.evaluate('document.documentElement.scrollWidth') > 769:
        breit.append('Tablet')
    pg2.close()
    punkt(not breit, 'Tafelbild', 'Kein seitliches Scrollen (Beamer 1600 px, Tablet 768 px).' if not breit else 'Seitliches Scrollen in: ' + ', '.join(breit), gelb=True)
    echte = [f for f in fehler if 'favicon' not in f]
    punkt(not echte, 'Tafelbild', 'Keine Konsolenfehler beim Durchschalten.' if not echte else 'Konsolenfehler: ' + ' | '.join(echte[:5]))
    pg.close()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('paket')
    ap.add_argument('--bericht')
    ap.add_argument('--bilder')
    ap.add_argument('--ohne-browser', action='store_true')
    a = ap.parse_args()
    root, tmp = entpacken(a.paket)
    href = statisch(root)
    if href and not a.ohne_browser:
        browser(root, href, a.bilder)
    print(f'Prüfbericht für {a.paket}\n')
    for amp, ber, txt in ERG:
        print(f'{amp} [{ber}] {txt}')
    rot = sum(1 for e in ERG if e[0] == '🔴')
    gelb = sum(1 for e in ERG if e[0] == '🟡')
    print(f'\nErgebnis: {rot} rot, {gelb} gelb, {len(ERG) - rot - gelb} grün.')
    if a.bericht:
        json.dump([{'ampel': x, 'bereich': y, 'text': z} for x, y, z in ERG], open(a.bericht, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if tmp:
        shutil.rmtree(tmp, ignore_errors=True)
    sys.exit(1 if rot else 0)


if __name__ == '__main__':
    main()
