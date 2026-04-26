import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  CellData, recomputeAll, evaluateFormula, formatResult,
  cellRef, FUNCTION_LIST, FUNC_DOCS,
} from '../lib/formulaEngine';
import DataLabChart, { ChartType } from './DataLabChart';
import { exportCSV, exportXLS, importCSV } from '../lib/exporters';

interface Props {
  customFns: Record<string, any>;
  customVars: Record<string, any>;
  push: (msg: string, kind?: 'info'|'success'|'danger') => void;
}

interface SheetState {
  rows: number;
  cols: number;
  cells: Record<string, CellData>;
}

export default function DataLab(p: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<SheetState>(() => {
    try {
      const raw = localStorage.getItem('sw_datalab_v3');
      if (raw) return JSON.parse(raw);
    } catch {}
    return { rows: 30, cols: 12, cells: {} };
  });
  const [sel, setSel] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [editing, setEditing] = useState<{ r: number; c: number; value: string } | null>(null);
  const [formulaBar, setFormulaBar] = useState('');
  const [showChart, setShowChart] = useState(true);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [labelRange, setLabelRange] = useState('A1:A10');
  const [dataRange, setDataRange] = useState('B1:B10');
  const [chartTitle, setChartTitle] = useState('My Chart');
  const editInputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Persist
  useEffect(() => {
    const id = setTimeout(() => {
      try { localStorage.setItem('sw_datalab_v3', JSON.stringify(sheet)); } catch {}
    }, 300);
    return () => clearTimeout(id);
  }, [sheet]);

  // Recompute when custom fns/vars change
  useEffect(() => {
    setSheet(s => ({ ...s, cells: recomputeAll(s.cells, { rows: s.rows, cols: s.cols, customFns: p.customFns, customVars: p.customVars }) }));
  }, [p.customFns, p.customVars]);

  // Update formula bar when selection changes (and not editing)
  useEffect(() => {
    if (editing) return;
    const cell = sheet.cells[`${sel.r}-${sel.c}`];
    setFormulaBar(cell?.formula ?? cell?.raw ?? '');
  }, [sel, sheet.cells, editing]);

  function commit(r: number, c: number, value: string) {
    setSheet(s => {
      const key = `${r}-${c}`;
      const cells = { ...s.cells };
      const trimmed = value.trim();
      if (trimmed === '') {
        delete cells[key];
      } else if (trimmed.startsWith('=')) {
        cells[key] = { raw: trimmed, formula: trimmed, value: undefined };
      } else {
        const n = parseFloat(trimmed.replace(/,/g, ''));
        const isNumber = !isNaN(n) && /^-?\d+\.?\d*([eE][+-]?\d+)?%?$/.test(trimmed.replace(/,/g, ''));
        cells[key] = { raw: trimmed, value: isNumber ? n : trimmed };
      }
      return { ...s, cells: recomputeAll(cells, { rows: s.rows, cols: s.cols, customFns: p.customFns, customVars: p.customVars }) };
    });
  }

  function startEdit(r: number, c: number, initial?: string) {
    const cell = sheet.cells[`${r}-${c}`];
    const v = initial !== undefined ? initial : (cell?.formula ?? cell?.raw ?? '');
    setEditing({ r, c, value: v });
    setFormulaBar(v);
    setTimeout(() => editInputRef.current?.focus(), 0);
  }

  function cancelEdit() { setEditing(null); }
  function commitAndClose(advance?: { dr: number; dc: number }) {
    if (!editing) return;
    commit(editing.r, editing.c, editing.value);
    setEditing(null);
    if (advance) {
      const nr = Math.max(0, Math.min(sheet.rows - 1, sel.r + advance.dr));
      const nc = Math.max(0, Math.min(sheet.cols - 1, sel.c + advance.dc));
      setSel({ r: nr, c: nc });
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (editing) return;
    const { r, c } = sel;
    if (e.key === 'ArrowUp') { e.preventDefault(); setSel({ r: Math.max(0, r-1), c }); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel({ r: Math.min(sheet.rows-1, r+1), c }); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); setSel({ r, c: Math.max(0, c-1) }); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setSel({ r, c: Math.min(sheet.cols-1, c+1) }); }
    else if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); startEdit(r, c); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); commit(r, c, ''); }
    else if (e.key === 'Tab') { e.preventDefault(); setSel({ r, c: e.shiftKey ? Math.max(0,c-1) : Math.min(sheet.cols-1, c+1) }); }
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      startEdit(r, c, e.key);
    }
  }

  // Function suggestions while editing
  const suggestions = useMemo(() => {
    if (!editing) return [];
    const v = editing.value;
    const m = v.match(/([A-Z][A-Z0-9_]*)$/i);
    if (!m) return [];
    const q = m[1].toUpperCase();
    if (q.length < 1) return [];
    return FUNCTION_LIST.filter(f => f.startsWith(q)).slice(0, 8);
  }, [editing]);
  const [suggIdx, setSuggIdx] = useState(0);
  useEffect(() => { setSuggIdx(0); }, [suggestions.length]);

  function applySuggestion(s: string) {
    if (!editing) return;
    const v = editing.value.replace(/([A-Z][A-Z0-9_]*)$/i, s + '(');
    setEditing({ ...editing, value: v });
    editInputRef.current?.focus();
  }

  // Add/remove rows/cols
  function addRows(n = 5) { setSheet(s => ({ ...s, rows: s.rows + n })); }
  function addCols(n = 3) { setSheet(s => ({ ...s, cols: s.cols + n })); }
  function clearAll() {
    if (!confirm('Clear all cells in this sheet?')) return;
    setSheet({ rows: 30, cols: 12, cells: {} });
  }

  // Live preview of formula bar input
  const formulaPreview = useMemo(() => {
    if (!formulaBar.startsWith('=')) return '';
    try {
      const v = evaluateFormula(formulaBar.substring(1), { rows: sheet.rows, cols: sheet.cols, cells: sheet.cells, customFns: p.customFns, customVars: p.customVars });
      return ' → ' + formatResult(v);
    } catch { return ' → #ERR!'; }
  }, [formulaBar, sheet, p.customFns, p.customVars]);

  function onCSVImport(file: File) {
    const reader = new FileReader();
    reader.onload = e => {
      const txt = String(e.target?.result || '');
      const imp = importCSV(txt);
      const cells = recomputeAll(imp.cells, { rows: imp.rows, cols: imp.cols, customFns: p.customFns, customVars: p.customVars });
      setSheet({ rows: imp.rows, cols: imp.cols, cells });
      p.push(`Imported ${file.name}`, 'success');
    };
    reader.readAsText(file);
  }

  return (
    <div className="datalab" tabIndex={0} onKeyDown={handleKey} ref={sheetRef as any}>
      <div className="datalab-toolbar">
        <strong style={{ fontSize: 13, color: 'var(--accent)' }}>Data Lab</strong>
        <button className="ghost-btn" onClick={() => addRows(5)}>+5 rows</button>
        <button className="ghost-btn" onClick={() => addCols(3)}>+3 cols</button>
        <button className="ghost-btn" onClick={() => exportCSV(sheet.cells, sheet.rows, sheet.cols)}>↓ CSV</button>
        <button className="ghost-btn" onClick={() => exportXLS(sheet.cells, sheet.rows, sheet.cols)}>↓ Excel</button>
        <button className="ghost-btn" onClick={() => fileRef.current?.click()}>↑ Import CSV</button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onCSVImport(f); e.target.value=''; }} />
        <button className="ghost-btn" onClick={() => setShowChart(s => !s)}>{showChart ? 'Hide chart' : 'Show chart'}</button>
        <button className="ghost-btn" onClick={clearAll} style={{ color: 'var(--danger)' }}>Clear</button>
        <span style={{ marginLeft: 'auto', color: 'var(--text-faint)', fontSize: 11 }}>
          {Object.keys(sheet.cells).length} cells used · {sheet.rows}×{sheet.cols}
        </span>
      </div>

      <div className="formula-bar">
        <div className="cell-name">{cellRef(sel.r, sel.c)}</div>
        <input
          value={formulaBar}
          onChange={e => {
            setFormulaBar(e.target.value);
            if (editing) setEditing({ ...editing, value: e.target.value });
          }}
          onFocus={() => { if (!editing) startEdit(sel.r, sel.c); }}
          onKeyDown={e => {
            if (e.key === 'Enter') { commit(sel.r, sel.c, formulaBar); setEditing(null); }
            else if (e.key === 'Escape') { setEditing(null); setFormulaBar(sheet.cells[`${sel.r}-${sel.c}`]?.formula ?? sheet.cells[`${sel.r}-${sel.c}`]?.raw ?? ''); }
          }}
          placeholder="Type a value or =FORMULA() with nested functions"
        />
        {formulaPreview && <span style={{ fontSize: 11, color: 'var(--accent-2)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>{formulaPreview}</span>}
      </div>

      <div className="sheet-scroll">
        <table className="sheet">
          <thead>
            <tr>
              <th className="row-h"></th>
              {Array.from({ length: sheet.cols }).map((_, c) => (
                <th key={c}>{cellRef(0, c).replace(/\d+/, '')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: sheet.rows }).map((_, r) => (
              <tr key={r}>
                <td className="row-h">{r + 1}</td>
                {Array.from({ length: sheet.cols }).map((_, c) => {
                  const cell = sheet.cells[`${r}-${c}`];
                  const isSel = sel.r === r && sel.c === c;
                  const isEditing = editing && editing.r === r && editing.c === c;
                  const display = cell?.value ?? cell?.raw ?? '';
                  const errStr = typeof display === 'string' && display.startsWith('#');
                  const isFormula = !!cell?.formula;
                  const isNum = typeof display === 'number';
                  return (
                    <td
                      key={c}
                      className={`cell ${isSel ? 'selected' : ''} ${isEditing ? 'editing' : ''} ${errStr ? 'error' : ''} ${isFormula && !errStr ? 'formula' : ''} ${isNum ? 'numeric' : ''}`}
                      onClick={() => { if (!editing) setSel({ r, c }); }}
                      onDoubleClick={() => startEdit(r, c)}
                    >
                      {isEditing ? (
                        <>
                          <input
                            ref={editInputRef}
                            className="edit"
                            value={editing!.value}
                            onChange={e => { setEditing({ ...editing!, value: e.target.value }); setFormulaBar(e.target.value); }}
                            onKeyDown={e => {
                              if (suggestions.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                                e.preventDefault();
                                setSuggIdx(i => (i + (e.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length);
                                return;
                              }
                              if (e.key === 'Enter') { e.preventDefault(); if (suggestions.length) { applySuggestion(suggestions[suggIdx]); return; } commitAndClose({ dr: e.shiftKey ? -1 : 1, dc: 0 }); }
                              else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                              else if (e.key === 'Tab') { e.preventDefault(); commitAndClose({ dr: 0, dc: e.shiftKey ? -1 : 1 }); }
                            }}
                            onBlur={() => { if (editing) commitAndClose(); }}
                          />
                          {suggestions.length > 0 && (
                            <div className="func-suggest" style={{ left: 0, top: '100%' }}>
                              {suggestions.map((s, i) => (
                                <div
                                  key={s}
                                  className={`item ${i === suggIdx ? 'active' : ''}`}
                                  onMouseDown={e => { e.preventDefault(); applySuggestion(s); }}
                                >
                                  <strong>{s}</strong>
                                  <span className="desc">{FUNC_DOCS[s] || ''}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="display" title={cell?.formula || ''}>
                          {String(display)}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showChart && (
        <DataLabChart
          cells={sheet.cells}
          rows={sheet.rows} cols={sheet.cols}
          type={chartType} setType={setChartType}
          labelRange={labelRange} setLabelRange={setLabelRange}
          dataRange={dataRange} setDataRange={setDataRange}
          title={chartTitle} setTitle={setChartTitle}
        />
      )}
    </div>
  );
}
