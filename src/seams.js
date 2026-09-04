/* ============================================================
   SEAMS AND STITCH HOLES
   A seam is a run of segments: ['L',x1,y1,x2,y2] or ['A',cx,cy,r,a0,a1],
   where the point at angle a is (cx + r*cos a, cy + r*sin a).
   Two pieces that get sewn to each other share a seam KEY, so the run is
   planned once and both pieces carry an identical hole count.
   ============================================================ */
function segLen(s){ return s[0]==='L' ? Math.hypot(s[3]-s[1], s[4]-s[2]) : s[3]*Math.abs(s[5]-s[4]); }
function runLen(segs){ let L=0; for(const s of segs) L += segLen(s); return L; }
function segEnds(s){
  if(s[0]==='L') return [[s[1],s[2]],[s[3],s[4]]];
  return [[s[1]+s[3]*Math.cos(s[4]), s[2]+s[3]*Math.sin(s[4])],
          [s[1]+s[3]*Math.cos(s[5]), s[2]+s[3]*Math.sin(s[5])]];
}
function segsPath(segs){
  let d = '', cur = null;
  for(const s of segs){
    const e = segEnds(s), p0 = e[0], p1 = e[1];
    if(!cur || Math.abs(cur[0]-p0[0])>1e-6 || Math.abs(cur[1]-p0[1])>1e-6) d += 'M ' + nn(p0[0]) + ' ' + nn(p0[1]) + ' ';
    if(s[0]==='L') d += 'L ' + nn(p1[0]) + ' ' + nn(p1[1]) + ' ';
    else {
      const sweep = s[5] > s[4] ? 1 : 0, large = Math.abs(s[5]-s[4]) > Math.PI ? 1 : 0;
      d += 'A ' + nn(s[3]) + ' ' + nn(s[3]) + ' 0 ' + large + ' ' + sweep + ' ' + nn(p1[0]) + ' ' + nn(p1[1]) + ' ';
    }
    cur = p1;
  }
  return d.trim();
}
/** Point and tangent angle at distance d along the run. */
function ptAt(segs, d){
  for(let i=0;i<segs.length;i++){
    const s = segs[i], L = segLen(s);
    if(d <= L + 1e-9 || i === segs.length-1){
      const u = L ? Math.max(0, Math.min(1, d/L)) : 0;
      if(s[0]==='L') return {x:s[1]+(s[3]-s[1])*u, y:s[2]+(s[4]-s[2])*u, a:Math.atan2(s[4]-s[2], s[3]-s[1])};
      if(!s[3]) return {x:s[1], y:s[2], a:0};
      const dir = s[5] >= s[4] ? 1 : -1, a = s[4] + (s[5]-s[4])*u;
      return {x:s[1]+s[3]*Math.cos(a), y:s[2]+s[3]*Math.sin(a), a:a + dir*Math.PI/2};
    }
    d -= L;
  }
  return {x:0, y:0, a:0};
}
/** Shorten a segment to the sub-range [d0, d1] of its own length. */
function subSeg(s, d0, d1){
  if(s[0]==='L'){
    const L = segLen(s) || 1, u0 = d0/L, u1 = d1/L;
    return ['L', s[1]+(s[3]-s[1])*u0, s[2]+(s[4]-s[2])*u0,
                 s[1]+(s[3]-s[1])*u1, s[2]+(s[4]-s[2])*u1];
  }
  const r = s[3], dir = s[5] >= s[4] ? 1 : -1;
  return ['A', s[1], s[2], r, s[4] + dir*(d0/r), s[4] + dir*(d1/r)];
}
/** Pull a run back at each end. Mating runs are equal length, so they stay matched. */
function trimRun(segs, d0, d1){
  if(d1 == null) d1 = d0;
  if(!d0 && !d1) return segs;
  let out = segs.map(s=>s.slice());
  let left = d0;
  while(left > 1e-9 && out.length){
    const L = segLen(out[0]);
    if(L > left + 1e-9){ out[0] = subSeg(out[0], left, L); left = 0; }
    else { left -= L; out.shift(); }
  }
  left = d1;
  while(left > 1e-9 && out.length){
    const i = out.length-1, L = segLen(out[i]);
    if(L > left + 1e-9){ out[i] = subSeg(out[i], 0, L-left); left = 0; }
    else { left -= L; out.pop(); }
  }
  return out.length ? out : segs;
}
/** The same run walked the other way. Two runs that have to be pricked from the same datum -
    the two sides of a pocket, counted down from its mouth - must both START at that datum, or
    the counting ticks on one run count from the top and on the other from the bottom. */
