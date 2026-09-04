/* ============================================================
   THE BAG IN THE ROUND
   A small painter's-algorithm renderer: every panel and fitting is a quad in bag
   space, turned by yaw and pitch and sorted back to front. Enough to see how the
   parts sit on each other - the elevations remain the drawings with numbers on.
   ============================================================ */
/** Returns screen x, screen y, and the depth to sort by. Depth is the turned FRONT-BACK
    axis only: tilting the view must not reorder a pocket against the panel it is glued to,
    and the small z offsets each overlay carries are what break those ties. */
function proj3(p, yaw, pitch){
  const a = yaw*Math.PI/180, b = pitch*Math.PI/180;
  const x =  p[0]*Math.cos(a) + p[2]*Math.sin(a);
  const z = -p[0]*Math.sin(a) + p[2]*Math.cos(a);
  const y =  p[1]*Math.cos(b) - z*Math.sin(b);
  return [x, y, z];
}
/* ---------- lighting ----------
   The model is not a photograph, but a flat silhouette tells you nothing about the shape
   of a bag. Every face is shaded by the angle it sits at, so a gusset reads as a gusset
   and a tapered side reads as a taper. The colours come from theme tokens, so the light
   is the only thing doing the work. */
const LIGHT = (function(){ const v=[-0.40,-0.78,0.68], L=Math.hypot(v[0],v[1],v[2]); return v.map(c=>c/L); })();
/** Rotate a direction the same way proj3 rotates a point, keeping a true view-space z. */
function rotDir(n, yaw, pitch){
  const a = yaw*Math.PI/180, b = pitch*Math.PI/180;
  const x  =  n[0]*Math.cos(a) + n[2]*Math.sin(a);
  const z0 = -n[0]*Math.sin(a) + n[2]*Math.cos(a);
  return [x, n[1]*Math.cos(b) - z0*Math.sin(b), n[1]*Math.sin(b) + z0*Math.cos(b)];
}
/** Newell's normal - works on any polygon, however many points and however bent. */
function faceNormal(pts){
  let nx=0, ny=0, nz=0;
  for(let i=0;i<pts.length;i++){
    const a = pts[i], b = pts[(i+1)%pts.length];
    nx += (a[1]-b[1])*(a[2]+b[2]);
    ny += (a[2]-b[2])*(a[0]+b[0]);
    nz += (a[0]-b[0])*(a[1]+b[1]);
  }
  const L = Math.hypot(nx,ny,nz) || 1;
  return [nx/L, ny/L, nz/L];
}
/** How lit a face is, 0-100, for color-mix. Lambert, plus a little rim light so an edge
    turning away from you still separates from what is behind it. */
function litPct(pts, yaw, pitch){
  let n = rotDir(faceNormal(pts), yaw, pitch);
  if(n[2] < 0) n = [-n[0], -n[1], -n[2]];        // we only ever look at the side facing us
  const k = Math.max(0, n[0]*LIGHT[0] + n[1]*LIGHT[1] + n[2]*LIGHT[2]);
  const rim = Math.pow(1 - Math.min(1, Math.abs(n[2])), 3) * 0.15;
  return Math.round(Math.max(0, Math.min(1, 0.12 + 0.82*Math.pow(k, 0.75) + rim)) * 1000)/10;
}

/** The bag seen head on: down the left side, round the bottom corners, up the right.
    Everything else is swept along this, which is what gives the model its round corners. */
function bagOutline(W, H, r, n, rT){
  if(S.construction === 'free'){
    /* The model sweeps the gusset along this list and leaves the step from the last point
       back to the first one OPEN - that gap is the mouth. So a profile she drew hands back
       exactly its body arc, from one mouth mark round to the other, centred on the bag. */
    const F = freeProfile(W, H), P = F.pts, m = P.length, out = [];
    let k = F.mouth.b;
    for(let g=0; g<=m; g++){
      out.push([P[k][0] - W/2, P[k][1] - H/2]);
      if(k === F.mouth.a) break;
      k = (k+1) % m;
    }
    out.mouthL = 0; out.mouthR = out.length - 1;
    return out;
  }
  r = Math.max(0, Math.min(r, W/2, H/2));
  rT = Math.max(0, Math.min(rT || 0, W/2, H/2));
  const O = [];
  if(rT > 0.5){ for(let i=0;i<=n;i++){ const f = Math.PI + i*(Math.PI/2)/n;
      O.push([-W/2+rT + rT*Math.cos(f), -H/2+rT + rT*Math.sin(f)]); } }
  else O.push([-W/2, -H/2]);
  if(r > 0.5){
    for(let i=0;i<=n;i++){ const f = Math.PI - i*(Math.PI/2)/n;
      O.push([-W/2+r + r*Math.cos(f), H/2-r + r*Math.sin(f)]); }
    for(let i=0;i<=n;i++){ const f = Math.PI/2 - i*(Math.PI/2)/n;
      O.push([ W/2-r + r*Math.cos(f), H/2-r + r*Math.sin(f)]); }
  } else { O.push([-W/2, H/2], [W/2, H/2]); }
  if(rT > 0.5){ for(let i=0;i<=n;i++){ const f = -Math.PI/2 + i*(Math.PI/2)/n;
      O.push([ W/2-rT + rT*Math.cos(f), -H/2+rT + rT*Math.sin(f)]); } }
  else O.push([W/2, -H/2]);
  // the two indices where the outline meets the straight part of the mouth: a zip that
  // carries down the ends starts from these, not from the ends of the array
  O.mouthL = rT > 0.5 ? n : 0;
  O.mouthR = rT > 0.5 ? O.length - 1 - n : O.length - 1;
  return O;
}

