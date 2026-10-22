/* Get-Going! – Active Directory */
(function () {
'use strict';
const GG = globalThis.GG = globalThis.GG || {};
const V = GG.v, I = GG.interp, F = GG.fmt;
const { PSObject, PSHash, PSDate, ScriptBlock, SecureString, PSRuntimeError } = GG;
const P = GG.P, def = GG.def;
const MOD = 'ActiveDirectory';
const ADT = 'Microsoft.ActiveDirectory.Management.';

/* ---------- Modell-Hilfen ---------- */
let guidSeed = 1;
GG.adGuid = () => { guidSeed++; const h = n => (n * 2654435761 >>> 0).toString(16).padStart(8, '0'); return `${h(guidSeed)}-${h(guidSeed * 7).slice(0, 4)}-4${h(guidSeed * 13).slice(0, 3)}-a${h(guidSeed * 17).slice(0, 3)}-${h(guidSeed * 19)}${h(guidSeed * 23).slice(0, 4)}`; };
GG.adDN = o => `${o.kind === 'ou' ? 'OU' : 'CN'}=${o.name},${o.parent}`;
GG.adIsMember = function (ad, g, obj, seen) {
  seen = seen || new Set();
  if (seen.has(g)) return false; seen.add(g);
  if ((g.members || []).includes(obj)) return true;
  if (obj.primaryGroup === g.sam) return true;
  for (const m of g.members || []) if (m.kind === 'group' && GG.adIsMember(ad, m, obj, seen)) return true;
  return false;
};
function adOf(c) { return c.world.ad; }
function reach(c, cmd) {
  const w = c.world, ad = w.ad;
  const fail = () => { c.error('Es kann kein Standardserver gefunden werden, auf dem die Active Directory-Webdienste ausgeführt werden.', { category: 'ResourceUnavailable', exception: 'Microsoft.ActiveDirectory.Management.ADServerDownException', fqid: 'ActiveDirectoryServer:1355,' + ADT + 'Commands.' + cmd.replace('-', ''), noClass: true, target: '', reason: 'ADServerDownException' }); return false; };
  if (!ad) return fail();
  if (w.isDomainController) return true;
  const d = GG.netw.resolve(w, ad.domain);
  if (d.error) return fail();
  const r = GG.netw.route(w, d.ip);
  if (!r.ok || !r.host || r.host.online === false) return fail();
  return true;
}
function sidOf(ad, o) { return ad.sidBase + '-' + o.rid; }
const pad2 = n => String(n).padStart(2, '0');
function adTime(d) { return d ? new PSDate(d) : null; }

/* Attribute eines Benutzers */
function userAttrs(ad, u) {
  const dn = GG.adDN(u);
  const memberOf = ad.groups.filter(g => (g.members || []).includes(u)).map(g => GG.adDN(g));
  const pwExpired = !u.pwNeverExpires && u.pwdSet && (Date.now() - u.pwdSet.getTime()) > 180 * 864e5;
  return {
    AccountExpirationDate: null, AccountLockoutTime: u.locked ? adTime(u.lockTime || new Date(Date.now() - 36e5)) : null, BadLogonCount: u.locked ? 5 : (u.badPwd || 0), CannotChangePassword: false,
    CanonicalName: ad.domain + '/' + dn.split(',').filter(x => /^OU=|^CN=/.test(x)).reverse().map(x => x.slice(3)).join('/'), City: u.city || null, CN: u.name, Company: u.company || null, Country: null,
    Created: adTime(u.created), Deleted: null, Department: u.dept || null, Description: u.desc || null, DisplayName: u.display || null, DistinguishedName: dn, EmailAddress: u.mail || null, EmployeeID: u.empId || null,
    Enabled: !!u.enabled, GivenName: u.given || null, HomeDirectory: null, LastBadPasswordAttempt: u.locked ? adTime(u.lockTime || new Date(Date.now() - 36e5)) : null, LastLogonDate: adTime(u.lastLogon), LockedOut: !!u.locked,
    logonCount: u.lastLogon ? 40 + u.rid % 300 : 0, Manager: u.manager || null, MemberOf: memberOf, Modified: adTime(u.modified || u.created), Name: u.name, ObjectCategory: `CN=Person,CN=Schema,CN=Configuration,${ad.dn}`,
    ObjectClass: 'user', ObjectGUID: u.guid, Office: u.office || null, OfficePhone: u.phone || null, PasswordExpired: !!pwExpired, PasswordLastSet: adTime(u.pwdSet), PasswordNeverExpires: !!u.pwNeverExpires,
    PasswordNotRequired: false, SamAccountName: u.sam, SID: sidOf(ad, u), Surname: u.sur || null, Title: u.title || null, UserPrincipalName: u.upn || null, whenChanged: adTime(u.modified || u.created), whenCreated: adTime(u.created)
  };
}
const LDAPMAP = { mail: 'EmailAddress', sn: 'Surname', givenname: 'GivenName', telephonenumber: 'OfficePhone', physicaldeliveryofficename: 'Office', samaccountname: 'SamAccountName', userprincipalname: 'UserPrincipalName', distinguishedname: 'DistinguishedName', l: 'City', cn: 'CN', memberof: 'MemberOf', lastlogondate: 'LastLogonDate', pwdlastset: 'PasswordLastSet', whencreated: 'whenCreated', lockedout: 'LockedOut', displayname: 'DisplayName' };
const USER_DEFAULT = ['DistinguishedName', 'Enabled', 'GivenName', 'Name', 'ObjectClass', 'ObjectGUID', 'SamAccountName', 'SID', 'Surname', 'UserPrincipalName'];
function buildObj(types, attrs, defaults, req) {
  let names = defaults.slice();
  if (req) {
    for (const r of req) {
      if (r === '*') { names = Object.keys(attrs); break; }
      const canon = Object.keys(attrs).find(k => k.toLowerCase() === r.toLowerCase()) || LDAPMAP[r.toLowerCase()] || r;
      if (!names.includes(canon)) names.push(canon);
    }
  }
  names.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const o = new PSObject(types);
  for (const n of names) o.add(n, attrs[n] === undefined ? null : attrs[n]);
  o.toStringFn = () => attrs.DistinguishedName;
  return o;
}
GG.adUserObj = function (ad, u, req) { const o = buildObj([ADT + 'ADUser', ADT + 'ADAccount', ADT + 'ADPrincipal', ADT + 'ADObject'], userAttrs(ad, u), USER_DEFAULT, req); o.adRef = u; return o; };
function groupAttrs(ad, g) {
  return { CanonicalName: ad.domain + '/' + GG.adDN(g).split(',').filter(x => /^OU=|^CN=/.test(x)).reverse().map(x => x.slice(3)).join('/'), CN: g.name, Created: adTime(g.created), Description: g.desc || null, DisplayName: null, DistinguishedName: GG.adDN(g), GroupCategory: g.category || 'Security', GroupScope: g.scope || 'Global', ManagedBy: null, MemberOf: ad.groups.filter(x => (x.members || []).includes(g)).map(GG.adDN), Members: (g.members || []).map(GG.adDN), Modified: adTime(g.created), Name: g.name, ObjectCategory: `CN=Group,CN=Schema,CN=Configuration,${ad.dn}`, ObjectClass: 'group', ObjectGUID: g.guid, SamAccountName: g.sam, SID: sidOf(ad, g), whenCreated: adTime(g.created) };
}
GG.adGroupObj = function (ad, g, req) { const o = buildObj([ADT + 'ADGroup', ADT + 'ADPrincipal', ADT + 'ADObject'], groupAttrs(ad, g), ['DistinguishedName', 'GroupCategory', 'GroupScope', 'Name', 'ObjectClass', 'ObjectGUID', 'SamAccountName', 'SID'], req); o.adRef = g; return o; };
function ouAttrs(ad, ou) { return { City: null, Country: null, Created: adTime(ou.created), Description: ou.desc || null, DistinguishedName: GG.adDN(ou), LinkedGroupPolicyObjects: [], ManagedBy: null, Name: ou.name, ObjectClass: 'organizationalUnit', ObjectGUID: ou.guid, PostalCode: null, ProtectedFromAccidentalDeletion: ou.protected !== false, State: null, StreetAddress: null }; }
GG.adOuObj = function (ad, ou, req) { const o = buildObj([ADT + 'ADOrganizationalUnit', ADT + 'ADObject'], ouAttrs(ad, ou), ['City', 'Country', 'DistinguishedName', 'LinkedGroupPolicyObjects', 'ManagedBy', 'Name', 'ObjectClass', 'ObjectGUID', 'PostalCode', 'State', 'StreetAddress'], req); o.adRef = ou; return o; };
function compAttrs(ad, m) { return { DistinguishedName: GG.adDN(m), DNSHostName: m.name.toLowerCase() + '.' + ad.domain, Enabled: m.enabled !== false, IPv4Address: m.ip || null, LastLogonDate: adTime(m.lastLogon), Name: m.name, ObjectClass: 'computer', ObjectGUID: m.guid, OperatingSystem: m.os || null, OperatingSystemVersion: m.osVersion || null, SamAccountName: m.name + '$', SID: sidOf(ad, m), UserPrincipalName: null, whenCreated: adTime(m.created), Description: m.desc || null }; }
GG.adCompObj = function (ad, m, req) { const o = buildObj([ADT + 'ADComputer', ADT + 'ADAccount', ADT + 'ADPrincipal', ADT + 'ADObject'], compAttrs(ad, m), ['DistinguishedName', 'DNSHostName', 'Enabled', 'Name', 'ObjectClass', 'ObjectGUID', 'SamAccountName', 'SID', 'UserPrincipalName'], req); o.adRef = m; return o; };
function objFor(ad, x, req) { return x.kind === 'user' ? GG.adUserObj(ad, x, req) : x.kind === 'group' ? GG.adGroupObj(ad, x, req) : x.kind === 'computer' ? GG.adCompObj(ad, x, req) : GG.adOuObj(ad, x, req); }

/* ---------- Identität ---------- */
function notFound(c, cmd, id) {
  const ad = adOf(c);
  c.error(`Ein Objekt mit der Identität "${V.toStr(id)}" wurde unter "${ad.dn}" nicht gefunden.`, { category: 'ObjectNotFound', exception: ADT + 'ADIdentityNotFoundException', fqid: 'ActiveDirectoryCmdlet:' + ADT + 'ADIdentityNotFoundException,' + ADT + 'Commands.' + cmd.replace('-', ''), noClass: true, target: V.toStr(id), targetType: 'ADUser', reason: 'ADIdentityNotFoundException' });
}
function adErr(c, cmd, msg, cat, exc, target) { c.error(msg, { category: cat || 'NotSpecified', exception: ADT + (exc || 'ADException'), fqid: 'ActiveDirectoryServer:8305,' + ADT + 'Commands.' + cmd.replace('-', ''), noClass: true, target: target || '', reason: exc || 'ADException' }); }
GG.adFind = function (ad, id, kinds, opts) {
  opts = opts || {};
  if (id instanceof PSObject && id.adRef) return kinds.includes(id.adRef.kind) ? id.adRef : null;
  const s = V.toStr(id instanceof PSObject ? (id.get('DistinguishedName') || id.get('SamAccountName') || id.get('Name')) : id).trim();
  const l = s.toLowerCase();
  const all = [];
  if (kinds.includes('user')) all.push(...ad.users);
  if (kinds.includes('group')) all.push(...ad.groups);
  if (kinds.includes('computer')) all.push(...ad.computers);
  if (kinds.includes('ou')) all.push(...ad.ous);
  // DN
  const byDn = all.find(x => GG.adDN(x).toLowerCase() === l);
  if (byDn) return byDn;
  if (opts.dnOnly) { const g = all.find(x => x.guid === l); return g || null; }
  return all.find(x => (x.sam && x.sam.toLowerCase() === l) || (x.kind === 'computer' && (x.name + '$').toLowerCase() === l) || x.guid === l || sidOf(ad, x).toLowerCase() === l || (x.kind === 'ou' && x.name.toLowerCase() === l && false)) || null;
};
function containerExists(ad, dn) {
  const l = dn.toLowerCase();
  return l === ad.dn.toLowerCase() || ad.containers.some(x => x.toLowerCase() === l) || ad.ous.some(o => GG.adDN(o).toLowerCase() === l);
}
function underBase(x, base, scope) {
  const dn = GG.adDN(x).toLowerCase();
  const b = base.toLowerCase();
  if (scope === 'Base') return dn === b;
  if (scope === 'OneLevel') return x.parent.toLowerCase() === b;
  return dn === b || dn.endsWith(',' + b);
}

/* ---------- AD-Filtersprache ---------- */
GG.adFilter = async function (c, filter, attrsFn, cmd) {
  let text = filter instanceof ScriptBlock ? filter.text : V.toStr(filter);
  const src = text;
  text = text.trim();
  if (text === '*') return () => true;
  // Tokenizer
  const toks = []; let i = 0;
  const fail = (pos) => { throw GG.rtErr({ message: `Fehler beim Analysieren der Abfrage: "${src}" Fehlermeldung: "syntax error" an Position: "${pos + 1}".`, category: 'ParserError', exception: 'System.Management.Automation.ParseException', fqid: 'ActiveDirectoryCmdlet:System.Management.Automation.ParseException,' + ADT + 'Commands.' + cmd.replace('-', ''), cmd, target: '', reason: 'ParseException', pos: GG.posOf(c.ctx.cmdNode) }); };
  while (i < text.length) {
    const ch = text[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '(' || ch === ')') { toks.push({ t: ch, pos: i }); i++; continue; }
    if (ch === '-') { const m = /^-([A-Za-z]+)/.exec(text.slice(i)); if (!m) fail(i); toks.push({ t: 'op', v: m[1].toLowerCase(), pos: i }); i += m[0].length; continue; }
    if (ch === '"' || ch === "'") { let j = i + 1, s = ''; while (j < text.length && text[j] !== ch) { s += text[j]; j++; } if (j >= text.length) fail(i); toks.push({ t: 'str', v: s, pos: i }); i = j + 1; continue; }
    if (ch === '$') { const m = /^\$([\w:]+)((?:\.\w+)*)/.exec(text.slice(i)); toks.push({ t: 'var', v: m[1], path: m[2] ? m[2].slice(1).split('.') : [], pos: i }); i += m[0].length; continue; }
    if (/[0-9]/.test(ch)) { const m = /^\d+/.exec(text.slice(i)); toks.push({ t: 'num', v: +m[0], pos: i }); i += m[0].length; continue; }
    if (/[A-Za-z_*]/.test(ch)) { const m = /^[\w*.-]+/.exec(text.slice(i)); toks.push({ t: 'id', v: m[0], pos: i }); i += m[0].length; continue; }
    fail(i);
  }
  let k = 0;
  const peek = () => toks[k];
  const valOf = async (tk) => {
    if (tk.t === 'str') return tk.v.includes('$') && !(filter instanceof ScriptBlock) ? tk.v : tk.v;
    if (tk.t === 'num') return tk.v;
    if (tk.t === 'var') {
      if (/^true$/i.test(tk.v)) return true; if (/^false$/i.test(tk.v)) return false; if (/^null$/i.test(tk.v)) return null;
      let v = I.getVar({ name: tk.v.includes(':') ? tk.v.split(':')[1] : tk.v, scope: tk.v.includes(':') ? tk.v.split(':')[0].toLowerCase() : null }, c.ctx);
      for (const pp of tk.path) v = GG.members.get(v, pp, c.ctx);
      return v;
    }
    if (tk.t === 'id' && tk.v === '*') return '*';
    fail(tk.pos);
  };
  const parseOr = async () => { let l = await parseAnd(); while (peek() && peek().t === 'op' && peek().v === 'or') { k++; const r = await parseAnd(); const a = l, b = r; l = x => a(x) || b(x); } return l; };
  const parseAnd = async () => { let l = await parseNot(); while (peek() && peek().t === 'op' && peek().v === 'and') { k++; const r = await parseNot(); const a = l, b = r; l = x => a(x) && b(x); } return l; };
  const parseNot = async () => { if (peek() && peek().t === 'op' && peek().v === 'not') { k++; const e = await parseNot(); return x => !e(x); } return parsePrim(); };
  const parsePrim = async () => {
    const tk = peek(); if (!tk) fail(text.length - 1);
    if (tk.t === '(') { k++; const e = await parseOr(); if (!peek() || peek().t !== ')') fail(tk.pos); k++; return e; }
    if (tk.t !== 'id') fail(tk.pos);
    k++;
    const prop = tk.v;
    const op = peek(); if (!op || op.t !== 'op') fail(op ? op.pos : text.length - 1);
    k++;
    const vt = peek(); if (!vt) fail(text.length - 1);
    k++;
    const val = await valOf(vt);
    const o = op.v;
    if (!['eq', 'ne', 'like', 'notlike', 'gt', 'ge', 'lt', 'le', 'approx', 'band', 'bor', 'recursivematch'].includes(o)) fail(op.pos);
    return (x) => {
      const attrs = attrsFn(x);
      const key = Object.keys(attrs).find(a => a.toLowerCase() === prop.toLowerCase()) || LDAPMAP[prop.toLowerCase()];
      if (!key || !(key in attrs)) throw GG.rtErr({ message: `Die Eigenschaft "${prop}" wurde im Objekttyp "${attrs.ObjectClass}" nicht gefunden.`, category: 'InvalidArgument', exception: 'System.ArgumentException', fqid: 'ActiveDirectoryCmdlet:System.ArgumentException,' + ADT + 'Commands.' + cmd.replace('-', ''), cmd, reason: 'ArgumentException', pos: GG.posOf(c.ctx.cmdNode) });
      let v = attrs[key];
      if (o === 'like' || o === 'notlike') { const res = V.toArr(v).some(z => V.like(V.toStr(z), V.toStr(val))) || (val === '*' && v !== null && v !== undefined && v !== ''); return o === 'like' ? res : !res; }
      if (o === 'eq') { if (Array.isArray(v)) return v.some(z => V.eq(z, val)); if (v === null || v === undefined) return val === null; if (v instanceof PSDate) return V.eq(v, val); return V.eq(typeof v === 'boolean' ? v : v, val); }
      if (o === 'ne') { if (v === null || v === undefined) return val !== null; return !V.eq(v, val); }
      if (v === null || v === undefined) return false;
      const cmp = V.cmp(v, val);
      return o === 'gt' ? cmp > 0 : o === 'ge' ? cmp >= 0 : o === 'lt' ? cmp < 0 : cmp <= 0;
    };
  };
  const fn = await parseOr();
  if (k < toks.length) fail(toks[k].pos);
  return fn;
};

/* ---------- Get-AD* ---------- */
function getParams(extra) {
  return [P('Identity', 'object', { pos: 0, pipe: 'value' }), P('Filter', 'object', { mandatory: true, altOf: ['Identity', 'LDAPFilter'] }), P('LDAPFilter', 'string'), P('Properties', 'string[]', { aliases: ['Property'] }), P('SearchBase', 'string'), P('SearchScope', 'enum', { values: ['Base', 'OneLevel', 'Subtree'] }), P('Server', 'string'), P('Credential', 'cred'), P('ResultSetSize', 'int'), P('ResultPageSize', 'int'), P('Partition', 'string'), P('AuthType', 'string')].concat(extra || []);
}
function ldapToFilter(s) {
  // sehr einfache Unterstützung (&(a=b)(c=d)) -> Funktion
  const m = s.match(/\(([\w-]+)=([^)]*)\)/g) || [];
  const conds = m.map(x => /\(([\w-]+)=([^)]*)\)/.exec(x)).map(x => [x[1], x[2]]);
  return attrs => conds.every(([k, v]) => { const key = Object.keys(attrs).find(a => a.toLowerCase() === k.toLowerCase()) || LDAPMAP[k.toLowerCase()] || k; if (k.toLowerCase() === 'objectclass') return attrs.ObjectClass === v || v === '*'; return V.like(V.toStr(attrs[key]), v); });
}
async function genericGet(c, p, kind, cmd) {
  const ad = adOf(c);
  if (!reach(c, cmd)) return;
  const attrsOf = x => kind === 'user' ? userAttrs(ad, x) : kind === 'group' ? groupAttrs(ad, x) : kind === 'computer' ? compAttrs(ad, x) : ouAttrs(ad, x);
  const mk = x => objFor(ad, x, p.Properties);
  if (p.Identity !== undefined && p.Identity !== null) {
    for (const id of V.toArr(p.Identity)) {
      const x = GG.adFind(ad, id, [kind]);
      if (!x) { notFound(c, cmd, id instanceof PSObject ? id.get('DistinguishedName') || id : id); continue; }
      c.out(mk(x));
    }
    return;
  }
  const list = kind === 'user' ? ad.users : kind === 'group' ? ad.groups : kind === 'computer' ? ad.computers : ad.ous;
  let base = p.SearchBase || ad.dn;
  if (p.SearchBase && !containerExists(ad, p.SearchBase)) return adErr(c, cmd, 'Das Verzeichnisobjekt wurde nicht gefunden', 'ObjectNotFound', 'ADIdentityNotFoundException', p.SearchBase);
  let fn;
  if (p.LDAPFilter) { const lf = ldapToFilter(p.LDAPFilter); fn = x => lf(attrsOf(x)); }
  else fn = await GG.adFilter(c, p.Filter, attrsOf, cmd);
  let res = list.filter(x => underBase(x, base, p.SearchScope || 'Subtree'));
  res = res.filter(x => fn(x));
  if (p.ResultSetSize) res = res.slice(0, p.ResultSetSize);
  if (c.log) c.log.adFilter = V.toStr(p.Filter instanceof ScriptBlock ? p.Filter.text : p.Filter);
  c.outAll(res.map(mk));
}
def({ name: 'Get-ADUser', module: MOD, version: '1.0.1.0', input: 'each', params: getParams(), run: async (c, p) => genericGet(c, p, 'user', 'Get-ADUser') });
def({ name: 'Get-ADGroup', module: MOD, version: '1.0.1.0', input: 'each', params: getParams(), run: async (c, p) => genericGet(c, p, 'group', 'Get-ADGroup') });
def({ name: 'Get-ADComputer', module: MOD, version: '1.0.1.0', input: 'each', params: getParams(), run: async (c, p) => genericGet(c, p, 'computer', 'Get-ADComputer') });
def({ name: 'Get-ADOrganizationalUnit', module: MOD, version: '1.0.1.0', input: 'each', params: getParams(), run: async (c, p) => genericGet(c, p, 'ou', 'Get-ADOrganizationalUnit') });
GG.view(ADT + 'ADDomain', null);
def({ name: 'Get-ADDomain', module: MOD, version: '1.0.1.0', input: 'none', params: [P('Identity', 'object', { pos: 0 }), P('Server', 'string'), P('Current', 'string')],
  run: async (c) => {
    if (!reach(c, 'Get-ADDomain')) return;
    const ad = adOf(c);
    const dcFqdn = ad.dcHost + '.' + ad.domain.toUpperCase().toLowerCase();
    const o = new PSObject(ADT + 'ADDomain', { AllowedDNSSuffixes: [], ChildDomains: [], ComputersContainer: 'CN=Computers,' + ad.dn, DeletedObjectsContainer: 'CN=Deleted Objects,' + ad.dn, DistinguishedName: ad.dn, DNSRoot: ad.domain, DomainControllersContainer: 'OU=Domain Controllers,' + ad.dn, DomainMode: 'Windows2016Domain', DomainSID: ad.sidBase, ForeignSecurityPrincipalsContainer: 'CN=ForeignSecurityPrincipals,' + ad.dn, Forest: ad.domain, InfrastructureMaster: dcFqdn, LastLogonReplicationInterval: null, LinkedGroupPolicyObjects: ['CN={31B2F340-016D-11D2-945F-00C04FB984F9},CN=Policies,CN=System,' + ad.dn], LostAndFoundContainer: 'CN=LostAndFound,' + ad.dn, ManagedBy: null, Name: ad.netbios.toLowerCase(), NetBIOSName: ad.netbios, ObjectClass: 'domainDNS', ObjectGUID: ad.guid || '9e7c2d10-4a5b-4c3d-8e9f-0a1b2c3d4e5f', ParentDomain: null, PDCEmulator: dcFqdn, PublicKeyRequiredPasswordRolling: true, QuotasContainer: 'CN=NTDS Quotas,' + ad.dn, ReadOnlyReplicaDirectoryServers: [], ReplicaDirectoryServers: [dcFqdn], RIDMaster: dcFqdn, SubordinateReferences: ['DC=ForestDnsZones,' + ad.dn, 'DC=DomainDnsZones,' + ad.dn, 'CN=Configuration,' + ad.dn], SystemsContainer: 'CN=System,' + ad.dn, UsersContainer: 'CN=Users,' + ad.dn });
    c.out(o);
  } });
