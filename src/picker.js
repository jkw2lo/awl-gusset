/* ============================================================
   THE PICKER  -  one menu, ours, in a layer of its own
   ============================================================
   `pickHTML` draws the closed control; the list is carried on it as JSON so nothing has to
   look anything up when it opens. Choosing sets the button's own `value` and fires `input`,
   which is exactly what a <select> did - so every handler that reads `data-p` / `data-k` /
   `data-el` off the target keeps working untouched. */
function pickHTML(val, opts, attrs, cls){
  const v = String(val);
  const cur = opts.find(o=>String(o[0]) === v);
  return `<button type="button" class="pick${cls ? ' ' + cls : ''}" ${attrs || ''}`
    + ` aria-haspopup="listbox" aria-expanded="false" value="${escA(v)}"`
    + ` data-opts="${escA(JSON.stringify(opts))}" data-val="${escA(v)}">`
    + `<span class="picklab">${esc(cur ? cur[1] : v)}</span><span class="pickcar"></span></button>`;
}
let PICK = null;                       // the button whose menu is open, if any
function closePick(){
  const pop = document.getElementById('pop');
  if(pop){ pop.hidden = true; pop.innerHTML = ''; }
  if(PICK) PICK.setAttribute('aria-expanded', 'false');
  PICK = null;
}
function openPick(btn){
  const pop = document.getElementById('pop');
  if(!pop) return;
  if(PICK === btn){ closePick(); return; }
  closePick();
  let opts = [];
  try{ opts = JSON.parse(btn.dataset.opts || '[]'); }catch(e){ opts = []; }
  const cur = String(btn.dataset.val);
  pop.innerHTML = opts.map((o,i)=>`<button type="button" role="option" data-i="${i}"`
    + ` aria-selected="${String(o[0]) === cur}">${esc(o[1])}</button>`).join('');
  pop.hidden = false;
  PICK = btn;
  btn.setAttribute('aria-expanded', 'true');
  // measured after it is on screen, because until then it has no height to flip against
  const r = btn.getBoundingClientRect(), ph = pop.offsetHeight;
  const below = window.innerHeight - r.bottom - 8;
  pop.style.minWidth = Math.max(r.width, 120) + 'px';
  pop.style.top = (ph <= below || r.top < ph + 8 ? r.bottom + 4 : r.top - ph - 4) + 'px';
  pop.style.left = Math.max(6, Math.min(window.innerWidth - pop.offsetWidth - 6, r.left)) + 'px';
  const sel = pop.querySelector('[aria-selected="true"]') || pop.firstElementChild;
  if(sel){ sel.classList.add('on2'); sel.scrollIntoView({block:'nearest'}); }
}
/** The button the open menu belongs to - or, if the rail has been rebuilt underneath it, the
    control that replaced it. Surviving the rebuild is the whole point of the menu living in
    its own layer, and a choice that lands on a detached node is a choice quietly thrown away. */
function pickHost(btn){
  if(btn.isConnected) return btn;
  const d = btn.dataset;
  const sel = btn.id ? `[id="${btn.id}"]`
            : d.el ? `[data-el="${d.el}"][data-k="${d.k}"]`
            : d.p  ? `[data-p="${d.p}"][data-k="${d.k}"]` : null;
  return (sel && document.querySelector(sel)) || btn;
}
function pickChoose(i){
  if(!PICK) return;
  let opts = [];
  try{ opts = JSON.parse(PICK.dataset.opts || '[]'); }catch(e){ return; }
  const o = opts[i]; if(!o) return;
  const btn = pickHost(PICK);
  closePick();
  btn.value = String(o[0]);                       // a <button> has a value, and that is the
  btn.dataset.val = String(o[0]);                 // whole trick: the old handlers read it
  btn.dispatchEvent(new Event('input', {bubbles:true}));
}
const FIELD = {};
/** `pfx` keeps the ids unique when the same control is drawn twice - once in the rail and
    once in the inspector. Both carry the same data-p, and both are kept in step. */
function fieldHTML(f, pfx){
  pfx = pfx || '';
  FIELD[f.p] = f;
  if(f.t==='rule')  return `<div class="rule"></div>`;
  if(f.t==='hint')  return `<p class="hint">${f.text}</p>`;
  if(f.t==='bool'){
    const v = !!get(f.p);
    return `<div class="sw"><span>${f.label}</span><button class="tog" data-p="${f.p}" data-k="bool" aria-pressed="${v}" aria-label="${f.label}"></button></div>`;
  }
  if(f.t==='sel'){
    const v = String(get(f.p));
    return `<div class="fld"><label>${f.label}</label><span class="val">${
      pickHTML(v, f.opts, `id="${pfx}c-${f.p}" data-p="${f.p}" data-k="sel" aria-label="${escA(f.label)}"`)
    }</span></div>`;
  }
  const mm = +get(f.p);
  if(f.t==='int'){
    return `<div class="fld"><label for="${pfx}c-${f.p}">${f.label}</label><span class="val">
      <input id="${pfx}c-${f.p}" type="number" data-p="${f.p}" data-k="int" value="${mm}" min="${f.min}" max="${f.max}" step="1"><span class="u"></span></span>
      <input type="range" data-p="${f.p}" data-k="intr" value="${mm}" min="${f.min}" max="${f.max}" step="1" aria-label="${f.label}"></div>`;
  }
  const inch = S.units==='in';
  const disp = inch ? (Math.round(mm/IN*16)/16) : (Math.round(mm*10)/10);   // stay on the 1/16 grid
  const step = inch ? 0.0625 : (f.step||1);
  return `<div class="fld"><label for="${pfx}c-${f.p}">${f.label}</label><span class="val">
    <input id="${pfx}c-${f.p}" type="number" data-p="${f.p}" data-k="dim" value="${disp}" min="${inch?R1(f.min/IN*100)/100:f.min}" max="${inch?R1(f.max/IN*100)/100:f.max}" step="${step}">
    <span class="u">${inch?'in':'mm'}</span></span>
    <input type="range" data-p="${f.p}" data-k="dimr" value="${mm}" min="${f.min}" max="${f.max}" step="${(f.step||1)*(f.step?1:0.5)}" aria-label="${f.label}"></div>`;
}
