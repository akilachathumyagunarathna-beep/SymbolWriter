// ── CUSTOM SYMBOLS (localStorage) ──
const CUSTOM_KEY = 'symbolwriter_custom_v1';

function loadCustoms(){
  try{
    const raw=localStorage.getItem(CUSTOM_KEY);
    return raw?JSON.parse(raw):{};
  }catch{return {};}
}

function saveCustoms(obj){
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(obj));
}

function mergeCustoms(){
  const customs=loadCustoms();
  // Merge into global SM, CATS, NAMES
  Object.entries(customs).forEach(([k,v])=>{
    SM[k]=v.sym;
    NAMES[k]=v.name||'';
  });
  // Add Custom category
  const keys=Object.keys(customs);
  if(keys.length){
    CATS['Custom']=keys;
  } else {
    delete CATS['Custom'];
  }
}

function validateCustomKey(){
  const k=document.getElementById('cKey').value.trim();
  const err=document.getElementById('cKeyErr');
  if(!k){err.textContent='';return false;}
  if(!k.startsWith('/')){err.textContent='Must start with /';return false;}
  if(k.length<2){err.textContent='Too short';return false;}
  if(k.includes(' ')){err.textContent='No spaces';return false;}
  if(SM_BUILTIN[k]){err.textContent='Built-in key (use different name)';return false;}
  err.textContent='';
  return true;
}

function addCustom(){
  const k=document.getElementById('cKey').value.trim();
  const s=document.getElementById('cSym').value.trim();
  const n=document.getElementById('cName').value.trim();
  if(!validateCustomKey()){toast('Fix shortcut key first','error');return;}
  if(!s){toast('Enter a symbol or text','error');return;}
  const customs=loadCustoms();
  customs[k]={sym:s,name:n};
  saveCustoms(customs);
  mergeCustoms();
  document.getElementById('cKey').value='';
  document.getElementById('cSym').value='';
  document.getElementById('cName').value='';
  document.getElementById('cKeyErr').textContent='';
  rebuildCustomGrid();
  rebuildPanel();
  toast('Custom shortcut added: '+k+' → '+s,'success');
}

function deleteCustom(k){
  if(!confirm('Delete shortcut "'+k+'"?'))return;
  const customs=loadCustoms();
  delete customs[k];
  saveCustoms(customs);
  delete SM[k];
  delete NAMES[k];
  mergeCustoms();
  rebuildCustomGrid();
  rebuildPanel();
  toast('Deleted '+k);
}

function exportCustom(){
  const customs=loadCustoms();
  if(!Object.keys(customs).length){toast('No custom symbols to export');return;}
  const blob=new Blob([JSON.stringify(customs,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='symbolwriter_customs.json';
  a.click();
  toast('Exported!','success');
}

function importCustom(){
  document.getElementById('importFile').click();
}

function handleImport(e){
  const file=e.target.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{
    try{
      const data=JSON.parse(ev.target.result);
      const customs=loadCustoms();
      let count=0;
      Object.entries(data).forEach(([k,v])=>{
        if(k.startsWith('/')&&v.sym){
          customs[k]=v;
          count++;
        }
      });
      saveCustoms(customs);
      mergeCustoms();
      rebuildCustomGrid();
      rebuildPanel();
      toast('Imported '+count+' symbols','success');
    }catch{
      toast('Invalid JSON file','error');
    }
  };
  reader.readAsText(file);
  e.target.value='';
}

function rebuildCustomGrid(){
  const g=document.getElementById('cgrid');
  g.innerHTML='';
  const customs=loadCustoms();
  const keys=Object.keys(customs);
  if(!keys.length){
    g.innerHTML='<div style="padding:20px;color:var(--muted);font-size:12px;font-family:\'JetBrains Mono\',monospace;grid-column:1/-1">No custom symbols yet. Add one above!</div>';
    return;
  }
  const h=document.createElement('div');h.className='pi-hdr';
  h.innerHTML='<span>My Shortcuts ('+keys.length+')</span>';
  g.appendChild(h);
  keys.forEach(k=>{
    const v=customs[k];
    const d=document.createElement('div');d.className='pi';
    d.innerHTML=`
      <span class="pi-code">${k}</span>
      <span class="pi-sym">${v.sym}</span>
      <span class="pi-name">${v.name||''} <span class="pi-custom-badge">custom</span></span>
      <button class="pi-del" onclick="event.stopPropagation();deleteCustom('${k.replace(/'/g,"\\'")}')">✕</button>`;
    d.onclick=()=>insertSym(v.sym);
    g.appendChild(d);
  });
}

// Init
mergeCustoms();
