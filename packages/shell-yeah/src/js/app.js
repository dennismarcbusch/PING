/* Anwendung: Startseite, Tutorial, Üben, Kompetenznachweis, Fortschritt, SCORM, Ergebnisdruck */
(function () {
  'use strict';
  const LX = window.LX;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const H = '/home/azubi';
  const TUT = LX.TUTORIAL, PRAC = LX.PRACTICE, EXAM = LX.EXAM;
  const now = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const App = {
    st: null, view: 'home', term: null, sh: null, w: null, termEl: null,
    tut: { ci: 0, li: 0, done: [], hints: {}, sol: {}, wkey: null, quizAns: {}, quizShown: false },
    prac: { i: 0, worlds: {}, tips: {}, refl: {}, model: {} },
    ex: { phase: 'intro', att: null }
  };
  window.LXApp = App;

  // ---------- Zustand ----------
  function blank() {
    const d = {}; const q = {};
    TUT.forEach(ch => { d[ch.id] = '0'.repeat(ch.lessons.length); q[ch.id] = -1; });
    return { v: 1, t: { ci: 0, li: 0, d: d, q: q }, u: '0'.repeat(PRAC.length), e: { best: -1, att: 0, last: null }, loc: '', name: '' };
  }
  function loadState() {
    const s = LX.SCORM.load();
    const b = blank();
    if (!s || s.v !== 1) return b;
    // mit leerem Zustand zusammenführen (falls Inhalte erweitert wurden)
    TUT.forEach(ch => { const x = (s.t && s.t.d && s.t.d[ch.id]) || ''; b.t.d[ch.id] = (x + b.t.d[ch.id]).slice(0, ch.lessons.length).padEnd(ch.lessons.length, '0'); if (s.t && s.t.q && s.t.q[ch.id] != null) b.t.q[ch.id] = s.t.q[ch.id]; });
    if (s.t) { b.t.ci = Math.min(s.t.ci || 0, TUT.length - 1); b.t.li = Math.min(s.t.li || 0, TUT[b.t.ci].lessons.length); }
    if (s.u) b.u = (s.u + b.u).slice(0, PRAC.length);
    if (s.e) b.e = s.e;
    b.name = s.name || '';
    return b;
  }
  function save() {
    const st = App.st;
    st.loc = App.view === 'tut' ? 't:' + App.tut.ci + ':' + App.tut.li : App.view === 'prac' ? 'u:' + App.prac.i : App.view;
    st.t.ci = App.tut.ci; st.t.li = App.tut.li;
    LX.SCORM.save(st);
  }
  const lessonDone = (ci, li) => App.st.t.d[TUT[ci].id][li] === '1';
  function setLessonDone(ci, li) { const id = TUT[ci].id; const s = App.st.t.d[id].split(''); s[li] = '1'; App.st.t.d[id] = s.join(''); save(); }
  function tutPct() {
    let tot = 0, ok = 0;
    TUT.forEach(ch => { tot += ch.lessons.length + 1; ok += (App.st.t.d[ch.id].match(/1/g) || []).length + (App.st.t.q[ch.id] >= 0 ? 1 : 0); });
    return Math.round(100 * ok / tot);
  }
  const pracCount = () => (App.st.u.match(/1/g) || []).length;

  // ---------- Hilfen ----------
  function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 3200);
  }
  function confirmDlg(title, html, ok, cancel) {
    return new Promise(res => {
      const d = document.createElement('div'); d.className = 'dialog'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
      d.innerHTML = '<div><h2>' + esc(title) + '</h2><div>' + html + '</div><div class="navrow"><button class="btn quiet" type="button" data-r="0">' + esc(cancel || 'Abbrechen') + '</button><button class="btn" type="button" data-r="1">' + esc(ok || 'OK') + '</button></div></div>';
      document.body.appendChild(d);
      d.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { d.remove(); res(b.dataset.r === '1'); }));
      d.addEventListener('keydown', e => { if (e.key === 'Escape') { d.remove(); res(false); } });
      d.querySelector('[data-r="1"]').focus();
    });
  }
  function motd(w) {
    const d = new Date(); const T = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    return 'Willkommen bei Ubuntu 24.04.1 LTS (GNU/Linux 6.8.0-45-generic x86_64)\n\n * Dokumentation:  https://help.ubuntu.com\n * Verwaltung:     https://landscape.canonical.com\n\n' +
      'Letzte Anmeldung: ' + T[d.getDay()] + ' ' + LX.MON[d.getMonth()] + ' ' + d.getDate() + ' 07:58:12 ' + d.getFullYear() + ' von ' + (w.hostname === 'brunner-srv' ? '10.20.30.99' : '192.168.50.44') + '\n';
  }
  function stopTerm() {
    const t = App.term; if (!t) return;
    if (t.pg) t.pgClose(false);
    if (t.nn) t.nClose();
    if (t.readRes) { const r = t.readRes; t.readRes = null; r(null); }
    if (t.sh) t.sh.interrupt();
  }
  function setWorld(w, intro) {
    stopTerm();
    App.w = w;
    const sh = new LX.Shell(w, App.term);
    sh.on(ev => onCommand(ev));
    App.sh = sh;
    App.term.clear();
    App.term.write(motd(w) + (intro ? '\n' + intro + '\n' : '') + '\n');
    App.term.attach(sh);
  }

  // ---------- Terminal einrichten ----------
  function buildTerm() {
    const el = document.createElement('div');
    el.id = 'termEl';
    App.termEl = el;
    App.term = new LX.Term(el);
    let size = 16; try { size = parseInt(localStorage.getItem('lx-tsize') || '16', 10) || 16; } catch (e) { /* egal */ }
    el.style.setProperty('--tsize', size + 'px');
    const tools = el.querySelector('.term-tools');
    tools.innerHTML = '<button type="button" data-a="minus" title="Schrift kleiner" aria-label="Schrift kleiner">A−</button><button type="button" data-a="plus" title="Schrift größer" aria-label="Schrift größer">A+</button><button type="button" data-a="reset" title="Server in den Ausgangszustand zurücksetzen">Zurücksetzen</button>';
    tools.addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.a === 'minus' || b.dataset.a === 'plus') {
        size = Math.max(12, Math.min(24, size + (b.dataset.a === 'plus' ? 1 : -1)));
        el.style.setProperty('--tsize', size + 'px'); try { localStorage.setItem('lx-tsize', String(size)); } catch (err) { /* egal */ }
        App.term.scroll(); return;
      }
      if (b.dataset.a === 'reset') {
        const what = App.view === 'tut' ? 'Der Server wird auf den Stand zu Beginn dieser Lektion zurückgesetzt. Deine Änderungen in dieser Lektion gehen verloren.' : App.view === 'prac' ? 'Die Mission startet mit einem frischen Server neu. Deine Änderungen gehen verloren.' : 'Im Kompetenznachweis ist kein Zurücksetzen möglich.';
        if (App.view === 'exam') { toast(what); return; }
        if (!(await confirmDlg('Zurücksetzen?', '<p>' + what + '</p>', 'Zurücksetzen'))) return;
        if (App.view === 'tut') await loadTutWorld(true);
        if (App.view === 'prac') { delete App.prac.worlds[App.prac.i]; openMission(App.prac.i, true); }
        App.term.focus();
      }
    });
  }
  function workLayout(note) {
    const app = $('#app');
    app.innerHTML = '<div class="work"><section class="pane" id="pane" aria-live="polite"></section><section class="termwrap" aria-label="Terminal"><div id="termSlot" style="flex:1;display:flex;min-height:0"></div><p class="term-note"><span>' + (note || 'Klicke ins Terminal, um zu tippen. <kbd>Tab</kbd> ergänzt Namen, <kbd>↑</kbd> holt frühere Befehle.') + '</span><span>Simulation – es wird nichts an echten Systemen verändert.</span></p></section></div>';
    $('#termSlot').appendChild(App.termEl);
    App.termEl.style.flex = '1';
    return $('#pane');
  }

  // ---------- Kopfleiste ----------
  function renderTop() {
    $$('.tab').forEach(t => { if (t.dataset.view === App.view) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current'); });
    $('#treeBtn').hidden = App.view !== 'tut';
    const name = App.st.name || LX.SCORM.studentName();
    $('#who').textContent = name ? name : '';
  }
  function go(view) {
    if (App.view === 'exam' && App.ex.phase !== 'intro' && App.ex.phase !== 'R' && view !== 'exam') {
      confirmDlg('Kompetenznachweis verlassen?', '<p>Der laufende Versuch wird abgebrochen und nicht gewertet.</p>', 'Verlassen', 'Weiterarbeiten').then(ok => { if (ok) { App.ex.phase = 'intro'; App.ex.att = null; go2(view); } });
      return;
    }
    go2(view);
  }
  function go2(view) {
    closeDrawer();
    App.view = view;
    renderTop();
    if (view === 'home') renderHome();
    else if (view === 'tut') enterTut();
    else if (view === 'prac') enterPrac();
    else if (view === 'exam') renderExam();
    save();
    window.scrollTo(0, 0);
  }

  // ---------- Startseite ----------
  let booted = false;
  function renderHome() {
    const st = App.st;
    const best = st.e.best;
    const exStat = best < 0 ? 'noch kein Versuch' : 'bestes Ergebnis ' + best + ' %' + (best >= 70 ? ', bestanden' : '');
    $('#app').innerHTML = '<section class="home"><div class="home-inner"><div class="boot" id="boot" aria-hidden="true"></div>' +
      '<h1 class="homet">Shell Yeah!</h1><p class="lead">Dein erster Tag als Azubi bei Korbwerk IT-Service. Du verwaltest einen Ubuntu-Server – nur mit der Tastatur. Lerne im Tutorial, trainiere in Missionen und zeig im Kompetenznachweis, was du kannst.</p>' +
      '<ul class="menu">' +
      '<li><button type="button" data-go="tut"><span class="num">①</span><span class="cmd">/tutorial<small>8 Kapitel mit Erklärungen, Aufgaben im Terminal und Kurz-Checks – vom ersten <code>ls</code> bis zur Netzwerkkonfiguration.</small></span><span class="stat">' + tutPct() + ' %<span class="bar"><i style="width:' + tutPct() + '%"></i></span></span></button></li>' +
      '<li><button type="button" data-go="prac"><span class="num">②</span><span class="cmd">/ueben<small>8 Missionen auf einem frischen Server. Du entscheidest, wie du vorgehst; gestufte Tipps helfen, wenn du feststeckst.</small></span><span class="stat">' + pracCount() + ' / ' + PRAC.length + ' Missionen<span class="bar"><i style="width:' + Math.round(100 * pracCount() / PRAC.length) + '%"></i></span></span></button></li>' +
      '<li><button type="button" data-go="exam"><span class="num">③</span><span class="cmd">/nachweis<small>Ein Kundenauftrag mit 21 Prüfpunkten am Server einer Bäckerei und 12 Fragen. Bestanden ab 70 %.</small></span><span class="stat">' + esc(exStat) + '</span></button></li>' +
      '</ul><div class="foot"><p>Lernziele: Du kannst …</p><ol class="lzlist">' + Object.keys(LX.LZ).map(k => '<li>' + esc(LX.LZ[k]) + '</li>').join('') + '</ol></div></div></section>';
    $$('.menu button').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
    bootAnim();
  }
  function bootAnim() {
    const el = $('#boot'); if (!el) return;
    const name = App.st.name || LX.SCORM.studentName();
    const lines = [
      '<span class="dim">Ubuntu 24.04.1 LTS korb-srv01 tty1</span>', '',
      'korb-srv01 login: <span class="grn">azubi</span>', 'Passwort: ', '',
      '<span class="grn">azubi@korb-srv01</span>:<span class="blu">~</span>$ cat willkommen.txt',
      'Hallo' + (name ? ' ' + esc(name.split(' ')[0]) : '') + ' und herzlich willkommen bei Korbwerk! <span class="hl">▌</span>'
    ];
    if (booted || reduced) { el.innerHTML = lines.join('\n'); return; }
    booted = true;
    let i = 0;
    const step = () => { if (!document.body.contains(el)) return; el.innerHTML = lines.slice(0, ++i).join('\n'); if (i < lines.length) setTimeout(step, i === 2 ? 380 : i === 3 ? 520 : 240); };
    step();
  }

  // ---------- Kursbaum ----------
  function closeDrawer() { const d = $('#drawer'); if (d) d.remove(); const s = $('#scrim'); if (s) s.remove(); }
  function openDrawer() {
    closeDrawer();
    const scrim = document.createElement('div'); scrim.className = 'scrim'; scrim.id = 'scrim'; scrim.addEventListener('click', closeDrawer);
    const d = document.createElement('aside'); d.className = 'drawer'; d.id = 'drawer'; d.setAttribute('aria-label', 'Kursbaum');
    let html = '<div class="crumb"><span class="path">azubi@korb-srv01:~$ tree linux-kurs/tutorial</span></div><ul class="treelist" style="margin-top:10px"><li><span class="dirn">linux-kurs/tutorial</span></li>';
    TUT.forEach((ch, ci) => {
      const lastCh = ci === TUT.length - 1;
      const doneAll = !App.st.t.d[ch.id].includes('0') && App.st.t.q[ch.id] >= 0;
      html += '<li><span class="g">' + (lastCh ? '└── ' : '├── ') + '</span><button type="button" data-ci="' + ci + '" data-li="0"><span class="dirn">' + ch.dir + '/</span></button>' + (doneAll ? ' <span class="ok">✓</span>' : '') + '</li>';
      ch.lessons.concat([{ title: 'Kurz-Check', quiz: true }]).forEach((l, li) => {
        const last = li === ch.lessons.length;
        const ok = l.quiz ? App.st.t.q[ch.id] >= 0 : lessonDone(ci, li);
        const cur = App.tut.ci === ci && App.tut.li === li;
        html += '<li><span class="g">' + (lastCh ? '    ' : '│   ') + (last ? '└── ' : '├── ') + '</span><button type="button" data-ci="' + ci + '" data-li="' + li + '"' + (cur ? ' aria-current="true"' : '') + '><span class="' + (cur ? 'cur' : '') + '">' + esc(l.title) + '</span></button>' + (ok ? ' <span class="ok">✓</span>' : '') + '</li>';
      });
    });
    html += '</ul>';
    d.innerHTML = html;
    document.body.appendChild(scrim); document.body.appendChild(d);
    d.querySelectorAll('button[data-ci]').forEach(b => b.addEventListener('click', () => { closeDrawer(); gotoLesson(+b.dataset.ci, +b.dataset.li); }));
    const cur = d.querySelector('[aria-current="true"]'); (cur || d.querySelector('button')).focus();
  }

  // ---------- Tutorial ----------
  async function loadTutWorld(force) {
    const key = App.tut.ci + ':' + App.tut.li;
    if (!force && App.tut.wkey === key && App.tutWorld) { if (App.w !== App.tutWorld) setWorld(App.tutWorld); return; }
    stopTerm();
    App.term.clear(); App.term.write('Verbinde mit korb-srv01 …\n');
    const li = Math.min(App.tut.li, TUT[App.tut.ci].lessons.length);
    const w = await LX.tutorialWorld(App.tut.ci, li);
    App.tut.wkey = key;
    App.tutWorld = w;
    setWorld(w);
  }
  async function enterTut() {
    workLayout();
    renderLesson();
    await loadTutWorld(false);
  }
  async function gotoLesson(ci, li) {
    App.tut.ci = ci; App.tut.li = li; resetLessonUi();
    if (App.view !== 'tut') { App.view = 'tut'; renderTop(); workLayout(); }
    renderLesson();
    await loadTutWorld(true);
    save();
  }
  function resetLessonUi() { App.tut.hints = {}; App.tut.sol = {}; App.tut.quizAns = {}; App.tut.quizShown = false; App.tut.quizOrder = null; App.tut.done = []; App.tut.fb = {}; }

  function lessonObj() { const ch = TUT[App.tut.ci]; return App.tut.li < ch.lessons.length ? ch.lessons[App.tut.li] : null; }
  function renderLesson() {
    const pane = $('#pane'); if (!pane) return;
    const ch = TUT[App.tut.ci];
    const L = lessonObj();
    const crumb = '<div class="crumb"><span class="path">~/linux-kurs/tutorial/' + ch.dir + '</span><span>Kapitel ' + (App.tut.ci + 1) + ' von ' + TUT.length + '</span></div>';
    if (!L) { renderQuiz(pane, ch, crumb); return; }
    const done = lessonDone(App.tut.ci, App.tut.li);
    if (!App.tut.done.length) App.tut.done = L.tasks.map(() => done);
    const firstOpen = App.tut.done.indexOf(false);
    let html = '<div class="pane-inner">' + crumb + '<h1>' + esc(L.title) + '</h1>';
    html += '<div class="msg"><div class="msg-head">Nachricht von <b>mira@korb-srv01</b> auf pts/1 um ' + now() + ' …</div><div class="msg-body">' + L.story + '</div><div class="msg-foot">EOF</div></div>';
    html += L.html;
    html += '<ol class="tasks" aria-label="Aufgaben">';
    L.tasks.forEach((t, i) => {
      const d = App.tut.done[i];
      const cls = d ? 'done' : (i === firstOpen ? 'active' : '');
      html += '<li class="task ' + cls + '" data-i="' + i + '"><span class="st" aria-hidden="true">' + (d ? '✓' : (i === firstOpen ? '›' : '○')) + '</span><div><p class="ttext"><span class="sr">' + (d ? 'Erledigt: ' : 'Offen: ') + '</span>' + t.text + '</p>';
      if (t.type === 'answer' && !d) {
        html += '<div class="answer"><input type="text" aria-label="Deine Antwort" data-ans="' + i + '" autocomplete="off" spellcheck="false"><button class="btn quiet" type="button" data-chk="' + i + '">Prüfen</button></div>';
        if (App.tut.fb && App.tut.fb[i]) html += '<div class="fb bad" role="alert">' + esc(App.tut.fb[i]) + '</div>';
      }
      if (!d) {
        html += '<div class="hintline">' + (App.tut.hints[i] ? '' : '<button class="linkbtn" type="button" data-hint="' + i + '">Tipp</button>');
        if (App.tut.hints[i] && t.solve && t.solve.length && !App.tut.sol[i]) html += '<button class="linkbtn" type="button" data-sol="' + i + '">Lösung zeigen</button>';
        html += '</div>';
        if (App.tut.hints[i]) html += '<div class="hint">' + t.hint + '</div>';
        if (App.tut.sol[i]) {
          const cmds = t.solve.map(s => typeof s === 'string' ? s : s.cmd);
          html += '<div class="hint">' + (t.solve.some(s => typeof s !== 'string') ? 'Starte <code>' + esc(cmds[0]) + '</code> und bearbeite den Text so, wie es die Aufgabe verlangt.' : cmds.map(c => '<code>' + esc(c) + '</code>').join(' dann ') + ' <button class="linkbtn" type="button" data-type="' + i + '">ins Terminal übernehmen</button>') + '</div>';
        }
      }
      html += '</div></li>';
    });
    html += '</ol>';
    const allDone = App.tut.done.every(Boolean);
    if (allDone) html += '<p class="lesson-done" role="status">Lektion erledigt. Weiter geht’s!</p>';
    const isFirst = App.tut.ci === 0 && App.tut.li === 0;
    html += '<div class="navrow"><button class="btn quiet" type="button" id="prevBtn"' + (isFirst ? ' disabled' : '') + '>Zurück</button><span class="progressline">Lektion ' + (App.tut.li + 1) + ' / ' + ch.lessons.length + '</span><button class="btn' + (allDone ? '' : ' quiet') + '" type="button" id="nextBtn">' + (allDone ? 'Weiter' : 'Überspringen') + '</button></div></div>';
    pane.innerHTML = html;
    wireLesson(pane, L);
  }
  function wireLesson(pane, L) {
    pane.querySelectorAll('[data-hint]').forEach(b => b.addEventListener('click', () => { App.tut.hints[b.dataset.hint] = true; renderLesson(); }));
    pane.querySelectorAll('[data-sol]').forEach(b => b.addEventListener('click', () => { App.tut.sol[b.dataset.sol] = true; renderLesson(); }));
    pane.querySelectorAll('[data-type]').forEach(b => b.addEventListener('click', () => { const t = L.tasks[b.dataset.type]; const c = t.solve.map(s => typeof s === 'string' ? s : s.cmd); if (!App.term.type(c[0])) toast('Das Terminal ist gerade beschäftigt.'); }));
    pane.querySelectorAll('[data-chk]').forEach(b => {
      const i = +b.dataset.chk; const inp = pane.querySelector('[data-ans="' + i + '"]');
      const run = () => {
        const v = inp.value.trim(); if (!v) { inp.focus(); return; }
        App.tut.fb = App.tut.fb || {};
        if (L.tasks[i].accept(v, App.w)) { App.tut.done[i] = true; App.tut.fb[i] = ''; afterTaskChange(); }
        else { App.tut.fb[i] = 'Noch nicht richtig – »' + v + '«. Schau noch einmal genau hin.'; renderLesson(); const n = $('[data-ans="' + i + '"]'); if (n) { n.value = v; n.focus(); n.select(); } }
      };
      b.addEventListener('click', run);
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
    });
    $('#prevBtn').addEventListener('click', () => prevLesson());
    $('#nextBtn').addEventListener('click', () => nextLesson());
  }
  function afterTaskChange() {
    const L = lessonObj(); if (!L) return;
    const was = lessonDone(App.tut.ci, App.tut.li);
    if (App.tut.done.every(Boolean) && !was) { setLessonDone(App.tut.ci, App.tut.li); toast('Lektion erledigt'); }
    renderLesson();
    const nb = $('#nextBtn'); if (nb && App.tut.done.every(Boolean)) { const p = $('#pane'); p.scrollTop = p.scrollHeight; }
  }
  async function nextLesson() {
    const ch = TUT[App.tut.ci];
    const L = lessonObj();
    if (L) {
      const complete = App.tut.done.every(Boolean);
      App.tut.li++; resetLessonUi();
      renderLesson();
      if (complete) App.tut.wkey = App.tut.ci + ':' + App.tut.li;
      else { await loadTutWorld(true); toast('Übersprungen – der Server wurde auf den Stand nach dieser Lektion gebracht.'); }
      save(); $('#pane').scrollTop = 0; return;
    }
    // nach dem Kurz-Check: nächstes Kapitel
    if (App.tut.ci < TUT.length - 1) {
      App.tut.ci++; App.tut.li = 0; resetLessonUi();
      const nch = TUT[App.tut.ci];
      // gleicher Server, neuer Arbeitstag
      const tw = App.tutWorld;
      if (tw && App.tut.wkey === (App.tut.ci - 1) + ':' + ch.lessons.length) {
        tw.cwd = H; if (nch.setup) nch.setup(tw); tw.sudoUntil = 0;
        App.tut.wkey = App.tut.ci + ':0';
        setWorld(tw, 'Ein neuer Arbeitstag beginnt: Kapitel ' + (App.tut.ci + 1) + ' – ' + nch.title);
      } else await loadTutWorld(true);
      renderLesson(); save(); $('#pane').scrollTop = 0; return;
    }
    go('prac');
  }
  async function prevLesson() {
    if (App.tut.li > 0) App.tut.li--;
    else if (App.tut.ci > 0) { App.tut.ci--; App.tut.li = TUT[App.tut.ci].lessons.length; }
    else return;
    resetLessonUi(); renderLesson(); await loadTutWorld(true); save(); $('#pane').scrollTop = 0;
  }
  function renderQuiz(pane, ch, crumb) {
    const qs = ch.quiz;
    const shown = App.tut.quizShown;
    const prev = App.st.t.q[ch.id];
    let html = '<div class="pane-inner">' + crumb + '<h1>Kurz-Check: ' + esc(ch.title) + '</h1><p>Vier Fragen zum Abschluss des Kapitels. Du kannst den Check beliebig oft wiederholen – er geht nicht in die Bewertung ein.' + (prev >= 0 && !shown ? ' Zuletzt: ' + prev + ' von ' + qs.length + ' richtig.' : '') + '</p>';
    qs.forEach((q, qi) => {
      html += '<fieldset class="qblock" style="border:0;margin:0"><legend class="qtext">' + (qi + 1) + '. ' + q.q + '</legend>';
      const order = App.tut.quizOrder && App.tut.quizOrder[qi] || shuffle(q.a.map((_, i) => i));
      App.tut.quizOrder = App.tut.quizOrder || {}; App.tut.quizOrder[qi] = order;
      order.forEach(ai => {
        const sel = App.tut.quizAns[qi] === ai;
        let cls = '';
        if (shown) { if (ai === q.c) cls = 'right'; else if (sel) cls = 'wrong'; }
        html += '<label class="opt ' + cls + '"><input type="radio" name="kq' + qi + '" value="' + ai + '"' + (sel ? ' checked' : '') + (shown ? ' disabled' : '') + '><span>' + fmtOpt(q.a[ai]) + '</span></label>';
      });
      if (shown) html += '<p class="explain">' + (App.tut.quizAns[qi] === q.c ? '<span class="yes">Richtig.</span> ' : '<span class="no">Leider nicht.</span> ') + q.ex + '</p>';
      html += '</fieldset>';
    });
    const score = qs.filter((q, i) => App.tut.quizAns[i] === q.c).length;
    if (shown) html += '<p class="lesson-done" role="status">' + score + ' von ' + qs.length + ' richtig. ' + (score === qs.length ? 'Stark!' : 'Schau dir die Erklärungen an oder wiederhole den Check.') + '</p>';
    const last = App.tut.ci === TUT.length - 1;
    html += '<div class="navrow"><button class="btn quiet" type="button" id="prevBtn">Zurück</button>' + (shown ? '<button class="btn quiet" type="button" id="againBtn">Wiederholen</button><button class="btn" type="button" id="nextBtn">' + (last ? 'Zum Üben' : 'Nächstes Kapitel') + '</button>' : '<button class="btn" type="button" id="evalBtn">Auswerten</button>') + '</div></div>';
    pane.innerHTML = html;
    pane.querySelectorAll('input[type=radio]').forEach(r => r.addEventListener('change', () => { App.tut.quizAns[+r.name.slice(2)] = +r.value; }));
    $('#prevBtn').addEventListener('click', prevLesson);
    if ($('#evalBtn')) $('#evalBtn').addEventListener('click', () => {
      if (Object.keys(App.tut.quizAns).length < qs.length) { toast('Bitte beantworte alle Fragen.'); return; }
      App.tut.quizShown = true;
      App.st.t.q[ch.id] = qs.filter((q, i) => App.tut.quizAns[i] === q.c).length; save();
      renderLesson(); pane.scrollTop = 0;
    });
    if ($('#againBtn')) $('#againBtn').addEventListener('click', () => { App.tut.quizAns = {}; App.tut.quizShown = false; App.tut.quizOrder = null; renderLesson(); pane.scrollTop = 0; });
    if ($('#nextBtn')) $('#nextBtn').addEventListener('click', nextLesson);
  }
  // Antwortoptionen, die Befehle sind, als Code darstellen
  function fmtOpt(t) {
    if (/<code>/.test(t)) return t;
    const first = t.split(/\s+/)[0];
    const isCmd = (LX.CMDS[first] || ['sudo', 'q', 'ifconfig', 'route'].indexOf(first) >= 0) && !/ – /.test(t) && !/[A-ZÄÖÜ][a-zäöüß]{3,}/.test(t.replace(/^\S+\s*/, ''));
    return isCmd ? '<code>' + t + '</code>' : t;
  }
  function shuffle(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = b[i]; b[i] = b[j]; b[j] = t; } return b; }

  // ---------- Befehls-Ereignisse ----------
  function onCommand(ev) {
    if (App.view === 'tut') {
      const L = lessonObj(); if (!L) return;
      let changed = false;
      L.tasks.forEach((t, i) => {
        if (App.tut.done[i] || t.type === 'answer') return;
        let ok = false; try { ok = !!t.check(ev, App.w); } catch (e) { ok = false; }
        if (ok) { App.tut.done[i] = true; changed = true; }
      });
      if (changed) afterTaskChange();
    } else if (App.view === 'prac') {
      updateChecks();
    }
  }

  // ---------- Üben ----------
  function enterPrac() {
    workLayout('Jede Mission läuft auf einem eigenen, frischen Server. sudo-Passwort: <b>korb2026</b>. Die Prüfpunkte aktualisieren sich nach jedem Befehl.');
    openMission(App.prac.i, false);
  }
  function openMission(i, fresh) {
    App.prac.i = i;
    const m = PRAC[i];
    let w = App.prac.worlds[i];
    if (!w || fresh) { w = LX.practiceWorld(i); App.prac.worlds[i] = w; }
    setWorld(w, 'Mission ' + (i + 1) + ': ' + m.title);
    renderPrac();
    save();
  }
  function renderPrac() {
    const pane = $('#pane'); if (!pane) return;
    const i = App.prac.i, m = PRAC[i];
    let html = '<div class="pane-inner"><div class="crumb"><span class="path">~/linux-kurs/ueben</span><span>' + pracCount() + ' von ' + PRAC.length + ' Missionen geschafft</span></div>';
    html += '<ul class="mlist" aria-label="Missionen">' + PRAC.map((x, k) => '<li><button type="button" data-m="' + k + '"' + (k === i ? ' aria-current="true"' : '') + '><span class="mn">Ü' + (k + 1) + '</span><span>' + esc(x.title) + '</span><span class="ms">' + (App.st.u[k] === '1' ? '✓' : '') + '</span></button></li>').join('') + '</ul>';
    html += '<h1>Ü' + (i + 1) + ' ' + esc(m.title) + '</h1>';
    html += '<div class="msg"><div class="msg-head">Nachricht von <b>mira@korb-srv01</b> auf pts/1 um ' + now() + ' …</div><div class="msg-body">' + m.story + '</div><div class="msg-foot">EOF</div></div>';
    html += '<h2>Prüfpunkte</h2><ul class="checks" id="checks"></ul>';
    html += '<h2>Tipps</h2><p style="font-size:15px;color:var(--muted)">Versuch es zuerst allein. Die Tipps werden von Stufe zu Stufe konkreter.</p><div id="tips"></div>';
    html += '<h2>Reflexion</h2><p>' + m.reflect.q + '</p><textarea class="refl" id="refl" aria-label="Deine Antwort zur Reflexionsfrage" placeholder="Deine Gedanken …">' + esc(App.prac.refl[i] || '') + '</textarea><div style="margin-top:8px"><button class="btn quiet" type="button" id="modelBtn">Musterantwort vergleichen</button></div><div id="model"></div>';
    html += '<div class="navrow"><button class="btn quiet" type="button" id="restart">Mission neu starten</button><button class="btn" type="button" id="nextM">' + (i < PRAC.length - 1 ? 'Nächste Mission' : 'Zum Kompetenznachweis') + '</button></div></div>';
    pane.innerHTML = html;
    pane.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => openMission(+b.dataset.m, false)));
    $('#restart').addEventListener('click', async () => { if (await confirmDlg('Mission neu starten?', '<p>Der Server dieser Mission wird zurückgesetzt.</p>', 'Neu starten')) { openMission(i, true); App.term.focus(); } });
    $('#nextM').addEventListener('click', () => { if (i < PRAC.length - 1) openMission(i + 1, false); else go('exam'); });
    $('#refl').addEventListener('input', e => { App.prac.refl[i] = e.target.value; });
    $('#modelBtn').addEventListener('click', () => {
      if ((App.prac.refl[i] || '').trim().length < 25) { toast('Schreib zuerst deine eigene Antwort (ein, zwei Sätze).'); $('#refl').focus(); return; }
      App.prac.model[i] = true; showModel();
    });
    renderTips(); showModel(); updateChecks();
  }
  function showModel() { const i = App.prac.i; const el = $('#model'); if (el) el.innerHTML = App.prac.model[i] ? '<div class="model"><b>Musterantwort:</b> ' + PRAC[i].reflect.model + '</div>' : ''; }
  function renderTips() {
    const i = App.prac.i, m = PRAC[i]; const n = App.prac.tips[i] || 0; const el = $('#tips'); if (!el) return;
    let html = '';
    for (let k = 0; k < n; k++) html += '<div class="tipbox"><b>Tipp ' + (k + 1) + ':</b> ' + m.tips[k] + '</div>';
    if (n < m.tips.length) html += '<div class="tiprow"><button class="btn quiet" type="button" id="tipBtn">Tipp ' + (n + 1) + ' anzeigen</button></div>';
    el.innerHTML = html;
    if ($('#tipBtn')) $('#tipBtn').addEventListener('click', () => { App.prac.tips[i] = n + 1; renderTips(); });
  }
  function updateChecks() {
    const i = App.prac.i, m = PRAC[i]; const el = $('#checks'); if (!el || App.w !== App.prac.worlds[i]) return;
    const res = m.checks.map(c => { try { return !!c.fn(App.w); } catch (e) { return false; } });
    el.innerHTML = m.checks.map((c, k) => '<li class="' + (res[k] ? 'ok' : '') + '"><span class="st" aria-hidden="true">' + (res[k] ? '✓' : '○') + '</span><span><span class="sr">' + (res[k] ? 'Erfüllt: ' : 'Offen: ') + '</span>' + c.text + '</span></li>').join('');
    if (res.every(Boolean) && App.st.u[i] !== '1') {
      const s = App.st.u.split(''); s[i] = '1'; App.st.u = s.join(''); save();
      toast('Mission geschafft! Denk noch über die Reflexionsfrage nach.');
      const b = $('[data-m="' + i + '"] .ms'); if (b) b.textContent = '✓';
      const cr = $('.crumb span:last-child'); if (cr) cr.textContent = pracCount() + ' von ' + PRAC.length + ' Missionen geschafft';
    }
  }

  // ---------- Kompetenznachweis ----------
  function renderExam() {
    const ph = App.ex.phase;
    if (ph === 'A') return renderExamA();
    if (ph === 'B') return renderExamB();
    if (ph === 'R') return renderResult(App.ex.att, false);
    const st = App.st;
    const best = st.e.best;
    let html = '<section class="single"><div class="single-inner"><div class="crumb"><span class="path">~/linux-kurs/nachweis</span></div><h1>Kompetenznachweis</h1>' + EXAM.intro;
    html += '<div class="facts"><div><b>Teil A</b><span>21 Prüfpunkte im Terminal, 50 %</span></div><div><b>Teil B</b><span>12 Fragen aus einem Pool, 50 %</span></div><div><b>70 %</b><span>zum Bestehen; dein bestes Ergebnis zählt</span></div></div>';
    html += '<p>Ablauf: Erst bearbeitest du Teil A am Server und gibst ihn ab. Danach folgen die Fragen von Teil B. Bearbeite den Nachweis in einem Zug – wenn du die Seite verlässt oder neu lädst, wird der Versuch nicht gewertet.</p>';
    if (st.e.att > 0) html += '<p>Bisherige Versuche: ' + st.e.att + '. Bestes Ergebnis: <b>' + best + ' %</b> ' + (best >= 70 ? '<span class="badge pass">bestanden</span>' : '<span class="badge fail">noch nicht bestanden</span>') + '</p>';
    html += '<div class="navrow" style="justify-content:flex-start"><button class="btn" type="button" id="startEx">' + (st.e.att ? 'Neuen Versuch starten' : 'Nachweis starten') + '</button>' + (st.e.last ? '<button class="btn quiet" type="button" id="lastEx">Letztes Ergebnis ansehen</button>' : '') + '</div></div></section>';
    $('#app').innerHTML = html;
    $('#startEx').addEventListener('click', startExam);
    if ($('#lastEx')) $('#lastEx').addEventListener('click', () => renderResult(null, true));
  }
  function startExam() {
    const drawn = LX.drawExam();
    const order = {};
    drawn.forEach(id => { const q = LX.examQ(id); if (q.a) order[id] = shuffle(q.a.map((_, i) => i)); if (q.type === 'match') order[id] = shuffle(q.pairs.map((_, i) => i)); });
    App.ex.att = { drawn: drawn, order: order, ans: {}, mine: {}, aRes: null, qi: 0, start: Date.now() };
    App.ex.phase = 'A';
    App.exWorld = LX.examWorld();
    renderExamA();
  }
  function renderExamA() {
    const pane = workLayout('sudo-Passwort auf brunner-srv: <b>brot2026</b>. Es gibt keine Zwischenkontrolle – gewertet wird beim Abgeben.');
    if (App.w !== App.exWorld) setWorld(App.exWorld, 'Kundenauftrag Bäckerei Brunner – viel Erfolg!');
    const att = App.ex.att;
    let html = '<div class="pane-inner"><div class="crumb"><span class="path">~/linux-kurs/nachweis/teil_a</span><span>Teil A von B</span></div><h1>Auftragsliste Bäckerei Brunner</h1>';
    html += '<div class="msg"><div class="msg-head">Nachricht von <b>brunner@brunner-srv</b> auf pts/2 um ' + now() + ' …</div><div class="msg-body">Guten Morgen! Schön, dass Korbwerk uns jemanden schickt. Unser Server ist ziemlich durcheinander. Die Liste unten ist alles, was erledigt werden muss. Das sudo-Passwort ist <b>brot2026</b>. Danke! – Anna Brunner</div><div class="msg-foot">EOF</div></div>';
    html += '<p style="font-size:15px;color:var(--muted)">Die Kästchen rechts sind nur deine eigene Merkhilfe. Sie werden nicht gewertet.</p><ol class="orders">' + EXAM.tasksA.map(t => '<li class="' + (att.mine[t.id] ? 'mine' : '') + '"><span>' + t.text + '</span><input type="checkbox" aria-label="Für mich als erledigt markieren" data-mine="' + t.id + '"' + (att.mine[t.id] ? ' checked' : '') + '></li>').join('') + '</ol>';
    html += '<div class="navrow"><span class="progressline">21 Prüfpunkte</span><button class="btn" type="button" id="submitA">Teil A abgeben</button></div></div>';
    pane.innerHTML = html;
    pane.querySelectorAll('[data-mine]').forEach(c => c.addEventListener('change', () => { att.mine[c.dataset.mine] = c.checked; c.closest('li').classList.toggle('mine', c.checked); }));
    $('#submitA').addEventListener('click', async () => {
      if (!(await confirmDlg('Teil A abgeben?', '<p>Danach wird der Zustand des Servers bewertet. Du kannst Teil A anschließend nicht mehr ändern.</p>', 'Abgeben', 'Weiterarbeiten'))) return;
      stopTerm();
      att.aRes = EXAM.tasksA.map(t => { try { return !!t.fn(App.exWorld); } catch (e) { return false; } });
      App.ex.phase = 'B'; att.qi = 0;
      renderExamB(); window.scrollTo(0, 0);
    });
  }
  function qHtml(q, att, review) {
    const id = q.id; const a = att.ans[id];
    let html = '<p class="qtext">' + q.q + '</p>';
    if (q.term) html += '<pre class="mini">' + esc(q.term) + '</pre>';
    if (q.type === 'mc' || q.type === 'term') {
      (att.order[id] || q.a.map((_, i) => i)).forEach(ai => {
        let cls = ''; if (review) { if (ai === q.c) cls = 'right'; else if (a === ai) cls = 'wrong'; }
        html += '<label class="opt ' + cls + '"><input type="radio" name="q_' + id + '" value="' + ai + '"' + (a === ai ? ' checked' : '') + (review ? ' disabled' : '') + '><span>' + fmtOpt(q.a[ai]) + '</span></label>';
      });
    } else if (q.type === 'hot') {
      html += '<pre class="mini" role="group" aria-label="Klickbare Ausgabe">' + q.lines.map(line => line.map(seg => {
        if (typeof seg === 'string') return esc(seg);
        let cls = 'hs'; if (a === seg[1]) cls += review ? (seg[1] === q.c ? ' sel' : ' wrongsel') : ' sel'; if (review && seg[1] === q.c) cls += ' right';
        return '<button type="button" class="' + cls + '" data-hs="' + esc(seg[1]) + '"' + (review ? ' disabled' : '') + ' aria-pressed="' + (a === seg[1]) + '">' + esc(seg[0]) + '</button>';
      }).join('')).join('\n') + '</pre>';
    } else if (q.type === 'match') {
      const rights = (att.order[id] || q.pairs.map((_, i) => i)).map(k => q.pairs[k][1]);
      html += '<table class="match">' + q.pairs.map((p, k) => {
        const v = a && a[k];
        const mark = review ? (v === p[1] ? ' <span class="yes">✓</span>' : ' <span class="no">✗ richtig: ' + esc(p[1]) + '</span>') : '';
        return '<tr><td>' + esc(p[0]) + '</td><td><select data-mk="' + k + '"' + (review ? ' disabled' : '') + ' aria-label="Zuordnung für ' + esc(p[0]) + '"><option value="">– bitte wählen –</option>' + rights.map(r => '<option' + (v === r ? ' selected' : '') + '>' + esc(r) + '</option>').join('') + '</select>' + mark + '</td></tr>';
      }).join('') + '</table>';
    } else if (q.type === 'num') {
      html += '<input class="num" type="text" inputmode="numeric" data-num="1" aria-label="Zahl eingeben" value="' + esc(a == null ? '' : a) + '"' + (review ? ' disabled' : '') + '>' + (review ? ' <span class="' + (isRight(q, a) ? 'yes">✓' : 'no">✗ richtig: ' + q.ans) + '</span>' : '');
    }
    return html;
  }
  function isRight(q, a) {
    if (a == null || a === '') return false;
    if (q.type === 'mc' || q.type === 'term') return a === q.c;
    if (q.type === 'hot') return a === q.c;
    if (q.type === 'match') return q.pairs.every((p, k) => a[k] === p[1]);
    if (q.type === 'num') return parseFloat(String(a).replace(',', '.').replace(/[^\d.\-]/g, '')) === Number(q.ans);
    return false;
  }
  function answered(q, a) { if (a == null || a === '') return false; if (q.type === 'match') return q.pairs.every((p, k) => a[k]); return true; }
  function renderExamB() {
    const att = App.ex.att; const qi = att.qi; const id = att.drawn[qi]; const q = LX.examQ(id);
    let html = '<section class="single"><div class="single-inner"><div class="crumb"><span class="path">~/linux-kurs/nachweis/teil_b</span><span>Teil A ist abgegeben</span></div><h1>Teil B: Fragen</h1>';
    html += '<div class="qdots" role="navigation" aria-label="Fragen">' + att.drawn.map((d, k) => '<button type="button" data-q="' + k + '" class="' + (answered(LX.examQ(d), att.ans[d]) ? 'answered' : '') + '"' + (k === qi ? ' aria-current="true"' : '') + ' aria-label="Frage ' + (k + 1) + '">' + (k + 1) + '</button>').join('') + '</div>';
    html += '<div class="qcard"><div class="qhead"><span>Frage ' + (qi + 1) + ' von ' + att.drawn.length + '</span><span>Lernziel ' + q.lz + '</span></div>' + qHtml(q, att, false) + '</div>';
    html += '<div class="navrow"><button class="btn quiet" type="button" id="qPrev"' + (qi === 0 ? ' disabled' : '') + '>Zurück</button>' + (qi < att.drawn.length - 1 ? '<button class="btn" type="button" id="qNext">Weiter</button>' : '<button class="btn" type="button" id="qDone">Nachweis abgeben</button>') + '</div></div></section>';
    $('#app').innerHTML = html;
    const card = $('.qcard');
    card.querySelectorAll('input[type=radio]').forEach(r => r.addEventListener('change', () => { att.ans[id] = +r.value; markDot(); }));
    card.querySelectorAll('[data-hs]').forEach(b => b.addEventListener('click', () => { att.ans[id] = b.dataset.hs; card.querySelectorAll('[data-hs]').forEach(x => { x.classList.toggle('sel', x === b); x.setAttribute('aria-pressed', String(x === b)); }); markDot(); }));
    card.querySelectorAll('[data-mk]').forEach(s => s.addEventListener('change', () => { att.ans[id] = att.ans[id] || []; att.ans[id][+s.dataset.mk] = s.value; markDot(); }));
    const ni = card.querySelector('[data-num]'); if (ni) ni.addEventListener('input', () => { att.ans[id] = ni.value; markDot(); });
    function markDot() { const d = $('.qdots [data-q="' + qi + '"]'); if (d) d.classList.toggle('answered', answered(q, att.ans[id])); }
    $$('.qdots [data-q]').forEach(b => b.addEventListener('click', () => { att.qi = +b.dataset.q; renderExamB(); }));
    if ($('#qPrev')) $('#qPrev').addEventListener('click', () => { att.qi--; renderExamB(); });
    if ($('#qNext')) $('#qNext').addEventListener('click', () => { att.qi++; renderExamB(); });
    if ($('#qDone')) $('#qDone').addEventListener('click', async () => {
      const open = att.drawn.filter(d => !answered(LX.examQ(d), att.ans[d])).length;
      if (!(await confirmDlg('Nachweis abgeben?', open ? '<p>' + open + ' Frage(n) sind noch unbeantwortet und zählen als falsch.</p>' : '<p>Alle Fragen sind beantwortet.</p>', 'Abgeben', 'Zurück'))) return;
      finishExam();
    });
  }
  function finishExam() {
    const att = App.ex.att;
    const aOk = att.aRes.filter(Boolean).length;
    const bRes = att.drawn.map(id => isRight(LX.examQ(id), att.ans[id]));
    const bOk = bRes.filter(Boolean).length;
    const sa = 100 * aOk / EXAM.tasksA.length, sb = 100 * bOk / att.drawn.length;
    const s = Math.round(0.5 * sa + 0.5 * sb);
    att.result = { aOk: aOk, bOk: bOk, s: s, sa: sa, sb: sb, bRes: bRes, date: new Date().toISOString() };
    const st = App.st;
    st.e.att = (st.e.att || 0) + 1;
    st.e.best = Math.max(st.e.best, s);
    st.e.last = { d: att.result.date, a: att.aRes.map(x => x ? 1 : 0).join(''), b: att.drawn.map((id, k) => id + ':' + (bRes[k] ? 1 : 0)).join(','), s: s };
    save();
    LX.SCORM.result(st.e.best, true);
    App.ex.phase = 'R';
    renderResult(att, false);
    window.scrollTo(0, 0);
  }
  // Ergebnisdaten (aus laufendem Versuch oder gespeichertem letzten Ergebnis)
  function resultData(att) {
    if (att && att.result) return { date: att.result.date, a: att.aRes, b: att.drawn.map((id, k) => ({ id: id, ok: att.result.bRes[k], ans: att.ans[id] })), s: att.result.s, live: true };
    const L = App.st.e.last; if (!L) return null;
    return { date: L.d, a: L.a.split('').map(x => x === '1'), b: (L.b || '').split(',').filter(Boolean).map(x => { const p = x.split(':'); return { id: p[0], ok: p[1] === '1' }; }), s: L.s, live: false };
  }
  function lzTable(R) {
    const rows = Object.keys(LX.LZ).map(lz => {
      const a = EXAM.tasksA.map((t, k) => t.lz === +lz ? R.a[k] : null).filter(x => x !== null);
      const b = R.b.filter(x => { const q = LX.examQ(x.id); return q && q.lz === +lz; });
      return { lz: lz, aOk: a.filter(Boolean).length, aN: a.length, bOk: b.filter(x => x.ok).length, bN: b.length };
    });
    return rows;
  }
  function renderResult(att, fromStore) {
    const R = resultData(fromStore ? null : att); if (!R) { renderExam(); return; }
    const aOk = R.a.filter(Boolean).length, bOk = R.b.filter(x => x.ok).length;
    const pass = R.s >= 70;
    const name = App.st.name || LX.SCORM.studentName();
    let html = '<section class="single"><div class="single-inner"><div class="crumb"><span class="path">~/linux-kurs/nachweis/ergebnis</span><span>' + new Date(R.date).toLocaleString('de-DE') + '</span></div><h1>Ergebnis Kompetenznachweis</h1>';
    html += '<div class="result-head"><span class="big">' + R.s + ' %</span><span class="badge ' + (pass ? 'pass' : 'fail') + '">' + (pass ? 'bestanden' : 'nicht bestanden') + '</span><span style="color:var(--muted)">Bestes Ergebnis bisher: ' + App.st.e.best + ' %</span></div>';
    html += '<table class="res"><tr><th>Teil</th><th></th><th class="r">Ergebnis</th></tr><tr><td>A – Kundenauftrag am Server</td><td>' + aOk + ' von ' + R.a.length + ' Prüfpunkten</td><td class="r">' + Math.round(100 * aOk / R.a.length) + ' %</td></tr><tr><td>B – Fragen</td><td>' + bOk + ' von ' + R.b.length + ' Fragen</td><td class="r">' + Math.round(100 * bOk / Math.max(1, R.b.length)) + ' %</td></tr><tr><td><b>Gesamt</b> (je 50 %)</td><td></td><td class="r"><b>' + R.s + ' %</b></td></tr></table>';
    html += '<h2>Nach Lernzielen</h2><table class="res"><tr><th>Lernziel</th><th class="r">Teil A</th><th class="r">Teil B</th></tr>' + lzTable(R).map(r => '<tr><td>' + r.lz + ' ' + esc(LX.LZ[r.lz]) + '</td><td class="r">' + (r.aN ? r.aOk + '/' + r.aN : '–') + '</td><td class="r">' + (r.bN ? r.bOk + '/' + r.bN : '–') + '</td></tr>').join('') + '</table>';
    html += '<h2>Teil A im Detail</h2><table class="res">' + EXAM.tasksA.map((t, k) => '<tr><td class="' + (R.a[k] ? 'yes' : 'no') + '" style="width:28px">' + (R.a[k] ? '✓' : '✗') + '</td><td>' + t.text + '</td></tr>').join('') + '</table>';
    html += '<h2>Teil B im Detail</h2>';
    if (R.live) {
      html += R.b.map((x, k) => { const q = LX.examQ(x.id); return '<div class="qblock"><div class="qhead"><span>Frage ' + (k + 1) + ' – ' + (x.ok ? '<span class="yes">richtig</span>' : '<span class="no">falsch</span>') + '</span><span>Lernziel ' + q.lz + '</span></div>' + qHtml(q, App.ex.att, true) + '</div>'; }).join('');
    } else html += '<table class="res">' + R.b.map((x, k) => { const q = LX.examQ(x.id); return '<tr><td class="' + (x.ok ? 'yes' : 'no') + '" style="width:28px">' + (x.ok ? '✓' : '✗') + '</td><td>' + (q ? q.q : x.id) + '</td></tr>'; }).join('') + '</table>';
    html += '<h2>Als PDF speichern</h2><div class="namefield"><label for="pname">Name auf dem Nachweis</label><input id="pname" type="text" value="' + esc(name) + '" autocomplete="name"></div><p style="font-size:15px;color:var(--muted)">Im Druckdialog »Als PDF speichern« bzw. »Microsoft Print to PDF« wählen.</p>';
    html += '<div class="navrow" style="justify-content:flex-start"><button class="btn" type="button" id="printBtn">Ergebnis drucken / als PDF speichern</button><button class="btn quiet" type="button" id="againEx">' + (pass ? 'Zur Übersicht' : 'Neuer Versuch') + '</button></div></div></section>';
    $('#app').innerHTML = html;
    $('#pname').addEventListener('change', e => { App.st.name = e.target.value.trim(); save(); renderTop(); });
    $('#printBtn').addEventListener('click', () => { App.st.name = $('#pname').value.trim(); save(); printResult(R); });
    $('#againEx').addEventListener('click', () => { App.ex.phase = 'intro'; App.ex.att = null; renderExam(); window.scrollTo(0, 0); });
  }
  function printResult(R) {
    const aOk = R.a.filter(Boolean).length, bOk = R.b.filter(x => x.ok).length;
    const name = App.st.name || LX.SCORM.studentName() || '________________________';
    let h = '<h1>Kompetenznachweis „Shell Yeah!“ – Linux im Terminal</h1><div class="meta">' + esc(name) + '<br>Durchgeführt am ' + new Date(R.date).toLocaleString('de-DE') + '<br>Fachinformatik, Einstiegsklasse – SCORM-Lernpaket, Ubuntu-Simulation</div>';
    h += '<p class="verdict">Ergebnis: ' + R.s + ' % – ' + (R.s >= 70 ? 'bestanden' : 'nicht bestanden') + ' (Bestehensgrenze 70 %)</p>';
    h += '<table><tr><th>Teil</th><th>Leistung</th><th class="r">Prozent</th></tr><tr><td>A – Kundenauftrag am Server (21 Prüfpunkte)</td><td>' + aOk + ' / ' + R.a.length + '</td><td class="r">' + Math.round(100 * aOk / R.a.length) + ' %</td></tr><tr><td>B – Wissensfragen (12 aus Pool)</td><td>' + bOk + ' / ' + R.b.length + '</td><td class="r">' + Math.round(100 * bOk / Math.max(1, R.b.length)) + ' %</td></tr></table>';
    h += '<h2>Ergebnis nach Lernzielen</h2><table><tr><th>Lernziel</th><th class="r">Teil A</th><th class="r">Teil B</th></tr>' + lzTable(R).map(r => '<tr><td>LZ' + r.lz + ' ' + esc(LX.LZ[r.lz]) + '</td><td class="r">' + (r.aN ? r.aOk + '/' + r.aN : '–') + '</td><td class="r">' + (r.bN ? r.bOk + '/' + r.bN : '–') + '</td></tr>').join('') + '</table>';
    h += '<h2>Teil A – Prüfpunkte</h2><table>' + EXAM.tasksA.map((t, k) => '<tr><td style="width:18pt">' + (R.a[k] ? '✓' : '✗') + '</td><td>' + t.text + '</td></tr>').join('') + '</table>';
    h += '<h2>Teil B – Fragen</h2><table>' + R.b.map((x, k) => { const q = LX.examQ(x.id); return '<tr><td style="width:18pt">' + (x.ok ? '✓' : '✗') + '</td><td>' + (k + 1) + '. ' + (q ? q.q : x.id) + '</td></tr>'; }).join('') + '</table>';
    h += '<div class="sig"><div>Datum, Unterschrift Schüler:in</div><div>Datum, Unterschrift Lehrkraft</div></div>';
    $('#printArea').innerHTML = h;
    window.print();
  }

  // ---------- Start ----------
  function init() {
    LX.SCORM.init();
    App.st = loadState();
    App.tut.ci = App.st.t.ci; App.tut.li = App.st.t.li;
    buildTerm();
    $('#brand').addEventListener('click', () => go('home'));
    $$('.tab').forEach(t => t.addEventListener('click', () => go(t.dataset.view)));
    $('#treeBtn').addEventListener('click', () => { if ($('#drawer')) closeDrawer(); else openDrawer(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#drawer')) closeDrawer(); });
    if (App.st.e.best >= 0) LX.SCORM.result(App.st.e.best, App.st.e.att > 0);
    const loc = (App.st.loc || '');
    if (/^u:\d+$/.test(loc)) App.prac.i = Math.min(PRAC.length - 1, parseInt(loc.slice(2), 10));
    renderTop();
    go2('home');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
