/* Get-Going! – PowerShell-Simulation: Werte, Objekte, Operatoren */
(function () {
'use strict';
const GG = globalThis.GG = globalThis.GG || {};

/* ---------- Objekte ---------- */
class PSObject {
  constructor(typeNames, props, opts) {
    this.typeNames = Array.isArray(typeNames) ? typeNames.slice() : [typeNames || 'System.Management.Automation.PSCustomObject'];
    this.props = Object.create(null);
    this.order = [];
    opts = opts || {};
    this.methods = opts.methods || {};
    this.toStringFn = opts.toString || null;
    this.ref = opts.ref || null; // Verweis auf Weltobjekt
    if (props) for (const k of Object.keys(props)) this.add(k, props[k]);
  }
  get typeName() { return this.typeNames[0]; }
  add(name, value, getter, setter) {
    const k = name.toLowerCase();
    if (!(k in this.props)) this.order.push(k);
    this.props[k] = { name, value, get: getter, set: setter };
    return this;
  }
  has(name) { return name.toLowerCase() in this.props; }
  get(name) {
    const p = this.props[name.toLowerCase()];
    if (!p) return undefined;
    return p.get ? p.get(this) : p.value;
  }
  set(name, v) {
    const p = this.props[name.toLowerCase()];
    if (!p) { this.add(name, v); return; }
    if (p.set) p.set(this, v); else if (p.get) throw new Error('readonly:' + p.name); else p.value = v;
  }
  remove(name) {
    const k = name.toLowerCase();
    if (k in this.props) { delete this.props[k]; this.order = this.order.filter(x => x !== k); }
  }
  names() { return this.order.map(k => this.props[k].name); }
  propName(name) { const p = this.props[name.toLowerCase()]; return p ? p.name : name; }
  clone() {
    const o = new PSObject(this.typeNames, null, { methods: this.methods, toString: this.toStringFn, ref: this.ref });
    for (const k of this.order) { const p = this.props[k]; o.add(p.name, p.get ? p.get(this) : p.value); }
    return o;
  }
}

class PSHash {
  constructor(ordered) { this.map = new Map(); this.ordered = !!ordered; }
  set(k, v) { const key = String(k).toLowerCase(); const e = this.map.get(key); if (e) e.value = v; else this.map.set(key, { key: k, value: v }); }
  get(k) { const e = this.map.get(String(k).toLowerCase()); return e ? e.value : undefined; }
  has(k) { return this.map.has(String(k).toLowerCase()); }
  delete(k) { this.map.delete(String(k).toLowerCase()); }
  keys() { return [...this.map.values()].map(e => e.key); }
  values() { return [...this.map.values()].map(e => e.value); }
  entries() { return [...this.map.values()]; }
  get size() { return this.map.size; }
}

class ScriptBlock {
  constructor(ast, text, src) { this.ast = ast; this.text = text; this.src = src; }
  toString() { return this.text; }
}

class PSDate {
  constructor(d) { this.d = d instanceof Date ? new Date(d.getTime()) : new Date(d); }
  get t() { return this.d.getTime(); }
  add(ms) { return new PSDate(new Date(this.t + ms)); }
}
class TimeSpan { constructor(ms) { this.ms = ms; } }
class SecureString { constructor(plain) { this.plain = plain; } }
class EnumVal { constructor(type, name, value) { this.type = type; this.name = name; this.value = value; } toString() { return this.name; } }
const ENUMS = {
  'System.ServiceProcess.ServiceControllerStatus': { Stopped: 1, StartPending: 2, StopPending: 3, Running: 4, ContinuePending: 5, PausePending: 6, Paused: 7 },
  'System.ServiceProcess.ServiceStartMode': { Boot: 0, System: 1, Automatic: 2, Manual: 3, Disabled: 4 },
  'System.Diagnostics.EventLogEntryType': { Error: 1, Warning: 2, Information: 4, SuccessAudit: 8, FailureAudit: 16 }
};
const enumCache = {};
GG.enumVal = function (type, name) {
  const k = type + '|' + name;
  if (!enumCache[k]) enumCache[k] = new EnumVal(type, name, ENUMS[type] && ENUMS[type][name] !== undefined ? ENUMS[type][name] : 0);
  return enumCache[k];
};
GG.EnumVal = EnumVal;

/* ---------- Fehler & Signale ---------- */
class ErrorRecord {
  constructor(o) {
    this.message = o.message;
    this.category = o.category || 'NotSpecified';
    this.exception = o.exception || 'System.Management.Automation.RuntimeException';
    this.fqid = o.fqid || 'RuntimeException';
    this.target = o.target === undefined ? '' : o.target;
    this.targetType = o.targetType || 'String';
    this.activity = o.activity || '';
    this.cmd = o.cmd || '';
    this.pos = o.pos || null; // {file, line, col, text, len}
    this.reason = o.reason || (this.exception.split('.').pop());
    this.inner = o.inner || null;
  }
}
class PSRuntimeError extends Error { constructor(rec) { super(rec.message); this.rec = rec; } }
class BreakSignal { constructor(label) { this.label = label; } }
class ContinueSignal { constructor(label) { this.label = label; } }
class ReturnSignal { constructor(value) { this.value = value; } }
class ExitSignal { constructor(code) { this.code = code; } }
class StopSignal { } // [H] Anhalten / Strg+C

GG.PSObject = PSObject; GG.PSHash = PSHash; GG.ScriptBlock = ScriptBlock; GG.PSDate = PSDate;
GG.TimeSpan = TimeSpan; GG.SecureString = SecureString; GG.ErrorRecord = ErrorRecord;
GG.PSRuntimeError = PSRuntimeError; GG.BreakSignal = BreakSignal; GG.ContinueSignal = ContinueSignal;
GG.ReturnSignal = ReturnSignal; GG.ExitSignal = ExitSignal; GG.StopSignal = StopSignal;

/* ---------- Hilfsfunktionen ---------- */
const V = GG.v = {};
V.isArr = Array.isArray;
V.isObj = x => x instanceof PSObject;

const DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MON3 = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
V.DAYS_EN = DAYS_EN;
const p2 = n => String(n).padStart(2, '0');

V.fmtDateDE = d => `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
V.fmtDateLong = d => `${DAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
V.fmtDateInv = d => `${p2(d.getMonth() + 1)}/${p2(d.getDate())}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
V.fmtDateShort = d => `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()}`;
V.fmtMon = d => `${MON3[d.getMonth()]} ${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;

/* .NET-Datumsformat (Teilmenge) */
V.netDateFormat = function (d, f) {
  if (f === 'd') return V.fmtDateShort(d);
  if (f === 'D') return `${DAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  if (f === 't') return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
  if (f === 'T') return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
  if (f === 'g') return `${V.fmtDateShort(d)} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  if (f === 's') return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
  return f.replace(/yyyy|yy|MMMM|MMM|MM|M|dddd|ddd|dd|d|HH|H|hh|h|mm|m|ss|s|tt|fff|'[^']*'/g, t => {
    switch (t) {
      case 'yyyy': return String(d.getFullYear());
      case 'yy': return String(d.getFullYear()).slice(-2);
      case 'MMMM': return MONTHS[d.getMonth()];
      case 'MMM': return MON3[d.getMonth()];
      case 'MM': return p2(d.getMonth() + 1);
      case 'M': return String(d.getMonth() + 1);
      case 'dddd': return DAYS[d.getDay()];
      case 'ddd': return DAYS[d.getDay()].slice(0, 2);
      case 'dd': return p2(d.getDate());
      case 'd': return String(d.getDate());
      case 'HH': return p2(d.getHours());
      case 'H': return String(d.getHours());
      case 'hh': return p2(((d.getHours() + 11) % 12) + 1);
      case 'h': return String(((d.getHours() + 11) % 12) + 1);
      case 'mm': return p2(d.getMinutes());
      case 'm': return String(d.getMinutes());
      case 'ss': return p2(d.getSeconds());
      case 's': return String(d.getSeconds());
      case 'tt': return d.getHours() < 12 ? 'AM' : 'PM';
      case 'fff': return String(d.getMilliseconds()).padStart(3, '0');
      default: return t.slice(1, -1);
    }
  });
};

V.fmtNum = function (n, de) {
  if (typeof n !== 'number') return String(n);
  if (!isFinite(n)) return isNaN(n) ? 'NaN' : (n > 0 ? '∞' : '-∞');
  let s;
  if (Number.isInteger(n) && Math.abs(n) < 1e15) s = String(n);
  else {
    s = String(+n.toPrecision(15));
    if (/e/.test(s)) s = s.replace(/e\+?/, 'E+').replace('E+-', 'E-');
  }
  return de ? s.replace('.', ',') : s;
};

V.fmtTimeSpan = function (ms) {
  const neg = ms < 0; ms = Math.abs(ms);
  const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1000) % 60, f = Math.round(ms % 1000);
  return (neg ? '-' : '') + (d ? d + '.' : '') + p2(h) + ':' + p2(m) + ':' + p2(s) + (f ? '.' + String(f).padStart(3, '0') + '0000' : '');
};

