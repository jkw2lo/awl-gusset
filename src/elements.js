/* ============================================================
   ELEMENTS - parts you add to a base bag to customise it.
   Each one is drawn in place on the panel that carries it, with
   its fixing, and most of them generate their own cut piece.
   ============================================================ */
/* `faces` is where a part may go. The gusset is a face like any other - a D-ring tab, a keeper
   or a slip pocket on the side of a bag is completely ordinary, and half of these could not be
   put there at all. `top` is the panel that lies over the mouth, which only exists on a flap
   bag: a grab handle across the top of a satchel lives there. */
const ELTYPES = {
  patch:   {name:'Patch pocket',    w:120, h:90,  r:6, fix:'stitch3',  faces:['front','back','gusset','inside','top'], piece:'patch', opens:true},
  slip:    {name:'Slip pocket',     w:130, h:100, r:0, fix:'stitch3',  faces:['inside','front','back','gusset'],       piece:'slip',  opens:true, folded:true},
  tab:     {name:'D-ring tab',      w:20,  h:40,  r:2, fix:'stitchbox',faces:['front','back','gusset','top'],          piece:'tab'},
  keeper:  {name:'Keeper loop',     w:22,  h:14,  r:0, fix:'stitchbox',faces:['front','back','gusset','top','base'],   piece:'keeper'},
  penloop: {name:'Pen loop',        w:18,  h:70,  r:2, fix:'stitchbox',faces:['inside','front','back','gusset'],       piece:'penloop'},
  pad:     {name:'Reinforcement',   w:40,  h:40,  r:6, fix:'none',     faces:['inside','front','back','gusset','top','base'], piece:'pad'},
  label:   {name:'Maker stamp',     w:34,  h:14,  r:2, fix:'none',     faces:['front','back','inside','gusset','top','base'], piece:null},
  rivet:   {name:'Rivet point',     w:14,  h:14,  r:0, fix:'rivet',    faces:['front','back','gusset','inside','top','base'], piece:null, point:true},
  snap:    {name:'Snap / magnet',   w:16,  h:16,  r:0, fix:'none',     faces:['front','back','gusset','top'],          piece:null, point:true},
  eyelet:  {name:'Eyelet',          w:8,   h:8,   r:0, fix:'none',     faces:['front','back','gusset','top','base'],   piece:null, point:true},
  beltloop:{name:'Belt loop',       w:46,  h:22,  r:0, fix:'stitchbox',faces:['back','front','gusset'],                piece:'beltloop'},
  haul:    {name:'Grab handle',     w:110, h:26,  r:4, fix:'stitchbox',faces:['back','front','gusset','top'],          piece:'haul'},
  bellows: {name:'Bellows pocket',  w:130, h:110, r:0, dep:20, fix:'stitch3', faces:['front','back','gusset'],          piece:'bellows', opens:true},
  buckle:  {name:'Buckle tab',      w:22,  h:60,  r:2, fix:'stitchbox',faces:['front','back','gusset','top'],          piece:'buckle'},
  foot:    {name:'Bag foot',        w:12,  h:12,  r:0, fix:'none',     faces:['base'],                                 piece:null, point:true},
  feet:    {name:'Feet, a set',     w:150, h:90,  r:0, fix:'rivet',    faces:['base'],                                 piece:null, noFix:true, feet:true},
  cards:   {name:'Card slots',     w:97,  h:40,  r:0, fix:'stitchbox',faces:['inside','front','back','gusset'],       piece:'cards', cards:true}
};
/* ---------- a card stack ----------
   Two ways to build one, and they are different bags of leather.

   `faced` is what the built-in Inside module has always drafted: n pieces of increasing height
   on ONE common bottom edge, stitched only up the sides. The pocket for each card is the gap
   between two layers, and the layer behind the deepest one is the LINING - so the leather is a
   facing and the lining does the work of the pocket. Thin and quick, and it is why the bottom
   of the stack comes out n + 1 layers thick.

   `pockets` is the all-leather one. Every slot is its own pocket: an identical rectangle
   stitched to the lining along a horizontal line at its OWN bottom, each one a reveal below
   the last, so the cascade comes from where they are stitched rather than from how tall they
   are cut. The lining therefore carries a stitch line per pocket - that line IS the pocket -
   and every piece is the same size, so you cut n of one thing. The two sides go through the
   whole stack in one run at the end, which is why they are marked from the lining and not from
   the pieces: that row starts where the lining says, not where any one piece does.

   k counts from the BACK, which is the piece whose mouth is highest - it has to sit behind the
   ones in front of it, or you could not see into them. */
const CARD_MIN = 14;          // the shallowest slot that will still hold a card
function cardsGeom(el){
  const n = Math.max(1, Math.round(el.slots || 3));
  const want = Math.max(4, el.reveal || 11);
  // deep enough to hold a card, shallow enough to leave some of it to take hold of
  const tuck = Math.max(CARD_MIN, Math.min(el.h || 40, CARD_H - 6));
  const pockets = el.build === 'pockets';
  /* A FACED stack takes its whole cascade out of the one depth it has: five slots at 11 mm off
     a 40 mm stack leaves the front one 4 mm deep, which is a slot with no card in it and a
     piece with no leather in it. So the reveal stops where the leather stops - the same rule
     every shaped number on the drawing follows - and `capped` is how the drafter says it moved.
     A POCKETS stack has no such limit: each pocket is its own full-depth piece. */
  const rev = (pockets || n < 2) ? want : Math.min(want, (tuck - CARD_MIN)/(n - 1));
  const sa = Math.max(1.5, S.sa), w = Math.max(30, el.w || 97);
  const mouth = [], bottom = [];
  for(let k=0;k<n;k++){
    mouth.push(k*rev);
    bottom.push(pockets ? k*rev + tuck : tuck);
  }
  return {n, rev, tuck, pockets, w, sa, mouth, bottom,
          revWant: want, capped: rev < want - 0.05,
          hCapped: Math.abs(tuck - (el.h || 40)) > 0.05,
          stackH: bottom[n-1] + sa,
          slotW: w - 2*sa,                       // what is left for the card once the sides are sewn
          depth: k => bottom[k] - mouth[k],      // how much of the card that slot covers
          pieceH: k => (pockets ? tuck : tuck - k*rev) + sa};
}
/* The stack drawn on whatever it is stitched to, in that panel's own frame. Everything is
   built upright and rotated as ONE piece, exactly as attachOn does it, so a stack turned on
   its side keeps its shape, its hole counts and its spacing. */
function cardsOn(d, x, y, el, key, name, deg, pivot, label){
  const G = cardsGeom(el), sa = G.sa;
  const px = pivot ? pivot[0] : x + G.w/2, py = pivot ? pivot[1] : y + G.stackH/2;
  const R = segs => rotSegs(segs, px, py, deg);
  const RP = (ax, ay) => deg ? rotPt(ax, ay, px, py, deg*Math.PI/180) : [ax, ay];
  d.push({t:'mark', d:segsPath(R(rectSegs(x, y, G.w, G.stackH, 0)))});
  // every mouth but the topmost is a cut edge you can see: the cascade, drawn
  for(let k=1;k<G.n;k++){
    const a = RP(x, y + G.mouth[k]), b = RP(x + G.w, y + G.mouth[k]);
    d.push({t:'mark', d:`M ${nn(a[0])} ${nn(a[1])} L ${nn(b[0])} ${nn(b[1])}`});
  }
  /* One run down each side, through every layer that is there - not one per piece. Two rows a
     reveal apart down the same edge is two rows of holes in the same three millimetres. */
  [x + sa, x + G.w - sa].forEach(sx =>
    d.push(SEAM(key + 'side', name + ', each side',
      R([['L', sx, y + sa, sx, y + G.stackH - sa]]), {trim:sa, ins:sa})));
  if(G.pockets){
    // the line that MAKES each pocket: it is on the lining, and there is one per slot
    for(let k=0;k<G.n;k++)
      d.push(SEAM(key + 'p', name + ', pocket bottoms',
        R([['L', x + sa, y + G.bottom[k], x + G.w - sa, y + G.bottom[k]]]),
        {even:true, trim:sa, ins:sa}));
  }
  if(label){
    const q = RP(x + G.w/2, y + G.stackH - sa - 2.5);
    d.push({t:'text', x:q[0], y:q[1], s:label, size:Math.min(4.6, G.w*0.06), anchor:'middle',
            mark:true, rot:((deg||0) % 360)});
  }
}
/** The cascade drawn inside a card stack's box on the elevations, so what you are moving about
    reads as a stack of slots rather than one plain rectangle. */
function elCascade(e, cx, cy, spin){
  const T = ELTYPES[e.type];
  if(!T || !T.cards) return '';
  const G = cardsGeom(e), y0 = cy - G.stackH/2, x0 = cx - G.w/2;
  let o = '';
  for(let k=1;k<G.n;k++)
    o += `<path d="M ${nn(x0)} ${nn(y0 + G.mouth[k])} H ${nn(x0 + G.w)}" class="ev-ghost"${spin || ''}/>`;
  if(G.pockets) for(let k=0;k<G.n;k++)
    o += `<path d="M ${nn(x0)} ${nn(y0 + G.bottom[k])} H ${nn(x0 + G.w)}" class="ev-in"${spin || ''}/>`;
  return o;
}
/** The footprint an element actually puts on the bag. For most parts that is simply w x h; a
    card stack is as tall as the cascade makes it, which is not a number anybody types. */
function elFootH(el){
  const T = ELTYPES[el.type];
  return (T && T.cards) ? cardsGeom(el).stackH : el.h;
}
/** The top is the part of the flap that lies over the mouth, so there is no top without one.
    Every bag has a bottom. */
function faceOn(f){ return f !== 'top' || S.top === 'flap'; }
/* Which side of the bag a gusset element goes on. `mirror` still means both; otherwise this
   picks an end of the strip. The strip runs left to right as you look at the front, so the
   end nearest x = 0 is the bag's LEFT side, and the drawings say so. */
const SIDES = [['both','Both sides'],['left','Left side only'],['right','Right side only']];
const FACENAME = {front:'Front', back:'Back', gusset:'Gusset / side', inside:'Inside',
                  top:'Top (over the mouth)', base:'Bottom'};
/* Loops and handles are stitched at the two ends of their LONG axis and stand off the panel
   in between. w x h is the FOOTPRINT on the bag - what you see drawn there. The blank is
   that footprint plus the slack the loop needs to arch, so the two agree hole for hole. */
const LOOPTYPE = {haul:1, penloop:1, beltloop:1};
const LOOPPAD  = {haul:28, penloop:13, beltloop:26};
function loopPad(type){ return LOOPPAD[type] || 13; }
/** Extra length in the blank so a loop of this span can stand off by `rise`. */
function loopSlack(span, rise){ return Math.max(0, halfEllipse(Math.max(1,span)/2, Math.max(0,rise)) - span); }
/* ---------- the bellows pocket ----------
   A pleat that folds back on itself. Each side and the base carry `dep` of extra leather with
   TWO fold lines - out to the half fold and back - which is what lets an empty bellows lie flat
   against the panel and still open to `dep`. That extra leather is IN THE FOLD, not on the
   panel: what the panel is pricked to is the finished face, w x h, and the same three sections
   on the blank are the same three lengths. Both sides are therefore built from this one walk,
   the panel with no gap and the blank with a gap of `dep`, and they agree hole for hole.

   Where the side pleat crosses the base pleat - a dep x dep square at each bottom corner - the
   leather is folded over ITSELF. That square is never pricked, which is why the run is three
   separate sections rather than one lap of the box: the gap between them is the corner. */
function bellowsDep(el){
  const d = (el.dep != null && isFinite(el.dep) && el.dep > 0) ? el.dep : Math.round(el.w*0.16);
  return Math.max(4, Math.min(d, el.w/3, el.h/2));
}
/** The three stitched sections - round from one mouth corner to the other - as one run.
    `gap` is 0 on the panel, where the pleats are folded away, and `dep` on the blank, where
    they are still flat. Same walk, same three lengths, either way. */
function bellowsSegs(x, y, w, h, gap, side){
  const g = gap || 0;
  const c = [[x,y],[x+w,y],[x+w,y+h],[x,y+h]];        // tl, tr, br, bl
  const nrm = [[0,-1],[1,0],[0,1],[-1,0]];            // outward normal of top, right, bottom, left
  const i0 = {top:0, right:1, bottom:2, left:3}[side] != null ? {top:0, right:1, bottom:2, left:3}[side] : 0;
  const out = [];
  for(let k = 1; k <= 3; k++){
    const e = (i0 + k) % 4, a = c[e], b = c[(e+1)%4], nq = nrm[e];
    out.push(['L', a[0]+nq[0]*g, a[1]+nq[1]*g, b[0]+nq[0]*g, b[1]+nq[1]*g]);
  }
  return out;
}
/** Feet, set out to fill the box you drew. The arrangement comes from the same RIVET_PATS
    table everything else riveted reads - "four, square" is a foot at each corner, "five, like
    a die" adds one in the middle, "six, three by two" is what a long base wants - but the rows
    are SPREAD over the whole footprint rather than measured in from one end. A base has no
    free end to measure from: what you set is how far in from the front and back edges
    (`rivetInset`) and how far in from the sides (`rivetEdge`), and the rows fall evenly
    between. Everything else riveted works the other way round, which is why this is its own
    function rather than another argument to rivetPts. */
function feetPts(x, y, w, h, spec){
  const rows = rivetRows(spec);
  const inY = Math.max(2, Math.min(spec.inset, h/2 - 1));
  const inX = Math.max(2, Math.min(spec.edge,  w/2 - 1));
  const y0 = y + inY, y1 = y + h - inY, cx = x + w/2, half = Math.max(0, w/2 - inX);
  const out = [];
  rows.forEach((offs, r)=>{
    const yy = rows.length > 1 ? y0 + (y1 - y0)*r/(rows.length - 1) : (y0 + y1)/2;
    offs.forEach(u => out.push([cx + u*half, yy]));
  });
  return out;
}
function feetCount(el){ return feetPts(0, 0, Math.max(10, el.w), Math.max(10, el.h), rivetSpecAt(el)).length; }
function newElement(type){
  const T = ELTYPES[type];
  return {id:++S.elSeq, type, face:T.faces[0], x:0, y:40, w:T.w, h:T.h, r:T.r,
          dep:T.dep || 0, slots:3, reveal:11, build:'pockets',
          fix:T.fix, rivets:2, rivetPat:'across2', rivetInset:11, rivetPitch:13, rivetEdge:6.5,
          mirror:type==='tab', side:'both', rot:0, open:'top'};
}
/** How a face is drawn relative to the bag as worn: a panel drawn upside down carries
    +180, and the gusset strip is drawn lying on its side, so it carries -90. An element's
    own rotation rides on top, which keeps its mouth pointing the way you asked wherever
    the panel happens to land on the sheet. */
