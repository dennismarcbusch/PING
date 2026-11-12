# Steckbrief: Netzwerktopologien erleben (Version 2, Kompass 4.0)

| | |
|---|---|
| **Lernproblem** | Schüler kennen die Namen der Topologien und lernen Vor-/Nachteil-Listen auswendig. Ob sie verstanden haben, was ein Ausfall wirklich bewirkt, zeigt sich erst, wenn sie ein konkretes Netz beurteilen sollen: Dort verwechseln sie Kabel- und Geräteausfall, halten Vermaschung für „immer besser“ und rechnen den Kabelaufwand falsch. |
| **Fach / Beruf / Jahrgang** | Fachinformatik (FISI/FIAE), 10. Klasse (Eingangsklasse) |
| **Lehrplanbezug** | LF 3 „Clients in Netzwerke einbinden“; im Unterrichtsgang nach „Netzwerkkomponenten“, vor „Layer 2/Ethernet/Switching“ |
| **Vorwissen** | Netzwerkkomponenten (PC, Switch, Kabel); keine Rechenkenntnisse über Grundrechenarten hinaus |
| **Motivation, Erfahrung mit selbstständigem Lernen** | gemischt; Eingangsklasse, erste SeGeL-Erfahrungen |
| **Einsatzform** | SeGeL (Standard); Stationen auch einzeln im klassischen Unterricht nutzbar; freiwilliger Input mit Tafelbild |
| **Geräte** | PC/Laptop und Tablet |
| **Zeitrahmen** | etwa 90–120 Minuten, in Einheiten von 30–45 Minuten |
| **Leitsituation** | Ausbildungsbetrieb Korbwerk IT-Service, Ausbilderin Mira Hofmann. Kunde Praxis Lindenhof (Arztpraxis): „Bei uns geht gar nichts mehr!“ Selbstüberprüfung beim neuen Kunden Autohaus Seidl. |
| **Typische Fehler und Fehlvorstellungen** | 1. Im Stern legt der Ausfall eines PCs oder Kabels das Netz lahm (Verwechslung Endgerät ↔ Verteiler). 2. Im Bus stört der Ausfall eines PCs alle anderen (statt: Kabelbruch/fehlender Terminator). 3. Vermaschung ist immer die beste Lösung (Aufwand n·(n−1)/2 übersehen). 4. Vollvermaschung: n·(n−1) statt n·(n−1)/2 (jedes Kabel doppelt gezählt). 5. Baum: Ausfall eines Raum-Switches trennt das ganze Netz (statt nur den Teilbaum). 6. Ring = Stern ohne Switch (die Weiterleitung über die Nachbarn wird übersehen). |
| **Arbeitsmittel aus dem Beruf** | Netzplan mit Geräten und Kabeln, Ausfall eines Geräts/Kabels, Ping/Paket zwischen zwei PCs, Kabelliste |
| **Welt** | technik · Kulisse Büro (Arztpraxis) · Symbol 🕸️ |
| **Kerninhalte** | Bus, Ring, Stern, Baum, Voll- und Teilvermaschung: Aufbau, Erkennungsmerkmal, Weg eines Pakets, Folgen von Ausfällen, Single Point of Failure, Kabelzahl (Bus n+1, Ring n, Stern n, Baum Knoten−1, Vollvermascht n·(n−1)/2), Anschlüsse je Gerät, Doppelring, CSMA/CD als Grund für Kollisionen im Bus (nur als Folge, nicht vertieft) |
| **Form** | A Simulation: Netzplan, an dem man Geräte und Kabel ausfallen lässt, Pakete schickt und umbaut (siehe `konzept.md`) |
| **Paket-ID** | `ping-netzwerktopologien` (neue Aktivität in der Lernplattform; Version 1 hieß `BSLIF_Netzwerktopologien_v1`) |
| **Lizenz** | noch offen (Vorschlag CC BY-SA 4.0) |

Übernommen aus Version 1 (22.10.2026) und dem Prototyp Version 2 (28.10.2026, nicht mehr vorhanden, nur in der Projektnotiz beschrieben). Fachliche Entscheidungen, die weiter gelten:

- Einfacher Ring fällt bei jedem Ausfall komplett aus (Token); Doppelring als zuschaltbare Gegenüberstellung.
- Bus-Kabelzahl = n Anschlüsse + 1 Hauptleitung; Baum ohne Kreise, Kabel = Knoten − 1.
