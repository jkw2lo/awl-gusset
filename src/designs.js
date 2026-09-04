/* ============================================================
   DESIGNS - a design is the whole spec, saved as one small file.
   Three places it can live: this browser (instant, automatic),
   a .json file you keep in your own folder, or the clipboard.
   ============================================================ */
const DESIGN_FORMAT = 'awl-gusset/design', DESIGN_VERSION = 1;
const LIB_KEY = 'awlgusset.library.v1';
/* v2 keeps its own in-progress design so the two artifacts do not overwrite each other,
   but shares the saved library: designs you kept should follow you across. */
const CUR_KEY = 'awlgusset.current.v2', CUR_KEY_V1 = 'awlgusset.current.v1';
const LS = (function(){
  try{ localStorage.setItem('__ag','1'); localStorage.removeItem('__ag'); return localStorage; }
  catch(e){ return null; }        // sandboxed or blocked - fall back to memory
})();
let MEMLIB = [], DL, DESIGNMSG = '', DESIGNERR = false;

function snapshot(name){
  const d = JSON.parse(JSON.stringify(S));
  delete d.designId;
  return {format:DESIGN_FORMAT, version:DESIGN_VERSION,
          name:(name || S.designName || 'Untitled').slice(0,60),
          saved:new Date().toISOString(), app:'Awl & Gusset', design:d};
}
/** Never trust a file: keep only what the drafter can actually use. */
function sanitise(){
  const num = (v,d) => (typeof v === 'number' && isFinite(v)) ? v : d;
  S.W = Math.max(40, Math.min(900, num(S.W,270)));
  S.H = Math.max(40, Math.min(700, num(S.H,190)));
  S.D = Math.max(0,  Math.min(400, num(S.D,95)));
  S.thickness = Math.max(0.4, Math.min(8, num(S.thickness,2)));
  S.sa = Math.max(0, Math.min(20, num(S.sa,5)));
  S.entasis = Math.max(0, Math.min(6, num(S.entasis,0)));
  S.counts = S.counts !== false;
  S.notes = S.notes !== false;
  S.grid = S.grid !== false;
  if(!S.arrange || typeof S.arrange !== 'object' || Array.isArray(S.arrange)) S.arrange = {};
  Object.keys(S.arrange).forEach(k=>{
    const a = S.arrange[k];
    if(!a || typeof a !== 'object' || !isFinite(a.x) || !isFinite(a.y)){ delete S.arrange[k]; return; }
    S.arrange[k] = {s:Math.max(0, Math.min(40, Math.round(num(a.s,0)))),
                    x:Math.max(0, Math.min(2000, num(a.x,0))),
                    y:Math.max(0, Math.min(2000, num(a.y,0))), r:!!a.r};
  });
  if(!S.dropNotes || typeof S.dropNotes !== 'object' || Array.isArray(S.dropNotes)) S.dropNotes = {};
  Object.keys(S.dropNotes).forEach(k=>{ if(S.dropNotes[k]) S.dropNotes[k] = true; else delete S.dropNotes[k]; });
  if(!S.labels || typeof S.labels !== 'object' || Array.isArray(S.labels)) S.labels = {};
  Object.keys(S.labels).forEach(k=>{
    const a = S.labels[k];
    if(!a || typeof a !== 'object'){ delete S.labels[k]; return; }
    if(a.off){ S.labels[k] = {off:true}; return; }
    if(!isFinite(a.dx) || !isFinite(a.dy)){ delete S.labels[k]; return; }
    S.labels[k] = {dx:Math.max(-500, Math.min(500, num(a.dx,0))),
                   dy:Math.max(-500, Math.min(500, num(a.dy,0)))};
  });
  if(!['all','fit','0.25','0.5','0.75','1','1.5','2'].includes(String(S.zoom))) S.zoom = 'fit';
  S.stitch.pitch = Math.max(1.5, Math.min(10, num(S.stitch.pitch,3.85)));
  S.stitch.prongs = Math.max(2, Math.min(12, Math.round(num(S.stitch.prongs,4))));
  S.stitch.slit = Math.max(0.5, Math.min(5, num(S.stitch.slit,1.7)));
  S.stitch.reg = [0,10,15,20,25].includes(Math.round(num(S.stitch.reg,10))) ? Math.round(num(S.stitch.reg,10)) : 10;
  S.cards.n = Math.max(1, Math.min(12, Math.round(num(S.cards.n,3))));
  S.cards.w = Math.max(50, Math.min(200, num(S.cards.w, CARD_W + 3)));
  S.cards.h = Math.max(12, Math.min(60, num(S.cards.h, 40)));
  S.cards.reveal = Math.max(4, Math.min(40, num(S.cards.reveal, 11)));
  ['slip','zipPkt','cards'].forEach(k=>{ if(!['back','front'].includes(S[k].face)) S[k].face = 'back'; });
  sanitiseRivets(S.strap);
  S.strap.anchorX = Math.max(-200, Math.min(200, num(S.strap.anchorX, 0)));
  S.strap.tabRot = Math.max(-60, Math.min(60, num(S.strap.tabRot, 0)));
  S.topR = Math.max(0, Math.min(200, num(S.topR,0)));
  S.shoulder = Math.max(0, Math.min(600, num(S.shoulder,0)));
  S.bellows = Math.max(0, Math.min(200, num(S.bellows,40)));
  S.squareness = Math.max(0, Math.min(100, Math.round(num(S.squareness,0))));
  S.squarenessTop = Math.max(0, Math.min(100, Math.round(num(S.squarenessTop, S.squareness))));
  if(!['wrap','split','base','bellows'].includes(S.gussetStyle)) S.gussetStyle = 'wrap';
  if(!['gusset','boxed','fold','bucket','barrel','free'].includes(S.construction)) S.construction = 'gusset';
  /* The profile she drew. Three points is the least that encloses anything; anything that is
     not a finite pair of numbers is dropped rather than allowed to put a NaN into a hole
     position, and a file with no usable profile opens on the rounded rectangle. */
  if(!S.free || typeof S.free !== 'object' || Array.isArray(S.free)) S.free = {pts:[]};
  if(!Array.isArray(S.free.pts)) S.free.pts = [];
  S.free.pts = S.free.pts.filter(q => q && isFinite(q.x) && isFinite(q.y)).map(q=>({
    x:Math.max(-0.5, Math.min(1.5, num(q.x, 0))), y:Math.max(-0.5, Math.min(1.5, num(q.y, 0))),
    r:Math.max(0, Math.min(400, num(q.r, 0))), m:!!q.m, skip:!!q.skip}));
  S.free.sym = !!S.free.sym;
  if(S.free.pts.filter(q=>!q.skip).length < FREE_MIN) S.free.pts = freeShape('rounded');
  // exactly two ends, or none at all and the drafter picks the two topmost
  const mk = S.free.pts.map((q,i)=>q.m ? i : -1).filter(i=>i>=0);
  if(mk.length > 2) mk.slice(2).forEach(i=>{ S.free.pts[i].m = false; });
  if(mk.length === 1) S.free.pts[mk[0]].m = false;
  if(!['flap','zip','magnet','open','roll','draw'].includes(S.top)) S.top = 'flap';
  if(!S.draw || typeof S.draw !== 'object') S.draw = {n:10, size:8, drop:26, style:'eyelet', toggle:true};
  S.draw.n = Math.max(4, Math.min(24, Math.round(num(S.draw.n,10))));
  S.draw.size = Math.max(3, Math.min(20, num(S.draw.size,8)));
  S.draw.drop = Math.max(6, Math.min(160, num(S.draw.drop,26)));
  S.draw.toggle = !!S.draw.toggle;
  if(!['eyelet','channel'].includes(S.draw.style)) S.draw.style = 'eyelet';
  if(!S.zip || typeof S.zip !== 'object') S.zip = {style:'rim', panelH:35, gauge:5, wrap:32, tabs:true};
  // files written before the zip grew up carry a boolean instead of a style
  if(typeof S.zip.panel === 'boolean' && !S.zip.style) S.zip.style = S.zip.panel ? 'panel' : 'rim';
  delete S.zip.panel;
  if(!['rim','wrap','panel'].includes(S.zip.style)) S.zip.style = 'rim';
  S.zip.gauge = [3,5,8].includes(Math.round(num(S.zip.gauge,5))) ? Math.round(num(S.zip.gauge,5)) : 5;
  S.zip.wrap = Math.max(0, Math.min(160, num(S.zip.wrap,32)));
  S.zip.panelH = Math.max(12, Math.min(120, num(S.zip.panelH,35)));
  S.zip.tabs = S.zip.tabs !== false;
  S.flap.closures = Math.max(1, Math.min(2, Math.round(num(S.flap.closures, 1))));
  S.flap.cSpan = Math.max(24, Math.min(500, num(S.flap.cSpan, 150)));
  if(!S.flap.pull || typeof S.flap.pull !== 'object')
    S.flap.pull = {on:false, w:26, attach:30, drop:34, tip:'round', r:3, fix:'stitchbox', rivetPat:'across2', rivetInset:8, rivetPitch:11, rivetEdge:6, rivets:2};
  S.flap.pull.on = !!S.flap.pull.on;
  sanitiseRivets(S.flap.pull);
  S.flap.pull.w = Math.max(8, Math.min(120, num(S.flap.pull.w, 26)));
  S.flap.pull.attach = Math.max(8, Math.min(120, num(S.flap.pull.attach, 30)));
  S.flap.pull.drop = Math.max(6, Math.min(180, num(S.flap.pull.drop, 34)));
  S.flap.pull.r = Math.max(0, Math.min(30, num(S.flap.pull.r, 3)));
  if(!TIPS[S.flap.pull.tip]) S.flap.pull.tip = 'round';
  if(!['stitchbox','rivet','both'].includes(S.flap.pull.fix)) S.flap.pull.fix = 'stitchbox';
  if(!S.roll || typeof S.roll !== 'object') S.roll = {turns:3, turn:60, closure:'clip', stiffener:true, anchorY:120};
  S.roll.turns = Math.max(1, Math.min(6, Math.round(num(S.roll.turns,3))));
  S.roll.turn = Math.max(25, Math.min(140, num(S.roll.turn,60)));
  S.roll.anchorY = Math.max(20, Math.min(320, num(S.roll.anchorY,120)));
  S.roll.stiffener = !!S.roll.stiffener;
  if(!['clip','buckle','strap','none'].includes(S.roll.closure)) S.roll.closure = 'clip';
  if(!S.handles || typeof S.handles !== 'object') S.handles = {on:false, span:130, rise:85, width:22, attach:35, taper:0};
  S.handles.taper = Math.max(0, Math.min(Math.max(0, num(S.handles.width,22) - 8), num(S.handles.taper,0)));
  S.handles.core = Math.max(3, Math.min(20, num(S.handles.core,9)));
  if(!['plain','tab','ring'].includes(S.handles.ends)) S.handles.ends = 'plain';
  // designs written before handles had their own numbers borrowed the strap's
  if(!['single','layered','folded','rolled'].includes(S.handles.build))
    S.handles.build = num(S.handles.core,0) > 0 ? 'rolled'
                    : S.strap.build==='four' ? 'folded' : S.strap.build==='single' ? 'single' : 'layered';
  if(!isFinite(S.handles.width) || S.handles.width <= 0) S.handles.width = num(S.strap.width, 22);
  S.handles.width = Math.max(8, Math.min(80, num(S.handles.width, 22)));
  if(!isFinite(S.handles.anchorY)) S.handles.anchorY = num(S.strap.anchorY, 16);
  S.handles.anchorY = Math.max(0, Math.min(200, num(S.handles.anchorY, 16)));
  if(!['stitch','rivet','both'].includes(S.handles.fix)) S.handles.fix = S.strap.tabFix || 'stitch';
  sanitiseRivets(S.handles);
  S.handles.span = Math.max(30, Math.min(500, num(S.handles.span, 130)));
  S.handles.rise = Math.max(10, Math.min(280, num(S.handles.rise, 85)));
  S.handles.attach = Math.max(10, Math.min(160, num(S.handles.attach, 35)));
  S.strap.curve = Math.max(0, Math.min(120, num(S.strap.curve,0)));
  S.strap.pad = !!S.strap.pad;
  S.strap.padW = Math.max(20, Math.min(140, num(S.strap.padW,70)));
  S.strap.padThick = Math.max(3, Math.min(25, num(S.strap.padThick,10)));
  if(!TIPS[S.strap.tip]) S.strap.tip = 'round';
  if(!Array.isArray(S.elements)) S.elements = [];
  S.elements = S.elements.filter(e => e && ELTYPES[e.type]).map(e=>{
    const T = ELTYPES[e.type];
    return {id:Math.round(num(e.id,1)), type:e.type,
            face:T.faces.includes(e.face) ? e.face : T.faces[0],
            x:num(e.x,0), y:Math.max(0,num(e.y,40)),
            w:Math.max(2,num(e.w,T.w)), h:Math.max(2,num(e.h,T.h)), r:Math.max(0,num(e.r,T.r)),
            dep:Math.max(0,num(e.dep, T.dep || 0)),
            slots:Math.max(1, Math.min(10, Math.round(num(e.slots, 3)))),
            reveal:Math.max(4, Math.min(40, num(e.reveal, 11))),
            build:e.build === 'faced' ? 'faced' : 'pockets',
            fix:['stitch3','stitchbox','rivet','both','none'].includes(e.fix)?e.fix:T.fix,
            rivets:e.rivets, rivetPat:e.rivetPat, rivetInset:e.rivetInset,
            rivetPitch:e.rivetPitch, rivetEdge:e.rivetEdge, mirror:!!e.mirror,
            rot:((Math.round(num(e.rot,0)) % 360) + 360) % 360,
            open:['top','right','bottom','left'].indexOf(e.open) >= 0 ? e.open : 'top'};
  }).map(sanitiseRivets);
  S.elSeq = Math.max(S.elSeq||0, ...S.elements.map(e=>e.id), 0);
  if(!S.view3d || typeof S.view3d !== 'object') S.view3d = {yaw:32, pitch:18};
  S.view3d.yaw = isFinite(S.view3d.yaw) ? ((S.view3d.yaw % 360) + 360) % 360 : 32;
  S.view3d.pitch = isFinite(S.view3d.pitch) ? Math.max(-60, Math.min(60, S.view3d.pitch)) : 18;
  if(!['adjust','fixed','pack','handles','belt','none'].includes(S.strap.type)) S.strap.type = 'adjust';
  if(S.units !== 'in') S.units = 'mm';
}
function applyDesign(obj, name){
  if(!obj || typeof obj !== 'object') throw new Error('That file could not be read as a design.');
  if(obj.format !== DESIGN_FORMAT || !obj.design)
    throw new Error('That is not an Awl & Gusset design file.');
  deepAssign(S, JSON.parse(JSON.stringify(obj.design)));
  S.designName = (name || obj.name || 'Untitled').slice(0,60);
  sanitise();
}
function libRead(){
  if(!LS) return MEMLIB;
  try{ const a = JSON.parse(LS.getItem(LIB_KEY) || '[]'); return Array.isArray(a) ? a : []; }
  catch(e){ return []; }
}
function libWrite(a){
  MEMLIB = a;
  if(!LS) return true;
  try{ LS.setItem(LIB_KEY, JSON.stringify(a)); return true; }
  catch(e){ DESIGNMSG = 'This browser would not store the design - save it to a file instead.'; DESIGNERR = true; return false; }
}
let autosaveTimer = null;
function autosave(){
  if(!LS) return;
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(()=>{
    try{ LS.setItem(CUR_KEY, JSON.stringify(snapshot())); }catch(e){}
  }, 500);
}
function restoreLast(){
  if(!LS) return false;
  try{
    const raw = LS.getItem(CUR_KEY) || LS.getItem(CUR_KEY_V1); if(!raw) return false;
    applyDesign(JSON.parse(raw));
    return true;
  }catch(e){ return false; }
}
function saveToLibrary(asNew){
  const lib = libRead();
  const snap = snapshot();
  if(!asNew && S.designId){
    const i = lib.findIndex(x=>x.id === S.designId);
    if(i >= 0){ lib[i] = Object.assign({id:S.designId}, snap); libWrite(lib);
      DESIGNMSG = '\u201c' + snap.name + '\u201d saved.'; DESIGNERR = false; return; }
  }
  const id = Date.now().toString(36);
  lib.unshift(Object.assign({id}, snap));
  S.designId = id;
  libWrite(lib.slice(0, 40));
  DESIGNMSG = '\u201c' + snap.name + '\u201d saved to this browser.'; DESIGNERR = false;
}
function fileName(){
  return (S.designName || 'bag').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48) || 'bag';
}
async function saveToFile(){
  const data = JSON.stringify(snapshot(), null, 2);
  if(!DL){ DESIGNMSG = 'File saving is not available in this view - copy the text below instead.'; DESIGNERR = true; renderRail(); return; }
  try{
    await DL.save({filename: fileName() + '.bag.json', data});
    DESIGNMSG = 'Saved. Keep it with your other designs and open it from there next time.'; DESIGNERR = false;
  }catch(err){
    const c = err && err.code;
    DESIGNMSG = c === 'declined' ? 'Save cancelled.'
      : c === 'rate_limited' ? 'A save prompt is already open - try again in a moment.'
      : c === 'too_large' ? 'That design is too big to save as a file.'
      : 'Could not save the file - copy the text below instead.';
    DESIGNERR = c !== 'declined';
  }
  renderRail();
}
function designsHTML(){
  const lib = libRead();
  const when = iso => { try{ const d=new Date(iso); return d.toLocaleDateString(undefined,{month:'short',day:'numeric'})+' '+d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}); }catch(e){ return ''; } };
  let o = `<div class="fld wide"><label for="dg-name">This design</label>
      <input id="dg-name" type="text" class="dgname" value="${esc(S.designName)}" maxlength="60" placeholder="Untitled"></div>
    <div class="dgrow">
      <button class="btn pri" id="dg-save">Save</button>
      <button class="btn" id="dg-saveas">Save as new</button>
    </div>`;
  if(DESIGNMSG) o += `<p class="dgmsg${DESIGNERR?' err':''}">${esc(DESIGNMSG)}</p>`;
  o += `<div class="subhead">In this browser</div>`;
  if(!LS) o += `<p class="hint">This view will not let the page store anything, so designs live only until you close the tab. Save a file to keep one.</p>`;
  else if(!lib.length) o += `<p class="hint">Nothing saved yet. Saved designs reappear here whenever you open this page, and your latest edit is kept automatically.</p>`;
  else o += `<div class="dglist">` + lib.map(d=>`<div class="dgitem${d.id===S.designId?' on':''}">
      <button class="dgopen" data-open="${d.id}"><b>${esc(d.name)}</b><span>${when(d.saved)}</span></button>
      <button class="elx" data-drop="${d.id}" aria-label="Delete ${esc(d.name)}">\u00d7</button></div>`).join('') + `</div>`;

  o += `<div class="subhead">As a file</div>`;
  o += `<div class="dgrow">
      ${DL === null ? '' : `<button class="btn" id="dg-file"${DL === undefined ? ' disabled' : ''}>Save file\u2026</button>`}
      <label class="btn" for="dg-open" style="display:inline-block">Open file\u2026</label>
      <input id="dg-open" type="file" accept=".json,application/json" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none">
    </div>
    <p class="hint">${DL === null
      ? 'This view will not hand you a file directly \u2014 copy the text below and save it as <code>.bag.json</code> yourself. Opening a file still works.'
      : 'Saves a small <code>.bag.json</code> holding the whole spec \u2014 the bag, not the drawing. Keep it in a <code>designs</code> folder of your own and open it straight from there next time.'}</p>
    <details class="dgtext"><summary>Or copy and paste the design as text</summary>
      <textarea id="dg-json" spellcheck="false" rows="5">${esc(JSON.stringify(snapshot()))}</textarea>
      <div class="dgrow"><button class="btn" id="dg-copy">Copy</button><button class="btn" id="dg-paste">Load what is in the box</button></div>
    </details>`;
  return o;
}

