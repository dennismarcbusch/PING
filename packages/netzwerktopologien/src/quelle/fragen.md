# Fragen: Netzwerktopologien erleben

Format: Kompass-Skill lernpaket-bauen, referenz/fragenformat.md. Jede Frage beginnt mit ## ID · Lernziel · Typ · Einsatz; Zeilen mit # gliedern nur.
Fragen mit Bild aus Code (P1–P6 Bildfragen, P24–P26 Hotspots) stehen in paket.js.
Der Pool für die Selbstüberprüfung (P…) stammt aus Version 1 (28 Fragen) und ist um Feedback je Falschantwort ergänzt.

# Vorab-Fragen (je Station, zugleich Leitfrage)

## V1 · LZ4 · mc · vorab

Sechs PCs an einem Switch: Welche **einzelnen** Ausfälle trennen **alle** PCs voneinander?

- [x] Der Switch ist defekt.
- [x] Der Stecker vom Netzteil des Switches wird gezogen.
- [ ] Das Patchkabel von PC3 bricht. → Dann ist nur PC3 abgeschnitten. Die anderen hängen an ihren eigenen Kabeln.
- [ ] PC3 wird ausgeschaltet. → Die anderen PCs schicken ihre Daten nicht über PC3, sondern über den Switch.
- [ ] Zwei PCs senden gleichzeitig. → Der Switch leitet beide Pakete getrennt weiter; im Stern gibt es dadurch keinen Ausfall.

> Jeder Weg führt über den Switch. Ist er defekt oder ohne Strom, ist jeder PC allein. Ein Kabel oder ein PC betrifft nur das eigene Gerät.

## V2 · LZ2 · mc · vorab

Fünf Geräte hängen an einem gemeinsamen Kabel (Bus). Welche Aussagen stimmen?

- [x] Bricht das gemeinsame Kabel, kann kein Gerät mehr senden.
- [x] Senden zwei Geräte gleichzeitig, sind beide Signale unbrauchbar.
- [ ] Fällt ein Gerät aus, fallen alle aus. → Ein Gerät am Bus hört nur mit und leitet nichts weiter. Die anderen merken seinen Ausfall nicht.
- [ ] Jedes Gerät braucht zwei Netzwerkanschlüsse. → Am Bus hat jedes Gerät genau einen Anschluss an das gemeinsame Kabel.

> Alle teilen sich ein Kabel: Bricht es, geht nichts mehr, und gleichzeitiges Senden führt zu Kollisionen. Ein einzelnes Gerät stört die anderen nicht.

## V3 · LZ4 · zahl · vorab

Einfacher Ring mit **5 PCs**, einer fällt aus: Wie viele PC-Paare können noch Daten austauschen?

= 0
- 6 → So wäre es, wenn nur der ausgefallene PC fehlt (4 · 3 / 2). Im einfachen Ring hält aber jeder Ausfall alle auf.
- 10 → 10 Paare gibt es mit allen 5 PCs. Einer ist aber ausgefallen – und der Ring ist unterbrochen.

> Im einfachen Ring muss das Token einmal ganz herum. Ist der Ring unterbrochen, darf niemand mehr senden: 0 Paare.

## V4 · LZ3 · zahl · vorab

Wie viele Kabel braucht ein **vollvermaschtes** Netz mit **6 Geräten**?

= 15
- 30 → Das ist 6 · 5: Jedes Kabel ist dabei doppelt gezählt (einmal von jedem Ende aus).
- 36 → Das ist 6 · 6. Ein Gerät braucht aber kein Kabel zu sich selbst.
- 6 → So viele Kabel hat ein Ring oder ein Stern mit 6 Geräten.

> Jedes der 6 Geräte hat 5 Partner: 6 · 5 = 30. Jedes Kabel verbindet zwei Geräte, also 30 / 2 = 15.

## V5 · LZ4 · zuordnen · vorab

Ein Netz mit einem Core-Switch und je einem Switch für Erdgeschoss und Obergeschoss (Baum). Was passiert bei welchem Ausfall?

