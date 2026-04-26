import type { ToastItem } from '../hooks/useToast';

export default function Toast({ items }: { items: ToastItem[] }) {
  return (
    <div className="toast-stack">
      {items.map(t => (
        <div key={t.id} className={`toast ${t.kind || ''}`}>{t.message}</div>
      ))}
    </div>
  );
}
