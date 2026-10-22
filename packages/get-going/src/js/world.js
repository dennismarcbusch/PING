/* Get-Going! – Weltmodell: Dateisystem, Rechte, Registry, Pfade */
(function () {
'use strict';
const GG = globalThis.GG = globalThis.GG || {};
const V = GG.v;
const { PSObject, PSHash, PSDate, ErrorRecord, PSRuntimeError } = GG;

/* ---------- Dateisystem-Knoten ---------- */
let NOW = Date.now();
GG.setNow = t => { NOW = t; };
GG.now = () => NOW;
const ago = (days, h) => new Date(NOW - days * 864e5 - (h || 0) * 36e5);
GG.ago = ago;

class FNode {
  constructor(name, dir, opts) {
    opts = opts || {};
    this.name = name; this.dir = dir;
    this.children = dir ? new Map() : null;
    this.content = dir ? null : (opts.content !== undefined ? opts.content : '');
    this.size = opts.size;                // Binärdateien
    this.enc = opts.enc || 'UTF8';
    this.ctime = opts.ctime || opts.mtime || ago(30); this.mtime = opts.mtime || this.ctime; this.atime = opts.atime || this.mtime;
    this.hidden = !!opts.hidden; this.system = !!opts.system; this.readonly = !!opts.readonly; this.archive = !dir;
    this.acl = opts.acl || [];            // explizite Regeln
    this.protectedAcl = !!opts.protectedAcl;
    this.owner = opts.owner || 'VORDEFINIERT\\Administratoren';
    this.zone = opts.zone || 0;           // 3 = Internet
    this.zoneRef = opts.zoneRef || null;
    this.signed = !!opts.signed;
    this.parent = null;
    this.archiveEntries = opts.archiveEntries || null;
    this.noAccess = opts.noAccess || null;
  }
  add(child) { child.parent = this; this.children.set(child.name.toLowerCase(), child); return child; }
  get(name) { return this.children ? this.children.get(name.toLowerCase()) : null; }
  remove(name) { this.children.delete(name.toLowerCase()); }
  get length() {
    if (this.dir) return null;
    if (this.size !== undefined && (this.content === null || this.content === '' )) return this.size;
    const c = this.content || '';
    const nl = (c.match(/\n/g) || []).length;
    if (this.enc === 'Unicode') return 2 + (c.length + nl) * 2;
    if (this.enc === 'Default' || this.enc === 'ASCII') return c.length + nl;
    let b = 0; for (const ch of c) { const cp = ch.codePointAt(0); b += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4; }
    return b + nl + (this.enc === 'UTF8BOM' ? 3 : 0);
  }
}
GG.FNode = FNode;

/* Baum-Hilfen: d('Name', [kinder], opts) / f('Name', inhalt, opts) */
GG.d = (name, kids, opts) => { const n = new FNode(name, true, opts); for (const k of kids || []) n.add(k); return n; };
GG.f = (name, content, opts) => {
  opts = opts || {};
  if (typeof content === 'number') { opts.size = content; content = null; }
  return new FNode(name, false, Object.assign({}, opts, { content: content === null ? null : (content || '') }));
};

/* ACL-Regel: R('VORDEFINIERT\\Administratoren','F',{oi,ci,io,deny}) */
GG.R = (id, r, o) => Object.assign({ id, r, type: 'Allow', oi: true, ci: true, io: false }, o || {});
const RIGHTS = { F: 'FullControl', M: 'Modify, Synchronize', RX: 'ReadAndExecute, Synchronize', R: 'Read, Synchronize', W: 'Write, Synchronize', AD: 'AppendData' };
GG.RIGHTS = RIGHTS;
const LEVEL = { R: 1, RX: 2, W: 2, M: 3, F: 4 };

GG.stdRootAcl = () => [
  GG.R('VORDEFINIERT\\Administratoren', 'F'), GG.R('NT-AUTORITÄT\\SYSTEM', 'F'),
  GG.R('VORDEFINIERT\\Benutzer', 'RX'), GG.R('VORDEFINIERT\\Benutzer', 'AD', { oi: false, ci: true }), GG.R('ERSTELLER-BESITZER', 'F', { io: true })
];

/* ---------- Registry ---------- */
class RKey {
  constructor(name) { this.name = name; this.keys = new Map(); this.values = new Map(); this.parent = null; }
  key(name) { return this.keys.get(name.toLowerCase()); }
  addKey(k) { k.parent = this; this.keys.set(k.name.toLowerCase(), k); return k; }
  setVal(name, data, kind) { this.values.set(name.toLowerCase(), { name, data, kind: kind || (typeof data === 'number' ? 'DWord' : 'String') }); return this; }
}
GG.RKey = RKey;
GG.rk = (name, vals, kids) => { const k = new RKey(name); for (const [n, v, t] of vals || []) k.setVal(n, v, t); for (const c of kids || []) k.addKey(c); return k; };

/* ---------- Welt ---------- */
class World {
  constructor(o) {
    Object.assign(this, {
      hostname: 'SERVER', domain: null, domainNetbios: null, dc: null, defaultUser: 'azubi', os: 'Microsoft Windows Server 2025 Standard',
      osVersion: '10.0.26100', build: '26100', fs: {}, volumes: [], reg: {}, users: [], groups: [], services: [], processes: [], events: { System: [], Application: [], Security: [], 'Windows PowerShell': [] },
      shares: [], execPolicy: { MachinePolicy: 'Undefined', UserPolicy: 'Undefined', LocalMachine: 'RemoteSigned', CurrentUser: 'Undefined' },
      packages: [], modules: [], psRepoTrusted: false, nuget: false, ad: null, netw: null, net: null, firewall: null, online: true, winrm: true,
      hotfixes: [], envMachine: {}, removedAliases: new Set(), userHomes: {}, nextPid: 5000, bootTime: ago(12, 3), tasks: []
    }, o || {});
  }
  get isDC() { return !!this.isDomainController; }
}
GG.World = World;

/* ---------- Identität / Token ---------- */
GG.tokenOf = function (session) {
  const w = session.world;
  const ids = new Set(['jeder', 'nt-autorität\\authentifizierte benutzer', 'nt-autorität\\interaktiv', 'vordefiniert\\benutzer']);
  const me = session.identity.toLowerCase();
  ids.add(me);
  const domGroups = [];
  if (w.ad) {
    const u = w.ad.users.find(x => x.sam.toLowerCase() === session.user.toLowerCase());
    if (u) {
      ids.add((w.ad.netbios + '\\domänen-benutzer').toLowerCase());
      for (const g of w.ad.groups) if (GG.adIsMember(w.ad, g, u)) { const n = (w.ad.netbios + '\\' + g.sam).toLowerCase(); ids.add(n); domGroups.push(n); }
    }
  }
  for (const g of w.groups) {
    const mem = g.members.map(m => m.toLowerCase());
    if (mem.some(m => ids.has(m) || m === session.user.toLowerCase() || m === (w.hostname + '\\' + session.user).toLowerCase())) {
      if (g.name.toLowerCase() === 'administratoren' && !session.elevated) continue;
      ids.add('vordefiniert\\' + g.name.toLowerCase());
    }
  }
  if (session.elevated) ids.add('vordefiniert\\administratoren');
  if (session.remoteOrigin && session.isAdmin) ids.add('vordefiniert\\administratoren');
  return ids;
};
GG.isLocalAdmin = function (session) {
  // Mitglied der Administratoren (unabhängig von UAC)
  const w = session.world;
  const g = w.groups.find(x => x.name.toLowerCase() === 'administratoren');
  if (!g) return false;
  const s2 = Object.assign(Object.create(Object.getPrototypeOf(session)), session, { elevated: true });
  return GG.tokenOf(s2).has('vordefiniert\\administratoren') && g.members.some(m => {
    const ml = m.toLowerCase();
    const tok = GG.tokenOf(Object.assign(Object.create(Object.getPrototypeOf(session)), session, { elevated: false }));
    return tok.has(ml) || ml === session.user.toLowerCase();
  });
};

/* effektive ACL eines Knotens */
GG.effAcl = function (node) {
  const res = node.acl.map(r => Object.assign({}, r, { inherited: false }));
  if (node.protectedAcl) return res;
  let child = node, p = node.parent, depth = 1;
  while (p) {
    for (const r of p.acl) {
      const applies = node.dir ? r.ci : r.oi;
      if (!applies) continue;
      if (r.np && depth > 1) continue;
      res.push(Object.assign({}, r, { inherited: true, io: false }));
    }
    if (p.protectedAcl) break;
    child = p; p = p.parent; depth++;
  }
  // geerbte Regeln, die nur für Nachfolger gelten, nicht auf sich selbst anwenden
  return res.filter(r => !(r.io && !r.inherited));
};
GG.effAclDisplay = function (node) {
  const res = node.acl.map(r => Object.assign({}, r, { inherited: false }));
  if (!node.protectedAcl) {
    let p = node.parent, depth = 1;
    while (p) {
      for (const r of p.acl) {
        const applies = node.dir ? r.ci : r.oi;
        if (!applies) continue;
        res.push(Object.assign({}, r, { inherited: true, io: !!(node.dir && r.io && /ersteller-besitzer/i.test(r.id)) }));
      }
      if (p.protectedAcl) break;
      p = p.parent; depth++;
    }
  }
  return res;
};

GG.checkAccess = function (session, node, need) {
  if (!node) return false;
  const tok = GG.tokenOf(session);
  if (need === 'perm' && tok.has(node.owner.toLowerCase())) return true;
  if (need === 'mkdir') return GG.checkAccess(session, node, 'write') || GG.effAcl(node).some(r => r.r === 'AD' && r.type !== 'Deny' && tok.has(r.id.toLowerCase()));
  const want = { read: 1, write: 2, delete: 3, perm: 4 }[need] || 1;
  const owner = tok.has(String(node.owner).toLowerCase());
  let allow = 0, deny = false;
  for (const r of GG.effAcl(node)) {
    if (!tok.has(r.id.toLowerCase()) && !(owner && r.inherited && r.id.toLowerCase() === 'ersteller-besitzer')) continue;
    const lv = LEVEL[r.r] || 0;
    if (r.type === 'Deny') { if (lv >= 1 && (need === 'read' || lv >= want)) deny = true; continue; }
    if (need === 'write' && r.r === 'RX') continue;
    if (need === 'read' && r.r === 'W') continue;
    allow = Math.max(allow, lv);
  }
  if (deny) return false;
  if (need === 'read') return allow >= 1;
  if (need === 'write') return allow >= 2;
  if (need === 'delete') return allow >= 3;
  return allow >= 4;
};

/* ---------- Pfade ---------- */
const FX = GG.fsx = {};
const REG_ROOTS = { HKLM: 'HKEY_LOCAL_MACHINE', HKCU: 'HKEY_CURRENT_USER' };
FX.REG_ROOTS = REG_ROOTS;
GG.providerOf = function (p) {
  const d = (p.split(':')[0] || '').toUpperCase();
  if (d === 'HKLM' || d === 'HKCU') return 'Microsoft.PowerShell.Core\\Registry';
  if (d === 'ENV') return 'Microsoft.PowerShell.Core\\Environment';
  if (d === 'ALIAS') return 'Microsoft.PowerShell.Core\\Alias';
  if (d === 'VARIABLE') return 'Microsoft.PowerShell.Core\\Variable';
  if (d === 'FUNCTION') return 'Microsoft.PowerShell.Core\\Function';
  if (d === 'CERT') return 'Microsoft.PowerShell.Security\\Certificate';
  return 'Microsoft.PowerShell.Core\\FileSystem';
};
const SPECIAL = { ENV: 'Environment', ALIAS: 'Alias', VARIABLE: 'Variable', FUNCTION: 'Function', CERT: 'Certificate', WSMAN: 'WSMan' };

FX.driveExists = function (ctx, drive) {
  const d = drive.toUpperCase();
  if (ctx.world.fs[d]) return true;
  if (REG_ROOTS[d] || SPECIAL[d]) return true;
  return !!(ctx.session.psdrives && ctx.session.psdrives.find(x => x.name.toUpperCase() === d));
};

/* Pfad -> {prov, drive, parts, full, world} (ohne Existenzprüfung) */
FX.resolve = function (ctx, pathStr, opts) {
  opts = opts || {};
  let p = V.toStr(pathStr).replace(/\//g, '\\').trim();
  p = p.replace(/^Microsoft\.PowerShell\.Core\\FileSystem::/i, '').replace(/^FileSystem::/i, '');
  const regm = /^(?:Microsoft\.PowerShell\.Core\\)?Registry::(HKEY_LOCAL_MACHINE|HKEY_CURRENT_USER|HKLM|HKCU)(\\.*)?$/i.exec(p);
  if (regm) { const r = regm[1].toUpperCase(); p = (r.startsWith('HKEY_LOCAL') || r === 'HKLM' ? 'HKLM:' : 'HKCU:') + (regm[2] || '\\'); }
  if (p === '' ) p = '.';
  if (p === '~' || p.startsWith('~\\')) p = ctx.session.home + p.slice(1);
  let world = ctx.world;
  // UNC
  let m = /^\\\\([^\\]+)\\([^\\]+)(.*)$/.exec(p);
  if (m) {
    const host = m[1], share = m[2], rest = m[3] || '';
    const w = GG.netw ? GG.netw.worldByName(ctx.world, host) : (host.toLowerCase() === ctx.world.hostname.toLowerCase() ? ctx.world : null);
    if (!w || !w.online) return { error: 'unc-host', host, share, display: p };
    let sh = w.shares.find(s => s.name.toLowerCase() === share.toLowerCase());
    if (!sh && /^[a-z]\$$/i.test(share)) sh = { name: share, path: share[0].toUpperCase() + ':\\' };
    if (!sh) return { error: 'unc-share', host, share, display: p };
    const inner = sh.path.replace(/\\$/, '') + rest;
    const r = FX.resolve(Object.assign({}, ctx, { world: w }), inner, opts);
    r.unc = { host, share: sh.name, sh, rest }; r.world = w;
    r.full = '\\\\' + host + '\\' + sh.name + (r.parts.length > FX.splitParts(sh.path).length ? '\\' + r.parts.slice(FX.splitParts(sh.path).length).join('\\') : '');
    r.uncShareObj = sh;
    return r;
  }
  m = /^([A-Za-z][A-Za-z0-9_]*):(.*)$/.exec(p);
  let drive, rest;
  if (!m) {
    // relativ zum aktuellen Ort
    const loc = ctx.session.loc;
    if (p.startsWith('\\')) { const lm = /^([A-Za-z][A-Za-z0-9_]*:)/.exec(loc); return FX.resolve(ctx, (lm ? lm[1] : 'C:') + p, opts); }
    return FX.resolve(ctx, loc.replace(/\\$/, '') + '\\' + p, opts);
  }
  drive = m[1].toUpperCase(); rest = m[2];
  const pd = ctx.session.psdrives && ctx.session.psdrives.find(x => x.name.toUpperCase() === drive);
  if (pd) {
    const rootR = FX.resolve(ctx, pd.root);
    if (rootR.error) return rootR;
    let relRest = rest;
    if (!rest.startsWith('\\')) { const cur = FX.splitLoc(ctx.session.loc); relRest = (cur.drive === drive ? cur.parts.join('\\') + '\\' : '') + rest; }
    const inner = FX.resolve(ctx, pd.root.replace(/\\$/, '') + '\\' + relRest.replace(/^\\/, ''), opts);
    if (inner.error) return inner;
    inner.viaDrive = pd;
    const base = rootR.parts.length;
    if (inner.parts.length < base) inner.parts = rootR.parts.slice();
    inner.full = drive + ':\\' + inner.parts.slice(base).join('\\');
    return inner;
  }
  if (!rest.startsWith('\\')) {
    const cur = FX.splitLoc(ctx.session.loc);
    if (cur.drive === drive) rest = '\\' + cur.parts.join('\\') + (rest ? '\\' + rest : '');
    else rest = '\\' + rest;
  }
  const parts = [];
  for (const seg of rest.split('\\')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') { parts.pop(); continue; }
    parts.push(seg);
  }
  let prov = 'FileSystem';
  if (REG_ROOTS[drive]) prov = 'Registry';
  else if (SPECIAL[drive]) prov = SPECIAL[drive];
  const full = prov === 'FileSystem' ? drive + ':\\' + parts.join('\\') : drive + ':\\' + parts.join('\\');
  return { prov, drive, parts, full: full.replace(/\\$/, prov === 'FileSystem' && parts.length === 0 ? '\\' : ''), world };
};
FX.splitParts = function (p) { return p.replace(/^[A-Za-z]:/, '').split('\\').filter(x => x && x !== '.'); };
FX.splitLoc = function (loc) {
  const m = /^([A-Za-z][A-Za-z0-9_]*):(.*)$/.exec(loc);
  if (!m) return { drive: 'C', parts: [] };
  return { drive: m[1].toUpperCase(), parts: m[2].split('\\').filter(Boolean) };
};
FX.fixFull = function (r) {
  if (r.prov === 'FileSystem' && !r.unc && !r.viaDrive) return r.drive + ':\\' + r.parts.join('\\');
  return r.full;
};

/* Knoten holen */
FX.node = function (r) {
  if (!r || r.error) return null;
  const w = r.world;
  if (r.prov === 'FileSystem') {
    let n = w.fs[r.drive];
    if (!n) return null;
    for (const seg of r.parts) { n = n.dir ? n.get(seg) : null; if (!n) return null; }
    return n;
  }
  if (r.prov === 'Registry') {
    let k = w.reg[r.drive];
    if (!k) return null;
    for (const seg of r.parts) { k = k.key(seg); if (!k) return null; }
    return k;
  }
  return null;
};
FX.parentRes = function (r) { return Object.assign({}, r, { parts: r.parts.slice(0, -1), full: undefined }); };

/* Wildcards auflösen: liefert Liste von r (existierend). */
FX.expand = function (ctx, pathStr, opts) {
  opts = opts || {};
  const raw = V.toStr(pathStr);
  const r = FX.resolve(ctx, raw);
  if (r.error) return [r];
  if (opts.literal || !V.hasWild(raw)) return [r];
  if (r.prov !== 'FileSystem' && r.prov !== 'Registry') return [r];
  // Segmentweise
  let cur = [{ parts: [] }];
  for (const seg of r.parts) {
    const next = [];
    for (const c of cur) {
      if (V.hasWild(seg)) {
        const parent = FX.node(Object.assign({}, r, { parts: c.parts }));
        if (!parent) continue;
        const re = V.wildRe(seg);
        const kids = r.prov === 'FileSystem' ? (parent.dir ? [...parent.children.values()] : []) : [...parent.keys.values()];
        for (const k of kids.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))) if (re.test(k.name)) {
          if (r.prov === 'FileSystem' && (k.hidden) && !opts.force) continue;
          next.push({ parts: c.parts.concat([k.name]) });
        }
      } else next.push({ parts: c.parts.concat([seg]) });
    }
    cur = next;
  }
  return cur.map(c => {
    const rr = Object.assign({}, r, { parts: c.parts });
    rr.full = rr.drive + ':\\' + c.parts.join('\\');
    if (r.unc) { const base = FX.splitParts(r.uncShareObj.path).length; rr.full = '\\\\' + r.unc.host + '\\' + r.unc.share + (c.parts.length > base ? '\\' + c.parts.slice(base).join('\\') : ''); }
    return rr;
  }).filter(rr => FX.node(rr));
};

/* korrekte Groß-/Kleinschreibung aus dem Baum */
FX.canonical = function (r) {
  if (r.prov !== 'FileSystem' && r.prov !== 'Registry') return r.full;
  const w = r.world;
  let n = r.prov === 'FileSystem' ? w.fs[r.drive] : w.reg[r.drive];
  const parts = [];
  for (const seg of r.parts) { const c = n ? (r.prov === 'FileSystem' ? n.get(seg) : n.key(seg)) : null; parts.push(c ? c.name : seg); n = c; }
  if (r.unc) { const base = FX.splitParts(r.uncShareObj.path).length; return '\\\\' + r.unc.host + '\\' + r.unc.share + (parts.length > base ? '\\' + parts.slice(base).join('\\') : ''); }
  if (r.viaDrive) { return r.full; }
  return r.drive + ':\\' + parts.join('\\');
};

FX.resolveFile = function (ctx, p) {
  try {
    const r = FX.resolve(ctx, p);
    if (r.error || r.prov !== 'FileSystem') return null;
    const node = FX.node(r);
    return { r, node, path: node ? FX.canonical(r) : r.full };
  } catch (e) { return null; }
};
FX.canRead = function (ctx, node) { return GG.checkAccess(ctx.session, node, 'read'); };

/* Fehlerobjekte */
FX.errNotFound = function (c, full, o) {
  c.error(`Der Pfad "${full}" kann nicht gefunden werden, da er nicht vorhanden ist.`, Object.assign({ category: 'ObjectNotFound', exception: 'System.Management.Automation.ItemNotFoundException', fqid: 'PathNotFound', target: full, reason: 'ItemNotFoundException' }, o || {}));
};
FX.errDenied = function (c, full, o) {
  c.error(`Der Zugriff auf den Pfad "${full}" wurde verweigert.`, Object.assign({ category: 'PermissionDenied', exception: 'System.UnauthorizedAccessException', fqid: 'DirUnauthorizedAccessError', target: full, reason: 'UnauthorizedAccessException' }, o || {}));
};
FX.errDrive = function (c, drive, o) {
  c.error(`Das Laufwerk wurde nicht gefunden. Ein Laufwerk mit dem Namen "${drive}" ist nicht vorhanden.`, Object.assign({ category: 'ObjectNotFound', exception: 'System.Management.Automation.DriveNotFoundException', fqid: 'DriveNotFound', target: drive, reason: 'DriveNotFoundException' }, o || {}));
};
FX.errUnc = function (c, r) {
  c.error(`Der Pfad "${r.display}" kann nicht gefunden werden, da er nicht vorhanden ist.`, { category: 'ObjectNotFound', exception: 'System.Management.Automation.ItemNotFoundException', fqid: 'PathNotFound', target: r.display, reason: 'ItemNotFoundException' });
};

/* Text in Datei schreiben (für Umleitung & Out-File) */
FX.writeText = async function (ctx, pathStr, text, append, enc) {
  const r = FX.resolve(ctx, pathStr);
  if (r.error || r.prov !== 'FileSystem') throw GG.rtErr({ message: `Der Pfad "${pathStr}" kann nicht gefunden werden, da er nicht vorhanden ist.`, category: 'ObjectNotFound', exception: 'System.IO.DirectoryNotFoundException', fqid: 'FileOpenFailure' });
  if (!r.world.fs[r.drive]) throw GG.rtErr({ message: `Das Laufwerk wurde nicht gefunden. Ein Laufwerk mit dem Namen "${r.drive}" ist nicht vorhanden.`, category: 'ObjectNotFound', exception: 'System.Management.Automation.DriveNotFoundException', fqid: 'DriveNotFound' });
  const parent = FX.node(FX.parentRes(r));
  if (!parent || !parent.dir) throw GG.rtErr({ message: `Ein Teil des Pfades "${r.full}" konnte nicht gefunden werden.`, category: 'OpenError', exception: 'System.IO.DirectoryNotFoundException', fqid: 'FileOpenFailure', target: r.full, targetType: '', cmd: 'Out-File', reason: 'DirectoryNotFoundException' });
  let node = FX.node(r);
  const sess = ctx.session;
  if (node && node.dir) throw GG.rtErr({ message: `Der Zugriff auf den Pfad "${r.full}" wurde verweigert.`, category: 'OpenError', exception: 'System.UnauthorizedAccessException', fqid: 'FileOpenFailure' });
  if (node ? !GG.checkAccess(sess, node, 'write') : !GG.checkAccess(sess, parent, 'write')) throw GG.rtErr({ message: `Der Zugriff auf den Pfad "${FX.canonical(r)}" wurde verweigert.`, category: 'OpenError', exception: 'System.UnauthorizedAccessException', fqid: 'FileOpenFailure', target: '', cmd: 'Out-File', reason: 'UnauthorizedAccessException' });
  if (node && node.readonly) throw GG.rtErr({ message: `Der Zugriff auf den Pfad "${FX.canonical(r)}" wurde verweigert.`, category: 'OpenError', exception: 'System.UnauthorizedAccessException', fqid: 'FileOpenFailure' });
  if (!node) { node = GG.f(r.parts[r.parts.length - 1], '', { enc: enc || 'Unicode', mtime: new Date(), ctime: new Date(), owner: FX.newOwner(ctx) }); parent.add(node); }
  if (append) node.content = (node.content || '') + text; else { node.content = text; node.enc = enc || 'Unicode'; node.size = undefined; }
  node.mtime = new Date(); node.atime = node.mtime;
  return node;
};
FX.newOwner = function (ctx) { return ctx.session.elevated ? 'VORDEFINIERT\\Administratoren' : ctx.session.identity; };

/* ---------- Mode-Zeichenkette ---------- */
GG.modeOf = function (n) {
  return (n.dir ? 'd' : '-') + (n.archive && !n.dir ? 'a' : '-') + (n.readonly ? 'r' : '-') + (n.hidden ? 'h' : '-') + (n.system ? 's' : '-') + '-';
};
GG.attrOf = function (n) {
  const a = [];
  if (n.readonly) a.push('ReadOnly'); if (n.hidden) a.push('Hidden'); if (n.system) a.push('System');
  if (n.dir) a.push('Directory'); else if (n.archive) a.push('Archive');
  if (!a.length) a.push('Normal');
  return a.join(', ');
};

/* FileInfo/DirectoryInfo-Objekte */
GG.fsItem = function (node, full, world) {
  const isDir = node.dir;
  const parentPath = full.replace(/\\[^\\]*$/, '') || full;
  const prov = 'Microsoft.PowerShell.Core\\FileSystem::';
  const tn = isDir ? 'System.IO.DirectoryInfo' : 'System.IO.FileInfo';
  const o = new PSObject([tn, 'System.IO.FileSystemInfo', 'System.MarshalByRefObject', 'System.Object'], null, { ref: node });
  o.world = world;
  const isRoot = /^[A-Z]:\\?$/i.test(full);
  const name = isRoot ? full.slice(0, 2) + '\\' : node.name;
  o.add('PSPath', prov + full);
  o.add('PSParentPath', isRoot ? '' : prov + (/^[A-Z]:$/i.test(parentPath) ? parentPath + '\\' : parentPath));
  o.add('PSChildName', name);
  o.add('PSDrive', full[1] === ':' ? full[0].toUpperCase() : '');
  o.add('PSProvider', 'Microsoft.PowerShell.Core\\FileSystem');
  o.add('PSIsContainer', isDir);
  o.add('Mode', null, () => GG.modeOf(node));
  o.add('BaseName', isDir ? name : name.replace(/\.[^.]*$/, ''));
  o.add('Target', []);
  o.add('LinkType', null);
  o.add('Name', name);
  if (isDir) {
    o.add('FullName', full);
    o.add('Parent', isRoot ? null : parentPath.split('\\').pop());
    o.add('Exists', null, () => !!node.parent || isRoot);
    o.add('Root', full.slice(0, 3));
    o.add('Extension', '');
  } else {
    o.add('Length', null, () => node.length);
    o.add('DirectoryName', /^[A-Z]:$/i.test(parentPath) ? parentPath + '\\' : parentPath);
    o.add('Directory', /^[A-Z]:$/i.test(parentPath) ? parentPath + '\\' : parentPath);
    o.add('IsReadOnly', null, () => node.readonly, (s, v) => { node.readonly = V.toBool(v); });
    o.add('Exists', null, () => !!node.parent);
    o.add('FullName', full);
    o.add('Extension', (/\.[^.]*$/.exec(name) || [''])[0]);
  }
  o.add('CreationTime', null, () => new PSDate(node.ctime));
  o.add('LastAccessTime', null, () => new PSDate(node.atime));
  o.add('LastWriteTime', null, () => new PSDate(node.mtime), (s, v) => { node.mtime = (v instanceof PSDate ? v.d : V.cast('System.DateTime', v).d); });
  o.add('Attributes', null, () => GG.attrOf(node));
  o.toStringFn = () => name;
  o.methods.delete = function () { if (node.parent) node.parent.remove(node.name); };
  o.methods.getfiles = function () { return isDir ? [...node.children.values()].filter(c => !c.dir).map(c => GG.fsItem(c, full.replace(/\\$/, '') + '\\' + c.name, world)) : []; };
  o.methods.getdirectories = function () { return isDir ? [...node.children.values()].filter(c => c.dir).map(c => GG.fsItem(c, full.replace(/\\$/, '') + '\\' + c.name, world)) : []; };
  return o;
};

/* Registry-Objekte */
GG.regItem = function (key, full, world) {
  const hive = REG_ROOTS[full.split(':')[0].toUpperCase()];
  const rest = full.split(':')[1].replace(/^\\/, '');
  const regPath = hive + (rest ? '\\' + rest : '');
  const o = new PSObject('Microsoft.Win32.RegistryKey', null, { ref: key });
  o.add('Property', null, () => [...key.values.values()].map(v => v.name));
  o.add('PSPath', 'Microsoft.PowerShell.Core\\Registry::' + regPath);
  o.add('PSParentPath', 'Microsoft.PowerShell.Core\\Registry::' + regPath.replace(/\\[^\\]*$/, ''));
  o.add('PSChildName', key.name);
  o.add('PSDrive', full.split(':')[0].toUpperCase());
  o.add('PSProvider', 'Microsoft.PowerShell.Core\\Registry');
  o.add('PSIsContainer', true);
  o.add('SubKeyCount', null, () => key.keys.size);
  o.add('View', 'Default');
  o.add('Handle', 'Microsoft.Win32.SafeHandles.SafeRegistryHandle');
  o.add('ValueCount', null, () => key.values.size);
  o.add('Name', regPath);
  o.toStringFn = () => regPath;
  o.regKey = key; o.regPath = regPath; o.psFull = full;
  o.methods.getvalue = function (args) { const v = key.values.get(V.toStr(args[0]).toLowerCase()); return v ? v.data : null; };
  o.methods.getvaluenames = function () { return [...key.values.values()].map(v => v.name); };
  o.methods.getsubkeynames = function () { return [...key.keys.values()].map(v => v.name); };
  return o;
};

})();
