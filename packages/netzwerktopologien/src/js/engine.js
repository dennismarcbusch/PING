/* =====================================================================
   Lernpaket-Engine (Lernpaket-Kompass) – setzt den Leitfaden technisch um.
   Diese Datei wird NICHT pro Paket verändert. Inhalte stehen in js/inhalt.js.
   Aufbau: Start (Szene, Lernpfad mit Ziel-Etiketten, ein Knopf; Abkürzung
   „Ich kenne mich schon aus“) → ① Entdecken (Station: Ziel, Vorab-Frage als
   Leitfrage, Szene mit Lösungsbeispiel, Kurz-Check: erst die Auflösung der
   Vorab-Frage, dann 2–3 Fragen, einmal je Lernziel die Einschätzung) → ② Üben
   (3 gestufte Tipps, Reflexion) → ③ Selbstüberprüfung (zählt nicht: Teil A
   Handlungsaufgabe, Teil B Fragenpool; ab 80 % sitzt das Thema) → ④ Abschluss
   (Auswertung je Lernziel neben der eigenen Einschätzung, Merkblatt).
   An die Lernplattform gehen das Ergebnis als Information und der Status
   „completed“ – bestanden oder nicht entscheidet erst der Kompetenznachweis,
   der außerhalb des Pakets liegt.
   Kompass 4.0: eine Kopfzeile (Titel, Teile mit Fortschritt), Stationen als
   Punkte im Stationskopf, damit die Szene auf 1366 × 768 ganz im Blick ist;
   hervorgehoben ist immer nur der nächste sinnvolle Schritt.
   Tafelbild (js/tafel.js, PAKET.tafel): zwei bis vier Szenen für den Mittelteil
   (Erklären und Beispiel) eines Inputs, der sonst auf Folien läuft.
   Jede Station ist eine Bühne zum Anfassen (Interaktion in der Mitte,
   Erklärungen in der Notiz daneben, Lösungsbeispiel als Vorführung „Zeig's mir“),
   eigene Welt je Paket (PAKET.welt), optionaler Spielrahmen (PAKET.spiel).
   Bausteine für Szenen: js/baukasten.js (window.KIT).
   Simulationsmodus (PAKET.simulation, Form A): Ein Arbeitsgegenstand (Portal,
   Konsole, Formular …) steht rechts und bleibt über alle Kapitel erhalten; links
   die Lektion mit Schritten (stationen[].schritte: auftrag, pruefe, loesen).
   Beim Wiedereinstieg werden erledigte Schritte mit loesen nachgespielt.
   Spielmodus (PAKET.spielwelt, nur Form D): Das ganze Entdecken ist ein Spiel
   über die volle Breite; die Stationen sind seine Level.
   ===================================================================== */
