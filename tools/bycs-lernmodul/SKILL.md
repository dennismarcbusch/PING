---
name: bycs-lernmodul
description: Interaktive Lernmodule für die ByCS Lernplattform bauen (einheitlicher Look, Entdecken/Üben/Lernzielkontrolle) und als einfügbaren Kompakt-Schnipsel für den HTML-Editor ausliefern.
---

# ByCS-Lernmodul: Bauen und Einbetten

Für interaktive Lerntools (z. B. für Fachinformatik-Klassen), die in die **ByCS Lernplattform** eingefügt werden. Referenz: „Netzwerktopologien erleben“.

**Wichtigste Erkenntnis:** Eine vollständige HTML-Seite und ein lesbarer `<div>`+`<script>`-Schnipsel funktionieren in der Lernplattform NICHT. Es funktioniert nur der **Kompakt-Schnipsel**: ein `<div>` plus ein kurzes `<script>`, das den Base64-kodierten Programmcode entpackt und ausführt; das Modul rendert in ein Shadow DOM. Diesen Schnipsel immer als Hauptergebnis liefern.

## Ablauf
1. Inhalte/Lernziele klären (3–5 operationalisierte Lernziele), dann **Quelle** als eigenständige HTML-Datei bauen (`<thema>.html`) – nach den Konventionen unten.
2. Logik mit Node testen, Quelle im Headless-Chromium durchklicken.
3. Mit `scripts/build_embed.py` (liegt neben dieser Datei) den Schnipsel erzeugen:
   `python3 <skill-ordner>/scripts/build_embed.py <thema>.html <thema>-einbetten.html lm-<thema>`
4. Schnipsel in einer nachgebauten Plattformseite testen (schmale Spalte ~860px, störendes Fremd-CSS, Handy 390px).
5. Beide Dateien liefern; der Lehrkraft die Einfüge-Anleitung geben.

## Konventionen für die Quelle (Pflicht, sonst bricht die Umwandlung)
- Eine Datei, genau ein `<style>` im Head und genau ein `<script>` direkt vor `</body>`. Keine externen Bibliotheken/CDNs/Webfonts/Bilddateien; Grafiken als inline-SVG aus JS.
- Gesamtes Markup in `<div class="app">…</div>`.
- CSS: Variablen in `:root{…}`; Grundschrift in einer Regel `html,body{margin:0;color:var(--ink);font-family:…;font-size:15px;line-height:1.45}` (ohne Hintergrund – der kommt auf `.app`). Dunkelmodus in `/*@dark*/ @media (prefers-color-scheme: dark){…} /*@end*/`, Druck-CSS in `/*@print*/ @media print{…} /*@end*/` (beides wird für die Einbettung entfernt). Responsives nur über `@media (max-width:…px)` – wird zu Container-Queries.
- JS: erste Zeile im Skript `var ROOT = document;`. **Alle DOM-Zugriffe über ROOT**: Helfer `var $ = function(s, r){ return (r || ROOT).querySelector(s); }; var $$ = function(s, r){ return Array.prototype.slice.call((r || ROOT).querySelectorAll(s)); };`. Nie `document.querySelector/getElementById/elementFromPoint`, nie `DOMContentLoaded` – am Ende einfach `init();`. Erlaubt: `document.createElementNS`, `window.open`, `requestAnimationFrame`. Drag-Ziele mit `ROOT.elementFromPoint(x,y)`.
- IDs/Klassen frei wählbar (Shadow DOM isoliert), aber keine Abhängigkeit vom Seiten-Layout.
- `localStorage` nur in try/catch; Tool muss ohne Speicher laufen. Keine `alert/confirm/prompt`.
- Drucken des Ergebnisses immer über ein neues Fenster (funktioniert eigenständig und eingebettet):
```js
function printResult(boxSel){
  var css = ROOT.querySelector('style').textContent.split(':host').join('body').split(':root').join('body');
  var box = $(boxSel).cloneNode(true); $$('.noprint', box).forEach(function(n){ n.remove(); });
  var w = null; try { w = window.open('', '_blank'); } catch(_){}
  if (!w){ window.print(); return; }
  w.document.write('<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>Ergebnis</title><style>' + css + ' body{margin:20px;print-color-adjust:exact;-webkit-print-color-adjust:exact}</style></head><body>' + box.outerHTML + '</body></html>');
  w.document.close(); setTimeout(function(){ try { w.focus(); w.print(); } catch(_){} }, 300);
}
```

