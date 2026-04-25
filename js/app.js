// ── APP INIT ──
let dark = true;

function toggleTheme(){
  dark=!dark;
  document.body.classList.toggle('light',!dark);
  document.getElementById('themeBtn').textContent=dark?'☀ Light':'🌙 Dark';
}

// ── PANEL MANAGEMENT ──
const panelIds = ['shortcuts','custom','wc','calc'];

function togglePanel(name){
  const target = document.getElementById('panel-'+name);
  const wasOpen = target.classList.contains('open');
  // Close all panels
  panelIds.forEach(id=>{
    document.getElementById('panel-'+id)?.classList.remove('open');
  });
  // Open target if it was closed
  if(!wasOpen) target.classList.add('open');
}

// ── SHORTCUTS PANEL ──
function buildPanel(){
  const g=document.getElementById('pgrid');
  g.innerHTML='';
  for(const[cat,keys]of Object.entries(CATS_BUILTIN)){
    const h=document.createElement('div');h.className='pi-hdr';h.textContent=cat;g.appendChild(h);
    keys.forEach(k=>{
      if(!SM[k])return;
      const d=document.createElement('div');d.className='pi';
      d.innerHTML=`<span class="pi-code">${k}</span><span class="pi-sym">${SM[k]}</span><span class="pi-name">${NAMES[k]||''}</span>`;
      d.onclick=()=>insertSym(SM[k]);
      g.appendChild(d);
    });
  }
}

function rebuildPanel(){
  buildPanel();
}

function filterPanel(q){
  const items=document.querySelectorAll('#pgrid .pi');
  const hdrs=document.querySelectorAll('#pgrid .pi-hdr');
  const v=q.toLowerCase();
  items.forEach(d=>{
    const code=d.querySelector('.pi-code')?.textContent||'';
    const name=d.querySelector('.pi-name')?.textContent||'';
    const sym=d.querySelector('.pi-sym')?.textContent||'';
    d.style.display=(!v||code.includes(v)||name.includes(v)||sym.includes(v))?'':'none';
  });
  hdrs.forEach(h=>{
    let sib=h.nextElementSibling;
    let anyVisible=false;
    while(sib&&!sib.classList.contains('pi-hdr')){
      if(sib.style.display!=='none')anyVisible=true;
      sib=sib.nextElementSibling;
    }
    h.style.display=anyVisible?'':'none';
  });
}

// ── INIT ──
buildPanel();
rebuildCustomGrid();
initCalculator();
updateStats();
ed.focus();

// Keyboard shortcut hint tooltip
document.addEventListener('keydown',e=>{
  if(e.ctrlKey&&e.key==='/')openFindReplace();
});
