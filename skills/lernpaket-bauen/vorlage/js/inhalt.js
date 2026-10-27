/* =====================================================================
   INHALT DES LERNPAKETS – nur diese Datei wird pro Paket angepasst.
   Beispielinhalt: „Bits & Bytes“ (Binär ↔ Dezimal). Beim Bauen eines neuen
   Pakets vollständig durch die Inhalte aus Drehbuch und Fragenpool ersetzen.

   Fragetypen (typ):
     'mc'       Multiple Choice; mehrere richtige Optionen → Mehrfachauswahl.
                optionen: [{text, richtig, feedback}] – jede Falschantwort
                bekommt ein Feedback, das die Fehlvorstellung anspricht.
     'zuordnen' paare: [{links, rechts}]; feedbackFalsch optional.
     'zahl'     zahl: {wert, toleranz, einheit}; typisch: [{wert, feedback}].
     'text'     akzeptiert: ['…', '…'] (alle richtigen Schreibweisen);
                typisch: [{antwort, feedback}].
     'hotspot'  svg: '<svg viewBox=…>…</svg>', bereiche: [{x,y,w,h | cx,cy,r,
                label, richtig, feedback}] – genau ein Bereich ist richtig.
   Jede Frage: id, lz, einsatz (['check'|'nachweis'|'uebung'|'vorwissen']),
   frage, erklaerung (warum die richtige Antwort richtig ist), optional bild.

   Interaktionen (Station, Übung, Nachweis Teil A) sind Funktionen
   function (box, api) { … return { loesen: fn, auswerten: fn } }.
     api.erledigt(text)       Aufgabe gelöst (Station/Übung)
     api.meldung(text, art)   Rückmeldung anzeigen, art: 'ok'|'bad'|'warn'|''
     loesen()                 setzt die Musterlösung ein (für automatische Tests)
     auswerten()              nur Teil A: [{lz, text, ok}] je Prüfpunkt
   ===================================================================== */

/* ---- Bausteine, die nur dieses Paket braucht ---- */
function bitSchalter(box, opt) {
  // opt: {ziel, zeigeSumme, beiTreffer, beschriftung}
  var werte = [128, 64, 32, 16, 8, 4, 2, 1], bits = [0, 0, 0, 0, 0, 0, 0, 0];
  var wrap = document.createElement('div');
  wrap.className = 'bitschalter';
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', opt.beschriftung || 'Acht Bit-Schalter');
  wrap.style.cssText = 'display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:6px;max-width:560px;margin:.6rem 0';
  var knoepfe = werte.map(function (w, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.style.cssText = 'display:flex;flex-direction:column;align-items:center;padding:6px 0';
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', 'Bit mit Stellenwert ' + w);
    b.innerHTML = '<span style="font-size:.75rem;color:var(--muted)">' + w + '</span><b style="font-size:1.4rem;font-family:ui-monospace,Consolas,monospace">0</b>';
    b.addEventListener('click', function () { bits[i] = 1 - bits[i]; zeichne(); });
    wrap.appendChild(b);
    return b;
  });
  var summe = document.createElement('div');
  summe.className = 'klein';
  box.appendChild(wrap);
  box.appendChild(summe);
  function wert() { return bits.reduce(function (s, b, i) { return s + b * werte[i]; }, 0); }
  function zeichne() {
    knoepfe.forEach(function (b, i) {
      b.querySelector('b').textContent = bits[i];
      b.setAttribute('aria-pressed', bits[i] ? 'true' : 'false');
      b.style.background = bits[i] ? 'var(--ink)' : '';
      b.style.color = bits[i] ? '#fff' : '';
    });
    summe.innerHTML = opt.zeigeSumme ? 'Binär: <b>' + bits.join('') + '</b> · Dezimal: <b>' + wert() + '</b>' : 'Binär: <b>' + bits.join('') + '</b>';
    if (opt.ziel !== undefined && wert() === opt.ziel && opt.beiTreffer) opt.beiTreffer();
  }
  zeichne();
  return {
    wert: wert,
    setze: function (z) { werte.forEach(function (w, i) { bits[i] = z >= w ? 1 : 0; if (z >= w) z -= w; }); zeichne(); }
  };
}

