/* Get-Going! – Ablaufsteuerung (unabhängig von der Oberfläche) */
(function () {
'use strict';
const GG = globalThis.GG = globalThis.GG || {};
const RN = GG.Runner = {};

/* Stiller Host für das Nachspielen von Musterlösungen */
class SilentHost {
  constructor() { this.width = 120; this.interactive = false; }
  write() {} outDefault() {} showError() {}
  async readLine() { return ''; }
  async choice(cap, msg, choices, def) { const y = choices.find(c => /^(J|A|Y)$/.test(c.key)); return y ? y.key : choices[def || 0].key; }
  async credential() { return null; }
  async elevate() { if (this.onElevate) this.onElevate(); return true; }
  newTab() {} openNotepad() {} clear() {} async sleep() {} gridView() {} async uacConsent() { return true; } reboot() {} remoteChanged() {}
}
RN.SilentHost = SilentHost;

/* Arbeitsumgebung: Welt + Sitzungen */
RN.makeState = function (env, host) {
  const st = { env, w: env.main, sessions: { normal: new GG.Session(env.main, host, {}), admin: null }, host };
  return st;
};
RN.ensureAdmin = function (st) {
  if (!st.sessions.admin) {
    st.sessions.admin = new GG.Session(st.env.main, st.host, { elevated: true, loc: 'C:\\Windows\\system32' });
    if (st.onAdmin) st.onAdmin(st.sessions.admin);
  }
  return st.sessions.admin;
};

/* Notepad-Speichern (auch von der Oberfläche benutzt) */
RN.saveFile = async function (sess, path, text) {
  const ctx = GG.mkCtx(sess, sess.global, {});
  return GG.fsx.writeText(ctx, path, text.replace(/\r\n/g, '\n'), false, 'UTF8');
};

/* Einen Lösungsschritt ausführen; liefert den Protokolleintrag */
RN.step = async function (st, step, hostOverride) {
  const run = async (sess, cmd) => {
    const prev = sess.host; if (hostOverride) sess.host = hostOverride;
    try { return await GG.interp.runTop(sess, cmd); } finally { sess.host = prev; }
  };
  if (typeof step === 'string') return run(st.sessions.normal, step);
  if (step.a) return run(RN.ensureAdmin(st), step.a);
  if (step.np) {
    const sess = step.np.admin ? RN.ensureAdmin(st) : st.sessions.normal;
    await RN.saveFile(sess, step.np.file, step.np.content);
    return { line: 'notepad ' + step.np.file, cmds: [{ name: 'notepad', params: {}, ok: true, native: true }], errors: [], out: [], ok: true };
  }
  if (step.ans !== undefined) { if (step.cp) { st.answers = st.answers || {}; st.answers[step.cp] = step.ans; } else st.answer = step.ans; return null; }
  if (step.fn) { await step.fn(st); return null; }
  return null;
};

/* Lösung einer Lektion nachspielen */
RN.applySolution = async function (st, lesson, host) {
  const entries = [];
  st.answer = '';
  for (const s of lesson.solution || []) { const e = await RN.step(st, s, host); if (e) entries.push(e); }
  return entries;
};

/* Tutorial: Zustand vor Lektion (ci, li) aufbauen */
RN.tutorialEnv = function () { return GG.buildKorbwerk(); };
RN.replayTutorial = async function (ci, li, uiHost) {
  const env = RN.tutorialEnv();
  const silent = new SilentHost();
  const st = RN.makeState(env, uiHost || silent);
  silent.onElevate = () => RN.ensureAdmin(st);
  const chs = GG.COURSE.chapters;
  for (let c = 0; c <= ci; c++) {
    const ch = chs[c];
    if (ch.onEnter) ch.onEnter(env, st);
    const upto = c < ci ? ch.lessons.length : li;
    for (let l = 0; l < upto; l++) {
      const les = ch.lessons[l];
      await RN.applySolution(st, les, silent);
    }
  }
  // wie ein frisch geöffnetes Fenster: zurück ins Profil
  st.answer = '';
  st.sessions.normal.loc = st.sessions.normal.home;
  if (st.sessions.admin) st.sessions.admin.loc = 'C:\\Windows\\system32';
  return st;
};

/* Prüfen */
RN.check = function (st, item, entries, answer) {
  const s = Object.assign({}, st, { entries: entries || [], answer: answer === undefined ? st.answer : answer });
  try { return !!item.check(s); } catch (e) { if (globalThis.console) console.warn('Prüffehler', item.id, e); return false; }
};
})();
