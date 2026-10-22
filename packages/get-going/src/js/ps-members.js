/* Get-Going! – Member-Zugriff, Methoden, statische Typen */
(function () {
'use strict';
const GG = globalThis.GG = globalThis.GG || {};
const V = GG.v;
const { PSObject, PSHash, ScriptBlock, PSDate, TimeSpan, SecureString, ErrorRecord, PSRuntimeError } = GG;
const M = GG.members = {};

function err(o) { return new PSRuntimeError(new ErrorRecord(o)); }
function methodExc(name, argc, msg, fqid) {
  return err({ message: `Ausnahme beim Aufrufen von "${name}" mit ${argc} Argument(en):  "${msg}"`, category: 'NotSpecified', exception: 'System.Management.Automation.MethodInvocationException', fqid: fqid || 'MethodInvocationException', reason: 'MethodInvocationException' });
}
GG.methodExc = methodExc;
function noMethod(obj, name) {
  return err({ message: `Fehler beim Aufrufen der Methode, da [${typeof obj === 'object' && obj && obj.typeObj ? obj.fullName : V.typeOf(obj)}] keine Methode mit dem Namen "${name}" enthält.`, category: 'InvalidOperation', exception: 'System.Management.Automation.RuntimeException', fqid: 'MethodNotFound' });
}

/* ---------- Typobjekte ---------- */
const BASE = {
  'System.String': 'System.Object', 'System.Int32': 'System.ValueType', 'System.Int64': 'System.ValueType', 'System.Double': 'System.ValueType',
  'System.Boolean': 'System.ValueType', 'System.Object[]': 'System.Array', 'System.Collections.Hashtable': 'System.Object', 'System.DateTime': 'System.ValueType',
  'System.Management.Automation.PSCustomObject': 'System.Object', 'System.ServiceProcess.ServiceController': 'System.ComponentModel.Component',
  'System.IO.FileInfo': 'System.IO.FileSystemInfo', 'System.IO.DirectoryInfo': 'System.IO.FileSystemInfo', 'System.Diagnostics.Process': 'System.ComponentModel.Component',
  'System.TimeSpan': 'System.ValueType', 'System.Management.Automation.ErrorRecord': 'System.Object', 'System.Security.SecureString': 'System.Object',
  'System.Management.Automation.ScriptBlock': 'System.Object', 'System.Collections.Specialized.OrderedDictionary': 'System.Object'
};
GG.typeObj = function (fullName) {
  const name = fullName.split('.').pop();
  const o = new PSObject('System.RuntimeType', { IsPublic: true, IsSerial: true, Name: name, BaseType: BASE[fullName] || 'System.Object', FullName: fullName, Namespace: fullName.split('.').slice(0, -1).join('.') });
  o.typeObj = true; o.fullName = fullName;
  o.toStringFn = () => fullName;
  return o;
};
GG.isType = function (v, tn) {
  if (!tn) return false;
  const t = tn.toLowerCase();
  if (t === 'system.object') return v !== null && v !== undefined;
  const vt = V.typeOf(v);
  if (!vt) return false;
  if (vt.toLowerCase() === t) return true;
  if (t === 'system.array') return Array.isArray(v);
  if (t === 'system.valuetype') return typeof v === 'number' || typeof v === 'boolean' || v instanceof PSDate || v instanceof TimeSpan;
  if ((t === 'system.int32' || t === 'system.int64') && typeof v === 'number') return Number.isInteger(v);
  if (t === 'system.management.automation.psobject') return true;
  if (v instanceof PSObject) return v.typeNames.some(x => x.toLowerCase() === t || x.split('.').pop().toLowerCase() === t);
  return false;
};

/* ---------- Hilfsobjekte ---------- */
GG.pathInfo = function (p) {
  const o = new PSObject('System.Management.Automation.PathInfo', { Drive: p.split(':')[0], Provider: GG.providerOf ? GG.providerOf(p) : 'Microsoft.PowerShell.Core\\FileSystem', ProviderPath: p, Path: p });
  o.toStringFn = () => p;
  return o;
};
GG.versionObj = function (s) {
  const ps = s.split('.').map(Number);
  const o = new PSObject('System.Version', {});
  ['Major', 'Minor', 'Build', 'Revision'].forEach((k, i) => o.add(k, ps[i] === undefined ? -1 : ps[i]));
  o.toStringFn = () => s; o.sortKey = ps.reduce((a, x) => a * 100000 + x, 0);
  return o;
};
GG.psVersionTable = function () {
  const h = new PSHash(true);
  h.set('PSVersion', GG.versionObj('5.1.26100.2161'));
  h.set('PSEdition', 'Desktop');
  h.set('PSCompatibleVersions', ['1.0', '2.0', '3.0', '4.0', '5.0', '5.1.26100.2161'].map(GG.versionObj));
  h.set('BuildVersion', GG.versionObj('10.0.26100.2161'));
  h.set('CLRVersion', GG.versionObj('4.0.30319.42000'));
  h.set('WSManStackVersion', GG.versionObj('3.0'));
  h.set('PSRemotingProtocolVersion', GG.versionObj('2.3'));
  h.set('SerializationVersion', GG.versionObj('1.1.0.1'));
  return h;
};
GG.hostObj = function (ctx) {
  const ui = new PSObject('System.Management.Automation.Internal.Host.InternalHostUserInterface', {});
  const raw = new PSObject('System.Management.Automation.Internal.Host.InternalHostRawUserInterface', { ForegroundColor: 'DarkYellow', BackgroundColor: 'DarkMagenta', WindowTitle: ctx.session.elevated ? 'Administrator: Windows PowerShell' : 'Windows PowerShell', WindowSize: '120,30', BufferSize: '120,3000' });
  ui.add('RawUI', raw);
  return new PSObject('System.Management.Automation.Internal.Host.InternalHost', {
    Name: 'ConsoleHost', Version: GG.versionObj('5.1.26100.2161'), InstanceId: '6f1c3a2e-91b4-4d7e-a0c2-3b8e5f1d2a77', UI: ui,
    CurrentCulture: 'de-DE', CurrentUICulture: 'de-DE', PrivateData: 'Microsoft.PowerShell.ConsoleHost+ConsoleColorProxy', DebuggerEnabled: true, IsRunspacePushed: !!ctx.session.remote, Runspace: 'System.Management.Automation.Runspaces.LocalRunspace'
  });
};

/* ---------- Umgebungsvariablen ---------- */
GG.envAll = function (ctx) {
  const s = ctx.session, w = ctx.world;
  const u = s.user;
  const base = [
    ['ALLUSERSPROFILE', 'C:\\ProgramData'], ['APPDATA', `C:\\Users\\${u}\\AppData\\Roaming`], ['CommonProgramFiles', 'C:\\Program Files\\Common Files'],
    ['COMPUTERNAME', w.hostname], ['ComSpec', 'C:\\Windows\\system32\\cmd.exe'], ['HOMEDRIVE', 'C:'], ['HOMEPATH', `\\Users\\${u}`],
    ['LOCALAPPDATA', `C:\\Users\\${u}\\AppData\\Local`], ['LOGONSERVER', w.dc ? '\\\\' + w.dc : '\\\\' + w.hostname], ['NUMBER_OF_PROCESSORS', '4'], ['OS', 'Windows_NT'],
    ['Path', 'C:\\Windows\\system32;C:\\Windows;C:\\Windows\\System32\\Wbem;C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\;C:\\Windows\\System32\\OpenSSH\\;' + (w.envPathExtra || '') + `C:\\Users\\${u}\\AppData\\Local\\Microsoft\\WindowsApps`],
    ['PATHEXT', '.COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC;.CPL'], ['PROCESSOR_ARCHITECTURE', 'AMD64'], ['ProgramData', 'C:\\ProgramData'],
    ['ProgramFiles', 'C:\\Program Files'], ['ProgramFiles(x86)', 'C:\\Program Files (x86)'], ['PSModulePath', `C:\\Users\\${u}\\Documents\\WindowsPowerShell\\Modules;C:\\Program Files\\WindowsPowerShell\\Modules;C:\\Windows\\system32\\WindowsPowerShell\\v1.0\\Modules`],
    ['PUBLIC', 'C:\\Users\\Public'], ['SystemDrive', 'C:'], ['SystemRoot', 'C:\\Windows'], ['TEMP', `C:\\Users\\${u}\\AppData\\Local\\Temp`], ['TMP', `C:\\Users\\${u}\\AppData\\Local\\Temp`],
    ['USERDNSDOMAIN', (w.domain || '').toUpperCase()], ['USERDOMAIN', s.domain], ['USERNAME', u], ['USERPROFILE', `C:\\Users\\${u}`], ['windir', 'C:\\Windows']
  ];
  const map = new Map(base.map(([k, v]) => [k.toLowerCase(), [k, v]]));
  for (const [k, v] of Object.entries(w.envMachine || {})) map.set(k.toLowerCase(), [k, v]);
  for (const [k, v] of Object.entries(s.env)) { if (v === null) map.delete(k.toLowerCase()); else map.set(k.toLowerCase(), [k, v]); }
  return [...map.values()].sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()));
};
GG.envGet = function (ctx, name) { const e = GG.envAll(ctx).find(x => x[0].toLowerCase() === name.toLowerCase()); return e ? e[1] : null; };
GG.envSet = function (ctx, name, v) {
  const ex = GG.envAll(ctx).find(x => x[0].toLowerCase() === name.toLowerCase());
  for (const k of Object.keys(ctx.session.env)) if (k.toLowerCase() === name.toLowerCase()) delete ctx.session.env[k];
  ctx.session.env[ex ? ex[0] : name] = v === '' ? null : v;
};

