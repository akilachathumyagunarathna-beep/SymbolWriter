// ============================================================
// Advanced Spreadsheet Formula Engine
// Real recursive-descent parser supporting nested functions,
// operators, ranges, custom functions, etc.
// ============================================================

import { create, all } from 'mathjs';

const math = create(all, {});

export type CellValue = string | number | boolean | null | undefined;

export interface CellData {
  raw?: string;            // user entered text e.g. "=SUM(A1:A5)" or "10" or "Hello"
  formula?: string;        // formula incl. leading '='
  value?: CellValue;       // computed/displayed value
  type?: string;           // data type
}

export interface SheetCtx {
  rows: number;
  cols: number;
  cells: Record<string, CellData>;        // key "r-c" → CellData
  customFns?: Record<string, (...args: any[]) => any>;
  customVars?: Record<string, any>;
  // Cycle detection
  _stack?: Set<string>;
}

export const FUNCTION_LIST = [
  // Math
  'SUM','AVERAGE','AVG','MAX','MIN','COUNT','COUNTA','COUNTIF','COUNTIFS',
  'SUMIF','SUMIFS','AVERAGEIF','AVERAGEIFS',
  'PRODUCT','SQRT','ABS','ROUND','ROUNDUP','ROUNDDOWN','TRUNC',
  'FLOOR','CEILING','MOD','POWER','LOG','LOG10','LN','EXP',
  'INT','SIGN','RAND','RANDBETWEEN','PI','E','GCD','LCM','FACT',
  // Stats
  'MEDIAN','MODE','STDEV','STDEVP','VAR','VARP','LARGE','SMALL','RANK','PERCENTILE','QUARTILE',
  // Trig
  'SIN','COS','TAN','ASIN','ACOS','ATAN','ATAN2','SINH','COSH','TANH','RADIANS','DEGREES',
  // String
  'LEN','UPPER','LOWER','PROPER','TRIM','LEFT','RIGHT','MID',
  'CONCAT','CONCATENATE','TEXTJOIN','SUBSTITUTE','REPLACE',
  'FIND','SEARCH','VALUE','TEXT','REPT','REVERSE','CHAR','CODE',
  // Logical
  'IF','IFS','AND','OR','NOT','XOR','IFERROR','IFNA',
  'ISBLANK','ISNUMBER','ISTEXT','ISERROR','TRUE','FALSE','SWITCH',
  // Lookup
  'VLOOKUP','HLOOKUP','INDEX','MATCH','XLOOKUP','CHOOSE','OFFSET',
  // Date
  'TODAY','NOW','YEAR','MONTH','DAY','HOUR','MINUTE','SECOND',
  'DATE','WEEKDAY','DATEDIF','EOMONTH',
  // Financial (basic)
  'PMT','FV','PV',
];

export const FUNC_DOCS: Record<string, string> = {
  SUM:        'SUM(range, …) — Adds all numbers',
  AVERAGE:    'AVERAGE(range) — Arithmetic mean',
  AVG:        'AVG(range) — Arithmetic mean (alias)',
  MAX:        'MAX(range) — Largest value',
  MIN:        'MIN(range) — Smallest value',
  COUNT:      'COUNT(range) — Count numeric cells',
  COUNTA:     'COUNTA(range) — Count non-empty cells',
  COUNTIF:    'COUNTIF(range, criteria)',
  COUNTIFS:   'COUNTIFS(range1, crit1, range2, crit2, …)',
  SUMIF:      'SUMIF(range, criteria, [sum_range])',
  SUMIFS:     'SUMIFS(sum_range, range1, crit1, …)',
  AVERAGEIF:  'AVERAGEIF(range, criteria, [avg_range])',
  PRODUCT:    'PRODUCT(range) — Multiply all numbers',
  SQRT:       'SQRT(n) — Square root',
  ABS:        'ABS(n)',
  ROUND:      'ROUND(n, digits)',
  ROUNDUP:    'ROUNDUP(n, digits)',
  ROUNDDOWN:  'ROUNDDOWN(n, digits)',
  TRUNC:      'TRUNC(n, [digits])',
  FLOOR:      'FLOOR(n, significance)',
  CEILING:    'CEILING(n, significance)',
  MOD:        'MOD(n, divisor)',
  POWER:      'POWER(base, exponent)',
  LOG:        'LOG(n, [base]) — base 10 default',
  LN:         'LN(n) — natural log',
  EXP:        'EXP(n)',
  INT:        'INT(n) — round down to integer',
  SIGN:       'SIGN(n) — -1, 0 or 1',
  RAND:       'RAND() — random 0–1',
  RANDBETWEEN:'RANDBETWEEN(low, high)',
  PI:         'PI() — 3.14159…',
  GCD:        'GCD(a, b, …)',
  LCM:        'LCM(a, b, …)',
  FACT:       'FACT(n) — n!',
  MEDIAN:     'MEDIAN(range)',
  MODE:       'MODE(range)',
  STDEV:      'STDEV(range) — sample stdev',
  STDEVP:     'STDEVP(range) — population stdev',
  VAR:        'VAR(range)',
  VARP:       'VARP(range)',
  LARGE:      'LARGE(range, k)',
  SMALL:      'SMALL(range, k)',
  RANK:       'RANK(value, range, [order])',
  PERCENTILE: 'PERCENTILE(range, k)',
  QUARTILE:   'QUARTILE(range, q)',
  SIN:'SIN(rad)',COS:'COS(rad)',TAN:'TAN(rad)',
  ASIN:'ASIN(n)',ACOS:'ACOS(n)',ATAN:'ATAN(n)',ATAN2:'ATAN2(y, x)',
  SINH:'SINH(n)',COSH:'COSH(n)',TANH:'TANH(n)',
  RADIANS:'RADIANS(deg)',DEGREES:'DEGREES(rad)',
  LEN:'LEN(text)',UPPER:'UPPER(text)',LOWER:'LOWER(text)',
  PROPER:'PROPER(text) — capitalize each word',
  TRIM:'TRIM(text)',
  LEFT:'LEFT(text, n)',RIGHT:'RIGHT(text, n)',MID:'MID(text, start, len)',
  CONCAT:'CONCAT(t1, t2, …)',CONCATENATE:'CONCATENATE(t1, t2, …)',
  TEXTJOIN:'TEXTJOIN(delimiter, ignore_empty, t1, t2, …)',
  SUBSTITUTE:'SUBSTITUTE(text, find, replace, [occurrence])',
  REPLACE:'REPLACE(text, start, len, new_text)',
  FIND:'FIND(find, text)',SEARCH:'SEARCH(find, text)',
  VALUE:'VALUE(text)',TEXT:'TEXT(value, format)',
  REPT:'REPT(text, n)',REVERSE:'REVERSE(text)',
  CHAR:'CHAR(code)',CODE:'CODE(text)',
  IF:'IF(condition, value_if_true, value_if_false)',
  IFS:'IFS(c1, v1, c2, v2, …)',
  AND:'AND(c1, c2, …)',OR:'OR(c1, c2, …)',NOT:'NOT(c)',XOR:'XOR(c1, c2, …)',
  IFERROR:'IFERROR(value, value_if_error)',
  IFNA:'IFNA(value, value_if_na)',
  ISBLANK:'ISBLANK(cell)',ISNUMBER:'ISNUMBER(v)',ISTEXT:'ISTEXT(v)',ISERROR:'ISERROR(v)',
  SWITCH:'SWITCH(expr, val1, res1, val2, res2, …, [default])',
  VLOOKUP:'VLOOKUP(value, range, col_index, [exact])',
  HLOOKUP:'HLOOKUP(value, range, row_index, [exact])',
  INDEX:'INDEX(range, row, [col])',
  MATCH:'MATCH(value, range, [type])',
  XLOOKUP:'XLOOKUP(value, lookup_range, return_range, [if_not_found])',
  CHOOSE:'CHOOSE(index, val1, val2, …)',
  OFFSET:'OFFSET(ref, rows, cols, [height], [width])',
  TODAY:'TODAY()',NOW:'NOW()',
  YEAR:'YEAR(date)',MONTH:'MONTH(date)',DAY:'DAY(date)',
  HOUR:'HOUR(time)',MINUTE:'MINUTE(time)',SECOND:'SECOND(time)',
  DATE:'DATE(year, month, day)',
  WEEKDAY:'WEEKDAY(date)',
  DATEDIF:'DATEDIF(start, end, "Y"|"M"|"D")',
  EOMONTH:'EOMONTH(start, months)',
  PMT:'PMT(rate, nper, pv) — loan payment',
  FV:'FV(rate, nper, pmt, [pv])',
  PV:'PV(rate, nper, pmt, [fv])',
};