function faceRotation(ctx){ return ctx.rot ? -90 : (ctx.dir < 0 ? 180 : 0); }
/** Bounding size of a w x h rectangle turned through deg. */
function rotBox(w, h, deg){
  const a = (deg||0)*Math.PI/180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  return {w: w*c + h*s, h: w*s + h*c};
}
/** Draw every element that belongs to this face, in this panel's coordinates. */
function placeElements(d, dm, ctx){
  S.elements.forEach(el=>{
    if(el.face !== ctx.face) return;
    const T = ELTYPES[el.type]; if(!T) return;
    const deg = (el.rot || 0) + faceRotation(ctx);
    const bb = rotBox(el.w, elFootH(el), deg);
    // the element is placed by its centre, so a turned one still sits where you put it
    const spots = [];
    if(ctx.rot){
      spots.push({cx: ctx.rimY + el.y + bb.h/2, cy: ctx.cx + el.x, far:'end'});
      if(el.mirror && ctx.alongEnd != null)
        spots.push({cx: ctx.alongEnd - el.y - bb.h/2, cy: ctx.cx + el.x, far:'start'});
    } else {
      const cy = ctx.dir>0 ? ctx.rimY + el.y + bb.h/2 : ctx.rimY - el.y - bb.h/2;
      spots.push({cx: ctx.cx + el.x, cy, far: ctx.dir>0?'end':'start'});
      if(el.mirror) spots.push({cx: ctx.cx - el.x, cy, far: ctx.dir>0?'end':'start'});
    }
    spots.forEach((s,i)=>{
      const x = s.cx - el.w/2, y = s.cy - el.h/2;
      const label = i===0 ? T.name.toUpperCase() : '';
      const name = T.name + ' on the ' + FACENAME[el.face].toLowerCase();
      if(T.point){
        d.push({t:'hole', x:s.cx, y:s.cy, r:Math.max(1.6, Math.min(el.w,el.h)/4), label});
        if(el.fix==='rivet' && rivetCount(rivetSpecAt(el))>1)
          attachOn(d, x, y, el.w, el.h, 'el'+el.id, name,
                   {axis:'y', far:s.far, fix:'rivet', rivetSpec:rivetSpecAt(el), deg});
        return;
      }
      if(LOOPTYPE[el.type]){
        const pad = loopPad(el.type), piv = [s.cx, s.cy], wide = el.w >= el.h;
        d.push({t:'mark', d:segsPath(rotSegs(rectSegs(x, y, el.w, el.h, el.r), piv[0], piv[1], deg))});
        const ends = wide ? [[x, y, pad, el.h, 'start'], [x + el.w - pad, y, pad, el.h, 'end']]
                          : [[x, y, el.w, pad, 'start'], [x, y + el.h - pad, el.w, pad, 'end']];
        ends.forEach((e,k)=>attachOn(d, e[0], e[1], e[2], e[3], 'el'+el.id, name,
          {axis: wide ? 'x' : 'y', far:e[4], fix:el.fix, rivetSpec:rivetSpecAt(el), deg, pivot:piv, label:''}));
        // the span between the two stitch lines is what your hand, the belt or the pen goes through
        const sp = wide ? el.w - 2*pad : el.h - 2*pad;
        if(sp > 8){
          const mid = wide ? [[x+pad, y+el.h/2, x+el.w-pad, y+el.h/2]] : [[x+el.w/2, y+pad, x+el.w/2, y+el.h-pad]];
          d.push({t:'mark', d:segsPath(rotSegs([['L'].concat(mid[0])], piv[0], piv[1], deg))});
        }
        // the name goes in the middle of the span, not in an end box where the rivets are
        if(label) d.push({t:'text', x:s.cx, y:s.cy + 1.4, s:label, rot:deg,
                          size:Math.min(4.6, (wide ? el.h : el.w)*0.32), anchor:'middle', mark:true});
        return;
      }
      if(T.cards){
        cardsOn(d, x, s.cy - elFootH(el)/2, el, 'el'+el.id, T.name + ' on the ' + FACENAME[el.face].toLowerCase(),
                deg, [s.cx, s.cy], label);
        return;
      }
      if(T.feet){
        // a set of feet is not stitched and has no piece: it is a box on the base and a hole
        // in it for every foot, which is all you have to mark
        d.push({t:'mark', d:segsPath(rotSegs(rectSegs(x, y, el.w, el.h, 0), s.cx, s.cy, deg))});
        feetPts(x, y, el.w, el.h, rivetSpecAt(el)).forEach((q,k)=>{
          const pp = deg ? rotPt(q[0], q[1], s.cx, s.cy, deg*Math.PI/180) : q;
          d.push({t:'hole', x:pp[0], y:pp[1], r:2.2, label:k===0?'FOOT':''});
        });
        if(label) d.push({t:'text', x:s.cx, y:s.cy + 1.4, s:label, rot:deg,
                          size:Math.min(5, el.w*0.09), anchor:'middle', mark:true});
        return;
      }
      // a bellows is pricked to its FACE: the pleats are folded away behind it, and the two
      // corners where they cross carry no holes at all - see bellowsSegs
      const bel = el.type==='bellows';
      attachOn(d, x, y, el.w, el.h, 'el'+el.id, name,
               {axis:'y', far:s.far, fix:el.fix, rivetSpec:rivetSpecAt(el), r:bel?0:el.r, deg,
                open: T.opens ? el.open : null, folded: !!T.folded, label,
                run: bel ? ((bx, by, bw, bh, sd)=>bellowsSegs(bx, by, bw, bh, 0, sd)) : null});
    });
    if(spots.length && !ctx.rot){
      const top = spots[0].cy - bb.h/2, bot = spots[0].cy + bb.h/2;
      dm.push(D_('v', ctx.dir>0 ? ctx.rimY : bot, ctx.dir>0 ? top : ctx.rimY,
                 spots[0].cx, fmt(el.y), 1));
    }
  });
}
/** The cut pieces an element needs, matched to the marks already on the panel. */
const ni2 = (ph, grid, G) => Math.max(1, Math.floor((ph - 2*G.sa)/grid.pitch)) + 1;
function elementPieces(sa, t){
  const out = [];
  S.elements.forEach(el=>{
    const T = ELTYPES[el.type]; if(!T || !T.piece) return;
    const key = 'el'+el.id, on = FACENAME[el.face].toLowerCase();
    const nm = n => `${T.name} ${el.id} \u00b7 ${FACENAME[el.face]}`;
    if(T.piece==='patch'){
      const hem = 12, o4 = el.open || 'top';
      const padL = o4==='left' ? hem : sa, padR = o4==='right'  ? hem : sa;
      const padT = o4==='top'  ? hem : sa, padB = o4==='bottom' ? hem : sa;
      const pw = el.w + padL + padR, ph = el.h + padT + padB;
      const cr = {tl:0,tr:0,br:0,bl:0}, rr2 = el.r + sa;
      // round only the corners away from the mouth, the way the finished pocket reads
      if(o4==='top'){ cr.br = cr.bl = rr2; } else if(o4==='bottom'){ cr.tr = cr.tl = rr2; }
      else if(o4==='left'){ cr.tr = cr.br = rr2; } else { cr.tl = cr.bl = rr2; }
      const foldLine = o4==='top' ? hLine(0,pw,hem) : o4==='bottom' ? hLine(0,pw,ph-hem)
                     : o4==='left' ? vLine(hem,0,ph) : vLine(pw-hem,0,ph);
      const d = [{t:'cut', d:rr(0,0,pw,ph,cr)},
        {t:'fold', d:foldLine, label:'MOUTH \u2014 FOLD THE HEM'},
        {t:'ctr', d:vLine(pw/2,0,ph)}, {t:'notch', x:pw/2, y:ph, dir:'up'},
        {t:'text', x:padL+3, y:padT+el.h-4, s:'PATCH POCKET '+el.id, size:5, anchor:'start', dim:true},
        {t:'text', x:pw/2, y:ph-2, s:'OPENS ' + openWord(o4, el.rot||0).toUpperCase() + ' ON THE BAG', size:3.6, anchor:'middle', mark:true}];
      attachOn(d, padL, padT, el.w, el.h, key, T.name+' on the '+on,
               {fix:el.fix, rivetSpec:rivetSpecAt(el), r:el.r, open:o4, label:''});
      out.push(P({key, name:nm(), mat:'Leather', w:pw, h:ph, draw:d, seam:2*el.h+el.w,
        dims:[D_('h',0,pw,-9,fmt(pw)), D_('v',0,ph,-9,fmt(ph))],
        formula:`finished ${fmt(el.w)} \u00d7 ${fmt(el.h)}, mouth on the ${o4}: hem ${fmt(hem)} there, SA ${fmt(sa)} on the three stitched sides.\nSits ${fmt(el.y)} down from the ${on} rim, ${el.x===0?'centred':fmt(Math.abs(el.x))+(el.x>0?' right':' left')+' of centre'}${el.rot?`, turned ${el.rot}\u00b0`:''}.\nCut it flat as drawn \u2014 the turn is where it sits, not how it is cut.`}));
    }
    if(T.piece==='slip'){
      const o4 = el.open || 'top';
      const pw = el.w + 2*sa, ph = 2*el.h + 2*sa;
      const d = [{t:'cut', d:rr(0,0,pw,ph,0)},
        {t:'fold', d:hLine(0,pw,ph/2), label:'FOLD \u2014 THE BASE, NOT A SEAM'},
        {t:'ctr', d:vLine(pw/2,0,ph)},
        {t:'text', x:pw/2, y:ph*0.28, s:'SLIP POCKET '+el.id, size:5.4, anchor:'middle', dim:true},
        {t:'text', x:pw/2, y:sa-1.6, s:'FOLD FIRST, THEN PRICK BOTH LAYERS TOGETHER', size:3.4, anchor:'middle', mark:true},
        {t:'text', x:pw/2, y:ph-2, s:'OPENS ' + openWord(o4, el.rot||0).toUpperCase() + ' ON THE BAG', size:3.6, anchor:'middle', mark:true}];
      attachOn(d, sa, sa, el.w, el.h, key, T.name+' on the '+on,
               {fix:el.fix, rivetSpec:rivetSpecAt(el), r:0, open:o4, folded:true, label:''});
      out.push(P({key, name:nm(), mat:S.lined&&el.face==='inside'?'Lining':'Leather', w:pw, h:ph, draw:d, seam:2*el.h+el.w,
        dims:[D_('h',0,pw,-9,fmt(pw)), D_('v',0,ph,-9,fmt(ph))],
        formula:`One piece folded: (${fmt(el.w)} + 2 \u00d7 SA) \u00d7 (2 \u00d7 ${fmt(el.h)} + 2 \u00d7 SA), mouth on the ${o4}.\nSits ${fmt(el.y)} down from the ${on} rim${el.rot?`, turned ${el.rot}\u00b0`:''}.`}));
    }
    if(T.piece==='tab'){
      const tl = 2*el.h + 14;
      const d = [{t:'cut', d:rr(0,0,tl,el.w,Math.min(el.w/2,3))},
        {t:'fold', d:vLine(tl/2,0,el.w), label:'FOLD \u00b7 RING SITS HERE'},
        {t:'text', x:tl*0.16, y:el.w/2+2, s:'TAB '+el.id, size:4.6, anchor:'middle', dim:true}];
      attachOn(d, tl-el.h, 0, el.h, el.w, key, T.name+' on the '+on, {axis:'x', far:'end', fix:el.fix, rivetSpec:rivetSpecAt(el)});
      d.push({t:'text', x:tl-el.h, y:el.w+5, s:'FOLD FIRST, THEN PRICK BOTH TAILS TOGETHER', size:3.4, anchor:'start', mark:true});
      out.push(P({key, name:nm(), mat:'Leather', w:tl, h:el.w, qty:el.mirror?2:1, draw:d, seam:tl*2,
        dims:[D_('h',0,tl,-9,fmt(tl)), D_('v',0,el.w,-9,fmt(el.w))],
        formula:`2 \u00d7 tail ${fmt(el.h)} + 14 mm to wrap the ring bar = ${fmt(tl)}.\nSits ${fmt(el.y)} down from the ${on} rim.`}));
    }
    if(T.piece==='keeper'){
      const kl = 2*(el.w + 3*t) + 10, lap = 10;
      const kd=[{t:'cut', d:rr(0,0,kl,el.h,0)},
        {t:'mark', d:vLine(lap,0,el.h)}, {t:'mark', d:vLine(kl-lap,0,el.h)},
        // its own key: an added keeper is not the strap's built-in keeper, and the two laps
        // are different lengths. Sharing 'keeperlap' gave the second one the first one's count
        SEAM(key+'lap','Keeper overlap', [['L', lap/2, el.h-Math.max(2,S.sa*0.6), lap/2, Math.max(2,S.sa*0.6)]], {through:true}),
        {t:'text', x:kl/2, y:el.h*0.65, s:'KEEPER '+el.id, size:4.4, anchor:'middle', dim:true},
        {t:'text', x:kl/2, y:el.h+4.2, s:'WRAP IT ROUND, LAP THE ENDS '+fmt(lap)+' AND STITCH THE LAP', size:3.2, anchor:'middle', mark:true}];
      out.push(P({key, name:nm(), mat:'Leather', w:kl, h:el.h, qty:el.mirror?2:1, seam:kl, draw:kd,
        dims:[D_('h',0,kl,-9,fmt(kl)), D_('v',0,el.h,-9,fmt(el.h))],
        formula:`wraps a ${fmt(el.w)} strap: 2 \u00d7 (${fmt(el.w)} + 3 \u00d7 thickness ${fmt(3*t)}) + ${fmt(lap)} overlap = ${fmt(kl)}\n`+
                `The overlap is the only stitching on it \u2014 one short row through both ends.`}));
    }
    if(T.piece==='penloop'){
      const pad = loopPad('penloop'), span = Math.max(6, el.h - 2*pad), rise = el.w*0.6;
      const slack = loopSlack(span, rise), pl = el.h + slack;
      const d = [{t:'cut', d:rr(0,0,pl,el.w,2)},
        {t:'fold', d:vLine(pad,0,el.w), label:'FOLD'}, {t:'fold', d:vLine(pl-pad,0,el.w), label:'FOLD'},
        {t:'text', x:pl/2, y:el.w*0.65, s:'PEN LOOP '+el.id, size:4.2, anchor:'middle', dim:true},
        {t:'text', x:pl/2, y:el.w+4.6, s:'THE '+fmt(slack)+' OF SLACK IS WHERE THE PEN SITS', size:3.2, anchor:'middle', mark:true}];
      attachOn(d, 0, 0, pad, el.w, key, T.name+' on the '+on, {axis:'x', far:'start', fix:el.fix, rivetSpec:rivetSpecAt(el)});
      attachOn(d, pl-pad, 0, pad, el.w, key, T.name+' on the '+on, {axis:'x', far:'end', fix:el.fix, rivetSpec:rivetSpecAt(el)});
      out.push(P({key, name:nm(), mat:'Leather', w:pl, h:el.w, draw:d, seam:pl,
        dims:[D_('h',0,pl,-9,fmt(pl)), D_('v',0,el.w,-9,fmt(el.w)), D_('h',pad,pl-pad,el.w+11,fmt(span+slack)+' loop',1)],
        formula:`footprint on the bag ${fmt(el.h)} = 2 \u00d7 ${fmt(pad)} stitched down + span ${fmt(span)}\n`+
                `plus ${fmt(slack)} of slack so the loop stands off about ${fmt(rise)} \u2014 that is what the pen sits in.\ncut length ${fmt(pl)}.`}));
    }
    if(T.piece==='beltloop'){
      const pad = loopPad('beltloop'), span = Math.max(10, el.w - 2*pad), slack = 4*t;
      const bl = el.w + slack;
      const d = [{t:'cut', d:rr(0,0,bl,el.h,2)}, {t:'fold', d:vLine(pad,0,el.h), label:'FOLD'}, {t:'fold', d:vLine(bl-pad,0,el.h), label:'FOLD'},
              {t:'text', x:bl/2, y:el.h*0.62, s:'BELT LOOP '+el.id, size:4.4, anchor:'middle', dim:true},
              {t:'text', x:bl/2, y:el.h+4.4, s:'THE SPAN BETWEEN THE STITCH LINES IS WHAT THE BELT PASSES THROUGH', size:3.2, anchor:'middle', mark:true}];
      attachOn(d, 0, 0, pad, el.h, key, T.name+' on the '+on, {axis:'x', far:'start', fix:el.fix, rivetSpec:rivetSpecAt(el)});
      attachOn(d, bl-pad, 0, pad, el.h, key, T.name+' on the '+on, {axis:'x', far:'end', fix:el.fix, rivetSpec:rivetSpecAt(el)});
      out.push(P({key, name:nm(), mat:'Leather', w:bl, h:el.h, qty:el.mirror?2:1, seam:2*bl, draw:d,
        dims:[D_('h',0,bl,-9,fmt(bl)), D_('v',0,el.h,-9,fmt(el.h)), D_('h',pad,bl-pad,el.h+11,fmt(span+slack)+' belt span',1)],
        formula:`footprint on the bag ${fmt(el.w)} = 2 \u00d7 ${fmt(pad)} stitched down + span ${fmt(span)}\n`+
                `plus 4 \u00d7 thickness ${fmt(slack)} so the belt has room to pass = ${fmt(bl)} cut length.\n`+
                `Both stitch boxes are drawn on the back panel as well \u2014 same hole count, so prick them together.`}));
    }
    if(T.piece==='haul'){
      const pad = loopPad('haul'), span = Math.max(10, el.w - 2*pad), rise = Math.max(10, el.h*0.7);
      const slack = loopSlack(span, rise), hl = el.w + slack;
      const dh = [{t:'cut', d:rr(0,0,hl,el.h,el.r)}, {t:'fold', d:vLine(pad,0,el.h), label:'FOLD'}, {t:'fold', d:vLine(hl-pad,0,el.h), label:'FOLD'},
        {t:'text', x:hl/2, y:el.h*0.62, s:'GRAB HANDLE '+el.id, size:4.4, anchor:'middle', dim:true},
        {t:'text', x:hl/2, y:el.h+4.4, s:fmt(slack)+' OF SLACK \u2014 IT ARCHES ABOUT '+fmt(rise)+' OFF THE PANEL', size:3.2, anchor:'middle', mark:true}];
      attachOn(dh, 0, 0, pad, el.h, key, T.name+' on the '+on, {axis:'x', far:'start', fix:el.fix, rivetSpec:rivetSpecAt(el)});
      attachOn(dh, hl-pad, 0, pad, el.h, key, T.name+' on the '+on, {axis:'x', far:'end', fix:el.fix, rivetSpec:rivetSpecAt(el)});
      out.push(P({key, name:nm(), mat:'Leather', w:hl, h:el.h, qty:el.mirror?2:1, seam:hl*2, draw:dh,
        dims:[D_('h',0,hl,-9,fmt(hl)), D_('v',0,el.h,-9,fmt(el.h)), D_('h',pad,hl-pad,el.h+11,fmt(span+slack)+' arch',1)],
        formula:`footprint on the bag ${fmt(el.w)} = 2 \u00d7 ${fmt(pad)} stitched down + span ${fmt(span)}\n`+
                `plus ${fmt(slack)} of slack so it arches about ${fmt(rise)} clear \u2014 that is the gap your fingers go into.\n`+
                `cut length ${fmt(hl)}. Both stitch boxes are drawn on the panel too, so prick them together.`}));
    }
    if(T.piece==='buckle'){
      const bt = 2*el.h + 14;
      const db = [{t:'cut', d:rr(0,0,bt,el.w,2)}, {t:'fold', d:vLine(bt/2,0,el.w), label:'FOLD \u00b7 BUCKLE BAR'},
        {t:'text', x:bt*0.18, y:el.w/2+2, s:'BUCKLE TAB '+el.id, size:4.2, anchor:'middle', dim:true}];
      attachOn(db, bt-el.h, 0, el.h, el.w, key, T.name+' on the '+on, {axis:'x', far:'end', fix:el.fix, rivetSpec:rivetSpecAt(el)});
      out.push(P({key, name:nm(), mat:'Leather', w:bt, h:el.w, qty:el.mirror?2:1, seam:bt*2, draw:db,
        dims:[D_('h',0,bt,-9,fmt(bt)), D_('v',0,el.w,-9,fmt(el.w))],
        formula:`2 \u00d7 tail ${fmt(el.h)} + 14 mm to wrap the buckle bar = ${fmt(bt)}`}));
    }
    if(T.piece==='bellows'){
      /* The blank carries the whole pleat FLAT: each side and the base get `dep` of leather
         with two fold lines, so the pocket lies flat empty and opens to `dep`. The stitch run
         is the finished face - three sections, matching the panel hole for hole - and the two
         corner squares where the pleats cross fold over themselves and are never pricked. */
      const dep = bellowsDep(el), hem = 12, m = Math.max(2.5, sa);
      // The blank is always drawn mouth UP, whichever way the mouth points on the bag - so a
      // pocket that opens to the side is as wide as it is tall on the panel, and vice versa.
      const side = el.open || 'top', turned = side==='left' || side==='right';
      const fw = turned ? el.h : el.w, fh = turned ? el.w : el.h;
      const pw = fw + 2*(dep + m), ph = hem + fh + dep + m;
      const fx = m + dep, fy = hem;                 // where the finished face sits on the blank
      const bx1 = pw - fx, by1 = fy + fh;           // the face's far edges
      const half = dep/2;
      const db = [{t:'cut', d:rr(0,0,pw,ph,0)},
        // two folds down each pleat: out to the half fold and back, which is the fold that
        // lets an empty bellows lie flat and still open
        {t:'fold', d:vLine(m+half, fy, by1), label:'FOLD 1'}, {t:'fold', d:vLine(fx, fy, by1), label:'FOLD 2'},
        {t:'fold', d:vLine(bx1+half, fy, by1), label:'FOLD 1'}, {t:'fold', d:vLine(bx1, fy, by1), label:'FOLD 2'},
        {t:'fold', d:hLine(fx, bx1, by1+half), label:'FOLD 1'}, {t:'fold', d:hLine(fx, bx1, by1), label:'FOLD 2'},
        {t:'fold', d:hLine(0, pw, hem), label:'MOUTH \u2014 FOLD THE HEM', band:[0,0,pw,hem]},
        // where the side pleat crosses the base pleat the leather doubles over itself: mitre
        // it, glue it, and put no holes in it
        {t:'fold', d:`M ${nn(m)} ${nn(ph-m)} L ${nn(fx)} ${nn(by1)}`, band:[m, by1, dep, dep], label:'MITRE'},
        {t:'fold', d:`M ${nn(pw-m)} ${nn(ph-m)} L ${nn(bx1)} ${nn(by1)}`, band:[bx1, by1, dep, dep]},
        {t:'ctr', d:vLine(pw/2,0,ph)},
        {t:'text', x:pw/2, y:fy+fh*0.5, s:'BELLOWS POCKET '+el.id, size:5, anchor:'middle', dim:true},
        {t:'text', x:pw/2, y:fy+fh*0.5+6, s:'FINISHED FACE '+fmt(fw)+' \u00d7 '+fmt(fh)+(turned?' \u2014 MOUTH TO THE '+side.toUpperCase()+' ON THE BAG':''), size:3.4, anchor:'middle', mark:true},
        {t:'text', x:pw/2, y:fy+fh*0.5+11.4, s:'EACH PLEAT FOLDS TWICE \u2014 OUT ON FOLD 1, BACK ON FOLD 2 \u2014 AND OPENS '+fmt(dep)+' DEEP', size:3.2, anchor:'middle', mark:true},
        {t:'text', x:m+half, y:by1+half+1.2, s:'NO HOLES', size:2.8, anchor:'middle', mark:true},
        {t:'text', x:bx1+half, y:by1+half+1.2, s:'NO HOLES', size:2.8, anchor:'middle', mark:true}];
      attachOn(db, fx, fy, fw, fh, key, T.name+' on the '+on,
               {fix:el.fix, rivetSpec:rivetSpecAt(el), r:0, open:'top', label:'',
                run:(qx, qy, qw, qh)=>bellowsSegs(qx, qy, qw, qh, dep, 'top')});
      out.push(P({key, name:nm(), mat:'Leather', w:pw, h:ph, draw:db, seam:2*fh+fw,
        dims:[D_('h',0,pw,-9,fmt(pw)), D_('v',0,ph,-9,fmt(ph)),
              D_('h',fx,bx1,ph+11,fmt(fw)+' finished face',1),
              D_('h',m,fx,ph+21,fmt(dep)+' pleat',2)],
        formula:`finished face ${fmt(fw)} \u00d7 ${fmt(fh)}, standing ${fmt(dep)} off the panel.\n`+
                `Each pleat is ${fmt(dep)} of leather folded back on itself \u2014 two fold lines, one at ${fmt(half)} and one at the face \u2014 so the blank is\n`+
                `${fmt(fw)} + 2 \u00d7 ${fmt(dep)} + 2 \u00d7 ${fmt(m)} = ${fmt(pw)} wide and ${fmt(hem)} hem + ${fmt(fh)} + ${fmt(dep)} + ${fmt(m)} = ${fmt(ph)} tall.\n`+
                `Prick the two sides and the base only: the ${fmt(dep)} \u00d7 ${fmt(dep)} square at each bottom corner is where the two pleats cross, so it is mitred and glued, not stitched.`}));
    }
    if(T.piece==='cards'){
      const G = cardsGeom(el), on2 = FACENAME[el.face].toLowerCase();
      const nm2 = G.pockets ? 'Card pocket' : 'Card slot';
      /* The side row goes down the whole stack in one pass, so it is planned off the stack and
         every piece takes the holes of it that land on its own leather. That is the one place
         a count deliberately varies, and it is why all of them line up when you lay them up. */
      const grid = SEAMPLAN['el'+el.id+'side'] || planSeam('el'+el.id+'side', nm2 + ', each side', G.stackH - 2*G.sa, false);
      for(let k=0;k<G.n;k++){
        const ph2 = G.pieceH(k), shows = CARD_H - G.depth(k);
        const d = [{t:'cut', d:rr(0, 0, G.w, ph2, 0)},
          {t:'ctr', d:vLine(G.w/2, 0, ph2)}, {t:'notch', x:G.w/2, y:ph2, dir:'up'},
          {t:'text', x:G.w/2, y:ph2*0.5, s:(nm2 + ' ' + (k+1) + ' OF ' + G.n).toUpperCase(),
           size:5, anchor:'middle', dim:true},
          {t:'text', x:G.w/2, y:ph2*0.5 + 5.4, s:'MOUTH ALONG THE TOP \u00b7 IT COVERS '
             + fmt(G.depth(k)) + ' OF THE CARD, SO ' + fmt(shows) + ' SHOWS', size:3.2,
           anchor:'middle', mark:true}];
        if(G.pockets){
          // the bottom line is the pocket: same run on the piece and on the lining
          d.push(SEAM('el'+el.id+'p', nm2 + ', pocket bottoms',
            [['L', G.sa, ph2 - G.sa, G.w - G.sa, ph2 - G.sa]], {even:true, trim:G.sa, ins:G.sa}));
          d.push({t:'text', x:G.w/2, y:ph2 - G.sa - 2, s:'STITCH THIS LINE TO THE LINING FIRST',
                  size:3.2, anchor:'middle', mark:true});
          d.push({t:'text', x:G.w/2, y:ph2 + 4.4,
                  s:'THE SIDES GO THROUGH THE WHOLE STACK AT THE END \u2014 MARK THEM FROM THE LINING',
                  size:3.2, anchor:'middle', mark:true});
          [G.sa, G.w - G.sa].forEach(x2 => d.push({t:'mark', d:vLine(x2, G.sa, ph2 - G.sa)}));
        } else {
          const ni = Math.max(1, Math.floor((ph2 - 2*G.sa)/grid.pitch));
          [G.sa, G.w - G.sa].forEach(x2 => d.push(SEAM('el'+el.id+'side', nm2 + ', each side',
            [['L', x2, ph2 - G.sa, x2, ph2 - G.sa - ni*grid.pitch]],
            {planLen:G.stackH - 2*G.sa, n:ni, ins:G.sa})));
          d.push({t:'text', x:G.w/2, y:ph2 - 1.6, s:'ALIGN THIS EDGE WITH THE BOTTOM OF THE STACK',
                  size:3.2, anchor:'middle', mark:true});
        }
        out.push(P({key:key + 'c' + k, name:`${nm2} ${k+1} of ${G.n} \u00b7 ${T.name} ${el.id}`,
          mat:'Leather', w:G.w, h:ph2, seam:2*ph2 + G.w, draw:d,
          dims:[D_('h',0,G.w,-9,fmt(G.w)), D_('v',0,ph2,-9,fmt(ph2))],
          formula: G.pockets
            ? `An all-leather pocket: every slot is the same piece, and the cascade comes from WHERE it is stitched.\n`+
              `width = slot ${fmt(G.slotW)} + 2 \u00d7 SA ${fmt(G.sa)} = ${fmt(G.w)} \u2014 a card is ${fmt(CARD_W)} across\n`+
              `height = card tuck ${fmt(G.tuck)} + SA ${fmt(G.sa)} = ${fmt(ph2)}\n`+
              `Its bottom line goes on the lining ${fmt(G.bottom[k])} down from the top of the stack. Stitch that line, then lay the next one on; the two sides go through everything in one run at the end.`
            : `A faced slot: the pockets are the gaps between the layers, and the lining is the back of the deepest one.\n`+
              `width = slot ${fmt(G.slotW)} + 2 \u00d7 SA ${fmt(G.sa)} = ${fmt(G.w)}\n`+
              `height = deepest ${fmt(G.tuck)} \u2212 ${k} \u00d7 reveal ${fmt(G.rev)} + SA ${fmt(G.sa)} = ${fmt(ph2)}\n`+
              `All ${G.n} share one bottom edge, so every side hole falls on the same ${fmtPitch(grid.pitch)} grid: ${ni2(ph2, grid, G)} holes on this one.`}));
      }
    }
    if(T.piece==='pad'){
      out.push(P({key, name:nm(), mat:'Leather', w:el.w, h:el.h, qty:el.mirror?2:1, seam:0,
        draw:[{t:'cut', d:rr(0,0,el.w,el.h,el.r)},
              {t:'text', x:el.w/2, y:el.h/2+2, s:'REINFORCE', size:4.2, anchor:'middle', dim:true}],
        dims:[D_('h',0,el.w,-9,fmt(el.w)), D_('v',0,el.h,-9,fmt(el.h))],
        formula:`Skive the edges to nothing and glue it behind the fitting \u2014 it is not stitched separately.`}));
    }
  });
  return out;
}

