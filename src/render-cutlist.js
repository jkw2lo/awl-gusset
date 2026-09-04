/* ============================================================
   RENDER \u2014 cut list & build order
   ============================================================ */
/* ============================================================
   HOW WELL THE HOLES FIT, AND WHAT WOULD FIX IT
   ============================================================
   Every run is fitted to a whole number of spaces, so the real pitch always drifts from the
   iron. On a 270 mm seam that drift is seven microns and nobody alive can see it. On a 40 mm
   tab a 3.85 iron can come out at 4.4, and THAT you can see - it reads as crowded, or as
   loose, against the run beside it.

   The other thing you can see is where the iron LANDS. A four-prong iron advances three
   spaces a strike, dropping its first prong into the last hole of the strike before. If a run
   is not a whole number of strikes the last one is short, and the end of a seam is exactly
   where the eye goes.

   Both of those move when the bag does, and neither is anybody's idea of a design decision:
   five millimetres on the width is nothing to the bag and can be the difference between six
   full strikes and five and a bit. So: score the draft, try the bag a few millimetres either
   way, and say so if one of them lands better. Nothing is changed until she says so. */
/* ---------- symmetry ----------
   Two things you see on a finished piece before you see anything else: whether the row round a
   tab comes out the same on both sides of its centre line, and whether the corners match. Her
   own example is the rounded end of a buckle tab - the flat row of five would be right if the
   middle three sat square on the centre and the two corners were a mirror image.

   It is arithmetic, not taste, and on a CLOSED run it is arithmetic you can do in one line.
   The holes go round at a fixed pitch p from wherever the walk started; the mirror about the
   run's own centre line maps arc position s to c - s, where c is twice the distance from the
   start to where the outline crosses that line. The mirrored set of holes is the SAME set of
   holes exactly when c is a whole number of pitches - so how far c is from the nearest whole
   number of pitches IS the asymmetry, and nothing has to be compared hole by hole.

   An OPEN run needs none of this: its mirror is s to L - s, which maps hole i to hole n - i,
   so a symmetric open run is always symmetric in its holes. The only question there is whether
   one lands ON the centre, which is what the even-count rule already settles.

   c an EVEN number of pitches puts a hole on the centre line; an odd number straddles it with
   a gap. Both are symmetric; she wants the first, so it is said rather than scored. */
const SYM_SAMPLES = 64;
/** How far a closed run's holes are from being a mirror image of themselves about one of the
    run's own centre lines. null when there is no such mirror to be off. */
