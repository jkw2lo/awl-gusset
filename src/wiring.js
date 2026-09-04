/* ============================================================
   WIRING
   ============================================================ */
let MODEL = null, TAB = 'bag';
/* Sliders fire on every pixel of travel, and one of those renders can be megabytes of SVG.
   Coalesce to one render per frame and drop everything that has already been superseded -
   without this a long drag queues up dozens of full redraws and the page stops answering. */
let armed = false, rafId = 0, toId = 0, railPending = false;
function drawNow(){
  armed = false;
  const rail = railPending; railPending = false;
  try{
    if(rail){ renderRail(); renderTools(TAB); }
    MODEL = draft();
    autosave();
    if(TAB==='bag'){ document.getElementById('p-bag').innerHTML = renderElev(MODEL); attachDrags(); }
    else if(SEL) SEL = null;
    // the inspector is rebuilt only when the rail is - otherwise a slider you are dragging
    // would be pulled out from under you on every frame
    if(rail || !SEL) renderInsp(); else inspMark();
    if(TAB==='pattern'){
      document.getElementById('p-pattern').innerHTML = S.pv==='full' ? renderFull(MODEL) : renderPattern(MODEL);
      if(S.pv !== 'full'){ attachSheetDrags(); attachLabelDrags(); }
    }
    if(TAB==='cut') document.getElementById('p-cut').innerHTML = renderCut(MODEL);
  }catch(err){
    // never leave the page dead: say what happened and give a way back
    const pane = document.getElementById('p-'+TAB);
    if(pane) pane.innerHTML = `<div class="warn"><b>That combination broke the drafter</b><span>
      ${esc(err && err.message ? err.message : String(err))}. Nothing is lost \u2014 move the number back,
      or <button class="btn" id="err-reset" style="margin-left:6px">reset to the preset</button></span></div>`;
    if(typeof console !== 'undefined') console.error(err);
  }
}
/** A frame if we get one, a timer if we do not: an artifact can be mounted in a hidden
    iframe, where requestAnimationFrame never fires at all and the page would stay blank. */
function fire(){ if(!armed) return; disarm(); drawNow(); }
function disarm(){ armed = false; if(rafId) cancelAnimationFrame(rafId); if(toId) clearTimeout(toId); rafId = toId = 0; }
function renderWork(){
  if(armed) return;
  armed = true;
  rafId = requestAnimationFrame(fire);
  toId = setTimeout(fire, 90);
}
function renderAll(){ railPending = true; renderWork(); }
/** Some things must land before the next line runs - printing, mostly. */
function renderSync(){ disarm(); railPending = true; drawNow(); }

/* Centring guides. Nothing else in the drawing tells you when a pocket is actually centred -
   you end up nudging a number back and forth. Snap within a couple of millimetres, and show
   the line you snapped to plus the two gaps either side while the thing is moving. */
const SNAP = 2.5;
/* A pointer that moved was a drag, not a click, so it must not also open a menu. */
let NODRAG = false;
/* Both ways, not one. Centring something sideways was the only thing the guide helped with,
   and half of what you place on a bag is being lined up DOWN the face - a pocket in the
   middle of the panel, a feet set in the middle of the base. So: both centre lines, either of
   which lights up when it has snapped, and all four gaps written on the drawing at once. The
   four numbers are what you actually read: two that match is centred, and you can see it
   without moving anything. */
