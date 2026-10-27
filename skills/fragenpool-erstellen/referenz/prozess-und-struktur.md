# Entwicklungsprozess und Paketstruktur

Quelle: Leitfaden „Evidenzbasierte Lernpakete (SCORM) gestalten“, docs/leitfaden-lernpakete.md im PING-Repository.

## Teil C1: Der Entwicklungsprozess in sechs Phasen

Jedes Paket durchläuft sechs Phasen; sie folgen ADDIE, laufen aber in kurzen Schleifen, und das Bauen beginnt mit einem kleinen Prototyp statt mit dem fertigen Paket. Kerres (2024) empfiehlt ein solches schrittweises Vorgehen ausdrücklich, wenn das Team klein ist, die Lehrkraft selbst inhaltlich mitarbeitet und das Ziel am Anfang noch nicht ganz klar ist: So liegt jederzeit eine nutzbare Version vor, und Wichtiges wird verlässlicher fertig als „schöne Extras“. Zu jeder Phase gehört ein konkretes Ergebnis, das ins Repository kommt.

Ablauf: Klären → Zielen → Entwerfen → Prototyp bauen → Erproben → Einsetzen und auswerten, mit Rücksprüngen nach Erprobung und Auswertung.

1. **Klären (Analyse).** Welches Lernproblem löst das Paket, für wen, in welchem Rahmen? Ein Paket kann nur ein Lernproblem lösen; fehlen Geräte, Zeit oder Begleitung, hilft es allein nicht. Ergebnis: *Steckbrief* (eine Seite) mit Fach, Klasse, Lehrplanbezug, Vorwissen, Motivation und Erfahrung mit selbstständigem Lernen, Einsatzform (SeGeL oder klassisch), Geräten, Zeitrahmen und einer ersten Idee für die Leitsituation.
2. **Zielen (Lernziele und Nachweis zuerst).** Drei bis acht überprüfbare Lernziele formulieren, dann sofort festlegen, woran man das Können erkennt: eine Handlungsaufgabe (Nachweis Teil A) und mindestens zwei Fragen je Lernziel (Teil B). Ergebnis: *Lernziel-Nachweis-Tabelle*.
3. **Entwerfen (Drehbuch).** Leitsituation und Story, Aufgabenklassen von einfach nach komplex, Stationen, Lösungsbeispiele, gestufte Tipps. Besonders wichtig: typische Fehler und Fehlvorstellungen der Schüler sammeln, denn daraus entstehen gute Falschantworten und gutes Feedback. Ergebnis: *Drehbuch*.
4. **Prototyp bauen.** Zuerst eine einzige Station mit zwei Fragen vollständig bauen und im SCORM-Testplayer prüfen; erst wenn Optik, Bedienung und Datenübergabe stimmen, folgt der Rest. Ergebnis: *lauffähiges Paket* (ZIP).
5. **Erproben.** Selbsttest mit der Checkliste (Teil C6), Review durch eine Kollegin oder einen Kollegen (fachlich und didaktisch), Kurztest mit drei bis fünf Schülern, die laut denken, Test in der echten ByCS-Lernplattform. Ergebnis: *Änderungsliste*; zurück zu Phase 3 oder 4.
6. **Einsetzen und auswerten.** Nach dem Einsatz den Bericht aus der Lernplattform exportieren: Welche Fragen lösen fast alle falsch (unklar oder zu schwer), welche fast alle richtig (zu leicht)? Reflexionsantworten lesen. Ergebnis: *neue Version* mit Versionsnummer und kurzem Änderungsprotokoll; bei Bedarf zurück zu Phase 2.

**Rollen.** Die Lehrkraft verantwortet fachliche Richtigkeit, Lernziele und Nachweis; die KI übernimmt Programmierung, Gestaltung und Entwürfe. Alles, was die KI fachlich formuliert, wird von der Lehrkraft geprüft.

## Teil C2: Standardstruktur eines Lernpakets

Jedes Paket folgt demselben Grundmuster aus fünf Teilen. Es ist aus den PING-Paketen entstanden und setzt die Ansätze aus Teil A um: zuerst zeigen, dann begleitet üben, zuletzt selbstständig können. Einheitlichkeit hat einen eigenen Nutzen: Schüler müssen die Bedienung nur einmal lernen und können sich ganz auf den Inhalt konzentrieren.

