/* ============================================================
   A SHAPE SHE DREW HERSELF
   The `free` construction is the gusset construction with the panel outline taken off a
   profile she draws instead of out of a rounded rectangle. Everything downstream - the seam
   registry, the notches, the elements, the sheets, the stitch plan - is the same machinery,
   because the only thing that ever changed is where the outline comes from.

   Three rules hold it together:
   - The profile is stored NORMALISED, 0 to 1 of its own bounding box. W and H therefore stay
     the size of the bag and nothing else, so the sliders, the grips and the stitch-fit search
     all keep working on a crescent exactly as they do on a satchel.
   - The MOUTH is the arc between the two points marked `m`, taken the way that passes over
     the top. Everything else round the profile is the seam the gusset is stitched to, and its
     length is what the gusset strip is cut to. A shape has no obvious opening; this is how she
     says where it is.
   - A point marked `skip` is one the outline goes STRAIGHT PAST. That is the whole of
     "connect the points how you like": leave a five-point star's five valleys in and you get a
     star bag, skip them and the same five points make a pentagon.
   ============================================================ */
const FREE_MIN = 3;
/** Corner rounding on an arbitrary polygon: one fillet arc per vertex, sampled. `rad` is in
    millimetres and is clamped to what the two edges either side can actually give up. */
function filletPoly(pts, rad, seg){
  const n = pts.length;
  if(n < 3) return pts.slice();
  seg = seg || 7;
  const out = [], src = [];
  for(let i=0;i<n;i++){
    const A = pts[(i-1+n)%n], B = pts[i], C = pts[(i+1)%n];
    const u = [A[0]-B[0], A[1]-B[1]], v = [C[0]-B[0], C[1]-B[1]];
    const lu = Math.hypot(u[0],u[1]) || 1, lv = Math.hypot(v[0],v[1]) || 1;
    const ux = u[0]/lu, uy = u[1]/lu, vx = v[0]/lv, vy = v[1]/lv;
    const cosA = Math.max(-0.9999, Math.min(0.9999, ux*vx + uy*vy));
    const ang = Math.acos(cosA);                       // interior angle at B
    let r = Math.max(0, rad[i] || 0);
    const tmax = Math.min(lu, lv)*0.48;
    let t = r / Math.tan(ang/2);
    if(!isFinite(t) || t > tmax){ t = tmax; r = t * Math.tan(ang/2); }
    src.push(out.length);
    if(!(r > 0.15) || !(t > 0.15)){ out.push([B[0], B[1]]); continue; }
    const P0 = [B[0] + ux*t, B[1] + uy*t], P1 = [B[0] + vx*t, B[1] + vy*t];
    // the centre lies along the bisector, r/sin(half-angle) from the corner
    let bx = ux + vx, by = uy + vy;
    const bl = Math.hypot(bx,by) || 1; bx /= bl; by /= bl;
    const d = r / Math.sin(ang/2);
    const cx = B[0] + bx*d, cy = B[1] + by*d;
    const a0 = Math.atan2(P0[1]-cy, P0[0]-cx);
    let a1 = Math.atan2(P1[1]-cy, P1[0]-cx), da = a1 - a0;
    while(da >  Math.PI) da -= 2*Math.PI;
    while(da < -Math.PI) da += 2*Math.PI;
    for(let k=0;k<=seg;k++){
      const a = a0 + da*k/seg;
      out.push([cx + r*Math.cos(a), cy + r*Math.sin(a)]);
    }
  }
  out.src = src;                       // where each source vertex ended up in the dense list
  return out;
}
/** A closed polyline moved `d` inward along each vertex's own bisector. Point for point, so
    an arc position on the outline is the same arc position on the row inside it - which is
    what lets a notch on the panel and the same notch on the gusset be the same notch. */
function insetPoly(pts, d){
  const n = pts.length, out = [];
  if(n < 3 || !d) return pts.map(q=>q.slice());
  let A2 = 0;
  for(let i=0;i<n;i++){ const a=pts[i], b=pts[(i+1)%n]; A2 += a[0]*b[1] - b[0]*a[1]; }
  const sgn = A2 > 0 ? 1 : -1;
  for(let i=0;i<n;i++){
    const A = pts[(i-1+n)%n], B = pts[i], C = pts[(i+1)%n];
    const e0 = [B[0]-A[0], B[1]-A[1]], e1 = [C[0]-B[0], C[1]-B[1]];
    const l0 = Math.hypot(e0[0],e0[1]) || 1, l1 = Math.hypot(e1[0],e1[1]) || 1;
    const n0 = [-sgn*e0[1]/l0, sgn*e0[0]/l0], n1 = [-sgn*e1[1]/l1, sgn*e1[0]/l1];
    let bx = n0[0]+n1[0], by = n0[1]+n1[1];
    const bl = Math.hypot(bx,by);
    if(bl < 1e-6){ out.push([B[0], B[1]]); continue; }
    bx /= bl; by /= bl;
    // 1/cos(half the turn) keeps the offset perpendicular distance right at a corner
    const k = Math.min(4, 1/Math.max(0.25, (n0[0]*bx + n0[1]*by)));
    out.push([B[0] + bx*d*k, B[1] + by*d*k]);
  }
  return out;
}
/** Running arc length of a closed polyline: cum[i] is the distance from pts[0] to pts[i],
    and cum[n] is the whole way round. */
