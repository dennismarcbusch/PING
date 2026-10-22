/* Terminal-Oberfläche: Zeileneditor, ANSI-Farben, Tab-Vervollständigung, Pager (less/more/man) und nano */
(function (G) {
  'use strict';
  const LX = (G.LX = G.LX || {});

  function esc(s) { return s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  // ANSI-SGR → HTML-Spans
  function ansiToHtml(s, st) {
    st = st || {};
    let out = '', i = 0;
    const open = () => {
      const c = [];
      if (st.b) c.push('b'); if (st.u) c.push('u'); if (st.fg) c.push('f' + st.fg); if (st.bg) c.push('g' + st.bg); if (st.inv) c.push('inv');
      return c.length ? '<span class="' + c.join(' ') + '">' : '';
    };
    let cur = open(); out += cur;
    while (i < s.length) {
      const m = /^\x1b\[([0-9;]*)m/.exec(s.slice(i, i + 20));
      if (s[i] === '\x1b' && m) {
        if (cur) out += '</span>';
        (m[1] || '0').split(';').forEach(cs => {
          const n = parseInt(cs || '0', 10);
          if (n === 0) { st.b = st.u = st.inv = false; st.fg = st.bg = null; }
          else if (n === 1) st.b = true; else if (n === 4) st.u = true; else if (n === 7) st.inv = true;
          else if (n === 22) st.b = false; else if (n === 24) st.u = false; else if (n === 27) st.inv = false;
          else if (n >= 30 && n <= 37) st.fg = n - 30; else if (n === 39) st.fg = null;
          else if (n >= 40 && n <= 47) st.bg = n - 40; else if (n === 49) st.bg = null;
          else if (n >= 90 && n <= 97) st.fg = n - 90 + 8;
        });
        cur = open(); out += cur; i += m[0].length; continue;
      }
      if (s[i] === '\x1b') { i++; continue; }
      out += esc(s[i]); i++;
    }
    if (cur) out += '</span>';
    return out;
  }
  LX.ansiToHtml = ansiToHtml;
  function strip(s) { return s.replace(/\x1b\[[0-9;]*m/g, ''); }

  function Term(root, opts) {
    this.opts = opts || {};
    this.root = root;
    root.classList.add('term');
    root.innerHTML = '';
    this.bar = el('div', 'term-bar');
    this.bar.innerHTML = '<span class="term-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="term-title"></span><span class="term-tools"></span>';
    this.body = el('div', 'term-body');
    this.screen = el('div', 'term-screen');
    this.screen.setAttribute('role', 'log');
    this.screen.setAttribute('aria-live', 'polite');
    this.inputLine = el('div', 'ln term-input');
    this.overlay = el('div', 'term-overlay');
    this.overlay.hidden = true;
    this.kb = el('textarea', 'term-kb');
    this.kb.setAttribute('aria-label', 'Terminal-Eingabe');
    this.kb.setAttribute('autocapitalize', 'off'); this.kb.setAttribute('autocomplete', 'off'); this.kb.setAttribute('spellcheck', 'false');
    this.measure = el('span', 'term-measure', 'MMMMMMMMMM');
    this.body.appendChild(this.screen); this.body.appendChild(this.overlay); this.body.appendChild(this.measure);
    root.appendChild(this.bar); root.appendChild(this.body); root.appendChild(this.kb);
    this.screen.appendChild(this.inputLine);
    this.curLn = null; this.ansi = {};
    this.mode = 'idle'; this.buf = ''; this.cur = 0; this.hidx = -1; this.saved = '';
    this.lastTab = 0;
    this.handlers = {};
    const self = this;
    root.addEventListener('click', (e) => { if (e.target.closest('button,a,input,select')) return; const sel = window.getSelection(); if (!sel || sel.isCollapsed || !root.contains(sel.anchorNode)) self.focus(); });
    this.kb.addEventListener('keydown', (e) => self.onKey(e));
    this.kb.addEventListener('input', () => { const v = self.kb.value; self.kb.value = ''; if (v) self.onText(v.replace(/\r?\n/g, ' ')); });
    this.kb.addEventListener('paste', (e) => { e.preventDefault(); const t = (e.clipboardData || window.clipboardData).getData('text') || ''; self.onText(t.split(/\r?\n/)[0]); });
    this.kb.addEventListener('focus', () => root.classList.add('focused'));
    this.kb.addEventListener('blur', () => root.classList.remove('focused'));
    this.body.addEventListener('wheel', (e) => { if (self.mode === 'pager' && self.pg) { e.preventDefault(); self.pgScroll(e.deltaY > 0 ? 3 : -3); } }, { passive: false });
    if (window.ResizeObserver) new ResizeObserver(() => { if (self.mode === 'pager') self.pgDraw(); if (self.mode === 'nano') self.nDraw(); }).observe(this.body);
  }
  LX.Term = Term;
  Term.prototype.headless = false;

  Term.prototype.attach = function (sh) {
    this.sh = sh;
    const self = this;
    this.setTitle();
    this.showPrompt();
    return this;
  };
  Term.prototype.setTitle = function () {
    if (!this.sh) return;
    const p = this.sh.prompt();
    this.bar.querySelector('.term-title').textContent = p.user + '@' + p.host + ': ' + p.path;
  };
  Term.prototype.focus = function () { try { this.kb.focus({ preventScroll: true }); } catch (e) { this.kb.focus(); } };
  Term.prototype.charW = function () { return (this.measure.getBoundingClientRect().width / 10) || 8.4; };
  Term.prototype.lineH = function () { return this.measure.getBoundingClientRect().height || 19; };
  Term.prototype.cols = function () { const w = this.screen.clientWidth - 24; return Math.max(40, Math.floor(w / this.charW())); };
  Term.prototype.rows = function () { const h = this.body.clientHeight - 16; return Math.max(10, Math.floor(h / this.lineH())); };

  // ---------- Ausgabe ----------
  Term.prototype.newLine = function () {
    this.curLn = el('div', 'ln');
    this.screen.insertBefore(this.curLn, this.inputLine);
    const n = this.screen.childNodes.length;
    if (n > 2000) for (let i = 0; i < n - 1800; i++) this.screen.removeChild(this.screen.firstChild);
  };
  Term.prototype.write = function (s) {
    if (!s) return;
    if (s.indexOf('\x1b[H\x1b[2J') >= 0) { this.clear(); s = s.split('\x1b[H\x1b[2J').pop(); }
    const parts = s.split('\n');
    parts.forEach((p, i) => {
      if (i === parts.length - 1 && p === '') return;
      if (!this.curLn) this.newLine();
      if (p) this.curLn.insertAdjacentHTML('beforeend', ansiToHtml(p.replace(/\t/g, '        '.slice(0, 8)), this.ansi));
      if (i < parts.length - 1) { if (!this.curLn.innerHTML) this.curLn.innerHTML = '&#8203;'; this.curLn = null; }
    });
    this.scroll();
  };
  Term.prototype.clear = function () {
    while (this.screen.firstChild !== this.inputLine) this.screen.removeChild(this.screen.firstChild);
    this.curLn = null;
    this.scroll();
  };
  Term.prototype.scroll = function () { this.screen.scrollTop = this.screen.scrollHeight; };

  // ---------- Eingabezeile ----------
  Term.prototype.promptHtml = function () {
    if (this.mode === 'read' || this.mode === 'secret') return '<span>' + esc(this.readPrompt) + '</span>';
    const p = this.sh.prompt();
    return '<span class="b f10">' + esc(p.user + '@' + p.host) + '</span>:<span class="b f12">' + esc(p.path) + '</span>' + esc(p.sign) + ' ';
  };
  Term.prototype.renderInput = function () {
    if (this.mode === 'busy' || this.mode === 'pager' || this.mode === 'nano') { this.inputLine.style.display = 'none'; return; }
    this.inputLine.style.display = '';
    const shown = this.mode === 'secret' ? '' : this.buf;
    const c = this.mode === 'secret' ? 0 : this.cur;
    const before = esc(shown.slice(0, c)), at = shown[c] ? esc(shown[c]) : ' ', after = esc(shown.slice(c + 1));
    this.inputLine.innerHTML = this.promptHtml() + before + '<span class="cursor">' + at + '</span>' + after;
    this.scroll();
  };
  Term.prototype.showPrompt = function () {
    this.mode = 'idle'; this.buf = ''; this.cur = 0; this.hidx = -1;
    this.setTitle();
    this.renderInput();
  };
  Term.prototype.commitInputLine = function (shownText) {
    // Eingabezeile als normale Ausgabezeile übernehmen
    if (this.curLn) { this.curLn = null; }
    const ln = el('div', 'ln');
    ln.innerHTML = this.promptHtml() + esc(shownText);
    this.screen.insertBefore(ln, this.inputLine);
  };

  Term.prototype.onText = function (t) {
    if (this.mode === 'pager') return this.pgKey({ key: t[0] });
    if (this.mode === 'nano') {
      const n = this.nn; if (!n) return;
      if (n.inHelp) { Object.assign(n, n.helpSaved); n.inHelp = false; this.nDraw(); return; }
      for (const ch of t) { if (!this.nn || (n.prompt && n.prompt.type === 'yn' && this.nn.prompt !== n.prompt)) break; this.nInsert(ch); }
      if (this.nn) this.nDraw();
      return;
    }
    if (this.mode === 'busy') return;
    this.buf = this.buf.slice(0, this.cur) + t + this.buf.slice(this.cur);
    this.cur += t.length;
    this.renderInput();
  };

  Term.prototype.onKey = function (e) {
    const k = e.key;
    const ctrl = e.ctrlKey && !e.altKey;
    if (this.mode === 'pager') { if (k.length > 1 || ctrl) { e.preventDefault(); this.pgKey(e); } else if (this.pg && this.pg.searching) { e.preventDefault(); this.pgKey(e); } else { e.preventDefault(); this.pgKey(e); } return; }
    if (this.mode === 'nano') { this.nKey(e); return; }
    if (this.mode === 'busy') {
      if (ctrl && (k === 'c' || k === 'C')) { e.preventDefault(); if (this.sh) this.sh.interrupt(); }
      else if (k.length > 1 || ctrl) e.preventDefault();
      return;
    }
    const secret = this.mode === 'secret';
    if (ctrl) {
      const kk = k.toLowerCase();
      if (kk === 'c') {
        e.preventDefault();
        if (this.mode === 'read' || secret) { this.commitInputLine(secret ? '' : this.buf + '^C'); const r = this.readRes; this.readRes = null; this.mode = 'busy'; this.renderInput(); r(null); return; }
        this.commitInputLine(this.buf + '^C'); this.buf = ''; this.cur = 0; this.hidx = -1; this.renderInput(); return;
      }
      if (kk === 'l') { e.preventDefault(); this.clear(); this.renderInput(); return; }
      if (kk === 'a') { e.preventDefault(); this.cur = 0; this.renderInput(); return; }
      if (kk === 'e') { e.preventDefault(); this.cur = this.buf.length; this.renderInput(); return; }
      if (kk === 'u') { e.preventDefault(); this.buf = this.buf.slice(this.cur); this.cur = 0; this.renderInput(); return; }
      if (kk === 'k') { e.preventDefault(); this.buf = this.buf.slice(0, this.cur); this.renderInput(); return; }
      if (kk === 'd') { e.preventDefault(); if (!this.buf && this.mode === 'idle') { this.commitInputLine(''); this.write('exit\n'); this.sh.run('exit').then(() => this.showPrompt()); } return; }
      if (kk === 'v' || kk === 'x' || kk === 'y') return; // Einfügen/Ausschneiden dem Browser überlassen
      if (kk === 'r' || kk === 's' || kk === 'o' || kk === 'g' || kk === 'f' || kk === 'p' || kk === 'b' || kk === 'h' || kk === 'j') { e.preventDefault(); return; }
      return;
    }
    switch (k) {
      case 'Enter': {
        e.preventDefault();
        if (this.mode === 'read' || secret) {
          const v = this.buf; this.commitInputLine(secret ? '' : v);
          const r = this.readRes; this.readRes = null; this.mode = 'busy'; this.buf = ''; this.cur = 0; this.renderInput(); r(v); return;
        }
        const line = this.buf;
        this.commitInputLine(line);
        this.buf = ''; this.cur = 0; this.hidx = -1;
        this.exec(line);
        return;
      }
      case 'Backspace': e.preventDefault(); if (this.cur > 0) { this.buf = this.buf.slice(0, this.cur - 1) + this.buf.slice(this.cur); this.cur--; } this.renderInput(); return;
      case 'Delete': e.preventDefault(); this.buf = this.buf.slice(0, this.cur) + this.buf.slice(this.cur + 1); this.renderInput(); return;
      case 'ArrowLeft': e.preventDefault(); if (this.cur > 0) this.cur--; this.renderInput(); return;
      case 'ArrowRight': e.preventDefault(); if (this.cur < this.buf.length) this.cur++; this.renderInput(); return;
      case 'Home': e.preventDefault(); this.cur = 0; this.renderInput(); return;
      case 'End': e.preventDefault(); this.cur = this.buf.length; this.renderInput(); return;
      case 'ArrowUp': case 'ArrowDown': {
        e.preventDefault();
        if (this.mode !== 'idle') return;
        const h = this.sh.w.history;
        if (!h.length) return;
        if (this.hidx === -1) this.saved = this.buf;
        if (k === 'ArrowUp') this.hidx = this.hidx === -1 ? h.length - 1 : Math.max(0, this.hidx - 1);
        else { if (this.hidx === -1) return; this.hidx++; if (this.hidx >= h.length) this.hidx = -1; }
        this.buf = this.hidx === -1 ? this.saved : h[this.hidx];
        this.cur = this.buf.length; this.renderInput(); return;
      }
      case 'Tab': e.preventDefault(); if (this.mode === 'idle') this.complete(); return;
      case 'PageUp': e.preventDefault(); this.screen.scrollTop -= this.screen.clientHeight * 0.8; return;
      case 'PageDown': e.preventDefault(); this.screen.scrollTop += this.screen.clientHeight * 0.8; return;
      case 'Escape': e.preventDefault(); return;
    }
    if (k.length > 1 && /^F\d+$/.test(k)) { e.preventDefault(); return; }
  };

  Term.prototype.exec = async function (line) {
    this.mode = 'busy'; this.renderInput();
    if (this.opts.beforeExec) this.opts.beforeExec(line);
    try { await this.sh.run(line); }
    catch (err) { this.write('Interner Fehler: ' + (err && err.message) + '\n'); }
    if (this.curLn) { this.curLn = null; }
    this.showPrompt();
  };
  // Befehl von außen eintippen (Schaltfläche „ins Terminal“)
  Term.prototype.type = function (text, run) {
    if (this.mode !== 'idle') return false;
    this.buf = text; this.cur = text.length; this.renderInput(); this.focus();
    if (run) { this.commitInputLine(text); this.buf = ''; this.cur = 0; this.exec(text); }
    return true;
  };

  Term.prototype.readLine = function (prompt) {
    return new Promise(res => { if (this.curLn) { this.readPrompt = strip(this.curLn.textContent) + prompt; this.screen.removeChild(this.curLn); this.curLn = null; } else this.readPrompt = prompt; this.mode = 'read'; this.buf = ''; this.cur = 0; this.readRes = res; this.renderInput(); this.focus(); });
  };
  Term.prototype.readSecret = function (prompt) {
    return new Promise(res => { this.readPrompt = prompt; this.mode = 'secret'; this.buf = ''; this.cur = 0; this.readRes = res; this.renderInput(); this.focus(); });
  };

  // ---------- Tab-Vervollständigung ----------
  Term.prototype.complete = function () {
    const w = this.sh.w;
    const before = this.buf.slice(0, this.cur);
    const m = /(\S*)$/.exec(before);
    const word = m[1];
    const isCmd = !/\S\s/.test(before.replace(/^\s*sudo\s+/, '').trimStart() + (word ? '' : ' ')) && (before.trim() === word || /^\s*sudo\s+\S*$/.test(before));
    let cands = [];
    if (isCmd && word.indexOf('/') < 0) {
      cands = Object.keys(LX.CMDS).concat(['ll', 'la']).filter(c => c.indexOf(word) === 0).sort().map(c => ({ name: c, full: c + ' ' }));
    } else {
      let w2 = word.replace(/^~(?=\/|$)/, LX.homeOf(w, w.user));
      const slash = w2.lastIndexOf('/');
      const dirPart = slash >= 0 ? w2.slice(0, slash + 1) : '';
      const base = slash >= 0 ? w2.slice(slash + 1) : w2;
      const r = LX.resolve(w, dirPart || '.', { user: w.user });
      if (r.node && r.node.type === 'd' && LX.can(w, r.node, 'r', w.user)) {
        cands = Object.keys(r.node.children).filter(n => n.indexOf(base) === 0 && (base[0] === '.' || n[0] !== '.')).sort(LX.collate)
          .map(n => { const d = r.node.children[n].type === 'd'; const wp = word.slice(0, word.length - base.length); return { name: n + (d ? '/' : ''), full: wp + n.replace(/ /g, '\\ ') + (d ? '/' : ' ') }; });
      }
    }
    if (!cands.length) return;
    if (cands.length === 1) {
      this.buf = before.slice(0, before.length - word.length) + cands[0].full + this.buf.slice(this.cur);
      this.cur = before.length - word.length + cands[0].full.length;
      this.renderInput(); return;
    }
    // gemeinsames Präfix
    let pre = cands[0].full.trimEnd();
    cands.forEach(c => { let i = 0; const f = c.full; while (i < pre.length && i < f.length && pre[i] === f[i]) i++; pre = pre.slice(0, i); });
    if (pre.length > word.length) {
      this.buf = before.slice(0, before.length - word.length) + pre + this.buf.slice(this.cur);
      this.cur = before.length - word.length + pre.length;
      this.renderInput(); return;
    }
    const now = Date.now();
    if (now - this.lastTab < 900) {
      this.commitInputLine(this.buf);
      const items = cands.map(c => ({ txt: c.name, len: c.name.length }));
      const width = this.cols();
      const colW = Math.max.apply(null, items.map(i => i.len)) + 2;
      const per = Math.max(1, Math.floor(width / colW));
      const rows = Math.ceil(items.length / per);
      let s = '';
      for (let r = 0; r < rows; r++) { for (let c = 0; c < per; c++) { const it = items[c * rows + r]; if (it) s += it.txt.padEnd(colW); } s = s.trimEnd() + '\n'; }
      this.write(s);
      this.renderInput();
    }
    this.lastTab = now;
  };

  // ---------- Pager (less / more / man) ----------
  Term.prototype.pager = function (text, opts) {
    return new Promise(res => {
      const lines = text.replace(/\n$/, '').split('\n');
      this.pg = { lines: lines, top: 0, opts: opts || {}, res: res, search: '', searching: false, sbuf: '', msg: '' };
      this.mode = 'pager'; this.renderInput();
      this.overlay.hidden = false; this.overlay.className = 'term-overlay pager';
      this.screen.style.visibility = 'hidden';
      if (this.pg.opts.mode === 'more' && lines.length < this.rows()) { this.pgClose(true); return; }
      this.pgDraw();
      this.focus();
    });
  };
  Term.prototype.pgDraw = function () {
    const p = this.pg; if (!p) return;
    const rows = this.rows() - 1;
    p.top = Math.max(0, Math.min(p.top, Math.max(0, p.lines.length - rows)));
    let html = '';
    const re = p.search ? safeRe(p.search) : null;
    for (let i = 0; i < rows; i++) {
      const ln = p.lines[p.top + i];
      if (ln === undefined) { html += '<div class="ln f4 b">~</div>'; continue; }
      let h = ansiToHtml(ln, {});
      if (re) h = highlight(h, re);
      html += '<div class="ln">' + (h || '&#8203;') + '</div>';
    }
    const end = p.top + rows >= p.lines.length;
    let status;
    if (p.searching) status = '<span>/' + esc(p.sbuf) + '</span><span class="cursor"> </span>';
    else if (p.msg) status = '<span class="inv">' + esc(p.msg) + '</span>';
    else if (p.opts.mode === 'man') status = '<span class="inv"> Handbuchseite ' + esc(p.opts.name) + ' Zeile ' + (p.top + 1) + (end ? ' (END)' : '') + ' (h für Hilfe oder q zum Beenden)</span>';
    else if (p.opts.mode === 'more') status = '<span class="inv">--Mehr--(' + Math.min(100, Math.round(100 * (p.top + rows) / p.lines.length)) + '%)</span>';
    else status = end ? '<span class="inv">(END)</span>' : (p.top === 0 && p.opts.name ? '<span class="inv">' + esc(p.opts.name) + '</span>' : '<span>:</span>');
    this.overlay.innerHTML = html + '<div class="ln pg-status">' + status + '</div>';
  };
  function safeRe(s) { try { return new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'); } catch (e) { return null; } }
  function highlight(html, re) {
    // nur in Textknoten markieren
    return html.replace(/(^|>)([^<]+)/g, (m, a, t) => a + t.replace(re, x => '<mark>' + x + '</mark>'));
  }
  Term.prototype.pgScroll = function (n) { this.pg.top += n; this.pg.msg = ''; this.pgDraw(); };
  Term.prototype.pgClose = function (silent) {
    const p = this.pg; this.pg = null;
    this.overlay.hidden = true; this.overlay.innerHTML = '';
    this.screen.style.visibility = '';
    if (p && p.opts.mode === 'more' && silent) this.write(p.lines.join('\n') + '\n');
    this.mode = 'busy';
    if (p) p.res();
  };
  Term.prototype.pgFind = function (dir) {
    const p = this.pg; const re = safeRe(p.search); if (!re) return;
    const start = dir > 0 ? p.top + 1 : p.top - 1;
    for (let i = start; dir > 0 ? i < p.lines.length : i >= 0; i += dir) {
      re.lastIndex = 0;
      if (re.test(strip(p.lines[i]))) { p.top = i; p.msg = ''; this.pgDraw(); return; }
    }
    p.msg = 'Muster nicht gefunden  (Taste drücken)'; this.pgDraw();
  };
  Term.prototype.pgKey = function (e) {
    const p = this.pg; if (!p) return;
    const k = e.key;
    const rows = this.rows() - 1;
    if (p.searching) {
      if (k === 'Enter') { p.searching = false; if (p.sbuf) p.search = p.sbuf; p.sbuf = ''; this.pgFind(1); return; }
      if (k === 'Escape' || (e.ctrlKey && k === 'c')) { p.searching = false; p.sbuf = ''; this.pgDraw(); return; }
      if (k === 'Backspace') { if (!p.sbuf) { p.searching = false; } p.sbuf = p.sbuf.slice(0, -1); this.pgDraw(); return; }
      if (k.length === 1) { p.sbuf += k; this.pgDraw(); }
      return;
    }
    if (p.help) { p.help = false; p.lines = p.saved; p.top = p.savedTop; this.pgDraw(); return; }
    const end = p.top + rows >= p.lines.length;
    switch (k) {
      case 'q': case 'Q': case 'Escape': this.pgClose(false); return;
      case ' ': case 'f': case 'PageDown': case 'z':
        if (p.opts.mode === 'more' && end) { this.pgClose(false); return; }
        this.pgScroll(rows); return;
      case 'b': case 'PageUp': this.pgScroll(-rows); return;
      case 'Enter': case 'j': case 'ArrowDown': case 'e':
        if (p.opts.mode === 'more' && end) { this.pgClose(false); return; }
        this.pgScroll(1); return;
      case 'k': case 'y': case 'ArrowUp': this.pgScroll(-1); return;
      case 'd': this.pgScroll(Math.floor(rows / 2)); return;
      case 'u': this.pgScroll(-Math.floor(rows / 2)); return;
      case 'g': case 'Home': case '<': p.top = 0; this.pgDraw(); return;
      case 'G': case 'End': case '>': p.top = p.lines.length; this.pgDraw(); return;
      case '/': p.searching = true; p.sbuf = ''; this.pgDraw(); return;
      case 'n': if (p.search) this.pgFind(1); return;
      case 'N': if (p.search) this.pgFind(-1); return;
      case 'h': case 'H':
        p.saved = p.lines; p.savedTop = p.top; p.help = true; p.top = 0;
        p.lines = ['', '                   \x1b[1mZUSAMMENFASSUNG DER TASTENBEFEHLE\x1b[0m', '', '  \x1b[1mq\x1b[0m                  Beenden', '  \x1b[1mLeertaste\x1b[0m  f       Eine Seite vorwärts', '  \x1b[1mb\x1b[0m                  Eine Seite zurück', '  \x1b[1mEnter\x1b[0m  j  ↓      Eine Zeile vorwärts', '  \x1b[1mk\x1b[0m  ↑               Eine Zeile zurück', '  \x1b[1md\x1b[0m / \x1b[1mu\x1b[0m              Halbe Seite vor / zurück', '  \x1b[1mg\x1b[0m / \x1b[1mG\x1b[0m              An den Anfang / an das Ende', '', '  \x1b[1m/Muster\x1b[0m            Vorwärts nach Muster suchen', '  \x1b[1mn\x1b[0m / \x1b[1mN\x1b[0m              Nächster / vorheriger Treffer', '', '  (Beliebige Taste – zurück zum Text)'];
        this.pgDraw(); return;
    }
    if (p.msg) { p.msg = ''; this.pgDraw(); }
  };

  // ---------- nano ----------
  Term.prototype.nano = function (path, user) {
    return new Promise(res => {
      const w = this.sh.w;
      const L = path ? LX.nanoLoad(w, user, path) : { exists: false, text: '' };
      let text = L.text || '';
      const lines = text.split('\n');
      if (text.endsWith('\n')) lines.pop();
      if (!lines.length) lines.push('');
      this.nn = { path: path, user: user, lines: lines, cy: 0, cx: 0, top: 0, mod: false, cut: [], lastCut: false, res: res, prompt: null, msg: '', search: '' };
      const nn = this.nn;
      if (L.err) nn.msg = '[ ' + L.err + ' ]';
      else if (!path) nn.msg = '';
      else if (!L.exists) nn.msg = '[ Neue Datei ]';
      else nn.msg = '[ ' + lines.length + ' Zeile' + (lines.length === 1 ? '' : 'n') + ' gelesen ]';
      if (L.readonly && !L.err) nn.msg = '[ Datei »' + path + '« ist nicht schreibbar ]';
      this.mode = 'nano'; this.renderInput();
      this.overlay.hidden = false; this.overlay.className = 'term-overlay nano';
      this.screen.style.visibility = 'hidden';
      this.nDraw(); this.focus();
    });
  };
  function expandTabs(s) { let o = ''; for (const ch of s) { if (ch === '\t') { const n = 8 - (o.length % 8); o += ' '.repeat(n); } else o += ch; } return o; }
  function visCol(s, cx) { return expandTabs(s.slice(0, cx)).length; }
  Term.prototype.nDraw = function () {
    const n = this.nn; if (!n) return;
    const rows = this.rows(), cols = this.cols() + 2;
    const textRows = rows - 4;
    if (n.cy < n.top) n.top = n.cy;
    if (n.cy >= n.top + textRows) n.top = n.cy - textRows + 1;
    const title = n.path || 'Neuer Puffer';
    const left = '  GNU nano 7.2', right = n.mod ? 'Verändert  ' : '';
    const mid = Math.max(left.length + 2, Math.floor((cols - title.length) / 2));
    let bar = left.padEnd(mid) + title; bar = bar.padEnd(Math.max(bar.length + 1, cols - right.length)) + right;
    let html = '<div class="ln inv nano-title">' + esc(bar.slice(0, cols).padEnd(cols)) + '</div>';
    for (let i = 0; i < textRows; i++) {
      const li = n.top + i;
      const raw = n.lines[li];
      if (raw === undefined) { html += '<div class="ln">&#8203;</div>'; continue; }
      let line = expandTabs(raw);
      let off = 0;
      if (li === n.cy) { const vc = visCol(raw, n.cx); if (vc >= cols - 1) off = vc - cols + 8; }
      let shown = line.slice(off, off + cols - 1);
      if (off > 0) shown = '$' + shown.slice(1);
      if (line.length - off > cols - 1) shown = shown.slice(0, cols - 2) + '$';
      if (li === n.cy && !n.prompt) {
        const vc = visCol(raw, n.cx) - off;
        const a = shown.slice(0, vc), b = shown[vc] || ' ', c = shown.slice(vc + 1);
        html += '<div class="ln">' + esc(a) + '<span class="cursor">' + esc(b) + '</span>' + esc(c) + '</div>';
      } else html += '<div class="ln">' + (esc(shown) || '&#8203;') + '</div>';
    }
    // Statuszeile
    if (n.prompt) {
      const pr = n.prompt;
      if (pr.type === 'yn') html += '<div class="ln inv">' + esc(pr.label.padEnd(cols)) + '</div>';
      else html += '<div class="ln inv">' + esc(pr.label) + esc(pr.buf.slice(0, pr.cur)) + '<span class="cursor cursor-inv">' + esc(pr.buf[pr.cur] || ' ') + '</span>' + esc(pr.buf.slice(pr.cur + 1)) + '<span class="fill"></span></div>';
    } else if (n.msg) {
      const pad = Math.max(0, Math.floor((cols - n.msg.length) / 2));
      html += '<div class="ln">' + ' '.repeat(pad) + '<span class="inv">' + esc(n.msg) + '</span></div>';
    } else html += '<div class="ln">&#8203;</div>';
    // Hilfezeilen
    let keys;
    if (n.prompt && n.prompt.type === 'yn') keys = [[['J', 'Ja', 'y'], ['N', 'Nein', 'n']], [['^C', 'Abbrechen', 'cancel']]];
    else if (n.prompt) keys = [[['^G', 'Hilfe', 'help'], ['^C', 'Abbrechen', 'cancel']], [['Enter', 'Bestätigen', 'enter']]];
    else keys = [
      [['^G', 'Hilfe', 'help'], ['^O', 'Speichern', 'save'], ['^W', 'Wo ist', 'search'], ['^K', 'Ausschneiden', 'cut'], ['^T', 'Ausführen', 'na'], ['^C', 'Position', 'pos']],
      [['^X', 'Beenden', 'exit'], ['^R', 'Datei öffnen', 'na'], ['^\\', 'Ersetzen', 'na'], ['^U', 'Einfügen', 'paste'], ['^J', 'Ausrichten', 'na'], ['^/', 'Zu Zeile', 'na']]
    ];
    keys.forEach(row => {
      const cw = Math.floor(cols / 6);
      html += '<div class="ln nano-keys">' + row.map(kd => '<button type="button" class="nk" data-act="' + kd[2] + '" style="width:' + cw + 'ch"><span class="inv">' + esc(kd[0]) + '</span> ' + esc(kd[1]) + '</button>').join('') + '</div>';
    });
    this.overlay.innerHTML = html;
    const self = this;
    this.overlay.querySelectorAll('.nk').forEach(b => b.addEventListener('mousedown', (e) => { e.preventDefault(); self.nAction(b.dataset.act); self.focus(); }));
    if (this.opts.onNanoDraw) this.opts.onNanoDraw(n);
  };
  Term.prototype.nInsert = function (ch) {
    const n = this.nn;
    if (n.prompt) {
      const pr = n.prompt;
      if (pr.type === 'yn') { const c = ch.toLowerCase(); if (c === 'j' || c === 'y') this.nAction('y'); else if (c === 'n') this.nAction('n'); return; }
      pr.buf = pr.buf.slice(0, pr.cur) + ch + pr.buf.slice(pr.cur); pr.cur++; return;
    }
    const l = n.lines[n.cy];
    n.lines[n.cy] = l.slice(0, n.cx) + ch + l.slice(n.cx);
    n.cx++; n.mod = true; n.lastCut = false; n.msg = '';
  };
  Term.prototype.nSave = function (path) {
    const n = this.nn;
    const text = n.lines.join('\n') + '\n';
    const err = LX.nanoSave(this.sh.w, n.user, path, text);
    if (err) { n.msg = '[ ' + err + ' ]'; return false; }
    n.path = path; n.mod = false;
    n.msg = '[ ' + n.lines.length + ' Zeile' + (n.lines.length === 1 ? '' : 'n') + ' geschrieben ]';
    const w = this.sh.w; w.log.nanoSaves = (w.log.nanoSaves || []).concat([LX.absPath(w, path)]);
    return true;
  };
  Term.prototype.nClose = function () {
    const n = this.nn; this.nn = null;
    this.overlay.hidden = true; this.overlay.innerHTML = '';
    this.screen.style.visibility = '';
    this.mode = 'busy';
    if (n) n.res();
  };
  Term.prototype.nAction = function (act) {
    const n = this.nn; if (!n) return;
    const pr = n.prompt;
    if (pr) {
      if (act === 'cancel') { n.prompt = null; n.msg = '[ Abgebrochen ]'; this.nDraw(); return; }
      if (pr.type === 'yn') {
        if (act === 'y') { n.prompt = { type: 'save', label: 'Dateiname zum Speichern: ', buf: n.path || '', cur: (n.path || '').length, thenExit: true }; this.nDraw(); return; }
        if (act === 'n') { this.nClose(); return; }
        return;
      }
      if (act === 'enter') {
        if (pr.type === 'save') {
          if (!pr.buf) { n.prompt = null; n.msg = '[ Abgebrochen ]'; this.nDraw(); return; }
          n.prompt = null;
          const ok = this.nSave(pr.buf);
          if (ok && pr.thenExit) { this.nClose(); return; }
          this.nDraw(); return;
        }
        if (pr.type === 'search') {
          n.prompt = null; if (pr.buf) n.search = pr.buf;
          this.nFind(); this.nDraw(); return;
        }
      }
      if (act === 'help') { this.nHelp(); return; }
      return;
    }
    switch (act) {
      case 'save': n.prompt = { type: 'save', label: 'Dateiname zum Speichern: ', buf: n.path || '', cur: (n.path || '').length }; break;
      case 'savequick': if (n.path) this.nSave(n.path); else n.prompt = { type: 'save', label: 'Dateiname zum Speichern: ', buf: '', cur: 0 }; break;
      case 'exit':
        if (!n.mod) { this.nClose(); return; }
        n.prompt = { type: 'yn', label: 'Geänderten Puffer speichern?' }; break;
      case 'search': n.prompt = { type: 'search', label: 'Suche' + (n.search ? ' [' + n.search + ']' : '') + ': ', buf: '', cur: 0 }; break;
      case 'cut': {
        const line = n.lines[n.cy];
        if (!n.lastCut) n.cut = [];
        n.cut.push(line);
        if (n.lines.length > 1) n.lines.splice(n.cy, 1); else n.lines[0] = '';
        if (n.cy >= n.lines.length) n.cy = n.lines.length - 1;
        n.cx = 0; n.mod = true; n.lastCut = true; n.msg = '';
        break;
      }
      case 'paste':
        if (!n.cut.length) { n.msg = '[ Ausschneidepuffer ist leer ]'; break; }
        n.lines.splice.apply(n.lines, [n.cy, 0].concat(n.cut));
        n.cy += n.cut.length; n.cx = 0; n.mod = true; n.lastCut = false; n.msg = '';
        break;
      case 'pos': {
        const total = n.lines.join('\n').length + 1;
        let ch = 0; for (let i = 0; i < n.cy; i++) ch += n.lines[i].length + 1; ch += n.cx;
        const pc = (a, b) => Math.round(100 * a / Math.max(1, b));
        n.msg = '[ Zeile ' + (n.cy + 1) + '/' + n.lines.length + ' (' + pc(n.cy + 1, n.lines.length) + '%), Spalte ' + (n.cx + 1) + '/' + (n.lines[n.cy].length + 1) + ' (' + pc(n.cx + 1, n.lines[n.cy].length + 1) + '%), Zeichen ' + (ch + 1) + '/' + total + ' (' + pc(ch + 1, total) + '%) ]';
        break;
      }
      case 'help': this.nHelp(); return;
      case 'na': n.msg = '[ Diese Funktion ist in der Simulation nicht verfügbar ]'; break;
    }
    this.nDraw();
  };
  Term.prototype.nHelp = function () {
    const n = this.nn;
    n.helpSaved = { lines: n.lines, cy: n.cy, cx: n.cx, top: n.top, mod: n.mod, path: n.path };
    n.prompt = null;
    n.lines = ['Hilfetext für den Haupteditor', '', 'nano ist ein einfacher Texteditor. Schreibe einfach drauflos – jede', 'Taste fügt Text an der Cursorposition ein. Befehle gibst du mit', 'Tastenkombinationen ein: »^« bedeutet die Strg-Taste.', '', '^O  (F3)   Datei speichern (Dateiname bestätigen mit Enter)', '^S         Sofort speichern, ohne Nachfrage', '^X  (F2)   nano beenden (fragt nach, wenn ungespeichert)', '^K  (F9)   Aktuelle Zeile ausschneiden', '^U  (F10)  Ausgeschnittene Zeile(n) einfügen', '^W  (F6)   Text suchen – im Browser bitte F6 nutzen,', '           denn Strg+W schließt dort den Tab!', '^C         Cursorposition anzeigen / Eingabe abbrechen', 'Pfeiltasten, Pos1, Ende, Bild↑, Bild↓  Cursor bewegen', '', '(Beliebige Taste drücken, um zum Text zurückzukehren)'];
    n.cy = 0; n.cx = 0; n.top = 0; n.inHelp = true; n.msg = '';
    this.nDraw();
  };
  Term.prototype.nFind = function () {
    const n = this.nn;
    if (!n.search) { n.msg = '[ Kein aktueller Suchbegriff ]'; return; }
    const s = n.search.toLowerCase();
    const L = n.lines.length;
    for (let k = 0; k <= L; k++) {
      const i = (n.cy + k) % L;
      const from = k === 0 ? n.cx + 1 : 0;
      const pos = n.lines[i].toLowerCase().indexOf(s, from);
      if (pos >= 0 && !(k === L && pos >= n.cx)) {
        n.msg = (i < n.cy || (i === n.cy && k > 0)) ? '[ Suche wurde am Anfang fortgesetzt ]' : '';
        n.cy = i; n.cx = pos; return;
      }
    }
    n.msg = '[ »' + n.search + '« nicht gefunden ]';
  };
  Term.prototype.nKey = function (e) {
    const n = this.nn; if (!n) return;
    const k = e.key; const ctrl = e.ctrlKey && !e.altKey;
    if (n.inHelp) { e.preventDefault(); const h = n.helpSaved; Object.assign(n, h); n.inHelp = false; this.nDraw(); return; }
    const map = { F1: 'help', F2: 'exit', F3: 'save', F6: 'search', F9: 'cut', F10: 'paste' };
    if (map[k]) { e.preventDefault(); this.nAction(map[k]); return; }
    if (ctrl) {
      const c = k.toLowerCase();
      const cm = { o: 'save', s: 'savequick', x: 'exit', k: 'cut', u: 'paste', w: 'search', f: 'search', g: 'help', t: 'na', r: 'na', j: 'na', '\\': 'na', '/': 'na' };
      if (c === 'c') { e.preventDefault(); if (n.prompt) this.nAction('cancel'); else this.nAction('pos'); return; }
      if (cm[c]) { e.preventDefault(); this.nAction(cm[c]); return; }
      if (c === 'a') { e.preventDefault(); n.cx = 0; this.nDraw(); return; }
      if (c === 'e') { e.preventDefault(); n.cx = n.lines[n.cy].length; this.nDraw(); return; }
      if (c === 'v' || c === 'y' || c === 'z') { if (c !== 'v') e.preventDefault(); return; }
      e.preventDefault(); return;
    }
    if (n.prompt) {
      const pr = n.prompt;
      if (k === 'Enter') { e.preventDefault(); this.nAction('enter'); return; }
      if (k === 'Escape') { e.preventDefault(); this.nAction('cancel'); return; }
      if (pr.type !== 'yn') {
        if (k === 'Backspace') { e.preventDefault(); if (pr.cur > 0) { pr.buf = pr.buf.slice(0, pr.cur - 1) + pr.buf.slice(pr.cur); pr.cur--; } this.nDraw(); return; }
        if (k === 'ArrowLeft') { e.preventDefault(); if (pr.cur > 0) pr.cur--; this.nDraw(); return; }
        if (k === 'ArrowRight') { e.preventDefault(); if (pr.cur < pr.buf.length) pr.cur++; this.nDraw(); return; }
        if (k === 'Home') { e.preventDefault(); pr.cur = 0; this.nDraw(); return; }
        if (k === 'End') { e.preventDefault(); pr.cur = pr.buf.length; this.nDraw(); return; }
      }
      if (k.length > 1) { e.preventDefault(); }
      return; // Zeichen kommen über das input-Ereignis
    }
    const rows = this.rows() - 4;
    const L = n.lines;
    const clampX = () => { if (n.cx > L[n.cy].length) n.cx = L[n.cy].length; };
    switch (k) {
      case 'Enter': e.preventDefault(); { const l = L[n.cy]; L.splice(n.cy, 1, l.slice(0, n.cx), l.slice(n.cx)); n.cy++; n.cx = 0; n.mod = true; n.lastCut = false; n.msg = ''; } break;
      case 'Backspace': e.preventDefault();
        if (n.cx > 0) { const l = L[n.cy]; L[n.cy] = l.slice(0, n.cx - 1) + l.slice(n.cx); n.cx--; n.mod = true; }
        else if (n.cy > 0) { n.cx = L[n.cy - 1].length; L[n.cy - 1] += L[n.cy]; L.splice(n.cy, 1); n.cy--; n.mod = true; }
        n.lastCut = false; break;
      case 'Delete': e.preventDefault();
        if (n.cx < L[n.cy].length) { const l = L[n.cy]; L[n.cy] = l.slice(0, n.cx) + l.slice(n.cx + 1); n.mod = true; }
        else if (n.cy < L.length - 1) { L[n.cy] += L[n.cy + 1]; L.splice(n.cy + 1, 1); n.mod = true; }
        n.lastCut = false; break;
      case 'ArrowLeft': e.preventDefault(); if (n.cx > 0) n.cx--; else if (n.cy > 0) { n.cy--; n.cx = L[n.cy].length; } n.lastCut = false; break;
      case 'ArrowRight': e.preventDefault(); if (n.cx < L[n.cy].length) n.cx++; else if (n.cy < L.length - 1) { n.cy++; n.cx = 0; } n.lastCut = false; break;
      case 'ArrowUp': e.preventDefault(); if (n.cy > 0) n.cy--; clampX(); n.lastCut = false; break;
      case 'ArrowDown': e.preventDefault(); if (n.cy < L.length - 1) n.cy++; clampX(); n.lastCut = false; break;
      case 'Home': e.preventDefault(); n.cx = 0; break;
      case 'End': e.preventDefault(); n.cx = L[n.cy].length; break;
      case 'PageUp': e.preventDefault(); n.cy = Math.max(0, n.cy - rows); n.top = Math.max(0, n.top - rows); clampX(); break;
      case 'PageDown': e.preventDefault(); n.cy = Math.min(L.length - 1, n.cy + rows); n.top = Math.min(Math.max(0, L.length - rows), n.top + rows); clampX(); break;
      case 'Tab': e.preventDefault(); this.nInsert('\t'); break;
      case 'Escape': e.preventDefault(); break;
      default:
        if (k.length > 1 && k !== 'Dead' && k !== 'Unidentified' && k !== 'Process') e.preventDefault();
        return;
    }
    this.nDraw();
  };
})(typeof window !== 'undefined' ? window : globalThis);
