/* Get-Going! – Ausgabeformatierung (Out-Default, Tabellen, Listen, Fehler) */
(function () {
'use strict';
const GG = globalThis.GG = globalThis.GG || {};
const V = GG.v;
const { PSObject, PSHash, ScriptBlock, PSDate, TimeSpan, SecureString, ErrorRecord } = GG;
const F = GG.fmt = {};
GG.views = GG.views || {};

/* Ansicht registrieren: {table:[{l,p|g,w,a}], list:[...], kind:'table'|'list'|'wide', group:{label, g}} */
GG.view = function (typeName, def) { GG.views[typeName] = def; };
F.viewFor = function (o) {
  if (!(o instanceof PSObject)) return null;
  for (const t of o.typeNames) {
    const v = GG.views[t] || GG.views[t.replace(/^Deserialized\./, '')];
    if (v) return v;
  }
  return null;
};

/* ---------- Fehlertext ---------- */
F.catInfo = function (r) {
  const tgt = r.target === null || r.target === undefined ? '' : (typeof r.target === 'string' ? r.target : V.toStr(r.target));
  const tt = r.target === '' || r.target === null ? '' : (r.targetType || 'String');
  return `${r.category === 'SecurityError' ? 'Sicherheitsfehler' : r.category}: (${tgt}:${tt}) [${r.catActivity !== undefined ? r.catActivity : (r.cmd || r.activity || '')}], ${r.reason || r.exception.split('.').pop()}`;
};
F.posLines = function (pos) {
  const head = pos.file ? `In ${pos.file}:${pos.line} Zeichen:${pos.col}` : `In Zeile:${pos.line} Zeichen:${pos.col}`;
  const text = pos.text.replace(/\t/g, ' ');
  const len = Math.max(1, Math.min(pos.len || 1, text.length - pos.col + 1));
  return [head, '+ ' + text, '+ ' + ' '.repeat(pos.col - 1) + '~'.repeat(len)];
};
F.errorText = function (r) {
  const lines = [];
  if (r.parse) {
    if (r.pos) lines.push(...F.posLines(r.pos));
    lines.push(r.message);
    lines.push(`    + CategoryInfo          : ParserError: (:) [], ${r.reason || 'ParentContainsErrorRecordException'}`);
    lines.push(`    + FullyQualifiedErrorId : ${r.fqid}`);
    lines.push(' ');
    return lines;
  }
  const msg = r.cmd && !r.psComputerName ? `${r.cmd} : ${r.message}` : r.message;
  lines.push(...msg.split('\n'));
  if (r.pos && !r.psComputerName) lines.push(...F.posLines(r.pos));
  lines.push(`    + CategoryInfo          : ${F.catInfo(r)}`);
  lines.push(`    + FullyQualifiedErrorId : ${r.fqid}`);
  if (r.psComputerName) lines.push(`    + PSComputerName        : ${r.psComputerName}`);
  lines.push(' ');
  if (r.suggestion) {
    lines.push('\u0001', '\u0001Vorschlag [3,General]: ' + r.suggestion);
  }
  return lines;
};

/* ---------- Zellen ---------- */
F.cell = function (v) {
  if (v === null || v === undefined) return '';
  if (v instanceof ScriptBlock) return v.text.trim();
  const s = V.toDisp(v);
  const nl = s.indexOf('\n');
  return nl >= 0 ? s.slice(0, nl) : s;
};
const isNum = v => typeof v === 'number';

/* Tabelle aus Spalten {label, width, align} und Zeilen [werte] */
F.renderTable = function (cols, rows, width, opts) {
  opts = opts || {};
  width = width || 120;
  const n = cols.length;
  const cells = rows.map(r => r.map(F.cell));
  const ws = cols.map((c, i) => {
    if (c.width && !opts.autosize) return c.width;
    let w = c.label.length;
    for (const r of cells) w = Math.max(w, r[i].length);
    return w;
  });
  const align = cols.map((c, i) => c.align || (rows.length && rows.every(r => r[i] === null || r[i] === undefined || r[i] === '' || isNum(r[i])) && rows.some(r => isNum(r[i])) ? 'r' : 'l'));
  // Breite begrenzen
  let total = ws.reduce((a, b) => a + b, 0) + (n - 1);
  if (total > width) {
    // letzte Spalte begrenzen, dann breiteste kürzen
    for (let guard = 0; total > width && guard < 500; guard++) {
      let mi = 0; for (let i = 1; i < n; i++) if (ws[i] > ws[mi]) mi = i;
      if (ws[mi] <= Math.max(5, cols[mi].label.length)) break;
      ws[mi]--; total--;
    }
  }
  // letzte Spalte darf Rest nutzen
  if (!cols[n - 1].width || opts.autosize) {
    const used = ws.slice(0, -1).reduce((a, b) => a + b, 0) + (n - 1);
    ws[n - 1] = Math.max(Math.min(ws[n - 1], width - used), Math.min(ws[n - 1], cols[n - 1].label.length));
  }
  const fit = (s, i) => {
    if (s.length > ws[i]) s = ws[i] > 3 ? s.slice(0, ws[i] - 3) + '...' : s.slice(0, ws[i]);
    return align[i] === 'r' ? s.padStart(ws[i]) : s.padEnd(ws[i]);
  };
  const line = arr => arr.map((s, i) => fit(s, i)).join(' ').replace(/\s+$/, '');
  const out = [];
  if (!opts.hideHeader) {
    out.push(line(cols.map(c => c.label)));
    out.push(line(cols.map(c => '-'.repeat(Math.min(c.label.length, 999)))));
  }
  for (const r of cells) out.push(line(r));
  return out;
};

/* Liste */
F.renderList = function (objs, propsFor, width) {
  const out = [];
  for (const o of objs) {
    const props = propsFor(o);
    const lw = props.reduce((a, p) => Math.max(a, p.label.length), 0);
    out.push('');
    for (const p of props) {
      let v = p.value;
      let s = v === null || v === undefined ? '' : (v instanceof ScriptBlock ? v.text : V.toDisp(v));
      const pre = p.label.padEnd(lw) + ' : ';
      const lines = s.split('\n');
      const avail = Math.max(20, (width || 120) - pre.length);
      const wrapped = [];
      for (const l of lines) { if (l.length <= avail) wrapped.push(l); else for (let k = 0; k < l.length; k += avail) wrapped.push(l.slice(k, k + avail)); }
      out.push((pre + wrapped[0]).replace(/\s+$/, ''));
      for (const l of wrapped.slice(1)) out.push(' '.repeat(pre.length) + l);
    }
  }
  return out;
};

/* Eigenschaften eines Objekts für generische Anzeige */
F.allProps = function (o) {
  if (o instanceof PSObject) return o.names().filter(n => !o.hiddenProps || !o.hiddenProps.includes(n.toLowerCase()));
  if (o instanceof PSDate) return ['DisplayHint', 'DateTime', 'Date', 'Day', 'DayOfWeek', 'DayOfYear', 'Hour', 'Kind', 'Millisecond', 'Minute', 'Month', 'Second', 'Ticks', 'TimeOfDay', 'Year'];
  if (o instanceof TimeSpan) return ['Days', 'Hours', 'Minutes', 'Seconds', 'Milliseconds', 'Ticks', 'TotalDays', 'TotalHours', 'TotalMinutes', 'TotalSeconds', 'TotalMilliseconds'];
  if (typeof o === 'string') return ['Length'];
  return [];
};
F.propVal = function (o, name) {
  if (o instanceof PSDate && name === 'DateTime') return V.fmtDateLong(o.d);
  if (o instanceof PSDate && name === 'DisplayHint') return 'DateTime';
  return GG.members.get(o, name, null);
};
F.defaultProps = function (o) {
  const v = F.viewFor(o);
  if (v && v.defaultProps) return v.defaultProps;
  return F.allProps(o);
};

/* ---------- Out-Default ---------- */
F.format = function (items, width, ctx) {
  width = width || 120;
  const lines = []; // {t:text, c:class}
  const push = (t, c) => lines.push(c ? { t, c } : { t });
  const flat = [];
  for (const x of items) { if (Array.isArray(x)) for (const y of x) flat.push(y); else flat.push(x); }
  let i = 0;
  let lastBlock = null;
  let sharedCols = null; // für generische Objekte (PS-Verhalten: erste Form gewinnt)
  while (i < flat.length) {
    const o = flat[i];
    if (o === null || o === undefined) { i++; continue; }
    if (o && o.__fmt) { // Format-*-Ausgabe
      for (const l of o.__fmt) push(l);
      lastBlock = 'fmt'; i++; continue;
    }
    if (o instanceof ErrorRecord) { for (const l of F.errorText(o)) { if (l.charAt(0) === '\u0001') push(l.slice(1)); else push(l, 'err'); } i++; lastBlock = 'err'; continue; }
    if (typeof o === 'string' || typeof o === 'number' || typeof o === 'boolean' || o instanceof ScriptBlock || o instanceof SecureString) {
      if (lastBlock === 'table' || lastBlock === 'list') { /* PS fügt keinen Abstand ein */ }
      const s = typeof o === 'number' ? V.fmtNum(o, true) : (o instanceof ScriptBlock ? o.text : V.toStr(o));
      for (const l of s.split('\n')) push(l.replace(/\r$/, ''));
      lastBlock = 'str'; i++; continue;
    }
    if (o instanceof PSDate) { if (lastBlock !== 'date') push(''); push(V.fmtDateLong(o.d)); push(''); lastBlock = 'date'; i++; continue; }
    if (o instanceof TimeSpan) {
      push('');
      const props = F.allProps(o);
      for (const l of F.renderList([o], x => props.map(p => ({ label: p, value: F.propVal(x, p) })), width).slice(1)) push(l);
      push(''); lastBlock = 'list'; i++; continue;
    }
    if (o instanceof PSHash) {
      const grp = [];
      while (i < flat.length && flat[i] instanceof PSHash) grp.push(flat[i++]);
      const rows = [];
      for (const h of grp) for (const e of h.entries()) rows.push([e.key, e.value]);
      push('');
      for (const l of F.renderTable([{ label: 'Name', width: 30 }, { label: 'Value' }], rows, width)) push(l);
      push(''); lastBlock = 'table'; continue;
    }
    if (o instanceof PSObject) {
      const v = F.viewFor(o);
      const key = v ? v : 'generic';
      const grp = [];
      while (i < flat.length && flat[i] instanceof PSObject && !flat[i].__fmt && (F.viewFor(flat[i]) || 'generic') === key) {
        // generische Objekte mit anderer Typbezeichnung trennen nur bei Typwechsel (nicht bei PSCustomObject)
        grp.push(flat[i++]);
      }
      if (v) { F.renderView(grp, v, width, push); lastBlock = v.kind === 'list' ? 'list' : 'table'; sharedCols = null; continue; }
      // generisch
      const names = sharedCols || F.allProps(grp[0]);
      if (names.length === 0) { for (const g of grp) push(V.toStr(g)); continue; }
      if (names.length <= 4) {
        sharedCols = names;
        const remote = grp.some(g => g.has('PSComputerName') && g.get('PSShowComputerName') !== false) && !names.some(n => n.toLowerCase() === 'pscomputername');
        const cols = names.map(n => ({ label: n }));
        const rows = grp.map(g => names.map(n => F.propVal(g, n)));
        if (remote) { cols.push({ label: 'PSComputerName' }); grp.forEach((g, k) => rows[k].push(g.get('PSComputerName'))); }
        push('');
        for (const l of F.renderTable(cols, rows, width)) push(l);
        push('');
        lastBlock = 'table';
      } else {
        sharedCols = null;
        for (const l of F.renderList(grp, x => F.allProps(x).filter(n => n !== 'PSShowComputerName' && n !== 'RunspaceId').map(n => ({ label: n, value: F.propVal(x, n) })), width)) push(l);
        push('');
        lastBlock = 'list';
      }
      continue;
    }
    push(V.toStr(o)); i++;
  }
  if (lastBlock === 'table' || lastBlock === 'list') push('');
  return lines;
};

F.renderView = function (grp, v, width, push) {
  const remote = grp.some(g => g.has('PSComputerName') && g.get('PSShowComputerName') !== false);
  if (v.custom) { for (const l of v.custom(grp, width)) push(l); return; }
  if (v.kind === 'list') {
    let props = v.list;
    for (const l of F.renderList(grp, o => {
      const ps = props.map(p => ({ label: p.l || p.p, value: p.g ? p.g(o) : F.propVal(o, p.p) }));
      if (remote) ps.push({ label: 'PSComputerName', value: o.get('PSComputerName') });
      return ps;
    }, width)) push(l);
    push('');
    return;
  }
  if (v.kind === 'wide') {
    push('');
    const vals = grp.map(o => F.cell(v.wide(o)));
    const cw = Math.floor(width / 2);
    for (let k = 0; k < vals.length; k += 2) push((vals[k].padEnd(cw) + (vals[k + 1] || '')).replace(/\s+$/, ''));
    push('');
    return;
  }
  // Tabelle, ggf. gruppiert
  const groups = [];
  if (v.group) {
    for (const o of grp) {
      const gk = v.group.g(o);
      if (!groups.length || groups[groups.length - 1].key !== gk) groups.push({ key: gk, items: [] });
      groups[groups.length - 1].items.push(o);
    }
  } else groups.push({ key: null, items: grp });
  for (const g of groups) {
    if (v.group && g.key !== null && g.key !== undefined && g.key !== '') {
      push(''); push(''); push(`    ${v.group.label}: ${g.key}`); push(''); push('');
    } else push('');
    const cols = v.table.map(c => ({ label: c.l || c.p, width: c.w, align: c.a }));
    const rows = g.items.map(o => v.table.map(c => c.g ? c.g(o) : F.propVal(o, c.p)));
    if (remote) { cols.push({ label: 'PSComputerName' }); g.items.forEach((o, k) => rows[k].push(o.get('PSComputerName'))); if (cols.length > 1 && cols[cols.length - 2].width === undefined) cols[cols.length - 2].width = 30; }
    for (const l of F.renderTable(cols, rows, width)) push(l);
    push('');
  }
};

F.toText = function (items, ctx, width) {
  const lines = F.format(items, width || 120, ctx);
  return lines.map(l => l.t).join('\n') + (lines.length ? '\n' : '');
};
F.toLines = function (items, width) { return F.format(items, width || 120).map(l => l.t); };

})();