function polyCum(pts){
  const c = [0];
  for(let i=1;i<=pts.length;i++){
    const a = pts[i-1], b = pts[i % pts.length];
    c.push(c[i-1] + Math.hypot(b[0]-a[0], b[1]-a[1]));
  }
  return c;
}
/** The stretch of a closed polyline from index i forward to index j, as seam segments. */
function polyArcSegs(pts, i, j){
  const n = pts.length, seg = [];
  let k = i;
  for(let g=0; g<n+1 && k!==j; g++){
    const a = pts[k], b = pts[(k+1)%n];
    if(Math.hypot(b[0]-a[0], b[1]-a[1]) > 1e-9) seg.push(['L', a[0], a[1], b[0], b[1]]);
    k = (k+1)%n;
  }
  return seg;
}
/* The shapes she can start from. Each is a closed list of points with two of them marked as
   the ends of the mouth; `norm` then stretches whatever came out to fill 0 to 1 in both
   directions, because that is the contract the rest of the file relies on: the profile fills
   its box, and the box is W x H. From there it is hers to move, add to and take apart. */
function freeShape(name){
  const P = (x, y, r, m) => ({x, y, r:r||0, m:!!m, skip:false});
  const norm = a => {
    const xs = a.map(q=>q.x), ys = a.map(q=>q.y);
    const x0 = Math.min.apply(null,xs), x1 = Math.max.apply(null,xs);
    const y0 = Math.min.apply(null,ys), y1 = Math.max.apply(null,ys);
    const dx = (x1-x0) || 1, dy = (y1-y0) || 1;
    a.forEach(q=>{ q.x = (q.x-x0)/dx; q.y = (q.y-y0)/dy; });
    return a;
  };
  /* An ellipse walked clockwise from the top: index 0 is the apex, a quarter of the way round
     is the right-hand side. Marking `mo` either side of 0 puts the mouth over the top. */
  const ell = (n, mo) => {
    const a = [];
    for(let i=0;i<n;i++){ const t = 2*Math.PI*i/n;
      a.push(P(0.5 + 0.5*Math.sin(t), 0.5 - 0.5*Math.cos(t), 0, i===mo || i===n-mo)); }
    return a;
  };
  switch(name){
    case 'oval':   return norm(ell(24, 4));
    case 'circle': return norm(ell(20, 3));
    case 'hex':    return norm(ell(6, 1));
    case 'oct':    return norm(ell(8, 1));
    case 'dshape': {                              // flat across the top, half round below
      const a = [P(0,0,0,true), P(1,0,0,true)];
      for(let i=1;i<14;i++){ const t = Math.PI*i/14;
        a.push(P(0.5 + 0.5*Math.cos(t), 0.5*Math.sin(t), 0)); }
      return norm(a);
    }
    case 'arch': {                                // flat along the bottom, domed over the top
      const a = [];
      for(let i=0;i<=12;i++){ const t = Math.PI*(1 + i/12);
        a.push(P(0.5 + 0.5*Math.cos(t), 0.5 + 0.5*Math.sin(t), 0, i===4 || i===8)); }
      a.push(P(1, 1, 0), P(0, 1, 0));
      return norm(a);
    }
    case 'trapz':  return norm([P(0.18,0,0,true), P(0.82,0,0,true), P(1,1,0), P(0,1,0)]);
    case 'crescent': {                            // the outer swell, then back through the hollow
      const a = [];
      for(let i=0;i<=14;i++){ const t = Math.PI*(-0.5 + i/14);
        a.push(P(0.5 + 0.5*Math.sin(t), 0.5 - 0.5*Math.cos(t), 0, i===5 || i===9)); }
      for(let i=13;i>=1;i--){ const t = Math.PI*(-0.5 + i/14);
        a.push(P(0.5 + 0.34*Math.sin(t), 0.5 - 0.30*Math.cos(t) - 0.17, 0)); }
      return norm(a);
    }
    case 'teardrop': {
      const a = [];
      for(let i=0;i<20;i++){ const t = 2*Math.PI*i/20;
        a.push(P(0.5 + 0.5*Math.sin(t)*Math.pow(Math.abs(Math.sin(t/2)), 0.7),
                 0.5 + 0.5*Math.cos(t), 0, i===8 || i===12)); }
      return norm(a);
    }
    case 'star5': {
      /* Five points and five valleys. Leave the valleys in and the gusset follows them all
         round: a true star. Skip them - one tap each - and the same five points make a
         pentagon, because the outline then goes straight from point to point. */
      const a = [];
      for(let i=0;i<10;i++){
        const t = -Math.PI/2 + i*Math.PI/5, rad = i%2 ? 0.21 : 0.5;
        a.push(P(0.5 + rad*Math.cos(t), 0.5 + rad*Math.sin(t), 0, i===8 || i===2));
      }
      return norm(a);
    }
    case 'heart': {
      const a = [];
      for(let i=0;i<22;i++){
        const t = 2*Math.PI*i/22;
        a.push(P(16*Math.pow(Math.sin(t),3),
                 -(13*Math.cos(t) - 5*Math.cos(2*t) - 2*Math.cos(3*t) - Math.cos(4*t)), 0,
                 i===3 || i===19));
      }
      return norm(a);
    }
    default:       return norm([P(0,0,0,true), P(1,0,0,true), P(1,1,14), P(0,1,14)]);
  }
}
const FREE_SHAPE_NAMES = [
  ['rounded','Rounded rectangle'], ['oval','Oval'], ['circle','Round'], ['dshape','D \u2014 flat top'],
  ['arch','Arch'], ['trapz','Trapezoid'], ['hex','Hexagon'], ['oct','Octagon'],
  ['crescent','Crescent moon'], ['teardrop','Teardrop'], ['star5','Five-point star'], ['heart','Heart']
];
/** The profile as it is actually drafted: a dense closed polyline in panel millimetres, where
    each source vertex ended up in it, the two mouth ends, and the whole way round. */
