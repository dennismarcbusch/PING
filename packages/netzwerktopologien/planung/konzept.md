# Konzept: Netzwerktopologien erleben (Version 2)

**Empfehlung:** Form A. Der Netzplan aus Version 1 ist ein Gegenstand aus dem Beruf, an dem sich alle vier Lernziele direkt zeigen: Wer ein Gerät ausfallen lässt, sieht, wer noch mit wem sprechen kann (LZ2, LZ4); wer umbaut, sieht die Kabelzahl wachsen (LZ3); die Topologie wird am Aufbau erkannt (LZ1). Ein Spiel ist nicht nötig.

## Form

- [x] **A Simulation** – Netzplan eines Kunden: Geräte und Kabel ausfallen lassen, Pakete senden, Netz umbauen
- [ ] B Interaktive Illustration
- [ ] C Spiel zum Üben
- [ ] D Lernspiel

## Gegenstand: Netzplan (aus Version 1 übernommen)

- **Was sehen die Lernenden?** Den Netzplan eines Kunden: PCs, Switches, Kabel, beschriftet mit Raumnamen. Darunter die Erreichbarkeit „x von y PC-Paaren“ als Balken.
- **Was bewegen sie?** Werkzeug „⚡ Ausfall“: Gerät oder Kabel antippen = fällt aus (nochmal = repariert). Werkzeug „✉ Paket“: Absender und Empfänger antippen, das Paket läuft sichtbar den Weg oder bleibt stecken. Ab Station 4: „🔗 Verbinden“ und „🗑 Löschen“ zum Umbauen.
- **Beispielzug:** Du lässt den Switch der Praxis ausfallen – alle Kabel werden grau, die Erreichbarkeit fällt auf 0 von 15, Frau Albers ruft: „Genau so war es heute Morgen!“
- **Durch das Paket:** Entdecken (je Topologie eine Station am Netzplan) · Üben (Umbau-Aufgaben aus Version 1 in anderen Situationen) · Selbstüberprüfung (Autohaus Seidl, ohne Hilfe) · Tafelbild (Ausfall im Stern gegen Bus, Kabelzahl bei Vermaschung, Teilbaum im Baum)

| Lernziel / typischer Fehler | Regel oder Reaktion des Gegenstands |
|---|---|
| LZ1 Topologien erkennen | Der Plan erkennt beim Umbau die entstandene Topologie und benennt sie |
| LZ2 Vor- und Nachteile | Ausfall und Paketweg zeigen den Vorteil oder Nachteil direkt (Kollision im Bus, Token im Ring, Umweg in der Vermaschung) |
| LZ3 Aufwand und Umbau | Kabelzahl und Anschlüsse je Gerät stehen am Plan; Umbau wird an der erkannten Topologie geprüft |
| LZ4 Schwachstellen | Ausfall zeigt, wie viele PC-Paare getrennt sind; „🔥 Schwachstellen“ färbt kritische Elemente |
| Fehler: PC-Ausfall im Stern legt alles lahm | Erreichbarkeit bleibt bei allen übrigen PCs voll, Meldung: „Nur PC … ist weg – die anderen hängen jeder an ihrem eigenen Kabel.“ |
| Fehler: Raum-Switch trennt den ganzen Baum | Nur der Teilbaum wird grau, die andere Gruppe sendet weiter |

- **Plattform-Probe:** Ein Test der Lernplattform kann Ausfälle nicht ausprobieren lassen und keinen Paketweg zeigen. Bestanden.
- **Aufwand:** mittel – Gegenstand aus Version 1 als `quelle/topologie.js` (TopoNetz), Bedienung neu für Tastatur und Tablet.

## Entscheidung

- Gewählt: Form A, **Stationen mit eigenen Szenen** (je Station derselbe Netzplan mit einer anderen Topologie). Kein Simulationsmodus, weil der Plan von Station zu Station neu aufgebaut wird und kein Zustand mitwandert.
- Welt und Figuren: technik · Büro · 🕸️; Mira Hofmann (Ausbilderin Korbwerk IT-Service, wie in Shell Yeah! und Get-Going!), Petra Albers (Praxismanagerin, Praxis Lindenhof).
- Leitfrage für das ganze Paket: „Wer kann jetzt noch mit wem sprechen – und was hat es gekostet?“

## Stationen (Überblick, Ausbau nach dem Prototyp)

| Station | Szene | Lernziele |
|---|---|---|
| S1 Stern: Wer redet noch mit wem? | Praxis Lindenhof, Ausfall von PC, Kabel und Switch | LZ4 |
| S2 Bus: Ein Kabel für alle | alter Messplatz im Labor der Praxis, Kabelbruch, Kollision | LZ1, LZ2, LZ4 |
| S3 Ring: Immer weiterreichen | Ring mit Token, Ausfall, Doppelring | LZ1, LZ2, LZ4 |
| S4 Vermascht: Viele Wege | Server der Praxis voll vermascht, Kabel zählen, n·(n−1)/2 | LZ1, LZ3 |
| S5 Baum: Sterne stapeln | Praxis mit zweitem Stockwerk, Raum-Switch und Core | LZ1, LZ4 |
| S6 Vergleich: Was passt zur Praxis? | alle Topologien nebeneinander erkennen, Umbau Bus → Stern, Kennzahlen vorher/nachher | LZ1, LZ2, LZ3 |

## Kurzplan für Station 1 (Prototyp)

- **Auftrag:** Frau Albers ruft an: „Bei uns geht gar nichts mehr!“ Finde heraus, welches einzelne Gerät das ganze Netz der Praxis lahmlegen kann.
- **Was tun die Lernenden, woran erkennt das Paket den Erfolg?** Mit „⚡ Ausfall“ Geräte und Kabel ausfallen lassen und die Erreichbarkeit beobachten. Erledigt, wenn sie sowohl einen PC oder ein Kabel als auch den Switch haben ausfallen lassen (Vergleich ist der Kern).
- **Vorführung** an einem kleineren Stern mit 4 PCs (Korbwerk-Werkstatt): 1. Paket von PC1 zu PC3 – läuft über den Switch. 2. Kabel von PC2 fällt aus – nur PC2 ist abgeschnitten (Selbsterklärung: Warum nur PC2?). 3. Paket von PC1 zu PC3 kommt trotzdem an.
- **Vorab-Frage:** Sechs PCs an einem Switch: Welche einzelnen Ausfälle trennen alle PCs voneinander? (Mehrfachauswahl: Switch defekt, Netzteil des Switches gezogen; Falschantworten Patchkabel, PC aus, gleichzeitiges Senden)
- **Kurz-Check:** C1 (LZ4) Patchkabel eines PCs bricht – was passiert? C2 (LZ1) Woran erkennst du einen Stern?