function revSeg(s){
  return s[0]==='L' ? ['L', s[3], s[4], s[1], s[2]] : ['A', s[1], s[2], s[3], s[5], s[4]];
}
function revRun(segs){ return segs.slice().reverse().map(revSeg); }
/** A stitch box walked from the corner at the strap's far end, across the width first,
    so the same box drawn on the panel and on the strap lands hole-for-hole. */
function strapBox(x, y, w, h, i, axis, far){
  const alongL = axis==='y' ? h : w, acrossW = axis==='y' ? w : h;
  const a0 = i, a1 = alongL - i, b0 = i, b1 = acrossW - i;
  const map = (a,b) => {
    if(axis==='y') return far==='start' ? [x + w - b, y + a] : [x + b, y + h - a];
    return far==='start' ? [x + a, y + b] : [x + w - a, y + h - b];
  };
  const P0 = map(a0,b0), P1 = map(a0,b1), P2 = map(a1,b1), P3 = map(a1,b0);
  return [['L',P0[0],P0[1],P1[0],P1[1]], ['L',P1[0],P1[1],P2[0],P2[1]],
          ['L',P2[0],P2[1],P3[0],P3[1]], ['L',P3[0],P3[1],P0[0],P0[1]]];
}

const SEAMPLAN = {};
function resetPlan(){ for(const k in SEAMPLAN) delete SEAMPLAN[k]; }
/** Plan a seam once; every piece sharing the key reuses the same hole count. */
function planSeam(key, name, len, even, closed){
  if(SEAMPLAN[key]){ SEAMPLAN[key].pieces++; return SEAMPLAN[key]; }
  // nearest whole number of spaces; for a symmetric run, the nearest EVEN number,
  // which puts one hole exactly on the centre mark
  let n = even ? 2*Math.round(len/(2*S.stitch.pitch)) : Math.round(len/S.stitch.pitch);
  n = Math.max(even ? 2 : 1, n);
  const prongs = Math.max(2, S.stitch.prongs);
  SEAMPLAN[key] = {key, name, len, n, holes:closed?n:n+1, pitch:len/n, even:!!even, closed:!!closed,
                   strikes:Math.ceil(n/(prongs-1)), pieces:1};
  return SEAMPLAN[key];
}
function SEAM(key, name, segs, opt){
  opt = opt || {};
  if(opt.trim) segs = trimRun(segs, opt.trim);
  // The run is measured BEFORE it is crowned and the measurement is kept on the seam. The
  // crown adds a few microns of arc; planning off it, or comparing two mating pieces on it,
  // would be comparing drawing decoration rather than the seam itself.
  const len0 = runLen(segs);
  // a closed box is a footprint, not an edge: only open runs follow a cut edge
  if(ENT.length && !opt.closed && opt.crown !== false) segs = entCrown(segs);
  const pl = planSeam(key, name, opt.planLen != null ? opt.planLen : len0, opt.even, opt.closed);
  const n = opt.n != null ? Math.max(1, opt.n) : pl.n;
  return {t:'seam', key, segs, d:segsPath(segs), n, closed:!!opt.closed, len:len0,
          // how far this row sits from the cut edge it follows. Only a run that follows one
          // has an answer: a footprint in the middle of a panel has no edge to measure from,
          // and a number invented for it would be a number she measures against and cannot find.
          ins: opt.ins != null ? opt.ins : null,
          through: opt.through !== undefined ? !!opt.through : !!THROUGH_BOTH[key],
          mid:!!opt.even && n===pl.n};
}
const boxRun = (x0,y0,x1,y1) => [['L',x0,y0,x1,y0],['L',x1,y0,x1,y1],['L',x1,y1,x0,y1],['L',x0,y1,x0,y0]];

/** Footprint of a pocket, strap end, tab or handle tail on a panel: how it is fixed, and -
    for anything you put a hand into - which way it opens. Everything is built in the element's
    own upright frame and rotated as one piece, so a rotated footprint keeps its exact shape,
    hole count and spacing. */
/* Which footprints end in a free, shaped end, and which are pricked through two layers at
   once. Both sides of a seam have to answer these the same way or the counts drift apart, so
   the answer lives with the KEY rather than with each call. */
const SHAPED_END = {strapbox:1, tabbox:1, handlebox:1, handletab:1, handlering:1,
                    packanchor:1, buckletail:1, rolltab:1, rollanchor:1, el:0};