function elementsHTML(){
  let o = `<p class="hint">Add a part, then place it by dragging it on the bag or by typing the numbers. Each one gets its own footprint, fixing and cut piece.</p>
    <div class="elgrid">` +
    Object.keys(ELTYPES).map(k=>`<button class="btn elbtn" data-add="${k}">+ ${ELTYPES[k].name}</button>`).join('') +
    `</div>`;
  if(!S.elements.length) return o + `<p class="hint" style="margin-top:4px">Nothing added yet \u2014 the bag is as the panels above describe it.</p>`;
  o += S.elements.map(elementCard).join('');
  return o;
}
/** The arrangement controls an element gets, which are the arrangement controls everything
    else gets: RIVET_PATS is the one table and this is one more reader of it. A pen loop wants
    "two, stacked" as often as a strap tab wants "two, across", and before this the only thing
    an element could say was how MANY. */
function elRivetHTML(el){
  const spec = rivetSpecAt(el), rows = RIVET_PATS[spec.pat].rows;
  const inch = S.units==='in';
  const num = (k, label, min, max, step) => `<div class="fld"><label>${label}</label><span class="val">
      <input type="number" data-el="${el.id}" data-k="${k}" value="${inch?Math.round(spec[k.slice(5).toLowerCase()]/IN*16)/16:Math.round(spec[k.slice(5).toLowerCase()]*10)/10}"
       min="${min}" max="${max}" step="${inch?0.0625:(step||1)}"><span class="u">${inch?'in':'mm'}</span></span></div>`;
  const isFeet = !!ELTYPES[el.type].feet;
  return `<div class="fld"><label>${isFeet ? 'How many feet' : 'Rivet arrangement'}</label><span class="val">${
      pickHTML(spec.pat, Object.keys(RIVET_PATS).map(k=>[k, RIVET_PATS[k].name]),
               `data-el="${el.id}" data-k="rivetPat" aria-label="Arrangement"`)}</span></div>
    ${num('rivetInset', isFeet ? 'In from the front and back' : 'First row in from the end', 3, isFeet ? 200 : 60)}
    ${(!isFeet && rows.length > 1) ? num('rivetPitch','Between the rows', 5, 60) : ''}
    ${rows.some(r=>r.length > 1) ? num('rivetEdge', isFeet ? 'In from the sides' : 'In from the side edge', 2.5, isFeet ? 200 : 30, 0.5) : ''}
    ${isFeet ? `<p class="hint">Four at the corners, five with one in the middle, six for a long base \u2014 they spread to fill the box you drew, so move that box or resize it and the feet follow.</p>` : ''}`;
}
/** What the numbers on a card stack actually give you, measured rather than asserted - the one
    thing you cannot see from three numbers is whether the back card is still gettable. */
