# Fragen: Strukturierte Verkabelung

Format: Kompass-Skill lernpaket-bauen, referenz/fragenformat.md. Jede Frage beginnt mit ## ID · Lernziel · Typ · Einsatz; Zeilen mit # gliedern nur.
Die zehn Fragen des Wissenschecks aus Version 1 sind übernommen (C3–C7, W1, W2, P5, P9, P10) und um Feedback je Falschantwort ergänzt.

# Vorab-Fragen (je Kapitel, zugleich Leitfrage)

## V1 · LZ1 · zuordnen · vorab

Welche Verbindung gehört zu welchem Bereich?

- Standortverteiler ↔ Gebäudeverteiler = Primärbereich
- Gebäudeverteiler ↔ Etagenverteiler = Sekundärbereich
- Etagenverteiler ↔ Anschlussdose am Arbeitsplatz = Tertiärbereich

Wenn falsch: Die Bereiche zählen von außen nach innen: erst zwischen den Gebäuden, dann im Gebäude, dann auf der Etage.

> Primär verbindet die Gebäude (SV – GV), sekundär die Etagen (GV – EV), tertiär die Arbeitsplätze (EV – Dose).

## V2 · LZ2 · zuordnen · vorab

Welches Medium ist in welchem Bereich üblich?

- Primärbereich = LWL Singlemode (OS2)
- Sekundärbereich = LWL Multimode (OM4)
- Tertiärbereich = Kupfer Cat.7

Wenn falsch: Je länger die Strecke, desto eher Glasfaser – und für die längsten Strecken Singlemode.

> Zwischen Gebäuden Singlemode (größte Reichweite), im Gebäude Multimode, am Arbeitsplatz Kupfer mit RJ45-Dose.

## V3 · LZ3 · zahl · vorab

Wie viele Meter darf das fest verlegte Kabel vom Etagenverteiler bis zur Anschlussdose höchstens lang sein?

= 90 m
- 100 → 100 m ist der ganze Channel, also mit Patch- und Geräteschnüren. Das fest verlegte Kabel darf nur 90 m lang sein.
- 500 → 500 m gelten im Sekundärbereich (GV – EV), nicht am Arbeitsplatz.

> Permanent Link höchstens 90 m, dazu höchstens 10 m Schnüre: zusammen 100 m.

## V4 · LZ2 · mc · vorab

Warum verbindet man zwei Gebäude mit Glasfaser statt mit Kupfer?

- [x] Glasfaser leitet keinen Strom: keine Ausgleichsströme zwischen den Gebäuden, keine Blitzschäden.
- [x] Glasfaser überbrückt große Entfernungen.
- [ ] Glasfaser ist billiger als Kupfer. → Glasfaser und die Technik dazu sind meist teurer. Gewählt wird sie wegen Sicherheit und Reichweite.
- [ ] Kupferkabel dürfen nicht in die Erde. → Es gibt Erdkabel aus Kupfer. Das Problem sind die unterschiedlichen Erdpotentiale der Gebäude.

> Jedes Gebäude hat sein eigenes Erdpotential. Ein Kupferkabel dazwischen leitet Ausgleichsströme und bei Gewitter Überspannung weiter. Glasfaser trennt galvanisch und reicht weit.

# Kurz-Checks

## C1 · LZ1 · mc · check

Ein Kabel führt vom Etagenverteiler im 1. OG zur Dose im EDV-Raum 201. Zu welchem Bereich gehört es?

- [x] Tertiärbereich
- [ ] Sekundärbereich → Der Sekundärbereich verbindet den Gebäudeverteiler mit den Etagenverteilern.
- [ ] Primärbereich → Der Primärbereich verbindet den Standortverteiler mit den Gebäudeverteilern.

> Vom Etagenverteiler bis zur Anschlussdose reicht der Tertiärbereich.

## C2 · LZ2 · mc · check

Warum wird ein neuer Arbeitsplatz mit Cat.7 und nicht mit Cat.5e angeschlossen?

- [x] Cat.7 ist besser geschirmt und schafft 10 Gbit/s; die Verkabelung soll viele Jahre halten.
- [ ] Cat.5e darf nur im Primärbereich liegen. → Im Primärbereich liegt Glasfaser, kein Kupfer.
- [ ] Cat.7 darf länger als 90 m sein. → Die Grenze von 90 m gilt für jedes Kupferkabel im Tertiärbereich.
- [ ] Cat.5e passt nicht in RJ45-Dosen. → Auch Cat.5e wird mit RJ45 angeschlossen.

