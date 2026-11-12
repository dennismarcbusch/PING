/* =====================================================================
   Strukturierte Verkabelung – Version 2 auf der Kompass-Vorlage 4.0
   Gegenstand: der Planer aus Version 1 (quelle/verkabelung.js, VK.plan).
   Simulationsmodus: Im Entdecken plant man Schritt für Schritt den ganzen
   Campus des Schulzentrums Lindenau; der Plan bleibt über alle Kapitel erhalten.
   Übungen im Hotel Sonne und in der Druckerei Weiß, Selbstüberprüfung beim
   Autohaus Seidl. Fragen in quelle/fragen.md; js/inhalt.js wird mit
   paket.py bauen erzeugt.
   ===================================================================== */

/* ---- Hilfen zum Prüfen am Plan ---- */
function vkHat(sim, typ, b, f, arten) {
  return sim.stand().knoten.some(function (k) { return k.typ === typ && k.b === b && (!f || k.f === f) && (!arten || arten.indexOf(k.raumArt) >= 0); });
}
function vkKabel(sim, a, b, ber, medien) {
  return sim.stand().kabel.some(function (k) {
    var ab = (k.a.indexOf(a) === 0 && k.b.indexOf(b) === 0) || (k.a.indexOf(b) === 0 && k.b.indexOf(a) === 0);
    return ab && (!ber || k.bereich === ber) && (!medien || medien.indexOf(k.medium) >= 0);
  });
}
function vkAlleAn(sim, b, f) { var p = sim.stand().pcs(b, f); return p.gesamt > 0 && p.angeschlossen === p.gesamt; }
function vkTerOk(sim, b, f) {
  return sim.stand().kabel.filter(function (k) { return k.bereich === 'ter' && k.bOrt === b + '-' + f; }).every(function (k) { return k.laenge <= 90; });
}
var VK_EV_RAEUME = ['tech', 'storage', 'server'], VK_ZENTRAL = ['tech', 'server'];

/* Fertiger Plan des Schulzentrums (Tafelbild) */
var CAMPUS_FERTIG = { knoten: [['sv', 'A', 'EG', 'Serverraum'], ['gv', 'A', 'EG', 'Serverraum'], ['ev', 'A', 'EG', 'Serverraum'], ['ev', 'A', 'OG', 'Technik A1'],
  ['gv', 'B', 'EG', 'Technik B'], ['ev', 'B', 'EG', 'Lager'], ['ev', 'B', 'OG', 'Lager']],
  kabel: [['SV', 'GV A', 'os2'], ['SV', 'GV B', 'os2'], ['GV A', 'EV A-EG', 'om4'], ['GV A', 'EV A-OG', 'om4'], ['GV B', 'EV B-EG', 'om4'], ['GV B', 'EV B-OG', 'om4'],
    ['etage', 'EV A-EG'], ['etage', 'EV A-OG'], ['etage', 'EV B-EG'], ['etage', 'EV B-OG']] };

/* Hotel Sonne: korrekter Grundplan, die Übungen bauen Fehler hinein */
var HOTEL_KNOTEN = [['sv', 'H', 'EG', 'Serverraum'], ['gv', 'H', 'EG', 'Serverraum'], ['ev', 'H', 'EG', 'Serverraum'], ['ev', 'H', 'OG', 'Technik H1'], ['gv', 'S', 'EG', 'Technik S'], ['ev', 'S', 'EG', 'Lager']];