/* ---------- zips ----------
   Chain gauge is the number that matters at the bench: it fixes the tape width, which
   fixes how far in from the edge the stitch line has to go, and how big the end tabs are. */
const ZIP_GAUGE = {3:{teeth:3.0, tape:25, label:'#3'}, 5:{teeth:5.0, tape:30, label:'#5'}, 8:{teeth:8.0, tape:38, label:'#8'}};
function zipG(){ return ZIP_GAUGE[Math.round(S.zip.gauge)] || ZIP_GAUGE[5]; }
/** How far in from the cut edge the tape is stitched: clear of the chain, never less than SA. */
function zipInset(){ return S.zip.style==='panel' ? S.sa : Math.max(S.sa, 3 + zipG().teeth); }
/** How far the zip carries down each gusset end. Only a gusset bag has ends to carry it down;
    a boxed body already opens across its whole flattened rim. */
function zipWrap(){
  return (S.top==='zip' && S.zip.style==='wrap' && S.construction==='gusset')
       ? Math.max(0, Math.min(S.zip.wrap, S.H*0.6, S.D*0.9)) : 0;
}
/** The whole mouth the zip has to cover, measured along the chain. A bucket's mouth is a
    closed ring and mouthSpan() is only HALF of it - one panel's rim - so a chain quoted off
    that is half the length you would have to buy. */
function zipSpan(){
  return S.construction==='bucket' ? 2*mouthSpan() : mouthSpan() + 2*zipWrap();
}
/** Closed length to cut: the tape runs into the side seams, the chain stops short of them
    so the tabs and the stops are not buried in a seam. */
const ZIP_TAB_COVER = 12;
function zipCut(){ return Math.max(60, zipSpan() - 2*ZIP_TAB_COVER); }
/** The zip's stitch line on a rim, with the chain, the stops and the slider.
    dir is +1 when the leather lies below the rim on the drawing. */
/* `hem` is the leather between the cut edge and rimY - the turn allowance on a rim, the seam
   allowance on a barrel's top seam. It is not geometry, it is what the tape row prints as its
   distance from the edge of the blank, which is the number you can check with a rule. */
function zipOnRim(d, x0, x1, rimY, dir, sa, live, hem){
  const G = zipG(), inset = zipInset(), zy = rimY + dir*inset;
  const panel = S.zip.style==='panel';
  const key = panel ? 'ziprim' : 'ziptape';
  const name = panel ? 'Zip panel to rim' : 'Zip tape to rim';
  // the tape is stitched the WHOLE width and its ends are caught in the side seams - a run
  // that stops short of the corners is what leaves a zip looking stuck on
  const run = [['L', x0, zy, x1, zy]];
  d.push(live ? SEAM(key, name, run, {even:true, trim:sa, ins:inset + (hem || 0)})
              : {t:'stitch', d:segsPath(trimRun(run, sa))});
  if(!panel){
    // the chain itself, drawn at its real gauge so you can see what is going in there
    d.push({t:'mark', d:hLine(x0, x1, rimY + dir*G.teeth*0.5)});
    [x0 + ZIP_TAB_COVER, x1 - ZIP_TAB_COVER].forEach(x=>{
      d.push({t:'notch', x, y:rimY, dir:dir>0?'down':'up'});
      d.push({t:'mark', d:vLine(x, rimY, rimY + dir*(inset + 2))});
    });
    d.push({t:'text', x:(x0+x1)/2, y:zy + dir*6.5,
      s:G.label + ' CHAIN \u00b7 TAPE ' + fmt(inset) + ' IN, RIGHT INTO BOTH SIDE SEAMS',
      size:3.6, anchor:'middle', mark:true, rot:dir>0?0:180});
  } else {
    d.push({t:'text', x:(x0+x1)/2, y:zy + dir*6.5, s:'ZIP PANEL SEAM',
      size:3.8, anchor:'middle', mark:true, rot:dir>0?0:180});
  }
}
/** The zip carried down a gusset end: the top of the strip is slit and a tape goes each side. */
function zipOnGussetEnd(d, a, b, cy, hwFn, sa, SL){
  const G = zipG(), ins = zipInset();
  const lo = Math.min(a,b), hi = Math.max(a,b);
  d.push({t:'cutline', d:hLine(lo, hi, cy)});
  d.push({t:'notch', x:hi, y:cy, dir:'down'});
  [-1, 1].forEach(sgn=>
    d.push(SL('zipwrap','Zip tape down the gusset ends', [['L', lo, cy + sgn*ins, hi, cy + sgn*ins]], {trim:sa})));
  d.push({t:'text', x:(lo+hi)/2, y:cy - ins - 2, s:'SLIT \u2014 THE ZIP RUNS DOWN HERE', size:3.4, anchor:'middle', mark:true});
}

/** The rim is stitched whenever there is something to hold there: a turned edge to
    secure, or a lining to catch. A raw unlined rim is only burnished. */
/* ---------- top handles ----------
   A handle is not a short strap. How it is made decides how wide the blank is, where the
   stitching goes, and - the part that catches people out - how wide the tail is where it
   lands on the bag. A rolled handle's tail is the strip squashed flat, which is a good deal
   wider than the handle you are holding. */
const HANDLE_BUILDS = {
  single:  'One layer, cut flat',
  layered: 'Two layers glued back to back',
  folded:  'Four-fold, edges turned in',
  rolled:  'Rolled round a cord'
};
/** The width of the blank you cut, before anything is folded or rolled. */
function handleBlankW(){
  const Hd = S.handles, w = Math.max(8, Hd.width), t = S.thickness;
  if(Hd.build === 'folded') return 4*w + 2*t;
  if(Hd.build === 'rolled') return Math.PI*(Math.max(3, Hd.core) + t) + 2*HANDLE_LAP;
  return w;
}
/** The width of the tail where it actually lands on the bag. */
function handleTailW(){
  const Hd = S.handles;
  return Hd.build === 'rolled' ? handleBlankW()/2 : Math.max(8, Hd.width);
}
const HANDLE_LAP = 9;
/** What lands on the panel where a handle is held, which depends on how it is held. */
function handleFoot(){
  const Hd = S.handles, ends = Hd.ends || 'plain', tw = handleTailW();
  if(ends === 'tab')  return {w:tw + 8, h:Math.max(22, Hd.attach*0.7),
                              key:'handletab', name:'Handle tab to panel', label:'HANDLE TAB', xbox:false};
  if(ends === 'ring') return {w:Math.min(tw + 4, 46), h:Math.max(20, Hd.attach*0.6),
                              key:'handlering', name:'Handle ring tab to panel', label:'RING TAB', xbox:false};
  return {w:tw, h:Hd.attach, key:'handlebox', name:'Handle end to panel', label:'HANDLE', xbox:true};
}
function rimIsStitched(){ return S.top !== 'zip' && (S.edge === 'turned' || S.lined); }
/** A cord channel's upper row runs exactly where the rim row does and does the same job of
    holding the hem down. Drawing both put two rows of holes on the same line at two
    different pitches, which is a panel you cannot prick. The channel wins; it is the one
    that also has to line up with its own lower row. */
function rimRowOn(){ return rimIsStitched() && !(drawOn() && S.draw.style === 'channel'); }
/* ---------- round base ----------
   The base is an ellipse and the body is a strip long enough to wrap round it. Both edges
   have to be the SAME length or the body will not meet the base, so the perimeter is taken
   off the drawn polyline rather than a formula - the drawing is what gets stitched. */
const BASE_N = 72;
/** How square the round panel is. 0 is a true ellipse; wind it up and the sides and the base
    flatten out, which is the difference between a barrel and a duffle that will stand up. */
function baseExp(top){
  // Only a barrel's end panel has a top and a bottom. A bucket's base is a plan view: give
  // its two halves different shapes and they stop being the same length as the body halves.
  const arch = top && S.construction === 'barrel';
  const v = arch ? (S.squarenessTop != null ? S.squarenessTop : S.squareness) : S.squareness;
  return 2 + Math.max(0, Math.min(100, v || 0))/100 * 4.5;
}
/** The round panel, walked once. Top and bottom carry their own squareness, so a duffle can
    have a flat base and an arched top - which is the shape a duffle actually is. */
function basePts(a, b){
  const p = [], nB = baseExp(false), nT = baseExp(true);
  const f = (c, e) => Math.sign(c) * Math.pow(Math.abs(c), 2/e);
  for(let i=0;i<BASE_N;i++){
    const th = i*2*Math.PI/BASE_N, sy = Math.sin(th);
    const n = sy < 0 ? nT : nB;                    // y grows downward, so sin < 0 is the top
    p.push([a*f(Math.cos(th), n), b*f(sy, n)]);
  }
  return p;
}
function baseRun(cx, cy, a, b, from, to){
  const p = basePts(a, b).map(q=>[cx+q[0], cy+q[1]]);
  const seg = [];
  for(let i=from;i<to;i++) seg.push(['L', p[i%BASE_N][0], p[i%BASE_N][1], p[(i+1)%BASE_N][0], p[(i+1)%BASE_N][1]]);
  return seg;
}
function basePerim(a, b){ return runLen(baseRun(0,0,a,b,0,BASE_N)); }
function drawOn(){ return S.top === 'draw' && S.construction !== 'free'; }
/** The mouth all the way round: what the cord has to travel and the eyelets divide up. */
function drawMouth(){
  return S.construction==='bucket' ? basePerim(S.W/2, Math.max(12,S.D/2)) : 2*(S.W + S.D);
}
/** The rim run a channel strip is stitched to, per panel: they are not all the same length. */
function drawChanSpan(){
  return mouthSpan();
}
/** Eyelets round the mouth, or the channel the cord runs in. `share` is this panel's slice
    of the whole mouth, so the eyelets come out evenly spaced right round the bag. */
function drawOnRim(d, dm, x0, x1, rimY, dir, isFront, sa, share){
  if(!drawOn()) return;
  const K = S.draw, y = rimY + dir*Math.max(K.drop, sa + K.size);
  if(K.style === 'channel'){
    d.push(SEAM('drawchan','Cord channel to the panel', [['L', x0, y, x1, y]], {even:true, trim:sa}));
    d.push(SEAM('drawchan','Cord channel to the panel', [['L', x0, rimY + dir*Math.max(3,sa), x1, rimY + dir*Math.max(3,sa)]], {even:true, trim:sa}));
    d.push({t:'text', x:(x0+x1)/2, y:y + dir*5, s:'CORD CHANNEL SITS BETWEEN THESE TWO ROWS', size:3.6, anchor:'middle', mark:true, rot:dir>0?0:180});
    d.push({t:'text', x:(x0+x1)/2, y:rimY + dir*(Math.max(3,sa) + 4.6), s:'THE UPPER ROW IS THE RIM ROW \u2014 IT HOLDS THE HEM TOO', size:3.2, anchor:'middle', mark:true, rot:dir>0?0:180});
    if(isFront){
      [x0 + (x1-x0)*0.42, x0 + (x1-x0)*0.58].forEach(x=>{
        d.push({t:'cutline', d:vLine(x, y - dir*2, rimY + dir*Math.max(3,sa) + dir*2)});
        d.push({t:'notch', x, y:y, dir:dir>0?'up':'down'});
      });
      d.push({t:'text', x:(x0+x1)/2, y:y + dir*9.5, s:'TWO SLOTS - THE CORD ENDS COME OUT HERE', size:3.4, anchor:'middle', mark:true, rot:dir>0?0:180});
    }
    return;
  }
  // eyelets, in pairs, evenly round the whole mouth
  const n = Math.max(2, Math.round((share || 0.5) * Math.max(4, Math.round(S.draw.n))));
  const span = x1 - x0, step = span/n;
  for(let i=0;i<n;i++){
    const x = x0 + step*(i + 0.5);
    d.push({t:'hole', x, y, r:K.size/2, label:i===0?'EYELET':''});
  }
  dm.push(D_('v', dir>0?rimY:y, dir>0?y:rimY, x0 + step*0.5, fmt(Math.max(K.drop, sa + K.size)), 2));
  d.push({t:'text', x:(x0+x1)/2, y:y + dir*(K.size*0.5 + 8), s:n + ' EYELETS AT ' + fmt(step) + ' CENTRES', size:3.6, anchor:'middle', mark:true, rot:dir>0?0:180});
}
/* ---------- card slots ----------
   A card is 85.6 x 54, and the slots are stacked on ONE common bottom edge, which is what
   lets every side hole fall on the same grid. That construction has a limit nobody tells you
   about: what decides whether you can get the BACK card out is how deep the deepest slot is.
   Cover more than about 44 mm of a 54 mm card and there is nothing left to take hold of, and
   the drafter used to grow the stack by one reveal per slot - so at three slots the back card
   was buried 70 mm deep and could not be got at at all.

   So `cards.h` is the depth of the DEEPEST slot and every slot in front of it is one `reveal`
   shallower. Three numbers, all of them things you can measure on a wallet you own. */
