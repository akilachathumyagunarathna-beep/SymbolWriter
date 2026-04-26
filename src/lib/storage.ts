export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const KEYS = {
  customSymbols: 'sw_custom_symbols_v3',
  customFunctions: 'sw_custom_functions_v3',
  theme: 'sw_theme_v3',
  editorContent: 'sw_editor_v3',
  dataLab: 'sw_datalab_v3',
};