/* Ebenenbild für das Tafelbild: der Plan als Stern in Ebenen */
function ebenenBild(box, api) {
  var E = KIT.el, zeigen = false;
  var wrap = E('div', { style: { margin: 'auto 0', width: '100%' } });
  box.appendChild(wrap);
  function zeichne() {
    var evs = [['EV A-OG', 11], ['EV A-EG', 11], ['EV B-OG', 11], ['EV B-EG', 11]];
    var s = '<svg viewBox="0 0 1000 520" role="img" aria-label="Verkabelung des Schulzentrums als Stern in Ebenen" style="width:100%;max-height:70vh">';
    var sv = [500, 60], gv = [[280, 200], [720, 200]], ev = [[170, 340], [390, 340], [610, 340], [830, 340]];
    function linie(a, b, farbe, dick) { s += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="' + farbe + '" stroke-width="' + dick + '"/>'; }
    gv.forEach(function (g) { linie(sv, g, '#d39e00', 8); });
    ev.forEach(function (e, i) { linie(gv[i < 2 ? 0 : 1], e, '#0e9fb3', 7); for (var k = 0; k < 5; k++) linie(e, [e[0] - 80 + k * 40, 470], '#2563eb', 3); });
    function schrank(p, farbe, text) { s += '<rect x="' + (p[0] - 22) + '" y="' + (p[1] - 28) + '" width="44" height="56" rx="5" fill="' + farbe + '"/><text x="' + (p[0] + 30) + '" y="' + (p[1] + 8) + '" text-anchor="start" font-size="22" font-weight="800" fill="#172033" paint-order="stroke" stroke="#fff" stroke-width="5">' + text + '</text>'; }
    schrank(sv, '#9f1239', 'SV'); schrank(gv[0], '#6d28d9', 'GV A'); schrank(gv[1], '#6d28d9', 'GV B');
    ev.forEach(function (e, i) { schrank(e, '#047857', evs[i][0]); for (var k = 0; k < 5; k++) s += '<rect x="' + (e[0] - 92 + k * 40) + '" y="470" width="24" height="18" rx="3" fill="#1f2937"/>'; });
    if (zeigen) {
      [['Primärbereich · LWL Singlemode · bis 1500 m', 130, '#8a6a00'], ['Sekundärbereich · LWL Multimode · bis 500 m', 270, '#0b7d8c'], ['Tertiärbereich · Cat.7 · bis 90 m', 420, '#1d4ed8']].forEach(function (t) {
        s += '<text x="990" y="' + t[1] + '" text-anchor="end" font-size="22" font-weight="800" fill="' + t[2] + '" paint-order="stroke" stroke="#fff" stroke-width="6">' + t[0] + '</text>';
      });
    }
    wrap.innerHTML = s + '</svg>';
  }
  zeichne();
  api.werkzeug({ icon: '🏷', text: 'Bereiche benennen', taste: 'n', typ: 'schalter', aktion: function (an) { zeigen = an; zeichne(); } });
  return {};
}

window.PAKET = {
  id: 'ping-strukturierte-verkabelung',
  titel: 'Strukturierte Verkabelung',
  untertitel: 'Ein Netz für zwei Gebäude planen',
  version: '2.0',
  bereit: 80,
  dauer: 'etwa 120 Minuten',
  welt: { thema: 'technik', kulisse: 'klasse', symbol: '🔌' },
  figur: { name: 'Mira Hofmann', rolle: 'Ausbilderin bei Korbwerk IT-Service',
    aussehen: { haut: 1, haare: 'rot', frisur: 'zopf', kleidung: '#4338ca', brille: true } },
  figuren: {
    demir: { name: 'Ali Demir', rolle: 'Hausmeister, Schulzentrum Lindenau',
      aussehen: { haut: 3, haare: 'schwarz', frisur: 'kurz', kleidung: '#1d4ed8', bart: true } },
    weiss: { name: 'Hanna Weiß', rolle: 'Leiterin, Druckerei Weiß',
      aussehen: { haut: 0, haare: 'grau', frisur: 'kurz', kleidung: '#7c3aed', brille: true } },
    sonne: { name: 'Lea Brandt', rolle: 'Hoteldirektorin, Hotel Sonne',
      aussehen: { haut: 2, haare: 'blond', frisur: 'lang', kleidung: '#b45309' } },
    seidl: { name: 'Jonas Seidl', rolle: 'Inhaber, Autohaus Seidl',
      aussehen: { haut: 2, haare: 'blond', frisur: 'kurz', kleidung: '#1f2937', krawatte: '#b91c1c', bart: true } }
  },
  leitsituation: 'Das <b>Schulzentrum Lindenau</b> bekommt ein neues Netz. Korbwerk plant die Verkabelung für zwei Gebäude und 44 Arbeitsplätze – und du planst mit.',

  lernziele: [
    { id: 'LZ1', kurz: 'Bereiche zuordnen', text: 'Ich kann Primär-, Sekundär- und Tertiärbereich den Verbindungen zwischen Standort-, Gebäude- und Etagenverteiler und Arbeitsplatz zuordnen.' },
    { id: 'LZ2', kurz: 'Medium wählen', text: 'Ich kann für jeden Bereich das passende Übertragungsmedium wählen und begründen.' },
    { id: 'LZ3', kurz: 'Längen einhalten', text: 'Ich kann die Längengrenzen 90 m, 500 m und 1500 m einhalten und Verteiler so aufstellen, dass sie stimmen.' },
    { id: 'LZ4', kurz: 'Hierarchischer Stern', text: 'Ich kann eine Verkabelung als hierarchischen Stern aufbauen: Jedes Gerät hängt an genau einem Verteiler der nächsthöheren Ebene.' },
    { id: 'LZ5', kurz: 'Standorte wählen', text: 'Ich kann geeignete Räume für Standort-, Gebäude- und Etagenverteiler wählen.' }
  ],

  glossar: [
    { begriff: 'Strukturierte Verkabelung', erklaerung: 'Einheitlicher, genormter Aufbau der Netzwerkkabel eines Standorts (DIN EN 50173-1). Sie wird einmal verlegt und hält viele Jahre.', vorab: 'K1' },
    { begriff: 'Etagenverteiler (EV)', erklaerung: 'Schrank, an dem alle Arbeitsplätze einer Etage zusammenlaufen.', vorab: 'K1' },
    { begriff: 'Tertiärbereich', erklaerung: 'Verkabelung vom Etagenverteiler bis zur Anschlussdose am Arbeitsplatz. Kupfer, höchstens 90 m.', vorab: 'K1' },
    { begriff: 'Anschlussdose', erklaerung: 'Netzwerkdose in der Wand (RJ45). Vom PC führt ein Patchkabel dorthin.' },
    { begriff: 'Gebäudeverteiler (GV)', erklaerung: 'Schrank, der alle Etagenverteiler eines Gebäudes verbindet. Genau einer je Gebäude.', vorab: 'K2' },
    { begriff: 'Sekundärbereich', erklaerung: 'Verkabelung vom Gebäudeverteiler zu den Etagenverteilern im selben Gebäude, meist durch den Steigschacht. LWL Multimode, höchstens 500 m.', vorab: 'K2' },
    { begriff: 'Steigschacht', erklaerung: 'Senkrechter Kanal im Gebäude, durch den Kabel von Etage zu Etage laufen.', vorab: 'K2' },
    { begriff: 'LWL (Lichtwellenleiter)', erklaerung: 'Glasfaserkabel. Überträgt Licht statt Strom: große Reichweite, unempfindlich gegen Störungen, keine elektrische Verbindung.', vorab: 'K2' },
    { begriff: 'Multimode (OM4)', erklaerung: 'LWL mit dickerem Kern für Strecken bis einige hundert Meter, typisch im Gebäude.' },
    { begriff: 'Singlemode (OS2)', erklaerung: 'LWL mit sehr dünnem Kern für sehr lange Strecken, typisch zwischen Gebäuden.' },
    { begriff: 'Cat.7', erklaerung: 'Geschirmtes Kupferkabel (Twisted Pair) für Arbeitsplätze, bis 10 Gbit/s.' },
    { begriff: 'Permanent Link', erklaerung: 'Fest verlegte Strecke vom Verteiler bis zur Dose: höchstens 90 m. Mit Patch- und Geräteschnüren (höchstens 10 m) entsteht der Channel von 100 m.', vorab: 'K3' },
    { begriff: 'Standortverteiler (SV)', erklaerung: 'Zentraler Schrank eines Standorts. Er verbindet alle Gebäudeverteiler. Genau einer je Standort.', vorab: 'K4' },
    { begriff: 'Primärbereich', erklaerung: 'Verkabelung vom Standortverteiler zu den Gebäudeverteilern, auch zwischen Gebäuden. LWL Singlemode, höchstens 1500 m.', vorab: 'K4' },
    { begriff: 'Hauseinführung (HE)', erklaerung: 'Stelle, an der Kabel aus der Erde ins Gebäude geführt werden.' },
    { begriff: 'Hierarchischer Stern', erklaerung: 'Aufbau in Ebenen: SV → GV → EV → Arbeitsplatz. Jedes Gerät hängt an genau einem Verteiler der Ebene darüber.' }
  ],

  simulation: {
    titel: 'Lageplan Schulzentrum Lindenau',
    start: function (box, api) {
      return VK.plan(box, { gelaende: VK.CAMPUS, ansicht: 'A-OG', hoehe: 370, beschriftung: 'Lageplan des Schulzentrums Lindenau',
        beiEreignis: function () { api.geaendert(); } });
    }
  },

  stationen: [
    { id: 'K1', titel: 'Ein Arbeitsplatz, ein Kabel', lz: ['LZ1', 'LZ2'], figur: 'demir', vorab: 'V1', check: ['C1', 'C2'],
      schritte: [
        { zeigen: true, auftrag: 'Wir fangen im 1. Obergeschoss von Haus A an. Der <b>Etagenverteiler</b> kommt in den Raum „Technik A1“.',
          erklaerung: 'Am Etagenverteiler (EV) laufen alle Arbeitsplätze einer Etage zusammen.',
          frage: 'Warum steht der EV im Technikraum und nicht im EDV-Raum?', warum: 'Der Schrank ist laut, wird warm und darf nicht für jeden zugänglich sein – deshalb ein abschließbarer Technik- oder Nebenraum.',
          pruefe: function (sim) { return vkHat(sim, 'ev', 'A', 'OG', VK_EV_RAEUME); },
          loesen: function (sim) { sim.ansicht('A-OG'); sim.setze('ev', 'A', 'OG', 'Technik A1'); } },
        { auftrag: 'Verlege ein <b>Cat.7</b>-Kabel vom EV zu einem PC im EDV-Raum 201.',
          erklaerung: 'Vom EV bis zur Dose am Arbeitsplatz reicht der <b>Tertiärbereich</b>. Hier liegt Kupfer mit RJ45-Dose.',
          tipp: 'Oben „Cat.7“ wählen, dann den EV antippen und danach einen PC im EDV-Raum 201.', loesungText: 'Cat.7 wählen, EV A-OG antippen, dann PC 1 im EDV-Raum 201.',
          pruefe: function (sim) { return vkKabel(sim, 'EV A-OG', 'PC', 'ter', ['cat7']) && sim.stand().kabel.some(function (k) { return k.bereich === 'ter' && /EDV-Raum 201/.test(k.b) && k.medium === 'cat7'; }); },
          loesen: function (sim) { sim.kabel('EV A-OG', 'PC 1 · EDV-Raum 201', 'cat7'); } },
        { auftrag: 'Schließ die übrigen Arbeitsplätze der Etage an: „⚡ Etage anschließen“ wählen und den EV antippen.',
          erklaerung: 'Jeder Arbeitsplatz bekommt ein eigenes Kabel zum EV – ein Stern.',
          tipp: 'Unter „Kabel“ steht „⚡ Etage anschließen“.',
          pruefe: function (sim) { return vkAlleAn(sim, 'A', 'OG'); },
          loesen: function (sim) { sim.etage('EV A-OG'); } }
      ] },
    { id: 'K2', titel: 'Hoch und runter: der Steigbereich', lz: ['LZ1', 'LZ2', 'LZ4'], figur: 'demir', vorab: 'V2', check: ['C3', 'C4'],
      schritte: [
        { zeigen: true, auftrag: 'Im Erdgeschoss liegt der Serverraum. Dort kommt der <b>Gebäudeverteiler</b> von Haus A hin.',
          erklaerung: 'Der Gebäudeverteiler (GV) verbindet alle Etagen eines Gebäudes. Jedes Gebäude hat genau einen.',
          frage: 'Warum hat jedes Gebäude genau einen GV?', warum: 'Alle Etagen laufen an einem Punkt zusammen. So bleibt der Stern übersichtlich, und das Gebäude hängt mit einem einzigen Kabel am Standort.',
          pruefe: function (sim) { return vkHat(sim, 'gv', 'A', 'EG'); },
          loesen: function (sim) { sim.ansicht('A-EG'); sim.setze('gv', 'A', 'EG', 'Serverraum'); } },
        { auftrag: 'Auch das Erdgeschoss braucht einen <b>EV</b>. Stell ihn in den Serverraum und schließ die Etage an.',
          erklaerung: 'GV und EV dürfen im selben Raum stehen. Es bleiben zwei getrennte Ebenen.',
          tipp: 'Erst „EV“ wählen und den Serverraum antippen, dann „⚡ Etage anschließen“ und den neuen EV antippen.',
          pruefe: function (sim) { return vkHat(sim, 'ev', 'A', 'EG', VK_EV_RAEUME) && vkAlleAn(sim, 'A', 'EG'); },
          loesen: function (sim) { sim.ansicht('A-EG'); sim.setze('ev', 'A', 'EG', 'Serverraum'); sim.etage('EV A-EG'); } },
        { auftrag: 'Verbinde den GV mit dem EV im 1. OG. Nimm <b>LWL OM4</b> – das Kabel läuft durch den Steigschacht.',
          erklaerung: 'GV → EV heißt <b>Sekundärbereich</b> oder Steigbereich. Hier liegt Glasfaser Multimode.',
          tipp: '„LWL OM4“ wählen, den GV antippen, oben auf „Haus A OG“ wechseln und den EV antippen.', loesungText: 'LWL OM4: GV A → EV A-OG.',
          pruefe: function (sim) { return vkKabel(sim, 'GV A', 'EV A-OG', 'sek', ['om4']); },
          loesen: function (sim) { sim.kabel('GV A', 'EV A-OG', 'om4'); } },
        { auftrag: 'Verbinde den GV auch mit dem EV im Erdgeschoss (LWL OM4).',
          tipp: 'Beide stehen im Serverraum. „LWL OM4“, GV antippen, EV antippen.',
          pruefe: function (sim) { return vkKabel(sim, 'GV A', 'EV A-EG', 'sek', ['om4']); },
          loesen: function (sim) { sim.kabel('GV A', 'EV A-EG', 'om4'); } }
      ] },
    { id: 'K3', titel: 'Haus B: Wo steht der Schrank?', lz: ['LZ3', 'LZ5'], vorab: 'V3', check: ['C5', 'C6', 'W1'],
      schritte: [
        { zeigen: true, auftrag: 'Haus B, Erdgeschoss: Ich stelle den EV in „Technik B“ am Ende des Gebäudes und schließe alle an.',
          erklaerung: 'Rot gestrichelt: Diese Kabel sind länger als 90 m – mehr erlaubt der Tertiärbereich nicht.',
          frage: 'Warum sind gerade die Kabel zum CNC-Labor und zum Prüffeld zu lang?', warum: 'Sie führen vom Schrank am einen Ende durch den ganzen Flur bis ans andere Ende des Gebäudes – über 100 m.',
          pruefe: function (sim) { return vkHat(sim, 'ev', 'B', 'EG') && vkAlleAn(sim, 'B', 'EG'); },
          loesen: function (sim) { sim.ansicht('B-EG'); sim.setze('ev', 'B', 'EG', 'Technik B'); sim.etage('EV B-EG'); } },
        { auftrag: 'Verschieb den EV in einen <b>geeigneten Raum</b>, sodass kein Kabel länger als 90 m ist.',
          erklaerung: 'Steht der EV in der Mitte, sind die Wege zu beiden Enden kurz.',
          tipp: '„✋ Verschieben“ wählen, den EV antippen, dann einen Nebenraum in der Mitte des Gebäudes.', loesungText: 'Den EV ins „Lager“ in der Mitte verschieben.',
          pruefe: function (sim) { return vkHat(sim, 'ev', 'B', 'EG', VK_EV_RAEUME) && vkAlleAn(sim, 'B', 'EG') && vkTerOk(sim, 'B', 'EG'); },
          loesen: function (sim) { sim.ansicht('B-EG'); sim.verschiebe('EV B-EG', 'B', 'EG', 'Lager'); } },
        { auftrag: 'Jetzt das 1. Obergeschoss von Haus B: Stell den EV gleich an eine passende Stelle und schließ alle an.',
          tipp: 'Auch oben gibt es in der Mitte ein Lager.',
          pruefe: function (sim) { return vkHat(sim, 'ev', 'B', 'OG', VK_EV_RAEUME) && vkAlleAn(sim, 'B', 'OG') && vkTerOk(sim, 'B', 'OG'); },
          loesen: function (sim) { sim.ansicht('B-OG'); sim.setze('ev', 'B', 'OG', 'Lager'); sim.etage('EV B-OG'); } }
      ],
      mitdenken: { auftrag: 'Erkläre deinem Sitznachbarn in zwei Sätzen, warum ein Etagenverteiler weder im Flur noch im Klassenzimmer stehen darf.', muster: 'Der Flur ist Fluchtweg und muss frei bleiben. Im Klassenzimmer stört der Schrank (Lärm, Wärme) und jeder käme heran – deshalb ein abschließbarer Technik- oder Nebenraum.' } },
    { id: 'K4', titel: 'Zwischen den Gebäuden: der Primärbereich', lz: ['LZ1', 'LZ2', 'LZ4', 'LZ5'], vorab: 'V4', check: ['C7', 'C8', 'W2'],
      schritte: [
        { zeigen: true, auftrag: 'Jetzt der <b>Standortverteiler</b>: Er kommt in den Serverraum von Haus A.',
          erklaerung: 'Der Standortverteiler (SV) verbindet alle Gebäude eines Standorts. Es gibt genau einen.',
          frage: 'Warum gerade der Serverraum?', warum: 'Dort kommt der Internetanschluss an; der Raum ist abgeschlossen, gekühlt und abgesichert.',
          pruefe: function (sim) { return vkHat(sim, 'sv', 'A', null, VK_ZENTRAL) || vkHat(sim, 'sv', 'B', null, VK_ZENTRAL); },
          loesen: function (sim) { sim.ansicht('A-EG'); sim.setze('sv', 'A', 'EG', 'Serverraum'); } },
        { auftrag: 'Haus B braucht noch seinen <b>Gebäudeverteiler</b>. Stell ihn in einen geeigneten Raum im Erdgeschoss.',
          tipp: 'Gebäudeverteiler gehören in einen Technik- oder Serverraum.', loesungText: 'GV in „Technik B“ aufstellen.',
          pruefe: function (sim) { return vkHat(sim, 'gv', 'B', null, VK_ZENTRAL); },
          loesen: function (sim) { sim.ansicht('B-EG'); sim.setze('gv', 'B', 'EG', 'Technik B'); } },
        { auftrag: 'Verbinde GV B mit beiden EVs von Haus B (LWL OM4).',
          tipp: 'Wie in Haus A: „LWL OM4“, GV antippen, EV antippen – zweimal.',
          pruefe: function (sim) { return vkKabel(sim, 'GV B', 'EV B-EG', 'sek', ['om4']) && vkKabel(sim, 'GV B', 'EV B-OG', 'sek', ['om4']); },
          loesen: function (sim) { if (!vkKabel(sim, 'GV B', 'EV B-EG', 'sek')) sim.kabel('GV B', 'EV B-EG', 'om4'); if (!vkKabel(sim, 'GV B', 'EV B-OG', 'sek')) sim.kabel('GV B', 'EV B-OG', 'om4'); } },
        { auftrag: 'Verbinde den SV mit GV A. Nimm <b>LWL OS2</b>.',
          erklaerung: 'SV → GV heißt <b>Primärbereich</b>. Hier liegt Glasfaser Singlemode – sie reicht am weitesten.',
          tipp: '„LWL OS2“ wählen, SV antippen, GV A antippen (beide im Serverraum).',
          pruefe: function (sim) { return vkKabel(sim, 'SV', 'GV A', 'prim', ['os2']); },
          loesen: function (sim) { sim.kabel('SV', 'GV A', 'os2'); } },
        { auftrag: 'Und über den Hof: Verbinde den SV mit GV B (LWL OS2).',
          erklaerung: 'Zwischen Gebäuden liegt immer Glasfaser: Sie leitet keinen Strom, also keine Ausgleichsströme und keine Blitzschäden.',
          tipp: '„Gelände“ zeigt beide Gebäude. „LWL OS2“ wählen, SV antippen, GV B antippen.',
          pruefe: function (sim) { return vkKabel(sim, 'SV', 'GV B', 'prim', ['os2']); },
          loesen: function (sim) { sim.ansicht('gelaende'); sim.kabel('SV', 'GV B', 'os2'); } }
      ],
      mitdenken: { auftrag: 'Zeichne den fertigen Plan als Baum auf Papier: SV oben, darunter die GVs, dann die EVs, unten die Arbeitsplätze. Schreib an jede Ebene den Bereich und das Medium.', muster: 'SV –(Primär, LWL OS2)– GV A und GV B; GV A –(Sekundär, LWL OM4)– EV A-EG und EV A-OG; GV B – EV B-EG und EV B-OG; jeder EV –(Tertiär, Cat.7)– seine Arbeitsplätze.' } }
  ],

  uebungen: [
    {
      id: 'U1', titel: 'Die lange Halle', lz: ['LZ3', 'LZ5'], figur: 'weiss',
      auftrag: 'Die Druckhalle ist über 140 m lang. Plane die Etagenverteiler so, dass alle 16 Arbeitsplätze mit höchstens 90 m angeschlossen sind.',
      interaktion: function (box, api) {
        var fertig = false;
        var p = VK.plan(box, { gelaende: VK.HALLE, werkzeuge: ['ev', 'cat7', 'etage', 'verschieben', 'entfernen'], hoehe: 330,
          hinweis: 'Wähle „EV“ und tippe einen Raum an.',
          beiEreignis: function () {
            if (fertig) return;
            var a = p.analyse();
            if (vkAlleAn(p, 'D', 'EG') && vkTerOk(p, 'D', 'EG') && a.ok('standort-ev') && a.ok('medium-innen')) { fertig = true; api.erledigt('Alle Arbeitsplätze sind mit höchstens 90 m angeschlossen.'); }
          } });
        return { loesen: function () { p.setze('ev', 'D', 'EG', 'Technik'); p.setze('ev', 'D', 'EG', 'Papierlager'); p.etage('EV D-EG/1'); } };
      },
      tipps: ['Probier es mit einem einzigen EV im Technikraum aus: Welche Kabel werden rot?', 'Ein Schrank allein reicht hier nicht. Du darfst auf einer Etage mehrere EVs aufstellen – jeder in einem Nebenraum.', 'EVs in „Technik“ und „Papierlager“ aufstellen, dann „⚡ Etage anschließen“: Jeder Arbeitsplatz kommt an den nächsten EV.'],
      reflexion: { frage: 'Warum ist die Grenze für Tertiärkabel 90 m und nicht 100 m?', muster: '90 m fest verlegt (Permanent Link) plus höchstens 10 m Patch- und Geräteschnüre ergeben den Channel von 100 m – so weit überträgt Ethernet über Kupfer zuverlässig.' }
    },
    {
      id: 'U2', titel: 'Falsche Kabel bestellt', lz: ['LZ2'], figur: 'sonne',
      auftrag: 'Für das Hotel Sonne hat ein Subunternehmer falsche Kabel eingeplant. Finde sie und gib jedem Kabel das richtige Medium.',
      interaktion: function (box, api) {
        var fertig = false;
        var p = VK.plan(box, { gelaende: VK.HOTEL, ansicht: 'gelaende', werkzeuge: ['os2', 'om4', 'cat7', 'cat5', 'medium'], hoehe: 380,
          hinweis: 'Tippe ein Kabel an, um sein Medium zu sehen. Mit „🎨 Medium ändern“ tauschst du es.',
          start: { knoten: HOTEL_KNOTEN, kabel: [['SV', 'GV H', 'os2'], ['SV', 'GV S', 'cat7'], ['GV H', 'EV H-EG', 'om4'], ['GV H', 'EV H-OG', 'cat5'], ['GV S', 'EV S-EG', 'om4'],
            ['EV H-EG', 'PC 1 · Rezeption', 'om4'], ['EV S-EG', 'PC 1 · Seminar 2', 'cat5'], ['etage', 'EV H-EG'], ['etage', 'EV H-OG'], ['etage', 'EV S-EG']] },
          beiEreignis: function () {
            if (fertig) return;
            if (!p.analyse().lz('LZ2').length) { fertig = true; api.erledigt('Alle Medien stimmen: Primär OS2, Sekundär OM4, Arbeitsplätze Cat.7.'); }
          } });
        return { loesen: function () { p.medium('SV', 'GV S', 'os2'); p.medium('GV H', 'EV H-OG', 'om4'); p.medium('EV H-EG', 'PC 1 · Rezeption', 'cat7'); p.medium('EV S-EG', 'PC 1 · Seminar 2', 'cat7'); } };
      },
      tipps: ['Geh die Ebenen von oben nach unten durch: SV – GV, GV – EV, EV – Arbeitsplatz. Tippe die Kabel an und lies das Medium.', 'Vier Kabel sind falsch: eins zwischen den Gebäuden, eins im Steigbereich und zwei an Arbeitsplätzen.', 'SV – GV S auf LWL OS2, GV H – EV H-OG auf LWL OM4, Rezeption und Seminar 2 auf Cat.7.'],
      reflexion: { frage: 'Warum wird ein Arbeitsplatz nicht einfach auch mit Glasfaser angeschlossen?', muster: 'PCs und Dosen haben Kupferanschlüsse (RJ45); Glasfaser bis zum Platz bräuchte teure Wandler. Auf 90 m schafft Cat.7 ohnehin 10 Gbit/s.' }
    },
    {
      id: 'U3', titel: 'Kreuz und quer', lz: ['LZ4', 'LZ1'], figur: 'sonne',
      auftrag: 'Im Hotel Sonne wurde kreuz und quer verkabelt. Bring den Plan in Ordnung: ein hierarchischer Stern, jede Verbindung zwischen benachbarten Ebenen.',
      interaktion: function (box, api) {
        var fertig = false;
        var p = VK.plan(box, { gelaende: VK.HOTEL, ansicht: 'gelaende', werkzeuge: ['os2', 'om4', 'cat7', 'entfernen'], hoehe: 380,
          hinweis: 'Tippe Kabel an, um zu sehen, was sie verbinden.',
          start: { knoten: HOTEL_KNOTEN, kabel: [['SV', 'GV H', 'os2'], ['SV', 'GV S', 'os2'], ['GV H', 'EV H-EG', 'om4'], ['SV', 'EV H-OG', 'om4'], ['GV S', 'EV S-EG', 'om4'],
            ['EV H-EG', 'EV S-EG', 'om4'], ['GV H', 'PC 1 · Direktion', 'cat7'], ['etage', 'EV H-EG'], ['etage', 'EV H-OG'], ['etage', 'EV S-EG']] },
          beiEreignis: function () {
            if (fertig) return;
            var a = p.analyse();
            if (!a.lz('LZ4').length && !a.lz('LZ1').length) { fertig = true; api.erledigt('Jetzt ist es ein hierarchischer Stern: SV → GV → EV → Arbeitsplatz.'); }
          } });
        return { loesen: function () {
          ['SV|EV H-OG', 'EV H-EG|EV S-EG', 'GV H|PC 1 · Direktion'].forEach(function (x) { var t = x.split('|'); var c = p.kabelId(t[0], t[1]); if (c) p.entferne(c); });
          p.kabel('GV H', 'EV H-OG', 'om4'); p.kabel('EV H-OG', 'PC 1 · Direktion', 'cat7');
        } };
      },
      tipps: ['Drei Kabel überspringen eine Ebene oder verbinden Verteiler derselben Ebene. Tippe jedes Kabel an und lies, was es verbindet.', 'Falsch sind: SV – EV H-OG, EV H-EG – EV S-EG und GV H – PC in der Direktion. Entferne sie.', 'Dann neu verlegen: GV H – EV H-OG mit LWL OM4 und EV H-OG – PC in der Direktion mit Cat.7.'],
      reflexion: { frage: 'Warum verbindet man zwei Etagenverteiler nicht direkt miteinander, auch wenn das ein kurzer Weg wäre?', muster: 'Im hierarchischen Stern gibt es zwischen zwei Geräten genau einen Weg. Querverbindungen erzeugen Kreise, machen Fehler schwer zu finden und können ohne besondere Technik zu endlos kreisenden Daten führen.' }
    },
    {
      id: 'U4', titel: 'Schränke am falschen Ort', lz: ['LZ5'], figur: 'sonne',
      auftrag: 'Im Plan für das Hotel Sonne stehen Verteiler in der Lobby, an der Rezeption und in einem Büro. Zieh sie in geeignete Räume um.',
      interaktion: function (box, api) {
        var fertig = false;
        var p = VK.plan(box, { gelaende: VK.HOTEL, ansicht: 'H-EG', werkzeuge: ['verschieben'], hoehe: 380,
          hinweis: 'Tippe einen Verteiler an, um zu sehen, wo er steht.',
          start: { knoten: [['sv', 'H', 'EG', 'Lobby'], ['gv', 'H', 'EG', 'Rezeption'], ['ev', 'H', 'EG', 'Serverraum'], ['ev', 'H', 'OG', 'Besprechung'], ['gv', 'S', 'EG', 'Seminar 1'], ['ev', 'S', 'EG', 'Lager']],
            kabel: [['SV', 'GV H', 'os2'], ['SV', 'GV S', 'os2'], ['GV H', 'EV H-EG', 'om4'], ['GV H', 'EV H-OG', 'om4'], ['GV S', 'EV S-EG', 'om4'], ['etage', 'EV H-EG'], ['etage', 'EV H-OG'], ['etage', 'EV S-EG']] },
          beiEreignis: function () {
            if (fertig) return;
            if (!p.analyse().lz('LZ5').length) { fertig = true; api.erledigt('Alle Verteiler stehen jetzt in Technik-, Server- oder Nebenräumen.'); }
          } });
        return { loesen: function () { p.verschiebe('SV', 'H', 'EG', 'Serverraum'); p.verschiebe('GV H', 'H', 'EG', 'Serverraum'); p.verschiebe('EV H-OG', 'H', 'OG', 'Technik H1'); p.verschiebe('GV S', 'S', 'EG', 'Technik S'); } };
      },
      tipps: ['Wo arbeiten oder warten Menschen? Dort hat ein Verteilerschrank nichts zu suchen. Schau dir alle Etagen und das Seminarhaus an.', 'SV und GV gehören in einen Technik- oder Serverraum, ein EV darf auch in ein Lager. Vier Schränke müssen umziehen.', 'SV und GV H in den Serverraum, EV H-OG in „Technik H1“, GV S in „Technik S“.'],
      reflexion: { frage: 'Welche drei Gründe sprechen dafür, Verteiler in eigene, abschließbare Räume zu stellen?', muster: 'Zutrittsschutz (niemand zieht Kabel oder steckt Fremdgeräte an), Lärm und Abwärme der Geräte, und Fluchtwege und Arbeitsräume bleiben frei.' }
    }
  ],

  selbstueberpruefung: {
    dauer: '30 Minuten',
    gewichtA: 50,
    danach: 'Das Thema sitzt. Den Kompetenznachweis legst du in der Lernplattform ab – sprich deine Lehrkraft an.',
    einleitung: 'Neuer Kunde: das <b>Autohaus Seidl</b> mit Verkaufshaus und Werkstatthalle. Diesmal planst du allein, ohne Hinweise.',
    teilA: {
      titel: 'Verkabelung Autohaus Seidl', figur: 'seidl',
      auftrag: 'Plane die komplette Verkabelung: Verteiler aufstellen, alle 24 Arbeitsplätze anschließen, Gebäude verbinden. Mit „Abgeben“ wird geprüft.',
      interaktion: function (box) {
        var p = VK.plan(box, { gelaende: VK.AUTOHAUS, ansicht: 'V-EG', stumm: true, hoehe: 400,
          werkzeuge: ['sv', 'gv', 'ev', 'os2', 'om4', 'cat7', 'cat5', 'etage', 'medium', 'verschieben', 'entfernen'],
          hinweis: 'Wähle oben ein Werkzeug. Bewertet wird erst beim Abgeben.' });
        return {
          auswerten: function () {
            var a = p.analyse(), s = p.stand(), k = s.kabel;
            var alleAn = a.frei === 0;
            var prim = k.filter(function (x) { return x.bereich === 'prim'; }).length, sek = k.filter(function (x) { return x.bereich === 'sek'; }).length, ter = k.filter(function (x) { return x.bereich === 'ter'; }).length;
            var evs = s.knoten.filter(function (x) { return x.typ === 'ev'; }).length, zentral = s.knoten.filter(function (x) { return x.typ !== 'ev'; }).length;
            return [
              { lz: 'LZ1', text: 'Keine Ebene übersprungen, keine Verbindung zwischen ungleichen Ebenen', ok: ter >= 12 && a.ok('ebene') },
              { lz: 'LZ1', text: 'Jeder Arbeitsplatz am EV seiner Etage, jeder EV am GV seines Gebäudes', ok: ter >= 12 && a.ok('ort') },
              { lz: 'LZ2', text: 'Primärbereich in LWL Singlemode (OS2)', ok: prim >= 2 && a.ok('medium-primaer') },
              { lz: 'LZ2', text: 'Steigbereich in LWL, Arbeitsplätze in Cat.7', ok: sek >= 3 && ter >= 12 && a.ok('medium-innen') },
              { lz: 'LZ3', text: 'Alle Arbeitsplätze mit höchstens 90 m angeschlossen', ok: alleAn && a.ok('laenge-ter') },
              { lz: 'LZ4', text: 'Vollständig: ein SV, je Gebäude ein GV, je Etage ein EV, alle Arbeitsplätze angeschlossen', ok: a.ok('vollstaendig') },
              { lz: 'LZ4', text: 'Stern: je Verteiler genau eine Verbindung nach oben, keine Querverbindungen', ok: prim >= 2 && sek >= 3 && a.ok('stern') },
              { lz: 'LZ5', text: 'SV und GVs in Technik- oder Serverräumen', ok: zentral >= 3 && a.ok('standort-zentral') },
              { lz: 'LZ5', text: 'Etagenverteiler in Technik-, Server- oder Nebenräumen', ok: evs >= 3 && a.ok('standort-ev') }
            ];
          },
          loesen: function () {
            p.setze('sv', 'V', 'EG', 'Serverraum'); p.setze('gv', 'V', 'EG', 'Serverraum'); p.setze('ev', 'V', 'EG', 'Serverraum'); p.setze('ev', 'V', 'OG', 'Technik V1');
            p.setze('gv', 'W', 'EG', 'Technik W'); p.setze('ev', 'W', 'EG', 'Teilelager');
            p.kabel('SV', 'GV V', 'os2'); p.kabel('SV', 'GV W', 'os2');
            p.kabel('GV V', 'EV V-EG', 'om4'); p.kabel('GV V', 'EV V-OG', 'om4'); p.kabel('GV W', 'EV W-EG', 'om4');
            p.etage('EV V-EG'); p.etage('EV V-OG'); p.etage('EV W-EG');
          }
        };
      }
    },
    teilB: { proLZ: 2 }
  },

  merkblatt: [
    { lz: 'LZ1', titel: 'Bereiche zuordnen', zeilen: [
      { text: 'Standortverteiler → Gebäudeverteiler: ___bereich', loesung: 'Primär' },
      { text: 'Gebäudeverteiler → Etagenverteiler: ___bereich', loesung: 'Sekundär (Steigbereich)' },
      { text: 'Etagenverteiler → Anschlussdose: ___bereich', loesung: 'Tertiär' }
    ], fehler: 'Einen PC direkt an den Gebäudeverteiler hängen – dann wird der EV übersprungen.', schema: 'SV → GV → EV → Dose: immer zur nächsten Ebene, nie eine überspringen.' },
    { lz: 'LZ2', titel: 'Medium wählen', zeilen: [
      { text: 'Primärbereich: ___', loesung: 'LWL Singlemode (OS2)' },
      { text: 'Sekundärbereich: ___', loesung: 'LWL Multimode (OM4)' },
      { text: 'Tertiärbereich: ___', loesung: 'Kupfer Cat.7 (Twisted Pair, RJ45)' }
    ], fehler: 'Kupfer zwischen Gebäuden: unterschiedliche Erdpotentiale und Blitzgefahr – dort immer Glasfaser.', beispiel: 'Schulzentrum Lindenau: SV – GV B über den Hof mit LWL OS2, GV A – EV A-OG durch den Schacht mit LWL OM4, Arbeitsplätze mit Cat.7.' },
    { lz: 'LZ3', titel: 'Längen einhalten', zeilen: [
      { text: 'Tertiärbereich höchstens ___ m (Permanent Link)', loesung: '90' },
      { text: 'Sekundärbereich höchstens ___ m', loesung: '500' },
      { text: 'Primärbereich höchstens ___ m', loesung: '1500' }
    ], fehler: '100 m für das fest verlegte Kabel annehmen – 100 m ist der ganze Channel mit Patchkabeln.', beispiel: 'Haus B: EV am Ende → Kabel über 100 m. EV im Lager in der Mitte → alle unter 70 m.' },
    { lz: 'LZ4', titel: 'Hierarchischer Stern', zeilen: [
      { text: 'Je Standort ___ SV, je Gebäude ___ GV.', loesung: 'genau einen · genau einen' },
      { text: 'Jedes Gerät hat genau ___ Verbindung zur Ebene darüber.', loesung: 'eine' },
      { text: 'Verteiler derselben Ebene werden ___ verbunden.', loesung: 'nicht (keine Querverbindungen)' }
    ], fehler: 'Zwei EVs direkt verbinden, weil es kürzer ist – das erzeugt einen Kreis.' },
    { lz: 'LZ5', titel: 'Standorte wählen', zeilen: [
      { text: 'SV und GV stehen in einem ___.', loesung: 'Technik- oder Serverraum' },
      { text: 'Ein EV darf auch in einen ___ stehen.', loesung: 'abschließbaren Nebenraum (z. B. Lager)' },
      { text: 'Nie in ___, Treppenhaus oder Arbeitsräume.', loesung: 'den Flur' }
    ], fehler: 'Den EV ins EDV-Labor stellen, weil dort die meisten PCs sind – Lärm, Wärme und offener Zutritt.', schema: 'Abschließbar? Gekühlt/belüftet? Kein Fluchtweg, kein Arbeitsraum? Zentral genug für 90 m?' }
  ],
  selbsttest: ['P1', 'P6', 'P9', 'P14', 'P18'],

  tafel: {
    titel: 'Strukturierte Verkabelung – Erklären und Beispiel',
    szenen: [
      { id: 'bereiche', titel: 'Drei Bereiche', station: 'K4',
        erklaerung: '<p>Vom Standortverteiler zu den Gebäuden: Primärbereich (LWL Singlemode). Im Gebäude durch den Schacht: Sekundärbereich (LWL Multimode). Auf der Etage zum Arbeitsplatz: Tertiärbereich (Cat.7).</p>',
        zeichne: function (buehne, api) {
          var p = VK.plan(buehne, { gelaende: VK.CAMPUS, ansicht: 'gelaende', werkzeuge: [], hoehe: 620, start: CAMPUS_FERTIG, ansichtWahl: false, hinweis: ' ' });
          p.el.style.margin = 'auto 0';
          var reihe = [null, 'prim', 'sek', 'ter'], i = 0;
          api.werkzeug({ icon: '🔀', text: 'Bereich hervorheben', taste: 'b', aktion: function () { i = (i + 1) % reihe.length; p.hervorheben(reihe[i]); } });
          return {};
        } },
      { id: 'meter', titel: '90 Meter', station: 'K3',
        erklaerung: '<p>Ein Tertiärkabel darf höchstens 90 m lang sein. Steht der Etagenverteiler am Ende des Gebäudes, werden die Wege zum anderen Ende zu lang (rot). In der Mitte reicht es.</p>',
        zeichne: function (buehne, api) {
          var p = VK.plan(buehne, { gelaende: VK.CAMPUS, ansicht: 'B-EG', werkzeuge: [], hoehe: 560, ansichtWahl: false, hinweis: ' ',
            start: { knoten: [['ev', 'B', 'EG', 'Technik B']], kabel: [['etage', 'EV B-EG']] } });
          p.el.style.margin = 'auto 0';
          var mitte = false;
          api.werkzeug({ icon: '↔', text: 'EV verschieben', taste: 'v', aktion: function () { mitte = !mitte; p.verschiebe('EV B-EG', 'B', 'EG', mitte ? 'Lager' : 'Technik B'); } });
          return {};
        } },
      { id: 'stern', titel: 'Stern in Ebenen', station: 'K4',
        erklaerung: '<p>Die strukturierte Verkabelung ist ein hierarchischer Stern: SV → GV → EV → Arbeitsplatz. Jedes Gerät hängt an genau einem Verteiler der Ebene darüber, Querverbindungen gibt es nicht.</p>',
        zeichne: ebenenBild }
    ]
  }
};