/* ---------- Get ---------- */
M.get = function (obj, name, ctx) {
  const k = name.toLowerCase();
  if (obj === null || obj === undefined) return k === 'count' || k === 'length' ? 0 : null;
  if (k === 'psobject') return M.psobjectInfo(obj);
  if (obj instanceof PSObject) {
    if (obj.has(name)) { const v = obj.get(name); return v === undefined ? null : v; }
    if (k === 'count' || k === 'length') return 1;
    return null;
  }
  if (Array.isArray(obj)) {
    if (k === 'count' || k === 'length' || k === 'longlength') return obj.length;
    if (k === 'rank') return 1;
    if (k === 'issynchronized' || k === 'isfixedsize') return k === 'isfixedsize';
    // Member-Enumeration
    const res = [];
    for (const x of obj) {
      const v = M.get(x, name, ctx);
      if (v === null || v === undefined) { if (x instanceof PSObject && x.has(name)) res.push(null); continue; }
      if (Array.isArray(v)) for (const y of v) res.push(y); else res.push(v);
    }
    return res.length === 0 ? null : (res.length === 1 ? res[0] : res);
  }
  if (typeof obj === 'string') { if (k === 'length') return obj.length; if (k === 'count') return 1; if (k === 'chars') return null; return null; }
  if (obj instanceof PSHash) {
    if (k === 'count') return obj.size;
    if (k === 'keys') return obj.keys();
    if (k === 'values') return obj.values();
    if (k === 'isreadonly' || k === 'isfixedsize' || k === 'issynchronized') return false;
    const v = obj.get(name); return v === undefined ? null : v;
  }
  if (obj instanceof PSDate) {
    const d = obj.d;
    switch (k) {
      case 'year': return d.getFullYear(); case 'month': return d.getMonth() + 1; case 'day': return d.getDate();
      case 'hour': return d.getHours(); case 'minute': return d.getMinutes(); case 'second': return d.getSeconds(); case 'millisecond': return d.getMilliseconds();
      case 'dayofweek': return V.DAYS_EN[d.getDay()]; case 'dayofyear': { const st = new Date(d.getFullYear(), 0, 0); return Math.floor((d - st) / 864e5); }
      case 'date': return new PSDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
      case 'timeofday': return new TimeSpan(d.getHours() * 36e5 + d.getMinutes() * 6e4 + d.getSeconds() * 1000 + d.getMilliseconds());
      case 'ticks': return (d.getTime() + 62135596800000) * 10000; case 'kind': return 'Local';
      case 'count': case 'length': return 1;
    }
    return null;
  }
  if (obj instanceof TimeSpan) {
    const ms = obj.ms, sgn = ms < 0 ? -1 : 1, a = Math.abs(ms);
    switch (k) {
      case 'days': return sgn * Math.floor(a / 864e5); case 'hours': return sgn * (Math.floor(a / 36e5) % 24); case 'minutes': return sgn * (Math.floor(a / 6e4) % 60);
      case 'seconds': return sgn * (Math.floor(a / 1000) % 60); case 'milliseconds': return sgn * Math.floor(a % 1000);
      case 'totaldays': return ms / 864e5; case 'totalhours': return ms / 36e5; case 'totalminutes': return ms / 6e4; case 'totalseconds': return ms / 1000; case 'totalmilliseconds': return ms;
      case 'ticks': return ms * 10000; case 'count': case 'length': return 1;
    }
    return null;
  }
  if (obj instanceof SecureString) { if (k === 'length') return obj.plain.length; return null; }
  if (obj instanceof ErrorRecord) return M.errorMember(obj, k);
  if (obj instanceof GG.EnumVal) { if (k === 'value__') return obj.value; return null; }
  if (obj instanceof ScriptBlock) { if (k === 'ast') return obj.text; if (k === 'file') return obj.src && obj.src.file; return null; }
  if (k === 'count' || k === 'length') return 1;
  return null;
};

