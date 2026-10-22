/* Linux-Simulation – Szenarien: Ubuntu-Grundsystem, Korbwerk-Server (Tutorial/Üben), Bäckerei Brunner (Nachweis) */
(function (G) {
  'use strict';
  const LX = (G.LX = G.LX || {});

  const NOW = () => Date.now();
  function ago(days, h, m) { const d = new Date(NOW() - days * 86400000); if (h != null) d.setHours(h, m || 0, 0, 0); return d.getTime(); }
  function at(y, mo, d, h, mi) { return new Date(y, mo - 1, d, h || 9, mi || 0).getTime(); }
  LX.ago = ago;

  // ---------- Grundsystem ----------
  function addGroup(w, name, gid) { if (!w.groups[name]) w.groups[name] = { gid: gid, members: [] }; return w.groups[name]; }
  function addUser(w, name, uid, o) {
    o = o || {};
    addGroup(w, name, uid);
    w.users[name] = { uid: uid, group: name, home: o.home || (uid === 0 ? '/root' : '/home/' + name), shell: o.shell || '/bin/bash', fullname: o.fullname || '', password: o.password || null, office: o.office, phone: o.phone, lastLogin: o.lastLogin, system: !!o.system };
    (o.groups || []).forEach(g => { if (w.groups[g] && w.groups[g].members.indexOf(name) < 0) w.groups[g].members.push(name); });
    if (o.mkhome) {
      LX.ensureDir(w, w.users[name].home, { owner: name, group: name, mode: o.homeMode || 0o750, mtime: ago(30) });
      skel(w, name);
    }
  }

  const BASHRC = '# ~/.bashrc: wird von bash(1) für nicht-Login-Shells ausgeführt.\n' +
    '# Beispiele siehe /usr/share/doc/bash/examples/startup-files\n\n' +
    '# Nicht interaktiv? Dann nichts tun.\ncase $- in\n    *i*) ;;\n      *) return;;\nesac\n\n' +
    'HISTCONTROL=ignoreboth\nHISTSIZE=1000\nHISTFILESIZE=2000\n\n' +
    '# Farbiger Prompt\nPS1=\'${debian_chroot:+($debian_chroot)}\\[\\033[01;32m\\]\\u@\\h\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ \'\n\n' +
    '# Farbige Ausgabe für ls und grep\nalias ls=\'ls --color=auto\'\nalias grep=\'grep --color=auto\'\n\n' +
    '# Ein paar praktische Aliase\nalias ll=\'ls -alF\'\nalias la=\'ls -A\'\nalias l=\'ls -CF\'\n';
  const PROFILE = '# ~/.profile: wird von der Login-Shell ausgeführt.\n\nif [ -n "$BASH_VERSION" ]; then\n    if [ -f "$HOME/.bashrc" ]; then\n        . "$HOME/.bashrc"\n    fi\nfi\n\nif [ -d "$HOME/bin" ] ; then\n    PATH="$HOME/bin:$PATH"\nfi\n';
  const LOGOUT = '# ~/.bash_logout: wird beim Abmelden der Login-Shell ausgeführt.\n\nif [ "$SHLVL" = 1 ]; then\n    [ -x /usr/bin/clear_console ] && /usr/bin/clear_console -q\nfi\n';
  function skel(w, user) {
    const h = w.users[user].home;
    const o = { owner: user, group: user, mtime: ago(30, 8, 12) };
    LX.putFile(w, h + '/.bashrc', BASHRC, o);
    LX.putFile(w, h + '/.profile', PROFILE, o);
    LX.putFile(w, h + '/.bash_logout', LOGOUT, o);
  }

  const BINS = ['bash', 'cat', 'chgrp', 'chmod', 'chown', 'cp', 'date', 'df', 'du', 'echo', 'file', 'find', 'finger', 'free', 'grep', 'groups', 'gzip', 'gunzip', 'bzip2', 'bunzip2', 'head', 'hostname', 'id', 'ip', 'kill', 'less', 'ls', 'man', 'mkdir', 'more', 'mv', 'nano', 'ping', 'ps', 'pwd', 'python3', 'rm', 'rmdir', 'sleep', 'sort', 'sudo', 'tail', 'tar', 'touch', 'uname', 'uniq', 'unzip', 'wc', 'whoami', 'who', 'xz', 'unxz', 'zip', 'zcat', 'apropos', 'whatis', 'which', 'lsb_release', 'killall', 'file'];
  function sizeFor(n) { let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0; return 14000 + (h % 300000); }

  function baseSystem(cfg) {
    const w = {
      fs: LX.mkNode('d', { mode: 0o755, mtime: ago(90) }),
      users: Object.create(null), groups: Object.create(null),
      hostname: cfg.hostname, user: 'azubi', cwd: '/', oldpwd: null, env: {},
      history: [], log: { cmds: [], pings: [], killed: [] }, procs: [], pidCounter: 2101, shellPid: 2101,
      sessions: [], sudoUntil: 0, disks: [], net: null, meta: cfg.meta || {}
    };
    // Gruppen & Systembenutzer
    addUser(w, 'root', 0, { fullname: 'root', home: '/root' });
    [['daemon', 1], ['bin', 2], ['sys', 3], ['adm', 4], ['tty', 5], ['disk', 6], ['mail', 8], ['www-data', 33], ['backup', 34], ['nogroup', 65534], ['shadow', 42], ['crontab', 105], ['systemd-network', 998], ['systemd-resolve', 991], ['messagebus', 101], ['syslog', 102]].forEach(g => addGroup(w, g[0], g[1]));
    addGroup(w, 'sudo', 27); addGroup(w, 'users', 100);
    ['daemon', 'www-data', 'messagebus', 'syslog', 'systemd-network', 'systemd-resolve'].forEach((u, i) => { const uid = { daemon: 1, 'www-data': 33, messagebus: 101, syslog: 102, 'systemd-network': 998, 'systemd-resolve': 991 }[u]; w.users[u] = { uid: uid, group: w.groups[u] ? u : 'nogroup', home: u === 'www-data' ? '/var/www' : '/nonexistent', shell: '/usr/sbin/nologin', fullname: '', system: true }; });
    w.groups.adm.members.push('syslog');

    // Verzeichnisbaum nach FHS
    const D = (p, o) => LX.ensureDir(w, p, Object.assign({ mtime: ago(60) }, o || {}));
    ['/boot', '/dev', '/etc', '/home', '/lib', '/media', '/mnt', '/opt', '/proc', '/run', '/snap', '/srv', '/sys', '/usr', '/usr/lib', '/usr/local', '/usr/local/bin', '/usr/share', '/usr/share/doc', '/usr/share/man', '/var', '/var/backups', '/var/cache', '/var/lib', '/var/log', '/var/mail', '/var/opt', '/var/spool', '/var/www', '/lib64'].forEach(p => D(p));
    D('/root', { mode: 0o700 });
    D('/tmp', { mode: 0o1777, mtime: ago(0, 7, 55) });
    D('/var/tmp', { mode: 0o1777 });
    D('/var/spool/cron/crontabs', { mode: 0o1730, group: 'crontab' });
    D('/var/cache/ldconfig', { mode: 0o700 });
    D('/etc/ssl/private', { mode: 0o710, group: 'ssl-cert' }); addGroup(w, 'ssl-cert', 110);
    D('/tmp/systemd-private-3f1c9e-systemd-resolved.service-Ab12Cd', { mode: 0o700 });
    D('/boot/efi', { mode: 0o700 });
    const bin = D('/usr/bin'); const sbin = D('/usr/sbin'); const b2 = D('/bin'); D('/sbin');
    BINS.forEach(n => {
      const f = LX.mkNode('f', { mode: n === 'sudo' ? 0o4755 : 0o755, mtime: at(2024, 4, 8, 14, 2), data: '' });
      f.size = sizeFor(n); f.bin = true;
      bin.children[n] = f; b2.children[n] = LX.cloneNode(f);
    });
    ['ip', 'reboot', 'shutdown'].forEach(n => { const f = LX.mkNode('f', { mode: 0o755, mtime: at(2024, 4, 8) }); f.size = sizeFor(n); f.bin = true; sbin.children[n] = f; });
    const dn = LX.mkNode('c', { mode: 0o666, mtime: ago(0, 7, 50) }); LX.getNode(w, '/dev').children['null'] = dn;
    ['sda', 'sda1', 'sda2', 'sdb', 'sdb1', 'tty', 'zero', 'random'].forEach(n => { LX.getNode(w, '/dev').children[n] = LX.mkNode('c', { mode: 0o660, group: 'disk', mtime: ago(0, 7, 50) }); });

    // /etc
    const E = (p, d, o) => LX.putFile(w, p, d, Object.assign({ mtime: ago(40) }, o || {}));
    E('/etc/hostname', cfg.hostname + '\n');
    E('/etc/os-release', 'PRETTY_NAME="Ubuntu 24.04.1 LTS"\nNAME="Ubuntu"\nVERSION_ID="24.04"\nVERSION="24.04.1 LTS (Noble Numbat)"\nVERSION_CODENAME=noble\nID=ubuntu\nID_LIKE=debian\nHOME_URL="https://www.ubuntu.com/"\nSUPPORT_URL="https://help.ubuntu.com/"\nUBUNTU_CODENAME=noble\n');
    E('/etc/issue', 'Ubuntu 24.04.1 LTS \\n \\l\n\n');
    E('/etc/timezone', 'Europe/Berlin\n');
    E('/etc/shells', '# /etc/shells: gültige Login-Shells\n/bin/sh\n/bin/bash\n/usr/bin/bash\n/bin/dash\n');
    E('/etc/fstab', '# /etc/fstab: Informationen über statische Dateisysteme.\n# <Dateisystem>  <Einhängepunkt>  <Typ>  <Optionen>  <dump>  <pass>\nUUID=7d1c-44f0  /boot/efi  vfat  umask=0077  0  1\nUUID=a3b0c2d1-9e8f-4a6b-b1c2-d3e4f5a6b7c8  /  ext4  defaults  0  1\nUUID=c4d5e6f7-1a2b-3c4d-5e6f-7a8b9c0d1e2f  /srv  ext4  defaults  0  2\n/swap.img  none  swap  sw  0  0\n');
    E('/etc/netplan/50-cloud-init.yaml', 'network:\n  version: 2\n  ethernets:\n    enp0s3:\n      dhcp4: false\n', { mode: 0o600 });
    D('/etc/ssh'); E('/etc/ssh/sshd_config', '# Konfiguration des SSH-Servers\nInclude /etc/ssh/sshd_config.d/*.conf\nPort 22\nPermitRootLogin no\nPasswordAuthentication yes\nKbdInteractiveAuthentication no\nUsePAM yes\nX11Forwarding no\nPrintMotd no\nAcceptEnv LANG LC_*\nSubsystem sftp /usr/lib/openssh/sftp-server\n');
    E('/etc/sudoers', '# Diese Datei NUR mit visudo bearbeiten!\nDefaults\tenv_reset\nDefaults\tmail_badpass\nroot\tALL=(ALL:ALL) ALL\n%sudo\tALL=(ALL:ALL) ALL\n@includedir /etc/sudoers.d\n', { mode: 0o440 });
    E('/etc/crontab', '# /etc/crontab: systemweite crontab\nSHELL=/bin/sh\n# m h dom mon dow user  command\n17 *  * * *  root  cd / && run-parts --report /etc/cron.hourly\n25 6  * * *  root  test -x /usr/sbin/anacron || run-parts --report /etc/cron.daily\n');
    E('/etc/resolv.conf', '# Diese Datei wird von systemd-resolved verwaltet.\nnameserver 127.0.0.53\noptions edns0 trust-ad\nsearch .\n');
    D('/var/log/apt'); E('/var/log/apt/history.log', 'Start-Date: 2026-09-02  10:14:07\nCommandline: apt install finger nano zip unzip\nInstall: finger:amd64 (0.17-17), zip:amd64 (3.0-13), unzip:amd64 (6.0-28ubuntu4)\nEnd-Date: 2026-09-02  10:14:12\n');
    E('/var/log/dpkg.log', '2026-09-02 10:14:09 install finger:amd64 <keine> 0.17-17\n2026-09-02 10:14:10 install zip:amd64 <keine> 3.0-13\n2026-09-02 10:14:11 install unzip:amd64 <keine> 6.0-28ubuntu4\n');
    E('/var/log/syslog', 'Okt 21 07:50:01 ' + cfg.hostname + ' systemd[1]: Started cron.service - Regular background program processing daemon.\nOkt 21 07:50:03 ' + cfg.hostname + ' systemd-networkd[701]: enp0s3: Link UP\n', { mode: 0o640, owner: 'syslog', group: 'adm' });
    E('/var/log/auth.log', 'Okt 21 07:58:12 ' + cfg.hostname + ' sshd[1650]: Accepted password for azubi from 192.168.50.44 port 51234 ssh2\n', { mode: 0o640, owner: 'syslog', group: 'adm' });
    E('/root/.bashrc', BASHRC, { mtime: ago(90) });

    w.disks = [
      { fs: 'tmpfs', mount: '/run', size: 400524, used: 1312, avail: 399212 },
      { fs: '/dev/sda2', mount: '/', size: 40970400, used: 9123456, avail: 29733392 },
      { fs: 'tmpfs', mount: '/dev/shm', size: 2002604, used: 0, avail: 2002604 },
      { fs: '/dev/sda1', mount: '/boot/efi', size: 1098632, used: 6216, avail: 1092416 },
      { fs: '/dev/sdb1', mount: '/srv', size: 10218772, base: 412000, used: 0, avail: 0, dyn: true }
    ];

    // Grundprozesse
    const P = (pid, user, cmd, o) => w.procs.push(Object.assign({ pid: pid, user: user, cmd: cmd, cpu: 0, mem: 0.1, stat: 'Ss', tty: '?', start: '07:50', time: '0:00', vsz: 20000, rss: 8000 }, o || {}));
    P(1, 'root', '/sbin/init splash', { mem: 0.3, vsz: 22720, rss: 13440, time: '0:02', protect: true });
    P(2, 'root', '[kthreadd]', { stat: 'S', vsz: 0, rss: 0, protect: true });
    P(3, 'root', '[pool_workqueue_release]', { stat: 'S', vsz: 0, rss: 0, protect: true });
    P(17, 'root', '[rcu_preempt]', { stat: 'I', vsz: 0, rss: 0, protect: true });
    P(412, 'root', '/usr/lib/systemd/systemd-journald', { mem: 0.4, vsz: 50196, rss: 17664, protect: true });
    P(588, 'root', '/usr/lib/systemd/systemd-udevd', { mem: 0.2, vsz: 25868, rss: 7040 });
    P(701, 'systemd-network', '/usr/lib/systemd/systemd-networkd', { mem: 0.2, vsz: 19016, rss: 8960 });
    P(735, 'systemd-resolve', '/usr/lib/systemd/systemd-resolved', { mem: 0.3, vsz: 21456, rss: 12800 });
    P(802, 'root', '/usr/sbin/cron -f -P', { stat: 'Ss', vsz: 6824, rss: 2688 });
    P(805, 'messagebus', '@dbus-daemon --system --address=systemd: --nofork --nopidfile --systemd-activation --syslog-only', { vsz: 9604, rss: 5120 });
    P(820, 'syslog', '/usr/sbin/rsyslogd -n -iNONE', { stat: 'Ssl', vsz: 222508, rss: 6016 });
    P(845, 'root', 'sshd: /usr/sbin/sshd -D [listener] 0 of 10-100 startups', { vsz: 12020, rss: 7808 });
    P(1650, 'root', 'sshd: azubi [priv]', { vsz: 14572, rss: 9216, start: '07:58' });
    P(1655, 'azubi', 'sshd: azubi@pts/0', { stat: 'S', vsz: 14836, rss: 6656, start: '07:58' });
    P(2101, 'azubi', '-bash', { stat: 'Ss', tty: 'pts/0', vsz: 8752, rss: 5376, start: '07:58' });
    return w;
  }
  LX.baseSystem = baseSystem;

  function passwdFiles(w) {
    const pw = Object.keys(w.users).map(u => { const x = w.users[u]; return u + ':x:' + x.uid + ':' + w.groups[x.group].gid + ':' + (x.fullname || '') + (x.office ? ',' + x.office + ',' + (x.phone || '') : '') + ':' + x.home + ':' + x.shell; }).sort((a, b) => Number(a.split(':')[2]) - Number(b.split(':')[2]));
    LX.putFile(w, '/etc/passwd', pw.join('\n') + '\n', { mtime: ago(10) });
    const gr = Object.keys(w.groups).map(g => g + ':x:' + w.groups[g].gid + ':' + w.groups[g].members.join(',')).sort((a, b) => Number(a.split(':')[2]) - Number(b.split(':')[2]));
    LX.putFile(w, '/etc/group', gr.join('\n') + '\n', { mtime: ago(10) });
    LX.putFile(w, '/etc/shadow', Object.keys(w.users).map(u => u + ':' + (w.users[u].password ? '$y$j9T$' + 'Xq'.repeat(8) + '$' + 'aZ3'.repeat(10) : '*') + ':19982:0:99999:7:::').join('\n') + '\n', { mode: 0o640, group: 'shadow', mtime: ago(10) });
  }

  function mkNet(cfg) {
    return {
      ifaces: [
        { name: 'lo', idx: 1, mac: '00:00:00:00:00:00', up: true, loopback: true, mtu: 65536, addrs: [{ ip: '127.0.0.1', prefix: 8 }] },
        { name: 'enp0s3', idx: 2, mac: cfg.mac || '08:00:27:3a:5c:91', up: !!cfg.up, carrier: true, mtu: 1500, addrs: cfg.addr ? [{ ip: cfg.addr, prefix: cfg.prefix, brd: cfg.brd }] : [], segment: 'lan' }
      ],
      routes: cfg.gw ? [{ dst: 'default', via: cfg.gw, dev: 'enp0s3', proto: 'static' }] : [],
      segments: { lan: { net: cfg.net, prefix: cfg.netPrefix, hosts: cfg.hosts } },
      internet: {
        '9.9.9.9': { name: 'dns9.quad9.net', lat: 2 }, '1.1.1.1': { name: 'one.one.one.one', lat: 1 },
        '203.0.113.80': { name: 'www.korbwerk.example', lat: 6 }, '198.51.100.7': { name: 'shop.brunner-baeckerei.example', lat: 9 }
      },
      dns: { 'dns9.quad9.net': '9.9.9.9', 'dns.quad9.net': '9.9.9.9', 'one.one.one.one': '1.1.1.1', 'www.korbwerk.example': '203.0.113.80', 'korbwerk.example': '203.0.113.80', 'shop.brunner-baeckerei.example': '198.51.100.7' },
      dnsServer: '9.9.9.9'
    };
  }
  LX.resetNet = function (w, cfg) {
    const seg = w.net.segments.lan;
    const n = mkNet(Object.assign({ net: seg.net, netPrefix: seg.prefix, hosts: seg.hosts, mac: w.net.ifaces[1].mac }, cfg || {}));
    w.net = n;
  };

  // ---------- Texte ----------
  function longHandbook() {
    const parts = [
      'SERVER-HANDBUCH korb-srv01\nKorbwerk IT-Service GmbH · interne Dokumentation\nStand: September 2026 · verantwortlich: Mira Hofmann\n',
      '1. ZWECK DES SERVERS\nDer korb-srv01 ist unser zentraler Linux-Server. Er stellt die Team-\nablage bereit, führt nachts das Backup aus und sammelt die Protokolle\nder Kundensysteme. Er läuft mit Ubuntu Server 24.04 LTS.\n',
      '2. ANMELDUNG\nDie Anmeldung erfolgt per SSH mit dem eigenen Benutzerkonto.\nDirektes Anmelden als root ist gesperrt. Für Verwaltungsaufgaben\nstellt ihr »sudo« vor den Befehl und gebt EUER EIGENES Passwort ein.\n',
      '3. WICHTIGE VERZEICHNISSE\n  /home      Persönliche Verzeichnisse der Mitarbeitenden\n  /srv/team  Gemeinsame Ablage für die Gruppe »it«\n  /srv/vorlagen  Briefe, Rechnungen, Protokolle als Vorlage\n  /srv/austausch Übergabe von Dateien zwischen Kolleg:innen\n  /var/log   Protokolldateien – bei Problemen zuerst hier schauen\n  /etc       Konfigurationsdateien (Änderungen nur nach Absprache!)\n',
      '4. REGELN FÜR DIE TEAMABLAGE\n- Keine privaten Dateien in /srv/team ablegen.\n- Dateinamen ohne Leerzeichen und ohne Umlaute vergeben.\n- Datum im Dateinamen immer als JJJJ-MM-TT schreiben.\n- Alte Stände nicht löschen, sondern nach /srv/altdaten verschieben.\n',
      '5. BACKUP\nDas Backup läuft jede Nacht um 02:30 Uhr. Die Einstellungen stehen in\n/etc/korbwerk/backup.conf. Ziel ist seit Oktober das Verzeichnis\n/srv/backup – der alte USB-Stick unter /mnt/usb wird nicht mehr genutzt.\n',
      '6. NETZWERK\n  Netz:          192.168.50.0/24\n  Gateway:       192.168.50.1 (Firewall »gateway«)\n  NAS:           192.168.50.20 (»nas«)\n  korb-srv01:    192.168.50.10\n  DNS:           9.9.9.9\n',
      '7. NOTFALL\nBei einem Ausfall außerhalb der Bürozeiten: Notfallnummer 0151 2345 678\n(Bereitschaftshandy). Bitte erst Logs sichern, dann neu starten.\n',
      '8. HÄUFIGE PROBLEME\n8.1 Die Platte /srv ist voll\n    Mit »df -h« prüfen, mit »du -sh /srv/*« die Übeltäter suchen.\n8.2 Der Server ist langsam\n    Mit »ps aux« nach Prozessen mit hoher CPU-Last suchen.\n8.3 Ein Kollege kommt nicht an eine Datei\n    Rechte mit »ls -l« prüfen, Gruppe mit »groups« kontrollieren.\n',
      '9. ANSPRECHPARTNER\n  Mira Hofmann    Ausbilderin, Administration      Durchwahl -112\n  Sophie Lang     Vertrieb, Kundenkontakte         Durchwahl -247\n  Kalle Brandt    (ausgeschieden zum 30.09.2026)\n'
    ];
    let t = parts.join('\n');
    t += '\n10. ÄNDERUNGSPROTOKOLL\n';
    for (let i = 1; i <= 30; i++) t += '  2026-' + String(1 + (i % 9)).padStart(2, '0') + '-' + String(1 + (i * 7) % 28).padStart(2, '0') + '  ' + ['Updates eingespielt', 'Backup-Test erfolgreich', 'Neuer Benutzer angelegt', 'Festplatte /srv geprüft', 'Zertifikat erneuert', 'Logrotation angepasst'][i % 6] + '\n';
    t += '\n-- Ende des Handbuchs --\n';
    return t;
  }
  function logLines(n, seed, kinds, msgs) {
    let s = '', x = seed;
    for (let i = 0; i < n; i++) {
      x = (x * 1103515245 + 12345) >>> 0;
      const k = kinds[x % kinds.length];
      const m = msgs[k][(x >>> 8) % msgs[k].length];
      const hh = String(6 + Math.floor(i * 14 / n)).padStart(2, '0'), mm = String((i * 37) % 60).padStart(2, '0'), ss = String((x >>> 4) % 60).padStart(2, '0');
      s += '2026-10-20 ' + hh + ':' + mm + ':' + ss + ' ' + k + ' ' + m + '\n';
    }
    return s;
  }
  function bigText(name, lines) {
    let t = '';
    for (let i = 1; i <= lines; i++) t += name + ' Zeile ' + i + ': Zugriff von 192.168.50.' + (20 + i % 60) + ' auf /srv/team/' + ['plan', 'angebot', 'liste', 'protokoll'][i % 4] + '_' + (i % 12 + 1) + '.txt – OK\n';
    return t;
  }
  LX.bigText = bigText;

  function tarBlob(base, files, comp, owner) {
    const entries = [{ path: base + '/', type: 'd', mode: 0o755, owner: owner, group: owner, mtime: ago(3, 16, 4) }];
    files.forEach(f => entries.push({ path: base + '/' + f[0], type: 'f', mode: f[2] || 0o644, owner: owner, group: owner, mtime: ago(3, 16, 2), data: f[1] }));
    let blob = { kind: 'tar', entries: entries };
    if (comp) blob = { kind: comp, inner: { name: base + '.tar', blob: blob, mtime: ago(3, 16, 5), mode: 0o644 } };
    return blob;
  }
  function zipBlob(base, files, owner) {
    const entries = [{ path: base + '/', type: 'd', mode: 0o755, owner: owner, group: owner, mtime: ago(5, 11, 0), csize: 0 }];
    files.forEach(f => { const e = { path: base + '/' + f[0], type: 'f', mode: 0o644, owner: owner, group: owner, mtime: ago(5, 11, 0) }; if (f[2]) { e.size = f[2]; e.data = ''; } else e.data = f[1]; e.csize = Math.round(LX.entrySize(e) * 0.97); entries.push(e); });
    return { kind: 'zip', entries: entries };
  }
  LX.tarBlob = tarBlob; LX.zipBlob = zipBlob;
  function binFile(w, path, size, o) { const n = LX.putFile(w, path, '', o); n.size = size; n.bin = true; return n; }
  LX.binFile = binFile;

  // ---------- Korbwerk-Server (Tutorial und Üben) ----------
  LX.WORLDS = {};
  LX.WORLDS.office = function (opt) {
    opt = opt || {};
    const w = baseSystem({ hostname: 'korb-srv01' });
    addGroup(w, 'it', 1100); addGroup(w, 'vertrieb', 1101);
    addUser(w, 'azubi', 1000, { fullname: 'Azubi (du)', groups: ['sudo', 'it', 'users'], password: 'korb2026', mkhome: true, homeMode: 0o750, office: 'Raum 2.04', phone: '-118' });
    addUser(w, 'mira', 1001, { fullname: 'Mira Hofmann', groups: ['sudo', 'it'], password: 'x', mkhome: true, homeMode: 0o755, office: 'Raum 2.01', phone: '-112' });
    addUser(w, 'kalle', 1002, { fullname: 'Kalle Brandt', groups: ['it'], mkhome: true, homeMode: 0o750, office: 'Raum 2.03', phone: '-115', lastLogin: 'Tue Sep 30 17:42 (CEST) on pts/2 from 192.168.50.36' });
    addUser(w, 'sophie', 1003, { fullname: 'Sophie Lang', groups: ['vertrieb'], mkhome: true, homeMode: 0o755, office: 'Raum 1.12', phone: '-247' });
    w.groups.it.members.push('mira');
    passwdFiles(w);
    const H = '/home/azubi';
    w.cwd = H;
    w.sessions = [
      { user: 'azubi', tty: 'pts/0', since: '2026-10-21 07:58', short: 'Okt 21 07:58', long: 'Wed Oct 21 07:58 (CEST)', from: '192.168.50.44' },
      { user: 'mira', tty: 'pts/1', since: '2026-10-21 08:12', short: 'Okt 21 08:12', long: 'Wed Oct 21 08:12 (CEST)', from: '192.168.50.31', idle: '7' }
    ];
    const P = (pid, user, cmd, o) => w.procs.push(Object.assign({ pid: pid, user: user, cmd: cmd, cpu: 0, mem: 0.1, stat: 'Ss', tty: '?', start: '08:12', time: '0:00', vsz: 20000, rss: 8000 }, o || {}));
    P(1190, 'root', 'sshd: mira [priv]', { vsz: 14572, rss: 9088 });
    P(1201, 'mira', 'sshd: mira@pts/1', { stat: 'S', vsz: 14836, rss: 6528 });
    P(1204, 'mira', '-bash', { tty: 'pts/1', vsz: 8752, rss: 5248 });
    w.net = mkNet({ up: true, addr: '192.168.50.10', prefix: 24, brd: '192.168.50.255', gw: '192.168.50.1', net: '192.168.50.0', netPrefix: 24,
      hosts: { '192.168.50.1': { name: 'gateway', router: true, lat: 0.2 }, '192.168.50.20': { name: 'nas', lat: 0.3 }, '192.168.50.31': { name: 'mira-laptop', lat: 1.1 }, '192.168.50.44': { name: 'azubi-pc', lat: 0.6 } } });
    LX.putFile(w, '/etc/hosts', '127.0.0.1\tlocalhost\n127.0.1.1\tkorb-srv01\n\n192.168.50.1\tgateway\n192.168.50.20\tnas\n\n# IPv6\n::1     ip6-localhost ip6-loopback\n', { mtime: ago(40) });

    const A = { owner: 'azubi', group: 'azubi' };
    const F = (p, d, o) => LX.putFile(w, p, d, Object.assign({}, A, { mtime: ago(1, 16, 40) }, o || {}));
    const Dd = (p, o) => LX.ensureDir(w, p, Object.assign({}, A, { mode: 0o775, mtime: ago(1, 16, 40) }, o || {}));

    if (!opt.practice) {
      // Home
      F(H + '/willkommen.txt', 'Hallo und herzlich willkommen bei Korbwerk!\n\nSchön, dass du da bist. Dies ist dein Konto auf unserem Server\nkorb-srv01. Hier lernst du in den nächsten Tagen, wie man einen\nLinux-Server über das Terminal verwaltet – ganz ohne Maus.\n\nKeine Sorge: Du kannst hier nichts kaputt machen, was wir nicht\nwieder reparieren können. Probier viel aus!\n\nIn deinem Ordner »eingang« liegt Post, die du heute sortierst.\nWenn du Fragen hast: Raum 2.01 oder Durchwahl -112.\n\nViele Grüße\nMira Hofmann (deine Ausbilderin)\n', { mtime: ago(1, 16, 32) });
      F(H + '/.hinweis', 'Psst! Du hast die versteckte Datei gefunden.\nDateien, deren Name mit einem Punkt beginnt, zeigt »ls« nur mit -a an.\nSo verstecken sich vor allem Einstellungsdateien wie .bashrc.\n', { mtime: ago(1, 16, 33) });
      Dd(H + '/eingang');
      F(H + '/eingang/server-handbuch.txt', longHandbook(), { mtime: ago(2, 10, 5) });
      F(H + '/eingang/protokoll_teammeeting.txt', 'Protokoll Teammeeting IT – 20.10.2026\nAnwesend: Mira, Sophie, Azubi\n\nTOP 1: Begrüßung des neuen Azubis\nTOP 2: Kalles Altlasten auf korb-srv01 aufräumen\nTOP 3: Neues Backup-Ziel /srv/backup\nTOP 4: Umzug des Servers ins neue Rack (Netzwerk neu einrichten!)\n\nNächstes Treffen: Montag, 09:00 Uhr\n', { mtime: ago(1, 11, 30) });
      F(H + '/eingang/rechnung_0815.pdf', '%PDF-1.7\n%\u00e2\u00e3\u00cf\u00d3\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n', { mtime: ago(9, 9, 12) });
      F(H + '/eingang/rechnung_0816.pdf', '%PDF-1.7\n%\u00e2\u00e3\u00cf\u00d3\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n', { mtime: ago(8, 14, 2) });
      F(H + '/eingang/rechnung_0901.pdf', '%PDF-1.7\n%\u00e2\u00e3\u00cf\u00d3\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n', { mtime: ago(3, 8, 45) });
      binFile(w, H + '/eingang/foto_kantine.jpg', 284211, Object.assign({}, A, { mtime: ago(6, 12, 15) }));
      binFile(w, H + '/eingang/foto_feier.jpg', 1532044, Object.assign({}, A, { mtime: ago(4, 18, 30) }));
      binFile(w, H + '/eingang/angebot_mueller_alt.odt', 31770, Object.assign({}, A, { mtime: at(2025, 11, 3, 10, 0) }));
      F(H + '/eingang/temp1.tmp', 'Zwischenspeicher\n', { mtime: ago(2, 9, 1) });
      F(H + '/eingang/temp2.tmp', 'Zwischenspeicher\n', { mtime: ago(2, 9, 2) });
      F(H + '/eingang/temp10.tmp', 'Zwischenspeicher\n', { mtime: ago(2, 9, 3) });
      Dd(H + '/eingang/alt', { mtime: ago(20) });
      Dd(H + '/skripte');
      F(H + '/skripte/backup.sh', '#!/bin/bash\n# Mini-Backup von Kalle – sichert die Ablage\necho "Starte Sicherung der Ablage ..."\necho "Sicherung abgeschlossen. (Simulation – es wurde nichts kopiert)"\n', { mode: 0o664 });
      Dd(H + '/privat');
      F(H + '/privat/notizen_privat.txt', 'Meine Notizen (nur für mich!)\n- Passwort-Manager einrichten\n- Berichtsheft Woche 1 schreiben\n- Geburtstag Mira: 14. November\n', { mode: 0o664 });
      F(H + '/checkliste.txt', 'Checkliste Serverraum – Kontrollgang am Freitag\n1. Temperatur am Rack ablesen\n4. Tür abschließen und Schlüssel abgeben\n2. Blinkende LEDs notieren\n3. Kabelsalat fotografieren\n', { mtime: ago(1, 9, 0) });
    }
    // Mira, Sophie, Kalle
    LX.putFile(w, '/home/mira/.plan', 'Diese Woche: neuen Azubi einarbeiten :-)\nFreitag: Kontrollgang Serverraum\n', { owner: 'mira', group: 'mira', mtime: ago(2) });
    LX.putFile(w, '/home/mira/urlaubsplan.txt', 'Urlaubsplan IT 2026\nMira:   27.12. – 06.01.\nSophie: 02.11. – 06.11.\nAzubi:  Berufsschule nach Blockplan\n', { owner: 'mira', group: 'mira', mtime: ago(12) });
    LX.ensureDir(w, '/home/mira/projekte', { owner: 'mira', group: 'mira', mode: 0o755, mtime: ago(5) });
    LX.putFile(w, '/home/sophie/kundenliste.txt', 'Bäckerei Brunner\nAutohaus Seidel\nPraxis Dr. Okafor\nKorbmacherei Weiß\n', { owner: 'sophie', group: 'sophie', mtime: ago(7) });
    LX.putFile(w, '/home/kalle/geheim.txt', 'Hier gibt es nichts zu sehen.\n', { owner: 'kalle', group: 'kalle', mode: 0o600, mtime: at(2026, 9, 29) });
    LX.putFile(w, '/root/notfallzugang.txt', 'Notfallzugang für den Server-BMC: siehe Tresor im Büro von Mira.\n', { mode: 0o600, mtime: ago(50) });
    LX.putFile(w, '/root/serverraum_code.txt', 'Der Türcode wird monatlich geändert – aktueller Code im Tresor.\n', { mode: 0o600, mtime: ago(10) });

    // /srv
    LX.ensureDir(w, '/srv/vorlagen', { mtime: ago(30) });
    binFile(w, '/srv/vorlagen/brief_vorlage.odt', 21944, { mtime: at(2026, 3, 2, 9, 30) });
    binFile(w, '/srv/vorlagen/rechnung_vorlage.odt', 25120, { mtime: at(2026, 3, 2, 9, 31) });
    LX.putFile(w, '/srv/vorlagen/protokoll_vorlage.txt', 'Protokoll <Thema> – <Datum>\nAnwesend:\n\nTOP 1:\nTOP 2:\n', { mtime: at(2026, 3, 2, 9, 32) });
    LX.ensureDir(w, '/srv/team', { group: 'it', mode: 0o2775, mtime: ago(3) });
    LX.putFile(w, '/srv/team/netzplan.txt', 'Netzplan Korbwerk (Stand 10/2026)\n192.168.50.1    gateway     Firewall/Router\n192.168.50.10   korb-srv01  Linux-Server\n192.168.50.20   nas         Netzwerkspeicher\n192.168.50.31   mira-laptop\n192.168.50.44   azubi-pc\n', { owner: 'mira', group: 'it', mode: 0o664, mtime: ago(3, 13, 3) });
    LX.putFile(w, '/srv/team/telefonliste.txt', 'Mira Hofmann  -112\nKalle Brandt  -115 (ausgeschieden)\nAzubi         -118\nSophie Lang   -247\n', { owner: 'mira', group: 'it', mode: 0o664, mtime: ago(9) });
    LX.ensureDir(w, '/srv/austausch', { mode: 0o755, mtime: ago(3) });
    LX.ensureDir(w, '/srv/austausch/kalle', { owner: 'kalle', group: 'it', mode: 0o755, mtime: at(2026, 9, 30, 17, 30) });
    LX.putFile(w, '/srv/austausch/kalle/uebergabe_teil1.txt', 'ÜBERGABE von Kalle an die Nachfolge – Teil 1\n\nHallo! Wenn du das liest, hast du »find« gemeistert. Respekt.\nIch habe ein paar Baustellen hinterlassen, sorry:\n- In /srv/altdaten liegt noch mein riesiges Backup von 2019.\n- Mein Sync-Skript läuft vermutlich noch und frisst CPU.\n', { owner: 'kalle', group: 'it', mtime: at(2026, 9, 30, 17, 20) });
    LX.putFile(w, '/srv/austausch/kalle/uebergabe_teil2.txt', 'ÜBERGABE – Teil 2\n- Das Backup-Ziel in /etc/korbwerk/backup.conf zeigt noch auf\n  den alten USB-Stick. Bitte auf /srv/backup ändern.\n- Die Logs in /var/log/korbwerk sollten mal archiviert werden.\nViel Erfolg und danke für den Fisch! – Kalle\n', { owner: 'kalle', group: 'it', mtime: at(2026, 9, 30, 17, 25) });
    LX.putFile(w, '/srv/austausch/kalle/notizen_alt.txt', 'Alte Notizen, kann weg.\n', { owner: 'kalle', group: 'it', mtime: at(2026, 6, 4) });
    const lief = LX.putFile(w, '/srv/austausch/lieferung.tar.gz', '', { owner: 'mira', group: 'it', mode: 0o644, mtime: ago(3, 16, 6) });
    lief.blob = tarBlob('lieferung', [['lieferschein_4711.txt', 'Lieferschein 4711\n2x Netzwerkswitch 24 Port\n1x USV 1500 VA\n10x Patchkabel 2 m\n'], ['seriennummern.txt', 'Switch A: SW24-8812-AX\nSwitch B: SW24-8813-AX\nUSV:      UPS1500-30441\n'], ['montageanleitung.txt', 'Montageanleitung USV\n1. Gerät auspacken\n2. Akku anschließen\n3. Im Rack verschrauben\n']], 'gz', 'mira');
    const fz = LX.putFile(w, '/srv/austausch/fotos.zip', '', { owner: 'mira', group: 'it', mode: 0o644, mtime: ago(5, 11, 1) });
    fz.blob = zipBlob('fotos', [['serverraum_vorher.jpg', '', 1832110], ['serverraum_nachher.jpg', '', 1911820], ['rack_front.jpg', '', 977451]], 'mira');
    LX.ensureDir(w, '/srv/altdaten', { group: 'it', mode: 0o2775, mtime: ago(40) });
    LX.ensureDir(w, '/srv/altdaten/kalle_backup_2019', { owner: 'kalle', group: 'it', mode: 0o2775, mtime: at(2019, 12, 20, 18, 0) });
    binFile(w, '/srv/altdaten/kalle_backup_2019/db_dump_2019.sql', 4123456789, { owner: 'kalle', group: 'it', mode: 0o664, mtime: at(2019, 12, 20, 18, 4) });
    binFile(w, '/srv/altdaten/kalle_backup_2019/mails_2019.tar', 3221225472, { owner: 'kalle', group: 'it', mode: 0o664, mtime: at(2019, 12, 20, 18, 9) });
    LX.ensureDir(w, '/srv/altdaten/kalle_backup_2019/fotos', { owner: 'kalle', group: 'it', mode: 0o2775, mtime: at(2019, 12, 20, 18, 1) });
    binFile(w, '/srv/altdaten/kalle_backup_2019/fotos/weihnachtsfeier.zip', 1610612736, { owner: 'kalle', group: 'it', mode: 0o664, mtime: at(2019, 12, 20, 18, 2) });
    LX.ensureDir(w, '/srv/altdaten/archiv_2025', { group: 'it', mode: 0o2775, mtime: at(2026, 1, 8) });
    binFile(w, '/srv/altdaten/archiv_2025/jahresabschluss_2025.tar.gz', 52428800, { owner: 'mira', group: 'it', mode: 0o664, mtime: at(2026, 1, 8, 11, 0) });
    LX.ensureDir(w, '/srv/backup', { group: 'it', mode: 0o2775, mtime: ago(2) });

    // /etc/korbwerk
    LX.ensureDir(w, '/etc/korbwerk', { mtime: ago(20) });
    LX.putFile(w, '/etc/korbwerk/backup.conf', '# Konfiguration des nächtlichen Backups auf korb-srv01\n# Änderungen bitte im Server-Handbuch dokumentieren!\n\n[allgemein]\naktiv=ja\nuhrzeit=02:30\n\n[quelle]\nverzeichnisse=/home /srv/team /etc\nausnahmen=*.tmp *.iso\n\n[ziel]\n# Wohin wird gesichert?\nziel=/mnt/usb\naufbewahrung_tage=14\n\n[benachrichtigung]\nmail=it@korbwerk.example\nnur_bei_fehler=ja\n', { mtime: at(2026, 9, 15, 10, 30) });
    LX.putFile(w, '/etc/korbwerk/kunden.conf', '# Kundensysteme, deren Protokolle gesammelt werden\nbrunner=10.20.30.15\nseidel=10.20.40.15\nokafor=10.20.50.15\n', { mtime: at(2026, 9, 15, 10, 31) });

    // Protokolle
    const LOGM = {
      INFO: ['Synchronisation gestartet', 'Synchronisation beendet', 'Verbindung zu nas hergestellt', '12 Dateien übertragen', 'Prüfsumme korrekt'],
      WARNUNG: ['Antwortzeit von nas über 2 s', 'Datei gesperrt, neuer Versuch folgt', 'Speicherplatz auf /srv unter 5 %'],
      FEHLER: ['Ziel /mnt/usb nicht gefunden', 'Schreiben nach /srv fehlgeschlagen: Kein Platz', 'Zeitüberschreitung bei nas', 'Sperrdatei verwaist']
    };
    LX.putFile(w, '/var/log/kalle-sync.log', logLines(60, 7, ['INFO', 'INFO', 'INFO', 'WARNUNG', 'FEHLER'], LOGM), { owner: 'kalle', group: 'it', mode: 0o644, mtime: ago(0, 7, 59) });
    LX.ensureDir(w, '/var/log/korbwerk', { group: 'it', mode: 0o2775, mtime: ago(1) });
    LX.putFile(w, '/var/log/korbwerk/zugriff.log', bigText('zugriff', 420), { owner: 'root', group: 'it', mode: 0o664, mtime: ago(1, 23, 59) });
    LX.putFile(w, '/var/log/korbwerk/fehler.log', logLines(180, 11, ['FEHLER', 'WARNUNG', 'INFO'], LOGM), { owner: 'root', group: 'it', mode: 0o664, mtime: ago(1, 23, 58) });
    LX.putFile(w, '/var/log/korbwerk/sync.log', logLines(350, 23, ['INFO', 'INFO', 'WARNUNG', 'FEHLER'], LOGM), { owner: 'root', group: 'it', mode: 0o664, mtime: ago(1, 23, 57) });

    // Prozesse aus Kalles Zeit
    LX.ensureDir(w, '/opt/alt', { mtime: at(2026, 9, 12) });
    LX.putFile(w, '/opt/alt/sync.py', '#!/usr/bin/python3\n# Kalles Endlos-Sync – bitte nicht mehr starten\nwhile True:\n    pass\n', { owner: 'kalle', group: 'kalle', mode: 0o755, mtime: at(2026, 9, 12, 15, 0) });
    binFile(w, '/opt/alt/haenger', 18872, { owner: 'kalle', group: 'kalle', mode: 0o755, mtime: at(2026, 9, 12, 15, 1) });
    if (!opt.practice) {
      w.procs.push({ pid: 3317, user: 'kalle', cmd: '/usr/bin/python3 /opt/alt/sync.py --endlos', cpu: 97.8, mem: 1.2, stat: 'R', tty: '?', start: 'Sep30', time: '512:44', vsz: 31284, rss: 49152, tag: 'sync' });
      w.procs.push({ pid: 3322, user: 'kalle', cmd: '/opt/alt/haenger --daemon', cpu: 45.1, mem: 6.3, stat: 'S', tty: '?', start: 'Sep30', time: '231:07', vsz: 412992, rss: 258048, tag: 'haenger', ignoreTerm: true });
    }
    w.procs.sort((a, b) => a.pid - b.pid);
    LX.updateDisks(w);
    return w;
  };

  // ---------- Bäckerei Brunner (Kompetenznachweis) ----------
  LX.WORLDS.brunner = function () {
    const w = baseSystem({ hostname: 'brunner-srv' });
    addGroup(w, 'buchhaltung', 1200); addGroup(w, 'kasse', 1201);
    addUser(w, 'azubi', 1000, { fullname: 'Azubi Korbwerk (Dienstleister)', groups: ['sudo', 'buchhaltung', 'users'], password: 'brot2026', mkhome: true, homeMode: 0o750 });
    addUser(w, 'brunner', 1001, { fullname: 'Anna Brunner', groups: ['buchhaltung', 'kasse'], mkhome: true, homeMode: 0o750, office: 'Backstube', phone: '09571 4711' });
    addUser(w, 'kassensys', 1002, { fullname: 'Kassensystem', groups: ['kasse'], mkhome: true, homeMode: 0o750 });
    passwdFiles(w);
    const H = '/home/azubi';
    w.cwd = H;
    w.sessions = [{ user: 'azubi', tty: 'pts/0', since: '2026-10-21 08:02', short: 'Okt 21 08:02', long: 'Wed Oct 21 08:02 (CEST)', from: '10.20.30.99' }];
    w.procs = w.procs.map(p => p.cmd === 'sshd: azubi [priv]' ? p : p);
    w.procs.push({ pid: 2877, user: 'kassensys', cmd: '/usr/local/bin/kasse-sync --watch /srv/kasse', cpu: 88.4, mem: 3.9, stat: 'R', tty: '?', start: '06:00', time: '161:20', vsz: 188112, rss: 159744, tag: 'kasse-sync', ignoreTerm: true });
    w.procs.push({ pid: 2903, user: 'kassensys', cmd: '/usr/local/bin/kasse-druckdienst', cpu: 0.3, mem: 1.1, stat: 'S', tty: '?', start: '06:00', time: '0:41', vsz: 98112, rss: 45056, tag: 'druck' });
    w.procs.sort((a, b) => a.pid - b.pid);
    w.net = mkNet({ up: false, net: '10.20.30.0', netPrefix: 24, mac: '52:54:00:9b:12:e4', hosts: { '10.20.30.1': { name: 'router', router: true, lat: 0.3 }, '10.20.30.40': { name: 'kasse01', lat: 0.5 }, '10.20.30.41': { name: 'kasse02', lat: 0.5 } } });
    LX.putFile(w, '/etc/hosts', '127.0.0.1\tlocalhost\n127.0.1.1\tbrunner-srv\n\n10.20.30.40\tkasse01\n10.20.30.41\tkasse02\n', { mtime: ago(40) });
    const A = { owner: 'azubi', group: 'azubi' };
    const F = (p, d, o) => LX.putFile(w, p, d, Object.assign({}, A, { mtime: ago(1, 7, 10) }, o || {}));
    LX.ensureDir(w, H + '/eingang', Object.assign({}, A, { mode: 0o775, mtime: ago(1) }));
    ['re_2026-0901.pdf', 're_2026-0902.pdf', 're_2026-0915.pdf', 're_2026-1003.pdf', 're_2026-1017.pdf'].forEach((n, i) => F(H + '/eingang/' + n, '%PDF-1.7\n% Rechnung ' + n + '\n', { mtime: ago(20 - i * 4, 9, i) }));
    ['theke.jpg', 'brezn.jpg', 'ofen.jpg'].forEach((n, i) => binFile(w, H + '/eingang/' + n, 900000 + i * 123457, Object.assign({}, A, { mtime: ago(6, 10, i) })));
    ['scan1.tmp', 'scan2.tmp', 'druck.tmp'].forEach(n => F(H + '/eingang/' + n, 'temp\n'));
    F(H + '/eingang/lies_mich.txt', 'Hallo Azubi,\nbitte räum den Server auf – die Aufgaben stehen in deiner Auftragsliste.\nViele Grüße, Anna Brunner\n');
    LX.ensureDir(w, H + '/eingang/alt', Object.assign({}, A, { mode: 0o775, mtime: ago(30) }));
    F(H + '/kasse.sh', '#!/bin/bash\n# Tagesabschluss der Kasse anstoßen\necho "Tagesabschluss gestartet ..."\necho "Fertig."\n', { mode: 0o644 });
    LX.ensureDir(w, H + '/notizen', Object.assign({}, A, { mode: 0o775 }));
    F(H + '/notizen/privat.txt', 'Zugang zum Router: liegt bei Frau Brunner im Büro.\n', { mode: 0o664 });
    // versteckter Z-Bon
    LX.ensureDir(w, '/srv/kasse', { owner: 'kassensys', group: 'kasse', mode: 0o2775, mtime: ago(0, 6, 0) });
    LX.ensureDir(w, '/srv/kasse/export/2026/09', { owner: 'kassensys', group: 'kasse', mode: 0o2775, mtime: ago(20) });
    LX.ensureDir(w, '/srv/kasse/export/2026/10', { owner: 'kassensys', group: 'kasse', mode: 0o2775, mtime: ago(1) });
    LX.getNode(w, '/srv/kasse/export').mode = 0o2755; LX.getNode(w, '/srv/kasse/export/2026').mode = 0o2755;
    LX.putFile(w, '/srv/kasse/export/2026/09/z-bon_2026-09.csv', 'datum;umsatz_bar;umsatz_karte\n2026-09-01;1243,80;988,10\n2026-09-02;1199,20;1012,55\n2026-09-30;1302,40;1101,90\n', { owner: 'kassensys', group: 'kasse', mode: 0o644, mtime: ago(20, 23, 59) });
    LX.putFile(w, '/srv/kasse/export/2026/10/z-bon_2026-10-teil.csv', 'datum;umsatz_bar;umsatz_karte\n2026-10-01;1220,10;1001,30\n', { owner: 'kassensys', group: 'kasse', mode: 0o644, mtime: ago(1) });
    LX.ensureDir(w, '/srv/kasse/intern', { owner: 'kassensys', group: 'kasse', mode: 0o2770, mtime: ago(2) });
    LX.ensureDir(w, '/srv/altlasten', { mode: 0o755, mtime: at(2024, 2, 1) });
    LX.ensureDir(w, '/srv/altlasten/kasse_v1', { mode: 0o755, mtime: at(2024, 2, 1) });
    binFile(w, '/srv/altlasten/kasse_v1/datenbank.bak', 812345678, { mtime: at(2024, 2, 1) });
    LX.putFile(w, '/srv/altlasten/kasse_v1/readme.txt', 'Alte Kassensoftware v1 – nicht mehr benötigt.\n', { mtime: at(2024, 2, 1) });
    LX.ensureDir(w, '/srv/austausch', { mode: 0o755, mtime: ago(2) });
    const lb = LX.putFile(w, '/srv/austausch/lieferung.tar.bz2', '', { owner: 'brunner', group: 'brunner', mode: 0o644, mtime: ago(2, 14, 0) });
    lb.blob = tarBlob('lieferung', [['mehl_bestellung.txt', 'Lieferant Mühle Gerber\n20 Sack Weizenmehl 550\n10 Sack Roggenmehl 1150\n'], ['rechnung_muehle.txt', 'Rechnung 2026-1188\nBetrag: 1.240,00 EUR\n'], ['lieferdatum.txt', 'Lieferung: Freitag, 6:00 Uhr\n']], 'bz2', 'brunner');
    // Log & Konfiguration
    let log = ''; const msgs = ['Bon gedruckt', 'Kartenzahlung OK', 'FEHLER: Bondrucker offline', 'Tagesabschluss gestartet', 'FEHLER: Zeitüberschreitung Kartenterminal', 'Schublade geöffnet', 'FEHLER: Netzwerk nicht erreichbar', 'Artikel storniert'];
    for (let i = 0; i < 48; i++) log += '2026-10-20 ' + String(6 + Math.floor(i / 4)).padStart(2, '0') + ':' + String((i * 13) % 60).padStart(2, '0') + ' kasse01 ' + msgs[(i * 5 + 3) % msgs.length] + '\n';
    LX.putFile(w, '/var/log/kasse.log', log, { owner: 'kassensys', group: 'kasse', mode: 0o644, mtime: ago(1, 18, 30) });
    LX.ensureDir(w, '/etc/kasse', { mtime: ago(30) });
    LX.putFile(w, '/etc/kasse/kasse.conf', '# Kassensystem Bäckerei Brunner\n[betrieb]\nfiliale=Hauptstraße 12\nmodus=test\nwaehrung=EUR\n\n[drucker]\nbondrucker=10.20.30.41\n', { mtime: ago(30) });
    LX.updateDisks(w);
    return w;
  };

  // Hilfsfunktionen für Prüfungen
  LX.q = {
    node: (w, p) => LX.getNode(w, p),
    isDir: (w, p) => { const n = LX.getNode(w, p); return !!n && n.type === 'd'; },
    isFile: (w, p) => { const n = LX.getNode(w, p); return !!n && n.type === 'f'; },
    gone: (w, p) => !LX.getNode(w, p),
    text: (w, p) => { const n = LX.getNode(w, p); return n && n.type === 'f' && !n.blob ? (n.data || '') : null; },
    mode: (w, p) => { const n = LX.getNode(w, p); return n ? n.mode & 0o7777 : null; },
    group: (w, p) => { const n = LX.getNode(w, p); return n ? n.group : null; },
    children: (w, p) => { const n = LX.getNode(w, p); return n && n.type === 'd' ? Object.keys(n.children) : []; },
    blob: (w, p) => { const n = LX.getNode(w, p); return n && n.blob ? n.blob : null; },
    tarOf: (w, p) => { const n = LX.getNode(w, p); if (!n || !n.blob) return null; let b = n.blob; const chain = []; while (b && b.inner) { chain.push(b.kind); b = b.inner.blob; } return b && b.kind === 'tar' ? { chain: chain, entries: b.entries } : null; },
    proc: (w, tag) => w.procs.find(p => p.tag === tag),
    iface: (w, n) => w.net.ifaces.find(i => i.name === n),
    hasAddr: (w, dev, ip, pre) => { const i = w.net.ifaces.find(x => x.name === dev); return !!i && i.addrs.some(a => a.ip === ip && a.prefix === pre); },
    defaultVia: (w, gw) => w.net.routes.some(r => r.dst === 'default' && r.via === gw),
    pinged: (w, ip) => w.log.pings.some(p => p.target === ip && p.ok),
    lines: (t) => (t || '').split('\n').map(s => s.trim()).filter(Boolean)
  };
})(typeof window !== 'undefined' ? window : globalThis);