- Der Core-Switch fällt aus. = Jedes Stockwerk arbeitet für sich, aber die Stockwerke sind getrennt.
- Der Switch im Erdgeschoss fällt aus. = Nur die PCs im Erdgeschoss sind abgeschnitten.
- Das Patchkabel eines PCs im Obergeschoss bricht. = Nur dieser eine PC ist abgeschnitten.

Wenn falsch: Überlege bei jedem Ausfall, welche Wege über dieses Teil führen.

> Ein Etagen-Switch trägt nur seinen Teilbaum, der Core-Switch verbindet die Teilbäume. Ein Patchkabel betrifft nur ein Gerät.

## V6 · LZ1 · zuordnen · vorab

Welches Merkmal gehört zu welcher Topologie?

- Jedes Gerät hat genau zwei Nachbarn. = Ring
- Mehrere Switches in Ebenen, ohne Kreis. = Baum
- Mehrere, aber nicht alle Querverbindungen. = Teilvermascht
- Ein gemeinsames Kabel für alle. = Bus

Wenn falsch: Achte auf den Verteiler: Gibt es einen, mehrere oder keinen?

> Ring: zwei Nachbarn. Baum: Verteiler in Ebenen, keine Kreise. Teilvermascht: Querverbindungen, aber nicht alle. Bus: ein Kabel für alle.

# Kurz-Checks

## C1 · LZ4 · mc · check

In der Praxis Lindenhof bricht das Patchkabel am PC im Labor. Was passiert?

- [x] Nur der Labor-PC ist vom Netz getrennt; alle anderen arbeiten weiter.
- [ ] Das ganze Netz fällt aus. → Das passiert nur, wenn der Switch ausfällt. Das Kabel des Labors liegt auf keinem anderen Weg.
- [ ] Der Labor-PC schickt seine Daten über den Nachbar-PC. → Im Stern sind die PCs nicht untereinander verbunden; jeder Weg führt über den Switch.
- [ ] Der Switch schaltet sich ab, um Fehler zu vermeiden. → Ein Switch arbeitet an seinen übrigen Ports einfach weiter.

> Im Stern hat jedes Gerät sein eigenes Kabel zum Switch. Ein Kabelbruch trennt nur dieses eine Gerät.

## C2 · LZ1 · mc · check

Woran erkennst du eine **Sterntopologie** im Netzplan?

- [x] Jedes Gerät ist mit einem eigenen Kabel an genau einen zentralen Verteiler angeschlossen.
- [ ] Alle Geräte hängen an einem gemeinsamen, durchgehenden Kabel. → Das ist der Bus: ein Kabel für alle, kein zentraler Verteiler.
- [ ] Jedes Gerät hat genau zwei Nachbarn. → Das ist der Ring: Die Geräte sind im Kreis verbunden, ohne Verteiler.
- [ ] Mehrere Switches sind übereinander verbunden. → Das ist ein Baum, also mehrere Sterne in Ebenen.

> Typisch für den Stern sind die eigenen Kabel aller Geräte zu einem zentralen Verteiler (Switch).

## C3 · LZ2 · mc · check

Warum wird das Labor-Netz langsamer, je mehr Geräte am Bus gleichzeitig senden wollen?

- [x] Alle teilen sich ein Kabel – es gibt mehr Kollisionen und Wartezeiten.
- [ ] Jedes Gerät muss das Signal verstärken. → Das passiert im Ring. Am Bus hört jedes Gerät nur mit.
- [ ] Der Switch ist überlastet. → Am Bus gibt es keinen Switch.
- [ ] Das Kabel wird mit jedem Gerät länger. → Die Länge ändert sich nicht. Entscheidend ist, dass immer nur einer senden kann.

> Auf dem gemeinsamen Kabel darf immer nur einer senden. Mehr Geräte heißt mehr Kollisionen und mehr Warten (CSMA/CD).

## C4 · LZ4 · mc · check

Am Bus des Labors fehlt an einem Ende der Abschlusswiderstand. Was ist die Folge?