const THROUGH_BOTH = {tabbox:1, handlering:1, buckletail:1, keeperlap:1, slip:1, pulltab:1,
                      rollanchor:1, zipbag:1, ziptab:1, zippull:1, cardside:0};
function attachOn(d, x, y, w, h, key, name, opts){
  opts = opts || {};
  if(opts.tipShape === undefined) opts.tipShape = SHAPED_END[key] ? S.strap.tip : null;
  if(opts.through === undefined) opts.through = !!THROUGH_BOTH[key];
  const axis = opts.axis || 'y';                 // 'y' = the strap runs down the drawing
  const fix  = opts.fix || S.strap.tabFix;
  const deg  = opts.deg || 0;
  const cx = x + w/2, cy = y + h/2;
  const px0 = opts.pivot ? opts.pivot[0] : cx, py0 = opts.pivot ? opts.pivot[1] : cy;
  const R  = segs => rotSegs(segs, px0, py0, deg);
  const RP = (ax,ay) => deg ? rotPt(ax, ay, px0, py0, deg*Math.PI/180) : [ax,ay];
  if(opts.tipShape && tipLen(axis==='y' ? w : h, opts.tipShape) > 0){
    // the footprint on the bag is the actual outline of the strap end, shaped end and all -
    // the stitched box inside it stays square, because that is what you prick
    d.push({t:'mark', d:poly(footTip(x, y, w, h, axis, opts.far || 'end', opts.tipShape)
                              .map(q=>RP(q[0], q[1])))});
  } else {
    d.push({t:'mark', d:segsPath(R(rectSegs(x, y, w, h, opts.r != null ? opts.r : 1.5)))});
  }
  if(opts.xbox){
    const a=RP(x,y), b=RP(x+w,y+h), c2=RP(x+w,y), e=RP(x,y+h);
    d.push({t:'mark', d:`M ${nn(a[0])} ${nn(a[1])} L ${nn(b[0])} ${nn(b[1])} M ${nn(c2[0])} ${nn(c2[1])} L ${nn(e[0])} ${nn(e[1])}`});
  }
  const opening = !!opts.open;            // a mouth must never be stitched shut
  const stitched = fix==='stitch' || fix==='stitchbox' || fix==='stitch3' || fix==='both';
  if(stitched && !opening){
    const i = Math.max(2, Math.min(S.sa, w/5, h/5));
    const shaped = opts.tipShape && tipLen(axis==='y' ? w : h, opts.tipShape) > 0;
    d.push(SEAM(key, name,
      R(shaped ? footTipRun(x, y, w, h, axis, opts.far||'end', opts.tipShape, i)
               : strapBox(x, y, w, h, i, axis, opts.far||'end')),
      {closed:true, through:opts.through}));
  }
  if(stitched && opening){
    // folded: the edge opposite the mouth is a fold, so only the two sides are stitched, and
    // they are two runs - see rectRunSides. `run` is the escape hatch for a footprint that is
    // not one lap of the box - a bellows pocket skips its two folded corners - and BOTH sides
    // of the seam must pass the same one.
    const mi = Math.min(S.sa, Math.min(w,h)/4);
    if(opts.folded){
      rectRunSides(x, y, w, h, opts.r||0, opts.open, S.sa, mi)
        .forEach(run => d.push(SEAM(key, name, R(run), {even:true})));
    } else {
      const run = opts.run ? opts.run(x, y, w, h, opts.open)
                           : rectRunOpen(x, y, w, h, opts.r||0, opts.open);
      d.push(SEAM(key, name, R(run), {even:true, trim:mi}));
    }
  }
  if(opts.open){
    const s = opts.open, L = Math.min(9, Math.max(5, Math.min(w,h)/3));
    const m  = s==='top' ? [cx,y] : s==='bottom' ? [cx,y+h] : s==='left' ? [x,cy] : [x+w,cy];
    const n2 = s==='top' ? [0,-1] : s==='bottom' ? [0,1] : s==='left' ? [-1,0] : [1,0];
    const tip=RP(m[0]+n2[0]*L, m[1]+n2[1]*L), tail=RP(m[0]-n2[0]*L*0.35, m[1]-n2[1]*L*0.35);
    const w1=RP(m[0]+n2[0]*L*0.45-n2[1]*L*0.32, m[1]+n2[1]*L*0.45+n2[0]*L*0.32);
    const w2=RP(m[0]+n2[0]*L*0.45+n2[1]*L*0.32, m[1]+n2[1]*L*0.45-n2[0]*L*0.32);
    d.push({t:'mark', d:`M ${nn(tail[0])} ${nn(tail[1])} L ${nn(tip[0])} ${nn(tip[1])}`
      + ` M ${nn(w1[0])} ${nn(w1[1])} L ${nn(tip[0])} ${nn(tip[1])} L ${nn(w2[0])} ${nn(w2[1])}`});
  }
  if(fix==='rivet' || fix==='both'){
    const spec = opts.rivetSpec || (opts.rivets != null ? rivetSpecOf(opts.rivets) : strapRivetSpec());
    rivetPts(x, y, w, h, axis, opts.far || 'end', spec, opts.tipShape).forEach((q,i)=>{
      const pp = RP(q[0], q[1]);
      d.push({t:'hole', x:pp[0], y:pp[1], r:1.6, label:i===0?'RIVET':''});
    });
  }
  if(opts.label){
    const sz = Math.min(4.2, (axis==='y'?w:h)*0.28);
    const p = RP(cx, cy + sz*0.35);
    d.push({t:'text', x:p[0], y:p[1], s:opts.label, size:sz, anchor:'middle', mark:true,
            rot:(((opts.rot||0) + deg) % 360)});
  }
}
/* ---------- rivets ----------
   One definition of where a rivet goes, read by the pattern AND by the elevations. Two
   copies of this rule is why the tab on the drawing had its rivets in one place and the tab
   on the pattern had them in another.

   Rows are measured in from the FREE end, and on a shaped end from where the shape starts -
   not from the point. Nine millimetres in from an almond tip is four millimetres of leather,
   and a pair set six either side of the centre line there is two holes in fresh air. */