def({ name: 'Get-ADDomainController', module: MOD, version: '1.0.1.0', input: 'none', params: [P('Identity', 'object', { pos: 0 }), P('Discover', 'switch'), P('Filter', 'object'), P('Server', 'string')],
  run: async (c) => { if (!reach(c, 'Get-ADDomainController')) return; const ad = adOf(c); c.out(new PSObject(ADT + 'ADDomainController', { ComputerObjectDN: `CN=${ad.dcHost},OU=Domain Controllers,${ad.dn}`, DefaultPartition: ad.dn, Domain: ad.domain, Enabled: true, Forest: ad.domain, HostName: ad.dcHost.toLowerCase() + '.' + ad.domain, IPv4Address: ad.dcIp, IsGlobalCatalog: true, IsReadOnly: false, Name: ad.dcHost, OperatingSystem: 'Windows Server 2025 Standard', OperatingSystemVersion: '10.0 (26100)', Site: 'Default-First-Site-Name' })); } });
def({ name: 'Get-ADDefaultDomainPasswordPolicy', module: MOD, version: '1.0.1.0', input: 'none', params: [P('Identity', 'object', { pos: 0 }), P('Server', 'string')],
  run: async (c) => { if (!reach(c, 'Get-ADDefaultDomainPasswordPolicy')) return; const ad = adOf(c); c.out(new PSObject(ADT + 'ADDefaultDomainPasswordPolicy', { ComplexityEnabled: true, DistinguishedName: ad.dn, LockoutDuration: new GG.TimeSpan(30 * 6e4), LockoutObservationWindow: new GG.TimeSpan(30 * 6e4), LockoutThreshold: 5, MaxPasswordAge: new GG.TimeSpan(180 * 864e5), MinPasswordAge: new GG.TimeSpan(864e5), MinPasswordLength: ad.minPw || 8, objectClass: ['domainDNS'], objectGuid: ad.guid || '9e7c2d10-4a5b-4c3d-8e9f-0a1b2c3d4e5f', PasswordHistoryCount: 24, ReversibleEncryptionEnabled: false })); } });

