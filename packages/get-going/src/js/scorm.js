/* Get-Going! – SCORM-1.2-Anbindung mit localStorage-Ersatz (nur ohne LMS) */
(function () {
'use strict';
const GG = globalThis.GG = globalThis.GG || {};
const S = GG.Scorm = { api: null, lms: false, data: null, name: '', key: 'get-going-progress-v1' };

function findAPI(win) {
  let tries = 0;
  while (win && tries < 12) {
    try { if (win.API) return win.API; } catch (e) { /* fremde Domain */ }
    if (win.parent === win) break;
    win = win.parent; tries++;
  }
  return null;
}
S.init = function () {
  let api = findAPI(window);
  if (!api) { try { if (window.opener) api = findAPI(window.opener); } catch (e) { /* */ } }
  if (api) {
    try { if (String(api.LMSInitialize('')) === 'true') { S.api = api; S.lms = true; } } catch (e) { /* */ }
  }
  if (S.lms) {
    S.name = S.get('cmi.core.student_name') || '';
    const st = S.get('cmi.core.lesson_status');
    if (!st || st === 'not attempted') S.set('cmi.core.lesson_status', 'incomplete');
    const sd = S.get('cmi.suspend_data');
    try { S.data = sd ? JSON.parse(sd) : null; } catch (e) { S.data = null; }
    S.commit();
  } else {
    try { S.data = JSON.parse(localStorage.getItem(S.key) || 'null'); } catch (e) { S.data = null; }
    try { S.name = localStorage.getItem(S.key + '-name') || ''; } catch (e) { S.name = ''; }
  }
  window.addEventListener('beforeunload', () => S.finish());
  window.addEventListener('pagehide', () => S.finish());
  return S.data;
};
S.get = function (k) { try { return S.api ? String(S.api.LMSGetValue(k) || '') : ''; } catch (e) { return ''; } };
S.set = function (k, v) { try { if (S.api) S.api.LMSSetValue(k, String(v)); } catch (e) { /* */ } };
S.commit = function () { try { if (S.api) S.api.LMSCommit(''); } catch (e) { /* */ } };
S.save = function (data) {
  S.data = data;
  const txt = JSON.stringify(data);
  if (S.lms) { S.set('cmi.suspend_data', txt.slice(0, 4000)); S.set('cmi.core.exit', 'suspend'); S.commit(); }
  else { try { localStorage.setItem(S.key, txt); } catch (e) { /* */ } }
};
S.setName = function (n) { S.name = n; if (!S.lms) { try { localStorage.setItem(S.key + '-name', n); } catch (e) { /* */ } } };
/* Ergebnis melden: bestes Ergebnis zählt */
S.reportScore = function (score, passed) {
  if (!S.lms) return;
  const prev = parseFloat(S.get('cmi.core.score.raw'));
  const best = isNaN(prev) ? score : Math.max(prev, score);
  S.set('cmi.core.score.min', 0); S.set('cmi.core.score.max', 100); S.set('cmi.core.score.raw', best);
  const st = S.get('cmi.core.lesson_status');
  S.set('cmi.core.lesson_status', (passed || st === 'passed' || best >= 70) ? 'passed' : 'failed');
  S.commit();
};
S.sessionTime = function (ms) {
  const s = Math.floor(ms / 1000); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
  return String(h).padStart(4, '0') + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
};
S.t0 = Date.now(); S.finished = false;
S.finish = function () {
  if (S.finished || !S.lms) return; S.finished = true;
  S.set('cmi.core.session_time', S.sessionTime(Date.now() - S.t0));
  S.commit();
  try { S.api.LMSFinish(''); } catch (e) { /* */ }
};
})();
