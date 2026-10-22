/* Get-Going! – Kern-Cmdlets (Utility / Core) */
(function () {
'use strict';
const GG = globalThis.GG = globalThis.GG || {};
const V = GG.v, I = GG.interp, F = GG.fmt;
const { PSObject, PSHash, ScriptBlock, PSDate, TimeSpan, SecureString, ErrorRecord, PSRuntimeError } = GG;

GG.BUILTIN_MODULES = new Set(['microsoft.powershell.core', 'microsoft.powershell.management', 'microsoft.powershell.utility', 'microsoft.powershell.security', 'microsoft.powershell.localaccounts', 'netadapter', 'nettcpip', 'dnsclient', 'netsecurity', 'smbshare', 'storage', 'cimcmdlets', 'powershellget', 'packagemanagement', 'microsoft.powershell.archive', 'psreadline', 'netconnection']);
GG.def = function (spec) {
  spec.module = spec.module || 'Microsoft.PowerShell.Utility';
  spec.version = spec.version || (spec.module === 'Microsoft.PowerShell.Core' ? '' : '3.1.0.0');
  spec.cmdType = spec.cmdType || 'Cmdlet';
  spec.params = spec.params || [];
  GG.cmdlets[spec.name.toLowerCase()] = spec;
  for (const a of spec.aliases || []) GG.aliases[a.toLowerCase()] = spec.name;
  return spec;
};
GG.P = (name, type, o) => Object.assign({ name, type: type || 'string' }, o || {});
const P = GG.P, def = GG.def;
GG.cmdletAvailable = function (spec, ctx) {
  const m = (spec.module || '').toLowerCase();
  if (GG.BUILTIN_MODULES.has(m)) return true;
  return (ctx.world.modules || []).some(x => x.name.toLowerCase() === m && x.installed !== false);
};
GG.nativeAvailable = function (name, ctx) {
  const w = ctx.world;
  if (w.missingNatives && w.missingNatives.has(name)) return false;
  if (GG.nativeRequires && GG.nativeRequires[name]) return GG.nativeRequires[name](w);
  return true;
};

/* ---------- Hilfen ---------- */
const U = GG.util = {};
U.propNames = function (o) { return F.allProps(o); };
U.getProp = function (o, name) {
  if (o instanceof PSHash) { const v = o.get(name); return v === undefined ? null : v; }
  return F.propVal(o, name);
};
U.hasProp = function (o, name) {
  if (o instanceof PSObject) return o.has(name);
  if (o instanceof PSHash) return o.has(name);
  return F.allProps(o).some(n => n.toLowerCase() === name.toLowerCase());
};
U.canonName = function (o, name) {
  if (o instanceof PSObject) return o.propName(name);
  const f = F.allProps(o).find(n => n.toLowerCase() === name.toLowerCase());
  return f || name;
};
/* Eigenschaftsangaben (Strings mit Wildcards, berechnete Hashtables) */
U.propSpecs = async function (props, ctx, sample, cmd) {
  const res = [];
  for (const p of V.toArr(props)) {
    if (p instanceof PSHash) {
      const keys = p.keys();
      const get = (...names) => { for (const k of keys) { const kl = k.toLowerCase(); for (const n of names) if (n.length === 1 ? kl === n : n.startsWith(kl) && kl.length >= 1) return p.get(k); } return undefined; };
      const label = get('name', 'label', 'n', 'l');
      const expr = get('expression', 'e');
      if (expr === undefined) throw GG.rtErr({ message: `Der Schlüssel "Expression" fehlt in der Hashtabelle für die berechnete Eigenschaft.`, category: 'InvalidArgument', fqid: 'DictionaryKeyMissing,' + GG.cmdClassName(cmd || 'Select-Object'), cmd: cmd || 'Select-Object' });
      const lbl = label !== undefined ? V.toStr(label) : (expr instanceof ScriptBlock ? expr.text.trim() : V.toStr(expr));
      const fs = get('formatstring');
      res.push({
        label: lbl, width: get('width') !== undefined ? V.toInt(get('width')) : undefined, align: (V.toStr(get('alignment') || '').toLowerCase().startsWith('r') ? 'r' : undefined),
        desc: get('descending') !== undefined ? V.toBool(get('descending')) : (get('ascending') !== undefined ? !V.toBool(get('ascending')) : undefined),
        get: async (o) => {
          let v;
          if (expr instanceof ScriptBlock) v = V.unwrap(await I.invokeSB(expr, ctx, { dollar: o }));
          else v = U.getProp(o, V.toStr(expr));
          if (fs !== undefined && v !== null) v = V.formatValue(v, V.toStr(fs));
          return v === undefined ? null : v;
        }
      });
    } else if (p instanceof ScriptBlock) {
      res.push({ label: p.text.trim(), get: async (o) => V.unwrap(await I.invokeSB(p, ctx, { dollar: o })) });
    } else {
      const s = V.toStr(p);
      if (V.hasWild(s)) {
        const names = [];
        for (const o of sample.slice(0, 1)) for (const n of U.propNames(o)) if (V.like(n, s) && !names.includes(n)) names.push(n);
        for (const n of names) res.push({ label: n, get: async (o) => U.getProp(o, n) });
      } else {
        const lab = sample.length ? U.canonName(sample[0], s) : s;
        res.push({ label: lab, name: s, get: async (o) => U.getProp(o, s) });
      }
    }
  }
  return res;
};
U.enumerate = arr => { const r = []; for (const x of V.toArr(arr)) { if (Array.isArray(x)) for (const y of x) r.push(y); else r.push(x); } return r; };

/* ---------- Get-Command ---------- */
function cmdInfo(type, name, version, source, extra) {
  const o = new PSObject(['System.Management.Automation.' + (type === 'Alias' ? 'AliasInfo' : type === 'Function' ? 'FunctionInfo' : type === 'Application' ? 'ApplicationInfo' : 'CmdletInfo'), 'System.Management.Automation.CommandInfo'],
    { HelpUri: '', DLL: '', Verb: name.includes('-') ? name.split('-')[0] : '', Noun: name.includes('-') ? name.split('-').slice(1).join('-') : '', CommandType: type, Name: name, Version: version || '', Source: source || '', Module: source || '', ModuleName: source || '' });
  if (extra) for (const k of Object.keys(extra)) o.add(k, extra[k]);
  o.toStringFn = () => name;
  return o;
}
GG.cmdInfo = cmdInfo;
GG.view('System.Management.Automation.CommandInfo', { table: [
  { l: 'CommandType', p: 'CommandType', w: 15 }, { l: 'Name', g: o => o.get('DisplayName') || o.get('Name'), w: 50 }, { l: 'Version', p: 'Version', w: 10 }, { l: 'Source', p: 'Source' }] });
GG.allCommands = function (ctx) {
  const list = [];
  for (const [k, target] of Object.entries(GG.aliases)) {
    if (ctx.world.removedAliases && ctx.world.removedAliases.has(k)) continue;
    const spec = GG.cmdlets[target.toLowerCase()] || (GG.builtinFns && GG.builtinFns[target.toLowerCase()]);
    if (spec && spec.module && GG.cmdlets[target.toLowerCase()] && !GG.cmdletAvailable(spec, ctx)) continue;
    const real = spec ? spec.name : target;
    list.push(cmdInfo('Alias', k.length <= 3 && k === k.toLowerCase() ? k : k, '', spec ? (spec.module || '') : '', { DisplayName: `${k} -> ${real}`, Definition: real, ResolvedCommandName: real, ReferencedCommand: real }));
  }
  for (let s = ctx.scope; s; s = s.parent) for (const f of s.fns.values()) list.push(cmdInfo('Function', f.name, '', '', { Definition: f.def.text || '' }));
  for (const f of Object.values(GG.builtinFns || {})) list.push(cmdInfo('Function', f.name, f.version || '', f.module || '', { Definition: '' }));
  for (const spec of Object.values(GG.cmdlets)) {
    if (!GG.cmdletAvailable(spec, ctx)) continue;
    list.push(cmdInfo(spec.cmdType || 'Cmdlet', spec.name, spec.version, spec.module));
  }
  for (const n of Object.keys(GG.natives)) if (GG.nativeAvailable(n, ctx)) list.push(cmdInfo('Application', n + '.exe', '10.0.26100.1', 'C:\\Windows\\system32\\' + n + '.exe', { Definition: 'C:\\Windows\\system32\\' + n + '.exe' }));
  return list;
};
def({ name: 'Get-Command', module: 'Microsoft.PowerShell.Core', aliases: ['gcm'], input: 'none',
  params: [P('Name', 'string[]', { pos: 0 }), P('Verb', 'string[]'), P('Noun', 'string[]'), P('Module', 'string[]'), P('CommandType', 'enum', { values: ['Alias', 'Function', 'Filter', 'Cmdlet', 'ExternalScript', 'Application', 'Script', 'Workflow', 'Configuration', 'All'], enumType: 'System.Management.Automation.CommandTypes' }), P('Syntax', 'switch'), P('ListImported', 'switch'), P('TotalCount', 'int'), P('All', 'switch')],
  run: async (c, p) => {
    let list = GG.allCommands(c.ctx);
    const nameF = p.Name; const verbF = p.Verb; const nounF = p.Noun;
    if (verbF || nounF) list = list.filter(x => x.get('CommandType') !== 'Alias' && x.get('CommandType') !== 'Application');
    if (verbF) list = list.filter(x => verbF.some(v => V.like(x.get('Verb'), v)));
    if (nounF) list = list.filter(x => nounF.some(v => V.like(x.get('Noun'), v)));
    if (p.Module) list = list.filter(x => p.Module.some(m => V.like(x.get('Source'), m)));
    if (p.CommandType && p.CommandType !== 'All') list = list.filter(x => x.get('CommandType') === p.CommandType);
    if (nameF) {
      const res = [];
      for (const n of nameF) {
        let m;
        if (V.hasWild(n)) m = list.filter(x => V.like(x.get('Name'), n) && x.get('CommandType') !== 'Application');
        else {
          m = list.filter(x => x.get('Name').toLowerCase() === n.toLowerCase() || (x.get('CommandType') === 'Application' && x.get('Name').toLowerCase() === n.toLowerCase() + '.exe'));
          m = m.slice(0, 1);
          if (!m.length) {
            c.error(`Die Benennung "${n}" wurde nicht als Name eines Cmdlet, einer Funktion, einer Skriptdatei oder eines ausführbaren Programms erkannt. Überprüfen Sie die Schreibweise des Namens, oder ob der Pfad korrekt ist (sofern enthalten), und wiederholen Sie den Vorgang.`, { category: 'ObjectNotFound', exception: 'System.Management.Automation.CommandNotFoundException', fqid: 'CommandNotFoundException', target: n, reason: 'CommandNotFoundException', noClass: false });
            continue;
          }
        }
        for (const x of m) if (!res.includes(x)) res.push(x);
      }
      list = res;
    }
    list.sort((a, b) => {
      const ord = { Alias: 0, Function: 1, Filter: 1, Cmdlet: 2, Application: 3 };
      if (!nameF || nameF.some(V.hasWild)) { const d = (ord[a.get('CommandType')] || 0) - (ord[b.get('CommandType')] || 0); if (d) return d; }
      return a.get('Name').toLowerCase().localeCompare(b.get('Name').toLowerCase());
    });
    if (p.TotalCount) list = list.slice(0, p.TotalCount);
    if (p.Syntax) { for (const x of list) { const spec = GG.cmdlets[x.get('Name').toLowerCase()]; c.out(spec ? '\n' + GG.help.syntax(spec).join('\n\n') + '\n' : x.get('Name')); } return; }
    c.outAll(list);
  } });

/* ---------- Aliase ---------- */
GG.views['System.Management.Automation.AliasInfo'] = GG.views['System.Management.Automation.CommandInfo'];
def({ name: 'Get-Alias', aliases: ['gal'], input: 'none', params: [P('Name', 'string[]', { pos: 0 }), P('Definition', 'string[]'), P('Exclude', 'string[]'), P('Scope', 'string')],
  run: async (c, p) => {
    let list = GG.allCommands(c.ctx).filter(x => x.get('CommandType') === 'Alias');
    for (let s = c.scope; s; s = s.parent) for (const [k, v] of s.aliases) list.push(cmdInfo('Alias', k, '', '', { DisplayName: `${k} -> ${v}`, Definition: v }));
    if (p.Definition) list = list.filter(x => p.Definition.some(d => V.like(x.get('Definition'), d)));
    if (p.Name) {
      const res = [];
      for (const n of p.Name) {
        const m = list.filter(x => V.like(x.get('Name'), n));
        if (!m.length && !V.hasWild(n)) c.error(`Es kann kein passender Alias gefunden werden, da ein Alias mit dem Namen "${n}" nicht vorhanden ist.`, { category: 'ObjectNotFound', exception: 'System.Management.Automation.ItemNotFoundException', fqid: 'ItemNotFoundException', target: n, reason: 'ItemNotFoundException' });
        res.push(...m);
      }
      list = res;
    }
    list.sort((a, b) => a.get('Name').localeCompare(b.get('Name')));
    c.outAll(list);
  } });
for (const nm of ['Set-Alias', 'New-Alias']) def({ name: nm, aliases: nm === 'Set-Alias' ? ['sal'] : ['nal'], input: 'none', params: [P('Name', 'string', { pos: 0, mandatory: true }), P('Value', 'string', { pos: 1, mandatory: true }), P('Description', 'string'), P('Scope', 'string'), P('Force', 'switch'), P('PassThru', 'switch')],
  run: async (c, p) => {
    const k = p.Name.toLowerCase();
    if (nm === 'New-Alias' && (GG.aliases[k] || c.scope.global().aliases.has(k)) && !p.Force) return c.error(`Der Alias kann nicht geschrieben werden, da der Alias "${p.Name}" schreibgeschützt oder konstant ist und nicht geschrieben werden kann.`, { category: 'WriteError', exception: 'System.Management.Automation.SessionStateUnauthorizedAccessException', fqid: 'AliasNotWritable', target: p.Name });
    const sc = (p.Scope || '').toLowerCase() === 'global' ? c.scope.global() : c.session.global;
    sc.aliases.set(k, p.Value);
    if (p.PassThru) c.out(cmdInfo('Alias', p.Name, '', '', { DisplayName: `${p.Name} -> ${p.Value}`, Definition: p.Value }));
  } });

/* ---------- Where-Object ---------- */
const WOPS = ['EQ', 'NE', 'GT', 'GE', 'LT', 'LE', 'Like', 'NotLike', 'Match', 'NotMatch', 'Contains', 'NotContains', 'In', 'NotIn', 'Is', 'IsNot', 'CEQ', 'CNE', 'CGT', 'CGE', 'CLT', 'CLE', 'CLike', 'CNotLike', 'CMatch', 'CNotMatch', 'CContains', 'CNotContains', 'CIn', 'CNotIn'];
def({ name: 'Where-Object', module: 'Microsoft.PowerShell.Core', aliases: ['?', 'where'], input: 'collect',
  params: [P('Property', 'object', { pos: 0 }), P('Value', 'object', { pos: 1 }), P('FilterScript', 'sb'), P('InputObject', 'object')].concat(WOPS.map(o => P(o, 'switch'))),
  run: async (c, p, input) => {
    if (p.InputObject !== undefined && input === null) input = [p.InputObject];
    if (!input) return;
    let sb = p.FilterScript;
    if (!sb && p.Property instanceof ScriptBlock) sb = p.Property;
    if (sb) {
      for (const it of input) {
        const r = await I.invokeSB(sb, c.ctx, { dollar: it, dot: true });
        if (V.toBool(V.unwrap(r))) c.out(it);
      }
      return;
    }
    if (p.Property === undefined || p.Property === null) {
      throw GG.bindErr(c.ctx, 'Where-Object', 'Der Parametersatz kann mit den angegebenen benannten Parametern nicht aufgelöst werden.', 'AmbiguousParameterSet');
    }
    const prop = V.toStr(p.Property);
    const op = WOPS.find(o => p[o]);
    for (const it of input) {
      const v = U.getProp(it, prop);
      let ok;
      if (!op) ok = V.toBool(v);
      else {
        const opName = op.toLowerCase();
        const e = { t: 'bin', op: opName, l: { t: 'const', v }, r: { t: 'const', v: p.Value === undefined ? true : p.Value } };
        ok = V.toBool(await I.binop(e, c.ctx));
      }
      if (ok) c.out(it);
    }
  } });

/* ---------- ForEach-Object ---------- */
def({ name: 'ForEach-Object', module: 'Microsoft.PowerShell.Core', aliases: ['%', 'foreach'], input: 'collect',
  params: [P('Process', 'object[]', { pos: 0, rest: true }), P('Begin', 'sb'), P('End', 'sb'), P('MemberName', 'string'), P('ArgumentList', 'object[]'), P('InputObject', 'object')],
  run: async (c, p, input) => {
    if (p.InputObject !== undefined && input === null) input = [p.InputObject];
    let procs = p.Process ? U.enumerate(p.Process) : [];
    let begin = p.Begin, end = p.End;
    if (procs.length && !(procs[0] instanceof ScriptBlock)) {
      const mem = V.toStr(procs[0]);
      for (const it of input || []) {
        if (p.ArgumentList || (it !== null && typeof it === 'object' && !(it instanceof PSHash) && !U.hasProp(it, mem))) {
          try { const r = await GG.members.call(it, mem, p.ArgumentList || [], c.ctx); if (r !== undefined) c.outAll(V.toArr(r)); } catch (e) { c.error(e.rec ? e.rec.message : String(e), { category: 'InvalidOperation', fqid: 'MethodInvocationNotSupported', target: V.toStr(it) }); }
        } else { const v = U.getProp(it, mem); if (v !== null) c.outAll(V.toArr(v)); }
      }
      return;
    }
    if (procs.length === 3 && !begin && !end) { begin = procs[0]; end = procs[2]; procs = [procs[1]]; }
    else if (procs.length === 2 && !begin) { begin = procs[0]; procs = [procs[1]]; }
    if (begin) c.outAll(await I.invokeSB(begin, c.ctx, { dot: true }));
    const items = input === null ? [undefined] : input;
    for (const it of items) {
      for (const sb of procs) {
        try { c.outAll(await I.invokeSB(sb, c.ctx, { dollar: it === undefined ? null : it, dot: true, args: p.ArgumentList })); }
        catch (e) { if (e instanceof GG.ContinueSignal) break; throw e; }
      }
    }
    if (end) c.outAll(await I.invokeSB(end, c.ctx, { dot: true }));
  } });

/* ---------- Select-Object ---------- */
def({ name: 'Select-Object', aliases: ['select'], input: 'collect',
  params: [P('Property', 'object[]', { pos: 0 }), P('ExcludeProperty', 'string[]'), P('ExpandProperty', 'string'), P('First', 'int'), P('Last', 'int'), P('Skip', 'int'), P('SkipLast', 'int'), P('Unique', 'switch'), P('Index', 'int[]'), P('InputObject', 'object'), P('Wait', 'switch')],
  run: async (c, p, input) => {
    if (p.InputObject !== undefined && input === null) input = [p.InputObject];
    let items = input || [];
    if (p.Skip) items = items.slice(p.Skip);
    if (p.SkipLast) items = items.slice(0, Math.max(0, items.length - p.SkipLast));
    if (p.Index) items = p.Index.map(i => items[i < 0 ? items.length + i : i]).filter(x => x !== undefined);
    if (p.First !== undefined && p.Last !== undefined) items = items.slice(0, p.First).concat(items.slice(-p.Last));
    else if (p.First !== undefined) items = items.slice(0, p.First);
    else if (p.Last !== undefined) items = p.Last ? items.slice(-p.Last) : [];
    let res = [];
    if (p.Property || p.ExcludeProperty) {
      let specs;
      const props = p.Property || ['*'];
      specs = await U.propSpecs(props, c.ctx, items, 'Select-Object');
      for (const it of items) {
        let sp = specs;
        if (props.some(x => typeof x === 'string' && V.hasWild(x))) sp = await U.propSpecs(props, c.ctx, [it], 'Select-Object');
        const o = new PSObject(['Selected.' + (V.typeOf(it) || 'System.Object'), 'System.Management.Automation.PSCustomObject']);
        for (const s of sp) {
          if (p.ExcludeProperty && p.ExcludeProperty.some(x => V.like(s.label, x))) continue;
          if (o.has(s.label)) {
            if (s.name) continue;
            c.error(`Die Eigenschaft kann nicht verarbeitet werden, da die Eigenschaft "${s.label}" bereits vorhanden ist.`, { category: 'InvalidOperation', fqid: 'AlreadyExistingUserSpecifiedPropertyNoExpand', target: V.toStr(it), noClass: false });
            continue;
          }
          o.add(s.label, await s.get(it));
        }
        if (it instanceof PSObject && it.has('PSComputerName')) { if (!o.has('PSComputerName')) o.add('PSComputerName', it.get('PSComputerName')); o.hiddenProps = ['pscomputername']; }
        res.push(o);
      }
    } else res = items.slice();
    if (p.ExpandProperty) {
      const out = [];
      for (const it of p.Property ? res : items) {
        if (!U.hasProp(it, p.ExpandProperty) && !(it instanceof PSHash)) {
          c.error(`Die Eigenschaft "${p.ExpandProperty}" kann nicht gefunden werden.`, { category: 'InvalidArgument', fqid: 'ExpandPropertyNotFound', target: V.toStr(it), targetType: V.typeOf(it) ? V.typeOf(it).split('.').pop() : '' });
          continue;
        }
        const v = U.getProp(it, p.ExpandProperty);
        if (Array.isArray(v)) out.push(...v); else if (v !== null) out.push(v);
      }
      res = out;
    }
    if (p.Unique) {
      const seen = []; const u = [];
      for (const x of res) { const key = x instanceof PSObject ? x.names().map(n => n + '=' + V.toStr(x.get(n))).join(';') : V.toStr(x); if (!seen.includes(key)) { seen.push(key); u.push(x); } }
      res = u;
    }
    c.outAll(res);
  } });

/* ---------- Sort-Object ---------- */
def({ name: 'Sort-Object', aliases: ['sort'], input: 'collect',
  params: [P('Property', 'object[]', { pos: 0 }), P('Descending', 'switch'), P('Unique', 'switch'), P('CaseSensitive', 'switch'), P('InputObject', 'object'), P('Culture', 'string')],
  run: async (c, p, input) => {
    if (!input) { if (p.InputObject !== undefined) c.out(p.InputObject); return; }
    let specs = p.Property ? await U.propSpecs(p.Property, c.ctx, input, 'Sort-Object') : null;
    const keyed = [];
    for (let k = 0; k < input.length; k++) {
      const it = input[k];
      const keys = [];
      if (specs) for (const s of specs) keys.push(await s.get(it));
      else {
        const v = F.viewFor(it);
        keys.push(it instanceof PSObject && v && v.sortKey ? U.getProp(it, v.sortKey) : (it instanceof PSObject ? V.toStr(it) : it));
      }
      keyed.push({ it, keys, k });
    }
    keyed.sort((a, b) => {
      for (let i = 0; i < a.keys.length; i++) {
        let d = V.sortCmp(a.keys[i], b.keys[i]);
        if (p.CaseSensitive && typeof a.keys[i] === 'string' && typeof b.keys[i] === 'string') d = a.keys[i] < b.keys[i] ? -1 : a.keys[i] > b.keys[i] ? 1 : 0;
        const desc = specs && specs[i] && specs[i].desc !== undefined ? specs[i].desc : p.Descending;
        if (d) return desc ? -d : d;
      }
      return a.k - b.k;
    });
    let res = keyed.map(x => x.it);
    if (p.Unique) { const out = []; let last; keyed.forEach((x, i) => { const key = x.keys.map(V.toStr).join('\u0000').toLowerCase(); if (i === 0 || key !== last) out.push(x.it); last = key; }); res = out; }
    c.outAll(res);
  } });

/* ---------- Group-Object ---------- */
GG.view('Microsoft.PowerShell.Commands.GroupInfo', { table: [{ l: 'Count', p: 'Count', w: 5, a: 'r' }, { l: 'Name', p: 'Name', w: 25 }, { l: 'Group', p: 'Group' }] });
GG.view('Microsoft.PowerShell.Commands.GroupInfoNoElement', { table: [{ l: 'Count', p: 'Count', w: 5, a: 'r' }, { l: 'Name', p: 'Name' }] });
def({ name: 'Group-Object', aliases: ['group'], input: 'collect',
  params: [P('Property', 'object[]', { pos: 0 }), P('NoElement', 'switch'), P('AsHashTable', 'switch'), P('AsString', 'switch'), P('CaseSensitive', 'switch'), P('InputObject', 'object')],
  run: async (c, p, input) => {
    if (!input) return;
    const specs = p.Property ? await U.propSpecs(p.Property, c.ctx, input, 'Group-Object') : null;
    const groups = [];
    for (const it of input) {
      const vals = specs ? await Promise.all(specs.map(s => s.get(it))) : [it];
      const name = vals.map(v => V.toStr(v)).join(', ');
      const key = p.CaseSensitive ? name : name.toLowerCase();
      let g = groups.find(x => x.key === key);
      if (!g) { g = { key, name, values: vals, items: [] }; groups.push(g); }
      g.items.push(it);
    }
    if (p.AsHashTable) {
      const h = new PSHash();
      for (const g of groups) h.set(p.AsString ? g.name : (g.values.length === 1 ? g.values[0] : g.name), g.items.length === 1 ? g.items[0] : g.items);
      c.out(h); return;
    }
    for (const g of groups) {
      const o = new PSObject(p.NoElement ? ['Microsoft.PowerShell.Commands.GroupInfoNoElement', 'Microsoft.PowerShell.Commands.GroupInfo'] : 'Microsoft.PowerShell.Commands.GroupInfo', { Values: g.values, Count: g.items.length, Group: p.NoElement ? [] : g.items, Name: g.name });
      if (p.NoElement) { o.remove('Group'); }
      c.out(o);
    }
  } });

/* ---------- Measure-Object ---------- */
GG.view('Microsoft.PowerShell.Commands.GenericMeasureInfo', { kind: 'list', list: [{ p: 'Count' }, { p: 'Average' }, { p: 'Sum' }, { p: 'Maximum' }, { p: 'Minimum' }, { p: 'Property' }] });
GG.view('Microsoft.PowerShell.Commands.TextMeasureInfo', { table: [{ l: 'Lines', p: 'Lines', w: 5, a: 'r' }, { l: 'Words', p: 'Words', w: 5, a: 'r' }, { l: 'Characters', p: 'Characters', w: 10, a: 'r' }, { l: 'Property', p: 'Property' }] });
def({ name: 'Measure-Object', aliases: ['measure'], input: 'collect',
  params: [P('Property', 'object[]', { pos: 0 }), P('Sum', 'switch'), P('Average', 'switch'), P('Maximum', 'switch'), P('Minimum', 'switch'), P('Line', 'switch'), P('Word', 'switch'), P('Character', 'switch'), P('IgnoreWhiteSpace', 'switch'), P('InputObject', 'object')],
  run: async (c, p, input) => {
    if (p.InputObject !== undefined && input === null) input = V.toArr(p.InputObject);
    input = input || [];
    if (p.Line || p.Word || p.Character) {
      let l = 0, w = 0, ch = 0;
      for (const it of input) { const s = V.toStr(it); l += s.split('\n').length; w += s.split(/\s+/).filter(Boolean).length; ch += p.IgnoreWhiteSpace ? s.replace(/\s/g, '').length : s.length; }
      const o = new PSObject('Microsoft.PowerShell.Commands.TextMeasureInfo', { Lines: p.Line ? l : null, Words: p.Word ? w : null, Characters: p.Character ? ch : null, Property: null });
      c.out(o); return;
    }
    const props = p.Property ? V.toArr(p.Property).map(V.toStr) : [null];
    for (const prop of props) {
      let vals = [];
      let count = 0;
      for (const it of input) {
        if (prop === null) { count++; vals.push(it); continue; }
        if (!U.hasProp(it, prop)) continue;
        count++; vals.push(U.getProp(it, prop));
      }
      if (prop !== null && count === 0 && input.length) {
        c.error(`Die Eigenschaft "${prop}" wurde in keinem der Eingabeobjekte gefunden.`, { category: 'InvalidArgument', fqid: 'GenericMeasurePropertyNotFound', target: prop });
        continue;
      }
      const o = new PSObject('Microsoft.PowerShell.Commands.GenericMeasureInfo', { Count: count, Average: null, Sum: null, Maximum: null, Minimum: null, Property: prop });
      const needNum = p.Sum || p.Average;
      let nums;
      if (needNum || p.Maximum || p.Minimum) {
        try { nums = vals.filter(v => v !== null).map(v => typeof v === 'number' ? v : V.toNum(v, 'System.Double')); }
        catch (e) { if (needNum) { c.error(`Die Eingabe "${V.toStr(vals.find(v => { try { V.toNum(v); return false; } catch (x) { return true; } }))}" ist keine Zahl.`, { category: 'InvalidType', fqid: 'NonNumericInputObject' }); continue; } nums = null; }
      }
      if (p.Sum) o.set('Sum', nums.reduce((a, b) => a + b, 0));
      if (p.Average) o.set('Average', nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null);
      if (p.Maximum) o.set('Maximum', nums ? (nums.length ? Math.max(...nums) : null) : vals.slice().sort(V.sortCmp).pop());
      if (p.Minimum) o.set('Minimum', nums ? (nums.length ? Math.min(...nums) : null) : vals.slice().sort(V.sortCmp)[0]);
      c.out(o);
    }
  } });

/* ---------- Get-Member ---------- */
GG.view('Microsoft.PowerShell.Commands.MemberDefinition', {
  custom: (grp, width) => {
    const out = [];
    let cur = null; let rows = [];
    const flush = () => {
      if (!rows.length) return;
      out.push('', '', `   TypeName: ${cur}`, '');
      const nw = Math.max(4, ...rows.map(r => String(r.get('Name')).length)), tw = Math.max(10, ...rows.map(r => String(r.get('MemberType')).length));
      for (const l of F.renderTable([{ label: 'Name', width: nw }, { label: 'MemberType', width: tw }, { label: 'Definition' }], rows.map(r => [r.get('Name'), r.get('MemberType'), r.get('Definition')]), width, { autosize: false })) out.push(l);
      rows = [];
    };
    for (const o of grp) { if (o.get('TypeName') !== cur) { flush(); cur = o.get('TypeName'); } rows.push(o); }
    flush(); out.push('');
    return out;
  }
});
const SHORT = t => {
  if (!t) return 'System.Object';
  const m = { 'System.String': 'string', 'System.Int32': 'int', 'System.Int64': 'long', 'System.Double': 'double', 'System.Boolean': 'bool', 'System.Object[]': 'Object[]', 'System.DateTime': 'datetime', 'System.TimeSpan': 'timespan', 'System.Collections.Hashtable': 'hashtable' };
  return m[t] || t;
};
GG.memberList = function (o) {
  const res = [];
  const tn = V.typeOf(o) || 'System.Object';
  const add = (Name, MemberType, Definition) => res.push({ Name, MemberType, Definition });
  if (o instanceof PSObject) {
    const meta = GG.typeMeta && GG.typeMeta[o.typeName.replace(/^Deserialized\./, '')];
    if (meta) {
      for (const m of meta) {
        if (m[1] === 'NoteProperty' && o.has(m[0]) && m[0] !== '__NounName') { const v = o.get(m[0]); const ty = m[2].split(' ')[0]; add(m[0], m[1], `${ty} ${m[0]}=${V.toStr(v).slice(0, 60)}`); }
        else add(m[0], m[1], m[2]);
      }
      const known = new Set(meta.map(m => m[0].toLowerCase()));
      for (const n of o.names()) if (!known.has(n.toLowerCase())) add(n, 'NoteProperty', `${SHORT(V.typeOf(o.get(n)))} ${n}=${V.toStr(o.get(n)).slice(0, 60)}`);
    } else {
      const custom = /PSCustomObject$/.test(o.typeName) || /^Selected\.|^CSV:|^Deserialized\./.test(o.typeName);
      add('Equals', 'Method', 'bool Equals(System.Object obj)'); add('GetHashCode', 'Method', 'int GetHashCode()'); add('GetType', 'Method', 'type GetType()'); add('ToString', 'Method', 'string ToString()');
      for (const k of Object.keys(o.methods)) if (!['equals', 'gethashcode', 'gettype', 'tostring'].includes(k)) add(k[0].toUpperCase() + k.slice(1), 'Method', `${k}()`);
      for (const n of o.names()) {
        const v = o.get(n);
        if (custom) add(n, 'NoteProperty', `${SHORT(V.typeOf(v))} ${n}=${V.toStr(v).slice(0, 60)}`);
        else add(n, 'Property', `${SHORT(V.typeOf(v))} ${n} {get;${o.props[n.toLowerCase()].get && !o.props[n.toLowerCase()].set ? '' : 'set;'}}`);
      }
    }
  } else if (typeof o === 'string') {
    for (const [n, d] of [['Clone', 'System.Object Clone()'], ['CompareTo', 'int CompareTo(System.Object value), int CompareTo(string strB)'], ['Contains', 'bool Contains(string value)'], ['EndsWith', 'bool EndsWith(string value)'], ['Equals', 'bool Equals(System.Object obj)'], ['GetHashCode', 'int GetHashCode()'], ['GetType', 'type GetType()'], ['IndexOf', 'int IndexOf(char value), int IndexOf(string value)'], ['Insert', 'string Insert(int startIndex, string value)'], ['LastIndexOf', 'int LastIndexOf(string value)'], ['PadLeft', 'string PadLeft(int totalWidth)'], ['PadRight', 'string PadRight(int totalWidth)'], ['Remove', 'string Remove(int startIndex, int count)'], ['Replace', 'string Replace(string oldValue, string newValue)'], ['Split', 'string[] Split(Params char[] separator)'], ['StartsWith', 'bool StartsWith(string value)'], ['Substring', 'string Substring(int startIndex), string Substring(int startIndex, int length)'], ['ToCharArray', 'char[] ToCharArray()'], ['ToLower', 'string ToLower()'], ['ToString', 'string ToString()'], ['ToUpper', 'string ToUpper()'], ['Trim', 'string Trim(Params char[] trimChars), string Trim()'], ['TrimEnd', 'string TrimEnd(Params char[] trimChars)'], ['TrimStart', 'string TrimStart(Params char[] trimChars)']]) add(n, 'Method', d);
    add('Chars', 'ParameterizedProperty', 'char Chars(int index) {get;}'); add('Length', 'Property', 'int Length {get;}');
  } else if (typeof o === 'number') {
    for (const [n, d] of [['CompareTo', 'int CompareTo(System.Object value)'], ['Equals', 'bool Equals(System.Object obj)'], ['GetHashCode', 'int GetHashCode()'], ['GetType', 'type GetType()'], ['ToString', 'string ToString(), string ToString(string format)']]) add(n, 'Method', d);
  } else if (o instanceof PSDate) {
    for (const n of ['Add', 'AddDays', 'AddHours', 'AddMinutes', 'AddMonths', 'AddSeconds', 'AddYears', 'CompareTo', 'Equals', 'GetType', 'Subtract', 'ToLongDateString', 'ToShortDateString', 'ToShortTimeString', 'ToString', 'ToUniversalTime']) add(n, 'Method', `${n === 'ToString' ? 'string' : 'datetime'} ${n}(...)`);
    add('DisplayHint', 'NoteProperty', 'DisplayHintType DisplayHint=DateTime');
    for (const n of ['Date', 'Day', 'DayOfWeek', 'DayOfYear', 'Hour', 'Kind', 'Millisecond', 'Minute', 'Month', 'Second', 'Ticks', 'TimeOfDay', 'Year']) add(n, 'Property', `${n === 'Date' ? 'datetime' : n === 'DayOfWeek' ? 'System.DayOfWeek' : n === 'TimeOfDay' ? 'timespan' : 'int'} ${n} {get;}`);
    add('DateTime', 'ScriptProperty', 'System.Object DateTime {get=if ((& { Set-StrictMode -Version 1; $this.DisplayHint }) -ieq  "Date")...');
  } else if (o instanceof PSHash) {
    for (const n of ['Add', 'Clear', 'Clone', 'Contains', 'ContainsKey', 'ContainsValue', 'Equals', 'GetEnumerator', 'GetType', 'Remove', 'ToString']) add(n, 'Method', `${n}(...)`);
    add('Item', 'ParameterizedProperty', 'System.Object Item(System.Object key) {get;set;}');
    for (const n of ['Count', 'IsFixedSize', 'IsReadOnly', 'IsSynchronized', 'Keys', 'SyncRoot', 'Values']) add(n, 'Property', `${n} {get;}`);
  } else if (o instanceof ErrorRecord) {
    for (const n of ['Equals', 'GetHashCode', 'GetObjectData', 'GetType', 'ToString']) add(n, 'Method', `${n}(...)`);
    for (const n of ['CategoryInfo', 'ErrorDetails', 'Exception', 'FullyQualifiedErrorId', 'InvocationInfo', 'PipelineIterationInfo', 'ScriptStackTrace', 'TargetObject']) add(n, 'Property', `${n} {get;}`);
  } else if (typeof o === 'boolean') {
    for (const n of ['CompareTo', 'Equals', 'GetHashCode', 'GetType', 'ToString']) add(n, 'Method', `${n}(...)`);
  } else if (o instanceof ScriptBlock) {
    for (const n of ['Invoke', 'InvokeReturnAsIs', 'GetType', 'ToString']) add(n, 'Method', `${n}(...)`);
    for (const n of ['Ast', 'File', 'Module', 'StartPosition']) add(n, 'Property', `${n} {get;}`);
  } else if (o instanceof SecureString) {
    for (const n of ['AppendChar', 'Clear', 'Copy', 'Dispose', 'GetType', 'MakeReadOnly', 'ToString']) add(n, 'Method', `${n}(...)`);
    add('Length', 'Property', 'int Length {get;}');
  }
  const order = { AliasProperty: 0, CodeProperty: 1, Event: 2, Method: 3, NoteProperty: 4, ParameterizedProperty: 5, Property: 6, PropertySet: 7, ScriptMethod: 8, ScriptProperty: 9 };
  res.sort((a, b) => (order[a.MemberType] - order[b.MemberType]) || a.Name.localeCompare(b.Name));
  return { tn, res };
};
def({ name: 'Get-Member', aliases: ['gm'], input: 'collect', params: [P('Name', 'string[]', { pos: 0 }), P('MemberType', 'enum[]', { values: ['AliasProperty', 'CodeProperty', 'Property', 'NoteProperty', 'ScriptProperty', 'Properties', 'PropertySet', 'Method', 'CodeMethod', 'ScriptMethod', 'Methods', 'ParameterizedProperty', 'MemberSet', 'Event', 'Dynamic', 'All'], enumType: 'System.Management.Automation.PSMemberTypes', aliases: ['Type'] }), P('InputObject', 'object'), P('Static', 'switch'), P('Force', 'switch'), P('View', 'string')],
  run: async (c, p, input) => {
    if (p.InputObject !== undefined && input === null) input = [p.InputObject];
    if (!input || !input.length) {
      return c.error('Sie müssen ein Objekt für das Cmdlet "Get-Member" angeben.', { category: 'CloseError', fqid: 'NoObjectInGetMember', exception: 'System.InvalidOperationException' });
    }
    const seen = new Set();
    for (const it of input) {
      if (it === null) continue;
      const { tn, res } = GG.memberList(it);
      const key = tn + (it instanceof PSObject ? '|' + it.names().join(',') : '');
      if (seen.has(tn)) continue;
      seen.add(tn);
      for (const m of res) {
        if (p.Name && !p.Name.some(n => V.like(m.Name, n))) continue;
        if (p.MemberType && !p.MemberType.some(t => t === 'All' || t === m.MemberType || (t === 'Properties' && /Property$/.test(m.MemberType)) || (t === 'Methods' && /Method$/.test(m.MemberType)))) continue;
        c.out(new PSObject('Microsoft.PowerShell.Commands.MemberDefinition', { TypeName: tn, Name: m.Name, MemberType: m.MemberType, Definition: m.Definition }));
      }
    }
  } });

/* ---------- Format-* ---------- */
function fmtBlock(lines, kind) {
  const start = new PSObject('Microsoft.PowerShell.Commands.Internal.Format.FormatStartData', { ClassId2e4f51ef21dd47e99d3c952918aff9cd: '033ecb2bc07a4d43b5ef94ed5a35d280', pageHeaderEntry: null, pageFooterEntry: null, autosizeInfo: null, shapeInfo: 'Microsoft.PowerShell.Commands.Internal.Format.' + (kind === 'list' ? 'ListViewHeaderInfo' : 'TableHeaderInfo'), groupingEntry: null });
  start.__fmt = lines;
  return start;
}
GG.fmtBlock = fmtBlock;
function fmtJunk(n) {
  const r = [];
  for (let i = 0; i < n; i++) { const o = new PSObject('Microsoft.PowerShell.Commands.Internal.Format.FormatEntryData', { ClassId2e4f51ef21dd47e99d3c952918aff9cd: '27c87ef9bbda4f709f6b4002fa4af63c', formatEntryInfo: 'Microsoft.PowerShell.Commands.Internal.Format.TableRowEntry', outOfBand: false, writeStream: 'None' }); o.__fmt = []; r.push(o); }
  const e = new PSObject('Microsoft.PowerShell.Commands.Internal.Format.FormatEndData', { ClassId2e4f51ef21dd47e99d3c952918aff9cd: 'cf522b78d86c486691226b40aa69e95c', groupingEntry: null }); e.__fmt = []; r.push(e);
  return r;
}
def({ name: 'Format-Table', aliases: ['ft'], input: 'collect',
  params: [P('Property', 'object[]', { pos: 0 }), P('AutoSize', 'switch'), P('GroupBy', 'object'), P('HideTableHeaders', 'switch'), P('Wrap', 'switch'), P('View', 'string'), P('InputObject', 'object'), P('Force', 'switch')],
  run: async (c, p, input) => {
    if (p.InputObject !== undefined && input === null) input = [p.InputObject];
    if (!input || !input.length) return;
    const items = U.enumerate(input);
    const width = c.host.width || 120;
    let lines = [];
    if (!p.Property) {
      const v = F.viewFor(items[0]);
      if (v && v.table) {
        const tmp = []; F.renderView(items, Object.assign({}, v, { kind: 'table', custom: null }), width, l => tmp.push(l));
        lines = tmp;
      } else if (items[0] instanceof PSObject || items[0] instanceof PSHash) {
        if (items[0] instanceof PSHash) { lines = F.format(items, width).map(l => l.t); }
        else {
          const names = F.allProps(items[0]);
          lines = [''].concat(F.renderTable(names.map(n => ({ label: n })), items.map(o => names.map(n => F.propVal(o, n))), width, { autosize: p.AutoSize })).concat(['']);
        }
      } else lines = F.format(items, width).map(l => l.t);
    } else {
      const specs = await U.propSpecs(p.Property, c.ctx, items, 'Format-Table');
      const rows = [];
      for (const it of items) { const r = []; for (const s of specs) r.push(await s.get(it)); rows.push(r); }
      let groups = [{ key: null, rows, items }];
      if (p.GroupBy) {
        const gs = await U.propSpecs([p.GroupBy], c.ctx, items, 'Format-Table');
        groups = [];
        for (let k = 0; k < items.length; k++) {
          const key = V.toStr(await gs[0].get(items[k]));
          if (!groups.length || groups[groups.length - 1].key !== key) groups.push({ key, rows: [], label: gs[0].label });
          groups[groups.length - 1].rows.push(rows[k]);
        }
      }
      for (const g of groups) {
        if (g.key !== null) lines.push('', `   ${g.label}: ${g.key}`);
        lines.push('');
        lines = lines.concat(F.renderTable(specs.map(s => ({ label: s.label, width: s.width, align: s.align })), g.rows, width, { autosize: true, hideHeader: p.HideTableHeaders }));
        lines.push('');
      }
    }
    c.out(fmtBlock(lines.concat(['']), 'table'));
    c.outAll(fmtJunk(items.length));
  } });
def({ name: 'Format-List', aliases: ['fl'], input: 'collect',
  params: [P('Property', 'object[]', { pos: 0 }), P('GroupBy', 'object'), P('View', 'string'), P('InputObject', 'object'), P('Force', 'switch')],
  run: async (c, p, input) => {
    if (p.InputObject !== undefined && input === null) input = [p.InputObject];
    if (!input || !input.length) return;
    const items = U.enumerate(input);
    const width = c.host.width || 120;
    const lines = [];
    let lastGroup = null;
    for (const it of items) {
      let props;
      if (it instanceof ErrorRecord) { props = ['Exception', 'TargetObject', 'CategoryInfo', 'FullyQualifiedErrorId'].map(n => ({ label: n, value: GG.members.get(it, n) })); }
      else if (!p.Property) {
        const v = F.viewFor(it);
        if (v && v.flist) props = (typeof v.flist === 'function' ? v.flist(it) : v.flist).map(x => ({ label: x.l || x.p, value: x.g ? x.g(it) : F.propVal(it, x.p) }));
        else if (v && v.kind === 'list' && v.list) props = v.list.map(x => ({ label: x.l || x.p, value: x.g ? x.g(it) : F.propVal(it, x.p) }));
        else if (it instanceof PSHash) props = [];
        else if (typeof it !== 'object' || it === null) { lines.push(V.toStr(it)); continue; }
        else props = F.allProps(it).map(n => ({ label: n, value: F.propVal(it, n) }));
        if (it instanceof PSHash) { for (const e of it.entries()) lines.push('', 'Name  : ' + e.key, 'Value : ' + V.toDisp(e.value)); continue; }
        if (v && v.group && v.flistGroup !== false) {
          const gk = v.group.g(it);
          if (gk !== lastGroup) { lines.push('', `    ${v.group.label}: ${gk}`, ''); lastGroup = gk; }
        }
      } else {
        const specs = await U.propSpecs(p.Property, c.ctx, [it], 'Format-List');
        props = [];
        for (const s of specs) props.push({ label: s.label, value: await s.get(it) });
      }
      for (const l of F.renderList([it], () => props, width)) lines.push(l);
    }
    lines.push('', '');
    c.out(fmtBlock(lines, 'list'));
    c.outAll(fmtJunk(items.length));
  } });
def({ name: 'Format-Wide', aliases: ['fw'], input: 'collect', params: [P('Property', 'object', { pos: 0 }), P('Column', 'int'), P('AutoSize', 'switch'), P('InputObject', 'object')],
  run: async (c, p, input) => {
    if (!input || !input.length) return;
    const items = U.enumerate(input);
    const width = c.host.width || 120;
    const vals = [];
    for (const it of items) {
      let v;
      if (p.Property) v = (await U.propSpecs([p.Property], c.ctx, [it], 'Format-Wide'))[0].get ? await (await U.propSpecs([p.Property], c.ctx, [it], 'Format-Wide'))[0].get(it) : null;
      else { const vw = F.viewFor(it); v = vw && vw.wideProp ? (typeof vw.wideProp === 'function' ? vw.wideProp(it) : U.getProp(it, vw.wideProp)) : (U.hasProp(it, 'Name') ? U.getProp(it, 'Name') : V.toStr(it)); }
      vals.push(F.cell(v));
    }
    const cols = p.Column || (p.AutoSize ? Math.max(1, Math.floor(width / (Math.max(...vals.map(x => x.length)) + 2))) : 2);
    const cw = Math.floor(width / cols);
    const lines = [''];
    for (let k = 0; k < vals.length; k += cols) lines.push(vals.slice(k, k + cols).map(x => x.length >= cw ? x.slice(0, cw - 4) + '...' : x.padEnd(cw)).join('').replace(/\s+$/, ''));
    lines.push('', '');
    c.out(fmtBlock(lines, 'wide'));
  } });

/* ---------- Out-* ---------- */
def({ name: 'Out-Default', module: 'Microsoft.PowerShell.Core', input: 'collect', params: [P('InputObject', 'object'), P('Transcript', 'switch')], run: async (c, p, input) => { c.host.outDefault(input || (p.InputObject !== undefined ? [p.InputObject] : []), c.ctx); } });
def({ name: 'Out-Host', module: 'Microsoft.PowerShell.Core', aliases: ['oh'], input: 'collect', params: [P('Paging', 'switch'), P('InputObject', 'object')], run: async (c, p, input) => { c.host.outDefault(input || (p.InputObject !== undefined ? [p.InputObject] : []), c.ctx); } });
def({ name: 'Out-Null', module: 'Microsoft.PowerShell.Core', input: 'collect', params: [P('InputObject', 'object')], run: async () => { } });
def({ name: 'Out-String', input: 'collect', params: [P('Stream', 'switch'), P('Width', 'int'), P('InputObject', 'object')],
  run: async (c, p, input) => {
    if (p.InputObject !== undefined && input === null) input = [p.InputObject];
    const lines = F.toLines(input || [], p.Width || c.host.width || 120);
    if (p.Stream) c.outAll(lines.filter((l, i) => true));
    else c.out(lines.join('\r\n') + '\r\n');
  } });
GG.ENCODINGS = ['Unknown', 'String', 'Unicode', 'BigEndianUnicode', 'UTF8', 'UTF7', 'UTF32', 'ASCII', 'Default', 'OEM'];
def({ name: 'Out-File', input: 'collect', sp: true, params: [P('FilePath', 'string', { pos: 0, mandatory: true, aliases: ['Path'] }), P('LiteralPath', 'string', { aliases: ['PSPath'] }), P('Encoding', 'enum', { pos: 1, values: GG.ENCODINGS, enumType: 'System.String' }), P('Append', 'switch'), P('Force', 'switch'), P('NoClobber', 'switch'), P('Width', 'int'), P('NoNewline', 'switch'), P('InputObject', 'object')],
  validate: (p) => { },
  run: async (c, p, input) => {
    if (p.InputObject !== undefined && input === null) input = [p.InputObject];
    const path = p.FilePath || p.LiteralPath;
    const r = GG.fsx.resolve(c.ctx, path);
    const exists = GG.fsx.node(r);
    if (p.NoClobber && exists && !p.Append) return c.error(`Die Datei "${GG.fsx.canonical(r)}" ist bereits vorhanden.`, { category: 'ResourceExists', exception: 'System.IO.IOException', fqid: 'NoClobber', target: GG.fsx.canonical(r) });
    if (!(await c.should(GG.fsx.canonical(r), 'Ausgabe in Datei'))) return;
    const text = p.NoNewline ? (input || []).map(V.toStr).join('') : GG.fmt.toText(input || [], c.ctx, p.Width || 120).replace(/\n/g, '\n');
    try { await GG.fsx.writeText(c.ctx, path, text, p.Append, p.Encoding === 'UTF8' ? 'UTF8BOM' : (p.Encoding || 'Unicode')); }
    catch (e) { if (e instanceof PSRuntimeError) { e.rec.cmd = 'Out-File'; e.rec.pos = GG.posOf(c.ctx.cmdNode); } throw e; }
  } });
def({ name: 'Out-GridView', aliases: ['ogv'], input: 'collect', params: [P('Title', 'string'), P('PassThru', 'switch'), P('OutputMode', 'enum', { values: ['None', 'Single', 'Multiple'] }), P('Wait', 'switch'), P('InputObject', 'object')],
  run: async (c, p, input) => {
    const items = U.enumerate(input || []);
    if (!c.host.gridView || c.session.remoteOrigin) return c.error('Out-GridView kann in dieser Sitzung nicht angezeigt werden, da keine grafische Oberfläche zur Verfügung steht.', { category: 'NotImplemented', fqid: 'GridViewNotAvailable' });
    const vw = items.length && items[0] instanceof PSObject ? F.viewFor(items[0]) : null;
    const cols = vw && Array.isArray(vw.table) ? vw.table : null;
    const names = cols ? cols.map(x => x.l) : (items.length && items[0] instanceof PSObject ? F.allProps(items[0]) : ['Wert']);
    const rows = items.map(o => !(o instanceof PSObject) ? [F.cell(o)] : cols ? cols.map(x => F.cell(x.g ? x.g(o) : U.getProp(o, x.p))) : names.map(n => F.cell(U.getProp(o, n))));
    const pass = p.PassThru || (p.OutputMode && p.OutputMode !== 'None');
    const title = p.Title || (c.ctx.entry ? c.ctx.entry.line : 'Out-GridView');
    if (!pass) { c.host.gridView(title, names, rows, false); return; }
    const sel = await c.host.gridView(title, names, rows, true);
    if ((p.PassThru || p.OutputMode) && sel) c.outAll(sel.map(i => items[i]));
  } });

/* ---------- Write-* / Read-Host ---------- */
const COLORS = ['Black', 'DarkBlue', 'DarkGreen', 'DarkCyan', 'DarkRed', 'DarkMagenta', 'DarkYellow', 'Gray', 'DarkGray', 'Blue', 'Green', 'Cyan', 'Red', 'Magenta', 'Yellow', 'White'];
def({ name: 'Write-Host', input: 'collect', params: [P('Object', 'object', { pos: 0, rest: true }), P('NoNewline', 'switch'), P('Separator', 'object'), P('ForegroundColor', 'enum', { values: COLORS, enumType: 'System.ConsoleColor' }), P('BackgroundColor', 'enum', { values: COLORS, enumType: 'System.ConsoleColor' })],
  run: async (c, p, input) => {
    let objs = p.Object !== undefined ? V.toArr(p.Object) : (input || []);
    const sep = p.Separator !== undefined ? V.toStr(p.Separator) : ' ';
    const text = U.enumerate(objs).map(x => x instanceof PSHash ? V.typeOf(x) : V.toStr(x)).join(sep);
    c.host.write(text, { color: p.ForegroundColor, bg: p.BackgroundColor, nonl: p.NoNewline });
    if (c.ctx.entry) (c.ctx.entry.hostText = c.ctx.entry.hostText || []).push(text);
    if (c.ctx.entry) (c.ctx.entry.hostText = c.ctx.entry.hostText || []).push(text);
  } });
def({ name: 'Write-Output', aliases: ['echo', 'write'], input: 'collect', params: [P('InputObject', 'object', { pos: 0, rest: true }), P('NoEnumerate', 'switch')],
  run: async (c, p, input) => {
    if (p.InputObject !== undefined) { if (p.NoEnumerate) c.out(p.InputObject); else c.outAll(V.toArr(p.InputObject)); }
    if (input) c.outAll(input);
  } });
def({ name: 'Write-Warning', input: 'collect', params: [P('Message', 'string', { pos: 0, mandatory: true })], run: async (c, p) => { c.host.write('WARNUNG: ' + p.Message, { color: 'yellow' }); if (c.ctx.entry) (c.ctx.entry.warnings = c.ctx.entry.warnings || []).push(p.Message); } });
def({ name: 'Write-Verbose', input: 'collect', params: [P('Message', 'string', { pos: 0, mandatory: true })], run: async (c, p) => { const pref = I.prefValue(c.ctx, 'VerbosePreference'); if (pref && /continue/i.test(pref) && !/silently/i.test(pref)) c.host.write('AUSFÜHRLICH: ' + p.Message, { color: 'yellow' }); } });
def({ name: 'Write-Debug', input: 'collect', params: [P('Message', 'string', { pos: 0, mandatory: true })], run: async () => { } });
def({ name: 'Write-Information', input: 'collect', params: [P('MessageData', 'object', { pos: 0 }), P('Tags', 'string[]')], run: async () => { } });
def({ name: 'Write-Error', input: 'collect', params: [P('Message', 'string', { pos: 0 }), P('Exception', 'object'), P('ErrorRecord', 'object'), P('Category', 'enum', { values: ['NotSpecified', 'OpenError', 'CloseError', 'DeviceError', 'DeadlockDetected', 'InvalidArgument', 'InvalidData', 'InvalidOperation', 'InvalidResult', 'InvalidType', 'MetadataError', 'NotImplemented', 'NotInstalled', 'ObjectNotFound', 'OperationStopped', 'OperationTimeout', 'SyntaxError', 'ParserError', 'PermissionDenied', 'ResourceBusy', 'ResourceExists', 'ResourceUnavailable', 'ReadError', 'WriteError', 'FromStdErr', 'SecurityError'] }), P('ErrorId', 'string'), P('TargetObject', 'object'), P('CategoryReason', 'string')],
  run: async (c, p) => {
    const inScript = c.ctx.file;
    const r = new ErrorRecord({ message: p.Message || (p.Exception ? V.toStr(p.Exception) : ''), category: p.Category || 'NotSpecified', exception: 'Microsoft.PowerShell.Commands.WriteErrorException', fqid: (p.ErrorId || 'Microsoft.PowerShell.Commands.WriteErrorException') + (inScript ? ',' + inScript : ''), target: p.TargetObject === undefined ? '' : p.TargetObject, cmd: inScript ? inScript : 'Write-Error', pos: GG.posOf(c.ctx.cmdNode), reason: 'WriteErrorException' });
    if (c.log) c.log.ok = false;
    I.writeError(r, c.ctx, p.ErrorAction);
  } });
def({ name: 'Read-Host', input: 'none', params: [P('Prompt', 'object', { pos: 0, rest: true }), P('AsSecureString', 'switch')],
  run: async (c, p) => {
    const pr = p.Prompt !== undefined ? V.toArr(p.Prompt).map(V.toStr).join(' ') + ': ' : '';
    const s = await c.host.readLine(pr, { secure: p.AsSecureString });
    if (s === null) throw new GG.StopSignal();
    c.out(p.AsSecureString ? new SecureString(s) : s);
  } });

/* ---------- Datum / Zufall / Zeit ---------- */
def({ name: 'Get-Date', input: 'collect', params: [P('Date', 'date', { pos: 0, pipe: 'value' }), P('Format', 'string'), P('UFormat', 'string'), P('Year', 'int'), P('Month', 'int'), P('Day', 'int'), P('Hour', 'int'), P('Minute', 'int'), P('Second', 'int'), P('Millisecond', 'int'), P('DisplayHint', 'enum', { values: ['Date', 'Time', 'DateTime'] })],
  run: async (c, p, input) => {
    let d = p.Date ? new Date(p.Date.t) : (input && input[0] instanceof PSDate ? new Date(input[0].t) : new Date());
    if (p.Year !== undefined) d.setFullYear(p.Year); if (p.Month !== undefined) d.setMonth(p.Month - 1); if (p.Day !== undefined) d.setDate(p.Day);
    if (p.Hour !== undefined) d.setHours(p.Hour); if (p.Minute !== undefined) d.setMinutes(p.Minute); if (p.Second !== undefined) d.setSeconds(p.Second); if (p.Millisecond !== undefined) d.setMilliseconds(p.Millisecond);
    if (p.Format) return c.out(V.netDateFormat(d, p.Format));
    if (p.UFormat) return c.out(p.UFormat.replace(/%([a-zA-Z])/g, (a, k) => ({ Y: d.getFullYear(), y: String(d.getFullYear()).slice(-2), m: String(d.getMonth() + 1).padStart(2, '0'), d: String(d.getDate()).padStart(2, '0'), H: String(d.getHours()).padStart(2, '0'), M: String(d.getMinutes()).padStart(2, '0'), S: String(d.getSeconds()).padStart(2, '0'), A: V.DAYS_EN[d.getDay()], V: String(Math.ceil((((d - new Date(d.getFullYear(), 0, 1)) / 864e5) + new Date(d.getFullYear(), 0, 1).getDay() + 1) / 7)).padStart(2, '0'), s: Math.floor(d / 1000), j: String(Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5)).padStart(3, '0') }[k] !== undefined ? String({ Y: d.getFullYear(), y: String(d.getFullYear()).slice(-2), m: String(d.getMonth() + 1).padStart(2, '0'), d: String(d.getDate()).padStart(2, '0'), H: String(d.getHours()).padStart(2, '0'), M: String(d.getMinutes()).padStart(2, '0'), S: String(d.getSeconds()).padStart(2, '0'), A: V.DAYS_EN[d.getDay()], V: '00', s: Math.floor(d / 1000), j: '000' }[k]) : a)));
    const o = new PSDate(d);
    if (p.DisplayHint === 'Date') return c.out(V.netDateFormat(d, 'D'));
    if (p.DisplayHint === 'Time') return c.out(V.netDateFormat(d, 'T'));
    c.out(o);
  } });
def({ name: 'Get-Random', input: 'collect', params: [P('Maximum', 'object', { pos: 0 }), P('Minimum', 'object'), P('Count', 'int'), P('InputObject', 'object[]', { pos: 0 }), P('SetSeed', 'int')],
  run: async (c, p, input) => {
    const pool = input || (Array.isArray(p.Maximum) ? p.Maximum : (p.InputObject || null));
    if (pool) {
      const arr = pool.slice(); const n = Math.min(p.Count || 1, arr.length);
      for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
      return c.outAll(arr.slice(0, n));
    }
    const min = p.Minimum !== undefined ? V.toNum(p.Minimum) : 0;
    const max = p.Maximum !== undefined ? V.toNum(p.Maximum) : 2147483647;
    if (max <= min) return c.error(`Der Minimalwert (${min}) darf nicht größer als oder gleich dem Maximalwert (${max}) sein.`, { category: 'InvalidArgument', fqid: 'MinGreaterThanOrEqualMax' });
    const isInt = Number.isInteger(min) && Number.isInteger(max);
    for (let k = 0; k < (p.Count || 1); k++) c.out(isInt ? Math.floor(min + Math.random() * (max - min)) : min + Math.random() * (max - min));
  } });
def({ name: 'Start-Sleep', aliases: ['sleep'], input: 'none', params: [P('Seconds', 'double', { pos: 0 }), P('Milliseconds', 'int', { aliases: ['ms'] })],
  run: async (c, p) => { const ms = (p.Seconds || 0) * 1000 + (p.Milliseconds || 0); if (c.host.sleep) await c.host.sleep(Math.min(ms, 5000)); } });
GG.view('System.TimeSpan', null);
def({ name: 'New-TimeSpan', input: 'none', params: [P('Start', 'date', { pos: 0 }), P('End', 'date', { pos: 1 }), P('Days', 'int'), P('Hours', 'int'), P('Minutes', 'int'), P('Seconds', 'int')],
  run: async (c, p) => {
    if (p.Start || p.End) { const s = p.Start ? p.Start.t : Date.now(); const e = p.End ? p.End.t : Date.now(); return c.out(new TimeSpan(e - s)); }
    c.out(new TimeSpan(((((p.Days || 0) * 24 + (p.Hours || 0)) * 60 + (p.Minutes || 0)) * 60 + (p.Seconds || 0)) * 1000));
  } });
def({ name: 'Measure-Command', input: 'collect', params: [P('Expression', 'sb', { pos: 0, mandatory: true }), P('InputObject', 'object')],
  run: async (c, p, input) => { const t0 = Date.now(); await I.invokeSB(p.Expression, c.ctx, { input }); c.out(new TimeSpan(Math.max(1, Date.now() - t0) + Math.floor(Math.random() * 30))); } });

/* ---------- Verlauf / Host ---------- */
GG.view('Microsoft.PowerShell.Commands.HistoryInfo', { table: [{ l: 'Id', p: 'Id', w: 4, a: 'r' }, { l: 'CommandLine', p: 'CommandLine' }] });
def({ name: 'Get-History', module: 'Microsoft.PowerShell.Core', aliases: ['h', 'history', 'ghy'], input: 'none', params: [P('Id', 'int[]', { pos: 0 }), P('Count', 'int', { pos: 1 })],
  run: async (c, p) => {
    const hist = (c.ctx.origin || c.session).history;
    let h = hist.slice(0, -1);
    if (p.Id) h = h.filter(x => p.Id.includes(x.id));
    if (p.Count) h = h.slice(-p.Count);
    c.outAll(h.map(x => new PSObject('Microsoft.PowerShell.Commands.HistoryInfo', { Id: x.id, CommandLine: x.line, ExecutionStatus: 'Completed', StartExecutionTime: x.start, EndExecutionTime: x.start })));
  } });
def({ name: 'Clear-History', module: 'Microsoft.PowerShell.Core', aliases: ['clhy'], input: 'none', params: [], run: async (c) => { (c.ctx.origin || c.session).history.length = 0; } });
def({ name: 'Clear-Host', module: 'Microsoft.PowerShell.Core', cmdType: 'Function', aliases: ['cls', 'clear'], input: 'none', params: [], noCommon: true, run: async (c) => { c.host.clear(); } });
GG.view('System.Management.Automation.Internal.Host.InternalHost', { kind: 'list', list: ['Name', 'Version', 'InstanceId', 'UI', 'CurrentCulture', 'CurrentUICulture', 'PrivateData', 'DebuggerEnabled', 'IsRunspacePushed', 'Runspace'].map(p => ({ p })) });
def({ name: 'Get-Host', input: 'none', params: [], run: async (c) => c.out(GG.hostObj(c.ctx)) });
GG.view('System.Globalization.CultureInfo', { table: [{ l: 'LCID', p: 'LCID', w: 15, a: 'r' }, { l: 'Name', p: 'Name', w: 16 }, { l: 'DisplayName', p: 'DisplayName' }] });
def({ name: 'Get-Culture', input: 'none', params: [], run: async (c) => c.out(new PSObject('System.Globalization.CultureInfo', { Parent: 'de', LCID: 1031, KeyboardLayoutId: 1031, Name: 'de-DE', IetfLanguageTag: 'de-DE', DisplayName: 'Deutsch (Deutschland)', NativeName: 'Deutsch (Deutschland)', EnglishName: 'German (Germany)', TwoLetterISOLanguageName: 'de' })) });
def({ name: 'Get-UICulture', input: 'none', params: [], run: async (c) => c.out(new PSObject('System.Globalization.CultureInfo', { LCID: 1031, Name: 'de-DE', DisplayName: 'Deutsch (Deutschland)' })) });
GG.view('System.TimeZoneInfo', { kind: 'list', list: ['Id', 'DisplayName', 'StandardName', 'DaylightName', 'BaseUtcOffset', 'SupportsDaylightSavingTime'].map(p => ({ p })) });
def({ name: 'Get-TimeZone', module: 'Microsoft.PowerShell.Management', input: 'none', params: [P('Name', 'string[]', { pos: 0 }), P('ListAvailable', 'switch')], run: async (c) => c.out(new PSObject('System.TimeZoneInfo', { Id: 'W. Europe Standard Time', DisplayName: '(UTC+01:00) Amsterdam, Berlin, Bern, Rom, Stockholm, Wien', StandardName: 'Mitteleuropäische Zeit', DaylightName: 'Mitteleuropäische Sommerzeit', BaseUtcOffset: new TimeSpan(36e5), SupportsDaylightSavingTime: true })) });

/* ---------- Variablen ---------- */
GG.view('System.Management.Automation.PSVariable', { table: [{ l: 'Name', p: 'Name', w: 30 }, { l: 'Value', p: 'Value' }] });
function varObj(name, value, extra) { const o = new PSObject('System.Management.Automation.PSVariable', Object.assign({ PSPath: 'Microsoft.PowerShell.Core\\Variable::' + name, Name: name, Description: '', Value: value, Visibility: 'Public', Module: null, ModuleName: '', Options: 'None', Attributes: [] }, extra || {})); o.toStringFn = () => name; return o; }
GG.varObj = varObj;
GG.allVars = function (ctx) {
  const map = new Map();
  for (let s = ctx.scope; s; s = s.parent) for (const [k, e] of s.vars) if (!map.has(k)) map.set(k, e);
  const res = [];
  const autos = ['$', '?', '^', 'args', 'ConfirmPreference', 'ConsoleFileName', 'DebugPreference', 'Error', 'ErrorActionPreference', 'ErrorView', 'ExecutionContext', 'false', 'FormatEnumerationLimit', 'HOME', 'Host', 'InformationPreference', 'input', 'MaximumAliasCount', 'MaximumDriveCount', 'MaximumErrorCount', 'MaximumFunctionCount', 'MaximumHistoryCount', 'MaximumVariableCount', 'MyInvocation', 'NestedPromptLevel', 'null', 'OutputEncoding', 'PID', 'PROFILE', 'ProgressPreference', 'PSBoundParameters', 'PSCommandPath', 'PSCulture', 'PSDefaultParameterValues', 'PSEdition', 'PSEmailServer', 'PSHOME', 'PSScriptRoot', 'PSSessionApplicationName', 'PSSessionConfigurationName', 'PSSessionOption', 'PSUICulture', 'PSVersionTable', 'PWD', 'ShellId', 'StackTrace', 'true', 'VerbosePreference', 'WarningPreference', 'WhatIfPreference'];
  for (const a of autos) if (!map.has(a.toLowerCase())) res.push({ name: a, value: I.getVar({ name: a, scope: null }, ctx) });
  for (const e of map.values()) res.push({ name: e.name, value: e.value, readonly: e.readonly });
  res.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  return res;
};
def({ name: 'Get-Variable', aliases: ['gv'], input: 'none', params: [P('Name', 'string[]', { pos: 0 }), P('ValueOnly', 'switch'), P('Scope', 'string'), P('Exclude', 'string[]'), P('Include', 'string[]')],
  run: async (c, p) => {
    const all = GG.allVars(c.ctx);
    const names = p.Name || ['*'];
    for (const n of names) {
      const m = all.filter(v => V.like(v.name, n) && !(p.Exclude && p.Exclude.some(x => V.like(v.name, x))));
      if (!m.length && !V.hasWild(n)) { c.error(`Es wurde keine Variable mit dem Namen "${n}" gefunden.`, { category: 'ObjectNotFound', exception: 'System.Management.Automation.ItemNotFoundException', fqid: 'VariableNotFound', target: n, reason: 'ItemNotFoundException' }); continue; }
      for (const v of m) c.out(p.ValueOnly ? v.value : varObj(v.name, v.value));
    }
  } });
for (const nm of ['Set-Variable', 'New-Variable']) def({ name: nm, aliases: nm === 'Set-Variable' ? ['set', 'sv'] : ['nv'], input: 'collect', params: [P('Name', 'string[]', { pos: 0, mandatory: true }), P('Value', 'object', { pos: 1 }), P('Option', 'string'), P('Scope', 'string'), P('Force', 'switch'), P('PassThru', 'switch'), P('Description', 'string')],
  run: async (c, p, input) => {
    const val = p.Value !== undefined ? p.Value : (input ? V.unwrap(input) : null);
    const sc = (p.Scope || '').toLowerCase() === 'global' ? c.session.global : ((p.Scope || '').toLowerCase() === 'script' ? c.scope.scriptScope() : c.scope);
    for (const n of p.Name) {
      if (nm === 'New-Variable' && sc.vars.has(n.toLowerCase()) && !p.Force) { c.error(`Eine Variable mit dem Namen "${n}" ist bereits vorhanden.`, { category: 'ResourceExists', exception: 'System.Management.Automation.SessionStateException', fqid: 'VariableAlreadyExists', target: n }); continue; }
      sc.setLocal(n, val, { force: p.Force });
      if (p.Option && /readonly|constant/i.test(p.Option)) sc.vars.get(n.toLowerCase()).readonly = true;
      if (p.PassThru) c.out(varObj(n, val));
    }
  } });
def({ name: 'Remove-Variable', aliases: ['rv'], input: 'none', params: [P('Name', 'string[]', { pos: 0, mandatory: true }), P('Scope', 'string'), P('Force', 'switch')],
  run: async (c, p) => {
    for (const n of p.Name) {
      let done = false;
      for (let s = c.scope; s; s = s.parent) if (s.vars.has(n.toLowerCase())) { s.vars.delete(n.toLowerCase()); done = true; break; }
      if (!done) c.error(`Es wurde keine Variable mit dem Namen "${n}" gefunden.`, { category: 'ObjectNotFound', exception: 'System.Management.Automation.ItemNotFoundException', fqid: 'VariableNotFound', target: n });
    }
  } });
def({ name: 'Clear-Variable', aliases: ['clv'], input: 'none', params: [P('Name', 'string[]', { pos: 0, mandatory: true }), P('Scope', 'string')],
  run: async (c, p) => { for (const n of p.Name) { const e = c.scope.find(n); if (e) e.value = null; else c.error(`Es wurde keine Variable mit dem Namen "${n}" gefunden.`, { category: 'ObjectNotFound', fqid: 'VariableNotFound', target: n }); } } });

/* ---------- Objekte ---------- */
def({ name: 'New-Object', input: 'none', params: [P('TypeName', 'string', { pos: 0 }), P('ArgumentList', 'object[]', { pos: 1, aliases: ['Args'] }), P('Property', 'hash'), P('ComObject', 'string')],
  run: async (c, p) => {
    if (p.ComObject) return c.error(`Die COM-Komponente mit der CLSID ... für "${p.ComObject}" kann in dieser Simulation nicht erstellt werden.`, { category: 'ResourceUnavailable', fqid: 'NoCOMClassIdentified' });
    const tn = (p.TypeName || '').toLowerCase().replace(/^system\./, '');
    let o;
    if (tn === 'psobject' || tn === 'management.automation.psobject' || tn === 'pscustomobject' || tn === 'object') o = new PSObject('System.Management.Automation.PSCustomObject');
    else if (tn === 'collections.arraylist' || /^collections\.generic\.list/.test(tn)) { o = []; o.isList = true; }
    else if (tn === 'management.automation.pscredential') o = GG.mkCredential(V.toStr(p.ArgumentList[0]), p.ArgumentList[1]);
    else if (tn === 'collections.hashtable') o = new PSHash();
    else if (tn === 'datetime') { const a = (p.ArgumentList || []).map(V.toInt); o = new PSDate(new Date(a[0] || 1, (a[1] || 1) - 1, a[2] || 1, a[3] || 0, a[4] || 0, a[5] || 0)); }
    else if (tn === 'net.webclient' || tn === 'net.sockets.tcpclient') return c.error(`Netzwerkobjekte vom Typ "${p.TypeName}" stehen in dieser Simulation nicht zur Verfügung.`, { category: 'NotImplemented', fqid: 'TypeNotSupported' });
    else return c.error(`Der Typ [${p.TypeName}] wurde nicht gefunden. Stellen Sie sicher, dass die Assembly, die diesen Typ enthält, geladen wird.`, { category: 'InvalidType', fqid: 'TypeNotFound', target: '', exception: 'System.Management.Automation.PSArgumentException' });
    if (p.Property && o instanceof PSObject) for (const e of p.Property.entries()) o.set(e.key, e.value);
    c.out(o);
  } });
def({ name: 'Add-Member', input: 'collect', params: [P('MemberType', 'enum', { pos: 0, values: ['NoteProperty', 'AliasProperty', 'ScriptProperty', 'ScriptMethod', 'CodeProperty', 'PropertySet'], aliases: ['Type'] }), P('Name', 'string', { pos: 1 }), P('Value', 'object', { pos: 2 }), P('SecondValue', 'object', { pos: 3 }), P('NotePropertyName', 'string'), P('NotePropertyValue', 'object'), P('NotePropertyMembers', 'hash'), P('InputObject', 'object'), P('PassThru', 'switch'), P('Force', 'switch'), P('TypeName', 'string')],
  run: async (c, p, input) => {
    const objs = input || (p.InputObject !== undefined ? [p.InputObject] : []);
    for (const o of objs) {
      if (!(o instanceof PSObject)) { c.error('Add-Member kann in dieser Simulation nur Objekten vom Typ PSObject Elemente hinzufügen.', { category: 'InvalidOperation', fqid: 'AddMemberNotSupported' }); continue; }
      const add = (n, v) => { if (o.has(n) && !p.Force) { c.error(`Add-Member kann keinen Member mit dem Namen "${n}" hinzufügen, da bereits ein Member mit dem Namen vorhanden ist. Verwenden Sie zum Überschreiben des Members den Force-Parameter.`, { category: 'InvalidOperation', fqid: 'MemberAlreadyExists', target: V.toStr(o) }); return; } o.add(n, v); };
      if (p.NotePropertyMembers) for (const e of p.NotePropertyMembers.entries()) add(e.key, e.value);
      else if (p.NotePropertyName) add(p.NotePropertyName, p.NotePropertyValue === undefined ? null : p.NotePropertyValue);
      else if (p.MemberType === 'AliasProperty') { const tgt = V.toStr(p.Value); o.add(p.Name, null, (s) => s.get(tgt)); }
      else if (p.MemberType === 'ScriptMethod') { const sb = p.Value; o.methods[p.Name.toLowerCase()] = async function (args, ctx) { return V.unwrap(await I.invokeSB(sb, Object.assign({}, ctx), { args, dollar: o })); }; }
      else if (p.MemberType === 'ScriptProperty') { const sb = p.Value; o.add(p.Name, null, null); o.scriptProps = o.scriptProps || {}; o.scriptProps[p.Name.toLowerCase()] = sb; c.ctx.host.write('WARNUNG: ScriptProperty wird in der Simulation beim Hinzufügen einmalig berechnet.', { color: 'yellow' }); o.set(p.Name, V.unwrap(await I.invokeSB(sb, c.ctx, { dollar: o }))); }
      else add(p.Name, p.Value === undefined ? null : p.Value);
      if (p.PassThru) c.out(o);
    }
  } });
GG.view('System.Management.Automation.PSCustomObject#Compare', null);
def({ name: 'Compare-Object', aliases: ['compare', 'diff'], input: 'none', params: [P('ReferenceObject', 'object[]', { pos: 0, mandatory: true }), P('DifferenceObject', 'object[]', { pos: 1, mandatory: true }), P('Property', 'object[]'), P('IncludeEqual', 'switch'), P('ExcludeDifferent', 'switch'), P('PassThru', 'switch'), P('CaseSensitive', 'switch'), P('SyncWindow', 'int')],
  run: async (c, p) => {
    const ref = p.ReferenceObject || [], dif = p.DifferenceObject || [];
    const specs = p.Property ? await U.propSpecs(p.Property, c.ctx, ref.concat(dif), 'Compare-Object') : null;
    const key = async o => specs ? (await Promise.all(specs.map(s => s.get(o)))).map(V.toStr).join('\u0000') : V.toStr(o);
    const norm = s => p.CaseSensitive ? s : s.toLowerCase();
    const rk = await Promise.all(ref.map(key)), dk = await Promise.all(dif.map(key));
    const usedD = new Set();
    const res = [];
    const mk = async (o, side) => {
      if (p.PassThru) return o;
      const r = new PSObject('System.Management.Automation.PSCustomObject');
      if (specs) for (const s of specs) r.add(s.label, await s.get(o)); else r.add('InputObject', o);
      r.add('SideIndicator', side); return r;
    };
    for (let i = 0; i < ref.length; i++) {
      const j = dk.findIndex((k, idx) => !usedD.has(idx) && norm(k) === norm(rk[i]));
      if (j >= 0) { usedD.add(j); if (p.IncludeEqual) res.push(await mk(ref[i], '==')); }
      else if (!p.ExcludeDifferent) res.push({ later: true, o: ref[i] });
    }
    const out = [];
    for (const x of res) if (!x.later) out.push(x);
    for (let j = 0; j < dif.length; j++) if (!usedD.has(j) && !p.ExcludeDifferent) out.push(await mk(dif[j], '=>'));
    for (const x of res) if (x.later) out.push(await mk(x.o, '<='));
    c.outAll(out);
  } });
def({ name: 'Tee-Object', aliases: ['tee'], input: 'collect', params: [P('FilePath', 'string', { pos: 0 }), P('Variable', 'string'), P('Append', 'switch'), P('InputObject', 'object')],
  run: async (c, p, input) => {
    input = input || [];
    if (p.Variable) c.scope.setLocal(p.Variable, V.unwrap(input.slice()));
    if (p.FilePath) await GG.fsx.writeText(c.ctx, p.FilePath, GG.fmt.toText(input, c.ctx, 120), p.Append, 'Unicode');
    c.outAll(input);
  } });
def({ name: 'Get-Unique', aliases: ['gu'], input: 'collect', params: [P('AsString', 'switch'), P('InputObject', 'object')],
  run: async (c, p, input) => { let last; const out = []; for (const x of input || []) { const k = V.toStr(x); if (k !== last) out.push(x); last = k; } c.outAll(out); } });
def({ name: 'Invoke-Expression', aliases: ['iex'], input: 'collect', params: [P('Command', 'string', { pos: 0, mandatory: true })],
  run: async (c, p) => {
    const ast = GG.parse(p.Command);
    const out = []; await I.execBody(ast.body || [], c.ctx, out); c.outAll(out);
  } });

/* ---------- SecureString / Credential ---------- */
def({ name: 'ConvertTo-SecureString', module: 'Microsoft.PowerShell.Security', input: 'collect', params: [P('String', 'string', { pos: 0, mandatory: true, pipe: 'value' }), P('AsPlainText', 'switch'), P('Force', 'switch'), P('Key', 'object'), P('SecureKey', 'object')],
  run: async (c, p, input) => {
    const s = p.String !== undefined ? p.String : V.toStr(input && input[0]);
    if (p.AsPlainText && !p.Force) return c.error('Das System kann die Klartexteingabe nicht schützen. Geben Sie den Befehl erneut mit dem Force-Parameter ein, um diese Warnung zu unterdrücken und den Klartext in eine SecureString-Zeichenfolge zu konvertieren. Weitere Informationen erhalten Sie mit "get-help ConvertTo-SecureString".', { category: 'InvalidArgument', exception: 'System.ArgumentException', fqid: 'ImportSecureString_InvalidArgument', target: '', reason: 'ArgumentException' });
    if (p.AsPlainText) return c.out(new SecureString(s));
    if (/^01000000d08c9ddf0115d1118c7a00c04fc297eb/.test(s)) { try { const hex = s.slice(40); let plain = ''; for (let k = 0; k < hex.length; k += 4) plain += String.fromCharCode(parseInt(hex.slice(k, k + 4), 16) ^ 0x2a); return c.out(new SecureString(plain)); } catch (e) { } }
    c.error('Die Eingabezeichenfolge hat das falsche Format.', { category: 'InvalidArgument', exception: 'System.FormatException', fqid: 'ImportSecureString_InvalidArgument_CryptographicError', reason: 'FormatException' });
  } });
def({ name: 'ConvertFrom-SecureString', module: 'Microsoft.PowerShell.Security', input: 'collect', params: [P('SecureString', 'secure', { pos: 0, mandatory: true, pipe: 'value' }), P('Key', 'object')],
  run: async (c, p, input) => {
    const ss = p.SecureString || (input && input[0]);
    if (!(ss instanceof SecureString)) return c.error('Das Eingabeobjekt ist kein SecureString.', { category: 'InvalidArgument', fqid: 'InvalidSecureString' });
    let hex = ''; for (const ch of ss.plain) hex += (ch.charCodeAt(0) ^ 0x2a).toString(16).padStart(4, '0');
    c.out('01000000d08c9ddf0115d1118c7a00c04fc297eb' + hex);
  } });
def({ name: 'Get-Credential', module: 'Microsoft.PowerShell.Security', input: 'none', params: [P('Credential', 'object', { pos: 0, aliases: ['UserName'] }), P('Message', 'string'), P('Title', 'string')],
  run: async (c, p) => {
    if (p.Credential instanceof PSObject) return c.out(p.Credential);
    const res = await c.host.credential(p.Credential ? V.toStr(p.Credential) : '', p.Message || 'Anmeldeinformationen eingeben');
    if (!res) return c.error('Der Vorgang wurde vom Benutzer abgebrochen.', { category: 'InvalidArgument', fqid: 'CouldNotPromptForCredential' });
    c.out(GG.mkCredential(res.user, new SecureString(res.pass)));
  } });

/* ---------- Verben ---------- */
GG.view('System.Management.Automation.VerbInfo', { table: [{ l: 'Verb', p: 'Verb', w: 12 }, { l: 'Group', p: 'Group' }] });
const VERBS = 'Add:Common Clear:Common Close:Common Copy:Common Enter:Common Exit:Common Find:Common Format:Common Get:Common Hide:Common Join:Common Lock:Common Move:Common New:Common Open:Common Optimize:Common Pop:Common Push:Common Redo:Common Remove:Common Rename:Common Reset:Common Resize:Common Search:Common Select:Common Set:Common Show:Common Skip:Common Split:Common Step:Common Switch:Common Undo:Common Unlock:Common Watch:Common Connect:Communications Disconnect:Communications Read:Communications Receive:Communications Send:Communications Write:Communications Backup:Data Checkpoint:Data Compare:Data Compress:Data Convert:Data ConvertFrom:Data ConvertTo:Data Dismount:Data Edit:Data Expand:Data Export:Data Group:Data Import:Data Initialize:Data Limit:Data Merge:Data Mount:Data Out:Data Publish:Data Restore:Data Save:Data Sync:Data Unpublish:Data Update:Data Debug:Diagnostic Measure:Diagnostic Ping:Diagnostic Repair:Diagnostic Resolve:Diagnostic Test:Diagnostic Trace:Diagnostic Approve:Lifecycle Assert:Lifecycle Complete:Lifecycle Confirm:Lifecycle Deny:Lifecycle Disable:Lifecycle Enable:Lifecycle Install:Lifecycle Invoke:Lifecycle Register:Lifecycle Request:Lifecycle Restart:Lifecycle Resume:Lifecycle Start:Lifecycle Stop:Lifecycle Submit:Lifecycle Suspend:Lifecycle Uninstall:Lifecycle Unregister:Lifecycle Wait:Lifecycle Block:Security Grant:Security Protect:Security Revoke:Security Unblock:Security Unprotect:Security Use:Other'.split(' ').map(x => x.split(':'));
def({ name: 'Get-Verb', input: 'none', params: [P('Verb', 'string[]', { pos: 0 })],
  run: async (c, p) => { for (const [v, g] of VERBS) if (!p.Verb || p.Verb.some(x => V.like(v, x))) c.out(new PSObject('System.Management.Automation.VerbInfo', { Verb: v, Group: g })); } });

/* ---------- CSV ---------- */
function csvQuote(s) { return '"' + s.replace(/"/g, '""') + '"'; }
function csvVal(v) {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return 'System.Object[]';
  if (v instanceof PSHash) return 'System.Collections.Hashtable';
  if (typeof v === 'number') return V.fmtNum(v, true);
  if (v instanceof PSDate) return V.fmtDateDE(v.d);
  if (v instanceof PSObject && !v.toStringFn && (/PSCustomObject$/.test(v.typeName) || /^Selected/.test(v.typeName))) return '@{' + v.names().map(n => n + '=' + V.toStr(v.get(n))).join('; ') + '}';
  return V.toStr(v);
}
GG.toCsv = function (items, delim, noType) {
  const lines = [];
  if (!items.length) return lines;
  const first = items[0];
  const props = first instanceof PSObject ? first.names().filter(n => !(first.hiddenProps || []).includes(n.toLowerCase()) || n === 'PSComputerName') : (first instanceof PSHash ? ['IsReadOnly', 'IsFixedSize', 'IsSynchronized', 'Keys', 'Values', 'SyncRoot', 'Count'] : F.allProps(first));
  if (!noType) lines.push('#TYPE ' + (first instanceof PSObject ? first.typeName : V.typeOf(first)));
  lines.push(props.map(csvQuote).join(delim));
  for (const o of items) lines.push(props.map(n => csvQuote(csvVal(o instanceof PSHash ? GG.members.get(o, n) : U.getProp(o, n)))).join(delim));
  return lines;
};
GG.parseCsvLine = function (line, delim) {
  const res = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === delim) { res.push(cur); cur = ''; }
    else cur += ch;
  }
  res.push(cur);
  return res;
};
GG.fromCsv = function (text, delim, header) {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim() !== '');
  let typeName = null;
  if (lines.length && lines[0].startsWith('#TYPE ')) typeName = lines.shift().slice(6).trim();
  if (!lines.length) return [];
  let hdr = header || GG.parseCsvLine(lines.shift(), delim);
  hdr = hdr.map((h, i) => h === '' ? 'H' + (i + 1) : h);
  return lines.map(l => {
    const vals = GG.parseCsvLine(l, delim);
    const o = new PSObject(typeName ? ['CSV:' + typeName, 'System.Management.Automation.PSCustomObject'] : 'System.Management.Automation.PSCustomObject');
    hdr.forEach((h, i) => o.add(h, vals[i] === undefined ? null : vals[i]));
    return o;
  });
};
function toAscii(s) { return s.replace(/[^\x00-\x7f]/g, '?'); }
def({ name: 'Export-Csv', aliases: ['epcsv'], input: 'collect', sp: true, params: [P('Path', 'string', { pos: 0 }), P('LiteralPath', 'string', { aliases: ['PSPath'] }), P('Delimiter', 'string', { pos: 1 }), P('NoTypeInformation', 'switch', { aliases: ['NTI'] }), P('Append', 'switch'), P('Force', 'switch'), P('NoClobber', 'switch'), P('UseCulture', 'switch'), P('Encoding', 'enum', { values: GG.ENCODINGS }), P('InputObject', 'object')],
  run: async (c, p, input) => {
    if (p.InputObject !== undefined && input === null) input = [p.InputObject];
    const path = p.Path || p.LiteralPath;
    if (!path) throw GG.bindErr(c.ctx, 'Export-Csv', 'Geben Sie den Path- oder den LiteralPath-Parameter an.', 'CannotSpecifyPathAndLiteralPath');
    const delim = p.UseCulture ? ';' : (p.Delimiter !== undefined ? p.Delimiter : ',');
    if (delim.length !== 1) throw GG.bindErr(c.ctx, 'Export-Csv', `Der Parameter "Delimiter" kann nicht gebunden werden. Der Wert "${delim}" kann nicht in den Typ "System.Char" konvertiert werden. Fehler: "Die Zeichenfolge muss genau ein Zeichen lang sein."`, 'CannotConvertArgumentNoMessage');
    const items = U.enumerate(input || []).filter(x => x !== null);
    if (!(await c.should(GG.fsx.resolve(c.ctx, path).full, 'Export-Csv'))) return;
    let lines = GG.toCsv(items, delim, p.NoTypeInformation || (p.Append && GG.fsx.node(GG.fsx.resolve(c.ctx, path))));
    if (p.Append && GG.fsx.node(GG.fsx.resolve(c.ctx, path))) lines = lines.slice(1);
    let text = lines.join('\n') + (lines.length ? '\n' : '');
    const enc = p.Encoding || 'ASCII';
    if (enc === 'ASCII' || enc === 'Default' && false) text = toAscii(text);
    try { await GG.fsx.writeText(c.ctx, path, text, p.Append, enc === 'UTF8' ? 'UTF8BOM' : enc); }
    catch (e) { if (e instanceof PSRuntimeError) { e.rec.cmd = 'Export-Csv'; e.rec.pos = GG.posOf(c.ctx.cmdNode); } throw e; }
  } });
