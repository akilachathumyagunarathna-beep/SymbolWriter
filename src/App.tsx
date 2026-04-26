import { useEffect, useMemo, useRef, useState } from 'react';
import Header from './components/Header';
import Toolbar from './components/Toolbar';
import Editor, { EditorHandle } from './components/Editor';
import StatusBar from './components/StatusBar';
import SymbolsPanel from './components/SymbolsPanel';
import Calculator from './components/Calculator';
import DataLab from './components/DataLab';
import WordCountPanel from './components/WordCountPanel';
import FindReplace from './components/FindReplace';
import Toast from './components/Toast';
import { useToast } from './hooks/useToast';
import { SM_BUILTIN } from './lib/symbols';
import { loadJSON, saveJSON, KEYS } from './lib/storage';
import { copyHtmlForWord, exportText, exportHTML, exportDoc } from './lib/exporters';

interface CustomFn { name: string; expr: string; args: string }
interface CustomVar { name: string; expr: string }

export default function App() {
  const editorRef = useRef<EditorHandle>(null);
  const toast = useToast();

  // ─── Theme
  const [theme, setTheme] = useState<string>(() => loadJSON(KEYS.theme, 'dark'));
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveJSON(KEYS.theme, theme);
  }, [theme]);

  // ─── Tab view (editor / data lab)
  const [view, setView] = useState<'editor' | 'datalab'>('editor');
  const [showFind, setShowFind] = useState(false);
  const [drawerLeft, setDrawerLeft] = useState(false);
  const [drawerRight, setDrawerRight] = useState(false);

  // ─── Editor content
  const [editorHTML, setEditorHTML] = useState<string>(() => loadJSON(KEYS.editorContent, ''));
  const [editorText, setEditorText] = useState('');
  useEffect(() => {
    const id = setTimeout(() => saveJSON(KEYS.editorContent, editorHTML), 500);
    return () => clearTimeout(id);
  }, [editorHTML]);

  // ─── Custom symbols
  const [customSymbols, setCustomSymbols] = useState<Record<string, string>>(() => loadJSON(KEYS.customSymbols, {}));
  useEffect(() => { saveJSON(KEYS.customSymbols, customSymbols); }, [customSymbols]);
  function addCustom(sc: string, sym: string) { setCustomSymbols(s => ({ ...s, [sc]: sym })); toast.push(`Added ${sc} → ${sym}`, 'success'); }
  function removeCustom(sc: string) { setCustomSymbols(s => { const n = { ...s }; delete n[sc]; return n; }); }

  const allSymbols = useMemo(() => ({ ...SM_BUILTIN, ...customSymbols }), [customSymbols]);

  // ─── Calculator state
  const [customFns, setCustomFns] = useState<CustomFn[]>(() => loadJSON(KEYS.customFunctions + '_fns', []));
  const [customVars, setCustomVars] = useState<CustomVar[]>(() => loadJSON(KEYS.customFunctions + '_vars', []));
  useEffect(() => { saveJSON(KEYS.customFunctions + '_fns', customFns); }, [customFns]);
  useEffect(() => { saveJSON(KEYS.customFunctions + '_vars', customVars); }, [customVars]);

  // Live scope from calculator → DataLab
  const [calcScope, setCalcScope] = useState<{ fns: Record<string, any>; vars: Record<string, any> }>({ fns: {}, vars: {} });

  // ─── Auto symbol expansion in editor
  useEffect(() => {
    function handler(e: Event) {
      const el = (e.target as HTMLElement);
      if (!el.matches('.editor')) return;
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType !== Node.TEXT_NODE) return;
      const text = node.nodeValue || '';
      const before = text.substring(0, range.startOffset);
      // Find longest matching shortcut at end (max len 12)
      for (let len = Math.min(12, before.length); len >= 2; len--) {
        const candidate = before.substring(before.length - len);
        if (candidate.startsWith('/') && allSymbols[candidate]) {
          const sym = allSymbols[candidate];
          // Replace
          const r = document.createRange();
          r.setStart(node, before.length - len);
          r.setEnd(node, range.startOffset);
          r.deleteContents();
          const tn = document.createTextNode(sym);
          r.insertNode(tn);
          // place caret after
          const newR = document.createRange();
          newR.setStartAfter(tn); newR.collapse(true);
          sel.removeAllRanges(); sel.addRange(newR);
          // trigger change
          editorRef.current?.el?.dispatchEvent(new Event('input', { bubbles: true }));
          return;
        }
      }
    }
    document.addEventListener('input', handler, true);
    return () => document.removeEventListener('input', handler, true);
  }, [allSymbols]);

  // ─── Editor commands
  function execCmd(cmd: string, val?: string) { editorRef.current?.exec(cmd, val); }
  function insertSymbol(sym: string) {
    if (view === 'editor') editorRef.current?.insertText(sym);
    else { /* in datalab? insert into focused cell - skip */ toast.push('Switch to Editor to insert symbols there'); }
  }

  // ─── Export menu
  function showExportMenu() {
    const choice = prompt(
      'Export as:\n  1) Word (.doc)\n  2) Plain text (.txt)\n  3) HTML (.html)\nEnter 1, 2 or 3:',
      '1'
    );
    if (!choice) return;
    const html = editorRef.current?.getHTML() || '';
    const text = editorRef.current?.getText() || '';
    if (choice === '1') { exportDoc(html); toast.push('Word document exported', 'success'); }
    else if (choice === '2') { exportText(text); toast.push('Text file exported', 'success'); }
    else if (choice === '3') { exportHTML(html); toast.push('HTML file exported', 'success'); }
  }

  async function copyForWord() {
    const html = editorRef.current?.getHTML() || '';
    const ok = await copyHtmlForWord(html);
    toast.push(ok ? 'Rich content copied — paste into Word' : 'Copy failed', ok ? 'success' : 'danger');
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); setShowFind(true); }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); showExportMenu(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Stats
  const stats = useMemo(() => {
    const t = editorText;
    const trimmed = t.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = t.length;
    const charsNoSpace = t.replace(/\s/g, '').length;
    const sentences = (trimmed.match(/[.!?]+\s|[.!?]+$/g) || []).length || (trimmed ? 1 : 0);
    const paragraphs = trimmed ? trimmed.split(/\n+/).filter(Boolean).length : 0;
    const readMin = Math.max(1, Math.ceil(words / 200));
    return { words, chars, charsNoSpace, sentences, paragraphs, readMin };
  }, [editorText]);

  return (
    <div className="app">
      <Header
        theme={theme} setTheme={setTheme}
        onFind={() => setShowFind(true)}
        onExportMenu={showExportMenu}
        onCopyForWord={copyForWord}
        view={view} setView={setView}
        onTogglePanel={(which) => { if (which === 'left') setDrawerLeft(s => !s); else setDrawerRight(s => !s); }}
      />

      <div className="app-main">
        {/* Left side: symbols */}
        <div className={`side-panel ${drawerLeft ? 'drawer-open' : ''}`}>
          <SymbolsPanel
            customSymbols={customSymbols}
            onInsert={insertSymbol}
            onAddCustom={addCustom}
            onRemoveCustom={removeCustom}
          />
        </div>

        {/* Center pane */}
        <div className="center-pane">
          <div className="editor-wrap">
            <div className="tabs">
              <button className={`tab ${view==='editor'?'active':''}`} onClick={() => setView('editor')}>📝 Editor</button>
              <button className={`tab ${view==='datalab'?'active':''}`} onClick={() => setView('datalab')}>📊 Data Lab</button>
            </div>

            {view === 'editor' ? (
              <>
                <Toolbar
                  onCommand={execCmd}
                  onColor={c => execCmd('foreColor', c)}
                  onHighlight={c => execCmd('hiliteColor', c)}
                  onFontSize={s => {
                    // execCommand fontSize uses 1-7, fallback approach: wrap in span
                    document.execCommand('fontSize', false, '7');
                    const el = editorRef.current?.el;
                    if (el) el.querySelectorAll('font[size="7"]').forEach(f => {
                      const span = document.createElement('span');
                      span.style.fontSize = s + 'px';
                      span.innerHTML = f.innerHTML;
                      f.replaceWith(span);
                    });
                  }}
                  onFontFamily={f => execCmd('fontName', f)}
                  onClearFormat={() => execCmd('removeFormat')}
                />
                <Editor
                  ref={editorRef}
                  initialHTML={editorHTML}
                  onChange={(html, text) => { setEditorHTML(html); setEditorText(text); }}
                />
                <StatusBar stats={stats} />
              </>
            ) : (
              <DataLab
                customFns={calcScope.fns}
                customVars={calcScope.vars}
                push={toast.push}
              />
            )}
          </div>

          {view === 'editor' && <WordCountPanel text={editorText} />}
        </div>

        {/* Right side: calculator */}
        <aside className={`side-panel ${drawerRight ? 'drawer-open' : ''}`}>
          <div className="panel-head">
            <span className="panel-title">Calculator + Graph</span>
          </div>
          <Calculator
            customFns={customFns}
            customVars={customVars}
            setCustomFns={setCustomFns}
            setCustomVars={setCustomVars}
            onScopeChange={setCalcScope}
          />
        </aside>
      </div>

      <FindReplace open={showFind} onClose={() => setShowFind(false)} editor={editorRef} />
      <Toast items={toast.items} />
    </div>
  );
}