const CARD_W = 85.6, CARD_H = 54;
function cardSlotN(){ return Math.max(1, Math.round(S.cards.n || 1)); }
/** Finished width of a slot, before seam allowance. */
function cardSlotW(){ return Math.max(40, S.cards.w || (CARD_W + 3)); }
/** Finished depth of slot i above the common bottom stitch line. 1 is the front, n the back. */
function cardSlotH(i){
  return Math.max(6, (S.cards.h || 40) - (S.cards.reveal || 11)*(cardSlotN() - i));
}
/** The deepest slot: the one that decides whether the back card can be got at. */
function cardStackH(){ return cardSlotH(cardSlotN()); }
/** Counting ticks: every Nth hole out from the centre of a run gets a longer mark and a
    number, so two pieces that share a seam can be held together and checked at a glance.
    0 turns them off. */
function regEvery(){ const n = Math.round(S.stitch.reg || 0); return n >= 5 ? n : 0; }
function rimNote(){
  if(S.top === 'roll') return S.roll.stiffener ? 'MOUTH \u2014 STIFFENER GOES IN HERE' : 'MOUTH \u2014 TURN AND STITCH';
  return S.edge === 'turned' ? 'RIM \u2014 TURN AND STITCH' : 'RIM \u2014 CATCHES THE LINING';
}

/* ---------- roll top ----------
   A roll top is not a lid: the whole tube simply carries on above the finished rim,
   and you fold that extra length down on itself. So every panel AND the gusset grow
   by the same amount, the side seams run the full height, and the gusset stops
   tapering at the rim - a tapered mouth cannot be folded flat. */
function rollOn(){ return S.top === 'roll' && S.construction !== 'free'; }
/** How far the mouth stands above the finished rim: one fold depth per turn. */
function rollExt(){ return rollOn() ? Math.max(1, Math.round(S.roll.turns)) * Math.max(20, S.roll.turn) : 0; }
/** Where the closure hardware lands on the side of the body, measured down from the rim. */
function rollAnchorY(){ return Math.max(10, Math.min(S.roll.anchorY, S.H - 20)); }
/** How fat the rolled bundle ends up. The pattern and the model both work off this, so the
    over-strap is long enough for the roll the drawing actually shows. */
function rollBundleR(){
  return Math.max(7, Math.min(Math.max(20, S.roll.turn)*0.45, Math.max(6,S.D)*0.48, S.H*0.14));
}
/** How wide the mouth measures when it is pressed flat: a boxed body opens across W + D,
    the others across W with the gusset ends folding in on their own. */
function mouthSpan(){
  return S.construction==='boxed' ? S.W + S.D
       : S.construction==='bucket' ? basePerim(S.W/2, Math.max(12,S.D/2))/2
       : S.construction==='free' ? freeProfile(S.W, S.H).mouthLen
       : S.W - 2*topR();
}
/** The straight line across the mouth - what a flap has to span, and what a zip would rather
    be. On every other construction it is the mouth itself. */
function mouthChord(){
  return S.construction==='free' ? freeProfile(S.W, S.H).chord : mouthSpan();
}
/* The mouth tab is caught in the mouth hem at each end of the front, and drops to an
   anchor on the side of the bag. Both halves are drawn on the bag AND on their own piece. */
const ROLL_TAB_W = 25, ROLL_TAB_IN = 22, ROLL_ANCHOR_L = 26, ROLL_STRAP_W = 28;
function rollAnchorW(){ return Math.max(14, Math.min(24, ROLL_TAB_W - 2)); }
/** The closure marks on a body panel: the mouth tabs, and - on a bag with no separate
    gusset - the side anchors too, since there is nowhere else for them to go. */
function rollClosureOn(d, dm, cx, mouthY, rimY, x0, x1, dir, face, sa){
  if(!rollOn() || S.roll.closure === 'none') return;
  if(S.roll.closure === 'strap'){
    // one strap over the rolled mouth: anchored on the back, buckled on the front
    const w2 = ROLL_STRAP_W, ay = rollAnchorY();
    const y = dir>0 ? rimY + ay : rimY - ay - ROLL_ANCHOR_L;
    attachOn(d, cx - w2/2, y, w2, ROLL_ANCHOR_L, face==='back' ? 'rollstrapanc' : 'rollbuckle',
             face==='back' ? 'Over-strap anchor to the back' : 'Over-strap buckle tab to the front',
             {axis:'y', far: dir>0 ? 'end' : 'start', fix:'stitchbox',
              label: face==='back' ? 'OVER-STRAP' : 'BUCKLE', rot:dir>0?0:180});
    dm.push(D_('v', dir>0?rimY:y, dir>0?y:rimY, cx + w2, fmt(ay), 2));
    return;
  }
  if(face !== 'front') return;
  const tw = ROLL_TAB_W, ti = ROLL_TAB_IN;
  // clear of the rim row: the tab goes INTO the hem, not across the row that closes it
  const lift = rimRowOn() ? Math.max(3, S.sa) + 3 : 0;
  [x0 + 5, x1 - 5 - tw].forEach((tx,i)=>{
    const ty = dir>0 ? mouthY + lift : mouthY - ti - lift;
    attachOn(d, tx, ty, tw, ti, 'rolltab', 'Roll-top tab into the mouth hem',
             {axis:'y', far: dir>0 ? 'start' : 'end', fix:'stitchbox',
              label:i===0?'ROLL TAB':'', rot:dir>0?0:180});
  });
  if(S.construction !== 'gusset'){
    const aw = rollAnchorW(), al = ROLL_ANCHOR_L, ay = rollAnchorY();
    [x0 + 6, x1 - 6 - aw].forEach((ax,i)=>{
      const y = dir>0 ? rimY + ay : rimY - ay - al;
      attachOn(d, ax, y, aw, al, 'rollanchor', 'Roll-top anchor to the body',
               {axis:'y', far: dir>0 ? 'end' : 'start', fix:'stitchbox',
                label:i===0?'ANCHOR':'', rot:dir>0?0:180});
    });
    dm.push(D_('v', dir>0?rimY:rimY-ay, dir>0?rimY+ay:rimY, x0 + 6 + rollAnchorW()/2, fmt(ay), 2));
  }
}
/** The same anchor, on a gusset strip lying on its side. */
function rollClosureOnGusset(d, dm, cy, gRim, L, halfOnly, gw, sa){
  if(!rollOn() || S.roll.closure === 'none' || S.roll.closure === 'strap') return;
  const aw = Math.min(rollAnchorW(), gw - 2*sa - 2), al = ROLL_ANCHOR_L, ay = rollAnchorY();
  if(aw < 6) return;
  const spots = halfOnly ? [{x:gRim + ay, far:'end'}]
                         : [{x:gRim + ay, far:'end'}, {x:L - gRim - ay - al, far:'start'}];
  spots.forEach((e,i)=>{
    if(e.x < 0 || e.x + al > L) return;
    attachOn(d, e.x, cy - aw/2, al, aw, 'rollanchor', 'Roll-top anchor to the body',
             {axis:'x', far:e.far, fix:'stitchbox', label:i===0?'ANCHOR':''});
  });
  dm.push(D_('h', gRim, gRim + ay, cy + gw/2 + 5, fmt(ay), 2));
}
/** Roll fold lines and the mouth row, drawn on a panel whose mouth is at y=mouthY and
    whose finished rim is rimY below it. dir is +1 when the roll section lies above. */
function rollMarks(d, x0, x1, mouthY, rimY, dir, sa, live, SL){
  const ext = rimY - mouthY, turns = Math.max(1, Math.round(S.roll.turns));
  if(ext <= 0) return;
  const cx = (x0+x1)/2;
  for(let i=1;i<turns;i++){
    const y = mouthY + dir*(ext*i/turns);
    d.push({t:'mark', d:hLine(x0, x1, y)});
  }
  d.push({t:'text', x:cx, y:mouthY + dir*(ext*0.5) + dir*2, size:5, anchor:'middle', mark:true,
          rot:dir>0?0:180, s:'ROLL SECTION \u2014 ' + turns + ' TURNS OF ' + fmt(ext/turns)});
  if(S.roll.stiffener){
    const sy = mouthY + dir*(Math.max(3,sa) + S.roll.turn*0.28);
    d.push(SL('rollstiff','Mouth stiffener, front and back', [['L', x0, sy, x1, sy]], {even:true, trim:sa}));
    d.push({t:'text', x:x0+3, y:sy + dir*4.6, s:'STIFFENER \u2014 SECOND ROW', size:3.6, anchor:'start', mark:true, rot:dir>0?0:180});
  }
}