function symErr(segs, n, closed, axis){
  if(!closed) return null;
  const L = runLen(segs), p = L/n;
  if(!(L > 4) || !(n > 2)) return null;
  const K = SYM_SAMPLES, pts = [];
  for(let i=0;i<K;i++) pts.push(ptAt(segs, L*i/K));
  const v = q => axis ? q.y : q.x, w = q => axis ? q.x : q.y;
  let lo = Infinity, hi = -Infinity;
  pts.forEach(q=>{ const t = v(q); if(t < lo) lo = t; if(t > hi) hi = t; });
  const span = hi - lo;
  if(!(span > 2)) return null;                       // nothing wide enough to have two sides
  const c0 = (lo + hi)/2;
  // where the outline crosses its own centre line - one crossing is all the involution needs
  let a = null;
  for(let i=0;i<K && a === null;i++){
    const da = v(pts[i]) - c0, db = v(pts[(i+1)%K]) - c0;
    if(Math.abs(da) < 1e-9) a = L*i/K;
    else if(da*db < 0) a = L*(i + da/(da - db))/K;
  }
  if(a === null) return null;
  // and it is only a mirror if the outline really does fold onto itself about that line
  const tol = Math.max(0.35, span*0.012);
  for(let i=1;i<=15;i++){
    const t = L*i/16;
    const q = ptAt(segs, t), r = ptAt(segs, ((2*a - t) % L + L) % L);
    if(Math.abs(v(r) - (2*c0 - v(q))) > tol || Math.abs(w(r) - w(q)) > tol) return null;
  }
  const c = 2*a, k = Math.round(c/p);
  const off = Math.abs(c - k*p)/p;                   // 0 is perfect, 0.5 is as bad as it gets
  return {err:off, onCentre: (Math.abs(k) % 2) === 0, pitch:p, n, axis};
}
/** Every closed run on the bag, scored. `cost` is what the search tries to bring down. */
function symScan(model){
  const runs = [];
  model.pieces.forEach(pc=>{
    if(pc.diagram || pc.derived) return;
    pc.draw.forEach(sm=>{
      if(sm.t !== 'seam' || !sm.closed) return;
      [0, 1].forEach(axis=>{
        const r = symErr(sm.segs, sm.n, sm.closed, axis);
        if(r) runs.push(Object.assign({piece:pc.name, key:sm.key,
          name:(SEAMPLAN[sm.key] && SEAMPLAN[sm.key].name) || sm.key}, r));
      });
    });
  });
  // one run counted once however many pieces carry it: a footprint and its own blank are the
  // same row twice, and counting both would say the same fault twice as loudly
  const seen = {}, uniq = [];
  runs.forEach(r=>{
    const k = r.key + '|' + r.axis;
    if(seen[k]) return;
    seen[k] = 1; uniq.push(r);
  });
  const off = uniq.filter(r=>r.err > SYM_OK);
  return {runs:uniq, off,
          cost: uniq.reduce((a,r)=>a + r.err*r.err, 0),
          worst: off.slice().sort((a,b)=>b.err - a.err)[0] || null};
}
const SYM_OK = 0.06;             // within 6% of the pitch reads as symmetric on the leather
/* Which number to try moving. An element's own footprint is driven by the element's own size,
   a tab's by the strap numbers, a body seam by the bag. W, H and D go on the end as the
   general levers, because on some bags they are the only ones there are. */
const SYM_BY_KEY = [
  [/^el(\d+)$/,                       'element'],
  [/^(tabbox|strapbox|buckletail|keeperlap|packanchor)$/, 'strap'],
  [/^(handlebox|handletab|handlering)$/, 'handles'],
];
function symPath(k){
  const m = /^el:(\d+):(w|h)$/.exec(k);
  return m ? {el:S.elements.find(e=>e.id === +m[1]), k:m[2]} : null;
}
function symGet(k){ const e = symPath(k); return e ? (e.el ? e.el[e.k] : null) : +get(k); }
function symSet(k, v){ const e = symPath(k); if(e){ if(e.el) e.el[e.k] = v; } else set(k, v); }
function symLim(k){ return symPath(k) ? [8, 400] : (limOf(k) || [10, 600]); }
function symLabel(k){
  const e = symPath(k);
  if(e) return e.el ? `${ELTYPES[e.el.type].name} ${e.el.id} \u2014 ${e.k==='w'?'width':'height'}` : k;
  return {W:'Width', H:'Height', D:'Depth', 'strap.width':'Strap width',
          'strap.tabLen':'Tab length on the bag', 'handles.width':'Handle width',
          'handles.attach':'Handle tail length'}[k] || k;
}
/** The numbers worth trying, chosen by what is actually out of line. Eight at most: past that
    it stops being a short list of things to try and becomes a search you have to read. */
