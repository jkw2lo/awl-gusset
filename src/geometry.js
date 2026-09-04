/* ============================================================
   PATH HELPERS  (all in mm)
   ============================================================ */
const nn = v => (Math.round(v*1000)/1000);
function rr(x,y,w,h,r){
  // r: number or {tl,tr,br,bl}
  const q = (typeof r==='number')? {tl:r,tr:r,br:r,bl:r} : Object.assign({tl:0,tr:0,br:0,bl:0}, r||{});
  const m = Math.min(w,h)/2;
  for(const k in q) q[k]=Math.max(0,Math.min(q[k],m));
  const P=[];
  P.push(`M ${nn(x+q.tl)} ${nn(y)}`);
  P.push(`H ${nn(x+w-q.tr)}`); if(q.tr) P.push(`A ${nn(q.tr)} ${nn(q.tr)} 0 0 1 ${nn(x+w)} ${nn(y+q.tr)}`);
  P.push(`V ${nn(y+h-q.br)}`); if(q.br) P.push(`A ${nn(q.br)} ${nn(q.br)} 0 0 1 ${nn(x+w-q.br)} ${nn(y+h)}`);
  P.push(`H ${nn(x+q.bl)}`);   if(q.bl) P.push(`A ${nn(q.bl)} ${nn(q.bl)} 0 0 1 ${nn(x)} ${nn(y+h-q.bl)}`);
  P.push(`V ${nn(y+q.tl)}`);   if(q.tl) P.push(`A ${nn(q.tl)} ${nn(q.tl)} 0 0 1 ${nn(x+q.tl)} ${nn(y)}`);
  return P.join(' ')+' Z';
}
const poly = pts => 'M '+pts.map(p=>nn(p[0])+' '+nn(p[1])).join(' L ')+' Z';
/* ---------- entasis ----------
   A long straight edge does not stay straight. Stitching pulls it in and the eye reads the
   result as hollow, the same way a column with dead-parallel sides looks pinched. The fix is
   the same one the Greeks used: give the edge a barely perceptible outward swell, and it
   comes out looking straight. A quadratic through a control point 2e off the middle bulges
   exactly e, so the number in the box is the number you get at mid-span. */
function entasisOf(len){
  return S.entasis > 0 && len > 60 ? Math.min(S.entasis, len/160) : 0;
}
/** A straight run from a to b, crowned outward along the unit normal n.
    The edge is registered as it is drawn, so the stitch line that follows it can be given
    the same swell - see entCrown below. */
function crownSeg(a, b, n){
  const e = entasisOf(Math.hypot(b[0]-a[0], b[1]-a[1]));
  if(!e) return `L ${nn(b[0])} ${nn(b[1])}`;
  entSide(a, b, n, e);
  const cx = (a[0]+b[0])/2 + n[0]*2*e, cy = (a[1]+b[1])/2 + n[1]*2*e;
  return `Q ${nn(cx)} ${nn(cy)} ${nn(b[0])} ${nn(b[1])}`;
}
/* Entasis is a drawing change, but it is not only a change to the OUTLINE. Seam allowance
   here means the distance from the cut edge to the stitch line. Crown the edge and leave the
   holes on a dead-straight line and that distance is no longer the number she set her wing
   divider to: it opens up by the whole crown at mid-span and closes again at the corners,
   which is exactly the wandering margin she could see on the tabs. So a piece registers each
   crowned cut edge as it draws it, and every open seam run built on that piece afterwards is
   carried by whichever edge it runs with.

   The crown is a parabola: a quadratic with its control point 2e off the middle bulges e, so
   the swell at u along the edge is 4e*u(1-u). The stitch line reads that same parabola at
   its OWN position along the EDGE - not along itself - which is what keeps the gap constant
   where the run stops short of a corner. A crowned run is longer than a straight one by about
   (8/3)e^2/L: eight microns on a 200 mm edge, so no hole count moves. */