function bodyPanels(g){
  const {W,H,D,mat,tag,deco,sa,rim,t} = g;
  const out = [];
  /* Which shell carries the stitch plan. Normally that is the leather one and the lining is a
     smaller bag dropped inside it, so the two never share a seam. A WALLET is not built that
     way: it is a flat lamination, the two layers are cut the same and stitched to each other
     right round the perimeter, so the lining carries real seams and shares every key. */
  const live = g.live != null ? g.live : !tag;
  const carrier = !!g.interior;   // this shell holds the interior fittings                     // only the leather shell carries the stitch plan
  /* Every shell run drawn through SL follows a cut edge at the seam allowance - that IS what
     seam allowance means here - so it says so on the pattern unless the call says otherwise.
     A footprint (a pocket outline on a panel, the line the flap is stitched along) has no cut
     edge to measure from and passes ins:null rather than printing a number she cannot find. */
  const SL = (key,name,segs,opt) => live ? SEAM(key,name,segs,Object.assign({ins:sa}, opt))
                                        : {t:'stitch', d:segsPath((opt&&opt.trim)?trimRun(segs,opt.trim):segs)};

  if(S.construction==='gusset'){
    const flatBase = S.gussetStyle==='base';
    const r  = Math.min(flatBase ? 0 : S.corner, Math.min(W,H)/2);
    const rext = rollExt(), rT = topR();
    const pw = W + 2*sa, ph = rim + rext + H + sa;
    // y0 is the mouth: with a roll top the side seam runs the whole way up to it
    const x0 = sa, y0 = rim, yRim = rim + rext, x1 = sa + W, y1 = yRim + H;
    const mx0 = x0 + rT, mx1 = x1 - rT;          // the straight part of the mouth

    ['Front','Back'].forEach(which=>{
      const d=[], dm=[];
      d.push({t:'cut', d:rrE(0,0,pw,ph,{tl:rT?rT+sa:0, tr:rT?rT+sa:0, br:r+sa, bl:r+sa})});
      if(flatBase){
        d.push(SL('side','Panel to side gusset', [['L',x0,y0,x0,y1]], {trim:sa}));
        d.push(SL('bottom','Panel to base',      [['L',x0,y1,x1,y1]], {even:true, trim:sa}));
        d.push(SL('side','Panel to side gusset', [['L',x1,y1,x1,y0]], {trim:sa}));
      } else {
        d.push(SL('body','Panel to gusset', bodyRunTop(x0,y0,x1,y1,r,rT,sa), {even:true, trim:sa}));
      }
      if(rim>0) d.push({t:'fold', d:hLine(0,pw,rim), label:'TURN '+fmt(rim,{unit:false}), band:[0,0,pw,rim]});
      if(rimRowOn()){
        d.push(SL('rim', 'Rim, front and back', [['L', mx0, rim+Math.max(3,sa), mx1, rim+Math.max(3,sa)]], {even:true, trim:sa, ins:rim+Math.max(3,sa)}));
        d.push({t:'text', x:mx0+3, y:rim+Math.max(3,sa)-1.6, s:rimNote(), size:3.6, anchor:'start', mark:true});
      }
      if(S.top==='zip') zipOnRim(d, mx0, mx1, rim, 1, sa, live, rim);
      if(rext>0){
        rollMarks(d, x0, x1, rim, yRim, 1, sa, live, SL);
        d.push({t:'fold', d:hLine(0,pw,yRim), label:'RIM \u2014 THE BAG ENDS HERE'});
        d.push({t:'notch', x:0, y:yRim, dir:'right'});
        d.push({t:'notch', x:pw, y:yRim, dir:'left'});
        dm.push(D_('v', rim, yRim, sa+7, fmt(rext)+' roll', 1));
      }
      d.push({t:'ctr', d:vLine(pw/2,0,ph)});
      d.push({t:'notch', x:pw/2, y:ph, dir:'up'});
      d.push({t:'grain', x:pw-11, y:ph/2, len:Math.min(70,ph*0.5), dir:'v'});
      d.push({t:'text', x:sa+7, y:y1-7, s:tag?which.toUpperCase()+' \u00b7 '+tag.toUpperCase():which.toUpperCase(), size:7, anchor:'start', dim:true});

      if(deco && which==='Front'){
        if(S.pocket.on){
          const px = sa + W/2 + S.pocket.x - S.pocket.w/2, py = y1 - S.pocket.y - S.pocket.h;
          d.push({t:'mark', d:rr(px,py,S.pocket.w,S.pocket.h,S.pocket.radius)});
          d.push(SL('pocket','Front pocket to panel', openRectRun(px,py,px+S.pocket.w,py+S.pocket.h,S.pocket.radius), {even:true, trim:sa, ins:null}));
          d.push({t:'text', x:px+S.pocket.w/2, y:py+S.pocket.h/2+2, s:'POCKET', size:5, anchor:'middle', mark:true});
          dm.push(D_('v', py+S.pocket.h, y1, px+S.pocket.w/2, fmt(S.pocket.y), 1));
        }
        if(S.top==='flap' && S.flap.closure!=='none'){
          const down = S.flap.drop + pullDrop() - S.flap.cInset;
          const cy = rim + down;
          closureXs(pw/2, W).forEach((cq,i)=>
            d.push({t:'hole', x:cq, y:cy, r:3, label:i===0?CLOSURE_LABEL():''}));
          dm.push(D_('v', rim, cy, sa+8, fmt(down), 2));
        }
        if(S.top==='magnet') d.push({t:'hole', x:pw/2, y:rim+18, r:3, label:'MAGNET'});
      }
      if(carrier) interiorOn(d, dm, pw/2, yRim, 1, sa, which.toLowerCase());
      if(deco) placeElements(d, dm, {face:which.toLowerCase(), cx:pw/2, rimY:yRim, dir:1, sa});
      if(carrier && which==='Back') placeElements(d, dm, {face:'inside', cx:pw/2, rimY:yRim, dir:1, sa});
      if(deco && rext>0) rollClosureOn(d, dm, pw/2, rim, yRim, x0, x1, 1, which.toLowerCase(), sa);
      if(deco && drawOn()) drawOnRim(d, dm, mx0, mx1, yRim, 1, which==='Front', sa, W/(2*W + 2*D));
      if(deco && S.strap.type==='pack' && which==='Back'){
        const Kp = S.strap, s2 = Math.min(Kp.packSpan/2, W/2 - Kp.width);
        [[-1, yRim + Kp.anchorY, s2],[1, yRim + Kp.anchorY, s2],
         [-1, y1 - Kp.tabLen - 8, s2*0.55],[1, y1 - Kp.tabLen - 8, s2*0.55]].forEach((a,i)=>{
          attachOn(d, pw/2 + a[0]*a[2] - Kp.width/2, a[1], Kp.width, Kp.tabLen, 'packanchor', 'Pack strap to back panel',
                   {axis:'y', far:i<2?'end':'start', fix:S.strap.tabFix, rivetSpec:strapRivetSpec(),
                    label:i===0?'STRAP':'', xbox:S.strap.tabFix==='stitch'});
        });
        dm.push(D_('h', pw/2 - s2, pw/2 + s2, yRim + Kp.anchorY - 5, fmt(s2*2), 1));
      }
      if(deco && S.strap.type==='handles'){
        const Hd = S.handles, hf = handleFoot();
        [pw/2 - Hd.span/2 - hf.w/2, pw/2 + Hd.span/2 - hf.w/2].forEach((hx,i)=>{
          attachOn(d, hx, yRim + Hd.anchorY, hf.w, hf.h, hf.key, hf.name,
                   {axis:'y', label:i===0?hf.label:'', fix:Hd.fix, rivetSpec:rivetSpecAt(Hd),
                    tipShape:S.strap.tip, through:hf.key==='handlering', xbox:hf.xbox && Hd.fix==='stitch'});
        });
        dm.push(D_('h', pw/2 - Hd.span/2, pw/2 + Hd.span/2, yRim + Hd.anchorY - 5, fmt(Hd.span), 1));
      }
      if(deco && which==='Back'){
        if(S.top==='flap' && S.flap.attach>0){
          d.push(SL('flapattach','Flap to back panel', [['L',x0,rim+S.flap.attach,x1,rim+S.flap.attach]], {even:true, trim:sa, ins:null}));
          d.push({t:'text', x:x0+3, y:rim+S.flap.attach-1.6, s:'FLAP STITCHES HERE', size:3.8, anchor:'start', mark:true});
          dm.push(D_('v', rim, rim+S.flap.attach, sa+8, fmt(S.flap.attach), 1));
        }
        if(S.top==='magnet') d.push({t:'hole', x:pw/2, y:yRim+18, r:3, label:'MAGNET'});
      }
      dm.push(D_('h',0,pw,-9,fmt(pw)));
      dm.push(D_('v',0,ph,-9,fmt(ph)));
      out.push(P({key:tag+which, name:which+' panel'+(tag?' \u00b7 '+tag:''), mat, w:pw, h:ph, draw:d, dims:dm, seam:H*2+W,
        formula:`width = W ${fmt(W)} + 2 \u00d7 SA ${fmt(sa)} = ${fmt(pw)}\nheight = ${rext?`mouth turn ${fmt(rim)} + roll ${fmt(rext)} + `:`rim ${fmt(rim)} + `}H ${fmt(H)} + SA ${fmt(sa)} = ${fmt(ph)}` +
                (rext?`\nThe roll is ${Math.max(1,Math.round(S.roll.turns))} turns of ${fmt(rext/Math.max(1,Math.round(S.roll.turns)))} \u2014 the side seam runs all the way up to the mouth.`:'') +
                (r>0?`\ncut radius = finished ${fmt(r)} + SA ${fmt(sa)} = ${fmt(r+sa)}`:'')}));
    });

    const arc = Math.PI*r/2, arcT = topArcLen(rT, sa);
    const rollP = rext;                        // the roll runs straight up both side seams
    const bodyPath = 2*arcT + 2*(H - r - rT) + (W - 2*r) + 2*arc;
    const stitchLen = bodyPath + 2*rollP;
    const bell = S.gussetStyle==='bellows' ? Math.max(0, Math.min(S.bellows, D*2.5)) : 0;
    const gw = D + bell + 2*sa, tap = Math.min(S.taper, D*0.8);
    const hc = (D + bell)/2 + sa, he = (D + bell - tap)/2 + sa, cy = gw/2;

    /** x-extent whose slanted edge measures `edge` when it also rises by `rise`. */
    const flatLen = (edge, rise) => Math.sqrt(Math.max(1, edge*edge - rise*rise));
    /** One gusset piece. `taperAt` is where the taper starts, measured from the mouth end:
        the turn allowance plus the roll, both of which stay at full mouth width so the
        mouth can be folded flat. `xEnd` is where the taper finishes (the base or the join). */
    function gussetStrip(L, notches, name, key, qty, halfOnly, seamKey, seamName, xa, xb, tBx){
      const d=[], dm=[];
      const tA = rim + rollP, tB = tBx != null ? tBx : (halfOnly ? xb : L/2);
      const hw = x => he + (hc-he)*Math.min(1, Math.max(0,
                        (Math.min(x, halfOnly ? x : L-x) - tA) / Math.max(1, tB - tA)));
      const ptsUp = halfOnly
        ? [[0,-he]].concat(tA>0?[[tA,-he]]:[], tB<xb-1e-6?[[tB,-hc]]:[], [[xb,-hc],[L,-hc]])
        : [[0,-he]].concat(tA>0?[[tA,-he]]:[], tB<L/2-1e-6?[[tB,-hc]]:[], [[L/2,-hc]],
                           tB<L/2-1e-6?[[L-tB,-hc]]:[], tA>0?[[L-tA,-he]]:[], [[L,-he]]);
      const pts = ptsUp.map(q=>[q[0], cy+q[1]])
                  .concat(ptsUp.slice().reverse().map(q=>[q[0], cy-q[1]]));
      d.push({t:'cut', d:polyE(pts)});
      // the stitch edge changes slope wherever the cut edge does, so break the run there
      const edge = (sign) => {
        const brk = [xa];
        (halfOnly ? [tA, tB] : [tA, tB, L/2, L-tB, L-tA]).forEach(v=>{ if(v > xa+1e-9 && v < xb-1e-9) brk.push(v); });
        brk.push(xb);
        brk.sort((a,b)=>a-b);
        const run = [];
        for(let i=0;i<brk.length-1;i++)
          run.push(['L', brk[i], cy+sign*(hw(brk[i])-sa), brk[i+1], cy+sign*(hw(brk[i+1])-sa)]);
        return run;
      };
      d.push(SL(seamKey, seamName, edge(-1), {even:!halfOnly, trim:sa}));
      d.push(SL(seamKey, seamName, edge(1),  {even:!halfOnly, trim:sa}));
      notches.forEach(n=>{
        d.push({t:'notch', x:n.x, y:cy-hw(n.x), dir:'down'});
        d.push({t:'notch', x:n.x, y:cy+hw(n.x), dir:'up'});
        if(n.label) d.push({t:'text', x:n.x, y:cy-2.5, s:n.label, size:4.4, anchor:'middle', dim:true, rot:-90});
      });
      if(bell > 0){
        // the extra depth is folded in as a pleat; the stitch edges do not move, so the
        // panel run is untouched - the gusset just carries more leather between them
        [cy - bell/2, cy + bell/2].forEach((y,i)=>d.push({t:'fold', d:hLine(0,L,y), label:i===0?'PLEAT \u2014 OUT':'PLEAT \u2014 OUT'}));
        d.push({t:'fold', d:hLine(0,L,cy), label:'PLEAT \u2014 THIS ONE FOLDS THE OTHER WAY'});
        d.push({t:'text', x:L*0.28, y:cy - bell/2 - 2.5, s:'ACCORDION: OUT, IN, OUT', size:4, anchor:'middle', mark:true});
      }
      d.push({t:'grain', x:L/2, y:cy+9+bell/2, len:Math.min(90,L*0.4), dir:'h'});
      d.push({t:'text', x:L/2, y:cy+2.5, s:name.toUpperCase(), size:6, anchor:'middle', dim:true});
      const gRim = rim + rollP;                   // where the bag's own rim falls along the strip
      if(deco && S.strap.type!=='handles' && S.strap.type!=='pack' && S.strap.type!=='none'){
        const K = S.strap, fl = Math.max(18, K.tabLen), sw = Math.min(K.width, gw - 2*sa - 2);
        const swivel = K.attach==='swivel';
        // across the gusset: 0 keeps it on the centre line, which is where it always sat
        const room = Math.max(0, gw/2 - sa - sw/2);
        const acr = Math.max(-room, Math.min(room, K.anchorX || 0));
        const ends = halfOnly ? [{x:gRim + K.anchorY, far:'end'}]
                             : [{x:gRim + K.anchorY, far:'end'}, {x:L - gRim - K.anchorY - fl, far:'start'}];
        ends.forEach((e,i)=>{
          if(e.x < 0 || e.x + fl > L) return;
          attachOn(d, e.x, cy - sw/2 + acr, fl, sw, swivel?'tabbox':'strapbox',
                   swivel?'D-ring tab to gusset':'Strap end to gusset',
                   {axis:'x', far:e.far, deg:(e.far==='start'? -1 : 1)*(K.tabRot||0),
                    label:i===0?(swivel?'D-RING TAB':'STRAP END'):'',
                    xbox:!swivel && S.strap.tabFix==='stitch'});
        });
        dm.push(D_('h', gRim, gRim + K.anchorY, cy - gw/2 - 4, fmt(K.anchorY), 1));
      }
      if(deco && rollP>0){
        // the roll section of the gusset folds inward as a pleat, so it is only marked, never stitched shut
        const ends = halfOnly ? [{a:rim, b:gRim, dir:1}]
                              : [{a:rim, b:gRim, dir:1}, {a:L-rim, b:L-gRim, dir:-1}];
        ends.forEach(e=>{
          const turns = Math.max(1, Math.round(S.roll.turns));
          for(let i=1;i<turns;i++){
            const x = e.a + (e.b-e.a)*i/turns;
            d.push({t:'mark', d:vLine(x, cy-hw(x), cy+hw(x))});
          }
          d.push({t:'text', x:(e.a+e.b)/2, y:cy-2.5, s:'ROLL \u2014 PLEAT IN', size:4, anchor:'middle', mark:true, rot:-90});
        });
        if(deco) rollClosureOnGusset(d, dm, cy, gRim, L, halfOnly, gw, sa);
      }
      if(deco && drawOn()){
        // the mouth carries on across both gusset ends, and so does the cord
        const K4 = S.draw, dy2 = gRim + Math.max(K4.drop, sa + K4.size);
        const ends2 = halfOnly ? [dy2] : [dy2, L - dy2];
        ends2.forEach((x,i)=>{
          if(x < 0 || x > L) return;
          // both rows are measured at the MOUTH width: the channel is a flat strip, and a
          // gusset that tapers would otherwise ask for two rows of different lengths
          const hm = he;
          if(K4.style === 'channel'){
            [x, i===0 ? gRim + Math.max(3,sa) : L - gRim - Math.max(3,sa)].forEach(xx=>
              d.push(SL('drawchanend','Cord channel, gusset ends to the panel',
                [['L', xx, cy - hm + sa, xx, cy + hm - sa]], {even:true, trim:sa})));
          } else {
            const n4 = Math.max(1, Math.round(Math.max(4, Math.round(K4.n)) * D/(2*(W+D))));
            const w4 = 2*hm - 2*sa, st4 = w4/n4;
            for(let k=0;k<n4;k++) d.push({t:'hole', x, y:cy - hm + sa + st4*(k+0.5), r:K4.size/2, label:(i===0&&k===0)?'EYELET':''});
          }
        });
      }
      if(deco && zipWrap() > 0){
        const wz = zipWrap();
        const ends = halfOnly ? [[rim, rim+wz]] : [[rim, rim+wz], [L-rim, L-rim-wz]];
        ends.forEach(e=>zipOnGussetEnd(d, e[0], e[1], cy, hw, sa, SL));
        dm.push(D_('h', rim, rim+wz, cy - gw/2 - 4, fmt(wz)+' of zip', 1));
      }
      if(rimRowOn() && !rollOn()){
        const ri = rim + Math.max(3,sa);
        // a half gusset has one rim end; the other end is the base join, which is a seam, not a rim
        (halfOnly ? [ri] : [ri, L-ri]).forEach(x=>{ if(x>0 && x<L)
          d.push(SL('rimend','Rim, gusset ends', [['L', x, cy-hw(x)+sa, x, cy+hw(x)-sa]], {trim:sa})); });
      }
      if(rollOn() && rimIsStitched()){
        const ri = rim + Math.max(3,sa);
        (halfOnly ? [ri] : [ri, L-ri]).forEach(x=>{ if(x>0 && x<L)
          d.push(SL('mouthend','Mouth, gusset ends', [['L', x, cy-hw(x)+sa, x, cy+hw(x)-sa]], {trim:sa})); });
      }
      if(deco) placeElements(d, dm, {face:'gusset', cx:cy, rimY:gRim, dir:1, sa, rot:true,
                                     alongEnd: halfOnly ? null : L - gRim});
      // the middle of the strip is the bottom of the bag - measured along it from the centre,
      // and across it from the front edge, which is how a plan of the base reads
      if(deco && !halfOnly)
        placeElements(d, dm, {face:'base', cx:L/2, rimY:cy - hw(L/2) + sa, dir:1, sa});
      dm.push(D_('h',0,L,-9,fmt(L)));
      dm.push(D_('v',cy-hc,cy+hc,-9,fmt(D+2*sa)));
      if(tap>0) dm.push(D_('v',cy-he,cy+he,L+9,fmt(D-tap+2*sa),1));
      return P({key, name, mat, w:L, h:gw, qty, draw:d, dims:dm, seam:stitchLen,
        formula:`stitch path = 2 \u00d7 (H ${fmt(H)} \u2212 r ${fmt(r)}) + (W ${fmt(W)} \u2212 2r ${fmt(2*r)}) + 2 \u00d7 \u00bc-arc ${fmt(arc)} = ${fmt(stitchLen)}\n`+
                `length = ${fmt(L)}${tap>0?` \u2014 shorter than the path, because a tapered edge slants and so measures the full ${fmt(halfOnly?stitchLen/2:stitchLen)} once cut`:''}\n`+
                `width = D ${fmt(D)} + 2 \u00d7 SA ${fmt(sa)} = ${fmt(gw)}${tap>0?`, tapering to ${fmt(D-tap+2*sa)} at the rim`:''}`});
    }

    /* The taper can finish partway down, which is how a satchel gusset is shaped: it comes in
       at the top and then runs parallel. Only the slanted part gets the flat-length correction. */
    // bodyPath is the panel edge without the roll, so half of it is what a gusset end covers
    const shoulderPath = (S.taper > 0 && S.shoulder > 0)
      ? Math.max(6, Math.min(S.shoulder, bodyPath/2 - 6)) : 0;
    const taperPath = shoulderPath || Math.max(1, bodyPath/2);
    const restPath  = Math.max(0, bodyPath/2 - taperPath);
    if(S.gussetStyle==='wrap' || S.gussetStyle==='bellows'){
      const L = 2*(rim + rollP + flatLen(taperPath, (hc-he)) + restPath);
      const tB = rim + rollP + flatLen(taperPath, (hc-he));
      const sc = flatLen(taperPath, (hc-he))/Math.max(1, taperPath);
      const at = p => p <= rollP ? rim + p
                    : p <= rollP + taperPath ? rim + rollP + (p - rollP)*sc
                    : tB + (p - rollP - taperPath);
      const half=[{x:at(0),label:rollP?'MOUTH':'RIM'}].concat(rollP?[{x:at(rollP),label:'RIM'}]:[],
              rT?[{x:at(rollP+arcT),label:'TOP CORNER'}]:[],
              [{x:at(rollP+arcT+(H-r-rT)),label:'CORNER'},{x:at(rollP+arcT+(H-r-rT)+arc),label:''}]);
      const all = half.concat([{x:L/2,label:'BASE CENTRE'}],
                  half.map(v=>({x:L-v.x,label:v.label})).reverse());
      if(shoulderPath) all.push({x:tB, label:'SHOULDER'}, {x:L-tB, label:''});
      out.push(gussetStrip(L, all.filter(v=>v.x>0&&v.x<L),
                           (bell? 'Accordion gusset' : 'Gusset \u2014 one piece')+(tag?' \u00b7 '+tag:''),
                           tag+'Gusset', 1, false, 'body','Panel to gusset', rim, L-rim, tB));
    } else if(S.gussetStyle==='split'){
      const L = rim + rollP + flatLen(taperPath, (hc-he)) + restPath + sa;
      const tB = rim + rollP + flatLen(taperPath, (hc-he));
      const sc = flatLen(taperPath, (hc-he))/Math.max(1, taperPath);
      const at = p => p <= rollP ? rim + p
                    : p <= rollP + taperPath ? rim + rollP + (p - rollP)*sc
                    : tB + (p - rollP - taperPath);
      const n=[{x:at(0),label:rollP?'MOUTH':'RIM'}].concat(rollP?[{x:at(rollP),label:'RIM'}]:[],
              rT?[{x:at(rollP+arcT),label:'TOP CORNER'}]:[],
              [{x:at(rollP+arcT+(H-r-rT)),label:'CORNER'},{x:at(rollP+arcT+(H-r-rT)+arc),label:''},{x:L-sa,label:'JOIN'}]);
      if(shoulderPath) n.splice(rollP?2:1, 0, {x:tB, label:'SHOULDER'});
      out.push(gussetStrip(L, n.filter(v=>v.x>0&&v.x<L), 'Gusset half'+(tag?' \u00b7 '+tag:''), tag+'GussetH', 2, true,
                           'bodyhalf','Panel to gusset (half)', rim, L-sa, tB));
    } else {
      const bw = W + 2*sa, bh = D + 2*sa;
      const bd=[{t:'cut', d:rrE(0,0,bw,bh,0)},
        SL('bottom','Panel to base', [['L',sa,sa,bw-sa,sa]], {even:true, trim:sa}),
        SL('bottom','Panel to base', [['L',sa,bh-sa,bw-sa,bh-sa]], {even:true, trim:sa}),
        SL('gside','Side gusset to base', [['L',sa,sa,sa,bh-sa]], {trim:sa}),
        SL('gside','Side gusset to base', [['L',bw-sa,sa,bw-sa,bh-sa]], {trim:sa}),
        {t:'ctr', d:vLine(bw/2,0,bh)},{t:'ctr', d:hLine(0,bw,bh/2)},
        {t:'notch',x:bw/2,y:0,dir:'down'},{t:'notch',x:bw/2,y:bh,dir:'up'},
        {t:'text', x:bw/2, y:bh/2-3, s:'BASE'+(tag?' \u00b7 '+tag.toUpperCase():''), size:7, anchor:'middle', dim:true}];
      // feet, a stamp, anything on the bottom: y is measured in from the FRONT edge
      if(deco) placeElements(bd, [], {face:'base', cx:bw/2, rimY:sa, dir:1, sa});
      out.push(P({key:tag+'Base', name:'Base panel'+(tag?' \u00b7 '+tag:''), mat, w:bw, h:bh, draw:bd, seam:2*(W+D),
        dims:[D_('h',0,bw,-9,fmt(bw)), D_('v',0,bh,-9,fmt(bh))],
        formula:`W ${fmt(W)} + 2 \u00d7 SA ${fmt(sa)} \u00d7 D ${fmt(D)} + 2 \u00d7 SA ${fmt(sa)}\nSquare base: use the one-piece wrap gusset if you want a radiused bottom.`}));
      const L = rim + rollP + flatLen(H, (hc-he)) + sa;
      const nb = [{x:rim, label:rollP?'MOUTH':'RIM'}].concat(rollP?[{x:rim+rollP,label:'RIM'}]:[], [{x:L-sa,label:'BASE SEAM'}]);
      out.push(gussetStrip(L, nb.filter(v=>v.x>0&&v.x<L), 'Side gusset'+(tag?' \u00b7 '+tag:''), tag+'Side', 2, true,
                           'side','Panel to side gusset', rim, L-sa));
    }
  }

  if(S.construction==='free'){
    /* A shape she drew, with a gusset wrapped round it. Structurally this IS the gusset
       construction - two panels and a strip - so everything below is the same three things
       the wrap gusset does: the panel's outline, the run the gusset is stitched to, and a
       notch at every corner she put in. The only difference is where the outline came from.

       The MOUTH is the arc between her two marked points; the gusset is cut to the length of
       everything else round the profile. Get that one number wrong and nothing meets. */
    const F = freeProfile(W, H);
    const gw = D + 2*sa;
    /* The cut edge is the profile grown OUTWARD, and NOT by the same amount all the way
       round. Along the body arc the profile is the stitch line, so the leather has to run a
       seam allowance past it. Along the MOUTH the profile is the finished top edge of the
       bag: what runs past it is the turn allowance, which is nothing at all on a raw edge.
       Growing the whole outline by the seam allowance is what put the mouth's stitch row
       twice the allowance from the cut edge, which is not a distance anything on the bag
       measures. offsetPoly takes the sign, because the inside of a polygon is the side its
       winding says it is. */
    const mouthEdge = new Array(F.pts.length).fill(false);
    for(let k = F.mouth.a; k !== F.mouth.b; k = (k+1) % F.pts.length) mouthEdge[k] = true;
    const grown = offsetPoly(F.pts, mouthEdge.map(m => m ? rim : sa), -1);
    const gx = Math.min.apply(null, grown.map(q=>q[0])), gy = Math.min.apply(null, grown.map(q=>q[1]));
    const cut = grown.map(q=>[q[0]-gx, q[1]-gy]);
    const P0 = F.pts.map(q=>[q[0]-gx, q[1]-gy]);
    const pw = Math.max.apply(null, cut.map(q=>q[0])), ph = Math.max.apply(null, cut.map(q=>q[1]));
    const inP = insetPoly(P0, Math.max(3, sa));
    /* A row is drafted at a distance from the cut edge, and on a rectangle that is the end of
       it. A profile is not a rectangle: where it pinches - the tips of a crescent, the inside
       of a hollow - the outline cannot hold the allowance, and where the mouth's hem has to
       turn round a corner tighter than the hem is deep, the offset folds over itself and the
       edge is cut straight across instead. The number printed on the pattern stays the number
       the row was drafted to, because that is the one she set and the one it measures along
       almost all of its length; where the drawing cannot keep it, the drafter says so out
       loud rather than printing a figure that is true in one place and wrong in another. */
    const insCheck = (segs2, nominal, what) => {
      const t2 = trimRun(segs2, sa), L2 = runLen(t2);
      if(!(L2 > 0) || !g.warn) return nominal;
      let lo = Infinity, hi = -Infinity;
      for(let i=0;i<=96;i++){
        const q = ptAt(t2, L2*i/96), dq = polyDist([q.x, q.y], cut);
        if(dq < lo) lo = dq;
        if(dq > hi) hi = dq;
      }
      if(lo < nominal - 1)
        g.warn.push(`The ${what} is drafted ${fmt(nominal)} in from the cut edge, and the profile pinches to ${fmt(lo)} somewhere along it \u2014 there is not ${fmt(nominal)} of leather there to have. Open that part of the shape out, or take the seam allowance down.`);
      else if(hi > nominal + 2)
        g.warn.push(`The ${what} runs as much as ${fmt(hi)} in from the cut edge where it should be ${fmt(nominal)}: the edge has been taken straight across a corner too tight for a ${fmt(rim)} hem to turn. Open that corner out, or set the edges raw so the profile is the cut edge.`);
      return nominal;
    };
    const nrm = i => {                       // the outward normal at a point on the profile
      const n = P0.length, a = P0[(i-1+n)%n], b = P0[(i+1)%n];
      const dx = b[0]-a[0], dy = b[1]-a[1], L = Math.hypot(dx,dy) || 1;
      const q = [dy/L, -dx/L], m = [P0[i][0] - (pw/2), P0[i][1] - (ph/2)];
      return (q[0]*m[0] + q[1]*m[1]) < 0 ? [-q[0], -q[1]] : q;
    };
    // the mouth's own datum: where the rim sits, and the middle of it
    const mA = P0[F.mouth.a], mB = P0[F.mouth.b];
    const rimY = Math.min(mA[1], mB[1]);
    const cxP = (mA[0] + mB[0])/2;

    ['Front','Back'].forEach(which=>{
      const d=[], dm=[];
      d.push({t:'cut', d:poly(cut)});
      const bSeg = polyArcSegs(P0, F.mouth.b, F.mouth.a);
      if(which==='Front') insCheck(bSeg, sa, 'seam to the gusset');
      d.push(SL('body','Panel to gusset', bSeg, {even:true, trim:sa, ins:sa}));
      // a turned mouth folds on the profile itself: that IS the finished edge of the bag
      if(rim > 0)
        d.push({t:'fold', d:segsPath(polyArcSegs(P0, F.mouth.a, F.mouth.b)),
                label:'TURN '+fmt(rim,{unit:false})});
      if(rimRowOn() && S.top!=='zip'){
        const mSeg = polyArcSegs(inP, F.mouth.a, F.mouth.b);
        const mIns = rim + Math.max(3, sa);
        if(which==='Front') insCheck(mSeg, mIns, 'rim row round the mouth');
        d.push(SL('rim','Rim, front and back', mSeg, {even:true, trim:sa, ins:mIns}));
        d.push({t:'text', x:cxP, y:rimY + Math.max(3,sa) + 4.4, s:rimNote(), size:3.6, anchor:'middle', mark:true});
      }
      if(S.top==='zip'){
        const zi = zipInset(), zPan = S.zip.style==='panel';
        const zz = insetPoly(P0, zi);
        const zSeg = polyArcSegs(zz, F.mouth.a, F.mouth.b);
        if(which==='Front') insCheck(zSeg, rim + zi, zPan ? 'zip panel seam' : 'zip tape row');
        // the zip panel meets the body on its OWN key, or it is planned against the tape it
        // never touches and the strip comes out a different length from the row it is sewn to
        d.push(SL(zPan?'ziprim':'ziptape', zPan?'Zip panel to rim':'Zip tape to rim', zSeg,
                  {even:true, trim:sa, ins:rim + zi}));
        d.push({t:'text', x:cxP, y:rimY + zi + 5, s:zPan ? 'ZIP PANEL SEAM'
                : zipG().label + ' CHAIN \u00b7 TAPE ' + fmt(zi) + ' IN', size:3.6, anchor:'middle', mark:true});
      }
      // a notch at every corner she put in, square to the edge it sits on, on BOTH pieces -
      // it is how the strip is lined up against a shape with no straight edge to go by
      F.src.forEach((si,k)=>{
        const t = F.cum[si], b0 = F.cum[F.mouth.b];
        const along = t >= b0 ? t - b0 : F.total - b0 + t;
        if(along < 2 || along > F.bodyLen - 2) return;
        const nq = nrm(si);
        d.push({t:'notch', x:P0[si][0], y:P0[si][1], nx:nq[0], ny:nq[1]});
      });
      d.push({t:'ctr', d:vLine(cxP, 0, ph)});
      // the middle of a crescent is not on the leather: put the name and the grain where the
      // piece is actually widest, which is the one place both are certain to fit
      const anc = polyAnchor(P0);
      d.push({t:'grain', x:anc.x, y:anc.y + Math.min(anc.r*0.5, 22), len:Math.min(70, anc.r*1.1), dir:'v'});
      d.push({t:'text', x:anc.x, y:anc.y, s:tag?which.toUpperCase()+' \u00b7 '+tag.toUpperCase():which.toUpperCase(), size:7, anchor:'middle', dim:true});
      if(deco && which==='Front' && S.top==='flap' && S.flap.closure!=='none'){
        const down = S.flap.drop + pullDrop() - S.flap.cInset;
        closureXs(cxP, F.chord).forEach((cq,i)=>{
          if(g.warn && !polyHas(P0, cq, rimY + down))
            g.warn.push(`The ${CLOSURE_LABEL().toLowerCase()} lands ${fmt(down)} below the mouth, and the profile is not there \u2014 that point is off the front panel. Shorten the flap, move the closure up its tip, or pull the shape out under it.`);
          d.push({t:'hole', x:cq, y:rimY + down, r:3, label:i===0?CLOSURE_LABEL():''});
        });
      }
      if(deco && which==='Front' && S.top==='magnet') d.push({t:'hole', x:cxP, y:rimY+18, r:3, label:'MAGNET'});
      if(deco && which==='Back' && S.top==='flap' && S.flap.attach>0){
        const fy = rimY + S.flap.attach, hc = F.chord/2;
        d.push(SL('flapattach','Flap to back panel', [['L', cxP-hc, fy, cxP+hc, fy]], {even:true, trim:sa, ins:null}));
        d.push({t:'text', x:cxP-hc+3, y:fy-1.6, s:'FLAP STITCHES HERE', size:3.8, anchor:'start', mark:true});
      }
      if(deco && which==='Back' && S.top==='magnet') d.push({t:'hole', x:cxP, y:rimY+18, r:3, label:'MAGNET'});
      /* Whatever carries the bag has to land on the PATTERN, not just on the elevation. A
         shape she drew used to draft neither the handle tails nor the pack anchors, so a
         crossbody profile came out with a strap on the drawing and nothing to sew it to. A
         rectangular panel swallows any footprint narrower than it is; a profile does not, so
         each one is checked against the outline and says so rather than being drawn in air. */
      const onPanel = (x0, y0, w2, h2) =>
        polyHas(P0, x0, y0) && polyHas(P0, x0+w2, y0) &&
        polyHas(P0, x0+w2, y0+h2) && polyHas(P0, x0, y0+h2);
      const warnFoot = (ok, what) => { if(!ok && g.warn)
        g.warn.push(`The ${what} does not land on the ${which.toLowerCase()} panel \u2014 the profile is not there. Move it up, bring it in, or pull that part of the shape out.`); };
      if(deco && S.strap.type==='handles'){
        const Hd = S.handles, hf = handleFoot();
        [cxP - Hd.span/2 - hf.w/2, cxP + Hd.span/2 - hf.w/2].forEach((hx,i)=>{
          warnFoot(onPanel(hx, rimY + Hd.anchorY, hf.w, hf.h), 'handle tail');
          attachOn(d, hx, rimY + Hd.anchorY, hf.w, hf.h, hf.key, hf.name,
                   {axis:'y', label:i===0?hf.label:'', fix:Hd.fix, rivetSpec:rivetSpecAt(Hd),
                    tipShape:S.strap.tip, through:hf.key==='handlering', xbox:hf.xbox && Hd.fix==='stitch'});
        });
        dm.push(D_('h', cxP - Hd.span/2, cxP + Hd.span/2, rimY + Hd.anchorY - 5, fmt(Hd.span), 1));
      }
      if(deco && S.strap.type==='pack' && which==='Back'){
        const Kp = S.strap, s2 = Math.min(Kp.packSpan/2, F.chord/2 - Kp.width);
        const botY = Math.max.apply(null, P0.map(q=>q[1]));
        [[-1, rimY + Kp.anchorY, s2],[1, rimY + Kp.anchorY, s2],
         [-1, botY - Kp.tabLen - 8 - sa, s2*0.55],[1, botY - Kp.tabLen - 8 - sa, s2*0.55]].forEach((a,i)=>{
          warnFoot(onPanel(cxP + a[0]*a[2] - Kp.width/2, a[1], Kp.width, Kp.tabLen), 'pack strap anchor');
          attachOn(d, cxP + a[0]*a[2] - Kp.width/2, a[1], Kp.width, Kp.tabLen, 'packanchor', 'Pack strap to back panel',
                   {axis:'y', far:i<2?'end':'start', fix:S.strap.tabFix, rivetSpec:strapRivetSpec(),
                    label:i===0?'STRAP':'', xbox:S.strap.tabFix==='stitch'});
        });
        dm.push(D_('h', cxP - s2, cxP + s2, rimY + Kp.anchorY - 5, fmt(s2*2), 1));
      }
      if(carrier){
        /* A rectangular panel swallows any pocket that is narrower than it is. A shape she
           drew does not: an oval 270 across is nowhere near 270 across 55 mm down. Say so
           rather than drawing a pocket half off its own lining. */
        const face = which.toLowerCase();
        const fits = (x0, y0, w2, h2) =>
          polyHas(P0, x0, y0) && polyHas(P0, x0+w2, y0) &&
          polyHas(P0, x0+w2, y0+h2) && polyHas(P0, x0, y0+h2);
        const chk = (on, w2, h2, dx, dy, what) => {
          if(!on || !g.warn) return;
          if(fits(cxP + dx - w2/2, rimY + dy, w2, h2)) return;
          g.warn.push(`The ${what} is ${fmt(w2)} \u00d7 ${fmt(h2)} and runs off the ${face} panel \u2014 the profile is not that wide ${fmt(dy)} down from the mouth. Make it smaller, move it up, or pull that part of the shape out.`);
        };
        if((S.slip.face||'back') === face) chk(S.lined && S.slip.on, S.slip.w, S.slip.h, S.slip.x, S.slip.y, 'slip pocket');
        if((S.zipPkt.face||'back') === face) chk(S.lined && S.zipPkt.on, S.zipPkt.w, 12, 0, S.zipPkt.y, 'zip pocket window');
        if((S.cards.face||'back') === face) chk(S.cards.on, cardSlotW() + 2*sa, cardStackH() + sa, S.cards.x, S.cards.y, 'card slot stack');
        interiorOn(d, dm, cxP, rimY, 1, sa, face);
      }
      if(deco) placeElements(d, dm, {face:which.toLowerCase(), cx:cxP, rimY, dir:1, sa});
      if(carrier && which==='Back') placeElements(d, dm, {face:'inside', cx:cxP, rimY, dir:1, sa});
      dm.push(D_('h',0,pw,-9,fmt(pw)));
      dm.push(D_('v',0,ph,-9,fmt(ph)));
      out.push(P({key:tag+which, name:which+' panel'+(tag?' \u00b7 '+tag:''), mat, w:pw, h:ph,
        draw:d, dims:dm, seam:F.bodyLen,
        formula:`A profile you drew: ${F.src.length} corners, ${fmt(F.total)} all the way round.\n`+
                `The mouth takes ${fmt(F.mouthLen)} of that (${fmt(F.chord)} straight across), so the gusset is stitched to the other ${fmt(F.bodyLen)}.\n`+
                `Cut size is the profile plus SA ${fmt(sa)} all round: ${fmt(pw)} \u00d7 ${fmt(ph)}. Notch every corner \u2014 on a shape like this the notches are the only thing telling you where you are.`}));
    });

    // the strip, cut to the run it has to meet
    {
      const L = F.bodyLen, cy = gw/2;
      const d=[], dm=[];
      d.push({t:'cut', d:rrE(0,0,L,gw,0)});
      d.push(SL('body','Panel to gusset', [['L',0,sa,L,sa]], {even:true, trim:sa}));
      d.push(SL('body','Panel to gusset', [['L',0,gw-sa,L,gw-sa]], {even:true, trim:sa}));
      F.src.forEach(si=>{
        const t = F.cum[si], b0 = F.cum[F.mouth.b];
        const along = t >= b0 ? t - b0 : F.total - b0 + t;
        if(along < 2 || along > L - 2) return;
        d.push({t:'notch', x:along, y:sa,      dir:'up'});
        d.push({t:'notch', x:along, y:gw-sa,   dir:'down'});
      });
      if(rimRowOn()) [sa, L-sa].forEach(x=>
        d.push(SL('rimend','Rim, gusset ends', [['L', x, sa, x, gw-sa]], {trim:sa})));
      /* The strap meets the bag on the GUSSET, and on a shape she drew the strip is the
         gusset. It was drafted on every other construction and on none of these, so the tab
         you can see on the side elevation - angle and all - had nothing to sew it to. x runs
         from the mouth, so "down from the rim" is the same number here as everywhere else. */
      if(deco && S.strap.type!=='handles' && S.strap.type!=='pack' && S.strap.type!=='none'){
        const K = S.strap, fl = Math.max(18, K.tabLen), sw = Math.min(K.width, gw - 2*sa - 2);
        const swivel = K.attach==='swivel';
        const room = Math.max(0, gw/2 - sa - sw/2);
        const acr = Math.max(-room, Math.min(room, K.anchorX || 0));
        [{x:K.anchorY, far:'end'}, {x:L - K.anchorY - fl, far:'start'}].forEach((e,i)=>{
          if(e.x < 0 || e.x + fl > L) return;
          attachOn(d, e.x, cy - sw/2 + acr, fl, sw, swivel?'tabbox':'strapbox',
                   swivel?'D-ring tab to gusset':'Strap end to gusset',
                   {axis:'x', far:e.far, deg:(e.far==='start'? -1 : 1)*(K.tabRot||0),
                    label:i===0?(swivel?'D-RING TAB':'STRAP END'):'',
                    xbox:!swivel && K.tabFix==='stitch'});
        });
        dm.push(D_('h', 0, K.anchorY, cy - gw/2 - 4, fmt(K.anchorY), 1));
      }
      d.push({t:'grain', x:L/2, y:cy+9, len:Math.min(90, L*0.4), dir:'h'});
      d.push({t:'text', x:L/2, y:cy+2.5, s:('Gusset \u2014 one piece'+(tag?' \u00b7 '+tag:'')).toUpperCase(), size:6, anchor:'middle', dim:true});
      d.push({t:'text', x:L/2, y:cy+9, s:'THE NOTCHES ARE THE CORNERS OF THE PROFILE \u2014 MATCH THEM AND IT CANNOT CREEP', size:3.4, anchor:'middle', mark:true});
      if(deco) placeElements(d, dm, {face:'gusset', cx:cy, rimY:0, dir:1, sa, rot:true, alongEnd:L});
      if(deco) placeElements(d, dm, {face:'base', cx:L/2, rimY:sa, dir:1, sa});
      dm.push(D_('h',0,L,-9,fmt(L)));
      dm.push(D_('v',0,gw,-9,fmt(gw)));
      out.push(P({key:tag+'Gusset', name:'Gusset \u2014 one piece'+(tag?' \u00b7 '+tag:''), mat,
        w:L, h:gw, draw:d, dims:dm, seam:2*L,
        formula:`length = the profile all the way round ${fmt(F.total)} less the mouth ${fmt(F.mouthLen)} = ${fmt(L)}\n`+
                `width = D ${fmt(D)} + 2 \u00d7 SA ${fmt(sa)} = ${fmt(gw)}\n`+
                `Both long edges carry the same count as the panel run, so the strip cannot creep against either panel. Start at a notch, not at an end.`}));
    }
  /* A lining panel is hidden by default because you cut it from the shell pattern. That only
     holds while it IS the shell: the moment something is stitched to it - a slip pocket, a zip
     window, a card stack, anything on the inside face - it carries a row that the shell pattern
     does not have, and you would be marking that row off a drawing that was never printed.
     "Where does the slip pocket stitch to?" was exactly that. A lining piece with a seam of its
     own is a piece in its own right and is always drawn. */
  out.forEach(p => p.derived = !!tag && !p.draw.some(it => it && it.t === 'seam'));
    return out;
  }

  if(S.construction==='barrel'){
    /* A tube lying on its side with a round panel closing each end: a duffle, a bowling bag.
       The body wraps H x D round and W along, and the seam it closes on runs along the top. */
    const a = Math.max(20, H/2), b = Math.max(12, D/2);
    const per = basePerim(a, b);
    const pw = W + 2*sa, ph = per + 2*sa;
    const topY = sa, botY = ph - sa;
    const d=[], dm=[];
    d.push({t:'cut', d:rrE(0,0,pw,ph,0)});
    /* The tube closes along the top, and on a zipped bag that seam IS the mouth - it is never
       sewn shut. Both edges of the tube get a tape row instead, one each side of the chain.
       Drawing the top seam as well put a second row 8 mm from the first and left the other
       edge of the tube with nothing at all to zip to. */
    if(S.top==='zip'){
      zipOnRim(d, sa, pw-sa, topY, 1, sa, live, sa);
      zipOnRim(d, sa, pw-sa, botY, -1, sa, live, sa);
    } else {
      d.push(SL('barrelseam','Top seam, along the bag', [['L', sa, topY, pw-sa, topY]], {even:true, trim:sa}));
      d.push(SL('barrelseam','Top seam, along the bag', [['L', sa, botY, pw-sa, botY]], {even:true, trim:sa}));
    }
    d.push(SL('endjoin','Body to end panel', [['L', sa, sa, sa, ph-sa]], {planLen:per}));
    d.push(SL('endjoin','Body to end panel', [['L', pw-sa, sa, pw-sa, ph-sa]], {planLen:per}));
    d.push({t:'ctr', d:hLine(0,pw,ph/2)});
    d.push({t:'text', x:pw/2, y:ph/2-3, s:'BASE LINE \u2014 THIS IS WHAT THE BAG STANDS ON', size:4, anchor:'middle', mark:true});
    [ph*0.25, ph*0.75].forEach(y=>{ d.push({t:'notch', x:0, y, dir:'right'}); d.push({t:'notch', x:pw, y, dir:'left'}); });
    d.push({t:'text', x:sa+8, y:ph*0.30, s:'BODY'+(tag?' \u00b7 '+tag.toUpperCase():''), size:8, anchor:'start', dim:true});
    d.push({t:'grain', x:pw/2, y:ph*0.38, len:Math.min(110, pw*0.3), dir:'h'});
    if(deco && S.pocket.on){
      const px = pw/2 + S.pocket.x - S.pocket.w/2, py = ph/2 - S.pocket.y - S.pocket.h;
      d.push({t:'mark', d:rr(px,py,S.pocket.w,S.pocket.h,S.pocket.radius)});
      d.push(SL('pocket','Front pocket to panel', openRectRun(px,py,px+S.pocket.w,py+S.pocket.h,S.pocket.radius), {even:true, trim:sa, ins:null}));
      d.push({t:'text', x:px+S.pocket.w/2, y:py+S.pocket.h/2+2, s:'POCKET', size:5, anchor:'middle', mark:true});
    }
    // everything is measured down from the top seam, the way a rim is on every other bag
    if(carrier){ interiorOn(d, dm, pw/2, topY, 1, sa, 'back'); interiorOn(d, dm, pw/2, botY, -1, sa, 'front'); }
    if(deco){
      placeElements(d, dm, {face:'front', cx:pw/2, rimY:botY, dir:-1, sa});
      placeElements(d, dm, {face:'back',  cx:pw/2, rimY:topY, dir:1,  sa});
      // a boxed body folds at its middle, so the base is the band across that fold
      placeElements(d, dm, {face:'base',  cx:pw/2, rimY:ph/2 - D/2, dir:1, sa});
      if(S.strap.type==='handles'){
        const Hd = S.handles, hf = handleFoot();
        [[topY + Hd.anchorY, 1], [botY - Hd.anchorY - hf.h, -1]].forEach(row=>{
          [pw/2 - Hd.span/2 - hf.w/2, pw/2 + Hd.span/2 - hf.w/2].forEach((hx,i)=>{
            attachOn(d, hx, row[0], hf.w, hf.h, hf.key, hf.name,
                     {axis:'y', far:row[1]>0?'end':'start', rot:row[1]>0?0:180, fix:Hd.fix, rivetSpec:rivetSpecAt(Hd),
                      label:i===0?hf.label:'',                       xbox:hf.xbox && Hd.fix==='stitch'});
          });
        });
        dm.push(D_('h', pw/2 - Hd.span/2, pw/2 + Hd.span/2, topY + Hd.anchorY - 5, fmt(Hd.span), 1));
      } else if(S.strap.type!=='none' && S.strap.type!=='pack' && S.strap.type!=='belt'){
        const K2 = S.strap, fl = Math.max(18, K2.tabLen), sw = K2.width;
        const swivel = K2.attach==='swivel';
        const room2 = Math.max(0, ph/2 - sa - sw/2);
        const acr2 = Math.max(-room2, Math.min(room2, K2.anchorX || 0));
        [sa + 12, pw - sa - 12 - fl].forEach((sx4,i)=>{
          attachOn(d, sx4, ph/2 - sw/2 + acr2, fl, sw, swivel?'tabbox':'strapbox',
                   swivel?'D-ring tab to the end of the body':'Strap end to the body',
                   {axis:'x', far:i?'start':'end', deg:(i?-1:1)*(K2.tabRot||0),
                    label:i===0?(swivel?'TAB':'STRAP'):'',
                    xbox:!swivel && K2.tabFix==='stitch'});
        });
      }
    }
    dm.push(D_('h',0,pw,-9,fmt(pw)));
    dm.push(D_('v',0,ph,-9,fmt(ph)));
    out.push(P({key:tag+'Body', name:'Body'+(tag?' \u00b7 '+tag:''), mat, w:pw, h:ph, draw:d, dims:dm, seam:2*per+2*W,
      formula:`length = W ${fmt(W)} + 2 \u00d7 SA ${fmt(sa)} = ${fmt(pw)}\n`+
              `round the end = the ellipse H ${fmt(H)} \u00d7 D ${fmt(D)}, which measures ${fmt(per)}, + 2 \u00d7 SA = ${fmt(ph)}\n`+
              `It wraps into a tube and closes along the top, so the seam you see up there is the one the zip sits in.`}));

    const ew = H + 2*sa, eh = D + 2*sa;
    const ed=[{t:'cut', d:poly(basePts(a+sa, b+sa).map(q=>[ew/2+q[0], eh/2+q[1]]))},
      SL('endjoin','Body to end panel', baseRun(ew/2, eh/2, a, b, 0, BASE_N), {planLen:per, closed:true}),
      {t:'ctr', d:hLine(0,ew,eh/2)}, {t:'ctr', d:vLine(ew/2,0,eh)},
      {t:'notch', x:ew/2, y:eh/2 - b, dir:'down'}, {t:'notch', x:ew/2, y:eh/2 + b, dir:'up'},
      {t:'text', x:ew/2, y:eh/2+2, s:'END'+(tag?' \u00b7 '+tag.toUpperCase():''), size:7, anchor:'middle', dim:true},
      {t:'text', x:ew/2, y:eh/2+9, s:'TOP NOTCH GOES TO THE TOP SEAM', size:3.6, anchor:'middle', mark:true}];
    if(deco) placeElements(ed, [], {face:'gusset', cx:ew/2, rimY:eh/2 - b, dir:1, sa});
    out.push(P({key:tag+'End', name:'End panel'+(tag?' \u00b7 '+tag:''), mat, w:ew, h:eh, qty:2, draw:ed, seam:per,
      dims:[D_('h',0,ew,-9,fmt(ew)), D_('v',0,eh,-9,fmt(eh))],
      formula:`An ellipse H ${fmt(H)} \u00d7 D ${fmt(D)} finished, + SA ${fmt(sa)} all round.\n`+
              `Its edge measures ${fmt(per)}, which is exactly the height of the body panel \u2014 both come off the same drawing, so they cannot disagree.\n`+
              `Ease it in from the top notch downward, a quarter at a time. Stiffen it: an unlined end panel folds flat the first time the bag is empty.`}));
  }
  if(S.construction==='bucket'){
    /* A round base with the body wrapped round it, split into a front half and a back half
       so both faces have somewhere to put things and the seams land on the sides. */
    const a = W/2, b = Math.max(12, D/2), rext = rollExt();
    const per = basePerim(a, b), halfP = per/2;
    const pw = halfP + 2*sa, ph = rim + rext + H + sa;
    const yRim = rim + rext, y1 = yRim + H;

    ['Front','Back'].forEach(which=>{
      const d=[], dm=[];
      const front = which==='Front';
      d.push({t:'cut', d:rrE(0,0,pw,ph,0)});
      // the two side seams, and the bottom edge that goes round the base
      d.push(SL('bucketside','Side seam', [['L', sa, rim, sa, y1]], {trim:sa}));
      d.push(SL('bucketside','Side seam', [['L', pw-sa, rim, pw-sa, y1]], {trim:sa}));
      d.push(SL('basejoin','Body to base', [['L', sa, y1, pw-sa, y1]], {planLen:halfP}));
      d.push({t:'text', x:pw/2, y:y1-2.5, s:'THIS EDGE GOES ROUND THE BASE \u2014 EASE IT, DO NOT STRETCH IT', size:3.6, anchor:'middle', mark:true});
      if(rim>0) d.push({t:'fold', d:hLine(0,pw,rim), label:'TURN '+fmt(rim,{unit:false}), band:[0,0,pw,rim]});
      if(rimRowOn()){
        d.push(SL('rim','Rim, front and back', [['L', sa, rim+Math.max(3,sa), pw-sa, rim+Math.max(3,sa)]], {even:true, trim:sa, ins:rim+Math.max(3,sa)}));
        d.push({t:'text', x:sa+3, y:rim+Math.max(3,sa)-1.6, s:rimNote(), size:3.6, anchor:'start', mark:true});
      }
      if(S.top==='zip') zipOnRim(d, sa, pw-sa, rim, 1, sa, live, rim);
      if(rext>0){
        rollMarks(d, sa, pw-sa, rim, yRim, 1, sa, live, SL);
        d.push({t:'fold', d:hLine(0,pw,yRim), label:'RIM \u2014 THE BAG ENDS HERE'});
      }
      // quarter notches so the body cannot creep round the base
      [pw/2].forEach(x=>{ d.push({t:'ctr', d:vLine(x,0,ph)}); d.push({t:'notch', x, y:ph, dir:'up'}); });
      d.push({t:'grain', x:pw-11, y:ph/2, len:Math.min(70,ph*0.5), dir:'v'});
      d.push({t:'text', x:sa+7, y:y1-9, s:tag?which.toUpperCase()+' \u00b7 '+tag.toUpperCase():which.toUpperCase(), size:7, anchor:'start', dim:true});

      if(deco && front && S.pocket.on){
        const px = pw/2 + S.pocket.x - S.pocket.w/2, py = y1 - S.pocket.y - S.pocket.h;
        d.push({t:'mark', d:rr(px,py,S.pocket.w,S.pocket.h,S.pocket.radius)});
        d.push(SL('pocket','Front pocket to panel', openRectRun(px,py,px+S.pocket.w,py+S.pocket.h,S.pocket.radius), {even:true, trim:sa, ins:null}));
        d.push({t:'text', x:px+S.pocket.w/2, y:py+S.pocket.h/2+2, s:'POCKET', size:5, anchor:'middle', mark:true});
        dm.push(D_('v', py+S.pocket.h, y1, px+S.pocket.w/2, fmt(S.pocket.y), 1));
      }
      if(carrier) interiorOn(d, dm, pw/2, yRim, 1, sa, which.toLowerCase());
      if(deco) placeElements(d, dm, {face:which.toLowerCase(), cx:pw/2, rimY:yRim, dir:1, sa});
      if(carrier && !front) placeElements(d, dm, {face:'inside', cx:pw/2, rimY:yRim, dir:1, sa});
      if(deco && front){
        // a bucket has no gusset, so anything that would live on one goes beside the seams
        placeElements(d, dm, {face:'gusset', cx:sa + 14, rimY:yRim, dir:1, sa});
        if(S.strap.type==='fixed' || S.strap.type==='adjust'){
          const K2 = S.strap, fl = Math.max(18, K2.tabLen), sw = K2.width;
          const swivel = K2.attach==='swivel';
          // in from the side seam: she may not want the tab sitting right on the join
          const inn = Math.max(0, Math.min(pw/2 - sa - sw - 4, K2.anchorX || 0));
          [sa + 4 + inn, pw - sa - 4 - sw - inn].forEach((sx4,i)=>{
            attachOn(d, sx4, yRim + K2.anchorY, sw, fl, swivel?'tabbox':'strapbox',
                     swivel?'D-ring tab to the side seam':'Strap end to the side seam',
                     {axis:'y', deg:(i?-1:1)*(K2.tabRot||0),
                      label:i===0?(swivel?'TAB':'STRAP'):'', xbox:!swivel && K2.tabFix==='stitch'});
          });
          dm.push(D_('v', yRim, yRim + K2.anchorY, pw/2 + 20, fmt(K2.anchorY), 2));
        }
      }
      if(deco && drawOn()) drawOnRim(d, dm, sa, pw-sa, yRim, 1, front, sa, 0.5);
      dm.push(D_('h',0,pw,-9,fmt(pw)));
      dm.push(D_('v',0,ph,-9,fmt(ph)));
      out.push(P({key:tag+which, name:which+' half'+(tag?' \u00b7 '+tag:''), mat, w:pw, h:ph, draw:d, dims:dm, seam:2*H+halfP,
        formula:`half the way round the base = ${fmt(halfP)}, + 2 \u00d7 SA ${fmt(sa)} = ${fmt(pw)}\n`+
                `height = ${rext?`mouth turn ${fmt(rim)} + roll ${fmt(rext)} + `:`rim ${fmt(rim)} + `}H ${fmt(H)} + SA ${fmt(sa)} = ${fmt(ph)}\n`+
                `The base is an ellipse ${fmt(W)} \u00d7 ${fmt(D)}, so all the way round is ${fmt(per)}. Straight sides: a flared bucket is a cone, and a cone does not unroll into a rectangle.`}));
    });

    const bw = W + 2*sa, bh = D + 2*sa;
    const bd = [{t:'cut', d:poly(basePts(a+sa, b+sa).map(q=>[bw/2+q[0], bh/2+q[1]]))},
      SL('basejoin','Body to base', baseRun(bw/2, bh/2, a, b, 0, BASE_N/2), {planLen:halfP}),
      SL('basejoin','Body to base', baseRun(bw/2, bh/2, a, b, BASE_N/2, BASE_N), {planLen:halfP}),
      {t:'ctr', d:hLine(0,bw,bh/2)}, {t:'ctr', d:vLine(bw/2,0,bh)},
      {t:'notch', x:bw/2 + a, y:bh/2, dir:'left'}, {t:'notch', x:bw/2 - a, y:bh/2, dir:'right'},
      {t:'text', x:bw/2, y:bh/2+2, s:'BASE'+(tag?' \u00b7 '+tag.toUpperCase():''), size:7, anchor:'middle', dim:true},
      {t:'text', x:bw/2, y:bh/2+9, s:'THE TWO NOTCHES ARE THE SIDE SEAMS', size:3.6, anchor:'middle', mark:true}];
    if(deco) placeElements(bd, [], {face:'base', cx:bw/2, rimY:bh/2 - b, dir:1, sa});
    out.push(P({key:tag+'Base', name:'Base'+(tag?' \u00b7 '+tag:''), mat, w:bw, h:bh, draw:bd, seam:per,
      dims:[D_('h',0,bw,-9,fmt(bw)), D_('v',0,bh,-9,fmt(bh))],
      formula:`An ellipse ${fmt(W)} \u00d7 ${fmt(D)} finished, + SA ${fmt(sa)} all round.\n`+
              `Its edge measures ${fmt(per)}, which is exactly what the two body halves add up to \u2014 the run is taken off this drawing, not off a formula, so the two always agree.\n`+
              `Stitch it to the front half first, from notch to notch, then the back half.`}));
  }

  if(S.construction==='boxed'){
    const c  = D/2 + sa;
    const rext = rollExt();
    const Wr = W + D + 2*sa;
    const Hr = 2*(rim + rext + H + D/2);
    const mid = Hr/2, faceBot = mid + D/2;
    const yRimB = rim + rext, yRimF = Hr - rim - rext;   // finished rims, back and front
    const d=[], dm=[];
    // the two long outer edges are the ones that go hollow, so they carry the crown
    d.push({t:'cut', d:[
      `M 0 0 H ${nn(Wr)} ${crownSeg([Wr,0],[Wr,mid-c],[1,0])} H ${nn(Wr-c)} V ${nn(mid+c)} H ${nn(Wr)}`,
      `${crownSeg([Wr,mid+c],[Wr,Hr],[1,0])} H 0 ${crownSeg([0,Hr],[0,mid+c],[-1,0])} H ${nn(c)}`,
      `V ${nn(mid-c)} H 0 ${crownSeg([0,mid-c],[0,0],[-1,0])} Z`].join(' ')});
    d.push({t:'fold', d:hLine(0,Wr,mid), label:'FOLD \u2014 BASE CENTRE'});
    d.push(SL('boxside','Side seam', [['L',sa,rim,sa,mid-c]], {trim:sa}));
    d.push(SL('boxside','Side seam', [['L',Wr-sa,rim,Wr-sa,mid-c]], {trim:sa}));
    d.push(SL('boxside','Side seam', [['L',sa,mid+c,sa,Hr-rim]], {trim:sa}));
    d.push(SL('boxside','Side seam', [['L',Wr-sa,mid+c,Wr-sa,Hr-rim]], {trim:sa}));
    if(rext>0){
      [[rim, yRimB, 1],[Hr-rim, yRimF, -1]].forEach(e=>{
        rollMarks(d, sa, Wr-sa, e[0], e[1], e[2], sa, live, SL);
        d.push({t:'fold', d:hLine(0,Wr,e[1]), label:'RIM \u2014 THE BAG ENDS HERE'});
        d.push({t:'notch', x:0, y:e[1], dir:'right'});
        d.push({t:'notch', x:Wr, y:e[1], dir:'left'});
      });
      dm.push(D_('v', rim, yRimB, sa+7, fmt(rext)+' roll', 1));
    }
    // the boxing line sits SA inside the notch edge and stops on the side seam's own line
    /* The two lines at each boxed corner meet each other when the cut-out is folded shut, so
       the nth hole on one has to be the nth hole on the other: two runs sharing a key, both
       walked outward from the side seam. Drawn as one run the hole on the join between them
       was drawn once and the two lines came out a hole apart. */
    [[sa, c], [Wr-sa, Wr-c]].forEach(e =>
      [mid-c-sa, mid+c+sa].forEach(y =>
        d.push(SL('boxing','Corner boxing', [['L', e[0], y, e[1], y]], {even:true, trim:sa}))));
    d.push({t:'notch', x:c, y:mid-c, dir:'right'}); d.push({t:'notch', x:c, y:mid+c, dir:'right'});
    d.push({t:'notch', x:Wr-c, y:mid-c, dir:'left'}); d.push({t:'notch', x:Wr-c, y:mid+c, dir:'left'});
    if(rim>0){ d.push({t:'fold', d:hLine(0,Wr,rim), label:'TURN', band:[0,0,Wr,rim]});
               d.push({t:'fold', d:hLine(0,Wr,Hr-rim), label:'TURN', band:[0,Hr-rim,Wr,rim]}); }
    if(S.top==='zip'){ zipOnRim(d, sa, Wr-sa, rim, 1, sa, live, rim); zipOnRim(d, sa, Wr-sa, Hr-rim, -1, sa, live, rim); }
    else if(rimRowOn()){
      const ri = rim + Math.max(3,sa);
      [ri, Hr-ri].forEach((y,i)=>{
        d.push(SL('rim','Rim, front and back', [['L', sa, y, Wr-sa, y]], {even:true, trim:sa, ins:y}));
        d.push({t:'text', x:sa+3, y:y + (i?4.8:-1.6), s:rimNote(), size:3.6, anchor:'start', mark:true, rot:i?180:0});
      });
    }
    d.push({t:'mark', d:hLine(0,Wr,faceBot), label:'FRONT FACE STARTS'});
    d.push({t:'mark', d:hLine(0,Wr,mid-D/2), label:'BACK FACE STARTS'});
    if(rext>0){ d.push({t:'text', x:Wr/2, y:mid-2, s:'BOTH ROLL SECTIONS ARE PART OF THE SAME TUBE \u2014 THE SIDE SEAM RUNS RIGHT TO THE MOUTH', size:4, anchor:'middle', mark:true}); }
    d.push({t:'ctr', d:vLine(Wr/2,0,Hr)});
    d.push({t:'text', x:sa+8, y:mid+D/2+H*0.93, s:'FRONT'+(tag?' \u00b7 '+tag.toUpperCase():''), size:8, anchor:'start', dim:true});
    d.push({t:'text', x:Wr-sa-8, y:mid-D/2-H*0.93, s:'BACK'+(tag?' \u00b7 '+tag.toUpperCase():''), size:8, anchor:'start', dim:true, rot:180});
    d.push({t:'text', x:c+4, y:mid-c-3, s:'CUT OUT \u2014 BOXES THE CORNER', size:4.4, anchor:'start', mark:true});
    d.push({t:'grain', x:Wr-11, y:mid, len:Math.min(90,Hr*0.3), dir:'v'});
    if(deco){
      if(S.pocket.on){
        const px = Wr/2 + S.pocket.x - S.pocket.w/2, py = faceBot + S.pocket.y;
        d.push({t:'mark', d:rr(px,py,S.pocket.w,S.pocket.h,S.pocket.radius)});
        d.push(SL('pocket','Front pocket to panel', openRectRun(px,py,px+S.pocket.w,py+S.pocket.h,S.pocket.radius), {even:true, trim:sa, ins:null}));
        d.push({t:'text', x:px+S.pocket.w/2, y:py+S.pocket.h/2+2, s:'POCKET', size:5, anchor:'middle', mark:true, rot:180});
        dm.push(D_('v', faceBot, py, px+S.pocket.w/2, fmt(S.pocket.y),1));
      }
      if(S.top==='flap' && S.flap.closure!=='none')
        closureXs(Wr/2, Wr - 2*sa).forEach((cq,i)=>
          d.push({t:'hole', x:cq, y:Hr-rim-(S.flap.drop+pullDrop()-S.flap.cInset), r:3, label:i===0?CLOSURE_LABEL():''}));
      if(S.top==='magnet'){ d.push({t:'hole', x:Wr/2, y:yRimF-18, r:3, label:'MAGNET'}); d.push({t:'hole', x:Wr/2, y:yRimB+18, r:3, label:'MAGNET'}); }
      if(rext>0){
        rollClosureOn(d, dm, Wr/2, Hr-rim, yRimF, sa, Wr-sa, -1, 'front', sa);
        rollClosureOn(d, dm, Wr/2, rim, yRimB, sa, Wr-sa, 1, 'back', sa);
      }
      if(S.top==='flap' && S.flap.attach>0){
        // the finished back face is only W wide - D/2 of the blank wraps round each side
        const fx0 = sa + D/2, fx1 = Wr - sa - D/2, fy = rim + S.flap.attach;
        d.push(SL('flapattach','Flap to back panel', [['L',fx0,fy,fx1,fy]], {even:true, trim:sa, ins:null}));
        d.push({t:'text', x:fx0+3, y:fy-1.6, s:'FLAP STITCHES HERE', size:3.8, anchor:'start', mark:true});
        d.push({t:'notch', x:fx0, y:fy, dir:'right'}); d.push({t:'notch', x:fx1, y:fy, dir:'left'});
      }
      if(S.strap.type==='handles'){
        const Hd = S.handles, ay = Hd.anchorY, hf = handleFoot();
        [Wr/2 - Hd.span/2 - hf.w/2, Wr/2 + Hd.span/2 - hf.w/2].forEach((hx,i)=>{
          attachOn(d, hx, yRimB + ay, hf.w, hf.h, hf.key, hf.name,
                   {axis:'y', label:i===0?hf.label+' \u00b7 BACK':'', fix:Hd.fix, rivetSpec:rivetSpecAt(Hd),
                    tipShape:S.strap.tip, through:hf.key==='handlering', xbox:hf.xbox && Hd.fix==='stitch'});
          attachOn(d, hx, yRimF - ay - hf.h, hf.w, hf.h, hf.key, hf.name,
                   {axis:'y', far:'start', rot:180, label:i===0?hf.label+' \u00b7 FRONT':'', fix:Hd.fix, rivetSpec:rivetSpecAt(Hd),
                    tipShape:S.strap.tip, through:hf.key==='handlering', xbox:hf.xbox && Hd.fix==='stitch'});
        });
        dm.push(D_('h', Wr/2 - Hd.span/2, Wr/2 + Hd.span/2, yRimB + ay - 5, fmt(Hd.span), 1));
        dm.push(D_('v', yRimB, yRimB + ay, Wr/2 - Hd.span/2 - 7, fmt(ay), 1));
      } else if(S.strap.type==='pack'){
        const Kp = S.strap, s2 = Math.min(Kp.packSpan/2, Wr/2 - Kp.width);
        [[-1, yRimB + Kp.anchorY, s2, 'end'],[1, yRimB + Kp.anchorY, s2, 'end'],
         [-1, yRimB + H - Kp.tabLen - 8, s2*0.55, 'start'],[1, yRimB + H - Kp.tabLen - 8, s2*0.55, 'start']].forEach((a,i)=>{
          attachOn(d, Wr/2 + a[0]*a[2] - Kp.width/2, a[1], Kp.width, Kp.tabLen, 'packanchor', 'Pack strap to back panel',
                   {axis:'y', far:a[3], fix:Kp.tabFix, rivetSpec:strapRivetSpec(), label:i===0?'STRAP':'', xbox:Kp.tabFix==='stitch'});
        });
      } else if(S.strap.type!=='none'){
        const K = S.strap, fl = Math.max(18, K.tabLen), sw = K.width;
        const inn4 = Math.max(0, Math.min(Wr/2 - sa - sw - 5, K.anchorX || 0));
        [sa + 5 + inn4, Wr - sa - 5 - sw - inn4].forEach((sx,i)=>{
          attachOn(d, sx, yRimB + K.anchorY, sw, fl, K.attach==='swivel'?'tabbox':'strapbox',
                   K.attach==='swivel'?'D-ring tab to body':'Strap end to body',
                   {axis:'y', deg:(i?-1:1)*(K.tabRot||0),
                    label:i===0?(K.attach==='swivel'?'TAB':'STRAP'):'',
                    xbox:K.attach!=='swivel' && S.strap.tabFix==='stitch'});
        });
      }
    }
    if(carrier){ interiorOn(d, dm, Wr/2, yRimB, 1, sa, 'back'); interiorOn(d, dm, Wr/2, yRimF, -1, sa, 'front'); }
    if(deco){
      placeElements(d, dm, {face:'back',  cx:Wr/2, rimY:yRimB, dir:1,  sa});
      placeElements(d, dm, {face:'front', cx:Wr/2, rimY:yRimF, dir:-1, sa});
    }
    if(carrier) placeElements(d, dm, {face:'inside', cx:Wr/2, rimY:yRimB, dir:1, sa});
    // the bottom of a barrel is the line halfway round the tube from its top seam
    if(deco) placeElements(d, dm, {face:'base', cx:Wr/2, rimY:mid - D/2, dir:1, sa});
    dm.push(D_('h',0,Wr,-9,fmt(Wr)));
    dm.push(D_('v',0,Hr,-9,fmt(Hr)));
    dm.push(D_('h',0,c,mid-c-4,fmt(c),1));
    dm.push(D_('v',mid-c,mid+c,c+6,fmt(2*c),1));
    out.push(P({key:tag+'Body', name:'Body \u2014 one piece'+(tag?' \u00b7 '+tag:''), mat, w:Wr, h:Hr, draw:d, dims:dm, seam:2*(rim+H+D/2)+2*D,
      formula:`corner cut-out c = D/2 ${fmt(D/2)} + SA ${fmt(sa)} = ${fmt(c)}\n`+
              `width = W ${fmt(W)} + D ${fmt(D)} + 2 \u00d7 SA ${fmt(sa)} = ${fmt(Wr)}\n`+
              `height = 2 \u00d7 (${rext?`mouth turn ${fmt(rim)} + roll ${fmt(rext)}`:`rim ${fmt(rim)}`} + H ${fmt(H)} + D/2 ${fmt(D/2)}) = ${fmt(Hr)}\n`+
              (rext?`The roll is ${Math.max(1,Math.round(S.roll.turns))} turns of ${fmt(rext/Math.max(1,Math.round(S.roll.turns)))} at each end \u2014 the side seams run right up to the mouth.\n`:'')+
              `Sewing the cut-out closed gives depth 2 \u00d7 (c \u2212 SA) = ${fmt(D)}`}));
  }

  if(S.construction==='fold'){
    const pw = W + 2*sa;
    const rext = rollExt();
    const drop = S.top==='flap'? S.flap.drop : 0;
    const over = S.top==='flap'? D + 2*t : 0;
    const L = rim + rext + H + D + H + rext + over + drop + rim;
    const yFrontRim = rim + rext, yBase = yFrontRim+H, yBack = yBase+D, yBackRim = yBack+H, yFlapTop = yBackRim+rext+over;
    const d=[], dm=[];
    let cutD;
    if(S.top==='flap' && S.flap.style==='point'){
      cutD = poly([[0,0],[pw,0],[pw,yFlapTop],[pw,L-Math.min(pw/2,drop)],[pw/2,L],[0,L-Math.min(pw/2,drop)],[0,yFlapTop]]);
    } else if(S.top==='flap' && S.flap.style==='round'){
      cutD = rr(0,0,pw,L,{tl:0,tr:0,br:S.flap.radius,bl:S.flap.radius});
    } else cutD = rr(0,0,pw,L,0);
    d.push({t:'cut', d:cutD});
    [[yFrontRim, rext?'RIM \u2014 THE BAG ENDS HERE':'TURN'],[yBase,'FOLD \u2014 BASE'],[yBack,'FOLD \u2014 BASE'],
     [yBackRim, rext?'RIM \u2014 THE BAG ENDS HERE':'FOLD \u2014 BACK RIM'],[yFlapTop,'FOLD \u2014 TOP FRONT EDGE']]
      .filter(f=>f[0]>0 && f[0]<L && (f[1]!=='TURN'||rim>0))
      .forEach(f=>d.push({t:'fold', d:hLine(0,pw,f[0]), label:f[1]}));
    d.push({t:'ctr', d:vLine(pw/2,0,L)});
    /* THE NOTE POCKET. On a wallet the two layers are stitched to each other up both sides and
       folded at the base - and deliberately NOT along the two top edges, because that open
       full-width gap between them IS the note pocket. Stitching the rims is what would sew it
       shut, and a bifold with nowhere to put a note is not a bifold. */
    const notePkt = D < 12 && S.lined && S.top !== 'zip';
    if(S.top==='zip'){ zipOnRim(d, sa, pw-sa, rim, 1, sa, live, rim); zipOnRim(d, sa, pw-sa, yBackRim, -1, sa, live, rim); }
    else if(notePkt){
      [rim + Math.max(3,sa), L - rim - Math.max(3,sa) - over - drop].forEach((y,i)=>
        d.push({t:'text', x:pw/2, y, s:'LEAVE THIS EDGE OPEN \u2014 IT IS THE MOUTH OF THE NOTE POCKET',
                size:3.6, anchor:'middle', mark:true, rot:i?180:0}));
    }
    else if(rimRowOn()){
      [rim + Math.max(3,sa), L - rim - Math.max(3,sa) - over - drop].forEach(y=>
        d.push(SL('rim','Rim, front and back', [['L', sa, y, pw-sa, y]], {even:true, trim:sa, ins:y})));
    }
    if(rext>0){
      rollMarks(d, sa, pw-sa, rim, yFrontRim, 1, sa, live, SL);
      rollMarks(d, sa, pw-sa, yBackRim+rext, yBackRim, -1, sa, live, SL);
      dm.push(D_('v', rim, yFrontRim, sa+7, fmt(rext)+' roll', 1));
    }
    d.push(SL('wrapside','Wrap to side gusset', [['L',sa,rim,sa,yBackRim+rext]], {even:true, trim:sa}));
    d.push(SL('wrapside','Wrap to side gusset', [['L',pw-sa,rim,pw-sa,yBackRim+rext]], {even:true, trim:sa}));
    d.push({t:'text', x:sa+7, y:yFrontRim+H*0.9, s:'FRONT', size:7, anchor:'start', dim:true});
    d.push({t:'text', x:sa+7, y:yBack+H*0.9, s:'BACK', size:7, anchor:'start', dim:true});
    if(drop) d.push({t:'text', x:sa+7, y:yFlapTop+Math.min(drop*0.5,26), s:'FLAP', size:7, anchor:'start', dim:true});
    d.push({t:'grain', x:pw-11, y:L/2, len:Math.min(90,L*0.25), dir:'v'});
    if(deco && S.top==='flap')
      placeElements(d, dm, {face:'top', cx:pw/2, rimY:yBackRim, dir:1, sa});
    if(deco && S.top==='flap' && S.flap.closure!=='none'){
      const xs3 = closureXs(pw/2, W);
      if(pullOn()) xs3.forEach((cq,i)=>attachOn(d, cq - pullW()/2, L - pullLift() - pullAttach(), pullW(), pullAttach(),
                     'pulltab', 'Pull tab to flap',
                     {axis:'y', far:'end', fix:S.flap.pull.fix, rivetSpec:rivetSpecAt(S.flap.pull),
                      r:S.flap.pull.r, label:i===0?'PULL TAB':''}));
      else xs3.forEach((cq,i)=>d.push({t:'hole', x:cq, y:L-S.flap.cInset, r:3, label:i===0?CLOSURE_LABEL():''}));
      xs3.forEach((cq,i)=>d.push({t:'hole', x:cq, y:yFrontRim+(drop+pullDrop()-S.flap.cInset), r:3,
                                  label:i===0?CLOSURE_LABEL()+' \u2014 MATE':''}));
    }
    if(carrier){ interiorOn(d, dm, pw/2, yBackRim, -1, sa, 'back'); interiorOn(d, dm, pw/2, yFrontRim, 1, sa, 'front'); }
    /* A wallet is a flat lamination, not a bag with a lining dropped into it: card slots and a
       note pocket are stitched to the INSIDE panel, on whichever half they belong to, before
       the two layers are put together. So on one its front and back faces are the two inside
       halves and they are drafted onto the lining rather than onto the outer. */
    const inner = D < 12 && S.lined;
    const halves = (dd, mm) => {
      placeElements(dd, mm, {face:'front', cx:pw/2, rimY:yFrontRim, dir:1,  sa});
      placeElements(dd, mm, {face:'back',  cx:pw/2, rimY:yBackRim,  dir:-1, sa});
    };
    if(deco){
      if(!inner) halves(d, dm);
      if(rext>0){
        rollClosureOn(d, dm, pw/2, rim, yFrontRim, sa, pw-sa, 1, 'front', sa);
        rollClosureOn(d, dm, pw/2, yBackRim+rext, yBackRim, -1, sa, pw-sa, -1, 'back', sa);
      }
    }
    if(carrier){
      placeElements(d, dm, {face:'inside', cx:pw/2, rimY:yBackRim, dir:-1, sa});
      if(inner) halves(d, dm);
    }
    if(D>0 && deco) { /* side gusset elements are placed with the gusset below */ }
    if(deco && S.pocket.on){
      const px = pw/2 + S.pocket.x - S.pocket.w/2, py = yBase - S.pocket.y - S.pocket.h;
      d.push({t:'mark', d:rr(px,py,S.pocket.w,S.pocket.h,S.pocket.radius)});
      d.push(SL('pocket','Front pocket to panel', openRectRun(px,py,px+S.pocket.w,py+S.pocket.h,S.pocket.radius), {even:true, trim:sa, ins:null}));
      d.push({t:'text', x:px+S.pocket.w/2, y:py+S.pocket.h/2+2, s:'POCKET', size:5, anchor:'middle', mark:true});
    }
    dm.push(D_('h',0,pw,-9,fmt(pw)));
    dm.push(D_('v',0,L,-9,fmt(L)));
    dm.push(D_('v',yFrontRim,yBase,sa+7,fmt(H),1));
    if(D>0) dm.push(D_('v',yBase,yBack,sa+7,fmt(D),1));
    if(drop) dm.push(D_('v',yFlapTop,L,sa+7,fmt(drop),1));
    out.push(P({key:tag+'Wrap', name:'Wrap panel'+(tag?' \u00b7 '+tag:''), mat, w:pw, h:L, draw:d, dims:dm, seam:2*(H+D),
      formula:`length = rim ${fmt(rim)}${rext?` + roll ${fmt(rext)}`:''} + front H ${fmt(H)} + base D ${fmt(D)} + back H ${fmt(H)}${rext?` + roll ${fmt(rext)}`:''}`+
              (drop?` + over the top (D ${fmt(D)} + 2 \u00d7 thickness ${fmt(2*t)}) + flap drop ${fmt(drop)}`:'')+` + rim ${fmt(rim)} = ${fmt(L)}\n`+
              `width = W ${fmt(W)} + 2 \u00d7 SA ${fmt(sa)} = ${fmt(pw)}`}));
    if(D>0){
      const gwid = D + 2*sa, tp = Math.min(S.taper,D*0.7);
      // the side edges slant by tp/2, so the piece is drafted shorter for them to measure H
      const gTop = rim + rext;                       // the roll runs straight up the side gusset too
      const ghei = gTop + sa + Math.sqrt(Math.max(1, H*H - (tp/2)*(tp/2)));
      const run = [['L', tp/2+sa, rim, tp/2+sa, gTop], ['L', tp/2+sa, gTop, sa, ghei-sa],
                   ['L', sa, ghei-sa, gwid-sa, ghei-sa],
                   ['L', gwid-sa, ghei-sa, gwid-tp/2-sa, gTop], ['L', gwid-tp/2-sa, gTop, gwid-tp/2-sa, rim]];
      const gdm=[];
      const gd=[{t:'cut', d:polyE(rext>0 ? [[tp/2,0],[gwid-tp/2,0],[gwid-tp/2,gTop],[gwid,ghei],[0,ghei],[tp/2,gTop]]
                                        : [[tp/2,0],[gwid-tp/2,0],[gwid,ghei],[0,ghei]])},
        SL('wrapside','Wrap to side gusset', run.filter(sg=>segLen(sg)>1e-9), {even:true, trim:sa}),
        {t:'ctr', d:vLine(gwid/2,0,ghei)},
        {t:'text', x:gwid/2, y:ghei*0.55, s:'SIDE', size:6, anchor:'middle', dim:true},
        {t:'notch', x:gwid/2, y:ghei, dir:'up'}];
      if(rext>0){ gd.push({t:'fold', d:hLine(0,gwid,gTop), label:'RIM'});
        gd.push({t:'text', x:gwid/2, y:gTop*0.55, s:'ROLL \u2014 PLEAT IN', size:4.4, anchor:'middle', mark:true}); }
      if(deco) placeElements(gd, gdm, {face:'gusset', cx:gwid/2, rimY:gTop, dir:1, sa});
      out.push(P({key:tag+'SideG', name:'Side gusset'+(tag?' \u00b7 '+tag:''), mat, w:gwid, h:ghei, qty:2, draw:gd, seam:2*H+D,
        dims:[D_('h',0,gwid,ghei+9,fmt(gwid)), D_('v',0,ghei,-9,fmt(ghei)), D_('h',tp/2,gwid-tp/2,-9,fmt(gwid-tp),1)].concat(gdm),
        formula:`base width = D ${fmt(D)} + 2 \u00d7 SA ${fmt(sa)} = ${fmt(gwid)}\nheight = rim ${fmt(rim)} + H ${fmt(H)} + SA ${fmt(sa)} = ${fmt(ghei)}`+
                (tp?`\ntapers to ${fmt(gwid-tp)} at the rim`:'')}));
    }
  }
  /* A lining panel is hidden by default because you cut it from the shell pattern. That only
     holds while it IS the shell: the moment something is stitched to it - a slip pocket, a zip
     window, a card stack, anything on the inside face - it carries a row that the shell pattern
     does not have, and you would be marking that row off a drawing that was never printed.
     "Where does the slip pocket stitch to?" was exactly that. A lining piece with a seam of its
     own is a piece in its own right and is always drawn. */
  out.forEach(p => p.derived = !!tag && !p.draw.some(it => it && it.t === 'seam'));
  return out;
}