M.psobjectInfo = function (obj) {
  const props = [];
  if (obj instanceof PSObject) for (const n of obj.names()) { const v = obj.get(n); props.push(new PSObject('System.Management.Automation.PSNoteProperty', { Value: v, MemberType: 'NoteProperty', IsSettable: true, IsGettable: true, TypeNameOfValue: V.typeOf(v) || 'System.Object', Name: n })); }
  if (obj instanceof PSHash) for (const n of ['IsReadOnly', 'IsFixedSize', 'IsSynchronized', 'Keys', 'Values', 'SyncRoot', 'Count']) props.push(new PSObject('System.Management.Automation.PSProperty', { Name: n, MemberType: 'Property' }));
  const tn = obj instanceof PSObject ? obj.typeNames.concat(['System.Object']) : [V.typeOf(obj), 'System.Object'];
  return new PSObject('System.Management.Automation.PSObject', { Properties: props, TypeNames: tn, BaseObject: obj });
};

M.errorMember = function (r, k) {
  switch (k) {
    case 'exception': {
      const ex = new PSObject([r.exception, 'System.Exception'], { Message: r.message, Data: '{}', InnerException: null, TargetSite: null, StackTrace: null, HelpLink: null, Source: null, HResult: -2146233087 });
      if (r.exception === 'System.Management.Automation.ItemNotFoundException') ex.add('ItemName', r.target);
      ex.toStringFn = () => `${r.exception}: ${r.message}`;
      ex.excType = r.exception;
      return ex;
    }
    case 'categoryinfo': {
      const ci = new PSObject('System.Management.Automation.ErrorCategoryInfo', { Category: r.category, Activity: r.cmd || r.activity, Reason: r.reason, TargetName: V.toStr(r.target), TargetType: r.targetType });
      ci.toStringFn = () => GG.fmt.catInfo(r);
      return ci;
    }
    case 'fullyqualifiederrorid': return r.fqid;
    case 'targetobject': return r.target === '' ? null : r.target;
    case 'errordetails': return null;
    case 'invocationinfo': return new PSObject('System.Management.Automation.InvocationInfo', { MyCommand: r.cmd || null, ScriptLineNumber: r.pos ? r.pos.line : 0, OffsetInLine: r.pos ? r.pos.col : 0, ScriptName: r.pos && r.pos.file ? r.pos.file : '', Line: r.pos ? r.pos.text : '', PositionMessage: r.pos ? GG.fmt.posLines(r.pos).join('\n') : '' });
    case 'scriptstacktrace': return r.pos ? (r.pos.file ? `bei <ScriptBlock>, ${r.pos.file}: Zeile ${r.pos.line}` : `bei <ScriptBlock>, <Keine Datei>: Zeile ${r.pos.line}`) : 'bei <ScriptBlock>, <Keine Datei>: Zeile 1';
    case 'pipelineiterationinfo': return [];
    case 'message': return null;
  }
  return null;
};