V.typeOf = function (v) {
  if (v === null || v === undefined) return null;
  if (v instanceof EnumVal) return v.type;
  if (typeof v === 'string') return 'System.String';
  if (typeof v === 'number') return Number.isInteger(v) ? (Math.abs(v) > 2147483647 ? 'System.Int64' : 'System.Int32') : 'System.Double';
  if (typeof v === 'boolean') return 'System.Boolean';
  if (Array.isArray(v)) return 'System.Object[]';
  if (v instanceof PSHash) return v.ordered ? 'System.Collections.Specialized.OrderedDictionary' : 'System.Collections.Hashtable';
  if (v instanceof ScriptBlock) return 'System.Management.Automation.ScriptBlock';
  if (v instanceof PSDate) return 'System.DateTime';
  if (v instanceof TimeSpan) return 'System.TimeSpan';
  if (v instanceof SecureString) return 'System.Security.SecureString';
  if (v instanceof ErrorRecord) return 'System.Management.Automation.ErrorRecord';
  if (v instanceof PSObject) return v.typeName;
  return 'System.Object';
};

V.toStr = function (v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (v instanceof EnumVal) return v.name;
  if (typeof v === 'number') return V.fmtNum(v, false);
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (Array.isArray(v)) return v.map(V.toStr).join(' ');
  if (v instanceof PSDate) return V.fmtDateInv(v.d);
  if (v instanceof TimeSpan) return V.fmtTimeSpan(v.ms);
  if (v instanceof ScriptBlock) return v.text;
  if (v instanceof PSHash) return V.typeOf(v);
  if (v instanceof SecureString) return 'System.Security.SecureString';
  if (v instanceof ErrorRecord) return v.message;
  if (v instanceof PSObject) {
    if (v.toStringFn) return v.toStringFn(v);
    if (/PSCustomObject$/.test(v.typeName) || /^Selected\./.test(v.typeName) || /^Deserialized\./.test(v.typeName) && !v.toStringFn)
      return '@{' + v.names().map(n => n + '=' + V.toStr(v.get(n))).join('; ') + '}';
    return v.typeName;
  }
  return String(v);
};