/* ---------- Benutzer anlegen/ändern ---------- */
const USER_SET = [['GivenName', 'given'], ['Surname', 'sur'], ['DisplayName', 'display'], ['Department', 'dept'], ['Title', 'title'], ['Description', 'desc'], ['EmailAddress', 'mail'], ['Office', 'office'], ['City', 'city'], ['Company', 'company'], ['OfficePhone', 'phone'], ['UserPrincipalName', 'upn'], ['EmployeeID', 'empId'], ['Manager', 'manager']];
const pp = (n, t, o) => P(n, t || 'string', Object.assign({ pipe: 'prop' }, o || {}));
def({ name: 'New-ADUser', module: MOD, version: '1.0.1.0', input: 'each', sp: true,
  params: [pp('Name', 'string', { pos: 0, mandatory: true }), pp('SamAccountName'), pp('Path'), P('AccountPassword', 'secure', { pipe: 'prop' }), pp('Enabled', 'bool'), pp('ChangePasswordAtLogon', 'bool'), pp('PasswordNeverExpires', 'bool'), P('OtherAttributes', 'hash'), P('PassThru', 'switch'), P('Instance', 'object'), P('Server', 'string'), P('Credential', 'cred'), pp('Type')].concat(USER_SET.map(([n]) => pp(n))),
  run: async (c, p) => {
    if (!reach(c, 'New-ADUser')) return;
    const ad = adOf(c);
    const path = p.Path || ('CN=Users,' + ad.dn);
    if (!(await c.should(`CN=${p.Name},${path}`, 'New'))) return;
    if (!containerExists(ad, path)) return adErr(c, 'New-ADUser', 'Das Verzeichnisobjekt wurde nicht gefunden', 'ObjectNotFound', 'ADIdentityNotFoundException', `CN=${p.Name},${path}`);
    const sam = p.SamAccountName || p.Name.slice(0, 20);
    if (sam.length > 20) return adErr(c, 'New-ADUser', 'Ein Attributwert befand sich nicht im zulässigen Bereich.', 'NotSpecified', 'ADException', `CN=${p.Name},${path}`);
    if (ad.users.some(u => u.sam.toLowerCase() === sam.toLowerCase()) || ad.groups.some(g => g.sam.toLowerCase() === sam.toLowerCase())) return adErr(c, 'New-ADUser', 'Das angegebene Konto ist bereits vorhanden', 'ResourceExists', 'ADIdentityAlreadyExistsException', `CN=${p.Name},${path}`);
    if ([...ad.users, ...ad.groups, ...ad.computers, ...ad.ous].some(x => GG.adDN(x).toLowerCase() === `cn=${p.Name},${path}`.toLowerCase())) return adErr(c, 'New-ADUser', 'Es wurde versucht, dem Verzeichnis ein Objekt mit einem bereits verwendeten Namen hinzuzufügen', 'NotSpecified', 'ADException', `CN=${p.Name},${path}`);
    const u = { kind: 'user', name: p.Name, sam, parent: path, enabled: false, created: new Date(), modified: new Date(), guid: GG.adGuid(), rid: ad.nextRid++, pwd: '', pwdSet: null };
    for (const [n, k] of USER_SET) if (p[n] !== undefined) u[k] = p[n];
    if (p.OtherAttributes) for (const e of p.OtherAttributes.entries()) { const key = e.key.toLowerCase(); const map = { mail: 'mail', telephonenumber: 'phone', department: 'dept', title: 'title', description: 'desc', physicaldeliveryofficename: 'office', l: 'city', company: 'company', employeeid: 'empId' }; if (map[key]) u[map[key]] = V.toStr(e.value); }
    if (p.PasswordNeverExpires) u.pwNeverExpires = true;
    ad.users.push(u);
    if (c.log) (c.log.created = c.log.created || []).push(sam);
    const pwFail = () => adErr(c, 'New-ADUser', 'Das Kennwort entspricht nicht den Anforderungen der Kennwortrichtlinie. Überprüfen Sie die Kennwortlänge, die Kennwortkomplexität und die Kennwortchronik.', 'InvalidData', 'ADPasswordComplexityException', `CN=${p.Name},${path}`);
    if (p.AccountPassword) {
      if (!GG.pwComplex(p.AccountPassword.plain, ad.minPw || 8)) return pwFail();
      u.pwd = p.AccountPassword.plain; u.pwdSet = p.ChangePasswordAtLogon ? null : new Date();
    }
    if (p.Enabled) { if (!u.pwd) return pwFail(); u.enabled = true; }
    if (p.PassThru) c.out(GG.adUserObj(ad, u));
  } });
