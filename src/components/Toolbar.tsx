import { useRef } from 'react';

interface Props {
  onCommand: (cmd: string, val?: string) => void;
  onColor: (val: string) => void;
  onHighlight: (val: string) => void;
  onFontSize: (val: string) => void;
  onFontFamily: (val: string) => void;
  onClearFormat: () => void;
}

const SIZES = ['12','14','16','18','20','24','28','32','40','48'];
const FONTS = ['Inter','Times New Roman','Georgia','Arial','Courier New','JetBrains Mono','Comic Sans MS','Verdana'];

export default function Toolbar(p: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="toolbar">
      <div className="group">
        <button className="tb" title="Undo (Ctrl+Z)" onClick={() => p.onCommand('undo')}>↶</button>
        <button className="tb" title="Redo (Ctrl+Y)" onClick={() => p.onCommand('redo')}>↷</button>
      </div>

      <div className="group">
        <select className="tb tb-wide" onChange={e => p.onFontFamily(e.target.value)} defaultValue="Inter" title="Font">
          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select className="tb tb-wide" onChange={e => p.onFontSize(e.target.value)} defaultValue="16" title="Size">
          {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="group">
        <button className="tb" title="Bold (Ctrl+B)" onClick={() => p.onCommand('bold')}><b>B</b></button>
        <button className="tb" title="Italic (Ctrl+I)" onClick={() => p.onCommand('italic')}><i>I</i></button>
        <button className="tb" title="Underline (Ctrl+U)" onClick={() => p.onCommand('underline')}><u>U</u></button>
        <button className="tb" title="Strikethrough" onClick={() => p.onCommand('strikeThrough')}><s>S</s></button>
        <button className="tb" title="Superscript" onClick={() => p.onCommand('superscript')}>x²</button>
        <button className="tb" title="Subscript" onClick={() => p.onCommand('subscript')}>x₂</button>
      </div>

      <div className="group">
        <label className="tb" title="Text color">
          A<input type="color" onChange={e => p.onColor(e.target.value)} />
        </label>
        <label className="tb" title="Highlight">
          🖍<input type="color" onChange={e => p.onHighlight(e.target.value)} />
        </label>
        <button className="tb" title="Clear format" onClick={p.onClearFormat}>🚫</button>
      </div>

      <div className="group">
        <button className="tb" title="Align left" onClick={() => p.onCommand('justifyLeft')}>⬅</button>
        <button className="tb" title="Center" onClick={() => p.onCommand('justifyCenter')}>↔</button>
        <button className="tb" title="Right" onClick={() => p.onCommand('justifyRight')}>➡</button>
        <button className="tb" title="Justify" onClick={() => p.onCommand('justifyFull')}>≡</button>
      </div>

      <div className="group">
        <button className="tb" title="Bullet list" onClick={() => p.onCommand('insertUnorderedList')}>•</button>
        <button className="tb" title="Numbered list" onClick={() => p.onCommand('insertOrderedList')}>1.</button>
        <button className="tb" title="Indent" onClick={() => p.onCommand('indent')}>→|</button>
        <button className="tb" title="Outdent" onClick={() => p.onCommand('outdent')}>|←</button>
      </div>

      <div className="group">
        <button className="tb" title="H1" onClick={() => p.onCommand('formatBlock','h1')}>H1</button>
        <button className="tb" title="H2" onClick={() => p.onCommand('formatBlock','h2')}>H2</button>
        <button className="tb" title="H3" onClick={() => p.onCommand('formatBlock','h3')}>H3</button>
        <button className="tb" title="Quote" onClick={() => p.onCommand('formatBlock','blockquote')}>❝</button>
        <button className="tb" title="Code block" onClick={() => p.onCommand('formatBlock','pre')}>{'< >'}</button>
        <button className="tb" title="Paragraph" onClick={() => p.onCommand('formatBlock','p')}>¶</button>
      </div>

      <div className="group">
        <button className="tb" title="Insert link" onClick={() => {
          const url = prompt('Enter URL:'); if (url) p.onCommand('createLink', url);
        }}>🔗</button>
        <button className="tb" title="Horizontal rule" onClick={() => p.onCommand('insertHorizontalRule')}>―</button>
        <button className="tb" title="Insert image" onClick={() => fileRef.current?.click()}>🖼</button>
        <input
          type="file" accept="image/*" ref={fileRef} hidden
          onChange={e => {
            const file = e.target.files?.[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => { p.onCommand('insertImage', String(ev.target?.result || '')); };
            reader.readAsDataURL(file);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