## Design-Tokens (immer übernehmen)
```css
:root{
  --bg:#eef2f8; --card:#ffffff; --card2:#f6f8fc; --ink:#1b2333; --ink-soft:#4a5568; --muted:#6b7588; --line:#dbe2ec;
  --accent:#2f6fde; --accent-soft:#e3ecfd; --ok:#1f9d55; --ok-soft:#e2f5e9; --bad:#d64545; --bad-soft:#fde8e8;
  --warn:#b67d00; --warn-soft:#fff3d1; --wire:#7b879b; --canvas:#fbfcfe; --grid:#e6ebf3;
  --shadow:0 1px 2px rgba(20,30,50,.06),0 6px 20px rgba(20,30,50,.07); --r:14px;
}
/*@dark*/@media (prefers-color-scheme: dark){:root{
  --bg:#0e131b; --card:#161d28; --card2:#1c2431; --ink:#e6ebf2; --ink-soft:#b3bccb; --muted:#8b95a7; --line:#2a3443;
  --accent:#5b8ff0; --accent-soft:#1b2944; --ok:#3cc47a; --ok-soft:#14301f; --bad:#f06c6c; --bad-soft:#3a1d20;
  --warn:#e6b23a; --warn-soft:#352c14; --wire:#8592a8; --canvas:#111720; --grid:#1b2330;
  --shadow:0 1px 2px rgba(0,0,0,.3),0 6px 20px rgba(0,0,0,.3);}}/*@end*/
```
Farben nur über Variablen. Kategorienfarben (fest pro Kategorie im ganzen Tool): `#e8862a #8e5bd6 #2f7fd6 #2f9e5b #d64545 #14958a`. Schrift: `system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif`.

## Komponenten
- `.card`: `--card`, 1px `--line`, Radius 14px, `--shadow`, Padding 14px.
- Buttons: Radius 10px, `--card2`, Rand `--line`, Hover-Rand `--accent`; `.primary` Akzent gefüllt, weiß, fett; `.active` = `--accent-soft` + Akzentrand/-schrift. Werkzeugwahl als Segmentgruppe `.seg`.
- Header: 46px-SVG-Logo (Akzent-Quadrat Radius 12, weißes Motiv, Gelbakzent `#ffd166`), Titel 1.45rem, Untertitel `--muted`; Tabs als Pillen-Leiste in Karte, aktiver Tab Akzent gefüllt. Unter 600px: Tabs volle Breite, `flex:1`.
- Aufklappbare Karte „🎯 Lernziele dieses Moduls“ (Kacheln im Grid).
- Zeichenfläche: SVG `viewBox="0 0 800 480"`, `width:100%`, Radius 12px, `--canvas` + 24px-Raster (`linear-gradient` aus `--grid`), `touch-action:none`. Pointer-Events (down/move/up) für Klick + Ziehen; unsichtbare Klickflächen (`stroke:transparent`, 18–34px) für Linien.
- SVG-Labels: fett 13px, `paint-order:stroke`, Kontur 4px in `--canvas`. Objekte als flache Mini-Icons in Kategorienfarbe. Animationen mit `requestAnimationFrame` (leuchtender Punkt mit drop-shadow, Puls-Ringe).
- Meldung `.msg` + Varianten ok/bad/warn (Soft-Fläche + farbiger Rand) mit Emojis 💡✅⛔⚡🎉💥. Fortschrittsbalken 10px. Kennzahl-Chips (Radius 999px). Pro/Contra-Listen mit „+“/„−“-Badges. `.subh`: 0.8rem Versalien, Sperrung .06em, `--muted`. Vergleichstabelle mit 5-Punkte-Bewertung (●). Hinweisbox „Gut zu wissen“ in `--warn-soft`.
- Layout: `.app{max-width:1400px;margin:0 auto;padding:14px}`; Arbeitsbereich `grid-template-columns:220px minmax(0,1fr) 330px`, ≤1150px: `200px 1fr` und rechte Spalte darunter, ≤760px einspaltig. Seitenleisten-Icons ≤1150px verkleinern.