def({ name: 'Set-ADUser', module: MOD, version: '1.0.1.0', input: 'each', sp: true,
  params: [P('Identity', 'object', { pos: 0, mandatory: true, pipe: 'value' }), P('Replace', 'hash'), P('Add', 'hash'), P('Clear', 'string[]'), P('Remove', 'hash'), P('Enabled', 'bool'), P('PasswordNeverExpires', 'bool'), P('ChangePasswordAtLogon', 'bool'), P('SamAccountName', 'string'), P('PassThru', 'switch'), P('Server', 'string'), P('Credential', 'cred')].concat(USER_SET.map(([n]) => P(n, 'string'))),
  run: async (c, p) => {
    if (!reach(c, 'Set-ADUser')) return;
    const ad = adOf(c);
    const u = GG.adFind(ad, p.Identity, ['user']);
    if (!u) return notFound(c, 'Set-ADUser', p.Identity);
    if (!(await c.should(GG.adDN(u), 'Set'))) return;
    for (const [n, k] of USER_SET) if (p[n] !== undefined) u[k] = p[n] === '' ? null : p[n];
    const map = { mail: 'mail', telephonenumber: 'phone', department: 'dept', title: 'title', description: 'desc', physicaldeliveryofficename: 'office', l: 'city', company: 'company', employeeid: 'empId', givenname: 'given', sn: 'sur', displayname: 'display' };
    for (const h of [p.Replace, p.Add]) if (h) for (const e of h.entries()) { const k = map[e.key.toLowerCase()]; if (!k) return adErr(c, 'Set-ADUser', `Das angegebene Verzeichnisdienstattribut oder der Wert ist nicht vorhanden. Parametername: ${e.key}`, 'InvalidArgument', 'ADInvalidOperationException'); u[k] = V.toStr(e.value); }
    for (const k of p.Clear || []) { const kk = map[k.toLowerCase()]; if (kk) u[kk] = null; }
    if (p.Enabled !== undefined) { if (p.Enabled && !u.pwd) return adErr(c, 'Set-ADUser', 'Das Kennwort entspricht nicht den Anforderungen der Kennwortrichtlinie. Überprüfen Sie die Kennwortlänge, die Kennwortkomplexität und die Kennwortchronik.', 'InvalidData', 'ADPasswordComplexityException'); u.enabled = p.Enabled; }
    if (p.PasswordNeverExpires !== undefined) u.pwNeverExpires = p.PasswordNeverExpires;
    if (p.ChangePasswordAtLogon) u.pwdSet = null;
    if (p.SamAccountName) u.sam = p.SamAccountName;
    u.modified = new Date();
    if (p.PassThru) c.out(GG.adUserObj(ad, u));
  } });
