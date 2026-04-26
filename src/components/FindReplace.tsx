import { useEffect, useRef, useState } from 'react';
import { EditorHandle } from './Editor';

interface Props {
  open: boolean;
  onClose: () => void;
  editor: React.RefObject<EditorHandle>;
}

export default function FindReplace({ open, onClose, editor }: Props) {
  const [find, setFind] = useState('');
  const [repl, setRepl] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [whole, setWhole] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const findRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => findRef.current?.focus(), 50);
    if (!open) clearHighlights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function clearHighlights() {
    const el = editor.current?.el; if (!el) return;
    el.querySelectorAll('mark.find-hit, mark.find-active').forEach(m => {
      const text = document.createTextNode(m.textContent || '');
      m.replaceWith(text);
    });
    el.normalize();
  }

  function highlight() {
    clearHighlights();
    setMatchCount(0); setActiveIdx(0);
    const el = editor.current?.el; if (!el || !find) return;
    const flags = caseSensitive ? 'g' : 'gi';
    const escFind = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = whole ? `\\b${escFind}\\b` : escFind;
    let re: RegExp;
    try { re = new RegExp(pattern, flags); } catch { return; }
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const targets: Text[] = [];
    let n; while ((n = walker.nextNode())) targets.push(n as Text);
    let count = 0;
    for (const t of targets) {
      if (!t.nodeValue) continue;
      const m = t.nodeValue.match(re);
      if (!m) continue;
      const frag = document.createDocumentFragment();
      let last = 0;
      const text = t.nodeValue;
      re.lastIndex = 0;
      let mm;
      while ((mm = re.exec(text)) !== null) {
        if (mm.index > last) frag.appendChild(document.createTextNode(text.substring(last, mm.index)));
        const mark = document.createElement('mark');
        mark.className = 'find-hit';
        mark.textContent = mm[0];
        frag.appendChild(mark);
        last = mm.index + mm[0].length;
        count++;
        if (re.lastIndex === mm.index) re.lastIndex++;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.substring(last)));
      t.parentNode?.replaceChild(frag, t);
    }
    setMatchCount(count);
    if (count > 0) {
      const hits = el.querySelectorAll('mark.find-hit');
      hits[0]?.classList.add('find-active');
      hits[0]?.scrollIntoView({ block: 'center' });
      hits[0]?.classList.remove('find-hit');
      setActiveIdx(0);
    }
  }

  function step(dir: 1 | -1) {
    const el = editor.current?.el; if (!el) return;
    const all = Array.from(el.querySelectorAll('mark.find-hit, mark.find-active'));
    if (!all.length) return;
    const cur = el.querySelector('mark.find-active');
    cur?.classList.remove('find-active');
    cur?.classList.add('find-hit');
    let idx = activeIdx + dir;
    if (idx < 0) idx = all.length - 1;
    if (idx >= all.length) idx = 0;
    const target = all[idx];
    target.classList.remove('find-hit');
    target.classList.add('find-active');
    target.scrollIntoView({ block: 'center' });
    setActiveIdx(idx);
  }

  function replaceOne() {
    const el = editor.current?.el; if (!el) return;
    const cur = el.querySelector('mark.find-active');
    if (cur) {
      const txt = document.createTextNode(repl);
      cur.replaceWith(txt);
      highlight();
    } else if (find) {
      highlight();
      const f = el.querySelector('mark.find-active');
      if (f) {
        const txt = document.createTextNode(repl);
        f.replaceWith(txt);
        highlight();
      }
    }
  }
  function replaceAll() {
    const el = editor.current?.el; if (!el || !find) return;
    highlight();
    el.querySelectorAll('mark.find-hit, mark.find-active').forEach(m => {
      m.replaceWith(document.createTextNode(repl));
    });
    el.normalize();
    setMatchCount(0);
  }

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h3>Find & Replace</h3>
        <div className="field">
          <label>Find</label>
          <input ref={findRef} type="text" value={find} onChange={e => setFind(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') highlight(); }} />
        </div>
        <div className="field">
          <label>Replace</label>
          <input type="text" value={repl} onChange={e => setRepl(e.target.value)} />
        </div>
        <div className="opts">
          <label><input type="checkbox" checked={caseSensitive} onChange={e => setCaseSensitive(e.target.checked)} /> Case</label>
          <label><input type="checkbox" checked={whole} onChange={e => setWhole(e.target.checked)} /> Whole word</label>
          <span style={{ marginLeft: 'auto' }}>{matchCount > 0 ? `${activeIdx+1} of ${matchCount}` : '0 matches'}</span>
        </div>
        <div className="actions">
          <button className="ghost-btn" onClick={() => { clearHighlights(); onClose(); }}>Close</button>
          <button className="ghost-btn" onClick={highlight}>Find</button>
          <button className="ghost-btn" onClick={() => step(-1)}>‹ Prev</button>
          <button className="ghost-btn" onClick={() => step(1)}>Next ›</button>
          <button className="ghost-btn" onClick={replaceOne}>Replace</button>
          <button className="primary-btn" onClick={replaceAll}>Replace all</button>
        </div>
      </div>
    </div>
  );
}