> Die Verkabelung wird einmal verlegt und hält 15 Jahre und mehr. Deshalb nimmt man die Kategorie mit Reserve: Cat.7, geschirmt, 10 Gbit/s.

## C3 · LZ1 · mc · check

Welche Verbindung gehört zum **Sekundärbereich**?

- [x] Gebäudeverteiler ↔ Etagenverteiler
- [ ] Standortverteiler ↔ Gebäudeverteiler → Das ist der Primärbereich.
- [ ] Etagenverteiler ↔ Anschlussdose → Das ist der Tertiärbereich.
- [ ] Anschlussdose ↔ PC → Das ist das Patchkabel am Arbeitsplatz, es gehört zu keinem der drei Bereiche.

> Der Sekundärbereich (Steigbereich) verbindet den Gebäudeverteiler mit den Etagenverteilern innerhalb eines Gebäudes.

## C4 · LZ4 · mc · check

Wie viele Gebäudeverteiler hat ein Gebäude?

- [x] Genau einen – er darf im selben Raum wie der SV oder ein EV stehen.
- [ ] Einen pro Etage → Pro Etage gibt es Etagenverteiler; der GV verbindet sie.
- [ ] Beliebig viele → Dann gäbe es mehrere Wege – das ist kein hierarchischer Stern mehr.
- [ ] Keinen, wenn dort der SV steht → SV und GV sind getrennte Ebenen, auch wenn sie im selben Raum stehen.

> Jedes Gebäude hat genau einen GV. Er kann räumlich mit SV oder EV zusammenstehen, bleibt aber eine eigene Ebene.

## C5 · LZ3 · mc · check

Eine Etage ist 120 m lang, der Technikraum liegt an einem Ende. Was ist richtig?

- [x] Ein zusätzlicher EV wird eingeplant oder der EV zentraler aufgestellt, sodass alle Strecken höchstens 90 m lang sind.
- [ ] Ein EV im Technikraum reicht immer. → Vom Ende einer 120-m-Etage werden einige Strecken länger als 90 m.
- [ ] Man nimmt Cat.5e, weil es längere Strecken erlaubt. → Für alle Kupferkategorien gilt dieselbe Grenze von 90 m.
- [ ] Man hängt einen Repeater in den Flur. → Aktive Geräte im Flur sind nicht vorgesehen; der Flur muss frei bleiben.

> Auf einer Etage dürfen mehrere EVs stehen. Entscheidend ist, dass jede Dose innerhalb von 90 m erreichbar ist.

## C6 · LZ5 · mc · check

Wo darf ein Verteilerschrank **nicht** stehen?

- [x] Im Flur
- [ ] Im Technikraum → Das ist der richtige Ort: abschließbar und belüftet.
- [ ] Im Serverraum → Auch gut: abgeschlossen und gekühlt.
- [ ] In einem abschließbaren Nebenraum → Für Etagenverteiler zulässig.

> Flure sind Fluchtwege und müssen frei bleiben; außerdem fehlt dort der Zutrittsschutz.

## W1 · LZ1 · mc · check

Zurück zu Haus A: Wo endet das Tertiärkabel eines PCs im 1. OG?

- [x] Am Etagenverteiler des 1. OG
- [ ] Am Gebäudeverteiler im EG → Dann würde der Etagenverteiler übersprungen.
- [ ] Am Etagenverteiler im EG → Tertiärkabel bleiben auf ihrer Etage.
- [ ] Direkt am Standortverteiler → Dann würden zwei Ebenen übersprungen.

> Die Tertiärverkabelung bleibt auf der Etage – jedes Endgerät hängt am EV seiner Etage.

## C7 · LZ2 · mc · check

Welches Medium ist im **Primärbereich** Standard?

- [x] LWL Singlemode OS2
- [ ] LWL Multimode OM4 → Multimode ist im Gebäude üblich. Für die langen Strecken zwischen Gebäuden nimmt man Singlemode.
- [ ] Cat.7 S/FTP → Kupfer zwischen Gebäuden ist wegen der Erdpotentiale gefährlich und reicht nur 90 m.
- [ ] Koaxialkabel → Koaxialkabel kommt in der strukturierten Verkabelung nicht vor.

> Singlemode-Fasern (OS2) bieten die größte Reichweite und Bandbreitenreserve.

