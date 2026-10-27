/* =====================================================================
   Lernpaket-Engine (PING) – setzt den Leitfaden technisch um.
   Diese Datei wird NICHT pro Paket verändert. Inhalte stehen in js/inhalt.js.
   Aufbau: Start (Lernziele, Selbsteinschätzung, Vorwissens-Check) → ① Entdecken
   (Stationen mit Lösungsbeispiel und Kurz-Check) → ② Üben (3 gestufte Tipps,
   Reflexion) → ③ Nachweis (Teil A Handlungsaufgabe, Teil B Fragenpool, 80 %) →
   ④ Abschluss (Auswertung je Lernziel, Selbsteinschätzung nachher, Merkblatt).
   ===================================================================== */
(function () {
  'use strict';
  var P = window.PAKET;
  var haupt = document.getElementById('haupt');
  if (!P) { haupt.textContent = 'Inhalt fehlt: js/inhalt.js wurde nicht geladen.'; return; }
  var BESTEHEN = typeof P.bestehen === 'number' ? P.bestehen : 80;
  var LZ = P.lernziele || [];
  var STATIONEN = P.stationen || [];
  var UEBUNGEN = P.uebungen || [];
  var NW = P.nachweis || {};
  var FR = {};
  (P.fragen || []).forEach(function (f) { FR[f.id] = f; });

  /* ---------- Helfer ---------- */
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === undefined || v === null || v === false) return;
      if (k === 'html') n.innerHTML = v;
      else if (k === 'text') n.textContent = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    (Array.isArray(kids) ? kids : kids === undefined ? [] : [kids]).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mischen(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function lz(id) { for (var i = 0; i < LZ.length; i++) if (LZ[i].id === id) return LZ[i]; return { id: id, text: id, kurz: id }; }
  function msg(text, art) { return el('div', { class: 'msg ' + (art || ''), html: text, role: art === 'bad' ? 'alert' : 'status' }); }
  function zahlLesen(s) { s = String(s || '').trim().replace(/\s/g, '').replace(',', '.'); return s === '' || isNaN(+s) ? null : +s; }
  function norm(s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }
  var BUCHST = 'abcdefghijklmnopqrstuvwxyz';

  /* ---------- SCORM 1.2 ---------- */
  var SC = (function () {
    var api = null, ok = false, fertig = false, t0 = Date.now();
    function find(w) { var n = 0; try { while (w && !w.API && w.parent && w.parent !== w && n < 12) { n++; w = w.parent; } return (w && w.API) ? w.API : null; } catch (_) { return null; } }
    api = find(window);
    if (!api) { try { if (window.opener) api = find(window.opener); } catch (_) {} }
    function get(k) { try { return api ? String(api.LMSGetValue(k)) : ''; } catch (_) { return ''; } }
    function set(k, v) { try { if (api) return String(api.LMSSetValue(k, String(v))) === 'true'; } catch (_) {} return false; }
    function commit() { try { if (api) api.LMSCommit(''); } catch (_) {} }
    if (api) { try { ok = String(api.LMSInitialize('')) === 'true'; } catch (_) { ok = false; } }
    if (ok) { var st = get('cmi.core.lesson_status'); if (st === '' || st === 'not attempted') { set('cmi.core.lesson_status', 'incomplete'); commit(); } }
    function hms(ms) { var t = Math.floor(ms / 1000), h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), x = t % 60; function p(v) { return (v < 10 ? '0' : '') + v; } return p(Math.min(h, 9999)) + ':' + p(m) + ':' + p(x); }
    function finish() { if (!ok || fertig) return; fertig = true; set('cmi.core.session_time', hms(Date.now() - t0)); set('cmi.core.exit', 'suspend'); commit(); try { api.LMSFinish(''); } catch (_) {} }
    window.addEventListener('pagehide', finish);
    window.addEventListener('beforeunload', finish);
    function name() { var n = get('cmi.core.student_name'); if (!n) return ''; var p = n.split(','); return p.length === 2 ? (p[1].trim() + ' ' + p[0].trim()) : n; }
    return { aktiv: ok, get: get, set: set, commit: commit, name: name };
  })();

  /* ---------- Speicher (suspend_data, max. 4096 Zeichen) ---------- */
  var KEY = 'lernpaket-' + (P.id || 'ohne-id');
  var S = { se: {}, sn: {}, st: {}, ue: {}, best: null, lz: {}, n: 0, skip: [] };
  (function laden() {
    var o = {};
    try { var s = SC.aktiv ? SC.get('cmi.suspend_data') : localStorage.getItem(KEY); o = s ? JSON.parse(s) : {}; } catch (_) { o = {}; }
    Object.keys(S).forEach(function (k) { if (o[k] !== undefined) S[k] = o[k]; });
  })();
  function speichern() {
    var d = JSON.stringify(S);
    if (d.length > 3800) console.warn('suspend_data wird knapp: ' + d.length + ' Zeichen (Grenze 4096).');
    if (SC.aktiv) { SC.set('cmi.suspend_data', d); SC.commit(); return; }
    try { localStorage.setItem(KEY, d); } catch (_) {}
  }

  /* ---------- Inhalt prüfen (für Autor:innen und automatische Tests) ---------- */
  function pruefeInhalt() {
    var fehler = [], hinweise = [], ids = {};
    function id(x, wo) { if (!x) fehler.push(wo + ': id fehlt'); else if (ids[x]) fehler.push('Doppelte id: ' + x); else ids[x] = 1; }
    if (!P.id || !/^ping-[a-z0-9-]+$/.test(P.id)) hinweise.push('PAKET.id sollte "ping-<name>" lauten (wie der Manifest-Identifier).');
    if (BESTEHEN !== 80) hinweise.push('Bestehensgrenze ist ' + BESTEHEN + ' %, der Leitfaden sieht 80 % vor.');
    if (LZ.length < 3 || LZ.length > 8) hinweise.push('Leitfaden: drei bis acht Lernziele (jetzt ' + LZ.length + ').');
    LZ.forEach(function (z) { id(z.id, 'Lernziel'); if (!/^Ich kann/.test(z.text || '')) hinweise.push(z.id + ': Lernziel in Schülersprache beginnen („Ich kann …“).'); });
    (P.fragen || []).forEach(function (f) {
      id(f.id, 'Frage');
      if (!FR[f.id] || !lzIds()[f.lz]) fehler.push(f.id + ': Lernziel "' + f.lz + '" gibt es nicht.');
      if (!f.erklaerung) hinweise.push(f.id + ': Erklärung fehlt (Feedback, das erklärt).');
      if (f.typ === 'mc') {
        var r = (f.optionen || []).filter(function (o) { return o.richtig; }).length;
        if (!r) fehler.push(f.id + ': keine Option ist richtig.');
        (f.optionen || []).forEach(function (o, i) { if (!o.richtig && !o.feedback) hinweise.push(f.id + ': Falschantwort ' + BUCHST[i] + ' ohne eigenes Feedback.'); });
      } else if (f.typ === 'zuordnen') { if (!f.paare || f.paare.length < 2) fehler.push(f.id + ': mindestens zwei Paare nötig.'); }
      else if (f.typ === 'zahl') { if (!f.zahl || typeof f.zahl.wert !== 'number') fehler.push(f.id + ': zahl.wert fehlt.'); }
      else if (f.typ === 'text') { if (!f.akzeptiert || !f.akzeptiert.length) fehler.push(f.id + ': akzeptiert fehlt.'); }
      else if (f.typ === 'hotspot') { if (!f.svg || !f.bereiche || f.bereiche.filter(function (b) { return b.richtig; }).length !== 1) fehler.push(f.id + ': Hotspot braucht svg und genau einen richtigen Bereich.'); }
      else fehler.push(f.id + ': unbekannter Fragetyp "' + f.typ + '".');
    });
    STATIONEN.forEach(function (s, i) {
      id(s.id, 'Station ' + (i + 1));
      if (!s.auftrag) hinweise.push(s.id + ': Auftrag aus der Leitsituation fehlt.');
      var c = (s.check || []);
      c.forEach(function (q) { if (!FR[q]) fehler.push(s.id + ': Kurz-Check-Frage ' + q + ' gibt es nicht.'); });
      if (c.length < 3 || c.length > 5) hinweise.push(s.id + ': Kurz-Check mit 3–5 Fragen (jetzt ' + c.length + ').');
    });
    UEBUNGEN.forEach(function (u, i) {
      id(u.id, 'Übung ' + (i + 1));
      if (u.frage && !FR[u.frage]) fehler.push(u.id + ': Frage ' + u.frage + ' gibt es nicht.');
      if (!u.frage && !u.interaktion) fehler.push(u.id + ': braucht frage oder interaktion.');
      if (!u.tipps || u.tipps.length !== 3) hinweise.push(u.id + ': genau drei gestufte Tipps vorgesehen.');
      if (!u.reflexion || !u.reflexion.muster) hinweise.push(u.id + ': Reflexionsfrage mit Musterantwort fehlt.');
    });
    var pro = (NW.teilB && NW.teilB.proLZ) || 2;
    LZ.forEach(function (z) {
      var n = (P.fragen || []).filter(function (f) { return f.lz === z.id && (f.einsatz || []).indexOf('nachweis') >= 0; }).length;
      if (n < pro) fehler.push(z.id + ': nur ' + n + ' Nachweis-Fragen, nötig sind ' + pro + '.');
      else if (n < pro + 2) hinweise.push(z.id + ': Pool klein (' + n + ' Nachweis-Fragen) – Wiederholungen ziehen oft dieselben Fragen.');
    });
    if (!NW.teilA) hinweise.push('Nachweis ohne Teil A (Handlungsaufgabe in neuer Situation).');
    if (!P.merkblatt || !P.merkblatt.length) hinweise.push('Kein Merkblatt (P13, Soll).');
    else LZ.forEach(function (z) { if (!P.merkblatt.some(function (m) { return m.lz === z.id; })) hinweise.push('Merkblatt ohne Abschnitt zu ' + z.id + '.'); });
    (P.selbsttest || []).forEach(function (q) { if (!FR[q]) fehler.push('Selbsttest-Frage ' + q + ' gibt es nicht.'); });
    return { fehler: fehler, hinweise: hinweise };
  }
  function lzIds() { var o = {}; LZ.forEach(function (z) { o[z.id] = 1; }); return o; }

  /* ---------- Fragen-Baustein ---------- */
  // modus 'lernen': Prüfen-Knopf, Feedback direkt an der Antwort, Nochmal, Lösung zeigen.
  // modus 'pruefung': kein Feedback; bewerten() liefert {score 0..1, antwort}.
  function frage(f, modus, opt) {
    opt = opt || {};
    var box = el('div', { class: 'frage', 'data-frage': f.id });
    box.appendChild(el('div', { class: 'ftext', html: (opt.nr ? opt.nr + '. ' : '') + f.frage }));
    if (f.bild) box.appendChild(el('div', { class: 'bild', html: f.bild }));
    var E = eingabe(f, box);
    var fb = el('div', { 'aria-live': 'polite' });
    box.appendChild(fb);
    var api = { el: box, f: f, bewerten: E.bewerten, beantwortet: E.beantwortet, loesungEinsetzen: E.loesung, auswerten: function () { E.markieren(true); } };
    if (modus === 'lernen') {
      var kn = el('div', { class: 'knoepfe' });
      var bPruefen = el('button', { type: 'button', class: 'pruefen', text: '✔ Prüfen' });
      var bNochmal = el('button', { type: 'button', text: '↺ Nochmal', hidden: true });
      var bLoesung = el('button', { type: 'button', text: 'Lösung zeigen', hidden: true });
      kn.appendChild(bPruefen); kn.appendChild(bNochmal); kn.appendChild(bLoesung);
      box.appendChild(kn);
      bPruefen.addEventListener('click', function () {
        if (!E.beantwortet()) { fb.innerHTML = ''; fb.appendChild(msg('Wähle oder gib zuerst eine Antwort ein.', 'warn')); return; }
        var r = E.bewerten();
        E.markieren(false); E.sperren(true);
        fb.innerHTML = '';
        var richtig = r.score >= 1;
        var t = (richtig ? '<b>Richtig.</b> ' : r.score > 0 ? '<b>Teilweise richtig.</b> ' : '<b>Noch nicht.</b> ') + (E.feedback(r) || '');
        if (f.erklaerung && (richtig || opt.erklaerungImmer)) t += ' ' + f.erklaerung;
        if (!richtig && f.hinweis) t += ' <span class="klein">Tipp: ' + f.hinweis + '</span>';
        fb.appendChild(msg(t, richtig ? 'ok' : 'bad'));
        bPruefen.hidden = true; bNochmal.hidden = richtig; bLoesung.hidden = richtig;
        if (opt.beiPruefung) opt.beiPruefung(r);
      });
      bNochmal.addEventListener('click', function () { E.zuruecksetzen(); E.sperren(false); fb.innerHTML = ''; bPruefen.hidden = false; bNochmal.hidden = true; bLoesung.hidden = true; });
      bLoesung.addEventListener('click', function () {
        E.zuruecksetzen(); E.loesung(); E.markieren(true); E.sperren(true);
        fb.innerHTML = ''; fb.appendChild(msg('<b>Lösung:</b> ' + (f.erklaerung || ''), 'warn'));
        bLoesung.hidden = true; bNochmal.hidden = false;
      });
    }
    api.feedbackNachher = function () { var r = E.bewerten(); E.markieren(true); E.sperren(true); fb.innerHTML = ''; fb.appendChild(msg((r.score >= 1 ? '<b>Richtig.</b> ' : '<b>Nicht richtig.</b> ') + (E.feedback(r) || '') + ' ' + (f.erklaerung || ''), r.score >= 1 ? 'ok' : 'bad')); };
    return api;
  }

  function eingabe(f, box) {
    var name = 'q' + Math.random().toString(36).slice(2);
    if (f.typ === 'mc') {
      var mehr = f.optionen.filter(function (o) { return o.richtig; }).length > 1 || f.mehrfach;
      if (mehr) box.appendChild(el('div', { class: 'klein', text: 'Kreuze alle richtigen Antworten an.' }));
      var ops = f.optionen.map(function (o, i) { return { o: o, i: i }; });
      if (f.mischen !== false) ops = mischen(ops);
      var rows = ops.map(function (x) {
        var inp = el('input', { type: mehr ? 'checkbox' : 'radio', name: name, value: x.i });
        var lab = el('label', { class: 'opt' }, [inp, el('span', { html: x.o.text })]);
        var ofb = el('span', { class: 'ofb', hidden: true });
        var wrap = el('div', {}, [lab, ofb]);
        box.appendChild(wrap);
        return { x: x, inp: inp, lab: lab, ofb: ofb };
      });
      return {
        beantwortet: function () { return rows.some(function (r) { return r.inp.checked; }); },
        bewerten: function () {
          var nR = 0, rg = 0, fg = 0, sel = [];
          rows.forEach(function (r) { if (r.x.o.richtig) nR++; if (r.inp.checked) { sel.push(BUCHST[r.x.i]); if (r.x.o.richtig) rg++; else fg++; } });
          var score = mehr ? Math.max(0, (rg - fg) / nR) : (fg === 0 && rg === 1 ? 1 : 0);
          return { score: Math.round(score * 100) / 100, antwort: sel.sort().join(','), typ: 'choice' };
        },
        markieren: function (alles) {
          rows.forEach(function (r) {
            r.lab.classList.remove('richtig', 'falsch'); r.ofb.hidden = true;
            if (r.inp.checked) { r.lab.classList.add(r.x.o.richtig ? 'richtig' : 'falsch'); if (r.x.o.feedback) { r.ofb.innerHTML = r.x.o.feedback; r.ofb.hidden = false; } }
            else if (alles && r.x.o.richtig) r.lab.classList.add('richtig');
          });
        },
        feedback: function () { return ''; },
        sperren: function (b) { rows.forEach(function (r) { r.inp.disabled = b; }); },
        zuruecksetzen: function () { rows.forEach(function (r) { r.inp.checked = false; r.lab.classList.remove('richtig', 'falsch'); r.ofb.hidden = true; }); },
        loesung: function () { rows.forEach(function (r) { r.inp.checked = !!r.x.o.richtig; }); }
      };
    }
    if (f.typ === 'zuordnen') {
      var rechts = mischen(f.paare.map(function (p) { return p.rechts; }));
      var grid = el('div', { class: 'zuordnen' });
      var sels = f.paare.map(function (p, i) {
        var s = el('select', { 'aria-label': 'Zuordnung für ' + p.links.replace(/<[^>]+>/g, '') }, [el('option', { value: '', text: '– wählen –' })].concat(rechts.map(function (r) { return el('option', { value: r, html: r }); })));
        grid.appendChild(el('div', { html: p.links })); grid.appendChild(s);
        return s;
      });
      box.appendChild(grid);
      return {
        beantwortet: function () { return sels.every(function (s) { return s.value; }); },
        bewerten: function () { var ok = 0; sels.forEach(function (s, i) { if (s.value === f.paare[i].rechts) ok++; }); return { score: Math.round(ok / sels.length * 100) / 100, antwort: sels.map(function (s, i) { return (i + 1) + '.' + (rechts.indexOf(s.value) + 1); }).join(','), typ: 'matching' }; },
        markieren: function () { sels.forEach(function (s, i) { s.style.borderColor = s.value === f.paare[i].rechts ? 'var(--ok)' : 'var(--bad)'; }); },
        feedback: function (r) { return r.score >= 1 ? (f.feedbackRichtig || '') : (f.feedbackFalsch || 'Rot markierte Zuordnungen stimmen noch nicht.'); },
        sperren: function (b) { sels.forEach(function (s) { s.disabled = b; }); },
        zuruecksetzen: function () { sels.forEach(function (s) { s.value = ''; s.style.borderColor = ''; }); },
        loesung: function () { sels.forEach(function (s, i) { s.value = f.paare[i].rechts; }); }
      };
    }
    if (f.typ === 'zahl' || f.typ === 'text') {
      var inp = el('input', { type: 'text', inputmode: f.typ === 'zahl' ? 'decimal' : 'text', 'aria-label': 'Antwort', autocomplete: 'off', size: f.typ === 'zahl' ? 10 : 30 });
      box.appendChild(el('div', {}, [inp, f.zahl && f.zahl.einheit ? ' ' + f.zahl.einheit : '']));
      function richtig() {
        if (f.typ === 'zahl') { var v = zahlLesen(inp.value); return v !== null && Math.abs(v - f.zahl.wert) <= (f.zahl.toleranz || 0); }
        return f.akzeptiert.some(function (a) { return norm(a) === norm(inp.value); });
      }
      return {
        beantwortet: function () { return inp.value.trim() !== ''; },
        bewerten: function () { return { score: richtig() ? 1 : 0, antwort: inp.value.trim().slice(0, 200), typ: f.typ === 'zahl' ? 'numeric' : 'fill-in' }; },
        markieren: function () { inp.style.borderColor = richtig() ? 'var(--ok)' : 'var(--bad)'; },
        feedback: function (r) {
          if (r.score >= 1) return '';
          var t = (f.typisch || []).filter(function (x) { return f.typ === 'zahl' ? zahlLesen(inp.value) === x.wert : norm(inp.value) === norm(x.antwort); })[0];
          return t ? t.feedback : (f.feedbackFalsch || '');
        },
        sperren: function (b) { inp.disabled = b; },
        zuruecksetzen: function () { inp.value = ''; inp.style.borderColor = ''; },
        loesung: function () { inp.value = f.typ === 'zahl' ? String(f.zahl.wert).replace('.', ',') : f.akzeptiert[0]; }
      };
    }
    if (f.typ === 'hotspot') {
      var hb = el('div', { class: 'hotspot', html: f.svg });
      var svg = hb.querySelector('svg');
      var gew = null, NS = 'http://www.w3.org/2000/svg';
      var rs = f.bereiche.map(function (b, i) {
        var r = document.createElementNS(NS, b.r ? 'circle' : 'rect');
        if (b.r) { r.setAttribute('cx', b.cx); r.setAttribute('cy', b.cy); r.setAttribute('r', b.r); }
        else { r.setAttribute('x', b.x); r.setAttribute('y', b.y); r.setAttribute('width', b.w); r.setAttribute('height', b.h); r.setAttribute('rx', 6); }
        r.setAttribute('class', 'bereich'); r.setAttribute('tabindex', '0'); r.setAttribute('role', 'button');
        r.setAttribute('aria-label', b.label || ('Bereich ' + (i + 1)));
        function waehle() { if (r.getAttribute('aria-disabled') === 'true') return; gew = i; rs.forEach(function (x) { x.classList.remove('gewaehlt'); }); r.classList.add('gewaehlt'); }
        r.addEventListener('click', waehle);
        r.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); waehle(); } });
        svg.appendChild(r);
        return r;
      });
      box.appendChild(hb);
      return {
        beantwortet: function () { return gew !== null; },
        bewerten: function () { return { score: gew !== null && f.bereiche[gew].richtig ? 1 : 0, antwort: gew === null ? '' : BUCHST[gew], typ: 'choice' }; },
        markieren: function (alles) { rs.forEach(function (r, i) { r.classList.remove('richtig', 'falsch'); if (i === gew) r.classList.add(f.bereiche[i].richtig ? 'richtig' : 'falsch'); else if (alles && f.bereiche[i].richtig) r.classList.add('richtig'); }); },
        feedback: function (r) { return gew !== null && f.bereiche[gew].feedback ? f.bereiche[gew].feedback : ''; },
        sperren: function (b) { rs.forEach(function (r) { r.setAttribute('aria-disabled', b ? 'true' : 'false'); }); },
        zuruecksetzen: function () { gew = null; rs.forEach(function (r) { r.classList.remove('gewaehlt', 'richtig', 'falsch'); }); },
        loesung: function () { f.bereiche.forEach(function (b, i) { if (b.richtig) { gew = i; rs[i].classList.add('gewaehlt'); } }); }
      };
    }
    box.appendChild(msg('Unbekannter Fragetyp: ' + esc(f.typ), 'bad'));
    return { beantwortet: function () { return true; }, bewerten: function () { return { score: 0, antwort: '', typ: 'other' }; }, markieren: function () {}, feedback: function () { return ''; }, sperren: function () {}, zuruecksetzen: function () {}, loesung: function () {} };
  }

  /* ---------- Rahmen: Kopf, Tabs, Leiste ---------- */
  var ANSICHT = { teil: 'start', i: 0 };
  var TEILE = [
    { id: 'start', name: 'Start' },
    { id: 'entdecken', name: '① Entdecken' },
    { id: 'ueben', name: '② Üben' },
    { id: 'nachweis', name: '③ Nachweis' },
    { id: 'abschluss', name: '④ Abschluss' }
  ];
  var nwLauf = null;      // laufender Nachweis-Versuch (nicht gespeichert)
  var letzterVersuch = null; // Ergebnis des letzten Versuchs in dieser Sitzung
  var testHaken = [];     // Objekte aktueller Interaktionen (für automatische Tests)

  function zeige(teil, i) {
    if (teil !== 'nachweis' && nwLauf && nwLauf.phase !== 'fertig') nwLauf = null;
    ANSICHT = { teil: teil, i: i || 0 };
    render();
    haupt.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  function anzahl(o) { return Object.keys(o).filter(function (k) { return o[k]; }).length; }
  function kopf() {
    document.getElementById('titel').textContent = P.titel || '';
    document.getElementById('untertitel').textContent = P.untertitel || '';
    document.title = P.titel || 'Lernpaket';
    var fp = document.getElementById('fortschritt'); fp.innerHTML = '';
    var st = STATIONEN.filter(function (s) { return S.st[s.id]; }).length;
    var ue = UEBUNGEN.filter(function (u) { return S.ue[u.id]; }).length;
    fp.appendChild(el('span', { class: 'chip' + (st === STATIONEN.length && st ? ' ok' : ''), text: 'Entdecken ' + st + '/' + STATIONEN.length }));
    fp.appendChild(el('span', { class: 'chip' + (ue === UEBUNGEN.length && ue ? ' ok' : ''), text: 'Üben ' + ue + '/' + UEBUNGEN.length }));
    if (S.n) {
      var erreicht = LZ.filter(function (z) { return (S.lz[z.id] || 0) >= 80; }).length;
      fp.appendChild(el('span', { class: 'chip' + (erreicht === LZ.length ? ' ok' : ''), text: erreicht + ' von ' + LZ.length + ' Lernzielen erreicht' }));
    }
    var tabs = document.getElementById('tabs'); tabs.innerHTML = '';
    TEILE.forEach(function (t) {
      tabs.appendChild(el('button', { type: 'button', class: ANSICHT.teil === t.id ? 'aktiv' : '', 'aria-current': ANSICHT.teil === t.id ? 'page' : null, text: t.name, onclick: function () { zeige(t.id, 0); } }));
    });
    var fuss = document.getElementById('fuss');
    fuss.textContent = (P.titel || '') + (P.version ? ' · Version ' + P.version : '') + ' · ' + (SC.aktiv ? 'Fortschritt wird in der Lernplattform gespeichert.' : 'Ohne Lernplattform geöffnet: Fortschritt nur in diesem Browser, keine Übertragung von Ergebnissen.');
  }
  function leiste(info, label, aktion, extra) {
    var l = document.getElementById('leiste'); l.innerHTML = '';
    l.appendChild(el('div', { class: 'info', html: info || '' }));
    if (extra) l.appendChild(extra);
    if (label) l.appendChild(el('button', { type: 'button', class: 'primaer', id: 'weiter', html: label, onclick: aktion }));
  }
  function auftrag(text, leitfrage, was) {
    return el('div', { class: 'auftrag' }, [el('span', { class: 'was', text: was || 'Dein Auftrag' }), el('span', { html: text }), leitfrage ? el('div', { class: 'klein', html: '<b>Leitfrage:</b> ' + leitfrage }) : null]);
  }
  function figur(text) {
    var fg = P.figur || {};
    var ini = (fg.name || '?').split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2);
    return el('div', { class: 'figur' }, [el('div', { class: 'avatar', 'aria-hidden': 'true', text: ini }), el('div', { class: 'blase' }, [fg.name ? el('div', { class: 'name', text: fg.name + (fg.rolle ? ' · ' + fg.rolle : '') }) : null, el('div', { html: text })])]);
  }
  function naechsteStation(i) { return i + 1 < STATIONEN.length ? { t: 'entdecken', i: i + 1, label: 'Weiter zu Station ' + (i + 2) + ': ' + esc(STATIONEN[i + 1].titel) + ' →' } : { t: 'ueben', i: 0, label: 'Weiter zu ② Üben →' }; }
  function naechsteUebung(i) { return i + 1 < UEBUNGEN.length ? { t: 'ueben', i: i + 1, label: 'Weiter zu Übung ' + (i + 2) + ' →' } : { t: 'nachweis', i: 0, label: 'Weiter zu ③ Nachweis →' }; }

  function render() {
    kopf();
    testHaken = [];
    haupt.innerHTML = '';
    var pr = pruefeInhalt();
    if (pr.fehler.length) haupt.appendChild(msg('<b>Hinweis für Autor:innen – der Inhalt hat Fehler:</b><br>' + pr.fehler.map(esc).join('<br>'), 'bad'));
    ({ start: vStart, entdecken: vStation, ueben: vUebung, nachweis: vNachweis, abschluss: vAbschluss }[ANSICHT.teil])();
  }

  /* ---------- Start ---------- */
  var startHinweisGezeigt = false;
  function skala(werte, key, lzid, onChange) {
    var stufen = ['1 noch gar nicht', '2', '3', '4', '5 sicher'];
    var g = el('div', { class: 'skala', role: 'radiogroup', 'aria-label': 'Selbsteinschätzung ' + lzid });
    stufen.forEach(function (s, i) {
      var inp = el('input', { type: 'radio', name: key + lzid, value: i + 1 });
      if (werte[lzid] === i + 1) inp.checked = true;
      inp.addEventListener('change', function () { werte[lzid] = i + 1; speichern(); if (onChange) onChange(); });
      g.appendChild(el('label', {}, [inp, el('span', { text: s })]));
    });
    return g;
  }
  function vStart() {
    var c = el('div', { class: 'card' });
    c.appendChild(el('h2', { text: 'Worum es geht' }));
    if (P.leitsituation) c.appendChild(figur(P.leitsituation));
    c.appendChild(el('h3', { text: 'So läuft das Lernpaket ab' }));
    c.appendChild(el('ul', {}, [
      el('li', { html: '<b>① Entdecken:</b> ' + STATIONEN.length + ' Stationen mit Beispiel und Kurz-Check <span class="badge zaehlt-nicht">zählt nicht</span>' }),
      el('li', { html: '<b>② Üben:</b> ' + UEBUNGEN.length + ' Aufgaben mit Tipps <span class="badge zaehlt-nicht">zählt nicht</span>' }),
      el('li', { html: '<b>③ Nachweis:</b> ohne Hilfe, bestanden ab ' + BESTEHEN + ' %, beliebig oft wiederholbar, das beste Ergebnis zählt' }),
      el('li', { html: '<b>④ Abschluss:</b> Auswertung je Lernziel und Merkblatt zum Mitnehmen' })
    ]));
    if (P.dauer) c.appendChild(el('p', { class: 'klein', text: 'Dauer: ' + P.dauer + '. Du kannst jederzeit aufhören, dein Stand bleibt erhalten.' }));
    haupt.appendChild(c);

    var z = el('div', { class: 'card' });
    z.appendChild(el('h2', { text: 'Deine Lernziele' }));
    z.appendChild(el('p', { text: 'Lies jedes Ziel und schätze ehrlich ein, wie sicher du schon bist. Am Ende vergleichst du mit deinem Ergebnis.' }));
    LZ.forEach(function (l) {
      z.appendChild(el('div', { class: 'lzzeile se' }, [el('div', { html: '<b>' + esc(l.id) + '</b> ' + l.text }), skala(S.se, 'se', l.id, function () { kopf(); })]));
    });
    haupt.appendChild(z);

    if (P.vorwissen && P.vorwissen.length) {
      var v = el('details', { class: 'card' });
      v.appendChild(el('summary', { text: 'Kennst du dich schon aus? Freiwilliger Vorwissens-Check' }));
      v.appendChild(el('p', { class: 'klein', text: 'Wer hier sicher ist, bekommt eine Empfehlung, welche Stationen er überspringen kann. Alle Stationen bleiben erreichbar.' }));
      var qs = P.vorwissen.map(function (id, k) { var q = frage(FR[id], 'pruefung', { nr: k + 1 }); v.appendChild(q.el); testHaken.push({ art: 'frage', obj: q }); return q; });
      var erg = el('div');
      v.appendChild(el('button', { type: 'button', text: 'Vorwissens-Check auswerten', onclick: function () {
        var proLz = {};
        qs.forEach(function (q) { var r = q.bewerten(); q.feedbackNachher(); var k = q.f.lz; proLz[k] = proLz[k] || { n: 0, ok: 0 }; proLz[k].n++; if (r.score >= 1) proLz[k].ok++; });
        var sicher = Object.keys(proLz).filter(function (k) { return proLz[k].ok === proLz[k].n; });
        S.skip = STATIONEN.filter(function (s) { return (s.lz || []).length && s.lz.every(function (x) { return sicher.indexOf(x) >= 0; }); }).map(function (s) { return s.id; });
        speichern();
        erg.innerHTML = '';
        erg.appendChild(msg(S.skip.length ? '<b>Empfehlung:</b> Du kannst diese Stationen überspringen oder nur überfliegen: ' + S.skip.map(function (id) { var s = STATIONEN.filter(function (x) { return x.id === id; })[0]; return esc(s.titel); }).join(', ') + '. Der Nachweis ist für alle gleich.' : 'Arbeite die Stationen der Reihe nach durch – sie bringen dir noch etwas.', 'ok'));
      } }));
      v.appendChild(erg);
      haupt.appendChild(v);
    }
    var ziel = STATIONEN.length ? 'Los geht’s: Station 1 →' : 'Los geht’s →';
    leiste('Schätze dich zu jedem Lernziel ein, dann geht es los.', ziel, function () {
      var fehlt = LZ.filter(function (l) { return !S.se[l.id]; }).length;
      if (fehlt && !startHinweisGezeigt) { startHinweisGezeigt = true; z.appendChild(msg('Du hast ' + fehlt + ' Lernziel(e) noch nicht eingeschätzt. Das dauert nur einen Moment und hilft dir am Ende beim Vergleich. Du kannst aber auch direkt weiter.', 'warn')); z.scrollIntoView({ behavior: 'smooth', block: 'end' }); return; }
      zeige('entdecken', 0);
    });
  }

  /* ---------- ① Entdecken ---------- */
  function seitenliste(items, aktiv, teil, erledigt, praefix) {
    var ul = el('ul', { class: 'liste', 'aria-label': praefix });
    items.forEach(function (s, i) {
      var skip = S.skip.indexOf(s.id) >= 0 && !erledigt[s.id];
      ul.appendChild(el('li', {}, el('button', { type: 'button', class: i === aktiv ? 'aktiv' : '', 'aria-current': i === aktiv ? 'step' : null, onclick: function () { zeige(teil, i); } }, [
        el('span', { class: 'haken', 'aria-hidden': 'true', text: erledigt[s.id] ? '✓' : String(i + 1) }),
        el('span', { html: esc(s.titel) + (erledigt[s.id] ? '<span class="klein"> · erledigt</span>' : skip ? '<span class="klein"> · darfst du überspringen</span>' : '') })
      ])));
    });
    return el('nav', { class: 'card' }, [el('div', { class: 'klein', text: praefix }), ul]);
  }
  function vStation() {
    if (!STATIONEN.length) { haupt.appendChild(msg('Keine Stationen vorhanden.', 'warn')); return; }
    var i = Math.min(ANSICHT.i, STATIONEN.length - 1), s = STATIONEN[i];
    var r = el('div', { class: 'raster' + (s.steckbrief ? ' mit-seite' : '') });
    r.appendChild(seitenliste(STATIONEN, i, 'entdecken', S.st, 'Stationen'));
    var m = el('div', { class: 'card' });
    m.appendChild(el('div', { class: 'klein', text: 'Station ' + (i + 1) + ' von ' + STATIONEN.length + ((s.lz || []).length ? ' · ' + s.lz.join(', ') : '') }));
    m.appendChild(el('h2', { text: s.titel }));
    m.appendChild(auftrag(s.auftrag || '', s.leitfrage));
    if (s.bild) m.appendChild(el('div', { class: 'bild', html: s.bild }));
    if (s.inhalt) m.appendChild(el('div', { html: s.inhalt }));
    if (s.beispiel) {
      var bsp = el('details', { class: 'beispiel' });
      if (S.skip.indexOf(s.id) < 0) bsp.open = true;
      bsp.appendChild(el('summary', { text: 'Gelöstes Beispiel: ' + (s.beispiel.titel || '') + ' (überspringbar)' }));
      if (s.beispiel.aufgabe) bsp.appendChild(el('p', { html: s.beispiel.aufgabe }));
      bsp.appendChild(el('ol', {}, (s.beispiel.schritte || []).map(function (x) { return el('li', {}, [el('div', { html: x.tun }), x.warum ? el('div', { class: 'warum', html: 'Warum: ' + x.warum }) : null]); })));
      m.appendChild(bsp);
    }
    if (s.vertiefung) m.appendChild(el('details', {}, [el('summary', { text: 'Genauer erklärt (aufklappen)' }), el('div', { html: s.vertiefung })]));
    var fertigMeldung = el('div', { 'aria-live': 'polite' });
    var nx = naechsteStation(i);
    var status = { interaktion: !s.interaktion, check: !(s.check || []).length };
    function pruefeFertig() {
      if (status.interaktion && status.check && !S.st[s.id]) {
        S.st[s.id] = 1; speichern(); kopf();
        fertigMeldung.innerHTML = '';
        fertigMeldung.appendChild(msg('🎉 <b>Geschafft!</b> ' + nx.label.replace(' →', '') + '.', 'ok'));
        var b = document.getElementById('weiter'); if (b) b.focus();
      }
    }
    if (s.interaktion) {
      var ibox = el('div', { class: 'interaktion' });
      m.appendChild(ibox);
      var iMeld = el('div', { 'aria-live': 'polite' });
      var obj = s.interaktion(ibox, {
        erledigt: function (t) { iMeld.innerHTML = ''; iMeld.appendChild(msg('✅ ' + (t || 'Erledigt.'), 'ok')); status.interaktion = true; pruefeFertig(); },
        meldung: function (t, art) { iMeld.innerHTML = ''; if (t) iMeld.appendChild(msg(t, art)); }
      }) || {};
      m.appendChild(iMeld);
      testHaken.push({ art: 'interaktion', obj: obj });
    }
    if (s.beruf) m.appendChild(msg('<b>Wozu brauchst du das?</b> ' + s.beruf, ''));
    if ((s.check || []).length) {
      m.appendChild(el('h3', { html: 'Kurz-Check <span class="badge zaehlt-nicht">zählt nicht</span>' }));
      m.appendChild(el('p', { class: 'klein', text: 'Beantworte die Fragen aus dem Gedächtnis, ohne zurückzuscrollen. Beliebig oft wiederholbar.' }));
      var geprueft = {}, richtig = {};
      var sum = el('div', { 'aria-live': 'polite' });
      s.check.forEach(function (id, k) {
        var q = frage(FR[id], 'lernen', { nr: k + 1, beiPruefung: function (res) {
          geprueft[id] = 1; if (res.score >= 1) richtig[id] = 1;
          if (anzahl(geprueft) === s.check.length) {
            sum.innerHTML = '';
            var n = anzahl(richtig);
            sum.appendChild(msg('Kurz-Check: <b>' + n + ' von ' + s.check.length + '</b> auf Anhieb richtig. ' + (n === s.check.length ? 'Sehr gut, du kannst weiter.' : 'Schau dir das Beispiel und die Erklärungen zu den falschen Antworten noch einmal an.'), n === s.check.length ? 'ok' : 'warn'));
            status.check = true; pruefeFertig();
          }
        } });
        m.appendChild(q.el); testHaken.push({ art: 'frage', obj: q });
      });
      m.appendChild(sum);
    }
    m.appendChild(fertigMeldung);
    r.appendChild(m);
    if (s.steckbrief) r.appendChild(el('aside', { class: 'seite' }, el('div', { class: 'card' }, [el('div', { class: 'klein', text: 'Steckbrief' }), el('div', { html: s.steckbrief })])));
    haupt.appendChild(r);
    leiste('Station ' + (i + 1) + ' von ' + STATIONEN.length, nx.label, function () { zeige(nx.t, nx.i); });
  }

  /* ---------- ② Üben ---------- */
  function vUebung() {
    if (!UEBUNGEN.length) { haupt.appendChild(msg('Keine Übungen vorhanden.', 'warn')); leiste('', 'Weiter zu ③ Nachweis →', function () { zeige('nachweis'); }); return; }
    var i = Math.min(ANSICHT.i, UEBUNGEN.length - 1), u = UEBUNGEN[i];
    var r = el('div', { class: 'raster' + (u.steckbrief ? ' mit-seite' : '') });
    r.appendChild(seitenliste(UEBUNGEN, i, 'ueben', S.ue, 'Übungen'));
    var m = el('div', { class: 'card' });
    m.appendChild(el('div', { class: 'klein', html: 'Übung ' + (i + 1) + ' von ' + UEBUNGEN.length + ' · ' + (u.lz || []).join(', ') + ' <span class="badge zaehlt-nicht">zählt nicht</span>' }));
    m.appendChild(el('h2', { text: u.titel }));
    m.appendChild(auftrag(u.auftrag || ''));
    var nx = naechsteUebung(i);
    var meld = el('div', { 'aria-live': 'polite' });
    function geloest() {
      if (!S.ue[u.id]) { S.ue[u.id] = 1; speichern(); kopf(); }
      meld.innerHTML = ''; meld.appendChild(msg('🎉 <b>Gelöst!</b> Beantworte noch die Reflexionsfrage unten. ' + nx.label.replace(' →', '') + '.', 'ok'));
    }
    if (u.frage) {
      var q = frage(FR[u.frage], 'lernen', { erklaerungImmer: false, beiPruefung: function (res) { if (res.score >= 1) geloest(); } });
      m.appendChild(q.el); testHaken.push({ art: 'frage', obj: q });
    }
    if (u.interaktion) {
      var ibox = el('div', { class: 'interaktion' }); m.appendChild(ibox);
      var iMeld = el('div', { 'aria-live': 'polite' });
      var obj = u.interaktion(ibox, { erledigt: function (t) { iMeld.innerHTML = ''; iMeld.appendChild(msg('✅ ' + (t || 'Richtig.'), 'ok')); geloest(); }, meldung: function (t, art) { iMeld.innerHTML = ''; if (t) iMeld.appendChild(msg(t, art)); } }) || {};
      m.appendChild(iMeld); testHaken.push({ art: 'interaktion', obj: obj });
    }
    m.appendChild(meld);
    if ((u.tipps || []).length) {
      var tb = el('div', { class: 'tipps' }), tl = el('div', { 'aria-live': 'polite' }), n = 0;
      var stufe = ['Denkanstoß', 'Teillösung', 'Lösung'];
      var bt = el('button', { type: 'button', text: '💡 Tipp 1 von ' + u.tipps.length + ' (' + stufe[0] + ')' });
      bt.addEventListener('click', function () {
        tl.appendChild(msg('<b>Tipp ' + (n + 1) + ' · ' + (stufe[n] || '') + ':</b> ' + u.tipps[n], 'warn'));
        n++;
        if (n >= u.tipps.length) { bt.disabled = true; bt.textContent = 'Alle Tipps angezeigt'; } else bt.textContent = '💡 Tipp ' + (n + 1) + ' von ' + u.tipps.length + ' (' + (stufe[n] || '') + ')';
      });
      tb.appendChild(el('span', { class: 'klein', text: 'Tipps zählen nicht gegen dich. ' }));
      tb.appendChild(bt); m.appendChild(tb); m.appendChild(tl);
    }
    if (u.reflexion) {
      m.appendChild(el('h3', { text: 'Nachgedacht' }));
      m.appendChild(el('p', { html: u.reflexion.frage }));
      var ta = el('textarea', { rows: 3, style: 'width:100%', 'aria-label': 'Deine Antwort auf die Reflexionsfrage' });
      var mu = el('div', { 'aria-live': 'polite' });
      m.appendChild(ta);
      m.appendChild(el('button', { type: 'button', text: 'Mit Musterantwort vergleichen', onclick: function () { mu.innerHTML = ''; mu.appendChild(el('div', { class: 'muster', html: '<b>Musterantwort:</b> ' + u.reflexion.muster })); } }));
      m.appendChild(mu);
    }
    r.appendChild(m);
    if (u.steckbrief) r.appendChild(el('aside', { class: 'seite' }, el('div', { class: 'card' }, [el('div', { class: 'klein', text: 'Steckbrief' }), el('div', { html: u.steckbrief })])));
    haupt.appendChild(r);
    leiste('Übung ' + (i + 1) + ' von ' + UEBUNGEN.length, nx.label, function () { zeige(nx.t, nx.i); });
  }

  /* ---------- ③ Nachweis ---------- */
  function ziehen() {
    var pro = (NW.teilB && NW.teilB.proLZ) || 2, liste = [];
    LZ.forEach(function (z) {
      var pool = mischen((P.fragen || []).filter(function (f) { return f.lz === z.id && (f.einsatz || []).indexOf('nachweis') >= 0; }));
      liste = liste.concat(pool.slice(0, pro));
    });
    return mischen(liste);
  }
  function vNachweis() {
    var c = el('div', { class: 'card' });
    haupt.appendChild(c);
    if (!nwLauf || nwLauf.phase === 'fertig') {
      c.appendChild(el('h2', { text: '③ Kompetenznachweis' }));
      if (NW.einleitung) c.appendChild(figur(NW.einleitung));
      c.appendChild(el('ul', {}, [
        el('li', { html: NW.teilA ? '<b>Teil A:</b> eine Aufgabe aus einer neuen Situation, ohne Tipps.' : null }),
        el('li', { html: '<b>Teil ' + (NW.teilA ? 'B' : 'A') + ':</b> ' + ((NW.teilB && NW.teilB.proLZ) || 2) * LZ.length + ' Fragen, gemischt aus allen Lernzielen.' }),
        el('li', { html: 'Bestanden ab <b>' + BESTEHEN + ' %</b>. Du kannst den Nachweis beliebig oft wiederholen, das beste Ergebnis zählt.' }),
        el('li', { html: 'Feedback zu jeder Frage bekommst du nach dem Abgeben.' })
      ].filter(function (x) { return x.innerHTML; })));
      var offen = UEBUNGEN.filter(function (u) { return !S.ue[u.id]; }).length;
      if (offen) c.appendChild(msg('Empfehlung: Du hast noch ' + offen + ' Übung(en) offen. Du kannst trotzdem starten.', 'warn'));
      if (S.n) c.appendChild(el('p', { class: 'klein', text: 'Bisherige Versuche: ' + S.n + ' · bestes Ergebnis: ' + S.best + ' %' }));
      leiste('Bereit? Nimm dir etwa ' + (NW.dauer || '20 Minuten') + ' Zeit.', S.n ? 'Nachweis erneut starten →' : 'Nachweis starten →', function () {
        nwLauf = { phase: NW.teilA ? 'A' : 'B', fragen: ziehen(), a: null, w: [] };
        render();
      });
      return;
    }
    if (nwLauf.phase === 'A') {
      var A = NW.teilA;
      c.appendChild(el('div', { class: 'klein', text: 'Nachweis · Teil A von 2 · keine Tipps' }));
      c.appendChild(el('h2', { text: A.titel || 'Handlungsaufgabe' }));
      c.appendChild(auftrag(A.auftrag || ''));
      if (A.inhalt) c.appendChild(el('div', { html: A.inhalt }));
      var box = el('div', { class: 'interaktion' }); c.appendChild(box);
      var meld = el('div', { 'aria-live': 'polite' }); c.appendChild(meld);
      nwLauf.a = A.interaktion(box, { erledigt: function () {}, meldung: function (t, art) { meld.innerHTML = ''; if (t) meld.appendChild(msg(t, art)); } }) || {};
      testHaken.push({ art: 'interaktion', obj: nwLauf.a });
      leiste('Teil A: Wenn du fertig bist, geht es weiter zu Teil B.', 'Weiter zu Teil B →', function () {
        nwLauf.pp = typeof nwLauf.a.auswerten === 'function' ? nwLauf.a.auswerten() : [];
        nwLauf.phase = 'B'; render();
      });
      return;
    }
    if (nwLauf.phase === 'B') {
      c.appendChild(el('div', { class: 'klein', text: 'Nachweis · ' + (NW.teilA ? 'Teil B von 2' : 'Fragen') + ' · keine Tipps, Feedback nach dem Abgeben' }));
      c.appendChild(el('h2', { text: 'Fragen' }));
      nwLauf.w = nwLauf.fragen.map(function (f, k) { var q = frage(f, 'pruefung', { nr: k + 1 }); c.appendChild(q.el); testHaken.push({ art: 'frage', obj: q }); return q; });
      var warn = el('div', { 'aria-live': 'polite' }); c.appendChild(warn);
      var bestaetigt = false;
      leiste('Kontrolliere deine Antworten, dann gib ab.', 'Abgeben', function () {
        var offen = nwLauf.w.filter(function (q) { return !q.beantwortet(); }).length;
        if (offen && !bestaetigt) { bestaetigt = true; warn.innerHTML = ''; warn.appendChild(msg('Noch ' + offen + ' Frage(n) ohne Antwort. Klicke noch einmal auf „Abgeben“, wenn du trotzdem abgeben willst.', 'warn')); document.getElementById('weiter').textContent = 'Trotzdem abgeben'; return; }
        abgeben();
      });
    }
  }
  function abgeben() {
    var pp = nwLauf.pp || [], res = nwLauf.w.map(function (q) { var r = q.bewerten(); r.f = q.f; return r; });
    var a = pp.length ? pp.filter(function (p) { return p.ok; }).length / pp.length : null;
    var b = res.length ? res.reduce(function (s, r) { return s + r.score; }, 0) / res.length : 0;
    var gA = NW.teilA ? (typeof NW.gewichtA === 'number' ? NW.gewichtA : 50) : 0;
    var ges = Math.round(a === null ? b * 100 : (a * gA + b * (100 - gA)));
    var proLz = {};
    LZ.forEach(function (z) { proLz[z.id] = { e: 0, n: 0 }; });
    pp.forEach(function (p) { if (proLz[p.lz]) { proLz[p.lz].n++; if (p.ok) proLz[p.lz].e++; } });
    res.forEach(function (r) { if (proLz[r.f.lz]) { proLz[r.f.lz].n++; proLz[r.f.lz].e += r.score; } });
    S.n++; S.best = S.best === null ? ges : Math.max(S.best, ges);
    S.lz = {}; LZ.forEach(function (z) { var x = proLz[z.id]; S.lz[z.id] = x.n ? Math.round(x.e / x.n * 100) : 0; });
    speichern();
    letzterVersuch = { ges: ges, a: a, b: b, pp: pp, res: res, w: nwLauf.w };
    if (SC.aktiv) {
      SC.set('cmi.core.score.min', 0); SC.set('cmi.core.score.max', 100); SC.set('cmi.core.score.raw', S.best);
      SC.set('cmi.core.lesson_status', S.best >= BESTEHEN ? 'passed' : 'failed');
      LZ.forEach(function (z, i) { var bb = 'cmi.objectives.' + i + '.'; SC.set(bb + 'id', z.id); SC.set(bb + 'score.min', 0); SC.set(bb + 'score.max', 100); SC.set(bb + 'score.raw', S.lz[z.id]); SC.set(bb + 'status', S.lz[z.id] >= 80 ? 'passed' : 'failed'); });
      var n0 = parseInt(SC.get('cmi.interactions._count'), 10) || 0;
      res.forEach(function (r, i) {
        var bb = 'cmi.interactions.' + (n0 + i) + '.';
        SC.set(bb + 'id', 'N' + S.n + '_' + r.f.id); SC.set(bb + 'type', r.typ || 'other'); SC.set(bb + 'objectives.0.id', r.f.lz);
        SC.set(bb + 'student_response', (r.antwort || '').replace(/[^\w,.\-+ äöüÄÖÜß]/g, '').slice(0, 250));
        SC.set(bb + 'result', r.score >= 1 ? 'correct' : r.score > 0 ? String(r.score) : 'wrong');
      });
      pp.forEach(function (p, i) {
        var bb = 'cmi.interactions.' + (n0 + res.length + i) + '.';
        SC.set(bb + 'id', 'N' + S.n + '_A' + (i + 1)); SC.set(bb + 'type', 'performance'); SC.set(bb + 'objectives.0.id', p.lz); SC.set(bb + 'result', p.ok ? 'correct' : 'wrong');
      });
      SC.commit();
    }
    nwLauf.phase = 'fertig';
    zeige('abschluss');
  }

  /* ---------- ④ Abschluss ---------- */
  function druckFenster(titel, html) {
    var css = '';
    for (var i = 0; i < document.styleSheets.length; i++) { try { var rs = document.styleSheets[i].cssRules; for (var j = 0; j < rs.length; j++) css += rs[j].cssText + '\n'; } catch (_) {} }
    var w = null; try { w = window.open('', '_blank'); } catch (_) {}
    if (!w) { window.print(); return; }
    w.document.write('<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>' + esc(titel) + '</title><style>' + css + ' body{margin:20px;background:#fff;print-color-adjust:exact;-webkit-print-color-adjust:exact} .seitenumbruch{break-before:page}</style></head><body>' + html + '</body></html>');
    w.document.close(); setTimeout(function () { try { w.focus(); w.print(); } catch (_) {} }, 300);
  }
  function vAbschluss() {
    var c = el('div', { class: 'card' });
    haupt.appendChild(c);
    c.appendChild(el('h2', { text: '④ Abschluss' }));
    if (!S.n) {
      c.appendChild(msg('Du hast den Nachweis noch nicht gemacht. Danach siehst du hier deine Auswertung je Lernziel und kannst dein Merkblatt ergänzen.', 'warn'));
      leiste('', 'Zum ③ Nachweis →', function () { zeige('nachweis'); });
      return;
    }
    var bestanden = S.best >= BESTEHEN;
    if (letzterVersuch) c.appendChild(msg('Dieser Versuch: <b>' + letzterVersuch.ges + ' %</b>. Bestes Ergebnis: <b>' + S.best + ' %</b> – ' + (bestanden ? 'bestanden ✅' : 'noch nicht bestanden (ab ' + BESTEHEN + ' %).'), bestanden ? 'ok' : 'warn'));
    else c.appendChild(msg('Bestes Ergebnis: <b>' + S.best + ' %</b> – ' + (bestanden ? 'bestanden ✅' : 'noch nicht bestanden (ab ' + BESTEHEN + ' %).'), bestanden ? 'ok' : 'warn'));

    c.appendChild(el('h3', { text: 'Auswertung je Lernziel (letzter Versuch)' }));
    var empfehlung = [];
    LZ.forEach(function (z) {
      var p = S.lz[z.id] || 0, st = p >= 80 ? 'erreicht ✔' : p >= 50 ? 'teilweise' : 'noch nicht';
      if (p < 80) STATIONEN.forEach(function (s, i) { if ((s.lz || []).indexOf(z.id) >= 0 && empfehlung.indexOf(i) < 0) empfehlung.push(i); });
      c.appendChild(el('div', { class: 'lzzeile' }, [el('div', { html: '<b>' + esc(z.id) + '</b> ' + z.text }), el('div', { class: 'balken ' + (p >= 80 ? 'ok' : p >= 50 ? 'mittel' : ''), role: 'img', 'aria-label': p + ' Prozent' }, el('span', { style: 'width:' + p + '%' })), el('div', { text: p + ' % · ' + st })]));
    });
    if (empfehlung.length) {
      var em = el('div', { class: 'msg warn' }, [el('b', { text: 'Was als Nächstes? ' }), 'Wiederhole diese Stationen und versuche den Nachweis dann noch einmal: ']);
      empfehlung.forEach(function (i) { em.appendChild(el('button', { type: 'button', text: 'Station ' + (i + 1) + ': ' + STATIONEN[i].titel, onclick: function () { zeige('entdecken', i); } })); em.appendChild(document.createTextNode(' ')); });
      c.appendChild(em);
    }
    if (letzterVersuch) {
      var rb = el('details', {}, [el('summary', { text: 'Deine Antworten mit Erklärung ansehen' })]);
      letzterVersuch.pp.forEach(function (p) { rb.appendChild(el('div', { class: 'msg ' + (p.ok ? 'ok' : 'bad'), html: (p.ok ? '✔ ' : '✘ ') + 'Teil A · ' + esc(p.lz) + ': ' + p.text })); });
      letzterVersuch.w.forEach(function (q) { rb.appendChild(q.el); q.feedbackNachher(); });
      c.appendChild(rb);
    }

    var se = el('div', { class: 'card' });
    se.appendChild(el('h2', { text: 'Wie sicher bist du jetzt?' }));
    se.appendChild(el('p', { class: 'klein', text: 'Vergleiche mit deiner Einschätzung vom Anfang und mit dem Ergebnis. Wo liegst du daneben?' }));
    LZ.forEach(function (z) {
      se.appendChild(el('div', { class: 'lzzeile se' }, [el('div', { html: '<b>' + esc(z.id) + '</b> ' + z.text + '<div class="klein">Am Anfang: ' + (S.se[z.id] || '–') + ' von 5 · Ergebnis: ' + (S.lz[z.id] || 0) + ' %</div>' }), skala(S.sn, 'sn', z.id)]));
    });
    haupt.appendChild(se);

    var mb = el('div', { class: 'card', id: 'merkblatt' });
    mb.appendChild(el('h2', { text: 'Dein Merkblatt' }));
    haupt.appendChild(mb);
    var verglichen = false;
    if (P.merkblatt && P.merkblatt.length) {
      mb.appendChild(el('p', { text: 'Ergänze die Lücken aus dem Gedächtnis, ohne zurückzublättern. Danach vergleichst du mit dem Muster und speicherst dein Merkblatt als PDF. Deine Einträge werden nicht gespeichert.' }));
      var felder = [];
      P.merkblatt.forEach(function (a) {
        mb.appendChild(el('h3', { html: esc(a.lz) + ' · ' + (a.titel || lz(a.lz).kurz || lz(a.lz).text) }));
        var g = el('div', { class: 'merk' });
        (a.zeilen || []).forEach(function (zl) {
          var ta = el('textarea', { rows: 2, 'aria-label': zl.text.replace(/<[^>]+>/g, '') });
          var mu = el('div', { class: 'muster', hidden: true, html: '<b>Muster:</b> ' + zl.loesung });
          g.appendChild(el('div', {}, [el('div', { html: zl.text.replace(/___/g, '<b>___</b>') }), ta]));
          g.appendChild(mu);
          felder.push({ a: a, zl: zl, ta: ta, mu: mu });
        });
        mb.appendChild(g);
      });
      var bv = el('button', { type: 'button', text: 'Mit Muster vergleichen', onclick: function () { felder.forEach(function (x) { x.mu.hidden = false; }); verglichen = true; bp.disabled = false; } });
      var bp = el('button', { type: 'button', text: '🖨 Merkblatt als PDF speichern', disabled: true, onclick: function () { druckFenster('Merkblatt ' + (P.titel || ''), merkblattHtml(felder)); } });
      mb.appendChild(el('div', { class: 'knoepfe noprint' }, [bv, ' ', bp]));
      if ((P.selbsttest || []).length) {
        var lsg = el('details', {}, [el('summary', { text: 'Lösungen zum Selbsttest auf deinem Merkblatt' })]);
        P.selbsttest.forEach(function (id, k) { var q = frage(FR[id], 'lernen', { nr: k + 1, erklaerungImmer: true }); lsg.appendChild(q.el); });
        mb.appendChild(lsg);
      }
    } else mb.appendChild(el('p', { class: 'gesperrt', text: 'Für dieses Paket gibt es kein Merkblatt.' }));

    var dr = el('div', { class: 'card' });
    dr.appendChild(el('h2', { text: 'Ergebnis drucken' }));
    var nm = el('input', { type: 'text', value: SC.name(), 'aria-label': 'Dein Name', placeholder: 'Dein Name', size: 30 });
    dr.appendChild(el('div', {}, [nm, ' ', el('button', { type: 'button', text: '🖨 Ergebnis als PDF', onclick: function () { druckFenster('Ergebnis ' + (P.titel || ''), ergebnisHtml(nm.value)); } })]));
    haupt.appendChild(dr);

    if (!bestanden) leiste('Mit den empfohlenen Stationen klappt es beim nächsten Mal.', empfehlung.length ? 'Zu Station ' + (empfehlung[0] + 1) + ' →' : 'Nachweis erneut starten →', function () { if (empfehlung.length) zeige('entdecken', empfehlung[0]); else zeige('nachweis'); });
    else leiste('Bestanden! Sichere jetzt dein Wissen auf dem Merkblatt.', 'Zum Merkblatt ↓', function () { mb.scrollIntoView({ behavior: 'smooth' }); var t = mb.querySelector('textarea'); if (t) t.focus({ preventScroll: true }); });
  }
  function merkblattHtml(felder) {
    var h = '<h1>Merkblatt: ' + esc(P.titel || '') + '</h1><p class="klein">' + esc(P.untertitel || '') + ' · ' + new Date().toLocaleDateString('de-DE') + '</p>';
    P.merkblatt.forEach(function (a) {
      h += '<h2>' + esc(a.lz) + ' · ' + (a.titel || lz(a.lz).kurz || '') + '</h2><table class="tab"><tr><th>Satz</th><th>Mein Eintrag</th><th>Muster</th></tr>';
      felder.filter(function (x) { return x.a === a; }).forEach(function (x) { h += '<tr><td>' + x.zl.text + '</td><td>' + esc(x.ta.value || '—') + '</td><td>' + x.zl.loesung + '</td></tr>'; });
      h += '</table>';
      if (a.fehler) h += '<p><b>Typischer Fehler:</b> ' + a.fehler + '</p>';
      if (a.beispiel) h += '<p><b>Beispiel:</b> ' + a.beispiel + '</p>';
      if (a.schema) h += '<p><b>So gehst du vor:</b> ' + a.schema + '</p>';
    });
    if ((P.selbsttest || []).length) {
      h += '<div class="seitenumbruch"></div><h1>Selbsttest – in 1–2 Wochen beantworten</h1><p>Beantworte die Fragen ohne Hilfsmittel. Die Lösungen findest du im Lernpaket unter ④ Abschluss.</p><ol>';
      P.selbsttest.forEach(function (id) {
        var f = FR[id]; h += '<li style="margin-bottom:14px">' + f.frage;
        if (f.bild) h += '<div>' + f.bild + '</div>';
        if (f.typ === 'mc') h += '<ul>' + mischen(f.optionen).map(function (o) { return '<li>☐ ' + o.text + '</li>'; }).join('') + '</ul>';
        else if (f.typ === 'zuordnen') h += '<ul>' + f.paare.map(function (p) { return '<li>' + p.links + ' → ________</li>'; }).join('') + '</ul><p class="klein">Zur Auswahl: ' + mischen(f.paare.map(function (p) { return p.rechts; })).join(' · ') + '</p>';
        else if (f.typ === 'hotspot') h += f.svg;
        else h += '<p>Antwort: ____________________</p>';
        h += '</li>';
      });
      h += '</ol>';
    }
    return h;
  }
  function ergebnisHtml(name) {
    var h = '<h1>Ergebnis: ' + esc(P.titel || '') + '</h1><p>Name: <b>' + esc(name || '________________') + '</b> · Datum: ' + new Date().toLocaleDateString('de-DE') + '</p>';
    h += '<p>Bestes Ergebnis im Kompetenznachweis: <b>' + S.best + ' %</b> (' + (S.best >= BESTEHEN ? 'bestanden' : 'nicht bestanden') + ', Grenze ' + BESTEHEN + ' %) · Versuche: ' + S.n + '</p>';
    h += '<table class="tab"><tr><th>Lernziel</th><th>Letzter Versuch</th><th>Selbsteinschätzung vorher → nachher</th></tr>';
    LZ.forEach(function (z) { h += '<tr><td><b>' + esc(z.id) + '</b> ' + z.text + '</td><td>' + (S.lz[z.id] || 0) + ' %</td><td>' + (S.se[z.id] || '–') + ' → ' + (S.sn[z.id] || '–') + ' (von 5)</td></tr>'; });
    return h + '</table>';
  }

  /* ---------- Schnittstelle für automatische Tests ---------- */
  window.LERNPAKET = {
    version: '1.0',
    pruefeInhalt: pruefeInhalt,
    zustand: function () { return JSON.parse(JSON.stringify(S)); },
    ansicht: function () { return ANSICHT; },
    zeige: zeige,
    aktuelleTeile: function () { return testHaken; },
    scormAktiv: SC.aktiv
  };

  render();
})();
