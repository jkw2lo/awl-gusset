/* ============================================================
   RENDER \u2014 pattern sheets (true scale, tiled when oversized)
   ============================================================ */
const SHEETS = {A4:[210,297], Letter:[215.9,279.4], A3:[297,420], Tabloid:[279.4,431.8]};
const MARGIN = 8, OVERLAP = 12;
const esc = s => String(s).replace(/[&<>]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
/** esc is for text between tags; an ATTRIBUTE has to survive quotes as well, and the picker
    carries its whole option list in one. */
const escA = s => String(s).replace(/[&<>"']/g,
  c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- keeping the ink readable ----------
   Every note on a piece is worth having on its own; twenty of them on one panel is a mess.
   Text is laid out last, cheapest-to-lose first: a label that cannot find clear space is
   nudged, and if it still will not fit it is dropped rather than printed over something else.
   Piece names and dimensions are never dropped. */
function textBox(it, ts){
  const size = it.size*ts, wid = String(it.s).length * size * 0.62;
  const anch = it.anchor || 'middle';
  const dx = anch==='start' ? 0 : anch==='end' ? -wid : -wid/2;
  const ty = -size*0.82, by = size*0.26;
  if(it.rot){
    // The box turns with the text. Measuring a vertical label as though it were lying
    // down is how a rotated dimension ended up sitting on top of the grain arrow: the
    // collision test was comparing a box that was never there.
    const a = it.rot*Math.PI/180, c = Math.cos(a), s2 = Math.sin(a);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    [[dx,ty],[dx+wid,ty],[dx+wid,by],[dx,by]].forEach(q=>{
      const px = it.x + q[0]*c - q[1]*s2, py = it.y + q[0]*s2 + q[1]*c;
      if(px<x0) x0=px; if(px>x1) x1=px; if(py<y0) y0=py; if(py>y1) y1=py;
    });
    return {x0, y0, x1, y1, size};
  }
  return {x0: it.x+dx, y0: it.y+ty, x1: it.x+dx+wid, y1: it.y+by, size};
}
const hits = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
/** Returns, for each item index, either the text to draw (possibly nudged) or null.
    `bx` is the tile this text belongs to. A note that runs off its own tile lands on the
    neighbouring one, where it reads as that piece's note - so it is shrunk to the width
    available, then slid back inside, and dropped if it still will not fit. */
function placeText(items, ts, bx){
  const placed = [], out = new Array(items.length).fill(null);
  const rank = it => it.pri != null ? it.pri : (it.dim ? 0 : (it.mark ? 2 : 1));
  /* What the maker has done to this label by hand, if anything. Her placement is the one
     thing the pass may not overrule: it is put down first, exactly where she left it, and
     everything else has to find room around it. A label she has struck off is simply gone. */
  const LB = (typeof S !== 'undefined' && S.labels) || {};
  const own = it => (it && it.lk) ? LB[it.lk] : null;
  const order = [];
  items.forEach((it,i)=>{ if(it && it.t==='text' && !(own(it) && own(it).off)) order.push(i); });
  // anything the maker has moved goes down first, then anything rotated: neither is nudged,
  // so everything else has to know where they are before choosing a spot
  order.sort((a,b)=> (own(items[b])?1:0) - (own(items[a])?1:0)
                  || (items[b].rot?1:0) - (items[a].rot?1:0)
                  || rank(items[a]) - rank(items[b]) || a - b);
  for(const i of order){
    let it = items[i];
    const mine = own(it);
    if(mine){
      // hers, and it stays hers - clamped only to its own tile, because a note that runs
      // onto the neighbouring piece reads as that piece's note
      it = Object.assign({}, it, {x: it.x + (mine.dx||0), y: it.y + (mine.dy||0)});
      if(bx){
        const b1 = textBox(it, ts);
        const sx = b1.x0 < bx.x0 ? bx.x0 - b1.x0 : b1.x1 > bx.x1 ? bx.x1 - b1.x1 : 0;
        const sy = b1.y0 < bx.y0 ? bx.y0 - b1.y0 : b1.y1 > bx.y1 ? bx.y1 - b1.y1 : 0;
        if(sx || sy) it = Object.assign({}, it, {x: it.x + sx, y: it.y + sy});
      }
      placed.push(textBox(it, ts));
      out[i] = it;
      continue;
    }
    // A rotated note moves too - along its OWN perpendicular, so it stays parallel to
    // whatever it is labelling. It used to be nailed down, which meant two turned labels
    // in the same place simply sat on top of each other.
    const ra = (it.rot || 0)*Math.PI/180;
    const nx = -Math.sin(ra), ny = Math.cos(ra);
    if(it.rot && !bx){ out[i] = it; placed.push(textBox(it, ts)); continue; }
    // a note may use the whole tile; a count belongs on the leather it is counting
    // the 1 mm inset covers the difference between the estimated box and the real one
    const lim = (bx && it.keep) ? {x0:bx.px0+1, y0:bx.py0+1, x1:bx.px1-1, y1:bx.py1-1} : bx;
    if(bx && !it.rot){
      const wide = lim.x1 - lim.x0;
      const wid = String(it.s).length * it.size * ts * 0.62;
      if(wid > wide) it = Object.assign({}, it, {size: it.size * wide/wid});
      const b0 = textBox(it, ts);
      const sx = b0.x0 < lim.x0 ? lim.x0 - b0.x0 : b0.x1 > lim.x1 ? lim.x1 - b0.x1 : 0;
      if(sx) it = Object.assign({}, it, {x: it.x + sx});
    }
    const at = d2 => Object.assign({}, it, {x: it.x + nx*d2, y: it.y + ny*d2});
    let dy = 0, box = textBox(it, ts), ok = !placed.some(p=>hits(box, p));
    for(let k=0; !ok && k<6; k++){
      dy = (k % 2 ? 1 : -1) * Math.ceil((k+1)/2) * box.size * 1.2;
      box = textBox(at(dy), ts);
      ok = !placed.some(p=>hits(box, p));
    }
    if(!ok) continue;                                  // no room: better silent than illegible
    if(bx && (box.y0 < lim.y0 - 0.5 || box.y1 > lim.y1 + 0.5 ||
              box.x0 < lim.x0 - 0.5 || box.x1 > lim.x1 + 0.5)) continue;   // off where it belongs
    placed.push(box);
    out[i] = dy ? at(dy) : it;
  }
  return out;
}
/* Every scrap of text on a piece goes through ONE placement pass.
   It used not to: only `{t:'text'}` items were laid out, while the hole counts, the fold and
   mark labels, the rivet names and the grain caption were drawn straight down wherever their
   geometry happened to be. On a top handle - 26 mm tall and 400 mm long, with the piece name,
   two notes, the grain arrow and both edge-row counts all sitting at mid-span - that is four
   things in the same 4 mm of paper. Collect them all, rank them, place them together.

   pri 0 = the piece's own name, 1 = a number or a label that belongs to one mark,
   2 = a note. When two collide the higher number gives way, and if it cannot be moved it is
   dropped: a note you cannot read is worse than no note. */
function drawItems(items, ts, lab, bx){
  ts = ts || 1;
  let o0 = '', o = '';                 // o0 is everything that goes UNDER the drawing
  lab = lab || [];
  /* Counting numbers already drawn on this piece. A strap carries an edge row down each
     side, both pricked to the same count, so the tick numbered 20 appears twice - and on
     anything narrow the two point inward at each other and land in the same 3 mm of leather.
     One set is enough: it is the same number, mirrored across the stitching. Where the piece
     is wide enough that they do not touch, both are drawn, because then both are readable. */
  const regDone = [];
  const L = (x, y, str, size, anchor, cls, pri, rot, keep) => {
    if(str === '' || str == null) return;
    lab.push({t:'text', x, y, s:str, size, anchor:anchor||'middle', cls, pri, rot, keep});
  };
  const at = d2 => { const m = /M ([-\d.]+) ([-\d.]+)/.exec(d2); return m ? [+m[1], +m[2]] : null; };
  /* Which way is "into the piece". A count or a counting tick sitting on the waste side of a
     stitch line is a number in the margin: on a strap it lands on the very edge she is about
     to burnish, and on a panel it can fall off the blank entirely. Point them at the middle
     of the piece instead. */
  const mx = bx ? (bx.px0 + bx.px1)/2 : 0, my = bx ? (bx.py0 + bx.py1)/2 : 0;
  const inward = (x, y, nx, ny) => (bx && ((mx - x)*nx + (my - y)*ny) < 0) ? -1 : 1;
  for(const it of items){
    if(!it) continue;
    if(it.t==='cut')    o += `<path d="${it.d}" class="pc-cut"/>`;
    else if(it.t==='stitch') o += `<path d="${it.d}" class="pc-st"/>`;
    else if(it.t==='fill') o0 += `<path d="${it.d}" class="pc-under"/>`;
    else if(it.t==='seam'){
      const thr = it.through ? ' thru' : '';
      o += `<path d="${it.d}" class="pc-st${thr}"/>`;
      if(S.stitch.show){
        const hs = seamHoles(it.segs, it.n, it.closed), half = S.stitch.slit/2;
        const lean = (S.stitch.lean==='right' ? 1 : -1) * Math.PI/3;
        for(let i=0;i<hs.length;i++){
          const h = hs[i];
          if(S.stitch.style==='dot'){
            o += `<circle cx="${nn(h.x)}" cy="${nn(h.y)}" r="${nn(Math.max(0.28, S.stitch.slit*0.24))}" class="pc-hld${thr}"/>`;
          } else {
            const a = h.a + lean, dx = Math.cos(a)*half, dy = Math.sin(a)*half;
            o += `<path d="M ${nn(h.x-dx)} ${nn(h.y-dy)} L ${nn(h.x+dx)} ${nn(h.y+dy)}" class="pc-hl${thr}"/>`;
          }
        }
        if(it.mid && it.n % 2 === 0){
          const m = hs[it.n/2];
          o += `<circle cx="${nn(m.x)}" cy="${nn(m.y)}" r="${nn(S.stitch.slit*0.85)}" class="pc-hlm"/>`;
        }
        /* Counting ticks. Two pieces that share a seam KEY are pricked to the same hole
           count, so the tenth hole out from the centre on one is the tenth hole out from
           the centre on the other. Mark those and you can hold the two halves together and
           see at a glance whether they are still in step - which is the thing that actually
           goes wrong halfway down a 600 mm seam. Counted from the CENTRE outward in both
           directions, so it does not matter which way round either piece was walked. */
        const every = regEvery();
        if(every && !it.closed && it.reg !== false && hs.length >= every + 2){
          const ci = Math.round((hs.length - 1)/2);
          for(let k = every; ci + k < hs.length || ci - k >= 0; k += every){
            [ci + k, ci - k].forEach(idx=>{
              if(idx < 0 || idx >= hs.length) return;
              const h = hs[idx], sg = inward(h.x, h.y, Math.cos(h.a + Math.PI/2), Math.sin(h.a + Math.PI/2));
              const nx = sg*Math.cos(h.a + Math.PI/2), ny = sg*Math.sin(h.a + Math.PI/2);
              // the tick itself always goes down - it is what you count against
              o += `<path d="M ${nn(h.x - nx*1.1)} ${nn(h.y - ny*1.1)} L ${nn(h.x + nx*3.4)} ${nn(h.y + ny*3.4)}" class="pc-tick"/>`;
              const lx = h.x + nx*6.4, ly = h.y + ny*6.4 + 1.0*ts;
              const half2 = String(k).length * 2.9 * ts * 0.62 / 2, ht = 2.9*ts;
              const rb = {x0:lx-half2-0.8, y0:ly-ht*0.82-0.8, x1:lx+half2+0.8, y1:ly+ht*0.26+0.8};
              if(regDone.some(q => q.k === k && hits(rb, q.b))) return;   // already numbered, right there
              regDone.push({k, b:rb});
              L(lx, ly, String(k), 2.9, 'middle', 'pc-cnt', 1, 0, true);
            });
          }
        }
        // the count, where you can check it against what you have pricked - and under it,
        // how far this row sits from the cut edge it follows. That second number is the one
        // she sets her wing divider to, and it is the only way to tell at the bench that a
        // row is where she asked for it rather than an allowance further in. Only a run that
        // follows an edge carries one; it ranks below the count, so on a crowded piece the
        // count is what survives.
        if(S.counts !== false && hs.length > 3){
          const q = hs[Math.floor(hs.length/2)];
          const sg = inward(q.x, q.y, Math.cos(q.a + Math.PI/2), Math.sin(q.a + Math.PI/2));
          const nx = sg*Math.cos(q.a + Math.PI/2), ny = sg*Math.sin(q.a + Math.PI/2);
          L(q.x + nx*4.6, q.y + ny*4.6 + 1.1, hs.length + (it.through ? '\u2020' : ''), 3.2, 'middle', 'pc-cnt', 1, 0, true);
          if(it.ins != null)
            L(q.x + nx*9.2, q.y + ny*9.2 + 1.0, 'edge ' + fmt(it.ins), 2.7, 'middle', 'pc-ins', 2, 0, true);
        }
      }
    }
    else if(it.t==='wrap'){
      // the stretch that folds round a bar or a ring: hatched, because it is not flat leather
      const step = 2.6;
      let h2 = '';
      for(let u = -it.h; u < it.w; u += step)
        h2 += `M ${nn(it.x + Math.max(0,u))} ${nn(it.y + Math.max(0, -u))} L ${nn(it.x + Math.min(it.w, u + it.h))} ${nn(it.y + Math.min(it.h, it.h - Math.max(0, u + it.h - it.w)))} `;
      o += `<path d="${h2}" class="pc-hatch"/>`;
      o += `<path d="${rr(it.x,it.y,it.w,it.h,0)}" class="pc-mk"/>`;
      L(it.x + it.w/2, it.y - 1.4, it.label, 3.4, 'middle', 'pc-tm', 2);
    }
    else if(it.t==='fold'){
      // a band means this strip ends up folded under: same tint everywhere it happens
      if(it.band) o0 += `<path d="${rr(it.band[0], it.band[1], it.band[2], it.band[3], 0)}" class="pc-under"/>`;
      o += `<path d="${it.d}" class="pc-fold"/>`;
      const q = at(it.d); if(q) L(q[0]+3, q[1]-1.4, it.label, 3.6, 'start', 'pc-tf', 1);
    }
    else if(it.t==='mark'){
      o += `<path d="${it.d}" class="pc-mk"/>`;
      const q = at(it.d); if(q) L(q[0]+3, q[1]-1.4, it.label, 3.5, 'start', 'pc-tm', 2);
    }
    else if(it.t==='ctr')   o += `<path d="${it.d}" class="pc-ctr"/>`;
    else if(it.t==='mk-break') o += `<path d="${it.d}" class="pc-brk"/>`;
    else if(it.t==='cutline') o += `<path d="${it.d}" class="pc-cutline"/>`;
    else if(it.t==='notch'){
      // a notch on a shape she drew points along that edge's own normal, not at one of four
      // compass points - the whole idea of a notch is that it is square to the edge it is on
      const L2=3.4, dx = (it.nx != null) ? [it.nx*L2, it.ny*L2]
                       : ({down:[0,L2],up:[0,-L2],right:[L2,0],left:[-L2,0]}[it.dir]||[0,L2]);
      o += `<path d="M ${nn(it.x)} ${nn(it.y)} l ${nn(dx[0])} ${nn(dx[1])}" class="pc-notch"/>`;
    }
    else if(it.t==='hole'){
      o += `<circle cx="${nn(it.x)}" cy="${nn(it.y)}" r="${nn(it.r)}" class="pc-hole"/>`;
      o += `<path d="M ${nn(it.x-it.r-2)} ${nn(it.y)} h ${nn(2*it.r+4)} M ${nn(it.x)} ${nn(it.y-it.r-2)} v ${nn(2*it.r+4)}" class="pc-hx"/>`;
      L(it.x, it.y+it.r+4, it.label, 3.6, 'middle', 'pc-tm', 1);
    }
    else if(it.t==='grain'){
      const h=it.len/2, v=it.dir==='v';
      const x1=v?it.x:it.x-h, y1=v?it.y-h:it.y, x2=v?it.x:it.x+h, y2=v?it.y+h:it.y;
      o += `<path d="M ${nn(x1)} ${nn(y1)} L ${nn(x2)} ${nn(y2)}" class="pc-grain"/>`;
      o += `<path d="M ${nn(x1)} ${nn(y1)} l ${nn(v?-1.6:1.6)} ${nn(v?2.4:-1.6)} M ${nn(x1)} ${nn(y1)} l ${nn(v?1.6:1.6)} ${nn(v?2.4:1.6)}" class="pc-grain"/>`;
      o += `<path d="M ${nn(x2)} ${nn(y2)} l ${nn(v?-1.6:-1.6)} ${nn(v?-2.4:-1.6)} M ${nn(x2)} ${nn(y2)} l ${nn(v?1.6:-1.6)} ${nn(v?-2.4:1.6)}" class="pc-grain"/>`;
      // a vertical one is rotated and therefore left where it is; a horizontal one gets
      // nudged like anything else, because it was landing on piece names
      L(v?it.x-2:it.x, v?it.y:it.y-2.6, 'GRAIN', 3.4, 'middle', 'pc-tf', 2, v?-90:0);
    }
    else if(it.t==='text'){
      // the red instruction notes are the bulk of the ink and the first thing you stop
      // needing: off, and the drawing is dimensions, holes and the names of things
      if(it.mark && S.notes === false) continue;
      const cls = it.mark?'pc-tm':(it.dim?'pc-td':'pc-ti');
      L(it.x, it.y, it.s, it.size, it.anchor||'middle', cls, it.pri != null ? it.pri : (it.dim?0:(it.mark?2:1)), it.rot);
    }
  }
  return o0 + o + drawLabels(lab, ts, bx);
}
/* Which piece the labels being collected belong to. Set by pieceGroup around its one call,
   because a label needs to know whose it is before it can be given a name. */
let LABPIECE = '';
/** Lay the collected labels out together, then draw them over everything else.
    Every label is also given a NAME - the piece, the kind of label, and how many of that kind
    came before it on the piece. That is what lets a note the maker has dragged out of the way,
    or struck off, stay put across every redraw. The name is deliberately not made out of the
    text: a dimension that reads 130 mm today reads 140 mm the moment she moves a slider, and
    her nudge has to survive that. */
function drawLabels(lab, ts, bx){
  let o = '';
  if(LABPIECE){
    const seen = {};
    for(const it of lab){
      if(!it || it.t !== 'text') continue;
      const c = it.cls || 'x';
      seen[c] = (seen[c] || 0) + 1;
      it.lk = LABPIECE + '|' + c + '|' + seen[c];
    }
  }
  const laid = placeText(lab, ts, bx);
  for(const it of laid){
    if(!it) continue;
    const a = it.lk ? ` data-lk="${esc(it.lk)}"` : '';
    o += it.rot
      ? `<g class="pc-lab" transform="translate(${nn(it.x)},${nn(it.y)}) rotate(${it.rot})"${a}>${txt(0,0,it.s,it.size*ts,it.anchor,it.cls)}</g>`
      : txt(it.x, it.y, it.s, it.size*ts, it.anchor, it.cls + ' pc-lab', a);
  }
  return o;
}
function txt(x,y,s,size,anchor,cls,attrs){
  return `<text x="${nn(x)}" y="${nn(y)}" font-size="${nn(size)}" text-anchor="${anchor}" class="${cls}"${attrs||''}>${esc(s)}</text>`;
}
function drawDims(dims, ts, lab){
  ts = ts || 1;
  let o='';
  for(const d of dims){
    const off = d.tier ? (d.at<0 ? d.at - d.tier*8 : d.at) : d.at;
    if(d.ax==='h'){
      const y=off, a=Math.min(d.a,d.b), b=Math.max(d.a,d.b);
      o += `<path d="M ${nn(a)} ${nn(y)} H ${nn(b)} M ${nn(a)} ${nn(y-2)} v 4 M ${nn(b)} ${nn(y-2)} v 4" class="pc-dim"/>`;
      o += `<path d="M ${nn(a)} ${nn(y)} l 2.6 -1.3 v 2.6 Z M ${nn(b)} ${nn(y)} l -2.6 -1.3 v 2.6 Z" class="pc-dimA"/>`;
      lab.push({t:'text', x:(a+b)/2, y:y-1.8*ts, s:d.label, size:4.2, anchor:'middle', cls:'pc-dt', pri:1});
    } else {
      const x=off, a=Math.min(d.a,d.b), b=Math.max(d.a,d.b);
      o += `<path d="M ${nn(x)} ${nn(a)} V ${nn(b)} M ${nn(x-2)} ${nn(a)} h 4 M ${nn(x-2)} ${nn(b)} h 4" class="pc-dim"/>`;
      o += `<path d="M ${nn(x)} ${nn(a)} l -1.3 2.6 h 2.6 Z M ${nn(x)} ${nn(b)} l -1.3 -2.6 h 2.6 Z" class="pc-dimA"/>`;
      lab.push({t:'text', x:x-1.8*ts, y:(a+b)/2, s:d.label, size:4.2, anchor:'middle', cls:'pc-dt', pri:1, rot:-90});
    }
  }
  return o;
}
/** Shrink a caption to the tile it belongs to, and cut it short if it still will not fit.
    A long name on a narrow piece used to run straight across its neighbour on the sheet. */
function fitLabel(str, size, w){
  const est = str.length * size * 0.62;
  if(est <= w) return [str, size];
  const sm = Math.max(size*0.6, size * w / est);
  const max = Math.floor(w / (sm*0.62));
  return [str.length > max ? str.slice(0, Math.max(4, max-1)) + '\u2026' : str, sm];
}
function pieceGroup(p, pad, showDims, ts, rot){
  ts = ts || 1;
  const qty = p.qty>1 ? `  \u00d7${p.qty}` : '';
  const lab = [];
  // The tile's own heading goes into the placement pass FIRST and is never moved, so
  // everything else on the piece has to give way to it. It used not to be there at all,
  // which is how a hole count ended up sitting inside the piece's name.
  const room = (rot ? p.h : p.w) + pad.r;      // a rotated tile is as wide as the piece is tall
  const [nm, ns] = fitLabel(p.name.toUpperCase()+qty, 5*ts, room);
  const sub = p.diagram ? 'HOW IT GOES TOGETHER \u2014 NOT A CUTTING PATTERN'
            : `CUT ${p.qty} \u00b7 ${p.mat.toUpperCase()} \u00b7 ${p.sizeLabel || (fmt(p.w)+' \u00d7 '+fmt(p.h))}`
              + ` \u00b7 STITCH ${fmt(S.sa)} FROM THE EDGE`;
  const [sb, ss] = fitLabel(sub, 3.9*ts, room);
  lab.push({t:'text', x:0, y:-pad.t+4.6*ts, s:nm, size:ns/ts, anchor:'start', cls:'pc-name', pri:-2});
  lab.push({t:'text', x:0, y:-pad.t+10.4*ts, s:sb, size:ss/ts, anchor:'start',
            cls:p.diagram?'pc-tm':'pc-td', pri:-1});
  let o = `<g class="${p.diagram?'pc-dg':''}" transform="translate(${nn(pad.l)},${nn(pad.t)})">`;
  LABPIECE = p.key || p.name || '';
  const dimSvg = (showDims && !p.diagram) ? drawDims(p.dims||[], ts, lab) : '';
  // the tile this piece owns: nothing it says may spill onto its neighbour
  const bx = {x0:-pad.l, y0:-pad.t + 1, x1:p.w + pad.r, y1:p.h + pad.b,
              px0:0, py0:0, px1:p.w, py1:p.h};
  o += dimSvg + drawItems(p.draw, ts, lab, bx);
  LABPIECE = '';
  o += `</g>`;
  return o;
}

/* A long plain strip is drawn with a break rather than spread over five sheets \u2014
   the same convention an engineering drawing uses for a long shaft. */
const BREAK_GAP = 18;
function breakStrip(p){
  const K = p.strip, len = K.len, w = K.w;
  const feats = K.holes.map(h=>h.x).concat(K.vfolds);
  const left  = feats.filter(x=>x < len/2), right = feats.filter(x=>x >= len/2);
  const A = Math.min(len*0.42, Math.max(55, left.length? Math.max(...left)+18 : 55));
  const B = Math.min(len*0.42, Math.max(45, right.length? len - Math.min(...right)+18 : 45));
  const dw = A + BREAK_GAP + B, xr = x => A + BREAK_GAP + (x - (len - B));
  const zig = x0 => { let d = `M ${nn(x0)} 0`; const n=5, sh=w/n;
    for(let i=0;i<n;i++) d += ` l ${nn(i%2?-2.2:2.2)} ${nn(sh)}`; return d; };
  const d = [];
  d.push({t:'cutline', d:`M 0 ${nn(K.rx)} A ${nn(K.rx)} ${nn(K.rx)} 0 0 1 ${nn(K.rx)} 0 H ${nn(A)}`});
  d.push({t:'cutline', d:`M 0 ${nn(w-K.rx)} A ${nn(K.rx)} ${nn(K.rx)} 0 0 0 ${nn(K.rx)} ${nn(w)} H ${nn(A)}`});
  d.push({t:'cutline', d:`M 0 ${nn(K.rx)} V ${nn(w-K.rx)}`});
  d.push({t:'cutline', d:`M ${nn(A+BREAK_GAP)} 0 H ${nn(dw-K.rx)} A ${nn(K.rx)} ${nn(K.rx)} 0 0 1 ${nn(dw)} ${nn(K.rx)}`});
  d.push({t:'cutline', d:`M ${nn(A+BREAK_GAP)} ${nn(w)} H ${nn(dw-K.rx)} A ${nn(K.rx)} ${nn(K.rx)} 0 0 0 ${nn(dw)} ${nn(w-K.rx)}`});
  d.push({t:'cutline', d:`M ${nn(dw)} ${nn(K.rx)} V ${nn(w-K.rx)}`});
  d.push({t:'mk-break', d:zig(A)}); d.push({t:'mk-break', d:zig(A+BREAK_GAP)});
  K.hfolds.forEach(y=>{ d.push({t:'fold', d:hLine(0,A,y)}); d.push({t:'fold', d:hLine(A+BREAK_GAP,dw,y)}); });
  K.vfolds.forEach(x=>{ const X = x<len/2 ? x : xr(x); if(X>=0&&X<=dw) d.push({t:'fold', d:vLine(X,0,w), label:'FOLD'}); });
  K.holes.forEach(h=>{ const X = h.x<len/2 ? h.x : xr(h.x); if(X>=0&&X<=dw) d.push(Object.assign({},h,{x:X})); });
  d.push({t:'text', x:A+BREAK_GAP/2, y:w/2+2, s:'\u2248', size:6, anchor:'middle', dim:true});
  d.push({t:'text', x:dw/2, y:w+7, s:'DRAWN WITH A BREAK \u2014 THE MIDDLE IS A PLAIN STRAIGHT RUN', size:3.8, anchor:'middle', mark:true});
  d.push({t:'grain', x:A/2, y:w/2+(w>16?5:0), len:Math.min(60,A*0.5), dir:'h'});
  d.push({t:'text', x:6, y:w/2+2, s:p.name.toUpperCase(), size:Math.min(5,w*0.45), anchor:'start', dim:true});
  const dims = [D_('h',0,dw,-9,fmt(len)+' overall'), D_('v',0,w,-9,fmt(w))];
  K.holes.forEach((h,i)=>{ if(i===0){ const X = h.x<len/2?h.x:xr(h.x); dims.push(D_('h', h.x<len/2?0:dw, X, w+13, fmt(h.x<len/2?h.x:len-h.x)+' from the end',1)); } });
  return Object.assign({}, p, {draw:d, dims, w:dw, h:w, sizeLabel:fmt(len)+' \u00d7 '+fmt(w)});
}

function ruler(x,y){
  let o = `<g transform="translate(${nn(x)},${nn(y)})">`;
  o += `<path d="M 0 0 H 100 M 0 -3 V 0 M 100 -3 V 0" class="pc-dim"/>`;
  for(let i=10;i<100;i+=10) o += `<path d="M ${i} -2 V 0" class="pc-dim"/>`;
  o += txt(50,-4,'100 mm \u2014 measure this: if it is short, your printer scaled the page',3.2,'middle','pc-td');
  o += `<path d="M 0 6 H 101.6 M 0 6 v 3 M 101.6 6 v 3" class="pc-dim"/>`;
  for(let i=1;i<4;i++) o += `<path d="M ${nn(i*25.4)} 6 v 2" class="pc-dim"/>`;
  o += txt(50.8,13,'4 inches',3.5,'middle','pc-td');
  return o+`</g>`;
}
function regGrid(w,h){
  let o='';
  for(let x=0;x<=w;x+=50) for(let y=0;y<=h;y+=50)
    o += `<path d="M ${nn(x-2.5)} ${nn(y)} h 5 M ${nn(x)} ${nn(y-2.5)} v 5" class="pc-reg"/>`;
  return o;
}

/* ---------- WHAT A PIECE IS, ON PAPER ----------
   One decision, made once, and the whole of the pagination reads it. It is about SHAPE, not
   about what the piece is for: a 20 mm strap and a 26 mm grab handle want the same treatment
   whatever they are called, and sniffing at names would go wrong the first time a bag had a
   part this file has never heard of.

     note        an assembly diagram - worth having, not a cutting pattern, and it goes last
     small       fits a sheet with room to spare, so it shares one with its own kind
     strap       narrow and far too long for a sheet: quarter-page lanes
     continuous  long, but too fat to quarter: half-page lanes, and never broken in the middle
     panel       everything else. A main piece, and a main piece gets a sheet of its own.
*/
const LANE_TARGET = {strap:4, continuous:2};
/* Which pieces may be picked up. A MAIN piece has a sheet of its own and nothing to gain from
   being dragged about, and an accidental nudge put one half off its page with no obvious way
   back. The bits and the diagrams are the ones that share sheets and want rearranging, so
   they are the ones that move. */
const ARRANGEABLE = {small:1, note:1};
const SMALL_SHARE = 0.28;                  // of one sheet: above this it is a piece, not a bit
function pageRole(p, PW, PH, pad){
  if(p.diagram) return 'note';
  const fw = p.w + pad.l + pad.r, fh = p.h + pad.t + pad.b;
  const fits = (fw <= PW+0.01 && fh <= PH+0.01) || (fh <= PW+0.01 && fw <= PH+0.01);
  if(fits) return fw*fh <= SMALL_SHARE*PW*PH ? 'small' : 'panel';
  const long = Math.max(p.w, p.h), thin = Math.max(1, Math.min(p.w, p.h));
  if(long/thin >= 3 && thin <= 70) return 'strap';
  if(long/thin >= 2.2) return 'continuous';
  return 'panel';
}

/* The packer is a first guess, not an argument. Anything the maker has dragged is taken out
   of the pack, the rest is laid out round the space that is left, and the hand-placed pieces
   go back exactly where they were put - on whichever sheet they were dropped on. A hide is
   not a rectangle and neither is a bench; she can see things the packer cannot.

   Every MAIN piece gets a sheet of its own and overflows onto as many more as it needs. A
   long thin one is laid in LANES down the page rather than given a sheet each: a 1215 mm
   strap in quarter-page lanes is two sheets instead of five nearly-empty ones, and a gusset
   in half-page lanes is two instead of three. The bits and the diagrams come last, packed
   together, and they are drawn AFTER everything else so that one dragged onto a panel's
   sheet lands on top of it rather than underneath - which is the only way to use the room
   round a big piece. */
function layoutSheets(pieces){
  const [sw,sh] = SHEETS[S.sheet];
  const PW = sw - 2*MARGIN, PH = sh - 2*MARGIN;
  /* The bottom gutter is slack and nothing is drawn in it, so it is 8 mm rather than 9. That
     one millimetre is what lets a 105 mm gusset with its dimension lines take HALF an A4
     sheet instead of a whole one: 105 + 27 + 8 doubles to 280 and the page has 281. */
  const pad = S.dims ? {l:18, t:27, r:6, b:8} : {l:6, t:15, r:6, b:6};
  const GAP = 7;
  const sheets = [];
  const fresh = () => { const s2 = {items:[], x:0, y:0, rowH:0}; sheets.push(s2); return s2; };
  const box = p => ({A:{rot:false, w:p.w+pad.l+pad.r, h:p.h+pad.t+pad.b},
                     B:{rot:true,  w:p.h+pad.t+pad.b, h:p.w+pad.l+pad.r}});
  const fits = o => o.w <= PW+0.01 && o.h <= PH+0.01;

  // the role is what decides both where a piece is packed and whether it can be moved, so
  // it is worked out once, on the piece the packer will actually lay out
  pieces = pieces.map(p0 => (p0.strip && p0.strip.len > 320) ? breakStrip(p0) : p0);
  const roleOf = new Map();
  pieces.forEach(p => roleOf.set(p, pageRole(p, PW, PH, pad)));

  const held = [];
  pieces = pieces.filter(p=>{
    const a2 = S.arrange[p.key];
    if(!a2 || !ARRANGEABLE[roleOf.get(p)]) return true;
    held.push({p, a:a2});
    return false;
  });

  const pile = {panel:[], continuous:[], strap:[], small:[], note:[]};
  pieces.forEach(p => pile[roleOf.get(p)].push(p));

  /* A piece bigger than a sheet in both directions is cut into a GRID of windows that
     overlap, exactly as it always was: you tape them together on the 50 mm crosses. */
  const grid = (p, A, B) => {
    const n = o => Math.max(1, Math.ceil((o.w-OVERLAP)/(PW-OVERLAP)))
                 * Math.max(1, Math.ceil((o.h-OVERLAP)/(PH-OVERLAP)));
    const o = n(B) < n(A) ? B : A;
    const cols = Math.max(1, Math.ceil((o.w - OVERLAP)/(PW - OVERLAP)));
    const rows = Math.max(1, Math.ceil((o.h - OVERLAP)/(PH - OVERLAP)));
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++)
      fresh().items.push({p, pad, rot:o.rot, x:0, y:0, fw:PW, fh:PH, z:0,
        clip:{ox:c*(PW-OVERLAP), oy:r*(PH-OVERLAP), w:PW, h:PH, full:o,
              i:r*cols+c, n:cols*rows, right:c<cols-1, down:r<rows-1}});
  };

  /* Lanes. The page is divided the short way into `n` bands and the piece runs through them
     one after another, each band overlapping the last by OVERLAP so the joins can be taped.
     Both ways round are costed and the cheaper wins; a tie goes to reading it left to right. */
  const lanes = (p, role, A, B) => {
    const target = LANE_TARGET[role] || 1;
    const cand = [];
    /* How many lanes of `th` fit across `room`. Lanes normally stand a gap apart, but when
       closing the gap is what buys another lane they simply touch: each lane already draws
       its own dashed edge, so two of them meeting reads perfectly well - and half a sheet
       saved is half a sheet of taping saved. */
    const fitLanes = (th, room) => {
      const withGap = Math.floor((room + GAP)/(th + GAP)), tight = Math.floor(room/th);
      const n = Math.max(1, Math.min(target, Math.max(withGap, tight)));
      return {n, pitch: n > withGap ? th : th + GAP};
    };
    const H = (A.w >= A.h) ? A : B;              // long axis across the page
    if(H.h <= PH + 0.01){
      const L = fitLanes(H.h, PH);
      const step = PW - OVERLAP;
      const segs = Math.max(1, Math.ceil((H.w - OVERLAP)/step));
      cand.push({o:H, n:L.n, pitch:L.pitch, segs, step, horiz:true, cost:Math.ceil(segs/L.n)});
    }
    const V = (A.h >= A.w) ? A : B;              // long axis down it
    if(V.w <= PW + 0.01){
      const L = fitLanes(V.w, PW);
      const step = PH - OVERLAP;
      const segs = Math.max(1, Math.ceil((V.h - OVERLAP)/step));
      cand.push({o:V, n:L.n, pitch:L.pitch, segs, step, horiz:false, cost:Math.ceil(segs/L.n)});
    }
    if(!cand.length){ grid(p, A, B); return; }   // too fat both ways: it needs a grid
    cand.sort((a,b)=> a.cost - b.cost || ((a.horiz?0:1) - (b.horiz?0:1)));
    const c = cand[0];
    let s2 = null;
    for(let j=0;j<c.segs;j++){
      const k = j % c.n;
      if(k === 0) s2 = fresh();
      const at = c.horiz ? {x:0, y:k*c.pitch, w:PW, h:c.o.h, ox:j*c.step, oy:0}
                         : {x:k*c.pitch, y:0, w:c.o.w, h:PH, ox:0, oy:j*c.step};
      s2.items.push({p, pad, rot:c.o.rot, x:at.x, y:at.y, fw:at.w, fh:at.h, z:0,
        clip:{ox:at.ox, oy:at.oy, w:at.w, h:at.h, full:c.o, lane:true,
              i:j, n:c.segs, right:c.horiz && j < c.segs-1, down:!c.horiz && j < c.segs-1}});
    }
  };

  ['panel','continuous','strap'].forEach(role => pile[role].forEach(p=>{
    const {A,B} = box(p);
    const o = fits(A) ? A : fits(B) ? B : null;
    if(o) fresh().items.push({p, pad, rot:o.rot, x:0, y:0, fw:o.w, fh:o.h, z:0, solo:true});
    else if(role === 'panel') grid(p, A, B);
    else lanes(p, role, A, B);
  }));

  /* The bits and the diagrams, shelf-packed onto whatever sheets are left, notes last.
     An assembly diagram is the one thing here that is allowed to be drawn SMALL: it says so
     on itself, it is not a cutting pattern, and a 250 mm one is 74 mm too wide for US Letter.
     Anything that has to be cut to size is never scaled - it goes to a main-piece layout and
     is taped together like any other oversize piece. */
  let cur = null;
  pile.small.concat(pile.note).forEach(p=>{
    const {A,B} = box(p);
    let o = fits(A) ? A : fits(B) ? B : null, sc = 1;
    if(!o && p.diagram){
      const q = (A.w/A.h >= PW/PH) ? A : B;
      sc = Math.max(0.55, Math.min(1, (PW - 1)/q.w, (PH - 1)/q.h));
      if(q.w*sc <= PW + 0.01 && q.h*sc <= PH + 0.01) o = q;
    }
    if(!o){ const {A:A2,B:B2} = box(p); grid(p, A2, B2); return; }
    const w = o.w*sc, h = o.h*sc;
    if(!cur) cur = fresh();
    if(cur.x + w > PW + 0.01){ cur.x = 0; cur.y += cur.rowH + GAP; cur.rowH = 0; }
    if(cur.y + h > PH + 0.01) cur = fresh();
    cur.items.push({p, pad, rot:o.rot, x:cur.x, y:cur.y, fw:w, fh:h, sc, z:1});
    cur.x += w + GAP; cur.rowH = Math.max(cur.rowH, h);
  });

  // put the hand-placed pieces back, making room for a sheet they were dropped on
  held.forEach(({p, a})=>{
    const fw = a.r ? p.h+pad.t+pad.b : p.w+pad.l+pad.r;
    const fh = a.r ? p.w+pad.l+pad.r : p.h+pad.t+pad.b;
    const n = Math.max(0, Math.min(40, Math.round(a.s || 0)));
    while(sheets.length <= n) sheets.push({items:[], x:0, y:0, rowH:0});
    sheets[n].items.push({p, pad, rot:!!a.r, fw, fh, z:2, held:true,
      x: Math.max(0, Math.min(Math.max(0, PW - fw), a.x)),
      y: Math.max(0, Math.min(Math.max(0, PH - fh), a.y))});
  });
  // a bit dropped on a panel's sheet must land ON it, not behind it
  sheets.forEach(s2 => s2.items.sort((x,y)=>(x.z||0) - (y.z||0)));
  return {sheets, sw, sh, PW, PH, pad};
}

/* One continuous surface: every piece at true relative scale, no page breaks.
   For judging proportion as the dimensions move, not for printing. */
/* ---------- the count sheet ----------
   Every run, piece by piece, with the number of holes in it. Two pieces that meet carry the
   same KEY and therefore the same count, so this is the sheet you reconcile against when a
   seam has drifted: find the run, count what you pricked, and the disagreement is right there
   rather than three feet down a gusset. It is on the pattern, not just in the cut list,
   because that is where you are when you need it. */
function countTable(model){
  const rows = [];
  model.pieces.forEach(p=>{
    if(p.diagram) return;
    if(p.derived && !S.showLining) return;
    const runs = [];
    p.draw.forEach(sm=>{
      if(sm.t !== 'seam') return;
      const pl = SEAMPLAN[sm.key] || {};
      const holes = sm.closed ? sm.n : sm.n + 1;
      const prev = runs.find(r=>r.key === sm.key && r.holes === holes);
      if(prev){ prev.qty++; return; }
      runs.push({key:sm.key, name:pl.name || sm.key, holes, qty:1, ins:sm.ins,
                 closed:!!sm.closed, through:!!sm.through, pitch:pl.pitch, len:sm.len});
    });
    if(runs.length) rows.push({p, runs});
  });
  if(!rows.length) return '';
  const shared = {};
  model.pieces.forEach(p=>p.draw.forEach(sm=>{
    if(sm.t==='seam') (shared[sm.key] = shared[sm.key] || new Set()).add(p.name);
  }));
  const body = rows.map(r=>{
    const first = r.runs.length;
    return r.runs.map((run,i)=>{
      const mates = [...(shared[run.key] || [])].filter(n=>n !== r.p.name);
      return `<tr>${i===0?`<th rowspan="${first}" scope="rowgroup">${esc(r.p.name)}${r.p.qty>1?` <small>\u00d7${r.p.qty}</small>`:''}</th>`:''}
        <td>${esc(run.name)}${run.qty>1?` <small>\u00d7${run.qty} on this piece</small>`:''}${run.closed?' <small>(closed box)</small>':''}</td>
        <td class="n"><b>${run.holes}</b>${run.through?'<small>\u2020</small>':''}</td>
        <td class="n"><small>${run.len!=null?fmt(run.len):''}</small></td>
        <td class="n"><small>${run.ins!=null?fmt(run.ins):'\u2014'}</small></td>
        <td><small>${mates.length?'matches '+esc(mates.join(', ')):'\u2014'}</small></td></tr>`;
    }).join('');
  }).join('');
  return `<section class="cntsheet">
    <h3>Stitch counts, run by run</h3>
    <p>Count what you have pricked against this. Anything sharing a run with another piece is
       fitted to the <b>same number of holes</b>, so if two counts disagree the drift is in the
       one that does not match. <span class="thru">\u2020</span> is pricked through both layers
       at once. Marked runs also carry a tick every ${regEvery()||'\u2014'} holes out from their
       centre, numbered, so you can check without counting the lot. <b>Off the edge</b> is how
       far the row sits from the cut edge it follows \u2014 the number to set your wing divider
       to, and the same one printed under the count on the drawing. A footprint in the middle
       of a panel has no edge to measure from and shows a dash.</p>
    <table><thead><tr><th>Piece</th><th>Run</th><th class="n">Holes</th><th class="n">Length</th><th class="n">Off the edge</th><th>Shared with</th></tr></thead>
    <tbody>${body}</tbody></table></section>`;
}
function renderFull(model){
  const shown = model.pieces.filter(p=>(S.showLining || !p.derived) && !(p.diagram && S.dropNotes[p.key]));
  if(!shown.length) return '<p class="pd">Nothing to draw.</p>';
  const gut = 16;
  const area = shown.reduce((a,p)=>a + (p.w+gut)*(p.h+gut), 0);
  const widest = Math.max.apply(null, shown.map(p=>p.w));
  let CW = Math.max(widest, Math.sqrt(area*1.6));
  const ts = Math.max(1, CW/540);
  const pad = {l:4, t:15*ts, r:4, b:5};
  const rows = [];
  let x = 0, y = 0, rowH = 0;
  for(const p of shown){
    const fw = p.w + pad.l + pad.r, fh = p.h + pad.t + pad.b;
    if(x > 0 && x + fw > CW){ x = 0; y += rowH + gut; rowH = 0; }
    rows.push({p, x, y, fw, fh});
    x += fw + gut; rowH = Math.max(rowH, fh);
  }
  const TW = Math.max(CW, Math.max.apply(null, rows.map(r=>r.x + r.fw)));
  const TH = y + rowH;
  const zoom = (S.zoom==='fit' || S.zoom==='all') ? null : parseFloat(S.zoom);
  const m = 10*ts;
  const svg = `<svg viewBox="${nn(-m)} ${nn(-m)} ${nn(TW+2*m)} ${nn(TH+2*m)}" xmlns="http://www.w3.org/2000/svg"
      ${zoom ? `width="${nn((TW+2*m)*zoom)}mm" height="${nn((TH+2*m)*zoom)}mm"` : 'width="100%"'} style="${zoom?'':'height:auto'}">
    <rect x="${nn(-m)}" y="${nn(-m)}" width="${nn(TW+2*m)}" height="${nn(TH+2*m)}" class="pc-bg"/>
    ${rows.map(r=>`<g transform="translate(${nn(r.x)},${nn(r.y)})">${pieceGroup(r.p, pad, false, ts)}</g>`).join('')}
    <path d="M 0 ${nn(TH+m*0.55)} H ${nn(TW)} M 0 ${nn(TH+m*0.35)} v ${nn(m*0.4)} M ${nn(TW)} ${nn(TH+m*0.35)} v ${nn(m*0.4)}" class="pc-dim"/>
    ${txt(TW/2, TH+m*0.3, fmt(TW)+' across everything', 4.6*ts, 'middle', 'pc-dt')}
    <path d="M ${nn(-m*0.55)} 0 V ${nn(TH)} M ${nn(-m*0.75)} 0 h ${nn(m*0.4)} M ${nn(-m*0.75)} ${nn(TH)} h ${nn(m*0.4)}" class="pc-dim"/>
    <g transform="translate(${nn(-m*0.75)},${nn(TH/2)}) rotate(-90)">${txt(0,0,fmt(TH)+' deep', 4.6*ts, 'middle','pc-dt')}</g>
    ${txt(0, -m*0.35, 'PROPORTION VIEW \u2014 NOT TO SCALE \u00b7 PRINT FROM SHEETS', 4.4*ts, 'start', 'pc-tm')}
  </svg>`;
  const sq = (TW*TH)/92903.04;
  return `<h2 class="pt">Full pattern</h2>
    ${S.notes === false ? '' : `<p class="pd">Every piece at true relative scale on one surface, so you can watch the whole pattern change as you move a dimension. Laid out edge to edge it occupies <b>${fmt(TW)} \u00d7 ${fmt(TH)}</b> \u2014 about ${sq.toFixed(1)} sq ft of bench. Switch to <b>Sheets</b> to print any of it at 1:1.<br>
      <b style="color:var(--paper-thru)">Blue</b> runs are pricked with both layers held together; hatched panels fold round a bar or a ring; the small number beside each run is how many holes it has.</p>`}
    <div class="sheetwrap fullview"><div class="sheet" style="width:${zoom?'auto':'100%'}">${svg}</div></div>
    ${countTable(model)}`;
}

/* How small every sheet has to be drawn for the lot of them to be on the screen at once.
   Tries every number of columns and keeps whichever fits biggest; falls back to something
   sane where there is no window to measure, which is where the node tests run it. */
function fitAllZoom(n, sw, sh){
  const PXMM = 96/25.4;                    // a sheet is drawn in millimetres; the pane measures pixels
  const pane = (typeof document !== 'undefined') && document.getElementById('p-pattern');
  const W = Math.max(280, (pane && pane.clientWidth) || 900) - 24;
  const H = Math.max(300, (typeof window !== 'undefined' ? window.innerHeight : 820) - 300);
  let best = 0;
  for(let c = 1; c <= n; c++){
    const rows = Math.ceil(n/c);
    const z = Math.min((W - (c-1)*16)/(c*sw*PXMM), (H - (rows-1)*30)/(rows*sh*PXMM));
    if(z > best) best = z;
  }
  // A sheet too small to take hold of a piece on is not a view of anything. Below this it
  // stops shrinking and the board scrolls instead - which is still the whole pattern in
  // front of you, two flicks of the wheel rather than thirteen.
  const floor = Math.min(1, 150/(sw*PXMM));
  return Math.max(floor, Math.min(1, best));
}
function renderPattern(model){
  const hidden = model.pieces.filter(p=>p.derived).length;
  // a diagram she has crossed off is not drawn, and the toolbar says how many are missing
  const shown  = model.pieces.filter(p=>(S.showLining || !p.derived) && !(p.diagram && S.dropNotes[p.key]));
  const {sheets, sw, sh, PW, PH} = layoutSheets(shown);
  const all  = S.zoom==='all';
  const zoom = S.zoom==='fit' ? 1 : all ? fitAllZoom(sheets.length, sw, sh) : parseFloat(S.zoom);
  const cls = S.zoom==='fit' ? 'sheetwrap zoomfit' : 'sheetwrap board';
  let a3 = 0;
  if(sheets.length > 14 && S.sheet==='A4'){
    const keep = S.sheet; S.sheet = 'A3';
    try{ a3 = layoutSheets(shown).sheets.length; } finally { S.sheet = keep; }
  }
  let o = `<style>@media print{@page{size:${nn(sw)}mm ${nn(sh)}mm; margin:0}}</style>
    <h2 class="pt">Pattern sheets</h2>
    ${S.notes === false ? `<p class="pd">${sheets.length} sheet${sheets.length>1?'s':''} at ${S.sheet}. Take a small piece by its heading to move it \u2014 onto another sheet if there is room there \u2014 and double-click the heading to turn it. Drag a note to move it, double-click it to take it off. Ctrl/Cmd + Z takes back the last move.</p>` : `<p class="pd">${sheets.length} sheet${sheets.length>1?'s':''} at ${S.sheet}. Solid line = cut \u00b7 long dash = fold \u00b7 fine dash = stitch line \u00b7 red = mark it on the leather \u00b7 arrows = grain, and every arrow must run the same way down the hide.<br>
      <b style="color:var(--paper-thru)">Blue</b> runs are pricked with both layers held together \u2014 fold or clamp first, then prick, and the two halves cannot drift.
      Hatched panels fold round a bar or a ring, so they are not flat leather.
      The small number beside each run is <b>how many holes it has</b> (\u2020 = through both layers) \u2014 count yours against it before you sew \u2014 and under it, in grey, <b>edge</b> and <b>how far that row sits from the cut edge</b> it follows.<br>
      <b>Every main piece has a sheet of its own</b> and carries on over as many more as it needs, taped on the 50 mm crosses. A long thin one is laid in lanes instead of being given a sheet each \u2014 a gusset in halves, a strap in quarters \u2014 and each lane says which part of the piece it is. The small pieces and the assembly diagrams come last, and they are drawn on top, so one <b>dragged onto a main sheet lands in front of it</b> and you can use the room round a big piece. <b>Take one by its heading</b> \u2014 the dashed bar over its name \u2014 to move it on its sheet or onto another; double-click the heading to turn it 90\u00b0. A main piece has a sheet of its own and stays on it, and nothing else on a tile starts a drag, so the notes and numbers are yours to pick up. <b>Ctrl/Cmd + Z</b> takes back the last move. An assembly diagram carries a cross \u2014 it is not a cutting pattern, and it will come off the sheets if you would rather have the paper. Set the scale to <b>All sheets</b> and every sheet is on screen at once, so you can see the room left on one while you are working on another.<br>
      Any note, number or name can be <b>dragged where you want it</b>, and <b>double-clicked to take it off the drawing</b> if it is in the way.<br>
      <b>Pattern PDF</b> writes every sheet at 1:1 \u2014 print it with page scaling off, then measure the 100 mm ruler before you cut anything.</p>`}`;
  if(!S.showLining && hidden) o += `<div class="warn"><b>Lining shell hidden</b><span>${hidden} plain lining shell panel${hidden>1?'s are':' is'} listed in the cut list but not drawn \u2014 the usual shop trick is to cut them from the shell pattern with the edge moved in ${fmt(S.thickness)}. A lining panel that carries something \u2014 a slip pocket, a zip window, a card stack \u2014 is always drawn, because the row it is stitched along is not on the shell pattern to be traced. Switch \u201cLining pieces\u201d on above to add the plain ones too.</span></div>`;
  if(a3) o += `<div class="warn"><b>That is a lot of taping</b><span>These pieces are simply bigger than A4. On A3 the same pattern comes down to ${a3} sheets \u2014 or take it to a copy shop and ask for one large-format print at 100%.</span></div>`;
  if(model.warn.length) o += model.warn.map(w=>`<div class="warn"><b>Note</b><span>${w}</span></div>`).join('');
  /* A big pattern is megabytes of SVG, and it used to be rebuilt from scratch on every
     twitch of a slider. Draw a working set while you are designing; the whole thing is one
     click away, and printing forces it anyway. */
  const cap = all ? SHEET_CAP*3 : SHEET_CAP;
  const capped = !PATTERN_ALL && sheets.length > cap;
  const drawn = capped ? sheets.slice(0, cap) : sheets;
  if(capped) o += `<div class="warn"><b>${sheets.length} sheets</b><span>Showing the first ${cap}
    so the drawing keeps up while you are still moving numbers around.
    <button class="btn" id="pv-all" style="margin-left:8px">Draw all ${sheets.length}</button>
    Printing draws them all whatever this says.</span></div>`;
  o += `<div class="${cls}">`;
  /* ONE way of drawing an item, whether it is a whole piece sitting on the sheet or a window
     onto one that is far too big for it. A window carries its own registration grid, its own
     overlap guide and its own part number; a whole piece carries a grab handle so it can be
     dragged, and a diagram carries a cross so it can be taken off the pattern altogether. */
  const drawItem = (it, i, j) => {
    const p = it.p, P0 = it.pad;
    const spin = it.rot ? ` rotate(90) translate(0,${nn(-p.h-P0.t-P0.b)})` : '';
    if(it.clip){
      const c = it.clip, id = `cl${i}-${j}`;
      const part = c.n > 1 ? `${p.name.toUpperCase()} \u00b7 PART ${c.i+1}/${c.n} \u00b7 ALIGN ON THE 50 mm CROSSES`
                           : p.name.toUpperCase();
      return `<g transform="translate(${nn(it.x)},${nn(it.y)})">
        <clipPath id="${id}"><rect x="0" y="0" width="${nn(c.w)}" height="${nn(c.h)}"/></clipPath>
        <g clip-path="url(#${id})"><g transform="translate(${nn(-c.ox)},${nn(-c.oy)})${spin}">
          ${regGrid(c.full.w, c.full.h)}
          ${pieceGroup(p, P0, S.dims, 1, it.rot)}
        </g></g>
        <rect x="0" y="0" width="${nn(c.w)}" height="${nn(c.h)}" class="pc-band"/>
        ${c.right?`<path d="M ${nn(c.w-OVERLAP)} 0 V ${nn(c.h)}" class="pc-ov"/>`+txt(c.w-OVERLAP+2.5,10,'OVERLAP \u2192',3.6,'start','pc-tm'):''}
        ${c.down?`<path d="M 0 ${nn(c.h-OVERLAP)} H ${nn(c.w)}" class="pc-ov"/>`+txt(3,c.h-OVERLAP-2.5,'OVERLAP \u2193',3.6,'start','pc-tm'):''}
        ${(f=>txt(0, -1.4, f[0], f[1], 'start', 'pc-name'))(fitLabel(part, 3.8, c.w))}
      </g>`;
    }
    const sc = it.sc || 1;
    const gw = (it.rot ? it.fh : it.fw)/sc, gh = (it.rot ? it.fw : it.fh)/sc;
    /* A MAIN piece is not picked up at all - it has its own sheet, and a stray drag on one
       was very hard to undo. What can be moved is taken hold of by its HEADING, not by the
       whole tile: a grab rectangle over the drawing sits on top of every note and number on
       it, so the notes she actually wanted to nudge were behind a sheet of glass. The heading
       is the piece's own title bar, it is never anything else, and there is nothing under it
       to obstruct. */
    const movable = (it.z || 0) > 0;
    const bar = Math.max(6, Math.min(P0.t - 2, 13));
    return `<g class="pc-drag${movable?'':' fixed'}${it.held?' held':''}${p.diagram?' pc-note':''}" data-pkey="${esc(p.key)}" data-sheet="${i}"
       transform="translate(${nn(it.x)},${nn(it.y)})${sc!==1?` scale(${nn(sc)})`:''}${spin}">${pieceGroup(p, P0, S.dims, 1, it.rot)}${
       movable ? `<rect x="${nn(-P0.l)}" y="${nn(-P0.t)}" width="${nn(gw)}" height="${nn(bar)}" class="pc-grab"
         ><title>Drag the heading to move this piece \u00b7 double-click to turn it</title></rect>` : ''}${
       p.diagram ? `<g class="pc-nx" data-nx="${esc(p.key)}" transform="translate(${nn(gw-P0.l-5)},${nn(-P0.t+5)})"
         ><circle r="4.2" class="pc-nxc"/><path d="M -1.9 -1.9 L 1.9 1.9 M 1.9 -1.9 L -1.9 1.9" class="pc-nxm"/>
         <title>Take this diagram off the pattern</title></g>` : ''}</g>`;
  };
  drawn.forEach((s,i)=>{
    const W_=`${nn(sw*zoom)}mm`, H_=`${nn(sh*zoom)}mm`;
    const names = [...new Set(s.items.map(it=>it.p.name))].join(', ');
    const label = `Sheet ${i+1} of ${sheets.length} \u2014 ${names}`;
    const inner = `<svg viewBox="0 0 ${nn(sw)} ${nn(sh)}" width="${W_}" height="${H_}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${nn(sw)}" height="${nn(sh)}" class="pc-bg"/>
        <g transform="translate(${nn(MARGIN)},${nn(MARGIN)})">
          ${s.items.map((it,j)=>drawItem(it, i, j)).join('')}
          <rect x="0" y="0" width="${nn(PW)}" height="${nn(PH)}" class="pc-trim"/>
          ${(f=>txt(0, PH+5.5, f[0], f[1], 'start', 'pc-name'))(fitLabel(
             `AWL & GUSSET \u00b7 ${S.construction.toUpperCase()} \u00b7 ${fmt(S.W)} \u00d7 ${fmt(S.H)} \u00d7 ${fmt(S.D)} \u00b7 ${fmt(S.thickness)} LEATHER \u00b7 SA ${fmt(S.sa)} \u00b7 SHEET ${i+1}/${sheets.length}`, 4, PW))}
          ${ruler(PW-104, PH-3)}
        </g></svg>`;
    o += `<div class="sheet" data-sheetno="${i}"><span class="pglab">${esc(label)}</span>${inner}</div>`;
  });
  return o + `</div>` + countTable(model);
}
const SHEET_CAP = 24;
let PATTERN_ALL = false;
