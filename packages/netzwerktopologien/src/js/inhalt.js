/* Erzeugt von paket.py bauen aus quelle/ – hier nichts ändern, sondern in quelle/ (dann paket.py bauen). */

/* ---------- quelle/topologie.js ---------- */
/* =====================================================================
   Netzplan „TopoNetz“ – der Arbeitsgegenstand dieses Pakets.
   Herausgelöst aus „Netzwerktopologien erleben“ Version 1 (Graph, Analyse,
   Darstellung, Animationen) und für die Kompass-Vorlage als Gerät verpackt:
   bedienbar per Antippen und Tastatur, ohne Ziehen.

   var netz = TN.netz(box, {
     topo: 'star', n: 6,                 // bus · ring · star · tree · full · partial
     namen: ['Empfang', …],              // optional: Namen der PCs in Reihenfolge
     werkzeuge: ['ausfall', 'paket', 'reparieren', 'schwachstellen', 'doppelring', 'kollision'],
     hoehe: 300,                         // Höhe des Plans in px
     beiEreignis: function (ev) { … }    // {typ:'ausfall'|'paket'|'kollision'|…, …, stand}
   });
   netz.stand()  → {ok, alle, gruppen, ausgefallen: [Namen], art: {pc, switch, kabel, bus}}
   netz.ausfall(name oder id) · netz.repariere() · netz.sende(a, b, sofort)
   netz.werkzeug(name) · netz.neu(topo, n, namen) · netz.sperre(true|false)
   ===================================================================== */
