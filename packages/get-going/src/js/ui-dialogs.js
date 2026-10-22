/* Get-Going! – Dialoge (Nachrichten, UAC, Anmeldung, GridView) und Editor (notepad) */
(function () {
'use strict';
const GG = globalThis.GG = globalThis.GG || {};
const UI = GG.UI = GG.UI || {};
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
UI.esc = esc;

/* Mini-Markdown für Lerntexte: Absätze, **fett**, `code`, ```Blöcke```, Listen */
UI.md = function (src) {
  const out = []; const blocks = String(src || '').split(/```/);
  blocks.forEach((b, i) => {
    if (i % 2 === 1) { out.push('<pre class="code">' + esc(b.replace(/^\n/, '').replace(/\n$/, '')) + '</pre>'); return; }
    for (const para of b.split(/\n{2,}/)) {
      const p = para.trim(); if (!p) continue;
      const lines = p.split('\n');
      if (lines.every(l => /^\s*(- |• |\d+\. )/.test(l))) {
        const ol = /^\s*\d+\. /.test(lines[0]);
        out.push((ol ? '<ol>' : '<ul>') + lines.map(l => '<li>' + inline(l.replace(/^\s*(- |• |\d+\. )/, '')) + '</li>').join('') + (ol ? '</ol>' : '</ul>'));
      } else out.push('<p>' + lines.map(inline).join('<br>') + '</p>');
    }
  });
  return out.join('');
};
function inline(s) {
  const parts = s.split(/(`[^`]*`)/);
  return parts.map(x => x.startsWith('`') && x.endsWith('`') && x.length > 1 ? '<code>' + esc(x.slice(1, -1)) + '</code>' : esc(x).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>')).join('');
}
UI.inline = inline;

class Dialogs {
  constructor(root, app) { this.root = root; this.app = app; }
  open(html, cls) {
    const wrap = document.createElement('div'); wrap.className = 'modal ' + (cls || '');
    wrap.innerHTML = '<div class="modal-box" role="dialog" aria-modal="true">' + html + '</div>';
    this.root.appendChild(wrap);
    return wrap;
  }
  close(w) { if (w && w.parentNode) w.parentNode.removeChild(w); this.app.focusTerm(); }
  /* Allgemeiner Dialog */
  msg(title, html, buttons, cls) {
    buttons = buttons || [{ label: 'OK', value: true, primary: true }];
    return new Promise(res => {
      const w = this.open(`<div class="dlg-title">${esc(title)}</div><div class="dlg-body">${html}</div><div class="dlg-btns">${buttons.map((b, i) => `<button data-i="${i}" class="btn ${b.primary ? 'primary' : ''}">${esc(b.label)}</button>`).join('')}</div>`, 'dlg ' + (cls || ''));
      w.querySelectorAll('.dlg-btns button').forEach(btn => btn.onclick = () => { this.close(w); res(buttons[+btn.dataset.i].value); });
      const pb = w.querySelector('.btn.primary') || w.querySelector('.dlg-btns button'); if (pb) setTimeout(() => pb.focus(), 30);
      w.addEventListener('keydown', ev => { if (ev.key === 'Escape') { const c = buttons.find(b => b.cancel); if (c) { this.close(w); res(c.value); } } });
    });
  }
  confirm(title, text, yes, no) { return this.msg(title, '<p>' + UI.inline(text) + '</p>', [{ label: yes || 'Ja', value: true, primary: true }, { label: no || 'Abbrechen', value: false, cancel: true }]); }
  /* Nachricht von Mira (wie „msg“) */
  mira(text, from) {
    const now = new Date(); const p2 = n => String(n).padStart(2, '0');
    const stamp = `${p2(now.getDate())}.${p2(now.getMonth() + 1)}.${now.getFullYear()} ${p2(now.getHours())}:${p2(now.getMinutes())}`;
    return this.msg(`Nachricht von ${from || 'KORBWERK\\mhofmann'} am ${stamp}`, '<div class="mira">' + String(text).split('\n').map(l => l ? '<p>' + UI.inline(l) + '</p>' : '').join('') + '</div>', [{ label: 'OK', value: true, primary: true }], 'msgbox');
  }
  /* Benutzerkontensteuerung */
  uac(appName, publisher) {
    return new Promise(res => {
      const w = this.open(`<div class="uac-head">Benutzerkontensteuerung</div>
        <div class="uac-q">Möchten Sie zulassen, dass durch diese App Änderungen an Ihrem Gerät vorgenommen werden?</div>
        <div class="uac-app"><span class="uac-ico" aria-hidden="true"><svg viewBox="0 0 32 32"><rect x="2" y="5" width="28" height="22" rx="3" fill="#2a5aa8"/><path d="m8 11 7 5-7 5" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M16 22h8" stroke="#fff" stroke-width="2.4"/></svg></span><span>${esc(appName || 'Windows PowerShell')}</span></div>
        <div class="uac-meta">Verifizierter Herausgeber: ${esc(publisher || 'Microsoft Windows')}<br><span class="uac-link">Weitere Details anzeigen</span></div>
        <div class="uac-btns"><button class="btn primary" data-v="1">Ja</button><button class="btn" data-v="0">Nein</button></div>`, 'uac');
      w.querySelectorAll('button').forEach(b => b.onclick = () => { this.close(w); res(b.dataset.v === '1'); });
      setTimeout(() => w.querySelector('button[data-v="0"]').focus(), 30);
    });
  }
  /* Get-Credential */
  credential(user, message) {
    return new Promise(res => {
      const w = this.open(`<div class="dlg-title">Anmeldeinformationen für Windows PowerShell</div><div class="dlg-body"><p>${esc(message || 'Anmeldeinformationen eingeben')}</p>
        <label class="fld">Benutzername<input type="text" class="cu" value="${esc(user || '')}" autocomplete="off"></label>
        <label class="fld">Kennwort<input type="password" class="cp" autocomplete="off"></label></div>
        <div class="dlg-btns"><button class="btn primary ok">OK</button><button class="btn cancel">Abbrechen</button></div>`, 'dlg');
      const done = v => { this.close(w); res(v); };
      w.querySelector('.ok').onclick = () => done({ user: w.querySelector('.cu').value, pass: w.querySelector('.cp').value });
      w.querySelector('.cancel').onclick = () => done(null);
      w.addEventListener('keydown', ev => { if (ev.key === 'Enter') w.querySelector('.ok').click(); if (ev.key === 'Escape') done(null); });
      setTimeout(() => (user ? w.querySelector('.cp') : w.querySelector('.cu')).focus(), 30);
    });
  }
  prompt(title, label, def) {
    return new Promise(res => {
      const w = this.open(`<div class="dlg-title">${esc(title)}</div><div class="dlg-body"><label class="fld">${esc(label)}<input type="text" class="pv" value="${esc(def || '')}" autocomplete="off" spellcheck="false"></label></div><div class="dlg-btns"><button class="btn primary ok">OK</button><button class="btn cancel">Abbrechen</button></div>`, 'dlg');
      const done = v => { this.close(w); res(v); };
      w.querySelector('.ok').onclick = () => done(w.querySelector('.pv').value);
      w.querySelector('.cancel').onclick = () => done(null);
      w.addEventListener('keydown', ev => { if (ev.key === 'Enter') w.querySelector('.ok').click(); if (ev.key === 'Escape') done(null); });
      setTimeout(() => { const i = w.querySelector('.pv'); i.focus(); i.select(); }, 30);
    });
  }
  /* Out-GridView */
  gridView(title, names, rows, pass) {
    return new Promise(res => {
      const w = this.open(`<div class="gv-title"><span>${esc(title)}</span><button class="x" aria-label="Schließen">×</button></div>
        <div class="gv-filter"><input type="text" placeholder="Filter" class="gv-f" spellcheck="false"></div>
        <div class="gv-wrap"><table class="gv"><thead><tr>${names.map(n => `<th>${esc(n)}</th>`).join('')}</tr></thead><tbody></tbody></table></div>
        <div class="gv-foot">${pass ? '<button class="btn primary ok">OK</button><button class="btn cancel">Abbrechen</button>' : '<span class="gv-count"></span>'}</div>`, 'gridview');
      const tb = w.querySelector('tbody'); const sel = new Set();
      const draw = () => {
        const f = w.querySelector('.gv-f').value.toLowerCase();
        tb.innerHTML = '';
        let n = 0;
        rows.forEach((r, i) => {
          if (f && !r.some(c => String(c).toLowerCase().includes(f))) return;
          n++;
          const tr = document.createElement('tr'); if (sel.has(i)) tr.className = 'sel';
          tr.innerHTML = r.map(c => `<td>${esc(c)}</td>`).join('');
          tr.onclick = ev => { if (!ev.ctrlKey) sel.clear(); sel.has(i) ? sel.delete(i) : sel.add(i); draw(); };
          tb.appendChild(tr);
        });
        const cnt = w.querySelector('.gv-count'); if (cnt) cnt.textContent = n + ' Elemente';
      };
      draw();
      w.querySelector('.gv-f').oninput = draw;
      const done = v => { this.close(w); res(v); };
      w.querySelector('.x').onclick = () => done(pass ? null : []);
      if (pass) { w.querySelector('.ok').onclick = () => done(Array.from(sel).sort((a, b) => a - b)); w.querySelector('.cancel').onclick = () => done(null); }
    });
  }
}
UI.Dialogs = Dialogs;

/* ---------- Editor (notepad) ---------- */
class Notepad {
  constructor(root, app) {
    this.app = app; this.root = root; this.win = null;
  }
  async open(session, file, tab) {
    if (this.win) { await this.close(); if (this.win) return; }
    let path = null, text = '';
    const ctx = GG.mkCtx(session, session.global, {});
    if (file) {
      const f = String(file).replace(/^["']|["']$/g, '');
      const r = GG.fsx.resolve(ctx, f);
      if (r.error || r.prov !== 'FileSystem') { await this.app.dialogs.msg('Editor', '<p>Der Pfad wurde nicht gefunden.</p>'); return; }
      path = GG.fsx.canonical(r);
      const n = GG.fsx.node(r);
      if (n && n.dir) { await this.app.dialogs.msg('Editor', `<p>${esc(path)}</p><p>Der Zugriff wurde verweigert.</p>`); return; }
      if (!n) {
        const parent = GG.fsx.node(GG.fsx.parentRes(r));
        if (!parent) { await this.app.dialogs.msg('Editor', `<p>${esc(path)}</p><p>Der Pfad wurde nicht gefunden.<br>Überprüfen Sie, ob der richtige Pfad angegeben wurde.</p>`); return; }
        const ok = await this.app.dialogs.msg('Editor', `<p>Die Datei „${esc(path.split('\\').pop())}“ wurde nicht gefunden.</p><p>Möchten Sie eine neue Datei erstellen?</p>`, [{ label: 'Ja', value: true, primary: true }, { label: 'Nein', value: false }, { label: 'Abbrechen', value: false, cancel: true }]);
        if (!ok) return;
      } else {
        if (!GG.fsx.canRead(ctx, n)) { await this.app.dialogs.msg('Editor', `<p>Der Zugriff auf „${esc(path)}“ wurde verweigert.</p>`); return; }
        if (n.content === null || n.content === undefined) { await this.app.dialogs.msg('Editor', '<p>Diese Datei ist keine Textdatei und kann im Editor nicht sinnvoll angezeigt werden.</p>'); return; }
        text = n.content || '';
      }
    }
    this.session = session; this.path = path; this.saved = text; this.tab = tab;
    this.show(text);
  }
  title() { return (this.dirty() ? '*' : '') + (this.path ? this.path.split('\\').pop() : 'Unbenannt') + ' – Editor'; }
  dirty() { return this.ta && this.ta.value !== this.saved; }
  show(text) {
    const w = document.createElement('div'); w.className = 'notepad';
    w.innerHTML = `<div class="np-title"><span class="np-ico" aria-hidden="true"><svg viewBox="0 0 16 16"><rect x="3" y="1.5" width="10" height="13" rx="1.5" fill="#fff" stroke="#3b78c4"/><path d="M5 5h6M5 7.5h6M5 10h4" stroke="#3b78c4"/></svg></span><span class="np-name"></span><span class="np-win"><button class="np-close" aria-label="Schließen">✕</button></span></div>
      <div class="np-menu"><span class="np-m" data-m="datei">Datei</span><span class="np-m">Bearbeiten</span><span class="np-m">Ansicht</span><span class="np-hint">Strg+S speichert</span>
        <div class="np-drop" hidden><button data-a="save">Speichern<kbd>Strg+S</kbd></button><button data-a="saveas">Speichern unter …</button><hr><button data-a="close">Schließen</button></div></div>
      <textarea class="np-text" spellcheck="false" wrap="off"></textarea>
      <div class="np-status"><span class="np-pos">Zeile 1, Spalte 1</span><span>100 %</span><span>Windows (CRLF)</span><span>UTF-8</span></div>`;
    this.root.appendChild(w); this.win = w;
    this.ta = w.querySelector('.np-text'); this.ta.value = text;
    const upd = () => {
      w.querySelector('.np-name').textContent = this.title();
      const v = this.ta.value.slice(0, this.ta.selectionStart); const ln = v.split('\n'); w.querySelector('.np-pos').textContent = `Zeile ${ln.length}, Spalte ${ln[ln.length - 1].length + 1}`;
    };
    upd();
    this.ta.addEventListener('input', upd); this.ta.addEventListener('keyup', upd); this.ta.addEventListener('click', upd);
    this.ta.addEventListener('keydown', ev => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') { ev.preventDefault(); ev.shiftKey ? this.saveAs() : this.save(); }
      if (ev.key === 'Tab') { ev.preventDefault(); const s = this.ta.selectionStart; this.ta.setRangeText('\t', s, this.ta.selectionEnd, 'end'); upd(); }
    });
    const drop = w.querySelector('.np-drop');
    w.querySelector('[data-m="datei"]').onclick = () => { drop.hidden = !drop.hidden; };
    drop.querySelectorAll('button').forEach(b => b.onclick = () => { drop.hidden = true; const a = b.dataset.a; if (a === 'save') this.save(); else if (a === 'saveas') this.saveAs(); else this.close(); });
    w.querySelector('.np-close').onclick = () => this.close();
    this.upd = upd;
    setTimeout(() => this.ta.focus(), 30);
  }
  async save() {
    if (!this.path) return this.saveAs();
    try {
      await GG.Runner.saveFile(this.session, this.path, this.ta.value);
      this.saved = this.ta.value; this.upd();
      this.flash('Gespeichert');
      this.app.afterNotepadSave(this.session, this.path);
      return true;
    } catch (e) {
      await this.app.dialogs.msg('Editor', `<p>${esc(this.path)}</p><p>${esc(e && e.rec ? e.rec.message : 'Die Datei konnte nicht gespeichert werden.')}</p>`);
      return false;
    }
  }
  async saveAs() {
    const def = this.path || (this.session.loc + '\\Unbenannt.txt');
    const p = await this.app.dialogs.prompt('Speichern unter', 'Dateiname (vollständiger Pfad)', def);
    if (!p) return false;
    const ctx = GG.mkCtx(this.session, this.session.global, {});
    const r = GG.fsx.resolve(ctx, p.trim());
    if (r.error || r.prov !== 'FileSystem') { await this.app.dialogs.msg('Editor', '<p>Ungültiger Pfad.</p>'); return false; }
    this.path = GG.fsx.canonical(r);
    return this.save();
  }
  flash(t) { const s = this.win.querySelector('.np-hint'); s.textContent = t + ' ✓'; s.classList.add('ok'); clearTimeout(this._ft); this._ft = setTimeout(() => { if (this.win) { s.textContent = 'Strg+S speichert'; s.classList.remove('ok'); } }, 1800); }
  async close(force) {
    if (!this.win) return;
    if (!force && this.dirty()) {
      const v = await this.app.dialogs.msg('Editor', `<p>Möchten Sie die Änderungen an „${esc(this.path ? this.path.split('\\').pop() : 'Unbenannt')}“ speichern?</p>`, [{ label: 'Speichern', value: 'save', primary: true }, { label: 'Nicht speichern', value: 'no' }, { label: 'Abbrechen', value: 'cancel', cancel: true }]);
      if (v === 'cancel') return;
      if (v === 'save' && !(await this.save())) return;
    }
    if (this.win && this.win.parentNode) this.win.parentNode.removeChild(this.win);
    this.win = null; this.ta = null;
    if (this.session && this.session.world) { const pr = this.session.world.processes.find(p => p.name === 'notepad' && p.user === this.session.user); if (pr) this.session.world.processes = this.session.world.processes.filter(x => x !== pr); }
    this.app.focusTerm();
  }
}
UI.Notepad = Notepad;
})();
