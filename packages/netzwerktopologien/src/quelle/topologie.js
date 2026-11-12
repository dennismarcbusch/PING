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
