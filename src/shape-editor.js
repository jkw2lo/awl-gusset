/* ============================================================
   THE SHAPE EDITOR
   Two ways in, and they are the same drawing. Either you take the shape the bag already has
   and start pulling it about, or you pick something plain and build up from there. Every
   point can be dragged, every edge can take a new point, any point can be deleted, rounded,
   marked as an end of the mouth, or SKIPPED - and skipping is how you say which points the
   gusset connects: leave a five-point star's valleys in and the gusset follows them all the
   way round, skip them and the same five points make a pentagon.

   The profile is stored 0 to 1 of its own box. Moving a point therefore has to put the box
   back and write W and H out again, which `freeRenorm` is the only place that does - so the
   size on the sliders and the size of the shape can never drift apart.
   ============================================================ */
/* The shape editor's selection is a LIST, not a point. Most of what you want to say about a
   shape you drew is about several points at once - "these four are the mouth", "flatten this
   side", "round all of those" - and saying it one point at a time is how a shape ends up
   nearly symmetric. FSEL is the last one touched, which is the one whose own numbers are
   shown; FSELS is everything the actions apply to, and a single click is a selection of one. */
let FDRAGS = [], FSELS = [], FREEMSG = '';
let FSEL = null;                                   // the anchor: the last point clicked
function fselSet(list){
  const P = S.free.pts;
  FSELS = (list || []).filter(i => i >= 0 && i < P.length).filter((v,k,a)=>a.indexOf(v)===k);
  FSEL = FSELS.length ? FSELS[FSELS.length-1] : null;
}
function fselToggle(i, add){
  if(!add) return fselSet([i]);
  const k = FSELS.indexOf(i);
  fselSet(k < 0 ? FSELS.concat([i]) : FSELS.filter(v=>v!==i));
  if(k >= 0 && FSELS.length) FSEL = FSELS[FSELS.length-1];
}
/** The selection in index order, and the longest unbroken run inside it - the run is what
    "straighten" and "smooth" work on, because those only mean anything along the outline. */
function fselRun(){
  const n = S.free.pts.length, sel = FSELS.slice().sort((a,b)=>a-b);
  if(sel.length < 3) return sel;
  let best = [], cur = [sel[0]];
  for(let k=1;k<sel.length;k++){
    if(sel[k] === sel[k-1] + 1) cur.push(sel[k]);
    else { if(cur.length > best.length) best = cur; cur = [sel[k]]; }
  }
  if(cur.length > best.length) best = cur;
  // a run that wraps past the end of the list is still one run
  if(best.length < sel.length && sel[0] === 0 && sel[sel.length-1] === n-1){
    let head = [], tail = [];
    for(let k=0;k<sel.length && sel[k]===k;k++) head.push(sel[k]);
    for(let k=sel.length-1;k>=0 && sel[k]===n-(sel.length-k);k--) tail.unshift(sel[k]);
    if(tail.length + head.length > best.length) best = tail.concat(head);
  }
  return best;
}
/** Put the points between the two ends of the run onto the straight line between them. That
    is what "this side is flat" means on a profile: not a smaller radius, a chord. */
function freeStraighten(){
  const P = S.free.pts, run = fselRun();
  if(run.length < 3) { FSELS.forEach(i=>{ P[i].r = 0; }); return 'Corner radius off. Select three or more points in a row to flatten the side between them.'; }
  const a = P[run[0]], b = P[run[run.length-1]];
  run.forEach((i,k)=>{
    const u = k/(run.length-1);
    P[i].x = a.x + (b.x-a.x)*u; P[i].y = a.y + (b.y-a.y)*u; P[i].r = 0;
  });
  return `Flattened ${run.length} points into one straight side.`;
}
/** One pass of averaging with the neighbours either side. Two passes and a hand-drawn edge
    stops wandering; more than that and the shape starts shrinking towards its own middle, so
    it is deliberately a button you press again rather than a slider. */
function freeSmooth(){
  const P = S.free.pts, n = P.length;
  if(FSELS.length < 2) return 'Select two or more points to smooth the curve through them.';
  const was = P.map(q=>({x:q.x, y:q.y}));
  FSELS.forEach(i=>{
    const a = was[(i-1+n)%n], b = was[i], c = was[(i+1)%n];
    P[i].x = b.x*0.5 + (a.x + c.x)*0.25;
    P[i].y = b.y*0.5 + (a.y + c.y)*0.25;
  });
  return `Smoothed ${FSELS.length} points. Press it again for more.`;
}
/** Which point is this one's reflection about the middle of the box, if it has one. Found by
    looking, not assumed: a shape she has been pulling about is only nearly symmetric, and the
    partner is whichever point is closest to where the mirror image lands. */
