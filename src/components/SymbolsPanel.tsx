import { useMemo, useState } from 'react';
import { SM_BUILTIN, CATS_BUILTIN, NAMES_BUILTIN } from '../lib/symbols';

interface Props {
  customSymbols: Record<string, string>;
  onInsert: (sym: string) => void;
  onAddCustom: (shortcut: string, sym: string) => void;
  onRemoveCustom: (shortcut: string) => void;
}

export default function SymbolsPanel(p: Props) {
  const [search, setSearch] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [scIn, setScIn] = useState('');
  const [syIn, setSyIn] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase().trim();
    const matches: { sc: string; sym: string }[] = [];
    for (const [sc, sym] of Object.entries(SM_BUILTIN)) {
      if (sc.toLowerCase().includes(q) || sym.includes(q) || (NAMES_BUILTIN[sc] || '').toLowerCase().includes(q)) {
        matches.push({ sc, sym });
      }
    }
    for (const [sc, sym] of Object.entries(p.customSymbols)) {
      if (sc.toLowerCase().includes(q) || sym.includes(q)) matches.push({ sc, sym });
    }
    return matches;
  }, [search, p.customSymbols]);

  return (
    <aside className="side-panel">
      <div className="panel-head">
        <span className="panel-title">Symbols</span>
        <button className="ghost-btn" onClick={() => setShowCustom(s => !s)} style={{ padding: '4px 10px', fontSize: 12 }}>
          {showCustom ? 'Library' : '＋ Custom'}
        </button>
      </div>
      <div style={{ padding: '10px 10px 6px' }}>
        <input
          className="panel-search"
          placeholder="Search symbols, /commands, names…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {showCustom ? (
        <div className="panel-body">
          <div className="custom-form">
            <input placeholder="/short" value={scIn} onChange={e => setScIn(e.target.value)} />
            <input placeholder="symbol" value={syIn} onChange={e => setSyIn(e.target.value)} maxLength={8} />
            <button className="add-btn" onClick={() => {
              if (!scIn.trim() || !syIn.trim()) return;
              const sc = scIn.startsWith('/') ? scIn.trim() : '/' + scIn.trim();
              p.onAddCustom(sc, syIn);
              setScIn(''); setSyIn('');
            }}>Add</button>
          </div>
          <div className="cat">
            <div className="cat-name">Your Custom Symbols ({Object.keys(p.customSymbols).length})</div>
            <div className="sym-grid">
              {Object.entries(p.customSymbols).map(([sc, sym]) => (
                <button key={sc} className="sym-btn" title={sc} onClick={() => p.onInsert(sym)}>
                  {sym}
                  <span className="shortcut">{sc.replace('/','')}</span>
                  <button className="del-x" onClick={e => { e.stopPropagation(); p.onRemoveCustom(sc); }}>×</button>
                </button>
              ))}
              {Object.keys(p.customSymbols).length === 0 && (
                <div style={{ gridColumn: '1/-1', color: 'var(--text-faint)', fontSize: 12, padding: 12, textAlign: 'center' }}>
                  No custom symbols yet. Add one above!
                </div>
              )}
            </div>
          </div>
        </div>
      ) : filtered ? (
        <div className="panel-body">
          <div className="cat">
            <div className="cat-name">{filtered.length} matches</div>
            <div className="sym-grid">
              {filtered.map(m => (
                <button key={m.sc} className="sym-btn" title={`${m.sc}${NAMES_BUILTIN[m.sc] ? ' — '+NAMES_BUILTIN[m.sc] : ''}`} onClick={() => p.onInsert(m.sym)}>
                  {m.sym}
                  <span className="shortcut">{m.sc.replace('/','')}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="panel-body">
          {Object.entries(CATS_BUILTIN).map(([cat, list]) => (
            <div key={cat} className="cat">
              <div className="cat-name">{cat}</div>
              <div className="sym-grid">
                {list.map(sc => (
                  <button key={sc} className="sym-btn" title={`${sc}${NAMES_BUILTIN[sc] ? ' — '+NAMES_BUILTIN[sc] : ''}`} onClick={() => p.onInsert(SM_BUILTIN[sc])}>
                    {SM_BUILTIN[sc]}
                    <span className="shortcut">{sc.replace('/','')}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
