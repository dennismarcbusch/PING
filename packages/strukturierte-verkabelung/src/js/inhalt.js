/* Erzeugt von paket.py bauen aus quelle/ – hier nichts ändern, sondern in quelle/ (dann paket.py bauen). */

/* ---------- quelle/verkabelung.js ---------- */
/* =====================================================================
   Planer „Strukturierte Verkabelung“ – der Arbeitsgegenstand dieses Pakets.
   Herausgelöst aus Version 1 (Gebäudedaten, Kabelführung, Längen, Prüfung)
   und für die Kompass-Vorlage als Gerät verpackt: mehrere Gelände, Ansichten
   je Gebäude, bedienbar per Antippen und Tastatur, ohne Ziehen.

   var plan = VK.plan(box, {
     gelaende: VK.CAMPUS,            // oder ein anderes Gelände (siehe unten)
     werkzeuge: ['ev', 'gv', 'sv', 'os2', 'om4', 'cat7', 'cat5', 'etage', 'medium', 'verschieben', 'entfernen'],
     ansicht: 'A-OG',                // Gebäude-Etage (z. B. 'A-OG') oder 'gelaende'
     start: { knoten: [['ev', 'A', 'OG', 'Technik A1'], …], kabel: [['GV A', 'EV A-OG', 'om4'], …] },
     stumm: false,                   // true: keine Bewertung während der Arbeit (Selbstüberprüfung)
     beiEreignis: function (ev) {}   // {typ, text, art: 'ok'|'warn'|'bad'|'', …}
   });
   plan.setze(typ, b, f, raum) · plan.kabel(a, b, medium) · plan.etage(ev, medium)
   plan.entferne(name) · plan.medium(a, b, medium) · plan.verschiebe(name, b, f, raum)
   plan.ansicht(v) · plan.stand() · plan.analyse()
   ===================================================================== */
