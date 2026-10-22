/* Get-Going! – Tutorial-Inhalte (Kapitel 6–10) */
(function () {
'use strict';
const GG = globalThis.GG = globalThis.GG || {};
const H = GG.H;
const lc = s => String(s == null ? '' : s).toLowerCase();
const C = GG.COURSE = GG.COURSE || { chapters: [] };
const A = cmd => ({ a: cmd });
const KW = 'OU=Korbwerk,DC=korbwerk,DC=intern';

/* ================= Kapitel 6 ================= */
C.chapters.push({
  id: 'k6', lz: 'LZ6', title: 'Benutzer, Rechte & Freigaben', short: 'Rechte',
  goal: 'Du arbeitest bewusst mit Administratorrechten, verwaltest lokale Konten und Gruppen, setzt NTFS-Rechte und richtest SMB-Freigaben ein.',
  mira: 'Jetzt wird es ernst: Kalles Konten und Rechte.\n\nAuf dem Server hat Kalle ein lokales Konto mit Adminrechten, die Buchhaltung ist für JEDEN offen, und eine private Freigabe gibt es auch noch.\n\nFür diese Arbeiten brauchst du Administratorrechte. Die gibt es bei uns nicht dauerhaft, sondern nur auf Anfrage – das ist Absicht.\n\nMira',
  lessons: [
    { id: '6.1', title: 'Als Administrator arbeiten',
      text: `Du bist Mitglied der Gruppe **IT-Admins** und damit lokaler Administrator. Trotzdem läuft deine PowerShell mit **eingeschränkten** Rechten – das ist die **Benutzerkontensteuerung (UAC)**. Schadsoftware, die du versehentlich startest, bekommt so nicht automatisch Vollzugriff.

Für Verwaltungsaufgaben öffnest du bewusst ein zweites Fenster mit erhöhten Rechten:

\`\`\`
Start-Process powershell -Verb RunAs
\`\`\`

Nach der UAC-Bestätigung erscheint ein Tab **Administrator: Windows PowerShell**. Mit \`whoami /groups\` siehst du den Unterschied: Im normalen Fenster steht dort die Verbindlichkeitsstufe **Mittel**, im Admin-Fenster **Hoch**.

Arbeite nur dann im Admin-Tab, wenn du ihn wirklich brauchst.`,
      task: 'Versuche zuerst im normalen Fenster `New-LocalUser test -NoPassword` und lies die Fehlermeldung. Öffne dann eine **PowerShell als Administrator**.',
      hint: 'Start-Process powershell -Verb RunAs',
      solution: ['Start-Process powershell -Verb RunAs'],
      check: st => !!(st.sessions.admin && st.sessions.admin.elevated) },
    { id: '6.2', title: 'Lokale Konten deaktivieren',
      text: `Lokale Benutzer verwaltest du mit den Cmdlets aus dem Modul **Microsoft.PowerShell.LocalAccounts**:

\`\`\`
Get-LocalUser
Disable-LocalUser -Name alt
Enable-LocalUser -Name alt
\`\`\`

Konten ausgeschiedener Mitarbeiter werden zuerst **deaktiviert**, nicht gelöscht. So bleiben Dateibesitz und Protokolle nachvollziehbar.`,
      task: 'Deaktiviere im Admin-Tab das lokale Konto **kalle**.',
      hint: 'Disable-LocalUser -Name kalle',
      admin: true,
      solution: [A('Disable-LocalUser -Name kalle')],
      check: st => { const u = H.luser(st, 'kalle'); return u && !u.enabled; } },
    { id: '6.3', title: 'Konten anlegen',
      text: `\`New-LocalUser\` erwartet das Kennwort als **SecureString** – also nie als Klartext im Befehl. Am einfachsten fragst du es ab:

\`\`\`
$pw = Read-Host "Kennwort" -AsSecureString
New-LocalUser -Name scanner -Password $pw -Description "Konto für den Scanner"
\`\`\`

Das Kennwort muss die Komplexitätsregeln erfüllen (mindestens 8 Zeichen, drei Zeichenarten).`,
      task: 'Lege im Admin-Tab das lokale Konto **scanner** mit Kennwort und der Beschreibung **Konto für den Scanner** an.',
      hint: '$pw = Read-Host "Kennwort" -AsSecureString, danach New-LocalUser … -Password $pw -Description "…"',
      admin: true,
      solution: [A('$pw = ConvertTo-SecureString "Scan!2026x" -AsPlainText -Force'), A('New-LocalUser -Name scanner -Password $pw -Description "Konto für den Scanner"')],
      check: st => { const u = H.luser(st, 'scanner'); return u && u.enabled !== false && /scanner/i.test(u.desc || ''); } },
    { id: '6.4', title: 'Gruppenmitgliedschaften',
      text: `Wer in der lokalen Gruppe **Administratoren** ist, darf auf dem Server alles. Prüfe die Gruppe regelmäßig:

\`\`\`
Get-LocalGroupMember -Group Administratoren
Add-LocalGroupMember    -Group Remotedesktopbenutzer -Member scanner
Remove-LocalGroupMember -Group Administratoren -Member alt
\`\`\`

Beachte die deutschen Gruppennamen: **Administratoren**, **Benutzer**, **Remotedesktopbenutzer**.`,
      task: 'Entferne **kalle** aus der lokalen Gruppe **Administratoren**.',
      hint: 'Remove-LocalGroupMember -Group Administratoren -Member kalle',
      admin: true,
      solution: [A('Remove-LocalGroupMember -Group Administratoren -Member kalle')],
      check: st => !H.lgroupHas(st, 'Administratoren', 'kalle') },
    { id: '6.5', title: 'NTFS-Rechte lesen',
      text: `Wer auf einen Ordner zugreifen darf, steht in seiner **ACL** (Access Control List). Zwei Werkzeuge zeigen sie an:

\`\`\`
Get-Acl C:\\Freigaben\\Daten | Format-List
icacls C:\\Freigaben\\Daten
\`\`\`

In der icacls-Ausgabe bedeuten: **F** Vollzugriff, **M** Ändern, **RX** Lesen und Ausführen, **(OI)(CI)** wird an Dateien und Unterordner vererbt, **(I)** ist selbst geerbt.`,
      task: 'Sieh dir die Rechte auf **C:\\Freigaben\\Buchhaltung** an. Welches Konto hat dort **Vollzugriff**, obwohl es dort nichts zu suchen hat?',
      answer: 'Konto',
      hint: 'Get-Acl C:\\Freigaben\\Buchhaltung | Format-List',
      solution: ['Get-Acl C:\\Freigaben\\Buchhaltung | Format-List', { ans: 'Jeder' }],
      check: st => H.ans(st, 'Jeder', 'Everyone') },
    { id: '6.6', title: 'NTFS-Rechte ändern',
      text: `Am schnellsten änderst du Rechte mit \`icacls\`:

\`\`\`
icacls C:\\Ordner /remove Jeder
icacls C:\\Ordner /grant "KORBWERK\\GG-Vertrieb:(OI)(CI)M"
\`\`\`

Die PowerShell-Variante geht über \`Get-Acl\`, \`SetAccessRule()\` und \`Set-Acl\` – mächtiger, aber umständlicher. Beide brauchen Administratorrechte.

Rechte vergibt man an **Gruppen**, nicht an einzelne Benutzer.`,
      task: 'Entferne **Jeder** aus der ACL von **C:\\Freigaben\\Buchhaltung** und gib stattdessen der Gruppe **KORBWERK\\GG-Buchhaltung** das Recht **Ändern**, vererbt auf Dateien und Unterordner.',
      hint: 'icacls … /remove Jeder und icacls … /grant "KORBWERK\\GG-Buchhaltung:(OI)(CI)M"',
      admin: true,
      solution: [A('icacls C:\\Freigaben\\Buchhaltung /remove Jeder'), A('icacls C:\\Freigaben\\Buchhaltung /grant "KORBWERK\\GG-Buchhaltung:(OI)(CI)M"')],
      check: st => { const acl = H.acl(st, 'C:\\Freigaben\\Buchhaltung'); return !acl.some(r => lc(r.id) === 'jeder') && acl.some(r => lc(r.id) === 'korbwerk\\gg-buchhaltung' && r.r === 'M' && r.oi && r.ci && r.type !== 'Deny'); } },
    { id: '6.7', title: 'Ordner freigeben',
      text: `Eine **SMB-Freigabe** macht einen Ordner im Netzwerk erreichbar: \`\\\\KORB-SRV02\\Projekte\`.

\`\`\`
New-SmbShare -Name Projekte -Path C:\\Freigaben\\Projekte -ChangeAccess "KORBWERK\\Domänen-Benutzer"
Get-SmbShare
Get-SmbShareAccess -Name Projekte
\`\`\`

Freigabe- und NTFS-Rechte wirken **zusammen** – es gilt jeweils das strengere. Üblich: Freigabe großzügig (Ändern), fein steuern über NTFS.`,
      task: 'Gib den Ordner **C:\\Freigaben\\Projekte** unter dem Namen **Projekte** frei. Die **Domänen-Benutzer** sollen **Ändern** dürfen.',
      hint: 'New-SmbShare -Name … -Path … -ChangeAccess "KORBWERK\\Domänen-Benutzer"',
      admin: true,
      solution: [A('New-SmbShare -Name Projekte -Path C:\\Freigaben\\Projekte -ChangeAccess "KORBWERK\\Domänen-Benutzer"')],
      check: st => { const s = H.share(st, 'Projekte'); return s && /c:\\freigaben\\projekte$/i.test(s.path) && s.access.some(a => /domänen-benutzer$/i.test(a.account) && /change|full/i.test(a.right) && a.type === 'Allow'); } },
    { id: '6.8', title: 'Freigaben entfernen',
      text: `Freigaben, die mit \`$\` enden, sind **versteckt** – sie tauchen in der Netzwerkumgebung nicht auf, sind aber trotzdem erreichbar. Kalle hatte so eine.

\`\`\`
Remove-SmbShare -Name Alt$
\`\`\`

Der Ordner selbst bleibt dabei erhalten, nur die Freigabe verschwindet. PowerShell fragt vorher nach – mit \`-Force\` nicht.`,
      task: 'Entferne Kalles versteckte Freigabe **Kalle$**.',
      hint: 'Remove-SmbShare -Name Kalle$',
      admin: true,
      solution: [A('Remove-SmbShare -Name Kalle$ -Force')],
      check: st => !H.share(st, 'Kalle$') },
    { id: '6.9', title: 'Netzlaufwerke verbinden',
      text: `\`New-PSDrive\` legt ein Laufwerk an. Mit \`-Persist\` wird daraus ein echtes Netzlaufwerk, das auch im Explorer erscheint:

\`\`\`
New-PSDrive -Name P -PSProvider FileSystem -Root \\\\KORB-SRV02\\Projekte -Persist
Get-PSDrive -PSProvider FileSystem
\`\`\`

Netzlaufwerke gehören zum **Benutzer** – verbinde sie im normalen Fenster, nicht im Admin-Tab. (Die beiden Fenster sehen wegen der UAC nicht dieselben Laufwerke.)`,
      task: 'Verbinde im **normalen** Fenster die Freigabe **\\\\KORB-SRV02\\Projekte** als Laufwerk **P:**.',
      hint: 'New-PSDrive -Name P -PSProvider FileSystem -Root \\\\KORB-SRV02\\Projekte -Persist',
      solution: ['New-PSDrive -Name P -PSProvider FileSystem -Root \\\\KORB-SRV02\\Projekte -Persist'],
      check: st => (st.sessions.normal.psdrives || []).some(d => /^p$/i.test(d.name) && /^\\\\korb-srv02(\.korbwerk\.intern)?\\projekte\\?$/i.test(d.root)) }
  ],
  quiz: [
    { q: 'Du bist lokaler Administrator, bekommst aber „Zugriff verweigert“. Warum?', o: ['Das Konto ist gesperrt.', 'Die PowerShell läuft wegen der UAC ohne erhöhte Rechte.', 'Administratoren dürfen keine Benutzer anlegen.', 'Das Cmdlet ist veraltet.'], c: 1, e: 'Die Benutzerkontensteuerung startet Programme mit eingeschränktem Token. Erst „Als Administrator ausführen“ aktiviert die Adminrechte.' },
    { q: 'Was bedeutet „KORBWERK\\GG-Vertrieb:(OI)(CI)(M)“ in der icacls-Ausgabe?', o: ['Die Gruppe darf nur lesen.', 'Die Gruppe hat Ändern-Rechte, die auf Dateien und Unterordner vererbt werden.', 'Die Gruppe ist Besitzer.', 'Der Zugriff ist verboten.'], c: 1, e: 'M = Modify (Ändern), OI = Object Inherit (Dateien), CI = Container Inherit (Ordner).' },
    { q: 'Freigabe: „Jeder – Vollzugriff“. NTFS: „GG-Vertrieb – Lesen“. Was darf ein Vertriebsmitarbeiter über das Netzwerk?', o: ['Vollzugriff', 'Ändern', 'Lesen', 'Nichts'], c: 2, e: 'Freigabe- und NTFS-Rechte werden kombiniert, es gilt das restriktivere Recht.' },
    { q: 'Warum übergibt man New-LocalUser das Kennwort als SecureString?', o: ['Damit es schneller geht.', 'Damit das Kennwort nicht im Klartext im Befehlsverlauf oder in Skripten steht.', 'Weil Windows keine Texte als Kennwort kennt.', 'Damit das Konto deaktiviert angelegt wird.'], c: 1, e: 'Ein SecureString liegt verschlüsselt im Speicher und erscheint nicht im Verlauf.' }
  ]
});

/* ================= Kapitel 7 ================= */
C.chapters.push({
  id: 'k7', lz: 'LZ7', title: 'Prozesse, Dienste, Ereignisse & Software', short: 'Dienste',
  goal: 'Du untersuchst und beendest Prozesse, steuerst Dienste, wertest Ereignisprotokolle aus und installierst Software mit winget und PowerShellGet.',
  mira: 'Der Server ist langsam. Ich wette, das liegt an Kalles Sync-Tool – und an seinem Backup-Dienst, der jede Nacht scheitert.\n\nFinde heraus, was da läuft, und räum auf. Danach installieren wir noch ein paar Werkzeuge.\n\nMira',
  lessons: [
    { id: '7.1', title: 'Prozesse untersuchen',
      text: `\`Get-Process\` (Alias \`gps\`, \`ps\`) zeigt die laufenden Prozesse. Die wichtigsten Spalten:

\`\`\`
Handles   offene Handles          WS(K)  Arbeitsspeicher in KB
CPU(s)    verbrauchte CPU-Zeit    Id     Prozess-ID
\`\`\`

Einzelne Prozesse fragst du per Name oder \`-Id\` ab. Mehr Details liefert \`Select-Object *\`, den Besitzer zeigt \`-IncludeUserName\` (nur im Admin-Tab).`,
      task: 'Welche **Prozess-ID** hat der Prozess **KalleSync**?',
      answer: 'Id',
      hint: 'Get-Process KalleSync',
      solution: ['Get-Process KalleSync', { ans: '4711' }],
      check: st => H.ansNum(st, 4711) },
    { id: '7.2', title: 'Prozesse beenden',
      text: `\`Stop-Process\` beendet Prozesse – per \`-Id\` oder \`-Name\`, oder über die Pipeline:

\`\`\`
Stop-Process -Id 1234
Get-Process notepad | Stop-Process
\`\`\`

Prozesse **anderer Benutzer** kannst du nur im Admin-Tab beenden; ohne \`-Force\` fragt PowerShell dabei nach. Achtung: Der Prozess hat keine Chance, Daten zu speichern.`,
      task: 'Beende im Admin-Tab den Prozess **KalleSync** über seine **Id**.',
      hint: 'Stop-Process -Id …',
      admin: true,
      solution: [A('Stop-Process -Id 4711 -Force')],
      check: st => !H.proc(st, p => p.id === 4711) },
    { id: '7.3', title: 'Dienste steuern',
      text: `Dienste laufen im Hintergrund, auch ohne angemeldeten Benutzer. Die Cmdlets dazu kennst du schon aus Kapitel 1:

\`\`\`
Get-Service Spooler
Stop-Service Spooler
Start-Service Spooler
Restart-Service Spooler
\`\`\`

Der **Name** (Spooler) ist kurz und eindeutig, der **DisplayName** (Druckwarteschlange) lesbarer. Beide funktionieren, \`-DisplayName\` musst du aber ausschreiben.`,
      task: 'Die Druckaufträge hängen. Starte den Dienst **Spooler** neu.',
      hint: 'Restart-Service Spooler – im Admin-Tab.',
      admin: true,
      solution: [A('Restart-Service Spooler')],
      check: st => H.cmds(st).some(c => lc(c.name) === 'restart-service' && (c.restarted || []).some(n => lc(n) === 'spooler')) && H.svc(st, 'Spooler').status === 'Running' },
    { id: '7.4', title: 'Ereignisprotokolle',
      text: `Windows protokolliert Fehler in den **Ereignisprotokollen** (System, Application, Security). In Windows PowerShell 5.1 gibt es zwei Wege:

\`\`\`
Get-EventLog -LogName System -EntryType Error -Newest 10
Get-WinEvent -FilterHashtable @{ LogName = "System"; Level = 2 } -MaxEvents 10
\`\`\`

\`Get-EventLog\` ist einfacher, \`Get-WinEvent\` moderner und schneller. Die **Event-ID** identifiziert die Art des Ereignisses.`,
      task: 'Der Dienst **KalleBackup** scheitert jede Nacht beim Start. Welche **Event-ID** hat dieser Fehler im System-Protokoll?',
      answer: 'Event-ID',
      hint: 'Get-EventLog -LogName System -EntryType Error -Newest 10 – achte auf „Kalle Backup Service“.',
      solution: ['Get-EventLog -LogName System -EntryType Error -Newest 10', { ans: '7000' }],
      check: st => (H.used(st, 'Get-EventLog') || H.used(st, 'Get-WinEvent')) && H.ansNum(st, 7000) },
    { id: '7.5', title: 'Starttyp ändern',
      text: `Mit \`Set-Service\` änderst du die Eigenschaften eines Dienstes – vor allem den **Starttyp**:

\`\`\`
Automatic   startet mit Windows
Manual      startet nur bei Bedarf
Disabled    kann nicht gestartet werden
\`\`\`

Ein Dienst, der nur scheitert und das Protokoll füllt, wird deaktiviert, bis jemand ihn repariert.`,
      task: 'Setze den Starttyp von **KalleBackup** auf **Disabled**.',
      hint: 'Set-Service KalleBackup -StartupType Disabled',
      admin: true,
      solution: [A('Set-Service KalleBackup -StartupType Disabled')],
      check: st => H.svc(st, 'KalleBackup').start === 'Disabled' },
    { id: '7.6', title: 'Speicherplatz',
      text: `\`Get-Volume\` zeigt die Laufwerke mit Größe und freiem Platz. Die Werte sind intern in **Byte** gespeichert – zum Rechnen kennt die PowerShell die Einheiten \`KB\`, \`MB\`, \`GB\`, \`TB\`:

\`\`\`
(Get-Volume -DriveLetter C).SizeRemaining / 1GB
\`\`\``,
      task: 'Wie viele **GB** sind auf Laufwerk **D:** noch frei? (Ganze Zahl genügt.)',
      answer: 'GB',
      hint: 'Get-Volume – Spalte SizeRemaining',
      solution: ['Get-Volume', { ans: '188' }],
      check: st => H.ansNum(st, 187, 188) },
    { id: '7.7', title: 'Software mit winget',
      text: `Der **Windows-Paket-Manager** \`winget\` installiert Programme aus dem Internet – ohne Setup-Klickerei:

\`\`\`
winget search 7zip
winget show 7zip.7zip
winget install 7zip.7zip
winget list
winget upgrade --all
\`\`\`

winget ist kein Cmdlet, sondern ein normales Programm. Pakete werden über ihre eindeutige **Id** angesprochen.`,
      task: 'Installiere im Admin-Tab **7-Zip** mit winget.',
      hint: 'winget search 7zip, dann winget install mit der Id.',
      admin: true,
      solution: [A('winget install 7zip.7zip')],
      check: st => !!H.pkg(st, '7zip.7zip') },
    { id: '7.8', title: 'Module aus der PowerShell Gallery',
      text: `Zusätzliche Cmdlets kommen in **Modulen**. Die **PowerShell Gallery** ist das zentrale Verzeichnis dafür:

\`\`\`
Find-Module PSWindowsUpdate
Install-Module PSWindowsUpdate -Scope CurrentUser
Get-Command -Module PSWindowsUpdate
\`\`\`

In Windows PowerShell 5.1 installiert \`Install-Module\` standardmäßig für **alle** Benutzer – dafür braucht man Adminrechte. Mit \`-Scope CurrentUser\` geht es ohne. Beim ersten Mal fragt PowerShell nach dem NuGet-Anbieter und warnt, dass die Gallery „nicht vertrauenswürdig“ ist.`,
      task: 'Installiere im **normalen** Fenster das Modul **PSWindowsUpdate** für deinen Benutzer. Lass dir anschließend im **Admin-Tab** mit **Get-WindowsUpdate** die ausstehenden Updates anzeigen – das Abfragen von Windows Update braucht Adminrechte.',
      hint: 'Install-Module PSWindowsUpdate -Scope CurrentUser, Fragen mit J bzw. A beantworten. Danach im Admin-Tab: Get-WindowsUpdate',
      solution: ['Install-Module PSWindowsUpdate -Scope CurrentUser', A('Get-WindowsUpdate')],
      check: st => !!H.module(st, 'PSWindowsUpdate') && H.used(st, 'Get-WindowsUpdate') }
  ],
  quiz: [
    { q: 'Mit welchem Befehl findest du die fünf Prozesse mit dem größten Arbeitsspeicher?', o: ['Get-Process -Top 5', 'Get-Process | Sort-Object WS -Descending | Select-Object -First 5', 'Get-Process | Measure-Object WS', 'Get-Process | Format-Table -First 5'], c: 1, e: 'Sortieren nach WS (Working Set), absteigend, dann die ersten fünf.' },
    { q: 'Ein Dienst soll nicht mehr automatisch starten, aber bei Bedarf manuell startbar bleiben. Welcher Starttyp?', o: ['Disabled', 'Manual', 'Automatic', 'Stopped'], c: 1, e: 'Manual = nur bei Bedarf. Disabled verhindert jeden Start. Stopped ist ein Status, kein Starttyp.' },
    { q: 'Warum schlägt „Install-Module Pester“ in Windows PowerShell 5.1 ohne Adminrechte fehl?', o: ['Pester gibt es nicht.', 'Standard ist -Scope AllUsers, das braucht Adminrechte.', 'Module darf man nur mit winget installieren.', 'Die Ausführungsrichtlinie verbietet es.'], c: 1, e: 'Mit -Scope CurrentUser landet das Modul im eigenen Profil, ganz ohne Adminrechte.' },
    { q: 'Welche Angabe beschreibt ein Ereignis im Ereignisprotokoll eindeutig nach seiner Art?', o: ['Index', 'Event-ID (zusammen mit der Quelle)', 'TimeGenerated', 'MachineName'], c: 1, e: 'Die Event-ID der jeweiligen Quelle steht für eine bestimmte Art von Ereignis, z. B. 7000 = Dienst konnte nicht gestartet werden.' }
  ]
});

/* ================= Kapitel 8 ================= */
C.chapters.push({
  id: 'k8', lz: 'LZ8', title: 'Netzwerk & Firewall', short: 'Netzwerk',
  goal: 'Du liest die IP-Konfiguration aus, konfigurierst Adresse, Gateway und DNS mit Cmdlets, testest Verbindungen und Ports und gibst Firewallregeln frei.',
  mira: 'Kleiner Notfall: Die Netzwerkkarte von KORB-SRV02 ist heute Nacht ausgefallen. Der Kollege vom Hardware-Service hat eine neue eingebaut – und seitdem ist der Server nicht mehr erreichbar.\n\nDu kommst noch über die Konsole drauf. Bring ihn wieder ins Netz: 10.20.0.12/24, Gateway 10.20.0.1, DNS ist unser DC 10.20.0.10.\n\nMira',
  onEnter: env => GG.korbwerkNicSwap(env),
  lessons: [
    { id: '8.1', title: 'Konfiguration auslesen',
      text: `Den schnellen Überblick gibt das klassische \`ipconfig\` (mit \`/all\` ausführlich). Die PowerShell-Cmdlets liefern dieselben Daten als Objekte:

\`\`\`
Get-NetAdapter
Get-NetIPConfiguration
Get-NetIPAddress -AddressFamily IPv4
\`\`\`

Eine Adresse aus **169.254.x.x** bedeutet: Der Rechner wollte per **DHCP** eine Adresse holen, hat aber keine Antwort bekommen (**APIPA**). Ins Netz kommt er damit nicht.`,
      task: 'Welche **IPv4-Adresse** hat die neue Netzwerkkarte gerade?',
      answer: 'IPv4-Adresse',
      hint: 'ipconfig oder Get-NetIPAddress -AddressFamily IPv4',
      solution: ['Get-NetIPAddress -AddressFamily IPv4', { ans: '169.254.13.37' }],
      check: st => H.ans(st, '169.254.13.37') },
    { id: '8.2', title: 'DHCP abschalten',
      text: `Server bekommen feste Adressen. Bevor du eine statische Adresse vergeben kannst, musst du DHCP auf der Schnittstelle abschalten – sonst lehnt \`New-NetIPAddress\` mit einer recht kryptischen Meldung („Inkonsistente Parameter … Dhcp Enabled“) ab.

\`\`\`
Get-NetIPInterface -AddressFamily IPv4
Set-NetIPInterface -InterfaceAlias "Ethernet 2" -Dhcp Disabled
\`\`\`

Der Name der Karte lautet jetzt **Ethernet 2** – mit Leerzeichen, also in Anführungszeichen.`,
      task: 'Schalte DHCP für **Ethernet 2** ab (Admin-Tab).',
      hint: 'Set-NetIPInterface -InterfaceAlias "Ethernet 2" -Dhcp Disabled',
      admin: true,
      solution: [A('Set-NetIPInterface -InterfaceAlias "Ethernet 2" -Dhcp Disabled')],
      check: st => { const c = H.ipcfg(st, 'Ethernet 2'); return c && !c.dhcp; } },
    { id: '8.3', title: 'Statische Adresse vergeben',
      text: `\`New-NetIPAddress\` setzt Adresse, Präfixlänge und Standardgateway in einem Schritt:

\`\`\`
New-NetIPAddress -InterfaceAlias "Ethernet 2" -IPAddress 10.20.0.12 -PrefixLength 24 -DefaultGateway 10.20.0.1
\`\`\`

Die Präfixlänge **24** entspricht der Subnetzmaske **255.255.255.0**. Hast du dich vertippt, entfernst du die Adresse mit \`Remove-NetIPAddress\` und das Gateway mit \`Remove-NetRoute -DestinationPrefix 0.0.0.0/0\`.`,
      task: 'Gib **Ethernet 2** die Adresse **10.20.0.12/24** mit dem Gateway **10.20.0.1**.',
      hint: 'New-NetIPAddress -InterfaceAlias "Ethernet 2" -IPAddress … -PrefixLength 24 -DefaultGateway …',
      admin: true,
      solution: [A('New-NetIPAddress -InterfaceAlias "Ethernet 2" -IPAddress 10.20.0.12 -PrefixLength 24 -DefaultGateway 10.20.0.1')],
      check: st => { const c = H.ipcfg(st, 'Ethernet 2'); return c && c.addrs.some(a => a.ip === '10.20.0.12' && a.prefix === 24) && c.gw.includes('10.20.0.1'); } },
    { id: '8.4', title: 'Verbindung testen',
      text: `\`Test-Connection\` ist das PowerShell-Gegenstück zu \`ping\`:

\`\`\`
Test-Connection 10.20.0.1
Test-Connection 10.20.0.1 -Count 1 -Quiet    # nur True/False
\`\`\`

Schlägt der Ping fehl, meldet Windows PowerShell 5.1 oft wenig hilfreich „Fehler aufgrund fehlender Ressourcen“. Gemeint ist: keine Antwort.`,
      task: 'Teste, ob das **Gateway 10.20.0.1** antwortet.',
      hint: 'Test-Connection 10.20.0.1',
      solution: ['Test-Connection 10.20.0.1 -Count 2'],
      check: st => H.used(st, 'Test-Connection', p => /10\.20\.0\.1\b/.test(H.pStr(p, 'ComputerName'))) || H.line(st, /^\s*ping(\.exe)?\s+10\.20\.0\.1\b/i, true) },
    { id: '8.5', title: 'DNS einstellen',
      text: `Ohne DNS-Server kennt der Rechner keine Namen – nur IP-Adressen. In einer Domäne ist der DNS-Server immer der **Domänencontroller**, nie ein öffentlicher DNS wie 8.8.8.8.

\`\`\`
Set-DnsClientServerAddress -InterfaceAlias "Ethernet 2" -ServerAddresses 10.20.0.10
Resolve-DnsName korb-dc01
\`\`\`

\`Resolve-DnsName\` ist das moderne \`nslookup\`. Mit \`Clear-DnsClientCache\` leerst du den Zwischenspeicher.`,
      task: 'Trage **10.20.0.10** als DNS-Server für **Ethernet 2** ein und löse danach den Namen **korb-dc01** auf.',
      hint: 'Set-DnsClientServerAddress … -ServerAddresses 10.20.0.10, dann Resolve-DnsName korb-dc01',
      admin: true,
      solution: [A('Set-DnsClientServerAddress -InterfaceAlias "Ethernet 2" -ServerAddresses 10.20.0.10'), 'Resolve-DnsName korb-dc01'],
      check: st => { const c = H.ipcfg(st, 'Ethernet 2'); return c && c.dns[0] === '10.20.0.10' && H.used(st, 'Resolve-DnsName'); } },
    { id: '8.6', title: 'Ports prüfen',
      text: `Ein Server kann auf Ping antworten und trotzdem nicht funktionieren – weil der **Dienst** auf seinem Port nicht erreichbar ist. \`Test-NetConnection\` (Alias \`tnc\`) prüft gezielt einen TCP-Port:

\`\`\`
Test-NetConnection korb-app01 -Port 443
Test-NetConnection korb-dc01 -CommonTCPPort SMB
\`\`\`

Entscheidend ist die Zeile **TcpTestSucceeded**.`,
      task: 'Prüfe, ob der Webshop auf **korb-app01** über **HTTPS (Port 443)** erreichbar ist.',
      hint: 'Test-NetConnection korb-app01 -Port 443',
      solution: ['Test-NetConnection korb-app01 -Port 443'],
      check: st => H.used(st, 'Test-NetConnection', p => String(H.p(p, 'Port')) === '443' || /https/i.test(H.pStr(p, 'CommonTCPPort'))) },
    { id: '8.7', title: 'Firewallregeln',
      text: `Mira meldet: „Ich kann KORB-SRV02 immer noch nicht pingen.“ Dein Server antwortet nicht – weil die Windows-Firewall eingehende Pings blockiert. Die passende Regel gibt es schon, sie ist nur deaktiviert:

\`\`\`
Get-NetFirewallRule -DisplayName *ICMPv4* | Select-Object Name, DisplayName, Enabled
Enable-NetFirewallRule -Name FPS-ICMP4-ERQ-In
\`\`\`

Eigene Regeln legst du mit \`New-NetFirewallRule\` an. Die Firewall abzuschalten ist **keine** Lösung.`,
      task: 'Aktiviere die Firewallregel, die **eingehende ICMPv4-Echoanforderungen** (Ping) erlaubt.',
      hint: 'Get-NetFirewallRule -DisplayName *ICMPv4*, dann Enable-NetFirewallRule -Name …',
      admin: true,
      solution: [A('Enable-NetFirewallRule -Name FPS-ICMP4-ERQ-In')],
      check: st => { const r = H.fw(st, 'FPS-ICMP4-ERQ-In'); return r && r.enabled; } },
    { id: '8.8', title: 'Routing',
      text: `Wohin ein Paket geht, entscheidet die **Routingtabelle**. Die Standardroute \`0.0.0.0/0\` zeigt auf das Gateway – sie gilt für alles, wofür es keine genauere Route gibt.

\`\`\`
Get-NetRoute -AddressFamily IPv4
Get-NetRoute -DestinationPrefix 0.0.0.0/0
\`\`\`

\`tracert\` zeigt zusätzlich, über welche Router ein Paket läuft.`,
      task: 'Über welche Schnittstelle läuft die Standardroute? Gib den **ifIndex** an.',
      answer: 'ifIndex',
      hint: 'Get-NetRoute -DestinationPrefix 0.0.0.0/0',
      solution: ['Get-NetRoute -DestinationPrefix 0.0.0.0/0', { ans: '7' }],
      check: st => H.used(st, 'Get-NetRoute') && H.ansNum(st, 7) }
  ],
  quiz: [
    { q: 'Ein Server hat die Adresse 169.254.88.4. Was ist die wahrscheinlichste Ursache?', o: ['Die Adresse wurde statisch falsch eingetragen.', 'Der DHCP-Server war nicht erreichbar (APIPA).', 'Der DNS-Server ist falsch.', 'Die Firewall blockiert ICMP.'], c: 1, e: '169.254.0.0/16 vergibt Windows selbst, wenn keine DHCP-Antwort kommt.' },
    { q: 'Ping auf die IP-Adresse klappt, Ping auf den Namen nicht. Wo suchst du zuerst?', o: ['Gateway', 'DNS-Server-Einstellung', 'Subnetzmaske', 'Firewall des Ziels'], c: 1, e: 'Wenn die IP erreichbar ist, funktioniert das Routing. Es hapert an der Namensauflösung.' },
    { q: 'Welcher Befehl prüft, ob auf korb-app01 der HTTPS-Port erreichbar ist?', o: ['Test-Connection korb-app01 -Port 443', 'Test-NetConnection korb-app01 -Port 443', 'Resolve-DnsName korb-app01 -Port 443', 'ping korb-app01:443'], c: 1, e: 'Test-Connection kann nur ICMP (Ping). Test-NetConnection -Port testet eine TCP-Verbindung.' },
    { q: 'Der Server soll auf Ping antworten. Was ist der richtige Weg?', o: ['Set-NetFirewallProfile -Enabled False', 'Die vorhandene Regel für ICMPv4-Echoanforderungen aktivieren', 'Den Dienst MpsSvc beenden', 'Den Netzwerkadapter neu starten'], c: 1, e: 'Nur genau das freigeben, was gebraucht wird – die Firewall bleibt aktiv.' }
  ]
});

/* ================= Kapitel 9 ================= */
C.chapters.push({
  id: 'k9', lz: 'LZ9', title: 'Active Directory', short: 'AD',
  goal: 'Du fragst Benutzer, Gruppen und OUs im Active Directory ab, legst Konten einzeln und per CSV an und verwaltest Gruppen, Sperren und Kontenstatus.',
  mira: 'Der Server läuft wieder – danke!\n\nJetzt kommt die Personalabteilung mit einer Liste: Kalles Domänenkonto muss weg, eine neue Azubine fängt an, drei neue Kolleginnen und Kollegen kommen per CSV, und Daniel aus dem Lager hat sich mal wieder ausgesperrt.\n\nDas Modul ActiveDirectory ist auf KORB-SRV02 installiert. Du brauchst dafür keinen Admin-Tab – die Rechte im AD hängen an deinem Domänenkonto.\n\nMira',
  lessons: [
    { id: '9.1', title: 'Die Domäne kennenlernen',
      text: `Das Modul **ActiveDirectory** bringt über 140 Cmdlets mit. Zum Einstieg:

\`\`\`
Get-ADDomain
Get-ADDomainController
Get-ADOrganizationalUnit -Filter * | Select-Object Name, DistinguishedName
\`\`\`

Jedes Objekt hat einen **DistinguishedName** (DN), der seinen Ort im Verzeichnis beschreibt – von innen nach außen gelesen: \`CN=Mira Hofmann,OU=Mitarbeiter,OU=Korbwerk,DC=korbwerk,DC=intern\`.`,
      task: 'Welcher Domänencontroller hat die Rolle **PDCEmulator**? (Name genügt.)',
      answer: 'Servername',
      hint: 'Get-ADDomain – Zeile PDCEmulator',
      solution: ['Get-ADDomain', { ans: 'KORB-DC01' }],
      check: st => H.used(st, 'Get-ADDomain') && H.ans(st, 'KORB-DC01', 'korb-dc01.korbwerk.intern') },
    { id: '9.2', title: 'Benutzer abfragen',
      text: `\`Get-ADUser\` braucht entweder eine **Identity** (z. B. den Anmeldenamen) oder einen **Filter**. Ohne \`-Properties\` kommen nur ein paar Standardeigenschaften zurück:

\`\`\`
Get-ADUser mhofmann
Get-ADUser mhofmann -Properties Department, Title, LastLogonDate
Get-ADUser mhofmann -Properties *
\`\`\``,
      task: 'Welchen **Titel** (Title) hat Mira Hofmann (Anmeldename **mhofmann**) im AD?',
      answer: 'Titel',
      hint: 'Get-ADUser mhofmann -Properties Title',
      solution: ['Get-ADUser mhofmann -Properties Title', { ans: 'Teamleiterin IT und Ausbilderin' }],
      check: st => H.ans(st, 'Teamleiterin IT und Ausbilderin') },
    { id: '9.3', title: 'Filtern im AD',
      text: `Der Parameter \`-Filter\` filtert **auf dem Domänencontroller** – schneller als \`Where-Object\`. Die Syntax ähnelt PowerShell, Texte stehen in einfachen Anführungszeichen innerhalb doppelter:

\`\`\`
Get-ADUser -Filter "Department -eq 'Lager'" -Properties Department
Get-ADUser -Filter "Name -like 'M*'"
Get-ADUser -Filter * -SearchBase "OU=Azubis,${KW}"
\`\`\``,
      task: 'Wie viele Benutzer gehören zur Abteilung (**Department**) **Vertrieb**?',
      answer: 'Anzahl',
      hint: '(Get-ADUser -Filter "Department -eq \'Vertrieb\'").Count',
      solution: ['Get-ADUser -Filter "Department -eq \'Vertrieb\'" -Properties Department | Measure-Object', { ans: '5' }],
      check: st => H.used(st, 'Get-ADUser') && H.ansNum(st, 5) },
    { id: '9.4', title: 'Konten deaktivieren und verschieben',
      text: `Für ausgeschiedene Mitarbeiter gilt: **deaktivieren** und in eine eigene OU **verschieben**:

\`\`\`
Disable-ADAccount -Identity alt
Get-ADUser alt | Move-ADObject -TargetPath "OU=Ausgeschieden,${KW}"
\`\`\`

\`Move-ADObject\` braucht den DN oder die GUID – deshalb ist der Weg über die Pipeline am einfachsten.`,
      task: 'Deaktiviere Kalles Domänenkonto **kwolf** und verschiebe es in die OU **Ausgeschieden**.',
      hint: 'Disable-ADAccount kwolf; Get-ADUser kwolf | Move-ADObject -TargetPath "OU=Ausgeschieden,OU=Korbwerk,DC=korbwerk,DC=intern"',
      solution: ['Disable-ADAccount -Identity kwolf', `Get-ADUser kwolf | Move-ADObject -TargetPath "OU=Ausgeschieden,${KW}"`],
      check: st => { const u = H.adUser(st, 'kwolf'); return u && !u.enabled && lc(u.parent) === lc('OU=Ausgeschieden,' + KW); } },
    { id: '9.5', title: 'Einen Benutzer anlegen',
      text: `\`New-ADUser\` legt ein Konto an. Ohne Kennwort und ohne \`-Enabled $true\` ist es **deaktiviert**:

\`\`\`
New-ADUser -Name "Lena Krause" -GivenName Lena -Surname Krause \`
  -SamAccountName lkrause -UserPrincipalName lkrause@korbwerk.intern \`
  -Path "OU=Azubis,${KW}" \`
  -AccountPassword (Read-Host -AsSecureString "Kennwort") -Enabled $true
\`\`\`

Der Gravis \` am Zeilenende verlängert einen Befehl auf die nächste Zeile.`,
      task: 'Lege die neue Auszubildende **Lena Krause** (Anmeldename **lkrause**) **aktiviert** in der OU **Azubis** an.',
      hint: 'New-ADUser … -Path "OU=Azubis,OU=Korbwerk,DC=korbwerk,DC=intern" -AccountPassword … -Enabled $true',
      solution: [`New-ADUser -Name "Lena Krause" -GivenName Lena -Surname Krause -SamAccountName lkrause -UserPrincipalName lkrause@korbwerk.intern -Path "OU=Azubis,${KW}" -AccountPassword (ConvertTo-SecureString "Start!2026ab" -AsPlainText -Force) -Enabled $true`],
      check: st => { const u = H.adUser(st, 'lkrause'); return u && u.enabled && lc(u.parent) === lc('OU=Azubis,' + KW); } },
    { id: '9.6', title: 'Massenanlage per CSV',
      text: `Bei mehreren Konten kombinierst du \`Import-Csv\` mit einer Schleife:

\`\`\`
$pw = Read-Host "Startkennwort" -AsSecureString
Import-Csv C:\\Import\\neue_mitarbeiter.csv -Delimiter ";" | ForEach-Object {
    New-ADUser -Name "$($_.Vorname) $($_.Nachname)" -GivenName $_.Vorname -Surname $_.Nachname \`
      -SamAccountName $_.Benutzername -Department $_.Abteilung -Title $_.Titel \`
      -Path "OU=Mitarbeiter,${KW}" -AccountPassword $pw -Enabled $true
}
\`\`\`

Schau dir die CSV-Datei vorher an – die Spaltennamen müssen zu deinem Skript passen.`,
      task: 'Lege alle Personen aus **C:\\Import\\neue_mitarbeiter.csv** als **aktivierte** Benutzer in der OU **Mitarbeiter** an – mit Abteilung.',
      hint: 'Import-Csv … -Delimiter ";" | ForEach-Object { New-ADUser … }',
      solution: ['$pw = ConvertTo-SecureString "Start!2026ab" -AsPlainText -Force', `Import-Csv C:\\Import\\neue_mitarbeiter.csv -Delimiter ";" | ForEach-Object { New-ADUser -Name "$($_.Vorname) $($_.Nachname)" -GivenName $_.Vorname -Surname $_.Nachname -SamAccountName $_.Benutzername -Department $_.Abteilung -Title $_.Titel -Path "OU=Mitarbeiter,${KW}" -AccountPassword $pw -Enabled $true }`],
      check: st => [['jroth', 'Vertrieb'], ['lvogel', 'Lager'], ['mbrandt', 'Produktion']].every(([s, d]) => { const u = H.adUser(st, s); return u && u.enabled && lc(u.parent) === lc('OU=Mitarbeiter,' + KW) && lc(u.dept) === lc(d); }) },
    { id: '9.7', title: 'Gruppen',
      text: `Gruppen bündeln Benutzer, damit du Rechte nicht einzeln vergeben musst. Der **GroupScope** ist Pflicht:

\`\`\`
New-ADGroup -Name GG-Messe -GroupScope Global -Path "OU=Gruppen,${KW}"
Add-ADGroupMember -Identity GG-Messe -Members tbecker, sschuster
Get-ADGroupMember GG-Messe
\`\`\`

Faustregel (AGDLP): Benutzer in **globale** Gruppen, globale Gruppen in **domänenlokale** Gruppen, Rechte an die domänenlokalen.`,
      task: 'Lege die globale Sicherheitsgruppe **GG-Projekte** in der OU **Gruppen** an und nimm **jroth**, **lvogel** und **mbrandt** auf.',
      hint: 'New-ADGroup -Name GG-Projekte -GroupScope Global -Path …, dann Add-ADGroupMember',
      solution: [`New-ADGroup -Name GG-Projekte -GroupScope Global -GroupCategory Security -Path "OU=Gruppen,${KW}"`, 'Add-ADGroupMember -Identity GG-Projekte -Members jroth, lvogel, mbrandt'],
      check: st => { const g = H.adGroup(st, 'GG-Projekte'); return g && g.scope === 'Global' && lc(g.parent) === lc('OU=Gruppen,' + KW) && ['jroth', 'lvogel', 'mbrandt'].every(s => H.adInGroup(st, s, 'GG-Projekte')); } },
    { id: '9.8', title: 'Gesperrte Konten',
      text: `Nach zu vielen falschen Kennworteingaben sperrt das AD ein Konto. Typische Helpdesk-Aufgabe:

\`\`\`
Search-ADAccount -LockedOut
Unlock-ADAccount -Identity jdoe
Search-ADAccount -AccountDisabled
Search-ADAccount -AccountInactive -TimeSpan 90.00:00:00
\`\`\``,
      task: 'Finde heraus, welches Konto **gesperrt** ist, und **entsperre** es.',
      hint: 'Search-ADAccount -LockedOut, dann Unlock-ADAccount',
      solution: ['Search-ADAccount -LockedOut', 'Unlock-ADAccount -Identity dmeier'],
      check: st => H.used(st, 'Search-ADAccount') && !H.adUser(st, 'dmeier').locked }
  ],
  quiz: [
    { q: 'Warum zeigt „Get-ADUser mhofmann“ die Abteilung nicht an?', o: ['Mira hat keine Abteilung.', 'Department gehört nicht zu den Standardeigenschaften; man muss -Properties Department angeben.', 'Man braucht Administratorrechte.', 'Abteilungen stehen nur in Get-ADGroup.'], c: 1, e: 'Get-ADUser lädt aus Leistungsgründen nur wenige Eigenschaften. Weitere fordert man mit -Properties an.' },
    { q: 'Was beschreibt „CN=Lena Krause,OU=Azubis,OU=Korbwerk,DC=korbwerk,DC=intern“?', o: ['Den Anmeldenamen', 'Den DistinguishedName – den Ort des Objekts im Verzeichnis', 'Die E-Mail-Adresse', 'Die Gruppenmitgliedschaft'], c: 1, e: 'Der DN wird von innen (Objekt) nach außen (Domäne) gelesen.' },
    { q: 'Ein neues Konto lässt sich nicht anmelden. Es wurde mit New-ADUser -Name x -SamAccountName x angelegt. Warum?', o: ['Es fehlt die E-Mail-Adresse.', 'Ohne Kennwort und -Enabled $true ist das Konto deaktiviert.', 'Konten werden erst nach 24 Stunden aktiv.', 'Es liegt in der falschen OU.'], c: 1, e: 'New-ADUser legt ohne Kennwort und ohne -Enabled $true ein deaktiviertes Konto an.' },
    { q: 'Welcher GroupScope ist laut AGDLP für Abteilungsgruppen wie GG-Vertrieb richtig?', o: ['DomainLocal', 'Global', 'Universal', 'Local'], c: 1, e: 'Accounts → Global Groups → Domain Local Groups → Permissions.' }
  ]
});

/* ================= Kapitel 10 ================= */
C.chapters.push({
  id: 'k10', lz: 'LZ10', title: 'Remoting', short: 'Remoting',
  goal: 'Du verwaltest andere Server per PowerShell-Remoting – interaktiv, mit Invoke-Command auf mehreren Rechnern gleichzeitig und mit dauerhaften Sitzungen – und findest typische Verbindungsfehler.',
  mira: 'Letztes Kapitel!\n\nBisher hast du nur KORB-SRV02 verwaltet. Ab jetzt steuerst du alle Server von deinem Platz aus – ohne Remotedesktop, ohne Klicken.\n\nNur KORB-BACKUP01 zickt. Kalle hat ihn „abgesichert“, sagt er. Mal sehen, was du herausfindest.\n\nMira',
  lessons: [
    { id: '10.1', title: 'Ist Remoting möglich?',
      text: `PowerShell-Remoting läuft über **WinRM** (Windows Remote Management, HTTP-Port **5985**). Auf Windows Server ist es standardmäßig aktiv. Ob ein Server antwortet, prüfst du so:

\`\`\`
Test-WSMan KORB-DC01
Test-NetConnection KORB-DC01 -Port 5985
\`\`\`

Auf Clients aktiviert man Remoting mit \`Enable-PSRemoting\` (als Administrator).`,
      task: 'Prüfe, ob **KORB-APP01** WinRM-Anfragen beantwortet.',
      hint: 'Test-WSMan KORB-APP01',
      solution: ['Test-WSMan KORB-APP01'],
      check: st => H.used(st, 'Test-WSMan', p => /korb-app01/i.test(H.pStr(p, 'ComputerName'))) },
    { id: '10.2', title: 'Interaktive Sitzung',
      text: `\`Enter-PSSession\` öffnet eine interaktive Sitzung – wie SSH. Die Eingabeaufforderung zeigt den Zielrechner:

\`\`\`
PS C:\\> Enter-PSSession KORB-APP01
[KORB-APP01]: PS C:\\Users\\azubi\\Documents> hostname
KORB-APP01
[KORB-APP01]: PS C:\\Users\\azubi\\Documents> Exit-PSSession
\`\`\`

Alles, was du jetzt eingibst, läuft auf dem anderen Server. Grafische Programme wie notepad funktionieren dort nicht.`,
      task: 'Verbinde dich interaktiv mit **KORB-APP01** und lies die Datei **C:\\inetpub\\korbshop\\version.txt**. Welche Version des Webshops läuft? Verlasse die Sitzung danach wieder.',
      answer: 'Version',
      hint: 'Enter-PSSession KORB-APP01, Get-Content …, Exit-PSSession',
      solution: ['Enter-PSSession KORB-APP01', 'Get-Content C:\\inetpub\\korbshop\\version.txt', 'Exit-PSSession', { ans: '2.4.1' }],
      check: st => H.used(st, 'Enter-PSSession') && H.ans(st, '2.4.1') },
    { id: '10.3', title: 'Mehrere Server gleichzeitig',
      text: `\`Invoke-Command\` führt einen Skriptblock auf beliebig vielen Rechnern **gleichzeitig** aus und holt die Ergebnisse zurück:

\`\`\`
Invoke-Command -ComputerName KORB-DC01, KORB-APP01 -ScriptBlock {
    Get-Service WinRM
}
\`\`\`

Jedes Ergebnis bekommt die zusätzliche Eigenschaft **PSComputerName** – so weißt du, woher es stammt. Wichtig: Gehe vorher mit \`Exit-PSSession\` aus einer interaktiven Sitzung heraus.`,
      task: 'Auf **KORB-DC01** und **KORB-APP01** wird kein Druckdienst gebraucht. **Beende** den Dienst **Spooler** auf beiden Servern und setze ihn auf **Disabled** – mit **einem** Invoke-Command.',
      hint: 'Invoke-Command -ComputerName KORB-DC01, KORB-APP01 -ScriptBlock { Stop-Service Spooler; Set-Service Spooler -StartupType Disabled }',
      solution: ['Invoke-Command -ComputerName KORB-DC01, KORB-APP01 -ScriptBlock { Stop-Service Spooler; Set-Service Spooler -StartupType Disabled }'],
      check: st => ['KORB-DC01', 'KORB-APP01'].every(h => { const s = H.svc(st, 'Spooler', h); return s && s.status === 'Stopped' && s.start === 'Disabled'; }) && H.used(st, 'Invoke-Command') },
    { id: '10.4', title: 'Fehlersuche bei Verbindungen',
      text: `Wenn Remoting scheitert, arbeitest du dich von unten nach oben vor:

1. Wird der Name aufgelöst? \`Resolve-DnsName\`
2. Ist der Rechner erreichbar? \`Test-Connection\`
3. Ist der Port 5985 offen? \`Test-NetConnection -Port 5985\`
4. Antwortet WinRM? \`Test-WSMan\`

Manche Cmdlets wie \`Get-Service -ComputerName\` funktionieren in Windows PowerShell 5.1 auch **ohne** WinRM, weil sie ein älteres Protokoll (RPC) verwenden. Das hilft bei der Fehlersuche.

Die Fehlermeldungen sind lang, aber hilfreich: Lies sie bis zum Ende.`,
      task: 'Versuche, auf **KORB-BACKUP01** per Invoke-Command **hostname** auszuführen. Es klappt nicht. Welcher **Dienst** läuft dort nicht?',
      answer: 'Dienstname',
      hint: 'Ping klappt? Dann Test-WSMan. Und: Get-Service -ComputerName KORB-BACKUP01 WinRM',
      expectErrors: true,
      solution: ['Invoke-Command -ComputerName KORB-BACKUP01 -ScriptBlock { hostname }', 'Test-Connection KORB-BACKUP01 -Count 1', 'Get-Service -ComputerName KORB-BACKUP01 -Name WinRM', { ans: 'WinRM' }],
      check: st => H.usedAny(st, 'Invoke-Command') && H.ans(st, 'WinRM', 'Windows-Remoteverwaltung', 'Windows-Remoteverwaltung (WS-Verwaltung)') },
    { id: '10.5', title: 'Lokale Variablen mitnehmen',
      text: `Der Skriptblock läuft auf dem **anderen** Rechner – dort kennt niemand deine lokalen Variablen. Mit \`$using:\` nimmst du sie mit:

\`\`\`
$tage = 7
Invoke-Command -ComputerName KORB-DC01 -ScriptBlock {
    Get-EventLog System -EntryType Error -After (Get-Date).AddDays(-$using:tage)
}
\`\`\`

Die zurückgegebenen Objekte sind übrigens nur noch **Kopien** („Deserialized“) – ihre Methoden wie \`Stop()\` fehlen.`,
      task: 'Sammle die **Fehler-Ereignisse** der letzten **7 Tage** aus dem System-Protokoll von **KORB-DC01** und **KORB-APP01** (Tage über eine lokale Variable mit **$using:**) und exportiere **PSComputerName**, **EventID** und **Message** nach **C:\\Berichte\\fehler-server.csv** (Semikolon, ohne #TYPE).',
      hint: '$tage = 7; Invoke-Command … { Get-EventLog … -After (Get-Date).AddDays(-$using:tage) } | Select-Object PSComputerName, EventID, Message | Export-Csv …',
      solution: ['$tage = 7', 'Invoke-Command -ComputerName KORB-DC01, KORB-APP01 -ScriptBlock { Get-EventLog System -EntryType Error -After (Get-Date).AddDays(-$using:tage) } | Select-Object PSComputerName, EventID, Message | Export-Csv C:\\Berichte\\fehler-server.csv -NoTypeInformation -Delimiter ";"'],
      check: st => { const c = H.csv(H.content(st, 'C:\\Berichte\\fehler-server.csv'), ';'); if (!c || c.typeLine || !c.head.includes('PSComputerName') || !c.head.includes('EventID')) return false; const hosts = new Set(c.rows.map(r => lc(r.PSComputerName))); return hosts.has('korb-dc01') && hosts.has('korb-app01') && H.line(st, /\$using:/i, true); } },
    { id: '10.6', title: 'Dauerhafte Sitzungen',
      text: `Jedes \`Invoke-Command -ComputerName\` baut eine neue Verbindung auf und wieder ab. Für mehrere Befehle hintereinander ist eine **PSSession** schneller – und Variablen bleiben dort erhalten:

\`\`\`
$s = New-PSSession -ComputerName KORB-APP01
Invoke-Command -Session $s -ScriptBlock { $x = Get-Volume C }
Invoke-Command -Session $s -ScriptBlock { $x.SizeRemaining / 1GB }
Remove-PSSession $s
\`\`\`

Vergiss \`Remove-PSSession\` nicht – offene Sitzungen belegen Ressourcen auf dem Server.`,
      task: 'Öffne eine Sitzung zu **KORB-APP01**, frage darin den **freien Speicher von C:** in GB ab und schließe die Sitzung wieder. Wie viele GB sind frei? (Ganze Zahl.)',
      answer: 'GB',
      hint: '$s = New-PSSession KORB-APP01; Invoke-Command -Session $s { (Get-Volume C).SizeRemaining / 1GB }; Remove-PSSession $s',
      solution: ['$s = New-PSSession -ComputerName KORB-APP01', 'Invoke-Command -Session $s -ScriptBlock { (Get-Volume -DriveLetter C).SizeRemaining / 1GB }', 'Remove-PSSession $s', { ans: '17' }],
      check: st => H.used(st, 'New-PSSession') && H.used(st, 'Remove-PSSession') && H.ansNum(st, 17, 17.1) }
  ],
  quiz: [
    { q: 'Über welchen Dienst und Port läuft PowerShell-Remoting standardmäßig?', o: ['SSH, Port 22', 'WinRM, Port 5985', 'RDP, Port 3389', 'SMB, Port 445'], c: 1, e: 'WinRM (WS-Management) über HTTP auf Port 5985, mit HTTPS auf 5986.' },
    { q: 'Was macht $using:pfad in einem Skriptblock für Invoke-Command?', o: ['Es verwendet die Variable $pfad des Zielrechners.', 'Es übergibt den Wert der lokalen Variablen $pfad an den Remoterechner.', 'Es lädt ein Modul namens pfad.', 'Es ist ein Syntaxfehler.'], c: 1, e: '$using: kopiert den Wert einer lokalen Variablen in die Remotesitzung.' },
    { q: 'Woran erkennst du in der Ausgabe von Invoke-Command, von welchem Server ein Objekt stammt?', o: ['An der Eigenschaft PSComputerName', 'An der Farbe', 'Gar nicht', 'An der Eigenschaft MachineName, die es immer gibt'], c: 0, e: 'Invoke-Command ergänzt jedes Ergebnis um PSComputerName.' },
    { q: 'Ping auf KORB-BACKUP01 funktioniert, Invoke-Command nicht. Was prüfst du als Nächstes?', o: ['Den DNS-Server', 'Ob WinRM auf dem Ziel läuft bzw. Port 5985 erreichbar ist', 'Das Standardgateway', 'Die Ausführungsrichtlinie'], c: 1, e: 'Netzwerk und Namensauflösung funktionieren offenbar – das Problem liegt beim Remoting-Dienst selbst.' }
  ]
});
})();
