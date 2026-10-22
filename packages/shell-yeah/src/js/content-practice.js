/* Inhalte – Teil ② Üben: 8 Missionen mit Prüfpunkten, gestuften Tipps und Reflexionsfrage */
(function (G) {
  'use strict';
  const LX = (G.LX = G.LX || {});
  const Q = LX.q;
  const H = '/home/azubi';
  const A = { owner: 'azubi', group: 'azubi' };
  const put = (w, p, d, o) => LX.putFile(w, p, d, Object.assign({}, A, { mtime: LX.ago(0, 8, 5) }, o || {}));
  const dir = (w, p, o) => LX.ensureDir(w, p, Object.assign({}, A, { mode: 0o775, mtime: LX.ago(0, 8, 5) }, o || {}));
  const rootRan = (w, names, path) => w.log.cmds.some(l => l.cmds.some(c => names.indexOf(c.name) >= 0 && c.user === 'root' && c.code === 0 && c.argv.some(a => a === path)));

  const P = [];
  LX.PRACTICE = P;

  P.push({
    id: 'u1', title: 'Posteingang sortieren', lz: [1, 2], chapter: 'k1',
    story: 'Guten Morgen! Über Nacht ist neue Post in <code>~/post</code> gelandet. Bitte sortier sie. In einer der Dateien steht ein Hinweis von mir, den nicht jede:r findet.',
    setup: (w) => {
      dir(w, H + '/post');
      put(w, H + '/post/hinweis.txt', 'Hallo Azubi!\n\n1. Die Kundenliste gehört in ein eigenes Verzeichnis »kunden« in deinem Home-Verzeichnis.\n   Gib ihr dort den Namen kunden_2026.txt.\n2. Der Berichtsentwurf ist fertig – benenne ihn in bericht_final.txt um (er bleibt im Ordner post).\n3. Und dann ist da noch etwas, das sich versteckt …\n\nMira\n');
      put(w, H + '/post/kundenliste.txt', 'Bäckerei Brunner\nAutohaus Seidel\nPraxis Dr. Okafor\n');
      put(w, H + '/post/bericht_entwurf.txt', 'Wochenbericht Azubi – KW 43\nMontag: Linux-Grundlagen\n');
      put(w, H + '/post/.geheimauftrag', 'Gut gefunden! Lege in deinem Home-Verzeichnis ein Verzeichnis namens »tresor« an.\nDann weiß ich, dass du versteckte Dateien im Griff hast.\n');
      put(w, H + '/post/werbung.txt', 'Sonderangebot: 50 % auf Druckerpapier!\n');
    },
    checks: [
      { text: 'Verzeichnis <code>~/kunden</code> existiert', fn: (w) => Q.isDir(w, H + '/kunden') },
      { text: 'Kundenliste liegt als <code>~/kunden/kunden_2026.txt</code> vor und nicht mehr im Ordner post', fn: (w) => Q.isFile(w, H + '/kunden/kunden_2026.txt') && Q.gone(w, H + '/post/kundenliste.txt') && /Brunner/.test(Q.text(w, H + '/kunden/kunden_2026.txt') || '') },
      { text: 'Berichtsentwurf heißt <code>~/post/bericht_final.txt</code>', fn: (w) => Q.isFile(w, H + '/post/bericht_final.txt') && Q.gone(w, H + '/post/bericht_entwurf.txt') },
      { text: 'Geheimauftrag erledigt', fn: (w) => Q.isDir(w, H + '/tresor') }
    ],
    tips: [
      'Lies zuerst die Datei <code>hinweis.txt</code> im Ordner post. Was dort steht, sind deine Aufgaben.',
      'Du brauchst <code>cat</code> zum Lesen, <code>mkdir</code> für neue Verzeichnisse und <code>mv</code> zum Verschieben und Umbenennen. Der versteckte Auftrag zeigt sich erst mit <code>ls -a</code>.',
      '<code>mkdir ~/kunden</code> · <code>mv ~/post/kundenliste.txt ~/kunden/kunden_2026.txt</code> · <code>mv ~/post/bericht_entwurf.txt ~/post/bericht_final.txt</code> · <code>ls -a ~/post</code> und <code>cat ~/post/.geheimauftrag</code>'
    ],
    reflect: { q: 'Warum verzichtet man in Dateinamen auf einem Server auf Leerzeichen und Umlaute?', model: 'Leerzeichen trennen in der Shell die Argumente. »Mein Bericht.txt« würde als zwei Dateien gelesen und müsste immer in Anführungszeichen stehen. Umlaute können je nach Zeichensatz, Tastatur und Programm falsch dargestellt werden oder schwer zu tippen sein. Einfache Namen wie bericht_final.txt funktionieren überall.' }
  });

  P.push({
    id: 'u2', title: 'Kalles Chaos-Ordner', lz: [2], chapter: 'k2',
    story: 'Kalle hat in <code>~/chaos</code> alles durcheinander abgelegt. Räum auf: Vorlagen sichern, Datenmüll löschen, Fotos in einen eigenen Ordner.',
    setup: (w) => {
      dir(w, H + '/chaos');
      ['angebot_seidel.odt', 'angebot_okafor.odt', 'vorlage_brief.odt'].forEach(n => { const f = LX.binFile(w, H + '/chaos/' + n, 20000 + n.length * 731, Object.assign({}, A, { mtime: LX.ago(9) })); });
      ['notiz.bak', 'liste.bak', 'alt.bak'].forEach(n => put(w, H + '/chaos/' + n, 'Sicherungskopie\n'));
      ['foto_rack1.jpg', 'foto_rack2.jpg'].forEach(n => LX.binFile(w, H + '/chaos/' + n, 812345, Object.assign({}, A, { mtime: LX.ago(3) })));
      dir(w, H + '/chaos/leer1'); dir(w, H + '/chaos/leer2');
      put(w, H + '/chaos/protokoll.txt', 'Protokoll – bitte behalten\n');
    },
    checks: [
      { text: 'Alle drei <code>.odt</code>-Dateien liegen als Kopie in <code>~/vorlagen</code> (Originale bleiben in chaos)', fn: (w) => ['angebot_seidel.odt', 'angebot_okafor.odt', 'vorlage_brief.odt'].every(n => Q.isFile(w, H + '/vorlagen/' + n) && Q.isFile(w, H + '/chaos/' + n)) },
      { text: 'Keine <code>.bak</code>-Dateien mehr in <code>~/chaos</code>', fn: (w) => Q.isDir(w, H + '/chaos') && !Q.children(w, H + '/chaos').some(n => /\.bak$/.test(n)) },
      { text: 'Die leeren Verzeichnisse <code>leer1</code> und <code>leer2</code> sind entfernt', fn: (w) => Q.gone(w, H + '/chaos/leer1') && Q.gone(w, H + '/chaos/leer2') },
      { text: 'Fotos liegen in <code>~/chaos/bilder</code>', fn: (w) => Q.isFile(w, H + '/chaos/bilder/foto_rack1.jpg') && Q.isFile(w, H + '/chaos/bilder/foto_rack2.jpg') && !Q.children(w, H + '/chaos').some(n => /\.jpg$/.test(n)) },
      { text: '<code>protokoll.txt</code> ist noch da und es gibt eine leere Datei <code>~/chaos/liesmich.txt</code>', fn: (w) => Q.isFile(w, H + '/chaos/protokoll.txt') && Q.text(w, H + '/chaos/liesmich.txt') === '' }
    ],
    tips: [
      'Arbeite dich Gruppe für Gruppe vor: erst kopieren, dann löschen, dann verschieben. Mit Platzhaltern sparst du dir viele Einzelbefehle.',
      '<code>cp</code> mit <code>*.odt</code> kopiert alle Vorlagen auf einmal. <code>rm</code> mit <code>*.bak</code> löscht den Müll. Leere Verzeichnisse entfernt <code>rmdir</code>, leere Dateien erzeugt <code>touch</code>.',
      '<code>mkdir ~/vorlagen</code> · <code>cp ~/chaos/*.odt ~/vorlagen/</code> · <code>rm ~/chaos/*.bak</code> · <code>rmdir ~/chaos/leer1 ~/chaos/leer2</code> · <code>mkdir ~/chaos/bilder</code> · <code>mv ~/chaos/*.jpg ~/chaos/bilder/</code> · <code>touch ~/chaos/liesmich.txt</code>'
    ],
    reflect: { q: 'Bevor du <code>rm *.bak</code> ausführst: Wie kannst du sicherstellen, dass der Platzhalter nur die gewünschten Dateien trifft?', model: 'Erst mit demselben Muster ansehen, was getroffen wird: »ls *.bak«. Die Shell setzt bei ls dieselben Namen ein wie später bei rm. Alternativ fragt »rm -i *.bak« bei jeder Datei nach.' }
  });

  P.push({
    id: 'u3', title: 'Rechte richten', lz: [3], chapter: 'k3',
    story: 'Ein Sicherheitscheck hat ergeben: Bei dir sind einige Rechte zu offen oder zu streng gesetzt. Bring das in Ordnung.',
    setup: (w) => {
      dir(w, H + '/team-skripte');
      put(w, H + '/team-skripte/aufraeumen.sh', '#!/bin/bash\n# räumt temporäre Dateien auf\necho "Aufräumen läuft ..."\necho "Aufräumen erledigt am Server korb-srv01" > /home/azubi/team-skripte/lauf.log\necho "Fertig."\n', { mode: 0o644 });
      dir(w, H + '/privat2', { mode: 0o775 });
      put(w, H + '/privat2/tagebuch.txt', 'Liebes Tagebuch, heute habe ich chmod gelernt.\n', { mode: 0o664 });
      dir(w, H + '/projekt');
      put(w, H + '/projekt/plan.txt', 'Projektplan Netzwerkumbau\n', { mode: 0o644 });
    },
    checks: [
      { text: '<code>~/team-skripte/aufraeumen.sh</code> hat die Rechte <code>rwxr-x---</code>', fn: (w) => Q.mode(w, H + '/team-skripte/aufraeumen.sh') === 0o750 },
      { text: 'Das Skript wurde erfolgreich ausgeführt (es schreibt <code>lauf.log</code>)', fn: (w) => /erledigt/.test(Q.text(w, H + '/team-skripte/lauf.log') || '') },
      { text: 'Nur du kannst <code>~/privat2</code> betreten, lesen und ändern', fn: (w) => Q.mode(w, H + '/privat2') === 0o700 },
      { text: '<code>~/privat2/tagebuch.txt</code> hat die Rechte <code>rw-------</code>', fn: (w) => Q.mode(w, H + '/privat2/tagebuch.txt') === 0o600 },
      { text: '<code>~/projekt/plan.txt</code> gehört der Gruppe <code>it</code> und die Gruppe darf schreiben', fn: (w) => Q.group(w, H + '/projekt/plan.txt') === 'it' && (Q.mode(w, H + '/projekt/plan.txt') & 0o020) !== 0 },
      { text: 'Du hast <code>/root/serverraum_code.txt</code> mit Administratorrechten gelesen', fn: (w) => rootRan(w, ['cat', 'less', 'more', 'head', 'tail'], '/root/serverraum_code.txt') }
    ],
    tips: [
      'Prüfe zuerst mit <code>ls -l</code>, wie die Rechte jetzt aussehen. Übersetze die Wunschrechte in Zahlen: r = 4, w = 2, x = 1.',
      'Für exakte Rechte eignet sich chmod mit Zahlen (750, 700, 600). Für einzelne Änderungen die symbolische Schreibweise (<code>g+w</code>). Die Gruppe ändert <code>chgrp</code>, fremde Dateien liest du mit <code>sudo</code> (Passwort korb2026).',
      '<code>chmod 750 ~/team-skripte/aufraeumen.sh</code> · <code>~/team-skripte/aufraeumen.sh</code> · <code>chmod 700 ~/privat2</code> · <code>chmod 600 ~/privat2/tagebuch.txt</code> · <code>chgrp it ~/projekt/plan.txt</code> · <code>chmod g+w ~/projekt/plan.txt</code> · <code>sudo cat /root/serverraum_code.txt</code>'
    ],
    reflect: { q: 'Warum reicht es nicht, nur <code>tagebuch.txt</code> auf 600 zu setzen, wenn das Verzeichnis <code>privat2</code> die Rechte 775 hat?', model: 'Mit Schreibrecht (w) auf das Verzeichnis kann die Gruppe zwar die Datei nicht lesen, aber löschen oder umbenennen und eine eigene Datei gleichen Namens anlegen. Außerdem sieht sie mit r, welche Dateien es gibt. Erst 700 auf dem Verzeichnis schützt den Inhalt vollständig.' }
  });

  P.push({
    id: 'u4', title: 'Spurensuche', lz: [4, 1], chapter: 'k4',
    story: 'Die Buchhaltung braucht dringend den Kassenbericht für das dritte Quartal. Er liegt irgendwo in der Teamablage unter <code>/srv/team</code>. Außerdem musst du ein Protokoll zusammensetzen und ein paar Infos sammeln.',
    setup: (w) => {
      LX.ensureDir(w, '/srv/team/archiv/2026/q2', { group: 'it', mode: 0o2775, mtime: LX.ago(100) });
      LX.ensureDir(w, '/srv/team/archiv/2026/q3/buchhaltung', { group: 'it', mode: 0o2775, mtime: LX.ago(20) });
      LX.putFile(w, '/srv/team/archiv/2026/q3/buchhaltung/kassenbericht_q3.csv', 'monat;umsatz\njuli;48210\naugust;51077\nseptember;49930\n', { owner: 'mira', group: 'it', mode: 0o664, mtime: LX.ago(20) });
      LX.putFile(w, '/srv/team/archiv/2026/q2/kassenbericht_q2.csv', 'monat;umsatz\napril;45100\n', { owner: 'mira', group: 'it', mode: 0o664, mtime: LX.ago(100) });
      dir(w, H + '/protokoll');
      put(w, H + '/protokoll/teil_a.txt', 'Protokoll Kundentermin Brunner – Teil A\nBegrüßung, Vorstellung des Azubis\n');
      put(w, H + '/protokoll/teil_b.txt', 'Teil B\nKassensystem: Bondrucker fällt morgens aus\n');
      put(w, H + '/protokoll/teil_c.txt', 'Teil C\nNächster Termin: Freitag, 10 Uhr\n');
    },
    checks: [
      { text: 'Eine Kopie des Q3-Kassenberichts liegt als <code>~/q3/kassenbericht_q3.csv</code> vor', fn: (w) => /september;49930/.test(Q.text(w, H + '/q3/kassenbericht_q3.csv') || '') && Q.isFile(w, '/srv/team/archiv/2026/q3/buchhaltung/kassenbericht_q3.csv') },
      { text: '<code>~/protokoll_komplett.txt</code> enthält die Teile A, B und C in dieser Reihenfolge', fn: (w) => { const t = Q.text(w, H + '/protokoll_komplett.txt') || ''; const s = ['a', 'b', 'c'].map(x => Q.text(w, H + '/protokoll/teil_' + x + '.txt')).join(''); return t.indexOf(s) === 0; } },
      { text: 'Am Ende von <code>~/protokoll_komplett.txt</code> steht zusätzlich eine Zeile mit <code>geprüft</code>', fn: (w) => { const L = Q.lines(Q.text(w, H + '/protokoll_komplett.txt')); return L.length > 6 && /geprüft/i.test(L[L.length - 1]); } },
      { text: '<code>~/telefon.txt</code> enthält Sophies Durchwahl', fn: (w) => /247/.test(Q.text(w, H + '/telefon.txt') || '') },
      { text: '<code>~/fehler_sync.txt</code> enthält genau die FEHLER-Zeilen aus <code>/var/log/kalle-sync.log</code>', fn: (w) => { const src = (Q.text(w, '/var/log/kalle-sync.log') || '').split('\n').filter(l => /FEHLER/.test(l)); const got = Q.lines(Q.text(w, H + '/fehler_sync.txt')); return got.length === src.length && got.every((l, i) => l === src[i].trim()); } }
    ],
    tips: [
      'Drei Werkzeuge helfen dir: <code>find</code> zum Suchen, <code>cat</code> mit Umleitungen zum Zusammensetzen und <code>finger</code> für Infos über Kolleg:innen. Mit <code>grep</code> filterst du Zeilen.',
      'Suche mit <code>find /srv/team -name "kassenbericht*"</code>. Merk dir: <code>&gt;</code> legt eine Datei neu an, <code>&gt;&gt;</code> hängt an. Auch die Ausgabe von <code>finger</code> oder <code>grep</code> kannst du mit <code>&gt;</code> in eine Datei schreiben.',
      '<code>mkdir ~/q3</code> · <code>cp /srv/team/archiv/2026/q3/buchhaltung/kassenbericht_q3.csv ~/q3/</code> · <code>cat ~/protokoll/teil_a.txt ~/protokoll/teil_b.txt ~/protokoll/teil_c.txt &gt; ~/protokoll_komplett.txt</code> · <code>echo "geprüft: azubi" &gt;&gt; ~/protokoll_komplett.txt</code> · <code>finger sophie &gt; ~/telefon.txt</code> · <code>grep FEHLER /var/log/kalle-sync.log &gt; ~/fehler_sync.txt</code>'
    ],
    reflect: { q: 'Du hättest beim Anhängen der Zeile »geprüft« versehentlich <code>&gt;</code> statt <code>&gt;&gt;</code> geschrieben. Was wäre passiert – und wie hättest du es reparieren können?', model: 'Die Datei wäre überschrieben worden und hätte nur noch die Zeile »geprüft« enthalten. Da die Teile A bis C noch existieren, hätte man den cat-Befehl wiederholen und die Zeile anschließend mit >> anhängen können. Ohne Originale wäre der Inhalt verloren gewesen.' }
  });

  P.push({
    id: 'u5', title: 'Server-Feuerwehr', lz: [5, 4, 2], chapter: 'k5',
    story: 'Alarm! korb-srv01 reagiert kaum noch, und auf <code>/srv</code> wird der Platz knapp. Finde die Ursachen und behebe sie. Vorher sicherst du noch schnell <code>~/wichtig</code>.',
    setup: (w) => {
      w.procs.push({ pid: 4401, user: 'azubi', cmd: 'stress-test --cpu 4 --timeout 0', cpu: 99.2, mem: 0.4, stat: 'R', tty: '?', start: '08:01', time: '43:12', vsz: 8292, rss: 1920, tag: 'stress' });
      w.procs.push({ pid: 4410, user: 'kalle', cmd: '/opt/alt/zombie-backup --loop', cpu: 61.7, mem: 8.8, stat: 'D', tty: '?', start: '08:02', time: '28:40', vsz: 512004, rss: 360448, tag: 'zb', ignoreTerm: true });
      w.procs.sort((a, b) => a.pid - b.pid);
      LX.ensureDir(w, '/srv/tmp_alt', { owner: 'kalle', group: 'it', mode: 0o2775, mtime: LX.ago(400) });
      LX.binFile(w, '/srv/tmp_alt/riesig.iso', 6442450944, { owner: 'kalle', group: 'it', mode: 0o664, mtime: LX.ago(400) });
      LX.binFile(w, '/srv/tmp_alt/noch_ein.iso', 2147483648, { owner: 'kalle', group: 'it', mode: 0o664, mtime: LX.ago(400) });
      let log = ''; const k = ['INFO', 'INFO', 'ERROR', 'INFO', 'WARN', 'ERROR', 'INFO'];
      for (let i = 0; i < 70; i++) log += '2026-10-21 0' + (7 + Math.floor(i / 30)) + ':' + String(i % 60).padStart(2, '0') + ' ' + k[i % k.length] + ' Webshop-Anfrage ' + (1000 + i * 7) + (k[i % k.length] === 'ERROR' ? ' fehlgeschlagen' : ' ok') + '\n';
      LX.putFile(w, '/var/log/app.log', log, { mode: 0o644, mtime: LX.ago(0, 8, 30) });
      dir(w, H + '/wichtig');
      put(w, H + '/wichtig/vertrag.txt', 'Wartungsvertrag Brunner\n');
      dir(w, H + '/wichtig/belege');
      put(w, H + '/wichtig/belege/beleg1.txt', 'Beleg 1\n');
      LX.updateDisks(w);
    },
    checks: [
      { text: '<code>~/wichtig</code> ist vollständig nach <code>~/wichtig.bak</code> kopiert', fn: (w) => Q.isFile(w, H + '/wichtig.bak/vertrag.txt') && Q.isFile(w, H + '/wichtig.bak/belege/beleg1.txt') },
      { text: 'Dein eigener Prozess <code>stress-test</code> ist beendet', fn: (w) => !Q.proc(w, 'stress') },
      { text: 'Kalles hängender Prozess <code>zombie-backup</code> ist beendet', fn: (w) => !Q.proc(w, 'zb') },
      { text: 'Das Verzeichnis <code>/srv/tmp_alt</code> ist gelöscht', fn: (w) => Q.gone(w, '/srv/tmp_alt') },
      { text: '<code>~/anzahl.txt</code> enthält die Anzahl der ERROR-Zeilen in <code>/var/log/app.log</code>', fn: (w) => { const n = (Q.text(w, '/var/log/app.log') || '').split('\n').filter(l => /ERROR/.test(l)).length; const m = /(\d+)/.exec(Q.text(w, H + '/anzahl.txt') || ''); return !!m && parseInt(m[1], 10) === n; } }
    ],
    tips: [
      'Gehe vor wie ein Arzt: erst untersuchen (<code>ps aux</code>, <code>df -h</code>, <code>du -sh</code>), dann behandeln. Sicherung zuerst!',
      'Verzeichnisse kopierst du mit <code>cp -r</code>. Prozesse beendest du mit <code>kill PID</code>; bei fremden Prozessen mit <code>sudo</code>, bei hängenden mit <code>-9</code>. Volle Verzeichnisse löscht <code>rm -r</code> – schau mit <code>ls -ld /srv</code> nach, ob du dort überhaupt löschen darfst. Zählen geht mit <code>grep -c</code> oder <code>| wc -l</code>.',
      '<code>cp -r ~/wichtig ~/wichtig.bak</code> · <code>ps aux | grep -E "stress|zombie"</code> · <code>kill 4401</code> · <code>sudo kill -9 4410</code> · <code>sudo rm -r /srv/tmp_alt</code> · <code>grep -c ERROR /var/log/app.log &gt; ~/anzahl.txt</code>'
    ],
    reflect: { q: 'Warum versucht man zuerst ein normales <code>kill</code> und greift erst danach zu <code>kill -9</code>?', model: 'Ein normales kill (TERM) gibt dem Prozess die Chance, sauber zu beenden: Dateien zu schließen, Puffer zu schreiben und Sperrdateien zu entfernen. kill -9 beendet ihn sofort; dabei können halb geschriebene Dateien oder Datenverlust entstehen. Deshalb ist -9 nur der letzte Ausweg.' }
  });

  P.push({
    id: 'u6', title: 'Konfig-Doktor', lz: [6], chapter: 'k6',
    story: 'Für den neuen Webshop-Dienst muss eine Konfigurationsdatei angepasst werden. Außerdem fehlt eine README und in einer Liste steckt eine Zeile zu viel.',
    setup: (w) => {
      LX.putFile(w, '/etc/korbwerk/app.conf', '# Webshop-Dienst Korbwerk\n[server]\nname=korbwerk-shop\nport=80\ndebug=true\n\n[datenbank]\nhost=192.168.50.20\nbenutzer=shop\n', { mode: 0o644, mtime: LX.ago(4) });
      put(w, H + '/liste.txt', 'Einkaufsliste IT\nPatchkabel 2 m\nLÖSCHEN: diese Zeile muss weg\nKabelbinder\nUSB-Sticks\n');
    },
    checks: [
      { text: '<code>~/README.txt</code> enthält die Zeilen <code>Server: korb-srv01</code> und <code>Admin: azubi</code>', fn: (w) => { const L = Q.lines(Q.text(w, H + '/README.txt')); return L.indexOf('Server: korb-srv01') >= 0 && L.indexOf('Admin: azubi') >= 0; } },
      { text: 'In <code>/etc/korbwerk/app.conf</code> steht <code>port=8080</code> statt <code>port=80</code>', fn: (w) => { const L = Q.lines(Q.text(w, '/etc/korbwerk/app.conf')); return L.indexOf('port=8080') >= 0 && L.indexOf('port=80') < 0; } },
      { text: 'In <code>/etc/korbwerk/app.conf</code> steht <code>debug=false</code>', fn: (w) => { const L = Q.lines(Q.text(w, '/etc/korbwerk/app.conf')); return L.indexOf('debug=false') >= 0 && L.indexOf('debug=true') < 0; } },
      { text: 'Alle übrigen Zeilen in <code>app.conf</code> sind beim Bearbeiten erhalten geblieben', fn: (w) => { const L = Q.lines(Q.text(w, '/etc/korbwerk/app.conf')); return (L.indexOf('port=8080') >= 0 || L.indexOf('debug=false') >= 0) && ['# Webshop-Dienst Korbwerk', '[server]', 'name=korbwerk-shop', '[datenbank]', 'host=192.168.50.20', 'benutzer=shop'].every(x => L.indexOf(x) >= 0) && L.length === 8; } },
      { text: 'In <code>~/liste.txt</code> fehlt nur die LÖSCHEN-Zeile', fn: (w) => { const L = Q.lines(Q.text(w, H + '/liste.txt')); return !L.some(l => /LÖSCHEN/.test(l)) && ['Einkaufsliste IT', 'Patchkabel 2 m', 'Kabelbinder', 'USB-Sticks'].every(x => L.indexOf(x) >= 0); } }
    ],
    tips: [
      'Alle drei Aufgaben erledigst du mit nano. Achte darauf, wem die Dateien gehören – das entscheidet, ob du sudo brauchst.',
      'Neue Datei: <code>nano ~/README.txt</code>. Systemdatei: <code>sudo nano /etc/korbwerk/app.conf</code>. Zeile löschen: Cursor auf die Zeile, dann <kbd>Strg</kbd>+<kbd>K</kbd>. Speichern mit <kbd>Strg</kbd>+<kbd>O</kbd>, Beenden mit <kbd>Strg</kbd>+<kbd>X</kbd>.',
      'In app.conf: Cursor hinter <code>port=80</code> setzen, <code>80</code> tippen, sodass <code>port=8080</code> entsteht. Bei <code>debug=true</code> das Wort true löschen und false schreiben. Suchen geht mit <kbd>F6</kbd>.'
    ],
    reflect: { q: 'Warum ist es eine gute Idee, vor dem Bearbeiten einer Konfigurationsdatei eine Kopie anzulegen, z. B. mit <code>sudo cp app.conf app.conf.bak</code>?', model: 'Ein Tippfehler in einer Konfiguration kann einen Dienst lahmlegen. Mit der Kopie lässt sich der funktionierende Stand sofort wiederherstellen. Außerdem kann man mit der Sicherung später vergleichen, was genau geändert wurde.' }
  });

  P.push({
    id: 'u7', title: 'Der Archivar', lz: [7], chapter: 'k7',
    story: 'Projektabschluss! Alles soll ordentlich gepackt, alte Logs geschrumpft und zwei Lieferungen ausgepackt werden.',
    setup: (w) => {
      dir(w, H + '/projekt');
      put(w, H + '/projekt/plan.txt', LX.bigText('plan', 40));
      put(w, H + '/projekt/ergebnis.txt', LX.bigText('ergebnis', 30));
      dir(w, H + '/projekt/skizzen');
      LX.binFile(w, H + '/projekt/skizzen/rack.png', 140200, Object.assign({}, A));
      dir(w, H + '/logs');
      put(w, H + '/logs/alt.log', LX.bigText('alt', 200));
      dir(w, H + '/bilder');
      ['teamfoto.jpg', 'serverraum.jpg', 'feier.jpg'].forEach(n => LX.binFile(w, H + '/bilder/' + n, 640000 + n.length * 1111, Object.assign({}, A)));
      const u = LX.putFile(w, '/srv/austausch/update.tar.xz', '', { owner: 'mira', group: 'it', mode: 0o644, mtime: LX.ago(1) });
      u.blob = LX.tarBlob('update', [['version.txt', 'Version 2.4.1\n'], ['changelog.txt', '- Fehler im Backup behoben\n- Neue Logrotation\n'], ['install.sh', '#!/bin/bash\necho "Installiere Update ..."\n', 0o755]], 'xz', 'mira');
      const z = LX.putFile(w, '/srv/austausch/kunde.zip', '', { owner: 'sophie', group: 'sophie', mode: 0o644, mtime: LX.ago(2) });
      z.blob = LX.zipBlob('kunde', [['anfrage.txt', 'Anfrage Autohaus Seidel: 3 neue Arbeitsplätze\n'], ['grundriss.pdf', '', 220334]], 'sophie');
    },
    checks: [
      { text: '<code>~/projekt.tar.gz</code> ist ein gzip-komprimiertes tar-Archiv mit dem Verzeichnis projekt', fn: (w) => { const t = Q.tarOf(w, H + '/projekt.tar.gz'); return !!t && t.chain.length === 1 && t.chain[0] === 'gz' && t.entries.some(e => /(^|\/)projekt\/plan\.txt$/.test(e.path)) && t.entries.some(e => /projekt\/skizzen\/rack\.png$/.test(e.path)); } },
      { text: '<code>~/logs/alt.log</code> ist mit bzip2 komprimiert (nur noch <code>alt.log.bz2</code> vorhanden)', fn: (w) => { const b = Q.blob(w, H + '/logs/alt.log.bz2'); return !!b && b.kind === 'bz2' && Q.gone(w, H + '/logs/alt.log'); } },
      { text: 'Das Update aus <code>/srv/austausch/update.tar.xz</code> ist nach <code>~/update</code> entpackt', fn: (w) => Q.isFile(w, H + '/update/version.txt') || Q.isFile(w, H + '/update/update/version.txt') },
      { text: '<code>~/bilder.zip</code> enthält alle drei Bilder', fn: (w) => { const b = Q.blob(w, H + '/bilder.zip'); return !!b && b.kind === 'zip' && ['teamfoto.jpg', 'serverraum.jpg', 'feier.jpg'].every(n => b.entries.some(e => e.path.split('/').pop() === n)); } },
      { text: 'Die Kundenanfrage aus <code>/srv/austausch/kunde.zip</code> ist entpackt (<code>~/kunde/anfrage.txt</code>)', fn: (w) => Q.isFile(w, H + '/kunde/anfrage.txt') }
    ],
    tips: [
      'Überlege für jede Aufgabe: Archivieren, komprimieren oder beides? Und welches Format ist gefragt – gz, bz2, xz oder zip?',
      'Erstellen: <code>tar -c…f</code> mit z (gzip), j (bzip2) oder J (xz). Entpacken: <code>tar -x…f</code>. Einzelne Dateien komprimiert <code>bzip2</code> direkt. ZIP: <code>zip -r</code> und <code>unzip</code>. Achte darauf, in welchem Verzeichnis du gerade stehst!',
      '<code>cd</code> · <code>tar -czvf projekt.tar.gz projekt</code> · <code>bzip2 logs/alt.log</code> · <code>tar -xJvf /srv/austausch/update.tar.xz</code> · <code>zip -r bilder.zip bilder</code> · <code>unzip /srv/austausch/kunde.zip</code>'
    ],
    reflect: { q: 'Ein Kollege schickt dir <code>daten.tar.gz</code>. Du entpackst es direkt in deinem Home-Verzeichnis und überschreibst dabei versehentlich eine eigene Datei. Wie hättest du das vermeiden können?', model: 'Vor dem Entpacken mit »tar -tzvf daten.tar.gz« den Inhalt ansehen. Oder in ein eigenes, leeres Verzeichnis entpacken, z. B. mit »mkdir ~/neu && tar -xzvf daten.tar.gz -C ~/neu«. tar überschreibt vorhandene Dateien ohne Rückfrage.' }
  });

  P.push({
    id: 'u8', title: 'Die Außenstelle', lz: [8], chapter: 'k8',
    story: 'Korbwerk hat eine Außenstelle eröffnet. Der dortige Server wurde frisch installiert und hat noch keine Netzwerkkonfiguration. Den Netzplan findest du in deinem Home-Verzeichnis.',
    setup: (w) => {
      w.hostname = 'korb-srv02';
      LX.putFile(w, '/etc/hostname', 'korb-srv02\n');
      w.net.segments.lan = { net: '172.16.10.0', prefix: 24, hosts: { '172.16.10.254': { name: 'router-ast', router: true, lat: 0.4 }, '172.16.10.5': { name: 'nas-ast', lat: 0.3 }, '172.16.10.30': { name: 'drucker', lat: 0.9 } } };
      LX.resetNet(w, { up: false });
      put(w, H + '/netzplan_aussenstelle.txt', 'Netzplan Außenstelle (Stand 10/2026)\n\nNetz:            172.16.10.0/24\nRouter/Gateway:  172.16.10.254\nNAS:             172.16.10.5\nkorb-srv02:      172.16.10.20\nDNS:             1.1.1.1 (extern)\nSchnittstelle:   enp0s3\n');
    },
    checks: [
      { text: 'Schnittstelle <code>enp0s3</code> ist eingeschaltet', fn: (w) => !!Q.iface(w, 'enp0s3').up },
      { text: '<code>enp0s3</code> hat die Adresse aus dem Netzplan mit korrekter Präfixlänge', fn: (w) => Q.hasAddr(w, 'enp0s3', '172.16.10.20', 24) },
      { text: 'Das Standard-Gateway aus dem Netzplan ist eingetragen', fn: (w) => Q.defaultVia(w, '172.16.10.254') },
      { text: 'Erfolgreicher Ping an das NAS', fn: (w) => Q.pinged(w, '172.16.10.5') },
      { text: 'Erfolgreicher Ping an das Gateway', fn: (w) => Q.pinged(w, '172.16.10.254') },
      { text: 'Erfolgreicher Ping an den externen DNS-Server', fn: (w) => Q.pinged(w, '1.1.1.1') }
    ],
    tips: [
      'Lies zuerst den Netzplan. Arbeite dann von innen nach außen: Schnittstelle → Adresse → eigenes Netz testen → Gateway → Internet testen.',
      'Du brauchst <code>ip link set … up</code>, <code>ip addr add …/24 dev …</code> und <code>ip route add default via …</code> – jeweils mit sudo. Teste nach jedem Schritt mit <code>ping -c 2</code>.',
      '<code>cat netzplan_aussenstelle.txt</code> · <code>sudo ip link set enp0s3 up</code> · <code>sudo ip addr add 172.16.10.20/24 dev enp0s3</code> · <code>ping -c 2 172.16.10.5</code> · <code>sudo ip route add default via 172.16.10.254</code> · <code>ping -c 2 172.16.10.254</code> · <code>ping -c 2 1.1.1.1</code>'
    ],
    reflect: { q: 'Ein Kollege meldet: »Ping an das NAS geht, aber nicht an 1.1.1.1.« Welche zwei Ursachen prüfst du zuerst und mit welchen Befehlen?', model: 'Erstens das Standard-Gateway: Fehlt die default-Route (»ip r«), kennt der Rechner keinen Weg aus dem eigenen Netz. Zweitens, ob das Gateway selbst erreichbar ist (»ping 172.16.10.254«); ist es falsch eingetragen oder aus, scheitert jeder externe Ping. »ip route get 1.1.1.1« zeigt, welchen Weg der Rechner wählen würde.' }
  });
})(typeof window !== 'undefined' ? window : globalThis);