function symLevers(base){
  const out = [], put = k => { if(out.indexOf(k) < 0 && symGet(k) != null) out.push(k); };
  base.off.slice().sort((a,b)=>b.err - a.err).forEach(r=>{
    const em = /^el(\d+)$/.exec(r.key);
    if(em){
      const el = S.elements.find(e=>e.id === +em[1]);
      if(el && !ELTYPES[el.type].point){ put('el:'+el.id+':w'); put('el:'+el.id+':h'); }
      return;
    }
    if(/^(tabbox|strapbox|buckletail|keeperlap|packanchor)$/.test(r.key)){ put('strap.width'); put('strap.tabLen'); return; }
    if(/^(handlebox|handletab|handlering)$/.test(r.key)){ put('handles.width'); put('handles.attach'); return; }
  });
  ['W','H','D'].forEach(put);
  return out.slice(0, 8);
}
const SYM_STEPS = [1, 2, 3, 4, 5, -1, -2, -3, -4, -5];
let SYMCACHE = null;
function symSig(){
  return [fitSig(), S.strap.width, S.strap.tabLen, S.handles.width, S.handles.attach,
          S.elements.map(e=>[e.id, e.type, e.w, e.h, e.fix, e.rot].join(',')).join(';')].join('|');
}
/* The search. Every trial re-drafts and the LAST draft has to be the real one, exactly as the
   stitch-fit search does: the seam registry describes the bag on screen, not a bag that was
   tried on the way. One millimetre at a time up to five, because symmetry is not a matter of
   a centimetre - a single millimetre moves a row by a whole hole. */
function symAdvice(){
  const sig = symSig();
  if(SYMCACHE && SYMCACHE.sig === sig) return SYMCACHE;
  const base = symScan(draft());
  const out = [];
  symLevers(base).forEach(k=>{
    const was = symGet(k), lim = symLim(k);
    if(was == null) return;
    SYM_STEPS.forEach(d=>{
      const v = was + d;
      if(v < lim[0] || v > lim[1]) return;
      let sc = null;
      try{ symSet(k, v); sc = symScan(draft()); }
      catch(err){ sc = null; }
      finally{ symSet(k, was); }
      if(!sc) return;
      out.push({k, label:symLabel(k), was, to:v, d, sc, gain: base.cost - sc.cost});
    });
  });
  draft();                       // the registry belongs to the bag on screen
  /* Worth saying only if it is a real improvement, and where two nudges are as good as each
     other, offer the smaller one - and growing rather than shrinking, which is the same
     preference the stitch-fit search already has. */
  const thresh = Math.max(0.004, base.cost*0.12);
  const nicer = (a, b2) => Math.abs(a.d) !== Math.abs(b2.d) ? (Math.abs(a.d) < Math.abs(b2.d) ? a : b2)
                         : (a.d > 0 ? a : b2);
  const byK = {};
  out.filter(o=>o.gain >= thresh).forEach(o=>{
    const cur = byK[o.k];
    if(!cur){ byK[o.k] = o; return; }
    if(o.gain > cur.gain*1.12) byK[o.k] = o;
    else if(o.gain >= cur.gain*0.88) byK[o.k] = nicer(o, cur);
  });
  const best = Object.keys(byK).map(k=>byK[k]).sort((a,b2)=>b2.gain - a.gain).slice(0, 3);
  SYMCACHE = {sig, base, best};
  return SYMCACHE;
}
const FIT_DRIFT = 10;            // how much a pitch off the iron costs, against one short strike
const FIT_LOOSE = 0.04;          // over 4% off the iron and a run reads as crowded or slack
function stitchFit(plan){
  const nom = S.stitch.pitch, step = Math.max(1, Math.round(S.stitch.prongs) - 1);
  let cost = 0, loose = 0, walk = 0, worst = null;
  plan.forEach(sm=>{
    if(!sm.n || !isFinite(sm.pitch) || !isFinite(sm.len) || sm.len <= 0) return;
    const w = Math.min(1, sm.len/120) * Math.max(1, sm.pieces || 1);
    const drift = Math.abs(sm.pitch - nom)/nom;
    const rem = sm.n % step, short = rem ? step - rem : 0;
    cost += w * (drift*FIT_DRIFT + short/step);
    if(drift > FIT_LOOSE){ loose++; if(!worst || drift > worst.drift) worst = {sm, drift}; }
    if(short) walk++;
  });
  return {cost, loose, walk, worst, seams:plan.length};
}
/** The bag, a few millimetres either way, scored. Only W, H and D: they are the numbers she
    actually chose, and a suggestion has to be one she can live with. */