function rivetRows(spec){ return (RIVET_PATS[spec && spec.pat] || RIVET_PATS.across2).rows; }
function rivetCount(spec){ return rivetRows(spec).reduce((a,r)=>a+r.length, 0); }
function rivetSpecOf(n){
  return Object.assign({pat: RIVET_BY_N[Math.max(1, Math.min(6, Math.round(n || 2)))] || 'across2'}, RIVET_DEF);
}
/** ONE reader for a rivet arrangement, whoever is carrying it - the strap, the handles or an
    element. Anything that can be riveted now holds the same four fields, and anything that
    only ever held a COUNT (an old design, a preset written before this) has an arrangement
    read back out of that count rather than being silently given the default. */
function rivetSpecAt(o){
  if(!o) return Object.assign({}, RIVET_DEF, {pat:'across2'});
  const pat = (o.rivetPat && RIVET_PATS[o.rivetPat]) ? o.rivetPat
            : (RIVET_BY_N[Math.max(1, Math.min(6, Math.round(o.rivets || 2)))] || 'across2');
  const n = (k, d) => (typeof o[k] === 'number' && isFinite(o[k])) ? o[k] : d;
  return {pat, inset:n('rivetInset', RIVET_DEF.inset), pitch:n('rivetPitch', RIVET_DEF.pitch),
          edge:n('rivetEdge', RIVET_DEF.edge)};
}
/** ONE sanitiser for an arrangement, run over the strap, the handles and every element. A
    design written before the arrangements had names carries either a rows/cols pair or just a
    count: read whichever is there back into a named pattern rather than losing it. */
function sanitiseRivets(o){
  const num = (v,d) => (typeof v === 'number' && isFinite(v)) ? v : d;
  if(!RIVET_PATS[o.rivetPat]){
    const rw = Math.round(num(o.rivetRows, 0)), cl = Math.round(num(o.rivetCols, 0));
    const cnt = Math.max(1, Math.min(6, Math.round(num(o.rivets, 2))));
    o.rivetPat = (rw && cl)
      ? (cl === 1 ? (rw >= 3 ? 'along3' : rw === 2 ? 'along2' : 'one')
        : cl >= 3 ? (rw >= 2 ? 'six' : 'across3')
        : rw >= 3 ? 'six' : rw === 2 ? 'quad' : 'across2')
      : (RIVET_BY_N[cnt] || 'across2');
  }
  delete o.rivetRows; delete o.rivetCols;
  o.rivetInset = Math.max(3, Math.min(200, num(o.rivetInset, RIVET_DEF.inset)));
  o.rivetPitch = Math.max(5, Math.min(60, num(o.rivetPitch, RIVET_DEF.pitch)));
  o.rivetEdge  = Math.max(2.5, Math.min(200, num(o.rivetEdge, RIVET_DEF.edge)));
  o.rivets = rivetCount(rivetSpecAt(o));          // the count always follows the arrangement
  return o;
}
function strapRivetSpec(){ return rivetSpecAt(S.strap); }
function strapRivets(){ return rivetCount(strapRivetSpec()); }
/** The rivet pattern on one attachment, in the drawing's own frame. Nothing is ever placed
    nearer the cut edge than `edge`, and the rows are squeezed rather than run off the back
    of the tab. */
