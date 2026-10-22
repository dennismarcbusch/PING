# SCORM-Paket „Get-Going!“ (Windows PowerShell)

Stand: 22.10.2026 · SCORM 1.2 · ein Paket get-going_scorm12.zip (index.html + imsmanifest.xml + js/css/fonts, ca. 350 KB), selbstgesteuert · Zielgruppe: Fachinformatik-Einstiegsklasse, nur PC/Laptop

## Leitidee
Gegenstück zu „Shell Yeah!“ (Linux), gleiches Muster (Tutorial → Üben → Kompetenznachweis). Name „Get-Going!“ (vom Lehrer gewählt). Simuliert wird **Windows Server 2025 mit Windows PowerShell 5.1** (deutsche Oberfläche). Story geht bei „Korbwerk IT-Service“ weiter: Ausbilderin Mira Hofmann (Nachrichten im Stil von `msg`), Dateiserver KORB-SRV02 mit Kalles Altlasten (KalleSync, KalleBackup, Buchhaltung für „Jeder“, Kennwort in der Registry, Freigabe Kalle$). Nachweis beim neuen Kunden „Schreinerei Maier“ (Domäne maier.intern, MAIER-SRV01).

## Was anders ist als bei Linux (bewusst umgesetzt)
- Objekt-Pipeline statt Text (Get-Member, Select/Where/Sort/Group/Measure, berechnete Eigenschaften, Format-* nur am Ende).
- Verb-Nomen-Schema, Get-Command/Get-Help/about_-Themen, Alias-Falle (`ls -la`).
- UAC statt sudo: eigener Admin-Tab über `Start-Process powershell -Verb RunAs` mit UAC-Dialog.
- Provider (HKLM:, Env:, Alias:), NTFS-ACLs + icacls, SMB-Freigaben, lokale Konten.
- Ausführungsrichtlinien, Zone.Identifier, Unblock-File; `.\`-Falle; `>`-Falle bei Vergleichen.
- Zusatzthemen (vom Lehrer gewählt): Skripte vertiefen (param, Funktionen, try/catch), Active Directory, Remoting (WinRM, Invoke-Command, $using:), winget & PowerShell Gallery.
- Skripte schreiben im simulierten **notepad-Fenster** (Strg+S, „Neue Datei erstellen?“-Abfrage wie im Original).

## Technik
- Reine JavaScript-Simulation: eigener PowerShell-Parser und -Interpreter (Pipeline mit Objekten, Parameterbindung inkl. Positions-/Pipeline-Binding, Skriptblöcke, Funktionen, param(), try/catch/finally, $Error, ErrorAction, -WhatIf/-Confirm mit deutschen Rückfragen), deutsche 5.1-Fehlermeldungen mit „In Zeile:1 Zeichen:…“ und CategoryInfo.
- Ausgabeformatierung wie 5.1 (Tabellen-/Listenansichten, „Verzeichnis:“-Gruppen, Abschneiden mit „...“), realistische Get-Member-Listen.
- Weltmodell: Dateisystem mit NTFS-Vererbung, Registry, Dienste/Prozesse/Ereignisprotokolle, lokale Konten/Gruppen, SMB, Netzwerk (Routing, APIPA, DNS-Zonen, Firewallregeln, Ports), Active Directory (Filtersyntax, OUs, Gruppen, Sperren), Remoting zwischen mehreren Servern, winget-Katalog, PSGallery.
- Oberfläche im Windows-Terminal-Stil mit Tabs (normal / Administrator), PSReadLine-Syntaxfärbung, Tab-Vervollständigung (Cmdlets, Parameter, Pfade, Variablen), Verlauf, Fortsetzungszeilen `>>`, Out-GridView, Get-Credential-Dialog.
- Optik: Farbschema „Klassisch PowerShell“ (vom Lehrer aus drei Varianten gewählt): Kopfzeile und Terminal im PowerShell-Blau #012456, Text #EEEDF0, klassische Konsolenpalette (Fehler rot auf Schwarz), heller Lesebereich im Windows-11-Stil, Akzent #0063B1. Schriften Cascadia Mono (eingebettet) und Segoe UI (System).

## Lernziele
LZ1 Befehle finden & Hilfe · LZ2 Dateisystem, Provider & Archive · LZ3 Objekt-Pipeline · LZ4 Ausgabe, Export & Fehler · LZ5 Variablen & Skripte · LZ6 Benutzer, Rechte & Freigaben · LZ7 Prozesse, Dienste, Ereignisse & Software · LZ8 Netzwerk & Firewall · LZ9 Active Directory · LZ10 Remoting

## Aufbau
- ① Tutorial: 10 Kapitel, 81 Lektionen (Zustands-/Befehlsprüfung, Antwortfelder), Tipp → Musterlösung (mit „einfügen“), Kurz-Check (4 MC) je Kapitel, Kursbaum im `tree /F`-Stil zum Springen; Serverzustand wird durch Nachspielen der Musterlösungen erzeugt („Zurücksetzen“, „Überspringen“). Kapitel 8 tauscht die Netzwerkkarte (APIPA, Firewall-Regel aus).
- ② Üben: 10 Missionen (je Kapitel) auf frischem Server, Live-Prüfpunkte, 3 gestufte Tipps, Reflexionsfrage mit Musterantwort.
- ③ Kompetenznachweis: Teil A 21 Prüfpunkte an MAIER-SRV01 (+ MAIER-DC01, MAIER-KASSE01; Netzwerk absichtlich falsch: /16, falsches Gateway, DNS 8.8.8.8), freie Reihenfolge, keine Tipps, Bewertung beim Abgeben; Teil B 12 Fragen aus Pool von 51 (1/1/2/1/2/1/1/1/1/1 je LZ; MC, Terminal-Bild, Hotspot, Zuordnen, Zahl). A und B je 50 %, bestanden ab 70 %.

## Entscheidungen
- Kein Admin-Kennwort: azubi bzw. korbwerk ist Mitglied einer Admin-Gruppe; Rechte nur nach UAC-Bestätigung (Admin-Tab).
- Remoting und AD funktionieren nur bei korrekter Netzwerkkonfiguration (im Nachweis gewollt).
- Nachweis muss in einer Sitzung abgeschlossen werden (Serverzustand nicht in suspend_data).
- SCORM: score.raw = bestes Ergebnis, lesson_status passed/failed, masteryscore 70, Fortschritt in suspend_data (< 1 KB), Name aus cmi.core.student_name, Ergebnis druckbar als PDF mit Unterschriftszeilen. localStorage nur ohne LMS.
- Automatisierte Tests: alle 81 Lektionen, 10 Missionen und Teil A per Musterlösung lösbar; zusätzlich 31 alternative Lösungswege (Tutorial) und 8 (Teil A) geprüft.