(function () {
  'use strict';
  var P = window.PAKET;
  var haupt = document.getElementById('haupt');
  if (!P) { haupt.textContent = 'Inhalt fehlt: js/inhalt.js wurde nicht geladen.'; return; }
  // Marke „bereit“: Ab hier sitzt das Thema. Die Selbstüberprüfung zählt nicht (älterer Name des Felds: bestehen).
  var BEREIT = typeof P.bereit === 'number' ? P.bereit : typeof P.bestehen === 'number' ? P.bestehen : 80;
  var LZ = P.lernziele || [];
  var STATIONEN = P.stationen || [];
  var UEBUNGEN = P.uebungen || [];
  var SU = P.selbstueberpruefung || P.nachweis || {};  // älterer Name: nachweis
  var FR = {};
  (P.fragen || []).forEach(function (f) { FR[f.id] = f; });
  // Fragen für die Selbstüberprüfung (älterer Name des Einsatzes: nachweis)
  function inSU(f) { var e = f.einsatz || []; return e.indexOf('selbstueberpruefung') >= 0 || e.indexOf('nachweis') >= 0; }

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
  function woerter(html) { var s = String(html || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ').trim(); return s ? s.split(/\s+/).length : 0; }
  var KIT = window.KIT || null;
  var SPIEL = P.spiel || null;
  var WELTSPIEL = P.spielwelt || null;  // Spielmodus: ein Spiel statt einzelner Szenen
  var SIM = (!WELTSPIEL && P.simulation) ? P.simulation : null;  // Simulationsmodus: ein Arbeitsgegenstand über alle Stationen
  // Wort für eine Station in Texten für Lernende (im Simulationsmodus heißen Stationen Kapitel)
  var EH = SIM ? { e: 'Kapitel', m: 'Kapitel', diese: 'dieses Kapitel', die: 'das Kapitel' } : { e: 'Station', m: 'Stationen', diese: 'diese Station', die: 'die Station' };

  /* ---------- Welt: Farben, Kulisse, Symbol (PAKET.welt) ---------- */
  var WELT = P.welt || {};
  var THEMEN = { wirtschaft: 'buero', technik: 'serverraum', sprache: 'klasse', natur: 'natur', gesundheit: 'stadt', gestaltung: 'werkstatt' };
  (function welt() {
    var r = document.documentElement;
    r.setAttribute('data-thema', THEMEN[WELT.thema] ? WELT.thema : 'technik');
    if (WELT.farbe) r.style.setProperty('--accent', WELT.farbe);
    if (WELT.farbeHell) r.style.setProperty('--accent-soft', WELT.farbeHell);
    if (WELT.kopf) { r.style.setProperty('--kopf-a', WELT.kopf[0]); r.style.setProperty('--kopf-b', WELT.kopf[1] || WELT.kopf[0]); }
    var k = document.querySelector('.kopf');
    if (k && KIT) k.insertBefore(el('div', { class: 'kopf-kulisse', 'aria-hidden': 'true', html: KIT.kulisse(WELT.kulisse || THEMEN[WELT.thema] || 'serverraum') }), k.firstChild);
    var lg = document.querySelector('.kopf .logo');
    if (lg) lg.innerHTML = '<svg viewBox="0 0 52 52" width="52" height="52"><rect width="52" height="52" rx="14" fill="rgba(255,255,255,.16)" stroke="rgba(255,255,255,.45)"/>' +
      (WELT.symbol ? '<text x="26" y="35" text-anchor="middle" font-size="26">' + esc(WELT.symbol) + '</text>'
        : '<circle cx="26" cy="26" r="15" fill="none" stroke="#fff" stroke-width="3"/><path d="M26 13 L30 26 L26 39 L22 26 Z" fill="var(--deko)"/><circle cx="26" cy="26" r="3" fill="#fff"/>') + '</svg>';
  })();

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
  // ej: Einschätzung je Lernziel nach dem Kurz-Check (1–3, einmal je Lernziel); vb: Vorab-Fragen (1 richtig, 0 falsch, -1 übersprungen)
  var S = { ej: {}, vb: {}, sd: {}, st: {}, ue: {}, best: null, lz: {}, n: 0, skip: [], sp: {} };
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
    if (!P.id || !/^[a-z0-9]+-[a-z0-9]+(-[a-z0-9]+)*$/.test(P.id)) hinweise.push('PAKET.id sollte "<präfix>-<name>" lauten, z. B. ping-dreisatz (wie der Manifest-Identifier).');
    if (!/^\d+\.\d+(\.\d+)?$/.test(String(P.version || ''))) fehler.push('PAKET.version fehlt oder hat nicht die Form 1.0 (wird klein in der Kopfzeile und auf den Ausdrucken angezeigt).');
    if (BEREIT !== 80) hinweise.push('Die Marke „bereit“ liegt bei ' + BEREIT + ' %, der Leitfaden sieht 80 % vor (begründet abweichbar).');
    var alt = [];
    if (P.nachweis && !P.selbstueberpruefung) alt.push('PAKET.nachweis → PAKET.selbstueberpruefung');
    if (typeof P.bestehen === 'number' && typeof P.bereit !== 'number') alt.push('bestehen → bereit');
    if ((P.fragen || []).some(function (f) { return (f.einsatz || []).indexOf('nachweis') >= 0; })) alt.push('einsatz "nachweis" → "selbstueberpruefung"');
    if (alt.length) hinweise.push('Ältere Namen, seit Kompass 4.0 umbenannt (werden weiter gelesen): ' + alt.join(', ') + '.');
    if (LZ.length < 3 || LZ.length > 8) hinweise.push('Leitfaden: drei bis acht Lernziele (jetzt ' + LZ.length + ').');
    LZ.forEach(function (z) {
      id(z.id, 'Lernziel');
      if (!/^Ich kann/.test(z.text || '')) hinweise.push(z.id + ': Lernziel in Schülersprache beginnen („Ich kann …“).');
      if (!z.kurz) hinweise.push(z.id + ': Etikett (kurz) fehlt – es steht auf der Startseite im Lernpfad.');
      else if (woerter(z.kurz) > 4) hinweise.push(z.id + ': Etikett „' + z.kurz + '“ ist zu lang (höchstens 4 Wörter).');
    });
    // Startseite: nur Überblick (Leitfaden C2, Teil 0)
    var lw = woerter((SPIEL && SPIEL.intro) || P.leitsituation);
    if (!lw) hinweise.push('Leitsituation fehlt (zwei, drei Sätze für die Startseite).');
    else if (lw > 45) hinweise.push('Startseite: Leitsituation hat ' + lw + ' Wörter, Ziel höchstens etwa 40.');
    if ((P.glossar || []).some(function (g) { return g.vorab === true; })) hinweise.push('Glossar: vorab: true stellt Begriffe an Station 1 vor. Besser vorab: "<Stations-id>" – dort, wo der Begriff gebraucht wird.');
    (P.glossar || []).forEach(function (g) { if (typeof g.vorab === 'string' && !STATIONEN.some(function (s) { return s.id === g.vorab; })) fehler.push('Glossar „' + g.begriff + '“: Station ' + g.vorab + ' gibt es nicht.'); });
    var vb = alleVorab();
    if (!vb.length) hinweise.push('Keine Vorab-Fragen (Station: vorab) – ohne sie gibt es keine Abkürzung für Lernende mit Vorwissen.');
    vb.forEach(function (q) { if (leichtZuRaten(FR[q])) hinweise.push(q + ': Vorab-Frage ist leicht zu erraten (Einfachauswahl oder Hotspot). Besser Zahl, Text, Zuordnen oder Mehrfachauswahl, sonst trifft die Empfehlung zum Überspringen Glückspilze.'); });
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
    if (WELTSPIEL && typeof WELTSPIEL.start !== 'function') fehler.push('PAKET.spielwelt.start(box, api) fehlt.');
    if (P.simulation && WELTSPIEL) hinweise.push('PAKET.simulation und PAKET.spielwelt zugleich gesetzt – der Spielmodus hat Vorrang.');
    if (SIM && typeof SIM.start !== 'function') fehler.push('PAKET.simulation.start(box, api) fehlt.');
    if (WELTSPIEL && STATIONEN.some(function (s) { return (s.check || []).length > 3; })) hinweise.push('Spielmodus: Zwischenbilanz je Level mit höchstens 3 Fragen halten, damit das Spiel nicht zum Test wird.');
    if (!P.welt || !THEMEN[P.welt.thema]) hinweise.push('PAKET.welt.thema fehlt oder ist unbekannt (' + Object.keys(THEMEN).join(', ') + ') – jedes Paket bekommt eine eigene Welt.');
    if (!KIT) fehler.push('js/baukasten.js ist nicht (vor engine.js) eingebunden.');
    // Kurz-Check: 2–3 Fragen, dazu kommt die Auflösung der Vorab-Frage (zusammen höchstens 4); ohne Vorab-Frage 2–4
    function checkUmfang(s, c) {
      var v = vorabFragen(s).length, max = v ? 3 : 4;
      if (c.length < 2 || c.length > max) hinweise.push(s.id + ': Kurz-Check mit ' + (v ? '2–3 Fragen (die Vorab-Frage kommt als Auflösung dazu)' : '2–4 Fragen') + ', jetzt ' + c.length + '.');
    }
    STATIONEN.forEach(function (s, i) {
      id(s.id, 'Station ' + (i + 1));
      if (WELTSPIEL) { if (!s.titel) hinweise.push(s.id + ': Level ohne Titel.'); var cc = (s.check || []); cc.forEach(function (q) { if (!FR[q]) fehler.push(s.id + ': Kurz-Check-Frage ' + q + ' gibt es nicht.'); }); return; }
      if (SIM) {
        var sc = s.schritte || [];
        if (!sc.length) fehler.push(s.id + ': Simulationsmodus – das Kapitel braucht schritte: [{auftrag, pruefe(sim), loesen(sim)}].');
        sc.forEach(function (x, k) {
          var w = s.id + ' Schritt ' + (k + 1);
          if (!x.auftrag) hinweise.push(w + ': Auftrag fehlt.');
          if (typeof x.pruefe !== 'function') fehler.push(w + ': pruefe(sim) fehlt (woran erkennt das Paket, dass der Schritt erledigt ist?).');
          if (typeof x.loesen !== 'function') fehler.push(w + ': loesen(sim) fehlt (Musterlösung; wird auch zum Nachspielen beim Wiedereinstieg gebraucht).');
          var sw = woerter(x.auftrag) + woerter(x.erklaerung);
          if (sw > 66) hinweise.push(w + ': ' + sw + ' Wörter in Auftrag und Kurz erklärt (Ziel höchstens etwa 60). Mehr in den Gegenstand, weniger in den Text.');
        });
        if (sc.length && !sc.some(function (x) { return x.zeigen; })) hinweise.push(s.id + ': kein Schritt mit Vorführung (zeigen: true) – der erste neue Handgriff wird vorgemacht (P3).');
        if (sc.length > 6) hinweise.push(s.id + ': ' + sc.length + ' Schritte – ein Kapitel hat 2–6, lieber in zwei Kapitel teilen.');
        var cs = (s.check || []);
        cs.forEach(function (q) { if (!FR[q]) fehler.push(s.id + ': Kurz-Check-Frage ' + q + ' gibt es nicht.'); if (vorabFragen(s).indexOf(q) >= 0) hinweise.push(s.id + ': Frage ' + q + ' steht als Vorab-Frage und im Kurz-Check – die Vorab-Frage wird nach den Schritten von selbst aufgelöst, aus check entfernen.'); });
        checkUmfang(s, cs);
        return;
      }
      if (!s.auftrag) hinweise.push(s.id + ': Auftrag aus der Leitsituation fehlt.');
      if (!s.interaktion && !s.ohneInteraktion) fehler.push(s.id + ': keine Szene zum Anfassen (interaktion). Jede Station braucht etwas, das die Lernenden bewegen (Leitfaden P12). Nur in begründeten Ausnahmen ohneInteraktion: "Begründung" setzen.');
      if (!s.interaktion && s.ohneInteraktion) hinweise.push(s.id + ': Station ohne Szene – Begründung: ' + s.ohneInteraktion);
      var hatVorab = vorabFragen(s).length > 0;
      if (hatVorab && s.leitfrage) hinweise.push(s.id + ': Leitfrage und Vorab-Frage zugleich – die Vorab-Frage ist die Leitfrage der Station, leitfrage weglassen.');
      var tw = woerter(s.auftrag) + (hatVorab ? 0 : woerter(s.leitfrage)) + woerter(s.inhalt);
      if (tw > 90) hinweise.push(s.id + ': Textbudget überschritten (' + tw + ' Wörter in Auftrag, Leitfrage und Kurz erklärt; Ziel höchstens 90). Mehr in die Szene, weniger in den Text.');
      if (s.beispiel && s.beispiel.schritte && s.interaktion) hinweise.push(s.id + ': Lösungsbeispiel als Text (beispiel) – besser als Vorführung in der Szene (demo in der Interaktion).');
      if (s.interaktion && !s.selbsterklaerung && !(s.beispiel && s.beispiel.selbsterklaerung)) hinweise.push(s.id + ': keine Frage zum Selbsterklären (selbsterklaerung: {schritt, frage}) für die Vorführung.');
      [].concat(s.vorab || []).forEach(function (q) { if (!FR[q]) fehler.push(s.id + ': Vorab-Frage ' + q + ' gibt es nicht.'); });
      var c = (s.check || []);
      c.forEach(function (q) { if (!FR[q]) fehler.push(s.id + ': Kurz-Check-Frage ' + q + ' gibt es nicht.'); if ([].concat(s.vorab || []).indexOf(q) >= 0) hinweise.push(s.id + ': Frage ' + q + ' steht als Vorab-Frage und im Kurz-Check – die Vorab-Frage wird nach der Szene von selbst aufgelöst, aus check entfernen.'); });
      checkUmfang(s, c);
    });
    UEBUNGEN.forEach(function (u, i) {
      id(u.id, 'Übung ' + (i + 1));
      if (u.frage && !FR[u.frage]) fehler.push(u.id + ': Frage ' + u.frage + ' gibt es nicht.');
      if (!u.frage && !u.interaktion) fehler.push(u.id + ': braucht frage oder interaktion.');
      if (u.frage && !u.interaktion) hinweise.push(u.id + ': Übung nur als Frage – wo möglich als Szene (interaktion) in einer neuen Situation.');
      if (!u.tipps || u.tipps.length !== 3) hinweise.push(u.id + ': genau drei gestufte Tipps vorgesehen.');
      if (!u.reflexion || !u.reflexion.muster) hinweise.push(u.id + ': Reflexionsfrage mit Musterantwort fehlt.');
    });
    var pro = (SU.teilB && SU.teilB.proLZ) || 2;
    LZ.forEach(function (z) {
      var n = (P.fragen || []).filter(function (f) { return f.lz === z.id && inSU(f); }).length;
      if (n < pro) fehler.push(z.id + ': nur ' + n + ' Fragen für die Selbstüberprüfung, nötig sind ' + pro + '.');
      else if (n < pro + 2) hinweise.push(z.id + ': Pool klein (' + n + ' Fragen für die Selbstüberprüfung) – Wiederholungen ziehen oft dieselben Fragen.');
    });
    if (!SU.teilA) hinweise.push('Selbstüberprüfung ohne Teil A (Handlungsaufgabe in neuer Situation).');
    STATIONEN.forEach(function (s) { if (s.beispiel && s.beispiel.schritte && !s.beispiel.selbsterklaerung) hinweise.push(s.id + ': Lösungsbeispiel ohne Frage zum Selbsterklären (selbsterklaerung).'); });
    if (SPIEL && !STATIONEN.every(function (s) { return s.mission && s.mission.ort; })) hinweise.push('Spielrahmen: Jede Station braucht mission.ort (Name auf der Karte) und mission.ende (Story nach dem Lösen).');
    if (!STATIONEN.concat(UEBUNGEN).some(function (x) { return x.mitdenken; })) hinweise.push('Keine Aufträge zum Mitdenken (Skizzieren, Zusammenfassen, Erklären).');
    if (!(P.glossar || []).length) hinweise.push('Kein Glossar mit Fachbegriffen.');
    if (/<(audio|video)\b/i.test(JSON.stringify(P, function (k, v) { return typeof v === 'function' ? String(v) : v; }))) hinweise.push('Paket enthält Ton oder Video: Untertitel bzw. Transkript sicherstellen.');
    if (!P.merkblatt || !P.merkblatt.length) hinweise.push('Kein Merkblatt (P13, Soll).');
    else LZ.forEach(function (z) { if (!P.merkblatt.some(function (m) { return m.lz === z.id; })) hinweise.push('Merkblatt ohne Abschnitt zu ' + z.id + '.'); });
    (P.selbsttest || []).forEach(function (q) { if (!FR[q]) fehler.push('Selbsttest-Frage ' + q + ' gibt es nicht.'); });
    // Tafelbild: Baustein für den Mittelteil (Erklären und Beispiel) eines Inputs, der sonst auf Folien läuft (Leitfaden C2)
    if (!P.tafel) hinweise.push('Kein Tafelbild (PAKET.tafel): Zwei bis vier Tafelbild-Szenen aus den Bildern des Pakets gehören zu jedem Paket (Soll).');
    else {
      var sz = P.tafel.szenen || [];
      if (!window.TAFEL) fehler.push('PAKET.tafel ist gesetzt, aber js/tafel.js ist nicht (vor engine.js) eingebunden.');
      if (!sz.length) fehler.push('Tafelbild ohne Szenen.');
      if (sz.length > 4) hinweise.push('Tafelbild mit ' + sz.length + ' Szenen – es ersetzt nur den Mittelteil des Inputs (Erklären und Beispiel): zwei bis vier Szenen genügen.');
      sz.forEach(function (s, i) {
        var w = 'Tafelbild-Szene ' + (i + 1);
        if (typeof s.zeichne !== 'function') fehler.push(w + ': zeichne-Funktion fehlt.');
        if (!s.titel) hinweise.push(w + ': titel fehlt.');
        if (!s.erklaerung) hinweise.push(w + ': zuschaltbare Erklärung für Schüler fehlt.');
        if (!s.station) hinweise.push(w + ': keine Station verknüpft (das Tafelbild zeigt nur, was auch im Paket vorkommt).');
        else if (!STATIONEN.some(function (x) { return x.id === s.station; })) hinweise.push(w + ': Station ' + s.station + ' gibt es (noch) nicht.');
      });
    }
    return { fehler: fehler, hinweise: hinweise };
  }
  function lzIds() { var o = {}; LZ.forEach(function (z) { o[z.id] = 1; }); return o; }
  // Vorab-Fragen einer Station: s.vorab (id oder Liste); ältere Pakete: PAKET.vorwissen, nach Lernziel zugeordnet
  function vorabFragen(s) {
    if (s.vorab === false) return [];
    if (s.vorab) return [].concat(s.vorab).filter(function (q) { return FR[q]; });
    return (P.vorwissen || []).filter(function (q) { return FR[q] && (s.lz || []).indexOf(FR[q].lz) >= 0; });
  }
  function alleVorab() { var o = []; STATIONEN.forEach(function (s) { vorabFragen(s).forEach(function (q) { if (o.indexOf(q) < 0) o.push(q); }); }); return o; }
  function leichtZuRaten(f) {
    if (!f) return false;
    if (f.typ === 'hotspot') return true;
    return f.typ === 'mc' && !f.mehrfach && (f.optionen || []).filter(function (o) { return o.richtig; }).length === 1;
  }
  // Überspringbar ist eine Station, deren Vorab-Fragen alle richtig beantwortet wurden
  function skipNeu() {
    S.skip = STATIONEN.filter(function (s) { var q = vorabFragen(s); return q.length && q.every(function (id) { return S.vb[id] === 1; }); }).map(function (s) { return s.id; });
  }

  /* ---------- Fragen-Baustein ---------- */
  // modus 'lernen': Prüfen-Knopf, Feedback direkt an der Antwort, Nochmal, Lösung zeigen.
  // modus 'pruefung': kein Feedback; bewerten() liefert {score 0..1, antwort}.
  function frage(f, modus, opt) {
    opt = opt || {};
    var box = el('div', { class: 'frage', 'data-frage': f.id });
    if (opt.vorspann) box.appendChild(el('div', { class: 'klein vorspann', text: opt.vorspann }));
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
    { id: 'start', nr: '⌂', name: 'Start' },
    { id: 'entdecken', nr: '①', name: WELTSPIEL ? (WELTSPIEL.tab || 'Spielen') : 'Entdecken' },
    { id: 'ueben', nr: '②', name: 'Üben' },
    { id: 'pruefen', nr: '③', name: 'Selbstüberprüfung' },
    { id: 'abschluss', nr: '④', name: 'Abschluss' }
  ];
  var suLauf = null;      // laufender Versuch der Selbstüberprüfung (nicht gespeichert)
  var letzterVersuch = null; // Ergebnis des letzten Versuchs in dieser Sitzung
  var testHaken = [];     // Objekte aktueller Interaktionen (für automatische Tests)

  function zeige(teil, i) {
    if (teil === 'nachweis') teil = 'pruefen';  // älterer Name der Ansicht
    if (teil !== 'pruefen' && suLauf && suLauf.phase !== 'fertig') suLauf = null;
    ANSICHT = { teil: teil, i: i || 0 };
    render();
    haupt.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  function anzahl(o) { return Object.keys(o).filter(function (k) { return o[k]; }).length; }
  function kopf() {
    var ti = document.getElementById('titel');
    ti.textContent = P.titel || '';
    if (P.version) ti.appendChild(el('span', { class: 'version', id: 'version', title: 'Version des Lernpakets', 'aria-label': 'Version ' + P.version, text: 'v' + P.version }));
    document.getElementById('untertitel').textContent = P.untertitel || '';
    document.title = P.titel || 'Lernpaket';
    // Eine Kopfzeile: außerhalb der Startseite kompakt, damit die Szene ohne Scrollen Platz hat
    var kz = document.querySelector('.kopf'); if (kz) kz.classList.toggle('kompakt', ANSICHT.teil !== 'start');
    var fp = document.getElementById('fortschritt'); fp.innerHTML = '';
    var st = STATIONEN.filter(function (s) { return S.st[s.id]; }).length;
    var ue = UEBUNGEN.filter(function (u) { return S.ue[u.id]; }).length;
    if (SPIEL && SPIEL.zaehler) fp.appendChild(el('span', { class: 'chip spielstand' + (st === STATIONEN.length && st ? ' ok' : ''), text: (SPIEL.zaehler.symbol || '★') + ' ' + st + '/' + STATIONEN.length + ' ' + (SPIEL.zaehler.name || '') }));
    // Der Fortschritt steht direkt an den Teilen (früher eigene Etiketten rechts im Kopf)
    var stand = {
      entdecken: STATIONEN.length ? { text: st + '/' + STATIONEN.length, ok: st === STATIONEN.length, sr: st + ' von ' + STATIONEN.length + ' erledigt' } : null,
      ueben: UEBUNGEN.length ? { text: ue + '/' + UEBUNGEN.length, ok: ue === UEBUNGEN.length, sr: ue + ' von ' + UEBUNGEN.length + ' erledigt' } : null,
      pruefen: S.best !== null ? { text: S.best + ' %', ok: S.best >= BEREIT, sr: 'bestes Ergebnis ' + S.best + ' Prozent' } : null
    };
    var tabs = document.getElementById('tabs'); tabs.innerHTML = '';
    TEILE.forEach(function (t) {
      var x = stand[t.id];
      tabs.appendChild(el('button', { type: 'button', 'data-teil': t.id, class: (ANSICHT.teil === t.id ? 'aktiv' : '') + (x && x.ok ? ' fertig' : ''), 'aria-current': ANSICHT.teil === t.id ? 'page' : null,
        'aria-label': (t.id === 'start' ? '' : t.nr + ' ') + t.name + (x ? ' (' + x.sr + ')' : ''), title: t.name, onclick: function () { zeige(t.id, 0); } }, [
        el('span', { class: 'nr', 'aria-hidden': 'true', text: t.nr }),
        el('span', { class: 'name', text: t.name }),
        x ? el('span', { class: 'stand', text: (x.ok ? '✓ ' : '') + x.text }) : null
      ]));
    });
    // schmale Bildschirme: Die Teile stehen in einer wischbaren Zeile – den aktuellen Teil in den Blick holen
    var akt = tabs.querySelector('.aktiv');
    if (akt && tabs.scrollWidth > tabs.clientWidth) { var rechts = akt.offsetLeft + akt.offsetWidth; if (rechts > tabs.clientWidth) tabs.scrollLeft = rechts - tabs.clientWidth + 12; }
    var fuss = document.getElementById('fuss');
    fuss.textContent = (P.titel || '') + (P.version ? ' · Version ' + P.version : '') + ' · ' + (SC.aktiv ? 'Fortschritt wird in der Lernplattform gespeichert.' : 'Ohne Lernplattform geöffnet: Fortschritt nur in diesem Browser, keine Übertragung von Ergebnissen.');
  }
  // ruhig: Der Knopf führt weiter, ist aber noch nicht der nächste sinnvolle Schritt (Aufgabe offen) – dann ohne Akzentfarbe.
  // So ist je Ansicht höchstens ein Knopf hervorgehoben, und er zeigt nie von der offenen Aufgabe weg (Leitfaden P7).
  function leiste(info, label, aktion, extra, ruhig) {
    var l = document.getElementById('leiste'); l.innerHTML = '';
    l.appendChild(el('div', { class: 'info', html: info || '' }));
    if (extra) l.appendChild(extra);
    if (label) l.appendChild(el('button', { type: 'button', class: ruhig ? 'ruhig' : 'primaer', id: 'weiter', html: label, onclick: aktion }));
  }
  function auftrag(text, leitfrage, was) {
    return el('div', { class: 'auftrag' }, [el('span', { class: 'was', text: was || 'Dein Auftrag' }), el('span', { html: text }), leitfrage ? el('div', { class: 'klein', html: '<b>Leitfrage:</b> ' + leitfrage }) : null]);
  }
  function figurDaten(key) { return (key && P.figuren && P.figuren[key]) || P.figur || {}; }
  function figurBild(key, aus) {
    if (KIT) return KIT.figur(key && P.figuren && P.figuren[key] ? key : 'figur', { ausdruck: aus });
    var ini = (figurDaten(key).name || '?').split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2);
    return '<svg viewBox="0 0 120 140"><circle cx="60" cy="70" r="56" fill="var(--ink)"/><text x="60" y="84" text-anchor="middle" font-size="40" fill="#fff">' + esc(ini) + '</text></svg>';
  }
  function figur(text, key) {
    var fg = figurDaten(key);
    return el('div', { class: 'figur' }, [el('div', { class: 'avatar', 'aria-hidden': 'true', html: figurBild(key) }), el('div', { class: 'blase' }, [fg.name ? el('div', { class: 'name', text: fg.name + (fg.rolle ? ' · ' + fg.rolle : '') }) : null, el('div', { html: text })])]);
  }
  // Auftrag als Sprechblase der Figur; sage() ergänzt eine Reaktion (z. B. aus der Szene)
  function mission(text, leitfrage, key, was) {
    var fg = figurDaten(key);
    var bild = el('div', { class: 'mission-bild', 'aria-hidden': 'true', html: figurBild(key) });
    var reaktion = el('span', { class: 'reaktion', 'aria-live': 'polite' });
    var blase = el('div', { class: 'blase' }, [el('span', { class: 'name', text: (was || 'Dein Auftrag') + (fg.name ? ' · ' + fg.name : '') }), el('span', { html: text }), leitfrage ? el('span', { class: 'leitfrage', html: '<b>Leitfrage:</b> ' + leitfrage }) : null, reaktion]);
    return {
      el: el('div', { class: 'mission' }, [bild, blase]),
      sage: function (t, aus) { reaktion.innerHTML = t ? '<span class="leitfrage">' + (fg.name ? '<b>' + esc(fg.name.split(' ')[0]) + ':</b> ' : '') + t + '</span>' : ''; if (aus) bild.innerHTML = figurBild(key, aus); }
    };
  }
  function naechsteStation(i) { return i + 1 < STATIONEN.length ? { t: 'entdecken', i: i + 1, label: 'Weiter zu ' + EH.e + ' ' + (i + 2) + ': ' + esc(STATIONEN[i + 1].titel) + ' →' } : { t: 'ueben', i: 0, label: 'Weiter zu ② Üben →' }; }
  function naechsteUebung(i) { return i + 1 < UEBUNGEN.length ? { t: 'ueben', i: i + 1, label: 'Weiter zu Übung ' + (i + 2) + ' →' } : { t: 'pruefen', i: 0, label: 'Weiter zu ③ Selbstüberprüfung →' }; }

  function render() {
    kopf();
    testHaken = [];
    haupt.innerHTML = '';
    var pr = pruefeInhalt();
    if (pr.fehler.length) haupt.appendChild(msg('<b>Hinweis für Autor:innen – der Inhalt hat Fehler:</b><br>' + pr.fehler.map(esc).join('<br>'), 'bad'));
    ({ start: vStart, abkuerzung: vAbkuerzung, entdecken: WELTSPIEL ? vSpiel : SIM ? vSimulation : vStation, ueben: vUebung, pruefen: vPruefen, abschluss: vAbschluss }[ANSICHT.teil])();
  }

  /* ---------- Start ---------- */
  // Einschätzung in drei Stufen (Leitfaden P11): kurz, einmal antippen, nach dem ersten Kontakt mit dem Stoff
  var STUFEN = ['unsicher', 'einigermaßen', 'sicher'];
  function stufeText(v) { return v >= 1 && v <= 3 ? STUFEN[v - 1] : '–'; }
  function skala(werte, key, lzid, onChange) {
    var g = el('div', { class: 'skala', role: 'radiogroup', 'aria-label': 'Wie sicher bist du bei ' + (lz(lzid).kurz || lzid) + '?' });
    STUFEN.forEach(function (s, i) {
      var inp = el('input', { type: 'radio', name: key + lzid, value: i + 1 });
      if (werte[lzid] === i + 1) inp.checked = true;
      inp.addEventListener('change', function () { werte[lzid] = i + 1; speichern(); if (onChange) onChange(i + 1); });
      g.appendChild(el('label', {}, [inp, el('span', { text: s })]));
    });
    return g;
  }
  // Einschätzung einmal je Lernziel: an der letzten Station, die das Lernziel behandelt
  function lzZumEinschaetzen(s) {
    return (s.lz || []).filter(function (id) {
      for (var j = STATIONEN.length - 1; j >= 0; j--) if ((STATIONEN[j].lz || []).indexOf(id) >= 0) return STATIONEN[j] === s;
      return false;
    });
  }
  // nach dem Kurz-Check: Einschätzung je Lernziel, mit Rückmeldung zur Treffsicherheit
  function einschaetzung(lzs, n, gesamt) {
    if (!(lzs || []).length) return null;
    var box = el('div', { class: 'einschaetzung' });
    var rm = el('div', { 'aria-live': 'polite' });
    lzs.forEach(function (id) {
      box.appendChild(el('div', { class: 'lzzeile se' }, [el('div', { html: 'Wie sicher bist du jetzt bei <b>' + esc(lz(id).kurz || id) + '</b>?' }), skala(S.ej, 'ej', id, function (v) {
        rm.innerHTML = '';
        if (gesamt && v === 3 && n < gesamt) rm.appendChild(msg('Du fühlst dich sicher, hattest aber ' + (gesamt - n) + ' von ' + gesamt + ' Fragen falsch. Lies dir die Erklärungen dazu noch einmal durch.', 'warn'));
        else if (gesamt && v === 1 && n === gesamt) rm.appendChild(msg('Alles richtig – du kannst mehr, als du denkst.', 'ok'));
        else rm.appendChild(msg('Notiert. Im Abschluss steht deine Einschätzung neben dem Ergebnis der Selbstüberprüfung.', ''));
      })]));
    });
    box.appendChild(rm);
    return box;
  }
  function weltkarte() {
    var n = STATIONEN.length + 1, w = 640, h = 200, pts = [];
    for (var i = 0; i < n; i++) pts.push([n === 1 ? w / 2 : 100 + i * (w - 200) / (n - 1), 105 + Math.sin(i * 1.7) * 45]);
    var d = 'M' + pts.map(function (p) { return p[0].toFixed(0) + ' ' + p[1].toFixed(0); }).join(' L');
    var svg = '<svg viewBox="0 0 ' + w + ' ' + h + '" role="group" aria-label="Karte der Missionen"><path d="' + d + '" fill="none" stroke="var(--line)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 18"/>';
    pts.forEach(function (p, i) {
      var s = STATIONEN[i], fertig = s ? !!S.st[s.id] : S.best !== null && S.best >= BEREIT;
      var name = s ? ((s.mission && s.mission.ort) || s.titel) : 'Selbstüberprüfung';
      svg += '<g class="ort-knoten" data-i="' + i + '" tabindex="0" role="button" aria-label="' + esc(name) + (fertig ? ' (geschafft)' : '') + '">' +
        '<circle class="ring" cx="' + p[0] + '" cy="' + p[1] + '" r="24" fill="' + (fertig ? 'var(--ok)' : s ? 'var(--card)' : 'var(--deko)') + '" stroke="' + (fertig ? 'var(--ok)' : 'var(--accent)') + '" stroke-width="3"/>' +
        '<text x="' + p[0] + '" y="' + (p[1] + 7) + '" text-anchor="middle" font-size="20" font-weight="800" fill="' + (fertig ? '#fff' : 'var(--ink)') + '">' + (fertig ? '✓' : s ? (s.mission && s.mission.symbol) || (i + 1) : '🏁') + '</text>' +
        '<text x="' + p[0] + '" y="' + (p[1] + (p[1] > 105 ? -34 : 46)) + '" text-anchor="middle" font-size="14" font-weight="700" fill="var(--ink)">' + esc(name.length > 22 ? name.slice(0, 21) + '…' : name) + '</text></g>';
    });
    var box = el('div', { class: 'weltkarte', html: (KIT ? KIT.kulisse(WELT.kulisse || THEMEN[WELT.thema] || 'serverraum') : '') + svg + '</svg>' });
    box.querySelectorAll('.ort-knoten').forEach(function (g) {
      function geh() { var i = +g.getAttribute('data-i'); if (i < STATIONEN.length) zeige('entdecken', i); else zeige('pruefen'); }
      g.addEventListener('click', geh);
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); geh(); } });
    });
    return box;
  }
  // Der nächste sinnvolle Schritt – für den einen Knopf auf der Startseite
  function naechsterSchritt() {
    var begonnen = anzahl(S.st) || anzahl(S.ue) || S.n;
    var vor = begonnen ? 'Weiter: ' : 'Los geht’s: ';
    if (WELTSPIEL) { if (STATIONEN.some(function (s) { return !S.st[s.id]; })) return { t: 'entdecken', i: 0, label: begonnen ? 'Weiterspielen →' : 'Los geht’s →' }; }
    else for (var i = 0; i < STATIONEN.length; i++) if (!S.st[STATIONEN[i].id] && S.skip.indexOf(STATIONEN[i].id) < 0) return { t: 'entdecken', i: i, label: vor + EH.e + ' ' + (i + 1) + ' →' };
    for (var k = 0; k < UEBUNGEN.length; k++) if (!S.ue[UEBUNGEN[k].id]) return { t: 'ueben', i: k, label: vor + 'Übung ' + (k + 1) + ' →' };
    if (!S.n) return { t: 'pruefen', i: 0, label: vor + '③ Selbstüberprüfung →' };
    return { t: 'abschluss', i: 0, label: 'Zum ④ Abschluss →' };
  }
  // Lernpfad: die vier Teile auf einen Blick, Stationen als Punkte, Lernziele als Etiketten (Advance Organizer)
  function lernpfad() {
    var box = el('section', { class: 'card lernpfad', 'aria-label': 'Dein Lernweg' });
    var reihe = el('ol', { class: 'lp-teile' });
    function teil(id, nr, name, sub, fertig, extra) {
      var li = el('li', { class: 'lp-teil' + (fertig ? ' fertig' : '') });
      li.appendChild(el('button', { type: 'button', class: 'lp-kopf', onclick: function () { zeige(id, 0); } }, [el('span', { class: 'lp-nr', 'aria-hidden': 'true', text: fertig ? '✓' : nr }), el('span', { text: name })]));
      if (extra) li.appendChild(extra);
      li.appendChild(el('div', { class: 'lp-sub', html: sub }));
      reihe.appendChild(li);
    }
    var stF = STATIONEN.filter(function (s) { return S.st[s.id]; }).length;
    var punkte = el('div', { class: 'lp-punkte' });
    STATIONEN.forEach(function (s, i) {
      var skip = S.skip.indexOf(s.id) >= 0 && !S.st[s.id];
      punkte.appendChild(el('button', { type: 'button', class: 'lp-punkt' + (S.st[s.id] ? ' fertig' : '') + (skip ? ' skip' : ''), title: s.titel + (skip ? ' – darfst du überspringen' : ''),
        'aria-label': (WELTSPIEL ? 'Level ' : EH.e + ' ') + (i + 1) + ': ' + s.titel + (S.st[s.id] ? ' (erledigt)' : skip ? ' (darfst du überspringen)' : ''),
        text: S.st[s.id] ? '✓' : skip ? '»' : String(i + 1), onclick: function () { zeige('entdecken', WELTSPIEL ? 0 : i); } }));
    });
    var wort = WELTSPIEL ? 'Level' : (STATIONEN.length === 1 ? EH.e : EH.m);
    // im Spielrahmen stehen die Stationen schon auf der Missionskarte
    teil('entdecken', '1', WELTSPIEL ? (WELTSPIEL.tab || 'Spielen') : 'Entdecken', stF + ' von ' + STATIONEN.length + ' ' + wort, STATIONEN.length && stF === STATIONEN.length, SPIEL ? null : punkte);
    var ueF = UEBUNGEN.filter(function (u) { return S.ue[u.id]; }).length;
    if (UEBUNGEN.length) teil('ueben', '2', 'Üben', ueF + ' von ' + UEBUNGEN.length + ' Aufgaben', ueF === UEBUNGEN.length);
    teil('pruefen', '3', 'Selbstüberprüfung', S.best === null ? 'zählt nicht' : 'bestes Ergebnis ' + S.best + ' %', S.best !== null && S.best >= BEREIT);
    teil('abschluss', '4', 'Abschluss', 'Merkblatt zum Mitnehmen', false);
    box.appendChild(reihe);
    // Lernziele als kurze Etiketten; der ganze Satz erscheint beim Antippen
    if (LZ.length) {
      var ziele = el('div', { class: 'lp-ziele' }, [el('span', { class: 'lp-ziele-titel', text: 'Deine Ziele' })]);
      var satz = el('p', { class: 'lp-zielsatz', 'aria-live': 'polite' });
      LZ.forEach(function (z) {
        var erreicht = S.n && (S.lz[z.id] || 0) >= 80;
        var begonnen = STATIONEN.some(function (s) { return (s.lz || []).indexOf(z.id) >= 0 && S.st[s.id]; });
        var stand = erreicht ? 'in der Selbstüberprüfung erreicht' : begonnen ? 'angefangen' : 'noch offen';
        var b = el('button', { type: 'button', class: 'ziel-chip' + (erreicht ? ' ok' : begonnen ? ' halb' : ''), 'aria-expanded': 'false', title: stand,
          html: '<span class="zs" aria-hidden="true"></span>' + esc(z.kurz || z.id) + '<span class="sr"> (' + stand + ')</span>' });
        b.addEventListener('click', function () {
          var auf = b.getAttribute('aria-expanded') !== 'true';
          ziele.querySelectorAll('.ziel-chip').forEach(function (x) { x.setAttribute('aria-expanded', 'false'); });
          b.setAttribute('aria-expanded', auf ? 'true' : 'false');
          satz.innerHTML = auf ? z.text : '';
        });
        ziele.appendChild(b);
      });
      box.appendChild(ziele);
      box.appendChild(satz);
    }
    return box;
  }
  function vStart() {
    if (SPIEL) {
      var sp = el('div', { class: 'card karte-mission' });
      sp.appendChild(el('div', {}, [el('div', { class: 'ort klein', text: 'Deine Mission' }), el('h2', { text: SPIEL.titel || P.titel }), figur(SPIEL.intro || P.leitsituation || ''), SPIEL.ziel ? el('p', { html: '<b>Ziel:</b> ' + SPIEL.ziel }) : null]));
      sp.appendChild(weltkarte());
      haupt.appendChild(sp);
    } else if (P.leitsituation && KIT) {
      var fg = figurDaten();
      var hero = el('div', { class: 'hero' });
      hero.innerHTML = KIT.kulisse(WELT.kulisse || THEMEN[WELT.thema] || 'serverraum');
      hero.appendChild(el('div', { class: 'hero-inhalt' }, [el('div', { class: 'hero-figur', 'aria-hidden': 'true', html: figurBild(null, 'froh') }), el('div', { class: 'hero-text' }, [el('div', { class: 'name', text: (fg.name || '') + (fg.rolle ? ' · ' + fg.rolle : '') }), el('h2', { text: P.titel || '' }), el('div', { html: P.leitsituation })])]));
      haupt.appendChild(hero);
    } else if (P.leitsituation) {
      haupt.appendChild(el('div', { class: 'card' }, figur(P.leitsituation)));
    }
    haupt.appendChild(lernpfad());
    // unaufdringlicher Zusatzweg: Abkürzung für Lernende mit Vorwissen (das Tafelbild öffnet die Lehrkraft über den Knopf im Kopf)
    var extra = el('div', { class: 'start-extra' });
    if (alleVorab().length) extra.appendChild(el('button', { type: 'button', class: 'link', id: 'abkuerzung', text: 'Ich kenne mich schon aus →', onclick: function () { zeige('abkuerzung'); } }));
    if (extra.children.length) haupt.appendChild(extra);
    var nx = naechsterSchritt();
    leiste((P.dauer ? 'Dauer: ' + esc(P.dauer) + ' · ' : '') + 'Dein Stand bleibt gespeichert.', nx.label, function () { zeige(nx.t, nx.i); });
  }
  // Abkürzung: alle Vorab-Fragen auf einmal; was sitzt, wird auf dem Lernpfad als überspringbar markiert
  function vAbkuerzung() {
    var ids = alleVorab();
    var c = el('div', { class: 'card' });
    c.appendChild(el('h2', { text: 'Was kannst du schon?' }));
    c.appendChild(el('p', { class: 'klein', html: 'Beantworte die Fragen ohne Hilfe. Was du sicher kannst, darfst du danach überspringen. Alle ' + EH.m + ' bleiben erreichbar, die Selbstüberprüfung am Ende ist für alle gleich. <span class="badge zaehlt-nicht">zählt nicht</span>' }));
    var qs = ids.map(function (id, k) { var q = frage(FR[id], 'pruefung', { nr: k + 1 }); c.appendChild(q.el); return q; });
    var erg = el('div', { 'aria-live': 'polite' });
    c.appendChild(erg);
    haupt.appendChild(c);
    function auswerten() {
      qs.forEach(function (q) { var r = q.bewerten(); q.feedbackNachher(); S.vb[q.f.id] = r.score >= 1 ? 1 : 0; });
      skipNeu(); speichern(); kopf();
      var namen = S.skip.map(function (id) { return esc(STATIONEN.filter(function (x) { return x.id === id; })[0].titel); });
      erg.innerHTML = '';
      erg.appendChild(msg(namen.length ? (WELTSPIEL ? '<b>Stark!</b> Diese Level fallen dir bestimmt leicht: ' : '<b>Stark!</b> Diese ' + EH.m + ' darfst du überspringen: ') + namen.join(', ') + '. Sie sind auf deinem Lernweg markiert.' : 'Hier ist noch einiges neu für dich. Arbeite ' + 'die ' + EH.m + ' der Reihe nach durch – dafür sind sie da.', namen.length ? 'ok' : ''));
      var nx = naechsterSchritt();
      leiste('Ausgewertet.', nx.label, function () { zeige(nx.t, nx.i); });
      erg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    testHaken.push({ art: 'abkuerzung', obj: { auswerten: auswerten, loesen: function () { qs.forEach(function (q) { q.loesungEinsetzen(); }); } } });
    leiste(ids.length + (ids.length === 1 ? ' Frage' : ' Fragen'), 'Auswerten →', auswerten);
  }

  /* ---------- Bausteine zum Mitdenken und Nachschlagen ---------- */
  // Selbsterklärung im Lösungsbeispiel: erst selbst überlegen, dann die Begründung aufklappen (P3, generatives Lernen)
  function selbsterklaeren(frage, begruendung) {
    var box = el('div', { class: 'selbst' });
    box.appendChild(el('div', { html: '🤔 <b>Erklär es dir selbst:</b> ' + frage }));
    var ta = el('textarea', { rows: 2, 'aria-label': 'Deine Erklärung', placeholder: 'Deine Erklärung in eigenen Worten …' });
    var aus = el('div', { 'aria-live': 'polite' });
    box.appendChild(ta);
    box.appendChild(el('button', { type: 'button', text: 'Begründung zeigen', onclick: function (e) { aus.innerHTML = ''; aus.appendChild(el('div', { class: 'warum', html: 'Warum: ' + begruendung })); e.target.hidden = true; } }));
    box.appendChild(aus);
    return box;
  }
  // Auftrag zum Mitdenken nach Station oder Übung: skizzieren, zusammenfassen, jemandem erklären
  function mitdenken(md) {
    var box = el('div', { class: 'mitdenken' });
    box.appendChild(el('div', { html: '✏️ <b>Mitdenken:</b> ' + md.auftrag }));
    if (md.eingabe !== false) box.appendChild(el('textarea', { rows: 3, 'aria-label': 'Deine Antwort', placeholder: 'Schreib oder skizziere auf Papier – hier ist Platz für Stichpunkte.' }));
    if (md.muster) {
      var mu = el('div', { 'aria-live': 'polite' });
      box.appendChild(el('button', { type: 'button', text: 'Mit Muster vergleichen', onclick: function () { mu.innerHTML = ''; mu.appendChild(el('div', { class: 'muster', html: '<b>Muster:</b> ' + md.muster })); } }));
      box.appendChild(mu);
    }
    return box;
  }
  // Glossar mit allen Fachbegriffen, jederzeit aufklappbar (C3: Vortraining, Deutsch als Zweitsprache)
  function glossar() {
    if (!(P.glossar || []).length) return null;
    var d = el('details', { class: 'glossar-box' }, [el('summary', { text: '📖 Fachbegriffe nachschlagen' })]);
    d.appendChild(el('dl', { class: 'glossar' }, P.glossar.reduce(function (a, g) { return a.concat([el('dt', { html: g.begriff }), el('dd', { html: g.erklaerung })]); }, [])));
    return d;
  }

  /* ---------- ① Entdecken ---------- */
  // Stationen, Kapitel und Übungen als Punkte im Kopf der Karte (früher eine eigene Zeile über der Karte):
  // Das spart Höhe für die Szene. Der Titel steht beim Überfahren und für Vorleseprogramme am Punkt.
  function pfad(items, aktiv, teil, erledigt, praefix) {
    var nav = el('nav', { class: 'pfad', 'aria-label': praefix });
    items.forEach(function (s, i) {
      var skip = S.skip.indexOf(s.id) >= 0 && !erledigt[s.id];
      var name = (s.mission && s.mission.ort) || s.titel || '';
      nav.appendChild(el('button', { type: 'button', class: 'pfad-punkt' + (erledigt[s.id] ? ' fertig' : '') + (skip ? ' skip' : '') + (i === aktiv ? ' aktiv' : ''), 'aria-current': i === aktiv ? 'step' : null,
        title: name + (skip ? ' – darfst du überspringen' : ''), 'aria-label': (i + 1) + ': ' + name + (erledigt[s.id] ? ' (erledigt)' : skip ? ' (darfst du überspringen)' : ''),
        text: erledigt[s.id] ? '✓' : skip ? '»' : String(i + 1), onclick: function () { zeige(teil, i); } }));
    });
    return nav;
  }

  // Kopf einer Station, eines Kapitels oder einer Übung: Ort und Punkte in einer Zeile, darunter Titel und Ziel
  function stKopf(ortHtml, nav, titel, zielHtml, rechts) {
    return el('div', { class: 'st-kopf' }, [el('div', { class: 'st-links' }, [
      el('div', { class: 'ort-zeile' }, [el('span', { class: 'ort', html: ortHtml }), nav]),
      el('h2', { text: titel }),
      zielHtml ? el('div', { class: 'st-ziel', html: '<span aria-hidden="true">🎯</span> <span class="sr">Ziel: </span>' + zielHtml }) : null
    ]), rechts || null]);
  }
  // Wer alle Vorab-Fragen einer Station richtig hatte, kennt sich schon aus: Die Vorführung wird dann nicht hervorgehoben.
  function kenntSchon(s) { var q = vorabFragen(s); return q.length > 0 && q.every(function (id) { return S.vb[id] === 1; }); }

  /* ---------- Bühne: Szene groß in der Mitte, Notiz daneben ---------- */
  // x: Station/Übung/Teil A; modus: 'station' | 'uebung' | 'pruefung' (Teil A der Selbstüberprüfung: ohne Rückmeldung)
  function buehne(x, modus, mis, beiErledigt) {
    var raster = el('div', { class: 'buehne-raster' });
    var box = el('div', { class: 'buehne interaktion', 'data-modus': modus });
    var iMeld = el('div', { 'aria-live': 'polite' });
    var notiz = el('aside', { class: 'notiz', 'aria-label': 'Notizen zur Szene' });
    var live = el('div', { class: 'feld live', 'aria-live': 'polite' });
    raster.appendChild(el('div', {}, [box, iMeld]));
    if (modus !== 'pruefung') { raster.appendChild(notiz); notiz.appendChild(live); }
    else raster.style.gridTemplateColumns = '1fr';
    var b = { el: raster, box: box, notiz: notiz, demoLaeuft: false };
    var api = {
      kit: KIT, modus: modus,
      erledigt: function (t) { if (b.demoLaeuft || modus === 'pruefung') return; iMeld.innerHTML = ''; iMeld.appendChild(msg('✅ ' + (t || 'Erledigt.'), 'ok')); if (beiErledigt) beiErledigt(); },
      meldung: function (t, art) { if (b.demoLaeuft || modus === 'pruefung') return; iMeld.innerHTML = ''; if (t) iMeld.appendChild(msg(t, art)); },
      erklaere: function (html, titel) { if (modus === 'pruefung') return; live.innerHTML = html ? '<div class="feldtitel">' + esc(titel || 'Was gerade passiert') + '</div>' + html : ''; b.ordne(); },
      sage: function (t, aus) { if (mis) mis.sage(t, aus); },
      demo: function () { return b.demoLaeuft; }
    };
    b.api = api;
    b.ordne = function () { raster.classList.toggle('ohne-notiz', modus === 'pruefung' || (notiz.children.length <= 1 && !live.innerHTML)); };
    b.start = function () { b.obj = (x.interaktion(box, api) || {}); b.ordne(); return b.obj; };
    b.feld = function (titel, html, offen) {
      if (modus === 'pruefung' || !html) return null;
      var f = offen === false ? el('details', { class: 'feld' }, [el('summary', { text: titel }), el('div', { html: html })]) : el('div', { class: 'feld' }, [el('div', { class: 'feldtitel', text: titel }), el('div', { html: html })]);
      notiz.appendChild(f); b.ordne(); return f;
    };
    return b;
  }
  // „Zeig's mir": das Lösungsbeispiel wird in der Szene vorgeführt (P3), danach ist man selbst dran
  function demoSteuerung(b, se, mis) {
    var schritte = b.obj.demo, k = -1;
    var knopf = el('button', { type: 'button', class: 'zeig', text: 'Zeig’s mir (' + schritte.length + ' Schritte)' });
    var feld = el('div', { class: 'feld demoschritt', hidden: true, 'aria-live': 'polite' });
    b.notiz.insertBefore(feld, b.notiz.children[1] || null);
    b.ordne = (function (alt) { return function () { alt(); if (!feld.hidden) b.el.classList.remove('ohne-notiz'); }; })(b.ordne);
    function zeigeSchritt() {
      var x = schritte[k], letzte = k === schritte.length - 1;
      feld.hidden = false; feld.innerHTML = ''; b.ordne();
      feld.appendChild(el('div', { class: 'feldtitel', text: 'Vorgeführt · Schritt ' + (k + 1) + ' von ' + schritte.length }));
      feld.appendChild(el('div', { html: x.text }));
      if (se && se.schritt === k + 1 && x.warum) feld.appendChild(selbsterklaeren(se.frage, x.warum));
      else if (x.warum) feld.appendChild(el('div', { class: 'warum', html: 'Warum: ' + x.warum }));
      feld.appendChild(el('div', { class: 'steuerung', style: 'margin-top:6px' }, [el('button', { type: 'button', class: 'demo-weiter', text: letzte ? 'Jetzt du →' : 'Nächster Schritt →', onclick: weiter })]));
    }
    function weiter() {
      if (k >= schritte.length - 1) { ende(); return; }
      k++; b.demoLaeuft = true; b.box.classList.add('demo');
      try { if (schritte[k].tun) schritte[k].tun(); } catch (e) { console.error(e); }
      zeigeSchritt();
    }
    function ende() {
      k = -1; b.demoLaeuft = false; b.box.classList.remove('demo'); feld.hidden = true; b.ordne();
      if (b.obj.zuruecksetzen) b.obj.zuruecksetzen();
      knopf.textContent = 'Nochmal zeigen';
      if (mis) mis.sage('Jetzt du!');
    }
    knopf.addEventListener('click', function () { knopf.classList.remove('primaer'); if (b.obj.demoStart) b.obj.demoStart(); k = -1; weiter(); });
    return { knopf: knopf, alle: function () { if (b.obj.demoStart) b.obj.demoStart(); k = -1; for (var i = 0; i < schritte.length; i++) weiter(); ende(); } };
  }
  function legacyBeispiel(s) {
    if (!s.beispiel || !s.beispiel.schritte) return null;
    var bsp = el('details', { class: 'beispiel feld' });
    bsp.appendChild(el('summary', { text: 'Beispiel zum Nachlesen: ' + (s.beispiel.titel || '') }));
    if (s.beispiel.aufgabe) bsp.appendChild(el('p', { html: s.beispiel.aufgabe }));
    var se = s.beispiel.selbsterklaerung;
    bsp.appendChild(el('ol', {}, (s.beispiel.schritte || []).map(function (x, k) {
      if (se && se.schritt === k + 1 && x.warum) return el('li', {}, [el('div', { html: x.tun }), selbsterklaeren(se.frage, x.warum)]);
      return el('li', {}, [el('div', { html: x.tun }), x.warum ? el('div', { class: 'warum', html: 'Warum: ' + x.warum }) : null]);
    })));
    return bsp;
  }
  /* ---------- ① Spielen (Spielmodus) ---------- */
  // Das Spiel wird einmal gebaut und bleibt beim Wechseln der Ansicht erhalten.
  var SPIELEL = null, SPIELOBJ = null, SPIELMELD = null, ZWB = null;
  function spielApi() {
    return {
      kit: KIT,
      level: function (id, text) {  // Level geschafft (= Station erledigt)
        var s = STATIONEN.filter(function (x) { return x.id === id; })[0];
        if (!s) { console.warn('Level ' + id + ' gibt es nicht.'); return; }
        var neu = !S.st[id];
        S.st[id] = 1; speichern(); kopf();
        if (neu && SPIELMELD) { SPIELMELD.innerHTML = ''; SPIELMELD.appendChild(msg('🏆 <b>' + esc(s.titel) + ' geschafft!</b> ' + (text || '') + ((s.check || []).length ? ' Unten wartet eine kurze Zwischenbilanz.' : ''), 'ok')); }
        if (ZWB) ZWB();
        var b = document.getElementById('weiter'); if (b) leisteSpiel();
      },
      geschafft: function (id) { return !!S.st[id]; },
      speicher: function (k, v) { if (v === undefined) return S.sp[k]; S.sp[k] = v; speichern(); },  // kleiner Spielstand (suspend_data!)
      lz: function (id) { return lz(id); },
      levels: function () { return STATIONEN.map(function (s) { return { id: s.id, titel: s.titel, lz: s.lz || [], geschafft: !!S.st[s.id] }; }); }
    };
  }
  function leisteSpiel() {
    var n = STATIONEN.filter(function (s) { return S.st[s.id]; }).length;
    var fertig = n === STATIONEN.length;
    var ziel = UEBUNGEN.length ? { t: 'ueben', label: 'Weiter zu ② Üben →' } : { t: 'pruefen', label: 'Weiter zu ③ Selbstüberprüfung →' };
    leiste(fertig ? 'Alle Level geschafft!' : n + ' von ' + STATIONEN.length + ' Level geschafft', ziel.label, function () { zeige(ziel.t, 0); }, null, !fertig);
  }
  function vSpiel() {
    var c = el('div', { class: 'card spielkarte' });
    if (!SPIELEL) {
      SPIELEL = el('div', { class: 'spielbuehne', role: 'application', 'aria-label': WELTSPIEL.titel || 'Spiel' });
      SPIELMELD = el('div', { 'aria-live': 'polite' });
      try { SPIELOBJ = WELTSPIEL.start(SPIELEL, spielApi()) || {}; } catch (e) { console.error(e); SPIELEL.appendChild(msg('Das Spiel konnte nicht starten: ' + esc(e.message), 'bad')); SPIELOBJ = {}; }
    }
    c.appendChild(SPIELEL);
    c.appendChild(SPIELMELD);
    testHaken.push({ art: 'interaktion', obj: SPIELOBJ });
    haupt.appendChild(c);
    // Zwischenbilanz: Kurz-Checks der geschafften Level (zählt nicht)
    var zb = el('div', { class: 'card zwischenbilanz' });
    haupt.appendChild(zb);
    ZWB = function () {
      zb.innerHTML = '';
      var fertige = STATIONEN.filter(function (s) { return S.st[s.id] && ((s.check || []).length || s.mitdenken); });
      zb.hidden = !fertige.length;
      if (!fertige.length) return;
      zb.appendChild(el('h3', { html: 'Zwischenbilanz <span class="badge zaehlt-nicht">zählt nicht</span>', style: 'margin-top:0' }));
      fertige.forEach(function (s) {
        var d = el('details', { class: 'check' }, [el('summary', { text: s.titel + ' · ' + (s.check || []).length + ' Fragen' + (s.mitdenken ? ' + Mitdenken' : '') })]);
        (s.check || []).forEach(function (id, k) { var q = frage(FR[id], 'lernen', { nr: k + 1 }); d.appendChild(q.el); testHaken.push({ art: 'frage', obj: q }); });
        var ej = einschaetzung(lzZumEinschaetzen(s), 0, 0); if (ej) d.appendChild(ej);
        if (s.mitdenken) d.appendChild(mitdenken(s.mitdenken));
        zb.appendChild(d);
      });
    };
    ZWB();
    if (glossar()) haupt.appendChild(el('div', { class: 'card' }, glossar()));
    leisteSpiel();
  }

  // Die Vorab-Frage ist zugleich die Leitfrage der Station: Sie bleibt über der Szene stehen und wird im Kurz-Check aufgelöst.
  function leitHtml(ids, vor) {
    var fr = ids.map(function (id) { return FR[id] ? FR[id].frage : ''; }).filter(Boolean).join(' · ');
    return '💭 <b>' + vor + '</b> ' + fr + ' <span class="klein">Die Szene zeigt es dir, im Kurz-Check löst du auf.</span>';
  }
  function leitNotiz(ids) { return el('div', { class: 'vorab-notiz', html: leitHtml(ids, 'Deine Frage:') }); }
  // Vorab-Frage vor der Szene (Pretesting): erst vermuten, dann ausprobieren; wer sie sicher kann, darf überspringen.
  // weiter(kennt): kennt = true, wenn die Vermutung stimmte (dann wird die Vorführung nicht hervorgehoben).
  function vorabKarte(ids, i, weiter) {
    var k = el('div', { class: 'vorab-karte' });
    k.appendChild(el('div', { class: 'vorab-kopf', html: '<b>Kurz vorab: Was vermutest du?</b> <span class="badge zaehlt-nicht">zählt nicht</span>' }));
    k.appendChild(el('p', { class: 'klein', text: 'Erst vermuten, dann ausprobieren. Auch eine falsche Vermutung hilft dir beim Lernen.' }));
    var qs = ids.map(function (id, n) { var q = frage(FR[id], 'pruefung', { nr: ids.length > 1 ? n + 1 : null }); k.appendChild(q.el); return q; });
    var meld = el('div', { 'aria-live': 'polite' });
    var bP = el('button', { type: 'button', class: 'vorab-pruefen primaer', text: 'Vermutung prüfen' });
    var bW = el('button', { type: 'button', class: 'link', text: 'Weiß ich nicht – zur Szene' });
    k.appendChild(el('div', { class: 'steuerung' }, [bP, bW]));
    k.appendChild(meld);
    function notiz(html) { k.innerHTML = ''; k.className = 'vorab-notiz'; k.appendChild(el('span', { html: html })); }
    bP.addEventListener('click', function () {
      if (!qs.every(function (q) { return q.beantwortet(); })) { meld.innerHTML = ''; meld.appendChild(msg('Schreib oder wähle erst eine Vermutung – oder geh direkt zur Szene.', 'warn')); return; }
      var ok = 0;
      qs.forEach(function (q) { var r = q.bewerten(); S.vb[q.f.id] = r.score >= 1 ? 1 : 0; if (r.score >= 1) ok++; });
      skipNeu(); speichern();
      if (ok === qs.length) {
        var nx = naechsteStation(i);
        k.innerHTML = '';
        k.appendChild(msg('<b>Stimmt!</b> Du kennst dich hier offenbar schon aus und darfst ' + EH.diese + ' überspringen.', 'ok'));
        k.appendChild(el('div', { class: 'steuerung' }, [
          el('button', { type: 'button', class: 'primaer', text: EH.e + ' überspringen', onclick: function () { zeige(nx.t, nx.i); } }),
          el('button', { type: 'button', class: 'link', text: 'Trotzdem ausprobieren', onclick: function () { notiz('✔ Du kennst dich schon aus – nutze ' + EH.die + ' zum Festigen.'); weiter(true); } })
        ]));
      } else { notiz(leitHtml(ids, 'Merk dir deine Vermutung:')); weiter(false); }
    });
    bW.addEventListener('click', function () { ids.forEach(function (id) { if (S.vb[id] === undefined) S.vb[id] = -1; }); speichern(); notiz(leitHtml(ids, 'Deine Frage:')); weiter(false); });
    testHaken.push({ art: 'vorab', obj: { zurSzene: function () { bW.click(); }, loesen: function () { qs.forEach(function (q) { q.loesungEinsetzen(); }); bP.click(); } } });
    return k;
  }
  // Neue Begriffe der Station als Chips zum Antippen (Vortraining direkt vor der Szene)
  function neueBegriffe(s, i) {
    var g = (P.glossar || []).filter(function (x) { return x.vorab === s.id || (x.vorab === true && i === 0); });
    if (!g.length) return null;
    var reihe = el('div', { class: 'neu-begriffe' });
    var erkl = el('div', { class: 'neu-erkl', 'aria-live': 'polite' });
    g.forEach(function (x) {
      var b = el('button', { type: 'button', class: 'begriff-chip', 'aria-expanded': 'false', html: x.begriff });
      b.addEventListener('click', function () {
        var auf = b.getAttribute('aria-expanded') !== 'true';
        reihe.querySelectorAll('.begriff-chip').forEach(function (y) { y.setAttribute('aria-expanded', 'false'); });
        b.setAttribute('aria-expanded', auf ? 'true' : 'false');
        erkl.innerHTML = auf ? '<b>' + x.begriff + ':</b> ' + x.erklaerung : '';
      });
      reihe.appendChild(b);
    });
    return el('div', { class: 'feld neu-box' }, [el('div', { class: 'feldtitel', text: 'Neu hier' }), reihe, erkl]);
  }
  /* ---------- ① Entdecken im Simulationsmodus (PAKET.simulation) ---------- */
  // Ein Arbeitsgegenstand (Terminal, Portal, Gerät, Plan) bleibt über alle Stationen erhalten:
  // links die Lektion, rechts der Gegenstand. Stationen sind Kapitel mit Schritten
  // {auftrag, erklaerung, tipp, pruefe(sim), loesen(sim), zeigen, warum}. Gespeichert werden nur
  // erledigte Schritte (S.sd); den Zustand des Gegenstands erzeugt die Engine beim Wiedereinstieg
  // und beim Springen neu, indem sie die Musterlösungen aller vorherigen Schritte nachspielt.
  var SIMBOX = null, SIMOBJ = null, SIMPOS = null, SIMSTILL = false, SIMHOOK = null, SIMK = {};
  function schritteVon(s) { return s.schritte || []; }
  function schrittFertig(s, k) { return !!S.sd[s.id + '.' + k]; }
  function simApi() {
    function weiter(name) { return function (a, b) { if (!SIMSTILL && SIMHOOK && SIMHOOK[name]) SIMHOOK[name](a, b); }; }
    return { kit: KIT, geaendert: weiter('geaendert'), erklaere: weiter('erklaere'), meldung: weiter('meldung'), sage: weiter('sage'), still: function () { return SIMSTILL; } };
  }
  // Gegenstand neu aufbauen und alle Schritte vor (i, k) mit der Musterlösung nachspielen
  function simAufbauen(i, k) {
    SIMBOX = el('div', { class: 'sim-gegenstand' });
    SIMSTILL = true;
    try {
      SIMOBJ = SIM.start(SIMBOX, simApi()) || {};
      for (var a = 0; a <= i && a < STATIONEN.length; a++) {
        var ss = schritteVon(STATIONEN[a]);
        for (var b = 0; b < (a === i ? k : ss.length); b++) { try { ss[b].loesen(SIMOBJ); } catch (e) { console.error(e); } }
      }
    } catch (e) { console.error(e); SIMBOX.appendChild(msg('Die Simulation konnte nicht starten: ' + esc(e.message), 'bad')); SIMOBJ = {}; }
    SIMSTILL = false;
    SIMPOS = { i: i, k: k };
  }
  // Gegenstand auf den Stand vor Schritt k der Station i bringen; im normalen Ablauf bleibt er einfach erhalten
  function simBereit(i, k) {
    if (SIMOBJ && SIMPOS) {
      if (SIMPOS.i === i && SIMPOS.k === k) return;
      var len = schritteVon(STATIONEN[SIMPOS.i]).length;
      var fertig = SIMPOS.k >= len || schrittFertig(STATIONEN[SIMPOS.i], SIMPOS.k);
      var nx = SIMPOS.k >= len ? { i: SIMPOS.i + 1, k: 0 } : { i: SIMPOS.i, k: SIMPOS.k + 1 };
      if (fertig && nx.i === i && nx.k === k) { SIMPOS = { i: i, k: k }; return; }
    }
    simAufbauen(i, k);
  }
  function vSimulation() {
    if (!STATIONEN.length) { haupt.appendChild(msg('Keine Stationen vorhanden.', 'warn')); return; }
    var i = Math.min(ANSICHT.i, STATIONEN.length - 1), s = STATIONEN[i], ss = schritteVon(s);
    var nx = naechsteStation(i);
    var raster = el('div', { class: 'sim-raster' });
    var lek = el('div', { class: 'card station sim-lektion' });
    var rechts = el('div', { class: 'sim-rechts' });
    // Kurz-Check und Mitdenken in eigener Karte: auf schmalen Bildschirmen steht der Gegenstand direkt unter dem Schritt
    var nachKarte = el('div', { class: 'card sim-nach', hidden: true });
    raster.appendChild(lek); raster.appendChild(rechts); raster.appendChild(nachKarte);
    haupt.appendChild(raster);
    var ziele = (s.lz || []).map(lz).filter(function (z) { return z.text && z.text !== z.id; });
    function kapitelPunkte() { return pfad(STATIONEN, i, 'entdecken', S.st, SPIEL ? (SPIEL.titel || 'Missionen') : 'Kapitel'); }
    var nav = kapitelPunkte(), kennt = false;
    lek.appendChild(stKopf((s.mission && s.mission.ort ? esc(s.mission.ort) + ' · ' : '') + 'Kapitel ' + (i + 1) + ' von ' + STATIONEN.length, nav, s.titel, ziele.map(function (z) { return z.text; }).join(' · ')));
    var koerper = el('div', { class: 'station-koerper' });
    lek.appendChild(koerper);
    // Startposition: erster offener Schritt (alle erledigt: hinter dem letzten)
    var k0 = SIMK[s.id];
    if (k0 === undefined) { k0 = 0; while (k0 < ss.length && schrittFertig(s, k0)) k0++; }
    simBereit(i, k0);
    rechts.appendChild(el('div', { class: 'buehne sim-buehne', role: 'region', 'aria-label': SIM.titel || 'Simulation' }, [SIM.titel ? el('div', { class: 'sim-titel', text: SIM.titel }) : null, SIMBOX]));
    var fertigMeldung = el('div', { 'aria-live': 'polite' });
    var status = { schritte: ss.every(function (x, k) { return schrittFertig(s, k); }), check: !(s.check || []).length };
    var checkBox = null, punkte = null, karte = null, k = k0;
    function pruefeFertig() {
      if (status.schritte && checkBox && !checkBox.open) checkBox.open = true;
      if (status.schritte && status.check && !S.st[s.id]) {
        S.st[s.id] = 1; speichern(); kopf();
        var n2 = kapitelPunkte(); if (nav.parentNode) nav.parentNode.replaceChild(n2, nav); nav = n2;
        fertigMeldung.innerHTML = '';
        fertigMeldung.appendChild(msg('🎉 <b>Kapitel geschafft!</b> ' + (s.mission && s.mission.ende ? s.mission.ende + ' ' : '') + nx.label.replace(' →', '') + '.', 'ok'));
      }
      if (karte) leisteSetzen();
    }
    function markiere(kk) {
      if (schrittFertig(s, kk)) return;
      S.sd[s.id + '.' + kk] = 1; speichern();
      status.schritte = ss.every(function (x, j) { return schrittFertig(s, j); });
      pruefeFertig();
    }
    function punkteZeichnen() {
      punkte.innerHTML = '';
      punkte.appendChild(el('span', { class: 'sim-punkte-titel', 'aria-hidden': 'true', text: 'Schritte' }));
      ss.forEach(function (x, j) {
        punkte.appendChild(el('button', { type: 'button', class: 'sim-punkt' + (schrittFertig(s, j) ? ' fertig' : '') + (j === k ? ' aktiv' : ''), 'aria-label': 'Schritt ' + (j + 1) + (schrittFertig(s, j) ? ' (erledigt)' : ''), 'aria-current': j === k ? 'step' : null, text: schrittFertig(s, j) ? '✓' : String(j + 1), onclick: function () { geheZu(j); } }));
      });
    }
    function zumCheck() { if (!checkBox) return; checkBox.open = true; checkBox.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    // Fußleiste: hervorgehoben ist der Knopf erst, wenn der Schritt erledigt ist (sonst zeigt er von der offenen Aufgabe weg)
    function leisteSetzen() {
      var info = 'Kapitel ' + (i + 1) + ' von ' + STATIONEN.length;
      function weiterKapitel() { zeige(nx.t, nx.i); }
      if (S.st[s.id] && k >= ss.length - 1) leiste(info, nx.label, weiterKapitel);
      else if (k < ss.length - 1) leiste(info + ' · Schritt ' + (k + 1) + ' von ' + ss.length, 'Nächster Schritt →', function () { geheZu(k + 1); }, null, !schrittFertig(s, k));
      else if (k === ss.length - 1 && checkBox) leiste(info + ' · letzter Schritt', 'Weiter zum Kurz-Check →', function () { geheZu(ss.length); zumCheck(); }, null, !schrittFertig(s, k));
      else if (checkBox && !status.check) leiste(info + ' · Kurz-Check offen', 'Zum Kurz-Check ↓', zumCheck, null, !status.schritte);
      else leiste(info, nx.label, weiterKapitel, null, !S.st[s.id]);
    }
    function geheZu(j) {
      k = Math.max(0, Math.min(j, ss.length)); SIMK[s.id] = k;
      simBereit(i, k);
      var b = rechts.querySelector('.sim-buehne'); if (b && SIMBOX.parentNode !== b) b.appendChild(SIMBOX);
      schrittKarte();
      punkteZeichnen(); leisteSetzen();
    }
    function schrittKarte() {
      karte.innerHTML = '';
      SIMHOOK = null;
      if (k >= ss.length) {
        karte.appendChild(msg('✔ Alle Schritte dieses Kapitels erledigt.' + ((s.check || []).length ? ' Jetzt der Kurz-Check unten.' : ''), 'ok'));
        return;
      }
      var x = ss[k];
      var mis = mission(x.auftrag || '', null, x.figur || s.figur, 'Schritt ' + (k + 1) + ' von ' + ss.length);
      karte.appendChild(mis.el);
      if (x.erklaerung) karte.appendChild(el('div', { class: 'feld' }, [el('div', { class: 'feldtitel', text: 'Kurz erklärt' }), el('div', { html: x.erklaerung })]));
      var live = el('div', { class: 'feld live', 'aria-live': 'polite', hidden: true });
      var meld = el('div', { 'aria-live': 'polite' });
      karte.appendChild(live);
      var steuer = el('div', { class: 'steuerung' });
      karte.appendChild(steuer);
      karte.appendChild(meld);
      function erledigtAnzeigen(text) {
        meld.innerHTML = '';
        meld.appendChild(msg('✅ ' + (text || x.erledigt || 'Erledigt.') + (k < ss.length - 1 ? ' Weiter mit Schritt ' + (k + 2) + '.' : ''), 'ok'));
        var zk = steuer.querySelector('.zeig'); if (zk) zk.classList.remove('primaer');
        punkteZeichnen();
      }
      function pruefen() {
        var ok = false;
        try { ok = !!x.pruefe(SIMOBJ); } catch (e) { console.error(e); }
        if (ok && !schrittFertig(s, k)) { markiere(k); erledigtAnzeigen(); var wb = document.getElementById('weiter'); if (wb) wb.focus({ preventScroll: true }); }
        return ok;
      }
      SIMHOOK = {
        geaendert: pruefen,
        erklaere: function (html) { live.hidden = !html; live.innerHTML = html ? '<div class="feldtitel">Was gerade passiert</div>' + html : ''; },
        meldung: function (t, art) { meld.innerHTML = ''; if (t) meld.appendChild(msg(t, art)); },
        sage: function (t, aus) { mis.sage(t, aus); }
      };
      if (schrittFertig(s, k)) erledigtAnzeigen('Diesen Schritt hast du schon erledigt.');
      // Vorführung: der Schritt wird im Gegenstand gezeigt (Lösungsbeispiel, P3)
      if (x.zeigen) {
        // Für Neulinge ist die Vorführung der nächste sinnvolle Schritt (P3) – dann ist sie hervorgehoben
        steuer.appendChild(el('button', { type: 'button', class: 'zeig' + (!kennt && !schrittFertig(s, k) ? ' primaer' : ''), text: 'Zeig’s mir', onclick: function (e) {
          try { x.loesen(SIMOBJ); } catch (er) { console.error(er); }
          var w = el('div', { class: 'feld demoschritt' }, [el('div', { class: 'feldtitel', text: 'Vorgeführt' })]);
          if (x.frage && x.warum) w.appendChild(selbsterklaeren(x.frage, x.warum)); else if (x.warum) w.appendChild(el('div', { class: 'warum', html: 'Warum: ' + x.warum }));
          karte.insertBefore(w, meld);
          e.target.hidden = true;
          if (!pruefen()) { markiere(k); erledigtAnzeigen('Vorgeführt.'); }
        } }));
      }
      // Tipp, dann Lösung (die Lösung wird im Gegenstand ausgeführt)
      var tl = el('div', { 'aria-live': 'polite' });
      if (x.tipp) steuer.appendChild(el('button', { type: 'button', text: '💡 Tipp', onclick: function (e) { tl.innerHTML = ''; tl.appendChild(msg('<b>Tipp:</b> ' + x.tipp, 'warn')); e.target.hidden = true; } }));
      if (!x.zeigen) steuer.appendChild(el('button', { type: 'button', text: 'Lösung zeigen', onclick: function () { try { x.loesen(SIMOBJ); } catch (er) { console.error(er); } if (!pruefen()) { markiere(k); erledigtAnzeigen(); } if (x.loesungText) { tl.innerHTML = ''; tl.appendChild(msg('<b>Lösung:</b> ' + x.loesungText, '')); } } }));
      steuer.appendChild(el('button', { type: 'button', class: 'link', text: '↺ Schritt neu', title: 'Gegenstand auf den Anfang dieses Schritts zurücksetzen', onclick: function () { SIMPOS = null; geheZu(k); } }));
      karte.appendChild(tl);
      pruefen();
    }
    function baue(k0) {
      kennt = k0 === undefined ? kenntSchon(s) : !!k0;
      var nb = neueBegriffe(s, i); if (nb) koerper.appendChild(nb);
      punkte = el('div', { class: 'sim-punkte', role: 'group', 'aria-label': 'Schritte dieses Kapitels' });
      karte = el('div', { class: 'sim-schritt' });
      koerper.appendChild(punkte); koerper.appendChild(karte);
      var nach = el('div', { class: 'nach' });
      if ((s.check || []).length) {
        checkBox = kurzCheck(s, status.schritte || !!S.st[s.id], 'öffnet sich, wenn alle Schritte erledigt sind', function () { status.check = true; pruefeFertig(); });
        nach.appendChild(checkBox);
      }
      if (s.mitdenken) nach.appendChild(mitdenken(s.mitdenken));
      if (s.steckbrief) nach.appendChild(el('details', {}, [el('summary', { text: 'Steckbrief' }), el('div', { html: s.steckbrief })]));
      nach.appendChild(fertigMeldung);
      if (glossar()) nach.appendChild(glossar());
      nachKarte.appendChild(nach); nachKarte.hidden = false;
      geheZu(k);
      // Haken für automatische Tests: Vorführung und alle offenen Schritte mit der Musterlösung lösen
      testHaken.push({ art: 'demo', obj: { alle: function () {} } });
      testHaken.push({ art: 'interaktion', obj: { loesen: function () {
        for (var j = k; j < ss.length; j++) { geheZu(j); try { ss[j].loesen(SIMOBJ); } catch (e) { console.error(e); } if (!schrittFertig(s, j)) { var ok = false; try { ok = !!ss[j].pruefe(SIMOBJ); } catch (e) {} if (ok) markiere(j); } }
        geheZu(ss.length);
      } } });
    }
    var vf = vorabFragen(s), offen = vf.filter(function (id) { return S.vb[id] === undefined; });
    if (offen.length && !S.st[s.id]) { koerper.appendChild(vorabKarte(offen, i, baue)); leiste('Kapitel ' + (i + 1) + ' von ' + STATIONEN.length, nx.label, function () { zeige(nx.t, nx.i); }, null, true); }
    else { if (vf.length && !S.st[s.id] && !kenntSchon(s)) koerper.appendChild(leitNotiz(vf)); baue(); }
  }

  // Kurz-Check einer Station (zählt nicht), am Ende Einschätzung je Lernziel; beiFertig, wenn alle Fragen geprüft sind
  function kurzCheck(s, offen, hinweis, beiFertig) {
    // Zuerst wird die Vorab-Frage aufgelöst (wenn sie vorab nicht schon richtig war): Vorab-Fragen wirken nur,
    // wenn die richtige Antwort danach auch gelernt wird. Sie zählt als Frage des Kurz-Checks.
    var auf = vorabFragen(s).filter(function (id) { return S.vb[id] !== 1 && (s.check || []).indexOf(id) < 0; });
    var ids = auf.concat(s.check || []);
    var box = el('details', { class: 'check' });
    box.open = offen;
    box.appendChild(el('summary', { html: 'Kurz-Check · ' + ids.length + ' Fragen <span class="badge zaehlt-nicht">zählt nicht</span>' + (hinweis ? ' <span class="klein">– ' + hinweis + '</span>' : '') }));
    box.appendChild(el('p', { class: 'klein', text: 'Beantworte die Fragen aus dem Gedächtnis. Beliebig oft wiederholbar.' }));
    var geprueft = {}, richtig = {};
    var sum = el('div', { 'aria-live': 'polite' });
    ids.forEach(function (id, k) {
      var q = frage(FR[id], 'lernen', { nr: k + 1, vorspann: auf.indexOf(id) >= 0 ? 'Deine Frage von vorhin – jetzt weißt du es:' : null, beiPruefung: function (res) {
        geprueft[id] = 1; if (res.score >= 1) richtig[id] = 1;
        if (anzahl(geprueft) === ids.length) {
          sum.innerHTML = '';
          var n = anzahl(richtig);
          sum.appendChild(msg('Kurz-Check: <b>' + n + ' von ' + ids.length + '</b> auf Anhieb richtig. ' + (n === ids.length ? 'Sehr gut, du kannst weiter.' : 'Schau dir die Erklärungen zu den falschen Antworten noch einmal an.'), n === ids.length ? 'ok' : 'warn'));
          var ej = einschaetzung(lzZumEinschaetzen(s), n, ids.length); if (ej) sum.appendChild(ej);
          if (beiFertig) beiFertig();
        }
      } });
      box.appendChild(q.el); testHaken.push({ art: 'frage', obj: q });
    });
    box.appendChild(sum);
    return box;
  }
  function vStation() {
    if (!STATIONEN.length) { haupt.appendChild(msg('Keine Stationen vorhanden.', 'warn')); return; }
    var i = Math.min(ANSICHT.i, STATIONEN.length - 1), s = STATIONEN[i];
    var m = el('div', { class: 'card station' });
    var steuer = el('div', { class: 'steuerung' });
    var ziele = (s.lz || []).map(lz).filter(function (z) { return z.text && z.text !== z.id; });
    var ort = (s.mission && s.mission.ort ? esc(s.mission.ort) + ' · ' : '') + 'Station ' + (i + 1) + ' von ' + STATIONEN.length;
    function punkte() { return pfad(STATIONEN, i, 'entdecken', S.st, SPIEL ? (SPIEL.titel || 'Missionen') : 'Stationen'); }
    var nav = punkte();
    m.appendChild(stKopf(ort, nav, s.titel, ziele.map(function (z) { return z.text; }).join(' · '), steuer));
    var koerper = el('div', { class: 'station-koerper' });
    var nx = naechsteStation(i);
    function weiter() { zeige(nx.t, nx.i); }
    var vf = vorabFragen(s);
    function baue(kennt) {
      if (kennt === undefined) kennt = kenntSchon(s);
      var nb = neueBegriffe(s, i);
      // Die Vorab-Frage ist die Leitfrage; eine eigene Leitfrage erscheint nur ohne Vorab-Frage
      var mis = mission(s.auftrag || '', vf.length ? null : s.leitfrage, s.figur);
      koerper.appendChild(mis.el);
      var fertigMeldung = el('div', { 'aria-live': 'polite' });
      var status = { interaktion: !s.interaktion, check: !(s.check || []).length };
      var checkBox = null, zeigKnopf = null;
      // Fußleiste: Hervorgehoben ist nur der nächste sinnvolle Schritt – erst die Szene, dann der Kurz-Check, dann „Weiter“
      function leisteSetzen() {
        if (zeigKnopf && (status.interaktion || S.st[s.id])) zeigKnopf.classList.remove('primaer');
        if (S.st[s.id]) leiste(ort, nx.label, weiter);
        else if (status.interaktion && checkBox && !status.check) leiste(ort + (s.interaktion ? ' · Szene geschafft' : ''), 'Zum Kurz-Check ↓', function () { checkBox.open = true; checkBox.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
        else leiste(ort, nx.label, weiter, null, true);
      }
      function pruefeFertig() {
        if (status.interaktion && checkBox && !checkBox.open) { checkBox.open = true; }
        var neu = status.interaktion && status.check && !S.st[s.id];
        if (neu) {
          S.st[s.id] = 1; speichern(); kopf();
          var n2 = punkte(); if (nav.parentNode) nav.parentNode.replaceChild(n2, nav); nav = n2;
          fertigMeldung.innerHTML = '';
          fertigMeldung.appendChild(msg('🎉 <b>Geschafft!</b> ' + (s.mission && s.mission.ende ? s.mission.ende + ' ' : '') + nx.label.replace(' →', '') + '.', 'ok'));
        }
        leisteSetzen();
        if (neu) { var wb = document.getElementById('weiter'); if (wb) wb.focus(); }
      }
      if (s.interaktion) {
        var b = buehne(s, 'station', mis, function () { status.interaktion = true; pruefeFertig(); });
        koerper.appendChild(b.el);
        var obj = b.start();
        if (nb) { b.notiz.appendChild(nb); b.ordne(); }  // neue Begriffe neben der Szene (Vortraining, räumliche Nähe)
        if (s.inhalt) b.feld('Kurz erklärt', s.inhalt);
        if (s.bild) b.feld('Bild', s.bild);
        if (s.steckbrief) b.feld('Steckbrief', s.steckbrief, false);
        if (s.vertiefung) b.feld('Genauer erklärt', s.vertiefung, false);
        var lb = legacyBeispiel(s); if (lb) b.notiz.appendChild(lb);
        if (s.beruf) b.feld('Wozu brauchst du das?', s.beruf, false);
        if (Array.isArray(obj.demo) && obj.demo.length) {
          var ds = demoSteuerung(b, s.selbsterklaerung || (s.beispiel && s.beispiel.selbsterklaerung), mis);
          // Für Neulinge ist die Vorführung der nächste sinnvolle Schritt (P3) – dann ist sie hervorgehoben
          zeigKnopf = ds.knopf;
          if (!kennt && !S.st[s.id]) zeigKnopf.classList.add('primaer');
          steuer.appendChild(ds.knopf);
          testHaken.push({ art: 'demo', obj: ds });
        }
        testHaken.push({ art: 'interaktion', obj: obj });
      } else {
        if (nb) koerper.appendChild(nb);
        if (s.bild) koerper.appendChild(el('div', { class: 'bild', html: s.bild }));
        if (s.inhalt) koerper.appendChild(el('div', { html: s.inhalt }));
        var lb2 = legacyBeispiel(s); if (lb2) { lb2.open = S.skip.indexOf(s.id) < 0; koerper.appendChild(lb2); }
        if (s.steckbrief) koerper.appendChild(el('details', {}, [el('summary', { text: 'Steckbrief' }), el('div', { html: s.steckbrief })]));
        if (s.beruf) koerper.appendChild(msg('<b>Wozu brauchst du das?</b> ' + s.beruf, ''));
      }
      var nach = el('div', { class: 'nach' });
      if ((s.check || []).length) {
        checkBox = kurzCheck(s, !s.interaktion || !!S.st[s.id], s.interaktion ? 'öffnet sich, wenn du die Szene geschafft hast' : '', function () { status.check = true; pruefeFertig(); });
        nach.appendChild(checkBox);
      }
      if (s.mitdenken) nach.appendChild(mitdenken(s.mitdenken));
      nach.appendChild(fertigMeldung);
      if (glossar()) nach.appendChild(glossar());
      koerper.appendChild(nach);
      leisteSetzen();
    }
    var offen = vf.filter(function (id) { return S.vb[id] === undefined; });
    if (offen.length && !S.st[s.id]) { m.appendChild(vorabKarte(offen, i, baue)); leiste(ort, nx.label, weiter, null, true); }
    else { if (vf.length && !S.st[s.id] && !kenntSchon(s)) m.appendChild(leitNotiz(vf)); baue(); }
    m.appendChild(koerper);
    haupt.appendChild(m);
  }

  /* ---------- ② Üben ---------- */
  function vUebung() {
    if (!UEBUNGEN.length) { haupt.appendChild(msg('Keine Übungen vorhanden.', 'warn')); leiste('', 'Weiter zu ③ Selbstüberprüfung →', function () { zeige('pruefen'); }); return; }
    var i = Math.min(ANSICHT.i, UEBUNGEN.length - 1), u = UEBUNGEN[i];
    var r = el('div', { class: 'raster' });
    var m = el('div', { class: 'card' });
    function punkte() { return pfad(UEBUNGEN, i, 'ueben', S.ue, 'Übungen'); }
    var nav = punkte();
    m.appendChild(stKopf('Übung ' + (i + 1) + ' von ' + UEBUNGEN.length + ' · ' + esc((u.lz || []).join(', ')) + ' <span class="badge zaehlt-nicht">zählt nicht</span>', nav, u.titel));
    var mis = mission(u.auftrag || '', null, u.figur);
    m.appendChild(mis.el);
    var nx = naechsteUebung(i);
    // „Weiter“ ist erst hervorgehoben, wenn die Übung gelöst ist
    function leisteSetzen() { leiste('Übung ' + (i + 1) + ' von ' + UEBUNGEN.length, nx.label, function () { zeige(nx.t, nx.i); }, null, !S.ue[u.id]); }
    var meld = el('div', { 'aria-live': 'polite' });
    function geloest() {
      if (!S.ue[u.id]) { S.ue[u.id] = 1; speichern(); kopf(); var n2 = punkte(); if (nav.parentNode) nav.parentNode.replaceChild(n2, nav); nav = n2; }
      meld.innerHTML = ''; meld.appendChild(msg('🎉 <b>Gelöst!</b> Beantworte noch die Reflexionsfrage unten. ' + nx.label.replace(' →', '') + '.', 'ok'));
      leisteSetzen();
    }
    if (u.frage) {
      var q = frage(FR[u.frage], 'lernen', { erklaerungImmer: false, beiPruefung: function (res) { if (res.score >= 1) geloest(); } });
      m.appendChild(q.el); testHaken.push({ art: 'frage', obj: q });
    }
    if (u.interaktion) {
      var b = buehne(u, 'uebung', mis, geloest);
      m.appendChild(b.el);
      var obj = b.start();
      if (u.steckbrief) b.feld('Steckbrief', u.steckbrief, false);
      testHaken.push({ art: 'interaktion', obj: obj });
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
    if (u.mitdenken) m.appendChild(mitdenken(u.mitdenken));
    if (u.reflexion) {
      m.appendChild(el('h3', { text: 'Nachgedacht' }));
      m.appendChild(el('p', { html: u.reflexion.frage }));
      var ta = el('textarea', { rows: 3, style: 'width:100%', 'aria-label': 'Deine Antwort auf die Reflexionsfrage' });
      var mu = el('div', { 'aria-live': 'polite' });
      m.appendChild(ta);
      m.appendChild(el('button', { type: 'button', text: 'Mit Musterantwort vergleichen', onclick: function () { mu.innerHTML = ''; mu.appendChild(el('div', { class: 'muster', html: '<b>Musterantwort:</b> ' + u.reflexion.muster })); } }));
      m.appendChild(mu);
    }
    if (glossar()) m.appendChild(glossar());
    if (u.steckbrief && !u.interaktion) m.appendChild(el('details', {}, [el('summary', { text: 'Steckbrief' }), el('div', { html: u.steckbrief })]));
    r.appendChild(m);
    haupt.appendChild(r);
    leisteSetzen();
  }

  /* ---------- ③ Selbstüberprüfung (zählt nicht) ---------- */
  function ziehen() {
    var pro = (SU.teilB && SU.teilB.proLZ) || 2, liste = [];
    LZ.forEach(function (z) {
      var pool = mischen((P.fragen || []).filter(function (f) { return f.lz === z.id && inSU(f); }));
      liste = liste.concat(pool.slice(0, pro));
    });
    return mischen(liste);
  }
  function vPruefen() {
    var c = el('div', { class: 'card' });
    haupt.appendChild(c);
    if (!suLauf || suLauf.phase === 'fertig') {
      c.appendChild(el('h2', { html: '③ Selbstüberprüfung <span class="badge zaehlt-nicht">zählt nicht</span>' }));
      if (SU.einleitung) c.appendChild(figur(SU.einleitung));
      c.appendChild(el('ul', {}, [
        el('li', { html: SU.teilA ? '<b>Teil A:</b> eine Aufgabe aus einer neuen Situation, ohne Tipps.' : null }),
        el('li', { html: '<b>Teil ' + (SU.teilA ? 'B' : 'A') + ':</b> ' + ((SU.teilB && SU.teilB.proLZ) || 2) * LZ.length + ' Fragen, gemischt aus allen Lernzielen.' }),
        el('li', { html: 'Hier prüfst du selbst, ob das Thema sitzt: Ab <b>' + BEREIT + ' %</b> bist du so weit. Das Ergebnis zählt nicht, und du kannst beliebig oft wiederholen.' }),
        el('li', { html: 'Feedback zu jeder Frage bekommst du nach dem Abgeben.' })
      ].filter(function (x) { return x.innerHTML; })));
      var offen = UEBUNGEN.filter(function (u) { return !S.ue[u.id]; }).length;
      if (offen) c.appendChild(msg('Empfehlung: Du hast noch ' + offen + ' Übung(en) offen. Du kannst trotzdem starten.', 'warn'));
      if (S.n) c.appendChild(el('p', { class: 'klein', text: 'Bisherige Versuche: ' + S.n + ' · bestes Ergebnis: ' + S.best + ' %' }));
      leiste('Nimm dir etwa ' + (SU.dauer || '20 Minuten') + ' Zeit.', S.n ? 'Noch einmal starten →' : 'Selbstüberprüfung starten →', function () {
        suLauf = { phase: SU.teilA ? 'A' : 'B', fragen: ziehen(), a: null, w: [] };
        render();
      });
      return;
    }
    if (suLauf.phase === 'A') {
      var A = SU.teilA;
      c.appendChild(el('div', { class: 'klein', text: 'Selbstüberprüfung · Teil A von 2 · keine Tipps' }));
      c.appendChild(el('h2', { text: A.titel || 'Handlungsaufgabe' }));
      var misA = mission(A.auftrag || '', null, A.figur);
      c.appendChild(misA.el);
      if (A.inhalt) c.appendChild(el('div', { html: A.inhalt }));
      var bA = buehne(A, 'pruefung', misA, null);
      c.appendChild(bA.el);
      suLauf.a = bA.start();
      testHaken.push({ art: 'interaktion', obj: suLauf.a });
      leiste('Teil A: Wenn du fertig bist, geht es weiter zu Teil B.', 'Weiter zu Teil B →', function () {
        suLauf.pp = typeof suLauf.a.auswerten === 'function' ? suLauf.a.auswerten() : [];
        suLauf.phase = 'B'; render();
      });
      return;
    }
    if (suLauf.phase === 'B') {
      c.appendChild(el('div', { class: 'klein', text: 'Selbstüberprüfung · ' + (SU.teilA ? 'Teil B von 2' : 'Fragen') + ' · keine Tipps, Feedback nach dem Abgeben' }));
      c.appendChild(el('h2', { text: 'Fragen' }));
      suLauf.w = suLauf.fragen.map(function (f, k) { var q = frage(f, 'pruefung', { nr: k + 1 }); c.appendChild(q.el); testHaken.push({ art: 'frage', obj: q }); return q; });
      var warn = el('div', { 'aria-live': 'polite' }); c.appendChild(warn);
      var bestaetigt = false;
      leiste('Kontrolliere deine Antworten, dann gib ab.', 'Abgeben', function () {
        var offen = suLauf.w.filter(function (q) { return !q.beantwortet(); }).length;
        if (offen && !bestaetigt) { bestaetigt = true; warn.innerHTML = ''; warn.appendChild(msg('Noch ' + offen + ' Frage(n) ohne Antwort. Klicke noch einmal auf „Abgeben“, wenn du trotzdem abgeben willst.', 'warn')); document.getElementById('weiter').textContent = 'Trotzdem abgeben'; return; }
        abgeben();
      });
    }
  }
  function abgeben() {
    var pp = suLauf.pp || [], res = suLauf.w.map(function (q) { var r = q.bewerten(); r.f = q.f; return r; });
    var a = pp.length ? pp.filter(function (p) { return p.ok; }).length / pp.length : null;
    var b = res.length ? res.reduce(function (s, r) { return s + r.score; }, 0) / res.length : 0;
    var gA = SU.teilA ? (typeof SU.gewichtA === 'number' ? SU.gewichtA : 50) : 0;
    var ges = Math.round(a === null ? b * 100 : (a * gA + b * (100 - gA)));
    var proLz = {};
    LZ.forEach(function (z) { proLz[z.id] = { e: 0, n: 0 }; });
    pp.forEach(function (p) { if (proLz[p.lz]) { proLz[p.lz].n++; if (p.ok) proLz[p.lz].e++; } });
    res.forEach(function (r) { if (proLz[r.f.lz]) { proLz[r.f.lz].n++; proLz[r.f.lz].e += r.score; } });
    S.n++; S.best = S.best === null ? ges : Math.max(S.best, ges);
    S.lz = {}; LZ.forEach(function (z) { var x = proLz[z.id]; S.lz[z.id] = x.n ? Math.round(x.e / x.n * 100) : 0; });
    speichern();
    letzterVersuch = { ges: ges, a: a, b: b, pp: pp, res: res, w: suLauf.w };
    if (SC.aktiv) {
      SC.set('cmi.core.score.min', 0); SC.set('cmi.core.score.max', 100); SC.set('cmi.core.score.raw', S.best);
      // Die Selbstüberprüfung zählt nicht: Das Ergebnis geht als Information an die Lernplattform, der Status ist „completed“
      // (nie passed/failed). Bestanden oder nicht entscheidet der Kompetenznachweis außerhalb des Pakets.
      SC.set('cmi.core.lesson_status', 'completed');
      LZ.forEach(function (z, i) { var bb = 'cmi.objectives.' + i + '.'; SC.set(bb + 'id', z.id); SC.set(bb + 'score.min', 0); SC.set(bb + 'score.max', 100); SC.set(bb + 'score.raw', S.lz[z.id]); SC.set(bb + 'status', 'completed'); });
      var n0 = parseInt(SC.get('cmi.interactions._count'), 10) || 0;
      res.forEach(function (r, i) {
        var bb = 'cmi.interactions.' + (n0 + i) + '.';
        SC.set(bb + 'id', 'S' + S.n + '_' + r.f.id); SC.set(bb + 'type', r.typ || 'other'); SC.set(bb + 'objectives.0.id', r.f.lz);
        SC.set(bb + 'student_response', (r.antwort || '').replace(/[^\w,.\-+ äöüÄÖÜß]/g, '').slice(0, 250));
        SC.set(bb + 'result', r.score >= 1 ? 'correct' : r.score > 0 ? String(r.score) : 'wrong');
      });
      pp.forEach(function (p, i) {
        var bb = 'cmi.interactions.' + (n0 + res.length + i) + '.';
        SC.set(bb + 'id', 'S' + S.n + '_A' + (i + 1)); SC.set(bb + 'type', 'performance'); SC.set(bb + 'objectives.0.id', p.lz); SC.set(bb + 'result', p.ok ? 'correct' : 'wrong');
      });
      SC.commit();
    }
    suLauf.phase = 'fertig';
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
      c.appendChild(msg('Du hast die Selbstüberprüfung noch nicht gemacht. Danach siehst du hier deine Auswertung je Lernziel und kannst dein Merkblatt ergänzen.', 'warn'));
      leiste('', 'Zur ③ Selbstüberprüfung →', function () { zeige('pruefen'); });
      return;
    }
    var bereit = S.best >= BEREIT;
    c.appendChild(msg((letzterVersuch ? 'Dieser Versuch: <b>' + letzterVersuch.ges + ' %</b>. ' : '') + 'Bestes Ergebnis: <b>' + S.best + ' %</b> – ' + (bereit ? 'das Thema sitzt ✅' : 'noch nicht ganz (ab ' + BEREIT + ' % sitzt das Thema).') + ' <span class="badge zaehlt-nicht">zählt nicht</span>', bereit ? 'ok' : 'warn'));
    if (bereit && SU.danach) c.appendChild(msg('<b>Wie geht es weiter?</b> ' + SU.danach, ''));

    c.appendChild(el('h3', { text: 'Auswertung je Lernziel (letzter Versuch)' }));
    // Die Einschätzung nach der Station steht direkt am Ergebnis: So sehen Lernende, wo sie sich über- oder unterschätzt haben (P11)
    var empfehlung = [];
    LZ.forEach(function (z) {
      var p = S.lz[z.id] || 0, st = p >= 80 ? 'erreicht ✔' : p >= 50 ? 'teilweise' : 'noch nicht';
      var v = S.ej[z.id];
      var abgleich = !v ? '' : (v === 3 && p < 80) ? ' – du warst dir sicherer, als das Ergebnis zeigt.' : (v === 1 && p >= 80) ? ' – du kannst mehr, als du dachtest.' : ((v === 3 && p >= 80) || (v === 1 && p < 50)) ? ' – gut eingeschätzt.' : '';
      if (p < 80) STATIONEN.forEach(function (s, i) { if ((s.lz || []).indexOf(z.id) >= 0 && empfehlung.indexOf(i) < 0) empfehlung.push(i); });
      c.appendChild(el('div', { class: 'lzzeile' }, [el('div', { html: '<b>' + esc(z.id) + '</b> ' + z.text + (v ? '<div class="klein abgleich">Deine Einschätzung nach ' + (SIM ? 'dem Kapitel' : 'der Station') + ': ' + stufeText(v) + abgleich + '</div>' : '') }), el('div', { class: 'balken ' + (p >= 80 ? 'ok' : p >= 50 ? 'mittel' : ''), role: 'img', 'aria-label': p + ' Prozent' }, el('span', { style: 'width:' + p + '%' })), el('div', { text: p + ' % · ' + st })]));
    });
    if (empfehlung.length) {
      var em = el('div', { class: 'msg warn' }, [el('b', { text: 'Was als Nächstes? ' }), 'Wiederhole diese ' + EH.m + ' und mach die Selbstüberprüfung dann noch einmal: ']);
      empfehlung.forEach(function (i) { em.appendChild(el('button', { type: 'button', text: EH.e + ' ' + (i + 1) + ': ' + STATIONEN[i].titel, onclick: function () { zeige('entdecken', i); } })); em.appendChild(document.createTextNode(' ')); });
      c.appendChild(em);
    }
    if (letzterVersuch) {
      var rb = el('details', {}, [el('summary', { text: 'Deine Antworten mit Erklärung ansehen' })]);
      letzterVersuch.pp.forEach(function (p) { rb.appendChild(el('div', { class: 'msg ' + (p.ok ? 'ok' : 'bad'), html: (p.ok ? '✔ ' : '✘ ') + 'Teil A · ' + esc(p.lz) + ': ' + p.text })); });
      letzterVersuch.w.forEach(function (q) { rb.appendChild(q.el); q.feedbackNachher(); });
      c.appendChild(rb);
    }

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

    if (!bereit) leiste('Mit den empfohlenen ' + EH.m + ' klappt es beim nächsten Mal.', empfehlung.length ? 'Zu ' + EH.e + ' ' + (empfehlung[0] + 1) + ' →' : 'Selbstüberprüfung wiederholen →', function () { if (empfehlung.length) zeige('entdecken', empfehlung[0]); else zeige('pruefen'); });
    else leiste('Das Thema sitzt. Sichere jetzt dein Wissen auf dem Merkblatt.', 'Zum Merkblatt ↓', function () { mb.scrollIntoView({ behavior: 'smooth' }); var t = mb.querySelector('textarea'); if (t) t.focus({ preventScroll: true }); });
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
    return h + '<p class="klein druckfuss">' + esc(druckVermerk()) + '</p>';
  }
  function ergebnisHtml(name) {
    var h = '<h1>Ergebnis: ' + esc(P.titel || '') + '</h1><p>Name: <b>' + esc(name || '________________') + '</b> · Datum: ' + new Date().toLocaleDateString('de-DE') + '</p>';
    h += '<p>Selbstüberprüfung (zählt nicht): bestes Ergebnis <b>' + S.best + ' %</b> · ab ' + BEREIT + ' % sitzt das Thema · Versuche: ' + S.n + '</p>';
    h += '<table class="tab"><tr><th>Lernziel</th><th>Letzter Versuch</th><th>Eigene Einschätzung nach ' + (SIM ? 'dem Kapitel' : 'der Station') + '</th></tr>';
    LZ.forEach(function (z) { h += '<tr><td><b>' + esc(z.id) + '</b> ' + z.text + '</td><td>' + (S.lz[z.id] || 0) + ' %</td><td>' + stufeText(S.ej[z.id]) + '</td></tr>'; });
    return h + '</table><p class="klein druckfuss">' + esc(druckVermerk()) + '</p>';
  }
  function druckVermerk() {
    return 'Lernpaket „' + (P.titel || '') + '“' + (P.version ? ' · Version ' + P.version : '') + ' · gedruckt am ' + new Date().toLocaleDateString('de-DE');
  }

  /* ---------- Schnittstelle für automatische Tests ---------- */
  window.LERNPAKET = {
    version: '4.0',  // Kompass-Version der Vorlage (eine Nummer für Leitfaden, Skills und Vorlage; siehe VERSION)
    bereit: BEREIT,
    einschaetzenBei: function (i) { return STATIONEN[i] ? lzZumEinschaetzen(STATIONEN[i]) : []; },
    pruefeInhalt: pruefeInhalt,
    woerter: woerter,
    vorabFragen: vorabFragen,
    alleVorab: alleVorab,
    zustand: function () { return JSON.parse(JSON.stringify(S)); },
    ansicht: function () { return ANSICHT; },
    zeige: zeige,
    aktuelleTeile: function () { return testHaken; },
    // Simulationsmodus, für automatische Tests: Position, Gegenstand, Prüfung eines Schritts
    sim: SIM ? {
      position: function () { return SIMPOS ? { i: SIMPOS.i, k: SIMPOS.k } : null; },
      box: function () { return SIMBOX; },
      pruefe: function (i, k) { try { return !!schritteVon(STATIONEN[i])[k].pruefe(SIMOBJ); } catch (e) { return false; } }
    } : null,
    scormAktiv: SC.aktiv
  };

  render();
})();