function rivetPts(x, y, w, h, axis, far, spec, tip){
  spec = spec || Object.assign({pat:'across2'}, RIVET_DEF);
  const rows = rivetRows(spec);
  const across = axis==='y' ? w : h, along = axis==='y' ? h : w;
  const T = tip ? Math.min(tipLen(across, tip), along*0.55) : 0;
  const edge = Math.max(2.5, Math.min(spec.edge != null ? spec.edge : RIVET_DEF.edge, across/2 - 1.2));
  const half = Math.max(0, across/2 - edge);
  const room = Math.max(2, along - T - edge);            // the length behind the shaped end
  const p0 = Math.max(5, spec.pitch != null ? spec.pitch : RIVET_DEF.pitch);
  const pitch = rows.length > 1 ? Math.min(p0, Math.max(4, (room - 3)/(rows.length-1))) : p0;
  const i0 = Math.max(3, spec.inset != null ? spec.inset : RIVET_DEF.inset);
  const inset = Math.max(3, Math.min(i0, room - (rows.length-1)*pitch));
  const cAcr = axis==='y' ? x + w/2 : y + h/2;
  const tipEnd = far==='start' ? (axis==='y' ? y : x) : (axis==='y' ? y+h : x+w);
  const dir = far==='start' ? 1 : -1;
  const out = [];
  rows.forEach((offs, r)=>{
    const a = T + inset + r*pitch;
    offs.forEach(u => out.push(axis==='y' ? [cAcr + u*half, tipEnd + dir*a]
                                          : [tipEnd + dir*a, cAcr + u*half]));
  });
  return out;
}
/** The outline of a strap end lying on a panel: square where it is fixed, shaped where it is
    free. `axis` is the way the strap runs, `far` which end of the footprint is the free one. */
function footTip(x, y, w, h, axis, far, tip){
  const across = axis==='y' ? w : h, along = axis==='y' ? h : w;
  const A = across/2, T = Math.min(tipLen(across, tip), along*0.55);
  const prof = tipProfile(across, tip, T).map(q=>[along - T + q[0], q[1]]);
  const loc = [[0,-A]].concat(prof, [[0, A]]);
  const cAcr = axis==='y' ? x + w/2 : y + h/2;
  const base = far==='start' ? (axis==='y' ? y + h : x + w) : (axis==='y' ? y : x);
  const sgn  = far==='start' ? -1 : 1;
  return loc.map(q => axis==='y' ? [cAcr + q[1], base + sgn*q[0]]
                                 : [base + sgn*q[0], cAcr + q[1]]);
}
/** A closed polygon pulled in by `i` \u2014 a true parallel offset, every edge moved its own
    perpendicular distance. Shrinking the bounding box instead is not the same thing: it
    shortens a point in PROPORTION rather than by `i`, so the row creeps in towards the tip
    and the margin she set her divider to is only right along the sides. A corner too sharp
    to mitre is cut off instead, because a hole cannot sit in a hair-thin point. */
/* A NEGATIVE distance pushes the outline out instead of in - which is how a shape she drew
   gets its seam allowance, because there the profile is the stitch line and the cut edge is
   outside it. Reversing the polygon does not do it: the winding sign and the edge vector both
   flip, and the two cancel, so the normal comes out exactly where it was. */
/* `i` is one distance for the whole outline - positive inward, negative outward - or an
   ARRAY of one distance per EDGE (the edge that starts at pts[k]) with `dirIn` giving the
   sign. An outline does not always carry the same allowance all the way round: on a shape
   she drew, the body arc is a SEAM and the mouth is a HEM, and growing the whole profile by
   the seam allowance is what put the mouth's stitch line twice as far from the cut edge as
   it should have been. Where the two distances meet, the mitre falls out of the same
   intersection the rest of them do, so the step is drawn as the corner it really is. */
