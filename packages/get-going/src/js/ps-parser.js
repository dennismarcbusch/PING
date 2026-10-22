/* Get-Going! – Parser für eine PowerShell-5.1-Teilmenge */
(function () {
'use strict';
const GG = globalThis.GG = globalThis.GG || {};

class ParseError extends Error {
  constructor(msg, fqid, pos, incomplete) { super(msg); this.fqid = fqid; this.pos = pos; this.incomplete = !!incomplete; }
}
GG.ParseError = ParseError;

const CMPOPS = ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'like', 'notlike', 'match', 'notmatch', 'contains', 'notcontains', 'in', 'notin', 'replace', 'split', 'join', 'is', 'isnot', 'as', 'band', 'bor', 'bxor', 'shl', 'shr'];
const CMP_ALL = new Set();
for (const o of CMPOPS) { CMP_ALL.add(o); if (!['is', 'isnot', 'as', 'join', 'band', 'bor', 'bxor', 'shl', 'shr'].includes(o)) { CMP_ALL.add('c' + o); CMP_ALL.add('i' + o); } }
const DQ = '"\u201C\u201D\u201E';
const SQ = "'\u2018\u2019\u201A\u201B";
const isWordCh = c => c !== undefined && /[A-Za-z0-9_\u00C0-\u024F]/.test(c);
const isIdStart = c => c !== undefined && /[A-Za-z_\u00C0-\u024F]/.test(c);

class Parser {
  constructor(text, file) {
    this.s = text.replace(/\r\n?/g, '\n');
    this.i = 0;
    this.src = { text: this.s, file: file || null };
  }
  peek(o) { return this.s[this.i + (o || 0)]; }
  eof() { return this.i >= this.s.length; }
  posInfo(at) {
    at = at === undefined ? this.i : at;
    const before = this.s.slice(0, at);
    const line = before.split('\n').length;
    const ls = before.lastIndexOf('\n') + 1;
    let le = this.s.indexOf('\n', at); if (le < 0) le = this.s.length;
    return { file: this.src.file, line, col: at - ls + 1, text: this.s.slice(ls, le), len: 1 };
  }
  fail(msg, fqid, at, incomplete) { throw new ParseError(msg, fqid || 'UnexpectedToken', this.posInfo(at), incomplete && (at === undefined ? this.i : at) >= this.s.length); }
  unexpected() {
    const m = /^(\S+?)(?=[\s;|)}]|$)/.exec(this.s.slice(this.i)) || ['', this.peek()];
    this.fail(`Unerwartetes Token "${m[1] || this.peek()}" in Ausdruck oder Anweisung.`, 'UnexpectedToken');
  }

  skipWs() {
    for (;;) {
      const c = this.peek();
      if (c === ' ' || c === '\t' || c === '\u00A0') { this.i++; continue; }
      if (c === '`' && this.peek(1) === '\n') { this.i += 2; continue; }
      if (c === '#') { while (!this.eof() && this.peek() !== '\n') this.i++; continue; }
      if (c === '<' && this.peek(1) === '#') {
        const j = this.s.indexOf('#>', this.i + 2);
        if (j < 0) { this.i = this.s.length; this.fail('Das Ende des Blockkommentars "#>" fehlt.', 'MissingEndOfComment', undefined, true); }
        this.i = j + 2; continue;
      }
      break;
    }
  }
  skipWsNl() { for (;;) { this.skipWs(); if (this.peek() === '\n') { this.i++; continue; } break; } }
  skipSep() { for (;;) { this.skipWs(); const c = this.peek(); if (c === '\n' || c === ';') { this.i++; continue; } break; } }

  wordAt(at) { const m = /^[A-Za-z_][\w-]*/.exec(this.s.slice(at === undefined ? this.i : at)); return m ? m[0] : ''; }
  kw(word) { // Schlüsselwort an aktueller Position?
    const w = this.s.slice(this.i, this.i + word.length);
    if (w.toLowerCase() !== word) return false;
    const n = this.s[this.i + word.length];
    return !isWordCh(n) && n !== '-';
  }
  nextNonWs(from) { let j = from; while (j < this.s.length && /[ \t]/.test(this.s[j])) j++; return this.s[j]; }

  /* ===== Skript ===== */
  parseScript() {
    const start = this.i;
    const body = this.parseScriptBody(null);
    if (!this.eof()) this.unexpected();
    return Object.assign(body, { t: 'script', src: this.src, s: start, e: this.i });
  }
  parseScriptBody(term) {
    this.skipSep();
    const res = { params: null, begin: null, process: null, end: null, body: null, cmdletBinding: false };
    // Attribute vor param
    let save = this.i;
    while (this.peek() === '[') {
      const txt = this.readBracket();
      if (/^\[\s*CmdletBinding/i.test(txt)) res.cmdletBinding = true;
      this.skipSep();
      if (!this.kw('param')) { this.i = save; break; }
      save = this.i;
    }
    if (this.kw('param') && this.nextNonWs(this.i + 5) === '(') {
      this.i += 5; this.skipWs();
      res.params = this.parseParamList(')');
      this.skipSep();
    }
    // benannte Blöcke?
    const w = this.wordAt().toLowerCase();
    if (['begin', 'process', 'end'].includes(w) && this.nextNonWsNl(this.i + w.length) === '{') {
      for (;;) {
        this.skipSep();
        const ww = this.wordAt().toLowerCase();
        if (!['begin', 'process', 'end'].includes(ww)) break;
        this.i += ww.length; this.skipWsNl();
        res[ww] = this.parseBlock();
      }
      this.skipSep();
      return res;
    }
    res.body = this.parseStatementList(term);
    return res;
  }
  nextNonWsNl(from) { let j = from; while (j < this.s.length && /[ \t\n]/.test(this.s[j])) j++; return this.s[j]; }

  readBracket() { // ab '[' bis passendes ']'
    const st = this.i; let depth = 0;
    while (!this.eof()) {
      const c = this.peek();
      if (c === '[') depth++;
      else if (c === ']') { depth--; if (depth === 0) { this.i++; return this.s.slice(st, this.i); } }
      else if (SQ.includes(c) || DQ.includes(c)) { this.parseStringLiteral(); continue; }
      this.i++;
    }
    this.fail('Die schließende "]" fehlt.', 'EndSquareBracketExpectedAtEndOfAttribute', undefined, true);
  }

  parseParamList(close) {
    // nach '(' bzw. Funktions-Kopf
    if (this.peek() !== '(') this.fail('"(" erwartet.', 'MissingOpenParenthesis');
    this.i++;
    const params = [];
    for (;;) {
      this.skipWsNl();
      if (this.peek() === ')') { this.i++; break; }
      if (this.eof()) this.fail('Die schließende ")" fehlt in einem Ausdruck.', 'MissingEndParenthesisInExpression', undefined, true);
      const p = { name: null, type: null, mandatory: false, position: null, pipe: false, pipeProp: false, validateSet: null, def: null, aliases: [], help: null };
      while (this.peek() === '[') {
        const txt = this.readBracket();
        const inner = txt.slice(1, -1).trim();
        const am = /^(\w+)\s*\(([\s\S]*)\)$/.exec(inner);
        if (am) {
          const an = am[1].toLowerCase(), args = am[2];
          if (an === 'parameter') {
            if (/mandatory(\s*=\s*\$true)?(?!\s*=\s*\$false)/i.test(args)) p.mandatory = true;
            const pm = /position\s*=\s*(\d+)/i.exec(args); if (pm) p.position = +pm[1];
            if (/ValueFromPipeline(?!ByPropertyName)(\s*=\s*\$true)?(?!\s*=\s*\$false)/i.test(args)) p.pipe = true;
            if (/ValueFromPipelineByPropertyName(\s*=\s*\$true)?/i.test(args)) p.pipeProp = true;
            const hm = /HelpMessage\s*=\s*["']([^"']*)["']/i.exec(args); if (hm) p.help = hm[1];
          } else if (an === 'validateset') {
            p.validateSet = (args.match(/'[^']*'|"[^"]*"/g) || []).map(x => x.slice(1, -1));
          } else if (an === 'validaterange') {
            const r = args.split(',').map(x => parseFloat(x)); p.validateRange = r;
          } else if (an === 'alias') {
            p.aliases = (args.match(/'[^']*'|"[^"]*"/g) || []).map(x => x.slice(1, -1));
          } else if (an === 'validatenotnullorempty') p.notEmpty = true;
        } else if (/^\w+$/.test(inner) && /^(Parameter|ValidateNotNullOrEmpty|ValidateNotNull|AllowNull)$/i.test(inner)) {
          if (/^parameter$/i.test(inner)) { /* nichts */ }
          if (/^ValidateNotNull/i.test(inner)) p.notEmpty = true;
        } else p.type = inner;
        this.skipWsNl();
      }
      if (this.peek() !== '$') this.fail('Im Parameterblock wird ein Variablenname erwartet.', 'InvalidFunctionParameter');
      this.i++;
      const m = /^[\w]+/.exec(this.s.slice(this.i));
      if (!m) this.fail('Ungültiger Variablenname.', 'InvalidVariableReference');
      p.name = m[0]; this.i += m[0].length;
      this.skipWsNl();
      if (this.peek() === '=') { this.i++; this.skipWsNl(); p.def = this.parseExpression(true); this.skipWsNl(); }
      params.push(p);
      if (this.peek() === ',') { this.i++; continue; }
      if (this.peek() === ')') { this.i++; break; }
      this.fail('Die schließende ")" fehlt in einem Ausdruck.', 'MissingEndParenthesisInExpression', undefined, true);
    }
    return params;
  }

  parseBlock() { // { statements }
    if (this.peek() !== '{') this.fail('Der Anweisungsblock fehlt.', 'MissingStatementBlock', undefined, true);
    const st = this.i; this.i++;
    const body = this.parseStatementList('}');
    if (this.peek() !== '}') this.fail('Die schließende "}" fehlt im Anweisungsblock oder in der Typdefinition.', 'MissingEndCurlyBrace', undefined, true);
    this.i++;
    return { t: 'block', body, s: st, e: this.i };
  }

  parseStatementList(term) {
    const list = [];
    for (;;) {
      this.skipSep();
      if (this.eof()) { if (term) this.fail(term === '}' ? 'Die schließende "}" fehlt im Anweisungsblock oder in der Typdefinition.' : 'Die schließende ")" fehlt in einem Ausdruck.', term === '}' ? 'MissingEndCurlyBrace' : 'MissingEndParenthesisInExpression', undefined, true); break; }
      const c = this.peek();
      if (term && c === term) break;
      if (c === '}' || c === ')') { if (!term) this.unexpected(); break; }
      list.push(this.parseStatement());
      this.skipWs();
      const n = this.peek();
      if (this.eof() || n === '\n' || n === ';') continue;
      if (term && n === term) continue;
      if (n === '&' && this.peek(1) === '&') this.fail('Das Token "&&" ist in dieser Version kein gültiges Anweisungstrennzeichen.', 'InvalidEndOfLine');
      if (n === '|' && this.peek(1) === '|') this.fail('Das Token "||" ist in dieser Version kein gültiges Anweisungstrennzeichen.', 'InvalidEndOfLine');
      this.unexpected();
    }
    return list;
  }

  parseStatement() {
    this.skipWs();
    const st = this.i;
    const w = this.wordAt().toLowerCase();
    const after = this.nextNonWs(this.i + w.length);
    switch (w) {
      case 'if': if (after === '(') return this.parseIf(); break;
      case 'foreach': if (after === '(') return this.parseForeach(); break;
      case 'for': if (after === '(') return this.parseFor(); break;
      case 'while': if (after === '(') return this.parseWhile(); break;
      case 'do': if (this.nextNonWsNl(this.i + 2) === '{') return this.parseDo(); break;
      case 'switch': if (after === '(' || after === '-') return this.parseSwitch(); break;
      case 'function': case 'filter': if (this.kw(w)) return this.parseFunction(w === 'filter'); break;
      case 'try': if (this.nextNonWsNl(this.i + 3) === '{') return this.parseTry(); break;
      case 'return': case 'throw': case 'exit':
        if (this.kw(w)) {
          this.i += w.length; this.skipWs();
          let value = null;
          const c = this.peek();
          if (!(this.eof() || c === '\n' || c === ';' || c === '}' || c === ')')) value = this.parsePipeline();
          return { t: w, value, s: st, e: this.i, src: this.src };
        }
        break;
      case 'break': case 'continue':
        if (this.kw(w)) { this.i += w.length; this.skipWs(); let label = null; const m = /^\w+/.exec(this.s.slice(this.i)); if (m) { label = m[0]; this.i += m[0].length; } return { t: w, label }; }
        break;
    }
    return this.parsePipeline();
  }

  parseCond(kwText) {
    this.skipWs();
    if (this.peek() !== '(') this.fail(`Nach "${kwText}" fehlt "(".`, 'MissingOpenParenthesisInIfStatement', undefined, true);
    this.i++; this.skipWsNl();
    if (this.peek() === ')') this.fail(`Fehlende Bedingung in der ${kwText}-Anweisung nach "${kwText} (".`, 'IfStatementMissingCondition');
    if (this.eof()) this.fail('Die schließende ")" fehlt in einem Ausdruck.', 'MissingEndParenthesisInExpression', undefined, true);
    const cond = this.parsePipeline();
    this.skipWsNl();
    if (this.peek() !== ')') this.fail('Die schließende ")" fehlt in einem Ausdruck.', 'MissingEndParenthesisInExpression', undefined, true);
    this.i++;
    return cond;
  }

  parseIf() {
    const clauses = []; let els = null;
    this.i += 2;
    let cond = this.parseCond('if'); this.skipWsNl();
    if (this.peek() !== '{') this.fail('Nach "if (Bedingung)" fehlt der Anweisungsblock.', 'MissingStatementBlock', undefined, true);
    clauses.push({ cond, body: this.parseBlock() });
    for (;;) {
      const save = this.i;
      this.skipWsNl();
      if (this.kw('elseif')) { this.i += 6; cond = this.parseCond('elseif'); this.skipWsNl(); clauses.push({ cond, body: this.parseBlock() }); continue; }
      if (this.kw('else')) { this.i += 4; this.skipWsNl(); if (this.peek() !== '{') this.fail('Nach dem Schlüsselwort "else" fehlt der Anweisungsblock.', 'MissingStatementBlockAfterElse', undefined, true); els = this.parseBlock(); }
      else this.i = save;
      break;
    }
    return { t: 'if', clauses, els };
  }
  parseForeach() {
    this.i += 7; this.skipWs(); this.i++; this.skipWsNl();
    if (this.peek() !== '$') this.fail('In der foreach-Anweisung fehlt der Variablenname.', 'MissingVariableNameAfterForeach');
    this.i++;
    const m = /^\w+/.exec(this.s.slice(this.i)); if (!m) this.fail('Ungültiger Variablenname.', 'InvalidVariableReference');
    this.i += m[0].length; this.skipWsNl();
    if (!this.kw('in')) this.fail('In der foreach-Anweisung fehlt das Schlüsselwort "in".', 'MissingInInForeach');
    this.i += 2; this.skipWsNl();
    const iter = this.parsePipeline(); this.skipWsNl();
    if (this.peek() !== ')') this.fail('Die schließende ")" fehlt in einem Ausdruck.', 'MissingEndParenthesisInExpression', undefined, true);
    this.i++; this.skipWsNl();
    if (this.peek() !== '{') this.fail('In der foreach-Schleife fehlt der Anweisungstext.', 'MissingForeachStatement', undefined, true);
    return { t: 'foreach', v: m[0], iter, body: this.parseBlock() };
  }
  parseFor() {
    this.i += 3; this.skipWs(); this.i++;
    const parts = [];
    for (let k = 0; k < 3; k++) {
      this.skipWsNl();
      const c = this.peek();
      if ((k < 2 && c === ';') || (k === 2 && c === ')')) parts.push(null);
      else parts.push(this.parsePipeline());
      this.skipWsNl();
      if (k < 2) { if (this.peek() !== ';') this.fail('In der for-Schleife fehlt ";".', 'MissingSemicolonInForLoop'); this.i++; }
    }
    if (this.peek() !== ')') this.fail('Die schließende ")" fehlt in einem Ausdruck.', 'MissingEndParenthesisInExpression', undefined, true);
    this.i++; this.skipWsNl();
    return { t: 'for', init: parts[0], cond: parts[1], step: parts[2], body: this.parseBlock() };
  }
  parseWhile() { this.i += 5; const cond = this.parseCond('while'); this.skipWsNl(); return { t: 'while', cond, body: this.parseBlock() }; }
  parseDo() {
    this.i += 2; this.skipWsNl(); const body = this.parseBlock(); this.skipWsNl();
    let until = false;
    if (this.kw('while')) this.i += 5; else if (this.kw('until')) { this.i += 5; until = true; } else this.fail('In der do-Schleife fehlt "while" oder "until".', 'MissingWhileOrUntilInDoWhile', undefined, true);
    const cond = this.parseCond(until ? 'until' : 'while');
    return { t: 'do', body, cond, until };
  }
  parseSwitch() {
    this.i += 6; const opts = {};
    for (;;) {
      this.skipWs();
      if (this.peek() === '-') { const w = this.wordAt(this.i + 1).toLowerCase(); this.i += 1 + w.length; opts[w] = true; continue; }
      break;
    }
    const value = this.parseCond('switch'); this.skipWsNl();
    if (this.peek() !== '{') this.fail('Der Text der switch-Anweisung fehlt.', 'MissingSwitchStatementClause', undefined, true);
    this.i++;
    const clauses = [];
    for (;;) {
      this.skipSep();
      if (this.peek() === '}') { this.i++; break; }
      if (this.eof()) this.fail('Die schließende "}" fehlt im Anweisungsblock oder in der Typdefinition.', 'MissingEndCurlyBrace', undefined, true);
      let pat;
      if (this.kw('default')) { this.i += 7; pat = { t: 'default' }; }
      else if (this.peek() === '{') pat = { t: 'sb', block: this.parseScriptBlockLiteral() };
      else pat = this.parseArgPrimary();
      this.skipWsNl();
      clauses.push({ pat, body: this.parseBlock() });
    }
    return { t: 'switch', value, opts, clauses };
  }
  parseFunction(isFilter) {
    const st = this.i;
    this.i += isFilter ? 6 : 8; this.skipWs();
    const m = /^[^\s{(]+/.exec(this.s.slice(this.i));
    if (!m) this.fail('Nach "function" fehlt der Funktionsname.', 'MissingNameAfterKeyword');
    this.i += m[0].length; this.skipWs();
    let inline = null;
    if (this.peek() === '(') inline = this.parseParamList(')');
    this.skipWsNl();
    if (this.peek() !== '{') this.fail('Der Funktionstext fehlt in der Funktionsdeklaration.', 'MissingFunctionBody', undefined, true);
    const bst = this.i; this.i++;
    const body = this.parseScriptBody('}');
    if (this.peek() !== '}') this.fail('Die schließende "}" fehlt im Anweisungsblock oder in der Typdefinition.', 'MissingEndCurlyBrace', undefined, true);
    this.i++;
    if (inline && !body.params) body.params = inline;
    if (isFilter && body.body && !body.process) { body.process = { t: 'block', body: body.body }; body.body = null; }
    return { t: 'function', name: m[0], def: Object.assign(body, { t: 'script', src: this.src, text: this.s.slice(bst + 1, this.i - 1) }), s: st, e: this.i };
  }
  parseTry() {
    this.i += 3; this.skipWsNl();
    const body = this.parseBlock(); const catches = []; let fin = null;
    for (;;) {
      const save = this.i; this.skipWsNl();
      if (this.kw('catch')) {
        this.i += 5; this.skipWs(); const types = [];
        while (this.peek() === '[') { types.push(this.readBracket().slice(1, -1).trim()); this.skipWs(); if (this.peek() === ',') { this.i++; this.skipWsNl(); } }
        this.skipWsNl(); catches.push({ types, body: this.parseBlock() }); continue;
      }
      if (this.kw('finally')) { this.i += 7; this.skipWsNl(); fin = this.parseBlock(); break; }
      this.i = save; break;
    }
    if (!catches.length && !fin) this.fail('Die try-Anweisung hat keinen catch- oder finally-Block.', 'MissingCatchOrFinally', undefined, true);
    return { t: 'try', body, catches, fin };
  }

  /* ===== Pipeline ===== */
  isExprStart() {
    const c = this.peek(), n = this.peek(1);
    if (c === '$' || c === '(' || c === '[' || c === '!' || c === ',' || c === '{') return true;
    if (c === '@' && (n === '(' || n === '{' || n === '"' || n === "'")) return true;
    if (SQ.includes(c) || DQ.includes(c)) return true;
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(n))) {
      const m = /^(0x[0-9a-f]+|(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)(kb|mb|gb|tb|pb)?/i.exec(this.s.slice(this.i));
      const nx = this.s[this.i + m[0].length];
      return !(nx !== undefined && /[A-Za-z_\\:]/.test(nx));
    }
    if (c === '-' || c === '+') {
      if (/[0-9.]/.test(n) || n === '$' || n === '(') return true;
      const w = this.wordAt(this.i + 1).toLowerCase();
      if (['not', 'split', 'join', 'bnot'].includes(w)) return true;
    }
    return false;
  }

  parsePipeline() {
    this.skipWs();
    const st = this.i;
    const els = [];
    if (this.peek() === '|') this.fail('Leeres Pipeelement ist nicht zulässig.', 'EmptyPipeElement');
    if (this.isExprStart()) {
      const expr = this.parseExpression();
      this.skipWs();
      const am = /^(=|\+=|-=|\*=|\/=|%=)(?!=)/.exec(this.s.slice(this.i));
      if (am) {
        if (!['var', 'member', 'index', 'cast', 'array'].includes(expr.t)) this.fail('Der Zuweisungsausdruck ist ungültig. Die Eingabe für einen Zuweisungsoperator muss ein Objekt sein, das Zuweisungen akzeptieren kann, z. B. eine Variable oder Eigenschaft.', 'InvalidLeftHandSide', st);
        this.i += am[1].length; this.skipWsNl();
        if (this.eof()) this.fail(`Sie müssen einen Wertausdruck nach dem Operator "${am[1]}" angeben.`, 'ExpectedValueExpression', undefined, true);
        const value = this.parseStatement();
        return { t: 'assign', target: expr, op: am[1], value, s: st, e: this.i, src: this.src };
      }
      els.push({ t: 'expr', expr, s: st, e: this.i, redirs: this.parseRedirs() });
    } else {
      els.push(this.parseCommand());
    }
    for (;;) {
      this.skipWs();
      if (this.peek() === '|' && this.peek(1) !== '|') {
        this.i++; this.skipWsNl();
        if (this.eof()) this.fail('Leeres Pipeelement ist nicht zulässig.', 'EmptyPipeElement', undefined, true);
        if (this.peek() === '|' || this.peek() === ')' || this.peek() === '}' || this.peek() === ';') this.fail('Leeres Pipeelement ist nicht zulässig.', 'EmptyPipeElement');
        if (this.isExprStart() && this.peek() !== '&') this.fail('Ausdrücke sind nur als erstes Element einer Pipeline zulässig.', 'ExpressionsMustBeFirstInPipeline');
        els.push(this.parseCommand());
        continue;
      }
      break;
    }
    return { t: 'pipeline', els, s: st, e: this.i, src: this.src };
  }

  parseRedirs() {
    const r = [];
    for (;;) {
      this.skipWs();
      const m = /^([*1-6])?(>>?)(&1)?/.exec(this.s.slice(this.i));
      if (!m) break;
      this.i += m[0].length; this.skipWs();
      const red = { stream: m[1] || '1', append: m[2] === '>>', merge: !!m[3] };
      if (!red.merge) {
        if (this.eof() || this.peek() === '\n') this.fail('In der Umleitung fehlt eine Dateispezifikation.', 'MissingFileSpecification');
        red.target = this.parseArgPrimary();
      }
      r.push(red);
    }
    if (this.peek() === '<') this.fail('Der Operator "<" ist für die zukünftige Verwendung reserviert.', 'RedirectionNotSupported');
    return r;
  }

  parseCommand() {
    this.skipWs();
    const st = this.i;
    let invoke = null, name = null;
    if (this.peek() === '&' && this.peek(1) !== '&') {
      invoke = '&'; this.i++; this.skipWs();
      name = this.parseCmdNameExpr();
    } else if (this.peek() === '.' && /[ \t]/.test(this.peek(1) || '')) {
      invoke = '.'; this.i++; this.skipWs();
      name = this.parseCmdNameExpr();
    } else {
      const c = this.peek();
      if (SQ.includes(c) || DQ.includes(c) || c === '$' || c === '(') this.fail('Ausdrücke sind nur als erstes Element einer Pipeline zulässig.', 'ExpressionsMustBeFirstInPipeline');
      const m = /^[^\s|;(){}&,]+/.exec(this.s.slice(this.i));
      if (!m) this.unexpected();
      this.i += m[0].length;
      name = { t: 'str', v: m[0] };
    }
    const nameEnd = this.i;
    const args = []; let redirs = [];
    for (;;) {
      this.skipWs();
      const c = this.peek();
      if (this.eof() || c === '\n' || c === ';' || c === ')' || c === '}' || (c === '|' && this.peek(1) !== '|')) break;
      if (c === '|' || (c === '&' && this.peek(1) === '&')) break;
      if (c === '&') this.fail('Das kaufmännische Und-Zeichen (&) ist nicht zulässig. Der &-Operator ist für die zukünftige Verwendung reserviert. Umschließen Sie das kaufmännische Und-Zeichen mit doppelten Anführungszeichen ("&"), um es als Teil einer Zeichenfolge zu übergeben.', 'AmpersandNotAllowed');
      if (/^([*1-6])?>>?/.test(this.s.slice(this.i)) && (c === '>' || this.peek(1) === '>' )) { redirs = redirs.concat(this.parseRedirs()); continue; }
      if (c === '<') this.fail('Der Operator "<" ist für die zukünftige Verwendung reserviert.', 'RedirectionNotSupported');
      if (c === '-' && (isIdStart(this.peek(1)) || this.peek(1) === '?')) {
        const pst = this.i;
        this.i++;
        const m = /^[\w?]+/.exec(this.s.slice(this.i));
        this.i += m[0].length;
        if (this.peek() === ':' && this.peek(1) !== ':' ) {
          this.i++;
          const value = this.parseArgValue();
          args.push({ t: 'param', name: m[0], value, colon: true, s: pst, e: this.i, src: this.src });
        } else if (this.peek() === undefined || /[\s;|)}]/.test(this.peek())) {
          args.push({ t: 'param', name: m[0], value: null, s: pst, e: this.i, src: this.src });
        } else {
          // z.B. -foo.txt -> als Wert behandeln
          this.i = pst;
          args.push({ t: 'arg', value: this.parseArgValue(), s: pst, e: this.i, src: this.src });
        }
        continue;
      }
      if (c === '-' && this.peek(1) === '-' && /[\s]/.test(this.peek(2) || ' ')) { this.i += 2; args.push({ t: 'endparams' }); continue; }
      const ast = this.i;
      args.push({ t: 'arg', value: this.parseArgValue(), s: ast, e: this.i, src: this.src });
    }
    return { t: 'cmd', name, invoke, args, redirs, s: st, e: this.i, nameEnd, src: this.src };
  }
  parseCmdNameExpr() {
    const c = this.peek();
    if (SQ.includes(c) || DQ.includes(c)) return this.parseStringLiteral();
    if (c === '$') return this.parsePostfix(this.parsePrimary());
    if (c === '(') return this.parsePostfix(this.parsePrimary());
    if (c === '{') return this.parseScriptBlockLiteral();
    const m = /^[^\s|;(){}&,]+/.exec(this.s.slice(this.i));
    if (!m) this.fail('Nach dem Operator "&" fehlt der Ausdruck.', 'MissingExpression');
    this.i += m[0].length;
    return { t: 'str', v: m[0] };
  }

  parseArgValue() {
    const first = this.parseArgPrimary();
    const items = [first];
    for (;;) {
      const save = this.i;
      this.skipWs();
      if (this.peek() === ',') { this.i++; this.skipWsNl(); items.push(this.parseArgPrimary()); continue; }
      this.i = save; break;
    }
    return items.length > 1 ? { t: 'array', items } : first;
  }
  parseArgPrimary() {
    const c = this.peek(), n = this.peek(1);
    if (c === '$') {
      const st = this.i;
      const e = this.parsePostfix(this.parsePrimary(), true);
      const nx = this.peek();
      if (nx !== undefined && !/[\s|;,(){}>]/.test(nx)) {
        // zusammengesetztes Argument wie $env:USERPROFILE\Desktop
        let j = st, depth = 0;
        while (j < this.s.length) {
          const ch = this.s[j];
          if (ch === '(') depth++;
          else if (ch === ')') { if (depth === 0) break; depth--; }
          else if (depth === 0 && /[\s|;,{}>]/.test(ch)) break;
          j++;
        }
        const raw = this.s.slice(st, j); this.i = j;
        return new Parser(raw, this.src.file).parseExpandable(raw);
      }
      return e;
    }
    if (SQ.includes(c) || DQ.includes(c)) return this.parseStringLiteral();
    if (c === '(' ) return this.parsePostfix(this.parsePrimary(), true);
    if (c === '@' && (n === '(' || n === '{' || n === '"' || n === "'")) return this.parsePostfix(this.parsePrimary(), true);
    if (c === '{') return this.parseScriptBlockLiteral();
    // Bareword
    let j = this.i; let txt = '';
    while (j < this.s.length) {
      const ch = this.s[j];
      if (/[\s|;,(){}]/.test(ch)) break;
      if (ch === '`' && j + 1 < this.s.length) { if (this.s[j + 1] === '\n') break; txt += this.s[j + 1]; j += 2; continue; }
      if ((SQ.includes(ch) || DQ.includes(ch)) && j > this.i) { // eingebettete Anführungszeichen: C:\"a b"
        const save = this.i; this.i = j; const lit = this.parseStringLiteral();
        txt += lit.t === 'str' ? lit.v : ''; j = this.i; this.i = save; continue;
      }
      if (ch === '>' ) break;
      txt += ch; j++;
    }
    const raw = this.s.slice(this.i, j);
    if (raw === '') this.unexpected();
    this.i = j;
    if (V_numFull(raw)) return { t: 'num', v: parseNumLit(raw), raw };
    if (raw.includes('$')) { const p = new Parser(raw, this.src.file); return p.parseExpandable(raw); }
    return { t: 'str', v: txt, bare: true };
  }

  /* ===== Ausdrücke ===== */
  parseExpression(noComma) {
    const save = this.noComma; this.noComma = !!noComma;
    try { return this.parseLogical(); } finally { this.noComma = save; }
  }
  opWord() { // liefert Operatorwort nach '-'
    if (this.peek() !== '-') return null;
    const m = /^-([A-Za-z]+)\b/.exec(this.s.slice(this.i));
    return m ? m[1].toLowerCase() : null;
  }
  needOperand(op) {
    this.skipWsNl();
    if (this.eof() || /[)};|]/.test(this.peek())) this.fail(`Sie müssen einen Wertausdruck nach dem Operator "${op}" angeben.`, 'ExpectedValueExpression', undefined, this.eof());
  }
  parseLogical() {
    let l = this.parseCmp();
    for (;;) {
      const save = this.i; this.skipWs();
      const w = this.opWord();
      if (w === 'and' || w === 'or' || w === 'xor') { this.i += w.length + 1; this.needOperand('-' + w); const r = this.parseCmp(); l = { t: 'bin', op: w, l, r }; continue; }
      this.i = save; break;
    }
    return l;
  }
  parseCmp() {
    let l = this.parseAdd();
    for (;;) {
      const save = this.i; this.skipWs();
      const w = this.opWord();
      if (w && CMP_ALL.has(w)) { this.i += w.length + 1; this.needOperand('-' + w); const r = this.parseAdd(); l = { t: 'bin', op: w, l, r }; continue; }
      if (w && !['and', 'or', 'xor', 'f', 'not'].includes(w) && /^(c|i)?[a-z]+$/.test(w) && /^-[A-Za-z]+\s/.test(this.s.slice(this.i)) && this.peek(-1) !== undefined) {
        // unbekannter Operator
        this.fail(`Unerwartetes Token "-${w}" in Ausdruck oder Anweisung.`, 'UnexpectedToken');
      }
      if (this.peek() === '=' && this.peek(1) === '=') this.fail('Der Operator "==" wird nicht unterstützt. Verwenden Sie zum Vergleichen den Operator "-eq".', 'UnexpectedToken');
      if (this.peek() === '<' && this.peek(1) !== '#') this.fail('Der Operator "<" ist für die zukünftige Verwendung reserviert.', 'RedirectionNotSupported');
      if (this.peek() === '!' && this.peek(1) === '=') this.fail('Unerwartetes Token "!=" in Ausdruck oder Anweisung. Verwenden Sie zum Vergleichen den Operator "-ne".', 'UnexpectedToken');
      this.i = save; break;
    }
    return l;
  }
  parseAdd() {
    let l = this.parseMul();
    for (;;) {
      const save = this.i; this.skipWs();
      const c = this.peek(), n = this.peek(1);
      if ((c === '+' || c === '-') && n !== '=' && n !== c && !(c === '-' && isIdStart(n))) {
        this.i++; this.needOperand(c); const r = this.parseMul(); l = { t: 'bin', op: c, l, r }; continue;
      }
      this.i = save; break;
    }
    return l;
  }
  parseMul() {
    let l = this.parseFormat();
    for (;;) {
      const save = this.i; this.skipWs();
      const c = this.peek();
      if ((c === '*' || c === '/' || c === '%') && this.peek(1) !== '=') { this.i++; this.needOperand(c); const r = this.parseFormat(); l = { t: 'bin', op: c, l, r }; continue; }
      this.i = save; break;
    }
    return l;
  }
  parseFormat() {
    let l = this.parseRange();
    for (;;) {
      const save = this.i; this.skipWs();
      if (this.opWord() === 'f') { this.i += 2; this.needOperand('-f'); const r = this.parseRange(); l = { t: 'bin', op: 'f', l, r }; continue; }
      this.i = save; break;
    }
    return l;
  }
  parseRange() {
    const l = this.parseComma();
    const save = this.i; this.skipWs();
    if (this.peek() === '.' && this.peek(1) === '.') { this.i += 2; this.needOperand('..'); const r = this.parseComma(); return { t: 'range', l, r }; }
    this.i = save;
    return l;
  }
  parseComma() {
    const first = this.parseUnary();
    if (this.noComma) return first;
    const items = [first];
    for (;;) {
      const save = this.i; this.skipWs();
      if (this.peek() === ',') { this.i++; this.needOperand(','); items.push(this.parseUnary()); continue; }
      this.i = save; break;
    }
    return items.length > 1 ? { t: 'array', items } : first;
  }
  parseUnary() {
    this.skipWs();
    const c = this.peek(), n = this.peek(1);
    if (c === '!') { this.i++; this.needOperand('!'); return { t: 'not', e: this.parseUnary() }; }
    if (c === '-') {
      const w = this.opWord();
      if (w === 'not') { this.i += 4; this.needOperand('-not'); return { t: 'not', e: this.parseUnary() }; }
      if (w === 'split' || w === 'join') { this.i += w.length + 1; this.needOperand('-' + w); return { t: 'unary', op: w, e: this.parseUnary() }; }
      if (w === 'bnot') { this.i += 5; return { t: 'unary', op: 'bnot', e: this.parseUnary() }; }
      if (n === '-' && this.peek(2) === '$') { this.i += 2; const e = this.parsePostfix(this.parsePrimary()); return { t: 'incr', op: '--', pre: true, e }; }
      if (/[0-9]/.test(n) || (n === '.' && /[0-9]/.test(this.peek(2)))) { this.i++; const num = this.parsePostfix(this.parsePrimary()); return { t: 'neg', e: num }; }
      if (n === '$' || n === '(' || n === '[' || n === '@') { this.i++; return { t: 'neg', e: this.parseUnary() }; }
    }
    if (c === '+' && n === '+') { this.i += 2; const e = this.parsePostfix(this.parsePrimary()); return { t: 'incr', op: '++', pre: true, e }; }
    if (c === '+' && (/[0-9$(]/.test(n))) { this.i++; return { t: 'pos', e: this.parseUnary() }; }
    if (c === ',') { this.i++; this.needOperand(','); return { t: 'array', items: [this.parseUnary()] }; }
    if (c === '[') {
      const st = this.i;
      const txt = this.readBracket();
      const type = txt.slice(1, -1).trim();
      if (this.peek() === ':' && this.peek(1) === ':') return this.parsePostfix({ t: 'type', name: type, s: st });
      if (this.peek() === '.' && isIdStart(this.peek(1))) return this.parsePostfix({ t: 'type', name: type, s: st });
      const save = this.i; this.skipWs();
      const k = this.peek();
      if (k !== undefined && (k === '$' || k === '(' || k === '@' || k === '[' || k === '-' || k === '!' || /[0-9]/.test(k) || SQ.includes(k) || DQ.includes(k) || k === '{')) {
        return { t: 'cast', type, e: this.parseUnary(), s: st };
      }
      this.i = save;
      return this.parsePostfix({ t: 'type', name: type, s: st });
    }
    return this.parsePostfix(this.parsePrimary());
  }
  parsePostfix(e, argMode) {
    for (;;) {
      const c = this.peek(), n = this.peek(1);
      if (c === '.' && n !== '.' && (isIdStart(n) || n === '$' || SQ.includes(n) || DQ.includes(n) || n === '(')) {
        if (argMode && e.t === 'str') break;
        this.i++;
        e = this.parseMemberTail(e, false);
        continue;
      }
      if (c === ':' && n === ':') { this.i += 2; e = this.parseMemberTail(e, true); continue; }
      if (c === '[' && !argMode || (c === '[' && argMode && e.t !== 'str')) {
        this.i++; this.skipWsNl();
        const idx = this.parseExpression(); this.skipWsNl();
        if (this.peek() !== ']') this.fail('Der Arrayindexausdruck fehlt oder ist ungültig.', 'MissingArrayIndexExpression', undefined, true);
        this.i++;
        e = { t: 'index', obj: e, idx };
        continue;
      }
      if ((c === '+' && n === '+' || c === '-' && n === '-') && !argMode && (e.t === 'var' || e.t === 'member' || e.t === 'index')) {
        this.i += 2; e = { t: 'incr', op: c + c, pre: false, e }; continue;
      }
      break;
    }
    return e;
  }
  parseMemberTail(obj, isStatic) {
    let name;
    const c = this.peek();
    if (isIdStart(c)) { const m = /^[\w]+/.exec(this.s.slice(this.i)); name = { t: 'str', v: m[0] }; this.i += m[0].length; }
    else if (c === '$') name = this.parsePrimary();
    else if (SQ.includes(c) || DQ.includes(c)) name = this.parseStringLiteral();
    else if (c === '(') name = this.parsePrimary();
    else this.fail('Nach "." fehlt der Eigenschaftsname.', 'MissingPropertyName');
    if (this.peek() === '(') {
      this.i++; const args = [];
      this.skipWsNl();
      if (this.peek() !== ')') {
        for (;;) {
          this.skipWsNl();
          args.push(this.parseExpression(true));
          this.skipWsNl();
          if (this.peek() === ',') { this.i++; continue; }
          if (this.peek() === ')') break;
          this.fail('Die schließende ")" fehlt in einem Ausdruck.', 'MissingEndParenthesisInMethodCall', undefined, true);
        }
      }
      this.i++;
      return { t: 'call', obj, name, args, isStatic };
    }
    return { t: 'member', obj, name, isStatic };
  }

  parsePrimary() {
    const c = this.peek(), n = this.peek(1);
    const st = this.i;
    if (c === '$') {
      if (n === '(') {
        this.i += 2;
        const body = this.parseStatementList(')');
        if (this.peek() !== ')') this.fail('Die schließende ")" fehlt in einem Ausdruck.', 'MissingEndParenthesisInSubexpression', undefined, true);
        this.i++;
        return { t: 'sub', body };
      }
      if (n === '{') {
        const j = this.s.indexOf('}', this.i);
        if (j < 0) this.fail('Die schließende "}" fehlt.', 'MissingEndCurlyBrace', undefined, true);
        const nm = this.s.slice(this.i + 2, j); this.i = j + 1;
        return this.mkVar(nm);
      }
      if (n === '$' || n === '?' || n === '^') { this.i += 2; return { t: 'var', name: n, scope: null }; }
      const m = /^([A-Za-z_][\w]*:)?([\w]+)/.exec(this.s.slice(this.i + 1));
      if (!m) { this.i++; this.fail('"$" ist kein gültiger Variablenverweis. Verwenden Sie "`$", um "$" zu maskieren.', 'InvalidVariableReference'); }
      this.i += 1 + m[0].length;
      return this.mkVar(m[0]);
    }
    if (c === '@' && n === '(') {
      this.i += 2;
      const body = this.parseStatementList(')');
      if (this.peek() !== ')') this.fail('Die schließende ")" fehlt in einem Ausdruck.', 'MissingEndParenthesisInSubexpression', undefined, true);
      this.i++;
      return { t: 'arrayexpr', body };
    }
    if (c === '@' && n === '{') return this.parseHash();
    if (c === '@' && (n === '"' || n === "'")) return this.parseHereString();
    if (c === '(') {
      this.i++; this.skipWsNl();
      if (this.peek() === ')') { this.i++; return { t: 'const', v: null }; }
      const p = this.parseStatement();
      this.skipWsNl();
      if (this.peek() !== ')') this.fail('Die schließende ")" fehlt in einem Ausdruck.', 'MissingEndParenthesisInExpression', undefined, true);
      this.i++;
      return { t: 'paren', p };
    }
    if (c === '{') return this.parseScriptBlockLiteral();
    if (SQ.includes(c) || DQ.includes(c)) return this.parseStringLiteral();
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(n))) {
      const m = /^(0x[0-9a-f]+|(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)(kb|mb|gb|tb|pb)?[ld]?/i.exec(this.s.slice(this.i));
      this.i += m[0].length;
      return { t: 'num', v: parseNumLit(m[1] + (m[2] || '')) };
    }
    if (this.eof()) this.fail('Ausdruck fehlt.', 'ExpectedExpression', undefined, true);
    if (isIdStart(c)) {
      const w = /^[\w-]+/.exec(this.s.slice(this.i))[0];
      this.fail(`Unerwartetes Token "${w}" in Ausdruck oder Anweisung.`, 'UnexpectedToken');
    }
    this.unexpected();
  }
  mkVar(full) {
    const k = full.indexOf(':');
    if (k > 0) return { t: 'var', scope: full.slice(0, k).toLowerCase(), name: full.slice(k + 1) };
    return { t: 'var', scope: null, name: full };
  }
  parseScriptBlockLiteral() {
    const st = this.i; this.i++;
    const body = this.parseScriptBody('}');
    if (this.peek() !== '}') this.fail('Die schließende "}" fehlt im Anweisungsblock oder in der Typdefinition.', 'MissingEndCurlyBrace', undefined, true);
    this.i++;
    return { t: 'sb', def: Object.assign(body, { t: 'script', src: this.src }), text: this.s.slice(st + 1, this.i - 1) };
  }
  parseHash() {
    this.i += 2;
    const entries = [];
    for (;;) {
      this.skipSep();
      if (this.peek() === '}') { this.i++; break; }
      if (this.eof()) this.fail('Die schließende "}" fehlt im Hashliteral.', 'MissingEndCurlyBrace', undefined, true);
      let key;
      const c = this.peek();
      if (isIdStart(c)) { const m = /^[\w-]+/.exec(this.s.slice(this.i)); key = { t: 'str', v: m[0] }; this.i += m[0].length; }
      else if (SQ.includes(c) || DQ.includes(c)) key = this.parseStringLiteral();
      else if (/[0-9]/.test(c)) key = this.parsePrimary();
      else key = this.parseUnary();
      this.skipWs();
      if (this.peek() !== '=') this.fail('Nach dem Schlüssel im Hashliteral fehlt "=".', 'MissingEqualsInHashLiteral', undefined, true);
      this.i++; this.skipWsNl();
      if (this.eof() || this.peek() === '}') this.fail('Im Hashliteral fehlt eine Anweisung nach "=".', 'MissingStatementInHashLiteral', undefined, this.eof());
      const value = this.parseStatement();
      entries.push({ key, value });
      this.skipWs();
      const n = this.peek();
      if (n === ';' || n === '\n') continue;
      if (n === '}') continue;
      if (this.eof()) this.fail('Die schließende "}" fehlt im Hashliteral.', 'MissingEndCurlyBrace', undefined, true);
      this.fail('Im Hashliteral fehlt ein Zeilenumbruch oder ";" zwischen den Einträgen.', 'MissingEndCurlyBrace');
    }
    return { t: 'hash', entries };
  }
  parseHereString() {
    const q = this.peek(1); const st = this.i;
    this.i += 2;
    while (this.peek() === ' ' || this.peek() === '\t') this.i++;
    if (this.peek() !== '\n') this.fail('Nach dem Header einer Here-Zeichenfolge darf kein Zeichen in derselben Zeile folgen.', 'UnexpectedCharactersAfterHereStringHeader');
    this.i++;
    const endTok = '\n' + q + '@';
    let j = this.s.indexOf(endTok, this.i - 1);
    if (this.s.slice(this.i).startsWith(q + '@')) j = this.i - 1;
    if (j < 0) { this.i = this.s.length; this.fail('Das Abschlusszeichen der Here-Zeichenfolge fehlt.', 'TerminatorExpectedAtEndOfString', st, true); }
    const content = this.s.slice(this.i, Math.max(this.i, j));
    this.i = j + endTok.length;
    if (q === "'") return { t: 'str', v: content };
    const p = new Parser(content, this.src.file);
    return p.parseExpandable(content, true);
  }
  parseStringLiteral() {
    const c = this.peek(); const st = this.i;
    if (SQ.includes(c)) {
      this.i++; let v = '';
      for (;;) {
        if (this.eof()) this.fail(`Am Zeichenfolgenende fehlt das Abschlusszeichen: '.`, 'TerminatorExpectedAtEndOfString', st, true);
        const ch = this.peek();
        if (SQ.includes(ch)) { if (SQ.includes(this.peek(1))) { v += "'"; this.i += 2; continue; } this.i++; break; }
        v += ch; this.i++;
      }
      return { t: 'str', v };
    }
    // doppelte Anführungszeichen
    this.i++;
    const parts = []; let lit = '';
    const flush = () => { if (lit) { parts.push({ t: 'str', v: lit }); lit = ''; } };
    for (;;) {
      if (this.eof()) this.fail('Am Zeichenfolgenende fehlt das Abschlusszeichen: ".', 'TerminatorExpectedAtEndOfString', st, true);
      const ch = this.peek();
      if (DQ.includes(ch)) { if (DQ.includes(this.peek(1))) { lit += '"'; this.i += 2; continue; } this.i++; break; }
      if (ch === '`') { lit += escCh(this.peek(1)); this.i += 2; continue; }
      if (ch === '$') {
        const n = this.peek(1);
        if (n === '(') {
          flush(); this.i += 2;
          const body = this.parseStatementList(')');
          if (this.peek() !== ')') this.fail('Die schließende ")" fehlt in einem Ausdruck.', 'MissingEndParenthesisInSubexpression', undefined, true);
          this.i++;
          parts.push({ t: 'sub', body }); continue;
        }
        if (n === '{') { const j = this.s.indexOf('}', this.i); if (j > 0) { flush(); parts.push(this.mkVar(this.s.slice(this.i + 2, j))); this.i = j + 1; continue; } }
        const m = /^([A-Za-z_][\w]*:)?([\w]+)|^\$|^\?/.exec(this.s.slice(this.i + 1));
        if (m && m[0]) {
          if (m[1] && !/^(env|script|global|local|using|private|variable):$/i.test(m[1])) {
            // "$a:" -> Variable a gefolgt von ':'? PowerShell wertet als Laufwerksvariable; hier: Name bis ':'
          }
          flush(); this.i += 1 + m[0].length; parts.push(this.mkVar(m[0] === '$' ? '$' : m[0])); continue;
        }
      }
      lit += ch; this.i++;
    }
    flush();
    if (parts.length === 0) return { t: 'str', v: '' };
    if (parts.length === 1 && parts[0].t === 'str') return parts[0];
    return { t: 'xstr', parts };
  }
  parseExpandable(text, here) {
    // Text ohne Anführungszeichen expandieren (Bareword mit $ oder Here-String)
    const parts = []; let lit = '';
    const flush = () => { if (lit) { parts.push({ t: 'str', v: lit }); lit = ''; } };
    this.i = 0;
    while (!this.eof()) {
      const ch = this.peek();
      if (ch === '`' && !here) { lit += escCh(this.peek(1)); this.i += 2; continue; }
      if (ch === '`' && here) { lit += escCh(this.peek(1)); this.i += 2; continue; }
      if (ch === '$') {
        const n = this.peek(1);
        if (n === '(') { flush(); this.i += 2; const body = this.parseStatementList(')'); this.i++; parts.push({ t: 'sub', body }); continue; }
        const m = /^([A-Za-z_][\w]*:)?([\w]+)/.exec(this.s.slice(this.i + 1));
        if (m) { flush(); this.i += 1 + m[0].length; parts.push(this.mkVar(m[0])); continue; }
      }
      lit += ch; this.i++;
    }
    flush();
    if (parts.length === 0) return { t: 'str', v: '' };
    if (parts.length === 1 && parts[0].t === 'str') return parts[0];
    return { t: 'xstr', parts };
  }
}

function escCh(c) {
  switch (c) {
    case 'n': return '\n'; case 't': return '\t'; case 'r': return '\r'; case '0': return '\0'; case 'a': return '\x07';
    case 'b': return '\b'; case 'e': return '\x1b'; case 'f': return '\f'; case 'v': return '\v';
    case undefined: return '`';
    default: return c;
  }
}
function V_numFull(s) { return /^[+-]?(0x[0-9a-f]+|(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)(kb|mb|gb|tb|pb)?$/i.test(s); }
function parseNumLit(s) { return GG.v.parseNum(s); }

GG.Parser = Parser;
GG.parse = function (text, file) { return new Parser(text, file).parseScript(); };
GG.isIncomplete = function (text) {
  try { GG.parse(text); return false; }
  catch (e) {
    if (e instanceof ParseError && e.incomplete) return true;
    return false;
  }
};
})();
