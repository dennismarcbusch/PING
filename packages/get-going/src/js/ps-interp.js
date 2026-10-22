/* Get-Going! – Interpreter */
(function () {
'use strict';
const GG = globalThis.GG = globalThis.GG || {};
const V = GG.v;
const { PSObject, PSHash, ScriptBlock, PSDate, TimeSpan, SecureString, ErrorRecord, PSRuntimeError,
  BreakSignal, ContinueSignal, ReturnSignal, ExitSignal, StopSignal } = GG;

GG.cmdlets = GG.cmdlets || {};   // lower -> spec
GG.aliases = GG.aliases || {};   // lower -> Ziel
GG.natives = GG.natives || {};   // lower -> fn

/* ---------- Scope ---------- */
class Scope {
  constructor(parent, kind) { this.vars = new Map(); this.fns = new Map(); this.aliases = new Map(); this.parent = parent; this.kind = kind || 'local'; }
  find(name) { const k = name.toLowerCase(); for (let s = this; s; s = s.parent) if (s.vars.has(k)) return s.vars.get(k); return null; }
  setLocal(name, value, opts) { const k = name.toLowerCase(); const e = this.vars.get(k); if (e) { if (e.readonly && !(opts && opts.force)) throw roErr(name); e.value = value; } else this.vars.set(k, Object.assign({ name, value }, opts || {})); }
  findFn(name) { const k = name.toLowerCase(); for (let s = this; s; s = s.parent) if (s.fns.has(k)) return s.fns.get(k); return null; }
  scriptScope() { for (let s = this; s; s = s.parent) if (s.kind === 'script' || s.kind === 'global') return s; return this; }
  global() { let s = this; while (s.parent) s = s.parent; return s; }
}
GG.Scope = Scope;
function roErr(name) { return new PSRuntimeError(new ErrorRecord({ message: `Die Variable "${name}" kann nicht überschrieben werden, da sie schreibgeschützt oder konstant ist.`, category: 'WriteError', exception: 'System.Management.Automation.SessionStateUnauthorizedAccessException', fqid: 'VariableNotWritable', target: name })); }

/* ---------- Session ---------- */
class Session {
  constructor(world, host, opts) {
    opts = opts || {};
    this.world = world; this.host = host;
    this.user = opts.user || world.defaultUser || 'azubi';
    this.domain = opts.domain || world.domainNetbios || world.hostname;
    this.elevated = !!opts.elevated;
    this.remoteOrigin = opts.remoteOrigin || null;
    this.global = new Scope(null, 'global');
    this.home = opts.home || `C:\\Users\\${this.user}`;
    this.loc = opts.loc || this.home;
    this.driveLocs = {};
    this.locStack = [];
    this.history = [];
    this.errors = [];
    this.env = {};
    this.log = [];
    this.lastExit = 0; this.lastOk = true;
    this.remote = null;
    this.psSessions = [];
    this.modulesLoaded = new Set(['microsoft.powershell.management', 'microsoft.powershell.utility', 'psreadline']);
    this.execPolicyProcess = 'Undefined';
    this.id = Session.nextId++;
    this.name = opts.name || null;
  }
  get identity() { return this.domain + '\\' + this.user; }
}
Session.nextId = 1;
GG.Session = Session;

/* ---------- Kontext ---------- */
function mkCtx(session, scope, extra) {
  return Object.assign({ session, scope, world: session.world, host: session.host, inTry: false, errSink: null, file: null, stream: false, depth: 0 }, extra || {});
}
GG.mkCtx = mkCtx;

const AUTO = {
  'true': () => true, 'false': () => false, 'null': () => null,
  'home': c => c.session.home,
  'error': c => c.session.errors,
  'pwd': c => GG.pathInfo(c.session.loc),
  'pid': c => c.world.pidPowershell || 4242,
  'lastexitcode': c => c.session.lastExit,
  '?': c => c.session.lastOk,
  'psculture': () => 'de-DE', 'psuiculture': () => 'de-DE',
  'pshome': () => 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0',
  'profile': c => `C:\\Users\\${c.session.user}\\Documents\\WindowsPowerShell\\Microsoft.PowerShell_profile.ps1`,
  'host': c => GG.hostObj(c),
  'psversiontable': () => GG.psVersionTable(),
  'erroractionpreference': () => 'Continue', 'confirmpreference': () => 'High', 'whatifpreference': () => false,
  'verbosepreference': () => 'SilentlyContinue', 'warningpreference': () => 'Continue', 'progresspreference': () => 'Continue',
  'formatenumerationlimit': () => 4, 'maximumhistorycount': () => 4096, 'nestedpromptlevel': () => 0,
  'shellid': () => 'Microsoft.PowerShell', 'executioncontext': () => new PSObject('System.Management.Automation.EngineIntrinsics', {})
};

/* ---------- Fehler-Helfer ---------- */
function rec(o) { return new ErrorRecord(o); }
function rtErr(o) { return new PSRuntimeError(rec(o)); }
GG.rtErr = rtErr;
function posOf(node) {
  if (!node || !node.src || node.s === undefined) return null;
  const s = node.src.text;
  const before = s.slice(0, node.s);
  const line = before.split('\n').length;
  const ls = before.lastIndexOf('\n') + 1;
  let le = s.indexOf('\n', node.s); if (le < 0) le = s.length;
  const e = Math.min(node.e, le);
  return { file: node.src.file, line, col: node.s - ls + 1, text: s.slice(ls, le), len: Math.max(1, e - node.s) };
}
GG.posOf = posOf;

/* ---------- Interpreter ---------- */
const I = GG.interp = {};

I.runTop = async function (session, text, opts) {
  opts = opts || {};
  const host = session.host;
  const entry = { line: text, cmds: [], errors: [], out: [], ok: true, time: Date.now(), elevated: session.elevated, remote: session.remote ? session.remote.world.hostname : null };
  const target = session.remote ? session.remote.session : session;
  const ctxSession = target;
  session.curLog = entry; if (target !== session) target.curLog = entry;
  if (!opts.noHistory && text.trim()) session.history.push({ id: session.history.length + 1, line: text, start: new PSDate(new Date()) });
  let ast;
  try { ast = GG.parse(text); }
  catch (e) {
    if (e instanceof GG.ParseError) {
      const r = rec({ message: e.message, category: 'ParserError', exception: 'System.Management.Automation.ParseException', fqid: e.fqid, reason: 'ParentContainsErrorRecordException', pos: e.pos });
      r.parse = true;
      target.errors.unshift(r);
      entry.ok = false; entry.errors.push(r.message);
      host.showError(r, ctxSession);
      session.log.push(entry);
      return entry;
    }
    throw e;
  }
  const ctx = mkCtx(ctxSession, ctxSession.global, { top: true, entry, origin: session });
  try {
    await I.execBody(ast.body || [], ctx, null, true);
  } catch (e) {
    if (e instanceof PSRuntimeError) { I.report(e.rec, ctx); }
    else if (e instanceof ExitSignal) { if (session.remote) { await GG.remote.exitSession(session); } else { host.exitShell && host.exitShell(session); } }
    else if (e instanceof StopSignal) { /* abgebrochen */ }
    else if (e instanceof BreakSignal || e instanceof ContinueSignal || e instanceof ReturnSignal) { /* ignorieren */ }
    else { console.error(e); host.write('Interner Fehler der Simulation: ' + (e && e.message), { color: 'red' }); entry.ok = false; }
  }
  session.log.push(entry);
  return entry;
};

/* Statements ausführen; out == null => direkt an Host ausgeben */
I.execBody = async function (stmts, ctx, out, top) {
  for (const st of stmts) {
    const local = [];
    try {
      await I.execStatement(st, ctx, local, out === null);
    } catch (e) {
      if (e instanceof PSRuntimeError && !e.rec.pos && st.src) e.rec.pos = posOf(st);
      if (e instanceof PSRuntimeError && !e.scriptTerm && !ctx.inTry && !top) {
        I.report(e.rec, ctx);
        continue;
      }
      if (e instanceof PSRuntimeError && top && !e.scriptTerm) { I.flush(local, ctx, out); I.report(e.rec, ctx); continue; }
      I.flush(local, ctx, out);
      throw e;
    }
    I.flush(local, ctx, out);
  }
};
I.flush = function (local, ctx, out) {
  if (!local.length) return;
  if (out) { for (const x of local) out.push(x); return; }
  if (ctx.entry) for (const x of local) ctx.entry.out.push(x);
  ctx.host.outDefault(local, ctx);
};

I.report = function (r, ctx) {
  const s = ctx.session;
  s.errors.unshift(r);
  if (s.errors.length > 256) s.errors.length = 256;
  s.lastOk = false;
  if (ctx.entry) { ctx.entry.ok = false; ctx.entry.errors.push(r.message); }
  if (ctx.errSink) { ctx.errSink.push(r); return; }
  ctx.host.showError(r, s);
};

/* nicht-terminierender Fehler eines Befehls */
I.writeError = function (r, ctx, ea) {
  ea = (ea || I.prefValue(ctx, 'ErrorActionPreference') || 'Continue');
  const e = String(ea).toLowerCase();
  if (e === 'stop') { const ex = new PSRuntimeError(r); ex.scriptTerm = true; r.stopped = true; throw ex; }
  if (e === 'ignore') return;
  if (e === 'silentlycontinue') { ctx.session.errors.unshift(r); ctx.session.lastOk = false; if (ctx.entry) ctx.entry.silentErrors = (ctx.entry.silentErrors || 0) + 1; return; }
  I.report(r, ctx);
};
I.prefValue = function (ctx, name) { const v = ctx.scope.find(name); return v ? v.value : null; };

I.execStatement = async function (st, ctx, out, toHost) {
  switch (st.t) {
    case 'pipeline': {
      const res = await I.runPipeline(st, ctx, toHost, true);
      for (const x of res) out.push(x);
      return;
    }
    case 'assign': return I.assign(st, ctx);
    case 'if': {
      for (const cl of st.clauses) {
        const v = await I.evalPipelineValue(cl.cond, ctx);
        if (V.toBool(v)) { await I.execBody(cl.body.body, ctx, out); return; }
      }
      if (st.els) await I.execBody(st.els.body, ctx, out);
      return;
    }
    case 'foreach': {
      const coll = V.toArr(await I.evalPipelineValue(st.iter, ctx));
      const items = coll instanceof PSHash ? [coll] : coll;
      for (const it of items) {
        ctx.scope.setLocal(st.v, it);
        try { await I.execBody(st.body.body, ctx, out); }
        catch (e) { if (e instanceof BreakSignal) break; if (e instanceof ContinueSignal) continue; throw e; }
      }
      return;
    }
    case 'for': {
      if (st.init) await I.execStatement(st.init, ctx, []);
      let guard = 0;
      while (!st.cond || V.toBool(await I.evalPipelineValue(st.cond, ctx))) {
        if (++guard > 100000) throw rtErr({ message: 'Die Schleife wurde nach 100000 Durchläufen von der Simulation abgebrochen.', fqid: 'LoopLimit' });
        try { await I.execBody(st.body.body, ctx, out); }
        catch (e) { if (e instanceof BreakSignal) break; if (!(e instanceof ContinueSignal)) throw e; }
        if (st.step) await I.execStatement(st.step, ctx, []);
      }
      return;
    }
    case 'while': {
      let guard = 0;
      while (V.toBool(await I.evalPipelineValue(st.cond, ctx))) {
        if (++guard > 100000) throw rtErr({ message: 'Die Schleife wurde nach 100000 Durchläufen von der Simulation abgebrochen.', fqid: 'LoopLimit' });
        try { await I.execBody(st.body.body, ctx, out); }
        catch (e) { if (e instanceof BreakSignal) break; if (!(e instanceof ContinueSignal)) throw e; }
      }
      return;
    }
    case 'do': {
      let guard = 0;
      for (;;) {
        if (++guard > 100000) throw rtErr({ message: 'Die Schleife wurde nach 100000 Durchläufen von der Simulation abgebrochen.', fqid: 'LoopLimit' });
        try { await I.execBody(st.body.body, ctx, out); }
        catch (e) { if (e instanceof BreakSignal) break; if (!(e instanceof ContinueSignal)) throw e; }
        const c = V.toBool(await I.evalPipelineValue(st.cond, ctx));
        if (st.until ? c : !c) break;
      }
      return;
    }
    case 'switch': return I.execSwitch(st, ctx, out);
    case 'function': {
      const sc = st.name.toLowerCase().startsWith('global:') ? ctx.scope.global() : (st.name.toLowerCase().startsWith('script:') ? ctx.scope.scriptScope() : ctx.scope);
      const nm = st.name.replace(/^(global|script|local):/i, '');
      sc.fns.set(nm.toLowerCase(), { name: nm, def: st.def, src: st.def.src });
      return;
    }
    case 'try': {
      const tctx = Object.assign({}, ctx, { inTry: true });
      try {
        await I.execBody(st.body.body, tctx, out);
      } catch (e) {
        if (e instanceof PSRuntimeError) {
          const cl = st.catches.find(c => c.types.length === 0 || c.types.some(t => I.excMatches(e.rec, t)));
          if (!cl) throw e;
          if (ctx.entry) ctx.entry.caught = (ctx.entry.caught || 0) + 1;
          if (!ctx.session.errors.includes(e.rec)) ctx.session.errors.unshift(e.rec);
          const prev = ctx.scope.vars.get('_');
          ctx.scope.setLocal('_', e.rec); ctx.scope.setLocal('PSItem', e.rec);
          try { await I.execBody(cl.body.body, ctx, out); }
          finally { if (prev) ctx.scope.vars.set('_', prev); else ctx.scope.vars.delete('_'); ctx.scope.vars.delete('psitem'); }
        } else throw e;
      } finally {
        if (st.fin) await I.execBody(st.fin.body, ctx, out);
      }
      return;
    }
    case 'return': {
      if (st.value) { const r = await I.runPipeline(st.value, ctx); for (const x of r) out.push(x); }
      throw new ReturnSignal();
    }
    case 'throw': {
      let v = st.value ? await I.evalPipelineValue(st.value, ctx) : null;
      let r;
      if (v instanceof ErrorRecord) r = v;
      else {
        const msg = v === null ? 'ScriptHalted' : V.toStr(v);
        r = rec({ message: msg, category: 'OperationStopped', exception: 'System.Management.Automation.RuntimeException', fqid: msg, target: msg, reason: 'RuntimeException', pos: posOf(st) });
        r.thrown = true;
      }
      const ex = new PSRuntimeError(r); ex.scriptTerm = true;
      throw ex;
    }
    case 'break': throw new BreakSignal(st.label);
    case 'continue': throw new ContinueSignal(st.label);
    case 'exit': { const code = st.value ? V.toNum(await I.evalPipelineValue(st.value, ctx)) : 0; ctx.session.lastExit = code; throw new ExitSignal(code); }
    default: throw new Error('Unbekannte Anweisung ' + st.t);
  }
};

I.EXC_PARENTS = {
  'System.Management.Automation.ItemNotFoundException': ['System.Management.Automation.SessionStateException'],
  'System.Management.Automation.SessionStateException': ['System.Management.Automation.RuntimeException'],
  'System.Management.Automation.CommandNotFoundException': ['System.Management.Automation.RuntimeException'],
  'System.Management.Automation.ParameterBindingException': ['System.Management.Automation.RuntimeException'],
  'System.Management.Automation.MethodInvocationException': ['System.Management.Automation.RuntimeException'],
  'System.Management.Automation.RuntimeException': ['System.SystemException'],
  'System.UnauthorizedAccessException': ['System.SystemException'],
  'System.IO.IOException': ['System.SystemException'],
  'System.IO.FileNotFoundException': ['System.IO.IOException'],
  'System.IO.DirectoryNotFoundException': ['System.IO.IOException'],
  'System.DivideByZeroException': ['System.ArithmeticException'],
  'System.ArithmeticException': ['System.SystemException'],
  'Microsoft.ActiveDirectory.Management.ADIdentityNotFoundException': ['Microsoft.ActiveDirectory.Management.ADException'],
  'Microsoft.ActiveDirectory.Management.ADException': ['System.SystemException'],
  'System.Management.Automation.Remoting.PSRemotingTransportException': ['System.Management.Automation.RuntimeException'],
  'Microsoft.Management.Infrastructure.CimException': ['System.SystemException'],
  'System.Net.NetworkInformation.PingException': ['System.InvalidOperationException'],
  'System.InvalidOperationException': ['System.SystemException'],
  'System.SystemException': ['System.Exception']
};
I.excMatches = function (r, t) {
  const want = t.replace(/^System\./i, '').toLowerCase();
  let cur = [r.exception].concat(r.inner ? [r.inner] : []);
  const seen = new Set();
  while (cur.length) {
    const n = cur.shift(); if (seen.has(n)) continue; seen.add(n);
    const short = n.replace(/^System\./i, '').toLowerCase();
    if (short === want || n.toLowerCase() === t.toLowerCase() || n.split('.').pop().toLowerCase() === want.split('.').pop() && want.split('.').length === 1) return true;
    if (want === 'exception') return true;
    cur = cur.concat(I.EXC_PARENTS[n] || (n === 'System.Exception' ? [] : ['System.Exception']));
  }
  return false;
};

I.execSwitch = async function (st, ctx, out) {
  const vals = V.toArr(await I.evalPipelineValue(st.value, ctx));
  for (const v of vals) {
    let matched = false;
    const prev = ctx.scope.vars.get('_');
    ctx.scope.setLocal('_', v);
    try {
      for (const cl of st.clauses) {
        if (cl.pat.t === 'default') continue;
        let ok;
        if (cl.pat.t === 'sb') ok = V.toBool(V.unwrap(await I.invokeSB(new ScriptBlock(cl.pat.block.def, cl.pat.block.text), ctx, { dollar: v, dot: true })));
        else {
          const p = await I.evalExpr(cl.pat, ctx);
          if (st.opts.wildcard) ok = V.like(v, p, st.opts.casesensitive);
          else if (st.opts.regex) ok = V.netRe(p, st.opts.casesensitive ? '' : 'i').test(V.toStr(v));
          else ok = V.eq(v, p, st.opts.casesensitive);
        }
        if (ok) {
          matched = true;
          try { await I.execBody(cl.body.body, ctx, out); }
          catch (e) { if (e instanceof BreakSignal) return; if (e instanceof ContinueSignal) break; throw e; }
        }
      }
      if (!matched) {
        const d = st.clauses.find(c => c.pat.t === 'default');
        if (d) { try { await I.execBody(d.body.body, ctx, out); } catch (e) { if (e instanceof BreakSignal) return; if (!(e instanceof ContinueSignal)) throw e; } }
      }
    } finally { if (prev) ctx.scope.vars.set('_', prev); else ctx.scope.vars.delete('_'); }
  }
};

I.evalPipelineValue = async function (p, ctx) {
  if (p.t === 'pipeline') {
    if (p.els.length === 1 && p.els[0].t === 'expr' && !p.els[0].redirs.length) return I.evalExpr(p.els[0].expr, ctx);
    return V.unwrap(await I.runPipeline(p, ctx));
  }
  const out = [];
  await I.execStatement(p, ctx, out);
  return V.unwrap(out);
};

/* ---------- Zuweisung ---------- */
I.assign = async function (st, ctx) {
  let val;
  if (st.value.t === 'pipeline') {
    const p = st.value;
    if (p.els.length === 1 && p.els[0].t === 'expr' && !p.els[0].redirs.length) val = await I.evalExpr(p.els[0].expr, ctx);
    else val = V.unwrap(await I.runPipeline(p, ctx));
  } else {
    const out = []; await I.execStatement(st.value, ctx, out); val = V.unwrap(out);
  }
  if (val === undefined) val = null;
  const t = st.target;
  if (st.op !== '=') {
    const cur = await I.evalExpr(t, ctx);
    const op = st.op[0];
    val = op === '+' ? V.add(cur, val) : op === '-' ? V.sub(cur, val) : op === '*' ? V.mul(cur, val) : op === '/' ? V.div(cur, val) : V.mod(cur, val);
  }
  await I.setTarget(t, val, ctx);
};
I.setTarget = async function (t, val, ctx) {
  if (t.t === 'cast') {
    const tn = V.resolveType(t.type);
    if (!tn) throw GG.typeNotFound(t.type);
    val = V.cast(tn, val);
    // Typbindung merken
    if (t.e.t === 'var') { I.setVar(t.e, val, ctx, tn); return; }
    return I.setTarget(t.e, val, ctx);
  }
  if (t.t === 'var') {
    const ent = I.findVarEntry(t, ctx);
    if (ent && ent.type) val = V.cast(ent.type, val);
    return I.setVar(t, val, ctx);
  }
  if (t.t === 'array') {
    const vals = V.toArr(val);
    for (let k = 0; k < t.items.length; k++) {
      const v = k === t.items.length - 1 ? V.unwrap(vals.slice(k)) : (vals[k] === undefined ? null : vals[k]);
      await I.setTarget(t.items[k], v, ctx);
    }
    return;
  }
  if (t.t === 'member') {
    const obj = await I.evalExpr(t.obj, ctx);
    const name = t.name.t === 'str' ? t.name.v : V.toStr(await I.evalExpr(t.name, ctx));
    return I.setMember(obj, name, val, ctx);
  }
  if (t.t === 'index') {
    const obj = await I.evalExpr(t.obj, ctx);
    const idx = await I.evalExpr(t.idx, ctx);
    if (obj === null || obj === undefined) throw rtErr({ message: 'Indizierung in ein Array mit dem Wert NULL nicht möglich.', category: 'InvalidOperation', fqid: 'NullArray' });
    if (obj instanceof PSHash) { obj.set(idx, val); return; }
    if (Array.isArray(obj)) {
      let i = V.toInt(idx); if (i < 0) i += obj.length;
      if (i < 0 || i >= obj.length) throw rtErr({ message: 'Der Index lag außerhalb des Bereichs. Er darf nicht negativ und kleiner als die Sammlung sein.', category: 'OperationStopped', exception: 'System.IndexOutOfRangeException', fqid: 'System.IndexOutOfRangeException' });
      obj[i] = val; return;
    }
    if (obj instanceof PSObject) { obj.set(V.toStr(idx), val); return; }
    throw rtErr({ message: `Die Indizierung ist für Objekte vom Typ "${V.typeOf(obj)}" nicht möglich.`, fqid: 'CannotIndex' });
  }
  throw rtErr({ message: 'Der Zuweisungsausdruck ist ungültig.', fqid: 'InvalidLeftHandSide' });
};
I.findVarEntry = function (t, ctx) {
  const sc = t.scope;
  if (sc === 'env' || sc === 'using') return null;
  if (sc === 'global') return ctx.session.global.vars.get(t.name.toLowerCase()) || null;
  if (sc === 'script') return ctx.scope.scriptScope().vars.get(t.name.toLowerCase()) || null;
  return ctx.scope.find(t.name);
};
I.setVar = function (t, val, ctx, type) {
  const name = t.name; const k = name.toLowerCase();
  if (t.scope === 'env') { GG.envSet(ctx, name, val === null ? null : V.toStr(val)); return; }
  if (['true', 'false', 'null', 'home', 'pid', 'host', 'psversiontable', 'pshome', 'executioncontext', 'shellid'].includes(k) && !t.scope) {
    if (k === 'null') return; // $null = ... verwirft
    throw roErr(name);
  }
  if (k === '_' || k === 'psitem') { ctx.scope.setLocal(name, val); return; }
  let sc = ctx.scope;
  if (t.scope === 'global') sc = ctx.session.global;
  else if (t.scope === 'script') sc = ctx.scope.scriptScope();
  else if (t.scope === 'using') throw rtErr({ message: 'Eine Variable mit dem Bereichsmodifizierer "using" kann nicht zugewiesen werden.', fqid: 'UsingVariableIsReadOnly' });
  sc.setLocal(name, val, type ? { type } : undefined);
  if (type) sc.vars.get(k).type = type;
};

/* ---------- Variablen lesen ---------- */
I.getVar = function (t, ctx) {
  const name = t.name; const k = name.toLowerCase();
  if (t.scope === 'env') return GG.envGet(ctx, name);
  if (t.scope === 'using') {
    if (!ctx.usingScope) throw rtErr({ message: 'Eine Using-Variable kann nur mit "Invoke-Command", "Start-Job" oder "InlineScript" im Skriptworkflow verwendet werden. Bei Verwendung mit "Invoke-Command" ist die Using-Variable nur gültig, wenn der Skriptblock auf einem Remotecomputer aufgerufen wird.', category: 'InvalidOperation', fqid: 'UsingWithoutInvokeCommand' });
    const e = ctx.usingScope.find(name); return e ? GG.remote.serialize(e.value) : null;
  }
  if (t.scope === 'global') { const e = ctx.session.global.vars.get(k); return e ? e.value : (AUTO[k] ? AUTO[k](ctx) : null); }
  if (t.scope === 'script') { const e = ctx.scope.scriptScope().vars.get(k); return e ? e.value : null; }
  if (t.scope === 'function') { const f = ctx.scope.findFn(name); return f ? new ScriptBlock(f.def, f.def.text || '') : null; }
  if (t.scope === 'variable' || t.scope === 'local' || t.scope === 'private' || !t.scope) {
    if (k === 'psitem') { const e = ctx.scope.find('_'); return e ? e.value : null; }
    const e = ctx.scope.find(name);
    if (e) return e.value;
    if (AUTO[k]) return AUTO[k](ctx);
    if (k === 'matches' || k === 'args' || k === 'input' || k === 'psscriptroot' || k === 'pscommandpath') return null;
    if (/^[a-z]$/i.test(k) && t.scope) return null;
    return null;
  }
  // Laufwerksvariable wie ${C:\pfad}
  return null;
};

/* ---------- Ausdrücke ---------- */
I.evalExpr = async function (e, ctx) {
  switch (e.t) {
    case 'num': return e.v;
    case 'str': return e.v;
    case 'const': return e.v;
    case 'xstr': {
      let s = '';
      for (const p of e.parts) {
        if (p.t === 'str') s += p.v;
        else if (p.t === 'var') s += I.strExpand(I.getVar(p, ctx));
        else if (p.t === 'sub') { const out = []; await I.execBody(p.body, ctx, out); s += I.strExpand(V.unwrap(out)); }
      }
      return s;
    }
    case 'var': return I.getVar(e, ctx);
    case 'array': {
      const r = [];
      for (const it of e.items) r.push(await I.evalExpr(it, ctx));
      return r;
    }
    case 'arrayexpr': { const out = []; await I.execBody(e.body, ctx, out); return out; }
    case 'sub': { const out = []; await I.execBody(e.body, ctx, out); return V.unwrap(out); }
    case 'paren': {
      if (e.p.t === 'pipeline') {
        const p = e.p;
        if (p.els.length === 1 && p.els[0].t === 'expr' && !p.els[0].redirs.length) return I.evalExpr(p.els[0].expr, ctx);
        return V.unwrap(await I.runPipeline(p, ctx));
      }
      if (e.p.t === 'assign') { await I.assign(e.p, ctx); return I.evalExpr(e.p.target.t === 'cast' ? e.p.target.e : e.p.target, ctx); }
      const out = []; await I.execStatement(e.p, ctx, out); return V.unwrap(out);
    }
    case 'hash': {
      const h = new PSHash();
      for (const en of e.entries) {
        const k = await I.evalExpr(en.key, ctx);
        const v = await I.evalPipelineValue(en.value, ctx);
        h.set(V.toStr(k), v === undefined ? null : v);
      }
      return h;
    }
    case 'sb': return new ScriptBlock(e.def, e.text, e.def.src);
    case 'type': {
      const tn = V.resolveType(e.name);
      if (!tn && !/^[\w.]+$/.test(e.name)) throw GG.typeNotFound(e.name);
      return GG.typeObj(tn || e.name);
    }
    case 'cast': {
      const v = await I.evalExpr(e.e, ctx);
      if (e.type.toLowerCase() === 'ordered') { if (!(v instanceof PSHash)) throw rtErr({ message: 'Das Attribut [ordered] kann nur für ein Hashliteral angegeben werden.', fqid: 'OrderedAttributeOnlyOnHashLiteralNode' }); v.ordered = true; return v; }
      if (e.type.toLowerCase() === 'void') return undefined;
      const tn = V.resolveType(e.type);
      if (!tn) throw GG.typeNotFound(e.type);
      if (tn === 'System.Management.Automation.PSCredential') return v;
      return V.cast(tn, v);
    }
    case 'not': return !V.toBool(await I.evalExpr(e.e, ctx));
    case 'neg': { const v = await I.evalExpr(e.e, ctx); return -V.toNum(v); }
    case 'pos': return V.toNum(await I.evalExpr(e.e, ctx));
    case 'unary': {
      const v = await I.evalExpr(e.e, ctx);
      if (e.op === 'split') return V.toArr(v).flatMap(x => V.toStr(x).split(/\s+/).filter(Boolean));
      if (e.op === 'join') return V.toArr(v).map(V.toStr).join('');
      if (e.op === 'bnot') return ~V.toInt(v);
      return v;
    }
    case 'incr': {
      const cur = await I.evalExpr(e.e, ctx);
      const nv = V.toNum(cur) + (e.op === '++' ? 1 : -1);
      await I.setTarget(e.e, nv, ctx);
      return ctx.discardIncr ? undefined : (e.pre ? nv : cur);
    }
    case 'range': {
      const a = V.toInt(await I.evalExpr(e.l, ctx)), b = V.toInt(await I.evalExpr(e.r, ctx));
      if (Math.abs(b - a) > 1e6) throw rtErr({ message: 'Der Bereich ist für die Simulation zu groß.', fqid: 'RangeTooBig' });
      const r = []; if (a <= b) for (let i = a; i <= b; i++) r.push(i); else for (let i = a; i >= b; i--) r.push(i);
      return r;
    }
    case 'bin': return I.binop(e, ctx);
    case 'member': {
      const obj = await I.evalExpr(e.obj, ctx);
      const name = e.name.t === 'str' ? e.name.v : V.toStr(await I.evalExpr(e.name, ctx));
      if (e.isStatic) return GG.staticMember(obj, name, ctx);
      return I.getMember(obj, name, ctx);
    }
    case 'call': {
      const obj = await I.evalExpr(e.obj, ctx);
      const name = e.name.t === 'str' ? e.name.v : V.toStr(await I.evalExpr(e.name, ctx));
      const args = [];
      for (const a of e.args) args.push(await I.evalExpr(a, ctx));
      if (e.isStatic) return GG.staticCall(obj, name, args, ctx);
      return I.callMethod(obj, name, args, ctx);
    }
    case 'index': {
      const obj = await I.evalExpr(e.obj, ctx);
      const idx = await I.evalExpr(e.idx, ctx);
      return I.index(obj, idx, ctx);
    }
    default: throw new Error('Unbekannter Ausdruck ' + e.t);
  }
};
I.strExpand = function (v) {
  if (Array.isArray(v)) return v.map(I.strExpand).join(' ');
  return V.toStr(v);
};

I.index = function (obj, idx, ctx) {
  if (obj === null || obj === undefined) throw rtErr({ message: 'Indizierung in ein Array mit dem Wert NULL nicht möglich.', category: 'InvalidOperation', fqid: 'NullArray' });
  if (Array.isArray(idx)) return idx.map(i => I.index(obj, i, ctx)).filter(x => x !== undefined);
  if (obj instanceof PSHash) { const v = obj.get(V.toStr(idx)); return v === undefined ? null : v; }
  if (Array.isArray(obj)) { let i = V.toInt(idx); if (i < 0) i += obj.length; const v = obj[i]; return v === undefined ? null : v; }
  if (typeof obj === 'string') { let i = V.toInt(idx); if (i < 0) i += obj.length; return obj[i] === undefined ? null : obj[i]; }
  if (obj instanceof PSObject) {
    if (typeof idx === 'string') { const v = obj.get(idx); return v === undefined ? null : v; }
    if (V.toInt(idx) === 0 || V.toInt(idx) === -1) return obj;
    return null;
  }
  if (V.toInt(idx) === 0) return obj;
  return null;
};

I.binop = async function (e, ctx) {
  const op = e.op;
  if (op === 'and') return V.toBool(await I.evalExpr(e.l, ctx)) && V.toBool(await I.evalExpr(e.r, ctx));
  if (op === 'or') return V.toBool(await I.evalExpr(e.l, ctx)) || V.toBool(await I.evalExpr(e.r, ctx));
  const l = await I.evalExpr(e.l, ctx);
  const r = await I.evalExpr(e.r, ctx);
  switch (op) {
    case 'xor': return V.toBool(l) !== V.toBool(r);
    case '+': return V.add(l, r);
    case '-': return V.sub(l, r);
    case '*': return V.mul(l, r);
    case '/': return V.div(l, r);
    case '%': return V.mod(l, r);
    case 'f': return V.formatNet(V.toStr(l), r);
    case 'band': return V.toInt(l) & V.toInt(r);
    case 'bor': return V.toInt(l) | V.toInt(r);
    case 'bxor': return V.toInt(l) ^ V.toInt(r);
    case 'shl': return V.toInt(l) << V.toInt(r);
    case 'shr': return V.toInt(l) >> V.toInt(r);
  }
  let cs = false, o = op;
  if (/^c/.test(o) && !['contains'].includes(o)) { cs = true; o = o.slice(1); }
  else if (/^i/.test(o) && !['is', 'isnot', 'in'].includes(o)) o = o.slice(1);
  const scalarOp = (a) => {
    switch (o) {
      case 'eq': return V.eq(a, r, cs);
      case 'ne': return !V.eq(a, r, cs);
      case 'gt': return V.cmp(a, r, cs) > 0;
      case 'ge': return V.cmp(a, r, cs) >= 0;
      case 'lt': return V.cmp(a, r, cs) < 0;
      case 'le': return V.cmp(a, r, cs) <= 0;
      case 'like': return V.like(a, r, cs);
      case 'notlike': return !V.like(a, r, cs);
      case 'match': case 'notmatch': {
        const re = V.netRe(r, cs ? '' : 'i');
        const m = re.exec(V.toStr(a));
        if (o === 'match' && m && !Array.isArray(l)) {
          const h = new PSHash(); m.forEach((g, i) => { if (g !== undefined) h.set(i, g); });
          if (m.groups) for (const k of Object.keys(m.groups)) if (m.groups[k] !== undefined) h.set(k, m.groups[k]);
          ctx.scope.setLocal('Matches', h);
        }
        return o === 'match' ? !!m : !m;
      }
    }
    return null;
  };
  if (['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'like', 'notlike', 'match', 'notmatch'].includes(o)) {
    if (Array.isArray(l)) return l.filter(x => scalarOp(x));
    return scalarOp(l);
  }
  switch (o) {
    case 'contains': return V.toArr(l).some(x => V.eq(x, r, cs));
    case 'notcontains': return !V.toArr(l).some(x => V.eq(x, r, cs));
    case 'in': return V.toArr(r).some(x => V.eq(x, l, cs));
    case 'notin': return !V.toArr(r).some(x => V.eq(x, l, cs));
    case 'replace': {
      const ra = Array.isArray(r) ? r : [r, ''];
      const re = V.netRe(ra[0], cs ? 'g' : 'gi');
      const rep = V.toStr(ra[1]).replace(/\$\{(\w+)\}/g, '$<$1>');
      const f = x => V.toStr(x).replace(re, rep);
      return Array.isArray(l) ? l.map(f) : f(l);
    }
    case 'split': {
      const ra = Array.isArray(r) ? r : [r];
      const re = V.netRe(ra[0], cs ? 'g' : 'gi');
      const max = ra[1] !== undefined ? V.toInt(ra[1]) : 0;
      const f = x => {
        const s = V.toStr(x);
        if (!max) return s.split(re).filter(z => z !== undefined);
        const parts = []; let rest = s; let m;
        re.lastIndex = 0;
        while (parts.length < max - 1 && (m = new RegExp(re.source, re.flags.replace('g', '')).exec(rest))) { parts.push(rest.slice(0, m.index)); rest = rest.slice(m.index + m[0].length); }
        parts.push(rest); return parts;
      };
      return Array.isArray(l) ? l.flatMap(f) : f(l);
    }
    case 'join': return V.toArr(l).map(V.toStr).join(V.toStr(r));
    case 'is': case 'isnot': {
      const tn = r && r.typeObj ? r.fullName : V.resolveType(V.toStr(r)) || V.toStr(r);
      const res = GG.isType(l, tn);
      return o === 'is' ? res : !res;
    }
    case 'as': {
      const tn = r && r.typeObj ? r.fullName : V.resolveType(V.toStr(r));
      try { return V.cast(tn, l); } catch (err) { return null; }
    }
  }
  throw rtErr({ message: `Unbekannter Operator -${op}.`, fqid: 'UnknownOperator' });
};

/* ---------- Pipeline ---------- */
I.runPipeline = async function (p, ctx, toHost, stmt) {
  let input = null;
  const n = p.els.length;
  for (let k = 0; k < n; k++) {
    const el = p.els[k];
    let output;
    const errRed = el.redirs && el.redirs.find(r => r.stream === '2' || r.stream === '*');
    let sink = null;
    let ectx = ctx;
    if (errRed) { sink = []; ectx = Object.assign({}, ctx, { errSink: sink }); }
    const isLast = k === n - 1;
    if (el.t === 'expr') {
      const v = await I.evalExpr(el.expr, Object.assign({}, ectx, { discardIncr: n === 1 && stmt && el.expr.t === 'incr' }));
      output = v === undefined ? [] : (Array.isArray(v) ? v.slice() : [v]);
    } else {
      output = await I.invokeCommand(el, input, ectx, { pos: k + 1, isLast, stream: !!(isLast && !el.redirs.length && toHost) });
    }
    if (el.redirs && el.redirs.length) output = await I.applyRedirs(el.redirs, output, sink || [], ctx);
    input = output;
  }
  return input || [];
};

I.applyRedirs = async function (redirs, output, errs, ctx) {
  for (const r of redirs) {
    if (r.stream === '2' || r.stream === '*') {
      if (r.merge) { output = output.concat(errs); }
      else {
        const tgt = r.target.t === 'var' && r.target.name.toLowerCase() === 'null' ? null : V.toStr(await I.evalExpr(r.target, ctx));
        if (tgt !== null) await GG.fsx.writeText(ctx, tgt, errs.map(x => GG.fmt.errorText(x).join('\n').replace(/\u0001/g, '')).join('\n') + (errs.length ? '\n' : ''), r.append, 'Unicode');
      }
      if (r.stream === '*' && !r.merge) {
        const tgt = r.target.t === 'var' && r.target.name.toLowerCase() === 'null' ? null : V.toStr(await I.evalExpr(r.target, ctx));
        if (tgt !== null) await GG.fsx.writeText(ctx, tgt, GG.fmt.toText(output, ctx, 120), true, 'Unicode');
        output = [];
      }
    }
  }
  for (const r of redirs) {
    if (r.stream === '1' && !r.merge) {
      const isNull = r.target.t === 'var' && r.target.name.toLowerCase() === 'null';
      if (!isNull) {
        const tgt = V.toStr(await I.evalExpr(r.target, ctx));
        await GG.fsx.writeText(ctx, tgt, GG.fmt.toText(output, ctx, 120), r.append, 'Unicode');
      }
      output = [];
    }
  }
  return output;
};

/* ---------- Befehle auflösen ---------- */
I.resolveCommand = function (name, ctx, noAlias) {
  const k = name.toLowerCase();
  if (!noAlias) {
    let a = null;
    for (let s = ctx.scope; s; s = s.parent) if (s.aliases.has(k)) { a = s.aliases.get(k); break; }
    if (!a && GG.aliases[k] && !(ctx.world.removedAliases && ctx.world.removedAliases.has(k))) a = GG.aliases[k];
    if (a) { const r = I.resolveCommand(a, ctx, true); if (r) { r.alias = name; return r; } }
  }
  const f = ctx.scope.findFn(name);
  if (f) return { kind: 'function', name: f.name, fn: f };
  if (GG.builtinFns && GG.builtinFns[k]) return { kind: 'function', name: GG.builtinFns[k].name, fn: GG.builtinFns[k], builtin: true };
  const spec = GG.cmdlets[k];
  if (spec && GG.cmdletAvailable(spec, ctx)) return { kind: 'cmdlet', name: spec.name, spec };
  const nk = k.replace(/\.exe$/, '');
  if (GG.natives[nk] && GG.nativeAvailable(nk, ctx)) return { kind: 'native', name: nk, fn: GG.natives[nk] };
  // Pfad?
  if (/[\\/]/.test(name) || /^[a-z]:/i.test(name)) {
    const res = GG.fsx.resolveFile(ctx, name);
    if (res && res.node && !res.node.dir) {
      if (/\.ps1$/i.test(res.node.name)) return { kind: 'script', name: res.path, path: res.path, node: res.node };
      const base = res.node.name.toLowerCase().replace(/\.exe$/, '');
      if (GG.natives[base]) return { kind: 'native', name: base, fn: GG.natives[base] };
      return { kind: 'exe', name: res.path, path: res.path, node: res.node };
    }
  }
  return null;
};

I.notFound = function (name, node, ctx) {
  let msg = `Die Benennung "${name}" wurde nicht als Name eines Cmdlet, einer Funktion, einer Skriptdatei oder eines ausführbaren Programms erkannt. Überprüfen Sie die Schreibweise des Namens, oder ob der Pfad korrekt ist (sofern enthalten), und wiederholen Sie den Vorgang.`;
  const r = rec({ message: msg, category: 'ObjectNotFound', exception: 'System.Management.Automation.CommandNotFoundException', fqid: 'CommandNotFoundException', target: name, cmd: name, pos: posOf(node), reason: 'CommandNotFoundException' });
  r.catActivity = '';
  // Hinweis bei Skript im aktuellen Ordner
  const here = GG.fsx.resolveFile(ctx, '.\\' + name);
  if (here && here.node && !here.node.dir && !/[\\/]/.test(name)) {
    r.suggestion = `Der Befehl "${name}" wurde nicht gefunden, ist jedoch am aktuellen Speicherort vorhanden. Windows PowerShell lädt standardmäßig keine Befehle aus dem aktuellen Speicherort. Wenn Sie diesem Befehl vertrauen, geben Sie stattdessen ".\\${name}" ein. Weitere Informationen finden Sie unter "get-help about_Command_Precedence".`;
  }
  return new PSRuntimeError(r);
};

/* ---------- Befehl ausführen ---------- */
I.invokeCommand = async function (node, input, ctx, info) {
  let name, sbTarget = null;
  if (node.invoke) {
    const v = node.name.t === 'str' ? node.name.v : await I.evalExpr(node.name, ctx);
    if (v instanceof ScriptBlock) sbTarget = v;
    else if (v instanceof PSObject && v.typeNames.includes('System.Management.Automation.CommandInfo')) name = v.get('Name');
    else name = V.toStr(v);
  } else name = node.name.v;

  // Argumente auswerten
  const args = [];
  for (const a of node.args) {
    if (a.t === 'endparams') { args.push({ t: 'end' }); continue; }
    if (a.t === 'param') {
      const v = a.value ? await I.evalArg(a.value, ctx) : undefined;
      args.push({ t: 'param', name: a.name, value: v, has: !!a.value, colon: a.colon, node: a });
    } else args.push({ t: 'arg', value: await I.evalArg(a.value, ctx), node: a, raw: a.value });
  }

  if (sbTarget) {
    const out = await I.invokeSB(sbTarget, ctx, { args: args.map(a => a.t === 'arg' ? a.value : '-' + a.name), input, dot: node.invoke === '.' });
    I.logCmd(ctx, { name: '&{}', params: {}, ok: true });
    return out;
  }
  const cmd = I.resolveCommand(name, ctx);
  if (!cmd) throw I.notFound(name, node, ctx);
  const cctx = Object.assign({}, ctx, { cmdNode: node, cmdName: cmd.name, pipePos: info.pos, stream: info.stream });
  if ((cmd.kind === 'cmdlet' || cmd.kind === 'function') && args.some(a => a.t !== 'arg' && a.name === '?') && GG.cmdlets['get-help']) return I.invokeCmdlet(GG.cmdlets['get-help'], [{ t: 'arg', value: cmd.name }], null, cctx, null);
  if (cmd.kind === 'cmdlet') return I.invokeCmdlet(cmd.spec, args, input, cctx, cmd.alias);
  if (cmd.kind === 'function') return I.invokeFunction(cmd.fn, args, input, cctx, { dot: node.invoke === '.' });
  if (cmd.kind === 'script') return I.invokeScript(cmd, args, input, cctx, node.invoke === '.');
  if (cmd.kind === 'native') return I.invokeNative(cmd, args, input, cctx);
  if (cmd.kind === 'exe') {
    I.logCmd(cctx, { name: cmd.name, params: {}, ok: true, native: true });
    return [];
  }
  return [];
};
I.evalArg = async function (n, ctx) {
  if (n.t === 'str') return n.v;
  if (n.t === 'num') return n.v;
  return I.evalExpr(n, ctx);
};

I.logCmd = function (ctx, ent) {
  const e = ctx.entry; if (!e) return;
  ent.remote = ctx.session.remoteOrigin ? ctx.world.hostname : null;
  ent.elevated = ctx.session.elevated;
  ent.depth = ctx.depth;
  e.cmds.push(ent);
};

/* ---------- Native Programme ---------- */
I.invokeNative = async function (cmd, args, input, ctx) {
  const sargs = [];
  for (const a of args) {
    if (a.t === 'end') continue;
    if (a.t === 'param') { sargs.push('-' + a.name + (a.has ? ':' + V.toStr(a.value) : '')); }
    else { for (const x of V.toArr(a.value)) sargs.push(V.toStr(x)); }
  }
  const logEnt = { name: cmd.name, params: {}, args: sargs, ok: true, native: true };
  I.logCmd(ctx, logEnt);
  const c = I.mkCmdCtx(ctx, { name: cmd.name, params: [] }, {}, logEnt);
  const res = await cmd.fn(c, sargs, input);
  const code = res && res.code !== undefined ? res.code : 0;
  ctx.session.lastExit = code;
  ctx.session.lastOk = code === 0;
  logEnt.ok = code === 0 && logEnt.ok;
  let lines = res && res.lines ? res.lines : (Array.isArray(res) ? res : []);
  if (res && res.err) { for (const l of res.err) ctx.host.write(l, { color: 'red' }); }
  return lines;
};

/* ---------- Gemeinsame Parameter ---------- */
const COMMON = [
  { name: 'Verbose', type: 'switch', aliases: ['vb'] }, { name: 'Debug', type: 'switch', aliases: ['db'] },
  { name: 'ErrorAction', type: 'enum', values: ['SilentlyContinue', 'Stop', 'Continue', 'Inquire', 'Ignore', 'Suspend'], enumType: 'System.Management.Automation.ActionPreference', aliases: ['ea'] },
  { name: 'WarningAction', type: 'enum', values: ['SilentlyContinue', 'Stop', 'Continue', 'Inquire', 'Ignore', 'Suspend'], enumType: 'System.Management.Automation.ActionPreference', aliases: ['wa'] },
  { name: 'InformationAction', type: 'enum', values: ['SilentlyContinue', 'Stop', 'Continue', 'Inquire', 'Ignore', 'Suspend'], enumType: 'System.Management.Automation.ActionPreference', aliases: ['infa'] },
  { name: 'ErrorVariable', type: 'string', aliases: ['ev'] }, { name: 'WarningVariable', type: 'string', aliases: ['wv'] },
  { name: 'InformationVariable', type: 'string', aliases: ['iv'] }, { name: 'OutVariable', type: 'string', aliases: ['ov'] },
  { name: 'OutBuffer', type: 'int', aliases: ['ob'] }, { name: 'PipelineVariable', type: 'string', aliases: ['pv'] }
];
const SHOULD = [{ name: 'WhatIf', type: 'switch', aliases: ['wi'] }, { name: 'Confirm', type: 'switch', aliases: ['cf'] }];
GG.COMMON = COMMON; GG.SHOULD = SHOULD;
I.allParams = function (spec) {
  if (spec._all) return spec._all;
  const ps = (spec.params || []).map(p => Object.assign({}, p));
  let all = ps.concat(spec.noCommon ? [] : COMMON);
  if (spec.sp) all = all.concat(SHOULD);
  spec._all = all;
  return all;
};

function bindErr(ctx, cmdName, msg, fqid, exc, node) {
  return new PSRuntimeError(rec({ message: msg, category: 'InvalidArgument', exception: exc || 'System.Management.Automation.ParameterBindingException', fqid: fqid + ',' + GG.cmdClassName(cmdName), cmd: cmdName, pos: posOf(node || ctx.cmdNode), target: '', reason: 'ParameterBindingException' }));
}
GG.bindErr = bindErr;

I.matchParam = function (all, name, ctx, cmdName, node) {
  const k = name.toLowerCase();
  let exact = all.find(p => p.name.toLowerCase() === k || (p.aliases || []).some(a => a.toLowerCase() === k));
  if (exact) return exact;
  const pre = all.filter(p => p.name.toLowerCase().startsWith(k));
  if (pre.length === 1) return pre[0];
  if (pre.length > 1) {
    throw bindErr(ctx, cmdName, `Der Parameter kann nicht verarbeitet werden, da der Parametername "${name}" mehrdeutig ist. Mögliche Übereinstimmungen: ${pre.map(p => '-' + p.name).join(' ')}.`, 'AmbiguousParameter', null, node);
  }
  throw bindErr(ctx, cmdName, `Es wurde kein Parameter gefunden, der dem Parameternamen "${name}" entspricht.`, 'NamedParameterNotFound', null, node);
};

I.typeLabel = function (p) {
  const t = p.type || 'object';
  const map = { 'string': 'System.String', 'string[]': 'System.String[]', 'int': 'System.Int32', 'long': 'System.Int64', 'double': 'System.Double', 'bool': 'System.Boolean', 'sb': 'System.Management.Automation.ScriptBlock', 'object': 'System.Object', 'object[]': 'System.Object[]', 'hash': 'System.Collections.Hashtable', 'secure': 'System.Security.SecureString', 'date': 'System.DateTime', 'cred': 'System.Management.Automation.PSCredential', 'timespan': 'System.TimeSpan', 'int[]': 'System.Int32[]', 'enum': p.enumType || 'System.String', 'enum[]': (p.enumType || 'System.String') + '[]' };
  return map[t] || 'System.Object';
};

I.convertParam = function (p, v, ctx, cmdName, node) {
  const t = p.type || 'object';
  const fail = (why) => bindErr(ctx, cmdName, `Der Parameter "${p.name}" kann nicht gebunden werden. ${why}`, 'CannotConvertArgumentNoMessage', 'System.Management.Automation.ParameterBindingException', node);
  if (v === undefined) v = null;
  switch (t) {
    case 'switch': return V.toBool(v);
    case 'string':
      if (v === null) return null;
      if (Array.isArray(v)) { if (v.length === 1) return V.toStr(v[0]); throw fail(`Das "System.Object[]"-Objekt kann nicht in den Typ "System.String" konvertiert werden, der für den Parameter "${p.name}" erforderlich ist. Die angegebene Methode wird nicht unterstützt.`); }
      if (v instanceof ScriptBlock && !p.sbOk) return v.text;
      return V.toStr(v);
    case 'string[]': return v === null ? null : V.toArr(v).map(V.toStr);
    case 'int': case 'long': case 'double': {
      const conv = x => { try { return t === 'double' ? V.toNum(x, 'System.Double') : V.toInt(x); } catch (e) { throw fail(`Der Wert "${V.toStr(x)}" kann nicht in den Typ "${t === 'double' ? 'System.Double' : t === 'long' ? 'System.Int64' : 'System.Int32'}" konvertiert werden. Fehler: "Die Eingabezeichenfolge hat das falsche Format."`); } };
      if (Array.isArray(v)) { if (v.length === 1) return conv(v[0]); throw fail(`Das "System.Object[]"-Objekt kann nicht in den Typ "System.Int32" konvertiert werden.`); }
      const n = conv(v);
      if (p.range && (n < p.range[0] || n > p.range[1])) throw bindErr(ctx, cmdName, `Das Argument für den Parameter "${p.name}" kann nicht überprüft werden. Das Argument "${n}" ist kleiner als der zulässige Mindestbereich von "${p.range[0]}" oder größer als der zulässige Höchstbereich von "${p.range[1]}". Geben Sie ein Argument an, das größer oder gleich "${p.range[0]}" und kleiner oder gleich "${p.range[1]}" ist, und führen Sie den Befehl erneut aus.`, 'ParameterArgumentValidationError', null, node);
      return n;
    }
    case 'int[]': return V.toArr(v).map(x => { try { return V.toInt(x); } catch (e) { throw fail(`Der Wert "${V.toStr(x)}" kann nicht in den Typ "System.Int32" konvertiert werden.`); } });
    case 'bool': return V.toBool(v);
    case 'sb':
      if (v instanceof ScriptBlock) return v;
      throw fail(`Das "${V.typeOf(v) || 'null'}"-Objekt kann nicht in den Typ "System.Management.Automation.ScriptBlock" konvertiert werden, der für den Parameter "${p.name}" erforderlich ist.`);
    case 'hash': case 'hash[]':
      if (v instanceof PSHash || (Array.isArray(v) && v.every(x => x instanceof PSHash))) return t === 'hash[]' ? V.toArr(v) : v;
      throw fail(`Das "${V.toStr(v)}"-Objekt vom Typ "${V.typeOf(v)}" kann nicht in den Typ "System.Collections.Hashtable" konvertiert werden.`);
    case 'secure':
      if (v instanceof SecureString) return v;
      throw fail(`Der Wert "${V.toStr(v)}" vom Typ "${V.typeOf(v)}" kann nicht in den Typ "System.Security.SecureString" konvertiert werden.`);
    case 'date':
      if (v instanceof PSDate) return v;
      { const d = V.parseDate(V.toStr(v)); if (!d) throw fail(`Der Wert "${V.toStr(v)}" kann nicht in den Typ "System.DateTime" konvertiert werden. Fehler: "Die Zeichenfolge wurde nicht als gültiges DateTime erkannt."`); return d; }
    case 'timespan':
      try { return V.cast('System.TimeSpan', v); } catch (e) { throw fail(`Der Wert "${V.toStr(v)}" kann nicht in den Typ "System.TimeSpan" konvertiert werden.`); }
    case 'enum': case 'enum[]': {
      const one = x => {
        if (typeof x === 'number' && p.numValues) { const f = p.values[p.numValues.indexOf(x)]; if (f) return f; }
        const s = V.toStr(x); const f = p.values.find(e => e.toLowerCase() === s.toLowerCase());
        if (f) return f;
        if (p.validateSet) throw bindErr(ctx, cmdName, `Das Argument für den Parameter "${p.name}" kann nicht überprüft werden. Das Argument "${s}" gehört nicht zu dem vom ValidateSet-Attribut angegebenen Satz "${p.values.join(';')}". Geben Sie ein Argument an, das in diesem Satz enthalten ist, und führen Sie dann den Befehl erneut aus.`, 'ParameterArgumentValidationError', null, node);
        throw fail(`Der Wert "${s}" kann nicht in den Typ "${p.enumType || 'System.String'}" konvertiert werden. Fehler: "Der Bezeichnername "${s}" kann nicht mit einem gültigen Enumeratornamen abgeglichen werden. Geben Sie einen der folgenden Enumeratornamen an, und wiederholen Sie den Vorgang: ${p.values.join(', ')}"`);
      };
      if (t === 'enum[]') return V.toArr(v).map(one);
      if (Array.isArray(v)) { if (v.length === 1) return one(v[0]); return v.map(one); }
      return one(v);
    }
    case 'cred': return v;
    case 'object[]': return v === null ? null : V.toArr(v);
    default: return v;
  }
};

/* Parameter binden (benannt + positional) */
I.bindArgs = async function (spec, args, ctx, cmdName) {
  const all = I.allParams(spec);
  const bound = {}; const boundBy = {};
  const positional = [];
  let endParams = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.t === 'end') { endParams = true; continue; }
    if (a.t === 'param' && !endParams) {
      const p = I.matchParam(all, a.name, ctx, cmdName, a.node);
      if (p.name in bound) throw bindErr(ctx, cmdName, `Der Parameter kann nicht gebunden werden, da der Parameter "${p.name}" mehrmals angegeben wurde. Verwenden Sie zum Bereitstellen mehrerer Werte für Parameter, die mehrere Werte akzeptieren können, die Arraysyntax. Beispiel: "-parameter Wert1,Wert2,Wert3".`, 'ParameterAlreadyBound', null, a.node);
      let val;
      if (p.type === 'switch') val = a.has ? V.toBool(a.value) : true;
      else if (a.has) val = a.value;
      else {
        const nx = args[i + 1];
        if (!nx || nx.t !== 'arg') throw bindErr(ctx, cmdName, `Fehlendes Argument für den Parameter "${p.name}". Geben Sie einen Parameter vom Typ "${I.typeLabel(p)}" an, und versuchen Sie es erneut.`, 'MissingArgument', null, a.node);
        val = nx.value; i++;
      }
      bound[p.name] = val; boundBy[p.name] = 'name';
    } else positional.push(a);
  }
  let posParams = all.filter(p => p.pos !== undefined && !(p.name in bound)).sort((x, y) => x.pos - y.pos);
  if (spec.posOrder) { const ord = spec.posOrder(positional.length, bound); if (ord) posParams = ord.filter(n => !(n in bound)).map(n => all.find(p => p.name === n)); }
  const rest = all.find(p => p.rest && !(p.name in bound));
  for (const a of positional) {
    const p = posParams.shift();
    if (!p) {
      if (rest) { bound[rest.name] = V.toArr(bound[rest.name]).concat(V.toArr(a.value)); boundBy[rest.name] = 'pos'; continue; }
      throw bindErr(ctx, cmdName, `Es wurde kein Positionsparameter gefunden, der das Argument "${V.toStr(a.value)}" akzeptiert.`, 'PositionalParameterNotFound', null, a.node);
    }
    bound[p.name] = a.value; boundBy[p.name] = 'pos';
  }
  return { bound, boundBy };
};

I.finalizeParams = function (spec, bound, ctx, cmdName) {
  const all = I.allParams(spec);
  const out = {};
  for (const name of Object.keys(bound)) {
    const p = all.find(x => x.name === name);
    let v = bound[name];
    if (v instanceof ScriptBlock && p.type !== 'sb' && p.delayBind && ctx._item !== undefined) continue; // per Element
    out[name] = I.convertParam(p, v, ctx, cmdName);
  }
  return out;
};

/* Cmdlet-Kontext */
I.mkCmdCtx = function (ctx, spec, p, logEnt) {
  const c = {
    ctx, spec, p, world: ctx.world, session: ctx.session, host: ctx.host, scope: ctx.scope,
    name: spec.name, outArr: [], log: logEnt, errCount: 0,
    out(x) { if (x !== undefined) this.outArr.push(x); },
    outAll(arr) { for (const x of arr) this.outArr.push(x); },
    error(msg, o) {
      o = o || {};
      const r = rec(Object.assign({ message: msg, cmd: spec.name, pos: posOf(ctx.cmdNode), fqid: (o.fqid || 'Error') + ',' + GG.cmdClassName(spec.name) }, o, { fqid: (o.fqid || 'Error') + (o.noClass ? '' : ',' + GG.cmdClassName(spec.name)) }));
      this.errCount++;
      if (logEnt) logEnt.ok = false;
      I.writeError(r, ctx, this.p && this.p.ErrorAction);
    },
    fail(msg, o) {
      o = o || {};
      const r = rec(Object.assign({ message: msg, cmd: spec.name, pos: posOf(ctx.cmdNode) }, o, { fqid: (o.fqid || 'Error') + (o.noClass ? '' : ',' + GG.cmdClassName(spec.name)) }));
      if (logEnt) logEnt.ok = false;
      throw new PSRuntimeError(r);
    },
    warn(msg) { const wa = (this.p && this.p.WarningAction || '').toLowerCase(); if (wa === 'silentlycontinue' || wa === 'ignore') return; ctx.host.write('WARNUNG: ' + msg, { color: 'yellow' }); },
    verbose(msg) { if (this.p && this.p.Verbose) ctx.host.write('AUSFÜHRLICH: ' + msg, { color: 'yellow' }); },
    async should(target, action, opts) {
      if (this.p && this.p.WhatIf) { ctx.host.write(`WhatIf: Ausführen des Vorgangs "${action}" für das Ziel "${target}".`); return false; }
      const highImpact = opts && opts.high;
      const confirm = this.p && ('Confirm' in this.p) ? this.p.Confirm : highImpact;
      if (confirm) {
        if (this._yesAll) return true;
        if (this._noAll) return false;
        const ans = await ctx.host.choice('Bestätigung', `Möchten Sie diese Aktion wirklich ausführen?\nAusführen des Vorgangs "${action}" für das Ziel "${target}".`, GG.CHOICE_YANKH, 0);
        if (ans === 'H') throw new StopSignal();
        if (ans === 'A') { this._yesAll = true; return true; }
        if (ans === 'K') { this._noAll = true; return false; }
        return ans === 'J';
      }
      return true;
    },
    requireAdmin() { return ctx.session.elevated; },
    bound(name) { return this.p && name in this.p; }
  };
  return c;
};
GG.CHOICE_YANKH = [
  { key: 'J', label: 'Ja', help: 'Mit dem nächsten Schritt des Vorgangs fortfahren.' },
  { key: 'A', label: 'Ja, alle', help: 'Mit allen Schritten des Vorgangs fortfahren.' },
  { key: 'N', label: 'Nein', help: 'Vorgang überspringen und mit dem nächsten Schritt fortfahren.' },
  { key: 'K', label: 'Nein, keine', help: 'Alle Schritte dieses Vorgangs überspringen.' },
  { key: 'H', label: 'Anhalten', help: 'Beendet die Pipeline.' }
];

GG.cmdClassName = function (name) {
  const spec = GG.cmdlets[String(name).toLowerCase()];
  if (spec && spec.cls) return spec.cls;
  const n = String(name).replace(/-/g, '');
  const mod = spec ? spec.module : 'Microsoft.PowerShell.Commands';
  if (spec && /^Microsoft\.PowerShell\.(Management|Utility|Security)$/.test(spec.module)) return 'Microsoft.PowerShell.Commands.' + n + 'Command';
  if (spec && spec.module === 'ActiveDirectory') return 'Microsoft.ActiveDirectory.Management.Commands.' + n;
  if (spec && spec.module === 'Microsoft.PowerShell.LocalAccounts') return 'Microsoft.PowerShell.Commands.' + n + 'Command';
  return (mod && /\./.test(mod) ? mod : 'Microsoft.PowerShell.Commands') + '.' + n + 'Command';
};

/* Cmdlet ausführen */
I.invokeCmdlet = async function (spec, args, input, ctx, alias) {
  // Modul automatisch laden
  if (spec.module) ctx.session.modulesLoaded.add(spec.module.toLowerCase());
  const logEnt = { name: spec.name, alias: alias || null, params: {}, args: [], ok: true, line: ctx.cmdNode && ctx.cmdNode.src ? ctx.cmdNode.src.text.slice(ctx.cmdNode.s, ctx.cmdNode.e) : '' };
  I.logCmd(ctx, logEnt);
  let bound, boundBy;
  try {
    ({ bound, boundBy } = await I.bindArgs(spec, args, ctx, spec.name));
  } catch (e) { logEnt.ok = false; throw e; }
  logEnt.params = Object.assign({}, bound);
  // Mandatory prüfen (nur ohne Pipeline-Bindung)
  const all = I.allParams(spec);
  const hasInput = input !== null && input !== undefined;
  const mode = spec.input || 'none';
  let p;
  try { p = I.finalizeParams(spec, bound, ctx, spec.name); } catch (e) { logEnt.ok = false; throw e; }
  // Parametersätze/obligatorische Parameter
  const missing = [];
  for (const q of all) {
    if (!q.mandatory || q.name in p) continue;
    if (hasInput && (q.pipe || mode === 'collect')) continue;
    if (q.mandatoryIf && !q.mandatoryIf(p)) continue;
    if (q.altOf && q.altOf.some(n => n in p)) continue;
    missing.push(q);
  }
  if (missing.length) {
    if (ctx.host.interactive && !ctx.session.remoteOrigin) {
      ctx.host.write(`Cmdlet ${spec.name} an der Befehlspipelineposition ${ctx.pipePos || 1}\nGeben Sie Werte für die folgenden Parameter an:`);
      for (const q of missing) {
        if (q.type === 'string[]' || q.type === 'object[]') {
          const vals = [];
          for (let k = 0; ; k++) { const s = await ctx.host.readLine(`${q.name}[${k}]: `); if (s === null) throw new StopSignal(); if (s === '') break; vals.push(s); }
          if (!vals.length) { logEnt.ok = false; throw bindErr(ctx, spec.name, `Das Argument für den Parameter "${q.name}" kann nicht gebunden werden, da es sich um ein leeres Array handelt.`, 'ParameterArgumentValidationErrorEmptyArrayNotAllowed'); }
          p[q.name] = vals;
        } else if (q.type === 'secure') {
          const s = await ctx.host.readLine(`${q.name}: `, { secure: true }); if (s === null) throw new StopSignal();
          p[q.name] = new SecureString(s);
        } else {
          const s = await ctx.host.readLine(`${q.name}: `); if (s === null) throw new StopSignal();
          if (s === '') { logEnt.ok = false; throw bindErr(ctx, spec.name, `Das Argument für den Parameter "${q.name}" kann nicht gebunden werden, da es sich um eine leere Zeichenfolge handelt.`, 'ParameterArgumentValidationErrorEmptyStringNotAllowed'); }
          p[q.name] = I.convertParam(q, s, ctx, spec.name);
        }
        logEnt.params[q.name] = p[q.name];
      }
    } else {
      logEnt.ok = false;
      throw bindErr(ctx, spec.name, `Der Befehl kann nicht verarbeitet werden, da einer oder mehrere obligatorische Parameter fehlen: ${missing.map(q => q.name).join(' ')}.`, 'MissingMandatoryParameter');
    }
  }
  if (spec.validate) { try { spec.validate(p, ctx); } catch (e) { logEnt.ok = false; throw e; } }
  // Admin?
  const c = I.mkCmdCtx(ctx, spec, p, logEnt);
  try {
    if (mode === 'collect') {
      await spec.run(c, p, hasInput ? input : null);
    } else if (mode === 'each' && hasInput) {
      if (spec.begin) await spec.begin(c, p);
      for (const item of input) {
        const ip = Object.assign({}, p);
        // verzögert gebundene Skriptblöcke
        for (const q of all) {
          if (bound[q.name] instanceof ScriptBlock && q.type !== 'sb' && q.delayBind) {
            const v = V.unwrap(await I.invokeSB(bound[q.name], ctx, { dollar: item }));
            ip[q.name] = I.convertParam(q, v, ctx, spec.name);
          }
        }
        let used = false;
        // ByValue mit Typ
        for (const q of all) {
          if (q.name in p || !q.pipe) continue;
          if (q.pipe === 'value' || q.pipe === 'both') {
            if (q.pipeType) {
              if (item instanceof PSObject && item.typeNames.some(t => q.pipeType.some(pt => t.replace(/^Deserialized\./, '') === pt))) { ip[q.name] = item; used = true; break; }
            }
          }
        }
        if (!used) for (const q of all) {
          if (q.name in p || !q.pipe || (q.pipe !== 'prop' && q.pipe !== 'both')) continue;
          if (item instanceof PSObject || item instanceof PSHash) {
            const names = [q.name].concat(q.aliases || []);
            for (const nm of names) {
              const v = item instanceof PSHash ? item.get(nm) : (item.has(nm) ? item.get(nm) : undefined);
              if (v !== undefined && v !== null) { ip[q.name] = I.convertParam(q, v, ctx, spec.name); used = true; break; }
            }
          }
        }
        if (!used) for (const q of all) {
          if (q.name in p || !q.pipe || (q.pipe !== 'value' && q.pipe !== 'both') || q.pipeType) continue;
          if (q.type === 'string' || q.type === 'string[]') {
            if (typeof item === 'string' || typeof item === 'number' || (item instanceof PSObject && !q.strictType)) { ip[q.name] = I.convertParam(q, V.toStr(item), ctx, spec.name); used = true; break; }
          } else { ip[q.name] = item; used = true; break; }
        }
        if (!used) {
          c.error('Das Eingabeobjekt kann an keine Parameter des Befehls gebunden werden, da der Befehl keine Pipelineeingaben akzeptiert oder die Eingabe und deren Eigenschaften mit keinem der Parameter übereinstimmen, die Pipelineeingaben akzeptieren.', { category: 'InvalidArgument', fqid: 'InputObjectNotBound', exception: 'System.Management.Automation.ParameterBindingException', target: V.toStr(item), reason: 'ParameterBindingException' });
          continue;
        }
        if (!logEnt.pipeParams) logEnt.pipeParams = [];
        logEnt.pipeParams.push(ip);
        c.p = ip;
        await spec.run(c, ip, item);
      }
      c.p = p;
      if (spec.end) await spec.end(c, p);
    } else {
      if (hasInput && mode === 'none' && input.length) {
        c.error('Das Eingabeobjekt kann an keine Parameter des Befehls gebunden werden, da der Befehl keine Pipelineeingaben akzeptiert oder die Eingabe und deren Eigenschaften mit keinem der Parameter übereinstimmen, die Pipelineeingaben akzeptieren.', { category: 'InvalidArgument', fqid: 'InputObjectNotBound', exception: 'System.Management.Automation.ParameterBindingException', target: V.toStr(input[0]), reason: 'ParameterBindingException' });
      }
      if (spec.begin) await spec.begin(c, p);
      await spec.run(c, p, undefined);
      if (spec.end) await spec.end(c, p);
    }
  } catch (e) {
    if (e instanceof PSRuntimeError) logEnt.ok = false;
    if (e instanceof PSRuntimeError && p.ErrorVariable) ctx.scope.setLocal(p.ErrorVariable, [e.rec]);
    throw e;
  }
  if (p.OutVariable) ctx.scope.setLocal(p.OutVariable, c.outArr.slice());
  logEnt.outCount = c.outArr.length;
  if (c.errCount === 0) ctx.session.lastOk = true;
  return c.outArr;
};

/* ---------- Funktionen / Skripte / Skriptblöcke ---------- */
I.bindFunctionParams = async function (def, args, ctx, fnScope, name, hasInput) {
  const params = def.params || [];
  const named = {}; const pos = []; const extra = [];
  const all = params.map(q => ({ name: q.name, aliases: q.aliases || [], q }));
  const isAdv = def.cmdletBinding || params.some(q => q.mandatory || q.position !== null || q.pipe || q.pipeProp);
  const allWithCommon = isAdv ? all.concat(COMMON.map(c => ({ name: c.name, aliases: c.aliases, common: true }))) : all;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.t === 'param') {
      const k = a.name.toLowerCase();
      let m = allWithCommon.find(p => p.name.toLowerCase() === k || p.aliases.some(x => x.toLowerCase() === k));
      if (!m) { const pre = allWithCommon.filter(p => p.name.toLowerCase().startsWith(k)); if (pre.length === 1) m = pre[0]; else if (pre.length > 1) throw bindErr(ctx, name, `Der Parameter kann nicht verarbeitet werden, da der Parametername "${a.name}" mehrdeutig ist. Mögliche Übereinstimmungen: ${pre.map(p => '-' + p.name).join(' ')}.`, 'AmbiguousParameter', null, a.node); }
      if (!m) {
        if (isAdv) throw bindErr(ctx, name, `Es wurde kein Parameter gefunden, der dem Parameternamen "${a.name}" entspricht.`, 'NamedParameterNotFound', null, a.node);
        extra.push('-' + a.name + (a.has ? ':' + V.toStr(a.value) : '')); continue;
      }
      if (m.common) { named['__' + m.name] = a.has ? a.value : (m.name === 'Verbose' || m.name === 'Debug' ? true : (args[++i] || {}).value); continue; }
      const isSwitch = m.q.type && /^switch$/i.test(m.q.type);
      if (isSwitch) named[m.name] = a.has ? V.toBool(a.value) : true;
      else if (a.has) named[m.name] = a.value;
      else {
        const nx = args[i + 1];
        if (!nx || nx.t !== 'arg') throw bindErr(ctx, name, `Fehlendes Argument für den Parameter "${m.name}". Geben Sie einen Parameter vom Typ "${m.q.type ? (V.resolveType(m.q.type) || m.q.type) : 'System.Object'}" an, und versuchen Sie es erneut.`, 'MissingArgument', null, a.node);
        named[m.name] = nx.value; i++;
      }
    } else if (a.t === 'arg') pos.push(a.value);
  }
  // Positional
  const free = params.filter(q => !(q.name in named) && !(q.type && /^switch$/i.test(q.type)));
  const ordered = free.some(q => q.position !== null) ? free.filter(q => q.position !== null).sort((a, b) => a.position - b.position) : free;
  for (const v of pos) {
    const q = ordered.shift();
    if (q) named[q.name] = v;
    else if (isAdv) throw bindErr(ctx, name, `Es wurde kein Positionsparameter gefunden, der das Argument "${V.toStr(v)}" akzeptiert.`, 'PositionalParameterNotFound');
    else extra.push(v);
  }
  // Werte setzen
  for (const q of params) {
    let v;
    if (q.name in named) v = named[q.name];
    else if (q.mandatory && !(hasInput && (q.pipe || q.pipeProp))) {
      if (ctx.host.interactive && !ctx.session.remoteOrigin) {
        ctx.host.write(`Cmdlet ${name} an der Befehlspipelineposition ${ctx.pipePos || 1}\nGeben Sie Werte für die folgenden Parameter an:`);
        if (q.help) ctx.host.write('(Geben Sie !? ein, um Hilfe zu erhalten.)');
        const s = await ctx.host.readLine(`${q.name}: `);
        if (s === null) throw new StopSignal();
        if (s === '') throw bindErr(ctx, name, `Das Argument für den Parameter "${q.name}" kann nicht gebunden werden, da es sich um eine leere Zeichenfolge handelt.`, 'ParameterArgumentValidationErrorEmptyStringNotAllowed');
        v = s;
      } else throw bindErr(ctx, name, `Der Befehl kann nicht verarbeitet werden, da einer oder mehrere obligatorische Parameter fehlen: ${q.name}.`, 'MissingMandatoryParameter');
    } else if (q.def) v = await I.evalExpr(q.def, Object.assign({}, ctx, { scope: fnScope }));
    else v = q.type && /^switch$/i.test(q.type) ? false : null;
    if (q.type && v !== null && !(/^switch$/i.test(q.type) && typeof v === 'boolean')) {
      const tn = V.resolveType(q.type);
      if (!tn) throw GG.typeNotFound(q.type);
      try { v = V.cast(tn, v); }
      catch (e) { throw bindErr(ctx, name, `Die Argumenttransformation für den Parameter "${q.name}" kann nicht verarbeitet werden. ${e.rec ? e.rec.message : ''}`, 'ParameterArgumentTransformationError'); }
    }
    if (q.validateSet && (q.name in named) && !q.validateSet.some(x => x.toLowerCase() === V.toStr(v).toLowerCase()))
      throw bindErr(ctx, name, `Das Argument für den Parameter "${q.name}" kann nicht überprüft werden. Das Argument "${V.toStr(v)}" gehört nicht zu dem vom ValidateSet-Attribut angegebenen Satz "${q.validateSet.join(';')}". Geben Sie ein Argument an, das in diesem Satz enthalten ist, und führen Sie dann den Befehl erneut aus.`, 'ParameterArgumentValidationError');
    if (q.validateRange && (q.name in named) && (V.toNum(v) < q.validateRange[0] || V.toNum(v) > q.validateRange[1]))
      throw bindErr(ctx, name, `Das Argument für den Parameter "${q.name}" kann nicht überprüft werden. Das Argument "${V.toStr(v)}" ist kleiner als der zulässige Mindestbereich von "${q.validateRange[0]}" oder größer als der zulässige Höchstbereich von "${q.validateRange[1]}".`, 'ParameterArgumentValidationError');
    fnScope.setLocal(q.name, v, q.type ? { type: V.resolveType(q.type) } : undefined);
  }
  fnScope.setLocal('args', extra);
  const common = {};
  for (const k of Object.keys(named)) if (k.startsWith('__')) common[k.slice(2)] = named[k];
  if (common.ErrorAction) fnScope.setLocal('ErrorActionPreference', V.toStr(common.ErrorAction));
  const bp = new PSHash(); for (const k of Object.keys(named)) if (!k.startsWith('__')) bp.set(k, named[k]);
  fnScope.setLocal('PSBoundParameters', bp);
  return { named, extra };
};

