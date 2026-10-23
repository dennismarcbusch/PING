// Minimaler CDP-Treiber für Edge headless: Seite öffnen, JS ausführen, tippen, Screenshot.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function launch(w = 1400, h = 900){
  const port = 9300 + Math.floor(Math.random() * 500);
  const prof = join(tmpdir(), 'cdp-prof-' + port);
  const proc = spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + prof, '--no-first-run', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=' + w + ',' + h, 'about:blank'], { stdio: 'ignore' });
  let list;
  for (let i = 0; i < 50; i++){ try { list = await (await fetch('http://127.0.0.1:' + port + '/json')).json(); break; } catch { await sleep(200); } }
  const page = list.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pend = {};
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pend[m.id]){ pend[m.id](m); delete pend[m.id]; } });
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend[i] = m => m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  const api = {
    send,
    async goto(url){ await send('Page.navigate', { url }); await sleep(1500); },
    async eval(expr){ const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; },
    async type(text){ await send('Input.insertText', { text }); },
    async key(key, code, keyCode){ for (const t of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type: t, key, code: code || key, windowsVirtualKeyCode: keyCode || ({ Enter: 13, Tab: 9, Escape: 27 })[key] || 0, text: t === 'keyDown' && key === 'Enter' ? '\r' : undefined }); },
    async cmd(text, wait = 400){ await api.type(text); await api.key('Enter'); await sleep(wait); },
    async click(x, y){ for (const t of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type: t, x, y, button: 'left', clickCount: 1 }); },
    async shot(file, clip){
      const p = { format: 'webp', quality: 88 };
      if (clip) p.clip = Object.assign({ scale: 1 }, clip);
      const r = await send('Page.captureScreenshot', p);
      mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, Buffer.from(r.data, 'base64'));
      console.log('shot', file);
    },
    sleep,
    async size(w, h){ await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }); },
    async close(){ try { await send('Browser.close'); } catch {} proc.kill(); }
  };
  return api;
}
