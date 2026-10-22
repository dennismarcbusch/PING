/* Get-Going! – Szenario Korbwerk IT-Service (Tutorial & Üben) */
(function () {
'use strict';
const GG = globalThis.GG = globalThis.GG || {};
const { d, f, R } = GG;
const ago = (dd, h) => GG.ago(dd, h);

/* ---------- gemeinsame Bausteine ---------- */
GG.S = GG.S || {};
const S = GG.S;
S.ADM = 'VORDEFINIERT\\Administratoren'; S.SYS = 'NT-AUTORITÄT\\SYSTEM';
S.userHome = (user, ident, extra) => d(user, [
  d('Desktop', (extra && extra.desktop) || []), d('Documents', (extra && extra.docs) || []), d('Downloads', (extra && extra.downloads) || []),
  d('Music', []), d('Pictures', []), d('Videos', []), d('Favorites', []), d('Links', []), d('Saved Games', []), d('Searches', []), d('Contacts', []),
  d('AppData', [d('Local', (extra && extra.local) || [d('Temp', [])]), d('Roaming', [d('Microsoft', [])]), d('LocalLow', [])], { hidden: true })
], { owner: ident, acl: [R(S.SYS, 'F'), R(S.ADM, 'F'), R(ident, 'F')], protectedAcl: true, ctime: ago(200) });
S.windowsDir = () => d('Windows', [
  d('System32', [
    d('WindowsPowerShell', [d('v1.0', [f('powershell.exe', 450560, { mtime: ago(120) }), f('powershell_ise.exe', 241664), d('Modules', [])])]),
    d('drivers', [d('etc', [f('hosts', '# Copyright (c) 1993-2009 Microsoft Corp.\n#\n# Dies ist eine HOSTS-Beispieldatei, die von Microsoft TCP/IP für Windows verwendet wird.\n#\n# localhost name resolution is handled within DNS itself.\n#\t127.0.0.1       localhost\n#\t::1             localhost\n', { mtime: ago(400) })])]),
    d('LogFiles', [d('Firewall', [])]), d('config', [], { acl: [R(S.SYS, 'F'), R(S.ADM, 'F')], protectedAcl: true }),
    f('notepad.exe', 360448, { mtime: ago(120) }), f('cmd.exe', 323584, { mtime: ago(120) }), f('PING.EXE', 22528, { mtime: ago(120) }), f('ipconfig.exe', 36864, { mtime: ago(120) }),
    f('icacls.exe', 41472, { mtime: ago(120) }), f('whoami.exe', 73728, { mtime: ago(120) }), f('winget.exe', 26112, { mtime: ago(40) }), f('ServerManager.exe', 2531328, { mtime: ago(120) }),
    f('mmc.exe', 1999872, { mtime: ago(120) }), f('taskmgr.exe', 1630208, { mtime: ago(120) }), f('calc.exe', 28672, { mtime: ago(120) })
  ]),
  d('Temp', [f('setup-1F3A.log', 'Setup abgeschlossen.\n', { mtime: ago(30) })], { acl: [R(S.SYS, 'F'), R(S.ADM, 'F')], protectedAcl: true }),
  d('Logs', [d('CBS', [f('CBS.log', 8812331, { mtime: ago(1) })]), d('WindowsUpdate', [])]),
  d('Fonts', [], { system: true }), d('Web', []), d('SysWOW64', []),
  f('explorer.exe', 5419008, { mtime: ago(120) }), f('notepad.exe', 360448, { mtime: ago(120) }), f('regedit.exe', 393216, { mtime: ago(120) }),
  f('win.ini', '; for 16-bit app support\n[fonts]\n[extensions]\n[mci extensions]\n[files]\n[Mail]\nMAPI=1\n', { mtime: ago(400) }), f('system.ini', '; for 16-bit app support\n[386Enh]\nwoafont=dosapp.fon\n', { mtime: ago(400) })
], { acl: [R(S.SYS, 'F'), R(S.ADM, 'F'), R('VORDEFINIERT\\Benutzer', 'RX'), R('ERSTELLER-BESITZER', 'F', { io: true })], protectedAcl: true, ctime: ago(500) });
S.programFiles = (extra) => d('Program Files', [
  d('Common Files', []), d('Internet Explorer', [f('iexplore.exe', 829952)]), d('Windows Defender', [f('MpCmdRun.exe', 1089536)]),
  d('WindowsPowerShell', [d('Modules', [d('PackageManagement', []), d('PowerShellGet', []), d('Pester', []), d('PSReadline', [])])]),
  d('PackageManagement', [d('ProviderAssemblies', [])])
].concat(extra || []), { acl: [R(S.SYS, 'F'), R(S.ADM, 'F'), R('VORDEFINIERT\\Benutzer', 'RX')], protectedAcl: true, ctime: ago(500) });

S.svc = (name, display, status, start, o) => Object.assign({ name, display, status, start, deps: [] }, o || {});
S.stdServices = () => [
  S.svc('AppIDSvc', 'Anwendungsidentität', 'Stopped', 'Manual'), S.svc('Appinfo', 'Anwendungsinformationen', 'Running', 'Manual'),
  S.svc('BFE', 'Basisfiltermodul', 'Running', 'Automatic'), S.svc('BITS', 'Intelligenter Hintergrundübertragungsdienst', 'Stopped', 'Manual'),
  S.svc('CryptSvc', 'Kryptografiedienste', 'Running', 'Automatic'), S.svc('DcomLaunch', 'DCOM-Server-Prozessstart', 'Running', 'Automatic', { canStop: false }),
  S.svc('Dhcp', 'DHCP-Client', 'Running', 'Automatic'), S.svc('Dnscache', 'DNS-Client', 'Running', 'Automatic', { canStop: false }),
  S.svc('EventLog', 'Windows-Ereignisprotokoll', 'Running', 'Automatic'), S.svc('gpsvc', 'Gruppenrichtlinienclient', 'Running', 'Automatic', { canStop: false }),
  S.svc('LanmanServer', 'Server', 'Running', 'Automatic', { deps: ['SamSS'] }), S.svc('LanmanWorkstation', 'Arbeitsstationsdienst', 'Running', 'Automatic'),
  S.svc('MpsSvc', 'Windows Defender Firewall', 'Running', 'Automatic', { deps: ['BFE'] }), S.svc('Netlogon', 'Anmeldedienst', 'Running', 'Automatic', { deps: ['LanmanWorkstation'] }),
  S.svc('NlaSvc', 'Netzwerkstandorterkennung', 'Running', 'Automatic'), S.svc('PlugPlay', 'Plug & Play', 'Running', 'Manual'),
  S.svc('RemoteRegistry', 'Remoteregistrierung', 'Stopped', 'Manual'), S.svc('RpcSs', 'Remoteprozeduraufruf (RPC)', 'Running', 'Automatic', { canStop: false }),
  S.svc('SamSS', 'Sicherheitskonto-Manager', 'Running', 'Automatic', { canStop: false }), S.svc('Schedule', 'Aufgabenplanung', 'Running', 'Automatic', { canStop: false }),
  S.svc('seclogon', 'Sekundäre Anmeldung', 'Stopped', 'Manual'), S.svc('Spooler', 'Druckwarteschlange', 'Running', 'Automatic'),
  S.svc('TermService', 'Remotedesktopdienste', 'Running', 'Manual'), S.svc('TrustedInstaller', 'Windows Modules Installer', 'Stopped', 'Manual'),
  S.svc('UsoSvc', 'Orchestrator-Dienst aktualisieren', 'Running', 'Automatic'), S.svc('VSS', 'Volumeschattenkopie', 'Stopped', 'Manual'),
  S.svc('W32Time', 'Windows-Zeitgeber', 'Running', 'Manual'), S.svc('WinDefend', 'Microsoft Defender Antivirus-Dienst', 'Running', 'Automatic', { canStop: false }),
  S.svc('WinRM', 'Windows-Remoteverwaltung (WS-Verwaltung)', 'Running', 'Automatic'), S.svc('Winmgmt', 'Windows-Verwaltungsinstrumentation', 'Running', 'Automatic'),
  S.svc('wuauserv', 'Windows Update', 'Stopped', 'Manual'), S.svc('wmiApSrv', 'WMI-Leistungsadapter', 'Stopped', 'Manual')
];
let pidSeed = 600;
S.proc = (name, o) => Object.assign({ id: (pidSeed += 52), name, cpu: Math.round(Math.random() * 400) / 100, ws: (8 + Math.floor(Math.random() * 30)) * 1048576, handles: 150 + Math.floor(Math.random() * 700), user: 'SYSTEM', si: 0, company: 'Microsoft Corporation' }, o || {});
S.stdProcs = (user) => {
  pidSeed = 600;
  return [
    { id: 0, name: 'Idle', cpu: 0, ws: 8192, handles: 0, user: 'SYSTEM', si: 0 }, { id: 4, name: 'System', cpu: 1712.33, ws: 154 * 1024, handles: 2654, user: 'SYSTEM', si: 0 },
    S.proc('Registry', { ws: 72 * 1048576, handles: 0 }), S.proc('smss', { ws: 1.2 * 1048576, handles: 53 }), S.proc('csrss', { handles: 512 }), S.proc('csrss', { si: 1, handles: 401 }),
    S.proc('wininit', { handles: 162 }), S.proc('services', { handles: 690 }), S.proc('lsass', { ws: 21 * 1048576, handles: 1388 }), S.proc('winlogon', { si: 1, handles: 280 }),
    S.proc('svchost', { svc: ['RpcSs'] }), S.proc('svchost', { svc: ['DcomLaunch', 'PlugPlay'] }), S.proc('svchost', { svc: ['Dnscache', 'NlaSvc'], user: 'NETZWERKDIENST' }), S.proc('svchost', { svc: ['EventLog'], user: 'LOKALER DIENST' }),
    S.proc('svchost', { svc: ['Schedule', 'gpsvc'] }), S.proc('svchost', { svc: ['WinRM'], user: 'NETZWERKDIENST' }), S.proc('svchost', { svc: ['LanmanServer'] }), S.proc('svchost', { svc: ['BFE', 'MpsSvc'], user: 'LOKALER DIENST' }),
    S.proc('spoolsv', { svc: ['Spooler'], ws: 14 * 1048576, handles: 420, path: 'C:\\Windows\\System32\\spoolsv.exe' }), S.proc('MsMpEng', { ws: 212 * 1048576, cpu: 412.8, handles: 990 }),
    S.proc('WmiPrvSE', { user: 'NETZWERKDIENST' }), S.proc('dwm', { si: 1, ws: 64 * 1048576, user: 'DWM-1', handles: 820 }),
    S.proc('explorer', { si: 1, user, ws: 98 * 1048576, handles: 2311, cpu: 12.4, path: 'C:\\Windows\\explorer.exe' }), S.proc('sihost', { si: 1, user, ws: 26 * 1048576 }),
    S.proc('taskhostw', { si: 1, user }), S.proc('RuntimeBroker', { si: 1, user }), S.proc('ctfmon', { si: 1, user }), S.proc('ServerManager', { si: 1, user, ws: 121 * 1048576, cpu: 9.7, path: 'C:\\Windows\\system32\\ServerManager.exe', handles: 905 }),
    { id: 5124, name: 'powershell', cpu: 1.2, ws: 72 * 1048576, handles: 612, user, si: 1, company: 'Microsoft Corporation', path: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' },
    { id: 5140, name: 'conhost', cpu: 0.3, ws: 18 * 1048576, handles: 240, user, si: 1, company: 'Microsoft Corporation' }
  ];
};
S.stdUsers = (o) => [
  { name: 'Administrator', desc: 'Vordefiniertes Konto für die Verwaltung des Computers bzw. der Domäne', enabled: true, rid: 500, pwSet: ago(380), lastLogon: ago(40), pw: 'x' },
  { name: 'DefaultAccount', desc: 'Ein vom System verwaltetes Benutzerkonto.', enabled: false, rid: 503 },
  { name: 'Gast', desc: 'Vordefiniertes Konto für Gastzugriff auf den Computer bzw. die Domäne', enabled: false, rid: 501 },
  { name: 'WDAGUtilityAccount', desc: 'Ein Benutzerkonto, das vom System für Windows Defender Application Guard-Szenarien verwaltet und verwendet wird.', enabled: false, rid: 504, pwSet: ago(380) }
].concat((o && o.extra) || []);
S.stdGroups = (host, dom, o) => [
  { name: 'Administratoren', desc: 'Administratoren haben uneingeschränkten Vollzugriff auf den Computer bzw. die Domäne.', sid: 'S-1-5-32-544', members: [host + '\\Administrator', dom + '\\Domänen-Admins'].concat((o && o.admins) || []) },
  { name: 'Benutzer', desc: 'Benutzer können keine zufälligen oder beabsichtigten Änderungen am System durchführen und dürfen die meisten herkömmlichen Anwendungen ausführen.', sid: 'S-1-5-32-545', members: ['NT-AUTORITÄT\\INTERAKTIV', 'NT-AUTORITÄT\\Authentifizierte Benutzer', dom + '\\Domänen-Benutzer'].concat((o && o.users) || []) },
  { name: 'Gäste', desc: 'Gäste besitzen standardmäßig die selben Zugriffsrechte wie die Mitglieder der Benutzergruppe.', sid: 'S-1-5-32-546', members: [host + '\\Gast'] },
  { name: 'Remotedesktopbenutzer', desc: 'Die Mitglieder dieser Gruppe haben die Berechtigung, sich remote anzumelden.', sid: 'S-1-5-32-555', members: [] },
  { name: 'Remoteverwaltungsbenutzer', desc: 'Mitglieder dieser Gruppe können über Verwaltungsprotokolle (z. B. WS-Verwaltung über den Windows-Remoteverwaltungsdienst) auf WMI-Ressourcen zugreifen.', sid: 'S-1-5-32-580', members: [] },
  { name: 'Sicherungs-Operatoren', desc: 'Sicherungs-Operatoren können Sicherheitseinschränkungen lediglich zum Sichern oder Wiederherstellen von Dateien außer Kraft setzen.', sid: 'S-1-5-32-551', members: (o && o.backup) || [] },
  { name: 'Ereignisprotokollleser', desc: 'Mitglieder dieser Gruppe dürfen Ereignisprotokolle des lokalen Computers lesen', sid: 'S-1-5-32-573', members: [] },
  { name: 'Leistungsüberwachungsbenutzer', desc: 'Mitglieder dieser Gruppe können lokal und remote auf Leistungszählerdaten zugreifen', sid: 'S-1-5-32-558', members: [] },
  { name: 'Hauptbenutzer', desc: 'Hauptbenutzer sind aus Gründen der Abwärtskompatibilität vorhanden und haben eingeschränkte administrative Rechte.', sid: 'S-1-5-32-547', members: [] }
];
S.ev = (log, list) => list.map((e, i) => Object.assign({ index: 10000 + i }, e));

/* Netzwerkadapter */
S.adapter = (w, name, ifIndex, ip, prefix, gw, dns, seg, o) => {
  w.net = w.net || { adapters: [], ip: {} };
  const mac = '00-15-5D-0A-' + (20 + ifIndex).toString(16).toUpperCase().padStart(2, '0') + '-' + (ip ? (+ip.split('.')[3]).toString(16).toUpperCase().padStart(2, '0') : '7F');
  w.net.adapters.push(Object.assign({ name, desc: 'Microsoft Hyper-V Network Adapter' + (ifIndex > 6 ? ' #2' : ''), ifIndex, enabled: true, connected: true, mac, speed: '10 Gbps', seg }, o || {}));
  w.net.ip[ifIndex] = { dhcp: !ip, addrs: ip ? [{ ip, prefix, origin: 'Manual' }] : [], gw: gw ? [gw] : [], dns: dns || [] };
};

/* Ereignisse eines Servers erzeugen */
S.eventsFor = function (w, o) {
  o = o || {};
  const sys = [], app = [], sec = [], ps = [];
  const add = (L, days, h, level, source, id, msg, user) => L.push({ time: ago(days, h), level, source, id, msg, user });
  for (let k = 6; k >= 0; k--) {
    add(sys, k, 20, 'Information', 'EventLog', 6013, `Die Systembetriebszeit beträgt ${(12 - k) * 86400 + 4021} Sekunden.`);
    add(sys, k, 18, 'Information', 'Service Control Manager', 7036, 'Der Dienst "Windows Modules Installer" befindet sich jetzt im Status "Wird ausgeführt".');
    add(sys, k, 17.5, 'Information', 'Service Control Manager', 7036, 'Der Dienst "Windows Modules Installer" befindet sich jetzt im Status "Beendet".');
    if (k % 2 === 0) add(sys, k, 14, 'Warning', 'DistributedCOM', 10016, 'Die anwendungsspezifischen Berechtigungseinstellungen gewähren dem Benutzer "NT-AUTORITÄT\\LOKALER DIENST" (SID: S-1-5-19) für die Adresse "LocalHost (unter Verwendung von LRPC)" keine Berechtigung vom Typ "Lokal Aktivierung" für die COM-Serveranwendung mit der CLSID {D63B10C5-BB46-4990-A94F-E40B9D520160}.');
    for (const e of (o.daily || [])) add(e.log === 'Application' ? app : sys, k, e.h, e.level, e.source, e.id, e.msg);
    add(sec, k, 7.6, 'Information', 'Microsoft-Windows-Security-Auditing', 4624, `Ein Konto wurde erfolgreich angemeldet.\n\nAntragsteller:\n\tKontoname:\t${w.hostname}$\n\nNeue Anmeldung:\n\tKontoname:\t${o.user || 'azubi'}`);
  }
  add(sys, 12, 3, 'Information', 'EventLog', 6005, 'Der Ereignisprotokolldienst wurde gestartet.');
  add(sys, 12, 3.2, 'Information', 'User32', 1074, `Der Prozess "C:\\Windows\\system32\\svchost.exe (${w.hostname})" hat den Vorgang "Neu starten" für den Computer "${w.hostname}" im Auftrag des Benutzers "NT-AUTORITÄT\\SYSTEM" initiiert.`);
  add(sys, 3, 9, 'Warning', 'Microsoft-Windows-DNS-Client', 1014, 'Timeout bei der Namensauflösung für den Namen "wpad", nachdem keiner der konfigurierten DNS-Server geantwortet hat.');
  add(app, 5, 11, 'Information', 'MsiInstaller', 1033, 'Windows Installer hat das Produkt installiert. Produktname: Microsoft Edge. Produktversion: 141.0.3537.85.');
  add(app, 2, 1, 'Information', 'VSS', 8224, 'Der VSS-Dienst wird aufgrund eines Leerlaufzeitlimits heruntergefahren.');
  add(app, 1, 8, 'Information', 'Microsoft-Windows-Security-SPP', 16384, 'Der Neustart des Softwareschutzdiensts wurde erfolgreich geplant.');
  for (const e of (o.extra || [])) add(e.log === 'Application' ? app : (e.log === 'Security' ? sec : sys), e.d, e.h, e.level, e.source, e.id, e.msg, e.user);
  add(ps, 0, 0.2, 'Information', 'PowerShell', 400, 'Der Modulstatus wurde von "None" in "Available" geändert.');
  const fix = L => { L.sort((a, b) => a.time - b.time); L.forEach((e, i) => { e.index = 4000 + i * 3; }); return L; };
  w.events = { System: fix(sys), Application: fix(app), Security: fix(sec), 'Windows PowerShell': fix(ps) };
};

/* ---------- Active Directory Korbwerk ---------- */
S.adKorbwerk = function () {
  const dn = 'DC=korbwerk,DC=intern';
  const ad = { domain: 'korbwerk.intern', netbios: 'KORBWERK', dn, sidBase: 'S-1-5-21-3964187341-2291847063-1810493572', nextRid: 1300, dcHost: 'KORB-DC01', dcIp: '10.20.0.10', minPw: 8, guid: '9e7c2d10-4a5b-4c3d-8e9f-0a1b2c3d4e5f', containers: ['CN=Users,' + dn, 'CN=Computers,' + dn, 'CN=Builtin,' + dn], ous: [], users: [], groups: [], computers: [] };
  const OU = (name, parent, desc) => { const o = { kind: 'ou', name, parent, desc: desc || '', protected: true, created: ago(1200), guid: GG.adGuid() }; ad.ous.push(o); return 'OU=' + name + ',' + parent; };
  OU('Domain Controllers', dn, 'Standardcontainer für Domänencontroller');
  const K = OU('Korbwerk', dn, 'Korbwerk IT-Service');
  const MA = OU('Mitarbeiter', K); const GR = OU('Gruppen', K); const CO = OU('Computer', K); const SV = OU('Server', CO); OU('Ausgeschieden', K, 'Konten ausgeschiedener Mitarbeiter'); const AZ = OU('Azubis', K);
  let rid = 1103;
  const U = (sam, given, sur, parent, o) => { const u = Object.assign({ kind: 'user', sam, given, sur, name: given + ' ' + sur, parent, enabled: true, upn: sam + '@korbwerk.intern', mail: sam + '@korbwerk.de', created: ago(300 + rid % 400), pwdSet: ago(20 + rid % 90), lastLogon: ago(rid % 6, rid % 9), pwd: 'Init!' + sam + '2026', guid: GG.adGuid(), rid: rid++, primaryGroup: 'Domänen-Benutzer', city: 'Lichtenfels', company: 'Korbwerk IT-Service' }, o || {}); ad.users.push(u); return u; };
  const users = {
    administrator: U('Administrator', null, null, 'CN=Users,' + dn, { name: 'Administrator', given: null, sur: null, upn: null, mail: null, desc: 'Vordefiniertes Konto für die Verwaltung des Computers bzw. der Domäne', rid: 500, pwNeverExpires: true }),
    gast: U('Gast', null, null, 'CN=Users,' + dn, { name: 'Gast', given: null, sur: null, upn: null, mail: null, enabled: false, desc: 'Vordefiniertes Konto für Gastzugriff auf den Computer bzw. die Domäne', rid: 501, lastLogon: null, pwd: '' }),
    krbtgt: U('krbtgt', null, null, 'CN=Users,' + dn, { name: 'krbtgt', given: null, sur: null, upn: null, mail: null, enabled: false, desc: 'Dienstkonto des Schlüsselverteilungscenters', rid: 502, lastLogon: null }),
    svc: U('svc-backup', null, null, 'CN=Users,' + dn, { name: 'svc-backup', given: null, sur: null, mail: null, desc: 'Dienstkonto Backup (von Kalle angelegt)', pwNeverExpires: true, pwdSet: ago(1500), lastLogon: ago(2) }),
    mhofmann: U('mhofmann', 'Mira', 'Hofmann', MA, { dept: 'IT', title: 'Teamleiterin IT und Ausbilderin', office: 'EG, Raum 012', phone: '+49 9571 4410-12' }),
    kwolf: U('kwolf', 'Karl-Heinz', 'Wolf', MA, { dept: 'IT', title: 'Systemadministrator', desc: 'Kalle – ausgeschieden zum 30.09.2026', office: 'EG, Raum 012', lastLogon: ago(25, 6), display: 'Kalle Wolf' }),
    azubi: U('azubi', 'Neu', 'Azubi', AZ, { name: 'Azubi (FISI)', dept: 'IT', title: 'Auszubildender Fachinformatik Systemintegration', office: 'EG, Raum 012' }),
    tbecker: U('tbecker', 'Tobias', 'Becker', MA, { dept: 'Vertrieb', title: 'Vertriebsleiter' }),
    sschuster: U('sschuster', 'Sandra', 'Schuster', MA, { dept: 'Vertrieb', title: 'Key Account Managerin' }),
    jkoch: U('jkoch', 'Jonas', 'Koch', MA, { dept: 'Vertrieb', title: 'Außendienst' }),
    aweber: U('aweber', 'Anna', 'Weber', MA, { dept: 'Vertrieb', title: 'Innendienst' }),
    mlang: U('mlang', 'Markus', 'Lang', MA, { dept: 'Vertrieb', title: 'Außendienst', lastLogon: ago(97) }),
    ckeller: U('ckeller', 'Claudia', 'Keller', MA, { dept: 'Buchhaltung', title: 'Leitung Buchhaltung' }),
    pfischer: U('pfischer', 'Paul', 'Fischer', MA, { dept: 'Buchhaltung', title: 'Buchhalter' }),
    nwagner: U('nwagner', 'Nina', 'Wagner', MA, { dept: 'Buchhaltung', title: 'Lohnbuchhalterin' }),
    rhuber: U('rhuber', 'Ralf', 'Huber', MA, { dept: 'Lager', title: 'Lagerleiter' }),
    dmeier: U('dmeier', 'Daniel', 'Meier', MA, { dept: 'Lager', title: 'Lagerist', locked: true, lockTime: ago(0, 2), badPwd: 5 }),
    lschmid: U('lschmid', 'Laura', 'Schmid', MA, { dept: 'Lager', title: 'Lageristin' }),
    fyilmaz: U('fyilmaz', 'Fatih', 'Yilmaz', MA, { dept: 'Lager', title: 'Fahrer' }),
    gkorb: U('gkorb', 'Gerhard', 'Korb', MA, { dept: 'Geschäftsführung', title: 'Geschäftsführer' }),
    ekorb: U('ekorb', 'Elke', 'Korb', MA, { dept: 'Geschäftsführung', title: 'Prokuristin' }),
    bbauer: U('bbauer', 'Bernd', 'Bauer', MA, { dept: 'Produktion', title: 'Flechtmeister' }),
    hzimmermann: U('hzimmermann', 'Heike', 'Zimmermann', MA, { dept: 'Produktion', title: 'Korbflechterin' }),
    ukraus: U('ukraus', 'Uwe', 'Kraus', MA, { dept: 'Produktion', title: 'Korbflechter', enabled: false, lastLogon: ago(210), desc: 'ausgeschieden 31.03.2026' })
  };
  const G = (name, parent, scope, members, o) => { const g = Object.assign({ kind: 'group', name, sam: name, parent, scope, category: 'Security', members: members.map(m => users[m] || m), created: ago(900), guid: GG.adGuid(), rid: rid++ }, o || {}); ad.groups.push(g); return g; };
  G('Domänen-Admins', 'CN=Users,' + dn, 'Global', ['administrator', 'mhofmann', 'kwolf'], { desc: 'Designierte Administratoren der Domäne', rid: 512 });
  G('Domänen-Benutzer', 'CN=Users,' + dn, 'Global', [], { desc: 'Alle Domänenbenutzer', rid: 513 });
  G('Domänencomputer', 'CN=Users,' + dn, 'Global', [], { desc: 'Alle Arbeitsstationen und Server, die der Domäne beigetreten sind', rid: 515 });
  G('Organisations-Admins', 'CN=Users,' + dn, 'Universal', ['administrator'], { desc: 'Designierte Administratoren des Unternehmens', rid: 519 });
  G('GG-IT', GR, 'Global', ['mhofmann', 'kwolf', 'azubi'], { desc: 'Abteilung IT' });
  G('IT-Admins', GR, 'Global', ['mhofmann', 'kwolf', 'azubi'], { desc: 'Server-Administration (lokale Admins auf Servern)' });
  G('Azubis', GR, 'Global', ['azubi'], { desc: 'Auszubildende' });
  G('GG-Vertrieb', GR, 'Global', ['tbecker', 'sschuster', 'jkoch', 'aweber', 'mlang'], { desc: 'Abteilung Vertrieb' });
  G('GG-Buchhaltung', GR, 'Global', ['ckeller', 'pfischer', 'nwagner'], { desc: 'Abteilung Buchhaltung' });
  G('GG-Lager', GR, 'Global', ['rhuber', 'dmeier', 'lschmid', 'fyilmaz'], { desc: 'Abteilung Lager' });
  G('GG-Produktion', GR, 'Global', ['bbauer', 'hzimmermann', 'ukraus'], { desc: 'Abteilung Produktion' });
  G('GG-Geschaeftsfuehrung', GR, 'Global', ['gkorb', 'ekorb'], { desc: 'Geschäftsführung' });
  G('DL-Freigabe-Daten-Aendern', GR, 'DomainLocal', [], { desc: 'Ändern-Recht auf \\\\KORB-SRV02\\Daten' });
  const C = (name, parent, os, o) => { ad.computers.push(Object.assign({ kind: 'computer', name, parent, os, osVersion: os.includes('2025') ? '10.0 (26100)' : '10.0 (26100)', enabled: true, lastLogon: ago(rid % 3), created: ago(600), guid: GG.adGuid(), rid: rid++ }, o || {})); };
  C('KORB-DC01', 'OU=Domain Controllers,' + dn, 'Windows Server 2025 Standard', { ip: '10.20.0.10' });
  C('KORB-SRV02', SV, 'Windows Server 2025 Standard', { ip: '10.20.0.12' }); C('KORB-APP01', SV, 'Windows Server 2025 Standard', { ip: '10.20.0.13' }); C('KORB-BACKUP01', SV, 'Windows Server 2022 Standard', { ip: '10.20.0.14' });
  for (let k = 1; k <= 10; k++) C('PC-' + String(k).padStart(3, '0'), CO, 'Windows 11 Pro', { osVersion: '10.0 (26100)', lastLogon: k === 7 ? ago(140) : ago(k % 4) });
  return ad;
};

/* ---------- Netzwerk Korbwerk ---------- */
S.netKorbwerk = function () {
  const netw = new GG.Network();
  netw.segments = [{ cidr: '10.20.0.0/24', router: '10.20.0.1' }, { cidr: '10.20.10.0/24', router: '10.20.10.1', dhcp: { next: () => '10.20.10.' + (100 + Math.floor(Math.random() * 50)), dns: ['10.20.0.10'] } }];
  netw.hosts = [
    { name: 'korb-fw', ip: '10.20.0.1', seg: '10.20.0.0/24', os: 'router', internet: true, routes: ['10.20.10.0/24'], icmp: true, ports: [443] },
    { name: 'korb-fw', ip: '10.20.10.1', seg: '10.20.10.0/24', os: 'router', internet: true, routes: ['10.20.0.0/24'], icmp: true },
    { name: 'KORB-SRV01', ip: '10.20.0.11', seg: '10.20.0.0/24', os: 'linux', icmp: true, ports: [22, 80, 443] },
    { name: 'PC-001', ip: '10.20.10.101', seg: '10.20.10.0/24', os: 'windows', icmp: false, ports: [] },
    { name: 'PRN-EG01', ip: '10.20.10.50', seg: '10.20.10.0/24', os: 'router', icmp: true, ports: [80, 9100] }
  ];
  netw.external = {
    'www.korbwerk.de': { ip: '203.0.113.80', mx: 'mail.korbwerk.de' }, 'korbwerk.de': { ip: '203.0.113.80', mx: 'mail.korbwerk.de' }, 'mail.korbwerk.de': '203.0.113.25',
    'www.powershellgallery.com': { ip: '13.107.246.40', cname: 'psg-prod-eastus.azureedge.net' }, 'cdn.winget.microsoft.com': '13.107.213.40', 'internetbeacon.msedge.net': '13.107.4.52',
    'learn.microsoft.com': '23.48.212.17', 'one.one.one.one': '1.1.1.1', 'dns.quad9.net': '9.9.9.9', 'www.google.de': '142.250.185.67', 'www.bsi.bund.de': '77.87.229.11', 'www.ihk.de': '217.24.32.17',
    'www.7-zip.org': '159.65.89.65', 'github.com': '140.82.121.4', 'www.baeckerei-brunner.de': '203.0.113.120', 'www.schreinerei-maier.de': '203.0.113.150'
  };
  netw.internetIPs = ['1.1.1.1', '8.8.8.8', '9.9.9.9', '203.0.113.80', '203.0.113.25', '13.107.246.40', '13.107.213.40', '13.107.4.52', '23.48.212.17', '142.250.185.67', '77.87.229.11', '217.24.32.17', '159.65.89.65', '140.82.121.4', '203.0.113.120', '203.0.113.150'];
  return netw;
};
S.zoneKorbwerk = () => ({ 'korbwerk.intern': {
  '@': '10.20.0.10', 'korb-dc01': '10.20.0.10', 'korb-srv01': '10.20.0.11', 'korb-srv02': '10.20.0.12', 'korb-app01': '10.20.0.13', 'korb-backup01': '10.20.0.14', 'korb-fw': '10.20.0.1',
  'intranet': { a: '10.20.0.13', cname: 'korb-app01.korbwerk.intern' }, 'shop': { a: '10.20.0.13', cname: 'korb-app01.korbwerk.intern' }, 'git': { a: '10.20.0.11', cname: 'korb-srv01.korbwerk.intern' },
  'pc-001': '10.20.10.101', 'prn-eg01': '10.20.10.50'
} });

/* ---------- Server-Grundgerüst ---------- */
S.baseServer = function (o) {
  const NB = o.netbios || 'KORBWERK', U0 = o.user || 'azubi';
  const w = new GG.World({ hostname: o.host, domain: o.domain || 'korbwerk.intern', domainNetbios: NB, dc: o.dcName || 'KORB-DC01', defaultUser: U0, os: o.os || 'Microsoft Windows Server 2025 Standard', isDomainController: !!o.dc });
  const id = NB + '\\' + U0;
  w.users = o.dc ? [] : S.stdUsers();
  w.groups = o.dc ? [] : S.stdGroups(o.host, NB, { admins: [o.adminGroup || 'KORBWERK\\IT-Admins'] });
  w.services = S.stdServices().concat(o.services || []);
  w.processes = S.stdProcs(U0).concat(o.procs || []);
  w.volumes = o.volumes || [{ letter: 'C', label: '', size: 136301264896, free: 95274201088 }];
  w.firewall = GG.stdFirewall(Object.assign({ icmp: true, winrm: true, rdp: true }, o.fw || {}));
  w.shares = [{ name: 'ADMIN$', path: 'C:\\Windows', desc: 'Remoteverwaltung', special: true, access: [{ account: S.ADM, right: 'Full', type: 'Allow' }] }, { name: 'C$', path: 'C:\\', desc: 'Standardfreigabe', special: true, access: [{ account: S.ADM, right: 'Full', type: 'Allow' }] }, { name: 'IPC$', path: '', desc: 'Remote-IPC', special: true, access: [] }].concat(o.shares || []);
  w.modules = [{ name: 'ActiveDirectory', version: '1.0.1.0', dir: 'C:\\Windows\\system32\\WindowsPowerShell\\v1.0\\Modules', type: 'Manifest', installed: true }];
  w.hotfixes = [{ id: 'KB5043080', desc: 'Security Update', on: ago(70) }, { id: 'KB5044284', desc: 'Update', on: ago(40) }, { id: 'KB5066131', desc: 'Security Update', on: ago(9) }];
  w.pendingUpdates = [{ kb: 'KB5068791', size: '612MB', title: '2026-10 Kumulatives Update für Microsoft server operating system, Version 24H2 für x64-basierte Systeme (KB5068791)' }, { kb: 'KB890830', size: '79MB', title: 'Windows-Tool zum Entfernen bösartiger Software x64 - v5.137 (KB890830)' }];
  w.reg = { HKLM: GG.rk('HKEY_LOCAL_MACHINE', [], [
    GG.rk('SOFTWARE', [], [
      GG.rk('Microsoft', [], [
        GG.rk('Windows NT', [], [GG.rk('CurrentVersion', [['ProductName', 'Windows Server 2025 Standard'], ['CurrentBuild', '26100'], ['DisplayVersion', '24H2'], ['EditionID', 'ServerStandard'], ['InstallationType', 'Server'], ['RegisteredOwner', 'Windows-Benutzer'], ['CurrentMajorVersionNumber', 10, 'DWord']])]),
        GG.rk('Windows', [], [GG.rk('CurrentVersion', [['ProgramFilesDir', 'C:\\Program Files'], ['CommonFilesDir', 'C:\\Program Files\\Common Files']], [GG.rk('Run', (o.runKeys || []).concat([['SecurityHealth', '%windir%\\system32\\SecurityHealthSystray.exe', 'ExpandString']])), GG.rk('Uninstall', [])])]),
        GG.rk('PowerShell', [], [GG.rk('1', [['Install', 1, 'DWord']], [GG.rk('ShellIds', [], [GG.rk('Microsoft.PowerShell', [['ExecutionPolicy', 'RemoteSigned'], ['Path', 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe']])])])]),
        GG.rk('Windows Defender', [['ProductStatus', 0, 'DWord']])
      ])
    ].concat(o.softwareKeys || [])),
    GG.rk('SYSTEM', [], [GG.rk('CurrentControlSet', [], [GG.rk('Services', [], [GG.rk('Spooler', [['DisplayName', 'Druckwarteschlange'], ['Start', 2, 'DWord']]), GG.rk('WinRM', [['DisplayName', 'Windows-Remoteverwaltung (WS-Verwaltung)'], ['Start', 2, 'DWord']])]), GG.rk('Control', [], [GG.rk('ComputerName', [], [GG.rk('ComputerName', [['ComputerName', o.host]])])])])])
  ]), HKCU: GG.rk('HKEY_CURRENT_USER', [], [GG.rk('Software', [], [GG.rk('Microsoft', [], [GG.rk('Windows', [], [GG.rk('CurrentVersion', [], [GG.rk('Explorer', [['ShellState', 'binär', 'Binary']])])])])]), GG.rk('Environment', [['TEMP', '%USERPROFILE%\\AppData\\Local\\Temp', 'ExpandString'], ['TMP', '%USERPROFILE%\\AppData\\Local\\Temp', 'ExpandString']]), GG.rk('Console', [['QuickEdit', 1, 'DWord']])]) };
  S.eventsFor(w, { daily: o.dailyEvents, extra: o.extraEvents, user: U0 });
  w.fs = {};
  w.fs.C = d('C:', [
    d('PerfLogs', [], { ctime: ago(500) }),
    S.programFiles(o.programFiles), d('Program Files (x86)', [d('Common Files', [])], { acl: [R(S.SYS, 'F'), R(S.ADM, 'F'), R('VORDEFINIERT\\Benutzer', 'RX')], protectedAcl: true }),
    d('ProgramData', [d('Microsoft', []), d('Package Cache', [])].concat(o.programData || []), { hidden: true, acl: [R(S.SYS, 'F'), R(S.ADM, 'F'), R('VORDEFINIERT\\Benutzer', 'RX')], protectedAcl: true }),
    d('Users', [
      S.userHome('Administrator', o.host + '\\Administrator'),
      S.userHome(U0, id, o.azubiHome),
      d('Public', [d('Documents', []), d('Desktop', [], { hidden: true }), d('Downloads', [])], { acl: [R(S.SYS, 'F'), R(S.ADM, 'F'), R('VORDEFINIERT\\Benutzer', 'RX'), R('Jeder', 'RX')], protectedAcl: true }),
      d('Default', [], { hidden: true })
    ].concat(o.users || []), { acl: [R(S.SYS, 'F'), R(S.ADM, 'F'), R('VORDEFINIERT\\Benutzer', 'RX'), R('Jeder', 'RX')], protectedAcl: true }),
    S.windowsDir()
  ].concat(o.rootDirs || []), { acl: GG.stdRootAcl(), owner: 'NT SERVICE\\TrustedInstaller', ctime: ago(500) });
  if (o.D) { w.fs.D = o.D; if (!w.volumes.some(v => v.letter === 'D')) w.volumes.push({ letter: 'D', label: 'Daten', size: 536737980416, free: 201382166528 }); }
  return w;
};

/* ---------- Tutorial-Welt ---------- */
GG.buildKorbwerk = function (variant) {
  variant = variant || {};
  const netw = S.netKorbwerk();
  const ad = S.adKorbwerk();
  const AZ = 'KORBWERK\\azubi';
  const IT = 'KORBWERK\\IT-Admins';
  const DU = 'KORBWERK\\Domänen-Benutzer';
  const log = (lines) => lines.join('\n') + '\n';
  const t = (days, h, m) => { const x = ago(days, h || 0); if (m) x.setMinutes(m); const p2 = n => String(n).padStart(2, '0'); return `${x.getFullYear()}-${p2(x.getMonth() + 1)}-${p2(x.getDate())} ${p2(x.getHours())}:${p2(x.getMinutes())}:${p2(x.getSeconds())}`; };
  const aufraeumen = '# aufraeumen.ps1 - von Kalle aus dem Netz geladen und "angepasst"\n# Loescht temporaere Dateien und schreibt ein Protokoll\n$ziel = "C:\\Temp"\n$protokoll = "C:\\Logs\\aufraeumen.log"\n$dateien = Get-ChildItem $ziel -Filter *.tmp -Recurse -ErrorAction SilentlyContinue\nforeach ($d in $dateien) {\n    Remove-Item $d.FullName -Force\n}\nAdd-Content $protokoll "$(Get-Date -Format "yyyy-MM-dd HH:mm") aufraeumen.ps1: $($dateien.Count) Dateien geloescht"\nWrite-Host "Aufraeumen fertig: $($dateien.Count) Dateien geloescht." -ForegroundColor Green\n';
  const srv02 = S.baseServer({
    host: 'KORB-SRV02',
    services: [S.svc('KalleBackup', 'Kalle Backup Service', 'Stopped', 'Automatic', { account: 'KORBWERK\\svc-backup', path: 'C:\\Program Files\\KalleTools\\KalleBackup.exe', failStart: 'Der Dienst konnte aufgrund einer fehlgeschlagenen Anmeldung nicht gestartet werden.', desc: 'Sichert die Freigaben nach \\\\KORB-BACKUP01 (Kalle)' })],
    procs: [{ id: 4711, name: 'KalleSync', cpu: 18234.55, ws: 412 * 1048576, pm: 398 * 1048576, handles: 1877, user: 'kalle', si: 2, company: 'Kalle Soft', desc: 'KalleSync – Dateisynchronisation', path: 'C:\\Users\\kalle\\AppData\\Local\\KalleSync\\KalleSync.exe', version: '0.9.3-beta', start: ago(12, 3) }],
    runKeys: [['KalleSync', 'C:\\Users\\kalle\\AppData\\Local\\KalleSync\\KalleSync.exe --silent']],
    softwareKeys: [GG.rk('Korbwerk', [], [
      GG.rk('Backup', [['Ziel', '\\\\KORB-BACKUP01\\Sicherung$'], ['Intervall', 24, 'DWord'], ['LetzterLauf', t(9, 2, 0)], ['Dienstkonto', 'KORBWERK\\svc-backup'], ['Kennwort', 'Sommer2019!']]),
      GG.rk('Server', [['Rolle', 'Dateiserver'], ['Standort', 'Serverraum EG, Rack 2'], ['Inbetriebnahme', '15.03.2021'], ['Betreuer', 'Mira Hofmann']])
    ])],
    shares: [
      { name: 'Daten', path: 'C:\\Freigaben\\Daten', desc: 'Abteilungsdaten', access: [{ account: DU, right: 'Change', type: 'Allow' }, { account: S.ADM, right: 'Full', type: 'Allow' }] },
      { name: 'Buchhaltung', path: 'C:\\Freigaben\\Buchhaltung', desc: '', access: [{ account: 'Jeder', right: 'Full', type: 'Allow' }] },
      { name: 'Kalle$', path: 'C:\\Users\\kalle\\Documents', desc: 'meins', access: [{ account: 'Jeder', right: 'Full', type: 'Allow' }] }
    ],
    dailyEvents: [
      { log: 'System', h: 22, level: 'Error', source: 'Service Control Manager', id: 7000, msg: 'Der Dienst "Kalle Backup Service" wurde aufgrund folgenden Fehlers nicht gestartet: \nDer Dienst konnte aufgrund einer fehlgeschlagenen Anmeldung nicht gestartet werden.' },
      { log: 'System', h: 22.01, level: 'Error', source: 'Service Control Manager', id: 7038, msg: 'Der Dienst "KalleBackup" konnte sich als "KORBWERK\\svc-backup" mit dem aktuell konfigurierten Kennwort aufgrund des folgenden Fehlers nicht anmelden: \nDer Benutzername oder das Kennwort ist falsch.' },
      { log: 'Application', h: 12, level: 'Warning', source: 'KalleSync', id: 3, msg: 'Synchronisation fehlgeschlagen: Ziel \\\\KORB-BACKUP01\\Sicherung$ nicht erreichbar. Neuer Versuch in 60 Sekunden.' },
      { log: 'Application', h: 6, level: 'Error', source: 'Application Error', id: 1000, msg: 'Name der fehlerhaften Anwendung: KalleSync.exe, Version: 0.9.3.0, Zeitstempel: 0x66e1a3b2\nName des fehlerhaften Moduls: ntdll.dll, Version: 10.0.26100.2161\nAusnahmecode: 0xc0000005' }
    ],
    extraEvents: [
      { log: 'Security', d: 1, h: 23, level: 'Information', source: 'Microsoft-Windows-Security-Auditing', id: 4625, msg: 'Fehler beim Anmelden eines Kontos.\n\nKonto, für das die Anmeldung fehlgeschlagen ist:\n\tKontoname:\tsvc-backup\n\nFehlerursache:\tUnbekannter Benutzername oder ungültiges Kennwort.' },
      { log: 'System', d: 25, h: 15, level: 'Information', source: 'Service Control Manager', id: 7045, msg: 'Ein Dienst wurde auf dem System installiert.\n\nDienstname:  Kalle Backup Service\nDienstdateiname:  C:\\Program Files\\KalleTools\\KalleBackup.exe\nDiensttyp:  Benutzermodusdienst\nDienststarttyp:  Automatischer Start\nDienstkonto:  KORBWERK\\svc-backup' }
    ],
    programFiles: [d('KalleTools', [f('KalleBackup.exe', 1843200, { mtime: ago(25) }), f('config.ini', '[Backup]\nZiel=\\\\KORB-BACKUP01\\Sicherung$\nKonto=KORBWERK\\svc-backup\n', { mtime: ago(25) })]), d('Notepad++', [f('notepad++.exe', 6553600, { mtime: ago(600) })]), d('PuTTY', [f('putty.exe', 1662976, { mtime: ago(700) })])],
    azubiHome: { desktop: [f('Willkommen.txt', 'Hallo und herzlich willkommen bei Korbwerk!\n\nDein Arbeitsplatz für die nächsten Wochen ist KORB-SRV02, unser Dateiserver.\nKalle hat uns ein paar Baustellen hinterlassen – wir räumen gemeinsam auf.\n\nWichtig: Wir arbeiten hier mit PowerShell, nicht mit Klickibunti.\nWenn du nicht weiterweißt: Get-Help ist dein Freund.\n\nViel Erfolg!\nMira\n', { mtime: ago(0, 2), owner: AZ })], downloads: [], docs: [] },
    users: [S.userHome('kalle', 'KORB-SRV02\\kalle', { docs: [f('passwoerter.txt', 'svc-backup  Sommer2019!\nfirewall    admin/admin\n', { mtime: ago(400) }), f('ToDo.txt', '- Backup reparieren\n- Freigaben aufräumen\n- Doku schreiben (irgendwann)\n', { mtime: ago(30) })], local: [d('KalleSync', [f('KalleSync.exe', 3145728, { mtime: ago(60) }), f('settings.json', '{"ziel":"\\\\\\\\KORB-BACKUP01\\\\Sicherung$","intervall":60}', { mtime: ago(60) })]), d('Temp', [])] })],
    D: d('D:', [
      d('Archiv', [d('2024', [f('Jahresabschluss_2024.zip', 1288490188, { mtime: ago(280) })]), d('2025', [f('Jahresabschluss_2025.zip', 1503238553, { mtime: ago(20) })])]),
      d('ISO', [f('SERVER_2025_x64.iso', 5843419136, { mtime: ago(200) })]),
      d('Profile', [])
    ], { acl: [R(S.SYS, 'F'), R(S.ADM, 'F'), R(IT, 'M')], ctime: ago(500) }),
    rootDirs: [
      d('Freigaben', [
        d('Daten', [
          f('Kunden.xlsx', 48211, { mtime: ago(3) }), f('Preisliste_2026.xlsx', 22118, { mtime: ago(60) }), f('Katalog_2026.pdf', 8811402, { mtime: ago(90) }), f('Angebot_Mueller.docx', 31540, { mtime: ago(5) }),
          f('Angebot_Schulz.docx', 29871, { mtime: ago(12) }), f('Messeplanung.pptx', 2210043, { mtime: ago(40) }), f('Telefonliste.docx', 18342, { mtime: ago(150) }),
          f('kalle-notizen.txt', 'Notizen von Kalle (bitte nicht löschen!)\n\n- Backup läuft nachts über den Dienst KalleBackup nach KORB-BACKUP01\n- Sync-Tool liegt unter C:\\Users\\kalle\\AppData\\Local\\KalleSync\n- Kennwort vom Dienstkonto steht in HKLM:\\SOFTWARE\\Korbwerk\\Backup (ja, ich weiß ...)\n- TODO: Freigabe Buchhaltung aufräumen, gerade hat Jeder Vollzugriff\n- TODO: Scans von .jpeg auf .jpg umbenennen\n', { hidden: true, mtime: ago(35) }),
          d('Vorlagen', [f('Briefkopf.docx', 25611, { mtime: ago(300) }), f('Rechnung.docx', 27101, { mtime: ago(300) }), f('Lieferschein.docx', 24003, { mtime: ago(300) }), f('Kalkulation.xlsx', 33012, { mtime: ago(300) })]),
          d('Alt', [f('kunden_2019.bak', 412880, { mtime: ago(900) }), f('Preisliste_2019.xlsx', 19211, { mtime: ago(900) })])
        ], { ctime: ago(500) }),
        d('Buchhaltung', [
          d('Rechnungen 2026', [f('RE-2026-0412.pdf', 151204, { mtime: ago(8) }), f('RE-2026-0413.pdf', 149871, { mtime: ago(7) }), f('RE-2026-0414.pdf', 162001, { mtime: ago(2) })]),
          f('Lohnliste_Oktober.xlsx', 41231, { mtime: ago(1) }), f('Kassenbuch.xlsx', 55870, { mtime: ago(1) })
        ], { acl: [R(S.SYS, 'F'), R(S.ADM, 'F'), R(IT, 'M'), R('Jeder', 'F')], protectedAcl: true, ctime: ago(500) }),
        d('Scans', [1, 2, 3, 4, 5, 6].map(k => f(`scan_00${k}.jpeg`, 812331 + k * 31337, { mtime: ago(k + 2) })).concat([f('scan_007.jpg', 790221, { mtime: ago(1) })]))
      ], { acl: [R(IT, 'M'), R(DU, 'RX')], ctime: ago(500) }),
      d('Logs', [
        f('app.log', log([`${t(2, 9)} INFO  Webshop-Schnittstelle gestartet`, `${t(2, 9)} INFO  Verbindung zu korb-app01:443 hergestellt`, `${t(2, 3)} WARN  Antwortzeit 2300 ms`, `${t(1, 14)} ERROR Timeout bei Bestellabruf (Auftrag 81231)`, `${t(1, 13)} INFO  Neuer Versuch erfolgreich`, `${t(1, 2)} ERROR Zertifikat für shop.korbwerk.intern läuft in 14 Tagen ab`, `${t(0, 5)} INFO  Tagesabschluss exportiert`, `${t(0, 4)} ERROR Export nach \\\\KORB-BACKUP01\\Export fehlgeschlagen`]), { mtime: ago(0, 4) }),
        f('backup.log', log([`${t(3, 22)} START Sicherung C:\\Freigaben -> \\\\KORB-BACKUP01\\Sicherung$`, `${t(3, 22)} ERROR Ziel nicht erreichbar`, `${t(2, 22)} START Sicherung C:\\Freigaben -> \\\\KORB-BACKUP01\\Sicherung$`, `${t(2, 22)} ERROR Ziel nicht erreichbar`, `${t(2, 22)} WARN  Speicherplatz knapp auf D: (12 % frei)`, `${t(1, 22)} START Sicherung C:\\Freigaben -> \\\\KORB-BACKUP01\\Sicherung$`, `${t(1, 22)} ERROR Ziel nicht erreichbar`]), { mtime: ago(1, 22) }),
        f('web.log', log([`${t(1, 8)} 10.20.10.101 GET /intranet/start 200`, `${t(1, 8)} 10.20.10.104 GET /intranet/kantine 200`, `${t(0, 7)} 10.20.10.101 GET /intranet/start 200`]), { mtime: ago(0, 7) }),
        f('dienst-2026-05.log', log(['Dienstbericht Mai', 'alles ok']), { mtime: ago(150) }), f('dienst-2026-06.log', log(['Dienstbericht Juni', 'alles ok']), { mtime: ago(118) }),
        f('dienst-2026-07.log', log(['Dienstbericht Juli', 'Neustart nach Update']), { mtime: ago(86) }), f('dienst-2026-08.log', log(['Dienstbericht August', 'alles ok']), { mtime: ago(55) }),
        f('dienst-2026-09.log', log(['Dienstbericht September', 'KalleBackup eingerichtet']), { mtime: ago(24) }),
        d('Archiv', [])
      ], { ctime: ago(500), acl: [R(IT, 'M'), R(DU, 'RX')] }),
      d('Skripte', [f('aufraeumen.ps1', aufraeumen, { zone: 3, zoneRef: 'https://www.powershell-tipps-und-tricks.example/aufraeumen.ps1', mtime: ago(20) })], { ctime: ago(300), acl: [R(IT, 'M'), R(DU, 'RX')] }),
      d('Import', [
        f('inventar.csv', 'Geraet;Typ;Raum;Seriennummer;Kaufdatum\nPC-001;Desktop;104;CZC2311ABC;12.03.2023\nPC-002;Desktop;104;CZC2311ABD;12.03.2023\nPC-003;Desktop;105;CZC2311ABE;12.03.2023\nNB-001;Notebook;012;5CD3301XYZ;01.09.2024\nNB-002;Notebook;012;5CD3301XZA;01.09.2024\nPRN-EG01;Drucker;Flur EG;VNB3K12345;20.06.2022\nPRN-OG01;Drucker;Flur OG;VNB3K12346;20.06.2022\nPRN-LAGER;Drucker;Lager;VNB3K12999;02.02.2021\nSW-01;Switch;Serverraum;FOC2512X0AB;15.03.2021\nSW-02;Switch;Lager;FOC2512X0AC;15.03.2021\nAP-01;Access Point;Flur EG;Q2PD-ABCD-1234;05.05.2024\nAP-02;Access Point;Lager;Q2PD-ABCD-1235;05.05.2024\nUSV-01;USV;Serverraum;AS2301004411;15.03.2021\nPC-010;Desktop;Lager;CZC2311ACF;03.03.2025\n', { mtime: ago(10) }),
        f('neue_mitarbeiter.csv', 'Vorname;Nachname;Benutzername;Abteilung;Titel\nJana;Roth;jroth;Vertrieb;Vertriebsassistentin\nLeon;Vogel;lvogel;Lager;Lagerist\nMia;Brandt;mbrandt;Produktion;Korbflechterin\n', { mtime: ago(1) })
      ], { acl: [R(IT, 'M'), R(DU, 'RX')] }),
      d('Berichte', [], { acl: [R(IT, 'M'), R(DU, 'RX')] }), d('Backup', [], { acl: [R(IT, 'M')] }),
      d('Temp', [d('kalle-alt', [f('test1.tmp', 'x', { mtime: ago(100) }), f('test2.tmp', 'y', { mtime: ago(100) }), f('notizen-alt.txt', 'alte Notizen', { mtime: ago(100) }), d('Unterordner', [f('mehr.tmp', 'z', { mtime: ago(100) })])]), f('install.tmp', 'tmp', { mtime: ago(5) }), f('update-cache.tmp', 'tmp', { mtime: ago(3) })], { acl: [R(IT, 'M'), R(DU, 'M')] })
    ]
  });
  srv02.users.push({ name: 'kalle', fullName: 'Karl-Heinz Wolf', desc: 'Kalles Testkonto - NICHT LÖSCHEN!!', enabled: true, rid: 1001, pwSet: ago(800), lastLogon: ago(26), pw: 'kalle', pwNeverExpires: true });
  srv02.users.push({ name: 'backup', fullName: '', desc: 'Konto für Sicherungsjob', enabled: true, rid: 1002, pwSet: ago(600), lastLogon: ago(9), pw: 'Backup!2021' });
  srv02.groups.find(g => g.name === 'Administratoren').members.push('KORB-SRV02\\kalle');
  srv02.groups.find(g => g.name === 'Benutzer').members.push('KORB-SRV02\\kalle', 'KORB-SRV02\\backup');
  srv02.groups.find(g => g.name === 'Sicherungs-Operatoren').members.push('KORB-SRV02\\backup');
  srv02.packages = [{ id: 'Notepad++.Notepad++', name: 'Notepad++ (64-bit x64)', version: '8.4.2' }, { id: 'PuTTY.PuTTY', name: 'PuTTY release 0.78 (64-bit)', version: '0.78.0.0' }];
  srv02.ad = ad;
  S.adapter(srv02, 'Ethernet', 4, '10.20.0.12', 24, '10.20.0.1', ['10.20.0.10'], '10.20.0.0/24');
  netw.add(srv02);

  // KORB-DC01
  const dc = S.baseServer({ host: 'KORB-DC01', dc: true, services: [S.svc('NTDS', 'Active Directory-Domänendienste', 'Running', 'Automatic', { canStop: false }), S.svc('DNS', 'DNS-Server', 'Running', 'Automatic'), S.svc('ADWS', 'Active Directory-Webdienste', 'Running', 'Automatic'), S.svc('Kdc', 'Kerberos-Schlüsselverteilungscenter', 'Running', 'Automatic', { canStop: false }), S.svc('DFSR', 'DFS-Replikation', 'Running', 'Automatic')], fw: { dns: true, dc: true },
    dailyEvents: [{ log: 'System', h: 3, level: 'Error', source: 'Microsoft-Windows-GroupPolicy', id: 1129, msg: 'Fehler bei der Verarbeitung der Gruppenrichtlinie aufgrund fehlender Netzwerkkonnektivität zu einem Domänencontroller. Dies kann ein vorübergehender Zustand sein.' }] });
  dc.dnsServer = true; dc.dnsZones = S.zoneKorbwerk(); dc.ad = ad;
  dc.users = []; dc.groups = [];
  S.adapter(dc, 'Ethernet', 3, '10.20.0.10', 24, '10.20.0.1', ['127.0.0.1'], '10.20.0.0/24');
  netw.add(dc);
  // KORB-APP01 (Webserver)
  const app = S.baseServer({ host: 'KORB-APP01', services: [S.svc('W3SVC', 'WWW-Publishingdienst', 'Running', 'Automatic', { deps: ['WAS'] }), S.svc('WAS', 'Windows-Prozessaktivierungsdienst', 'Running', 'Manual')], fw: { web: true },
    rootDirs: [d('inetpub', [d('wwwroot', [f('iisstart.htm', '<html>IIS</html>', { mtime: ago(400) })]), d('korbshop', [f('version.txt', '2.4.1\n', { mtime: ago(14) }), f('web.config', '<configuration><appSettings><add key="Shop" value="Korbwerk"/></appSettings></configuration>', { mtime: ago(14) }), d('bin', [f('Korbshop.dll', 812002, { mtime: ago(14) })])]), d('logs', [d('LogFiles', [d('W3SVC1', [f('u_ex261021.log', '#Software: Microsoft Internet Information Services 10.0\n2026-10-21 08:01:12 10.20.0.13 GET /shop - 443 - 10.20.10.101 200\n', { mtime: ago(1) })])])])])],
    dailyEvents: [{ log: 'System', h: 4, level: 'Error', source: 'Schannel', id: 36887, msg: 'Eine schwerwiegende Warnung wurde vom Remoteendpunkt empfangen. Der in der TLS-Protokollspezifikation definierte schwerwiegende Warnungscode ist 46.' }],
    volumes: [{ letter: 'C', label: '', size: 136301264896, free: 18253611008 }] });
  app.ad = ad;
  S.adapter(app, 'Ethernet', 4, '10.20.0.13', 24, '10.20.0.1', ['10.20.0.10'], '10.20.0.0/24');
  netw.add(app);
  // KORB-BACKUP01 – WinRM gestoppt
  const bk = S.baseServer({ host: 'KORB-BACKUP01', os: 'Microsoft Windows Server 2022 Standard', fw: { icmp: true } });
  bk.services.find(s => s.name === 'WinRM').status = 'Stopped';
  bk.services.find(s => s.name === 'WinRM').start = 'Manual';
  bk.ad = ad;
  S.adapter(bk, 'Ethernet', 4, '10.20.0.14', 24, '10.20.0.1', ['10.20.0.10'], '10.20.0.0/24');
  netw.add(bk);

  srv02.netw = netw;
  return { netw, main: srv02, worlds: { 'KORB-SRV02': srv02, 'KORB-DC01': dc, 'KORB-APP01': app, 'KORB-BACKUP01': bk }, ad };
};

/* Kapitel 8: neue Netzwerkkarte */
GG.korbwerkNicSwap = function (env) {
  const w = env.main;
  w.net.adapters = [];
  w.net.ip = {};
  S.adapter(w, 'Ethernet 2', 7, null, null, null, [], '10.20.0.0/24', { mac: '00-15-5D-0A-1B-3C' });
  w.net.ip[7].apipa = '169.254.13.37';
  GG.netx.dhcpRefresh(w, w.net.adapters[0]);
  const r = w.firewall.rules.find(x => x.name === 'FPS-ICMP4-ERQ-In'); if (r) r.enabled = false;
};
})();