- [x] Signale werden am Kabelende zurückgeworfen; das ganze Netz ist gestört.
- [ ] Nur das Gerät am Ende des Kabels ist gestört. → Die zurückgeworfenen Signale laufen über das ganze Kabel und stören alle.
- [ ] Nichts, der Abschlusswiderstand ist nur Schutz gegen Staub. → Er schließt das Kabel elektrisch ab, damit keine Signale zurückkommen.

> Ohne Abschlusswiderstand wird das Signal reflektiert und überlagert sich mit den echten Signalen – kein Gerät kann mehr sauber senden.

## C5 · LZ2 · mc · check

Was ist ein typischer **Vorteil** des Rings mit Token?

- [x] Keine Kollisionen – jede Station kommt sicher an die Reihe.
- [ ] Der Ausfall einer Station hat keine Folgen. → Im einfachen Ring legt jeder Ausfall alles lahm.
- [ ] Er braucht am wenigsten Kabel von allen Topologien. → Der Ring braucht n Kabel, genauso viele wie der Stern.
- [ ] Keine Station muss Daten weiterleiten. → Im Ring leitet jede Station die Daten weiter.

> Nur wer das Token hat, sendet. Dadurch gibt es keine Kollisionen und berechenbare Wartezeiten.

## C6 · LZ4 · mc · check

Was macht einen Ring ausfallsicherer?

- [x] Ein zweiter Ring, der in die Gegenrichtung läuft (Doppelring)
- [ ] Abschlusswiderstände an beiden Enden → Die braucht der Bus. Ein Ring hat keine Enden.
- [ ] Mehr Stationen im Ring → Jede weitere Station ist eine weitere mögliche Unterbrechung.
- [ ] Ein Switch in der Mitte → Dann wäre es kein Ring mehr, sondern ein Stern.

> Der zweite, gegenläufige Ring schließt die Lücke, wenn eine Station oder ein Kabel ausfällt.

## C7 · LZ3 · zahl · check

Wie viele Netzwerkanschlüsse braucht **jedes** Gerät in einem vollvermaschten Netz mit **8 Geräten**?

= 7
- 8 → Ein Gerät braucht keinen Anschluss zu sich selbst.
- 28 → 28 ist die Zahl der Kabel im ganzen Netz, nicht die Anschlüsse eines Geräts.

> Jedes Gerät ist mit allen anderen verbunden: n − 1 = 7 Anschlüsse.

## C8 · LZ2 · mc · check

Die Praxis will Ausfallsicherheit, aber nicht zu viele Leitungen. Welche Lösung passt?

- [x] Teilvermaschung: einige Querverbindungen, damit es Umwege gibt
- [ ] Vollvermaschung: Sie ist immer die beste Lösung. → Sie ist am ausfallsichersten, aber der Kabelaufwand wächst sehr schnell.
- [ ] Bus: wenig Kabel und trotzdem ausfallsicher → Am Bus legt ein einziger Kabelbruch alles lahm.
- [ ] Ring ohne Doppelring → Ein einfacher Ring fällt bei jedem Ausfall ganz aus.

> Teilvermaschung ist der Kompromiss: Umwege bei Ausfällen, aber deutlich weniger Kabel als Vollvermaschung.

## C9 · LZ3 · zahl · check

Ein Baum: 1 Core-Switch, 2 Etagen-Switches, 8 PCs. Jedes Gerät hat genau ein Kabel nach oben. Wie viele Kabel sind es?

= 10
- 8 → Die Uplinks der beiden Etagen-Switches zum Core fehlen.
- 11 → Der Core-Switch hat kein Kabel nach oben – er ist die Spitze.

> Ein Baum hat immer Geräte − 1 Kabel: 11 − 1 = 10 (8 PC-Kabel + 2 Uplinks).

## C10 · LZ4 · mc · check

In der Praxis fällt der Switch im Obergeschoss aus. Was passiert?

- [x] Die PCs im Obergeschoss sind abgeschnitten; das Erdgeschoss arbeitet weiter.
- [ ] Das ganze Netz fällt aus. → Das wäre beim Core-Switch so – und auch dann arbeiten die Stockwerke für sich weiter.
- [ ] Nichts, die PCs nutzen automatisch den Switch im Erdgeschoss. → Die PCs oben haben nur ein Kabel, und das endet am ausgefallenen Switch.