I.runScriptDef = async function (def, ctx, fnScope, input, named, out) {
  const fctx = Object.assign({}, ctx, { scope: fnScope, depth: (ctx.depth || 0) + 1 });
  if (fctx.depth > 100) throw rtErr({ message: 'Der Aufruf von Skripts hat die maximale Tiefe von 100 überschritten.', fqid: 'CallDepthOverflow' });
  const stream = ctx.stream ? null : out;
  const target = stream === null ? null : out;
  const exec = async (stmts) => {
    try { await I.execBody(stmts, fctx, target === null ? null : target, false); }
    catch (e) { if (e instanceof ReturnSignal) return true; throw e; }
    return false;
  };
  const execTo = async (stmts) => {
    if (target === null) {
      // direkte Ausgabe
      for (const st of stmts) {
        const local = [];
        try { await I.execStatement(st, fctx, local, true); }
        catch (e) {
          I.flush(local, fctx, null);
          if (e instanceof ReturnSignal) return true;
          if (e instanceof PSRuntimeError && !e.scriptTerm && !fctx.inTry) { I.report(e.rec, fctx); continue; }
          throw e;
        }
        I.flush(local, fctx, null);
      }
      return false;
    }
    return exec(stmts);
  };
  fnScope.setLocal('input', input ? input.slice() : []);
  if (def.process || def.begin || def.end) {
    if (def.begin && await execTo(def.begin.body)) return;
    if (def.process) {
      const items = input === null ? [undefined] : input;
      for (const it of items) {
        if (it !== undefined) {
          fnScope.setLocal('_', it);
          for (const q of def.params || []) {
            if (named && q.name in named) continue;
            if (q.pipe) fnScope.setLocal(q.name, q.type ? V.cast(V.resolveType(q.type) || 'System.Object', it) : it);
            else if (q.pipeProp && it instanceof PSObject && it.has(q.name)) fnScope.setLocal(q.name, it.get(q.name));
          }
        }
        if (await execTo(def.process.body)) break;
      }
    }
    if (def.end) await execTo(def.end.body);
  } else {
    if (input && input.length) {
      for (const q of def.params || []) if (q.pipe && !(named && q.name in named)) fnScope.setLocal(q.name, V.unwrap(input));
    }
    await execTo(def.body || []);
  }
};