/* ---------- Set ---------- */
M.set = function (obj, name, val, ctx) {
  if (obj === null || obj === undefined) throw err({ message: `Die Eigenschaft "${name}" wurde für dieses Objekt nicht gefunden. Vergewissern Sie sich, dass die Eigenschaft vorhanden ist und festgelegt werden kann.`, category: 'InvalidOperation', fqid: 'PropertyNotFound' });
  if (obj instanceof PSHash) { obj.set(name, val); return; }
  if (obj instanceof PSObject) {
    const p = obj.props[name.toLowerCase()];
    if (!p) {
      if (obj.typeName === 'System.Management.Automation.PSCustomObject' || /^Selected\./.test(obj.typeName)) throw err({ message: `Die Eigenschaft "${name}" wurde für dieses Objekt nicht gefunden. Vergewissern Sie sich, dass die Eigenschaft vorhanden ist und festgelegt werden kann.`, category: 'InvalidOperation', fqid: 'PropertyAssignmentException' });
      throw err({ message: `Die Eigenschaft "${name}" wurde für dieses Objekt nicht gefunden. Vergewissern Sie sich, dass die Eigenschaft vorhanden ist und festgelegt werden kann.`, category: 'InvalidOperation', fqid: 'PropertyNotFound' });
    }
    if (p.get && !p.set) throw err({ message: `"${p.name}" ist eine schreibgeschützte Eigenschaft.`, category: 'InvalidOperation', fqid: 'PropertyAssignmentException' });
    obj.set(name, val); return;
  }
  if (Array.isArray(obj)) { for (const x of obj) M.set(x, name, val, ctx); return; }
  throw err({ message: `Die Eigenschaft "${name}" wurde für dieses Objekt nicht gefunden. Vergewissern Sie sich, dass die Eigenschaft vorhanden ist und festgelegt werden kann.`, category: 'InvalidOperation', fqid: 'PropertyNotFound' });
};