## C8 · LZ3 · zahl · check

Wie lang darf eine Strecke im **Primärbereich** höchstens sein?

= 1500 m
- 500 → 500 m gelten im Sekundärbereich.
- 90 → 90 m gelten im Tertiärbereich.

> Primärbereich höchstens 1500 m, Sekundärbereich 500 m, Tertiärbereich 90 m.

## W2 · LZ4 · mc · check

Welche Topologie schreibt die strukturierte Verkabelung vor?

- [x] Hierarchischer Stern (Baum)
- [ ] Ring → Ein Ring fällt bei einer Unterbrechung ganz aus.
- [ ] Bus → Ein gemeinsames Kabel für alle ist veraltet und störanfällig.
- [ ] Vollvermascht → Viel zu viele Kabel; jeder Verteiler hängt nur an einem darüber.

> SV → GV → EV → Anschlussdose bilden einen hierarchischen Stern.

# Pool für die Selbstüberprüfung

# LZ1 · Bereiche zuordnen

## P1 · LZ1 · zuordnen · selbstueberpruefung

Ordne jede Strecke im Autohaus dem Bereich zu.

- Serverraum Verkaufshaus (SV) → Technikraum Werkstatthalle (GV) = Primärbereich
- GV Verkaufshaus → EV im 1. OG = Sekundärbereich
- EV im 1. OG → Dose im Büro des Chefs = Tertiärbereich

Wenn falsch: Achte auf die Schränke an beiden Enden: SV, GV, EV oder Dose?

> Entscheidend sind die Ebenen an den Enden: SV – GV primär, GV – EV sekundär, EV – Dose tertiär.

## P2 · LZ1 · mc · selbstueberpruefung

Der Standortverteiler steht im selben Raum wie der Gebäudeverteiler von Haus A. Zu welchem Bereich gehört das kurze Kabel zwischen beiden?

- [x] Primärbereich
- [ ] Zu keinem, weil beide im selben Raum stehen → Der Bereich hängt von den Ebenen ab, nicht von der Entfernung.
- [ ] Sekundärbereich → Sekundär ist GV – EV.

> SV – GV ist immer Primärbereich, auch wenn beide Schränke nebeneinanderstehen.

## P3 · LZ1 · mc · selbstueberpruefung

Ein PC ist direkt an den Gebäudeverteiler angeschlossen. Was ist falsch?

- [x] Der Etagenverteiler wird übersprungen – der PC gehört an den EV seiner Etage.
- [ ] Nichts, kürzer ist besser. → Die Ebenen dürfen nicht übersprungen werden, auch wenn der Weg kürzer wäre.
- [ ] Das Kabel muss Glasfaser sein. → Das Problem ist nicht das Medium, sondern die übersprungene Ebene.

> Jeder Arbeitsplatz hängt am EV seiner Etage; der GV verbindet nur Etagenverteiler.

## P4 · LZ1 · mc · selbstueberpruefung

Welcher Bereich verbindet **verschiedene Gebäude** eines Standorts?

- [x] Primärbereich
- [ ] Sekundärbereich → Der Sekundärbereich bleibt innerhalb eines Gebäudes.
- [ ] Tertiärbereich → Der Tertiärbereich bleibt auf einer Etage.

> Der Primärbereich (Campusverkabelung) verbindet den Standortverteiler mit den Gebäudeverteilern.

# LZ2 · Medium wählen

## P5 · LZ2 · mc · selbstueberpruefung

Warum werden Gebäude untereinander mit Lichtwellenleitern verbunden?

- [x] LWL trennt galvanisch (keine Ausgleichsströme, Schutz vor Überspannung) und überbrückt große Distanzen.
- [ ] LWL ist billiger als Kupfer. → Meist ist es teurer; gewählt wird es wegen Sicherheit und Reichweite.
- [ ] Kupferkabel dürfen grundsätzlich nicht im Erdreich verlegt werden. → Das stimmt nicht; das Problem sind die Erdpotentiale.
- [ ] LWL lässt sich leichter selbst konfektionieren. → Im Gegenteil: Glasfaser braucht Spezialwerkzeug.

> Unterschiedliche Erdpotentiale der Gebäude und Blitzeinwirkung machen Kupfer gefährlich; LWL leitet keinen Strom und reicht weit.

## P6 · LZ2 · zuordnen · selbstueberpruefung

Ordne jedem Bereich das übliche Medium zu.