I.invokeFunction = async function (fn, args, input, ctx, opts) {
  const logEnt = { name: fn.name, params: {}, ok: true, fn: true };
  I.logCmd(ctx, logEnt);
  if (fn.builtin || (fn.run && !fn.def)) {
    const out = await fn.run(ctx, args, input);
    return out || [];
  }
  const fnScope = (opts && opts.dot) ? ctx.scope : new Scope(ctx.scope, 'function');
  const { named } = await I.bindFunctionParams(fn.def, args, ctx, fnScope, fn.name, input !== null && input !== undefined);
  for (const k of Object.keys(named)) if (!k.startsWith('__')) logEnt.params[k] = named[k];
  const out = [];
  const errsBefore = ctx.session.errors.length;
  await I.runScriptDef(fn.def, Object.assign({}, ctx, { stream: ctx.stream }), fnScope, input, named, out);
  if (ctx.session.errors.length > errsBefore) logEnt.ok = false;
  return out;
};

I.invokeScript = async function (cmd, args, input, ctx, dot) {
  const logEnt = { name: cmd.path, params: {}, ok: true, script: true, args: [] };
  I.logCmd(ctx, logEnt);
  // Ausführungsrichtlinie
  const pol = GG.effectiveExecPolicy(ctx);
  const node = cmd.node;
  const blocked = pol === 'Restricted' || (pol === 'AllSigned' && !node.signed) || (pol === 'RemoteSigned' && node.zone >= 3 && !node.signed);
  if (blocked) {
    logEnt.ok = false;
    let msg;
    if (pol === 'Restricted') msg = `Die Datei "${cmd.path}" kann nicht geladen werden, da die Ausführung von Skripts auf diesem System deaktiviert ist. Weitere Informationen finden Sie unter "about_Execution_Policies" (https:/go.microsoft.com/fwlink/?LinkID=135170).`;
    else msg = `Die Datei "${cmd.path}" kann nicht geladen werden. Die Datei "${cmd.path}" ist nicht digital signiert. Sie können dieses Skript im aktuellen System nicht ausführen. Weitere Informationen zum Ausführen von Skripts und Festlegen der Ausführungsrichtlinie erhalten Sie unter "about_Execution_Policies" (https:/go.microsoft.com/fwlink/?LinkID=135170)..`;
    throw new PSRuntimeError(rec({ message: msg, category: 'SecurityError', exception: 'System.Management.Automation.PSSecurityException', fqid: 'UnauthorizedAccess', target: '', cmd: '', pos: posOf(ctx.cmdNode), reason: 'PSSecurityException' }));
  }
  if (pol === 'Unrestricted' && node.zone >= 3) {
    const ans = await ctx.host.choice('Sicherheitswarnung', `Führen Sie nur vertrauenswürdige Skripts aus. Skripts aus dem Internet können zwar nützlich sein, stellen jedoch ein potenzielles Risiko für Ihren Computer dar. Wenn Sie diesem Skript vertrauen, verwenden Sie das Cmdlet "Unblock-File", um die Ausführung des Skripts ohne diese Warnmeldung zuzulassen. Möchten Sie "${cmd.path}" ausführen?`, [{ key: 'N', label: 'Nicht ausführen' }, { key: 'M', label: 'Einmal ausführen' }, { key: 'H', label: 'Anhalten' }], 0);
    if (ans !== 'M') { logEnt.ok = false; return []; }
  }
  if (!GG.fsx.canRead(ctx, node)) { logEnt.ok = false; throw rtErr({ message: `Der Zugriff auf den Pfad "${cmd.path}" wurde verweigert.`, category: 'PermissionDenied', exception: 'System.UnauthorizedAccessException', fqid: 'UnauthorizedAccess' }); }
  const text = node.content || '';
  let ast;
  try { ast = GG.parse(text, cmd.path); }
  catch (e) {
    if (e instanceof GG.ParseError) {
      logEnt.ok = false;
      const r = rec({ message: e.message, category: 'ParserError', exception: 'System.Management.Automation.ParseException', fqid: e.fqid, reason: 'ParseException', pos: e.pos });
      r.parse = true;
      throw new PSRuntimeError(r);
    }
    throw e;
  }
  const sScope = dot ? ctx.scope : new Scope(ctx.scope, 'script');
  const dir = cmd.path.replace(/\\[^\\]*$/, '');
  sScope.setLocal('PSScriptRoot', dir); sScope.setLocal('PSCommandPath', cmd.path);
  sScope.setLocal('MyInvocation', new PSObject('System.Management.Automation.InvocationInfo', { MyCommand: cmd.path.split('\\').pop(), InvocationName: cmd.path, Line: ctx.entry ? ctx.entry.line : '' }));
  const { named } = await I.bindFunctionParams(ast, args, ctx, sScope, cmd.path, input !== null && input !== undefined);
  for (const k of Object.keys(named)) if (!k.startsWith('__')) logEnt.params[k] = named[k];
  logEnt.args = args.filter(a => a.t === 'arg').map(a => V.toStr(a.value));
  const out = [];
  const errsBefore = ctx.session.errors.length;
  try {
    await I.runScriptDef(ast, Object.assign({}, ctx, { file: cmd.path, stream: ctx.stream }), sScope, input, named, out);
  } catch (e) {
    if (e instanceof ExitSignal) { ctx.session.lastExit = e.code; return out; }
    if (e instanceof PSRuntimeError) logEnt.ok = false;
    throw e;
  }
  if (ctx.session.errors.length > errsBefore) logEnt.ok = false;
  logEnt.outCount = out.length;
  return out;
};