function freeSymPartner(i){
  const P = S.free.pts, q = P[i], mx = 1 - q.x;
  let best = -1, bd = 0.08;                     // 8% of the box: nearer than that is a pair
  P.forEach((r,k)=>{
    if(k === i) return;
    const d = Math.hypot(r.x - mx, r.y - q.y);
    if(d < bd){ bd = d; best = k; }
  });
  return best;
}
/** Fold one half of the shape onto the other. The half you keep is the one with more points
    on it, because that is the one that has been worked on. */
function freeMirror(keepLeft){
  const P = S.free.pts;
  let moved = 0;
  P.forEach((q,i)=>{
    const onKept = keepLeft ? q.x <= 0.5 : q.x >= 0.5;
    if(onKept) return;
    const j = freeSymPartner(i);
    if(j < 0) return;
    q.x = 1 - P[j].x; q.y = P[j].y; q.r = P[j].r; moved++;
  });
  return moved ? `Mirrored ${moved} points onto the ${keepLeft?'right':'left'}.`
               : 'Nothing to mirror \u2014 no point on that side has a partner opposite it.';
}
/** Put the profile back in its 0-to-1 box and write the box out as W and H. */
function freeRenorm(){
  const P = S.free.pts, live = P.filter(p=>!p.skip);
  const use = live.length >= FREE_MIN ? live : P;
  if(!use.length) return;
  const xs = use.map(p=>p.x), ys = use.map(p=>p.y);
  const x0 = Math.min.apply(null,xs), x1 = Math.max.apply(null,xs);
  const y0 = Math.min.apply(null,ys), y1 = Math.max.apply(null,ys);
  const dx = x1-x0, dy = y1-y0;
  if(!(dx > 1e-4) || !(dy > 1e-4)) return;
  const lw = LIM['W'] || [60,600], lh = LIM['H'] || [60,520];
  S.W = Math.max(lw[0], Math.min(lw[1], Math.round(S.W*dx*2)/2));
  S.H = Math.max(lh[0], Math.min(lh[1], Math.round(S.H*dy*2)/2));
  P.forEach(p=>{ p.x = (p.x-x0)/dx; p.y = (p.y-y0)/dy; });
  // the node tests drive this without a page to write the numbers back into
  if(typeof document !== 'undefined'){ syncInput('W'); syncInput('H'); }
}
/** At most two ends, and the one you just marked is always one of them. */
function freeMark(i){
  const P = S.free.pts;
  P[i].m = !P[i].m;
  const on = P.map((q,k)=>q.m ? k : -1).filter(k=>k>=0);
  if(on.length > 2) on.filter(k=>k!==i).slice(0, on.length-2).forEach(k=>{ P[k].m = false; });
}
/** The shape this bag already has, as a profile to start pulling about. A barrel is the one
    that moves its numbers: its SIDE is the round end panel, so what was the length of the
    tube becomes the depth of the gusset and the ellipse becomes the outline. */