def({ name: 'Import-Csv', aliases: ['ipcsv'], input: 'none', params: [P('Path', 'string[]', { pos: 0 }), P('LiteralPath', 'string[]', { aliases: ['PSPath'] }), P('Delimiter', 'string', { pos: 1 }), P('Header', 'string[]'), P('UseCulture', 'switch'), P('Encoding', 'enum', { values: GG.ENCODINGS })],
  run: async (c, p) => {
    const delim = p.UseCulture ? ';' : (p.Delimiter !== undefined ? p.Delimiter : ',');
    for (const path of (p.Path || p.LiteralPath || [])) {
      const r = GG.fsx.resolve(c.ctx, path);
      const n = GG.fsx.node(r);
      if (!n) { c.error(`Die Datei "${r.full}" wurde nicht gefunden.`, { category: 'OpenError', exception: 'System.IO.FileNotFoundException', fqid: 'FileOpenFailure', target: '', reason: 'FileNotFoundException' }); continue; }
      if (n.dir) { c.error(`Der Zugriff auf den Pfad "${r.full}" wurde verweigert.`, { category: 'OpenError', exception: 'System.UnauthorizedAccessException', fqid: 'FileOpenFailure' }); continue; }
      if (!GG.checkAccess(c.session, n, 'read')) { c.error(`Der Zugriff auf den Pfad "${GG.fsx.canonical(r)}" wurde verweigert.`, { category: 'OpenError', exception: 'System.UnauthorizedAccessException', fqid: 'FileOpenFailure' }); continue; }
      c.outAll(GG.fromCsv(n.content || '', delim, p.Header));
    }
  } });
