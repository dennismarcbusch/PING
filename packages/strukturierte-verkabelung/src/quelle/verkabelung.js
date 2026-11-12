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