// ────────── Tokenizer ──────────
type Token =
  | { type: 'num'; value: number }
  | { type: 'str'; value: string }
  | { type: 'bool'; value: boolean }
  | { type: 'ident'; value: string }    // function name or unquoted identifier
  | { type: 'cell'; col: number; row: number; ref: string }
  | { type: 'range'; c1: number; r1: number; c2: number; r2: number; ref: string }
  | { type: 'op'; value: string }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'comma' };

function colLettersToIndex(s: string): number {
  let n = 0;
  for (const ch of s.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export function colIndexToLetters(c: number): string {
  let r = '';
  c++;
  while (c > 0) {
    r = String.fromCharCode(64 + ((c - 1) % 26) + 1) + r;
    c = Math.floor((c - 1) / 26);
  }
  return r;
}

export function cellRef(r: number, c: number): string {
  return colIndexToLetters(c) + (r + 1);
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = input.length;
  while (i < n) {
    const ch = input[i];
    // whitespace
    if (/\s/.test(ch)) { i++; continue; }
    // string
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      let s = '';
      while (j < n && input[j] !== quote) {
        if (input[j] === '\\' && j + 1 < n) { s += input[j + 1]; j += 2; }
        else { s += input[j]; j++; }
      }
      tokens.push({ type: 'str', value: s });
      i = j + 1;
      continue;
    }
    // number
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < n && /[0-9.eE+\-]/.test(input[j])) {
        // be careful with +/- only if part of exponent
        if ((input[j] === '+' || input[j] === '-') && !(input[j-1] === 'e' || input[j-1] === 'E')) break;
        j++;
      }
      const numStr = input.slice(i, j);
      const num = parseFloat(numStr);
      if (!isNaN(num)) {
        tokens.push({ type: 'num', value: num });
        i = j;
        continue;
      }
    }
    // identifier / cell ref / range / boolean
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_$.]/.test(input[j])) j++;
      const word = input.slice(i, j);
      const upper = word.toUpperCase();
      // Boolean
      if (upper === 'TRUE') { tokens.push({ type: 'bool', value: true }); i = j; continue; }
      if (upper === 'FALSE') { tokens.push({ type: 'bool', value: false }); i = j; continue; }
      // Cell ref pattern (letters followed by digits, e.g. A1, AB12)
      const cellMatch = word.match(/^([A-Z]+)([0-9]+)$/i);
      if (cellMatch) {
        const c1 = colLettersToIndex(cellMatch[1]);
        const r1 = parseInt(cellMatch[2], 10) - 1;
        // check for range
        if (input[j] === ':') {
          let k = j + 1;
          while (k < n && /[A-Za-z0-9]/.test(input[k])) k++;
          const word2 = input.slice(j + 1, k);
          const cellMatch2 = word2.match(/^([A-Z]+)([0-9]+)$/i);
          if (cellMatch2) {
            const c2 = colLettersToIndex(cellMatch2[1]);
            const r2 = parseInt(cellMatch2[2], 10) - 1;
            tokens.push({
              type: 'range',
              c1: Math.min(c1, c2), r1: Math.min(r1, r2),
              c2: Math.max(c1, c2), r2: Math.max(r1, r2),
              ref: word + ':' + word2,
            });
            i = k;
            continue;
          }
        }
        tokens.push({ type: 'cell', col: c1, row: r1, ref: word.toUpperCase() });
        i = j;
        continue;
      }
      // identifier (function name or named const)
      tokens.push({ type: 'ident', value: word });
      i = j;
      continue;
    }
    // multi-char operators
    if (ch === '<' && input[i + 1] === '=') { tokens.push({ type: 'op', value: '<=' }); i += 2; continue; }
    if (ch === '>' && input[i + 1] === '=') { tokens.push({ type: 'op', value: '>=' }); i += 2; continue; }
    if (ch === '<' && input[i + 1] === '>') { tokens.push({ type: 'op', value: '<>' }); i += 2; continue; }
    if (ch === '*' && input[i + 1] === '*') { tokens.push({ type: 'op', value: '^' }); i += 2; continue; }
    // single-char operators
    if ('+-*/%^&=<>'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }
    if (ch === '(') { tokens.push({ type: 'lparen' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'rparen' }); i++; continue; }
    if (ch === ',' || ch === ';') { tokens.push({ type: 'comma' }); i++; continue; }
    // unknown – skip
    i++;
  }
  return tokens;
}

