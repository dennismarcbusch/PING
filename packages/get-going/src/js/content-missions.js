/* Get-Going! – Üben: Missionen (je Kapitel eine) */
(function () {
'use strict';
const GG = globalThis.GG = globalThis.GG || {};
const H = GG.H;
const lc = s => String(s == null ? '' : s).toLowerCase();
const KW = 'OU=Korbwerk,DC=korbwerk,DC=intern';
const A = cmd => ({ a: cmd });
const ANS = (cp, v) => ({ ans: v, cp });
const ago = (d, h) => GG.ago(d, h);

GG.MISSIONS = [
  /* ---------- M1 ---------- */
  { id: 'm1', ch: 'k1', title: 'Werkzeugkiste',
    story: 'Ich gebe dir heute keine Befehle vor – du findest sie selbst. Das ist die wichtigste Fähigkeit überhaupt: Niemand kennt alle Cmdlets auswendig.\n\nBeantworte meine vier Fragen direkt hier im Fenster.',
    cps: [
      { id: 'c1', text: 'Mit welchem Cmdlet listest du die **lokalen Gruppen** des Servers auf?', answer: 'Cmdlet', check: st => H.ans(st, 'Get-LocalGroup') },
      { id: 'c2', text: 'Lass dir die Hilfe **nur zum Parameter -Newest** von **Get-EventLog** anzeigen.', check: st => H.used(st, 'Get-Help', p => /get-eventlog/i.test(H.pStr(p, 'Name')) && /newest/i.test(H.pStr(p, 'Parameter'))) },
      { id: 'c3', text: 'Wie viele Befehle stellt das Modul **NetTCPIP** bereit?', answer: 'Anzahl', check: st => H.ansNum(st, GG.Missions.moduleCount('NetTCPIP')) || H.ansNum(st, GG.Missions.moduleCount('NetTCPIP', true)) },
      { id: 'c4', text: 'Welcher Alias für **Where-Object** besteht aus **genau einem Zeichen**?', answer: 'Alias', check: st => String(st.answer || '').trim() === '?' }
    ],
    hints: ['Für die erste und die dritte Frage hilft Get-Command – einmal mit -Noun, einmal mit -Module.', 'Get-Help kennt einen Parameter, der genauso heißt wie das, was du suchst: -Parameter.', 'Get-Alias -Definition Where-Object zeigt alle Aliase. (Get-Command -Module NetTCPIP).Count zählt.'],
    reflect: { q: 'Warum ist es sinnvoller, Cmdlets über Verb und Nomen zu suchen, als sich möglichst viele Namen zu merken?', model: 'Weil alle Cmdlets nach demselben Schema benannt sind, kann man aus der Aufgabe (Was will ich tun? Womit?) den Namen ableiten und mit Get-Command gezielt suchen. Das funktioniert auch für Module, die man noch nie benutzt hat – auswendig gelerntes Wissen hilft dort nicht. Get-Help liefert dann Parameter und Beispiele.' },
    solution: ['Get-Command -Noun LocalGroup', ANS('c1', 'Get-LocalGroup'), 'Get-Help Get-EventLog -Parameter Newest', '(Get-Command -Module NetTCPIP).Count', { fn: st => { st.answers.c3 = String(GG.Missions.moduleCount('NetTCPIP')); } }, 'Get-Alias -Definition Where-Object', ANS('c4', '?')] },

  /* ---------- M2 ---------- */
  { id: 'm2', ch: 'k2', title: 'Scan-Archiv',
    story: 'Die Scans in C:\\Freigaben\\Scans werden nicht mehr gebraucht, sollen aber archiviert werden:\n\n1. Lege den Ordner C:\\Archiv\\Scans an.\n2. Kopiere alle Scans dorthin.\n3. Packe den Archivordner zusätzlich in C:\\Backup\\scans-2026.zip.\n4. Leere danach den Ordner C:\\Freigaben\\Scans – der Ordner selbst bleibt.\n\nUnd: Wer ist laut Registrierung eigentlich für den Server zuständig?',
    cps: [
      { id: 'c1', text: 'Ordner **C:\\Archiv\\Scans** ist angelegt.', check: st => H.isDir(st, 'C:\\Archiv\\Scans') },
      { id: 'c2', text: 'Alle **7 Scans** liegen in C:\\Archiv\\Scans.', check: st => H.files(st, 'C:\\Archiv\\Scans').filter(f => /^scan_00\d\.jpe?g$/i.test(f.name)).length === 7 },
      { id: 'c3', text: 'Das Archiv **C:\\Backup\\scans-2026.zip** existiert.', check: st => H.exists(st, 'C:\\Backup\\scans-2026.zip') },
      { id: 'c4', text: '**C:\\Freigaben\\Scans** ist leer, der Ordner existiert aber noch.', check: st => H.isDir(st, 'C:\\Freigaben\\Scans') && H.files(st, 'C:\\Freigaben\\Scans').length === 0 },
      { id: 'c5', text: 'Wer ist laut **HKLM:\\SOFTWARE\\Korbwerk\\Server** (Wert *Betreuer*) für den Server zuständig?', answer: 'Name', check: st => H.ans(st, 'Mira Hofmann') }
    ],
    hints: ['New-Item -ItemType Directory legt Ordner an – auch mehrere Ebenen auf einmal.', 'Copy-Item C:\\Freigaben\\Scans\\* -Destination …, danach Compress-Archive -Path … -DestinationPath …', 'Remove-Item C:\\Freigaben\\Scans\\* löscht nur den Inhalt. Für die Registry: Get-ItemProperty HKLM:\\SOFTWARE\\Korbwerk\\Server'],
    reflect: { q: 'Warum ist „Remove-Item C:\\Freigaben\\Scans\\*“ etwas anderes als „Remove-Item C:\\Freigaben\\Scans -Recurse“ – und wie hättest du vorher prüfen können, was passiert?', model: 'Mit \\* werden nur die Elemente im Ordner gelöscht, der Ordner selbst (und damit z. B. Freigabe und Rechte) bleibt. Mit -Recurse auf den Ordner verschwindet er komplett. Mit -WhatIf hätte man vorher gesehen, welche Elemente betroffen sind – ohne etwas zu löschen.' },
    solution: ['New-Item C:\\Archiv\\Scans -ItemType Directory', 'Copy-Item C:\\Freigaben\\Scans\\* -Destination C:\\Archiv\\Scans', 'Compress-Archive -Path C:\\Archiv\\Scans -DestinationPath C:\\Backup\\scans-2026.zip', 'Remove-Item C:\\Freigaben\\Scans\\*', 'Get-ItemProperty HKLM:\\SOFTWARE\\Korbwerk\\Server', ANS('c5', 'Mira Hofmann')] },

  /* ---------- M3 ---------- */
  { id: 'm3', ch: 'k3', title: 'Spurensuche mit der Pipeline',
    story: 'Die Geschäftsführung fragt mich ständig Dinge über den Server, und ich habe keine Lust, Listen abzuzählen.\n\nBeantworte die vier Fragen – jeweils mit einer einzigen Pipeline.',
    cps: [
      { id: 'c1', text: 'Wie heißt die **größte Datei** auf Laufwerk **D:** (alle Unterordner)?', answer: 'Dateiname', check: st => H.ans(st, 'SERVER_2025_x64.iso', 'd:\\iso\\server_2025_x64.iso') },
      { id: 'c2', text: 'Wie viele Dienste **laufen** gerade?', answer: 'Anzahl', check: st => H.ansNum(st, st.w.services.filter(s => s.status === 'Running').length) },
      { id: 'c3', text: 'Welcher **Hersteller** (Eigenschaft *Company*) hat die meisten Prozesse?', answer: 'Hersteller', check: st => H.ans(st, 'Microsoft Corporation', 'Microsoft') },
      { id: 'c4', text: 'Wie groß sind **alle Dateien direkt in C:\\Logs** zusammen – in **KB**, gerundet?', answer: 'KB', check: st => { const kb = H.files(st, 'C:\\Logs').filter(f => !f.dir).reduce((a, f) => a + f.length, 0) / 1024; return H.ansNum(st, Math.floor(kb), Math.ceil(kb)); } }
    ],
    hints: ['Sort-Object Length -Descending | Select-Object -First 1 – mit Get-ChildItem D:\\ -Recurse -File.', 'Where-Object Status -eq Running | Measure-Object; für c3: Group-Object Company | Sort-Object Count -Descending', 'Measure-Object Length -Sum liefert die Summe in Byte – geteilt durch 1KB ergibt Kilobyte.'],
    reflect: { q: 'Warum kannst du in der PowerShell nach „Length“ sortieren und summieren, ohne Text zu zerschneiden?', model: 'Weil Get-ChildItem Objekte liefert, deren Eigenschaft Length eine Zahl ist. Sort-Object und Measure-Object arbeiten direkt mit diesem Wert. In einer textbasierten Shell müsste man die Größe erst aus der Ausgabezeile herausschneiden und in eine Zahl umwandeln.' },
    solution: ['Get-ChildItem D:\\ -Recurse -File | Sort-Object Length -Descending | Select-Object -First 1', ANS('c1', 'SERVER_2025_x64.iso'), '(Get-Service | Where-Object Status -eq Running).Count', { fn: st => { st.answers.c2 = String(st.w.services.filter(s => s.status === 'Running').length); } }, 'Get-Process | Group-Object Company | Sort-Object Count -Descending', ANS('c3', 'Microsoft Corporation'), '(Get-ChildItem C:\\Logs -File | Measure-Object Length -Sum).Sum / 1KB', { fn: st => { st.answers.c4 = String(Math.round(H.files(st, 'C:\\Logs').filter(f => !f.dir).reduce((a, f) => a + f.length, 0) / 1024)); } }] },

  /* ---------- M4 ---------- */
  { id: 'm4', ch: 'k4', title: 'Berichte für die Chefin',
    story: 'Frau Korb möchte drei Berichte – bitte in C:\\Berichte:\n\n• gestoppte-dienste.csv: Name und DisplayName aller gestoppten Dienste, für Excel (Semikolon, ohne #TYPE)\n• app-fehler.txt: nur die ERROR-Zeilen aus C:\\Logs\\app.log\n• notebooks.html: alle Notebooks aus C:\\Import\\inventar.csv als HTML-Tabelle\n\nAußerdem liegen irgendwo auf C:\\ alte .bak-Dateien herum. Wie viele sind es?',
    setup: env => {
      const w = env.main;
      const docs = H.node({ env }, 'C:\\Users\\azubi\\Documents'); docs.add(GG.f('export.bak', 88123, { mtime: ago(300) }));
      const kt = H.node({ env }, 'C:\\Program Files\\KalleTools'); kt.add(GG.f('config.bak', '[Backup]\n', { mtime: ago(200) }));
    },
    cps: [
      { id: 'c1', text: '**gestoppte-dienste.csv** enthält Name und DisplayName aller gestoppten Dienste (Semikolon, ohne #TYPE).', check: st => { const c = H.csv(H.content(st, 'C:\\Berichte\\gestoppte-dienste.csv'), ';'); if (!c || c.typeLine || !c.head.includes('Name') || !c.head.includes('DisplayName')) return false; const want = st.w.services.filter(s => s.status === 'Stopped').map(s => lc(s.name)).sort(); const got = c.rows.map(r => lc(r.Name)).sort(); return want.length === got.length && want.every((n, i) => n === got[i]); } },
      { id: 'c2', text: '**app-fehler.txt** enthält genau die ERROR-Zeilen aus app.log.', check: st => { const t = H.content(st, 'C:\\Berichte\\app-fehler.txt'); if (!t) return false; return (t.match(/ERROR/g) || []).length === 3 && !/\bINFO\b|\bWARN\b/.test(t); } },
      { id: 'c3', text: '**notebooks.html** zeigt die Notebooks aus inventar.csv – und nur diese.', check: st => { const t = H.content(st, 'C:\\Berichte\\notebooks.html') || ''; return /<table>/i.test(t) && /NB-001/.test(t) && /NB-002/.test(t) && !/PC-001/.test(t); } },
      { id: 'c4', text: 'Wie viele **.bak-Dateien** gibt es auf C:\\ insgesamt?', answer: 'Anzahl', check: st => H.ansNum(st, 3) }
    ],
    hints: ['Where-Object Status -eq Stopped | Select-Object Name, DisplayName | Export-Csv … -NoTypeInformation -Delimiter ";"', 'Select-String -Path … -Pattern ERROR liefert Treffer-Objekte – ihre Eigenschaft Line ist die Zeile. Import-Csv … | Where-Object Typ -eq Notebook | ConvertTo-Html | Out-File …', 'Get-ChildItem C:\\ -Recurse -Filter *.bak -ErrorAction SilentlyContinue | Measure-Object'],
    reflect: { q: 'Warum schreibt „Select-String ERROR app.log | Out-File x.txt“ mehr in die Datei als nur die Logzeilen – und wie bekommst du nur die Zeilen?', model: 'Out-File schreibt die Bildschirmdarstellung der MatchInfo-Objekte, also mit Dateiname und Zeilennummer. Mit „| ForEach-Object Line“ oder „Select-Object -ExpandProperty Line“ gibt man nur den Text der Zeile weiter.' },
    solution: ['Get-Service | Where-Object Status -eq Stopped | Select-Object Name, DisplayName | Export-Csv C:\\Berichte\\gestoppte-dienste.csv -NoTypeInformation -Delimiter ";"', 'Select-String -Path C:\\Logs\\app.log -Pattern ERROR | ForEach-Object Line | Out-File C:\\Berichte\\app-fehler.txt', 'Import-Csv C:\\Import\\inventar.csv -Delimiter ";" | Where-Object Typ -eq Notebook | ConvertTo-Html | Out-File C:\\Berichte\\notebooks.html', 'Get-ChildItem C:\\ -Recurse -Filter *.bak -ErrorAction SilentlyContinue | Measure-Object', ANS('c4', '3')] },

  /* ---------- M5 ---------- */
  { id: 'm5', ch: 'k5', title: 'Skript statt Handarbeit',
    story: 'Ich brauche ein kleines Werkzeug: C:\\Skripte\\Get-LogInfo.ps1 soll für einen Ordner (Parameter -Ordner, Standard C:\\Logs) die Anzahl und Gesamtgröße der .log-Dateien ausgeben.\n\nAußerdem hat mir ein Kollege C:\\Skripte\\pruefen.ps1 geschickt – prüf es und lass es laufen.\n\nZum Schluss: Bau dir eine Funktion Test-Server, die True/False liefert, ob ein Server antwortet. Und fang mindestens einen Fehler sauber mit try/catch ab.',
    setup: env => {
      const sk = H.node({ env }, 'C:\\Skripte');
      sk.add(GG.f('pruefen.ps1', '# pruefen.ps1 - Kurzpruefung des Servers\n$bericht = "C:\\Berichte\\pruefung.txt"\n"Pruefung vom $(Get-Date -Format "dd.MM.yyyy HH:mm")" | Set-Content $bericht\n"Dienste gestoppt (automatisch): $((Get-Service | Where-Object { $_.StartType -eq "Automatic" -and $_.Status -ne "Running" }).Count)" | Add-Content $bericht\n"Freier Platz C: $([math]::Round((Get-Volume C).SizeRemaining / 1GB)) GB" | Add-Content $bericht\nWrite-Host "Bericht geschrieben: $bericht" -ForegroundColor Green\n', { zone: 3, zoneRef: 'https://mail.korbwerk.de/anhang/pruefen.ps1', mtime: ago(0, 1) }));
    },
    cps: [
      { id: 'c1', text: '**C:\\Skripte\\Get-LogInfo.ps1** existiert und hat einen **param()-Block** mit dem Parameter **$Ordner**.', check: st => /param\s*\([\s\S]*\$Ordner/i.test(H.content(st, 'C:\\Skripte\\Get-LogInfo.ps1') || '') },
      { id: 'c2', text: 'Get-LogInfo.ps1 wurde **mit -Ordner** erfolgreich ausgeführt.', check: st => H.cmds(st).some(c => c.script && /get-loginfo\.ps1$/i.test(c.name) && c.ok !== false && H.p(c.params, 'Ordner') !== undefined) },
      { id: 'c3', text: '**pruefen.ps1** wurde freigegeben und ausgeführt (C:\\Berichte\\pruefung.txt existiert).', check: st => { const n = H.node(st, 'C:\\Skripte\\pruefen.ps1'); return n && !n.zone && H.exists(st, 'C:\\Berichte\\pruefung.txt'); } },
      { id: 'c4', text: 'Die Funktion **Test-Server** ist definiert und wurde aufgerufen.', check: st => H.cmds(st).some(c => c.fn && lc(c.name) === 'test-server' && c.ok !== false) },
      { id: 'c5', text: 'Ein Fehler wurde mit **try/catch** abgefangen.', check: st => (st.entries || []).some(e => e.caught) }
    ],
    hints: ['notepad C:\\Skripte\\Get-LogInfo.ps1 – erste Zeile: param([string]$Ordner = "C:\\Logs")', 'Darunter z. B.: Get-ChildItem $Ordner -Filter *.log | Measure-Object Length -Sum. Für pruefen.ps1: Get-Content, Unblock-File, ausführen.', 'function Test-Server { param($Name) Test-Connection $Name -Count 1 -Quiet } – und try { Get-Item C:\\nix -ErrorAction Stop } catch { "abgefangen" }'],
    reflect: { q: 'Warum gibst du ein heruntergeladenes Skript mit Unblock-File frei, statt die Ausführungsrichtlinie auf Unrestricted zu setzen?', model: 'Unblock-File gibt nur diese eine Datei frei – nachdem ich sie gelesen und geprüft habe. Die Richtlinie RemoteSigned schützt weiterhin vor allen anderen ungeprüften Skripten aus dem Internet. Unrestricted würde diesen Schutz für alle Skripte abschalten.' },
    solution: [{ np: { file: 'C:\\Skripte\\Get-LogInfo.ps1', content: 'param(\n    [string]$Ordner = "C:\\Logs"\n)\n$m = Get-ChildItem $Ordner -Filter *.log | Measure-Object Length -Sum\n"$($m.Count) Logdateien, zusammen $([math]::Round($m.Sum / 1KB, 1)) KB"' } }, 'C:\\Skripte\\Get-LogInfo.ps1 -Ordner C:\\Logs\\Archiv', 'Get-Content C:\\Skripte\\pruefen.ps1', 'Unblock-File C:\\Skripte\\pruefen.ps1', 'C:\\Skripte\\pruefen.ps1', 'function Test-Server { param($Name) Test-Connection $Name -Count 1 -Quiet }', 'Test-Server KORB-DC01', 'try { Get-Item C:\\nix -ErrorAction Stop } catch { Write-Warning "abgefangen: $($_.Exception.Message)" }'] },

  /* ---------- M6 ---------- */
  { id: 'm6', ch: 'k6', title: 'Neue Kollegin im Lager',
    story: 'Im Lager fängt Montag eine Aushilfe an, die sich per Remotedesktop an KORB-SRV02 anmeldet, um Lieferscheine zu drucken.\n\n• Lokales Konto „lager“ (aktiviert, Beschreibung mit „Lager“), Mitglied in Remotedesktopbenutzer\n• Ordner C:\\Freigaben\\Lager: Die Gruppe KORBWERK\\GG-Lager darf ändern (vererbt)\n• Freigabe „Lager“ mit Ändern-Recht für KORBWERK\\GG-Lager – nicht für Jeder!',
    cps: [
      { id: 'c1', text: 'Ein **Admin-Tab** ist geöffnet.', check: st => !!(st.sessions.admin && st.sessions.admin.elevated) },
      { id: 'c2', text: 'Lokales Konto **lager** ist aktiviert und hat eine Beschreibung mit „Lager“.', check: st => { const u = H.luser(st, 'lager'); return u && u.enabled !== false && /lager/i.test(u.desc || ''); } },
      { id: 'c3', text: '**lager** ist Mitglied der Gruppe **Remotedesktopbenutzer**.', check: st => H.lgroupHas(st, 'Remotedesktopbenutzer', 'lager') },
      { id: 'c4', text: '**C:\\Freigaben\\Lager**: KORBWERK\\GG-Lager hat **Ändern**, vererbt auf Dateien und Unterordner.', check: st => H.isDir(st, 'C:\\Freigaben\\Lager') && H.acl(st, 'C:\\Freigaben\\Lager').some(r => lc(r.id) === 'korbwerk\\gg-lager' && r.r === 'M' && r.oi && r.ci && r.type !== 'Deny') },
      { id: 'c5', text: 'Freigabe **Lager** mit **Ändern** für KORBWERK\\GG-Lager, **kein** Zugriff für Jeder.', check: st => { const s = H.share(st, 'Lager'); return s && /c:\\freigaben\\lager$/i.test(s.path) && s.access.some(a => /gg-lager$/i.test(a.account) && /change|full/i.test(a.right)) && !s.access.some(a => lc(a.account) === 'jeder'); } }
    ],
    hints: ['Start-Process powershell -Verb RunAs – dann New-LocalUser mit -Password und -Description.', 'Add-LocalGroupMember -Group Remotedesktopbenutzer -Member lager; Ordner mit New-Item, Rechte mit icacls … /grant "KORBWERK\\GG-Lager:(OI)(CI)M"', 'New-SmbShare -Name Lager -Path C:\\Freigaben\\Lager -ChangeAccess "KORBWERK\\GG-Lager"'],
    reflect: { q: 'Warum gibst du die Rechte an die Gruppe GG-Lager und nicht direkt an die neue Mitarbeiterin?', model: 'Gruppen machen die Verwaltung einfacher und nachvollziehbarer: Kommt jemand Neues ins Lager oder geht jemand, ändert man nur die Gruppenmitgliedschaft – nicht die Rechte auf vielen Ordnern. Außerdem sieht man in der ACL sofort, welche Abteilung zugreifen darf.' },
    solution: ['Start-Process powershell -Verb RunAs', A('$pw = ConvertTo-SecureString "Lager!2026x" -AsPlainText -Force'), A('New-LocalUser -Name lager -Password $pw -Description "Aushilfe Lager (Lieferscheine)"'), A('Add-LocalGroupMember -Group Remotedesktopbenutzer -Member lager'), A('New-Item C:\\Freigaben\\Lager -ItemType Directory'), A('icacls C:\\Freigaben\\Lager /grant "KORBWERK\\GG-Lager:(OI)(CI)M"'), A('New-SmbShare -Name Lager -Path C:\\Freigaben\\Lager -ChangeAccess "KORBWERK\\GG-Lager"')] },

  /* ---------- M7 ---------- */
  { id: 'm7', ch: 'k7', title: 'Der Server ächzt',
    story: 'Seit heute Morgen ist KORB-SRV02 wieder zäh, und gedruckt wird auch nichts mehr.\n\n• Finde den Prozess, der die CPU auffrisst, und beende ihn.\n• Bring die Druckwarteschlange wieder zum Laufen – dauerhaft.\n• Schau im Ereignisprotokoll nach, mit welcher Event-ID der Absturz protokolliert wurde.\n• Wenn du schon dabei bist: Bring Notepad++ auf den neuesten Stand und installiere das Modul ImportExcel für alle Benutzer.',
    setup: env => {
      const w = env.main;
      w.processes.push({ id: 6666, name: 'CoinHelper', cpu: 52817.3, ws: 812 * 1048576, pm: 790 * 1048576, handles: 412, user: 'backup', si: 0, company: '', desc: '', path: 'C:\\Users\\backup\\AppData\\Local\\Temp\\CoinHelper.exe', start: ago(0, 9) });
      const sp = w.services.find(s => s.name === 'Spooler'); sp.status = 'Stopped'; sp.start = 'Manual';
      w.processes = w.processes.filter(p => p.name !== 'spoolsv');
      GG.addEvent(w, 'System', { level: 'Error', source: 'Service Control Manager', id: 7034, msg: 'Der Dienst "Druckwarteschlange" wurde unerwartet beendet. Dies ist bereits 3 Mal passiert.', time: ago(0, 3) });
    },
    cps: [
      { id: 'c1', text: 'Der Prozess, der die CPU auffrisst, ist **beendet**.', check: st => !H.proc(st, p => p.id === 6666) },
      { id: 'c2', text: 'Der Dienst **Spooler** läuft und startet **automatisch**.', check: st => { const s = H.svc(st, 'Spooler'); return s.status === 'Running' && s.start === 'Automatic'; } },
      { id: 'c3', text: 'Mit welcher **Event-ID** wurde der Absturz der Druckwarteschlange protokolliert?', answer: 'Event-ID', check: st => H.ansNum(st, 7034) },
      { id: 'c4', text: '**Notepad++** ist auf die neueste Version aktualisiert.', check: st => { const p = H.pkg(st, 'Notepad++.Notepad++'); return p && p.version !== '8.4.2'; } },
      { id: 'c5', text: 'Das Modul **ImportExcel** ist für **alle Benutzer** installiert.', check: st => { const m = H.module(st, 'ImportExcel'); return m && m.scope === 'AllUsers'; } }
    ],
    hints: ['Get-Process | Sort-Object CPU -Descending | Select-Object -First 3 – beenden im Admin-Tab.', 'Set-Service Spooler -StartupType Automatic, dann Start-Service. Get-EventLog System -EntryType Error -Newest 5', 'winget upgrade zeigt verfügbare Updates. Install-Module ImportExcel (ohne -Scope = AllUsers) im Admin-Tab.'],
    reflect: { q: 'Ein unbekannter Prozess eines Dienstkontos frisst die CPU. Ist „Stop-Process“ damit die vollständige Lösung? Was würdest du zusätzlich tun?', model: 'Nein, Stop-Process beseitigt nur das Symptom. Man sollte herausfinden, woher der Prozess kommt (Pfad, Besitzer, Autostart, geplante Aufgaben), das betroffene Konto prüfen (Kennwort ändern, ggf. deaktivieren), die Datei entfernen bzw. per Virenscanner prüfen und den Vorfall dokumentieren bzw. melden.' },
    solution: ['Get-Process | Sort-Object CPU -Descending | Select-Object -First 3', 'Start-Process powershell -Verb RunAs', A('Stop-Process -Id 6666 -Force'), A('Set-Service Spooler -StartupType Automatic'), A('Start-Service Spooler'), 'Get-EventLog -LogName System -EntryType Error -Newest 5', ANS('c3', '7034'), A('winget upgrade Notepad++.Notepad++'), A('Install-Module ImportExcel -Force')] },

  /* ---------- M8 ---------- */
  { id: 'm8', ch: 'k8', title: 'Falsch konfiguriert',
    story: 'Ein Praktikant hat „nur kurz“ die Netzwerkeinstellungen von KORB-SRV02 angefasst. Seitdem geht nichts ins Internet, Namen werden nicht aufgelöst, und auf Ping antwortet der Server auch nicht mehr.\n\nRichtig wäre: Gateway 10.20.0.1, DNS 10.20.0.10.\n\nUnd wo du schon dabei bist: Für einen Test braucht der Server eine eingehende Firewallregel „Korbwerk-Webtest“ für TCP-Port 8080.',
    setup: env => {
      const w = env.main;
      const cfg = w.net.ip[4]; cfg.gw = ['10.20.0.254']; cfg.dns = ['8.8.8.8'];
      const r = w.firewall.rules.find(x => x.name === 'FPS-ICMP4-ERQ-In'); if (r) r.enabled = false;
    },
    cps: [
      { id: 'c1', text: 'Das Standardgateway ist **10.20.0.1** (und nur dieses).', check: st => { const c = H.ipcfg(st, 'Ethernet'); return c && c.gw.length === 1 && c.gw[0] === '10.20.0.1'; } },
      { id: 'c2', text: 'Der DNS-Server ist **10.20.0.10**.', check: st => { const c = H.ipcfg(st, 'Ethernet'); return c && c.dns[0] === '10.20.0.10'; } },
      { id: 'c3', text: 'Auf welchen Server zeigt der DNS-Alias **shop.korbwerk.intern**?', answer: 'Servername', check: st => H.ans(st, 'korb-app01.korbwerk.intern', 'korb-app01', '10.20.0.13') },
      { id: 'c4', text: 'Der Server antwortet wieder auf **Ping** (ICMPv4).', check: st => { const r = H.fw(st, 'FPS-ICMP4-ERQ-In'); return r && r.enabled; } },
      { id: 'c5', text: 'Eingehende Regel **Korbwerk-Webtest** erlaubt **TCP 8080**.', check: st => st.w.firewall.rules.some(r => /korbwerk-webtest/i.test(r.display || r.name) && r.enabled && r.direction === 'Inbound' && r.action === 'Allow' && r.protocol === 'TCP' && String(r.localPort).split(',').map(x => x.trim()).includes('8080')) }
    ],
    hints: ['Get-NetIPConfiguration zeigt alles auf einen Blick. Das falsche Gateway entfernst du mit Remove-NetRoute -DestinationPrefix 0.0.0.0/0.', 'New-NetRoute -InterfaceAlias Ethernet -DestinationPrefix 0.0.0.0/0 -NextHop 10.20.0.1; Set-DnsClientServerAddress …; Resolve-DnsName shop', 'Enable-NetFirewallRule -Name FPS-ICMP4-ERQ-In; New-NetFirewallRule -DisplayName Korbwerk-Webtest -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow'],
    reflect: { q: 'Warum trägt man auf einem Domänenmitglied nie 8.8.8.8 als DNS-Server ein?', model: 'Der öffentliche DNS-Server kennt die interne Zone korbwerk.intern nicht. Der Server findet dann weder den Domänencontroller noch andere interne Rechner – Anmeldung, Gruppenrichtlinien, AD-Cmdlets und Remoting scheitern. Interne DNS-Server (die DCs) leiten externe Anfragen selbst weiter.' },
    solution: ['Get-NetIPConfiguration', 'Start-Process powershell -Verb RunAs', A('Remove-NetRoute -DestinationPrefix 0.0.0.0/0 -Confirm:$false'), A('New-NetRoute -InterfaceAlias Ethernet -DestinationPrefix 0.0.0.0/0 -NextHop 10.20.0.1'), A('Set-DnsClientServerAddress -InterfaceAlias Ethernet -ServerAddresses 10.20.0.10'), 'Resolve-DnsName shop.korbwerk.intern', ANS('c3', 'korb-app01.korbwerk.intern'), A('Enable-NetFirewallRule -Name FPS-ICMP4-ERQ-In'), A('New-NetFirewallRule -DisplayName Korbwerk-Webtest -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow')] },

  /* ---------- M9 ---------- */
  { id: 'm9', ch: 'k9', title: 'Personalkarussell',
    story: 'Ein paar Änderungen aus der Personalabteilung:\n\n• Für externe Dienstleister soll es eine eigene OU „Externe“ unter OU=Korbwerk geben.\n• Darin: Peter Müller (pmueller) von „Müller Elektro“ (Company), aktiviert.\n• Sandra Schuster (sschuster) wechselt vom Vertrieb ins Lager – Abteilung und Gruppen anpassen.\n• Alle Benutzerkonten, die seit über 90 Tagen nicht benutzt wurden, werden deaktiviert.\n\nWie viele Mitglieder hat GG-Lager danach?',
    cps: [
      { id: 'c1', text: 'OU **Externe** existiert unter OU=Korbwerk.', check: st => !!H.adOu(st, 'OU=Externe,' + KW) },
      { id: 'c2', text: '**pmueller** (Peter Müller, Company „Müller Elektro“) ist aktiviert in der OU Externe.', check: st => { const u = H.adUser(st, 'pmueller'); return u && u.enabled && lc(u.parent) === lc('OU=Externe,' + KW) && /müller elektro/i.test(u.company || ''); } },
      { id: 'c3', text: '**sschuster**: Abteilung Lager, Mitglied in GG-Lager, nicht mehr in GG-Vertrieb.', check: st => { const u = H.adUser(st, 'sschuster'); return u && lc(u.dept) === 'lager' && H.adInGroup(st, 'sschuster', 'GG-Lager') && !H.adInGroup(st, 'sschuster', 'GG-Vertrieb'); } },
      { id: 'c4', text: 'Alle seit über 90 Tagen inaktiven Benutzer sind **deaktiviert**.', check: st => { const lim = Date.now() - 90 * 864e5; const inact = st.env.ad.users.filter(u => u.lastLogon && u.lastLogon.getTime() < lim); return inact.length > 0 && inact.every(u => !u.enabled) && H.adUser(st, 'tbecker').enabled; } },
      { id: 'c5', text: 'Wie viele Mitglieder hat **GG-Lager** jetzt?', answer: 'Anzahl', check: st => H.ansNum(st, H.adGroup(st, 'GG-Lager').members.length) && H.adInGroup(st, 'sschuster', 'GG-Lager') }
    ],
    hints: ['New-ADOrganizationalUnit -Name Externe -Path "OU=Korbwerk,DC=korbwerk,DC=intern"; New-ADUser … -Company "Müller Elektro" -Path … -Enabled $true', 'Set-ADUser sschuster -Department Lager; Remove-ADGroupMember / Add-ADGroupMember', 'Search-ADAccount -AccountInactive -TimeSpan 90.00:00:00 -UsersOnly | Disable-ADAccount – Achtung: Das findet auch Konten, die sich noch NIE angemeldet haben. Schau dir die Liste an, bevor du deaktivierst!'],
    reflect: { q: 'Warum deaktiviert man inaktive Konten, statt sie sofort zu löschen?', model: 'Ein gelöschtes Konto bekommt man nicht einfach zurück – mit ihm verschwinden SID, Gruppenmitgliedschaften und Zuordnungen von Dateien und Rechten. Ein deaktiviertes Konto kann sich nicht mehr anmelden (Sicherheitsrisiko beseitigt), lässt sich aber bei Bedarf reaktivieren. Gelöscht wird erst nach einer Frist.' },
    solution: ['Search-ADAccount -AccountInactive -TimeSpan 90.00:00:00 -UsersOnly | Disable-ADAccount', `New-ADOrganizationalUnit -Name Externe -Path "${KW}"`, `New-ADUser -Name "Peter Müller" -GivenName Peter -Surname Müller -SamAccountName pmueller -Company "Müller Elektro" -Path "OU=Externe,${KW}" -AccountPassword (ConvertTo-SecureString "Extern!2026x" -AsPlainText -Force) -Enabled $true`, 'Set-ADUser sschuster -Department Lager', 'Remove-ADGroupMember -Identity GG-Vertrieb -Members sschuster -Confirm:$false', 'Add-ADGroupMember -Identity GG-Lager -Members sschuster', '(Get-ADGroupMember GG-Lager).Count', ANS('c5', '5')] },

  /* ---------- M10 ---------- */
  { id: 'm10', ch: 'k10', title: 'Fernwartung',
    story: 'Die Zeitsynchronisation macht Ärger: Auf KORB-DC01 und KORB-APP01 läuft der Dienst W32Time nicht. Starte ihn – ohne dich per Remotedesktop anzumelden.\n\nKORB-BACKUP01 ist per Remoting immer noch nicht erreichbar. Reparier das aus der Ferne (Tipp: Es gibt Cmdlets, die in Windows PowerShell 5.1 auch ohne WinRM funktionieren) – der Dienst soll künftig automatisch starten.\n\nDanach brauche ich C:\\Berichte\\speicher.csv mit dem freien Speicher von Laufwerk C: aller drei Server (mit PSComputerName).',
    setup: env => {
      for (const h of ['KORB-DC01', 'KORB-APP01']) { const s = env.worlds[h].services.find(x => x.name === 'W32Time'); s.status = 'Stopped'; }
    },
    cps: [
      { id: 'c1', text: '**W32Time** läuft auf KORB-DC01 und KORB-APP01.', check: st => ['KORB-DC01', 'KORB-APP01'].every(h => H.svc(st, 'W32Time', h).status === 'Running') },
      { id: 'c2', text: '**WinRM** läuft auf KORB-BACKUP01 und startet automatisch.', check: st => { const s = H.svc(st, 'WinRM', 'KORB-BACKUP01'); return s.status === 'Running' && s.start === 'Automatic'; } },
      { id: 'c3', text: '**C:\\Berichte\\speicher.csv** enthält Werte von **allen drei** Servern mit PSComputerName.', check: st => { const t = H.content(st, 'C:\\Berichte\\speicher.csv'); if (!t) return false; const delim = /;/.test(t.split('\n')[t.startsWith('#') ? 1 : 0]) ? ';' : ','; const c = H.csv(t, delim); if (!c || !c.head.includes('PSComputerName')) return false; const hs = new Set(c.rows.map(r => lc(r.PSComputerName))); return ['korb-dc01', 'korb-app01', 'korb-backup01'].every(h => hs.has(h)); } },
      { id: 'c4', text: 'Wie viele **Hotfixes** sind auf **KORB-BACKUP01** installiert?', answer: 'Anzahl', check: st => H.ansNum(st, H.world(st, 'KORB-BACKUP01').hotfixes.length) }
    ],
    hints: ['Invoke-Command -ComputerName KORB-DC01, KORB-APP01 -ScriptBlock { Start-Service W32Time }', 'Get-Service -ComputerName KORB-BACKUP01 -Name WinRM | Start-Service; Set-Service -ComputerName KORB-BACKUP01 -Name WinRM -StartupType Automatic', 'Invoke-Command -ComputerName … { Get-Volume -DriveLetter C } | Select-Object PSComputerName, SizeRemaining | Export-Csv …'],
    reflect: { q: 'Was ist der Vorteil von Invoke-Command gegenüber einer Remotedesktop-Anmeldung auf jedem Server?', model: 'Man erledigt dieselbe Aufgabe auf vielen Servern gleichzeitig mit einem Befehl, die Ergebnisse kommen als Objekte (mit PSComputerName) zurück und lassen sich direkt auswerten oder exportieren. Es ist schneller, wiederholbar (Skript) und belastet die Server weniger als eine grafische Sitzung.' },
    solution: ['Invoke-Command -ComputerName KORB-DC01, KORB-APP01 -ScriptBlock { Start-Service W32Time }', 'Get-Service -ComputerName KORB-BACKUP01 -Name WinRM | Start-Service', 'Set-Service -ComputerName KORB-BACKUP01 -Name WinRM -StartupType Automatic', 'Invoke-Command -ComputerName KORB-DC01, KORB-APP01, KORB-BACKUP01 -ScriptBlock { Get-Volume -DriveLetter C } | Select-Object PSComputerName, SizeRemaining | Export-Csv C:\\Berichte\\speicher.csv -NoTypeInformation -Delimiter ";"', 'Invoke-Command -ComputerName KORB-BACKUP01 -ScriptBlock { (Get-HotFix).Count }', ANS('c4', '3')] }
];

/* Hilfsfunktionen für Missionen */
GG.Missions = {
  moduleCount: (mod, withAliases) => { const l = Object.values(GG.cmdlets).filter(c => lc(c.module) === lc(mod)); return l.length + (withAliases ? l.reduce((a, c) => a + (c.aliases || []).length, 0) : 0); },
  env: m => { const env = GG.buildKorbwerk(); if (m.setup) m.setup(env); return env; },
  stepAnswer: (st, step) => { if (step.ans !== undefined && step.cp) { st.answers[step.cp] = step.ans; return true; } return false; },
  checkAll: (st, m, entries) => m.cps.map(cp => GG.Runner.check(st, cp, entries, (st.answers || {})[cp.id] || ''))
};
})();
