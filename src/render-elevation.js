/* ============================================================
   RENDER \u2014 elevation (drag features into place)
   ============================================================ */
let DRAGS = [];
function renderElev(model){
  DRAGS = []; FDRAGS = [];
  const W=S.W, H=S.H, D=Math.max(S.D,8), t=S.thickness;
  const carry = (S.strap.type!=='none');
  const rext = rollExt();
  const topPad = (S.strap.type==='handles' ? S.handles.rise*1.12 + 26
                : (carry ? (S.strap.type==='pack' ? 46 : 92) : 34)) + rext + (rext?26:0);
  const gap = Math.max(74, W*0.26), ox = 46, oy = topPad;
  /* A folded wrap with no depth is a wallet, and a wallet is drawn OPEN: four elevations of
     one would be one drawing and three 8 mm slivers. Anything with a real gusset is a clutch
     and keeps the ordinary views. */
  const isWallet = S.construction==='fold' && S.D < 12;
  const vw = isWallet ? ox + W + 260
                      : ox + W + gap + D + gap + W + gap + D + 56;   // front, left, back, right
  const fs = vw/90, hr = vw/170;      // smaller type: these drawings were crowding themselves
  // a bucket also has its base drawn underneath, which needs a good deal more room
  const planD = Math.max(24, D);          // the plan view sits under the front elevation
  const vh = isWallet ? oy + 2*H + (S.top==='flap' ? S.flap.drop : 0) + fs*9
           : oy + H + 62 + planD + fs*10 + (S.construction==='bucket' ? fs*10 + S.D : 0);
  const r  = S.construction==='gusset' && S.gussetStyle!=='base' ? Math.min(S.corner, Math.min(W,H)/2) : (S.construction==='boxed'? Math.min(12,W/8) : 0);
  const rT2 = topR();
  /* One definition of the body outline in the elevations, so the front and the back cannot
     disagree about what shape the bag is. On a profile she drew it is her profile; on
     everything else it is the rounded rectangle it always was. */
  const FP = S.construction==='free' ? freeProfile(W, H) : null;
  const bodyD = x0 => FP ? poly(FP.pts.map(q=>[x0 + q[0], oy + q[1]]))
                         : rr(x0, oy, W, H, {br:r, bl:r, tl:rT2, tr:rT2});
  const mouthAt = x0 => FP ? [[x0 + FP.pts[FP.mouth.a][0], oy + FP.pts[FP.mouth.a][1]],
                              [x0 + FP.pts[FP.mouth.b][0], oy + FP.pts[FP.mouth.b][1]]]
                           : [[x0 + rT2, oy], [x0 + W - rT2, oy]];
  let ANCHORS = [];
  const T_ = e => ELTYPES[e.type].name.toLowerCase() + ' ' + e.id;
  const SIDENOTE = [];                    // captions that belong under the side view
  /* A zip drawn as a zip: two tapes, the chain between them, the stops, and a slider you
     can see. One dashed line told you nothing about where the thing actually sits. */
  const zipRun = (a, b, at, axis, G, ins) => {
    const P2 = (u, v) => axis==='h' ? [u, v] : [v, u];
    let g = '';
    const t0 = P2(a, at + ins), t1 = P2(b, at + ins);
    const c0 = P2(a, at), c1 = P2(b, at);
    g += `<path d="M ${nn(t0[0])} ${nn(t0[1])} L ${nn(t1[0])} ${nn(t1[1])}" class="ev-ztape"/>`;
    g += `<path d="M ${nn(c0[0])} ${nn(c0[1])} L ${nn(c1[0])} ${nn(c1[1])}" class="ev-zchain" stroke-width="${nn(G.teeth)}"/>`;
    [a + ZIP_TAB_COVER, b - ZIP_TAB_COVER].forEach(x=>{
      const s0 = P2(x, at - G.teeth), s1 = P2(x, at + ins + 1);
      g += `<path d="M ${nn(s0[0])} ${nn(s0[1])} L ${nn(s1[0])} ${nn(s1[1])}" class="ev-dim"/>`;
    });
    const sx2 = a + (b-a)*0.66, sl = Math.max(9, G.teeth*2.2);
    const q = P2(sx2, at);
    g += `<rect x="${nn(q[0] - (axis==='h'?sl:G.teeth*1.5))}" y="${nn(q[1] - (axis==='h'?G.teeth*1.5:sl))}"
           width="${nn(axis==='h'?sl*2:G.teeth*3)}" height="${nn(axis==='h'?G.teeth*3:sl*2)}" rx="2" class="ev-zslide"/>`;
    return g;
  };
  const T = (x,y,s,anch,cls,size) => `<text x="${nn(x)}" y="${nn(y)}" font-size="${nn(size||fs)}" text-anchor="${anch||'middle'}" class="${cls||'ev-t'}">${esc(s)}</text>`;
  let o = `<svg viewBox="0 0 ${nn(vw)} ${nn(vh)}" id="elevsvg" xmlns="http://www.w3.org/2000/svg">`;
  /* The bench the drawing is lying on. Everything else here is the bag; this is what you
     measure it against. Ten millimetres fine, fifty heavier, and the origin is the top left
     corner of the FRONT elevation, so a line falls exactly on the edge of the bag and the
     numbers you read off it are millimetres from the bag, not from the page. */
  if(S.grid !== false){
    let gd = '', gm = '';
    for(let x = ox % 10; x <= vw; x += 10)
      (Math.round(x - ox) % 50 ? (gd += `M ${nn(x)} 0 V ${nn(vh)} `) : (gm += `M ${nn(x)} 0 V ${nn(vh)} `));
    for(let y = oy % 10; y <= vh; y += 10)
      (Math.round(y - oy) % 50 ? (gd += `M 0 ${nn(y)} H ${nn(vw)} `) : (gm += `M 0 ${nn(y)} H ${nn(vw)} `));
    o += `<g class="ev-gridg" aria-hidden="true"><path d="${gd}" class="ev-gridl"/><path d="${gm}" class="ev-gridl maj"/></g>`;
  }
  /* Both centre lines of every face, always there. Symmetry is what you are checking by eye
     on an elevation, and until now there was nothing on the drawing to check it against -
     the centre line only appeared while something was actually being dragged. */
  let CTR = '';
  const ctrLines = (cx, cy, w2, h2) => {
    // collected rather than emitted where they are drawn: a panel is filled, and a guide
    // painted under the fill is a guide you cannot see. They go on over the drawing and
    // under the handles, which is where a guide belongs
    CTR += `<path d="M ${nn(cx)} ${nn(cy - h2/2 - 10)} V ${nn(cy + h2/2 + 10)}" class="ev-ctrl"/>`
         + `<path d="M ${nn(cx - w2/2 - 10)} ${nn(cy)} H ${nn(cx + w2/2 + 10)}" class="ev-ctrl"/>`;
    return '';
  };
  /* Every handle goes into its OWN string and is concatenated last, so the whole set paints
     over the drawing rather than under whatever happened to be drawn after it. A grip on the
     body's side edge was being buried by the flap, the pocket and every element on the front
     panel, and a handle you cannot see is a handle you cannot find. */
  let HND = '';

  /* An edge you can pull. The line you grab is fat and invisible; a bar sits along the edge so
     you can see there is something to take hold of, and lights up under the pointer. `k` is
     how far the number moves per millimetre of travel: [1,0] is "follows x", [-1,0] is "the
     other side of the same width", [2,0] is "both sides at once, because this one is centred". */
  const pull = (p, k) => ({
    grab: () => +get(p),
    move: (dx, dy, v0) => {
      // the cap is read on every frame: it moves when the bag does
      const lim = limOf(p);
      set(p, Math.max(lim[0], Math.min(lim[1], Math.round((v0 + k[0]*dx + k[1]*dy)*2)/2)));
      syncInput(p);
    }});
  const grip = (id, a, b, ax, p, k, sel, offMul) => {
    if(!LIM[p]) return;
    /* Two things, not one. The thing you can GRAB is still the whole edge, fat and invisible.
       The thing you can SEE is a short rail floating just outside the middle of it, in the
       direction that edge travels when the number grows - which `k` already knows. Drawn on
       the edge itself it sat exactly on top of the outline and was invisible until you
       happened to sweep the pointer over it; drawn end to end it buried the dimension. */
    const kl = Math.hypot(k[0], k[1]) || 1, off = hr*(offMul || 0.8);
    const ux = k[0]/kl*off, uy = k[1]/kl*off;
    const edge = `M ${nn(a[0])} ${nn(a[1])} L ${nn(b[0])} ${nn(b[1])}`;
    const at = f => [nn(a[0] + (b[0]-a[0])*f + ux), nn(a[1] + (b[1]-a[1])*f + uy)];
    const q0 = at(0.26), q1 = at(0.74);
    const rail = `M ${q0[0]} ${q0[1]} L ${q1[0]} ${q1[1]}`;
    HND += `<g class="ev-gk" id="${id}"${sel?` data-sel="${sel}"`:''}>`
       + `<path d="${rail}" class="ev-gripr"/><path d="${rail}" class="ev-gripv"/>`
       + `<path d="${edge}" class="ev-grip ${ax}"/><path d="${rail}" class="ev-grip ${ax}"/></g>`;
    DRAGS.push(Object.assign({id}, pull(p, k)));
  };
  /* The same thing for a single number with no edge to speak of - a corner radius, a taper.
     A plain circle said "you can drag this" and nothing else: not which way it moves, and not
     what it is currently worth. So: a small disc with a double arrow through it pointing the
     way it travels, and the number written beside it. */
  const knob = (id, x, y, p, k, sel, side) => {
    if(!LIM[p]) return;
    const r2 = hr*1.25, L2 = hr*2.5;
    const a = Math.atan2(k[1], k[0]), ux = Math.cos(a), uy = Math.sin(a), hd = hr*0.85;
    let arr = `M ${nn(x-ux*L2)} ${nn(y-uy*L2)} L ${nn(x+ux*L2)} ${nn(y+uy*L2)}`;
    [-1, 1].forEach(sg=>{
      const tx = x + sg*ux*L2, ty = y + sg*uy*L2;
      arr += ` M ${nn(tx)} ${nn(ty)} L ${nn(tx - sg*ux*hd - uy*hd*0.6)} ${nn(ty - sg*uy*hd + ux*hd*0.6)}`
           + ` M ${nn(tx)} ${nn(ty)} L ${nn(tx - sg*ux*hd + uy*hd*0.6)} ${nn(ty - sg*uy*hd - ux*hd*0.6)}`;
    });
    const lim = limOf(p), v = +get(p);
    const at = v >= lim[1] - 0.26 ? ' atlim' : '';       // say so rather than simply stopping
    HND += `<g id="${id}" class="ev-knobg${at}"${sel?` data-sel="${sel}"`:''}>`
       + `<circle cx="${nn(x)}" cy="${nn(y)}" r="${nn(r2)}" class="ev-knob"/>`
       + `<path d="${arr}" class="ev-karr"/>`
       + `<circle cx="${nn(x)}" cy="${nn(y)}" r="${nn(hr*3)}" class="ev-hit"/></g>`;
    // the number lives with the knob, pushed clear along the arrow's own perpendicular
    const px = -uy, py = ux, sd = side == null ? 1 : side;
    HND += T(x + px*L2*1.5*sd, y + py*L2*1.5*sd + fs*0.3, fmt(v, {unit:false})
             + (at ? ' \u00b7 max' : ''), 'middle', 'ev-tn' + at, fs*0.8);
    DRAGS.push(Object.assign({id}, pull(p, k)));
  };
  /* An added part is a box, and a box whose size is drawn on the page is a box you expect to
     be able to pull. Everything else on this drawing resizes by dragging its edge; a feet set
     or a pocket could only be resized by typing a number, which is exactly the complaint.
     Same two things as every other edge - a fat invisible line to take hold of, and a short
     rail floating just outside it so you can see there is something to take hold of - and the
     pair rides the element's OWN frame, so a turned box's grips turn with it.

     Width grows from the middle, because x is the offset of the CENTRE from the centre line
     and a box that wandered sideways as it grew would fight the guide. Height grows downward,
     because y is measured to the TOP of the box, down from the rim: pull the bottom edge and
     the top stays where it was put. */
  const EL_MIN = 5, EL_MAX = 400;
  const elGrip = (id, el, k, a, b, ux, uy, pcx, pcy, deg) => {
    const off = hr*0.9;
    const edge = `M ${nn(a[0])} ${nn(a[1])} L ${nn(b[0])} ${nn(b[1])}`;
    const at = f => [nn(a[0] + (b[0]-a[0])*f + ux*off), nn(a[1] + (b[1]-a[1])*f + uy*off)];
    const q0 = at(0.28), q1 = at(0.72);
    const rail = `M ${q0[0]} ${q0[1]} L ${q1[0]} ${q1[1]}`;
    const spin = deg ? ` transform="rotate(${nn(deg)} ${nn(pcx)} ${nn(pcy)})"` : '';
    const ax = k==='w' ? 'x' : 'y';
    HND += `<g class="ev-gk" id="${id}" data-sel="element" data-eid="${el.id}"${spin}>`
       + `<path d="${rail}" class="ev-gripr"/><path d="${rail}" class="ev-gripv"/>`
       + `<path d="${edge}" class="ev-grip ${ax}"/><path d="${rail}" class="ev-grip ${ax}"/></g>`;
    DRAGS.push({id, grab: () => el[k],
      move: (dx, dy, v0) => {
        // back into the element's own frame, or a turned box grows the wrong way
        const ar = -(deg||0)*Math.PI/180, c2 = Math.cos(ar), s2 = Math.sin(ar);
        const lx = dx*c2 - dy*s2, ly = dx*s2 + dy*c2;
        const v = k==='w' ? v0 + 2*ux*lx : v0 + uy*ly;
        el[k] = Math.max(EL_MIN, Math.min(EL_MAX, Math.round(v*2)/2));
        const n2 = document.querySelector(`input[data-el="${el.id}"][data-k="${k}"]`);
        if(n2) n2.value = S.units==='in' ? Math.round(el[k]/IN*16)/16 : Math.round(el[k]*10)/10;
      }});
  };
  /** The two grips an element gets, wherever it happens to be drawn. `sfx` keeps the ids
      apart when the same element appears on two views (the left and right gussets). */
  const elGrips = (el, cx, cy, deg, sfx) => {
    if(ELTYPES[el.type].point) return;        // a magnet or a stud has no size to pull
    const hw2 = el.w/2, hh2 = el.h/2, pad2 = Math.min(2, el.h/6);
    elGrip('ev-elw'+el.id+(sfx||''), el, 'w',
           [cx+hw2, cy-hh2+pad2], [cx+hw2, cy+hh2-pad2],  1, 0, cx, cy, deg);
    elGrip('ev-elh'+el.id+(sfx||''), el, 'h',
           [cx-hw2+pad2, cy+hh2], [cx+hw2-pad2, cy+hh2],  0, 1, cx, cy, deg);
  };
  const K7 = 0.7071;
  /* A radius knob rides the middle of its own arc, and that point only travels 41% as fast as
     the radius grows - so at 1:1 the knob crawls out from under the pointer and the number
     appears to fight you. Wind the gain up by that factor and the disc stays on the cursor. */
  const ARCK = K7 / ((1 - K7) * Math.SQRT2);

  /* ---- carry ---- */
  if(S.strap.type==='handles'){
    const Hd=S.handles, cx=ox+W/2, aw=Math.max(8,Hd.width), ay=oy+Hd.anchorY;
    // the handle is drawn at its real width, with the grip narrowing the way the blank does,
    // so what you see here is the piece the pattern gives you rather than a line
    const s2 = Hd.span/2, tp = S.strap.build==='four' ? 0 : Math.max(0, Math.min(Hd.taper||0, aw-8));
    const N = 30, A = [], B = [];
    const hwF = u => (aw - tp*Math.sin(Math.PI*u))/2;
    for(let i=0;i<=N;i++){
      const u = i/N, a = Math.PI*u;
      const px = cx - s2*Math.cos(a), py = oy - Hd.rise*Math.sin(a);
      const tx = s2*Math.sin(a), ty = -Hd.rise*Math.cos(a);
      const L = Math.hypot(tx,ty) || 1, nx = -ty/L, ny = tx/L, w2 = hwF(u);
      A.push([px + nx*w2, py + ny*w2]);          // the inside of the arch
      B.push([px - nx*w2, py - ny*w2]);          // the outside
    }
    const w0 = aw/2, tail = ay + Hd.attach;
    const pth = [`M ${nn(cx-s2-w0)} ${nn(tail)}`]
      .concat(B.map(q=>`L ${nn(q[0])} ${nn(q[1])}`))
      .concat([`L ${nn(cx+s2+w0)} ${nn(tail)} L ${nn(cx+s2-w0)} ${nn(tail)}`])
      .concat(A.slice().reverse().map(q=>`L ${nn(q[0])} ${nn(q[1])}`))
      .concat([`L ${nn(cx-s2+w0)} ${nn(tail)} Z`]).join(' ');
    /* The whole arch is the handle, so the whole arch is what you take hold of to move it up
       and down the panel. The two tails were the only grip before, and on a bag with a 26 mm
       handle that is two 26 mm squares to find. Up and down only: the rise and the span have
       knobs of their own, and one gesture may mean one thing. */
    o += `<g id="ev-handle" class="ev-handg ev-pick" data-sel="handles">`
       + `<path d="${pth}" class="ev-hand"/></g>`;
    {
      const lim = LIM['handles.anchorY'] || [0,160];
      DRAGS.push({id:'ev-handle', grab: () => S.handles.anchorY,
        move: (dx, dy, v0) => {
          S.handles.anchorY = Math.round(Math.max(lim[0], Math.min(lim[1], v0 + dy))*2)/2;
          syncInput('handles.anchorY');
        }});
    }
    o += `<path d="M ${nn(cx-s2-w0-6)} ${nn(oy-Hd.rise)} H ${nn(cx+s2+w0+6)}" class="ev-dim" stroke-dasharray="3 3"/>`;
    o += T(cx, oy-Hd.rise-fs*0.5, 'rise '+fmt(Hd.rise));
    o += T(cx, oy-fs*0.6, 'span '+fmt(Hd.span) + (tp>0 ? '  \u00b7  grip '+fmt(aw-tp)+', tails '+fmt(aw) : ''));
    const hf2 = handleFoot();
    ANCHORS = [{x:cx-s2-hf2.w/2, y:ay, w:hf2.w, h:hf2.h, far:'end'},
               {x:cx+s2-hf2.w/2, y:ay, w:hf2.w, h:hf2.h, far:'end'}];
    // the arch itself: pull the top of it for the rise, either tail for the span, and the
    // whole thing down the panel for how far below the rim the tails sit
    knob('g-hrise', cx, oy - Hd.rise, 'handles.rise', [0,-1], 'handles', -1);
    knob('g-hspanR', cx + s2, ay - fs*0.2, 'handles.span', [2,0], 'handles');
    ANCHORS.forEach((a2,i)=>{
      const id = 'ev-htail'+i;
      o += `<rect id="${id}" x="${nn(a2.x)}" y="${nn(a2.y)}" width="${nn(a2.w)}" height="${nn(a2.h)}"
             fill="transparent" class="ev-rivh" data-sel="handles"/>`;
      const lim = LIM['handles.anchorY'] || [0,160];
      DRAGS.push({id, grab: () => S.handles.anchorY,
        move: (dx, dy, v0) => {
          S.handles.anchorY = Math.round(Math.max(lim[0], Math.min(lim[1], v0 + dy))*2)/2;
          syncInput('handles.anchorY');
        }});
    });
  } else if(S.strap.type==='pack'){
    o += T(ox, oy - rext - fs*1.4, 'pack straps are on the back \u2014 see the back elevation', 'start');
  } else if(S.strap.type==='belt'){
    o += T(ox, oy - fs*1.4, 'the belt threads through the loops on the back \u2014 nothing is stitched between belt and bag', 'start', 'ev-t', fs*0.9);
  } else if(carry){
    // The strap runs three times the height of the bag, so it is cut short with a
    // break mark rather than drawn to a scale that would shrink the bag to nothing.
    const ay = oy + S.strap.anchorY, cx = ox+W/2, top = oy - topPad + 26;
    [[ox, ox + W*0.2], [ox+W, ox+W - W*0.2]].forEach(function(pair){
      const x0 = pair[0], x1 = pair[1];
      const dx = x1-x0, dy = top-ay, L = Math.hypot(dx,dy) || 1, ux = dx/L, uy = dy/L;
      o += `<path d="M ${nn(x0)} ${nn(ay)} L ${nn(x1)} ${nn(top)}" class="ev-strap"/>`;
      [0.72, 0.86].forEach(function(f){
        const mx = x0+dx*f, my = ay+dy*f, k = fs*0.75;
        o += `<path d="M ${nn(mx - uy*k - ux*k*0.45)} ${nn(my + ux*k - uy*k*0.45)} L ${nn(mx + uy*k + ux*k*0.45)} ${nn(my - ux*k + uy*k*0.45)}" class="ev-dim"/>`;
      });
    });
    o += T(cx, top - fs*0.6, fmt(S.strap.drop)+' drop to the shoulder');
    if(S.strap.type==='adjust'){
      const hn = Math.floor(S.strap.adjust/25)+1;
      o += T(cx, top + fs*0.75, 'adjusts '+fmt(S.strap.drop-(hn-1)*12.5)+'\u2013'+fmt(S.strap.drop));
    }
  }

  /* ---- the roll section: it is part of the same tube, so it is drawn on every face ---- */
  const rollBand = (x, w, label) => {
    if(!rext) return '';
    const turns = Math.max(1, Math.round(S.roll.turns));
    let g = `<path d="${rr(x, oy-rext, w, rext, 0)}" class="ev-roll"/>`;
    for(let i=1;i<turns;i++){
      const y = oy - rext + rext*i/turns;
      g += `<path d="M ${nn(x)} ${nn(y)} H ${nn(x+w)}" class="ev-ghost"/>`;
    }
    if(label){
      g += T(x+w/2, oy - rext/2 + fs*0.35, turns+' turns of '+fmt(rext/turns), 'middle', 'ev-t', fs*0.9);
      g += `<path d="M ${nn(x-12)} ${nn(oy-rext)} V ${nn(oy)} M ${nn(x-15)} ${nn(oy-rext)} h 6 M ${nn(x-15)} ${nn(oy)} h 6" class="ev-dim"/>`;
      g += `<g transform="translate(${nn(x-14)},${nn(oy-rext/2)}) rotate(-90)">${T(0,-2,fmt(rext)+' roll')}</g>`;
    }
    return g;
  };

  // where the four elevations sit, kept out here because the notes under them are laid out
  // after the drawing whichever body was drawn
  const tap = S.construction==='gusset'||S.construction==='fold' ? Math.min(S.taper, D*0.7) : 0;
  const sx = ox + W + gap;                          // left side
  const rx = sx + D + gap + W + gap;                // right side, past the back elevation
  /* ---- a wallet, opened out ----
     A bifold is one blank folded across its middle, so four elevations of it are one useful
     drawing and three slivers: the sides and both plans are 8 mm of nothing. What you want in
     front of you is the thing OPEN - both inside faces at once, which is also exactly the
     piece the pattern cuts, so there is nothing to translate at the bench. The fold across
     the middle is the spine; the front half's rim is the top edge and the back half's is the
     bottom one, which is how the blank is drafted and how it folds. */
  let WALLBOT = oy + 2*H;                 // where the open wallet actually ends on the page
  function walletBody(){
    const spine = oy + H, wy1 = oy + 2*H;
    o += ctrLines(ox + W/2, spine, W, 2*H);
    o += `<path d="${rr(ox, oy, W, 2*H, 0)}" class="ev-body ev-pick" data-sel="body"/>`;
    o += `<path d="M ${nn(ox-12)} ${nn(spine)} H ${nn(ox+W+12)}" class="ev-fold"/>`;
    o += T(ox + W/2, spine - fs*0.5, 'THE FOLD \u2014 THIS IS THE SPINE', 'middle', 'ev-t', fs*0.85);
    // clear of the grip rail that floats just above the top edge
    o += T(ox + W/2, oy - fs*2.4, 'OPEN, INSIDE UP', 'middle', 'ev-tl');
    o += T(ox + W/2, oy + fs*1.3, 'FRONT HALF \u00b7 rim along the top', 'middle', 'ev-t', fs*0.85);
    o += T(ox + W/2, wy1 - fs*0.7, 'BACK HALF \u00b7 rim along the bottom', 'middle', 'ev-t', fs*0.85);
    grip('g-wR', [ox+W, oy+2], [ox+W, wy1-2], 'x', 'W', [1,0], 'body');
    grip('g-wL', [ox, oy+2], [ox, wy1-2], 'x', 'W', [-1,0], 'body');
    grip('g-hF', [ox+4, wy1], [ox+W-4, wy1], 'y', 'H', [0,0.5], 'body', 2.4);
    grip('g-hB', [ox+4, oy], [ox+W-4, oy], 'y', 'H', [0,-0.5], 'body', 2.4);
    /* Everything that lives inside, on the half it lives on. `f.top` is measured down from
       that half's own rim, which for the back half is the bottom edge - so it is drawn from
       there upward, and dragged that way too. */
    insideFittings().forEach(f=>{
      const dir = f.face === 'front' ? 1 : -1;
      const rimY = dir > 0 ? oy : wy1;
      const fx = ox + W/2 + (f.x || 0) - f.w/2;
      const fy = dir > 0 ? rimY + f.top : rimY - f.top - f.h;
      const id = 'ev-in' + f.key;
      o += `<g id="${id}" class="ev-elg drag" data-sel="inside">`
         + `<rect x="${nn(fx)}" y="${nn(fy)}" width="${nn(f.w)}" height="${nn(f.h)}" rx="2" class="ev-el"/></g>`;
      if(f.kind === 'cards') for(let i=1;i<cardSlotN();i++){
        const hh = cardSlotH(i) + S.sa;
        o += `<path d="M ${nn(fx)} ${nn(dir>0 ? fy + f.h - hh : fy + hh)} H ${nn(fx+f.w)}" class="ev-ghost"/>`;
      }
      o += T(fx + f.w/2, fy + f.h/2 + fs*0.3, f.label, 'middle', 'ev-t',
             Math.min(fs*0.9, Math.max(f.w*0.11, fs*0.6)));
      const lx = f.px && LIM[f.px], ly = f.py && LIM[f.py];
      DRAGS.push({id,
        grab: () => ({x: f.px ? +get(f.px) : 0, y: f.py ? +get(f.py) : 0}),
        move: (dx, dy, g) => {
          if(lx){ set(f.px, Math.round(Math.max(lx[0], Math.min(lx[1], g.x + dx))*2)/2); syncInput(f.px); }
          if(ly){ set(f.py, Math.round(Math.max(ly[0], Math.min(ly[1], g.y + dir*dy))*2)/2); syncInput(f.py); }
        }});
      // the edge that moves when the number grows: down the page on the front half, up it on the back
      grip('g-' + f.key + 'w', [fx+f.w, fy+3], [fx+f.w, fy+f.h-3], 'x', f.pw, [2,0], 'inside');
      const hy = dir > 0 ? fy + f.h : fy;
      grip('g-' + f.key + 'h', [fx+3, hy], [fx+f.w-3, hy], 'y', f.ph, [0, dir], 'inside');
    });
    ['front','back','inside'].forEach(face=>{
      const dir = face === 'front' ? 1 : -1;
      const rimY = dir > 0 ? oy : wy1;
      /* A face whose rim is along the BOTTOM is drafted upside down - `faceRotation` turns
         everything on it through 180 - so the drawing has to turn it too, or a card stack
         reads mouth-up here and comes out mouth-down on the pattern. */
      const face180 = dir < 0 ? 180 : 0;
      S.elements.filter(e=>e.face === face).forEach(e=>{
        const deg2 = ((e.rot || 0) + face180) % 360;
        const bb = rotBox(e.w, elFootH(e), deg2);
        const cx = ox + W/2 + e.x;
        const cy = dir > 0 ? rimY + e.y + bb.h/2 : rimY - e.y - bb.h/2;
        const id = 'ev-el'+e.id;
        const spin = deg2 ? ` transform="rotate(${nn(deg2)} ${nn(cx)} ${nn(cy)})"` : '';
        o += `<g id="${id}" class="ev-elg drag" data-sel="element" data-eid="${e.id}"><rect
               x="${nn(cx-e.w/2)}" y="${nn(cy-elFootH(e)/2)}" width="${nn(e.w)}" height="${nn(elFootH(e))}"
               rx="${nn(e.r)}" class="ev-el${face==='inside'?' back':''}"${spin}/>${elCascade(e, cx, cy, spin)}</g>`;
        // the caption goes on the side of the box away from the fold, so two stacks facing
        // each other across the spine do not both write into it
        o += T(cx, dir > 0 ? cy - bb.h/2 - fs*0.5 : cy + bb.h/2 + fs*1.1, T_(e),
               'middle', 'ev-t', Math.min(fs*0.95, Math.max(bb.w*0.16, fs*0.7)));
        DRAGS.push({id, ax:'xy', el:e.id, flipY:dir < 0, cx:ox + W/2, cy0:oy, down:2*H});
        elGrips(e, cx, cy, deg2, '');
      });
    });
    if(S.pocket.on){
      const px = ox + W/2 + S.pocket.x - S.pocket.w/2, py = spine - S.pocket.y - S.pocket.h;
      o += `<rect id="ev-pocket" x="${nn(px)}" y="${nn(py)}" width="${nn(S.pocket.w)}" height="${nn(S.pocket.h)}" rx="${nn(S.pocket.radius)}" class="ev-pkt" data-sel="pocket"/>`;
      o += T(px+S.pocket.w/2, py+S.pocket.h/2+fs*0.35, 'drag me', 'middle', 'ev-t', fs*0.9);
      DRAGS.push({id:'ev-pocket', ax:'xy'});
      grip('g-pkw', [px+S.pocket.w, py+3], [px+S.pocket.w, py+S.pocket.h-3], 'x', 'pocket.w', [2,0], 'pocket');
      grip('g-pkh', [px+3, py], [px+S.pocket.w-3, py], 'y', 'pocket.h', [0,-1], 'pocket');
    }
    /* A flap on a wallet is more of the same blank, carrying on past the back rim - so it is
       drawn there rather than left off, which is what a view that stopped at the fold did. */
    let bot = wy1;
    if(S.top==='flap' && S.flap.drop > 0){
      const fd2 = S.flap.drop, r2 = Math.min(S.flap.radius, W/2, fd2);
      o += `<path d="${rr(ox, wy1, W, fd2, S.flap.style==='round' ? {br:r2, bl:r2} : 0)}" class="ev-flap ev-pick" data-sel="flap"/>`;
      o += T(ox + W/2, wy1 + Math.min(fd2*0.5, 22), 'FLAP \u00b7 ' + fmt(fd2) + ' drop', 'middle', 'ev-t', fs*0.9);
      grip('g-fdrop', [ox+r2+2, wy1+fd2], [ox+W-r2-2, wy1+fd2], 'y', 'flap.drop', [0,1], 'flap');
      bot = wy1 + fd2;
    }
    // below the grip rail that floats under the bottom edge, not through it
    o += `<path d="M ${nn(ox)} ${nn(bot+18)} H ${nn(ox+W)} M ${nn(ox)} ${nn(bot+15)} v 6 M ${nn(ox+W)} ${nn(bot+15)} v 6" class="ev-dim"/>`;
    o += T(ox+W/2, bot+16, fmt(W) + ' across');
    WALLBOT = bot;
    o += `<path d="M ${nn(ox-12)} ${nn(oy)} V ${nn(wy1)} M ${nn(ox-15)} ${nn(oy)} h 6 M ${nn(ox-15)} ${nn(wy1)} h 6" class="ev-dim"/>`;
    o += `<g transform="translate(${nn(ox-14)},${nn(oy+H)}) rotate(-90)">${T(0,-2,fmt(2*H)+' open, '+fmt(H)+' closed')}</g>`;
    SIDENOTE.push('folded it is ' + fmt(W) + ' \u00d7 ' + fmt(H) + ', and a card is ' + fmt(CARD_W) + ' \u00d7 ' + fmt(CARD_H));
  }
  function bagBody(){
  /* ---- front elevation ---- */
  o += `<g>`;
  o += rollBand(ox, W, true);
  o += ctrLines(ox + W/2, oy + H/2, W, H);
  o += `<path d="${bodyD(ox)}" class="ev-body ev-pick" data-sel="body"/>`;
  if(FP){
    // the mouth: the one thing about a shape she drew that the drawing has to say out loud
    o += `<path d="${segsPath(polyArcSegs(FP.pts.map(q=>[ox+q[0], oy+q[1]]), FP.mouth.a, FP.mouth.b))}" class="ev-open"/>`;
    mouthAt(ox).forEach(q=> o += `<circle cx="${nn(q[0])}" cy="${nn(q[1])}" r="${nn(hr*0.9)}" class="ev-hw"/>`);
    o += T((mouthAt(ox)[0][0] + mouthAt(ox)[1][0])/2, oy - fs*0.7,
           'mouth ' + fmt(FP.mouthLen) + ' round, ' + fmt(FP.chord) + ' across', 'middle', 'ev-t', fs*0.85);
  }
  // the body is what these edges belong to; the lining follows it and is never dragged
  grip('g-wR', [ox+W, oy+rT2+2], [ox+W, oy+H-r-2], 'x', 'W', [1,0], 'body');
  grip('g-wL', [ox, oy+rT2+2], [ox, oy+H-r-2], 'x', 'W', [-1,0], 'body');
  grip('g-hF', [ox+r+2, oy+H], [ox+W-r-2, oy+H], 'y', 'H', [0,1], 'body', 2.4);
  // only where `corner` is actually what rounds that corner: a boxed body's 12 mm is its own,
  // and a knob that moves nothing is worse than no knob at all
  if(S.construction==='gusset' && S.gussetStyle!=='base')
    knob('g-corner', ox + r*(1-K7), oy + H - r*(1-K7), 'corner', [ARCK,-ARCK], 'body');
  if(LIM.topR && S.construction==='gusset' && S.top!=='flap' && S.top!=='roll')
    knob('g-topR', ox + rT2*(1-K7), oy + rT2*(1-K7), 'topR', [ARCK,ARCK], 'body');
  if(rext && S.roll.closure!=='none'){
    const ay = oy + rollAnchorY(), tw2 = ROLL_TAB_W;
    [ox+5, ox+W-5-tw2].forEach((tx,i)=>{
      o += `<rect x="${nn(tx)}" y="${nn(oy-rext)}" width="${nn(tw2)}" height="${nn(ROLL_TAB_IN)}" rx="1.5" class="ev-anch"/>`;
      if(S.construction!=='gusset'){
        o += `<rect x="${nn(i?ox+W-6-rollAnchorW():ox+6)}" y="${nn(ay)}" width="${nn(rollAnchorW())}" height="${nn(ROLL_ANCHOR_L)}" rx="1.5" class="ev-anch"/>`;
        o += `<circle cx="${nn(i?ox+W-6-rollAnchorW()/2:ox+6+rollAnchorW()/2)}" cy="${nn(ay+ROLL_ANCHOR_L/2)}" r="${nn(hr*1.2)}" class="ev-hw"/>`;
      }
      if(i===0) o += T(tx+tw2+5, oy-rext+ROLL_TAB_IN*0.75, 'tab into the mouth hem', 'start', 'ev-t', fs*0.8);
    });
  }
  ANCHORS.forEach((a,i)=>{
    o += `<path d="${poly(footTip(a.x, a.y, a.w, a.h, 'y', a.far||'end', S.strap.tip))}" class="ev-anch"/>`;
    // a handle tail is fixed the way the HANDLE says, not the way the strap does
    const aFix = S.strap.type==='handles' ? S.handles.fix : S.strap.tabFix;
    if(aFix!=='stitch'){
      const spec = S.strap.type==='handles' ? rivetSpecAt(S.handles) : strapRivetSpec();
      rivetPts(a.x, a.y, a.w, a.h, 'y', a.far||'end', spec, S.strap.tip).forEach(q=>{
        o += `<circle cx="${nn(q[0])}" cy="${nn(q[1])}" r="${nn(hr*0.9)}" class="ev-hw"/>`;
      });
    }
    if(i===0) o += T(a.x+a.w/2, a.y+a.h+fs*1.1, (S.strap.type==='handles'?'handle tail ':(S.strap.attach==='swivel'?'tab ':'strap end '))+fmt(a.h), 'middle', 'ev-t', fs*0.85);
  });
  if(S.pocket.on){
    const px = ox + W/2 + S.pocket.x - S.pocket.w/2, py = oy + H - S.pocket.y - S.pocket.h;
    o += `<rect id="ev-pocket" x="${nn(px)}" y="${nn(py)}" width="${nn(S.pocket.w)}" height="${nn(S.pocket.h)}" rx="${nn(S.pocket.radius)}" class="ev-pkt" data-sel="pocket"/>`;
    o += T(px+S.pocket.w/2, py+S.pocket.h/2+fs*0.35, 'drag me', 'middle', 'ev-t', fs*0.9);
    DRAGS.push({id:'ev-pocket', ax:'xy'});
    // the pocket keeps its offset from the centre, so pulling one side grows both
    grip('g-pkw', [px+S.pocket.w, py+3], [px+S.pocket.w, py+S.pocket.h-3], 'x', 'pocket.w', [2,0], 'pocket');
    grip('g-pkh', [px+3, py], [px+S.pocket.w-3, py], 'y', 'pocket.h', [0,-1], 'pocket');
    knob('g-pkr', px + S.pocket.radius*(1-K7), py + S.pocket.radius*(1-K7), 'pocket.radius', [ARCK,ARCK], 'pocket');
  }
  S.elements.filter(e=>e.face==='front').forEach(e=>{
    const bb = rotBox(e.w, elFootH(e), e.rot||0);
    const cxs = [ox + W/2 + e.x];
    if(e.mirror) cxs.push(ox + W/2 - e.x);
    cxs.forEach((cx,i)=>{
      const cy = oy + e.y + bb.h/2, id = i===0 ? 'ev-el'+e.id : '';
      const spin = e.rot ? ` transform="rotate(${nn(e.rot)} ${nn(cx)} ${nn(cy)})"` : '';
      let g = `<rect x="${nn(cx-e.w/2)}" y="${nn(cy-elFootH(e)/2)}" width="${nn(e.w)}" height="${nn(elFootH(e))}" rx="${nn(e.r)}"
               class="ev-el${e.face==='front'?'':' back'}"${spin}/>${elCascade(e, cx, cy, spin)}`;
      if(ELTYPES[e.type].opens){
        const s = e.open || 'top', L = Math.min(11, Math.max(6, Math.min(e.w,e.h)/3));
        const m  = s==='top'?[cx,cy-e.h/2]:s==='bottom'?[cx,cy+e.h/2]:s==='left'?[cx-e.w/2,cy]:[cx+e.w/2,cy];
        const n2 = s==='top'?[0,-1]:s==='bottom'?[0,1]:s==='left'?[-1,0]:[1,0];
        g += `<path d="M ${nn(m[0]-n2[0]*L*0.3)} ${nn(m[1]-n2[1]*L*0.3)} L ${nn(m[0]+n2[0]*L)} ${nn(m[1]+n2[1]*L)}
              M ${nn(m[0]+n2[0]*L*0.45-n2[1]*L*0.3)} ${nn(m[1]+n2[1]*L*0.45+n2[0]*L*0.3)}
              L ${nn(m[0]+n2[0]*L)} ${nn(m[1]+n2[1]*L)}
              L ${nn(m[0]+n2[0]*L*0.45+n2[1]*L*0.3)} ${nn(m[1]+n2[1]*L*0.45-n2[0]*L*0.3)}"
              class="ev-open"${spin}/>`;
      }
      o += id ? `<g id="${id}" class="ev-elg drag" data-sel="element" data-eid="${e.id}">${g}</g>` : g;
      if(i===0){
        o += T(cx, cy + bb.h/2 + fs*1.1, T_(e) + (e.rot ? '  ' + Math.round(e.rot) + '\u00b0' : ''), 'middle', 'ev-t', Math.min(fs*0.95, Math.max(bb.w*0.16, fs*0.7)));
        DRAGS.push({id, ax:'xy', el:e.id, cx:ox + W/2, cy0:oy});
        elGrips(e, cx, cy, e.rot || 0, '');
      }
    });
  });
  if(S.top==='flap'){
    /* The flap hangs off the MOUTH, which on a shape she drew is a chord between her two
       marks rather than the whole top edge of the bag. */
    const mQ = mouthAt(ox);
    const fx = FP ? Math.min(mQ[0][0], mQ[1][0]) : ox;
    const fW = FP ? FP.chord : W;
    const fy = FP ? (mQ[0][1] + mQ[1][1])/2 : oy;
    const drop = S.flap.drop, rad = Math.min(S.flap.radius, fW/2, drop);
    let fd;
    if(S.flap.style==='point'){
      const pd = Math.min(fW/2, drop*0.9);
      fd = poly([[fx,fy],[fx+fW,fy],[fx+fW,fy+drop-pd],[fx+fW/2,fy+drop],[fx,fy+drop-pd]]);
    } else if(S.flap.style==='round') fd = rr(fx,fy,fW,drop,{br:rad,bl:rad});
    else if(S.flap.style==='tongue'){
      const tw=Math.max(fW*0.42,40), sh=Math.min(drop*0.55,drop-4);
      fd = poly([[fx,fy],[fx+fW,fy],[fx+fW,fy+drop-sh],[fx+(fW+tw)/2,fy+drop-sh],[fx+(fW+tw)/2,fy+drop],[fx+(fW-tw)/2,fy+drop],[fx+(fW-tw)/2,fy+drop-sh],[fx,fy+drop-sh]]);
    } else fd = rr(fx,fy,fW,drop,0);
    o += `<path d="${fd}" class="ev-flap ev-pick" data-sel="flap"/>`;
    grip('g-fdrop', [fx+rad+2, fy+drop], [fx+fW-rad-2, fy+drop], 'y', 'flap.drop', [0,1], 'flap');
    if(S.flap.style==='round' || S.flap.style==='tongue')
      knob('g-frad', fx + rad*(1-K7), fy + drop - rad*(1-K7), 'flap.radius', [ARCK,-ARCK], 'flap');
    if(S.flap.closure!=='none'){
      const pd = pullDrop(), cy = fy + drop + pd - S.flap.cInset;
      const xs = closureXs(fx + fW/2, fW);
      // the tab hangs past the tip of the flap and carries the lock down with it
      if(pd) xs.forEach(cq=>{
        o += `<path d="${poly(footTip(cq - pullW()/2, fy + drop - pullAttach(), pullW(),
                                      pullAttach() + pd, 'y', 'end', S.flap.pull.tip))}" class="ev-anch"/>`;
      });
      xs.forEach(cq=> o += `<circle cx="${nn(cq)}" cy="${nn(cy)}" r="${nn(hr*1.6)}" class="ev-hw"/>`);
      o += `<circle id="ev-closure" cx="${nn(xs[0])}" cy="${nn(cy)}" r="${nn(hr*3.4)}" fill="transparent" class="ev-hdl" data-sel="flap" style="fill:transparent"/>`;
      o += T(fx+fW/2, cy+hr*2.2+fs*0.9,
             (xs.length>1 ? xs.length+' '+CLOSURE_LABEL().toLowerCase()+'s '+fmt(S.flap.cSpan)+' apart'
                          : CLOSURE_LABEL().toLowerCase())
             + ' \u00b7 ' + fmt(S.flap.cInset) + (pd ? ' up the pull tab' : ' from the tip'),
             'middle', 'ev-t', fs*0.85);
      DRAGS.push({id:'ev-closure', ax:'y'});
      if(xs.length > 1)
        grip('g-cspan', [xs[1], cy - hr*3], [xs[1], cy + hr*3], 'x', 'flap.cSpan', [2,0], 'flap');
    }
    o += `<path d="M ${nn(fx)} ${nn(fy+drop)} H ${nn(fx+fW)}" class="ev-ghost"/>`;
  }
  if(S.top==='zip'){
    const G = zipG(), ins = zipInset(), wz = zipWrap();
    const zQ = mouthAt(ox);
    o += `<g class="ev-pick" data-sel="zip">`
       + (FP ? zipRun(Math.min(zQ[0][0],zQ[1][0]), Math.max(zQ[0][0],zQ[1][0]), (zQ[0][1]+zQ[1][1])/2, 'h', G, ins)
             : zipRun(ox+rT2, ox+W-rT2, oy, 'h', G, ins)) + `</g>`;
    // a top-handle caption already sits just above the rim, so the zip note moves up past it
    o += T(ox+W/2, oy-fs*(S.strap.type==='handles' ? 2.8 : 1.4),
           G.label + ' zip, ' + fmt(zipCut()) + ' between the stops');
    if(wz>0) o += T(ox+W/2, oy+ins+fs*2.1, 'carries ' + fmt(wz) + ' down each end', 'middle', 'ev-t', fs*0.85);
  }
  if(S.top==='magnet') o += `<circle cx="${nn(ox+W/2)}" cy="${nn(oy+18)}" r="${nn(hr*1.5)}" class="ev-hw"/>`;
  o += T(ox+W/2, oy+H+fs*2.6, 'FRONT', 'middle', 'ev-tl');
  o += `<path d="M ${nn(ox)} ${nn(oy+H+10)} H ${nn(ox+W)} M ${nn(ox)} ${nn(oy+H+7)} v 6 M ${nn(ox+W)} ${nn(oy+H+7)} v 6" class="ev-dim"/>`;
  o += T(ox+W/2, oy+H+8, fmt(W));
  o += `<path d="M ${nn(ox-12)} ${nn(oy)} V ${nn(oy+H)} M ${nn(ox-15)} ${nn(oy)} h 6 M ${nn(ox-15)} ${nn(oy+H)} h 6" class="ev-dim"/>`;
  o += `<g transform="translate(${nn(ox-14)},${nn(oy+H/2)}) rotate(-90)">${T(0,-2,fmt(H))}</g>`;
  o += `</g>`;

  /* ---- the two side elevations ----
     A bag has two sides and they are not the same drawing: a D-ring tab on the left and a pen
     loop on the right both live on one gusset strip, at opposite ends of it. So both are
     drawn, both can be edited, and an element says which one it is on. Looking at the LEFT
     side the front of the bag is on the left; walk round to the right side and the front is
     on the right, which is what the mirror is for. */
  function sideView(px, isLeft){
    const sfx = isLeft ? 'L' : 'R';
    // u runs from the FRONT of the bag: on the right-hand view that is the other way round
    const X = u => isLeft ? px + u : px + D - u;
    const sideD = poly([[X(tap/2),oy],[X(D-tap/2),oy],[X(D),oy+H-r],
                        [X(D-r*0.45),oy+H],[X(r*0.45),oy+H],[X(0),oy+H-r]]);
    o += rollBand(px + tap/2, D - tap, false);
    o += ctrLines(px + D/2, oy + H/2, D, H);
    o += `<path d="${sideD}" class="ev-body ev-pick" data-sel="body"/>`;
    grip('g-dR'+sfx, [X(D-tap/2), oy+3], [X(D), oy+H-r-2], 'x', 'D', [isLeft?1:-1,0], 'body');
    grip('g-dL'+sfx, [X(tap/2), oy+3], [X(0), oy+H-r-2], 'x', 'D', [isLeft?-1:1,0], 'body');
    grip('g-hS'+sfx, [X(r*0.45+2), oy+H], [X(D-r*0.45-2), oy+H], 'y', 'H', [0,1], 'body', 2.4);
    if(LIM.taper && (S.construction==='gusset' || S.construction==='fold'))
      knob('g-taper'+sfx, X(tap/2), oy, 'taper', [isLeft?-2:2,0], 'body', -1);
    if(rext){
      o += T(X(D/2), oy - rext - fs*0.6, 'no taper through the roll', 'middle', 'ev-t', fs*0.8);
      if(S.roll.closure!=='none'){
        const ay = oy + rollAnchorY();
        o += `<rect x="${nn(X(D/2)-rollAnchorW()/2)}" y="${nn(ay)}" width="${nn(rollAnchorW())}" height="${nn(ROLL_ANCHOR_L)}" rx="1.5" class="ev-anch"/>`;
        o += `<circle cx="${nn(X(D/2))}" cy="${nn(ay+ROLL_ANCHOR_L/2)}" r="${nn(hr*1.3)}" class="ev-hw"/>`;
        if(isLeft) o += T(X(D/2), ay+ROLL_ANCHOR_L+fs*1.1, 'roll anchor \u00b7 '+fmt(rollAnchorY())+' down', 'middle', 'ev-t', fs*0.8);
      }
    }
    if(S.top==='flap'){
      o += `<path d="M ${nn(X(D-tap/2))} ${nn(oy)} L ${nn(X(tap/2)+(isLeft?-2:2))} ${nn(oy-2)} L ${nn(X(tap/2)+(isLeft?-2:2))} ${nn(oy+S.flap.drop)}" class="ev-flap" fill="none"/>`;
      if(isLeft) o += T(X(D/2), oy-fs*0.8, 'over the top '+fmt(D + 2*t));
    }
    if(carry && S.strap.type!=='handles' && S.strap.type!=='pack'){
      const ay = oy + S.strap.anchorY, aw = Math.min(S.strap.width, D-4), al = Math.max(18, S.strap.tabLen);
      const room = Math.max(0, D/2 - aw/2 - 2);
      const acr = Math.max(-room, Math.min(room, S.strap.anchorX || 0));
      const ax0 = X(D/2 + (isLeft?acr:-acr)) - aw/2, arot = (isLeft?1:-1)*(S.strap.tabRot || 0);
      const spin = arot ? ` transform="rotate(${nn(arot)} ${nn(ax0+aw/2)} ${nn(ay+al/2)})"` : '';
      o += `<g id="ev-tab${sfx}" class="ev-tabg ev-pick" data-sel="strap"${spin}>`;
      o += `<path d="${poly(footTip(ax0, ay, aw, al, 'y', 'end', S.strap.tip))}" class="ev-anch"/>`;
      if(S.strap.tabFix!=='stitch'){
        /* Each rivet is its own handle, and dragging one moves the whole arrangement: up and
           down the tab sets how far in from the end the first row sits, out towards the edge
           sets how far the rows spread. The pattern stays a pattern - you are pulling on its
           numbers, not scattering holes by hand. */
        const ca = ax0 + aw/2;
        const ar = -arot*Math.PI/180, cr = Math.cos(ar), sr = Math.sin(ar);
        rivetPts(ax0, ay, aw, al, 'y', 'end', strapRivetSpec(), S.strap.tip).forEach((q,ri)=>{
          const id = 'ev-riv'+sfx+ri;
          o += `<g id="${id}" class="ev-rivg" data-sel="strap">`
             + `<circle cx="${nn(q[0])}" cy="${nn(q[1])}" r="${nn(hr*0.9)}" class="ev-hw"/>`
             + `<circle cx="${nn(q[0])}" cy="${nn(q[1])}" r="${nn(hr*2.4)}" class="ev-rivh"/></g>`;
          const sgn = q[0] < ca - 0.01 ? -1 : q[0] > ca + 0.01 ? 1 : 0;
          DRAGS.push({id,
            grab: () => ({i:S.strap.rivetInset, e:S.strap.rivetEdge}),
            move: (dx, dy, g) => {
              const lx = dx*cr - dy*sr, ly = dx*sr + dy*cr;   // back into the tab's own frame
              const li = LIM['strap.rivetInset'] || [3,60], le = LIM['strap.rivetEdge'] || [2.5,30];
              S.strap.rivetInset = Math.round(Math.max(li[0], Math.min(li[1], g.i - ly))*2)/2;
              if(sgn) S.strap.rivetEdge = Math.round(Math.max(le[0], Math.min(le[1], g.e - sgn*lx))*2)/2;
              syncInput('strap.rivetInset'); syncInput('strap.rivetEdge');
            }});
        });
      }
      o += `</g>`;
      const tLimY = LIM['strap.anchorY'] || [0,160], tLimX = LIM['strap.anchorX'] || [-120,120];
      const mir = isLeft ? 1 : -1;
      DRAGS.push({id:'ev-tab'+sfx,
        grab: () => ({y:S.strap.anchorY, x:S.strap.anchorX || 0}),
        move: (dx, dy, g) => {
          S.strap.anchorY = Math.round(Math.max(tLimY[0], Math.min(tLimY[1], g.y + dy))*2)/2;
          S.strap.anchorX = Math.round(Math.max(tLimX[0], Math.min(tLimX[1], g.x + mir*dx))*2)/2;
          syncInput('strap.anchorY'); syncInput('strap.anchorX');
        }});
      const rkR = Math.max(al*0.5 + hr*4, 14), rk = [ax0 + aw/2, ay + al/2 - rkR];
      const rkP = arot ? rotPt(rk[0], rk[1], ax0+aw/2, ay+al/2, arot*Math.PI/180) : rk;
      o += `<path d="M ${nn(ax0+aw/2)} ${nn(ay+al/2)} L ${nn(rkP[0])} ${nn(rkP[1])}" class="ev-ghost"/>`;
      o += `<circle id="ev-tabrot${sfx}" cx="${nn(rkP[0])}" cy="${nn(rkP[1])}" r="${nn(hr*1.9)}" class="ev-rot" data-sel="strap"/>`;
      DRAGS.push({id:'ev-tabrot'+sfx, grab: () => S.strap.tabRot || 0,
        move: (dx, dy, v0) => {
          S.strap.tabRot = Math.max(-45, Math.min(45, Math.round(v0 + mir*Math.atan2(dx, rkR)*180/Math.PI)));
          syncInput('strap.tabRot');
        }});
      if(isLeft){
        SIDENOTE.push((S.strap.attach==='swivel'?'tab ':'strap end ')+fmt(al)+', '+fmt(S.strap.anchorY)+' down'
                      + (acr ? ', '+fmt(Math.abs(acr))+' off the centre of the gusset' : '')
                      + (S.strap.tabRot ? ', '+Math.round(S.strap.tabRot)+'\u00b0' : ''));
        SIDENOTE.push(S.strap.tabFix==='stitch'?'stitched':(S.strap.tabFix==='rivet'?strapRivets()+' rivets':strapRivets()+' rivets + stitched'));
      }
    }
    S.elements.filter(e=>{
      const sd = e.side || (e.mirror ? 'both' : 'left');
      return e.face==='gusset' && (e.mirror || sd==='both' || sd===(isLeft?'left':'right'));
    }).forEach(e=>{
      const bb = rotBox(e.w, elFootH(e), e.rot||0);
      const cx = X(D/2 + (isLeft?e.x:-e.x)), cy = oy + e.y + bb.h/2, id = 'ev-el'+e.id+sfx;
      const deg = isLeft ? (e.rot||0) : -(e.rot||0);
      const spin = deg ? ` transform="rotate(${nn(deg)} ${nn(cx)} ${nn(cy)})"` : '';
      o += `<g id="${id}" class="ev-elg drag" data-sel="element" data-eid="${e.id}"><rect x="${nn(cx-e.w/2)}" y="${nn(cy-elFootH(e)/2)}" width="${nn(e.w)}" height="${nn(elFootH(e))}" rx="${nn(e.r)}" class="ev-el"${spin}/>${elCascade(e, cx, cy, spin)}</g>`;
      o += T(X(D + 6), cy, T_(e) + (e.rot ? ' ' + Math.round(e.rot) + '\u00b0' : ''), isLeft?'start':'end', 'ev-t', fs*0.85);
      DRAGS.push({id, ax:'xy', el:e.id, across:D, cx:X(D/2), cy0:oy, flipX:!isLeft});
      elGrips(e, cx, cy, deg, sfx);
    });
    if(S.pocket.on) o += `<path d="M ${nn(X(tap/2))} ${nn(oy+H-S.pocket.y-S.pocket.h)} H ${nn(X(D-tap/2))}" class="ev-ghost"/>`;
  }
  sideView(sx, true);

  /* ---- back elevation ---- */
  const bx = sx + D + gap;
  o += rollBand(bx, W, false);
  o += ctrLines(bx + W/2, oy + H/2, W, H);
  o += `<path d="${bodyD(bx)}" class="ev-body ev-pick" data-sel="body"/>`;
  grip('g-wR2', [bx+W, oy+rT2+2], [bx+W, oy+H-r-2], 'x', 'W', [1,0], 'body');
  grip('g-wL2', [bx, oy+rT2+2], [bx, oy+H-r-2], 'x', 'W', [-1,0], 'body');
  grip('g-hB', [bx+r+2, oy+H], [bx+W-r-2, oy+H], 'y', 'H', [0,1], 'body', 2.4);
  S.elements.filter(e=>e.face==='back' || e.face==='inside').forEach(e=>{
    const bb = rotBox(e.w, elFootH(e), e.rot||0);
    const cxs = [bx + W/2 - e.x];                 // seen from behind, offsets mirror
    if(e.mirror) cxs.push(bx + W/2 + e.x);
    cxs.forEach((cx,i)=>{
      const cy = oy + e.y + bb.h/2, id = i===0 ? 'ev-el'+e.id : '';
      const spin = e.rot ? ` transform="rotate(${nn(-e.rot)} ${nn(cx)} ${nn(cy)})"` : '';
      const g = `<rect x="${nn(cx-e.w/2)}" y="${nn(cy-elFootH(e)/2)}" width="${nn(e.w)}" height="${nn(elFootH(e))}" rx="${nn(e.r)}" class="ev-el${e.face==='inside'?' back':''}"${spin}/>${elCascade(e, cx, cy, spin)}`;
      o += id ? `<g id="${id}" class="ev-elg drag" data-sel="element" data-eid="${e.id}">${g}</g>` : g;
      if(i===0){
        o += T(cx, cy + bb.h/2 + fs*1.1, T_(e) + (e.face==='inside'?' (inside)':''), 'middle', 'ev-t', Math.min(fs*0.95, Math.max(bb.w*0.16, fs*0.7)));
        // drawn from behind, so dragging right has to move it left on the bag
        DRAGS.push({id, ax:'xy', el:e.id, flipX:true, cx:bx + W/2, cy0:oy});
        elGrips(e, cx, cy, -(e.rot || 0), 'B');
      }
    });
  });
  if(S.top==='flap'){
    const fa = oy + S.flap.attach;
    o += `<path d="M ${nn(bx)} ${nn(fa)} H ${nn(bx+W)}" class="ev-ghost"/>`;
    // out of the middle: that is where anything on the back panel puts its own caption
    o += T(bx+W-4, fa-fs*0.4, 'flap stitches here', 'end', 'ev-t', fs*0.85);
    grip('g-fattach', [bx+8, fa], [bx+W-8, fa], 'y', 'flap.attach', [0,1], 'flap');
  }
  if(S.strap.type==='pack'){
    const ay = oy + S.strap.anchorY, s2 = Math.min(W*0.30, 78), aw = S.strap.width;
    [-1,1].forEach(sg=>{
      const id = 'ev-pack'+(sg>0?'R':'L');
      o += `<g id="${id}" class="ev-tabg ev-pick" data-sel="strap">`
         + `<path d="${poly(footTip(bx+W/2+sg*s2-aw/2, ay, aw, S.strap.tabLen, 'y', 'end', S.strap.tip))}" class="ev-anch"/>`;
      if(S.strap.tabFix!=='stitch')
        rivetPts(bx+W/2+sg*s2-aw/2, ay, aw, S.strap.tabLen, 'y', 'end', strapRivetSpec(), S.strap.tip)
          .forEach(q=> o += `<circle cx="${nn(q[0])}" cy="${nn(q[1])}" r="${nn(hr*0.9)}" class="ev-hw"/>`);
      o += `</g>`;
      o += `<path d="${poly(footTip(bx+W/2+sg*(s2*0.55)-aw/2, oy+H-S.strap.tabLen-6, aw, S.strap.tabLen, 'y', 'start', S.strap.tip))}" class="ev-anch"/>`;
      // down the back sets how far below the rim they start, across sets how far apart
      const ly = LIM['strap.anchorY'] || [0,160], lp = LIM['strap.packSpan'] || [60,260];
      DRAGS.push({id, grab: () => ({y:S.strap.anchorY, p:S.strap.packSpan}),
        move: (dx, dy, g) => {
          S.strap.anchorY = Math.round(Math.max(ly[0], Math.min(ly[1], g.y + dy))*2)/2;
          S.strap.packSpan = Math.round(Math.max(lp[0], Math.min(lp[1], g.p + 2*sg*dx))*2)/2;
          syncInput('strap.anchorY'); syncInput('strap.packSpan');
        }});
    });
    o += T(bx+W/2, ay + S.strap.tabLen + fs*1.2, 'shoulder straps ' + fmt(s2*2) + ' apart');
  } else if(S.strap.type==='handles'){
    const Hd = S.handles, hf = handleFoot(), ay = oy + Hd.anchorY;
    [bx + W/2 - Hd.span/2 - hf.w/2, bx + W/2 + Hd.span/2 - hf.w/2].forEach(hx=>{
      o += `<path d="${poly(footTip(hx, ay, hf.w, hf.h, 'y', 'end', S.strap.tip))}" class="ev-anch"/>`;
    });
  } else if(S.strap.type==='belt'){
    const el0 = S.elements.find(e=>e.type==='beltloop');
    const by = oy + (el0 ? el0.y + (el0.h||24)/2 : H*0.25), bw = S.strap.width;
    o += `<rect x="${nn(bx-30)}" y="${nn(by-bw/2)}" width="${nn(W+60)}" height="${nn(bw)}" class="ev-belt"/>`;
    o += T(bx+W/2, by+bw/2+fs*1.2, 'belt ' + fmt(bw) + ' wide, through both loops', 'middle', 'ev-t', fs*0.85);
  }
  o += T(bx+W/2, oy+H+fs*2.6, 'BACK', 'middle', 'ev-tl');
  o += `<path d="M ${nn(bx)} ${nn(oy+H+10)} H ${nn(bx+W)} M ${nn(bx)} ${nn(oy+H+7)} v 6 M ${nn(bx+W)} ${nn(oy+H+7)} v 6" class="ev-dim"/>`;
  o += T(bx+W/2, oy+H+8, fmt(W));
  sideView(rx, false);
  o += T(sx+D/2, oy+H+fs*2.6, 'LEFT SIDE', 'middle', 'ev-tl');
  o += T(sx+D/2, oy+H+fs*3.9, 'front at the left', 'middle', 'ev-t', fs*0.85);
  o += `<path d="M ${nn(sx)} ${nn(oy+H+10)} H ${nn(sx+D)} M ${nn(sx)} ${nn(oy+H+7)} v 6 M ${nn(sx+D)} ${nn(oy+H+7)} v 6" class="ev-dim"/>`;
  o += T(sx+D/2, oy+H+8, fmt(S.D));
  o += T(rx+D/2, oy+H+fs*2.6, 'RIGHT SIDE', 'middle', 'ev-tl');
  o += T(rx+D/2, oy+H+fs*3.9, 'front at the right', 'middle', 'ev-t', fs*0.85);
  o += `<path d="M ${nn(rx)} ${nn(oy+H+10)} H ${nn(rx+D)} M ${nn(rx)} ${nn(oy+H+7)} v 6 M ${nn(rx+D)} ${nn(oy+H+7)} v 6" class="ev-dim"/>`;
  o += T(rx+D/2, oy+H+8, fmt(S.D));
  if(S.construction==='bucket'){
    const ba = W/2, bb = Math.max(8, D/2), bcx = sx + D/2;
    const by2 = oy + H + fs*11 + planD + bb;   // clear of the plan and the side view's captions
    o += `<path d="${poly(basePts(ba, bb).map(q=>[bcx+q[0], by2+q[1]]))}" class="ev-body"/>`;
    o += `<path d="M ${nn(bcx-ba)} ${nn(by2)} H ${nn(bcx+ba)} M ${nn(bcx)} ${nn(by2-bb)} V ${nn(by2+bb)}" class="ev-ghost"/>`;
    [-1,1].forEach(sg=>o += `<circle cx="${nn(bcx+sg*ba)}" cy="${nn(by2)}" r="${nn(hr*1.1)}" class="ev-hw"/>`);
    o += T(bcx, by2 - bb - fs*0.7, 'BASE, LOOKING DOWN', 'middle', 'ev-tl', fs*0.9);
    o += T(bcx, by2 + bb + fs*1.4, fmt(W) + ' \u00d7 ' + fmt(D) + ' \u00b7 ' + fmt(basePerim(W/2, bb)) + ' round the edge', 'middle', 'ev-t', fs*0.85);
    o += T(bcx, by2 + bb + fs*2.5, 'the two marks are the side seams', 'middle', 'ev-t', fs*0.8);
    SIDENOTE.push('the body is one tube, seamed at both sides');
  }
  /* ---- the two plans: the bag from directly above, and from underneath ----
     Standard drafting order - the plan goes under its elevation. It is the only view that
     shows what the top of a bag actually is: the mouth, how far the flap reaches across it,
     and where a grab handle would have to sit to clear both. */
  {
    const pcx = ox + W/2, pcy = oy + H + fs*6.2 + planD/2;
    /* A BUCKET's plan is its base outline, so it really is the superellipse. A BARREL's is
       not: it is a tube of length W lying on its side, so from above it is a plain W x D
       rectangle with a flat end panel at each end. Drawing it with basePts ran the barrel's
       CROSS-SECTION squareness round the plan - and a duffle carries two of those, 70 at the
       bottom and 15 at the top - which is what made the duffle's top and bottom views a
       lopsided blob that matched nothing on the bag. */
    const round = S.construction==='bucket';
    const pr = S.construction==='barrel' ? 0
             : S.construction==='gusset' ? Math.min(12, D/3) : Math.min(10, Math.min(W,D)/4);
    const shell = round ? poly(basePts(W/2, Math.max(6, D/2)).map(q=>[pcx+q[0], pcy+q[1]]))
                        : rr(pcx - W/2, pcy - planD/2, W, planD, pr);
    o += `<path d="${shell}" class="ev-body ev-pick" data-sel="body"/>`;
    const mi = Math.max(1.2, t);
    if(S.construction==='barrel'){
      // nothing opens upward on a barrel: the top is the seam the tube closes on, and the
      // zip lies in it. An inset "mouth" outline here says the bag is open, and it is not.
      o += `<path d="M ${nn(pcx - W/2)} ${nn(pcy)} H ${nn(pcx + W/2)}" class="ev-ghost"/>`;
      [-1,1].forEach(sg=> o += `<path d="M ${nn(pcx + sg*W/2)} ${nn(pcy - planD/2)} V ${nn(pcy + planD/2)}" class="ev-in"/>`);
      o += T(pcx, pcy - planD/2 - fs*0.6, 'the tube closes along this seam \u2014 flat end panel at each end', 'middle', 'ev-t', fs*0.8);
    } else {
      // the mouth: the wall has thickness, so the hole is smaller than the bag
      const mouth = round ? poly(basePts(Math.max(4,W/2-mi), Math.max(4, D/2-mi)).map(q=>[pcx+q[0], pcy+q[1]]))
                          : rr(pcx - W/2 + mi, pcy - planD/2 + mi, Math.max(4,W-2*mi), Math.max(4,planD-2*mi), Math.max(0,pr-mi));
      o += `<path d="${mouth}" class="ev-in"/>`;
    }
    o += ctrLines(pcx, pcy, W, planD);
    if(S.top==='flap'){
      // the flap comes over the back edge and reaches this far across
      const reach = Math.min(planD, D + 2*t);
      o += `<path d="${rr(pcx - W/2, pcy - planD/2, W, reach, {tl:pr, tr:pr})}" class="ev-flapt"/>`;
      o += T(pcx, pcy - planD/2 - fs*0.6, 'the flap comes over from the back', 'middle', 'ev-t', fs*0.8);
    }
    if(S.top==='zip'){
      const G = zipG();
      o += zipRun(pcx - mouthSpan()/2, pcx + mouthSpan()/2, pcy, 'h', G, zipInset());
    }
    if(S.strap.type==='handles'){
      const Hd = S.handles, hf = handleFoot();
      [-1,1].forEach(sg=>{
        o += `<rect x="${nn(pcx - Hd.span/2 - hf.w/2)}" y="${nn(pcy + sg*(planD/2 - Hd.anchorY - hf.h) - (sg>0?0:hf.h))}"
               width="${nn(Hd.span + hf.w)}" height="${nn(hf.h)}" rx="2" class="ev-anch"/>`;
      });
    }
    // anything on the top face, placed and dragged from here
    S.elements.filter(e=>e.face==='top').forEach(e=>{
      const bb2 = rotBox(e.w, elFootH(e), e.rot||0);
      const cxs = [pcx + e.x];
      if(e.mirror) cxs.push(pcx - e.x);
      cxs.forEach((cx2,i)=>{
        const cy2 = pcy - planD/2 + e.y + bb2.h/2, id = i===0 ? 'ev-el'+e.id : '';
        const sp = e.rot ? ` transform="rotate(${nn(e.rot)} ${nn(cx2)} ${nn(cy2)})"` : '';
        const g = `<rect x="${nn(cx2-e.w/2)}" y="${nn(cy2-elFootH(e)/2)}" width="${nn(e.w)}" height="${nn(elFootH(e))}" rx="${nn(e.r)}" class="ev-el"${sp}/>${elCascade(e, cx2, cy2, sp)}`;
        o += id ? `<g id="${id}" class="ev-elg drag" data-sel="element" data-eid="${e.id}">${g}</g>` : g;
        if(i===0){
          o += T(cx2, cy2 + bb2.h/2 + fs*1.05, T_(e), 'middle', 'ev-t', Math.min(fs*0.9, Math.max(bb2.w*0.16, fs*0.66)));
          DRAGS.push({id, ax:'xy', el:e.id, across:W, down:planD, cx:pcx, cy0:pcy - planD/2});
          elGrips(e, cx2, cy2, e.rot || 0, 'T');
        }
      });
    });
    o += T(pcx, pcy + planD/2 + fs*2.4, 'TOP', 'middle', 'ev-tl');
    o += T(pcx, pcy + planD/2 + fs*3.5, S.top==='flap' ? 'looking down, flap closed \u00b7 back at the top'
                                                       : 'looking down \u00b7 back at the top', 'middle', 'ev-t', fs*0.8);
    o += `<path d="M ${nn(pcx + W/2 + 12)} ${nn(pcy - planD/2)} V ${nn(pcy + planD/2)}
           M ${nn(pcx + W/2 + 9)} ${nn(pcy - planD/2)} h 6 M ${nn(pcx + W/2 + 9)} ${nn(pcy + planD/2)} h 6" class="ev-dim"/>`;
    o += `<g transform="translate(${nn(pcx + W/2 + 14)},${nn(pcy)}) rotate(-90)">${T(0,-2,fmt(S.D))}</g>`;
  }
  /* ---- and the underside. Feet, a maker's stamp, a base plate: things nobody thinks about
     until the bag is finished and there is nowhere left to reach. Seen from below, so the
     back is still at the top and left is still left - turn the bag over towards you, not
     sideways, and the drawing is what you see. */
  {
    const qcx = bx + W/2, qcy = oy + H + fs*6.2 + planD/2;
    const round2 = S.construction==='bucket';
    const pr2 = S.construction==='barrel' ? 0
              : S.construction==='gusset' ? Math.min(S.corner, D/3) : Math.min(10, Math.min(W,D)/4);
    const shell2 = round2 ? poly(basePts(W/2, Math.max(6, D/2)).map(q=>[qcx+q[0], qcy+q[1]]))
                          : rr(qcx - W/2, qcy - planD/2, W, planD, pr2);
    // the underside is a face in its own right: clicking it used to open the body's dimensions,
    // which is not what anybody wants from the one view that shows where the feet go
    o += `<path d="${shell2}" class="ev-body ev-pick" data-sel="base"/>`;
    o += ctrLines(qcx, qcy, W, planD);
    if(S.construction==='barrel'){
      /* A tube only stands on the strip of itself that is flat enough to. Square the base up
         and that strip widens; leave it a true ellipse and the bag rocks. Show the strip. */
      const flat = Math.max(6, Math.min(D*0.9, D * Math.max(0.12, Math.min(1, S.squareness/100))));
      o += `<path d="${rr(qcx - W/2, qcy - flat/2, W, flat, 0)}" class="ev-flapt"/>`;
      o += T(qcx, qcy - flat/2 - fs*0.55, 'it stands on this strip \u2014 square the base up to widen it', 'middle', 'ev-t', fs*0.8);
    }
    // where the base actually is on the pattern, which is what you have to mark it on
    const baseNote = S.construction==='gusset'
        ? (S.gussetStyle==='base' ? 'a separate base panel' : 'the middle of the gusset strip')
      : S.construction==='boxed' ? 'the fold across the middle of the body'
      : S.construction==='bucket' ? 'the round base panel'
      : S.construction==='barrel' ? 'the bottom of the tube' : 'the fold at the base';
    if(S.construction!=='bucket' && S.construction!=='barrel' && S.construction!=='boxed')
      o += `<path d="M ${nn(qcx-W/2)} ${nn(qcy)} H ${nn(qcx+W/2)}" class="ev-ghost"/>`;
    S.elements.filter(e=>e.face==='base').forEach(e=>{
      const bb2 = rotBox(e.w, elFootH(e), e.rot||0);
      const cxs = [qcx + e.x];
      if(e.mirror) cxs.push(qcx - e.x);
      cxs.forEach((cx2,i)=>{
        const cy2 = qcy - planD/2 + e.y + bb2.h/2, id = i===0 ? 'ev-el'+e.id+'B' : '';
        const sp = e.rot ? ` transform="rotate(${nn(e.rot)} ${nn(cx2)} ${nn(cy2)})"` : '';
        const g = ELTYPES[e.type].point
          ? `<circle cx="${nn(cx2)}" cy="${nn(cy2)}" r="${nn(Math.max(2, Math.min(e.w,e.h)/2))}" class="ev-hw"/>`
          : ELTYPES[e.type].feet
          ? `<rect x="${nn(cx2-e.w/2)}" y="${nn(cy2-elFootH(e)/2)}" width="${nn(e.w)}" height="${nn(elFootH(e))}" rx="0" class="ev-anch"${sp}/>`
            + feetPts(cx2-e.w/2, cy2-e.h/2, e.w, e.h, rivetSpecAt(e))
                .map(q=>`<circle cx="${nn(q[0])}" cy="${nn(q[1])}" r="${nn(hr*1.25)}" class="ev-hw"/>`).join('')
          : `<rect x="${nn(cx2-e.w/2)}" y="${nn(cy2-elFootH(e)/2)}" width="${nn(e.w)}" height="${nn(elFootH(e))}" rx="${nn(e.r)}" class="ev-el"${sp}/>`;
        o += id ? `<g id="${id}" class="ev-elg drag" data-sel="element" data-eid="${e.id}">${g}</g>` : g;
        if(i===0){
          o += T(cx2, cy2 + bb2.h/2 + fs*1.05, T_(e), 'middle', 'ev-t', Math.min(fs*0.9, Math.max(bb2.w*0.16, fs*0.66)));
          DRAGS.push({id, ax:'xy', el:e.id, across:W, down:planD, cx:qcx, cy0:qcy - planD/2});
          elGrips(e, cx2, cy2, e.rot || 0, 'U');
        }
      });
    });
    o += T(qcx, qcy + planD/2 + fs*2.4, 'BOTTOM', 'middle', 'ev-tl');
    o += T(qcx, qcy + planD/2 + fs*3.5, 'looking up from underneath \u00b7 back at the top', 'middle', 'ev-t', fs*0.8);
    o += T(qcx, qcy + planD/2 + fs*4.6, 'marked on ' + baseNote, 'middle', 'ev-t', fs*0.8);
  }
  }
  if(isWallet) walletBody(); else bagBody();
  if(tap>0 && !isWallet) SIDENOTE.unshift('rim '+fmt(S.D-tap)+' at the top');
  SIDENOTE.forEach((n2,i)=> o += isWallet
    ? T(ox+W/2, WALLBOT+fs*(4.4+i*1.15), n2, 'middle', 'ev-t', fs*0.85)
    : T(sx+D/2, oy+H+fs*(5.1+i*1.15), n2, 'middle', 'ev-t', fs*0.85));
  o += `<g class="ev-ctrg">${CTR}</g>`;          // over the panels, under the handles
  o += `<g class="ev-handles">${HND}</g>`;      // last, so nothing can be drawn over a handle
  o += `</svg>`;

  const st = model.stats;
  const vol = (S.W*S.H*S.D)/1e6;
  return `
  <div class="elev">
    ${S.construction==='free' ? renderShape() : ''}
    <div class="card">
      <h3>In the round <span class="tag">drag to turn it</span></h3>
      <div class="v3dbox" id="v3dbox">${render3d()}</div>
      <div class="legend">
        <span><i style="border-top:9px solid var(--lea-hi)"></i>shell</span>
        <span><i style="border-top:9px solid var(--lea2-hi)"></i>pockets &amp; fittings</span>
        <span><i style="border-top:9px solid var(--mtl-hi)"></i>hardware</span>
        <span><i style="border-top:2px dashed var(--thr)"></i>stitch lines</span>
        <span style="margin-left:auto">lit, not photographed \u2014 every face is shaded by the angle it sits at</span>
      </div>
    </div>
    <div class="card wide" style="order:3">
      <h3>${S.construction==='fold' && S.D < 12 ? 'The wallet, open' : 'Elevations'} <span class="tag">click a part to edit it \u00b7 drag the edges to resize</span></h3>
      <div class="elevbox">${o}</div>
      <div class="legend">
        <span><i style="border-top:2px solid var(--text-2)"></i>body</span>
        <span><i style="border-top:2px solid var(--accent)"></i>flap</span>
        <span><i style="border-top:2px dashed var(--text-2)"></i>pocket</span>
        <span><i style="border-top:3px solid var(--crit); border-radius:2px"></i>hardware &amp; marks</span>
      </div>
      <dl class="readout" style="margin:0">
        <div><dt>Finished</dt><dd>${fmt(S.W,{unit:false})} \u00d7 ${fmt(S.H,{unit:false})} \u00d7 ${fmt(S.D)}</dd></div>
        <div><dt>Volume</dt><dd>${vol.toFixed(1)}<small> L</small></dd></div>
        <div><dt>Pieces to cut</dt><dd>${st.pieces}<small> (${st.unique} shapes)</small></dd></div>
        <div><dt>Leather</dt><dd>${(st.leather/92903.04).toFixed(2)}<small> sq ft</small></dd></div>
      </dl>
    </div>
    ${renderInside()}
    <div style="display:flex; flex-direction:column; gap:18px; order:2">
      <div class="card">
        <h3>What this bag is</h3>
        <div class="kv">
          <div><span>Construction</span><span>${{gusset:'front + back + gusset',boxed:'one piece, boxed corners',bucket:'round base, wrapped body',barrel:'barrel \u2014 round ends',fold:'folded wrap'}[S.construction] || S.construction}</span></div>
          <div><span>Leather</span><span>${fmt(S.thickness)} \u00b7 ${(S.thickness/0.397).toFixed(1)} oz</span></div>
          <div><span>Seam / stitch inset</span><span>${fmt(S.sa)}</span></div>
          <div><span>Edges</span><span>${S.edge==='raw'?'raw, burnished':'turned '+fmt(S.turn)}</span></div>
          <div><span>Iron</span><span>${fmtPitch(st.pitch)} \u00b7 ${st.spi.toFixed(1)} SPI \u00b7 ${S.stitch.prongs} prong</span></div>
          <div><span>Holes to prick</span><span>${st.stitches.toLocaleString()}</span></div>
          <div><span>Iron strikes</span><span>${st.planStrikes.toLocaleString()}</span></div>
          <div><span>Thread, all seams</span><span>${fmtLen(st.thread)}</span></div>
          <div><span>Edge to finish</span><span>${fmtLen(st.edge*0.45)}</span></div>
        </div>
      </div>
      <div class="card">
        <h3>Hardware</h3>
        <div class="kv">${model.hw.map(h=>`<div><span>${esc(h.n)}</span><span>\u00d7${h.q}</span></div>`).join('')||'<div><span>None</span><span>\u2014</span></div>'}</div>
      </div>
    </div>
  </div>`;
}