// ────────── AST ──────────
type Node =
  | { kind: 'num'; value: number }
  | { kind: 'str'; value: string }
  | { kind: 'bool'; value: boolean }
  | { kind: 'cell'; col: number; row: number }
  | { kind: 'range'; c1: number; r1: number; c2: number; r2: number }
  | { kind: 'name'; value: string } // unresolved identifier (constant or var)
  | { kind: 'unary'; op: string; arg: Node }
  | { kind: 'binary'; op: string; left: Node; right: Node }
  | { kind: 'call'; name: string; args: Node[] };

class Parser {
  pos = 0;
  constructor(private toks: Token[]) {}
  peek(): Token | undefined { return this.toks[this.pos]; }
  consume(): Token { return this.toks[this.pos++]; }
  expect(type: Token['type']): Token {
    const t = this.consume();
    if (!t || t.type !== type) throw new Error(`Expected ${type}`);
    return t;
  }

  // Precedence climbing: comparison < concat < addsub < muldiv < pow < unary < primary
  parseExpr(): Node { return this.parseComparison(); }

  parseComparison(): Node {
    let left = this.parseConcat();
    while (this.peek()?.type === 'op' && ['=','<>','<','>','<=','>='].includes((this.peek() as any).value)) {
      const op = (this.consume() as any).value;
      const right = this.parseConcat();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }
  parseConcat(): Node {
    let left = this.parseAdd();
    while (this.peek()?.type === 'op' && (this.peek() as any).value === '&') {
      this.consume();
      const right = this.parseAdd();
      left = { kind: 'binary', op: '&', left, right };
    }
    return left;
  }
  parseAdd(): Node {
    let left = this.parseMul();
    while (this.peek()?.type === 'op' && ['+','-'].includes((this.peek() as any).value)) {
      const op = (this.consume() as any).value;
      const right = this.parseMul();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }
  parseMul(): Node {
    let left = this.parsePow();
    while (this.peek()?.type === 'op' && ['*','/','%'].includes((this.peek() as any).value)) {
      const op = (this.consume() as any).value;
      const right = this.parsePow();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }
  parsePow(): Node {
    const left = this.parseUnary();
    if (this.peek()?.type === 'op' && (this.peek() as any).value === '^') {
      this.consume();
      const right = this.parsePow();
      return { kind: 'binary', op: '^', left, right };
    }
    return left;
  }
  parseUnary(): Node {
    if (this.peek()?.type === 'op' && ['-','+'].includes((this.peek() as any).value)) {
      const op = (this.consume() as any).value;
      return { kind: 'unary', op, arg: this.parseUnary() };
    }
    return this.parsePrimary();
  }
  parsePrimary(): Node {
    const t = this.peek();
    if (!t) throw new Error('Unexpected end of expression');
    if (t.type === 'num') { this.consume(); return { kind: 'num', value: t.value }; }
    if (t.type === 'str') { this.consume(); return { kind: 'str', value: t.value }; }
    if (t.type === 'bool') { this.consume(); return { kind: 'bool', value: t.value }; }
    if (t.type === 'cell') { this.consume(); return { kind: 'cell', col: t.col, row: t.row }; }
    if (t.type === 'range') { this.consume(); return { kind: 'range', c1: t.c1, r1: t.r1, c2: t.c2, r2: t.r2 }; }
    if (t.type === 'lparen') {
      this.consume();
      const node = this.parseExpr();
      this.expect('rparen');
      return node;
    }
    if (t.type === 'ident') {
      this.consume();
      // Function call?
      if (this.peek()?.type === 'lparen') {
        this.consume();
        const args: Node[] = [];
        if (this.peek()?.type !== 'rparen') {
          args.push(this.parseExpr());
          while (this.peek()?.type === 'comma') {
            this.consume();
            args.push(this.parseExpr());
          }
        }
        this.expect('rparen');
        return { kind: 'call', name: t.value.toUpperCase(), args };
      }
      return { kind: 'name', value: t.value };
    }
    throw new Error('Unexpected token');
  }
}

// ────────── Evaluator ──────────
function getCellValue(ctx: SheetCtx, r: number, c: number): CellValue {
  const key = `${r}-${c}`;
  if (ctx._stack?.has(key)) throw new Error('#CYCLE!');
  const cell = ctx.cells[key];
  if (!cell) return '';
  if (cell.formula && typeof cell.value === 'undefined') {
    // recompute lazily (should be cached normally)
    if (!ctx._stack) ctx._stack = new Set();
    ctx._stack.add(key);
    try {
      const v = evaluateFormula(cell.formula.substring(1), ctx);
      ctx._stack.delete(key);
      return v;
    } catch (e) {
      ctx._stack.delete(key);
      return '#ERR!';
    }
  }
  if (typeof cell.value !== 'undefined') return cell.value;
  if (typeof cell.raw !== 'undefined') {
    const n = parseFloat(cell.raw);
    if (!isNaN(n) && String(n) === cell.raw.trim()) return n;
    return cell.raw;
  }
  return '';
}

function rangeValues(ctx: SheetCtx, r1: number, c1: number, r2: number, c2: number): CellValue[] {
  const out: CellValue[] = [];
  for (let r = r1; r <= r2; r++)
    for (let c = c1; c <= c2; c++)
      out.push(getCellValue(ctx, r, c));
  return out;
}

function toNum(v: CellValue): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v === null || v === undefined || v === '') return 0;
  const n = parseFloat(String(v).replace(/[$,£€¥%]/g, '').replace(/Rs\.?\s*/i, ''));
  return isNaN(n) ? 0 : n;
}
function toStr(v: CellValue): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return String(v);
}
function toBool(v: CellValue): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  const s = String(v).toUpperCase();
  return s === 'TRUE' || s === '1' || s === 'YES';
}
function flattenNumbers(arr: any[]): number[] {
  const out: number[] = [];
  for (const v of arr) {
    if (Array.isArray(v)) out.push(...flattenNumbers(v));
    else {
      if (typeof v === 'number') { out.push(v); continue; }
      if (typeof v === 'boolean') { out.push(v ? 1 : 0); continue; }
      if (v === '' || v === null || v === undefined) continue;
      const n = parseFloat(String(v).replace(/[$,£€¥%]/g, ''));
      if (!isNaN(n)) out.push(n);
    }
  }
  return out;
}
function flattenAll(arr: any[]): CellValue[] {
  const out: CellValue[] = [];
  for (const v of arr) {
    if (Array.isArray(v)) out.push(...flattenAll(v));
    else out.push(v);
  }
  return out;
}