for (const [nm, kinds] of [['Remove-ADUser', ['user']], ['Remove-ADGroup', ['group']], ['Remove-ADComputer', ['computer']], ['Remove-ADObject', ['user', 'group', 'computer', 'ou']]]) def({ name: nm, module: MOD, version: '1.0.1.0', input: 'each', sp: true, params: [P('Identity', 'object', { pos: 0, mandatory: true, pipe: 'value' }), P('Recursive', 'switch'), P('Server', 'string'), P('Credential', 'cred')],
  run: async (c, p) => {
    if (!reach(c, nm)) return;
    const ad = adOf(c);
    const x = GG.adFind(ad, p.Identity, kinds, { dnOnly: nm === 'Remove-ADObject' });
    if (!x) return notFound(c, nm, p.Identity);
    if (!(await c.should(GG.adDN(x), 'Remove', { high: true }))) return;
    if (x.kind === 'ou') { if (x.protected !== false) return adErr(c, nm, 'Zugriff verweigert', 'PermissionDenied', 'ADException'); }
    const arr = x.kind === 'user' ? ad.users : x.kind === 'group' ? ad.groups : x.kind === 'computer' ? ad.computers : ad.ous;
    arr.splice(arr.indexOf(x), 1);
    for (const g of ad.groups) g.members = (g.members || []).filter(m => m !== x);
  } });