function guide(d, x, yTop, box, snapX, snapY){
  const svg = document.getElementById('elevsvg');
  if(!svg || d.cx == null) return;
  let g = document.getElementById('ev-guide');
  if(!g){
    g = document.createElementNS('http://www.w3.org/2000/svg','g');
    g.id = 'ev-guide';
    svg.appendChild(g);
  }
  const across = d.across != null ? d.across : S.W;
  const down   = d.down   != null ? d.down   : S.H;
  const top = (d.cy0 != null ? d.cy0 : 0), bot = top + down;
  const left = d.cx - across/2, right = d.cx + across/2;
  const cy = (top + bot)/2;
  const bw = box.w, bh = box.h || 0;
  const x0 = d.cx + x - bw/2, x1 = d.cx + x + bw/2;
  const y0 = d.flipY ? top + down - (yTop || 0) - bh : top + (yTop || 0), y1 = y0 + bh;
  const xc = (x0 + x1)/2, yc = (y0 + y1)/2;
  const fs2 = Math.max(7, S.W/40);
  const num = (tx, ty, v, anch) =>
    `<text x="${nn(tx)}" y="${nn(ty)}" font-size="${nn(fs2)}" text-anchor="${anch||'middle'}" class="ev-gt">${esc(fmt(v,{unit:false}))}</text>`;
  g.innerHTML =
    `<path d="M ${nn(d.cx)} ${nn(top-14)} V ${nn(bot+14)}" class="ev-gd${snapX?' on':''}"/>`
  + `<path d="M ${nn(left-14)} ${nn(cy)} H ${nn(right+14)}" class="ev-gd${snapY?' on':''}"/>`
  + `<path d="M ${nn(left)} ${nn(yc)} H ${nn(x0)} M ${nn(x1)} ${nn(yc)} H ${nn(right)}" class="ev-gd2"/>`
  + `<path d="M ${nn(xc)} ${nn(top)} V ${nn(y0)} M ${nn(xc)} ${nn(y1)} V ${nn(bot)}" class="ev-gd2"/>`
  + num((left+x0)/2, yc-3, x0 - left)
  + num((x1+right)/2, yc-3, right - x1)
  + num(xc+3, (top+y0)/2, y0 - top, 'start')
  + num(xc+3, (y1+bot)/2, bot - y1, 'start');
}
function clearGuide(){ const g = document.getElementById('ev-guide'); if(g) g.remove(); }
function attachDrags(){
  const box = document.getElementById('v3dbox');
  if(box) box.addEventListener('pointerdown', ev=>{
    ev.preventDefault();
    const sx = ev.clientX, sy = ev.clientY, y0 = S.view3d.yaw, p0 = S.view3d.pitch;
    box.classList.add('turning');
    const move = e=>{
      S.view3d.yaw = (((y0 + (e.clientX-sx)*0.55) % 360) + 360) % 360;
      S.view3d.pitch = Math.max(-60, Math.min(60, p0 + (e.clientY-sy)*0.4));
      box.innerHTML = render3d();
    };
    const up = ()=>{ window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
                     box.classList.remove('turning'); autosave(); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });
  const isvg = document.getElementById('insidesvg');
  if(isvg) for(const d of IDRAGS){
    const el = document.getElementById(d.id);
    if(!el) continue;
    el.addEventListener('pointerdown', ev=>{
      ev.preventDefault();
      const ctm = isvg.getScreenCTM();
      const sx = ev.clientX, sy = ev.clientY;
      const x0 = d.px ? get(d.px) : 0, y0 = d.py ? get(d.py) : 0;
      const start = d.grab ? d.grab() : null;
      el.classList.add('grabbing');
      const move = e=>{
        let tx = 0, ty = 0;
        // A grip changes the SIZE, so there is nothing to nudge: redraw instead. The listeners
        // are on the window, so the redraw replacing this node does not end the drag.
        if(d.move){ d.move((e.clientX-sx)/ctm.a, (e.clientY-sy)/ctm.d, start); renderWork(); return; }
        if(d.px){
          const lim = Math.max(0, (S.W - d.w)/2);
          const nx = Math.max(-lim, Math.min(lim, x0 + (e.clientX-sx)/ctm.a));
          tx = nx - x0; set(d.px, Math.round(nx*2)/2); syncInput(d.px);
        }
        if(d.py){
          const ny = Math.max(0, Math.min(Math.max(0, S.H - d.h), y0 + (e.clientY-sy)/ctm.d));
          ty = ny - y0; set(d.py, Math.round(ny*2)/2); syncInput(d.py);
        }
        el.setAttribute('transform', `translate(${nn(tx)},${nn(ty)})`);
      };
      const up = ()=>{
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        el.classList.remove('grabbing'); renderWork();
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  }
  /* The shape editor. Its own SVG, its own list: a point is dragged in the profile's own
     0-to-1 space, and the box is only put back on pointerup - renormalising mid-drag would
     move W and H under the pointer and the point would run away from it. */
  const fsvg = document.getElementById('freesvg');
  if(fsvg) for(const d of FDRAGS){
    const el = document.getElementById(d.id);
    if(!el) continue;
    if(d.add != null){
      el.addEventListener('pointerdown', ev=>{
        ev.preventDefault(); ev.stopPropagation();
        const P = S.free.pts, a = P[d.add];
        const live = P.map((q,i)=>({q,i})).filter(e=>!e.q.skip);
        const k = live.findIndex(e=>e.i === d.add);
        const b = (k >= 0 ? live[(k+1) % live.length].q : P[(d.add+1) % P.length]);
        P.splice(d.add + 1, 0, {x:(a.x+b.x)/2, y:(a.y+b.y)/2, r:0, m:false, skip:false});
        fselSet([d.add + 1]);
        NODRAG = true;
        renderAll();
      });
      continue;
    }
    el.addEventListener('pointerdown', ev=>{
      ev.preventDefault(); ev.stopPropagation();
      const ctm = fsvg.getScreenCTM();
      const sx = ev.clientX, sy = ev.clientY;
      const p0 = S.free.pts[d.i];
      if(!p0) return;
      /* What moves. One point on its own, unless it is part of the current selection - then
         the whole selection travels together, which is how you take a whole side of the shape
         out without flattening it on the way. Symmetric editing adds the point opposite each
         one; a point with nothing opposite it simply moves alone. */
      const grp = (FSELS.indexOf(d.i) >= 0 && FSELS.length > 1) ? FSELS.slice() : [d.i];
      const mates = [];
      if(S.free.sym) grp.forEach(i=>{
        const j = freeSymPartner(i);
        if(j >= 0 && grp.indexOf(j) < 0 && mates.every(m=>m.j !== j)) mates.push({i, j});
      });
      const was = {};
      grp.concat(mates.map(m=>m.j)).forEach(i=>{ was[i] = {x:S.free.pts[i].x, y:S.free.pts[i].y}; });
      let moved = false;
      el.classList.add('grabbing');
      const move = e=>{
        if(Math.abs(e.clientX-sx) + Math.abs(e.clientY-sy) > 3) moved = true;
        const dx = (e.clientX-sx)/ctm.a/Math.max(1, S.W);
        const dy = (e.clientY-sy)/ctm.d/Math.max(1, S.H);
        grp.forEach(i=>{ const p = S.free.pts[i]; if(!p) return;
                         p.x = was[i].x + dx; p.y = was[i].y + dy; });
        // the mirror partner takes the same move, reflected: x the other way, y the same
        mates.forEach(m=>{ const p = S.free.pts[m.j]; if(!p) return;
                           p.x = was[m.j].x - dx; p.y = was[m.j].y + dy; });
        renderWork();
      };
      const up = ()=>{
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        /* The selection is changed by the CLICK, not by the press: both fire for a tap, and
           doing it in both places toggled every shift-click straight back off again. What is
           left here is the one case a click never sees - a point that has just been dragged
           becomes the selection, unless it was already part of one being moved together. */
        if(moved){
          freeRenorm(); NODRAG = true;
          if(FSELS.indexOf(d.i) < 0) fselSet([d.i]);
        }
        renderAll();
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  }
  /* A box drawn across the drawing takes every point inside it. Started on the background,
     because the background is the one place a press cannot mean anything else - and a press
     that goes nowhere clears the selection, which is what clicking off a thing means
     everywhere. Shift adds to what is already selected rather than replacing it. */
  if(fsvg) fsvg.addEventListener('pointerdown', ev=>{
    if(ev.button) return;
    if(ev.target.closest && ev.target.closest('[data-fpt], .fp-add')) return;
    ev.preventDefault();
    const ctm = fsvg.getScreenCTM();
    const band = document.getElementById('fp-band');
    const at = e => [(e.clientX - ctm.e)/ctm.a, (e.clientY - ctm.f)/ctm.d];
    const [ax, ay] = at(ev);
    const base = ev.shiftKey ? FSELS.slice() : [];
    let moved = false;
    const move = e=>{
      const [bx2, by2] = at(e);
      if(Math.abs(e.clientX-ev.clientX) + Math.abs(e.clientY-ev.clientY) > 4) moved = true;
      if(!moved || !band) return;
      band.style.display = '';
      band.setAttribute('x', nn(Math.min(ax,bx2)));
      band.setAttribute('y', nn(Math.min(ay,by2)));
      band.setAttribute('width', nn(Math.abs(bx2-ax)));
      band.setAttribute('height', nn(Math.abs(by2-ay)));
      const x0 = Math.min(ax,bx2)/Math.max(1,S.W), x1 = Math.max(ax,bx2)/Math.max(1,S.W);
      const y0 = Math.min(ay,by2)/Math.max(1,S.H), y1 = Math.max(ay,by2)/Math.max(1,S.H);
      const hit = [];
      S.free.pts.forEach((q,i)=>{ if(q.x >= x0 && q.x <= x1 && q.y >= y0 && q.y <= y1) hit.push(i); });
      fselSet(base.concat(hit));
      fsvg.querySelectorAll('[data-fpt]').forEach(n=>
        n.classList.toggle('sel', FSELS.indexOf(+n.dataset.fpt) >= 0));
    };
    const up = ()=>{
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if(band){ band.style.display = 'none'; }
      if(!moved && !ev.shiftKey) fselSet([]);
      if(moved) NODRAG = true;
      renderAll();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });
  const svg = document.getElementById('elevsvg');
  if(!svg) return;
  for(const d of DRAGS){
    const el = document.getElementById(d.id);
    if(!el) continue;
    el.addEventListener('pointerdown', ev=>{
      ev.preventDefault();
      ev.stopPropagation();          // a rivet sits inside the tab: only the rivet should move
      const ctm = svg.getScreenCTM();
      const sx = ev.clientX, sy = ev.clientY;
      const elt = d.el ? S.elements.find(x=>x.id === d.el) : null;
      const start = {x:S.pocket.x, y:S.pocket.y, c:S.flap.cInset, a:S.strap.anchorY,
                     ex:elt?elt.x:0, ey:elt?elt.y:0, g:d.grab ? d.grab() : null};
      el.classList.add('grabbing');
      const move = e=>{
        const dx = (e.clientX-sx)/ctm.a, dy = (e.clientY-sy)/ctm.d;
        if(Math.abs(e.clientX-sx) + Math.abs(e.clientY-sy) > 3) NODRAG = true;
        let tx=0, ty=0;
        // A grip changes the SHAPE, so there is nothing to nudge: redraw instead. The
        // listeners live on the window, so the redraw replacing this node does not end the
        // drag - which is exactly why they are there.
        if(d.move){ d.move(dx, dy, start.g, e); renderWork(); return; }
        if(d.id==='ev-pocket'){
          const lim = (S.W - S.pocket.w)/2;
          let nx = Math.max(-lim, Math.min(lim, start.x + dx));
          let ny = Math.max(0, Math.min(S.H - S.pocket.h, start.y - dy));
          // y is measured UP from the base, so the middle of the panel is where the two
          // halves left over are equal - which is the number this snaps to
          const midY = (S.H - S.pocket.h)/2;
          const snapX = Math.abs(nx) < SNAP, snapY = Math.abs(ny - midY) < SNAP;
          if(snapX) nx = 0;
          if(snapY) ny = midY;
          tx = nx - start.x; ty = -(ny - start.y);
          S.pocket.x = Math.round(nx*2)/2; S.pocket.y = Math.round(ny*2)/2;
          guide(d, nx, S.H - ny - S.pocket.h, {w:S.pocket.w, h:S.pocket.h}, snapX, snapY);
          syncInput('pocket.x'); syncInput('pocket.y');
        } else if(elt){
          const eb = rotBox(elt.w, elt.h, elt.rot||0);
          const across = d.across != null ? d.across : S.W;
          const lim = Math.max(0, (across - eb.w)/2);
          const sgn = d.flipX ? -1 : 1;             // the back is drawn from behind
          let nx = Math.max(-lim, Math.min(lim, start.ex + sgn*dx));
          const dn = d.down != null ? d.down : S.H;    // the plan view is D deep, not H
          // a face whose rim is at the BOTTOM of the drawing - the far half of an open wallet -
          // measures y upward, so dragging down has to make the number smaller
          const sgY = d.flipY ? -1 : 1;
          let ny = Math.max(0, Math.min(Math.max(0, dn - eb.h), start.ey + sgY*dy));
          // snap to either centre line when you get close to it
          const midY = Math.max(0, (dn - eb.h)/2);
          const snapX = Math.abs(nx) < SNAP, snapY = Math.abs(ny - midY) < SNAP;
          if(snapX) nx = 0;
          if(snapY) ny = midY;
          tx = sgn*(nx - start.ex); ty = sgY*(ny - start.ey);
          elt.x = Math.round(nx*2)/2; elt.y = Math.round(ny*2)/2;
          guide(d, elt.x, elt.y, eb, snapX, snapY);
          const nxi = document.querySelector(`input[data-el="${elt.id}"][data-k="x"]`);
          const nyi = document.querySelector(`input[data-el="${elt.id}"][data-k="y"]`);
          const cv = v => S.units==='in' ? Math.round(v/IN*16)/16 : Math.round(v*10)/10;
          if(nxi) nxi.value = cv(elt.x);
          if(nyi) nyi.value = cv(elt.y);
        } else if(d.id==='ev-closure'){
          const nc = Math.max(8, Math.min(S.flap.drop-6, start.c - dy));
          ty = -(nc - start.c);
          S.flap.cInset = Math.round(nc*2)/2; syncInput('flap.cInset');
        }
        el.setAttribute('transform', `translate(${nn(tx)},${nn(ty)})`);
      };
      const up = ()=>{
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        el.classList.remove('grabbing');
        clearGuide();
        renderWork();
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  }
}
/* Arranging is a hand operation, and hands slip. "Put them all back" is the wrong size of
   remedy for one drag that went astray, so every change to where the pieces and the notes sit
   copies what was there first and the last one can simply be taken back. It is a session
   stack, not part of the design: what she saves is where things ended up. */
const ARR_UNDO_MAX = 50;
let ARRUNDO = [];
function arrState(){ return JSON.stringify({a:S.arrange||{}, l:S.labels||{}, d:S.dropNotes||{}}); }
function arrSnap(){
  const now = arrState();
  if(ARRUNDO.length && ARRUNDO[ARRUNDO.length-1] === now) return;   // nothing actually moved
  ARRUNDO.push(now);
  if(ARRUNDO.length > ARR_UNDO_MAX) ARRUNDO.shift();
}
function arrUndo(){
  const prev = ARRUNDO.pop();
  if(prev == null) return false;
  const q = JSON.parse(prev);
  S.arrange = q.a || {}; S.labels = q.l || {}; S.dropNotes = q.d || {};
  PDFMSG = '';
  renderTools(TAB); renderWork();
  return true;
}

/* Drag a piece from one place on a sheet to another, or onto a different sheet altogether.
   The packer's guess stays for everything untouched; a piece that has been moved keeps where
   it was put, and says so with a dashed box. Double-click turns it 90 degrees. */
function attachSheetDrags(){
  const pane = document.getElementById('p-pattern');
  if(!pane) return;
  /* You take hold of a piece by its HEADING. A grab rectangle over the whole tile is a sheet
     of glass over every note and number on it - and picking the small text off a drawing that
     is mostly stitch marks was the thing she was actually trying to do. Nothing else on the
     tile starts a drag, so the guards for "that is a note" and "that is the cross" are simply
     no longer reachable. A main piece has no bar at all and cannot be moved. */
  pane.querySelectorAll('.pc-drag:not(.fixed)').forEach(g=>{
    const key = g.dataset.pkey;
    const onBar = ev => !!(ev.target.closest && ev.target.closest('.pc-grab'));
    g.addEventListener('dblclick', ev=>{
      if(!onBar(ev)) return;
      ev.preventDefault();
      const cur = S.arrange[key] || sheetSpotOf(g);
      arrSnap();
      S.arrange[key] = {s:cur.s, x:cur.x, y:cur.y, r:!cur.r};
      renderTools(TAB); renderWork();
    });
    g.addEventListener('pointerdown', ev=>{
      if(ev.button) return;
      if(!onBar(ev)) return;
      ev.preventDefault();
      const svg = g.ownerSVGElement, ctm = svg.getScreenCTM();
      const start = sheetSpotOf(g);
      const sx = ev.clientX, sy = ev.clientY;
      // Where inside the piece the pointer took hold, in sheet millimetres. Without this a
      // piece dropped on another sheet jumped so that its top-left corner went under the
      // pointer, which is not where you were holding it.
      const grabX = (ev.clientX - ctm.e)/ctm.a - MARGIN - start.x;
      const grabY = (ev.clientY - ctm.f)/ctm.d - MARGIN - start.y;
      g.classList.add('grabbing');
      // The piece is following the pointer, so it is what is under the pointer - and asking
      // what sheet is under there would always answer "the one it came from". Take it out of
      // the hit test for the duration and the sheet underneath answers instead. THAT is what
      // stopped a piece being moved to another sheet at all.
      g.style.pointerEvents = 'none';
      let last = null, lit = null;
      const light = el2 => { if(lit === el2) return; if(lit) lit.classList.remove('drop');
                             lit = el2; if(lit) lit.classList.add('drop'); };
      const move = e=>{
        const dx = (e.clientX - sx)/ctm.a, dy = (e.clientY - sy)/ctm.d;
        // which sheet is under the pointer now? a piece can move house
        const over = document.elementFromPoint(e.clientX, e.clientY);
        const sheetEl = over && over.closest ? over.closest('.sheet[data-sheetno]') : null;
        let s2 = start.s, ox = start.x + dx, oy = start.y + dy;
        if(sheetEl && +sheetEl.dataset.sheetno !== start.s){
          const sv2 = sheetEl.querySelector('svg'), c2 = sv2 && sv2.getScreenCTM();
          if(c2){
            s2 = +sheetEl.dataset.sheetno;
            ox = (e.clientX - c2.e)/c2.a - MARGIN - grabX;
            oy = (e.clientY - c2.f)/c2.d - MARGIN - grabY;
          }
        }
        light(sheetEl);
        // never store a drop that landed nowhere: clamp it onto the sheet it belongs to
        const [swm, shm] = SHEETS[S.sheet];
        last = {s:s2, r:start.r,
                x:Math.round(Math.max(-8, Math.min(swm, ox))*2)/2,
                y:Math.round(Math.max(-8, Math.min(shm, oy))*2)/2};
        g.setAttribute('transform', `translate(${nn(start.tx + dx)},${nn(start.ty + dy)})`
          + (start.r ? ` rotate(90) translate(0,${nn(start.back)})` : ''));
      };
      const up = ()=>{
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        g.classList.remove('grabbing');
        g.style.pointerEvents = '';
        light(null);
        if(last){ arrSnap(); S.arrange[key] = last; renderTools(TAB); renderWork(); }
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  });
}
/* Move a note out of the way, or take it off the drawing altogether. The placement pass is
   good but it is not at the bench: it cannot know that the note it tucked under the grain
   arrow is the one you needed to read, or that you would rather not have it at all. So every
   label can be dragged, and double-clicked off. Both are remembered against the label's own
   name, so they survive a redraw and go into the saved design; "Put the notes back" undoes
   the lot. A moved note is still held to its own tile - one that runs onto the neighbouring
   piece reads as that piece's note, which is worse than the collision it was moved to fix. */
function attachLabelDrags(){
  const pane = document.getElementById('p-pattern');
  if(!pane) return;
  pane.querySelectorAll('[data-lk]').forEach(n=>{
    const key = n.dataset.lk;
    n.addEventListener('dblclick', ev=>{
      ev.preventDefault(); ev.stopPropagation();
      arrSnap();
      S.labels[key] = {off:true};
      renderTools(TAB); renderWork();
    });
    n.addEventListener('pointerdown', ev=>{
      if(ev.button) return;
      ev.preventDefault(); ev.stopPropagation();
      // the piece's own frame, whichever way its tile happens to be turned on the sheet
      const host = n.parentNode, svg = n.ownerSVGElement;
      const inv = host.getScreenCTM().inverse();
      const at = (cx, cy) => { const q = svg.createSVGPoint(); q.x = cx; q.y = cy;
                               return q.matrixTransform(inv); };
      const p0 = at(ev.clientX, ev.clientY);
      const was = S.labels[key] && !S.labels[key].off ? S.labels[key] : {dx:0, dy:0};
      const orig = n.getAttribute('transform') || '';
      n.classList.add('moved');
      let last = null;
      const move = e=>{
        const p1 = at(e.clientX, e.clientY);
        const dx = p1.x - p0.x, dy = p1.y - p0.y;
        last = {dx:Math.round((was.dx + dx)*10)/10, dy:Math.round((was.dy + dy)*10)/10};
        n.setAttribute('transform', `translate(${nn(dx)},${nn(dy)}) ${orig}`);
      };
      const up = ()=>{
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        n.classList.remove('moved');
        if(last){ arrSnap(); S.labels[key] = last; renderTools(TAB); renderWork(); }
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  });
}
/** Where a piece currently sits, read straight off its own transform. */
function sheetSpotOf(g){
  const t = g.getAttribute('transform') || '';
  const tr = /translate\(([-\d.]+),\s*([-\d.]+)\)/.exec(t);
  const rot = /rotate\(90\)\s*translate\(0,\s*([-\d.]+)\)/.exec(t);
  const x = tr ? +tr[1] : 0, y = tr ? +tr[2] : 0;
  return {s:+g.dataset.sheet || 0, x, y, r:!!rot, tx:x, ty:y,
          back: rot ? +rot[1] : 0, gx:0, gy:0};
}
function syncInput(p){
  const mm = +get(p);
  // a control can be on screen twice - in the rail and in the inspector - so update them all
  document.querySelectorAll(`input[data-p="${p}"][data-k="dim"]`)
    .forEach(n=>{ n.value = S.units==='in' ? Math.round(mm/IN*16)/16 : Math.round(mm*10)/10; });
  document.querySelectorAll(`input[data-p="${p}"][data-k="dimr"]`).forEach(n=>{ n.value = mm; });
  document.querySelectorAll(`input[data-p="${p}"][data-k="int"],input[data-p="${p}"][data-k="intr"]`)
    .forEach(n=>{ n.value = Math.round(mm); });
}

function railInput(e){
  const el = e.target, p = el.dataset.p, k = el.dataset.k;
  if(el.id === 'dg-name'){ S.designName = el.value.slice(0,60); autosave(); return; }
  if(el.dataset.fshape != null){
    if(!el.value) return;
    S.free = Object.assign({}, S.free, {pts:freeShape(el.value)});
    fselSet([]); renderAll(); return;
  }
  if(el.dataset.fr != null){
    // the number is typed once and lands on everything selected: rounding four corners to
    // the same radius is one of the two things a selection is for
    FSELS.filter(i=>i !== +el.dataset.fr).forEach(i=>{
      const r2 = S.free.pts[i];
      if(r2) r2.r = Math.max(0, Math.min(200, S.units==='in' ? (+el.value)*IN : +el.value));
    });
    const q = S.free.pts[+el.dataset.fr];
    const mm = S.units==='in' ? (+el.value)*IN : +el.value;
    if(!q || isNaN(mm)) return;
    q.r = Math.max(0, Math.min(200, mm));
    renderWork(); return;
  }
  if(el.dataset.el){
    const it = S.elements.find(x=>x.id === +el.dataset.el);
    if(!it) return;
    if(k==='face'){ it.face = el.value; renderAll(); return; }
    if(k==='side'){ it.side = el.value; if(el.value!=='both') it.mirror = false; renderAll(); return; }
    if(k==='fix'){ it.fix = el.value; renderAll(); return; }
    if(k==='open'){ it.open = el.value; renderAll(); return; }
    // the arrangement decides which of the spacing numbers are worth showing, so the rail
    // has to be rebuilt rather than merely redrawn
    if(k==='rivetPat'){ it.rivetPat = el.value; it.rivets = rivetCount(rivetSpecAt(it)); renderAll(); return; }
    // both of these change what the card panel has to say about itself, so the rail is rebuilt
    if(k==='build'){ it.build = el.value; renderAll(); return; }
    if(k==='slots'){ it.slots = Math.max(1, Math.min(10, Math.round(+el.value) || 1)); renderAll(); return; }
    if(k==='rot'){
      const deg = ((Math.round(+el.value) % 360) + 360) % 360;
      if(isNaN(deg)) return;
      it.rot = deg;
      [].slice.call(document.querySelectorAll('input[data-el="'+it.id+'"][data-k="rot"]'))
        .forEach(function(t){ if(t !== el) t.value = deg; });
      const fld = el.closest('.fld'), lab = fld && fld.querySelector('label');
      if(lab && ELTYPES[it.type].opens) lab.textContent = 'Turn \u00b7 opens ' + openWord(it.open, deg);
      renderWork();
      return;
    }
    const mm = (k==='rivets') ? Math.round(+el.value) : (S.units==='in' ? (+el.value)*IN : +el.value);
    if(isNaN(mm)) return;
    it[k] = k==='rivets' ? Math.max(1, Math.min(6, mm)) : Math.round(mm*100)/100;
    renderWork();
    return;
  }
  if(!p) return;
  if(k==='dim' || k==='dimr'){
    const mm = (k==='dim' && S.units==='in') ? (+el.value)*IN : +el.value;
    if(isNaN(mm)) return;
    set(p, Math.round(mm*100)/100);
    document.querySelectorAll(`input[data-p="${p}"]`).forEach(o=>{
      if(o === el) return;
      o.value = o.dataset.k==='dim' ? (S.units==='in'? Math.round(mm/IN*16)/16 : Math.round(mm*10)/10)
                                    : Math.round(mm*100)/100;
    });
    renderWork();
  } else if(k==='int' || k==='intr'){
    set(p, Math.round(+el.value));
    document.querySelectorAll(`input[data-p="${p}"]`).forEach(o=>{ if(o !== el) o.value = Math.round(+el.value); });
    if(p==='cards.n') renderAll(); else renderWork();
  } else if(k==='sel'){
    const f = FIELD[p];
    /* Switching to a shape you draw starts from the shape the bag already has, rather than
       from a rectangle you then have to undo. That is route one of the two: take the duffle,
       and start pulling its end panel about. */
    if(p === 'construction' && el.value === 'free' && S.construction !== 'free'){
      FREEMSG = seedFree(); fselSet([]);
    }
    set(p, f && f.num ? parseFloat(el.value) : el.value);
    renderAll();
  }
}
document.getElementById('rail').addEventListener('input', railInput);
/* the picker's own wiring lives down here with everything else that touches the DOM:
   the node tests pull in every line above this point and run it without a document. */
document.addEventListener('pointerdown', e=>{
  const btn = e.target.closest && e.target.closest('.pick');
  if(btn){ e.preventDefault(); btn.focus(); openPick(btn); return; }
  if(!(e.target.closest && e.target.closest('#pop'))) closePick();
}, true);
document.getElementById('pop').addEventListener('click', e=>{
  const b = e.target.closest('button[data-i]');
  if(b) pickChoose(+b.dataset.i);
});
document.addEventListener('keydown', e=>{
  if(!PICK) return;
  const pop = document.getElementById('pop');
  const list = [...pop.querySelectorAll('button[data-i]')];
  const at = list.findIndex(b=>b.classList.contains('on2'));
  if(e.key === 'Escape'){ const b = pickHost(PICK); closePick(); b.focus(); e.stopPropagation(); e.preventDefault(); return; }
  if(e.key === 'Enter' || e.key === ' '){ if(at >= 0) pickChoose(at); e.preventDefault(); return; }
  const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
  if(!step) return;
  e.preventDefault();
  const nx = Math.max(0, Math.min(list.length - 1, (at < 0 ? 0 : at + step)));
  list.forEach(b=>b.classList.remove('on2'));
  if(list[nx]){ list[nx].classList.add('on2'); list[nx].scrollIntoView({block:'nearest'}); }
}, true);
// a menu is anchored in page coordinates, so anything that moves the page closes it
window.addEventListener('resize', closePick);
window.addEventListener('scroll', closePick, true);

document.getElementById('rail').addEventListener('change', e=>{
  if(e.target.id !== 'dg-open') return;
  const f = e.target.files && e.target.files[0];
  e.target.value = '';
  if(!f) return;
  const r = new FileReader();
  r.onload = ()=>{
    try{ applyDesign(JSON.parse(r.result), f.name.replace(/\.bag\.json$|\.json$/i,''));
         S.designId = null; DESIGNMSG = 'Opened ' + f.name + '.'; DESIGNERR = false; renderAll(); }
    catch(err){ DESIGNMSG = err.message || 'That file is not a design.'; DESIGNERR = true; renderRail(); }
  };
  r.onerror = ()=>{ DESIGNMSG = 'That file could not be read.'; DESIGNERR = true; renderRail(); };
  r.readAsText(f);
});
function railClick(e){
  const t = e.target;
  if(t.id==='dg-save' || t.id==='dg-saveas'){ saveToLibrary(t.id==='dg-saveas'); renderAll(); return; }
  if(t.id==='dg-file'){ saveToFile(); return; }
  if(t.id==='dg-copy'){
    const ta = document.getElementById('dg-json');
    ta.select();
    if(navigator.clipboard) navigator.clipboard.writeText(ta.value).then(()=>{ DESIGNMSG='Design copied.'; DESIGNERR=false; renderRail(); }, ()=>{});
    return;
  }
  if(t.id==='dg-paste'){
    try{ applyDesign(JSON.parse(document.getElementById('dg-json').value)); S.designId=null;
         DESIGNMSG='Design loaded.'; DESIGNERR=false; renderAll(); }
    catch(err){ DESIGNMSG = err.message || 'That text is not a design.'; DESIGNERR=true; renderRail(); }
    return;
  }
  const open = t.closest('[data-open]');
  if(open){
    const d = libRead().find(x=>x.id === open.dataset.open);
    if(d){ try{ applyDesign(d); S.designId = d.id; DESIGNMSG = 'Opened \u201c' + d.name + '\u201d.'; DESIGNERR=false; }
           catch(err){ DESIGNMSG = err.message; DESIGNERR=true; } renderAll(); }
    return;
  }
  const drop = t.closest('[data-drop]');
  if(drop){
    const id = drop.dataset.drop;
    libWrite(libRead().filter(x=>x.id !== id));
    if(S.designId === id) S.designId = null;
    DESIGNMSG = 'Deleted.'; DESIGNERR = false; renderAll(); return;
  }
  const add = e.target.closest('[data-add]');
  if(add){
    const made = newElement(add.dataset.add);
    // added from a face's own panel, it belongs to that face - not to whichever one happens
    // to be first in the type's list
    if(add.dataset.face && ELTYPES[made.type].faces.includes(add.dataset.face))
      made.face = add.dataset.face;
    S.elements.push(made); renderAll(); return;
  }
  const del = e.target.closest('[data-del]');
  if(del){ S.elements = S.elements.filter(x=>x.id !== +del.dataset.del); renderAll(); return; }
  const b = e.target.closest('.tog');
  if(b && b.dataset.el){
    const it = S.elements.find(x=>x.id === +b.dataset.el);
    if(it){ it.mirror = !it.mirror; renderAll(); }
    return;
  }
  if(b){ const p=b.dataset.p; set(p, !get(p)); renderAll(); return; }
  const fsy = e.target.closest && e.target.closest('[data-fsym]');
  if(fsy){ S.free.sym = !S.free.sym; renderAll(); return; }
  const fa = e.target.closest && e.target.closest('[data-fact]');
  if(fa){
    const P = S.free.pts, act = fa.dataset.fact;
    if(act === 'seed'){ FREEMSG = seedFree(); fselSet([]); renderAll(); return; }
    if(act === 'mirrorL' || act === 'mirrorR'){
      FREEMSG = freeMirror(act === 'mirrorL'); freeRenorm(); renderAll(); return;
    }
    if(act === 'none'){ fselSet([]); renderAll(); return; }
    if(!FSELS.length || FSEL == null || !P[FSEL]) return;
    if(act === 'mouth'){
      /* One point marks an end; two or more say "the mouth runs between these", which is the
         sentence you actually have in mind when you have just dragged a box over the top of
         the shape. Everything else stops being an end, because there are only ever two. */
      const run = FSELS.slice().sort((a,b)=>a-b);
      if(run.length === 1) freeMark(run[0]);
      else { P.forEach(q=>{ q.m = false; }); P[run[0]].m = true; P[run[run.length-1]].m = true; }
    }
    if(act === 'skip'){
      const on = !FSELS.every(i=>P[i].skip);
      FSELS.forEach(i=>{ P[i].skip = on; });
      // never skip so many that there is no shape left
      if(P.filter(q=>!q.skip).length < FREE_MIN) FSELS.forEach(i=>{ P[i].skip = false; });
    }
    if(act === 'del'){
      const kill = FSELS.slice().sort((a,b)=>b-a);
      kill.forEach(i=>{ if(P.filter(q=>!q.skip).length > FREE_MIN) P.splice(i, 1); });
      fselSet([]);
    }
    if(act === 'straight') FREEMSG = freeStraighten();
    if(act === 'smooth')   FREEMSG = freeSmooth();
    freeRenorm(); renderAll(); return;
  }
  if(e.target.id==='reset'){ loadPreset(document.getElementById('preset').value); }
}
document.getElementById('rail').addEventListener('click', railClick);
/* The inspector carries the same controls, so it is served by the same two handlers. */
document.getElementById('insp').addEventListener('input', railInput);
document.getElementById('insp').addEventListener('click', e=>{
  if(e.target.closest('#insp-x')){ SEL = null; renderInsp(); return; }
  railClick(e);
});
/* Clicking a part of the drawing brings up what shapes it. A drag is not a click: the
   pointer handlers set NODRAG as soon as something actually moves, and every fresh press
   clears it - otherwise a drag that ended off the edge of its own handle would eat the
   next click as well. */
document.getElementById('p-bag').addEventListener('pointerdown', ()=>{ NODRAG = false; }, true);
document.getElementById('p-bag').addEventListener('click', e=>{
  if(NODRAG){ NODRAG = false; return; }
  const fp = e.target.closest('[data-fpt]');
  if(fp){
    fselToggle(+fp.dataset.fpt, e.shiftKey);
    const at = inspPlace(e.clientX, e.clientY);
    SEL = FSELS.length ? {kind:'point', el:null, x:at.x, y:at.y} : null;
    renderAll(); return;
  }
  const hit = e.target.closest('[data-sel]');
  if(!hit){ if(SEL){ SEL = null; renderInsp(); } return; }
  const kind = hit.dataset.sel, id = hit.dataset.eid ? +hit.dataset.eid : null;
  if(SEL && SEL.kind === kind && SEL.el === id){ SEL = null; renderInsp(); return; }
  const at = inspPlace(e.clientX, e.clientY);
  SEL = {kind, el:id, x:at.x, y:at.y};
  renderInsp();
});
document.addEventListener('keydown', e=>{ if(e.key === 'Escape' && SEL){ SEL = null; renderInsp(); } });
/* Ctrl/Cmd + Z takes back the last arranging move, but only while the pattern is what you are
   looking at - anywhere else that key belongs to whatever field has the focus. */
document.addEventListener('keydown', e=>{
  if(TAB !== 'pattern' || !(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
  const a = document.activeElement;
  if(a && /^(INPUT|TEXTAREA)$/.test(a.tagName)) return;
  if(arrUndo()) e.preventDefault();
});
document.getElementById('wtools').addEventListener('input', e=>{
  if(e.target.id==='t-sheet'){ S.sheet = e.target.value; renderWork(); }
  if(e.target.id==='t-zoom'){ S.zoom = e.target.value; renderWork(); }
});
document.getElementById('p-pattern').addEventListener('click', e=>{
  if(e.target.id==='pv-all'){ PATTERN_ALL = true; renderWork(); }
  // the cross on an assembly diagram: it is not a cutting pattern, and it is allowed to go
  const nx = e.target.closest && e.target.closest('[data-nx]');
  if(nx){ arrSnap(); S.dropNotes[nx.dataset.nx] = true; renderTools('pattern'); renderWork(); return; }
  if(e.target.id==='err-reset') loadPreset(document.getElementById('preset').value);
});
['p-bag','p-cut'].forEach(id=>document.getElementById(id).addEventListener('click', e=>{
  if(e.target.id==='err-reset') loadPreset(document.getElementById('preset').value);
  // "make it 275 and the holes land better" - taking the suggestion is one click, and it is
  // the same as having typed the number, so the whole page follows it
  const fit = e.target.closest && e.target.closest('[data-fit]');
  if(fit){
    const [k, v] = fit.dataset.fit.split(':');
    set(k, parseFloat(v));
    FITCACHE = null; SYMCACHE = null;
    renderAll();
  }
  // a symmetry suggestion can be about an element's own size, which is not a path in S
  const sym = e.target.closest && e.target.closest('[data-symfit]');
  if(sym){
    const raw = sym.dataset.symfit, cut = raw.lastIndexOf(':');
    symSet(raw.slice(0, cut), parseFloat(raw.slice(cut + 1)));
    FITCACHE = null; SYMCACHE = null;
    renderAll();
  }
}));
document.getElementById('wtools').addEventListener('click', e=>{
  if(e.target.id==='pv-sheets' || e.target.id==='pv-full'){
    S.pv = e.target.id==='pv-full' ? 'full' : 'sheets'; renderTools('pattern'); renderWork(); return;
  }
  if(e.target.id==='t-grid'){ S.grid = S.grid === false; e.target.setAttribute('aria-pressed', S.grid); renderWork(); }
  if(e.target.id==='t-dims'){ S.dims = !S.dims; e.target.setAttribute('aria-pressed', S.dims); renderWork(); }
  if(e.target.id==='t-lining'){ S.showLining = !S.showLining; e.target.setAttribute('aria-pressed', S.showLining); renderWork(); }
  if(e.target.id==='t-counts'){ S.counts = !S.counts; e.target.setAttribute('aria-pressed', S.counts); renderWork(); }
  if(e.target.id==='t-notes'){ S.notes = !S.notes; e.target.setAttribute('aria-pressed', S.notes); renderWork(); }
  if(e.target.id==='t-undo'){ arrUndo(); }
  if(e.target.id==='t-unarr'){ arrSnap(); S.arrange = {}; PDFMSG = ''; renderTools('pattern'); renderWork(); }
  if(e.target.id==='t-unlab'){ arrSnap(); S.labels = {}; renderTools('pattern'); renderWork(); }
  if(e.target.id==='t-undg'){ arrSnap(); S.dropNotes = {}; renderTools('pattern'); renderWork(); }
  if(e.target.id==='t-pdf'){ savePDF('pattern'); }
  if(e.target.id==='t-pack'){ savePDF('pack'); }
});
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click', ()=>{
  TAB = b.dataset.tab;
  document.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-pressed', x===b));
  document.querySelectorAll('.pane').forEach(p=>p.classList.toggle('on', p.id==='p-'+TAB));
  renderTools(TAB); renderWork();
}));
document.getElementById('u-mm').addEventListener('click', ()=>setUnits('mm'));
document.getElementById('u-in').addEventListener('click', ()=>setUnits('in'));
function setUnits(u){
  S.units = u;
  document.getElementById('u-mm').setAttribute('aria-pressed', u==='mm');
  document.getElementById('u-in').setAttribute('aria-pressed', u==='in');
  renderAll();
}
function deepAssign(dst, src){
  for(const k in src){
    if(src[k] && typeof src[k]==='object' && !Array.isArray(src[k])) deepAssign(dst[k]=dst[k]||{}, src[k]);
    else dst[k] = src[k];
  }
}
function loadPreset(key){
  const p = PRESETS[key]; if(!p) return;
  S.elements = [];                                  // clear first; the preset may supply its own
  deepAssign(S, JSON.parse(JSON.stringify(p.s)));
  if(!Array.isArray(p.s.elements)){ S.elements = []; S.elSeq = 0; }
  S.designId = null; S.designName = p.label;
  DESIGNMSG = ''; DESIGNERR = false;
  PATTERN_ALL = false;
  sanitise();
  renderAll();
}
/* The bag-type menu is the same picker as everything else, redrawn when a preset is loaded so
   it always names the one you are looking at. */
const PRESET_OPTS = Object.entries(PRESETS).map(([k,v])=>[k, v.label]);
let PRESET_CUR = PRESET_OPTS[0][0];
function drawPreset(){
  document.getElementById('presetbox').innerHTML =
    pickHTML(PRESET_CUR, PRESET_OPTS, 'id="preset" aria-label="Load a starting point"', 'preset');
}
drawPreset();
document.getElementById('presetbox').addEventListener('input', e=>{
  if(e.target.id !== 'preset') return;
  PRESET_CUR = e.target.value;
  loadPreset(PRESET_CUR);
  drawPreset();
});

/* Saving files. Inside a Claude artifact the frame is sandboxed and only the host can hand
   the reader a file; served as an ordinary page the browser does it itself. Prefer the host's
   when there is a host, and fall back to the browser's, which is what runs everywhere else.
   Both answer the same `save({filename, data})` - see src/save-file.js. */
if(window.claude && typeof claude.use === 'function'){
  claude.use('downloads')
    .then(ns=>{ DL = ns || SAVE_FILE; renderRail(); })
    .catch(()=>{ DL = SAVE_FILE; renderRail(); });
} else { DL = SAVE_FILE; }

if(restoreLast()) DESIGNMSG = 'Picked up where you left off.';
renderAll();
