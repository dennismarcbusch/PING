/* Ablaufhilfen: Welten für Kapitel/Missionen/Nachweis erzeugen, Musterlösungen nachspielen */
(function (G) {
  'use strict';
  const LX = (G.LX = G.LX || {});

  LX.headlessShell = function (w) {
    const term = { headless: true, write() {}, cols: () => 100, clear() {}, readLine: async () => 'j', readSecret: async () => null };
    return new LX.Shell(w, term);
  };
  LX.runSolve = function (sh, item) {
    const o = typeof item === 'string' ? { cmd: item } : item;
    return sh.run(o.cmd, { silent: true, nanoText: o.nanoText });
  };

  // Welt am Beginn von Lektion li in Kapitel ci (vorherige Kapitel und Lektionen sind „erledigt“)
  LX.tutorialWorld = async function (ci, li) {
    const w = LX.WORLDS.office();
    const sh = LX.headlessShell(w);
    const home = LX.homeOf(w, 'azubi');
    for (let c = 0; c <= ci; c++) {
      const ch = LX.TUTORIAL[c];
      w.cwd = home;
      if (ch.setup) ch.setup(w);
      const upto = c < ci ? ch.lessons.length : li;
      for (let l = 0; l < upto; l++) {
        for (const t of ch.lessons[l].tasks) for (const s of (t.solve || [])) await LX.runSolve(sh, s);
      }
    }
    if (li === 0) w.cwd = home;
    w.history.length = 0;
    w.sudoUntil = 0;
    w.log.cmds = [];
    LX.updateDisks(w);
    return w;
  };

  LX.practiceWorld = function (i) {
    const w = LX.WORLDS.office({ practice: true });
    LX.PRACTICE[i].setup(w);
    w.cwd = LX.homeOf(w, 'azubi');
    LX.updateDisks(w);
    return w;
  };

  LX.examWorld = function () { return LX.WORLDS.brunner(); };

  // zufällige Ziehung für Teil B
  LX.drawExam = function (rnd) {
    rnd = rnd || Math.random;
    const out = [];
    Object.keys(LX.EXAM.draw).forEach(lz => {
      const pool = LX.EXAM.pool.filter(q => String(q.lz) === String(lz));
      const n = LX.EXAM.draw[lz];
      const copy = pool.slice();
      for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0].id);
    });
    return out;
  };
  LX.examQ = function (id) { return LX.EXAM.pool.find(q => q.id === id); };
})(typeof window !== 'undefined' ? window : globalThis);