function seedFree(){
  const P = (x,y,r,m) => ({x, y, r:r||0, m:!!m, skip:false});
  const was = S.construction;
  if(was === 'barrel'){
    const a = Math.max(20, S.H/2), b = Math.max(12, S.D/2);
    /* basePts walks 72 facets so a tube reads as round in the model. Seventy-two points is
       not a shape anybody can edit: take every fourth one and the ellipse is still an
       ellipse, but now it is eighteen points you can actually take hold of. */
    const pts = basePts(a, b).filter((q,i)=>i % 4 === 0);
    const xs = pts.map(q=>q[0]), ys = pts.map(q=>q[1]);
    const x0 = Math.min.apply(null,xs), x1 = Math.max.apply(null,xs);
    const y0 = Math.min.apply(null,ys), y1 = Math.max.apply(null,ys);
    const out = pts.map(q=>P((q[0]-x0)/((x1-x0)||1), (q[1]-y0)/((y1-y0)||1)));
    // the two either side of the top, so the mouth is the top seam it always was
    const top = out.map((q,i)=>({i, y:q.y})).sort((c,d)=>c.y - d.y)[0].i;
    out[(top + 2) % out.length].m = true;
    out[(top - 2 + out.length) % out.length].m = true;
    const W2 = S.H, H2 = S.D, D2 = S.W;
    S.W = Math.max(60, Math.min(600, W2)); S.H = Math.max(60, Math.min(520, H2));
    S.D = Math.max(0, Math.min(520, D2));
    S.free = {pts:out, sym:!!(S.free && S.free.sym)};
    return 'Taken from the end panel of the barrel \u2014 that is its side. What was the length of the tube is now the depth of the gusset'
         + (S.D < D2 - 0.5 ? `, and it would not go past ${fmt(S.D)}.` : `, ${fmt(S.D)}.`);
  }
  const rB = was==='gusset' ? Math.min(S.corner, Math.min(S.W,S.H)/2) : was==='boxed' ? Math.min(12, S.W/8) : 0;
  const rT = topR();
  S.free = {pts:[P(0,0,rT,true), P(1,0,rT,true), P(1,1,rB), P(0,1,rB)], sym:!!(S.free && S.free.sym)};
  return 'Taken from the front of the bag. Drag a corner, drop a point in anywhere along an edge, and the gusset follows.';
}
/** The editor itself. Points on top of everything, because points are what you are here for. */
function renderShape(){
  FDRAGS = [];
  const W = S.W, H = S.H;
  const P = S.free.pts, F = freeProfile(W, H);
  const pad = Math.max(26, Math.max(W,H)*0.13), rr2 = Math.max(3.2, Math.max(W,H)/52);
  const vw = W + 2*pad, vh = H + 2*pad;
  const fs = Math.max(7, vw/62);
  let o = `<svg viewBox="${nn(-pad)} ${nn(-pad)} ${nn(vw)} ${nn(vh)}" id="freesvg" xmlns="http://www.w3.org/2000/svg">`;
  /* The same bench as the elevations: ten millimetres fine, fifty heavier, measured from the
     top left of the W x H box. Drawing a shape freehand and then trying to make it symmetric
     by eye is the thing this is for. */
  if(S.grid !== false){
    let gd = '', gm = '';
    const g0 = x => Math.ceil(-pad/10)*10 + x;
    for(let x = g0(0); x <= W + pad; x += 10){
      const d2 = `M ${nn(x)} ${nn(-pad)} V ${nn(H+pad)} `;
      if(Math.round(x) % 50) gd += d2; else gm += d2;
    }
    for(let y = g0(0); y <= H + pad; y += 10){
      const d2 = `M ${nn(-pad)} ${nn(y)} H ${nn(W+pad)} `;
      if(Math.round(y) % 50) gd += d2; else gm += d2;
    }
    o += `<g class="ev-gridg" aria-hidden="true"><path d="${gd}" class="ev-gridl"/><path d="${gm}" class="ev-gridl maj"/></g>`;
  }
  // both centre lines of the box, so symmetry is something you can see rather than guess
  o += `<path d="M ${nn(W/2)} ${nn(-pad*0.6)} V ${nn(H+pad*0.6)} M ${nn(-pad*0.6)} ${nn(H/2)} H ${nn(W+pad*0.6)}" class="ev-ctrl"/>`;
  o += `<path d="${poly(F.pts)}" class="ev-body"/>`;
  // the mouth has to be unmistakable: it is the one thing about the profile the drafter
  // cannot work out for itself, and everything else follows from where she puts it
  o += `<path d="${segsPath(polyArcSegs(F.pts, F.mouth.b, F.mouth.a))}" class="fp-body"/>`;
  o += `<path d="${segsPath(polyArcSegs(F.pts, F.mouth.a, F.mouth.b))}" class="fp-mouth"/>`;
  {
    // above the highest point of the arc, not of its two ends: the mouth usually bulges over
    // the top of them, and the label was landing on the line it is naming
    const arcQ = polyArcSegs(F.pts, F.mouth.a, F.mouth.b);
    let mx = 0, my = Infinity, n3 = 0;
    arcQ.forEach(sg=>{ mx += sg[1]; n3++; if(sg[2] < my) my = sg[2]; });
    if(!n3){ mx = F.pts[F.mouth.a][0]; my = F.pts[F.mouth.a][1]; n3 = 1; }
    o += `<text x="${nn(mx/n3)}" y="${nn(my - fs*0.8)}" font-size="${nn(fs*0.95)}"
           text-anchor="middle" class="fp-mt">MOUTH</text>`;
  }
  // the box the shape fills, which is what W and H mean
  o += `<path d="${rr(0,0,W,H,0)}" class="ev-gd"/>`;
  o += `<text x="${nn(W/2)}" y="${nn(-pad*0.28)}" font-size="${nn(fs)}" text-anchor="middle" class="ev-t">${
        esc(fmt(W) + ' \u00d7 ' + fmt(H) + '  \u00b7  ' + fmt(F.total) + ' round  \u00b7  mouth ' + fmt(F.mouthLen))}</text>`;
  // a plus on the middle of every edge: tap it and there is a new point there
  const live = P.map((q,i)=>({q, i})).filter(e=>!e.q.skip);
  const use = live.length >= FREE_MIN ? live : P.map((q,i)=>({q,i}));
  use.forEach((e,k)=>{
    const n2 = use[(k+1) % use.length];
    const mx = (e.q.x + n2.q.x)/2*W, my = (e.q.y + n2.q.y)/2*H;
    const id = 'fp-a'+e.i;
    o += `<g id="${id}" class="fp-add"><circle cx="${nn(mx)}" cy="${nn(my)}" r="${nn(rr2*1.3)}" class="fp-hit"/>`
       + `<circle cx="${nn(mx)}" cy="${nn(my)}" r="${nn(rr2*0.58)}" class="fp-addc"/>`
       + `<path d="M ${nn(mx-rr2*0.34)} ${nn(my)} h ${nn(rr2*0.68)} M ${nn(mx)} ${nn(my-rr2*0.34)} v ${nn(rr2*0.68)}" class="fp-addm"/>`
       + `<title>Put a point here</title></g>`;
    FDRAGS.push({id, add:e.i});
  });
  /* Every point carries its own NUMBER. The rail says "point 16 of 22" and the drawing said
     nothing at all, so finding the one it was talking about meant clicking round the outline.
     The number is pushed OUTWARD, away from the middle of the shape, so it never sits on the
     outline it belongs to. */
  const cxN = P.reduce((a,q)=>a+q.x, 0)/Math.max(1,P.length);
  const cyN = P.reduce((a,q)=>a+q.y, 0)/Math.max(1,P.length);
  P.forEach((q,i)=>{
    const x = q.x*W, y = q.y*H, id = 'fp-v'+i;
    const sel = FSELS.indexOf(i) >= 0;
    const cls = 'fp-pt' + (q.skip?' skip':'') + (q.m?' mouth':'') + (sel?' sel':'') + (FSEL===i?' anchor':'');
    let ux = (q.x - cxN)*W, uy = (q.y - cyN)*H;
    const uL = Math.hypot(ux, uy) || 1;
    ux = ux/uL*(rr2*2.9); uy = uy/uL*(rr2*2.9);
    o += `<g id="${id}" class="${cls}" data-fpt="${i}">`
       + `<circle cx="${nn(x)}" cy="${nn(y)}" r="${nn(rr2*2.1)}" class="fp-hit"/>`
       + `<circle cx="${nn(x)}" cy="${nn(y)}" r="${nn(rr2)}" class="fp-dot"/>`
       + (q.r > 0.5 ? `<circle cx="${nn(x)}" cy="${nn(y)}" r="${nn(Math.min(q.r, Math.max(W,H)/3))}" class="fp-rad"/>` : '')
       + `<text x="${nn(x+ux)}" y="${nn(y+uy+fs*0.34)}" font-size="${nn(fs*0.92)}" text-anchor="middle" class="fp-n">${i+1}</text>`
       + `<title>Point ${i+1}${q.m?' \u2014 an end of the mouth':''}${q.skip?' \u2014 skipped':''}</title></g>`;
    FDRAGS.push({id, i});
  });
  o += `<rect id="fp-band" class="fp-band" x="0" y="0" width="0" height="0" style="display:none"/>`;
  o += `</svg>`;
  const nSkip = P.filter(q=>q.skip).length;
  return `<div class="card wide" style="order:-1">
    <h3>Shape <span class="tag">drag a point \u00b7 tap a + to add one \u00b7 shift-click or drag a box to take several at once</span></h3>
    <div class="elevbox freebox">${o}</div>
    ${FSELS.length > 1 ? `<p class="note" style="padding-bottom:0"><b>${FSELS.length} points selected.</b>
      What you do next happens to all of them \u2014 the buttons are in the Shape panel on the left.</p>` : ''}
    <p class="note" style="padding-top:0">${P.length} points, ${nSkip ? nSkip + ' skipped, ' : ''}mouth
      ${fmt(F.mouthLen)} round the curve and ${fmt(F.chord)} straight across. The gusset is cut to the
      other ${fmt(F.bodyLen)}, and every point is a notch on both pieces \u2014 on a shape like this the
      notches are the only thing telling you where you are.</p>
  </div>`;
}
/** What the selected point or points can do. One card, shown twice: in the Shape module and
    in the little panel that opens where you clicked, exactly as every other part of the
    drawing behaves. Clicking a point on a shape she drew used to be the one thing in the app
    that only answered over in the rail. */
