/* =====================================================================
   Tafelbild-Baustein der PING-Vorlage (optional, Leitfaden C2)
   Präsentationsmodus für den freiwilligen Lehrer-Input: dieselben
   interaktiven Bilder wie im Paket, aber groß, ohne erklärenden Text,
   Schritt für Schritt per Klick, Pfeiltaste oder Presenter.
   Diese Datei wird NICHT pro Paket verändert. Ohne PAKET.tafel tut sie nichts.

   Inhalt (in js/inhalt.js): PAKET.tafel = {
     titel, dauer,
     szenen: [{ id, titel, station: 'S1', erklaerung: 'HTML',
                zeichne: function (buehne, api) { …; return { aufraeumen } } }]
   }
   api.werkzeug({ icon, text, taste, typ: 'knopf'|'schalter'|'modus',
                  gruppe, an, aktion(an, knopf) })  → { setze(an), knopf }
   api.praesentation   true, wenn ohne Erklärungen gestartet (#tafel)

   Zugänge: Knopf „Tafelbild“ in der Kopfzeile, Karte auf der Startseite
   (engine.js ruft TAFEL.startKarte() auf), Adresse index.html#tafel
   (Präsentation) bzw. #tafel-3 (ab Szene 3).
   Speichert nichts: kein suspend_data, kein localStorage, keine SCORM-Werte.
   Einbinden VOR engine.js; nutzt window.LERNPAKET nur für Stationslinks.
   ===================================================================== */
