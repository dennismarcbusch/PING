/* Linux-Simulation – Netzwerkmodell, ip (iproute2) und ping */
(function (G) {
  'use strict';
  const LX = (G.LX = G.LX || {});

  // ---------- IPv4-Helfer ----------
  function ipToInt(ip) {
    if (typeof ip !== 'string' || !/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return null;
    const p = ip.split('.').map(Number);
    if (p.some(x => x > 255)) return null;
    return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3];
  }
  function intToIp(n) { return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.'); }
  function maskOf(p) { return p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0; }
  function netOf(ip, p) { return intToIp((ipToInt(ip) & maskOf(p)) >>> 0); }
  function inNet(ip, net, p) { const a = ipToInt(ip), b = ipToInt(net); if (a == null || b == null) return false; const m = maskOf(p); return ((a & m) >>> 0) === ((b & m) >>> 0); }
  function parseCidr(s) {
    const m = /^(\d{1,3}(?:\.\d{1,3}){3})(?:\/(\d{1,2}))?$/.exec(s || '');
    if (!m || ipToInt(m[1]) == null) return null;
    const p = m[2] == null ? 32 : Number(m[2]);
    if (p > 32) return null;
    return { ip: m[1], prefix: p, explicit: m[2] != null };
  }
  LX.ip4 = { ipToInt, intToIp, maskOf, netOf, inNet, parseCidr };

  function linkLocal(mac) {
    const b = mac.split(':').map(x => parseInt(x, 16));
    b[0] ^= 2;
    const e = [b[0], b[1], b[2], 0xff, 0xfe, b[3], b[4], b[5]];
    const g = [];
    for (let i = 0; i < 8; i += 2) g.push(((e[i] << 8) | e[i + 1]).toString(16));
    return 'fe80::' + g.join(':');
  }

  // ---------- Modell ----------
  function ifUp(i) { return i.up && (i.loopback || i.carrier !== false); }
  function connected(w) {
    const r = [];
    w.net.ifaces.forEach(i => {
      if (!ifUp(i) || i.loopback) return;
      i.addrs.forEach(a => { r.push({ dst: netOf(a.ip, a.prefix) + '/' + a.prefix, net: netOf(a.ip, a.prefix), prefix: a.prefix, dev: i.name, src: a.ip, kernel: true }); });
    });
    return r;
  }
  LX.netConnected = connected;

  function allRoutes(w) {
    const r = connected(w).slice();
    w.net.routes.forEach(s => {
      const i = w.net.ifaces.find(x => x.name === s.dev);
      if (!i || !ifUp(i)) return;
      r.push(s);
    });
    return r;
  }

  function lookup(w, dst) {
    if (inNet(dst, '127.0.0.0', 8)) return { type: 'local', src: '127.0.0.1', dev: 'lo' };
    for (const i of w.net.ifaces) for (const a of i.addrs) if (a.ip === dst && ifUp(i)) return { type: 'local', src: a.ip, dev: 'lo' };
    let best = null;
    allRoutes(w).forEach(r => {
      const p = r.dst === 'default' ? 0 : r.prefix;
      const n = r.dst === 'default' ? '0.0.0.0' : r.net;
      if (inNet(dst, n, p) && (!best || p > best.p)) best = { r: r, p: p };
    });
    if (!best) return null;
    const r = best.r;
    const iface = w.net.ifaces.find(x => x.name === r.dev);
    const src = r.src || (iface.addrs[0] && iface.addrs[0].ip);
    if (r.via) return { type: 'via', gw: r.via, dev: r.dev, src: src, iface: iface };
    return { type: 'link', dev: r.dev, src: src, iface: iface };
  }
  LX.netLookup = lookup;

  // Ergebnis eines Pings an dst: ok | hostunreach | timeout | netunreach
  function probe(w, dst) {
    const L = lookup(w, dst);
    if (!L) return { res: 'netunreach' };
    if (L.type === 'local') return { res: 'ok', ttl: 64, rtt: 0.04, src: L.src };
    const seg = w.net.segments[L.iface.segment];
    const srcInSeg = seg && inNet(L.src, seg.net, seg.prefix);
    if (L.type === 'link') {
      const h = seg && seg.hosts[dst];
      if (!h || !seg) return { res: 'hostunreach', src: L.src };
      if (!srcInSeg) return { res: 'timeout', src: L.src };
      return { res: 'ok', ttl: 64, rtt: 0.4 + (h.lat || 0.3), src: L.src };
    }
    // über Gateway
    const g = seg && seg.hosts[L.gw];
    if (!g) return { res: 'hostunreach', src: L.src };
    if (!g.router || !srcInSeg) return { res: 'timeout', src: L.src };
    if (seg.hosts[dst]) return { res: 'ok', ttl: 63, rtt: 0.9, src: L.src };
    if (w.net.internet[dst]) return { res: 'ok', ttl: 57, rtt: 11 + (w.net.internet[dst].lat || 3), src: L.src };
    return { res: 'timeout', src: L.src };
  }
  LX.netProbe = probe;
  LX.netReachable = function (w, dst) { return probe(w, dst).res === 'ok'; };

  // ---------- ip ----------
  function flags(i) {
    if (i.loopback) return '<LOOPBACK' + (i.up ? ',UP,LOWER_UP' : '') + '>';
    const f = ['BROADCAST', 'MULTICAST'];
    if (i.up) { if (i.carrier === false) f.unshift('NO-CARRIER'); f.push('UP'); if (i.carrier !== false) f.push('LOWER_UP'); }
    return '<' + f.join(',') + '>';
  }
  function state(i) { if (i.loopback) return 'UNKNOWN'; return ifUp(i) ? 'UP' : 'DOWN'; }
  function linkHead(i, mode) {
    return i.idx + ': ' + i.name + ': ' + flags(i) + ' mtu ' + i.mtu + ' qdisc ' + (i.loopback ? 'noqueue' : (i.up ? 'fq_codel' : 'noop')) + ' state ' + state(i) + (mode ? ' mode DEFAULT' : '') + ' group default qlen 1000\n' +
      '    link/' + (i.loopback ? 'loopback' : 'ether') + ' ' + i.mac + ' brd ' + (i.loopback ? '00:00:00:00:00:00' : 'ff:ff:ff:ff:ff:ff') + '\n';
  }
  function v6(i) { return i.loopback ? (i.up ? '::1/128' : null) : (i.up ? linkLocal(i.mac) + '/64' : null); }
  function addrBlock(i, only4) {
    let s = linkHead(i, false);
    i.addrs.forEach(a => {
      s += '    inet ' + a.ip + '/' + a.prefix + (a.brd ? ' brd ' + a.brd : '') + ' scope ' + (i.loopback ? 'host' : 'global') + ' ' + i.name + '\n       valid_lft forever preferred_lft forever\n';
    });
    const six = v6(i);
    if (six && !only4) s += '    inet6 ' + six + ' scope ' + (i.loopback ? 'host noprefixroute' : 'link') + ' \n       valid_lft forever preferred_lft forever\n';
    return s;
  }
  function pad(s, n) { s = String(s); return s + ' '.repeat(Math.max(1, n - s.length)); }

  const OBJ = { address: ['a', 'ad', 'add', 'addr', 'addre', 'addres', 'address'], link: ['l', 'li', 'lin', 'link'], route: ['r', 'ro', 'rou', 'rout', 'route'] };
  function objOf(s) { for (const k in OBJ) if (OBJ[k].indexOf(s) >= 0) return k; return null; }

  const USAGE = 'Usage: ip [ OPTIONS ] OBJECT { COMMAND | help }\n' +
    'where  OBJECT := { address | link | route | neigh | ... }\n' +
    '       OPTIONS := { -4 | -6 | -br[ief] | -c[olor] | ... }\n';

  LX.cmdIp = function (ctx) {
    const w = ctx.w;
    const a = ctx.argv.slice(1);
    let brief = false, only4 = false;
    while (a.length && a[0][0] === '-') {
      const o = a.shift();
      if (o === '-br' || o === '-brief') brief = true;
      else if (o === '-4') only4 = true;
      else if (o === '-6' || o === '-c' || o === '-color' || o === '--color' || o === '-s') { /* ignoriert */ }
      else if (o === '-h' || o === '-help' || o === '--help') { ctx.out(USAGE); return 0; }
      else { ctx.err('Option "' + o + '" is unknown, try "ip -help".\n'); return 255; }
    }
    if (!a.length) { ctx.err(USAGE); return 255; }
    if (a[0] === 'help') { ctx.out(USAGE); return 0; }
    const obj = objOf(a.shift());
    if (!obj) { ctx.err('Object "' + ctx.argv[ctx.argv.length - a.length - 1] + '" is unknown, try "ip help".\n'); return 1; }
    let cmd = a.length ? a.shift() : 'show';
    if (['show', 'sh', 's', 'list', 'lst', 'ls', 'l'].indexOf(cmd) >= 0) cmd = 'show';
    else if (cmd === 'delete' || cmd === 'd' || cmd === 'de') cmd = 'del';
    else if (cmd === 'a' || cmd === 'ad') cmd = 'add';
    const root = ctx.user === 'root';
    const noperm = () => { ctx.err('RTNETLINK answers: Operation not permitted\n'); return 2; };
    const findDev = (n) => w.net.ifaces.find(i => i.name === n);
    const noDev = (n) => { ctx.err('Cannot find device "' + n + '"\n'); return 1; };
    const kw = (key) => { const k = a.indexOf(key); return k >= 0 ? a[k + 1] : undefined; };

    if (obj === 'address') {
      if (cmd === 'show') {
        let dev = kw('dev') || (a[0] && a[0] !== 'dev' ? a[0] : undefined);
        let list = w.net.ifaces;
        if (dev) { const d = findDev(dev); if (!d) return noDev(dev); list = [d]; }
        if (brief) {
          list.forEach(i => { const ad = i.addrs.map(x => x.ip + '/' + x.prefix); const six = v6(i); if (six && !only4) ad.push(six); ctx.out(pad(i.name, 17) + pad(state(i), 15) + ad.join(' ') + ' \n'); });
        } else list.forEach(i => ctx.out(addrBlock(i, only4)));
        return 0;
      }
      if (cmd === 'add' || cmd === 'del' || cmd === 'flush') {
        if (!root) return noperm();
        if (cmd === 'flush') {
          const dev = kw('dev') || a[0];
          if (!dev) { ctx.err('Flush requires arguments.\n'); return 1; }
          const d = findDev(dev); if (!d) return noDev(dev);
          d.addrs = d.loopback ? d.addrs : [];
          w.net.routes = w.net.routes.filter(r => r.dev !== dev || validGw(w, r));
          return 0;
        }
        const pfx = a[0];
        const dev = kw('dev');
        const c = parseCidr(pfx);
        if (!pfx) { ctx.err('Not enough information: "dev" argument is required.\n'); return 1; }
        if (!c) { ctx.err('Error: inet prefix is expected rather than "' + pfx + '".\n'); return 1; }
        if (!dev) { ctx.err('Not enough information: "dev" argument is required.\n'); return 1; }
        const d = findDev(dev); if (!d) return noDev(dev);
        const brd = kw('brd') || kw('broadcast');
        if (cmd === 'add') {
          if (d.addrs.some(x => x.ip === c.ip && x.prefix === c.prefix)) { ctx.err('Error: ipv4: Address already assigned.\n'); return 2; }
          const ent = { ip: c.ip, prefix: c.prefix };
          if (brd) ent.brd = brd === '+' ? intToIp((ipToInt(c.ip) | (~maskOf(c.prefix) >>> 0)) >>> 0) : brd;
          d.addrs.push(ent);
          return 0;
        }
        const idx = d.addrs.findIndex(x => x.ip === c.ip && (!c.explicit || x.prefix === c.prefix));
        if (idx < 0) { ctx.err('Error: ipv4: Address not found.\n'); return 2; }
        d.addrs.splice(idx, 1);
        // Routen, deren Gateway nun nicht mehr erreichbar ist, verschwinden
        w.net.routes = w.net.routes.filter(r => validGw(w, r));
        return 0;
      }
      ctx.err('Command "' + cmd + '" is unknown, try "ip address help".\n'); return 1;
    }

    if (obj === 'link') {
      if (cmd === 'show') {
        let dev = kw('dev') || (a[0] && a[0] !== 'dev' ? a[0] : undefined);
        let list = w.net.ifaces;
        if (dev) { const d = findDev(dev); if (!d) return noDev(dev); list = [d]; }
        if (brief) list.forEach(i => ctx.out(pad(i.name, 17) + pad(state(i), 15) + i.mac + ' ' + flags(i) + ' \n'));
        else list.forEach(i => ctx.out(linkHead(i, true)));
        return 0;
      }
      if (cmd === 'set') {
        let dev = a[0] === 'dev' ? a[1] : a[0];
        if (!dev) { ctx.err('Not enough of information: "dev" argument is required.\n'); return 255; }
        const d = findDev(dev);
        if (!d) return noDev(dev);
        const rest = a.slice(a[0] === 'dev' ? 2 : 1);
        if (!rest.length) { return 0; }
        if (!root) return noperm();
        const s = rest[0];
        if (s === 'up') d.up = true;
        else if (s === 'down') { d.up = false; w.net.routes = w.net.routes.filter(r => r.dev !== d.name); }
        else { ctx.err('Error: either "dev" is duplicate, or "' + s + '" is a garbage.\n'); return 255; }
        return 0;
      }
      ctx.err('Command "' + cmd + '" is unknown, try "ip link help".\n'); return 255;
    }

    // route
    if (cmd === 'show') {
      const rs = [];
      w.net.routes.forEach(r => { const i = findDev(r.dev); if (i && ifUp(i)) rs.push(r); });
      rs.sort((x, y) => (x.dst === 'default' ? -1 : y.dst === 'default' ? 1 : 0));
      const st = rs.filter(r => r.dst === 'default').concat(rs.filter(r => r.dst !== 'default'));
      st.forEach(r => ctx.out(r.dst + (r.via ? ' via ' + r.via : '') + ' dev ' + r.dev + (r.metric ? ' metric ' + r.metric : '') + ' \n'));
      connected(w).forEach(r => ctx.out(r.dst + ' dev ' + r.dev + ' proto kernel scope link src ' + r.src + ' \n'));
      return 0;
    }
    if (cmd === 'get') {
      const dst = a[0];
      if (ipToInt(dst) == null) { ctx.err('Error: inet prefix is expected rather than "' + (dst || '') + '".\n'); return 1; }
      const L = lookup(w, dst);
      if (!L) { ctx.err('RTNETLINK answers: Network is unreachable\n'); return 2; }
      if (L.type === 'local') ctx.out('local ' + dst + ' dev lo src ' + L.src + ' uid ' + w.users[ctx.user].uid + ' \n    cache <local> \n');
      else ctx.out(dst + (L.gw ? ' via ' + L.gw : '') + ' dev ' + L.dev + ' src ' + L.src + ' uid ' + w.users[ctx.user].uid + ' \n    cache \n');
      return 0;
    }
    if (cmd === 'add' || cmd === 'del' || cmd === 'replace' || cmd === 'flush') {
      if (!root) return noperm();
      if (cmd === 'flush') { w.net.routes = []; return 0; }
      let dst = a[0];
      if (!dst) { ctx.err('Error: Missing destination.\n'); return 1; }
      if (dst === 'default' || dst === '0.0.0.0/0') dst = 'default';
      let net = null, prefix = 0;
      if (dst !== 'default') {
        const c = parseCidr(dst);
        if (!c) { ctx.err('Error: inet prefix is expected rather than "' + dst + '".\n'); return 1; }
        net = netOf(c.ip, c.prefix); prefix = c.prefix;
        if (net !== c.ip) { ctx.err('Error: Invalid prefix for given prefix length.\n'); return 2; }
        dst = net + '/' + prefix;
      }
      const via = kw('via');
      let dev = kw('dev');
      if (via != null && ipToInt(via) == null) { ctx.err('Error: inet address is expected rather than "' + via + '".\n'); return 1; }
      if (dev && !findDev(dev)) return noDev(dev);
      if (cmd === 'del') {
        const idx = w.net.routes.findIndex(r => r.dst === dst && (!via || r.via === via) && (!dev || r.dev === dev));
        if (idx < 0) { ctx.err('RTNETLINK answers: No such process\n'); return 2; }
        w.net.routes.splice(idx, 1); return 0;
      }
      if (!via && !dev) { ctx.err('Error: Device for nexthop is not up.\n'); return 2; }
      if (via) {
        const c = connected(w).find(r => inNet(via, r.net, r.prefix) && (!dev || r.dev === dev));
        if (!c) { ctx.err('Error: Nexthop has invalid gateway.\n'); return 2; }
        dev = c.dev;
      } else {
        const d = findDev(dev);
        if (!ifUp(d)) { ctx.err('Error: Device for nexthop is not up.\n'); return 2; }
      }
      const ex = w.net.routes.findIndex(r => r.dst === dst);
      if (ex >= 0) {
        if (cmd !== 'replace') { ctx.err('RTNETLINK answers: File exists\n'); return 2; }
        w.net.routes.splice(ex, 1);
      }
      const metric = kw('metric');
      w.net.routes.push({ dst: dst, net: net, prefix: prefix, via: via, dev: dev, metric: metric });
      return 0;
    }
    ctx.err('Command "' + cmd + '" is unknown, try "ip route help".\n'); return 255;
  };

  function validGw(w, r) {
    if (!r.via) return true;
    return connected(w).some(c => c.dev === r.dev && inNet(r.via, c.net, c.prefix));
  }

  // ---------- Namensauflösung ----------
  function resolveName(w, name) {
    if (ipToInt(name) != null) return { ip: name };
    const hosts = LX.readFile(w, '/etc/hosts') || '';
    for (const line of hosts.split('\n')) {
      const t = line.replace(/#.*/, '').trim().split(/\s+/);
      if (t.length > 1 && t.slice(1).indexOf(name) >= 0 && ipToInt(t[0]) != null) return { ip: t[0] };
    }
    const dnsIp = w.net.dnsServer;
    const known = w.net.dns[name];
    if (dnsIp && probe(w, dnsIp).res === 'ok') {
      if (known) return { ip: known };
      return { err: 'ping: ' + name + ': Name oder Dienst nicht bekannt' };
    }
    return { err: 'ping: ' + name + ': Temporärer Fehler bei der Namensauflösung' };
  }
  LX.netResolve = resolveName;

  // ---------- ping ----------
  LX.cmdPing = async function (ctx) {
    const w = ctx.w;
    const a = ctx.argv.slice(1);
    let count = Infinity, target = null;
    for (let i = 0; i < a.length; i++) {
      const o = a[i];
      if (o === '-c') { count = parseInt(a[++i], 10); if (!(count > 0)) { ctx.err('ping: ungültiges Argument: \'' + a[i] + '\'\n'); return 1; } }
      else if (/^-c\d+$/.test(o)) count = parseInt(o.slice(2), 10);
      else if (o === '-i' || o === '-W' || o === '-w' || o === '-s' || o === '-I') i++;
      else if (o === '-4' || o === '-n' || o === '-q') { /* ok */ }
      else if (o === '-h' || o === '--help') { ctx.out('\nAufruf\n  ping [Optionen] <Ziel>\n\nOptionen:\n  <Ziel>     DNS-Name oder IP-Adresse\n  -c <Anz.>  nach <Anz.> Antworten beenden\n  -h         Hilfe anzeigen\n'); return 0; }
      else if (o[0] === '-') { ctx.err('ping: ungültige Option -- \'' + o.replace(/^-+/, '') + '\'\n'); return 2; }
      else target = o;
    }
    if (!target) { ctx.err('ping: Ziel muss angegeben werden\n'); return 1; }
    const R = resolveName(w, target);
    if (R.err) { ctx.err(R.err + '\n'); return 2; }
    const dst = R.ip;
    const p = probe(w, dst);
    if (p.res === 'netunreach') { ctx.err('ping: connect: Das Netzwerk ist nicht erreichbar\n'); return 2; }
    ctx.out('PING ' + target + ' (' + dst + ') 56(84) Bytes an Daten.\n');
    let sent = 0, recv = 0, errs = 0; const rtts = []; const t0 = Date.now();
    const label = target === dst ? dst : (w.net.internet[dst] && w.net.internet[dst].name ? w.net.internet[dst].name : target) + ' (' + dst + ')';
    let interrupted = false;
    while (sent < count) {
      sent++;
      if (p.res === 'ok') {
        const rtt = p.rtt * (0.85 + Math.random() * 0.3);
        rtts.push(rtt); recv++;
        ctx.out('64 Bytes von ' + label + ': icmp_seq=' + sent + ' ttl=' + p.ttl + ' Zeit=' + (rtt < 1 ? rtt.toFixed(3) : rtt.toFixed(1)) + ' ms\n');
      } else if (p.res === 'hostunreach') {
        errs++;
        ctx.out('Von ' + p.src + ' icmp_seq=' + sent + ' Zielhost nicht erreichbar\n');
      }
      if (sent >= count) break;
      if (await ctx.wait(800)) { interrupted = true; break; }
    }
    if (interrupted) ctx.out('^C\n');
    if (recv > 0) { w.log.pings.push({ target: dst, ok: true, t: Date.now() }); }
    else w.log.pings.push({ target: dst, ok: false, t: Date.now() });
    const loss = Math.round(100 * (sent - recv) / sent);
    const dur = ctx.headless ? (sent - 1) * 1000 + 3 : Math.max(0, Date.now() - t0);
    ctx.out('\n--- ' + target + ' ping-Statistik ---\n');
    ctx.out(sent + ' Pakete übertragen, ' + recv + ' empfangen, ' + (errs ? '+' + errs + ' Fehler, ' : '') + loss + '% Paketverlust, Zeit ' + dur + 'ms\n');
    if (rtts.length) {
      const mn = Math.min.apply(null, rtts), mx = Math.max.apply(null, rtts), av = rtts.reduce((s, x) => s + x, 0) / rtts.length;
      const md = Math.sqrt(rtts.reduce((s, x) => s + (x - av) * (x - av), 0) / rtts.length);
      ctx.out('rtt min/avg/max/mdev = ' + [mn, av, mx, md].map(x => x.toFixed(3)).join('/') + ' ms\n');
    }
    if (errs) ctx.out('\n');
    return recv > 0 ? 0 : 1;
  };
})(typeof window !== 'undefined' ? window : globalThis);