> Im Baum trennt ein Etagen-Switch nur seinen eigenen Teilbaum.

# Wiederholung (ab Station 3)

## W1 · LZ4 · mc · check

Zurück zum Bus: Ein Gerät am Bus wird ausgeschaltet, das Kabel bleibt ganz. Was passiert?

- [x] Die anderen Geräte arbeiten normal weiter.
- [ ] Das ganze Netz fällt aus. → Erst ein Bruch des gemeinsamen Kabels legt alles lahm. Ein Gerät hört nur mit.
- [ ] Der Bus wird automatisch zum Ring. → Die Verkabelung ändert sich nicht.

> Die Geräte hängen passiv am Kabel. Fällt eines aus, bleibt der Weg für die anderen frei.

## W2 · LZ4 · mc · check

Zurück zum Ring: Im **einfachen** Ring fällt eine Station aus. Was ist die Folge?

- [x] Der Ring ist unterbrochen – niemand kann mehr senden.
- [ ] Nur diese Station ist nicht erreichbar. → So wäre es im Stern oder im Doppelring.
- [ ] Die Daten laufen automatisch in die andere Richtung. → Das kann erst der Doppelring.

> Ohne zweiten Ring kann das Token nicht mehr kreisen.

## W3 · LZ3 · zahl · check

Zurück zur Vermaschung: Wie viele Kabel braucht ein vollvermaschtes Netz mit **7 Geräten**?

= 21
- 42 → 7 · 6 zählt jedes Kabel doppelt. Teile durch 2.
- 49 → 7 · 7: Ein Gerät braucht kein Kabel zu sich selbst.

> n · (n − 1) / 2 = 7 · 6 / 2 = 21.

## W4 · LZ4 · mc · check

Zurück zum Baum: Welches Gerät ist im Baum besonders kritisch?

- [x] Der Core-Switch, weil er die Teilbäume verbindet
- [ ] Der PC am Empfang, weil dort die meisten Daten anfallen → Ein einzelner PC ist für die Wege der anderen egal.
- [ ] Jeder Etagen-Switch trennt das ganze Netz. → Er trennt nur seinen eigenen Teilbaum.

> Fällt der Core-Switch aus, sind alle Teilbäume voneinander getrennt.

## C11 · LZ1 · mc · check

Ein heutiges Ethernet-Netz, in dem alle PCs eines Klassenzimmers an einem Switch hängen, ist eine …

- [x] Sterntopologie
- [ ] Bustopologie → Busse mit Koaxialkabel sind veraltet. Am Switch hat jeder PC sein eigenes Kabel.
- [ ] Ringtopologie → Die PCs sind nicht untereinander verbunden.
- [ ] Vollvermaschung → Dann wäre jeder PC mit jedem anderen direkt verbunden.

> Jeder PC hat ein eigenes Kabel zum zentralen Switch – das ist ein Stern.

## C12 · LZ1 · mc · check

Mehrere Switches hängen an einem zentralen Switch, an ihnen die PCs. Es gibt keine Kreise. Wie heißt diese Topologie?

- [x] Baum
- [ ] Teilvermascht → Teilvermascht hätte Querverbindungen und damit Kreise.
- [ ] Stern → Ein Stern hat nur einen Verteiler.
- [ ] Ring → Im Ring gibt es keinen Verteiler; jedes Gerät hat zwei Nachbarn.

> Hierarchisch gekoppelte Sterne ohne Kreise ergeben einen Baum (erweiterter Stern).

# Pool für die Selbstüberprüfung

# LZ1 · Topologien erkennen (P1–P6 als Bildfragen in paket.js)

## P7 · LZ1 · mc · selbstueberpruefung

Mehrere Switches sind hierarchisch über einen zentralen Switch verbunden, an ihnen hängen die Endgeräte. Wie heißt diese Topologie?

