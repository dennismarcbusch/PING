/* Get-Going! – Prüfhilfen für Lektionen, Missionen und Kompetenznachweis */
(function () {
'use strict';
const GG = globalThis.GG = globalThis.GG || {};
const V = GG.v;
const H = GG.H = {};
const lc = s => String(s == null ? '' : s).toLowerCase();

/* ---------- Protokoll ---------- */
// st = { env, w, entries, answer, sessions }
H.cmds = st => { const r = []; for (const e of st.entries || []) for (const c of e.cmds || []) r.push(Object.assign({ entry: e }, c)); return r; };
H.used = (st, name, pred) => H.cmds(st).some(c => c.ok !== false && lc(c.name) === lc(name) && (!pred || pred(c.params || {}, c)));
H.usedAny = (st, name, pred) => H.cmds(st).some(c => lc(c.name) === lc(name) && (!pred || pred(c.params || {}, c)));
H.line = (st, re, okOnly) => (st.entries || []).some(e => re.test(e.line) && (!okOnly || e.ok));
H.p = (params, name) => { for (const k of Object.keys(params)) if (lc(k) === lc(name)) return params[k]; return undefined; };
H.pStr = (params, name) => { const v = H.p(params, name); return v === undefined ? '' : (Array.isArray(v) ? v.map(x => V.toStr(x)).join(',') : V.toStr(v)); };
H.pHas = (params, name, re) => re.test(H.pStr(params, name));
H.outputs = st => { const r = []; for (const e of st.entries || []) for (const x of e.out || []) r.push(x); return r; };
H.outText = st => H.outputs(st).map(x => V.toStr(x)).concat(...(st.entries || []).map(e => e.hostText || [])).join('\n');
H.ranScript = (st, re) => H.cmds(st).some(c => c.script && c.ok !== false && re.test(c.name));

H.gv = (st, name, which) => { const s = st.sessions[which || 'normal'] || st.sessions.normal; const e = s && s.global.find(name); return e ? e.value : undefined; };

/* ---------- Antworten ---------- */
H.norm = s => lc(s).replace(/[„“"'`´]/g, '').replace(/\s+/g, ' ').trim();
H.ans = (st, ...accept) => {
  const a = H.norm(st.answer);
  if (!a) return false;
  return accept.some(x => x instanceof RegExp ? x.test(a) : H.norm(x) === a);
};
H.ansNum = (st, lo, hi) => {
  const a = H.norm(st.answer).replace(/\s*gb$/, '').replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(a)) return false;
  const n = parseFloat(a); return n >= lo && n <= (hi === undefined ? lo : hi);
};

/* ---------- Welt ---------- */
H.world = (st, host) => host ? (st.env.worlds[host] || Object.values(st.env.worlds).find(w => lc(w.hostname) === lc(host))) : st.env.main;
H.node = (st, path, host) => {
  const w = H.world(st, host);
  const m = /^([A-Za-z]):\\?(.*)$/.exec(path); if (!m) return null;
  let n = w.fs[m[1].toUpperCase()]; if (!n) return null;
  for (const part of m[2].split('\\').filter(Boolean)) { n = n.get(part); if (!n) return null; }
  return n;
};
H.exists = (st, path, host) => !!H.node(st, path, host);
H.isDir = (st, path, host) => { const n = H.node(st, path, host); return !!(n && n.dir); };
H.content = (st, path, host) => { const n = H.node(st, path, host); return n && !n.dir ? (n.content || '') : null; };
H.files = (st, path, host) => { const n = H.node(st, path, host); return n && n.dir ? Array.from(n.children.values()) : []; };
H.svc = (st, name, host) => H.world(st, host).services.find(s => lc(s.name) === lc(name));
H.proc = (st, pred, host) => H.world(st, host).processes.find(pred);
H.luser = (st, name, host) => (H.world(st, host).users || []).find(u => lc(u.name) === lc(name));
H.lgroup = (st, name, host) => (H.world(st, host).groups || []).find(g => lc(g.name) === lc(name));
H.lgroupHas = (st, group, member, host) => {
  const g = H.lgroup(st, group, host); if (!g) return false;
  const w = H.world(st, host);
  return g.members.some(m => lc(m) === lc(member) || lc(m) === lc(w.hostname + '\\' + member) || lc(m.split('\\').pop()) === lc(member) && !member.includes('\\'));
};
H.share = (st, name, host) => (H.world(st, host).shares || []).find(s => lc(s.name) === lc(name));
H.acl = (st, path, host) => { const n = H.node(st, path, host); return n ? GG.effAcl(n) : []; };
H.aclHas = (st, path, id, rights, host) => H.acl(st, path, host).some(r => r.type !== 'Deny' && lc(r.id) === lc(id) && (!rights || rights.includes(r.r)));
H.fw = (st, name, host) => (H.world(st, host).firewall.rules || []).find(r => lc(r.name) === lc(name));
H.ipcfg = (st, alias, host) => { const w = H.world(st, host); const a = w.net.adapters.find(x => lc(x.name) === lc(alias)); return a ? w.net.ip[a.ifIndex] : null; };
H.pkg = (st, id, host) => (H.world(st, host).packages || []).find(p => lc(p.id) === lc(id));
H.module = (st, name, host) => (H.world(st, host).modules || []).find(m => lc(m.name) === lc(name));
H.ad = st => st.env.ad;
H.adUser = (st, sam) => st.env.ad.users.find(u => lc(u.sam) === lc(sam));
H.adGroup = (st, name) => st.env.ad.groups.find(g => lc(g.sam) === lc(name) || lc(g.name) === lc(name));
H.adOu = (st, dn) => st.env.ad.ous.find(o => lc('OU=' + o.name + ',' + o.parent) === lc(dn));
H.adInGroup = (st, sam, group) => { const g = H.adGroup(st, group); const u = H.adUser(st, sam); return !!(g && u && g.members.includes(u)); };
H.csv = (text, delim) => {
  if (!text) return null;
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim() !== '');
  if (!lines.length) return null;
  const split = l => { const r = []; let cur = '', q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (ch === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if (ch === delim && !q) { r.push(cur); cur = ''; } else cur += ch; } r.push(cur); return r; };
  const typeLine = /^#TYPE/.test(lines[0]);
  const body = typeLine ? lines.slice(1) : lines;
  const head = split(body[0]);
  return { typeLine, head, rows: body.slice(1).map(l => { const v = split(l); const o = {}; head.forEach((h, i) => { o[h] = v[i]; }); return o; }) };
};
})();