def({ name: 'ConvertTo-Csv', input: 'collect', params: [P('Delimiter', 'string', { pos: 1 }), P('NoTypeInformation', 'switch', { aliases: ['NTI'] }), P('UseCulture', 'switch'), P('InputObject', 'object', { pos: 0 })],
  run: async (c, p, input) => { if (p.InputObject !== undefined && input === null) input = V.toArr(p.InputObject); c.outAll(GG.toCsv(U.enumerate(input || []), p.UseCulture ? ';' : (p.Delimiter || ','), p.NoTypeInformation)); } });
def({ name: 'ConvertFrom-Csv', input: 'collect', params: [P('InputObject', 'object', { pos: 0 }), P('Delimiter', 'string', { pos: 1 }), P('Header', 'string[]'), P('UseCulture', 'switch')],
  run: async (c, p, input) => { const lines = U.enumerate(input || V.toArr(p.InputObject)).map(V.toStr); c.outAll(GG.fromCsv(lines.join('\n'), p.UseCulture ? ';' : (p.Delimiter || ','), p.Header)); } });

/* ---------- JSON ---------- */
GG.toJson = function (v, depth, compress, level) {
  level = level || 0;
  const ind = n => compress ? '' : '    '.repeat(n);
  const nl = compress ? '' : '\n';
  const sep = compress ? ':' : ':  ';
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (v instanceof GG.EnumVal) return String(v.value);
  if (typeof v === 'string') return JSON.stringify(v).replace(/[\u007f-\uffff]/g, ch => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'));
  if (v instanceof PSDate) return '"\\/Date(' + v.t + ')\\/"';
  if (v instanceof TimeSpan) return GG.toJson(new PSObject('x', { Ticks: v.ms * 10000, Days: Math.floor(v.ms / 864e5), Hours: Math.floor(v.ms / 36e5) % 24, Milliseconds: v.ms % 1000, Minutes: Math.floor(v.ms / 6e4) % 60, Seconds: Math.floor(v.ms / 1000) % 60, TotalDays: v.ms / 864e5, TotalHours: v.ms / 36e5, TotalMilliseconds: v.ms, TotalMinutes: v.ms / 6e4, TotalSeconds: v.ms / 1000 }), depth, compress, level);
  if (level > depth) return JSON.stringify(V.toStr(v));
  if (Array.isArray(v)) {
    if (!v.length) return '[' + nl + nl + ind(level) + ']';
    return '[' + nl + v.map(x => ind(level + 1) + GG.toJson(x, depth, compress, level + 1)).join(',' + nl) + nl + ind(level) + ']';
  }
  let entries;
  if (v instanceof PSHash) entries = v.entries().map(e => [V.toStr(e.key), e.value]);
  else if (v instanceof PSObject) entries = v.names().filter(n => !(v.hiddenProps || []).includes(n.toLowerCase())).map(n => [n, v.get(n)]);
  else return JSON.stringify(V.toStr(v));
  if (!entries.length) return '{' + nl + nl + ind(level) + '}';
  return '{' + nl + entries.map(([k, x]) => ind(level + 1) + JSON.stringify(k) + sep + GG.toJson(x, depth, compress, level + 1)).join(',' + nl) + nl + ind(level) + '}';
};
def({ name: 'ConvertTo-Json', input: 'collect', params: [P('InputObject', 'object', { pos: 0 }), P('Depth', 'int'), P('Compress', 'switch')],
  run: async (c, p, input) => {
    let v = input && input.length ? (input.length === 1 ? input[0] : input) : p.InputObject;
    const depth = p.Depth !== undefined ? p.Depth : 2;
    c.out(GG.toJson(v === undefined ? null : v, depth, p.Compress, 0));
  } });
GG.fromJsonVal = function (x) {
  if (Array.isArray(x)) return x.map(GG.fromJsonVal);
  if (x && typeof x === 'object') { const o = new PSObject('System.Management.Automation.PSCustomObject'); for (const k of Object.keys(x)) o.add(k, GG.fromJsonVal(x[k])); return o; }
  if (typeof x === 'string') { const m = /^\/Date\((\d+)\)\/$/.exec(x); if (m) return new PSDate(new Date(+m[1])); }
  return x;
};
def({ name: 'ConvertFrom-Json', input: 'collect', params: [P('InputObject', 'string', { pos: 0, mandatory: true, pipe: 'value' })],
  run: async (c, p, input) => {
    const text = input ? input.map(V.toStr).join('\n') : p.InputObject;
    let x;
    try { x = JSON.parse(text); } catch (e) { return c.error(`Ungültiges JSON-Primitive: ${String(text).trim().slice(0, 20)}.`, { category: 'NotSpecified', exception: 'System.ArgumentException', fqid: 'System.ArgumentException,Microsoft.PowerShell.Commands.ConvertFromJsonCommand', noClass: true }); }
    const v = GG.fromJsonVal(x);
    if (Array.isArray(v)) c.out(v); else c.out(v);
  } });

/* ---------- HTML ---------- */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
def({ name: 'ConvertTo-Html', input: 'collect', params: [P('Property', 'object[]', { pos: 0 }), P('Title', 'string'), P('Head', 'string[]'), P('Body', 'string[]'), P('PreContent', 'string[]'), P('PostContent', 'string[]'), P('Fragment', 'switch'), P('As', 'enum', { values: ['Table', 'List'] }), P('CssUri', 'string'), P('InputObject', 'object')],
  run: async (c, p, input) => {
    const items = U.enumerate(input || (p.InputObject !== undefined ? [p.InputObject] : []));
    const specs = p.Property ? await U.propSpecs(p.Property, c.ctx, items, 'ConvertTo-Html') : (items.length ? F.allProps(items[0]).filter(n => !(items[0].hiddenProps || []).includes(n.toLowerCase())).map(n => ({ label: n, get: async o => U.getProp(o, n) })) : []);
    const out = [];
    if (!p.Fragment) {
      out.push('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"  "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">', '<html xmlns="http://www.w3.org/1999/xhtml">', '<head>');
      if (p.Head) out.push(...p.Head); else out.push('<title>' + esc(p.Title || 'HTML TABLE') + '</title>');
      if (p.CssUri) out.push(`<link rel="stylesheet" type="text/css" href="${esc(p.CssUri)}" />`);
      out.push('</head><body>');
    }
    if (p.Body) out.push(...p.Body);
    if (p.PreContent) out.push(...p.PreContent);
    if (p.As === 'List') {
      for (const o of items) { out.push('<table>'); for (const s of specs) out.push(`<tr><td>${esc(s.label)}:</td><td>${esc(F.cell(await s.get(o)))}</td></tr>`); out.push('</table>'); }
    } else {
      out.push('<table>', '<colgroup>' + specs.map(() => '<col/>').join('') + '</colgroup>', '<tr>' + specs.map(s => '<th>' + esc(s.label) + '</th>').join('') + '</tr>');
      for (const o of items) { const cells = []; for (const s of specs) cells.push('<td>' + esc(F.cell(await s.get(o))) + '</td>'); out.push('<tr>' + cells.join('') + '</tr>'); }
      out.push('</table>');
    }
    if (p.PostContent) out.push(...p.PostContent);
    if (!p.Fragment) out.push('</body></html>');
    c.outAll(out);
  } });

/* ---------- Select-String ---------- */
GG.view('Microsoft.PowerShell.Commands.MatchInfo', { custom: (grp) => { const out = ['']; for (const o of grp) out.push(o.toStringFn(o)); out.push(''); return out; } });
def({ name: 'Select-String', aliases: ['sls'], input: 'collect', params: [P('Pattern', 'string[]', { pos: 0, mandatory: true }), P('Path', 'string[]', { pos: 1 }), P('LiteralPath', 'string[]'), P('SimpleMatch', 'switch'), P('CaseSensitive', 'switch'), P('NotMatch', 'switch'), P('AllMatches', 'switch'), P('List', 'switch'), P('Quiet', 'switch'), P('Context', 'int[]'), P('Include', 'string[]'), P('Exclude', 'string[]'), P('Encoding', 'string'), P('InputObject', 'object')],
  run: async (c, p, input) => {
    const res = [];
    const pats = p.Pattern.map(pt => p.SimpleMatch ? new RegExp(pt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), p.CaseSensitive ? 'g' : 'gi') : V.netRe(pt, p.CaseSensitive ? 'g' : 'gi'));
    const relPath = (full) => {
      const loc = c.session.loc.replace(/\\$/, '') + '\\';
      return full.toLowerCase().startsWith(loc.toLowerCase()) ? full.slice(loc.length) : full;
    };
    const search = (lines, path, display, fname) => {
      let found = 0;
      for (let k = 0; k < lines.length; k++) {
        const line = lines[k];
        let m = null; let used = null;
        for (const re of pats) { re.lastIndex = 0; const mm = re.exec(line); if (mm) { m = mm; used = re; break; } }
        if (p.NotMatch ? m : !m) continue;
        found++;
        const o = new PSObject('Microsoft.PowerShell.Commands.MatchInfo', { IgnoreCase: !p.CaseSensitive, LineNumber: k + 1, Line: line, Filename: fname || 'InputStream', Path: path || 'InputStream', Pattern: p.Pattern[0], Context: null, Matches: m ? [new PSObject('System.Text.RegularExpressions.Match', { Groups: [...m], Success: true, Captures: [m[0]], Index: m.index, Length: m[0].length, Value: m[0] })] : [] });
        o.toStringFn = () => path ? `${display}:${k + 1}:${line}` : line;
        res.push(o);
        if (p.List) break;
      }
      return found;
    };
    if (p.Path || p.LiteralPath) {
      for (const pth of (p.Path || p.LiteralPath)) {
        const rs = GG.fsx.expand(c.ctx, pth, { literal: !!p.LiteralPath });
        if (!rs.length || (rs.length === 1 && !GG.fsx.node(rs[0]))) { c.error(`Der Pfad "${GG.fsx.resolve(c.ctx, pth).full}" kann nicht gefunden werden, da er nicht vorhanden ist.`, { category: 'ObjectNotFound', exception: 'System.Management.Automation.ItemNotFoundException', fqid: 'ProcessingFile', target: pth, reason: 'ItemNotFoundException' }); continue; }
        for (const r of rs) {
          const n = GG.fsx.node(r);
          if (!n || n.dir) { if (n && n.dir) c.error(`Die Datei "${GG.fsx.canonical(r)}" kann nicht gelesen werden: Der Zugriff auf den Pfad "${GG.fsx.canonical(r)}" wurde verweigert.`, { category: 'PermissionDenied', exception: 'System.UnauthorizedAccessException', fqid: 'ProcessingFile', target: GG.fsx.canonical(r) }); continue; }
          if (!GG.checkAccess(c.session, n, 'read')) { c.error(`Die Datei "${GG.fsx.canonical(r)}" kann nicht gelesen werden: Der Zugriff auf den Pfad "${GG.fsx.canonical(r)}" wurde verweigert.`, { category: 'PermissionDenied', exception: 'System.UnauthorizedAccessException', fqid: 'ProcessingFile', target: GG.fsx.canonical(r) }); continue; }
          if (p.Include && !p.Include.some(x => V.like(n.name, x))) continue;
          const full = GG.fsx.canonical(r);
          search((n.content || '').replace(/\n$/, '').split('\n'), full, relPath(full), n.name);
        }
      }
    } else {
      for (const it of input || (p.InputObject !== undefined ? [p.InputObject] : [])) {
        if (it instanceof PSObject && it.ref && it.ref instanceof GG.FNode && !it.ref.dir) {
          const full = it.get('FullName');
          if (!GG.checkAccess(c.session, it.ref, 'read')) { c.error(`Die Datei "${full}" kann nicht gelesen werden: Der Zugriff auf den Pfad "${full}" wurde verweigert.`, { category: 'PermissionDenied', fqid: 'ProcessingFile', target: full }); continue; }
          search((it.ref.content || '').replace(/\n$/, '').split('\n'), full, relPath(full), it.ref.name);
        } else if (it instanceof PSObject && it.ref && it.ref instanceof GG.FNode) continue;
        else search([V.toStr(it)], null, null, null);
      }
    }
    if (p.Quiet) return c.out(res.length > 0);
    c.outAll(res);
  } });

