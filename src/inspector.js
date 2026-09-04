/* ============================================================
   THE INSPECTOR
   "If I click on the front flap I should see the menu of what I can edit, so I do not have to
   scroll all the way through the sidebar." Every part of the drawing carries the name of the
   module that shapes it, and clicking it brings that module to the drawing. It is the same
   schema the rail is built from - one definition of each control, reachable from two places,
   and both copies are kept in step by data-p.
   ============================================================ */
let SEL = null;                       // {kind, el, x, y} - x,y are pixels inside the card
const SEL_MODS = {
  body:['body','mat'], flap:['flap'], pocket:['pocket'], strap:['strap','handles'],
  handles:['handles','strap'], zip:['zip'], roll:['roll'], draw:['draw'],
  stitch:['stitch'], inside:['inside']
};
const SEL_NAME = {body:'Body', flap:'Flap', pocket:'Front pocket', strap:'Strap & tabs',
                  handles:'Top handles', zip:'Zip top', roll:'Roll top', draw:'Drawstring',
                  stitch:'Stitching', inside:'Inside', element:'Element', base:'The bottom'};
/* What can go on the underside, in the order you would think of it. A base has no dimensions
   of its own - it is whatever the bottom of this bag happens to be - so the panel offers the
   things you put THERE rather than the body's width and height. */
const BASE_ADD = [['feet','Feet, a set'], ['foot','One bag foot'], ['pad','Reinforcement'],
                  ['label','Maker stamp'], ['keeper','Keeper loop']];
