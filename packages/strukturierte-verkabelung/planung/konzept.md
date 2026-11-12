# Konzept: Strukturierte Verkabelung (Version 2)

**Form A, Simulationsmodus.** Der Planer aus Version 1 ist ein Arbeitsgegenstand aus dem Beruf, der alle fünf Lernziele in seinen Regeln trägt: Er berechnet Längen, ordnet Kabel einem Bereich zu und reagiert auf falsche Medien, übersprungene Ebenen und schlechte Standorte. Im Entdecken plant man Schritt für Schritt den ganzen Campus; der Plan bleibt über alle Kapitel erhalten (wie das Terminal in Shell Yeah!).

## Gegenstand: Lageplan (aus Version 1)

- **Sehen:** Lageplan mit Räumen, Flur als Kabeltrasse, Steigschacht, Hauseinführung und Erdtrasse; Ansicht je Etage (groß genug für 1366 × 768) oder ganzes Gelände.
- **Bewegen:** Verteiler (SV, GV, EV) in Räume stellen, Kabel mit gewähltem Medium zwischen zwei Enden verlegen, „⚡ Etage anschließen“ (jeder freie Arbeitsplatz an den nächsten EV), Medium ändern, verschieben, entfernen. Alles per Antippen und Tastatur.
- **Folgen:** Jedes Kabel meldet Bereich, Medium und Länge; zu lange Kabel werden rot; falsche Medien, übersprungene Ebenen und schlechte Räume werden sofort begründet. In der Selbstüberprüfung ist die Rückmeldung stumm.

| Lernziel / typischer Fehler | Reaktion des Gegenstands |
|---|---|
| LZ1 Ebene übersprungen | „Hier wird eine Ebene übersprungen: SV → GV → EV.“ |
| LZ2 Kupfer zwischen Gebäuden | Erklärung Erdpotentiale und Blitz; Kabel bleibt markiert |
| LZ3 EV am Ende der Etage | Kabel über 90 m rot, Länge in der Meldung |
| LZ4 Querverbindung EV – EV | „Verteiler derselben Ebene werden nicht verbunden.“ |
| LZ5 EV im Klassenzimmer, Schrank im Flur | Hinweis Lärm, Wärme, Zutritt; Flur und Schacht nehmen keinen Schrank an |

- **Plattform-Probe:** Planen mit berechneten Längen und Regeln kann kein Test der Lernplattform. Bestanden.

## Aufbau

| Kapitel | Schritte | Lernziele |
|---|---|---|
| K1 Ein Arbeitsplatz, ein Kabel | EV in Technik A1 (Vorführung) · erstes Cat.7-Kabel · Etage anschließen | LZ1, LZ2 |
| K2 Hoch und runter: der Steigbereich | GV im Serverraum (Vorführung) · EV EG + Etage · GV → EV OG (OM4) · GV → EV EG | LZ1, LZ2, LZ4 |
| K3 Haus B: Wo steht der Schrank? | EV am Ende, Kabel zu lang (Vorführung) · EV in die Mitte verschieben · OG gleich richtig | LZ3, LZ5 |
| K4 Zwischen den Gebäuden | SV im Serverraum (Vorführung) · GV B · GV B → EVs · SV → GV A (OS2) · SV → GV B über den Hof | LZ1, LZ2, LZ4, LZ5 |

Üben: lange Druckhalle (zwei EVs nötig), falsche Medien im Hotel Sonne, Hierarchiefehler im Hotel, Schränke am falschen Ort. Selbstüberprüfung: Autohaus Seidl komplett planen.

Tafelbild: drei Bereiche am fertigen Plan · 90 Meter (EV am Ende ↔ Mitte) · Stern in Ebenen.
