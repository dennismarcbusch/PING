/* Get-Going! – Netzwerkmodell, IP-Konfiguration, DNS, Firewall */
(function () {
'use strict';
const GG = globalThis.GG = globalThis.GG || {};
const V = GG.v, I = GG.interp, F = GG.fmt;
const { PSObject, PSHash, PSDate, PSRuntimeError } = GG;
const P = GG.P, def = GG.def;

/* ---------- IP-Hilfen ---------- */
const N = GG.net = {};
N.isIPv4 = s => /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(s) && s.split('.').every(x => +x <= 255);
N.toInt = s => s.split('.').reduce((a, x) => (a * 256) + (+x), 0) >>> 0;
N.fromInt = n => [24, 16, 8, 0].map(k => (n >>> k) & 255).join('.');
N.mask = p => p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0;
N.sameNet = (a, b, p) => ((N.toInt(a) & N.mask(p)) >>> 0) === ((N.toInt(b) & N.mask(p)) >>> 0);
N.netAddr = (a, p) => N.fromInt((N.toInt(a) & N.mask(p)) >>> 0);
N.inCidr = (ip, cidr) => { const [n, p] = cidr.split('/'); return N.sameNet(ip, n, +p); };
N.ipObj = s => { const o = new PSObject('System.Net.IPAddress', { Address: N.toInt(s), AddressFamily: 'InterNetwork', ScopeId: null, IsIPv6Multicast: false, IsIPv6LinkLocal: false, IsIPv6SiteLocal: false, IsIPv6Teredo: false, IsIPv4MappedToIPv6: false, IPAddressToString: s }); o.toStringFn = () => s; return o; };

/* ---------- Netzwerk (gemeinsam) ---------- */
class Network {
  constructor(o) { Object.assign(this, { worlds: [], hosts: [], zones: {}, external: {}, internetIPs: [], segments: [] }, o || {}); }
  add(w) { this.worlds.push(w); w.netw = this; return w; }
}
GG.Network = Network;
const NW = GG.netw = {};

/* aktuelle IPv4-Adressen einer Welt */
NW.addrs = function (w) {
  const res = [];
  if (!w.net) return res;
  for (const a of w.net.adapters) {
    if (!a.enabled || !a.connected) continue;
    const cfg = w.net.ip[a.ifIndex]; if (!cfg) continue;
    for (const ad of cfg.addrs) res.push({ ip: ad.ip, prefix: ad.prefix, adapter: a, cfg, origin: ad.origin });
  }
  return res;
};
/* alle Hosts im Netz (statische + Welten) */
NW.allHosts = function (netw) {
  const hs = netw.hosts.slice();
  for (const w of netw.worlds) for (const a of NW.addrs(w)) if (!/^169\.254\./.test(a.ip)) hs.push({ name: w.hostname, ip: a.ip, seg: a.adapter.seg, online: w.online, world: w, os: 'windows', dns: w.dnsServer ? true : false, zones: w.dnsZones });
  return hs;
};
NW.hostByIp = function (netw, ip) { return NW.allHosts(netw).find(h => h.ip === ip); };
NW.worldByName = function (from, name) {
  const netw = from.netw;
  const n = String(name).toLowerCase().replace(/\.$/, '');
  if (n === from.hostname.toLowerCase() || n === 'localhost' || n === '.' || n === '127.0.0.1' || (from.domain && n === (from.hostname + '.' + from.domain).toLowerCase())) return from;
  if (NW.addrs(from).some(a => a.ip === n)) return from;
  if (!netw) return null;
  for (const w of netw.worlds) {
    if (w.hostname.toLowerCase() === n || (w.domain && (w.hostname + '.' + w.domain).toLowerCase() === n)) return w;
    if (NW.addrs(w).some(a => a.ip === n)) return w;
  }
  return null;
};
NW.internet = function (w) {
  const r = NW.route(w, '1.1.1.1');
  if (!r.ok) return false;
  const d = NW.resolve(w, 'www.powershellgallery.com');
  return !d.error;
};

/* Routing-Entscheidung: von Welt w zu IP */
NW.route = function (w, ip) {
  const netw = w.netw;
  const addrs = NW.addrs(w);
  if (ip === '127.0.0.1' || addrs.some(a => a.ip === ip)) return { ok: true, self: true, src: ip === '127.0.0.1' ? '127.0.0.1' : ip, adapter: addrs.find(a => a.ip === ip) ? addrs.find(a => a.ip === ip).adapter : null };
  if (!addrs.length) return { ok: false, reason: 'noroute' };
  // direkt
  for (const a of addrs) {
    if (N.sameNet(a.ip, ip, a.prefix)) {
      if (/^169\.254\./.test(a.ip) && !/^169\.254\./.test(ip)) continue;
      const h = netw ? NW.allHosts(netw).find(x => x.ip === ip && x.seg === a.adapter.seg) : null;
      if (!h || h.online === false) return { ok: false, reason: 'unreachable', src: a.ip, adapter: a.adapter };
      return { ok: true, host: h, src: a.ip, adapter: a.adapter, hops: 0 };
    }
  }
  // Standardgateway
  for (const a of addrs) {
    const gw = (a.cfg.gw || [])[0];
    if (!gw || /^169\.254\./.test(a.ip)) continue;
    if (!N.sameNet(a.ip, gw, a.prefix)) continue;
    const gh = netw ? NW.allHosts(netw).find(x => x.ip === gw && x.seg === a.adapter.seg) : null;
    if (!gh || gh.online === false) return { ok: false, reason: 'unreachable', src: a.ip, adapter: a.adapter };
    // Ziel hinter dem Router
    const h = NW.allHosts(netw).find(x => x.ip === ip && x.seg !== a.adapter.seg && (gh.routes || []).some(seg => seg === x.seg));
    if (h) return h.online === false ? { ok: false, reason: 'timeout', src: a.ip, adapter: a.adapter } : { ok: true, host: h, src: a.ip, adapter: a.adapter, hops: 1 };
    if (netw.internetIPs.includes(ip) && gh.internet) return { ok: true, host: { ip, internet: true, os: 'internet' }, src: a.ip, adapter: a.adapter, hops: 9 };
    return { ok: false, reason: 'timeout', src: a.ip, adapter: a.adapter };
  }
  return { ok: false, reason: 'noroute', src: addrs[0].ip };
};

/* Firewall-Auswertung eingehend */
NW.fwAllows = function (w, proto, port, icmpType) {
  const fw = w.firewall;
  if (!fw) return true;
  if (!fw.profiles.Domain) return true;
  const match = r => r.enabled && r.direction === 'Inbound' && (r.protocol === 'Any' || String(r.protocol).toUpperCase() === proto.toUpperCase()) &&
    (proto.startsWith('ICMP') ? (r.icmpType === undefined || r.icmpType === 'Any' || String(r.icmpType).split(/[,:]/)[0] === String(icmpType)) : (!r.localPort || r.localPort === 'Any' || V.toArr(r.localPort).some(x => String(x) === String(port))));
  if (fw.rules.some(r => match(r) && r.action === 'Block')) return false;
  return fw.rules.some(r => match(r) && r.action === 'Allow');
};
NW.icmpOk = function (h) {
  if (h.world) return NW.fwAllows(h.world, 'ICMPv4', null, 8);
  return h.icmp !== false;
};
NW.listening = function (w) {
  const ports = [];
  const run = n => w.services.some(s => s.name.toLowerCase() === n && s.status === 'Running');
  if (run('winrm') && w.winrmListener !== false) ports.push(5985);
  if (run('lanmanserver')) ports.push(445, 139);
  if (run('termservice')) ports.push(3389);
  if (run('dns')) ports.push(53);
  if (run('ntds')) ports.push(88, 389, 636, 3268);
  if (run('w3svc')) ports.push(80, 443);
  for (const p of w.listen || []) ports.push(p);
  return ports;
};
NW.tcpOk = function (h, port) {
  if (h.world) return NW.listening(h.world).includes(port) && NW.fwAllows(h.world, 'TCP', port);
  return (h.ports || []).includes(port);
};

/* DNS */
NW.dnsServers = function (w) {
  for (const a of w.net ? w.net.adapters : []) {
    if (!a.enabled || !a.connected) continue;
    const cfg = w.net.ip[a.ifIndex];
    if (cfg && cfg.dns && cfg.dns.length) return cfg.dns;
  }
  return [];
};
NW.resolve = function (w, name) {
  const n = String(name).toLowerCase().replace(/\.$/, '');
  if (n === 'localhost') return { ip: '127.0.0.1', fqdn: 'localhost' };
  if (n === w.hostname.toLowerCase() || (w.domain && n === (w.hostname + '.' + w.domain).toLowerCase())) { const a = NW.addrs(w).find(x => !/^169/.test(x.ip)) || NW.addrs(w)[0]; return { ip: a ? a.ip : '127.0.0.1', fqdn: w.hostname.toLowerCase() + (w.domain ? '.' + w.domain : '') }; }
  const servers = NW.dnsServers(w);
  if (!servers.length) return { error: 'noserver' };
  for (const sip of servers) {
    const r = NW.route(w, sip);
    if (!r.ok) continue;
    const h = r.host || {};
    if (r.self) { /* eigener DNS-Server */ }
    const srvW = r.self ? w : h.world;
    const dnsRun = x => !!(x && x.dnsServer && x.services.some(s => s.name === 'DNS' && s.status === 'Running'));
    const isDns = r.self ? dnsRun(w) : (srvW ? dnsRun(srvW) : !!h.dns);
    if (!isDns) continue;
    const zones = (srvW && srvW.dnsZones) || h.zones || {};
    const candidates = n.includes('.') ? [n] : [n + '.' + (w.domain || '')].concat([n]);
    for (const cand of candidates) {
      for (const [zone, recs] of Object.entries(zones)) {
        if (cand === zone || cand.endsWith('.' + zone)) {
          const label = cand === zone ? '@' : cand.slice(0, -(zone.length + 1));
          const rec = recs[label];
          if (rec) return Object.assign({ fqdn: cand, ip: typeof rec === 'string' ? rec : rec.a, server: sip }, typeof rec === 'object' ? rec : {});
          return { error: 'nx', server: sip, fqdn: cand };
        }
      }
    }
    // Weiterleitung ins Internet
    const ext = w.netw && w.netw.external[n];
    const fwdOk = (srvW ? NW.internet0(srvW) : h.internet);
    if (n.includes('.') && fwdOk) { if (ext) return Object.assign({ fqdn: n, server: sip }, typeof ext === 'string' ? { ip: ext } : ext); return { error: 'nx', server: sip, fqdn: n }; }
    if (n.includes('.') && !fwdOk) return { error: 'timeout', server: sip };
    return { error: 'nx', server: sip, fqdn: n + (w.domain ? '.' + w.domain : '') };
  }
  return { error: 'timeout' };
};
NW.internet0 = function (w) { const r = NW.route(w, '1.1.1.1'); return r.ok; };

/* Ping */
NW.ping = function (w, target) {
  let ip = target, fqdn = null;
  if (!N.isIPv4(target)) {
    const d = NW.resolve(w, target);
    if (d.error) return { ok: false, reason: 'dns', dnsErr: d.error };
    ip = d.ip; fqdn = d.fqdn;
  }
  const r = NW.route(w, ip);
  const base = { ip, fqdn, src: r.src };
  if (!r.ok) return Object.assign(base, { ok: false, reason: r.reason });
  if (r.self) return Object.assign(base, { ok: true, ttl: 128, time: 0 });
  if (!NW.icmpOk(r.host)) return Object.assign(base, { ok: false, reason: 'timeout' });
  const os = r.host.os || 'windows';
  const ttl = (os === 'linux' || os === 'router' ? 64 : (os === 'internet' ? 55 : 128)) - (r.hops || 0);
  return Object.assign(base, { ok: true, ttl, time: r.host.internet ? 11 + Math.floor(Math.random() * 6) : (r.hops ? 1 : 0) });
};
/* TCP-Test */
NW.tcp = function (w, target, port) {
  let ip = target;
  if (!N.isIPv4(target)) { const d = NW.resolve(w, target); if (d.error) return { ok: false, reason: 'dns' }; ip = d.ip; }
  const r = NW.route(w, ip);
  if (!r.ok) return { ok: false, ip, reason: r.reason, src: r.src, adapter: r.adapter };
  if (r.self) return { ok: NW.listening(w).includes(port), ip, src: ip, adapter: r.adapter };
  return { ok: NW.tcpOk(r.host, port), ip, src: r.src, adapter: r.adapter, host: r.host };
};

/* Remote-Welt für -ComputerName (RPC/DCOM bzw. WinRM) */
NW.remoteWorldOrError = function (c, name, cmd, winrm) {
  const w0 = c.world;
  const n = V.toStr(name);
  if (/^(localhost|\.|127\.0\.0\.1)$/i.test(n) || n.toLowerCase() === w0.hostname.toLowerCase()) return w0;
  const d = N.isIPv4(n) ? { ip: n } : NW.resolve(w0, n);
  const target = d.error ? null : NW.worldByName(w0, d.ip);
  const r = d.error ? null : NW.route(w0, d.ip);
  const ok = target && r && r.ok && target.online && (!winrm || NW.tcpOk({ world: target }, 5985));
  if (ok) return target;
  if (winrm) c.error(`Der WinRM-Client kann die Anforderung nicht verarbeiten. Stellen Sie sicher, dass der Computer "${n}" erreichbar ist und WinRM ausgeführt wird. `, { category: 'ConnectionError', exception: 'Microsoft.Management.Infrastructure.CimException', fqid: 'HRESULT 0x80338126,' + GG.cmdClassName(cmd), noClass: true, target: n });
  else c.error(`Der RPC-Server ist nicht verfügbar. (Ausnahme von HRESULT: 0x800706BA)`, { category: 'NotSpecified', exception: 'System.Runtime.InteropServices.COMException', fqid: 'System.Runtime.InteropServices.COMException,' + GG.cmdClassName(cmd), noClass: true, target: '' });
  return null;
};

/* ---------- CIM-Objekte ---------- */
const NA = 'Microsoft.Management.Infrastructure.CimInstance#ROOT/StandardCimv2/MSFT_NetAdapter';
const NIP = 'Microsoft.Management.Infrastructure.CimInstance#ROOT/StandardCimv2/MSFT_NetIPAddress';
const NIF = 'Microsoft.Management.Infrastructure.CimInstance#ROOT/StandardCimv2/MSFT_NetIPInterface';
const NRT = 'Microsoft.Management.Infrastructure.CimInstance#ROOT/StandardCimv2/MSFT_NetRoute';
const DNSS = 'Microsoft.Management.Infrastructure.CimInstance#ROOT/StandardCimv2/MSFT_DNSClientServerAddress';
const FWR = 'Microsoft.Management.Infrastructure.CimInstance#root/standardcimv2/MSFT_NetFirewallRule';
const FWP = 'Microsoft.Management.Infrastructure.CimInstance#root/standardcimv2/MSFT_NetFirewallProfile';
const FWPF = 'Microsoft.Management.Infrastructure.CimInstance#root/standardcimv2/MSFT_NetProtocolPortFilter';
const TCPC = 'Microsoft.Management.Infrastructure.CimInstance#ROOT/StandardCimv2/MSFT_NetTCPConnection';
const CIMBASE = 'Microsoft.Management.Infrastructure.CimInstance';
function cimErr(c, cmd, msg, cat, code) { c.error(msg, { category: cat || 'PermissionDenied', exception: 'Microsoft.Management.Infrastructure.CimException', fqid: `Windows System Error ${code || 5},${cmd}`, noClass: true, target: cmd.includes('Firewall') ? 'MSFT_NetFirewallRule' : 'MSFT_' + cmd.replace(/^\w+-/, ''), reason: 'CimException' }); }
function needAdmin(c, cmd) { if (c.session.elevated || c.session.remoteOrigin) return true; cimErr(c, cmd, 'Zugriff verweigert ', 'PermissionDenied', 5); return false; }
function notFoundCim(c, cmd, cls, prop, val) { c.error(`Es wurden keine ${cls}-Objekte gefunden, bei denen die ${prop}-Eigenschaft gleich "${val}" ist. Vergewissern Sie sich, dass der Eigenschaftswert richtig ist, und wiederholen Sie den Vorgang.`, { category: 'ObjectNotFound', exception: 'Microsoft.Management.Infrastructure.CimException', fqid: `CmdletizationQuery_NotFound_${prop},${cmd}`, noClass: true, target: val, reason: 'CimJobException' }); }

GG.view(NA, { table: [{ l: 'Name', p: 'Name', w: 25 }, { l: 'InterfaceDescription', p: 'InterfaceDescription', w: 39 }, { l: 'ifIndex', p: 'ifIndex', w: 7, a: 'r' }, { l: 'Status', p: 'Status', w: 12 }, { l: 'MacAddress', p: 'MacAddress', w: 17 }, { l: 'LinkSpeed', p: 'LinkSpeed', a: 'r' }] });
function adapterObj(a) {
  const status = !a.enabled ? 'Disabled' : (a.connected ? 'Up' : 'Disconnected');
  const o = new PSObject([NA, CIMBASE], { Name: a.name, InterfaceDescription: a.desc, ifIndex: a.ifIndex, Status: status, MacAddress: a.mac, LinkSpeed: a.enabled && a.connected ? a.speed : '0 bps', MediaConnectionState: a.connected ? 'Connected' : 'Disconnected', InterfaceAlias: a.name, AdminStatus: a.enabled ? 'Up' : 'Down', MtuSize: 1500, DriverDescription: a.desc, ifDesc: a.desc, InterfaceGuid: '{' + (a.ifIndex * 7919).toString(16).padStart(8, '0') + '-2C3D-4E5F-8A9B-0C1D2E3F4A5B}', FullDuplex: true, Virtual: false }, { ref: a });
  return o;
}
function findAdapters(c, p, cmd) {
  const w = c.world; const res = [];
  const names = p.Name || p.InterfaceAlias;
  if (p.InterfaceIndex !== undefined) { for (const i of V.toArr(p.InterfaceIndex)) { const a = w.net.adapters.find(x => x.ifIndex === i); if (!a) notFoundCim(c, cmd, 'MSFT_NetAdapter', 'InterfaceIndex', i); else res.push(a); } return res; }
  if (!names) return w.net.adapters.slice();
  for (const n of V.toArr(names)) { const m = w.net.adapters.filter(a => V.like(a.name, n)); if (!m.length && !V.hasWild(n)) notFoundCim(c, cmd, 'MSFT_NetAdapter', 'Name', n); res.push(...m); }
  return res;
}
const adP = () => [P('Name', 'string[]', { pos: 0, aliases: ['ifAlias', 'InterfaceAlias'] }), P('InterfaceIndex', 'int[]', { aliases: ['ifIndex'] }), P('InputObject', 'object', { pipe: 'value' }), P('PassThru', 'switch'), P('CimSession', 'object')];
def({ name: 'Get-NetAdapter', module: 'NetAdapter', version: '2.0.0.0', cmdType: 'Function', input: 'none', params: [P('Name', 'string[]', { pos: 0, aliases: ['ifAlias', 'InterfaceAlias'] }), P('InterfaceIndex', 'int[]', { aliases: ['ifIndex'] }), P('InterfaceDescription', 'string[]'), P('Physical', 'switch'), P('IncludeHidden', 'switch'), P('CimSession', 'object')],
  run: async (c, p) => { let l = findAdapters(c, p, 'Get-NetAdapter'); if (p.InterfaceDescription) l = l.filter(a => p.InterfaceDescription.some(x => V.like(a.desc, x))); c.outAll(l.map(adapterObj)); } });
for (const [nm, act] of [['Enable-NetAdapter', 'en'], ['Disable-NetAdapter', 'dis'], ['Restart-NetAdapter', 're']]) def({ name: nm, module: 'NetAdapter', version: '2.0.0.0', cmdType: 'Function', input: 'collect', sp: true, params: adP(),
  run: async (c, p, input) => {
    const list = input && input.length ? input.map(o => o.ref).filter(Boolean) : findAdapters(c, p, nm);
    for (const a of list) {
      if (!(await c.should(a.name, nm, { high: act === 'dis' }))) continue;
      if (!needAdmin(c, nm)) return;
      if (act === 'en') a.enabled = true; else if (act === 'dis') a.enabled = false; else a.enabled = true;
      if (act !== 'dis') GG.netx.dhcpRefresh(c.world, a);
      if (p.PassThru) c.out(adapterObj(a));
    }
  } });
def({ name: 'Rename-NetAdapter', module: 'NetAdapter', version: '2.0.0.0', cmdType: 'Function', input: 'collect', sp: true, params: [P('Name', 'string[]', { pos: 0 }), P('NewName', 'string', { pos: 1, mandatory: true }), P('PassThru', 'switch'), P('InputObject', 'object')],
  run: async (c, p, input) => {
    const list = input && input.length ? input.map(o => o.ref).filter(Boolean) : findAdapters(c, p, 'Rename-NetAdapter');
    for (const a of list) { if (!(await c.should(a.name, 'Rename-NetAdapter'))) continue; if (!needAdmin(c, 'Rename-NetAdapter')) return; if (c.world.net.adapters.some(x => x !== a && x.name.toLowerCase() === p.NewName.toLowerCase())) return cimErr(c, 'Rename-NetAdapter', 'Es ist bereits ein Objekt mit diesem Namen vorhanden. ', 'ResourceExists', 183); a.name = p.NewName; if (p.PassThru) c.out(adapterObj(a)); }
  } });

/* ---------- IP-Konfiguration ---------- */
GG.netx = {};
GG.netx.dhcpRefresh = function (w, a) {
  const cfg = w.net.ip[a.ifIndex];
  if (!cfg || !cfg.dhcp) return;
  // DHCP-Server im Segment?
  const seg = w.netw && w.netw.segments.find(s => s.cidr === a.seg);
  cfg.addrs = cfg.addrs.filter(x => x.origin === 'Manual');
  if (seg && seg.dhcp) { cfg.addrs.push({ ip: seg.dhcp.next(), prefix: +seg.cidr.split('/')[1], origin: 'Dhcp' }); cfg.gw = [seg.router]; cfg.dns = seg.dhcp.dns.slice(); }
  else { cfg.addrs.push({ ip: cfg.apipa || '169.254.' + (a.ifIndex * 3) + '.' + (37 + a.ifIndex), prefix: 16, origin: 'WellKnown' }); }
};
function ipObj(w, a, ad, store) {
  const ifi = a ? a.ifIndex : 1;
  const alias = a ? a.name : 'Loopback Pseudo-Interface 1';
  const isV6 = ad.ip.includes(':');
  const o = new PSObject([NIP, CIMBASE], {
    IPAddress: ad.ip, InterfaceIndex: ifi, InterfaceAlias: alias, AddressFamily: isV6 ? 'IPv6' : 'IPv4', Type: 'Unicast', PrefixLength: ad.prefix,
    PrefixOrigin: ad.origin === 'WellKnown' ? 'WellKnown' : (ad.origin === 'Dhcp' ? 'Dhcp' : (ad.origin === 'Link' ? 'WellKnown' : 'Manual')),
    SuffixOrigin: ad.origin === 'WellKnown' ? 'Link' : (ad.origin === 'Dhcp' ? 'Dhcp' : (ad.origin === 'Link' ? 'Link' : 'Manual')),
    AddressState: ad.origin === 'WellKnown' ? 'Preferred' : 'Preferred', ValidLifetime: ad.origin === 'Dhcp' ? '7.23:59:12' : 'Infinite ([TimeSpan]::MaxValue)', PreferredLifetime: ad.origin === 'Dhcp' ? '7.23:59:12' : 'Infinite ([TimeSpan]::MaxValue)', SkipAsSource: false, PolicyStore: store || 'ActiveStore'
  }, { ref: ad });
  o.adapter = a;
  return o;
}
GG.view(NIP, { kind: 'list', list: ['IPAddress', 'InterfaceIndex', 'InterfaceAlias', 'AddressFamily', 'Type', 'PrefixLength', 'PrefixOrigin', 'SuffixOrigin', 'AddressState', 'ValidLifetime', 'PreferredLifetime', 'SkipAsSource', 'PolicyStore'].map(p => ({ p })),
  table: [{ l: 'ifIndex', p: 'InterfaceIndex', w: 7, a: 'r' }, { l: 'IPAddress', p: 'IPAddress', w: 40 }, { l: 'PrefixLength', p: 'PrefixLength', w: 12, a: 'r' }, { l: 'PrefixOrigin', p: 'PrefixOrigin', w: 12 }, { l: 'SuffixOrigin', p: 'SuffixOrigin', w: 12 }, { l: 'AddressState', p: 'AddressState', w: 12 }, { l: 'PolicyStore', p: 'PolicyStore' }] });
function allIpObjs(w) {
  const res = [];
  for (const a of w.net.adapters) {
    const cfg = w.net.ip[a.ifIndex];
    if (!cfg || !a.enabled) continue;
    res.push(ipObj(w, a, { ip: 'fe80::' + (a.ifIndex * 4099).toString(16) + ':' + (a.ifIndex * 31).toString(16) + 'c2:' + (0x8a10 + a.ifIndex).toString(16) + ':' + (0x4f20 + a.ifIndex * 7).toString(16) + '%' + a.ifIndex, prefix: 64, origin: 'Link' }));
    for (const ad of cfg.addrs) res.push(ipObj(w, a, ad));
  }
  res.push(ipObj(w, null, { ip: '::1', prefix: 128, origin: 'WellKnown' }));
  res.push(ipObj(w, null, { ip: '127.0.0.1', prefix: 8, origin: 'WellKnown' }));
  return res;
}
function adapterByParams(c, p, cmd) {
  const w = c.world;
  let a;
  if (p.InterfaceIndex !== undefined) { a = w.net.adapters.find(x => x.ifIndex === V.toArr(p.InterfaceIndex)[0]); if (!a) notFoundCim(c, cmd, 'MSFT_NetIPInterface', 'InterfaceIndex', V.toArr(p.InterfaceIndex)[0]); }
  else if (p.InterfaceAlias !== undefined) { const n = V.toArr(p.InterfaceAlias)[0]; a = w.net.adapters.find(x => x.name.toLowerCase() === V.toStr(n).toLowerCase()); if (!a) notFoundCim(c, cmd, 'MSFT_NetIPInterface', 'InterfaceAlias', n); }
  return a;
}
def({ name: 'Get-NetIPAddress', module: 'NetTCPIP', version: '1.0.0.0', cmdType: 'Function', input: 'none',
  params: [P('IPAddress', 'string[]', { pos: 0 }), P('InterfaceAlias', 'string[]', { aliases: ['ifAlias'] }), P('InterfaceIndex', 'int[]', { aliases: ['ifIndex'] }), P('AddressFamily', 'enum[]', { values: ['IPv4', 'IPv6'], aliases: ['Family'] }), P('PrefixOrigin', 'enum[]', { values: ['Other', 'Manual', 'WellKnown', 'Dhcp', 'RouterAdvertisement'] }), P('PrefixLength', 'int[]'), P('Type', 'string'), P('PolicyStore', 'string'), P('CimSession', 'object')],
  run: async (c, p) => {
    let l = allIpObjs(c.world);
    if (p.InterfaceAlias) { const m = l.filter(o => p.InterfaceAlias.some(x => V.like(o.get('InterfaceAlias'), x))); if (!m.length) return notFoundCim(c, 'Get-NetIPAddress', 'MSFT_NetIPAddress', 'InterfaceAlias', p.InterfaceAlias[0]); l = m; }
    if (p.InterfaceIndex) { const m = l.filter(o => p.InterfaceIndex.includes(o.get('InterfaceIndex'))); if (!m.length) return notFoundCim(c, 'Get-NetIPAddress', 'MSFT_NetIPAddress', 'InterfaceIndex', p.InterfaceIndex[0]); l = m; }
    if (p.AddressFamily) l = l.filter(o => p.AddressFamily.includes(o.get('AddressFamily')));
    if (p.PrefixOrigin) l = l.filter(o => p.PrefixOrigin.includes(o.get('PrefixOrigin')));
    if (p.PrefixLength) l = l.filter(o => p.PrefixLength.includes(o.get('PrefixLength')));
    if (p.IPAddress) { const m = l.filter(o => p.IPAddress.some(x => V.like(o.get('IPAddress'), x))); if (!m.length) return notFoundCim(c, 'Get-NetIPAddress', 'MSFT_NetIPAddress', 'IPAddress', p.IPAddress[0]); l = m; }
    if (p.PolicyStore && /persistent/i.test(p.PolicyStore)) l = l.filter(o => o.ref && o.ref.origin === 'Manual').map(o => { o.set('PolicyStore', 'PersistentStore'); return o; });
    c.outAll(l);
  } });
def({ name: 'New-NetIPAddress', module: 'NetTCPIP', version: '1.0.0.0', cmdType: 'Function', input: 'none', sp: true,
  params: [P('IPAddress', 'string', { pos: 0, mandatory: true, aliases: ['LocalAddress'] }), P('InterfaceAlias', 'string', { aliases: ['ifAlias'] }), P('InterfaceIndex', 'int', { aliases: ['ifIndex'] }), P('PrefixLength', 'int', { aliases: ['Length'], range: [0, 128] }), P('DefaultGateway', 'string'), P('AddressFamily', 'enum', { values: ['IPv4', 'IPv6'], aliases: ['Family'] }), P('Type', 'string'), P('SkipAsSource', 'bool'), P('PolicyStore', 'string'), P('ValidLifetime', 'object'), P('PreferredLifetime', 'object'), P('CimSession', 'object')],
  run: async (c, p) => {
    const w = c.world;
    if (p.InterfaceAlias === undefined && p.InterfaceIndex === undefined) return c.error('Das Argument "InterfaceAlias" oder "InterfaceIndex" muss angegeben werden.', { category: 'InvalidArgument', fqid: 'MissingInterface,New-NetIPAddress', noClass: true });
    const a = adapterByParams(c, p, 'New-NetIPAddress'); if (!a) return;
    if (!N.isIPv4(p.IPAddress)) return cimErr(c, 'New-NetIPAddress', 'Ungültiger Parameter IPAddress ', 'InvalidArgument', 87);
    if (p.DefaultGateway && !N.isIPv4(p.DefaultGateway)) return cimErr(c, 'New-NetIPAddress', 'Ungültiger Parameter DefaultGateway ', 'InvalidArgument', 87);
    if (!(await c.should(`IPAddress: ${p.IPAddress}, InterfaceIndex: ${a.ifIndex}, Store: Active`, 'Create'))) return;
    if (!needAdmin(c, 'New-NetIPAddress')) return;
    const cfg = w.net.ip[a.ifIndex];
    if (cfg.dhcp) return c.error('Inkonsistente Parameter PolicyStore PersistentStore und Dhcp Enabled', { category: 'InvalidArgument', exception: 'Microsoft.Management.Infrastructure.CimException', fqid: 'Windows System Error 87,New-NetIPAddress', noClass: true, target: 'MSFT_NetIPAddress:ROOT/StandardCimv2/MSFT_NetIPAddress', reason: 'CimException' });
    const prefix = p.PrefixLength === undefined ? 8 : p.PrefixLength;
    if (prefix > 32) return cimErr(c, 'New-NetIPAddress', 'Ungültiger Parameter PrefixLength ', 'InvalidArgument', 87);
    for (const x of w.net.adapters) { const cc = w.net.ip[x.ifIndex]; if (cc && cc.addrs.some(ad => ad.ip === p.IPAddress)) return c.error('Das Objekt ist bereits vorhanden.', { category: 'ResourceExists', exception: 'Microsoft.Management.Infrastructure.CimException', fqid: 'Windows System Error 5010,New-NetIPAddress', noClass: true, target: 'MSFT_NetIPAddress:ROOT/StandardCimv2/MSFT_NetIPAddress', reason: 'CimException' }); }
    if (p.DefaultGateway && cfg.gw && cfg.gw.length) {
      cfg.addrs.push({ ip: p.IPAddress, prefix, origin: 'Manual' });
      const o1 = ipObj(w, a, cfg.addrs[cfg.addrs.length - 1], 'ActiveStore'); c.out(o1);
      return c.error('Instance DefaultGateway already exists', { category: 'InvalidArgument', exception: 'System.Exception', fqid: 'Windows System Error 87,New-NetIPAddress', noClass: true, target: 'MSFT_NetIPAddress:ROOT/StandardCimv2/MSFT_NetIPAddress', reason: 'Exception' });
    }
    const ad = { ip: p.IPAddress, prefix, origin: 'Manual' };
    cfg.addrs.push(ad);
    if (p.DefaultGateway) cfg.gw = [p.DefaultGateway];
    c.out(ipObj(w, a, ad, 'ActiveStore'));
    c.out(ipObj(w, a, ad, 'PersistentStore'));
  } });
def({ name: 'Remove-NetIPAddress', module: 'NetTCPIP', version: '1.0.0.0', cmdType: 'Function', input: 'collect', sp: true,
  params: [P('IPAddress', 'string[]', { pos: 0 }), P('InterfaceAlias', 'string[]', { aliases: ['ifAlias'] }), P('InterfaceIndex', 'int[]', { aliases: ['ifIndex'] }), P('PrefixLength', 'int[]'), P('AddressFamily', 'enum[]', { values: ['IPv4', 'IPv6'] }), P('DefaultGateway', 'string'), P('IncludeAllCompartments', 'switch'), P('PassThru', 'switch'), P('InputObject', 'object')],
  run: async (c, p, input) => {
    const w = c.world;
    let list = input && input.length ? input.filter(o => o.ref && o.adapter) : allIpObjs(w).filter(o => o.adapter && o.ref && o.ref.origin !== 'Link');
    if (!(input && input.length)) {
      if (p.IPAddress) list = list.filter(o => p.IPAddress.some(x => V.like(o.get('IPAddress'), x)));
      if (p.InterfaceAlias) list = list.filter(o => p.InterfaceAlias.some(x => V.like(o.get('InterfaceAlias'), x)));
      if (p.InterfaceIndex) list = list.filter(o => p.InterfaceIndex.includes(o.get('InterfaceIndex')));
      if (p.AddressFamily) list = list.filter(o => p.AddressFamily.includes(o.get('AddressFamily')));
      if (!list.length) return notFoundCim(c, 'Remove-NetIPAddress', 'MSFT_NetIPAddress', p.IPAddress ? 'IPAddress' : 'InterfaceAlias', (p.IPAddress || p.InterfaceAlias || [''])[0]);
    }
    for (const o of list) {
      const a = o.adapter;
      if (!(await c.should(`IPAddress: ${o.get('IPAddress')}, InterfaceIndex: ${a.ifIndex}, Store: Active`, 'Delete', { high: true }))) continue;
      if (!needAdmin(c, 'Remove-NetIPAddress')) return;
      const cfg = w.net.ip[a.ifIndex];
      cfg.addrs = cfg.addrs.filter(x => x !== o.ref);
      if (p.DefaultGateway) cfg.gw = (cfg.gw || []).filter(g => g !== p.DefaultGateway);
      if (p.PassThru) c.out(o);
    }
  } });
def({ name: 'Set-NetIPAddress', module: 'NetTCPIP', version: '1.0.0.0', cmdType: 'Function', input: 'none', sp: true, params: [P('IPAddress', 'string[]', { pos: 0 }), P('InterfaceAlias', 'string[]'), P('InterfaceIndex', 'int[]'), P('PrefixLength', 'int'), P('SkipAsSource', 'bool'), P('PassThru', 'switch')],
  run: async (c, p) => {
    const l = allIpObjs(c.world).filter(o => o.adapter && (!p.IPAddress || p.IPAddress.includes(o.get('IPAddress'))) && (!p.InterfaceAlias || p.InterfaceAlias.some(x => V.like(o.get('InterfaceAlias'), x))) && o.get('AddressFamily') === 'IPv4' && o.ref.origin !== 'Link');
    if (!l.length) return notFoundCim(c, 'Set-NetIPAddress', 'MSFT_NetIPAddress', 'IPAddress', (p.IPAddress || [''])[0]);
    for (const o of l) { if (!(await c.should(o.get('IPAddress'), 'Set-NetIPAddress'))) continue; if (!needAdmin(c, 'Set-NetIPAddress')) return; if (p.PrefixLength !== undefined) o.ref.prefix = p.PrefixLength; if (p.PassThru) c.out(ipObj(c.world, o.adapter, o.ref)); }
  } });
GG.view(NIF, { table: [{ l: 'ifIndex', p: 'ifIndex', w: 7, a: 'r' }, { l: 'InterfaceAlias', p: 'InterfaceAlias', w: 33 }, { l: 'AddressFamily', p: 'AddressFamily', w: 13 }, { l: 'NlMtu(Bytes)', p: 'NlMtu', w: 12, a: 'r' }, { l: 'InterfaceMetric', p: 'InterfaceMetric', w: 15, a: 'r' }, { l: 'Dhcp', p: 'Dhcp', w: 8 }, { l: 'ConnectionState', p: 'ConnectionState', w: 15 }, { l: 'PolicyStore', p: 'PolicyStore' }] });
function ifObjs(w) {
  const res = [];
  for (const fam of ['IPv6', 'IPv4']) {
    for (const a of w.net.adapters) { if (!a.enabled) continue; const cfg = w.net.ip[a.ifIndex]; res.push(new PSObject([NIF, CIMBASE], { ifIndex: a.ifIndex, InterfaceAlias: a.name, AddressFamily: fam, NlMtu: 1500, InterfaceMetric: a.metric || 15, Dhcp: fam === 'IPv4' ? (cfg.dhcp ? 'Enabled' : 'Disabled') : 'Disabled', ConnectionState: a.connected ? 'Connected' : 'Disconnected', PolicyStore: 'ActiveStore' }, { ref: a })); }
    res.push(new PSObject([NIF, CIMBASE], { ifIndex: 1, InterfaceAlias: 'Loopback Pseudo-Interface 1', AddressFamily: fam, NlMtu: 4294967295, InterfaceMetric: 75, Dhcp: 'Disabled', ConnectionState: 'Connected', PolicyStore: 'ActiveStore' }));
  }
  return res;
}
def({ name: 'Get-NetIPInterface', module: 'NetTCPIP', version: '1.0.0.0', cmdType: 'Function', input: 'none', params: [P('InterfaceAlias', 'string[]', { pos: 0, aliases: ['ifAlias'] }), P('InterfaceIndex', 'int[]', { aliases: ['ifIndex'] }), P('AddressFamily', 'enum[]', { values: ['IPv4', 'IPv6'] }), P('Dhcp', 'enum', { values: ['Enabled', 'Disabled'] })],
  run: async (c, p) => { let l = ifObjs(c.world); if (p.InterfaceAlias) l = l.filter(o => p.InterfaceAlias.some(x => V.like(o.get('InterfaceAlias'), x))); if (p.InterfaceIndex) l = l.filter(o => p.InterfaceIndex.includes(o.get('ifIndex'))); if (p.AddressFamily) l = l.filter(o => p.AddressFamily.includes(o.get('AddressFamily'))); if (p.Dhcp) l = l.filter(o => o.get('Dhcp') === p.Dhcp); c.outAll(l); } });
def({ name: 'Set-NetIPInterface', module: 'NetTCPIP', version: '1.0.0.0', cmdType: 'Function', input: 'collect', sp: true, params: [P('InterfaceAlias', 'string[]', { pos: 0, aliases: ['ifAlias'] }), P('InterfaceIndex', 'int[]', { aliases: ['ifIndex'] }), P('AddressFamily', 'enum[]', { values: ['IPv4', 'IPv6'] }), P('Dhcp', 'enum', { values: ['Enabled', 'Disabled'] }), P('InterfaceMetric', 'int'), P('NlMtuBytes', 'int'), P('PassThru', 'switch'), P('InputObject', 'object')],
  run: async (c, p, input) => {
    const w = c.world;
    let adapters = input && input.length ? input.map(o => o.ref).filter(Boolean) : (p.InterfaceAlias || p.InterfaceIndex ? [adapterByParams(c, { InterfaceAlias: p.InterfaceAlias, InterfaceIndex: p.InterfaceIndex }, 'Set-NetIPInterface')].filter(Boolean) : w.net.adapters.slice());
    for (const a of adapters) {
      if (!(await c.should(a.name, 'Set-NetIPInterface'))) continue;
      if (!needAdmin(c, 'Set-NetIPInterface')) return;
      const cfg = w.net.ip[a.ifIndex];
      if (p.InterfaceMetric !== undefined) a.metric = p.InterfaceMetric;
      if (p.Dhcp && (!p.AddressFamily || p.AddressFamily.includes('IPv4'))) {
        if (p.Dhcp === 'Disabled' && cfg.dhcp) { cfg.dhcp = false; cfg.addrs = cfg.addrs.filter(x => x.origin === 'Manual'); if (cfg.gwFromDhcp) cfg.gw = []; }
        else if (p.Dhcp === 'Enabled' && !cfg.dhcp) { cfg.dhcp = true; cfg.addrs = []; cfg.gw = []; GG.netx.dhcpRefresh(w, a); }
      }
    }
  } });
GG.view('NetIPConfiguration', { kind: 'list', list: [{ p: 'InterfaceAlias' }, { p: 'InterfaceIndex' }, { p: 'InterfaceDescription' }, { l: 'NetProfile.Name', g: o => o.get('NetProfileName') }, { l: 'IPv4Address', g: o => V.toArr(o.get('IPv4Address')).join('\n') }, { l: 'IPv4DefaultGateway', g: o => o.get('IPv4DefaultGateway') }, { l: 'DNSServer', g: o => V.toArr(o.get('DNSServer')).join('\n') }] });
GG.view('NetIPConfigurationDetailed', { kind: 'list', list: ['ComputerName', 'InterfaceAlias', 'InterfaceIndex', 'InterfaceDescription', 'NetAdapter.LinkLayerAddress', 'NetAdapter.Status', 'NetProfile.Name', 'NetProfile.NetworkCategory', 'NetProfile.IPv4Connectivity', 'IPv4Address', 'IPv4DefaultGateway', 'NetIPv4Interface.NlMTU', 'NetIPv4Interface.DHCP', 'DNSServer'].map(n => ({ l: n, g: o => V.toArr(o.get(n)).join('\n') })) });
function netProfileName(w, a) {
  const cfg = w.net.ip[a.ifIndex];
  if (!a.connected || !a.enabled) return '';
  const valid = cfg.addrs.some(x => !/^169\.254/.test(x.ip));
  if (!valid) return 'Nicht identifiziertes Netzwerk';
  const dc = w.domain && NW.resolve(w, w.dc || '');
  return w.domain && dc && !dc.error ? w.domain : 'Netzwerk';
}
GG.netx.connectivity = function (w, a) {
  const cfg = w.net.ip[a.ifIndex];
  if (!cfg || !cfg.addrs.some(x => !/^169\.254/.test(x.ip))) return 'NoTraffic';
  return NW.internet0(w) ? 'Internet' : 'LocalNetwork';
};
def({ name: 'Get-NetIPConfiguration', module: 'NetTCPIP', version: '1.0.0.0', cmdType: 'Function', aliases: ['gip'], input: 'none', params: [P('InterfaceAlias', 'string', { pos: 0 }), P('InterfaceIndex', 'int'), P('Detailed', 'switch'), P('All', 'switch'), P('ComputerName', 'string')],
  run: async (c, p) => {
    const w = c.world;
    let list = w.net.adapters.filter(a => a.enabled && (p.All || a.connected));
    if (p.InterfaceAlias) { list = list.filter(a => V.like(a.name, p.InterfaceAlias)); if (!list.length) return notFoundCim(c, 'Get-NetIPConfiguration', 'MSFT_NetIPInterface', 'InterfaceAlias', p.InterfaceAlias); }
    if (p.InterfaceIndex !== undefined) list = list.filter(a => a.ifIndex === p.InterfaceIndex);
    for (const a of list) {
      const cfg = w.net.ip[a.ifIndex];
      const o = new PSObject([p.Detailed ? 'NetIPConfigurationDetailed' : 'NetIPConfiguration'], {
        ComputerName: w.hostname, InterfaceAlias: a.name, InterfaceIndex: a.ifIndex, InterfaceDescription: a.desc, NetProfileName: netProfileName(w, a),
        IPv4Address: cfg.addrs.map(x => x.ip), IPv4DefaultGateway: (cfg.gw || [])[0] || null, DNSServer: (cfg.dns || []).slice(),
        'NetAdapter.LinkLayerAddress': a.mac, 'NetAdapter.Status': a.connected ? 'Up' : 'Disconnected', 'NetProfile.Name': netProfileName(w, a), 'NetProfile.NetworkCategory': w.domain && netProfileName(w, a) === w.domain ? 'DomainAuthenticated' : 'Public',
        'NetProfile.IPv4Connectivity': GG.netx.connectivity(w, a), 'NetIPv4Interface.NlMTU': 1500, 'NetIPv4Interface.DHCP': cfg.dhcp ? 'Enabled' : 'Disabled'
      });
      if (!p.Detailed) o.hiddenProps = ['computername', 'netadapter.linklayeraddress', 'netadapter.status', 'netprofile.name', 'netprofile.networkcategory', 'netprofile.ipv4connectivity', 'netipv4interface.nlmtu', 'netipv4interface.dhcp'];
      c.out(o);
    }
  } });
/* Routen */
GG.view(NRT, { table: [{ l: 'ifIndex', p: 'ifIndex', w: 7, a: 'r' }, { l: 'DestinationPrefix', p: 'DestinationPrefix', w: 40 }, { l: 'NextHop', p: 'NextHop', w: 24 }, { l: 'RouteMetric', p: 'RouteMetric', w: 11, a: 'r' }, { l: 'ifMetric', p: 'ifMetric', w: 8, a: 'r' }, { l: 'PolicyStore', p: 'PolicyStore' }] });
function routes(w) {
  const res = [];
  const add = (a, dest, hop, metric, extra) => res.push(Object.assign({ ifIndex: a ? a.ifIndex : 1, alias: a ? a.name : 'Loopback Pseudo-Interface 1', dest, hop, metric, ifMetric: a ? (a.metric || 15) : 75 }, extra || {}));
  for (const a of w.net.adapters) {
    if (!a.enabled || !a.connected) continue;
    const cfg = w.net.ip[a.ifIndex];
    add(a, '255.255.255.255/32', '0.0.0.0', 256);
    add(a, '224.0.0.0/4', '0.0.0.0', 256);
    for (const ad of cfg.addrs) {
      add(a, N.fromInt((N.toInt(ad.ip) | (~N.mask(ad.prefix) >>> 0)) >>> 0) + '/32', '0.0.0.0', 256);
      add(a, ad.ip + '/32', '0.0.0.0', 256);
      add(a, N.netAddr(ad.ip, ad.prefix) + '/' + ad.prefix, '0.0.0.0', 256);
    }
    for (const g of cfg.gw || []) add(a, '0.0.0.0/0', g, 0, { def: true });
    for (const r of cfg.routes || []) add(a, r.dest, r.hop, r.metric || 256, { user: r });
  }
  const lo = null;
  add(lo, '255.255.255.255/32', '0.0.0.0', 256); add(lo, '224.0.0.0/4', '0.0.0.0', 256); add(lo, '127.255.255.255/32', '0.0.0.0', 256); add(lo, '127.0.0.1/32', '0.0.0.0', 256); add(lo, '127.0.0.0/8', '0.0.0.0', 256);
  return res;
}
function routeObj(r) { return new PSObject([NRT, CIMBASE], { ifIndex: r.ifIndex, InterfaceAlias: r.alias, DestinationPrefix: r.dest, NextHop: r.hop, RouteMetric: r.metric, ifMetric: r.ifMetric, PolicyStore: 'ActiveStore', AddressFamily: 'IPv4' }); }
def({ name: 'Get-NetRoute', module: 'NetTCPIP', version: '1.0.0.0', cmdType: 'Function', input: 'none', params: [P('DestinationPrefix', 'string[]', { pos: 0 }), P('InterfaceAlias', 'string[]', { aliases: ['ifAlias'] }), P('InterfaceIndex', 'int[]', { aliases: ['ifIndex'] }), P('NextHop', 'string[]'), P('AddressFamily', 'enum[]', { values: ['IPv4', 'IPv6'] })],
  run: async (c, p) => {
    let l = routes(c.world);
    if (p.AddressFamily && !p.AddressFamily.includes('IPv4')) l = [];
    if (p.DestinationPrefix) l = l.filter(r => p.DestinationPrefix.some(x => V.like(r.dest, x)));
    if (p.InterfaceAlias) l = l.filter(r => p.InterfaceAlias.some(x => V.like(r.alias, x)));
    if (p.InterfaceIndex) l = l.filter(r => p.InterfaceIndex.includes(r.ifIndex));
    if (p.NextHop) l = l.filter(r => p.NextHop.includes(r.hop));
    if (!l.length && (p.DestinationPrefix || p.InterfaceAlias)) return notFoundCim(c, 'Get-NetRoute', 'MSFT_NetRoute', p.DestinationPrefix ? 'DestinationPrefix' : 'InterfaceAlias', (p.DestinationPrefix || p.InterfaceAlias)[0]);
    c.outAll(l.map(routeObj));
  } });
def({ name: 'New-NetRoute', module: 'NetTCPIP', version: '1.0.0.0', cmdType: 'Function', input: 'none', sp: true, params: [P('DestinationPrefix', 'string', { pos: 0, mandatory: true }), P('InterfaceAlias', 'string', { aliases: ['ifAlias'] }), P('InterfaceIndex', 'int', { aliases: ['ifIndex'] }), P('NextHop', 'string'), P('RouteMetric', 'int'), P('PolicyStore', 'string')],
  run: async (c, p) => {
    const a = adapterByParams(c, p, 'New-NetRoute'); if (!a) return;
    if (!needAdmin(c, 'New-NetRoute')) return;
    const cfg = c.world.net.ip[a.ifIndex];
    if (p.DestinationPrefix === '0.0.0.0/0') { if ((cfg.gw || []).length) return cimErr(c, 'New-NetRoute', 'Instance MSFT_NetRoute already exists ', 'ResourceExists', 87); cfg.gw = [p.NextHop]; }
    else (cfg.routes = cfg.routes || []).push({ dest: p.DestinationPrefix, hop: p.NextHop || '0.0.0.0', metric: p.RouteMetric || 256 });
    c.out(routeObj({ ifIndex: a.ifIndex, alias: a.name, dest: p.DestinationPrefix, hop: p.NextHop || '0.0.0.0', metric: p.RouteMetric || 256, ifMetric: 15 }));
  } });
def({ name: 'Remove-NetRoute', module: 'NetTCPIP', version: '1.0.0.0', cmdType: 'Function', input: 'collect', sp: true, params: [P('DestinationPrefix', 'string[]', { pos: 0 }), P('InterfaceAlias', 'string[]', { aliases: ['ifAlias'] }), P('InterfaceIndex', 'int[]', { aliases: ['ifIndex'] }), P('NextHop', 'string[]'), P('PassThru', 'switch'), P('InputObject', 'object')],
  run: async (c, p, input) => {
    const w = c.world;
    let l = routes(w).filter(r => r.def || r.user);
    if (input && input.length) l = l.filter(r => input.some(o => o.get('DestinationPrefix') === r.dest && o.get('ifIndex') === r.ifIndex));
    if (p.DestinationPrefix) l = l.filter(r => p.DestinationPrefix.some(x => V.like(r.dest, x)));
    if (p.InterfaceAlias) l = l.filter(r => p.InterfaceAlias.some(x => V.like(r.alias, x)));
    if (p.InterfaceIndex) l = l.filter(r => p.InterfaceIndex.includes(r.ifIndex));
    if (p.NextHop) l = l.filter(r => p.NextHop.includes(r.hop));
    if (!l.length) return notFoundCim(c, 'Remove-NetRoute', 'MSFT_NetRoute', 'DestinationPrefix', (p.DestinationPrefix || [''])[0]);
    for (const r of l) {
      if (!(await c.should(`DestinationPrefix: ${r.dest}, InterfaceIndex: ${r.ifIndex}, NextHop: ${r.hop}, Store: Active`, 'Delete', { high: true }))) continue;
      if (!needAdmin(c, 'Remove-NetRoute')) return;
      const a = w.net.adapters.find(x => x.ifIndex === r.ifIndex); const cfg = w.net.ip[a.ifIndex];
      if (r.def) cfg.gw = (cfg.gw || []).filter(g => g !== r.hop); else cfg.routes = (cfg.routes || []).filter(x => x !== r.user);
    }
  } });
/* DNS-Client */
GG.view(DNSS, { table: [{ l: 'InterfaceAlias', p: 'InterfaceAlias', w: 28 }, { l: 'Interface Index', p: 'InterfaceIndex', w: 15, a: 'r' }, { l: 'Address Family', p: 'AddressFamily', w: 14 }, { l: 'ServerAddresses', g: o => o.get('ServerAddresses') }] });
def({ name: 'Get-DnsClientServerAddress', module: 'DnsClient', version: '1.0.0.0', cmdType: 'Function', input: 'none', params: [P('InterfaceAlias', 'string[]', { pos: 0, aliases: ['ifAlias'] }), P('InterfaceIndex', 'int[]', { aliases: ['ifIndex'] }), P('AddressFamily', 'enum[]', { values: ['IPv4', 'IPv6'] })],
  run: async (c, p) => {
    const w = c.world;
    let list = w.net.adapters.filter(a => a.enabled);
    if (p.InterfaceAlias) { list = list.filter(a => p.InterfaceAlias.some(x => V.like(a.name, x))); if (!list.length) return notFoundCim(c, 'Get-DnsClientServerAddress', 'MSFT_DNSClientServerAddress', 'InterfaceAlias', p.InterfaceAlias[0]); }
    if (p.InterfaceIndex) list = list.filter(a => p.InterfaceIndex.includes(a.ifIndex));
    for (const a of list) for (const fam of ['IPv4', 'IPv6']) {
      if (p.AddressFamily && !p.AddressFamily.includes(fam)) continue;
      c.out(new PSObject([DNSS, CIMBASE], { InterfaceAlias: a.name, InterfaceIndex: a.ifIndex, AddressFamily: fam, ServerAddresses: fam === 'IPv4' ? (w.net.ip[a.ifIndex].dns || []).slice() : [] }, { ref: a }));
    }
    if (!p.InterfaceAlias && !p.InterfaceIndex) for (const fam of ['IPv4', 'IPv6']) if (!p.AddressFamily || p.AddressFamily.includes(fam)) c.out(new PSObject([DNSS, CIMBASE], { InterfaceAlias: 'Loopback Pseudo-Interface 1', InterfaceIndex: 1, AddressFamily: fam, ServerAddresses: [] }));
  } });
def({ name: 'Set-DnsClientServerAddress', module: 'DnsClient', version: '1.0.0.0', cmdType: 'Function', input: 'collect', sp: true, params: [P('InterfaceAlias', 'string[]', { pos: 0, aliases: ['ifAlias'] }), P('InterfaceIndex', 'int[]', { aliases: ['ifIndex'] }), P('ServerAddresses', 'string[]', { aliases: ['Addresses'] }), P('ResetServerAddresses', 'switch', { aliases: ['ResetAddresses'] }), P('Validate', 'switch'), P('PassThru', 'switch'), P('InputObject', 'object')],
  run: async (c, p, input) => {
    const w = c.world;
    let adapters = input && input.length ? input.map(o => o.ref).filter(Boolean) : null;
    if (!adapters) { if (!p.InterfaceAlias && !p.InterfaceIndex) return c.error('Geben Sie InterfaceAlias oder InterfaceIndex an.', { category: 'InvalidArgument', fqid: 'MissingInterface', noClass: true }); const a = adapterByParams(c, { InterfaceAlias: p.InterfaceAlias, InterfaceIndex: p.InterfaceIndex }, 'Set-DnsClientServerAddress'); if (!a) return; adapters = [a]; }
    if (p.ServerAddresses && p.ServerAddresses.some(x => !N.isIPv4(x))) return cimErr(c, 'Set-DnsClientServerAddress', 'Der Parameter ist falsch. ', 'InvalidArgument', 87);
    for (const a of adapters) {
      if (!(await c.should(a.name, 'Set-DnsClientServerAddress'))) continue;
      if (!needAdmin(c, 'Set-DnsClientServerAddress')) return;
      const cfg = w.net.ip[a.ifIndex];
      if (p.ResetServerAddresses) cfg.dns = cfg.dhcp ? (cfg.dhcpDns || []) : [];
      else if (p.ServerAddresses) cfg.dns = p.ServerAddresses.slice();
    }
  } });
def({ name: 'Clear-DnsClientCache', module: 'DnsClient', version: '1.0.0.0', cmdType: 'Function', input: 'none', params: [], run: async (c) => { c.world.dnsCache = []; } });
GG.view('Microsoft.Management.Infrastructure.CimInstance#ROOT/StandardCimv2/MSFT_DNSClientCache', { table: [{ l: 'Entry', p: 'Entry', w: 35 }, { l: 'RecordName', p: 'Name', w: 35 }, { l: 'Record Type', p: 'Type', w: 6, a: 'r' }, { l: 'Status', p: 'Status', w: 7 }, { l: 'Section', p: 'Section', w: 7 }, { l: 'TimeTo Live', p: 'TimeToLive', w: 6, a: 'r' }, { l: 'Data Length', p: 'DataLength', w: 6, a: 'r' }, { l: 'Data', p: 'Data' }] });
def({ name: 'Get-DnsClientCache', module: 'DnsClient', version: '1.0.0.0', cmdType: 'Function', input: 'none', params: [P('Entry', 'string[]', { pos: 0 })], run: async (c) => { for (const e of c.world.dnsCache || []) c.out(new PSObject('Microsoft.Management.Infrastructure.CimInstance#ROOT/StandardCimv2/MSFT_DNSClientCache', { Entry: e.name, Name: e.name, Type: 1, Status: 0, Section: 1, TimeToLive: 600, DataLength: 4, Data: e.ip })); } });
GG.view('Microsoft.Management.Infrastructure.CimInstance#ROOT/StandardCimv2/MSFT_NetConnectionProfile', { kind: 'list', list: ['Name', 'InterfaceAlias', 'InterfaceIndex', 'NetworkCategory', 'DomainAuthenticationKind', 'IPv4Connectivity', 'IPv6Connectivity'].map(p => ({ p })) });
def({ name: 'Get-NetConnectionProfile', module: 'NetConnection', version: '1.0.0.0', cmdType: 'Function', input: 'none', params: [P('InterfaceAlias', 'string[]'), P('Name', 'string[]')],
  run: async (c) => { const w = c.world; for (const a of w.net.adapters.filter(x => x.enabled && x.connected)) { const nm = netProfileName(w, a); c.out(new PSObject('Microsoft.Management.Infrastructure.CimInstance#ROOT/StandardCimv2/MSFT_NetConnectionProfile', { Name: nm, InterfaceAlias: a.name, InterfaceIndex: a.ifIndex, NetworkCategory: w.domain && nm === w.domain ? 'DomainAuthenticated' : 'Public', DomainAuthenticationKind: w.domain && nm === w.domain ? 'Ldap' : 'None', IPv4Connectivity: GG.netx.connectivity(w, a), IPv6Connectivity: 'NoTraffic' })); } } });

/* ---------- Tests ---------- */
const PING = 'System.Management.ManagementObject#root\\cimv2\\Win32_PingStatus';
GG.view(PING, { table: [{ l: 'Source', p: 'PSComputerName', w: 13 }, { l: 'Destination', p: 'Address', w: 15 }, { l: 'IPV4Address', p: 'IPV4Address', w: 16 }, { l: 'IPV6Address', p: 'IPV6Address', w: 40 }, { l: 'Bytes', p: 'ReplySize', w: 8, a: 'r' }, { l: 'Time(ms)', p: 'ResponseTime', w: 8, a: 'r' }] });
def({ name: 'Test-Connection', module: M_(), input: 'none',
  params: [P('ComputerName', 'string[]', { pos: 0, mandatory: true, aliases: ['CN', 'IPAddress', '__SERVER', 'Server', 'Destination'] }), P('Count', 'int'), P('Quiet', 'switch'), P('Source', 'string[]', { pos: 1, aliases: ['FCN', 'SRC'] }), P('BufferSize', 'int', { aliases: ['Size', 'Bytes', 'BS'] }), P('Delay', 'int'), P('TimeToLive', 'int', { aliases: ['TTL'] }), P('AsJob', 'switch'), P('Protocol', 'string')],
  run: async (c, p) => {
    const count = p.Count || 4;
    for (const t of p.ComputerName) {
      const res = NW.ping(c.world, t);
      if (c.log) (c.log.pings = c.log.pings || []).push({ target: t, ok: res.ok, ip: res.ip });
      if (p.Quiet) { c.out(res.ok); continue; }
      if (!res.ok) {
        const why = res.reason === 'dns' ? 'Der angegebene Host ist unbekannt' : 'Fehler aufgrund fehlender Ressourcen';
        c.error(`Fehler beim Testen der Verbindung mit dem Computer "${t}": ${why}`, { category: 'ResourceUnavailable', exception: 'System.Net.NetworkInformation.PingException', fqid: 'TestConnectionException', target: t, reason: 'PingException' });
        continue;
      }
      for (let k = 0; k < count; k++) {
        const o = new PSObject(PING, { PSComputerName: c.world.hostname, Address: t, IPV4Address: N.ipObj(res.ip), IPV6Address: null, ReplySize: p.BufferSize || 32, ResponseTime: res.time, StatusCode: 0, BufferSize: p.BufferSize || 32, ResponseTimeToLive: res.ttl, ProtocolAddress: res.ip, Destination: t, Source: c.world.hostname });
        c.out(o);
      }
    }
  } });
function M_() { return 'Microsoft.PowerShell.Management'; }
GG.view('TestNetConnectionResult', { kind: 'list', list: [] , custom: (grp) => {
  const out = [];
  for (const o of grp) {
    out.push('');
    const rows = o.rows;
    const lw = rows.reduce((a, r) => Math.max(a, r[0].length), 0);
    for (const [k, v] of rows) out.push((k.padEnd(lw) + ' : ' + V.toStr(v)).replace(/\s+$/, ''));
  }
  out.push('', '');
  return out;
} });
def({ name: 'Test-NetConnection', module: 'NetTCPIP', version: '1.0.0.0', cmdType: 'Function', aliases: ['TNC'], input: 'none',
  params: [P('ComputerName', 'string', { pos: 0, aliases: ['RemoteAddress', 'cn'] }), P('Port', 'int', { pos: 1, aliases: ['RemotePort'] }), P('CommonTCPPort', 'enum', { values: ['HTTP', 'RDP', 'SMB', 'WINRM'] }), P('InformationLevel', 'enum', { values: ['Quiet', 'Detailed'] }), P('TraceRoute', 'switch'), P('Hops', 'int')],
  run: async (c, p) => {
    const target = p.ComputerName || 'internetbeacon.msedge.net';
    const port = p.Port !== undefined ? p.Port : (p.CommonTCPPort ? { HTTP: 80, RDP: 3389, SMB: 445, WINRM: 5985 }[p.CommonTCPPort] : null);
    let ip = target;
    if (!N.isIPv4(target)) {
      const d = NW.resolve(c.world, target);
      if (d.error) {
        c.warn(`Name resolution of ${target} failed -- Status: ${d.error === 'nx' ? 'No such host is known' : 'This operation returned because the timeout period expired'}`);
        if (p.InformationLevel === 'Quiet') return c.out(false);
        const o = new PSObject('TestNetConnectionResult', {}); o.rows = [['ComputerName', target], ['RemoteAddress', ''], ['InterfaceAlias', ''], ['SourceAddress', ''], [port ? 'TcpTestSucceeded' : 'PingSucceeded', false]];
        o.add('ComputerName', target); o.add(port ? 'TcpTestSucceeded' : 'PingSucceeded', false);
        if (c.log) (c.log.tnc = c.log.tnc || []).push({ target, port, ok: false });
        return c.out(o);
      }
      ip = d.ip;
    }
    const pr = NW.ping(c.world, ip);
    const rt = NW.route(c.world, ip);
    const src = rt.src || ''; const alias = rt.adapter ? rt.adapter.name : '';
    let ok;
    if (port) {
      const t = NW.tcp(c.world, ip, port);
      ok = t.ok;
      if (!ok) { c.warn(`TCP connect to (${ip} : ${port}) failed`); if (!pr.ok) c.warn(`Ping to ${ip} failed with status: ${pr.reason === 'unreachable' ? 'DestinationHostUnreachable' : 'TimedOut'}`); }
    } else { ok = pr.ok; if (!ok) c.warn(`Ping to ${ip} failed with status: ${pr.reason === 'unreachable' ? 'DestinationHostUnreachable' : 'TimedOut'}`); }
    if (c.log) (c.log.tnc = c.log.tnc || []).push({ target, port, ok });
    if (p.InformationLevel === 'Quiet') return c.out(ok);
    const o = new PSObject('TestNetConnectionResult', { ComputerName: target, RemoteAddress: ip, RemotePort: port, InterfaceAlias: alias, SourceAddress: src, PingSucceeded: pr.ok, TcpTestSucceeded: port ? ok : null });
    o.rows = port ? [['ComputerName', target], ['RemoteAddress', ip], ['RemotePort', port], ['InterfaceAlias', alias], ['SourceAddress', src], ['TcpTestSucceeded', ok]]
      : [['ComputerName', target], ['RemoteAddress', ip], ['InterfaceAlias', alias], ['SourceAddress', src], ['PingSucceeded', pr.ok], ['PingReplyDetails (RTT)', pr.ok ? pr.time + ' ms' : '0 ms']];
    if (p.TraceRoute) o.rows.push(['TraceRoute', pr.ok ? (rt.hops ? [((rt.adapter && c.world.net.ip[rt.adapter.ifIndex].gw) || [''])[0], ip].join('\n') : ip) : '0.0.0.0']);
    if (p.InformationLevel === 'Detailed') o.rows.splice(4, 0, ['NameResolutionResults', ip], ['MatchingIPsecRules', ''], ['NetworkIsolationContext', 'Private Network'], ['IsAdmin', c.session.elevated], ['NetRoute (NextHop)', rt.hops ? ((c.world.net.ip[rt.adapter.ifIndex].gw || [])[0] || '0.0.0.0') : '0.0.0.0']);
    c.out(o);
  } });
const DNSA = 'Microsoft.DnsClient.Commands.DnsRecord_A';
GG.view(DNSA, { table: [{ l: 'Name', p: 'Name', w: 46 }, { l: 'Type', p: 'Type', w: 6 }, { l: 'TTL', p: 'TTL', w: 6, a: 'r' }, { l: 'Section', p: 'Section', w: 9 }, { l: 'IPAddress', p: 'IPAddress' }] });
GG.view('Microsoft.DnsClient.Commands.DnsRecord_PTR', { table: [{ l: 'Name', p: 'Name', w: 46 }, { l: 'Type', p: 'Type', w: 6 }, { l: 'TTL', p: 'TTL', w: 6, a: 'r' }, { l: 'Section', p: 'Section', w: 9 }, { l: 'NameHost', p: 'NameHost' }] });
GG.view('Microsoft.DnsClient.Commands.DnsRecord_MX', { table: [{ l: 'Name', p: 'Name', w: 46 }, { l: 'Type', p: 'Type', w: 6 }, { l: 'TTL', p: 'TTL', w: 6, a: 'r' }, { l: 'Section', p: 'Section', w: 9 }, { l: 'NameExchange', p: 'NameExchange', w: 30 }, { l: 'Preference', p: 'Preference' }] });
GG.view('Microsoft.DnsClient.Commands.DnsRecord_CNAME', { table: [{ l: 'Name', p: 'Name', w: 46 }, { l: 'Type', p: 'Type', w: 6 }, { l: 'TTL', p: 'TTL', w: 6, a: 'r' }, { l: 'Section', p: 'Section', w: 9 }, { l: 'NameHost', p: 'NameHost' }] });
def({ name: 'Resolve-DnsName', module: 'DnsClient', version: '1.0.0.0', input: 'none',
  params: [P('Name', 'string', { pos: 0, mandatory: true }), P('Type', 'enum', { pos: 1, values: ['A', 'AAAA', 'MX', 'NS', 'SOA', 'PTR', 'CNAME', 'TXT', 'SRV', 'ANY', 'A_AAAA'] }), P('Server', 'string[]'), P('DnsOnly', 'switch'), P('NoHostsFile', 'switch'), P('QuickTimeout', 'switch')],
  run: async (c, p) => {
    const w = c.world;
    const type = p.Type || 'A_AAAA';
    let wv = w;
    if (p.Server) { const tmp = Object.assign(Object.create(Object.getPrototypeOf(w)), w); tmp.net = JSON.parse(JSON.stringify(w.net)); for (const k of Object.keys(tmp.net.ip)) tmp.net.ip[k].dns = p.Server.slice(); wv = tmp; tmp.netw = w.netw; }
    if (c.log) (c.log.dns = c.log.dns || []).push({ name: p.Name, type });
    if (N.isIPv4(p.Name) || type === 'PTR') {
      const ip = p.Name;
      const h = w.netw ? NW.allHosts(w.netw).find(x => x.ip === ip) : null;
      const servers = NW.dnsServers(wv);
      if (!servers.length || !NW.route(wv, servers[0]).ok) return c.error(`${p.Name} : Zeitüberschreitung des Vorgangs`, { category: 'OperationTimeout', exception: 'System.ComponentModel.Win32Exception', fqid: 'ERROR_TIMEOUT,Microsoft.DnsClient.Commands.ResolveDnsName', noClass: true, target: p.Name });
      if (!h) return c.error(`${ip.split('.').reverse().join('.')}.in-addr.arpa : DNS-Name ist nicht vorhanden`, { category: 'ResourceUnavailable', exception: 'System.ComponentModel.Win32Exception', fqid: 'DNS_ERROR_RCODE_NAME_ERROR,Microsoft.DnsClient.Commands.ResolveDnsName', noClass: true, target: p.Name });
      return c.out(new PSObject('Microsoft.DnsClient.Commands.DnsRecord_PTR', { Name: ip.split('.').reverse().join('.') + '.in-addr.arpa', Type: 'PTR', TTL: 1200, Section: 'Answer', NameHost: h.fqdn || (h.name.toLowerCase() + (h.world && h.world.domain ? '.' + h.world.domain : (w.domain ? '.' + w.domain : ''))) }));
    }
    const d = NW.resolve(wv, p.Name);
    if (d.error) {
      if (d.error === 'nx') return c.error(`${p.Name} : DNS-Name ist nicht vorhanden`, { category: 'ResourceUnavailable', exception: 'System.ComponentModel.Win32Exception', fqid: 'DNS_ERROR_RCODE_NAME_ERROR,Microsoft.DnsClient.Commands.ResolveDnsName', noClass: true, target: p.Name, reason: 'Win32Exception' });
      return c.error(`${p.Name} : Zeitüberschreitung des Vorgangs`, { category: 'OperationTimeout', exception: 'System.ComponentModel.Win32Exception', fqid: 'ERROR_TIMEOUT,Microsoft.DnsClient.Commands.ResolveDnsName', noClass: true, target: p.Name, reason: 'Win32Exception' });
    }
    if (type === 'MX') { if (!d.mx) return c.error(`${p.Name} : DNS-Name ist nicht vorhanden`, { category: 'ResourceUnavailable', fqid: 'DNS_ERROR_RCODE_NAME_ERROR,Microsoft.DnsClient.Commands.ResolveDnsName', noClass: true }); return c.out(new PSObject('Microsoft.DnsClient.Commands.DnsRecord_MX', { Name: d.fqdn, Type: 'MX', TTL: 3600, Section: 'Answer', NameExchange: d.mx, Preference: 10 })); }
    if (d.cname && (type === 'A_AAAA' || type === 'A' || type === 'CNAME')) c.out(new PSObject('Microsoft.DnsClient.Commands.DnsRecord_CNAME', { Name: d.fqdn, Type: 'CNAME', TTL: 3600, Section: 'Answer', NameHost: d.cname }));
    if (type === 'CNAME') return;
    c.out(new PSObject([DNSA, 'Microsoft.DnsClient.Commands.DnsRecord'], { Name: d.cname || d.fqdn, Type: 'A', TTL: d.ttl || 1200, Section: 'Answer', IPAddress: d.ip, IP4Address: d.ip }));
  } });
GG.view(TCPC, { table: [{ l: 'LocalAddress', p: 'LocalAddress', w: 13 }, { l: 'LocalPort', p: 'LocalPort', w: 9, a: 'r' }, { l: 'RemoteAddress', p: 'RemoteAddress', w: 13 }, { l: 'RemotePort', p: 'RemotePort', w: 10, a: 'r' }, { l: 'State', p: 'State', w: 11 }, { l: 'AppliedSetting', p: 'AppliedSetting', w: 14 }, { l: 'OwningProcess', p: 'OwningProcess', a: 'r' }] });
def({ name: 'Get-NetTCPConnection', module: 'NetTCPIP', version: '1.0.0.0', cmdType: 'Function', input: 'none', params: [P('LocalPort', 'int[]', { pos: 1 }), P('LocalAddress', 'string[]', { pos: 0 }), P('RemoteAddress', 'string[]'), P('RemotePort', 'int[]'), P('State', 'enum[]', { values: ['Closed', 'Listen', 'SynSent', 'SynReceived', 'Established', 'FinWait1', 'FinWait2', 'CloseWait', 'Closing', 'LastAck', 'TimeWait', 'DeleteTCB', 'Bound'] }), P('OwningProcess', 'int[]')],
  run: async (c, p) => {
    const w = c.world;
    const svcProc = name => { const pr = w.processes.find(x => x.svc && x.svc.includes(name)) || w.processes.find(x => x.name === 'svchost'); return pr ? pr.id : 4; };
    const map = { 5985: 'WinRM', 445: 'LanmanServer', 139: 'LanmanServer', 3389: 'TermService', 53: 'DNS', 88: 'Kdc', 389: 'NTDS', 636: 'NTDS', 3268: 'NTDS', 80: 'W3SVC', 443: 'W3SVC' };
    let list = NW.listening(w).map(port => ({ la: '0.0.0.0', lp: port, ra: '0.0.0.0', rp: 0, st: 'Listen', pid: port === 445 || port === 139 || port === 5985 ? 4 : svcProc(map[port] || '') }));
    list.push({ la: '0.0.0.0', lp: 135, ra: '0.0.0.0', rp: 0, st: 'Listen', pid: svcProc('RpcSs') });
    for (const e of w.connections || []) list.push(e);
    list.sort((a, b) => a.lp - b.lp);
    if (p.State) list = list.filter(x => p.State.includes(x.st));
    if (p.LocalPort) list = list.filter(x => p.LocalPort.includes(x.lp));
    if (p.RemotePort) list = list.filter(x => p.RemotePort.includes(x.rp));
    if (p.OwningProcess) list = list.filter(x => p.OwningProcess.includes(x.pid));
    if (!list.length) return notFoundCim(c, 'Get-NetTCPConnection', 'MSFT_NetTCPConnection', p.LocalPort ? 'LocalPort' : 'State', (p.LocalPort || p.State || [''])[0]);
    c.outAll(list.map(x => new PSObject([TCPC, CIMBASE], { LocalAddress: x.la, LocalPort: x.lp, RemoteAddress: x.ra, RemotePort: x.rp, State: x.st, AppliedSetting: x.st === 'Listen' ? null : 'Datacenter', OwningProcess: x.pid, CreationTime: new PSDate(w.bootTime) })));
  } });

/* ---------- Firewall ---------- */
const FWLIST = ['Name', 'DisplayName', 'Description', 'DisplayGroup', 'Group', 'Enabled', 'Profile', 'Platform', 'Direction', 'Action', 'EdgeTraversalPolicy', 'LooseSourceMapping', 'LocalOnlyMapping', 'Owner', 'PrimaryStatus', 'Status', 'EnforcementStatus', 'PolicyStoreSource', 'PolicyStoreSourceType', 'RemoteDynamicKeywordAddresses', 'PolicyAppId', 'PackageFamilyName'];
GG.view(FWR, { kind: 'list', list: FWLIST.map(p => ({ p })), table: [{ l: 'Name', p: 'Name', w: 40 }, { l: 'DisplayName', p: 'DisplayName', w: 50 }, { l: 'Enabled', p: 'Enabled', w: 7 }, { l: 'Direction', p: 'Direction', w: 9 }, { l: 'Action', p: 'Action' }] });
function fwObj(r) {
  const o = new PSObject([FWR, CIMBASE], { Name: r.name, DisplayName: r.display, Description: r.desc || '', DisplayGroup: r.group || null, Group: r.group ? '@FirewallAPI.dll,-' + (28502 + r.group.length) : null, Enabled: r.enabled ? 'True' : 'False', Profile: r.profile || 'Any', Platform: '{}', Direction: r.direction, Action: r.action, EdgeTraversalPolicy: 'Block', LooseSourceMapping: false, LocalOnlyMapping: false, Owner: null, PrimaryStatus: 'OK', Status: 'Die Regel wurde erfolgreich vom Speicher analysiert. (65536)', EnforcementStatus: 'NotApplicable', PolicyStoreSource: 'PersistentStore', PolicyStoreSourceType: 'Local', RemoteDynamicKeywordAddresses: '{}', PolicyAppId: '', PackageFamilyName: '' }, { ref: r });
  return o;
}
GG.fwObj = fwObj;
function fwFind(c, p, cmd, input) {
  const w = c.world;
  if (input && input.length) return input.map(o => o.ref).filter(Boolean);
  let list = w.firewall.rules.slice();
  let found = list;
  if (p.Name) { found = list.filter(r => V.toArr(p.Name).some(n => V.like(r.name, n))); if (!found.length) { notFoundCim(c, cmd, 'MSFT_NetFirewallRule', 'ID', V.toArr(p.Name)[0]); return []; } }
  else if (p.DisplayName) { found = list.filter(r => p.DisplayName.some(n => V.like(r.display, n))); if (!found.length) { notFoundCim(c, cmd, 'MSFT_NetFirewallRule', 'DisplayName', p.DisplayName[0]); return []; } }
  else if (p.DisplayGroup) { found = list.filter(r => r.group && p.DisplayGroup.some(n => V.like(r.group, n))); if (!found.length) { notFoundCim(c, cmd, 'MSFT_NetFirewallRule', 'DisplayGroup', p.DisplayGroup[0]); return []; } }
  else if (p.Group) { found = list.filter(r => r.group && p.Group.some(n => V.like(r.group, n))); }
  if (p.Enabled) found = found.filter(r => (r.enabled ? 'True' : 'False') === p.Enabled);
  if (p.Direction) found = found.filter(r => r.direction === p.Direction);
  if (p.Action) found = found.filter(r => r.action === p.Action);
  return found;
}
const fwSel = () => [P('Name', 'string[]', { pos: 0, aliases: ['ID'] }), P('DisplayName', 'string[]'), P('DisplayGroup', 'string[]'), P('Group', 'string[]'), P('InputObject', 'object'), P('PassThru', 'switch'), P('PolicyStore', 'string'), P('CimSession', 'object')];
def({ name: 'Get-NetFirewallRule', module: 'NetSecurity', version: '2.0.0.0', cmdType: 'Function', input: 'none', params: [P('Name', 'string[]', { pos: 0, aliases: ['ID'] }), P('DisplayName', 'string[]'), P('DisplayGroup', 'string[]'), P('Group', 'string[]'), P('Enabled', 'enum', { values: ['True', 'False'] }), P('Direction', 'enum', { values: ['Inbound', 'Outbound'] }), P('Action', 'enum', { values: ['Allow', 'Block', 'NotConfigured'] }), P('PolicyStore', 'string'), P('All', 'switch'), P('CimSession', 'object')],
  run: async (c, p) => c.outAll(fwFind(c, p, 'Get-NetFirewallRule').map(fwObj)) });
const ICMPT = /^\d+(:\d+|:\*)?$/;
def({ name: 'New-NetFirewallRule', module: 'NetSecurity', version: '2.0.0.0', cmdType: 'Function', input: 'none', sp: true,
  params: [P('DisplayName', 'string', { mandatory: true }), P('Name', 'string', { aliases: ['ID'] }), P('Description', 'string'), P('Direction', 'enum', { values: ['Inbound', 'Outbound'] }), P('Action', 'enum', { values: ['Allow', 'Block', 'NotConfigured'] }), P('Protocol', 'string'), P('LocalPort', 'string[]'), P('RemotePort', 'string[]'), P('RemoteAddress', 'string[]'), P('LocalAddress', 'string[]'), P('IcmpType', 'string[]'), P('Profile', 'string[]'), P('Program', 'string'), P('Service', 'string'), P('Enabled', 'enum', { values: ['True', 'False'] }), P('Group', 'string'), P('EdgeTraversalPolicy', 'string'), P('PolicyStore', 'string')],
  run: async (c, p) => {
    if (!(await c.should(p.DisplayName, 'New-NetFirewallRule'))) return;
    if (!needAdmin(c, 'New-NetFirewallRule')) return;
    let proto = p.Protocol || 'Any';
    const PN = { tcp: 'TCP', udp: 'UDP', icmpv4: 'ICMPv4', icmpv6: 'ICMPv6', any: 'Any', '6': 'TCP', '17': 'UDP', '1': 'ICMPv4' };
    proto = PN[proto.toLowerCase()];
    if (!proto) return cimErr(c, 'New-NetFirewallRule', 'Der Wert für das Protokoll ist ungültig. ', 'InvalidArgument', 87);
    if ((p.LocalPort || p.RemotePort) && !['TCP', 'UDP'].includes(proto)) return c.error('Der Wert für den Port ist nur gültig, wenn das Protokoll TCP oder UDP ist. ', { category: 'InvalidArgument', exception: 'Microsoft.Management.Infrastructure.CimException', fqid: 'HRESULT 0x80070057,New-NetFirewallRule', noClass: true, target: 'MSFT_NetFirewallRule' });
    if (p.IcmpType && !/^ICMP/.test(proto)) return c.error('Der ICMP-Typ ist nur gültig, wenn das Protokoll ICMPv4 oder ICMPv6 ist. ', { category: 'InvalidArgument', exception: 'Microsoft.Management.Infrastructure.CimException', fqid: 'HRESULT 0x80070057,New-NetFirewallRule', noClass: true, target: 'MSFT_NetFirewallRule' });
    if (p.IcmpType && p.IcmpType.some(x => !ICMPT.test(x) && x.toLowerCase() !== 'any')) return cimErr(c, 'New-NetFirewallRule', 'Der Wert für IcmpType ist ungültig. ', 'InvalidArgument', 87);
    const r = { name: p.Name || '{' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => { const v = Math.random() * 16 | 0; return (ch === 'x' ? v : (v & 3 | 8)).toString(16); }) + '}', display: p.DisplayName, desc: p.Description || '', group: p.Group || null, enabled: p.Enabled !== 'False', direction: p.Direction || 'Inbound', action: p.Action || 'Allow', protocol: proto, localPort: p.LocalPort ? p.LocalPort : 'Any', remotePort: p.RemotePort || 'Any', remoteAddress: p.RemoteAddress || 'Any', icmpType: p.IcmpType ? p.IcmpType.join(',') : 'Any', profile: p.Profile ? p.Profile.join(', ') : 'Any', program: p.Program || 'Any', custom: true };
    if (c.world.firewall.rules.some(x => x.name.toLowerCase() === r.name.toLowerCase())) return cimErr(c, 'New-NetFirewallRule', 'Die Regel ist bereits vorhanden. ', 'ResourceExists', 183);
    c.world.firewall.rules.push(r);
    c.out(fwObj(r));
  } });
def({ name: 'Set-NetFirewallRule', module: 'NetSecurity', version: '2.0.0.0', cmdType: 'Function', input: 'collect', sp: true,
  params: fwSel().concat([P('NewDisplayName', 'string'), P('Enabled', 'enum', { values: ['True', 'False'] }), P('Action', 'enum', { values: ['Allow', 'Block', 'NotConfigured'] }), P('Direction', 'enum', { values: ['Inbound', 'Outbound'] }), P('Protocol', 'string'), P('LocalPort', 'string[]'), P('RemoteAddress', 'string[]'), P('Profile', 'string[]'), P('IcmpType', 'string[]'), P('Description', 'string')]),
  run: async (c, p, input) => {
    const list = fwFind(c, { Name: p.Name, DisplayName: p.DisplayName, DisplayGroup: p.DisplayGroup, Group: p.Group }, 'Set-NetFirewallRule', input);
    for (const r of list) {
      if (!(await c.should(r.display, 'Set-NetFirewallRule'))) continue;
      if (!needAdmin(c, 'Set-NetFirewallRule')) return;
      if (p.NewDisplayName) r.display = p.NewDisplayName;
      if (p.Enabled) r.enabled = p.Enabled === 'True';
      if (p.Action) r.action = p.Action;
      if (p.Direction) r.direction = p.Direction;
      if (p.Protocol) r.protocol = p.Protocol;
      if (p.LocalPort) r.localPort = p.LocalPort;
      if (p.RemoteAddress) r.remoteAddress = p.RemoteAddress;
      if (p.Profile) r.profile = p.Profile.join(', ');
      if (p.IcmpType) r.icmpType = p.IcmpType.join(',');
      if (p.Description !== undefined) r.desc = p.Description;
      if (p.PassThru) c.out(fwObj(r));
    }
  } });
for (const [nm, en] of [['Enable-NetFirewallRule', true], ['Disable-NetFirewallRule', false], ['Remove-NetFirewallRule', null]]) def({ name: nm, module: 'NetSecurity', version: '2.0.0.0', cmdType: 'Function', input: 'collect', sp: true, params: fwSel(),
  run: async (c, p, input) => {
    if (!p.Name && !p.DisplayName && !p.DisplayGroup && !p.Group && !(input && input.length)) return c.error('Geben Sie Name, DisplayName oder DisplayGroup an.', { category: 'InvalidArgument', fqid: 'MissingParameter,' + nm, noClass: true });
    const list = fwFind(c, p, nm, input);
    for (const r of list) {
      if (!(await c.should(r.display, nm))) continue;
      if (!needAdmin(c, nm)) return;
      if (en === null) c.world.firewall.rules.splice(c.world.firewall.rules.indexOf(r), 1); else r.enabled = en;
      if (p.PassThru && en !== null) c.out(fwObj(r));
    }
  } });
GG.view(FWPF, { kind: 'list', list: ['Protocol', 'LocalPort', 'RemotePort', 'IcmpType', 'DynamicTarget'].map(p => ({ p })) });
def({ name: 'Get-NetFirewallPortFilter', module: 'NetSecurity', version: '2.0.0.0', cmdType: 'Function', input: 'collect', params: [P('AssociatedNetFirewallRule', 'object'), P('Protocol', 'string[]'), P('All', 'switch')],
  run: async (c, p, input) => {
    const rules = input && input.length ? input.map(o => o.ref).filter(Boolean) : (p.AssociatedNetFirewallRule ? [p.AssociatedNetFirewallRule.ref] : c.world.firewall.rules);
    for (const r of rules) c.out(new PSObject([FWPF, CIMBASE], { Protocol: r.protocol, LocalPort: V.toArr(r.localPort).join(', '), RemotePort: V.toArr(r.remotePort || 'Any').join(', '), IcmpType: r.icmpType || 'Any', DynamicTarget: 'Any' }));
  } });
GG.view('Microsoft.Management.Infrastructure.CimInstance#root/standardcimv2/MSFT_NetAddressFilter', { kind: 'list', list: ['LocalAddress', 'RemoteAddress'].map(p => ({ p })) });
def({ name: 'Get-NetFirewallAddressFilter', module: 'NetSecurity', version: '2.0.0.0', cmdType: 'Function', input: 'collect', params: [P('All', 'switch')],
  run: async (c, p, input) => { for (const o of input || []) if (o.ref) c.out(new PSObject('Microsoft.Management.Infrastructure.CimInstance#root/standardcimv2/MSFT_NetAddressFilter', { LocalAddress: 'Any', RemoteAddress: V.toArr(o.ref.remoteAddress || 'Any').join(', ') })); } });
GG.view(FWP, { kind: 'list', list: ['Name', 'Enabled', 'DefaultInboundAction', 'DefaultOutboundAction', 'AllowInboundRules', 'AllowLocalFirewallRules', 'AllowLocalIPsecRules', 'AllowUserApps', 'AllowUserPorts', 'AllowUnicastResponseToMulticast', 'NotifyOnListen', 'EnableStealthModeForIPsec', 'LogFileName', 'LogMaxSizeKilobytes', 'LogAllowed', 'LogBlocked', 'LogIgnored', 'DisabledInterfaceAliases'].map(p => ({ p })) });
def({ name: 'Get-NetFirewallProfile', module: 'NetSecurity', version: '2.0.0.0', cmdType: 'Function', input: 'none', params: [P('Name', 'string[]', { pos: 0, aliases: ['Profile'] }), P('All', 'switch'), P('PolicyStore', 'string')],
  run: async (c, p) => { for (const n of ['Domain', 'Private', 'Public']) if (!p.Name || p.Name.some(x => V.like(n, x))) c.out(new PSObject([FWP, CIMBASE], { Name: n, Enabled: c.world.firewall.profiles[n] ? 'True' : 'False', DefaultInboundAction: 'NotConfigured', DefaultOutboundAction: 'NotConfigured', AllowInboundRules: 'NotConfigured', AllowLocalFirewallRules: 'NotConfigured', AllowLocalIPsecRules: 'NotConfigured', AllowUserApps: 'NotConfigured', AllowUserPorts: 'NotConfigured', AllowUnicastResponseToMulticast: 'NotConfigured', NotifyOnListen: 'False', EnableStealthModeForIPsec: 'NotConfigured', LogFileName: '%systemroot%\\system32\\LogFiles\\Firewall\\pfirewall.log', LogMaxSizeKilobytes: 4096, LogAllowed: 'False', LogBlocked: 'False', LogIgnored: 'NotConfigured', DisabledInterfaceAliases: '{NotConfigured}' })); } });
def({ name: 'Set-NetFirewallProfile', module: 'NetSecurity', version: '2.0.0.0', cmdType: 'Function', input: 'collect', sp: true, params: [P('Name', 'string[]', { pos: 0, aliases: ['Profile'] }), P('Enabled', 'enum', { values: ['True', 'False', 'NotConfigured'] }), P('DefaultInboundAction', 'string'), P('DefaultOutboundAction', 'string'), P('All', 'switch')],
  run: async (c, p, input) => {
    const names = p.All ? ['Domain', 'Private', 'Public'] : (p.Name || (input || []).map(o => o.get('Name')));
    for (const n of names) {
      const k = ['Domain', 'Private', 'Public'].find(x => x.toLowerCase() === n.toLowerCase());
      if (!k) { notFoundCim(c, 'Set-NetFirewallProfile', 'MSFT_NetFirewallProfile', 'Name', n); continue; }
      if (!(await c.should(k, 'Set-NetFirewallProfile'))) continue;
      if (!needAdmin(c, 'Set-NetFirewallProfile')) return;
      if (p.Enabled) c.world.firewall.profiles[k] = p.Enabled !== 'False';
    }
  } });

/* Standard-Firewallregeln eines Windows-Servers */
GG.stdFirewall = function (o) {
  o = o || {};
  const R = (name, display, group, enabled, proto, port, extra) => Object.assign({ name, display, group, enabled, direction: 'Inbound', action: 'Allow', protocol: proto, localPort: port, profile: 'Any' }, extra || {});
  const rules = [
    R('FPS-ICMP4-ERQ-In', 'Datei- und Druckerfreigabe (Echoanforderung - ICMPv4 eingehend)', 'Datei- und Druckerfreigabe', !!o.icmp, 'ICMPv4', undefined, { icmpType: '8', desc: 'Echoanforderungsnachrichten werden als Ping-Anforderungen an andere Knoten gesendet.' }),
    R('FPS-ICMP6-ERQ-In', 'Datei- und Druckerfreigabe (Echoanforderung - ICMPv6 eingehend)', 'Datei- und Druckerfreigabe', !!o.icmp, 'ICMPv6', undefined, { icmpType: '128' }),
    R('FPS-SMB-In-TCP', 'Datei- und Druckerfreigabe (SMB eingehend)', 'Datei- und Druckerfreigabe', o.smb !== false, 'TCP', ['445']),
    R('FPS-NB_Session-In-TCP', 'Datei- und Druckerfreigabe (NB-Sitzung eingehend)', 'Datei- und Druckerfreigabe', o.smb !== false, 'TCP', ['139']),
    R('WINRM-HTTP-In-TCP', 'Windows-Remoteverwaltung (HTTP eingehend)', 'Windows-Remoteverwaltung', o.winrm !== false, 'TCP', ['5985'], { profile: 'Domain, Private' }),
    R('WINRM-HTTP-In-TCP-PUBLIC', 'Windows-Remoteverwaltung (HTTP eingehend)', 'Windows-Remoteverwaltung', o.winrm !== false, 'TCP', ['5985'], { profile: 'Public' }),
    R('RemoteDesktop-UserMode-In-TCP', 'Remotedesktop - Benutzermodus (TCP eingehend)', 'Remotedesktop', !!o.rdp, 'TCP', ['3389']),
    R('RemoteDesktop-UserMode-In-UDP', 'Remotedesktop - Benutzermodus (UDP eingehend)', 'Remotedesktop', !!o.rdp, 'UDP', ['3389']),
    R('RemoteEventLogSvc-In-TCP', 'Remoteereignisprotokollverwaltung (RPC)', 'Remoteereignisprotokollverwaltung', false, 'TCP', ['RPC']),
    R('CoreNet-DHCP-In', 'Kernnetzwerk - DHCP (DHCP eingehend)', 'Kernnetzwerk', true, 'UDP', ['68']),
    R('CoreNet-DNS-Out-UDP', 'Kernnetzwerk - DNS (UDP ausgehend)', 'Kernnetzwerk', true, 'UDP', undefined, { direction: 'Outbound' }),
    R('WMI-WINMGMT-In-TCP', 'Windows-Verwaltungsinstrumentation (WMI eingehend)', 'Windows-Verwaltungsinstrumentation (WMI)', false, 'TCP', ['RPC'])
  ];
  if (o.dns) rules.push(R('DNSSrv-UDP-In', 'DNS (UDP, eingehend)', 'DNS-Dienst', true, 'UDP', ['53']), R('DNSSrv-TCP-In', 'DNS (TCP, eingehend)', 'DNS-Dienst', true, 'TCP', ['53']));
  if (o.dc) rules.push(R('ADDS-LDAP-TCP-In', 'Active Directory-Domänendienste (LDAP-TCP-In)', 'Active Directory-Domänendienste', true, 'TCP', ['389']), R('ADDS-LDAPSEC-TCP-In', 'Active Directory-Domänendienste (LDAP-TCP-In für SSL)', 'Active Directory-Domänendienste', true, 'TCP', ['636']), R('ADDS-Kerberos-TCP-In', 'Kerberos-Schlüsselverteilungscenter - PCR (TCP-In)', 'Kerberos-Schlüsselverteilungscenter', true, 'TCP', ['88']), R('ADDS-GC-TCP-In', 'Active Directory-Domänendienste (LDAP-TCP-In GC)', 'Active Directory-Domänendienste', true, 'TCP', ['3268']));
  if (o.web) rules.push(R('IIS-WebServerRole-HTTP-In-TCP', 'WWW-Dienste (HTTP eingehender Datenverkehr)', 'WWW-Dienste (HTTP)', true, 'TCP', ['80']), R('IIS-WebServerRole-HTTPS-In-TCP', 'WWW-Dienste (HTTPS eingehender Datenverkehr)', 'Sichere WWW-Dienste (HTTPS)', true, 'TCP', ['443']));
  return { profiles: { Domain: true, Private: true, Public: true }, rules };
};

})();
