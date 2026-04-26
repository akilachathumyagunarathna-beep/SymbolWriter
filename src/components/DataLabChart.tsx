import { useMemo } from 'react';
import {
  Chart as ChartJS, BarElement, LineElement, PointElement,
  ArcElement, RadialLinearScale, LinearScale, CategoryScale,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Line, Pie, Doughnut, Radar, PolarArea, Scatter } from 'react-chartjs-2';
import type { CellData } from '../lib/formulaEngine';
import { cellRef } from '../lib/formulaEngine';

ChartJS.register(BarElement, LineElement, PointElement, ArcElement, RadialLinearScale,
  LinearScale, CategoryScale, Title, Tooltip, Legend, Filler);

const PALETTE = [
  '#8b5cf6','#22c55e','#f97316','#3b82f6','#ec4899',
  '#14b8a6','#facc15','#ef4444','#a855f7','#10b981',
];

export type ChartType = 'bar'|'line'|'area'|'pie'|'doughnut'|'scatter'|'radar'|'polar'|'horizontalBar';

interface Props {
  cells: Record<string, CellData>;
  rows: number; cols: number;
  type: ChartType;
  setType: (t: ChartType) => void;
  labelRange: string;
  setLabelRange: (s: string) => void;
  dataRange: string;
  setDataRange: (s: string) => void;
  title: string;
  setTitle: (s: string) => void;
}

function parseRangeRef(ref: string): { c1: number; r1: number; c2: number; r2: number } | null {
  const m = ref.trim().toUpperCase().match(/^([A-Z]+)([0-9]+)(?::([A-Z]+)([0-9]+))?$/);
  if (!m) return null;
  const colToIdx = (s: string) => { let n = 0; for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
  const c1 = colToIdx(m[1]); const r1 = parseInt(m[2]) - 1;
  const c2 = m[3] ? colToIdx(m[3]) : c1; const r2 = m[4] ? parseInt(m[4]) - 1 : r1;
  return { c1: Math.min(c1,c2), r1: Math.min(r1,r2), c2: Math.max(c1,c2), r2: Math.max(r1,r2) };
}

function getRangeValues(cells: Record<string, CellData>, ref: string): any[] {
  const r = parseRangeRef(ref); if (!r) return [];
  const out: any[] = [];
  for (let row = r.r1; row <= r.r2; row++)
    for (let col = r.c1; col <= r.c2; col++) {
      const c = cells[`${row}-${col}`];
      out.push(c?.value ?? c?.raw ?? '');
    }
  return out;
}
function getRangeNumbers(cells: Record<string, CellData>, ref: string): number[] {
  return getRangeValues(cells, ref).map(v => {
    if (typeof v === 'number') return v;
    const n = parseFloat(String(v).replace(/[$,£€¥%]/g,''));
    return isNaN(n) ? 0 : n;
  });
}

export default function DataLabChart(p: Props) {
  const labels = useMemo(() => getRangeValues(p.cells, p.labelRange).map(v => String(v ?? '')), [p.cells, p.labelRange]);
  const data = useMemo(() => getRangeNumbers(p.cells, p.dataRange), [p.cells, p.dataRange]);

  const chartData = useMemo(() => {
    if (!data.length) return null;
    const colors = data.map((_, i) => PALETTE[i % PALETTE.length]);
    const single = ['pie','doughnut','polar'].includes(p.type);
    if (p.type === 'scatter') {
      // pair labels (numeric) with data
      const points = labels.map((l, i) => ({ x: parseFloat(l) || i, y: data[i] }));
      return {
        datasets: [{ label: p.title || 'Series', data: points, backgroundColor: PALETTE[0], borderColor: PALETTE[0] }],
      };
    }
    return {
      labels: labels.length ? labels : data.map((_, i) => `Pt ${i+1}`),
      datasets: [{
        label: p.title || 'Series',
        data,
        backgroundColor: single ? colors : (p.type==='area' ? 'rgba(139,92,246,0.18)' : PALETTE[0]),
        borderColor: single ? colors : PALETTE[0],
        borderWidth: single ? 1 : 2,
        fill: p.type === 'area',
        tension: 0.25,
        pointRadius: p.type === 'line' || p.type === 'area' ? 3 : 0,
      }],
    };
  }, [labels, data, p.type, p.title]);

  const options: any = {
    responsive: true, maintainAspectRatio: false, animation: false,
    indexAxis: p.type === 'horizontalBar' ? 'y' : 'x',
    plugins: {
      legend: { display: ['pie','doughnut','polar','radar'].includes(p.type), position: 'bottom' },
      title: { display: !!p.title, text: p.title },
    },
  };

  function renderChart() {
    if (!chartData) return <div style={{ color: 'var(--text-faint)', textAlign: 'center', padding: 40 }}>Enter valid ranges to render chart</div>;
    switch (p.type) {
      case 'bar':
      case 'horizontalBar':  return <Bar data={chartData as any} options={options} />;
      case 'line':
      case 'area':           return <Line data={chartData as any} options={options} />;
      case 'pie':            return <Pie data={chartData as any} options={options} />;
      case 'doughnut':       return <Doughnut data={chartData as any} options={options} />;
      case 'scatter':        return <Scatter data={chartData as any} options={options} />;
      case 'radar':          return <Radar data={chartData as any} options={options} />;
      case 'polar':          return <PolarArea data={chartData as any} options={options} />;
    }
  }

  return (
    <div className="chart-area">
      <div className="chart-controls">
        <select value={p.type} onChange={e => p.setType(e.target.value as ChartType)}>
          <option value="bar">Bar</option>
          <option value="horizontalBar">Bar (horizontal)</option>
          <option value="line">Line</option>
          <option value="area">Area</option>
          <option value="pie">Pie</option>
          <option value="doughnut">Doughnut</option>
          <option value="scatter">Scatter</option>
          <option value="radar">Radar</option>
          <option value="polar">Polar Area</option>
        </select>
        <input placeholder="Labels (e.g. A1:A10)" value={p.labelRange} onChange={e => p.setLabelRange(e.target.value)} style={{ width: 130 }} />
        <input placeholder="Data (e.g. B1:B10)" value={p.dataRange} onChange={e => p.setDataRange(e.target.value)} style={{ width: 130 }} />
        <input placeholder="Chart title" value={p.title} onChange={e => p.setTitle(e.target.value)} style={{ flex: 1, minWidth: 120 }} />
      </div>
      <div className="chart-canvas-wrap">{renderChart()}</div>
    </div>
  );
}