for (const [nm, act] of [['Enable-ADAccount', 'en'], ['Disable-ADAccount', 'dis'], ['Unlock-ADAccount', 'unlock']]) def({ name: nm, module: MOD, version: '1.0.1.0', input: 'each', sp: true, params: [P('Identity', 'object', { pos: 0, mandatory: true, pipe: 'value' }), P('PassThru', 'switch'), P('Server', 'string'), P('Credential', 'cred')],
  run: async (c, p) => {
    if (!reach(c, nm)) return;
    const ad = adOf(c);
    const x = GG.adFind(ad, p.Identity, ['user', 'computer']);
    if (!x) return notFound(c, nm, p.Identity);
    if (!(await c.should(GG.adDN(x), 'Set'))) return;
    if (act === 'en') { if (x.kind === 'user' && !x.pwd) return adErr(c, nm, 'Das Kennwort entspricht nicht den Anforderungen der Kennwortrichtlinie. Überprüfen Sie die Kennwortlänge, die Kennwortkomplexität und die Kennwortchronik.', 'InvalidData', 'ADPasswordComplexityException', GG.adDN(x)); x.enabled = true; }
    else if (act === 'dis') x.enabled = false;
    else { x.locked = false; x.badPwd = 0; }
    x.modified = new Date();
    if (p.PassThru) c.out(objFor(ad, x));
  } });
def({ name: 'Set-ADAccountPassword', module: MOD, version: '1.0.1.0', input: 'each', sp: true, params: [P('Identity', 'object', { pos: 0, mandatory: true, pipe: 'value' }), P('NewPassword', 'secure'), P('OldPassword', 'secure'), P('Reset', 'switch'), P('PassThru', 'switch'), P('Server', 'string'), P('Credential', 'cred')],
  run: async (c, p) => {
    if (!reach(c, 'Set-ADAccountPassword')) return;
    const ad = adOf(c);
    const u = GG.adFind(ad, p.Identity, ['user']);
    if (!u) return notFound(c, 'Set-ADAccountPassword', p.Identity);
    let np = p.NewPassword;
    if (!p.Reset && !p.OldPassword) {
      if (!c.host.interactive) return adErr(c, 'Set-ADAccountPassword', 'Das angegebene Netzwerkkennwort ist falsch.', 'InvalidArgument', 'ADInvalidPasswordException');
      c.host.write(`Kennwort für Benutzer ${GG.adDN(u)}`);
      const old = await c.host.readLine('Kennwort (alt): ', { secure: true });
      if (old === null) throw new GG.StopSignal();
      if (old !== u.pwd) return adErr(c, 'Set-ADAccountPassword', 'Das angegebene Netzwerkkennwort ist falsch.', 'InvalidArgument', 'ADInvalidPasswordException');
    }
    if (!np) {
      if (!c.host.interactive) throw GG.bindErr(c.ctx, 'Set-ADAccountPassword', 'Der Befehl kann nicht verarbeitet werden, da einer oder mehrere obligatorische Parameter fehlen: NewPassword.', 'MissingMandatoryParameter');
      const s = await c.host.readLine('Kennwort (neu): ', { secure: true }); if (s === null) throw new GG.StopSignal();
      const s2 = await c.host.readLine('Kennwort wiederholen (neu): ', { secure: true }); if (s2 === null) throw new GG.StopSignal();
      if (s !== s2) return adErr(c, 'Set-ADAccountPassword', 'Die Kennwörter stimmen nicht überein.', 'InvalidArgument', 'ADException');
      np = new SecureString(s);
    }
    if (!(await c.should(GG.adDN(u), 'Set-ADAccountPassword'))) return;
    if (!GG.pwComplex(np.plain, ad.minPw || 8)) return adErr(c, 'Set-ADAccountPassword', 'Das Kennwort entspricht nicht den Anforderungen der Kennwortrichtlinie. Überprüfen Sie die Kennwortlänge, die Kennwortkomplexität und die Kennwortchronik.', 'InvalidData', 'ADPasswordComplexityException', GG.adDN(u));
    u.pwd = np.plain; u.pwdSet = new Date(); u.modified = new Date();
    if (p.PassThru) c.out(GG.adUserObj(ad, u));
  } });
def({ name: 'Search-ADAccount', module: MOD, version: '1.0.1.0', input: 'none',
  params: [P('LockedOut', 'switch'), P('AccountDisabled', 'switch'), P('AccountInactive', 'switch'), P('AccountExpired', 'switch'), P('AccountExpiring', 'switch'), P('PasswordExpired', 'switch'), P('PasswordNeverExpires', 'switch'), P('TimeSpan', 'timespan'), P('DateTime', 'date'), P('UsersOnly', 'switch'), P('ComputersOnly', 'switch'), P('SearchBase', 'string'), P('SearchScope', 'enum', { values: ['Base', 'OneLevel', 'Subtree'] }), P('ResultSetSize', 'int'), P('Server', 'string')],
  run: async (c, p) => {
    if (!reach(c, 'Search-ADAccount')) return;
    const ad = adOf(c);
    if (!p.LockedOut && !p.AccountDisabled && !p.AccountInactive && !p.AccountExpired && !p.AccountExpiring && !p.PasswordExpired && !p.PasswordNeverExpires) throw GG.bindErr(c.ctx, 'Search-ADAccount', 'Der Parametersatz kann mit den angegebenen benannten Parametern nicht aufgelöst werden.', 'AmbiguousParameterSet');
    let list = (p.ComputersOnly ? [] : ad.users).concat(p.UsersOnly ? [] : ad.computers);
    if (p.SearchBase) list = list.filter(x => underBase(x, p.SearchBase, p.SearchScope || 'Subtree'));
    const cutoff = p.DateTime ? p.DateTime.d.getTime() : Date.now() - (p.TimeSpan ? p.TimeSpan.ms : 15 * 864e5);
    list = list.filter(x => {
      if (p.LockedOut) return !!x.locked;
      if (p.AccountDisabled) return x.enabled === false;
      if (p.AccountInactive) return !x.lastLogon || x.lastLogon.getTime() < cutoff;
      if (p.PasswordNeverExpires) return !!x.pwNeverExpires;
      if (p.PasswordExpired) return x.kind === 'user' && userAttrs(ad, x).PasswordExpired;
      return false;
    });
    for (const x of list) {
      const a = x.kind === 'user' ? userAttrs(ad, x) : compAttrs(ad, x);
      const o = buildObj([ADT + (x.kind === 'user' ? 'ADUser' : 'ADComputer'), ADT + 'ADAccount', ADT + 'ADPrincipal', ADT + 'ADObject'], Object.assign({ AccountExpirationDate: null, LastLogonDate: adTime(x.lastLogon), LockedOut: !!x.locked, PasswordExpired: !!a.PasswordExpired, PasswordNeverExpires: !!x.pwNeverExpires }, a), ['AccountExpirationDate', 'DistinguishedName', 'Enabled', 'LastLogonDate', 'LockedOut', 'Name', 'ObjectClass', 'ObjectGUID', 'PasswordExpired', 'PasswordNeverExpires', 'SamAccountName', 'SID', 'UserPrincipalName']);
      o.adRef = x; c.out(o);
    }
  } });

