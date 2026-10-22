/* Get-Going! – Szenario Schreinerei Maier (Kompetenznachweis) */
(function () {
'use strict';
const GG = globalThis.GG = globalThis.GG || {};
const { d, f, R } = GG;
const S = GG.S;
const ago = (dd, h) => GG.ago(dd, h);

S.adMaier = function () {
  const dn = 'DC=maier,DC=intern';
  const ad = { domain: 'maier.intern', netbios: 'MAIER', dn, sidBase: 'S-1-5-21-1187234511-3020441872-998123044', nextRid: 1400, dcHost: 'MAIER-DC01', dcIp: '192.168.50.5', minPw: 8, guid: '4a1b7c22-0e9d-4f31-9b8a-1c2d3e4f5a6b', containers: ['CN=Users,' + dn, 'CN=Computers,' + dn, 'CN=Builtin,' + dn], ous: [], users: [], groups: [], computers: [] };
  const OU = (name, parent, desc) => { ad.ous.push({ kind: 'ou', name, parent, desc: desc || '', protected: true, created: ago(800), guid: GG.adGuid() }); return 'OU=' + name + ',' + parent; };
  OU('Domain Controllers', dn, 'Standardcontainer für Domänencontroller');
  const M = OU('Maier', dn, 'Schreinerei Maier');
  const MA = OU('Mitarbeiter', M); const GR = OU('Gruppen', M); const CO = OU('Computer', M);
  let rid = 1105;
  const U = (sam, given, sur, parent, o) => { const u = Object.assign({ kind: 'user', sam, given, sur, name: (given ? given + ' ' + sur : sam), parent, enabled: true, upn: sam + '@maier.intern', mail: sam + '@schreinerei-maier.de', created: ago(300 + rid % 200), pwdSet: ago(10 + rid % 60), lastLogon: ago(rid % 5, rid % 7), pwd: 'Init!' + sam + '26', guid: GG.adGuid(), rid: rid++, primaryGroup: 'Domänen-Benutzer', city: 'Kronach', company: 'Schreinerei Maier' }, o || {}); ad.users.push(u); return u; };
  const u = {
    administrator: U('Administrator', null, null, 'CN=Users,' + dn, { name: 'Administrator', upn: null, mail: null, rid: 500, desc: 'Vordefiniertes Konto für die Verwaltung des Computers bzw. der Domäne' }),
    korbwerk: U('korbwerk', 'Korbwerk', 'IT-Service', 'CN=Users,' + dn, { name: 'Korbwerk IT-Service', desc: 'Externer IT-Dienstleister', mail: 'service@korbwerk.de' }),
    hmaier: U('hmaier', 'Hans', 'Maier', MA, { dept: 'Geschäftsführung', title: 'Schreinermeister und Inhaber' }),
    smaier: U('smaier', 'Susanne', 'Maier', MA, { dept: 'Büro', title: 'Büroleitung' }),
    pwinkler: U('pwinkler', 'Petra', 'Winkler', MA, { dept: 'Büro', title: 'Buchhaltung' }),
    ahofer: U('ahofer', 'Andreas', 'Hofer', MA, { dept: 'Werkstatt', title: 'Geselle' }),
    jfuchs: U('jfuchs', 'Julia', 'Fuchs', MA, { dept: 'Werkstatt', title: 'Gesellin' }),
    mbraun: U('mbraun', 'Max', 'Braun', MA, { dept: 'Werkstatt', title: 'Auszubildender' })
  };
  const G = (name, parent, members, o) => { ad.groups.push(Object.assign({ kind: 'group', name, sam: name, parent, scope: 'Global', category: 'Security', members: members.map(m => u[m]), created: ago(700), guid: GG.adGuid(), rid: rid++ }, o || {})); };
  G('Domänen-Admins', 'CN=Users,' + dn, ['administrator'], { rid: 512, desc: 'Designierte Administratoren der Domäne' });
  G('Domänen-Benutzer', 'CN=Users,' + dn, [], { rid: 513, desc: 'Alle Domänenbenutzer' });
  G('Domänencomputer', 'CN=Users,' + dn, [], { rid: 515, desc: 'Alle Arbeitsstationen und Server, die der Domäne beigetreten sind' });
  G('IT-Dienstleister', GR, ['korbwerk'], { desc: 'Externe Administratoren (Korbwerk) – lokale Admins auf allen Rechnern' });
  G('GG-Buero', GR, ['smaier', 'pwinkler', 'hmaier'], { desc: 'Büro' });
  G('GG-Alle', GR, ['hmaier', 'smaier', 'pwinkler', 'ahofer', 'jfuchs', 'mbraun'], { desc: 'Alle Mitarbeiter' });
  const C = (name, parent, os, ip) => ad.computers.push({ kind: 'computer', name, parent, os, osVersion: '10.0 (26100)', enabled: true, lastLogon: ago(1), created: ago(500), guid: GG.adGuid(), rid: rid++, ip });
  C('MAIER-DC01', 'OU=Domain Controllers,' + dn, 'Windows Server 2025 Standard', '192.168.50.5');
  C('MAIER-SRV01', CO, 'Windows Server 2025 Standard', '192.168.50.10');
  C('MAIER-KASSE01', CO, 'Windows 11 Pro', '192.168.50.21');
  return ad;
};

S.netMaier = function () {
  const kw = S.netKorbwerk();
  const netw = new GG.Network();
  netw.segments = [{ cidr: '192.168.50.0/24', router: '192.168.50.1' }];
  netw.hosts = [
    { name: 'maier-gw', ip: '192.168.50.1', seg: '192.168.50.0/24', os: 'router', internet: true, routes: [], icmp: true, ports: [80, 443] },
    { name: 'MAIER-NAS', ip: '192.168.50.30', seg: '192.168.50.0/24', os: 'linux', icmp: true, ports: [80, 443, 445] }
  ];
  netw.external = kw.external; netw.internetIPs = kw.internetIPs;
  return netw;
};

GG.buildMaier = function () {
  const netw = S.netMaier();
  const ad = S.adMaier();
  const ITD = 'MAIER\\IT-Dienstleister', DU = 'MAIER\\Domänen-Benutzer';
  const opts = (o) => Object.assign({ domain: 'maier.intern', netbios: 'MAIER', dcName: 'MAIER-DC01', user: 'korbwerk', adminGroup: ITD }, o);
  const log = (lines) => lines.join('\n') + '\n';
  const p2 = n => String(n).padStart(2, '0');
  const t = (days, h) => { const x = ago(days, h || 0); return `${p2(x.getDate())}.${p2(x.getMonth() + 1)}.${x.getFullYear()} ${p2(x.getHours())}:${p2(x.getMinutes())}`; };
  const inventar = '# inventar.ps1 - Inventarisierung (aus dem Internet geladen)\n$os = Get-CimInstance Win32_OperatingSystem\n$cs = Get-CimInstance Win32_ComputerSystem\n[PSCustomObject]@{\n    Computer = $cs.Name\n    Domaene  = $cs.Domain\n    System   = $os.Caption\n    Version  = $os.Version\n    Datum    = (Get-Date -Format "yyyy-MM-dd")\n} | ConvertTo-Json | Set-Content C:\\Berichte\\inventar.json\nWrite-Host "Inventar gespeichert unter C:\\Berichte\\inventar.json" -ForegroundColor Green\n';

  const srv = S.baseServer(opts({
    host: 'MAIER-SRV01',
    services: [S.svc('MapsBroker', 'Download-Manager für Karten', 'Stopped', 'Automatic'), S.svc('sppsvc', 'Software Protection', 'Stopped', 'Automatic'), S.svc('MaierBackup', 'Maier Datensicherung', 'Stopped', 'Disabled', { path: 'C:\\Program Files\\MaierTools\\MaierBackup.exe', desc: 'Sichert C:\\Daten und C:\\Freigaben auf MAIER-NAS' })],
    procs: [{ id: 6620, name: 'MaierUpdater', cpu: 9123.4, ws: 287 * 1048576, pm: 270 * 1048576, handles: 1210, user: 'SYSTEM', si: 0, company: 'Maier Software', desc: 'MaierTools Update-Prüfung', path: 'C:\\Program Files\\MaierTools\\MaierUpdater.exe', version: '1.0.4', start: ago(6) }],
    programFiles: [d('MaierTools', [f('MaierBackup.exe', 1443200, { mtime: ago(200) }), f('MaierUpdater.exe', 2213200, { mtime: ago(200) }), f('backup.ini', '[Backup]\nZiel=\\\\MAIER-NAS\\backup\n', { mtime: ago(200) })])],
    shares: [{ name: 'Buero', path: 'C:\\Freigaben\\Buero', desc: 'Büro', access: [{ account: 'MAIER\\GG-Buero', right: 'Change', type: 'Allow' }] }],
    dailyEvents: [{ log: 'Application', h: 7, level: 'Warning', source: 'MaierUpdater', id: 12, msg: 'Updateserver nicht erreichbar. Neuer Versuch in 5 Minuten.' }],
    volumes: [{ letter: 'C', label: '', size: 136301264896, free: 71236112384 }, { letter: 'D', label: 'Daten', size: 268435456000, free: 65895534592 }],
    D: d('D:', [d('Fotos', [f('Kuechen_2026.zip', 2147483648, { mtime: ago(20) })]), d('Zeichnungen', [f('Treppe_Huber.dwg', 3301234, { mtime: ago(9) })])], { acl: [R(S.SYS, 'F'), R(S.ADM, 'F'), R(ITD, 'M')], ctime: ago(400) }),
    rootDirs: [
      d('Freigaben', [
        d('Buero', [f('Angebote.xlsx', 44120, { mtime: ago(2) }), f('Kundenliste.xlsx', 61230, { mtime: ago(4) })]),
        d('Werkstatt', [f('Zuschnittliste.xlsx', 22003, { mtime: ago(1) }), f('Maschinenwartung.docx', 31200, { mtime: ago(30) })])
      ], { acl: [R(ITD, 'M'), R(DU, 'RX')], ctime: ago(400) }),
      d('Daten', [d('Rechnungen', [1, 2, 3, 4, 5].map(k => f(`RE-2026-1${k}0.pdf`, 120000 + k * 4100, { mtime: ago(k * 3) })))], { acl: [R(ITD, 'M')], ctime: ago(400) }),
      d('Logs', [
        f('kasse.log', log([`${t(3, 9)} INFO   Kasse gestartet`, `${t(3, 8)} FEHLER Bondrucker nicht bereit`, `${t(2, 10)} INFO   Tagesabschluss erstellt`, `${t(2, 9)} FEHLER Druckwarteschlange angehalten`, `${t(1, 9)} FEHLER Bondrucker nicht bereit`, `${t(1, 2)} INFO   Tagesabschluss erstellt`, `${t(0, 3)} INFO   Kasse gestartet`]), { mtime: ago(0, 3) }),
        f('sync-2026-10-18.log', log(['Sync ok']), { mtime: ago(4) }), f('sync-2026-10-10.log', log(['Sync ok']), { mtime: ago(12) }),
        f('sync-2026-09-01.log', log(['Sync ok']), { mtime: ago(51) }), f('sync-2026-08-01.log', log(['Sync ok']), { mtime: ago(82) }), f('sync-2026-07-01.log', log(['Sync Fehler: NAS nicht erreichbar']), { mtime: ago(113) }),
        d('Archiv', [])
      ], { acl: [R(ITD, 'M')], ctime: ago(400) }),
      d('Skripte', [f('inventar.ps1', inventar, { zone: 3, zoneRef: 'https://scripts.example.org/inventar.ps1', mtime: ago(1) })], { acl: [R(ITD, 'M')], ctime: ago(400) }),
      d('Import', [f('werkstatt.csv', 'Vorname;Nachname;Benutzername;Abteilung\nTobias;Hahn;thahn;Werkstatt\nSabine;Ernst;sernst;Werkstatt\nKevin;Lorenz;klorenz;Werkstatt\n', { mtime: ago(1) })], { acl: [R(ITD, 'M')] }),
      d('Berichte', [], { acl: [R(ITD, 'M')] }), d('Backup', [], { acl: [R(ITD, 'M')] })
    ]
  }));
  srv.users.push({ name: 'praktikant', fullName: 'Praktikant Sommer', desc: 'Praktikum Juli/August', enabled: true, rid: 1003, pwSet: ago(100), lastLogon: ago(60), pw: 'Sommer!2026' });
  srv.groups.find(g => g.name === 'Benutzer').members.push('MAIER-SRV01\\praktikant');
  srv.packages = [];
  srv.ad = ad;
  // absichtlich falsch: /16, falsches Gateway, öffentlicher DNS
  S.adapter(srv, 'Ethernet', 4, '192.168.50.10', 16, '192.168.5.1', ['8.8.8.8'], '192.168.50.0/24');
  const icmp = srv.firewall.rules.find(x => x.name === 'FPS-ICMP4-ERQ-In'); if (icmp) icmp.enabled = false;
  netw.add(srv);

  const dc = S.baseServer(opts({ host: 'MAIER-DC01', dc: true, services: [S.svc('NTDS', 'Active Directory-Domänendienste', 'Running', 'Automatic', { canStop: false }), S.svc('DNS', 'DNS-Server', 'Running', 'Automatic'), S.svc('ADWS', 'Active Directory-Webdienste', 'Running', 'Automatic'), S.svc('Kdc', 'Kerberos-Schlüsselverteilungscenter', 'Running', 'Automatic', { canStop: false })], fw: { dns: true, dc: true } }));
  dc.users = []; dc.groups = [];
  dc.dnsServer = true; dc.ad = ad;
  dc.dnsZones = { 'maier.intern': { '@': '192.168.50.5', 'maier-dc01': '192.168.50.5', 'maier-srv01': '192.168.50.10', 'maier-kasse01': '192.168.50.21', 'maier-gw': '192.168.50.1', 'maier-nas': '192.168.50.30' } };
  S.adapter(dc, 'Ethernet', 3, '192.168.50.5', 24, '192.168.50.1', ['127.0.0.1'], '192.168.50.0/24');
  netw.add(dc);

  const kasse = S.baseServer(opts({ host: 'MAIER-KASSE01', os: 'Microsoft Windows 11 Pro', volumes: [{ letter: 'C', label: '', size: 255012843520, free: 151200000000 }] }));
  const sp = kasse.services.find(s => s.name === 'Spooler'); sp.status = 'Stopped'; sp.start = 'Disabled';
  kasse.processes = kasse.processes.filter(p => p.name !== 'spoolsv');
  kasse.ad = ad;
  S.adapter(kasse, 'Ethernet', 5, '192.168.50.21', 24, '192.168.50.1', ['192.168.50.5'], '192.168.50.0/24');
  netw.add(kasse);

  return { netw, main: srv, worlds: { 'MAIER-SRV01': srv, 'MAIER-DC01': dc, 'MAIER-KASSE01': kasse }, ad };
};
})();