function offsetPoly(pts, i, dirIn){
  const n = pts.length;
  const arr = Array.isArray(i);
  if(n < 3) return pts.slice();
  if(arr ? !i.some(v => Math.abs(v) > 1e-9) : !i) return pts.slice();
  const dir = arr ? (dirIn < 0 ? -1 : 1) : (i < 0 ? -1 : 1);
  const dAt = arr ? (k => Math.abs(+i[k] || 0)) : (() => Math.abs(i));
  let A2 = 0;                                   // which way round it is drawn, so "in" is not a guess
  for(let k=0;k<n;k++){ const a=pts[k], b=pts[(k+1)%n]; A2 += a[0]*b[1] - b[0]*a[1]; }
  const sgn = (A2 > 0 ? 1 : -1) * dir;
  const E = [];
  for(let k=0;k<n;k++){
    const a = pts[k], b = pts[(k+1)%n];
    const dx = b[0]-a[0], dy = b[1]-a[1], L = Math.hypot(dx,dy);
    if(L < 1e-9) continue;
    const d = dAt(k);
    const nx = -sgn*dy/L, ny = sgn*dx/L;        // interior lies to the left of each edge
    E.push({v:a, u:[dx/L, dy/L], n:[nx,ny], d, p:[a[0]+nx*d, a[1]+ny*d]});
  }
  const m = E.length;
  if(m < 3) return pts.slice();
  /* Every output vertex carries the distance IT has to satisfy, not the smallest anywhere on
     the outline. With one distance all the way round the two are the same number; with a
     seam allowance along one arc and a hem along another they are not, and filtering the hem
     against the seam allowance lets a fold through where the hem has doubled back on itself. */
  const out = [], req = [];
  const put = (q, d) => { out.push(q); req.push(d); };
  for(let k=0;k<m;k++){
    const e0 = E[(k-1+m)%m], e1 = E[k];         // the two edges meeting at this vertex
    const lim = Math.max(e0.d, e1.d)*2.2;
    const cr = e0.u[0]*e1.u[1] - e0.u[1]*e1.u[0];
    if(Math.abs(cr) < 1e-7){ put([e1.v[0] + e1.n[0]*e1.d, e1.v[1] + e1.n[1]*e1.d], e1.d); continue; }
    const wx = e1.p[0]-e0.p[0], wy = e1.p[1]-e0.p[1];
    const tt = (wx*e1.u[1] - wy*e1.u[0]) / cr;
    const px = e0.p[0] + e0.u[0]*tt, py = e0.p[1] + e0.u[1]*tt;
    if(Math.hypot(px-e1.v[0], py-e1.v[1]) > lim){
      put([e1.v[0] + e0.n[0]*e0.d, e1.v[1] + e0.n[1]*e0.d], e0.d);
      put([e1.v[0] + e1.n[0]*e1.d, e1.v[1] + e1.n[1]*e1.d], e1.d);
    } else put([px, py], Math.min(e0.d, e1.d));
  }
  // Where the outline turns tightly - the two arcs meeting at an almond point - the offset
  // folds back over itself and a couple of vertices end up nearer the edge than the rest.
  // The margin IS the specification, so anything that fails it is dropped rather than drawn.
  const keep = out.filter((q, k) => polyDist(q, pts) >= req[k]*0.88);
  const res = keep.length >= 3 ? keep : out;
  let B2 = 0;
  for(let k=0;k<res.length;k++){ const a=res[k], b=res[(k+1)%res.length]; B2 += a[0]*b[1] - b[0]*a[1]; }
  // an offset that has eaten the shape is worse than no offset at all - and one that was
  // meant to grow and did not is worse still, because the cut edge would land on the holes
  return (B2*A2 > 0 && Math.abs(B2) > Math.abs(A2)*(dir > 0 ? 0.04 : 0.999)) ? res : pts.slice();
}
/** Is this point inside the closed polygon? Ray casting - used to ask whether a pocket she
    has asked for actually fits on a panel that is not a rectangle. */
function polyHas(pts, x, y){
  let inside = false;
  for(let i=0, j=pts.length-1; i<pts.length; j=i++){
    const a = pts[i], b = pts[j];
    if((a[1] > y) !== (b[1] > y) &&
       x < (b[0]-a[0])*(y-a[1])/((b[1]-a[1]) || 1e-9) + a[0]) inside = !inside;
  }
  return inside;
}
/** The point furthest INSIDE a closed polygon - where a name can go and still be on leather.
    A crescent's bounding-box centre is in the hollow, which is nowhere at all. */