/* ---------- Gruppen ---------- */
def({ name: 'New-ADGroup', module: MOD, version: '1.0.1.0', input: 'each', sp: true,
  params: [pp('Name', 'string', { pos: 0, mandatory: true }), pp('GroupScope', 'enum', { pos: 1, mandatory: true, values: ['DomainLocal', 'Global', 'Universal'], enumType: ADT + 'ADGroupScope' }), pp('GroupCategory', 'enum', { values: ['Distribution', 'Security'], enumType: ADT + 'ADGroupCategory' }), pp('Path'), pp('Description'), pp('SamAccountName'), pp('DisplayName'), P('PassThru', 'switch'), P('Server', 'string'), P('Credential', 'cred')],
  run: async (c, p) => {
    if (!reach(c, 'New-ADGroup')) return;
    const ad = adOf(c);
    const path = p.Path || ('CN=Users,' + ad.dn);
    if (!(await c.should(`CN=${p.Name},${path}`, 'New'))) return;
    if (!containerExists(ad, path)) return adErr(c, 'New-ADGroup', 'Das Verzeichnisobjekt wurde nicht gefunden', 'ObjectNotFound', 'ADIdentityNotFoundException', `CN=${p.Name},${path}`);
    const sam = p.SamAccountName || p.Name;
    if (ad.groups.some(g => g.sam.toLowerCase() === sam.toLowerCase()) || ad.users.some(u => u.sam.toLowerCase() === sam.toLowerCase())) return adErr(c, 'New-ADGroup', 'Das angegebene Konto ist bereits vorhanden', 'ResourceExists', 'ADIdentityAlreadyExistsException', `CN=${p.Name},${path}`);
    const g = { kind: 'group', name: p.Name, sam, parent: path, scope: p.GroupScope, category: p.GroupCategory || 'Security', desc: p.Description || '', members: [], created: new Date(), guid: GG.adGuid(), rid: ad.nextRid++ };
    ad.groups.push(g);
    if (p.PassThru) c.out(GG.adGroupObj(ad, g));
  } });
def({ name: 'Set-ADGroup', module: MOD, version: '1.0.1.0', input: 'each', sp: true, params: [P('Identity', 'object', { pos: 0, mandatory: true, pipe: 'value' }), P('Description', 'string'), P('GroupScope', 'enum', { values: ['DomainLocal', 'Global', 'Universal'] }), P('GroupCategory', 'enum', { values: ['Distribution', 'Security'] }), P('PassThru', 'switch')],
  run: async (c, p) => { if (!reach(c, 'Set-ADGroup')) return; const ad = adOf(c); const g = GG.adFind(ad, p.Identity, ['group']); if (!g) return notFound(c, 'Set-ADGroup', p.Identity); if (!(await c.should(GG.adDN(g), 'Set'))) return; if (p.Description !== undefined) g.desc = p.Description; if (p.GroupScope) g.scope = p.GroupScope; if (p.GroupCategory) g.category = p.GroupCategory; if (p.PassThru) c.out(GG.adGroupObj(ad, g)); } });
for (const [nm, add] of [['Add-ADGroupMember', true], ['Remove-ADGroupMember', false]]) def({ name: nm, module: MOD, version: '1.0.1.0', input: 'each', sp: true,
  params: [P('Identity', 'object', { pos: 0, mandatory: true, pipe: 'value', pipeType: [ADT + 'ADGroup'] }), P('Members', 'object[]', { pos: 1, mandatory: true }), P('PassThru', 'switch'), P('Server', 'string'), P('Credential', 'cred')],
  run: async (c, p) => {
    if (!reach(c, nm)) return;
    const ad = adOf(c);
    const g = GG.adFind(ad, p.Identity, ['group']);
    if (!g) return notFound(c, nm, p.Identity);
    const mems = [];
    for (const m of U_enum(p.Members)) { const x = GG.adFind(ad, m, ['user', 'group', 'computer']); if (!x) { notFound(c, nm, m instanceof PSObject ? m.get('DistinguishedName') : m); return; } mems.push(x); }
    if (!(await c.should(GG.adDN(g), add ? 'Set' : 'Set', { high: !add }))) return;
    for (const x of mems) {
      if (add) { if (!g.members.includes(x)) g.members.push(x); }
      else g.members = g.members.filter(y => y !== x);
    }
    if (p.PassThru) c.out(GG.adGroupObj(ad, g));
  } });
function U_enum(v) { const r = []; for (const x of V.toArr(v)) { if (Array.isArray(x)) r.push(...x); else r.push(x); } return r; }
def({ name: 'Get-ADGroupMember', module: MOD, version: '1.0.1.0', input: 'each', params: [P('Identity', 'object', { pos: 0, mandatory: true, pipe: 'value' }), P('Recursive', 'switch'), P('Server', 'string'), P('Credential', 'cred')],
  run: async (c, p) => {
    if (!reach(c, 'Get-ADGroupMember')) return;
    const ad = adOf(c);
    const g = GG.adFind(ad, p.Identity, ['group']);
    if (!g) return notFound(c, 'Get-ADGroupMember', p.Identity);
    const res = [];
    const walk = (grp, seen) => { for (const m of grp.members || []) { if (m.kind === 'group' && p.Recursive) { if (!seen.has(m)) { seen.add(m); walk(m, seen); } } else if (!res.includes(m)) res.push(m); } if (p.Recursive) for (const u of ad.users) if (u.primaryGroup === grp.sam && !res.includes(u)) res.push(u); };
    walk(g, new Set([g]));
    for (const m of res) {
      const o = new PSObject([ADT + 'ADPrincipal', ADT + 'ADObject'], { distinguishedName: GG.adDN(m), name: m.name, objectClass: m.kind === 'group' ? 'group' : (m.kind === 'computer' ? 'computer' : 'user'), objectGUID: m.guid, SamAccountName: m.kind === 'computer' ? m.name + '$' : m.sam, SID: sidOf(ad, m) });
      o.adRef = m; o.toStringFn = () => GG.adDN(m);
      c.out(o);
    }
  } });
def({ name: 'Get-ADPrincipalGroupMembership', module: MOD, version: '1.0.1.0', input: 'each', params: [P('Identity', 'object', { pos: 0, mandatory: true, pipe: 'value' }), P('Server', 'string')],
  run: async (c, p) => {
    if (!reach(c, 'Get-ADPrincipalGroupMembership')) return;
    const ad = adOf(c);
    const x = GG.adFind(ad, p.Identity, ['user', 'group', 'computer']);
    if (!x) return notFound(c, 'Get-ADPrincipalGroupMembership', p.Identity);
    const gs = ad.groups.filter(g => (g.members || []).includes(x) || x.primaryGroup === g.sam);
    for (const g of gs) { const o = GG.adGroupObj(ad, g); c.out(o); }
  } });