## Didaktischer Aufbau
1. **① Entdecken** – Simulation mit Sofort-Feedback; rechts Erklärung, Vor-/Nachteile, Praxisbezug, Kennzahlen; darunter Vergleichstabelle.
2. **② Üben** – 5–7 Aufgaben mit Ziel, gestuften Tipps (💡 einzeln aufdecken), „✔ Prüfen“ mit automatischer Erkennung, Vorher-Nachher-Vergleich, Reflexionsfrage (MC, Optionen gemischt). Erledigte Aufgaben mit ✓; dazu ein freier Sandkasten.
3. **③ Lernzielkontrolle** – Fragenpool (≥5 je Lernziel), pro Versuch ~12 zufällig gezogen und gemischt. Fragetypen mischen: Multiple Choice, Bild erkennen, Zuordnen (Selects), Zahleneingabe, Hotspot in Grafik. Sofortige Erklärung je Frage. Auswertung je Lernziel mit Balken, Status (≥80 % erreicht ✔ / ≥50 % teilweise / sonst noch nicht) und Lernempfehlung; Übungsergebnisse zählen mit. Namensfeld + „🖨 Ergebnis drucken / als PDF“ (printResult). Navigationselemente in der Auswertung mit Klasse `noprint`.
- Sprache Deutsch, „du“-Ansprache, fachlich korrekt auf Ausbildungs-/IHK-Niveau.

Mount-ID pro Modul eindeutig wählen (z. B. `lm-subnetting`), damit mehrere Module auf einer Kursseite laufen.

## Tests vor Abgabe
- `node --check` auf das extrahierte Skript; Kernlogik (Bewertung, Erkennung, Berechnungen) mit Node-Asserts prüfen.
- Playwright/Chromium: Quelle bei 1400px und 390px durchklicken (alle Tabs, eine Übungsaufgabe lösen, Quiz komplett), keine `pageerror`/Konsolenfehler, `scrollWidth` ≤ Viewport. Nach jedem Klick wird SVG neu gezeichnet – Elemente über Selektor/ID neu suchen, nicht Handles wiederverwenden.
- Schnipsel in Testseite einbetten: `<div id="page" style="width:860px">` mit störendem CSS (`body{font-family:Georgia;color:purple;text-align:center} button{background:red!important;text-transform:uppercase} .card{display:flex;background:yellow} svg{width:20px}`) – Modul muss unverändert aussehen und funktionieren; Druckfenster öffnet sich mit Farben. Playwright-Selektoren durchdringen Shadow DOM automatisch.
- Screenshots ansehen.

## Auslieferung und Hinweis an die Lehrkraft
Dateien: `<thema>-einbetten.html` (Hauptergebnis) und `<thema>.html` (eigenständige Vorschau). Anleitung:
1. `<thema>-einbetten.html` mit einem **Texteditor** öffnen, alles kopieren.
2. In der ByCS Lernplattform Textfeld/Textseite bearbeiten, Editor auf **Quellcode-Ansicht** (`</>`) schalten, einfügen, speichern.
Ergebnisse werden nicht an die Bewertungen der Plattform übertragen; Nachweis über das gedruckte PDF.