/* Skriptblock aufrufen; opts: {args, input, dollar, dot, scope} */
I.invokeSB = async function (sb, ctx, opts) {
  opts = opts || {};
  const def = sb.ast;
  const sc = opts.dot ? ctx.scope : new Scope(opts.scope || ctx.scope, 'local');
  const prevUnder = opts.dot ? sc.vars.get('_') : null;
  if (opts.dollar !== undefined) { sc.setLocal('_', opts.dollar); }
  const args = (opts.args || []).map(v => ({ t: 'arg', value: v }));
  if (def.params && def.params.length) await I.bindFunctionParams(def, args, ctx, sc, 'ScriptBlock', opts.input != null);
  else if (!opts.dot) sc.setLocal('args', opts.args || []);
  const out = [];
  try {
    await I.runScriptDef(def, Object.assign({}, ctx, { stream: false }), sc, opts.input === undefined ? null : opts.input, null, out);
  } finally {
    if (opts.dot && opts.dollar !== undefined) { if (prevUnder) sc.vars.set('_', prevUnder); else sc.vars.delete('_'); }
  }
  return out;
};

/* ---------- Member ---------- */
I.getMember = function (obj, name, ctx) { return GG.members.get(obj, name, ctx); };
I.setMember = function (obj, name, val, ctx) { return GG.members.set(obj, name, val, ctx); };
I.callMethod = function (obj, name, args, ctx) { return GG.members.call(obj, name, args, ctx); };

})();
