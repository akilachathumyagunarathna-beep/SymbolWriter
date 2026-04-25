// ============================================================
// CALCULATOR PANEL - WITH CUSTOM FUNCTIONS & GRAPHING
// ============================================================

const calcVars = {};
let calcRowCount = 0;
let calcChartInstance = null;

// ── CUSTOM FUNCTIONS STORAGE ──
let customFunctions = JSON.parse(localStorage.getItem('sym_custom_functions') || '[]');

function loadCustomFunctions() {
    customFunctions.forEach(fnStr => {
        try {
            math.evaluate(fnStr, calcVars);
        } catch (e) { console.error("Error loading function:", fnStr); }
    });
    renderFunctionList();
}

function saveCustomFunction(expr) {
    if (expr.includes('=') && expr.includes('(')) {
        const fnName = expr.split('(')[0].trim();
        // පරණ එකක් ඇත්නම් අයින් කර අලුත් එක දැමීම
        customFunctions = customFunctions.filter(f => !f.startsWith(fnName + '('));
        customFunctions.push(expr);
        localStorage.setItem('sym_custom_functions', JSON.stringify(customFunctions));
        renderFunctionList();
        if (typeof toast === 'function') toast(`Function '${fnName}' saved!`, 'success');
    }
}

function renderFunctionList() {
    const container = document.getElementById('calc-custom-list');
    if (!container) return;
    
    if (customFunctions.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = '<h4 style="font-size:11px; color:var(--accent); margin-bottom:8px; text-transform:uppercase; letter-spacing:1px; opacity:0.8;">Saved Logic</h4>';
    
    customFunctions.forEach((fn, index) => {
        // '=' ලකුණෙන් දෙපැත්ත වෙන් කරගන්නවා
        const parts = fn.split('=');
        const name = parts[0].trim();
        const logic = parts[1] ? parts[1].trim() : ''; // සූත්‍රය තිබෙන කොටස

        container.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--surf2); padding:8px 12px; margin-bottom:6px; border-radius:6px; border-left: 3px solid var(--accent);">
                <div style="display:flex; flex-direction:column; gap:2px;">
                    <span style="font-family:'JetBrains Mono', monospace; font-size:13px; color:var(--fg); font-weight:bold;">${name}</span>
                    <span style="font-family:'JetBrains Mono', monospace; font-size:10px; color:var(--muted); italic; opacity:0.9;">= ${logic}</span>
                </div>
                <button onclick="deleteCustomFn(${index})" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:18px; font-weight:bold; padding:0 5px; opacity:0.6;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.6" title="Delete">×</button>
            </div>`;
    });
}

function deleteCustomFn(index) {
    const fn = customFunctions[index];
    const name = fn.split('(')[0].trim();
    customFunctions.splice(index, 1);
    localStorage.setItem('sym_custom_functions', JSON.stringify(customFunctions));
    delete calcVars[name]; // Memory එකෙන් අයින් කිරීම
    renderFunctionList();
    if (typeof toast === 'function') toast('Function deleted', 'info');
}

// ── CORE CALCULATOR LOGIC ──

function initCalculator(){
  document.getElementById('calc-rows').innerHTML = '';
  calcRowCount = 0;
  calcAddRow('');
  calcAddRow('');
  calcAddRow('');
  loadCustomFunctions();
}

function calcAddRow(expr){
  const i = calcRowCount++;
  const div = document.createElement('div');
  div.className = 'calc-row';
  div.id = 'calc-row-'+i;
  div.innerHTML = `
    <div class="calc-rn">${i+1}</div>
    <div class="calc-cell">
      <input class="calc-inp" id="calc-inp-${i}"
        placeholder="e.g: x = 10,  2*x,  1m to km"
        value="${expr}" spellcheck="false" autocomplete="off">
    </div>
    <div class="calc-res def" id="calc-res-${i}">—</div>
    <button class="calc-insert" id="calc-ins-${i}" title="Insert into Editor" onclick="calcInsertResult(${i})">↩</button>
    <button class="calc-insert" title="Draw Graph" onclick="calcDrawGraph(${i})" style="color:var(--accent2)">📈</button>
    <button class="calc-del-btn" onclick="calcRemoveRow(${i})" title="Delete row">×</button>`; 
  document.getElementById('calc-rows').appendChild(div);

  const inp = document.getElementById('calc-inp-'+i);
  inp.addEventListener('input', ()=>{ calcEvalRow(i); });
  
  // Enter key support to focus next
  inp.addEventListener('keydown', (e) => {
      if(e.key === 'Enter') calcFocusNext(i);
      if(e.key === 'ArrowUp') calcFocusPrev(i);
      if(e.key === 'ArrowDown') calcFocusNext(i);
  });
}

function calcRemoveRow(i) {
    const row = document.getElementById('calc-row-' + i);
    if (row) row.remove();
}

function calcFocusNext(i){
  if(i+1 < calcRowCount) document.getElementById('calc-inp-'+(i+1))?.focus();
  else { calcAddRow(''); setTimeout(()=>document.getElementById('calc-inp-'+(calcRowCount-1))?.focus(),0); }
}

function calcFocusPrev(i){ 
  if(i>0) document.getElementById('calc-inp-'+(i-1))?.focus(); 
}

function calcClear(){
  if(!confirm('Clear all calculator rows?')) return;
  Object.keys(calcVars).forEach(k=>delete calcVars[k]);
  calcRowCount = 0;
  document.getElementById('calc-rows').innerHTML = '';
  document.getElementById('calc-badges').innerHTML = '';
  document.getElementById('calc-fx').textContent = '—';
  hideGraph();
  initCalculator();
}

// ── EVALUATION LOGIC ──

function calcEvalRow(i) {
  const inp = document.getElementById('calc-inp-' + i);
  const resEl = document.getElementById('calc-res-' + i);
  let val = inp.value.trim();

  if (!val) {
    resEl.textContent = '—';
    resEl.className = 'calc-res def';
    const ins = document.getElementById('calc-ins-' + i);
    if(ins) ins.style.display = 'none';
    return;
  }

  try {
    // 2x වැනි දේවල් 2*x ලෙස පරිවර්තනය
    let cleanVal = val.replace(/(\d)(x)/gi, '$1*$2');
    
    // Math.js හරහා ගණනය කිරීම
    let result = math.evaluate(cleanVal, calcVars);

    // Custom function එකක් සෑදුවේ නම් එය සේව් කිරීම (උදා: bmi(w,h) = w/h^2)
    if (val.includes('=') && typeof result === 'function') {
        saveCustomFunction(val);
        resEl.textContent = 'fn saved';
        resEl.className = 'calc-res ok';
        return;
    }

    // විචල්‍යයන් (Variables) සේව් කිරීම (උදා: x = 10)
    if (val.includes('=') && val.split('=')[0].trim()) {
      const varName = val.split('=')[0].trim();
      calcVars[varName] = result;
      calcRenderBadges(); 
    }

    // ප්‍රතිඵලය පෙන්වීම
    resEl.textContent = calcFmt(result);
    resEl.className = 'calc-res ok';
    
    const ins = document.getElementById('calc-ins-' + i);
    if(ins) {
        ins.dataset.val = calcFmt(result);
        ins.style.display = 'flex';
    }

  } catch (err) {
    resEl.textContent = 'Error';
    resEl.className = 'calc-res err';
    const ins = document.getElementById('calc-ins-' + i);
    if(ins) ins.style.display = 'none';
  }
}

function calcFmt(n){
  if(typeof n === 'function') return 'function';
  if(typeof n === 'undefined' || n === null) return '—';
  if(!Number.isFinite(n)) return String(n);
  if(Number.isInteger(n)) return n.toLocaleString();
  return parseFloat(n.toFixed(8)).toLocaleString(undefined,{maximumFractionDigits:6});
}

function calcRenderBadges(){
  const b = document.getElementById('calc-badges');
  if(!b) return;
  b.innerHTML = '';
  const entries = Object.entries(calcVars);
  if(!entries.length) return;
  entries.forEach(([k,v])=>{
    if(typeof v === 'function') return; // Badge වල functions පෙන්වන්නේ නැත
    const el = document.createElement('span');
    el.className = 'calc-badge';
    el.title = 'Click to insert into focused cell';
    el.innerHTML = `<b>${k}</b>=${calcFmt(v)}`;
    el.onclick = () => {
      const focused = document.activeElement;
      if(focused && focused.classList.contains('calc-inp')){
        const pos = focused.selectionStart;
        focused.value = focused.value.slice(0,pos) + k + focused.value.slice(focused.selectionEnd);
        focused.setSelectionRange(pos+k.length, pos+k.length);
        focused.dispatchEvent(new Event('input'));
      }
    };
    b.appendChild(el);
  });
}

function calcInsertResult(i){
  const ins = document.getElementById('calc-ins-'+i);
  if(!ins || !ins.dataset.val) return;
  if(typeof insertSym === 'function') {
      insertSym(ins.dataset.val);
      if(typeof toast === 'function') toast('Result inserted into editor','success');
  }
}

// ── GRAPHING FUNCTION (Chart.js) ──

function calcDrawGraph(i) {
    const inp = document.getElementById('calc-inp-'+i).value;
    let canvasWrap = document.getElementById('graphCanvasWrap');

    if(!canvasWrap) {
        canvasWrap = document.createElement('div');
        canvasWrap.id = 'graphCanvasWrap';
        canvasWrap.style = "width:100%; height:300px; padding:10px; background:var(--surf2); border-radius:8px; margin-top:15px; border:1px solid var(--border);";
        
        let canvas = document.createElement('canvas');
        canvas.id = 'graphCanvas';
        canvasWrap.appendChild(canvas);
        document.getElementById('calc-rows').after(canvasWrap);
    }
    
    canvasWrap.style.display = 'block';

    try {
        let cleanExpr = inp.toLowerCase().replace(/(\d)(x)/gi, '$1*$2');
        const compiledCode = math.compile(cleanExpr);

        let labels = [];
        let dataPoints = [];

        // Generate coordinates (-10 සිට 10 දක්වා)
        for (let x = -10; x <= 10; x += 0.5) {
            // calcVars ලබා දීමෙන් සේව් කර ඇති custom functions ද ග්‍රාෆ් වල වැඩ කරයි
            let y = compiledCode.evaluate({ ...calcVars, x: x });
            if (typeof y === 'number' && isFinite(y)) {
                labels.push(x);
                dataPoints.push(y);
            }
        }

        if (calcChartInstance) calcChartInstance.destroy();

        calcChartInstance = new Chart(document.getElementById('graphCanvas').getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'f(x) = ' + inp,
                    data: dataPoints,
                    borderColor: '#a78bfa', // var(--accent)
                    backgroundColor: 'rgba(167,139,250,0.1)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } }
                },
                plugins: {
                    legend: { labels: { color: '#e2e8f0', font: { family: "'JetBrains Mono', monospace" } } },
                    tooltip: { mode: 'index', intersect: false }
                }
            }
        });

        if(typeof toast === 'function') toast("Graph drawn successfully", "success");
    } catch (e) {
        if(typeof toast === 'function') toast("Cannot draw graph. Check your expression.", "error");
    }
}

function hideGraph() {
    const canvasWrap = document.getElementById('graphCanvasWrap');
    if (canvasWrap) {
        canvasWrap.style.display = 'none';
        if (calcChartInstance) calcChartInstance.destroy();
        if (typeof toast === 'function') toast("Graph hidden", "info");
    }
}

// ── SHARED MATH SCOPE (editor & data-lab access) ──
function getCalcScope() {
  return { ...calcVars };
}

function evalWithCalcScope(expr) {
  try {
    let clean = expr.replace(/(\d)(x)/gi, '$1*$2');
    return math.evaluate(clean, calcVars);
  } catch(e) {
    return null;
  }
}