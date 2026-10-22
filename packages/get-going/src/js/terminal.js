/* Get-Going! – Terminal-Oberfläche (Windows-Terminal-Optik, PSReadLine-ähnliche Eingabe) */
(function () {
'use strict';
const GG = globalThis.GG = globalThis.GG || {};
const V = GG.v;
const UI = GG.UI = GG.UI || {};

const COLORS = ['Black', 'DarkBlue', 'DarkGreen', 'DarkCyan', 'DarkRed', 'DarkMagenta', 'DarkYellow', 'Gray', 'DarkGray', 'Blue', 'Green', 'Cyan', 'Red', 'Magenta', 'Yellow', 'White'];
const normColor = c => { if (!c) return null; const k = String(c).toLowerCase(); return COLORS.find(x => x.toLowerCase() === k) || null; };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const KEYWORDS = new Set(['if', 'elseif', 'else', 'foreach', 'for', 'while', 'do', 'until', 'switch', 'function', 'filter', 'param', 'begin', 'process', 'end', 'try', 'catch', 'finally', 'throw', 'return', 'break', 'continue', 'exit', 'in', 'trap']);

/* ---------- Syntaxfärbung wie PSReadLine ---------- */
UI.colorize = function (text) {
  const out = []; let i = 0; let cmdPos = true;
  const push = (t, c) => out.push({ t, c });
  while (i < text.length) {
    const ch = text[i];
    const rest = text.slice(i);
    let m;
    if (/\s/.test(ch)) { m = /^\s+/.exec(rest); push(m[0], null); i += m[0].length; continue; }
    if (ch === '#') { push(rest, 'DarkGreen'); break; }
    if (ch === '"' || ch === '\'' || ch === '„' || ch === '“') {
      const q = ch === '\'' ? '\'' : '"';
      let j = i + 1; while (j < text.length && !(text[j] === q || (q === '"' && (text[j] === '“' || text[j] === '”'))) ) { if (text[j] === '`') j++; j++; }
      push(text.slice(i, j + 1), 'DarkCyan'); i = j + 1; cmdPos = false; continue;
    }
    if (ch === '$') { m = /^\$(\{[^}]*\}|[\w:?^$]+)/.exec(rest); const t = m ? m[0] : '$'; push(t, 'Green'); i += t.length; cmdPos = false; continue; }
    if (ch === '[' && (m = /^\[[\w.\[\]]+\]/.exec(rest)) && !cmdPos) { push(m[0], 'Gray'); i += m[0].length; continue; }
    if (ch === '[' && (m = /^\[[\w.]+\]/.exec(rest))) { push(m[0], 'Gray'); i += m[0].length; continue; }
    if (ch === '|' || ch === ';' || ch === '{' || ch === '(' || ch === '}' || ch === ')') { push(ch, 'DarkGray'); i++; cmdPos = ch !== '}' && ch !== ')'; continue; }
    if (ch === '-' && (m = /^-[A-Za-z][\w-]*:?/.exec(rest)) && (i === 0 || /[\s(]/.test(text[i - 1]))) {
      const isOp = /^-(eq|ne|gt|ge|lt|le|like|notlike|match|notmatch|contains|notcontains|in|notin|and|or|not|xor|replace|split|join|f|is|isnot|as|band|bor|ieq|ceq|ilike|clike)$/i.test(m[0]);
      push(m[0], isOp ? 'DarkGray' : 'DarkGray'); i += m[0].length; cmdPos = false; continue;
    }
    if (/[=+*/%,!<>&]/.test(ch)) { m = /^[=+*/%,!<>&]+/.exec(rest); push(m[0], 'DarkGray'); i += m[0].length; if (m[0] === '=') cmdPos = true; continue; }
    if ((m = /^\d+(\.\d+)?(kb|mb|gb|tb)?\b/i.exec(rest)) && !cmdPos) { push(m[0], 'White'); i += m[0].length; continue; }
    m = /^[^\s|;{}()"'$,=]+/.exec(rest);
    const word = m ? m[0] : ch;
    if (cmdPos) { push(word, KEYWORDS.has(word.toLowerCase()) ? 'Green' : 'Yellow'); cmdPos = KEYWORDS.has(word.toLowerCase()); }
    else if (/^\.[A-Za-z]/.test(word)) push(word, 'White');
    else push(word, null);
    i += word.length;
    if (word === '.' || word === '&') cmdPos = true;
  }
  return out;
};

/* ---------- Ein Terminal-Tab ---------- */
class TermTab {
  constructor(term, o) {
    this.term = term; this.title = o.title; this.admin = !!o.admin; this.session = null; this.id = 'tab' + (++TermTab.n);
    this.screen = document.createElement('div'); this.screen.className = 'scr'; this.screen.setAttribute('role', 'log'); this.screen.setAttribute('aria-live', 'polite');
    this.hist = []; this.hpos = -1; this.inp = null; this.busy = false; this.openLine = null; this.closed = false;
    this.host = new TermHost(this);
  }
  /* --- Ausgabe --- */
  lineEl() { const d = document.createElement('div'); d.className = 'ln'; this.screen.insertBefore(d, this.inputEl || null); return d; }
  addSpans(el, text, fg, bg) {
    if (text === '') return;
    const s = document.createElement('span'); s.textContent = text;
    if (fg) s.className = 'c-' + fg; if (bg) s.className += ' b-' + bg;
    el.appendChild(s);
  }
  write(text, o) {
    o = o || {};
    const fg = normColor(o.color), bg = normColor(o.bg);
    const parts = String(text).replace(/\r\n/g, '\n').split('\n');
    parts.forEach((p, k) => {
      let el = (k === 0 && this.openLine) ? this.openLine : this.lineEl();
      this.addSpans(el, p, fg, bg);
      if (k === parts.length - 1 && o.nonl) this.openLine = el; else this.openLine = null;
    });
    this.trim(); this.term.scroll(this);
  }
  lines(list) {
    for (const l of list) {
      const el = this.lineEl();
      if (l.c === 'err') this.addSpans(el, l.t, 'Red', 'Black');
      else if (l.c === 'warn') this.addSpans(el, l.t, 'Yellow', 'Black');
      else this.addSpans(el, l.t, null, null);
    }
    this.openLine = null; this.trim(); this.term.scroll(this);
  }
  trim() { const max = 4000; while (this.screen.childNodes.length > max) this.screen.removeChild(this.screen.firstChild); }
  clear() { while (this.screen.firstChild && this.screen.firstChild !== this.inputEl) this.screen.removeChild(this.screen.firstChild); this.openLine = null; }

  /* --- Eingabe --- */
  read(prompt, o) {
    o = o || {};
    return new Promise(resolve => {
      this.inputEl = document.createElement('div'); this.inputEl.className = 'ln input';
      if (this.openLine && !prompt) { /* Eingabe direkt hinter Text */ }
      this.screen.appendChild(this.inputEl);
      this.inp = { prompt, text: '', cur: 0, resolve, secure: !!o.secure, cmd: !!o.cmd, tab: null, cont: !!o.cont };
      this.term.syncInput(this);
      this.render();
      this.term.scroll(this);
    });
  }
  render() {
    const inp = this.inp; if (!inp || !this.inputEl) return;
    const el = this.inputEl; el.innerHTML = '';
    const pr = document.createElement('span'); pr.className = 'prompt'; pr.textContent = inp.prompt; el.appendChild(pr);
    const shown = inp.secure ? '*'.repeat(inp.text.length) : inp.text;
    const toks = inp.cmd ? UI.colorize(shown) : [{ t: shown, c: null }];
    let pos = 0;
    const curAt = this.term.focused ? inp.cur : -1;
    for (const tk of toks) {
      for (let k = 0; k < tk.t.length; k++) {
        const s = document.createElement('span');
        s.textContent = tk.t[k];
        s.className = (tk.c ? 'c-' + tk.c : '') + (pos === curAt ? ' cur' : '');
        el.appendChild(s); pos++;
      }
    }
    if (curAt === shown.length) { const s = document.createElement('span'); s.className = 'cur'; s.textContent = ' '; el.appendChild(s); }
  }
  commitInput() {
    const inp = this.inp; if (!inp) return '';
    this.inp = null;
    const el = this.inputEl; this.inputEl = null;
    el.className = 'ln';
    el.innerHTML = '';
    const pr = document.createElement('span'); pr.textContent = inp.prompt; el.appendChild(pr);
    const shown = inp.secure ? '*'.repeat(inp.text.length) : inp.text;
    for (const tk of (inp.cmd ? UI.colorize(shown) : [{ t: shown, c: null }])) this.addSpans(el, tk.t, tk.c, null);
    this.openLine = null;
    return inp.text;
  }
}
TermTab.n = 0;

/* ---------- Host-Schnittstelle für den Interpreter ---------- */
class TermHost {
  constructor(tab) { this.tab = tab; this.interactive = true; }
  get width() { return this.tab.term.cols; }
  write(text, o) { this.tab.write(text, o); }
  outDefault(items, ctx) { const l = GG.fmt.format(items, this.width, ctx); this.tab.lines(l); }
  showError(rec) { this.tab.lines(GG.fmt.errorText(rec).map(t => t.charAt(0) === '\u0001' ? { t: t.slice(1) } : { t, c: 'err' })); }
  async readLine(prompt, o) {
    const t = this.tab;
    const p = prompt ? String(prompt) : '';
    const v = await t.read(p, { secure: o && o.secure });
    t.commitInput();
    if (v === null) throw new GG.StopSignal();
    return v;
  }
  async choice(caption, msg, choices, def) {
    const t = this.tab;
    t.write(caption);
    t.write(msg);
    const line = choices.map(c => `[${c.key}] ${c.label}`).join('  ') + '  [?] Hilfe (Standard ist "' + choices[def || 0].key + '"):';
    for (;;) {
      const v = await t.read(line + ' ', {});
      t.commitInput();
      if (v === null) throw new GG.StopSignal();
      const a = v.trim().toUpperCase();
      if (a === '') return choices[def || 0].key;
      if (a === '?') { for (const c of choices) t.write(`${c.key} - ${c.help || c.label}`); continue; }
      const hit = choices.find(c => c.key.toUpperCase() === a || c.label.toUpperCase() === a);
      if (hit) return hit.key;
    }
  }
  async credential(user, msg) { return this.tab.term.app.dialogs.credential(user, msg); }
  async elevate(session) { return this.tab.term.app.elevate(this.tab); }
  async uacConsent(name, pub) { return this.tab.term.app.dialogs.uac(name, pub || 'Unbekannt'); }
  newTab(session) { this.tab.term.app.newPlainTab(session); }
  openNotepad(ctx, file) { this.tab.term.app.notepad.open(ctx.session, file, this.tab); }
  clear() { this.tab.clear(); }
  async sleep(ms) { await new Promise(r => setTimeout(r, Math.min(ms, 1500))); }
  async gridView(title, names, rows, pass) { return this.tab.term.app.dialogs.gridView(title, names, rows, pass); }
  async reboot(w, stop) { this.tab.write(stop ? 'Der Computer wird heruntergefahren … (Simulation: Der Server läuft weiter.)' : 'Der Computer wird neu gestartet … (Simulation: In wenigen Sekunden geht es weiter.)', { color: 'Yellow' }); await this.sleep(1200); }
  remoteChanged() { /* Prompt wird bei der nächsten Eingabe neu berechnet */ }
  exitShell(session) { this.tab.term.app.exitShell(this.tab); }
}

/* ---------- Terminal mit Tabs ---------- */
class Terminal {
  constructor(root, app) {
    this.app = app; this.root = root; this.tabs = []; this.active = null; this.cols = 120; this.focused = false;
    root.innerHTML = '';
    this.bar = document.createElement('div'); this.bar.className = 'wt-tabbar';
    this.body = document.createElement('div'); this.body.className = 'wt-body';
    this.ta = document.createElement('textarea'); this.ta.className = 'wt-ta'; this.ta.setAttribute('autocapitalize', 'off'); this.ta.setAttribute('autocomplete', 'off'); this.ta.setAttribute('spellcheck', 'false'); this.ta.setAttribute('aria-label', 'Eingabe');
    root.appendChild(this.bar); root.appendChild(this.body); root.appendChild(this.ta);
    this.measure = document.createElement('span'); this.measure.className = 'wt-measure'; this.measure.textContent = 'M'.repeat(100); this.body.appendChild(this.measure);
    this.bindEvents();
    this.resize();
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => this.resize()).observe(this.body);
  }
  resize() {
    const w = this.measure.getBoundingClientRect().width / 100 || 8.4;
    const cs = getComputedStyle(this.body);
    const avail = this.body.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0) - 14;
    this.cols = Math.max(60, Math.min(220, Math.floor(avail / w)));
  }
  renderBar() {
    this.bar.innerHTML = '';
    for (const t of this.tabs) {
      const b = document.createElement('div'); b.className = 'wt-tab' + (t === this.active ? ' on' : '') + (t.admin ? ' admin' : '');
      b.innerHTML = `<span class="ico" aria-hidden="true">${t.admin ? '<svg viewBox="0 0 16 16"><path d="M8 1 2 3.5v4C2 11 4.6 14 8 15c3.4-1 6-4 6-7.5v-4z" fill="currentColor"/></svg>' : '<svg viewBox="0 0 16 16"><path d="M1.5 3h13v10h-13z" fill="none" stroke="currentColor"/><path d="m4 6 3 2-3 2M8 10.5h4" fill="none" stroke="currentColor"/></svg>'}</span><span class="tt">${esc(t.title)}</span>`;
      b.title = t.title;
      b.onclick = () => this.switchTo(t);
      if (this.tabs.length > 1 && t !== this.tabs[0]) {
        const x = document.createElement('button'); x.className = 'x'; x.setAttribute('aria-label', 'Tab schließen'); x.textContent = '×';
        x.onclick = ev => { ev.stopPropagation(); this.app.closeTab(t); };
        b.appendChild(x);
      }
      this.bar.appendChild(b);
    }
  }
  addTab(o) {
    const t = new TermTab(this, o);
    this.tabs.push(t); this.body.appendChild(t.screen);
    this.switchTo(t);
    return t;
  }
  removeTab(t) {
    const i = this.tabs.indexOf(t); if (i < 0) return;
    this.tabs.splice(i, 1); t.closed = true;
    if (t.screen.parentNode) t.screen.parentNode.removeChild(t.screen);
    if (t.inp && t.inp.resolve) t.inp.resolve(null);
    if (this.active === t) this.switchTo(this.tabs[Math.max(0, i - 1)]);
    else this.renderBar();
  }
  reset() { for (const t of this.tabs.slice()) { t.closed = true; if (t.inp && t.inp.resolve) t.inp.resolve(null); if (t.screen.parentNode) t.screen.parentNode.removeChild(t.screen); } this.tabs = []; this.active = null; this.renderBar(); }
  switchTo(t) {
    if (!t) return;
    this.active = t;
    for (const x of this.tabs) x.screen.style.display = x === t ? '' : 'none';
    this.renderBar(); this.syncInput(t); t.render(); this.scroll(t);
    this.app.onTabSwitch && this.app.onTabSwitch(t);
  }
  scroll(t) { if (t === this.active) this.body.scrollTop = this.body.scrollHeight; }
  focus() { try { this.ta.focus({ preventScroll: true }); } catch (e) { this.ta.focus(); } }
  syncInput(t) { if (t !== this.active) return; const inp = t.inp; this.ta.value = inp ? inp.text : ''; if (inp) { this.ta.selectionStart = this.ta.selectionEnd = inp.cur; } }

  bindEvents() {
    const ta = this.ta;
    this.body.addEventListener('mouseup', () => { const sel = window.getSelection(); if (!sel || sel.isCollapsed) this.focus(); });
    this.body.addEventListener('contextmenu', ev => {
      ev.preventDefault();
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) { const s = sel.toString(); if (navigator.clipboard) navigator.clipboard.writeText(s).catch(() => {}); sel.removeAllRanges(); this.focus(); return; }
      if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(txt => this.insertText(txt)).catch(() => {});
    });
    ta.addEventListener('focus', () => { this.focused = true; this.root.classList.add('focused'); if (this.active) this.active.render(); });
    ta.addEventListener('blur', () => { this.focused = false; this.root.classList.remove('focused'); if (this.active) this.active.render(); });
    ta.addEventListener('input', () => {
      const t = this.active; if (!t || !t.inp) { ta.value = ''; return; }
      let v = ta.value;
      if (/\n/.test(v)) { // eingefügter mehrzeiliger Text
        const lines = v.split(/\r?\n/);
        t.inp.text = lines[0]; t.inp.cur = t.inp.text.length; t.render();
        this.pasteQueue = lines.slice(1);
        this.enter(t);
        return;
      }
      t.inp.text = v; t.inp.cur = ta.selectionStart; t.inp.tab = null; t.render();
    });
    document.addEventListener('selectionchange', () => { if (document.activeElement === ta && this.active && this.active.inp) { this.active.inp.cur = ta.selectionStart; this.active.render(); } });
    ta.addEventListener('keydown', ev => this.key(ev));
  }
  insertText(txt) {
    const t = this.active; if (!t || !t.inp) return;
    const s = t.inp.text; t.inp.text = s.slice(0, t.inp.cur) + txt + s.slice(t.inp.cur); t.inp.cur += txt.length;
    this.syncInput(t); this.ta.dispatchEvent(new Event('input'));
  }
  key(ev) {
    const t = this.active; if (!t) return;
    const inp = t.inp;
    if (ev.key === 'c' && ev.ctrlKey && !ev.shiftKey) {
      const sel = window.getSelection(); if (sel && !sel.isCollapsed && sel.toString()) return; // kopieren
      ev.preventDefault();
      if (inp) { t.commitInput(); t.write('', {}); inp.resolve(null); }
      else if (t.busy) { this.app.interrupt(t); }
      return;
    }
    if (!inp) { if (!ev.ctrlKey) ev.preventDefault(); return; }
    if (ev.key === 'Enter') { ev.preventDefault(); this.enter(t); return; }
    if (ev.key === 'Tab') { ev.preventDefault(); if (!inp.secure && inp.cmd) this.complete(t, ev.shiftKey); return; }
    if (ev.key === 'Escape') { ev.preventDefault(); inp.text = ''; inp.cur = 0; inp.tab = null; this.syncInput(t); t.render(); return; }
    if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
      ev.preventDefault(); if (!inp.cmd) return;
      const h = t.hist; if (!h.length) return;
      if (t.hpos < 0) t.hpos = h.length;
      t.hpos += ev.key === 'ArrowUp' ? -1 : 1;
      t.hpos = Math.max(0, Math.min(h.length, t.hpos));
      inp.text = t.hpos >= h.length ? '' : h[t.hpos]; inp.cur = inp.text.length; inp.tab = null;
      this.syncInput(t); t.render(); return;
    }
    if (ev.key === 'l' && ev.ctrlKey) { ev.preventDefault(); t.clear(); return; }
    if (ev.key === 'Home' || ev.key === 'End' || ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') setTimeout(() => { if (t.inp) { t.inp.cur = this.ta.selectionStart; t.render(); } }, 0);
  }
  enter(t) {
    const inp = t.inp; if (!inp) return;
    const v = t.commitInput();
    if (inp.cmd && v.trim()) { if (t.hist[t.hist.length - 1] !== v) t.hist.push(v); }
    t.hpos = -1;
    inp.resolve(v);
  }
  /* --- Tab-Vervollständigung --- */
  complete(t, back) {
    const inp = t.inp;
    if (!inp.tab || inp.tab.text !== inp.text || inp.tab.cur !== inp.cur) {
      const before = inp.text.slice(0, inp.cur);
      const m = /(["']?)([^\s"'|;{}()=,]*)$/.exec(before);
      const word = m[2]; const start = inp.cur - m[0].length;
      const list = this.app.completions(t, before.slice(0, start), word, m[1]);
      if (!list.length) return;
      inp.tab = { start, end: inp.cur, list, i: back ? list.length - 1 : 0, after: inp.text.slice(inp.cur) };
    } else {
      inp.tab.i = (inp.tab.i + (back ? -1 : 1) + inp.tab.list.length) % inp.tab.list.length;
    }
    const tb = inp.tab, rep = tb.list[tb.i];
    inp.text = inp.text.slice(0, tb.start) + rep + tb.after; inp.cur = tb.start + rep.length;
    tb.text = inp.text; tb.cur = inp.cur;
    this.syncInput(t); t.render();
  }
}

UI.Terminal = Terminal; UI.TermTab = TermTab; UI.TermHost = TermHost; UI.normColor = normColor;
})();