function inspHTML(){
  if(!SEL) return '';
  if(SEL.kind === 'base'){
    const on = S.elements.filter(e => e.face === 'base');
    return `<div class="ihead"><b>The bottom</b>
      <button class="ix" id="insp-x" aria-label="Close">\u00d7</button></div>
      <div class="mbody">
        <p class="hint">What goes on the underside. It is drafted onto whichever piece actually is the bottom of this bag \u2014 the middle of the gusset strip, the fold across a boxed body, the round base \u2014 and placed from this plan.</p>
        <div class="elgrid">${BASE_ADD.map(a =>
          `<button class="btn elbtn" data-add="${a[0]}" data-face="base">+ ${a[1]}</button>`).join('')}</div>
        ${on.length ? on.map(elementCard).join('')
          : `<p class="hint">Nothing down here yet. A set of feet is studs that keep the leather off the ground \u2014 they spread to fill the box you draw, and you can drag that box about and pull its edges to size right here.</p>`}
      </div>`;
  }
  if(SEL.kind === 'point'){
    if(!FSELS.length){ SEL = null; return ''; }
    return `<div class="ihead"><b>${FSELS.length > 1 ? FSELS.length + ' points' : 'Point ' + (FSEL+1)}</b>
      <button class="ix" id="insp-x" aria-label="Close">\u00d7</button></div>
      <div class="mbody">${pointCard()}</div>`;
  }
  if(SEL.kind === 'element'){
    const el = S.elements.find(x=>x.id === SEL.el);
    if(!el){ SEL = null; return ''; }
    return `<div class="ihead"><b>${esc(ELTYPES[el.type].name)}</b>
      <button class="ix" id="insp-x" aria-label="Close">\u00d7</button></div>
      <div class="mbody">${elementCard(el)}</div>`;
  }
  const ids = SEL_MODS[SEL.kind] || [SEL.kind];
  let body = '';
  ids.forEach(id=>{
    const m = MODULES.find(x=>x.id === id);
    if(!m || (m.show && !m.show(S))) return;
    const fs = m.fields.filter(f=>!f.show || f.show(S));
    if(!fs.length) return;
    if(ids.length > 1) body += `<p class="isec">${m.title}</p>`;
    body += fs.map(f=>fieldHTML(f, 'i-')).join('');
  });
  if(!body) body = `<p class="hint">Nothing to set on this one yet.</p>`;
  return `<div class="ihead"><b>${esc(SEL_NAME[SEL.kind] || SEL.kind)}</b>
    <button class="ix" id="insp-x" aria-label="Close">\u00d7</button></div>
    <div class="mbody">${body}</div>`;
}
/** Put the panel next to what was clicked, but never off the edge of the window. */
function inspPlace(cx, cy){
  return {x: Math.max(8, Math.min(Math.max(8, window.innerWidth - 280), cx + 18)),
          y: Math.max(8, Math.min(Math.max(8, window.innerHeight - 120), cy - 30))};
}
/** Redraw just the panel - opening a menu is not a reason to re-draft the bag. */
function renderInsp(){
  const box = document.getElementById('insp');
  if(!box) return;
  if(!SEL){ box.hidden = true; box.innerHTML = ''; inspMark(); return; }
  box.hidden = false;
  box.style.left = SEL.x + 'px';
  box.style.top  = SEL.y + 'px';
  box.innerHTML = inspHTML();
  inspMark();
}
/** Outline whatever is picked, so it is obvious which part the panel belongs to. */
function inspMark(){
  const svg = document.getElementById('elevsvg');
  if(!svg) return;
  svg.querySelectorAll('[data-sel]').forEach(n=>{
    n.classList.toggle('ev-sel', !!SEL && n.dataset.sel === SEL.kind &&
      (SEL.kind !== 'element' || +n.dataset.eid === SEL.el));
  });
}
function renderRail(){
  const rail = document.getElementById('rail');
  const open = new Set([...rail.querySelectorAll('.mod[open]')].map(d=>d.dataset.id));
  let n = 0, o = '';
  for(const m of MODULES){
    if(m.show && !m.show(S)) continue;
    n++;
    const fields = m.fields.filter(f=>!f.show || f.show(S));
    const isOpen = rail.children.length ? open.has(m.id) : m.open;
    const body = m.custom==='elements' ? elementsHTML()
               : m.custom==='designs'  ? designsHTML()
               : m.custom==='shape'    ? shapeHTML()
               : fields.map(fieldHTML).join('');
    const badge = m.custom==='elements' && S.elements.length ? ` <span class="n" style="width:auto">${S.elements.length}</span>`
                : m.custom==='designs' ? ` <span class="dgtag">${esc(S.designName)}</span>` : '';
    o += `<details class="mod" data-id="${m.id}"${isOpen?' open':''}>
      <summary><span class="n">${String(n).padStart(2,'0')}</span>${m.title}${badge}<span class="chev">\u25b6</span></summary>
      <div class="mbody">${body}</div></details>`;
  }
  o += `<div class="mbody"><p class="hint"><b>Seam allowance</b> here means the distance from the cut edge to the stitch line \u2014 the number you set your wing divider to. Every cut size on the pattern already includes it.</p>
    <button class="btn" id="reset">Reset to the preset</button></div>`;
  rail.innerHTML = o;
}
function renderTools(tab){
  const el = document.getElementById('wtools');
  const nArr = Object.keys(S.arrange || {}).length;
  const nLab = Object.keys(S.labels || {}).length;
  const nDg  = Object.keys(S.dropNotes || {}).length;
  if(tab==='pattern'){
    el.innerHTML = `
      <div class="seg" role="group" aria-label="Pattern view">
        <button id="pv-sheets" aria-pressed="${S.pv==='sheets'}">Sheets</button>
        <button id="pv-full" aria-pressed="${S.pv==='full'}">Full pattern</button>
      </div>
      <span class="hint" style="display:flex;align-items:center;gap:6px${S.pv==='full'?';display:none':''}">Paper
        ${pickHTML(S.sheet, Object.keys(SHEETS).map(k=>[k,k]), 'id="t-sheet" aria-label="Paper size"')}</span>
      <span class="hint" style="display:flex;align-items:center;gap:6px">Scale
        ${pickHTML(String(S.zoom), [['all','All sheets on screen'],['fit','One sheet, fit the width'],
             ['0.25','25%'],['0.5','50%'],['0.75','75%'],
             ['1','1:1 \u2014 print size'],['1.5','150%'],['2','200%']], 'id="t-zoom" aria-label="Scale"')}</span>
      <div class="sw" style="gap:6px"><span class="hint">Dimensions</span><button class="tog" id="t-dims" aria-pressed="${S.dims}" aria-label="Show dimensions"></button></div>
      <div class="sw" style="gap:6px"><span class="hint">Lining pieces</span><button class="tog" id="t-lining" aria-pressed="${S.showLining}" aria-label="Draw lining pieces"></button></div>
      <div class="sw" style="gap:6px"><span class="hint">Hole counts</span><button class="tog" id="t-counts" aria-pressed="${S.counts}" aria-label="Show hole counts"></button></div>
      <div class="sw" style="gap:6px"><span class="hint">Notes</span><button class="tog" id="t-notes" aria-pressed="${S.notes}" aria-label="Show the instruction notes"></button></div>
      ${ARRUNDO.length ? `<button class="btn" id="t-undo" title="Ctrl/Cmd + Z">Undo the last move (${ARRUNDO.length})</button>` : ''}
      ${nArr ? `<button class="btn" id="t-unarr">Put every piece back (${nArr})</button>` : ''}
      ${nLab ? `<button class="btn" id="t-unlab">Put the notes back (${nLab})</button>` : ''}
      ${nDg ? `<button class="btn" id="t-undg">Put the diagrams back (${nDg})</button>` : ''}
      <button class="btn" id="t-pack"${DL?'':' disabled'}>Info pack PDF</button>
      <button class="btn pri" id="t-pdf"${DL?'':' disabled'}>Pattern PDF</button>
      ${PDFMSG ? `<span class="hint pdfmsg">${esc(PDFMSG)}</span>` : ''}`;
  } else if(tab==='cut'){
    el.innerHTML = `<span class="hint">Cut sizes include every allowance.</span>`;
  } else {
    el.innerHTML = `<span class="hint">Click any part of the drawing for its own controls. Drag the edges to resize, the corner knobs to round them, and the tab to place it.</span>
      <div class="sw" style="gap:6px"><span class="hint">Grid</span><button class="tog" id="t-grid" aria-pressed="${S.grid !== false}" aria-label="Show the measuring grid"></button></div>`;
  }
}