const FIT_DIMS = [['W','Width'], ['H','Height'], ['D','Depth']];
const FIT_STEPS = [5, 10, -5, -10];
let FITCACHE = null;
function fitSig(){
  return [S.construction, S.W, S.H, S.D, S.sa, S.thickness, S.stitch.pitch, S.stitch.prongs,
          S.top, S.gussetStyle, S.taper, S.corner, S.topR, S.flap.drop, S.strap.type,
          S.elements.length].join('|');
}
function stitchAdvice(){
  const sig = fitSig();
  if(FITCACHE && FITCACHE.sig === sig) return FITCACHE;
  const base = stitchFit(draft().plan);
  const out = [];
  FIT_DIMS.forEach(([k, label])=>{
    const was = +get(k), lim = limOf(k);
    FIT_STEPS.forEach(d=>{
      const v = was + d;
      if(v < lim[0] || v > lim[1]) return;
      let fit = null;
      try{ set(k, v); fit = stitchFit(draft().plan); }
      catch(err){ fit = null; }
      finally{ set(k, was); }
      if(!fit) return;
      out.push({k, label, was, to:v, d, fit, gain: base.cost - fit.cost});
    });
  });
  draft();                       // the seam registry belongs to the bag on screen, not to a try
  /* Worth saying only if it is a real improvement. Where two nudges of the same number are
     as good as each other, offer the one she would rather take: a bag that grows five
     millimetres is an easier sentence than a bag that loses a centimetre. */
  const thresh = Math.max(0.5, base.cost*0.06);
  const nicer = (a, b2) => (a.d > 0) !== (b2.d > 0) ? (a.d > 0 ? a : b2)
                         : (Math.abs(a.d) <= Math.abs(b2.d) ? a : b2);
  const byDim = {};
  out.filter(o=>o.gain >= thresh).forEach(o=>{
    const cur = byDim[o.k];
    if(!cur){ byDim[o.k] = o; return; }
    if(o.gain > cur.gain*1.15) byDim[o.k] = o;
    else if(o.gain >= cur.gain*0.85) byDim[o.k] = nicer(o, cur);
  });
  const best = Object.keys(byDim).map(k=>byDim[k]).sort((a,b2)=>b2.gain - a.gain);
  FITCACHE = {sig, base, best: best.slice(0, 3)};
  return FITCACHE;
}
/** What one suggestion buys, in the words you would use at the bench. */
function fitWhy(base, o){
  const bits = [];
  if(o.fit.walk < base.walk)
    bits.push(`${base.walk - o.fit.walk} more seam${base.walk - o.fit.walk > 1 ? 's' : ''} end on a full strike of the iron`);
  if(o.fit.loose < base.loose)
    bits.push(`${base.loose - o.fit.loose} fewer run${base.loose - o.fit.loose > 1 ? 's' : ''} pricked well off the ${fmtPitch(S.stitch.pitch)} iron`);
  if(!bits.length) bits.push('every run sits closer to the iron it was planned for');
  return bits.join(', and ') + '.';
}
function fitCard(){
  const A = stitchAdvice(), b = A.base;
  const step = Math.max(1, Math.round(S.stitch.prongs) - 1);
  const state = !b.walk && !b.loose ? 'every run lands clean'
              : b.walk && b.loose ? `${b.walk} run${b.walk>1?'s':''} end mid-strike, ${b.loose} pricked well off the iron`
              : b.walk ? `${b.walk} run${b.walk>1?'s':''} end mid-strike`
              : `${b.loose} run${b.loose>1?'s':''} pricked well off the iron`;
  let o = `<div class="card" style="margin-bottom:18px">
    <h3>Stitch fit <span class="tag">${esc(state)}</span></h3>
    <p class="note">Two things you can see on a finished bag, and both of them move when the
      dimensions do. A run is <b>pricked off the iron</b> when it has been squeezed or stretched
      more than ${(FIT_LOOSE*100).toFixed(0)}% to make a whole number of spaces \u2014 on a short
      tab that is the difference between ${fmtPitch(S.stitch.pitch)} and ${fmtPitch(S.stitch.pitch*1.06)}.
      A run <b>ends mid-strike</b> when its spaces are not a multiple of ${step}, so the last
      strike of your ${S.stitch.prongs}-prong iron is a short one and you have to fudge the end.</p>`;
  if(!A.best.length){
    o += `<p class="note">${b.walk || b.loose
      ? `Nothing within a centimetre either way lands better than this \u2014 the sizes you have are as good as five or ten millimetres can make them.`
      : `Nothing to fix: every run is a whole number of strikes and sits on the iron.`}</p></div>`;
    return o;
  }
  o += `<p class="note">A few millimetres either way would land the holes better. Nothing changes until you say so.</p>
    <div class="fitlist">` + A.best.map(sg=>`<div class="fitrow">
      <button class="btn pri" data-fit="${sg.k}:${nn(sg.to)}">${sg.label} ${fmt(sg.was)} \u2192 <b>${fmt(sg.to)}</b></button>
      <span>${esc(fitWhy(b, sg))}</span></div>`).join('') + `</div>
    <p class="note">These are the only three numbers tried, five and ten millimetres each way,
      because they are the ones you chose and the ones you can live with moving. Everything else
      on the bag \u2014 the seam allowance, the iron, the corner radius \u2014 changes the fit too,
      and this panel re-reads it the moment you move any of them.</p></div>`;
  return o;
}
/** Which way the mirror runs, in the words you would use holding the piece. */
const SYM_AXIS = ['about its vertical centre line', 'about its horizontal centre line'];
function symCard(){
  const A = symAdvice(), b = A.base;
  if(!b.runs.length) return '';        // nothing on this bag is stitched round a closed shape
  const n = b.off.length;
  const state = n ? `${n} row${n>1?'s':''} out of line` : 'every row comes out even';
  let o = `<div class="card" style="margin-bottom:18px">
    <h3>Symmetry &amp; corners <span class="tag">${esc(state)}</span></h3>
    <p class="note">A row that goes right round a shape \u2014 a tab, a handle end, a pocket
      footprint, the end panel of a barrel \u2014 starts at one corner and steps round at the
      pitch of your iron. Whether it comes out a mirror image of itself is arithmetic:
      <b>twice the distance from where the row starts to where it crosses the centre line has
      to be a whole number of holes.</b> When it is not, the two sides of the piece are half a
      hole apart, the corners stop matching, and no amount of care with the awl will fix it \u2014
      it was decided by the size of the piece before you pricked anything.</p>`;
  if(n){
    o += `<table class="symtab"><thead><tr><th>Row</th><th>On</th><th class="n">Out by</th><th>Centre</th></tr></thead><tbody>`
      + b.off.slice().sort((x,y)=>y.err - x.err).slice(0, 6).map(r=>`<tr>
        <td>${esc(r.name)} <small>${esc(SYM_AXIS[r.axis])}</small></td>
        <td><small>${esc(r.piece)}</small></td>
        <td class="n"><b>${(r.err*100).toFixed(0)}%</b><small> of a hole</small></td>
        <td><small>${r.onCentre ? 'a hole is on it' : 'a gap straddles it'}</small></td></tr>`).join('')
      + `</tbody></table>`;
  } else {
    o += `<p class="note">Every closed row on this bag lands as a mirror image of itself. That
      is the state to save the design in.</p>`;
  }
  if(A.best.length){
    o += `<p class="note">A millimetre or two either way lands them better. Nothing changes until you say so.</p>
      <div class="fitlist">` + A.best.map(sg=>{
        const left = sg.sc.off.length;
        return `<div class="fitrow">
          <button class="btn pri" data-symfit="${esc(sg.k)}:${nn(sg.to)}">${esc(sg.label)} ${fmt(sg.was)} \u2192 <b>${fmt(sg.to)}</b></button>
          <span>${left ? `${b.off.length - left > 0 ? `${b.off.length - left} row${b.off.length-left>1?'s':''} come${b.off.length-left>1?'':'s'} into line` : 'the rows that are out get closer to it'}, ${left} still out.`
                       : 'every closed row on the bag comes out symmetric.'}</span></div>`;
      }).join('') + `</div>`;
  } else if(n){
    o += `<p class="note">Nothing within five millimetres of any of these numbers lands them
      better, which usually means the pitch is the thing to move rather than the size: the row
      is fitted to a whole number of holes, so a ${fmtPitch(S.stitch.pitch)} iron and a
      ${fmtPitch(S.stitch.pitch*1.08)} one divide the same outline quite differently. The other
      lever is the corner radius on the piece, which changes how far round the outline the
      centre line falls.</p>`;
  }
  o += `<p class="note"><b>At the bench.</b> Two rows that share a seam key are pricked to the
    same count, so fixing one fixes both. Where a row is a footprint on a panel and a box on
    its own blank \u2014 a tab, a handle end \u2014 both are the same arithmetic and both come
    right together. And a row that reads <i>a gap straddles it</i> is symmetric but has no hole
    on the centre mark: nudge the size by one more hole's worth and the middle of the row lands
    square on the line instead of either side of it.</p></div>`;
  return o;
}
function renderCut(model){
  const st = model.stats, sq = mm2 => (mm2/92903.04);
  // the assembly drawings live on the pattern sheets, not in the list of things to cut
  const rows = model.pieces.filter(p=>!p.diagram).map(p=>`<tr>
    <td><b>${esc(p.name)}</b></td>
    <td class="n">${p.qty}</td>
    <td><span class="pill ${p.mat==='Lining'?'lin':'lea'}">${p.mat}</span></td>
    <td class="n">${fmt(p.w)} \u00d7 ${fmt(p.h)}</td>
    <td class="f" style="white-space:pre-line">${esc(p.formula)}</td></tr>`).join('');
  const hide = sq(st.leather);
  const hideAdvice = hide<=4 ? 'a small panel or offcut will do'
    : hide<=9 ? 'one double shoulder (about 9\u201312 sq ft) covers this'
    : hide<=18 ? 'a side (about 18\u201322 sq ft) covers this comfortably'
    : 'you are into full-hide territory \u2014 plan the layout before you cut';
  return `
  <h2 class="pt">Cut list</h2>
  <p class="pd">Every dimension below is a <b>cut</b> size \u2014 allowances are already in it. The formula column shows how each number was reached, so you can argue with any of them and change the input instead of the pattern.</p>
  <div class="card" style="margin-bottom:18px">
    <h3>Pieces <span class="tag">${st.pieces} to cut \u00b7 ${st.unique} shapes</span></h3>
    <div class="tbl"><table>
      <thead><tr><th>Piece</th><th>Cut</th><th>Material</th><th>Cut size</th><th>How it was worked out</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </div>
  <div class="grid2" style="margin-bottom:18px">
    <div class="card">
      <h3>Leather &amp; thread</h3>
      <div class="kv">
        <div><span>Pieces, bounding area</span><span>${sq(st.rawLeather).toFixed(2)} sq ft</span></div>
        <div><span>With ${S.waste}% waste</span><span><b>${hide.toFixed(2)} sq ft</b></span></div>
        <div><span>Metric</span><span>${(st.leather/10000).toFixed(1)} dm\u00b2</span></div>
        ${st.lining>0?`<div><span>Lining</span><span>${sq(st.lining).toFixed(2)} sq ft</span></div>`:''}
        <div><span>Thickness</span><span>${fmt(S.thickness)} \u00b7 ${(S.thickness/0.397).toFixed(1)} oz</span></div>
        <div><span>Thread, all seams</span><span>${fmtLen(st.thread)}</span></div>
        <div><span>Holes to prick</span><span>${st.stitches.toLocaleString()}</span></div>
      </div>
      <p class="note">Thread is the total across every seam, at 3.5\u00d7 seam length for saddle stitching \u2014 cut it in arm-spans, not in one piece.</p>
      <p class="note">Buying leather: ${hideAdvice}. The waste figure assumes you lay pieces on a hide with holes and thin bellies in it \u2014 drop it to 15% for a clean panel, raise it to 45% if you are matching grain across the front.</p>
    </div>
    <div class="card">
      <h3>Hardware</h3>
      <div class="kv">${model.hw.map(h=>`<div><span>${esc(h.n)}</span><span>\u00d7${h.q}</span></div>`).join('')}</div>
      <p class="note">Ring and snap sizes are quoted as <b>inside width</b> \u2014 that is the number that has to match your strap, not the overall size on the packet.</p>
    </div>
  </div>
  <div class="card" style="margin-bottom:18px">
    <h3>Stitch plan <span class="tag">${fmtPitch(st.pitch)} iron \u00b7 ${S.stitch.prongs} prong \u00b7 ${st.stitches.toLocaleString()} holes</span></h3>
    <div class="tbl"><table>
      <thead><tr><th>Seam</th><th>Repeats</th><th>Run</th><th>Holes each</th><th>Real pitch</th><th>Strikes of the iron</th></tr></thead>
      <tbody>${model.plan.map(function(p){
        const drift = p.pitch - S.stitch.pitch;
        return `<tr>
          <td><b>${esc(p.name)}</b></td>
          <td class="n">${p.pieces}\u00d7</td>
          <td class="n">${fmt(p.len)}</td>
          <td class="n"><b>${p.holes}</b> <span style="color:var(--text-3)">(${p.n} spaces)</span></td>
          <td class="n">${fmtPitch(p.pitch)} <span style="color:var(--text-3)">${drift>=0?'+':'\u2212'}${(Math.abs(drift)*1000).toFixed(0)} \u00b5m</span></td>
          <td class="n">${p.strikes}</td></tr>`;
      }).join('')}</tbody>
    </table></div>
    <p class="note">${S.construction==='boxed' ? '<b>There is no seam across the base.</b> A boxed body is one piece folded at the base centre, so the only stitching down there is the two corner boxing lines listed above. ' : ''}Every hole is set at least the ${fmt(S.sa)} seam allowance in from the cut edge, and every run stops that far short of the edge it meets \u2014 nothing lands on a corner you would tear out. The card slot stack is the one place a count deliberately varies: every slot shares one bottom edge and one hole grid, so a shorter slot carries fewer holes from that same grid and still lines up. Every other run is fitted to a <b>whole number of holes</b>, which is why the real pitch drifts a few microns from the ${fmtPitch(S.stitch.pitch)} iron \u2014 far less than you can see, and it means a run never ends on a half space. <b>Repeats</b> is how many runs you prick to that plan \u2014 a mating pair counts twice, because both halves get the identical count and so cannot creep against each other. Runs marked with a circled hole have one hole exactly on the centre mark \u2014 start there and work out to each end. With a ${S.stitch.prongs}-prong iron, drop the first prong into the last hole of the previous strike, so each strike advances ${S.stitch.prongs-1} spaces.</p>
  </div>
  ${fitCard()}
  ${symCard()}
  <div class="card">
    <h3>Build order</h3>
    <ol class="steps">${model.steps.map(s=>`<li>${s}</li>`).join('')}</ol>
  </div>`;
}

