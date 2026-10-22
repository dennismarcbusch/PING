/* Get-Going! – Kompetenznachweis: Teil A (Praxis bei Schreinerei Maier) und Teil B (Fragenpool) */
(function () {
'use strict';
const GG = globalThis.GG = globalThis.GG || {};
const H = GG.H;
const lc = s => String(s == null ? '' : s).toLowerCase();
const MD = 'OU=Maier,DC=maier,DC=intern';
const A = cmd => ({ a: cmd });
const WS = [['thahn', 'Tobias', 'Hahn'], ['sernst', 'Sabine', 'Ernst'], ['klorenz', 'Kevin', 'Lorenz']];

const EXAM = GG.EXAM = {
  title: 'Kompetenznachweis – Einsatz bei der Schreinerei Maier',
  briefing: 'Korbwerk betreut ab heute die **Schreinerei Maier** in Kronach. Du bist allein vor Ort und arbeitest an **MAIER-SRV01** (Domäne maier.intern, angemeldet als MAIER\\korbwerk – Mitglied der Gruppe IT-Dienstleister und damit lokaler Administrator).\n\nDer vorige Dienstleister hat einiges liegen lassen. Arbeite die Liste in **beliebiger Reihenfolge** ab. Es gibt keine Tipps; die Hilfe (Get-Help) darfst du benutzen. Bewertet wird erst, wenn du abgibst.\n\nKleiner Hinweis aus Erfahrung: Wenn das Netzwerk nicht stimmt, klappen auch AD, winget und Remoting nicht.',
  partA: [
    { id: 'A1', text: 'Lege den Ordner **C:\\Freigaben\\Auftraege** an.', check: st => H.isDir(st, 'C:\\Freigaben\\Auftraege') },
    { id: 'A2', text: 'Verschiebe alle **.log-Dateien** in C:\\Logs, die **älter als 30 Tage** sind, nach **C:\\Logs\\Archiv**. Neuere bleiben liegen.', check: st => { const lim = Date.now() - 30 * 864e5; const top = H.files(st, 'C:\\Logs').filter(f => !f.dir && /\.log$/i.test(f.name)); const arch = H.files(st, 'C:\\Logs\\Archiv').map(f => lc(f.name)); return ['sync-2026-07-01.log', 'sync-2026-08-01.log', 'sync-2026-09-01.log'].every(n => arch.includes(n)) && top.every(f => f.mtime.getTime() >= lim) && top.some(f => lc(f.name) === 'kasse.log') && top.length >= 3; } },
    { id: 'A3', text: 'Sichere den Ordner **C:\\Daten\\Rechnungen** in das Archiv **C:\\Backup\\Rechnungen.zip**.', check: st => { const n = H.node(st, 'C:\\Backup\\Rechnungen.zip'); return !!(n && n.archiveEntries && n.archiveEntries.filter(e => /RE-2026-\d+\.pdf$/i.test(e.path)).length === 5); } },
    { id: 'A4', text: 'Erstelle **C:\\Berichte\\dienste.csv** mit **Name, Status und StartType** aller Dienste, die **automatisch starten sollen, aber nicht laufen** – Semikolon als Trennzeichen, ohne #TYPE-Zeile.', check: st => { const c = H.csv(H.content(st, 'C:\\Berichte\\dienste.csv'), ';'); if (!c || c.typeLine || !['Name', 'Status', 'StartType'].every(h => c.head.includes(h))) return false; const names = c.rows.map(r => lc(r.Name)); return ['mapsbroker', 'sppsvc'].every(n => names.includes(n)) && c.rows.every(r => r.StartType === 'Automatic' && r.Status === 'Stopped'); } },
    { id: 'A5', text: 'Schreibe alle Zeilen mit **FEHLER** aus **C:\\Logs\\kasse.log** in die Datei **C:\\Berichte\\fehler.txt**.', check: st => { const t = H.content(st, 'C:\\Berichte\\fehler.txt') || ''; return (t.match(/FEHLER/g) || []).length === 3 && !/\bINFO\b/.test(t); } },
    { id: 'A6', text: 'Schreibe das Skript **C:\\Skripte\\Get-Platz.ps1** mit dem Parameter **-Laufwerk**, das den freien Speicher des Laufwerks in **GB** ausgibt, und führe es für **D** aus.', check: st => { if (!/param\s*\([\s\S]*\$Laufwerk/i.test(H.content(st, 'C:\\Skripte\\Get-Platz.ps1') || '')) return false; const free = st.w.volumes.find(v => v.letter === 'D').free / 1073741824; return (st.entries || []).some(e => e.ok && e.cmds.some(c => c.script && /get-platz\.ps1$/i.test(c.name) && /^d:?$/i.test(String(H.p(c.params, 'Laufwerk') || ''))) && e.out.concat(e.hostText || []).some(o => { const n = typeof o === 'number' ? o : parseFloat(String(o).replace(',', '.').replace(/[^\d.]/g, '')); return Math.abs(n - free) <= 1; })); } },
    { id: 'A7', text: 'Das Skript **C:\\Skripte\\inventar.ps1** wurde aus dem Internet geladen. Prüfe es, gib es frei und führe es aus (es erzeugt C:\\Berichte\\inventar.json).', check: st => { const n = H.node(st, 'C:\\Skripte\\inventar.ps1'); return n && !n.zone && /MAIER-SRV01/.test(H.content(st, 'C:\\Berichte\\inventar.json') || ''); } },
    { id: 'A8', text: 'Der Prozess **MaierUpdater** hängt seit Tagen. Beende ihn.', check: st => !H.proc(st, p => lc(p.name) === 'maierupdater') },
    { id: 'A9', text: 'Der Dienst **MaierBackup** soll **automatisch starten** und jetzt **laufen**.', check: st => { const s = H.svc(st, 'MaierBackup'); return s && s.start === 'Automatic' && s.status === 'Running'; } },
    { id: 'A10', text: 'Installiere **7-Zip** mit winget.', check: st => !!H.pkg(st, '7zip.7zip') },
    { id: 'A11', text: 'Lege das **lokale** Konto **lager** an (aktiviert) und nimm es in die Gruppe **Remotedesktopbenutzer** auf.', check: st => { const u = H.luser(st, 'lager'); return u && u.enabled !== false && H.lgroupHas(st, 'Remotedesktopbenutzer', 'lager'); } },
    { id: 'A12', text: 'Das Praktikum ist vorbei: **Deaktiviere** das lokale Konto **praktikant**.', check: st => { const u = H.luser(st, 'praktikant'); return u && !u.enabled; } },
    { id: 'A13', text: 'Die Gruppe **MAIER\\GG-Buero** soll auf **C:\\Freigaben\\Auftraege** **Ändern** dürfen – vererbt auf Dateien und Unterordner.', check: st => H.acl(st, 'C:\\Freigaben\\Auftraege').some(r => lc(r.id) === 'maier\\gg-buero' && (r.r === 'M' || r.r === 'F') && r.oi && r.ci && r.type !== 'Deny') },
    { id: 'A14', text: 'Gib **C:\\Freigaben\\Auftraege** als **Auftraege** frei; **MAIER\\Domänen-Benutzer** erhalten **Ändern**.', check: st => { const s = H.share(st, 'Auftraege'); return s && /c:\\freigaben\\auftraege\\?$/i.test(s.path) && s.access.some(a => lc(a.account) === 'maier\\domänen-benutzer' && /change|full/i.test(a.right) && a.type === 'Allow'); } },
    { id: 'A15', text: 'Netzwerk: MAIER-SRV01 bekommt **192.168.50.10/24** mit dem Gateway **192.168.50.1**.', check: st => { const c = H.ipcfg(st, 'Ethernet'); return c && c.addrs.length === 1 && c.addrs[0].ip === '192.168.50.10' && c.addrs[0].prefix === 24 && c.gw.length === 1 && c.gw[0] === '192.168.50.1'; } },
    { id: 'A16', text: 'Netzwerk: Als DNS-Server wird der Domänencontroller **192.168.50.5** verwendet.', check: st => { const c = H.ipcfg(st, 'Ethernet'); return c && c.dns.length >= 1 && c.dns[0] === '192.168.50.5' && !c.dns.includes('8.8.8.8'); } },
    { id: 'A17', text: 'Der Server soll auf **Ping (ICMPv4)** antworten – ohne die Firewall abzuschalten.', check: st => { const r = H.fw(st, 'FPS-ICMP4-ERQ-In'); const custom = st.w.firewall.rules.some(x => x.custom && x.enabled && x.direction === 'Inbound' && x.action === 'Allow' && /icmpv4/i.test(x.protocol)); const fwOn = Object.values(st.w.firewall.profiles || {}).every(Boolean); return ((r && r.enabled) || custom) && fwOn; } },
    { id: 'A18', text: 'Active Directory: Lege die OU **Werkstatt** unterhalb von **OU=Maier** an.', check: st => !!H.adOu(st, 'OU=Werkstatt,' + MD) },
    { id: 'A19', text: 'Lege die drei Personen aus **C:\\Import\\werkstatt.csv** als **aktivierte** Benutzer in der OU **Werkstatt** an (Anmeldename = Spalte Benutzername).', check: st => WS.every(([s]) => { const u = H.adUser(st, s); return u && u.enabled && lc(u.parent) === lc('OU=Werkstatt,' + MD); }) },
    { id: 'A20', text: 'Lege die **globale** Sicherheitsgruppe **GG-Werkstatt** an und nimm die drei neuen Benutzer auf.', check: st => { const g = H.adGroup(st, 'GG-Werkstatt'); return g && g.scope === 'Global' && (g.category || 'Security') === 'Security' && WS.every(([s]) => H.adInGroup(st, s, 'GG-Werkstatt')); } },
    { id: 'A21', text: 'An der Kasse wird nicht gedruckt: Sorge per **Remoting** dafür, dass die **Druckwarteschlange (Spooler)** auf **MAIER-KASSE01** läuft und automatisch startet.', check: st => { const s = H.svc(st, 'Spooler', 'MAIER-KASSE01'); return s && s.status === 'Running' && s.start === 'Automatic'; } }
  ],
  solutionA: [
    'Start-Process powershell -Verb RunAs',
    A('Remove-NetIPAddress -IPAddress 192.168.50.10 -Confirm:$false'), A('Remove-NetRoute -DestinationPrefix 0.0.0.0/0 -Confirm:$false'),
    A('New-NetIPAddress -InterfaceAlias Ethernet -IPAddress 192.168.50.10 -PrefixLength 24 -DefaultGateway 192.168.50.1'),
    A('Set-DnsClientServerAddress -InterfaceAlias Ethernet -ServerAddresses 192.168.50.5'),
    A('Enable-NetFirewallRule -Name FPS-ICMP4-ERQ-In'),
    'New-Item C:\\Freigaben\\Auftraege -ItemType Directory',
    'Get-ChildItem C:\\Logs -Filter *.log | Where-Object LastWriteTime -lt (Get-Date).AddDays(-30) | Move-Item -Destination C:\\Logs\\Archiv',
    'Compress-Archive -Path C:\\Daten\\Rechnungen -DestinationPath C:\\Backup\\Rechnungen.zip',
    'Get-Service | Where-Object { $_.StartType -eq "Automatic" -and $_.Status -ne "Running" } | Select-Object Name, Status, StartType | Export-Csv C:\\Berichte\\dienste.csv -NoTypeInformation -Delimiter ";"',
    'Select-String -Path C:\\Logs\\kasse.log -Pattern FEHLER | ForEach-Object Line | Out-File C:\\Berichte\\fehler.txt',
    { np: { file: 'C:\\Skripte\\Get-Platz.ps1', content: 'param(\n    [string]$Laufwerk = "C"\n)\n[math]::Round((Get-Volume -DriveLetter $Laufwerk).SizeRemaining / 1GB, 1)' } },
    'C:\\Skripte\\Get-Platz.ps1 -Laufwerk D',
    'Get-Content C:\\Skripte\\inventar.ps1', 'Unblock-File C:\\Skripte\\inventar.ps1', 'C:\\Skripte\\inventar.ps1',
    A('Stop-Process -Name MaierUpdater -Force'),
    A('Set-Service MaierBackup -StartupType Automatic'), A('Start-Service MaierBackup'),
    A('winget install 7zip.7zip'),
    A('New-LocalUser -Name lager -Password (ConvertTo-SecureString "Lager!2026x" -AsPlainText -Force) -Description "Lager"'), A('Add-LocalGroupMember -Group Remotedesktopbenutzer -Member lager'),
    A('Disable-LocalUser -Name praktikant'),
    A('icacls C:\\Freigaben\\Auftraege /grant "MAIER\\GG-Buero:(OI)(CI)M"'),
    A('New-SmbShare -Name Auftraege -Path C:\\Freigaben\\Auftraege -ChangeAccess "MAIER\\Domänen-Benutzer"'),
    `New-ADOrganizationalUnit -Name Werkstatt -Path "${MD}"`,
    '$pw = ConvertTo-SecureString "Holz!2026start" -AsPlainText -Force',
    `Import-Csv C:\\Import\\werkstatt.csv -Delimiter ";" | ForEach-Object { New-ADUser -Name "$($_.Vorname) $($_.Nachname)" -GivenName $_.Vorname -Surname $_.Nachname -SamAccountName $_.Benutzername -Department $_.Abteilung -Path "OU=Werkstatt,${MD}" -AccountPassword $pw -Enabled $true }`,
    `New-ADGroup -Name GG-Werkstatt -GroupScope Global -GroupCategory Security -Path "OU=Werkstatt,${MD}"`,
    'Add-ADGroupMember -Identity GG-Werkstatt -Members thahn, sernst, klorenz',
    'Invoke-Command -ComputerName MAIER-KASSE01 -ScriptBlock { Set-Service Spooler -StartupType Automatic; Start-Service Spooler }'
  ],
  /* Teil B: Anzahl Fragen je Lernziel */
  draw: { LZ1: 1, LZ2: 1, LZ3: 2, LZ4: 1, LZ5: 2, LZ6: 1, LZ7: 1, LZ8: 1, LZ9: 1, LZ10: 1 },
  pool: []
};

/* ---------- Teil B: Fragenpool ---------- */
const Q = q => EXAM.pool.push(q);
// LZ1
Q({ id: 'b1', lz: 'LZ1', type: 'mc', q: 'Mit welchem Befehl findest du alle Cmdlets mit dem Verb **Remove**?', o: ['Get-Help Remove', 'Get-Command -Verb Remove', 'Find-Command Remove-*', 'Get-Verb Remove'], c: 1 });
Q({ id: 'b2', lz: 'LZ1', type: 'hotspot', q: 'Dieser Befehl erzeugt einen Fehler. Klicke auf den Teil, der ihn verursacht.', tokens: ['ls', '-la', 'C:\\Logs'], c: 1 });
Q({ id: 'b3', lz: 'LZ1', type: 'match', q: 'Ordne jedem Alias das Cmdlet zu, das er aufruft.', pairs: [['dir', 'Get-ChildItem'], ['cd', 'Set-Location'], ['cat', 'Get-Content'], ['ps', 'Get-Process']] });
Q({ id: 'b4', lz: 'LZ1', type: 'term', q: 'Welche Aussage zur SYNTAX-Zeile stimmt?', term: 'SYNTAX\n    Get-Process [[-Name] <String[]>] [-ComputerName <String[]>] [-Module] [-FileVersionInfo] [<CommonParameters>]', o: ['-Name ist Pflicht.', '-Name ist optional; der Parametername darf weggelassen werden.', '-Module erwartet einen Wert.', '-ComputerName darf nur einen Rechner enthalten.'], c: 1 });
// LZ2
Q({ id: 'b5', lz: 'LZ2', type: 'mc', q: 'Wie zeigst du in einem Ordner auch **versteckte** Dateien an?', o: ['Get-ChildItem -a', 'Get-ChildItem -Force', 'Get-ChildItem /h', 'Get-ChildItem -ShowAll'], c: 1 });
Q({ id: 'b6', lz: 'LZ2', type: 'term', q: 'Welcher Parameter hätte diese Rückfrage verhindert und den Ordner samt Inhalt gelöscht?', term: 'PS C:\\> Remove-Item C:\\Temp\\alt\n\nBestätigung\nDas Element unter "C:\\Temp\\alt" verfügt über untergeordnete Elemente, und der Recurse-Parameter\nwurde nicht angegeben. Wenn Sie fortfahren, werden alle untergeordneten Elemente mit dem Element\nentfernt. Möchten Sie den Vorgang wirklich fortsetzen?\n[J] Ja  [A] Ja, alle  [N] Nein  [K] Nein, keine  [H] Anhalten  [?] Hilfe (Standard ist "J"):', o: ['-Force', '-Recurse', '-WhatIf', '-Confirm'], c: 1 });
Q({ id: 'b7', lz: 'LZ2', type: 'match', q: 'Ordne jedem PowerShell-Laufwerk seinen Inhalt zu.', pairs: [['HKLM:', 'Registrierung (Computer)'], ['Env:', 'Umgebungsvariablen'], ['Alias:', 'Aliase'], ['C:', 'Dateisystem']] });
Q({ id: 'b8', lz: 'LZ2', type: 'hotspot', q: 'Die Zeile soll an die Datei **angehängt** werden, ersetzt aber den Inhalt. Klicke auf den Teil, der geändert werden muss.', tokens: ['Set-Content', 'C:\\Logs\\notiz.txt', '"Neue Zeile"'], c: 0 });
Q({ id: 'b9', lz: 'LZ2', type: 'mc', q: 'Was landet bei `Compress-Archive -Path C:\\Daten\\* -DestinationPath C:\\Backup\\d.zip` im Archiv?', o: ['Der Ordner „Daten“ mit seinem Inhalt', 'Nur der Inhalt von C:\\Daten, ohne den Ordner selbst', 'Nur Dateien, keine Unterordner', 'Nichts – * ist bei Compress-Archive nicht erlaubt'], c: 1 });
// LZ3
Q({ id: 'b10', lz: 'LZ3', type: 'mc', q: 'Was wird in der PowerShell zwischen zwei Cmdlets durch die Pipeline weitergegeben?', o: ['Textzeilen', 'Objekte mit Eigenschaften und Methoden', 'Dateipfade', 'Nur die erste Spalte der Ausgabe'], c: 1 });
Q({ id: 'b11', lz: 'LZ3', type: 'term', q: 'Mit welcher Eigenschaft fragst du ab, ob ein Dienst automatisch startet?', term: 'PS C:\\> Get-Service | Get-Member -MemberType Property\n\n   TypeName: System.ServiceProcess.ServiceController\n\nName                MemberType Definition\n----                ---------- ----------\nCanStop             Property   bool CanStop {get;}\nDisplayName         Property   string DisplayName {get;set;}\nServiceName         Property   string ServiceName {get;set;}\nStartType           Property   System.ServiceProcess.ServiceStartMode StartType {get;}\nStatus              Property   System.ServiceProcess.ServiceControllerStatus Status {get;}', o: ['Status', 'StartType', 'CanStop', 'ServiceName'], c: 1 });
Q({ id: 'b12', lz: 'LZ3', type: 'hotspot', q: 'Die Pipeline soll die Prozesse nach CPU sortiert als Tabelle ausgeben, liefert aber Unsinn. Klicke auf das Element, das an der falschen Stelle steht.', tokens: ['Get-Process', '|', 'Format-Table Name, CPU', '|', 'Sort-Object CPU -Descending'], c: 2 });
Q({ id: 'b13', lz: 'LZ3', type: 'num', q: 'Wie viele Dienste sind laut dieser Ausgabe **gestoppt**?', term: 'PS C:\\> Get-Service | Group-Object Status\n\nCount Name                      Group\n----- ----                      -----\n   94 Running                   {AppIDSvc, Appinfo, BFE, BrokerInfrastructure...}\n  137 Stopped                   {ALG, AppMgmt, AppReadiness, AppXSvc...}', answer: 137 });
Q({ id: 'b14', lz: 'LZ3', type: 'mc', q: 'Was liefert `Get-ChildItem C:\\Daten -Recurse | Where-Object { $_.Length -gt 1GB }`?', o: ['Alle Ordner mit mehr als 1 GB Inhalt', 'Alle Dateien unter C:\\Daten, die größer als 1 GB sind', 'Die ersten 1 GB an Dateien', 'Einen Fehler, weil 1GB keine Zahl ist'], c: 1 });
Q({ id: 'b15', lz: 'LZ3', type: 'match', q: 'Ordne jedem Cmdlet seine Aufgabe in der Pipeline zu.', pairs: [['Select-Object', 'Eigenschaften auswählen'], ['Sort-Object', 'Sortieren'], ['Where-Object', 'Objekte filtern'], ['Measure-Object', 'Zählen und berechnen']] });
Q({ id: 'b16', lz: 'LZ3', type: 'term', q: 'Was steht in der Spalte **GB**?', term: 'PS C:\\> Get-ChildItem D:\\ISO | Select-Object Name, @{Name="GB"; Expression={ [math]::Round($_.Length / 1GB, 1) }}', o: ['Die Anzahl der Dateien in GB', 'Die Dateigröße in Gigabyte, auf eine Nachkommastelle gerundet', 'Das Datum der letzten Änderung', 'Einen Fehler, weil GB keine Eigenschaft ist'], c: 1 });
// LZ4
Q({ id: 'b17', lz: 'LZ4', type: 'mc', q: 'Welche Zeile erzeugt eine CSV-Datei, die deutsches Excel ohne Nacharbeit korrekt in Spalten öffnet?', o: ['Get-Service | Export-Csv d.csv', 'Get-Service | Select-Object Name, Status | Export-Csv d.csv -NoTypeInformation -Delimiter ";"', 'Get-Service | Out-File d.csv', 'Get-Service | Format-Table | Export-Csv d.csv'], c: 1 });
Q({ id: 'b18', lz: 'LZ4', type: 'hotspot', q: 'In der CSV-Datei stehen merkwürdige Formatierungsdaten statt Dienste. Klicke auf die Ursache.', tokens: ['Get-Service', '|', 'Format-Table Name, Status', '|', 'Export-Csv C:\\Berichte\\d.csv', '-NoTypeInformation'], c: 2 });
Q({ id: 'b19', lz: 'LZ4', type: 'term', q: 'Excel zeigt in der ersten Zeile „#TYPE …“ an. Welcher Parameter hat beim Export gefehlt?', term: '#TYPE Selected.System.ServiceProcess.ServiceController\n"Name";"Status"\n"AppIDSvc";"Stopped"\n"Appinfo";"Running"', o: ['-Delimiter', '-NoTypeInformation', '-Encoding', '-NoClobber'], c: 1 });
Q({ id: 'b20', lz: 'LZ4', type: 'mc', q: 'Was bewirkt `-ErrorAction SilentlyContinue`?', o: ['Fehler können nicht mehr auftreten.', 'Fehler werden nicht angezeigt, der Befehl läuft weiter; sie stehen trotzdem in $Error.', 'Der Befehl bricht beim ersten Fehler ab.', 'Fehler werden in eine Logdatei geschrieben.'], c: 1 });
Q({ id: 'b21', lz: 'LZ4', type: 'match', q: 'Ordne jedem Cmdlet das Ergebnis zu.', pairs: [['Out-File', 'Text wie am Bildschirm'], ['Export-Csv', 'Objekte als Tabelle mit Trennzeichen'], ['ConvertTo-Html', 'HTML-Code'], ['ConvertTo-Json', 'JSON-Text']] });
// LZ5
Q({ id: 'b22', lz: 'LZ5', type: 'mc', q: '`$s = "Spooler"` – was gibt `\'Dienst: $s\'` (einfache Anführungszeichen) aus?', o: ['Dienst: Spooler', 'Dienst: $s', 'Einen Fehler', 'Dienst:'], c: 1 });
Q({ id: 'b23', lz: 'LZ5', type: 'term', q: 'Was ist hier passiert?', term: 'PS C:\\Users\\azubi> $anzahl = 12\nPS C:\\Users\\azubi> $anzahl > 10\nPS C:\\Users\\azubi> Get-ChildItem\n\n    Verzeichnis: C:\\Users\\azubi\n\nMode                 LastWriteTime         Length Name\n----                 -------------         ------ ----\n-a----        22.10.2026     09:14              8 10', o: ['Es wurde verglichen, das Ergebnis ist False.', 'Die Ausgabe von $anzahl wurde in eine Datei namens „10“ geschrieben.', '$anzahl wurde auf 10 gesetzt.', 'Ein Ordner „10“ wurde angelegt.'], c: 1 });
Q({ id: 'b24', lz: 'LZ5', type: 'num', q: 'Welchen Wert gibt die zweite Zeile aus?', term: 'PS C:\\> $zahlen = 4, 8, 15, 16, 23, 42\nPS C:\\> $zahlen[2]', answer: 15 });
Q({ id: 'b25', lz: 'LZ5', type: 'hotspot', q: 'Klicke auf den Teil, der den **Standardwert** des Parameters festlegt.', tokens: ['param(', '[int]', '$Tage', '= 30', ')'], c: 3 });
Q({ id: 'b26', lz: 'LZ5', type: 'mc', q: 'Was bedeutet die Ausführungsrichtlinie **RemoteSigned**?', o: ['Es dürfen gar keine Skripte laufen.', 'Lokale Skripte laufen; aus dem Internet geladene nur mit gültiger Signatur.', 'Nur signierte Skripte laufen.', 'Alle Skripte laufen, aber mit Warnung.'], c: 1 });
Q({ id: 'b27', lz: 'LZ5', type: 'term', q: 'Warum erscheint die rote Fehlermeldung statt „Datei fehlt“?', term: 'PS C:\\> try { Get-Item C:\\fehlt.txt } catch { "Datei fehlt" }\nGet-Item : Der Pfad "C:\\fehlt.txt" kann nicht gefunden werden, da er nicht vorhanden ist.\nIn Zeile:1 Zeichen:7\n+ try { Get-Item C:\\fehlt.txt } catch { "Datei fehlt" }\n+       ~~~~~~~~~~~~~~~~~~~~~~\n    + CategoryInfo          : ObjectNotFound: (C:\\fehlt.txt:String) [Get-Item], ItemNotFoundException', o: ['catch funktioniert nur in Skripten.', 'Der Fehler bricht nicht ab; ohne -ErrorAction Stop springt try nicht in catch.', 'Die Anführungszeichen sind falsch.', 'Get-Item kennt kein try.'], c: 1 });
Q({ id: 'b28', lz: 'LZ5', type: 'match', q: 'Ordne die Vergleichsoperatoren zu.', pairs: [['-eq', 'gleich'], ['-ne', 'ungleich'], ['-gt', 'größer als'], ['-like', 'Vergleich mit Platzhaltern']] });
// LZ6
Q({ id: 'b29', lz: 'LZ6', type: 'mc', q: 'Du bist lokaler Administrator, bekommst bei `New-LocalUser` aber „Zugriff verweigert“. Was ist die Ursache?', o: ['Das Konto ist gesperrt.', 'Die PowerShell läuft wegen der UAC ohne erhöhte Rechte.', 'New-LocalUser funktioniert nur auf Domänencontrollern.', 'Das Kennwort ist zu kurz.'], c: 1 });
Q({ id: 'b30', lz: 'LZ6', type: 'term', q: 'Welche Gruppe darf in diesem Ordner Dateien **ändern**?', term: 'PS C:\\> icacls C:\\Freigaben\\Vertrieb\nC:\\Freigaben\\Vertrieb NT-AUTORITÄT\\SYSTEM:(OI)(CI)(F)\n                      VORDEFINIERT\\Administratoren:(OI)(CI)(F)\n                      KORBWERK\\GG-Vertrieb:(OI)(CI)(M)\n                      KORBWERK\\GG-Lager:(OI)(CI)(RX)', o: ['KORBWERK\\GG-Lager', 'KORBWERK\\GG-Vertrieb', 'NT-AUTORITÄT\\SYSTEM', 'Niemand'], c: 1 });
Q({ id: 'b31', lz: 'LZ6', type: 'mc', q: 'Freigabeberechtigung: Jeder – Vollzugriff. NTFS: GG-Lager – Lesen. Was darf ein Lagermitarbeiter über das Netzwerk?', o: ['Vollzugriff', 'Ändern', 'Lesen', 'Nichts'], c: 2 });
Q({ id: 'b32', lz: 'LZ6', type: 'hotspot', q: 'Dieser Befehl schlägt fehl. Klicke auf den falschen Teil.', tokens: ['New-LocalUser', '-Name scanner', '-Password "Geheim123!"', '-Description "Scanner"'], c: 2 });
Q({ id: 'b33', lz: 'LZ6', type: 'match', q: 'Ordne die icacls-Angaben zu.', pairs: [['(F)', 'Vollzugriff'], ['(M)', 'Ändern'], ['(RX)', 'Lesen und Ausführen'], ['(OI)(CI)', 'wird an Dateien und Unterordner vererbt']] });
// LZ7
Q({ id: 'b34', lz: 'LZ7', type: 'mc', q: 'Ein Dienst soll nicht mehr mit Windows starten, bei Bedarf aber startbar bleiben. Welcher Starttyp?', o: ['Disabled', 'Manual', 'Automatic', 'Stopped'], c: 1 });
Q({ id: 'b35', lz: 'LZ7', type: 'num', q: 'Welche **Id** hat der Prozess mit der meisten CPU-Zeit?', term: 'PS C:\\> Get-Process | Sort-Object CPU -Descending | Select-Object -First 3\n\nHandles  NPM(K)    PM(K)      WS(K)     CPU(s)     Id  SI ProcessName\n-------  ------    -----      -----     ------     --  -- -----------\n   1877      94   407552     421888  18 234,55   4711   2 KalleSync\n    990      61   188416     217088     412,80   1820   0 MsMpEng\n   2311     102    71680     100352      12,40   3208   1 explorer', answer: 4711 });
Q({ id: 'b36', lz: 'LZ7', type: 'mc', q: '`Install-Module ImportExcel` meldet ohne Adminrechte einen Fehler. Wie installierst du das Modul trotzdem für dich?', o: ['Install-Module ImportExcel -Force', 'Install-Module ImportExcel -Scope CurrentUser', 'winget install ImportExcel', 'Import-Module ImportExcel'], c: 1 });
Q({ id: 'b37', lz: 'LZ7', type: 'hotspot', q: 'Klicke auf den Teil, der dafür sorgt, dass **nur Fehler** angezeigt werden.', tokens: ['Get-EventLog', '-LogName System', '-EntryType Error', '-Newest 10'], c: 2 });
Q({ id: 'b38', lz: 'LZ7', type: 'match', q: 'Ordne die winget-Befehle zu.', pairs: [['winget search', 'im Katalog suchen'], ['winget install', 'Paket installieren'], ['winget upgrade', 'verfügbare Updates anzeigen/installieren'], ['winget list', 'installierte Pakete anzeigen']] });
// LZ8
Q({ id: 'b39', lz: 'LZ8', type: 'mc', q: 'Ein Server hat die Adresse **169.254.40.7**. Was ist die wahrscheinlichste Ursache?', o: ['Die Adresse wurde falsch eingetragen.', 'Kein DHCP-Server hat geantwortet (APIPA).', 'Der DNS-Server ist falsch.', 'Die Firewall blockiert Ping.'], c: 1 });
Q({ id: 'b40', lz: 'LZ8', type: 'term', q: 'Der Server ist Mitglied der Domäne korbwerk.intern, Anmeldung und AD-Cmdlets scheitern. Was ist falsch konfiguriert?', term: 'PS C:\\> Get-NetIPConfiguration\n\nInterfaceAlias       : Ethernet\nInterfaceIndex       : 4\nIPv4Address          : 10.20.0.12\nIPv4DefaultGateway   : 10.20.0.1\nDNSServer            : 8.8.8.8', o: ['Die IP-Adresse', 'Das Standardgateway', 'Der DNS-Server', 'Der Interface-Name'], c: 2 });
Q({ id: 'b41', lz: 'LZ8', type: 'num', q: 'Wie viele **Hostadressen** stehen in einem Netz mit der Präfixlänge **/26** zur Verfügung?', answer: 62 });
Q({ id: 'b42', lz: 'LZ8', type: 'hotspot', q: 'Dieser Befehl schlägt fehl. Klicke auf den falschen Teil.', tokens: ['New-NetIPAddress', '-InterfaceAlias Ethernet', '-IPAddress 10.20.0.12', '-PrefixLength 255.255.255.0', '-DefaultGateway 10.20.0.1'], c: 3 });
Q({ id: 'b43', lz: 'LZ8', type: 'match', q: 'Ordne jedem Cmdlet zu, was es prüft oder zeigt.', pairs: [['Test-Connection', 'Erreichbarkeit per ICMP (Ping)'], ['Test-NetConnection -Port', 'Erreichbarkeit eines TCP-Ports'], ['Resolve-DnsName', 'Namensauflösung'], ['Get-NetRoute', 'Routingtabelle']] });
// LZ9
Q({ id: 'b44', lz: 'LZ9', type: 'mc', q: 'Warum fehlt bei `Get-ADUser mhofmann` die Eigenschaft **Department** in der Ausgabe?', o: ['Mira hat keine Abteilung.', 'Department ist keine Standardeigenschaft; sie muss mit -Properties angefordert werden.', 'Dafür braucht man Adminrechte.', 'Abteilungen gibt es nur bei Gruppen.'], c: 1 });
Q({ id: 'b45', lz: 'LZ9', type: 'term', q: 'Warum ist das neue Konto deaktiviert?', term: 'PS C:\\> New-ADUser -Name "Jan Ott" -SamAccountName jott -Path "OU=Mitarbeiter,OU=Korbwerk,DC=korbwerk,DC=intern"\nPS C:\\> Get-ADUser jott | Select-Object Name, Enabled\n\nName    Enabled\n----    -------\nJan Ott   False', o: ['Konten sind in den ersten 24 Stunden immer deaktiviert.', 'Es wurde kein Kennwort und kein -Enabled $true angegeben.', 'Die OU ist schreibgeschützt.', 'Der Anmeldename ist zu kurz.'], c: 1 });
Q({ id: 'b46', lz: 'LZ9', type: 'hotspot', q: 'Klicke auf den Teil, der die **OU** angibt, in der das Konto liegt.', tokens: ['CN=Lena Krause', 'OU=Azubis', 'OU=Korbwerk', 'DC=korbwerk', 'DC=intern'], c: 1 });
Q({ id: 'b47', lz: 'LZ9', type: 'match', q: 'Ordne die Begriffe zu (AGDLP).', pairs: [['Globale Gruppe', 'fasst Benutzer z. B. einer Abteilung zusammen'], ['Domänenlokale Gruppe', 'erhält die Rechte auf eine Ressource'], ['Organisationseinheit (OU)', 'Container zum Ordnen von Objekten'], ['Universelle Gruppe', 'gilt in der gesamten Gesamtstruktur']] });
// LZ10
Q({ id: 'b48', lz: 'LZ10', type: 'mc', q: 'Über welchen Dienst und Port läuft PowerShell-Remoting standardmäßig?', o: ['SSH, Port 22', 'WinRM, Port 5985', 'RDP, Port 3389', 'SMB, Port 445'], c: 1 });
Q({ id: 'b49', lz: 'LZ10', type: 'term', q: 'Auf welchem Server ist der Dienst **gestoppt**?', term: 'PS C:\\> Invoke-Command -ComputerName KORB-DC01, KORB-APP01, KORB-SRV02 { Get-Service W32Time }\n\nStatus   Name               DisplayName                    PSComputerName\n------   ----               -----------                    --------------\nRunning  W32Time            Windows-Zeitgeber              KORB-DC01\nStopped  W32Time            Windows-Zeitgeber              KORB-APP01\nRunning  W32Time            Windows-Zeitgeber              KORB-SRV02', o: ['KORB-DC01', 'KORB-APP01', 'KORB-SRV02', 'Auf keinem'], c: 1 });
Q({ id: 'b50', lz: 'LZ10', type: 'hotspot', q: '$pfad ist lokal definiert. Klicke auf den Teil, der geändert werden muss, damit der Wert auf dem Remoterechner ankommt.', tokens: ['Invoke-Command', '-ComputerName KORB-DC01', '-ScriptBlock {', 'Get-ChildItem', '$pfad', '}'], c: 4 });
Q({ id: 'b51', lz: 'LZ10', type: 'match', q: 'Ordne die Remoting-Cmdlets zu.', pairs: [['Enter-PSSession', 'interaktive Sitzung auf einem Rechner'], ['Invoke-Command', 'Befehle auf mehreren Rechnern gleichzeitig'], ['New-PSSession', 'dauerhafte Sitzung für mehrere Befehle'], ['Test-WSMan', 'prüft, ob WinRM antwortet']] });

/* Ziehen der Fragen */
EXAM.drawB = function (rnd) {
  rnd = rnd || Math.random;
  const pick = [];
  for (const [lz, n] of Object.entries(EXAM.draw)) {
    const list = EXAM.pool.filter(q => q.lz === lz).slice();
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    pick.push(...list.slice(0, n));
  }
  return pick;
};
/* Bewertung einer Antwort: 0..1 */
EXAM.scoreB = function (q, a) {
  if (a === undefined || a === null || a === '') return 0;
  if (q.type === 'mc' || q.type === 'term' || q.type === 'hotspot') return Number(a) === q.c ? 1 : 0;
  if (q.type === 'num') { const n = parseFloat(String(a).replace(',', '.')); return Math.abs(n - q.answer) <= (q.tol || 0) ? 1 : 0; }
  if (q.type === 'match') { if (!Array.isArray(a)) return 0; let ok = 0; q.pairs.forEach((p, i) => { if (a[i] === p[1]) ok++; }); return ok === q.pairs.length ? 1 : (ok >= q.pairs.length / 2 ? 0.5 : 0); }
  return 0;
};
EXAM.result = function (aPoints, bPoints, bCount) {
  const a = aPoints / EXAM.partA.length * 50;
  const b = bPoints / bCount * 50;
  const total = Math.round(a + b);
  return { a: Math.round(a * 10) / 10, b: Math.round(b * 10) / 10, total, passed: total >= 70 };
};
})();
