/* ============================================================
   RENDER - the inside, laid open
   You cannot design an interior against a pattern sheet. This is the bag cut at one
   corner and unrolled: every wall side by side, rim along the top, everything that
   lives in there drawn where it lives. The section underneath is the part you cannot
   get any other way - how far down each fitting hangs, and whether two of them are
   about to fight over the same space.
   ============================================================ */
let IDRAGS = [];
/** Every interior fitting, as {label, face, top, h, w, x, kind}. Depths are down from the rim. */
function insideFittings(){
  const out = [], sa = S.sa;
  if(S.lined && S.slip.on)
    out.push({key:'slip', label:'slip pocket', face:S.slip.face||'back', top:S.slip.y, h:S.slip.h,
              w:S.slip.w, x:S.slip.x, kind:'pocket', px:'slip.x', py:'slip.y',
              pw:'slip.w', ph:'slip.h'});
  if(S.lined && S.zipPkt.on)
    out.push({key:'zipPkt', label:'zip pocket', face:S.zipPkt.face||'back', top:S.zipPkt.y, h:S.zipPkt.h,
              w:S.zipPkt.w, x:0, kind:'zip', py:'zipPkt.y', pw:'zipPkt.w', ph:'zipPkt.h'});
  if(S.cards.on)
    out.push({key:'cards', label:cardSlotN()+' card slots', face:S.cards.face||'back', top:S.cards.y,
              h:cardStackH() + sa, w:cardSlotW() + 2*sa, x:S.cards.x, kind:'cards',
              px:'cards.x', py:'cards.y', pw:'cards.w', ph:'cards.h'});
  S.elements.filter(e=>e.face==='inside').forEach(e=>{
    const bb = rotBox(e.w, elFootH(e), e.rot||0);
    out.push({key:'el'+e.id, label:ELTYPES[e.type].name.toLowerCase()+' '+e.id, face:'back',
              top:e.y, h:bb.h, w:bb.w, x:e.x, kind:'el', el:e.id});
  });
  return out;
}
function renderInside(){
  IDRAGS = [];
  const W = S.W, D = Math.max(S.D, 10), sa = S.sa;
  // a barrel is measured from the top seam down round the tube, not from a rim down a wall
  const H = S.construction==='barrel' ? basePerim(Math.max(20,S.H/2), Math.max(12,S.D/2))/2 : S.H;
  const F = insideFittings();
  if(!S.lined && !F.length)
    return `<p class="note">Nothing lives in here yet. Turn the lining on, or add a slip pocket, card
            slots or an inside element, and this is where you will place them.</p>`;
  const gap = 16, ox = 46, oy = 42;
  // a bucket has no side walls: it is one tube, so it unrolls into two halves and no more
  const halfP = S.construction==='bucket' ? basePerim(W/2, Math.max(12,D/2))/2 : 0;
  const walls = S.construction==='barrel'
    ? [{id:'front', w:W, label:'INSIDE FRONT HALF'}, {id:'back', w:W, label:'INSIDE BACK HALF'}]
    : S.construction==='bucket'
    ? [{id:'front', w:halfP, label:'INSIDE FRONT HALF'}, {id:'back', w:halfP, label:'INSIDE BACK HALF'}]
    // a wallet has no side walls at all: two faces and the fold between them
    : (S.construction==='fold' && S.D < 12)
    ? [{id:'front', w:W, label:'INSIDE FRONT HALF'}, {id:'back', w:W, label:'INSIDE BACK HALF'}]
    : [
    {id:'front', w:W,  label:'INSIDE FRONT'},
    {id:'right', w:D,  label:'RIGHT'},
    {id:'back',  w:W,  label:'INSIDE BACK'},
    {id:'left',  w:D,  label:'LEFT'}
  ];
  let wx = ox;
  walls.forEach(v=>{ v.x = wx; wx += v.w + gap; });
  const unrollW = wx - gap;
  const secX = unrollW + 64;
  const vw = secX + Math.max(D, 40) + 210, vh = oy + H + 74;
  const fs = Math.max(9, vw/86);
  const T = (x,y,s2,anch,cls,size) => `<text x="${nn(x)}" y="${nn(y)}" font-size="${nn(size||fs)}" text-anchor="${anch||'middle'}" class="${cls||'ev-t'}">${esc(s2)}</text>`;
  let o = `<svg viewBox="0 0 ${nn(vw)} ${nn(vh)}" id="insidesvg" xmlns="http://www.w3.org/2000/svg">`;
  /* Everything in here can be pulled to size as well as dragged into place - typing a number
     into the rail to find out whether a pocket is too deep is the slow way round. The rails
     are the same two things they are on the elevations: a fat invisible line on the edge, and
     a short bar just outside it so you can see there is something to take hold of. They are
     collected and drawn last, over the fittings rather than under them. */
  let IGR = '';
  const inGrip = (id, a, b, ax, path, k) => {
    if(!path || !LIM[path]) return;
    const off = fs*0.55, ux = ax==='x' ? off : 0, uy = ax==='x' ? 0 : off;
    const edge = `M ${nn(a[0])} ${nn(a[1])} L ${nn(b[0])} ${nn(b[1])}`;
    const at = f2 => [nn(a[0] + (b[0]-a[0])*f2 + ux), nn(a[1] + (b[1]-a[1])*f2 + uy)];
    const q0 = at(0.28), q1 = at(0.72);
    const rail = `M ${q0[0]} ${q0[1]} L ${q1[0]} ${q1[1]}`;
    IGR += `<g class="ev-gk" id="${id}">`
        + `<path d="${rail}" class="ev-gripr"/><path d="${rail}" class="ev-gripv"/>`
        + `<path d="${edge}" class="ev-grip ${ax}"/><path d="${rail}" class="ev-grip ${ax}"/></g>`;
    const lim = LIM[path];
    IDRAGS.push({id, grab: () => +get(path),
      move: (dx, dy, v0) => {
        const v = v0 + k*(ax==='x' ? dx : dy);
        set(path, Math.max(lim[0], Math.min(lim[1], Math.round(v*2)/2)));
        syncInput(path);
      }});
  };

  /* ---- the unrolled walls ---- */
  walls.forEach(v=>{
    const side = v.id==='left' || v.id==='right';
    o += `<rect x="${nn(v.x)}" y="${nn(oy)}" width="${nn(v.w)}" height="${nn(H)}" class="${side?'in-side':'in-wall'}"/>`;
    o += T(v.x + v.w/2, oy + H + fs*1.5, v.label, 'middle', 'ev-tl', fs*(side?0.85:1));
    o += T(v.x + v.w/2, oy + H + fs*2.7, fmt(v.w), 'middle', 'ev-t', fs*0.8);
    if(v.id !== walls[walls.length-1].id)
      o += `<path d="M ${nn(v.x + v.w + gap/2)} ${nn(oy-6)} V ${nn(oy+H+6)}" class="in-corner"/>`;
  });
  o += `<path d="M ${nn(ox-10)} ${nn(oy)} H ${nn(unrollW+10)}" class="in-rim"/>`;
  o += T(ox-14, oy+fs*0.35, 'rim', 'end', 'ev-tl', fs*0.9);
  o += `<path d="M ${nn(ox-10)} ${nn(oy+H)} H ${nn(unrollW+10)}" class="ev-ghost"/>`;
  o += T(ox-14, oy+H+fs*0.35, 'base', 'end', 'ev-t', fs*0.9);

  /* ---- the fittings, where they live ---- */
  const wallOf = id => walls.find(v=>v.id===id);
  // two fittings on one wall really do overlap on a real bag, so they are drawn overlapping -
  // but each gets its own dimension lane and its own label line, or you can read neither
  const lane = {};
  F.forEach((f,i)=>{
    const v = wallOf(f.face) || wallOf('back');
    const fx = v.x + v.w/2 + (f.x||0) - f.w/2, fy = oy + f.top;
    const id = 'in-'+f.key;
    lane[v.id] = (lane[v.id] || 0) + 1;
    const ln = lane[v.id] - 1;
    o += `<g id="${id}" class="in-g${(f.px||f.py)?' drag':''}">`;
    o += `<rect x="${nn(fx)}" y="${nn(fy)}" width="${nn(f.w)}" height="${nn(f.h)}" rx="${nn(f.kind==='cards'?0:2)}" class="in-f in-${f.kind}"/>`;
    if(f.kind==='zip'){
      const G = zipG();
      o += `<path d="M ${nn(fx+4)} ${nn(fy+6)} H ${nn(fx+f.w-4)}" class="ev-zchain" stroke-width="${nn(G.teeth)}"/>`;
    }
    if(f.kind==='cards')
      for(let i2=1;i2<cardSlotN();i2++)
        o += `<path d="M ${nn(fx)} ${nn(fy + f.h - (cardSlotH(i2) + sa))} H ${nn(fx+f.w)}" class="in-rule"/>`;
    // the label sits on the bottom edge, where an overlapping neighbour cannot land on it
    o += T(fx + f.w/2, fy + f.h - 3.5, f.label.toUpperCase(), 'middle', 'in-lab', Math.min(fs*0.9, f.w*0.13));
    o += `</g>`;
    const dx = v.x - 8 - ln*11;
    o += `<path d="M ${nn(dx)} ${nn(oy)} V ${nn(fy)} M ${nn(dx-3)} ${nn(oy)} h 6 M ${nn(dx-3)} ${nn(fy)} h 6" class="ev-dim"/>`;
    o += `<path d="M ${nn(dx)} ${nn(fy)} H ${nn(fx)}" class="ev-ghost"/>`;
    o += `<g transform="translate(${nn(dx-2)},${nn(oy + f.top/2)}) rotate(-90)">${T(0,-2,fmt(f.top),'middle','ev-t',fs*0.75)}</g>`;
    if(f.px || f.py) IDRAGS.push({id, px:f.px, py:f.py, w:f.w, h:f.h});
    // width grows from the middle, because these are placed by their centre; depth grows down
    inGrip(id+'-w', [fx+f.w, fy+3], [fx+f.w, fy+f.h-3], 'x', f.pw, 2);
    inGrip(id+'-h', [fx+3, fy+f.h], [fx+f.w-3, fy+f.h], 'y', f.ph, 1);
  });

  /* ---- the section: what is actually competing for the depth ---- */
  const sy = oy;
  o += `<path d="${rr(secX, sy, D, H, {bl:Math.min(10,D/3), br:Math.min(10,D/3)})}" class="in-sec"/>`;
  o += T(secX + D/2, sy - fs*1.2, 'SECTION', 'middle', 'ev-tl', fs*0.95);
  o += T(secX + D/2, sy + H + fs*1.5, 'cut through the side', 'middle', 'ev-t', fs*0.8);
  o += T(secX + D/2, sy + H + fs*2.7, 'back at the left', 'middle', 'ev-t', fs*0.8);
  const barW = Math.max(5, D*0.22);
  let clash = [];
  // every caption to the right of the section, pushed down until it stops fighting the last one
  let lastY = -1e9;
  F.slice().sort((a,b)=>a.top-b.top).forEach(f=>{
    const back = f.face !== 'front';
    const bx = back ? secX + 1 : secX + D - barW - 1;
    o += `<rect x="${nn(bx)}" y="${nn(sy + f.top)}" width="${nn(barW)}" height="${nn(f.h)}" class="in-f in-${f.kind}"/>`;
    const ly = Math.max(lastY + fs*1.25, sy + f.top + Math.min(f.h*0.5, 12));
    lastY = ly;
    o += `<path d="M ${nn(secX + D + 3)} ${nn(sy + f.top + Math.min(f.h*0.5, 12))} L ${nn(secX + D + 12)} ${nn(ly - fs*0.3)}" class="ev-ghost"/>`;
    o += T(secX + D + 14, ly, (back?'back  ':'front  ') + f.label + '  ' + fmt(f.top) + '\u2013' + fmt(f.top + f.h),
           'start', 'ev-t', fs*0.8);
    if(f.top + f.h > H - 4) clash.push(`the ${f.label} reaches ${fmt(f.top + f.h - H)} past the base`);
  });
  // two things on the same wall overlapping is the thing you cannot see any other way
  for(let i=0;i<F.length;i++) for(let j=i+1;j<F.length;j++){
    const a = F[i], b = F[j];
    if((a.face!=='front') !== (b.face!=='front')) continue;
    const ov = Math.min(a.top+a.h, b.top+b.h) - Math.max(a.top, b.top);
    const across = Math.abs((a.x||0)-(b.x||0)) < (a.w+b.w)/2;
    if(ov > 3 && across) clash.push(`the ${a.label} and the ${b.label} overlap by ${fmt(ov)} on the same wall`);
  }
  o += `<g class="ev-handles">${IGR}</g>`;   // last, so nothing is drawn over a handle
  o += `</svg>`;
  const note = clash.length
    ? `<div class="warn"><b>Watch this:</b> <span>${esc(clash.join('; '))}. Two pockets on one wall are not
       fatal \u2014 leather takes it \u2014 but the outer one will always be hard to get into.</span></div>`
    : `<p class="note">Nothing is fighting for room: every fitting clears the base, and nothing on the same
       wall overlaps anything else.</p>`;
  return `
    <div class="card wide" style="order:4">
      <h3>Inside the bag <span class="tag">the walls unrolled \u00b7 drag a pocket to place it, its edges to size it</span></h3>
      <div class="elevbox insidebox">${o}</div>
      <p class="note" style="padding-top:0">${S.construction==='bucket'
        ? 'Cut at one side seam and rolled out flat, so both halves of the tube lie side by side with the rim along the top.'
        : 'Cut at the left front corner and rolled out flat, so the two big walls and both sides lie side by side with the rim along the top.'}
      Depths are measured down from the rim, which is how you will mark them on the lining.</p>
      ${note}
    </div>`;
}