/* ---------- Methoden ---------- */
M.call = async function (obj, name, args, ctx) {
  const k = name.toLowerCase();
  if (obj === null || obj === undefined) throw err({ message: 'Sie können keine Methode für einen Ausdruck mit dem Wert NULL aufrufen.', category: 'InvalidOperation', exception: 'System.Management.Automation.RuntimeException', fqid: 'InvokeMethodOnNull' });
  if (k === 'gettype') return GG.typeObj(V.typeOf(obj));
  if (k === 'gethashcode') return Math.floor(Math.random() * 1e8);
  if (typeof obj === 'string') return M.strMethod(obj, k, name, args);
  if (typeof obj === 'number') {
    if (k === 'tostring') return args.length ? V.formatValue(obj, V.toStr(args[0])) : V.fmtNum(obj, true);
    if (k === 'equals') return V.eq(obj, args[0]);
    if (k === 'compareto') return Math.sign(obj - V.toNum(args[0]));
    throw noMethod(obj, name);
  }
  if (typeof obj === 'boolean') { if (k === 'tostring') return obj ? 'True' : 'False'; if (k === 'equals') return obj === V.toBool(args[0]); throw noMethod(obj, name); }
  if (Array.isArray(obj)) {
    switch (k) {
      case 'add': if (obj.isList) { obj.push(args[0]); return obj.length - 1; } throw methodExc('Add', 1, 'Die Auflistung hatte eine feste Größe.', 'NotSupportedException');
      case 'remove': if (obj.isList) { const i = obj.findIndex(x => V.eq(x, args[0], true)); if (i >= 0) obj.splice(i, 1); return undefined; } throw methodExc('Remove', 1, 'Die Auflistung hatte eine feste Größe.', 'NotSupportedException');
      case 'contains': return obj.some(x => x === args[0] || (typeof x === 'number' && x === args[0]) || (typeof x === typeof args[0] && x === args[0]));
      case 'indexof': return obj.findIndex(x => V.eq(x, args[0], true));
      case 'tostring': return 'System.Object[]';
      case 'clone': return obj.slice();
      case 'foreach': {
        const sb = args[0]; const res = [];
        if (!(sb instanceof ScriptBlock)) { for (const x of obj) res.push(M.get(x, V.toStr(sb), ctx)); return res; }
        for (const x of obj) { const r = await GG.interp.invokeSB(sb, ctx, { dollar: x }); for (const y of r) res.push(y); }
        return res;
      }
      case 'where': {
        const sb = args[0]; const mode = args[1] ? V.toStr(args[1]).toLowerCase() : 'default'; const n = args[2] ? V.toInt(args[2]) : 0;
        const res = [];
        for (const x of obj) { const r = await GG.interp.invokeSB(sb, ctx, { dollar: x }); if (V.toBool(V.unwrap(r))) { res.push(x); if (mode === 'first' && (n ? res.length >= n : true)) break; } }
        if (mode === 'last') return n ? res.slice(-n) : res.slice(-1);
        return res;
      }
      case 'equals': return obj === args[0];
    }
    // Methoden-Enumeration
    const res = [];
    for (const x of obj) { const r = await M.call(x, name, args, ctx); if (r !== undefined) res.push(r); }
    return res.length === 1 ? res[0] : res;
  }
  if (obj instanceof PSHash) {
    switch (k) {
      case 'containskey': return obj.has(V.toStr(args[0]));
      case 'contains': return obj.has(V.toStr(args[0]));
      case 'containsvalue': return obj.values().some(v => V.eq(v, args[0], true));
      case 'add': if (obj.has(V.toStr(args[0]))) throw methodExc('Add', 2, `Das Element wurde bereits hinzugefügt. Schlüssel im Wörterbuch: "${V.toStr(args[0])}"  Hinzuzufügender Schlüssel: "${V.toStr(args[0])}"`, 'ArgumentException'); obj.set(V.toStr(args[0]), args[1]); return undefined;
      case 'remove': obj.delete(V.toStr(args[0])); return undefined;
      case 'clear': obj.map.clear(); return undefined;
      case 'getenumerator': return obj.entries().map(e => { const o = new PSObject('System.Collections.DictionaryEntry', { Name: e.key, Key: e.key, Value: e.value }); return o; });
      case 'clone': { const h = new PSHash(obj.ordered); for (const e of obj.entries()) h.set(e.key, e.value); return h; }
      case 'tostring': return V.typeOf(obj);
    }
    throw noMethod(obj, name);
  }
  if (obj instanceof PSDate) {
    const add = (ms) => obj.add(ms);
    switch (k) {
      case 'adddays': return add(V.toNum(args[0]) * 864e5);
      case 'addhours': return add(V.toNum(args[0]) * 36e5);
      case 'addminutes': return add(V.toNum(args[0]) * 6e4);
      case 'addseconds': return add(V.toNum(args[0]) * 1000);
      case 'addmilliseconds': return add(V.toNum(args[0]));
      case 'addmonths': { const d = new Date(obj.t); d.setMonth(d.getMonth() + V.toInt(args[0])); return new PSDate(d); }
      case 'addyears': { const d = new Date(obj.t); d.setFullYear(d.getFullYear() + V.toInt(args[0])); return new PSDate(d); }
      case 'tostring': return args.length ? V.netDateFormat(obj.d, V.toStr(args[0])) : V.fmtDateDE(obj.d);
      case 'toshortdatestring': return V.fmtDateShort(obj.d);
      case 'tolongdatestring': return V.netDateFormat(obj.d, 'D');
      case 'toshorttimestring': return V.netDateFormat(obj.d, 't');
      case 'tolongtimestring': return V.netDateFormat(obj.d, 'T');
      case 'subtract': return args[0] instanceof PSDate ? new TimeSpan(obj.t - args[0].t) : obj.add(-(args[0] instanceof TimeSpan ? args[0].ms : V.toNum(args[0])));
      case 'compareto': return Math.sign(obj.t - (args[0] instanceof PSDate ? args[0].t : 0));
      case 'equals': return args[0] instanceof PSDate && args[0].t === obj.t;
      case 'touniversaltime': return obj.add(obj.d.getTimezoneOffset() * 6e4);
      case 'tolocaltime': return obj;
      case 'isdaylightsavingtime': return obj.d.getTimezoneOffset() < new Date(obj.d.getFullYear(), 0, 1).getTimezoneOffset();
    }
    throw noMethod(obj, name);
  }
  if (obj instanceof GG.EnumVal) { if (k === 'tostring') return obj.name; if (k === 'equals') return V.eq(obj, args[0]); throw noMethod(obj, name); }
  if (obj instanceof TimeSpan) { if (k === 'tostring') return V.fmtTimeSpan(obj.ms); if (k === 'add') return new TimeSpan(obj.ms + args[0].ms); throw noMethod(obj, name); }
  if (obj instanceof SecureString) { if (k === 'dispose' || k === 'makereadonly') return undefined; if (k === 'tostring') return 'System.Security.SecureString'; throw noMethod(obj, name); }
  if (obj instanceof ScriptBlock) {
    if (k === 'invoke' || k === 'invokereturnasis') return V.unwrap(await GG.interp.invokeSB(obj, ctx, { args }));
    if (k === 'tostring') return obj.text;
    throw noMethod(obj, name);
  }
  if (obj instanceof ErrorRecord) { if (k === 'tostring') return obj.message; throw noMethod(obj, name); }
  if (obj instanceof PSObject) {
    const m = obj.methods[k];
    if (m) return m.call(obj, args, ctx);
    if (k === 'tostring') return V.toStr(obj);
    if (k === 'equals') return obj === args[0];
    if (k === 'gettype') return GG.typeObj(obj.typeName);
    if (k === 'refresh') return undefined;
    throw noMethod(obj, name);
  }
  throw noMethod(obj, name);
};

