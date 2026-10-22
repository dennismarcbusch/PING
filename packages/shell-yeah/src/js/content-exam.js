/* Inhalte – Teil ③ Kompetenznachweis: Teil A (21 Prüfpunkte am Server der Bäckerei Brunner), Teil B (Fragenpool) */
(function (G) {
  'use strict';
  const LX = (G.LX = G.LX || {});
  const Q = LX.q;
  const H = '/home/azubi';
  const PDF = ['re_2026-0901.pdf', 're_2026-0902.pdf', 're_2026-0915.pdf', 're_2026-1003.pdf', 're_2026-1017.pdf'];
  const JPG = ['theke.jpg', 'brezn.jpg', 'ofen.jpg'];
  const fehlerZeilen = (w) => (Q.text(w, '/var/log/kasse.log') || '').split('\n').filter(l => /FEHLER/.test(l));

  LX.EXAM = {
    intro: '<p>Korbwerk betreut die IT der <b>Bäckerei Brunner</b>. Frau Brunner hat einen Auftrag geschickt. Du bist per SSH auf ihrem Server <b>brunner-srv</b> angemeldet. Dein Passwort für sudo lautet <b>brot2026</b>.</p><p>Erledige die Punkte der Auftragsliste in beliebiger Reihenfolge. Es gibt keine Tipps und keine Zwischenkontrolle. Gewertet wird der Zustand des Servers, wenn du <b>Teil A abgibst</b>. Der Weg dorthin ist dir überlassen – auch man-Seiten sind erlaubt.</p>',
    tasksA: [
      { id: 'a1', lz: 2, text: 'Lege das Verzeichnis <code>~/kunde/rechnungen</code> an.', fn: (w) => Q.isDir(w, H + '/kunde/rechnungen') },
      { id: 'a2', lz: 2, text: 'Lege das Verzeichnis <code>~/kunde/bilder</code> an.', fn: (w) => Q.isDir(w, H + '/kunde/bilder') },
      { id: 'a3', lz: 2, text: 'Verschiebe alle PDF-Rechnungen aus <code>~/eingang</code> nach <code>~/kunde/rechnungen</code>.', fn: (w) => PDF.every(f => Q.isFile(w, H + '/kunde/rechnungen/' + f)) && !Q.children(w, H + '/eingang').some(f => /\.pdf$/.test(f)) },
      { id: 'a4', lz: 2, text: 'Verschiebe alle JPG-Bilder aus <code>~/eingang</code> nach <code>~/kunde/bilder</code>.', fn: (w) => JPG.every(f => Q.isFile(w, H + '/kunde/bilder/' + f)) && !Q.children(w, H + '/eingang').some(f => /\.jpg$/.test(f)) },
      { id: 'a5', lz: 2, text: 'Lösche alle <code>.tmp</code>-Dateien in <code>~/eingang</code>.', fn: (w) => Q.isDir(w, H + '/eingang') && !Q.children(w, H + '/eingang').some(f => /\.tmp$/.test(f)) && Q.isFile(w, H + '/eingang/lies_mich.txt') },
      { id: 'a6', lz: 2, text: 'Entferne das leere Verzeichnis <code>~/eingang/alt</code>.', fn: (w) => Q.gone(w, H + '/eingang/alt') && Q.isDir(w, H + '/eingang') },
      { id: 'a7', lz: 3, text: 'Setze die Rechte von <code>~/kasse.sh</code> auf <code>rwxr-x---</code>.', fn: (w) => Q.mode(w, H + '/kasse.sh') === 0o750 },
      { id: 'a8', lz: 3, text: 'Das Verzeichnis <code>~/kunde/rechnungen</code> soll der Gruppe <code>buchhaltung</code> gehören.', fn: (w) => Q.group(w, H + '/kunde/rechnungen') === 'buchhaltung' },
      { id: 'a9', lz: 3, text: 'Nur du darfst <code>~/notizen/privat.txt</code> lesen und ändern – niemand sonst hat irgendein Recht.', fn: (w) => Q.mode(w, H + '/notizen/privat.txt') === 0o600 },
      { id: 'a10', lz: 4, text: 'Irgendwo unter <code>/srv</code> liegt der Z-Bon für September (<code>z-bon_2026-09.csv</code>). Lege eine Kopie in <code>~/kunde</code> ab.', fn: (w) => /2026-09-30/.test(Q.text(w, H + '/kunde/z-bon_2026-09.csv') || '') },
      { id: 'a11', lz: 4, text: 'Speichere alle Zeilen aus <code>/var/log/kasse.log</code>, die <code>FEHLER</code> enthalten, in <code>~/fehler.txt</code>.', fn: (w) => { const s = fehlerZeilen(w); const g = Q.lines(Q.text(w, H + '/fehler.txt')); return s.length > 0 && g.length === s.length && g.every((l, i) => l === s[i].trim()); } },
      { id: 'a12', lz: 4, text: 'Schreibe die <b>Anzahl</b> dieser Fehlerzeilen in <code>~/anzahl.txt</code>.', fn: (w) => { const m = /(\d+)/.exec(Q.text(w, H + '/anzahl.txt') || ''); return !!m && parseInt(m[1], 10) === fehlerZeilen(w).length; } },
      { id: 'a13', lz: 5, text: 'Der Prozess <code>kasse-sync</code> hängt und legt den Server lahm. Beende ihn – der Druckdienst muss weiterlaufen.', fn: (w) => !Q.proc(w, 'kasse-sync') && !!Q.proc(w, 'druck') },
      { id: 'a14', lz: 5, text: 'Das Verzeichnis <code>/srv/altlasten</code> wird nicht mehr gebraucht. Lösche es vollständig.', fn: (w) => Q.gone(w, '/srv/altlasten') && Q.isDir(w, '/srv/kasse') },
      { id: 'a15', lz: 6, text: 'Stelle in <code>/etc/kasse/kasse.conf</code> den Wert <code>modus=test</code> auf <code>modus=live</code> um. Alle anderen Zeilen bleiben erhalten.', fn: (w) => { const L = Q.lines(Q.text(w, '/etc/kasse/kasse.conf')); return L.indexOf('modus=live') >= 0 && L.indexOf('modus=test') < 0 && ['filiale=Hauptstraße 12', 'waehrung=EUR', 'bondrucker=10.20.30.41', '[drucker]'].every(x => L.indexOf(x) >= 0); } },
      { id: 'a16', lz: 6, text: 'Lege mit nano die Datei <code>~/kunde/notiz.txt</code> an. Sie soll den Text <code>Backup erledigt</code> enthalten.', fn: (w) => /backup erledigt/i.test(Q.text(w, H + '/kunde/notiz.txt') || '') },
      { id: 'a17', lz: 7, text: 'Sichere das gesamte Verzeichnis <code>~/kunde</code> als gzip-komprimiertes tar-Archiv <code>~/sicherung.tar.gz</code>.', fn: (w) => { const t = Q.tarOf(w, H + '/sicherung.tar.gz'); return !!t && t.chain.length === 1 && t.chain[0] === 'gz' && t.entries.some(e => /(^|\/)kunde\/?$/.test(e.path)); } },
      { id: 'a18', lz: 7, text: 'Entpacke die Lieferung <code>/srv/austausch/lieferung.tar.bz2</code> in dein Home-Verzeichnis.', fn: (w) => Q.isFile(w, H + '/lieferung/mehl_bestellung.txt') || Q.isFile(w, H + '/lieferung/lieferung/mehl_bestellung.txt') },
      { id: 'a19', lz: 7, text: 'Frau Brunner nutzt Windows: Packe alle Bilder aus <code>~/kunde/bilder</code> in das ZIP-Archiv <code>~/bilder.zip</code>.', fn: (w) => { const b = Q.blob(w, H + '/bilder.zip'); return !!b && b.kind === 'zip' && JPG.every(n => b.entries.some(e => e.type === 'f' && e.path.split('/').pop() === n)); } },
      { id: 'a20', lz: 8, text: 'Netzwerk: <code>enp0s3</code> aktivieren, Adresse <code>10.20.30.15/24</code> zuweisen und <code>10.20.30.1</code> als Standard-Gateway eintragen.', fn: (w) => !!Q.iface(w, 'enp0s3').up && Q.hasAddr(w, 'enp0s3', '10.20.30.15', 24) && Q.defaultVia(w, '10.20.30.1') },
      { id: 'a21', lz: 8, text: 'Weise per ping nach, dass der Kassenrechner <code>10.20.30.40</code> und der DNS-Server <code>9.9.9.9</code> erreichbar sind.', fn: (w) => Q.pinged(w, '10.20.30.40') && Q.pinged(w, '9.9.9.9') && LX.netReachable(w, '10.20.30.40') && LX.netReachable(w, '9.9.9.9') }
    ],
    // Teil B: je Lernziel so viele Fragen ziehen
    draw: { 1: 1, 2: 2, 3: 2, 4: 2, 5: 1, 6: 1, 7: 1, 8: 2 },
    pool: []
  };

  const P = LX.EXAM.pool;
  const T = (s) => s; // Terminaltext

  // ---------- LZ 1 ----------
  P.push({ id: 'b101', lz: 1, type: 'mc', q: 'Du stehst in <code>/home/azubi/ablage</code> und gibst <code>cd ../../mira</code> ein. Wo bist du danach?', a: ['/home/mira', '/mira', '/home/azubi/mira', 'Fehlermeldung, der Pfad ist ungültig'], c: 0 });
  P.push({ id: 'b102', lz: 1, type: 'term', q: 'Welche Ausgabe liefert der letzte Befehl?', term: T('$ cd /var/log\n$ cd ..\n$ cd log/../../etc\n$ pwd'), a: ['/etc', '/var/etc', '/var/log/etc', '/log/etc'], c: 0 });
  P.push({ id: 'b103', lz: 1, type: 'match', q: 'Ordne jedem Befehl seine Wirkung zu.', pairs: [['ls -a', 'zeigt auch versteckte Dateien'], ['ls -l', 'zeigt Rechte, Eigentümer und Größe'], ['cat datei', 'gibt den Inhalt komplett aus'], ['less datei', 'zeigt den Inhalt seitenweise an']] });
  P.push({ id: 'b104', lz: 1, type: 'mc', q: 'Woran erkennst du einen absoluten Pfad?', a: ['Er beginnt mit einem Schrägstrich /', 'Er endet mit einem Schrägstrich /', 'Er enthält mindestens zwei Verzeichnisse', 'Er beginnt mit ./'], c: 0 });
  P.push({ id: 'b105', lz: 1, type: 'hot', q: 'Klicke auf den Teil des Prompts, der das aktuelle Verzeichnis angibt.', lines: [[['mira', 'user'], '@', ['nas01', 'host'], ':', ['/srv/daten', 'path'], ['$', 'sign'], ' ']], c: 'path' });
  P.push({ id: 'b106', lz: 1, type: 'mc', q: 'Du liest eine Handbuchseite mit <code>man</code>. Mit welcher Taste suchst du darin nach einem Wort?', a: ['/', 'Strg+F', 's', 'Strg+W'], c: 0 });

  // ---------- LZ 2 ----------
  P.push({ id: 'b201', lz: 2, type: 'term', q: 'Welche Dateien löscht der Befehl <code>rm bericht?.txt</code>?', term: T('$ ls\nbericht1.txt  bericht10.txt  bericht2.txt  bericht.txt  bild.png'), a: ['bericht1.txt und bericht2.txt', 'bericht1.txt, bericht2.txt und bericht10.txt', 'alle vier bericht-Dateien', 'nur bericht.txt'], c: 0 });
  P.push({ id: 'b202', lz: 2, type: 'num', q: 'Wie viele Dateien listet <code>ls *.log</code> auf?', term: T('$ ls\napp.log  app.log.1  fehler.log  log.txt  sync.log  notizen'), ans: 3 });
  P.push({ id: 'b203', lz: 2, type: 'match', q: 'Ordne jedem Befehl seine Wirkung zu.', pairs: [['rmdir ordner', 'löscht ein leeres Verzeichnis'], ['rm -r ordner', 'löscht ein Verzeichnis samt Inhalt'], ['mkdir -p a/b/c', 'legt eine ganze Verzeichniskette an'], ['touch datei', 'legt eine leere Datei an']] });
  P.push({ id: 'b204', lz: 2, type: 'mc', q: 'Das Verzeichnis <code>sicherung</code> existiert bereits. Was bewirkt <code>cp -r projekt sicherung</code>?', a: ['projekt wird als sicherung/projekt hineinkopiert', 'sicherung wird durch projekt ersetzt', 'Fehlermeldung, das Ziel existiert', 'Nur die Dateien aus projekt landen direkt in sicherung'], c: 0 });
  P.push({ id: 'b205', lz: 2, type: 'mc', q: 'Was passiert bei <code>mv a.txt b.txt</code>, wenn <code>b.txt</code> schon existiert?', a: ['b.txt wird ohne Rückfrage überschrieben', 'mv fragt automatisch nach', 'Es entsteht b.txt.1', 'mv bricht mit einer Fehlermeldung ab'], c: 0 });
  P.push({ id: 'b206', lz: 2, type: 'mc', q: 'Mit welchem Befehl kopierst du alle Dateien mit der Endung <code>.odt</code> aus <code>/srv/vorlagen</code> in dein Home-Verzeichnis?', a: ['cp /srv/vorlagen/*.odt ~', 'cp ~ /srv/vorlagen/*.odt', 'mv /srv/vorlagen/*.odt ~', 'cp -r /srv/vorlagen ~/*.odt'], c: 0 });

  // ---------- LZ 3 ----------
  P.push({ id: 'b301', lz: 3, type: 'hot', q: 'Klicke auf die Rechte, die für Mitglieder der Gruppe <code>it</code> gelten.', lines: [[['d', 'type'], ['rwx', 'u'], ['r-x', 'g'], ['---', 'o'], ' 2 ', ['mira', 'owner'], ' ', ['it', 'group'], ' 4096 21. Okt 09:12 projekte']], c: 'g' });
  P.push({ id: 'b302', lz: 3, type: 'num', q: 'Welche Zahl gibst du bei <code>chmod</code> an, um die Rechte <code>rwxr-xr--</code> zu setzen?', ans: 754 });
  P.push({ id: 'b303', lz: 3, type: 'mc', q: 'Welcher Befehl macht <code>skript.sh</code> für den Eigentümer ausführbar, ohne andere Rechte zu verändern?', a: ['chmod u+x skript.sh', 'chmod 700 skript.sh', 'chmod a+x skript.sh', 'chown +x skript.sh'], c: 0 });
  P.push({ id: 'b304', lz: 3, type: 'term', q: 'Darf azubi die Datei <code>bericht.txt</code> lesen?', term: T('$ ls -l bericht.txt\n-rw-r----- 1 mira it 812 21. Okt 09:12 bericht.txt\n$ whoami\nazubi\n$ groups\nazubi sudo it'), a: ['Ja, über die Gruppe it', 'Nein, nur mira darf lesen', 'Nur mit sudo', 'Ja, weil alle Benutzer lesen dürfen'], c: 0 });
  P.push({ id: 'b305', lz: 3, type: 'match', q: 'Ordne jeder Oktalzahl die passenden Rechte zu.', pairs: [['644', 'rw-r--r--'], ['600', 'rw-------'], ['755', 'rwxr-xr-x'], ['750', 'rwxr-x---']] });
  P.push({ id: 'b306', lz: 3, type: 'mc', q: 'Du gibst <code>sudo ls /root</code> ein. Nach welchem Passwort wird gefragt?', a: ['Nach deinem eigenen Passwort', 'Nach dem Passwort von root', 'Nach gar keinem', 'Nach dem Passwort der Gruppe sudo'], c: 0 });

  // ---------- LZ 4 ----------
  P.push({ id: 'b401', lz: 4, type: 'mc', q: 'Wie findest du alle Dateien unterhalb von <code>/etc</code>, deren Name auf <code>.conf</code> endet?', a: ['find /etc -name "*.conf"', 'grep .conf /etc', 'ls /etc | find conf', 'find "*.conf" /etc'], c: 0 });
  P.push({ id: 'b402', lz: 4, type: 'term', q: 'Was bedeutet die Ausgabe <code>7</code>?', term: T('$ grep -c FEHLER app.log\n7'), a: ['7 Zeilen in app.log enthalten FEHLER', 'Das Wort FEHLER steht in Zeile 7', 'Es gibt 7 Logdateien', 'grep hat 7 Fehler gefunden und repariert'], c: 0 });
  P.push({ id: 'b403', lz: 4, type: 'match', q: 'Ordne jedem Zeichen seine Wirkung zu.', pairs: [['>', 'leitet in eine Datei um und überschreibt sie'], ['>>', 'hängt an das Ende einer Datei an'], ['2>/dev/null', 'verwirft Fehlermeldungen'], ['|', 'gibt die Ausgabe an den nächsten Befehl weiter']] });
  P.push({ id: 'b404', lz: 4, type: 'mc', q: 'Was steht nach <code>cat a.txt b.txt &gt; c.txt</code> in <code>c.txt</code>?', a: ['Erst der Inhalt von a.txt, dann der von b.txt', 'Nur der Inhalt von b.txt', 'Die Dateinamen a.txt und b.txt', 'Nichts, cat kann nur eine Datei lesen'], c: 0 });
  P.push({ id: 'b405', lz: 4, type: 'mc', q: 'Was zeigt <code>grep -v INFO server.log</code>?', a: ['Alle Zeilen, die INFO nicht enthalten', 'Alle Zeilen mit INFO', 'Die Anzahl der INFO-Zeilen', 'Die Version von grep'], c: 0 });
  P.push({ id: 'b406', lz: 4, type: 'num', q: 'Welche Zahl gibt der letzte Befehl aus?', term: T('$ cat dienst.log\n08:00 START\n08:05 WARN Speicher knapp\n08:07 INFO Anfrage\n08:11 WARN Antwort langsam\n08:12 INFO Anfrage\n08:20 ERROR Abbruch\n08:21 WARN Neustart\n$ grep WARN dienst.log | wc -l'), ans: 3 });

  // ---------- LZ 5 ----------
  P.push({ id: 'b501', lz: 5, type: 'hot', q: 'Klicke auf die PID des Prozesses, der die meiste CPU-Leistung verbraucht.', lines: [
    ['USER         PID %CPU %MEM COMMAND'],
    ['root           ', ['1', '1'], '  0.0  0.3 /sbin/init'],
    ['root         ', ['845', '845'], '  0.0  0.2 sshd: /usr/sbin/sshd -D'],
    ['kassens+    ', ['2877', '2877'], ' 88.4  3.9 /usr/local/bin/kasse-sync --watch'],
    ['kassens+    ', ['2903', '2903'], '  0.3  1.1 /usr/local/bin/kasse-druckdienst'],
    ['azubi       ', ['3112', '3112'], '  0.0  0.1 -bash']], c: '2877' });
  P.push({ id: 'b502', lz: 5, type: 'mc', q: 'Was unterscheidet <code>kill -9 PID</code> von <code>kill PID</code>?', a: ['-9 beendet den Prozess sofort, ohne dass er aufräumen kann', '-9 beendet neun Prozesse auf einmal', '-9 pausiert den Prozess nur', 'Es gibt keinen Unterschied'], c: 0 });
  P.push({ id: 'b503', lz: 5, type: 'term', q: 'Welches Dateisystem wird bald voll sein?', term: T('$ df -h\nDateisystem Größe Benutzt Verf. Verw% Eingehängt auf\n/dev/sda2     40G    8,8G   29G   24% /\n/dev/sda1    1,1G    6,1M  1,1G    1% /boot/efi\n/dev/sdb1    9,8G    9,2G  110M   99% /srv\ntmpfs        392M    1,3M  390M    1% /run'), a: ['Das unter /srv eingehängte', 'Das Wurzeldateisystem /', 'Das unter /boot/efi eingehängte', 'tmpfs unter /run'], c: 0 });
  P.push({ id: 'b504', lz: 5, type: 'mc', q: 'Bei <code>ps aux | grep nginx</code> erscheint auch eine Zeile mit <code>grep --color=auto nginx</code>. Warum?', a: ['Der grep-Prozess läuft gleichzeitig und enthält selbst das Wort nginx', 'nginx hat grep gestartet', 'Das ist ein Fehler in ps', 'grep zeigt immer sich selbst an'], c: 0 });
  P.push({ id: 'b505', lz: 5, type: 'num', q: 'Wie viel Prozent des Dateisystems unter <code>/home</code> sind belegt? (Zahl ohne %)', term: T('$ df -h /home\nDateisystem Größe Benutzt Verf. Verw% Eingehängt auf\n/dev/sdc1     98G     87G  6,1G   94% /home'), ans: 94 });
  P.push({ id: 'b506', lz: 5, type: 'mc', q: 'Du willst einen Prozess von Benutzer kalle beenden und erhältst »Die Operation ist nicht erlaubt«. Was ist die Lösung?', a: ['sudo kill PID', 'kill -9 PID ohne sudo', 'rm PID', 'chmod 777 PID'], c: 0 });

  // ---------- LZ 6 ----------
  P.push({ id: 'b601', lz: 6, type: 'mc', q: 'Mit welcher Tastenkombination speicherst du in nano?', a: ['Strg+O', 'Strg+S nur unter Windows', 'Strg+X', 'Esc :w'], c: 0 });
  P.push({ id: 'b602', lz: 6, type: 'match', q: 'Ordne jeder nano-Tastenkombination ihre Funktion zu.', pairs: [['^K', 'Zeile ausschneiden'], ['^U', 'Ausgeschnittenes einfügen'], ['^X', 'nano beenden'], ['^W', 'Text suchen']] });
  P.push({ id: 'b603', lz: 6, type: 'mc', q: 'Wie bearbeitest du als normaler Benutzer die Systemdatei <code>/etc/hosts</code>?', a: ['sudo nano /etc/hosts', 'nano sudo /etc/hosts', 'nano -root /etc/hosts', 'chmod 777 /etc/hosts && nano /etc/hosts'], c: 0 });
  P.push({ id: 'b604', lz: 6, type: 'term', q: 'nano zeigt beim Öffnen diese Meldung. Was ist das sinnvollste Vorgehen?', term: T('[ Datei »/etc/kasse/kasse.conf« ist nicht schreibbar ]'), a: ['nano beenden und die Datei mit sudo nano erneut öffnen', 'Die Änderungen machen und mit Strg+O speichern', 'Die Datei mit rm löschen und neu anlegen', 'Mit Strg+K die Meldung ausschneiden'], c: 0 });
  P.push({ id: 'b605', lz: 6, type: 'mc', q: 'Was bedeutet das Zeichen <code>^</code> in der Hilfeleiste von nano?', a: ['Die Strg-Taste', 'Die Umschalttaste', 'Die Alt-Taste', 'Die Taste ^ auf der Tastatur'], c: 0 });
  P.push({ id: 'b606', lz: 6, type: 'mc', q: 'Du drückst nach Änderungen Strg+X und beantwortest die Frage »Geänderten Puffer speichern?« mit N. Was passiert?', a: ['nano wird beendet, die Änderungen gehen verloren', 'nano speichert trotzdem', 'nano bleibt geöffnet', 'Die Datei wird gelöscht'], c: 0 });

  // ---------- LZ 7 ----------
  P.push({ id: 'b701', lz: 7, type: 'mc', q: 'Wie erstellst du aus dem Verzeichnis <code>projekt</code> ein gzip-komprimiertes Archiv?', a: ['tar -czvf projekt.tar.gz projekt', 'tar -xzvf projekt.tar.gz projekt', 'gzip projekt', 'tar -czvf projekt projekt.tar.gz'], c: 0 });
  P.push({ id: 'b702', lz: 7, type: 'match', q: 'Ordne jedem Archiv den passenden Befehl zum Entpacken zu.', pairs: [['daten.tar.gz', 'tar -xzvf daten.tar.gz'], ['daten.tar.bz2', 'tar -xjvf daten.tar.bz2'], ['daten.tar.xz', 'tar -xJvf daten.tar.xz'], ['daten.zip', 'unzip daten.zip']] });
  P.push({ id: 'b703', lz: 7, type: 'term', q: 'Warum klappt das nicht?', term: T('$ gzip fotos\ngzip: fotos is a directory -- ignored'), a: ['gzip komprimiert nur einzelne Dateien – Verzeichnisse erst mit tar bündeln', 'Der Ordner ist schreibgeschützt', 'gzip braucht sudo', 'Der Name muss auf .gz enden'], c: 0 });
  P.push({ id: 'b704', lz: 7, type: 'term', q: 'Welche Datei liegt nach diesem Befehl im Verzeichnis?', term: T('$ ls\nbericht.txt\n$ gzip -v bericht.txt\nbericht.txt:\t 62.3% -- replaced with bericht.txt.gz'), a: ['nur bericht.txt.gz', 'bericht.txt und bericht.txt.gz', 'nur bericht.txt', 'bericht.tar.gz'], c: 0 });
  P.push({ id: 'b705', lz: 7, type: 'mc', q: 'Was unterscheidet <code>tar</code> von <code>zip</code>?', a: ['tar bündelt nur, zip bündelt und komprimiert', 'zip bündelt nur, tar komprimiert immer', 'tar funktioniert nur unter Windows', 'Es gibt keinen Unterschied'], c: 0 });
  P.push({ id: 'b706', lz: 7, type: 'mc', q: 'Wie entpackst du <code>archiv.tar.gz</code> in das Verzeichnis <code>/tmp/test</code>?', a: ['tar -xzvf archiv.tar.gz -C /tmp/test', 'tar -czvf archiv.tar.gz /tmp/test', 'gunzip archiv.tar.gz /tmp/test', 'tar -xzvf /tmp/test archiv.tar.gz'], c: 0 });

  // ---------- LZ 8 ----------
  P.push({ id: 'b801', lz: 8, type: 'hot', q: 'Klicke auf die IPv4-Adresse der Netzwerkkarte.', lines: [
    ['1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue ', ['state UNKNOWN', 'lostate']],
    ['    inet ', ['127.0.0.1/8', 'lo'], ' scope host lo'],
    ['2: ', ['enp0s3', 'dev'], ': <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel ', ['state UP', 'state']],
    ['    link/ether ', ['52:54:00:9b:12:e4', 'mac'], ' brd ff:ff:ff:ff:ff:ff'],
    ['    inet ', ['10.20.30.15/24', 'ip'], ' scope global enp0s3'],
    ['    inet6 ', ['fe80::5054:ff:fe9b:12e4/64', 'v6'], ' scope link']], c: 'ip' });
  P.push({ id: 'b802', lz: 8, type: 'mc', q: 'Mit welchem Befehl trägst du <code>10.0.0.1</code> als Standard-Gateway ein?', a: ['sudo ip route add default via 10.0.0.1', 'sudo ip addr add 10.0.0.1 dev enp0s3', 'sudo ip link set 10.0.0.1 up', 'sudo route add gateway 10.0.0.1'], c: 0 });
  P.push({ id: 'b803', lz: 8, type: 'term', q: 'Was ist die Ursache?', term: T('$ ip a show enp0s3\n2: enp0s3: <BROADCAST,MULTICAST> mtu 1500 qdisc noop state DOWN\n    link/ether 08:00:27:3a:5c:91 brd ff:ff:ff:ff:ff:ff\n$ ping 192.168.50.20\nping: connect: Das Netzwerk ist nicht erreichbar'), a: ['Die Schnittstelle ist ausgeschaltet und hat keine Adresse', 'Das Ziel 192.168.50.20 ist ausgeschaltet', 'Der DNS-Server antwortet nicht', 'ping braucht sudo'], c: 0 });
  P.push({ id: 'b804', lz: 8, type: 'num', q: 'Wie viele Rechner (nutzbare Hostadressen) passen in ein Netz mit der Präfixlänge <code>/24</code>?', ans: 254 });
  P.push({ id: 'b805', lz: 8, type: 'match', q: 'Ordne jedem Befehl seine Wirkung zu.', pairs: [['ip a', 'zeigt Schnittstellen mit Adressen'], ['sudo ip link set enp0s3 up', 'schaltet die Schnittstelle ein'], ['ip r', 'zeigt die Routing-Tabelle'], ['sudo ip addr add 10.0.0.5/24 dev enp0s3', 'weist eine IP-Adresse zu']] });
  P.push({ id: 'b806', lz: 8, type: 'term', q: 'Ping ins eigene Netz klappt, ping an 9.9.9.9 meldet »Das Netzwerk ist nicht erreichbar«. Was fehlt?', term: T('$ ip r\n192.168.50.0/24 dev enp0s3 proto kernel scope link src 192.168.50.10'), a: ['Eine Standardroute (default) über das Gateway', 'Eine IP-Adresse an enp0s3', 'Die Schnittstelle lo', 'Ein Eintrag in /etc/hosts'], c: 0 });
  P.push({ id: 'b807', lz: 8, type: 'mc', q: 'Ein Kollege möchte die Netzwerkkonfiguration mit <code>ifconfig</code> prüfen, doch der Befehl fehlt. Was rätst du ihm?', a: ['ip a verwenden – ifconfig ist veraltet und nicht mehr vorinstalliert', 'Den Server neu installieren', 'ifconfig mit sudo aufrufen', 'netplan statt ping verwenden'], c: 0 });
})(typeof window !== 'undefined' ? window : globalThis);