function cardsNote(el){
  const G = cardsGeom(el);
  const shows = k => CARD_H - G.depth(k);
  const bad = [];
  if(G.slotW < CARD_W + 1)
    bad.push(`Only ${fmt(G.slotW)} is left between the two stitch lines and a card is ${fmt(CARD_W)} across \u2014 cut it ${fmt(CARD_W + 3 + 2*G.sa)} wide.`);
  if(shows(0) < 8)
    bad.push(`The deepest slot covers ${fmt(G.depth(0))} of a ${fmt(CARD_H)} card, so only ${fmt(shows(0))} of it shows. You will not get a fingernail on that one.`);
  if(G.capped)
    bad.push(`${G.n} slots will not take a ${fmt(G.revWant)} reveal out of a ${fmt(G.tuck)} stack \u2014 the front one would have no leather left. It is drafted at ${fmt(G.rev)}, which is as much as this depth can give. Deepen the stack, use fewer slots, or build it as pockets, which has no such limit.`);
  if(G.hCapped)
    bad.push(`Drafted at ${fmt(G.tuck)}: a slot shallower than ${fmt(CARD_MIN)} will not hold a card, and one deeper than ${fmt(CARD_H - 6)} swallows it.`);
  return `<p class="hint">Cut ${G.n} ${G.pockets ? `identical ${fmt(G.w)} \u00d7 ${fmt(G.pieceH(0))} pockets` : `pieces, ${fmt(G.pieceH(0))} down to ${fmt(G.pieceH(G.n-1))}`},
    and the stack lands ${fmt(G.w)} \u00d7 ${fmt(G.stackH)} on the panel. Every card shows
    ${G.pockets ? fmt(shows(0)) : fmt(shows(0)) + ' to ' + fmt(shows(G.n-1))} above its own slot.
    ${G.pockets
      ? 'Each pocket is stitched to the panel along its own bottom line \u2014 that line is what makes the pocket \u2014 and the two sides go through the whole stack in one run at the end.'
      : 'The pockets are the gaps between the layers and the panel is the back of the deepest one, so only the two sides are stitched.'}</p>`
    + bad.map(b=>`<p class="dgmsg err">${esc(b)}</p>`).join('');
}
/** One element's card. The rail stacks them all; the inspector shows the one you clicked. */
function elementCard(el){
  {
    const T = ELTYPES[el.type], pt = !!T.point;
    const faces = T.faces.filter(f=>faceOn(f) || f===el.face).map(f=>[f, FACENAME[f]]);
    const fixOpts = T.opens
      ? [['stitch3','Stitched, 3 sides'],['rivet','Rivets'],['both','Rivets and stitching'],['none','Glued only']]
      : [['stitchbox','Stitched box'],['rivet','Rivets'],['both','Rivets and stitching'],['none','Glued only']];
    const cur = fixOpts.some(f=>f[0]===el.fix) ? el.fix : fixOpts[0][0];
    const pk = (k, v, opts, label) => pickHTML(v, opts, `data-el="${el.id}" data-k="${k}" aria-label="${escA(label)}"`);
    const num = (k,label,min,max) => `<div class="fld"><label>${label}</label><span class="val">
      <input type="number" data-el="${el.id}" data-k="${k}" value="${S.units==='in'?Math.round(el[k]/IN*16)/16:Math.round(el[k]*10)/10}"
       min="${min}" max="${max}" step="${S.units==='in'?0.0625:1}"><span class="u">${S.units==='in'?'in':'mm'}</span></span></div>`;
    return `<div class="elcard">
      <div class="elhead"><b>${T.name}</b><span class="elid">${el.id}</span>
        <button class="elx" data-del="${el.id}" aria-label="Remove ${T.name} ${el.id}">\u00d7</button></div>
      <div class="fld"><label>On the</label><span class="val">${pk('face', el.face, faces, 'On the')}</span></div>
      ${el.face==='gusset' ? `<div class="fld"><label>Which side</label><span class="val">${
        pk('side', el.side||'both', SIDES, 'Which side')}</span></div>` : ''}
      ${num('y','Down from the rim',0,400)}
      ${num('x','Offset from centre',-200,200)}
      ${pt?'':num('w', T.cards ? 'Slot width, cut' : 'Width', 5, 400)}
      ${pt?'':num('h', T.cards ? (el.build==='faced' ? 'Deepest slot covers' : 'Each pocket covers') : 'Height', 5, 400)}
      ${T.cards ? `<div class="fld"><label>How many slots</label><span class="val">
          <input type="number" data-el="${el.id}" data-k="slots" value="${Math.round(el.slots||3)}" min="1" max="10" step="1"><span class="u"></span></span></div>
        ${num('reveal','Reveal per slot',4,40)}
        <div class="fld"><label>Built as</label><span class="val">${
          pk('build', el.build==='faced'?'faced':'pockets', [
            ['pockets','Leather pockets, one per card'],
            ['faced','Faced \u2014 the lining is the back']], 'Built as')}</span></div>
        ${cardsNote(el)}` : ''}
      ${T.dep ? num('dep','Pleat depth',4,120) : ''}
      ${T.opens ? `<div class="fld"><label>Mouth on the</label><span class="val">${
        pk('open', el.open, [['top','Top'],['right','Right'],['bottom','Bottom'],['left','Left']], 'Mouth on the')
      }</span></div>` : ''}
      <div class="fld"><label>Turn${T.opens ? ' \u00b7 opens ' + openWord(el.open, el.rot||0) : ''}</label><span class="val">
        <input type="number" data-el="${el.id}" data-k="rot" value="${Math.round(el.rot||0)}" min="0" max="359" step="1"><span class="u">\u00b0</span></span>
        <input type="range" data-el="${el.id}" data-k="rot" value="${Math.round(el.rot||0)}" min="0" max="359" step="1" aria-label="Rotation"></div>
      <div class="fld"><label>Fixing</label><span class="val">${pk('fix', cur, fixOpts, 'Fixing')}</span></div>
      ${(el.fix==='rivet'||el.fix==='both')?elRivetHTML(el):''}
      <div class="sw"><span>Mirror on both sides</span><button class="tog" data-el="${el.id}" data-k="mirror" aria-pressed="${!!el.mirror}" aria-label="Mirror"></button></div>
    </div>`;
  }
}

