/* Inhalte – Teil ① Tutorial: 8 Kapitel mit Lektionen, Aufgaben und Kurz-Checks */
(function (G) {
  'use strict';
  const LX = (G.LX = G.LX || {});
  const Q = LX.q;
  const H = '/home/azubi';

  // ---------- Prüfhilfen ----------
  const cmdsOf = (ev) => (ev && ev.cmds) || [];
  const ran = (ev, name, f) => cmdsOf(ev).some(c => (Array.isArray(name) ? name.indexOf(c.name) >= 0 : c.name === name) && c.code === 0 && (!f || f(c)));
  const tried = (ev, name, f) => cmdsOf(ev).some(c => (Array.isArray(name) ? name.indexOf(c.name) >= 0 : c.name === name) && (!f || f(c)));
  const flag = (c, ch) => c.argv.slice(1).some(a => /^-[^-]/.test(a) && a.indexOf(ch) >= 0);
  const args = (c) => c.argv.slice(1).filter(a => a[0] !== '-');
  const argIs = (w, c, path) => args(c).some(a => LX.absPath(w, a) === path);
  const lineHas = (ev, s) => !!ev && ev.line.indexOf(s) >= 0;
  const num = (s) => String(s || '').replace(/[^\d]/g, '');
  LX.chk = { ran, tried, flag, args, argIs, lineHas, num };

  const C = [];
  LX.TUTORIAL = C;

  // ======================================================================
  C.push({
    id: 'k1', dir: '1_orientierung', title: 'Erster Tag: Orientierung', lz: [1, 2],
    summary: 'Prompt, Verzeichnisbaum, ls, cat, less, mkdir, mv, cd, pwd',
    lessons: [
      {
        id: 'prompt', title: 'Das Terminal und der Prompt',
        story: 'Willkommen bei Korbwerk! Ich bin Mira, deine Ausbilderin. Rechts siehst du ein Terminal. Du bist darüber auf unserem Server <b>korb-srv01</b> angemeldet – ganz ohne Maus und Fenster. Klingt altmodisch, ist aber der schnellste Weg, einen Server zu verwalten.',
        html: '<p>Das Terminal wartet auf deinen Befehl. Das zeigt dir der <b>Prompt</b> (die Eingabeaufforderung) am Zeilenanfang:</p>' +
          '<div class="anatomy"><span class="a-user" data-tip="Benutzername">azubi</span><span>@</span><span class="a-host" data-tip="Rechnername">korb-srv01</span><span>:</span><span class="a-path" data-tip="aktuelles Verzeichnis – ~ ist dein Home-Verzeichnis">~</span><span class="a-sign" data-tip="$ = normaler Benutzer, # = Administrator root">$</span></div>' +
          '<ul class="legend"><li><b>azubi</b> – unter diesem Benutzer arbeitest du</li><li><b>korb-srv01</b> – auf diesem Rechner</li><li><b>~</b> – in diesem Verzeichnis (die Tilde steht für dein Home-Verzeichnis)</li><li><b>$</b> – du bist ein normaler Benutzer; beim Administrator <i>root</i> steht hier ein #</li></ul>' +
          '<p>Ein Befehl wird erst ausgeführt, wenn du <kbd>Enter</kbd> drückst. Groß- und Kleinschreibung zählen: <code>ls</code> funktioniert, <code>LS</code> nicht.</p>',
        tasks: [{ text: 'Klicke ins Terminal, tippe <code>ls</code> und drücke <kbd>Enter</kbd>. <code>ls</code> steht für »list« und zeigt, was in deinem aktuellen Verzeichnis liegt.', check: (ev) => ran(ev, 'ls'), hint: 'Zwei Kleinbuchstaben: l wie Ludwig, s wie Siegfried. Danach Enter.', solve: ['ls'] }]
      },
      {
        id: 'baum', title: 'Ein einziger Verzeichnisbaum',
        story: 'Unter Windows kennst du Laufwerke wie C: oder D:. Linux tickt anders: Alles hängt an einem einzigen Baum.',
        html: '<p>Der Baum beginnt bei der <b>Wurzel</b> <code>/</code> (englisch »root directory«). Darunter liegen fest vereinbarte Verzeichnisse. Diese Ordnung ist auf fast allen Linux-Systemen gleich:</p>' +
          '<pre class="tree">/\n├── bin    Programme\n├── etc    Konfigurationsdateien\n├── home   Home-Verzeichnisse der Benutzer\n│   ├── azubi   ← hier bist du (~)\n│   ├── mira\n│   └── …\n├── root   Home-Verzeichnis des Administrators\n├── srv    Daten für Serverdienste\n├── tmp    Zwischenablage für alle\n├── usr    installierte Software\n└── var    veränderliche Daten, z. B. /var/log</pre>' +
          '<p>Eine zweite Festplatte bekommt keinen eigenen Buchstaben, sondern wird an einer Stelle des Baums <b>eingehängt</b> – bei uns zum Beispiel unter <code>/srv</code>.</p><p>Du kannst <code>ls</code> auch sagen, <i>welches</i> Verzeichnis es zeigen soll: <code>ls /</code>. Was hinter dem Befehl steht, heißt <b>Argument</b>. Zwischen Befehl und Argument muss ein Leerzeichen stehen.</p>',
        tasks: [
          { text: 'Lass dir die Wurzel des Dateisystems anzeigen: <code>ls /</code>', check: (ev, w) => ran(ev, 'ls', c => args(c).indexOf('/') >= 0), hint: 'ls, Leerzeichen, Schrägstrich.', solve: ['ls /'] },
          { text: 'Sieh nach, welche Home-Verzeichnisse es auf dem Server gibt: <code>ls /home</code>', check: (ev, w) => ran(ev, 'ls', c => argIs(w, c, '/home')), hint: 'Hinter ls kommt diesmal /home.', solve: ['ls /home'] }
        ]
      },
      {
        id: 'lsl', title: 'Mehr Details mit ls -l',
        story: 'Wer genau hinsieht, sieht mehr. Für fast jeden Befehl gibt es Optionen, die sein Verhalten ändern.',
        html: '<p>Optionen beginnen mit einem Bindestrich. <code>ls -l</code> zeigt das <b>lange Format</b> mit einer Zeile pro Datei:</p>' +
          '<div class="lsl" role="img" aria-label="Aufbau einer Zeile von ls -l"><span class="s1">-rw-r--r--</span> <span class="s2">1</span> <span class="s3">azubi</span> <span class="s4">azubi</span> <span class="s5">512</span> <span class="s6">20. Okt 16:32</span> <span class="s7">willkommen.txt</span></div>' +
          '<ol class="lsl-legend"><li><span class="s1">Typ und Rechte</span> – erstes Zeichen: <code>-</code> Datei, <code>d</code> Verzeichnis (mehr dazu in Kapitel 3)</li><li><span class="s2">Anzahl der Verweise</span></li><li><span class="s3">Eigentümer</span></li><li><span class="s4">Gruppe</span></li><li><span class="s5">Größe in Byte</span></li><li><span class="s6">letzte Änderung</span></li><li><span class="s7">Name</span></li></ol>' +
          '<p>Die erste Zeile »insgesamt« nennt den belegten Platz in Kilobyte-Blöcken. Mit <code>ls -lh</code> werden große Zahlen lesbarer (z. B. 1,5M).</p>',
        tasks: [
          { text: 'Zeige dein Home-Verzeichnis im langen Format: <code>ls -l</code>', check: (ev) => ran(ev, 'ls', c => flag(c, 'l')), hint: 'ls, Leerzeichen, Bindestrich, kleines L.', solve: ['ls -l'] },
          { text: 'Optionen und Argumente lassen sich kombinieren. Sieh dir deinen Ordner »eingang« im langen Format an.', check: (ev, w) => ran(ev, 'ls', c => flag(c, 'l') && argIs(w, c, H + '/eingang')), hint: 'Erst die Option, dann das Argument.', solve: ['ls -l eingang'], show: 'ls -l eingang' },
          { type: 'answer', text: 'Welche Datei im Eingang ist am größten? (Dateiname)', accept: (s) => /foto_feier/i.test(s), hint: 'Vergleiche die Spalte vor dem Datum.' }
        ]
      },
      {
        id: 'lsa', title: 'Versteckte Dateien',
        story: 'Psst – in deinem Home-Verzeichnis liegt mehr, als <code>ls</code> dir zeigt.',
        html: '<p>Dateien, deren Name mit einem <b>Punkt</b> beginnt, sind versteckt. Meist sind das Einstellungsdateien wie <code>.bashrc</code>, die man im Alltag nicht sehen will.</p><p>Die Option <code>-a</code> (»all«) zeigt alles an. Dabei tauchen zwei besondere Einträge auf:</p><ul class="legend"><li><code>.</code> – das aktuelle Verzeichnis selbst</li><li><code>..</code> – das übergeordnete Verzeichnis</li></ul><p>Mehrere Optionen darfst du zusammenfassen: <code>ls -la</code> ist dasselbe wie <code>ls -l -a</code>.</p>',
        tasks: [{ text: 'Zeige alle Dateien in deinem Home-Verzeichnis an, auch die versteckten.', check: (ev, w) => ran(ev, 'ls', c => (flag(c, 'a') || flag(c, 'A')) && (args(c).length === 0 ? w.cwd === H : argIs(w, c, H))), hint: 'Die Option heißt -a. Wer mag, nimmt -la.', solve: ['ls -la'] }]
      },
      {
        id: 'cat', title: 'Dateien anzeigen mit cat',
        story: 'In deinem Home-Verzeichnis liegt ein Brief von mir. Lies ihn!',
        html: '<p><code>cat</code> gibt den Inhalt einer Textdatei im Terminal aus. Der Dateiname ist das Argument.</p><div class="tip"><b>Profi-Trick: die Tabulatortaste.</b> Tippe nur <code>cat wi</code> und drücke <kbd>Tab</kbd> – die Shell ergänzt den Rest des Namens. Passen mehrere Namen, drücke <kbd>Tab</kbd> zweimal, dann zeigt sie alle Möglichkeiten. Das spart Zeit und verhindert Tippfehler.</div><p>Mit den Pfeiltasten <kbd>↑</kbd> und <kbd>↓</kbd> holst du frühere Befehle zurück.</p>',
        tasks: [
          { text: 'Lies den Brief: <code>cat willkommen.txt</code>', check: (ev, w) => ran(ev, 'cat', c => args(c).some(a => /willkommen\.txt$/.test(a))), hint: 'cat, Leerzeichen, willkommen.txt – oder cat wi und Tab.', solve: ['cat willkommen.txt'] },
          { text: 'Und jetzt die versteckte Datei, die du eben entdeckt hast.', check: (ev, w) => ran(ev, 'cat', c => argIs(w, c, H + '/.hinweis')), hint: 'Der Name beginnt mit einem Punkt: .hinweis', solve: ['cat .hinweis'] }
        ]
      },
      {
        id: 'less', title: 'Lange Dateien: less und more',
        story: 'Im Eingang liegt unser Server-Handbuch. Das ist zu lang für <code>cat</code> – der Anfang rauscht einfach vorbei.',
        html: '<p>Für lange Texte gibt es <b>Pager</b>, die bildschirmweise anzeigen:</p><table class="keys"><tr><th>Taste</th><th>Wirkung</th></tr><tr><td><kbd>Leertaste</kbd></td><td>eine Seite weiter</td></tr><tr><td><kbd>b</kbd></td><td>eine Seite zurück (back)</td></tr><tr><td><kbd>↑</kbd> <kbd>↓</kbd></td><td>zeilenweise</td></tr><tr><td><kbd>/</kbd>Wort <kbd>Enter</kbd></td><td>nach »Wort« suchen, <kbd>n</kbd> = nächster Treffer</td></tr><tr><td><kbd>q</kbd></td><td>beenden (quit)</td></tr></table><p><code>more</code> ist der ältere Pager: Er kann kaum zurückblättern und endet am Dateiende von selbst. <code>less</code> kann mehr (»less is more«) und wartet am Ende auf <kbd>q</kbd>.</p>',
        tasks: [
          { text: 'Öffne das Handbuch mit <code>less eingang/server-handbuch.txt</code>, blättere ein wenig und beende mit <kbd>q</kbd>.', check: (ev, w) => ran(ev, ['less', 'more'], c => argIs(w, c, H + '/eingang/server-handbuch.txt')), hint: 'Tipp: less ei[Tab]se[Tab]', solve: ['less eingang/server-handbuch.txt'] },
          { type: 'answer', text: 'Suche im Handbuch mit <kbd>/</kbd> nach »Notfall«. Wie lautet die Notfallnummer?', accept: (s) => num(s) === '01512345678', hint: 'In less: /Notfall und Enter tippen. Die Nummer beginnt mit 0151.' }
        ]
      },
      {
        id: 'mkdir', title: 'Verzeichnisse anlegen: mkdir',
        story: 'Dein Eingang ist ein Chaos. Leg dir eine Ablage an, in der du Erledigtes sammelst.',
        html: '<p><code>mkdir</code> steht für »make directory«. Das neue Verzeichnis entsteht im aktuellen Verzeichnis, wenn du nur einen Namen angibst.</p><p>Gute Namen haben keine Leerzeichen und keine Umlaute – so steht es auch in unserem Handbuch. Statt »Meine Ablage« also <code>ablage</code> oder <code>meine_ablage</code>.</p>',
        tasks: [{ text: 'Lege in deinem Home-Verzeichnis das Verzeichnis <code>ablage</code> an.', check: (ev, w) => Q.isDir(w, H + '/ablage'), hint: 'mkdir, Leerzeichen, Name.', solve: ['mkdir ablage'], show: 'mkdir ablage' }]
      },
      {
        id: 'mv', title: 'Verschieben und umbenennen: mv',
        story: 'Das Protokoll vom Teammeeting ist erledigt. Ab damit in die Ablage – und gib ihm einen ordentlichen Namen.',
        html: '<p><code>mv</code> (»move«) erwartet zwei Argumente: <b>Quelle</b> und <b>Ziel</b>.</p><ul class="legend"><li>Ist das Ziel ein vorhandenes Verzeichnis, wandert die Datei hinein: <code>mv datei.txt ablage/</code></li><li>Sonst wird die Datei umbenannt: <code>mv alt.txt neu.txt</code></li></ul><p>Verschieben und Umbenennen sind für Linux dasselbe – es ändert sich nur der Pfad. Achtung: Existiert das Ziel schon als Datei, wird es ohne Rückfrage überschrieben.</p>',
        tasks: [
          { text: 'Verschiebe <code>eingang/protokoll_teammeeting.txt</code> in deine Ablage.', check: (ev, w) => Q.gone(w, H + '/eingang/protokoll_teammeeting.txt') && (Q.isFile(w, H + '/ablage/protokoll_teammeeting.txt') || Q.isFile(w, H + '/ablage/protokoll_2026-10-20.txt')), hint: 'mv eingang/protokoll_teammeeting.txt ablage/', solve: ['mv eingang/protokoll_teammeeting.txt ablage/'] },
          { text: 'Benenne die Datei in der Ablage um in <code>protokoll_2026-10-20.txt</code> (Datumsformat laut Handbuch).', check: (ev, w) => Q.isFile(w, H + '/ablage/protokoll_2026-10-20.txt') && Q.gone(w, H + '/ablage/protokoll_teammeeting.txt'), hint: 'Quelle und Ziel liegen beide in ablage/: mv ablage/protokoll_teammeeting.txt ablage/protokoll_2026-10-20.txt', solve: ['mv ablage/protokoll_teammeeting.txt ablage/protokoll_2026-10-20.txt'] }
        ]
      },
      {
        id: 'cd', title: 'Verzeichnis wechseln: cd',
        story: 'Ständig <code>ablage/</code> vor jeden Namen zu tippen ist mühsam. Geh doch einfach hinein!',
        html: '<p><code>cd</code> (»change directory«) wechselt das aktuelle Verzeichnis. Beobachte dabei den Prompt – der Teil nach dem Doppelpunkt ändert sich.</p><table class="keys"><tr><th>Befehl</th><th>Wirkung</th></tr><tr><td><code>cd ablage</code></td><td>in das Unterverzeichnis »ablage«</td></tr><tr><td><code>cd ..</code></td><td>eine Ebene nach oben</td></tr><tr><td><code>cd /</code></td><td>zur Wurzel</td></tr><tr><td><code>cd</code> oder <code>cd ~</code></td><td>zurück nach Hause</td></tr><tr><td><code>cd -</code></td><td>zurück ins vorherige Verzeichnis</td></tr></table>',
        tasks: [
          { text: 'Wechsle in deine Ablage und lass dir dort den Inhalt anzeigen.', check: (ev, w) => w.cwd === H + '/ablage' && ran(ev, 'ls'), hint: 'Zwei Befehle nacheinander: cd ablage, dann ls.', solve: ['cd ablage', 'ls'] }
        ]
      },
      {
        id: 'pwd', title: 'Wo bin ich? pwd',
        story: 'Im Prompt siehst du zwar, wo du bist – aber nur abgekürzt. Den vollständigen Pfad verrät ein eigener Befehl.',
        html: '<p><code>pwd</code> steht für »print working directory« und gibt den <b>vollständigen Pfad</b> des aktuellen Verzeichnisses aus, zum Beispiel <code>/home/azubi/ablage</code>.</p><p>Im Prompt steht stattdessen <code>~/ablage</code> – die Tilde ist nur eine Abkürzung für <code>/home/azubi</code>.</p>',
        tasks: [
          { text: 'Lass dir den vollständigen Pfad deines aktuellen Verzeichnisses anzeigen.', check: (ev) => ran(ev, 'pwd'), hint: 'Drei Buchstaben: p w d', solve: ['pwd'], show: 'pwd' },
          { text: 'Geh eine Ebene nach oben und dann zur Wurzel <code>/</code>. Prüfe jeweils mit <code>pwd</code>.', check: (ev, w) => w.cwd === '/' && ran(ev, 'pwd'), hint: 'cd .. bringt dich eine Ebene hoch, cd / direkt zur Wurzel.', solve: ['cd ..', 'cd /', 'pwd'] },
          { text: 'Kehre mit dem kürzesten möglichen Befehl in dein Home-Verzeichnis zurück.', check: (ev, w) => w.cwd === H && ran(ev, 'cd'), hint: 'cd ganz ohne Argument.', solve: ['cd'] }
        ]
      }
    ],
    quiz: [
      { q: 'Was bedeutet der Prompt <code>mira@korb-srv01:/srv$</code>?', a: ['Mira arbeitet auf korb-srv01 im Verzeichnis /srv als normaler Benutzer', 'Der Server mira hat die Adresse korb-srv01', 'Mira arbeitet als Administrator root in /srv', 'Mira ist im Home-Verzeichnis von srv'], c: 0, ex: 'Vor dem @ steht der Benutzer, danach der Rechner. Nach dem Doppelpunkt folgt das Verzeichnis; das $ zeigt einen normalen Benutzer.' },
      { q: 'Welcher Befehl zeigt auch versteckte Dateien im langen Format?', a: ['ls -la', 'ls -h', 'cat -a', 'ls --hidden'], c: 0, ex: '-l steht für das lange Format, -a für »all« – zusammen -la.' },
      { q: 'Du gibst <code>mv bericht.txt bericht_alt.txt</code> ein. Was passiert?', a: ['Die Datei wird umbenannt', 'Es entsteht eine Kopie', 'Die Datei wird in ein Verzeichnis verschoben', 'Fehlermeldung, mv braucht ein Verzeichnis'], c: 0, ex: 'Ist das Ziel kein vorhandenes Verzeichnis, benennt mv die Quelle um.' },
      { q: 'Wie verlässt du <code>less</code>?', a: ['q', 'Strg+Q', 'exit', 'Esc und Enter'], c: 0, ex: 'q wie »quit«. Dasselbe gilt für man, das intern less benutzt.' }
    ]
  });

  // ======================================================================
  C.push({
    id: 'k2', dir: '2_ordnung', title: 'Ordnung schaffen', lz: [1, 2],
    summary: 'Pfade, cp, rm, Platzhalter * und ?, rmdir, touch',
    lessons: [
      {
        id: 'pfade', title: 'Absolute und relative Pfade',
        story: 'Heute räumen wir richtig auf. Dafür musst du genau sagen können, <i>wo</i> eine Datei liegt.',
        html: '<p>Ein <b>absoluter Pfad</b> beginnt mit <code>/</code> und beschreibt den Weg von der Wurzel aus. Er stimmt immer, egal wo du gerade bist: <code>/srv/vorlagen</code>.</p><p>Ein <b>relativer Pfad</b> beginnt nicht mit <code>/</code> und geht vom aktuellen Verzeichnis aus. Stehst du in <code>/home/azubi</code>, meint <code>eingang</code> dasselbe wie <code>/home/azubi/eingang</code>.</p><table class="keys"><tr><th>Zeichen</th><th>Bedeutung</th></tr><tr><td><code>.</code></td><td>das aktuelle Verzeichnis</td></tr><tr><td><code>..</code></td><td>eine Ebene höher</td></tr><tr><td><code>~</code></td><td>dein Home-Verzeichnis</td></tr></table>',
        tasks: [
          { text: 'Sieh dir mit einem absoluten Pfad an, welche Vorlagen in <code>/srv/vorlagen</code> liegen.', check: (ev, w) => ran(ev, 'ls', c => args(c).some(a => a[0] === '/' && LX.absPath(w, a) === '/srv/vorlagen')), hint: 'ls /srv/vorlagen', solve: ['ls /srv/vorlagen'] },
          { text: 'Wechsle in deinen Eingang. Zeige von dort aus mit einem relativen Pfad den Inhalt deiner Ablage an – ohne dein Verzeichnis zu verlassen.', check: (ev, w) => w.cwd === H + '/eingang' && ran(ev, 'ls', c => args(c).some(a => /^\.\./.test(a) && LX.absPath(w, a) === H + '/ablage')), hint: 'Die Ablage liegt neben dem Eingang, also eine Ebene höher: ls ../ablage', solve: ['cd eingang', 'ls ../ablage'] },
          { text: 'Zurück nach Hause.', check: (ev, w) => w.cwd === H, hint: 'cd', solve: ['cd'] }
        ]
      },
      {
        id: 'cp', title: 'Kopieren: cp',
        story: 'Für einen Brief an die Bäckerei Brunner brauchst du unsere Briefvorlage. Die Vorlage selbst bleibt aber unangetastet!',
        html: '<p><code>cp</code> (»copy«) funktioniert wie <code>mv</code>: erst die <b>Quelle</b>, dann das <b>Ziel</b>. Das Original bleibt erhalten.</p><pre class="snip">cp QUELLE ZIELVERZEICHNIS/      Kopie mit gleichem Namen\ncp QUELLE NEUER_NAME            Kopie unter neuem Namen</pre><p>Die Kopie gehört dir, auch wenn das Original jemand anderem gehört.</p>',
        tasks: [
          { text: 'Kopiere <code>/srv/vorlagen/brief_vorlage.odt</code> in deine Ablage.', check: (ev, w) => Q.isFile(w, H + '/ablage/brief_vorlage.odt') && Q.isFile(w, '/srv/vorlagen/brief_vorlage.odt'), hint: 'cp /srv/vorlagen/brief_vorlage.odt ablage/', solve: ['cp /srv/vorlagen/brief_vorlage.odt ablage/'] },
          { text: 'Erstelle in der Ablage eine Kopie davon mit dem Namen <code>brief_brunner.odt</code>.', check: (ev, w) => Q.isFile(w, H + '/ablage/brief_brunner.odt'), hint: 'cp ablage/brief_vorlage.odt ablage/brief_brunner.odt', solve: ['cp ablage/brief_vorlage.odt ablage/brief_brunner.odt'] }
        ]
      },
      {
        id: 'rm', title: 'Löschen: rm',
        story: 'Das alte Angebot für Müller ist überholt. Weg damit.',
        html: '<p><code>rm</code> (»remove«) löscht Dateien. <b>Vorsicht:</b> Es gibt keinen Papierkorb und keine Rückfrage. Was weg ist, ist weg.</p><p>Ein guter Reflex: Vor dem Löschen erst mit <code>ls</code> prüfen, ob du die richtige Datei erwischst.</p>',
        tasks: [{ text: 'Lösche <code>eingang/angebot_mueller_alt.odt</code>.', check: (ev, w) => Q.gone(w, H + '/eingang/angebot_mueller_alt.odt'), hint: 'rm eingang/angebot_mueller_alt.odt', solve: ['rm eingang/angebot_mueller_alt.odt'] }]
      },
      {
        id: 'stern', title: 'Platzhalter: der Stern *',
        story: 'Im Eingang liegen drei Rechnungen. Einzeln verschieben? Das geht schneller.',
        html: '<p>Der Stern <code>*</code> steht für <b>beliebig viele beliebige Zeichen</b> – auch für gar keins. <code>*.pdf</code> passt auf jede Datei, die auf .pdf endet; <code>rechnung_*</code> auf alles, was mit rechnung_ beginnt.</p><p>Wichtig: Nicht der Befehl wertet den Stern aus, sondern die <b>Shell</b>. Sie ersetzt <code>eingang/*.pdf</code> durch die Liste aller passenden Namen, bevor der Befehl startet. Deshalb funktioniert <code>*</code> mit jedem Befehl.</p>',
        tasks: [
          { text: 'Lass dir alle PDF-Dateien im Eingang anzeigen – mit einem Stern.', check: (ev) => ran(ev, 'ls') && lineHas(ev, '*'), hint: 'ls eingang/*.pdf', solve: ['ls eingang/*.pdf'] },
          { text: 'Lege das Verzeichnis <code>ablage/rechnungen</code> an und verschiebe alle Rechnungen mit einem einzigen <code>mv</code>-Befehl hinein.', check: (ev, w) => ['rechnung_0815.pdf', 'rechnung_0816.pdf', 'rechnung_0901.pdf'].every(f => Q.isFile(w, H + '/ablage/rechnungen/' + f)) && !Q.children(w, H + '/eingang').some(f => /\.pdf$/.test(f)), hint: 'mkdir ablage/rechnungen und dann mv eingang/*.pdf ablage/rechnungen/', solve: ['mkdir ablage/rechnungen', 'mv eingang/*.pdf ablage/rechnungen/'] }
        ]
      },
      {
        id: 'frage', title: 'Platzhalter: das Fragezeichen ?',
        story: 'Bleiben noch die temporären Dateien. Aber Achtung, es gibt eine Falle.',
        html: '<p>Das Fragezeichen <code>?</code> steht für <b>genau ein</b> beliebiges Zeichen. <code>temp?.tmp</code> passt auf temp1.tmp und temp2.tmp – aber nicht auf temp10.tmp, denn dort stehen zwei Zeichen an der Stelle.</p><table class="keys"><tr><th>Muster</th><th>passt auf</th></tr><tr><td><code>*</code></td><td>beliebig viele Zeichen (auch keins)</td></tr><tr><td><code>?</code></td><td>genau ein Zeichen</td></tr><tr><td><code>[abc]</code></td><td>genau eines der Zeichen a, b oder c</td></tr></table>',
        tasks: [
          { text: 'Zeige mit <code>ls eingang/temp?.tmp</code>, welche Dateien das Muster trifft. Welche fehlt?', check: (ev) => ran(ev, 'ls') && lineHas(ev, '?'), hint: 'Einfach abtippen und vergleichen mit ls eingang.', solve: ['ls eingang/temp?.tmp'] },
          { text: 'Lösche jetzt <b>alle</b> .tmp-Dateien im Eingang mit einem passenden Muster.', check: (ev, w) => !Q.children(w, H + '/eingang').some(f => /\.tmp$/.test(f)), hint: 'Mit dem Stern erwischst du auch temp10.tmp: rm eingang/*.tmp', solve: ['rm eingang/*.tmp'] }
        ]
      },
      {
        id: 'rmdir', title: 'Leere Verzeichnisse entfernen: rmdir',
        story: 'Im Eingang gibt es noch ein Verzeichnis »alt«, in dem nichts mehr liegt.',
        html: '<p><code>rmdir</code> (»remove directory«) entfernt ein Verzeichnis – aber <b>nur, wenn es leer ist</b>. Das ist ein Schutz: Volle Verzeichnisse lässt <code>rmdir</code> mit der Meldung »Das Verzeichnis ist nicht leer« stehen.</p><p><code>rm</code> allein löscht übrigens gar keine Verzeichnisse. Wie man volle Verzeichnisse löscht, lernst du in Kapitel 5.</p>',
        tasks: [
          { text: 'Probiere zuerst <code>rmdir eingang</code> aus – was passiert?', check: (ev) => tried(ev, 'rmdir', c => c.code !== 0), hint: 'Der Eingang ist nicht leer, also sollte eine Fehlermeldung kommen.', solve: ['rmdir eingang'] },
          { text: 'Entferne nun das leere Verzeichnis <code>eingang/alt</code>.', check: (ev, w) => Q.gone(w, H + '/eingang/alt'), hint: 'rmdir eingang/alt', solve: ['rmdir eingang/alt'] }
        ]
      },
      {
        id: 'touch', title: 'Leere Dateien: touch',
        story: 'Eine To-do-Liste wäre jetzt praktisch. Füllen kannst du sie später mit einem Editor.',
        html: '<p><code>touch</code> setzt eigentlich nur den Änderungszeitpunkt einer Datei auf »jetzt«. Gibt es die Datei noch nicht, legt <code>touch</code> sie <b>leer</b> an – und genau dafür wird der Befehl meistens benutzt.</p>',
        tasks: [{ text: 'Lege in deiner Ablage die leere Datei <code>todo.txt</code> an und kontrolliere ihre Größe mit <code>ls -l</code>.', check: (ev, w) => Q.isFile(w, H + '/ablage/todo.txt') && ran(ev, 'ls', c => flag(c, 'l')), hint: 'touch ablage/todo.txt und danach ls -l ablage', solve: ['touch ablage/todo.txt', 'ls -l ablage'] }]
      }
    ],
    quiz: [
      { q: 'Du stehst in <code>/home/azubi/eingang</code>. Welcher Pfad zeigt auf <code>/home/azubi/ablage</code>?', a: ['../ablage', './ablage', '/ablage', '~/eingang/ablage'], c: 0, ex: '.. führt eine Ebene höher nach /home/azubi, von dort geht es in ablage.' },
      { q: 'Welche Dateien trifft <code>bild?.jpg</code>?', a: ['bild1.jpg und bildA.jpg', 'bild.jpg, bild1.jpg und bild10.jpg', 'nur bild?.jpg', 'alle .jpg-Dateien'], c: 0, ex: '? steht für genau ein Zeichen – weder null noch zwei.' },
      { q: 'Was macht <code>rmdir projekt</code>, wenn in <code>projekt</code> noch Dateien liegen?', a: ['Nichts außer einer Fehlermeldung', 'Es löscht das Verzeichnis samt Inhalt', 'Es löscht nur die Dateien', 'Es fragt nach'], c: 0, ex: 'rmdir entfernt nur leere Verzeichnisse – ein eingebauter Schutz.' },
      { q: 'Wer ersetzt in <code>rm *.tmp</code> den Stern durch Dateinamen?', a: ['Die Shell, bevor rm startet', 'rm selbst', 'Der Kernel', 'Niemand, rm sucht eine Datei namens *.tmp'], c: 0, ex: 'Die Shell expandiert Platzhalter. Darum funktionieren sie mit jedem Befehl.' }
    ]
  });

  // ======================================================================
  C.push({
    id: 'k3', dir: '3_rechte', title: 'Wer darf was?', lz: [3],
    summary: 'Rechte lesen, chmod symbolisch und oktal, Gruppen, chgrp, sudo',
    lessons: [
      {
        id: 'rwx', title: 'Rechte lesen',
        story: 'Auf einem Server arbeiten viele Menschen. Damit niemand fremde Dateien liest oder zerstört, hat jede Datei Zugriffsrechte.',
        html: '<p>Die ersten zehn Zeichen bei <code>ls -l</code> verraten Typ und Rechte:</p><div class="perm" role="img" aria-label="Aufbau der Rechte -rwxr-x---"><span class="p0">-</span><span class="pu">rwx</span><span class="pg">r-x</span><span class="po">---</span></div><ul class="legend"><li><span class="pu">u</span> – <b>user</b>: der Eigentümer</li><li><span class="pg">g</span> – <b>group</b>: Mitglieder der Gruppe</li><li><span class="po">o</span> – <b>others</b>: alle anderen</li></ul><table class="keys"><tr><th></th><th>bei Dateien</th><th>bei Verzeichnissen</th></tr><tr><td><b>r</b></td><td>lesen</td><td>Inhalt auflisten</td></tr><tr><td><b>w</b></td><td>ändern</td><td>Dateien anlegen, löschen, umbenennen</td></tr><tr><td><b>x</b></td><td>als Programm ausführen</td><td>betreten (mit cd)</td></tr></table><p>Ein <code>-</code> bedeutet: Dieses Recht fehlt.</p>',
        tasks: [
          { text: 'Sieh dir die Rechte der Dateien in deinem Verzeichnis <code>skripte</code> an.', check: (ev, w) => ran(ev, 'ls', c => flag(c, 'l') && argIs(w, c, H + '/skripte')), hint: 'ls -l skripte', solve: ['ls -l skripte'] },
          { type: 'answer', text: 'Welche Rechte hat die <b>Gruppe</b> an <code>backup.sh</code>? (drei Zeichen, z. B. r-x)', accept: (s, w) => s.trim() === LX.modeStr(Q.node(w, H + '/skripte/backup.sh') || { type: 'f', mode: 0o664 }).slice(4, 7), hint: 'Das sind die Zeichen 5 bis 7 der Rechte-Spalte.' }
        ]
      },
      {
        id: 'verboten', title: 'Keine Berechtigung',
        story: 'Neugierig? Probier mal, in fremde Verzeichnisse zu schauen.',
        html: '<p>Fehlt dir ein Recht, antwortet Linux mit <b>»Keine Berechtigung«</b>. Das ist kein Fehler des Systems, sondern Absicht.</p><p><code>/root</code> ist das Home-Verzeichnis des Administrators. Es hat die Rechte <code>drwx------</code>: Nur root selbst darf hinein. Kalles Home-Verzeichnis hat <code>drwxr-x---</code> – nur Kalle und seine Gruppe.</p>',
        tasks: [
          { text: 'Versuche, den Inhalt von <code>/root</code> anzuzeigen.', check: (ev, w) => tried(ev, 'ls', c => argIs(w, c, '/root') && c.code !== 0 && c.user !== 'root'), hint: 'ls /root', solve: ['ls /root'] },
          { text: 'Prüfe mit <code>ls -ld /root /home/kalle /home/mira</code>, warum es bei Mira klappen würde.', check: (ev, w) => ran(ev, 'ls', c => flag(c, 'd') && argIs(w, c, '/root')), hint: '-d zeigt das Verzeichnis selbst statt seines Inhalts.', solve: ['ls -ld /root /home/kalle /home/mira'] }
        ]
      },
      {
        id: 'x', title: 'Ausführen braucht x',
        story: 'Kalle hat dir ein kleines Backup-Skript hinterlassen. Starte es mal.',
        html: '<p>Ein <b>Skript</b> ist eine Textdatei mit Befehlen. Um ein Programm im aktuellen Verzeichnis zu starten, schreibst du <code>./</code> davor – damit sagst du der Shell: »hier, genau diese Datei«.</p><p>Fehlt das x-Recht, verweigert Linux den Start – auch für den Eigentümer.</p>',
        tasks: [{ text: 'Starte das Skript mit <code>./skripte/backup.sh</code>.', check: (ev) => tried(ev, './skripte/backup.sh') || cmdsOf(ev).some(c => /backup\.sh$/.test(c.name)), hint: 'Punkt, Schrägstrich, skripte, Schrägstrich, backup.sh', solve: ['./skripte/backup.sh'] }]
      },
      {
        id: 'chmodsym', title: 'Rechte ändern: chmod (symbolisch)',
        story: 'Das Skript ist harmlos – du darfst es ausführbar machen. Es gehört ja dir.',
        html: '<p><code>chmod</code> (»change mode«) ändert Rechte. Nur der <b>Eigentümer</b> (oder root) darf das. In der symbolischen Schreibweise kombinierst du drei Teile:</p><div class="formula"><span><b>wer</b><br>u g o a</span><span><b>wie</b><br>+ − =</span><span><b>was</b><br>r w x</span></div><pre class="snip">chmod u+x datei     Eigentümer darf ausführen\nchmod go-w datei    Gruppe und andere dürfen nicht mehr schreiben\nchmod a+r datei     alle (all) dürfen lesen</pre>',
        tasks: [
          { text: 'Gib dir selbst (u) das Ausführrecht für <code>skripte/backup.sh</code>.', check: (ev, w) => (Q.mode(w, H + '/skripte/backup.sh') & 0o100) !== 0, hint: 'chmod u+x skripte/backup.sh', solve: ['chmod u+x skripte/backup.sh'] },
          { text: 'Starte das Skript jetzt noch einmal.', check: (ev) => cmdsOf(ev).some(c => /backup\.sh$/.test(c.name) && c.code === 0), hint: 'Pfeil nach oben holt den alten Befehl zurück.', solve: ['./skripte/backup.sh'] }
        ]
      },
      {
        id: 'entziehen', title: 'Rechte entziehen',
        story: 'In <code>privat/notizen_privat.txt</code> stehen persönliche Dinge. Momentan kann deine ganze Gruppe die Datei lesen und sogar ändern!',
        html: '<p>Mit <code>-</code> nimmst du Rechte weg. Du kannst mehrere Personengruppen und Rechte zusammenfassen: <code>go-rw</code> heißt »Gruppe und andere: lesen und schreiben weg«.</p><p>Prüfe vorher und nachher mit <code>ls -l</code>.</p>',
        tasks: [{ text: 'Sorge dafür, dass nur noch du <code>privat/notizen_privat.txt</code> lesen und ändern kannst.', check: (ev, w) => { const m = Q.mode(w, H + '/privat/notizen_privat.txt'); return m != null && (m & 0o077) === 0 && (m & 0o600) === 0o600; }, hint: 'chmod go-rw privat/notizen_privat.txt', solve: ['chmod go-rw privat/notizen_privat.txt'] }]
      },
      {
        id: 'oktal', title: 'Rechte als Zahl: chmod 750',
        story: 'Admins sparen sich gern Tipparbeit und schreiben Rechte als Zahlen. Das sieht man in jeder Anleitung – also lohnt es sich.',
        html: '<p>Jedes Recht hat einen Wert. Pro Personengruppe werden die Werte addiert:</p><table class="keys oct"><tr><th>r</th><th>w</th><th>x</th></tr><tr><td>4</td><td>2</td><td>1</td></tr></table><div class="perm big"><span class="pu">rwx<small>4+2+1 = 7</small></span><span class="pg">r-x<small>4+0+1 = 5</small></span><span class="po">---<small>0</small></span></div><p>Also: <code>chmod 750 datei</code> = <code>rwxr-x---</code>. Häufig sind 644 (normale Datei), 600 (privat), 755 (Programm, für alle ausführbar) und 750.</p>',
        tasks: [
          { text: 'Setze die Rechte von <code>skripte/backup.sh</code> mit einer Zahl auf <code>rwxr-x---</code>.', check: (ev, w) => Q.mode(w, H + '/skripte/backup.sh') === 0o750, hint: 'chmod 750 skripte/backup.sh', solve: ['chmod 750 skripte/backup.sh'] },
          { type: 'answer', text: 'Welche Zahl steht für <code>rw-r-----</code>?', accept: (s) => num(s) === '640', hint: 'rw- = 4+2, r-- = 4, --- = 0' }
        ]
      },
      {
        id: 'gruppen', title: 'Gruppen',
        story: 'Bei uns gehört jeder aus der IT zur Gruppe <b>it</b>. So können wir gemeinsame Dateien teilen, ohne sie für alle zu öffnen.',
        html: '<p>Jeder Benutzer hat eine <b>primäre Gruppe</b> (unter Ubuntu heißt sie meist wie der Benutzer) und kann Mitglied in weiteren Gruppen sein. <code>groups</code> zeigt deine Gruppen, <code>groups mira</code> die von Mira.</p><p>Die Gruppe <code>sudo</code> ist besonders: Ihre Mitglieder dürfen Befehle als Administrator ausführen.</p>',
        tasks: [
          { text: 'In welchen Gruppen bist du Mitglied?', check: (ev) => ran(ev, ['groups', 'id']), hint: 'groups', solve: ['groups'] },
          { text: 'Und in welchen Gruppen ist Mira?', check: (ev) => ran(ev, 'groups', c => args(c).indexOf('mira') >= 0) || ran(ev, 'id', c => args(c).indexOf('mira') >= 0), hint: 'groups mira', solve: ['groups mira'] }
        ]
      },
      {
        id: 'chgrp', title: 'Gruppe einer Datei ändern: chgrp',
        story: 'Das Teamprotokoll in deiner Ablage gehört noch deiner privaten Gruppe. Gib es der Gruppe <b>it</b>, dann kann das Team es lesen.',
        html: '<p><code>chgrp GRUPPE DATEI</code> ändert die Gruppe einer Datei. Du darfst das nur bei eigenen Dateien und nur für Gruppen, in denen du selbst Mitglied bist. Den <b>Eigentümer</b> ändert <code>chown</code> – das darf nur root.</p>',
        tasks: [
          { text: 'Ändere die Gruppe von <code>ablage/protokoll_2026-10-20.txt</code> auf <code>it</code>.', check: (ev, w) => Q.group(w, H + '/ablage/protokoll_2026-10-20.txt') === 'it', hint: 'chgrp it ablage/protokoll_2026-10-20.txt', solve: ['chgrp it ablage/protokoll_2026-10-20.txt'] },
          { text: 'Probiere zum Vergleich die Gruppe <code>vertrieb</code> aus. Warum klappt das nicht?', check: (ev) => tried(ev, 'chgrp', c => args(c)[0] === 'vertrieb' && c.code !== 0), hint: 'chgrp vertrieb ablage/protokoll_2026-10-20.txt – du bist kein Mitglied von vertrieb.', solve: ['chgrp vertrieb ablage/protokoll_2026-10-20.txt'] }
        ]
      },
      {
        id: 'sudo', title: 'Kurz mal Administrator: sudo',
        story: 'Manchmal brauchst du Admin-Rechte. Du bist in der Gruppe sudo, also darfst du. Dein Passwort lautet übrigens <b>korb2026</b>.',
        html: '<p>Der Administrator heißt unter Linux <b>root</b> und darf alles. Damit nicht dauerhaft jemand als root arbeitet, gibt es <code>sudo</code>: Du stellst es vor einen <b>einzelnen</b> Befehl, und nur dieser läuft mit root-Rechten.</p><ul class="legend"><li>sudo fragt nach <b>deinem eigenen</b> Passwort, nicht nach dem von root.</li><li>Beim Tippen erscheinen <b>keine Sternchen</b> – das ist Absicht. Tipp einfach blind und drück Enter.</li><li>Danach merkt sich sudo die Anmeldung 15 Minuten lang.</li></ul><p>Mit großer Macht kommt große Verantwortung: Mit sudo schützt dich niemand mehr vor Fehlern.</p>',
        tasks: [{ text: 'Sieh dir mit Administratorrechten an, was in <code>/root</code> liegt.', check: (ev, w) => cmdsOf(ev).some(c => c.name === 'ls' && c.user === 'root' && c.code === 0 && args(c).some(a => LX.absPath(w, a) === '/root')), hint: 'sudo ls /root – Passwort korb2026 blind tippen und Enter.', solve: ['sudo ls /root'] }]
      }
    ],
    quiz: [
      { q: 'Eine Datei hat die Rechte <code>-rw-r-----</code> und gehört <code>mira:it</code>. Wer darf sie lesen?', a: ['Mira und alle Mitglieder der Gruppe it', 'Nur Mira', 'Alle Benutzer', 'Niemand außer root'], c: 0, ex: 'u: rw-, g: r--, o: --- → Mira und die Gruppe it dürfen lesen.' },
      { q: 'Welcher Befehl ergibt <code>rwxr-xr-x</code>?', a: ['chmod 755 datei', 'chmod 644 datei', 'chmod 777 datei', 'chmod 750 datei'], c: 0, ex: '7 = rwx, 5 = r-x, 5 = r-x.' },
      { q: 'Was bedeutet das x-Recht bei einem <b>Verzeichnis</b>?', a: ['Man darf hineinwechseln (betreten)', 'Man darf es löschen', 'Man darf Dateien darin ausführen', 'Es ist versteckt'], c: 0, ex: 'Bei Verzeichnissen steht x für das Betreten mit cd und das Durchqueren auf dem Weg zu Dateien.' },
      { q: 'sudo fragt nach einem Passwort. Welches?', a: ['Dein eigenes', 'Das von root', 'Das WLAN-Passwort', 'Keins, sudo braucht keins'], c: 0, ex: 'sudo prüft, ob du es wirklich bist – deshalb dein eigenes Passwort.' }
    ]
  });

  // ======================================================================
  C.push({
    id: 'k4', dir: '4_hilfe_und_suche', title: 'Kolleg:innen, Hilfe und Suche', lz: [1, 4],
    summary: '~benutzer, man, man -k, finger, find, 2>/dev/null, cat, >, >>',
    lessons: [
      {
        id: 'home', title: 'Home-Verzeichnisse',
        story: 'Jede:r im Team hat ein eigenes Home-Verzeichnis. Schauen wir doch mal bei mir vorbei – ich habe nichts zu verbergen.',
        html: '<p>Die Tilde <code>~</code> ist dein Home-Verzeichnis. <code>~mira</code> ist das Home-Verzeichnis der Benutzerin mira, also <code>/home/mira</code>. Die Shell ersetzt die Tilde, bevor der Befehl startet – so wie beim Stern.</p>',
        tasks: [
          { text: 'Zeige mit der Tilde-Schreibweise an, was in Miras Home-Verzeichnis liegt – auch Verstecktes.', check: (ev, w) => ran(ev, 'ls', c => argIs(w, c, '/home/mira') && (flag(c, 'a') || flag(c, 'A'))) && lineHas(ev, '~mira'), hint: 'ls -a ~mira', solve: ['ls -a ~mira'] },
          { text: 'Lies Miras Datei <code>.plan</code>.', check: (ev, w) => ran(ev, ['cat', 'less', 'more'], c => argIs(w, c, '/home/mira/.plan')), hint: 'cat ~mira/.plan', solve: ['cat ~mira/.plan'] }
        ]
      },
      {
        id: 'man', title: 'Das Handbuch: man',
        story: 'Niemand kennt alle Optionen auswendig – ich auch nicht. Aber jede:r Admin weiß, wo es steht.',
        html: '<p>Zu fast jedem Befehl gibt es eine <b>Handbuchseite</b>: <code>man BEFEHL</code>. Sie wird mit <code>less</code> angezeigt – du kennst die Tasten schon (Leertaste, b, /suchen, q).</p><p>Jede Seite ist gleich gegliedert: <b>BEZEICHNUNG</b> (was macht der Befehl?), <b>ÜBERSICHT</b> (wie ruft man ihn auf?), <b>BESCHREIBUNG</b>, <b>OPTIONEN</b> und <b>BEISPIELE</b>.</p><p>In der Übersicht gilt: <code>[ ]</code> ist optional, <code>…</code> heißt »beliebig oft«.</p><div class="tip">Eingebaute Shell-Befehle wie <code>cd</code> haben keine eigene Seite. Für sie gibt es <code>help cd</code>.</div>',
        tasks: [
          { text: 'Öffne die Handbuchseite zu <code>ls</code>.', check: (ev) => ran(ev, 'man', c => args(c).indexOf('ls') >= 0), hint: 'man ls', solve: ['man ls'] },
          { type: 'answer', text: 'Mit welcher Option sortiert <code>ls</code> nach dem Änderungszeitpunkt? (z. B. -x)', accept: (s) => /^-?t$/.test(s.trim()), hint: 'Suche in man ls mit /Änderungszeit' }
        ]
      },
      {
        id: 'mank', title: 'Den passenden Befehl finden: man -k',
        story: 'Ich möchte wissen, in welchem Raum Sophie aus dem Vertrieb sitzt. Es gibt einen Befehl dafür – aber wie heißt er?',
        html: '<p>Wenn du den Namen eines Befehls nicht kennst, durchsucht <code>man -k STICHWORT</code> die Kurzbeschreibungen <b>aller</b> Handbuchseiten. Der Befehl <code>apropos</code> macht dasselbe.</p>',
        tasks: [
          { text: 'Suche in allen Handbuchseiten nach dem Stichwort <code>benutzer</code>.', check: (ev) => ran(ev, ['man', 'apropos'], c => c.name === 'apropos' || flag(c, 'k')), hint: 'man -k benutzer', solve: ['man -k benutzer'] },
          { type: 'answer', text: 'Welcher Befehl zeigt Informationen über Benutzer an?', accept: (s) => s.trim().toLowerCase() === 'finger', hint: 'Er heißt wie ein Körperteil.' }
        ]
      },
      {
        id: 'finger', title: 'Wer ist wer? finger',
        story: 'Jetzt, wo du den Befehl kennst: Wer ist gerade angemeldet – und wie erreichst du Sophie?',
        html: '<p><code>finger</code> ohne Argument listet alle angemeldeten Benutzer. Mit einem Namen zeigt es Details wie vollständigen Namen, Home-Verzeichnis, Büro und Telefon. Außerdem gibt es den Inhalt der Datei <code>~/.plan</code> aus – eine Art Statusnachricht aus der Frühzeit des Internets.</p><p>Ähnliche Befehle: <code>who</code> (wer ist angemeldet?) und <code>id</code> (Benutzer- und Gruppennummern).</p>',
        tasks: [
          { text: 'Wer ist gerade angemeldet?', check: (ev) => ran(ev, ['finger', 'who', 'w'], c => args(c).length === 0), hint: 'finger ohne Argument', solve: ['finger'] },
          { text: 'Lass dir die Details zu Sophie anzeigen (Benutzername sophie).', check: (ev) => ran(ev, 'finger', c => args(c).some(a => /sophie|lang/i.test(a))), hint: 'finger sophie', solve: ['finger sophie'] },
          { type: 'answer', text: 'Unter welcher Durchwahl erreichst du Sophie?', accept: (s) => num(s) === '247', hint: 'Achte auf die Zeile »Office«.' }
        ]
      },
      {
        id: 'find', title: 'Dateien suchen: find',
        story: 'Ich brauche den Netzplan. Er liegt irgendwo unter <code>/srv</code> – aber wo?',
        html: '<p><code>find</code> durchsucht einen Verzeichnisbaum mit allen Unterverzeichnissen:</p><pre class="snip">find STARTVERZEICHNIS -name NAME</pre><p>Statt eines exakten Namens darfst du Platzhalter verwenden. Dann setz das Muster in Anführungszeichen, sonst ersetzt die Shell den Stern schon vorher: <code>find /srv -name "*.txt"</code>.</p><p>Weitere Bedingungen: <code>-type d</code> (nur Verzeichnisse), <code>-type f</code> (nur Dateien), <code>-user mira</code> (gehört mira).</p>',
        tasks: [{ text: 'Finde die Datei <code>netzplan.txt</code> unterhalb von <code>/srv</code>.', check: (ev, w) => ran(ev, 'find', c => c.argv.indexOf('-name') >= 0 && /netzplan/.test(c.argv.join(' '))) && /\/srv\/team\/netzplan\.txt/.test(ev.out), hint: 'find /srv -name netzplan.txt', solve: ['find /srv -name netzplan.txt'] }]
      },
      {
        id: 'stderr', title: 'Fehlermeldungen ausblenden: 2>/dev/null',
        story: 'Kalle hat mir eine Übergabe versprochen. Die Dateien beginnen mit »uebergabe«, aber wo sie liegen, weiß niemand. Durchsuch das ganze System!',
        html: '<p>Wenn du ab <code>/</code> suchst, stößt <code>find</code> auf viele Verzeichnisse, die du nicht lesen darfst. Jedes meldet »Keine Berechtigung« – die Treffer gehen im Rauschen unter.</p><p>Jedes Programm hat zwei Ausgabekanäle:</p><ul class="legend"><li><b>Standardausgabe</b> (Kanal 1) für die Ergebnisse</li><li><b>Standardfehlerausgabe</b> (Kanal 2) für Fehlermeldungen</li></ul><p>Mit <code>2>/dev/null</code> leitest du Kanal 2 ins »schwarze Loch« <code>/dev/null</code>. Alles, was dort landet, verschwindet.</p>',
        tasks: [
          { text: 'Suche ab <code>/</code> nach allen Dateien, deren Name mit <code>uebergabe</code> beginnt – zuerst ohne Umleitung.', check: (ev) => tried(ev, 'find', c => args(c)[0] === '/' && /uebergabe/.test(c.argv.join(' '))), hint: 'find / -name "uebergabe*"', solve: ['find / -name "uebergabe*"'] },
          { text: 'Wiederhole die Suche und blende die Fehlermeldungen aus.', check: (ev) => tried(ev, 'find', c => /uebergabe/.test(c.argv.join(' '))) && /2>\s*\/dev\/null/.test(ev.line), hint: 'Hänge 2>/dev/null an den Befehl an (Pfeil nach oben spart Tipparbeit).', solve: ['find / -name "uebergabe*" 2>/dev/null'] }
        ]
      },
      {
        id: 'catcat', title: 'Dateien verketten: cat',
        story: 'Gefunden! Die Übergabe besteht aus zwei Teilen. Lies sie am Stück.',
        html: '<p><code>cat</code> heißt eigentlich »concatenate« (verketten). Gibst du mehrere Dateien an, gibt <code>cat</code> sie direkt hintereinander aus:</p><pre class="snip">cat teil1.txt teil2.txt</pre>',
        tasks: [{ text: 'Gib beide Teile der Übergabe in einem einzigen <code>cat</code>-Befehl aus.', check: (ev, w) => ran(ev, 'cat', c => args(c).length >= 2 && args(c).some(a => /uebergabe_teil1/.test(a)) && args(c).some(a => /uebergabe_teil2/.test(a))), hint: 'cat /srv/austausch/kalle/uebergabe_teil1.txt /srv/austausch/kalle/uebergabe_teil2.txt – oder kürzer mit Platzhalter: cat /srv/austausch/kalle/uebergabe_teil*', solve: ['cat /srv/austausch/kalle/uebergabe_teil1.txt /srv/austausch/kalle/uebergabe_teil2.txt'] }]
      },
      {
        id: 'umleiten', title: 'Ausgabe in eine Datei: >',
        story: 'Speichere die Übergabe als eine Datei in deinem Home-Verzeichnis. Dann geht sie nicht verloren, falls Kalles Ordner gelöscht wird.',
        html: '<p>Mit <code>&gt;</code> leitest du die Standardausgabe in eine Datei um, statt sie auf dem Bildschirm anzuzeigen:</p><pre class="snip">cat teil1.txt teil2.txt > gesamt.txt</pre><p><b>Achtung:</b> Existiert die Zieldatei schon, wird sie ohne Rückfrage <b>überschrieben</b>. Die Shell leert sie, noch bevor der Befehl startet.</p>',
        tasks: [{ text: 'Füge beide Teile zur neuen Datei <code>~/uebergabe.txt</code> zusammen.', check: (ev, w) => { const t = Q.text(w, H + '/uebergabe.txt'); const a = Q.text(w, '/srv/austausch/kalle/uebergabe_teil1.txt'), b = Q.text(w, '/srv/austausch/kalle/uebergabe_teil2.txt'); return t != null && a != null && t.indexOf(a + b) === 0; }, hint: 'cat /srv/austausch/kalle/uebergabe_teil1.txt /srv/austausch/kalle/uebergabe_teil2.txt > ~/uebergabe.txt', solve: ['cat /srv/austausch/kalle/uebergabe_teil1.txt /srv/austausch/kalle/uebergabe_teil2.txt > ~/uebergabe.txt'] }]
      },
      {
        id: 'anhaengen', title: 'Anhängen: >>',
        story: 'Vermerke noch, dass du die Übergabe gelesen hast – ohne den Inhalt zu zerstören.',
        html: '<p>Mit <code>&gt;&gt;</code> wird die Ausgabe an das <b>Ende</b> der Datei angehängt. Der bisherige Inhalt bleibt erhalten.</p><p>Mit <code>echo</code> erzeugst du eine beliebige Textzeile: <code>echo "Hallo" &gt;&gt; datei.txt</code></p>',
        tasks: [{ text: 'Hänge die Zeile <code>Gelesen von azubi</code> an <code>~/uebergabe.txt</code> an.', check: (ev, w) => { const t = Q.text(w, H + '/uebergabe.txt') || ''; const a = Q.text(w, '/srv/austausch/kalle/uebergabe_teil1.txt') || '#'; return t.indexOf(a) === 0 && /gelesen von azubi/i.test(t); }, hint: 'echo "Gelesen von azubi" >> ~/uebergabe.txt – zwei spitze Klammern!', solve: ['echo "Gelesen von azubi" >> ~/uebergabe.txt'] }]
      }
    ],
    quiz: [
      { q: 'Was bewirkt <code>ls /etc &gt; liste.txt</code>, wenn <code>liste.txt</code> schon existiert?', a: ['Der alte Inhalt wird überschrieben', 'Die Ausgabe wird angehängt', 'Es gibt eine Fehlermeldung', 'Die Datei wird umbenannt'], c: 0, ex: '> überschreibt, >> hängt an.' },
      { q: 'Du kennst den Namen eines Befehls nicht. Was hilft?', a: ['man -k Stichwort', 'man Stichwort', 'help -all', 'find / -name Stichwort'], c: 0, ex: 'man -k (oder apropos) durchsucht die Kurzbeschreibungen aller Handbuchseiten.' },
      { q: 'Was ist <code>/dev/null</code>?', a: ['Eine Gerätedatei, die alles verschluckt', 'Das Home-Verzeichnis von root', 'Ein leeres Verzeichnis', 'Die Datei für Fehlermeldungen'], c: 0, ex: 'Was nach /dev/null geschrieben wird, verschwindet.' },
      { q: 'Warum gehört <code>"*.conf"</code> bei <code>find / -name "*.conf"</code> in Anführungszeichen?', a: ['Damit die Shell den Stern nicht vorher selbst ersetzt', 'Weil find sonst nur Verzeichnisse findet', 'Weil Punkte immer in Anführungszeichen müssen', 'Das ist nur Geschmackssache'], c: 0, ex: 'Ohne Anführungszeichen würde die Shell *.conf durch passende Namen im aktuellen Verzeichnis ersetzen.' }
    ]
  });

  // ======================================================================
  C.push({
    id: 'k5', dir: '5_server_aechzt', title: 'Der Server ächzt', lz: [5, 4, 2],
    summary: 'cp -r, df, du, rm -r, ps, Pipes, grep, kill, kill -9, wc',
    lessons: [
      {
        id: 'cpr', title: 'Verzeichnisse kopieren: cp -r',
        story: 'Bevor wir heute aufräumen, sichern wir deine Ablage. Sicher ist sicher.',
        html: '<p>Ohne Zusatz kopiert <code>cp</code> keine Verzeichnisse. Mit <code>-r</code> (»recursive«) kopiert es ein Verzeichnis samt allem, was darin liegt, auch Unterverzeichnisse.</p><pre class="snip">cp -r ablage ablage_backup</pre>',
        tasks: [{ text: 'Erstelle eine vollständige Kopie deiner Ablage namens <code>ablage_backup</code>.', check: (ev, w) => Q.isDir(w, H + '/ablage_backup') && Q.children(w, H + '/ablage').every(k => Q.children(w, H + '/ablage_backup').indexOf(k) >= 0), hint: 'cp -r ablage ablage_backup', solve: ['cp -r ablage ablage_backup'] }]
      },
      {
        id: 'df', title: 'Wie voll ist die Platte? df',
        story: 'Heute Morgen kam eine Warnung: Auf <code>/srv</code> ist kaum noch Platz.',
        html: '<p><code>df</code> (»disk free«) zeigt jedes eingehängte Dateisystem mit Größe, Belegung und freiem Platz. Mit <code>-h</code> erscheinen gut lesbare Einheiten (K, M, G).</p><p>Die letzte Spalte »Eingehängt auf« verrät, wo das Dateisystem im Baum hängt. <code>/dev/sdb1</code> ist die zweite Festplatte. Sie ist unter <code>/srv</code> eingehängt.</p>',
        tasks: [
          { text: 'Zeige die Belegung aller Dateisysteme in lesbarer Form.', check: (ev) => ran(ev, 'df', c => flag(c, 'h')), hint: 'df -h', solve: ['df -h'] },
          { type: 'answer', text: 'Zu wie viel Prozent ist <code>/srv</code> belegt?', accept: (s, w) => { LX.updateDisks(w); const d = w.disks.find(x => x.mount === '/srv'); const p = Math.ceil(100 * d.used / (d.used + d.avail)); return Math.abs(parseInt(num(s), 10) - p) <= 1; }, hint: 'Spalte »Verw%« in der Zeile mit /srv.' }
        ]
      },
      {
        id: 'du', title: 'Wer frisst den Platz? du',
        story: 'Irgendetwas unter <code>/srv</code> ist riesig. Finde es.',
        html: '<p><code>du</code> (»disk usage«) misst, wie viel Platz Dateien und Verzeichnisse belegen. <code>-s</code> gibt nur eine Summe pro Argument aus, <code>-h</code> macht die Zahlen lesbar.</p><pre class="snip">du -sh /srv/*</pre><p>Der Stern sorgt dafür, dass jedes Unterverzeichnis einzeln gemessen wird.</p>',
        tasks: [{ text: 'Miss, wie groß jedes Verzeichnis in <code>/srv</code> ist.', check: (ev) => ran(ev, 'du', c => flag(c, 's')) || tried(ev, 'du', c => flag(c, 's')), hint: 'du -sh /srv/*', solve: ['du -sh /srv/*'] }]
      },
      {
        id: 'rmr', title: 'Volle Verzeichnisse löschen: rm -r',
        story: 'Der Übeltäter ist Kalles Backup von 2019 in <code>/srv/altdaten/kalle_backup_2019</code>. Ich habe mit der Geschäftsführung gesprochen: Das darf weg.',
        html: '<p><code>rm -r</code> löscht ein Verzeichnis mit seinem gesamten Inhalt. Das ist einer der gefährlichsten Befehle überhaupt. Prüfe den Pfad deshalb <b>zweimal</b> – am besten mit <code>ls</code>, bevor du löschst. Mit <code>-i</code> fragt rm vor jedem Löschen nach.</p><p>Du darfst das Verzeichnis löschen, weil du zur Gruppe <b>it</b> gehörst und die Gruppe Schreibrechte hat.</p>',
        tasks: [
          { text: 'Lösche <code>/srv/altdaten/kalle_backup_2019</code> mit allem Inhalt.', check: (ev, w) => Q.gone(w, '/srv/altdaten/kalle_backup_2019') && Q.isDir(w, '/srv/altdaten/archiv_2025'), hint: 'rm -r /srv/altdaten/kalle_backup_2019 – Tipp: Tab-Vervollständigung schützt vor Tippfehlern.', solve: ['rm -r /srv/altdaten/kalle_backup_2019'] },
          { text: 'Kontrolliere mit <code>df -h /srv</code>, wie viel Platz jetzt frei ist.', check: (ev, w) => Q.gone(w, '/srv/altdaten/kalle_backup_2019') && ran(ev, 'df'), hint: 'df -h /srv', solve: ['df -h /srv'] }
        ]
      },
      {
        id: 'ps', title: 'Was läuft hier? ps',
        story: 'Platz ist wieder da, aber der Server ist immer noch langsam. Irgendein Programm rechnet ohne Pause.',
        html: '<p>Jedes laufende Programm ist ein <b>Prozess</b> mit einer eindeutigen Nummer, der <b>PID</b> (Prozess-ID). <code>ps</code> allein zeigt nur die Prozesse deines Terminals. <code>ps aux</code> zeigt alle:</p><ul class="legend"><li><b>a</b> – Prozesse aller Benutzer</li><li><b>u</b> – ausführliches Format mit Benutzer, CPU- und Speicherlast</li><li><b>x</b> – auch Prozesse ohne Terminal (Dienste)</li></ul><p>Achte auf die Spalten <b>USER</b>, <b>PID</b>, <b>%CPU</b> und <b>COMMAND</b>.</p>',
        tasks: [
          { text: 'Zeige zuerst nur die Prozesse in deinem Terminal.', check: (ev) => ran(ev, 'ps', c => c.argv.length === 1), hint: 'ps', solve: ['ps'] },
          { text: 'Zeige jetzt alle Prozesse im ausführlichen Format. Wer verbraucht die meiste CPU-Zeit?', check: (ev) => ran(ev, 'ps', c => /aux|axu|-ef|-e/.test(c.argv.slice(1).join(' '))), hint: 'ps aux', solve: ['ps aux'] }
        ]
      },
      {
        id: 'pipe', title: 'Befehle verbinden: die Pipe |',
        story: '<code>ps aux</code> war ganz schön lang. Zum Glück kannst du Befehle hintereinanderschalten.',
        html: '<p>Die <b>Pipe</b> <code>|</code> (senkrechter Strich, auf deutschen Tastaturen <kbd>AltGr</kbd>+<kbd>&lt;</kbd>) leitet die Ausgabe des linken Befehls als Eingabe an den rechten weiter:</p><div class="pipe" role="img" aria-label="ps aux gibt seine Ausgabe an less weiter"><span>ps aux</span><i>|</i><span>less</span></div><p>So kannst du jede lange Ausgabe in Ruhe durchblättern: <code>ps aux | less</code>, <code>ls -l /etc | less</code>.</p>',
        tasks: [{ text: 'Lass dir die Prozessliste mit <code>less</code> seitenweise anzeigen. Beende <code>less</code> mit <kbd>q</kbd>.', check: (ev) => ran(ev, 'ps') && ran(ev, ['less', 'more']) && /\|/.test(ev.line), hint: 'ps aux | less', solve: ['ps aux | less'] }]
      },
      {
        id: 'grep', title: 'Zeilen filtern: grep',
        story: 'In Kalles Sync-Protokoll wimmelt es von Meldungen. Mich interessieren nur die Fehler.',
        html: '<p><code>grep MUSTER DATEI</code> gibt nur die Zeilen aus, in denen das Muster vorkommt. Groß- und Kleinschreibung zählen, außer mit <code>-i</code>. Weitere nützliche Optionen: <code>-v</code> (alle Zeilen <i>ohne</i> Treffer), <code>-n</code> (Zeilennummern), <code>-c</code> (nur zählen).</p><p>In einer Pipe filtert grep die Ausgabe eines anderen Befehls: <code>ps aux | grep sync</code>.</p><div class="tip">Wundere dich nicht: Bei <code>ps aux | grep sync</code> taucht auch der grep-Prozess selbst auf – er enthält ja das Wort »sync«.</div>',
        tasks: [
          { text: 'Zeige alle Zeilen mit <code>FEHLER</code> aus <code>/var/log/kalle-sync.log</code>.', check: (ev, w) => ran(ev, 'grep', c => args(c)[0] === 'FEHLER' && argIs(w, c, '/var/log/kalle-sync.log')), hint: 'grep FEHLER /var/log/kalle-sync.log', solve: ['grep FEHLER /var/log/kalle-sync.log'] },
          { text: 'Finde in der Prozessliste alle Zeilen mit <code>sync</code>.', check: (ev) => ran(ev, 'ps') && ran(ev, 'grep') && /\|/.test(ev.line), hint: 'ps aux | grep sync', solve: ['ps aux | grep sync'] },
          { type: 'answer', text: 'Welche PID hat Kalles Programm <code>sync.py</code>?', accept: (s) => num(s) === '3317', hint: 'Die PID ist die zweite Spalte.' }
        ]
      },
      {
        id: 'kill', title: 'Prozesse beenden: kill',
        story: 'Das Sync-Skript läuft seit dem 30. September und frisst fast die ganze CPU. Beende es.',
        html: '<p><code>kill PID</code> schickt einem Prozess das Signal <b>TERM</b> – die höfliche Bitte, sich zu beenden. Ein gut programmierter Prozess räumt dann auf und endet.</p><p>Du darfst nur <b>eigene</b> Prozesse beenden. Der Prozess gehört kalle, also brauchst du sudo.</p>',
        tasks: [
          { text: 'Versuche, den Prozess 3317 ohne sudo zu beenden.', check: (ev) => tried(ev, 'kill', c => args(c).indexOf('3317') >= 0 && c.user !== 'root'), hint: 'kill 3317', solve: ['kill 3317'] },
          { text: 'Beende ihn jetzt mit Administratorrechten und prüfe das Ergebnis.', check: (ev, w) => !Q.proc(w, 'sync'), hint: 'sudo kill 3317 und danach ps aux | grep sync', solve: ['sudo kill 3317'] }
        ]
      },
      {
        id: 'kill9', title: 'Wenn TERM nicht hilft: kill -9',
        story: 'Da ist noch ein zweiter Prozess von Kalle: <code>/opt/alt/haenger</code>. Der heißt nicht umsonst so.',
        html: '<p>Manche Prozesse ignorieren TERM oder hängen fest. Dann hilft das Signal <b>KILL</b> mit der Nummer 9: <code>kill -9 PID</code>. Der Kernel beendet den Prozess sofort, ohne ihn zu fragen. Er kann dabei nicht mehr aufräumen – deshalb ist <code>-9</code> nur der letzte Ausweg.</p>',
        tasks: [
          { text: 'Finde die PID des Prozesses <code>haenger</code> und schick ihm zunächst ein normales TERM (mit sudo).', check: (ev, w) => (w.log.termIgnored || 0) > 0 || !Q.proc(w, 'haenger'), hint: 'ps aux | grep haenger, dann sudo kill PID', solve: ['ps aux | grep haenger', 'sudo kill 3322'] },
          { text: 'Läuft er noch? Dann beende ihn endgültig.', check: (ev, w) => !Q.proc(w, 'haenger'), hint: 'sudo kill -9 3322', solve: ['sudo kill -9 3322'] }
        ]
      },
      {
        id: 'wc', title: 'Werkzeugkasten für Pipes: wc, sort, head, tail',
        story: 'Für meinen Bericht brauche ich noch eine Zahl: Wie viele Fehler hat Kalles Sync-Skript protokolliert?',
        html: '<p>Kleine Werkzeuge, die sich ideal mit der Pipe kombinieren lassen:</p><table class="keys"><tr><td><code>wc -l</code></td><td>Zeilen zählen</td></tr><tr><td><code>sort</code></td><td>Zeilen sortieren (<code>-r</code> rückwärts, <code>-n</code> nach Zahlen)</td></tr><tr><td><code>head -n 5</code></td><td>nur die ersten 5 Zeilen</td></tr><tr><td><code>tail -n 5</code></td><td>nur die letzten 5 Zeilen</td></tr></table><pre class="snip">grep FEHLER datei | wc -l</pre>',
        tasks: [
          { text: 'Zähle mit einer Pipe aus <code>grep</code> und <code>wc</code>, wie viele Zeilen mit FEHLER das Protokoll enthält.', check: (ev) => ran(ev, 'grep') && ran(ev, 'wc') && /\|/.test(ev.line), hint: 'grep FEHLER /var/log/kalle-sync.log | wc -l', solve: ['grep FEHLER /var/log/kalle-sync.log | wc -l'] },
          { type: 'answer', text: 'Wie viele Fehlerzeilen sind es?', accept: (s, w) => parseInt(num(s), 10) === ((Q.text(w, '/var/log/kalle-sync.log') || '').split('\n').filter(l => /FEHLER/.test(l)).length), hint: 'Die Zahl, die wc -l ausgibt.' },
          { text: 'Zeig dir zum Schluss die letzten 5 Zeilen des Protokolls an.', check: (ev, w) => ran(ev, 'tail', c => argIs(w, c, '/var/log/kalle-sync.log')), hint: 'tail -n 5 /var/log/kalle-sync.log', solve: ['tail -n 5 /var/log/kalle-sync.log'] }
        ]
      }
    ],
    quiz: [
      { q: 'Was macht <code>ps aux | grep python | wc -l</code>?', a: ['Es zählt die Zeilen der Prozessliste, die »python« enthalten', 'Es beendet alle Python-Prozesse', 'Es zeigt die Python-Version', 'Es schreibt die Prozessliste in eine Datei namens wc'], c: 0, ex: 'Die Ausgabe fließt von links nach rechts: alle Prozesse → nur python-Zeilen → Anzahl.' },
      { q: 'Ein Prozess reagiert nicht auf <code>kill 4711</code>. Was ist der nächste Schritt?', a: ['kill -9 4711', 'rm 4711', 'kill -1 4711 dreimal', 'reboot'], c: 0, ex: 'Signal 9 (KILL) beendet den Prozess sofort und kann nicht ignoriert werden.' },
      { q: 'Welcher Befehl zeigt, wie viel Platz auf den eingehängten Dateisystemen frei ist?', a: ['df -h', 'du -sh', 'free -h', 'ls -lh /'], c: 0, ex: 'df = disk free (Dateisysteme). du misst einzelne Dateien und Verzeichnisse.' },
      { q: 'Was unterscheidet <code>rm -r ordner</code> von <code>rmdir ordner</code>?', a: ['rm -r löscht auch volle Verzeichnisse', 'rmdir löscht auch Unterverzeichnisse', 'Kein Unterschied', 'rm -r verschiebt in den Papierkorb'], c: 0, ex: 'rmdir verweigert volle Verzeichnisse, rm -r löscht alles darin – unwiderruflich.' }
    ]
  });

  // ======================================================================
  C.push({
    id: 'k6', dir: '6_nano', title: 'Texte bearbeiten mit nano', lz: [6],
    summary: 'nano starten, schreiben, speichern, beenden, ausschneiden, einfügen, suchen',
    lessons: [
      {
        id: 'nano1', title: 'Schreiben, speichern, beenden',
        story: 'Auf einem Server bearbeitest du ständig Textdateien – ohne Maus und ohne Word. Unser Werkzeug dafür heißt nano.',
        html: '<p>Starte nano mit einem Dateinamen: <code>nano notizen.txt</code>. Existiert die Datei nicht, legt nano sie beim Speichern an.</p><p>Danach tippst du einfach los. Befehle gibst du mit Tastenkombinationen ein, die unten am Bildschirm stehen. Das Zeichen <b>^</b> bedeutet <kbd>Strg</kbd>:</p><table class="keys"><tr><td><kbd>Strg</kbd>+<kbd>O</kbd></td><td>Speichern (»Write <b>O</b>ut«): Dateiname mit <kbd>Enter</kbd> bestätigen</td></tr><tr><td><kbd>Strg</kbd>+<kbd>X</kbd></td><td>Beenden; bei ungespeicherten Änderungen fragt nano nach (<kbd>J</kbd>/<kbd>N</kbd>)</td></tr><tr><td><kbd>Strg</kbd>+<kbd>G</kbd></td><td>Hilfe</td></tr></table><div class="tip">Du kannst die Befehle in der unteren Leiste auch anklicken.</div>',
        tasks: [{ text: 'Öffne mit nano die neue Datei <code>notizen.txt</code> in deinem Home-Verzeichnis, schreibe den Satz <code>Mein erster Tag bei Korbwerk</code>, speichere und beende nano.', check: (ev, w) => /erster tag bei korbwerk/i.test(Q.text(w, H + '/notizen.txt') || '') && (!ev || !ev.cmds.length || ev.cmds.every(c => c.name !== 'nano') || true), hint: 'nano notizen.txt – Text tippen – Strg+O, Enter – Strg+X', solve: [{ cmd: 'nano notizen.txt', nanoText: 'Mein erster Tag bei Korbwerk\n' }] }]
      },
      {
        id: 'nano2', title: 'Zeilen ausschneiden und einfügen',
        story: 'In meiner Checkliste für den Serverraum ist die Reihenfolge durcheinander. Die Tür schließt man ganz zum Schluss ab!',
        html: '<p>nano arbeitet zeilenweise:</p><table class="keys"><tr><td><kbd>Strg</kbd>+<kbd>K</kbd></td><td>aktuelle Zeile ausschneiden (mehrmals drücken = mehrere Zeilen)</td></tr><tr><td><kbd>Strg</kbd>+<kbd>U</kbd></td><td>ausgeschnittene Zeile(n) an der Cursorposition einfügen</td></tr><tr><td><kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd></td><td>Cursor bewegen</td></tr></table><p>So verschiebst du eine Zeile: Cursor auf die Zeile, <kbd>Strg</kbd>+<kbd>K</kbd>, Cursor an die neue Stelle, <kbd>Strg</kbd>+<kbd>U</kbd>.</p>',
        tasks: [{ text: 'Öffne <code>checkliste.txt</code> und verschiebe die Zeile »4. Tür abschließen …« ans Ende. Speichere die Datei.', check: (ev, w) => { const l = Q.lines(Q.text(w, H + '/checkliste.txt')); const nums = l.filter(s => /^\d\./.test(s)).map(s => s[0]).join(''); return nums === '1234' && /^4\./.test(l[l.length - 1]); }, hint: 'nano checkliste.txt – Pfeil runter bis Zeile 4. – Strg+K – Pfeil ganz nach unten unter die letzte Zeile – Strg+U – Strg+O, Enter – Strg+X', solve: [{ cmd: 'nano checkliste.txt', nanoText: 'Checkliste Serverraum – Kontrollgang am Freitag\n1. Temperatur am Rack ablesen\n2. Blinkende LEDs notieren\n3. Kabelsalat fotografieren\n4. Tür abschließen und Schlüssel abgeben\n' }] }]
      },
      {
        id: 'nano3', title: 'Systemdateien bearbeiten und suchen',
        story: 'Erinnerst du dich an Kalles Übergabe? Das Backup schreibt immer noch auf den alten USB-Stick. Ändere in <code>/etc/korbwerk/backup.conf</code> das Ziel auf <code>/srv/backup</code>.',
        html: '<p>Dateien in <code>/etc</code> gehören root. Als normaler Benutzer kannst du sie lesen, aber nicht speichern. Deshalb startest du nano mit sudo:</p><pre class="snip">sudo nano /etc/korbwerk/backup.conf</pre><p>In langen Dateien springst du mit der <b>Suche</b> an die richtige Stelle: <kbd>Strg</kbd>+<kbd>W</kbd> (»Wo ist«), Suchbegriff, <kbd>Enter</kbd>.</p><div class="tip warn"><b>Wichtig im Browser:</b> <kbd>Strg</kbd>+<kbd>W</kbd> schließt hier den Browser-Tab! Nutze stattdessen <kbd>F6</kbd> – das funktioniert auch im echten nano. Alternativ klickst du unten auf »^W Wo ist«.</div>',
        tasks: [{ text: 'Ändere in <code>/etc/korbwerk/backup.conf</code> die Zeile <code>ziel=/mnt/usb</code> in <code>ziel=/srv/backup</code>. Alle anderen Zeilen bleiben unverändert.', check: (ev, w) => { const t = Q.text(w, '/etc/korbwerk/backup.conf') || ''; const L = Q.lines(t); return L.indexOf('ziel=/srv/backup') >= 0 && !/ziel=\/mnt\/usb/.test(t) && L.indexOf('aufbewahrung_tage=14') >= 0 && L.indexOf('uhrzeit=02:30') >= 0 && L.length >= 14; }, hint: 'sudo nano /etc/korbwerk/backup.conf – F6, »ziel=« eingeben, Enter – mit Pfeil rechts hinter das = – alten Pfad löschen, /srv/backup tippen – Strg+O, Enter – Strg+X', solve: [{ cmd: 'sudo nano /etc/korbwerk/backup.conf', nanoText: '# Konfiguration des nächtlichen Backups auf korb-srv01\n# Änderungen bitte im Server-Handbuch dokumentieren!\n\n[allgemein]\naktiv=ja\nuhrzeit=02:30\n\n[quelle]\nverzeichnisse=/home /srv/team /etc\nausnahmen=*.tmp *.iso\n\n[ziel]\n# Wohin wird gesichert?\nziel=/srv/backup\naufbewahrung_tage=14\n\n[benachrichtigung]\nmail=it@korbwerk.example\nnur_bei_fehler=ja\n' }] }]
      }
    ],
    quiz: [
      { q: 'Wofür steht <code>^X</code> in der Leiste von nano?', a: ['Strg+X: nano beenden', 'Großbuchstabe X tippen', 'Alt+X', 'Datei ausschneiden'], c: 0, ex: 'Das Dach ^ steht für die Strg-Taste.' },
      { q: 'Du hast in nano Änderungen gemacht und drückst Strg+X. Was passiert?', a: ['nano fragt, ob gespeichert werden soll', 'nano schließt ohne zu speichern', 'nano speichert automatisch', 'Die Änderungen werden ausgeschnitten'], c: 0, ex: 'Bei ungespeicherten Änderungen fragt nano »Geänderten Puffer speichern?«.' },
      { q: 'Warum braucht man für <code>/etc/korbwerk/backup.conf</code> den Befehl <code>sudo nano</code>?', a: ['Die Datei gehört root, nur root darf sie ändern', 'nano funktioniert nur mit sudo', 'Damit die Suche funktioniert', 'Weil die Datei versteckt ist'], c: 0, ex: 'Systemkonfiguration in /etc gehört root; zum Speichern sind Administratorrechte nötig.' },
      { q: 'Wie verschiebst du in nano eine Zeile?', a: ['Strg+K, Cursor bewegen, Strg+U', 'Strg+C, Strg+V', 'Strg+X, Strg+V', 'Markieren mit der Maus und ziehen'], c: 0, ex: 'Strg+K schneidet die Zeile aus, Strg+U fügt sie wieder ein.' }
    ]
  });

  // ======================================================================
  C.push({
    id: 'k7', dir: '7_packen', title: 'Packen und entpacken', lz: [7],
    summary: 'tar, gzip/gunzip, bzip2, xz, tar -czvf/-xzvf, zip, unzip',
    lessons: [
      {
        id: 'konzept', title: 'Archiv oder Kompression?',
        story: 'Kalles Logs in <code>/var/log/korbwerk</code> sollen archiviert werden, und das Steuerbüro will die Rechnungen gebündelt. Zeit fürs Packen!',
        html: '<p>Unter Linux sind das zwei getrennte Aufgaben:</p><div class="pack" role="img" aria-label="tar bündelt viele Dateien zu einer; gzip verkleinert eine Datei"><div><b>Archivieren</b> mit <code>tar</code><span class="files">▤ ▤ ▤ ▤ → ▣</span><small>viele Dateien → eine Datei<br>(nicht kleiner!)</small></div><div><b>Komprimieren</b> mit <code>gzip</code>, <code>bzip2</code>, <code>xz</code><span class="files">▣ → ▪</span><small>eine Datei → kleinere Datei</small></div></div><p>Kombiniert ergibt sich zum Beispiel <code>logs.tar.gz</code>: erst gebündelt, dann komprimiert. <code>zip</code> erledigt beides in einem Schritt – das Format kennen auch Windows-Nutzer.</p>',
        tasks: [{ text: 'Sieh dir die Logdateien in <code>/var/log/korbwerk</code> mit ihren Größen an.', check: (ev, w) => ran(ev, 'ls', c => flag(c, 'l') && argIs(w, c, '/var/log/korbwerk')), hint: 'ls -lh /var/log/korbwerk', solve: ['ls -lh /var/log/korbwerk'] }]
      },
      {
        id: 'tarc', title: 'Ein Archiv erstellen: tar -cvf',
        story: 'Fang mit deiner eigenen Ablage an.',
        html: '<p>Der Name kommt von »tape archive« – früher wurde auf Bänder gesichert. Die wichtigsten Optionen:</p><table class="keys"><tr><td><code>c</code></td><td>create: Archiv erstellen</td></tr><tr><td><code>v</code></td><td>verbose: anzeigen, was passiert</td></tr><tr><td><code>f</code></td><td>file: es folgt der Name der Archivdatei</td></tr></table><pre class="snip">tar -cvf ARCHIV.tar WAS_HINEIN_SOLL</pre><p>Weil hinter <code>f</code> direkt der Archivname folgen muss, steht <code>f</code> immer <b>zuletzt</b>.</p>',
        tasks: [{ text: 'Packe das Verzeichnis <code>ablage</code> in das Archiv <code>ablage.tar</code>.', check: (ev, w) => { const t = Q.tarOf(w, H + '/ablage.tar'); return !!t && t.entries.some(e => /^ablage\/?$/.test(e.path)); }, hint: 'tar -cvf ablage.tar ablage', solve: ['tar -cvf ablage.tar ablage'] }]
      },
      {
        id: 'gzip', title: 'Komprimieren: gzip und gunzip',
        story: 'Das Archiv ist sogar größer als die Dateien selbst. Jetzt wird geschrumpft.',
        html: '<p><code>gzip DATEI</code> komprimiert eine Datei und <b>ersetzt</b> sie durch <code>DATEI.gz</code>. <code>gunzip DATEI.gz</code> macht das rückgängig.</p><p>gzip arbeitet nur mit einzelnen Dateien. Ein Verzeichnis musst du vorher mit tar bündeln – genau deshalb gibt es <code>.tar.gz</code>.</p>',
        tasks: [
          { text: 'Komprimiere <code>ablage.tar</code> mit gzip und vergleiche danach mit <code>ls -l</code>.', check: (ev, w) => { const t = Q.tarOf(w, H + '/ablage.tar.gz'); return !!t && t.chain[0] === 'gz' && Q.gone(w, H + '/ablage.tar'); }, hint: 'gzip ablage.tar', solve: ['gzip ablage.tar'] },
          { text: 'Mach die Kompression wieder rückgängig.', check: (ev, w) => !!Q.tarOf(w, H + '/ablage.tar') && Q.gone(w, H + '/ablage.tar.gz'), hint: 'gunzip ablage.tar.gz', solve: ['gunzip ablage.tar.gz'] }
        ]
      },
      {
        id: 'tarz', title: 'In einem Schritt: tar -czvf',
        story: 'Zwei Befehle sind einer zu viel. tar kann gleich mitkomprimieren.',
        html: '<p>Mit <code>z</code> ruft tar selbst gzip auf:</p><pre class="snip">tar -czvf logs.tar.gz /var/log/korbwerk</pre><p>Die Meldung »Entferne führende „/“« ist kein Fehler: tar speichert Pfade bewusst relativ (<code>var/log/korbwerk/…</code>). Sonst würde das Entpacken die Originale überschreiben.</p>',
        tasks: [{ text: 'Archiviere und komprimiere <code>/var/log/korbwerk</code> in einem Schritt nach <code>~/logs.tar.gz</code>.', check: (ev, w) => { const t = Q.tarOf(w, H + '/logs.tar.gz'); return !!t && t.chain[0] === 'gz' && t.entries.some(e => /korbwerk\/sync\.log$/.test(e.path)); }, hint: 'tar -czvf logs.tar.gz /var/log/korbwerk', solve: ['tar -czvf logs.tar.gz /var/log/korbwerk'] }]
      },
      {
        id: 'bzxz', title: 'Stärker komprimieren: bzip2 und xz',
        story: 'Für das Langzeitarchiv zählt jedes Megabyte. Vergleich mal die Verfahren.',
        html: '<table class="keys"><tr><th>Verfahren</th><th>tar-Option</th><th>Endung</th><th>einzeln</th></tr><tr><td>gzip</td><td><code>-z</code></td><td>.tar.gz</td><td><code>gzip</code> / <code>gunzip</code></td></tr><tr><td>bzip2</td><td><code>-j</code></td><td>.tar.bz2</td><td><code>bzip2</code> / <code>bunzip2</code></td></tr><tr><td>xz</td><td><code>-J</code> (groß!)</td><td>.tar.xz</td><td><code>xz</code> / <code>unxz</code></td></tr></table><p>Faustregel: gzip ist am schnellsten, xz macht die kleinsten Dateien, bzip2 liegt dazwischen.</p>',
        tasks: [
          { text: 'Erstelle <code>logs.tar.bz2</code> aus <code>/var/log/korbwerk</code>.', check: (ev, w) => { const t = Q.tarOf(w, H + '/logs.tar.bz2'); return !!t && t.chain[0] === 'bz2'; }, hint: 'tar -cjvf logs.tar.bz2 /var/log/korbwerk', solve: ['tar -cjvf logs.tar.bz2 /var/log/korbwerk'] },
          { text: 'Erstelle <code>logs.tar.xz</code> aus demselben Verzeichnis.', check: (ev, w) => { const t = Q.tarOf(w, H + '/logs.tar.xz'); return !!t && t.chain[0] === 'xz'; }, hint: 'tar -cJvf logs.tar.xz /var/log/korbwerk – großes J!', solve: ['tar -cJvf logs.tar.xz /var/log/korbwerk'] },
          { text: 'Vergleiche die Größen aller drei Archive mit einem einzigen <code>ls -l</code> und einem Platzhalter.', check: (ev) => ran(ev, 'ls', c => flag(c, 'l')) && /logs/.test(ev.line) && /\*/.test(ev.line), hint: 'ls -l logs.tar.*', solve: ['ls -l logs.tar.*'] }
        ]
      },
      {
        id: 'tarx', title: 'Entpacken: tar -xzvf',
        story: 'Ich habe dir eine Lieferung in <code>/srv/austausch/lieferung.tar.gz</code> bereitgelegt. Pack sie aus!',
        html: '<p>Zum Entpacken ersetzt du <code>c</code> durch <code>x</code> (»extract«). tar entpackt ins <b>aktuelle Verzeichnis</b>:</p><pre class="snip">tar -xzvf archiv.tar.gz              hier auspacken\ntar -xzvf archiv.tar.gz -C ~/ziel     nach ~/ziel auspacken</pre><p>Moderne tar-Versionen erkennen die Kompression beim Entpacken selbst – <code>tar -xvf</code> genügt also auch.</p>',
        tasks: [{ text: 'Entpacke die Lieferung in dein Home-Verzeichnis und sieh nach, was drin ist.', check: (ev, w) => Q.isFile(w, H + '/lieferung/lieferschein_4711.txt'), hint: 'Sicherstellen, dass du in ~ bist (cd), dann tar -xzvf /srv/austausch/lieferung.tar.gz', solve: ['cd', 'tar -xzvf /srv/austausch/lieferung.tar.gz', 'ls lieferung'] }]
      },
      {
        id: 'zip', title: 'ZIP für Windows-Nutzer: zip',
        story: 'Das Steuerbüro arbeitet mit Windows. Mit .tar.gz können die nichts anfangen – schick ihnen eine ZIP-Datei.',
        html: '<p><code>zip</code> archiviert und komprimiert in einem Schritt. Zuerst kommt der Name des ZIP-Archivs, dann die Dateien. Für Verzeichnisse brauchst du <code>-r</code> – sonst landet nur der leere Ordner im Archiv.</p><pre class="snip">zip -r ARCHIV.zip VERZEICHNIS</pre>',
        tasks: [{ text: 'Packe <code>ablage/rechnungen</code> mit allen Rechnungen in <code>rechnungen.zip</code>.', check: (ev, w) => { const b = Q.blob(w, H + '/rechnungen.zip'); return !!b && b.kind === 'zip' && b.entries.filter(e => /\.pdf$/.test(e.path)).length >= 3; }, hint: 'zip -r rechnungen.zip ablage/rechnungen', solve: ['zip -r rechnungen.zip ablage/rechnungen'] }]
      },
      {
        id: 'unzip', title: 'ZIP entpacken: unzip',
        story: 'Im Gegenzug hat mir jemand Fotos vom neuen Serverraum als ZIP geschickt.',
        html: '<p><code>unzip ARCHIV.zip</code> entpackt ins aktuelle Verzeichnis, <code>unzip ARCHIV.zip -d ZIEL</code> in ein anderes. Gibt es eine Datei schon, fragt unzip nach: <kbd>y</kbd> ersetzen, <kbd>n</kbd> nicht, <kbd>A</kbd> alle.</p>',
        tasks: [{ text: 'Entpacke <code>/srv/austausch/fotos.zip</code> in dein Home-Verzeichnis.', check: (ev, w) => Q.isFile(w, H + '/fotos/rack_front.jpg'), hint: 'cd und dann unzip /srv/austausch/fotos.zip', solve: ['cd', 'unzip /srv/austausch/fotos.zip'] }]
      }
    ],
    quiz: [
      { q: 'Welcher Befehl erzeugt ein mit xz komprimiertes Archiv?', a: ['tar -cJvf daten.tar.xz daten', 'tar -cjvf daten.tar.xz daten', 'tar -xJvf daten.tar.xz daten', 'xz -r daten'], c: 0, ex: 'c = erstellen, J (groß) = xz. Kleines j wäre bzip2, x heißt entpacken.' },
      { q: 'Warum steht das <code>f</code> in <code>tar -czvf</code> am Ende?', a: ['Weil direkt danach der Archivname folgen muss', 'Weil tar die Optionen rückwärts liest', 'Das ist reiner Zufall', 'Weil f die Kompression startet'], c: 0, ex: 'f erwartet als Wert den Dateinamen – er muss unmittelbar folgen.' },
      { q: 'Was passiert mit <code>bericht.txt</code> nach <code>gzip bericht.txt</code>?', a: ['Sie wird durch bericht.txt.gz ersetzt', 'Sie bleibt und bericht.txt.gz kommt dazu', 'Sie wird gelöscht, ohne Ersatz', 'Sie wird in ein tar-Archiv gepackt'], c: 0, ex: 'gzip ersetzt die Datei. Mit -k bleibt das Original erhalten.' },
      { q: 'Ein Kunde mit Windows braucht drei Ordner als ein Paket. Was passt am besten?', a: ['zip -r paket.zip ordner1 ordner2 ordner3', 'gzip ordner1 ordner2 ordner3', 'tar -cvf paket.tar ordner1', 'xz -r paket'], c: 0, ex: 'ZIP öffnet Windows ohne Zusatzsoftware; -r nimmt die Ordner mit Inhalt auf.' }
    ]
  });

  // ======================================================================
  C.push({
    id: 'k8', dir: '8_netzwerk', title: 'Umzug ins neue Rack: Netzwerk mit ip', lz: [8],
    summary: 'ip a, ip link set up, ip addr add, ping, ip route, Standard-Gateway',
    setup: (w) => { LX.resetNet(w, { up: false }); },
    lessons: [
      {
        id: 'ipa', title: 'Schnittstellen anzeigen: ip a',
        story: 'Heute Nacht haben wir den Server ins neue Rack umgebaut. Seitdem ist er im Netz nicht mehr erreichbar. Du sitzt direkt an der Konsole – bring ihn wieder ans Netz!',
        html: '<p>Der Befehl <code>ip</code> ist das Schweizer Taschenmesser für das Netzwerk. <code>ip address show</code> – kurz <code>ip a</code> – zeigt alle Netzwerkschnittstellen:</p><ul class="legend"><li><b>lo</b> – die Loopback-Schnittstelle, mit der der Rechner mit sich selbst spricht (127.0.0.1)</li><li><b>enp0s3</b> – die Netzwerkkarte: <b>en</b> = Ethernet, <b>p0s3</b> = Steckplatz auf dem Mainboard (PCI-Bus 0, Slot 3)</li><li><b>state DOWN / UP</b> – ausgeschaltet oder aktiv</li><li><b>link/ether</b> – die MAC-Adresse</li><li><b>inet</b> – die IPv4-Adresse mit Präfixlänge</li></ul><div class="tip">Die älteren Befehle <code>ifconfig</code> und <code>route</code> sind veraltet und auf aktuellen Ubuntu-Systemen gar nicht mehr installiert.</div>',
        tasks: [
          { text: 'Lass dir alle Netzwerkschnittstellen anzeigen.', check: (ev) => ran(ev, 'ip', c => { const a = c.argv.slice(1).filter(x => x[0] !== '-'); return /^a(d|dd|ddr|ddre|ddres|ddress)?$/.test(a[0] || '') && (!a[1] || /^(show|sh|s|list|ls)$/.test(a[1])); }), hint: 'ip a', solve: ['ip a'] },
          { text: 'Test: Pinge das NAS unter <code>192.168.50.20</code> an. Was meldet ping?', check: (ev) => tried(ev, 'ping', c => args(c).indexOf('192.168.50.20') >= 0), hint: 'ping -c 2 192.168.50.20', solve: ['ping -c 2 192.168.50.20'] }
        ]
      },
      {
        id: 'iplink', title: 'Schnittstelle einschalten: ip link set',
        story: 'enp0s3 ist DOWN. Schalte sie ein – das darf nur root.',
        html: '<p>Mit <code>ip link</code> verwaltest du die Schnittstelle selbst (die »Verbindung«):</p><pre class="snip">sudo ip link set enp0s3 up      einschalten\nsudo ip link set enp0s3 down    ausschalten</pre><p>Danach steht bei <code>ip a</code> <b>state UP</b>. <b>LOWER_UP</b> bedeutet: Das Kabel ist eingesteckt und es gibt eine physische Verbindung.</p>',
        tasks: [{ text: 'Schalte die Schnittstelle <code>enp0s3</code> ein und prüfe den Zustand.', check: (ev, w) => !!Q.iface(w, 'enp0s3').up, hint: 'sudo ip link set enp0s3 up, danach ip a', solve: ['sudo ip link set enp0s3 up', 'ip a'] }]
      },
      {
        id: 'ipaddr', title: 'IP-Adresse vergeben: ip addr add',
        story: 'Die Schnittstelle ist an, hat aber noch keine Adresse. Laut Netzplan bekommt korb-srv01 die <b>192.168.50.10</b> im Netz <b>192.168.50.0/24</b>.',
        html: '<pre class="snip">sudo ip addr add 192.168.50.10/24 dev enp0s3</pre><p>Die <b>Präfixlänge</b> <code>/24</code> gehört unbedingt dazu! Sie sagt, wie viele Bits der Adresse das Netz bezeichnen: /24 entspricht der Subnetzmaske 255.255.255.0. Alle Adressen von 192.168.50.1 bis 192.168.50.254 liegen damit im eigenen Netz.</p><div class="tip warn">Lässt du <code>/24</code> weg, setzt ip <code>/32</code>. Dann glaubt der Server, er sei allein im Netz – und erreicht keinen Nachbarn.</div><p>Beim Hinzufügen der Adresse trägt Linux automatisch eine Route für das eigene Netz ein.</p>',
        tasks: [{ text: 'Gib <code>enp0s3</code> die Adresse 192.168.50.10 mit Präfixlänge 24 und kontrolliere das Ergebnis.', check: (ev, w) => Q.hasAddr(w, 'enp0s3', '192.168.50.10', 24), hint: 'sudo ip addr add 192.168.50.10/24 dev enp0s3', solve: ['sudo ip addr add 192.168.50.10/24 dev enp0s3', 'ip a'] }]
      },
      {
        id: 'ping', title: 'Im eigenen Netz pingen',
        story: 'Teste, ob das NAS jetzt antwortet.',
        html: '<p><code>ping</code> schickt kleine Testpakete an einen Rechner und misst, wie schnell die Antwort kommt. Unter Linux pingt ping <b>endlos</b> – beende es mit <kbd>Strg</kbd>+<kbd>C</kbd>. Mit <code>-c 4</code> hört es nach vier Paketen von selbst auf.</p><p>Am Ende steht eine Statistik: gesendete und empfangene Pakete sowie der Paketverlust.</p>',
        tasks: [
          { text: 'Pinge das NAS (192.168.50.20) mit genau 4 Paketen an.', check: (ev, w) => Q.pinged(w, '192.168.50.20'), hint: 'ping -c 4 192.168.50.20', solve: ['ping -c 4 192.168.50.20'] },
          { text: 'Pinge jetzt das Gateway 192.168.50.1 <b>ohne</b> <code>-c</code> und beende ping nach ein paar Antworten mit <kbd>Strg</kbd>+<kbd>C</kbd>.', check: (ev, w) => Q.pinged(w, '192.168.50.1'), hint: 'ping 192.168.50.1, dann Strg+C', solve: ['ping -c 3 192.168.50.1'] }
        ]
      },
      {
        id: 'gw', title: 'Raus ins Internet: das Standard-Gateway',
        story: 'Im eigenen Netz klappt alles. Aber der Server muss auch Updates und Zeitserver im Internet erreichen.',
        html: '<p>Für Ziele <b>außerhalb</b> des eigenen Netzes braucht der Rechner einen Router, das <b>Standard-Gateway</b>. Welche Wege er kennt, steht in der <b>Routing-Tabelle</b>:</p><pre class="snip">ip route        (kurz: ip r)</pre><p>Den Eintrag <code>192.168.50.0/24 … proto kernel</code> hat Linux beim Vergeben der Adresse selbst angelegt. Eine Route für den Rest der Welt fehlt noch – die <b>Standardroute</b> (default):</p><pre class="snip">sudo ip route add default via 192.168.50.1</pre><p>Das Gateway muss im eigenen Netz liegen, sonst meldet ip »Nexthop has invalid gateway«.</p>',
        tasks: [
          { text: 'Pinge den DNS-Server 9.9.9.9 im Internet. Was meldet ping?', check: (ev) => tried(ev, 'ping', c => args(c).indexOf('9.9.9.9') >= 0), hint: 'ping -c 2 9.9.9.9', solve: ['ping -c 2 9.9.9.9'] },
          { text: 'Sieh dir die Routing-Tabelle an.', check: (ev) => ran(ev, 'ip', c => { const a = c.argv.slice(1).filter(x => x[0] !== '-'); return /^r(o|ou|out|oute)?$/.test(a[0] || '') && (!a[1] || /^(show|sh|s|list|ls)$/.test(a[1])); }), hint: 'ip r', solve: ['ip r'] },
          { text: 'Trage 192.168.50.1 als Standard-Gateway ein.', check: (ev, w) => Q.defaultVia(w, '192.168.50.1'), hint: 'sudo ip route add default via 192.168.50.1', solve: ['sudo ip route add default via 192.168.50.1'] }
        ]
      },
      {
        id: 'extern', title: 'Verbindung nach draußen testen',
        story: 'Jetzt der Härtetest: Kommst du ins Internet?',
        html: '<p>Pinge zuerst eine IP-Adresse im Internet. Klappt das, teste einen Namen: Dafür muss zusätzlich die <b>Namensauflösung</b> (DNS) funktionieren, die aus <code>dns.quad9.net</code> eine IP-Adresse macht.</p><p>So grenzt du Fehler ein: Geht die IP, aber nicht der Name, liegt das Problem beim DNS – nicht bei deiner Netzwerkkonfiguration.</p>',
        tasks: [
          { text: 'Pinge 9.9.9.9 mit 3 Paketen.', check: (ev, w) => Q.pinged(w, '9.9.9.9'), hint: 'ping -c 3 9.9.9.9', solve: ['ping -c 3 9.9.9.9'] },
          { text: 'Pinge den Rechner <code>dns.quad9.net</code> über seinen Namen.', check: (ev) => ran(ev, 'ping', c => args(c).indexOf('dns.quad9.net') >= 0), hint: 'ping -c 2 dns.quad9.net', solve: ['ping -c 2 dns.quad9.net'] }
        ]
      },
      {
        id: 'routeget', title: 'Den Weg nachvollziehen und dauerhaft machen',
        story: 'Super, der Server ist zurück! Zum Abschluss noch zwei Dinge, die jede:r Admin wissen sollte.',
        html: '<p><code>ip route get ZIEL</code> verrät, welchen Weg ein Paket nehmen würde: über welches Gateway, welche Schnittstelle und mit welcher Absenderadresse. Das hilft enorm bei der Fehlersuche.</p><div class="tip warn"><b>Nicht dauerhaft!</b> Alles, was du mit <code>ip</code> einstellst, ist nach einem Neustart weg. Dauerhaft speichert Ubuntu die Netzwerkkonfiguration mit <b>Netplan</b> in Dateien unter <code>/etc/netplan/</code>. Das ist ein Thema für später.</div>',
        tasks: [
          { text: 'Lass dir den Weg zu 9.9.9.9 anzeigen.', check: (ev) => ran(ev, 'ip', c => c.argv.indexOf('get') >= 0), hint: 'ip route get 9.9.9.9', solve: ['ip route get 9.9.9.9'] },
          { type: 'answer', text: 'Über welche IP-Adresse läuft ein Paket zu 9.9.9.9?', accept: (s) => s.trim() === '192.168.50.1', hint: 'Das Wort nach »via«.' }
        ]
      }
    ],
    quiz: [
      { q: 'ping meldet »Das Netzwerk ist nicht erreichbar«. Was ist die wahrscheinlichste Ursache?', a: ['Es gibt keine passende Route – Adresse oder Standard-Gateway fehlt', 'Das Ziel ist ausgeschaltet', 'Die DNS-Auflösung funktioniert nicht', 'Das Kabel ist zu lang'], c: 0, ex: 'Die Meldung kommt sofort vom eigenen Rechner, weil er keinen Weg zum Ziel kennt.' },
      { q: 'Welche Befehlsfolge bringt eine ausgeschaltete Schnittstelle mit statischer Adresse ins Internet?', a: ['ip link set … up → ip addr add …/24 dev … → ip route add default via …', 'ip route add default → ip link set up → ping', 'ifconfig … up → route add default', 'ip addr add … → ping 9.9.9.9'], c: 0, ex: 'Einschalten, Adresse mit Präfix vergeben, Standard-Gateway eintragen – in dieser Reihenfolge, jeweils mit sudo.' },
      { q: 'Was passiert bei <code>sudo ip addr add 192.168.50.10 dev enp0s3</code> ohne Präfixlänge?', a: ['ip setzt /32 – Nachbarn im Netz sind nicht erreichbar', 'ip setzt automatisch /24', 'Fehlermeldung, Präfix fehlt', 'Die Adresse wird per DHCP ergänzt'], c: 0, ex: 'Ohne Angabe nimmt ip /32, also ein Netz mit nur dieser einen Adresse.' },
      { q: 'Wo steht in Ubuntu die dauerhafte Netzwerkkonfiguration?', a: ['In /etc/netplan/', 'In ~/.bashrc', 'Sie wird mit ip automatisch gespeichert', 'In /var/log/network'], c: 0, ex: 'Mit ip gesetzte Werte gehen beim Neustart verloren; dauerhaft gilt Netplan.' }
    ]
  });

  // Lernziele (gemeinsam für alle Teile)
  LX.LZ = {
    1: 'Im Dateisystem navigieren und Dateien anzeigen',
    2: 'Dateien und Verzeichnisse verwalten',
    3: 'Zugriffsrechte, Gruppen und sudo',
    4: 'Suchen, filtern und umleiten',
    5: 'Prozesse und Speicherplatz überwachen',
    6: 'Textdateien mit nano bearbeiten',
    7: 'Dateien packen, komprimieren und entpacken',
    8: 'Netzwerkschnittstellen mit ip konfigurieren'
  };
})(typeof window !== 'undefined' ? window : globalThis);
