/* Linux-Simulation – Befehle (coreutils, findutils, grep, procps, Archive, sudo …) */
(function (G) {
  'use strict';
  const LX = (G.LX = G.LX || {});
  const C = (LX.CMDS = LX.CMDS || {});
  const E = LX.ERR;

  // ---------- Hilfen ----------
  function q(s) { return '\u201E' + s + '\u201C'; }
  function hint(name) { return '\u201E' + name + ' --help\u201C liefert weitere Informationen.\n'; }
  function getopt(ctx, spec) {
    const r = { o: {}, args: [] };
    const a = ctx.argv.slice(1);
    let endOpts = false;
    const bad = (msg) => { ctx.err(ctx.name + ': ' + msg + '\n' + hint(ctx.name)); r.err = true; return r; };
    for (let i = 0; i < a.length; i++) {
      const s = a[i];
      if (endOpts || s === '-' || s[0] !== '-') { r.args.push(s); continue; }
      if (s === '--') { endOpts = true; continue; }
      if (s.slice(0, 2) === '--') {
        const eq = s.indexOf('=');
        const k = (eq > 0 ? s.slice(2, eq) : s.slice(2)), v = eq > 0 ? s.slice(eq + 1) : undefined;
        if (spec.long && k in spec.long) { r.o[spec.long[k]] = v !== undefined ? v : true; continue; }
        if (spec.longv && k in spec.longv) { const val = v !== undefined ? v : a[++i]; if (val === undefined) return bad('Option ' + q('--' + k) + ' erfordert ein Argument'); r.o[spec.longv[k]] = val; continue; }
        if (spec.ignore && spec.ignore.indexOf(k) >= 0) continue;
        return bad('Nicht erkannte Option ' + q(s));
      }
      if (spec.num && /^-\d+$/.test(s)) { r.o[spec.num] = s.slice(1); continue; }
      for (let j = 1; j < s.length; j++) {
        const c = s[j];
        if ((spec.v || '').indexOf(c) >= 0) {
          const val = s.slice(j + 1) || a[++i];
          if (val === undefined) return bad('Option verlangt ein Argument -- ' + q(c));
          r.o[c] = val; break;
        }
        if ((spec.f || '').indexOf(c) >= 0) { r.o[c] = true; continue; }
        return bad('Ungültige Option -- ' + q(c));
      }
    }
    return r;
  }
  LX.getopt = getopt;

  LX.updateDisks = function (w) {
    w.disks.forEach(x => {
      if (!x.dyn) return;
      const n = LX.getNode(w, x.mount);
      const bytes = n ? treeSize(n) : 0;
      x.used = x.base + Math.ceil(bytes / 1024);
      x.avail = Math.max(0, Math.round(x.size * 0.95) - x.used);
    });
  };
  function fileText(n) {
    if (n.type === 'c') return '';
    if (n.bin) return '\u007fELF\u0002\u0001\u0001' + LX.binaryNoise('elf' + (n.size || 0), 300) + '\n';
    if (n.blob) return LX.binaryNoise(JSON.stringify(n.blob).slice(0, 60), Math.min(LX.sizeOf(n), 420)) + '\n';
    return n.data || '';
  }
  LX.fileText = fileText;
  const W = (ctx) => ctx.w;
  const U = (ctx) => ctx.w.users[ctx.user];
  function grp(ctx) { return U(ctx).group; }
  function newMode(ctx, base) { return ctx.user === 'root' ? base & ~0o022 : base & ~0o002; }
  function touchDir(n) { n.mtime = Date.now(); }

  function human(b) {
    if (b < 1024) return String(b);
    const u = ['K', 'M', 'G', 'T'];
    let v = b / 1024, i = 0;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    if (v < 10) { v = Math.ceil(v * 10) / 10; if (v >= 10) return '10' + u[i]; return v.toFixed(1).replace('.', ',') + u[i]; }
    return Math.ceil(v) + u[i];
  }
  LX.human = human;

  function readable(ctx, path, cmd) {
    const r = LX.resolve(W(ctx), path, { user: ctx.user });
    if (r.err) { ctx.err(cmd + ': ' + path + ': ' + E[r.err] + '\n'); return null; }
    if (r.node.type === 'd') { ctx.err(cmd + ': ' + path + ': ' + E.EISDIR + '\n'); return null; }
    if (!LX.can(W(ctx), r.node, 'r', ctx.user)) { ctx.err(cmd + ': ' + path + ': ' + E.EACCES + '\n'); return null; }
    return r.node;
  }
  function inputs(ctx, args, cmd) {
    // liefert [{name, text}] aus Dateien oder stdin
    if (!args.length || (args.length === 1 && args[0] === '-')) return { list: [{ name: null, text: ctx.stdin || '' }], code: 0 };
    const list = []; let code = 0;
    args.forEach(a => { if (a === '-') { list.push({ name: '-', text: ctx.stdin || '' }); return; } const n = readable(ctx, a, cmd); if (n) list.push({ name: a, text: fileText(n) }); else code = cmd === 'grep' ? 2 : 1; });
    return { list, code };
  }
  function lines(t) { if (t === '') return []; const l = t.split('\n'); if (l[l.length - 1] === '') l.pop(); return l; }

  // ---------- ls ----------
  const ARCH = /\.(tar|tgz|gz|bz2|xz|zip|tbz2|txz|7z|rar)$/;
  function colorOf(name, n) {
    if (n.type === 'd') { if ((n.mode & 0o1002) === 0o1002) return '30;42'; if (n.mode & 0o002) return '34;42'; return '01;34'; }
    if (n.type === 'c') return '40;33;01';
    if (n.mode & 0o111) return '01;32';
    if (ARCH.test(name)) return '01;31';
    return null;
  }
  function quoteName(s) { return /[\s'"$*?\\|&;<>()]/.test(s) ? (s.indexOf("'") >= 0 ? '"' + s + '"' : "'" + s + "'") : s; }
  function suffix(n, F) { if (!F) return ''; if (n.type === 'd') return '/'; if (n.mode & 0o111) return '*'; return ''; }
  function nameOut(name, n, o, tty) {
    const s = quoteName(name);
    const col = (tty && o.color !== 'never') ? colorOf(name, n) : null;
    return { txt: (col ? '\x1b[' + col + 'm' + s + '\x1b[0m' : s) + suffix(n, o.F), len: s.length + suffix(n, o.F).length };
  }
  function columns(items, width) {
    if (!items.length) return '';
    const n = items.length;
    for (let cols = Math.min(n, Math.max(1, Math.floor(width / 3))); cols >= 1; cols--) {
      const rows = Math.ceil(n / cols);
      const realCols = Math.ceil(n / rows);
      const ws = [];
      for (let c = 0; c < realCols; c++) { let m = 0; for (let r = 0; r < rows; r++) { const it = items[c * rows + r]; if (it && it.len > m) m = it.len; } ws.push(m); }
      const total = ws.reduce((s, x) => s + x, 0) + 2 * (realCols - 1);
      if (total <= width || cols === 1) {
        let out = '';
        for (let r = 0; r < rows; r++) {
          let line = '';
          for (let c = 0; c < realCols; c++) {
            const it = items[c * rows + r]; if (!it) continue;
            const last = c === realCols - 1 || !items[(c + 1) * rows + r];
            line += it.txt + (last ? '' : ' '.repeat(ws[c] - it.len + 2));
          }
          out += line + '\n';
        }
        return out;
      }
    }
    return '';
  }
  function linkCount(n) { if (n.type !== 'd') return 1; let c = 2; for (const k in n.children) if (n.children[k].type === 'd') c++; return c; }
  function blocks(n) { if (n.type === 'd') return 4; if (n.type === 'c') return 0; const s = LX.sizeOf(n); return Math.ceil(s / 4096) * 4; }
  function longLines(ctx, entries, o, tty) {
    const rows = entries.map(e => ({ m: LX.modeStr(e.n), l: String(linkCount(e.n)), u: e.n.owner, g: e.n.group, s: e.n.type === 'c' ? '1, 3' : (o.h ? human(LX.sizeOf(e.n)) : String(LX.sizeOf(e.n))), d: LX.lsDate(e.n.mtime), name: nameOut(e.name, e.n, o, tty).txt }));
    const w = (k) => rows.reduce((m, r) => Math.max(m, r[k].length), 0);
    const wl = w('l'), wu = w('u'), wg = w('g'), ws = w('s'), wd = w('d');
    return rows.map(r => r.m + ' ' + r.l.padStart(wl) + ' ' + r.u.padEnd(wu) + ' ' + r.g.padEnd(wg) + ' ' + r.s.padStart(ws) + ' ' + r.d.padStart(wd) + ' ' + r.name + '\n').join('');
  }
  function sortEntries(list, o) {
    list.sort((a, b) => LX.collate(a.name, b.name));
    if (o.t) list.sort((a, b) => b.n.mtime - a.n.mtime);
    if (o.S) list.sort((a, b) => LX.sizeOf(b.n) - LX.sizeOf(a.n));
    if (o.r) list.reverse();
    return list;
  }
  C.ls = function (ctx) {
    const g = getopt(ctx, { f: 'alhRFd1trSA', long: { all: 'a', 'almost-all': 'A', 'human-readable': 'h', recursive: 'R', classify: 'F', directory: 'd', reverse: 'r' }, longv: { color: 'color' }, ignore: [] });
    if (g.err) return 2;
    const o = g.o; const w = W(ctx); const tty = ctx.isTTY;
    if (o.color === true || o.color === 'auto') o.color = tty ? 'auto' : 'never';
    if (o.color === undefined) o.color = tty ? 'auto' : 'never';
    const args = g.args.length ? g.args : ['.'];
    let code = 0;
    const files = [], dirs = [];
    args.forEach(a => {
      const r = LX.resolve(w, a, { user: ctx.user });
      if (r.err) { ctx.err('ls: Zugriff auf \'' + a + '\' nicht möglich: ' + E[r.err] + '\n'); code = 2; return; }
      if (r.node.type === 'd' && !o.d) dirs.push({ name: a, n: r.node, path: LX.joinAbs(r.parts) });
      else files.push({ name: a, n: r.node });
    });
    let out = '';
    const width = ctx.cols || 100;
    const fmt = (list) => {
      if (o.l) return longLines(ctx, list, o, tty);
      const items = list.map(e => nameOut(e.name, e.n, o, tty));
      if (!tty || o['1']) return items.map(i => i.txt + '\n').join('');
      return columns(items, width);
    };
    if (files.length) { out += fmt(sortEntries(files, o)); }
    const showHeader = args.length > 1 || o.R;
    let first = !files.length;
    const doDir = (d, label) => {
      if (!LX.can(w, d.n, 'r', ctx.user)) {
        ctx.out(out); out = '';
        ctx.err('ls: Öffnen von Verzeichnis \'' + label + '\' nicht möglich: ' + E.EACCES + '\n'); code = 2; return;
      }
      if (showHeader) out += (first ? '' : '\n') + label + ':\n';
      first = false;
      let list = Object.keys(d.n.children).filter(k => o.a || o.A || k[0] !== '.').map(k => ({ name: k, n: d.n.children[k] }));
      if (o.a) { list.push({ name: '.', n: d.n }); list.push({ name: '..', n: LX.getNode(w, LX.joinAbs(LX.splitAbs(w, d.path + '/..', '/'))) || d.n }); }
      list = sortEntries(list, o);
      if (o.l) out += 'insgesamt ' + list.reduce((s, e) => s + blocks(e.n), 0) + '\n';
      out += fmt(list);
      if (o.R) {
        list.filter(e => e.n.type === 'd' && e.name !== '.' && e.name !== '..').forEach(e => {
          doDir({ n: e.n, path: d.path + '/' + e.name }, label.replace(/\/$/, '') + '/' + e.name);
        });
      }
    };
    sortEntries(dirs, o).forEach(d => doDir(d, d.name));
    ctx.out(out);
    return code;
  };
  C.dir = C.ls;

  // ---------- Navigation ----------
  C.cd = function (ctx) {
    const w = W(ctx);
    let t = ctx.argv[1];
    if (ctx.argv.length > 2) { ctx.err('bash: cd: Zu viele Argumente.\n'); return 1; }
    if (t === undefined || t === '~') t = LX.homeOf(w, ctx.user);
    if (t === '-') { t = w.oldpwd || w.cwd; ctx.out(t + '\n'); }
    const r = LX.resolve(w, t, { user: ctx.user });
    if (r.err) { ctx.err('bash: cd: ' + t + ': ' + E[r.err] + '\n'); return 1; }
    if (r.node.type !== 'd') { ctx.err('bash: cd: ' + t + ': ' + E.ENOTDIR + '\n'); return 1; }
    if (!LX.can(w, r.node, 'x', ctx.user)) { ctx.err('bash: cd: ' + t + ': ' + E.EACCES + '\n'); return 1; }
    w.oldpwd = w.cwd;
    w.cwd = LX.joinAbs(r.parts);
    return 0;
  };
  C.pwd = function (ctx) { ctx.out(W(ctx).cwd + '\n'); return 0; };

  // ---------- Ausgabe ----------
  C.echo = function (ctx) {
    let a = ctx.argv.slice(1), nl = true, esc = false;
    while (a.length && /^-[neE]+$/.test(a[0])) { if (a[0].indexOf('n') >= 0) nl = false; if (a[0].indexOf('e') >= 0) esc = true; a.shift(); }
    let s = a.join(' ');
    if (esc) s = s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
    ctx.out(s + (nl ? '\n' : ''));
    return 0;
  };
  C.cat = function (ctx) {
    const g = getopt(ctx, { f: 'nA', long: { number: 'n' } });
    if (g.err) return 1;
    const inp = inputs(ctx, g.args, 'cat');
    let s = inp.list.map(x => x.text).join('');
    if (g.o.n) { let i = 0; s = lines(s).map(l => String(++i).padStart(6) + '\t' + l + '\n').join(''); }
    ctx.out(s);
    return inp.code;
  };
  async function pager(ctx, mode) {
    const g = getopt(ctx, { f: 'NRS', ignore: [] });
    if (g.err) return 1;
    const inp = inputs(ctx, g.args, mode);
    if (!inp.list.length) return inp.code;
    let text = inp.list.length > 1 ? inp.list.map(x => '::::::::::::::\n' + x.name + '\n::::::::::::::\n' + x.text).join('') : inp.list[0].text;
    if (!ctx.isTTY || ctx.headless || !ctx.term || !ctx.term.pager) { ctx.out(text); return inp.code; }
    await ctx.term.pager(text, { mode: mode, name: inp.list[0].name || '' });
    return inp.code;
  }
  C.more = (ctx) => pager(ctx, 'more');
  C.less = (ctx) => pager(ctx, 'less');

  function headTail(ctx, tail) {
    const g = getopt(ctx, { f: 'qvf', v: 'nc', num: 'n', longv: { lines: 'n' } });
    if (g.err) return 1;
    if (g.o.f) { ctx.err('tail: Die Option -f (Verfolgen) ist in dieser Simulation nicht verfügbar.\n'); return 1; }
    let n = g.o.n != null ? String(g.o.n) : '10';
    const plus = tail && n[0] === '+';
    const cnt = Math.abs(parseInt(n, 10));
    if (isNaN(cnt)) { ctx.err(ctx.name + ': ungültige Anzahl von Zeilen: ' + q(n) + '\n'); return 1; }
    const inp = inputs(ctx, g.args, ctx.name);
    inp.list.forEach((x, i) => {
      if (inp.list.length > 1) ctx.out((i ? '\n' : '') + '==> ' + x.name + ' <==\n');
      const l = lines(x.text);
      const sel = tail ? (plus ? l.slice(cnt - 1) : l.slice(Math.max(0, l.length - cnt))) : l.slice(0, cnt);
      ctx.out(sel.map(s => s + '\n').join(''));
    });
    return inp.code;
  }
  C.head = (ctx) => headTail(ctx, false);
  C.tail = (ctx) => headTail(ctx, true);

  C.wc = function (ctx) {
    const g = getopt(ctx, { f: 'lwcm', long: { lines: 'l', words: 'w', bytes: 'c', chars: 'm' } });
    if (g.err) return 1;
    let sel = ['l', 'w', 'c'].filter(k => g.o[k]);
    if (g.o.m && !sel.length) sel = ['c'];
    if (!sel.length) sel = ['l', 'w', 'c'];
    const inp = inputs(ctx, g.args, 'wc');
    const rows = inp.list.map(x => ({ l: (x.text.match(/\n/g) || []).length, w: (x.text.match(/\S+/g) || []).length, c: LX.utf8len(x.text), name: x.name }));
    if (rows.length > 1) rows.push({ l: rows.reduce((s, r) => s + r.l, 0), w: rows.reduce((s, r) => s + r.w, 0), c: rows.reduce((s, r) => s + r.c, 0), name: 'insgesamt' });
    const single = sel.length === 1 && rows.length === 1;
    const width = single ? 0 : Math.max(1, ...rows.map(r => String(Math.max(r.l, r.w, r.c)).length), rows.some(r => r.name === null) ? 7 : 0);
    rows.forEach(r => ctx.out(sel.map(k => String(r[k]).padStart(width)).join(' ') + (r.name ? ' ' + r.name : '') + '\n'));
    return inp.code;
  };
  C.sort = function (ctx) {
    const g = getopt(ctx, { f: 'rnuf', long: { reverse: 'r', 'numeric-sort': 'n', unique: 'u', 'ignore-case': 'f' } });
    if (g.err) return 2;
    const inp = inputs(ctx, g.args, 'sort');
    let l = [].concat.apply([], inp.list.map(x => lines(x.text)));
    if (g.o.n) l.sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0) || LX.collate(a, b));
    else l.sort((a, b) => { const x = a.toLowerCase(), y = b.toLowerCase(); return x < y ? -1 : x > y ? 1 : (a < b ? -1 : a > b ? 1 : 0); });
    if (g.o.r) l.reverse();
    if (g.o.u) l = l.filter((x, i) => i === 0 || (g.o.f ? x.toLowerCase() !== l[i - 1].toLowerCase() : x !== l[i - 1]));
    ctx.out(l.map(s => s + '\n').join(''));
    return inp.code;
  };
  C.uniq = function (ctx) {
    const g = getopt(ctx, { f: 'cdi' });
    if (g.err) return 1;
    const inp = inputs(ctx, g.args.slice(0, 1), 'uniq');
    const l = lines(inp.list.map(x => x.text).join(''));
    const out = [];
    l.forEach(x => { const last = out[out.length - 1]; if (last && (g.o.i ? last.s.toLowerCase() === x.toLowerCase() : last.s === x)) last.c++; else out.push({ s: x, c: 1 }); });
    out.filter(x => !g.o.d || x.c > 1).forEach(x => ctx.out((g.o.c ? String(x.c).padStart(7) + ' ' : '') + x.s + '\n'));
    return inp.code;
  };

  // ---------- grep ----------
  function breToRe(p, ext) {
    if (ext) return p;
    // Basic RE: + ? | ( ) { } sind wörtlich, \+ \? \| \( \) sind Operatoren
    let r = '';
    for (let i = 0; i < p.length; i++) {
      const c = p[i];
      if (c === '\\' && i + 1 < p.length) { const n = p[i + 1]; if ('+?|(){}'.indexOf(n) >= 0) r += n; else r += '\\' + n; i++; continue; }
      if ('+?|(){}'.indexOf(c) >= 0) r += '\\' + c; else r += c;
    }
    return r;
  }
  C.grep = function (ctx) {
    const g = getopt(ctx, { f: 'ivncrRlwEFoshH', v: 'e', long: { 'ignore-case': 'i', 'invert-match': 'v', 'line-number': 'n', count: 'c', recursive: 'r', 'files-with-matches': 'l', 'word-regexp': 'w', 'extended-regexp': 'E', 'fixed-strings': 'F', 'only-matching': 'o', 'no-messages': 's' }, longv: { color: 'color', colour: 'color' } });
    if (g.err) return 2;
    const o = g.o; const w = W(ctx);
    let args = g.args.slice();
    let pat = o.e != null ? o.e : args.shift();
    if (pat == null) { ctx.err('Aufruf: grep [OPTION]… MUSTER [DATEI]…\n' + hint('grep')); return 2; }
    let src = o.F ? pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : breToRe(pat, o.E);
    if (o.w) src = '(?<![\\wäöüÄÖÜß])(?:' + src + ')(?![\\wäöüÄÖÜß])';
    let re;
    try { re = new RegExp(src, 'g' + (o.i ? 'i' : '')); } catch (e) { ctx.err('grep: Ungültiger regulärer Ausdruck\n'); return 2; }
    const color = ctx.isTTY && o.color !== 'never';
    const R = o.r || o.R;
    let code = 1, errc = false;
    // Dateiliste
    let files = [];
    if (!args.length) { if (R) args = ['.']; else files.push({ name: null, text: ctx.stdin || '' }); }
    const walk = (path, n, label) => {
      if (n.type === 'd') {
        if (!R) { ctx.err('grep: ' + label + ': ' + E.EISDIR + '\n'); errc = true; return; }
        if (!LX.can(w, n, 'r', ctx.user) || !LX.can(w, n, 'x', ctx.user)) { if (!o.s) ctx.err('grep: ' + label + ': ' + E.EACCES + '\n'); errc = true; return; }
        Object.keys(n.children).sort(LX.collate).forEach(k => walk(path + '/' + k, n.children[k], (label === '.' && !g.args.length ? '' : label.replace(/\/$/, '') + '/') + k));
        return;
      }
      if (n.type === 'c') return;
      if (!LX.can(w, n, 'r', ctx.user)) { if (!o.s) ctx.err('grep: ' + label + ': ' + E.EACCES + '\n'); errc = true; return; }
      if (n.blob) { files.push({ name: label, bin: true, text: fileText(n) }); return; }
      files.push({ name: label, text: n.data || '' });
    };
    args.forEach(a => {
      const r = LX.resolve(w, a, { user: ctx.user });
      if (r.err) { if (!o.s) ctx.err('grep: ' + a + ': ' + E[r.err] + '\n'); errc = true; return; }
      walk(LX.joinAbs(r.parts), r.node, a);
    });
    const multi = files.length > 1 || R;
    const show = (name) => (multi && name != null) ? (color ? '\x1b[35m' + name + '\x1b[36m:\x1b[0m' : name + ':') : '';
    files.forEach(f => {
      const ls = lines(f.text);
      let cnt = 0; let out = '';
      ls.forEach((l, i) => {
        re.lastIndex = 0;
        const m = re.test(l);
        if (m === !o.v) {
          cnt++;
          if (o.c || o.l) return;
          let body = l;
          if (o.o && !o.v) { re.lastIndex = 0; const all = l.match(re) || []; all.forEach(x => { out += show(f.name) + (o.n ? (color ? '\x1b[32m' + (i + 1) + '\x1b[36m:\x1b[0m' : (i + 1) + ':') : '') + (color ? '\x1b[01;31m' + x + '\x1b[0m' : x) + '\n'; }); return; }
          if (color && !o.v) { re.lastIndex = 0; body = l.replace(re, x => '\x1b[01;31m' + x + '\x1b[0m'); }
          out += show(f.name) + (o.n ? (color ? '\x1b[32m' + (i + 1) + '\x1b[36m:\x1b[0m' : (i + 1) + ':') : '') + body + '\n';
        }
      });
      if (cnt) code = 0;
      if (f.bin && cnt && !o.c && !o.l) { ctx.out('grep: ' + (f.name || '(Standardeingabe)') + ': Binärdatei passt\n'); return; }
      if (o.l) { if (cnt) ctx.out((color ? '\x1b[35m' + f.name + '\x1b[0m' : f.name) + '\n'); return; }
      if (o.c) { ctx.out(show(f.name) + cnt + '\n'); return; }
      ctx.out(out);
    });
    return errc && code !== 0 ? 2 : code;
  };
  C.egrep = function (ctx) { ctx.argv = ['grep', '-E'].concat(ctx.argv.slice(1)); return C.grep(ctx); };

  // ---------- find ----------
  C.find = function (ctx) {
    const w = W(ctx);
    const a = ctx.argv.slice(1);
    const paths = [];
    while (a.length && a[0][0] !== '-' && a[0] !== '!' && a[0] !== '(') paths.push(a.shift());
    if (!paths.length) paths.push('.');
    const tests = []; let maxd = Infinity, mind = 0, del = false;
    let neg = false;
    for (let i = 0; i < a.length; i++) {
      const t = a[i]; const v = a[i + 1];
      const need = () => { if (v === undefined) { ctx.err('find: Fehlendes Argument für ' + q(t) + '\n'); throw 1; } i++; return v; };
      try {
        if (t === '!' || t === '-not') { neg = true; continue; }
        let f = null;
        if (t === '-name' || t === '-iname') { const re = LX.globToRe(need()); const ic = t === '-iname'; const re2 = ic ? new RegExp(re.source, 'i') : re; f = (n, nm) => re2.test(nm); }
        else if (t === '-type') { const ty = need(); if ('fdcl'.indexOf(ty) < 0) { ctx.err('find: Unbekanntes Argument für -type: ' + ty + '\n'); return 1; } f = (n) => n.type === ty; }
        else if (t === '-user') { const us = need(); if (!w.users[us]) { ctx.err('find: ' + q(us) + ' ist kein Name eines bekannten Benutzers\n'); return 1; } f = (n) => n.owner === us; }
        else if (t === '-group') { const gg = need(); f = (n) => n.group === gg; }
        else if (t === '-empty') f = (n) => n.type === 'd' ? Object.keys(n.children).length === 0 : LX.sizeOf(n) === 0;
        else if (t === '-maxdepth') { maxd = parseInt(need(), 10); continue; }
        else if (t === '-mindepth') { mind = parseInt(need(), 10); continue; }
        else if (t === '-size') { const sz = need(); const m = /^([+-]?)(\d+)([ckMG]?)$/.exec(sz); if (!m) { ctx.err('find: Ungültiges Argument ' + q(sz) + ' für ' + q('-size') + '\n'); return 1; } const mul = { c: 1, k: 1024, M: 1048576, G: 1073741824, '': 512 }[m[3]]; const lim = parseInt(m[2], 10); f = (n) => { const s = Math.ceil(LX.sizeOf(n) / mul); return m[1] === '+' ? s > lim : m[1] === '-' ? s < lim : s === lim; }; }
        else if (t === '-perm') { const pm = parseInt(need(), 8); f = (n) => (n.mode & 0o7777) === pm; }
        else if (t === '-print') continue;
        else if (t === '-delete') { del = true; continue; }
        else { ctx.err('find: Unbekannte Bedingung ' + q(t) + '\n'); return 1; }
        const fn = f, isNeg = neg; tests.push((n, nm) => isNeg ? !fn(n, nm) : fn(n, nm)); neg = false;
      } catch (e) { return 1; }
    }
    let code = 0;
    const res = [];
    const visit = (n, label, depth) => {
      const nm = label === '/' ? '/' : label.replace(/\/+$/, '').split('/').pop();
      if (depth >= mind && tests.every(t => t(n, nm))) res.push({ label, n });
      if (n.type === 'd' && depth < maxd) {
        if (!LX.can(w, n, 'r', ctx.user) || !LX.can(w, n, 'x', ctx.user)) { ctx.out(''); flush(); ctx.err('find: \'' + label + '\': ' + E.EACCES + '\n'); code = 1; return; }
        Object.keys(n.children).sort(LX.collate).forEach(k => visit(n.children[k], (label === '/' ? '' : label.replace(/\/$/, '')) + '/' + k, depth + 1));
      }
    };
    const flush = () => { if (!del) res.splice(0).forEach(r => ctx.out(r.label + '\n')); };
    paths.forEach(p => {
      const r = LX.resolve(w, p, { user: ctx.user });
      if (r.err) { ctx.err('find: \'' + p + '\': ' + E[r.err] + '\n'); code = 1; return; }
      visit(r.node, p, 0);
    });
    if (del) {
      res.reverse().forEach(r => { const rm = removePath(ctx, r.label, true, true); if (rm) { ctx.err('find: ' + q(r.label) + ' kann nicht gelöscht werden: ' + rm + '\n'); code = 1; } });
    } else flush();
    return code;
  };

  // ---------- Verzeichnisse & Dateien ----------
  C.mkdir = function (ctx) {
    const g = getopt(ctx, { f: 'pv', v: 'm', long: { parents: 'p', verbose: 'v' } });
    if (g.err) return 1;
    if (!g.args.length) { ctx.err('mkdir: Fehlender Operand\n' + hint('mkdir')); return 1; }
    const w = W(ctx); let code = 0;
    g.args.forEach(a => {
      const mk = (path) => {
        const rp = LX.resolveParent(w, path, { user: ctx.user });
        if (rp.err) { if (rp.err === 'EEXIST') return 'EEXIST'; return rp.err; }
        if (rp.node) return 'EEXIST';
        if (!LX.can(w, rp.parent, 'w', ctx.user)) return 'EACCES';
        rp.parent.children[rp.name] = LX.mkNode('d', { owner: ctx.user, group: grp(ctx), mode: g.o.m ? parseInt(g.o.m, 8) : newMode(ctx, 0o777) });
        touchDir(rp.parent);
        if (g.o.v) ctx.out('mkdir: Verzeichnis \'' + path + '\' angelegt\n');
        return null;
      };
      if (g.o.p) {
        const parts = a.split('/'); let cur = a[0] === '/' ? '' : '';
        for (let i = 0; i < parts.length; i++) {
          if (parts[i] === '' && i === 0) { cur = ''; continue; }
          if (parts[i] === '') continue;
          cur = (cur === '' && a[0] === '/') ? '/' + parts[i] : (cur ? cur + '/' + parts[i] : parts[i]);
          const r = LX.resolve(w, cur, { user: ctx.user });
          if (r.node) { if (r.node.type !== 'd') { ctx.err('mkdir: das Verzeichnis \'' + a + '\' kann nicht angelegt werden: ' + E.ENOTDIR + '\n'); code = 1; return; } continue; }
          const e = mk(cur);
          if (e && e !== 'EEXIST') { ctx.err('mkdir: das Verzeichnis \'' + cur + '\' kann nicht angelegt werden: ' + E[e] + '\n'); code = 1; return; }
        }
        return;
      }
      const e = mk(a);
      if (e) { ctx.err('mkdir: das Verzeichnis \'' + a + '\' kann nicht angelegt werden: ' + E[e] + '\n'); code = 1; }
    });
    return code;
  };
  C.rmdir = function (ctx) {
    const g = getopt(ctx, { f: 'pv', long: { parents: 'p', verbose: 'v' } });
    if (g.err) return 1;
    if (!g.args.length) { ctx.err('rmdir: Fehlender Operand\n' + hint('rmdir')); return 1; }
    const w = W(ctx); let code = 0;
    g.args.forEach(a => {
      const rp = LX.resolveParent(w, a, { user: ctx.user });
      const fail = (e) => { ctx.err('rmdir: Entfernen von \'' + a + '\' fehlgeschlagen: ' + E[e] + '\n'); code = 1; };
      if (rp.err) return fail(rp.err === 'EEXIST' ? 'EPERM' : rp.err);
      if (!rp.node) return fail('ENOENT');
      if (rp.node.type !== 'd') return fail('ENOTDIR');
      if (Object.keys(rp.node.children).length) return fail('ENOTEMPTY');
      if (!LX.can(w, rp.parent, 'w', ctx.user)) return fail('EACCES');
      if (rp.parts && LX.joinAbs(rp.parts) === w.cwd) { /* erlaubt, cwd wird verwaist */ }
      delete rp.parent.children[rp.name]; touchDir(rp.parent);
      if (g.o.v) ctx.out('rmdir: Verzeichnis \'' + a + '\' wird entfernt\n');
    });
    return code;
  };
  C.touch = function (ctx) {
    const g = getopt(ctx, { f: 'c' });
    if (g.err) return 1;
    if (!g.args.length) { ctx.err('touch: Fehlender Dateioperand\n' + hint('touch')); return 1; }
    const w = W(ctx); let code = 0;
    g.args.forEach(a => {
      const rp = LX.resolveParent(w, a, { user: ctx.user });
      if (rp.err) { ctx.err('touch: \'' + a + '\' kann nicht berührt werden: ' + E[rp.err === 'EEXIST' ? 'EISDIR' : rp.err] + '\n'); code = 1; return; }
      if (rp.node) {
        if (rp.node.owner !== ctx.user && ctx.user !== 'root' && !LX.can(w, rp.node, 'w', ctx.user)) { ctx.err('touch: \'' + a + '\' kann nicht berührt werden: ' + E.EACCES + '\n'); code = 1; return; }
        rp.node.mtime = Date.now(); return;
      }
      if (g.o.c) return;
      if (!LX.can(w, rp.parent, 'w', ctx.user)) { ctx.err('touch: \'' + a + '\' kann nicht berührt werden: ' + E.EACCES + '\n'); code = 1; return; }
      rp.parent.children[rp.name] = LX.mkNode('f', { owner: ctx.user, group: grp(ctx), mode: newMode(ctx, 0o666), data: '' });
      touchDir(rp.parent);
    });
    return code;
  };

  function isAncestor(aParts, bParts) { if (aParts.length > bParts.length) return false; for (let i = 0; i < aParts.length; i++) if (aParts[i] !== bParts[i]) return false; return true; }

  function copyNode(ctx, n, owner, keep) {
    const c = LX.cloneNode(n);
    const fix = (x) => { if (!keep) { x.owner = owner; x.group = ctx.w.users[owner].group; x.mtime = Date.now(); } if (x.type === 'd') for (const k in x.children) fix(x.children[k]); };
    fix(c);
    return c;
  }
  function canReadTree(ctx, n) {
    if (!LX.can(ctx.w, n, 'r', ctx.user)) return false;
    if (n.type === 'd') { if (!LX.can(ctx.w, n, 'x', ctx.user)) return false; for (const k in n.children) if (!canReadTree(ctx, n.children[k])) return false; }
    return true;
  }

  C.cp = function (ctx) {
    const g = getopt(ctx, { f: 'rRvaipfn', long: { recursive: 'r', verbose: 'v', archive: 'a' } });
    if (g.err) return 1;
    const w = W(ctx); const rec = g.o.r || g.o.R || g.o.a;
    const a = g.args;
    if (!a.length) { ctx.err('cp: Fehlende Datei als Operand\n' + hint('cp')); return 1; }
    if (a.length === 1) { ctx.err('cp: Fehlende Zieldatei nach ' + q(a[0]) + '\n' + hint('cp')); return 1; }
    const dest = a[a.length - 1], srcs = a.slice(0, -1);
    const dr = LX.resolve(w, dest, { user: ctx.user });
    const destIsDir = dr.node && dr.node.type === 'd';
    if (srcs.length > 1 && !destIsDir) { ctx.err('cp: Ziel \'' + dest + '\' ist kein Verzeichnis\n'); return 1; }
    let code = 0;
    srcs.forEach(s => {
      const sr = LX.resolve(w, s, { user: ctx.user });
      if (sr.err) { ctx.err('cp: Aufruf von stat für \'' + s + '\' nicht möglich: ' + E[sr.err] + '\n'); code = 1; return; }
      const base = sr.parts.length ? sr.parts[sr.parts.length - 1] : '/';
      const tgt = destIsDir ? dest.replace(/\/$/, '') + '/' + base : dest;
      if (sr.node.type === 'd' && !rec) { ctx.err('cp: -r nicht angegeben; Verzeichnis \'' + s + '\' wird nicht kopiert\n'); code = 1; return; }
      const tp = LX.resolveParent(w, tgt, { user: ctx.user });
      if (tp.err) { ctx.err('cp: \'' + tgt + '\' kann nicht angelegt werden: ' + E[tp.err] + '\n'); code = 1; return; }
      if (tp.node === sr.node) { ctx.err('cp: \'' + s + '\' und \'' + tgt + '\' sind die gleiche Datei\n'); code = 1; return; }
      if (sr.node.type === 'd' && isAncestor(sr.parts, tp.parts)) { ctx.err('cp: Ein Verzeichnis \'' + s + '\' kann nicht in sich selbst \'' + tgt + '\' kopiert werden\n'); code = 1; return; }
      if (!canReadTree(ctx, sr.node)) { ctx.err('cp: \'' + s + '\' kann nicht zum Lesen geöffnet werden: ' + E.EACCES + '\n'); code = 1; return; }
      if (tp.node) {
        if (tp.node.type === 'd' && sr.node.type !== 'd') { ctx.err('cp: Verzeichnis \'' + tgt + '\' kann nicht mit Nicht-Verzeichnis überschrieben werden\n'); code = 1; return; }
        if (tp.node.type !== 'd' && sr.node.type === 'd') { ctx.err('cp: Nicht-Verzeichnis \'' + tgt + '\' kann nicht mit Verzeichnis \'' + s + '\' überschrieben werden\n'); code = 1; return; }
        if (g.o.n) return;
        if (tp.node.type === 'f') {
          if (!LX.can(w, tp.node, 'w', ctx.user)) { ctx.err('cp: reguläre Datei \'' + tgt + '\' kann nicht zum Schreiben geöffnet werden: ' + E.EACCES + '\n'); code = 1; return; }
          tp.node.data = sr.node.data; if (sr.node.blob) tp.node.blob = JSON.parse(JSON.stringify(sr.node.blob)); else delete tp.node.blob; tp.node.mtime = Date.now();
          if (g.o.v) ctx.out('\'' + s + '\' -> \'' + tgt + '\'\n');
          return;
        }
        // Verzeichnis in bestehendes Verzeichnis mischen
        const merge = (src, dst, lbl) => { Object.keys(src.children).forEach(k => { const c = src.children[k]; if (c.type === 'd' && dst.children[k] && dst.children[k].type === 'd') merge(c, dst.children[k], lbl + '/' + k); else dst.children[k] = copyNode(ctx, c, ctx.user, g.o.a || g.o.p); }); };
        if (!LX.can(w, tp.node, 'w', ctx.user)) { ctx.err('cp: \'' + tgt + '\' kann nicht angelegt werden: ' + E.EACCES + '\n'); code = 1; return; }
        merge(sr.node, tp.node, tgt); return;
      }
      if (!LX.can(w, tp.parent, 'w', ctx.user)) { ctx.err('cp: ' + (sr.node.type === 'd' ? 'Verzeichnis' : 'reguläre Datei') + ' \'' + tgt + '\' kann nicht angelegt werden: ' + E.EACCES + '\n'); code = 1; return; }
      tp.parent.children[tp.name] = copyNode(ctx, sr.node, ctx.user, g.o.a || g.o.p);
      touchDir(tp.parent);
      if (g.o.v) ctx.out('\'' + s + '\' -> \'' + tgt + '\'\n');
    });
    return code;
  };

  C.mv = function (ctx) {
    const g = getopt(ctx, { f: 'vfin', long: { verbose: 'v', force: 'f' } });
    if (g.err) return 1;
    const w = W(ctx); const a = g.args;
    if (!a.length) { ctx.err('mv: Fehlender Dateioperand\n' + hint('mv')); return 1; }
    if (a.length === 1) { ctx.err('mv: Fehlende Zieldatei nach ' + q(a[0]) + '\n' + hint('mv')); return 1; }
    const dest = a[a.length - 1], srcs = a.slice(0, -1);
    const dr = LX.resolve(w, dest, { user: ctx.user });
    const destIsDir = dr.node && dr.node.type === 'd';
    if (srcs.length > 1 && !destIsDir) { ctx.err('mv: Ziel \'' + dest + '\' ist kein Verzeichnis\n'); return 1; }
    let code = 0;
    srcs.forEach(s => {
      const sp = LX.resolveParent(w, s, { user: ctx.user });
      if (sp.err || !sp.node) { ctx.err('mv: Aufruf von stat für \'' + s + '\' nicht möglich: ' + E[sp.err && sp.err !== 'EEXIST' ? sp.err : 'ENOENT'] + '\n'); code = 1; return; }
      const tgt = destIsDir ? dest.replace(/\/$/, '') + '/' + sp.name : dest;
      const tp = LX.resolveParent(w, tgt, { user: ctx.user });
      if (tp.err) { ctx.err('mv: \'' + s + '\' kann nicht nach \'' + tgt + '\' verschoben werden: ' + E[tp.err] + '\n'); code = 1; return; }
      if (tp.node === sp.node) { ctx.err('mv: \'' + s + '\' und \'' + tgt + '\' sind die gleiche Datei\n'); code = 1; return; }
      if (sp.node.type === 'd' && isAncestor(sp.parts, tp.parts)) { ctx.err('mv: \'' + s + '\' kann nicht in ein Unterverzeichnis von sich selbst, \'' + tgt + '\', verschoben werden\n'); code = 1; return; }
      if (!LX.can(w, sp.parent, 'w', ctx.user) || !LX.can(w, tp.parent, 'w', ctx.user)) { ctx.err('mv: \'' + s + '\' kann nicht nach \'' + tgt + '\' verschoben werden: ' + E.EACCES + '\n'); code = 1; return; }
      if ((sp.parent.mode & 0o1000) && ctx.user !== 'root' && sp.node.owner !== ctx.user && sp.parent.owner !== ctx.user) { ctx.err('mv: \'' + s + '\' kann nicht nach \'' + tgt + '\' verschoben werden: ' + E.EPERM + '\n'); code = 1; return; }
      if (tp.node) {
        if (tp.node.type === 'd' && sp.node.type !== 'd') { ctx.err('mv: Verzeichnis \'' + tgt + '\' kann nicht mit Nicht-Verzeichnis überschrieben werden\n'); code = 1; return; }
        if (tp.node.type === 'd' && Object.keys(tp.node.children).length) { ctx.err('mv: \'' + s + '\' kann nicht nach \'' + tgt + '\' verschoben werden: ' + E.ENOTEMPTY + '\n'); code = 1; return; }
        if (g.o.n) return;
      }
      delete sp.parent.children[sp.name];
      tp.parent.children[tp.name] = sp.node;
      touchDir(sp.parent); touchDir(tp.parent);
      if (g.o.v) ctx.out('umbenannt \'' + s + '\' -> \'' + tgt + '\'\n');
      // Arbeitsverzeichnis mitverschieben, falls betroffen
      if (sp.node.type === 'd') {
        const oldAbs = LX.joinAbs(sp.parts), newAbs = LX.joinAbs(tp.parts);
        if (w.cwd === oldAbs || w.cwd.indexOf(oldAbs + '/') === 0) w.cwd = newAbs + w.cwd.slice(oldAbs.length);
      }
    });
    return code;
  };

  // gibt Fehlertext oder null zurück
  function removePath(ctx, path, recursive, force) {
    const w = W(ctx);
    const rp = LX.resolveParent(w, path, { user: ctx.user });
    if (rp.err) return E[rp.err === 'EEXIST' ? 'EPERM' : rp.err];
    if (!rp.node) return force ? null : E.ENOENT;
    if (rp.node.type === 'd' && !recursive) return E.EISDIR;
    if (!LX.can(w, rp.parent, 'w', ctx.user)) return E.EACCES;
    if ((rp.parent.mode & 0o1000) && ctx.user !== 'root' && rp.node.owner !== ctx.user && rp.parent.owner !== ctx.user) return E.EPERM;
    if (rp.node.type === 'd') {
      if (!LX.can(w, rp.node, 'w', ctx.user) && Object.keys(rp.node.children).length) return E.EACCES;
      for (const k of Object.keys(rp.node.children)) { const e = removePath(ctx, path.replace(/\/$/, '') + '/' + k, true, force); if (e) return e; }
    }
    delete rp.parent.children[rp.name]; touchDir(rp.parent);
    return null;
  }
  C.rm = async function (ctx) {
    const g = getopt(ctx, { f: 'rRfivd', long: { recursive: 'r', force: 'f', verbose: 'v', 'no-preserve-root': 'NPR', interactive: 'i' } });
    if (g.err) return 1;
    const w = W(ctx); const rec = g.o.r || g.o.R;
    if (!g.args.length) { if (g.o.f) return 0; ctx.err('rm: Fehlender Operand\n' + hint('rm')); return 1; }
    let code = 0;
    for (const a of g.args) {
      const abs = LX.absPath(w, a);
      if (abs === '/' && rec) { ctx.err('rm: es ist gefährlich, rekursiv auf \'/\' zu arbeiten\nrm: verwenden Sie --no-preserve-root, um diese Sicherheitsmaßnahme zu umgehen\n'); code = 1; continue; }
      if (/(^|\/)\.\.?\/?$/.test(a)) { ctx.err('rm: das Entfernen der Verzeichnisse \'.\' oder \'..\' ist nicht erlaubt: \'' + a + '\' wird übersprungen\n'); code = 1; continue; }
      const r = LX.resolve(w, a, { user: ctx.user });
      if (r.node && r.node.type === 'd' && g.o.d && !rec && Object.keys(r.node.children).length === 0) { ctx.argv = ['rmdir', a]; const c2 = C.rmdir(ctx); if (c2) code = 1; continue; }
      // schreibgeschützte Datei: Rückfrage
      if (r.node && r.node.type === 'f' && !g.o.f && !LX.can(w, r.node, 'w', ctx.user) && ctx.term && ctx.term.readLine && ctx.isTTY !== undefined) {
        const ans = ctx.headless ? 'j' : await ctx.term.readLine('rm: schreibgeschützte reguläre Datei \'' + a + '\' entfernen? ');
        if (!/^[jJyY]/.test(ans || '')) continue;
      } else if (g.o.i && r.node) {
        const ans = ctx.headless ? 'j' : await ctx.term.readLine('rm: ' + (r.node.type === 'd' ? 'Verzeichnis' : 'reguläre Datei') + ' \'' + a + '\' entfernen? ');
        if (!/^[jJyY]/.test(ans || '')) continue;
      }
      const e = removePath(ctx, a, rec, g.o.f);
      if (e) { ctx.err('rm: das Entfernen von \'' + a + '\' ist nicht möglich: ' + e + '\n'); code = 1; }
      else if (g.o.v && r.node) ctx.out((r.node.type === 'd' ? 'Verzeichnis ' : '') + '\'' + a + '\' wurde entfernt\n');
    }
    return code;
  };

  // ---------- Rechte ----------
  function applyMode(mode, spec, isDir) {
    if (/^[0-7]{1,4}$/.test(spec)) return parseInt(spec, 8);
    let m = mode;
    for (const part of spec.split(',')) {
      const r = /^([ugoa]*)([-+=])([rwxXt]*)$/.exec(part);
      if (!r) return null;
      let who = r[1] || 'a';
      if (who.indexOf('a') >= 0) who = 'ugo';
      let bits = 0;
      for (const p of r[3]) { if (p === 'r') bits |= 4; if (p === 'w') bits |= 2; if (p === 'x') bits |= 1; if (p === 'X' && (isDir || (mode & 0o111))) bits |= 1; }
      let mask = 0;
      for (const wch of who) { const sh = wch === 'u' ? 6 : wch === 'g' ? 3 : 0; mask |= bits << sh; }
      if (r[3].indexOf('t') >= 0) mask |= 0o1000;
      if (!r[1] && r[2] !== '=') mask &= ~0o002 | (r[2] === '-' ? 0o777 : 0o775) ;
      if (r[2] === '+') m |= mask;
      else if (r[2] === '-') m &= ~mask;
      else { let clr = 0; for (const wch of who) clr |= 7 << (wch === 'u' ? 6 : wch === 'g' ? 3 : 0); m = (m & ~clr) | mask; }
    }
    return m;
  }
  LX.applyMode = applyMode;
  C.chmod = function (ctx) {
    const w = W(ctx);
    let a = ctx.argv.slice(1); let rec = false, verbose = false;
    a = a.filter(x => { if (x === '-R' || x === '--recursive') { rec = true; return false; } if (x === '-v' || x === '--verbose') { verbose = true; return false; } return true; });
    if (!a.length) { ctx.err('chmod: Fehlender Operand\n' + hint('chmod')); return 1; }
    const spec = a.shift();
    if (!a.length) { ctx.err('chmod: Fehlender Operand nach ' + q(spec) + '\n' + hint('chmod')); return 1; }
    if (applyMode(0o644, spec, false) === null) { ctx.err('chmod: ungültiger Modus: ' + q(spec) + '\n' + hint('chmod')); return 1; }
    let code = 0;
    const doIt = (n, label) => {
      if (ctx.user !== 'root' && n.owner !== ctx.user) { ctx.err('chmod: Ändern der Zugriffsrechte von \'' + label + '\': ' + E.EPERM + '\n'); code = 1; return; }
      const old = n.mode;
      n.mode = applyMode(n.mode, spec, n.type === 'd');
      if (verbose) ctx.out('Modus von \'' + label + '\' von ' + old.toString(8).padStart(4, '0') + ' (' + LX.modeStr(Object.assign({}, n, { mode: old })).slice(1) + ') in ' + n.mode.toString(8).padStart(4, '0') + ' (' + LX.modeStr(n).slice(1) + ') geändert\n');
      if (rec && n.type === 'd') Object.keys(n.children).forEach(k => doIt(n.children[k], label.replace(/\/$/, '') + '/' + k));
    };
    a.forEach(p => {
      const r = LX.resolve(w, p, { user: ctx.user });
      if (r.err) { ctx.err('chmod: Zugriff auf \'' + p + '\' nicht möglich: ' + E[r.err] + '\n'); code = 1; return; }
      doIt(r.node, p);
    });
    return code;
  };
  C.chown = function (ctx) {
    const w = W(ctx);
    let a = ctx.argv.slice(1); let rec = false;
    a = a.filter(x => { if (x === '-R') { rec = true; return false; } return true; });
    if (a.length < 2) { ctx.err('chown: Fehlender Operand\n' + hint('chown')); return 1; }
    const spec = a.shift();
    const [us, gr] = spec.split(':');
    if (us && !w.users[us]) { ctx.err('chown: ungültiger Benutzer: ' + q(spec) + '\n'); return 1; }
    if (gr && !w.groups[gr]) { ctx.err('chown: ungültige Gruppe: ' + q(spec) + '\n'); return 1; }
    let code = 0;
    const doIt = (n, label) => {
      if (ctx.user !== 'root') { ctx.err('chown: Ändern des Eigentümers von \'' + label + '\': ' + E.EPERM + '\n'); code = 1; return; }
      if (us) n.owner = us; if (gr) n.group = gr; else if (spec.slice(-1) === ':' && us) n.group = w.users[us].group;
      if (rec && n.type === 'd') Object.keys(n.children).forEach(k => doIt(n.children[k], label + '/' + k));
    };
    a.forEach(p => { const r = LX.resolve(w, p, { user: ctx.user }); if (r.err) { ctx.err('chown: Zugriff auf \'' + p + '\' nicht möglich: ' + E[r.err] + '\n'); code = 1; return; } doIt(r.node, p); });
    return code;
  };
  C.chgrp = function (ctx) {
    const w = W(ctx);
    let a = ctx.argv.slice(1); let rec = false;
    a = a.filter(x => { if (x === '-R') { rec = true; return false; } return true; });
    if (a.length < 2) { ctx.err('chgrp: Fehlender Operand\n' + hint('chgrp')); return 1; }
    const gr = a.shift();
    if (!w.groups[gr]) { ctx.err('chgrp: ungültige Gruppe: ' + q(gr) + '\n'); return 1; }
    let code = 0;
    const doIt = (n, label) => {
      if (ctx.user !== 'root' && (n.owner !== ctx.user || LX.userGroups(w, ctx.user).indexOf(gr) < 0)) { ctx.err('chgrp: Ändern der Gruppe von \'' + label + '\': ' + E.EPERM + '\n'); code = 1; return; }
      n.group = gr;
      if (rec && n.type === 'd') Object.keys(n.children).forEach(k => doIt(n.children[k], label + '/' + k));
    };
    a.forEach(p => { const r = LX.resolve(w, p, { user: ctx.user }); if (r.err) { ctx.err('chgrp: Zugriff auf \'' + p + '\' nicht möglich: ' + E[r.err] + '\n'); code = 1; return; } doIt(r.node, p); });
    return code;
  };

  // ---------- Benutzer ----------
  C.whoami = (ctx) => { ctx.out(ctx.user + '\n'); return 0; };
  C.groups = function (ctx) {
    const w = W(ctx); const a = ctx.argv.slice(1);
    if (!a.length) { ctx.out(LX.userGroups(w, ctx.user).join(' ') + '\n'); return 0; }
    let code = 0;
    a.forEach(u => { if (!w.users[u]) { ctx.err('groups: ' + q(u) + ': Unbekannter Benutzer\n'); code = 1; return; } ctx.out(u + ' : ' + LX.userGroups(w, u).join(' ') + '\n'); });
    return code;
  };
  C.id = function (ctx) {
    const w = W(ctx); const u = ctx.argv[1] && ctx.argv[1][0] !== '-' ? ctx.argv[1] : ctx.user;
    if (!w.users[u]) { ctx.err('id: ' + q(u) + ': Unbekannter Benutzer\n'); return 1; }
    const opt = ctx.argv.find(x => x[0] === '-');
    const gs = LX.userGroups(w, u);
    if (opt === '-u') { ctx.out(w.users[u].uid + '\n'); return 0; }
    if (opt === '-un') { ctx.out(u + '\n'); return 0; }
    if (opt === '-Gn') { ctx.out(gs.join(' ') + '\n'); return 0; }
    const U0 = w.users[u];
    ctx.out('uid=' + U0.uid + '(' + u + ') gid=' + w.groups[U0.group].gid + '(' + U0.group + ') Gruppen=' + gs.map(g => w.groups[g].gid + '(' + g + ')').join(',') + '\n');
    return 0;
  };
  C.who = function (ctx) {
    W(ctx).sessions.forEach(s => ctx.out(s.user.padEnd(8) + ' ' + s.tty.padEnd(12) + ' ' + s.since + (s.from ? ' (' + s.from + ')' : '') + '\n'));
    return 0;
  };
  C.w = function (ctx) { return C.who(ctx); };
  C.finger = function (ctx) {
    const w = W(ctx); const a = ctx.argv.slice(1).filter(x => x[0] !== '-');
    if (!a.length) {
      ctx.out('Login     Name               Tty      Idle  Login Time   Office     Office Phone\n');
      w.sessions.forEach(s => { const u = w.users[s.user]; ctx.out(s.user.padEnd(9) + ' ' + (u.fullname || '').slice(0, 18).padEnd(18) + ' ' + s.tty.padEnd(8) + ' ' + (s.idle || '').padStart(4) + '  ' + s.short.padEnd(12) + ' ' + (u.office || '').padEnd(10) + ' ' + (u.phone || '') + '\n'); });
      return 0;
    }
    let code = 0;
    a.forEach(name => {
      let u = w.users[name] ? name : Object.keys(w.users).find(k => (w.users[k].fullname || '').toLowerCase().split(/\s+/).indexOf(name.toLowerCase()) >= 0);
      if (!u) { ctx.err('finger: ' + name + ': no such user.\n'); code = 1; return; }
      const U0 = w.users[u];
      ctx.out('Login: ' + u.padEnd(31) + 'Name: ' + (U0.fullname || '') + '\n');
      ctx.out('Directory: ' + U0.home.padEnd(27) + 'Shell: ' + U0.shell + '\n');
      if (U0.office || U0.phone) ctx.out('Office: ' + (U0.office || '') + (U0.phone ? ', ' + U0.phone : '') + '\n');
      const s = w.sessions.find(x => x.user === u);
      if (s) ctx.out('On since ' + s.long + ' on ' + s.tty + (s.from ? ' from ' + s.from : '') + '\n' + (s.idle ? '   ' + s.idle + ' idle\n' : ''));
      else ctx.out(U0.lastLogin ? 'Last login ' + U0.lastLogin + '\n' : 'Never logged in.\n');
      ctx.out('No mail.\n');
      const plan = LX.getNode(w, U0.home + '/.plan');
      ctx.out(plan && plan.type === 'f' ? 'Plan:\n' + plan.data : 'No Plan.\n');
    });
    return code;
  };

  // ---------- Hilfe ----------
  C.man = async function (ctx) {
    const a = ctx.argv.slice(1);
    if (a[0] === '-k') { ctx.argv = ['apropos'].concat(a.slice(1)); return C.apropos(ctx); }
    if (a[0] === '-f') { ctx.argv = ['whatis'].concat(a.slice(1)); return C.whatis(ctx); }
    let name = a[0];
    if (/^\d$/.test(name || '') && a[1]) name = a[1];
    if (!name) { ctx.err('Welches Handbuch wollen Sie?\nZum Beispiel versuchen Sie »man man«.\n'); return 1; }
    const p = LX.MAN && LX.MAN[name];
    if (!p) {
      ctx.err('Kein Handbucheintrag für ' + name + ' vorhanden\n');
      if (LX.BUILTIN_HELP && LX.BUILTIN_HELP[name]) ctx.err('(Tipp: ' + name + ' ist in die Shell eingebaut. Versuche »help ' + name + '«.)\n');
      return 16;
    }
    const text = LX.renderMan(name, p);
    if (!ctx.isTTY || ctx.headless || !ctx.term || !ctx.term.pager) { ctx.out(text.replace(/\x1b\[[0-9;]*m/g, '')); return 0; }
    await ctx.term.pager(text, { mode: 'man', name: name + '(' + p.sec + ')' });
    return 0;
  };
  C.apropos = function (ctx) {
    const kw = ctx.argv.slice(1).filter(x => x[0] !== '-');
    if (!kw.length) { ctx.err('apropos was?\n'); return 1; }
    const res = [];
    Object.keys(LX.MAN || {}).sort().forEach(k => {
      const p = LX.MAN[k];
      const hay = (k + ' ' + p.desc + ' ' + (p.keys || '')).toLowerCase();
      if (kw.some(x => hay.indexOf(x.toLowerCase()) >= 0)) res.push(k + ' (' + p.sec + ')');
    });
    if (!res.length) { ctx.err(kw.join(' ') + ': nichts Passendes.\n'); return 16; }
    const width = Math.max.apply(null, res.map(r => r.length)) + 2;
    res.forEach(r => { const k = r.split(' ')[0]; ctx.out(r.padEnd(Math.max(20, width)) + ' - ' + LX.MAN[k].desc + '\n'); });
    return 0;
  };
  C.whatis = function (ctx) {
    let code = 0;
    ctx.argv.slice(1).forEach(k => { const p = (LX.MAN || {})[k]; if (!p) { ctx.err(k + ': nichts Passendes.\n'); code = 16; return; } ctx.out((k + ' (' + p.sec + ')').padEnd(20) + ' - ' + p.desc + '\n'); });
    return code;
  };
  C.help = function (ctx) {
    const H = LX.BUILTIN_HELP || {};
    const n = ctx.argv[1];
    if (!n) { ctx.out('GNU bash, Version 5.2.21(1)-release (x86_64-pc-linux-gnu)\nDiese Shell-Befehle sind intern definiert. Mit »help Name« erhalten Sie\nmehr Informationen zu einem Befehl. Für alle anderen Befehle: »man Befehl«.\n\n ' + Object.keys(H).sort().join('   ') + '\n'); return 0; }
    if (!H[n]) { ctx.err('bash: help: Keine Hilfethemen passen auf »' + n + '«. Versuchen Sie »help help«, »man -k ' + n + '« oder »info ' + n + '«.\n'); return 1; }
    ctx.out(H[n]); return 0;
  };
  C.history = function (ctx) {
    const w = W(ctx);
    if (ctx.argv[1] === '-c') { w.history.length = 0; return 0; }
    const n = parseInt(ctx.argv[1], 10);
    const h = w.history;
    const start = n > 0 ? Math.max(0, h.length - n) : 0;
    for (let i = start; i < h.length; i++) ctx.out(String(i + 1).padStart(5) + '  ' + h[i] + '\n');
    return 0;
  };
  C.clear = function (ctx) { if (ctx.term && ctx.term.clear && ctx.isTTY) ctx.term.clear(); else ctx.out('\x1b[H\x1b[2J'); return 0; };
  C.reset = C.clear;
  C.exit = function (ctx) { ctx.out('Abgemeldet. (In dieser Simulation bleibt das Terminal geöffnet – du bist gleich wieder angemeldet.)\n'); return 0; };
  C.logout = C.exit;
  C.export = function (ctx) { ctx.argv.slice(1).forEach(x => { const k = x.indexOf('='); if (k > 0) ctx.w.env[x.slice(0, k)] = x.slice(k + 1); }); return 0; };
  C.alias = function (ctx) { ctx.out("alias grep='grep --color=auto'\nalias l='ls -CF'\nalias la='ls -A'\nalias ll='ls -alF'\nalias ls='ls --color=auto'\n"); return 0; };
  const BUILTINS = ['cd', 'echo', 'exit', 'export', 'help', 'history', 'pwd', 'kill', 'alias', 'logout', 'jobs', 'type'];
  C.type = function (ctx) {
    let code = 0;
    ctx.argv.slice(1).forEach(n => {
      if (['ll', 'la', 'l'].indexOf(n) >= 0 || n === 'ls' || n === 'grep') { const al = { ll: 'ls -alF', la: 'ls -A', l: 'ls -CF', ls: 'ls --color=auto', grep: 'grep --color=auto' }[n]; ctx.out(n + ' ist ein Alias von »' + al + '«.\n'); return; }
      if (BUILTINS.indexOf(n) >= 0) { ctx.out(n + ' ist eine von der Shell mitgelieferte Funktion.\n'); return; }
      if (C[n]) { ctx.out(n + ' ist /usr/bin/' + n + '\n'); return; }
      ctx.err('bash: type: ' + n + ': Nicht gefunden.\n'); code = 1;
    });
    return code;
  };
  C.which = function (ctx) { let code = 0; ctx.argv.slice(1).forEach(n => { if (C[n] && ['cd', 'help', 'history', 'export', 'alias', 'type', 'exit', 'logout', 'jobs'].indexOf(n) < 0) ctx.out((['ip', 'sudo'].indexOf(n) >= 0 ? '/usr/bin/' : (['ifconfig'].indexOf(n) >= 0 ? '/usr/sbin/' : '/usr/bin/')) + n + '\n'); else code = 1; }); return code; };

  // ---------- System ----------
  C.date = function (ctx) {
    const d = new Date();
    const T = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const p = (x) => String(x).padStart(2, '0');
    const off = -d.getTimezoneOffset();
    const tz = off === 120 ? 'CEST' : off === 60 ? 'CET' : 'UTC';
    ctx.out(T[d.getDay()] + ' ' + d.getDate() + '. ' + LX.MON[d.getMonth()] + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) + ' ' + tz + ' ' + d.getFullYear() + '\n');
    return 0;
  };
  C.hostname = function (ctx) {
    if (ctx.argv[1] === '-I') { const ad = []; W(ctx).net.ifaces.forEach(i => { if (!i.loopback && i.up) i.addrs.forEach(a => ad.push(a.ip)); }); ctx.out(ad.join(' ') + ' \n'); return 0; }
    if (ctx.argv[1] && ctx.argv[1][0] !== '-') { if (ctx.user !== 'root') { ctx.err('hostname: Sie müssen root sein, um den Rechnernamen zu ändern\n'); return 1; } W(ctx).hostname = ctx.argv[1]; return 0; }
    ctx.out(W(ctx).hostname + '\n'); return 0;
  };
  C.uname = function (ctx) {
    const a = ctx.argv[1] || '-s';
    const k = '6.8.0-45-generic';
    if (a === '-a') ctx.out('Linux ' + W(ctx).hostname + ' ' + k + ' #45-Ubuntu SMP PREEMPT_DYNAMIC Fri Aug 30 12:02:04 UTC 2024 x86_64 x86_64 x86_64 GNU/Linux\n');
    else if (a === '-r') ctx.out(k + '\n'); else if (a === '-n') ctx.out(W(ctx).hostname + '\n'); else if (a === '-m') ctx.out('x86_64\n'); else ctx.out('Linux\n');
    return 0;
  };
  C.lsb_release = function (ctx) { ctx.out('No LSB modules are available.\nDistributor ID:\tUbuntu\nDescription:\tUbuntu 24.04.1 LTS\nRelease:\t24.04\nCodename:\tnoble\n'); return 0; };
  C.df = function (ctx) {
    const g = getopt(ctx, { f: 'hTk', long: { 'human-readable': 'h' } });
    if (g.err) return 1;
    const d = W(ctx).disks;
    LX.updateDisks(W(ctx));
    const rows = [g.o.h ? ['Dateisystem', 'Größe', 'Benutzt', 'Verf.', 'Verw%', 'Eingehängt auf'] : ['Dateisystem', '1K-Blöcke', 'Benutzt', 'Verfügbar', 'Verw%', 'Eingehängt auf']];
    let sel = d;
    if (g.args.length) {
      sel = [];
      g.args.forEach(p => { const abs = LX.absPath(W(ctx), p); let best = null; d.forEach(x => { if ((abs === x.mount || abs.indexOf(x.mount === '/' ? '/' : x.mount + '/') === 0) && (!best || x.mount.length > best.mount.length)) best = x; }); if (best && sel.indexOf(best) < 0) sel.push(best); });
    }
    sel.forEach(x => {
      const pct = Math.ceil(100 * x.used / (x.used + x.avail)) + '%';
      rows.push([x.fs, g.o.h ? human(x.size * 1024) : String(x.size), g.o.h ? human(x.used * 1024) : String(x.used), g.o.h ? human(x.avail * 1024) : String(x.avail), pct, x.mount]);
    });
    const ws = [0, 1, 2, 3, 4].map(i => Math.max.apply(null, rows.map(r => r[i].length)));
    rows.forEach((r, ri) => ctx.out(r[0].padEnd(ws[0]) + ' ' + [1, 2, 3, 4].map(i => (ri === 0 && i < 4 ? r[i].padStart(ws[i]) : r[i].padStart(ws[i]))).join(' ') + ' ' + r[5] + '\n'));
    return 0;
  };
  function treeSize(n) { if (n.type === 'd') { let s = 4096; for (const k in n.children) s += treeSize(n.children[k]); return s; } return Math.ceil(LX.sizeOf(n) / 4096) * 4096; }
  C.du = function (ctx) {
    const g = getopt(ctx, { f: 'shac', long: { summarize: 's', 'human-readable': 'h' } });
    if (g.err) return 1;
    const w = W(ctx); const args = g.args.length ? g.args : ['.']; let code = 0;
    const fmt = (b) => g.o.h ? human(b) : String(Math.ceil(b / 1024));
    args.forEach(a => {
      const r = LX.resolve(w, a, { user: ctx.user });
      if (r.err) { ctx.err('du: Zugriff auf \'' + a + '\' nicht möglich: ' + E[r.err] + '\n'); code = 1; return; }
      const walk = (n, lbl) => {
        if (n.type === 'd') {
          if (!LX.can(w, n, 'r', ctx.user)) { ctx.err('du: Verzeichnis \'' + lbl + '\' kann nicht gelesen werden: ' + E.EACCES + '\n'); code = 1; return 4096; }
          let s = 4096;
          Object.keys(n.children).sort(LX.collate).forEach(k => { s += walk(n.children[k], lbl.replace(/\/$/, '') + '/' + k); });
          if (!g.o.s) ctx.out(fmt(s) + '\t' + lbl + '\n');
          return s;
        }
        const s = treeSize(n); if (g.o.a && !g.o.s) ctx.out(fmt(s) + '\t' + lbl + '\n'); return s;
      };
      const tot = walk(r.node, a);
      if (g.o.s || r.node.type !== 'd') ctx.out(fmt(tot) + '\t' + a + '\n');
    });
    return code;
  };
  C.free = function (ctx) { const h = ctx.argv.indexOf('-h') >= 0; ctx.out(h ? '               gesamt       benutzt     frei      gemns.  Puffer/Cache verfügbar\nSpeicher:      3,8Gi       1,1Gi       1,6Gi        12Mi       1,3Gi       2,7Gi\nAuslager:      2,0Gi          0B       2,0Gi\n' : '               gesamt       benutzt     frei      gemns.  Puffer/Cache verfügbar\nSpeicher:     4005216     1153408     1672032       12340     1367200     2851808\nAuslager:     2097148           0     2097148\n'); return 0; };

  // ---------- Prozesse ----------
  function psTime(p) { return p.time || '0:00'; }
  C.ps = function (ctx) {
    const w = W(ctx);
    const args = ctx.argv.slice(1);
    const a = args.join(' ');
    let all = false, bsdUser = false, ef = false, userSel = null;
    for (let i = 0; i < args.length; i++) {
      const s = args[i];
      if (s === '-u' || s === '-U') { userSel = args[++i]; continue; }
      if (s[0] === '-') { const f = s.slice(1); if (/[eA]/.test(f)) all = true; if (/f/.test(f)) ef = true; if (/^a?u?x?$/.test(f) && /x/.test(f) && /a/.test(f)) { all = true; if (/u/.test(f)) bsdUser = true; } continue; }
      if (/^[aux]+$/.test(s)) { if (/a/.test(s) && /x/.test(s)) all = true; if (/u/.test(s)) bsdUser = true; continue; }
      ctx.err('error: unsupported option (BSD syntax)\n'); return 1;
    }
    let list = w.procs.slice();
    if (userSel) list = list.filter(p => p.user === userSel);
    else if (!all) list = list.filter(p => p.tty === 'pts/0' && p.user === w.user);
    const self = { pid: w.pidCounter, user: w.user, cmd: 'ps' + (a ? ' ' + a : ''), tty: 'pts/0', stat: 'R+', cpu: 0, mem: 0.1, vsz: 11312, rss: 4480, start: LX.hhmm(), time: '0:00' };
    if (!userSel || userSel === w.user) list = list.concat([self]);
    (ctx.pipeOthers || []).forEach((av, i) => {
      if (!av.length) return;
      const shown = av[0] === 'grep' ? ['grep', '--color=auto'].concat(av.slice(1)) : av;
      if (!userSel || userSel === w.user) list.push({ pid: w.pidCounter + 2 + i, user: w.user, cmd: shown.join(' '), tty: 'pts/0', stat: 'S+', cpu: 0, mem: 0.0, vsz: 9144, rss: 2304, start: LX.hhmm(), time: '0:00' });
    });
    list.sort((x, y) => x.pid - y.pid);
    const full = bsdUser;
    if (full) {
      ctx.out('USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n');
      list.forEach(p => ctx.out(p.user.slice(0, 8).padEnd(8) + String(p.pid).padStart(8) + String(p.cpu.toFixed(1)).padStart(5) + String(p.mem.toFixed(1)).padStart(5) + String(p.vsz).padStart(7) + String(p.rss).padStart(6) + ' ' + (p.tty || '?').padEnd(8) + ' ' + p.stat.padEnd(4) + ' ' + p.start.padStart(5) + ' ' + psTime(p).padStart(6) + ' ' + p.cmd + '\n'));
    } else if (ef) {
      ctx.out('UID          PID    PPID  C STIME TTY          TIME CMD\n');
      list.forEach(p => ctx.out(p.user.slice(0, 8).padEnd(8) + String(p.pid).padStart(8) + String(p.ppid || 1).padStart(8) + String(Math.round(p.cpu)).padStart(3) + ' ' + p.start.padEnd(5) + ' ' + (p.tty || '?').padEnd(8) + ' ' + ('00:00:' + String(Math.round(p.cpu / 10)).padStart(2, '0')).padStart(8) + ' ' + p.cmd + '\n'));
    } else {
      ctx.out('    PID TTY          TIME CMD\n');
      list.forEach(p => ctx.out(String(p.pid).padStart(7) + ' ' + (p.tty || '?').padEnd(8) + ' ' + ('00:00:' + String(Math.round(p.cpu / 10)).padStart(2, '0')).padStart(12) + ' ' + p.cmd.split(' ')[0].split('/').pop() + '\n'));
    }
    return 0;
  };
  const SIGS = { HUP: 1, INT: 2, QUIT: 3, KILL: 9, TERM: 15, STOP: 19, CONT: 18 };
  C.kill = function (ctx) {
    const w = W(ctx); let a = ctx.argv.slice(1); let sig = 15;
    if (a[0] === '-l' || a[0] === '-L') { ctx.out(' 1) SIGHUP\t 2) SIGINT\t 3) SIGQUIT\t 4) SIGILL\t 5) SIGTRAP\n 6) SIGABRT\t 7) SIGBUS\t 8) SIGFPE\t 9) SIGKILL\t10) SIGUSR1\n11) SIGSEGV\t12) SIGUSR2\t13) SIGPIPE\t14) SIGALRM\t15) SIGTERM\n18) SIGCONT\t19) SIGSTOP\n'); return 0; }
    if (a[0] === '-s') { a.shift(); const s = (a.shift() || '').replace(/^SIG/, ''); sig = SIGS[s] || parseInt(s, 10); }
    else if (a[0] && a[0][0] === '-' && a[0].length > 1) { const s = a.shift().slice(1).replace(/^SIG/, ''); sig = /^\d+$/.test(s) ? parseInt(s, 10) : SIGS[s.toUpperCase()]; if (!sig) { ctx.err('bash: kill: ' + s + ': Ungültige Signalangabe\n'); return 1; } }
    if (!a.length) { ctx.err('kill: Aufruf: kill [-s Signalname | -n Signalnummer | -Signalname] PID | %Jobnummer ... oder kill -l [Signal]\n'); return 2; }
    let code = 0;
    a.forEach(t => {
      let p;
      if (t[0] === '%') { const j = parseInt(t.slice(1), 10); p = w.procs.find(x => x.job === j); if (!p) { ctx.err('bash: kill: ' + t + ': Kein solcher Job\n'); code = 1; return; } }
      else {
        if (!/^\d+$/.test(t)) { ctx.err('bash: kill: ' + t + ': Die Argumente müssen Prozess- oder Jobkennungen sein\n'); code = 1; return; }
        p = w.procs.find(x => x.pid === parseInt(t, 10));
        if (!p) { ctx.err('bash: kill: (' + t + ') - Kein passender Prozess gefunden\n'); code = 1; return; }
      }
      if (ctx.user !== 'root' && p.user !== ctx.user) { ctx.err('bash: kill: (' + p.pid + ') - Die Operation ist nicht erlaubt\n'); code = 1; return; }
      if (p.pid === 1 || p.protect) { if (sig === 9 || sig === 15) { ctx.err('bash: kill: (' + p.pid + ') - Die Operation ist nicht erlaubt\n'); code = 1; } return; }
      if (p.pid === w.shellPid) return;
      if (sig === 9 || (sig === 15 && !p.ignoreTerm) || sig === 2 || (sig === 1 && !p.ignoreTerm) || sig === 3) {
        w.procs.splice(w.procs.indexOf(p), 1);
        w.log.killed.push({ pid: p.pid, cmd: p.cmd, sig: sig, tag: p.tag });
        if (p.job) ctx.out('[' + p.job + ']+  ' + (sig === 9 ? 'Getötet' : 'Beendet') + '                ' + p.cmd + '\n');
      } else if (sig === 15 && p.ignoreTerm) {
        w.log.termIgnored = (w.log.termIgnored || 0) + 1;
      }
    });
    return code;
  };
  C.jobs = function (ctx) { const w = W(ctx); w.procs.filter(p => p.job).forEach(p => ctx.out('[' + p.job + ']+  Läuft                  ' + p.cmd + ' &\n')); return 0; };
  C.sleep = async function (ctx) {
    const s = parseFloat(ctx.argv[1]);
    if (isNaN(s)) { ctx.err('sleep: Fehlender Operand\n' + hint('sleep')); return 1; }
    const intr = await ctx.wait(s * 1000);
    if (intr) { ctx.out('^C\n'); return 130; }
    return 0;
  };
  C.top = function (ctx) { ctx.err('top: In dieser Simulation nicht verfügbar – nutze »ps aux«.\n'); return 1; };
  C.killall = function (ctx) {
    const w = W(ctx); const n = ctx.argv.filter(x => x[0] !== '-').slice(1)[0];
    const sig9 = ctx.argv.indexOf('-9') >= 0;
    if (!n) { ctx.err('killall: Aufruf: killall [-9] Name\n'); return 1; }
    const ps = w.procs.filter(p => p.cmd.split(' ')[0].split('/').pop() === n || p.cmd.split(' ').some(x => x.split('/').pop() === n));
    if (!ps.length) { ctx.err(n + ': Kein Prozess gefunden\n'); return 1; }
    let code = 0;
    ps.forEach(p => { ctx.argv = ['kill'].concat(sig9 ? ['-9'] : []).concat([String(p.pid)]); if (C.kill(ctx)) code = 1; });
    return code;
  };

  // ---------- sudo ----------
  C.sudo = async function (ctx) {
    const w = W(ctx);
    let a = ctx.argv.slice(1);
    if (!a.length || a[0] === '-h') { ctx.err('Aufruf: sudo Befehl [Argumente]\n'); return 1; }
    if (a[0] === '-i' || a[0] === '-s' || a[0] === 'su' || a[0] === '-u') { ctx.err('sudo: In dieser Simulation arbeitest du immer als ' + ctx.user + '. Stelle »sudo« bitte direkt vor einzelne Befehle.\n'); return 1; }
    if (a[0] === '-k') { w.sudoUntil = 0; return 0; }
    if (ctx.user === 'root') { ctx.argv = a; ctx.name = a[0]; return ctx.sh.exec(ctx); }
    if (LX.userGroups(w, ctx.user).indexOf('sudo') < 0) {
      const ok = await askPw(ctx); if (!ok) return 1;
      ctx.err(ctx.user + ' ist nicht in der sudoers-Datei.\n'); return 1;
    }
    if (!(w.sudoUntil > Date.now())) { const ok = await askPw(ctx); if (!ok) return 1; w.sudoUntil = Date.now() + 15 * 60000; }
    w.log.sudo = (w.log.sudo || 0) + 1;
    const inner = Object.assign({}, ctx, { argv: a, name: a[0], user: 'root' });
    if (LX.ALIASES_SUDO[a[0]]) inner.argv = LX.ALIASES_SUDO[a[0]].concat(a.slice(1));
    const code = await ctx.sh.exec(inner);
    if (ctx.ev) ctx.ev.cmds.push({ name: a[0], argv: a, code: code, user: 'root', viaSudo: true });
    return code;
  };
  LX.ALIASES_SUDO = { ll: ['ls', '-alF'] };
  async function askPw(ctx) {
    const w = W(ctx);
    const pw = w.users[ctx.user].password;
    for (let i = 0; i < 3; i++) {
      const got = ctx.headless ? (ctx.opts.sudoPw != null ? ctx.opts.sudoPw : pw) : await ctx.term.readSecret('[sudo] Passwort für ' + ctx.user + ': ');
      if (got === null) { ctx.out('\n'); return false; }
      if (got === pw) return true;
      ctx.err('Sorry, versuchen Sie es erneut.\n');
      if (ctx.headless) break;
    }
    ctx.err('sudo: 3 Fehlversuche bei der Passworteingabe\n');
    return false;
  }
  C.su = function (ctx) { ctx.err('su: In dieser Simulation nicht verfügbar. Stelle »sudo« vor einzelne Befehle.\n'); return 1; };
  C.apt = function (ctx) { ctx.err('apt: Dieser Server hat in der Simulation keinen Zugriff auf Paketquellen.\n'); return 100; };
  C['apt-get'] = C.apt;
  C.passwd = function (ctx) { ctx.err('passwd: In dieser Simulation deaktiviert – das Passwort steht in deiner Auftragsmail.\n'); return 1; };
  C.reboot = C.shutdown = C.poweroff = function (ctx) { ctx.err(ctx.name + ': Bitte nicht! In dieser Simulation ist ein Neustart nicht vorgesehen.\n'); return 1; };

  // ---------- Skripte ----------
  LX.runScript = async function (ctx, node, name) {
    const text = node.data || '';
    if (!LX.can(ctx.w, node, 'r', ctx.user)) { ctx.err('bash: ' + name + ': ' + E.EACCES + '\n'); return 126; }
    let code = 0;
    for (const raw of text.split('\n')) {
      const line = raw.trim();
      if (!line || line[0] === '#') continue;
      const tk = LX.tokenize(line); if (tk.err) { ctx.err(name + ': ' + tk.err + '\n'); return 2; }
      // einfache Ausführung jeder Zeile als eigene Pipeline
      const sub = await ctx.sh.runSub(line, ctx);
      code = sub;
    }
    return code;
  };

  // ---------- nano (Dateizugriff) ----------
  LX.nanoLoad = function (w, user, path) {
    const r = LX.resolve(w, path, { user: user });
    if (r.err === 'ENOENT') { const rp = LX.resolveParent(w, path, { user: user }); if (rp.err) return { err: 'Verzeichnis »' + path.replace(/\/[^/]*$/, '') + '« existiert nicht' }; return { exists: false, text: '' }; }
    if (r.err) return { err: E[r.err] };
    if (r.node.type === 'd') return { err: '»' + path + '« ist ein Verzeichnis' };
    if (r.node.blob) return { exists: true, text: fileText(r.node), binary: true };
    if (!LX.can(w, r.node, 'r', user)) return { exists: true, text: '', err: 'Fehler beim Lesen von ' + path + ': ' + E.EACCES };
    return { exists: true, text: r.node.data || '', readonly: !LX.can(w, r.node, 'w', user) };
  };
  LX.nanoSave = function (w, user, path, text) {
    const rp = LX.resolveParent(w, path, { user: user });
    if (rp.err) return 'Fehler beim Schreiben von ' + path + ': ' + E[rp.err];
    if (rp.node) {
      if (rp.node.type === 'd') return 'Fehler beim Schreiben von ' + path + ': ' + E.EISDIR;
      if (!LX.can(w, rp.node, 'w', user)) return 'Fehler beim Schreiben von ' + path + ': ' + E.EACCES;
      rp.node.data = text; delete rp.node.blob; delete rp.node.size; rp.node.mtime = Date.now();
      return null;
    }
    if (!LX.can(w, rp.parent, 'w', user)) return 'Fehler beim Schreiben von ' + path + ': ' + E.EACCES;
    rp.parent.children[rp.name] = LX.mkNode('f', { owner: user, group: w.users[user].group, mode: user === 'root' ? 0o644 : 0o664, data: text });
    touchDir(rp.parent);
    return null;
  };
  C.nano = async function (ctx) {
    const a = ctx.argv.slice(1).filter(x => x[0] !== '-' && x[0] !== '+');
    const path = a[0] || '';
    if (ctx.headless || !ctx.term || !ctx.term.nano) {
      // Testmodus: Inhalt aus opts.nanoText übernehmen
      if (ctx.opts && ctx.opts.nanoText != null) { const e = LX.nanoSave(ctx.w, ctx.user, path, ctx.opts.nanoText); if (e) { ctx.err(e + '\n'); return 1; } }
      return 0;
    }
    await ctx.term.nano(path, ctx.user);
    W(ctx).log.nano = (W(ctx).log.nano || 0) + 1;
    return 0;
  };
  C.vi = C.vim = function (ctx) { ctx.err("Befehl '" + ctx.name + "' nicht gefunden, kann aber installiert werden mit:\nsudo apt install vim\n(Tipp: In diesem Kurs nutzt du nano.)\n"); return 127; };

  // ---------- file ----------
  function describeBlob(b, name) {
    if (b.kind === 'tar') return 'POSIX tar archive (GNU)';
    if (b.kind === 'gz') return 'gzip compressed data, was "' + (b.inner.name || '') + '", last modified: ' + new Date(b.inner.mtime || Date.now()).toUTCString().replace(/^\w+, /, '') + ', from Unix';
    if (b.kind === 'bz2') return 'bzip2 compressed data, block size = 900k';
    if (b.kind === 'xz') return 'XZ compressed data, checksum CRC64';
    if (b.kind === 'zip') return 'Zip archive data, at least v2.0 to extract, compression method=deflate';
    return 'data';
  }
  C.file = function (ctx) {
    const w = W(ctx); let code = 0;
    const args = ctx.argv.slice(1).filter(x => x[0] !== '-');
    if (!args.length) { ctx.err('Usage: file [-bcCdEhikLlNnprsSvzZ0] [--apple] [--extension] [--mime-encoding]\n'); return 1; }
    args.forEach(a => {
      const r = LX.resolve(w, a, { user: ctx.user });
      let d;
      if (r.err) d = 'cannot open `' + a + "' (No such file or directory)";
      else if (r.node.type === 'd') d = 'directory';
      else if (r.node.type === 'c') d = 'character special (1/3)';
      else if (!LX.can(w, r.node, 'r', ctx.user)) d = 'regular file, no read permission';
      else if (r.node.bin) d = 'ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, for GNU/Linux 3.2.0, stripped';
      else if (r.node.blob) d = describeBlob(r.node.blob, a);
      else {
        const t = r.node.data || '';
        if (!t) d = 'empty';
        else if (/^#!\/bin\/(ba)?sh/.test(t)) d = (t.indexOf('bash') > 0 ? 'Bourne-Again shell script' : 'POSIX shell script') + ', ' + (/[^\x00-\x7f]/.test(t) ? 'Unicode text, UTF-8 text' : 'ASCII text') + ' executable';
        else if (/^#!\/usr\/bin\/(env )?python3/.test(t)) d = 'Python script, ASCII text executable';
        else d = (/[^\x00-\x7f]/.test(t) ? 'Unicode text, UTF-8 text' : 'ASCII text');
      }
      ctx.out(a + ': ' + d + '\n');
    });
    return code;
  };

  // ---------- Archive ----------
  function unwrap(b) { let x = b; const chain = []; while (x && (x.kind === 'gz' || x.kind === 'bz2' || x.kind === 'xz')) { chain.push(x.kind); x = x.inner.blob || null; } return { tar: x && x.kind === 'tar' ? x : null, chain: chain }; }

  function writeEntries(ctx, entries, baseDir, verbose, keepOwner) {
    const w = W(ctx);
    for (const e of entries) {
      const p = e.path.replace(/\/$/, '');
      const full = (baseDir === '/' ? '' : baseDir) + '/' + p;
      const rp = LX.resolveParent(w, full, { cwd: '/', user: ctx.user });
      if (rp.err) {
        // Elternverzeichnis anlegen (tar legt fehlende Ebenen an)
        const parts = LX.splitAbs(w, full, '/');
        let acc = '';
        for (let i = 0; i < parts.length - 1; i++) {
          acc += '/' + parts[i];
          const r = LX.resolve(w, acc, { cwd: '/', user: ctx.user });
          if (r.node) continue;
          const pp = LX.resolveParent(w, acc, { cwd: '/', user: ctx.user });
          if (pp.err || !LX.can(w, pp.parent, 'w', ctx.user)) return { err: e.path + ': Kann open nicht ausführen: ' + E.EACCES };
          pp.parent.children[pp.name] = LX.mkNode('d', { owner: ctx.user, group: grp(ctx), mode: 0o775 });
        }
      }
      const rp2 = LX.resolveParent(w, full, { cwd: '/', user: ctx.user });
      if (rp2.err) return { err: e.path + ': ' + E[rp2.err] };
      if (!LX.can(w, rp2.parent, 'w', ctx.user)) return { err: e.path + ': Kann open nicht ausführen: ' + E.EACCES };
      if (verbose) ctx.out(e.path + '\n');
      const owner = keepOwner && ctx.user === 'root' && w.users[e.owner] ? e.owner : ctx.user;
      const group = keepOwner && ctx.user === 'root' && w.groups[e.group] ? e.group : w.users[owner].group;
      if (e.type === 'd') {
        if (!rp2.node || rp2.node.type !== 'd') rp2.parent.children[rp2.name] = LX.mkNode('d', { owner: owner, group: group, mode: e.mode, mtime: e.mtime });
        else rp2.node.mode = e.mode;
      } else {
        const n = LX.mkNode('f', { owner: owner, group: group, mode: e.mode, mtime: e.mtime, data: e.data || '' });
        if (e.blob) n.blob = JSON.parse(JSON.stringify(e.blob));
        if (e.size != null) n.size = e.size;
        if (e.bin) n.bin = true;
        rp2.parent.children[rp2.name] = n;
      }
    }
    return {};
  }

  C.tar = function (ctx) {
    const w = W(ctx);
    let a = ctx.argv.slice(1);
    if (!a.length) { ctx.err('tar: Sie müssen eine der Optionen »-Acdtrux«, »--delete« oder »--test-label« angeben.\n„tar --help“ oder „tar --usage“ gibt weitere Informationen.\n'); return 2; }
    // alter Stil: erstes Argument ohne Bindestrich
    if (a[0][0] !== '-' && /^[cxtvfzjJCpa]+$/.test(a[0])) a[0] = '-' + a[0];
    const o = {}; const rest = []; let file = null, dir = null;
    for (let i = 0; i < a.length; i++) {
      const s = a[i];
      if (s.slice(0, 2) === '--') {
        const [k, v] = s.slice(2).split('=');
        const map = { create: 'c', extract: 'x', get: 'x', list: 't', verbose: 'v', gzip: 'z', gunzip: 'z', bzip2: 'j', xz: 'J', 'auto-compress': 'a' };
        if (k === 'file') { file = v !== undefined ? v : a[++i]; continue; }
        if (k === 'directory') { dir = v !== undefined ? v : a[++i]; continue; }
        if (map[k]) { o[map[k]] = true; continue; }
        if (k === 'help') { ctx.out('Aufruf: tar [OPTION…] [DATEI]…\nSiehe »man tar«.\n'); return 0; }
        ctx.err('tar: Unbekannte Option »' + s + '«\n„tar --help“ oder „tar --usage“ gibt weitere Informationen.\n'); return 2;
      }
      if (s[0] === '-' && s.length > 1) {
        for (let j = 1; j < s.length; j++) {
          const c = s[j];
          if (c === 'f') { const v = s.slice(j + 1) || a[++i]; file = v; break; }
          if (c === 'C') { const v = s.slice(j + 1) || a[++i]; dir = v; break; }
          if ('cxtvzjJpa'.indexOf(c) >= 0) { o[c] = true; continue; }
          ctx.err('tar: Ungültige Option -- »' + c + '«\n„tar --help“ oder „tar --usage“ gibt weitere Informationen.\n'); return 2;
        }
        continue;
      }
      rest.push(s);
    }
    const modes = ['c', 'x', 't'].filter(k => o[k]);
    if (modes.length !== 1) { ctx.err(modes.length ? 'tar: Sie dürfen nicht mehr als eine der Optionen »-Acdtrux«, »--delete« oder »--test-label« angeben.\n' : 'tar: Sie müssen eine der Optionen »-Acdtrux«, »--delete« oder »--test-label« angeben.\n'); ctx.err('„tar --help“ oder „tar --usage“ gibt weitere Informationen.\n'); return 2; }
    if (file === null || file === undefined) {
      if (o.c) { ctx.err('tar: Ausgabe auf das Terminal wird verweigert: Sie haben vermutlich -f vergessen.\n„tar --help“ oder „tar --usage“ gibt weitere Informationen.\n'); return 2; }
      ctx.err('tar: Archiv soll vom Terminal gelesen werden – Sie haben vermutlich -f vergessen.\n„tar --help“ oder „tar --usage“ gibt weitere Informationen.\n'); return 2;
    }
    let base = w.cwd;
    if (dir) {
      const r = LX.resolve(w, dir, { user: ctx.user });
      if (r.err || r.node.type !== 'd') { ctx.err('tar: ' + dir + ': Kann chdir nicht ausführen: ' + E[r.err || 'ENOTDIR'] + '\ntar: Fehler ist nicht behebbar: Programm wird beendet.\n'); return 2; }
      base = LX.joinAbs(r.parts);
    }
    if (o.c) {
      if (!rest.length) { ctx.err('tar: Feige weigere ich mich, ein leeres Archiv anzulegen.\n„tar --help“ oder „tar --usage“ gibt weitere Informationen.\n'); return 2; }
      const outPath = LX.absPath(w, file);
      const entries = []; let code = 0; let warnedAbs = false;
      rest.forEach(m => {
        const r = LX.resolve(w, m, { cwd: base, user: ctx.user });
        if (r.err) { ctx.err('tar: ' + m + ': Funktion stat fehlgeschlagen: ' + E[r.err] + '\n'); code = 2; return; }
        let label = m.replace(/^\/+/, '');
        if (m[0] === '/' && !warnedAbs) { ctx.err('tar: Entferne führende „/“ von Elementnamen\n'); warnedAbs = true; }
        if (label === '' ) label = '.';
        const list = LX.nodeToEntries(r.node, label, []);
        list.forEach(e => {
          const abs = LX.absPath(w, e.path, m[0] === '/' ? '/' : base);
          if (abs === outPath) { ctx.err('tar: ' + e.path + ': Datei ist das Archiv; wird nicht gesichert\n'); return; }
          if (e.type === 'd') e.path = e.path.replace(/\/?$/, '/');
          const nd = LX.getNode(w, abs);
          if (nd && !LX.can(w, nd, 'r', ctx.user)) { ctx.err('tar: ' + e.path + ': Kann open nicht ausführen: ' + E.EACCES + '\n'); code = 2; return; }
          entries.push(e);
          if (o.v) ctx.out(e.path + '\n');
        });
      });
      let blob = { kind: 'tar', entries: entries };
      let comp = o.z ? 'gz' : o.j ? 'bz2' : o.J ? 'xz' : null;
      if (!comp && o.a) comp = /\.(tgz|gz)$/.test(file) ? 'gz' : /\.bz2$/.test(file) ? 'bz2' : /\.xz$/.test(file) ? 'xz' : null;
      if (comp) blob = { kind: comp, inner: { name: file.replace(/^.*\//, '').replace(/\.(gz|bz2|xz)$/, '').replace(/\.tgz$/, '.tar'), blob: blob, mtime: Date.now(), mode: 0o664 } };
      const op = ctx.sh.openOut(file, false, ctx.user);
      if (op.err) { ctx.err('tar: ' + file + ': Kann open nicht ausführen: ' + op.err.replace(/^bash: [^:]*: /, '') + '\ntar: Fehler ist nicht behebbar: Programm wird beendet.\n'); return 2; }
      if (op.node) { op.node.blob = blob; op.node.data = ''; op.node.mtime = Date.now(); }
      if (code) ctx.err('tar: Beende mit Fehlerstatus aufgrund vorheriger Fehler\n');
      w.log.tar = (w.log.tar || []).concat([{ mode: 'c', file: LX.absPath(w, file), comp: comp }]);
      return code;
    }
    // Lesen
    const r = LX.resolve(w, file, { user: ctx.user });
    if (r.err) { ctx.err('tar: ' + file + ': Kann open nicht ausführen: ' + E[r.err] + '\ntar: Fehler ist nicht behebbar: Programm wird beendet.\n'); return 2; }
    if (r.node.type === 'd') { ctx.err('tar: ' + file + ': Kann read nicht ausführen: ' + E.EISDIR + '\ntar: Fehler ist nicht behebbar: Programm wird beendet.\n'); return 2; }
    if (!LX.can(w, r.node, 'r', ctx.user)) { ctx.err('tar: ' + file + ': Kann open nicht ausführen: ' + E.EACCES + '\ntar: Fehler ist nicht behebbar: Programm wird beendet.\n'); return 2; }
    const u = unwrap(r.node.blob);
    if (!u.tar) { ctx.err('tar: Das sieht nicht wie ein „tar“-Archiv aus.\ntar: Beende mit Fehlerstatus aufgrund vorheriger Fehler\n'); return 2; }
    let entries = u.tar.entries;
    if (rest.length) {
      const sel = rest.map(x => x.replace(/\/$/, ''));
      entries = entries.filter(e => sel.some(s => e.path.replace(/\/$/, '') === s || e.path.indexOf(s + '/') === 0));
      const miss = sel.filter(s => !u.tar.entries.some(e => e.path.replace(/\/$/, '') === s || e.path.indexOf(s + '/') === 0));
      if (miss.length) { miss.forEach(m => ctx.err('tar: ' + m + ': Nicht im Archiv gefunden.\n')); }
    }
    if (o.t) {
      entries.forEach(e => {
        if (o.v) { const d = new Date(e.mtime); const p = (x) => String(x).padStart(2, '0'); ctx.out(LX.modeStr({ type: e.type, mode: e.mode }) + ' ' + (e.owner + '/' + e.group).padEnd(13) + ' ' + String(e.type === 'd' ? 0 : LX.entrySize(e)).padStart(7) + ' ' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ' ' + e.path + '\n'); }
        else ctx.out(e.path + '\n');
      });
      return 0;
    }
    const res = writeEntries(ctx, entries, base, o.v, o.p);
    if (res.err) { ctx.err('tar: ' + res.err + '\ntar: Beende mit Fehlerstatus aufgrund vorheriger Fehler\n'); return 2; }
    w.log.tar = (w.log.tar || []).concat([{ mode: 'x', file: LX.absPath(w, file), into: base }]);
    return 0;
  };

  // gzip / bzip2 / xz – gemeinsame Logik
  const ZDEF = {
    gz: { prog: 'gzip', ext: '.gz', alt: { '.tgz': '.tar' } },
    bz2: { prog: 'bzip2', ext: '.bz2', alt: { '.tbz2': '.tar', '.tbz': '.tar' } },
    xz: { prog: 'xz', ext: '.xz', alt: { '.txz': '.tar' } }
  };
  function zMsg(kind, type, file, extra) {
    const p = ZDEF[kind].prog;
    if (kind === 'gz') {
      return {
        nofile: 'gzip: ' + file + ': No such file or directory',
        isdir: 'gzip: ' + file + ' is a directory -- ignored',
        suffix: 'gzip: ' + file + ' already has .gz suffix -- unchanged',
        exists: 'gzip: ' + file + ' already exists; not overwritten',
        unknown: 'gzip: ' + file + ': unknown suffix -- ignored',
        notfmt: 'gzip: ' + file + ': not in gzip format',
        perm: 'gzip: ' + file + ': Permission denied',
        tty: 'gzip: compressed data not written to a terminal. Use -f to force compression.\nFor help, type: gzip -h'
      }[type];
    }
    if (kind === 'bz2') {
      return {
        nofile: 'bzip2: Can\'t open input file ' + file + ': No such file or directory.',
        isdir: 'bzip2: Input file ' + file + ' is a directory.',
        suffix: 'bzip2: Input file ' + file + ' already has .bz2 suffix.',
        exists: 'bzip2: Output file ' + file + ' already exists.',
        unknown: 'bzip2: Can\'t guess original name for ' + file + ' -- using ' + file + '.out',
        notfmt: 'bzip2: ' + file + ' is not a bzip2 file.',
        perm: 'bzip2: Can\'t open input file ' + file + ': Permission denied.',
        tty: 'bzip2: I won\'t write compressed data to a terminal.\nbzip2: For help, type: `bzip2 --help\'.'
      }[type];
    }
    return {
      nofile: 'xz: ' + file + ': No such file or directory',
      isdir: 'xz: ' + file + ': Is a directory, skipping',
      suffix: 'xz: ' + file + ': File already has `.xz\' suffix, skipping',
      exists: 'xz: ' + file + ': File exists',
      unknown: 'xz: ' + file + ': Filename has an unknown suffix, skipping',
      notfmt: 'xz: ' + file + ': File format not recognized',
      perm: 'xz: ' + file + ': Permission denied',
      tty: 'xz: Compressed data cannot be written to a terminal\nxz: Try `xz --help\' for more information.'
    }[type];
  }
  function zrun(ctx, kind, forceDecomp) {
    const w = W(ctx);
    const g = getopt(ctx, { f: 'dkvfcl19t', long: { decompress: 'd', uncompress: 'd', keep: 'k', verbose: 'v', force: 'f', stdout: 'c', list: 'l', best: '9', fast: '1' } });
    if (g.err) return 1;
    const dec = forceDecomp || g.o.d;
    const def = ZDEF[kind];
    if (g.o.c) { ctx.err(def.prog + ': Die Option -c wird in dieser Simulation nicht unterstützt.\n'); return 1; }
    if (!g.args.length) { ctx.err(zMsg(kind, 'tty', '') + '\n'); return 1; }
    let code = 0;
    g.args.forEach(f => {
      const r = LX.resolve(w, f, { user: ctx.user });
      if (r.err) { ctx.err(zMsg(kind, 'nofile', f) + '\n'); code = 1; return; }
      if (r.node.type === 'd') { ctx.err(zMsg(kind, 'isdir', f) + '\n'); code = kind === 'gz' ? 2 : 1; return; }
      if (!LX.can(w, r.node, 'r', ctx.user)) { ctx.err(zMsg(kind, 'perm', f) + '\n'); code = 1; return; }
      const rp = LX.resolveParent(w, f, { user: ctx.user });
      if (!dec) {
        if (f.slice(-def.ext.length) === def.ext) { ctx.err(zMsg(kind, 'suffix', f) + '\n'); code = kind === 'gz' ? 2 : 1; return; }
        const tgt = f + def.ext;
        const tp = LX.resolveParent(w, tgt, { user: ctx.user });
        if (tp.node && !g.o.f) { ctx.err(zMsg(kind, 'exists', tgt) + '\n'); code = 1; return; }
        if (!LX.can(w, rp.parent, 'w', ctx.user)) { ctx.err(def.prog + ': ' + tgt + ': Permission denied\n'); code = 1; return; }
        const n = r.node;
        const inner = { name: rp.name, mtime: n.mtime, mode: n.mode };
        if (n.blob) inner.blob = JSON.parse(JSON.stringify(n.blob)); else inner.data = n.data || '';
        if (n.size != null) inner.size = n.size;
        if (n.bin || /\.(jpe?g|png|pdf|odt|zip)$/i.test(rp.name)) inner.bin = true;
        const blob = { kind: kind, inner: inner };
        const nn = LX.mkNode('f', { owner: n.owner, group: n.group, mode: n.mode, mtime: n.mtime });
        nn.blob = blob;
        tp.parent.children[tp.name] = nn;
        if (!g.o.k) delete rp.parent.children[rp.name];
        touchDir(rp.parent);
        if (g.o.v) {
          const before = LX.sizeOf(n), after = LX.sizeOf(nn);
          const pct = before ? ((before - after) / before * 100) : 0;
          if (kind === 'gz') ctx.err(f + ':\t' + pct.toFixed(1).padStart(5) + '% -- ' + (g.o.k ? 'created' : 'replaced with') + ' ' + tgt + '\n');
          else if (kind === 'bz2') ctx.err('  ' + f + ':  ' + (before / Math.max(1, after)).toFixed(3) + ':1, ' + (after * 8 / Math.max(1, before)).toFixed(3) + ' bits/byte, ' + pct.toFixed(2) + '% saved, ' + before + ' in, ' + after + ' out.\n');
          else ctx.err(f + ' (1/1)\n  100 %   ' + after + ' B / ' + before + ' B = ' + (after / Math.max(1, before)).toFixed(3) + '\n');
        }
        w.log.compress = (w.log.compress || []).concat([{ kind: kind, file: LX.absPath(w, tgt) }]);
        return;
      }
      // Entpacken
      let outName = null;
      if (f.slice(-def.ext.length) === def.ext) outName = f.slice(0, -def.ext.length);
      else { for (const k in def.alt) if (f.slice(-k.length) === k) outName = f.slice(0, -k.length) + def.alt[k]; }
      if (!outName) { ctx.err(zMsg(kind, 'unknown', f) + '\n'); code = kind === 'gz' ? 2 : 1; return; }
      const b = r.node.blob;
      if (!b || b.kind !== kind) { ctx.err(zMsg(kind, 'notfmt', f) + '\n'); code = 1; return; }
      const tp = LX.resolveParent(w, outName, { user: ctx.user });
      if (tp.node && !g.o.f) { ctx.err(zMsg(kind, 'exists', outName) + '\n'); code = 1; return; }
      if (!LX.can(w, rp.parent, 'w', ctx.user)) { ctx.err(def.prog + ': ' + outName + ': Permission denied\n'); code = 1; return; }
      const nn = LX.mkNode('f', { owner: r.node.owner, group: r.node.group, mode: b.inner.mode || r.node.mode, mtime: b.inner.mtime || r.node.mtime, data: b.inner.data || '' });
      if (b.inner.blob) nn.blob = JSON.parse(JSON.stringify(b.inner.blob));
      if (b.inner.size != null) nn.size = b.inner.size;
      if (b.inner.bin && b.inner.size != null && !b.inner.data) nn.bin = true;
      tp.parent.children[tp.name] = nn;
      if (!g.o.k) delete rp.parent.children[rp.name];
      touchDir(rp.parent);
      if (g.o.v) ctx.err(f + ':\t' + ' -- ' + (g.o.k ? 'created' : 'replaced with') + ' ' + outName + '\n');
    });
    return code;
  }
  C.gzip = (ctx) => zrun(ctx, 'gz', false);
  C.gunzip = (ctx) => zrun(ctx, 'gz', true);
  C.bzip2 = (ctx) => zrun(ctx, 'bz2', false);
  C.bunzip2 = (ctx) => zrun(ctx, 'bz2', true);
  C.xz = (ctx) => zrun(ctx, 'xz', false);
  C.unxz = (ctx) => zrun(ctx, 'xz', true);
  function zcat(ctx, kind) {
    const w = W(ctx); let code = 0;
    ctx.argv.slice(1).forEach(f => {
      const r = LX.resolve(w, f, { user: ctx.user });
      if (r.err) { ctx.err(zMsg(kind, 'nofile', f) + '\n'); code = 1; return; }
      const b = r.node.blob;
      if (!b || b.kind !== kind) { ctx.err(zMsg(kind, 'notfmt', f) + '\n'); code = 1; return; }
      ctx.out(b.inner.blob ? LX.binaryNoise('x' + f, 200) + '\n' : (b.inner.data || ''));
    });
    return code;
  }
  C.zcat = (ctx) => zcat(ctx, 'gz');
  C.bzcat = (ctx) => zcat(ctx, 'bz2');
  C.xzcat = (ctx) => zcat(ctx, 'xz');

  // zip / unzip
  function deflatePct(e) { if (e.type === 'd') return null; const s = LX.entrySize(e); if (s < 60) return null; if (e.blob || e.bin || /\.(jpe?g|png|pdf|odt|zip|gz|bz2|xz)$/i.test(e.path)) return 1 + (s % 3); return Math.round(100 - 100 * (0.3 + 40 / Math.max(s, 1))); }
  C.zip = function (ctx) {
    const w = W(ctx);
    const g = getopt(ctx, { f: 'rqv9dm' , long: { recurse: 'r', quiet: 'q' } });
    if (g.err) return 16;
    if (g.args.length < 1) { ctx.out('Copyright (c) 1990-2008 Info-ZIP - Type \'zip "-L"\' for software license.\nZip 3.0 (July 5th 2008). Usage:\nzip [-options] [-b path] [-t mmddyyyy] [-n suffixes] [zipfile list] [-xi list]\n'); return 0; }
    let arch = g.args[0];
    if (!/\.zip$/i.test(arch) && arch.indexOf('.') < 0) arch += '.zip';
    const members = g.args.slice(1);
    const ar = LX.resolve(w, arch, { user: ctx.user });
    let entries = ar.node && ar.node.blob && ar.node.blob.kind === 'zip' ? ar.node.blob.entries.slice() : [];
    if (g.o.d) {
      const before = entries.length;
      entries = entries.filter(e => !members.some(m => e.path.replace(/\/$/, '') === m.replace(/\/$/, '')));
      members.forEach(m => ctx.out('deleting: ' + m + '\n'));
      if (before === entries.length) { ctx.err('\nzip warning: name not matched: ' + members[0] + '\n\nzip error: Nothing to do! (' + arch + ')\n'); return 12; }
      ar.node.blob = { kind: 'zip', entries: entries };
      return 0;
    }
    if (!members.length) { ctx.err('\nzip error: Nothing to do! (' + arch + ')\n'); return 12; }
    let added = 0; const outAbs = LX.absPath(w, arch);
    members.forEach(m => {
      const r = LX.resolve(w, m, { user: ctx.user });
      if (r.err) { ctx.err('\tzip warning: name not matched: ' + m + '\n'); return; }
      const label = m.replace(/^\/+/, '').replace(/\/$/, '');
      let list = g.o.r ? LX.nodeToEntries(r.node, label, []) : [LX.nodeToEntries(r.node, label, [])[0]];
      list.forEach(e => {
        if (LX.absPath(w, e.path, m[0] === '/' ? '/' : w.cwd) === outAbs) return;
        if (e.type === 'd') e.path = e.path.replace(/\/?$/, '/');
        e.csize = e.type === 'f' ? Math.max(10, Math.round(LX.entrySize(e) * (deflatePct(e) == null ? 1 : (100 - deflatePct(e)) / 100))) : 0;
        const ex = entries.findIndex(x => x.path === e.path);
        const pct = deflatePct(e);
        const verb = ex >= 0 ? 'updating' : 'adding';
        if (ex >= 0) entries[ex] = e; else entries.push(e);
        added++;
        if (!g.o.q) ctx.out('  ' + verb + ': ' + e.path + (pct == null ? ' (stored 0%)' : ' (deflated ' + pct + '%)') + '\n');
      });
    });
    if (!added) { ctx.err('\nzip error: Nothing to do! (' + arch + ')\n'); return 12; }
    const op = ctx.sh.openOut(arch, false, ctx.user);
    if (op.err) { ctx.err('zip I/O error: ' + E.EACCES + '\n\nzip error: Could not create output file (' + arch + ')\n'); return 15; }
    if (op.node) { op.node.blob = { kind: 'zip', entries: entries }; op.node.data = ''; }
    w.log.zip = (w.log.zip || []).concat([{ file: outAbs }]);
    return 0;
  };
  C.unzip = async function (ctx) {
    const w = W(ctx);
    const a = ctx.argv.slice(1);
    let dir = null, list = false, over = false, never = false, quiet = false; const rest = [];
    for (let i = 0; i < a.length; i++) {
      if (a[i] === '-d') { dir = a[++i]; continue; }
      if (a[i][0] === '-') { if (a[i].indexOf('l') >= 0) list = true; if (a[i].indexOf('o') >= 0) over = true; if (a[i].indexOf('n') >= 0) never = true; if (a[i].indexOf('q') >= 0) quiet = true; continue; }
      rest.push(a[i]);
    }
    if (!rest.length) { ctx.out('UnZip 6.00 of 20 April 2009, by Debian. Original by Info-ZIP.\n\nUsage: unzip [-Z] [-opts[modifiers]] file[.zip] [list] [-x xlist] [-d exdir]\n'); return 0; }
    let f = rest[0];
    let r = LX.resolve(w, f, { user: ctx.user });
    if (r.err && !/\.zip$/i.test(f)) { const r2 = LX.resolve(w, f + '.zip', { user: ctx.user }); if (r2.node) { r = r2; f = f + '.zip'; } }
    if (r.err) { ctx.err('unzip:  cannot find or open ' + rest[0] + ', ' + rest[0] + '.zip or ' + rest[0] + '.ZIP.\n'); return 9; }
    if (!r.node.blob || r.node.blob.kind !== 'zip') { ctx.err('Archive:  ' + f + '\n  End-of-central-directory signature not found.  Either this file is not\n  a zipfile, or it constitutes one disk of a multi-part archive.\nunzip:  cannot find zipfile directory in ' + f + '.\n'); return 9; }
    const entries = r.node.blob.entries;
    if (list) {
      ctx.out('Archive:  ' + f + '\n  Length      Date    Time    Name\n---------  ---------- -----   ----\n');
      let tot = 0;
      entries.forEach(e => { const s = e.type === 'f' ? LX.entrySize(e) : 0; tot += s; const d = new Date(e.mtime); const p = (x) => String(x).padStart(2, '0'); ctx.out(String(s).padStart(9) + '  ' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + '   ' + e.path + '\n'); });
      ctx.out('---------                     -------\n' + String(tot).padStart(9) + '                     ' + entries.length + ' file' + (entries.length === 1 ? '' : 's') + '\n');
      return 0;
    }
    let base = w.cwd;
    if (dir) {
      const dr = LX.resolve(w, dir, { user: ctx.user });
      if (!dr.node) { const rp = LX.resolveParent(w, dir, { user: ctx.user }); if (rp.err || !LX.can(w, rp.parent, 'w', ctx.user)) { ctx.err('checkdir:  cannot create extraction directory: ' + dir + '\n           ' + E.EACCES + '\n'); return 3; } rp.parent.children[rp.name] = LX.mkNode('d', { owner: ctx.user, group: grp(ctx), mode: 0o775 }); if (!quiet) ctx.out('   creating: ' + dir + '/\n'); base = LX.absPath(w, dir); }
      else base = LX.joinAbs(dr.parts);
    }
    if (!quiet) ctx.out('Archive:  ' + f + '\n');
    let all = over;
    for (const e of entries) {
      const full = (base === '/' ? '' : base) + '/' + e.path.replace(/\/$/, '');
      const ex = LX.getNode(w, full);
      const shown = dir ? dir.replace(/\/$/, '') + '/' + e.path : e.path;
      if (ex && e.type === 'f' && !all) {
        if (never) continue;
        const ans = ctx.headless ? 'A' : await ctx.term.readLine('replace ' + shown + '? [y]es, [n]o, [A]ll, [N]one, [r]ename: ');
        if (ans === 'N') { never = true; continue; }
        if (ans === 'A') all = true;
        else if (!/^y/i.test(ans || '')) continue;
      }
      const res = writeEntries(ctx, [e], base, false, false);
      if (res.err) { ctx.err('error:  cannot create ' + shown + '\n        ' + E.EACCES + '\n'); return 50; }
      if (!quiet) ctx.out((e.type === 'd' ? '   creating: ' : '  inflating: ') + shown + '\n');
    }
    w.log.unzip = (w.log.unzip || []).concat([{ file: LX.absPath(w, f), into: base }]);
    return 0;
  };

  // ip & ping (net.js)
  C.ip = (ctx) => LX.cmdIp(ctx);
  C.ping = (ctx) => LX.cmdPing(ctx);
  C.ifconfig = undefined; delete C.ifconfig;

  // Grundlegende --help-Ausgabe aus der Manpage
  const origExec = LX.Shell.prototype.exec;
  LX.Shell.prototype.exec = async function (ctx) {
    if (ctx.argv.length === 2 && ctx.argv[1] === '--help' && LX.MAN && LX.MAN[ctx.argv[0]] && ['tar', 'ip', 'ping', 'zip', 'unzip'].indexOf(ctx.argv[0]) < 0) {
      const p = LX.MAN[ctx.argv[0]];
      ctx.out('Aufruf: ' + p.syn.split('\n')[0] + '\n' + p.desc + '.\n\n' + (p.opts || []).map(o => '  ' + o[0].padEnd(24) + ' ' + o[1].split('\n')[0]).join('\n') + '\n\nVollständige Dokumentation: man ' + ctx.argv[0] + '\n');
      return 0;
    }
    return origExec.call(this, ctx);
  };
  LX.Shell.prototype.runSub = async function (line, pctx) {
    const tk = LX.tokenize(line); if (tk.err) return 2;
    const tmp = { line: line, cmds: [], out: '', code: 0 };
    // gleiche Parser-Logik über run, aber ohne History/Events
    const saved = this.w.history.length;
    const ev = await this.run(line, { silent: true, sub: true });
    this.w.history.length = saved;
    if (pctx && pctx.ev) { pctx.ev.cmds = pctx.ev.cmds.concat(ev.cmds); }
    return ev.code;
  };
})(typeof window !== 'undefined' ? window : globalThis);
