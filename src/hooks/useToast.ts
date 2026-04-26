import { useState, useCallback } from 'react';

export interface ToastItem {
  id: number;
  message: string;
  kind?: 'info' | 'success' | 'danger';
  ttl?: number;
}

let nextId = 1;

export function useToast() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((message: string, kind: ToastItem['kind'] = 'info', ttl = 2400) => {
    const id = nextId++;
    setItems(arr => [...arr, { id, message, kind, ttl }]);
    setTimeout(() => setItems(arr => arr.filter(t => t.id !== id)), ttl);
  }, []);
  return { items, push };
}
