# Tafelbild „Strukturierte Verkabelung“ – Hinweise für die Notizen der Folien

Das Tafelbild ist ein Baustein für den Input: Es ersetzt nur den **Mittelteil** (Erklären und Beispiel). Einstieg, Üben und Sicherung laufen auf den Folien. Einen eigenen Ablaufplan gibt es nicht – der Ablauf steht in den Notizen der Folien (bei psi-slides: Notizen mit Zeitmarken im Cockpit). Diese Datei liefert, was dort für den Mittelteil eingetragen wird. Sie liegt neben dem Paket, nicht im ZIP.

## Übergang

- **Ab hier kann das Tafelbild übernehmen:** nach der Einstiegsfolie „Ein Schulzentrum, zwei Gebäude, 44 Arbeitsplätze – wie kommt das Netz überall hin?“ (etwa Minute 3).
- **Öffnen:** Link `index.html#tafel` aus der Folie (startet die Präsentation ohne Erklärungen; `#tafel-2` beginnt mit Szene 2). In der Lernplattform: Paket öffnen → **Tafelbild** in der Kopfzeile → **E** schaltet die Erklärungen aus.
- **Zurück zur Folie:** nach Szene 3 mit **Esc**; weiter mit der ersten Übungsfolie (z. B. „Welcher Bereich, welches Medium?“).
- **Ohne Tafelbild:** Folien mit dem Lageplan und dem Ebenenbild zeigen denselben Inhalt als Bild.

## Bedienung

**→ / ←** oder Presenter (Bild↓/Bild↑) für die Szenen, Ziffern springen direkt, **F** Vollbild, **P** Stift, **W** Zeichnung löschen, **Esc** schließen, **⌨** zeigt alle Kürzel.

## Szenen

Muster jeder Szene: **Vorhersagen → Klicken → Deuten.** Erst fragen und alle festlegen lassen (Handzeichen, Zuruf), dann auslösen oder aufdecken, dann erklärt eine Schülerin oder ein Schüler, warum. Das Fachwort kommt danach.

| Szene | Zeitmarke | Klicks und Tasten | Vorhersage-Frage an die Klasse | Erwartete Fehlvorstellung | Kernaussage (mündlich) | Vertieft in |
|---|---|---|---|---|---|---|
| 1 Drei Bereiche | @3 | Fertiger Lageplan des Schulzentrums. **B** hebt nacheinander Primär-, Sekundär- und Tertiärbereich hervor, viertes **B** zeigt wieder alles. | „Welche Kabel müssen am weitesten reichen – und welche bekommen dann Glasfaser?“ | Alles mit Kupfer, weil es billiger ist; oder: alles mit Glasfaser, weil es besser ist. | Drei Bereiche, drei Medien: SV – GV primär (LWL Singlemode, die 242 m nach Haus B), GV – EV sekundär (LWL Multimode durch den Schacht), EV – Dose tertiär (Cat.7). | Kapitel 4 |
| 2 90 Meter | @7 | Haus B, Erdgeschoss, EV in „Technik B“ am Ende: 4 von 11 Kabeln rot (bis 102,2 m). **V** verschiebt den EV ins Lager in der Mitte: alle unter 64 m. **V** zurück. | „Der Schrank steht am Ende des Gebäudes. Reichen die Kabel bis zum Prüffeld?“ | „Ethernet geht doch 100 m“ – die 100 m gelten für den ganzen Channel mit Patchkabeln. | Fest verlegt höchstens 90 m. Lösung über den Standort: EV zentral oder ein zweiter EV. | Kapitel 3 |
| 3 Stern in Ebenen | @10 | Ebenenbild SV → GV → EV → Arbeitsplätze. **N** blendet Bereich, Medium und Länge je Ebene ein. | „Darf ich die beiden EVs in Haus A direkt verbinden? Das wäre doch kürzer.“ | Querverbindungen machen das Netz sicherer. | Hierarchischer Stern: jedes Gerät hängt an genau einem Verteiler darüber, keine Querverbindungen. | Kapitel 4 |

Alle Zahlen in dieser Tabelle sind mit dem Paket nachgeprüft (SV – GV B 242,3 m, SV – GV A 9,0 m; Haus B EG mit EV in „Technik B“: 4 von 11 Kabeln über 90 m, längstes 102,2 m; mit EV im Lager längstes 63,9 m).

## Was das Tafelbild bewusst nicht zeigt

- Warum Kupfer zwischen Gebäuden gefährlich ist (Erdpotentiale, Blitz) – bleibt in Kapitel 4 und auf dem Merkblatt
- Standorte der Verteiler im Detail (Flur, Klassenzimmer) – bleiben in Kapitel 3 und Übung 4
- Normdetails (Kategorien, Channel und Permanent Link) – stehen im Glossar