function polyAnchor(pts){
  const xs = pts.map(q=>q[0]), ys = pts.map(q=>q[1]);
  const x0 = Math.min.apply(null,xs), x1 = Math.max.apply(null,xs);
  const y0 = Math.min.apply(null,ys), y1 = Math.max.apply(null,ys);
  let best = [(x0+x1)/2, (y0+y1)/2], bd = polyHas(pts, best[0], best[1]) ? polyDist(best, pts) : -1;
  const N = 14;
  for(let i=1;i<N;i++) for(let j=1;j<N;j++){
    const x = x0 + (x1-x0)*i/N, y = y0 + (y1-y0)*j/N;
    if(!polyHas(pts, x, y)) continue;
    const d = polyDist([x,y], pts);
    if(d > bd){ bd = d; best = [x,y]; }
  }
  return {x:best[0], y:best[1], r:Math.max(0, bd)};
}
/** Shortest distance from a point to a closed polygon's edges. */
function polyDist(p, pts){
  let best = Infinity;
  for(let k=0;k<pts.length;k++){
    const a = pts[k], b = pts[(k+1)%pts.length];
    const dx = b[0]-a[0], dy = b[1]-a[1], L2 = dx*dx + dy*dy;
    let t = L2 ? ((p[0]-a[0])*dx + (p[1]-a[1])*dy)/L2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const d = Math.hypot(p[0] - (a[0]+dx*t), p[1] - (a[1]+dy*t));
    if(d < best) best = d;
  }
  return best;
}
/** The same outline pulled in by `i`, as a closed run - the stitching on a shaped end has to
    follow the shape, or you get a square box sitting inside a pointed tab. Both the panel and
    the piece build it from the same footprint, so the two agree hole for hole. */
function footTipRun(x, y, w, h, axis, far, tip, i){
  const pts = offsetPoly(footTip(x, y, w, h, axis, far, tip), i);
  const seg = [];
  for(let k=0;k<pts.length;k++){
    const a = pts[k], b = pts[(k+1)%pts.length];
    if(Math.hypot(b[0]-a[0], b[1]-a[1]) > 1e-6) seg.push(['L', a[0], a[1], b[0], b[1]]);
  }
  return seg;
}
/** A rounded rectangle as segments, clockwise from the top-left corner.
    Eight entries: top, tr-arc, right, br-arc, bottom, bl-arc, left, tl-arc. */
function rectSegs(x, y, w, h, r){
  r = Math.max(0, Math.min(r, w/2, h/2));
  const H = Math.PI/2;
  return [
    ['L', x+r, y, x+w-r, y],       ['A', x+w-r, y+r,   r, -H, 0],
    ['L', x+w, y+r, x+w, y+h-r],   ['A', x+w-r, y+h-r, r, 0, H],
    ['L', x+w-r, y+h, x+r, y+h],   ['A', x+r,   y+h-r, r, H, Math.PI],
    ['L', x, y+h-r, x, y+r],       ['A', x+r,   y+r,   r, Math.PI, Math.PI+H]
  ];
}
const OPEN_SIDE = {top:0, right:2, bottom:4, left:6};
/** The perimeter minus the opening edge - what actually gets stitched down. */
function rectRunOpen(x, y, w, h, r, side){
  const all = rectSegs(x, y, w, h, r);
  const i = OPEN_SIDE[side] != null ? OPEN_SIDE[side] : 0;
  const out = [];
  for(let k = 1; k < 8; k++) out.push(all[(i + k) % 8]);
  return out.filter(s => segLen(s) > 1e-9);
}
/* Perimeter minus the mouth AND the edge opposite it: a folded pocket's two stitched sides.
   The edge opposite the mouth is the fold, and a fold is never pricked.

   TWO RUNS, not one. As one run it was walked down the right side and back up the left, and
   the hole that lands exactly on the join between them is drawn once - at the end of the
   first side. That is one more hole down the right of every pocket than down its left, and it
   is what "the stitch lines do not match from left to right" was. As two runs sharing a KEY
   they are planned once and both get the identical count, and both are walked from the MOUTH,
   so the nth hole down one side is the nth hole down the other. */