var VK = (function () {
  var NS = 'http://www.w3.org/2000/svg';
  var PH = 260, TB = 105, CB = 145;      // Geschosshöhe in der Zeichnung, Ende obere Raumzeile, Beginn untere Raumzeile
  var GRENZE = { prim: 1500, sek: 500, ter: 90 };
  var MEDIEN = {
    os2:  { name: 'LWL Singlemode OS2', kurz: 'LWL OS2', art: 'lwl', farbe: '#d39e00' },
    om4:  { name: 'LWL Multimode OM4',  kurz: 'LWL OM4', art: 'lwl', farbe: '#0e9fb3' },
    cat7: { name: 'Kupfer Cat.7 S/FTP', kurz: 'Cat.7',   art: 'cu',  farbe: '#2563eb' },
    cat5: { name: 'Kupfer Cat.5e U/UTP', kurz: 'Cat.5e', art: 'cu',  farbe: '#8b95a7' }
  };
  var TYPEN = {
    sv: { name: 'Standortverteiler', kurz: 'SV', farbe: '#9f1239', ebene: 0 },
    gv: { name: 'Gebäudeverteiler',  kurz: 'GV', farbe: '#6d28d9', ebene: 1 },
    ev: { name: 'Etagenverteiler',   kurz: 'EV', farbe: '#047857', ebene: 2 },
    pc: { name: 'Arbeitsplatz',      kurz: 'PC', farbe: '#1f2937', ebene: 3 }
  };
  var BEREICH = { prim: 'Primärbereich', sek: 'Sekundärbereich', ter: 'Tertiärbereich', inv: 'keine gültige Ebene' };
  var RAUMART = { class: 'Unterrichtsraum', office: 'Büro', tech: 'Technikraum', server: 'Serverraum', storage: 'Lager', wc: 'Sanitärraum', stairs: 'Treppenhaus', hall: 'Halle', misc: 'Nebenraum' };
  var RAUMFARBE = { class: '#ffffff', office: '#fcf8ee', tech: '#e3f2ee', server: '#e2ebf8', storage: '#f1ede3', wc: '#eef1f4', stairs: '#eef1f4', hall: '#faf7f0', misc: '#f4f3ef' };

  function R(n, t, x0, x1, band, pcs) { return { n: n, t: t, x0: x0, x1: x1, band: band, pcs: pcs || 0 }; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(v) { return v.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }

  /* ---------------- Gelände ---------------- */
  // Schulzentrum aus Version 1: Haus A (Hauptgebäude) und Haus B (Werkstattgebäude), 44 Arbeitsplätze
  var CAMPUS = { id: 'campus', name: 'Berufliches Schulzentrum Lindenau', breite: 1360, hoehe: 790, m: 0.16, geschoss: 4, erdtrasse: 160, reserve: 2,
    hof: { x: 652, w: 116, text: 'SCHULHOF' },
    gebaeude: [
      { id: 'A', name: 'Haus A', sub: 'Hauptgebäude', x: 40, w: 600, schacht: 300, eingang: 'r', etagen: [
        { id: 'OG', name: '1. Obergeschoss', kurz: 'OG', lvl: 1, y: 80, raeume: [
          R('EDV-Raum 201', 'class', 0, 150, 't', 3), R('EDV-Raum 202', 'class', 150, 250, 't', 2), R('Technik A1', 'tech', 250, 340, 't'),
          R('Lehrerzimmer', 'office', 340, 470, 't', 2), R('Klassenzimmer 205', 'class', 470, 600, 't', 1),
          R('Klassenzimmer 210', 'class', 0, 120, 'b', 1), R('WC', 'wc', 120, 180, 'b'), R('Treppenhaus', 'stairs', 180, 292, 'b'),
          R('EDV-Raum 212', 'class', 308, 500, 'b', 3), R('Bibliothek', 'class', 500, 600, 'b', 1)] },
        { id: 'EG', name: 'Erdgeschoss', kurz: 'EG', lvl: 0, y: 480, raeume: [
          R('Verwaltung', 'office', 0, 140, 't', 2), R('Schulleitung', 'office', 140, 230, 't', 1), R('Serverraum', 'server', 230, 350, 't'),
          R('Mensa', 'hall', 350, 510, 't', 1), R('Haustechnik', 'tech', 510, 600, 't'),
          R('Foyer', 'hall', 0, 140, 'b', 1), R('Treppenhaus', 'stairs', 140, 292, 'b'), R('Klassenzimmer 110', 'class', 308, 420, 'b', 1),
          R('EDV-Raum 112', 'class', 420, 600, 'b', 3)] }
      ] },
      { id: 'B', name: 'Haus B', sub: 'Werkstattgebäude', x: 780, w: 540, schacht: 60, eingang: 'l', etagen: [
        { id: 'OG', name: '1. Obergeschoss', kurz: 'OG', lvl: 1, y: 80, raeume: [
          R('Technik B1', 'tech', 0, 100, 't'), R('EDV-Raum 301', 'class', 100, 290, 't', 3), R('Lager', 'storage', 290, 350, 't'),
          R('EDV-Raum 302', 'class', 350, 540, 't', 3),
          R('Treppe', 'stairs', 0, 52, 'b'), R('Besprechung', 'office', 68, 180, 'b', 1), R('Netzwerklabor 310', 'class', 180, 400, 'b', 3),
          R('Teeküche', 'misc', 400, 460, 'b'), R('Fachbetreuung', 'office', 460, 540, 'b', 1)] },
        { id: 'EG', name: 'Erdgeschoss', kurz: 'EG', lvl: 0, y: 480, raeume: [
          R('Technik B', 'tech', 0, 100, 't'), R('Werkstatt Elektro', 'class', 100, 300, 't', 3), R('Lager', 'storage', 300, 360, 't'),
          R('CNC-Labor', 'class', 360, 540, 't', 3),
          R('Treppe', 'stairs', 0, 52, 'b'), R('Meisterbüro', 'office', 68, 170, 'b', 1), R('Werkstatt Metall', 'class', 170, 420, 'b', 2),
          R('Prüffeld', 'class', 420, 540, 'b', 2)] }
      ] }
    ] };

  // Druckerei Weiß: eine lange Halle, nur Erdgeschoss
  var HALLE = { id: 'halle', name: 'Druckerei Weiß', breite: 1000, hoehe: 380, m: 0.16, geschoss: 4, erdtrasse: 0, reserve: 2,
    gebaeude: [
      { id: 'D', name: 'Druckhalle', sub: 'Druckerei Weiß', x: 40, w: 900, schacht: 60, eingang: 'l', etagen: [
        { id: 'EG', name: 'Erdgeschoss', kurz: 'EG', lvl: 0, y: 80, raeume: [
          R('Technik', 'tech', 0, 90, 't'), R('Druck 1', 'class', 90, 330, 't', 3), R('Lager', 'storage', 330, 410, 't'),
          R('Druck 2', 'class', 410, 660, 't', 3), R('Versand', 'office', 660, 900, 't', 3),
          R('Treppe', 'stairs', 0, 52, 'b'), R('Büro', 'office', 68, 240, 'b', 2), R('Pausenraum', 'misc', 240, 380, 'b'),
          R('Weiterverarbeitung', 'class', 380, 700, 'b', 3), R('Papierlager', 'storage', 700, 770, 'b'), R('Leitstand', 'office', 770, 900, 'b', 2)] }
      ] }
    ] };

  // Autohaus Seidl: Verkaufshaus (zwei Etagen) und Werkstatthalle (eine Etage)
  var AUTOHAUS = { id: 'autohaus', name: 'Autohaus Seidl', breite: 1360, hoehe: 790, m: 0.16, geschoss: 4, erdtrasse: 120, reserve: 2,
    hof: { x: 572, w: 176, text: 'HOF' },
    gebaeude: [
      { id: 'V', name: 'Verkaufshaus', sub: 'Autohaus Seidl', x: 40, w: 520, schacht: 260, eingang: 'r', etagen: [
        { id: 'OG', name: '1. Obergeschoss', kurz: 'OG', lvl: 1, y: 80, raeume: [
          R('Büro Chef', 'office', 0, 130, 't', 1), R('Buchhaltung', 'office', 130, 250, 't', 2), R('Technik V1', 'tech', 250, 330, 't'),
          R('Besprechung', 'office', 330, 520, 't', 1),
          R('Treppe', 'stairs', 0, 60, 'b'), R('Archiv', 'storage', 60, 160, 'b'), R('Marketing', 'office', 160, 252, 'b', 2),
          R('Personal', 'office', 268, 400, 'b', 1), R('Teeküche', 'misc', 400, 520, 'b')] },
        { id: 'EG', name: 'Erdgeschoss', kurz: 'EG', lvl: 0, y: 480, raeume: [
          R('Empfang', 'hall', 0, 140, 't', 1), R('Verkauf', 'office', 140, 250, 't', 3), R('Serverraum', 'server', 250, 340, 't'),
          R('Ausstellung', 'hall', 340, 520, 't', 1),
          R('Treppe', 'stairs', 0, 60, 'b'), R('Kundenlounge', 'hall', 60, 252, 'b', 1), R('Finanzierung', 'office', 268, 400, 'b', 2),
          R('Lager', 'storage', 400, 520, 'b')] }
      ] },
      { id: 'W', name: 'Werkstatthalle', sub: 'Autohaus Seidl', x: 760, w: 560, schacht: 40, eingang: 'l', etagen: [
        { id: 'EG', name: 'Erdgeschoss', kurz: 'EG', lvl: 0, y: 480, raeume: [
          R('Technik W', 'tech', 0, 80, 't'), R('Annahme', 'office', 80, 240, 't', 2), R('Teilelager', 'storage', 240, 310, 't'),
          R('Werkstatt 1', 'class', 310, 460, 't', 2), R('Werkstatt 2', 'class', 460, 560, 't', 1),
          R('Meisterbüro', 'office', 0, 130, 'b', 1), R('Diagnose', 'class', 130, 330, 'b', 2), R('Waschhalle', 'misc', 330, 450, 'b'),
          R('Lackiererei', 'class', 450, 560, 'b', 1)] }
      ] }
    ] };

  // Hotel Sonne: Haupthaus (zwei Etagen) und Seminarhaus (eine Etage) – für die Übungen
  var HOTEL = { id: 'hotel', name: 'Hotel Sonne', breite: 1360, hoehe: 790, m: 0.16, geschoss: 4, erdtrasse: 90, reserve: 2,
    hof: { x: 612, w: 156, text: 'PARKPLATZ' },
    gebaeude: [
      { id: 'H', name: 'Haupthaus', sub: 'Hotel Sonne', x: 40, w: 560, schacht: 280, eingang: 'r', etagen: [
        { id: 'OG', name: '1. Obergeschoss', kurz: 'OG', lvl: 1, y: 80, raeume: [
          R('Verwaltung', 'office', 0, 160, 't', 2), R('Buchhaltung', 'office', 160, 260, 't', 2), R('Technik H1', 'tech', 260, 340, 't'),
          R('Marketing', 'office', 340, 460, 't', 2), R('Archiv', 'storage', 460, 560, 't'),
          R('Treppe', 'stairs', 0, 60, 'b'), R('Direktion', 'office', 60, 200, 'b', 1), R('Besprechung', 'office', 200, 272, 'b', 1),
          R('Personal', 'office', 288, 440, 'b', 2), R('WC', 'wc', 440, 560, 'b')] },
        { id: 'EG', name: 'Erdgeschoss', kurz: 'EG', lvl: 0, y: 480, raeume: [
          R('Rezeption', 'hall', 0, 160, 't', 2), R('Backoffice', 'office', 160, 260, 't', 2), R('Serverraum', 'server', 260, 340, 't'),
          R('Restaurant', 'hall', 340, 560, 't', 1),
          R('Treppe', 'stairs', 0, 60, 'b'), R('Lobby', 'hall', 60, 272, 'b', 1), R('Küche', 'misc', 288, 440, 'b', 1), R('Lager', 'storage', 440, 560, 'b')] }
      ] },
      { id: 'S', name: 'Seminarhaus', sub: 'Hotel Sonne', x: 780, w: 520, schacht: 40, eingang: 'l', etagen: [
        { id: 'EG', name: 'Erdgeschoss', kurz: 'EG', lvl: 0, y: 480, raeume: [
          R('Technik S', 'tech', 0, 80, 't'), R('Seminar 1', 'class', 80, 260, 't', 2), R('Lager', 'storage', 260, 320, 't'),
          R('Seminar 2', 'class', 320, 520, 't', 2),
          R('Foyer', 'hall', 0, 180, 'b', 1), R('Seminar 3', 'class', 180, 400, 'b', 2), R('WC', 'wc', 400, 520, 'b')] }
      ] }
    ] };

  function vorbereiten(G) {
    if (G._fertig) return G;
    G.raeume = []; G.pcs = [];
    var seq = 1;
    G.gebaeude.forEach(function (B) {
      B.etagen.forEach(function (F) {
        F.b = B.id; F.yc = F.y + (TB + CB) / 2;
        F.raeume.forEach(function (r, i) {
          r.id = B.id + F.id + i; r.b = B.id; r.f = F.id;
          r.ax = B.x + r.x0; r.aw = r.x1 - r.x0; r.ay = F.y + (r.band === 't' ? 0 : CB); r.ah = r.band === 't' ? TB : PH - CB;
          G.raeume.push(r);
          for (var k = 0; k < r.pcs; k++) {
            G.pcs.push({ id: 'pc' + (seq++), type: 'pc', b: B.id, f: F.id,
              x: Math.round(r.ax + r.aw * (k + 1) / (r.pcs + 1)), y: r.band === 't' ? r.ay + 30 : r.ay + r.ah - 30,
              name: 'PC ' + (k + 1) + ' · ' + r.n, room: r.id, dir: r.band === 't' ? 1 : -1 });
          }
        });
      });
      var ys = B.etagen.map(function (F) { return F.y; });
      B.top = Math.min.apply(null, ys); B.bottom = Math.max.apply(null, ys) + PH;
    });
    G._fertig = true;
    return G;
  }

  /* ================= Gerät ================= */
  function plan(box, opt) {
    opt = opt || {};
    var G = vorbereiten(opt.gelaende || CAMPUS);
    var E = KIT.el;
    var st = { nodes: [], cables: [], seq: 1 };
    var ui = { modus: 'ansehen', medium: 'cat7', quelle: null, wahl: null, hervor: null };
    var LBL = {};
    var werkzeuge = opt.werkzeuge || ['ev', 'gv', 'sv', 'os2', 'om4', 'cat7', 'cat5', 'etage', 'verschieben', 'entfernen'];
    var ansichten = [];
    G.gebaeude.forEach(function (B) { B.etagen.forEach(function (F) { ansichten.push(B.id + '-' + F.id); }); });
    if (G.gebaeude.length > 1) ansichten.push('gelaende');
    var aktAnsicht = opt.ansicht || ansichten[0];

    function bld(id) { return G.gebaeude.filter(function (B) { return B.id === id; })[0]; }
    function flr(b, f) { return bld(b).etagen.filter(function (F) { return F.id === f; })[0]; }
    function eingangX(B) { return B.eingang === 'r' ? B.x + B.w : B.x; }
    function schachtX(B) { return B.x + B.schacht; }
    function raumBei(b, f, x, y) { return G.raeume.filter(function (r) { return r.b === b && r.f === f && x >= r.ax && x <= r.ax + r.aw && y >= r.ay && y <= r.ay + r.ah; })[0]; }
    function raumVon(n) { return n.room ? G.raeume.filter(function (r) { return r.id === n.room; })[0] : raumBei(n.b, n.f, n.x, n.y); }
    function raumNamens(b, f, name) { return G.raeume.filter(function (r) { return r.b === b && r.f === f && r.n === name; })[0]; }
    function alle() { return G.pcs.concat(st.nodes); }
    function knoten(id) { return st.nodes.filter(function (n) { return n.id === id; })[0] || G.pcs.filter(function (n) { return n.id === id; })[0]; }
    function etagenName(n) { return bld(n.b).id + '-' + flr(n.b, n.f).kurz; }

    function beschriften() {
      var L = {}, by = {};
      st.nodes.forEach(function (n) { var k = n.type === 'sv' ? 'sv' : n.type === 'gv' ? 'gv' + n.b : 'ev' + n.b + n.f; (by[k] = by[k] || []).push(n); });
      Object.keys(by).forEach(function (k) {
        var arr = by[k];
        arr.sort(function (a, b) { return a.seq - b.seq; });
        arr.forEach(function (n, i) {
          var base = n.type === 'sv' ? 'SV' : n.type === 'gv' ? 'GV ' + n.b : 'EV ' + etagenName(n);
          L[n.id] = arr.length > 1 ? base + '/' + (i + 1) : base;
        });
      });
      LBL = L;
    }
    function nm(n) { return n.type === 'pc' ? n.name : (LBL[n.id] || TYPEN[n.type].name); }
    function finde(name) {
      if (knoten(name)) return name;
      var n = st.nodes.filter(function (k) { return LBL[k.id] === name; })[0] || G.pcs.filter(function (k) { return k.name === name; })[0];
      return n ? n.id : null;
    }
    function kabelZwischen(a, b) { return st.cables.filter(function (c) { return (c.a === a && c.b === b) || (c.a === b && c.b === a); })[0]; }
    function bereich(c) {
      var a = knoten(c.a), b = knoten(c.b), k = [a.type, b.type].sort().join('-');
      return { 'gv-sv': 'prim', 'ev-gv': 'sek', 'ev-pc': 'ter' }[k] || 'inv';
    }
    function ort(x, y) {
      for (var i = 0; i < G.gebaeude.length; i++) {
        var B = G.gebaeude[i];
        for (var j = 0; j < B.etagen.length; j++) {
          var F = B.etagen[j];
          if (x >= B.x && x <= B.x + B.w && y >= F.y && y <= F.y + PH) {
            if (y > F.y + TB && y < F.y + CB) return { B: B, F: F, zone: 'flur' };
            if (B.etagen.length > 1 && Math.abs(x - schachtX(B)) <= 9) return { B: B, F: F, zone: 'schacht' };
            var r = raumBei(B.id, F.id, x, y);
            return r ? { B: B, F: F, zone: 'raum', raum: r } : { B: B, F: F, zone: 'keiner' };
          }
        }
      }
      return { zone: 'draussen' };
    }

    /* ---- Kabelführung und Länge (wie Version 1) ---- */
    function route(p, q, o) {
      o = o || 0;
      var Bp = bld(p.b), Bq = bld(q.b), Fp = flr(p.b, p.f), Fq = flr(q.b, q.f);
      var pts = [[p.x, p.y]], skip = {}, floors = 0, ground = false;
      function add(x, y) { pts.push([x, y]); }
      function sk() { skip[pts.length - 2] = true; }
      if (p.b === q.b && p.f === q.f) {
        var rp = raumVon(p), rq = raumVon(q);
        if (rp && rp === rq) { add(q.x, p.y); add(q.x, q.y); }
        else { var c = Fp.yc + o; add(p.x, c); add(q.x, c); add(q.x, q.y); }
      } else if (p.b === q.b) {
        var s = schachtX(Bp) + o * 0.5;
        add(p.x, Fp.yc + o); add(s, Fp.yc + o); add(s, Fq.yc + o); sk(); floors = Math.abs(Fp.lvl - Fq.lvl);
        add(q.x, Fq.yc + o); add(q.x, q.y);
      } else {
        var Ep = flr(p.b, 'EG'), Eq = flr(q.b, 'EG');
        add(p.x, Fp.yc + o);
        if (p.f !== 'EG') { var s1 = schachtX(Bp) + o * 0.5; add(s1, Fp.yc + o); add(s1, Ep.yc + o); sk(); floors += Fp.lvl; }
        add(eingangX(Bp), Ep.yc + o); add(eingangX(Bq), Eq.yc + o); sk(); ground = true;
        if (q.f !== 'EG') { var s2 = schachtX(Bq) + o * 0.5; add(s2, Eq.yc + o); add(s2, Fq.yc + o); sk(); floors += Fq.lvl; }
        add(q.x, Fq.yc + o); add(q.x, q.y);
      }
      var u = 0;
      for (var i = 0; i < pts.length - 1; i++) if (!skip[i]) u += Math.abs(pts[i + 1][0] - pts[i][0]) + Math.abs(pts[i + 1][1] - pts[i][1]);
      return { pts: pts, len: u * G.m + floors * G.geschoss + (ground ? G.erdtrasse : 0) + G.reserve };
    }
    function laenge(c) { return route(knoten(c.a), knoten(c.b), 0).len; }
    function zuLang(c) { var b = bereich(c), L = laenge(c); return b === 'inv' ? (MEDIEN[c.m].art === 'cu' && L > 90) : L > GRENZE[b] || (MEDIEN[c.m].art === 'cu' && L > 90); }
    function pathD(pts) { return 'M' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L'); }

    /* ---- Aufbau der Oberfläche ---- */
    var root = E('div', { class: 'vk' });
    var leiste = E('div', { class: 'vk-leiste', role: 'toolbar', 'aria-label': 'Werkzeuge für die Planung' });
    var zeile = E('div', { class: 'vk-zeile', 'aria-live': 'polite' });
    var meldung = E('span', { class: 'vk-meldung' }), zaehler = E('span', { class: 'vk-zaehler' });
    zeile.appendChild(meldung); zeile.appendChild(zaehler);
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'vk-svg'); svg.setAttribute('role', 'group'); svg.setAttribute('aria-label', 'Lageplan ' + G.name);
    svg.style.maxHeight = (opt.hoehe || 420) + 'px';
    var gS = document.createElementNS(NS, 'g'), gR = document.createElementNS(NS, 'g'), gC = document.createElementNS(NS, 'g'), gN = document.createElementNS(NS, 'g');
    [gS, gR, gC, gN].forEach(function (g) { svg.appendChild(g); });
    var kn = {};
    function knopf(id, text, titel) {
      var b = E('button', { type: 'button', text: text, title: titel || '', onclick: function () { werkzeug(id); } });
      kn[id] = b; return b;
    }
    var gruppen = [
      ['Verteiler', ['sv', 'gv', 'ev'], { sv: 'SV', gv: 'GV', ev: 'EV' }],
      ['Kabel', ['os2', 'om4', 'cat7', 'cat5', 'etage'], { os2: 'LWL OS2', om4: 'LWL OM4', cat7: 'Cat.7', cat5: 'Cat.5e', etage: '⚡ Etage anschließen' }],
      ['Ändern', ['medium', 'verschieben', 'entfernen'], { medium: '🎨 Medium ändern', verschieben: '✋ Verschieben', entfernen: '🗑 Entfernen' }]
    ];
    gruppen.forEach(function (gr) {
      var ids = gr[1].filter(function (w) { return werkzeuge.indexOf(w) >= 0; });
      if (!ids.length) return;
      var g = E('div', { class: 'vk-gruppe', role: 'group', 'aria-label': gr[0] }, [E('span', { class: 'vk-gtitel', text: gr[0] })]);
      ids.forEach(function (w) {
        var b = knopf(w, gr[2][w], w in TYPEN ? TYPEN[w].name + ' platzieren' : w in MEDIEN ? MEDIEN[w].name + ' verlegen' : '');
        if (w in TYPEN) b.insertBefore(E('i', { class: 'vk-farbe', style: { background: TYPEN[w].farbe } }), b.firstChild);
        if (w in MEDIEN) b.insertBefore(E('i', { class: 'vk-strich', style: { background: MEDIEN[w].farbe } }), b.firstChild);
        g.appendChild(b);
      });
      leiste.appendChild(g);
    });
    if (ansichten.length > 1 && opt.ansichtWahl !== false) {
      var ga = E('div', { class: 'vk-gruppe', role: 'group', 'aria-label': 'Ansicht' }, [E('span', { class: 'vk-gtitel', text: 'Ansicht' })]);
      ansichten.forEach(function (v) {
        var b = E('button', { type: 'button', text: v === 'gelaende' ? 'Gelände' : bld(v.split('-')[0]).name + ' ' + flr(v.split('-')[0], v.split('-')[1]).kurz, onclick: function () { ansicht(v); } });
        kn['ansicht-' + v] = b; ga.appendChild(b);
      });
      leiste.appendChild(ga);
    }
    root.appendChild(leiste); root.appendChild(zeile); root.appendChild(svg);
    box.appendChild(root);

    function melde(ev) {
      if (!(opt.stumm && (ev.art === 'bad' || ev.art === 'warn'))) setzeMeldung(ev.text || '', ev.art || '');
      else setzeMeldung(ev.neutral || '', '');
      if (opt.beiEreignis) opt.beiEreignis(ev);
    }
    function setzeMeldung(t, art) { meldung.innerHTML = t; meldung.className = 'vk-meldung' + (art ? ' vk-' + art : ''); }

    /* ---- Zeichnen ---- */
    function zeichneStatisch() {
      var s = '<defs><pattern id="vk-hatch-' + G.id + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#e7e2d4"/><line x1="0" y1="0" x2="0" y2="6" stroke="#9a927d" stroke-width="1.6"/></pattern></defs>';
      s += '<rect width="' + G.breite + '" height="' + G.hoehe + '" fill="#eef1e6"/>';
      if (G.hof) s += '<rect x="' + G.hof.x + '" y="60" width="' + G.hof.w + '" height="' + (G.hoehe - 90) + '" rx="10" fill="#e4e0d2"/><text x="' + (G.hof.x + G.hof.w / 2) + '" y="300" text-anchor="middle" font-size="13" font-weight="700" fill="#8a826d" letter-spacing="2">' + G.hof.text + '</text>';
      if (G.gebaeude.length > 1) {
        var A = G.gebaeude[0], B2 = G.gebaeude[1], yT = flr(A.id, 'EG').yc;
        s += '<path d="M' + eingangX(A) + ' ' + yT + ' H' + eingangX(B2) + '" stroke="#8b6b45" stroke-width="12" stroke-opacity=".22" stroke-linecap="round"/>' +
          '<path d="M' + eingangX(A) + ' ' + yT + ' H' + eingangX(B2) + '" stroke="#8b6b45" stroke-width="2" stroke-dasharray="7 5"/>' +
          '<text x="' + ((eingangX(A) + eingangX(B2)) / 2) + '" y="' + (yT - 22) + '" text-anchor="middle" font-size="13" font-weight="800" fill="#5b4630" class="vk-halo">Erdtrasse ' + G.erdtrasse + ' m</text>' +
          '<text x="' + ((eingangX(A) + eingangX(B2)) / 2) + '" y="' + (yT + 30) + '" text-anchor="middle" font-size="11" fill="#5b4630" class="vk-halo">nicht maßstäblich</text>';
      }
      G.gebaeude.forEach(function (B) {
        s += '<text x="' + B.x + '" y="' + (B.top - 22) + '" font-size="19" font-weight="800" fill="#172033">' + esc(B.name) + (B.sub && B.sub !== G.name ? '<tspan font-weight="500" fill="#5b6476" font-size="15"> · ' + esc(B.sub) + '</tspan>' : '') + '</text>';
        if (B.etagen.length > 1) {
          var sx = schachtX(B), og = B.etagen[0], eg = B.etagen[B.etagen.length - 1];
          s += '<rect x="' + (sx - 8) + '" y="' + (og.y + PH) + '" width="16" height="' + (eg.y - og.y - PH) + '" fill="url(#vk-hatch-' + G.id + ')" opacity=".75" stroke="#9a927d" stroke-dasharray="3 3"/>' +
            '<text x="' + (sx + 16) + '" y="' + (og.y + PH + 70) + '" font-size="12" fill="#5b6476" class="vk-halo">↕ Steigschacht · ' + G.geschoss + ' m je Etage</text>';
        }
        B.etagen.forEach(function (F) {
          var lx = B.eingang === 'r' ? B.x - 14 : B.x + B.w + 24;
          s += '<text transform="translate(' + lx + ',' + (F.y + PH / 2) + ') rotate(-90)" text-anchor="middle" font-size="13" font-weight="800" fill="#5b6476" letter-spacing="1.5">' + F.name.toUpperCase() + '</text>';
          s += '<rect x="' + B.x + '" y="' + F.y + '" width="' + B.w + '" height="' + PH + '" fill="#fff"/>';
          s += '<rect x="' + B.x + '" y="' + (F.y + TB) + '" width="' + B.w + '" height="' + (CB - TB) + '" fill="#f2eee3"/>' +
            '<line x1="' + (B.x + 6) + '" x2="' + (B.x + B.w - 6) + '" y1="' + F.yc + '" y2="' + F.yc + '" stroke="#cfc6ae" stroke-width="7" stroke-linecap="round"/>' +
            '<text x="' + (B.eingang === 'r' ? B.x + 80 : B.x + B.w - 80) + '" y="' + (F.y + TB + 13) + '" text-anchor="middle" font-size="10" fill="#a09679" letter-spacing="1">FLUR · KABELTRASSE</text>';
          if (B.etagen.length > 1) {
            var sx2 = schachtX(B);
            s += '<rect x="' + (sx2 - 8) + '" y="' + F.y + '" width="16" height="' + TB + '" fill="url(#vk-hatch-' + G.id + ')" stroke="#3b4556" stroke-width="1"/>' +
              '<rect x="' + (sx2 - 8) + '" y="' + (F.y + CB) + '" width="16" height="' + (PH - CB) + '" fill="url(#vk-hatch-' + G.id + ')" stroke="#3b4556" stroke-width="1"/>';
          }
          if (F.id === 'EG' && G.gebaeude.length > 1) {
            var ex = eingangX(B);
            s += '<rect x="' + (ex - 6) + '" y="' + (F.yc - 10) + '" width="12" height="20" rx="2" fill="#5b4630"><title>Hauseinführung</title></rect>' +
              '<text x="' + (ex + (B.eingang === 'r' ? 9 : -9)) + '" y="' + (F.yc + 28) + '" text-anchor="' + (B.eingang === 'r' ? 'start' : 'end') + '" font-size="11" font-weight="800" fill="#5b4630" class="vk-halo">HE</text>';
          }
        });
      });
      gS.innerHTML = s;
      // Räume: antippbar (Verteiler platzieren, verschieben)
      var r = '';
      G.raeume.forEach(function (x) {
        r += '<g class="vk-raum" data-raum="' + x.id + '" tabindex="-1" role="button" aria-label="' + esc(x.n + ', ' + bld(x.b).name + ' ' + flr(x.b, x.f).kurz + ' (' + RAUMART[x.t] + ')') + '">' +
          '<rect x="' + x.ax + '" y="' + x.ay + '" width="' + x.aw + '" height="' + x.ah + '" fill="' + RAUMFARBE[x.t] + '" stroke="#3b4556" stroke-width="1.4"/>';
        if (x.t === 'stairs') for (var k = x.ax + 8; k < x.ax + x.aw - 4; k += 9) r += '<line x1="' + k + '" x2="' + k + '" y1="' + (x.ay + 12) + '" y2="' + (x.ay + x.ah - 12) + '" stroke="#b9bfc9" stroke-width="1"/>';
        var ly = x.band === 't' ? x.ay + x.ah - 8 : x.ay + 17;
        var label = x.aw < 75 && x.n.length > 7 ? x.n.slice(0, 6) + '.' : x.n;
        r += '<text x="' + (x.ax + 5) + '" y="' + ly + '" class="vk-rlabel vk-halo' + (x.t === 'tech' ? ' vk-tech' : x.t === 'server' ? ' vk-server' : '') + '">' + esc(label) + '</text></g>';
      });
      G.gebaeude.forEach(function (B) { B.etagen.forEach(function (F) { r += '<rect x="' + B.x + '" y="' + F.y + '" width="' + B.w + '" height="' + PH + '" fill="none" stroke="#172033" stroke-width="4" pointer-events="none"/>'; }); });
      gR.innerHTML = r;
    }
    function zeichne() {
      beschriften();
      var anz = {};
      st.cables.forEach(function (c) { anz[c.a] = (anz[c.a] || 0) + 1; anz[c.b] = (anz[c.b] || 0) + 1; });
      var s = '';
      st.cables.forEach(function (c, i) {
        var a = knoten(c.a), b = knoten(c.b), o = ((i * 5) % 9 - 4) * 2.1;
        var r = route(a, b, o), d = pathD(r.pts), md = MEDIEN[c.m], ber = bereich(c);
        var gewaehlt = ui.wahl === c.id, aus = ui.hervor && ui.hervor !== ber;
        s += '<g class="vk-kabel' + (gewaehlt ? ' vk-gewaehlt' : '') + '" data-kabel="' + c.id + '" tabindex="0" role="button" aria-label="' + esc('Kabel ' + nm(a) + ' – ' + nm(b) + ', ' + md.kurz) + '"' + (aus ? ' opacity=".15"' : '') + '>';
        if (!opt.stumm && zuLang(c)) s += '<path d="' + d + '" fill="none" stroke="#dc2626" stroke-width="9" stroke-opacity=".35" stroke-dasharray="8 6" stroke-linejoin="round"/>';
        s += '<path class="vk-hl" d="' + d + '" fill="none" stroke="#0e7c86" stroke-width="11" stroke-linejoin="round" stroke-linecap="round"/>';
        if (md.art === 'lwl') s += '<path d="' + d + '" fill="none" stroke="' + md.farbe + '" stroke-width="4.5" stroke-linejoin="round"/><path d="' + d + '" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.3" stroke-linejoin="round"/>';
        else s += '<path d="' + d + '" fill="none" stroke="' + md.farbe + '" stroke-width="2.6" stroke-linejoin="round"/>';
        s += '<path d="' + d + '" fill="none" stroke="transparent" stroke-width="13" stroke-linejoin="round"/>';
        [a, b].forEach(function (n) { if (n.type === 'pc') s += '<rect x="' + (n.x - 4) + '" y="' + (n.y + n.dir * 18 - 3.5) + '" width="8" height="7" rx="1.5" fill="#fff" stroke="#334155" stroke-width="1.2"/>'; });
        s += '</g>';
      });
      gC.innerHTML = s;
      s = '';
      G.pcs.forEach(function (p) {
        var an = anz[p.id] > 0, sel = ui.quelle === p.id || ui.wahl === p.id;
        s += '<g class="vk-knoten" data-knoten="' + p.id + '" tabindex="0" role="button" aria-label="' + esc(p.name + (an ? ' (angeschlossen)' : ' (nicht angeschlossen)')) + '" transform="translate(' + p.x + ',' + p.y + ')">' +
          '<rect x="-16" y="-15" width="32" height="30" fill="transparent"/>' +
          (sel ? '<circle r="17" fill="none" stroke="#0e7c86" stroke-width="2.5" stroke-dasharray="4 3"/>' : '') +
          '<rect x="-11" y="-9" width="22" height="14" rx="2" fill="#1f2937"/><rect x="-9" y="-7" width="18" height="10" rx="1" fill="' + (an ? '#7dd3fc' : '#cbd5e1') + '"/>' +
          '<rect x="-1.5" y="5" width="3" height="3" fill="#1f2937"/><rect x="-6" y="8" width="12" height="2" rx="1" fill="#1f2937"/></g>';
      });
      st.nodes.forEach(function (n) {
        var t = TYPEN[n.type], sel = ui.quelle === n.id || ui.wahl === n.id;
        s += '<g class="vk-knoten" data-knoten="' + n.id + '" tabindex="0" role="button" aria-label="' + esc(LBL[n.id] + ' (' + t.name + ') in ' + (raumVon(n) || { n: '?' }).n) + '" transform="translate(' + n.x + ',' + n.y + ')">' +
          (sel ? '<circle r="25" fill="#0e7c86" fill-opacity=".12" stroke="#0e7c86" stroke-width="2.5" stroke-dasharray="5 3"/>' : '') +
          '<rect x="-13" y="-17" width="26" height="33" rx="3" fill="' + t.farbe + '" stroke="#0b1220" stroke-opacity=".35"/>' +
          '<g stroke="#fff" stroke-opacity=".55" stroke-width="1.4"><line x1="-8" x2="8" y1="-10" y2="-10"/><line x1="-8" x2="8" y1="-4" y2="-4"/><line x1="-8" x2="8" y1="2" y2="2"/></g>' +
          '<circle cx="6" cy="9" r="1.7" fill="#86efac"/><circle cx="1" cy="9" r="1.7" fill="#86efac"/>' +
          '<text y="31" text-anchor="middle" class="vk-ntext vk-halo">' + esc(LBL[n.id]) + '</text></g>';
      });
      gN.innerHTML = s;
      gR.querySelectorAll('.vk-raum').forEach(function (g) { g.setAttribute('tabindex', ui.modus in TYPEN || ui.modus === 'verschieben' && ui.quelle ? '0' : '-1'); });
      var ang = G.pcs.filter(function (p) { return anz[p.id] > 0; }).length;
      zaehler.innerHTML = 'Arbeitsplätze angeschlossen: <b>' + ang + ' / ' + G.pcs.length + '</b>';
      Object.keys(kn).forEach(function (k) {
        var an = k.indexOf('ansicht-') === 0 ? k === 'ansicht-' + aktAnsicht : (k === ui.modus || (k in MEDIEN && ui.modus === 'kabel' && ui.medium === k) || (k in MEDIEN && ui.modus === 'medium' && ui.medium === k));
        kn[k].setAttribute('aria-pressed', an ? 'true' : 'false');
        kn[k].disabled = !!opt.gesperrt;
      });
      var V = ansichtBox(aktAnsicht);
      svg.setAttribute('viewBox', V.join(' '));
      svg.style.aspectRatio = V[2] + ' / ' + V[3];
    }
    function ansichtBox(v) {
      if (v === 'gelaende') return [0, 20, G.breite, G.hoehe - 20];
      var t = v.split('-'), B = bld(t[0]), F = t[1] ? flr(t[0], t[1]) : null;
      if (!B) return [0, 20, G.breite, G.hoehe - 20];
      if (!F) return [B.x - 46, B.top - 48, B.w + 92, B.bottom - B.top + 70];
      return [B.x - 46, F.y - (F.y === B.top ? 44 : 30), B.w + 92, PH + (F.y === B.top ? 64 : 50)];
    }
    function ansicht(v) { aktAnsicht = v; zeichne(); melde({ typ: 'ansicht', ansicht: v, text: '' }); }

    /* ---- Aktionen ---- */
    function platz(r, ohne) {
      var im = st.nodes.filter(function (n) { return n.room === r.id && n !== ohne; }).length;
      var x = r.ax + r.aw / 2 + (im ? (im % 2 ? 1 : -1) * Math.ceil(im / 2) * 44 : 0), y = r.ay + (r.band === 't' ? 54 : r.ah - 60);
      if (r.pcs && r.band === 'b') y = r.ay + 46;
      return { x: Math.round(x), y: Math.round(y) };
    }
    function setze(typ, b, f, raumName, still) {
      var r = typeof raumName === 'object' ? raumName : raumNamens(b, f, raumName);
      if (!r) return null;
      var p = platz(r);
      var n = { id: 'n' + (st.seq++), seq: st.seq, type: typ, b: r.b, f: r.f, x: p.x, y: p.y, room: r.id };
      st.nodes.push(n); beschriften(); zeichne();
      var art = '', text = TYPEN[typ].name + ' <b>' + LBL[n.id] + '</b> steht in „' + esc(r.n) + '“ (' + RAUMART[r.t] + ').';
      if (typ !== 'ev' && ['server', 'tech'].indexOf(r.t) < 0) { art = 'warn'; text += ' ' + TYPEN[typ].name + ' gehören in einen abschließbaren, klimatisierten Technik- oder Serverraum.'; }
      if (typ === 'ev' && ['server', 'tech', 'storage'].indexOf(r.t) < 0) { art = 'warn'; text += ' Ein Etagenverteiler gehört in einen abschließbaren Technik- oder Nebenraum – nicht dorthin, wo gearbeitet oder unterrichtet wird (Lärm, Abwärme, Zutritt).'; }
      if (!still) melde({ typ: 'gesetzt', knoten: LBL[n.id], art: art, raumArt: r.t, text: text, neutral: TYPEN[typ].name + ' <b>' + LBL[n.id] + '</b> steht in „' + esc(r.n) + '“.' });
      return LBL[n.id];
    }
    function kabelInfo(c) {
      var a = knoten(c.a), b = knoten(c.b), ber = bereich(c), L = laenge(c), md = MEDIEN[c.m];
      var text = '<b>' + esc(nm(a)) + ' – ' + esc(nm(b)) + '</b>: ' + BEREICH[ber] + ', ' + md.kurz + ', ' + fmt(L) + ' m', art = 'ok', grund = '';
      var quer = a.b !== b.b;
      if (ber === 'inv') {
        art = 'bad';
        if (a.type === b.type) grund = 'Verteiler derselben Ebene werden nicht untereinander verbunden – jeder hängt nur an der nächsthöheren Ebene.';
        else if ([a.type, b.type].indexOf('pc') >= 0) grund = 'Ein Arbeitsplatz hängt immer am Etagenverteiler seiner Etage.';
        else grund = 'Hier wird eine Ebene übersprungen: SV → GV → EV, immer zur nächsten Ebene.';
      } else if (ber === 'ter' && (a.b !== b.b || a.f !== b.f)) { art = 'bad'; grund = 'Tertiärkabel bleiben auf ihrer Etage: Der Arbeitsplatz gehört an den EV seiner Etage.'; }
      else if (ber === 'sek' && quer) { art = 'bad'; grund = 'Der Sekundärbereich bleibt im Gebäude: Ein EV gehört an den GV seines eigenen Gebäudes.'; }
      else if (ber === 'prim' && md.art === 'cu' && quer) { art = 'bad'; grund = 'Kupfer zwischen Gebäuden ist unzulässig: Unterschiedliche Erdpotentiale und Blitzeinwirkung gefährden Menschen und Geräte, und die Strecke ist viel zu lang. Zwischen Gebäuden liegt Glasfaser (LWL).'; }
      else if (ber === 'prim' && md.art === 'cu') { art = 'warn'; grund = 'Der Primärbereich wird mit LWL Singlemode ausgeführt.'; }
      else if (ber === 'prim' && c.m === 'om4') { art = 'warn'; grund = 'Multimode reicht hier zwar, Standard im Primärbereich ist aber Singlemode OS2: größte Reichweite und Reserve.'; }
      else if (ber === 'sek' && md.art === 'cu') { art = L > 90 ? 'bad' : 'warn'; grund = L > 90 ? 'Kupfer reicht nur 90 m. Im Steigbereich liegt LWL Multimode.' : 'Bis 90 m erlaubt, üblich ist im Steigbereich aber LWL Multimode (mehr Bandbreite, unempfindlich gegen Störungen).'; }
      else if (ber === 'sek' && c.m === 'os2') { art = 'warn'; grund = 'Singlemode geht, im Gebäude ist Multimode OM4 aber üblich und günstiger.'; }
      else if (ber === 'ter' && md.art === 'lwl') { art = 'bad'; grund = 'Arbeitsplätze werden mit Kupfer (Twisted Pair, RJ45-Dose) angeschlossen, nicht mit LWL.'; }
      else if (ber === 'ter' && c.m === 'cat5') { art = 'warn'; grund = 'Cat.5e ist für neue Installationen veraltet. Cat.7 schafft 10 Gbit/s und ist besser geschirmt.'; }
      if (ber !== 'inv' && L > GRENZE[ber] && art !== 'bad') { art = 'bad'; grund = BEREICH[ber] + ': höchstens ' + GRENZE[ber] + ' m – diese Strecke ist ' + fmt(L) + ' m lang.' + (ber === 'ter' ? ' Stell den EV zentraler oder plane einen zweiten EV.' : ''); }
      return { bereich: ber, medium: c.m, laenge: L, art: art, text: text + (grund ? '. ' + grund : ''), neutral: text };
    }
    function kabel(a, b, m, still) {
      a = finde(a); b = finde(b); m = m || ui.medium;
      if (!a || !b || a === b) return null;
      var da = kabelZwischen(a, b);
      if (da) { if (!still) melde({ typ: 'hinweis', text: 'Diese Verbindung gibt es schon. Zum Entfernen „🗑 Entfernen“ wählen.' }); return null; }
      var c = { id: 'c' + (st.seq++), a: a, b: b, m: m };
      if (knoten(a).type === 'pc' || (knoten(b).type !== 'pc' && TYPEN[knoten(a).type].ebene > TYPEN[knoten(b).type].ebene)) { c.a = b; c.b = a; }
      st.cables.push(c); zeichne();
      var info = kabelInfo(c);
      if (!still) melde({ typ: 'kabel', kabel: c.id, bereich: info.bereich, medium: m, laenge: info.laenge, art: info.art, text: info.text, neutral: info.neutral });
      return info;
    }
    function etage(evName, m, still) {
      var id = finde(evName), e = knoten(id);
      if (!e || e.type !== 'ev') { if (!still) melde({ typ: 'hinweis', text: 'Tippe einen Etagenverteiler an.', art: 'warn' }); return 0; }
      var anz = 0, lang = 0, evsDerEtage = st.nodes.filter(function (x) { return x.type === 'ev' && x.b === e.b && x.f === e.f; });
      G.pcs.forEach(function (p) {
        if (p.b !== e.b || p.f !== e.f) return;
        if (st.cables.some(function (c) { return c.a === p.id || c.b === p.id; })) return;
        // jeder freie Arbeitsplatz an den nächstgelegenen EV seiner Etage
        var best = null;
        evsDerEtage.forEach(function (x) { var L = route(x, p, 0).len; if (!best || L < best.L) best = { e: x, L: L }; });
        var c = { id: 'c' + (st.seq++), a: best.e.id, b: p.id, m: m || 'cat7' };
        st.cables.push(c); anz++; if (laenge(c) > 90) lang++;
      });
      zeichne();
      if (!still) melde({ typ: 'etage', anzahl: anz, zuLang: lang, art: lang ? 'bad' : 'ok',
        text: anz + ' Arbeitsplätze ' + (evsDerEtage.length > 1 ? 'jeweils an den nächsten EV der Etage' : 'an <b>' + LBL[id] + '</b>') + ' angeschlossen (' + MEDIEN[m || 'cat7'].kurz + ').' + (lang ? ' <b>' + lang + ' Strecken sind länger als 90 m</b> (rot): Stell den EV zentraler oder plane einen zweiten EV.' : ''),
        neutral: anz + ' Arbeitsplätze angeschlossen.' });
      return anz;
    }
    function entferne(x, still) {
      var c = st.cables.filter(function (k) { return k.id === x; })[0];
      if (c) { st.cables = st.cables.filter(function (k) { return k !== c; }); }
      else {
        var id = finde(x), n = st.nodes.filter(function (k) { return k.id === id; })[0];
        if (!n) { if (!still) melde({ typ: 'hinweis', text: 'Arbeitsplätze lassen sich nicht entfernen – nur ihre Kabel.', art: 'warn' }); return; }
        st.nodes = st.nodes.filter(function (k) { return k !== n; });
        st.cables = st.cables.filter(function (k) { return k.a !== id && k.b !== id; });
      }
      ui.quelle = null; ui.wahl = null; zeichne();
      if (!still) melde({ typ: 'entfernt', text: 'Entfernt.' });
    }
    function mediumAendern(a, b, m, still) {
      var c = typeof a === 'string' && !b ? st.cables.filter(function (k) { return k.id === a; })[0] : kabelZwischen(finde(a), finde(b));
      if (!c) return null;
      c.m = m || ui.medium; zeichne();
      var info = kabelInfo(c);
      if (!still) melde({ typ: 'medium', kabel: c.id, bereich: info.bereich, medium: c.m, art: info.art, text: info.text, neutral: info.neutral });
      return info;
    }
    function verschiebe(name, b, f, raumName, still) {
      var id = finde(name), n = st.nodes.filter(function (k) { return k.id === id; })[0];
      var r = typeof raumName === 'object' ? raumName : raumNamens(b, f, raumName);
      if (!n || !r) return;
      var typ = n.type, p = platz(r, n), nid = id;
      n.b = r.b; n.f = r.f; n.room = r.id; n.x = p.x; n.y = p.y;
      // Kabel bleiben angeschlossen; passen sie jetzt nicht mehr (andere Etage), zeigt das die Prüfung
      ui.quelle = null; zeichne();
      var art = '', text = TYPEN[typ].name + ' <b>' + LBL[nid] + '</b> steht jetzt in „' + esc(r.n) + '“ (' + RAUMART[r.t] + ').';
      if (typ !== 'ev' && ['server', 'tech'].indexOf(r.t) < 0) art = 'warn';
      if (typ === 'ev' && ['server', 'tech', 'storage'].indexOf(r.t) < 0) art = 'warn';
      if (art) text += ' Der Raum passt noch nicht für einen ' + TYPEN[typ].name + '.';
      if (!still) melde({ typ: 'verschoben', knoten: LBL[nid], raumArt: r.t, art: art, text: text, neutral: TYPEN[typ].name + ' <b>' + LBL[nid] + '</b> steht jetzt in „' + esc(r.n) + '“.' });
      return LBL[nid];
    }

    /* ---- Bedienung ---- */
    function werkzeug(w) {
      ui.quelle = null; ui.wahl = null;
      if (w in TYPEN) { ui.modus = w; melde({ typ: 'werkzeug', text: 'Tippe einen Raum an, um dort den ' + TYPEN[w].name + ' aufzustellen.' }); }
      else if (w in MEDIEN) {
        if (ui.modus === 'medium') { ui.medium = w; melde({ typ: 'werkzeug', text: 'Tippe ein Kabel an: Es bekommt das Medium ' + MEDIEN[w].kurz + '.' }); }
        else { ui.modus = 'kabel'; ui.medium = w; melde({ typ: 'werkzeug', text: MEDIEN[w].name + ': Tippe nacheinander die beiden Enden an (Verteiler oder Arbeitsplatz).' }); }
      } else if (w === 'etage') { ui.modus = 'etage'; melde({ typ: 'werkzeug', text: 'Tippe einen Etagenverteiler an: Alle freien Arbeitsplätze seiner Etage werden mit Cat.7 an den nächsten EV der Etage angeschlossen.' }); }
      else if (w === 'medium') { ui.modus = 'medium'; melde({ typ: 'werkzeug', text: 'Wähle oben das Medium (z. B. LWL OM4) und tippe dann ein Kabel an.' }); }
      else if (w === 'verschieben') { ui.modus = 'verschieben'; melde({ typ: 'werkzeug', text: 'Tippe einen Verteiler an und dann den Raum, in den er umziehen soll.' }); }
      else if (w === 'entfernen') { ui.modus = 'entfernen'; melde({ typ: 'werkzeug', text: 'Tippe einen Verteiler oder ein Kabel an, um es zu entfernen.' }); }
      zeichne();
    }
    function tippeKnoten(id) {
      var n = knoten(id);
      if (ui.modus === 'kabel') {
        if (!ui.quelle) { ui.quelle = id; zeichne(); setzeMeldung('Jetzt das andere Ende antippen.', ''); return; }
        if (ui.quelle === id) { ui.quelle = null; zeichne(); return; }
        var q = ui.quelle; ui.quelle = null; kabel(q, id); return;
      }
      if (ui.modus === 'etage') { etage(id); return; }
      if (ui.modus === 'entfernen') { entferne(id); return; }
      if (ui.modus === 'verschieben') {
        if (n.type === 'pc') { melde({ typ: 'hinweis', text: 'Arbeitsplätze stehen fest. Verschieben lassen sich nur Verteiler.', art: 'warn' }); return; }
        ui.quelle = id; zeichne(); setzeMeldung('Jetzt den Zielraum antippen.', ''); return;
      }
      if (ui.modus in TYPEN) { var r = raumVon(n); if (r) tippeRaum(r.id); return; }
      // Ansehen: Infos zum Gerät
      ui.wahl = id; zeichne();
      var kab = st.cables.filter(function (c) { return c.a === id || c.b === id; });
      setzeMeldung('<b>' + esc(nm(n)) + '</b> · ' + (raumVon(n) || { n: '–' }).n + ', ' + bld(n.b).name + ' ' + flr(n.b, n.f).kurz + ' · ' + kab.length + ' Kabel', '');
    }
    function tippeKabel(id) {
      if (ui.modus === 'entfernen') { entferne(id); return; }
      if (ui.modus === 'medium') { mediumAendern(id, null, ui.medium); return; }
      var c = st.cables.filter(function (k) { return k.id === id; })[0]; if (!c) return;
      ui.wahl = id; zeichne();
      var info = kabelInfo(c);
      setzeMeldung(opt.stumm ? info.neutral : info.text, opt.stumm || info.art === 'ok' ? '' : info.art);
    }
    function tippeRaum(rid, x, y) {
      var r = G.raeume.filter(function (k) { return k.id === rid; })[0];
      if (ui.modus in TYPEN) {
        if (r.t === 'stairs' || r.t === 'wc') { melde({ typ: 'fehler', art: 'bad', text: 'In „' + esc(r.n) + '“ ist kein Platz für einen Verteilerschrank.', neutral: 'In „' + esc(r.n) + '“ ist kein Platz für einen Verteilerschrank.' }); return; }
        setze(ui.modus, r.b, r.f, r); return;
      }
      if (ui.modus === 'verschieben' && ui.quelle) {
        if (r.t === 'stairs' || r.t === 'wc') { melde({ typ: 'fehler', art: 'bad', text: 'In „' + esc(r.n) + '“ ist kein Platz für einen Verteilerschrank.', neutral: 'Kein Platz in „' + esc(r.n) + '“.' }); return; }
        verschiebe(ui.quelle, r.b, r.f, r); return;
      }
    }
    function svgPunkt(e) { var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; var m = svg.getScreenCTM(); return m ? p.matrixTransform(m.inverse()) : { x: 0, y: 0 }; }
    function bedien(t, e) {
      if (opt.gesperrt) return;
      var k = t.closest && t.closest('[data-knoten]'), c = t.closest && t.closest('[data-kabel]'), r = t.closest && t.closest('[data-raum]');
      if (k && !(ui.modus in TYPEN)) { tippeKnoten(k.getAttribute('data-knoten')); return; }
      if (c && !(ui.modus in TYPEN)) { tippeKabel(c.getAttribute('data-kabel')); return; }
      if (ui.modus in TYPEN || (ui.modus === 'verschieben' && ui.quelle)) {
        if (r) { tippeRaum(r.getAttribute('data-raum')); return; }
        if (e) {
          var p = svgPunkt(e), o = ort(p.x, p.y);
          if (o.zone === 'raum') { tippeRaum(o.raum.id); return; }
          var t2 = { flur: 'Verteilerschränke gehören nicht in den Flur – er ist Fluchtweg und muss frei bleiben.', schacht: 'Im Steigschacht ist kein Platz für einen Verteilerschrank.', draussen: 'Bitte innerhalb eines Gebäudes platzieren.', keiner: 'Bitte in einen Raum tippen.' }[o.zone];
          melde({ typ: 'fehler', art: 'bad', text: t2, neutral: t2 });
        }
      }
    }
    svg.addEventListener('click', function (e) { bedien(e.target, e); });
    svg.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault(); bedien(e.target, null);
    });

    /* ---- Prüfung (wie Version 1, nach Lernzielen gegliedert) ---- */
    function analyse() {
      beschriften();
      var issues = [];
      function add(lz, pp, msg) { issues.push({ lz: lz, pp: pp, msg: msg }); }
      var info = st.cables.map(function (c) { return { c: c, a: knoten(c.a), b: knoten(c.b), ber: bereich(c), len: laenge(c) }; });
      function kabVon(id) { return info.filter(function (x) { return x.c.a === id || x.c.b === id; }); }
      function anderes(x, id) { return x.c.a === id ? x.b : x.a; }
      var svs = st.nodes.filter(function (n) { return n.type === 'sv'; }), gvs = st.nodes.filter(function (n) { return n.type === 'gv'; }), evs = st.nodes.filter(function (n) { return n.type === 'ev'; });
      var mehrere = G.gebaeude.length > 1;
      // LZ4: vollständig und als Stern
      if (mehrere && svs.length !== 1) add('LZ4', 'vollstaendig', svs.length ? 'Es gibt ' + svs.length + ' Standortverteiler – pro Standort genau einer.' : 'Es fehlt der Standortverteiler (SV).');
      G.gebaeude.forEach(function (B) {
        var g = gvs.filter(function (n) { return n.b === B.id; });
        if (g.length !== 1) add('LZ4', 'vollstaendig', B.name + (g.length ? ' hat ' + g.length + ' Gebäudeverteiler – pro Gebäude genau einer.' : ' hat keinen Gebäudeverteiler (GV).'));
        B.etagen.forEach(function (F) {
          if (G.pcs.some(function (p) { return p.b === B.id && p.f === F.id; }) && !evs.some(function (e) { return e.b === B.id && e.f === F.id; }))
            add('LZ4', 'vollstaendig', B.name + ', ' + F.name + ': kein Etagenverteiler.');
        });
      });
      var frei = G.pcs.filter(function (p) { return !kabVon(p.id).length; });
      if (frei.length) add('LZ4', 'vollstaendig', frei.length + ' Arbeitsplätze sind nicht angeschlossen.');
      if (mehrere) gvs.forEach(function (g) { var up = kabVon(g.id).filter(function (x) { return x.ber === 'prim'; }); if (up.length !== 1) add('LZ4', 'stern', LBL[g.id] + (up.length ? ' hat ' + up.length + ' Verbindungen zum SV – im Stern genau eine.' : ' ist nicht an den SV angebunden.')); });
      evs.forEach(function (e) { var up = kabVon(e.id).filter(function (x) { return x.ber === 'sek'; }); if (up.length !== 1) add('LZ4', 'stern', LBL[e.id] + (up.length ? ' hat ' + up.length + ' Verbindungen zu Gebäudeverteilern – im Stern genau eine.' : ' ist nicht an einen Gebäudeverteiler angebunden.')); });
      G.pcs.forEach(function (p) { if (kabVon(p.id).length > 1) add('LZ4', 'stern', p.name + ' hat mehrere Kabel – jeder Arbeitsplatz hat genau eine Verbindung zu seinem EV.'); });
      info.filter(function (x) { return x.ber === 'inv' && x.a.type === x.b.type; }).forEach(function (x) { add('LZ4', 'stern', 'Querverbindung ' + nm(x.a) + ' – ' + nm(x.b) + ': Verteiler derselben Ebene werden nicht verbunden.'); });
      // LZ1: Bereiche richtig zugeordnet
      info.filter(function (x) { return x.ber === 'inv' && x.a.type !== x.b.type; }).forEach(function (x) { add('LZ1', 'ebene', nm(x.a) + ' – ' + nm(x.b) + ': Hier wird eine Ebene übersprungen.'); });
      info.filter(function (x) { return x.ber === 'ter' && (x.a.b !== x.b.b || x.a.f !== x.b.f); }).forEach(function (x) { add('LZ1', 'ort', nm(x.b) + ' hängt an einem EV einer anderen Etage.'); });
      info.filter(function (x) { return x.ber === 'sek' && x.a.b !== x.b.b; }).forEach(function (x) { add('LZ1', 'ort', nm(x.b) + ' hängt am GV des anderen Gebäudes.'); });
      // LZ2: Medien
      info.forEach(function (x) {
        var md = MEDIEN[x.c.m];
        if (x.ber === 'prim' && x.c.m !== 'os2') add('LZ2', 'medium-primaer', nm(x.a) + ' – ' + nm(x.b) + ': Im Primärbereich LWL Singlemode (OS2), nicht ' + md.kurz + '.');
        if (x.ber === 'sek' && md.art !== 'lwl') add('LZ2', 'medium-innen', nm(x.a) + ' – ' + nm(x.b) + ': Im Steigbereich LWL Multimode, nicht ' + md.kurz + '.');
        if (x.ber === 'ter' && x.c.m !== 'cat7') add('LZ2', 'medium-innen', nm(x.b) + ': Arbeitsplätze mit Cat.7 anschließen, nicht ' + md.kurz + '.');
      });
      // LZ3: Längen
      info.forEach(function (x) {
        if (x.ber !== 'inv' && x.len > GRENZE[x.ber]) add('LZ3', x.ber === 'ter' ? 'laenge-ter' : 'laenge-backbone', BEREICH[x.ber] + ' ' + nm(x.a) + ' – ' + nm(x.b) + ': ' + fmt(x.len) + ' m (höchstens ' + GRENZE[x.ber] + ' m).');
      });
      // LZ5: Standorte
      st.nodes.forEach(function (n) {
        var r = raumVon(n), t = r ? r.t : 'none';
        if (n.type !== 'ev' && ['server', 'tech'].indexOf(t) < 0) add('LZ5', 'standort-zentral', LBL[n.id] + ' steht in „' + (r ? r.n : '?') + '“ – gehört in einen Technik- oder Serverraum.');
        if (n.type === 'ev' && ['server', 'tech', 'storage'].indexOf(t) < 0) add('LZ5', 'standort-ev', LBL[n.id] + ' steht in „' + (r ? r.n : '?') + '“ – gehört in einen Technik- oder Nebenraum.');
      });
      var anteil = (G.pcs.length - frei.length) / G.pcs.length;
      return { issues: issues, frei: frei.length, anteil: anteil,
        ok: function (pp) { return !issues.some(function (i) { return i.pp === pp; }); },
        lz: function (lz) { return issues.filter(function (i) { return i.lz === lz; }); } };
    }
    function stand() {
      beschriften();
      return {
        knoten: st.nodes.map(function (n) { var r = raumVon(n); return { name: LBL[n.id], typ: n.type, b: n.b, f: n.f, raum: r ? r.n : '', raumArt: r ? r.t : '' }; }),
        kabel: st.cables.map(function (c) { var a = knoten(c.a), b = knoten(c.b); return { a: nm(a), b: nm(b), aTyp: a.type, bTyp: b.type, aOrt: etagenName(a), bOrt: etagenName(b), bereich: bereich(c), medium: c.m, laenge: laenge(c), zuLang: zuLang(c) }; }),
        pcs: function (b, f) { var ps = G.pcs.filter(function (p) { return (!b || p.b === b) && (!f || p.f === f); }); return { gesamt: ps.length, angeschlossen: ps.filter(function (p) { return st.cables.some(function (c) { return c.a === p.id || c.b === p.id; }); }).length }; },
        ansicht: aktAnsicht
      };
    }
    function lade(spec) {
      st = { nodes: [], cables: [], seq: 1 };
      (spec && spec.knoten || []).forEach(function (k) { setze(k[0], k[1], k[2], k[3], true); });
      (spec && spec.kabel || []).forEach(function (k) {
        if (k[0] === 'etage') etage(k[1], k[2], true);
        else kabel(k[0], k[1], k[2], true);
      });
      zeichne();
    }

    zeichneStatisch();
    lade(opt.start);
    setzeMeldung(opt.hinweis || 'Wähle oben ein Werkzeug.', '');

    return {
      el: root, setze: function (t, b, f, r) { return setze(t, b, f, r); }, kabel: function (a, b, m) { return kabel(a, b, m); },
      etage: function (e, m) { return etage(e, m); }, entferne: function (x) { entferne(x); }, medium: function (a, b, m) { return mediumAendern(a, b, m); },
      verschiebe: function (n, b, f, r) { return verschiebe(n, b, f, r); }, ansicht: ansicht, werkzeug: werkzeug, stand: stand, analyse: analyse, lade: lade,
      kabelId: function (a, b) { var c = kabelZwischen(finde(a), finde(b)); return c ? c.id : null; },
      hervorheben: function (ber) { ui.hervor = ber || null; zeichne(); },
      sperre: function (b) { opt.gesperrt = !!b; zeichne(); },
      gelaende: G
    };
  }

  /* ---- Stil ---- */
  (function () {
    var css =
      '.vk{display:flex;flex-direction:column;gap:6px}' +
      '.vk-leiste{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center}' +
      '.vk-gruppe{display:flex;flex-wrap:wrap;gap:4px;align-items:center}' +
      '.vk-gtitel{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-right:2px}' +
      '.vk-leiste button{min-height:36px;padding:4px 9px;font-size:.88rem;display:inline-flex;align-items:center;gap:5px}' +
      '.vk-leiste button[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:#fff}' +
      '.vk-farbe{width:12px;height:16px;border-radius:3px;display:inline-block}' +
      '.vk-strich{width:16px;height:5px;border-radius:3px;display:inline-block}' +
      '.vk-zeile{display:flex;gap:10px;align-items:baseline;justify-content:space-between;font-size:.86rem;min-height:2.5em}' +
      '.vk-meldung{flex:1}.vk-meldung.vk-bad{color:var(--bad)}.vk-meldung.vk-warn{color:var(--warn)}' +
      '.vk-zaehler{white-space:nowrap;color:var(--muted)}' +
      '.vk-svg{width:100%;height:auto;display:block;background:#eef1e6;border:1px solid var(--line);border-radius:12px;touch-action:manipulation}' +
      '.vk-rlabel{font-size:13px;font-weight:600;fill:#4a5568;pointer-events:none}.vk-rlabel.vk-tech{fill:#0f6b5a}.vk-rlabel.vk-server{fill:#1d4f91}' +
      '.vk-halo{paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-linejoin:round}' +
      '.vk-ntext{font-size:13px;font-weight:800;fill:var(--ink);pointer-events:none}' +
      '.vk-knoten,.vk-kabel,.vk-raum{cursor:pointer;outline:none}' +
      '.vk-raum:hover rect,.vk-raum:focus-visible rect{stroke:#0e7c86;stroke-width:3}' +
      '.vk-knoten:focus-visible>rect:first-of-type{stroke:var(--ink);stroke-width:3}' +
      '.vk-kabel .vk-hl{opacity:0}.vk-kabel:hover .vk-hl,.vk-kabel:focus-visible .vk-hl{opacity:.25}.vk-kabel.vk-gewaehlt .vk-hl{opacity:.4}';
    var s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
  })();

  return { plan: plan, CAMPUS: CAMPUS, HALLE: HALLE, AUTOHAUS: AUTOHAUS, HOTEL: HOTEL, MEDIEN: MEDIEN, TYPEN: TYPEN, BEREICH: BEREICH, GRENZE: GRENZE };
})();

