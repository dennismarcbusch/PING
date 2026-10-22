/* Get-Going! – Tutorial-Inhalte (Kapitel 1–5) */
(function () {
'use strict';
const GG = globalThis.GG = globalThis.GG || {};
const H = GG.H;
const lc = s => String(s == null ? '' : s).toLowerCase();
const C = GG.COURSE = GG.COURSE || { chapters: [] };

/* ================= Kapitel 1 ================= */
C.chapters.push({
  id: 'k1', lz: 'LZ1', title: 'Befehle finden & Hilfe nutzen', short: 'Befehle & Hilfe',
  goal: 'Du findest Cmdlets über das Verb-Nomen-Schema und nutzt Get-Help, Parameter und Aliase sicher.',
  mira: 'Hallo und willkommen bei Korbwerk!\n\nDu sitzt an KORB-SRV02, unserem Dateiserver. Kalle, unser bisheriger Admin, ist weg – und hat uns ein paar Baustellen hinterlassen.\n\nBevor wir aufräumen, lernst du dein wichtigstes Werkzeug kennen: die PowerShell. Keine Sorge, du musst dir nicht alles merken. Du musst nur wissen, wie du Befehle findest.\n\nMira',
  lessons: [
    { id: '1.1', title: 'Der erste Befehl',
      text: `PowerShell-Befehle heißen **Cmdlets** (gesprochen „Command-lets“). Sie folgen immer dem Schema **Verb-Nomen**: \`Get-Date\`, \`Stop-Process\`, \`New-Item\`.

Groß- und Kleinschreibung ist egal – \`get-date\` funktioniert genauso. Trotzdem schreiben Profis die Namen so, wie sie in der Hilfe stehen. Das liest sich besser.

**Tipp:** Tippe \`Get-Da\` und drücke die **Tab-Taste** – PowerShell vervollständigt den Namen.`,
      task: 'Lass dir mit **Get-Date** das aktuelle Datum und die Uhrzeit anzeigen.',
      hint: 'Einfach den Namen des Cmdlets eintippen und Enter drücken.',
      solution: ['Get-Date'],
      check: st => H.used(st, 'Get-Date') },
    { id: '1.2', title: 'Das Verb-Nomen-Schema',
      text: `Weil alle Cmdlets gleich aufgebaut sind, kannst du gezielt suchen. \`Get-Command\` listet Befehle auf, und mit seinen Parametern filterst du:

\`\`\`
Get-Command -Verb Stop
Get-Command -Noun Process
Get-Command *Service*
\`\`\`

Das **Verb** sagt, was passiert (Get = abrufen, Set = ändern, New = anlegen, Remove = löschen). Das **Nomen** sagt, womit (Service, Process, Item …). Eine Liste der erlaubten Verben liefert \`Get-Verb\`.`,
      task: 'Lass dir alle Befehle anzeigen, deren **Nomen „Service“** lautet.',
      hint: 'Get-Command hat einen Parameter, der genauso heißt wie der zweite Teil des Schemas.',
      solution: ['Get-Command -Noun Service'],
      check: st => H.used(st, 'Get-Command', p => /service/i.test(H.pStr(p, 'Noun')) || /^\*-?service\*?$/i.test(H.pStr(p, 'Name'))) },
    { id: '1.3', title: 'Den richtigen Befehl finden',
      text: `In der Liste aus der letzten Aufgabe stehen alle Werkzeuge rund um Windows-Dienste: abrufen, starten, beenden, neu starten, ändern …

Wenn du das Verb kennst, ergibt sich der Name fast von selbst. Die wichtigsten Verben solltest du kennen: **Get, Set, New, Remove, Start, Stop, Restart, Enable, Disable, Add, Import, Export**.`,
      task: 'Mit welchem Cmdlet **startest** du einen Dienst? Trage den Namen ins Antwortfeld ein.',
      answer: 'Cmdlet-Name',
      hint: 'Verb für „starten“ + Nomen „Service“.',
      solution: [{ ans: 'Start-Service' }],
      check: st => H.ans(st, 'Start-Service') },
    { id: '1.4', title: 'Hilfe lesen',
      text: `\`Get-Help\` zeigt zu jedem Cmdlet eine Beschreibung. Besonders praktisch:

\`\`\`
Get-Help Get-Process -Examples     # nur Beispiele
Get-Help Get-Process -Parameter Name
Get-Help Get-Process -Full         # alles
\`\`\`

Statt \`Get-Help\` kannst du auch \`help\` tippen. Auf echten Servern lädt man die Hilfetexte einmal mit \`Update-Help\` herunter – hier sind sie schon da.`,
      task: 'Lass dir die **Beispiele** zu **Get-ChildItem** anzeigen. Welcher Parameter sorgt dafür, dass auch alle **Unterordner** durchsucht werden?',
      answer: 'Parameter',
      hint: 'Get-Help Get-ChildItem -Examples – achte auf Beispiel 2.',
      solution: ['Get-Help Get-ChildItem -Examples', { ans: '-Recurse' }],
      check: st => H.used(st, 'Get-Help') && H.ans(st, 'Recurse', '-Recurse') },
    { id: '1.5', title: 'Parameter und Werte',
      text: `Parameter beginnen mit einem Bindestrich. Viele erwarten einen Wert:

\`\`\`
Get-ChildItem -Path C:\\Logs -Filter *.log
\`\`\`

In der SYNTAX-Zeile der Hilfe siehst du, welche Parameter es gibt. Steht ein Name in eckigen Klammern wie \`[[-Path] <String[]>]\`, darfst du ihn weglassen und den Wert einfach an die richtige Stelle schreiben (**Positionsparameter**): \`Get-ChildItem C:\\Logs\`.

Parameternamen darfst du abkürzen, solange sie eindeutig sind – \`-Fi\` statt \`-Filter\`. In Skripten schreibt man sie aber aus.`,
      task: 'Liste alle **.exe-Dateien** direkt im Ordner **C:\\Windows** auf. Verwende dafür die Parameter **-Path** und **-Filter**.',
      hint: 'Get-ChildItem -Path … -Filter …',
      solution: ['Get-ChildItem -Path C:\\Windows -Filter *.exe'],
      check: st => H.used(st, 'Get-ChildItem', p => /^c:\\windows\\?$/i.test(H.pStr(p, 'Path')) && /^\*\.exe$/i.test(H.pStr(p, 'Filter'))) },
    { id: '1.6', title: 'Aliase – und ihre Falle',
      text: `Damit Umsteiger sich schnell zurechtfinden, gibt es **Aliase**: \`dir\`, \`ls\` und \`gci\` rufen alle \`Get-ChildItem\` auf, \`cd\` ruft \`Set-Location\` auf, \`cat\` ruft \`Get-Content\` auf.

**Aber Vorsicht:** Ein Alias übernimmt nur den *Namen*, nicht die Parameter. Wer aus Linux \`ls -la\` gewohnt ist, bekommt einen Fehler – \`Get-ChildItem\` kennt keinen Parameter \`-la\`. Versteckte Dateien zeigt hier \`-Force\`.

Probier es ruhig aus: \`ls -la\`. Lies die Fehlermeldung genau – PowerShell sagt dir, welcher Parameter nicht passt.

In Skripten verwendest du **keine** Aliase, sondern immer den vollen Cmdlet-Namen.`,
      task: 'Finde mit **Get-Alias** heraus, welches Cmdlet hinter dem Alias **cat** steckt.',
      answer: 'Cmdlet-Name',
      hint: 'Get-Alias cat',
      solution: ['Get-Alias cat', { ans: 'Get-Content' }],
      check: st => H.used(st, 'Get-Alias') && H.ans(st, 'Get-Content') },
    { id: '1.7', title: 'Konzepte nachschlagen: about_-Themen',
      text: `Neben Cmdlets erklärt die Hilfe auch **Konzepte** – in den sogenannten *about_-Themen*:

\`\`\`
Get-Help about_*                 # Liste aller Themen
Get-Help about_Comparison_Operators
\`\`\`

Das wichtigste Konzept der PowerShell ist die **Pipeline**. Sie ist der Grund, warum PowerShell anders funktioniert als die Linux-Shell oder die alte Eingabeaufforderung. Darum geht es in Kapitel 3 – einen ersten Blick wirfst du jetzt.`,
      task: 'Öffne das Hilfethema **about_Pipelines**.',
      hint: 'Get-Help about_… – Tab-Vervollständigung funktioniert auch hier.',
      solution: ['Get-Help about_Pipelines'],
      check: st => H.used(st, 'Get-Help', p => /about_pipelines/i.test(H.pStr(p, 'Name'))) }
  ],
  quiz: [
    { q: 'Welcher Name ist ein gültiges Cmdlet nach dem Verb-Nomen-Schema?', o: ['Service-Get', 'Get-Service', 'GetService', 'service get'], c: 1, e: 'Cmdlets heißen immer Verb-Nomen, also zuerst die Tätigkeit, dann das Objekt.' },
    { q: 'Du suchst alle Befehle, die etwas mit Prozessen zu tun haben. Welcher Befehl hilft dir am direktesten?', o: ['Get-Help Process', 'Get-Command -Noun Process', 'Get-Process -List', 'Find-Command Process'], c: 1, e: 'Get-Command -Noun filtert nach dem Nomen-Teil des Cmdlet-Namens.' },
    { q: 'Warum schlägt „ls -la“ in der PowerShell fehl?', o: ['ls gibt es in Windows nicht.', 'Der Alias ls verweist auf Get-ChildItem, und das kennt keinen Parameter -la.', 'Man muss ls großschreiben.', 'Man braucht Administratorrechte.'], c: 1, e: 'Aliase übersetzen nur den Namen. Die Parameter müssen zum Cmdlet passen (hier z. B. -Force).' },
    { q: 'Was bedeutet [[-Path] <String[]>] in der SYNTAX-Zeile der Hilfe?', o: ['Path ist Pflicht und muss benannt werden.', 'Path ist optional; der Name -Path darf auch weggelassen werden.', 'Path darf nur einen einzigen Wert haben.', 'Path ist veraltet.'], c: 1, e: 'Die äußeren Klammern: optional. Die inneren Klammern um den Namen: Positionsparameter, der Name darf entfallen. [] hinter String: mehrere Werte möglich.' }
  ]
});

/* ================= Kapitel 2 ================= */
C.chapters.push({
  id: 'k2', lz: 'LZ2', title: 'Dateisystem, Provider & Archive', short: 'Dateisystem',
  goal: 'Du navigierst, legst an, kopierst, löschst, liest Dateien, nutzt Provider wie die Registry und erstellst ZIP-Archive.',
  mira: 'Gut gemacht!\n\nJetzt geht es an die Freigaben. Kalle hat in C:\\Freigaben\\Daten Notizen hinterlassen – irgendwo. Und wir brauchen einen sauberen Projektordner.\n\nSchau dich um, aber lösch nichts, was du nicht verstanden hast.\n\nMira',
  lessons: [
    { id: '2.1', title: 'Navigieren',
      text: `\`Set-Location\` (Alias \`cd\`) wechselt den Ordner, \`Get-Location\` (Alias \`pwd\`) zeigt, wo du bist. Die Eingabeaufforderung zeigt den aktuellen Pfad ohnehin an: \`PS C:\\Users\\azubi>\`.

\`\`\`
Set-Location C:\\Logs
Set-Location ..          # eine Ebene nach oben
Set-Location ~           # zurück ins eigene Profil
\`\`\`

Pfade mit Leerzeichen setzt du in Anführungszeichen: \`Set-Location "C:\\Program Files"\`.`,
      task: 'Wechsle in den Ordner **C:\\Freigaben\\Daten**.',
      hint: 'Set-Location mit dem Pfad.',
      solution: ['Set-Location C:\\Freigaben\\Daten'],
      check: st => lc(st.sessions.normal.loc) === 'c:\\freigaben\\daten' },
    { id: '2.2', title: 'Versteckte Dateien',
      text: `\`Get-ChildItem\` zeigt versteckte und Systemdateien standardmäßig **nicht** an. Mit \`-Force\` siehst du alles. In der Spalte **Mode** erkennst du die Attribute:

\`\`\`
d-----   Ordner (directory)
-a----   Datei (archive)
-a-h--   versteckte Datei (hidden)
--r---   schreibgeschützt (read-only)
\`\`\``,
      task: 'In **C:\\Freigaben\\Daten** liegt eine versteckte Datei von Kalle. Wie heißt sie?',
      answer: 'Dateiname',
      hint: 'Get-ChildItem -Force – achte auf das h in der Mode-Spalte.',
      solution: ['Get-ChildItem C:\\Freigaben\\Daten -Force', { ans: 'kalle-notizen.txt' }],
      check: st => H.ans(st, 'kalle-notizen.txt') },
    { id: '2.3', title: 'Dateien lesen',
      text: `\`Get-Content\` (Alias \`cat\`, \`type\`) gibt den Inhalt einer Textdatei aus. Praktische Parameter:

\`\`\`
Get-Content datei.txt -TotalCount 5    # die ersten 5 Zeilen
Get-Content datei.txt -Tail 5          # die letzten 5 Zeilen
\`\`\``,
      task: 'Lies Kalles Notizen. Auf welchen **Server** sichert der Dienst KalleBackup?',
      answer: 'Servername',
      hint: 'Get-Content C:\\Freigaben\\Daten\\kalle-notizen.txt',
      solution: ['Get-Content C:\\Freigaben\\Daten\\kalle-notizen.txt', { ans: 'KORB-BACKUP01' }],
      check: st => H.ans(st, 'KORB-BACKUP01', 'korb-backup01.korbwerk.intern', /^\\\\korb-backup01/) },
    { id: '2.4', title: 'Ordner und Dateien anlegen',
      text: `\`New-Item\` legt Dateien und Ordner an. Den Typ bestimmst du mit \`-ItemType\`:

\`\`\`
New-Item C:\\Temp\\Test -ItemType Directory
New-Item C:\\Temp\\Test\\info.txt -ItemType File -Value "Erste Zeile"
\`\`\`

Für Ordner gibt es die Kurzform \`mkdir\`. Existiert das Element schon, meldet PowerShell einen Fehler – mit \`-Force\` würde es überschrieben.`,
      task: 'Lege den Ordner **C:\\Freigaben\\Projekte** an und darin die Datei **README.txt** mit dem Inhalt **Projektordner der Firma Korbwerk**.',
      hint: 'Zweimal New-Item: einmal -ItemType Directory, einmal mit -Value "…".',
      solution: ['New-Item C:\\Freigaben\\Projekte -ItemType Directory', 'New-Item C:\\Freigaben\\Projekte\\README.txt -ItemType File -Value "Projektordner der Firma Korbwerk"'],
      check: st => H.isDir(st, 'C:\\Freigaben\\Projekte') && /projektordner der firma korbwerk/i.test(H.content(st, 'C:\\Freigaben\\Projekte\\README.txt') || '') },
    { id: '2.5', title: 'Kopieren mit Platzhaltern',
      text: `\`Copy-Item\` (Alias \`copy\`, \`cp\`) kopiert, \`Move-Item\` (Alias \`move\`, \`mv\`) verschiebt. Mit dem Platzhalter \`*\` erwischst du mehrere Dateien auf einmal:

\`\`\`
Copy-Item C:\\Logs\\*.log -Destination C:\\Backup
\`\`\`

Ganze Ordner kopierst du mit \`-Recurse\`.`,
      task: 'Kopiere alle **.docx-Dateien** aus **C:\\Freigaben\\Daten\\Vorlagen** in den neuen Ordner **C:\\Freigaben\\Projekte**.',
      hint: 'Copy-Item C:\\Freigaben\\Daten\\Vorlagen\\*.docx -Destination …',
      solution: ['Copy-Item C:\\Freigaben\\Daten\\Vorlagen\\*.docx -Destination C:\\Freigaben\\Projekte'],
      check: st => ['Briefkopf.docx', 'Rechnung.docx', 'Lieferschein.docx'].every(n => H.exists(st, 'C:\\Freigaben\\Projekte\\' + n)) },
    { id: '2.6', title: 'Löschen – mit Netz und doppeltem Boden',
      text: `\`Remove-Item\` (Alias \`del\`, \`rm\`) löscht **ohne Papierkorb**. Deshalb gibt es zwei Sicherheitsparameter, die fast alle ändernden Cmdlets kennen:

\`\`\`
Remove-Item C:\\Temp\\alt -Recurse -WhatIf    # zeigt nur, was passieren würde
Remove-Item C:\\Temp\\alt -Recurse -Confirm   # fragt bei jedem Element nach
\`\`\`

Einen Ordner mit Inhalt löschst du mit \`-Recurse\`. Ohne fragt PowerShell nach.`,
      task: 'Sieh dir zuerst mit **-WhatIf** an, was passieren würde, und lösche dann den Ordner **C:\\Temp\\kalle-alt** samt Inhalt.',
      hint: 'Remove-Item C:\\Temp\\kalle-alt -Recurse -WhatIf, danach ohne -WhatIf.',
      solution: ['Remove-Item C:\\Temp\\kalle-alt -Recurse -WhatIf', 'Remove-Item C:\\Temp\\kalle-alt -Recurse'],
      check: st => !H.exists(st, 'C:\\Temp\\kalle-alt') && H.usedAny(st, 'Remove-Item', p => H.p(p, 'WhatIf') === true) },
    { id: '2.7', title: 'Text anhängen',
      text: `Drei Cmdlets schreiben in Textdateien:

\`\`\`
Set-Content   datei.txt "Text"    # ersetzt den Inhalt
Add-Content   datei.txt "Text"    # hängt eine Zeile an
Clear-Content datei.txt           # leert die Datei
\`\`\`

Achte auf den Unterschied: Wer versehentlich \`Set-Content\` statt \`Add-Content\` nimmt, überschreibt die Datei.`,
      task: 'Hänge an **C:\\Freigaben\\Projekte\\README.txt** die Zeile **Ansprechpartnerin: Mira Hofmann** an. Der bisherige Inhalt muss erhalten bleiben.',
      hint: 'Add-Content Pfad "Text"',
      solution: ['Add-Content C:\\Freigaben\\Projekte\\README.txt "Ansprechpartnerin: Mira Hofmann"'],
      check: st => { const c = H.content(st, 'C:\\Freigaben\\Projekte\\README.txt') || ''; return /ansprechpartnerin: mira hofmann/i.test(c) && /projektordner/i.test(c); } },
    { id: '2.8', title: 'Provider: die Registry wie ein Laufwerk',
      text: `PowerShell behandelt nicht nur Festplatten als Laufwerke. Sogenannte **Provider** machen auch andere Datenspeicher begehbar:

\`\`\`
HKLM:   Registrierung, HKEY_LOCAL_MACHINE
HKCU:   Registrierung, HKEY_CURRENT_USER
Env:    Umgebungsvariablen
Alias:  Aliase
\`\`\`

Mit \`Get-PSDrive\` siehst du alle Laufwerke. Schlüssel durchsuchst du mit \`Get-ChildItem\`, die **Werte** eines Schlüssels liest \`Get-ItemProperty\`.`,
      task: 'Kalle hat unter **HKLM:\\SOFTWARE\\Korbwerk\\Backup** Einstellungen gespeichert. Welches **Kennwort** steht dort im Klartext?',
      answer: 'Kennwort',
      hint: 'Get-ItemProperty HKLM:\\SOFTWARE\\Korbwerk\\Backup',
      solution: ['Get-ItemProperty HKLM:\\SOFTWARE\\Korbwerk\\Backup', { ans: 'Sommer2019!' }],
      check: st => String(st.answer || '').trim() === 'Sommer2019!' || H.ans(st, 'sommer2019!'),
      after: 'Ein Kennwort im Klartext in der Registry ist ein ernstes Sicherheitsproblem – jeder mit Leserechten kann es sehen. Merk dir das, wir kümmern uns später darum.' },
    { id: '2.9', title: 'ZIP-Archive',
      text: `Für ZIP-Dateien gibt es zwei Cmdlets:

\`\`\`
Compress-Archive -Path C:\\Logs -DestinationPath C:\\Backup\\logs.zip
Expand-Archive   -Path C:\\Backup\\logs.zip -DestinationPath C:\\Temp\\logs
\`\`\`

Gibst du einen Ordner an, landet der Ordner selbst im Archiv. Mit \`C:\\Logs\\*\` packst du nur seinen Inhalt. Existiert das Ziel schon, brauchst du \`-Update\` oder \`-Force\`.`,
      task: 'Sichere den Ordner **C:\\Freigaben\\Projekte** in das Archiv **C:\\Backup\\projekte.zip**.',
      hint: 'Compress-Archive -Path … -DestinationPath …',
      solution: ['Compress-Archive -Path C:\\Freigaben\\Projekte -DestinationPath C:\\Backup\\projekte.zip'],
      check: st => H.exists(st, 'C:\\Backup\\projekte.zip') }
  ],
  quiz: [
    { q: 'Wie zeigst du in der PowerShell auch versteckte Dateien an?', o: ['Get-ChildItem -a', 'Get-ChildItem -Hidden -All', 'Get-ChildItem -Force', 'dir /h'], c: 2, e: '-Force zeigt versteckte und Systemelemente an. (-Hidden zeigt nur versteckte – -a gibt es nicht.)' },
    { q: 'Was macht „Remove-Item C:\\Daten -Recurse -WhatIf“?', o: ['Löscht C:\\Daten mit Rückfrage.', 'Zeigt nur an, was gelöscht würde, ohne etwas zu löschen.', 'Löscht C:\\Daten in den Papierkorb.', 'Fehler, weil -WhatIf und -Recurse sich ausschließen.'], c: 1, e: '-WhatIf simuliert den Vorgang. Ideal, um gefährliche Befehle vorher zu prüfen.' },
    { q: 'Mit welchem Befehl liest du die Werte eines Registrierungsschlüssels?', o: ['Get-ChildItem HKLM:\\SOFTWARE\\X', 'Get-ItemProperty HKLM:\\SOFTWARE\\X', 'Get-Content HKLM:\\SOFTWARE\\X', 'regedit HKLM:\\SOFTWARE\\X'], c: 1, e: 'Schlüssel sind wie Ordner (Get-ChildItem), Werte sind Eigenschaften eines Schlüssels (Get-ItemProperty).' },
    { q: 'Was passiert mit „Set-Content log.txt \"neu\"“, wenn log.txt schon 100 Zeilen enthält?', o: ['„neu“ wird angehängt.', 'Die Datei enthält danach nur noch „neu“.', 'Es erscheint ein Fehler.', 'Es wird eine zweite Datei log(1).txt angelegt.'], c: 1, e: 'Set-Content ersetzt den gesamten Inhalt. Zum Anhängen gibt es Add-Content.' }
  ]
});

/* ================= Kapitel 3 ================= */
C.chapters.push({
  id: 'k3', lz: 'LZ3', title: 'Die Objekt-Pipeline', short: 'Pipeline',
  goal: 'Du verstehst, dass PowerShell Objekte weiterreicht, und filterst, sortierst, gruppierst und formatierst sie gezielt.',
  mira: 'Jetzt kommt das Herzstück.\n\nIn Linux schiebst du Text durch die Pipe und schneidest ihn mit grep und cut zurecht. In der PowerShell wandern OBJEKTE durch die Pipeline – mit Eigenschaften, die du direkt abfragen kannst.\n\nWenn du das verstanden hast, ist der Rest nur noch Vokabeln.\n\nMira',
  lessons: [
    { id: '3.1', title: 'Was steckt in einem Objekt?',
      text: `Was du am Bildschirm siehst, ist nur eine **Ansicht**. Dahinter stehen Objekte mit vielen Eigenschaften. \`Get-Member\` (Alias \`gm\`) zeigt dir:

- den **TypeName** – welche Art von Objekt das ist,
- die **Property**s – Eigenschaften wie Name oder Status,
- die **Method**s – Aktionen wie Stop() oder Start().

\`\`\`
Get-Process | Get-Member
\`\`\``,
      task: 'Untersuche die Objekte, die **Get-Service** liefert. Wie lautet ihr **TypeName**?',
      answer: 'TypeName',
      hint: 'Get-Service | Get-Member – die Zeile ganz oben.',
      solution: ['Get-Service | Get-Member', { ans: 'System.ServiceProcess.ServiceController' }],
      check: st => H.ans(st, 'System.ServiceProcess.ServiceController') },
    { id: '3.2', title: 'Eigenschaften auswählen',
      text: `\`Select-Object\` (Alias \`select\`) wählt die Eigenschaften aus, die dich interessieren – auch solche, die in der Standardansicht fehlen:

\`\`\`
Get-Service | Select-Object Name, Status, StartType
Get-Process | Select-Object -First 5
\`\`\`

Mit \`Select-Object *\` siehst du alle Eigenschaften eines Objekts.`,
      task: 'Zeige von allen Prozessen nur die Eigenschaften **Name**, **Id** und **CPU** an.',
      hint: 'Get-Process | Select-Object …, …, …',
      solution: ['Get-Process | Select-Object Name, Id, CPU'],
      check: st => H.used(st, 'Select-Object', p => { const s = H.pStr(p, 'Property').toLowerCase(); return ['name', 'id', 'cpu'].every(x => s.split(',').map(y => y.trim()).includes(x)); }) && H.line(st, /get-process|\bgps\b|\bps\b/i) },
    { id: '3.3', title: 'Sortieren',
      text: `\`Sort-Object\` (Alias \`sort\`) sortiert nach einer Eigenschaft – aufsteigend oder mit \`-Descending\` absteigend. Zusammen mit \`Select-Object -First\` bekommst du „die Top 5“:

\`\`\`
Get-ChildItem C:\\Logs | Sort-Object Length -Descending | Select-Object -First 3
\`\`\`

Weil nach dem **Wert** sortiert wird und nicht nach Text, landet 1000 korrekt hinter 200.`,
      task: 'Welcher Prozess hat bisher am meisten **CPU-Zeit** verbraucht? Sortiere die Prozesse danach.',
      answer: 'Prozessname',
      hint: 'Get-Process | Sort-Object CPU -Descending | Select-Object -First 1',
      solution: ['Get-Process | Sort-Object CPU -Descending | Select-Object -First 5', { ans: 'KalleSync' }],
      check: st => H.used(st, 'Sort-Object') && H.ans(st, 'KalleSync', 'kallesync.exe') },
    { id: '3.4', title: 'Filtern mit Where-Object',
      text: `\`Where-Object\` (Alias \`where\`, \`?\`) lässt nur Objekte durch, die eine Bedingung erfüllen. Es gibt zwei Schreibweisen:

\`\`\`
Get-Service | Where-Object Status -eq Running
Get-Service | Where-Object { $_.Status -eq "Running" }
\`\`\`

In der Klammer-Schreibweise steht \`$_\` für das Objekt, das gerade durch die Pipeline kommt. Vergleichsoperatoren beginnen mit Bindestrich: \`-eq -ne -gt -lt -ge -le -like -match\`.`,
      task: 'Zeige alle Dienste an, die **gestoppt** sind.',
      hint: 'Status -eq Stopped',
      solution: ['Get-Service | Where-Object Status -eq Stopped'],
      check: st => H.used(st, 'Where-Object') && H.line(st, /get-service|\bgsv\b/i, true) && H.line(st, /stopped/i, true) },
    { id: '3.5', title: 'Bedingungen verknüpfen',
      text: `Mehrere Bedingungen verknüpfst du mit \`-and\`, \`-or\` und \`-not\`. Das geht nur in der Klammer-Schreibweise:

\`\`\`
Get-ChildItem C:\\Logs | Where-Object { $_.Length -gt 1KB -and $_.Extension -eq ".log" }
\`\`\`

Ein Dienst, der automatisch starten **soll**, aber **nicht läuft**, ist ein klassisches Warnsignal für Admins.`,
      task: 'Welcher Dienst hat den Starttyp **Automatic**, ist aber **Stopped**?',
      answer: 'Dienstname',
      hint: 'Where-Object { $_.StartType -eq "Automatic" -and $_.Status -eq "Stopped" }',
      solution: ['Get-Service | Where-Object { $_.StartType -eq "Automatic" -and $_.Status -eq "Stopped" }', { ans: 'KalleBackup' }],
      check: st => H.used(st, 'Where-Object') && H.ans(st, 'KalleBackup', 'Kalle Backup Service') },
    { id: '3.6', title: 'Zählen und messen',
      text: `\`Measure-Object\` (Alias \`measure\`) zählt Objekte und rechnet mit Eigenschaften:

\`\`\`
Get-ChildItem C:\\Windows -File | Measure-Object
Get-ChildItem C:\\Logs | Measure-Object Length -Sum -Average -Maximum
\`\`\`

Kürzer geht das Zählen mit der Eigenschaft \`.Count\`: \`(Get-Service).Count\`.`,
      task: 'Wie viele **.log-Dateien** liegen direkt in **C:\\Logs**?',
      answer: 'Anzahl',
      hint: 'Get-ChildItem C:\\Logs -Filter *.log | Measure-Object',
      solution: ['Get-ChildItem C:\\Logs -Filter *.log | Measure-Object', { ans: '8' }],
      check: st => H.ansNum(st, 8) },
    { id: '3.7', title: 'Gruppieren',
      text: `\`Group-Object\` (Alias \`group\`) fasst Objekte mit gleichem Wert zusammen und zählt sie:

\`\`\`
Get-Service | Group-Object Status
Get-Process | Group-Object Company | Sort-Object Count -Descending
\`\`\``,
      task: 'Gruppiere die Dateien in **C:\\Freigaben\\Daten** nach ihrer Dateiendung (**Extension**). Welche Endung kommt am häufigsten vor?',
      answer: 'Dateiendung',
      hint: 'Get-ChildItem C:\\Freigaben\\Daten | Group-Object Extension',
      solution: ['Get-ChildItem C:\\Freigaben\\Daten -File | Group-Object Extension | Sort-Object Count -Descending', { ans: '.docx' }],
      check: st => H.used(st, 'Group-Object') && H.ans(st, '.docx', 'docx') },
    { id: '3.8', title: 'Berechnete Eigenschaften',
      text: `Manchmal passt eine Eigenschaft nicht ganz – \`Length\` ist zum Beispiel in Byte. Mit einer **berechneten Eigenschaft** baust du dir eine eigene Spalte:

\`\`\`
Get-ChildItem C:\\Logs -File |
  Select-Object Name, @{Name="KB"; Expression={ [math]::Round($_.Length / 1KB, 1) }}
\`\`\`

Für die reine Bildschirmausgabe gibt es außerdem \`Format-Table\` (\`ft\`) und \`Format-List\` (\`fl\`). **Achtung:** Format-Cmdlets stehen immer am **Ende** der Pipeline – danach kann man nicht mehr sortieren, filtern oder exportieren.`,
      task: 'Zeige für die Dateien in **C:\\Logs** den **Namen** und eine berechnete Spalte **KB** mit der Größe in Kilobyte an.',
      hint: 'Select-Object Name, @{Name="KB"; Expression={ $_.Length / 1KB }}',
      solution: ['Get-ChildItem C:\\Logs -File | Select-Object Name, @{Name="KB"; Expression={ [math]::Round($_.Length / 1KB, 1) }}'],
      check: st => H.used(st, 'Select-Object', p => { const v = H.p(p, 'Property'); return Array.isArray(v) ? v.some(x => x instanceof GG.PSHash) : v instanceof GG.PSHash; }) },
    { id: '3.9', title: 'Für jedes Objekt etwas tun',
      text: `Viele Cmdlets nehmen Objekte direkt aus der Pipeline an. \`Rename-Item -NewName\` akzeptiert sogar einen Skriptblock, der für **jedes** Objekt neu ausgewertet wird:

\`\`\`
Get-ChildItem *.txt | Rename-Item -NewName { $_.Name -replace '\\.txt$', '.bak' }
\`\`\`

Allgemein führt \`ForEach-Object\` (Alias \`%\`, \`foreach\`) einen Block für jedes Objekt aus:

\`\`\`
Get-Service Spooler, WinRM | ForEach-Object { "$($_.Name) ist $($_.Status)" }
\`\`\`

Der Operator \`-replace\` ersetzt Text mit einem regulären Ausdruck. \`\\.\` steht für einen echten Punkt, \`$\` für das Textende.`,
      task: 'In **C:\\Freigaben\\Scans** sollen alle Dateien mit der Endung **.jpeg** auf **.jpg** umbenannt werden – mit einem einzigen Befehl.',
      hint: 'Get-ChildItem C:\\Freigaben\\Scans\\*.jpeg | Rename-Item -NewName { $_.Name -replace … }',
      solution: ["Get-ChildItem C:\\Freigaben\\Scans\\*.jpeg | Rename-Item -NewName { $_.Name -replace '\\.jpeg$', '.jpg' }"],
      check: st => { const f = H.files(st, 'C:\\Freigaben\\Scans').map(x => x.name.toLowerCase()); return f.length === 7 && f.every(n => /^scan_00\d\.jpg$/.test(n)); } }
  ],
  quiz: [
    { q: 'Was wird in der PowerShell-Pipeline zwischen zwei Cmdlets weitergegeben?', o: ['Textzeilen', 'Objekte mit Eigenschaften und Methoden', 'Dateinamen', 'Nur Zahlen'], c: 1, e: 'Genau das unterscheidet die PowerShell von klassischen Shells: Es fließen .NET-Objekte durch die Pipeline.' },
    { q: 'Welcher Befehl liefert die drei größten Dateien in C:\\Logs?', o: ['Get-ChildItem C:\\Logs | Select-Object -First 3 | Sort-Object Length', 'Get-ChildItem C:\\Logs | Sort-Object Length -Descending | Select-Object -First 3', 'Get-ChildItem C:\\Logs | Format-Table | Sort-Object Length', 'Get-ChildItem C:\\Logs -Top 3'], c: 1, e: 'Erst sortieren, dann die ersten drei auswählen. Umgekehrt würdest du drei beliebige Dateien sortieren.' },
    { q: 'Wofür steht $_ in „Where-Object { $_.Status -eq \"Running\" }“?', o: ['Für die letzte Fehlermeldung', 'Für das aktuelle Objekt in der Pipeline', 'Für alle Objekte gleichzeitig', 'Für die Ausgabe des vorigen Befehls als Text'], c: 1, e: '$_ (oder $PSItem) ist das Objekt, das gerade bearbeitet wird.' },
    { q: 'Warum funktioniert „Get-Service | Format-Table Name, Status | Export-Csv d.csv“ nicht wie gewünscht?', o: ['Export-Csv braucht Administratorrechte.', 'Format-Table erzeugt Formatierungsobjekte statt Dienst-Objekten – die landen dann in der CSV.', 'Format-Table kann nur eine Spalte.', 'CSV-Dateien gibt es in Windows nicht.'], c: 1, e: 'Format-Cmdlets gehören ans Ende. Zum Auswählen von Spalten vor dem Export nimmt man Select-Object.' }
  ]
});

/* ================= Kapitel 4 ================= */
C.chapters.push({
  id: 'k4', lz: 'LZ4', title: 'Ausgabe, Export & Fehler', short: 'Export & Fehler',
  goal: 'Du speicherst Ergebnisse als Text, CSV und HTML, liest CSV-Daten ein, durchsuchst Logdateien und gehst gezielt mit Fehlern um.',
  mira: 'Die Geschäftsführung möchte Berichte. Nicht als Screenshot, sondern als Datei, die man in Excel öffnen kann.\n\nAußerdem stolperst du sicher bald über rote Fehlermeldungen. Die sind kein Weltuntergang – man muss sie nur lesen können.\n\nMira',
  lessons: [
    { id: '4.1', title: 'Ausgabe in Dateien umleiten',
      text: `Bildschirmausgabe landet mit \`Out-File\` oder dem Umleitungsoperator \`>\` in einer Textdatei:

\`\`\`
Get-Service | Out-File C:\\Berichte\\dienste.txt
Get-Service > C:\\Berichte\\dienste.txt          # gleiche Wirkung
Get-Date >> C:\\Berichte\\dienste.txt            # anhängen
\`\`\`

Die Datei enthält dann genau das, was du sonst am Bildschirm sehen würdest – also Text, keine Objekte mehr. Windows PowerShell 5.1 speichert dabei übrigens in **UTF-16** („Unicode“). Mit \`-Encoding UTF8\` bekommst du kleinere Dateien.`,
      task: 'Speichere die Liste aller Dienste in der Datei **C:\\Berichte\\dienste.txt**.',
      hint: 'Get-Service | Out-File …',
      solution: ['Get-Service | Out-File C:\\Berichte\\dienste.txt'],
      check: st => /spooler/i.test(H.content(st, 'C:\\Berichte\\dienste.txt') || '') },
    { id: '4.2', title: 'CSV für Excel',
      text: `\`Export-Csv\` speichert **Objekte** als Tabelle. Zwei Eigenheiten von Windows PowerShell 5.1 solltest du kennen:

- Ohne \`-NoTypeInformation\` steht in der ersten Zeile \`#TYPE …\`. Excel zeigt das als Datenzeile an.
- Deutsches Excel erwartet **Semikolons** als Trennzeichen: \`-Delimiter ";"\` (oder \`-UseCulture\`).

\`\`\`
Get-Service | Select-Object Name, Status |
  Export-Csv C:\\Berichte\\dienste.csv -NoTypeInformation -Delimiter ";"
\`\`\``,
      task: 'Exportiere **Name**, **Id** und **CPU** aller Prozesse nach **C:\\Berichte\\prozesse.csv** – ohne #TYPE-Zeile und mit Semikolon als Trennzeichen.',
      hint: 'Select-Object Name, Id, CPU | Export-Csv … -NoTypeInformation -Delimiter ";"',
      solution: ['Get-Process | Select-Object Name, Id, CPU | Export-Csv C:\\Berichte\\prozesse.csv -NoTypeInformation -Delimiter ";"'],
      check: st => { const c = H.csv(H.content(st, 'C:\\Berichte\\prozesse.csv'), ';'); return !!c && !c.typeLine && ['Name', 'Id', 'CPU'].every(h => c.head.includes(h)) && c.rows.length > 5; } },
    { id: '4.3', title: 'CSV einlesen',
      text: `\`Import-Csv\` macht aus jeder Zeile einer CSV-Datei wieder ein Objekt. Die Spaltenüberschriften werden zu Eigenschaften:

\`\`\`
Import-Csv C:\\Import\\liste.csv -Delimiter ";" | Where-Object Raum -eq "104"
\`\`\`

Danach kannst du filtern, sortieren und zählen wie mit jedem anderen Objekt.`,
      task: 'In **C:\\Import\\inventar.csv** steht Korbwerks Hardware. Wie viele Geräte vom **Typ Drucker** gibt es?',
      answer: 'Anzahl',
      hint: 'Import-Csv … -Delimiter ";" | Where-Object Typ -eq Drucker | Measure-Object',
      solution: ['Import-Csv C:\\Import\\inventar.csv -Delimiter ";" | Where-Object Typ -eq Drucker', { ans: '3' }],
      check: st => H.used(st, 'Import-Csv') && H.ansNum(st, 3) },
    { id: '4.4', title: 'HTML-Bericht',
      text: `\`ConvertTo-Html\` erzeugt aus Objekten eine HTML-Tabelle. Weil es **Text** liefert und keine Datei schreibt, kombinierst du es mit \`Out-File\`:

\`\`\`
Get-Service | Select-Object Name, Status |
  ConvertTo-Html -Title "Dienste" | Out-File C:\\Berichte\\dienste.html
\`\`\`

Solche Berichte kann jeder im Browser öffnen.`,
      task: 'Erstelle aus der Ausgabe von **Get-Volume** einen HTML-Bericht **C:\\Berichte\\volumes.html**.',
      hint: 'Get-Volume | ConvertTo-Html | Out-File …',
      solution: ['Get-Volume | ConvertTo-Html -Title "Laufwerke KORB-SRV02" | Out-File C:\\Berichte\\volumes.html'],
      check: st => /<table>/i.test(H.content(st, 'C:\\Berichte\\volumes.html') || '') },
    { id: '4.5', title: 'Text durchsuchen',
      text: `Für Text gibt es dann doch ein „grep“: \`Select-String\` (Alias \`sls\`) durchsucht Dateien nach einem Muster und zeigt Dateiname, Zeilennummer und Treffer:

\`\`\`
Select-String -Path C:\\Logs\\*.log -Pattern "ERROR"
Select-String "timeout" C:\\Logs\\app.log
\`\`\`

Groß-/Kleinschreibung wird standardmäßig ignoriert.`,
      task: 'In einer der Logdateien in **C:\\Logs** steht, dass der Speicherplatz **knapp** wird. In welcher Datei?',
      answer: 'Dateiname',
      hint: 'Select-String -Path C:\\Logs\\*.log -Pattern knapp',
      solution: ['Select-String -Path C:\\Logs\\*.log -Pattern knapp', { ans: 'backup.log' }],
      check: st => H.used(st, 'Select-String') && H.ans(st, 'backup.log', 'c:\\logs\\backup.log') },
    { id: '4.6', title: 'Fehler gezielt ausblenden',
      text: `Rote Fehler bei der Suche über ganze Laufwerke sind normal: In manche Ordner darfst du nicht hinein. Statt den Bildschirm vollzumüllen, steuerst du das mit dem allgemeinen Parameter \`-ErrorAction\` (\`-ea\`):

\`\`\`
-ErrorAction SilentlyContinue   # Fehler nicht anzeigen, weitermachen
-ErrorAction Stop               # beim ersten Fehler abbrechen
-ErrorAction Inquire            # nachfragen
\`\`\`

Die Fehler sind trotzdem nicht weg – sie landen in der Variablen \`$Error\`.`,
      task: 'Irgendwo auf **C:\\** liegt die Datei **kunden_2019.bak**. Durchsuche das ganze Laufwerk danach, ohne dass Fehlermeldungen angezeigt werden. In welchem **Ordner** liegt sie?',
      answer: 'Ordnerpfad',
      hint: 'Get-ChildItem C:\\ -Recurse -Filter kunden_2019.bak -ErrorAction SilentlyContinue',
      solution: ['Get-ChildItem C:\\ -Recurse -Filter kunden_2019.bak -ErrorAction SilentlyContinue', { ans: 'C:\\Freigaben\\Daten\\Alt' }],
      check: st => H.usedAny(st, 'Get-ChildItem', p => /silentlycontinue|ignore/i.test(H.pStr(p, 'ErrorAction'))) && H.ans(st, 'c:\\freigaben\\daten\\alt', 'c:\\freigaben\\daten\\alt\\', 'c:\\freigaben\\daten\\alt\\kunden_2019.bak') },
    { id: '4.7', title: 'Fehlerobjekte untersuchen',
      text: `Auch Fehler sind Objekte. Der jüngste steht in \`$Error[0]\`:

\`\`\`
$Error[0].Exception.Message           # die Meldung
$Error[0].Exception.GetType().FullName # die Art des Fehlers
$Error[0].CategoryInfo
\`\`\`

Die **Art des Fehlers** (Exception-Typ) brauchst du später, um mit \`try/catch\` gezielt auf bestimmte Fehler zu reagieren.`,
      task: 'Rufe **Get-Item C:\\gibtsnicht** auf und finde dann heraus, welchen **Exception-Typ** der Fehler hat (vollständiger Name).',
      answer: 'Exception-Typ',
      hint: '$Error[0].Exception.GetType().FullName',
      expectErrors: true,
      solution: ['Get-Item C:\\gibtsnicht', '$Error[0].Exception.GetType().FullName', { ans: 'System.Management.Automation.ItemNotFoundException' }],
      check: st => H.ans(st, 'System.Management.Automation.ItemNotFoundException', 'ItemNotFoundException') }
  ],
  quiz: [
    { q: 'Welche Zeile erzeugt eine CSV-Datei, die deutsches Excel ohne Nacharbeit sauber öffnet?', o: ['Get-Service | Export-Csv d.csv', 'Get-Service | Out-File d.csv', 'Get-Service | Select-Object Name, Status | Export-Csv d.csv -NoTypeInformation -Delimiter ";"', 'Get-Service | Format-Table | Export-Csv d.csv'], c: 2, e: 'Spalten mit Select-Object auswählen, #TYPE-Zeile weglassen, Semikolon als Trennzeichen.' },
    { q: 'Was macht -ErrorAction SilentlyContinue?', o: ['Es verhindert, dass Fehler entstehen.', 'Fehler werden nicht angezeigt, der Befehl läuft weiter; die Fehler stehen in $Error.', 'Der Befehl bricht beim ersten Fehler ab.', 'Fehler werden in eine Datei geschrieben.'], c: 1, e: 'Die Fehler passieren trotzdem – sie werden nur nicht ausgegeben.' },
    { q: 'Mit welchem Cmdlet durchsuchst du Logdateien nach dem Wort „ERROR“?', o: ['Find-Item', 'Get-Content -Search', 'Select-String', 'Where-Object -Text'], c: 2, e: 'Select-String ist das PowerShell-Gegenstück zu grep/findstr.' },
    { q: 'Welche Variable enthält die zuletzt aufgetretenen Fehler?', o: ['$LastError', '$Error', '$_', '$?'], c: 1, e: '$Error ist eine Liste, $Error[0] ist der jüngste Fehler. $? sagt nur, ob der letzte Befehl erfolgreich war.' }
  ]
});

/* ================= Kapitel 5 ================= */
const HALLO = 'Write-Host "Hallo von $env:COMPUTERNAME!" -ForegroundColor Cyan';
const ALTE = 'param(\n    [int]$Tage = 30\n)\nGet-ChildItem C:\\Logs -File | Where-Object LastWriteTime -lt (Get-Date).AddDays(-$Tage)';
C.chapters.push({
  id: 'k5', lz: 'LZ5', title: 'Variablen & Skripte', short: 'Skripte',
  goal: 'Du arbeitest mit Variablen, Arrays und Hashtabellen, schreibst Skripte mit Parametern und Funktionen und verstehst Ausführungsrichtlinien.',
  mira: 'Ab jetzt wird es richtig nützlich.\n\nAlles, was du zweimal tippst, gehört in ein Skript. Kalle hat auch Skripte hinterlassen – leider aus dem Internet und ungeprüft.\n\nIn diesem Kapitel schreibst du deine eigenen. Mit dem Editor (notepad) kannst du Dateien bearbeiten und mit Strg+S speichern.\n\nMira',
  lessons: [
    { id: '5.1', title: 'Variablen',
      text: `Variablen beginnen mit \`$\` und können alles speichern – auch die komplette Ausgabe eines Cmdlets:

\`\`\`
$heute = Get-Date
$dienste = Get-Service
$dienste.Count
$dienste | Where-Object Status -eq Running
\`\`\`

So musst du langsame Abfragen nur einmal ausführen. \`Get-Variable\` zeigt alle Variablen der Sitzung.`,
      task: 'Speichere alle Dienste in der Variablen **$dienste**. Wie viele Dienste sind es?',
      answer: 'Anzahl',
      hint: '$dienste = Get-Service – dann $dienste.Count',
      solution: ['$dienste = Get-Service', '$dienste.Count', { ans: '33' }],
      check: st => { const v = H.gv(st, 'dienste'); return Array.isArray(v) && v.length > 10 && H.ansNum(st, st.w.services.length); } },
    { id: '5.2', title: 'Zeichenketten',
      text: `In **doppelten** Anführungszeichen werden Variablen ersetzt, in **einfachen** nicht:

\`\`\`
$name = "Mira"
"Hallo $name"        # Hallo Mira
'Hallo $name'        # Hallo $name
\`\`\`

Für Eigenschaften oder ganze Ausdrücke brauchst du einen **Teilausdruck** \`$( … )\`:

\`\`\`
"Es laufen $((Get-Process).Count) Prozesse."
\`\`\`

Umgebungsvariablen erreichst du über das Laufwerk \`env:\` – zum Beispiel \`$env:USERNAME\`.`,
      task: 'Gib den Text **Ich arbeite auf KORB-SRV02** aus – der Servername soll dabei aus **$env:COMPUTERNAME** kommen.',
      hint: '"Ich arbeite auf $env:COMPUTERNAME"',
      solution: ['"Ich arbeite auf $env:COMPUTERNAME"'],
      check: st => H.line(st, /\$env:computername/i, true) && /ich arbeite auf korb-srv02/i.test(H.outText(st)) },
    { id: '5.3', title: 'Arrays und Hashtabellen',
      text: `Ein **Array** ist eine Liste. Elemente trennst du mit Komma, der Index beginnt bei 0:

\`\`\`
$farben = "rot", "grün", "blau"
$farben[0]        # rot
$farben.Count     # 3
\`\`\`

Eine **Hashtabelle** speichert Paare aus Schlüssel und Wert:

\`\`\`
$kontakt = @{ Name = "Mira"; Raum = "012" }
$kontakt.Raum
\`\`\``,
      task: 'Lege ein Array **$server** mit den drei Servern **KORB-DC01**, **KORB-APP01** und **KORB-BACKUP01** an.',
      hint: '$server = "KORB-DC01", "KORB-APP01", "KORB-BACKUP01"',
      solution: ['$server = "KORB-DC01", "KORB-APP01", "KORB-BACKUP01"'],
      check: st => { const v = H.gv(st, 'server'); return Array.isArray(v) && v.length === 3 && ['korb-dc01', 'korb-app01', 'korb-backup01'].every(n => v.map(x => lc(x)).includes(n)); } },
    { id: '5.4', title: 'Vergleiche – und die >-Falle',
      text: `Vergleichsoperatoren beginnen in der PowerShell mit Bindestrich:

\`\`\`
-eq  gleich            -ne  ungleich
-gt  größer als        -lt  kleiner als
-ge  größer/gleich     -le  kleiner/gleich
-like  Platzhalter     -match  regulärer Ausdruck
\`\`\`

**Achtung Falle:** \`$a > 5\` vergleicht nicht, sondern **leitet die Ausgabe in eine Datei namens „5“ um**! Probier es aus und schau danach mit \`Get-ChildItem\` nach.`,
      task: 'Prüfe mit dem richtigen Operator, ob **$dienste.Count größer als 30** ist.',
      hint: '$dienste.Count -gt 30',
      solution: ['$dienste.Count -gt 30'],
      check: st => H.line(st, /\$dienste[\s\S]*-gt\s+30/i, true) && H.outputs(st).some(x => x === true || x === false) },
    { id: '5.5', title: 'Entscheiden und wiederholen',
      text: `Mit \`if\` entscheidest du, mit \`foreach\` wiederholst du:

\`\`\`
foreach ($s in $server) {
    if (Test-Connection $s -Count 1 -Quiet) {
        "$s ist erreichbar"
    } else {
        "$s antwortet nicht"
    }
}
\`\`\`

\`Test-Connection … -Quiet\` liefert einfach \`True\` oder \`False\` – perfekt für \`if\`. Mehrzeilige Eingaben sind in der Konsole möglich: Nach einer offenen Klammer zeigt PowerShell \`>>\` und wartet auf weitere Zeilen. Eine leere Zeile schließt ab.`,
      task: 'Schreibe eine **foreach**-Schleife über **$server**, die mit **if** und **Test-Connection** für jeden Server ausgibt, ob er erreichbar ist.',
      hint: 'foreach ($s in $server) { if (Test-Connection $s -Count 1 -Quiet) { "$s ok" } else { "$s weg" } }',
      solution: ['foreach ($s in $server) { if (Test-Connection $s -Count 1 -Quiet) { "$s ist erreichbar" } else { "$s antwortet nicht" } }'],
      check: st => H.line(st, /foreach\s*\(/i, true) && H.line(st, /\bif\s*\(/i, true) && H.used(st, 'Test-Connection') },
    { id: '5.6', title: 'Das erste Skript',
      text: `Ein Skript ist eine Textdatei mit der Endung **.ps1**. Mit \`notepad C:\\Skripte\\test.ps1\` öffnest du den Editor; **Strg+S** speichert.

Zum Ausführen gibst du den **Pfad** an. Liegt das Skript im aktuellen Ordner, brauchst du \`.\\\` davor:

\`\`\`
.\\test.ps1
C:\\Skripte\\test.ps1
\`\`\`

Nur \`test.ps1\` funktioniert absichtlich **nicht**: So kann dir niemand ein Skript unterschieben, das genauso heißt wie ein echter Befehl.`,
      task: 'Erstelle mit notepad das Skript **C:\\Skripte\\hallo.ps1** mit dem Inhalt `' + HALLO + '` und führe es aus.',
      hint: 'notepad C:\\Skripte\\hallo.ps1 – speichern – dann Set-Location C:\\Skripte und .\\hallo.ps1',
      solution: [{ np: { file: 'C:\\Skripte\\hallo.ps1', content: HALLO } }, 'Set-Location C:\\Skripte', '.\\hallo.ps1'],
      check: st => H.exists(st, 'C:\\Skripte\\hallo.ps1') && H.ranScript(st, /\\hallo\.ps1$/i) },
    { id: '5.7', title: 'Ausführungsrichtlinien',
      text: `Ob Skripte laufen dürfen, regelt die **Ausführungsrichtlinie** (Execution Policy). Auf Windows Server ist \`RemoteSigned\` Standard: Eigene Skripte laufen, **aus dem Internet geladene** nur mit digitaler Signatur.

Woher weiß Windows, dass eine Datei aus dem Internet stammt? Browser hängen einen unsichtbaren Datenstrom **Zone.Identifier** an:

\`\`\`
Get-ExecutionPolicy -List
Get-Item C:\\Skripte\\x.ps1 -Stream *
Get-Content C:\\Skripte\\x.ps1 -Stream Zone.Identifier
\`\`\`

Hast du ein Skript **gelesen und geprüft**, gibst du es mit \`Unblock-File\` frei. Die Richtlinie auf \`Unrestricted\` zu setzen, ist dagegen keine gute Idee.`,
      task: 'Kalles Skript **C:\\Skripte\\aufraeumen.ps1** stammt aus dem Internet. Lies es, gib es frei und führe es aus.',
      hint: 'Get-Content …, Unblock-File …, dann C:\\Skripte\\aufraeumen.ps1',
      solution: ['Get-Content C:\\Skripte\\aufraeumen.ps1', 'Unblock-File C:\\Skripte\\aufraeumen.ps1', 'C:\\Skripte\\aufraeumen.ps1'],
      check: st => { const n = H.node(st, 'C:\\Skripte\\aufraeumen.ps1'); return n && !n.zone && H.ranScript(st, /aufraeumen\.ps1$/i); } },
    { id: '5.8', title: 'Skripte mit Parametern',
      text: `Mit einem \`param()\`-Block am Anfang nimmt dein Skript Parameter entgegen – mit Typ und Standardwert:

\`\`\`
param(
    [int]$Tage = 30
)
Get-ChildItem C:\\Logs -File | Where-Object LastWriteTime -lt (Get-Date).AddDays(-$Tage)
\`\`\`

Aufruf: \`.\\alte-dateien.ps1 -Tage 60\`. Ohne Angabe gilt der Standardwert 30. Tab-Vervollständigung funktioniert auch für deine eigenen Parameter.`,
      task: 'Erstelle **C:\\Skripte\\alte-dateien.ps1** mit dem Parameter **-Tage** (siehe Beispiel) und rufe es mit **-Tage 60** auf. Wie viele Dateien in C:\\Logs sind älter als 60 Tage?',
      answer: 'Anzahl',
      hint: 'Inhalt wie im Beispiel, dann C:\\Skripte\\alte-dateien.ps1 -Tage 60',
      solution: [{ np: { file: 'C:\\Skripte\\alte-dateien.ps1', content: ALTE } }, 'C:\\Skripte\\alte-dateien.ps1 -Tage 60', { ans: '3' }],
      check: st => /param\s*\(/i.test(H.content(st, 'C:\\Skripte\\alte-dateien.ps1') || '') && H.cmds(st).some(c => c.script && /alte-dateien\.ps1$/i.test(c.name) && c.ok !== false && String(H.p(c.params, 'Tage')) === '60') && H.ansNum(st, 3) },
    { id: '5.9', title: 'Funktionen',
      text: `Eine **Funktion** ist ein benannter Skriptblock – wie ein eigenes Cmdlet. Benenne sie nach dem Verb-Nomen-Schema:

\`\`\`
function Get-Speicher {
    param([string]$Laufwerk = "C")
    $v = Get-Volume -DriveLetter $Laufwerk
    [math]::Round($v.SizeRemaining / 1GB, 1)
}
Get-Speicher -Laufwerk D
\`\`\`

Funktionen, die du in der Konsole definierst, gelten bis zum Schließen des Fensters. Dauerhaft landen sie in einem Skript oder Modul.`,
      task: 'Definiere die Funktion **Get-Speicher** aus dem Beispiel und rufe sie für **Laufwerk D** auf.',
      hint: 'Du kannst die Funktion in einer Zeile schreiben: function Get-Speicher { param(…) … }',
      solution: ['function Get-Speicher { param([string]$Laufwerk = "C"); $v = Get-Volume -DriveLetter $Laufwerk; [math]::Round($v.SizeRemaining / 1GB, 1) }', 'Get-Speicher -Laufwerk D'],
      check: st => H.cmds(st).some(c => c.fn && lc(c.name) === 'get-speicher' && c.ok !== false && /^d$/i.test(String(H.p(c.params, 'Laufwerk') || ''))) },
    { id: '5.10', title: 'Fehler abfangen',
      text: `Mit \`try\`/\`catch\` reagierst du auf Fehler, statt das Skript scheitern zu lassen:

\`\`\`
try {
    Get-Item C:\\Backup\\fehlt.zip -ErrorAction Stop
}
catch {
    Write-Warning "Datei fehlt: $($_.Exception.Message)"
}
\`\`\`

**Wichtig:** \`catch\` greift nur bei **abbrechenden** Fehlern. Die meisten Cmdlet-Fehler brechen nicht ab – deshalb das \`-ErrorAction Stop\`. Im catch-Block steht der Fehler in \`$_\`.`,
      task: 'Versuche, **C:\\Backup\\gibtsnicht.zip** zu lesen, und fange den Fehler mit **try/catch** ab. Im catch-Block soll eine **Warnung** ausgegeben werden.',
      hint: 'try { Get-Item … -ErrorAction Stop } catch { Write-Warning "…" }',
      solution: ['try { Get-Item C:\\Backup\\gibtsnicht.zip -ErrorAction Stop } catch { Write-Warning "Datei fehlt: $($_.Exception.Message)" }'],
      check: st => (st.entries || []).some(e => e.caught) && H.used(st, 'Write-Warning') }
  ],
  quiz: [
    { q: 'Was gibt \'Server: $env:COMPUTERNAME\' (einfache Anführungszeichen) aus?', o: ['Server: KORB-SRV02', 'Server: $env:COMPUTERNAME', 'Einen Fehler', 'Server:'], c: 1, e: 'In einfachen Anführungszeichen wird nichts ersetzt.' },
    { q: 'Was passiert bei „$anzahl > 10“?', o: ['Es wird True oder False ausgegeben.', 'Die Ausgabe von $anzahl wird in eine Datei namens 10 geschrieben.', 'Es entsteht ein Syntaxfehler.', '$anzahl wird auf 10 gesetzt.'], c: 1, e: '> ist der Umleitungsoperator. Vergleichen geht mit -gt.' },
    { q: 'Ein Skript liegt im aktuellen Ordner. Wie startest du es?', o: ['skript.ps1', 'run skript.ps1', '.\\skript.ps1', 'start-script skript'], c: 2, e: 'PowerShell sucht Skripte aus Sicherheitsgründen nicht im aktuellen Ordner – der Pfad .\\ ist Pflicht.' },
    { q: 'Ein heruntergeladenes Skript wird mit „ist nicht digital signiert“ abgelehnt. Was ist der empfohlene Weg?', o: ['Set-ExecutionPolicy Unrestricted', 'Skript prüfen und dann Unblock-File', 'Das Skript umbenennen', 'Als Administrator starten'], c: 1, e: 'Unblock-File entfernt nur für diese eine geprüfte Datei die Internet-Markierung. Die Richtlinie bleibt sicher.' }
  ]
});
})();
