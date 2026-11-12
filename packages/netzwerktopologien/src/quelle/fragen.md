# Fragen: Netzwerktopologien erleben

Format: Kompass-Skill lernpaket-bauen, referenz/fragenformat.md. Jede Frage beginnt mit ## ID · Lernziel · Typ · Einsatz; Zeilen mit # gliedern nur.
Prototyp: Vorab-Frage und Kurz-Check von Station 1. Der Pool für die Selbstüberprüfung (aus Version 1) folgt im Ausbau.

# Vorab-Fragen

## V1 · LZ4 · mc · vorab

Sechs PCs an einem Switch: Welche **einzelnen** Ausfälle trennen **alle** PCs voneinander?

- [x] Der Switch ist defekt.
- [x] Der Stecker vom Netzteil des Switches wird gezogen.
- [ ] Das Patchkabel von PC3 bricht. → Dann ist nur PC3 abgeschnitten. Die anderen hängen an ihren eigenen Kabeln.
- [ ] PC3 wird ausgeschaltet. → Die anderen PCs schicken ihre Daten nicht über PC3, sondern über den Switch.
- [ ] Zwei PCs senden gleichzeitig. → Der Switch leitet beide Pakete getrennt weiter; im Stern gibt es dadurch keinen Ausfall.

> Jeder Weg führt über den Switch. Ist er defekt oder ohne Strom, ist jeder PC allein. Ein Kabel oder ein PC betrifft nur das eigene Gerät.

# LZ1 · Topologien erkennen

## C2 · LZ1 · mc · check

Woran erkennst du eine **Sterntopologie** im Netzplan?

- [x] Jedes Gerät ist mit einem eigenen Kabel an genau einen zentralen Verteiler angeschlossen.
- [ ] Alle Geräte hängen an einem gemeinsamen, durchgehenden Kabel. → Das ist der Bus: ein Kabel für alle, kein zentraler Verteiler.
- [ ] Jedes Gerät hat genau zwei Nachbarn. → Das ist der Ring: Die Geräte sind im Kreis verbunden, ohne Verteiler.
- [ ] Mehrere Switches sind übereinander verbunden. → Das ist ein Baum, also mehrere Sterne in Ebenen.

> Typisch für den Stern sind die eigenen Kabel aller Geräte zu einem zentralen Verteiler (Switch).

# LZ4 · Schwachstellen finden

## C1 · LZ4 · mc · check

In der Praxis Lindenhof bricht das Patchkabel am PC im Labor. Was passiert?

- [x] Nur der Labor-PC ist vom Netz getrennt; alle anderen arbeiten weiter.
- [ ] Das ganze Netz fällt aus. → Das passiert nur, wenn der Switch ausfällt. Das Kabel des Labors liegt auf keinem anderen Weg.
- [ ] Der Labor-PC schickt seine Daten über den Nachbar-PC. → Im Stern sind die PCs nicht untereinander verbunden; jeder Weg führt über den Switch.
- [ ] Der Switch schaltet sich ab, um Fehler zu vermeiden. → Ein Switch arbeitet an seinen übrigen Ports einfach weiter.

> Im Stern hat jedes Gerät sein eigenes Kabel zum Switch. Ein Kabelbruch trennt nur dieses eine Gerät.
