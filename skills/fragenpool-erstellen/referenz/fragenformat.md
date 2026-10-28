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
| `titel`, `untertitel`, `version`, `dauer` | Anzeige. `version` steht klein neben dem Titel und auf Ergebnis- und Merkblatt-PDF (Pflicht; Prototyp `0.1`, erster Einsatz `1.0`, bei jeder ausgelieferten Änderung erhöhen) |
| `bestehen` | 80 (Leitfaden) |
| `figur` | `{name, rolle}` der Story-Figur (Sprechblasen) |
| `leitsituation` | Einstiegstext der Figur (HTML) |
| `lernziele` | `[{id: 'LZ1', kurz, text: 'Ich kann …'}]` – drei bis acht |
| `vorwissen` | Liste von Fragen-IDs für den freiwilligen Vorwissens-Check (eine je Lernziel) |
| `glossar` | `[{begriff, erklaerung, vorab}]` – alle Fachbegriffe; `vorab: true` stellt den Begriff schon auf der Startseite vor (Vortraining). Unter jeder Station und Übung aufklappbar. |
| `stationen` | `[{id, titel, lz: [...], auftrag, leitfrage, inhalt, bild, beispiel: {titel, aufgabe, schritte: [{tun, warum}], selbsterklaerung: {schritt, frage}}, vertiefung, interaktion, mitdenken: {auftrag, muster}, beruf, steckbrief, check: [Fragen-IDs]}]` |
| `uebungen` | `[{id, titel, lz, auftrag, frage (ID) oder interaktion, tipps: [Denkanstoß, Teillösung, Lösung], mitdenken: {auftrag, muster}, reflexion: {frage, muster}, steckbrief}]` |
| `nachweis` | `{dauer, gewichtA (Prozent, Standard 50), einleitung, teilA: {titel, auftrag, inhalt, interaktion}, teilB: {proLZ: 2}}` |
| `merkblatt` | `[{lz, titel, zeilen: [{text mit ___, loesung}], fehler, beispiel, schema}]` |
| `selbsttest` | fünf Fragen-IDs für die Rückseite des Merkblatts |
| `tafel` | optional: Tafelbild für einen freiwilligen Lehrer-Input (siehe „Tafelbild“ unten). Ohne dieses Feld gibt es kein Tafelbild. |
| `fragen` | Fragenpool (siehe oben) |

## Zum Mitdenken anregen (generatives Lernen)

- **`beispiel.selbsterklaerung: {schritt, frage}`** – an einem entscheidenden Schritt des Lösungsbeispiels (Nummer ab 1) wird dessen `warum` zunächst verborgen. Die Lernenden lesen die Frage („Warum rechnest du mit 72 weiter?“), überlegen und schreiben, dann klappen sie die Begründung auf. Jedes Lösungsbeispiel sollte eine solche Frage haben.
- **`mitdenken: {auftrag, muster}`** – kurzer Auftrag nach einer Station oder Übung: skizzieren, in eigenen Worten zusammenfassen, jemand anderem erklären. Die Musterlösung lässt sich zum Vergleich aufklappen. Einträge werden nicht gespeichert.

## Ton und Video

Die Vorlage nutzt keinen Ton. Wer Ton oder Video einbaut, liefert immer den Text mit (Untertitel per `<track>` oder ein Transkript direkt darunter) und vermittelt nichts nur über Ton.

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

## Tafelbild (optional)

Für Pakete mit einem freiwilligen Lehrer-Input (Leitfaden C2). `js/tafel.js` zeigt die Szenen als Präsentation: groß, ohne erklärenden Text, Schritt für Schritt. Nicht jedes Paket braucht das – sinnvoll vor allem bei Simulationen, Abläufen und Vergleichen.

```js
tafel: {
  titel: 'Bits & Bytes – Überblick',
  dauer: '15 Minuten',
  szenen: [
    { id: 'stellenwerte', titel: 'Stellenwerte', station: 'S1',
      erklaerung: '<p>Kurz, für Schüler zuschaltbar …</p>',
      zeichne: function (buehne, api) {
        // buehne: leeres <div> (Flex-Spalte, füllt den Bildschirm)
        // api.werkzeug({ icon, text, taste, typ: 'knopf'|'schalter'|'modus', gruppe, an, aktion(an, knopf) })
        //   → Knopf in der unteren Leiste mit Tastenkürzel; Rückgabe { setze(an), knopf }
        // api.praesentation → true, wenn ohne Erklärungen gestartet (index.html#tafel)
        return { aufraeumen: function () { /* Animationen stoppen */ } };
      } }
  ]
}
```

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `titel`, `dauer` | nein | Anzeige im Dialog und auf der Startseiten-Karte |
| `szenen[].titel` | ja | kurzer Name (2–3 Wörter); erscheint nur mit eingeschalteten Erklärungen |
| `szenen[].station` | ja | ID der Station, die das Thema vertieft – das Tafelbild zeigt nichts, was im Paket fehlt |
| `szenen[].erklaerung` | ja | 2–4 kurze Sätze für Schüler, die das Tafelbild selbst öffnen |
| `szenen[].zeichne` | ja | baut die Szene; nutzt dieselben Bausteine wie die Interaktionen der Stationen |

Regeln:

- **Kein erklärender Text auf der Bühne.** Erlaubt: Beschriftungen im Bild, Zahlen, Symbole. Die Lehrkraft erklärt mündlich; die Erklärung steht in `erklaerung`.
- **Höchstens etwa sechs Szenen** für 20 Minuten, je Szene eine Kernaussage. Die **letzte Szene sichert** (z. B. Vergleich mit aufdeckbaren Kennzahlen).
- Jede Szene trägt das Muster **Vorhersagen → Klicken → Deuten**: Werkzeuge so anlegen, dass die Lehrkraft erst fragen und dann auslösen oder aufdecken kann (Schalter „Anzahl zeigen“, „Dezimal“ usw.).
- Groß zeichnen: Die Bühne ist so breit wie der Beamer; Schrift und Linien in der Szene größer als in der Station.
- Werkzeuge mit sprechendem Kurztext und Tastenkürzel; Kürzel `e`, `p`, `w`, `f`, Ziffern und Pfeiltasten sind vom Tafelbild belegt.
- Nichts speichern: keine SCORM-Aufrufe, kein `localStorage`.
- Zum Tafelbild gehört ein **Ablaufplan** für die Lehrkraft (`lehrer/input-ablauf.md`, Vorlage im Skill `lernpaket-bauen`).

## Mengen (Richtwerte aus dem Leitfaden)

- Kurz-Check: 3–5 Fragen je Station, mindestens eine je Lernziel der Station; ab Station 3 eine Frage zu früheren Stationen (P10).
- Nachweis Teil B: `proLZ` = 2 Fragen je Lernziel pro Versuch; im Pool mindestens 4 je Lernziel, damit Wiederholungen nicht dieselben Fragen ziehen.
- Teil A: Prüfpunkte so verteilen, dass jedes Lernziel zusammen mit Teil B mindestens zwei Prüfungen hat.
- Selbsttest: 5 Fragen, aus allen Lernzielen gemischt.