/* ---------- quelle/paket.js ---------- */
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

/* ---------- quelle/fragen.md (erzeugt) ---------- */
(function (P, F) { P.fragen = (P.fragen || []).concat(F); })(window.PAKET, [
  {"id": "V1", "lz": "LZ1", "einsatz": ["vorab"], "typ": "zuordnen", "frage": "Welche Verbindung gehört zu welchem Bereich?", "paare": [{"links": "Standortverteiler ↔ Gebäudeverteiler", "rechts": "Primärbereich"}, {"links": "Gebäudeverteiler ↔ Etagenverteiler", "rechts": "Sekundärbereich"}, {"links": "Etagenverteiler ↔ Anschlussdose am Arbeitsplatz", "rechts": "Tertiärbereich"}], "feedbackFalsch": "Die Bereiche zählen von außen nach innen: erst zwischen den Gebäuden, dann im Gebäude, dann auf der Etage.", "erklaerung": "Primär verbindet die Gebäude (SV – GV), sekundär die Etagen (GV – EV), tertiär die Arbeitsplätze (EV – Dose)."},
  {"id": "V2", "lz": "LZ2", "einsatz": ["vorab"], "typ": "zuordnen", "frage": "Welches Medium ist in welchem Bereich üblich?", "paare": [{"links": "Primärbereich", "rechts": "LWL Singlemode (OS2)"}, {"links": "Sekundärbereich", "rechts": "LWL Multimode (OM4)"}, {"links": "Tertiärbereich", "rechts": "Kupfer Cat.7"}], "feedbackFalsch": "Je länger die Strecke, desto eher Glasfaser – und für die längsten Strecken Singlemode.", "erklaerung": "Zwischen Gebäuden Singlemode (größte Reichweite), im Gebäude Multimode, am Arbeitsplatz Kupfer mit RJ45-Dose."},
  {"id": "V3", "lz": "LZ3", "einsatz": ["vorab"], "typ": "zahl", "frage": "Wie viele Meter darf das fest verlegte Kabel vom Etagenverteiler bis zur Anschlussdose höchstens lang sein?", "zahl": {"wert": 90, "einheit": "m"}, "typisch": [{"wert": 100, "feedback": "100 m ist der ganze Channel, also mit Patch- und Geräteschnüren. Das fest verlegte Kabel darf nur 90 m lang sein."}, {"wert": 500, "feedback": "500 m gelten im Sekundärbereich (GV – EV), nicht am Arbeitsplatz."}], "erklaerung": "Permanent Link höchstens 90 m, dazu höchstens 10 m Schnüre: zusammen 100 m."},
  {"id": "V4", "lz": "LZ2", "einsatz": ["vorab"], "typ": "mc", "frage": "Warum verbindet man zwei Gebäude mit Glasfaser statt mit Kupfer?", "optionen": [{"text": "Glasfaser leitet keinen Strom: keine Ausgleichsströme zwischen den Gebäuden, keine Blitzschäden.", "richtig": true}, {"text": "Glasfaser überbrückt große Entfernungen.", "richtig": true}, {"text": "Glasfaser ist billiger als Kupfer.", "feedback": "Glasfaser und die Technik dazu sind meist teurer. Gewählt wird sie wegen Sicherheit und Reichweite."}, {"text": "Kupferkabel dürfen nicht in die Erde.", "feedback": "Es gibt Erdkabel aus Kupfer. Das Problem sind die unterschiedlichen Erdpotentiale der Gebäude."}], "erklaerung": "Jedes Gebäude hat sein eigenes Erdpotential. Ein Kupferkabel dazwischen leitet Ausgleichsströme und bei Gewitter Überspannung weiter. Glasfaser trennt galvanisch und reicht weit."},
  {"id": "C1", "lz": "LZ1", "einsatz": ["check"], "typ": "mc", "frage": "Ein Kabel führt vom Etagenverteiler im 1. OG zur Dose im EDV-Raum 201. Zu welchem Bereich gehört es?", "optionen": [{"text": "Tertiärbereich", "richtig": true}, {"text": "Sekundärbereich", "feedback": "Der Sekundärbereich verbindet den Gebäudeverteiler mit den Etagenverteilern."}, {"text": "Primärbereich", "feedback": "Der Primärbereich verbindet den Standortverteiler mit den Gebäudeverteilern."}], "erklaerung": "Vom Etagenverteiler bis zur Anschlussdose reicht der Tertiärbereich."},
  {"id": "C2", "lz": "LZ2", "einsatz": ["check"], "typ": "mc", "frage": "Warum wird ein neuer Arbeitsplatz mit Cat.7 und nicht mit Cat.5e angeschlossen?", "optionen": [{"text": "Cat.7 ist besser geschirmt und schafft 10 Gbit/s; die Verkabelung soll viele Jahre halten.", "richtig": true}, {"text": "Cat.5e darf nur im Primärbereich liegen.", "feedback": "Im Primärbereich liegt Glasfaser, kein Kupfer."}, {"text": "Cat.7 darf länger als 90 m sein.", "feedback": "Die Grenze von 90 m gilt für jedes Kupferkabel im Tertiärbereich."}, {"text": "Cat.5e passt nicht in RJ45-Dosen.", "feedback": "Auch Cat.5e wird mit RJ45 angeschlossen."}], "erklaerung": "Die Verkabelung wird einmal verlegt und hält 15 Jahre und mehr. Deshalb nimmt man die Kategorie mit Reserve: Cat.7, geschirmt, 10 Gbit/s."},
  {"id": "C3", "lz": "LZ1", "einsatz": ["check"], "typ": "mc", "frage": "Welche Verbindung gehört zum <b>Sekundärbereich<\/b>?", "optionen": [{"text": "Gebäudeverteiler ↔ Etagenverteiler", "richtig": true}, {"text": "Standortverteiler ↔ Gebäudeverteiler", "feedback": "Das ist der Primärbereich."}, {"text": "Etagenverteiler ↔ Anschlussdose", "feedback": "Das ist der Tertiärbereich."}, {"text": "Anschlussdose ↔ PC", "feedback": "Das ist das Patchkabel am Arbeitsplatz, es gehört zu keinem der drei Bereiche."}], "erklaerung": "Der Sekundärbereich (Steigbereich) verbindet den Gebäudeverteiler mit den Etagenverteilern innerhalb eines Gebäudes."},
  {"id": "C4", "lz": "LZ4", "einsatz": ["check"], "typ": "mc", "frage": "Wie viele Gebäudeverteiler hat ein Gebäude?", "optionen": [{"text": "Genau einen – er darf im selben Raum wie der SV oder ein EV stehen.", "richtig": true}, {"text": "Einen pro Etage", "feedback": "Pro Etage gibt es Etagenverteiler; der GV verbindet sie."}, {"text": "Beliebig viele", "feedback": "Dann gäbe es mehrere Wege – das ist kein hierarchischer Stern mehr."}, {"text": "Keinen, wenn dort der SV steht", "feedback": "SV und GV sind getrennte Ebenen, auch wenn sie im selben Raum stehen."}], "erklaerung": "Jedes Gebäude hat genau einen GV. Er kann räumlich mit SV oder EV zusammenstehen, bleibt aber eine eigene Ebene."},
  {"id": "C5", "lz": "LZ3", "einsatz": ["check"], "typ": "mc", "frage": "Eine Etage ist 120 m lang, der Technikraum liegt an einem Ende. Was ist richtig?", "optionen": [{"text": "Ein zusätzlicher EV wird eingeplant oder der EV zentraler aufgestellt, sodass alle Strecken höchstens 90 m lang sind.", "richtig": true}, {"text": "Ein EV im Technikraum reicht immer.", "feedback": "Vom Ende einer 120-m-Etage werden einige Strecken länger als 90 m."}, {"text": "Man nimmt Cat.5e, weil es längere Strecken erlaubt.", "feedback": "Für alle Kupferkategorien gilt dieselbe Grenze von 90 m."}, {"text": "Man hängt einen Repeater in den Flur.", "feedback": "Aktive Geräte im Flur sind nicht vorgesehen; der Flur muss frei bleiben."}], "erklaerung": "Auf einer Etage dürfen mehrere EVs stehen. Entscheidend ist, dass jede Dose innerhalb von 90 m erreichbar ist."},
  {"id": "C6", "lz": "LZ5", "einsatz": ["check"], "typ": "mc", "frage": "Wo darf ein Verteilerschrank <b>nicht<\/b> stehen?", "optionen": [{"text": "Im Flur", "richtig": true}, {"text": "Im Technikraum", "feedback": "Das ist der richtige Ort: abschließbar und belüftet."}, {"text": "Im Serverraum", "feedback": "Auch gut: abgeschlossen und gekühlt."}, {"text": "In einem abschließbaren Nebenraum", "feedback": "Für Etagenverteiler zulässig."}], "erklaerung": "Flure sind Fluchtwege und müssen frei bleiben; außerdem fehlt dort der Zutrittsschutz."},
  {"id": "W1", "lz": "LZ1", "einsatz": ["check"], "typ": "mc", "frage": "Zurück zu Haus A: Wo endet das Tertiärkabel eines PCs im 1. OG?", "optionen": [{"text": "Am Etagenverteiler des 1. OG", "richtig": true}, {"text": "Am Gebäudeverteiler im EG", "feedback": "Dann würde der Etagenverteiler übersprungen."}, {"text": "Am Etagenverteiler im EG", "feedback": "Tertiärkabel bleiben auf ihrer Etage."}, {"text": "Direkt am Standortverteiler", "feedback": "Dann würden zwei Ebenen übersprungen."}], "erklaerung": "Die Tertiärverkabelung bleibt auf der Etage – jedes Endgerät hängt am EV seiner Etage."},
  {"id": "C7", "lz": "LZ2", "einsatz": ["check"], "typ": "mc", "frage": "Welches Medium ist im <b>Primärbereich<\/b> Standard?", "optionen": [{"text": "LWL Singlemode OS2", "richtig": true}, {"text": "LWL Multimode OM4", "feedback": "Multimode ist im Gebäude üblich. Für die langen Strecken zwischen Gebäuden nimmt man Singlemode."}, {"text": "Cat.7 S/FTP", "feedback": "Kupfer zwischen Gebäuden ist wegen der Erdpotentiale gefährlich und reicht nur 90 m."}, {"text": "Koaxialkabel", "feedback": "Koaxialkabel kommt in der strukturierten Verkabelung nicht vor."}], "erklaerung": "Singlemode-Fasern (OS2) bieten die größte Reichweite und Bandbreitenreserve."},
  {"id": "C8", "lz": "LZ3", "einsatz": ["check"], "typ": "zahl", "frage": "Wie lang darf eine Strecke im <b>Primärbereich<\/b> höchstens sein?", "zahl": {"wert": 1500, "einheit": "m"}, "typisch": [{"wert": 500, "feedback": "500 m gelten im Sekundärbereich."}, {"wert": 90, "feedback": "90 m gelten im Tertiärbereich."}], "erklaerung": "Primärbereich höchstens 1500 m, Sekundärbereich 500 m, Tertiärbereich 90 m."},
  {"id": "W2", "lz": "LZ4", "einsatz": ["check"], "typ": "mc", "frage": "Welche Topologie schreibt die strukturierte Verkabelung vor?", "optionen": [{"text": "Hierarchischer Stern (Baum)", "richtig": true}, {"text": "Ring", "feedback": "Ein Ring fällt bei einer Unterbrechung ganz aus."}, {"text": "Bus", "feedback": "Ein gemeinsames Kabel für alle ist veraltet und störanfällig."}, {"text": "Vollvermascht", "feedback": "Viel zu viele Kabel; jeder Verteiler hängt nur an einem darüber."}], "erklaerung": "SV → GV → EV → Anschlussdose bilden einen hierarchischen Stern."},
  {"id": "P1", "lz": "LZ1", "einsatz": ["selbstueberpruefung"], "typ": "zuordnen", "frage": "Ordne jede Strecke im Autohaus dem Bereich zu.", "paare": [{"links": "Serverraum Verkaufshaus (SV) → Technikraum Werkstatthalle (GV)", "rechts": "Primärbereich"}, {"links": "GV Verkaufshaus → EV im 1. OG", "rechts": "Sekundärbereich"}, {"links": "EV im 1. OG → Dose im Büro des Chefs", "rechts": "Tertiärbereich"}], "feedbackFalsch": "Achte auf die Schränke an beiden Enden: SV, GV, EV oder Dose?", "erklaerung": "Entscheidend sind die Ebenen an den Enden: SV – GV primär, GV – EV sekundär, EV – Dose tertiär."},
  {"id": "P2", "lz": "LZ1", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "Der Standortverteiler steht im selben Raum wie der Gebäudeverteiler von Haus A. Zu welchem Bereich gehört das kurze Kabel zwischen beiden?", "optionen": [{"text": "Primärbereich", "richtig": true}, {"text": "Zu keinem, weil beide im selben Raum stehen", "feedback": "Der Bereich hängt von den Ebenen ab, nicht von der Entfernung."}, {"text": "Sekundärbereich", "feedback": "Sekundär ist GV – EV."}], "erklaerung": "SV – GV ist immer Primärbereich, auch wenn beide Schränke nebeneinanderstehen."},
  {"id": "P3", "lz": "LZ1", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "Ein PC ist direkt an den Gebäudeverteiler angeschlossen. Was ist falsch?", "optionen": [{"text": "Der Etagenverteiler wird übersprungen – der PC gehört an den EV seiner Etage.", "richtig": true}, {"text": "Nichts, kürzer ist besser.", "feedback": "Die Ebenen dürfen nicht übersprungen werden, auch wenn der Weg kürzer wäre."}, {"text": "Das Kabel muss Glasfaser sein.", "feedback": "Das Problem ist nicht das Medium, sondern die übersprungene Ebene."}], "erklaerung": "Jeder Arbeitsplatz hängt am EV seiner Etage; der GV verbindet nur Etagenverteiler."},
  {"id": "P4", "lz": "LZ1", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "Welcher Bereich verbindet <b>verschiedene Gebäude<\/b> eines Standorts?", "optionen": [{"text": "Primärbereich", "richtig": true}, {"text": "Sekundärbereich", "feedback": "Der Sekundärbereich bleibt innerhalb eines Gebäudes."}, {"text": "Tertiärbereich", "feedback": "Der Tertiärbereich bleibt auf einer Etage."}], "erklaerung": "Der Primärbereich (Campusverkabelung) verbindet den Standortverteiler mit den Gebäudeverteilern."},
  {"id": "P5", "lz": "LZ2", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "Warum werden Gebäude untereinander mit Lichtwellenleitern verbunden?", "optionen": [{"text": "LWL trennt galvanisch (keine Ausgleichsströme, Schutz vor Überspannung) und überbrückt große Distanzen.", "richtig": true}, {"text": "LWL ist billiger als Kupfer.", "feedback": "Meist ist es teurer; gewählt wird es wegen Sicherheit und Reichweite."}, {"text": "Kupferkabel dürfen grundsätzlich nicht im Erdreich verlegt werden.", "feedback": "Das stimmt nicht; das Problem sind die Erdpotentiale."}, {"text": "LWL lässt sich leichter selbst konfektionieren.", "feedback": "Im Gegenteil: Glasfaser braucht Spezialwerkzeug."}], "erklaerung": "Unterschiedliche Erdpotentiale der Gebäude und Blitzeinwirkung machen Kupfer gefährlich; LWL leitet keinen Strom und reicht weit."},
  {"id": "P6", "lz": "LZ2", "einsatz": ["selbstueberpruefung"], "typ": "zuordnen", "frage": "Ordne jedem Bereich das übliche Medium zu.", "paare": [{"links": "Primärbereich", "rechts": "LWL Singlemode (OS2)"}, {"links": "Sekundärbereich", "rechts": "LWL Multimode (OM4)"}, {"links": "Tertiärbereich", "rechts": "Kupfer Cat.7"}], "feedbackFalsch": "Je länger die Strecke, desto eher Glasfaser – Singlemode für die längsten.", "erklaerung": "Zwischen Gebäuden Singlemode, im Gebäude Multimode, am Arbeitsplatz Kupfer."},
  {"id": "P7", "lz": "LZ2", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "Warum führt man Glasfaser normalerweise nicht bis zum Arbeitsplatz?", "optionen": [{"text": "PCs haben Kupferanschlüsse (RJ45); auf 90 m schafft Cat.7 ohnehin 10 Gbit/s.", "richtig": true}, {"text": "Glasfaser darf nicht in Büroräume.", "feedback": "Das ist nicht verboten, nur unüblich und teuer."}, {"text": "Glasfaser ist zu langsam für Arbeitsplätze.", "feedback": "Glasfaser ist schneller; sie wird nur nicht gebraucht."}], "erklaerung": "Kupfer passt zu den Anschlüssen der Geräte und reicht auf kurzer Strecke völlig aus."},
  {"id": "P8", "lz": "LZ2", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "Ein Steigbereich (GV → EV) von 40 m wurde mit Cat.7 verlegt. Wie ist das zu bewerten?", "optionen": [{"text": "Bis 90 m erlaubt, üblich und besser ist aber LWL Multimode.", "richtig": true}, {"text": "Verboten, im Gebäude muss immer Glasfaser liegen.", "feedback": "Kupfer bis 90 m ist zulässig, nur nicht empfohlen."}, {"text": "Optimal, weil Kupfer im Gebäude Standard ist.", "feedback": "Im Steigbereich ist LWL Multimode Standard: mehr Bandbreite, unempfindlich gegen Störungen."}], "erklaerung": "Kupfer ist bis 90 m zulässig, im Steigbereich wird aber LWL Multimode empfohlen."},
  {"id": "P9", "lz": "LZ3", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "Wie lang darf das fest verlegte Kabel im Tertiärbereich (Permanent Link) höchstens sein?", "optionen": [{"text": "90 m", "richtig": true}, {"text": "50 m", "feedback": "So kurz muss es nicht sein."}, {"text": "100 m", "feedback": "100 m ist der Channel inklusive Patch- und Geräteschnüren."}, {"text": "500 m", "feedback": "500 m gelten im Sekundärbereich."}], "erklaerung": "90 m Permanent Link + höchstens 10 m Patch- und Geräteschnüre ergeben den 100-m-Channel."},
  {"id": "P10", "lz": "LZ3", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "Wie lang darf eine Strecke im Sekundärbereich höchstens sein?", "optionen": [{"text": "500 m", "richtig": true}, {"text": "90 m", "feedback": "90 m gelten im Tertiärbereich (und für Kupfer)."}, {"text": "300 m", "feedback": "Das ist kein Grenzwert der Norm."}, {"text": "1500 m", "feedback": "1500 m gelten im Primärbereich."}], "erklaerung": "Sekundärbereich höchstens 500 m; Primärbereich höchstens 1500 m."},
  {"id": "P11", "lz": "LZ3", "einsatz": ["selbstueberpruefung"], "typ": "zahl", "frage": "Wie viele Meter Patch- und Geräteschnüre dürfen zum Permanent Link höchstens dazukommen?", "zahl": {"wert": 10, "einheit": "m"}, "typisch": [{"wert": 100, "feedback": "100 m ist der ganze Channel."}, {"wert": 90, "feedback": "90 m ist der Permanent Link selbst."}], "erklaerung": "Channel 100 m = Permanent Link 90 m + Schnüre 10 m."},
  {"id": "P12", "lz": "LZ3", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "Im Werkstattgebäude ist das längste Kabel vom EV zu einer Dose 104 m lang. Was tust du?", "optionen": [{"text": "Den EV zentraler aufstellen oder einen zweiten EV einplanen.", "richtig": true}, {"text": "Ein längeres Patchkabel nehmen.", "feedback": "Damit wird die Strecke noch länger."}, {"text": "Cat.5e statt Cat.7 verlegen.", "feedback": "Die Grenze von 90 m gilt für jede Kupferkategorie."}, {"text": "Nichts, 104 m ist noch im Rahmen.", "feedback": "Der Permanent Link darf höchstens 90 m lang sein."}], "erklaerung": "Zu lange Tertiärstrecken löst man über den Standort der Verteiler: zentraler oder ein zusätzlicher EV."},
  {"id": "P13", "lz": "LZ4", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "Wie viele Verbindungen zur Ebene darüber hat ein Etagenverteiler im hierarchischen Stern?", "optionen": [{"text": "Genau eine", "richtig": true}, {"text": "Zwei, damit es ausfallsicher ist", "feedback": "Zusätzliche Wege sind in der Grundstruktur nicht vorgesehen; sie bräuchten besondere Technik."}, {"text": "So viele, wie es Gebäudeverteiler gibt", "feedback": "Ein EV hängt nur am GV seines Gebäudes."}], "erklaerung": "Im hierarchischen Stern hat jedes Gerät genau eine Verbindung zur nächsthöheren Ebene."},
  {"id": "P14", "lz": "LZ4", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "Zwei Etagenverteiler auf derselben Etage werden direkt verbunden. Wie ist das zu bewerten?", "optionen": [{"text": "Falsch: Verteiler derselben Ebene werden nicht verbunden; beide hängen am GV.", "richtig": true}, {"text": "Richtig, weil es der kürzeste Weg ist.", "feedback": "Kürze zählt nicht; Querverbindungen erzeugen Kreise."}, {"text": "Richtig, wenn das Kabel aus Glasfaser ist.", "feedback": "Das Medium ändert nichts an der Struktur."}], "erklaerung": "Querverbindungen zwischen Verteilern derselben Ebene widersprechen dem hierarchischen Stern."},
  {"id": "P15", "lz": "LZ4", "einsatz": ["selbstueberpruefung"], "typ": "zahl", "frage": "Ein Standort hat drei Gebäude, jedes mit einem Gebäudeverteiler. Wie viele Kabel hat der Primärbereich im Stern?", "zahl": {"wert": 3}, "typisch": [{"wert": 2, "feedback": "Jedes der drei Gebäude braucht eine Verbindung zum SV."}, {"wert": 6, "feedback": "Die GVs werden nicht untereinander verbunden – nur jeder einmal mit dem SV."}], "erklaerung": "Im Stern hängt jeder GV mit genau einem Kabel am SV: 3 Gebäude, 3 Kabel."},
  {"id": "P16", "lz": "LZ4", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "Wie viele Standortverteiler hat ein Standort?", "optionen": [{"text": "Genau einen", "richtig": true}, {"text": "Einen je Gebäude", "feedback": "Je Gebäude gibt es einen Gebäudeverteiler; der SV verbindet sie."}, {"text": "Zwei, damit es ausfallsicher ist", "feedback": "In der Grundstruktur gibt es genau einen."}], "erklaerung": "Der Standortverteiler ist die Spitze des Sterns – es gibt genau einen."},
  {"id": "P17", "lz": "LZ5", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "Wohin gehört der Standortverteiler?", "optionen": [{"text": "In einen abgeschlossenen, gekühlten Server- oder Technikraum", "richtig": true}, {"text": "In das Sekretariat, damit ihn jemand im Blick hat", "feedback": "Dort ist er nicht vor Zugriff geschützt, und er stört."}, {"text": "In die Mitte des Hofs, damit die Wege kurz sind", "feedback": "Verteiler stehen in Gebäuden, in geschützten Räumen."}, {"text": "In den Flur neben die Hauseinführung", "feedback": "Flure sind Fluchtwege."}], "erklaerung": "SV und GV stehen in einem Technik- oder Serverraum: abschließbar, belüftet oder gekühlt."},
  {"id": "P18", "lz": "LZ5", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "Warum steht ein Etagenverteiler nicht im Klassenzimmer, auch wenn dort die meisten PCs sind?", "optionen": [{"text": "Lärm und Abwärme stören, und jeder hätte Zugang zum Schrank.", "richtig": true}, {"text": "Weil die Kabel dann zu kurz wären", "feedback": "Kurze Kabel sind kein Problem."}, {"text": "Weil Kupferkabel nicht in Klassenzimmer dürfen", "feedback": "Die Dosen liegen ja gerade dort."}], "erklaerung": "Verteiler gehören in abschließbare Technik- oder Nebenräume: Zutrittsschutz, kein Lärm und keine Wärme im Arbeitsraum."},
  {"id": "P19", "lz": "LZ5", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "Welcher Raum eignet sich für einen Etagenverteiler?", "optionen": [{"text": "Ein abschließbarer Lagerraum in der Mitte der Etage", "richtig": true}, {"text": "Das Treppenhaus", "feedback": "Treppenhäuser sind Fluchtwege."}, {"text": "Die Teeküche", "feedback": "Dort gibt es Wasser und Publikumsverkehr."}, {"text": "Das Lehrerzimmer", "feedback": "Dort wird gearbeitet; der Schrank stört und ist nicht geschützt."}], "erklaerung": "Ein abschließbarer Nebenraum in der Mitte hält die Wege kurz und den Schrank geschützt."},
  {"id": "P20", "lz": "LZ5", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "Dürfen Standortverteiler und Gebäudeverteiler im selben Raum stehen?", "optionen": [{"text": "Ja, sie bleiben trotzdem zwei getrennte Ebenen.", "richtig": true}, {"text": "Nein, sie müssen in verschiedenen Gebäuden stehen.", "feedback": "Der SV steht meist im Hauptgebäude – oft im selben Serverraum wie dessen GV."}, {"text": "Nur, wenn es keinen Etagenverteiler gibt.", "feedback": "Das hat damit nichts zu tun."}], "erklaerung": "SV und GV dürfen räumlich zusammenstehen; logisch bleiben es getrennte Ebenen."}
]);