/* Anzeige-Zeichenkette (Kultur de-DE) */
V.toDisp = function (v) {
  if (typeof v === 'number') return V.fmtNum(v, true);
  if (v instanceof PSDate) return V.fmtDateDE(v.d);
  if (Array.isArray(v)) {
    const lim = 4;
    const parts = v.slice(0, lim).map(V.toDisp);
    return '{' + parts.join(', ') + (v.length > lim ? '...' : '') + '}';
  }
  if (v instanceof PSHash) return '{' + v.keys().slice(0, 4).join(', ') + (v.size > 4 ? '...' : '') + '}';
  return V.toStr(v);
};

V.toBool = function (v) {
  if (v === null || v === undefined) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.length > 0;
  if (Array.isArray(v)) { if (v.length === 0) return false; if (v.length === 1) return V.toBool(v[0]); return true; }
  if (v instanceof SecureString) return true;
  return true;
};

V.numRe = /^\s*([+-]?(?:0x[0-9a-f]+|(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?))(kb|mb|gb|tb|pb)?\s*$/i;
V.parseNum = function (s) {
  const m = V.numRe.exec(s);
  if (!m) return null;
  let n = /^[+-]?0x/i.test(m[1]) ? parseInt(m[1], 16) : parseFloat(m[1]);
  if (m[2]) n *= { kb: 1024, mb: 1048576, gb: 1073741824, tb: 1099511627776, pb: 1125899906842624 }[m[2].toLowerCase()];
  return n;
};

V.convErr = function (v, type, why) {
  return new PSRuntimeError(new ErrorRecord({
    message: `Der Wert "${V.toStr(v)}" kann nicht in den Typ "${type}" konvertiert werden. Fehler: "${why || 'Die Eingabezeichenfolge hat das falsche Format.'}"`,
    category: 'InvalidArgument', exception: 'System.Management.Automation.RuntimeException', fqid: 'InvalidCastFromStringToInteger', reason: 'RuntimeException'
  }));
};

V.toNum = function (v, type) {
  if (v === null || v === undefined) return 0;
  if (v instanceof EnumVal) return v.value;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'string') {
    if (v.trim() === '') return 0;
    const n = V.parseNum(v);
    if (n === null) throw V.convErr(v, type || 'System.Int32');
    return n;
  }
  if (Array.isArray(v) && v.length === 1) return V.toNum(v[0], type);
  if (v instanceof PSDate) return v.t;
  if (v instanceof TimeSpan) return v.ms;
  throw V.convErr(v, type || 'System.Int32', `Der Wert "${V.toStr(v)}" vom Typ "${V.typeOf(v)}" kann nicht in den Typ "${type || 'System.Int32'}" konvertiert werden.`);
};