- [x] Baum (erweiterter Stern)
- [ ] Teilvermascht → Teilvermaschte Netze haben Querverbindungen mit Kreisen; hier gibt es Ebenen ohne Kreise.
- [ ] Ring → Im Ring gibt es keine Verteiler.
- [ ] Bus → Am Bus hängen alle an einem Kabel, nicht an Switches.

> Hierarchisch gekoppelte Sterne ohne Kreise ergeben eine Baumtopologie.

## P8 · LZ1 · mc · selbstueberpruefung

Ein modernes Ethernet-LAN, in dem alle PCs an **einem** Switch hängen, ist eine …

- [x] Sterntopologie
- [ ] Bustopologie → Am Switch hat jeder PC ein eigenes Kabel, es gibt kein gemeinsames Kabel.
- [ ] Ringtopologie → Die PCs reichen keine Daten an Nachbarn weiter.
- [ ] Vollvermaschung → Die PCs sind nicht direkt miteinander verbunden.

> Jedes Gerät hat ein eigenes Kabel zum zentralen Switch – das ist ein Stern.

## P9 · LZ1 · mc · selbstueberpruefung

Woran erkennt man eine **Bustopologie**?

- [x] Alle Geräte teilen sich ein durchgehendes Kabel, das an beiden Enden abgeschlossen ist.
- [ ] Jedes Gerät hat genau zwei Nachbarn. → Das beschreibt den Ring.
- [ ] Alle Geräte hängen an einem zentralen Verteiler. → Das beschreibt den Stern.
- [ ] Jedes Gerät ist mit jedem anderen verbunden. → Das beschreibt die Vollvermaschung.

> Typisch für den Bus sind das gemeinsame Kabel und die Abschlusswiderstände an den Enden.

# LZ2 · Vor- und Nachteile

## P10 · LZ2 · zuordnen · selbstueberpruefung

Ordne jede Aussage der passenden Topologie zu.

- Alle teilen sich ein Kabel – gleichzeitiges Senden führt zu Kollisionen. = Bus
- Ein Token wird von Station zu Station weitergereicht. = Ring
- Fällt der zentrale Verteiler aus, steht das ganze Netz still. = Stern
- Der Kabelaufwand wächst sehr schnell mit der Zahl der Geräte. = Vollvermascht

Wenn falsch: Denk bei jeder Aussage an das eine Merkmal, das sie beschreibt: gemeinsames Kabel, Token, Verteiler, jedes mit jedem.

> Bus: gemeinsames Kabel und Kollisionen. Ring: Token. Stern: zentraler Verteiler als Schwachstelle. Vollvermascht: n · (n − 1) / 2 Kabel.

## P11 · LZ2 · zuordnen · selbstueberpruefung

Ordne jede Aussage der passenden Topologie zu.

- Typisch für Schul- und Firmennetze mit Core-, Etagen- und Raum-Switches. = Baum
- Das Internet ist ein Beispiel dafür. = Teilvermascht
- Ein fehlender Abschlusswiderstand stört das gesamte Netz. = Bus
- Jede Station frischt das Signal auf und gibt es an ihren Nachbarn weiter. = Ring

Wenn falsch: Verteiler in Ebenen → Baum; viele Wege, aber nicht alle → teilvermascht; Kabelenden → Bus; Nachbarn → Ring.

> Baum: Switches in Ebenen. Internet: teilvermascht. Abschlusswiderstand: Bus. Weiterreichen an den Nachbarn: Ring.

## P12 · LZ2 · mc · selbstueberpruefung

Welche Aussage ist **kein** Vorteil der Sterntopologie?

- [x] Es gibt keinen Single Point of Failure.
- [ ] Ein defektes Patchkabel betrifft nur ein Gerät. → Das ist ein Vorteil: Jedes Gerät hat sein eigenes Kabel.
- [ ] Neue Geräte lassen sich einfach anschließen. → Das ist ein Vorteil: einfach ein Kabel zum Switch.
- [ ] Fehler lassen sich leicht eingrenzen. → Das ist ein Vorteil: Ein Fehler betrifft meist nur ein Kabel.

> Der zentrale Switch ist sehr wohl ein Single Point of Failure.

## P13 · LZ2 · mc · selbstueberpruefung

