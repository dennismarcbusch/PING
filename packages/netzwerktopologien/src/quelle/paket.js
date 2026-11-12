/* =====================================================================
   Netzwerktopologien erleben – Version 2 auf der Kompass-Vorlage 4.0
   Gegenstand: der Netzplan aus Version 1 (quelle/topologie.js, TN.netz).
   Prototyp: Station 1 (Stern) vollständig, alle Lernziele, zwei Kurz-Check-Fragen.
   Fragen stehen in quelle/fragen.md; js/inhalt.js wird mit paket.py bauen erzeugt.
   ===================================================================== */

var PRAXIS = ['Empfang', 'Labor', 'Arzt 1', 'Arzt 2', 'Büro', 'Wartezimmer'];

window.PAKET = {
  id: 'ping-netzwerktopologien',
  titel: 'Netzwerktopologien erleben',
  untertitel: 'Wer kann noch mit wem sprechen?',
  version: '0.1',
  bereit: 80,
  dauer: 'etwa 90–120 Minuten',
  welt: { thema: 'technik', kulisse: 'buero', symbol: '🕸️' },
  figur: { name: 'Mira Hofmann', rolle: 'Ausbilderin bei Korbwerk IT-Service',
    aussehen: { haut: 1, haare: 'rot', frisur: 'zopf', kleidung: '#4338ca', brille: true } },
  figuren: {
    albers: { name: 'Petra Albers', rolle: 'Praxismanagerin, Praxis Lindenhof',
      aussehen: { haut: 3, haare: 'dunkelbraun', frisur: 'dutt', kleidung: '#0f766e' } }
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
    { begriff: 'Sterntopologie', erklaerung: 'Jedes Gerät hat ein eigenes Kabel zu einem zentralen Verteiler (Switch).' }
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
          beschriftung: 'Netzplan der Praxis Lindenhof: sechs PCs an einem Switch',
          beiEreignis: reagiere
        });
        function reagiere(ev) {
          if (api.demo()) return;
          var s = ev.stand;
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
          } else if (ev.typ === 'werkzeug') {
            api.erklaere('<p>' + ev.hilfe + '</p>');
          } else if (ev.typ === 'repariert') {
            api.erklaere('<p>Alles repariert: Jeder PC erreicht wieder jeden anderen.</p>');
          }
          if (!fertig && gesehen.klein && gesehen.switch) {
            fertig = true;
            api.sage('Genau so war es heute Morgen – der Switch im Flurschrank hatte keinen Strom!', 'froh');
            api.erledigt('Der Switch ist der <b>Single Point of Failure</b> des Sterns: Fällt er aus, ist jeder PC allein. Ein PC oder ein Kabel betrifft nur ein Gerät.');
          }
        }
        api.erklaere('<p>Wähle <b>⚡ Ausfall</b> und tippe ein Gerät oder Kabel an. Unten siehst du, wie viele PC-Paare noch Daten austauschen können.</p>');
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
    }
  ],

  uebungen: [],

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
        } }
    ]
  }
};