- Primärbereich = LWL Singlemode (OS2)
- Sekundärbereich = LWL Multimode (OM4)
- Tertiärbereich = Kupfer Cat.7

Wenn falsch: Je länger die Strecke, desto eher Glasfaser – Singlemode für die längsten.

> Zwischen Gebäuden Singlemode, im Gebäude Multimode, am Arbeitsplatz Kupfer.

## P7 · LZ2 · mc · selbstueberpruefung

Warum führt man Glasfaser normalerweise nicht bis zum Arbeitsplatz?

- [x] PCs haben Kupferanschlüsse (RJ45); auf 90 m schafft Cat.7 ohnehin 10 Gbit/s.
- [ ] Glasfaser darf nicht in Büroräume. → Das ist nicht verboten, nur unüblich und teuer.
- [ ] Glasfaser ist zu langsam für Arbeitsplätze. → Glasfaser ist schneller; sie wird nur nicht gebraucht.

> Kupfer passt zu den Anschlüssen der Geräte und reicht auf kurzer Strecke völlig aus.

## P8 · LZ2 · mc · selbstueberpruefung

Ein Steigbereich (GV → EV) von 40 m wurde mit Cat.7 verlegt. Wie ist das zu bewerten?

- [x] Bis 90 m erlaubt, üblich und besser ist aber LWL Multimode.
- [ ] Verboten, im Gebäude muss immer Glasfaser liegen. → Kupfer bis 90 m ist zulässig, nur nicht empfohlen.
- [ ] Optimal, weil Kupfer im Gebäude Standard ist. → Im Steigbereich ist LWL Multimode Standard: mehr Bandbreite, unempfindlich gegen Störungen.

> Kupfer ist bis 90 m zulässig, im Steigbereich wird aber LWL Multimode empfohlen.

# LZ3 · Längen einhalten

## P9 · LZ3 · mc · selbstueberpruefung

Wie lang darf das fest verlegte Kabel im Tertiärbereich (Permanent Link) höchstens sein?

- [x] 90 m
- [ ] 50 m → So kurz muss es nicht sein.
- [ ] 100 m → 100 m ist der Channel inklusive Patch- und Geräteschnüren.
- [ ] 500 m → 500 m gelten im Sekundärbereich.

> 90 m Permanent Link + höchstens 10 m Patch- und Geräteschnüre ergeben den 100-m-Channel.

## P10 · LZ3 · mc · selbstueberpruefung

Wie lang darf eine Strecke im Sekundärbereich höchstens sein?

- [x] 500 m
- [ ] 90 m → 90 m gelten im Tertiärbereich (und für Kupfer).
- [ ] 300 m → Das ist kein Grenzwert der Norm.
- [ ] 1500 m → 1500 m gelten im Primärbereich.

> Sekundärbereich höchstens 500 m; Primärbereich höchstens 1500 m.

## P11 · LZ3 · zahl · selbstueberpruefung

Wie viele Meter Patch- und Geräteschnüre dürfen zum Permanent Link höchstens dazukommen?

= 10 m
- 100 → 100 m ist der ganze Channel.
- 90 → 90 m ist der Permanent Link selbst.

> Channel 100 m = Permanent Link 90 m + Schnüre 10 m.

## P12 · LZ3 · mc · selbstueberpruefung

Im Werkstattgebäude ist das längste Kabel vom EV zu einer Dose 104 m lang. Was tust du?

- [x] Den EV zentraler aufstellen oder einen zweiten EV einplanen.
- [ ] Ein längeres Patchkabel nehmen. → Damit wird die Strecke noch länger.
- [ ] Cat.5e statt Cat.7 verlegen. → Die Grenze von 90 m gilt für jede Kupferkategorie.
- [ ] Nichts, 104 m ist noch im Rahmen. → Der Permanent Link darf höchstens 90 m lang sein.

> Zu lange Tertiärstrecken löst man über den Standort der Verteiler: zentraler oder ein zusätzlicher EV.

# LZ4 · Hierarchischer Stern

## P13 · LZ4 · mc · selbstueberpruefung

Wie viele Verbindungen zur Ebene darüber hat ein Etagenverteiler im hierarchischen Stern?

- [x] Genau eine
- [ ] Zwei, damit es ausfallsicher ist → Zusätzliche Wege sind in der Grundstruktur nicht vorgesehen; sie bräuchten besondere Technik.
- [ ] So viele, wie es Gebäudeverteiler gibt → Ein EV hängt nur am GV seines Gebäudes.