function render3d(){
  const V = S.view3d, W = S.W, H = S.H, D = Math.max(S.D, 6), t = S.thickness;
  const tap = (S.construction==='gusset'||S.construction==='fold') ? Math.min(S.taper, D*0.7) : 0;
  const corner = S.construction==='gusset' && S.gussetStyle!=='base'
               ? Math.min(S.corner, Math.min(W,H)/2)
               : Math.min(Math.max(6, D*0.12), Math.min(W,H)/6);
  const faces = [];
  // `on` names the body panel a face is glued to, and `layer` stacks the things glued to
  // the same panel. An overlay inherits its panel's sort depth, so a slanted panel can
  // never end up painted over its own pocket however the view is turned.
  // `pass` settles the one thing depth sorting cannot: a rolled mouth sits bodily on top of
  // the bag, so it is drawn after it - while its own faces still sort against each other.
  const put = (pts, cls, on, layer, opt) => faces.push(Object.assign({pts, cls, on, layer:layer||0, pass:0}, opt||{}));
  const line = (pts, on, layer, cls, opt) => faces.push(Object.assign({pts, cls:cls||'v-stitch', on, layer:layer||0, open:true, pass:0}, opt||{}));
  const dT = (D - tap)/2, dB = D/2;                    // bag space: x across, y down, z front+
  // a tapered panel leans, so anything sitting on it has to lean with it or the panel
  // will sort in front of its own pocket
  const zAt = (y, back, lift) => {
    const u = Math.max(0, Math.min(1, (y + H/2)/H));
    const z = dT + (dB - dT)*u + (lift || 0);
    return back ? -z : z;
  };
  const round2 = S.construction==='bucket', barrel = S.construction==='barrel';
  const RA = W/2, RB = Math.max(6, D/2), RN = 40;   // enough facets that a tube reads as round
  // a barrel is a tube on its side: the round part faces left and right, not up and down
  const BA = Math.max(10, H/2), BB = Math.max(6, D/2);
  // a bucket is a tube on a round base, so its surface is not a box and the things glued to
  // it have to follow the curve or they float
  const zSurf = (x, y, back, lift) => round2
    ? (back?-1:1) * (RB*Math.sqrt(Math.max(0, 1 - Math.min(1,(x/RA)*(x/RA)))) + (lift||0))
    : barrel
    ? (back?-1:1) * (BB*Math.sqrt(Math.max(0, 1 - Math.min(1,(y/BA)*(y/BA)))) + (lift||0))
    : zAt(y, back, lift);
  const rTop = topR();
  const O = bagOutline(W, H, corner, 5, rTop);
  const sqf = (c, top) => { const n = baseExp(top); return Math.sign(c)*Math.pow(Math.abs(c), 2/n); };
  if(barrel){
    const ring = x => { const p = []; for(let i=0;i<RN;i++){ const th = i*2*Math.PI/RN;
      const up = Math.cos(th) > 0;
      p.push([x, -BA*sqf(Math.cos(th), up), BB*sqf(Math.sin(th), up)]); } return p; };
    const endL = ring(-W/2), endR = ring(W/2);
    put(endL, 'v-lea2', 'sideL', 0);
    put(endR.slice().reverse(), 'v-lea2', 'sideR', 0);
    for(let i=0;i<RN;i++){
      const j = (i+1)%RN, k2 = (i+2)%RN;
      const ex = (a2,b2) => [a2[0], a2[1] + (b2[1]-a2[1])*0.06, a2[2] + (b2[2]-a2[2])*0.06];
      const nm = i===0 ? 'rim' : i===Math.round(RN/4) ? 'front'
               : i===Math.round(RN/2) ? 'base' : i===Math.round(3*RN/4) ? 'back' : null;
      put([endL[i], ex(endL[j], endL[k2]), ex(endR[j], endR[k2]), endR[i]], 'v-sm', nm, 0);
    }
    if(S.stitch.show){
      // the seam along the top, and the ring where each end goes in
      line([[-W/2, -BA + 1, 0],[W/2, -BA + 1, 0]], 'rim', 3);
      [[-1,'sideL'],[1,'sideR']].forEach(([sg,host])=>{
        const inset2 = Math.max(2, S.sa);
        const rg = []; for(let i=0;i<=RN;i++){ const th = i*2*Math.PI/RN;
          rg.push([sg*(W/2 - 0.4), -(BA-inset2)*Math.cos(th), (BB-inset2)*Math.sin(th)]); }
        line(rg, host, 1);
      });
    }
  } else if(round2){
    const ring = y => { const p = []; for(let i=0;i<RN;i++){ const th = i*2*Math.PI/RN;
      p.push([RA*sqf(Math.cos(th), false), y, RB*sqf(Math.sin(th), false)]); } return p; };
    const top = ring(-H/2), bot = ring(H/2);
    put(bot.slice().reverse(), 'v-lea', 'base');
    for(let i=0;i<RN;i++){
      const nm = i===Math.round(RN/4) ? 'front' : i===Math.round(3*RN/4) ? 'back'
               : i===0 ? 'sideR' : i===Math.round(RN/2) ? 'sideL' : null;
      const j = (i+1)%RN, k2 = (i+2)%RN;
      // each quad reaches a touch into the next one, so no hairline shows between them
      const ex = (a2,b2) => [a2[0] + (b2[0]-a2[0])*0.06, a2[1], a2[2] + (b2[2]-a2[2])*0.06];
      put([top[i], ex(top[j], top[k2]), ex(bot[j], bot[k2]), bot[i]], 'v-sm', nm, 0);
    }
    put(top, 'v-lea2', 'rim');
    if(S.stitch.show){
      // the two side seams and the join round the base - the only stitching a bucket has
      [0, Math.round(RN/2)].forEach(i=>line([top[i], bot[i]], i? 'sideL':'sideR', 3));
      const bj = ring(H/2 - Math.max(2, S.sa)).map(q=>[q[0]*0.985, q[1], q[2]*0.985]);
      line(bj.concat([bj[0]]), 'base', 1);
    }
  } else {
    const F = O.map(q => [q[0], q[1], zAt(q[1], false, 0)]);
    const B = O.map(q => [q[0], q[1], zAt(q[1], true, 0)]);
    put(F, 'v-lea', 'front');
    put(B.slice().reverse(), 'v-lea', 'back');
    // the gusset, swept round the outline: each step is its own quad so the light turns with it
    for(let i=0;i<O.length-1;i++){
      const nm = i===0 ? 'sideL' : (i===O.length-2 ? 'sideR' : null);
      put([F[i], F[i+1], B[i+1], B[i]], 'v-lea', nm, 0);
    }
    // the rim. The mouth is only as wide as the STRAIGHT part of the top edge - round the
    // corners off and the opening shrinks with them, which a full-width plate does not show.
    const rimIn = Math.max(1.2, t), mwr = W/2 - rTop;
    put([[-mwr,-H/2,dT], [mwr,-H/2,dT], [mwr,-H/2+0.01,-dT], [-mwr,-H/2+0.01,-dT]], 'v-lea2', 'rim');
    put([[-mwr,-H/2,dT], [-mwr,-H/2,-dT], [-mwr+rimIn,-H/2,-dT+rimIn], [-mwr+rimIn,-H/2,dT-rimIn]], 'v-lea2', 'rim', 1);
  }
  /* ---- a drawstring mouth: eyelets round the top and the cord through them ---- */
  if(drawOn()){
    const K3 = S.draw, dy = -H/2 + Math.max(K3.drop, S.sa + K3.size);
    if(K3.style==='eyelet'){
      const n3 = Math.max(4, Math.round(K3.n)), r3 = Math.max(1.6, K3.size/2);
      for(let i=0;i<n3;i++){
        const th = i*2*Math.PI/n3;
        const x = (round2 ? RA : W/2) * Math.cos(th);
        const back = Math.sin(th) < 0;
        const z = round2 ? RB*Math.sin(th) : zSurf(x, dy, back, 0.6);
        const host = back ? 'back' : 'front';
        put([[x-r3, dy-r3, z],[x+r3, dy-r3, z],[x+r3, dy+r3, z],[x-r3, dy+r3, z]], 'v-mtl', host, 3);
      }
    }
    const cy3 = dy - K3.size*0.2;
    for(let i=0;i<RN;i++){
      const th = i*2*Math.PI/RN, th2 = (i+1)*2*Math.PI/RN;
      const p = [(round2?RA:W/2)*Math.cos(th), cy3, (round2?RB:dT)*Math.sin(th)];
      const q = [(round2?RA:W/2)*Math.cos(th2), cy3, (round2?RB:dT)*Math.sin(th2)];
      put([[p[0],p[1]-1.4,p[2]],[q[0],q[1]-1.4,q[2]],[q[0],q[1]+1.4,q[2]],[p[0],p[1]+1.4,p[2]]], 'v-lea2', null, 0, {pass:1});
    }
  }

  /* ---- stitching: the seams you would actually see on the finished bag ---- */
  const stitchOn = S.stitch.show;
  const inset = Math.max(2, S.sa);
  if(stitchOn && !round2 && !barrel){
    // panel to gusset: the same outline again, pulled in by the seam allowance
    // a free profile is pulled IN by the seam allowance rather than scaled down by it: on a
    // crescent those two are not the same line at all
    const Oi = S.construction==='free'
      ? insetPoly(O, inset)
      : bagOutline(Math.max(8, W - 2*inset), Math.max(8, H - inset),
                   Math.max(0, corner - inset), 5, Math.max(0, rTop - inset)).map(q=>[q[0], q[1] - inset/2]);
    line(Oi.map(q=>[q[0], q[1], zAt(q[1], false, 0.5)]), 'front', 3);
    line(Oi.map(q=>[q[0], q[1], zAt(q[1], true, 0.5)]), 'back', 3);
    // and the rim row, which is what catches the lining or holds a turned edge
    if(rimRowOn()){
      const ry = -H/2 + Math.max(3, S.sa) + (S.edge==='turned' ? S.turn*0.15 : 0);
      const rmx = W/2 - rTop - inset;
      line([[-rmx, ry, zAt(ry,false,0.5)], [rmx, ry, zAt(ry,false,0.5)]], 'front', 4);
      line([[-rmx, ry, zAt(ry,true,0.5)],  [rmx, ry, zAt(ry,true,0.5)]],  'back', 4);
    }
  }

  const quadOn = (el, mirrored) => {
    const bb = rotBox(el.w, elFootH(el), el.rot||0), a = (el.rot||0)*Math.PI/180;
    const cy = -H/2 + el.y + bb.h/2;
    const corner2 = (sx, sy) => [ sx*el.w/2*Math.cos(a) - sy*el.h/2*Math.sin(a),
                                  sx*el.w/2*Math.sin(a) + sy*el.h/2*Math.cos(a) ];
    const cs = [corner2(-1,-1), corner2(1,-1), corner2(1,1), corner2(-1,1)];
    if(el.face==='gusset'){
      const side = mirrored ? -1 : 1;
      return cs.map(c=>[side*(W/2+0.4), cy + c[1], c[0]]);
    }
    if(el.face==='base'){
      /* The bottom plan is drawn looking UP from underneath with the back at the top, so an
         element's y there is measured in from the BACK edge. On the model that is a depth,
         not a height: the quad lies in the plane of the base. Everything on the base used to
         be drawn on the front panel, which is why a bag foot floated on the front of the bag. */
      const zc = -D/2 + el.y + bb.h/2;
      return cs.map(c=>[(mirrored ? -el.x : el.x) + c[0], H/2 + 0.5, zc + c[1]]);
    }
    const back = el.face==='back';
    const cx = mirrored ? -el.x : el.x;
    return cs.map(c=>{ const X = (cx + c[0])*(back?-1:1); return [X, cy + c[1], zSurf(X, cy + c[1], back, 0.4)]; });
  };
  S.elements.forEach(el=>{
    const T = ELTYPES[el.type];
    if(!T || el.face==='inside') return;
    const cls = T.point ? 'v-mtl' : 'v-lea2';
    const host = el.face==='gusset' ? 'sideR' : el.face;
    if(T.feet){
      // every foot is its own little cylinder end on the underside, which is the only way to
      // see whether the set actually stands the bag up
      const zc = -D/2 + el.y + rotBox(el.w, elFootH(el), el.rot||0).h/2;
      feetPts(el.x - el.w/2, zc - el.h/2, el.w, el.h, rivetSpecAt(el)).forEach(f=>{
        const r4 = 5;
        put([[f[0]-r4, H/2 + 1.2, f[1]-r4],[f[0]+r4, H/2 + 1.2, f[1]-r4],
             [f[0]+r4, H/2 + 1.2, f[1]+r4],[f[0]-r4, H/2 + 1.2, f[1]+r4]], 'v-mtl', 'base', 1);
      });
      return;
    }
    const q = quadOn(el,false);
    put(q, cls, host, 1);
    if(stitchOn && !T.point) line(q.concat([q[0]]), host, 2);
    if(el.mirror){
      const h2 = el.face==='gusset' ? 'sideL' : host, q2 = quadOn(el,true);
      put(q2, cls, h2, 1);
      if(stitchOn && !T.point) line(q2.concat([q2[0]]), h2, 2);
    }
  });
  if(S.pocket.on){
    const K = S.pocket, cy = H/2 - K.y - K.h/2;
    const q = [[K.x-K.w/2,cy-K.h/2,0],[K.x+K.w/2,cy-K.h/2,0],[K.x+K.w/2,cy+K.h/2,0],[K.x-K.w/2,cy+K.h/2,0]]
      .map(p2=>[p2[0], p2[1], zSurf(p2[0], p2[1], false, 0.5)]);
    put(q, 'v-lea2', 'front', 1);
    // a patch pocket is stitched on three sides - the mouth is open, and it shows
    if(stitchOn) line([q[0], q[3], q[2], q[1]], 'front', 2);
  }
  if(S.top==='flap'){
    /* A flap hangs off the mouth, and on a profile she drew the mouth is a chord between her
       two marks rather than the whole top edge of the bag. */
    const fhw = (S.construction==='free' ? mouthChord() : W)/2;
    const drop = S.flap.drop;
    const y0 = S.construction==='free' ? Math.min(O[O.mouthL][1], O[O.mouthR][1]) : -H/2;
    const zTop = zAt(y0, false, 0.9);
    put([[-fhw,y0,-dT],[fhw,y0,-dT],[fhw,y0-t*2,zTop],[-fhw,y0-t*2,zTop]],'v-lea','rim',1);
    // the flap's own shape, not just a rectangle
    const rad = Math.min(S.flap.radius, fhw, drop);
    const fp = [];
    // it has to stand proud of the panel by more than a hair, or a flap parallel to the
    // front is invisible however well it is lit
    const lift = Math.max(2.4, t*1.6);
    const zf = y => zAt(Math.min(y, H/2), false, lift);
    if(S.flap.style==='point'){
      const pd = Math.min(fhw, drop*0.9);
      fp.push([-fhw,y0-t*2],[fhw,y0-t*2],[fhw,y0+drop-pd],[0,y0+drop],[-fhw,y0+drop-pd]);
    } else if(S.flap.style==='tongue'){
      const tw = Math.max(fhw*0.84,40), sh = Math.min(drop*0.55, drop-4);
      fp.push([-fhw,y0-t*2],[fhw,y0-t*2],[fhw,y0+drop-sh],[tw/2,y0+drop-sh],[tw/2,y0+drop],
              [-tw/2,y0+drop],[-tw/2,y0+drop-sh],[-fhw,y0+drop-sh]);
    } else if(S.flap.style==='round' && rad > 1){
      fp.push([-fhw,y0-t*2],[fhw,y0-t*2],[fhw,y0+drop-rad]);
      for(let i=1;i<=5;i++){ const f = -i*(Math.PI/2)/5;
        fp.push([fhw-rad + rad*Math.cos(f), y0+drop-rad - rad*Math.sin(f)]); }
      for(let i=0;i<=5;i++){ const f = -Math.PI/2 - i*(Math.PI/2)/5;
        fp.push([-fhw+rad + rad*Math.cos(f), y0+drop-rad - rad*Math.sin(f)]); }
    } else fp.push([-fhw,y0-t*2],[fhw,y0-t*2],[fhw,y0+drop],[-fhw,y0+drop]);
    const fq = fp.map(q=>[q[0], q[1], zf(q[1])]);
    // the shadow the flap throws on the panel under its edge - the other half of reading it
    const sh = fp.slice(2).map(q=>[q[0], q[1], zAt(Math.min(q[1],H/2), false, 0.3)]);
    put(sh.concat(sh.slice().reverse().map(q=>[q[0], q[1]+Math.max(5, drop*0.06), q[2]])), 'v-shade', 'front', 1);
    put(fq, 'v-lea', 'front', 2);
    // the cut edge of the flap: a real band of leather as thick as the leather is
    const edgeQ = fp.slice(1);
    for(let i=0;i<edgeQ.length-1;i++){
      const a = edgeQ[i], b = edgeQ[i+1];
      put([[a[0],a[1],zf(a[1])],[b[0],b[1],zf(b[1])],
           [b[0],b[1],zf(b[1])-Math.max(1.4,t)],[a[0],a[1],zf(a[1])-Math.max(1.4,t)]], 'v-lea2', 'front', 3);
    }
    if(stitchOn) line(fq.slice(1).concat([fq[fq.length-1]]), 'front', 4);
    if(S.flap.closure!=='none'){
      const cyc = y0 + drop - S.flap.cInset, r2 = 8, z = zf(cyc) + 1.6;
      put([[-r2,cyc-r2,z],[r2,cyc-r2,z],[r2,cyc+r2,z],[-r2,cyc+r2,z]],'v-mtl','front',5);
    }
  }
  /* ---- a zip reads as a zip only if the chain lies IN the mouth ---- */
  if(S.top==='zip'){
    const G = zipG(), th = G.teeth, ins = zipInset(), wz = zipWrap();
    // on a barrel the mouth is the seam along the top of the tube, not the top of a box
    const mw = barrel ? W/2 : W/2 - rTop, my = barrel ? -BA : -H/2;
    // the chain is a flat ribbon lying in the opening, seen edge-on from the front
    put([[-mw, my, -th/2],[mw, my, -th/2],[mw, my, th/2],[-mw, my, th/2]], 'v-mtl', 'rim', 2);
    // a tape down each face, stitched ins from the edge
    [[false,'front'],[true,'back']].forEach(([bk, host])=>{
      const z0 = barrel ? zSurf(0, my + 0.5, bk, 0.4) : zAt(my, bk, 0.5);
      const z1 = barrel ? zSurf(0, my + ins, bk, 0.4) : zAt(my + ins, bk, 0.5);
      put([[-mw, my, z0],[mw, my, z0],[mw, my + ins, z1],[-mw, my + ins, z1]], 'v-lea2', host, 1);
      if(stitchOn) line([[-mw + 3, my + ins, z1],[mw - 3, my + ins, z1]], host, 2);
    });
    // the slider, sitting on the chain a little off centre, with its pull hanging forward
    const sx2 = mw*0.34, sl = Math.max(6, th*1.7), sw = Math.max(4, th*1.3);
    put([[sx2-sl, my - sw*0.5, -sw],[sx2+sl, my - sw*0.5, -sw],
         [sx2+sl, my - sw*0.5, sw],[sx2-sl, my - sw*0.5, sw]], 'v-mtl', 'rim', 4, {pass:1});
    put([[sx2-sl*0.35, my, sw*0.9],[sx2+sl*0.35, my, sw*0.9],
         [sx2+sl*0.35, my + sl*2.4, sw*0.9 + sl*0.7],[sx2-sl*0.35, my + sl*2.4, sw*0.9 + sl*0.7]],
        'v-lea2', 'rim', 5, {pass:1});
    if(wz > 0){
      // and it carries on round the corner and down each end, which is the point of doing it
      // from where the straight mouth ends, follow the outline inward for `wz`
      const walk = (from, step) => {
        const pts = [O[from]];
        let run2 = 0, k = from;
        while(k + step >= 0 && k + step < O.length){
          const a2 = O[k], b2 = O[k + step];
          const seg = Math.hypot(b2[0]-a2[0], b2[1]-a2[1]);
          if(run2 + seg > wz){
            const f = (wz - run2)/seg;
            pts.push([a2[0] + (b2[0]-a2[0])*f, a2[1] + (b2[1]-a2[1])*f]);
            break;
          }
          run2 += seg; pts.push(b2); k += step;
        }
        return pts;
      };
      [[-1, O.mouthL, -1], [1, O.mouthR, 1]].forEach(([sg, from, step])=>{
        const pts = walk(from, step), host = sg < 0 ? 'sideL' : 'sideR';
        for(let k=0;k+1<pts.length;k++){
          const a2 = pts[k], b2 = pts[k+1];
          put([[a2[0], a2[1], -th/2],[b2[0], b2[1], -th/2],[b2[0], b2[1], th/2],[a2[0], a2[1], th/2]], 'v-mtl', host, 2);
          [-1,1].forEach(sd=>put([[a2[0], a2[1], sd*th/2],[b2[0], b2[1], sd*th/2],
                                  [b2[0], b2[1], sd*(th/2 + ins)],[a2[0], a2[1], sd*(th/2 + ins)]], 'v-lea2', host, 1));
        }
      });
    }
  }
  if(S.top==='magnet'){
    const my = -H/2 + 18, z = zAt(my, false, 1.2);
    put([[-8,my-8,z],[8,my-8,z],[8,my+8,z],[-8,my+8,z]], 'v-mtl', 'front', 2);
  }
  /* ---- roll top: shown rolled, because that is how the bag is actually carried ---- */
  if(rollOn()){
    const turns = Math.max(1, Math.round(S.roll.turns)), per = S.roll.turn;
    const R = rollBundleR();
    const yc = -H/2 - R - t, N = 18, TOP = {pass:1};
    const endL = [], endR = [];
    for(let i=0;i<=N;i++){ const f = i*2*Math.PI/N;
      endL.push([-W/2, yc + R*Math.sin(f), R*Math.cos(f)]);
      endR.push([ W/2, yc + R*Math.sin(f), R*Math.cos(f)]); }
    // the mouth lifting off the rim into the bundle - BOTH faces and both ends, or you can
    // see straight down into the bag from behind
    put([[-W/2,-H/2,dT],[W/2,-H/2,dT],[W/2,yc,R],[-W/2,yc,R]], 'v-lea', 'rim', 1, TOP);
    put([[W/2,-H/2,-dT],[-W/2,-H/2,-dT],[-W/2,yc,-R],[W/2,yc,-R]], 'v-lea', 'rim', 1, TOP);
    [-1,1].forEach(sg=>put([[sg*W/2,-H/2,dT],[sg*W/2,-H/2,-dT],[sg*W/2,yc,-R],[sg*W/2,yc,R]],
                           'v-lea2', sg<0?'sideL':'sideR', 1, TOP));
    // the bundle stands bodily above the bag, so it goes in the late pass; inside that pass
    // its own faces still sort by depth, which is what makes the cylinder read as round
    put(endL, 'v-lea2', 'rollL', 0, TOP);
    put(endR.slice().reverse(), 'v-lea2', 'rollR', 0, TOP);
    for(let i=0;i<N;i++) put([endL[i],endL[i+1],endR[i+1],endR[i]], 'v-lea', null, 0, TOP);
    // a spiral on each end: it is what makes a roll read as a roll, and it counts the turns
    [[-1,'rollL'],[1,'rollR']].forEach(([sg,host])=>{
      const sp = [], steps = turns*14;
      for(let i=0;i<=steps;i++){
        const f = Math.PI/2 + i*turns*2*Math.PI/steps, rr3 = R*(0.18 + 0.8*i/steps);
        sp.push([sg*(W/2+0.4), yc + rr3*Math.sin(f), rr3*Math.cos(f)]);
      }
      line(sp, host, 1, 'v-crease', TOP);
    });
    if(S.roll.closure==='strap'){
      // the strap comes up the back, over the bundle and down the front to its buckle
      const ay = -H/2 + rollAnchorY(), hw2 = ROLL_STRAP_W/2, M = 16;
      const seg2 = [];
      seg2.push([ay, -dT - 0.8], [-H/2, -dT - 0.8]);
      for(let i=0;i<=M;i++){ const f = Math.PI + i*Math.PI/M;
        seg2.push([yc + R*Math.sin(f) - (f>Math.PI*1.5?0:0), R*Math.cos(f)]); }
      seg2.push([-H/2, dT + 0.8], [ay, dT + 0.8]);
      for(let i=0;i<seg2.length-1;i++){
        const a2 = seg2[i], b2 = seg2[i+1];
        put([[-hw2, a2[0], a2[1]],[-hw2, b2[0], b2[1]],[hw2, b2[0], b2[1]],[hw2, a2[0], a2[1]]],
            'v-lea', 'rim', 2, TOP);
      }
      put([[-hw2*0.8, ay, dT + 1.4],[hw2*0.8, ay, dT + 1.4],
           [hw2*0.8, ay + 16, dT + 1.4],[-hw2*0.8, ay + 16, dT + 1.4]], 'v-mtl', 'front', 3);
    } else if(S.roll.closure!=='none'){
      const ay = -H/2 + rollAnchorY(), tw2 = ROLL_TAB_W, zc2 = 0;
      [-1,1].forEach(sg=>{
        const x = sg*(W/2 + 0.7);
        // tab from the bundle down the side to the anchor, then the hardware on both
        put([[x, yc, zc2 - tw2/2], [x, yc, zc2 + tw2/2],
             [x, ay, zc2 + tw2/2], [x, ay, zc2 - tw2/2]], 'v-lea', sg<0?'sideL':'sideR', 1);
        put([[x+sg*0.6, ay-8, zc2-8], [x+sg*0.6, ay-8, zc2+8],
             [x+sg*0.6, ay+8, zc2+8], [x+sg*0.6, ay+8, zc2-8]], 'v-mtl', sg<0?'sideL':'sideR', 2);
        put([[x+sg*0.3, ay+8, zc2-ROLL_ANCHOR_L/2], [x+sg*0.3, ay+8, zc2+ROLL_ANCHOR_L/2],
             [x+sg*0.3, ay+24, zc2+ROLL_ANCHOR_L/2], [x+sg*0.3, ay+24, zc2-ROLL_ANCHOR_L/2]],
            'v-lea2', sg<0?'sideL':'sideR', 1);
      });
    }
  }
  /* ---- carry ---- */
  const K = S.strap;
  /* A strap is a ribbon of quads. Each quad is lit on its own, so a strap that curves away
     over the shoulder darkens as it turns - which is the only cue that it is not flat. */
  const ribbon = (pathFn, steps, hw, axis, host, layer) => {
    for(let i=0;i<steps;i++){
      const a0 = pathFn(i/steps), a1 = pathFn((i+1)/steps);
      const q = axis==='z'
        ? [[a0[0],a0[1],a0[2]-hw],[a1[0],a1[1],a1[2]-hw],[a1[0],a1[1],a1[2]+hw],[a0[0],a0[1],a0[2]+hw]]
        : [[a0[0]-hw,a0[1],a0[2]],[a1[0]-hw,a1[1],a1[2]],[a1[0]+hw,a1[1],a1[2]],[a0[0]+hw,a0[1],a0[2]]];
      put(q, 'v-lea', host || null, layer || 0);
    }
  };
  if(K.type==='handles'){
    const Hd = S.handles, top2 = barrel ? -BA : -H/2;
    const ay = top2 + Hd.anchorY, s2 = Hd.span/2;
    // a rolled handle is round in the hand and flat where it lands, so it is drawn as both
    const rolled = Hd.build === 'rolled';
    const gw2 = rolled ? (Math.max(3,Hd.core) + 2*t)/2 : Math.max(8,Hd.width)/2;
    const tw4 = handleTailW()/2;
    [[false,'front'], [true,'back']].forEach(([bk,host])=>{
      const z = barrel ? zSurf(0, ay, bk, 0.6) : (bk ? -(dT+0.5) : dT+0.5);
      const z0 = barrel ? zSurf(0, top2 + 2, bk, 0.6) : z;
      [-1,1].forEach(sg=>put([[sg*s2-tw4, ay, z],[sg*s2+tw4, ay, z],
                              [sg*s2+tw4, top2, z0],[sg*s2-tw4, top2, z0]], 'v-lea2', host, 1));
      ribbon(u=>[-s2 + Hd.span*u, top2 - Math.sin(Math.PI*u)*Hd.rise,
                 z0 + (bk?-1:1)*Math.sin(Math.PI*u)*Math.min(6, D*0.06)], 18, gw2, 'x', 'rim', 2);
      if(rolled) ribbon(u=>[-s2 + Hd.span*u, top2 - Math.sin(Math.PI*u)*Hd.rise - gw2*0.55,
                 z0 + (bk?-1:1)*Math.sin(Math.PI*u)*Math.min(6, D*0.06)], 18, gw2*0.5, 'x', 'rim', 3);
      if(stitchOn) [-1,1].forEach(sg=>line([[sg*s2-tw4+2, ay+2, z],[sg*s2+tw4-2, ay+2, z],
        [sg*s2+tw4-2, top2+3, z0],[sg*s2-tw4+2, top2+3, z0],[sg*s2-tw4+2, ay+2, z]], host, 2));
    });
  } else if(K.type==='pack'){
    const ay = -H/2 + K.anchorY, s2 = Math.min(K.packSpan/2, W*0.34), al = Math.max(18, K.tabLen);
    [-1,1].forEach(sg => {
      put([[sg*s2-K.width/2, ay, -(dT+0.5)],[sg*s2+K.width/2, ay, -(dT+0.5)],
           [sg*s2+K.width/2, ay+al, -(dT+0.5)],[sg*s2-K.width/2, ay+al, -(dT+0.5)]], 'v-lea2', 'back', 1);
      ribbon(u=>[ sg*(s2 - (s2 - s2*0.55)*u),
          ay + (H - K.anchorY - al - 8)*u,
          -(dT+0.5) - Math.sin(Math.PI*u)*Math.max(D*0.5, H*0.15) ], 24, K.width/2, 'x', 'back', 2);
      put([[sg*s2*0.55-K.width/2, ay+(H-K.anchorY-al-8), -(dT+0.5)],[sg*s2*0.55+K.width/2, ay+(H-K.anchorY-al-8), -(dT+0.5)],
           [sg*s2*0.55+K.width/2, ay+(H-K.anchorY-8), -(dT+0.5)],[sg*s2*0.55-K.width/2, ay+(H-K.anchorY-8), -(dT+0.5)]], 'v-lea2', 'back', 1);
    });
  } else if(K.type==='belt'){
    // the belt threads through the loops and carries on round you, so it leaves the drawing
    const el0 = S.elements.find(e=>e.type==='beltloop');
    const by2 = -H/2 + (el0 ? el0.y + (el0.h||24)/2 : H*0.25), bw2 = K.width/2;
    const bz = -(dT + 1.2);
    put([[-W*0.95, by2-bw2, bz],[W*0.95, by2-bw2, bz],[W*0.95, by2+bw2, bz],[-W*0.95, by2+bw2, bz]], 'v-lea2', 'back', 1);
    [-1,1].forEach(sg=>put([[sg*W*0.95, by2-bw2, bz],[sg*(W*0.95+bw2*1.6), by2-bw2, bz - bw2*2.2],
                            [sg*(W*0.95+bw2*1.6), by2+bw2, bz - bw2*2.2],[sg*W*0.95, by2+bw2, bz]], 'v-lea2', 'back', 1));
  } else if(K.type!=='none'){
    const ay = -H/2 + K.anchorY, hw = K.width/2;
    [-1,1].forEach(sg => {
      // the tab on the gusset, then the strap lifting away towards the shoulder
      put([[sg*(W/2+0.5), ay, -hw],[sg*(W/2+0.5), ay, hw],
           [sg*(W/2+0.5), ay+Math.max(18,K.tabLen), hw],[sg*(W/2+0.5), ay+Math.max(18,K.tabLen), -hw]],
          'v-lea2', sg<0?'sideL':'sideR', 1);
      ribbon(u=>[ sg*(W/2 - u*W*0.30), ay - K.drop*0.5*u, -Math.sin(Math.PI*u*0.5)*D*0.25 ], 10, hw, 'z', 'rim', 2);
    });
    if(K.type==='adjust'){
      const bz = -D*0.1;
      put([[-(W/2)+W*0.10-hw-3, -H/2-K.drop*0.19, bz],[-(W/2)+W*0.10+hw+3, -H/2-K.drop*0.19, bz],
           [-(W/2)+W*0.10+hw+3, -H/2-K.drop*0.19+16, bz],[-(W/2)+W*0.10-hw-3, -H/2-K.drop*0.19+16, bz]],
          'v-mtl', 'rim', 3);
    }
  }

  const drawn = faces.map(f=>{
    const p = f.pts.map(q=>proj3(q, V.yaw, V.pitch));
    return {p, depth:p.reduce((s,q)=>s+q[2],0)/p.length, cls:f.cls, on:f.on, layer:f.layer,
            open:f.open, pts:f.pts, pass:f.pass||0};
  });
  const panelDepth = {};
  drawn.forEach(f=>{ if(f.layer === 0 && f.on) panelDepth[f.on] = f.depth; });
  drawn.forEach(f=>{ if(f.layer > 0 && panelDepth[f.on] != null) f.depth = panelDepth[f.on] + f.layer*0.01; });
  drawn.sort((a,b)=>(a.pass - b.pass) || (a.depth - b.depth));
  const xs = [], ys = [];
  drawn.forEach(f=>f.p.forEach(q=>{ xs.push(q[0]); ys.push(q[1]); }));
  const pad = 26;
  const x0 = Math.min.apply(null,xs)-pad, x1 = Math.max.apply(null,xs)+pad;
  const y0b = Math.min.apply(null,ys)-pad, y1 = Math.max.apply(null,ys)+pad;
  // a contact shadow, so the bag sits on something instead of floating
  const base = proj3([0, barrel ? BA : H/2, 0], V.yaw, V.pitch);
  const shadow = `<ellipse cx="${nn(base[0])}" cy="${nn(base[1] + Math.max(3, D*0.10))}" `
    + `rx="${nn(W*0.62)}" ry="${nn(Math.max(6, D*0.30))}" class="v-ground"/>`;
  const body = drawn.map(f=>{
    const d = `M ${f.p.map(q=>nn(q[0])+' '+nn(q[1])).join(' L ')}` + (f.open ? '' : ' Z');
    const at = (f.on ? ` data-on="${f.on}" data-layer="${f.layer}"` : '');
    if(f.open) return `<path d="${d}" class="${f.cls}"${at}/>`;
    const lo = f.cls==='v-lea2' ? '--lea2-lo' : f.cls==='v-mtl' ? '--mtl-lo' : f.cls==='v-acc' ? '--acc-lo' : '--lea-lo';
    const hi = f.cls==='v-lea2' ? '--lea2-hi' : f.cls==='v-mtl' ? '--mtl-hi' : f.cls==='v-acc' ? '--acc-hi' : '--lea-hi';
    const k = litPct(f.pts, V.yaw, V.pitch);
    return `<path d="${d}" class="${f.cls}"${at}`
      + ` style="fill:color-mix(in srgb, var(${hi}) ${nn(k)}%, var(${lo}))"/>`;
  }).join('');
  return `<svg viewBox="${nn(x0)} ${nn(y0b)} ${nn(x1-x0)} ${nn(y1-y0b)}" id="v3d" xmlns="http://www.w3.org/2000/svg">`
    + shadow + body + `</svg>`;
}