/** The flap's free edge: down one side, round whatever shape the tip is, back up the other. */
function flapEdgeRun(cw, L, yTop, F, rad){
  const i = S.sa, x0 = i, x1 = cw - i, y1 = L - i;
  if(F.style === 'point'){
    const pd = Math.min((x1-x0)/2, F.drop*0.9);
    return [['L', x0, yTop, x0, y1-pd], ['L', x0, y1-pd, (x0+x1)/2, y1],
            ['L', (x0+x1)/2, y1, x1, y1-pd], ['L', x1, y1-pd, x1, yTop]];
  }
  if(F.style === 'round'){
    const r = Math.max(0, Math.min(rad - i, (x1-x0)/2, y1-yTop));
    const run = [['L', x0, yTop, x0, y1-r]];
    if(r > 0) run.push(['A', x0+r, y1-r, r, Math.PI, Math.PI/2]);
    run.push(['L', x0+r, y1, x1-r, y1]);
    if(r > 0) run.push(['A', x1-r, y1-r, r, Math.PI/2, 0]);
    run.push(['L', x1, y1-r, x1, yTop]);
    return run.filter(s => segLen(s) > 1e-9);
  }
  return [['L', x0, yTop, x0, y1], ['L', x0, y1, x1, y1], ['L', x1, y1, x1, yTop]];
}