(function () {
  'use strict';
  var P = window.PAKET;
  if (!P || !P.tafel || !(P.tafel.szenen || []).length) return;
  var T = P.tafel, SZ = T.szenen;
  var Z = { offen: false, i: 0, erkl: true, praes: false, stift: false, obj: null, tasten: {}, opener: null };
  var D = {};   // DOM-Elemente des Overlays

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === undefined || v === null || v === false) return;
      if (k === 'html') n.innerHTML = v; else if (k === 'text') n.textContent = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  var TAFEL_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22"><rect x="2.5" y="3.5" width="19" height="12.5" rx="1.6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 12l3-3 2.5 2 4-4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 20.5l4-4.5 4 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  /* ---------- Overlay aufbauen (einmalig) ---------- */
  function bauen() {
    if (D.root) return;
    D.punkte = el('div', { class: 'tafel-punkte', role: 'tablist', 'aria-label': 'Szenen' });
    D.titel = el('div', { class: 'tafel-titel' });
    D.hilfe = el('div', { class: 'tafel-hilfe', hidden: true, role: 'note' });
    D.root = el('div', { class: 'tafel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Tafelbild: ' + (T.titel || P.titel || ''), hidden: true, tabindex: '-1' }, [
      el('div', { class: 'tafel-kopf' }, [
        D.punkte, D.titel,
        el('div', { class: 'tafel-rechts' }, [
          el('button', { type: 'button', class: 'tafel-mini', title: 'Tastenkürzel (?)', 'aria-label': 'Tastenkürzel anzeigen', text: '⌨', onclick: function () { D.hilfe.hidden = !D.hilfe.hidden; } }),
          el('button', { type: 'button', class: 'tafel-mini', title: 'Vollbild (F)', 'aria-label': 'Vollbild', text: '⛶', onclick: vollbild }),
          el('button', { type: 'button', class: 'tafel-mini', title: 'Schließen (Esc)', 'aria-label': 'Tafelbild schließen', text: '✕', onclick: schliessen })
        ])
      ]),
      D.hilfe,
      el('div', { class: 'tafel-mitte' }, [
        D.buehne = el('div', { class: 'tafel-buehne' }),
        D.erkl = el('aside', { class: 'tafel-erkl', 'aria-live': 'polite' })
      ]),
      el('div', { class: 'tafel-leiste' }, [
        D.zurueck = el('button', { type: 'button', class: 'tafel-nav', 'aria-label': 'Vorige Szene', title: 'Vorige Szene (←)', text: '‹', onclick: function () { szene(Z.i - 1); } }),
        D.werkzeuge = el('div', { class: 'tafel-werkzeuge', role: 'toolbar', 'aria-label': 'Werkzeuge dieser Szene' }),
        el('div', { class: 'tafel-allg' }, [
          D.bErkl = el('button', { type: 'button', 'aria-pressed': 'false', title: 'Erklärungen ein/aus (E)', html: '💬 <span>Erklärung</span>', onclick: function () { erklaerungen(!Z.erkl); } }),
          D.bStift = el('button', { type: 'button', 'aria-pressed': 'false', title: 'Stift (P)', html: '✏️ <span>Stift</span>', onclick: function () { stift(!Z.stift); } }),
          D.bWisch = el('button', { type: 'button', title: 'Zeichnung löschen (W)', 'aria-label': 'Zeichnung löschen', html: '🧽', hidden: true, onclick: wischen })
        ]),
        D.weiter = el('button', { type: 'button', class: 'tafel-nav tafel-weiter', 'aria-label': 'Nächste Szene', title: 'Nächste Szene (→)', text: '›', onclick: function () { if (Z.i < SZ.length - 1) szene(Z.i + 1); else schliessen(); } })
      ])
    ]);
    D.canvas = el('canvas', { class: 'tafel-stift', 'aria-hidden': 'true' });
    D.buehne.parentNode.appendChild(D.canvas);
    SZ.forEach(function (s, k) {
      D.punkte.appendChild(el('button', { type: 'button', role: 'tab', 'aria-label': 'Szene ' + (k + 1) + ': ' + s.titel, title: s.titel + ' (' + (k + 1) + ')', text: String(k + 1), onclick: function () { szene(k); } }));
    });
    D.hilfe.innerHTML = '<b>Tastenkürzel</b> · → / Bild↓ nächste Szene · ← / Bild↑ vorige · 1–' + SZ.length + ' Szene wählen · E Erklärungen · P Stift · W Zeichnung löschen · F Vollbild · Esc schließen<span class="tafel-hilfe-szene"></span>';
    document.body.appendChild(D.root);
    D.root.addEventListener('keydown', taste);
    stiftEinrichten();
    window.addEventListener('resize', function () { if (Z.offen) stiftGroesse(); });
  }

  /* ---------- Öffnen, Schließen, Szenen ---------- */
  function oeffnen(o) {
    o = o || {};
    bauen();
    Z.opener = document.activeElement;
    Z.praes = !!o.praesentation;
    Z.offen = true;
    D.root.hidden = false;
    D.root.classList.toggle('praes', Z.praes);
    document.documentElement.classList.add('tafel-offen');
    erklaerungen(o.erklaerungen !== undefined ? o.erklaerungen : !Z.praes);
    szene(typeof o.szene === 'number' ? o.szene : Z.i);
    stiftGroesse();
    D.root.focus({ preventScroll: true });
  }
  function schliessen() {
    if (!Z.offen) return;
    aufraeumen();
    stift(false); wischen();
    Z.offen = false;
    D.root.hidden = true;
    document.documentElement.classList.remove('tafel-offen');
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (_) {}
    if (/^#tafel/.test(location.hash)) { try { history.replaceState(null, '', location.pathname + location.search); } catch (_) {} }
    if (Z.opener && Z.opener.focus) { try { Z.opener.focus({ preventScroll: true }); } catch (_) {} }
  }
  function aufraeumen() {
    if (Z.obj && typeof Z.obj.aufraeumen === 'function') { try { Z.obj.aufraeumen(); } catch (_) {} }
    Z.obj = null;
  }
  function szene(i) {
    if (i < 0 || i >= SZ.length) return;
    aufraeumen(); wischen();
    Z.i = i; Z.tasten = {};
    var s = SZ[i];
    D.buehne.innerHTML = ''; D.werkzeuge.innerHTML = '';
    var box = el('div', { class: 'tafel-szene', 'data-szene': s.id || String(i + 1) });
    D.buehne.appendChild(box);
    var gruppen = {};
    var api = {
      praesentation: Z.praes,
      werkzeug: function (w) {
        var typ = w.typ || 'knopf', an = !!w.an;
        var b = el('button', { type: 'button', 'aria-pressed': typ === 'knopf' ? null : String(an), title: (w.titel || w.text || '') + (w.taste ? ' (' + w.taste.toUpperCase() + ')' : ''), 'aria-label': (w.text || w.titel || '') + (w.taste ? ', Taste ' + w.taste.toUpperCase() : ''), html: (w.icon ? '<span aria-hidden="true">' + w.icon + '</span> ' : '') + (w.text ? '<span class="wt">' + w.text + '</span>' : '') });
        var h = {
          setze: function (x) { an = !!x; if (typ !== 'knopf') b.setAttribute('aria-pressed', String(an)); },
          knopf: b
        };
        function klick() {
          if (b.disabled) return;
          if (typ === 'modus') { (gruppen[w.gruppe || 'modus'] || []).forEach(function (o) { o.setze(o === h); }); an = true; }
          else if (typ === 'schalter') h.setze(!an);
          var r = w.aktion ? w.aktion(an, b) : undefined;
          if (typeof r === 'boolean' && typ === 'schalter') h.setze(r);
        }
        b.addEventListener('click', klick);
        if (typ === 'modus') (gruppen[w.gruppe || 'modus'] = gruppen[w.gruppe || 'modus'] || []).push(h);
        if (w.taste) Z.tasten[w.taste.toLowerCase()] = klick;
        D.werkzeuge.appendChild(b);
        return h;
      }
    };
    Z.obj = (s.zeichne && s.zeichne(box, api)) || {};
    // Kopf und Navigation
    Array.prototype.forEach.call(D.punkte.children, function (b, k) { b.setAttribute('aria-selected', k === i ? 'true' : 'false'); b.classList.toggle('aktiv', k === i); });
    D.titel.textContent = Z.erkl ? (i + 1) + ' · ' + s.titel : '';
    D.zurueck.disabled = i === 0;
    D.weiter.textContent = i === SZ.length - 1 ? '✓' : '›';
    D.weiter.setAttribute('aria-label', i === SZ.length - 1 ? 'Tafelbild schließen' : 'Nächste Szene');
    var hz = D.hilfe.querySelector('.tafel-hilfe-szene');
    var keys = Object.keys(Z.tasten);
    hz.textContent = keys.length ? ' · In dieser Szene: ' + Array.prototype.map.call(D.werkzeuge.children, function (b) { return b.title; }).join(' · ') : '';
    erklaerungZeigen();
  }
  function erklaerungZeigen() {
    var s = SZ[Z.i];
    D.erkl.innerHTML = '';
    D.erkl.hidden = !Z.erkl;
    D.root.classList.toggle('mit-erkl', Z.erkl);
    D.titel.textContent = Z.erkl ? (Z.i + 1) + ' · ' + s.titel : '';
    if (!Z.erkl) return;
    D.erkl.appendChild(el('h2', { text: s.titel }));
    if (s.erklaerung) D.erkl.appendChild(el('div', { class: 'tafel-text', html: s.erklaerung }));
    if (s.station) {
      var st = (P.stationen || []), k = -1;
      st.forEach(function (x, j) { if (x.id === s.station) k = j; });
      if (k >= 0 && window.LERNPAKET) {
        D.erkl.appendChild(el('button', { type: 'button', class: 'tafel-station', html: 'Vertieft in <b>Station ' + (k + 1) + ': ' + st[k].titel + '</b> →', onclick: function () { schliessen(); window.LERNPAKET.zeige('entdecken', k); } }));
      } else {
        D.erkl.appendChild(el('p', { class: 'klein', text: 'Die passende Station folgt im Ausbau des Pakets.' }));
      }
    }
  }
  function erklaerungen(an) {
    Z.erkl = !!an;
    if (D.bErkl) D.bErkl.setAttribute('aria-pressed', String(Z.erkl));
    if (Z.offen) { erklaerungZeigen(); stiftGroesse(); }
  }
  function vollbild() {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (D.root.requestFullscreen) D.root.requestFullscreen().catch(function () {});
    } catch (_) {}
  }

  /* ---------- Stift (zum Anzeichnen am Board) ---------- */
  var ctx = null, zeichnet = false, letzte = null, hatStriche = false;
  function stiftEinrichten() {
    ctx = D.canvas.getContext('2d');
    function pos(e) { var r = D.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * devicePixelRatio, y: (e.clientY - r.top) * devicePixelRatio }; }
    D.canvas.addEventListener('pointerdown', function (e) { if (!Z.stift) return; zeichnet = true; letzte = pos(e); try { D.canvas.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); });
    D.canvas.addEventListener('pointermove', function (e) {
      if (!zeichnet) return;
      var p = pos(e);
      ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 4 * devicePixelRatio; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(letzte.x, letzte.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      letzte = p; if (!hatStriche) { hatStriche = true; D.bWisch.hidden = false; }
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { D.canvas.addEventListener(ev, function () { zeichnet = false; }); });
  }
  function stiftGroesse() {
    if (!D.canvas) return;
    var r = D.buehne.getBoundingClientRect();
    D.canvas.style.left = D.buehne.offsetLeft + 'px'; D.canvas.style.top = D.buehne.offsetTop + 'px';
    D.canvas.style.width = r.width + 'px'; D.canvas.style.height = r.height + 'px';
    D.canvas.width = Math.round(r.width * devicePixelRatio); D.canvas.height = Math.round(r.height * devicePixelRatio);
    hatStriche = false; if (D.bWisch) D.bWisch.hidden = true;
  }
  function stift(an) {
    Z.stift = !!an;
    if (!D.root) return;
    D.root.classList.toggle('stift-an', Z.stift);
    D.bStift.setAttribute('aria-pressed', String(Z.stift));
  }
  function wischen() { if (ctx) ctx.clearRect(0, 0, D.canvas.width, D.canvas.height); hatStriche = false; if (D.bWisch) D.bWisch.hidden = true; }

  /* ---------- Tastatur (auch Presenter: Bild↑/Bild↓) ---------- */
  function taste(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target, tag = t && t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    var k = e.key;
    if (k === 'Escape') { if (!D.hilfe.hidden) D.hilfe.hidden = true; else schliessen(); e.preventDefault(); return; }
    if (k === 'ArrowRight' || k === 'PageDown') { if (Z.i < SZ.length - 1) szene(Z.i + 1); e.preventDefault(); return; }
    if (k === 'ArrowLeft' || k === 'PageUp') { szene(Z.i - 1); e.preventDefault(); return; }
    if (/^[1-9]$/.test(k) && +k <= SZ.length) { szene(+k - 1); e.preventDefault(); return; }
    var kl = k.toLowerCase();
    if (kl === 'e') { erklaerungen(!Z.erkl); e.preventDefault(); return; }
    if (kl === 'p') { stift(!Z.stift); e.preventDefault(); return; }
    if (kl === 'w') { wischen(); e.preventDefault(); return; }
    if (kl === 'f') { vollbild(); e.preventDefault(); return; }
    if (k === '?') { D.hilfe.hidden = !D.hilfe.hidden; e.preventDefault(); return; }
    if (Z.tasten[kl]) { Z.tasten[kl](); e.preventDefault(); }
  }

  /* ---------- Zugänge ins Paket ---------- */
  function kopfKnopf() {
    var kopf = document.querySelector('.kopf');
    if (!kopf || kopf.querySelector('.tafel-knopf')) return;
    var b = el('button', { type: 'button', class: 'tafel-knopf', title: 'Tafelbild: der Überblick aus dem Unterricht', 'aria-label': 'Tafelbild öffnen', html: TAFEL_ICON + '<span>Tafelbild</span>', onclick: function () { oeffnen({}); } });
    var fp = document.getElementById('fortschritt');
    kopf.insertBefore(b, fp && fp.parentNode === kopf ? fp : null);
  }
  // Karte für die Startseite; engine.js hängt sie in vStart() ein
  function startKarte() {
    return el('div', { class: 'card tafel-hinweis' }, [
      el('div', { class: 'tafel-hinweis-icon', html: TAFEL_ICON, 'aria-hidden': 'true' }),
      el('div', {}, [
        el('h2', { text: 'Lieber erst gemeinsam?' }),
        el('p', { html: 'Zu diesem Paket gibt es einen <b>freiwilligen Input</b> von etwa ' + (T.dauer || '20 Minuten') + '. Ob du teilnimmst oder gleich hier startest, entscheidest du. Das Tafelbild aus dem Input kannst du dir jederzeit selbst ansehen – mit Erklärungen. Du findest es auch oben unter <b>Tafelbild</b>.' }),
        el('button', { type: 'button', html: TAFEL_ICON + ' Tafelbild ansehen', onclick: function () { oeffnen({}); } })
      ])
    ]);
  }
  function ausAdresse() {
    var m = /^#tafel(?:-(\d+))?$/.exec(location.hash || '');
    if (m) oeffnen({ praesentation: true, szene: m[1] ? Math.max(0, Math.min(SZ.length - 1, +m[1] - 1)) : 0 });
  }

  window.TAFEL = {
    version: '1.0',
    oeffnen: oeffnen, schliessen: schliessen, szene: szene, startKarte: startKarte,
    zustand: function () { return { offen: Z.offen, szene: Z.i, erklaerungen: Z.erkl, praesentation: Z.praes, stift: Z.stift, anzahl: SZ.length }; }
  };
  kopfKnopf();
  setTimeout(ausAdresse, 0);   // erst, wenn engine.js geladen ist (Stationslinks)
  window.addEventListener('hashchange', ausAdresse);
})();