let ENT = [];
function entReset(){ ENT.length = 0; }
function entSide(a, b, n, e){
  const L = Math.hypot(b[0]-a[0], b[1]-a[1]);
  if(e > 0 && L > 1e-6) ENT.push({ax:a[0], ay:a[1], ux:(b[0]-a[0])/L, uy:(b[1]-a[1])/L, nx:n[0], ny:n[1], e, L});
}
/** The crowned cut edge this straight run belongs to: parallel to it, inside it, and within
    one seam allowance of it. Anything else on the piece is a footprint or a fold, not the
    seam that edge was cut for, and is left alone. */
function entEdgeFor(ax, ay, bx, by, ux, uy){
  const band = S.sa + 2.5;
  for(const s of ENT){
    if(Math.abs(ux*s.uy - uy*s.ux) > 0.06) continue;              // not running with it
    const d0 = -((ax-s.ax)*s.nx + (ay-s.ay)*s.ny);                // how far inside the edge
    const d1 = -((bx-s.ax)*s.nx + (by-s.ay)*s.ny);
    if(d0 < 0.05 || d1 < 0.05 || d0 > band || d1 > band) continue;
    const u0 = ((ax-s.ax)*s.ux + (ay-s.ay)*s.uy)/s.L, u1 = ((bx-s.ax)*s.ux + (by-s.ay)*s.uy)/s.L;
    if(Math.max(u0,u1) < 0.02 || Math.min(u0,u1) > 0.98) continue;
    // never let the crown walk a hole out onto the cut edge itself
    const cap = Math.min(d0, d1) - 1.6;
    if(cap <= 0.02) continue;
    return {s, e:Math.min(s.e, cap)};
  }
  return null;
}
/** One straight segment, resampled along its edge's crown. */
function entSeg(sg){
  if(sg[0] !== 'L') return [sg];
  const ax=sg[1], ay=sg[2], bx=sg[3], by=sg[4];
  const dx=bx-ax, dy=by-ay, L=Math.hypot(dx,dy);
  if(L < 40) return [sg];                       // nothing short reads hollow, and nothing short is an edge
  const hit = entEdgeFor(ax, ay, bx, by, dx/L, dy/L);
  if(!hit) return [sg];
  const s = hit.s, e = hit.e;
  const N = Math.max(6, Math.min(28, Math.round(L/10)));
  const at = i => {
    const f = i/N, x = ax + dx*f, y = ay + dy*f;
    const u = ((x-s.ax)*s.ux + (y-s.ay)*s.uy)/s.L;
    const k = e*4*u*(1-u);
    return [x + s.nx*k, y + s.ny*k];
  };
  const out = [];
  let p0 = at(0);
  for(let i=1;i<=N;i++){ const p1 = at(i); out.push(['L', p0[0], p0[1], p1[0], p1[1]]); p0 = p1; }
  return out;
}
/** Every straight part of a seam run, crowned to match the edge it follows. */
function entCrown(segs){
  if(!ENT.length) return segs;
  let any = false;
  const out = [];
  for(const sg of segs){ const r = entSeg(sg); if(r.length > 1) any = true; for(const q of r) out.push(q); }
  return any ? out : segs;
}
/** poly(), with every side crowned away from the middle of the shape. */
function polyE(pts){
  if(!(S.entasis > 0)) return poly(pts);
  let cx = 0, cy = 0;
  pts.forEach(q=>{ cx += q[0]; cy += q[1]; });
  cx /= pts.length; cy /= pts.length;
  let d = `M ${nn(pts[0][0])} ${nn(pts[0][1])}`;
  for(let i=0;i<pts.length;i++){
    const a = pts[i], b = pts[(i+1)%pts.length];
    const dx = b[0]-a[0], dy = b[1]-a[1], L = Math.hypot(dx,dy) || 1;
    let n = [-dy/L, dx/L];
    const mx = (a[0]+b[0])/2, my = (a[1]+b[1])/2;
    if((mx - cx)*n[0] + (my - cy)*n[1] < 0) n = [-n[0], -n[1]];
    d += ' ' + crownSeg(a, b, n);
  }
  return d + ' Z';
}
/** rr(), with the four straight runs crowned outward. */
function rrE(x, y, w, h, r){
  if(!(S.entasis > 0)) return rr(x, y, w, h, r);
  const q = (typeof r==='number')? {tl:r,tr:r,br:r,bl:r} : Object.assign({tl:0,tr:0,br:0,bl:0}, r||{});
  const m = Math.min(w,h)/2;
  for(const k in q) q[k] = Math.max(0, Math.min(q[k], m));
  const P = [`M ${nn(x+q.tl)} ${nn(y)}`];
  P.push(crownSeg([x+q.tl, y], [x+w-q.tr, y], [0,-1]));
  if(q.tr) P.push(`A ${nn(q.tr)} ${nn(q.tr)} 0 0 1 ${nn(x+w)} ${nn(y+q.tr)}`);
  P.push(crownSeg([x+w, y+q.tr], [x+w, y+h-q.br], [1,0]));
  if(q.br) P.push(`A ${nn(q.br)} ${nn(q.br)} 0 0 1 ${nn(x+w-q.br)} ${nn(y+h)}`);
  P.push(crownSeg([x+w-q.br, y+h], [x+q.bl, y+h], [0,1]));
  if(q.bl) P.push(`A ${nn(q.bl)} ${nn(q.bl)} 0 0 1 ${nn(x)} ${nn(y+h-q.bl)}`);
  P.push(crownSeg([x, y+h-q.bl], [x, y+q.tl], [-1,0]));
  if(q.tl) P.push(`A ${nn(q.tl)} ${nn(q.tl)} 0 0 1 ${nn(x+q.tl)} ${nn(y)}`);
  return P.join(' ') + ' Z';
}
const hLine = (x1,x2,y) => `M ${nn(x1)} ${nn(y)} H ${nn(x2)}`;
const vLine = (x,y1,y2) => `M ${nn(x)} ${nn(y1)} V ${nn(y2)}`;
/** Half-perimeter of an ellipse (Ramanujan) \u2014 used for handle arc length. */
function halfEllipse(a,b){ return 0.5*Math.PI*(3*(a+b) - Math.sqrt((3*a+b)*(a+3*b))) }
/* ---------- shaped ends ----------
   The end of a strap or a tab is the one bit of a bag people actually look at. All of these
   are struck the same way at the bench: a compass radius and a straight edge. An ogive is a
   circle through the point that leaves the side of the strap tangentially - set the radius to
   R = (T^2 + h^2) / 2h for a tip T long on a strap 2h wide, and the curve cannot kink. */
