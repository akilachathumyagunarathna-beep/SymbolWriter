import { Dispatch, SetStateAction } from 'react';

interface Props {
  theme: string;
  setTheme: Dispatch<SetStateAction<string>>;
  onFind: () => void;
  onExportMenu: () => void;
  onCopyForWord: () => void;
  view: 'editor' | 'datalab';
  setView: Dispatch<SetStateAction<'editor' | 'datalab'>>;
  onTogglePanel: (which: 'left' | 'right') => void;
}

export default function Header(p: Props) {
  return (
    <header className="header">
      <div className="brand">
        <div className="brand-logo">∑</div>
        <div>
          <div className="brand-title">SymbolWriter</div>
          <div className="brand-sub">Editor · Calculator · Data Lab</div>
        </div>
      </div>

      <div className="header-actions">
        <button className="ghost-btn" onClick={() => p.onTogglePanel('left')} title="Symbols panel">
          <span style={{ fontSize: 16 }}>∑</span> Symbols
        </button>
        <button className="ghost-btn" onClick={() => p.onTogglePanel('right')} title="Tools panel">
          🧮 Tools
        </button>
        <button className="ghost-btn" onClick={p.onFind}>🔍 Find</button>
        <button className="ghost-btn" onClick={p.onCopyForWord}>📋 Copy for Word</button>
        <button className="ghost-btn" onClick={p.onExportMenu}>📥 Export</button>
        <select
          className="theme-select"
          value={p.theme}
          onChange={e => p.setTheme(e.target.value)}
          title="Theme"
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="paper">Paper</option>
          <option value="hicontrast">High Contrast</option>
        </select>
      </div>
    </header>
  );
}
