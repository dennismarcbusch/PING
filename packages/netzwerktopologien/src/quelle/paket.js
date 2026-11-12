/* =====================================================================
   Netzwerktopologien erleben – Version 2 auf der Kompass-Vorlage 4.0
   Gegenstand: der Netzplan aus Version 1 (quelle/topologie.js, TN.netz).
   Fragen stehen in quelle/fragen.md; hier nur Fragen, deren Bild per Code
   entsteht (Bildfragen und Hotspots am Netzplan). js/inhalt.js wird mit
   paket.py bauen erzeugt.
   ===================================================================== */

var PRAXIS = ['Empfang', 'Labor', 'Arzt 1', 'Arzt 2', 'Büro', 'Wartezimmer'];
var LABOR = ['Labor 1', 'Labor 2', 'Labor 3', 'Labor 4', 'Labor 5'];
var STANDORTE = ['Lindenhof', 'Nord', 'Ost', 'Süd', 'West'];

// Praxis mit Obergeschoss: Baum aus Core-Switch und zwei Etagen-Switches
var PRAXIS_BAUM = { knoten: [
  { name: 'Core', typ: 'switch', x: 400, y: 70 },
  { name: 'SW EG', typ: 'switch', x: 230, y: 225 }, { name: 'SW OG', typ: 'switch', x: 570, y: 225 },
  { name: 'Empfang', x: 120, y: 385 }, { name: 'Labor', x: 230, y: 385 }, { name: 'Arzt 1', x: 340, y: 385 },
  { name: 'Arzt 2', x: 460, y: 385 }, { name: 'Büro', x: 570, y: 385 }, { name: 'Physio', x: 680, y: 385 }
], kabel: [['SW EG', 'Core'], ['SW OG', 'Core'], ['Empfang', 'SW EG'], ['Labor', 'SW EG'], ['Arzt 1', 'SW EG'],
  ['Arzt 2', 'SW OG'], ['Büro', 'SW OG'], ['Physio', 'SW OG']] };

// Autohaus Seidl (Selbstüberprüfung): Verkaufsraum als Stern, Werkstatt noch am Bus, beides am Core-Switch
var AUTOHAUS = { knoten: [
  { name: 'Core', typ: 'switch', x: 400, y: 60 },
  { name: 'SW Verkauf', typ: 'switch', x: 210, y: 210 },
  { name: 'Verkauf 1', x: 100, y: 370 }, { name: 'Verkauf 2', x: 210, y: 370 }, { name: 'Verkauf 3', x: 320, y: 370 },
  { name: 'Werkstatt-Bus', typ: 'bus', x: 590, y: 230, w: 330 },
  { name: 'Annahme', x: 470, y: 370 }, { name: 'Montage', x: 590, y: 370 }, { name: 'Lager', x: 710, y: 370 }
], kabel: [['SW Verkauf', 'Core'], ['Verkauf 1', 'SW Verkauf'], ['Verkauf 2', 'SW Verkauf'], ['Verkauf 3', 'SW Verkauf'],
  ['Werkstatt-Bus', 'Core'], ['Annahme', 'Werkstatt-Bus'], ['Montage', 'Werkstatt-Bus'], ['Lager', 'Werkstatt-Bus']] };

// Druckerei Weiß (Übung): Büro und Halle als Sterne, nur über ein Kabel verbunden
var DRUCKEREI = { knoten: [
  { name: 'SW Büro', typ: 'switch', x: 220, y: 200 }, { name: 'SW Halle', typ: 'switch', x: 580, y: 200 },
  { name: 'Chef', x: 90, y: 80 }, { name: 'Buchhaltung', x: 90, y: 330 }, { name: 'Vertrieb', x: 260, y: 380 },
  { name: 'Druck 1', x: 520, y: 380 }, { name: 'Druck 2', x: 710, y: 330 }, { name: 'Leitstand', x: 710, y: 80 }
], kabel: [['Chef', 'SW Büro'], ['Buchhaltung', 'SW Büro'], ['Vertrieb', 'SW Büro'], ['SW Büro', 'SW Halle'],
  ['SW Halle', 'Druck 1'], ['SW Halle', 'Druck 2'], ['SW Halle', 'Leitstand'], ['Druck 1', 'Druck 2']] };

/* ---- Netzplan-Kartei: Topologien am Aufbau erkennen (Station 6 und Übung 5) ---- */
function kartei(box, api, faelle, fertigText) {
  var E = KIT.el, i = 0;
  var namen = ['bus', 'ring', 'star', 'tree', 'full', 'partial'];
  var kopf = E('div', { class: 'tk-kopf', 'aria-live': 'polite' });
  var bild = E('div', { class: 'tk-bild' });
  var knoepfe = E('div', { class: 'tk-knoepfe', role: 'group', 'aria-label': 'Topologie wählen' });
  var b = {};
  namen.forEach(function (k) {
    b[k] = E('button', { type: 'button', text: TN.TOPO[k].name, onclick: function () { waehle(k); } });
    knoepfe.appendChild(b[k]);
  });
  box.appendChild(kopf); box.appendChild(bild); box.appendChild(knoepfe);
  function zeige() {
    var f = faelle[i];
    kopf.innerHTML = 'Plan <b>' + (i + 1) + ' von ' + faelle.length + '</b> · ' + f.kunde;
    bild.innerHTML = TN.bild(f.topo, f.n, { label: 'Netzplan ' + (i + 1) + ' ohne Beschriftung', labels: false });
    namen.forEach(function (k) { b[k].disabled = false; b[k].classList.remove('tk-falsch'); });
  }
  function waehle(k) {
    var f = faelle[i];
    if (k !== f.topo) {
      b[k].disabled = true; b[k].classList.add('tk-falsch');
      api.meldung('Passt nicht zu „' + TN.TOPO[k].name + '“: ' + TN.TOPO[k].recog, 'bad');
      return;
    }
    api.meldung('Richtig: ' + TN.TOPO[k].name + '. ' + TN.TOPO[k].recog, 'ok');
    i++;
    if (i < faelle.length) zeige();
    else { namen.forEach(function (x) { b[x].disabled = true; }); api.erledigt(fertigText); }
  }
  zeige();
  return {
    zeigeFall: function (topo, n, text) { bild.innerHTML = TN.bild(topo, n, { labels: false }); kopf.innerHTML = text; namen.forEach(function (k) { b[k].classList.toggle('tk-hervor', k === topo); }); },
    zurueck: function () { i = 0; namen.forEach(function (k) { b[k].classList.remove('tk-hervor'); }); zeige(); },
    loesen: function () { while (i < faelle.length) waehle(faelle[i].topo); }
  };
}
(function () {
  var css = '.tk-kopf{font-size:.95rem;margin-bottom:6px}' +
    '.tk-bild{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:6px;display:flex;justify-content:center}' +
    '.tk-bild svg{max-width:440px;height:195px}' +
    '.tk-knoepfe{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}' +
    '.tk-knoepfe button{min-height:44px}' +
    '.tk-knoepfe button.tk-falsch{text-decoration:line-through}' +
    '.tk-knoepfe button.tk-hervor{outline:3px solid var(--deko);outline-offset:2px}' +
    '.su-raster{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:14px;align-items:start}' +
    '.su-raster ol{margin:0;padding-left:1.3em;display:flex;flex-direction:column;gap:10px}' +
    '.su-raster label{display:block;font-size:.92rem}' +
    '.su-raster select,.su-raster input{font:inherit;margin-top:4px;padding:6px 8px;border:1px solid var(--line);border-radius:8px;max-width:100%}' +
    '@media (max-width:900px){.su-raster{grid-template-columns:1fr}}';
  var s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
})();

/* ---- Hilfen für Fragen mit Bild am Netzplan ---- */
function bildFrage(id, lz, einsatz, topo, n, falsch) {
  var opt = [{ text: TN.TOPO[topo].name, richtig: true }];
  falsch.forEach(function (k) { opt.push({ text: TN.TOPO[k].name, feedback: 'Bei „' + TN.TOPO[k].name + '“ gilt: ' + TN.TOPO[k].recog + ' Das passt nicht zu diesem Plan.' }); });
  return { id: id, lz: lz, einsatz: einsatz, typ: 'mc', frage: 'Welche Netzwerktopologie ist hier abgebildet?',
    bild: TN.bild(topo, n, { labels: false, label: 'Netzplan ohne Beschriftung' }), optionen: opt,
    erklaerung: TN.TOPO[topo].name + ': ' + TN.TOPO[topo].recog };
}
function hotspotFrage(id, lz, einsatz, G, frage, richtig, falschText, erklaerung) {
  return { id: id, lz: lz, einsatz: einsatz, typ: 'hotspot', frage: frage, svg: TN.grafik(G, { label: 'Netzplan' }),
    bereiche: G.nodes.map(function (k) {
      var ok = richtig(k), base = { label: k.type === 'bus' ? 'Bus-Kabel' : k.label, richtig: ok, feedback: ok ? '' : falschText(k) };
      if (k.type === 'bus') { base.x = k.x - k.w / 2; base.y = k.y - 22; base.w = k.w; base.h = 44; }
      else { base.cx = k.x; base.cy = k.y; base.r = 38; }
      return base;
    }), erklaerung: erklaerung };
}
function sagWerkzeug(api, ev) { if (ev.typ === 'werkzeug') api.erklaere('<p>' + ev.hilfe + '</p>'); }