Warum sinkt die Leistung eines Busnetzes, wenn viele Stationen viel senden?

- [x] Alle teilen sich ein Kabel – es gibt mehr Kollisionen und Wartezeiten (CSMA/CD).
- [ ] Jedes Gerät muss das Signal verstärken. → Verstärken und Weiterreichen gibt es im Ring.
- [ ] Der Switch ist überlastet. → Am Bus gibt es keinen Switch.
- [ ] Die Kabel werden automatisch länger. → Die Kabellänge ändert sich nicht.

> Im Bus darf immer nur einer senden. Mehr Stationen bedeuten mehr Kollisionen und Wartezeiten.

## P14 · LZ2 · mc · selbstueberpruefung

Was ist ein typischer Vorteil des Rings mit Token Passing?

- [x] Kollisionsfreier Zugriff – jede Station kommt sicher an die Reihe.
- [ ] Der Ausfall einer Station hat keine Folgen. → Im einfachen Ring legt jeder Ausfall das ganze Netz lahm.
- [ ] Er ist die günstigste aller Topologien. → Der Bus braucht weniger aktive Technik und ist günstiger.
- [ ] Keine Station muss Daten weiterleiten. → Gerade im Ring leitet jede Station weiter.

> Nur wer das Token hat, sendet – dadurch gibt es keine Kollisionen und berechenbare Wartezeiten.

## P15 · LZ2 · mc · selbstueberpruefung

Was ist der wichtigste Nachteil der Teilvermaschung?

- [x] Wegewahl (Routing) und Planung sind aufwendiger.
- [ ] Ein einzelner Kabelbruch legt das ganze Netz lahm. → Gerade das verhindert die Vermaschung: Es gibt Umwege.
- [ ] Sie benötigt Abschlusswiderstände. → Die braucht nur der Bus.
- [ ] Sie hat den höchsten Kabelbedarf aller Topologien. → Den höchsten Bedarf hat die Vollvermaschung.

> Weil es mehrere Wege gibt, muss ein passender Weg gewählt werden – das erfordert Routing.

# LZ3 · Aufwand und Umbau

## P16 · LZ3 · zahl · selbstueberpruefung

Wie viele Verbindungen benötigt ein vollvermaschtes Netz mit **6 Geräten**?

= 15
- 30 → 6 · 5 zählt jedes Kabel doppelt. Teile durch 2.
- 36 → 6 · 6: Ein Gerät braucht kein Kabel zu sich selbst.

> n · (n − 1) / 2 = 6 · 5 / 2 = 15.

## P17 · LZ3 · zahl · selbstueberpruefung

Wie viele Verbindungen benötigt ein vollvermaschtes Netz mit **10 Geräten**?

= 45
- 90 → 10 · 9 zählt jedes Kabel doppelt. Teile durch 2.
- 100 → 10 · 10: Ein Gerät braucht kein Kabel zu sich selbst.

> n · (n − 1) / 2 = 10 · 9 / 2 = 45.

## P18 · LZ3 · zahl · selbstueberpruefung

Wie viele Netzwerkanschlüsse braucht **jedes** Gerät in einem vollvermaschten Netz mit **8 Geräten**?

= 7
- 8 → Ein Gerät braucht keinen Anschluss zu sich selbst.
- 28 → 28 ist die Zahl der Kabel im ganzen Netz, nicht die Anschlüsse eines Geräts.

> Jedes Gerät ist mit allen anderen verbunden: n − 1 = 7 Anschlüsse.

## P19 · LZ3 · zahl · selbstueberpruefung

Ein Ring mit 5 PCs soll zu einer Vollvermaschung werden. Wie viele Kabel musst du **zusätzlich** verlegen?

= 5
- 10 → 10 Kabel hat die fertige Vollvermaschung. Der Ring hat aber schon 5.
- 20 → 5 · 4 zählt jedes Kabel doppelt.

> Vollvermaschung: 5 · 4 / 2 = 10 Kabel. Der Ring hat bereits 5 – es fehlen 5.

## P20 · LZ3 · zahl · selbstueberpruefung

