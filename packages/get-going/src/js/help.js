/* Get-Going! – Deutsche Hilfe (Get-Help, help, about_-Themen) */
(function () {
'use strict';
const GG = globalThis.GG = globalThis.GG || {};
const V = GG.v, I = GG.interp;
const { PSObject } = GG;
const P = GG.P, def = GG.def;
GG.BUILTIN_MODULES.add('microsoft.powershell.diagnostics');
GG.BUILTIN_MODULES.add('microsoft.wsman.management');

/* Name: [Übersicht, Beschreibung, [[Beispiel, Erklärung], ...], [verwandt]] */
const H = {
  'Get-Command': ['Ruft alle Befehle ab.', 'Das Cmdlet "Get-Command" ruft alle Befehle ab, die auf dem Computer installiert sind, einschließlich Cmdlets, Aliase, Funktionen, Filter, Skripts und Anwendungen. Mit den Parametern "Verb" und "Noun" finden Sie Befehle nach dem Verb-Nomen-Schema.', [['Get-Command -Noun Service', 'Zeigt alle Befehle, deren Nomen "Service" lautet, zum Beispiel Get-Service, Start-Service und Stop-Service.'], ['Get-Command -Verb Stop', 'Zeigt alle Befehle mit dem Verb "Stop".'], ['Get-Command *-ADUser', 'Zeigt alle Befehle, die mit AD-Benutzern arbeiten (Platzhalter erlaubt).'], ['Get-Command -Module NetTCPIP', 'Zeigt alle Befehle aus dem Modul NetTCPIP.']], ['Get-Help', 'Get-Alias', 'Get-Module']],
  'Get-Help': ['Zeigt Informationen zu Windows PowerShell-Befehlen und -Konzepten an.', 'Das Cmdlet "Get-Help" zeigt Informationen zu Cmdlets, Funktionen, Skripts und Konzepten an. Mit "-Examples" werden nur Beispiele angezeigt, mit "-Parameter" Details zu einem Parameter. Konzepte finden Sie in den about_-Themen, zum Beispiel "Get-Help about_Pipelines".', [['Get-Help Get-Process', 'Zeigt die Hilfe zu Get-Process.'], ['Get-Help Get-ChildItem -Examples', 'Zeigt nur die Beispiele zu Get-ChildItem.'], ['Get-Help Get-ChildItem -Parameter Recurse', 'Zeigt die Beschreibung des Parameters Recurse.'], ['Get-Help about_*', 'Listet alle about_-Themen auf.']], ['Get-Command', 'Update-Help', 'about_Command_Syntax']],
  'Update-Help': ['Lädt die neuesten Hilfedateien herunter und installiert sie auf dem Computer.', 'Update-Help benötigt Administratorrechte, da die Hilfedateien im Windows PowerShell-Installationsverzeichnis gespeichert werden.', [['Update-Help', 'Aktualisiert die Hilfe für alle Module (als Administrator ausführen).']], ['Get-Help']],
  'Get-Alias': ['Ruft die Aliase für die aktuelle Sitzung ab.', 'Ein Alias ist ein alternativer Name für ein Cmdlet. "dir", "ls" und "gci" sind zum Beispiel Aliase für Get-Child­Item. Achtung: Ein Alias übernimmt nur den Namen, nicht die Parameter des ursprünglichen Programms.', [['Get-Alias dir', 'Zeigt, welches Cmdlet hinter dem Alias "dir" steckt.'], ['Get-Alias -Definition Get-ChildItem', 'Zeigt alle Aliase für Get-ChildItem.']], ['Set-Alias', 'New-Alias', 'about_Aliases']],
  'Set-Alias': ['Erstellt oder ändert einen Alias für ein Cmdlet oder einen anderen Befehl.', 'Der Alias gilt nur für die aktuelle Sitzung.', [['Set-Alias -Name np -Value notepad', 'Erstellt den Alias "np" für Editor.']], ['Get-Alias', 'New-Alias']],
  'New-Alias': ['Erstellt einen neuen Alias.', 'Erstellt einen neuen Alias in der aktuellen Sitzung. Ist der Name bereits vergeben, tritt ein Fehler auf.', [['New-Alias -Name list -Value Get-ChildItem', 'Erstellt den Alias "list".']], ['Set-Alias']],
  'Where-Object': ['Wählt Objekte anhand ihrer Eigenschaftswerte aus einer Sammlung aus.', 'Where-Object filtert Objekte in der Pipeline. Es gibt zwei Schreibweisen: den Skriptblock mit $_ (alle Operatoren, mehrere Bedingungen mit -and/-or) und die Kurzschreibweise "Where-Object Eigenschaft -Operator Wert".', [['Get-Service | Where-Object Status -eq Stopped', 'Zeigt alle beendeten Dienste (Kurzschreibweise).'], ['Get-Service | Where-Object { $_.Status -eq "Stopped" -and $_.StartType -eq "Automatic" }', 'Zeigt beendete Dienste, die automatisch starten sollen.'], ['Get-ChildItem C:\\Logs | Where-Object { $_.Length -gt 1MB }', 'Zeigt alle Dateien, die größer als 1 MB sind.']], ['ForEach-Object', 'Select-Object', 'about_Comparison_Operators']],
  'ForEach-Object': ['Führt einen Vorgang für jedes Element in einer Sammlung von Eingabeobjekten aus.', 'Im Skriptblock steht $_ (oder $PSItem) für das aktuelle Objekt. Mit -Begin und -End können Befehle vor und nach der Verarbeitung ausgeführt werden.', [['1..5 | ForEach-Object { $_ * 2 }', 'Verdoppelt jede Zahl.'], ['Get-ChildItem *.log | ForEach-Object { $_.Name.ToUpper() }', 'Gibt die Dateinamen in Großbuchstaben aus.'], ['Get-Process | ForEach-Object Name', 'Gibt nur die Namen aus (Kurzschreibweise).']], ['Where-Object', 'about_Foreach']],
  'Select-Object': ['Wählt Objekte oder Objekteigenschaften aus.', 'Select-Object wählt Eigenschaften aus (-Property), begrenzt die Anzahl (-First, -Last, -Skip), entfernt Duplikate (-Unique) oder gibt die Werte einer Eigenschaft direkt aus (-ExpandProperty). Mit einer Hashtabelle @{Name=...; Expression={...}} erstellen Sie berechnete Eigenschaften.', [['Get-Process | Select-Object Name, Id, CPU', 'Zeigt nur Name, Id und CPU.'], ['Get-Process | Sort-Object CPU -Descending | Select-Object -First 5', 'Zeigt die fünf Prozesse mit der höchsten CPU-Zeit.'], ['Get-ChildItem | Select-Object Name, @{Name="KB"; Expression={[math]::Round($_.Length / 1KB, 1)}}', 'Berechnet die Größe in KB.'], ['Get-Service | Select-Object -ExpandProperty Name', 'Gibt nur die Namen als Zeichenfolgen aus.']], ['Where-Object', 'Sort-Object', 'Format-Table']],
  'Sort-Object': ['Sortiert Objekte nach Eigenschaftswerten.', 'Sortiert aufsteigend, mit -Descending absteigend. Mehrere Eigenschaften werden nacheinander berücksichtigt.', [['Get-Process | Sort-Object CPU -Descending', 'Sortiert nach CPU-Zeit, höchste zuerst.'], ['Get-ChildItem | Sort-Object Length', 'Sortiert Dateien nach Größe.']], ['Select-Object', 'Group-Object']],
  'Group-Object': ['Gruppiert Objekte, die denselben Wert für eine angegebene Eigenschaft enthalten.', 'Gibt für jede Gruppe die Anzahl (Count), den Namen und die zugehörigen Objekte (Group) aus.', [['Get-Service | Group-Object Status', 'Zählt laufende und beendete Dienste.'], ['Get-ChildItem C:\\Daten -Recurse -File | Group-Object Extension', 'Gruppiert Dateien nach Dateityp.']], ['Measure-Object', 'Sort-Object']],
  'Measure-Object': ['Berechnet die numerischen Eigenschaften von Objekten sowie die Zeichen, Wörter und Zeilen in Zeichenfolgenobjekten.', 'Zählt Objekte und berechnet mit -Sum, -Average, -Maximum und -Minimum Werte einer Eigenschaft.', [['Get-ChildItem C:\\Logs | Measure-Object', 'Zählt die Elemente.'], ['Get-ChildItem C:\\Daten -Recurse -File | Measure-Object Length -Sum', 'Berechnet die Gesamtgröße aller Dateien in Bytes.']], ['Group-Object']],
  'Get-Member': ['Ruft die Eigenschaften und Methoden von Objekten ab.', 'Get-Member zeigt den Typnamen sowie alle Eigenschaften (Property) und Methoden (Method) der Objekte in der Pipeline. So finden Sie heraus, welche Eigenschaften Sie mit Select-Object oder Where-Object verwenden können.', [['Get-Service | Get-Member', 'Zeigt alle Member eines Dienst-Objekts.'], ['Get-Process | Get-Member -MemberType Property', 'Zeigt nur die Eigenschaften.']], ['Select-Object', 'about_Objects']],
  'Format-Table': ['Formatiert die Ausgabe als Tabelle.', 'Format-Table gehört immer ans Ende der Pipeline: Danach liegen nur noch Formatierungsobjekte vor, die sich nicht mehr exportieren oder filtern lassen.', [['Get-Process | Format-Table Name, Id, CPU -AutoSize', 'Zeigt eine kompakte Tabelle.']], ['Format-List', 'Select-Object']],
  'Format-List': ['Formatiert die Ausgabe als Liste von Eigenschaften, wobei jede Eigenschaft in einer neuen Zeile angezeigt wird.', 'Mit "Format-List *" werden alle Eigenschaften angezeigt.', [['Get-Service Spooler | Format-List *', 'Zeigt alle Eigenschaften des Diensts.']], ['Format-Table']],
  'Format-Wide': ['Formatiert Objekte als breite Tabelle, in der nur eine Eigenschaft jedes Objekts angezeigt wird.', '', [['Get-ChildItem | Format-Wide -Column 3', 'Zeigt Namen in drei Spalten.']], ['Format-Table']],
  'Out-File': ['Sendet die Ausgabe an eine Datei.', 'Out-File schreibt die formatierte Textausgabe in eine Datei. In Windows PowerShell 5.1 ist die Standardcodierung UTF-16 ("Unicode"). Der Umleitungsoperator > entspricht Out-File, >> entspricht Out-File -Append.', [['Get-Service | Out-File C:\\Berichte\\dienste.txt', 'Speichert die Dienstliste als Text.'], ['Get-Date | Out-File C:\\Logs\\protokoll.txt -Append', 'Hängt das Datum an.']], ['Export-Csv', 'Set-Content', 'about_Redirection']],
  'Out-String': ['Sendet Objekte als Zeichenfolgen an den Host.', '', [['Get-Service Spooler | Out-String', 'Gibt die formatierte Ausgabe als eine Zeichenfolge zurück.']], []],
  'Out-Null': ['Löscht die Ausgabe, anstatt sie an die Konsole zu senden.', '', [['New-Item C:\\Temp\\x -ItemType Directory | Out-Null', 'Unterdrückt die Ausgabe.']], []],
  'Out-Host': ['Sendet die Ausgabe an die Befehlszeile.', '', [], []],
  'Out-Default': ['Sendet die Ausgabe an den Standardformatierer und das Standard-Ausgabe-Cmdlet.', '', [], []],
  'Out-GridView': ['Sendet die Ausgabe an eine interaktive Tabelle in einem separaten Fenster.', '', [['Get-Process | Out-GridView', 'Zeigt Prozesse in einem Fenster.']], []],
  'Write-Host': ['Schreibt benutzerdefinierte Ausgaben auf einen Host.', 'Write-Host schreibt direkt auf den Bildschirm und nicht in die Pipeline. Für Daten, die weiterverarbeitet werden sollen, verwende Write-Output.', [['Write-Host "Fertig!" -ForegroundColor Green', 'Gibt grünen Text aus.']], ['Write-Output']],
  'Write-Output': ['Sendet die angegebenen Objekte an den nächsten Befehl in der Pipeline.', 'Wenn der Befehl der letzte in der Pipeline ist, werden die Objekte in der Konsole angezeigt. In Skripten genügt es, einen Wert einfach hinzuschreiben.', [['Write-Output "Hallo"', 'Gibt "Hallo" in die Pipeline.']], ['Write-Host']],
  'Write-Warning': ['Schreibt eine Warnmeldung.', '', [['Write-Warning "Speicher fast voll"', 'Gibt "WARNUNG: Speicher fast voll" aus.']], []],
  'Write-Error': ['Schreibt ein Objekt in den Fehlerstream.', 'Erzeugt einen nicht beendenden Fehler.', [['Write-Error "Datei fehlt"', 'Gibt einen Fehler aus.']], ['about_Try_Catch_Finally']],
  'Write-Verbose': ['Schreibt Text in den ausführlichen Meldungsstream.', 'Die Meldung erscheint nur mit -Verbose oder wenn $VerbosePreference auf "Continue" steht.', [], []],
  'Write-Debug': ['Schreibt eine Debugmeldung in die Konsole.', '', [], []],
  'Write-Information': ['Gibt an, wie Windows PowerShell Informationsstreamdaten für einen Befehl behandelt.', '', [], []],
  'Read-Host': ['Liest eine Eingabezeile aus der Konsole.', 'Mit -AsSecureString wird die Eingabe als SecureString zurückgegeben und nicht angezeigt.', [['$name = Read-Host "Wie heißen Sie"', 'Fragt nach einem Namen.'], ['$pw = Read-Host "Kennwort" -AsSecureString', 'Liest ein Kennwort verdeckt ein.']], []],
  'Get-Date': ['Ruft das aktuelle Datum und die aktuelle Uhrzeit ab.', 'Mit -Format erhalten Sie eine formatierte Zeichenfolge, z. B. "yyyy-MM-dd".', [['Get-Date', 'Zeigt Datum und Uhrzeit.'], ['Get-Date -Format "yyyy-MM-dd"', 'Gibt z. B. 2026-10-22 aus.'], ['(Get-Date).AddDays(-30)', 'Datum vor 30 Tagen.']], ['New-TimeSpan']],
  'Get-Random': ['Ruft eine Zufallszahl ab oder wählt Objekte zufällig aus einer Sammlung aus.', '', [['Get-Random -Minimum 1 -Maximum 7', 'Würfelt eine Zahl von 1 bis 6.']], []],
  'Start-Sleep': ['Hält die Aktivität in einem Skript oder einer Sitzung für den angegebenen Zeitraum an.', '', [['Start-Sleep -Seconds 2', 'Wartet zwei Sekunden.']], []],
  'New-TimeSpan': ['Erstellt ein TimeSpan-Objekt.', '', [['New-TimeSpan -Days 30', 'Zeitspanne von 30 Tagen.']], ['Get-Date']],
  'Measure-Command': ['Misst die Zeit, die zum Ausführen von Skriptblöcken und Cmdlets benötigt wird.', '', [['Measure-Command { Get-ChildItem C:\\ -Recurse }', 'Misst die Laufzeit.']], []],
  'Get-History': ['Ruft eine Liste der Befehle ab, die in der aktuellen Sitzung eingegeben wurden.', '', [['Get-History', 'Zeigt den Befehlsverlauf.']], []],
  'Clear-History': ['Löscht Einträge aus dem Befehlsverlauf.', '', [], []],
  'Clear-Host': ['Löscht die Anzeige im Hostprogramm.', '', [['cls', 'Leert die Konsole.']], []],
  'Get-Host': ['Ruft ein Objekt ab, das das aktuelle Hostprogramm darstellt.', '', [], []],
  'Get-Culture': ['Ruft die aktuellen Kultureinstellungen im Betriebssystem ab.', '', [], []],
  'Get-UICulture': ['Ruft die aktuellen Benutzeroberflächen-Kultureinstellungen ab.', '', [], []],
  'Get-TimeZone': ['Ruft die aktuelle Zeitzone ab.', '', [], []],
  'Get-Variable': ['Ruft die Variablen in der aktuellen Konsole ab.', '', [['Get-Variable', 'Zeigt alle Variablen.']], ['about_Variables']],
  'Set-Variable': ['Legt den Wert einer Variablen fest. Wenn die Variable nicht vorhanden ist, wird sie erstellt.', '', [], ['about_Variables']],
  'New-Variable': ['Erstellt eine neue Variable.', '', [], []],
  'Remove-Variable': ['Löscht eine Variable und ihren Wert.', '', [['Remove-Variable x', 'Löscht $x.']], []],
  'Clear-Variable': ['Löscht den Wert einer Variablen.', '', [], []],
  'New-Object': ['Erstellt eine Instanz eines .NET- oder COM-Objekts.', '', [['New-Object PSObject -Property @{Name="A"; Wert=1}', 'Erstellt ein eigenes Objekt (kürzer: [PSCustomObject]@{...}).']], []],
  'Add-Member': ['Fügt einer Instanz eines Windows PowerShell-Objekts benutzerdefinierte Eigenschaften und Methoden hinzu.', '', [['$o | Add-Member -NotePropertyName Raum -NotePropertyValue 204', 'Fügt die Eigenschaft Raum hinzu.']], []],
  'Compare-Object': ['Vergleicht zwei Gruppen von Objekten.', 'SideIndicator "<=" bedeutet: nur im Referenzobjekt, "=>" bedeutet: nur im Differenzobjekt.', [['Compare-Object (Get-Content a.txt) (Get-Content b.txt)', 'Vergleicht zwei Dateien zeilenweise.']], []],
  'Tee-Object': ['Speichert die Befehlsausgabe in einer Datei oder Variablen und sendet sie in die Pipeline.', '', [], []],
  'Get-Unique': ['Gibt eindeutige Elemente aus einer sortierten Liste zurück.', '', [], []],
  'Invoke-Expression': ['Führt Befehle oder Ausdrücke auf dem lokalen Computer aus.', 'Vorsicht: Mit Invoke-Expression ausgeführte Zeichenfolgen können Schadcode enthalten.', [], []],
  'ConvertTo-SecureString': ['Konvertiert verschlüsselte Standardzeichenfolgen in sichere Zeichenfolgen.', 'Mit -AsPlainText -Force wird ein Klartext in einen SecureString umgewandelt, z. B. für Kennwörter in Skripten.', [['$pw = ConvertTo-SecureString "Start!2026" -AsPlainText -Force', 'Erstellt ein SecureString-Kennwort.']], ['Read-Host', 'New-LocalUser', 'New-ADUser']],
  'ConvertFrom-SecureString': ['Konvertiert eine sichere Zeichenfolge in eine verschlüsselte Standardzeichenfolge.', '', [], []],
  'Get-Credential': ['Ruft ein Anmeldeinformationsobjekt auf der Grundlage eines Benutzernamens und eines Kennworts ab.', '', [['$cred = Get-Credential KORBWERK\\azubi', 'Fragt das Kennwort in einem Dialog ab.']], []],
  'Get-Verb': ['Ruft genehmigte Windows PowerShell-Verben ab.', 'Verwenden Sie diese Verben, wenn Sie eigene Funktionen benennst.', [['Get-Verb', 'Zeigt alle genehmigten Verben.']], []],
  'Export-Csv': ['Konvertiert Objekte in eine Reihe von CSV-Zeichenfolgen und speichert die Zeichenfolgen in einer CSV-Datei.', 'In Windows PowerShell 5.1 steht ohne -NoTypeInformation eine Zeile "#TYPE ..." am Anfang. Für deutsches Excel verwenden Sie -Delimiter ";" und -Encoding UTF8 (Standard ist ASCII, Umlaute werden sonst zu "?").', [['Get-Process | Select-Object Name, Id | Export-Csv C:\\Berichte\\p.csv -NoTypeInformation -Delimiter ";" -Encoding UTF8', 'Exportiert eine Prozessliste für Excel.']], ['Import-Csv', 'ConvertTo-Csv']],
  'Import-Csv': ['Erstellt tabellarische benutzerdefinierte Objekte aus den Elementen in einer CSV-Datei.', 'Jede Zeile wird zu einem Objekt, die Spaltenüberschriften zu Eigenschaften. Alle Werte sind Zeichenfolgen.', [['Import-Csv C:\\Import\\inventar.csv -Delimiter ";"', 'Liest eine Datei mit Semikolon als Trennzeichen.'], ['Import-Csv neu.csv | ForEach-Object { $_.Name }', 'Gibt die Spalte Name aus.']], ['Export-Csv']],
  'ConvertTo-Csv': ['Konvertiert Objekte in eine Reihe von CSV-Zeichenfolgen.', '', [], ['Export-Csv']],
  'ConvertFrom-Csv': ['Konvertiert Objekteigenschaften im CSV-Format in CSV-Versionen der ursprünglichen Objekte.', '', [], []],
  'ConvertTo-Json': ['Konvertiert ein Objekt in eine Zeichenfolge im JSON-Format.', 'Standardtiefe ist 2 (-Depth).', [['Get-Service Spooler | Select-Object Name, Status | ConvertTo-Json', 'Gibt JSON aus.']], ['ConvertFrom-Json']],
  'ConvertFrom-Json': ['Konvertiert eine Zeichenfolge im JSON-Format in ein benutzerdefiniertes Objekt.', '', [['Get-Content config.json -Raw | ConvertFrom-Json', 'Liest eine JSON-Datei ein.']], []],
  'ConvertTo-Html': ['Konvertiert Microsoft .NET Framework-Objekte in HTML, das in einem Webbrowser angezeigt werden kann.', '', [['Get-Service | Select-Object Name, Status | ConvertTo-Html -Title "Dienste" | Out-File C:\\Berichte\\dienste.html', 'Erstellt einen HTML-Bericht.']], []],
  'Select-String': ['Sucht Text in Zeichenfolgen und Dateien.', 'Select-String entspricht grep: Es durchsucht Dateien oder Text nach einem Muster (regulärer Ausdruck). Groß-/Kleinschreibung wird standardmäßig ignoriert.', [['Select-String -Path C:\\Logs\\*.log -Pattern "ERROR"', 'Findet alle Zeilen mit ERROR.'], ['Get-Content app.log | Select-String "Timeout"', 'Durchsucht Text aus der Pipeline.']], ['Where-Object', 'about_Regular_Expressions']],
  'Get-Module': ['Ruft die Module ab, die in die aktuelle Sitzung importiert wurden oder importiert werden können.', 'Mit -ListAvailable werden alle installierten Module angezeigt.', [['Get-Module -ListAvailable', 'Zeigt alle installierten Module.']], ['Import-Module', 'Install-Module']],
  'Import-Module': ['Fügt der aktuellen Sitzung Module hinzu.', 'Module werden beim ersten Aufruf eines Befehls automatisch geladen.', [['Import-Module ActiveDirectory', 'Lädt das AD-Modul.']], []],
  'Remove-Module': ['Entfernt Module aus der aktuellen Sitzung.', '', [], []],
  'Get-Location': ['Ruft Informationen zum aktuellen Arbeitsverzeichnis ab.', '', [['Get-Location', 'Zeigt den aktuellen Pfad (wie pwd).']], ['Set-Location']],
  'Set-Location': ['Legt den aktuellen Arbeitsspeicherort auf einen angegebenen Speicherort fest.', 'Funktioniert für Ordner, aber auch für andere Laufwerke wie HKLM: oder Env:.', [['Set-Location C:\\Freigaben', 'Wechselt in den Ordner.'], ['cd ..', 'Wechselt eine Ebene nach oben.'], ['Set-Location HKLM:\\SOFTWARE', 'Wechselt in die Registry.']], ['Get-Location', 'about_Providers']],
  'Push-Location': ['Fügt den aktuellen Speicherort am Anfang einer Speicherortliste ("Stapel") hinzu.', '', [], []],
  'Pop-Location': ['Ändert den aktuellen Speicherort in den Speicherort, der zuletzt per Push-Location gespeichert wurde.', '', [], []],
  'Get-ChildItem': ['Ruft die Elemente und untergeordneten Elemente an mindestens einem angegebenen Speicherort ab.', 'Get-ChildItem listet den Inhalt eines Ordners auf (Aliase: dir, ls, gci). Mit -Recurse werden Unterordner durchsucht, mit -Force auch versteckte Dateien angezeigt, mit -Filter nach Namen gefiltert.', [['Get-ChildItem C:\\Windows -Filter *.exe', 'Zeigt alle .exe-Dateien.'], ['Get-ChildItem C:\\Freigaben -Recurse -File', 'Zeigt alle Dateien in allen Unterordnern.'], ['Get-ChildItem -Force', 'Zeigt auch versteckte Elemente.'], ['Get-ChildItem HKLM:\\SOFTWARE', 'Zeigt Registrierungsschlüssel.']], ['Get-Item', 'Set-Location', 'about_Providers']],
  'Get-Item': ['Ruft das Element am angegebenen Speicherort ab.', 'Im Gegensatz zu Get-ChildItem liefert Get-Item das Element selbst, nicht seinen Inhalt.', [['Get-Item C:\\Windows', 'Liefert den Ordner selbst.'], ['Get-Item .\\skript.ps1 -Stream *', 'Zeigt Datenströme wie Zone.Identifier.']], ['Get-ChildItem']],
  'New-Item': ['Erstellt ein neues Element.', 'Erstellt Dateien (-ItemType File) oder Ordner (-ItemType Directory). Mit -Value wird der Inhalt einer Datei festgelegt.', [['New-Item -Path C:\\Freigaben\\Projekte -ItemType Directory', 'Erstellt einen Ordner.'], ['New-Item C:\\Temp\\notiz.txt -ItemType File -Value "Hallo"', 'Erstellt eine Textdatei mit Inhalt.']], ['Remove-Item', 'Set-Content']],
  'Remove-Item': ['Löscht die angegebenen Elemente.', 'Ordner mit Inhalt werden nur mit -Recurse ohne Rückfrage gelöscht. Versteckte oder schreibgeschützte Dateien benötigen -Force. Mit -WhatIf sehen Sie vorher, was passieren würde.', [['Remove-Item C:\\Temp\\alt.txt', 'Löscht eine Datei.'], ['Remove-Item C:\\Temp\\alt -Recurse', 'Löscht einen Ordner mit Inhalt.'], ['Remove-Item C:\\Temp\\*.tmp -WhatIf', 'Zeigt, was gelöscht würde.']], ['New-Item']],
  'Copy-Item': ['Kopiert ein Element von einem Speicherort an einen anderen.', 'Achtung: Ein Ordner wird ohne -Recurse nur leer kopiert.', [['Copy-Item C:\\Vorlagen\\*.docx C:\\Projekte', 'Kopiert alle Word-Dateien.'], ['Copy-Item C:\\Daten C:\\Backup\\Daten -Recurse', 'Kopiert einen Ordner samt Inhalt.']], ['Move-Item']],
  'Move-Item': ['Verschiebt ein Element von einem Speicherort an einen anderen.', '', [['Move-Item C:\\Logs\\alt.log C:\\Logs\\Archiv', 'Verschiebt eine Datei.']], ['Copy-Item', 'Rename-Item']],
  'Rename-Item': ['Benennt ein Element in einem Windows PowerShell-Anbieternamespace um.', 'Mit einem Skriptblock für -NewName können viele Dateien auf einmal umbenannt werden.', [['Rename-Item C:\\Temp\\a.txt b.txt', 'Benennt a.txt in b.txt um.'], ['Get-ChildItem *.jpeg | Rename-Item -NewName { $_.Name -replace "\\.jpeg$", ".jpg" }', 'Ändert die Endung vieler Dateien.']], ['Move-Item']],
  'Get-Content': ['Ruft den Inhalt des Elements am angegebenen Speicherort ab.', 'Gibt eine Textdatei Zeile für Zeile aus (Aliase: cat, type, gc). -Tail zeigt die letzten Zeilen, -TotalCount die ersten.', [['Get-Content C:\\Logs\\app.log -Tail 10', 'Zeigt die letzten zehn Zeilen.'], ['Get-Content .\\liste.txt | Measure-Object -Line', 'Zählt die Zeilen.']], ['Set-Content', 'Add-Content']],
  'Set-Content': ['Schreibt neuen Inhalt oder ersetzt vorhandenen Inhalt in einer Datei.', '', [['Set-Content C:\\Temp\\info.txt "Erste Zeile"', 'Überschreibt die Datei.']], ['Add-Content', 'Get-Content']],
  'Add-Content': ['Fügt den angegebenen Elementen Inhalt hinzu, z. B. Wörter an eine Datei.', '', [['Add-Content C:\\Logs\\protokoll.txt "Backup geprüft"', 'Hängt eine Zeile an.']], ['Set-Content']],
  'Clear-Content': ['Löscht den Inhalt eines Elements, aber nicht das Element.', '', [], []],
  'Test-Path': ['Bestimmt, ob alle Elemente eines Pfads vorhanden sind.', 'Gibt True oder False zurück – ideal für if-Abfragen in Skripten.', [['Test-Path C:\\Berichte', 'Prüft, ob der Ordner existiert.'], ['if (-not (Test-Path C:\\Temp)) { New-Item C:\\Temp -ItemType Directory }', 'Legt den Ordner nur bei Bedarf an.']], []],
  'Resolve-Path': ['Löst die Platzhalterzeichen in einem Pfad auf und zeigt den Inhalt des Pfads an.', '', [], []],
  'Split-Path': ['Gibt den angegebenen Teil eines Pfads zurück.', '', [['Split-Path C:\\Daten\\liste.txt -Leaf', 'Gibt liste.txt zurück.']], ['Join-Path']],
  'Join-Path': ['Kombiniert einen Pfad und einen untergeordneten Pfad in einem einzelnen Pfad.', '', [['Join-Path C:\\Berichte "dienste.csv"', 'Ergibt C:\\Berichte\\dienste.csv.']], ['Split-Path']],
  'Get-ItemProperty': ['Ruft die Eigenschaften eines angegebenen Elements ab.', 'In der Registry liefert Get-ItemProperty die Werte eines Schlüssels.', [['Get-ItemProperty HKLM:\\SOFTWARE\\Korbwerk\\Backup', 'Zeigt die Registrierungswerte.']], ['Set-ItemProperty', 'about_Providers']],
  'Get-ItemPropertyValue': ['Ruft den Wert für eine oder mehrere Eigenschaften eines angegebenen Elements ab.', '', [['Get-ItemPropertyValue HKLM:\\SOFTWARE\\Korbwerk\\Backup -Name Ziel', 'Liefert nur den Wert.']], []],
  'Set-ItemProperty': ['Erstellt oder ändert den Wert einer Eigenschaft eines Elements.', '', [['Set-ItemProperty HKCU:\\Software\\Test -Name Modus -Value 2', 'Ändert einen Registrierungswert.']], ['New-ItemProperty']],
  'New-ItemProperty': ['Erstellt eine neue Eigenschaft für ein Element und legt den Wert fest.', '', [['New-ItemProperty HKCU:\\Software\\Test -Name Aktiv -Value 1 -PropertyType DWord', 'Erstellt einen DWORD-Wert.']], []],
  'Remove-ItemProperty': ['Löscht die Eigenschaft und ihren Wert aus einem Element.', '', [], []],
  'Get-PSDrive': ['Ruft Laufwerke in der aktuellen Sitzung ab.', 'Neben Festplatten gibt es Laufwerke für die Registry (HKLM:, HKCU:), Umgebungsvariablen (Env:) und mehr.', [['Get-PSDrive', 'Zeigt alle Laufwerke mit belegtem und freiem Speicher.']], ['New-PSDrive', 'about_Providers']],
  'New-PSDrive': ['Erstellt temporäre und permanente zugeordnete Netzlaufwerke.', 'Mit -Persist entsteht ein echtes Netzlaufwerk (wie im Explorer), der Name muss dann ein Buchstabe sein.', [['New-PSDrive -Name P -PSProvider FileSystem -Root \\\\KORB-SRV02\\Projekte -Persist', 'Verbindet die Freigabe als Laufwerk P:.']], ['Remove-PSDrive', 'Get-PSDrive']],
  'Remove-PSDrive': ['Löscht temporäre Windows PowerShell-Laufwerke und trennt zugeordnete Netzlaufwerke.', '', [], []],
  'Get-PSProvider': ['Ruft Informationen zum angegebenen Windows PowerShell-Anbieter ab.', '', [], ['about_Providers']],
  'Compress-Archive': ['Erstellt ein komprimiertes Archiv (ZIP-Datei) aus angegebenen Dateien und Ordnern.', 'Wenn Sie einen Ordner angeben, wird der Ordner selbst ins Archiv gepackt. Mit "Ordner\\*" landet nur sein Inhalt im Archiv.', [['Compress-Archive -Path C:\\Freigaben\\Projekte -DestinationPath C:\\Backup\\projekte.zip', 'Packt den Ordner in ein ZIP.'], ['Compress-Archive C:\\Logs\\*.log C:\\Backup\\logs.zip -Update', 'Ergänzt ein vorhandenes Archiv.']], ['Expand-Archive']],
  'Expand-Archive': ['Extrahiert Dateien aus einem angegebenen Archiv (ZIP-Datei).', '', [['Expand-Archive C:\\Backup\\projekte.zip -DestinationPath C:\\Wiederherstellung', 'Entpackt das Archiv.']], ['Compress-Archive']],
  'Get-FileHash': ['Berechnet den Hashwert für eine Datei mithilfe eines angegebenen Hashalgorithmus.', 'Standard ist SHA256. So prüfen Sie, ob eine Datei unverändert ist.', [['Get-FileHash C:\\Downloads\\setup.exe', 'Zeigt den SHA256-Hash.']], []],
  'Unblock-File': ['Gibt Dateien frei, die aus dem Internet heruntergeladen wurden.', 'Entfernt die Markierung Zone.Identifier. Danach blockiert die Ausführungsrichtlinie RemoteSigned das Skript nicht mehr – prüfe das Skript aber vorher!', [['Unblock-File C:\\Skripte\\aufraeumen.ps1', 'Gibt das Skript frei.']], ['about_Execution_Policies']],
  'Get-Acl': ['Ruft die Sicherheitsbeschreibung für eine Ressource (z. B. eine Datei oder einen Registrierungsschlüssel) ab.', 'Die Eigenschaft Access enthält die einzelnen Berechtigungseinträge (ACEs).', [['Get-Acl C:\\Freigaben\\Buchhaltung | Format-List', 'Zeigt Besitzer und Berechtigungen.'], ['(Get-Acl C:\\Freigaben\\Buchhaltung).Access', 'Zeigt jeden Berechtigungseintrag einzeln.']], ['Set-Acl', 'icacls']],
  'Set-Acl': ['Ändert die Sicherheitsbeschreibung eines angegebenen Elements, z. B. einer Datei oder eines Registrierungsschlüssels.', 'Typischer Ablauf: ACL holen, Regel mit SetAccessRule/AddAccessRule ändern, mit Set-Acl zurückschreiben. Erfordert Administratorrechte.', [['$acl = Get-Acl C:\\Daten\n$r = New-Object System.Security.AccessControl.FileSystemAccessRule("KORBWERK\\GG-Vertrieb","Modify","ContainerInherit,ObjectInherit","None","Allow")\n$acl.SetAccessRule($r)\nSet-Acl C:\\Daten $acl', 'Gewährt einer Gruppe Ändern-Rechte.']], ['Get-Acl']],
  'Get-ExecutionPolicy': ['Ruft die Ausführungsrichtlinien für die aktuelle Sitzung ab.', 'Mit -List sehen Sie alle Bereiche. Die effektive Richtlinie ergibt sich aus dem spezifischsten gesetzten Bereich.', [['Get-ExecutionPolicy -List', 'Zeigt alle Bereiche.']], ['Set-ExecutionPolicy', 'about_Execution_Policies']],
  'Set-ExecutionPolicy': ['Ändert die Benutzereinstellung für die Windows PowerShell-Ausführungsrichtlinie.', 'Für den Bereich LocalMachine sind Administratorrechte nötig. Auf Windows Server ist RemoteSigned voreingestellt.', [['Set-ExecutionPolicy RemoteSigned -Scope LocalMachine', 'Setzt die Richtlinie für alle Benutzer (als Administrator).'], ['Set-ExecutionPolicy Bypass -Scope Process', 'Gilt nur für das aktuelle Fenster.']], ['Get-ExecutionPolicy', 'about_Execution_Policies']],
  'Get-Process': ['Ruft die Prozesse ab, die auf dem lokalen Computer oder einem Remotecomputer ausgeführt werden.', 'Mit -IncludeUserName (nur als Administrator) sehen Sie, wem ein Prozess gehört.', [['Get-Process', 'Zeigt alle Prozesse.'], ['Get-Process notepad', 'Zeigt alle Editor-Prozesse.'], ['Get-Process | Sort-Object WS -Descending | Select-Object -First 5', 'Zeigt die fünf Prozesse mit dem meisten Arbeitsspeicher.']], ['Stop-Process', 'Start-Process']],
  'Stop-Process': ['Beendet mindestens einen ausgeführten Prozess.', 'Prozesse anderer Benutzer können Sie nur als Administrator beenden; dabei fragt Stop-Process ohne -Force nach.', [['Stop-Process -Name notepad', 'Beendet alle Editor-Prozesse.'], ['Stop-Process -Id 4711 -Force', 'Beendet Prozess 4711 ohne Rückfrage.'], ['Get-Process KalleSync | Stop-Process', 'Beendet Prozesse über die Pipeline.']], ['Get-Process']],
  'Start-Process': ['Startet mindestens einen Prozess auf dem lokalen Computer.', 'Mit -Verb RunAs wird das Programm mit Administratorrechten gestartet (Benutzerkontensteuerung).', [['Start-Process notepad', 'Startet den Editor.'], ['Start-Process powershell -Verb RunAs', 'Öffnet eine PowerShell als Administrator.']], ['Stop-Process']],
  'Wait-Process': ['Wartet, bis die Prozesse beendet sind, bevor weitere Eingaben akzeptiert werden.', '', [], []],
  'Get-Service': ['Ruft die Dienste auf einem lokalen oder Remotecomputer ab.', 'Die Eigenschaft Status zeigt, ob ein Dienst läuft, StartType, wie er startet.', [['Get-Service', 'Zeigt alle Dienste.'], ['Get-Service Spooler', 'Zeigt die Druckwarteschlange.'], ['Get-Service | Where-Object StartType -eq Automatic', 'Zeigt automatisch startende Dienste.']], ['Start-Service', 'Stop-Service', 'Set-Service']],
  'Start-Service': ['Startet einen oder mehrere beendete Dienste.', 'Erfordert Administratorrechte.', [['Start-Service Spooler', 'Startet die Druckwarteschlange.']], ['Stop-Service', 'Restart-Service']],
  'Stop-Service': ['Beendet einen oder mehrere ausgeführte Dienste.', 'Erfordert Administratorrechte. Hängen andere Dienste ab, ist -Force nötig.', [['Stop-Service Spooler', 'Beendet die Druckwarteschlange.']], ['Start-Service']],
  'Restart-Service': ['Beendet einen Dienst und startet ihn dann erneut.', 'Erfordert Administratorrechte.', [['Restart-Service Spooler', 'Startet die Druckwarteschlange neu.']], []],
  'Suspend-Service': ['Hält einen oder mehrere ausgeführte Dienste an.', '', [], []],
  'Resume-Service': ['Setzt einen oder mehrere angehaltene Dienste fort.', '', [], []],
  'Set-Service': ['Startet, beendet und hält einen Dienst an und ändert seine Eigenschaften.', 'Mit -StartupType legen Sie fest, ob ein Dienst automatisch, manuell oder gar nicht startet.', [['Set-Service KalleBackup -StartupType Disabled', 'Deaktiviert einen Dienst.']], ['Get-Service']],
  'New-Service': ['Erstellt einen neuen Windows-Dienst.', '', [], []],
  'Get-EventLog': ['Ruft die Ereignisse in einem Ereignisprotokoll auf dem lokalen Computer oder auf Remotecomputern ab.', 'Das klassische Cmdlet für die Protokolle System, Application und Security (nur als Administrator).', [['Get-EventLog -LogName System -EntryType Error -Newest 10', 'Zeigt die zehn neuesten Fehler.'], ['Get-EventLog System -Source "Service Control Manager" -After (Get-Date).AddDays(-1)', 'Ereignisse der Dienstverwaltung der letzten 24 Stunden.']], ['Get-WinEvent']],
  'Get-WinEvent': ['Ruft Ereignisse aus Ereignisprotokollen und Ereignisablaufverfolgungs-Protokolldateien auf lokalen Computern und Remotecomputern ab.', 'Mit -FilterHashtable filtert das System die Ereignisse schon beim Lesen (schneller). Level 2 = Fehler, 3 = Warnung.', [['Get-WinEvent -LogName System -MaxEvents 20', 'Zeigt die 20 neuesten Ereignisse.'], ['Get-WinEvent -FilterHashtable @{LogName="System"; Level=2}', 'Zeigt alle Fehler im Systemprotokoll.']], ['Get-EventLog']],
  'Clear-EventLog': ['Löscht alle Einträge aus angegebenen Ereignisprotokollen.', '', [], []],
  'Write-EventLog': ['Schreibt ein Ereignis in ein Ereignisprotokoll.', '', [], []],
  'Get-Volume': ['Ruft das angegebene Volume-Objekt oder alle Volume-Objekte ab.', 'Size und SizeRemaining enthalten Bytes; die Anzeige rechnet in GB um.', [['Get-Volume', 'Zeigt alle Volumes.'], ['Get-Volume C | Select-Object @{n="Frei GB"; e={[math]::Round($_.SizeRemaining/1GB,2)}}', 'Berechnet den freien Speicher.']], ['Get-PSDrive']],
  'Get-Disk': ['Ruft ein oder mehrere Datenträgerobjekte ab.', '', [], []],
  'Get-CimInstance': ['Ruft die CIM-Instanzen einer Klasse von einem CIM-Server ab.', 'CIM/WMI liefert Systeminformationen, z. B. Win32_OperatingSystem, Win32_LogicalDisk oder Win32_BIOS – auch von Remotecomputern.', [['Get-CimInstance Win32_OperatingSystem', 'Zeigt Betriebssysteminformationen.'], ['Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3"', 'Zeigt lokale Festplatten.']], ['Get-WmiObject']],
  'Get-WmiObject': ['Ruft Instanzen von WMI-Klassen ab (veraltet, besser Get-CimInstance).', '', [], ['Get-CimInstance']],
  'Get-ComputerInfo': ['Ruft eine konsolidierte Ansicht der System- und Betriebssystemeigenschaften ab.', '', [['Get-ComputerInfo -Property Os*', 'Zeigt alle Betriebssystem-Eigenschaften.']], []],
  'Get-HotFix': ['Ruft die auf lokalen Computern oder Remotecomputern installierten Hotfixes ab.', '', [['Get-HotFix', 'Zeigt installierte Updates.']], []],
  'Restart-Computer': ['Startet das Betriebssystem auf lokalen Computern und Remotecomputern neu.', '', [['Restart-Computer -WhatIf', 'Zeigt nur, was passieren würde.']], []],
  'Stop-Computer': ['Fährt lokale Computer und Remotecomputer herunter.', '', [], []],
  'Get-LocalUser': ['Ruft lokale Benutzerkonten ab.', 'Funktioniert nicht auf Domänencontrollern (dort gibt es keine lokalen Konten).', [['Get-LocalUser', 'Zeigt alle lokalen Benutzer.'], ['Get-LocalUser | Where-Object Enabled', 'Zeigt nur aktivierte Konten.']], ['New-LocalUser', 'Get-LocalGroup']],
  'New-LocalUser': ['Erstellt ein lokales Benutzerkonto.', 'Erfordert Administratorrechte. Das Kennwort muss ein SecureString sein und die Kennwortrichtlinie erfüllen.', [['$pw = Read-Host "Kennwort" -AsSecureString\nNew-LocalUser -Name scanner -Password $pw -Description "Konto für Scanner"', 'Erstellt ein Konto mit verdeckt eingegebenem Kennwort.']], ['Get-LocalUser', 'Add-LocalGroupMember']],
  'Set-LocalUser': ['Ändert ein lokales Benutzerkonto.', '', [['Set-LocalUser scanner -Description "Scanner Raum 204"', 'Ändert die Beschreibung.']], []],
  'Enable-LocalUser': ['Aktiviert ein lokales Benutzerkonto.', '', [], []],
  'Disable-LocalUser': ['Deaktiviert ein lokales Benutzerkonto.', '', [['Disable-LocalUser kalle', 'Deaktiviert das Konto kalle.']], []],
  'Remove-LocalUser': ['Löscht lokale Benutzerkonten.', '', [], []],
  'Rename-LocalUser': ['Benennt ein lokales Benutzerkonto um.', '', [], []],
  'Get-LocalGroup': ['Ruft die lokalen Sicherheitsgruppen ab.', '', [['Get-LocalGroup', 'Zeigt alle lokalen Gruppen.']], ['Get-LocalGroupMember']],
  'New-LocalGroup': ['Erstellt eine lokale Sicherheitsgruppe.', '', [], []],
  'Get-LocalGroupMember': ['Ruft Mitglieder einer lokalen Gruppe ab.', '', [['Get-LocalGroupMember Administratoren', 'Zeigt, wer lokaler Administrator ist.']], ['Add-LocalGroupMember']],
  'Add-LocalGroupMember': ['Fügt einer lokalen Gruppe Mitglieder hinzu.', 'Mitglieder können lokale Konten oder Domänenkonten (DOMÄNE\\Name) sein.', [['Add-LocalGroupMember -Group Remotedesktopbenutzer -Member scanner', 'Fügt das Konto der Gruppe hinzu.']], ['Remove-LocalGroupMember']],
  'Remove-LocalGroupMember': ['Entfernt Mitglieder aus einer lokalen Gruppe.', '', [['Remove-LocalGroupMember -Group Administratoren -Member kalle', 'Entzieht kalle die Administratorrechte.']], []],
  'Get-SmbShare': ['Ruft die SMB-Freigaben (Netzwerkfreigaben) des Computers ab.', 'Freigaben mit $ am Ende sind versteckt. Erfordert Administratorrechte.', [['Get-SmbShare', 'Zeigt alle Freigaben.']], ['New-SmbShare', 'Get-SmbShareAccess']],
  'New-SmbShare': ['Erstellt eine SMB-Freigabe.', 'Die Freigabeberechtigungen (Full/Change/Read) wirken zusätzlich zu den NTFS-Rechten – es gilt das strengere Recht.', [['New-SmbShare -Name Projekte -Path C:\\Freigaben\\Projekte -ChangeAccess "KORBWERK\\Domänen-Benutzer"', 'Gibt einen Ordner frei.']], ['Remove-SmbShare', 'Grant-SmbShareAccess']],
  'Remove-SmbShare': ['Löscht die angegebene SMB-Freigabe.', '', [], []],
  'Get-SmbShareAccess': ['Ruft die Zugriffssteuerungsliste (ACL) der SMB-Freigabe ab.', '', [['Get-SmbShareAccess Daten', 'Zeigt die Freigabeberechtigungen.']], []],
  'Grant-SmbShareAccess': ['Fügt der Sicherheitsbeschreibung der SMB-Freigabe einen Zulassungseintrag hinzu.', '', [], []],
  'Revoke-SmbShareAccess': ['Entfernt alle Zulassungseinträge für das Konto aus der Sicherheitsbeschreibung der SMB-Freigabe.', '', [], []],
  'Find-Module': ['Sucht Module in einem Repository wie der PowerShell Gallery.', '', [['Find-Module PSWindowsUpdate', 'Sucht das Modul in der Gallery.']], ['Install-Module']],
  'Install-Module': ['Lädt ein oder mehrere Module aus einem Online-Repository herunter und installiert sie.', 'In Windows PowerShell 5.1 ist der Standardbereich AllUsers (Administratorrechte nötig). Mit -Scope CurrentUser installieren Sie nur für sich selbst.', [['Install-Module PSWindowsUpdate -Scope CurrentUser', 'Installiert das Modul für den aktuellen Benutzer.']], ['Find-Module', 'Get-InstalledModule']],
  'Get-InstalledModule': ['Ruft eine Liste der Module auf dem Computer ab, die mit PowerShellGet installiert wurden.', '', [], []],
  'Uninstall-Module': ['Deinstalliert ein Modul.', '', [], []],
  'Get-PSRepository': ['Ruft die registrierten PowerShell-Repositorys ab.', '', [], []],
  'Set-PSRepository': ['Legt Werte für ein registriertes Repository fest.', '', [['Set-PSRepository PSGallery -InstallationPolicy Trusted', 'Vertraut der PowerShell Gallery.']], []],
  'Get-PackageProvider': ['Gibt eine Liste der Paketanbieter zurück.', '', [], []],
  'Install-PackageProvider': ['Installiert einen oder mehrere Paketanbieter.', '', [['Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force', 'Installiert den NuGet-Anbieter.']], []],
  'Get-WindowsUpdate': ['Ruft die Liste verfügbarer Windows-Updates ab (Modul PSWindowsUpdate).', 'Erfordert Administratorrechte. Mit -Install -AcceptAll werden die Updates installiert.', [['Get-WindowsUpdate', 'Zeigt verfügbare Updates.']], ['Get-WUHistory']],
  'Get-WUHistory': ['Ruft den Verlauf installierter Updates ab (Modul PSWindowsUpdate).', '', [], []],
  'Get-NetAdapter': ['Ruft die grundlegenden Eigenschaften des Netzwerkadapters ab.', '', [['Get-NetAdapter', 'Zeigt alle Netzwerkadapter mit Status und MAC-Adresse.']], ['Get-NetIPConfiguration']],
  'Enable-NetAdapter': ['Aktiviert einen Netzwerkadapter.', '', [], []],
  'Disable-NetAdapter': ['Deaktiviert einen Netzwerkadapter.', 'Achtung: Bei einer Remoteverbindung trennen Sie sich damit selbst.', [], []],
  'Restart-NetAdapter': ['Startet einen Netzwerkadapter neu.', '', [], []],
  'Rename-NetAdapter': ['Benennt einen Netzwerkadapter um.', '', [['Rename-NetAdapter "Ethernet 2" -NewName LAN', 'Benennt den Adapter um.']], []],
  'Get-NetIPAddress': ['Ruft die IP-Adresskonfiguration ab.', '', [['Get-NetIPAddress -AddressFamily IPv4', 'Zeigt alle IPv4-Adressen.']], ['New-NetIPAddress']],
  'New-NetIPAddress': ['Erstellt eine IP-Adresse und deren Konfiguration und weist sie zu.', 'Die Einstellung wird dauerhaft gespeichert (ActiveStore und PersistentStore). Bei aktivem DHCP muss DHCP zuerst mit Set-NetIPInterface abgeschaltet werden. Ein bereits gesetztes Standardgateway muss vorher mit Remove-NetRoute entfernt werden.', [['New-NetIPAddress -InterfaceAlias Ethernet -IPAddress 10.20.0.12 -PrefixLength 24 -DefaultGateway 10.20.0.1', 'Setzt eine statische Adresse mit Gateway.']], ['Remove-NetIPAddress', 'Set-NetIPInterface', 'Set-DnsClientServerAddress']],
  'Remove-NetIPAddress': ['Entfernt eine IP-Adresse und deren Konfiguration.', 'Das Standardgateway bleibt dabei erhalten (Remove-NetRoute verwenden).', [['Remove-NetIPAddress -IPAddress 10.20.0.99 -Confirm:$false', 'Entfernt die Adresse ohne Rückfrage.']], ['Remove-NetRoute']],
  'Set-NetIPAddress': ['Ändert die Konfiguration einer IP-Adresse.', '', [], []],
  'Get-NetIPInterface': ['Ruft eine IP-Schnittstelle ab (u. a. DHCP-Status und Metrik).', '', [['Get-NetIPInterface -AddressFamily IPv4', 'Zeigt, ob DHCP aktiv ist.']], ['Set-NetIPInterface']],
  'Set-NetIPInterface': ['Ändert eine IP-Schnittstelle, z. B. DHCP ein- oder ausschalten.', '', [['Set-NetIPInterface -InterfaceAlias Ethernet -Dhcp Disabled', 'Schaltet DHCP ab.']], []],
  'Get-NetIPConfiguration': ['Ruft die IP-Netzwerkkonfiguration ab (Adresse, Gateway, DNS).', 'Die PowerShell-Alternative zu ipconfig.', [['Get-NetIPConfiguration', 'Zeigt die Konfiguration aller verbundenen Adapter.'], ['Get-NetIPConfiguration -Detailed', 'Zeigt mehr Details.']], ['Get-NetIPAddress']],
  'Get-NetRoute': ['Ruft die IP-Routen aus der IP-Routingtabelle ab.', 'Die Route 0.0.0.0/0 ist die Standardroute (Standardgateway).', [['Get-NetRoute -DestinationPrefix 0.0.0.0/0', 'Zeigt das Standardgateway.']], ['New-NetRoute', 'Remove-NetRoute']],
  'New-NetRoute': ['Erstellt eine Route in der IP-Routingtabelle.', '', [], []],
  'Remove-NetRoute': ['Löscht IP-Routen aus der IP-Routingtabelle.', '', [['Remove-NetRoute -DestinationPrefix 0.0.0.0/0 -Confirm:$false', 'Entfernt das Standardgateway.']], []],
  'Get-DnsClientServerAddress': ['Ruft die DNS-Serveradressen ab, die den Schnittstellen zugeordnet sind.', '', [['Get-DnsClientServerAddress -AddressFamily IPv4', 'Zeigt die DNS-Server.']], ['Set-DnsClientServerAddress']],
  'Set-DnsClientServerAddress': ['Legt die DNS-Serveradressen für eine Schnittstelle fest.', '', [['Set-DnsClientServerAddress -InterfaceAlias Ethernet -ServerAddresses 10.20.0.10', 'Setzt den DNS-Server.']], ['Resolve-DnsName']],
  'Clear-DnsClientCache': ['Löscht den DNS-Clientcache (wie ipconfig /flushdns).', '', [], []],
  'Get-DnsClientCache': ['Ruft den Inhalt des DNS-Clientcaches ab.', '', [], []],
  'Get-NetConnectionProfile': ['Ruft ein Verbindungsprofil ab (z. B. Domänennetzwerk).', '', [], []],
  'Test-Connection': ['Sendet ICMP-Echoanforderungspakete ("Pings") an einen oder mehrere Computer.', 'Mit -Quiet erhalten Sie nur True oder False. In Windows PowerShell 5.1 lautet die Fehlermeldung bei Misserfolg oft "Fehler aufgrund fehlender Ressourcen".', [['Test-Connection 10.20.0.1', 'Pingt das Gateway viermal.'], ['Test-Connection korb-dc01 -Count 1 -Quiet', 'Liefert True oder False.']], ['Test-NetConnection', 'ping']],
  'Test-NetConnection': ['Zeigt Diagnoseinformationen für eine Verbindung an (Ping, TCP-Port, Route).', 'Mit -Port prüfen Sie, ob ein bestimmter TCP-Port erreichbar ist.', [['Test-NetConnection korb-app01 -Port 443', 'Prüft, ob HTTPS erreichbar ist.'], ['Test-NetConnection 10.20.0.1', 'Pingt das Gateway.']], ['Test-Connection']],
  'Resolve-DnsName': ['Führt eine DNS-Namensauflösung für den angegebenen Namen aus.', '', [['Resolve-DnsName korb-dc01.korbwerk.intern', 'Fragt den A-Eintrag ab.'], ['Resolve-DnsName korbwerk.de -Type MX', 'Fragt den Mailserver ab.']], ['nslookup']],
  'Get-NetTCPConnection': ['Ruft TCP-Verbindungen ab.', '', [['Get-NetTCPConnection -State Listen', 'Zeigt alle offenen (lauschenden) Ports.']], []],
  'Get-NetFirewallRule': ['Ruft Firewallregeln vom Zielcomputer ab.', 'Ports und Protokolle zeigt Get-NetFirewallPortFilter.', [['Get-NetFirewallRule -DisplayGroup "Datei- und Druckerfreigabe"', 'Zeigt die Regeln einer Gruppe.'], ['Get-NetFirewallRule -Enabled True -Direction Inbound', 'Zeigt aktive Regeln für eingehenden Verkehr.']], ['New-NetFirewallRule', 'Enable-NetFirewallRule']],
  'New-NetFirewallRule': ['Erstellt eine neue Firewallregel für eingehenden oder ausgehenden Datenverkehr.', 'Erfordert Administratorrechte.', [['New-NetFirewallRule -DisplayName "Ping erlauben" -Direction Inbound -Protocol ICMPv4 -IcmpType 8 -Action Allow', 'Erlaubt eingehende Pings.'], ['New-NetFirewallRule -DisplayName "Web" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow', 'Öffnet TCP-Port 443.']], ['Get-NetFirewallRule', 'Remove-NetFirewallRule']],
  'Set-NetFirewallRule': ['Ändert vorhandene Firewallregeln.', '', [], []],
  'Enable-NetFirewallRule': ['Aktiviert eine zuvor deaktivierte Firewallregel.', '', [['Enable-NetFirewallRule -Name FPS-ICMP4-ERQ-In', 'Aktiviert die vordefinierte Ping-Regel.']], []],
  'Disable-NetFirewallRule': ['Deaktiviert eine Firewallregel.', '', [], []],
  'Remove-NetFirewallRule': ['Löscht eine Firewallregel.', '', [], []],
  'Get-NetFirewallPortFilter': ['Ruft die Port- und Protokollfilter von Firewallregeln ab.', '', [['Get-NetFirewallRule -DisplayName "Ping erlauben" | Get-NetFirewallPortFilter', 'Zeigt Protokoll und ICMP-Typ.']], []],
  'Get-NetFirewallAddressFilter': ['Ruft die Adressfilter von Firewallregeln ab.', '', [], []],
  'Get-NetFirewallProfile': ['Zeigt die Einstellungen der Firewallprofile Domäne, Privat und Öffentlich an.', '', [], []],
  'Set-NetFirewallProfile': ['Konfiguriert Einstellungen der Firewallprofile.', '', [], []],
  'Get-ADUser': ['Ruft einen oder mehrere Active Directory-Benutzer ab.', 'Entweder -Identity (SamAccountName, DN, GUID oder SID) oder -Filter ist nötig. Ohne -Properties werden nur Standardeigenschaften geladen – Department, Title usw. müssen angefordert werden.', [['Get-ADUser mhofmann -Properties Department, Title', 'Zeigt einen Benutzer mit Abteilung und Titel.'], ['Get-ADUser -Filter "Department -eq \'Vertrieb\'"', 'Alle Benutzer der Abteilung Vertrieb.'], ['Get-ADUser -Filter * -SearchBase "OU=Mitarbeiter,OU=Korbwerk,DC=korbwerk,DC=intern"', 'Alle Benutzer einer OU.']], ['New-ADUser', 'Set-ADUser', 'Search-ADAccount']],
  'New-ADUser': ['Erstellt einen Active Directory-Benutzer.', 'Ohne -Enabled $true und ohne Kennwort wird das Konto deaktiviert angelegt. Die Spaltennamen einer CSV-Datei können direkt als Parameter dienen: Import-Csv neu.csv | New-ADUser.', [['New-ADUser -Name "Lena Krause" -GivenName Lena -Surname Krause -SamAccountName lkrause -Path "OU=Mitarbeiter,OU=Korbwerk,DC=korbwerk,DC=intern" -AccountPassword (Read-Host -AsSecureString "Kennwort") -Enabled $true', 'Legt ein aktiviertes Konto an.']], ['Get-ADUser', 'Set-ADAccountPassword']],
  'Set-ADUser': ['Ändert einen Active Directory-Benutzer.', '', [['Set-ADUser lkrause -Department IT -Title Auszubildende', 'Setzt Abteilung und Titel.']], ['Get-ADUser']],
  'Remove-ADUser': ['Entfernt einen Active Directory-Benutzer.', '', [], []],
  'Remove-ADGroup': ['Entfernt eine Active Directory-Gruppe.', '', [], []],
  'Remove-ADComputer': ['Entfernt ein Active Directory-Computerkonto.', '', [], []],
  'Remove-ADObject': ['Entfernt ein Active Directory-Objekt.', '', [], []],
  'Enable-ADAccount': ['Aktiviert ein Active Directory-Konto.', '', [], []],
  'Disable-ADAccount': ['Deaktiviert ein Active Directory-Konto.', '', [['Disable-ADAccount kwolf', 'Deaktiviert das Konto kwolf.']], []],
  'Unlock-ADAccount': ['Entsperrt ein Active Directory-Konto.', '', [['Search-ADAccount -LockedOut | Unlock-ADAccount', 'Entsperrt alle gesperrten Konten.']], ['Search-ADAccount']],
  'Set-ADAccountPassword': ['Ändert das Kennwort eines Active Directory-Kontos.', 'Mit -Reset setzt ein Administrator das Kennwort ohne Kenntnis des alten zurück.', [['Set-ADAccountPassword lkrause -Reset -NewPassword (Read-Host -AsSecureString "Neues Kennwort")', 'Setzt das Kennwort zurück.']], []],
  'Search-ADAccount': ['Ruft Active Directory-Konten ab, z. B. gesperrte, deaktivierte oder inaktive Konten.', '', [['Search-ADAccount -LockedOut -UsersOnly', 'Zeigt gesperrte Benutzer.'], ['Search-ADAccount -AccountInactive -TimeSpan 90.00:00:00 -UsersOnly', 'Benutzer, die sich seit 90 Tagen nicht angemeldet haben.']], ['Unlock-ADAccount']],
  'Get-ADGroup': ['Ruft eine oder mehrere Active Directory-Gruppen ab.', '', [['Get-ADGroup -Filter "Name -like \'GG-*\'"', 'Zeigt alle Gruppen, die mit GG- beginnen.']], ['Get-ADGroupMember']],
  'New-ADGroup': ['Erstellt eine Active Directory-Gruppe.', '-GroupScope (DomainLocal, Global, Universal) ist Pflicht.', [['New-ADGroup -Name GG-Projekte -GroupScope Global -Path "OU=Gruppen,OU=Korbwerk,DC=korbwerk,DC=intern"', 'Erstellt eine globale Sicherheitsgruppe.']], ['Add-ADGroupMember']],
  'Set-ADGroup': ['Ändert eine Active Directory-Gruppe.', '', [], []],
  'Add-ADGroupMember': ['Fügt einer Active Directory-Gruppe ein oder mehrere Mitglieder hinzu.', '', [['Add-ADGroupMember GG-Projekte -Members lkrause, mhofmann', 'Fügt zwei Benutzer hinzu.']], ['Get-ADGroupMember', 'Remove-ADGroupMember']],
  'Remove-ADGroupMember': ['Entfernt ein oder mehrere Mitglieder aus einer Active Directory-Gruppe.', '', [], []],
  'Get-ADGroupMember': ['Ruft die Mitglieder einer Active Directory-Gruppe ab.', 'Mit -Recursive werden auch Mitglieder verschachtelter Gruppen angezeigt.', [['Get-ADGroupMember GG-IT', 'Zeigt die Mitglieder.']], []],
  'Get-ADPrincipalGroupMembership': ['Ruft die Active Directory-Gruppen ab, in denen ein Benutzer, Computer oder eine Gruppe Mitglied ist.', '', [['Get-ADPrincipalGroupMembership mhofmann | Select-Object Name', 'Zeigt die Gruppen eines Benutzers.']], []],
  'Get-ADOrganizationalUnit': ['Ruft eine oder mehrere Active Directory-Organisationseinheiten (OUs) ab.', '', [['Get-ADOrganizationalUnit -Filter * | Select-Object Name, DistinguishedName', 'Zeigt alle OUs.']], ['New-ADOrganizationalUnit']],
  'New-ADOrganizationalUnit': ['Erstellt eine Active Directory-Organisationseinheit.', 'Neue OUs sind standardmäßig vor versehentlichem Löschen geschützt.', [['New-ADOrganizationalUnit -Name Werkstatt -Path "OU=Korbwerk,DC=korbwerk,DC=intern"', 'Erstellt eine OU.']], []],
  'Set-ADOrganizationalUnit': ['Ändert eine Active Directory-Organisationseinheit.', '', [], []],
  'Remove-ADOrganizationalUnit': ['Entfernt eine Active Directory-Organisationseinheit.', '', [], []],
  'Move-ADObject': ['Verschiebt ein Active Directory-Objekt in einen anderen Container.', '-Identity erwartet den DistinguishedName oder die GUID – am einfachsten über die Pipeline: Get-ADUser x | Move-ADObject -TargetPath ...', [['Get-ADUser kwolf | Move-ADObject -TargetPath "OU=Ausgeschieden,OU=Korbwerk,DC=korbwerk,DC=intern"', 'Verschiebt einen Benutzer in eine andere OU.']], []],
  'Rename-ADObject': ['Ändert den Namen eines Active Directory-Objekts.', '', [], []],
  'Get-ADComputer': ['Ruft einen oder mehrere Active Directory-Computer ab.', '', [['Get-ADComputer -Filter * -Properties OperatingSystem | Select-Object Name, OperatingSystem', 'Zeigt alle Computer mit Betriebssystem.']], []],
  'Get-ADDomain': ['Ruft eine Active Directory-Domäne ab.', '', [['Get-ADDomain', 'Zeigt Informationen zur Domäne.']], []],
  'Get-ADDomainController': ['Ruft einen oder mehrere Active Directory-Domänencontroller ab.', '', [], []],
  'Get-ADDefaultDomainPasswordPolicy': ['Ruft die Standardkennwortrichtlinie der Domäne ab.', '', [['Get-ADDefaultDomainPasswordPolicy', 'Zeigt Mindestlänge, Komplexität und Sperrschwelle.']], []],
  'Invoke-Command': ['Führt Befehle auf lokalen Computern und Remotecomputern aus.', 'Der Skriptblock läuft auf allen angegebenen Computern gleichzeitig. Lokale Variablen übergeben Sie mit $using:. Die Ergebnisse enthalten die Eigenschaft PSComputerName.', [['Invoke-Command -ComputerName KORB-APP01, KORB-DC01 -ScriptBlock { Get-Service Spooler }', 'Fragt einen Dienst auf zwei Servern ab.'], ['$tage = 7\nInvoke-Command -ComputerName KORB-APP01 -ScriptBlock { Get-EventLog System -After (Get-Date).AddDays(-$using:tage) }', 'Übergibt eine lokale Variable.']], ['Enter-PSSession', 'New-PSSession', 'about_Remote']],
  'Enter-PSSession': ['Startet eine interaktive Sitzung mit einem Remotecomputer.', 'Die Eingabeaufforderung zeigt den Computernamen in eckigen Klammern. Mit Exit-PSSession oder exit verlassen Sie die Sitzung.', [['Enter-PSSession KORB-APP01', 'Verbindet sich mit dem Server.']], ['Exit-PSSession', 'Invoke-Command']],
  'Exit-PSSession': ['Beendet eine interaktive Sitzung mit einem Remotecomputer.', '', [], []],
  'New-PSSession': ['Erstellt eine dauerhafte Verbindung mit einem lokalen oder Remotecomputer.', 'Dauerhafte Sitzungen behalten Variablen zwischen mehreren Invoke-Command-Aufrufen.', [['$s = New-PSSession KORB-APP01, KORB-DC01', 'Erstellt zwei Sitzungen.'], ['Invoke-Command -Session $s { $env:COMPUTERNAME }', 'Verwendet die Sitzungen.']], ['Remove-PSSession', 'Get-PSSession']],
  'Get-PSSession': ['Ruft die Windows PowerShell-Sitzungen auf lokalen Computern und Remotecomputern ab.', '', [], []],
  'Remove-PSSession': ['Schließt eine oder mehrere Windows PowerShell-Sitzungen (PSSessions).', '', [['Get-PSSession | Remove-PSSession', 'Schließt alle Sitzungen.']], []],
  'Test-WSMan': ['Testet, ob der WinRM-Dienst auf einem lokalen Computer oder Remotecomputer ausgeführt wird.', '', [['Test-WSMan KORB-APP01', 'Prüft, ob Remoting möglich ist.']], ['Enable-PSRemoting']],
  'Enable-PSRemoting': ['Konfiguriert den Computer für den Empfang von Remotebefehlen.', 'Startet den WinRM-Dienst, legt einen Listener an und aktiviert die Firewallausnahme. Erfordert Administratorrechte.', [['Enable-PSRemoting -Force', 'Aktiviert Remoting ohne Rückfragen.']], []],
  'Disable-PSRemoting': ['Verhindert, dass Remotebenutzer Befehle auf dem lokalen Computer ausführen.', '', [], []]
};
GG.helpData = H;

const PDESC = {
  Path: 'Gibt einen Pfad zu einem oder mehreren Speicherorten an. Platzhalter sind zulässig.', LiteralPath: 'Gibt einen Pfad an, der genau so verwendet wird, wie er eingegeben wurde (ohne Platzhalter).',
  Filter: 'Gibt einen Filter an, um den Path-Parameter zu qualifizieren (z. B. *.txt).', Include: 'Ruft nur die angegebenen Elemente ab.', Exclude: 'Lässt die angegebenen Elemente aus.',
  Recurse: 'Ruft die Elemente am angegebenen Speicherort und in allen untergeordneten Elementen des Speicherorts ab.', Force: 'Erzwingt die Ausführung, z. B. das Anzeigen versteckter Elemente oder das Überschreiben ohne Rückfrage.',
  Name: 'Gibt den Namen bzw. die Namen an.', ComputerName: 'Gibt die Computer an, auf denen der Befehl ausgeführt wird.', Identity: 'Gibt das Objekt über SamAccountName, DistinguishedName, GUID oder SID an.',
  Property: 'Gibt die Eigenschaften an, die verwendet werden sollen.', Properties: 'Gibt zusätzliche Eigenschaften an, die vom Server abgerufen werden sollen (* = alle).',
  Destination: 'Gibt den Zielpfad an.', DestinationPath: 'Gibt den Zielpfad an.', Value: 'Gibt den Wert an.', Credential: 'Gibt ein Benutzerkonto mit Berechtigung für diese Aktion an.',
  WhatIf: 'Zeigt, was geschehen würde, wenn das Cmdlet ausgeführt wird. Das Cmdlet wird nicht ausgeführt.', Confirm: 'Fordert Sie vor der Ausführung des Cmdlets zur Bestätigung auf.',
  PassThru: 'Gibt ein Objekt zurück, das das bearbeitete Element darstellt. Standardmäßig wird keine Ausgabe generiert.', ScriptBlock: 'Gibt die auszuführenden Befehle als Skriptblock an.',
  Id: 'Gibt die ID an.', InputObject: 'Gibt die Objekte an, die verarbeitet werden. Kann auch über die Pipeline übergeben werden.', First: 'Gibt die Anzahl der Objekte vom Anfang an.', Last: 'Gibt die Anzahl der Objekte vom Ende an.',
  Descending: 'Sortiert in absteigender Reihenfolge.', Encoding: 'Gibt die Codierung der Datei an.', Delimiter: 'Gibt das Trennzeichen zwischen den Werten an.', NoTypeInformation: 'Lässt die Zeile #TYPE weg.',
  Append: 'Fügt die Ausgabe am Ende der Datei an.', ItemType: 'Gibt den Typ des neuen Elements an (File oder Directory).', Pattern: 'Gibt den zu suchenden Text als regulären Ausdruck an.',
  Count: 'Gibt die Anzahl an.', Quiet: 'Gibt nur True oder False zurück.', Port: 'Gibt die TCP-Portnummer an.', InterfaceAlias: 'Gibt den Namen der Netzwerkschnittstelle an.', InterfaceIndex: 'Gibt den Index der Netzwerkschnittstelle an.',
  IPAddress: 'Gibt die IP-Adresse an.', PrefixLength: 'Gibt die Präfixlänge (Subnetzmaske in CIDR-Schreibweise) an.', DefaultGateway: 'Gibt das Standardgateway an.', ServerAddresses: 'Gibt die DNS-Serveradressen an.',
  StartupType: 'Gibt den Starttyp des Diensts an.', Status: 'Gibt den gewünschten Status an.', LogName: 'Gibt das Ereignisprotokoll an.', Newest: 'Gibt die Anzahl der neuesten Ereignisse an.', EntryType: 'Gibt den Ereignistyp an (Error, Warning, Information ...).',
  SearchBase: 'Gibt den Active Directory-Pfad an, unter dem gesucht wird.', Members: 'Gibt die neuen Mitglieder an.', GroupScope: 'Gibt den Gruppenbereich an (DomainLocal, Global, Universal).', TargetPath: 'Gibt den neuen Ort (DistinguishedName) an.',
  AccountPassword: 'Gibt das Kennwort als SecureString an.', Enabled: 'Gibt an, ob das Konto aktiviert ist.', Session: 'Gibt die zu verwendenden Sitzungen (PSSession) an.', ArgumentList: 'Gibt Argumente für den Skriptblock an.',
  ExecutionPolicy: 'Gibt die Ausführungsrichtlinie an.', Scope: 'Gibt den Gültigkeitsbereich an.', Verb: 'Gibt das Verb des Befehlsnamens an.', Noun: 'Gibt das Nomen des Befehlsnamens an.', Module: 'Gibt das Modul an.',
  Examples: 'Zeigt nur Beispiele an.', Detailed: 'Fügt Parameterbeschreibungen und Beispiele hinzu.', Full: 'Zeigt die gesamte Hilfe an.', Parameter: 'Zeigt nur die Beschreibung des angegebenen Parameters an.', Online: 'Zeigt die Onlineversion an.',
  Tail: 'Gibt die Anzahl der Zeilen vom Ende der Datei an.', TotalCount: 'Gibt die Anzahl der Zeilen vom Anfang der Datei an.', Raw: 'Gibt den Inhalt als eine einzige Zeichenfolge zurück.',
  Sum: 'Berechnet die Summe.', Average: 'Berechnet den Durchschnitt.', Maximum: 'Ermittelt das Maximum.', Minimum: 'Ermittelt das Minimum.', ExpandProperty: 'Gibt die Werte der angegebenen Eigenschaft direkt aus.',
  Unique: 'Gibt nur eindeutige Werte zurück.', AutoSize: 'Passt die Spaltenbreiten an den Inhalt an.', Member: 'Gibt die Mitglieder an.', Group: 'Gibt die Gruppe an.', Password: 'Gibt das Kennwort als SecureString an.', Description: 'Gibt eine Beschreibung an.',
  FullAccess: 'Konten mit Vollzugriff auf die Freigabe.', ChangeAccess: 'Konten mit Ändern-Zugriff auf die Freigabe.', ReadAccess: 'Konten mit Lesezugriff auf die Freigabe.', Protocol: 'Gibt das Protokoll an (TCP, UDP, ICMPv4 ...).', LocalPort: 'Gibt die lokalen Ports an.',
  Direction: 'Gibt die Richtung an (Inbound oder Outbound).', Action: 'Gibt die Aktion an (Allow oder Block).', DisplayName: 'Gibt den Anzeigenamen an.', IcmpType: 'Gibt den ICMP-Typ an (8 = Echoanforderung).', NewName: 'Gibt den neuen Namen an.', Verbose: 'Zeigt ausführliche Meldungen an.', ErrorAction: 'Legt fest, wie auf nicht beendende Fehler reagiert wird.'
};

/* Syntaxzeile */
const TL = { 'string': 'String', 'string[]': 'String[]', 'int': 'Int32', 'long': 'Int64', 'double': 'Double', 'bool': 'Boolean', 'sb': 'ScriptBlock', 'object': 'Object', 'object[]': 'Object[]', 'hash': 'Hashtable', 'hash[]': 'Hashtable[]', 'secure': 'SecureString', 'date': 'DateTime', 'cred': 'PSCredential', 'timespan': 'TimeSpan', 'int[]': 'Int32[]' };
function ptype(p) { if (p.type === 'enum' || p.type === 'enum[]') return '{' + p.values.join(' | ') + '}'; return '<' + (TL[p.type] || 'Object') + '>'; }
function syntax(spec) {
  const parts = [spec.name];
  const ps = (spec.params || []).slice();
  const posd = ps.filter(p => p.pos !== undefined).sort((a, b) => a.pos - b.pos);
  const named = ps.filter(p => p.pos === undefined);
  for (const p of posd.concat(named)) {
    if (p.type === 'switch') { parts.push(`[-${p.name}]`); continue; }
    const nm = p.pos !== undefined ? `[-${p.name}]` : `-${p.name}`;
    const s = `${nm} ${ptype(p)}`;
    parts.push(p.mandatory && !p.altOf ? s : `[${s}]`);
  }
  if (spec.sp) parts.push('[-WhatIf]', '[-Confirm]');
  if (!spec.noCommon) parts.push('[<CommonParameters>]');
  return [parts.join(' ')];
}
GG.help = { syntax: (spec) => syntax(spec).map(s => '    ' + s) };

/* about-Themen */
const ABOUT = {
  about_Aliases: ['Beschreibt, wie alternative Namen für Cmdlets und Befehle verwendet werden.', 'Ein Alias ist ein alternativer Name für ein Cmdlet, eine Funktion oder ein Programm. Viele Aliase sollen den Umstieg erleichtern: dir und ls zeigen Ordnerinhalte, cd wechselt den Ordner, cat zeigt Dateien an.\n\nWICHTIG: Ein Alias übersetzt nur den Namen, nicht die Parameter. "ls -la" aus Linux funktioniert deshalb nicht, weil Get-ChildItem keinen Parameter -la kennt. Die PowerShell-Schreibweise lautet "Get-ChildItem -Force".\n\nIn Skripten sollten Sie immer den vollständigen Cmdlet-Namen verwenden, damit andere dein Skript verstehen.\n\n    Get-Alias              # alle Aliase\n    Get-Alias dir          # Was steckt hinter dir?\n    Get-Alias -Definition Get-ChildItem'],
  about_Command_Syntax: ['Beschreibt die Syntaxdiagramme in der Hilfe.', 'In der SYNTAX-Zeile gilt:\n\n    -Parameter <Typ>        Parameter mit Wert\n    [-Parameter <Typ>]      optionaler Parameter\n    [[-Path] <String[]>]    optionaler Positionsparameter: Name darf entfallen\n    [-Recurse]              Schalterparameter (ohne Wert)\n    {A | B | C}             erlaubte Werte\n    <String[]>              mehrere Werte, durch Komma getrennt\n\nParameternamen dürfen abgekürzt werden, solange sie eindeutig sind (-Rec statt -Recurse). Mit der Tabulatortaste vervollständigst du Befehle und Parameter.'],
  about_Pipelines: ['Kombiniert Befehle zu Pipelines.', 'Eine Pipeline ist eine Reihe von Befehlen, die durch den Pipelineoperator "|" verbunden sind. Jeder Befehl gibt sein Ergebnis an den nächsten weiter.\n\nAnders als in Linux werden keine Textzeilen, sondern OBJEKTE weitergegeben. Ein Dienst-Objekt hat Eigenschaften wie Name, Status und StartType. Deshalb können Sie direkt nach Eigenschaften filtern, ohne Text zu zerschneiden:\n\n    Get-Service | Where-Object Status -eq Stopped | Sort-Object Name\n\nWelche Eigenschaften ein Objekt hat, zeigt Get-Member:\n\n    Get-Service | Get-Member\n\nFormatierungsbefehle wie Format-Table gehören ans Ende einer Pipeline.'],
  about_Objects: ['Stellt wichtige Informationen zu Objekten in Windows PowerShell bereit.', 'Alles in PowerShell ist ein Objekt: eine Datei, ein Prozess, eine Zeichenfolge, eine Zahl. Objekte haben EIGENSCHAFTEN (Daten, z. B. Length) und METHODEN (Aktionen, z. B. ToUpper()).\n\n    $datei = Get-Item C:\\Windows\\notepad.exe\n    $datei.Length          # Eigenschaft\n    "hallo".ToUpper()      # Methode\n\nGet-Member zeigt Typ, Eigenschaften und Methoden eines Objekts.'],
  about_Providers: ['Beschreibt, wie Windows PowerShell-Anbieter den Zugriff auf Daten ermöglichen, die sonst nicht leicht zugänglich wären.', 'Anbieter (Provider) stellen Datenspeicher wie Laufwerke dar. So arbeiten Sie mit denselben Befehlen (Get-ChildItem, Set-Location, Get-Item ...) im Dateisystem und anderswo:\n\n    C:, D:        Dateisystem (FileSystem)\n    HKLM:, HKCU:  Registrierung (Registry)\n    Env:          Umgebungsvariablen (Environment)\n    Alias:        Aliase\n    Variable:     Variablen\n    Cert:         Zertifikate\n\nBeispiele:\n\n    Get-ChildItem Env:\n    Set-Location HKLM:\\SOFTWARE\n    Get-ItemProperty HKLM:\\SOFTWARE\\Korbwerk\\Backup\n\nGet-PSDrive zeigt alle Laufwerke.'],
  about_Variables: ['Beschreibt, wie Variablen Werte speichern, die in Windows PowerShell verwendet werden können.', 'Variablen beginnen mit $. Sie können jeden Wert aufnehmen – auch ganze Objektsammlungen:\n\n    $name = "Mira"\n    $dienste = Get-Service\n    $dienste.Count\n\nDer Datentyp ergibt sich automatisch; mit [int], [string] usw. können Sie ihn festlegen:\n\n    [int]$anzahl = "5"\n\nAutomatische Variablen: $_ (aktuelles Pipelineobjekt), $true, $false, $null, $Error, $HOME, $PWD, $env:USERNAME.'],
  about_Quoting_Rules: ['Beschreibt die Regeln für die Verwendung von einfachen und doppelten Anführungszeichen.', 'In doppelten Anführungszeichen werden Variablen ersetzt, in einfachen nicht:\n\n    $n = "Welt"\n    "Hallo $n"     # Hallo Welt\n    \'Hallo $n\'     # Hallo $n\n\nFür Eigenschaften und Ausdrücke benötigen Sie einen Teilausdruck $():\n\n    "Der Dienst heißt $($s.Name)"\n\nOhne $() wird nur $s ersetzt und ".Name" bleibt als Text stehen.\nDas Escape-Zeichen ist der Backtick `: `n Zeilenumbruch, `t Tabulator, `$ Dollarzeichen.'],
  about_Comparison_Operators: ['Beschreibt die Operatoren, mit denen Werte in Windows PowerShell verglichen werden.', 'PowerShell verwendet Wörter statt Zeichen:\n\n    -eq  gleich            -ne  ungleich\n    -gt  größer            -ge  größer oder gleich\n    -lt  kleiner           -le  kleiner oder gleich\n    -like     Platzhaltervergleich ("korb*")\n    -match    regulärer Ausdruck ("^KORB-")\n    -contains Sammlung enthält Wert\n    -in       Wert ist in Sammlung\n\nVergleiche ignorieren Groß-/Kleinschreibung; mit c-Präfix (-ceq, -clike) wird sie beachtet.\n\nACHTUNG: > ist kein Vergleich, sondern eine UMLEITUNG in eine Datei! "if ($a > 5)" erzeugt eine Datei namens 5.'],
  about_Logical_Operators: ['Beschreibt die Operatoren, die Anweisungen in Windows PowerShell verbinden.', '    -and  beide Bedingungen wahr\n    -or   mindestens eine wahr\n    -not  oder !  verneint\n\n    Get-Service | Where-Object { $_.Status -eq "Stopped" -and $_.StartType -eq "Automatic" }'],
  about_Arrays: ['Beschreibt Arrays, Datenstrukturen zum Speichern einer Sammlung von Elementen.', 'Ein Array entsteht durch Kommas oder @():\n\n    $server = "KORB-DC01", "KORB-APP01"\n    $server[0]          # erstes Element\n    $server[-1]         # letztes Element\n    $server.Count       # Anzahl\n    $server += "KORB-SRV02"   # Element anhängen\n\n1..5 erzeugt die Zahlen 1 bis 5.'],
  about_Hash_Tables: ['Beschreibt, wie Hashtabellen in Windows PowerShell erstellt, verwendet und sortiert werden.', 'Eine Hashtabelle speichert Schlüssel-Wert-Paare:\n\n    $azubi = @{ Name = "Lena"; Abteilung = "IT" }\n    $azubi.Name\n    $azubi["Abteilung"]\n    $azubi.Ort = "Coburg"     # neuen Schlüssel hinzufügen\n\nMit [PSCustomObject]@{...} wird aus einer Hashtabelle ein Objekt, das sich wie andere Objekte formatieren und exportieren lässt.'],
  about_If: ['Beschreibt einen Sprachbefehl, mit dem Sie Anweisungslisten basierend auf den Ergebnissen eines oder mehrerer Bedingungstests ausführen können.', '    if ($frei -lt 10GB) {\n        Write-Warning "Wenig Speicher"\n    } elseif ($frei -lt 50GB) {\n        "Speicher knapp"\n    } else {\n        "Alles gut"\n    }'],
  about_Foreach: ['Beschreibt einen Sprachbefehl zum Durchlaufen aller Elemente einer Auflistung.', '    foreach ($s in $server) {\n        "Prüfe $s"\n        Test-Connection $s -Count 1 -Quiet\n    }\n\nIn der Pipeline verwenden Sie stattdessen ForEach-Object mit $_.'],
  about_For: ['Beschreibt einen Sprachbefehl, mit dem Befehle basierend auf einem Bedingungstest ausgeführt werden können.', '    for ($i = 1; $i -le 3; $i++) { "Durchlauf $i" }'],
  about_While: ['Beschreibt eine Sprachanweisung zum Ausführen eines Befehlsblocks auf der Grundlage der Ergebnisse eines Bedingungstests.', '    while ($n -lt 3) { $n++ }'],
  about_Switch: ['Erklärt, wie Sie mit "switch" mehrere if-Anweisungen verarbeiten können.', '    switch ($status) {\n        "Running" { "läuft" }\n        "Stopped" { "steht" }\n        default   { "unbekannt" }\n    }'],
  about_Functions: ['Beschreibt, wie Funktionen in Windows PowerShell erstellt und verwendet werden.', 'Eine Funktion ist ein benannter Skriptblock. Parameter legen Sie mit param() fest:\n\n    function Get-Platz {\n        param(\n            [string]$Laufwerk = "C",\n            [int]$Grenze = 20\n        )\n        $v = Get-Volume $Laufwerk\n        [math]::Round($v.SizeRemaining / 1GB, 1)\n    }\n\n    Get-Platz -Laufwerk D\n\nBenenne Funktionen nach dem Verb-Nomen-Schema (Get-Verb zeigt erlaubte Verben). Mit [Parameter(Mandatory)] wird ein Parameter Pflicht.'],
  about_Scripts: ['Beschreibt, wie Skripts in Windows PowerShell geschrieben und ausgeführt werden.', 'Ein Skript ist eine Textdatei mit der Endung .ps1. Sie starten es mit Pfad – im aktuellen Ordner mit .\\ davor:\n\n    .\\hallo.ps1\n\nOhne .\\ findet PowerShell das Skript aus Sicherheitsgründen nicht. Parameter definieren Sie mit param() am Anfang der Datei. Ob Skripts laufen dürfen, regelt die Ausführungsrichtlinie (about_Execution_Policies).'],
  about_Execution_Policies: ['Beschreibt die Windows PowerShell-Ausführungsrichtlinien und erläutert deren Verwaltung.', 'Die Ausführungsrichtlinie legt fest, ob Skripts ausgeführt werden dürfen:\n\n    Restricted    keine Skripts (Standard auf Windows-Clients)\n    AllSigned     nur signierte Skripts\n    RemoteSigned  lokale Skripts ja, heruntergeladene nur signiert (Standard auf Windows Server)\n    Unrestricted  alle, bei heruntergeladenen mit Warnung\n    Bypass        alles, ohne Warnung\n\nHeruntergeladene Dateien tragen die Markierung Zone.Identifier (ZoneId=3). Nach einer Prüfung geben Sie sie mit Unblock-File frei.\n\nBereiche (vom spezifischsten zum allgemeinsten): MachinePolicy, UserPolicy, Process, CurrentUser, LocalMachine.\n\nDie Ausführungsrichtlinie ist KEINE Sicherheitsgrenze, sondern ein Schutz vor versehentlichem Ausführen.'],
  about_Try_Catch_Finally: ['Beschreibt, wie mit try-, catch- und finally-Blöcken Fehler behandelt werden.', '    try {\n        Get-Item C:\\gibtsnicht -ErrorAction Stop\n    } catch {\n        Write-Warning "Fehler: $($_.Exception.Message)"\n    } finally {\n        "wird immer ausgeführt"\n    }\n\nWICHTIG: catch fängt nur BEENDENDE Fehler. Die meisten Cmdlet-Fehler sind nicht beendend – mit -ErrorAction Stop werden sie beendend und damit fangbar.'],
  about_Redirection: ['Erläutert, wie die Ausgabe von Windows PowerShell in Textdateien umgeleitet wird.', '    >     Ausgabe in Datei schreiben (überschreiben)\n    >>    Ausgabe an Datei anhängen\n    2>    Fehler in Datei umleiten\n    2>$null   Fehler verwerfen\n    2>&1  Fehler in die Ausgabe einreihen\n\nDie Umleitung schreibt in Windows PowerShell 5.1 im Format UTF-16 ("Unicode").'],
  about_Remote: ['Beschreibt, wie Remotebefehle in Windows PowerShell ausgeführt werden.', 'PowerShell-Remoting nutzt WinRM (TCP-Port 5985). Voraussetzungen: Dienst WinRM läuft, Listener ist eingerichtet, Firewall erlaubt den Port. In Domänen funktioniert die Anmeldung mit Kerberos über den Computernamen (nicht über die IP-Adresse).\n\n    Enter-PSSession KORB-APP01                    # interaktiv\n    Invoke-Command -ComputerName A, B { ... }      # 1:n\n    $s = New-PSSession A                           # dauerhafte Sitzung\n\nIn Remotesitzungen gibt es keine Benutzerkontensteuerung: Administratoren arbeiten immer mit vollen Rechten. Grafische Programme können nicht gestartet werden.'],
  about_Remote_Troubleshooting: ['Beschreibt, wie Probleme bei Remotevorgängen behoben werden.', 'Prüfen Sie nacheinander:\n\n    1. Ist der Computer erreichbar?   Test-Connection, Test-NetConnection -Port 5985\n    2. Läuft WinRM?                    Test-WSMan COMPUTER\n    3. Wird der Name aufgelöst?        Resolve-DnsName COMPUTER\n    4. Verwenden Sie den Namen statt der IP-Adresse? (Kerberos)\n    5. Sind Sie Administrator auf dem Zielcomputer?'],
  about_Regular_Expressions: ['Beschreibt reguläre Ausdrücke in Windows PowerShell.', '    .     beliebiges Zeichen        \\d   Ziffer\n    *     beliebig oft              \\w   Wortzeichen\n    +     mindestens einmal         \\s   Leerzeichen\n    ^     Anfang                    $    Ende\n    [abc] eines der Zeichen         (x)  Gruppe\n\n    "KORB-SRV02" -match "^KORB-(\\w+)"   # $Matches[1] = SRV02'],
  about_Automatic_Variables: ['Beschreibt Variablen, die Zustandsinformationen speichern und von Windows PowerShell erstellt und verwaltet werden.', '    $_ / $PSItem   aktuelles Objekt in der Pipeline\n    $Error         Liste der letzten Fehler ($Error[0] = neuester)\n    $?             War der letzte Befehl erfolgreich?\n    $LASTEXITCODE  Exitcode des letzten externen Programms\n    $HOME, $PWD, $PID, $PSVersionTable, $null, $true, $false'],
  about_CommonParameters: ['Beschreibt die Parameter, die mit jedem Cmdlet verwendet werden können.', '    -ErrorAction (-ea)    Continue, SilentlyContinue, Stop, Ignore, Inquire\n    -ErrorVariable (-ev)  speichert Fehler in einer Variablen\n    -OutVariable (-ov)    speichert die Ausgabe zusätzlich in einer Variablen\n    -Verbose (-vb)        ausführliche Meldungen\n    -WhatIf               zeigt nur, was passieren würde\n    -Confirm              fragt vor jeder Änderung nach'],
  about_Execution_Policies_Scopes: ['', ''],
  about_Profiles: ['Beschreibt, wie Windows PowerShell-Profile erstellt und verwendet werden.', 'Ein Profil ist ein Skript, das beim Start von PowerShell automatisch ausgeführt wird. Der Pfad steht in $PROFILE.'],
  about_Operators: ['Beschreibt die von Windows PowerShell unterstützten Operatoren.', 'Arithmetisch: + - * / %   Zuweisung: = += -=   Vergleich: siehe about_Comparison_Operators   Logisch: -and -or -not   Bereich: 1..10   Format: "{0:N2}" -f 3.14159   Ersetzen: -replace   Aufteilen/Verbinden: -split -join'],
  about_Splatting: ['Beschreibt, wie Splatting zum Übergeben von Parametern an Befehle verwendet wird.', '    $p = @{ Path = "C:\\Logs"; Filter = "*.log"; Recurse = $true }\n    Get-ChildItem @p']
};
delete ABOUT.about_Execution_Policies_Scopes;
GG.aboutTopics = ABOUT;

function helpText(spec, name, mode, paramName) {
  const h = H[spec.name] || [`Führt den Befehl ${spec.name} aus.`, '', [], []];
  const [syn, desc, ex, rel] = h;
  const L = [];
  const examples = () => ex.forEach((e, i) => { L.push(`    -------------------------- BEISPIEL ${i + 1} --------------------------`, '    '); e[0].split('\n').forEach((l, k) => L.push((k === 0 ? '    PS C:\\>' : '    ') + l)); L.push('    ', '    ' + e[1], '    ', '    '); });
  const pinfo = (p) => {
    const t = p.type === 'switch' ? '[<SwitchParameter>]' : ptype(p);
    L.push(`    -${p.name} ${t}`, `        ${PDESC[p.name] || `Gibt den Wert für ${p.name} an.`}`, '        ');
    if (mode === 'full' || mode === 'param') {
      L.push(`        Erforderlich?                ${p.mandatory && !p.altOf ? 'true' : 'false'}`, `        Position?                    ${p.pos !== undefined ? p.pos : 'named'}`, `        Standardwert                 ${p.type === 'switch' ? 'False' : ''}`, `        Pipelineeingaben akzeptieren?${p.pipe ? 'true (' + (p.pipe === 'prop' ? 'ByPropertyName' : p.pipe === 'both' ? 'ByValue, ByPropertyName' : 'ByValue') + ')' : 'false'}`, `        Platzhalterzeichen akzeptieren?${/Path|Name|Filter|Include|Exclude/.test(p.name) ? 'true' : 'false'}`, '        ');
    }
  };
  if (mode === 'param') {
    const ps = (spec.params || []).concat(spec.sp ? GG.SHOULD : []).filter(p => V.like(p.name, paramName));
    if (!ps.length) return null;
    L.push('');
    for (const p of ps) pinfo(p);
    return L;
  }
  L.push('', 'NAME', '    ' + spec.name, '    ', 'ÜBERSICHT', '    ' + syn, '    ');
  if (mode === 'examples') { L.push('    '); examples(); return L; }
  L.push('    ', 'SYNTAX');
  for (const s of syntax(spec)) L.push('    ' + s, '    ');
  L.push('    ', 'BESCHREIBUNG');
  for (const l of (desc || syn).split('\n')) L.push('    ' + l);
  L.push('    ');
  if (mode === 'detailed' || mode === 'full') {
    L.push('', 'PARAMETER');
    for (const p of spec.params || []) pinfo(p);
    if (spec.sp) { pinfo(GG.SHOULD[0]); pinfo(GG.SHOULD[1]); }
    L.push('    <CommonParameters>', '        Dieses Cmdlet unterstützt folgende allgemeine Parameter: Verbose, Debug,', '        ErrorAction, ErrorVariable, WarningAction, WarningVariable,', '        OutBuffer, PipelineVariable und OutVariable. Weitere Informationen finden Sie unter', '        "about_CommonParameters" (https:/go.microsoft.com/fwlink/?LinkID=113216). ', '    ');
    if (mode === 'full') L.push('EINGABEN', '    System.String', '    ', '    ', 'AUSGABEN', '    System.Object', '    ', '    ');
    if (ex.length) { L.push('    '); examples(); }
  }
  L.push('', 'VERWANDTE LINKS');
  L.push(`    Online Version: https://learn.microsoft.com/powershell/module/${(spec.module || 'microsoft.powershell.core').toLowerCase()}/${spec.name.toLowerCase()}?view=powershell-5.1`);
  for (const r of rel || []) L.push('    ' + r + ' ');
  if (mode === 'normal') {
    L.push('', 'HINWEISE', `    Zum Aufrufen der Beispiele geben Sie Folgendes ein: "get-help ${spec.name} -examples".`, `    Weitere Informationen erhalten Sie mit folgendem Befehl: "get-help ${spec.name} -detailed".`, `    Technische Informationen erhalten Sie mit folgendem Befehl: "get-help ${spec.name} -full".`, `    Geben Sie zum Abrufen der Onlinehilfe Folgendes ein: "get-help ${spec.name} -online"`);
  }
  L.push('', '');
  return L;
}
GG.view('HelpInfoShort', { table: [{ l: 'Name', p: 'Name', w: 33 }, { l: 'Category', p: 'Category', w: 9 }, { l: 'Module', p: 'Module', w: 34 }, { l: 'Synopsis', p: 'Synopsis' }] });
function helpRun(c, p) {
  const name = p.Name;
  const mode = p.Examples ? 'examples' : p.Detailed ? 'detailed' : p.Full ? 'full' : p.Parameter ? 'param' : 'normal';
  if (!name) {
    return c.outAll(['', 'THEMA', '    Windows PowerShell-Hilfesystem', '', 'KURZBESCHREIBUNG', '    Zeigt Hilfe zu Windows PowerShell-Cmdlets und -Konzepten an.', '', 'AUSFÜHRLICHE BESCHREIBUNG', '', 'SYNTAX', '    get-help {<Befehlsname> | <Themenname>}', '    help {<Befehlsname> | <Themenname>}', '    <Befehlsname> -?', '', '    "Get-help" und "-?" zeigen Hilfe auf einer Seite an.', '    "Help" zeigt Hilfe auf mehreren Seiten an.', '', '  Beispiele:', '    get-help get-process   : Zeigt Hilfe zum Cmdlet "Get-Process" an.', '    get-help about_*       : Zeigt eine Liste der Konzeptthemen an.', '    get-help *             : Zeigt alle Hilfethemen an.', '', '  Hilfe zu Befehlen finden:', '    get-command -noun service : Befehle mit dem Nomen "Service".', '    get-command -verb stop    : Befehle mit dem Verb "Stop".', '']);
  }
  if (/^about_/i.test(name) || (V.hasWild(name) && /^about/i.test(name))) {
    const ks = Object.keys(ABOUT).filter(k => V.like(k, name));
    if (ks.length === 1 && !V.hasWild(name)) {
      const [syn, body] = ABOUT[ks[0]];
      return c.outAll(['THEMA', '    ' + ks[0], '', 'KURZBESCHREIBUNG', '    ' + syn, '', 'AUSFÜHRLICHE BESCHREIBUNG'].concat(body.split('\n').map(l => '    ' + l)).concat(['', 'SIEHE AUCH', '    Get-Help', '']));
    }
    if (ks.length) return c.outAll(ks.sort().map(k => new PSObject('HelpInfoShort', { Name: k, Category: 'HelpFile', Module: '', Synopsis: ABOUT[k][0] })));
  }
  // Befehl auflösen
  let target = name;
  const al = GG.aliases[name.toLowerCase()];
  if (al) target = al;
  if (V.hasWild(target) || !GG.cmdlets[target.toLowerCase()]) {
    const cands = Object.values(GG.cmdlets).filter(s => GG.cmdletAvailable(s, c.ctx) && (V.hasWild(target) ? V.like(s.name, target) : V.like(s.name, '*' + target + '*')));
    const abouts = Object.keys(ABOUT).filter(k => V.like(k, V.hasWild(target) ? target : '*' + target + '*'));
    if (cands.length === 1 && !abouts.length && !V.hasWild(target)) target = cands[0].name;
    else if (cands.length || abouts.length) {
      return c.outAll(cands.sort((a, b) => a.name.localeCompare(b.name)).map(s => new PSObject('HelpInfoShort', { Name: s.name, Category: s.cmdType === 'Function' ? 'Function' : 'Cmdlet', Module: s.module, Synopsis: (H[s.name] || [''])[0] })).concat(abouts.map(k => new PSObject('HelpInfoShort', { Name: k, Category: 'HelpFile', Module: '', Synopsis: ABOUT[k][0] }))));
    } else {
      const f = c.scope.findFn(name);
      if (f) {
        const ps = (f.def.params || []).map(q => q.type && /^switch$/i.test(q.type) ? `[-${q.name}]` : `[[-${q.name}] <${q.type ? (V.resolveType(q.type) || q.type).split('.').pop() : 'Object'}>]`);
        return c.outAll(['', 'NAME', '    ' + f.name, '    ', 'SYNTAX', '    ' + [f.name].concat(ps).join(' ') + (f.def.cmdletBinding ? ' [<CommonParameters>]' : ''), '    ', '', 'ALIASE', '    Keine', '    ', '', 'HINWEISE', '    Für diese Funktion ist keine Hilfe vorhanden. Sie können sie mit einem Kommentar <# .SYNOPSIS ... #> ergänzen.', '']);
      }
      const nk = name.toLowerCase().replace(/\.exe$/, '');
      if (GG.natives[nk]) return c.error(`Für das externe Programm "${name}" ist keine PowerShell-Hilfe vorhanden. Externe Programme zeigen ihre Hilfe meist mit "${nk} /?" an.`, { category: 'ResourceUnavailable', exception: 'System.Management.Automation.HelpNotFoundException', fqid: 'HelpNotFound,Microsoft.PowerShell.Commands.GetHelpCommand', noClass: true, target: name, reason: 'HelpNotFoundException' });
      return c.error(`Get-Help konnte "${name}" nicht in einer Hilfedatei in dieser Sitzung finden. Geben Sie "Update-Help" ein, um aktualisierte Hilfethemen herunterzuladen. Um Onlinehilfe zu erhalten, suchen Sie in der TechNet-Bibliothek unter https:/go.microsoft.com/fwlink/?LinkID=107116 nach dem Hilfethema.`, { category: 'ResourceUnavailable', exception: 'System.Management.Automation.HelpNotFoundException', fqid: 'HelpNotFound,Microsoft.PowerShell.Commands.GetHelpCommand', noClass: true, target: name, reason: 'HelpNotFoundException' });
    }
  }
  const spec = GG.cmdlets[target.toLowerCase()];
  if (p.Online) return c.error(`In dieser Simulation steht kein Webbrowser zur Verfügung. Die Onlinehilfe finden Sie unter https://learn.microsoft.com/powershell/module/${(spec.module || '').toLowerCase()}/${spec.name.toLowerCase()}?view=powershell-5.1`, { category: 'InvalidOperation', exception: 'System.InvalidOperationException', fqid: 'InvalidOperation,Microsoft.PowerShell.Commands.GetHelpCommand', noClass: true });
  if (c.log) c.log.help = { name: spec.name, mode, param: p.Parameter };
  const txt = helpText(spec, target, mode, p.Parameter);
  if (!txt) return c.error(`Für "${spec.name}" wurde kein Parameter gefunden, der dem Namen "${p.Parameter}" entspricht.`, { category: 'InvalidArgument', exception: 'System.ArgumentException', fqid: 'NoParmsFound,Microsoft.PowerShell.Commands.GetHelpCommand', noClass: true });
  c.outAll(txt);
}
const helpParams = [P('Name', 'string', { pos: 0 }), P('Examples', 'switch'), P('Detailed', 'switch'), P('Full', 'switch'), P('Parameter', 'string'), P('Online', 'switch'), P('Category', 'string[]'), P('Component', 'string[]'), P('ShowWindow', 'switch')];
def({ name: 'Get-Help', module: 'Microsoft.PowerShell.Core', input: 'none', params: helpParams, run: async (c, p) => helpRun(c, p) });
GG.builtinFns['help'] = { name: 'help', module: '', run: async (ctx, args, input) => I.invokeCmdlet(GG.cmdlets['get-help'], args, input, ctx, 'help') };
GG.aliases['man'] = 'help';

})();
