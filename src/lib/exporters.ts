import type { CellData } from './formulaEngine';
import { cellRef } from './formulaEngine';

function download(filename: string, content: string | Blob, mime = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
}

export function exportText(text: string, filename = 'document.txt') {
  download(filename, text, 'text/plain;charset=utf-8');
}

export function exportHTML(html: string, filename = 'document.html') {
  const full = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${filename}</title></head><body>${html}</body></html>`;
  download(filename, full, 'text/html;charset=utf-8');
}

// Word .doc via HTML wrapper that Word can open
export function exportDoc(html: string, filename = 'document.doc') {
  const full = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>Export</title></head>
<body>${html}</body></html>`;
  download(filename, full, 'application/msword');
}

// Copy rich HTML to clipboard for pasting into Word
export async function copyHtmlForWord(html: string): Promise<boolean> {
  try {
    const blob = new Blob([html], { type: 'text/html' });
    const text = new Blob([stripHtml(html)], { type: 'text/plain' });
    if (navigator.clipboard && (window as any).ClipboardItem) {
      await navigator.clipboard.write([
        new (window as any).ClipboardItem({ 'text/html': blob, 'text/plain': text }),
      ]);
      return true;
    }
    // fallback
    await navigator.clipboard.writeText(stripHtml(html));
    return true;
  } catch {
    return false;
  }
}
function stripHtml(html: string): string {
  const t = document.createElement('div'); t.innerHTML = html; return t.innerText;
}

// Export cells to CSV
export function exportCSV(cells: Record<string, CellData>, rows: number, cols: number, filename = 'data.csv') {
  const rowsArr: string[] = [];
  for (let r = 0; r < rows; r++) {
    const row: string[] = [];
    for (let c = 0; c < cols; c++) {
      const cell = cells[`${r}-${c}`];
      let val: any = cell?.value ?? cell?.raw ?? '';
      if (val === undefined || val === null) val = '';
      const s = String(val);
      if (/[",\n\r]/.test(s)) row.push('"' + s.replace(/"/g, '""') + '"');
      else row.push(s);
    }
    rowsArr.push(row.join(','));
  }
  download(filename, rowsArr.join('\r\n'), 'text/csv;charset=utf-8');
}

// Export cells to "Excel-compatible" .xls XML SpreadsheetML format
export function exportXLS(cells: Record<string, CellData>, rows: number, cols: number, filename = 'data.xls') {
  const escape = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  let body = '';
  for (let r = 0; r < rows; r++) {
    body += '<Row>';
    for (let c = 0; c < cols; c++) {
      const cell = cells[`${r}-${c}`];
      let val: any = cell?.value ?? cell?.raw ?? '';
      const isNum = typeof val === 'number' || (val !== '' && !isNaN(parseFloat(val)) && isFinite(val));
      const type = isNum ? 'Number' : 'String';
      const display = String(val);
      body += `<Cell><Data ss:Type="${type}">${escape(display)}</Data></Cell>`;
    }
    body += '</Row>';
  }
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
<Worksheet ss:Name="Data Lab"><Table>${body}</Table></Worksheet></Workbook>`;
  download(filename, xml, 'application/vnd.ms-excel');
}

export function importCSV(text: string): { rows: number; cols: number; cells: Record<string, CellData> } {
  const cells: Record<string, CellData> = {};
  // Simple CSV parser handling quoted commas
  const rows: string[][] = [];
  let curRow: string[] = []; let cur = ''; let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"' && text[i+1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuote = false;
      else cur += ch;
    } else {
      if (ch === '"') inQuote = true;
      else if (ch === ',') { curRow.push(cur); cur = ''; }
      else if (ch === '\r') { /* skip */ }
      else if (ch === '\n') { curRow.push(cur); rows.push(curRow); curRow = []; cur = ''; }
      else cur += ch;
    }
  }
  if (cur || curRow.length) { curRow.push(cur); rows.push(curRow); }
  const numRows = rows.length;
  const numCols = Math.max(0, ...rows.map(r => r.length));
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const v = rows[r][c];
      if (v === '' || v === undefined) continue;
      const formula = v.startsWith('=') ? v : undefined;
      cells[`${r}-${c}`] = { raw: v, formula, value: formula ? undefined : v };
    }
  }
  return { rows: Math.max(numRows, 20), cols: Math.max(numCols, 8), cells };
}

export { cellRef };