var TN = (function () {
var NS = 'http://www.w3.org/2000/svg';
var $ = function(s, r){ return (r || document).querySelector(s); };
var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var _id = 0; function nid(){ return 'e' + (++_id); }
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function shuffle(a){ a = a.slice(); for (var i = a.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function sleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }

var ORDER = ['bus','ring','star','tree','full','partial'];
var TOPO = {
  bus: { name:'Bus', color:'#e8862a', short:'Ein gemeinsames Kabel für alle Stationen',
    recog:'Erkennbar am durchgehenden Kabel mit Abschlusswiderständen (Terminatoren) an beiden Enden.',
    desc:'Alle Stationen hängen an einem gemeinsamen Übertragungsmedium (klassisch ein Koaxialkabel). An beiden Enden sitzen Abschlusswiderstände (Terminatoren), die Signalreflexionen verhindern. Jedes Signal erreicht alle Stationen – nur der Empfänger übernimmt die Daten. Den Zugriff regelt z. B. CSMA/CD.',
    pros:['Geringer Kabelbedarf, günstig','Einfacher Aufbau ohne aktive Komponenten','Ausfall eines Endgeräts stört die anderen nicht','Leicht erweiterbar (Station anklemmen)'],
    cons:['Kabelbruch oder fehlender Terminator legt das ganze Netz lahm','Nur eine Station kann gleichzeitig senden → Kollisionen','Leistung sinkt mit der Zahl der Stationen','Alle Stationen „hören mit“ (Datenschutz)','Fehlersuche aufwendig, Länge begrenzt'],
    practice:'Früher Ethernet 10BASE2/10BASE5 (Koaxialkabel). Heute z. B. CAN-Bus im Auto und Feldbusse in der Industrie.',
    sim:'Sende ein Paket und beobachte, dass alle Stationen das Signal empfangen. Klicke dann auf das Bus-Kabel (Kabelbruch) – oder führe eine Kollision vor.' },
  ring: { name:'Ring', color:'#8e5bd6', short:'Jede Station hat genau zwei Nachbarn',
    recog:'Jedes Gerät hat genau zwei Nachbarn – die Verbindungen bilden einen geschlossenen Kreis.',
    desc:'Jede Station ist mit genau zwei Nachbarn verbunden. Die Daten laufen in eine Richtung von Station zu Station; jede Station frischt das Signal auf und gibt es weiter (Repeater). Der Zugriff wird häufig per Token Passing geregelt: Nur wer das Token hat, darf senden.',
    pros:['Kollisionsfrei durch Token – deterministische Zugriffszeiten','Alle Stationen sind gleichberechtigt','Signal wird von jeder Station aufgefrischt → große Ausdehnung','Geringer Kabelaufwand (n Kabel)'],
    cons:['Ausfall einer Station oder Leitung unterbricht den ganzen Ring (ohne Doppelring)','Laufzeit steigt mit jeder weiteren Station','Erweitern erfordert Unterbrechen des Rings','Fehlersuche aufwendig'],
    practice:'Token Ring (IEEE 802.5), FDDI als Doppelring. Heute: Glasfaser-Ringe bei Providern und Ring-Redundanz im Industrial Ethernet.',
    sim:'Lass eine Station ausfallen und sende ein Paket. Aktiviere danach den Doppelring und vergleiche!' },
  star: { name:'Stern', color:'#2f7fd6', short:'Alle Geräte an einem zentralen Verteiler',
    recog:'Alle Geräte sind einzeln an genau einen zentralen Verteiler (Switch) angeschlossen.',
    desc:'Jedes Endgerät ist mit einem eigenen Kabel an einen zentralen Verteiler angeschlossen – heute ein Switch, früher ein Hub. Der Switch leitet Daten gezielt nur an den Empfänger weiter.',
    pros:['Defektes Kabel/Gerät betrifft nur dieses eine Gerät','Einfach erweiterbar und leicht zu warten','Fehler lassen sich gut eingrenzen','Switch verhindert Kollisionen, hohe Datenraten'],
    cons:['Der zentrale Switch ist ein Single Point of Failure','Hoher Kabelaufwand: jedes Gerät braucht ein eigenes Kabel','Anzahl der Switch-Ports begrenzt die Größe','Kosten für die aktive Komponente'],
    practice:'Standard in nahezu jedem heutigen LAN (Ethernet mit Switch), z. B. im Klassenzimmer.',
    sim:'Lass einen PC ausfallen – und dann den Switch. Was ist der Unterschied?' },
  tree: { name:'Baum', color:'#2f9e5b', short:'Hierarchisch verbundene Sterne (erweiterter Stern)',
    recog:'Mehrere Verteiler sind hierarchisch miteinander verbunden – ohne Kreise.',
    desc:'Mehrere Sterne werden hierarchisch über Switches gekoppelt (erweiterter Stern): ein zentraler Core-Switch, darunter Etagen- bzw. Raumverteiler, daran die Endgeräte.',
    pros:['Gut skalierbar, auch für große Netze','Ausfälle bleiben auf Teilbäume begrenzt','Klare, strukturierte Verkabelung (Etagenverteiler)','Große Entfernungen überbrückbar'],
    cons:['Fällt ein Verteiler aus, ist sein ganzer Teilbaum getrennt','Die Wurzel (Core-Switch) ist besonders kritisch','Uplinks können zum Engpass werden','Höherer Planungsaufwand'],
    practice:'Typisches Schul- oder Firmennetz: Core-Switch im Serverraum, Etagen- und Raumswitches.',
    sim:'Lass einen Raum-Switch ausfallen – wer kann noch mit wem sprechen? Und was passiert beim Core-Switch?' },
  full: { name:'Vollvermascht', color:'#d64545', short:'Jedes Gerät ist mit jedem verbunden',
    recog:'Jedes Gerät ist direkt mit jedem anderen Gerät verbunden.',
    desc:'Jedes Gerät besitzt eine direkte Verbindung zu jedem anderen Gerät. Fällt eine Leitung aus, gibt es sofort zahlreiche Umwege.',
    pros:['Höchste Ausfallsicherheit, viele alternative Wege','Direkte Kommunikation ohne Zwischenstationen','Keine zentrale Komponente, kein Engpass'],
    cons:['Extrem hoher Kabelaufwand: n·(n−1)/2 Verbindungen','Jedes Gerät braucht n−1 Anschlüsse','Teuer und schlecht erweiterbar'],
    practice:'Kleine Kernnetze, Cluster-Verbindungen, VPN-Full-Mesh zwischen wenigen Standorten.',
    sim:'Erhöhe die Anzahl der Endgeräte und beobachte den Kabelaufwand. Lass mehrere Kabel ausfallen und sende Pakete.' },
  partial: { name:'Teilvermascht', color:'#14958a', short:'Mehrere, aber nicht alle Verbindungen',
    recog:'Geräte haben mehrere, aber nicht alle möglichen Verbindungen.',
    desc:'Geräte sind mit mehreren, aber nicht mit allen anderen verbunden. Daten werden – oft über Zwischenstationen – auf einem passenden Weg weitergeleitet (Routing).',
    pros:['Guter Kompromiss aus Ausfallsicherheit und Aufwand','Alternative Wege bei Leitungsausfall','Gut erweiterbar'],
    cons:['Wegewahl (Routing) nötig','Planung und Verwaltung aufwendiger','Unterschiedlich lange Wege und Laufzeiten'],
    practice:'Das Internet, Provider- und Firmen-WANs, WLAN-Mesh-Systeme.',
    sim:'Wie viele Ausfälle verkraftet das Netz, bevor es zerfällt? Probiere es aus!' }
};
function colorOf(key){ return (TOPO[key] && TOPO[key].color) || '#8a94a6'; }
function treeSwitches(n){ return n <= 6 ? 2 : 3; }

/* ================================================================
   Graph-Erzeugung
   ================================================================ */
function makeGraph(key, n){
  var nodes = [], links = [], pc = 0;
  function P(x, y){ var o = {id:nid(), type:'pc', x:Math.round(x), y:Math.round(y), label:'PC' + (++pc)}; nodes.push(o); return o; }
  function S(x, y, label){ var o = {id:nid(), type:'switch', x:x, y:y, label:label}; nodes.push(o); return o; }
  function L(a, b){ links.push({id:nid(), a:a.id, b:b.id}); }
  function circle(){ var r = []; for (var i = 0; i < n; i++){ var a = -Math.PI/2 + i*2*Math.PI/n; r.push(P(400 + 280*Math.cos(a), 240 + 172*Math.sin(a))); } return r; }
  var i, j, r;
  switch (key){
    case 'bus': {
      var w = clamp(n*100, 380, 740), b = {id:nid(), type:'bus', x:400, y:240, w:w, label:'Bus'};
      nodes.push(b); var span = w - 90;
      for (i = 0; i < n; i++){ var p = P(400 - span/2 + i*span/(n-1), i % 2 ? 380 : 100); L(p, b); }
      break; }
    case 'ring': r = circle(); for (i = 0; i < n; i++) L(r[i], r[(i+1) % n]); break;
    case 'star': r = circle(); var s = S(400, 240, 'Switch'); r.forEach(function(p){ L(p, s); }); break;
    case 'tree': {
      var m = treeSwitches(n), core = S(400, 70, 'Core'), base = Math.floor(n/m), extra = n % m;
      for (i = 0; i < m; i++){
        var sx = m === 2 ? (i === 0 ? 240 : 560) : [160, 400, 640][i];
        var sw = S(sx, 225, 'SW' + (i+1)); L(sw, core);
        var k = base + (i < extra ? 1 : 0);
        for (j = 0; j < k; j++){ var q = P(sx - (k-1)*62/2 + j*62, 385); L(q, sw); }
      }
      break; }
    case 'full': r = circle(); for (i = 0; i < n; i++) for (j = i+1; j < n; j++) L(r[i], r[j]); break;
    case 'partial': {
      r = circle(); for (i = 0; i < n; i++) L(r[i], r[(i+1) % n]);
      var h = Math.floor(n/2);
      for (i = 0; i < n; i += 2){
        j = (i + h) % n; var a = r[i], c = r[j];
        if (j === (i+1) % n || i === (j+1) % n) continue;
        if (links.some(function(l){ return (l.a === a.id && l.b === c.id) || (l.a === c.id && l.b === a.id); })) continue;
        L(a, c);
      }
      break; }
    default: circle();
  }
  return {nodes:nodes, links:links};
}
function byId(G, id){ for (var i = 0; i < G.nodes.length; i++) if (G.nodes[i].id === id) return G.nodes[i]; return null; }
function linkById(G, id){ for (var i = 0; i < G.links.length; i++) if (G.links[i].id === id) return G.links[i]; return null; }
function labelOf(G, id){ var n = byId(G, id); if (n) return n.type === 'bus' ? 'Bus-Kabel' : n.label; var l = linkById(G, id); if (l) return 'Kabel ' + labelOf(G, l.a) + '–' + labelOf(G, l.b); return '?'; }

/* ================================================================
   Graph-Analyse
   ================================================================ */
function adj(G, skip){
  var m = new Map();
  G.nodes.forEach(function(n){ if (!skip || !skip.has(n.id)) m.set(n.id, []); });
  G.links.forEach(function(l){
    if (skip && skip.has(l.id)) return;
    if (m.has(l.a) && m.has(l.b)){ m.get(l.a).push({to:l.b, link:l.id}); m.get(l.b).push({to:l.a, link:l.id}); }
  });
  return m;
}
function comps(A){
  var seen = new Set(), out = [];
  A.forEach(function(_, id){
    if (seen.has(id)) return;
    var c = [], st = [id]; seen.add(id);
    while (st.length){ var u = st.pop(); c.push(u); A.get(u).forEach(function(e){ if (!seen.has(e.to)){ seen.add(e.to); st.push(e.to); } }); }
    out.push(c);
  });
  return out;
}
function R(key, hint){ return {key:key, name:TOPO[key].name, hint:hint || TOPO[key].short}; }
function mixed(h){ return {key:'mixed', name:'Misch-/Hybridtopologie', hint:h}; }
function classify(G){
  var pcs = G.nodes.filter(function(n){ return n.type === 'pc'; });
  var sws = G.nodes.filter(function(n){ return n.type === 'switch'; });
  var buses = G.nodes.filter(function(n){ return n.type === 'bus'; });
  var n = pcs.length, E = G.links.length;
  if (n < 3) return {key:null, name:'Noch keine Topologie', hint:'Es werden mindestens 3 Endgeräte (PCs) benötigt.'};
  var A = adj(G);
  if (comps(A).length > 1) return {key:null, name:'Nicht zusammenhängend', hint:'Mindestens ein Gerät ist noch nicht mit dem Rest des Netzes verbunden.'};
  var deg = function(id){ return A.get(id).length; };
  var typ = function(id){ var x = byId(G, id); return x ? x.type : null; };
  var pcpc = G.links.filter(function(l){ return typ(l.a) === 'pc' && typ(l.b) === 'pc'; }).length;
  if (buses.length > 1) return mixed('Mehrere Bus-Segmente – das ist eine gekoppelte Bus-Struktur.');
  if (buses.length === 1){
    if (sws.length === 0 && pcpc === 0 && pcs.every(function(p){ return deg(p.id) === 1; })) return R('bus');
    return mixed('Bus kombiniert mit weiteren Verbindungen oder Verteilern.');
  }
  if (sws.length === 0){
    if (E === n && pcs.every(function(p){ return deg(p.id) === 2; })) return R('ring');
    if (E === n*(n-1)/2) return R('full');
    if (E === n-1){
      if (pcs.every(function(p){ return deg(p.id) <= 2; })) return {key:'line', name:'Linie (Kette)', hint:'Die Geräte bilden eine offene Kette. Schließt du sie, entsteht ein Ring.'};
      return mixed('Baumartige Struktur ohne Verteiler – hier leiten PCs für andere weiter.');
    }
    return R('partial');
  }
  var swSet = new Set(sws.map(function(s){ return s.id; }));
  var leaf = pcs.every(function(p){ return deg(p.id) === 1 && swSet.has(A.get(p.id)[0].to); });
  if (leaf){
    if (sws.length === 1) return R('star');
    if (E === G.nodes.length - 1) return R('tree');
    return mixed('Die Switches sind mit Kreisen (redundant) verbunden – eine vermaschte Switch-Struktur.');
  }
  return mixed('Kombination aus Switch-Anschlüssen und direkten PC-Verbindungen.');
}
function ringOrder(G){
  var A = adj(G), first = G.nodes.find(function(n){ return n.type === 'pc'; });
  var start = first.id, ord = [], prev = null, cur = start, g = 0;
  do {
    var nb = A.get(cur);
    var e = prev === null ? nb[0] : (nb.find(function(x){ return x.to !== prev; }) || nb[0]);
    ord.push({id:cur, link:e.link, next:e.to}); prev = cur; cur = e.to;
  } while (cur !== start && ++g < 500);
  return ord;
}
function findPath(G, failed, s, t, ringSingle){
  if (failed.has(s) || failed.has(t)) return null;
  if (ringSingle){
    if (failed.size) return {blocked:true};
    var ord = ringOrder(G), i = ord.findIndex(function(o){ return o.id === s; }), nodes = [s], links = [], g = 0;
    while (ord[i].id !== t && g++ < 500){ links.push(ord[i].link); i = (i + 1) % ord.length; nodes.push(ord[i].id); }
    return {nodes:nodes, links:links};
  }
  var A = adj(G, failed), prev = new Map([[s, null]]), q = [s];
  while (q.length){
    var u = q.shift(); if (u === t) break;
    A.get(u).forEach(function(e){ if (!prev.has(e.to)){ prev.set(e.to, {from:u, link:e.link}); q.push(e.to); } });
  }
  if (!prev.has(t)) return null;
  var ns = [t], ls = [], c = t;
  while (prev.get(c)){ var p = prev.get(c); ls.unshift(p.link); ns.unshift(p.from); c = p.from; }
  return {nodes:ns, links:ls};
}
function pcGroups(G, failed, ringSingle){
  var alive = G.nodes.filter(function(n){ return n.type === 'pc' && !failed.has(n.id); }).map(function(n){ return n.id; });
  if (ringSingle && failed.size) return alive.map(function(id){ return [id]; });
  var set = new Set(alive);
  return comps(adj(G, failed)).map(function(c){ return c.filter(function(id){ return set.has(id); }); }).filter(function(c){ return c.length; });
}
function impact(G, id, rs){
  var gr = pcGroups(G, new Set([id]), rs), tot = 0, big = 0;
  gr.forEach(function(g){ tot += g.length; big = Math.max(big, g.length); });
  return tot - big;
}
function heatMap(G, rs){
  var nPC = G.nodes.filter(function(n){ return n.type === 'pc'; }).length, m = new Map();
  G.nodes.forEach(function(n){ var k = impact(G, n.id, rs); m.set(n.id, {k:k, f:nPC > 1 ? k/(nPC-1) : 0, crit:k >= 1}); });
  G.links.forEach(function(l){ var k = impact(G, l.id, rs); m.set(l.id, {k:k, f:nPC > 1 ? k/(nPC-1) : 0, crit:k >= 2}); });
  return m;
}
function reachStats(G, failed, rs){
  var n = G.nodes.filter(function(x){ return x.type === 'pc'; }).length, gr = pcGroups(G, failed, rs), ok = 0;
  gr.forEach(function(g){ ok += g.length*(g.length-1)/2; });
  var all = n*(n-1)/2;
  return {ok:ok, all:all, pct:all ? ok/all : 1, groups:gr};
}
function metrics(G, rs){
  if (rs === undefined) rs = classify(G).key === 'ring';
  var A = adj(G), pcs = G.nodes.filter(function(n){ return n.type === 'pc'; });
  var buses = G.nodes.filter(function(n){ return n.type === 'bus'; }).length;
  var crit = 0; heatMap(G, rs).forEach(function(v){ if (v.crit) crit++; });
  return {
    pcs:pcs.length, cables:G.links.length + buses,
    sws:G.nodes.filter(function(n){ return n.type === 'switch'; }).length,
    maxPorts:pcs.reduce(function(m, p){ return Math.max(m, A.get(p.id).length); }, 0),
    crit:crit
  };
}
function heatCol(f){ return 'hsl(' + Math.round(120*(1 - clamp(f, 0, 1))) + ',70%,47%)'; }

/* ================================================================
   Darstellung (SVG)
   ================================================================ */
function ep(n, other){
  if (n.type === 'bus'){ var hw = n.w/2 - 14; return {x:clamp(other.x, n.x - hw, n.x + hw), y:n.y}; }
  return {x:n.x, y:n.y};
}
function scene(G, o){
  o = o || {};
  var failed = o.failed || new Set(), heat = o.heat || null, hiN = o.hiNodes || new Set(), hiL = o.hiLinks || new Set();
  var good = o.good || new Set(), color = o.color || '#2f6fde', labels = o.labels !== false, dots = !!o.dots, inter = !!o.interactive;
  var N = new Map(G.nodes.map(function(n){ return [n.id, n]; }));
  var s = '';
  function nodeSVG(n){
    var f = failed.has(n.id), h = heat && heat.get(n.id), inner = '';
    var attrs = inter ? ' data-id="' + n.id + '" data-kind="node" tabindex="0" role="button" aria-label="' + esc(labelOf(G, n.id)) + (f ? ' (ausgefallen)' : '') + '"' : '';
    var title = h ? '<title>' + esc(labelOf(G, n.id)) + ': Ausfall trennt ' + h.k + ' Gerät(e)</title>' : '';
    if (n.type === 'bus'){
      var hw = n.w/2, stroke = f ? 'var(--bad)' : (h ? heatCol(h.f) : color);
      if (o.sel === n.id || hiN.has(n.id)) inner += '<line x1="' + (-hw) + '" y1="0" x2="' + hw + '" y2="0" class="busglow"/>';
      if (good.has(n.id)) inner += '<rect x="' + (-hw-16) + '" y="-20" width="' + (n.w+32) + '" height="40" rx="12" class="good"/>';
      inner += '<line x1="' + (-hw) + '" y1="0" x2="' + hw + '" y2="0" class="bus-line" style="stroke:' + stroke + '"/>';
      inner += '<line x1="' + (-hw) + '" y1="0" x2="' + hw + '" y2="0" class="hit" style="stroke-width:34"/>';
      inner += '<rect x="' + (-hw-11) + '" y="-12" width="11" height="24" rx="2" class="term"/><rect x="' + hw + '" y="-12" width="11" height="24" rx="2" class="term"/>';
      if (f) inner += '<path d="M-16,-18 L-4,0 L-16,18 M16,-18 L4,0 L16,18" class="xmark"/>';
      if (labels) inner += '<text x="' + (-hw+2) + '" y="30" class="lbl" style="text-anchor:start">Bus-Kabel</text>';
      return '<g class="node bus' + (f ? ' failed-bus' : '') + '"' + attrs + ' transform="translate(' + n.x + ',' + n.y + ')">' + title + inner + '</g>';
    }
    if (h && !f) inner += '<circle r="34" class="heat" style="fill:' + heatCol(h.f) + '"/>';
    if (hiN.has(n.id)) inner += '<circle r="32" class="hiring"/>';
    if (good.has(n.id)) inner += '<circle r="36" class="good"/>';
    if (o.sel === n.id) inner += '<circle r="34" class="halo"/>';
    if (dots){
      inner += n.type === 'pc' ? '<circle r="30" style="fill:' + color + '"/>' : '<rect x="-48" y="-30" width="96" height="60" rx="12" fill="#2b3445"/>';
    } else if (n.type === 'pc'){
      inner += '<rect x="-20" y="-18" width="40" height="28" rx="4" class="pc-body"/>' +
        '<rect x="-16" y="-14" width="32" height="20" rx="2" style="fill:' + color + ';opacity:.9"/>' +
        '<path d="M-12,-10 L-2,-10" stroke="#fff" stroke-width="2" opacity=".6"/>' +
        '<rect x="-4" y="10" width="8" height="5" class="pc-stand"/><rect x="-12" y="15" width="24" height="3.5" rx="1.5" class="pc-stand"/>';
      if (labels) inner += '<text y="34" class="lbl">' + esc(n.label) + '</text>';
    } else {
      var ports = ''; for (var i = 0; i < 6; i++) ports += '<rect x="' + (-23 + i*8) + '" y="-2" width="5" height="5" rx="1" class="port"/>';
      inner += '<rect x="-30" y="-14" width="60" height="28" rx="5" class="sw-body"/><rect x="-26" y="-10" width="18" height="4" rx="2" fill="#7f8ba1"/>' + ports;
      if (labels) inner += '<text y="32" class="lbl">' + esc(n.label) + '</text>';
    }
    if (f) inner += '<path d="M-16,-16 L16,16 M16,-16 L-16,16" class="xmark"/>';
    return '<g class="node ' + n.type + (f ? ' failed' : '') + '"' + attrs + ' transform="translate(' + n.x + ',' + n.y + ')">' + title + inner + '</g>';
  }
  G.nodes.forEach(function(n){ if (n.type === 'bus') s += nodeSVG(n); });
  G.links.forEach(function(l){
    var a = N.get(l.a), b = N.get(l.b); if (!a || !b) return;
    var p = ep(a, b), q = ep(b, a), f = failed.has(l.id), h = heat && heat.get(l.id);
    var st = (h && !f) ? ' style="stroke:' + heatCol(h.f) + '"' : '';
    var xy = ' x1="' + p.x + '" y1="' + p.y + '" x2="' + q.x + '" y2="' + q.y + '"';
    s += '<line class="link' + (f ? ' failed' : '') + (hiL.has(l.id) ? ' hi' : '') + '"' + xy + st + '/>';
    if (good.has(l.id)) s += '<line class="good"' + xy + '/>';
    if (inter) s += '<g data-id="' + l.id + '" data-kind="link" tabindex="0" role="button" aria-label="' + esc(labelOf(G, l.id)) + (f ? ' (ausgefallen)' : '') + '"><line class="hit"' + xy + '/>' + (h ? '<title>' + esc(labelOf(G, l.id)) + ': Ausfall trennt ' + h.k + ' Gerät(e)</title>' : '') + '</g>';
  });
  if (o.ring){
    ringOrder(G).forEach(function(st){
      var a = N.get(st.id), b = N.get(st.next), mx = (a.x + b.x)/2, my = (a.y + b.y)/2;
      var ang = Math.atan2(b.y - a.y, b.x - a.x), deg = ang*180/Math.PI, px = -Math.sin(ang)*11, py = Math.cos(ang)*11;
      if (o.ring === 'double'){
        s += '<path d="M-8,-6 L8,0 L-8,6 Z" class="arrow" style="fill:' + color + '" transform="translate(' + (mx+px) + ',' + (my+py) + ') rotate(' + deg + ')"/>';
        s += '<path d="M-8,-6 L8,0 L-8,6 Z" class="arrow" style="fill:' + color + '" transform="translate(' + (mx-px) + ',' + (my-py) + ') rotate(' + (deg+180) + ')"/>';
      } else {
        s += '<path d="M-9,-7 L9,0 L-9,7 Z" class="arrow" style="fill:' + color + '" transform="translate(' + mx + ',' + my + ') rotate(' + deg + ')"/>';
      }
    });
  }
  G.nodes.forEach(function(n){ if (n.type !== 'bus') s += nodeSVG(n); });
  return s;
}
function miniSVG(G, o, cls){ return '<svg viewBox="0 0 800 480" class="' + (cls || 'mini') + '">' + scene(G, o) + '</svg>'; }

/* Animationen */
function svgEl(tag, attrs){ var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
function animate(fx, pts, opt){
  opt = opt || {};
  return new Promise(function(res){
    var c = svgEl('circle', {r:opt.r || 10, 'class':'packet' + (opt.cls ? ' ' + opt.cls : ''), cx:pts[0].x, cy:pts[0].y});
    fx.appendChild(c);
    var segs = [], total = 0;
    for (var i = 0; i < pts.length - 1; i++){ var d = Math.hypot(pts[i+1].x - pts[i].x, pts[i+1].y - pts[i].y); segs.push(d); total += d; }
    var dur = opt.dur || Math.max(500, total/(opt.speed || 330)*1000), t0 = performance.now();
    function step(t){
      var u = Math.min(1, (t - t0)/dur), dist = u*total, k = 0;
      while (k < segs.length - 1 && dist > segs[k]){ dist -= segs[k]; k++; }
      var r = segs[k] ? dist/segs[k] : 1, A = pts[k], B = pts[k+1] || pts[k];
      c.setAttribute('cx', A.x + (B.x - A.x)*r); c.setAttribute('cy', A.y + (B.y - A.y)*r);
      if (u < 1) requestAnimationFrame(step); else { c.remove(); res(); }
    }
    requestAnimationFrame(step);
  });
}
function pulse(fx, x, y, color, delay){
  setTimeout(function(){
    var c = svgEl('circle', {cx:x, cy:y, r:16, 'class':'pulse', style:'stroke:' + color}); fx.appendChild(c);
    var t0 = performance.now();
    (function st(t){ var u = Math.min(1, (t - t0)/650); c.setAttribute('r', 16 + 24*u); c.setAttribute('opacity', 1 - u); if (u < 1) requestAnimationFrame(st); else c.remove(); })(t0);
  }, delay || 0);
}
function spreadBus(fx, bus, x0, speed){
  var hw = bus.w/2, L = bus.x - hw, Rr = bus.x + hw, maxD = Math.max(x0 - L, Rr - x0), dur = maxD/speed*1000;
  var line = svgEl('line', {'class':'spread', x1:x0, y1:bus.y, x2:x0, y2:bus.y}); fx.appendChild(line);
  var t0 = performance.now();
  (function st(t){
    var u = Math.min(1, (t - t0)/dur), d = u*maxD;
    line.setAttribute('x1', Math.max(L, x0 - d)); line.setAttribute('x2', Math.min(Rr, x0 + d));
    if (u < 1) requestAnimationFrame(st); else { line.style.transition = 'opacity .6s'; line.style.opacity = 0; setTimeout(function(){ line.remove(); }, 650); }
  })(t0);
  return dur;
}
function burst(fx, x, y){
  var c = svgEl('circle', {cx:x, cy:y, r:6, 'class':'burst'}); fx.appendChild(c);
  var tx = svgEl('text', {x:x, y:y - 34, 'class':'bursttxt'}); tx.textContent = '💥 Kollision!'; fx.appendChild(tx);
  var t0 = performance.now();
  (function st(t){ var u = Math.min(1, (t - t0)/700); c.setAttribute('r', 6 + 50*u); c.setAttribute('opacity', 1 - u); if (u < 1) requestAnimationFrame(st); else c.remove(); })(t0);
  setTimeout(function(){ tx.remove(); }, 2200);
}
function polyPoints(G, path){
  var pts = [];
  path.forEach(function(id, i){
    var n = byId(G, id);
    if (n.type === 'bus'){ var pr = byId(G, path[i-1]), nx = byId(G, path[i+1]); if (pr) pts.push(ep(n, pr)); if (nx) pts.push(ep(n, nx)); }
    else pts.push({x:n.x, y:n.y});
  });
  return pts;
}
/* ================================================================
   Gerät für die Kompass-Vorlage
   ================================================================ */
var WERKZEUG = {
  ausfall:        { text: '⚡ Ausfall', modus: true, hilfe: 'Tippe ein Gerät oder Kabel an: Es fällt aus. Nochmal antippen = repariert.' },
  paket:          { text: '✉ Paket senden', modus: true, hilfe: 'Tippe zuerst den Absender-PC an, dann den Empfänger-PC.' },
  reparieren:     { text: '🔧 Alles reparieren' },
  schwachstellen: { text: '🔥 Schwachstellen', schalter: true },
  doppelring:     { text: '🔁 Doppelring', schalter: true },
  kollision:      { text: '💥 Gleichzeitig senden' },
  verbinden:      { text: '🔗 Verbinden', modus: true, hilfe: 'Tippe nacheinander zwei Geräte an: Sie werden mit einem Kabel verbunden. Sind sie schon verbunden, wird das Kabel entfernt.' },
  loeschen:       { text: '🗑 Entfernen', modus: true, hilfe: 'Tippe ein Gerät oder Kabel an, um es zu entfernen.' },
  pc:             { text: '+ PC' },
  sw:             { text: '+ Switch' },
  bus:            { text: '+ Bus-Kabel' },
  loesen:         { text: '✂ Alle Kabel lösen' }
};

function netz(box, opt) {
  opt = opt || {};
  var E = KIT.el;
  var st = { key: opt.topo || 'star', n: opt.n || 6, G: null, failed: new Set(), tool: null, sel: null,
    hiN: new Set(), hiL: new Set(), token: 0, heat: false, dbl: false, gesperrt: false, busy: false };
  var werkzeuge = opt.werkzeuge || ['ausfall', 'paket'];
  var root = E('div', { class: 'tn' });
  var leiste = E('div', { class: 'tn-leiste', role: 'toolbar', 'aria-label': 'Werkzeuge für den Netzplan' });
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 800 480'); svg.setAttribute('class', 'tn-svg');
  svg.setAttribute('role', 'group'); svg.setAttribute('aria-label', opt.beschriftung || 'Netzplan');
  svg.style.height = (opt.hoehe || 300) + 'px';
  var gScene = document.createElementNS(NS, 'g'), gFx = document.createElementNS(NS, 'g');
  svg.appendChild(gScene); svg.appendChild(gFx);
  var status = E('div', { class: 'tn-status', 'aria-live': 'polite' });
  var knoepfe = {};
  werkzeuge.forEach(function (w) {
    var d = WERKZEUG[w]; if (!d) return;
    var b = E('button', { type: 'button', text: d.text, onclick: function () { klick(w); } });
    if (d.modus || d.schalter) b.setAttribute('aria-pressed', 'false');
    knoepfe[w] = b; leiste.appendChild(b);
  });
  leiste.appendChild(status);
  root.appendChild(leiste); root.appendChild(svg);
  box.appendChild(root);

  function rs() { return st.key === 'ring' && !st.dbl; }
  function art(id) { var n = byId(st.G, id); return n ? n.type : 'kabel'; }
  function finde(x) {
    if (byId(st.G, x) || linkById(st.G, x)) return x;
    var n = st.G.nodes.find(function (k) { return k.label === x; });
    if (n) return n.id;
    var l = st.G.links.find(function (k) { return labelOf(st.G, k.id) === x || labelOf(st.G, k.id) === 'Kabel ' + x; });
    return l ? l.id : null;
  }
  function kabelVon(name) {   // erstes Kabel an einem Gerät (z. B. Patchkabel eines PCs)
    var id = finde(name), l = st.G.links.find(function (k) { return k.a === id || k.b === id; });
    return l ? l.id : null;
  }
  function stand() {
    var r = reachStats(st.G, st.failed, rs()), a = { pc: false, switch: false, kabel: false, bus: false }, namen = [];
    st.failed.forEach(function (id) { a[art(id)] = true; namen.push(labelOf(st.G, id)); });
    return { ok: r.ok, alle: r.all, gruppen: r.groups.length, ausgefallen: namen, art: a, topologie: classify(st.G) };
  }
  function melde(ev) { ev.stand = stand(); if (opt.beiEreignis) opt.beiEreignis(ev); }

  function zeichne() {
    var fokus = document.activeElement && svg.contains(document.activeElement) ? document.activeElement.getAttribute('data-id') : null;
    var heat = st.heat ? heatMap(st.G, rs()) : null;
    gScene.innerHTML = scene(st.G, { failed: st.failed, heat: heat, sel: st.sel, hiNodes: st.hiN, hiLinks: st.hiL,
      color: colorOf(st.key), interactive: !!st.tool && !st.gesperrt, ring: st.key === 'ring' ? (st.dbl ? 'double' : 'single') : null });
    if (fokus) { var f = gScene.querySelector('[data-id="' + fokus + '"]'); if (f) f.focus(); }
    var r = reachStats(st.G, st.failed, rs()), pct = r.all ? Math.round(r.ok / r.all * 100) : 100;
    if (st.sel && !st.gesperrt) { status.innerHTML = '<span><b>' + (st.tool === 'paket' ? 'Jetzt den Empfänger-PC antippen.' : 'Jetzt das zweite Gerät antippen.') + '</b></span>'; }
    else if (opt.anzeige === 'aufbau') { var c = classify(st.G), m = metrics(st.G, rs()); status.innerHTML = '<span>Erkannt: <b>' + c.name + '</b></span><span class="tn-chip">Kabel <b>' + m.cables + '</b></span>'; }
    else status.innerHTML = '<span class="tn-balken"><i style="width:' + pct + '%;background:' + (pct >= 99 ? 'var(--ok)' : pct >= 50 ? 'var(--warn)' : 'var(--bad)') + '"></i></span>' +
      '<span><b>' + r.ok + ' von ' + r.all + '</b> PC-Paaren können Daten austauschen</span>';
    rahmen();
    Object.keys(knoepfe).forEach(function (w) {
      var b = knoepfe[w], def = WERKZEUG[w];
      if (def.modus) b.setAttribute('aria-pressed', st.tool === w ? 'true' : 'false');
      if (w === 'schwachstellen') b.setAttribute('aria-pressed', st.heat ? 'true' : 'false');
      if (w === 'doppelring') { b.setAttribute('aria-pressed', st.dbl ? 'true' : 'false'); b.hidden = st.key !== 'ring'; }
      if (w === 'kollision') b.hidden = st.key !== 'bus';
      b.disabled = st.gesperrt;
    });
  }
  function rahmen() {   // Ausschnitt passend zum Netz, damit der Plan groß erscheint
    if (opt.fest) { svg.setAttribute('viewBox', '0 0 800 480'); return; }
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    st.G.nodes.forEach(function (n) {
      var hw = n.type === 'bus' ? n.w / 2 + 16 : 48;
      x0 = Math.min(x0, n.x - hw); x1 = Math.max(x1, n.x + hw); y0 = Math.min(y0, n.y - 36); y1 = Math.max(y1, n.y + 44);
    });
    if (!isFinite(x0)) { svg.setAttribute('viewBox', '0 0 800 480'); return; }
    var w = Math.max(x1 - x0, 420), h = Math.max(y1 - y0, 260), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    svg.setAttribute('viewBox', Math.round(cx - w / 2) + ' ' + Math.round(cy - h / 2) + ' ' + Math.round(w) + ' ' + Math.round(h));
  }
  function stoppe() { st.token++; gFx.innerHTML = ''; st.hiN = new Set(); st.hiL = new Set(); st.busy = false; }

  function klick(w) {
    if (st.gesperrt) return;
    var d = WERKZEUG[w];
    if (d.modus) { st.tool = w; st.sel = null; zeichne(); melde({ typ: 'werkzeug', name: w, hilfe: d.hilfe }); return; }
    if (w === 'reparieren') { repariere(); return; }
    if (w === 'schwachstellen') { st.heat = !st.heat; zeichne(); melde({ typ: 'schwachstellen', an: st.heat }); return; }
    if (w === 'doppelring') { st.dbl = !st.dbl; stoppe(); zeichne(); melde({ typ: 'doppelring', an: st.dbl }); return; }
    if (w === 'kollision') { kollision(); return; }
    if (w === 'pc' || w === 'sw' || w === 'bus') { neuesGeraet(w); return; }
    if (w === 'loesen') { st.G.links = []; st.sel = null; umgebaut(); }
  }
  function frei() {
    for (var t = 0; t < 300; t++) {
      var x = 70 + Math.random() * 660, y = 60 + Math.random() * 360;
      if (st.G.nodes.every(function (n) { return n.type === 'bus' ? Math.abs(n.y - y) > 60 : Math.hypot(n.x - x, n.y - y) > 95; })) return { x: Math.round(x), y: Math.round(y) };
    }
    return { x: 400, y: 240 };
  }
  function naechster(prefix) { var k = 1; while (st.G.nodes.some(function (n) { return n.label === prefix + k; })) k++; return prefix + k; }
  function neuesGeraet(typ) {
    var p = frei(), n;
    if (typ === 'pc') n = { id: nid(), type: 'pc', x: p.x, y: p.y, label: naechster('PC') };
    else if (typ === 'sw') n = { id: nid(), type: 'switch', x: p.x, y: p.y, label: st.G.nodes.some(function (k) { return k.type === 'switch'; }) ? naechster('SW') : 'Switch' };
    else n = { id: nid(), type: 'bus', x: 400, y: p.y, w: 560, label: 'Bus' };
    st.G.nodes.push(n); umgebaut(); return n.label;
  }
  function umgebaut() {
    var c = classify(st.G); if (c.key && TOPO[c.key]) st.key = c.key; else st.key = 'mixed';
    stoppe(); zeichne(); melde({ typ: 'umbau', topologie: c, kennzahlen: metrics(st.G, rs()) });
  }
  function verbinde(a, b) {
    a = finde(a); b = finde(b); var A = byId(st.G, a), B = byId(st.G, b);
    if (!A || !B || a === b) return;
    if (A.type === 'bus' && B.type === 'bus') { melde({ typ: 'hinweis', text: 'Zwei Bus-Kabel lassen sich nicht direkt verbinden.' }); return; }
    var da = st.G.links.find(function (l) { return (l.a === a && l.b === b) || (l.a === b && l.b === a); });
    if (da) st.G.links = st.G.links.filter(function (l) { return l !== da; }); else st.G.links.push({ id: nid(), a: a, b: b });
    umgebaut();
  }
  function entferne(x) {
    var id = finde(x); if (!id) return;
    if (byId(st.G, id)) { st.G.nodes = st.G.nodes.filter(function (n) { return n.id !== id; }); st.G.links = st.G.links.filter(function (l) { return l.a !== id && l.b !== id; }); }
    else st.G.links = st.G.links.filter(function (l) { return l.id !== id; });
    st.failed.delete(id); st.sel = null; umgebaut();
  }
  function ausfall(x) {
    var id = finde(x); if (!id) return;
    var aus = !st.failed.has(id);
    if (aus) st.failed.add(id); else st.failed.delete(id);
    stoppe(); zeichne();
    melde({ typ: 'ausfall', id: id, name: labelOf(st.G, id), art: art(id), aus: aus });
  }
  function repariere() { st.failed = new Set(); st.sel = null; stoppe(); zeichne(); melde({ typ: 'repariert' }); }
  function sende(a, b, sofort) {
    var s = finde(a), t = finde(b), G = st.G;
    var r = findPath(G, st.failed, s, t, rs()), ok = !!r && !r.blocked;
    var ev = { typ: 'paket', von: labelOf(G, s), nach: labelOf(G, t), ok: ok, gesperrt: !!(r && r.blocked),
      grund: !r ? (st.failed.has(s) ? 'absender' : st.failed.has(t) ? 'empfaenger' : 'weg') : (r.blocked ? 'token' : ''),
      weg: ok ? r.nodes.map(function (id) { return labelOf(G, id); }) : [], schritte: ok ? r.links.length : 0 };
    stoppe();
    if (ok) {
      st.hiN = new Set(r.nodes); st.hiL = new Set(r.links); zeichne();
      if (!sofort) {
        var tok = st.token, pts = polyPoints(G, r.nodes), bus = G.nodes.find(function (n) { return n.type === 'bus'; });
        if (bus && r.nodes.indexOf(bus.id) >= 0) {
          var tap = pts[1], td = Math.hypot(tap.x - pts[0].x, tap.y - pts[0].y) / 330 * 1000;
          setTimeout(function () {
            if (tok !== st.token) return;
            spreadBus(gFx, bus, tap.x, 330);
            G.nodes.forEach(function (n) {
              if (n.type !== 'pc' || n.id === s || st.failed.has(n.id)) return;
              var tp = ep(bus, n), dl = (Math.abs(tp.x - tap.x) + Math.abs(n.y - bus.y)) / 330 * 1000;
              pulse(gFx, n.x, n.y, n.id === t ? 'var(--ok)' : 'var(--tn-draht)', dl);
            });
          }, td);
        }
        animate(gFx, pts, { speed: 330 }).then(function () {
          if (tok !== st.token) return;
          pulse(gFx, byId(G, t).x, byId(G, t).y, 'var(--ok)');
          setTimeout(function () { if (tok === st.token) { st.hiN = new Set(); st.hiL = new Set(); zeichne(); } }, 900);
        });
      }
    } else zeichne();
    melde(ev);
    return ev;
  }
  function kollision() {
    var G = st.G, bus = G.nodes.find(function (n) { return n.type === 'bus'; });
    if (!bus || st.failed.has(bus.id) || st.busy) return;
    var pcs = G.nodes.filter(function (n) { return n.type === 'pc' && !st.failed.has(n.id); }).sort(function (a, b) { return a.x - b.x; });
    if (pcs.length < 2) return;
    stoppe(); zeichne(); st.busy = true;
    var A = pcs[0], B = pcs[pcs.length - 1], ta = ep(bus, A), tb = ep(bus, B), mid = { x: (ta.x + tb.x) / 2, y: bus.y }, tok = st.token;
    melde({ typ: 'kollision', phase: 'start', a: A.label, b: B.label });
    Promise.all([animate(gFx, [A, ta, mid], { dur: 1400 }), animate(gFx, [B, tb, mid], { dur: 1400, cls: 'p-b' })]).then(function () {
      if (tok !== st.token) return;
      burst(gFx, mid.x, mid.y);
      melde({ typ: 'kollision', phase: 'kollision', a: A.label, b: B.label });
      return sleep(1600).then(function () {
        if (tok !== st.token) return;
        spreadBus(gFx, bus, ta.x, 330);
        return animate(gFx, [A, ta, tb, B], { speed: 330 }).then(function () {
          if (tok !== st.token) return;
          melde({ typ: 'kollision', phase: 'fertig', a: A.label, b: B.label });
        });
      });
    }).then(function () { st.busy = false; }, function () { st.busy = false; });
  }
  function bedien(id) {
    if (st.gesperrt || !st.tool) return;
    if (st.tool === 'ausfall') { ausfall(id); return; }
    if (st.tool === 'paket') {
      var n = byId(st.G, id);
      if (!n || n.type !== 'pc') { melde({ typ: 'hinweis', text: 'Absender und Empfänger müssen PCs sein.' }); return; }
      if (!st.sel) { st.sel = id; zeichne(); return; }
      if (st.sel === id) { st.sel = null; zeichne(); return; }
      var s = st.sel; st.sel = null; sende(s, id);
      return;
    }
    if (st.tool === 'verbinden') {
      if (!st.sel) { st.sel = id; zeichne(); return; }
      if (st.sel === id) { st.sel = null; zeichne(); return; }
      var a = st.sel; st.sel = null; verbinde(a, id); return;
    }
    if (st.tool === 'loeschen') entferne(id);
  }
  svg.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-id]') : null;
    if (el) bedien(el.getAttribute('data-id'));
  });
  svg.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var el = e.target.closest ? e.target.closest('[data-id]') : null;
    if (el) { e.preventDefault(); bedien(el.getAttribute('data-id')); }
  });

  function baue(spec) {   // {knoten: [{name, typ: 'pc'|'switch'|'bus', x, y, w}], kabel: [[name, name], …]}
    var G = { nodes: [], links: [] }, ids = {};
    spec.knoten.forEach(function (k) { var o = { id: nid(), type: k.typ || 'pc', x: k.x, y: k.y, label: k.name }; if (o.type === 'bus') o.w = k.w || 400; ids[k.name] = o.id; G.nodes.push(o); });
    spec.kabel.forEach(function (c) { G.links.push({ id: nid(), a: ids[c[0]], b: ids[c[1]] }); });
    return G;
  }
  function neu(key, n, namen) {
    st.key = key || st.key; st.n = n || st.n; namen = namen || opt.namen;
    st.G = st.key === 'plan' ? baue(opt.plan) : makeGraph(st.key, st.n); st.failed = new Set(); st.sel = null; st.dbl = false; st.heat = false;
    if (st.key === 'plan') { var c0 = classify(st.G); st.key = c0.key && TOPO[c0.key] ? c0.key : 'mixed'; }
    var k = 0;
    if (namen) st.G.nodes.forEach(function (x) { if (x.type === 'pc' && namen[k]) x.label = namen[k++]; else if (x.type === 'pc') k++; });
    if (opt.switchName) st.G.nodes.forEach(function (x) { if (x.type === 'switch' && x.label === 'Switch') x.label = opt.switchName; });
    stoppe(); zeichne();
  }
  st.tool = werkzeuge.filter(function (w) { return WERKZEUG[w] && WERKZEUG[w].modus; })[0] || null;
  neu(st.key, st.n, opt.namen);

  return {
    el: root, stand: stand, ausfall: ausfall, repariere: repariere, sende: sende, neu: neu, kabelVon: kabelVon,
    verbinde: verbinde, entferne: entferne, neuesGeraet: neuesGeraet, loeseAlle: function () { klick('loesen'); },
    erkannt: function () { return classify(st.G); }, kabel: function (a, b) { a = finde(a); b = finde(b); return st.G.links.some(function (l) { return (l.a === a && l.b === b) || (l.a === b && l.b === a); }); },
    geraete: function () { return st.G.nodes.map(function (n) { return { name: n.label, typ: n.type }; }); },
    werkzeug: function (w) { klick(w); },
    sperre: function (b) { st.gesperrt = !!b; st.sel = null; zeichne(); },
    markiere: function (namen) { stoppe(); (namen || []).forEach(function (x) { var id = finde(x); if (!id) return; if (byId(st.G, id)) st.hiN.add(id); else st.hiL.add(id); }); zeichne(); },
    kennzahlen: function () { return metrics(st.G, rs()); },
    graph: function () { return st.G; }
  };
}