function CLOSURE_LABEL(){
  return {turnlock:'TURNLOCK', magnet:'MAGNET', stud:'STUD', strap:'BUCKLE', none:''}[S.flap.closure];
}
/* ---------- closures ----------
   One in the middle is the default and always was. Two, set apart, is what a wide flap
   actually wants: a single lock in the centre lets both corners lift off the bag. */
function closureN(){ return Math.max(1, Math.min(2, Math.round(S.flap.closures || 1))); }
function closureXs(cx, w){
  if(closureN() < 2) return [cx];
  const span = Math.max(24, Math.min(S.flap.cSpan, (w || S.W) - 40));
  return [cx - span/2, cx + span/2];
}
/* A pull tab hangs off the tip of the flap and takes the closure with it: the lock sits on
   the tab and its mate on the body drops by however far the tab hangs. It is a separate
   piece with its own width, length and end shape, because it is the part of a bag that gets
   handled most and the first one anybody looks at. */
function pullOn(){
  return S.top==='flap' && S.flap.closure!=='none' && !!(S.flap.pull && S.flap.pull.on);
}
function pullDrop(){ return pullOn() ? Math.max(6, S.flap.pull.drop) : 0; }
/** How far up from the flap's tip the tab's stitch box sits. The flap has its own edge row
    one seam allowance in from the tip; putting the box hard against the tip drew the two on
    the same line. Lift it clear, and give the tab that much more length under the flap. */
function pullLift(){ return pullOn() ? Math.max(3, S.sa) + 3 : 0; }
function pullW(){ return Math.max(10, S.flap.pull.w); }
function pullAttach(){ return Math.max(10, S.flap.pull.attach); }
