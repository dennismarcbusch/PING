/* SCORM-1.2-Anbindung mit Rückfall auf localStorage (für die Vorschau ohne Lernplattform) */
(function (G) {
  'use strict';
  const LX = (G.LX = G.LX || {});
  const KEY = 'lx-linux-terminal-v1';

  function findAPI(win) {
    let tries = 0;
    while (win && tries < 12) {
      try { if (win.API) return win.API; } catch (e) { /* fremde Herkunft */ }
      if (win.parent && win.parent !== win) { win = win.parent; tries++; continue; }
      break;
    }
    return null;
  }

  const S = {
    api: null, ok: false, start: Date.now(), dirty: false, timer: null,
    init() {
      this.api = findAPI(window) || (window.opener ? findAPI(window.opener) : null);
      if (this.api) {
        try { this.ok = String(this.api.LMSInitialize('')) === 'true'; } catch (e) { this.ok = false; }
      }
      if (this.ok) {
        const st = this.get('cmi.core.lesson_status');
        if (!st || st === 'not attempted') this.set('cmi.core.lesson_status', 'incomplete');
        this.set('cmi.core.score.min', '0');
        this.set('cmi.core.score.max', '100');
      }
      const self = this;
      window.addEventListener('pagehide', () => self.finish());
      window.addEventListener('beforeunload', () => self.finish());
      return this.ok;
    },
    get(k) { if (!this.ok) return ''; try { return String(this.api.LMSGetValue(k) || ''); } catch (e) { return ''; } },
    set(k, v) { if (!this.ok) return false; try { return String(this.api.LMSSetValue(k, String(v))) === 'true'; } catch (e) { return false; } },
    commit() { if (this.ok) { try { this.api.LMSCommit(''); } catch (e) { /* ignorieren */ } } },
    studentName() {
      const n = this.get('cmi.core.student_name');
      if (!n) return '';
      // Moodle liefert »Nachname, Vorname«
      const p = n.split(',').map(s => s.trim()).filter(Boolean);
      return p.length === 2 ? p[1] + ' ' + p[0] : n;
    },
    load() {
      let raw = this.ok ? this.get('cmi.suspend_data') : '';
      // localStorage nur ohne Lernplattform (Schul-PCs werden geteilt!)
      if (!raw && !this.ok) { try { raw = localStorage.getItem(KEY) || ''; } catch (e) { raw = ''; } }
      try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
    },
    save(state) {
      let s = JSON.stringify(state);
      if (s.length > 4000) { const c = JSON.parse(s); if (c.e && c.e.last) delete c.e.last.b; s = JSON.stringify(c); }
      if (this.ok) {
        this.set('cmi.suspend_data', s);
        if (state.loc) this.set('cmi.core.lesson_location', state.loc);
        this.commitSoon();
      }
      else { try { localStorage.setItem(KEY, s); } catch (e) { /* privat */ } }
    },
    commitSoon() { clearTimeout(this.timer); const self = this; this.timer = setTimeout(() => self.commit(), 1500); },
    result(best, attempted) {
      if (!this.ok) return;
      this.set('cmi.core.score.raw', String(Math.round(best)));
      this.set('cmi.core.lesson_status', best >= 70 ? 'passed' : (attempted ? 'failed' : 'incomplete'));
      this.commit();
    },
    finish() {
      if (!this.ok || this.done) return;
      this.done = true;
      const sec = Math.round((Date.now() - this.start) / 1000);
      const hh = String(Math.floor(sec / 3600)).padStart(4, '0'), mm = String(Math.floor(sec / 60) % 60).padStart(2, '0'), ss = String(sec % 60).padStart(2, '0');
      this.set('cmi.core.session_time', hh + ':' + mm + ':' + ss);
      this.set('cmi.core.exit', 'suspend');
      try { this.api.LMSCommit(''); this.api.LMSFinish(''); } catch (e) { /* ignorieren */ }
    }
  };
  LX.SCORM = S;
})(typeof window !== 'undefined' ? window : globalThis);