/* Netz als SVG-Text (für Hotspot-Fragen): Koordinaten wie im Graphen, viewBox 0 0 800 480 */
function grafik(G, o) {
  o = o || {};
  return '<svg viewBox="0 0 800 480" class="tn-bild" role="img" aria-label="' + esc(o.label || 'Netzplan') + '">' +
    scene(G, { labels: o.labels !== false, color: o.farbe || '#475569' }) + '</svg>';
}
/* Kleines Bild einer Topologie für Bildfragen (ohne Bedienung) */
function bild(key, n, o) {
  o = o || {};
  var G = makeGraph(key, n || 5);
  return '<svg viewBox="0 0 800 480" class="tn-bild" role="img" aria-label="' + esc(o.label || 'Netzplan') + '">' +
    scene(G, { labels: o.labels !== false, color: o.farbe || '#475569', dots: !!o.punkte }) + '</svg>';
}

(function () {
  var css =
    '.tn{--tn-draht:#7b879b;--tn-weg:#2563eb;display:flex;flex-direction:column;gap:6px}' +
    '.tn-bild{--tn-draht:#7b879b;--tn-weg:#2563eb}' +
    '.tn-leiste{display:flex;flex-wrap:wrap;gap:6px;align-items:center}' +
    '.tn-leiste button{min-height:40px}' +
    '.tn-leiste button[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:#fff}' +
    '.tn-hilfe{font-size:.85rem;color:var(--muted);min-height:1.3em}' +
    '.tn-svg{width:100%;display:block;background:var(--card);border:1px solid var(--line);border-radius:12px;touch-action:manipulation}' +
    '.tn-status{display:flex;align-items:center;gap:8px;font-size:.85rem;margin-left:auto}' +
    '.tn-chip{background:var(--card2);border:1px solid var(--line);border-radius:8px;padding:2px 8px}' +
    '.tn-balken{flex:0 0 90px;height:10px;border-radius:5px;background:var(--grid);overflow:hidden}.tn-balken i{display:block;height:100%;transition:width .3s}' +
    '.tn-svg [data-id]{outline:none}.tn-svg [data-id]:focus-visible .hit,.tn-svg [data-id]:focus-visible .pc-body,.tn-svg [data-id]:focus-visible .sw-body{stroke:var(--ink);stroke-width:4}' +
    '.tn-svg [data-id]:focus-visible line.hit{stroke:rgba(26,33,48,.25)}' +
    '.tn-bild{width:100%;max-width:420px;height:auto;display:block;margin:0 auto}' +
    '.tn-svg .link,.tn-bild .link{stroke:var(--tn-draht);stroke-width:3;stroke-linecap:round}' +
    '.tn-bild .link{stroke-width:6}.tn-bild .lbl{font-size:22px}' +
    '.tn-svg .link.hi{stroke:var(--tn-weg);stroke-width:6}' +
    '.tn-svg .link.failed{stroke:var(--bad);stroke-dasharray:9 7;opacity:.85}' +
    '.tn-svg .hit{stroke:transparent;stroke-width:22;cursor:pointer;fill:none}' +
    '.tn-svg .node{cursor:pointer}' +
    '.tn .pc-body,.tn-bild .pc-body{fill:var(--card);stroke:var(--ink-soft);stroke-width:2}' +
    '.tn .pc-stand,.tn-bild .pc-stand{fill:var(--ink-soft)}' +
    '.tn .sw-body,.tn-bild .sw-body{fill:#2b3445;stroke:#0f141c;stroke-width:1.5}' +
    '.tn .port,.tn-bild .port{fill:#4ade80}' +
    '.tn .lbl,.tn-bild .lbl{font-size:20px;fill:var(--ink);text-anchor:middle;font-weight:700;paint-order:stroke;stroke:var(--card);stroke-width:4px;stroke-linejoin:round;pointer-events:none}' +
    '.tn .node.failed{opacity:.42}' +
    '.tn .xmark{stroke:var(--bad);stroke-width:5;stroke-linecap:round;fill:none}' +
    '.tn .halo{fill:none;stroke:var(--tn-weg);stroke-width:3;stroke-dasharray:6 5}' +
    '.tn .hiring{fill:var(--tn-weg);opacity:.18}' +
    '.tn .good{fill:none;stroke:var(--ok);stroke-width:5}' +
    '.tn .heat{opacity:.45}' +
    '.tn .term,.tn-bild .term{fill:#39414f;stroke:#11161e}' +
    '.tn .bus-line,.tn-bild .bus-line{stroke-width:10}' +
    '.tn .busglow{stroke:var(--tn-weg);stroke-width:22;opacity:.25;stroke-linecap:round}' +
    '.tn .arrow{opacity:.85}' +
    '.tn .packet{fill:var(--tn-weg);stroke:#fff;stroke-width:2.5;filter:drop-shadow(0 0 4px rgba(37,99,235,.8))}' +
    '.tn .packet.p-b{fill:#e8862a;filter:drop-shadow(0 0 4px rgba(232,134,42,.8))}' +
    '.tn .spread{stroke:var(--tn-weg);stroke-width:14;opacity:.35;stroke-linecap:round}' +
    '.tn .pulse{fill:none;stroke-width:3}' +
    '.tn .burst{fill:none;stroke:var(--bad);stroke-width:6}' +
    '.tn .bursttxt{font-size:20px;font-weight:800;fill:var(--bad);text-anchor:middle;paint-order:stroke;stroke:var(--card);stroke-width:5px}' +
    '@media (max-width:560px){.tn-balken{flex-basis:90px}}';
  var s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
})();

