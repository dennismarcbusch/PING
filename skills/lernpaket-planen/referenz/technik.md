# Technische Mindeststandards

Quelle: Leitfaden „Evidenzbasierte Lernpakete (SCORM) gestalten“, docs/leitfaden-lernpakete.md im PING-Repository.

## Teil C5: Technische Mindeststandards

Die Standards stammen aus den bisherigen PING-Paketen und den Tests in der ByCS-Lernplattform; sie sorgen dafür, dass jedes Paket dort läuft und die Ergebnisse ankommen.

| Bereich | Standard |
| --- | --- |
| Format | SCORM 1.2, eine ZIP-Datei mit `imsmanifest.xml` und `index.html`; alle Schriften, Skripte und Bilder im Paket (keine externen Server); unter 512 MB (ByCS-Grenze), in der Praxis meist unter 1 MB |
| Datenübergabe | `cmi.core.score.raw` = bestes Ergebnis (0–100), `lesson_status` passed/failed, `masteryscore` im Manifest = 80; Fortschritt in `suspend_data`; Name aus `cmi.core.student_name` vorbelegen; optional `cmi.objectives` je Lernziel und `cmi.interactions` je Frage |
| Ohne Lernplattform | Paket läuft auch lokal; Fortschritt dann nur im Browser, mit Hinweis |
| Geräte | Zielgerät im Steckbrief festlegen (PC, Tablet oder beides); bei Tablets: Antippen statt nur Ziehen |
| Barrierefreiheit | Bedienung per Tastatur, ausreichender Kontrast, Alternativtexte für Bilder, Schrift skalierbar, Information nie nur über Farbe oder nur über Ton; Gesprochenes immer auch als Text (Untertitel oder Transkript); Glossar mit Fachbegriffen |
| Datenschutz | Keine Daten an Dritte, keine Tracking-Dienste, keine Konten außerhalb der Lernplattform; nur die SCORM-Felder, die für Lernen und Bewertung nötig sind |
| Ergebnis | Auswertung je Lernziel, druckbar als PDF |
| Qualitätssicherung | Test im SCORM-1.2-Testplayer; automatisierter Test, dass alle Aufgaben mit der Musterlösung lösbar sind; Test in der echten ByCS-Lernplattform vor dem ersten Einsatz |
| Ablage und Version | Quellcode und ZIP im gemeinsamen Repository, einheitliche Benennung, Versionsnummer und Änderungsprotokoll; die Versionsnummer steht klein, aber sichtbar im Paket (neben dem Titel und auf den PDFs), damit bei Rückfragen und in der Auswertung klar ist, welche Fassung im Einsatz war |
| Lizenz | Lizenz festlegen (z. B. CC BY-SA), damit Kollegen Pakete anpassen und weitergeben dürfen |
| Tafelbild (optional) | Präsentationsmodus im Paket (`js/tafel.js`, Daten in `PAKET.tafel`); Bedienung per Pfeiltasten und Presenter, Schaltflächen mindestens 48 px, lesbar am Beamer; schreibt keine SCORM-Werte, kein `suspend_data`, kein `localStorage` |
| Merkblatt (P13) | Wird im Browser als druckbare Seite erzeugt und als PDF gespeichert, ohne Server. Einträge nicht dauerhaft in suspend\_data ablegen (SCORM 1.2: höchstens 4096 Zeichen); das Merkblatt braucht keinen Namen. |

Kolleginnen und Kollegen ohne Programmiererfahrung müssen diese Details nicht selbst umsetzen; das Skill-Set (Teil C7) baut sie automatisch ein. Sie sollten aber wissen, dass es sie gibt, um die Checkliste abhaken zu können.