V.toInt = function (v) {
  const n = V.toNum(v, 'System.Int32');
  // .NET Banker's Rounding
  const f = Math.floor(n), diff = n - f;
  if (diff === 0.5) return f % 2 === 0 ? f : f + 1;
  return Math.round(n);
};

V.toArr = v => (v === null || v === undefined) ? [] : (Array.isArray(v) ? v : [v]);
V.unwrap = arr => arr.length === 0 ? null : (arr.length === 1 ? arr[0] : arr);

/* Platzhalter -> RegExp */
V.wildRe = function (pat, cs) {
  let r = '^';
  for (let i = 0; i < pat.length; i++) {
    const c = pat[i];
    if (c === '`' && i + 1 < pat.length) { r += pat[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    else if (c === '*') r += '.*';
    else if (c === '?') r += '.';
    else if (c === '[') { const j = pat.indexOf(']', i); if (j > i) { r += '[' + pat.slice(i + 1, j).replace(/\\/g, '\\\\') + ']'; i = j; } else r += '\\['; }
    else r += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(r + '$', cs ? 's' : 'is');
};
V.hasWild = s => /[*?[]/.test(s);
V.like = (s, pat, cs) => V.wildRe(V.toStr(pat), cs).test(V.toStr(s));

/* ---------- Vergleich ---------- */
V.eq = function (a, b, cs) {
  if (a === null || a === undefined) return b === null || b === undefined;
  if (b === undefined) b = null;
  if (a instanceof EnumVal) { if (b === null) return false; if (typeof b === 'number') return a.value === b; if (b instanceof EnumVal) return a.value === b.value && a.type === b.type; return cs ? a.name === V.toStr(b) : a.name.toLowerCase() === V.toStr(b).toLowerCase(); }
  if (typeof a === 'number') {
    if (b === null) return false;
    try { return a === V.toNum(b); } catch (e) { return false; }
  }
  if (typeof a === 'string') {
    if (b === null) return false;
    const bs = V.toStr(b);
    return cs ? a === bs : a.toLowerCase() === bs.toLowerCase();
  }
  if (typeof a === 'boolean') return a === V.toBool(b);
  if (a instanceof PSDate) { if (b instanceof PSDate) return a.t === b.t; if (typeof b === 'string') { const d = V.parseDate(b); return d ? d.t === a.t : false; } return false; }
  if (a instanceof TimeSpan) return b instanceof TimeSpan && a.ms === b.ms;
  return a === b;
};

V.cmp = function (a, b, cs) { // für -gt/-lt; wirft bei Inkompatibilität
  if (a instanceof EnumVal) { let bv; if (b instanceof EnumVal) bv = b.value; else if (typeof b === 'number') bv = b; else { const t = ENUMS[a.type] || {}; const key = Object.keys(t).find(k => k.toLowerCase() === V.toStr(b).toLowerCase()); if (key === undefined) throw V.convErr(b, a.type, `Der Bezeichnername "${V.toStr(b)}" kann nicht mit einem gültigen Enumeratornamen abgeglichen werden.`); bv = t[key]; } return a.value < bv ? -1 : a.value > bv ? 1 : 0; }
  if (typeof a === 'number') { const bn = b === null ? 0 : V.toNum(b); return a < bn ? -1 : a > bn ? 1 : 0; }
  if (typeof a === 'string') {
    const bs = V.toStr(b);
    const x = cs ? a : a.toLowerCase(), y = cs ? bs : bs.toLowerCase();
    return x.localeCompare(y, 'de');
  }
  if (a instanceof PSDate) {
    let bt; if (b instanceof PSDate) bt = b.t; else if (typeof b === 'string') { const d = V.parseDate(b); if (!d) throw V.convErr(b, 'System.DateTime', 'Die Zeichenfolge wurde nicht als gültiges DateTime erkannt.'); bt = d.t; } else bt = V.toNum(b);
    return a.t < bt ? -1 : a.t > bt ? 1 : 0;
  }
  if (a instanceof TimeSpan) { const bm = b instanceof TimeSpan ? b.ms : V.toNum(b); return a.ms < bm ? -1 : a.ms > bm ? 1 : 0; }
  if (typeof a === 'boolean') { const bb = V.toBool(b); return a === bb ? 0 : (a ? 1 : -1); }
  if (a === null || a === undefined) return (b === null || b === undefined) ? 0 : -1;
  const as = V.toStr(a), bs = V.toStr(b);
  return as.toLowerCase().localeCompare(bs.toLowerCase(), 'de');
};

/* Sortiervergleich (Sort-Object) */
V.sortCmp = function (a, b) {
  const an = a === null || a === undefined, bn = b === null || b === undefined;
  if (an || bn) return an && bn ? 0 : (an ? -1 : 1);
  if (a instanceof EnumVal && b instanceof EnumVal) return a.value - b.value;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof PSDate && b instanceof PSDate) return a.t - b.t;
  if (a instanceof TimeSpan && b instanceof TimeSpan) return a.ms - b.ms;
  if (typeof a === 'boolean' && typeof b === 'boolean') return (a ? 1 : 0) - (b ? 1 : 0);
  if (a instanceof PSObject && a.sortKey !== undefined && b instanceof PSObject) return a.sortKey - b.sortKey;
  try { return V.cmp(a, b); } catch (e) { return V.toStr(a).localeCompare(V.toStr(b), 'de'); }
};

V.parseDate = function (s) {
  s = String(s).trim();
  let m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  if (m) return new PSDate(new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)));
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  if (m) return new PSDate(new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)));
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  if (m) return new PSDate(new Date(+m[3], +m[1] - 1, +m[2], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)));
  return null;
};

