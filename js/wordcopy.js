// ── COPY FOR WORD (Rich Text / HTML clipboard) ──
// This copies formatted HTML that Word, Google Docs, LibreOffice can paste with formatting preserved

async function copyForWord(){
  const html = ed.innerHTML;
  if(!html.trim()){toast('Nothing to copy','error');return;}

  // Build a clean Word-compatible HTML blob
  const wordHtml = buildWordHTML(html);

  try{
    // Modern Clipboard API with HTML support
    const htmlBlob = new Blob([wordHtml], {type:'text/html'});
    const textBlob = new Blob([ed.innerText], {type:'text/plain'});
    await navigator.clipboard.write([
      new ClipboardItem({'text/html': htmlBlob, 'text/plain': textBlob})
    ]);
    toast('✓ Copied! Paste into Word/Docs with Ctrl+V','success');
  } catch(err){
    // Fallback: use execCommand on a styled div
    fallbackCopyHTML(wordHtml);
  }
}

function buildWordHTML(innerHtml){
  // Embed inline styles for max compatibility with Word/Docs
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body{font-family:Calibri,Arial,sans-serif;font-size:12pt;line-height:1.6;color:#000}
  h1{font-size:20pt;font-weight:bold;margin:12pt 0 6pt}
  h2{font-size:16pt;font-weight:bold;margin:10pt 0 4pt}
  h3{font-size:13pt;font-weight:bold;margin:8pt 0 4pt}
  blockquote{border-left:3pt solid #7c3aed;margin:8pt 0;padding:4pt 12pt;color:#555;font-style:italic}
  code,pre{font-family:Consolas,"Courier New",monospace;background:#f5f5f5;padding:2pt 6pt;border:1pt solid #ddd}
  pre{display:block;padding:10pt;margin:8pt 0}
  table{border-collapse:collapse;width:100%;margin:8pt 0}
  td,th{border:1pt solid #ccc;padding:6pt 10pt}
  th{background:#f0f0f0;font-weight:bold}
  hr{border:none;border-top:1pt solid #ccc;margin:12pt 0}
  ul,ol{margin:6pt 0;padding-left:20pt}
  li{margin:2pt 0}
</style>
</head>
<body>
${innerHtml}
</body>
</html>`;
}

function fallbackCopyHTML(html){
  // Create an off-screen div with the HTML, select it, and copy
  const div=document.createElement('div');
  div.style.cssText='position:fixed;top:-9999px;left:-9999px;background:white;color:black;font-family:Arial,sans-serif';
  div.innerHTML=html;
  document.body.appendChild(div);
  const sel=window.getSelection();
  const range=document.createRange();
  range.selectNodeContents(div);
  sel.removeAllRanges();
  sel.addRange(range);
  try{
    document.execCommand('copy');
    toast('✓ Copied for Word (paste with Ctrl+V)','success');
  }catch{
    toast('Copy failed — try selecting text manually','error');
  }
  sel.removeAllRanges();
  document.body.removeChild(div);
}

// ── PLAIN TEXT COPY ──
async function copyPlain(){
  const t=ed.innerText;
  if(!t.trim()){toast('Nothing to copy','error');return;}
  try{
    await navigator.clipboard.writeText(t);
    toast('Copied as plain text!');
  }catch{
    const ta=document.createElement('textarea');
    ta.value=t;document.body.appendChild(ta);ta.select();
    document.execCommand('copy');document.body.removeChild(ta);
    toast('Copied!');
  }
}

// ── EXPORT .DOC (HTML-based Word document) ──
function exportDocx(){
  const html = buildWordHTML(ed.innerHTML);
  const blob = new Blob([html], {type:'application/msword'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'symbolwriter.doc';
  a.click();
  toast('Exported as .doc — open in Word!','success');
}

// ── EXPORT .TXT ──
function exportTxt(){
  const t=ed.innerText;
  if(!t.trim()){toast('Nothing to export','error');return;}
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([t],{type:'text/plain;charset=utf-8'}));
  a.download='symbolwriter.txt';
  a.click();
  toast('Exported as .txt!');
}

// ── EXPORT HTML ──
function exportHTML(){
  const html = buildWordHTML(ed.innerHTML);
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([html],{type:'text/html'}));
  a.download='symbolwriter.html';
  a.click();
  toast('Exported as .html!');
}
