import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export interface EditorHandle {
  el: HTMLDivElement | null;
  focus: () => void;
  insertHTML: (html: string) => void;
  insertText: (text: string) => void;
  exec: (cmd: string, val?: string) => void;
  getHTML: () => string;
  setHTML: (html: string) => void;
  getText: () => string;
}

interface Props {
  initialHTML: string;
  onChange: (html: string, text: string) => void;
  onSelectionChange?: () => void;
}

const Editor = forwardRef<EditorHandle, Props>(function Editor(props, ref) {
  const elRef = useRef<HTMLDivElement>(null);
  const lastSelRef = useRef<Range | null>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (el.innerHTML !== props.initialHTML) el.innerHTML = props.initialHTML;
    // keep latest selection inside editor
    const onSel = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount && el.contains(sel.anchorNode)) {
        lastSelRef.current = sel.getRangeAt(0).cloneRange();
        props.onSelectionChange?.();
      }
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function restoreSelection() {
    const r = lastSelRef.current;
    if (!r) return false;
    const sel = window.getSelection();
    if (!sel) return false;
    sel.removeAllRanges();
    sel.addRange(r);
    return true;
  }

  useImperativeHandle(ref, () => ({
    get el() { return elRef.current; },
    focus() { elRef.current?.focus(); restoreSelection(); },
    insertHTML(html: string) {
      elRef.current?.focus();
      restoreSelection();
      document.execCommand('insertHTML', false, html);
      emitChange();
    },
    insertText(text: string) {
      elRef.current?.focus();
      restoreSelection();
      document.execCommand('insertText', false, text);
      emitChange();
    },
    exec(cmd: string, val?: string) {
      elRef.current?.focus();
      restoreSelection();
      document.execCommand(cmd, false, val);
      emitChange();
    },
    getHTML() { return elRef.current?.innerHTML || ''; },
    setHTML(html: string) { if (elRef.current) elRef.current.innerHTML = html; emitChange(); },
    getText() { return elRef.current?.innerText || ''; },
  }), []);

  function emitChange() {
    const el = elRef.current;
    if (!el) return;
    props.onChange(el.innerHTML, el.innerText);
  }

  function handleInput() {
    const el = elRef.current;
    if (!el) return;
    // Auto symbol expansion handled by parent via callback if needed
    emitChange();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Tab inserts spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '    ');
    }
  }

  return (
    <div
      ref={elRef}
      className="editor"
      contentEditable
      suppressContentEditableWarning
      data-placeholder="Start typing… try /alpha, /sum, /heart and more!"
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onBlur={emitChange}
      spellCheck
    />
  );
});

export default Editor;