Ein Baum besteht aus 1 Core-Switch, 3 Etagen-Switches und 12 PCs. Jeder PC und jeder Etagen-Switch hat genau einen Uplink. Wie viele Kabel werden benötigt?

= 15
- 12 → Die 3 Uplinks der Etagen-Switches zum Core fehlen.
- 16 → 16 ist die Zahl der Geräte. Ein Baum hat ein Kabel weniger als Geräte.

> Ein Baum hat immer Geräte − 1 Kabel: 16 − 1 = 15 (12 PC-Kabel + 3 Uplinks).

## P21 · LZ3 · mc · selbstueberpruefung

Du baust einen Stern mit 8 PCs zu einem Ring um. Was ändert sich?

- [x] Der Switch entfällt, jeder PC braucht zwei Anschlüsse; es bleiben 8 Kabel.
- [ ] Man braucht 16 Kabel. → Jedes Kabel verbindet zwei Nachbarn: 8 PCs im Kreis brauchen 8 Kabel.
- [ ] Jeder PC braucht weiterhin nur einen Anschluss. → Im Ring hat jeder PC zwei Nachbarn, also zwei Anschlüsse.
- [ ] Es wird ein zweiter Switch benötigt. → Ein Ring kommt ganz ohne Switch aus.

> Ring und Stern brauchen beide n Kabel – aber im Ring hat jeder PC zwei Nachbarn.

# LZ4 · Schwachstellen finden (P24–P26 als Hotspots in paket.js)

## P22 · LZ4 · mc · selbstueberpruefung

In einem einfachen Ring (ohne Doppelring) fällt eine Station aus. Was ist die Folge?

- [x] Der Ring ist unterbrochen – das gesamte Netz fällt aus.
- [ ] Nur diese Station ist nicht erreichbar. → So wäre es im Stern oder im Doppelring.
- [ ] Die Daten werden automatisch über den Switch umgeleitet. → Ein Ring hat keinen Switch.
- [ ] Nichts, Ringe sind grundsätzlich ausfallsicher. → Erst der Doppelring überbrückt einen Ausfall.

> Ohne zweiten Ring kann das Token nicht mehr kreisen.

## P23 · LZ4 · mc · selbstueberpruefung

Welche Maßnahme macht eine Ringtopologie ausfallsicherer?

- [x] Ein Doppelring mit gegenläufiger Datenrichtung
- [ ] Abschlusswiderstände an beiden Enden → Die gehören zum Bus; ein Ring hat keine Enden.
- [ ] Ein Hub in der Mitte → Dann wäre es kein Ring mehr, sondern ein Stern.
- [ ] Mehr Stationen im Ring → Jede Station ist eine weitere mögliche Unterbrechung.

> Der zweite, gegenläufige Ring überbrückt eine Unterbrechung.

## P27 · LZ4 · mc · selbstueberpruefung

Bei welcher Topologie bleiben nach dem Ausfall eines beliebigen **einzelnen Kabels** garantiert alle Geräte erreichbar?

- [x] Vollvermascht
- [ ] Stern → Bricht ein Patchkabel, ist dieses Gerät abgeschnitten.
- [ ] Bus → Bricht das gemeinsame Kabel, ist alles weg.
- [ ] Baum → Bricht ein Uplink, ist der ganze Teilbaum abgeschnitten.

> In der Vollvermaschung gibt es zu jeder Verbindung viele Umwege.

## P28 · LZ4 · mc · selbstueberpruefung

In einem Busnetz fällt ein PC aus, das Bus-Kabel bleibt intakt. Was passiert?

- [x] Die übrigen Stationen arbeiten normal weiter.
- [ ] Das gesamte Netz fällt aus. → Das passiert erst bei einem Bruch des Bus-Kabels.
- [ ] Der Bus wird automatisch zum Ring. → Die Verkabelung ändert sich nicht.
- [ ] Alle Stationen müssen neu gestartet werden. → Die anderen merken den Ausfall nicht.

> Die Endgeräte sind passiv angeschlossen – der Ausfall eines einzelnen PCs stört die anderen nicht.
