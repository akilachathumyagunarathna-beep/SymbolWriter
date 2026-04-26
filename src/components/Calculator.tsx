import { useEffect, useMemo, useRef, useState } from 'react';
import { create, all } from 'mathjs';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend, Filler);

const math = create(all, {});

interface CustomFn { name: string; expr: string; args: string }
interface CustomVar { name: string; expr: string }

interface Props {
  customFns: CustomFn[];
  customVars: CustomVar[];
  setCustomFns: React.Dispatch<React.SetStateAction<CustomFn[]>>;
  setCustomVars: React.Dispatch<React.SetStateAction<CustomVar[]>>;
  onScopeChange?: (scope: { fns: Record<string, any>; vars: Record<string, any> }) => void;
}

const KEYS = [
  '7','8','9','/','sin(',
  '4','5','6','*','cos(',
  '1','2','3','-','tan(',
  '0','.','^','+','sqrt(',
  '(',')','π','e','log(',
  'C','⌫','ans','%','ln(',
];

export default function Calculator(p: Props) {
  const [expr, setExpr] = useState('');
  const [history, setHistory] = useState<{ in: string; out: string }[]>([]);
  const [scope] = useState<Record<string, any>>(() => ({ ans: 0, pi: Math.PI, e: Math.E }));
  const exprRef = useRef<HTMLInputElement>(null);

  // Build mathjs scope from custom vars/fns
  useEffect(() => {
    // Reset everything except ans
    const ans = scope.ans;
    Object.keys(scope).forEach(k => { delete scope[k]; });
    scope.ans = ans; scope.pi = Math.PI; scope.e = Math.E;
    for (const v of p.customVars) {
      try { scope[v.name] = math.evaluate(v.expr, scope); } catch { /* skip */ }
    }
    for (const f of p.customFns) {
      try {
        const argList = f.args.split(',').map(s => s.trim()).filter(Boolean);
        scope[f.name] = math.evaluate(`(${argList.join(',')}) -> ${f.expr}`);
      } catch { /* skip */ }
    }
    // Notify parent so DataLab can use them
    const fns: Record<string, any> = {};
    const vars: Record<string, any> = {};
    for (const k of Object.keys(scope)) {
      if (typeof scope[k] === 'function') fns[k.toLowerCase()] = scope[k];
      else vars[k] = scope[k];
    }
    p.onScopeChange?.({ fns, vars });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.customFns, p.customVars]);

  function calculate(input?: string) {
    const e = (input ?? expr).trim();
    if (!e) return;
    try {
      const result = math.evaluate(e, scope);
      const out = formatResult(result);
      scope.ans = result;
      setHistory(h => [{ in: e, out }, ...h].slice(0, 50));
      setExpr('');
    } catch (err: any) {
      setHistory(h => [{ in: e, out: 'Error: ' + (err.message || 'Invalid') }, ...h].slice(0, 50));
    }
  }

  function key(k: string) {
    if (k === 'C') { setExpr(''); return; }
    if (k === '⌫') { setExpr(s => s.slice(0, -1)); return; }
    if (k === 'ans') { setExpr(s => s + 'ans'); return; }
    if (k === 'π') { setExpr(s => s + 'pi'); return; }
    setExpr(s => s + k);
    exprRef.current?.focus();
  }

  // Custom var/fn editing
  const [varName, setVarName] = useState(''); const [varExpr, setVarExpr] = useState('');
  const [fnName, setFnName] = useState(''); const [fnArgs, setFnArgs] = useState(''); const [fnExpr, setFnExpr] = useState('');

  // Graph state
  const [gExpr, setGExpr] = useState('sin(x)');
  const [gMin, setGMin] = useState('-10');
  const [gMax, setGMax] = useState('10');
  const [gType, setGType] = useState<'line'|'scatter'|'area'>('line');
  const [gPoints, setGPoints] = useState('200');
  const graphData = useMemo(() => {
    const min = parseFloat(gMin), max = parseFloat(gMax);
    const pts = Math.min(2000, Math.max(20, parseInt(gPoints) || 200));
    if (!isFinite(min) || !isFinite(max) || max <= min) return null;
    const xs: number[] = [], ys: number[] = [];
    let compiled: any;
    try { compiled = math.compile(gExpr); } catch { return null; }
    for (let i = 0; i < pts; i++) {
      const x = min + (max - min) * (i / (pts - 1));
      try {
        const y = compiled.evaluate({ ...scope, x });
        xs.push(x);
        ys.push(typeof y === 'number' && isFinite(y) ? y : NaN);
      } catch { xs.push(x); ys.push(NaN); }
    }
    return {
      labels: xs.map(x => x.toFixed(2)),
      datasets: [{
        label: gExpr,
        data: ys,
        borderColor: '#8b5cf6',
        backgroundColor: gType==='area' ? 'rgba(139,92,246,0.18)' : 'rgba(139,92,246,0.6)',
        fill: gType==='area',
        showLine: gType !== 'scatter',
        pointRadius: gType==='scatter' ? 2 : 0,
        tension: 0.2,
      }],
    };
  }, [gExpr, gMin, gMax, gType, gPoints, p.customFns, p.customVars]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div className="calc-display">
        {history.length === 0 && <div style={{ color: 'var(--text-faint)', fontSize: 12, textAlign: 'center', padding: 12 }}>Type an expression and press Enter…</div>}
        {history.map((h, i) => (
          <div key={i} className="calc-line">
            <span className="lhs">{h.in}</span>
            <span className="rhs">= {h.out}</span>
          </div>
        ))}
      </div>
      <input
        ref={exprRef}
        className="calc-input"
        placeholder="Expression  e.g.  2*sin(pi/4) + log(100)"
        value={expr}
        onChange={e => setExpr(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') calculate(); }}
      />
      <div className="calc-grid">
        {KEYS.map(k => (
          <button
            key={k}
            className={`calc-key ${'+-*/^%'.includes(k) ? 'op' : ''} ${/[a-z]/.test(k) ? 'fn' : ''}`}
            onClick={() => key(k)}
          >{k}</button>
        ))}
        <button className="calc-key eq" style={{ gridColumn: 'span 5' }} onClick={() => calculate()}>= Evaluate</button>
      </div>

      <div className="calc-section">
        <h4>Custom Variables</h4>
        <div className="row">
          <input placeholder="name" value={varName} onChange={e => setVarName(e.target.value)} style={{ maxWidth: 80 }} />
          <input placeholder="value or expression" value={varExpr} onChange={e => setVarExpr(e.target.value)} />
          <button onClick={() => {
            if (!varName.trim() || !varExpr.trim()) return;
            p.setCustomVars(arr => [...arr.filter(v => v.name !== varName.trim()), { name: varName.trim(), expr: varExpr.trim() }]);
            setVarName(''); setVarExpr('');
          }}>+</button>
        </div>
        {p.customVars.map(v => (
          <div key={v.name} className="item">
            <span>{v.name} = {v.expr}</span>
            <button onClick={() => p.setCustomVars(arr => arr.filter(x => x.name !== v.name))}>×</button>
          </div>
        ))}
      </div>

      <div className="calc-section">
        <h4>Custom Functions</h4>
        <div className="row">
          <input placeholder="name" value={fnName} onChange={e => setFnName(e.target.value)} style={{ maxWidth: 80 }} />
          <input placeholder="x,y" value={fnArgs} onChange={e => setFnArgs(e.target.value)} style={{ maxWidth: 80 }} />
          <input placeholder="x^2 + y" value={fnExpr} onChange={e => setFnExpr(e.target.value)} />
          <button onClick={() => {
            if (!fnName.trim() || !fnExpr.trim()) return;
            p.setCustomFns(arr => [...arr.filter(f => f.name !== fnName.trim()), { name: fnName.trim(), args: fnArgs.trim() || 'x', expr: fnExpr.trim() }]);
            setFnName(''); setFnArgs(''); setFnExpr('');
          }}>+</button>
        </div>
        {p.customFns.map(f => (
          <div key={f.name} className="item">
            <span>{f.name}({f.args}) = {f.expr}</span>
            <button onClick={() => p.setCustomFns(arr => arr.filter(x => x.name !== f.name))}>×</button>
          </div>
        ))}
      </div>

      <div className="graph-section">
        <h4 style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', margin: '0 0 6px' }}>Graph</h4>
        <div className="row">
          <input placeholder="f(x) e.g. sin(x)*x" value={gExpr} onChange={e => setGExpr(e.target.value)} style={{ flex: 1 }} />
        </div>
        <div className="row">
          <input value={gMin} onChange={e => setGMin(e.target.value)} placeholder="x min" style={{ width: 60 }} />
          <input value={gMax} onChange={e => setGMax(e.target.value)} placeholder="x max" style={{ width: 60 }} />
          <input value={gPoints} onChange={e => setGPoints(e.target.value)} placeholder="pts" style={{ width: 50 }} />
          <select value={gType} onChange={e => setGType(e.target.value as any)} style={{ flex: 1 }}>
            <option value="line">Line</option>
            <option value="area">Area</option>
            <option value="scatter">Scatter</option>
          </select>
        </div>
        <div className="graph-canvas" style={{ height: 220 }}>
          {graphData ? (
            <Line
              data={graphData as any}
              options={{
                responsive: true, maintainAspectRatio: false, animation: false,
                plugins: { legend: { display: false } },
                scales: { x: { ticks: { maxTicksLimit: 8, color: 'var(--text-dim)' as any } }, y: { ticks: { color: 'var(--text-dim)' as any } } },
              }}
            />
          ) : <div style={{ color: 'var(--text-faint)', fontSize: 12, textAlign: 'center', paddingTop: 80 }}>Enter a valid f(x)</div>}
        </div>
      </div>
    </div>
  );
}

function formatResult(v: any): string {
  if (typeof v === 'number') {
    if (!isFinite(v)) return String(v);
    if (Number.isInteger(v)) return v.toString();
    return parseFloat(v.toFixed(10)).toString();
  }
  if (Array.isArray(v) || typeof v === 'object') return math.format(v, { precision: 10 });
  return String(v);
}