const TIPS = {
  square:  {name:'Square',        t:0},
  round:   {name:'Round',         t:1.00},
  point:   {name:'Point',         t:1.25},
  english: {name:'English point', t:1.45},
  almond:  {name:'Almond',        t:1.90},
  angle:   {name:'Cut back',      t:0.55}
};
function tipLen(w, tip){ return (TIPS[tip] ? TIPS[tip].t : 0) * (w/2); }
/** The profile of one shaped end, as points from (0,-h) round the tip to (0,+h),
    in local coordinates where x runs out along the strap and y is off its centre line. */
function tipProfile(w, tip, Tover){
  // Tover lets a caller shorten the point without changing its shape. Clamping the offset
  // but not the profile is what walked the stitch line off the end of a short tab.
  const h = w/2, T = Tover != null ? Tover : tipLen(w, tip);
  if(!(T > 0.5)) return [[0,-h],[0,h]];
  if(tip === 'point' || tip === 'angle') return [[0,-h],[T,0],[0,h]];
  if(tip === 'english')
    return [[0,-h],[T*0.30,-h],[T*0.52,-h*0.55],[T,0],[T*0.52,h*0.55],[T*0.30,h],[0,h]];
  const R = (T*T + h*h)/(2*h), N = 14, out = [];
  // one arc: centre (0, h-R), from the side of the strap round to the point
  const a0 = Math.PI/2, a1 = Math.atan2(0 - (h - R), T);
  for(let i=0;i<=N;i++){ const a = a0 + (a1-a0)*i/N; out.push([R*Math.cos(a), (h - R) + R*Math.sin(a)]); }
  // mirror it for the other half, and walk the whole thing in ONE direction: -h, round, +h.
  // Walking out and back from the middle draws a bow tie, which is what it was doing.
  return out.map(q=>[q[0], -q[1]]).concat(out.slice().reverse().slice(1));
}
/** One line of explanation for whichever end shape is on, wherever it turns up. */
function tipNote(w2, tip, what){
  const T = tipLen(w2, tip);
  if(!T) return '';
  const h = w2/2;
  if(tip==='point' || tip==='angle')
    return `\n${TIPS[tip].name} on ${what}: straight from each edge to a point ${fmt(T)} out.`;
  if(tip==='english')
    return `\nEnglish point on ${what}: run straight ${fmt(T*0.3)}, in to ${fmt(w2*0.55)} across, then to the point at ${fmt(T)}.`;
  return `\n${TIPS[tip].name} on ${what}: strike it with a compass set to ${fmt((T*T + h*h)/(2*h))} \u2014 the arc leaves the edge of the strap dead straight, so it cannot kink.`;
}
/** A straight blank `len` x `w` with a shaped end. `both` shapes the near end as well.
    The tip is never allowed to eat the piece: on a short folded tab a full-length almond
    would leave nothing straight between the two points. */