function rectRunSides(x, y, w, h, r, side, foldInset, mouthInset){
  const all = rectSegs(x, y, w, h, r);
  const i = OPEN_SIDE[side] != null ? OPEN_SIDE[side] : 0;
  const a = [], b = [];
  for(let k = 1; k < 4; k++) a.push(all[(i + k) % 8]);      // mouth corner round to the fold
  for(let k = 5; k < 8; k++) b.push(all[(i + k) % 8]);      // fold round to the other mouth corner
  const fi = foldInset || 0, mi = mouthInset || 0;
  const A = trimRun(a.filter(s=>segLen(s)>1e-9), mi, fi);   // mouth -> fold
  const B = trimRun(b.filter(s=>segLen(s)>1e-9), fi, mi);   // fold -> mouth
  return [A, revRun(B)];
}
const rotPt = (x, y, cx, cy, a) => [cx + (x-cx)*Math.cos(a) - (y-cy)*Math.sin(a),
                                    cy + (x-cx)*Math.sin(a) + (y-cy)*Math.cos(a)];
/** Rotate a run about a pivot. Rotation is an isometry, so lengths - and therefore hole
    counts and spacing - are untouched; only where they land changes. */
function rotSegs(segs, cx, cy, deg){
  if(!deg) return segs;
  const a = deg * Math.PI/180;
  return segs.map(s=>{
    if(s[0]==='L'){
      const p = rotPt(s[1], s[2], cx, cy, a), q = rotPt(s[3], s[4], cx, cy, a);
      return ['L', p[0], p[1], q[0], q[1]];
    }
    const c = rotPt(s[1], s[2], cx, cy, a);
    return ['A', c[0], c[1], s[3], s[4] + a, s[5] + a];
  });
}
/** Which way the mouth faces once the element has been rotated, in plain words. */
const OPEN_DEG = {top:270, right:0, bottom:90, left:180};
function openWord(side, deg){
  const base = OPEN_DEG[side] != null ? OPEN_DEG[side] : 270;
  const a = (((base + (deg||0)) % 360) + 360) % 360;
  return ['right','lower right','down','lower left','left','upper left','up','upper right'][Math.round(a/45) % 8];
}

/** How far the top corners are rounded off. A flap needs a straight rim to sew to, and a
    roll top has to fold flat, so neither of those gets one. */
function topR(){
  return (S.construction==='gusset' && S.top!=='flap' && S.top!=='roll')
       ? Math.max(0, Math.min(S.topR || 0, S.W/2 - 4, S.H*0.4)) : 0;
}
/** Where a rounded top corner has to give up. Above the rim there is no seam allowance at
    all - the rim IS the cut edge - so the seam stops the moment it gets within SA of it. */
function topArcCut(rT, sa){
  return rT > 0 ? Math.asin(Math.max(-1, Math.min(1, (sa - rT)/rT))) : -Math.PI/2;
}
/** How much of a quarter turn each rounded top corner actually contributes to the seam. */
function topArcLen(rT, sa){ return rT > 0 ? rT*Math.abs(topArcCut(rT, sa)) : 0; }
/** The panel-to-gusset run when the TOP corners are rounded too: it starts and finishes on
    the straight part of the rim and carries on round all four corners. */
function bodyRunTop(x0, y0, x1, y1, rB, rT, sa){
  rB = Math.max(0, Math.min(rB, (x1-x0)/2, (y1-y0)/2));
  rT = Math.max(0, Math.min(rT, (x1-x0)/2, (y1-y0)/2));
  if(rT <= 0) return openRectRun(x0, y0, x1, y1, rB);
  const H2 = Math.PI/2, run = [], cut = topArcCut(rT, sa || 0);
  run.push(['A', x0+rT, y0+rT, rT, -Math.PI - cut, -Math.PI]);
  run.push(['L', x0, y0+rT, x0, y1-rB]);
  if(rB > 0) run.push(['A', x0+rB, y1-rB, rB, Math.PI, H2]);
  run.push(['L', x0+rB, y1, x1-rB, y1]);
  if(rB > 0) run.push(['A', x1-rB, y1-rB, rB, H2, 0]);
  run.push(['L', x1, y1-rB, x1, y0+rT]);
  run.push(['A', x1-rT, y0+rT, rT, 0, cut]);
  return run.filter(sg => segLen(sg) > 1e-9);
}
/** Down one side, round the bottom, up the other - the shape of a panel or pocket seam. */
function openRectRun(x0,y0,x1,y1,r){
  r = Math.max(0, Math.min(r, (x1-x0)/2, (y1-y0)/2));
  const run = [['L',x0,y0,x0,y1-r]];
  if(r>0) run.push(['A',x0+r,y1-r,r,Math.PI,Math.PI/2]);
  run.push(['L',x0+r,y1,x1-r,y1]);
  if(r>0) run.push(['A',x1-r,y1-r,r,Math.PI/2,0]);
  run.push(['L',x1,y1-r,x1,y0]);
  return run;
}