function freeProfile(W, H){
  const raw = (S.free && Array.isArray(S.free.pts) && S.free.pts.length >= FREE_MIN)
            ? S.free.pts : freeShape('rounded');
  const live = raw.filter(p=>!p.skip);
  const use  = live.length >= FREE_MIN ? live : raw;
  const pts  = use.map(p=>[p.x*W, p.y*H]);
  const dense = filletPoly(pts, use.map(p=>p.r||0), 7);
  const src = dense.src || use.map((q,i)=>i);
  // the two ends of the mouth, as indices into the dense polyline
  let marks = [];
  use.forEach((p,i)=>{ if(p.m) marks.push(src[i]); });
  if(marks.length !== 2){
    // no mouth marked, or one lost to a skip: take the two topmost source vertices
    const byTop = use.map((p,i)=>({i, y:p.y, x:p.x})).sort((a,b)=>a.y - b.y || a.x - b.x);
    marks = [src[byTop[0].i], src[(byTop[1] || byTop[0]).i]];
    if(marks[0] === marks[1]) marks[1] = src[(byTop[0].i + 1) % use.length];
  }
  marks.sort((a,b)=>a-b);
  const cum = polyCum(dense), total = cum[dense.length];
  // of the two ways round between the marks, the mouth is the one that goes over the top
  const midY = (i, j) => {
    let y = 0, n = 0, k = i;
    for(let g=0; g<dense.length+1 && k!==j; g++){ y += dense[k][1]; n++; k = (k+1)%dense.length; }
    return n ? y/n : dense[i][1];
  };
  const fwd = midY(marks[0], marks[1]), bak = midY(marks[1], marks[0]);
  const mouth = fwd <= bak ? {a:marks[0], b:marks[1]} : {a:marks[1], b:marks[0]};
  const arc = (i, j) => j >= i ? cum[j] - cum[i] : total - cum[i] + cum[j];
  return {pts:dense, src, cum, total, mouth,
          mouthLen: arc(mouth.a, mouth.b), bodyLen: arc(mouth.b, mouth.a),
          chord: Math.hypot(dense[mouth.b][0] - dense[mouth.a][0],
                            dense[mouth.b][1] - dense[mouth.a][1])};
}
/** The bounding box of the stored profile, in millimetres at the current W x H. */
function freeBox(W, H){
  const F = freeProfile(W, H), xs = F.pts.map(q=>q[0]), ys = F.pts.map(q=>q[1]);
  return {x0:Math.min.apply(null,xs), x1:Math.max.apply(null,xs),
          y0:Math.min.apply(null,ys), y1:Math.max.apply(null,ys)};
}
/** A closed loop has n holes for n spaces; an open run has n+1. */
function seamHoles(segs, n, closed){
  const L = runLen(segs), p = L/n, out = [];
  const last = closed ? n-1 : n;
  for(let i=0;i<=last;i++) out.push(ptAt(segs, i*p));
  return out;
}