M.strMethod = function (s, k, name, args) {
  const a0 = args[0], a1 = args[1];
  const need = (n) => { if (args.length < n) throw err({ message: `Für "${name}" und die folgende Argumentanzahl kann keine Überladung gefunden werden: "${args.length}".`, category: 'NotSpecified', fqid: 'MethodCountCouldNotFindBest' }); };
  switch (k) {
    case 'toupper': case 'toupperinvariant': return s.toUpperCase();
    case 'tolower': case 'tolowerinvariant': return s.toLowerCase();
    case 'trim': case 'trimstart': case 'trimend': {
      const chars = args.length ? args.map(V.toStr).join('') : null;
      const isT = c => chars === null ? /\s/.test(c) : chars.includes(c);
      let st = 0, en = s.length;
      if (k !== 'trimend') while (st < en && isT(s[st])) st++;
      if (k !== 'trimstart') while (en > st && isT(s[en - 1])) en--;
      return s.slice(st, en);
    }
    case 'substring': {
      need(1);
      const st = V.toInt(a0);
      if (st < 0 || st > s.length) throw methodExc('Substring', args.length, 'Der startIndex darf nicht größer als die Länge der Zeichenfolge sein.\r\nParametername: startIndex', 'ArgumentOutOfRangeException');
      if (args.length > 1) {
        const ln = V.toInt(a1);
        if (ln < 0 || st + ln > s.length) throw methodExc('Substring', 2, 'Index und Länge müssen sich auf eine Position in der Zeichenfolge beziehen.\r\nParametername: length', 'ArgumentOutOfRangeException');
        return s.substr(st, ln);
      }
      return s.slice(st);
    }
    case 'replace': need(2); return s.split(V.toStr(a0)).join(V.toStr(a1));
    case 'split': {
      if (!args.length) return s.split(/\s/);
      const sep = V.toArr(a0).map(V.toStr);
      if (sep.length === 1 && sep[0].length > 1 && args.length > 1) return s.split(sep[0]);
      const chars = sep.join('');
      const res = []; let cur = '';
      for (const c of s) { if (chars.includes(c)) { res.push(cur); cur = ''; } else cur += c; }
      res.push(cur);
      if (args.length > 1 && /RemoveEmptyEntries|^1$/i.test(V.toStr(a1))) return res.filter(x => x !== '');
      return res;
    }
    case 'contains': need(1); return s.includes(V.toStr(a0));
    case 'startswith': need(1); return s.startsWith(V.toStr(a0));
    case 'endswith': need(1); return s.endsWith(V.toStr(a0));
    case 'indexof': need(1); return s.indexOf(V.toStr(a0), a1 !== undefined ? V.toInt(a1) : 0);
    case 'lastindexof': need(1); return s.lastIndexOf(V.toStr(a0));
    case 'padleft': need(1); return s.padStart(V.toInt(a0), a1 !== undefined ? V.toStr(a1) : ' ');
    case 'padright': need(1); return s.padEnd(V.toInt(a0), a1 !== undefined ? V.toStr(a1) : ' ');
    case 'insert': need(2); return s.slice(0, V.toInt(a0)) + V.toStr(a1) + s.slice(V.toInt(a0));
    case 'remove': need(1); return args.length > 1 ? s.slice(0, V.toInt(a0)) + s.slice(V.toInt(a0) + V.toInt(a1)) : s.slice(0, V.toInt(a0));
    case 'tochararray': return [...s];
    case 'tostring': return s;
    case 'equals': return s === V.toStr(a0);
    case 'compareto': return Math.sign(s.localeCompare(V.toStr(a0), 'de'));
    case 'normalize': return s.normalize();
    case 'clone': return s;
  }
  throw noMethod(s, name);
};

