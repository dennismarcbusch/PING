# Format für Fragen und Paketinhalt (PING-Vorlage)

Alle Inhalte eines Pakets stehen in `js/inhalt.js` als ein Objekt `window.PAKET`. Die Engine (`js/engine.js`) setzt daraus Start, Entdecken, Üben, Nachweis und Abschluss zusammen und erfüllt dabei die technischen Muss-Punkte des Leitfadens automatisch. Die Beispieldatei in der Vorlage („Bits & Bytes“) zeigt jedes Feld im Einsatz.

## Frage

```js
{ id: 'F7', lz: 'LZ2', einsatz: ['check', 'nachweis'], typ: 'mc',
  frage: 'Wie lautet <b>100</b> als 8-Bit-Binärzahl?',
  optionen: [
    { text: '<code>01100100</code>', richtig: true },
    { text: '<code>00100110</code>', feedback: 'Die Ziffern sind verdreht – die 64 steht weiter links als die 4.' },
    { text: '<code>01100000</code>', feedback: 'Das ist 96: Der Rest 4 fehlt noch.' }
  ],
  erklaerung: '100 = 64 + 32 + 4 → 01100100.' }
```

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `id` | ja | eindeutig im Paket, z. B. `F7`. Wird als `N<Versuch>_F7` an die Lernplattform gemeldet und in der Auswertung genutzt. Nach dem ersten Einsatz nicht mehr umbenennen. |
| `lz` | ja | Lernziel, z. B. `LZ2` |
| `einsatz` | ja | Liste aus `check` (Kurz-Check), `nachweis` (Pool für Teil B), `uebung`, `vorwissen` |
| `typ` | ja | `mc`, `zuordnen`, `zahl`, `text`, `hotspot` (siehe unten) |
| `frage` | ja | Fragetext, HTML erlaubt |
| `erklaerung` | ja | Warum die richtige Antwort richtig ist (Feedback, P6) |
| `bild` | nein | Inline-SVG oder HTML über den Antworten (Bildfrage) |
| `hinweis` | nein | kurzer Tipp, der nach falscher Antwort im Kurz-Check erscheint |

## Fragetypen

- **`mc` – Multiple Choice / Bildfrage:** `optionen: [{text, richtig, feedback}]`. Sind mehrere Optionen richtig, wird automatisch Mehrfachauswahl („Kreuze alle richtigen an“) mit Teilpunkten. Jede Falschantwort bekommt ein `feedback`, das die zugrunde liegende Fehlvorstellung anspricht. Optionen werden gemischt (`mischen: false` schaltet das ab, z. B. bei „1 Bit, 2 Bit, 4 Bit“).
- **`zuordnen`:** `paare: [{links, rechts}]` (mindestens zwei, sinnvoll 3–5), optional `feedbackFalsch`. Rechte Seite wird gemischt angeboten.
- **`zahl`:** `zahl: {wert, toleranz, einheit}`; Komma und Punkt werden akzeptiert. `typisch: [{wert, feedback}]` für typische Fehlergebnisse.
- **`text`:** `akzeptiert: ['…']` mit allen richtigen Schreibweisen (Groß-/Kleinschreibung und doppelte Leerzeichen werden ignoriert). `typisch: [{antwort, feedback}]`.
- **`hotspot`:** `svg: '<svg viewBox="0 0 B H">…</svg>'` und `bereiche: [{x, y, w, h, label, richtig, feedback}]` (Rechteck) oder `{cx, cy, r, …}` (Kreis). Genau ein Bereich ist richtig; `label` wird vorgelesen (Barrierefreiheit).

## Paket

| Feld | Bedeutung |
|---|---|
| `id` | `ping-<name>`, gleich dem Identifier im Manifest |
| `titel`, `untertitel`, `version`, `dauer` | Anzeige |
| `bestehen` | 80 (Leitfaden) |
| `figur` | `{name, rolle}` der Story-Figur (Sprechblasen) |
| `leitsituation` | Einstiegstext der Figur (HTML) |
| `lernziele` | `[{id: 'LZ1', kurz, text: 'Ich kann …'}]` – drei bis acht |
| `vorwissen` | Liste von Fragen-IDs für den freiwilligen Vorwissens-Check (eine je Lernziel) |
| `stationen` | `[{id, titel, lz: [...], auftrag, leitfrage, inhalt, bild, beispiel: {titel, aufgabe, schritte: [{tun, warum}]}, vertiefung, interaktion, beruf, steckbrief, check: [Fragen-IDs]}]` |
| `uebungen` | `[{id, titel, lz, auftrag, frage (ID) oder interaktion, tipps: [Denkanstoß, Teillösung, Lösung], reflexion: {frage, muster}, steckbrief}]` |
| `nachweis` | `{dauer, gewichtA (Prozent, Standard 50), einleitung, teilA: {titel, auftrag, inhalt, interaktion}, teilB: {proLZ: 2}}` |
| `merkblatt` | `[{lz, titel, zeilen: [{text mit ___, loesung}], fehler, beispiel, schema}]` |
| `selbsttest` | fünf Fragen-IDs für die Rückseite des Merkblatts |
| `fragen` | Fragenpool (siehe oben) |

## Interaktionen

Simulationen, Bit-Schalter, Zuordnungen am Bild usw. sind Funktionen in `inhalt.js`:

```js
interaktion: function (box, api) {
  // box: leeres <div>, in das gezeichnet wird
  // api.erledigt('Text')      → Station/Übung gelöst (zeigt Erfolg und nächsten Schritt)
  // api.meldung('Text', art)  → Rückmeldung; art 'ok' | 'bad' | 'warn' | ''
  return {
    loesen: function () { /* setzt die Musterlösung ein – Pflicht, für den automatischen Test */ },
    auswerten: function () { /* nur Nachweis Teil A: [{lz: 'LZ1', text: 'Prüfpunkt', ok: true}] */ }
  };
}
```

Regeln: Antippen statt nur Ziehen (Tablet), per Tastatur bedienbar (`<button>`), Beschriftungen direkt im Bild, Farben über CSS-Variablen (`var(--ok)` usw.), keine externen Dateien, keine `alert/confirm/prompt`. Im Nachweis Teil A gibt es keine Rückmeldung während der Bearbeitung; Fehler wirken sich, wo möglich, realistisch aus.

## Mengen (Richtwerte aus dem Leitfaden)

- Kurz-Check: 3–5 Fragen je Station, mindestens eine je Lernziel der Station; ab Station 3 eine Frage zu früheren Stationen (P10).
- Nachweis Teil B: `proLZ` = 2 Fragen je Lernziel pro Versuch; im Pool mindestens 4 je Lernziel, damit Wiederholungen nicht dieselben Fragen ziehen.
- Teil A: Prüfpunkte so verteilen, dass jedes Lernziel zusammen mit Teil B mindestens zwei Prüfungen hat.
- Selbsttest: 5 Fragen, aus allen Lernzielen gemischt.
