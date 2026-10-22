/* Get-Going! – Anwendung: Start, Tutorial, Üben, Kompetenznachweis */
(function () {
'use strict';
const GG = globalThis.GG = globalThis.GG || {};
const UI = GG.UI, RN = GG.Runner, H = GG.H;
const esc = UI.esc, md = UI.md, inl = UI.inline;
const $ = (s, r) => (r || document).querySelector(s);
const lc = s => String(s == null ? '' : s).toLowerCase();
const CH = () => GG.COURSE.chapters;
const ALL = () => { const r = []; CH().forEach((c, ci) => c.lessons.forEach((l, li) => r.push({ ci, li, l }))); return r; };
const gidx = (ci, li) => { let n = 0; for (let k = 0; k < ci; k++) n += CH()[k].lessons.length; return n + li; };
const BANNER = ['Windows PowerShell', 'Copyright (C) Microsoft Corporation. Alle Rechte vorbehalten.', '', 'Installieren Sie die neueste PowerShell für neue Funktionen und Verbesserungen! https://aka.ms/PSWindows', ''];

const App = GG.App = {
  mode: null, ws: null, tut: null, ueb: null, exam: null,

  /* ================= Start ================= */
  init() {
    const data = GG.Scorm.init();
    this.P = Object.assign({ v: 1, td: '', tp: [0, 0], tq: {}, md: {}, mr: {}, eb: null, ep: false, ea: 0, el: null, seen: {} }, data || {});
    this.dialogs = new UI.Dialogs($('#modal-root'), this);
    this.term = new UI.Terminal($('#term'), this);
    this.notepad = new UI.Notepad($('#termwrap'), this);
    this.side = $('#side');
    // Farbschema
    let th = 'a'; try { th = localStorage.getItem('get-going-theme') || 'a'; } catch (e) { /* */ }
    this.setTheme(th);
    $('#themePick').onchange = ev => this.setTheme(ev.target.value);
    document.querySelectorAll('#modes button').forEach(b => b.onclick = () => this.go(b.dataset.mode));
    this.renderName();
    // Startbefehle
    const nav = (m, label) => ({ name: label, module: 'Get-Going', run: async ctx => { if (App.mode === 'exam' && App.exam && App.exam.phase !== 'result') { ctx.host.write('Während des Kompetenznachweises ist dieser Befehl gesperrt.', { color: 'Yellow' }); return []; } setTimeout(() => App.go(m), 30); return []; } });
    GG.builtinFns['start-tutorial'] = nav('tut', 'Start-Tutorial');
    GG.builtinFns['start-uebung'] = nav('ueb', 'Start-Uebung');
    GG.builtinFns['start-nachweis'] = nav('exam', 'Start-Nachweis');
    GG.builtinFns['show-kursbaum'] = { name: 'Show-Kursbaum', module: 'Get-Going', run: async () => { setTimeout(() => App.courseTree(), 30); return []; } };
    window.addEventListener('beforeunload', ev => { if (this.mode === 'exam' && this.exam && this.exam.phase !== 'result' && this.exam.phase !== 'intro') { ev.preventDefault(); ev.returnValue = ''; } });
    this.go('start');
  },
  setTheme(t) { document.body.dataset.theme = t; $('#themePick').value = t; try { localStorage.setItem('get-going-theme', t); } catch (e) { /* */ } setTimeout(() => this.term.resize(), 50); },
  renderName() { $('#student').textContent = GG.Scorm.name ? GG.Scorm.name.split(',').reverse().join(' ').trim() : ''; },
  save() { GG.Scorm.save(this.P); this.updateBadges(); },
  focusTerm() { if (!$('#modal-root').children.length && !(this.notepad && this.notepad.win)) this.term.focus(); },
  setSide(html) { this.side.innerHTML = html; this.side.scrollTop = 0; },
  updateBadges() {
    const all = ALL().length; const done = (this.P.td.match(/1/g) || []).length;
    $('#prog-tut').textContent = Math.round(done / all * 100) + ' %';
    const mdone = GG.MISSIONS.filter(m => this.P.mr[m.id]).length;
    $('#prog-ueb').textContent = mdone + '/' + GG.MISSIONS.length;
    $('#prog-exam').textContent = this.P.eb !== null && this.P.eb !== undefined ? this.P.eb + ' %' : '–';
  },

  async go(mode) {
    if (this.mode === 'exam' && mode !== 'exam' && this.exam && ['A', 'B'].includes(this.exam.phase)) {
      const ok = await this.dialogs.confirm('Kompetenznachweis abbrechen?', 'Wenn du den Nachweis jetzt verlässt, wird dieser Versuch **nicht gewertet** und der Serverzustand geht verloren.', 'Abbrechen und verlassen', 'Weiterarbeiten');
      if (!ok) return;
      this.exam = null;
    }
    if (this.notepad.win) await this.notepad.close(true);
    this.mode = mode;
    document.querySelectorAll('#modes button').forEach(b => b.classList.toggle('on', b.dataset.mode === mode));
    document.body.dataset.mode = mode;
    this.updateBadges();
    if (mode === 'start') return this.startHome();
    if (mode === 'tut') return this.startTut();
    if (mode === 'ueb') return this.startUeb();
    if (mode === 'exam') return this.startExam();
  },

  /* ================= Terminal & Sitzungen ================= */
  attach(st, kind) {
    this.term.reset();
    this.ws = { st, kind };
    st.onAdmin = sess => this.openAdminTab(sess, false);
    const t = this.term.addTab({ title: 'Windows PowerShell' });
    t.session = st.sessions.normal; st.sessions.normal.host = t.host;
    t.write(BANNER.join('\n'));
    this.loop(t);
    if (st.sessions.admin) this.openAdminTab(st.sessions.admin, false);
    this.term.switchTo(t);
    this.term.resize();
  },
  openAdminTab(sess, focus) {
    const t = this.term.addTab({ title: 'Administrator: Windows PowerShell', admin: true });
    t.session = sess; sess.host = t.host;
    t.write(BANNER.join('\n'));
    this.loop(t);
    if (focus === false) this.term.switchTo(this.term.tabs[0]);
    return t;
  },
  promptOf(s) { return s.remote ? `[${s.remote.ps.computer}]: PS ${s.remote.session.loc}> ` : `PS ${s.loc}> `; },
  async loop(t) {
    while (!t.closed) {
      let text = await t.read(this.promptOf(t.session), { cmd: true });
      if (t.closed) break;
      if (text === null) continue;
      while (GG.isIncomplete(text)) {
        const more = await t.read('>> ', { cmd: true, cont: true });
        if (more === null || t.closed) { text = null; break; }
        if (more === '') break;
        text += '\n' + more;
      }
      if (text === null || t.closed) continue;
      if (!text.trim()) continue;
      t.busy = true;
      let entry = null;
      try { entry = await GG.interp.runTop(t.session, text); }
      catch (e) { console.error(e); t.write('Interner Fehler der Simulation: ' + (e && e.message), { color: 'Red' }); }
      t.busy = false;
      if (t.closed) break;
      if (entry) this.afterCommand(t, entry);
    }
  },
  interrupt(t) { t.write('^C', { color: 'DarkGray' }); },
  async elevate(tab) {
    const st = this.ws && this.ws.st; if (!st) return false;
    const ok = await this.dialogs.uac('Windows PowerShell', 'Microsoft Windows');
    if (!ok) return false;
    if (st.sessions.admin) { const at = this.term.tabs.find(x => x.session === st.sessions.admin); if (at) { this.term.switchTo(at); return true; } }
    st.onAdmin = null;
    const sess = RN.ensureAdmin(st);
    st.onAdmin = s => this.openAdminTab(s, false);
    const t = this.openAdminTab(sess, true);
    this.term.switchTo(t);
    setTimeout(() => this.evaluate(), 20);
    return true;
  },
  newPlainTab(session) {
    const st = this.ws && this.ws.st; if (!st) return;
    const sess = new GG.Session(st.env.main, null, { elevated: !!session.elevated, loc: session.elevated ? 'C:\\Windows\\system32' : undefined });
    const t = this.term.addTab({ title: (session.elevated ? 'Administrator: ' : '') + 'Windows PowerShell', admin: !!session.elevated });
    t.session = sess; sess.host = t.host; t.write(BANNER.join('\n')); this.loop(t);
  },
  closeTab(t) {
    const st = this.ws && this.ws.st;
    if (st && st.sessions.admin === t.session) st.sessions.admin = null;
    this.term.removeTab(t);
  },
  exitShell(t) {
    if (t === this.term.tabs[0]) { t.write('Hinweis: Das Hauptfenster bleibt in dieser Simulation geöffnet.', { color: 'DarkGray' }); return; }
    setTimeout(() => this.closeTab(t), 10);
  },
  afterCommand(t, entry) {
    if (this.mode === 'tut' && this.tut) { this.tut.entries.push(entry); this.evaluate(); }
    else if (this.mode === 'ueb' && this.ueb && this.ueb.m) { this.ueb.entries.push(entry); this.evaluate(); }
    else if (this.mode === 'exam' && this.exam) { this.exam.entries.push(entry); }
  },
  afterNotepadSave(session, path) {
    const e = { line: 'notepad ' + path, cmds: [{ name: 'notepad', params: {}, ok: true, native: true, saved: path }], errors: [], out: [], ok: true };
    this.afterCommand(null, e);
  },
  evaluate() { if (this.mode === 'tut') this.checkLesson(); else if (this.mode === 'ueb') this.checkMission(); },

  /* Tab-Vervollständigung */
  completions(tab, before, word, quote) {
    const s0 = tab.session; const s = s0.remote ? s0.remote.session : s0;
    const ctx = GG.mkCtx(s, s.global, {});
    const seg = before.split(/[|;{(]/).pop();
    const segT = seg.trim();
    const uniq = a => Array.from(new Set(a));
    const byPrefix = (list, p) => list.filter(x => lc(x).startsWith(lc(p))).sort((a, b) => lc(a).localeCompare(lc(b)));
    if (word.startsWith('$')) {
      const names = GG.allVars(ctx).map(v => v.name);
      const p = word.slice(1);
      if (/^env:/i.test(p)) return byPrefix(Object.keys(GG.envAll ? GG.envAll(ctx) : {}).map(k => 'env:' + k), p).map(x => '$' + x);
      return byPrefix(uniq(names), p).map(n => '$' + n);
    }
    if (word.startsWith('-') && segT) {
      const cmdName = segT.split(/\s+/)[0];
      const r = GG.interp.resolveCommand(cmdName, ctx);
      if (r && r.kind === 'cmdlet') {
        const ps = r.spec.params.map(p => p.name).concat((r.spec.noCommon ? [] : GG.COMMON.map(c => c.name))).concat(r.spec.sp ? ['WhatIf', 'Confirm'] : []);
        return byPrefix(uniq(ps), word.slice(1)).map(n => '-' + n);
      }
      if (r && r.kind === 'function' && r.fn.def) return byPrefix((r.fn.def.params || []).map(p => p.name), word.slice(1)).map(n => '-' + n);
      if (r && r.kind === 'script') { try { const ast = GG.parse(r.node.content || ''); return byPrefix(((ast.params) || []).map(p => p.name), word.slice(1)).map(n => '-' + n); } catch (e) { return []; } }
      return [];
    }
    const isCmdPos = !segT || /^[.&]$/.test(segT);
    if (isCmdPos && !/[\\/:]/.test(word) && !word.startsWith('.')) {
      const names = Object.values(GG.cmdlets).filter(c => GG.cmdletAvailable(c, ctx)).map(c => c.name)
        .concat(Object.values(GG.builtinFns || {}).map(f => f.name));
      for (let sc = s.global; sc; sc = sc.parent) for (const f of sc.fns.values()) names.push(f.name);
      const nat = Object.keys(GG.natives || {}).map(n => n + '.exe');
      const cmds = byPrefix(uniq(names), word);
      return cmds.length ? cmds : byPrefix(nat, word);
    }
    return this.pathCompletions(ctx, word, quote, isCmdPos);
  },
  pathCompletions(ctx, word, quote) {
    const m = /^(.*[\\/])?([^\\/]*)$/.exec(word);
    const dir = m[1] || ''; const pre = m[2];
    let r; try { r = GG.fsx.resolve(ctx, dir || '.'); } catch (e) { return []; }
    if (!r || r.error) return [];
    const node = GG.fsx.node(r);
    if (!node || !node.children) return [];
    const kids = Array.from(node.children.values()).filter(k => !k.hidden && lc(k.name).startsWith(lc(pre)));
    kids.sort((a, b) => (b.dir - a.dir) || lc(a.name).localeCompare(lc(b.name)));
    return kids.map(k => {
      let p = (dir || (/^(HKLM|HKCU):/i.test(word) ? '' : '.\\')) + k.name;
      if (/\s/.test(p)) p = "'" + p.replace(/^['"]/, '') + "'";
      return p;
    });
  },

  /* ================= Startseite ================= */
  startHome() {
    const st = RN.makeState(GG.buildKorbwerk(), null);
    this.attach(st, 'start');
    const t = this.term.tabs[0];
    t.write('Willkommen bei Get-Going! – PowerShell für Fachinformatiker\n', { color: 'Yellow' });
    t.write('Tippe einen der Befehle ein oder klicke links:');
    t.write('  Start-Tutorial   ', { color: 'Yellow', nonl: true }); t.write('Schritt für Schritt lernen');
    t.write('  Start-Uebung     ', { color: 'Yellow', nonl: true }); t.write('Missionen auf einem frischen Server');
    t.write('  Start-Nachweis   ', { color: 'Yellow', nonl: true }); t.write('Kompetenznachweis bei der Schreinerei Maier');
    t.write('  Show-Kursbaum    ', { color: 'Yellow', nonl: true }); t.write('Überblick über alle Kapitel\n');
    t.write('Dieser Server ist eine Spielwiese: Probier ruhig Get-Date, Get-Service oder Get-Help aus.', { color: 'DarkGray' });
    t.write('');
    const all = ALL().length; const done = (this.P.td.match(/1/g) || []).length;
    const pos = this.P.tp || [0, 0];
    this.setSide(`<div class="home">
      <h1>Get-Going!</h1>
      <p class="lead">Lerne die Windows PowerShell so, wie sie im Betrieb gebraucht wird: auf einem simulierten <strong>Windows Server 2025</strong> mit <strong>Windows PowerShell 5.1</strong>, mitten in einem echten Arbeitsalltag.</p>
      <p>Du bist neu bei <strong>Korbwerk IT-Service</strong>. Deine Ausbilderin Mira Hofmann übergibt dir den Dateiserver KORB-SRV02 – und die Altlasten des Ex-Admins Kalle.</p>
      <div class="cards">
        <button class="card" data-go="tut"><span class="num">①</span><span class="ct">Tutorial</span><span class="cd">10 Kapitel, ${all} Lektionen mit Aufgaben im Terminal und Kurz-Checks.</span><span class="cp">${done ? `Fortschritt ${Math.round(done / all * 100)} % · weiter bei ${esc(CH()[pos[0]] ? (CH()[pos[0]].lessons[pos[1]] || {}).id || '' : '')}` : 'Hier anfangen'}</span></button>
        <button class="card" data-go="ueb"><span class="num">②</span><span class="ct">Üben</span><span class="cd">10 Missionen ohne Anleitung – mit gestuften Tipps und Reflexionsfrage.</span><span class="cp">${GG.MISSIONS.filter(m => this.P.mr[m.id]).length} von ${GG.MISSIONS.length} abgeschlossen</span></button>
        <button class="card" data-go="exam"><span class="num">③</span><span class="ct">Kompetenznachweis</span><span class="cd">21 Praxisaufgaben am Kundenserver und 12 Fragen. Bestanden ab 70 %.</span><span class="cp">${this.P.eb !== null && this.P.eb !== undefined ? 'Bestes Ergebnis: ' + this.P.eb + ' %' + (this.P.ep ? ' – bestanden' : '') : 'noch nicht versucht'}</span></button>
      </div>
      <h2>Lernziele</h2>
      <ol class="lz">${CH().map(c => `<li><strong>${esc(c.title)}</strong> – ${esc(c.goal)}</li>`).join('')}</ol>
      <p class="small">Bedienung: Klicke ins Terminal und tippe. <kbd>Tab</kbd> vervollständigt, <kbd>↑</kbd>/<kbd>↓</kbd> blättern im Verlauf, Rechtsklick fügt ein bzw. kopiert eine Markierung. Für ein bestimmtes Fenster eignet sich ein PC oder Laptop mit großem Bildschirm.</p>
    </div>`);
    this.side.querySelectorAll('[data-go]').forEach(b => b.onclick = () => this.go(b.dataset.go));
    this.focusTerm();
  },

  /* ================= Tutorial ================= */
  async startTut() {
    const pos = this.P.tp || [0, 0];
    let [ci, li] = pos; if (!CH()[ci]) { ci = 0; li = 0; }
    if (li >= CH()[ci].lessons.length) li = 0;
    await this.loadLesson(ci, li, true);
  },
  async busy(text, fn) {
    const o = document.createElement('div'); o.className = 'busy'; o.innerHTML = `<div class="busy-box"><span class="spin"></span>${esc(text)}</div>`;
    document.body.appendChild(o);
    await new Promise(r => setTimeout(r, 30));
    try { return await fn(); } finally { o.remove(); }
  },
  async loadLesson(ci, li, replay) {
    if (replay) {
      const st = await this.busy('Server wird vorbereitet …', () => RN.replayTutorial(ci, li));
      this.tut = { ci, li, st, entries: [], answer: '', hint: 0, passed: false, quiz: null };
      this.attach(st, 'tut');
    } else {
      Object.assign(this.tut, { ci, li, entries: [], answer: '', hint: 0, passed: false, quiz: null });
    }
    this.P.tp = [ci, li]; this.save();
    this.renderLesson();
    const key = 'ch' + ci;
    if (li === 0 && !this.P.seen[key]) { this.P.seen[key] = 1; this.save(); await this.dialogs.mira(CH()[ci].mira); }
    if (this.isDone(ci, li)) { /* bereits erledigt – trotzdem neu prüfbar */ }
    this.focusTerm();
  },
  isDone(ci, li) { return this.P.td[gidx(ci, li)] === '1'; },
  setDone(ci, li, v) {
    const i = gidx(ci, li); let s = this.P.td.padEnd(ALL().length, '0');
    if (s[i] === '1' && v === '2') return;
    s = s.slice(0, i) + v + s.slice(i + 1); this.P.td = s.replace(/0+$/, ''); this.save();
  },
  lessonStatus(ci, li) { const c = this.P.td[gidx(ci, li)]; return c === '1' ? 'done' : c === '2' ? 'skip' : 'open'; },
  renderLesson() {
    const T = this.tut; const ch = CH()[T.ci]; const L = ch.lessons[T.li];
    const all = ALL().length; const done = (this.P.td.match(/1/g) || []).length;
    const st = this.lessonStatus(T.ci, T.li);
    this.setSide(`<div class="lesson">
      <div class="crumbs"><button class="link tree">Kursbaum</button><span>Kapitel ${T.ci + 1} von ${CH().length} · ${esc(ch.title)}</span></div>
      <div class="pbar" title="${done} von ${all} Lektionen erledigt"><span style="width:${done / all * 100}%"></span></div>
      <h2><span class="lid">${esc(L.id)}</span> ${esc(L.title)}</h2>
      <div class="ltext">${md(L.text)}</div>
      <div class="task ${T.passed ? 'ok' : ''}">
        <div class="task-h"><span>Aufgabe</span>${L.admin ? '<span class="badge adm" title="Für diese Aufgabe brauchst du den Admin-Tab">Admin-Tab</span>' : ''}${st === 'done' && !T.passed ? '<span class="badge">schon einmal gelöst</span>' : ''}</div>
        <div class="task-t">${inl(L.task)}</div>
        ${L.answer ? `<div class="answer"><label>${esc(L.answer)}<input type="text" id="ans" autocomplete="off" spellcheck="false" value="${esc(T.answer)}"></label><button class="btn" id="ansBtn">Prüfen</button></div><div class="ansmsg" id="ansMsg"></div>` : ''}
        <div class="task-s" id="taskS">${T.passed ? '✓ Geschafft!' : '○ Noch offen – die Prüfung läuft automatisch nach jedem Befehl.'}</div>
      </div>
      ${T.passed && L.after ? `<div class="after">${inl(L.after)}</div>` : ''}
      <div class="help" id="helpBox">${this.helpHtml(L, T.hint)}</div>
      <div class="actions">
        <button class="btn" id="bHint">${T.hint === 0 ? 'Tipp' : T.hint === 1 ? 'Lösung zeigen' : 'Lösung ausblenden'}</button>
        <button class="btn" id="bReset" title="Server auf den Stand vor dieser Lektion zurücksetzen">Zurücksetzen</button>
        <button class="btn" id="bSkip" title="Musterlösung ausführen und weitergehen">Überspringen</button>
        <span class="grow"></span>
        <button class="btn" id="bPrev" ${T.ci === 0 && T.li === 0 ? 'disabled' : ''}>← Zurück</button>
        <button class="btn ${T.passed ? 'primary' : ''}" id="bNext" ${T.passed || st !== 'open' ? '' : 'disabled'}>Weiter →</button>
      </div>
    </div>`);
    const s = this.side;
    s.querySelector('.tree').onclick = () => this.courseTree();
    s.querySelector('#bHint').onclick = () => { T.hint = (T.hint + 1) % 3; s.querySelector('#helpBox').innerHTML = this.helpHtml(L, T.hint); s.querySelector('#bHint').textContent = T.hint === 0 ? 'Tipp' : T.hint === 1 ? 'Lösung zeigen' : 'Lösung ausblenden'; this.bindSolution(); };
    s.querySelector('#bReset').onclick = () => this.loadLesson(T.ci, T.li, true);
    s.querySelector('#bSkip').onclick = () => this.skipLesson();
    s.querySelector('#bPrev').onclick = () => { const p = this.prevPos(T.ci, T.li); if (p) this.loadLesson(p[0], p[1], true); };
    s.querySelector('#bNext').onclick = () => this.nextLesson();
    if (L.answer) {
      const inp = s.querySelector('#ans');
      const go = () => { T.answer = inp.value; const ok = this.checkLesson(true); if (!ok) { s.querySelector('#ansMsg').textContent = 'Das stimmt noch nicht' + (L.solution.some(x => typeof x === 'string' || x.a) && !T.entries.length ? ' – führe zuerst den passenden Befehl aus.' : '.'); } };
      s.querySelector('#ansBtn').onclick = go;
      inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') go(); });
    }
    this.bindSolution();
  },
  helpHtml(L, level) {
    if (level === 0) return '';
    let h = `<div class="hint"><strong>Tipp:</strong> ${inl(L.hint)}</div>`;
    if (level === 2) h += '<div class="sol"><strong>Musterlösung</strong>' + this.solutionHtml(L.solution) + '</div>';
    return h;
  },
  solutionHtml(steps) {
    return '<ol class="steps">' + steps.map(s => {
      if (typeof s === 'string') return `<li><code class="cmd">${esc(s)}</code><button class="ins" data-cmd="${esc(s)}" title="In die Eingabezeile übernehmen">einfügen</button></li>`;
      if (s.a) return `<li><span class="badge adm">Admin-Tab</span> <code class="cmd">${esc(s.a)}</code><button class="ins" data-admin="1" data-cmd="${esc(s.a)}" title="In die Eingabezeile übernehmen">einfügen</button></li>`;
      if (s.np) return `<li>Im Editor <code>${esc(s.np.file)}</code> anlegen (<code>notepad ${esc(s.np.file)}</code>), Inhalt:<pre class="code">${esc(s.np.content)}</pre>speichern mit <kbd>Strg</kbd>+<kbd>S</kbd></li>`;
      if (s.ans !== undefined) return `<li>Antwort: <code>${esc(s.ans)}</code></li>`;
      return '';
    }).join('') + '</ol>';
  },
  bindSolution() {
    this.side.querySelectorAll('.ins').forEach(b => b.onclick = () => {
      let t = this.term.active;
      if (b.dataset.admin) { const at = this.term.tabs.find(x => x.admin); if (at) { this.term.switchTo(at); t = at; } }
      else { const nt = this.term.tabs[0]; if (t && t.admin) { this.term.switchTo(nt); t = nt; } }
      if (t && t.inp) { t.inp.text = b.dataset.cmd; t.inp.cur = t.inp.text.length; this.term.syncInput(t); t.render(); }
      this.focusTerm();
    });
  },
  checkLesson(fromAnswer) {
    const T = this.tut; if (!T) return false;
    const L = CH()[T.ci].lessons[T.li];
    if (T.passed) return true;
    const ok = RN.check(T.st, L, T.entries, T.answer);
    if (ok) {
      T.passed = true; this.setDone(T.ci, T.li, '1');
      this.renderLesson();
      const nb = this.side.querySelector('#bNext'); if (nb && fromAnswer) nb.focus();
    }
    return ok;
  },
  prevPos(ci, li) { if (li > 0) return [ci, li - 1]; if (ci > 0) return [ci - 1, CH()[ci - 1].lessons.length - 1]; return null; },
  async nextLesson() {
    const T = this.tut; const ch = CH()[T.ci];
    if (T.li + 1 < ch.lessons.length) return this.loadLesson(T.ci, T.li + 1, false);
    return this.showQuiz();
  },
  async skipLesson() {
    const T = this.tut; const L = CH()[T.ci].lessons[T.li];
    if (!T.passed) {
      const ok = await this.dialogs.confirm('Lektion überspringen?', 'Die Musterlösung wird im Hintergrund ausgeführt, damit der Server für die nächsten Lektionen stimmt. Die Lektion zählt als **übersprungen**.', 'Überspringen', 'Abbrechen');
      if (!ok) return;
      const silent = new RN.SilentHost(); silent.onElevate = () => RN.ensureAdmin(T.st);
      for (const s of L.solution) await RN.step(T.st, s, silent);
      // Hosts der Sitzungen zurücksetzen (Admin-Tab ggf. neu)
      this.term.tabs.forEach(t => { if (t.session) t.session.host = t.host; });
      this.setDone(T.ci, T.li, '2');
      this.term.tabs[0].write('# Lektion ' + L.id + ' übersprungen – die Musterlösung wurde ausgeführt.', { color: 'DarkGray' });
    }
    this.nextLesson();
  },
  /* Kurz-Check */
  showQuiz() {
    const T = this.tut; const ch = CH()[T.ci];
    T.quiz = { answers: {}, done: false };
    const qs = ch.quiz;
    this.setSide(`<div class="lesson quiz">
      <div class="crumbs"><button class="link tree">Kursbaum</button><span>Kapitel ${T.ci + 1} · ${esc(ch.title)}</span></div>
      <h2>Kurz-Check</h2><p>Vier Fragen zum Kapitel. Wähle jeweils die beste Antwort.</p>
      ${qs.map((q, i) => `<fieldset class="q" data-i="${i}"><legend>${i + 1}. ${inl(q.q)}</legend>${q.o.map((o, k) => `<label class="opt"><input type="radio" name="q${i}" value="${k}"> <span>${inl(o)}</span></label>`).join('')}<div class="qe"></div></fieldset>`).join('')}
      <div class="actions"><button class="btn" id="qBack">← Zurück zur letzten Lektion</button><span class="grow"></span><button class="btn primary" id="qEval">Auswerten</button></div>
    </div>`);
    const s = this.side;
    s.querySelector('.tree').onclick = () => this.courseTree();
    s.querySelector('#qBack').onclick = () => this.loadLesson(T.ci, ch.lessons.length - 1, false);
    s.querySelector('#qEval').onclick = () => {
      if (T.quiz.done) return this.nextChapter();
      let score = 0;
      qs.forEach((q, i) => {
        const fs = s.querySelector(`fieldset[data-i="${i}"]`); const v = fs.querySelector('input:checked');
        const ok = v && +v.value === q.c; if (ok) score++;
        fs.classList.add(ok ? 'right' : 'wrong');
        fs.querySelector('.qe').innerHTML = (ok ? '<strong>Richtig.</strong> ' : `<strong>Nicht ganz.</strong> Richtig ist: „${inl(q.o[q.c])}“. `) + inl(q.e || '');
        fs.querySelectorAll('input').forEach(x => x.disabled = true);
      });
      T.quiz.done = true;
      this.P.tq[ch.id] = Math.max(this.P.tq[ch.id] || 0, score); this.save();
      const btn = s.querySelector('#qEval'); btn.textContent = T.ci + 1 < CH().length ? `Weiter zu Kapitel ${T.ci + 2} →` : 'Tutorial abschließen';
      const sum = document.createElement('p'); sum.className = 'qsum'; sum.textContent = `${score} von ${qs.length} richtig.`; btn.parentNode.parentNode.insertBefore(sum, btn.parentNode);
    };
  },
  async nextChapter() {
    const T = this.tut;
    if (T.ci + 1 >= CH().length) return this.tutFinished();
    const ci = T.ci + 1; const ch = CH()[ci];
    if (ch.onEnter) ch.onEnter(T.st.env, T.st);
    this.tut.ci = ci;
    await this.loadLesson(ci, 0, false);
  },
  tutFinished() {
    const all = ALL(); const done = all.filter(x => this.isDone(x.ci, x.li)).length; const skip = all.filter(x => this.lessonStatus(x.ci, x.li) === 'skip').length;
    this.setSide(`<div class="lesson"><h2>Tutorial abgeschlossen 🎉</h2><p>Du hast ${done} von ${all.length} Lektionen selbst gelöst${skip ? ` und ${skip} übersprungen` : ''}.</p>
      <p>Mira: „Starke Leistung! Jetzt zeig in den Missionen, dass du es auch ohne Anleitung kannst.“</p>
      <div class="actions"><button class="btn" id="tTree">Kursbaum</button><span class="grow"></span><button class="btn primary" id="tUeb">Zu den Missionen →</button></div></div>`);
    this.side.querySelector('#tTree').onclick = () => this.courseTree();
    this.side.querySelector('#tUeb').onclick = () => this.go('ueb');
  },
  /* Kursbaum im Stil von „tree“ */
  courseTree() {
    const lines = [];
    lines.push('<span class="tr-root">C:\\Kurs\\Get-Going</span>');
    CH().forEach((c, ci) => {
      const lastC = ci === CH().length - 1;
      const q = this.P.tq[c.id];
      lines.push(`${lastC ? '└───' : '├───'}<span class="tr-ch">${String(ci + 1).padStart(2, ' ')} ${esc(c.title)}</span>${q !== undefined ? ` <span class="tr-q">Kurz-Check ${q}/4</span>` : ''}`);
      c.lessons.forEach((l, li) => {
        const lastL = li === c.lessons.length - 1;
        const s = this.lessonStatus(ci, li);
        const mark = s === 'done' ? '<span class="ok">✓</span>' : s === 'skip' ? '<span class="sk">»</span>' : '<span class="op">○</span>';
        lines.push(`${lastC ? '    ' : '│   '}${lastL ? '└───' : '├───'}${mark} <button class="tr-l" data-ci="${ci}" data-li="${li}">${esc(l.id)} ${esc(l.title)}</button>`);
      });
    });
    const w = this.dialogs.open(`<div class="dlg-title">Kursbaum – PS C:\\Kurs&gt; tree /F</div><div class="dlg-body"><pre class="tree">${lines.join('\n')}</pre><p class="small"><span class="ok">✓</span> gelöst · <span class="sk">»</span> übersprungen · <span class="op">○</span> offen. Ein Klick springt zur Lektion – der Server wird dafür passend vorbereitet.</p></div><div class="dlg-btns"><button class="btn primary close">Schließen</button></div>`, 'dlg wide');
    w.querySelector('.close').onclick = () => this.dialogs.close(w);
    w.querySelectorAll('.tr-l').forEach(b => b.onclick = async () => {
      this.dialogs.close(w);
      if (this.mode !== 'tut') { this.mode = 'tut'; document.querySelectorAll('#modes button').forEach(x => x.classList.toggle('on', x.dataset.mode === 'tut')); document.body.dataset.mode = 'tut'; }
      await this.loadLesson(+b.dataset.ci, +b.dataset.li, true);
    });
  },

  /* ================= Üben ================= */
  startUeb() {
    this.ueb = { m: null };
    const st = RN.makeState(GG.buildKorbwerk(), null);
    this.attach(st, 'ueb-list');
    this.renderMissionList();
  },
  renderMissionList() {
    this.setSide(`<div class="lesson"><h2>Üben: Missionen</h2><p>Jede Mission läuft auf einem <strong>frischen Server</strong>. Es gibt keine Schritt-für-Schritt-Anleitung – nur Miras Auftrag, Prüfpunkte, die sich live abhaken, und bis zu drei Tipps.</p>
      <div class="mlist">${GG.MISSIONS.map((m, i) => { const ch = CH().find(c => c.id === m.ch); const d = (this.P.md[m.id] || ''); const n = (d.match(/1/g) || []).length; return `<button class="mcard ${this.P.mr[m.id] ? 'done' : ''}" data-i="${i}"><span class="mn">Mission ${i + 1}</span><span class="mt">${esc(m.title)}</span><span class="ml">${esc(ch.lz)} · ${esc(ch.short)}</span><span class="ms">${this.P.mr[m.id] ? '✓ abgeschlossen' : n ? n + '/' + m.cps.length + ' Prüfpunkte' : 'offen'}</span></button>`; }).join('')}</div></div>`);
    this.side.querySelectorAll('.mcard').forEach(b => b.onclick = () => this.startMission(+b.dataset.i));
  },
  async startMission(i) {
    const m = GG.MISSIONS[i];
    const env = GG.Missions.env(m);
    const st = RN.makeState(env, null); st.answers = {};
    this.ueb = { m, i, st, entries: [], answers: {}, hint: 0, state: m.cps.map(() => false), phase: 'run' };
    this.attach(st, 'ueb');
    this.renderMission();
    await this.dialogs.mira(m.story);
    this.focusTerm();
  },
  renderMission() {
    const U = this.ueb, m = U.m; const ch = CH().find(c => c.id === m.ch);
    const allOk = U.state.every(Boolean);
    this.setSide(`<div class="lesson mission">
      <div class="crumbs"><button class="link back">← Alle Missionen</button><span>Mission ${U.i + 1} · ${esc(ch.lz)} ${esc(ch.short)}</span></div>
      <h2>${esc(m.title)}</h2>
      <div class="story">${m.story.split('\n').map(l => l ? '<p>' + inl(l) + '</p>' : '').join('')}</div>
      <h3>Prüfpunkte</h3>
      <ul class="cps">${m.cps.map((cp, k) => `<li class="${U.state[k] ? 'ok' : ''}"><span class="mk">${U.state[k] ? '✓' : '○'}</span><div><div>${inl(cp.text)}</div>${cp.answer ? `<div class="answer sm"><input type="text" data-cp="${cp.id}" placeholder="${esc(cp.answer)}" value="${esc(U.answers[cp.id] || '')}" autocomplete="off" spellcheck="false" ${U.state[k] ? 'disabled' : ''}><button class="btn" data-cpb="${cp.id}" ${U.state[k] ? 'disabled' : ''}>Prüfen</button></div>` : ''}</div></li>`).join('')}</ul>
      <div class="help">${m.hints.slice(0, U.hint).map((h, k) => `<div class="hint"><strong>Tipp ${k + 1}:</strong> ${inl(h)}</div>`).join('')}</div>
      ${U.phase === 'reflect' || U.phase === 'done' ? `<div class="reflect"><h3>Reflexion</h3><p>${inl(m.reflect.q)}</p><textarea id="refl" rows="5" placeholder="Deine Antwort …">${esc(U.refl || '')}</textarea>${U.phase === 'done' ? `<div class="model"><strong>Musterantwort:</strong> ${inl(m.reflect.model)}</div>` : '<button class="btn primary" id="bModel">Musterantwort zeigen</button>'}</div>` : ''}
      <div class="actions">
        <button class="btn" id="bTip" ${U.hint >= m.hints.length ? 'disabled' : ''}>Tipp ${Math.min(U.hint + 1, m.hints.length)} von ${m.hints.length}</button>
        <button class="btn" id="bRestart">Neu starten</button>
        <span class="grow"></span>
        ${allOk && U.phase === 'run' ? '<button class="btn primary" id="bFinish">Mission abschließen →</button>' : ''}
        ${U.phase === 'done' && U.i + 1 < GG.MISSIONS.length ? '<button class="btn primary" id="bNextM">Nächste Mission →</button>' : ''}
      </div></div>`);
    const s = this.side;
    s.querySelector('.back').onclick = () => this.startUeb();
    s.querySelector('#bTip').onclick = () => { U.hint = Math.min(m.hints.length, U.hint + 1); this.renderMission(); };
    s.querySelector('#bRestart').onclick = async () => { if (await this.dialogs.confirm('Mission neu starten?', 'Der Server wird auf den Ausgangszustand zurückgesetzt.', 'Neu starten', 'Abbrechen')) this.startMission(U.i); };
    s.querySelectorAll('[data-cpb]').forEach(b => b.onclick = () => { const id = b.dataset.cpb; U.answers[id] = s.querySelector(`input[data-cp="${id}"]`).value; this.checkMission(); });
    s.querySelectorAll('input[data-cp]').forEach(i => i.addEventListener('keydown', ev => { if (ev.key === 'Enter') { U.answers[i.dataset.cp] = i.value; this.checkMission(); } }));
    const f = s.querySelector('#bFinish'); if (f) f.onclick = () => { U.phase = 'reflect'; this.renderMission(); const r = s.querySelector('#refl'); if (r) r.focus(); };
    const bm = s.querySelector('#bModel'); if (bm) bm.onclick = () => { U.refl = s.querySelector('#refl').value; U.phase = 'done'; this.P.mr[m.id] = 1; this.save(); this.renderMission(); };
    const nm = s.querySelector('#bNextM'); if (nm) nm.onclick = () => this.startMission(U.i + 1);
    const ta = s.querySelector('#refl'); if (ta) ta.oninput = () => { U.refl = ta.value; };
  },
  checkMission() {
    const U = this.ueb; if (!U || !U.m) return;
    U.st.answers = U.answers;
    const res = U.m.cps.map((cp, k) => U.state[k] || RN.check(U.st, cp, U.entries, U.answers[cp.id] || ''));
    const changed = res.some((v, k) => v !== U.state[k]);
    U.state = res;
    this.P.md[U.m.id] = res.map(x => x ? 1 : 0).join(''); if (changed) this.save();
    if (changed) this.renderMission();
  },

  /* ================= Kompetenznachweis ================= */
  startExam() {
    this.exam = { phase: 'intro' };
    const st = RN.makeState(GG.buildKorbwerk(), null);
    this.attach(st, 'exam-intro');
    this.term.tabs[0].write('Der Kompetenznachweis beginnt, sobald du links auf „Nachweis starten“ klickst.', { color: 'DarkGray' });
    const nm = GG.Scorm.name;
    this.setSide(`<div class="lesson exam">
      <h2>Kompetenznachweis</h2>
      <p>Der Nachweis besteht aus zwei Teilen, die je <strong>50 %</strong> zählen. <strong>Bestanden ab 70 %.</strong></p>
      <ul><li><strong>Teil A – Praxis:</strong> 21 Aufgaben am Server MAIER-SRV01 der Schreinerei Maier, freie Reihenfolge, ohne Tipps. Get-Help darfst du benutzen. Bewertet wird beim Abgeben.</li>
      <li><strong>Teil B – Fragen:</strong> 12 Fragen aus allen Lernzielen (Auswahl, Terminal-Bilder, Klick-Fragen, Zuordnungen, Zahlen).</li></ul>
      <p class="warn">Der Nachweis muss <strong>in einer Sitzung</strong> abgeschlossen werden. Wer zwischendurch die Seite verlässt oder neu lädt, beginnt von vorn.</p>
      ${GG.Scorm.lms && nm ? `<p>Teilnehmer/in: <strong>${esc(nm)}</strong></p>` : `<label class="fld">Dein Name (für das Ergebnisblatt)<input type="text" id="exName" value="${esc(nm)}" autocomplete="name"></label>`}
      ${this.P.eb !== null && this.P.eb !== undefined ? `<p>Bisher bestes Ergebnis: <strong>${this.P.eb} %</strong>${this.P.ep ? ' (bestanden)' : ''} · Versuche: ${this.P.ea}</p>` : ''}
      <div class="actions"><span class="grow"></span><button class="btn primary" id="exStart">Nachweis starten</button></div></div>`);
    this.side.querySelector('#exStart').onclick = () => {
      const n = this.side.querySelector('#exName'); if (n) { if (!n.value.trim()) { n.focus(); n.classList.add('err'); return; } GG.Scorm.setName(n.value.trim()); this.renderName(); }
      this.examA();
    };
  },
  async examA() {
    const env = GG.buildMaier();
    const st = RN.makeState(env, null);
    this.exam = { phase: 'A', st, entries: [], notes: {}, t0: Date.now(), answersB: {}, qB: null };
    this.P.ea = (this.P.ea || 0) + 1; this.save();
    this.attach(st, 'exam');
    this.renderExamA();
    await this.dialogs.mira(GG.EXAM.briefing.replace(/\*\*/g, '') + '\n\nViel Erfolg!\nMira');
    this.focusTerm();
  },
  renderExamA() {
    const E = this.exam;
    this.setSide(`<div class="lesson exam">
      <div class="crumbs"><span>Kompetenznachweis · Teil A (Praxis)</span></div>
      <h2>Arbeitsauftrag Schreinerei Maier</h2>
      <div class="story">${md(GG.EXAM.briefing)}</div>
      <ol class="tasks">${GG.EXAM.partA.map(a => `<li><label><input type="checkbox" data-n="${a.id}" ${E.notes[a.id] ? 'checked' : ''}> <span class="aid">${a.id}</span> <span>${inl(a.text)}</span></label></li>`).join('')}</ol>
      <p class="small">Die Häkchen sind nur deine Notizen – bewertet wird der tatsächliche Zustand der Server beim Abgeben.</p>
      <div class="actions"><span class="grow"></span><button class="btn primary" id="aDone">Teil A abgeben →</button></div></div>`);
    this.side.querySelectorAll('input[data-n]').forEach(c => c.onchange = () => { E.notes[c.dataset.n] = c.checked; });
    this.side.querySelector('#aDone').onclick = async () => {
      if (!(await this.dialogs.confirm('Teil A abgeben?', 'Danach kannst du am Server nichts mehr ändern. Weiter geht es mit Teil B (12 Fragen).', 'Abgeben', 'Weiterarbeiten'))) return;
      E.resA = GG.EXAM.partA.map(a => RN.check(E.st, a, E.entries, ''));
      this.examB();
    };
  },
  examB() {
    const E = this.exam; E.phase = 'B';
    E.qB = GG.EXAM.drawB(); E.qi = 0;
    if (this.notepad.win) this.notepad.close(true);
    this.term.reset();
    const t = this.term.addTab({ title: 'Windows PowerShell' });
    t.write('Teil A ist abgegeben. Der Server ist gesperrt – Teil B wird links bearbeitet.', { color: 'DarkGray' });
    this.renderExamB();
  },
  renderExamB() {
    const E = this.exam; const q = E.qB[E.qi]; const a = E.answersB[q.id];
    let body = '';
    if (q.term) body += `<pre class="tshot">${esc(q.term)}</pre>`;
    if (q.type === 'mc' || q.type === 'term') body += q.o.map((o, k) => `<label class="opt"><input type="radio" name="b" value="${k}" ${a === k ? 'checked' : ''}> <span>${inl(o)}</span></label>`).join('');
    if (q.type === 'hotspot') body += `<div class="hs">${q.tokens.map((t, k) => `<button class="tok ${a === k ? 'sel' : ''}" data-k="${k}">${esc(t)}</button>`).join(' ')}</div>`;
    if (q.type === 'num') body += `<label class="fld">Zahl<input type="text" id="bNum" inputmode="numeric" value="${esc(a == null ? '' : a)}" autocomplete="off"></label>`;
    if (q.type === 'match') {
      if (!E.shuf) E.shuf = {};
      if (!E.shuf[q.id]) { const r = q.pairs.map(p => p[1]); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } E.shuf[q.id] = r; }
      body += '<table class="match">' + q.pairs.map((p, k) => `<tr><td><code>${esc(p[0])}</code></td><td><select data-k="${k}"><option value="">– wählen –</option>${E.shuf[q.id].map(r => `<option ${a && a[k] === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></td></tr>`).join('') + '</table>';
    }
    const answered = E.qB.filter(x => E.answersB[x.id] !== undefined && E.answersB[x.id] !== '').length;
    this.setSide(`<div class="lesson exam">
      <div class="crumbs"><span>Kompetenznachweis · Teil B · Frage ${E.qi + 1} von ${E.qB.length}</span><span class="grow"></span><span>${answered} beantwortet</span></div>
      <div class="qnav">${E.qB.map((x, k) => `<button class="qn ${k === E.qi ? 'on' : ''} ${E.answersB[x.id] !== undefined && E.answersB[x.id] !== '' ? 'ans' : ''}" data-k="${k}">${k + 1}</button>`).join('')}</div>
      <h3 class="bq">${inl(q.q)}</h3>${body}
      <div class="actions"><button class="btn" id="bPrevQ" ${E.qi === 0 ? 'disabled' : ''}>← Zurück</button><span class="grow"></span>
      ${E.qi + 1 < E.qB.length ? '<button class="btn primary" id="bNextQ">Weiter →</button>' : '<button class="btn primary" id="bSubmit">Nachweis abgeben</button>'}</div></div>`);
    const s = this.side;
    s.querySelectorAll('input[name="b"]').forEach(r => r.onchange = () => { E.answersB[q.id] = +r.value; });
    s.querySelectorAll('.tok').forEach(b => b.onclick = () => { E.answersB[q.id] = +b.dataset.k; s.querySelectorAll('.tok').forEach(x => x.classList.toggle('sel', x === b)); });
    const num = s.querySelector('#bNum'); if (num) num.oninput = () => { E.answersB[q.id] = num.value.trim(); };
    s.querySelectorAll('select[data-k]').forEach(sel => sel.onchange = () => { const arr = E.answersB[q.id] ? E.answersB[q.id].slice() : q.pairs.map(() => ''); arr[+sel.dataset.k] = sel.value; E.answersB[q.id] = arr; });
    s.querySelectorAll('.qn').forEach(b => b.onclick = () => { E.qi = +b.dataset.k; this.renderExamB(); });
    const p = s.querySelector('#bPrevQ'); if (p) p.onclick = () => { E.qi--; this.renderExamB(); };
    const n = s.querySelector('#bNextQ'); if (n) n.onclick = () => { E.qi++; this.renderExamB(); };
    const sb = s.querySelector('#bSubmit'); if (sb) sb.onclick = async () => {
      const open = E.qB.filter(x => E.answersB[x.id] === undefined || E.answersB[x.id] === '').length;
      if (!(await this.dialogs.confirm('Nachweis abgeben?', open ? `Noch **${open}** Frage(n) ohne Antwort. Trotzdem abgeben?` : 'Alle Fragen sind beantwortet. Jetzt abgeben?', 'Abgeben', 'Zurück'))) return;
      this.examResult();
    };
  },
  examResult() {
    const E = this.exam; E.phase = 'result';
    const aPts = E.resA.filter(Boolean).length;
    const bScores = E.qB.map(q => GG.EXAM.scoreB(q, E.answersB[q.id]));
    const bPts = bScores.reduce((x, y) => x + y, 0);
    const R = GG.EXAM.result(aPts, bPts, E.qB.length);
    const now = new Date(); const p2 = n => String(n).padStart(2, '0');
    const date = `${p2(now.getDate())}.${p2(now.getMonth() + 1)}.${now.getFullYear()} ${p2(now.getHours())}:${p2(now.getMinutes())}`;
    const mins = Math.round((Date.now() - E.t0) / 60000);
    this.P.eb = Math.max(this.P.eb || 0, R.total); this.P.ep = this.P.ep || R.passed; this.P.el = { t: R.total, a: R.a, b: R.b, d: date }; this.save();
    GG.Scorm.reportScore(R.total, R.passed);
    const name = GG.Scorm.name ? GG.Scorm.name.split(',').reverse().join(' ').trim() : '';
    const ansText = (q, a) => { if (a === undefined || a === '') return '–'; if (q.type === 'mc' || q.type === 'term') return q.o[a]; if (q.type === 'hotspot') return q.tokens[a]; if (q.type === 'match') return a.map((x, k) => q.pairs[k][0] + ' → ' + (x || '–')).join('; '); return String(a); };
    const okText = q => q.type === 'mc' || q.type === 'term' ? q.o[q.c] : q.type === 'hotspot' ? q.tokens[q.c] : q.type === 'match' ? q.pairs.map(p => p[0] + ' → ' + p[1]).join('; ') : String(q.answer);
    this.setSide(`<div class="lesson exam result" id="certificate">
      <div class="print-head"><strong>Get-Going! – PowerShell für Fachinformatiker</strong><span>Kompetenznachweis</span></div>
      <h2>Ergebnis: ${R.total} % – ${R.passed ? '<span class="pass">bestanden</span>' : '<span class="fail">nicht bestanden</span>'}</h2>
      <table class="sum"><tr><th>Name</th><td>${esc(name || '–')}</td></tr><tr><th>Datum</th><td>${date} (Bearbeitungszeit ca. ${mins} Min.)</td></tr>
        <tr><th>Teil A – Praxis</th><td>${aPts} von ${GG.EXAM.partA.length} Prüfpunkten = ${R.a} von 50 %</td></tr>
        <tr><th>Teil B – Fragen</th><td>${bPts} von ${E.qB.length} Punkten = ${R.b} von 50 %</td></tr>
        <tr><th>Gesamt</th><td><strong>${R.total} %</strong> (bestanden ab 70 %)</td></tr></table>
      <h3>Teil A im Einzelnen</h3>
      <table class="det">${GG.EXAM.partA.map((a, k) => `<tr class="${E.resA[k] ? 'ok' : 'no'}"><td>${E.resA[k] ? '✓' : '✗'}</td><td>${a.id}</td><td>${inl(a.text)}</td></tr>`).join('')}</table>
      <h3>Teil B im Einzelnen</h3>
      <table class="det">${E.qB.map((q, k) => `<tr class="${bScores[k] === 1 ? 'ok' : bScores[k] > 0 ? 'part' : 'no'}"><td>${bScores[k] === 1 ? '✓' : bScores[k] > 0 ? '½' : '✗'}</td><td>${esc(q.lz)}</td><td>${inl(q.q)}<div class="small">Deine Antwort: ${esc(ansText(q, E.answersB[q.id]))}${bScores[k] < 1 ? ' · Richtig: ' + esc(okText(q)) : ''}</div></td></tr>`).join('')}</table>
      <div class="sign"><div><span></span>Ort, Datum</div><div><span></span>Unterschrift Prüfling</div><div><span></span>Unterschrift Lehrkraft</div></div>
      <div class="actions noprint"><button class="btn" id="rHome">Zur Startseite</button><span class="grow"></span><button class="btn" id="rAgain">Neuer Versuch</button><button class="btn primary" id="rPrint">Als PDF drucken</button></div></div>`);
    const s = this.side;
    s.querySelector('#rPrint').onclick = () => window.print();
    s.querySelector('#rHome').onclick = () => this.go('start');
    s.querySelector('#rAgain').onclick = () => this.startExam();
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
})();