> Im hierarchischen Stern hat jedes Gerät genau eine Verbindung zur nächsthöheren Ebene.

## P14 · LZ4 · mc · selbstueberpruefung

Zwei Etagenverteiler auf derselben Etage werden direkt verbunden. Wie ist das zu bewerten?

- [x] Falsch: Verteiler derselben Ebene werden nicht verbunden; beide hängen am GV.
- [ ] Richtig, weil es der kürzeste Weg ist. → Kürze zählt nicht; Querverbindungen erzeugen Kreise.
- [ ] Richtig, wenn das Kabel aus Glasfaser ist. → Das Medium ändert nichts an der Struktur.

> Querverbindungen zwischen Verteilern derselben Ebene widersprechen dem hierarchischen Stern.

## P15 · LZ4 · zahl · selbstueberpruefung

Ein Standort hat drei Gebäude, jedes mit einem Gebäudeverteiler. Wie viele Kabel hat der Primärbereich im Stern?

= 3
- 2 → Jedes der drei Gebäude braucht eine Verbindung zum SV.
- 6 → Die GVs werden nicht untereinander verbunden – nur jeder einmal mit dem SV.

> Im Stern hängt jeder GV mit genau einem Kabel am SV: 3 Gebäude, 3 Kabel.

## P16 · LZ4 · mc · selbstueberpruefung

Wie viele Standortverteiler hat ein Standort?

- [x] Genau einen
- [ ] Einen je Gebäude → Je Gebäude gibt es einen Gebäudeverteiler; der SV verbindet sie.
- [ ] Zwei, damit es ausfallsicher ist → In der Grundstruktur gibt es genau einen.

> Der Standortverteiler ist die Spitze des Sterns – es gibt genau einen.

# LZ5 · Standorte wählen

## P17 · LZ5 · mc · selbstueberpruefung

Wohin gehört der Standortverteiler?

- [x] In einen abgeschlossenen, gekühlten Server- oder Technikraum
- [ ] In das Sekretariat, damit ihn jemand im Blick hat → Dort ist er nicht vor Zugriff geschützt, und er stört.
- [ ] In die Mitte des Hofs, damit die Wege kurz sind → Verteiler stehen in Gebäuden, in geschützten Räumen.
- [ ] In den Flur neben die Hauseinführung → Flure sind Fluchtwege.

> SV und GV stehen in einem Technik- oder Serverraum: abschließbar, belüftet oder gekühlt.

## P18 · LZ5 · mc · selbstueberpruefung

Warum steht ein Etagenverteiler nicht im Klassenzimmer, auch wenn dort die meisten PCs sind?

- [x] Lärm und Abwärme stören, und jeder hätte Zugang zum Schrank.
- [ ] Weil die Kabel dann zu kurz wären → Kurze Kabel sind kein Problem.
- [ ] Weil Kupferkabel nicht in Klassenzimmer dürfen → Die Dosen liegen ja gerade dort.

> Verteiler gehören in abschließbare Technik- oder Nebenräume: Zutrittsschutz, kein Lärm und keine Wärme im Arbeitsraum.

## P19 · LZ5 · mc · selbstueberpruefung

Welcher Raum eignet sich für einen Etagenverteiler?

- [x] Ein abschließbarer Lagerraum in der Mitte der Etage
- [ ] Das Treppenhaus → Treppenhäuser sind Fluchtwege.
- [ ] Die Teeküche → Dort gibt es Wasser und Publikumsverkehr.
- [ ] Das Lehrerzimmer → Dort wird gearbeitet; der Schrank stört und ist nicht geschützt.

> Ein abschließbarer Nebenraum in der Mitte hält die Wege kurz und den Schrank geschützt.

## P20 · LZ5 · mc · selbstueberpruefung

Dürfen Standortverteiler und Gebäudeverteiler im selben Raum stehen?

- [x] Ja, sie bleiben trotzdem zwei getrennte Ebenen.
- [ ] Nein, sie müssen in verschiedenen Gebäuden stehen. → Der SV steht meist im Hauptgebäude – oft im selben Serverraum wie dessen GV.
- [ ] Nur, wenn es keinen Etagenverteiler gibt. → Das hat damit nichts zu tun.

> SV und GV dürfen räumlich zusammenstehen; logisch bleiben es getrennte Ebenen.
