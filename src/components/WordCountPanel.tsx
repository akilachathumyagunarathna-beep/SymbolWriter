interface Props {
  text: string;
}
export default function WordCountPanel({ text }: Props) {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const chars = text.length;
  const charsNoSpace = text.replace(/\s/g, '').length;
  const sentences = (trimmed.match(/[.!?]+\s|[.!?]+$/g) || []).length || (trimmed ? 1 : 0);
  const paragraphs = trimmed ? trimmed.split(/\n+/).filter(Boolean).length : 0;
  const readMin = Math.max(1, Math.ceil(words / 200));
  const longestWord = trimmed ? trimmed.split(/\s+/).reduce((a, b) => a.length >= b.length ? a : b, '') : '';
  const avgWordLen = words ? (charsNoSpace / words).toFixed(1) : '0';

  const stats = [
    { num: words, label: 'Words' },
    { num: chars, label: 'Characters' },
    { num: charsNoSpace, label: 'No spaces' },
    { num: sentences, label: 'Sentences' },
    { num: paragraphs, label: 'Paragraphs' },
    { num: readMin, label: 'Read min' },
    { num: avgWordLen, label: 'Avg word' },
    { num: longestWord.length, label: 'Longest' },
  ];
  return (
    <div className="wc-panel">
      {stats.map(s => (
        <div className="wc-stat" key={s.label}>
          <div className="num">{s.num}</div>
          <div className="label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
