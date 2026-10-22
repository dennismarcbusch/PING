/* Get-Going! – Dateisystem, Provider, Rechte, Archive, Ausführungsrichtlinie */
(function () {
'use strict';
const GG = globalThis.GG = globalThis.GG || {};
const V = GG.v, I = GG.interp, F = GG.fmt, FX = GG.fsx, U = GG.util;
const { PSObject, PSHash, ScriptBlock, PSDate, SecureString, PSRuntimeError } = GG;
const P = GG.P, def = GG.def;
const M = 'Microsoft.PowerShell.Management';

/* ---------- Ansichten ---------- */
const fsGroup = { label: 'Verzeichnis', g: o => { const pp = o.get('PSParentPath') || ''; return pp.replace(/^Microsoft\.PowerShell\.Core\\FileSystem::/, ''); } };
const fsTable = [
  { l: 'Mode', p: 'Mode', w: 6 },
  { l: 'LastWriteTime', g: o => { const d = o.get('LastWriteTime').d; return V.fmtDateShort(d) + '     ' + V.netDateFormat(d, 'HH:mm'); }, w: 27, a: 'r' },
  { l: 'Length', g: o => o.get('PSIsContainer') ? '' : o.get('Length'), w: 14, a: 'r' },
  { l: 'Name', p: 'Name' }];
const flFile = ['Name', 'Length', 'CreationTime', 'LastWriteTime', 'LastAccessTime', 'Mode', 'LinkType', 'Target'].map(p => ({ p })).concat([{ l: 'VersionInfo', g: o => 'File:             ' + o.get('FullName') + '\nInternalName:\nOriginalFilename:\nFileVersion:\nFileDescription:\nProduct:\nProductVersion:\nDebug:            False\nPatched:          False\nPreRelease:       False\nPrivateBuild:     False\nSpecialBuild:     False\nLanguage:' }]);
const flDir = ['Name', 'CreationTime', 'LastWriteTime', 'LastAccessTime', 'Mode', 'LinkType', 'Target'].map(p => ({ p }));
const fsView = { group: fsGroup, table: fsTable, flist: o => o.get('PSIsContainer') ? flDir : flFile, sortKey: 'Name', wideProp: o => o.get('PSIsContainer') ? '[' + o.get('Name') + ']' : o.get('Name') };
GG.view('System.IO.FileInfo', fsView);
GG.view('System.IO.DirectoryInfo', fsView);
GG.view('Microsoft.Win32.RegistryKey', {
  custom: (grp, width) => {
    const out = []; let cur = null; let rows = [];
    const flush = () => {
      if (!rows.length) return;
      out.push('', '', `    Hive: ${cur}`, '', '');
      out.push('Name                           Property', '----                           --------');
      for (const k of rows) {
        const vals = [...k.regKey.values.values()];
        const lw = vals.reduce((a, v) => Math.max(a, v.name.length), 0);
        const plines = vals.map(v => `${v.name.padEnd(lw)} : ${V.toStr(v.data)}`);
        const nm = k.regKey.name.length > 30 ? k.regKey.name.slice(0, 27) + '...' : k.regKey.name;
        out.push((nm.padEnd(30) + ' ' + (plines[0] || '')).replace(/\s+$/, ''));
        for (const l of plines.slice(1)) out.push(' '.repeat(31) + l);
      }
      rows = [];
    };
    for (const o of grp) { const hive = o.regPath.replace(/\\[^\\]*$/, ''); if (hive !== cur) { flush(); cur = hive; } rows.push(o); }
    flush(); out.push('');
    return out;
  }
});
GG.view('System.Collections.DictionaryEntry', { table: [{ l: 'Name', p: 'Name', w: 35 }, { l: 'Value', p: 'Value' }] });
GG.view('System.Management.Automation.PathInfo', { table: [{ l: 'Path', p: 'Path' }] });
GG.view('System.Management.Automation.PSDriveInfo', { table: [{ l: 'Name', p: 'Name', w: 10 }, { l: 'Used (GB)', g: o => o.get('Used') === null ? '' : V.formatValue(o.get('Used') / 1073741824, 'F2'), w: 13, a: 'r' }, { l: 'Free (GB)', g: o => o.get('Free') === null ? '' : V.formatValue(o.get('Free') / 1073741824, 'F2'), w: 13, a: 'r' }, { l: 'Provider', p: 'Provider', w: 13 }, { l: 'Root', p: 'Root', w: 35 }, { l: 'CurrentLocation', p: 'CurrentLocation', a: 'r' }] });
GG.view('System.Management.Automation.ProviderInfo', { table: [{ l: 'Name', p: 'Name', w: 20 }, { l: 'Capabilities', p: 'Capabilities', w: 40 }, { l: 'Drives', p: 'Drives' }] });

/* ---------- Hilfen ---------- */
const kidsSorted = n => {
  const k = [...n.children.values()];
  const cmp = (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  return k.filter(x => x.dir).sort(cmp).concat(k.filter(x => !x.dir).sort(cmp));
};
GG.kidsSorted = kidsSorted;
const join = (a, b) => a.replace(/\\$/, '') + '\\' + b;
function itemFor(r, node) {
  const full = FX.canonical(r);
  if (r.prov === 'FileSystem') return GG.fsItem(node, /^[A-Z]:$/i.test(full) ? full + '\\' : full, r.world);
  if (r.prov === 'Registry') return GG.regItem(node, full, r.world);
  return null;
}
GG.itemFor = itemFor;
function driveCheck(c, r) {
  if (r.error) { FX.errUnc(c, r); return false; }
  if (r.prov === 'FileSystem' && !r.world.fs[r.drive]) { FX.errDrive(c, r.drive); return false; }
  return true;
}
GG.driveCheck = driveCheck;
function envItems(ctx) { return GG.envAll(ctx).map(([k, v]) => { const o = new PSObject('System.Collections.DictionaryEntry', { Name: k, Key: k, Value: v, PSPath: 'Microsoft.PowerShell.Core\\Environment::' + k }); o.toStringFn = () => 'System.Collections.DictionaryEntry'; return o; }); }

/* ---------- Location ---------- */
def({ name: 'Get-Location', module: M, aliases: ['gl', 'pwd'], input: 'none', params: [P('PSProvider', 'string[]'), P('PSDrive', 'string[]'), P('Stack', 'switch')],
  run: async (c) => c.out(GG.pathInfo(c.session.loc)) });
def({ name: 'Set-Location', module: M, aliases: ['cd', 'chdir', 'sl'], input: 'collect', params: [P('Path', 'string', { pos: 0, pipe: 'both' }), P('LiteralPath', 'string', { aliases: ['PSPath'] }), P('PassThru', 'switch'), P('StackName', 'string')],
  run: async (c, p, input) => {
    let path = p.Path !== undefined ? p.Path : p.LiteralPath;
    if (path === undefined && input && input.length) path = input[0] instanceof PSObject ? (input[0].get('FullName') || input[0].get('Path')) : V.toStr(input[0]);
    if (path === undefined || path === null || path === '') path = c.session.home;
    if (path === '-') { if (c.session.prevLoc) path = c.session.prevLoc; else return; }
    let rs = FX.expand(c.ctx, path);
    let r = rs[0];
    if (!r) { FX.errNotFound(c, FX.resolve(c.ctx, path).full); return; }
    if (r.error) { FX.errUnc(c, r); return; }
    if (!FX.driveExists(c.ctx, r.drive) && !r.unc) { FX.errDrive(c, r.drive); return; }
    if (r.prov === 'FileSystem' || r.prov === 'Registry') {
      const n = FX.node(r);
      if (!n) { FX.errNotFound(c, r.viaDrive ? r.full : FX.canonical(r)); return; }
      if (r.prov === 'FileSystem' && !n.dir) { c.error(`Der Pfad "${FX.canonical(r)}" kann nicht gefunden werden, da er nicht vorhanden ist.`, { category: 'ObjectNotFound', exception: 'System.Management.Automation.ItemNotFoundException', fqid: 'PathNotFound', target: FX.canonical(r), reason: 'ItemNotFoundException' }); return; }
      if (r.prov === 'FileSystem' && !GG.checkAccess(c.session, n, 'read')) { FX.errDenied(c, FX.canonical(r), { fqid: 'UnauthorizedAccess' }); }
    }
    c.session.prevLoc = c.session.loc;
    let loc = r.viaDrive ? r.full : (r.prov === 'FileSystem' || r.prov === 'Registry' ? FX.canonical(r) : r.drive + ':\\' + r.parts.join('\\'));
    if (r.prov !== 'FileSystem' && !r.parts.length) loc = r.drive.charAt(0) + r.drive.slice(1).toLowerCase() + ':\\';
    if (/^HK/i.test(loc)) loc = loc.replace(/^hk[a-z]+/i, x => x.toUpperCase());
    if (/^[A-Z]:$/i.test(loc)) loc += '\\';
    if (loc.length > 3 && !r.unc) loc = loc.replace(/\\$/, '');
    c.session.loc = loc;
    if (p.PassThru) c.out(GG.pathInfo(loc));
  } });
def({ name: 'Push-Location', module: M, aliases: ['pushd'], input: 'none', params: [P('Path', 'string', { pos: 0 })],
  run: async (c, p) => { c.session.locStack.push(c.session.loc); if (p.Path) { const spec = GG.cmdlets['set-location']; const cc = I.mkCmdCtx(c.ctx, spec, { Path: p.Path }, null); await spec.run(cc, { Path: p.Path }, null); } } });
def({ name: 'Pop-Location', module: M, aliases: ['popd'], input: 'none', params: [P('PassThru', 'switch')],
  run: async (c) => { const l = c.session.locStack.pop(); if (l) c.session.loc = l; } });

/* ---------- Get-ChildItem ---------- */
def({ name: 'Get-ChildItem', module: M, aliases: ['dir', 'gci', 'ls'], input: 'each',
  params: [P('Path', 'string[]', { pos: 0, pipe: 'both' }), P('LiteralPath', 'string[]', { aliases: ['PSPath'], pipe: 'prop' }), P('Filter', 'string', { pos: 1 }), P('Include', 'string[]'), P('Exclude', 'string[]'), P('Recurse', 'switch', { aliases: ['s'] }), P('Depth', 'int'), P('Force', 'switch'), P('Name', 'switch'), P('Directory', 'switch', { aliases: ['ad', 'd'] }), P('File', 'switch', { aliases: ['af'] }), P('Hidden', 'switch', { aliases: ['ah', 'h'] }), P('ReadOnly', 'switch', { aliases: ['ar'] }), P('System', 'switch', { aliases: ['as'] }), P('Attributes', 'string')],
  run: async (c, p) => {
    const paths = p.Path || p.LiteralPath || ['.'];
    for (const path of paths) {
      const r0 = FX.resolve(c.ctx, path);
      if (!driveCheck(c, r0)) continue;
      if (r0.prov === 'Environment') { const items = envItems(c.ctx).filter(o => !r0.parts.length || V.like(o.get('Name'), r0.parts[0])); if (!items.length && r0.parts.length && !V.hasWild(r0.parts[0])) FX.errNotFound(c, 'Env:\\' + r0.parts[0]); c.outAll(items); continue; }
      if (r0.prov === 'Alias') { const all = GG.allCommands(c.ctx).filter(x => x.get('CommandType') === 'Alias'); c.outAll(r0.parts.length ? all.filter(x => V.like(x.get('Name'), r0.parts[0])) : all.sort((a, b) => a.get('Name').localeCompare(b.get('Name')))); continue; }
      if (r0.prov === 'Variable') { c.outAll(GG.allVars(c.ctx).filter(v => !r0.parts.length || V.like(v.name, r0.parts[0])).map(v => GG.varObj(v.name, v.value))); continue; }
      if (r0.prov === 'Function') { const fns = []; for (let s = c.scope; s; s = s.parent) for (const f of s.fns.values()) fns.push(GG.cmdInfo('Function', f.name, '', '')); for (const f of Object.values(GG.builtinFns || {})) fns.push(GG.cmdInfo('Function', f.name, '', '')); c.outAll(fns); continue; }
      if (r0.prov === 'Certificate') { c.out(GG.cmdInfo('Alias', 'CurrentUser', '', '')); continue; }
      const rs = FX.expand(c.ctx, path, { literal: !!p.LiteralPath, force: p.Force });
      const wild = !p.LiteralPath && V.hasWild(V.toStr(path));
      if (!rs.length || (!wild && !FX.node(rs[0]))) {
        if (!wild) FX.errNotFound(c, rs[0] ? (rs[0].viaDrive ? rs[0].full : FX.canonical(rs[0])) : FX.resolve(c.ctx, path).full);
        continue;
      }
      const filt = (n) => {
        if (n.hidden && !p.Force && !p.Hidden) return false;
        if (p.Hidden && !n.hidden) return false;
        if (p.ReadOnly && !n.readonly) return false;
        if (p.System && !n.system) return false;
        if (p.Directory && !n.dir) return false;
        if (p.File && n.dir) return false;
        if (p.Filter && !V.like(n.name, p.Filter)) return false;
        if (p.Include && !p.Include.some(x => V.like(n.name, x))) return false;
        if (p.Exclude && p.Exclude.some(x => V.like(n.name, x))) return false;
        return true;
      };
      for (const r of rs) {
        const node = FX.node(r);
        if (!node) continue;
        if (r.prov === 'Registry') {
          const list = wild ? [{ k: node, r }] : [...node.keys.values()].sort((a, b) => a.name.localeCompare(b.name)).map(k => ({ k, r: Object.assign({}, r, { parts: r.parts.concat([k.name]) }) }));
          for (const x of list) { if (p.Name) c.out(x.k.name); else c.out(GG.regItem(x.k, FX.canonical(x.r), r.world)); }
          if (p.Recurse) {
            const rec = (k, rr) => { for (const ch of [...k.keys.values()].sort((a, b) => a.name.localeCompare(b.name))) { const r2 = Object.assign({}, rr, { parts: rr.parts.concat([ch.name]) }); c.out(GG.regItem(ch, FX.canonical(r2), r.world)); rec(ch, r2); } };
            for (const x of list) rec(x.k, x.r);
          }
          continue;
        }
        if (!node.dir || (wild && !p.Recurse)) {
          // Datei oder Wildcard-Treffer
          if (node.dir && wild) {
            if (filt(node) || (!p.Filter && !p.Include && !p.Directory && !p.File)) {
              if (p.Filter && !V.like(node.name, p.Filter)) continue;
              if (p.File) continue;
              const full = r.viaDrive ? r.full : FX.canonical(r);
              c.out(p.Name ? node.name : GG.fsItem(node, full, r.world));
            }
            continue;
          }
          if (!node.dir) {
            if ((p.Filter && !V.like(node.name, p.Filter)) || p.Directory || (p.Exclude && p.Exclude.some(x => V.like(node.name, x)))) continue;
            const full = r.viaDrive ? r.full : FX.canonical(r);
            c.out(p.Name ? node.name : GG.fsItem(node, full, r.world));
            continue;
          }
        }
        const base = r.viaDrive ? r.full : FX.canonical(r);
        const walk = (dirNode, dirPath, rel, depth) => {
          if (!GG.checkAccess(c.session, dirNode, 'read')) { FX.errDenied(c, dirPath); return; }
          const kids = kidsSorted(dirNode);
          for (const k of kids) {
            if (!filt(k)) continue;
            if (p.Include && !p.Recurse && !wild) continue;
            const kp = join(dirPath, k.name);
            c.out(p.Name ? (rel ? rel + '\\' : '') + k.name : GG.fsItem(k, /^[A-Z]:$/i.test(kp) ? kp + '\\' : kp, r.world));
          }
          if (p.Recurse && (p.Depth === undefined || depth < p.Depth)) {
            for (const k of kids) if (k.dir && (!k.hidden || p.Force || p.Hidden)) walk(k, join(dirPath, k.name), (rel ? rel + '\\' : '') + k.name, depth + 1);
          }
        };
        walk(node, /^[A-Z]:\\?$/i.test(base) ? base.slice(0, 2) + '\\' : base, '', 0);
      }
    }
  } });

/* ---------- Get-Item ---------- */
def({ name: 'Get-Item', module: M, aliases: ['gi'], input: 'each', params: [P('Path', 'string[]', { pos: 0, pipe: 'both' }), P('LiteralPath', 'string[]', { aliases: ['PSPath'], pipe: 'prop' }), P('Force', 'switch'), P('Filter', 'string'), P('Include', 'string[]'), P('Exclude', 'string[]'), P('Stream', 'string[]')],
  run: async (c, p) => {
    for (const path of (p.Path || p.LiteralPath || [])) {
      const r0 = FX.resolve(c.ctx, path);
      if (!driveCheck(c, r0)) continue;
      if (r0.prov === 'Environment') { const items = envItems(c.ctx).filter(o => V.like(o.get('Name'), r0.parts[0] || '*')); if (!items.length) FX.errNotFound(c, 'Env:\\' + (r0.parts[0] || '')); c.outAll(items); continue; }
      if (r0.prov === 'Variable') { const v = GG.allVars(c.ctx).filter(x => V.like(x.name, r0.parts[0] || '*')); if (!v.length) FX.errNotFound(c, 'Variable:\\' + r0.parts[0]); c.outAll(v.map(x => GG.varObj(x.name, x.value))); continue; }
      if (r0.prov === 'Alias') { const a = GG.allCommands(c.ctx).filter(x => x.get('CommandType') === 'Alias' && V.like(x.get('Name'), r0.parts[0] || '*')); if (!a.length) FX.errNotFound(c, 'Alias:\\' + r0.parts[0]); c.outAll(a); continue; }
      const rs = FX.expand(c.ctx, path, { literal: !!p.LiteralPath, force: p.Force });
      const wild = !p.LiteralPath && V.hasWild(path);
      if (!rs.length || (!wild && !FX.node(rs[0]))) { if (!wild) FX.errNotFound(c, rs[0] ? (rs[0].viaDrive ? rs[0].full : FX.canonical(rs[0])) : r0.full); continue; }
      for (const r of rs) {
        const n = FX.node(r);
        if (!n) continue;
        if (r.prov === 'FileSystem' && n.hidden && !p.Force && !wild) { c.error(`Die angegebene Datei "${FX.canonical(r)}" wurde nicht gefunden, weil sie versteckt ist. Verwenden Sie den Force-Parameter.`, { category: 'ObjectNotFound', exception: 'System.Management.Automation.ItemNotFoundException', fqid: 'ItemNotFound', target: FX.canonical(r) }); continue; }
        if (p.Stream) {
          const streams = [{ name: ':$DATA', len: n.length || 0 }];
          if (n.zone) streams.push({ name: 'Zone.Identifier', len: 26 });
          for (const st of streams) if (p.Stream.some(x => V.like(st.name, x))) c.out(new PSObject('Microsoft.PowerShell.Commands.AlternateStreamData', { PSPath: 'Microsoft.PowerShell.Core\\FileSystem::' + FX.canonical(r) + ':' + st.name, FileName: FX.canonical(r), Stream: st.name, Length: st.len }));
          if (!n.zone && p.Stream.some(x => !V.hasWild(x) && /zone/i.test(x))) c.error(`Der Datenstrom "Zone.Identifier" wurde nicht gefunden.`, { category: 'ObjectNotFound', exception: 'System.Management.Automation.ItemNotFoundException', fqid: 'AlternateDataStreamNotFound', target: FX.canonical(r) });
          continue;
        }
        if (n.dir && p.Filter && !V.like(n.name, p.Filter)) continue;
        c.out(itemFor(r, n));
      }
    }
  } });
GG.view('Microsoft.PowerShell.Commands.AlternateStreamData', { table: [{ l: 'Stream', p: 'Stream', w: 20 }, { l: 'Length', p: 'Length', w: 10, a: 'r' }, { l: 'FileName', p: 'FileName' }] });

/* ---------- New-Item ---------- */
GG.mkdirs = function (ctx, r, owner) {
  let n = r.world.fs[r.drive];
  const created = [];
  for (const seg of r.parts) {
    let ch = n.get(seg);
    if (!ch) { ch = GG.d(seg, [], { ctime: new Date(), owner: owner || FX.newOwner(ctx) }); n.add(ch); created.push(ch); }
    else if (!ch.dir) return null;
    n = ch;
  }
  return n;
};
def({ name: 'New-Item', module: M, aliases: ['ni'], input: 'collect', sp: true,
  params: [P('Path', 'string[]', { pos: 0 }), P('Name', 'string'), P('ItemType', 'string', { aliases: ['Type'] }), P('Value', 'object', { pipe: 'value' }), P('Force', 'switch'), P('Credential', 'cred')],
  run: async (c, p, input) => {
    let paths = p.Path || ['.'];
    if (!p.Path && !p.Name) throw GG.bindErr(c.ctx, 'New-Item', 'Der Befehl kann nicht verarbeitet werden, da einer oder mehrere obligatorische Parameter fehlen: Path.', 'MissingMandatoryParameter');
    let value = p.Value !== undefined ? p.Value : (input && input.length ? V.unwrap(input) : undefined);
    const typeRaw = (p.ItemType || '').toLowerCase();
    let type = !typeRaw ? null : ('directory'.startsWith(typeRaw) && typeRaw.length > 0 ? 'Directory' : ('file'.startsWith(typeRaw) ? 'File' : (/^(symboliclink|junction|hardlink)$/.test(typeRaw) ? 'Link' : null)));
    if (typeRaw && !type) return c.error(`Der Typ "${p.ItemType}" wird vom Dateisystemanbieter nicht unterstützt. Unterstützte Typen sind "file", "directory", "symboliclink", "junction" und "hardlink".`, { category: 'InvalidArgument', exception: 'System.ArgumentException', fqid: 'Argument', target: '' });
    for (const base of paths) {
      const path = p.Name ? join(base, p.Name) : base;
      const r = FX.resolve(c.ctx, path);
      if (!driveCheck(c, r)) continue;
      if (r.prov === 'Registry') {
        if (!(await c.should(FX.canonical(r), 'Neuer Schlüssel'))) continue;
        if (r.drive === 'HKLM' && !c.session.elevated) { c.error(`Der angeforderte Registrierungszugriff ist unzulässig.`, { category: 'PermissionDenied', exception: 'System.Security.SecurityException', fqid: 'System.Security.SecurityException', target: 'Microsoft.PowerShell.Core\\Registry::' + FX.REG_ROOTS[r.drive] + '\\' + r.parts.join('\\'), reason: 'SecurityException' }); continue; }
        const parent = FX.node(FX.parentRes(r));
        if (!parent) { FX.errNotFound(c, FX.canonical(FX.parentRes(r))); continue; }
        if (FX.node(r) && !p.Force) { c.error(`Ein Schlüssel unter diesem Pfad ist bereits vorhanden.`, { category: 'ResourceExists', exception: 'System.IO.IOException', fqid: 'System.IO.IOException', target: 'Microsoft.PowerShell.Core\\Registry::' + FX.REG_ROOTS[r.drive] + '\\' + r.parts.join('\\') }); continue; }
        const k = FX.node(r) || parent.addKey(new GG.RKey(r.parts[r.parts.length - 1]));
        if (value !== undefined && value !== null) k.setVal('(default)', V.toStr(value));
        c.out(GG.regItem(k, FX.canonical(r), r.world));
        continue;
      }
      if (r.prov !== 'FileSystem') { c.error('Für diesen Anbieter wird New-Item in der Simulation nicht unterstützt.', { category: 'NotImplemented', fqid: 'NotSupported' }); continue; }
      if (!type) type = 'File';
      const full = r.viaDrive ? r.full : FX.canonical(r);
      if (!r.parts.length) { c.error(`Ein Element mit dem angegebenen Namen "${full}" ist bereits vorhanden.`, { category: 'ResourceExists', exception: 'System.IO.IOException', fqid: 'DirectoryExist', target: full }); continue; }
      const existing = FX.node(r);
      const parentR = FX.parentRes(r);
      let parent = FX.node(parentR);
      if (existing) {
        if (type === 'Directory') {
          if (p.Force && existing.dir) { c.out(GG.fsItem(existing, full, r.world)); continue; }
          c.error(`Ein Element mit dem angegebenen Namen "${full}" ist bereits vorhanden.`, { category: 'ResourceExists', exception: 'System.IO.IOException', fqid: 'DirectoryExist', target: full, reason: 'IOException' }); continue;
        }
        if (!p.Force || existing.dir) { c.error(`Die Datei "${full}" ist bereits vorhanden.`, { category: 'WriteError', exception: 'System.IO.IOException', fqid: 'NewItemIOError', target: full, reason: 'IOException' }); continue; }
      }
      if (!(await c.should(full, type === 'Directory' ? 'Verzeichnis erstellen' : 'Datei erstellen'))) continue;
      if (!parent) {
        if (type === 'Directory' || p.Force) {
          // Zwischenverzeichnisse anlegen (Zugriff auf erstes vorhandenes Elternteil prüfen)
          let pr = FX.parentRes(r); while (pr.parts.length && !FX.node(pr)) pr = FX.parentRes(pr);
          if (!GG.checkAccess(c.session, FX.node(pr), 'mkdir')) { FX.errDenied(c, FX.canonical(r), { category: 'PermissionDenied', fqid: 'CreateDirectoryUnauthorizedAccessError' }); continue; }
          parent = GG.mkdirs(c.ctx, parentR);
          if (!parent) { c.error(`Ein Teil des Pfades "${full}" konnte nicht gefunden werden.`, { category: 'WriteError', exception: 'System.IO.DirectoryNotFoundException', fqid: 'NewItemIOError', target: full }); continue; }
        } else { c.error(`Ein Teil des Pfades "${full}" konnte nicht gefunden werden.`, { category: 'WriteError', exception: 'System.IO.DirectoryNotFoundException', fqid: 'NewItemIOError', target: full, reason: 'DirectoryNotFoundException' }); continue; }
      }
      if (!parent.dir) { c.error(`Ein Teil des Pfades "${full}" konnte nicht gefunden werden.`, { category: 'WriteError', exception: 'System.IO.DirectoryNotFoundException', fqid: 'NewItemIOError', target: full }); continue; }
      if (!GG.checkAccess(c.session, parent, type === 'Directory' ? 'mkdir' : 'write')) { FX.errDenied(c, full, { category: 'PermissionDenied', fqid: type === 'Directory' ? 'CreateDirectoryUnauthorizedAccessError' : 'NewItemUnauthorizedAccessError' }); continue; }
      const name = r.parts[r.parts.length - 1];
      let node;
      if (type === 'Directory') node = parent.add(GG.d(name, [], { ctime: new Date(), owner: FX.newOwner(c.ctx) }));
      else {
        if (existing) parent.remove(existing.name);
        node = parent.add(GG.f(name, value === undefined || value === null ? '' : V.toArr(value).map(V.toStr).join('\n'), { ctime: new Date(), mtime: new Date(), enc: 'Default', owner: FX.newOwner(c.ctx) }));
      }
      c.out(GG.fsItem(node, full, r.world));
    }
  } });
GG.builtinFns = GG.builtinFns || {};
GG.builtinFns['mkdir'] = { name: 'mkdir', module: '', run: async (ctx, args, input) => {
  const spec = GG.cmdlets['new-item'];
  const a2 = args.slice(); a2.push({ t: 'param', name: 'ItemType', value: 'Directory', has: true });
  return I.invokeCmdlet(spec, a2, input, ctx, 'mkdir');
} };
GG.aliases['md'] = 'mkdir';

/* ---------- Remove-Item ---------- */
def({ name: 'Remove-Item', module: M, aliases: ['del', 'erase', 'rd', 'ri', 'rm', 'rmdir'], input: 'each', sp: true,
  params: [P('Path', 'string[]', { pos: 0, pipe: 'both', aliases: ['FullName'] }), P('LiteralPath', 'string[]', { aliases: ['PSPath'], pipe: 'prop' }), P('Recurse', 'switch'), P('Force', 'switch'), P('Include', 'string[]'), P('Exclude', 'string[]'), P('Filter', 'string'), P('Stream', 'string[]'), P('Credential', 'cred')],
  run: async (c, p) => {
    for (const path of (p.Path || p.LiteralPath || [])) {
      const r0 = FX.resolve(c.ctx, path);
      if (!driveCheck(c, r0)) continue;
      if (r0.prov === 'Environment') { if (!GG.envGet(c.ctx, r0.parts[0])) FX.errNotFound(c, 'Env:\\' + r0.parts[0]); else GG.envSet(c.ctx, r0.parts[0], null); continue; }
      if (r0.prov === 'Variable') { await I.invokeCmdlet(GG.cmdlets['remove-variable'], [{ t: 'arg', value: r0.parts[0] }], null, c.ctx); continue; }
      if (r0.prov === 'Alias') { c.session.global.aliases.delete(r0.parts[0].toLowerCase()); c.world.removedAliases.add(r0.parts[0].toLowerCase()); continue; }
      const wild = !p.LiteralPath && V.hasWild(path);
      const rs = FX.expand(c.ctx, path, { literal: !!p.LiteralPath, force: p.Force });
      if (!rs.length || (!wild && !FX.node(rs[0]))) { if (!wild) FX.errNotFound(c, rs[0] ? (rs[0].viaDrive ? rs[0].full : FX.canonical(rs[0])) : r0.full); continue; }
      for (const r of rs) {
        const n = FX.node(r);
        if (!n) continue;
        const full = r.viaDrive ? r.full : FX.canonical(r);
        if (p.Include && !p.Include.some(x => V.like(n.name, x))) continue;
        if (p.Exclude && p.Exclude.some(x => V.like(n.name, x))) continue;
        if (p.Filter && !V.like(n.name, p.Filter)) continue;
        if (r.prov === 'Registry') {
          if (r.drive === 'HKLM' && !c.session.elevated) { c.error('Der angeforderte Registrierungszugriff ist unzulässig.', { category: 'PermissionDenied', exception: 'System.Security.SecurityException', fqid: 'System.Security.SecurityException', target: full }); continue; }
          if (n.keys.size && !p.Recurse) {
            const ans = await c.host.choice('Bestätigen', `Das Element unter "${full}" verfügt über untergeordnete Elemente, und der Recurse-Parameter wurde nicht angegeben. Wenn Sie den Vorgang fortsetzen, werden mit dem Element auch alle untergeordneten Elemente entfernt. Möchten Sie den Vorgang wirklich fortsetzen?`, GG.CHOICE_YANKH, 0);
            if (ans === 'H') throw new GG.StopSignal(); if (ans !== 'J' && ans !== 'A') continue;
          }
          if (!(await c.should(full, 'Schlüssel entfernen'))) continue;
          n.parent.keys.delete(n.name.toLowerCase());
          continue;
        }
        if (p.Stream) { if (p.Stream.some(s => /zone/i.test(s))) { if (!n.zone) c.error('Der Datenstrom "Zone.Identifier" wurde nicht gefunden.', { category: 'ObjectNotFound', fqid: 'AlternateDataStreamNotFound', target: full }); else n.zone = 0; } continue; }
        if (!n.parent) { c.error(`Das Element "${full}" kann nicht entfernt werden.`, { category: 'WriteError', fqid: 'RemoveItemUnauthorizedAccessError', target: full }); continue; }
        const loc = c.session.loc.toLowerCase();
        if (full.toLowerCase() !== loc && (loc + '\\').startsWith(full.toLowerCase() + '\\') || full.toLowerCase() === loc) {
          c.error(`Das Element "${full}" kann nicht entfernt werden, da es verwendet wird.`, { category: 'WriteError', exception: 'System.IO.IOException', fqid: 'RemoveFileSystemItemIOError', target: full }); continue;
        }
        if ((n.readonly || n.hidden || n.system) && !p.Force) { c.error(`Das Element "${full}" kann nicht entfernt werden: Sie verfügen nicht über ausreichende Zugriffsrechte, um diesen Vorgang auszuführen.`, { category: 'PermissionDenied', exception: 'System.IO.IOException', fqid: 'RemoveFileSystemItemUnAuthorizedAccess', target: full, reason: 'IOException' }); continue; }
        if (!(GG.checkAccess(c.session, n, 'delete') || GG.checkAccess(c.session, n.parent, 'write'))) { c.error(`Das Element "${full}" kann nicht entfernt werden: Der Zugriff auf den Pfad "${full}" wurde verweigert.`, { category: 'PermissionDenied', exception: 'System.UnauthorizedAccessException', fqid: n.dir ? 'RemoveFileSystemItemUnAuthorizedAccess' : 'RemoveFileSystemItemUnAuthorizedAccess', target: full, reason: 'UnauthorizedAccessException' }); continue; }
        if (n.dir && n.children.size && !p.Recurse) {
          if (p.WhatIf) { c.host.write(`WhatIf: Ausführen des Vorgangs "Verzeichnis entfernen" für das Ziel "${full}".`); continue; }
          const ans = await c.host.choice('Bestätigen', `Das Element unter "${full}" verfügt über untergeordnete Elemente, und der Recurse-Parameter wurde nicht angegeben. Wenn Sie den Vorgang fortsetzen, werden mit dem Element auch alle untergeordneten Elemente entfernt. Möchten Sie den Vorgang wirklich fortsetzen?`, GG.CHOICE_YANKH, 0);
          if (ans === 'H') throw new GG.StopSignal();
          if (ans !== 'J' && ans !== 'A') continue;
        }
        if (!(await c.should(full, n.dir ? 'Verzeichnis entfernen' : 'Datei entfernen'))) continue;
        // geschützte Kinder?
        if (n.dir) {
          let bad = null;
          const scan = (x, xp) => { for (const k of x.children.values()) { const kp = join(xp, k.name); if ((k.readonly || k.hidden) && !p.Force) { bad = bad || kp; } if (k.dir) scan(k, kp); } };
          scan(n, full);
          if (bad) { c.error(`Das Element "${bad}" kann nicht entfernt werden: Sie verfügen nicht über ausreichende Zugriffsrechte, um diesen Vorgang auszuführen.`, { category: 'PermissionDenied', exception: 'System.IO.IOException', fqid: 'RemoveFileSystemItemUnAuthorizedAccess', target: bad }); c.error(`Das Verzeichnis "${full}" kann nicht entfernt werden, da es nicht leer ist.`, { category: 'WriteError', exception: 'System.IO.IOException', fqid: 'RemoveFileSystemItemIOError', target: full }); continue; }
        }
        n.parent.remove(n.name); n.parent = null;
      }
    }
  } });

/* ---------- Copy/Move/Rename ---------- */
function cloneNode(n, keepTimes) {
  if (n.dir) {
    const d = GG.d(n.name, [], { ctime: new Date(), mtime: keepTimes ? n.mtime : new Date(), hidden: n.hidden, acl: n.acl.map(x => Object.assign({}, x)), protectedAcl: n.protectedAcl, owner: n.owner });
    for (const k of n.children.values()) d.add(cloneNode(k, keepTimes));
    return d;
  }
  return GG.f(n.name, n.content, { size: n.size, enc: n.enc, ctime: new Date(), mtime: n.mtime, hidden: n.hidden, readonly: n.readonly, zone: n.zone, zoneRef: n.zoneRef, signed: n.signed, archiveEntries: n.archiveEntries ? JSON.parse(JSON.stringify(n.archiveEntries)) : null, owner: n.owner });
}
GG.cloneNode = cloneNode;
async function copyMove(c, p, move) {
  const dst = p.Destination !== undefined ? p.Destination : '.';
  for (const path of (p.Path || p.LiteralPath || [])) {
    const r0 = FX.resolve(c.ctx, path);
    if (!driveCheck(c, r0)) continue;
    const wild = !p.LiteralPath && V.hasWild(path);
    let rs = FX.expand(c.ctx, path, { literal: !!p.LiteralPath, force: p.Force });
    if (!rs.length || (!wild && !FX.node(rs[0]))) { if (!wild) FX.errNotFound(c, rs[0] ? (rs[0].viaDrive ? rs[0].full : FX.canonical(rs[0])) : r0.full); continue; }
    const dr = FX.resolve(c.ctx, dst);
    if (!driveCheck(c, dr)) return;
    for (const r of rs) {
      const n = FX.node(r);
      if (!n) continue;
      if (p.Filter && !V.like(n.name, p.Filter)) continue;
      if (p.Include && !p.Include.some(x => V.like(n.name, x))) continue;
      if (p.Exclude && p.Exclude.some(x => V.like(n.name, x))) continue;
      const src = r.viaDrive ? r.full : FX.canonical(r);
      if (r.prov === 'FileSystem' && !GG.checkAccess(c.session, n, 'read')) { FX.errDenied(c, src, { fqid: move ? 'MoveFileInfoItemUnauthorizedAccessError' : 'CopyFileInfoItemUnauthorizedAccessError' }); continue; }
      let dnode = FX.node(dr);
      let targetParent, targetName;
      if (dnode && dnode.dir) { targetParent = dnode; targetName = n.name; }
      else { targetParent = FX.node(FX.parentRes(dr)); targetName = dr.parts[dr.parts.length - 1]; }
      const targetFull = (dnode && dnode.dir) ? join(dr.viaDrive ? dr.full : FX.canonical(dr), n.name) : (dr.viaDrive ? dr.full : FX.canonical(dr));
      if (!targetParent || !targetParent.dir) { c.error(`Ein Teil des Pfades "${targetFull}" konnte nicht gefunden werden.`, { category: 'WriteError', exception: 'System.IO.DirectoryNotFoundException', fqid: move ? 'MoveDirectoryItemIOError' : 'CopyDirectoryInfoItemIOError', target: src, reason: 'DirectoryNotFoundException' }); continue; }
      if (!GG.checkAccess(c.session, targetParent, 'write')) { FX.errDenied(c, targetFull, { fqid: move ? 'MoveFileInfoItemUnauthorizedAccessError' : 'CopyFileInfoItemUnauthorizedAccessError' }); continue; }
      // Ziel innerhalb der Quelle?
      let anc = targetParent; let inside = false; while (anc) { if (anc === n) inside = true; anc = anc.parent; }
      if (n.dir && inside) { c.error(`Das Element "${src}" kann nicht in ein Unterelement von sich selbst ${move ? 'verschoben' : 'kopiert'} werden.`, { category: 'WriteError', exception: 'System.IO.IOException', fqid: move ? 'MoveItemIOError' : 'CopyItemIOError', target: src }); continue; }
      const existing = targetParent.get(targetName);
      if (!(await c.should(`Element: ${src} Ziel: ${targetFull}`, move ? 'Element verschieben' : 'Element kopieren'))) continue;
      if (move) {
        if (existing && existing !== n) {
          if (!p.Force || existing.dir) { c.error('Eine Datei kann nicht erstellt werden, wenn sie bereits vorhanden ist.', { category: 'WriteError', exception: 'System.IO.IOException', fqid: 'MoveFileInfoItemIOError', target: src, reason: 'IOException' }); continue; }
          targetParent.remove(existing.name);
        }
        if (!(GG.checkAccess(c.session, n, 'delete') || GG.checkAccess(c.session, n.parent, 'write'))) { FX.errDenied(c, src, { fqid: 'MoveFileInfoItemUnauthorizedAccessError' }); continue; }
        n.parent.remove(n.name);
        if (targetParent.dir && r.world !== dr.world) { const cl = cloneNode(n, true); cl.name = targetName; targetParent.add(cl); }
        else { n.name = targetName; targetParent.add(n); }
        if (p.PassThru) c.out(GG.fsItem(targetParent.get(targetName), targetFull, dr.world));
      } else {
        if (n.dir) {
          if (existing && existing.dir) {
            if (p.Recurse) {
              const merge = (srcN, dstN) => { for (const k of srcN.children.values()) { const ex = dstN.get(k.name); if (k.dir && ex && ex.dir) merge(k, ex); else { if (ex) dstN.remove(ex.name); dstN.add(cloneNode(k, true)); } } };
              merge(n, existing);
            }
            if (p.PassThru) c.out(GG.fsItem(existing, targetFull, dr.world));
            continue;
          }
          if (existing && !existing.dir) { c.error(`Ein Element mit dem angegebenen Namen "${targetFull}" ist bereits vorhanden.`, { category: 'ResourceExists', exception: 'System.IO.IOException', fqid: 'DirectoryExist', target: targetFull }); continue; }
          const cl = p.Recurse ? cloneNode(n, true) : GG.d(n.name, [], { ctime: new Date() });
          cl.name = targetName; cl.acl = []; cl.protectedAcl = false;
          targetParent.add(cl);
          if (p.PassThru) c.out(GG.fsItem(cl, targetFull, dr.world));
        } else {
          if (existing) {
            if (existing.dir) { c.error(`Das Element "${targetFull}" kann nicht mit dem Verzeichnis "${targetFull}" überschrieben werden.`, { category: 'WriteError', exception: 'System.IO.IOException', fqid: 'CopyError', target: src }); continue; }
            if (existing.readonly && !p.Force) { c.error(`Der Zugriff auf den Pfad "${targetFull}" wurde verweigert.`, { category: 'PermissionDenied', exception: 'System.UnauthorizedAccessException', fqid: 'CopyFileInfoItemUnauthorizedAccessError', target: src }); continue; }
            targetParent.remove(existing.name);
          }
          const cl = cloneNode(n, true); cl.name = targetName; cl.acl = []; cl.owner = FX.newOwner(c.ctx);
          targetParent.add(cl);
          if (p.PassThru) c.out(GG.fsItem(cl, targetFull, dr.world));
        }
      }
    }
  }
}
def({ name: 'Copy-Item', module: M, aliases: ['copy', 'cp', 'cpi'], input: 'each', sp: true,
  params: [P('Path', 'string[]', { pos: 0, pipe: 'both', aliases: ['FullName'] }), P('LiteralPath', 'string[]', { aliases: ['PSPath'], pipe: 'prop' }), P('Destination', 'string', { pos: 1 }), P('Recurse', 'switch'), P('Force', 'switch'), P('Container', 'switch'), P('Filter', 'string'), P('Include', 'string[]'), P('Exclude', 'string[]'), P('PassThru', 'switch'), P('Credential', 'cred'), P('ToSession', 'object'), P('FromSession', 'object')],
  run: async (c, p) => {
    if (p.ToSession || p.FromSession) return GG.remote && GG.remote.copySession(c, p);
    return copyMove(c, p, false);
  } });
def({ name: 'Move-Item', module: M, aliases: ['mi', 'move', 'mv'], input: 'each', sp: true,
  params: [P('Path', 'string[]', { pos: 0, pipe: 'both', aliases: ['FullName'] }), P('LiteralPath', 'string[]', { aliases: ['PSPath'], pipe: 'prop' }), P('Destination', 'string', { pos: 1 }), P('Force', 'switch'), P('Filter', 'string'), P('Include', 'string[]'), P('Exclude', 'string[]'), P('PassThru', 'switch'), P('Credential', 'cred')],
  run: async (c, p) => copyMove(c, p, true) });
def({ name: 'Rename-Item', module: M, aliases: ['ren', 'rni'], input: 'each', sp: true,
  params: [P('Path', 'string', { pos: 0, pipe: 'both', aliases: ['FullName'] }), P('LiteralPath', 'string', { aliases: ['PSPath'], pipe: 'prop' }), P('NewName', 'string', { pos: 1, mandatory: true, delayBind: true, pipe: 'prop' }), P('Force', 'switch'), P('PassThru', 'switch'), P('Credential', 'cred')],
  run: async (c, p) => {
    const path = p.Path || p.LiteralPath;
    if (!path) return;
    const r = FX.resolve(c.ctx, path);
    if (!driveCheck(c, r)) return;
    const n = FX.node(r);
    const full = r.viaDrive ? r.full : FX.canonical(r);
    if (!n) return c.error(`Das Element unter "${full}" kann nicht umbenannt werden, da es nicht vorhanden ist.`, { category: 'WriteError', exception: 'System.Management.Automation.PSInvalidOperationException', fqid: 'InvalidOperation', target: full, reason: 'PSInvalidOperationException' });
    let nn = V.toStr(p.NewName);
    if (/[\\/]/.test(nn)) {
      const nr = FX.resolve(c.ctx, nn);
      if (FX.canonical(FX.parentRes(nr)).toLowerCase() !== FX.canonical(FX.parentRes(r)).toLowerCase()) return c.error('Ein Element kann nicht in ein anderes Verzeichnis umbenannt werden. Verwenden Sie dazu Move-Item.', { category: 'WriteError', exception: 'System.ArgumentException', fqid: 'Argument', target: full });
      nn = nr.parts[nr.parts.length - 1];
    }
    if (/[<>:"|?*]/.test(nn)) return c.error(`Unzulässige Zeichen im Pfad.`, { category: 'InvalidArgument', exception: 'System.ArgumentException', fqid: 'RenameItemArgumentError', target: full });
    if (r.prov === 'Registry') { const par = n.parent; par.keys.delete(n.name.toLowerCase()); n.name = nn; par.addKey(n); return; }
    const ex = n.parent.get(nn);
    if (ex && ex !== n) return c.error('Eine Datei kann nicht erstellt werden, wenn sie bereits vorhanden ist.', { category: 'WriteError', exception: 'System.IO.IOException', fqid: 'RenameItemIOError', target: full, reason: 'IOException' });
    if (!(GG.checkAccess(c.session, n, 'delete') || GG.checkAccess(c.session, n.parent, 'write'))) return FX.errDenied(c, full, { fqid: 'RenameItemUnauthorizedAccessError' });
    if (!(await c.should(`Element: ${full} Ziel: ${join(full.replace(/\\[^\\]*$/, ''), nn)}`, 'Element umbenennen'))) return;
    const par = n.parent; par.remove(n.name); n.name = nn; par.add(n);
    if (p.PassThru) c.out(GG.fsItem(n, join(full.replace(/\\[^\\]*$/, ''), nn), r.world));
  } });

/* ---------- Inhalte ---------- */
function readNode(c, path, literal, cb) {
  const r0 = FX.resolve(c.ctx, path);
  if (!driveCheck(c, r0)) return;
  if (r0.prov === 'Environment') { const v = GG.envGet(c.ctx, r0.parts[0] || ''); if (v === null) return FX.errNotFound(c, 'Env:\\' + r0.parts[0]); return cb(null, v); }
  if (r0.prov === 'Variable') { const v = GG.allVars(c.ctx).find(x => x.name.toLowerCase() === (r0.parts[0] || '').toLowerCase()); if (!v) return FX.errNotFound(c, 'Variable:\\' + r0.parts[0]); return cb(null, null, v.value); }
  const wild = !literal && V.hasWild(path);
  const rs = FX.expand(c.ctx, path, { literal });
  if (!rs.length || (!wild && !FX.node(rs[0]))) { if (!wild) FX.errNotFound(c, rs[0] ? (rs[0].viaDrive ? rs[0].full : FX.canonical(rs[0])) : r0.full); return; }
  for (const r of rs) {
    const n = FX.node(r);
    if (!n) continue;
    const full = r.viaDrive ? r.full : FX.canonical(r);
    if (n.dir) { c.error(`Der Zugriff auf den Pfad "${full}" wurde verweigert.`, { category: 'PermissionDenied', exception: 'System.UnauthorizedAccessException', fqid: 'GetContentReaderUnauthorizedAccessError', target: full, reason: 'UnauthorizedAccessException' }); continue; }
    if (!GG.checkAccess(c.session, n, 'read')) { c.error(`Der Zugriff auf den Pfad "${full}" wurde verweigert.`, { category: 'PermissionDenied', exception: 'System.UnauthorizedAccessException', fqid: 'GetContentReaderUnauthorizedAccessError', target: full, reason: 'UnauthorizedAccessException' }); continue; }
    n.atime = new Date();
    cb(n, null, undefined, full, r);
  }
}
GG.binaryLines = n => ['MZ\u0090\u0000\u0003\u0000\u0000\u0000\u0004\u0000\u0000\u0000ÿÿ\u0000\u0000¸\u0000\u0000\u0000\u0000\u0000\u0000\u0000@', 'PE\u0000\u0000d\u0086\u0006\u0000£·áf'];
def({ name: 'Get-Content', module: M, aliases: ['cat', 'gc', 'type'], input: 'each',
  params: [P('Path', 'string[]', { pos: 0, pipe: 'both', aliases: ['FullName'] }), P('LiteralPath', 'string[]', { aliases: ['PSPath'], pipe: 'prop' }), P('TotalCount', 'long', { aliases: ['First', 'Head'] }), P('Tail', 'int', { aliases: ['Last'] }), P('Raw', 'switch'), P('Encoding', 'enum', { values: GG.ENCODINGS.concat(['Byte']) }), P('Stream', 'string'), P('Delimiter', 'string'), P('ReadCount', 'long'), P('Wait', 'switch'), P('Force', 'switch')],
  run: async (c, p) => {
    for (const path of (p.Path || p.LiteralPath || [])) {
      readNode(c, path, !!p.LiteralPath, (n, envVal, varVal, full) => {
        if (envVal !== null && envVal !== undefined && !n) return c.out(envVal);
        if (varVal !== undefined && !n) return c.outAll(V.toArr(varVal));
        let text;
        if (p.Stream) {
          if (/^zone\.identifier$/i.test(p.Stream) && n.zone) text = `[ZoneTransfer]\nZoneId=${n.zone}\n` + (n.zoneRef ? `ReferrerUrl=${n.zoneRef}\nHostUrl=${n.zoneRef}\n` : '');
          else return c.error(`Der Datenstrom "${p.Stream}" wurde in "${full}" nicht gefunden.`, { category: 'ObjectNotFound', exception: 'System.Management.Automation.ItemNotFoundException', fqid: 'GetContentReaderFileNotFoundError', target: full });
        } else if ((n.content === null || n.content === '') && n.size) { if (p.Encoding === 'Byte') { c.outAll([77, 90, 144, 0, 3, 0, 0, 0].slice(0, p.TotalCount || 8)); return; } text = GG.binaryLines(n).join('\n'); }
        else text = n.content || '';
        if (p.Raw) { c.out(text); return; }
        let lines = text.replace(/\r/g, '').split('\n');
        if (lines.length && lines[lines.length - 1] === '') lines.pop();
        if (p.TotalCount !== undefined && p.TotalCount >= 0) lines = lines.slice(0, p.TotalCount);
        if (p.Tail !== undefined) lines = p.Tail ? lines.slice(-p.Tail) : [];
        c.outAll(lines);
      });
    }
  } });
async function setContent(c, p, input, append) {
  let value = p.Value !== undefined ? p.Value : input;
  if (value === undefined || value === null) value = [];
  const lines = U.enumerate(V.toArr(value)).map(x => V.toStr(x));
  const text = p.NoNewline ? lines.join('') : lines.map(l => l + '\n').join('');
  for (const path of (p.Path || p.LiteralPath || [])) {
    const r0 = FX.resolve(c.ctx, path);
    if (!driveCheck(c, r0)) continue;
    if (r0.prov === 'Environment') { GG.envSet(c.ctx, r0.parts[0], (append ? (GG.envGet(c.ctx, r0.parts[0]) || '') : '') + lines.join('')); continue; }
    if (p.Stream && /zone/i.test(p.Stream)) { const n = FX.node(r0); if (n) { const m = /ZoneId=(\d)/.exec(lines.join('\n')); n.zone = m ? +m[1] : 0; } continue; }
    const wild = V.hasWild(path) && !p.LiteralPath;
    let rs = wild ? FX.expand(c.ctx, path) : [r0];
    if (wild && !rs.length) { c.error(`Ein Element mit dem Namen "${path}" wurde nicht gefunden.`, { category: 'ObjectNotFound', fqid: 'ItemNotFound', target: path }); continue; }
    for (const r of rs) {
      const full = r.viaDrive ? r.full : FX.canonical(r);
      const n = FX.node(r);
      if (n && n.dir) { c.error(`Der Zugriff auf den Pfad "${full}" wurde verweigert.`, { category: 'PermissionDenied', exception: 'System.UnauthorizedAccessException', fqid: 'GetContentWriterUnauthorizedAccessError', target: full }); continue; }
      const parent = FX.node(FX.parentRes(r));
      if (!parent) { c.error(`Ein Teil des Pfades "${full}" konnte nicht gefunden werden.`, { category: 'ObjectNotFound', exception: 'System.IO.DirectoryNotFoundException', fqid: 'GetContentWriterDirectoryNotFoundError', target: full, reason: 'DirectoryNotFoundException' }); continue; }
      if (n ? (!GG.checkAccess(c.session, n, 'write') || (n.readonly && !p.Force)) : !GG.checkAccess(c.session, parent, 'write')) { c.error(`Der Zugriff auf den Pfad "${full}" wurde verweigert.`, { category: 'PermissionDenied', exception: 'System.UnauthorizedAccessException', fqid: 'GetContentWriterUnauthorizedAccessError', target: full, reason: 'UnauthorizedAccessException' }); continue; }
      if (!(await c.should(`Pfad: ${full}`, append ? 'Inhalt hinzufügen' : 'Inhalt festlegen'))) continue;
      let node = n;
      if (!node) { node = parent.add(GG.f(r.parts[r.parts.length - 1], '', { enc: 'Default', ctime: new Date(), owner: FX.newOwner(c.ctx) })); }
      if (append) node.content = (node.content || '') + text; else { node.content = text; node.size = undefined; node.enc = p.Encoding === 'UTF8' ? 'UTF8BOM' : (p.Encoding || 'Default'); }
      node.mtime = new Date();
      if (p.PassThru) c.outAll(lines);
    }
  }
}
def({ name: 'Set-Content', module: M, aliases: ['sc'], input: 'collect', sp: true,
  params: [P('Path', 'string[]', { pos: 0 }), P('LiteralPath', 'string[]', { aliases: ['PSPath'] }), P('Value', 'object[]', { pos: 1 }), P('Encoding', 'enum', { values: GG.ENCODINGS.concat(['Byte']) }), P('NoNewline', 'switch'), P('Force', 'switch'), P('PassThru', 'switch'), P('Stream', 'string')],
  run: async (c, p, input) => setContent(c, p, input, false) });
def({ name: 'Add-Content', module: M, aliases: ['ac'], input: 'collect', sp: true,
  params: [P('Path', 'string[]', { pos: 0 }), P('LiteralPath', 'string[]', { aliases: ['PSPath'] }), P('Value', 'object[]', { pos: 1 }), P('Encoding', 'enum', { values: GG.ENCODINGS.concat(['Byte']) }), P('NoNewline', 'switch'), P('Force', 'switch'), P('PassThru', 'switch'), P('Stream', 'string')],
  run: async (c, p, input) => setContent(c, p, input, true) });
def({ name: 'Clear-Content', module: M, aliases: ['clc'], input: 'none', sp: true, params: [P('Path', 'string[]', { pos: 0 }), P('Force', 'switch')],
  run: async (c, p) => { for (const path of p.Path) { const r = FX.resolve(c.ctx, path); const n = FX.node(r); if (!n) { FX.errNotFound(c, FX.canonical(r)); continue; } if (!GG.checkAccess(c.session, n, 'write')) { FX.errDenied(c, FX.canonical(r)); continue; } if (await c.should(FX.canonical(r), 'Inhalt löschen')) { n.content = ''; n.size = undefined; n.mtime = new Date(); } } } });

/* ---------- Test/Resolve/Split/Join ---------- */
def({ name: 'Test-Path', module: M, input: 'each', params: [P('Path', 'string[]', { pos: 0, pipe: 'both', aliases: ['FullName'] }), P('LiteralPath', 'string[]', { aliases: ['PSPath'], pipe: 'prop' }), P('PathType', 'enum', { values: ['Any', 'Container', 'Leaf'], aliases: ['Type'] }), P('IsValid', 'switch'), P('Filter', 'string'), P('Include', 'string[]'), P('Exclude', 'string[]'), P('OlderThan', 'date'), P('NewerThan', 'date')],
  run: async (c, p) => {
    for (const path of (p.Path || p.LiteralPath || [])) {
      if (p.IsValid) { c.out(!/[<>"|]/.test(path)); continue; }
      let r0;
      try { r0 = FX.resolve(c.ctx, path); } catch (e) { c.out(false); continue; }
      if (r0.error) { c.out(false); continue; }
      if (r0.prov === 'Environment') { c.out(r0.parts.length ? GG.envGet(c.ctx, r0.parts[0]) !== null : true); continue; }
      if (r0.prov === 'Variable') { c.out(!r0.parts.length || GG.allVars(c.ctx).some(v => V.like(v.name, r0.parts[0]))); continue; }
      if (r0.prov === 'Alias' || r0.prov === 'Function') { c.out(true); continue; }
      if (!FX.driveExists(c.ctx, r0.drive)) { c.out(false); continue; }
      const rs = FX.expand(c.ctx, path, { literal: !!p.LiteralPath, force: true });
      const ok = rs.some(r => { const n = FX.node(r); if (!n) return false; if (p.PathType === 'Container') return r.prov === 'Registry' || n.dir; if (p.PathType === 'Leaf') return r.prov === 'FileSystem' && !n.dir; if (p.OlderThan && !(n.mtime < p.OlderThan.d)) return false; if (p.NewerThan && !(n.mtime > p.NewerThan.d)) return false; return true; });
      c.out(ok);
    }
  } });
def({ name: 'Resolve-Path', module: M, aliases: ['rvpa'], input: 'each', params: [P('Path', 'string[]', { pos: 0, pipe: 'both' }), P('LiteralPath', 'string[]', { aliases: ['PSPath'] }), P('Relative', 'switch')],
  run: async (c, p) => {
    for (const path of (p.Path || p.LiteralPath || [])) {
      const rs = FX.expand(c.ctx, path, { literal: !!p.LiteralPath, force: true });
      const good = rs.filter(r => FX.node(r));
      if (!good.length) { FX.errNotFound(c, rs[0] ? FX.canonical(rs[0]) : FX.resolve(c.ctx, path).full); continue; }
      for (const r of good) {
        const full = r.viaDrive ? r.full : FX.canonical(r);
        if (p.Relative) { const loc = c.session.loc.replace(/\\$/, '') + '\\'; c.out(full.toLowerCase().startsWith(loc.toLowerCase()) ? '.\\' + full.slice(loc.length) : full); }
        else c.out(GG.pathInfo(full));
      }
    }
  } });
def({ name: 'Split-Path', module: M, input: 'each', params: [P('Path', 'string[]', { pos: 0, pipe: 'both' }), P('Parent', 'switch'), P('Leaf', 'switch'), P('Qualifier', 'switch'), P('NoQualifier', 'switch'), P('IsAbsolute', 'switch'), P('Resolve', 'switch'), P('LiteralPath', 'string[]')],
  run: async (c, p) => {
    for (const path of (p.Path || p.LiteralPath || [])) {
      const s = V.toStr(path);
      if (p.IsAbsolute) { c.out(/^[a-z]+:\\|^\\\\/i.test(s)); continue; }
      if (p.Qualifier) { const m = /^([a-z]+:)/i.exec(s); if (!m) c.error(`Der Pfad "${s}" enthält keinen Qualifizierer.`, { category: 'InvalidArgument', fqid: 'ParsePathQualifierNoDrive', target: s }); else c.out(m[1]); continue; }
      if (p.NoQualifier) { c.out(s.replace(/^[a-z]+:/i, '')); continue; }
      if (p.Leaf) { c.out(s.replace(/\\$/, '').split(/[\\/]/).pop()); continue; }
      const t = s.replace(/[\\/]$/, '');
      const k = t.lastIndexOf('\\');
      let par = k < 0 ? '' : t.slice(0, k);
      if (/^[a-z]+:$/i.test(par)) par += '\\';
      c.out(par);
    }
  } });
def({ name: 'Join-Path', module: M, input: 'each', params: [P('Path', 'string[]', { pos: 0, mandatory: true, pipe: 'both', aliases: ['PSPath'] }), P('ChildPath', 'string', { pos: 1, mandatory: true }), P('Resolve', 'switch'), P('Credential', 'cred')],
  run: async (c, p) => {
    for (const path of p.Path) {
      const m = /^([A-Za-z][A-Za-z0-9_]*):/.exec(path);
      if (m && !FX.driveExists(c.ctx, m[1]) && !/^[A-Za-z]$/.test(m[1])) { FX.errDrive(c, m[1]); continue; }
      const res = path.replace(/[\\/]+$/, '') + '\\' + V.toStr(p.ChildPath).replace(/^[\\/]+/, '');
      c.out(p.Resolve ? GG.pathInfo(FX.canonical(FX.resolve(c.ctx, res))) : res);
    }
  } });

/* ---------- ItemProperty (Registry & Dateien) ---------- */
GG.view('Microsoft.PowerShell.Commands.ItemProperty', null);
function regProps(r, key) {
  const hive = FX.REG_ROOTS[r.drive];
  const o = new PSObject('System.Management.Automation.PSCustomObject');
  for (const v of key.values.values()) o.add(v.name === '(default)' ? '(default)' : v.name, v.data);
  const regPath = hive + (r.parts.length ? '\\' + r.parts.join('\\') : '');
  o.add('PSPath', 'Microsoft.PowerShell.Core\\Registry::' + regPath);
  o.add('PSParentPath', 'Microsoft.PowerShell.Core\\Registry::' + regPath.replace(/\\[^\\]*$/, ''));
  o.add('PSChildName', key.name);
  o.add('PSDrive', r.drive);
  o.add('PSProvider', 'Microsoft.PowerShell.Core\\Registry');
  return o;
}
def({ name: 'Get-ItemProperty', module: M, aliases: ['gp'], input: 'each', params: [P('Path', 'string[]', { pos: 0, pipe: 'both' }), P('LiteralPath', 'string[]', { aliases: ['PSPath'], pipe: 'prop' }), P('Name', 'string[]', { pos: 1 }), P('Filter', 'string')],
  run: async (c, p) => {
    for (const path of (p.Path || p.LiteralPath || [])) {
      const r0 = FX.resolve(c.ctx, path);
      if (!driveCheck(c, r0)) continue;
      const rs = FX.expand(c.ctx, path, { force: true });
      if (!rs.length || !FX.node(rs[0])) { FX.errNotFound(c, rs[0] ? FX.canonical(rs[0]) : r0.full); continue; }
      for (const r of rs) {
        const n = FX.node(r);
        if (r.prov === 'Registry') {
          const o = regProps(r, n);
          if (p.Name) {
            const res = new PSObject('System.Management.Automation.PSCustomObject');
            for (const nm of p.Name) {
              const v = [...n.values.values()].find(x => V.like(x.name, nm));
              if (!v) { c.error(`Die Eigenschaft "${nm}" am Pfad "${FX.canonical(r)}" ist nicht vorhanden.`, { category: 'InvalidArgument', exception: 'System.Management.Automation.PSArgumentException', fqid: 'System.Management.Automation.PSArgumentException', target: FX.canonical(r) }); continue; }
              res.add(v.name, v.data);
            }
            if (res.names().length) { for (const k of ['PSPath', 'PSParentPath', 'PSChildName', 'PSDrive', 'PSProvider']) res.add(k, o.get(k)); c.out(res); }
          } else c.out(o);
        } else {
          const it = itemFor(r, n);
          if (p.Name) { const res = new PSObject('System.Management.Automation.PSCustomObject'); for (const nm of p.Name) res.add(it.propName(nm), it.get(nm)); for (const k of ['PSPath', 'PSParentPath', 'PSChildName', 'PSDrive', 'PSProvider']) res.add(k, it.get(k)); c.out(res); }
          else c.out(it);
        }
      }
    }
  } });
def({ name: 'Get-ItemPropertyValue', module: M, aliases: ['gpv'], input: 'each', params: [P('Path', 'string[]', { pos: 0, pipe: 'both' }), P('LiteralPath', 'string[]', { aliases: ['PSPath'], pipe: 'prop' }), P('Name', 'string[]', { pos: 1, mandatory: true })],
  run: async (c, p) => {
    for (const path of (p.Path || p.LiteralPath || [])) {
      const r = FX.resolve(c.ctx, path); if (!driveCheck(c, r)) continue;
      const n = FX.node(r); if (!n) { FX.errNotFound(c, FX.canonical(r)); continue; }
      for (const nm of p.Name) {
        if (r.prov === 'Registry') { const v = n.values.get(nm.toLowerCase()); if (!v) c.error(`Die Eigenschaft "${nm}" am Pfad "${FX.canonical(r)}" ist nicht vorhanden.`, { category: 'InvalidArgument', exception: 'System.Management.Automation.PSArgumentException', fqid: 'System.Management.Automation.PSArgumentException', target: FX.canonical(r) }); else c.out(v.data); }
        else c.out(itemFor(r, n).get(nm));
      }
    }
  } });
const REGTYPES = ['String', 'ExpandString', 'Binary', 'DWord', 'MultiString', 'QWord', 'Unknown'];
async function setItemProp(c, p, isNew) {
  for (const path of (p.Path || p.LiteralPath || [])) {
    const r = FX.resolve(c.ctx, path); if (!driveCheck(c, r)) continue;
    const n = FX.node(r); if (!n) { FX.errNotFound(c, FX.canonical(r)); continue; }
    const full = FX.canonical(r);
    if (r.prov === 'Registry') {
      if (r.drive === 'HKLM' && !c.session.elevated) { c.error('Der angeforderte Registrierungszugriff ist unzulässig.', { category: 'PermissionDenied', exception: 'System.Security.SecurityException', fqid: 'System.Security.SecurityException', target: full, reason: 'SecurityException' }); continue; }
      const ex = n.values.get(p.Name.toLowerCase());
      if (isNew && ex && !p.Force) { c.error('Die Eigenschaft ist bereits vorhanden.', { category: 'ResourceExists', exception: 'System.IO.IOException', fqid: 'System.IO.IOException', target: full }); continue; }
      const kind = p.PropertyType || p.Type || (ex ? ex.kind : (typeof p.Value === 'number' ? 'DWord' : 'String'));
      let val = p.Value === undefined ? '' : p.Value;
      if (kind === 'DWord' || kind === 'QWord') { try { val = V.toInt(val); } catch (e) { c.error(`Der Wert "${V.toStr(val)}" kann nicht in den Typ "System.Int32" konvertiert werden.`, { category: 'InvalidArgument', fqid: 'System.ArgumentException' }); continue; } }
      else if (kind === 'MultiString') val = V.toArr(val).map(V.toStr); else val = V.toStr(val);
      if (!(await c.should(`Element: ${full} Eigenschaft: ${p.Name}`, isNew ? 'Neue Eigenschaft' : 'Eigenschaft festlegen'))) continue;
      n.setVal(ex ? ex.name : p.Name, val, kind);
      if (p.PassThru || isNew) { const o = new PSObject('System.Management.Automation.PSCustomObject'); o.add(p.Name, val); const rp = regProps(r, n); for (const k of ['PSPath', 'PSParentPath', 'PSChildName', 'PSDrive', 'PSProvider']) o.add(k, rp.get(k)); c.out(o); }
    } else {
      const k = p.Name.toLowerCase();
      if (!GG.checkAccess(c.session, n, 'write')) { FX.errDenied(c, full); continue; }
      if (!(await c.should(`Element: ${full} Eigenschaft: ${p.Name}`, 'Eigenschaft festlegen'))) continue;
      if (k === 'isreadonly') n.readonly = V.toBool(p.Value);
      else if (k === 'attributes') { const a = V.toStr(p.Value).toLowerCase(); n.readonly = /readonly/.test(a); n.hidden = /hidden/.test(a); n.system = /system/.test(a); n.archive = /archive/.test(a); }
      else if (k === 'lastwritetime') n.mtime = V.cast('System.DateTime', p.Value).d;
      else if (k === 'creationtime') n.ctime = V.cast('System.DateTime', p.Value).d;
      else c.error(`Die Eigenschaft "${p.Name}" ist für dieses Objekt nicht vorhanden oder kann nicht festgelegt werden.`, { category: 'InvalidArgument', fqid: 'SetPropertyError', target: full });
    }
  }
}
def({ name: 'Set-ItemProperty', module: M, aliases: ['sp'], input: 'each', sp: true, params: [P('Path', 'string[]', { pos: 0, pipe: 'both' }), P('LiteralPath', 'string[]', { aliases: ['PSPath'], pipe: 'prop' }), P('Name', 'string', { pos: 1, mandatory: true }), P('Value', 'object', { pos: 2 }), P('Type', 'enum', { values: REGTYPES }), P('Force', 'switch'), P('PassThru', 'switch')],
  run: async (c, p) => setItemProp(c, p, false) });
def({ name: 'New-ItemProperty', module: M, input: 'each', sp: true, params: [P('Path', 'string[]', { pos: 0, pipe: 'both' }), P('LiteralPath', 'string[]', { aliases: ['PSPath'], pipe: 'prop' }), P('Name', 'string', { pos: 1, mandatory: true }), P('Value', 'object', { pos: 2 }), P('PropertyType', 'enum', { values: REGTYPES, aliases: ['Type'] }), P('Force', 'switch')],
  run: async (c, p) => setItemProp(c, p, true) });
def({ name: 'Remove-ItemProperty', module: M, aliases: ['rp'], input: 'each', sp: true, params: [P('Path', 'string[]', { pos: 0, pipe: 'both' }), P('Name', 'string[]', { pos: 1, mandatory: true }), P('Force', 'switch')],
  run: async (c, p) => {
    for (const path of p.Path) {
      const r = FX.resolve(c.ctx, path); const n = FX.node(r); if (!n) { FX.errNotFound(c, FX.canonical(r)); continue; }
      if (r.drive === 'HKLM' && !c.session.elevated) { c.error('Der angeforderte Registrierungszugriff ist unzulässig.', { category: 'PermissionDenied', exception: 'System.Security.SecurityException', fqid: 'System.Security.SecurityException', target: FX.canonical(r) }); continue; }
      for (const nm of p.Name) { if (!n.values.has(nm.toLowerCase())) c.error(`Die Eigenschaft "${nm}" am Pfad "${FX.canonical(r)}" ist nicht vorhanden.`, { category: 'InvalidArgument', fqid: 'System.Management.Automation.PSArgumentException', target: FX.canonical(r) }); else if (await c.should(`Element: ${FX.canonical(r)} Eigenschaft: ${nm}`, 'Eigenschaft entfernen')) n.values.delete(nm.toLowerCase()); }
    }
  } });

/* ---------- PSDrive ---------- */
GG.drivesList = function (ctx) {
  const w = ctx.world;
  const list = [];
  const curOf = d => { const l = ctx.session.loc; return l.toUpperCase().startsWith(d.toUpperCase() + ':') ? l.slice(d.length + 2) : ''; };
  for (const [name, prov, root] of [['Alias', 'Alias', ''], ['Cert', 'Certificate', '\\'], ['Env', 'Environment', ''], ['Function', 'Function', ''], ['HKCU', 'Registry', 'HKEY_CURRENT_USER'], ['HKLM', 'Registry', 'HKEY_LOCAL_MACHINE'], ['Variable', 'Variable', ''], ['WSMan', 'WSMan', '']]) list.push({ name, prov, root, used: null, free: null, cur: curOf(name) });
  for (const v of w.volumes) list.push({ name: v.letter, prov: 'FileSystem', root: v.letter + ':\\', used: v.size - GG.volFree(w, v), free: GG.volFree(w, v), cur: curOf(v.letter), desc: v.label });
  for (const pd of ctx.session.psdrives || []) list.push({ name: pd.name, prov: 'FileSystem', root: pd.root, used: pd.persist ? 2.1 * 1073741824 : null, free: pd.persist ? 397 * 1073741824 : null, cur: curOf(pd.name), desc: pd.desc || '', display: pd.display });
  return list.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
};
GG.volFree = function (w, v) { return v.free - (v.letter === 'C' ? (w.extraUsed || 0) : 0); };
function driveObj(d) {
  const o = new PSObject('System.Management.Automation.PSDriveInfo', { Used: d.used, Free: d.free, CurrentLocation: d.cur, Name: d.name, Provider: d.prov, Root: d.root, Description: d.desc || '', MaximumSize: null, Credential: 'System.Management.Automation.PSCredential', DisplayRoot: d.display || null });
  o.toStringFn = () => d.name; return o;
}
def({ name: 'Get-PSDrive', module: M, aliases: ['gdr'], input: 'none', params: [P('Name', 'string[]', { pos: 0 }), P('PSProvider', 'string[]'), P('Scope', 'string')],
  run: async (c, p) => {
    let list = GG.drivesList(c.ctx);
    if (p.PSProvider) list = list.filter(d => p.PSProvider.some(x => V.like(d.prov, x)));
    if (p.Name) {
      for (const n of p.Name) {
        const m = list.filter(d => V.like(d.name, n));
        if (!m.length && !V.hasWild(n)) c.error(`Das Laufwerk wurde nicht gefunden. Ein Laufwerk mit dem Namen "${n}" ist nicht vorhanden.`, { category: 'ObjectNotFound', exception: 'System.Management.Automation.DriveNotFoundException', fqid: 'GetLocationNoMatchingDrive', target: n });
        c.outAll(m.map(driveObj));
      }
      return;
    }
    c.outAll(list.map(driveObj));
  } });
def({ name: 'New-PSDrive', module: M, aliases: ['mount', 'ndr'], input: 'none', sp: true, params: [P('Name', 'string', { pos: 0, mandatory: true }), P('PSProvider', 'string', { pos: 1, mandatory: true }), P('Root', 'string', { pos: 2, mandatory: true }), P('Description', 'string'), P('Persist', 'switch'), P('Scope', 'string'), P('Credential', 'cred')],
  run: async (c, p) => {
    if (FX.driveExists(c.ctx, p.Name)) return c.error(`Das Laufwerk "${p.Name}" ist bereits vorhanden.`, { category: 'ResourceExists', exception: 'System.Management.Automation.SessionStateException', fqid: 'DriveAlreadyExists', target: p.Name });
    if (!/^filesystem$/i.test(p.PSProvider)) return c.error(`Der Anbieter "${p.PSProvider}" wird in dieser Simulation für New-PSDrive nicht unterstützt.`, { category: 'NotImplemented', fqid: 'ProviderNotFound', target: p.PSProvider });
    if (p.Persist && !/^[A-Za-z]$/.test(p.Name)) return c.error(`Der angegebene Laufwerksstamm "${p.Root}" ist ungültig oder verweist auf ein Remoteverzeichnis, das nicht vorhanden ist. Wenn Sie "Persist" angeben, muss der Laufwerksname aus einem einzelnen Buchstaben bestehen.`, { category: 'InvalidArgument', exception: 'System.ComponentModel.Win32Exception', fqid: 'DriveRootError', target: p.Name });
    const r = FX.resolve(c.ctx, p.Root);
    if (r.error || !FX.node(r)) return c.error(p.Persist ? 'Der Netzwerkpfad wurde nicht gefunden' : `Der angegebene Laufwerksstamm "${p.Root}" ist nicht vorhanden oder kein Ordner.`, { category: 'ReadError', exception: 'System.IO.IOException', fqid: 'DriveRootError', target: p.Name });
    if (!(await c.should(`Name: ${p.Name} Anbieter: Microsoft.PowerShell.Core\\FileSystem Stamm: ${p.Root}`, 'Neues Laufwerk'))) return;
    c.session.psdrives = c.session.psdrives || [];
    const d = { name: p.Name, root: p.Root, persist: !!p.Persist, desc: p.Description || '', display: p.Persist ? p.Root : null };
    c.session.psdrives.push(d);
    if (p.Persist) { c.world.persistDrives = c.world.persistDrives || []; c.world.persistDrives.push({ user: c.session.user, name: p.Name, root: p.Root }); }
    c.out(driveObj({ name: p.Name, prov: 'FileSystem', root: p.Root, used: d.persist ? 2.1 * 1073741824 : null, free: d.persist ? 397 * 1073741824 : null, cur: '', desc: d.desc, display: d.display }));
  } });
def({ name: 'Remove-PSDrive', module: M, aliases: ['rdr'], input: 'none', sp: true, params: [P('Name', 'string[]', { pos: 0, mandatory: true }), P('Force', 'switch'), P('Scope', 'string')],
  run: async (c, p) => {
    for (const n of p.Name) {
      const i = (c.session.psdrives || []).findIndex(d => d.name.toLowerCase() === n.toLowerCase());
      if (i < 0) { c.error(`Das Laufwerk "${n}" kann nicht gefunden werden, da es nicht vorhanden ist.`, { category: 'ObjectNotFound', exception: 'System.Management.Automation.DriveNotFoundException', fqid: 'DriveNotFound', target: n }); continue; }
      if (!(await c.should(`Name: ${n}`, 'Laufwerk entfernen'))) continue;
      c.session.psdrives.splice(i, 1);
      if (c.world.persistDrives) c.world.persistDrives = c.world.persistDrives.filter(d => d.name.toLowerCase() !== n.toLowerCase());
    }
  } });
def({ name: 'Get-PSProvider', module: M, input: 'none', params: [P('PSProvider', 'string[]', { pos: 0 })],
  run: async (c, p) => {
    const vols = c.world.volumes.map(v => v.letter).concat((c.session.psdrives || []).map(d => d.name));
    const list = [['Registry', 'ShouldProcess, Transactions', ['HKLM', 'HKCU']], ['Alias', 'ShouldProcess', ['Alias']], ['Environment', 'ShouldProcess', ['Env']], ['FileSystem', 'Filter, ShouldProcess, Credentials', vols], ['Function', 'ShouldProcess', ['Function']], ['Variable', 'ShouldProcess', ['Variable']], ['Certificate', 'ShouldProcess', ['Cert']], ['WSMan', 'Credentials', ['WSMan']]];
    for (const [n, cap, dr] of list) if (!p.PSProvider || p.PSProvider.some(x => V.like(n, x))) c.out(new PSObject('System.Management.Automation.ProviderInfo', { Name: n, Capabilities: cap, Drives: dr }));
  } });

/* ---------- Archive ---------- */
function collectEntries(n, prefix, out) {
  if (n.dir) { out.push({ path: prefix + '/', dir: true, mtime: n.mtime.getTime() }); for (const k of kidsSorted(n)) collectEntries(k, prefix + '/' + k.name, out); }
  else out.push({ path: prefix, dir: false, size: n.length, content: n.content, rawSize: n.size, mtime: n.mtime.getTime(), enc: n.enc });
}
def({ name: 'Compress-Archive', module: 'Microsoft.PowerShell.Archive', version: '1.0.1.0', input: 'each', sp: true, cmdType: 'Function',
  params: [P('Path', 'string[]', { pos: 0, pipe: 'both', aliases: ['FullName'] }), P('LiteralPath', 'string[]', { aliases: ['PSPath'] }), P('DestinationPath', 'string', { pos: 1, mandatory: true }), P('CompressionLevel', 'enum', { values: ['Optimal', 'NoCompression', 'Fastest'] }), P('Update', 'switch'), P('Force', 'switch'), P('PassThru', 'switch')],
  begin: async (c) => { c._acc = []; },
  run: async (c, p) => {
    c._acc = c._acc || [];
    for (const path of (p.Path || p.LiteralPath || [])) {
      const rs = FX.expand(c.ctx, path, { literal: !!p.LiteralPath });
      if (!rs.length || !FX.node(rs[0])) { c.error(`Der Pfad "${path}" ist nicht vorhanden oder kein gültiger Dateisystempfad.`, { category: 'InvalidArgument', exception: 'System.InvalidOperationException', fqid: 'ArchiveCmdletPathNotFound,Compress-Archive', noClass: true, target: path }); continue; }
      for (const r of rs) {
        const n = FX.node(r);
        if (!GG.checkAccess(c.session, n, 'read')) { FX.errDenied(c, FX.canonical(r)); continue; }
        collectEntries(n, n.name, c._acc);
      }
    }
    if (!c.ctx._inEach) await finishArchive(c, p);
  },
  end: async () => { }
});
async function finishArchive(c, p) {
  if (!c._acc || !c._acc.length) return;
  let dest = p.DestinationPath;
  if (!/\.[^\\.]+$/.test(dest)) dest += '.zip';
  if (!/\.zip$/i.test(dest)) { c._acc = []; return c.error(`"${dest.replace(/^.*(\.[^.]+)$/, '$1')}" ist kein unterstütztes Archivdateiformat. Für den DestinationPath-Parameter wird nur ".zip" unterstützt.`, { category: 'InvalidArgument', exception: 'System.IO.IOException', fqid: 'NotSupportedArchiveFileExtension,Compress-Archive', noClass: true, target: dest }); }
  const r = FX.resolve(c.ctx, dest);
  const parent = FX.node(FX.parentRes(r));
  const full = FX.canonical(r);
  if (!parent) { c._acc = []; return c.error(`Der Pfad "${full.replace(/\\[^\\]*$/, '')}" ist nicht vorhanden oder kein gültiger Dateisystempfad.`, { category: 'InvalidArgument', exception: 'System.IO.IOException', fqid: 'ArchiveCmdletPathNotFound,Compress-Archive', noClass: true, target: dest }); }
  const ex = FX.node(r);
  if (ex && !p.Force && !p.Update) { c._acc = []; return c.error(`Die Archivdatei "${full}" ist bereits vorhanden. Verwenden Sie den Parameter "-Update", um die vorhandene Archivdatei zu aktualisieren, oder den Parameter "-Force", um die vorhandene Archivdatei zu überschreiben.`, { category: 'InvalidArgument', exception: 'System.IO.IOException', fqid: 'ArchiveFileExists,Compress-Archive', noClass: true, target: full }); }
  if (!GG.checkAccess(c.session, parent, 'write')) { c._acc = []; return FX.errDenied(c, full); }
  if (!(await c.should(full, 'Archiv erstellen'))) { c._acc = []; return; }
  let entries = c._acc;
  if (ex && p.Update && ex.archiveEntries) { const old = ex.archiveEntries.filter(e => !entries.some(x => x.path.toLowerCase() === e.path.toLowerCase())); entries = old.concat(entries); }
  const total = entries.reduce((a, e) => a + (e.size || 0), 0);
  const ratio = p.CompressionLevel === 'NoCompression' ? 1.0 : 0.42;
  const node = ex || parent.add(GG.f(r.parts[r.parts.length - 1], null, { size: 0, ctime: new Date(), owner: FX.newOwner(c.ctx) }));
  node.content = null; node.archiveEntries = entries; node.size = Math.max(22, Math.round(total * ratio) + entries.length * 76 + 22); node.mtime = new Date();
  c._acc = [];
  if (p.PassThru) c.out(GG.fsItem(node, full, r.world));
}
// Compress-Archive sammelt Pipeline-Eingaben selbst: eigener Ablauf
GG.cmdlets['compress-archive'].input = 'collect';
{
  const spec = GG.cmdlets['compress-archive'];
  const origRun = spec.run;
  spec.run = async (c, p, input) => {
    c._acc = [];
    const paths = (p.Path || p.LiteralPath || []).slice();
    for (const it of input || []) paths.push(it instanceof PSObject ? (it.get('FullName') || V.toStr(it)) : V.toStr(it));
    if (!paths.length) throw GG.bindErr(c.ctx, 'Compress-Archive', 'Der Befehl kann nicht verarbeitet werden, da einer oder mehrere obligatorische Parameter fehlen: Path.', 'MissingMandatoryParameter');
    c.ctx._inEach = true;
    await origRun(c, Object.assign({}, p, { Path: paths, LiteralPath: undefined }));
    c.ctx._inEach = false;
    await finishArchive(c, p);
  };
}
def({ name: 'Expand-Archive', module: 'Microsoft.PowerShell.Archive', version: '1.0.1.0', input: 'each', sp: true, cmdType: 'Function',
  params: [P('Path', 'string', { pos: 0, pipe: 'both', aliases: ['FullName'] }), P('LiteralPath', 'string', { aliases: ['PSPath'] }), P('DestinationPath', 'string', { pos: 1 }), P('Force', 'switch'), P('PassThru', 'switch')],
  run: async (c, p) => {
    const path = p.Path || p.LiteralPath;
    const r = FX.resolve(c.ctx, path);
    const n = FX.node(r);
    if (!n || n.dir) return c.error(`Der Pfad "${path}" ist nicht vorhanden oder kein gültiger Dateisystempfad.`, { category: 'InvalidArgument', exception: 'System.InvalidOperationException', fqid: 'ArchiveCmdletPathNotFound,Expand-Archive', noClass: true, target: path });
    if (!/\.zip$/i.test(n.name)) return c.error(`"${(/\.[^.]*$/.exec(n.name) || [''])[0]}" ist kein unterstütztes Archivdateiformat. Für den Path-Parameter wird nur ".zip" unterstützt.`, { category: 'InvalidArgument', exception: 'System.IO.IOException', fqid: 'NotSupportedArchiveFileExtension,Expand-Archive', noClass: true, target: path });
    if (!n.archiveEntries) return c.error(`Die Archivdatei "${FX.canonical(r)}" ist beschädigt oder kein gültiges ZIP-Archiv.`, { category: 'InvalidArgument', exception: 'System.IO.InvalidDataException', fqid: 'InvalidArchiveFilePathError,Expand-Archive', noClass: true, target: path });
    const destPath = p.DestinationPath || join(c.session.loc, n.name.replace(/\.zip$/i, ''));
    const dr = FX.resolve(c.ctx, destPath);
    if (!(await c.should(FX.canonical(dr), 'Archiv entpacken'))) return;
    let dnode = FX.node(dr);
    if (!dnode) { let pr = FX.parentRes(dr); while (pr.parts.length && !FX.node(pr)) pr = FX.parentRes(pr); if (!GG.checkAccess(c.session, FX.node(pr), 'write')) return FX.errDenied(c, FX.canonical(dr)); dnode = GG.mkdirs(c.ctx, dr); }
    if (!GG.checkAccess(c.session, dnode, 'write')) return FX.errDenied(c, FX.canonical(dr));
    for (const e of n.archiveEntries) {
      const parts = e.path.replace(/\/$/, '').split('/');
      let cur = dnode;
      for (let k = 0; k < parts.length - (e.dir ? 0 : 1); k++) { let ch = cur.get(parts[k]); if (!ch) { ch = GG.d(parts[k], [], { ctime: new Date(), mtime: new Date(e.mtime) }); cur.add(ch); } cur = ch; }
      if (!e.dir) {
        const nm = parts[parts.length - 1];
        const ex = cur.get(nm);
        const fp = FX.canonical(dr) + '\\' + parts.join('\\');
        if (ex) { if (!p.Force) { c.error(`Fehler beim Erstellen der Datei "${fp}" beim Extrahieren des Archivs. Die Datei "${fp}" ist bereits vorhanden. Verwenden Sie den Parameter "-Force", wenn die vorhandene Datei überschrieben werden soll.`, { category: 'WriteError', exception: 'System.IO.IOException', fqid: 'ExpandArchiveFileExists,Expand-Archive', noClass: true, target: fp }); continue; } cur.remove(nm); }
        const f = GG.f(nm, e.content === undefined ? '' : e.content, { size: e.rawSize, enc: e.enc, ctime: new Date(), mtime: new Date(e.mtime), zone: n.zone });
        cur.add(f);
        if (p.PassThru) c.out(GG.fsItem(f, fp, dr.world));
      }
    }
  } });

/* ---------- Hash / Unblock ---------- */
function sha256(str) {
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  const bytes = []; for (const ch of unescape(encodeURIComponent(str))) bytes.push(ch.charCodeAt(0));
  const l = bytes.length * 8; bytes.push(0x80); while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(i > 3 ? 0 : (l >>> (i * 8)) & 0xff);
  let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let i = 0; i < bytes.length; i += 64) {
    const w = new Array(64);
    for (let t = 0; t < 16; t++) w[t] = (bytes[i + t * 4] << 24) | (bytes[i + t * 4 + 1] << 16) | (bytes[i + t * 4 + 2] << 8) | bytes[i + t * 4 + 3];
    for (let t = 16; t < 64; t++) { const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3); const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10); w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0; }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) { const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25); const ch = (e & f) ^ (~e & g); const t1 = (h + S1 + ch + K[t] + w[t]) | 0; const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22); const mj = (a & b) ^ (a & c) ^ (b & c); const t2 = (S0 + mj) | 0; h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0; }
    H = [H[0] + a, H[1] + b, H[2] + c, H[3] + d, H[4] + e, H[5] + f, H[6] + g, H[7] + h].map(x => x | 0);
  }
  return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('').toUpperCase();
}
GG.sha256 = sha256;
GG.view('Microsoft.Powershell.Utility.FileHash', { table: [{ l: 'Algorithm', p: 'Algorithm', w: 15 }, { l: 'Hash', p: 'Hash', w: 64 }, { l: 'Path', p: 'Path' }] });
def({ name: 'Get-FileHash', input: 'each', cmdType: 'Function', params: [P('Path', 'string[]', { pos: 0, pipe: 'both', aliases: ['FullName'] }), P('LiteralPath', 'string[]', { aliases: ['PSPath'], pipe: 'prop' }), P('Algorithm', 'enum', { values: ['SHA1', 'SHA256', 'SHA384', 'SHA512', 'MACTripleDES', 'MD5', 'RIPEMD160'] }), P('InputStream', 'object')],
  run: async (c, p) => {
    for (const path of (p.Path || p.LiteralPath || [])) {
      readNode(c, path, !!p.LiteralPath, (n, e, v, full) => {
        if (!n) return;
        let h = sha256((n.content || '') + (n.size && !n.content ? 'bin:' + n.size + n.name : ''));
        const alg = p.Algorithm || 'SHA256';
        if (alg === 'MD5') h = h.slice(0, 32); else if (alg === 'SHA1') h = h.slice(0, 40); else if (alg === 'SHA512') h = (h + sha256(h)).slice(0, 128); else if (alg === 'SHA384') h = (h + sha256(h)).slice(0, 96);
        c.out(new PSObject('Microsoft.Powershell.Utility.FileHash', { Algorithm: alg, Hash: h, Path: full }));
      });
    }
  } });
def({ name: 'Unblock-File', input: 'each', sp: true, params: [P('Path', 'string[]', { pos: 0, pipe: 'both', aliases: ['FullName'] }), P('LiteralPath', 'string[]', { aliases: ['PSPath'], pipe: 'prop' })],
  run: async (c, p) => {
    for (const path of (p.Path || p.LiteralPath || [])) {
      const rs = FX.expand(c.ctx, path, { literal: !!p.LiteralPath });
      if (!rs.length || !FX.node(rs[0])) { c.error(`Der Pfad "${FX.resolve(c.ctx, path).full}" kann nicht gefunden werden, da er nicht vorhanden ist.`, { category: 'ObjectNotFound', exception: 'System.Management.Automation.ItemNotFoundException', fqid: 'FileNotFound', target: path }); continue; }
      for (const r of rs) {
        const n = FX.node(r);
        if (!GG.checkAccess(c.session, n, 'write')) { FX.errDenied(c, FX.canonical(r), { fqid: 'RemoveItemUnauthorizedAccessError' }); continue; }
        if (await c.should(FX.canonical(r), 'Unblock-File')) n.zone = 0;
      }
    }
  } });

/* ---------- ACL ---------- */
const INH = r => (r.oi || r.ci) ? [r.ci ? 'ContainerInherit' : null, r.oi ? 'ObjectInherit' : null].filter(Boolean).join(', ') : 'None';
function ruleObj(r) {
  const o = new PSObject('System.Security.AccessControl.FileSystemAccessRule', { FileSystemRights: GG.RIGHTS[r.r] || r.r, AccessControlType: r.type, IdentityReference: r.id, IsInherited: !!r.inherited, InheritanceFlags: INH(r), PropagationFlags: r.io ? 'InheritOnly' : (r.np ? 'NoPropagateInherit' : 'None') });
  o.rule = r; return o;
}
GG.ruleObj = ruleObj;
GG.aclObj = function (node, full, world) {
  const rules = GG.effAclDisplay(node);
  const o = new PSObject('System.Security.AccessControl.' + (node.dir ? 'DirectorySecurity' : 'FileSecurity'), null, { ref: node });
  o.pending = { rules: node.acl.map(x => Object.assign({}, x)), protectedAcl: node.protectedAcl, owner: node.owner, inheritedKept: true };
  const shown = () => (o.pending.protectedAcl && !o.pending.inheritedKept ? [] : (o.pending.protectedAcl ? rules.filter(x => x.inherited).map(x => Object.assign({}, x, { inherited: false })) : rules.filter(x => x.inherited))).concat(o.pending.rules.map(x => Object.assign({}, x, { inherited: false })));
  o.add('Path', 'Microsoft.PowerShell.Core\\FileSystem::' + full);
  o.add('Owner', null, () => o.pending.owner);
  o.add('Group', 'NT-AUTORITÄT\\SYSTEM');
  o.add('Access', null, () => {
    const rs = o.pending.rules.map(x => Object.assign({}, x, { inherited: false })).concat(o.pending.protectedAcl ? (o.pending.inheritedKept ? rules.filter(x => x.inherited).map(x => Object.assign({}, x, { inherited: false })) : []) : rules.filter(x => x.inherited));
    return rs.map(ruleObj);
  });
  o.add('Audit', '');
  o.add('Sddl', 'O:BAG:SYD:AI(A;OICIID;FA;;;BA)(A;OICIID;FA;;;SY)(A;OICIID;0x1200a9;;;BU)');
  o.add('AccessToString', null, () => o.get('Access').map(a => `${a.get('IdentityReference')} ${a.get('AccessControlType')}  ${a.get('FileSystemRights')}`).join('\n'));
  o.add('AreAccessRulesProtected', null, () => o.pending.protectedAcl);
  o.toStringFn = () => 'System.Security.AccessControl.' + (node.dir ? 'DirectorySecurity' : 'FileSecurity');
  const toRule = (args) => { const a = args[0]; if (!(a instanceof PSObject) || !a.rule) throw GG.methodExc('SetAccessRule', 1, 'Der Wert darf nicht NULL sein.\r\nParametername: rule', 'ArgumentNullException'); return Object.assign({}, a.rule); };
  o.methods.setaccessrule = function (args) { const r = toRule(args); o.pending.rules = o.pending.rules.filter(x => !(x.id.toLowerCase() === r.id.toLowerCase() && x.type === r.type)); o.pending.rules.push(r); };
  o.methods.addaccessrule = function (args) { o.pending.rules.push(toRule(args)); };
  o.methods.removeaccessrule = function (args) { const r = toRule(args); const before = o.pending.rules.length; o.pending.rules = o.pending.rules.filter(x => !(x.id.toLowerCase() === r.id.toLowerCase() && x.type === r.type && x.r === r.r)); return before !== o.pending.rules.length; };
  o.methods.removeaccessruleall = function (args) { const r = toRule(args); o.pending.rules = o.pending.rules.filter(x => x.id.toLowerCase() !== r.id.toLowerCase()); };
  o.methods.purgeaccessrules = function (args) { const id = V.toStr(args[0] instanceof PSObject ? args[0].get('Value') : args[0]); o.pending.rules = o.pending.rules.filter(x => x.id.toLowerCase() !== id.toLowerCase()); };
  o.methods.setaccessruleprotection = function (args) { o.pending.protectedAcl = V.toBool(args[0]); o.pending.inheritedKept = V.toBool(args[1]); };
  o.methods.setowner = function (args) { o.pending.owner = V.toStr(args[0] instanceof PSObject ? args[0].get('Value') : args[0]); };
  o.methods.getaccessrules = function () { return o.get('Access'); };
  return o;
};
GG.view('System.Security.AccessControl.FileSecurity', { group: { label: 'Verzeichnis', g: o => o.get('Path').replace(/^Microsoft\.PowerShell\.Core\\FileSystem::/, '').replace(/\\[^\\]*$/, '') }, table: [{ l: 'Path', g: o => o.get('Path').split('\\').pop(), w: 20 }, { l: 'Owner', p: 'Owner', w: 35 }, { l: 'Access', g: o => o.get('AccessToString') }], flist: [{ p: 'Path', g: o => o.get('Path') }, { p: 'Owner' }, { p: 'Group' }, { l: 'Access', g: o => o.get('AccessToString') }, { p: 'Audit' }, { p: 'Sddl' }] });
GG.views['System.Security.AccessControl.DirectorySecurity'] = GG.views['System.Security.AccessControl.FileSecurity'];
GG.view('System.Security.AccessControl.FileSystemAccessRule', { kind: 'list', list: ['FileSystemRights', 'AccessControlType', 'IdentityReference', 'IsInherited', 'InheritanceFlags', 'PropagationFlags'].map(p => ({ p })) });
def({ name: 'Get-Acl', module: 'Microsoft.PowerShell.Security', input: 'each', params: [P('Path', 'string[]', { pos: 0, pipe: 'both', aliases: ['FullName'] }), P('LiteralPath', 'string[]', { aliases: ['PSPath'], pipe: 'prop' }), P('Audit', 'switch'), P('Filter', 'string')],
  run: async (c, p) => {
    for (const path of (p.Path || p.LiteralPath || ['.'])) {
      const rs = FX.expand(c.ctx, path, { literal: !!p.LiteralPath, force: true });
      if (!rs.length || !FX.node(rs[0])) { c.error(`Der Pfad "${FX.resolve(c.ctx, path).full}" kann nicht gefunden werden, da er nicht vorhanden ist.`, { category: 'ObjectNotFound', exception: 'System.Management.Automation.ItemNotFoundException', fqid: 'GetAcl_PathNotFound_Exception', target: path, reason: 'ItemNotFoundException' }); continue; }
      for (const r of rs) {
        const n = FX.node(r);
        if (r.prov !== 'FileSystem') { c.error('Get-Acl wird in dieser Simulation nur für das Dateisystem unterstützt.', { category: 'NotImplemented', fqid: 'NotSupported' }); continue; }
        if (!GG.checkAccess(c.session, n, 'read') && !c.session.elevated) { c.error('Der Versuch, einen nicht autorisierten Vorgang auszuführen.', { category: 'NotSpecified', exception: 'System.UnauthorizedAccessException', fqid: 'System.UnauthorizedAccessException', target: '', reason: 'UnauthorizedAccessException' }); continue; }
        c.out(GG.aclObj(n, FX.canonical(r), r.world));
      }
    }
  } });
def({ name: 'Set-Acl', module: 'Microsoft.PowerShell.Security', input: 'collect', sp: true, params: [P('Path', 'string[]', { pos: 0 }), P('AclObject', 'object', { pos: 1, mandatory: true, pipe: 'value' }), P('LiteralPath', 'string[]'), P('Passthru', 'switch'), P('ClearCentralAccessPolicy', 'switch')],
  run: async (c, p, input) => {
    const acl = p.AclObject || (input && input[0]);
    if (!acl || !acl.pending) return c.error('Das AclObject-Argument ist kein gültiges Sicherheitsobjekt.', { category: 'InvalidArgument', fqid: 'SetAcl_AclObject', target: '' });
    for (const path of (p.Path || p.LiteralPath || [])) {
      const r = FX.resolve(c.ctx, path); const n = FX.node(r);
      if (!n) { FX.errNotFound(c, FX.canonical(r)); continue; }
      if (!GG.checkAccess(c.session, n, 'perm')) { c.error('Der Versuch, einen nicht autorisierten Vorgang auszuführen.', { category: 'PermissionDenied', exception: 'System.UnauthorizedAccessException', fqid: 'System.UnauthorizedAccessException', target: FX.canonical(r), reason: 'UnauthorizedAccessException' }); continue; }
      if (!(await c.should(FX.canonical(r), 'Set-Acl'))) continue;
      const pend = acl.pending;
      if (pend.protectedAcl && !n.protectedAcl) {
        if (pend.inheritedKept) { const inh = GG.effAclDisplay(n).filter(x => x.inherited).map(x => { const y = Object.assign({}, x); delete y.inherited; return y; }); n.acl = inh.concat(pend.rules.map(x => Object.assign({}, x))); }
        else n.acl = pend.rules.map(x => Object.assign({}, x));
        n.protectedAcl = true;
      } else { n.acl = pend.rules.map(x => Object.assign({}, x)); n.protectedAcl = pend.protectedAcl; }
      n.owner = pend.owner;
      if (p.Passthru) c.out(GG.aclObj(n, FX.canonical(r), r.world));
    }
  } });
/* Regeln über New-Object */
{
  const no = GG.cmdlets['new-object'];
  const orig = no.run;
  no.run = async (c, p) => {
    const tn = (p.TypeName || '').toLowerCase().replace(/^system\./, '');
    if (tn === 'security.accesscontrol.filesystemaccessrule') {
      const a = (p.ArgumentList || []).map(x => V.toStr(x));
      if (a.length < 3) return c.error(`Für "FileSystemAccessRule" und die folgende Argumentanzahl kann kein Konstruktor gefunden werden: "${a.length}".`, { category: 'InvalidOperation', fqid: 'ConstructorInvokedThrowException' });
      const id = a[0];
      const rightsTxt = a[1].toLowerCase().replace(/\s/g, '');
      const rmap = { fullcontrol: 'F', modify: 'M', readandexecute: 'RX', read: 'R', write: 'W', 'read,write': 'M', 'readandexecute,write': 'M' };
      const rr = rmap[rightsTxt] || (rightsTxt.includes('fullcontrol') ? 'F' : rightsTxt.includes('modify') ? 'M' : null);
      if (!rr) return c.error(`Ausnahme beim Aufrufen von ".ctor" mit ${a.length} Argument(en):  "Der angeforderte Wert "${a[1]}" wurde nicht gefunden."`, { category: 'InvalidOperation', fqid: 'ConstructorInvokedThrowException' });
      let inh = a.length >= 5 ? a[2].toLowerCase() : 'none', prop = a.length >= 5 ? a[3].toLowerCase() : 'none', type = a.length >= 5 ? a[4] : a[2];
      const rule = { id, r: rr, type: /deny/i.test(type) ? 'Deny' : 'Allow', oi: inh.includes('object'), ci: inh.includes('container'), io: prop.includes('inheritonly'), np: prop.includes('nopropagate') };
      return c.out(ruleObj(rule));
    }
    if (tn === 'security.principal.ntaccount') { const o = new PSObject('System.Security.Principal.NTAccount', { Value: V.toStr((p.ArgumentList || []).join('\\')) }); o.toStringFn = () => o.get('Value'); return c.out(o); }
    return orig(c, p);
  };
}

/* ---------- Ausführungsrichtlinie ---------- */
const POL = ['Unrestricted', 'RemoteSigned', 'AllSigned', 'Restricted', 'Default', 'Bypass', 'Undefined'];
GG.effectiveExecPolicy = function (ctx) {
  const w = ctx.world, s = ctx.session;
  for (const v of [w.execPolicy.MachinePolicy, w.execPolicy.UserPolicy, s.execPolicyProcess, w.execPolicy.CurrentUser, w.execPolicy.LocalMachine]) if (v && v !== 'Undefined') return v === 'Default' ? 'RemoteSigned' : v;
  return 'Restricted';
};
GG.view('Microsoft.PowerShell.ExecutionPolicy', { table: [{ l: 'Scope', p: 'Scope', w: 13, a: 'r' }, { l: 'ExecutionPolicy', p: 'ExecutionPolicy', w: 15, a: 'r' }] });
def({ name: 'Get-ExecutionPolicy', module: 'Microsoft.PowerShell.Security', input: 'none', params: [P('Scope', 'enum', { pos: 0, values: ['Process', 'CurrentUser', 'LocalMachine', 'UserPolicy', 'MachinePolicy'] }), P('List', 'switch')],
  run: async (c, p) => {
    const w = c.world;
    const val = sc => sc === 'Process' ? c.session.execPolicyProcess : w.execPolicy[sc];
    if (p.List) { for (const sc of ['MachinePolicy', 'UserPolicy', 'Process', 'CurrentUser', 'LocalMachine']) c.out(new PSObject('Microsoft.PowerShell.ExecutionPolicy', { Scope: sc, ExecutionPolicy: val(sc) })); return; }
    if (p.Scope) return c.out(val(p.Scope));
    c.out(GG.effectiveExecPolicy(c.ctx));
  } });
def({ name: 'Set-ExecutionPolicy', module: 'Microsoft.PowerShell.Security', input: 'none', sp: true, params: [P('ExecutionPolicy', 'enum', { pos: 0, mandatory: true, values: POL, enumType: 'Microsoft.PowerShell.ExecutionPolicy' }), P('Scope', 'enum', { pos: 1, values: ['Process', 'CurrentUser', 'LocalMachine', 'UserPolicy', 'MachinePolicy'], enumType: 'Microsoft.PowerShell.ExecutionPolicyScope' }), P('Force', 'switch')],
  run: async (c, p) => {
    const scope = p.Scope || 'LocalMachine';
    if (scope === 'UserPolicy' || scope === 'MachinePolicy') return c.error('Die Ausführungsrichtlinie kann für die Bereiche "MachinePolicy" und "UserPolicy" nicht festgelegt werden. Diese Bereiche werden durch Gruppenrichtlinien festgelegt.', { category: 'InvalidArgument', exception: 'System.ArgumentException', fqid: 'CantSetGroupPolicy' });
    if (!p.Force) {
      const ans = await c.host.choice('Ausführungsrichtlinie ändern', 'Die Ausführungsrichtlinie trägt zum Schutz vor nicht vertrauenswürdigen Skripts bei. Wenn Sie die Ausführungsrichtlinie ändern, sind Sie möglicherweise den im Hilfethema "about_Execution_Policies" unter "https:/go.microsoft.com/fwlink/?LinkID=135170" beschriebenen Sicherheitsrisiken ausgesetzt. Möchten Sie die Ausführungsrichtlinie ändern?', GG.CHOICE_YANKH, 2);
      if (ans === 'H') throw new GG.StopSignal();
      if (ans !== 'J' && ans !== 'A') return;
    }
    if (!(await c.should(scope, 'Set-ExecutionPolicy'))) return;
    if (scope === 'LocalMachine' && !c.session.elevated) return c.error('Der Zugriff auf den Registrierungsschlüssel "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\PowerShell\\1\\ShellIds\\Microsoft.PowerShell" wurde verweigert. Ändern Sie die Ausführungsrichtlinie für den Standardbereich (LocalMachine), indem Sie die Windows PowerShell-Option "Als Administrator ausführen" verwenden. Um die Ausführungsrichtlinie für den aktuellen Benutzer zu ändern, führen Sie "Set-ExecutionPolicy -Scope CurrentUser" aus.', { category: 'PermissionDenied', exception: 'System.UnauthorizedAccessException', fqid: 'System.UnauthorizedAccessException', target: '', reason: 'UnauthorizedAccessException' });
    if (scope === 'Process') c.session.execPolicyProcess = p.ExecutionPolicy; else c.world.execPolicy[scope] = p.ExecutionPolicy === 'Default' ? (scope === 'LocalMachine' ? 'RemoteSigned' : 'Undefined') : p.ExecutionPolicy;
    const eff = GG.effectiveExecPolicy(c.ctx);
    const want = p.ExecutionPolicy === 'Default' ? 'RemoteSigned' : p.ExecutionPolicy;
    if (eff !== want && want !== 'Undefined') c.error(`Windows PowerShell hat Ihre Ausführungsrichtlinie erfolgreich aktualisiert, aber die Einstellung wird durch eine Richtlinie überschrieben, die in einem spezifischeren Bereich definiert ist. Aufgrund der Außerkraftsetzung wird für die Shell weiterhin die aktuelle effektive Ausführungsrichtlinie "${eff}" beibehalten. Geben Sie "Get-ExecutionPolicy -List" ein, um die Einstellungen der Ausführungsrichtlinie anzuzeigen. Weitere Informationen erhalten Sie mit "Get-Help Set-ExecutionPolicy".`, { category: 'PermissionDenied', exception: 'System.Security.SecurityException', fqid: 'ExecutionPolicyOverride', target: '', reason: 'SecurityException' });
  } });

})();