/* ---------- Module ---------- */
GG.view('System.Management.Automation.PSModuleInfo', { group: { label: 'Verzeichnis', g: o => o.listDir || '' }, table: [{ l: 'ModuleType', p: 'ModuleType', w: 10 }, { l: 'Version', p: 'Version', w: 10 }, { l: 'Name', p: 'Name', w: 35 }, { l: 'ExportedCommands', g: o => o.get('ExportedCommands') }] });
GG.moduleInfo = function (m, ctx, list) {
  const cmds = Object.values(GG.cmdlets).filter(s => (s.module || '').toLowerCase() === m.name.toLowerCase()).map(s => s.name).sort();
  const o = new PSObject('System.Management.Automation.PSModuleInfo', { ModuleType: m.type || 'Manifest', Version: GG.versionObj(m.version), Name: m.name, ExportedCommands: cmds.length ? cmds : (m.commands || []), Path: m.path, Description: m.desc || '' });
  o.listDir = list ? m.dir : '';
  o.toStringFn = () => m.name;
  return o;
};
def({ name: 'Get-Module', module: 'Microsoft.PowerShell.Core', aliases: ['gmo'], input: 'none', params: [P('Name', 'string[]', { pos: 0 }), P('ListAvailable', 'switch'), P('All', 'switch'), P('Refresh', 'switch')],
  run: async (c, p) => {
    const all = GG.allModules(c.ctx);
    let list = p.ListAvailable ? all : all.filter(m => c.session.modulesLoaded.has(m.name.toLowerCase()));
    if (p.Name) list = list.filter(m => p.Name.some(n => V.like(m.name, n)));
    if (p.ListAvailable) list.sort((a, b) => (a.dirOrder - b.dirOrder) || a.name.localeCompare(b.name));
    c.outAll(list.map(m => GG.moduleInfo(m, c.ctx, p.ListAvailable)));
  } });
