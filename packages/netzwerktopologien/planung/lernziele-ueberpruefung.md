# Lernziele und Selbstüberprüfung: Netzwerktopologien erleben

Die Selbstüberprüfung am Ende des Pakets zählt nicht und ist beliebig oft wiederholbar; ab 80 % „sitzt das Thema“. Den Kompetenznachweis (bestanden oder nicht) legen die Lernenden außerhalb des Pakets ab (ByCS-Test der Lehrkraft).

## Lernziele (Schülersprache)

| Nr. | Lernziel | Kurzname |
|---|---|---|
| LZ1 | Ich kann Bus, Ring, Stern, Baum, Voll- und Teilvermaschung an ihrem Aufbau erkennen und benennen. | Topologien erkennen |
| LZ2 | Ich kann Vor- und Nachteile der Topologien an einem Netz begründen. | Vor- und Nachteile |
| LZ3 | Ich kann den Kabelaufwand einer Topologie berechnen und ein Netz in eine andere Topologie umbauen. | Aufwand und Umbau |
| LZ4 | Ich kann Single Points of Failure finden und die Folgen eines Ausfalls einschätzen. | Schwachstellen finden |

Gegenüber Version 1 unverändert, nur sprachlich an „Ich kann …“ angeglichen.

## Woran erkennt man das Können? (Selbstüberprüfung)

**Teil A – Handlungsaufgabe in neuer Situation (ohne Tipps)**

Situation: Autohaus Seidl – Verkaufsraum (Stern) und Werkstatt (Bus, Altbestand) hängen an einem Core-Switch; das Netz soll umgebaut werden.
Auftrag: Netz analysieren, Schwachstelle benennen, Werkstatt auf Stern umbauen.

| Prüfpunkt | Lernziel | So prüft das Paket |
|---|---|---|
| A1 Topologie von Verkaufsraum und Werkstatt richtig benannt | LZ1 | Auswahl je Bereich |
| A2 Element benannt, dessen Ausfall das ganze Autohaus trennt | LZ4 | Element im Plan anklicken (Core-Switch) |
| A3 Folge des Kabelbruchs in der Werkstatt richtig eingeschätzt | LZ4 | Zahl der betroffenen PCs |
| A4 Werkstatt zum Stern umgebaut | LZ3 | Erkennung der Topologie am Graphen |
| A5 Kabelzahl nach dem Umbau richtig angegeben | LZ3 | Zahl |
| A6 Begründung für den Umbau gewählt | LZ2 | Auswahl aus Begründungen |

**Teil B – Fragen aus dem Pool** (2 je Lernziel pro Versuch, Pool mindestens 4 je Lernziel)

| Lernziel | Fragethemen für den Pool | Fragetypen | Typische Fehler als Falschantworten |
|---|---|---|---|
| LZ1 | Topologie im Bild erkennen, Erkennungsmerkmale, Ethernet-LAN = Stern | Bildfrage, Mehrfachauswahl | Baum ↔ Teilvermascht, Ring ↔ Stern ohne Switch |
| LZ2 | Aussagen den Topologien zuordnen, „kein Vorteil von …“, Kollisionen im Bus, Token im Ring | Zuordnen, MC | „Stern hat keinen SPOF“, „Vermaschung immer besser“ |
| LZ3 | Kabelzahl Vollvermaschung, Anschlüsse je Gerät, Umbau Ring → Vollvermascht, Baum-Kabel | Zahl | n·(n−1) statt n·(n−1)/2; Uplinks vergessen |
| LZ4 | SPOF im Bild finden (Stern, Bus, Baum), Folgen im einfachen Ring, Doppelring | Hotspot, MC | PC-Ausfall legt Bus lahm; Raum-Switch trennt alles |

Bestand: Die Fragen aus Version 1 (28 im Pool) werden übernommen und um Feedback je Falschantwort ergänzt.

**Kontrolle:** Jedes Lernziel hat mindestens zwei Prüfungen (Prüfpunkte + Fragen) ☑ · Es wird nichts geprüft, was nicht geübt wird ☑
