/* Get-Going! – Prozesse, Dienste, Ereignisse, Datenträger, Benutzer, Freigaben, Module */
(function () {
'use strict';
const GG = globalThis.GG = globalThis.GG || {};
const V = GG.v, I = GG.interp, F = GG.fmt, FX = GG.fsx, U = GG.util;
const { PSObject, PSHash, ScriptBlock, PSDate, SecureString, PSRuntimeError, TimeSpan } = GG;
const P = GG.P, def = GG.def;
const M = 'Microsoft.PowerShell.Management';
const ST = n => GG.enumVal('System.ServiceProcess.ServiceControllerStatus', n);
const SM = n => GG.enumVal('System.ServiceProcess.ServiceStartMode', n);

/* =================== Prozesse =================== */
const CRITICAL = ['system', 'idle', 'csrss', 'smss', 'wininit', 'lsass', 'services', 'winlogon', 'registry', 'memory compression'];
GG.procObj = function (pr, world) {
  const o = new PSObject(['System.Diagnostics.Process', 'System.ComponentModel.Component'], null, { ref: pr });
  o.add('Name', pr.name); o.add('SI', pr.si === undefined ? 0 : pr.si);
  o.add('Handles', pr.handles); o.add('VM', pr.ws * 4 + 2199023255552); o.add('WS', pr.ws); o.add('PM', pr.pm || Math.round(pr.ws * 0.8)); o.add('NPM', pr.npm || Math.round(pr.handles * 60));
  o.add('Path', pr.path || null); o.add('Company', pr.company || null); o.add('CPU', pr.cpu); o.add('FileVersion', pr.version || null); o.add('ProductVersion', pr.version || null);
  o.add('Description', pr.desc || null); o.add('Product', pr.product || null);
  o.add('Id', pr.id); o.add('PriorityClass', 'Normal'); o.add('HandleCount', pr.handles); o.add('WorkingSet', pr.ws); o.add('PagedMemorySize', pr.pm || Math.round(pr.ws * 0.8)); o.add('WorkingSet64', pr.ws);
  o.add('ProcessName', pr.name); o.add('Responding', true); o.add('SessionId', pr.si === undefined ? 0 : pr.si); o.add('StartTime', new PSDate(pr.start || world.bootTime)); o.add('Threads', pr.threads || 12);
  o.add('MainWindowTitle', pr.title || ''); o.add('HasExited', null, () => !world.processes.includes(pr)); o.add('MachineName', '.');
  o.toStringFn = () => `System.Diagnostics.Process (${pr.name})`;
  o.methods.kill = function () { const i = world.processes.indexOf(pr); if (i >= 0) world.processes.splice(i, 1); };
  o.methods.refresh = function () { };
  return o;
};
const cpuFmt = o => { const v = o.get('CPU'); return v === null || v === undefined ? '' : V.formatValue(v, 'F2'); };
GG.view('System.Diagnostics.Process', {
  table: [{ l: 'Handles', p: 'Handles', w: 7, a: 'r' }, { l: 'NPM(K)', g: o => Math.round(o.get('NPM') / 1024), w: 7, a: 'r' }, { l: 'PM(K)', g: o => Math.round(o.get('PM') / 1024), w: 8, a: 'r' }, { l: 'WS(K)', g: o => Math.round(o.get('WS') / 1024), w: 10, a: 'r' }, { l: 'CPU(s)', g: cpuFmt, w: 10, a: 'r' }, { l: 'Id', p: 'Id', w: 6, a: 'r' }, { l: 'SI', p: 'SI', w: 3, a: 'r' }, { l: 'ProcessName', p: 'ProcessName' }],
  flist: ['Id', 'Handles', 'CPU', 'SI', 'Name'].map(p => ({ p })), sortKey: 'ProcessName', wideProp: 'ProcessName'
});
GG.view('System.Diagnostics.Process#IncludeUserName', { table: [{ l: 'Handles', p: 'Handles', w: 7, a: 'r' }, { l: 'WS(K)', g: o => Math.round(o.get('WS') / 1024), w: 10, a: 'r' }, { l: 'CPU(s)', g: cpuFmt, w: 10, a: 'r' }, { l: 'Id', p: 'Id', w: 6, a: 'r' }, { l: 'UserName', p: 'UserName', w: 31 }, { l: 'ProcessName', p: 'ProcessName' }] });
function procTarget(c, p) { return p.ComputerName ? GG.netw.remoteWorldOrError(c, p.ComputerName, 'Get-Process') : c.world; }
def({ name: 'Get-Process', module: M, aliases: ['gps', 'ps'], input: 'each',
  params: [P('Name', 'string[]', { pos: 0, pipe: 'prop', aliases: ['ProcessName'] }), P('Id', 'int[]', { pipe: 'prop', aliases: ['PID'] }), P('IncludeUserName', 'switch'), P('ComputerName', 'string', { aliases: ['Cn'] }), P('Module', 'switch'), P('FileVersionInfo', 'switch', { aliases: ['FV', 'FVI'] }), P('InputObject', 'object', { pipe: 'value', pipeType: ['System.Diagnostics.Process'] })],
  run: async (c, p) => {
    const w = procTarget(c, p); if (!w) return;
    if (p.IncludeUserName && !c.session.elevated) return c.error('Der Parameter "IncludeUserName" erfordert erhöhte Benutzerrechte. Führen Sie die Windows PowerShell-Konsole mit der Option "Als Administrator ausführen" aus.', { category: 'InvalidOperation', exception: 'System.InvalidOperationException', fqid: 'IncludeUserNameRequiresElevation' });
    let list = w.processes.slice().sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.id - b.id);
    let res = [];
    if (p.InputObject) res = [p.InputObject.ref].filter(Boolean);
    else if (p.Id) {
      for (const id of p.Id) { const pr = list.find(x => x.id === id); if (!pr) c.error(`Es wurde kein Prozess mit der Prozess-ID ${id} gefunden.`, { category: 'ObjectNotFound', fqid: 'NoProcessFoundForGivenId', exception: 'Microsoft.PowerShell.Commands.ProcessCommandException', target: id, targetType: 'Int32', reason: 'ProcessCommandException' }); else res.push(pr); }
    } else if (p.Name) {
      for (const n of p.Name) {
        const m = list.filter(x => V.like(x.name, n));
        if (!m.length && !V.hasWild(n)) c.error(`Es kann kein Prozess mit dem Namen "${n}" gefunden werden. Überprüfen Sie den Prozessnamen, und rufen Sie das Cmdlet erneut auf.`, { category: 'ObjectNotFound', fqid: 'NoProcessFoundForGivenName', exception: 'Microsoft.PowerShell.Commands.ProcessCommandException', target: n, reason: 'ProcessCommandException' });
        for (const x of m) if (!res.includes(x)) res.push(x);
      }
    } else res = list;
    for (const pr of res) {
      const o = GG.procObj(pr, w);
      if (p.IncludeUserName) { o.typeNames.unshift('System.Diagnostics.Process#IncludeUserName'); o.add('UserName', pr.user ? (pr.user.includes('\\') ? pr.user : (w.domainNetbios || w.hostname) + '\\' + pr.user) : null); }
      if (w !== c.world) o.add('MachineName', w.hostname);
      c.out(o);
    }
  } });
def({ name: 'Stop-Process', module: M, aliases: ['kill', 'spps'], input: 'each', sp: true,
  params: [P('Id', 'int[]', { pos: 0, pipe: 'prop' }), P('Name', 'string[]', { pipe: 'prop', aliases: ['ProcessName'] }), P('InputObject', 'object', { pipe: 'value', pipeType: ['System.Diagnostics.Process'] }), P('Force', 'switch'), P('PassThru', 'switch')],
  run: async (c, p) => {
    const w = c.world;
    let targets = [];
    if (p.InputObject) { targets = [p.InputObject.ref]; }
    else if (p.Id) for (const id of p.Id) { const pr = w.processes.find(x => x.id === id); if (!pr) c.error(`Es wurde kein Prozess mit der Prozess-ID ${id} gefunden.`, { category: 'ObjectNotFound', fqid: 'NoProcessFoundForGivenId', exception: 'Microsoft.PowerShell.Commands.ProcessCommandException', target: id, targetType: 'Int32', reason: 'ProcessCommandException' }); else targets.push(pr); }
    else if (p.Name) for (const n of p.Name) { const m = w.processes.filter(x => V.like(x.name, n)); if (!m.length) c.error(`Es kann kein Prozess mit dem Namen "${n}" gefunden werden. Überprüfen Sie den Prozessnamen, und rufen Sie das Cmdlet erneut auf.`, { category: 'ObjectNotFound', fqid: 'NoProcessFoundForGivenName', exception: 'Microsoft.PowerShell.Commands.ProcessCommandException', target: n, reason: 'ProcessCommandException' }); targets.push(...m); }
    else throw GG.bindErr(c.ctx, 'Stop-Process', 'Der Befehl kann nicht verarbeitet werden, da einer oder mehrere obligatorische Parameter fehlen: Id.', 'MissingMandatoryParameter');
    for (const pr of targets) {
      if (!pr || !w.processes.includes(pr)) continue;
      const label = `${pr.name} (${pr.id})`;
      const own = pr.user && pr.user.toLowerCase().split('\\').pop() === c.session.user.toLowerCase();
      if (!own && !p.Force && !p.WhatIf) {
        if (!(await c.should(label, 'Stop-Process', { high: true }))) continue;
      } else if (!(await c.should(label, 'Stop-Process'))) continue;
      if (CRITICAL.includes(pr.name.toLowerCase()) || (!own && !c.session.elevated && !c.session.remoteOrigin)) {
        c.error(`Der Prozess "${label}" kann aufgrund des folgenden Fehlers nicht beendet werden: Zugriff verweigert`, { category: 'CloseError', exception: 'Microsoft.PowerShell.Commands.ProcessCommandException', fqid: 'CouldNotStopProcess', target: `System.Diagnostics.Process (${pr.name})`, targetType: 'Process', reason: 'ProcessCommandException' });
        continue;
      }
      w.processes.splice(w.processes.indexOf(pr), 1);
      if (pr.onStop) pr.onStop(w);
      if (p.PassThru) c.out(GG.procObj(pr, w));
    }
  } });
GG.knownExe = {
  'notepad': { name: 'notepad', path: 'C:\\Windows\\system32\\notepad.exe', company: 'Microsoft Corporation', ws: 18 * 1048576, handles: 260, desc: 'Notepad' },
  'calc': { name: 'CalculatorApp', path: 'C:\\Program Files\\WindowsApps\\Microsoft.WindowsCalculator\\CalculatorApp.exe', company: 'Microsoft Corporation', ws: 41 * 1048576, handles: 512 },
  'mspaint': { name: 'mspaint', path: 'C:\\Windows\\system32\\mspaint.exe', company: 'Microsoft Corporation', ws: 52 * 1048576, handles: 480 },
  'explorer': { name: 'explorer', path: 'C:\\Windows\\explorer.exe', company: 'Microsoft Corporation', ws: 98 * 1048576, handles: 2300 },
  'cmd': { name: 'cmd', path: 'C:\\Windows\\system32\\cmd.exe', company: 'Microsoft Corporation', ws: 4 * 1048576, handles: 70 },
  'taskmgr': { name: 'Taskmgr', path: 'C:\\Windows\\system32\\taskmgr.exe', company: 'Microsoft Corporation', ws: 38 * 1048576, handles: 600 },
  'servermanager': { name: 'ServerManager', path: 'C:\\Windows\\system32\\ServerManager.exe', company: 'Microsoft Corporation', ws: 120 * 1048576, handles: 900 },
  'mmc': { name: 'mmc', path: 'C:\\Windows\\system32\\mmc.exe', company: 'Microsoft Corporation', ws: 60 * 1048576, handles: 700 }
};
GG.spawnProc = function (w, info, user, si) {
  const pr = Object.assign({ id: w.nextPid, cpu: 0.05, start: new Date(), user, si: si === undefined ? 1 : si, threads: 8, version: '10.0.26100.1' }, info);
  w.nextPid += 4 + Math.floor(Math.random() * 40);
  w.processes.push(pr);
  return pr;
};
def({ name: 'Start-Process', module: M, aliases: ['saps', 'start'], input: 'none',
  params: [P('FilePath', 'string', { pos: 0, mandatory: true, aliases: ['PSPath', 'Path'] }), P('ArgumentList', 'string[]', { pos: 1, aliases: ['Args'] }), P('Verb', 'string'), P('Wait', 'switch'), P('PassThru', 'switch'), P('WindowStyle', 'enum', { values: ['Normal', 'Hidden', 'Minimized', 'Maximized'] }), P('WorkingDirectory', 'string'), P('Credential', 'cred'), P('NoNewWindow', 'switch'), P('LoadUserProfile', 'switch'), P('RedirectStandardOutput', 'string')],
  run: async (c, p) => {
    let fp = p.FilePath.replace(/^"|"$/g, '');
    const base = fp.split(/[\\/]/).pop().toLowerCase().replace(/\.exe$/, '');
    const runas = p.Verb && /^runas$/i.test(p.Verb);
    if (c.session.remoteOrigin && (base === 'powershell' || base === 'notepad' || runas)) {
      if (base === 'powershell' && !runas) { GG.spawnProc(c.world, { name: 'powershell', path: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', ws: 70 * 1048576, handles: 600, company: 'Microsoft Corporation' }, c.session.user, 0); return; }
      return c.error('Dieser Befehl kann in einer Remotesitzung nicht ausgeführt werden: Es steht keine grafische Oberfläche zur Verfügung.', { category: 'InvalidOperation', exception: 'System.InvalidOperationException', fqid: 'InvalidOperationException' });
    }
    if (base === 'powershell' || base === 'pwsh') {
      if (base === 'pwsh' && !(c.world.packages || []).some(x => x.id === 'Microsoft.PowerShell')) return c.error('Dieser Befehl kann aufgrund des folgenden Fehlers nicht ausgeführt werden: Das System kann die angegebene Datei nicht finden.', { category: 'InvalidOperation', exception: 'System.InvalidOperationException', fqid: 'InvalidOperationException', target: '', reason: 'InvalidOperationException' });
      if (runas) {
        const ok = await c.host.elevate(c.session);
        if (!ok) return c.error('Dieser Befehl kann aufgrund des folgenden Fehlers nicht ausgeführt werden: Der Vorgang wurde durch den Benutzer abgebrochen.', { category: 'InvalidOperation', exception: 'System.InvalidOperationException', fqid: 'InvalidOperationException', target: '', reason: 'InvalidOperationException' });
        if (c.log) c.log.elevate = true;
        return;
      }
      if (c.host.newTab) c.host.newTab(c.session, false);
      return;
    }
    if (base === 'notepad') {
      const file = p.ArgumentList && p.ArgumentList.length ? p.ArgumentList.join(' ') : null;
      if (c.host.openNotepad) c.host.openNotepad(c.ctx, file);
      GG.spawnProc(c.world, GG.knownExe.notepad, c.session.user);
      return;
    }
    const k = GG.knownExe[base];
    if (k) { const pr = GG.spawnProc(c.world, k, c.session.user); if (p.PassThru) c.out(GG.procObj(pr, c.world)); return; }
    const r = GG.fsx.resolveFile(c.ctx, fp);
    if (r && r.node && !r.node.dir) {
      if (/\.ps1$/i.test(r.node.name)) { if (c.host.openNotepad) c.host.openNotepad(c.ctx, r.path); return; }
      if (/\.(txt|log|csv|ini|cfg|md)$/i.test(r.node.name)) { if (c.host.openNotepad) c.host.openNotepad(c.ctx, r.path); return; }
      const pr = GG.spawnProc(c.world, { name: r.node.name.replace(/\.exe$/i, ''), path: r.path, ws: 25 * 1048576, handles: 200 }, c.session.user);
      if (p.PassThru) c.out(GG.procObj(pr, c.world));
      return;
    }
    c.error('Dieser Befehl kann aufgrund des folgenden Fehlers nicht ausgeführt werden: Das System kann die angegebene Datei nicht finden.', { category: 'InvalidOperation', exception: 'System.InvalidOperationException', fqid: 'InvalidOperationException', target: '', reason: 'InvalidOperationException' });
  } });
def({ name: 'Wait-Process', module: M, input: 'each', params: [P('Name', 'string[]', { pos: 0 }), P('Id', 'int[]'), P('Timeout', 'int')], run: async () => { } });

/* =================== Dienste =================== */
GG.svcObj = function (s, world) {
  const o = new PSObject(['System.ServiceProcess.ServiceController', 'System.ComponentModel.Component'], null, { ref: s });
  o.world = world;
  const find = n => world.services.find(x => x.name.toLowerCase() === n.toLowerCase());
  o.add('Name', s.name);
  o.add('RequiredServices', null, () => (s.deps || []).map(find).filter(Boolean).map(x => GG.svcObj(x, world)));
  o.add('CanPauseAndContinue', false); o.add('CanShutdown', s.status === 'Running'); o.add('CanStop', null, () => s.status === 'Running' && s.canStop !== false);
  o.add('DisplayName', s.display);
  o.add('DependentServices', null, () => world.services.filter(x => (x.deps || []).some(d => d.toLowerCase() === s.name.toLowerCase())).map(x => GG.svcObj(x, world)));
  o.add('MachineName', world.__remoteName || '.');
  o.add('ServiceName', s.name);
  o.add('ServicesDependedOn', null, () => (s.deps || []).map(find).filter(Boolean).map(x => GG.svcObj(x, world)));
  o.add('ServiceHandle', null);
  o.add('Status', null, () => ST(s.status));
  o.add('ServiceType', s.type || 'Win32OwnProcess');
  o.add('StartType', null, () => SM(s.start));
  o.add('Site', null); o.add('Container', null);
  o.toStringFn = () => 'System.ServiceProcess.ServiceController';
  o.sortKey = undefined;
  o.methods.stop = async function (args, ctx) { await GG.svcStop(ctx, s, world, { force: false, fromMethod: true }); };
  o.methods.start = async function (args, ctx) { await GG.svcStart(ctx, s, world, { fromMethod: true }); };
  o.methods.refresh = function () { };
  o.methods.waitforstatus = function () { };
  return o;
};
GG.view('System.ServiceProcess.ServiceController', { table: [{ l: 'Status', p: 'Status', w: 8 }, { l: 'Name', p: 'Name', w: 18 }, { l: 'DisplayName', p: 'DisplayName' }], flist: ['Name', 'DisplayName', 'Status', 'DependentServices', 'ServicesDependedOn', 'CanPauseAndContinue', 'CanShutdown', 'CanStop', 'ServiceType'].map(p => ({ p })), sortKey: 'Name', wideProp: 'Name' });
const SVC_EXC = 'Microsoft.PowerShell.Commands.ServiceCommandException';
GG.svcEvent = function (world, s, text, id, level) {
  GG.addEvent(world, 'System', { level: level || 'Information', source: 'Service Control Manager', id: id || 7036, msg: text });
};
GG.addEvent = function (world, log, e) {
  const L = world.events[log] = world.events[log] || [];
  const idx = (L.length ? Math.max(...L.map(x => x.index)) : 1000) + 1;
  L.push(Object.assign({ index: idx, time: new Date(), user: null, category: '(0)' }, e));
};
const STATUS_DE = { Running: 'Wird ausgeführt', Stopped: 'Beendet', Paused: 'Angehalten' };
const START_DE = { Automatic: 'Automatisch starten', Manual: 'Manuell starten', Disabled: 'Deaktiviert' };
GG.svcStop = async function (ctx, s, world, o) {
  const label = `${s.display} (${s.name})`;
  const err = (msg, cat, fqid) => {
    const r = new GG.ErrorRecord({ message: msg, category: cat || 'CloseError', exception: SVC_EXC, fqid: fqid + ',Microsoft.PowerShell.Commands.' + (o.cmd || 'StopService') + 'Command', target: 'System.ServiceProcess.ServiceController', targetType: 'ServiceController', cmd: o.cmdName || 'Stop-Service', pos: GG.posOf(ctx.cmdNode), reason: 'ServiceCommandException' });
    if (o.fromMethod) throw GG.methodExc('Stop', 0, `Der Dienst "${s.name}" kann auf dem Computer "." nicht beendet werden.`, 'InvalidOperationException');
    o.c ? (o.c.errCount++, o.c.log && (o.c.log.ok = false), I.writeError(r, ctx, o.c.p && o.c.p.ErrorAction)) : I.writeError(r, ctx);
    return false;
  };
  if (s.status === 'Stopped') return true;
  if (!ctx.session.elevated && !ctx.session.remoteOrigin && world === ctx.session.world) return err(`Der Dienst "${label}" kann nicht beendet werden, da er auf dem Computer "." nicht geöffnet werden kann.`, 'CloseError', 'CouldNotStopService');
  if (s.canStop === false) return err(`Der Dienst "${label}" kann aufgrund des folgenden Fehlers nicht beendet werden: Der angeforderte Steuerbefehl ist für diesen Dienst nicht gültig.`, 'CloseError', 'CouldNotStopService');
  const dependents = world.services.filter(x => x.status === 'Running' && (x.deps || []).some(d => d.toLowerCase() === s.name.toLowerCase()));
  if (dependents.length && !o.force) return err(`Der Dienst "${label}" kann nicht beendet werden, da andere Dienste von ihm abhängig sind. Er kann nur beendet werden, wenn das Force-Flag festgelegt wurde.`, 'InvalidOperation', 'ServiceHasDependentServices');
  for (const d of dependents) { d.status = 'Stopped'; GG.svcEvent(world, d, `Der Dienst "${d.display}" befindet sich jetzt im Status "Beendet".`); }
  s.status = 'Stopped';
  if (s.onStop) s.onStop(world);
  GG.svcEvent(world, s, `Der Dienst "${s.display}" befindet sich jetzt im Status "Beendet".`);
  return true;
};
GG.svcStart = async function (ctx, s, world, o) {
  const label = `${s.display} (${s.name})`;
  const err = (msg, fqid) => {
    if (o.fromMethod) throw GG.methodExc('Start', 0, `Der Dienst "${s.name}" kann auf dem Computer "." nicht gestartet werden.`, 'InvalidOperationException');
    const r = new GG.ErrorRecord({ message: msg, category: 'OpenError', exception: SVC_EXC, fqid: fqid + ',Microsoft.PowerShell.Commands.' + (o.cmd || 'StartService') + 'Command', target: 'System.ServiceProcess.ServiceController', targetType: 'ServiceController', cmd: o.cmdName || 'Start-Service', pos: GG.posOf(ctx.cmdNode), reason: 'ServiceCommandException' });
    o.c ? (o.c.errCount++, o.c.log && (o.c.log.ok = false), I.writeError(r, ctx, o.c.p && o.c.p.ErrorAction)) : I.writeError(r, ctx);
    return false;
  };
  if (s.status === 'Running') return true;
  if (!ctx.session.elevated && !ctx.session.remoteOrigin && world === ctx.session.world) return err(`Der Dienst "${label}" kann nicht gestartet werden, da er auf dem Computer "." nicht geöffnet werden kann.`, 'CouldNotStartService');
  if (s.start === 'Disabled') return err(`Der Dienst "${label}" kann aufgrund des folgenden Fehlers nicht gestartet werden: Der Dienst kann nicht gestartet werden, entweder weil er deaktiviert ist oder weil ihm keine aktivierten Geräte zugeordnet sind.`, 'CouldNotStartService');
  for (const dn of s.deps || []) {
    const d = world.services.find(x => x.name.toLowerCase() === dn.toLowerCase());
    if (d && d.status !== 'Running') { if (!(await GG.svcStart(ctx, d, world, o))) return false; }
  }
  if (s.failStart) {
    const why = typeof s.failStart === 'function' ? s.failStart(world) : s.failStart;
    if (why) {
      GG.addEvent(world, 'System', { level: 'Error', source: 'Service Control Manager', id: 7000, msg: `Der Dienst "${s.display}" wurde aufgrund folgenden Fehlers nicht gestartet: \n${why}` });
      return err(`Der Dienst "${label}" kann aufgrund des folgenden Fehlers nicht gestartet werden: ${why}`, 'CouldNotStartService');
    }
  }
  s.status = 'Running';
  if (s.onStart) s.onStart(world);
  GG.svcEvent(world, s, `Der Dienst "${s.display}" befindet sich jetzt im Status "Wird ausgeführt".`);
  return true;
};
function svcTargets(c, p, w, cmdName) {
  if (p.InputObject) return [p.InputObject.ref || w.services.find(x => x.name.toLowerCase() === V.toStr(p.InputObject.get('Name')).toLowerCase())].filter(Boolean);
  const res = [];
  if (p.DisplayName) { for (const n of p.DisplayName) { const m = w.services.filter(x => V.like(x.display, n)); if (!m.length && !V.hasWild(n)) c.error(`Es kann kein Dienst mit dem Anzeigenamen "${n}" gefunden werden.`, { category: 'ObjectNotFound', exception: SVC_EXC, fqid: 'NoServiceFoundForGivenDisplayName', target: n, reason: 'ServiceCommandException' }); res.push(...m); } return res; }
  for (const n of V.toArr(p.Name)) {
    const m = w.services.filter(x => V.like(x.name, n) || (!V.hasWild(n) && x.display.toLowerCase() === n.toLowerCase()));
    if (!m.length && !V.hasWild(n)) c.error(`Es kann kein Dienst mit dem Dienstnamen "${n}" gefunden werden.`, { category: 'ObjectNotFound', exception: SVC_EXC, fqid: 'NoServiceFoundForGivenName', target: n, reason: 'ServiceCommandException' });
    for (const x of m) if (!res.includes(x)) res.push(x);
  }
  return res;
}
def({ name: 'Get-Service', module: M, aliases: ['gsv'], input: 'each',
  params: [P('Name', 'string[]', { pos: 0, pipe: 'both', aliases: ['ServiceName'] }), P('DisplayName', 'string[]'), P('Include', 'string[]'), P('Exclude', 'string[]'), P('DependentServices', 'switch', { aliases: ['DS'] }), P('RequiredServices', 'switch', { aliases: ['SDO', 'ServicesDependedOn'] }), P('ComputerName', 'string[]', { aliases: ['Cn'] }), P('InputObject', 'object', { pipe: 'value', pipeType: ['System.ServiceProcess.ServiceController'] })],
  run: async (c, p) => {
    const worlds = p.ComputerName ? p.ComputerName.map(n => GG.netw.remoteWorldOrError(c, n, 'Get-Service')).filter(Boolean) : [c.world];
    for (const w of worlds) {
      let list = (p.Name || p.DisplayName || p.InputObject) ? svcTargets(c, p, w) : w.services.slice();
      list.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      if (p.Include) list = list.filter(s => p.Include.some(x => V.like(s.name, x)));
      if (p.Exclude) list = list.filter(s => !p.Exclude.some(x => V.like(s.name, x)));
      if (p.DependentServices) list = [].concat(...list.map(s => w.services.filter(x => (x.deps || []).some(d => d.toLowerCase() === s.name.toLowerCase()))));
      if (p.RequiredServices) list = [].concat(...list.map(s => (s.deps || []).map(d => w.services.find(x => x.name.toLowerCase() === d.toLowerCase())).filter(Boolean)));
      for (const s of list) { const o = GG.svcObj(s, w); if (w !== c.world) o.set('MachineName', w.hostname); c.out(o); }
    }
  } });
const svcParams = [P('Name', 'string[]', { pos: 0, pipe: 'both', aliases: ['ServiceName'] }), P('DisplayName', 'string[]'), P('InputObject', 'object', { pipe: 'value', pipeType: ['System.ServiceProcess.ServiceController'] }), P('Force', 'switch'), P('PassThru', 'switch'), P('NoWait', 'switch'), P('Include', 'string[]'), P('Exclude', 'string[]')];
for (const [nm, al, act] of [['Start-Service', ['sasv'], 'start'], ['Stop-Service', ['spsv'], 'stop'], ['Restart-Service', [], 'restart'], ['Suspend-Service', [], 'suspend'], ['Resume-Service', [], 'resume']]) {
  def({ name: nm, module: M, aliases: al, input: 'each', sp: true, params: svcParams,
    run: async (c, p) => {
      const w = (p.InputObject && p.InputObject.world) || c.world;
      if (!p.Name && !p.DisplayName && !p.InputObject) throw GG.bindErr(c.ctx, nm, 'Der Befehl kann nicht verarbeitet werden, da einer oder mehrere obligatorische Parameter fehlen: Name.', 'MissingMandatoryParameter');
      const list = svcTargets(c, p, w);
      const cls = nm.replace('-', '');
      for (const s of list) {
        if (!(await c.should(`${s.display} (${s.name})`, nm))) continue;
        const o = { force: p.Force, c, cmd: cls, cmdName: nm };
        if (act === 'start') await GG.svcStart(c.ctx, s, w, o);
        else if (act === 'stop') await GG.svcStop(c.ctx, s, w, o);
        else if (act === 'restart') { if (s.status === 'Running' && !(await GG.svcStop(c.ctx, s, w, o))) continue; await GG.svcStart(c.ctx, s, w, o); if (c.log) c.log.restarted = (c.log.restarted || []).concat([s.name]); }
        else { if (!c.session.elevated) c.error(`Der Dienst "${s.display} (${s.name})" kann nicht angehalten werden, da er auf dem Computer "." nicht geöffnet werden kann.`, { category: 'CloseError', exception: SVC_EXC, fqid: 'CouldNotSuspendService' }); else c.error(`Der Dienst "${s.display} (${s.name})" kann nicht angehalten werden, da er das Anhalten nicht unterstützt.`, { category: 'CloseError', exception: SVC_EXC, fqid: 'CouldNotSuspendServiceNotSupported' }); }
        if (p.PassThru) c.out(GG.svcObj(s, w));
      }
    } });
}
def({ name: 'Set-Service', module: M, input: 'each', sp: true,
  params: [P('Name', 'string', { pos: 0, pipe: 'both', aliases: ['ServiceName', 'SN'] }), P('InputObject', 'object', { pipe: 'value', pipeType: ['System.ServiceProcess.ServiceController'] }), P('DisplayName', 'string'), P('Description', 'string'), P('StartupType', 'enum', { values: ['Boot', 'System', 'Automatic', 'Manual', 'Disabled'], enumType: 'System.ServiceProcess.ServiceStartMode', aliases: ['StartMode', 'SM', 'ST'] }), P('Status', 'enum', { values: ['Running', 'Stopped', 'Paused'] }), P('ComputerName', 'string[]', { aliases: ['cn'] }), P('PassThru', 'switch')],
  run: async (c, p) => {
    let w = c.world;
    if (p.ComputerName && !p.InputObject) { w = GG.netw.remoteWorldOrError(c, p.ComputerName[0], 'Set-Service'); if (!w) return; }
    if (p.InputObject && p.InputObject.world) w = p.InputObject.world;
    let s = p.InputObject ? p.InputObject.ref : w.services.find(x => x.name.toLowerCase() === V.toStr(p.Name).toLowerCase() || x.display.toLowerCase() === V.toStr(p.Name).toLowerCase());
    if (!s) return c.error(`Der Dienst "${p.Name}" wurde auf dem Computer "." nicht gefunden.`, { category: 'ObjectNotFound', exception: SVC_EXC, fqid: 'CouldNotSetService', target: p.Name, reason: 'ServiceCommandException' });
    const label = `${s.display} (${s.name})`;
    if (!(await c.should(label, 'Set-Service'))) return;
    if (!c.session.elevated && !c.session.remoteOrigin && w === c.world) return c.error(`Der Dienst "${label}" kann aufgrund des folgenden Fehlers nicht konfiguriert werden: Zugriff verweigert`, { category: 'PermissionDenied', exception: SVC_EXC, fqid: 'CouldNotSetService', target: 'System.ServiceProcess.ServiceController', targetType: 'ServiceController', reason: 'ServiceCommandException' });
    if (p.DisplayName) s.display = p.DisplayName;
    if (p.Description !== undefined) s.desc = p.Description;
    if (p.StartupType && p.StartupType !== s.start) {
      if (p.StartupType === 'Boot' || p.StartupType === 'System') return c.error(`Der Dienst "${label}" kann aufgrund des folgenden Fehlers nicht konfiguriert werden: Der Parameter ist falsch`, { category: 'PermissionDenied', exception: SVC_EXC, fqid: 'CouldNotSetService' });
      GG.addEvent(w, 'System', { level: 'Information', source: 'Service Control Manager', id: 7040, msg: `Der Starttyp des Diensts "${s.display}" wurde von "${START_DE[s.start]}" in "${START_DE[p.StartupType]}" geändert.` });
      s.start = p.StartupType;
    }
    if (p.Status === 'Running') await GG.svcStart(c.ctx, s, w, { c, cmd: 'SetService', cmdName: 'Set-Service' });
    if (p.Status === 'Stopped') await GG.svcStop(c.ctx, s, w, { c, cmd: 'SetService', cmdName: 'Set-Service' });
    if (p.PassThru) c.out(GG.svcObj(s, w));
  } });
def({ name: 'New-Service', module: M, input: 'none', sp: true, params: [P('Name', 'string', { pos: 0, mandatory: true }), P('BinaryPathName', 'string', { pos: 1, mandatory: true }), P('DisplayName', 'string'), P('Description', 'string'), P('StartupType', 'enum', { values: ['Automatic', 'Manual', 'Disabled'] }), P('Credential', 'cred'), P('DependsOn', 'string[]')],
  run: async (c, p) => {
    if (!c.session.elevated && !c.session.remoteOrigin) return c.error(`Der Dienst "${p.Name}" kann aufgrund des folgenden Fehlers nicht erstellt werden: Zugriff verweigert`, { category: 'PermissionDenied', exception: SVC_EXC, fqid: 'CouldNotNewService' });
    if (c.world.services.some(x => x.name.toLowerCase() === p.Name.toLowerCase())) return c.error(`Der Dienst "${p.Name}" kann aufgrund des folgenden Fehlers nicht erstellt werden: Der angegebene Dienst ist bereits vorhanden.`, { category: 'PermissionDenied', exception: SVC_EXC, fqid: 'CouldNotNewService' });
    const s = { name: p.Name, display: p.DisplayName || p.Name, status: 'Stopped', start: p.StartupType || 'Automatic', path: p.BinaryPathName, desc: p.Description || '', deps: p.DependsOn || [] };
    c.world.services.push(s);
    c.out(GG.svcObj(s, c.world));
  } });

/* =================== Ereignisse =================== */
const ETYPE = n => GG.enumVal('System.Diagnostics.EventLogEntryType', n === 'Critical' ? 'Error' : n);
GG.evObj = function (e, log, world) {
  const iid = e.level === 'Error' || e.level === 'Critical' ? 3221225472 + e.id : (e.level === 'Warning' ? 2147483648 + e.id : e.id);
  const o = new PSObject(['System.Diagnostics.EventLogEntry', 'System.ComponentModel.Component'], {
    EventID: e.id, MachineName: world.hostname + (world.domain ? '.' + world.domain : ''), Data: [], Index: e.index, Category: e.category || '(0)', CategoryNumber: 0, EntryType: ETYPE(e.level),
    Message: e.msg, Source: e.source, ReplacementStrings: [], InstanceId: iid, TimeGenerated: new PSDate(e.time), TimeWritten: new PSDate(e.time), UserName: e.user || null, Site: null, Container: null
  });
  o.toStringFn = () => 'System.Diagnostics.EventLogEntry';
  return o;
};
GG.view('System.Diagnostics.EventLogEntry', { table: [{ l: 'Index', p: 'Index', w: 8, a: 'r' }, { l: 'Time', g: o => V.fmtMon(o.get('TimeGenerated').d), w: 13 }, { l: 'EntryType', p: 'EntryType', w: 11 }, { l: 'Source', p: 'Source', w: 20 }, { l: 'InstanceID', p: 'InstanceId', w: 12, a: 'r' }, { l: 'Message', g: o => V.toStr(o.get('Message')).replace(/\s+/g, ' ') }], flist: ['Index', 'EntryType', 'InstanceId', 'Message', 'Category', 'CategoryNumber', 'ReplacementStrings', 'Source', 'TimeGenerated', 'TimeWritten', 'UserName'].map(p => ({ p })) });
GG.view('System.Diagnostics.EventLog', { table: [{ l: 'Max(K)', g: o => V.formatValue(o.get('MaximumKilobytes'), 'N0'), w: 8, a: 'r' }, { l: 'Retain', p: 'MinimumRetentionDays', w: 6, a: 'r' }, { l: 'OverflowAction', p: 'OverflowAction', w: 18 }, { l: 'Entries', g: o => V.formatValue(o.get('Entries'), 'N0'), w: 10, a: 'r' }, { l: 'Log', p: 'Log' }] });
const LEVELDE = { Critical: 'Kritisch', Error: 'Fehler', Warning: 'Warnung', Information: 'Informationen' };
const LEVELNUM = { Critical: 1, Error: 2, Warning: 3, Information: 4 };
GG.winEvObj = function (e, log, world) {
  const o = new PSObject('System.Diagnostics.Eventing.Reader.EventLogRecord', {
    Message: e.msg, Id: e.id, Version: 0, Qualifiers: null, Level: LEVELNUM[e.level] || 4, Task: 0, Opcode: 0, Keywords: '-9187343239835811840', RecordId: e.index,
    ProviderName: e.source, ProviderId: null, LogName: log, ProcessId: 720, ThreadId: 2312, MachineName: world.hostname + (world.domain ? '.' + world.domain : ''), UserId: e.user ? 'S-1-5-21-' + e.user : null,
    TimeCreated: new PSDate(e.time), ActivityId: null, RelatedActivityId: null, ContainerLog: log, LevelDisplayName: LEVELDE[e.level] || 'Informationen', OpcodeDisplayName: 'Info', TaskDisplayName: null
  });
  o.toStringFn = () => 'System.Diagnostics.Eventing.Reader.EventLogRecord';
  return o;
};
GG.view('System.Diagnostics.Eventing.Reader.EventLogRecord', { group: { label: 'ProviderName', g: o => o.get('ProviderName') }, table: [{ l: 'TimeCreated', g: o => V.fmtDateDE(o.get('TimeCreated').d), w: 26 }, { l: 'Id', p: 'Id', w: 6, a: 'r' }, { l: 'LevelDisplayName', p: 'LevelDisplayName', w: 16 }, { l: 'Message', g: o => V.toStr(o.get('Message')).replace(/\s+/g, ' ') }], flist: ['TimeCreated', 'ProviderName', 'Id', 'Message'].map(p => ({ p })) });
GG.view('System.Diagnostics.Eventing.Reader.EventLogConfiguration', { table: [{ l: 'LogMode', p: 'LogMode', w: 9 }, { l: 'MaximumSizeInBytes', p: 'MaximumSizeInBytes', w: 18, a: 'r' }, { l: 'RecordCount', p: 'RecordCount', w: 11, a: 'r' }, { l: 'LogName', p: 'LogName' }] });
function evLogFor(c, name) {
  const w = c.world;
  const key = Object.keys(w.events).find(k => k.toLowerCase() === name.toLowerCase());
  return key;
}
def({ name: 'Get-EventLog', module: M, input: 'none',
  params: [P('LogName', 'string', { pos: 0, aliases: ['LN'] }), P('Newest', 'int'), P('EntryType', 'enum[]', { values: ['Error', 'Information', 'FailureAudit', 'SuccessAudit', 'Warning'], aliases: ['ET'] }), P('Source', 'string[]', { aliases: ['ABO'] }), P('After', 'date'), P('Before', 'date'), P('Message', 'string', { aliases: ['MSG'] }), P('InstanceId', 'long[]', { pos: 1 }), P('Index', 'int[]'), P('UserName', 'string[]'), P('List', 'switch'), P('ComputerName', 'string[]', { aliases: ['Cn'] }), P('AsString', 'switch')],
  run: async (c, p) => {
    const w = p.ComputerName ? GG.netw.remoteWorldOrError(c, p.ComputerName[0], 'Get-EventLog') : c.world; if (!w) return;
    const cw = Object.assign({}, c, { world: w });
    if (p.List) {
      for (const k of ['Application', 'HardwareEvents', 'Internet Explorer', 'Key Management Service', 'Security', 'System', 'Windows PowerShell']) c.out(new PSObject('System.Diagnostics.EventLog', { Entries: (w.events[k] || []).length + (k === 'Security' ? 4211 : 0), Log: k, MaximumKilobytes: k === 'Security' ? 131072 : 20480, MinimumRetentionDays: 0, OverflowAction: 'OverwriteAsNeeded' }));
      return;
    }
    if (!p.LogName) throw GG.bindErr(c.ctx, 'Get-EventLog', 'Der Befehl kann nicht verarbeitet werden, da einer oder mehrere obligatorische Parameter fehlen: LogName.', 'MissingMandatoryParameter');
    const key = evLogFor(cw, p.LogName);
    if (!key) return c.error(`Das Ereignisprotokoll "${p.LogName}" auf dem Computer "." ist nicht vorhanden.`, { category: 'InvalidOperation', exception: 'System.InvalidOperationException', fqid: 'System.InvalidOperationException', target: '', reason: 'InvalidOperationException' });
    if (key === 'Security' && !c.session.elevated && !c.session.remoteOrigin) return c.error('Der angeforderte Registrierungszugriff ist unzulässig.', { category: 'NotSpecified', exception: 'System.Security.SecurityException', fqid: 'System.Security.SecurityException', target: '', reason: 'SecurityException' });
    let list = w.events[key].slice().sort((a, b) => b.index - a.index);
    if (p.EntryType) list = list.filter(e => p.EntryType.includes(e.level === 'Critical' ? 'Error' : e.level));
    if (p.Source) list = list.filter(e => p.Source.some(s => V.like(e.source, s)));
    if (p.After) list = list.filter(e => e.time > p.After.d);
    if (p.Before) list = list.filter(e => e.time < p.Before.d);
    if (p.Message) list = list.filter(e => V.like(e.msg, p.Message));
    if (p.InstanceId) list = list.filter(e => p.InstanceId.some(x => x === e.id || x === GG.evObj(e, key, w).get('InstanceId')));
    if (p.Index) list = list.filter(e => p.Index.includes(e.index));
    if (p.Newest) list = list.slice(0, p.Newest);
    if (!list.length) return c.error('Es wurden keine Übereinstimmungen gefunden.', { category: 'ObjectNotFound', exception: 'System.ArgumentException', fqid: 'GetEventLogNoEntriesFound', target: '', reason: 'ArgumentException' });
    c.outAll(list.map(e => { const o = GG.evObj(e, key, w); if (p.AsString) return V.toStr(o); return o; }));
  } });
def({ name: 'Get-WinEvent', module: 'Microsoft.PowerShell.Diagnostics', input: 'none',
  params: [P('LogName', 'string[]', { pos: 0 }), P('MaxEvents', 'long'), P('FilterHashtable', 'hash[]'), P('ListLog', 'string[]'), P('ProviderName', 'string[]'), P('Oldest', 'switch'), P('ComputerName', 'string', { aliases: ['Cn'] }), P('FilterXPath', 'string')],
  run: async (c, p) => {
    const w = p.ComputerName ? GG.netw.remoteWorldOrError(c, p.ComputerName, 'Get-WinEvent') : c.world; if (!w) return;
    if (p.ListLog) {
      for (const k of Object.keys(w.events)) if (p.ListLog.some(x => V.like(k, x))) c.out(new PSObject('System.Diagnostics.Eventing.Reader.EventLogConfiguration', { LogMode: 'Circular', MaximumSizeInBytes: 20971520, RecordCount: w.events[k].length, LogName: k }));
      return;
    }
    let filters = [];
    if (p.FilterHashtable) {
      for (const h of p.FilterHashtable) {
        const get = k => { const kk = h.keys().find(x => x.toLowerCase() === k.toLowerCase()); return kk ? h.get(kk) : undefined; };
        const unknown = h.keys().find(k => !['logname', 'level', 'id', 'providername', 'starttime', 'endtime', 'keywords', 'userid', 'data'].includes(k.toLowerCase()));
        if (unknown) return c.error(`Der Schlüssel "${unknown}" ist kein gültiger Schlüssel für eine Filterhashtabelle.`, { category: 'InvalidArgument', fqid: 'InvalidHashtableKey' });
        filters.push({ logs: get('LogName') !== undefined ? V.toArr(get('LogName')).map(V.toStr) : null, level: get('Level') !== undefined ? V.toArr(get('Level')).map(V.toInt) : null, id: get('Id') !== undefined ? V.toArr(get('Id')).map(V.toInt) : null, prov: get('ProviderName') !== undefined ? V.toArr(get('ProviderName')).map(V.toStr) : null, start: get('StartTime') !== undefined ? V.cast('System.DateTime', get('StartTime')) : null, end: get('EndTime') !== undefined ? V.cast('System.DateTime', get('EndTime')) : null });
      }
    } else filters.push({ logs: p.LogName || null, prov: p.ProviderName || null });
    const res = [];
    for (const f of filters) {
      let logs = f.logs ? f.logs : Object.keys(w.events);
      for (const ln of logs) {
        const key = Object.keys(w.events).find(k => V.like(k, ln));
        if (!key) { c.error(`Es wurden keine Ereignisprotokolle gefunden, die "${ln}" auf dem Computer "localhost" entsprechen.`, { category: 'ObjectNotFound', exception: 'System.Exception', fqid: 'NoMatchingLogsFound', target: ln, reason: 'Exception' }); continue; }
        if (key === 'Security' && !c.session.elevated && !c.session.remoteOrigin) { c.error('Der Versuch, einen nicht autorisierten Vorgang auszuführen.', { category: 'NotSpecified', exception: 'System.UnauthorizedAccessException', fqid: 'System.UnauthorizedAccessException', target: '', reason: 'UnauthorizedAccessException' }); continue; }
        for (const e of w.events[key]) {
          if (f.level && !f.level.includes(LEVELNUM[e.level])) continue;
          if (f.id && !f.id.includes(e.id)) continue;
          if (f.prov && !f.prov.some(x => V.like(e.source, x))) continue;
          if (f.start && e.time < f.start.d) continue;
          if (f.end && e.time > f.end.d) continue;
          res.push({ e, key });
        }
      }
    }
    res.sort((a, b) => p.Oldest ? a.e.time - b.e.time : b.e.time - a.e.time || b.e.index - a.e.index);
    let out = res;
    if (p.MaxEvents) out = out.slice(0, p.MaxEvents);
    if (!out.length) return c.error('Es wurden keine Ereignisse gefunden, die den angegebenen Auswahlkriterien entsprechen.', { category: 'ObjectNotFound', exception: 'System.Exception', fqid: 'NoMatchingEventsFound', target: '', reason: 'Exception' });
    c.outAll(out.map(x => GG.winEvObj(x.e, x.key, w)));
  } });
def({ name: 'Clear-EventLog', module: M, input: 'none', sp: true, params: [P('LogName', 'string[]', { pos: 0, mandatory: true })],
  run: async (c, p) => { if (!c.session.elevated) return c.error('Der angeforderte Registrierungszugriff ist unzulässig.', { category: 'NotSpecified', exception: 'System.Security.SecurityException', fqid: 'System.Security.SecurityException' }); for (const l of p.LogName) { const k = evLogFor(c, l); if (k && await c.should(k, 'Clear-EventLog')) c.world.events[k] = []; } } });
def({ name: 'Write-EventLog', module: M, input: 'none', params: [P('LogName', 'string', { pos: 0, mandatory: true }), P('Source', 'string', { pos: 1, mandatory: true }), P('EventId', 'int', { pos: 2, mandatory: true }), P('Message', 'string', { pos: 3, mandatory: true }), P('EntryType', 'enum', { values: ['Error', 'Information', 'FailureAudit', 'SuccessAudit', 'Warning'] }), P('Category', 'int')],
  run: async (c, p) => { const k = evLogFor(c, p.LogName); if (!k) return c.error(`Das Ereignisprotokoll "${p.LogName}" auf dem Computer "." ist nicht vorhanden.`, { category: 'InvalidOperation', fqid: 'System.InvalidOperationException' }); GG.addEvent(c.world, k, { level: p.EntryType || 'Information', source: p.Source, id: p.EventId, msg: p.Message }); } });

/* =================== Datenträger / CIM =================== */
const VOLT = 'Microsoft.Management.Infrastructure.CimInstance#ROOT/Microsoft/Windows/Storage/MSFT_Volume';
const gb = v => V.formatValue(v / 1073741824, 'F2') + ' GB';
GG.view(VOLT, { table: [{ l: 'DriveLetter', p: 'DriveLetter', w: 11 }, { l: 'FriendlyName', p: 'FriendlyName', w: 12 }, { l: 'FileSystemType', p: 'FileSystemType', w: 14 }, { l: 'DriveType', p: 'DriveType', w: 9 }, { l: 'HealthStatus', p: 'HealthStatus', w: 12 }, { l: 'OperationalStatus', p: 'OperationalStatus', w: 17 }, { l: 'SizeRemaining', g: o => gb(o.get('SizeRemaining')), w: 13, a: 'r' }, { l: 'Size', g: o => gb(o.get('Size')), w: 9, a: 'r' }] });
GG.volObj = function (v, w) {
  const o = new PSObject([VOLT, 'Microsoft.Management.Infrastructure.CimInstance'], { ObjectId: `{1}\\\\${w.hostname}\\root/Microsoft/Windows/Storage/Providers_v2\\WSP_Volume.ObjectId="{${v.letter}}"`, PassThroughClass: null, AllocationUnitSize: 4096, DedupMode: 'NotAvailable', DriveLetter: v.letter, DriveType: 'Fixed', FileSystem: 'NTFS', FileSystemLabel: v.label || '', FileSystemType: 'NTFS', HealthStatus: 'Healthy', OperationalStatus: 'OK', Path: `\\\\?\\Volume{${v.letter.charCodeAt(0)}e5a1f3c-0000-0000-0000-100000000000}\\`, Size: v.size, SizeRemaining: GG.volFree(w, v), FriendlyName: v.label || '' });
  return o;
};
def({ name: 'Get-Volume', module: 'Storage', version: '2.0.0.0', cmdType: 'Function', input: 'none', params: [P('DriveLetter', 'string[]', { pos: 0 }), P('FileSystemLabel', 'string[]'), P('CimSession', 'object')],
  run: async (c, p) => {
    const w = p.CimSession ? GG.remote.worldOfSession(c, p.CimSession) : c.world; if (!w) return;
    let vols = w.volumes.slice();
    if (p.DriveLetter) { for (const d of p.DriveLetter) { const v = vols.find(x => x.letter.toLowerCase() === d.replace(/:$/, '').toLowerCase()); if (!v) c.error(`Es wurden keine MSFT_Volume-Objekte gefunden, bei denen die DriveLetter-Eigenschaft gleich "${d}" ist. Vergewissern Sie sich, dass der Eigenschaftswert richtig ist, und wiederholen Sie den Vorgang.`, { category: 'ObjectNotFound', exception: 'Microsoft.Management.Infrastructure.CimException', fqid: 'CmdletizationQuery_NotFound_DriveLetter,Get-Volume', noClass: true, target: d }); else c.out(GG.volObj(v, w)); } return; }
    if (p.FileSystemLabel) vols = vols.filter(v => p.FileSystemLabel.some(x => V.like(v.label || '', x)));
    c.outAll(vols.map(v => GG.volObj(v, w)));
  } });
GG.view('Microsoft.Management.Infrastructure.CimInstance#ROOT/Microsoft/Windows/Storage/MSFT_Disk', { table: [{ l: 'Number', p: 'Number', w: 6, a: 'r' }, { l: 'Friendly Name', p: 'FriendlyName', w: 20 }, { l: 'Serial Number', p: 'SerialNumber', w: 20 }, { l: 'HealthStatus', p: 'HealthStatus', w: 12 }, { l: 'OperationalStatus', p: 'OperationalStatus', w: 17 }, { l: 'Total Size', g: o => gb(o.get('Size')), w: 10, a: 'r' }, { l: 'Partition Style', p: 'PartitionStyle' }] });
def({ name: 'Get-Disk', module: 'Storage', version: '2.0.0.0', cmdType: 'Function', input: 'none', params: [P('Number', 'int[]', { pos: 0 })],
  run: async (c, p) => { c.world.volumes.forEach((v, i) => { if (!p.Number || p.Number.includes(i)) c.out(new PSObject('Microsoft.Management.Infrastructure.CimInstance#ROOT/Microsoft/Windows/Storage/MSFT_Disk', { Number: i, FriendlyName: 'Msft Virtual Disk', SerialNumber: '', HealthStatus: 'Healthy', OperationalStatus: 'Online', Size: Math.round(v.size * 1.002), PartitionStyle: 'GPT' })); }); } });

const CIMV = cls => 'Microsoft.Management.Infrastructure.CimInstance#root/cimv2/' + cls;
GG.view(CIMV('Win32_LogicalDisk'), { table: [{ l: 'DeviceID', p: 'DeviceID', w: 8 }, { l: 'DriveType', p: 'DriveType', w: 9, a: 'r' }, { l: 'ProviderName', p: 'ProviderName', w: 12 }, { l: 'VolumeName', p: 'VolumeName', w: 10 }, { l: 'Size', p: 'Size', w: 12, a: 'r' }, { l: 'FreeSpace', p: 'FreeSpace', a: 'r' }] });
GG.view(CIMV('Win32_OperatingSystem'), { table: [{ l: 'SystemDirectory', p: 'SystemDirectory', w: 19 }, { l: 'Organization', p: 'Organization', w: 12 }, { l: 'BuildNumber', p: 'BuildNumber', w: 11 }, { l: 'RegisteredUser', p: 'RegisteredUser', w: 14 }, { l: 'SerialNumber', p: 'SerialNumber', w: 23 }, { l: 'Version', p: 'Version' }] });
GG.view(CIMV('Win32_ComputerSystem'), { table: [{ l: 'Name', p: 'Name', w: 15 }, { l: 'PrimaryOwnerName', p: 'PrimaryOwnerName', w: 16 }, { l: 'Domain', p: 'Domain', w: 16 }, { l: 'TotalPhysicalMemory', p: 'TotalPhysicalMemory', w: 19, a: 'r' }, { l: 'Model', p: 'Model', w: 20 }, { l: 'Manufacturer', p: 'Manufacturer' }] });
GG.view(CIMV('Win32_BIOS'), { kind: 'list', list: ['SMBIOSBIOSVersion', 'Manufacturer', 'Name', 'SerialNumber', 'Version'].map(p => ({ p })) });
GG.view(CIMV('Win32_Processor'), { table: [{ l: 'DeviceID', p: 'DeviceID', w: 8 }, { l: 'Name', p: 'Name', w: 45 }, { l: 'Caption', p: 'Caption', w: 30 }, { l: 'MaxClockSpeed', p: 'MaxClockSpeed', w: 13, a: 'r' }, { l: 'SocketDesignation', p: 'SocketDesignation' }] });
GG.view(CIMV('Win32_Service'), { table: [{ l: 'ProcessId', p: 'ProcessId', w: 9, a: 'r' }, { l: 'Name', p: 'Name', w: 20 }, { l: 'StartMode', p: 'StartMode', w: 9 }, { l: 'State', p: 'State', w: 8 }, { l: 'Status', p: 'Status', w: 6 }, { l: 'ExitCode', p: 'ExitCode', a: 'r' }] });
GG.view(CIMV('Win32_QuickFixEngineering'), { table: [{ l: 'Source', p: 'CSName', w: 13 }, { l: 'Description', p: 'Description', w: 15 }, { l: 'HotFixID', p: 'HotFixID', w: 10 }, { l: 'InstalledBy', p: 'InstalledBy', w: 20 }, { l: 'InstalledOn', g: o => o.get('InstalledOn') ? V.fmtDateDE(o.get('InstalledOn').d) : '' }] });
GG.cimQuery = function (w, cls) {
  const k = cls.toLowerCase();
  const T = CIMV;
  const mk = (c, props) => { const o = new PSObject([T(c), 'Microsoft.Management.Infrastructure.CimInstance'], props); o.add('PSComputerName', null); o.hiddenProps = ['pscomputername']; return o; };
  switch (k) {
    case 'win32_logicaldisk': return w.volumes.map(v => mk('Win32_LogicalDisk', { DeviceID: v.letter + ':', DriveType: 3, ProviderName: null, VolumeName: v.label || '', Size: v.size, FreeSpace: GG.volFree(w, v), FileSystem: 'NTFS', VolumeSerialNumber: '7A3C' + v.letter.charCodeAt(0) + 'E1' }));
    case 'win32_operatingsystem': return [mk('Win32_OperatingSystem', { SystemDirectory: 'C:\\Windows\\system32', Organization: '', BuildNumber: w.build, RegisteredUser: 'Windows-Benutzer', SerialNumber: '00454-60000-00001-AA' + (w.hostname.length * 37), Version: w.osVersion, Caption: w.os, CSName: w.hostname, OSArchitecture: '64-Bit', LastBootUpTime: new PSDate(w.bootTime), InstallDate: new PSDate(GG.ago(400)), FreePhysicalMemory: 5123456, TotalVisibleMemorySize: 8388148, NumberOfProcesses: w.processes.length, Locale: '0407' })];
    case 'win32_computersystem': return [mk('Win32_ComputerSystem', { Name: w.hostname, PrimaryOwnerName: 'Windows-Benutzer', Domain: w.domain || 'WORKGROUP', TotalPhysicalMemory: 8589398016, Model: 'Virtual Machine', Manufacturer: 'Microsoft Corporation', PartOfDomain: !!w.domain, NumberOfLogicalProcessors: 4, DomainRole: w.isDomainController ? 5 : 3 })];
    case 'win32_bios': return [mk('Win32_BIOS', { SMBIOSBIOSVersion: 'Hyper-V UEFI Release v4.1', Manufacturer: 'Microsoft Corporation', Name: 'Hyper-V UEFI Release v4.1', SerialNumber: '2914-' + w.hostname.length + '377-1265', Version: 'VRTUAL - 1' })];
    case 'win32_processor': return [mk('Win32_Processor', { DeviceID: 'CPU0', Name: 'Intel(R) Xeon(R) Silver 4314 CPU @ 2.40GHz', Caption: 'Intel64 Family 6 Model 106 Stepping 6', MaxClockSpeed: 2394, SocketDesignation: 'None', Manufacturer: 'GenuineIntel', NumberOfCores: 4, NumberOfLogicalProcessors: 4, LoadPercentage: 7 })];
    case 'win32_service': return w.services.map(s => mk('Win32_Service', { ProcessId: s.status === 'Running' ? 900 + s.name.length * 13 : 0, Name: s.name, StartMode: s.start === 'Automatic' ? 'Auto' : s.start, State: s.status, Status: 'OK', ExitCode: s.failStart ? 1069 : 0, DisplayName: s.display, StartName: s.account || 'LocalSystem', PathName: s.path || '' }));
    case 'win32_quickfixengineering': return (w.hotfixes || []).map(h => mk('Win32_QuickFixEngineering', { CSName: w.hostname, Description: h.desc || 'Update', HotFixID: h.id, InstalledBy: h.by || 'NT-AUTORITÄT\\SYSTEM', InstalledOn: new PSDate(h.on) }));
  }
  return null;
};
GG.wqlFilter = function (items, filter) {
  if (!filter) return items;
  const conds = filter.split(/\s+and\s+/i).map(s => /^\s*(\w+)\s*(=|<>|!=|>=|<=|>|<|like)\s*'?([^']*)'?\s*$/i.exec(s));
  return items.filter(o => conds.every(m => {
    if (!m) return true;
    const v = o.get(m[1]); const want = m[3]; const op = m[2].toLowerCase();
    if (op === 'like') return V.like(V.toStr(v), want.replace(/%/g, '*').replace(/_/g, '?'));
    const cmp = typeof v === 'number' ? v - Number(want) : V.toStr(v).toLowerCase().localeCompare(want.toLowerCase());
    return op === '=' ? cmp === 0 : (op === '<>' || op === '!=') ? cmp !== 0 : op === '>' ? cmp > 0 : op === '<' ? cmp < 0 : op === '>=' ? cmp >= 0 : cmp <= 0;
  }));
};
for (const nm of ['Get-CimInstance', 'Get-WmiObject']) def({ name: nm, module: nm === 'Get-CimInstance' ? 'CimCmdlets' : M, aliases: nm === 'Get-CimInstance' ? ['gcim'] : ['gwmi'], input: 'none',
  params: [P('ClassName', 'string', { pos: 0, aliases: ['Class'] }), P('Filter', 'string'), P('Query', 'string'), P('ComputerName', 'string[]', { aliases: ['CN', 'ServerName'] }), P('Namespace', 'string'), P('Property', 'string[]'), P('CimSession', 'object')],
  run: async (c, p) => {
    let cls = p.ClassName, filter = p.Filter;
    if (p.Query) { const m = /select\s+.+\s+from\s+(\w+)(?:\s+where\s+(.+))?/i.exec(p.Query); if (m) { cls = m[1]; filter = m[2]; } }
    if (!cls) throw GG.bindErr(c.ctx, nm, 'Der Befehl kann nicht verarbeitet werden, da einer oder mehrere obligatorische Parameter fehlen: ClassName.', 'MissingMandatoryParameter');
    const worlds = p.ComputerName ? p.ComputerName.map(n => GG.netw.remoteWorldOrError(c, n, nm, true)).filter(Boolean) : (p.CimSession ? V.toArr(p.CimSession).map(s => GG.remote.worldOfSession(c, s)).filter(Boolean) : [c.world]);
    for (const w of worlds) {
      const items = GG.cimQuery(w, cls);
      if (!items) return c.error(nm === 'Get-CimInstance' ? 'Ungültige Klasse ' : 'Ungültige Klasse "' + cls + '"', { category: 'MetadataError', exception: 'Microsoft.Management.Infrastructure.CimException', fqid: 'HRESULT 0x80041010', target: `root\\cimv2:${cls}`, noClass: false });
      for (const o of GG.wqlFilter(items, filter)) { if (w !== c.world || p.ComputerName) { o.set('PSComputerName', w.hostname); } c.out(o); }
    }
  } });
def({ name: 'Get-ComputerInfo', module: M, input: 'none', params: [P('Property', 'string[]', { pos: 0 })],
  run: async (c, p) => {
    const w = c.world;
    const o = new PSObject('Microsoft.PowerShell.Commands.ComputerInfo', { WindowsBuildLabEx: `${w.build}.1.amd64fre.ge_release.240331-1435`, WindowsCurrentVersion: '6.3', WindowsEditionId: 'ServerStandard', WindowsInstallationType: 'Server', WindowsProductName: 'Windows Server 2025 Standard', WindowsRegisteredOwner: 'Windows-Benutzer', WindowsVersion: '2009', BiosManufacturer: 'Microsoft Corporation', CsDNSHostName: w.hostname, CsDomain: w.domain || 'WORKGROUP', CsName: w.hostname, CsNumberOfLogicalProcessors: 4, CsTotalPhysicalMemory: 8589398016, OsName: w.os, OsVersion: w.osVersion + '', OsBuildNumber: w.build, OsLanguage: 'de-DE', OsLastBootUpTime: new PSDate(w.bootTime), OsUptime: new TimeSpan(Date.now() - w.bootTime.getTime()), TimeZone: '(UTC+01:00) Amsterdam, Berlin, Bern, Rom, Stockholm, Wien', LogonServer: '\\\\' + (w.dc || w.hostname), PowerPlatformRole: 'Desktop' });
    if (p.Property) { const r = new PSObject('System.Management.Automation.PSCustomObject'); for (const n of o.names()) if (p.Property.some(x => V.like(n, x))) r.add(n, o.get(n)); c.out(r); } else c.out(o);
  } });
def({ name: 'Get-HotFix', module: M, input: 'none', params: [P('Id', 'string[]', { pos: 0, aliases: ['HFID'] }), P('ComputerName', 'string[]', { aliases: ['CN'] }), P('Description', 'string[]')],
  run: async (c, p) => { let list = GG.cimQuery(c.world, 'Win32_QuickFixEngineering'); if (p.Id) list = list.filter(o => p.Id.some(x => V.like(o.get('HotFixID'), x))); c.outAll(list); } });
for (const nm of ['Restart-Computer', 'Stop-Computer']) def({ name: nm, module: M, input: 'none', sp: true, params: [P('ComputerName', 'string[]', { pos: 0, aliases: ['CN', '__SERVER', 'Server', 'IPAddress'] }), P('Force', 'switch'), P('Wait', 'switch'), P('Credential', 'cred')],
  run: async (c, p) => {
    const names = p.ComputerName || [c.world.hostname];
    for (const n of names) {
      const w = n.toLowerCase() === c.world.hostname.toLowerCase() || n === '.' || n === 'localhost' ? c.world : GG.netw.remoteWorldOrError(c, n, nm, true);
      if (!w) continue;
      if (!(await c.should(w.hostname, nm === 'Restart-Computer' ? 'Enable the Local shutdown access rights and restart the computer.' : 'Stop-Computer'))) continue;
      if (w === c.world && !c.session.elevated && !c.session.remoteOrigin) { c.error(`Der Computer "${w.hostname}" konnte nicht ${nm === 'Restart-Computer' ? 'neu gestartet' : 'heruntergefahren'} werden. Fehlermeldung: Privileg nicht vorhanden.`, { category: 'OperationStopped', exception: 'System.InvalidOperationException', fqid: 'RestartcomputerFailed', target: w.hostname }); continue; }
      if (c.host.reboot) await c.host.reboot(w, nm === 'Stop-Computer', c.ctx);
      else { w.bootTime = new Date(); }
    }
  } });

/* =================== Lokale Benutzer & Gruppen =================== */
const LA = 'Microsoft.PowerShell.LocalAccounts';
const sidBase = w => 'S-1-5-21-' + (2113 + w.hostname.length * 97) + '-' + (31337 + w.hostname.charCodeAt(0)) + '-' + (4040 + w.hostname.length);
GG.luObj = function (u, w) {
  const o = new PSObject(['Microsoft.PowerShell.Commands.LocalUser', 'Microsoft.PowerShell.Commands.LocalPrincipal'], null, { ref: u });
  o.add('AccountExpires', u.expires ? new PSDate(u.expires) : null); o.add('Description', null, () => u.desc || '');
  o.add('Enabled', null, () => u.enabled); o.add('FullName', null, () => u.fullName || '');
  o.add('PasswordChangeableDate', u.pwSet ? new PSDate(u.pwSet) : null); o.add('PasswordExpires', null, () => u.pwNeverExpires ? null : (u.pwSet ? new PSDate(new Date(u.pwSet.getTime() + 42 * 864e5)) : null));
  o.add('UserMayChangePassword', true); o.add('PasswordRequired', true); o.add('PasswordLastSet', null, () => u.pwSet ? new PSDate(u.pwSet) : null); o.add('LastLogon', null, () => u.lastLogon ? new PSDate(u.lastLogon) : null);
  o.add('Name', null, () => u.name); o.add('SID', sidBase(w) + '-' + u.rid); o.add('PrincipalSource', 'Local'); o.add('ObjectClass', 'Benutzer');
  o.toStringFn = () => u.name;
  return o;
};
GG.view('Microsoft.PowerShell.Commands.LocalUser', { table: [{ l: 'Name', p: 'Name', w: 20 }, { l: 'Enabled', p: 'Enabled', w: 7 }, { l: 'Description', p: 'Description' }] });
GG.lgObj = function (g, w) { const o = new PSObject(['Microsoft.PowerShell.Commands.LocalGroup', 'Microsoft.PowerShell.Commands.LocalPrincipal'], { Description: g.desc || '', Name: g.name, SID: g.sid || 'S-1-5-32-' + (544 + w.groups.indexOf(g)), PrincipalSource: 'Local', ObjectClass: 'Gruppe' }, { ref: g }); o.toStringFn = () => g.name; return o; };
GG.view('Microsoft.PowerShell.Commands.LocalGroup', { table: [{ l: 'Name', p: 'Name', w: 35 }, { l: 'Description', p: 'Description' }] });
GG.view('Microsoft.PowerShell.Commands.LocalPrincipal', { table: [{ l: 'ObjectClass', p: 'ObjectClass', w: 11 }, { l: 'Name', p: 'Name', w: 40 }, { l: 'PrincipalSource', p: 'PrincipalSource' }] });
function laErr(c, msg, cat, fqid, exc, target) { c.error(msg, { category: cat, exception: 'Microsoft.PowerShell.Commands.' + exc, fqid, target: target || '', reason: exc }); }
function needAdmin(c) { if (c.session.elevated || c.session.remoteOrigin) return true; laErr(c, 'Zugriff verweigert.', 'PermissionDenied', 'AccessDenied', 'AccessDeniedException'); return false; }
function noLocalOnDC(c) { if (c.world.isDomainController) { laErr(c, 'Der Vorgang wird auf einem Domänencontroller nicht unterstützt.', 'InvalidOperation', 'InvalidOperation', 'InvalidOperationException'); return true; } return false; }
GG.pwComplex = function (pw, min) {
  if (pw.length < (min || 8)) return false;
  let k = 0; if (/[a-zäöüß]/.test(pw)) k++; if (/[A-ZÄÖÜ]/.test(pw)) k++; if (/\d/.test(pw)) k++; if (/[^A-Za-z0-9äöüÄÖÜß]/.test(pw)) k++;
  return k >= 3;
};
function findLU(w, n) { return w.users.find(u => u.name.toLowerCase() === V.toStr(n).toLowerCase().replace(/^.*\\/, '')); }
def({ name: 'Get-LocalUser', module: LA, version: '1.0.0.0', input: 'each', params: [P('Name', 'string[]', { pos: 0, pipe: 'both' }), P('SID', 'string[]')],
  run: async (c, p) => {
    if (noLocalOnDC(c)) return;
    const w = c.world;
    if (!p.Name) return c.outAll(w.users.slice().sort((a, b) => a.name.localeCompare(b.name)).map(u => GG.luObj(u, w)));
    for (const n of p.Name) { const m = w.users.filter(u => V.like(u.name, n)); if (!m.length && !V.hasWild(n)) laErr(c, `Der Benutzer "${n}" wurde nicht gefunden.`, 'ObjectNotFound', 'UserNotFound', 'UserNotFoundException', n); c.outAll(m.map(u => GG.luObj(u, w))); }
  } });
def({ name: 'New-LocalUser', module: LA, version: '1.0.0.0', input: 'none', sp: true,
  params: [P('Name', 'string', { pos: 0, mandatory: true }), P('Password', 'secure', { mandatory: true, altOf: ['NoPassword'] }), P('NoPassword', 'switch'), P('FullName', 'string'), P('Description', 'string'), P('Disabled', 'switch'), P('AccountNeverExpires', 'switch'), P('PasswordNeverExpires', 'switch'), P('UserMayNotChangePassword', 'switch'), P('AccountExpires', 'date')],
  run: async (c, p) => {
    if (noLocalOnDC(c)) return;
    if (!(await c.should(p.Name, 'Lokalen Benutzer erstellen'))) return;
    if (!needAdmin(c)) return;
    const w = c.world;
    if (p.Name.length > 20) return laErr(c, `Der Name "${p.Name}" ist zu lang. Benutzernamen dürfen höchstens 20 Zeichen lang sein.`, 'InvalidArgument', 'InvalidName', 'InvalidNameException', p.Name);
    if (findLU(w, p.Name)) return laErr(c, `Der Benutzer "${p.Name}" ist bereits vorhanden.`, 'ResourceExists', 'UserExists', 'UserExistsException', p.Name);
    if (p.Password && !GG.pwComplex(p.Password.plain, w.pwMinLength || 8)) return laErr(c, 'Das Kennwort kann nicht aktualisiert werden. Der für das neue Kennwort angegebene Wert entspricht nicht den Anforderungen der Domäne hinsichtlich Länge, Komplexität oder Chronik.', 'InvalidOperation', 'InvalidPassword', 'InvalidPasswordException', p.Name);
    const u = { name: p.Name, fullName: p.FullName || '', desc: p.Description || '', enabled: !p.Disabled, pw: p.Password ? p.Password.plain : '', pwSet: new Date(), rid: 1000 + w.users.length + 10, pwNeverExpires: !!p.PasswordNeverExpires, lastLogon: null };
    w.users.push(u);
    const g = w.groups.find(x => x.name === 'Benutzer'); if (g) g.members.push(w.hostname + '\\' + u.name);
    c.out(GG.luObj(u, w));
  } });
def({ name: 'Set-LocalUser', module: LA, version: '1.0.0.0', input: 'each', sp: true,
  params: [P('Name', 'string', { pos: 0, pipe: 'both' }), P('InputObject', 'object', { pipe: 'value', pipeType: ['Microsoft.PowerShell.Commands.LocalUser'] }), P('Password', 'secure'), P('FullName', 'string'), P('Description', 'string'), P('AccountNeverExpires', 'switch'), P('AccountExpires', 'date'), P('PasswordNeverExpires', 'bool'), P('UserMayChangePassword', 'bool')],
  run: async (c, p) => {
    if (noLocalOnDC(c)) return;
    const u = p.InputObject ? p.InputObject.ref : findLU(c.world, p.Name);
    if (!u) return laErr(c, `Der Benutzer "${p.Name}" wurde nicht gefunden.`, 'ObjectNotFound', 'UserNotFound', 'UserNotFoundException', p.Name);
    if (!(await c.should(u.name, 'Lokalen Benutzer ändern'))) return;
    if (!needAdmin(c)) return;
    if (p.Password) { if (!GG.pwComplex(p.Password.plain, c.world.pwMinLength || 8)) return laErr(c, 'Das Kennwort kann nicht aktualisiert werden. Der für das neue Kennwort angegebene Wert entspricht nicht den Anforderungen der Domäne hinsichtlich Länge, Komplexität oder Chronik.', 'InvalidOperation', 'InvalidPassword', 'InvalidPasswordException', u.name); u.pw = p.Password.plain; u.pwSet = new Date(); }
    if (p.FullName !== undefined) u.fullName = p.FullName;
    if (p.Description !== undefined) u.desc = p.Description;
    if (p.PasswordNeverExpires !== undefined) u.pwNeverExpires = p.PasswordNeverExpires;
  } });
for (const [nm, en] of [['Enable-LocalUser', true], ['Disable-LocalUser', false]]) def({ name: nm, module: LA, version: '1.0.0.0', input: 'each', sp: true,
  params: [P('Name', 'string[]', { pos: 0, pipe: 'both' }), P('InputObject', 'object', { pipe: 'value', pipeType: ['Microsoft.PowerShell.Commands.LocalUser'] }), P('SID', 'string[]'), P('PassThru', 'switch')],
  run: async (c, p) => {
    if (noLocalOnDC(c)) return;
    const list = p.InputObject ? [p.InputObject.ref] : (p.Name || []).map(n => { const u = findLU(c.world, n); if (!u) laErr(c, `Der Benutzer "${n}" wurde nicht gefunden.`, 'ObjectNotFound', 'UserNotFound', 'UserNotFoundException', n); return u; }).filter(Boolean);
    if (!list.length && !p.Name && !p.InputObject) throw GG.bindErr(c.ctx, nm, 'Der Befehl kann nicht verarbeitet werden, da einer oder mehrere obligatorische Parameter fehlen: Name.', 'MissingMandatoryParameter');
    for (const u of list) {
      if (!(await c.should(u.name, en ? 'Lokalen Benutzer aktivieren' : 'Lokalen Benutzer deaktivieren'))) continue;
      if (!needAdmin(c)) return;
      u.enabled = en;
      if (p.PassThru) c.out(GG.luObj(u, c.world));
    }
  } });
def({ name: 'Remove-LocalUser', module: LA, version: '1.0.0.0', input: 'each', sp: true, params: [P('Name', 'string[]', { pos: 0, pipe: 'both' }), P('InputObject', 'object', { pipe: 'value', pipeType: ['Microsoft.PowerShell.Commands.LocalUser'] }), P('SID', 'string[]')],
  run: async (c, p) => {
    if (noLocalOnDC(c)) return;
    const list = p.InputObject ? [p.InputObject.ref] : (p.Name || []).map(n => { const u = findLU(c.world, n); if (!u) laErr(c, `Der Benutzer "${n}" wurde nicht gefunden.`, 'ObjectNotFound', 'UserNotFound', 'UserNotFoundException', n); return u; }).filter(Boolean);
    for (const u of list) {
      if (!(await c.should(u.name, 'Lokalen Benutzer entfernen'))) continue;
      if (!needAdmin(c)) return;
      c.world.users.splice(c.world.users.indexOf(u), 1);
      for (const g of c.world.groups) g.members = g.members.filter(m => m.toLowerCase() !== (c.world.hostname + '\\' + u.name).toLowerCase());
    }
  } });
def({ name: 'Rename-LocalUser', module: LA, version: '1.0.0.0', input: 'each', sp: true, params: [P('Name', 'string', { pos: 0, pipe: 'both' }), P('NewName', 'string', { pos: 1, mandatory: true }), P('PassThru', 'switch')],
  run: async (c, p) => {
    const u = findLU(c.world, p.Name);
    if (!u) return laErr(c, `Der Benutzer "${p.Name}" wurde nicht gefunden.`, 'ObjectNotFound', 'UserNotFound', 'UserNotFoundException', p.Name);
    if (!(await c.should(u.name, 'Lokalen Benutzer umbenennen'))) return;
    if (!needAdmin(c)) return;
    const old = (c.world.hostname + '\\' + u.name).toLowerCase();
    u.name = p.NewName;
    for (const g of c.world.groups) g.members = g.members.map(m => m.toLowerCase() === old ? c.world.hostname + '\\' + u.name : m);
  } });
function findLG(w, n) { return w.groups.find(g => g.name.toLowerCase() === V.toStr(n).toLowerCase().replace(/^vordefiniert\\/, '')); }
def({ name: 'Get-LocalGroup', module: LA, version: '1.0.0.0', input: 'each', params: [P('Name', 'string[]', { pos: 0, pipe: 'both' }), P('SID', 'string[]')],
  run: async (c, p) => {
    if (noLocalOnDC(c)) return;
    const w = c.world;
    if (!p.Name) return c.outAll(w.groups.slice().sort((a, b) => a.name.localeCompare(b.name)).map(g => GG.lgObj(g, w)));
    for (const n of p.Name) { const m = w.groups.filter(g => V.like(g.name, n)); if (!m.length && !V.hasWild(n)) laErr(c, `Die Gruppe "${n}" wurde nicht gefunden.`, 'ObjectNotFound', 'GroupNotFound', 'GroupNotFoundException', n); c.outAll(m.map(g => GG.lgObj(g, w))); }
  } });
def({ name: 'New-LocalGroup', module: LA, version: '1.0.0.0', input: 'none', sp: true, params: [P('Name', 'string', { pos: 0, mandatory: true }), P('Description', 'string')],
  run: async (c, p) => {
    if (noLocalOnDC(c)) return;
    if (!(await c.should(p.Name, 'Lokale Gruppe erstellen'))) return;
    if (!needAdmin(c)) return;
    if (findLG(c.world, p.Name)) return laErr(c, `Die Gruppe "${p.Name}" ist bereits vorhanden.`, 'ResourceExists', 'GroupExists', 'GroupExistsException', p.Name);
    const g = { name: p.Name, desc: p.Description || '', members: [], sid: sidBase(c.world) + '-' + (1100 + c.world.groups.length) };
    c.world.groups.push(g); c.out(GG.lgObj(g, c.world));
  } });
GG.resolvePrincipal = function (w, name) {
  const n = V.toStr(name).trim();
  const lower = n.toLowerCase();
  if (lower.includes('\\')) {
    const [dom, acc] = n.split('\\');
    if (dom.toLowerCase() === w.hostname.toLowerCase()) { const u = findLU(w, acc); if (u) return { full: w.hostname + '\\' + u.name, cls: 'Benutzer', src: 'Local' }; const g = findLG(w, acc); if (g) return { full: 'VORDEFINIERT\\' + g.name, cls: 'Gruppe', src: 'Local' }; return null; }
    if (w.ad && dom.toLowerCase() === w.ad.netbios.toLowerCase()) {
      const u = w.ad.users.find(x => x.sam.toLowerCase() === acc.toLowerCase()); if (u) return { full: w.ad.netbios + '\\' + u.sam, cls: 'Benutzer', src: 'ActiveDirectory' };
      const g = w.ad.groups.find(x => x.sam.toLowerCase() === acc.toLowerCase() || x.name.toLowerCase() === acc.toLowerCase()); if (g) return { full: w.ad.netbios + '\\' + g.name, cls: 'Gruppe', src: 'ActiveDirectory' };
      return null;
    }
    if (dom.toLowerCase() === 'vordefiniert' || dom.toLowerCase() === 'builtin') { const g = findLG(w, acc); if (g) return { full: 'VORDEFINIERT\\' + g.name, cls: 'Gruppe', src: 'Local' }; }
    return null;
  }
  const u = findLU(w, n); if (u) return { full: w.hostname + '\\' + u.name, cls: 'Benutzer', src: 'Local' };
  if (w.ad) {
    const du = w.ad.users.find(x => x.sam.toLowerCase() === lower); if (du) return { full: w.ad.netbios + '\\' + du.sam, cls: 'Benutzer', src: 'ActiveDirectory' };
    const dg = w.ad.groups.find(x => x.sam.toLowerCase() === lower || x.name.toLowerCase() === lower); if (dg) return { full: w.ad.netbios + '\\' + dg.name, cls: 'Gruppe', src: 'ActiveDirectory' };
  }
  if (lower === 'jeder' || lower === 'everyone') return { full: 'Jeder', cls: 'Gruppe', src: 'Local' };
  return null;
};
def({ name: 'Get-LocalGroupMember', module: LA, version: '1.0.0.0', input: 'each', params: [P('Group', 'string', { pos: 0, pipe: 'both', aliases: ['Name'] }), P('Member', 'string', { pos: 1 }), P('InputObject', 'object', { pipe: 'value', pipeType: ['Microsoft.PowerShell.Commands.LocalGroup'] })],
  run: async (c, p) => {
    if (noLocalOnDC(c)) return;
    const w = c.world;
    const g = p.InputObject ? p.InputObject.ref : findLG(w, p.Group);
    if (!g) return laErr(c, `Die Gruppe "${p.Group}" wurde nicht gefunden.`, 'ObjectNotFound', 'GroupNotFound', 'GroupNotFoundException', p.Group);
    for (const m of g.members) {
      if (p.Member && !V.like(m, p.Member) && !V.like(m.split('\\').pop(), p.Member)) continue;
      const dom = m.split('\\')[0];
      const isAD = w.ad && dom.toLowerCase() === w.ad.netbios.toLowerCase();
      const isGroup = isAD ? w.ad.groups.some(x => x.name.toLowerCase() === m.split('\\').pop().toLowerCase()) : !findLU(w, m.split('\\').pop());
      c.out(new PSObject('Microsoft.PowerShell.Commands.LocalPrincipal', { ObjectClass: isGroup ? 'Gruppe' : 'Benutzer', Name: m, SID: 'S-1-5-21-' + m.length, PrincipalSource: isAD ? 'ActiveDirectory' : 'Local' }));
    }
  } });
for (const [nm, add] of [['Add-LocalGroupMember', true], ['Remove-LocalGroupMember', false]]) def({ name: nm, module: LA, version: '1.0.0.0', input: 'each', sp: true,
  params: [P('Group', 'string', { pos: 0, aliases: ['Name'] }), P('Member', 'object[]', { pos: 1, mandatory: true, pipe: 'value' }), P('SID', 'string')],
  run: async (c, p) => {
    if (noLocalOnDC(c)) return;
    const w = c.world;
    const g = findLG(w, p.Group);
    if (!g) return laErr(c, `Die Gruppe "${p.Group}" wurde nicht gefunden.`, 'ObjectNotFound', 'GroupNotFound', 'GroupNotFoundException', p.Group);
    for (const mm of p.Member) {
      const mn = mm instanceof PSObject ? V.toStr(mm.get('SamAccountName') ? (w.ad.netbios + '\\' + mm.get('SamAccountName')) : mm.get('Name')) : V.toStr(mm);
      const pr = GG.resolvePrincipal(w, mn);
      if (!pr) { laErr(c, `Prinzipal "${mn}" wurde nicht gefunden.`, 'ObjectNotFound', 'PrincipalNotFound', 'PrincipalNotFoundException', mn); continue; }
      if (!(await c.should(pr.full, add ? 'Mitglied hinzufügen' : 'Mitglied entfernen'))) continue;
      if (!needAdmin(c)) return;
      const idx = g.members.findIndex(x => x.toLowerCase() === pr.full.toLowerCase());
      if (add) { if (idx >= 0) { laErr(c, `${pr.full} ist bereits Mitglied der Gruppe ${g.name}.`, 'ResourceExists', 'MemberExists', 'MemberExistsException', pr.full); continue; } g.members.push(pr.full); }
      else { if (idx < 0) { laErr(c, `Das Mitglied "${mn}" wurde in der Gruppe "${g.name}" nicht gefunden.`, 'ObjectNotFound', 'MemberNotFound', 'MemberNotFoundException', mn); continue; } g.members.splice(idx, 1); }
    }
  } });

/* =================== SMB-Freigaben =================== */
const SHT = 'Microsoft.Management.Infrastructure.CimInstance#ROOT/Microsoft/Windows/SMB/MSFT_SmbShare';
const SHA = 'Microsoft.Management.Infrastructure.CimInstance#ROOT/Microsoft/Windows/SMB/MSFT_SmbShareAccessControlEntry';
GG.shareObj = function (s) { return new PSObject([SHT, 'Microsoft.Management.Infrastructure.CimInstance'], { Name: s.name, ScopeName: '*', Path: s.path, Description: s.desc || '', CurrentUsers: 0, ShareState: 'Online', FolderEnumerationMode: s.abe ? 'AccessBased' : 'Unrestricted', CachingMode: 'Manual', Special: /\$$/.test(s.name) && !!s.special, Temporary: false, EncryptData: false }, { ref: s }); };
GG.view(SHT, { table: [{ l: 'Name', p: 'Name', w: 12 }, { l: 'ScopeName', p: 'ScopeName', w: 9 }, { l: 'Path', p: 'Path', w: 30 }, { l: 'Description', p: 'Description' }] });
GG.view(SHA, { table: [{ l: 'Name', p: 'Name', w: 12 }, { l: 'ScopeName', p: 'ScopeName', w: 9 }, { l: 'AccountName', p: 'AccountName', w: 30 }, { l: 'AccessControlType', p: 'AccessControlType', w: 17 }, { l: 'AccessRight', p: 'AccessRight' }] });
function smbAdmin(c, cmd) { if (c.session.elevated || c.session.remoteOrigin) return true; c.error('Zugriff verweigert ', { category: 'PermissionDenied', exception: 'Microsoft.Management.Infrastructure.CimException', fqid: 'Windows System Error 5,' + cmd, noClass: true, target: SHT.replace('Microsoft.Management.Infrastructure.CimInstance#', '').split('/').pop() }); return false; }
function findShare(w, n) { return w.shares.find(s => s.name.toLowerCase() === V.toStr(n).toLowerCase()); }
function shareMissing(c, n, cmd) { c.error(`Es wurden keine MSFT_SmbShare-Objekte gefunden, bei denen die Name-Eigenschaft gleich "${n}" ist. Vergewissern Sie sich, dass der Eigenschaftswert richtig ist, und wiederholen Sie den Vorgang.`, { category: 'ObjectNotFound', exception: 'Microsoft.Management.Infrastructure.CimException', fqid: 'CmdletizationQuery_NotFound_Name,' + cmd, noClass: true, target: n }); }
function resolveAccount(w, n) {
  const l = V.toStr(n).toLowerCase();
  if (['jeder', 'everyone'].includes(l)) return l === 'everyone' ? null : 'Jeder';
  const pr = GG.resolvePrincipal(w, n);
  return pr ? pr.full : null;
}
def({ name: 'Get-SmbShare', module: 'SmbShare', version: '2.0.0.0', cmdType: 'Function', input: 'none', params: [P('Name', 'string[]', { pos: 0 }), P('Special', 'switch'), P('CimSession', 'object')],
  run: async (c, p) => {
    if (!smbAdmin(c, 'Get-SmbShare')) return;
    let list = c.world.shares.slice().sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    if (p.Name) { for (const n of p.Name) { const m = list.filter(s => V.like(s.name, n)); if (!m.length && !V.hasWild(n)) shareMissing(c, n, 'Get-SmbShare'); c.outAll(m.map(GG.shareObj)); } return; }
    c.outAll(list.map(GG.shareObj));
  } });
def({ name: 'New-SmbShare', module: 'SmbShare', version: '2.0.0.0', cmdType: 'Function', input: 'none', sp: true,
  params: [P('Name', 'string', { pos: 0, mandatory: true }), P('Path', 'string', { pos: 1, mandatory: true }), P('Description', 'string'), P('FullAccess', 'string[]'), P('ChangeAccess', 'string[]'), P('ReadAccess', 'string[]'), P('NoAccess', 'string[]'), P('FolderEnumerationMode', 'enum', { values: ['AccessBased', 'Unrestricted'] }), P('ConcurrentUserLimit', 'int'), P('CachingMode', 'string'), P('EncryptData', 'bool'), P('Temporary', 'switch')],
  run: async (c, p) => {
    if (!(await c.should(p.Name, 'New-SmbShare'))) return;
    if (!smbAdmin(c, 'New-SmbShare')) return;
    const w = c.world;
    if (findShare(w, p.Name)) return c.error('Der Name wurde bereits freigegeben. ', { category: 'NotSpecified', exception: 'Microsoft.Management.Infrastructure.CimException', fqid: 'Windows System Error 2118,New-SmbShare', noClass: true, target: 'MSFT_SmbShare' });
    const r = FX.resolve(c.ctx, p.Path); const n = FX.node(r);
    if (!n || !n.dir || r.prov !== 'FileSystem' || r.unc) return c.error('Das System kann den angegebenen Pfad nicht finden. ', { category: 'ObjectNotFound', exception: 'Microsoft.Management.Infrastructure.CimException', fqid: 'Windows System Error 3,New-SmbShare', noClass: true, target: 'MSFT_SmbShare' });
    const access = [];
    for (const [list, right] of [[p.FullAccess, 'Full'], [p.ChangeAccess, 'Change'], [p.ReadAccess, 'Read'], [p.NoAccess, 'Deny']]) for (const a of list || []) {
      const acc = resolveAccount(w, a);
      if (!acc) return c.error('Zuordnungen von Kontennamen und Sicherheitskennungen wurden nicht durchgeführt. ', { category: 'NotSpecified', exception: 'Microsoft.Management.Infrastructure.CimException', fqid: 'Windows System Error 1332,New-SmbShare', noClass: true, target: 'MSFT_SmbShare' });
      access.push({ account: acc, right: right === 'Deny' ? 'Full' : right, type: right === 'Deny' ? 'Deny' : 'Allow' });
    }
    if (!access.length) access.push({ account: 'Jeder', right: 'Read', type: 'Allow' });
    const s = { name: p.Name, path: FX.canonical(r), desc: p.Description || '', access, abe: p.FolderEnumerationMode === 'AccessBased' };
    w.shares.push(s);
    c.out(GG.shareObj(s));
  } });
def({ name: 'Remove-SmbShare', module: 'SmbShare', version: '2.0.0.0', cmdType: 'Function', input: 'collect', sp: true, params: [P('Name', 'string[]', { pos: 0 }), P('Force', 'switch'), P('InputObject', 'object')],
  run: async (c, p, input) => {
    if (!smbAdmin(c, 'Remove-SmbShare')) return;
    const names = p.Name || (input || []).map(o => o.get('Name'));
    for (const n of names) {
      const s = findShare(c.world, n); if (!s) { shareMissing(c, n, 'Remove-SmbShare'); continue; }
      if (!p.Force) { const ok = await c.should(`*,${s.name}`, 'Remove-Share', { high: true }); if (!ok) continue; }
      c.world.shares.splice(c.world.shares.indexOf(s), 1);
    }
  } });
def({ name: 'Get-SmbShareAccess', module: 'SmbShare', version: '2.0.0.0', cmdType: 'Function', input: 'collect', params: [P('Name', 'string[]', { pos: 0 }), P('InputObject', 'object')],
  run: async (c, p, input) => {
    if (!smbAdmin(c, 'Get-SmbShareAccess')) return;
    const names = p.Name || (input || []).map(o => o.get('Name'));
    for (const n of names) {
      const s = findShare(c.world, n); if (!s) { shareMissing(c, n, 'Get-SmbShareAccess'); continue; }
      for (const a of s.access || []) c.out(new PSObject(SHA, { Name: s.name, ScopeName: '*', AccountName: a.account, AccessControlType: a.type, AccessRight: a.right }));
    }
  } });
for (const [nm, grant] of [['Grant-SmbShareAccess', true], ['Revoke-SmbShareAccess', false]]) def({ name: nm, module: 'SmbShare', version: '2.0.0.0', cmdType: 'Function', input: 'none', sp: true,
  params: [P('Name', 'string[]', { pos: 0, mandatory: true }), P('AccountName', 'string[]', { mandatory: true }), P('AccessRight', 'enum', { values: ['Full', 'Change', 'Read', 'Custom'], mandatory: grant }), P('Force', 'switch')],
  run: async (c, p) => {
    if (!smbAdmin(c, nm)) return;
    for (const n of p.Name) {
      const s = findShare(c.world, n); if (!s) { shareMissing(c, n, nm); continue; }
      for (const a of p.AccountName) {
        const acc = resolveAccount(c.world, a);
        if (!acc) { c.error('Zuordnungen von Kontennamen und Sicherheitskennungen wurden nicht durchgeführt. ', { category: 'NotSpecified', exception: 'Microsoft.Management.Infrastructure.CimException', fqid: 'Windows System Error 1332,' + nm, noClass: true }); continue; }
        if (!p.Force && !(await c.should(`*,${s.name}`, grant ? 'Grant-Access' : 'Revoke-Access', { high: true }))) continue;
        s.access = (s.access || []).filter(x => x.account.toLowerCase() !== acc.toLowerCase());
        if (grant) s.access.push({ account: acc, right: p.AccessRight, type: 'Allow' });
        for (const x of s.access) c.out(new PSObject(SHA, { Name: s.name, ScopeName: '*', AccountName: x.account, AccessControlType: x.type, AccessRight: x.right }));
      }
    }
  } });

/* =================== PowerShellGet =================== */
const GALLERY = [
  { name: 'PSWindowsUpdate', version: '2.2.1.5', desc: 'This module contain cmdlets to manage Windows Update Client.', author: 'Michal Gajda' },
  { name: 'ImportExcel', version: '7.8.10', desc: 'PowerShell module to import/export Excel spreadsheets, without Excel.', author: 'Douglas Finke' },
  { name: 'Pester', version: '5.7.1', desc: 'Pester provides a framework for running BDD style Tests to execute and validate PowerShell commands inside of PowerShell.', author: 'Pester Team' },
  { name: 'PSReadLine', version: '2.3.6', desc: 'Great command line editing in the PowerShell console host', author: 'Microsoft Corporation' },
  { name: 'PSScriptAnalyzer', version: '1.23.0', desc: 'PSScriptAnalyzer provides script analysis and checks for potential code defects in the scripts by applying a group of built-in or customized rules on the scripts being analyzed.', author: 'Microsoft Corporation' },
  { name: 'PSWriteHTML', version: '1.28.0', desc: 'PSWriteHTML is fast and easy way to create HTML reports.', author: 'Przemyslaw Klys' }
];
GG.GALLERY = GALLERY;
GG.view('Microsoft.PowerShell.Commands.PSRepositoryItemInfo', { table: [{ l: 'Version', p: 'Version', w: 10 }, { l: 'Name', p: 'Name', w: 30 }, { l: 'Repository', p: 'Repository', w: 20 }, { l: 'Description', p: 'Description' }] });
GG.view('Microsoft.PowerShell.Commands.PSRepository', { table: [{ l: 'Name', p: 'Name', w: 25 }, { l: 'InstallationPolicy', p: 'InstallationPolicy', w: 18 }, { l: 'SourceLocation', p: 'SourceLocation' }] });
GG.view('Microsoft.PackageManagement.Implementation.PackageProvider', { table: [{ l: 'Name', p: 'Name', w: 20 }, { l: 'Version', p: 'Version', w: 16 }, { l: 'DynamicOptions', p: 'DynamicOptions' }] });
async function ensureNuget(c) {
  if (c.world.nuget) return true;
  const ans = await c.host.choice('Der NuGet-Anbieter ist erforderlich, um den Vorgang fortzusetzen.', `PowerShellGet erfordert die NuGet-Anbieterversion 2.8.5.201 oder höher für die Interaktion mit NuGet-basierten Repositorys. Der NuGet-Anbieter muss in "C:\\Program Files\\PackageManagement\\ProviderAssemblies" oder "C:\\Users\\${c.session.user}\\AppData\\Local\\PackageManagement\\ProviderAssemblies" verfügbar sein. Sie können den NuGet-Anbieter auch durch Ausführen von 'Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force' installieren. Möchten Sie den NuGet-Anbieter jetzt durch PowerShellGet installieren und importieren lassen?`, [{ key: 'J', label: 'Ja' }, { key: 'N', label: 'Nein' }, { key: 'H', label: 'Anhalten' }], 0);
  if (ans === 'H') throw new GG.StopSignal();
  if (ans !== 'J') { c.error('Der NuGet-Anbieter ist erforderlich, um mit NuGet-basierten Repositorys zu interagieren. Stellen Sie sicher, dass mindestens Version 2.8.5.201 des NuGet-Anbieters installiert ist.', { category: 'InvalidOperation', exception: 'System.InvalidOperationException', fqid: 'CouldNotInstallNuGetProvider,Install-NuGetClientBinaries', noClass: true }); return false; }
  if (!GG.netw.internet(c.world)) { c.error('Der Download von "https://go.microsoft.com/fwlink/?LinkID=627338&clcid=0x409" ist nicht möglich. Prüfen Sie Ihre Internetverbindung.', { category: 'InvalidData', fqid: 'UnableToDownloadThePackageProvider', noClass: true }); return false; }
  c.world.nuget = true;
  return true;
}
function galleryReachable(c, cmd) {
  if (GG.netw.internet(c.world)) return true;
  c.error('Die Paketquelle "https://www.powershellgallery.com/api/v2" kann nicht aufgelöst werden.', { category: 'ObjectNotFound', exception: 'Microsoft.PowerShell.PackageManagement.Cmdlets.' + cmd.replace('-', ''), fqid: 'SourceNotFound,Microsoft.PowerShell.PackageManagement.Cmdlets.' + cmd.replace('-', ''), noClass: true, target: 'https://www.powershellgallery.com/api/v2' });
  return false;
}
def({ name: 'Find-Module', module: 'PowerShellGet', version: '1.0.0.1', cmdType: 'Function', input: 'none', params: [P('Name', 'string[]', { pos: 0 }), P('Repository', 'string[]'), P('RequiredVersion', 'string'), P('Tag', 'string[]'), P('Filter', 'string')],
  run: async (c, p) => {
    if (!(await ensureNuget(c))) return;
    if (!galleryReachable(c, 'Find-Package')) return;
    for (const n of p.Name || ['*']) {
      const m = GALLERY.filter(g => V.like(g.name, n) || (p.Filter && V.like(g.desc, '*' + p.Filter + '*')));
      if (!m.length && !V.hasWild(n)) { c.error(`Für die angegebenen Suchkriterien und den Modulnamen "${n}" wurde keine Übereinstimmung gefunden. Führen Sie "Get-PSRepository" aus, um alle verfügbaren registrierten Modulrepositorys anzuzeigen.`, { category: 'ObjectNotFound', exception: 'System.Exception', fqid: 'NoMatchFoundForCriteria,Microsoft.PowerShell.PackageManagement.Cmdlets.FindPackage', noClass: true, target: n }); continue; }
      for (const g of m) c.out(new PSObject('Microsoft.PowerShell.Commands.PSRepositoryItemInfo', { Name: g.name, Version: GG.versionObj(g.version), Type: 'Module', Description: g.desc, Author: g.author, Repository: 'PSGallery', PublishedDate: new PSDate(GG.ago(120)) }));
    }
  } });
def({ name: 'Install-Module', module: 'PowerShellGet', version: '1.0.0.1', cmdType: 'Function', input: 'collect', sp: true, params: [P('Name', 'string[]', { pos: 0, mandatory: true }), P('Scope', 'enum', { values: ['CurrentUser', 'AllUsers'] }), P('Force', 'switch'), P('RequiredVersion', 'string'), P('AllowClobber', 'switch'), P('Repository', 'string[]'), P('SkipPublisherCheck', 'switch'), P('Confirm', 'switch')],
  run: async (c, p, input) => {
    const names = p.Name || (input || []).map(o => V.toStr(o.get ? o.get('Name') : o));
    const scope = p.Scope || 'AllUsers';
    if (!(await ensureNuget(c))) return;
    if (!galleryReachable(c, 'Install-Package')) return;
    for (const n of names) {
      const g = GALLERY.find(x => x.name.toLowerCase() === n.toLowerCase());
      if (!g) { c.error(`Für die angegebenen Suchkriterien und den Modulnamen "${n}" wurde keine Übereinstimmung gefunden. Führen Sie "Get-PSRepository" aus, um alle verfügbaren registrierten Modulrepositorys anzuzeigen.`, { category: 'ObjectNotFound', exception: 'System.Exception', fqid: 'NoMatchFoundForCriteria,Microsoft.PowerShell.PackageManagement.Cmdlets.InstallPackage', noClass: true, target: n }); continue; }
      if (scope === 'AllUsers' && !c.session.elevated && !c.session.remoteOrigin) { c.error(`Administratorrechte sind erforderlich, um "${g.name}" in "C:\\Program Files\\WindowsPowerShell\\Modules" zu installieren. Melden Sie sich mit Administratorrechten am Computer an, und wiederholen Sie den Vorgang, oder installieren Sie "C:\\Users\\${c.session.user}\\Documents\\WindowsPowerShell\\Modules", indem Sie dem Befehl den Parameter "Scope CurrentUser" hinzufügen. Sie können auch von einer Windows PowerShell-Sitzung mit erhöhten Rechten ("Als Administrator ausführen") aus installieren.`, { category: 'InvalidArgument', exception: 'System.ArgumentException', fqid: 'InstallModuleNeedsCurrentUserScopeParameterForNonAdminUser,Install-Module', noClass: true, target: '' }); continue; }
      if (!c.world.psRepoTrusted && !p.Force) {
        const ans = await c.host.choice('Nicht vertrauenswürdiges Repository', 'Sie installieren die Module aus einem nicht vertrauenswürdigen Repository. Wenn Sie diesem Repository vertrauen, ändern Sie dessen InstallationPolicy-Wert, indem Sie das Set-PSRepository-Cmdlet ausführen. Möchten Sie die Module von "PSGallery" wirklich installieren?', GG.CHOICE_YANKH, 2);
        if (ans === 'H') throw new GG.StopSignal();
        if (ans !== 'J' && ans !== 'A') continue;
      }
      const ex = c.world.modules.find(x => x.name.toLowerCase() === g.name.toLowerCase());
      if (ex && !p.Force) { c.host.write(`WARNUNG: Version "${g.version}" des Moduls "${g.name}" ist bereits unter "${ex.scope === 'CurrentUser' ? 'C:\\Users\\' + c.session.user + '\\Documents' : 'C:\\Program Files'}\\WindowsPowerShell\\Modules\\${g.name}\\${g.version}" installiert. Um Version "${g.version}" zu installieren, führen Sie "Install-Module" aus, und fügen Sie den Parameter "-Force" hinzu. Dieser Befehl installiert Version "${g.version}" parallel zur installierten Version.`, { color: 'yellow' }); continue; }
      if (c.host.sleep) await c.host.sleep(500);
      c.world.modules = c.world.modules.filter(x => x.name.toLowerCase() !== g.name.toLowerCase());
      c.world.modules.push({ name: g.name, version: g.version, scope, type: 'Script', desc: g.desc, gallery: true });
    }
  } });
def({ name: 'Get-InstalledModule', module: 'PowerShellGet', version: '1.0.0.1', cmdType: 'Function', input: 'none', params: [P('Name', 'string[]', { pos: 0 })],
  run: async (c, p) => {
    if (!(await ensureNuget(c))) return;
    const list = c.world.modules.filter(m => m.gallery && (!p.Name || p.Name.some(n => V.like(m.name, n))));
    if (p.Name && !list.length) return c.error(`Für die angegebenen Suchkriterien und den Modulnamen "${p.Name[0]}" wurde keine Übereinstimmung gefunden.`, { category: 'ObjectNotFound', exception: 'System.Exception', fqid: 'NoMatchFound,Microsoft.PowerShell.PackageManagement.Cmdlets.GetPackage', noClass: true, target: p.Name[0] });
    c.outAll(list.map(m => new PSObject('Microsoft.PowerShell.Commands.PSRepositoryItemInfo', { Version: GG.versionObj(m.version), Name: m.name, Repository: 'PSGallery', Description: m.desc || '', InstalledLocation: (m.scope === 'CurrentUser' ? `C:\\Users\\${c.session.user}\\Documents` : 'C:\\Program Files') + '\\WindowsPowerShell\\Modules\\' + m.name + '\\' + m.version })));
  } });
def({ name: 'Uninstall-Module', module: 'PowerShellGet', version: '1.0.0.1', cmdType: 'Function', input: 'none', sp: true, params: [P('Name', 'string[]', { pos: 0, mandatory: true }), P('Force', 'switch'), P('AllVersions', 'switch')],
  run: async (c, p) => { for (const n of p.Name) { const m = c.world.modules.find(x => x.gallery && x.name.toLowerCase() === n.toLowerCase()); if (!m) { c.error(`Für die angegebenen Suchkriterien und den Modulnamen "${n}" wurde keine Übereinstimmung gefunden.`, { category: 'ObjectNotFound', fqid: 'NoMatchFound', noClass: true }); continue; } if (m.scope === 'AllUsers' && !c.session.elevated) { c.error('Administratorrechte sind erforderlich, um das Modul zu deinstallieren.', { category: 'PermissionDenied', fqid: 'AdminPrivilegesAreRequiredForUninstall', noClass: true }); continue; } c.world.modules.splice(c.world.modules.indexOf(m), 1); c.session.modulesLoaded.delete(n.toLowerCase()); } } });
def({ name: 'Get-PSRepository', module: 'PowerShellGet', version: '1.0.0.1', cmdType: 'Function', input: 'none', params: [P('Name', 'string[]', { pos: 0 })],
  run: async (c) => { if (!(await ensureNuget(c))) return; c.out(new PSObject('Microsoft.PowerShell.Commands.PSRepository', { Name: 'PSGallery', InstallationPolicy: c.world.psRepoTrusted ? 'Trusted' : 'Untrusted', SourceLocation: 'https://www.powershellgallery.com/api/v2' })); } });
def({ name: 'Set-PSRepository', module: 'PowerShellGet', version: '1.0.0.1', cmdType: 'Function', input: 'none', params: [P('Name', 'string', { pos: 0, mandatory: true }), P('InstallationPolicy', 'enum', { values: ['Trusted', 'Untrusted'] }), P('SourceLocation', 'string')],
  run: async (c, p) => { if (!(await ensureNuget(c))) return; if (!/^psgallery$/i.test(p.Name)) return c.error(`Das Repository "${p.Name}" wurde nicht gefunden.`, { category: 'ObjectNotFound', fqid: 'RepositoryNotFound', noClass: true }); if (p.InstallationPolicy) c.world.psRepoTrusted = p.InstallationPolicy === 'Trusted'; } });
def({ name: 'Get-PackageProvider', module: 'PackageManagement', version: '1.0.0.1', input: 'none', params: [P('Name', 'string[]', { pos: 0 }), P('ListAvailable', 'switch')],
  run: async (c) => { const list = [['msi', '3.0.0.0', 'AdditionalArguments'], ['msu', '3.0.0.0', ''], ['PowerShellGet', '1.0.0.1', 'PackageManagementProvider, Type, Scope, AllowClobber, SkipPublisherCheck, InstallUpdate, NoPathUpdate, Filter, Tag, Includes, DscResource, RoleCapability, Command, PublishLocation, ScriptSourceLocation, ScriptPublishLocation'], ['Programs', '3.0.0.0', 'IncludeWindowsInstaller, IncludeSystemComponent']]; if (c.world.nuget) list.unshift(['NuGet', '2.8.5.208', 'Destination, ExcludeVersion, Scope, SkipDependencies, Headers, FilterOnTag, Contains, AllowPrereleaseVersions, ConfigFile, SkipValidate']); c.outAll(list.map(([n, v, d]) => new PSObject('Microsoft.PackageManagement.Implementation.PackageProvider', { Name: n, Version: GG.versionObj(v), DynamicOptions: d }))); } });
def({ name: 'Install-PackageProvider', module: 'PackageManagement', version: '1.0.0.1', input: 'none', params: [P('Name', 'string[]', { pos: 0, mandatory: true }), P('MinimumVersion', 'string'), P('Force', 'switch'), P('Scope', 'enum', { values: ['CurrentUser', 'AllUsers'] })],
  run: async (c, p) => {
    if (!p.Name.some(n => /^nuget$/i.test(n))) return c.error(`Für die angegebenen Suchkriterien für den Anbieter "${p.Name[0]}" wurde keine Übereinstimmung gefunden.`, { category: 'InvalidArgument', fqid: 'NoMatchFoundForProvider', noClass: true });
    if ((p.Scope || 'AllUsers') === 'AllUsers' && !c.session.elevated) return c.error('Administratorrechte sind erforderlich, um den Paketanbieter für alle Benutzer zu installieren. Verwenden Sie "-Scope CurrentUser" oder starten Sie Windows PowerShell als Administrator.', { category: 'InvalidOperation', fqid: 'InstallRequiresCurrentUserScopeParameterForNonAdminUser', noClass: true });
    if (!GG.netw.internet(c.world)) return c.error('Der Download des Anbieters ist nicht möglich. Prüfen Sie Ihre Internetverbindung.', { category: 'InvalidData', fqid: 'UnableToDownloadThePackageProvider', noClass: true });
    c.world.nuget = true;
    c.out(new PSObject('Microsoft.PackageManagement.Implementation.PackageProvider', { Name: 'nuget', Version: GG.versionObj('2.8.5.208'), Source: 'https://onegetcdn.azureedge.net/providers/nuget-2.8.5.208.package.swidtag', Summary: 'NuGet provider for the OneGet meta-package manager' }));
  } });

/* PSWindowsUpdate */
GG.view('PSWindowsUpdate.WindowsUpdate', { table: [{ l: 'ComputerName', p: 'ComputerName', w: 12 }, { l: 'Status', p: 'Status', w: 10 }, { l: 'KB', p: 'KB', w: 11 }, { l: 'Size', p: 'Size', w: 6, a: 'r' }, { l: 'Title', p: 'Title' }] });
GG.view('PSWindowsUpdate.History', { table: [{ l: 'ComputerName', p: 'ComputerName', w: 12 }, { l: 'Operationname', p: 'Operationname', w: 13 }, { l: 'Result', p: 'Result', w: 10 }, { l: 'Date', g: o => V.fmtDateDE(o.get('Date').d), w: 19 }, { l: 'Title', p: 'Title' }] });
def({ name: 'Get-WindowsUpdate', module: 'PSWindowsUpdate', version: '2.2.1.5', aliases: ['Get-WUList'], input: 'none', params: [P('KBArticleID', 'string[]'), P('Install', 'switch'), P('AcceptAll', 'switch'), P('IgnoreReboot', 'switch'), P('ComputerName', 'string[]'), P('MicrosoftUpdate', 'switch')],
  run: async (c, p) => {
    if (!c.session.elevated && !c.session.remoteOrigin) return c.error('Zugriff verweigert. (Ausnahme von HRESULT: 0x80070005 (E_ACCESSDENIED))', { category: 'NotSpecified', exception: 'System.UnauthorizedAccessException', fqid: 'System.UnauthorizedAccessException,PSWindowsUpdate.GetWindowsUpdate', noClass: true });
    const list = (c.world.pendingUpdates || []).filter(u => !p.KBArticleID || p.KBArticleID.some(k => V.like(u.kb, '*' + k.replace(/^KB/i, '') + '*')));
    for (const u of list) {
      if (p.Install && p.AcceptAll) { c.world.hotfixes.push({ id: u.kb, desc: /Sicherheit|Kumulativ/.test(u.title) ? 'Security Update' : 'Update', on: new Date(), by: c.session.identity }); u.done = true; }
      c.out(new PSObject('PSWindowsUpdate.WindowsUpdate', { ComputerName: c.world.hostname, Status: p.Install && p.AcceptAll ? 'AD-I----' : '-------', KB: u.kb, Size: u.size, Title: u.title }));
    }
    if (p.Install && p.AcceptAll) c.world.pendingUpdates = (c.world.pendingUpdates || []).filter(u => !u.done);
  } });
def({ name: 'Get-WUHistory', module: 'PSWindowsUpdate', version: '2.2.1.5', input: 'none', params: [P('Last', 'int')],
  run: async (c, p) => { let list = (c.world.hotfixes || []).slice().reverse(); if (p.Last) list = list.slice(0, p.Last); c.outAll(list.map(h => new PSObject('PSWindowsUpdate.History', { ComputerName: c.world.hostname, Operationname: 'Installation', Result: 'Succeeded', Date: new PSDate(h.on), Title: h.title || ('Update ' + h.id) }))); } });

})();