function pointCard(){
  const P = S.free.pts, many = FSELS.length > 1;
  const sel = (FSEL != null && P[FSEL]) ? P[FSEL] : null;
  if(!sel) return `<p class="hint"><b>Click a point on the drawing</b> to round it off, make it an end of the mouth, skip it or delete it. <b>Shift-click</b> adds another, and dragging a box across the drawing takes every point inside it.</p>`;
  const allSkip = FSELS.every(i=>P[i].skip), anyMouth = FSELS.some(i=>P[i].m);
  let o = `<p class="isec">${many ? FSELS.length + ' points selected \u00b7 ' + FSELS.map(i=>i+1).join(', ')
                                  : 'Point ' + (FSEL+1) + ' of ' + P.length}</p>`;
  o += `<div class="fld"><label>Round ${many?'these corners':'this corner'}</label><span class="val">
    <input type="number" data-fr="${FSEL}" value="${S.units==='in'?Math.round(sel.r/IN*16)/16:Math.round(sel.r*10)/10}"
     min="0" max="200" step="${S.units==='in'?0.0625:1}"><span class="u">${S.units==='in'?'in':'mm'}</span></span></div>`;
  o += `<div class="dgrow">
    <button class="btn${anyMouth?' pri':''}" data-fact="mouth">${many ? 'The mouth runs between these' : (sel.m?'An end of the mouth':'Mouth ends here')}</button>
    <button class="btn${allSkip?' pri':''}" data-fact="skip">${allSkip?'Skipped':(many?'Skip these':'Skip this point')}</button>
    <button class="btn" data-fact="del">Delete${many?' these':''}</button></div>`;
  o += `<div class="dgrow">
    <button class="btn" data-fact="straight">Straighten</button>
    <button class="btn" data-fact="smooth">Smooth the curve</button>
    <button class="btn" data-fact="none">Deselect</button></div>`;
  o += `<p class="hint"><b>Straighten</b> puts everything between the two ends of the run onto the line between them \u2014 one flat side. <b>Smooth</b> averages each point with its two neighbours; press it again for more. ${allSkip
    ? 'A skipped point is one the outline goes straight past. Un-skip it and the gusset follows it in again \u2014 that is the difference between a pentagon and a star.'
    : 'Skipping makes the outline go straight past a point without deleting it, so you can try a shape both ways.'}</p>`;
  return o;
}
/** The Shape module in the rail: where to start from, how it is edited, and the point card. */
function shapeHTML(){
  const P = S.free.pts;
  let o = `<p class="hint">Start from one of these, or take the shape the bag already had, then pull it about. W and H stay the size of the bag; the profile is the shape.</p>`;
  o += `<div class="fld"><label>Start from</label><span class="val">${
    pickHTML('', [['','Pick a shape\u2026']].concat(FREE_SHAPE_NAMES),
             'id="fshape" data-fshape="1" aria-label="Start from a shape"')}</span></div>`;
  o += `<div class="dgrow"><button class="btn" data-fact="seed">Take the shape of this bag</button></div>`;
  if(FREEMSG) o += `<p class="dgmsg">${esc(FREEMSG)}</p>`;
  o += `<div class="rule"></div>`;
  /* Symmetric editing. Most bags are symmetric and almost nothing she draws by hand is, so
     the choice is which of the two she is doing rather than a preference: with it on, moving
     a point moves the one opposite it as well, and the two stay a pair. A point with nothing
     opposite it - the odd one at the top or the bottom - simply moves on its own. */
  o += `<div class="sw"><span>Keep it symmetric while I drag</span><button class="tog" data-fsym="1" aria-pressed="${!!S.free.sym}" aria-label="Symmetric editing"></button></div>`;
  o += `<div class="dgrow">
    <button class="btn" data-fact="mirrorL">Mirror left \u2192 right</button>
    <button class="btn" data-fact="mirrorR">Mirror right \u2192 left</button></div>`;
  o += `<p class="hint">Free-form is the other way to work: turn it off and every point moves alone. Mirroring folds one finished half onto the other in one go.</p>`;
  o += `<div class="rule"></div>`;
  o += pointCard();
  o += `<div class="rule"></div>
    <p class="hint">The <b>mouth</b> is the arc between the two marked points, taken over the top. Everything else round the profile is what the gusset is stitched to, and the gusset is cut to exactly that length.</p>`;
  if(S.top==='roll' || S.top==='draw')
    o += `<p class="hint">A roll top and a drawstring both want a straight rim to fold or gather on, so this shape is drafted with the mouth left open. Flap, zip, magnet and open all work.</p>`;
  return o;
}