/* ---------- Statische Member ---------- */
GG.staticMember = function (t, name, ctx) {
  if (!t || !t.typeObj) throw err({ message: `Der Typ wurde nicht gefunden.`, fqid: 'TypeNotFound' });
  const fn = t.fullName.toLowerCase(); const k = name.toLowerCase();
  if (fn === 'system.math') { if (k === 'pi') return Math.PI; if (k === 'e') return Math.E; }
  if (fn === 'system.datetime') { if (k === 'now') return new PSDate(new Date()); if (k === 'today') { const d = new Date(); return new PSDate(new Date(d.getFullYear(), d.getMonth(), d.getDate())); } if (k === 'utcnow') return new PSDate(new Date(Date.now() + new Date().getTimezoneOffset() * 6e4)); if (k === 'minvalue') return new PSDate(new Date(1, 0, 1)); if (k === 'maxvalue') return new PSDate(new Date(9999, 11, 31, 23, 59, 59)); }
  if (fn === 'system.int32') { if (k === 'maxvalue') return 2147483647; if (k === 'minvalue') return -2147483648; }
  if (fn === 'system.int64') { if (k === 'maxvalue') return 9223372036854775807; if (k === 'minvalue') return -9223372036854775808; }
  if (fn === 'system.string') { if (k === 'empty') return ''; }
  if (fn === 'system.environment') {
    switch (k) {
      case 'username': return ctx.session.user; case 'machinename': return ctx.world.hostname; case 'userdomainname': return ctx.session.domain;
      case 'newline': return '\r\n'; case 'is64bitoperatingsystem': return true; case 'processorcount': return 4; case 'currentdirectory': return ctx.session.home;
      case 'osversion': { const o = new PSObject('System.OperatingSystem', { Platform: 'Win32NT', ServicePack: '', Version: GG.versionObj('10.0.26100.0'), VersionString: 'Microsoft Windows NT 10.0.26100.0' }); o.toStringFn = () => 'Microsoft Windows NT 10.0.26100.0'; return o; }
    }
  }
  if (fn === 'system.io.path') { if (k === 'directoryseparatorchar') return '\\'; if (k === 'pathseparator') return ';'; }
  if (fn === 'system.security.principal.windowsbuiltinrole') return name;
  if (fn === 'system.management.automation.actionpreference') return name;
  return null;
};

function bankRound(x, d) {
  const f = Math.pow(10, d || 0);
  const n = x * f; const fl = Math.floor(n); const diff = n - fl;
  let r;
  if (Math.abs(diff - 0.5) < 1e-9) r = fl % 2 === 0 ? fl : fl + 1; else r = Math.round(n);
  return r / f;
}
GG.bankRound = bankRound;