GG.allModules = function (ctx) {
  const sys = 'C:\\Windows\\system32\\WindowsPowerShell\\v1.0\\Modules';
  const pf = 'C:\\Program Files\\WindowsPowerShell\\Modules';
  const user = `C:\\Users\\${ctx.session.user}\\Documents\\WindowsPowerShell\\Modules`;
  const base = [
    { name: 'Microsoft.PowerShell.Management', version: '3.1.0.0', dir: sys, type: 'Manifest' }, { name: 'Microsoft.PowerShell.Utility', version: '3.1.0.0', dir: sys, type: 'Manifest' },
    { name: 'Microsoft.PowerShell.Security', version: '3.0.0.0', dir: sys, type: 'Manifest' }, { name: 'Microsoft.PowerShell.LocalAccounts', version: '1.0.0.0', dir: sys, type: 'Binary' },
    { name: 'Microsoft.PowerShell.Archive', version: '1.0.1.0', dir: sys, type: 'Script' }, { name: 'CimCmdlets', version: '1.0.0.0', dir: sys, type: 'Binary' },
    { name: 'NetAdapter', version: '2.0.0.0', dir: sys, type: 'Manifest' }, { name: 'NetTCPIP', version: '1.0.0.0', dir: sys, type: 'Manifest' }, { name: 'DnsClient', version: '1.0.0.0', dir: sys, type: 'Manifest' },
    { name: 'NetSecurity', version: '2.0.0.0', dir: sys, type: 'Manifest' }, { name: 'SmbShare', version: '2.0.0.0', dir: sys, type: 'Manifest' }, { name: 'Storage', version: '2.0.0.0', dir: sys, type: 'Manifest' },
    { name: 'PSReadline', version: '2.0.0', dir: pf, type: 'Script' }, { name: 'PowerShellGet', version: '1.0.0.1', dir: pf, type: 'Script' }, { name: 'PackageManagement', version: '1.0.0.1', dir: pf, type: 'Binary' },
    { name: 'Pester', version: '3.4.0', dir: pf, type: 'Script' }
  ];
  for (const m of ctx.world.modules || []) if (m.installed !== false) base.push(Object.assign({ dir: m.scope === 'CurrentUser' ? user : (m.dir || pf) }, m));
  const order = { [user]: 0, [pf]: 1, [sys]: 2 };
  return base.map(m => Object.assign({ dirOrder: order[m.dir] === undefined ? 3 : order[m.dir] }, m));
};
def({ name: 'Import-Module', module: 'Microsoft.PowerShell.Core', aliases: ['ipmo'], input: 'none', params: [P('Name', 'string[]', { pos: 0, mandatory: true }), P('Force', 'switch'), P('PassThru', 'switch'), P('Verbose', 'switch')],
  run: async (c, p) => {
    for (const n of p.Name) {
      const m = GG.allModules(c.ctx).find(x => x.name.toLowerCase() === n.toLowerCase());
      if (!m) { c.error(`Das angegebene Modul "${n}" wurde nicht geladen, da in keinem Modulverzeichnis eine gültige Moduldatei gefunden wurde.`, { category: 'ResourceUnavailable', exception: 'System.IO.FileNotFoundException', fqid: 'Modules_ModuleNotFound', target: n, reason: 'FileNotFoundException' }); continue; }
      c.session.modulesLoaded.add(m.name.toLowerCase());
      if (p.PassThru) c.out(GG.moduleInfo(m, c.ctx, false));
    }
  } });