function matchCriteria(value: CellValue, criteria: any): boolean {
  if (criteria === null || criteria === undefined) return false;
  let critStr = String(criteria).trim();
  // Operators like ">10", "<>foo", "<=5"
  const opMatch = critStr.match(/^(>=|<=|<>|>|<|=)(.*)$/);
  if (opMatch) {
    const op = opMatch[1];
    const rhsStr = opMatch[2].trim();
    const rhsNum = parseFloat(rhsStr);
    const v = typeof value === 'number' ? value : parseFloat(String(value));
    if (!isNaN(rhsNum) && !isNaN(v)) {
      switch (op) {
        case '>': return v > rhsNum;
        case '<': return v < rhsNum;
        case '>=': return v >= rhsNum;
        case '<=': return v <= rhsNum;
        case '=': return v === rhsNum;
        case '<>': return v !== rhsNum;
      }
    }
    if (op === '=' || op === '<>') {
      const eq = String(value).toUpperCase() === rhsStr.toUpperCase();
      return op === '=' ? eq : !eq;
    }
  }
  // Wildcards: * and ?
  if (critStr.includes('*') || critStr.includes('?')) {
    const re = new RegExp('^' + critStr.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
    return re.test(toStr(value));
  }
  // Number equality
  const cn = parseFloat(critStr);
  if (!isNaN(cn) && typeof value === 'number') return value === cn;
  return toStr(value).toUpperCase() === critStr.toUpperCase();
}

function evalNode(node: Node, ctx: SheetCtx): any {
  switch (node.kind) {
    case 'num': return node.value;
    case 'str': return node.value;
    case 'bool': return node.value;
    case 'cell': return getCellValue(ctx, node.row, node.col);
    case 'range': return rangeValues(ctx, node.r1, node.c1, node.r2, node.c2);
    case 'name': {
      const u = node.value.toUpperCase();
      if (u === 'PI') return Math.PI;
      if (u === 'E') return Math.E;
      if (u === 'TRUE') return true;
      if (u === 'FALSE') return false;
      if (ctx.customVars && u.toLowerCase() in ctx.customVars) return ctx.customVars[u.toLowerCase()];
      if (ctx.customVars && node.value in ctx.customVars) return ctx.customVars[node.value];
      return 0;
    }
    case 'unary': {
      const v = evalNode(node.arg, ctx);
      if (node.op === '-') return -toNum(v);
      return toNum(v);
    }
    case 'binary': {
      const L = evalNode(node.left, ctx);
      const R = evalNode(node.right, ctx);
      switch (node.op) {
        case '+': return toNum(L) + toNum(R);
        case '-': return toNum(L) - toNum(R);
        case '*': return toNum(L) * toNum(R);
        case '/': { const r = toNum(R); if (r === 0) return '#DIV/0!'; return toNum(L) / r; }
        case '%': return toNum(L) % toNum(R);
        case '^': return Math.pow(toNum(L), toNum(R));
        case '&': return toStr(L) + toStr(R);
        case '=': return typeof L === 'number' && typeof R === 'number' ? L === R : toStr(L) === toStr(R);
        case '<>': return typeof L === 'number' && typeof R === 'number' ? L !== R : toStr(L) !== toStr(R);
        case '<': return toNum(L) < toNum(R);
        case '>': return toNum(L) > toNum(R);
        case '<=': return toNum(L) <= toNum(R);
        case '>=': return toNum(L) >= toNum(R);
      }
      return 0;
    }
    case 'call': return callFunction(node.name, node.args, ctx);
  }
}

function callFunction(name: string, argNodes: Node[], ctx: SheetCtx): any {
  // Lazy-evaluated args (for IF, IFERROR, AND, OR short-circuit)
  const lazy = () => argNodes.map(a => evalNode(a, ctx));

  switch (name) {
    case 'SUM':       return flattenNumbers(lazy()).reduce((a,b)=>a+b,0);
    case 'AVERAGE':
    case 'AVG':       { const ns = flattenNumbers(lazy()); return ns.length ? ns.reduce((a,b)=>a+b,0)/ns.length : '#DIV/0!'; }
    case 'MAX':       { const ns = flattenNumbers(lazy()); return ns.length ? Math.max(...ns) : 0; }
    case 'MIN':       { const ns = flattenNumbers(lazy()); return ns.length ? Math.min(...ns) : 0; }
    case 'COUNT':     return flattenNumbers(lazy()).length;
    case 'COUNTA':    { const all = flattenAll(lazy()); return all.filter(v => v !== '' && v !== null && v !== undefined).length; }
    case 'COUNTIF':   { const arr = flattenAll([evalNode(argNodes[0], ctx)]); const c = evalNode(argNodes[1], ctx); return arr.filter(v => matchCriteria(v, c)).length; }
    case 'COUNTIFS':  {
      // pairs of (range, crit)
      const ranges: any[][] = [];
      const crits: any[] = [];
      for (let i = 0; i < argNodes.length; i += 2) {
        ranges.push(flattenAll([evalNode(argNodes[i], ctx)]));
        crits.push(evalNode(argNodes[i+1], ctx));
      }
      if (!ranges.length) return 0;
      const len = ranges[0].length;
      let count = 0;
      for (let i = 0; i < len; i++) {
        if (ranges.every((r,k) => matchCriteria(r[i], crits[k]))) count++;
      }
      return count;
    }
    case 'SUMIF': {
      const range = flattenAll([evalNode(argNodes[0], ctx)]);
      const crit = evalNode(argNodes[1], ctx);
      const sumRange = argNodes[2] ? flattenAll([evalNode(argNodes[2], ctx)]) : range;
      let sum = 0;
      for (let i = 0; i < range.length; i++) {
        if (matchCriteria(range[i], crit)) sum += toNum(sumRange[i] ?? 0);
      }
      return sum;
    }
    case 'SUMIFS': {
      const sumRange = flattenAll([evalNode(argNodes[0], ctx)]);
      const ranges: any[][] = [];
      const crits: any[] = [];
      for (let i = 1; i < argNodes.length; i += 2) {
        ranges.push(flattenAll([evalNode(argNodes[i], ctx)]));
        crits.push(evalNode(argNodes[i+1], ctx));
      }
      let sum = 0;
      for (let i = 0; i < sumRange.length; i++) {
        if (ranges.every((r,k) => matchCriteria(r[i], crits[k]))) sum += toNum(sumRange[i]);
      }
      return sum;
    }
    case 'AVERAGEIF': {
      const range = flattenAll([evalNode(argNodes[0], ctx)]);
      const crit = evalNode(argNodes[1], ctx);
      const avgRange = argNodes[2] ? flattenAll([evalNode(argNodes[2], ctx)]) : range;
      let sum = 0, cnt = 0;
      for (let i = 0; i < range.length; i++) {
        if (matchCriteria(range[i], crit)) { sum += toNum(avgRange[i] ?? 0); cnt++; }
      }
      return cnt ? sum / cnt : '#DIV/0!';
    }
    case 'AVERAGEIFS': {
      const avgRange = flattenAll([evalNode(argNodes[0], ctx)]);
      const ranges: any[][] = [];
      const crits: any[] = [];
      for (let i = 1; i < argNodes.length; i += 2) {
        ranges.push(flattenAll([evalNode(argNodes[i], ctx)]));
        crits.push(evalNode(argNodes[i+1], ctx));
      }
      let sum = 0, cnt = 0;
      for (let i = 0; i < avgRange.length; i++) {
        if (ranges.every((r,k) => matchCriteria(r[i], crits[k]))) { sum += toNum(avgRange[i]); cnt++; }
      }
      return cnt ? sum / cnt : '#DIV/0!';
    }
    case 'PRODUCT':   return flattenNumbers(lazy()).reduce((a,b)=>a*b,1);
    case 'SQRT':      return Math.sqrt(toNum(evalNode(argNodes[0], ctx)));
    case 'ABS':       return Math.abs(toNum(evalNode(argNodes[0], ctx)));
    case 'ROUND':     { const n = toNum(evalNode(argNodes[0], ctx)); const d = argNodes[1] ? toNum(evalNode(argNodes[1], ctx)) : 0; const f = Math.pow(10, d); return Math.round(n*f)/f; }
    case 'ROUNDUP':   { const n = toNum(evalNode(argNodes[0], ctx)); const d = argNodes[1] ? toNum(evalNode(argNodes[1], ctx)) : 0; const f = Math.pow(10, d); return Math.ceil(Math.abs(n)*f)/f * Math.sign(n||1); }
    case 'ROUNDDOWN': { const n = toNum(evalNode(argNodes[0], ctx)); const d = argNodes[1] ? toNum(evalNode(argNodes[1], ctx)) : 0; const f = Math.pow(10, d); return Math.floor(Math.abs(n)*f)/f * Math.sign(n||1); }
    case 'TRUNC':     { const n = toNum(evalNode(argNodes[0], ctx)); const d = argNodes[1] ? toNum(evalNode(argNodes[1], ctx)) : 0; const f = Math.pow(10, d); return Math.trunc(n*f)/f; }
    case 'FLOOR':     { const n = toNum(evalNode(argNodes[0], ctx)); const s = argNodes[1] ? toNum(evalNode(argNodes[1], ctx)) : 1; return Math.floor(n / s) * s; }
    case 'CEILING':   { const n = toNum(evalNode(argNodes[0], ctx)); const s = argNodes[1] ? toNum(evalNode(argNodes[1], ctx)) : 1; return Math.ceil(n / s) * s; }
    case 'MOD':       { const a = toNum(evalNode(argNodes[0], ctx)); const b = toNum(evalNode(argNodes[1], ctx)); return b === 0 ? '#DIV/0!' : a - b * Math.floor(a / b); }
    case 'POWER':     return Math.pow(toNum(evalNode(argNodes[0], ctx)), toNum(evalNode(argNodes[1], ctx)));
    case 'LOG':       { const n = toNum(evalNode(argNodes[0], ctx)); const b = argNodes[1] ? toNum(evalNode(argNodes[1], ctx)) : 10; return Math.log(n) / Math.log(b); }
    case 'LOG10':     return Math.log10(toNum(evalNode(argNodes[0], ctx)));
    case 'LN':        return Math.log(toNum(evalNode(argNodes[0], ctx)));
    case 'EXP':       return Math.exp(toNum(evalNode(argNodes[0], ctx)));
    case 'INT':       return Math.floor(toNum(evalNode(argNodes[0], ctx)));
    case 'SIGN':      return Math.sign(toNum(evalNode(argNodes[0], ctx)));
    case 'RAND':      return Math.random();
    case 'RANDBETWEEN': { const lo = toNum(evalNode(argNodes[0], ctx)); const hi = toNum(evalNode(argNodes[1], ctx)); return Math.floor(Math.random() * (hi - lo + 1)) + lo; }
    case 'PI':        return Math.PI;
    case 'E':         return Math.E;
    case 'GCD':       { const ns = flattenNumbers(lazy()).map(n => Math.abs(Math.round(n))); const gcd = (a:number,b:number):number => b===0?a:gcd(b,a%b); return ns.reduce((a,b)=>gcd(a,b),0); }
    case 'LCM':       { const ns = flattenNumbers(lazy()).map(n => Math.abs(Math.round(n))); const gcd = (a:number,b:number):number => b===0?a:gcd(b,a%b); return ns.reduce((a,b)=> (a*b)/gcd(a,b) || 0, 1); }
    case 'FACT':      { const n = Math.round(toNum(evalNode(argNodes[0], ctx))); if (n < 0) return '#NUM!'; let f = 1; for (let i=2;i<=n;i++) f *= i; return f; }
    // Stats
    case 'MEDIAN':    { const ns = flattenNumbers(lazy()).sort((a,b)=>a-b); if (!ns.length) return 0; const m = Math.floor(ns.length/2); return ns.length%2 ? ns[m] : (ns[m-1]+ns[m])/2; }
    case 'MODE':      { const ns = flattenNumbers(lazy()); const c: Record<number,number>={}; let best=ns[0],bc=0; ns.forEach(n=>{c[n]=(c[n]||0)+1; if(c[n]>bc){bc=c[n];best=n;}}); return bc>1?best:'#N/A'; }
    case 'STDEV':     { const ns = flattenNumbers(lazy()); if (ns.length<2) return '#DIV/0!'; const m=ns.reduce((a,b)=>a+b,0)/ns.length; return Math.sqrt(ns.reduce((a,b)=>a+(b-m)**2,0)/(ns.length-1)); }
    case 'STDEVP':    { const ns = flattenNumbers(lazy()); if (!ns.length) return 0; const m=ns.reduce((a,b)=>a+b,0)/ns.length; return Math.sqrt(ns.reduce((a,b)=>a+(b-m)**2,0)/ns.length); }
    case 'VAR':       { const ns = flattenNumbers(lazy()); if (ns.length<2) return '#DIV/0!'; const m=ns.reduce((a,b)=>a+b,0)/ns.length; return ns.reduce((a,b)=>a+(b-m)**2,0)/(ns.length-1); }
    case 'VARP':      { const ns = flattenNumbers(lazy()); if (!ns.length) return 0; const m=ns.reduce((a,b)=>a+b,0)/ns.length; return ns.reduce((a,b)=>a+(b-m)**2,0)/ns.length; }
    case 'LARGE':     { const ns = flattenNumbers([evalNode(argNodes[0], ctx)]).sort((a,b)=>b-a); const k = Math.round(toNum(evalNode(argNodes[1], ctx)))-1; return ns[k] ?? '#N/A'; }
    case 'SMALL':     { const ns = flattenNumbers([evalNode(argNodes[0], ctx)]).sort((a,b)=>a-b); const k = Math.round(toNum(evalNode(argNodes[1], ctx)))-1; return ns[k] ?? '#N/A'; }
    case 'RANK':      { const v = toNum(evalNode(argNodes[0], ctx)); const ns = flattenNumbers([evalNode(argNodes[1], ctx)]); const order = argNodes[2] ? toNum(evalNode(argNodes[2], ctx)) : 0; const sorted = [...ns].sort((a,b)=> order ? a-b : b-a); const idx = sorted.indexOf(v); return idx >= 0 ? idx+1 : '#N/A'; }
    case 'PERCENTILE':{ const ns = flattenNumbers([evalNode(argNodes[0], ctx)]).sort((a,b)=>a-b); const k = toNum(evalNode(argNodes[1], ctx)); if (!ns.length) return '#NUM!'; const idx = k * (ns.length-1); const lo = Math.floor(idx), hi = Math.ceil(idx); return ns[lo] + (ns[hi]-ns[lo]) * (idx-lo); }
    case 'QUARTILE':  { const q = toNum(evalNode(argNodes[1], ctx)); return callFunction('PERCENTILE', [argNodes[0], { kind:'num', value: q/4 } as Node], ctx); }
    // Trig
    case 'SIN': return Math.sin(toNum(evalNode(argNodes[0], ctx)));
    case 'COS': return Math.cos(toNum(evalNode(argNodes[0], ctx)));
    case 'TAN': return Math.tan(toNum(evalNode(argNodes[0], ctx)));
    case 'ASIN': return Math.asin(toNum(evalNode(argNodes[0], ctx)));
    case 'ACOS': return Math.acos(toNum(evalNode(argNodes[0], ctx)));
    case 'ATAN': return Math.atan(toNum(evalNode(argNodes[0], ctx)));
    case 'ATAN2': return Math.atan2(toNum(evalNode(argNodes[0], ctx)), toNum(evalNode(argNodes[1], ctx)));
    case 'SINH': return Math.sinh(toNum(evalNode(argNodes[0], ctx)));
    case 'COSH': return Math.cosh(toNum(evalNode(argNodes[0], ctx)));
    case 'TANH': return Math.tanh(toNum(evalNode(argNodes[0], ctx)));
    case 'RADIANS': return toNum(evalNode(argNodes[0], ctx)) * Math.PI / 180;
    case 'DEGREES': return toNum(evalNode(argNodes[0], ctx)) * 180 / Math.PI;
    // String
    case 'LEN':   return toStr(evalNode(argNodes[0], ctx)).length;
    case 'UPPER': return toStr(evalNode(argNodes[0], ctx)).toUpperCase();
    case 'LOWER': return toStr(evalNode(argNodes[0], ctx)).toLowerCase();
    case 'PROPER': return toStr(evalNode(argNodes[0], ctx)).replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
    case 'TRIM':  return toStr(evalNode(argNodes[0], ctx)).replace(/\s+/g, ' ').trim();
    case 'LEFT':  { const s = toStr(evalNode(argNodes[0], ctx)); const n = argNodes[1] ? Math.round(toNum(evalNode(argNodes[1], ctx))) : 1; return s.substring(0, n); }
    case 'RIGHT': { const s = toStr(evalNode(argNodes[0], ctx)); const n = argNodes[1] ? Math.round(toNum(evalNode(argNodes[1], ctx))) : 1; return s.substring(s.length-n); }
    case 'MID':   { const s = toStr(evalNode(argNodes[0], ctx)); const start = Math.max(0, Math.round(toNum(evalNode(argNodes[1], ctx)))-1); const len = Math.round(toNum(evalNode(argNodes[2], ctx))); return s.substring(start, start+len); }
    case 'CONCAT':
    case 'CONCATENATE': return flattenAll(lazy()).map(toStr).join('');
    case 'TEXTJOIN': { const delim = toStr(evalNode(argNodes[0], ctx)); const ignEmpty = toBool(evalNode(argNodes[1], ctx)); const parts = flattenAll(argNodes.slice(2).map(n => evalNode(n, ctx))).map(toStr); return (ignEmpty ? parts.filter(s => s !== '') : parts).join(delim); }
    case 'SUBSTITUTE': { const s = toStr(evalNode(argNodes[0], ctx)); const find = toStr(evalNode(argNodes[1], ctx)); const repl = toStr(evalNode(argNodes[2], ctx)); const occ = argNodes[3] ? Math.round(toNum(evalNode(argNodes[3], ctx))) : 0; if (!occ) return s.split(find).join(repl); let cnt = 0; return s.replace(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'), m => { cnt++; return cnt === occ ? repl : m; }); }
    case 'REPLACE': { const s = toStr(evalNode(argNodes[0], ctx)); const start = Math.max(0, Math.round(toNum(evalNode(argNodes[1], ctx)))-1); const len = Math.round(toNum(evalNode(argNodes[2], ctx))); const newT = toStr(evalNode(argNodes[3], ctx)); return s.substring(0, start) + newT + s.substring(start+len); }
    case 'FIND':
    case 'SEARCH': { const find = toStr(evalNode(argNodes[0], ctx)); const s = toStr(evalNode(argNodes[1], ctx)); const start = argNodes[2] ? Math.round(toNum(evalNode(argNodes[2], ctx)))-1 : 0; const idx = name==='SEARCH' ? s.toLowerCase().indexOf(find.toLowerCase(), start) : s.indexOf(find, start); return idx>=0 ? idx+1 : '#VALUE!'; }
    case 'VALUE': { const n = parseFloat(toStr(evalNode(argNodes[0], ctx)).replace(/[$,£€¥%]/g,'')); return isNaN(n) ? '#VALUE!' : n; }
    case 'TEXT': { const v = evalNode(argNodes[0], ctx); const fmt = toStr(evalNode(argNodes[1], ctx)); if (typeof v !== 'number') return toStr(v); if (fmt.includes('%')) return (v*100).toFixed((fmt.match(/0+\.?(0*)/)?.[1]?.length)||0)+'%'; const dec = (fmt.split('.')[1]||'').length; return dec ? v.toFixed(dec) : Math.round(v).toString(); }
    case 'REPT': return toStr(evalNode(argNodes[0], ctx)).repeat(Math.max(0, Math.round(toNum(evalNode(argNodes[1], ctx)))));
    case 'REVERSE': return [...toStr(evalNode(argNodes[0], ctx))].reverse().join('');
    case 'CHAR': return String.fromCharCode(Math.round(toNum(evalNode(argNodes[0], ctx))));
    case 'CODE': return toStr(evalNode(argNodes[0], ctx)).charCodeAt(0) || 0;
    // Logical
    case 'IF':    { const cond = toBool(evalNode(argNodes[0], ctx)); return cond ? evalNode(argNodes[1], ctx) : (argNodes[2] ? evalNode(argNodes[2], ctx) : false); }
    case 'IFS':   { for (let i = 0; i < argNodes.length; i += 2) { if (toBool(evalNode(argNodes[i], ctx))) return evalNode(argNodes[i+1], ctx); } return '#N/A'; }
    case 'AND':   return lazy().every(toBool);
    case 'OR':    return lazy().some(toBool);
    case 'NOT':   return !toBool(evalNode(argNodes[0], ctx));
    case 'XOR':   return lazy().filter(toBool).length % 2 === 1;
    case 'IFERROR': { try { const v = evalNode(argNodes[0], ctx); if (typeof v === 'string' && v.startsWith('#')) return evalNode(argNodes[1], ctx); return v; } catch { return evalNode(argNodes[1], ctx); } }
    case 'IFNA':    { try { const v = evalNode(argNodes[0], ctx); if (v === '#N/A') return evalNode(argNodes[1], ctx); return v; } catch { return evalNode(argNodes[1], ctx); } }
    case 'ISBLANK': { const v = evalNode(argNodes[0], ctx); return v === '' || v === null || v === undefined; }
    case 'ISNUMBER': { const v = evalNode(argNodes[0], ctx); return typeof v === 'number' && !isNaN(v); }
    case 'ISTEXT':   { const v = evalNode(argNodes[0], ctx); return typeof v === 'string' && isNaN(parseFloat(v)); }
    case 'ISERROR':  { try { const v = evalNode(argNodes[0], ctx); return typeof v === 'string' && v.startsWith('#'); } catch { return true; } }
    case 'TRUE': return true;
    case 'FALSE': return false;
    case 'SWITCH': { const expr = evalNode(argNodes[0], ctx); for (let i = 1; i + 1 < argNodes.length; i += 2) { if (toStr(expr) === toStr(evalNode(argNodes[i], ctx))) return evalNode(argNodes[i+1], ctx); } if (argNodes.length % 2 === 0) return evalNode(argNodes[argNodes.length-1], ctx); return '#N/A'; }
    // Lookup
    case 'VLOOKUP': {
      const lookup = evalNode(argNodes[0], ctx);
      const rangeNode = argNodes[1];
      if (rangeNode.kind !== 'range') return '#N/A';
      const colIdx = Math.round(toNum(evalNode(argNodes[2], ctx))) - 1;
      const exact = argNodes[3] ? !toBool(evalNode(argNodes[3], ctx)) : false;
      for (let r = rangeNode.r1; r <= rangeNode.r2; r++) {
        const v = getCellValue(ctx, r, rangeNode.c1);
        const matches = exact ? toStr(v).toUpperCase() === toStr(lookup).toUpperCase() : matchCriteria(v, lookup);
        if (matches) return getCellValue(ctx, r, rangeNode.c1 + colIdx);
      }
      return '#N/A';
    }
    case 'HLOOKUP': {
      const lookup = evalNode(argNodes[0], ctx);
      const rangeNode = argNodes[1];
      if (rangeNode.kind !== 'range') return '#N/A';
      const rowIdx = Math.round(toNum(evalNode(argNodes[2], ctx))) - 1;
      for (let c = rangeNode.c1; c <= rangeNode.c2; c++) {
        if (toStr(getCellValue(ctx, rangeNode.r1, c)).toUpperCase() === toStr(lookup).toUpperCase())
          return getCellValue(ctx, rangeNode.r1 + rowIdx, c);
      }
      return '#N/A';
    }
    case 'INDEX': {
      const rangeNode = argNodes[0];
      if (rangeNode.kind !== 'range' && rangeNode.kind !== 'cell') return '#REF!';
      const rIdx = Math.round(toNum(evalNode(argNodes[1], ctx))) - 1;
      const cIdx = argNodes[2] ? Math.round(toNum(evalNode(argNodes[2], ctx))) - 1 : 0;
      if (rangeNode.kind === 'cell') return getCellValue(ctx, rangeNode.row, rangeNode.col);
      return getCellValue(ctx, rangeNode.r1 + rIdx, rangeNode.c1 + cIdx);
    }
    case 'MATCH': {
      const lookup = evalNode(argNodes[0], ctx);
      const arr = flattenAll([evalNode(argNodes[1], ctx)]);
      for (let i = 0; i < arr.length; i++) {
        if (toStr(arr[i]).toUpperCase() === toStr(lookup).toUpperCase()) return i + 1;
      }
      return '#N/A';
    }
    case 'XLOOKUP': {
      const lookup = evalNode(argNodes[0], ctx);
      const lookupArr = flattenAll([evalNode(argNodes[1], ctx)]);
      const returnArr = flattenAll([evalNode(argNodes[2], ctx)]);
      const notFound = argNodes[3] ? evalNode(argNodes[3], ctx) : '#N/A';
      for (let i = 0; i < lookupArr.length; i++) {
        if (toStr(lookupArr[i]).toUpperCase() === toStr(lookup).toUpperCase()) return returnArr[i];
      }
      return notFound;
    }
    case 'CHOOSE': { const idx = Math.round(toNum(evalNode(argNodes[0], ctx))); return idx >= 1 && idx < argNodes.length ? evalNode(argNodes[idx], ctx) : '#VALUE!'; }
    case 'OFFSET': {
      const baseNode = argNodes[0];
      if (baseNode.kind !== 'cell' && baseNode.kind !== 'range') return '#REF!';
      const r0 = baseNode.kind === 'cell' ? baseNode.row : baseNode.r1;
      const c0 = baseNode.kind === 'cell' ? baseNode.col : baseNode.c1;
      const dr = Math.round(toNum(evalNode(argNodes[1], ctx)));
      const dc = Math.round(toNum(evalNode(argNodes[2], ctx)));
      return getCellValue(ctx, r0 + dr, c0 + dc);
    }
    // Date
    case 'TODAY': return new Date().toLocaleDateString('en-CA');
    case 'NOW':   return new Date().toLocaleString();
    case 'YEAR':  return new Date(toStr(evalNode(argNodes[0], ctx))).getFullYear();
    case 'MONTH': return new Date(toStr(evalNode(argNodes[0], ctx))).getMonth() + 1;
    case 'DAY':   return new Date(toStr(evalNode(argNodes[0], ctx))).getDate();
    case 'HOUR':  return new Date(toStr(evalNode(argNodes[0], ctx))).getHours();
    case 'MINUTE':return new Date(toStr(evalNode(argNodes[0], ctx))).getMinutes();
    case 'SECOND':return new Date(toStr(evalNode(argNodes[0], ctx))).getSeconds();
    case 'DATE':  { const y = toNum(evalNode(argNodes[0], ctx)); const m = toNum(evalNode(argNodes[1], ctx)); const d = toNum(evalNode(argNodes[2], ctx)); return new Date(y, m-1, d).toLocaleDateString('en-CA'); }
    case 'WEEKDAY': return new Date(toStr(evalNode(argNodes[0], ctx))).getDay() + 1;
    case 'DATEDIF': { const a = new Date(toStr(evalNode(argNodes[0], ctx))); const b = new Date(toStr(evalNode(argNodes[1], ctx))); const u = toStr(evalNode(argNodes[2], ctx)).toUpperCase(); const ms = b.getTime() - a.getTime(); if (u==='D') return Math.floor(ms/86400000); if (u==='M') return (b.getFullYear()-a.getFullYear())*12 + (b.getMonth()-a.getMonth()); if (u==='Y') return b.getFullYear() - a.getFullYear(); return '#NUM!'; }
    case 'EOMONTH': { const d = new Date(toStr(evalNode(argNodes[0], ctx))); const m = toNum(evalNode(argNodes[1], ctx)); const r = new Date(d.getFullYear(), d.getMonth()+m+1, 0); return r.toLocaleDateString('en-CA'); }
    // Financial
    case 'PMT': { const rate = toNum(evalNode(argNodes[0], ctx)); const nper = toNum(evalNode(argNodes[1], ctx)); const pv = toNum(evalNode(argNodes[2], ctx)); if (rate === 0) return -pv / nper; return -(pv * rate * Math.pow(1+rate, nper)) / (Math.pow(1+rate, nper) - 1); }
    case 'FV':  { const rate = toNum(evalNode(argNodes[0], ctx)); const nper = toNum(evalNode(argNodes[1], ctx)); const pmt = toNum(evalNode(argNodes[2], ctx)); const pv = argNodes[3] ? toNum(evalNode(argNodes[3], ctx)) : 0; if (rate === 0) return -pv - pmt * nper; return -(pv * Math.pow(1+rate, nper) + pmt * (Math.pow(1+rate, nper) - 1) / rate); }
    case 'PV':  { const rate = toNum(evalNode(argNodes[0], ctx)); const nper = toNum(evalNode(argNodes[1], ctx)); const pmt = toNum(evalNode(argNodes[2], ctx)); const fv = argNodes[3] ? toNum(evalNode(argNodes[3], ctx)) : 0; if (rate === 0) return -fv - pmt * nper; return -(fv + pmt * (Math.pow(1+rate, nper) - 1) / rate) / Math.pow(1+rate, nper); }
  }

  // Custom function from calculator (mathjs)?
  const lname = name.toLowerCase();
  if (ctx.customFns && lname in ctx.customFns) {
    const fn = ctx.customFns[lname];
    try { return fn(...argNodes.map(a => toNum(evalNode(a, ctx)))); } catch (e) { return '#ERR!'; }
  }
  // Try mathjs as last fallback (e.g. user-defined functions in calc panel)
  try {
    const argVals = argNodes.map(a => evalNode(a, ctx));
    const scope: Record<string, any> = { ...(ctx.customVars || {}), pi: Math.PI, e: Math.E };
    const argList = argVals.map((_, i) => `__a${i}`).join(',');
    argVals.forEach((v, i) => { scope[`__a${i}`] = v; });
    return math.evaluate(`${name}(${argList})`, scope);
  } catch {
    return '#NAME?';
  }
}

export function evaluateFormula(expr: string, ctx: SheetCtx): CellValue {
  try {
    const toks = tokenize(expr);
    if (!toks.length) return '';
    const parser = new Parser(toks);
    const ast = parser.parseExpr();
    if (!ctx._stack) ctx._stack = new Set();
    const v = evalNode(ast, ctx);
    if (Array.isArray(v)) return v[0] as CellValue ?? '';
    return v as CellValue;
  } catch (e: any) {
    return '#ERR!';
  }
}

export function formatResult(v: CellValue): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') {
    if (!isFinite(v)) return '#NUM!';
    if (Number.isInteger(v)) return String(v);
    return parseFloat(v.toFixed(8)).toString();
  }
  return String(v);
}

// Recompute every formula cell. Returns updated cells dict.
export function recomputeAll(cells: Record<string, CellData>, ctx: Omit<SheetCtx, 'cells'>): Record<string, CellData> {
  const sheetCtx: SheetCtx = { ...ctx, cells: { ...cells } };
  // First: clear cached values for formula cells
  for (const k in sheetCtx.cells) {
    const c = sheetCtx.cells[k];
    if (c.formula) sheetCtx.cells[k] = { ...c, value: undefined };
  }
  // Then evaluate each formula
  for (const k in sheetCtx.cells) {
    const c = sheetCtx.cells[k];
    if (c.formula) {
      try {
        sheetCtx._stack = new Set([k]);
        const v = evaluateFormula(c.formula.substring(1), sheetCtx);
        sheetCtx.cells[k] = { ...c, value: formatResult(v) };
      } catch {
        sheetCtx.cells[k] = { ...c, value: '#ERR!' };
      }
    }
  }
  return sheetCtx.cells;
}