GG.staticCall = async function (t, name, args, ctx) {
  if (!t || !t.typeObj) throw err({ message: 'Ungültiger statischer Aufruf.', fqid: 'MethodNotFound' });
  const fn = t.fullName.toLowerCase(); const k = name.toLowerCase();
  const a = args;
  const nf = () => err({ message: `Fehler beim Aufrufen der Methode, da [${t.fullName}] keine Methode mit dem Namen "${name}" enthält.`, category: 'InvalidOperation', fqid: 'MethodNotFound' });
  switch (fn) {
    case 'system.math': {
      const x = a.length ? V.toNum(a[0], 'System.Double') : 0;
      switch (k) {
        case 'round': return bankRound(x, a[1] !== undefined ? V.toInt(a[1]) : 0);
        case 'floor': return Math.floor(x); case 'ceiling': return Math.ceil(x); case 'abs': return Math.abs(x);
        case 'max': return Math.max(x, V.toNum(a[1])); case 'min': return Math.min(x, V.toNum(a[1]));
        case 'pow': return Math.pow(x, V.toNum(a[1])); case 'sqrt': return Math.sqrt(x); case 'truncate': return Math.trunc(x);
        case 'log': return a.length > 1 ? Math.log(x) / Math.log(V.toNum(a[1])) : Math.log(x); case 'log10': return Math.log10(x);
      }
      throw nf();
    }
    case 'system.datetime': {
      if (k === 'parse') { const d = V.parseDate(V.toStr(a[0])); if (!d) throw methodExc('Parse', 1, 'Die Zeichenfolge wurde nicht als gültiges DateTime erkannt.', 'FormatException'); return d; }
      if (k === 'daysinmonth') return new Date(V.toInt(a[0]), V.toInt(a[1]), 0).getDate();
      if (k === 'isleapyear') { const y = V.toInt(a[0]); return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
      throw nf();
    }
    case 'system.int32': case 'system.int64': case 'system.double': {
      if (k === 'parse') { const n = V.parseNum(V.toStr(a[0])); if (n === null || (fn !== 'system.double' && !Number.isInteger(n))) throw methodExc('Parse', 1, 'Die Eingabezeichenfolge hat das falsche Format.', 'FormatException'); return n; }
      throw nf();
    }
    case 'system.string': {
      if (k === 'isnullorempty') return a[0] === null || a[0] === undefined || V.toStr(a[0]) === '';
      if (k === 'isnullorwhitespace') return a[0] === null || a[0] === undefined || V.toStr(a[0]).trim() === '';
      if (k === 'join') return V.toArr(a.length > 2 ? a.slice(1) : a[1]).map(V.toStr).join(V.toStr(a[0]));
      if (k === 'format') return V.formatNet(V.toStr(a[0]), a.length > 2 ? a.slice(1) : a[1]);
      if (k === 'concat') return a.map(V.toStr).join('');
      throw nf();
    }
    case 'system.io.path': {
      const p = V.toStr(a[0]);
      switch (k) {
        case 'getextension': { const m = /\.[^.\\/]*$/.exec(p.split(/[\\/]/).pop()); return m ? m[0] : ''; }
        case 'getfilename': return p.split(/[\\/]/).pop();
        case 'getfilenamewithoutextension': return p.split(/[\\/]/).pop().replace(/\.[^.]*$/, '');
        case 'getdirectoryname': return p.replace(/[\\/][^\\/]*$/, '');
        case 'combine': return a.map(V.toStr).reduce((x, y) => /^[a-z]:|^\\/i.test(y) ? y : x.replace(/\\$/, '') + '\\' + y);
        case 'gettemppath': return `C:\\Users\\${ctx.session.user}\\AppData\\Local\\Temp\\`;
        case 'getrandomfilename': return Math.random().toString(36).slice(2, 10) + '.' + Math.random().toString(36).slice(2, 5);
      }
      throw nf();
    }
    case 'system.guid': if (k === 'newguid') { const g = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }); const o = new PSObject('System.Guid', { Guid: g }); o.toStringFn = () => g; return o; } throw nf();
    case 'system.convert': {
      if (k === 'tostring' && a.length > 1) return Math.trunc(V.toNum(a[0])).toString(V.toInt(a[1]));
      if (k === 'toint32') { if (a.length > 1) { const n = parseInt(V.toStr(a[0]), V.toInt(a[1])); if (isNaN(n)) throw methodExc('ToInt32', 2, 'Es wurden keine gültigen Ziffern gefunden.', 'FormatException'); return n; } return V.toInt(a[0]); }
      if (k === 'tostring') return V.toStr(a[0]);
      if (k === 'todouble') return V.toNum(a[0]);
      throw nf();
    }
    case 'system.text.regularexpressions.regex': {
      if (k === 'escape') return V.toStr(a[0]).replace(/[.*+?^${}()|[\]\\#\s]/g, '\\$&');
      if (k === 'ismatch') return V.netRe(a[1], 'i').test(V.toStr(a[0])) && V.netRe(a[1], '').test(V.toStr(a[0]));
      if (k === 'replace') return V.toStr(a[0]).replace(V.netRe(a[1], 'g'), V.toStr(a[2]));
      throw nf();
    }
    case 'system.environment': {
      if (k === 'getenvironmentvariable') return GG.envGet(ctx, V.toStr(a[0]));
      if (k === 'getfolderpath') return `C:\\Users\\${ctx.session.user}\\${V.toStr(a[0])}`;
      throw nf();
    }
    case 'system.io.file': {
      const path = V.toStr(a[0]);
      if (k === 'exists') { const r = GG.fsx.resolveFile(ctx, path); return !!(r && r.node && !r.node.dir); }
      if (k === 'readalltext' || k === 'readalllines') {
        const r = GG.fsx.resolveFile(ctx, path);
        if (!r || !r.node || r.node.dir) throw methodExc(k === 'readalltext' ? 'ReadAllText' : 'ReadAllLines', 1, `Die Datei "${path}" konnte nicht gefunden werden.`, 'FileNotFoundException');
        const c = r.node.content || ''; return k === 'readalltext' ? c : c.replace(/\n$/, '').split('\n');
      }
      if (k === 'writealltext') { await GG.fsx.writeText(ctx, path, V.toStr(a[1]), false, 'UTF8'); return undefined; }
      throw nf();
    }
    case 'system.net.ipaddress': if (k === 'parse') return V.cast('System.Net.IPAddress', a[0]); throw nf();
    case 'system.security.principal.windowsidentity': {
      if (k === 'getcurrent') {
        const o = new PSObject('System.Security.Principal.WindowsIdentity', { Name: ctx.session.identity, AuthenticationType: 'Kerberos', IsAuthenticated: true, IsSystem: false, IsGuest: false, IsAnonymous: false });
        o.elevated = ctx.session.elevated;
        return o;
      }
      throw nf();
    }
    case 'system.management.automation.pscredential': if (k === 'new') return GG.mkCredential(V.toStr(a[0]), a[1]); throw nf();
  }
  throw nf();
};

GG.mkCredential = function (user, sec) {
  const o = new PSObject('System.Management.Automation.PSCredential', { UserName: user, Password: sec instanceof SecureString ? sec : new SecureString(V.toStr(sec)) });
  o.methods.getnetworkcredential = function () { return new PSObject('System.Net.NetworkCredential', { UserName: user.split('\\').pop(), Domain: user.includes('\\') ? user.split('\\')[0] : '', Password: o.get('Password').plain }); };
  o.toStringFn = () => 'System.Management.Automation.PSCredential';
  return o;
};

})();