window.PAKET = {
  id: 'ping-netzwerktopologien',
  titel: 'Netzwerktopologien erleben',
  untertitel: 'Wer kann noch mit wem sprechen?',
  version: '2.0',
  bereit: 80,
  dauer: 'etwa 90–120 Minuten',
  welt: { thema: 'technik', kulisse: 'buero', symbol: '🕸️' },
  figur: { name: 'Mira Hofmann', rolle: 'Ausbilderin bei Korbwerk IT-Service',
    aussehen: { haut: 1, haare: 'rot', frisur: 'zopf', kleidung: '#4338ca', brille: true } },
  figuren: {
    albers: { name: 'Petra Albers', rolle: 'Praxismanagerin, Praxis Lindenhof',
      aussehen: { haut: 3, haare: 'dunkelbraun', frisur: 'dutt', kleidung: '#0f766e' } },
    seidl: { name: 'Jonas Seidl', rolle: 'Inhaber, Autohaus Seidl',
      aussehen: { haut: 2, haare: 'blond', frisur: 'kurz', kleidung: '#1f2937', krawatte: '#b91c1c', bart: true } },
    weiss: { name: 'Hanna Weiß', rolle: 'Leiterin, Druckerei Weiß',
      aussehen: { haut: 0, haare: 'grau', frisur: 'kurz', kleidung: '#7c3aed', brille: true } }
  },
  leitsituation: 'Die <b>Praxis Lindenhof</b> ruft bei Korbwerk an: „Bei uns geht gar nichts mehr!“ Du findest heraus, warum – und welcher Netzaufbau zur Praxis passt.',

  lernziele: [
    { id: 'LZ1', kurz: 'Topologien erkennen', text: 'Ich kann Bus, Ring, Stern, Baum, Voll- und Teilvermaschung an ihrem Aufbau erkennen und benennen.' },
    { id: 'LZ2', kurz: 'Vor- und Nachteile', text: 'Ich kann Vor- und Nachteile der Topologien an einem Netz begründen.' },
    { id: 'LZ3', kurz: 'Aufwand und Umbau', text: 'Ich kann den Kabelaufwand einer Topologie berechnen und ein Netz in eine andere Topologie umbauen.' },
    { id: 'LZ4', kurz: 'Schwachstellen finden', text: 'Ich kann Single Points of Failure finden und die Folgen eines Ausfalls einschätzen.' }
  ],

  glossar: [
    { begriff: 'Topologie', erklaerung: 'Wie die Geräte eines Netzes miteinander verbunden sind – der Aufbau des Netzes.', vorab: 'S1' },
    { begriff: 'Switch', erklaerung: 'Verteiler im Netz. Er leitet Daten gezielt an das Gerät weiter, für das sie bestimmt sind.', vorab: 'S1' },
    { begriff: 'Patchkabel', erklaerung: 'Kurzes Netzwerkkabel zwischen einem Gerät und der Netzwerkdose oder dem Switch.', vorab: 'S1' },
    { begriff: 'Single Point of Failure (SPOF)', erklaerung: 'Ein einzelnes Teil, dessen Ausfall das ganze Netz oder einen großen Teil davon lahmlegt.' },
    { begriff: 'Sterntopologie', erklaerung: 'Jedes Gerät hat ein eigenes Kabel zu einem zentralen Verteiler (Switch).' },
    { begriff: 'Bustopologie', erklaerung: 'Alle Geräte hängen an einem gemeinsamen, durchgehenden Kabel.', vorab: 'S2' },
    { begriff: 'Abschlusswiderstand (Terminator)', erklaerung: 'Sitzt an beiden Enden eines Bus-Kabels. Er verhindert, dass Signale am Kabelende zurückgeworfen werden.', vorab: 'S2' },
    { begriff: 'Kollision', erklaerung: 'Zwei Geräte senden gleichzeitig auf demselben Kabel. Die Signale überlagern sich und sind unbrauchbar.', vorab: 'S2' },
    { begriff: 'CSMA/CD', erklaerung: 'Regel im Bus: Erst hören, ob das Kabel frei ist, dann senden. Bei einer Kollision warten beide eine zufällige Zeit und senden neu.' },
    { begriff: 'Ringtopologie', erklaerung: 'Jedes Gerät hat genau zwei Nachbarn. Daten laufen im Kreis von Gerät zu Gerät.', vorab: 'S3' },
    { begriff: 'Token', erklaerung: 'Eine Art Staffelstab im Ring: Nur wer ihn hat, darf senden. So gibt es keine Kollisionen.', vorab: 'S3' },
    { begriff: 'Doppelring', erklaerung: 'Zweiter Ring, der in die andere Richtung läuft. Er überbrückt einen einzelnen Ausfall.' },
    { begriff: 'Vollvermaschung', erklaerung: 'Jedes Gerät ist direkt mit jedem anderen verbunden. Kabel: n · (n − 1) / 2.', vorab: 'S4' },
    { begriff: 'Teilvermaschung', erklaerung: 'Geräte haben mehrere, aber nicht alle möglichen Verbindungen. Daten nehmen oft einen Umweg (Routing).' },
    { begriff: 'Routing', erklaerung: 'Einen passenden Weg für Daten auswählen, wenn es mehrere Wege gibt.' },
    { begriff: 'Baumtopologie', erklaerung: 'Mehrere Sterne in Ebenen: Switches sind über einen zentralen Switch verbunden, ohne Kreise.', vorab: 'S5' },
    { begriff: 'Core-Switch', erklaerung: 'Zentraler Switch an der Spitze eines Baums. Alle anderen Switches hängen an ihm.', vorab: 'S5' },
    { begriff: 'Uplink', erklaerung: 'Kabel von einem Switch zum nächsthöheren Switch.' },
    { begriff: 'Endgerät', erklaerung: 'Gerät, an dem gearbeitet wird oder das Daten liefert, z. B. PC, Drucker oder Messgerät.' }
  ],

  stationen: [
    {
      id: 'S1', titel: 'Stern: Wer redet noch mit wem?', lz: ['LZ4'], figur: 'albers', vorab: 'V1',
      auftrag: '„Bei uns geht gar nichts mehr!“ Lass Geräte und Kabel ausfallen: Welches <b>einzelne</b> Teil legt alles lahm?',
      inhalt: '<p>Im <b>Stern</b> hängt jedes Gerät mit einem eigenen Kabel an einem zentralen Verteiler, dem Switch. Der Switch leitet Daten gezielt nur an den Empfänger weiter.</p>',
      interaktion: function (box, api) {
        var gesehen = { klein: false, switch: false }, fertig = false;
        var netz = TN.netz(box, {
          topo: 'star', n: 6, namen: PRAXIS, werkzeuge: ['ausfall', 'paket', 'reparieren'], hoehe: 270,
          beschriftung: 'Netzplan der Praxis Lindenhof: sechs PCs an einem Switch', beiEreignis: reagiere
        });
        function reagiere(ev) {
          if (api.demo()) return;
          var s = ev.stand;
          sagWerkzeug(api, ev);
          if (ev.typ === 'ausfall' && ev.aus) {
            if (ev.art === 'switch') {
              gesehen.switch = true;
              api.erklaere('<p>Der <b>Switch</b> ist ausgefallen: <b>' + s.ok + ' von ' + s.alle + '</b> PC-Paaren können noch Daten austauschen. Jedes Kabel endet am Switch – ohne ihn gibt es keinen Weg mehr.</p>');
              if (!gesehen.klein) api.meldung('Alles steht still. Vergleiche: Was passiert, wenn nur ein PC oder nur ein Kabel ausfällt?', 'warn');
            } else {
              gesehen.klein = true;
              var wer = ev.art === 'kabel' ? 'Das Kabel ' + ev.name.replace('Kabel ', '') : 'Der PC ' + ev.name;
              api.erklaere('<p>' + wer + ' ist ausgefallen. Noch <b>' + s.ok + ' von ' + s.alle + '</b> PC-Paaren können Daten austauschen – alle anderen hängen an ihrem eigenen Kabel.</p>');
              if (!gesehen.switch) api.meldung('Nur ein Gerät ist betroffen. Gibt es ein Teil, dessen Ausfall alle trifft?', '');
            }
          } else if (ev.typ === 'paket') {
            if (ev.ok) api.erklaere('<p>Das Paket läuft <b>' + ev.weg.join(' → ') + '</b>. Jeder Weg führt über den Switch.</p>');
            else api.erklaere('<p>Kein Weg von ' + ev.von + ' zu ' + ev.nach + ': ' + (ev.grund === 'weg' ? 'Das Kabel oder der Switch dazwischen ist ausgefallen.' : (ev.grund === 'absender' ? ev.von : ev.nach) + ' ist selbst ausgefallen.') + '</p>');
          } else if (ev.typ === 'repariert') {
            api.erklaere('<p>Alles repariert: Jeder PC erreicht wieder jeden anderen.</p>');
          }
          if (!fertig && gesehen.klein && gesehen.switch) {
            fertig = true;
            api.sage('Genau so war es heute Morgen – der Switch im Flurschrank hatte keinen Strom!', 'froh');
            api.erledigt('Der Switch ist der <b>Single Point of Failure</b> des Sterns: Fällt er aus, ist jeder PC allein. Ein PC oder ein Kabel betrifft nur ein Gerät.');
          }
        }
        api.erklaere('<p>Wähle <b>⚡ Ausfall</b> und tippe ein Gerät oder Kabel an. Oben rechts siehst du, wie viele PC-Paare noch Daten austauschen können.</p>');
        return {
          demo: [
            { text: 'Ein kleinerer Stern in der Korbwerk-Werkstatt. Ich schicke ein Paket von PC1 zu PC3.', warum: 'Im Stern führt jeder Weg über den Switch: PC1 → Switch → PC3.',
              tun: function () { netz.neu('star', 4, ['PC1', 'PC2', 'PC3', 'PC4']); netz.sende('PC1', 'PC3'); } },
            { text: 'Jetzt fällt das Kabel von PC2 aus.', warum: 'PC2 hat nur dieses eine Kabel. Die anderen PCs hängen an ihren eigenen Kabeln – nur PC2 ist abgeschnitten (3 von 6 Paaren bleiben).',
              tun: function () { netz.ausfall(netz.kabelVon('PC2')); } },
            { text: 'Das Paket von PC1 zu PC3 kommt trotzdem an.', warum: 'Der Weg PC1 → Switch → PC3 braucht das Kabel von PC2 nicht.',
              tun: function () { netz.sende('PC1', 'PC3'); } }
          ],
          zuruecksetzen: function () { netz.neu('star', 6, PRAXIS); netz.werkzeug('ausfall'); gesehen = { klein: false, switch: false }; fertig = false; },
          loesen: function () { netz.repariere(); netz.ausfall('Labor'); netz.ausfall('Switch'); }
        };
      },
      selbsterklaerung: { schritt: 2, frage: 'Warum ist nach dem Kabelbruch nur PC2 betroffen und nicht das ganze Netz?' },
      steckbrief: '<p><b>Vorteile:</b> Ein defektes Kabel oder Gerät betrifft nur dieses eine Gerät. Leicht zu erweitern, Fehler lassen sich gut eingrenzen. Der Switch verhindert Kollisionen.</p><p><b>Nachteile:</b> Der Switch ist ein Single Point of Failure. Jedes Gerät braucht ein eigenes Kabel. Die Zahl der Switch-Ports begrenzt die Größe.</p><p><b>Kabel:</b> n Geräte → n Kabel.</p>',
      beruf: 'Fast jedes heutige Firmen- und Schulnetz ist ein Stern mit Switch. Deshalb steht der Switch in einem abgeschlossenen Schrank, oft mit unterbrechungsfreier Stromversorgung (USV).',
      check: ['C1', 'C2']
    },
    {
      id: 'S2', titel: 'Bus: Ein Kabel für alle', lz: ['LZ2', 'LZ4'], figur: 'albers', vorab: 'V2',
      auftrag: '„Das Labor ist ständig langsam, gestern war alles weg.“ Lass zwei Geräte gleichzeitig senden und das Bus-Kabel brechen.',
      inhalt: '<p>Im <b>Bus</b> hängen alle Geräte an einem gemeinsamen Kabel. Jedes Signal erreicht alle; nur der Empfänger übernimmt die Daten.</p>',
      interaktion: function (box, api) {
        var gesehen = { kollision: false, bus: false }, fertig = false;
        var netz = TN.netz(box, {
          topo: 'bus', n: 5, namen: LABOR, werkzeuge: ['ausfall', 'paket', 'kollision', 'reparieren'], hoehe: 250,
          beschriftung: 'Labor der Praxis: fünf Messgeräte an einem Bus-Kabel', beiEreignis: reagiere
        });
        function reagiere(ev) {
          if (api.demo()) return;
          var s = ev.stand;
          sagWerkzeug(api, ev);
          if (ev.typ === 'kollision' && ev.phase === 'start') api.erklaere('<p>' + ev.a + ' und ' + ev.b + ' hören: Das Kabel ist frei. Beide senden <b>gleichzeitig</b> …</p>');
          if (ev.typ === 'kollision' && ev.phase === 'kollision') api.erklaere('<p><b>Kollision!</b> Die Signale überlagern sich. Beide warten eine zufällige Zeit (CSMA/CD), dann sendet einer zuerst.</p>');
          if (ev.typ === 'kollision' && ev.phase === 'fertig') { gesehen.kollision = true; api.erklaere('<p>Erst nach dem Warten kommt das Paket an. Je mehr Geräte sich das Kabel teilen, desto öfter kollidieren sie – das Netz wird langsamer.</p>'); }
          if (ev.typ === 'ausfall' && ev.aus) {
            if (ev.art === 'bus') { gesehen.bus = true; api.erklaere('<p><b>Kabelbruch!</b> Ohne durchgehendes Kabel mit Abschlusswiderständen werden Signale zurückgeworfen: <b>' + s.ok + ' von ' + s.alle + '</b> Paaren können noch Daten austauschen.</p>'); }
            else if (ev.art === 'pc') api.erklaere('<p>' + ev.name + ' ist aus. Die anderen arbeiten weiter: <b>' + s.ok + ' von ' + s.alle + '</b> Paaren. Ein Gerät am Bus hört nur mit.</p>');
            else api.erklaere('<p>Ein Anschlusskabel ist ab: Nur dieses eine Gerät ist getrennt (' + s.ok + ' von ' + s.alle + ' Paaren).</p>');
          }
          if (ev.typ === 'paket' && ev.ok) api.erklaere('<p>Das Signal läuft über das ganze Kabel und erreicht <b>alle</b> Geräte. Nur ' + ev.nach + ' übernimmt die Daten.</p>');
          if (!fertig && gesehen.kollision && gesehen.bus) {
            fertig = true;
            api.sage('Also beides: Die Geräte stören sich gegenseitig, und ein einziger Kabelbruch legt alles lahm.', 'nachdenklich');
            api.erledigt('Der Bus ist billig, aber das Kabel ist ein Single Point of Failure, und gleichzeitiges Senden führt zu Kollisionen.');
          }
        }
        api.erklaere('<p>Probiere <b>💥 Gleichzeitig senden</b>. Lass danach mit <b>⚡ Ausfall</b> das Bus-Kabel brechen.</p>');
        return {
          demo: [
            { text: 'Ein Bus mit vier Geräten. Ich schicke ein Paket von PC1 zu PC3.', warum: 'Das Signal breitet sich über das ganze Kabel aus – alle hören es, nur PC3 übernimmt die Daten.',
              tun: function () { netz.neu('bus', 4, ['PC1', 'PC2', 'PC3', 'PC4']); netz.sende('PC1', 'PC3'); } },
            { text: 'PC2 wird ausgeschaltet.', warum: 'Ein Gerät am Bus leitet nichts weiter; es hört nur mit. Fällt es aus, merken die anderen nichts.',
              tun: function () { netz.ausfall('PC2'); } },
            { text: 'Das Paket von PC1 zu PC3 kommt trotzdem an.', warum: 'Der Weg braucht nur das durchgehende Kabel, nicht PC2.',
              tun: function () { netz.sende('PC1', 'PC3'); } }
          ],
          zuruecksetzen: function () { netz.neu('bus', 5, LABOR); netz.werkzeug('ausfall'); gesehen = { kollision: false, bus: false }; fertig = false; },
          loesen: function () { gesehen.kollision = true; netz.ausfall('Bus'); }
        };
      },
      selbsterklaerung: { schritt: 2, frage: 'Warum stört es die anderen nicht, wenn PC2 ausfällt – obwohl alle am selben Kabel hängen?' },
      steckbrief: '<p><b>Vorteile:</b> Wenig Kabel, günstig, keine aktiven Geräte nötig. Fällt ein Endgerät aus, arbeiten die anderen weiter.</p><p><b>Nachteile:</b> Kabelbruch oder fehlender Abschlusswiderstand legt alles lahm. Nur einer kann gleichzeitig senden – Kollisionen. Alle hören mit (Datenschutz).</p><p><b>Kabel:</b> n Anschlüsse + 1 Hauptleitung.</p>',
      beruf: 'Ethernet mit Koaxialkabel (10BASE2) gibt es kaum noch. Busse findest du aber im Auto (CAN-Bus) und in der Industrie (Feldbus).',
      check: ['C3', 'C4']
    },
    {
      id: 'S3', titel: 'Ring: Immer weiterreichen', lz: ['LZ2', 'LZ4'], vorab: 'V3',
      auftrag: 'Ein alter Ring aus einem Kundenprojekt: Lass ein Gerät ausfallen und schick ein Paket. Schalte dann den Doppelring dazu.',
      inhalt: '<p>Im <b>Ring</b> hat jedes Gerät genau zwei Nachbarn. Daten laufen im Kreis weiter. Senden darf nur, wer das <b>Token</b> hat.</p>',
      interaktion: function (box, api) {
        var gesehen = { stillstand: false, doppel: false }, fertig = false;
        var netz = TN.netz(box, {
          topo: 'ring', n: 5, werkzeuge: ['ausfall', 'paket', 'doppelring', 'reparieren'], hoehe: 235,
          beschriftung: 'Ring mit fünf PCs', beiEreignis: reagiere
        });
        function reagiere(ev) {
          if (api.demo()) return;
          var s = ev.stand;
          sagWerkzeug(api, ev);
          if (ev.typ === 'ausfall' && ev.aus) {
            if (s.ok === 0) api.erklaere('<p>' + ev.name + ' ist ausgefallen – und <b>niemand</b> kann mehr senden. Das Token kommt nicht mehr herum.</p>');
            else api.erklaere('<p>' + ev.name + ' ist ausgefallen. Der Doppelring leitet um: noch <b>' + s.ok + ' von ' + s.alle + '</b> Paaren.</p>');
          }
          if (ev.typ === 'paket') {
            if (ev.gesperrt) { gesehen.stillstand = true; api.erklaere('<p>Kein Paket möglich: Der einfache Ring ist unterbrochen, das Token kreist nicht mehr.</p>'); api.meldung('Der ganze Ring steht still. Was ändert der Doppelring?', 'warn'); }
            else if (ev.ok) {
              api.erklaere('<p>Das Paket läuft <b>' + ev.weg.join(' → ') + '</b> – jede Station reicht es weiter.</p>');
              if (gesehen.stillstand && s.ausgefallen.length) gesehen.doppel = true;
            }
          }
          if (ev.typ === 'doppelring') api.erklaere(ev.an ? '<p>Doppelring an: Ein zweiter Ring läuft in die Gegenrichtung. Schick noch einmal ein Paket.</p>' : '<p>Einfacher Ring: Die Pfeile zeigen die Senderichtung.</p>');
          if (!fertig && gesehen.stillstand && gesehen.doppel) {
            fertig = true;
            api.sage('Siehst du? Mit dem zweiten Ring kommt das Paket trotz Ausfall an.', 'froh');
            api.erledigt('Im einfachen Ring legt jeder Ausfall alles lahm. Der Doppelring überbrückt einen einzelnen Ausfall.');
          }
        }
        api.erklaere('<p>Lass mit <b>⚡ Ausfall</b> ein Gerät ausfallen und schick dann mit <b>✉ Paket senden</b> ein Paket zwischen zwei anderen.</p>');
        return {
          demo: [
            { text: 'Ein Ring mit vier PCs. Ich schicke ein Paket von PC1 zu PC3.', warum: 'Die Daten laufen in eine Richtung über PC2 – jede Station reicht sie weiter.',
              tun: function () { netz.neu('ring', 4); netz.sende('PC1', 'PC3'); } },
            { text: 'PC4 fällt aus. Ich versuche wieder, von PC1 zu PC3 zu senden.', warum: 'Obwohl PC4 nicht auf dem Weg liegt, geht nichts: Das Token muss einmal ganz herum – der Ring ist unterbrochen.',
              tun: function () { netz.ausfall('PC4'); netz.sende('PC1', 'PC3'); } },
            { text: 'Mit dem Doppelring klappt es wieder.', warum: 'Der zweite Ring läuft in die Gegenrichtung und schließt die Lücke.',
              tun: function () { netz.werkzeug('doppelring'); netz.sende('PC1', 'PC3'); } }
          ],
          zuruecksetzen: function () { netz.neu('ring', 5); netz.werkzeug('ausfall'); gesehen = { stillstand: false, doppel: false }; fertig = false; },
          loesen: function () { netz.ausfall('PC2'); netz.sende('PC3', 'PC5', true); netz.werkzeug('doppelring'); netz.sende('PC3', 'PC5', true); }
        };
      },
      selbsterklaerung: { schritt: 2, frage: 'PC4 liegt gar nicht auf dem Weg von PC1 zu PC3. Warum geht trotzdem nichts mehr?' },
      steckbrief: '<p><b>Vorteile:</b> Keine Kollisionen durch das Token, jede Station kommt sicher an die Reihe. Jede Station frischt das Signal auf.</p><p><b>Nachteile:</b> Ohne Doppelring legt jeder Ausfall den ganzen Ring lahm. Die Laufzeit steigt mit jeder Station. Zum Erweitern muss der Ring aufgetrennt werden.</p><p><b>Kabel:</b> n Geräte → n Kabel.</p>',
      beruf: 'Token Ring ist Geschichte. Ringe mit Glasfaser findest du aber bei Providern und in Fabriken – dort fast immer doppelt.',
      check: ['C5', 'C6', 'W1']
    },
    {
      id: 'S4', titel: 'Vermascht: Viele Wege, viele Kabel', lz: ['LZ3', 'LZ2'], figur: 'albers', vorab: 'V4',
      auftrag: '„Wir haben jetzt fünf Standorte. Jeder soll jeden direkt erreichen.“ Verbinde im Plan jeden Standort mit jedem anderen.',
      inhalt: '<p>Bei der <b>Vollvermaschung</b> ist jedes Gerät mit jedem anderen direkt verbunden. Fällt ein Kabel aus, gibt es viele Umwege – aber das kostet Kabel.</p>',
      interaktion: function (box, api) {
        var fertig = false;
        var netz = TN.netz(box, {
          topo: 'ring', n: 5, namen: STANDORTE, werkzeuge: ['verbinden', 'loeschen'], hoehe: 270, anzeige: 'aufbau',
          beschriftung: 'Fünf Standorte der Praxis, im Ring verbunden', beiEreignis: reagiere
        });
        function reagiere(ev) {
          if (api.demo()) return;
          sagWerkzeug(api, ev);
          if (ev.typ === 'hinweis') api.meldung(ev.text, 'warn');
          if (ev.typ !== 'umbau') return;
          var m = ev.kennzahlen;
          if (ev.topologie.key === 'full') {
            if (!fertig) {
              fertig = true;
              api.sage('Zehn Leitungen für fünf Standorte – das wird teuer!', 'nachdenklich');
              api.erledigt('Vollvermascht mit 5 Standorten: 5 · 4 / 2 = <b>10 Kabel</b>, jeder Standort braucht 4 Anschlüsse.');
            }
          } else api.erklaere('<p>Jetzt <b>' + m.cables + '</b> Kabel, höchstens ' + m.maxPorts + ' Anschlüsse an einem Standort. Für jeden mit jedem fehlen noch ' + Math.max(0, 10 - m.cables) + '.</p>');
        }
        api.erklaere('<p>Wähle <b>🔗 Verbinden</b> und tippe nacheinander zwei Standorte an.</p>');
        return {
          demo: [
            { text: 'Vier Geräte im Ring: 4 Kabel. Jedes hat zwei Nachbarn.', warum: 'Im Ring sind nur die Nachbarn verbunden.',
              tun: function () { netz.neu('ring', 4); } },
            { text: 'Ich ziehe die erste Diagonale: PC1 mit PC3.', warum: 'PC1 war mit PC3 noch nicht direkt verbunden.',
              tun: function () { netz.verbinde('PC1', 'PC3'); } },
            { text: 'Und PC2 mit PC4. Jetzt ist jedes Gerät mit jedem verbunden: 6 Kabel.', warum: 'Jedes der 4 Geräte hat 3 Partner: 4 · 3 = 12 – aber jedes Kabel verbindet zwei Geräte, also 12 / 2 = 6.',
              tun: function () { netz.verbinde('PC2', 'PC4'); } }
          ],
          zuruecksetzen: function () { netz.neu('ring', 5, STANDORTE); netz.werkzeug('verbinden'); fertig = false; },
          loesen: function () { [['Lindenhof', 'Ost'], ['Lindenhof', 'Süd'], ['Nord', 'Süd'], ['Nord', 'West'], ['Ost', 'West']].forEach(function (p) { if (!netz.kabel(p[0], p[1])) netz.verbinde(p[0], p[1]); }); }
        };
      },
      selbsterklaerung: { schritt: 3, frage: 'Warum wird 4 · 3 noch durch 2 geteilt?' },
      mitdenken: { auftrag: 'Rechne aus, wie viele Kabel eine Vollvermaschung mit 10 und mit 20 Geräten braucht. Erkläre deinem Sitznachbarn, warum die Zahl so schnell wächst.', muster: '10 Geräte: 10 · 9 / 2 = 45 Kabel. 20 Geräte: 20 · 19 / 2 = 190 Kabel. Jedes neue Gerät braucht ein Kabel zu allen, die schon da sind – der Aufwand wächst ungefähr mit n².' },
      steckbrief: '<p><b>Vollvermascht:</b> höchste Ausfallsicherheit, keine zentrale Komponente. Aber n · (n − 1) / 2 Kabel und n − 1 Anschlüsse je Gerät – teuer und schlecht erweiterbar.</p><p><b>Teilvermascht:</b> mehrere, aber nicht alle Verbindungen. Guter Kompromiss, braucht aber Routing.</p>',
      beruf: 'Voll vermascht werden nur wenige Geräte, etwa die Server eines Clusters oder ein paar Standorte per VPN. Das Internet ist teilvermascht.',
      check: ['C7', 'C8', 'W2']
    },
    {
      id: 'S5', titel: 'Baum: Sterne in Ebenen', lz: ['LZ4'], figur: 'albers', vorab: 'V5',
      auftrag: '„Wir haben jetzt ein Obergeschoss.“ Welcher Ausfall trennt nur ein Stockwerk, welcher die Stockwerke voneinander?',
      inhalt: '<p>Im <b>Baum</b> hängen mehrere Sterne an einem zentralen Switch, dem <b>Core-Switch</b>. Die Etagen-Switches sind über ein Kabel (Uplink) mit ihm verbunden.</p>',
      interaktion: function (box, api) {
        var gesehen = { etage: false, core: false }, fertig = false;
        var netz = TN.netz(box, {
          topo: 'plan', plan: PRAXIS_BAUM, werkzeuge: ['ausfall', 'paket', 'reparieren'], hoehe: 255,
          beschriftung: 'Praxis mit Erdgeschoss und Obergeschoss als Baum', beiEreignis: reagiere
        });
        function reagiere(ev) {
          if (api.demo()) return;
          var s = ev.stand;
          sagWerkzeug(api, ev);
          if (ev.typ === 'ausfall' && ev.aus) {
            if (ev.name === 'Core') { gesehen.core = true; api.erklaere('<p>Der <b>Core-Switch</b> ist aus: Erdgeschoss und Obergeschoss arbeiten jeweils für sich weiter, sind aber voneinander getrennt (' + s.ok + ' von ' + s.alle + ' Paaren).</p>'); }
            else if (ev.art === 'switch') { gesehen.etage = true; api.erklaere('<p>' + ev.name + ' ist aus: Nur die PCs an diesem Switch sind abgeschnitten. Das andere Stockwerk arbeitet weiter (' + s.ok + ' von ' + s.alle + ' Paaren).</p>'); }
            else api.erklaere('<p>' + ev.name + ' ist ausgefallen: noch ' + s.ok + ' von ' + s.alle + ' Paaren.</p>');
          }
          if (ev.typ === 'paket' && ev.ok) api.erklaere('<p>Das Paket läuft <b>' + ev.weg.join(' → ') + '</b>.</p>');
          if (!fertig && gesehen.etage && gesehen.core) {
            fertig = true;
            api.sage('Dann kommt der Core-Switch in den abgeschlossenen Serverschrank.', 'froh');
            api.erledigt('Im Baum trennt ein Etagen-Switch nur seinen Teilbaum. Der Core-Switch trennt die Teilbäume voneinander – er ist besonders kritisch.');
          }
        }
        api.erklaere('<p>Lass mit <b>⚡ Ausfall</b> nacheinander einen Etagen-Switch und den Core-Switch ausfallen. Repariere dazwischen.</p>');
        return {
          demo: [
            { text: 'Ein Baum mit drei Switches. Ich schicke ein Paket von PC1 zu PC9.', warum: 'Der Weg geht hinauf zum Core und wieder hinunter: PC1 → SW1 → Core → SW3 → PC9.',
              tun: function () { netz.neu('tree', 9); netz.sende('PC1', 'PC9'); } },
            { text: 'SW2 fällt aus.', warum: 'Nur PC4 bis PC6 hängen an SW2 – sie sind abgeschnitten. Die anderen Teilbäume merken nichts.',
              tun: function () { netz.ausfall('SW2'); } },
            { text: 'Das Paket von PC1 zu PC9 kommt trotzdem an.', warum: 'SW2 liegt nicht auf dem Weg zwischen SW1 und SW3.',
              tun: function () { netz.sende('PC1', 'PC9'); } }
          ],
          zuruecksetzen: function () { netz.neu('plan'); netz.werkzeug('ausfall'); gesehen = { etage: false, core: false }; fertig = false; },
          loesen: function () { netz.ausfall('SW OG'); netz.repariere(); netz.ausfall('Core'); }
        };
      },
      selbsterklaerung: { schritt: 2, frage: 'Warum sind beim Ausfall von SW2 nur drei PCs betroffen?' },
      steckbrief: '<p><b>Vorteile:</b> Gut erweiterbar, auch für große Netze. Ausfälle bleiben auf einen Teilbaum begrenzt. Klare Ordnung (Etagenverteiler).</p><p><b>Nachteile:</b> Fällt ein Switch aus, ist sein ganzer Teilbaum getrennt. Der Core-Switch ist besonders kritisch. Uplinks können zum Engpass werden.</p><p><b>Kabel:</b> Geräte insgesamt − 1 (ein Baum hat keine Kreise).</p>',
      beruf: 'So sind fast alle Schul- und Firmennetze aufgebaut: Core-Switch im Serverraum, darunter Etagen- und Raum-Switches.',
      check: ['C9', 'C10', 'W3']
    },
    {
      id: 'S6', titel: 'Erkennen: Welches Netz ist das?', lz: ['LZ1'], vorab: 'V6',
      auftrag: 'Ich lege dir Netzpläne von Kunden vor – ohne Beschriftung. Bestimme bei jedem Plan die Topologie.',
      inhalt: '<p>Schau zuerst, ob es einen Verteiler gibt. Dann zähle die Nachbarn jedes Geräts und suche nach Kreisen.</p>',
      interaktion: function (box, api) {
        var k = kartei(box, api, [
          { kunde: 'Bäckerei Brunner', topo: 'star', n: 5 },
          { kunde: 'Metzgerei Hahn', topo: 'ring', n: 6 },
          { kunde: 'Schreinerei Maier', topo: 'tree', n: 7 },
          { kunde: 'Steuerkanzlei Weidner', topo: 'partial', n: 6 },
          { kunde: 'Musikschule im Altbau', topo: 'bus', n: 5 },
          { kunde: 'Rechenzentrum Kraus', topo: 'full', n: 5 }
        ], 'Alle sechs Pläne richtig bestimmt.');
        api.erklaere('<p>Tippe unter dem Plan auf den passenden Namen.</p>');
        return {
          demo: [
            { text: 'Dieser Plan: ein Verteiler in der Mitte, jedes Gerät hat genau ein Kabel zu ihm.', warum: 'Ein zentraler Verteiler mit eigenen Kabeln zu allen Geräten ist ein Stern.',
              tun: function () { k.zeigeFall('star', 7, 'Vorführung · Stern'); } },
            { text: 'Dieser Plan: kein Verteiler. Jedes Gerät hat drei Kabel, aber nicht zu allen.', warum: 'Mehrere, aber nicht alle Verbindungen heißt teilvermascht. Vollvermascht hätte jedes der 6 Geräte 5 Kabel.',
              tun: function () { k.zeigeFall('partial', 6, 'Vorführung · Teilvermascht'); } }
          ],
          zuruecksetzen: function () { k.zurueck(); },
          loesen: function () { k.loesen(); }
        };
      },
      selbsterklaerung: { schritt: 2, frage: 'Woran erkennst du, dass dieses Netz nicht vollvermascht ist?' },
      mitdenken: { auftrag: 'Zeichne auf Papier zu jeder der sechs Topologien ein Mini-Netz mit vier Geräten. Schreibe darunter in einem Satz, woran man sie erkennt.', muster: 'Bus: ein Kabel für alle, Abschlusswiderstände an den Enden. Ring: jedes Gerät hat genau zwei Nachbarn. Stern: alle an einem Verteiler. Baum: mehrere Verteiler in Ebenen, ohne Kreis. Vollvermascht: jedes mit jedem. Teilvermascht: mehrere, aber nicht alle Verbindungen.' },
      steckbrief: '<p><b>Erkennungsmerkmale:</b> Bus – ein durchgehendes Kabel mit Abschlusswiderständen. Ring – jedes Gerät hat zwei Nachbarn. Stern – alle an einem Verteiler. Baum – Verteiler in Ebenen, keine Kreise. Vollvermascht – jedes mit jedem. Teilvermascht – mehrere, aber nicht alle Verbindungen.</p>',
      beruf: 'Bevor du ein fremdes Netz änderst, zeichnest du es auf. Wer die Topologie erkennt, sieht sofort, wo die Schwachstellen liegen.',
      check: ['C11', 'C12', 'W4']
    }
  ],

  uebungen: [
    {
      id: 'U1', titel: 'Vom Bus zum Stern', lz: ['LZ3'], figur: 'albers',
      auftrag: 'Das Labor bekommt endlich einen Switch. Baue den Bus mit den fünf Messgeräten zu einem Stern um.',
      interaktion: function (box, api) {
        var netz = TN.netz(box, { topo: 'bus', n: 5, namen: LABOR, werkzeuge: ['verbinden', 'loeschen', 'sw'], hoehe: 280, anzeige: 'aufbau', fest: true,
          beschriftung: 'Labor: fünf Geräte an einem Bus-Kabel', beiEreignis: function (ev) {
            if (ev.typ === 'hinweis') api.meldung(ev.text, 'warn');
            if (ev.typ === 'umbau' && ev.topologie.key === 'star') api.erledigt('Stern fertig: ' + ev.kennzahlen.cables + ' Kabel statt 6 – dafür trifft ein defektes Kabel jetzt nur noch ein Gerät.');
          } });
        return { loesen: function () { netz.entferne('Bus'); var sw = netz.neuesGeraet('sw'); LABOR.forEach(function (p) { netz.verbinde(p, sw); }); } };
      },
      tipps: ['Das gemeinsame Kabel muss weg, und ein zentraler Verteiler muss her.', 'Entferne das Bus-Kabel (seine Anschlüsse verschwinden mit) und füge einen Switch hinzu.', 'Mit „🔗 Verbinden“ jedes Labor-Gerät einzeln mit dem Switch verbinden: 5 Kabel, ein Stern.'],
      reflexion: { frage: 'Was gewinnt das Labor durch den Stern – und was ist jetzt die neue Schwachstelle?', muster: 'Ein defektes Kabel trifft nur noch ein Gerät, und der Switch verhindert Kollisionen. Dafür ist der Switch jetzt der Single Point of Failure.' }
    },
    {
      id: 'U2', titel: 'Jeder mit jedem', lz: ['LZ3'], figur: 'weiss',
      auftrag: 'Vier Maschinensteuerungen der Druckerei Weiß sollen maximal ausfallsicher verbunden werden. Mach aus dem Ring eine Vollvermaschung.',
      interaktion: function (box, api) {
        var netz = TN.netz(box, { topo: 'ring', n: 4, namen: ['Druck A', 'Druck B', 'Falz', 'Schnitt'], werkzeuge: ['verbinden', 'loeschen'], hoehe: 280, anzeige: 'aufbau',
          beschriftung: 'Vier Maschinensteuerungen im Ring', beiEreignis: function (ev) {
            if (ev.typ === 'umbau' && ev.topologie.key === 'full') api.erledigt('Vollvermascht: 4 · 3 / 2 = 6 Kabel, je Maschine 3 Anschlüsse.');
          } });
        return { loesen: function () { netz.verbinde('Druck A', 'Falz'); netz.verbinde('Druck B', 'Schnitt'); } };
      },
      tipps: ['Welche Paare sind im Ring noch nicht direkt verbunden?', 'Es fehlen die beiden Diagonalen.', 'Druck A mit Falz und Druck B mit Schnitt verbinden: 6 Kabel.'],
      reflexion: { frage: 'Wie viele Kabel bräuchte die Druckerei bei 12 Maschinen – und warum macht das niemand?', muster: '12 · 11 / 2 = 66 Kabel, jede Maschine bräuchte 11 Anschlüsse. Das ist zu teuer; deshalb nimmt man einen Stern oder vermascht nur die wichtigsten Geräte.' }
    },
    {
      id: 'U3', titel: 'Ein Stockwerk mehr', lz: ['LZ3', 'LZ4'], figur: 'seidl',
      auftrag: 'Das Autohaus Seidl bekommt Büros im ersten Stock. Verteile die sechs PCs auf zwei Switches, die über den vorhandenen Switch ohne Kreis verbunden sind.',
      interaktion: function (box, api) {
        var netz = TN.netz(box, { topo: 'star', n: 6, werkzeuge: ['verbinden', 'loeschen', 'sw'], hoehe: 280, anzeige: 'aufbau', fest: true,
          beschriftung: 'Stern mit sechs PCs', beiEreignis: function (ev) {
            if (ev.typ !== 'umbau') return;
            if (ev.topologie.key === 'tree') api.erledigt('Baum fertig: Fällt ein Etagen-Switch aus, ist nur sein Stockwerk betroffen.');
            else if (/Kreis/.test(ev.topologie.hint || '')) api.meldung('Zwischen den Switches ist ein Kreis entstanden. Im Baum gibt es keine Kreise.', 'warn');
          } });
        return { loesen: function () {
          var a = netz.neuesGeraet('sw'), b = netz.neuesGeraet('sw');
          netz.verbinde(a, 'Switch'); netz.verbinde(b, 'Switch');
          ['PC1', 'PC2', 'PC3'].forEach(function (p) { netz.verbinde(p, 'Switch'); netz.verbinde(p, a); });
          ['PC4', 'PC5', 'PC6'].forEach(function (p) { netz.verbinde(p, 'Switch'); netz.verbinde(p, b); });
        } };
      },
      tipps: ['Du brauchst zwei weitere Switches. Der vorhandene Switch wird der Core-Switch.', 'Füge zwei Switches hinzu und verbinde beide mit dem vorhandenen Switch – aber nicht miteinander.', 'Löse PC1–PC3 vom alten Switch (erneut verbinden entfernt das Kabel) und hänge sie an SW1, PC4–PC6 an SW2.'],
      reflexion: { frage: 'Warum darf zwischen den Switches im Baum kein Kreis entstehen?', muster: 'Ein Baum hat genau einen Weg zwischen zwei Geräten. Ein Kreis schafft einen zweiten Weg – ohne besondere Technik würden Daten darin endlos kreisen.' }
    },
    {
      id: 'U4', titel: 'Ausfallsicher, aber sparsam', lz: ['LZ2', 'LZ3'], figur: 'weiss',
      auftrag: 'Profi-Aufgabe: Sechs Geräte im Ring. Jedes soll mindestens 3 Verbindungen haben – mit höchstens 9 Kabeln.',
      interaktion: function (box, api) {
        var netz = TN.netz(box, { topo: 'ring', n: 6, werkzeuge: ['verbinden', 'loeschen'], hoehe: 280, anzeige: 'aufbau',
          beschriftung: 'Sechs PCs im Ring', beiEreignis: function (ev) {
            if (ev.typ !== 'umbau') return;
            var G = netz.graph(), grad = {};
            G.links.forEach(function (l) { grad[l.a] = (grad[l.a] || 0) + 1; grad[l.b] = (grad[l.b] || 0) + 1; });
            var min = Math.min.apply(null, G.nodes.map(function (n) { return grad[n.id] || 0; }));
            if (min >= 3 && G.links.length <= 9) api.erledigt('Geschafft: jedes Gerät 3 Verbindungen mit nur 9 Kabeln – teilvermascht.');
            else if (min >= 3) api.meldung('Jedes Gerät hat 3 Verbindungen, aber du brauchst ' + G.links.length + ' Kabel. Es geht mit 9.', 'warn');
          } });
        return { loesen: function () { netz.verbinde('PC1', 'PC4'); netz.verbinde('PC2', 'PC5'); netz.verbinde('PC3', 'PC6'); } };
      },
      tipps: ['Im Ring hat jedes Gerät schon 2 Verbindungen. Es fehlt jeweils eine.', 'Ein neues Kabel versorgt immer zwei Geräte auf einmal: 6 Geräte brauchen also nur 3 neue Kabel.', 'Verbinde gegenüberliegende Geräte: PC1–PC4, PC2–PC5, PC3–PC6.'],
      reflexion: { frage: 'Warum ist Teilvermaschung für große Netze (wie das Internet) besser geeignet als Vollvermaschung?', muster: 'Sie bietet Umwege bei Ausfällen, braucht aber viel weniger Kabel und Anschlüsse. Dafür muss ein Weg gewählt werden (Routing).' }
    },
    {
      id: 'U5', titel: 'Neue Kunden, neue Pläne', lz: ['LZ1'],
      auftrag: 'Drei neue Kunden haben ihre Netzpläne geschickt. Bestimme bei jedem die Topologie.',
      interaktion: function (box, api) {
        var k = kartei(box, api, [
          { kunde: 'Hotel Sonne', topo: 'tree', n: 9 },
          { kunde: 'Fahrschule Roth', topo: 'ring', n: 4 },
          { kunde: 'Logistik Nord', topo: 'partial', n: 8 }
        ], 'Alle drei Pläne richtig bestimmt.');
        return { loesen: function () { k.loesen(); } };
      },
      tipps: ['Gibt es Verteiler (Switches)? Wenn ja: einer oder mehrere?', 'Ohne Verteiler: Zähle die Nachbarn jedes Geräts. Zwei Nachbarn → Ring; mehr, aber nicht alle → teilvermascht.', 'Hotel Sonne: Baum · Fahrschule Roth: Ring · Logistik Nord: teilvermascht.'],
      reflexion: { frage: 'Ein Ring mit 4 Geräten und eine Vollvermaschung mit 4 Geräten – wie unterscheidest du sie auf einen Blick?', muster: 'Im Ring hat jedes Gerät genau 2 Kabel, es gibt keine Diagonalen. Vollvermascht hat jedes Gerät 3 Kabel – auch die Diagonalen sind da.' }
    },
    {
      id: 'U6', titel: 'Die eine Schwachstelle', lz: ['LZ4'], figur: 'weiss',
      auftrag: 'Büro und Halle der Druckerei sind manchmal getrennt. Finde das <b>eine Kabel</b>, dessen Ausfall Büro und Halle voneinander trennt.',
      interaktion: function (box, api) {
        var netz = TN.netz(box, { topo: 'plan', plan: DRUCKEREI, werkzeuge: ['ausfall', 'schwachstellen', 'reparieren'], hoehe: 280, fest: true,
          beschriftung: 'Netz der Druckerei Weiß: Büro links, Halle rechts', beiEreignis: function (ev) {
            if (ev.typ !== 'ausfall' || !ev.aus) return;
            if (/SW Büro–SW Halle|SW Halle–SW Büro/.test(ev.name)) api.erledigt('Das Kabel zwischen den beiden Switches ist der Single Point of Failure: Fällt es aus, sind Büro und Halle getrennt.');
            else if (ev.art === 'switch') api.meldung(ev.name + ' trennt viel – aber gesucht ist ein Kabel.', 'warn');
            else api.meldung('Noch ' + ev.stand.ok + ' von ' + ev.stand.alle + ' Paaren können Daten austauschen. Büro und Halle sind weiter verbunden.', '');
          } });
        return { loesen: function () { netz.ausfall('Kabel SW Büro–SW Halle'); } };
      },
      tipps: ['Welche Kabel liegen auf jedem Weg vom Büro in die Halle?', 'Schalte „🔥 Schwachstellen“ ein: Rot heißt, der Ausfall trennt viele Geräte.', 'Es ist das Kabel zwischen SW Büro und SW Halle.'],
      reflexion: { frage: 'Wie könnte die Druckerei diese Schwachstelle beseitigen?', muster: 'Ein zweites Kabel zwischen den Switches auf einem anderen Weg verlegen (Redundanz). Dafür braucht es eine Technik, die Kreise zwischen Switches beherrscht – die lernst du später kennen.' }
    }
  ],

  selbstueberpruefung: {
    dauer: '20 Minuten',
    gewichtA: 50,
    danach: 'Das Thema sitzt. Den Kompetenznachweis legst du in der Lernplattform ab – sprich deine Lehrkraft an.',
    einleitung: 'Neuer Kunde: das <b>Autohaus Seidl</b>. Ich bin heute auf einer anderen Baustelle – du schaffst das allein.',
    teilA: {
      titel: 'Netz im Autohaus Seidl', figur: 'seidl',
      auftrag: 'Herr Seidl will wissen, wie sein Netz aufgebaut ist und wo es Schwachstellen hat. Danach soll die Werkstatt auf einen Stern umgebaut werden.',
      interaktion: function (box) {
        var E = KIT.el;
        var raster = E('div', { class: 'su-raster' });
        var links = E('div'), rechts = E('div');
        raster.appendChild(links); raster.appendChild(rechts); box.appendChild(raster);
        var netz = TN.netz(links, { topo: 'plan', plan: AUTOHAUS, werkzeuge: ['verbinden', 'loeschen', 'sw'], hoehe: 300, fest: true, anzeige: 'aufbau',
          beschriftung: 'Netz des Autohauses Seidl: Verkauf, Werkstatt und Core-Switch' });
        var namen = ['', 'Bus', 'Ring', 'Stern', 'Baum', 'Vollvermascht', 'Teilvermascht'];
        function auswahl(opts, label) { var s = E('select', { 'aria-label': label }); opts.forEach(function (o) { s.appendChild(E('option', { value: o, text: o || '– bitte wählen –' })); }); return s; }
        function zahlfeld(label) { return E('input', { type: 'text', inputmode: 'numeric', size: 4, 'aria-label': label }); }
        var f = {
          verkauf: auswahl(namen, 'Topologie im Verkaufsraum'), werkstatt: auswahl(namen, 'Topologie in der Werkstatt'),
          paare: zahlfeld('PC-Paare nach dem Bruch des Werkstatt-Bus-Kabels'),
          kern: auswahl(['', 'Core', 'SW Verkauf', 'Werkstatt-Bus', 'Verkauf 1', 'Montage'], 'Verbindendes Gerät'),
          kabel: zahlfeld('Kabel nach dem Umbau'),
          grund: auswahl(['', 'Ein defektes Kabel trifft nur noch einen PC in der Werkstatt, und es gibt keine Kollisionen mehr.', 'Der Stern braucht weniger Kabel als der Bus.', 'Im Stern gibt es keinen Single Point of Failure mehr.', 'Der Stern kommt ohne aktive Geräte aus.'], 'Begründung für den Umbau')
        };
        function feld(text, el) { var l = E('label', { html: text }); l.appendChild(el); return E('li', {}, [l]); }
        var ol = E('ol');
        ol.appendChild(feld('Topologie im <b>Verkaufsraum</b>:<br>', f.verkauf));
        ol.appendChild(feld('Topologie in der <b>Werkstatt</b>:<br>', f.werkstatt));
        ol.appendChild(feld('Das <b>Werkstatt-Bus</b>-Kabel bricht. Wie viele PC-Paare können dann noch Daten austauschen?<br>', f.paare));
        ol.appendChild(feld('Welches Gerät verbindet Verkauf und Werkstatt? Fällt es aus, arbeiten beide Bereiche für sich weiter.<br>', f.kern));
        ol.appendChild(E('li', { html: 'Baue im Plan die <b>Werkstatt zu einem Stern</b> um: eigener Switch, am Core angeschlossen.' }));
        ol.appendChild(feld('Wie viele Kabel hat das Netz nach deinem Umbau?<br>', f.kabel));
        ol.appendChild(feld('Warum lohnt sich der Umbau?<br>', f.grund));
        rechts.appendChild(ol);
        function zahl(x) { return parseInt(String(x.value).trim(), 10); }
        function umgebaut() {
          var G = netz.graph();
          var pcs = G.nodes.filter(function (n) { return n.type === 'pc'; }).length;
          return netz.erkannt().key === 'tree' && pcs === 6 && !G.nodes.some(function (n) { return n.type === 'bus'; });
        }
        return {
          auswerten: function () {
            return [
              { lz: 'LZ1', text: 'Verkaufsraum als Stern erkannt', ok: f.verkauf.value === 'Stern' },
              { lz: 'LZ1', text: 'Werkstatt als Bus erkannt', ok: f.werkstatt.value === 'Bus' },
              { lz: 'LZ4', text: 'Folge des Bus-Kabelbruchs: 3 PC-Paare (nur der Verkauf)', ok: zahl(f.paare) === 3 },
              { lz: 'LZ4', text: 'Core-Switch als Verbindung der Bereiche erkannt', ok: f.kern.value === 'Core' },
              { lz: 'LZ3', text: 'Werkstatt zum Stern umgebaut (das ganze Netz ist jetzt ein Baum)', ok: umgebaut() },
              { lz: 'LZ3', text: 'Kabelzahl nach dem Umbau: 8', ok: zahl(f.kabel) === 8 },
              { lz: 'LZ2', text: 'Vorteil des Sterns richtig begründet', ok: f.grund.selectedIndex === 1 }
            ];
          },
          loesen: function () {
            f.verkauf.value = 'Stern'; f.werkstatt.value = 'Bus'; f.paare.value = '3'; f.kern.value = 'Core';
            netz.entferne('Werkstatt-Bus');
            var sw = netz.neuesGeraet('sw');
            netz.verbinde(sw, 'Core');
            ['Annahme', 'Montage', 'Lager'].forEach(function (p) { netz.verbinde(p, sw); });
            f.kabel.value = '8'; f.grund.selectedIndex = 1;
          }
        };
      }
    },
    teilB: { proLZ: 2 }
  },

  merkblatt: [
    { lz: 'LZ1', titel: 'Topologien erkennen', zeilen: [
      { text: 'Ring: Jedes Gerät hat genau ___ Nachbarn.', loesung: 'zwei' },
      { text: 'Stern: Alle Geräte hängen mit eigenem Kabel an einem ___.', loesung: 'zentralen Verteiler (Switch)' },
      { text: 'Baum: mehrere Switches in Ebenen, aber ohne ___.', loesung: 'Kreise' }
    ], fehler: 'Teilvermascht und Baum verwechseln. Ein Baum hat Switches in Ebenen und keine Kreise; teilvermascht hat Querverbindungen und Kreise.', schema: 'Verteiler da? → einer: Stern · mehrere in Ebenen: Baum. Kein Verteiler? → ein Kabel für alle: Bus · zwei Nachbarn: Ring · jedes mit jedem: vollvermascht · sonst: teilvermascht.' },
    { lz: 'LZ2', titel: 'Vor- und Nachteile', zeilen: [
      { text: 'Im Bus senden zwei Geräte gleichzeitig: Es kommt zu einer ___.', loesung: 'Kollision' },
      { text: 'Im Ring darf nur senden, wer das ___ hat.', loesung: 'Token' },
      { text: 'Vermaschung bietet viele ___, kostet aber viele Kabel.', loesung: 'Umwege (alternative Wege)' }
    ], fehler: '„Vermaschung ist immer am besten.“ Sie ist am ausfallsichersten, aber der Kabelaufwand wächst sehr schnell.', beispiel: 'Labor der Praxis: Bus → Stern. Gewinn: keine Kollisionen, ein Kabelbruch trifft nur ein Gerät. Neue Schwachstelle: der Switch.' },
    { lz: 'LZ3', titel: 'Aufwand und Umbau', zeilen: [
      { text: 'Vollvermascht mit n Geräten: ___ Kabel.', loesung: 'n · (n − 1) / 2' },
      { text: 'Jedes Gerät braucht dann ___ Anschlüsse.', loesung: 'n − 1' },
      { text: 'Ein Baum hat immer ___ Kabel.', loesung: 'Anzahl aller Geräte (mit Switches) − 1' }
    ], fehler: 'n · (n − 1) rechnen und das Teilen durch 2 vergessen – dann ist jedes Kabel doppelt gezählt.', beispiel: '6 Geräte vollvermascht: 6 · 5 / 2 = 15 Kabel, je Gerät 5 Anschlüsse.' },
    { lz: 'LZ4', titel: 'Schwachstellen finden', zeilen: [
      { text: 'Ein Teil, dessen Ausfall alles lahmlegt, heißt ___.', loesung: 'Single Point of Failure (SPOF)' },
      { text: 'Im Stern ist das der ___, im Bus das ___.', loesung: 'Switch · Bus-Kabel' },
      { text: 'Im Baum trennt ein Etagen-Switch nur ___.', loesung: 'seinen Teilbaum (sein Stockwerk)' }
    ], fehler: '„Im Bus legt ein ausgefallener PC alles lahm.“ Nein: Er hört nur mit. Erst ein Kabelbruch trifft alle.', schema: 'Ausfall durchspielen: Welche Wege führen über dieses Teil? Gibt es Umwege? Wer ist danach allein?' }
  ],
  selbsttest: ['P10', 'P17', 'P20', 'P23', 'P27'],

  fragen: [
    /* Fragen, deren Bild per Code entsteht (Netzplan ohne Beschriftung, Hotspots). Alle übrigen in fragen.md. */
    bildFrage('P1', 'LZ1', ['selbstueberpruefung'], 'bus', 5, ['ring', 'star', 'tree']),
    bildFrage('P2', 'LZ1', ['selbstueberpruefung'], 'ring', 6, ['bus', 'partial', 'full']),
    bildFrage('P3', 'LZ1', ['selbstueberpruefung'], 'star', 6, ['tree', 'full', 'ring']),
    bildFrage('P4', 'LZ1', ['selbstueberpruefung'], 'tree', 8, ['star', 'partial', 'bus']),
    bildFrage('P5', 'LZ1', ['selbstueberpruefung'], 'full', 5, ['partial', 'ring', 'star']),
    bildFrage('P6', 'LZ1', ['selbstueberpruefung'], 'partial', 6, ['full', 'ring', 'tree']),
    hotspotFrage('P24', 'LZ4', ['selbstueberpruefung'], TN.makeGraph('star', 5),
      'Tippe auf das Element, dessen Ausfall das <b>gesamte</b> Netz lahmlegt (Single Point of Failure).',
      function (k) { return k.type === 'switch'; },
      function (k) { return 'Fällt ' + k.label + ' aus, ist nur dieser PC betroffen. Alle anderen hängen an ihrem eigenen Kabel.'; },
      'Im Stern hängt jede Verbindung am zentralen Switch – fällt er aus, kann kein PC mehr mit einem anderen sprechen.'),
    hotspotFrage('P25', 'LZ4', ['selbstueberpruefung'], TN.makeGraph('bus', 5),
      'Ein einziger Defekt soll <b>alle</b> Stationen voneinander trennen. Tippe auf das Element, bei dem das passiert.',
      function (k) { return k.type === 'bus'; },
      function (k) { return 'Fällt ' + k.label + ' aus, arbeiten die anderen am Bus weiter – ein Gerät am Bus hört nur mit.'; },
      'Ein Bruch des Bus-Kabels (oder ein fehlender Abschlusswiderstand) stört das gesamte Netz.'),
    hotspotFrage('P26', 'LZ4', ['selbstueberpruefung'], TN.makeGraph('tree', 6),
      'Tippe auf das Gerät, dessen Ausfall die beiden Gruppen voneinander trennt, während die PCs <b>innerhalb</b> einer Gruppe weiterarbeiten.',
      function (k) { return k.label === 'Core'; },
      function (k) { return k.type === 'switch' ? 'Fällt ' + k.label + ' aus, sind seine PCs auch untereinander getrennt – jeder hängt nur an diesem Switch.' : 'Fällt ' + k.label + ' aus, ist nur dieser PC betroffen.'; },
      'Der Core-Switch verbindet die Teilbäume. Fällt er aus, arbeiten die Gruppen intern weiter, sind aber voneinander getrennt.')
  ],

  tafel: {
    titel: 'Netzwerktopologien – Erklären und Beispiel',
    szenen: [
      { id: 'stern', titel: 'Ausfall im Stern', station: 'S1',
        erklaerung: '<p>Fällt ein PC oder sein Kabel aus, ist nur dieser PC betroffen.</p><p>Fällt der Switch aus, kann kein PC mehr mit einem anderen sprechen: Der Switch ist der Single Point of Failure.</p>',
        zeichne: function (buehne, api) {
          var netz = TN.netz(buehne, { topo: 'star', n: 6, namen: PRAXIS, werkzeuge: ['ausfall', 'paket'], hoehe: 520, beschriftung: 'Stern mit sechs PCs' });
          var zahl = netz.el.querySelector('.tn-status');
          netz.el.style.margin = 'auto 0'; zahl.style.visibility = 'hidden';
          api.werkzeug({ icon: '🔢', text: 'Erreichbarkeit', taste: 'a', typ: 'schalter', aktion: function (an) { zahl.style.visibility = an ? 'visible' : 'hidden'; } });
          api.werkzeug({ icon: '🔧', text: 'Reparieren', taste: 'r', aktion: function () { netz.repariere(); } });
          return {};
        } },
      { id: 'vermascht', titel: 'Kabel bei Vermaschung', station: 'S4',
        erklaerung: '<p>Vollvermascht ist jedes Gerät mit jedem verbunden. Jedes der n Geräte hat n − 1 Partner; jedes Kabel verbindet zwei Geräte.</p><p>Darum: n · (n − 1) / 2 Kabel. Bei 4 Geräten 6, bei 8 schon 28.</p>',
        zeichne: function (buehne, api) {
          var n = 4;
          var netz = TN.netz(buehne, { topo: 'full', n: n, werkzeuge: [], hoehe: 520, anzeige: 'aufbau', beschriftung: 'Vollvermaschtes Netz' });
          var zahl = netz.el.querySelector('.tn-status');
          netz.el.style.margin = 'auto 0'; zahl.style.visibility = 'hidden';
          api.werkzeug({ icon: '−', text: 'Gerät', taste: '-', aktion: function () { if (n > 3) { n--; netz.neu('full', n); } } });
          api.werkzeug({ icon: '+', text: 'Gerät', taste: '+', aktion: function () { if (n < 9) { n++; netz.neu('full', n); } } });
          api.werkzeug({ icon: '🔢', text: 'Kabel zählen', taste: 'k', typ: 'schalter', aktion: function (an) { zahl.style.visibility = an ? 'visible' : 'hidden'; } });
          return {};
        } },
      { id: 'baum', titel: 'Teilbaum im Baum', station: 'S5',
        erklaerung: '<p>Fällt ein Etagen-Switch aus, ist nur sein Stockwerk abgeschnitten.</p><p>Fällt der Core-Switch aus, arbeiten die Stockwerke für sich weiter, sind aber voneinander getrennt.</p>',
        zeichne: function (buehne, api) {
          var netz = TN.netz(buehne, { topo: 'plan', plan: PRAXIS_BAUM, werkzeuge: ['ausfall', 'paket'], hoehe: 520, beschriftung: 'Praxis mit zwei Stockwerken' });
          var zahl = netz.el.querySelector('.tn-status');
          netz.el.style.margin = 'auto 0'; zahl.style.visibility = 'hidden';
          api.werkzeug({ icon: '🔢', text: 'Erreichbarkeit', taste: 'a', typ: 'schalter', aktion: function (an) { zahl.style.visibility = an ? 'visible' : 'hidden'; } });
          api.werkzeug({ icon: '🔧', text: 'Reparieren', taste: 'r', aktion: function () { netz.repariere(); } });
          return {};
        } }
    ]
  }
};
