// Screenshots für die READMEs: node tools/screenshots/shots.mjs packages [paket ...]
import { resolve } from 'node:path';
import { launch } from './cdp.mjs';
const PKG = resolve(process.argv[2] || 'packages').replace(/\\/g, '/');
const only = process.argv.slice(3);
const url = p => 'file:///' + PKG + '/' + p + '/src/index.html';
const out = (p, n) => PKG + '/' + p + '/screenshots/' + n + '.webp';
const b = await launch(1400, 900);
const clickText = (sel, txt) => b.eval(`(function(){ var e = [...document.querySelectorAll('${sel}')].find(x => x.textContent.trim().indexOf(${JSON.stringify(txt)}) === 0); if (e) e.click(); return !!e; })()`);

const scenes = {
  async 'plug-and-pray'(){
    const p = 'plug-and-pray';
    await b.size(1400, 1140);
    await b.goto(url(p));
    // Entdecken: GPU angeklickt, Steckbrief mit Nahansicht
    await b.eval(`EXP.sel = 'gpu'; expRender(); expInfo(); 1`); await b.sleep(400);
    await b.shot(out(p, 'entdecken'));
    // Werkbank: Mainboard ausgebaut, einige Details entdeckt
    await b.eval(`EXP_ORDER.forEach(function(id){ expRemove(EXP.S, id); EXP.removed.push(id); }); EXP.view = 'board'; STORE.hs = ['socket','dimm','pcie16','m2','atx','eps','sata','chipset','cmos']; EXP.hotSel = 'm2'; EXP.sel = null; expRender(); expInfo(); 1`); await b.sleep(400);
    await b.shot(out(p, 'werkbank'));
    // Üben: Aufgabe SATA-SSD, Stromstecker ausgewählt
    await b.eval(`showTab('ueb'); var c = UEB.ctx; c.locked = false; UEB.preOk = true;
      function P(id, z){ tryPlace(c, item(c, id), z); }
      P('psu_ok','psu'); P('board','board'); P('cpu_ok','socket'); P('ram_ok','dimm1'); P('ram_ok','dimm3'); c.S.paste = 'ok'; P('cooler','socket'); P('ssd_ok','m2'); P('gpu_ok','pcie16');
      UEB.cur = 6; uebStep(); c.locked = false; P('sata_ok','bay'); P('plug_sdata','sata'); UEB.tips = 1; uebRight(); c.sel = 'plug_spwr'; renderBuild(c); say(c, '', '👉 Jetzt auf den passenden Platz im Gehäuse tippen.'); window.scrollTo(0, 140); 1`); await b.sleep(500);
    await b.shot(out(p, 'ueben'));
    // Kompetenznachweis: halb gebaut
    await b.eval(`showTab('kn'); knBuild(); var c = KN.ctx; c.pop.hidden = true; c.locked = false; ck(c, 'prep', true);
      function P(id, z){ tryPlace(c, item(c, id), z); }
      P('psu_ok','psu'); P('board','board'); P('cpu_ok','socket'); P('ram_ok','dimm1'); P('ram_ok','dimm3'); c.S.paste = 'ok'; P('cooler','socket'); P('ssd_ok','m2'); P('gpu_ok','pcie16'); P('sata_ok','bay');
      ['fan_rear','fan_f1'].forEach(function(z){ P('fans', z); }); c.S.fans.fan_rear = 'out'; c.S.fans.fan_f1 = 'in'; renderBuild(c); knRight(); window.scrollTo(0, 60); 1`); await b.sleep(500);
    await b.shot(out(p, 'kompetenznachweis'));
    await b.size(1400, 900);
  },
  async 'netzwerktopologien'(){
    const p = 'netzwerktopologien';
    await b.goto(url(p));
    await b.click(645, 447); await b.sleep(500);   // Switch ausfallen lassen
    await b.shot(out(p, 'entdecken'));
    await clickText('[data-tab]', '② Umbauen'); await b.sleep(500);
    await b.shot(out(p, 'umbauen'));
    await clickText('[data-tab]', '③ Lernzielkontrolle'); await b.sleep(500);
    await clickText('button', '▶ Lernzielkontrolle starten'); await b.sleep(600);
    await b.shot(out(p, 'lernzielkontrolle'));
  },
  async 'strukturierte-verkabelung'(){
    const p = 'strukturierte-verkabelung';
    await b.goto(url(p));
    await b.shot(out(p, 'planen'));
    await clickText('[data-tab]', '📋 Cheat Sheet'); await b.sleep(500);
    await b.shot(out(p, 'cheatsheet'));
  },
  async 'shell-yeah'(){
    const p = 'shell-yeah';
    await b.goto(url(p)); await b.sleep(1000);
    await b.click(990, 500); await b.sleep(400); await b.click(990, 500); await b.sleep(300);
    for (const c of ['ls', 'ls -l', 'pwd']) await b.cmd(c, 600);
    await b.shot(out(p, 'tutorial'));
    await b.eval(`document.querySelector('[data-view="prac"]').click(); 1`); await b.sleep(600);
    await b.click(990, 500); await b.sleep(200);
    for (const c of ['ls ~/post', 'mkdir ~/kunden', 'mv ~/post/kunden* ~/kunden/', 'ls -la ~/kunden']) await b.cmd(c, 500);
    await b.shot(out(p, 'ueben'));
    await b.eval(`document.querySelector('[data-view="exam"]').click(); 1`); await b.sleep(600);
    await clickText('button', 'Nachweis starten'); await b.sleep(900);
    await b.click(990, 500); await b.sleep(300);
    for (const c of ['ls -la ~/eingang']) await b.cmd(c, 600);
    await b.shot(out(p, 'kompetenznachweis'));
  },
  async 'get-going'(){
    const p = 'get-going';
    await b.goto(url(p));
    await b.shot(out(p, 'start'));
    await b.eval(`document.querySelector('[data-mode="tut"]').click(); 1`); await b.sleep(600);
    await clickText('button', 'OK'); await b.sleep(300);
    await b.click(990, 600); await b.sleep(200);
    for (const c of ['Get-Date', 'Get-Service | Where-Object Status -eq Running | Select-Object -First 6']) await b.cmd(c, 700);
    await b.shot(out(p, 'tutorial'));
    await b.eval(`document.querySelector('[data-mode="ueb"]').click(); 1`); await b.sleep(600);
    await b.eval(`(function(){ var e = [...document.querySelectorAll('*')].filter(x => x.children.length === 0 && x.textContent.trim() === 'Spurensuche mit der Pipeline')[0]; (e.closest('button,a,[data-m],[data-id],.card,div') || e).click(); return 1; })()`); await b.sleep(800);
    await clickText('button', 'OK'); await b.sleep(300);
    await b.click(990, 600); await b.sleep(200);
    await b.cmd('Get-Process | Sort-Object WS -Descending | Select-Object -First 5 Name, Id, WS', 800);
    await b.shot(out(p, 'ueben'));
  }
};
for (const [name, fn] of Object.entries(scenes)) if (!only.length || only.includes(name)) await fn();
await b.close();
