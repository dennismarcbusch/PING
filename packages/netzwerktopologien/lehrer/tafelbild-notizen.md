# Tafelbild „Netzwerktopologien“ – Hinweise für die Notizen der Folien

Das Tafelbild ist ein Baustein für den Input: Es ersetzt nur den **Mittelteil** (Erklären und Beispiel). Einstieg, Üben und Sicherung laufen auf den Folien. Einen eigenen Ablaufplan gibt es nicht – der Ablauf steht in den Notizen der Folien (bei psi-slides: Notizen mit Zeitmarken im Cockpit). Diese Datei liefert, was dort für den Mittelteil eingetragen wird. Sie liegt neben dem Paket, nicht im ZIP.

## Übergang

- **Ab hier kann das Tafelbild übernehmen:** nach der Einstiegsfolie mit dem Anruf der Praxis Lindenhof („Bei uns geht gar nichts mehr!“), etwa Minute 3.
- **Öffnen:** Link `index.html#tafel` aus der Folie (startet die Präsentation ohne Erklärungen; `#tafel-2` beginnt mit Szene 2). In der Lernplattform: Paket öffnen → **Tafelbild** in der Kopfzeile → **E** schaltet die Erklärungen aus.
- **Zurück zur Folie:** nach Szene 3 mit **Esc**; weiter mit der ersten Übungsfolie (z. B. „Welche Topologie ist das?“).
- **Ohne Tafelbild:** Folien mit je einem Bild von Stern, Vollvermaschung und Baum zeigen denselben Inhalt als Bild.

## Bedienung

**→ / ←** oder Presenter (Bild↓/Bild↑) für die Szenen, Ziffern springen direkt, **F** Vollbild, **P** Stift, **W** Zeichnung löschen, **Esc** schließen, **⌨** zeigt alle Kürzel. Im Netzplan: oben **⚡ Ausfall** oder **✉ Paket senden** wählen, dann Geräte oder Kabel antippen (nochmal antippen = repariert).

## Szenen

Muster jeder Szene: **Vorhersagen → Klicken → Deuten.** Erst fragen und alle festlegen lassen (Handzeichen, Zuruf), dann auslösen oder aufdecken, dann erklärt eine Schülerin oder ein Schüler, warum. Das Fachwort kommt danach.

| Szene | Zeitmarke | Klicks und Tasten | Vorhersage-Frage an die Klasse | Erwartete Fehlvorstellung | Kernaussage (mündlich) | Vertieft in |
|---|---|---|---|---|---|---|
| 1 Ausfall im Stern | @3 | ⚡ Ausfall → „Labor“ antippen → **A** (Erreichbarkeit: 10 von 15) → **R** → „Switch“ antippen → **A** (0 von 15) | „Der PC im Labor fällt aus – wie viele der anderen fünf können noch miteinander sprechen? Und wenn der Switch ausfällt?“ | Ein ausgefallener PC legt das Netz lahm; oder: Ohne Switch sprechen die PCs eben direkt miteinander. | Jedes Gerät hängt mit eigenem Kabel am Switch. Ein PC betrifft nur sich selbst; der Switch ist der **Single Point of Failure**. | Station 1 |
| 2 Kabel bei Vermaschung | @6 | Start mit 4 Geräten → **K** (6 Kabel) → **K** aus, **+** bis 8 Geräte → Vorhersage → **K** (28 Kabel) | „Jedes Gerät soll mit jedem verbunden sein. Bei 4 Geräten sind es 6 Kabel. Wie viele bei 8?“ | 12 (doppelt so viele Geräte, doppelt so viele Kabel) oder 56 (8 · 7, jedes Kabel doppelt gezählt). | n Geräte, jedes hat n − 1 Partner, jedes Kabel hat zwei Enden: **n · (n − 1) / 2**. Der Aufwand wächst ungefähr mit n². | Station 4 |
| 3 Teilbaum im Baum | @9 | ⚡ Ausfall → „SW OG“ antippen → **A** (3 von 15) → **R** → „Core“ antippen → **A** (6 von 15) | „Der Switch im Obergeschoss fällt aus. Wer ist betroffen? Und wenn der Core-Switch ausfällt?“ | Der Ausfall eines Etagen-Switches trennt das ganze Netz; oder: Ohne Core geht gar nichts mehr. | Ein Etagen-Switch trennt nur seinen **Teilbaum**. Der Core-Switch trennt die Stockwerke voneinander – innerhalb arbeiten sie weiter. | Station 5 |

Alle Zahlen in dieser Tabelle sind mit dem Paket nachgeprüft (Stern 6 PCs: 15 Paare, nach PC-Ausfall 10, nach Switch-Ausfall 0; Vollvermaschung 4 → 6, 8 → 28 Kabel; Praxis-Baum 6 PCs: nach Ausfall SW OG 3 Paare, nach Ausfall Core 6 Paare).

## Was das Tafelbild bewusst nicht zeigt

- Bus mit Kollision und CSMA/CD (bleibt in Station 2)
- Ring mit Token und Doppelring (bleibt in Station 3)
- Erkennungsmerkmale aller Topologien im Vergleich (bleiben in Station 6 und auf dem Merkblatt)
- Vor- und Nachteil-Listen (stehen in den Steckbriefen der Stationen)
