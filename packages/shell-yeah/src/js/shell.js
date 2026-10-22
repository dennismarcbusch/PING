/* Linux-Simulation – bash-artige Shell: Tokenizer, Expansion, Pipes, Umleitungen */
(function (G) {
  'use strict';
  const LX = (G.LX = G.LX || {});
  LX.CMDS = LX.CMDS || {};

  // ---------- Tokenizer ----------
  function tokenize(line) {
    const toks = [];
    let i = 0, cur = null;
    const push = () => { if (cur) { toks.push({ t: 'w', segs: cur }); cur = null; } };
    const addSeg = (s, q) => { if (!cur) cur = []; const last = cur[cur.length - 1]; if (last && last.q === q) last.s += s; else cur.push({ s: s, q: q }); };
    while (i < line.length) {
      const c = line[i];
      if (c === ' ' || c === '\t') { push(); i++; continue; }
      if (c === '#' && !cur) break;
      if (c === "'") {
        const j = line.indexOf("'", i + 1);
        if (j < 0) return { err: 'bash: Unerwartetes Dateiende beim Suchen nach »\'«' };
        if (!cur) cur = [];
        addSeg(line.slice(i + 1, j), 1);
        if (j === i + 1) cur.push({ s: '', q: 1 });
        i = j + 1; continue;
      }
      if (c === '"') {
        let j = i + 1, s = '';
        while (j < line.length && line[j] !== '"') {
          if (line[j] === '\\' && j + 1 < line.length && '"\\$`'.indexOf(line[j + 1]) >= 0) { s += line[j + 1]; j += 2; continue; }
          s += line[j]; j++;
        }
        if (j >= line.length) return { err: 'bash: Unerwartetes Dateiende beim Suchen nach »"«' };
        if (!cur) cur = [];
        addSeg(s, 2);
        if (s === '') cur.push({ s: '', q: 2 });
        i = j + 1; continue;
      }
      if (c === '\\') { if (i + 1 < line.length) addSeg(line[i + 1], 1); i += 2; continue; }
      // Operatoren
      const rest = line.slice(i);
      let m = /^(2>&1|&>>|&>|2>>|2>|>>|>|<|\|\||\||&&|&|;)/.exec(rest);
      if (m && (m[1] !== '2>' && m[1] !== '2>>' && m[1] !== '2>&1' || !cur)) {
        push(); toks.push({ t: 'op', v: m[1] }); i += m[1].length; continue;
      }
      addSeg(c, 0); i++;
    }
    push();
    return { toks: toks };
  }
  LX.tokenize = tokenize;

  // ---------- Parser ----------
  function parse(toks) {
    const list = [];
    let pipe = [], cmd = { words: [], redirs: [] };
    const endCmd = () => { if (cmd.words.length || cmd.redirs.length) pipe.push(cmd); cmd = { words: [], redirs: [] }; };
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (t.t === 'w') { cmd.words.push(t.segs); continue; }
      const v = t.v;
      if (v === '>' || v === '>>' || v === '<' || v === '2>' || v === '2>>' || v === '&>' || v === '&>>') {
        const nx = toks[i + 1];
        if (!nx || nx.t !== 'w') return { err: 'bash: Syntaxfehler beim unerwarteten Symbol »' + (nx ? nx.v : 'newline') + '«' };
        cmd.redirs.push({ op: v, target: nx.segs }); i++; continue;
      }
      if (v === '2>&1') { cmd.redirs.push({ op: '2>&1' }); continue; }
      if (v === '|') {
        if (!cmd.words.length) return { err: 'bash: Syntaxfehler beim unerwarteten Symbol »|«' };
        endCmd(); continue;
      }
      // ; && || &
      if (!cmd.words.length && !pipe.length) return { err: 'bash: Syntaxfehler beim unerwarteten Symbol »' + v + '«' };
      endCmd();
      list.push({ pipe: pipe, op: v });
      pipe = [];
    }
    if (pipe.length && !cmd.words.length && !cmd.redirs.length) return { err: 'bash: Syntaxfehler: Unerwartetes Dateiende.' };
    endCmd();
    if (pipe.length) list.push({ pipe: pipe, op: ';' });
    return { list: list };
  }

  // ---------- Glob ----------
  function globToRe(p) {
    let r = '^', i = 0;
    while (i < p.length) {
      const c = p[i];
      if (c === '\u0000') { r += p[i + 1].replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'); i += 2; continue; }
      if (c === '*') r += '[^/]*';
      else if (c === '?') r += '[^/]';
      else if (c === '[') {
        const j = p.indexOf(']', i + 2);
        if (j < 0) r += '\\[';
        else { let cls = p.slice(i + 1, j).replace(/\u0000/g, ''); if (cls[0] === '!') cls = '^' + cls.slice(1); r += '[' + cls.replace(/\\/g, '\\\\') + ']'; i = j; }
      } else r += c.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
      i++;
    }
    return new RegExp(r + '$');
  }
  LX.globToRe = globToRe;
  function hasGlob(p) { return /(^|[^\u0000])[*?[]/.test(p.replace(/\u0000./g, '')) || /[*?[]/.test(p.replace(/\u0000./g, '')); }

  function globExpand(w, pat, user) {
    // pat enthält \u0000 vor wörtlichen Zeichen
    const abs = pat[0] === '/';
    const comps = pat.split('/').filter((c, idx) => c !== '' || idx === 0);
    let paths = [abs ? '' : null];
    const startDir = abs ? '/' : w.cwd;
    comps.forEach((comp, idx) => {
      if (idx === 0 && abs) return;
      const next = [];
      const plain = comp.replace(/\u0000/g, '');
      paths.forEach(pth => {
        const dirPath = pth === null ? startDir : (pth === '' ? '/' : pth);
        const join = (n) => pth === null ? n : (pth === '' ? '/' + n : pth + '/' + n);
        if (!hasGlob(comp)) { next.push(join(plain)); return; }
        const r = LX.resolve(w, dirPath, { user: user });
        if (!r.node || r.node.type !== 'd' || !LX.can(w, r.node, 'r', user)) return;
        const re = globToRe(comp);
        const dotOk = plain[0] === '.';
        Object.keys(r.node.children).sort(LX.collate).forEach(n => { if ((n[0] !== '.' || dotOk) && re.test(n)) next.push(join(n)); });
      });
      paths = next;
    });
    return paths.filter(p => p !== null && LX.resolve(w, p, { user: user, nocheck: true }).node);
  }

  // deutsche Sortierung wie bei ls (Groß/Klein ignorieren, Punkte ignorieren)
  LX.collate = function (a, b) {
    const ka = a.replace(/^\.+/, '').toLowerCase(), kb = b.replace(/^\.+/, '').toLowerCase();
    return ka < kb ? -1 : ka > kb ? 1 : (a < b ? -1 : a > b ? 1 : 0);
  };

  // ---------- Expansion ----------
  function expandVars(s, env) {
    return s.replace(/\$(\{([A-Za-z_][A-Za-z0-9_]*)\}|([A-Za-z_][A-Za-z0-9_]*)|\?|\$)/g, (m, all, b, n) => {
      if (m === '$?') return String(env['?'] || 0);
      if (m === '$$') return String(env['$$'] || 2101);
      const k = b || n; return env[k] != null ? env[k] : '';
    });
  }
  function braceExpand(s) {
    const m = /^(.*?)\{([^{}]*,[^{}]*)\}(.*)$/.exec(s);
    if (!m) return [s];
    const out = [];
    m[2].split(',').forEach(alt => braceExpand(m[1] + alt + m[3]).forEach(x => out.push(x)));
    return out;
  }

  function expandWord(sh, segs, user) {
    const w = sh.w, env = sh.env();
    // Brace-Expansion nur bei rein ungequoteten Wörtern
    if (segs.length === 1 && segs[0].q === 0 && /\{[^{}]*,[^{}]*\}/.test(segs[0].s)) {
      let res = [];
      braceExpand(segs[0].s).forEach(b => { res = res.concat(expandWord(sh, [{ s: b, q: 0 }], user)); });
      return res;
    }
    let pat = '', lit = '', globby = false;
    segs.forEach((sg, idx) => {
      let s = sg.s;
      if (sg.q === 0 && idx === 0 && s[0] === '~') {
        const m = /^~([a-z_][a-z0-9_-]*)?(?=\/|$)/.exec(s);
        if (m) {
          const home = m[1] ? (w.users[m[1]] ? w.users[m[1]].home : null) : env.HOME;
          if (home != null) s = home + s.slice(m[0].length);
        }
      }
      if (sg.q !== 1) s = expandVars(s, env);
      lit += s;
      if (sg.q === 0) { pat += s; if (/[*?[]/.test(s)) globby = true; }
      else pat += s.replace(/[\s\S]/g, c => '\u0000' + c);
    });
    if (globby) {
      const m = globExpand(w, pat, user);
      if (m.length) return m;
    }
    if (segs.every(sg => sg.q === 0) && lit === '' ) return [];
    return [lit];
  }

  const ALIASES = { ll: ['ls', '-alF'], la: ['ls', '-A'], l: ['ls', '-CF'] };

  // ---------- Shell ----------
  function Shell(w, term) {
    this.w = w;
    this.term = term;
    this.lastCode = 0;
    this.listeners = [];
    this.busy = false;
    this.sig = { int: false };
    this.nextJob = 1;
  }
  LX.Shell = Shell;

  Shell.prototype.env = function () {
    const w = this.w, u = w.user;
    const e = Object.assign({}, w.env || {});
    e.HOME = LX.homeOf(w, u); e.USER = u; e.LOGNAME = u; e.PWD = w.cwd; e.SHELL = '/bin/bash';
    e.HOSTNAME = w.hostname; e.PATH = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'; e.LANG = 'de_DE.UTF-8';
    e['?'] = this.lastCode; e['$$'] = w.shellPid;
    return e;
  };
  Shell.prototype.prompt = function () {
    const w = this.w;
    const home = LX.homeOf(w, w.user);
    let p = w.cwd;
    if (p === home) p = '~'; else if (home !== '/' && p.indexOf(home + '/') === 0) p = '~' + p.slice(home.length);
    return { user: w.user, host: w.hostname, path: p, sign: w.user === 'root' ? '#' : '$' };
  };
  Shell.prototype.on = function (fn) { this.listeners.push(fn); };
  Shell.prototype.interrupt = function () { this.sig.int = true; };

  Shell.prototype.wait = function (ms) {
    const sig = this.sig;
    if (this.term && this.term.headless) return Promise.resolve(sig.int);
    return new Promise(res => {
      const t0 = Date.now();
      const tick = () => { if (sig.int) return res(true); if (Date.now() - t0 >= ms) return res(false); setTimeout(tick, 40); };
      tick();
    });
  };

  // Hauptausführung einer Eingabezeile
  Shell.prototype.run = async function (line, opts) {
    opts = opts || {};
    const w = this.w;
    const ev = { line: line, cmds: [], code: 0, out: '' };
    const trimmed = line.trim();
    if (trimmed && !opts.silent) { w.history.push(line); }
    if (!trimmed) { this.emit(ev, opts); return ev; }
    // History-Expansion !! und !n
    if (/^!(!|\d+)$/.test(trimmed)) {
      const h = w.history; h.pop();
      const ref = trimmed === '!!' ? h[h.length - 1] : h[parseInt(trimmed.slice(1), 10) - 1];
      if (!ref) { this.write('bash: ' + trimmed + ': Ereignis nicht gefunden\n', ev); ev.code = this.lastCode = 1; this.emit(ev, opts); return ev; }
      this.write(ref + '\n', ev); h.push(ref); line = ref;
    }
    const tk = tokenize(line);
    if (tk.err) { this.write(tk.err + '\n', ev); ev.code = this.lastCode = 2; this.emit(ev, opts); return ev; }
    const ps = parse(tk.toks);
    if (ps.err) { this.write(ps.err + '\n', ev); ev.code = this.lastCode = 2; this.emit(ev, opts); return ev; }
    this.busy = true; this.sig.int = false;
    let code = 0;
    for (let i = 0; i < ps.list.length; i++) {
      const item = ps.list[i];
      const prevOp = i > 0 ? ps.list[i - 1].op : ';';
      if (prevOp === '&&' && code !== 0) continue;
      if (prevOp === '||' && code === 0) continue;
      if (item.op === '&') {
        const words = item.pipe[0].words.map(s => expandWord(this, s, w.user)).reduce((a, b) => a.concat(b), []);
        const job = this.nextJob++;
        const pid = ++w.pidCounter;
        if (words[0] === 'sleep') {
          w.procs.push({ pid: pid, user: w.user, cmd: words.join(' '), cpu: 0, mem: 0, stat: 'S', tty: 'pts/0', start: LX.hhmm(), time: '0:00', vsz: 8256, rss: 1792, job: job });
          this.write('[' + job + '] ' + pid + '\n', ev);
          ev.cmds.push({ name: words[0], argv: words, code: 0, user: w.user, bg: true });
          code = 0; continue;
        }
        this.write('[' + job + '] ' + pid + '\n', ev);
        code = await this.runPipe(item.pipe, ev, opts);
        this.write('[' + job + ']+  Fertig                  ' + line.replace(/&\s*$/, '').trim() + '\n', ev);
        continue;
      }
      code = await this.runPipe(item.pipe, ev, opts);
      if (this.sig.int && code === 130) break;
    }
    this.busy = false; this.sig.int = false;
    ev.code = this.lastCode = code;
    this.emit(ev, opts);
    return ev;
  };

  Shell.prototype.emit = function (ev, opts) {
    ev.out = ev.out.replace(/\x1b\[[0-9;]*m/g, '');
    this.w.log.cmds.push({ line: ev.line, cmds: ev.cmds.map(c => ({ name: c.name, argv: c.argv, code: c.code, user: c.user })), code: ev.code });
    if (this.w.log.cmds.length > 300) this.w.log.cmds.shift();
    if (!opts.silent) this.listeners.forEach(fn => { try { fn(ev); } catch (e) { if (typeof console !== 'undefined') console.error(e); } });
  };

  Shell.prototype.write = function (s, ev) {
    if (ev) ev.out += s;
    if (this.term && !this.silentMode) this.term.write(s);
  };

  // Datei für Umleitung öffnen (wird sofort angelegt/geleert)
  Shell.prototype.openOut = function (path, append, user) {
    const w = this.w;
    if (path === '/dev/null') return { devnull: true };
    const rp = LX.resolveParent(w, path, { user: user });
    if (rp.err) return { err: 'bash: ' + path + ': ' + LX.ERR[rp.err] };
    if (rp.node) {
      if (rp.node.type === 'd') return { err: 'bash: ' + path + ': ' + LX.ERR.EISDIR };
      if (rp.node.type === 'c') return { devnull: true };
      if (!LX.can(w, rp.node, 'w', user)) return { err: 'bash: ' + path + ': ' + LX.ERR.EACCES };
      if (!append) { rp.node.data = ''; delete rp.node.blob; delete rp.node.size; }
      rp.node.mtime = Date.now();
      return { node: rp.node };
    }
    if (!LX.can(w, rp.parent, 'w', user)) return { err: 'bash: ' + path + ': ' + LX.ERR.EACCES };
    const n = LX.mkNode('f', { owner: user, group: w.users[user].group, mode: 0o664 & ~0o002 });
    n.mode = user === 'root' ? 0o644 : 0o664;
    rp.parent.children[rp.name] = n;
    rp.parent.mtime = Date.now();
    return { node: n };
  };

  Shell.prototype.runPipe = async function (pipe, ev, opts, userOverride) {
    const w = this.w;
    const user = userOverride || w.user;
    let stdin = null, code = 0;
    const pipeArgv = pipe.length > 1 ? pipe.map(c => { let a = []; c.words.forEach(s => { a = a.concat(expandWord(this, s, user)); }); return a; }) : null;
    for (let si = 0; si < pipe.length; si++) {
      const c = pipe[si];
      const isLast = si === pipe.length - 1;
      // Wörter expandieren
      let argv = [];
      for (const segs of c.words) argv = argv.concat(expandWord(this, segs, user));
      // Variablenzuweisung
      if (argv.length === 1 && /^[A-Za-z_][A-Za-z0-9_]*=/.test(argv[0]) && !c.redirs.length) {
        const k = argv[0].indexOf('='); w.env[argv[0].slice(0, k)] = argv[0].slice(k + 1); code = 0; continue;
      }
      if (argv.length && ALIASES[argv[0]]) argv = ALIASES[argv[0]].concat(argv.slice(1));
      // Umleitungen
      let outTarget = null, errTarget = null, err2out = false, redirErr = null;
      for (const r of c.redirs) {
        if (r.op === '2>&1') { err2out = true; continue; }
        const tw = expandWord(this, r.target, user);
        if (tw.length !== 1) { redirErr = 'bash: ' + r.target.map(s => s.s).join('') + ': Mehrdeutige Umlenkung'; break; }
        const p = tw[0];
        if (r.op === '<') {
          const rr = LX.resolve(w, p, { user: user });
          if (rr.err) { redirErr = 'bash: ' + p + ': ' + LX.ERR[rr.err]; break; }
          if (rr.node.type === 'd') { redirErr = 'bash: ' + p + ': ' + LX.ERR.EISDIR; break; }
          if (!LX.can(w, rr.node, 'r', user)) { redirErr = 'bash: ' + p + ': ' + LX.ERR.EACCES; break; }
          stdin = rr.node.type === 'c' ? '' : LX.fileText(rr.node);
          continue;
        }
        const o = this.openOut(p, r.op === '>>' || r.op === '2>>' || r.op === '&>>', user);
        if (o.err) { redirErr = o.err; break; }
        if (r.op === '>' || r.op === '>>') outTarget = o;
        else if (r.op === '2>' || r.op === '2>>') errTarget = o;
        else { outTarget = o; errTarget = o; }
      }
      if (redirErr) { this.write(redirErr + '\n', ev); code = 1; stdin = ''; continue; }
      if (!argv.length) { code = 0; continue; }

      let outBuf = '', errBuf = '';
      const tty = isLast && !outTarget;
      const self = this;
      const outFn = (s) => {
        if (!s) return;
        if (outTarget) { if (!outTarget.devnull) outBuf += s; }
        else if (!isLast) outBuf += s;
        else self.write(s, ev);
      };
      const errFn = (s) => {
        if (!s) return;
        if (errTarget) { if (!errTarget.devnull) errBuf += s; }
        else if (err2out) outFn(s);
        else self.write(s, ev);
      };
      const ctx = {
        w: w, sh: this, argv: argv, name: argv[0], user: user, stdin: stdin, isTTY: tty,
        out: outFn, err: errFn, term: this.term, headless: !!(this.term && this.term.headless),
        cols: (this.term && this.term.cols) ? this.term.cols() : 100,
        wait: (ms) => this.wait(ms), sig: this.sig, opts: opts, ev: ev,
        pipeOthers: pipeArgv ? pipeArgv.filter((x, i) => i !== si) : []
      };
      w.pidCounter += 1 + Math.floor(Math.random() * 3);
      code = await this.exec(ctx);
      ev.cmds.push({ name: argv[0], argv: argv, code: code, user: user });
      if (outTarget && outTarget.node) { outTarget.node.data = (outTarget.node.data || '') + outBuf; outTarget.node.mtime = Date.now(); }
      if (errTarget && errTarget.node) { errTarget.node.data = (errTarget.node.data || '') + errBuf; }
      stdin = (!isLast && !outTarget) ? outBuf : (isLast ? null : '');
      if (this.sig.int) { code = code || 130; }
    }
    return code;
  };

  const CNF = {
    ifconfig: 'net-tools', route: 'net-tools', netstat: 'net-tools', arp: 'net-tools', tree: 'tree', lpr: 'cups-bsd', lpq: 'cups-bsd', lprm: 'cups-bsd', vim: 'vim', mc: 'mc', htop: 'htop', '7z': '7zip', rar: 'rar', unrar: 'unrar', traceroute: 'traceroute', nslookup: 'bind9-dnsutils', dig: 'bind9-dnsutils'
  };

  Shell.prototype.exec = async function (ctx) {
    const name = ctx.argv[0];
    const fn = LX.CMDS[name];
    if (!fn) {
      if (name.indexOf('/') >= 0) {
        const r = LX.resolve(ctx.w, name, { user: ctx.user });
        if (r.err) { ctx.err('bash: ' + name + ': ' + LX.ERR[r.err] + '\n'); return 127; }
        if (r.node.type === 'd') { ctx.err('bash: ' + name + ': ' + LX.ERR.EISDIR + '\n'); return 126; }
        if (!LX.can(ctx.w, r.node, 'x', ctx.user)) { ctx.err('bash: ' + name + ': ' + LX.ERR.EACCES + '\n'); return 126; }
        return LX.runScript(ctx, r.node, name);
      }
      if (CNF[name]) { ctx.err("Befehl '" + name + "' nicht gefunden, kann aber installiert werden mit:\nsudo apt install " + CNF[name] + '\n'); return 127; }
      ctx.err(name + ': Befehl nicht gefunden\n');
      return 127;
    }
    try {
      const r = await fn(ctx);
      return typeof r === 'number' ? r : 0;
    } catch (e) {
      if (typeof console !== 'undefined') console.error(e);
      ctx.err(name + ': interner Fehler der Simulation (' + (e && e.message) + ')\n');
      return 1;
    }
  };

  LX.hhmm = function () { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
})(typeof window !== 'undefined' ? window : globalThis);