def({ name: 'Remove-Module', module: 'Microsoft.PowerShell.Core', aliases: ['rmo'], input: 'none', params: [P('Name', 'string[]', { pos: 0, mandatory: true }), P('Force', 'switch')],
  run: async (c, p) => { for (const n of p.Name) c.session.modulesLoaded.delete(n.toLowerCase()); } });

/* ---------- Hilfe ---------- */
def({ name: 'Update-Help', module: 'Microsoft.PowerShell.Core', input: 'none', params: [P('Module', 'string[]', { pos: 0 }), P('UICulture', 'string[]'), P('Force', 'switch')],
  run: async (c, p) => {
    if (!c.session.elevated) return c.error('Fehler beim Aktualisieren der Hilfe für die Module "Microsoft.PowerShell.Management, Microsoft.PowerShell.Utility, ..." mit den UI-Kulturen "de-DE": Der Befehl kann nicht ausgeführt werden, weil Windows PowerShell nicht mit Administratorrechten ausgeführt wird. Starten Sie Windows PowerShell mit der Option "Als Administrator ausführen", und führen Sie den Befehl erneut aus.', { category: 'InvalidOperation', fqid: 'UpdatableHelpSystemRequiresElevation' });
    c.world.helpUpdated = true;
    if (c.host.sleep) await c.host.sleep(600);
  } });

})();