function tipStrip(len, w, tip, both){
  const T = Math.min(tipLen(w, tip), both ? len*0.34 : len*0.55);
  if(T < 1) return null;
  // both halves run bottom -> point -> top, so the two ends join into one closed outline
  const far = tipProfile(w, tip, T).map(q=>[len - T + q[0], w/2 + q[1]]);
  const near = both ? tipProfile(w, tip, T).map(q=>[T - q[0], w/2 - q[1]]) : [[0, w],[0, 0]];
  return {cut: poly(near.concat(far)), tip:T,
          edge: ei => [[['L', both?T:ei, ei, len-T, ei]], [['L', both?T:ei, w-ei, len-T, w-ei]]]};
}
/** Full perimeter of an ellipse (Ramanujan) - a round base is measured round its edge. */
function ellipsePerim(a,b){ return Math.PI*(3*(a+b) - Math.sqrt((3*a+b)*(a+3*b))) }
/** The circle whose arc is `len` long and which bulges `rise` off its own chord.
    A shoulder strap cut on this arc sits on the shoulder instead of twisting to get there. */
function arcOf(len, rise){
  rise = Math.max(0.5, rise);
  let lo = len/6.3, hi = len*len/(2*rise);      // between a half-circle and dead straight
  for(let i=0;i<60;i++){
    const R = (lo+hi)/2, th = len/(2*R);
    if(R*(1-Math.cos(th)) > rise) lo = R; else hi = R;
  }
  const R = (lo+hi)/2, th = len/(2*R);
  return {R, th, chord: 2*R*Math.sin(th), sag: R*(1-Math.cos(th))};
}
/** A band of width w following that arc, drawn inside a box that starts at 0,0.
    Returns the cut path, an offset-run maker for the edge rows, and the box it needs. */
function arcBand(len, w, rise){
  const A = arcOf(len, rise), N = 26;
  const raw = (i, off) => {
    const a = -A.th + 2*A.th*i/N, r = A.R + off;
    return [r*Math.sin(a), -r*Math.cos(a)];
  };
  // the outer edge swings wider than the chord, so the blank is measured from the drawing,
  // never from the chord - getting this wrong put stitch holes off the edge of the piece
  const all = [];
  for(let i=0;i<=N;i++){ all.push(raw(i,-w/2)); all.push(raw(i, w/2)); }
  const xs = all.map(q=>q[0]), ys = all.map(q=>q[1]);
  const ox2 = -Math.min.apply(null,xs), oy2 = -Math.min.apply(null,ys);
  const pt = (i, off) => { const q = raw(i, off); return [q[0]+ox2, q[1]+oy2]; };
  const line = off => { const p = []; for(let i=0;i<=N;i++) p.push(pt(i, off)); return p; };
  const up = line(-w/2), dn = line(w/2);
  return {
    box: {w: Math.max.apply(null,xs) + ox2, h: Math.max.apply(null,ys) + oy2},
    cut: poly(up.concat(dn.slice().reverse())),
    run: off => { const p = line(off), r = []; for(let i=0;i<p.length-1;i++)
                    r.push(['L', p[i][0], p[i][1], p[i+1][0], p[i+1][1]]); return r; },
    at: (u, off) => pt(u*N, off),
    A
  };
}

