/* ============================================================
   THE ENGINE \u2014 turn the spec into flat pieces.
   Every piece carries the formula that produced it, so the
   numbers can be checked (and argued with) at the bench.
   ============================================================ */

function P(o){                       // piece factory with defaults
  entReset();                        // this piece is finished; its crowned edges stop applying
  return Object.assign({qty:1, mat:'Leather', draw:[], dims:[], formula:'', note:'', seam:0}, o);
}
const D_ = (ax,a,b,at,label,tier) => ({ax,a,b,at,label,tier:tier||0});

/** Body panels for one shell (used twice: leather, then lining). */
/** Interior fittings drawn on whichever panel carries them, with their stitch runs.
    rimY is the finished rim of that face; dir is +1 if "down from the rim" means +y. */
function interiorOn(d, dm, cx, rimY, dir, panelSa, face){
  face = face || 'back';
  const on = k => (S[k].face || 'back') === face;
  const put = (w,h,yDown) => ({x:cx - w/2, y:(dir>0 ? rimY + yDown : rimY - yDown - h), w, h});
  if(S.lined && S.slip.on && on('slip')){
    const r = put(S.slip.w, S.slip.h, S.slip.y); r.x += S.slip.x;
    d.push({t:'mark', d:rr(r.x,r.y,r.w,r.h,0)});
    rectRunSides(r.x, r.y, r.w, r.h, 0, 'top', panelSa, panelSa)
      .forEach(run => d.push(SEAM('slip','Slip pocket to lining', run, {even:true})));
    d.push({t:'text', x:r.x+r.w/2, y:r.y+r.h/2, s:'SLIP POCKET', size:5, anchor:'middle', mark:true, rot:dir>0?0:180});
    dm.push(D_('v', dir>0?rimY:r.y+r.h, dir>0?r.y:rimY, r.x+r.w/2, fmt(S.slip.y), 1));
  }
  if(S.lined && S.zipPkt.on && on('zipPkt')){
    const r = put(S.zipPkt.w, 12, S.zipPkt.y);
    d.push({t:'mark', d:rr(r.x,r.y,r.w,r.h,0)});
    d.push(SEAM('zipwindow','Zip window to lining', boxRun(r.x-3, r.y-3, r.x+r.w+3, r.y+r.h+3), {closed:true}));
    d.push({t:'text', x:r.x+r.w/2, y:r.y-4.5, s:'CUT ZIP WINDOW ' + fmt(S.zipPkt.w) + ' \u00d7 12', size:4, anchor:'middle', mark:true, rot:dir>0?0:180});
    dm.push(D_('v', dir>0?rimY:r.y+r.h, dir>0?r.y:rimY, r.x+r.w/2, fmt(S.zipPkt.y), 2));
  }
  if(S.cards.on && on('cards')){
    const cw = cardSlotW() + 2*panelSa, stackH = cardStackH() + panelSa;
    const r = put(cw, stackH, S.cards.y); r.x += S.cards.x;
    d.push({t:'mark', d:rr(r.x,r.y,r.w,r.h,0)});
    for(let i=1;i<cardSlotN();i++){
      const hh = cardSlotH(i) + panelSa;
      d.push({t:'mark', d:hLine(r.x, r.x+r.w, dir>0 ? r.y + stackH - hh : r.y + hh)});
    }
    [r.x+panelSa, r.x+r.w-panelSa].forEach(x=>
      d.push(SEAM('cardside','Card slot stack, each side',
        [['L', x, r.y + stackH - panelSa, x, r.y + panelSa]], {planLen:stackH - 2*panelSa})));
    d.push({t:'text', x:r.x+r.w/2, y:dir>0 ? r.y+stackH-5 : r.y+5, s:cardSlotN()+' CARD SLOTS', size:4.6, anchor:'middle', mark:true, rot:dir>0?0:180});
    dm.push(D_('v', dir>0?rimY:r.y+stackH, dir>0?r.y:rimY, r.x+r.w/2, fmt(S.cards.y), 1));
  }
}