/* -f Formatoperator (.NET composite format, Teilmenge) */
V.formatNet = function (fmt, args) {
  args = V.toArr(args);
  return String(fmt).replace(/\{\{|\}\}|\{(\d+)(?:,(-?\d+))?(?::([^}]*))?\}/g, (all, idx, align, spec) => {
    if (all === '{{') return '{';
    if (all === '}}') return '}';
    let v = args[+idx];
    let s;
    if (spec !== undefined && spec !== '') s = V.formatValue(v, spec);
    else s = V.toStr(v === undefined ? null : v);
    if (align) { const w = +align; s = w < 0 ? s.padEnd(-w) : s.padStart(w); }
    return s;
  });
};
V.formatValue = function (v, spec) {
  if (v instanceof PSDate) return V.netDateFormat(v.d, spec);
  if (typeof v === 'string' && /^[NnFfPpDdCcXx]\d*$/.test(spec)) { const n = V.parseNum(v); if (n !== null) v = n; }
  if (typeof v !== 'number') return V.toStr(v);
  const m = /^([NnFfPpDdCcXxEe])(\d*)$/.exec(spec);
  if (m) {
    const k = m[1].toUpperCase(); const d = m[2] === '' ? null : +m[2];
    const group = (s) => { const [i, f] = s.split('.'); const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return f !== undefined ? g + ',' + f : g; };
    if (k === 'N') return group(v.toFixed(d === null ? 2 : d));
    if (k === 'F') return v.toFixed(d === null ? 2 : d).replace('.', ',');
    if (k === 'P') return group((v * 100).toFixed(d === null ? 2 : d)) + ' %';
    if (k === 'D') return String(Math.trunc(v)).padStart(d || 0, '0');
    if (k === 'C') return group(v.toFixed(d === null ? 2 : d)) + ' €';
    if (k === 'X') { const s = Math.trunc(v).toString(16).padStart(d || 0, '0'); return m[1] === 'X' ? s.toUpperCase() : s; }
    if (k === 'E') return v.toExponential(d === null ? 6 : d).replace('.', ',');
  }
  // Benutzerdefiniert: 0.00 / #,##0
  if (/^[#0.,]+$/.test(spec)) {
    const dec = (spec.split('.')[1] || '').length;
    let s = v.toFixed(dec);
    if (spec.includes(',')) { const [i, f] = s.split('.'); s = i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (f ? ',' + f : ''); }
    else s = s.replace('.', ',');
    return s;
  }
  return V.fmtNum(v, true);
};

/* ---------- Typen ---------- */
V.TYPES = {
  'int': 'System.Int32', 'int32': 'System.Int32', 'system.int32': 'System.Int32', 'long': 'System.Int64', 'int64': 'System.Int64', 'system.int64': 'System.Int64',
  'double': 'System.Double', 'system.double': 'System.Double', 'decimal': 'System.Decimal', 'float': 'System.Single', 'single': 'System.Single',
  'string': 'System.String', 'system.string': 'System.String', 'bool': 'System.Boolean', 'boolean': 'System.Boolean', 'system.boolean': 'System.Boolean',
  'datetime': 'System.DateTime', 'system.datetime': 'System.DateTime', 'array': 'System.Array', 'object[]': 'System.Object[]', 'string[]': 'System.String[]', 'int[]': 'System.Int32[]',
  'hashtable': 'System.Collections.Hashtable', 'ordered': 'ordered', 'pscustomobject': 'System.Management.Automation.PSCustomObject', 'psobject': 'System.Management.Automation.PSObject',
  'math': 'System.Math', 'system.math': 'System.Math', 'scriptblock': 'System.Management.Automation.ScriptBlock', 'timespan': 'System.TimeSpan', 'char': 'System.Char',
  'switch': 'System.Management.Automation.SwitchParameter', 'securestring': 'System.Security.SecureString', 'system.security.securestring': 'System.Security.SecureString',
  'ipaddress': 'System.Net.IPAddress', 'system.net.ipaddress': 'System.Net.IPAddress', 'environment': 'System.Environment', 'system.environment': 'System.Environment',
  'system.io.path': 'System.IO.Path', 'io.path': 'System.IO.Path', 'void': 'System.Void', 'regex': 'System.Text.RegularExpressions.Regex', 'xml': 'System.Xml.XmlDocument',
  'guid': 'System.Guid', 'system.guid': 'System.Guid', 'pscredential': 'System.Management.Automation.PSCredential', 'system.management.automation.pscredential': 'System.Management.Automation.PSCredential',
  'byte': 'System.Byte', 'object': 'System.Object', 'system.object': 'System.Object', 'char[]': 'System.Char[]', 'version': 'System.Version',
  'system.io.file': 'System.IO.File', 'io.file': 'System.IO.File', 'convert': 'System.Convert', 'system.convert': 'System.Convert',
  'security.principal.windowsidentity': 'System.Security.Principal.WindowsIdentity', 'system.security.principal.windowsidentity': 'System.Security.Principal.WindowsIdentity'
};
V.resolveType = function (name) {
  const k = name.toLowerCase().replace(/\s/g, '');
  if (V.TYPES[k]) return V.TYPES[k];
  if (/\[\]$/.test(k)) { const b = V.resolveType(k.slice(0, -2)); if (b) return b + '[]'; }
  return null;
};

GG.typeNotFound = function (name) {
  return new PSRuntimeError(new ErrorRecord({
    message: `Der Typ [${name}] wurde nicht gefunden. Stellen Sie sicher, dass die Assembly, die diesen Typ enthält, geladen wird.`,
    category: 'InvalidOperation', exception: 'System.Management.Automation.RuntimeException', fqid: 'TypeNotFound', target: `${name}`, targetType: 'TypeName'
  }));
};

V.cast = function (type, v) {
  const t = type.toLowerCase();
  if (t.endsWith('[]')) {
    const el = t.slice(0, -2);
    return V.toArr(v).map(x => el === 'object' ? x : V.cast(el, x));
  }
  switch (t) {
    case 'system.int32': case 'system.int64': case 'system.byte': {
      if (typeof v === 'string' && v.trim() === '') return 0;
      return V.toInt(v);
    }
    case 'system.double': case 'system.decimal': case 'system.single': return V.toNum(v, 'System.Double');
    case 'system.string': return v === null || v === undefined ? '' : V.toStr(v);
    case 'system.boolean': return V.toBool(v);
    case 'system.char': { const s = V.toStr(v); if (s.length !== 1) throw V.convErr(v, 'System.Char', 'Die Zeichenfolge muss genau ein Zeichen lang sein.'); return s; }
    case 'system.datetime': {
      if (v instanceof PSDate) return v;
      const d = V.parseDate(V.toStr(v));
      if (!d) throw V.convErr(v, 'System.DateTime', 'Die Zeichenfolge wurde nicht als gültiges DateTime erkannt.');
      return d;
    }
    case 'system.timespan': {
      if (v instanceof TimeSpan) return v;
      const s = V.toStr(v); const m = /^(?:(\d+)\.)?(\d+):(\d+)(?::(\d+))?$/.exec(s);
      if (m) return new TimeSpan(((+(m[1] || 0) * 24 + +m[2]) * 60 + +m[3]) * 60000 + +(m[4] || 0) * 1000);
      if (typeof v === 'number') return new TimeSpan(v / 10000);
      throw V.convErr(v, 'System.TimeSpan');
    }
    case 'system.object[]': case 'system.array': return V.toArr(v);
    case 'system.collections.hashtable': if (v instanceof PSHash) return v; throw V.convErr(v, 'System.Collections.Hashtable');
    case 'system.management.automation.pscustomobject': case 'system.management.automation.psobject': {
      if (v instanceof PSHash) { const o = new PSObject('System.Management.Automation.PSCustomObject'); for (const e of v.entries()) o.add(String(e.key), e.value); return o; }
      return v;
    }
    case 'system.security.securestring': if (v instanceof SecureString) return v; throw V.convErr(v, 'System.Security.SecureString', `Der Wert "${V.toStr(v)}" vom Typ "System.String" kann nicht in den Typ "System.Security.SecureString" konvertiert werden.`);
    case 'system.net.ipaddress': {
      const s = V.toStr(v); if (!GG.net || !GG.net.isIPv4(s)) throw V.convErr(v, 'System.Net.IPAddress', 'Es wurde eine ungültige IP-Adresse angegeben.');
      return GG.net.ipObj(s);
    }
    case 'system.version': { const s = V.toStr(v); const o = new PSObject('System.Version', {}); const ps = s.split('.').map(Number); ['Major', 'Minor', 'Build', 'Revision'].forEach((k, i) => o.add(k, ps[i] === undefined ? -1 : ps[i])); o.toStringFn = () => s; o.sortKey = ps.reduce((a, x) => a * 10000 + x, 0); return o; }
    case 'system.void': return undefined;
    case 'system.object': return v;
    case 'system.management.automation.switchparameter': return V.toBool(v);
    case 'system.guid': return V.toStr(v);
    default: return v;
  }
};

/* ---------- Arithmetik ---------- */
V.add = function (a, b) {
  if (a === null || a === undefined) { if (Array.isArray(b)) return b.slice(); return b; }
  if (Array.isArray(a)) return a.concat(Array.isArray(b) ? b : [b]);
  if (a instanceof PSHash) {
    if (!(b instanceof PSHash)) throw opErr('Ein Hashtabelle kann nur zu einer anderen Hashtabelle hinzugefügt werden.');
    const h = new PSHash(a.ordered); for (const e of a.entries()) h.set(e.key, e.value);
    for (const e of b.entries()) { if (h.has(e.key)) throw opErr(`Das Element wurde bereits hinzugefügt. Schlüssel im Wörterbuch: "${e.key}"  Hinzuzufügender Schlüssel: "${e.key}"`); h.set(e.key, e.value); }
    return h;
  }
  if (typeof a === 'string') return a + V.toStr(b);
  if (a instanceof PSDate) { if (b instanceof TimeSpan) return a.add(b.ms); return a.add(V.toNum(b) / 10000); }
  if (a instanceof TimeSpan) { if (b instanceof TimeSpan) return new TimeSpan(a.ms + b.ms); }
  if (typeof a === 'number' || typeof a === 'boolean') return V.toNum(a) + V.toNum(b, 'System.Int32');
  throw opErr(`Fehler beim Aufrufen der Methode, da [${V.typeOf(a)}] keine Methode mit dem Namen "op_Addition" enthält.`);
};
V.sub = function (a, b) {
  if (a instanceof PSDate) { if (b instanceof PSDate) return new TimeSpan(a.t - b.t); if (b instanceof TimeSpan) return a.add(-b.ms); }
  if (a instanceof TimeSpan && b instanceof TimeSpan) return new TimeSpan(a.ms - b.ms);
  if (Array.isArray(a) || typeof a === 'string' && V.parseNum(a) === null) throw opErr(`Fehler beim Aufrufen der Methode, da [${V.typeOf(a)}] keine Methode mit dem Namen "op_Subtraction" enthält.`);
  return V.toNum(a) - V.toNum(b);
};
V.mul = function (a, b) {
  if (typeof a === 'string') return a.repeat(Math.max(0, V.toInt(b)));
  if (Array.isArray(a)) { let r = []; for (let i = 0; i < V.toInt(b); i++) r = r.concat(a); return r; }
  return V.toNum(a) * V.toNum(b);
};
V.div = function (a, b) {
  const x = V.toNum(a), y = V.toNum(b);
  if (y === 0) throw new PSRuntimeError(new ErrorRecord({ message: 'Es wurde versucht, durch 0 (null) zu teilen.', category: 'NotSpecified', exception: 'System.Management.Automation.RuntimeException', inner: 'System.DivideByZeroException', reason: 'ParentContainsErrorRecordException', fqid: 'RuntimeException' }));
  return x / y;
};
V.mod = function (a, b) { const y = V.toNum(b); if (y === 0) throw opErr('Es wurde versucht, durch 0 (null) zu teilen.'); return V.toNum(a) % y; };

function opErr(msg) {
  return new PSRuntimeError(new ErrorRecord({ message: msg, category: 'InvalidOperation', exception: 'System.Management.Automation.RuntimeException', fqid: 'MethodNotFound' }));
}
V.opErr = opErr;

/* Regex-Konvertierung .NET -> JS (Teilmenge) */
V.netRe = function (pat, flags) {
  let p = V.toStr(pat).replace(/\(\?<([A-Za-z_]\w*)>/g, '(?<$1>').replace(/\\A/g, '^').replace(/\\Z/g, '$');
  try { return new RegExp(p, flags); }
  catch (e) {
    throw new PSRuntimeError(new ErrorRecord({ message: `Das Muster "${pat}" für den regulären Ausdruck ist ungültig.`, category: 'InvalidOperation', fqid: 'InvalidRegularExpression' }));
  }
};

})();