/* ---------- OUs / Verschieben ---------- */
def({ name: 'New-ADOrganizationalUnit', module: MOD, version: '1.0.1.0', input: 'each', sp: true,
  params: [pp('Name', 'string', { pos: 0, mandatory: true }), pp('Path'), pp('Description'), P('ProtectedFromAccidentalDeletion', 'bool'), P('PassThru', 'switch'), P('Server', 'string'), P('Credential', 'cred')],
  run: async (c, p) => {
    if (!reach(c, 'New-ADOrganizationalUnit')) return;
    const ad = adOf(c);
    const path = p.Path || ad.dn;
    if (!(await c.should(`OU=${p.Name},${path}`, 'New'))) return;
    if (!containerExists(ad, path)) return adErr(c, 'New-ADOrganizationalUnit', 'Das Verzeichnisobjekt wurde nicht gefunden', 'ObjectNotFound', 'ADIdentityNotFoundException', `OU=${p.Name},${path}`);
    if (ad.ous.some(o => GG.adDN(o).toLowerCase() === `ou=${p.Name},${path}`.toLowerCase())) return adErr(c, 'New-ADOrganizationalUnit', 'Es wurde versucht, dem Verzeichnis ein Objekt mit einem bereits verwendeten Namen hinzuzufügen', 'NotSpecified', 'ADException', `OU=${p.Name},${path}`);
    const ou = { kind: 'ou', name: p.Name, parent: path, desc: p.Description || '', protected: p.ProtectedFromAccidentalDeletion !== false, created: new Date(), guid: GG.adGuid() };
    ad.ous.push(ou);
    if (p.PassThru) c.out(GG.adOuObj(ad, ou));
  } });
def({ name: 'Set-ADOrganizationalUnit', module: MOD, version: '1.0.1.0', input: 'each', sp: true, params: [P('Identity', 'object', { pos: 0, mandatory: true, pipe: 'value' }), P('Description', 'string'), P('ProtectedFromAccidentalDeletion', 'bool'), P('PassThru', 'switch')],
  run: async (c, p) => { if (!reach(c, 'Set-ADOrganizationalUnit')) return; const ad = adOf(c); const ou = GG.adFind(ad, p.Identity, ['ou'], { dnOnly: true }); if (!ou) return notFound(c, 'Set-ADOrganizationalUnit', p.Identity); if (!(await c.should(GG.adDN(ou), 'Set'))) return; if (p.Description !== undefined) ou.desc = p.Description; if (p.ProtectedFromAccidentalDeletion !== undefined) ou.protected = p.ProtectedFromAccidentalDeletion; if (p.PassThru) c.out(GG.adOuObj(ad, ou)); } });
def({ name: 'Remove-ADOrganizationalUnit', module: MOD, version: '1.0.1.0', input: 'each', sp: true, params: [P('Identity', 'object', { pos: 0, mandatory: true, pipe: 'value' }), P('Recursive', 'switch')],
  run: async (c, p) => {
    if (!reach(c, 'Remove-ADOrganizationalUnit')) return;
    const ad = adOf(c); const ou = GG.adFind(ad, p.Identity, ['ou'], { dnOnly: true });
    if (!ou) return notFound(c, 'Remove-ADOrganizationalUnit', p.Identity);
    if (!(await c.should(GG.adDN(ou), 'Remove', { high: true }))) return;
    if (ou.protected !== false) return adErr(c, 'Remove-ADOrganizationalUnit', 'Zugriff verweigert', 'PermissionDenied', 'ADException', GG.adDN(ou));
    const dn = GG.adDN(ou).toLowerCase();
    const kids = [...ad.users, ...ad.groups, ...ad.computers, ...ad.ous].filter(x => x !== ou && GG.adDN(x).toLowerCase().endsWith(',' + dn));
    if (kids.length && !p.Recursive) return adErr(c, 'Remove-ADOrganizationalUnit', 'Der Verzeichnisdienst kann den angeforderten Vorgang nur für ein Blattobjekt ausführen.', 'NotSpecified', 'ADException', GG.adDN(ou));
    for (const x of kids.concat([ou])) { const arr = x.kind === 'user' ? ad.users : x.kind === 'group' ? ad.groups : x.kind === 'computer' ? ad.computers : ad.ous; if (arr.includes(x)) arr.splice(arr.indexOf(x), 1); }
  } });
def({ name: 'Move-ADObject', module: MOD, version: '1.0.1.0', input: 'each', sp: true, params: [P('Identity', 'object', { pos: 0, mandatory: true, pipe: 'value' }), P('TargetPath', 'string', { pos: 1, mandatory: true }), P('PassThru', 'switch'), P('Server', 'string'), P('Credential', 'cred')],
  run: async (c, p) => {
    if (!reach(c, 'Move-ADObject')) return;
    const ad = adOf(c);
    const x = GG.adFind(ad, p.Identity, ['user', 'group', 'computer', 'ou'], { dnOnly: true });
    if (!x) return notFound(c, 'Move-ADObject', p.Identity instanceof PSObject ? p.Identity.get('DistinguishedName') : p.Identity);
    if (!containerExists(ad, p.TargetPath)) return adErr(c, 'Move-ADObject', 'Das Verzeichnisobjekt wurde nicht gefunden', 'ObjectNotFound', 'ADIdentityNotFoundException', GG.adDN(x));
    if (!(await c.should(GG.adDN(x), 'Move'))) return;
    if (x.kind === 'ou' && x.protected !== false) return adErr(c, 'Move-ADObject', 'Zugriff verweigert', 'PermissionDenied', 'ADException', GG.adDN(x));
    if ([...ad.users, ...ad.groups, ...ad.computers, ...ad.ous].some(y => y !== x && GG.adDN(y).toLowerCase() === `${x.kind === 'ou' ? 'ou' : 'cn'}=${x.name},${p.TargetPath}`.toLowerCase())) return adErr(c, 'Move-ADObject', 'Es wurde versucht, dem Verzeichnis ein Objekt mit einem bereits verwendeten Namen hinzuzufügen', 'NotSpecified', 'ADException', GG.adDN(x));
    const oldDn = GG.adDN(x);
    x.parent = p.TargetPath;
    if (x.kind === 'ou') for (const y of [...ad.users, ...ad.groups, ...ad.computers, ...ad.ous]) if (y.parent.toLowerCase().endsWith(oldDn.toLowerCase())) y.parent = y.parent.slice(0, y.parent.length - oldDn.length) + GG.adDN(x);
    if (p.PassThru) c.out(objFor(ad, x));
  } });
def({ name: 'Rename-ADObject', module: MOD, version: '1.0.1.0', input: 'each', sp: true, params: [P('Identity', 'object', { pos: 0, mandatory: true, pipe: 'value' }), P('NewName', 'string', { pos: 1, mandatory: true }), P('PassThru', 'switch')],
  run: async (c, p) => {
    if (!reach(c, 'Rename-ADObject')) return;
    const ad = adOf(c);
    const x = GG.adFind(ad, p.Identity, ['user', 'group', 'computer', 'ou'], { dnOnly: true });
    if (!x) return notFound(c, 'Rename-ADObject', p.Identity instanceof PSObject ? p.Identity.get('DistinguishedName') : p.Identity);
    if (!(await c.should(GG.adDN(x), 'Rename'))) return;
    x.name = p.NewName;
    if (p.PassThru) c.out(objFor(ad, x));
  } });

/* Alle AD-Objekte: Listenansicht (Standard: > 4 Eigenschaften) */
})();
