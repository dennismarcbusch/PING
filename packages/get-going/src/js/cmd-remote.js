/* Get-Going! – PowerShell-Remoting */
(function () {
'use strict';
const GG = globalThis.GG = globalThis.GG || {};
const V = GG.v, I = GG.interp, NW = GG.netw, N = GG.net;
const { PSObject, PSHash, PSDate, ScriptBlock, SecureString, ErrorRecord, PSRuntimeError } = GG;
const P = GG.P, def = GG.def;
const R = GG.remote = {};
const CORE = 'Microsoft.PowerShell.Core';

R.serialize = function (v, depth) {
  depth = depth || 0;
  if (v === null || v === undefined || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(x => R.serialize(x, depth + 1));
  if (v instanceof PSDate || v instanceof GG.TimeSpan || v instanceof GG.EnumVal || v instanceof PSHash) return v;
  if (v instanceof SecureString) return v;
  if (v instanceof ScriptBlock) return v.text;
  if (v instanceof ErrorRecord) return v;
  if (v instanceof PSObject) {
    if (depth > 1) return V.toStr(v);
    const tn = v.typeNames.map(t => /^Deserialized\./.test(t) || /PSCustomObject$/.test(t) ? t : 'Deserialized.' + t);
    const o = new PSObject(tn);
    for (const n of v.names()) o.add(n, R.serialize(v.get(n), depth + 1));
    if (v.toStringFn) { const s = V.toStr(v); o.toStringFn = () => s; }
    o.hiddenProps = v.hiddenProps;
    if (v.adRef) o.adRef = v.adRef;
    return o;
  }
  return v;
};
function stamp(v, host, show) {
  if (v instanceof PSObject) {
    if (!v.has('PSComputerName')) v.add('PSComputerName', host); else v.set('PSComputerName', host);
    v.add('RunspaceId', '3b5f8c2e-71a4-4d0b-9e6a-' + host.length.toString(16).padStart(12, '0'));
    v.add('PSShowComputerName', show !== false);
    v.hiddenProps = (v.hiddenProps || []).concat(['runspaceid', 'psshowcomputername']).concat(show === false ? ['pscomputername'] : []);
  }
  return v;
}

/* Verbindung prüfen */
R.check = function (c, name) {
  const w0 = c.world;
  const n = V.toStr(name);
  const res = { ok: false, name: n };
  if (/^(localhost|\.|127\.0\.0\.1)$/i.test(n) || n.toLowerCase() === w0.hostname.toLowerCase()) {
    if (!NW.listening(w0).includes(5985)) { res.reason = 'winrm'; return res; }
    if (!c.session.elevated && !c.session.remoteOrigin) { res.reason = 'denied'; return res; }
    res.ok = true; res.world = w0; return res;
  }
  if (N.isIPv4(n)) {
    const tw = NW.worldByName(w0, n);
    const r = NW.route(w0, n);
    if (!tw || !r.ok) { res.reason = 'timeout'; return res; }
    res.reason = 'trusted'; return res;
  }
  const d = NW.resolve(w0, n);
  if (d.error) { res.reason = 'dns'; return res; }
  const tw = NW.worldByName(w0, d.ip);
  const r = NW.route(w0, d.ip);
  if (!r.ok || !tw || !tw.online) { res.reason = 'timeout'; return res; }
  if (!NW.tcpOk({ world: tw }, 5985)) { res.reason = 'winrm'; return res; }
  if (tw.domain !== w0.domain) { res.reason = 'trusted'; return res; }
  res.ok = true; res.world = tw; res.fqdn = d.fqdn;
  return res;
};
R.connErr = function (c, chk, cmd, prefix) {
  const n = chk.name;
  let msg, fqid, cat = 'OpenError', exc = 'System.Management.Automation.Remoting.PSRemotingTransportException';
  switch (chk.reason) {
    case 'dns': msg = `Beim Verbinden mit dem Remoteserver "${n}" ist folgender Fehler aufgetreten: Der WinRM-Client kann die Anforderung nicht verarbeiten. Beim Verwenden der Kerberos-Authentifizierung ist folgender Fehler aufgetreten: Der Computer "${n}" wurde nicht gefunden. Vergewissern Sie sich, dass der Computer im Netzwerk vorhanden ist und dass der Name richtig geschrieben wurde. Weitere Informationen finden Sie im Hilfethema "about_Remote_Troubleshooting".`; fqid = 'NetworkPathNotFound,PSSessionStateBroken'; break;
    case 'trusted': msg = `Beim Verbinden mit dem Remoteserver "${n}" ist folgender Fehler aufgetreten: Der WinRM-Client kann die Anforderung nicht verarbeiten. Wenn das Authentifizierungsschema vom Kerberos-Schema abweicht oder kein Domänenkonto für den Clientcomputer verwendet wird, muss HTTPS als Transport verwendet werden, oder der Zielcomputer muss der TrustedHosts-Konfigurationseinstellung hinzugefügt werden. Verwenden Sie "winrm.cmd", um TrustedHosts zu konfigurieren. Beachten Sie, dass Computer in der TrustedHosts-Liste möglicherweise nicht authentifiziert werden. Weitere Informationen erhalten Sie, wenn Sie den folgenden Befehl ausführen: "winrm help config". Weitere Informationen finden Sie im Hilfethema "about_Remote_Troubleshooting".`; fqid = 'ServerNotTrusted,PSSessionStateBroken'; break;
    case 'denied': msg = `Beim Verbinden mit dem Remoteserver "${n}" ist folgender Fehler aufgetreten: Zugriff verweigert Weitere Informationen finden Sie im Hilfethema "about_Remote_Troubleshooting".`; fqid = 'AccessDenied,PSSessionStateBroken'; break;
    default: msg = `Beim Verbinden mit dem Remoteserver "${n}" ist folgender Fehler aufgetreten: Der WinRM-Client kann den Vorgang nicht ausführen. Stellen Sie sicher, dass der angegebene Computername gültig ist, dass auf den Computer über das Netzwerk zugegriffen werden kann und dass eine Firewallausnahme für den WinRM-Dienst aktiviert ist und Zugriff von diesem Computer ermöglicht. Standardmäßig wird der Zugriff auf Remotecomputer durch die WinRM-Firewallausnahme für öffentliche Profile auf Computer im selben lokalen Subnetz beschränkt. Weitere Informationen finden Sie im Hilfethema "about_Remote_Troubleshooting".`; fqid = 'WinRMOperationTimeout,PSSessionStateBroken';
  }
  if (prefix) msg = `[${n}] ` + msg;
  c.error(msg, { category: cat, exception: exc, fqid, noClass: true, target: n, reason: 'PSRemotingTransportException', cmd: cmd === 'Invoke-Command' ? '' : cmd });
};

/* Remotesitzung (PSSession) */
let sessId = 0;
R.newSession = function (c, tw, name, temp) {
  const origin = c.ctx.origin || c.session;
  const s = new GG.Session(tw, c.host, { user: c.session.user, domain: c.session.domain, elevated: true, remoteOrigin: origin, home: `C:\\Users\\${c.session.user}`, loc: `C:\\Users\\${c.session.user}\\Documents` });
  s.isAdmin = true;
  const id = ++sessId;
  const ps = { id, name: name || 'WinRM' + id, computer: tw.hostname, world: tw, session: s, state: 'Opened', temp: !!temp };
  // Home-Verzeichnis sicherstellen
  if (tw.fs.C) { const users = tw.fs.C.get('Users'); if (users && !users.get(c.session.user)) users.add(GG.d(c.session.user, [GG.d('Documents', []), GG.d('Desktop', [])], { owner: c.session.identity, acl: [GG.R(c.session.identity, 'F'), GG.R('VORDEFINIERT\\Administratoren', 'F'), GG.R('NT-AUTORITÄT\\SYSTEM', 'F')], protectedAcl: true })); }
  if (!temp) origin.psSessions.push(ps);
  return ps;
};
R.psSessionObj = function (ps) {
  const o = new PSObject('System.Management.Automation.Runspaces.PSSession', { Id: ps.id, Name: ps.name, ComputerName: ps.computer, ComputerType: 'RemoteMachine', State: ps.state, ConfigurationName: 'Microsoft.PowerShell', Availability: ps.state === 'Opened' ? 'Available' : 'None', InstanceId: '7c' + ps.id + 'a1e-55d0-4b6c-9f3a-2e1d0c9b8a7f', Runspace: 'System.Management.Automation.RemoteRunspace', Transport: 'WSMan' }, { ref: ps });
  o.toStringFn = () => `[PSSession]${ps.name}`;
  return o;
};
GG.view('System.Management.Automation.Runspaces.PSSession', { table: [{ l: 'Id', p: 'Id', w: 3, a: 'r' }, { l: 'Name', p: 'Name', w: 15 }, { l: 'ComputerName', p: 'ComputerName', w: 15 }, { l: 'ComputerType', p: 'ComputerType', w: 15 }, { l: 'State', p: 'State', w: 13 }, { l: 'ConfigurationName', p: 'ConfigurationName', w: 20 }, { l: 'Availability', p: 'Availability', a: 'r' }] });
R.worldOfSession = function (c, s) {
  if (s instanceof PSObject && s.ref && s.ref.world) return s.ref.world;
  if (s instanceof PSObject && s.get('ComputerName')) { const chk = R.check(c, s.get('ComputerName')); if (chk.ok) return chk.world; }
  return null;
};

/* Skriptblock remote ausführen */
R.runRemote = async function (c, ps, sb, args, input, opts) {
  opts = opts || {};
  const rs = ps.session;
  rs.host = c.host;
  const rctx = GG.mkCtx(rs, rs.global, { usingScope: c.scope, entry: c.ctx.entry, origin: c.ctx.origin || c.session });
  const sink = [];
  rctx.errSink = sink;
  let out = [];
  try {
    out = await I.invokeSB(sb, rctx, { args: args || [], input: input || null, scope: rs.global });
  } catch (e) {
    if (e instanceof PSRuntimeError) sink.push(e.rec); else if (!(e instanceof GG.ExitSignal)) throw e;
  }
  for (const r of sink) {
    r.psComputerName = ps.computer;
    const ea = c.p && c.p.ErrorAction;
    c.errCount++; if (c.log) c.log.ok = false;
    I.writeError(r, c.ctx, ea);
  }
  return out.map(v => stamp(R.serialize(v), ps.computer, !opts.hide));
};

def({ name: 'Invoke-Command', module: CORE, aliases: ['icm'], input: 'collect', posOrder: (n, b) => (n >= 2 && !('ComputerName' in b) && !('Session' in b)) ? ['ComputerName', 'ScriptBlock'] : null,
  params: [P('ScriptBlock', 'sb', { pos: 0, aliases: ['Command'] }), P('ComputerName', 'string[]', { aliases: ['Cn'] }), P('Session', 'object[]'), P('ArgumentList', 'object[]', { aliases: ['Args'] }), P('FilePath', 'string', { aliases: ['PSPath'] }), P('Credential', 'cred'), P('HideComputerName', 'switch', { aliases: ['HCN'] }), P('ThrottleLimit', 'int'), P('AsJob', 'switch'), P('NoNewScope', 'switch'), P('InputObject', 'object'), P('Port', 'int'), P('UseSSL', 'switch'), P('Authentication', 'string'), P('SessionName', 'string[]'), P('InDisconnectedSession', 'switch')],
  run: async (c, p, input) => {
    let sb = p.ScriptBlock;
    if (p.FilePath) {
      const r = GG.fsx.resolveFile(c.ctx, p.FilePath);
      if (!r || !r.node) return c.error(`Der Pfad "${p.FilePath}" kann nicht gefunden werden, da er nicht vorhanden ist.`, { category: 'ObjectNotFound', fqid: 'PathNotFound', exception: 'System.Management.Automation.ItemNotFoundException', target: p.FilePath });
      const ast = GG.parse(r.node.content || '', r.path);
      sb = new ScriptBlock(ast, r.node.content || '', ast.src);
    }
    if (!sb) throw GG.bindErr(c.ctx, 'Invoke-Command', 'Der Befehl kann nicht verarbeitet werden, da einer oder mehrere obligatorische Parameter fehlen: ScriptBlock.', 'MissingMandatoryParameter');
    if (p.AsJob) c.warn('Hintergrundaufträge (-AsJob) werden in dieser Simulation sofort ausgeführt.');
    if (!p.ComputerName && !p.Session) {
      const out = await I.invokeSB(sb, c.ctx, { args: p.ArgumentList || [], input, dot: !!p.NoNewScope });
      return c.outAll(out);
    }
    const targets = [];
    if (p.Session) for (const s of U(p.Session)) {
      const ps = s instanceof PSObject && s.ref ? s.ref : null;
      if (!ps || ps.state !== 'Opened') { c.error('Der Befehl kann nicht ausgeführt werden, da die Sitzung nicht verfügbar ist.', { category: 'InvalidOperation', fqid: 'InvokeCommandCommandInvalidSessionState', noClass: true }); continue; }
      targets.push(ps);
    }
    if (p.ComputerName) for (const n of p.ComputerName) {
      const chk = R.check(c, n);
      if (c.log) (c.log.remote = c.log.remote || []).push({ host: n, ok: chk.ok });
      if (!chk.ok) { R.connErr(c, chk, 'Invoke-Command', true); continue; }
      const ps = R.newSession(c, chk.world, null, true);
      ps.computer = n.toUpperCase() === chk.world.hostname.toUpperCase() ? chk.world.hostname : n;
      targets.push(ps);
    }
    for (const ps of targets) {
      const out = await R.runRemote(c, ps, sb, p.ArgumentList, input, { hide: p.HideComputerName });
      if (c.log) (c.log.remoteRan = c.log.remoteRan || []).push(ps.world.hostname);
      c.outAll(out);
    }
  } });
function U(v) { const r = []; for (const x of V.toArr(v)) { if (Array.isArray(x)) r.push(...x); else r.push(x); } return r; }
def({ name: 'New-PSSession', module: CORE, aliases: ['nsn'], input: 'none', params: [P('ComputerName', 'string[]', { pos: 0, aliases: ['Cn'] }), P('Name', 'string[]'), P('Credential', 'cred'), P('Port', 'int'), P('UseSSL', 'switch'), P('Authentication', 'string'), P('ThrottleLimit', 'int')],
  run: async (c, p) => {
    for (let k = 0; k < (p.ComputerName || ['localhost']).length; k++) {
      const n = (p.ComputerName || ['localhost'])[k];
      const chk = R.check(c, n);
      if (!chk.ok) { R.connErr(c, chk, 'New-PSSession', true); continue; }
      const ps = R.newSession(c, chk.world, p.Name && p.Name[k], false);
      ps.computer = n;
      c.out(R.psSessionObj(ps));
    }
  } });
def({ name: 'Get-PSSession', module: CORE, aliases: ['gsn'], input: 'none', params: [P('Name', 'string[]', { pos: 0 }), P('Id', 'int[]'), P('ComputerName', 'string[]', { aliases: ['Cn'] })],
  run: async (c, p) => {
    const origin = c.ctx.origin || c.session;
    let l = origin.psSessions;
    if (p.Name) l = l.filter(s => p.Name.some(n => V.like(s.name, n)));
    if (p.Id) l = l.filter(s => p.Id.includes(s.id));
    if (p.ComputerName) l = l.filter(s => p.ComputerName.some(n => V.like(s.computer, n)));
    c.outAll(l.map(R.psSessionObj));
  } });
def({ name: 'Remove-PSSession', module: CORE, aliases: ['rsn'], input: 'collect', sp: true, params: [P('Session', 'object[]', { pos: 0 }), P('Name', 'string[]'), P('Id', 'int[]', { pos: 0 }), P('ComputerName', 'string[]', { aliases: ['Cn'] })],
  run: async (c, p, input) => {
    const origin = c.ctx.origin || c.session;
    let list = [];
    for (const s of U(p.Session || []).concat(input || [])) if (s instanceof PSObject && s.ref) list.push(s.ref); else if (typeof s === 'number') { const x = origin.psSessions.find(y => y.id === s); if (x) list.push(x); }
    if (p.Id) list = list.concat(origin.psSessions.filter(s => p.Id.includes(s.id)));
    if (p.Name) list = list.concat(origin.psSessions.filter(s => p.Name.some(n => V.like(s.name, n))));
    if (p.ComputerName) list = list.concat(origin.psSessions.filter(s => p.ComputerName.some(n => V.like(s.computer, n))));
    for (const ps of list) {
      if (!(await c.should(ps.name, 'Remove-PSSession'))) continue;
      ps.state = 'Closed';
      origin.psSessions = origin.psSessions.filter(x => x !== ps);
      if (origin.remote && origin.remote.ps === ps) origin.remote = null;
    }
  } });
def({ name: 'Enter-PSSession', module: CORE, aliases: ['etsn'], input: 'none', params: [P('ComputerName', 'string', { pos: 0, aliases: ['Cn'] }), P('Session', 'object'), P('Id', 'int'), P('Name', 'string'), P('Credential', 'cred'), P('Port', 'int'), P('UseSSL', 'switch')],
  run: async (c, p) => {
    const origin = c.ctx.origin || c.session;
    if (origin.remote || c.session.remoteOrigin) return c.error('Der Befehl kann nicht ausgeführt werden, da bereits eine interaktive Remotesitzung geöffnet ist. Verlassen Sie die Sitzung zuerst mit "Exit-PSSession".', { category: 'InvalidOperation', exception: 'System.InvalidOperationException', fqid: 'RemoteHostDoesNotSupportPushRunspace', noClass: false });
    let ps;
    if (p.Session) { ps = p.Session.ref; if (!ps || ps.state !== 'Opened') return c.error('Die Sitzung ist nicht verfügbar.', { category: 'InvalidOperation', fqid: 'InvalidSession' }); }
    else if (p.Id !== undefined || p.Name) { ps = origin.psSessions.find(s => s.id === p.Id || s.name === p.Name); if (!ps) return c.error('Die angegebene Sitzung wurde nicht gefunden.', { category: 'InvalidArgument', fqid: 'RemoteRunspaceNotAvailableForSpecifiedName' }); }
    else {
      if (!p.ComputerName) throw GG.bindErr(c.ctx, 'Enter-PSSession', 'Der Befehl kann nicht verarbeitet werden, da einer oder mehrere obligatorische Parameter fehlen: ComputerName.', 'MissingMandatoryParameter');
      const chk = R.check(c, p.ComputerName);
      if (c.log) (c.log.remote = c.log.remote || []).push({ host: p.ComputerName, ok: chk.ok });
      if (!chk.ok) return R.connErr(c, chk, 'Enter-PSSession', false);
      ps = R.newSession(c, chk.world, null, true);
      ps.computer = p.ComputerName;
    }
    ps.session.host = c.host;
    origin.remote = { ps, session: ps.session, world: ps.world };
    if (c.log) c.log.entered = ps.world.hostname;
    if (c.host.remoteChanged) c.host.remoteChanged(origin);
  } });
def({ name: 'Exit-PSSession', module: CORE, aliases: ['exsn'], input: 'none', params: [],
  run: async (c) => { const origin = c.ctx.origin || c.session; await R.exitSession(origin); } });
R.exitSession = async function (origin) {
  if (!origin.remote) return;
  origin.remote = null;
  if (origin.host && origin.host.remoteChanged) origin.host.remoteChanged(origin);
};
GG.view('System.Xml.XmlElement#http://schemas.dmtf.org/wbem/wsman/identity/1/wsmanidentity.xsd#IdentifyResponse', { kind: 'list', list: ['wsmid', 'ProtocolVersion', 'ProductVendor', 'ProductVersion'].map(p => ({ p })) });
def({ name: 'Test-WSMan', module: 'Microsoft.WSMan.Management', version: '3.0.0.0', input: 'none', params: [P('ComputerName', 'string', { pos: 0, aliases: ['cn'] }), P('Authentication', 'string'), P('Credential', 'cred'), P('Port', 'int')],
  run: async (c, p) => {
    const n = p.ComputerName || 'localhost';
    const chk = R.check(Object.assign({}, c, { session: Object.assign(Object.create(Object.getPrototypeOf(c.session)), c.session, { elevated: true }) }), n);
    if (c.log) (c.log.wsman = c.log.wsman || []).push({ host: n, ok: chk.ok || chk.reason === 'trusted' || chk.reason === 'denied' });
    if (!chk.ok && chk.reason !== 'trusted' && chk.reason !== 'denied') return c.error(`<f:WSManFault xmlns:f="http://schemas.microsoft.com/wbem/wsman/1/wsmanfault" Code="2150859046" Machine="${c.world.hostname}"><f:Message>Der WinRM-Client kann die Anforderung nicht verarbeiten. ${chk.reason === 'dns' ? 'Der Computername konnte nicht aufgelöst werden.' : 'Stellen Sie sicher, dass der Dienst auf dem Zielcomputer ausgeführt wird und Anforderungen akzeptiert. Überprüfen Sie die Konfiguration des WinRM-Diensts und der Firewall.'} </f:Message></f:WSManFault>`, { category: 'InvalidOperation', exception: 'System.InvalidOperationException', fqid: 'WsManError,Microsoft.WSMan.Management.TestWSManCommand', noClass: true, target: n, reason: 'InvalidOperationException' });
    c.out(new PSObject('System.Xml.XmlElement#http://schemas.dmtf.org/wbem/wsman/identity/1/wsmanidentity.xsd#IdentifyResponse', { wsmid: 'http://schemas.dmtf.org/wbem/wsman/identity/1/wsmanidentity.xsd', ProtocolVersion: 'http://schemas.dmtf.org/wbem/wsman/1/wsman.xsd', ProductVendor: 'Microsoft Corporation', ProductVersion: 'OS: 0.0.0 SP: 0.0 Stack: 3.0' }));
  } });
def({ name: 'Enable-PSRemoting', module: CORE, input: 'none', sp: true, params: [P('Force', 'switch'), P('SkipNetworkProfileCheck', 'switch')],
  run: async (c, p) => {
    if (!c.session.elevated && !c.session.remoteOrigin) return c.error('Zugriff verweigert. Sie müssen Windows PowerShell mit der Option "Als Administrator ausführen" starten, um dieses Cmdlet auszuführen.', { category: 'InvalidOperation', exception: 'System.InvalidOperationException', fqid: 'System.InvalidOperationException,Microsoft.PowerShell.Commands.EnablePSRemotingCommand', noClass: true });
    if (!p.Force && !(await c.should(c.world.hostname, 'Set-WSManQuickConfig', { high: true }))) return;
    const w = c.world;
    const s = w.services.find(x => x.name === 'WinRM');
    const already = s && s.status === 'Running' && w.winrmListener !== false;
    if (s) { s.status = 'Running'; s.start = 'Automatic'; }
    w.winrmListener = true;
    for (const r of w.firewall.rules) if (/^WINRM-HTTP-In-TCP/.test(r.name)) r.enabled = true;
    if (already) c.host.write('WinRM wurde bereits für den Empfang von Anforderungen auf diesem Computer eingerichtet.\nWinRM wurde bereits für die Remoteverwaltung auf diesem Computer eingerichtet.');
    else c.host.write('WinRM wurde aktualisiert, um Anforderungen zu empfangen.\nDer Typ des WinRM-Diensts wurde erfolgreich geändert.\nDer WinRM-Dienst wurde gestartet.\n\nWinRM wurde für die Remoteverwaltung aktualisiert.\nFür WS-Man wurde ein HTTP://*-Listener erstellt, um WS-Verwaltungsanforderungen an eine beliebige IP-Adresse auf diesem Computer zu akzeptieren.\nFür WinRM wurde eine Firewallausnahme aktiviert.');
  } });
def({ name: 'Disable-PSRemoting', module: CORE, input: 'none', sp: true, params: [P('Force', 'switch')],
  run: async (c) => { if (!c.session.elevated) return c.error('Zugriff verweigert.', { category: 'InvalidOperation', fqid: 'AccessDenied' }); c.world.winrmListener = false; c.warn('Durch das Deaktivieren der Sitzungskonfigurationen werden nicht alle Änderungen rückgängig gemacht, die mit dem Cmdlet "Enable-PSRemoting" oder "Enable-PSSessionConfiguration" vorgenommen wurden.'); } });

/* Copy-Item -ToSession / -FromSession */
R.copySession = async function (c, p) {
  const ps = (p.ToSession || p.FromSession).ref;
  if (!ps) return c.error('Die Sitzung ist ungültig.', { category: 'InvalidArgument', fqid: 'InvalidSession' });
  const srcCtx = p.ToSession ? c.ctx : GG.mkCtx(ps.session, ps.session.global);
  const dstCtx = p.ToSession ? GG.mkCtx(ps.session, ps.session.global) : c.ctx;
  for (const path of p.Path || []) {
    const r = GG.fsx.resolve(srcCtx, path); const n = GG.fsx.node(r);
    if (!n) { GG.fsx.errNotFound(c, GG.fsx.canonical(r)); continue; }
    const dr = GG.fsx.resolve(dstCtx, p.Destination || '.');
    let dn = GG.fsx.node(dr), parent, name;
    if (dn && dn.dir) { parent = dn; name = n.name; } else { parent = GG.fsx.node(GG.fsx.parentRes(dr)); name = dr.parts[dr.parts.length - 1]; }
    if (!parent) { c.error(`Ein Teil des Pfades "${dr.full}" konnte nicht gefunden werden.`, { category: 'WriteError', exception: 'System.IO.DirectoryNotFoundException', fqid: 'CopyError' }); continue; }
    if (n.dir && !p.Recurse) { c.error(`Das Verzeichnis "${GG.fsx.canonical(r)}" kann nur mit -Recurse kopiert werden.`, { category: 'InvalidArgument', fqid: 'CopyDirectoryWithoutRecurse' }); continue; }
    const cl = GG.cloneNode(n, true); cl.name = name;
    const ex = parent.get(name); if (ex) parent.remove(ex.name);
    parent.add(cl);
  }
};

/* ============ Native Programme ============ */
const NT = GG.natives;
const out = (lines, code) => ({ lines, code: code || 0 });

NT.hostname = (c) => out([c.world.hostname]);
NT.whoami = (c, args) => {
  const s = c.session;
  const a = args.map(x => x.toLowerCase());
  if (!a.length) return out([s.identity.toLowerCase()]);
  if (a.includes('/user')) return out(['', 'BENUTZERINFORMATIONEN', '---------------------', '', 'Benutzername   SID', '============== ==============================================', `${s.identity.toLowerCase().padEnd(14)} S-1-5-21-3964187341-2291847063-1810493572-${1100 + s.user.length}`]);
  if (a.includes('/groups')) {
    const tok = GG.tokenOf(s); const w = c.world;
    const MAND = 'Verbindliche Gruppe, Standardmäßig aktiviert, Aktivierte Gruppe';
    const rows = [['Jeder', 'Bekannte Gruppe', 'S-1-1-0', MAND]];
    const isAdm = GG.isLocalAdmin(s);
    for (const g of (w.groups || [])) {
      const k = 'vordefiniert\\' + g.name.toLowerCase();
      if (g.name === 'Administratoren') { if (s.elevated || s.remoteOrigin) rows.push(['VORDEFINIERT\\Administratoren', 'Alias', g.sid, MAND + ', Gruppenbesitzer']); else if (isAdm) rows.push(['VORDEFINIERT\\Administratoren', 'Alias', g.sid, 'Nur für Verweigerungen verwendete Gruppe']); continue; }
      if (tok.has(k)) rows.push(['VORDEFINIERT\\' + g.name, 'Alias', g.sid, MAND]);
    }
    rows.push(['NT-AUTORITÄT\\INTERAKTIV', 'Bekannte Gruppe', 'S-1-5-4', MAND], ['KONSOLENANMELDUNG', 'Bekannte Gruppe', 'S-1-2-1', MAND], ['NT-AUTORITÄT\\Authentifizierte Benutzer', 'Bekannte Gruppe', 'S-1-5-11', MAND], ['NT-AUTORITÄT\\Diese Organisation', 'Bekannte Gruppe', 'S-1-5-15', MAND], ['LOKAL', 'Bekannte Gruppe', 'S-1-2-0', MAND]);
    if (w.ad) for (const g of w.ad.groups) { const k = (w.ad.netbios + '\\' + g.sam).toLowerCase(); if (tok.has(k)) rows.push([w.ad.netbios + '\\' + g.sam, 'Gruppe', w.ad.sidBase + '-' + g.rid, MAND]); }
    rows.push(['Authentifizierungsautoritäts-bestätigte Identität', 'Bekannte Gruppe', 'S-1-18-1', MAND]);
    rows.push([s.elevated || s.remoteOrigin ? 'Verbindlichkeitsstufe\\Hohe Verbindlichkeitsstufe' : 'Verbindlichkeitsstufe\\Mittlere Verbindlichkeitsstufe', 'Bezeichnung', s.elevated || s.remoteOrigin ? 'S-1-16-12288' : 'S-1-16-8192', '']);
    const w0 = Math.max(...rows.map(r => r[0].length)), w1 = 15, w2 = Math.max(...rows.map(r => r[2].length));
    const lines = ['', 'GRUPPENINFORMATIONEN', '--------------------', '', 'Gruppenname'.padEnd(w0) + ' ' + 'Typ'.padEnd(w1) + ' ' + 'SID'.padEnd(w2) + ' Attribute', '='.repeat(w0) + ' ' + '='.repeat(w1) + ' ' + '='.repeat(w2) + ' ' + '='.repeat(63)];
    for (const r of rows) lines.push((r[0].padEnd(w0) + ' ' + r[1].padEnd(w1) + ' ' + r[2].padEnd(w2) + ' ' + r[3]).trimEnd());
    return out(lines);
  }
  if (a.includes('/upn')) return out([`${s.user}@${c.world.domain || ''}`]);
  if (a.includes('/fqdn')) { const u = c.world.ad && c.world.ad.users.find(x => x.sam === s.user); return out([u ? GG.adDN(u) : 'FEHLER: Nicht in einer Domäne']); }
  if (a.includes('/priv')) return out(['', 'BERECHTIGUNGSINFORMATIONEN', '--------------------------', '', 'Berechtigungsname             Beschreibung                                 Status', '============================= ============================================ ===========', 'SeShutdownPrivilege           Herunterfahren des Systems                   Deaktiviert', 'SeChangeNotifyPrivilege       Auslassen der durchsuchenden Überprüfung     Aktiviert'].concat(s.elevated ? ['SeBackupPrivilege             Sichern von Dateien und Verzeichnissen       Deaktiviert', 'SeTakeOwnershipPrivilege      Übernehmen des Besitzes von Dateien und Objekten Deaktiviert'] : []));
  return { lines: [], err: [`FEHLER: Ungültiges Argument/ungültige Option - "${args[0]}".`, 'Geben Sie "WHOAMI /?" ein, um die Syntax anzuzeigen.'], code: 1 };
};

NT.ipconfig = (c, args) => {
  const w = c.world; const a = args.map(x => x.toLowerCase());
  if (a.includes('/flushdns')) { w.dnsCache = []; return out(['', 'Windows-IP-Konfiguration', '', 'Der DNS-Auflösungscache wurde geleert.']); }
  if (a.includes('/registerdns')) return out(['', 'Windows-IP-Konfiguration', '', 'Die Registrierung der DNS-Ressourceneinträge für alle Adapter dieses Computers wurde initiiert. Etwaige Fehler werden innerhalb von 15 Minuten in der Ereignisanzeige gemeldet.']);
  if (a.includes('/release') || a.includes('/renew')) {
    if (!c.session.elevated) return { lines: ['', 'Windows-IP-Konfiguration', '', 'Der angeforderte Vorgang erfordert erhöhte Rechte.'], code: 1 };
    const lines = ['', 'Windows-IP-Konfiguration', ''];
    for (const ad of w.net.adapters) { const cfg = w.net.ip[ad.ifIndex]; if (!cfg.dhcp) lines.push(`Für den Adapter "${ad.name}" ist DHCP nicht aktiviert.`); else GG.netx.dhcpRefresh(w, ad); }
    return out(lines);
  }
  const all = a.includes('/all');
  const lines = ['', 'Windows-IP-Konfiguration', ''];
  if (all) lines.push(`   Hostname  . . . . . . . . . . . . : ${w.hostname}`, `   Primäres DNS-Suffix . . . . . . . : ${w.domain || ''}`, '   Knotentyp . . . . . . . . . . . . : Hybrid', '   IP-Routing aktiviert  . . . . . . : Nein', '   WINS-Proxy aktiviert  . . . . . . : Nein', `   DNS-Suffixsuchliste . . . . . . . : ${w.domain || ''}`);
  for (const ad of w.net.adapters) {
    if (!ad.enabled) continue;
    const cfg = w.net.ip[ad.ifIndex];
    lines.push('', `Ethernet-Adapter ${ad.name}:`, '');
    if (!ad.connected) { lines.push('   Medienstatus. . . . . . . . . . . : Medium getrennt', '   Verbindungsspezifisches DNS-Suffix: '); if (all) lines.push(`   Beschreibung. . . . . . . . . . . : ${ad.desc}`, `   Physische Adresse . . . . . . . . : ${ad.mac}`); continue; }
    lines.push('   Verbindungsspezifisches DNS-Suffix: ');
    if (all) lines.push(`   Beschreibung. . . . . . . . . . . : ${ad.desc}`, `   Physische Adresse . . . . . . . . : ${ad.mac}`, `   DHCP aktiviert. . . . . . . . . . : ${cfg.dhcp ? 'Ja' : 'Nein'}`, '   Autokonfiguration aktiviert . . . : Ja');
    lines.push(`   Verbindungslokale IPv6-Adresse  . : fe80::${(ad.ifIndex * 4099).toString(16)}:${(ad.ifIndex * 31).toString(16)}c2:${(0x8a10 + ad.ifIndex).toString(16)}:${(0x4f20 + ad.ifIndex * 7).toString(16)}%${ad.ifIndex}${all ? '(Bevorzugt)' : ''}`);
    for (const x of cfg.addrs) {
      const apipa = /^169\.254/.test(x.ip);
      lines.push(`   ${apipa ? 'Autokonfiguration IPv4-Adresse  .' : 'IPv4-Adresse  . . . . . . . . . .'} : ${x.ip}${all ? '(Bevorzugt)' : ''}`);
      lines.push(`   Subnetzmaske  . . . . . . . . . . : ${N.fromInt(N.mask(x.prefix))}`);
    }
    lines.push(`   Standardgateway . . . . . . . . . : ${(cfg.gw || []).join('\n                                       ')}`);
    if (all) {
      if (cfg.dhcp) lines.push(`   DHCP-Server . . . . . . . . . . . : ${cfg.dhcpServer || ''}`);
      lines.push(`   DNS-Server  . . . . . . . . . . . : ${(cfg.dns || []).length ? cfg.dns.join('\n                                       ') : ''}`, '   NetBIOS über TCP/IP . . . . . . . : Aktiviert');
    }
  }
  return out(lines);
};

NT.ping = (c, args) => {
  const a = args.slice(); let count = 4, target = null, size = 32, i = 0;
  while (i < a.length) {
    const x = a[i].toLowerCase();
    if (x === '-n' || x === '/n') { count = parseInt(a[i + 1], 10) || 4; i += 2; continue; }
    if (x === '-l' || x === '/l') { size = parseInt(a[i + 1], 10) || 32; i += 2; continue; }
    if (x === '-t' || x === '/t') { count = 4; i++; continue; }
    if (x === '-4' || x === '-a') { i++; continue; }
    if (x.startsWith('-') || x.startsWith('/')) { if (x === '/?' || x === '-?') return out(['', 'Syntax: ping [-t] [-a] [-n Anzahl] [-l Größe] Zielname']); i++; continue; }
    target = a[i]; i++;
  }
  if (!target) return out(['', 'Syntax: ping [-t] [-a] [-n Anzahl] [-l Größe] [-f] [-i TTL] [-v TOS]', '            [-r Anzahl] [-s Anzahl] [[-j Hostliste] | [-k Hostliste]]', '            [-w Zeitlimit] [-R] [-S Quelladresse] [-c Depot] [-p]', '            [-4] [-6] Zielname'], 1);
  const res = GG.netw.ping(c.world, target);
  if (c.log) (c.log.pings = c.log.pings || []).push({ target, ok: res.ok, ip: res.ip });
  if (res.reason === 'dns') return out([`Ping-Anforderung konnte Host "${target}" nicht finden. Überprüfen Sie den Namen, und versuchen Sie es erneut.`], 1);
  const shown = res.fqdn && res.fqdn !== res.ip ? `${res.fqdn} [${res.ip}]` : res.ip;
  const lines = ['', `Ping wird ausgeführt für ${shown} mit ${size} Bytes Daten:`];
  let recv = 0;
  for (let k = 0; k < count; k++) {
    if (res.ok) { recv++; lines.push(`Antwort von ${res.ip}: Bytes=${size} Zeit${res.time < 1 ? '<1ms' : '=' + (res.time + (k % 2)) + 'ms'} TTL=${res.ttl}`); }
    else if (res.reason === 'unreachable') lines.push(`Antwort von ${res.src}: Zielhost nicht erreichbar.`);
    else if (res.reason === 'noroute') lines.push('PING: Fehler bei der Übertragung. Allgemeiner Fehler.');
    else lines.push('Zeitüberschreitung der Anforderung.');
  }
  const unreach = res.reason === 'unreachable';
  lines.push('', `Ping-Statistik für ${res.ip}:`, `    Pakete: Gesendet = ${count}, Empfangen = ${unreach ? count : recv}, Verloren = ${unreach ? 0 : count - recv}`, `    (${unreach ? 0 : Math.round((count - recv) / count * 100)}% Verlust),`);
  if (recv) lines.push('Ca. Zeitangaben in Millisek.:', `    Minimum = ${res.time}ms, Maximum = ${res.time + (count > 1 ? 1 : 0)}ms, Mittelwert = ${res.time}ms`);
  return out(lines, res.ok ? 0 : 1);
};

NT.tracert = (c, args) => {
  const target = args.find(x => !/^[-/]/.test(x));
  if (!target) return out(['', 'Syntax: tracert [-d] [-h Abschnitte_max] [-j Hostliste] [-w Zeitlimit] Zielname'], 1);
  const w = c.world;
  let ip = target, fqdn = null;
  if (!N.isIPv4(target)) { const d = NW.resolve(w, target); if (d.error) return out([`Der Zielname "${target}" konnte nicht aufgelöst werden.`], 1); ip = d.ip; fqdn = d.fqdn; }
  const r = NW.route(w, ip);
  const lines = ['', `Routenverfolgung zu ${fqdn ? fqdn + ' [' + ip + ']' : ip}`, 'über maximal 30 Hops:', ''];
  const pad = s => String(s).padStart(5);
  if (!r.ok) { lines.push(`  1  ${pad('*')}    ${pad('*')}    ${pad('*')}     Zeitüberschreitung der Anforderung.`, `  2  ${pad('*')}    ${pad('*')}    ${pad('*')}     Zeitüberschreitung der Anforderung.`, '', 'Ablaufverfolgung beendet.'); return out(lines, 1); }
  if (r.hops) {
    const gw = (w.net.ip[r.adapter.ifIndex].gw || [])[0];
    lines.push(`  1    <1 ms    <1 ms    <1 ms  ${gw}`);
    if (r.host && r.host.internet) { lines.push('  2     6 ms     5 ms     6 ms  203.0.113.1', '  3     9 ms     8 ms     9 ms  198.51.100.17', `  4    11 ms    11 ms    12 ms  ${fqdn ? fqdn + ' [' + ip + ']' : ip}`); }
    else lines.push(`  2    <1 ms    <1 ms    <1 ms  ${fqdn ? fqdn + ' [' + ip + ']' : ip}`);
  } else lines.push(`  1    <1 ms    <1 ms    <1 ms  ${fqdn ? fqdn + ' [' + ip + ']' : ip}`);
  lines.push('', 'Ablaufverfolgung beendet.');
  return out(lines);
};

NT.nslookup = (c, args) => {
  const w = c.world;
  const name = args.find(x => !/^-/.test(x));
  const srv = NW.dnsServers(w)[0];
  const srvHost = srv ? (w.netw ? NW.allHosts(w.netw).find(h => h.ip === srv) : null) : null;
  const srvName = srvHost ? (srvHost.name.toLowerCase() + (srvHost.world && srvHost.world.domain ? '.' + srvHost.world.domain : '')) : 'UnKnown';
  const reachable = srv && NW.route(w, srv).ok && srvHost;
  if (!srv) return out(['Standardserver:  UnKnown', 'Address:  ::1', '', `*** Zeitüberschreitung bei Anforderung an UnKnown.`], 1);
  if (!reachable) return out(['DNS request timed out.', '    timeout was 2 seconds.', 'Server:  UnKnown', `Address:  ${srv}`, '', `*** Zeitüberschreitung bei Anforderung an UnKnown.`], 1);
  const head = [`Server:  ${srvName}`, `Address:  ${srv}`, ''];
  if (!name) return out(head.concat(['> (Interaktiver Modus wird in der Simulation nicht unterstützt.)']));
  if (N.isIPv4(name)) { const h = NW.allHosts(w.netw).find(x => x.ip === name); if (!h) return out(head.concat([`*** ${name} wurde von ${srvName} nicht gefunden: Non-existent domain.`]), 1); return out(head.concat([`Name:    ${h.name.toLowerCase()}${h.world && h.world.domain ? '.' + h.world.domain : ''}`, `Address:  ${name}`, ''])); }
  const d = NW.resolve(w, name);
  if (d.error === 'nx') return out(head.concat([`*** ${name} wurde von ${srvName} nicht gefunden: Non-existent domain.`]), 1);
  if (d.error) return out(head.concat([`*** Zeitüberschreitung bei Anforderung an ${srvName}.`]), 1);
  const internal = w.domain && d.fqdn.endsWith(w.domain);
  const ans = [`Name:    ${d.cname || d.fqdn}`, `Address:  ${d.ip}`].concat(d.cname ? [`Aliases:  ${d.fqdn}`] : []).concat(['']);
  return out(head.concat(internal ? [] : ['Nicht autorisierende Antwort:']).concat(ans));
};

/* icacls */
const RAB = { F: 'F', M: 'M', RX: 'RX', R: 'R', W: 'W' };
function icaclsName(id) { return id; }
NT.icacls = (c, args) => {
  if (!args.length || args[0] === '/?') return out(['ICACLS Name /save Aclfile [/T] [/C] [/L] [/Q]', '    speichert die DACLs für die übereinstimmenden Dateien zur späteren Verwendung', '    mit /restore in "Aclfile".', '', 'ICACLS Name [/grant[:r] Sid:Berechtigung[...]]', '       [/deny Sid:Berechtigung [...]]', '       [/remove[:g|:d]] Sid[...]] [/T] [/C] [/L] [/Q]', '       [/setintegritylevel Ebene:Richtlinie[...]]', '', '    /grant[:r] Sid:Berechtigung  gewährt die angegebenen Benutzerzugriffsrechte.', '    /remove Sid  entfernt alle Vorkommen der SID in der ACL.', '    /inheritance:e|d|r', '        e - aktiviert die Vererbung.', '        d - deaktiviert die Vererbung und kopiert die ACEs.', '        r - entfernt alle geerbten ACEs.', '', '    Berechtigung: F (Vollzugriff), M (Ändern), RX (Lesen, Ausführen),', '                  R (Schreibgeschützter Zugriff), W (Schreibgeschützt)', '    Vererbung: (OI) Objektvererbung, (CI) Containervererbung,', '               (IO) Nur vererben, (NP) Vererbung nicht verbreiten'], args.length ? 0 : 1);
  const target = args[0];
  const r = GG.fsx.resolve(c.ctx, target);
  const n = GG.fsx.node(r);
  if (!n) return { lines: [`${target}: Das System kann die angegebene Datei nicht finden.`, '0 Dateien erfolgreich verarbeitet, bei 1 Dateien ist ein Verarbeitungsfehler aufgetreten.'], code: 2 };
  const full = GG.fsx.canonical(r);
  const ops = args.slice(1);
  const fmtRule = x => `${x.id}:${x.inherited ? '(I)' : ''}${x.oi ? '(OI)' : ''}${x.ci ? '(CI)' : ''}${x.io ? '(IO)' : ''}${x.np ? '(NP)' : ''}${x.type === 'Deny' ? '(DENY)' : ''}(${RAB[x.r] || x.r})`;
  if (!ops.length || ops.every(o => /^\/[tcql]$/i.test(o))) {
    if (!GG.checkAccess(c.session, n, 'read') && !c.session.elevated) return { lines: [`${full}: Zugriff verweigert`, '0 Dateien erfolgreich verarbeitet, bei 1 Dateien ist ein Verarbeitungsfehler aufgetreten.'], code: 5 };
    const rules = GG.effAclDisplay(n);
    const lines = rules.map((x, i) => (i === 0 ? full + ' ' : ' '.repeat(full.length + 1)) + fmtRule(x));
    if (!rules.length) lines.push(full + ' ');
    lines.push('', '1 Dateien erfolgreich verarbeitet, bei 0 Dateien ist ein Verarbeitungsfehler aufgetreten.');
    return out(lines);
  }
  if (!GG.checkAccess(c.session, n, 'perm')) return { lines: [`${full}: Zugriff verweigert`, '0 Dateien erfolgreich verarbeitet, bei 1 Dateien ist ein Verarbeitungsfehler aufgetreten.'], code: 5 };
  const resolveId = (s) => {
    const l = s.toLowerCase();
    if (l === 'jeder') return 'Jeder';
    if (l === '*s-1-1-0') return 'Jeder';
    if (/^(vordefiniert|builtin)\\/.test(l)) { const g = c.world.groups.find(x => x.name.toLowerCase() === l.split('\\')[1]); return g ? 'VORDEFINIERT\\' + g.name : null; }
    if (/^nt-autorität\\system$|^system$/.test(l)) return 'NT-AUTORITÄT\\SYSTEM';
    if (l === 'ersteller-besitzer') return 'ERSTELLER-BESITZER';
    if (/^nt-autorität\\authentifizierte benutzer$/.test(l)) return 'NT-AUTORITÄT\\Authentifizierte Benutzer';
    const pr = GG.resolvePrincipal(c.world, s);
    return pr ? pr.full : null;
  };
  const mapErr = () => ({ lines: ['Zuordnungen von Kontennamen und Sicherheitskennungen wurden nicht durchgeführt.', '0 Dateien erfolgreich verarbeitet, bei 1 Dateien ist ein Verarbeitungsfehler aufgetreten.'], code: 1332 });
  const changes = [];
  for (let i = 0; i < ops.length; i++) {
    const o = ops[i].toLowerCase();
    if (/^\/(grant|deny)(:r)?$/.test(o)) {
      const spec = ops[++i]; if (!spec) return { lines: ['Ungültiger Parameter "' + ops[i - 1] + '".'], code: 87 };
      const m = /^(.+):((?:\((?:OI|CI|IO|NP|I)\))*)\(?([A-Z,]+)\)?$/i.exec(spec);
      if (!m) return { lines: [`Ungültiger Parameter "${spec}".`], code: 87 };
      const id = resolveId(m[1]); if (!id) return mapErr();
      const flags = m[2].toUpperCase();
      let right = m[3].toUpperCase(); if (!RAB[right]) { if (right.includes('F')) right = 'F'; else if (right.includes('M')) right = 'M'; else return { lines: [`Ungültiger Parameter "${spec}".`], code: 87 }; }
      changes.push({ op: o.startsWith('/deny') ? 'deny' : 'grant', replace: o.endsWith(':r'), rule: { id, r: right, type: o.startsWith('/deny') ? 'Deny' : 'Allow', oi: flags.includes('(OI)'), ci: flags.includes('(CI)'), io: flags.includes('(IO)'), np: flags.includes('(NP)') } });
    } else if (/^\/remove(:[gd])?$/.test(o)) {
      const who = ops[++i]; const id = resolveId(who || ''); if (!id) return mapErr();
      changes.push({ op: 'remove', id, which: o.split(':')[1] });
    } else if (/^\/inheritance:[edr]$/.test(o)) changes.push({ op: 'inh', mode: o.slice(-1) });
    else if (/^\/(t|c|q|l)$/.test(o)) continue;
    else if (o === '/reset') changes.push({ op: 'reset' });
    else if (/^\/setowner$/.test(o)) { const id = resolveId(ops[++i] || ''); if (!id) return mapErr(); changes.push({ op: 'owner', id }); }
    else return { lines: [`Ungültiger Parameter "${ops[i]}".`], code: 87 };
  }
  for (const ch of changes) {
    if (ch.op === 'grant' || ch.op === 'deny') {
      if (ch.replace) n.acl = n.acl.filter(x => !(x.id.toLowerCase() === ch.rule.id.toLowerCase() && x.type === ch.rule.type));
      const ex = n.acl.find(x => x.id.toLowerCase() === ch.rule.id.toLowerCase() && x.type === ch.rule.type && x.oi === ch.rule.oi && x.ci === ch.rule.ci && x.io === ch.rule.io);
      if (ex) { const lv = { R: 1, RX: 2, W: 2, M: 3, F: 4 }; if (lv[ch.rule.r] > lv[ex.r] || ch.replace) ex.r = ch.rule.r; }
      else n.acl.push(ch.rule);
    } else if (ch.op === 'remove') {
      n.acl = n.acl.filter(x => !(x.id.toLowerCase() === ch.id.toLowerCase() && (!ch.which || (ch.which === 'g' ? x.type === 'Allow' : x.type === 'Deny'))));
      if (!n.protectedAcl && GG.effAclDisplay(n).some(x => x.inherited && x.id.toLowerCase() === ch.id.toLowerCase())) { /* geerbte Einträge bleiben */ }
    } else if (ch.op === 'inh') {
      if (ch.mode === 'd') { const inh = GG.effAclDisplay(n).filter(x => x.inherited).map(x => { const y = Object.assign({}, x); delete y.inherited; return y; }); n.acl = inh.concat(n.acl); n.protectedAcl = true; }
      else if (ch.mode === 'r') n.protectedAcl = true;
      else n.protectedAcl = false;
    } else if (ch.op === 'reset') { n.acl = []; n.protectedAcl = false; }
    else if (ch.op === 'owner') n.owner = ch.id;
  }
  // doppelte Einträge zusammenführen
  const seen = new Map(); n.acl = n.acl.filter(x => { const k = [x.id.toLowerCase(), x.type, x.oi, x.ci, x.io, x.r].join('|'); if (seen.has(k)) return false; seen.set(k, 1); return true; });
  if (c.log) c.log.icacls = { path: full, changes };
  return out([`Bearbeitete Datei: ${full}`, '1 Dateien erfolgreich verarbeitet, bei 0 Dateien ist ein Verarbeitungsfehler aufgetreten.']);
};

NT.notepad = (c, args) => {
  if (c.session.remoteOrigin) return { lines: [], err: ['Das Programm "notepad.exe" kann in einer Remotesitzung nicht interaktiv gestartet werden. Bearbeite Dateien lokal und kopiere sie mit Copy-Item -ToSession.'], code: 1 };
  const file = args.length ? args.join(' ') : null;
  if (c.host.openNotepad) c.host.openNotepad(c.ctx, file);
  GG.spawnProc(c.world, GG.knownExe.notepad, c.session.user);
  return out([]);
};

NT.tree = (c, args) => {
  const files = args.some(a => /^\/f$/i.test(a));
  const ascii = args.some(a => /^\/a$/i.test(a));
  const target = args.find(a => !/^\//.test(a)) || '.';
  const r = GG.fsx.resolve(c.ctx, target);
  const n = GG.fsx.node(r);
  if (!n || !n.dir) return { lines: ['Ungültiger Pfad - ' + GG.fsx.canonical(r).toUpperCase().replace(/^[A-Z]:/, '')], code: 1 };
  const full = GG.fsx.canonical(r);
  const lines = ['Auflistung der Ordnerpfade' + (files ? '' : ''), 'Volumeseriennummer : 7A3C-E1F2', full.toUpperCase()];
  const T = ascii ? { mid: '+---', last: '\\---', bar: '|   ', sp: '    ' } : { mid: '├───', last: '└───', bar: '│   ', sp: '    ' };
  const walk = (node, prefix) => {
    if (!GG.checkAccess(c.session, node, 'read')) return;
    const kids = GG.kidsSorted(node).filter(k => !k.hidden);
    const dirs = kids.filter(k => k.dir), fls = kids.filter(k => !k.dir);
    if (files) { for (const f of fls) lines.push(prefix + (dirs.length ? T.bar : T.sp) + f.name); if (fls.length) lines.push(prefix + (dirs.length ? T.bar : T.sp)); }
    dirs.forEach((d, i) => { const last = i === dirs.length - 1; lines.push(prefix + (last ? T.last : T.mid) + d.name); walk(d, prefix + (last ? T.sp : T.bar)); });
  };
  walk(n, '');
  if (!n.children.size || ![...n.children.values()].some(k => k.dir)) lines.push('Keine Unterordner vorhanden', '');
  return out(lines);
};

/* winget */
const CATALOG = [
  { id: '7zip.7zip', name: '7-Zip', version: '24.09', pub: 'Igor Pavlov', url: 'https://www.7-zip.org/a/7z2409-x64.exe', size: '1.56 MB', tags: '7zip zip archiv kompression' },
  { id: 'mcmilk.7zip-zstd', name: '7-Zip ZS', version: '24.09 ZS v1.5.6 R1', pub: 'Tino Reichardt', url: 'https://github.com/mcmilk/7-Zip-zstd/releases/download/v24.09-v1.5.6-R1/7z24.09-zstd-x64.exe', size: '2.10 MB', tags: '7zip zip' },
  { id: 'Notepad++.Notepad++', name: 'Notepad++', version: '8.7.1', pub: 'Notepad++ Team', url: 'https://github.com/notepad-plus-plus/notepad-plus-plus/releases/download/v8.7.1/npp.8.7.1.Installer.x64.exe', size: '5.52 MB', tags: 'editor notepad text' },
  { id: 'Microsoft.PowerShell', name: 'PowerShell', version: '7.5.3.0', pub: 'Microsoft Corporation', url: 'https://github.com/PowerShell/PowerShell/releases/download/v7.5.3/PowerShell-7.5.3-win-x64.msi', size: '106 MB', tags: 'powershell pwsh shell' },
  { id: 'Microsoft.VisualStudioCode', name: 'Microsoft Visual Studio Code', version: '1.105.1', pub: 'Microsoft Corporation', url: 'https://update.code.visualstudio.com/1.105.1/win32-x64/stable', size: '98.3 MB', tags: 'editor code vscode' },
  { id: 'Mozilla.Firefox', name: 'Mozilla Firefox (de)', version: '144.0', pub: 'Mozilla', url: 'https://download.mozilla.org/?product=firefox-144.0-ssl&os=win64&lang=de', size: '67.9 MB', tags: 'browser firefox' },
  { id: 'VideoLAN.VLC', name: 'VLC media player', version: '3.0.21', pub: 'VideoLAN', url: 'https://get.videolan.org/vlc/3.0.21/win64/vlc-3.0.21-win64.exe', size: '42.6 MB', tags: 'video vlc media' },
  { id: 'WiresharkFoundation.Wireshark', name: 'Wireshark', version: '4.4.9', pub: 'The Wireshark developer community', url: 'https://2.na.dl.wireshark.org/win64/Wireshark-4.4.9-x64.exe', size: '86.1 MB', tags: 'netzwerk analyse wireshark pcap' },
  { id: 'PuTTY.PuTTY', name: 'PuTTY', version: '0.83.0.0', pub: 'Simon Tatham', url: 'https://the.earth.li/~sgtatham/putty/0.83/w64/putty-64bit-0.83-installer.msi', size: '3.68 MB', tags: 'ssh putty telnet' },
  { id: 'Git.Git', name: 'Git', version: '2.51.0', pub: 'The Git Development Community', url: 'https://github.com/git-for-windows/git/releases/download/v2.51.0.windows.1/Git-2.51.0-64-bit.exe', size: '65.4 MB', tags: 'git versionskontrolle' },
  { id: 'KeePassXCTeam.KeePassXC', name: 'KeePassXC', version: '2.7.10', pub: 'KeePassXC Team', url: 'https://github.com/keepassxreboot/keepassxc/releases/download/2.7.10/KeePassXC-2.7.10-Win64.msi', size: '41.0 MB', tags: 'passwort keepass' },
  { id: 'WinSCP.WinSCP', name: 'WinSCP', version: '6.5.3', pub: 'Martin Prikryl', url: 'https://winscp.net/download/WinSCP-6.5.3-Setup.exe', size: '11.8 MB', tags: 'scp sftp ftp' }
];
GG.WINGET_CATALOG = CATALOG;
GG.nativeRequires = GG.nativeRequires || {};
GG.nativeRequires.winget = w => w.winget !== false;
function wgTable(rows, cols) {
  const ws = cols.map((c, i) => Math.max(c.length, ...rows.map(r => String(r[i] || '').length)));
  const line = r => r.map((x, i) => String(x || '').padEnd(ws[i])).join(' ').replace(/\s+$/, '');
  return [line(cols), '-'.repeat(ws.reduce((a, b) => a + b + 1, -1))].concat(rows.map(line));
}
NT.winget = async (c, args) => {
  const w = c.world;
  const sub = (args[0] || '').toLowerCase();
  const rest = args.slice(1);
  const flag = f => rest.some(x => x.toLowerCase() === f);
  const val = f => { const i = rest.findIndex(x => x.toLowerCase() === f); return i >= 0 ? rest[i + 1] : null; };
  const query = () => { const q = val('--id') || val('--name') || val('-q') || val('--query') || rest.find((x, i) => !x.startsWith('-') && !(i > 0 && rest[i - 1].startsWith('-') && !['-e', '--exact', '--silent', '--accept-source-agreements', '--accept-package-agreements', '-h'].includes(rest[i - 1].toLowerCase()))); return q; };
  const installed = w.packages || (w.packages = []);
  if (!sub || sub === '--help' || sub === '-?' || sub === '/?') return out(['Windows-Paket-Manager v1.11.430', 'Copyright (c) Microsoft Corporation. Alle Rechte vorbehalten.', '', 'Das winget-Befehlszeilenprogramm ermöglicht die Installation von Anwendungen und anderen Paketen über die Befehlszeile.', '', 'Syntax: winget  [<Befehl>] [<Optionen>]', '', 'Die folgenden Befehle sind verfügbar:', '  install    Installiert das angegebene Paket', '  show       Zeigt Informationen zu einem Paket an', '  source     Verwalten von Paketquellen', '  search     Grundlegende Informationen von Paketen suchen und anzeigen', '  list       Installierte Pakete anzeigen', '  upgrade    Zeigt verfügbare Upgrades an und führt sie aus.', '  uninstall  Deinstalliert das angegebene Paket', '', 'Weitere Informationen zu einem bestimmten Befehl können abgerufen werden, indem das Hilfeargument übergeben wird. [-?]']);
  if (sub === '--version' || sub === '-v') return out(['v1.11.430']);
  const needNet = () => { if (!NW.internet(w)) return { lines: ['Fehler beim Suchen der Quelle; Ergebnisse werden nicht eingeschlossen: winget', 'Fehler beim Öffnen der vordefinierten Quelle. Melden Sie dies den winget-Projektverwaltern.', '0x8a15000f : Daten, die von der Quelle benötigt werden, fehlen.'], code: -1978335217 }; return null; };
  const agree = async () => {
    if (w.wingetAccepted || flag('--accept-source-agreements')) { w.wingetAccepted = true; return true; }
    const ans = await c.host.choice('', 'Die Quelle "msstore" erfordert, dass Sie die folgenden Vereinbarungen anzeigen, bevor Sie sie verwenden.\nNutzungsbedingungen: https://www.microsoft.com/windows/terms\nDie Quelle erfordert, dass die 2-Buchstaben-Region des aktuellen Computers an den Back-End-Dienst gesendet wird, damit er ordnungsgemäß funktioniert (z. B. "US").\n\nStimmen Sie allen Vertragsbedingungen der Quelle zu?', [{ key: 'Y', label: 'Ja' }, { key: 'N', label: 'Nein' }], 0, { noHelp: true });
    if (ans === 'Y' || ans === 'J') { w.wingetAccepted = true; return true; }
    return false;
  };
  const sys = [{ id: 'Microsoft.Edge', name: 'Microsoft Edge', version: '141.0.3537.85', src: 'winget' }, { id: 'Microsoft.EdgeWebView2Runtime', name: 'Microsoft Edge WebView2 Runtime', version: '141.0.3537.85', src: 'winget' }, { id: 'Microsoft.VCRedist.2015+.x64', name: 'Microsoft Visual C++ 2015-2022 Redistributable (x64) - 14.44.35211', version: '14.44.35211.0', src: 'winget' }];
  if (sub === 'search' || sub === 'find') {
    const e = needNet(); if (e) return e;
    if (!(await agree())) return { lines: ['Eine oder mehrere Quellvereinbarungen wurden nicht akzeptiert. Der Vorgang wurde abgebrochen. Bitte akzeptieren Sie die Vereinbarungen oder entfernen Sie die entsprechenden Quellen.'], code: -1978335150 };
    const q = (query() || '').toLowerCase();
    if (!q) return { lines: ['Erforderliches Argument fehlt: query'], code: -1978335230 };
    const res = CATALOG.filter(p => p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || p.tags.includes(q));
    if (!res.length) return { lines: ['Es wurde kein Paket gefunden, das den Eingabekriterien entspricht.'], code: -1978335212 };
    return out(wgTable(res.map(p => [p.name, p.id, p.version, p.tags.split(' ')[0] === q ? 'Tag: ' + q : '', 'winget']), ['Name', 'ID', 'Version', 'Übereinstimmung', 'Quelle']).map(l => l));
  }
  if (sub === 'list' || sub === 'ls') {
    const q = (query() || '').toLowerCase();
    let rows = sys.concat(installed.map(p => ({ id: p.id, name: p.name, version: p.version, src: 'winget' })));
    if (q) rows = rows.filter(p => p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
    if (!rows.length) return { lines: ['Es wurde kein installiertes Paket gefunden, das den Eingabekriterien entspricht.'], code: -1978335212 };
    return out(wgTable(rows.map(p => { const cat = CATALOG.find(x => x.id === p.id); return [p.name, p.id, p.version, cat && cat.version !== p.version ? cat.version : '', p.src]; }), ['Name', 'ID', 'Version', 'Verfügbar', 'Quelle']));
  }
  if (sub === 'show') {
    const q = (query() || '').toLowerCase(); const p = CATALOG.find(x => x.id.toLowerCase() === q || x.name.toLowerCase() === q);
    if (!p) return { lines: ['Es wurde kein Paket gefunden, das den Eingabekriterien entspricht.'], code: -1978335212 };
    return out([`Gefunden ${p.name} [${p.id}]`, `Version: ${p.version}`, `Herausgeber: ${p.pub}`, 'Lizenz: siehe Herausgeber', 'Installationsprogramm:', '  Installertyp: exe', `  Installer-URL: ${p.url}`]);
  }
  if (sub === 'install' || sub === 'add') {
    const e = needNet(); if (e) return e;
    if (!(await agree())) return { lines: ['Eine oder mehrere Quellvereinbarungen wurden nicht akzeptiert. Der Vorgang wurde abgebrochen.'], code: -1978335150 };
    const q = (query() || '').toLowerCase();
    if (!q) return { lines: ['Erforderliches Argument fehlt: query'], code: -1978335230 };
    const exact = flag('-e') || flag('--exact');
    let m = CATALOG.filter(p => p.id.toLowerCase() === q || p.name.toLowerCase() === q);
    if (!m.length && !exact) m = CATALOG.filter(p => p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
    if (!m.length) return { lines: ['Es wurde kein Paket gefunden, das den Eingabekriterien entspricht.'], code: -1978335212 };
    if (m.length > 1) return { lines: ['Mehrere Pakete gefunden, die den Eingabekriterien entsprechen. Verfeinern Sie die Eingabe.'].concat(wgTable(m.map(p => [p.name, p.id, 'winget']), ['Name', 'ID', 'Quelle'])), code: -1978335210 };
    const p = m[0];
    if (installed.some(x => x.id === p.id)) return out(['Es wurde ein vorhandenes Paket bereits installiert. Es wird versucht, das installierte Paket zu aktualisieren...', 'Kein verfügbares Upgrade gefunden.', 'Für die konfigurierten Quellen sind keine neueren Paketversionen verfügbar.']);
    const lines = [`Gefunden ${p.name} [${p.id}] Version ${p.version}`, 'Diese Anwendung wird von ihrem Besitzer an Sie lizenziert.', 'Microsoft ist nicht verantwortlich und erteilt keine Lizenzen für Pakete von Drittanbietern.', `Herunterladen von ${p.url}`, `  ██████████████████████████████  ${p.size} / ${p.size}`, 'Der Installer-Hash wurde erfolgreich überprüft', 'Paketinstallation wird gestartet...'];
    for (const l of lines) c.host.write(l);
    if (!c.session.elevated && !c.session.remoteOrigin) {
      const ok = c.host.uacConsent ? await c.host.uacConsent(p.name + ' Setup', p.pub) : true;
      if (!ok) return { lines: ['Installationsfehler mit Exitcode: 1602', 'Der Installationsvorgang wurde vom Benutzer abgebrochen.'], code: -1978335215 };
    }
    installed.push({ id: p.id, name: p.name, version: p.version });
    if (c.log) (c.log.winget = c.log.winget || []).push({ op: 'install', id: p.id });
    return out(['Erfolgreich installiert']);
  }
  if (sub === 'upgrade' || sub === 'update') {
    const e = needNet(); if (e) return e;
    const up = installed.filter(p => { const cat = CATALOG.find(x => x.id === p.id); return cat && cat.version !== p.version; });
    if (flag('--all') || flag('-r') || query()) {
      const q = (query() || '').toLowerCase();
      const targets = flag('--all') ? up : up.filter(p => p.id.toLowerCase() === q || p.name.toLowerCase() === q);
      if (!targets.length) return out(['Kein verfügbares Upgrade gefunden.', 'Für die konfigurierten Quellen sind keine neueren Paketversionen verfügbar.']);
      if (!(await agree())) return { lines: ['Eine oder mehrere Quellvereinbarungen wurden nicht akzeptiert.'], code: -1978335150 };
      const lines = [];
      targets.forEach((p, k) => { const cat = CATALOG.find(x => x.id === p.id); lines.push(`(${k + 1}/${targets.length}) Gefunden ${cat.name} [${cat.id}] Version ${cat.version}`, `Herunterladen von ${cat.url}`, `  ██████████████████████████████  ${cat.size} / ${cat.size}`, 'Der Installer-Hash wurde erfolgreich überprüft', 'Paketinstallation wird gestartet...', 'Erfolgreich installiert', ''); p.version = cat.version; });
      if (c.log) (c.log.winget = c.log.winget || []).push({ op: 'upgrade', ids: targets.map(t => t.id) });
      return out(lines);
    }
    if (!up.length) return out(['Kein verfügbares Upgrade gefunden.', 'Für die konfigurierten Quellen sind keine neueren Paketversionen verfügbar.']);
    return out(wgTable(up.map(p => [p.name, p.id, p.version, CATALOG.find(x => x.id === p.id).version, 'winget']), ['Name', 'ID', 'Version', 'Verfügbar', 'Quelle']).concat([`${up.length} Upgrades verfügbar.`]));
  }
  if (sub === 'uninstall' || sub === 'remove' || sub === 'rm') {
    const q = (query() || '').toLowerCase();
    const p = installed.find(x => x.id.toLowerCase() === q || x.name.toLowerCase() === q) || installed.find(x => x.id.toLowerCase().includes(q));
    if (!p) return { lines: ['Es wurde kein installiertes Paket gefunden, das den Eingabekriterien entspricht.'], code: -1978335212 };
    installed.splice(installed.indexOf(p), 1);
    if (c.log) (c.log.winget = c.log.winget || []).push({ op: 'uninstall', id: p.id });
    return out([`Gefunden ${p.name} [${p.id}]`, 'Paketdeinstallation wird gestartet...', 'Erfolgreich deinstalliert']);
  }
  if (sub === 'source') return out(wgTable([['msstore', 'https://storeedgefd.dsx.mp.microsoft.com/v9.0'], ['winget', 'https://cdn.winget.microsoft.com/cache']], ['Name', 'Argument']));
  return { lines: [`Unbekannter Befehl: ${args[0]}`, '', 'Geben Sie "winget --help" ein, um die verfügbaren Befehle anzuzeigen.'], code: -1978335230 };
};

NT.gpupdate = (c) => out(['Die Richtlinie wird aktualisiert...', '', 'Die Aktualisierung der Computerrichtlinie wurde erfolgreich abgeschlossen.', 'Die Aktualisierung der Benutzerrichtlinie wurde erfolgreich abgeschlossen.', '']);
NT.systeminfo = (c) => {
  const w = c.world;
  return out(['', `Hostname:                                       ${w.hostname}`, `Betriebssystemname:                             ${w.os}`, `Betriebssystemversion:                          ${w.osVersion} Nicht zutreffend Build ${w.build}`, 'Betriebssystemhersteller:                       Microsoft Corporation', `Betriebssystemkonfiguration:                    ${w.isDomainController ? 'Primärer Domänencontroller' : 'Mitgliedsserver'}`, `Systemstartzeit:                                ${V.fmtDateDE(w.bootTime).replace(' ', ', ')}`, 'Systemhersteller:                               Microsoft Corporation', 'Systemmodell:                                   Virtual Machine', 'Prozessor(en):                                  1 Prozessor(en) installiert.', 'Gesamter physischer Speicher:                   8.191 MB', `Domäne:                                         ${w.domain || 'WORKGROUP'}`, `Anmeldeserver:                                  \\\\${w.dc || w.hostname}`, `Hotfix(es):                                     ${(w.hotfixes || []).length} Hotfix(es) installiert.`].concat((w.hotfixes || []).map((h, i) => `                                                [${String(i + 1).padStart(2, '0')}]: ${h.id}`)));
};
NT.net = (c, args) => {
  const sub = (args[0] || '').toLowerCase();
  if (sub === 'user' && args.length === 1) { const names = c.world.users.map(u => u.name); const lines = ['', `Benutzerkonten für \\\\${c.world.hostname}`, '', '-------------------------------------------------------------------------------']; for (let i = 0; i < names.length; i += 3) lines.push(names.slice(i, i + 3).map(n => n.padEnd(25)).join('').replace(/\s+$/, '')); lines.push('Der Befehl wurde erfolgreich ausgeführt.', ''); return out(lines); }
  if (sub === 'use') { const ds = c.world.persistDrives || []; const lines = ['Neue Verbindungen werden gespeichert.', '', '']; if (!ds.length) lines.push('Es sind keine Einträge in der Liste.'); else { lines.push('Status       Lokal     Remote                    Netzwerk', '', '-------------------------------------------------------------------------------'); for (const d of ds) lines.push(`OK           ${(d.name + ':').padEnd(9)} ${d.root.padEnd(25)} Microsoft Windows Network`); lines.push('Der Befehl wurde erfolgreich ausgeführt.'); } return out(lines); }
  if (sub === 'localgroup' && args[1]) { const g = c.world.groups.find(x => x.name.toLowerCase() === args[1].toLowerCase()); if (!g) return { lines: ['Systemfehler 1376 aufgetreten.', '', 'Die angegebene lokale Gruppe ist nicht vorhanden.'], code: 2 }; return out(['Aliasname     ' + g.name, 'Beschreibung  ' + (g.desc || ''), '', 'Mitglieder', '', '-------------------------------------------------------------------------------'].concat(g.members).concat(['Der Befehl wurde erfolgreich ausgeführt.', ''])); }
  return out(['Die Syntax dieses Befehls lautet:', '', 'NET', '    [ ACCOUNTS | COMPUTER | CONFIG | CONTINUE | FILE | GROUP | HELP |', '      HELPMSG | LOCALGROUP | PAUSE | SESSION | SHARE | START |', '      STATISTICS | STOP | TIME | USE | USER | VIEW ]'], sub ? 0 : 1);
};

})();