return { netz: netz, bild: bild, grafik: grafik, TOPO: TOPO, ORDER: ORDER, makeGraph: makeGraph, classify: classify, metrics: metrics, reachStats: reachStats };
})();

/* ---------- quelle/paket.js ---------- */
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

/* ---------- quelle/fragen.md (erzeugt) ---------- */
(function (P, F) { P.fragen = (P.fragen || []).concat(F); })(window.PAKET, [
  {"id": "V1", "lz": "LZ4", "einsatz": ["vorab"], "typ": "mc", "frage": "Sechs PCs an einem Switch: Welche <b>einzelnen<\/b> Ausfälle trennen <b>alle<\/b> PCs voneinander?", "optionen": [{"text": "Der Switch ist defekt.", "richtig": true}, {"text": "Der Stecker vom Netzteil des Switches wird gezogen.", "richtig": true}, {"text": "Das Patchkabel von PC3 bricht.", "feedback": "Dann ist nur PC3 abgeschnitten. Die anderen hängen an ihren eigenen Kabeln."}, {"text": "PC3 wird ausgeschaltet.", "feedback": "Die anderen PCs schicken ihre Daten nicht über PC3, sondern über den Switch."}, {"text": "Zwei PCs senden gleichzeitig.", "feedback": "Der Switch leitet beide Pakete getrennt weiter; im Stern gibt es dadurch keinen Ausfall."}], "erklaerung": "Jeder Weg führt über den Switch. Ist er defekt oder ohne Strom, ist jeder PC allein. Ein Kabel oder ein PC betrifft nur das eigene Gerät."},
  {"id": "V2", "lz": "LZ2", "einsatz": ["vorab"], "typ": "mc", "frage": "Fünf Geräte hängen an einem gemeinsamen Kabel (Bus). Welche Aussagen stimmen?", "optionen": [{"text": "Bricht das gemeinsame Kabel, kann kein Gerät mehr senden.", "richtig": true}, {"text": "Senden zwei Geräte gleichzeitig, sind beide Signale unbrauchbar.", "richtig": true}, {"text": "Fällt ein Gerät aus, fallen alle aus.", "feedback": "Ein Gerät am Bus hört nur mit und leitet nichts weiter. Die anderen merken seinen Ausfall nicht."}, {"text": "Jedes Gerät braucht zwei Netzwerkanschlüsse.", "feedback": "Am Bus hat jedes Gerät genau einen Anschluss an das gemeinsame Kabel."}], "erklaerung": "Alle teilen sich ein Kabel: Bricht es, geht nichts mehr, und gleichzeitiges Senden führt zu Kollisionen. Ein einzelnes Gerät stört die anderen nicht."},
  {"id": "V3", "lz": "LZ4", "einsatz": ["vorab"], "typ": "zahl", "frage": "Einfacher Ring mit <b>5 PCs<\/b>, einer fällt aus: Wie viele PC-Paare können noch Daten austauschen?", "zahl": {"wert": 0}, "typisch": [{"wert": 6, "feedback": "So wäre es, wenn nur der ausgefallene PC fehlt (4 · 3 / 2). Im einfachen Ring hält aber jeder Ausfall alle auf."}, {"wert": 10, "feedback": "10 Paare gibt es mit allen 5 PCs. Einer ist aber ausgefallen – und der Ring ist unterbrochen."}], "erklaerung": "Im einfachen Ring muss das Token einmal ganz herum. Ist der Ring unterbrochen, darf niemand mehr senden: 0 Paare."},
  {"id": "V4", "lz": "LZ3", "einsatz": ["vorab"], "typ": "zahl", "frage": "Wie viele Kabel braucht ein <b>vollvermaschtes<\/b> Netz mit <b>6 Geräten<\/b>?", "zahl": {"wert": 15}, "typisch": [{"wert": 30, "feedback": "Das ist 6 · 5: Jedes Kabel ist dabei doppelt gezählt (einmal von jedem Ende aus)."}, {"wert": 36, "feedback": "Das ist 6 · 6. Ein Gerät braucht aber kein Kabel zu sich selbst."}, {"wert": 6, "feedback": "So viele Kabel hat ein Ring oder ein Stern mit 6 Geräten."}], "erklaerung": "Jedes der 6 Geräte hat 5 Partner: 6 · 5 = 30. Jedes Kabel verbindet zwei Geräte, also 30 / 2 = 15."},
  {"id": "V5", "lz": "LZ4", "einsatz": ["vorab"], "typ": "zuordnen", "frage": "Ein Netz mit einem Core-Switch und je einem Switch für Erdgeschoss und Obergeschoss (Baum). Was passiert bei welchem Ausfall?", "paare": [{"links": "Der Core-Switch fällt aus.", "rechts": "Jedes Stockwerk arbeitet für sich, aber die Stockwerke sind getrennt."}, {"links": "Der Switch im Erdgeschoss fällt aus.", "rechts": "Nur die PCs im Erdgeschoss sind abgeschnitten."}, {"links": "Das Patchkabel eines PCs im Obergeschoss bricht.", "rechts": "Nur dieser eine PC ist abgeschnitten."}], "feedbackFalsch": "Überlege bei jedem Ausfall, welche Wege über dieses Teil führen.", "erklaerung": "Ein Etagen-Switch trägt nur seinen Teilbaum, der Core-Switch verbindet die Teilbäume. Ein Patchkabel betrifft nur ein Gerät."},
  {"id": "V6", "lz": "LZ1", "einsatz": ["vorab"], "typ": "zuordnen", "frage": "Welches Merkmal gehört zu welcher Topologie?", "paare": [{"links": "Jedes Gerät hat genau zwei Nachbarn.", "rechts": "Ring"}, {"links": "Mehrere Switches in Ebenen, ohne Kreis.", "rechts": "Baum"}, {"links": "Mehrere, aber nicht alle Querverbindungen.", "rechts": "Teilvermascht"}, {"links": "Ein gemeinsames Kabel für alle.", "rechts": "Bus"}], "feedbackFalsch": "Achte auf den Verteiler: Gibt es einen, mehrere oder keinen?", "erklaerung": "Ring: zwei Nachbarn. Baum: Verteiler in Ebenen, keine Kreise. Teilvermascht: Querverbindungen, aber nicht alle. Bus: ein Kabel für alle."},
  {"id": "C1", "lz": "LZ4", "einsatz": ["check"], "typ": "mc", "frage": "In der Praxis Lindenhof bricht das Patchkabel am PC im Labor. Was passiert?", "optionen": [{"text": "Nur der Labor-PC ist vom Netz getrennt; alle anderen arbeiten weiter.", "richtig": true}, {"text": "Das ganze Netz fällt aus.", "feedback": "Das passiert nur, wenn der Switch ausfällt. Das Kabel des Labors liegt auf keinem anderen Weg."}, {"text": "Der Labor-PC schickt seine Daten über den Nachbar-PC.", "feedback": "Im Stern sind die PCs nicht untereinander verbunden; jeder Weg führt über den Switch."}, {"text": "Der Switch schaltet sich ab, um Fehler zu vermeiden.", "feedback": "Ein Switch arbeitet an seinen übrigen Ports einfach weiter."}], "erklaerung": "Im Stern hat jedes Gerät sein eigenes Kabel zum Switch. Ein Kabelbruch trennt nur dieses eine Gerät."},
  {"id": "C2", "lz": "LZ1", "einsatz": ["check"], "typ": "mc", "frage": "Woran erkennst du eine <b>Sterntopologie<\/b> im Netzplan?", "optionen": [{"text": "Jedes Gerät ist mit einem eigenen Kabel an genau einen zentralen Verteiler angeschlossen.", "richtig": true}, {"text": "Alle Geräte hängen an einem gemeinsamen, durchgehenden Kabel.", "feedback": "Das ist der Bus: ein Kabel für alle, kein zentraler Verteiler."}, {"text": "Jedes Gerät hat genau zwei Nachbarn.", "feedback": "Das ist der Ring: Die Geräte sind im Kreis verbunden, ohne Verteiler."}, {"text": "Mehrere Switches sind übereinander verbunden.", "feedback": "Das ist ein Baum, also mehrere Sterne in Ebenen."}], "erklaerung": "Typisch für den Stern sind die eigenen Kabel aller Geräte zu einem zentralen Verteiler (Switch)."},
  {"id": "C3", "lz": "LZ2", "einsatz": ["check"], "typ": "mc", "frage": "Warum wird das Labor-Netz langsamer, je mehr Geräte am Bus gleichzeitig senden wollen?", "optionen": [{"text": "Alle teilen sich ein Kabel – es gibt mehr Kollisionen und Wartezeiten.", "richtig": true}, {"text": "Jedes Gerät muss das Signal verstärken.", "feedback": "Das passiert im Ring. Am Bus hört jedes Gerät nur mit."}, {"text": "Der Switch ist überlastet.", "feedback": "Am Bus gibt es keinen Switch."}, {"text": "Das Kabel wird mit jedem Gerät länger.", "feedback": "Die Länge ändert sich nicht. Entscheidend ist, dass immer nur einer senden kann."}], "erklaerung": "Auf dem gemeinsamen Kabel darf immer nur einer senden. Mehr Geräte heißt mehr Kollisionen und mehr Warten (CSMA/CD)."},
  {"id": "C4", "lz": "LZ4", "einsatz": ["check"], "typ": "mc", "frage": "Am Bus des Labors fehlt an einem Ende der Abschlusswiderstand. Was ist die Folge?", "optionen": [{"text": "Signale werden am Kabelende zurückgeworfen; das ganze Netz ist gestört.", "richtig": true}, {"text": "Nur das Gerät am Ende des Kabels ist gestört.", "feedback": "Die zurückgeworfenen Signale laufen über das ganze Kabel und stören alle."}, {"text": "Nichts, der Abschlusswiderstand ist nur Schutz gegen Staub.", "feedback": "Er schließt das Kabel elektrisch ab, damit keine Signale zurückkommen."}], "erklaerung": "Ohne Abschlusswiderstand wird das Signal reflektiert und überlagert sich mit den echten Signalen – kein Gerät kann mehr sauber senden."},
  {"id": "C5", "lz": "LZ2", "einsatz": ["check"], "typ": "mc", "frage": "Was ist ein typischer <b>Vorteil<\/b> des Rings mit Token?", "optionen": [{"text": "Keine Kollisionen – jede Station kommt sicher an die Reihe.", "richtig": true}, {"text": "Der Ausfall einer Station hat keine Folgen.", "feedback": "Im einfachen Ring legt jeder Ausfall alles lahm."}, {"text": "Er braucht am wenigsten Kabel von allen Topologien.", "feedback": "Der Ring braucht n Kabel, genauso viele wie der Stern."}, {"text": "Keine Station muss Daten weiterleiten.", "feedback": "Im Ring leitet jede Station die Daten weiter."}], "erklaerung": "Nur wer das Token hat, sendet. Dadurch gibt es keine Kollisionen und berechenbare Wartezeiten."},
  {"id": "C6", "lz": "LZ4", "einsatz": ["check"], "typ": "mc", "frage": "Was macht einen Ring ausfallsicherer?", "optionen": [{"text": "Ein zweiter Ring, der in die Gegenrichtung läuft (Doppelring)", "richtig": true}, {"text": "Abschlusswiderstände an beiden Enden", "feedback": "Die braucht der Bus. Ein Ring hat keine Enden."}, {"text": "Mehr Stationen im Ring", "feedback": "Jede weitere Station ist eine weitere mögliche Unterbrechung."}, {"text": "Ein Switch in der Mitte", "feedback": "Dann wäre es kein Ring mehr, sondern ein Stern."}], "erklaerung": "Der zweite, gegenläufige Ring schließt die Lücke, wenn eine Station oder ein Kabel ausfällt."},
  {"id": "C7", "lz": "LZ3", "einsatz": ["check"], "typ": "zahl", "frage": "Wie viele Netzwerkanschlüsse braucht <b>jedes<\/b> Gerät in einem vollvermaschten Netz mit <b>8 Geräten<\/b>?", "zahl": {"wert": 7}, "typisch": [{"wert": 8, "feedback": "Ein Gerät braucht keinen Anschluss zu sich selbst."}, {"wert": 28, "feedback": "28 ist die Zahl der Kabel im ganzen Netz, nicht die Anschlüsse eines Geräts."}], "erklaerung": "Jedes Gerät ist mit allen anderen verbunden: n − 1 = 7 Anschlüsse."},
  {"id": "C8", "lz": "LZ2", "einsatz": ["check"], "typ": "mc", "frage": "Die Praxis will Ausfallsicherheit, aber nicht zu viele Leitungen. Welche Lösung passt?", "optionen": [{"text": "Teilvermaschung: einige Querverbindungen, damit es Umwege gibt", "richtig": true}, {"text": "Vollvermaschung: Sie ist immer die beste Lösung.", "feedback": "Sie ist am ausfallsichersten, aber der Kabelaufwand wächst sehr schnell."}, {"text": "Bus: wenig Kabel und trotzdem ausfallsicher", "feedback": "Am Bus legt ein einziger Kabelbruch alles lahm."}, {"text": "Ring ohne Doppelring", "feedback": "Ein einfacher Ring fällt bei jedem Ausfall ganz aus."}], "erklaerung": "Teilvermaschung ist der Kompromiss: Umwege bei Ausfällen, aber deutlich weniger Kabel als Vollvermaschung."},
  {"id": "C9", "lz": "LZ3", "einsatz": ["check"], "typ": "zahl", "frage": "Ein Baum: 1 Core-Switch, 2 Etagen-Switches, 8 PCs. Jedes Gerät hat genau ein Kabel nach oben. Wie viele Kabel sind es?", "zahl": {"wert": 10}, "typisch": [{"wert": 8, "feedback": "Die Uplinks der beiden Etagen-Switches zum Core fehlen."}, {"wert": 11, "feedback": "Der Core-Switch hat kein Kabel nach oben – er ist die Spitze."}], "erklaerung": "Ein Baum hat immer Geräte − 1 Kabel: 11 − 1 = 10 (8 PC-Kabel + 2 Uplinks)."},
  {"id": "C10", "lz": "LZ4", "einsatz": ["check"], "typ": "mc", "frage": "In der Praxis fällt der Switch im Obergeschoss aus. Was passiert?", "optionen": [{"text": "Die PCs im Obergeschoss sind abgeschnitten; das Erdgeschoss arbeitet weiter.", "richtig": true}, {"text": "Das ganze Netz fällt aus.", "feedback": "Das wäre beim Core-Switch so – und auch dann arbeiten die Stockwerke für sich weiter."}, {"text": "Nichts, die PCs nutzen automatisch den Switch im Erdgeschoss.", "feedback": "Die PCs oben haben nur ein Kabel, und das endet am ausgefallenen Switch."}], "erklaerung": "Im Baum trennt ein Etagen-Switch nur seinen eigenen Teilbaum."},
  {"id": "W1", "lz": "LZ4", "einsatz": ["check"], "typ": "mc", "frage": "Zurück zum Bus: Ein Gerät am Bus wird ausgeschaltet, das Kabel bleibt ganz. Was passiert?", "optionen": [{"text": "Die anderen Geräte arbeiten normal weiter.", "richtig": true}, {"text": "Das ganze Netz fällt aus.", "feedback": "Erst ein Bruch des gemeinsamen Kabels legt alles lahm. Ein Gerät hört nur mit."}, {"text": "Der Bus wird automatisch zum Ring.", "feedback": "Die Verkabelung ändert sich nicht."}], "erklaerung": "Die Geräte hängen passiv am Kabel. Fällt eines aus, bleibt der Weg für die anderen frei."},
  {"id": "W2", "lz": "LZ4", "einsatz": ["check"], "typ": "mc", "frage": "Zurück zum Ring: Im <b>einfachen<\/b> Ring fällt eine Station aus. Was ist die Folge?", "optionen": [{"text": "Der Ring ist unterbrochen – niemand kann mehr senden.", "richtig": true}, {"text": "Nur diese Station ist nicht erreichbar.", "feedback": "So wäre es im Stern oder im Doppelring."}, {"text": "Die Daten laufen automatisch in die andere Richtung.", "feedback": "Das kann erst der Doppelring."}], "erklaerung": "Ohne zweiten Ring kann das Token nicht mehr kreisen."},
  {"id": "W3", "lz": "LZ3", "einsatz": ["check"], "typ": "zahl", "frage": "Zurück zur Vermaschung: Wie viele Kabel braucht ein vollvermaschtes Netz mit <b>7 Geräten<\/b>?", "zahl": {"wert": 21}, "typisch": [{"wert": 42, "feedback": "7 · 6 zählt jedes Kabel doppelt. Teile durch 2."}, {"wert": 49, "feedback": "7 · 7: Ein Gerät braucht kein Kabel zu sich selbst."}], "erklaerung": "n · (n − 1) / 2 = 7 · 6 / 2 = 21."},
  {"id": "W4", "lz": "LZ4", "einsatz": ["check"], "typ": "mc", "frage": "Zurück zum Baum: Welches Gerät ist im Baum besonders kritisch?", "optionen": [{"text": "Der Core-Switch, weil er die Teilbäume verbindet", "richtig": true}, {"text": "Der PC am Empfang, weil dort die meisten Daten anfallen", "feedback": "Ein einzelner PC ist für die Wege der anderen egal."}, {"text": "Jeder Etagen-Switch trennt das ganze Netz.", "feedback": "Er trennt nur seinen eigenen Teilbaum."}], "erklaerung": "Fällt der Core-Switch aus, sind alle Teilbäume voneinander getrennt."},
  {"id": "C11", "lz": "LZ1", "einsatz": ["check"], "typ": "mc", "frage": "Ein heutiges Ethernet-Netz, in dem alle PCs eines Klassenzimmers an einem Switch hängen, ist eine …", "optionen": [{"text": "Sterntopologie", "richtig": true}, {"text": "Bustopologie", "feedback": "Busse mit Koaxialkabel sind veraltet. Am Switch hat jeder PC sein eigenes Kabel."}, {"text": "Ringtopologie", "feedback": "Die PCs sind nicht untereinander verbunden."}, {"text": "Vollvermaschung", "feedback": "Dann wäre jeder PC mit jedem anderen direkt verbunden."}], "erklaerung": "Jeder PC hat ein eigenes Kabel zum zentralen Switch – das ist ein Stern."},
  {"id": "C12", "lz": "LZ1", "einsatz": ["check"], "typ": "mc", "frage": "Mehrere Switches hängen an einem zentralen Switch, an ihnen die PCs. Es gibt keine Kreise. Wie heißt diese Topologie?", "optionen": [{"text": "Baum", "richtig": true}, {"text": "Teilvermascht", "feedback": "Teilvermascht hätte Querverbindungen und damit Kreise."}, {"text": "Stern", "feedback": "Ein Stern hat nur einen Verteiler."}, {"text": "Ring", "feedback": "Im Ring gibt es keinen Verteiler; jedes Gerät hat zwei Nachbarn."}], "erklaerung": "Hierarchisch gekoppelte Sterne ohne Kreise ergeben einen Baum (erweiterter Stern)."},
  {"id": "P7", "lz": "LZ1", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "Mehrere Switches sind hierarchisch über einen zentralen Switch verbunden, an ihnen hängen die Endgeräte. Wie heißt diese Topologie?", "optionen": [{"text": "Baum (erweiterter Stern)", "richtig": true}, {"text": "Teilvermascht", "feedback": "Teilvermaschte Netze haben Querverbindungen mit Kreisen; hier gibt es Ebenen ohne Kreise."}, {"text": "Ring", "feedback": "Im Ring gibt es keine Verteiler."}, {"text": "Bus", "feedback": "Am Bus hängen alle an einem Kabel, nicht an Switches."}], "erklaerung": "Hierarchisch gekoppelte Sterne ohne Kreise ergeben eine Baumtopologie."},
  {"id": "P8", "lz": "LZ1", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "Ein modernes Ethernet-LAN, in dem alle PCs an <b>einem<\/b> Switch hängen, ist eine …", "optionen": [{"text": "Sterntopologie", "richtig": true}, {"text": "Bustopologie", "feedback": "Am Switch hat jeder PC ein eigenes Kabel, es gibt kein gemeinsames Kabel."}, {"text": "Ringtopologie", "feedback": "Die PCs reichen keine Daten an Nachbarn weiter."}, {"text": "Vollvermaschung", "feedback": "Die PCs sind nicht direkt miteinander verbunden."}], "erklaerung": "Jedes Gerät hat ein eigenes Kabel zum zentralen Switch – das ist ein Stern."},
  {"id": "P9", "lz": "LZ1", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "Woran erkennt man eine <b>Bustopologie<\/b>?", "optionen": [{"text": "Alle Geräte teilen sich ein durchgehendes Kabel, das an beiden Enden abgeschlossen ist.", "richtig": true}, {"text": "Jedes Gerät hat genau zwei Nachbarn.", "feedback": "Das beschreibt den Ring."}, {"text": "Alle Geräte hängen an einem zentralen Verteiler.", "feedback": "Das beschreibt den Stern."}, {"text": "Jedes Gerät ist mit jedem anderen verbunden.", "feedback": "Das beschreibt die Vollvermaschung."}], "erklaerung": "Typisch für den Bus sind das gemeinsame Kabel und die Abschlusswiderstände an den Enden."},
  {"id": "P10", "lz": "LZ2", "einsatz": ["selbstueberpruefung"], "typ": "zuordnen", "frage": "Ordne jede Aussage der passenden Topologie zu.", "paare": [{"links": "Alle teilen sich ein Kabel – gleichzeitiges Senden führt zu Kollisionen.", "rechts": "Bus"}, {"links": "Ein Token wird von Station zu Station weitergereicht.", "rechts": "Ring"}, {"links": "Fällt der zentrale Verteiler aus, steht das ganze Netz still.", "rechts": "Stern"}, {"links": "Der Kabelaufwand wächst sehr schnell mit der Zahl der Geräte.", "rechts": "Vollvermascht"}], "feedbackFalsch": "Denk bei jeder Aussage an das eine Merkmal, das sie beschreibt: gemeinsames Kabel, Token, Verteiler, jedes mit jedem.", "erklaerung": "Bus: gemeinsames Kabel und Kollisionen. Ring: Token. Stern: zentraler Verteiler als Schwachstelle. Vollvermascht: n · (n − 1) / 2 Kabel."},
  {"id": "P11", "lz": "LZ2", "einsatz": ["selbstueberpruefung"], "typ": "zuordnen", "frage": "Ordne jede Aussage der passenden Topologie zu.", "paare": [{"links": "Typisch für Schul- und Firmennetze mit Core-, Etagen- und Raum-Switches.", "rechts": "Baum"}, {"links": "Das Internet ist ein Beispiel dafür.", "rechts": "Teilvermascht"}, {"links": "Ein fehlender Abschlusswiderstand stört das gesamte Netz.", "rechts": "Bus"}, {"links": "Jede Station frischt das Signal auf und gibt es an ihren Nachbarn weiter.", "rechts": "Ring"}], "feedbackFalsch": "Verteiler in Ebenen → Baum; viele Wege, aber nicht alle → teilvermascht; Kabelenden → Bus; Nachbarn → Ring.", "erklaerung": "Baum: Switches in Ebenen. Internet: teilvermascht. Abschlusswiderstand: Bus. Weiterreichen an den Nachbarn: Ring."},
  {"id": "P12", "lz": "LZ2", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "Welche Aussage ist <b>kein<\/b> Vorteil der Sterntopologie?", "optionen": [{"text": "Es gibt keinen Single Point of Failure.", "richtig": true}, {"text": "Ein defektes Patchkabel betrifft nur ein Gerät.", "feedback": "Das ist ein Vorteil: Jedes Gerät hat sein eigenes Kabel."}, {"text": "Neue Geräte lassen sich einfach anschließen.", "feedback": "Das ist ein Vorteil: einfach ein Kabel zum Switch."}, {"text": "Fehler lassen sich leicht eingrenzen.", "feedback": "Das ist ein Vorteil: Ein Fehler betrifft meist nur ein Kabel."}], "erklaerung": "Der zentrale Switch ist sehr wohl ein Single Point of Failure."},
  {"id": "P13", "lz": "LZ2", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "Warum sinkt die Leistung eines Busnetzes, wenn viele Stationen viel senden?", "optionen": [{"text": "Alle teilen sich ein Kabel – es gibt mehr Kollisionen und Wartezeiten (CSMA/CD).", "richtig": true}, {"text": "Jedes Gerät muss das Signal verstärken.", "feedback": "Verstärken und Weiterreichen gibt es im Ring."}, {"text": "Der Switch ist überlastet.", "feedback": "Am Bus gibt es keinen Switch."}, {"text": "Die Kabel werden automatisch länger.", "feedback": "Die Kabellänge ändert sich nicht."}], "erklaerung": "Im Bus darf immer nur einer senden. Mehr Stationen bedeuten mehr Kollisionen und Wartezeiten."},
  {"id": "P14", "lz": "LZ2", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "Was ist ein typischer Vorteil des Rings mit Token Passing?", "optionen": [{"text": "Kollisionsfreier Zugriff – jede Station kommt sicher an die Reihe.", "richtig": true}, {"text": "Der Ausfall einer Station hat keine Folgen.", "feedback": "Im einfachen Ring legt jeder Ausfall das ganze Netz lahm."}, {"text": "Er ist die günstigste aller Topologien.", "feedback": "Der Bus braucht weniger aktive Technik und ist günstiger."}, {"text": "Keine Station muss Daten weiterleiten.", "feedback": "Gerade im Ring leitet jede Station weiter."}], "erklaerung": "Nur wer das Token hat, sendet – dadurch gibt es keine Kollisionen und berechenbare Wartezeiten."},
  {"id": "P15", "lz": "LZ2", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "Was ist der wichtigste Nachteil der Teilvermaschung?", "optionen": [{"text": "Wegewahl (Routing) und Planung sind aufwendiger.", "richtig": true}, {"text": "Ein einzelner Kabelbruch legt das ganze Netz lahm.", "feedback": "Gerade das verhindert die Vermaschung: Es gibt Umwege."}, {"text": "Sie benötigt Abschlusswiderstände.", "feedback": "Die braucht nur der Bus."}, {"text": "Sie hat den höchsten Kabelbedarf aller Topologien.", "feedback": "Den höchsten Bedarf hat die Vollvermaschung."}], "erklaerung": "Weil es mehrere Wege gibt, muss ein passender Weg gewählt werden – das erfordert Routing."},
  {"id": "P16", "lz": "LZ3", "einsatz": ["selbstueberpruefung"], "typ": "zahl", "frage": "Wie viele Verbindungen benötigt ein vollvermaschtes Netz mit <b>6 Geräten<\/b>?", "zahl": {"wert": 15}, "typisch": [{"wert": 30, "feedback": "6 · 5 zählt jedes Kabel doppelt. Teile durch 2."}, {"wert": 36, "feedback": "6 · 6: Ein Gerät braucht kein Kabel zu sich selbst."}], "erklaerung": "n · (n − 1) / 2 = 6 · 5 / 2 = 15."},
  {"id": "P17", "lz": "LZ3", "einsatz": ["selbstueberpruefung"], "typ": "zahl", "frage": "Wie viele Verbindungen benötigt ein vollvermaschtes Netz mit <b>10 Geräten<\/b>?", "zahl": {"wert": 45}, "typisch": [{"wert": 90, "feedback": "10 · 9 zählt jedes Kabel doppelt. Teile durch 2."}, {"wert": 100, "feedback": "10 · 10: Ein Gerät braucht kein Kabel zu sich selbst."}], "erklaerung": "n · (n − 1) / 2 = 10 · 9 / 2 = 45."},
  {"id": "P18", "lz": "LZ3", "einsatz": ["selbstueberpruefung"], "typ": "zahl", "frage": "Wie viele Netzwerkanschlüsse braucht <b>jedes<\/b> Gerät in einem vollvermaschten Netz mit <b>8 Geräten<\/b>?", "zahl": {"wert": 7}, "typisch": [{"wert": 8, "feedback": "Ein Gerät braucht keinen Anschluss zu sich selbst."}, {"wert": 28, "feedback": "28 ist die Zahl der Kabel im ganzen Netz, nicht die Anschlüsse eines Geräts."}], "erklaerung": "Jedes Gerät ist mit allen anderen verbunden: n − 1 = 7 Anschlüsse."},
  {"id": "P19", "lz": "LZ3", "einsatz": ["selbstueberpruefung"], "typ": "zahl", "frage": "Ein Ring mit 5 PCs soll zu einer Vollvermaschung werden. Wie viele Kabel musst du <b>zusätzlich<\/b> verlegen?", "zahl": {"wert": 5}, "typisch": [{"wert": 10, "feedback": "10 Kabel hat die fertige Vollvermaschung. Der Ring hat aber schon 5."}, {"wert": 20, "feedback": "5 · 4 zählt jedes Kabel doppelt."}], "erklaerung": "Vollvermaschung: 5 · 4 / 2 = 10 Kabel. Der Ring hat bereits 5 – es fehlen 5."},
  {"id": "P20", "lz": "LZ3", "einsatz": ["selbstueberpruefung"], "typ": "zahl", "frage": "Ein Baum besteht aus 1 Core-Switch, 3 Etagen-Switches und 12 PCs. Jeder PC und jeder Etagen-Switch hat genau einen Uplink. Wie viele Kabel werden benötigt?", "zahl": {"wert": 15}, "typisch": [{"wert": 12, "feedback": "Die 3 Uplinks der Etagen-Switches zum Core fehlen."}, {"wert": 16, "feedback": "16 ist die Zahl der Geräte. Ein Baum hat ein Kabel weniger als Geräte."}], "erklaerung": "Ein Baum hat immer Geräte − 1 Kabel: 16 − 1 = 15 (12 PC-Kabel + 3 Uplinks)."},
  {"id": "P21", "lz": "LZ3", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "Du baust einen Stern mit 8 PCs zu einem Ring um. Was ändert sich?", "optionen": [{"text": "Der Switch entfällt, jeder PC braucht zwei Anschlüsse; es bleiben 8 Kabel.", "richtig": true}, {"text": "Man braucht 16 Kabel.", "feedback": "Jedes Kabel verbindet zwei Nachbarn: 8 PCs im Kreis brauchen 8 Kabel."}, {"text": "Jeder PC braucht weiterhin nur einen Anschluss.", "feedback": "Im Ring hat jeder PC zwei Nachbarn, also zwei Anschlüsse."}, {"text": "Es wird ein zweiter Switch benötigt.", "feedback": "Ein Ring kommt ganz ohne Switch aus."}], "erklaerung": "Ring und Stern brauchen beide n Kabel – aber im Ring hat jeder PC zwei Nachbarn."},
  {"id": "P22", "lz": "LZ4", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "In einem einfachen Ring (ohne Doppelring) fällt eine Station aus. Was ist die Folge?", "optionen": [{"text": "Der Ring ist unterbrochen – das gesamte Netz fällt aus.", "richtig": true}, {"text": "Nur diese Station ist nicht erreichbar.", "feedback": "So wäre es im Stern oder im Doppelring."}, {"text": "Die Daten werden automatisch über den Switch umgeleitet.", "feedback": "Ein Ring hat keinen Switch."}, {"text": "Nichts, Ringe sind grundsätzlich ausfallsicher.", "feedback": "Erst der Doppelring überbrückt einen Ausfall."}], "erklaerung": "Ohne zweiten Ring kann das Token nicht mehr kreisen."},
  {"id": "P23", "lz": "LZ4", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "Welche Maßnahme macht eine Ringtopologie ausfallsicherer?", "optionen": [{"text": "Ein Doppelring mit gegenläufiger Datenrichtung", "richtig": true}, {"text": "Abschlusswiderstände an beiden Enden", "feedback": "Die gehören zum Bus; ein Ring hat keine Enden."}, {"text": "Ein Hub in der Mitte", "feedback": "Dann wäre es kein Ring mehr, sondern ein Stern."}, {"text": "Mehr Stationen im Ring", "feedback": "Jede Station ist eine weitere mögliche Unterbrechung."}], "erklaerung": "Der zweite, gegenläufige Ring überbrückt eine Unterbrechung."},
  {"id": "P27", "lz": "LZ4", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "Bei welcher Topologie bleiben nach dem Ausfall eines beliebigen <b>einzelnen Kabels<\/b> garantiert alle Geräte erreichbar?", "optionen": [{"text": "Vollvermascht", "richtig": true}, {"text": "Stern", "feedback": "Bricht ein Patchkabel, ist dieses Gerät abgeschnitten."}, {"text": "Bus", "feedback": "Bricht das gemeinsame Kabel, ist alles weg."}, {"text": "Baum", "feedback": "Bricht ein Uplink, ist der ganze Teilbaum abgeschnitten."}], "erklaerung": "In der Vollvermaschung gibt es zu jeder Verbindung viele Umwege."},
  {"id": "P28", "lz": "LZ4", "einsatz": ["selbstueberpruefung"], "typ": "mc", "frage": "In einem Busnetz fällt ein PC aus, das Bus-Kabel bleibt intakt. Was passiert?", "optionen": [{"text": "Die übrigen Stationen arbeiten normal weiter.", "richtig": true}, {"text": "Das gesamte Netz fällt aus.", "feedback": "Das passiert erst bei einem Bruch des Bus-Kabels."}, {"text": "Der Bus wird automatisch zum Ring.", "feedback": "Die Verkabelung ändert sich nicht."}, {"text": "Alle Stationen müssen neu gestartet werden.", "feedback": "Die anderen merken den Ausfall nicht."}], "erklaerung": "Die Endgeräte sind passiv angeschlossen – der Ausfall eines einzelnen PCs stört die anderen nicht."}
]);