| Teil | Zweck | Warum so (siehe Teil A) | Mindeststandard |
| --- | --- | --- | --- |
| 0 Einstieg | Orientierung und Motivation | Lernen beginnt mit einer echten Aufgabe und knüpft an Vorwissen an; Ziele sind sichtbar | Leitsituation in wenigen Sätzen; Lernziele in Schülersprache, mit kurzer Selbsteinschätzung je Ziel (bloß angezeigte Ziele werden kaum gelesen); kurzer, unbewerteter Vorwissens-Check mit Empfehlung, was übersprungen werden kann; Hinweis auf Dauer und Ablauf |
| ① Entdecken (Tutorial) | Neues verstehen | Vormachen vor Nachmachen; Bildschirme nach Mayer | Stationen bzw. Kapitel mit je einem Auftrag; Lösungsbeispiel vor eigener Aufgabe; Kurz-Check (3–5 Fragen) am Kapitelende; jede Station endet mit einem Bezug zur echten Praxis |
| ② Üben | Können aufbauen | Anwenden in wechselnden Situationen, von leicht nach schwer, mit abnehmender Hilfe | Eine Übung je Lernziel oder Kapitel, wechselnde Situationen; drei gestufte Tipps (Denkanstoß, Teillösung, Lösung); Feedback mit Begründung; Reflexionsfrage mit Musterantwort |
| ③ Kompetenznachweis | Können zeigen | Eine ganze Aufgabe ohne Hilfe lösen; Abfragen festigt das Gelernte | Teil A: Handlungsaufgabe in neuer Situation, ohne Tipps; Teil B: Fragen aus einem Pool, mindestens zwei je Lernziel, gemischte Fragetypen; Bestehensgrenze einheitlich 80 %; beliebig oft wiederholbar, bestes Ergebnis zählt (der Nachweis ist keine Prüfung im rechtlichen Sinne) |
| 4 Abschluss | Integration, Sicherung und Transfer | Gelerntes einordnen und aus dem Gedächtnis sichern; über das eigene Lernen nachdenken | Auswertung je Lernziel mit Lernempfehlung; Merkblatt zum Ergänzen und Herunterladen (P13, siehe unten); Ergebnis als PDF druckbar; Rückverweis auf passende Stationen |

**Fragetypen.** Bewährt haben sich fünf Typen: Multiple Choice, Bildfrage, Hotspot (Stelle im Bild anklicken), Zuordnen und Zahleneingabe. Falschantworten werden aus den gesammelten typischen Fehlern gebildet, nicht erfunden. Jede Frage trägt das Lernziel, zu dem sie gehört.

**Merkblatt (P13).** Nach dem Nachweis öffnet sich ein halb vorgefülltes Merkblatt, gegliedert nach Lernzielen. Lernende ergänzen die Kernaussagen ohne Zurückblättern und vergleichen dann mit dem Muster. Zum Herunterladen gibt es eine Seite als PDF: vorne die eigenen Einträge neben dem Muster, der typische Fehler mit Korrektur, ein kurzes gelöstes Beispiel und bei Abläufen das Schritt-Schema. Hinten stehen fünf Selbsttest-Fragen ohne Lösung mit dem Hinweis „In 1–2 Wochen nochmal beantworten“; die Lösungen sind im Paket. Früher freigeschaltet würde das Merkblatt nur gelesen oder zum Spickzettel für den Nachweis. Im SeGeL-Unterricht gehört es ins Lernportfolio. Wir nennen es bewusst „Merkblatt“, nicht „Cheat Sheet“.

**Größe.** Ein Paket deckt ein Thema ab, das sich in einem Satz benennen lässt. Wird das Drehbuch länger als etwa acht Stationen, lohnt es sich, zwei Pakete daraus zu machen.

Kerres (2024) nennt als Richtwert Lerneinheiten von 30 bis 45 Minuten, drei bis neun davon pro Kapitel und höchstens drei Gliederungsebenen. Wichtiger als die genaue Zahl ist, dass alle Einheiten gleich gerahmt sind: Jede beginnt mit Orientierung (worum es geht, wozu, wie lange) und endet mit einem Abschluss (Kurz-Check oder Zusammenfassung).
