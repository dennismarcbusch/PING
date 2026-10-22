/* Linux-Simulation – virtuelles Dateisystem mit Rechten (Ubuntu-artig, deutsche Meldungen) */
(function (G) {
  'use strict';
  const LX = (G.LX = G.LX || {});

  const ERR = {
    ENOENT: 'Datei oder Verzeichnis nicht gefunden',
    ENOTDIR: 'Ist kein Verzeichnis',
    EACCES: 'Keine Berechtigung',
    EISDIR: 'Ist ein Verzeichnis',
    EEXIST: 'Die Datei existiert bereits',
    ENOTEMPTY: 'Das Verzeichnis ist nicht leer',
    EPERM: 'Die Operation ist nicht erlaubt',
    EINVAL: 'Das Argument ist ungültig'
  };
  LX.ERR = ERR;

  function now() { return LX.clock ? LX.clock() : Date.now(); }

  function mkNode(type, opt) {
    opt = opt || {};
    const n = {
      type: type,              // 'd' | 'f' | 'c'
      mode: opt.mode != null ? opt.mode : (type === 'd' ? 0o755 : 0o644),
      owner: opt.owner || 'root',
      group: opt.group || opt.owner || 'root',
      mtime: opt.mtime || now()
    };
    if (type === 'd') n.children = Object.create(null);
    if (type === 'f') { n.data = opt.data != null ? opt.data : ''; if (opt.blob) n.blob = opt.blob; if (opt.size != null) n.size = opt.size; }
    return n;
  }
  LX.mkNode = mkNode;

  // ---------- Größen ----------
  function utf8len(s) { let n = 0; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); n += c < 0x80 ? 1 : c < 0x800 ? 2 : (c >= 0xd800 && c < 0xdc00) ? (i++, 4) : 3; } return n; }
  LX.utf8len = utf8len;

  const RATIO = { gz: [0.30, 26], bz2: [0.27, 42], xz: [0.25, 60] };
  function blobSize(b) {
    if (!b) return 0;
    if (b.kind === 'tar') {
      let s = 0;
      b.entries.forEach(e => { s += 512; if (e.type === 'f') s += Math.ceil(entrySize(e) / 512) * 512; });
      s += 1024;
      return Math.ceil(s / 10240) * 10240;
    }
    if (b.kind === 'zip') {
      let s = 22;
      b.entries.forEach(e => { const sz = e.type === 'f' ? e.csize : 0; s += 30 + 46 + 2 * utf8len(e.path) + sz; });
      return s;
    }
    if (RATIO[b.kind]) {
      const inner = b.inner.blob ? blobSize(b.inner.blob) : (b.inner.size != null ? b.inner.size : utf8len(b.inner.data || ''));
      const r = RATIO[b.kind];
      // Archive aus Nullblöcken komprimieren extrem gut, Bilder/Binärdaten kaum
      const factor = b.inner.bin ? 0.985 : b.inner.blob && b.inner.blob.kind === 'tar' ? r[0] * 0.55 : r[0];
      return Math.max(r[1] + 8, Math.round(inner * factor + r[1] + utf8len(b.inner.name || '')));
    }
    return 0;
  }
  function entrySize(e) { return e.blob ? blobSize(e.blob) : (e.size != null ? e.size : utf8len(e.data || '')); }
  LX.blobSize = blobSize;
  LX.entrySize = entrySize;

  function sizeOf(n) {
    if (n.type === 'd') return 4096;
    if (n.type === 'c') return 0;
    if (n.blob) return blobSize(n.blob);
    if (n.size != null) return n.size;
    return utf8len(n.data || '');
  }
  LX.sizeOf = sizeOf;

  // ---------- Benutzer ----------
  function userGroups(w, user) {
    const u = w.users[user];
    if (!u) return [];
    const gs = [u.group];
    Object.keys(w.groups).forEach(g => { if (g !== u.group && w.groups[g].members.indexOf(user) >= 0) gs.push(g); });
    return gs;
  }
  LX.userGroups = userGroups;

  function can(w, node, perm, user) {
    user = user || w.user;
    if (user === 'root') {
      if (perm === 'x' && node.type === 'f') return (node.mode & 0o111) !== 0;
      return true;
    }
    const bit = perm === 'r' ? 4 : perm === 'w' ? 2 : 1;
    let shift;
    if (node.owner === user) shift = 6;
    else if (userGroups(w, user).indexOf(node.group) >= 0) shift = 3;
    else shift = 0;
    return ((node.mode >> shift) & bit) !== 0;
  }
  LX.can = can;

  // ---------- Pfade ----------
  function homeOf(w, user) { const u = w.users[user || w.user]; return u ? u.home : '/'; }
  LX.homeOf = homeOf;

  function splitAbs(w, path, cwd) {
    cwd = cwd || w.cwd;
    let p = path;
    if (p === '') return null;
    if (p[0] !== '/') p = (cwd === '/' ? '' : cwd) + '/' + p;
    const out = [];
    p.split('/').forEach(seg => {
      if (seg === '' || seg === '.') return;
      if (seg === '..') { out.pop(); return; }
      out.push(seg);
    });
    return out;
  }
  LX.splitAbs = splitAbs;
  function joinAbs(parts) { return '/' + parts.join('/'); }
  LX.joinAbs = joinAbs;
  LX.absPath = function (w, path, cwd) { const s = splitAbs(w, path, cwd); return s ? joinAbs(s) : null; };

  // Liefert {node, err, parts}. Prüft x-Recht auf allen Elternverzeichnissen.
  function resolve(w, path, opts) {
    opts = opts || {};
    const parts = splitAbs(w, path, opts.cwd);
    if (!parts) return { err: 'ENOENT' };
    let node = w.fs;
    // trailing slash on file → ENOTDIR
    for (let i = 0; i < parts.length; i++) {
      if (node.type !== 'd') return { err: 'ENOTDIR', parts };
      if (!opts.nocheck && !can(w, node, 'x', opts.user)) return { err: 'EACCES', parts };
      const ch = node.children[parts[i]];
      if (!ch) return { err: 'ENOENT', parts, parentNode: i === parts.length - 1 ? node : null };
      node = ch;
    }
    if (/\/$/.test(path) && node.type !== 'd' && path !== '/') return { err: 'ENOTDIR', parts };
    return { node, parts };
  }
  LX.resolve = resolve;

  // Eltern + Name für neue Einträge
  function resolveParent(w, path, opts) {
    opts = opts || {};
    const parts = splitAbs(w, path, opts.cwd);
    if (!parts || parts.length === 0) return { err: 'EEXIST' };
    const name = parts[parts.length - 1];
    const pr = resolve(w, joinAbs(parts.slice(0, -1)), opts);
    if (pr.err) return { err: pr.err };
    if (pr.node.type !== 'd') return { err: 'ENOTDIR' };
    return { parent: pr.node, name, parts, node: pr.node.children[name] || null };
  }
  LX.resolveParent = resolveParent;

  // ---------- Aufbau-Helfer (ohne Rechteprüfung) ----------
  function ensureDir(w, path, opt) {
    const parts = splitAbs(w, path, '/');
    let node = w.fs;
    parts.forEach((p, i) => {
      if (!node.children[p]) node.children[p] = mkNode('d', i === parts.length - 1 ? opt : { owner: (opt && opt.inheritOwner) ? opt.owner : 'root', mode: 0o755 });
      node = node.children[p];
    });
    if (opt) { if (opt.mode != null) node.mode = opt.mode; if (opt.owner) node.owner = opt.owner; if (opt.group || opt.owner) node.group = opt.group || opt.owner; if (opt.mtime) node.mtime = opt.mtime; }
    return node;
  }
  LX.ensureDir = ensureDir;

  function putFile(w, path, data, opt) {
    opt = opt || {};
    const parts = splitAbs(w, path, '/');
    const dir = ensureDir(w, joinAbs(parts.slice(0, -1)), opt.dirOpt);
    const n = mkNode('f', Object.assign({}, opt, { data: data }));
    dir.children[parts[parts.length - 1]] = n;
    return n;
  }
  LX.putFile = putFile;

  function getNode(w, path) { const r = resolve(w, path, { cwd: '/', nocheck: true }); return r.node || null; }
  LX.getNode = getNode;
  LX.readFile = function (w, path) { const n = getNode(w, path); return n && n.type === 'f' ? n.data : null; };
  LX.exists = function (w, path) { return !!getNode(w, path); };

  function clone(n) {
    const c = Object.assign({}, n);
    if (n.type === 'd') { c.children = Object.create(null); Object.keys(n.children).forEach(k => { c.children[k] = clone(n.children[k]); }); }
    if (n.blob) c.blob = JSON.parse(JSON.stringify(n.blob));
    return c;
  }
  LX.cloneNode = clone;

  // ---------- Rechte als Text ----------
  function modeStr(n) {
    const t = n.type === 'd' ? 'd' : n.type === 'c' ? 'c' : '-';
    let s = '';
    for (let sh = 6; sh >= 0; sh -= 3) {
      const v = (n.mode >> sh) & 7;
      s += (v & 4 ? 'r' : '-') + (v & 2 ? 'w' : '-') + (v & 1 ? 'x' : '-');
    }
    if (n.mode & 0o1000) s = s.slice(0, 8) + (s[8] === 'x' ? 't' : 'T');
    return t + s;
  }
  LX.modeStr = modeStr;

  const MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  LX.MON = MON;
  function lsDate(ms) {
    const d = new Date(ms);
    const day = String(d.getDate()).padStart(2, ' ') + '.';
    const recent = Math.abs(now() - ms) < 183 * 86400000;
    const tail = recent ? String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') : ' ' + d.getFullYear();
    return day + ' ' + MON[d.getMonth()] + ' ' + tail;
  }
  LX.lsDate = lsDate;

  // ---------- Kompakte Einträge für Archive ----------
  function nodeToEntries(n, path, list) {
    const e = { path: path, type: n.type, mode: n.mode, owner: n.owner, group: n.group, mtime: n.mtime };
    if (n.type === 'f') { if (n.blob) e.blob = JSON.parse(JSON.stringify(n.blob)); else e.data = n.data; if (n.size != null) e.size = n.size; if (n.bin) e.bin = true; }
    list.push(e);
    if (n.type === 'd') Object.keys(n.children).sort().forEach(k => nodeToEntries(n.children[k], path.replace(/\/$/, '') + '/' + k, list));
    return list;
  }
  LX.nodeToEntries = nodeToEntries;

  // Pseudo-Binärdaten zur Anzeige bei cat auf Archiven
  LX.binaryNoise = function (seedStr, len) {
    let h = 2166136261;
    for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
    const chars = '�\u0001\u0002\u0003\u0004�@ ?ÄxœŒ‹\u0007\u001f\u0010ãÿ¤ÔNŽ!¡^dÍ\u0000\u0000ò7·Ã|«Çµð';
    let s = '';
    for (let i = 0; i < len; i++) { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; s += chars[Math.abs(h) % chars.length]; }
    return s.replace(/[\u0000-\u0008\u000b-\u001f]/g, '�');
  };
})(typeof window !== 'undefined' ? window : globalThis);
