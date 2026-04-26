interface Stats {
  words: number;
  chars: number;
  charsNoSpace: number;
  sentences: number;
  paragraphs: number;
  readMin: number;
}
export default function StatusBar({ stats }: { stats: Stats }) {
  return (
    <div className="status-bar">
      <div className="stat"><strong>Words:</strong>{stats.words}</div>
      <div className="stat"><strong>Chars:</strong>{stats.chars}</div>
      <div className="stat"><strong>No space:</strong>{stats.charsNoSpace}</div>
      <div className="stat"><strong>Sentences:</strong>{stats.sentences}</div>
      <div className="stat"><strong>Paragraphs:</strong>{stats.paragraphs}</div>
      <div className="stat"><strong>Read:</strong>{stats.readMin} min</div>
    </div>
  );
}