var IP_SVG = function (bits) {
  // Ein Byte als Kästchenreihe, Stellenwerte direkt darüber (Beschriftung im Bild)
  var s = '<svg viewBox="0 0 560 110" role="img" aria-label="Ein Byte mit acht Stellen">';
  [128, 64, 32, 16, 8, 4, 2, 1].forEach(function (w, i) {
    s += '<rect x="' + (10 + i * 68) + '" y="40" width="60" height="56" rx="8" fill="#f6f8fc" stroke="#dbe2ec"/>';
    s += '<text x="' + (40 + i * 68) + '" y="78" text-anchor="middle" font-size="26" font-family="monospace" fill="#1b2333">' + bits[i] + '</text>';
  });
  return s + '<text x="10" y="26" font-size="15" fill="#6b7588">Stellenwerte stehen hier bewusst nicht dabei.</text></svg>';
};

window.PAKET = {
  id: 'ping-bits-und-bytes',          // = Identifier im imsmanifest.xml
  titel: 'Bits & Bytes',
  untertitel: 'Binärzahlen lesen und schreiben',
  version: '1.0',
  bestehen: 80,                         // Prozent, wie masteryscore im Manifest
  dauer: 'etwa 90 Minuten',
  figur: { name: 'Mira Hofmann', rolle: 'Ausbilderin bei Korbwerk IT-Service' },
  leitsituation: 'Willkommen bei <b>Korbwerk IT-Service</b>! Diese Woche richtest du mit mir Netzwerke bei Kunden ein. Viele Geräte zeigen Adressen und Masken als Binärzahlen an – zum Beispiel <code>11000000</code> statt 192. Damit du nicht ratlos vor dem Router stehst, lernst du heute, Binärzahlen sicher zu lesen und zu schreiben.',

  lernziele: [
    { id: 'LZ1', kurz: 'Binär → dezimal', text: 'Ich kann eine 8-Bit-Binärzahl in eine Dezimalzahl umrechnen.' },
    { id: 'LZ2', kurz: 'Dezimal → binär', text: 'Ich kann eine Dezimalzahl von 0 bis 255 als 8-Bit-Binärzahl darstellen.' },
    { id: 'LZ3', kurz: 'Anzahl Werte', text: 'Ich kann berechnen, wie viele verschiedene Werte sich mit n Bit darstellen lassen.' }
  ],

  vorwissen: ['F3', 'F10', 'F15'],

  stationen: [
    {
      id: 'S1', titel: 'Stellenwerte: So zählt ein Byte', lz: ['LZ1'],
      auftrag: 'Mira zeigt dir die Anzeige eines Routers: Dort steht <code>11000000</code>. Finde heraus, welche Dezimalzahl das ist.',
      leitfrage: 'Welchen Wert hat jede der acht Stellen eines Bytes?',
      inhalt: '<p>Ein <b>Bit</b> ist 0 oder 1. Acht Bit bilden ein <b>Byte</b>. Jede Stelle hat einen <b>Stellenwert</b>: ganz rechts 1, und nach links verdoppelt er sich jeweils.</p><p>Eine 1 bedeutet: Dieser Stellenwert zählt mit. Eine 0 bedeutet: Er zählt nicht.</p>',
      beispiel: {
        titel: '10110010 umrechnen',
        aufgabe: 'Welchen Dezimalwert hat <code>10110010</code>?',
        schritte: [
          { tun: 'Stellenwerte über die Bits schreiben: 128 64 32 16 8 4 2 1.', warum: 'Jede Stelle ist doppelt so viel wert wie die rechts daneben.' },
          { tun: 'Die Stellenwerte aller Einsen herausschreiben: 128, 32, 16, 2.', warum: 'Eine 0 bedeutet „Stelle nicht benutzt“.' },
          { tun: 'Addieren: 128 + 32 + 16 + 2 = <b>178</b>.', warum: 'Der Wert der Zahl ist die Summe der benutzten Stellenwerte.' }
        ]
      },
      interaktion: function (box, api) {
        box.appendChild(Object.assign(document.createElement('p'), { innerHTML: 'Probiere es aus: Schalte die Bits so, dass die Router-Anzeige <code>11000000</code> entsteht. Welcher Dezimalwert erscheint?' }));
        var b = bitSchalter(box, { ziel: 192, zeigeSumme: true, beiTreffer: function () { api.erledigt('Genau: 11000000 = 128 + 64 = 192.'); } });
        return { loesen: function () { b.setze(192); } };
      },
      beruf: 'IPv4-Adressen und Subnetzmasken bestehen aus vier Bytes. Die Maske 255.255.255.0 heißt binär 11111111.11111111.11111111.00000000.',
      check: ['F2', 'F4', 'F1']
    },
    {
      id: 'S2', titel: 'Dezimal → binär', lz: ['LZ2'],
      auftrag: 'Die Schreinerei Maier möchte, dass ihr Drucker im letzten Byte die Zahl 200 bekommt. Stelle 200 als Binärzahl dar.',
      leitfrage: 'Wie zerlegst du eine Zahl in Stellenwerte?',
      inhalt: '<p>Du gehst von links nach rechts: Passt der Stellenwert noch in die Zahl, schreibst du eine <b>1</b> und rechnest mit dem Rest weiter. Passt er nicht, schreibst du eine <b>0</b>.</p>',
      beispiel: {
        titel: '200 umrechnen',
        aufgabe: 'Wie lautet 200 als 8-Bit-Binärzahl?',
        schritte: [
          { tun: '128 passt in 200 → <b>1</b>, Rest 72.', warum: 'Immer mit dem größten Stellenwert beginnen.' },
          { tun: '64 passt in 72 → <b>1</b>, Rest 8.', warum: 'Mit dem Rest geht es weiter, nicht mit 200.' },
          { tun: '32 und 16 passen nicht in 8 → <b>0</b>, <b>0</b>. 8 passt → <b>1</b>, Rest 0.', warum: 'Eine Stelle, die nicht passt, bekommt eine 0 – sie bleibt trotzdem stehen.' },
          { tun: 'Die übrigen Stellen 4, 2, 1 → <b>0</b>. Ergebnis: <b>11001000</b>.', warum: 'Ein Byte hat immer acht Stellen, auch wenn vorne oder hinten Nullen stehen.' }
        ]
      },
      interaktion: function (box, api) {
        box.appendChild(Object.assign(document.createElement('p'), { innerHTML: 'Stelle 200 mit den Schaltern ein.' }));
        var b = bitSchalter(box, { ziel: 200, zeigeSumme: true, beiTreffer: function () { api.erledigt('Richtig: 200 = 11001000.'); } });
        return { loesen: function () { b.setze(200); } };
      },
      beruf: 'Beim Einrichten von Netzen musst du Adressen und Masken binär aufschreiben, um zu sehen, welche Bits zum Netz und welche zum Gerät gehören.',
      check: ['F7', 'F9', 'F6']
    },
    {
      id: 'S3', titel: 'Wie viele Werte passen in n Bit?', lz: ['LZ3'],
      auftrag: 'Mira fragt: „Wie viele verschiedene Adressen passen eigentlich in ein Byte?“ Finde eine Regel.',
      leitfrage: 'Was passiert mit der Anzahl der möglichen Werte, wenn ein Bit dazukommt?',
      inhalt: '<table class="tab" style="max-width:420px"><tr><th>Bit</th><th>mögliche Muster</th><th>Anzahl</th></tr><tr><td>1</td><td>0, 1</td><td>2</td></tr><tr><td>2</td><td>00, 01, 10, 11</td><td>4</td></tr><tr><td>3</td><td>000 … 111</td><td>8</td></tr></table><p>Mit jedem zusätzlichen Bit <b>verdoppelt</b> sich die Anzahl. Mit n Bit gibt es <b>2<sup>n</sup></b> Werte, von 0 bis 2<sup>n</sup> − 1.</p>',
      beispiel: {
        titel: 'Werte mit 3 Bit',
        aufgabe: 'Wie viele verschiedene Werte lassen sich mit 3 Bit darstellen?',
        schritte: [
          { tun: 'Jedes Bit hat 2 Möglichkeiten.', warum: 'Es ist entweder 0 oder 1.' },
          { tun: 'Für 3 Bit: 2 · 2 · 2 = 2³ = <b>8</b>.', warum: 'Jede Möglichkeit des ersten Bits lässt sich mit jeder des zweiten und dritten kombinieren.' },
          { tun: 'Die Werte reichen von 0 (000) bis 7 (111).', warum: 'Die 0 ist einer der 8 Werte – deshalb ist der größte Wert 7, nicht 8.' }
        ]
      },
      beruf: 'In einem Netz mit 8 Bit für Geräte gibt es 256 Bitmuster. Zwei davon sind reserviert, deshalb bleiben 254 Adressen für Geräte.',
      check: ['F14', 'F11', 'F13']
    }
  ],

  uebungen: [
    {
      id: 'U1', titel: 'Router-Anzeige lesen', lz: ['LZ1'],
      auftrag: 'Bei der Gärtnerei Lindner zeigt der Router das zweite Byte der Adresse als <code>10101000</code>. Trag die Dezimalzahl ins Protokoll ein.',
      frage: 'F19',
      tipps: ['Schreib zuerst die Stellenwerte 128 64 32 16 8 4 2 1 über die Bits.', 'Die Einsen stehen bei 128, 32 und 8.', '128 + 32 + 8 = 168.'],
      reflexion: { frage: 'Woran erkennst du schon vor dem Rechnen, ob eine Binärzahl größer als 127 ist?', muster: 'Wenn das Bit ganz links (Stellenwert 128) eine 1 ist, ist die Zahl mindestens 128. Ist es 0, ist sie höchstens 127.' }
    },
    {
      id: 'U2', titel: 'Adresse für den Server', lz: ['LZ2'],
      auftrag: 'Der neue Server bei Lindner soll im letzten Byte die 172 bekommen. Stelle 172 ein. Diesmal ohne Dezimalanzeige!',
      interaktion: function (box, api) {
        var b = bitSchalter(box, { zeigeSumme: false });
        var p = document.createElement('button'); p.type = 'button'; p.textContent = '✔ Prüfen';
        p.addEventListener('click', function () {
          var w = b.wert();
          if (w === 172) api.erledigt('Richtig: 172 = 10101100.');
          else api.meldung('Noch nicht: Deine Einstellung ergibt ' + w + '. ' + (w > 172 ? 'Das ist zu groß – prüfe, ob jeder Stellenwert wirklich noch in den Rest passt.' : 'Das ist zu klein – hast du einen Rest vergessen?'), 'bad');
        });
        box.appendChild(p);
        return { loesen: function () { b.setze(172); p.click(); } };
      },
      tipps: ['Beginne mit dem größten Stellenwert, der in 172 passt.', '172 − 128 = 44. Welcher Stellenwert passt als nächster in 44?', '172 = 128 + 32 + 8 + 4 → 10101100.'],
      reflexion: { frage: 'Warum musst du nach jedem Schritt mit dem Rest weiterrechnen und nicht mit der ursprünglichen Zahl?', muster: 'Der schon abgezogene Stellenwert ist „verbraucht“. Würde man mit der ursprünglichen Zahl weiterrechnen, würde man denselben Anteil doppelt zählen und zu viele Einsen setzen.' }
    },
    {
      id: 'U3', titel: 'Wie viele Geräte passen?', lz: ['LZ3'],
      auftrag: 'In einem kleinen Netz bei Lindner bleiben die letzten 6 Bit der Adresse für Geräte frei. Wie viele verschiedene Bitmuster gibt es dafür?',
      frage: 'F20',
      tipps: ['Wie viele Möglichkeiten hat ein einzelnes Bit?', 'Bei n Bit gibt es 2 hoch n Muster.', '2⁶ = 64.'],
      reflexion: { frage: 'Mit 6 Bit gibt es 64 Muster, der größte Wert ist aber 63. Wie passt das zusammen?', muster: 'Die Zählung beginnt bei 0. Die 64 Muster sind die Werte 0 bis 63 – die 0 ist einer davon.' }
    }
  ],

  nachweis: {
    dauer: '15 Minuten',
    gewichtA: 50,                       // Anteil von Teil A am Ergebnis in Prozent
    einleitung: 'Jetzt bist du allein beim Kunden: <b>Gärtnerei Lindner</b>. Ich bin heute nicht erreichbar – du schaffst das!',
    teilA: {
      titel: 'Router bei der Gärtnerei Lindner',
      auftrag: 'Der Router zeigt die Adresse binär. Trag sie dezimal ins Protokoll ein und stelle die Adresse für den Drucker ein.',
      interaktion: function (box) {
        var bytes = ['11000000', '10101000', '00000001', '00001010'], soll = [192, 168, 1, 10];
        box.innerHTML = '<p><b>Anzeige im Router:</b> <code style="font-size:1.1rem">' + bytes.join('.') + '</code></p><p><b>1.</b> Dezimal: </p>';
        var felder = soll.map(function (_, i) {
          var inp = document.createElement('input'); inp.type = 'text'; inp.inputMode = 'numeric'; inp.size = 4;
          inp.setAttribute('aria-label', (i + 1) + '. Byte dezimal');
          box.lastChild.appendChild(inp); if (i < 3) box.lastChild.appendChild(document.createTextNode(' . '));
          return inp;
        });
        var p2 = document.createElement('p'); p2.innerHTML = '<b>2.</b> Der Drucker bekommt im letzten Byte die <b>20</b>. Stelle sie binär ein:'; box.appendChild(p2);
        var b = bitSchalter(box, { zeigeSumme: false, beschriftung: 'Bit-Schalter für die Druckeradresse' });
        var p3 = document.createElement('p'); p3.innerHTML = '<b>3.</b> Wie viele verschiedene Werte kann das letzte Byte annehmen? ';
        var anz = document.createElement('input'); anz.type = 'text'; anz.inputMode = 'numeric'; anz.size = 5; anz.setAttribute('aria-label', 'Anzahl Werte');
        p3.appendChild(anz); box.appendChild(p3);
        function zahl(x) { return parseInt(String(x.value).trim(), 10); }
        return {
          auswerten: function () {
            return soll.map(function (s, i) { return { lz: 'LZ1', text: (i + 1) + '. Byte ' + bytes[i] + ' = ' + s, ok: zahl(felder[i]) === s }; })
              .concat([{ lz: 'LZ2', text: '20 = 00010100 eingestellt', ok: b.wert() === 20 }, { lz: 'LZ3', text: 'Ein Byte hat 256 mögliche Werte', ok: zahl(anz) === 256 }]);
          },
          loesen: function () { felder.forEach(function (f, i) { f.value = soll[i]; }); b.setze(20); anz.value = '256'; }
        };
      }
    },
    teilB: { proLZ: 2 }                 // Fragen je Lernziel aus dem Pool (einsatz 'nachweis')
  },

  merkblatt: [
    { lz: 'LZ1', zeilen: [
      { text: 'Die Stellenwerte eines Bytes von rechts nach links: 1, 2, 4, ___, ___, ___, ___, 128.', loesung: '8, 16, 32, 64' },
      { text: 'Um eine Binärzahl umzurechnen, ___ ich die Stellenwerte aller Stellen mit einer 1.', loesung: 'addiere' }
    ], fehler: 'Links mit dem Stellenwert 1 anfangen. Die kleinste Stelle steht immer rechts.', beispiel: '10110010 = 128 + 32 + 16 + 2 = 178' },
    { lz: 'LZ2', zeilen: [
      { text: 'Ich ziehe immer den ___ Stellenwert ab, der noch in die Zahl passt.', loesung: 'größten' },
      { text: 'Passt ein Stellenwert nicht, schreibe ich an diese Stelle eine ___.', loesung: '0 (die Stelle bleibt stehen)' }
    ], fehler: 'Nullen weglassen – ein Byte hat immer acht Stellen.', beispiel: '200 = 128 + 64 + 8 → 11001000', schema: 'Größten passenden Stellenwert abziehen → 1 schreiben → mit dem Rest weiter → nicht passende Stellen 0.' },
    { lz: 'LZ3', zeilen: [
      { text: 'Mit n Bit lassen sich ___ verschiedene Werte darstellen.', loesung: '2ⁿ (2 hoch n)' },
      { text: 'Der größte Wert ist dann ___.', loesung: '2ⁿ − 1, bei 8 Bit also 255' }
    ], fehler: '255 statt 256 Werte – die 0 zählt mit.', beispiel: '4 Bit: 2⁴ = 16 Werte, von 0 bis 15' }
  ],
  selbsttest: ['F16', 'F17', 'F12', 'F5', 'F18'],

  fragen: [
    /* ---------- LZ1 ---------- */
    { id: 'F1', lz: 'LZ1', einsatz: ['check', 'nachweis'], typ: 'zahl', frage: 'Welchen Dezimalwert hat <code>00001011</code>?', zahl: { wert: 11 },
      typisch: [{ wert: 13, feedback: 'Du hast die Stellenwerte von links nach rechts vergeben. Die Stelle mit dem Wert 1 steht ganz rechts.' }, { wert: 1011, feedback: 'Das ist die Ziffernfolge als Dezimalzahl gelesen. Rechne mit den Stellenwerten 8, 4, 2, 1.' }],
      erklaerung: 'Die Einsen stehen bei 8, 2 und 1: 8 + 2 + 1 = 11.' },
    { id: 'F2', lz: 'LZ1', einsatz: ['check'], typ: 'mc', frage: 'Welchen Stellenwert hat das Bit ganz links in einem Byte?',
      optionen: [{ text: '128', richtig: true }, { text: '256', feedback: '256 wäre die neunte Stelle. Ein Byte hat Stellenwerte von 1 bis 128.' }, { text: '8', feedback: '8 ist die Anzahl der Bits in einem Byte, nicht der Stellenwert.' }, { text: '1', feedback: 'Der Stellenwert 1 steht ganz rechts.' }],
      erklaerung: 'Von rechts: 1, 2, 4, 8, 16, 32, 64, 128 – die achte Stelle hat den Wert 2⁷ = 128.' },
    { id: 'F3', lz: 'LZ1', einsatz: ['nachweis', 'vorwissen'], typ: 'zahl', frage: 'Welchen Dezimalwert hat <code>11000000</code>?', zahl: { wert: 192 },
      typisch: [{ wert: 3, feedback: 'Du hast von links mit 1 und 2 angefangen. Die beiden Einsen stehen bei 128 und 64.' }],
      erklaerung: '128 + 64 = 192.' },
    { id: 'F4', lz: 'LZ1', einsatz: ['check'], typ: 'hotspot', frage: 'Tippe auf das Bit mit dem Stellenwert <b>32</b>.',
      svg: IP_SVG([1, 0, 1, 1, 0, 0, 1, 0]),
      bereiche: [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) {
        var w = [128, 64, 32, 16, 8, 4, 2, 1][i];
        return { x: 10 + i * 68, y: 40, w: 60, h: 56, label: (i + 1) + '. Stelle von links', richtig: w === 32, feedback: w === 32 ? '' : 'Diese Stelle hat den Stellenwert ' + w + '. Zähl von rechts: 1, 2, 4, 8, 16, 32.' };
      }),
      erklaerung: 'Von rechts gezählt ist die sechste Stelle (dritte von links) die mit dem Stellenwert 32.' },
    { id: 'F5', lz: 'LZ1', einsatz: ['nachweis'], typ: 'mc', frage: 'Welche dieser Binärzahlen haben den Dezimalwert 10?',
      optionen: [{ text: '<code>00001010</code>', richtig: true }, { text: '<code>1010</code>', richtig: true, feedback: 'Richtig – führende Nullen ändern den Wert nicht.' }, { text: '<code>00000101</code>', feedback: 'Das ist 5 – die Ziffern sind verdreht.' }, { text: '<code>10100000</code>', feedback: 'Hier stehen die Einsen bei 128 und 32: Das ist 160.' }],
      erklaerung: '10 = 8 + 2. Ob davor Nullen stehen, ändert den Wert nicht.' },
    { id: 'F16', lz: 'LZ1', einsatz: ['nachweis'], typ: 'zahl', frage: 'Welchen Dezimalwert hat <code>10101010</code>?', zahl: { wert: 170 },
      typisch: [{ wert: 85, feedback: '85 wäre <code>01010101</code> – du hast die Stellenwerte um eine Stelle verschoben.' }],
      erklaerung: '128 + 32 + 8 + 2 = 170.' },
    { id: 'F19', lz: 'LZ1', einsatz: ['uebung'], typ: 'zahl', frage: 'Welche Dezimalzahl ist <code>10101000</code>?', zahl: { wert: 168 },
      typisch: [{ wert: 21, feedback: 'Du hast von links mit 1 angefangen. Die Stelle ganz links hat den Wert 128.' }],
      erklaerung: '128 + 32 + 8 = 168.' },

    /* ---------- LZ2 ---------- */
    { id: 'F6', lz: 'LZ2', einsatz: ['check', 'nachweis'], typ: 'text', frage: 'Schreibe <b>200</b> als 8-Bit-Binärzahl.', akzeptiert: ['11001000', '1100 1000'],
      typisch: [{ antwort: '00010011', feedback: 'Die Ziffern sind verdreht: Die größte Stelle (128) steht links.' }],
      feedbackFalsch: 'Zerlege 200 in Stellenwerte: Welcher größte Stellenwert passt hinein?',
      erklaerung: '200 = 128 + 64 + 8 → 11001000.' },
    { id: 'F7', lz: 'LZ2', einsatz: ['check'], typ: 'mc', frage: 'Wie lautet <b>100</b> als 8-Bit-Binärzahl?',
      optionen: [{ text: '<code>01100100</code>', richtig: true }, { text: '<code>00100110</code>', feedback: 'Die Ziffern sind verdreht – die 64 steht weiter links als die 4.' }, { text: '<code>01100000</code>', feedback: 'Das ist 96: Der Rest 4 fehlt noch.' }, { text: '<code>10010100</code>', feedback: '128 passt nicht in 100 – die erste Stelle muss 0 sein.' }],
      erklaerung: '100 = 64 + 32 + 4 → 01100100.' },
    { id: 'F8', lz: 'LZ2', einsatz: ['nachweis'], typ: 'zuordnen', frage: 'Ordne jeder Dezimalzahl die passende 8-Bit-Binärzahl zu.',
      paare: [{ links: '1', rechts: '00000001' }, { links: '16', rechts: '00010000' }, { links: '128', rechts: '10000000' }, { links: '255', rechts: '11111111' }],
      erklaerung: 'Eine einzelne 1 an einer Stelle ergibt genau deren Stellenwert; alle acht Einsen ergeben 255.' },
    { id: 'F9', lz: 'LZ2', einsatz: ['check'], typ: 'mc', frage: 'Du rechnest <b>37</b> um. Welchen Stellenwert ziehst du als Erstes ab?',
      optionen: [{ text: '32', richtig: true }, { text: '64', feedback: '64 ist größer als 37 und passt nicht hinein.' }, { text: '16', feedback: '16 passt zwar, aber 32 ist der größte Stellenwert, der passt.' }, { text: '37', feedback: '37 ist kein Stellenwert. Stellenwerte sind 1, 2, 4, 8, 16, 32, 64, 128.' }],
      erklaerung: 'Man beginnt immer mit dem größten passenden Stellenwert: 32 (Rest 5).' },
    { id: 'F10', lz: 'LZ2', einsatz: ['nachweis', 'vorwissen'], typ: 'text', frage: 'Schreibe <b>255</b> als 8-Bit-Binärzahl.', akzeptiert: ['11111111', '1111 1111'],
      typisch: [{ antwort: '100000000', feedback: 'Das sind neun Stellen und der Wert 256. 255 ist der größte Wert eines Bytes.' }],
      erklaerung: '255 = 128 + 64 + 32 + 16 + 8 + 4 + 2 + 1: alle acht Bits sind 1.' },
    { id: 'F17', lz: 'LZ2', einsatz: ['nachweis'], typ: 'text', frage: 'Schreibe <b>64</b> als 8-Bit-Binärzahl.', akzeptiert: ['01000000', '0100 0000'],
      typisch: [{ antwort: '1000000', feedback: 'Der Wert stimmt, aber ein Byte hat acht Stellen – vorne fehlt eine 0.' }, { antwort: '00000010', feedback: 'Die Ziffern sind verdreht: 00000010 ist 2.' }],
      erklaerung: '64 ist ein einzelner Stellenwert: zweite Stelle von links → 01000000.' },

    /* ---------- LZ3 ---------- */
    { id: 'F11', lz: 'LZ3', einsatz: ['check'], typ: 'zahl', frage: 'Wie viele verschiedene Werte lassen sich mit <b>4 Bit</b> darstellen?', zahl: { wert: 16 },
      typisch: [{ wert: 15, feedback: '15 ist der größte Wert. Zusammen mit der 0 sind es 16 Werte.' }, { wert: 8, feedback: '8 wäre 2 · 4. Jedes Bit verdoppelt die Anzahl: 2 · 2 · 2 · 2.' }],
      erklaerung: '2⁴ = 16 Werte, von 0 bis 15.' },
    { id: 'F12', lz: 'LZ3', einsatz: ['nachweis'], typ: 'mc', frage: 'Wie viele Bit brauchst du <b>mindestens</b>, um 1000 verschiedene Werte darzustellen?',
      optionen: [{ text: '10', richtig: true }, { text: '9', feedback: '2⁹ = 512 reicht nicht für 1000 Werte.' }, { text: '1000', feedback: 'Jedes Bit verdoppelt die Anzahl – du brauchst viel weniger Bits als Werte.' }, { text: '4', feedback: 'Mit 4 Bit gibt es nur 16 Werte. Du hast vielleicht an die vier Ziffern von 1000 gedacht.' }],
      erklaerung: '2¹⁰ = 1024 ≥ 1000, 2⁹ = 512 < 1000. Also mindestens 10 Bit.' },
    { id: 'F13', lz: 'LZ3', einsatz: ['check', 'nachweis'], typ: 'zahl', frage: 'Wie viele verschiedene Werte kann <b>ein Byte</b> annehmen?', zahl: { wert: 256 },
      typisch: [{ wert: 255, feedback: '255 ist der größte Wert. Die 0 zählt mit: 256 Werte.' }],
      erklaerung: '2⁸ = 256 Werte, von 0 bis 255.' },
    { id: 'F14', lz: 'LZ3', einsatz: ['check'], typ: 'mc', frage: 'Was passiert mit der Anzahl der darstellbaren Werte, wenn ein Bit dazukommt?',
      optionen: [{ text: 'Sie verdoppelt sich.', richtig: true }, { text: 'Sie steigt um 1.', feedback: 'Das neue Bit kann bei jedem bisherigen Muster 0 oder 1 sein – das verdoppelt die Anzahl.' }, { text: 'Sie steigt um 2.', feedback: 'Bei einem Bit mehr gibt es alle bisherigen Muster einmal mit 0 und einmal mit 1 davor.' }, { text: 'Sie verzehnfacht sich.', feedback: 'Das gilt im Dezimalsystem mit zehn Ziffern. Ein Bit hat nur zwei Zustände.' }],
      erklaerung: 'Jedes zusätzliche Bit verdoppelt die Anzahl: 2ⁿ → 2ⁿ⁺¹.' },
    { id: 'F15', lz: 'LZ3', einsatz: ['nachweis', 'vorwissen'], typ: 'zahl', frage: 'Ein Byte einer IPv4-Adresse hat 8 Bit. Welches ist der <b>größte</b> Wert, der darin stehen kann?', zahl: { wert: 255 },
      typisch: [{ wert: 256, feedback: '256 ist die Anzahl der Werte. Weil bei 0 begonnen wird, ist der größte Wert 255.' }],
      erklaerung: '2⁸ − 1 = 255.' },
    { id: 'F18', lz: 'LZ3', einsatz: ['nachweis'], typ: 'zuordnen', frage: 'Ordne zu: Wie viele verschiedene Werte gibt es mit …',
      paare: [{ links: '1 Bit', rechts: '2' }, { links: '2 Bit', rechts: '4' }, { links: '8 Bit', rechts: '256' }, { links: '16 Bit', rechts: '65 536' }],
      erklaerung: 'Jeweils 2 hoch Anzahl der Bits: 2¹, 2², 2⁸, 2¹⁶.' },
    { id: 'F20', lz: 'LZ3', einsatz: ['uebung'], typ: 'zahl', frage: 'Wie viele verschiedene Bitmuster gibt es mit <b>6 Bit</b>?', zahl: { wert: 64 },
      typisch: [{ wert: 63, feedback: '63 ist der größte Wert. Mit der 0 sind es 64 Muster.' }, { wert: 12, feedback: '12 wäre 2 · 6. Es heißt aber 2 hoch 6.' }],
      erklaerung: '2⁶ = 64.' }
  ]
};
