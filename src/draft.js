/* ---------- the full draft ---------- */
function draft(){
  const t = S.thickness, sa = S.sa, W = S.W, H = S.H, D = S.D;
  const rim = S.edge==='turned' ? S.turn : 0;
  const pieces = [], HW = [], STEPS = [], WARN = [];
  resetPlan(); entReset();

  if(S.top !== 'flap' && S.elements.some(e=>e.face === 'top'))
    WARN.push(`The top face is the part of the flap that lies over the mouth, and this bag has no flap \u2014 anything you put there is cut but has nowhere to go. Move it to the back panel or the gusset.`);
  if(S.construction === 'free'){
    const FW = freeProfile(S.W, S.H);
    if(S.top === 'roll' || S.top === 'draw')
      WARN.push(`A roll top and a drawstring both need a mouth that folds or gathers flat, and a shape you drew has no straight rim to do it on \u2014 this one is drafted with the mouth left open. Flap, zip, magnet and open all work.`);
    if(S.top === 'zip' && FW.mouthLen > FW.chord*1.10)
      WARN.push(`The mouth runs ${fmt(FW.mouthLen)} round the curve but only ${fmt(FW.chord)} straight across. A zip chain does not like that much curve \u2014 move the two mouth marks onto a flatter part of the profile, or use a flap.`);
    if(S.top === 'flap' && FW.mouthLen > FW.chord*1.10)
      WARN.push(`The flap is cut ${fmt(FW.chord)} wide, straight across your two mouth marks, but the mouth itself runs ${fmt(FW.mouthLen)} round the curve. The corners will stand off unless you flatten that part of the profile.`);
    if(S.gussetStyle !== 'wrap')
      WARN.push(`A shape you draw is gusseted with one wrap-around strip \u2014 split halves and a separate base need a straight base to divide at, and this profile has none.`);
  }
  if(S.strap.type!=='none' && S.strap.tabFix!=='stitch'){
    const rowN = rivetRows(strapRivetSpec()).length;
    const need = S.strap.rivetInset + (rowN-1)*S.strap.rivetPitch + 6;
    const have = S.strap.type==='handles' ? S.handles.attach : Math.max(18, S.strap.tabLen);
    if(have < need) WARN.push(`${rowN} row${rowN>1?'s':''} of rivets at ${fmt(S.strap.rivetPitch)} need about ${fmt(need)} of attachment length and you have ${fmt(have)} \u2014 they are drawn squeezed up. Lengthen the attachment, close the rows up, or drop a row.`);
  }

  /* --- shell --- */
  pieces.push(...bodyPanels({W,H,D,mat:'Leather',tag:'',deco:true,sa,rim,t,interior:!S.lined,warn:WARN}));
  if(S.lined){
    /* A lining bag is drafted smaller so it sits inside the leather without bagging. A wallet
       has no inside to bag into: the two layers are laminated and stitched to each other round
       the whole perimeter, so they are cut the SAME and they share every seam - which is the
       only way the two halves can be pricked to one count. */
    const wallet = S.construction === 'fold' && D < 12;
    if(wallet){
      pieces.push(...bodyPanels({W,H,D,mat:'Lining',tag:'lining',deco:false,sa,rim,t,
                                 interior:true,live:true,warn:WARN}));
      WARN.push(`A wallet is laminated, not lined: the inside layer is cut the same ${fmt(W)} \u00d7 ${fmt(H)} as the outer, and the two are stitched to each other up both sides only. The two top edges are left open on purpose \u2014 that full-width gap between the layers is the note pocket. Everything else that goes inside is stitched to the inside layer first, while it is still flat.`);
    } else {
      const lw = Math.max(20,W-2*t), lh = Math.max(20,H-t-2), ld = Math.max(0,D-2*t);
      pieces.push(...bodyPanels({W:lw,H:lh,D:ld,mat:'Lining',tag:'lining',deco:false,sa,rim:0,t:0.4,interior:true,warn:WARN}));
      WARN.push(`Lining is drafted ${fmt(2*t)} narrower and ${fmt(t+2)} shorter than the shell so it sits inside ${fmt(t)} leather without bagging.`);
    }
  }

  /* --- flap (separate piece except in folded construction) --- */
  if(S.top==='flap' && S.construction!=='fold'){
    const F = S.flap, ease = 2*t;
    /* How wide the flap has to be is how wide the MOUTH is, which is only the same as W on a
       bag with a straight rim. On a shape she drew it is the straight line across her two
       mouth marks - a flap wants an edge it can be sewn to, and a chord is one. */
    const fw = S.construction==='free' ? mouthChord() : W;
    const cw = fw + 2*rim;
    const L = sa + F.attach + D + ease + F.drop + rim;
    const yBackRim = sa + F.attach, yTopFront = yBackRim + D + ease;
    const rad = Math.min(F.radius, cw/2, F.drop);
    function flapShape(inset){
      const w = cw-2*inset, x0 = inset, y0 = inset, len = L-inset;
      if(F.style==='point'){
        const pd = Math.min(w/2, F.drop*0.9);
        return poly([[x0,y0],[x0+w,y0],[x0+w,len-pd],[x0+w/2,len],[x0,len-pd]]);
      }
      if(F.style==='tongue'){
        const tw = Math.max(w*0.42, 40), tx = x0+(w-tw)/2, sh = Math.min(F.drop*0.55, len-yTopFront-6);
        return [ `M ${nn(x0)} ${nn(y0)} H ${nn(x0+w)} V ${nn(len-sh)}`,
                 `H ${nn(tx+tw)} V ${nn(len-Math.min(rad,sh))}`,
                 `A ${nn(Math.min(rad,tw/2))} ${nn(Math.min(rad,tw/2))} 0 0 1 ${nn(tx+tw-Math.min(rad,tw/2))} ${nn(len)}`,
                 `H ${nn(tx+Math.min(rad,tw/2))}`,
                 `A ${nn(Math.min(rad,tw/2))} ${nn(Math.min(rad,tw/2))} 0 0 1 ${nn(tx)} ${nn(len-Math.min(rad,sh))}`,
                 `V ${nn(len-sh)} H ${nn(x0)} Z`].join(' ');
      }
      if(F.style==='round') return rr(x0,y0,w,len-y0,{tl:0,tr:0,br:Math.max(0,rad-inset),bl:Math.max(0,rad-inset)});
      return rr(x0,y0,w,len-y0,0);
    }
    const d=[], dm=[];
    d.push({t:'cut', d:flapShape(0)});
    d.push({t:'fold', d:hLine(0,cw,yBackRim), label:'BACK RIM'});
    d.push({t:'fold', d:hLine(0,cw,yTopFront), label:'TOP FRONT EDGE'});
    d.push(SEAM('flapattach','Flap to back panel', [['L',(cw-fw)/2, sa, (cw+fw)/2, sa]], {even:true, trim:sa}));
    d.push({t:'text', x:(cw-fw)/2+3, y:sa-1.6, s:'STITCH TO BACK PANEL', size:3.8, anchor:'start', mark:true});
    d.push({t:'ctr', d:vLine(cw/2,0,L)});
    d.push({t:'notch', x:cw/2, y:0, dir:'down'});
    // the band between the two fold lines is the top of the bag: anything on the `top` face
    // is measured down from the back rim, exactly as it is drawn in the plan view
    placeElements(d, dm, {face:'top', cx:cw/2, rimY:yBackRim, dir:1, sa});
    if(F.lined){
      // sides and tip, from the back-rim fold round to the other side - the attach end is caught under the flap
      const edge = flapEdgeRun(cw, L, yBackRim, F, rad);
      d.push(SEAM('flapedge','Flap edge, round the lining', edge, {even:true, trim:sa}));
      d.push({t:'text', x:cw/2, y:L-2.5, s:'EDGE STITCH HOLDS THE LINING', size:3.6, anchor:'middle', mark:true});
    }
    if(F.closure!=='none'){
      const xs4 = closureXs(cw/2, fw);
      // with a pull tab the lock is not on the flap at all: the flap carries the footprint
      if(pullOn()) xs4.forEach((cq,i)=>attachOn(d, cq - pullW()/2, L - pullLift() - pullAttach(), pullW(), pullAttach(),
                     'pulltab', 'Pull tab to flap',
                     {axis:'y', far:'end', fix:F.pull.fix, rivetSpec:rivetSpecAt(F.pull),
                      r:F.pull.r, label:i===0?'PULL TAB':''}));
      else xs4.forEach((cq,i)=>d.push({t:'hole', x:cq, y:L-F.cInset, r:3, label:i===0?CLOSURE_LABEL():''}));
    }
    d.push({t:'grain', x:cw-11, y:L*0.6, len:Math.min(70,L*0.3), dir:'v'});
    d.push({t:'text', x:cw/2, y:yTopFront+Math.min(24,F.drop*0.3), s:'FLAP \u2014 GRAIN SIDE UP', size:6, anchor:'middle', dim:true});
    dm.push(D_('h',0,cw,-9,fmt(cw)));
    dm.push(D_('v',0,L,-9,fmt(L)));
    dm.push(D_('v',sa,yBackRim,sa+7,fmt(F.attach),1));
    dm.push(D_('v',yBackRim,yTopFront,sa+7,fmt(D+ease),1));
    dm.push(D_('v',yTopFront,L,sa+7,fmt(F.drop+rim),1));
    pieces.push(P({key:'flap', name:'Flap', mat:'Leather', w:cw, h:L, draw:d, dims:dm, seam:2*F.drop+cw,
      formula:`length = SA ${fmt(sa)} + attachment ${fmt(F.attach)} + over the top (D ${fmt(D)} + bend ease 2\u00d7thickness ${fmt(ease)}) + drop ${fmt(F.drop)} + rim ${fmt(rim)} = ${fmt(L)}\n`+
              `width = ${S.construction==='free' ? `the mouth, straight across, ${fmt(fw)}` : `finished W ${fmt(W)}`}${rim?` + 2 \u00d7 turn ${fmt(rim)}`:''} = ${fmt(cw)}\n`+
              `Bend ease matters: without it the flap pulls short over a filled bag.`}));
    if(F.lined){
      const dl=[{t:'cut', d:flapShape(1.5)},{t:'text', x:cw/2, y:L*0.6, s:'FLAP LINING', size:6, anchor:'middle', dim:true},
        SEAM('flapedge','Flap edge, round the lining', flapEdgeRun(cw, L, yBackRim, F, rad), {even:true, trim:sa})];
      pieces.push(P({key:'flapL', name:'Flap lining', mat:S.lined?'Lining':'Leather', w:cw, h:L, draw:dl, seam:0,
        dims:[D_('h',1.5,cw-1.5,-9,fmt(cw-3)), D_('v',1.5,L,-9,fmt(L-1.5))],
        formula:`Flap outline inset 1.5 mm all round so the lining never peeks past the edge.`}));
    }
  }

  /* --- how the pieces that stack, fold or thread go together ---------------------------
     Some of these are obvious once you have made one and baffling before that: a card stack
     is five pieces on one bottom edge, a padded strap is a sandwich with the foam held back
     from the edge, and an adjustable strap is four separate things that only make sense
     threaded. So they get a small assembly drawing on the sheet, laid out like any other
     tile but drawn NOT to scale and marked as such. */
  const DG = (key, name, w2, h2, draw, formula) => pieces.push(P({
    key, name, mat:'Diagram', diagram:true, w:w2, h:h2, qty:1, seam:0, draw, formula}));
  const dgTxt = (x,y,str,size,anch,mark) => ({t:'text', x, y, s:str, size:size||4, anchor:anch||'middle', mark:!!mark});
  const dgArrow = (x0,y0,x1,y1) => {
    const a = Math.atan2(y1-y0, x1-x0), h3 = 3;
    return {t:'mark', d:`M ${nn(x0)} ${nn(y0)} L ${nn(x1)} ${nn(y1)}`
      + ` M ${nn(x1)} ${nn(y1)} L ${nn(x1-Math.cos(a-0.4)*h3)} ${nn(y1-Math.sin(a-0.4)*h3)}`
      + ` M ${nn(x1)} ${nn(y1)} L ${nn(x1-Math.cos(a+0.4)*h3)} ${nn(y1-Math.sin(a+0.4)*h3)}`};
  };

  /* ---- how a card stack goes together ----
     Drawn at the sizes the pattern actually cuts, with a real card in every slot, because the
     one thing you cannot see from a list of numbers is whether the back card still shows. It
     serves the built-in stack and the card-slot ELEMENT from one drawing, because they are the
     same geometry - `cardsGeom` is the only thing that knows either of them. */
  {
    const elC = S.elements.find(e => ELTYPES[e.type] && ELTYPES[e.type].cards);
    const G = S.cards.on
      ? cardsGeom({slots:S.cards.n, reveal:S.cards.reveal, h:S.cards.h, w:cardSlotW() + 2*sa, build:'faced'})
      : elC ? cardsGeom(elC) : null;
    if(G){
      const cw2 = 100, deep = G.bottom[G.n-1];
      const base5 = 20 + Math.max(deep, CARD_H);
      const dw = cw2 + 96, dh = base5 + 26;
      const d = [];
      // every card, where it really sits: bottom on its own stitch line, top wherever it lands
      for(let k=0;k<G.n;k++)
        d.push({t:'mark', d:rr(24, 20 + G.bottom[k] - CARD_H, cw2 - 8, CARD_H, 3)});
      for(let k=G.n-1;k>=0;k--){
        d.push({t:k===G.n-1?'cut':'mark', d:rr(20, 20 + G.mouth[k], cw2, G.bottom[k] - G.mouth[k], 0)});
        d.push(dgTxt(20 + cw2 + 5, 20 + G.mouth[k] + 3.4,
          (G.pockets ? 'POCKET ' : 'SLOT ') + (k+1) + (k===0 ? ' (BACK)' : k===G.n-1 ? ' (FRONT)' : '')
          + ' \u00b7 shows ' + fmt(CARD_H - G.depth(k)), 3.2, 'start'));
        if(G.pockets)
          d.push({t:'fold', d:hLine(14, 20 + cw2 + 2, 20 + G.bottom[k]), label:k===G.n-1?'EACH ONE STITCHED TO THE LINING HERE':''});
      }
      if(!G.pockets) d.push({t:'fold', d:hLine(14, 20 + cw2 + 6, 20 + deep), label:'ONE COMMON BOTTOM EDGE'});
      d.push(dgArrow(12, 20, 12, 20 + deep));
      d.push(dgTxt(cw2/2 + 20, dh - 8, G.pockets
        ? 'EVERY POCKET IS THE SAME PIECE \u2014 THE CASCADE IS WHERE THEY ARE STITCHED'
        : 'LINE UP THE BOTTOM EDGES AND THE SIDE HOLES ALL MATCH', 3.4, 'middle', true));
      d.push(dgTxt(cw2/2 + 20, dh - 3.6, 'THEN BOTH SIDES GO THROUGH THE WHOLE STACK IN ONE RUN', 3.4, 'middle', true));
      DG('dgCards', G.pockets ? 'How the card pockets stack' : 'How the card slots stack', dw, dh, d,
        G.pockets
          ? `All ${G.n} pockets are the same ${fmt(G.w)} \u00d7 ${fmt(G.pieceH(0))} piece. Each is stitched to the lining along its own bottom line \u2014 that line is what makes the pocket \u2014 and each sits ${fmt(G.rev)} below the one behind it, which is where the cascade comes from.\n`+
            `Stitch the back one down first and work forward, then run both sides through the whole stack at the end.\n`+
            `Every card is covered ${fmt(G.tuck)} and shows ${fmt(CARD_H - G.tuck)} of its ${fmt(CARD_H)}.`
          : `All ${G.n} slots are cut to different heights but share one bottom edge, so every side hole falls on the same grid.\n`+
            `The deepest covers ${fmt(G.depth(0))} of a ${fmt(CARD_H)} card and the front one ${fmt(G.depth(G.n-1))}, so the cards show between ${fmt(CARD_H - G.depth(0))} and ${fmt(CARD_H - G.depth(G.n-1))}.\n`+
            `Glue them up as one stack first, then prick both sides in a single run through every layer.`);
      /* Two ways this stops working, and both are only obvious once the leather is cut: the
         back card buried where you cannot pinch it, and a front slot too shallow to hold one. */
      if(CARD_H - G.depth(0) < 8)
        WARN.push(`The deepest card slot covers ${fmt(G.depth(0))} of a ${fmt(CARD_H)} card, so only ${fmt(CARD_H - G.depth(0))} of that one is left showing \u2014 not enough to get a fingernail on. Bring it down to about ${fmt(CARD_H - 12)}.`);
      if(G.capped)
        WARN.push(`${G.n} card slots will not take a ${fmt(G.revWant)} reveal out of a ${fmt(G.tuck)} stack, so it is drafted at ${fmt(G.rev)} \u2014 as much as that depth can give before the front slot runs out of leather. Deepen the stack, use fewer slots, or build it as pockets, where every slot is its own full-depth piece and the reveal has no such limit.`);
      if(G.slotW < CARD_W + 1)
        WARN.push(`The card slots leave only ${fmt(G.slotW)} between their two stitch lines and a card is ${fmt(CARD_W)} across. Cut them ${fmt(CARD_W + 3 + 2*sa)} wide.`);
    }
  }

  if(S.strap.type==='adjust'){
    // four things that only make sense threaded
    const dw = 250, dh = 96, y0 = 34, sw2 = 13;
    const d = [
      {t:'mark', d:rr(10, y0, 96, sw2, 2)},
      dgTxt(58, y0 - 4, 'SHOULDER STRAP', 3.6),
      {t:'mark', d:rr(112, y0 - 7, 26, sw2 + 14, 2)},
      {t:'mark', d:rr(117, y0 - 2, 16, sw2 + 4, 1)},
      dgTxt(125, y0 - 11, 'BUCKLE', 3.4),
      {t:'mark', d:rr(144, y0, 60, sw2, 2)},
      dgTxt(174, y0 - 4, 'BUCKLE TAB, FOLDED ROUND THE BAR', 3.2),
      {t:'mark', d:rr(196, y0 - 3, 9, sw2 + 6, 1)},
      dgTxt(200, y0 + sw2 + 12, 'KEEPER', 3.2),
      {t:'mark', d:rr(10, y0 + 34, 190, sw2, 2)},
      dgTxt(60, y0 + 34 + sw2 + 5, 'THE TAIL, WITH ITS ADJUSTMENT HOLES', 3.4, 'start'),
      dgArrow(150, y0 + 34, 132, y0 + sw2 + 2),
      dgTxt(dw/2, dh - 4, 'TAIL UP THROUGH THE BUCKLE, BACK DOWN THROUGH THE KEEPER', 3.4, 'middle', true)];
    for(let i=0;i<5;i++) d.push({t:'hole', x:34 + i*22, y:y0 + 34 + sw2/2, r:2});
    DG('dgStrap', 'How the strap threads', dw, dh, d,
      `The buckle tab folds round the buckle bar and both its tails are stitched together \u2014 that box is what stops the buckle pulling out.\n`+
      `The long strap's tail goes up through the buckle, over the bar, and back down through the keeper, which is the only thing holding the loose end flat.`);
  }

  if(S.strap.type==='pack' && S.strap.pad){
    // a section through the sandwich, which is what the dashed red line on the blank means
    const dw = 210, dh = 92, x0 = 22, ww = 166, cy2 = 48, th2 = Math.max(4, Math.min(14, S.strap.padThick));
    const d = [
      {t:'mark', d:rr(x0, cy2 - th2/2 - 3, ww, 3, 1)},
      dgTxt(x0 + 2, cy2 - th2/2 - 5.5, 'OUTER, GRAIN OUT', 3.4, 'start'),
      {t:'cut', d:rr(x0 + 12, cy2 - th2/2, ww - 24, th2, 2)},
      dgTxt(x0 + ww/2, cy2 + 1.6, fmt(S.strap.padThick) + ' FOAM', 3.6),
      {t:'mark', d:rr(x0, cy2 + th2/2, ww, 3, 1)},
      dgTxt(x0 + 2, cy2 + th2/2 + 8, 'BACKING, SOFT SIDE OUT', 3.4, 'start'),
      dgArrow(x0 + 4, cy2 + th2/2 + 22, x0 + 4, cy2 + th2/2 + 5),
      dgTxt(x0 + 4, cy2 + th2/2 + 27, 'EDGE ROW', 3.4),
      dgArrow(x0 + 12, cy2 + th2/2 + 22, x0 + 12, cy2),
      dgTxt(dw/2, dh - 8, 'THE FOAM STOPS ABOUT 6 MM SHORT OF THE EDGE ALL ROUND', 3.4, 'middle', true),
      dgTxt(dw/2, dh - 3.6, 'SO THE STITCH ROW GOES THROUGH LEATHER ONLY \u2014 THAT IS THE RED DASH ON THE BLANK', 3.2, 'middle', true)];
    DG('dgPad', 'How the padded strap is built', dw, dh, d,
      `Outer, foam, backing \u2014 glued as one sandwich and then stitched right round the edge.\n`+
      `Skive the foam edge to nothing or the row will ride up over it. The dashed red outline on the strap blank is where the foam ends.`);
  }

  if((S.strap.build === 'four' && S.strap.type !== 'none' && S.strap.type !== 'handles') ||
     (S.strap.type==='handles' && S.handles.build === 'folded')){
    const fw4 = Math.max(10, S.strap.type==='handles' ? S.handles.width : S.strap.width);
    const dw = 190, dh = 78, x0 = 24, ww = 142, cy2 = 34, tt = Math.max(2, Math.min(5, t));
    const d = [
      {t:'mark', d:rr(x0, cy2 - 2*tt, ww, 4*tt, 1)},
      {t:'fold', d:hLine(x0, x0+ww, cy2 - tt)}, {t:'fold', d:hLine(x0, x0+ww, cy2)},
      {t:'fold', d:hLine(x0, x0+ww, cy2 + tt)},
      dgTxt(x0 + ww/2, cy2 - 2*tt - 3, 'CUT ' + fmt(4*fw4 + 2*t) + ' WIDE', 3.6),
      dgArrow(x0 + 16, cy2 - 2*tt - 12, x0 + 16, cy2 - tt - 1),
      dgArrow(x0 + ww - 16, cy2 + 2*tt + 12, x0 + ww - 16, cy2 + tt + 1),
      dgTxt(x0 + ww/2, cy2 + 2*tt + 9, 'BOTH LONG EDGES FOLD TO THE CENTRE LINE', 3.4, 'middle', true),
      dgTxt(dw/2, dh - 8, 'FINISHES ' + fmt(fw4) + ' ACROSS AND ' + fmt(4*t) + ' THICK', 3.4, 'middle', true),
      dgTxt(dw/2, dh - 3.6, 'FOLD AND GLUE FIRST \u2014 NOTHING ON IT CAN BE PRICKED FLAT', 3.2, 'middle', true)];
    DG('dgFour', 'Four-fold build', dw, dh, d,
      `Cut four times the finished width plus two thicknesses, fold both long edges in to the centre, then fold again on the centre line.\n`+
      `Four layers thick with no raw edge anywhere. Every footprint on this blank is an outline only: mark the holes from the panel once it is folded and glued.`);
  }

  if(S.strap.type==='handles' && S.handles.build === 'rolled'){
    const dw = 180, dh = 82, cx2 = 90, cy2 = 40, cr2 = Math.max(4, Math.min(14, S.handles.core))/2;
    const d = [
      {t:'mark', d:`M ${nn(cx2-34)} ${nn(cy2+cr2+2)} A ${nn(cr2+2)} ${nn(cr2+2)} 0 1 1 ${nn(cx2+34)} ${nn(cy2+cr2+2)}`},
      {t:'cut', d:rr(cx2-cr2, cy2-cr2, 2*cr2, 2*cr2, cr2)},
      dgTxt(cx2, cy2 + 1.6, 'CORD', 3.2),
      {t:'mark', d:`M ${nn(cx2-34)} ${nn(cy2+cr2+2)} H ${nn(cx2-6)} M ${nn(cx2+6)} ${nn(cy2+cr2+2)} H ${nn(cx2+34)}`},
      dgTxt(cx2, cy2 + cr2 + 10, 'ONE ROW DOWN THE UNDERSIDE, HARD AGAINST THE CORD', 3.2, 'middle', true),
      dgArrow(cx2 - 44, cy2 - 10, cx2 - 30, cy2 - 2),
      dgTxt(cx2 - 46, cy2 - 13, 'LEATHER ROLLS OVER', 3.2, 'end'),
      dgTxt(dw/2, dh - 4, 'GLUE THE CORD TO THE CENTRE LINE, ROLL, CLAMP UNTIL DRY', 3.4, 'middle', true)];
    DG('dgRoll', 'How a rolled handle rolls', dw, dh, d,
      `Cord glued down the centre line, the leather rolled over it and clamped, then one row underneath hard against the cord.\n`+
      `The tail lands on the bag flattened, so it is wider there than the handle you hold \u2014 that is the footprint drawn on the panel.`);
  }

  if(S.strap.type!=='none' && S.strap.type!=='handles' && S.strap.attach==='swivel'){
    const dw = 190, dh = 84, x0 = 22, tw4 = 12;
    const d = [
      {t:'mark', d:rr(x0, 30, 130, tw4, 2)},
      {t:'fold', d:vLine(x0 + 66, 26, 30 + tw4 + 4), label:'FOLD'},
      {t:'cut', d:rr(x0 + 60, 22, 12, 26, 6)},
      dgTxt(x0 + 66, 18, 'RING', 3.4),
      {t:'mark', d:rr(x0 + 78, 30, 52, tw4, 0)},
      dgTxt(x0 + 104, 30 + tw4 + 6, 'BOTH TAILS ON THE GUSSET', 3.4),
      dgArrow(x0 + 150, 36, x0 + 132, 36),
      dgTxt(x0 + 152, 36, 'STITCHED BOX', 3.4, 'start'),
      dgTxt(dw/2, dh - 8, 'THE TAB FOLDS ROUND THE RING BAR AND BOTH TAILS GO DOWN TOGETHER', 3.4, 'middle', true),
      dgTxt(dw/2, dh - 3.6, 'THE SNAP ON THE STRAP CLIPS TO THE RING \u2014 NOTHING IS SEWN TO THE STRAP', 3.2, 'middle', true)];
    DG('dgTab', 'How the D-ring tab folds', dw, dh, d,
      `The tab wraps the ring bar and the two tails lie one on top of the other on the gusset; the box goes through both and the panel.\n`+
      `The hatched band on the blank is the fold: no hole goes in it, which is why the box starts clear of it.`);
  }

  if(S.strap.build === 'two' || (S.strap.type==='handles' && S.handles.build === 'layered')){
    const dw = 190, dh = 74, x0 = 24, ww = 142, cy2 = 36, tt = Math.max(2.5, Math.min(7, S.thickness));
    const d = [
      {t:'mark', d:rr(x0, cy2 - tt - 1.5, ww, tt, 1)},
      dgTxt(x0 + ww - 2, cy2 - tt - 4, 'GRAIN OUT', 3.4, 'end'),
      {t:'mark', d:rr(x0, cy2 + 1.5, ww, tt, 1)},
      dgTxt(x0 + ww - 2, cy2 + tt + 8, 'GRAIN OUT', 3.4, 'end'),
      dgTxt(x0 + ww/2, cy2 + 1.2, 'GLUE FLESH TO FLESH', 3.4, 'middle', true),
      dgArrow(x0 + 10, cy2 - tt - 12, x0 + 10, cy2 - tt - 3),
      dgArrow(x0 + 10, cy2 + tt + 13, x0 + 10, cy2 + tt + 4),
      {t:'fold', d:vLine(x0 + 6, cy2 - tt - 1.5, cy2 + tt + 1.5)},
      dgTxt(dw/2, dh - 8, 'FINISHED THICKNESS ' + fmt(2*t) + ' \u2014 THEN ONE EDGE ROW DOWN EACH SIDE', 3.4, 'middle', true),
      dgTxt(dw/2, dh - 3.6, 'THE EDGE ROWS ARE WHAT HOLD IT TOGETHER; THE GLUE ONLY GETS YOU THERE', 3.2, 'middle', true)];
    DG('dgTwo', 'Two-layer build', dw, dh, d,
      `Cut two, glue them flesh side to flesh side so both faces show grain, sand and burnish the edge as one, then run the edge rows.\n`+
      `A single layer of ${fmt(t)} is fine on a small bag and floppy on a big one; two gets you ${fmt(2*t)} with a finished face on both sides.`);
  }

  if(pullOn()){
    const dw = 180, dh = 84, x0 = 24;
    const d = [
      {t:'mark', d:rr(x0, 26, 130, 5, 1)},
      dgTxt(x0 + 65, 22, 'FLAP, SEEN EDGE ON', 3.6),
      {t:'cut', d:rr(x0 + 74, 31, 4, 40, 1)},
      dgTxt(x0 + 92, 50, 'PULL TAB', 3.6, 'start'),
      {t:'mark', d:rr(x0 + 46, 26, 32, 5, 0)},
      dgTxt(x0 + 46, 18, 'STITCHED BOX, THROUGH BOTH', 3.2, 'start', true),
      {t:'hole', x:x0 + 76, y:64, r:2.4},
      dgArrow(x0 + 8, 62, x0 + 8, 33),
      dgTxt(x0 + 8, 68, 'IT HANGS ' + fmt(pullDrop()) + ' PAST THE TIP', 3.2, 'start', true),
      dgTxt(dw/2, dh - 4, 'SET THE LOCK IN THE TAB BEFORE IT IS SEWN DOWN', 3.4, 'middle', true)];
    DG('dgPull', 'How the pull tab sits', dw, dh, d,
      `The tab goes on the UNDERSIDE of the flap tip, ${fmt(pullAttach())} of it under the flap and ${fmt(pullDrop())} hanging past.\n`+
      `The box is pricked through flap and tab together. Set the ${CLOSURE_LABEL().toLowerCase()} in the tab first \u2014 you cannot reach the back of it afterwards.`);
  }

  /* --- the pull tab --- */
  if(pullOn()){
    const K = S.flap.pull, pw6 = pullW(), at6 = pullAttach(), lf6 = pullLift();
    const tl6 = at6 + lf6 + pullDrop();
    // the blank lies along x so the sheet can nest it; the box at the left end is the part
    // that goes under the flap, and it is pricked through flap and tab together
    const sh6 = tipStrip(tl6, pw6, K.tip, false);
    const td = [{t:'cut', d: sh6 ? sh6.cut : rr(0,0,tl6,pw6,Math.min(K.r, pw6/2))},
      {t:'grain', x:tl6*0.55, y:pw6/2 + (pw6>16?4:0), len:Math.min(40, tl6*0.4), dir:'h'},
      {t:'text', x:tl6*0.58, y:pw6/2+2, s:'PULL TAB', size:Math.min(5, pw6*0.42), anchor:'middle', dim:true}];
    attachOn(td, 0, 0, at6, pw6, 'pulltab', 'Pull tab to flap',
             {axis:'x', far:'end', fix:K.fix, r:K.r});
    td.push({t:'hole', x:tl6 - S.flap.cInset, y:pw6/2, r:3, label:CLOSURE_LABEL()});
    td.push({t:'text', x:at6+2, y:pw6+4.4, s:'THIS END GOES UNDER THE FLAP', size:3.4, anchor:'start', mark:true});
    pieces.push(P({key:'pull', name:'Pull tab', mat:'Leather', w:tl6, h:pw6,
      qty:closureN(), draw:td, seam:2*tl6,
      dims:[D_('h',0,tl6,-9,fmt(tl6)), D_('v',0,pw6,-9,fmt(pw6)),
            D_('h',0,at6,pw6+11,fmt(at6)+' under the flap',1)],
      formula:`length = ${fmt(at6)} of stitched box + ${fmt(lf6)} clear of the flap's edge row + ${fmt(pullDrop())} hanging past its tip = ${fmt(tl6)}\n`+
              `The ${CLOSURE_LABEL().toLowerCase()} sits ${fmt(S.flap.cInset)} up from the free end, so the mate on the body drops by the same ${fmt(pullDrop())}.\n`+
              `Prick the box through flap and tab together \u2014 that is what stops it peeling off the one thing everybody pulls.`+
              tipNote(pw6, K.tip, 'the free end')}));
    STEPS.push(`Stitch the pull ${closureN()>1?'tabs':'tab'} to the underside of the flap tip before the flap is lined, and set the ${CLOSURE_LABEL().toLowerCase()} in ${closureN()>1?'them':'it'} first \u2014 you cannot reach the back of a tab that is already sewn down.`);
  }

  /* --- zip top --- */
  if(S.top==='zip'){
    const G = zipG(), span = zipSpan(), cut = zipCut(), wz = zipWrap(), ins = zipInset();
    HW.push({q:1, n:`Zip, ${G.label} chain, ${fmt(cut)} between the stops (cut from continuous chain, or buy the next size up and shorten it)`});
    HW.push({q:1, n:`Slider for ${G.label} chain${S.top==='zip' && wz>0 ? ' \u2014 two, if you want it to open from both ends' : ''}`});
    /* A round mouth is a closed ring, and a chain cannot close on itself: the two ends have
       nowhere to go. It is drafted - both halves get their tape - but you have to know that
       before you cut, not after. */
    if(S.construction==='bucket')
      WARN.push(`A round mouth is a closed ring: the tape goes round both halves and the chain has to be the whole ${fmt(span)} of it, with its two ends meeting somewhere. A straight zip cannot close a circle \u2014 either set the zip into a flat panel across the mouth, or use a flap or drawstring on a bag this shape.`);
    if(S.zip.style==='panel'){
      /* The strip is cut to the ROW it is stitched to, not to a formula. On a rectangular rim
         those are the same number; on a shape she drew the mouth is a curve and the row that
         follows it, inset and trimmed, is shorter than the mouth itself - so a panel cut to
         the mouth came out longer than the run it had to meet. */
      const rimPlan = SEAMPLAN['ziprim'];
      const zs = rimPlan ? rimPlan.len + 2*sa : mouthSpan();
      const zw = zs + 2*sa, zh = S.zip.panelH + 2*sa;
      const zd=[{t:'cut', d:rr(0,0,zw,zh,0)},
        SEAM('ziprim','Zip panel to rim', [['L',sa,zh-sa,zw-sa,zh-sa]], {even:true, trim:sa}),
        SEAM('ziptape','Zip tape to panel', [['L',sa,sa,zw-sa,sa]], {even:true, trim:sa}),
        {t:'mark', d:hLine(0,zw,2)},
        {t:'notch',x:sa+ZIP_TAB_COVER,y:0,dir:'down'},{t:'notch',x:zw-sa-ZIP_TAB_COVER,y:0,dir:'down'},
        {t:'text', x:zw/2, y:sa-1.8, s:G.label + ' CHAIN \u00b7 STOPS AT THE NOTCHES', size:3.8, anchor:'middle', mark:true},
        {t:'ctr', d:vLine(zw/2,0,zh)},{t:'notch',x:zw/2,y:0,dir:'down'},
        {t:'text', x:zw/2, y:zh/2+2, s:'ZIP PANEL', size:6, anchor:'middle', dim:true}];
      pieces.push(P({key:'zipPanel', name:'Zip panel', mat:'Leather', w:zw, h:zh, qty:2, draw:zd, seam:2*zs,
        dims:[D_('h',0,zw,-9,fmt(zw)), D_('v',0,zh,-9,fmt(zh))],
        formula:`Two strips: rim span ${fmt(zs)}${S.construction==='boxed'?` (W ${fmt(W)} + D ${fmt(D)})`:''} + 2 \u00d7 SA ${fmt(sa)} wide \u00d7 panel ${fmt(S.zip.panelH)} + 2 \u00d7 SA = ${fmt(zh)}.\nOne each side of the chain, then the pair stitches into the rim.`}));
      STEPS.push(`Build the zip panel first: one strip each side of the chain, ${fmt(sa)} from the tape edge, then the finished panel goes into the rim as one piece. It is easier to sew flat than in the round, and it is the reason to use a panel at all.`);
    } else if(S.zip.style==='wrap' && !wz){
      WARN.push(`Carrying the zip down the ends only means something on a bag with a separate gusset to slit. This one opens across its whole rim already, so it is drafted as a plain rim zip.`);
      STEPS.push(`Stitch the tape straight to the rim, ${fmt(ins)} down from the edge, running the full width so both tape ends are caught in the side seams.`);
    } else if(wz > 0){
      STEPS.push(`Slit the top ${fmt(wz)} of each gusset end down its centre line and stitch a tape either side of the slit, ${fmt(ins)} in. That is what lets the mouth open right out instead of pinching shut at the corners \u2014 sew the two gusset ends before you close the rim, while you can still get the foot in.`);
      WARN.push(`The zip carries ${fmt(wz)} down each gusset end, so the chain has to be ${fmt(span)} long overall rather than ${fmt(W)}. The gusset is slit, not cut through: stop the slit dead on the notch.`);
    } else {
      STEPS.push(`Stitch the tape straight to the rim, ${fmt(ins)} down from the edge, running the full width so both tape ends are caught in the side seams. Set the stops at the notches, ${fmt(ZIP_TAB_COVER)} in from each corner, so neither stop ends up buried in a seam. Park the slider clear of the seam while you sew.`);
    }
    if(S.zip.tabs){
      const tw = G.tape + 10, tl = 2*20 + 4*t;
      const td=[{t:'cut', d:rr(0,0,tl,tw,2)},
        {t:'fold', d:vLine(tl/2,0,tw), label:'FOLD \u00b7 OVER THE END OF THE CHAIN'},
        SEAM('ziptab','Zip end tab, across both tails',
             [['L', tl-4, sa, tl-4, tw-sa]], {planLen:tw - 2*sa}),
        {t:'text', x:tl*0.26, y:tw/2+2, s:'ZIP END TAB', size:4.4, anchor:'middle', dim:true},
        {t:'text', x:tl/2, y:tw+4.4, s:'FOLD OVER THE TAPE END, GLUE, THEN ONE ROW ACROSS', size:3.2, anchor:'middle', mark:true}];
      pieces.push(P({key:'zipTab', name:'Zip end tab', mat:'Leather', w:tl, h:tw, qty:2, draw:td, seam:2*tw,
        dims:[D_('h',0,tl,-9,fmt(tl)), D_('v',0,tw,-9,fmt(tw))],
        formula:`${G.label} tape is about ${fmt(G.tape)} across, so the tab is ${fmt(G.tape)} + 10 mm = ${fmt(tw)} wide.\n2 \u00d7 20 mm of tail + 4 \u00d7 thickness ${fmt(4*t)} to turn round the tape = ${fmt(tl)}.\nIt caps the cut chain, hides the stop and stops the tape fraying \u2014 it is also what the slider runs into.`}));
      const pw2 = 12, pl = 2*32 + 10;
      pieces.push(P({key:'zipPull', name:'Zip pull tab', mat:'Leather', w:pl, h:pw2, qty:1, seam:2*pl,
        draw:[{t:'cut', d:rr(0,0,pl,pw2,Math.min(pw2/2,3))},
              {t:'wrap', x:pl/2-5, y:0, w:10, h:pw2, label:'THROUGH THE SLIDER'},
              {t:'fold', d:vLine(pl/2,0,pw2), label:'FOLD IN HALF'},
              SEAM('zippull','Zip pull tab', [['L', 8, pw2-3, 8, 3]], {}),
              {t:'text', x:pl*0.75, y:pw2*0.7, s:'PULL', size:4, anchor:'middle', dim:true}],
        dims:[D_('h',0,pl,-9,fmt(pl)), D_('v',0,pw2,-9,fmt(pw2))],
        formula:`2 \u00d7 32 mm + 10 mm to turn through the slider eye = ${fmt(pl)}. One row across the doubled end.`}));
    }
  }
  if(S.top==='magnet') HW.push({q:1, n:'Magnetic snap, 14\u201318 mm'});

  /* --- drawstring --- */
  if(drawOn()){
    const K2 = S.draw;
    const mouth = drawMouth();
    const cord = mouth + 2*260;
    HW.push({q:1, n:`Cord or leather lace, about ${fmtLen(cord)} \u2014 it has to go right round the mouth and still leave a tail to pull`});
    if(K2.style==='eyelet'){
      const n2 = Math.max(4, Math.round(K2.n));
      HW.push({q:n2, n:`Eyelet, ${fmt(K2.size)} inside \u2014 set them in pairs so the gathers come out even`});
      WARN.push(`Eyelets go through a single thickness of ${fmt(t)} leather. Back the whole mouth band with a second layer or a strip of canvas, or the first hard pull will tear one out.`);
      STEPS.push(`Set the ${n2} eyelets ${fmt(Math.max(K2.drop, sa + K2.size))} down from the rim, evenly round the mouth, and thread the cord through them one way round. Both ends come out at the front, next to each other.`);
    } else {
      const ch = Math.max(18, K2.drop - Math.max(3,sa) + 8), span2 = drawChanSpan(), cw = span2 + 2*sa;
      const chan = (key, name, wide, qty, why) => P({key, name, mat:'Leather', w:wide + 2*sa, h:ch, qty, seam:2*wide,
        draw:[{t:'cut', d:rr(0,0,wide + 2*sa,ch,0)},
          SEAM(key==='drawChan'?'drawchan':'drawchanend', name+' to the panel', [['L', sa, ch-Math.max(3,sa), wide+sa, ch-Math.max(3,sa)]], {even:true, trim:sa}),
          SEAM(key==='drawChan'?'drawchan':'drawchanend', name+' to the panel', [['L', sa, Math.max(3,sa), wide+sa, Math.max(3,sa)]], {even:true, trim:sa}),
          {t:'text', x:(wide+2*sa)/2, y:ch/2+2, s:name.toUpperCase(), size:Math.min(5.4, wide*0.09), anchor:'middle', dim:true},
          {t:'text', x:(wide+2*sa)/2, y:ch/2+8, s:'GLUE IT INSIDE THE MOUTH, THEN BOTH ROWS GO THROUGH BOTH LAYERS', size:3.2, anchor:'middle', mark:true}],
        dims:[D_('h',0,wide+2*sa,-9,fmt(wide+2*sa)), D_('v',0,ch,-9,fmt(ch))],
        formula:why + `\nHeight ${fmt(ch)} gives the cord about ${fmt(ch - 2*Math.max(3,sa))} of channel to run in. Skive both long edges or the mouth doubles in thickness.`});
      pieces.push(chan('drawChan','Cord channel', span2, 2,
        `One per panel: rim run ${fmt(span2)} + 2 x SA ${fmt(sa)} = ${fmt(cw)}. The joins land on the side seams, where the leather is thickest anyway.`));
      if(S.construction==='gusset'){
        // an accordion gusset carries the pleat right up to the mouth, so its end is wider
        const tapD = Math.min(S.taper, D*0.8);
        const bellD = S.gussetStyle==='bellows' ? Math.max(0, Math.min(S.bellows, D*2.5)) : 0;
        const endW = Math.max(12, D + bellD - tapD);
        pieces.push(chan('drawChanEnd','Cord channel, gusset ends', endW, 2,
          `The mouth carries on across both gusset ends, so they get a short channel too: the gusset measures ${fmt(endW)} at the mouth${tapD||bellD?` (D ${fmt(D)}${bellD?` + pleat ${fmt(bellD)}`:''}${tapD?` less the taper ${fmt(tapD)}`:''})`:''}, + 2 x SA ${fmt(sa)}.\nWithout these the cord bridges the corners and the bag gathers into two flat ears instead of a circle.`));
      }
      STEPS.push(`Stitch the channel to the inside of the mouth, both rows through both layers, and leave the two slots on the front clear. Thread the cord through, out at one slot and in at the other.`);
    }
    if(K2.toggle){
      const tw4 = 26, tl4 = 44;
      pieces.push(P({key:'drawTog', name:'Cord toggle', mat:'Leather', w:tl4, h:tw4, qty:1, seam:2*tl4,
        draw:[{t:'cut', d:rr(0,0,tl4,tw4,4)},
          {t:'hole', x:11, y:tw4/2, r:Math.max(2, K2.size/2), label:'CORD'},
          {t:'hole', x:tl4-11, y:tw4/2, r:Math.max(2, K2.size/2), label:''},
          {t:'text', x:tl4/2, y:tw4-4, s:'TOGGLE', size:4.2, anchor:'middle', dim:true}],
        dims:[D_('h',0,tl4,-9,fmt(tl4)), D_('v',0,tw4,-9,fmt(tw4))],
        formula:`Both cord ends go through it and are knotted underneath. Roll it, or leave it flat and burnish the edge \u2014 either way it is what stops the mouth opening again.`}));
    }
  }

  /* --- roll top --- */
  if(rollOn()){
    const ext = rollExt(), turns = Math.max(1, Math.round(S.roll.turns)), per = ext/turns;
    if(S.roll.stiffener){
      const sh = Math.max(3,sa) + S.roll.turn*0.28 + 8, ms = mouthSpan(), sy = Math.max(3,sa) + S.roll.turn*0.28;
      const sd=[{t:'cut', d:rr(0,0,ms,sh,0)},
        SEAM('rollstiff','Mouth stiffener, front and back', [['L', 0, sy, ms, sy]], {even:true, trim:sa}),
        {t:'ctr', d:vLine(ms/2,0,sh)},{t:'notch', x:ms/2, y:sh, dir:'up'},
        {t:'text', x:ms/2, y:sh-2.5, s:'MOUTH STIFFENER', size:5, anchor:'middle', dim:true},
        {t:'text', x:ms/2, y:3.2, s:'THIS EDGE GOES INTO THE FOLD OF THE MOUTH', size:3.4, anchor:'middle', mark:true}];
      pieces.push(P({key:'rollStiff', name:'Mouth stiffener', mat:'Leather', w:ms, h:sh, qty:2, draw:sd, seam:ms,
        dims:[D_('h',0,ms,-9,fmt(ms)), D_('v',0,sh,-9,fmt(sh))],
        formula:`A firm strip the full flattened mouth width ${fmt(ms)}${S.construction==='boxed'?` (W ${fmt(W)} + D ${fmt(D)}, because a boxed body opens across its whole rim)`:''}, caught under the mouth hem front and back.\n`+
                `Without it the mouth wanders and the roll will not sit square. Skive both long edges to nothing.`}));
      WARN.push(`The mouth stiffener wants firmer leather than the body \u2014 3\u20134 mm veg tan, or two layers of the shell glued together.`);
    }
    if(S.roll.closure==='strap'){
      const w2 = ROLL_STRAP_W, ay = rollAnchorY(), R2 = rollBundleR();
      const over = D + Math.PI*R2, tail2 = 95, anc = ROLL_ANCHOR_L;
      const sl2 = ay + over + ay + tail2;
      const holes3 = Math.max(3, Math.floor(tail2/25)), hx3 = [];
      for(let i=0;i<holes3;i++) hx3.push({t:'hole', x:sl2 - 32 - i*25, y:w2/2, r:2.4, label:i===0?'TIGHTEST':''});
      const sd2 = [{t:'cut', d:(tipStrip(sl2, w2, S.strap.tip, false)||{cut:rr(0,0,sl2,w2,4)}).cut},
        {t:'mark', d:vLine(anc, 0, w2)}, {t:'text', x:anc/2, y:w2*0.62, s:'ON THE BACK', size:3.4, anchor:'middle', mark:true, rot:90},
        {t:'mark', d:vLine(ay, 0, w2)}, {t:'mark', d:vLine(ay + over, 0, w2)},
        {t:'text', x:ay + over/2, y:w2*0.62, s:'OVER THE ROLL', size:4, anchor:'middle', mark:true},
        {t:'text', x:sl2 - tail2/2, y:w2*0.62, s:'TAIL', size:4, anchor:'middle', mark:true},
        {t:'grain', x:sl2*0.2, y:w2/2+4, len:Math.min(90, sl2*0.2), dir:'h'}];
      attachOn(sd2, 0, 0, anc, w2, 'rollstrapanc', 'Over-strap anchor to the back', {axis:'x', far:'start', fix:'stitchbox'});
      hx3.forEach(h=>sd2.push(h));
      pieces.push(P({key:'rollStrap', name:'Roll-top over-strap', mat:'Leather', w:sl2, h:w2, qty:1, draw:sd2, seam:2*sl2,
        dims:[D_('h',0,sl2,-9,fmt(sl2)), D_('v',0,w2,-9,fmt(w2)), D_('h',ay,ay+over,w2+11,fmt(over)+' over the roll',1)],
        formula:`up the back ${fmt(ay)} + over the rolled mouth (D ${fmt(D)} + half the bundle ${fmt(Math.PI*R2)}) + down the front ${fmt(ay)} + ${fmt(tail2)} of tail = ${fmt(sl2)}\n`+
                `The bundle comes out about ${fmt(2*R2)} across once it is rolled ${Math.max(1,Math.round(S.roll.turns))} turns, which is what the middle section has to get over.\n`+
                `${holes3} holes at 25 mm: the top one is the bag stuffed full, the bottom one is the bag half empty.`+
                tipNote(w2, S.strap.tip, 'the tail')}));
      const bt3 = 2*ROLL_ANCHOR_L + 14;
      const bd3 = [{t:'cut', d:(tipStrip(bt3, w2, S.strap.tip, true)||{cut:rr(0,0,bt3,w2,3)}).cut},
        {t:'wrap', x:bt3/2 - Math.max(6,3*t+4), y:0, w:2*Math.max(6,3*t+4), h:w2, label:'ROUND THE BUCKLE BAR'},
        {t:'fold', d:vLine(bt3/2,0,w2), label:'FOLD IN HALF'},
        {t:'text', x:bt3*0.2, y:w2*0.62, s:'BUCKLE TAB', size:4.2, anchor:'middle', dim:true}];
      attachOn(bd3, bt3-ROLL_ANCHOR_L, 0, ROLL_ANCHOR_L, w2, 'rollbuckle', 'Over-strap buckle tab to the front', {axis:'x', far:'end', fix:'stitchbox'});
      pieces.push(P({key:'rollBuckle', name:'Over-strap buckle tab', mat:'Leather', w:bt3, h:w2, qty:1, draw:bd3, seam:2*bt3,
        dims:[D_('h',0,bt3,-9,fmt(bt3)), D_('v',0,w2,-9,fmt(w2))],
        formula:`2 \u00d7 ${fmt(ROLL_ANCHOR_L)} + 14 mm to wrap the buckle bar = ${fmt(bt3)}. It sits ${fmt(ay)} down the front, dead centre.`+
                tipNote(w2, S.strap.tip, 'both tails')}));
      HW.push({q:1, n:`Buckle, ${fmt(w2)} inside width \u2014 roll-top over-strap`});
    } else if(S.roll.closure!=='none'){
      const tw = ROLL_TAB_W, ti = ROLL_TAB_IN, wrap = tw + 12, reach = rollAnchorY();
      const tl = ti + reach + wrap;
      const td=[{t:'cut', d:rr(0,0,tl,tw,Math.min(tw/2,3))},
        {t:'wrap', x:tl-wrap, y:0, w:wrap, h:tw, label:'ROUND THE ' + (S.roll.closure==='clip'?'HOOK':'BUCKLE') + ' BAR'},
        {t:'fold', d:vLine(tl-wrap,0,tw), label:'FOLD'},
        {t:'text', x:ti+reach/2, y:tw/2+2, s:'ROLL-TOP TAB', size:4.6, anchor:'middle', dim:true}];
      attachOn(td, 0, 0, ti, tw, 'rolltab', 'Roll-top tab into the mouth hem', {axis:'x', far:'start', fix:'stitchbox'});
      td.push({t:'text', x:tl-wrap/2, y:tw+5, s:'FOLD BACK ROUND THE BAR AND STITCH THE TAIL DOWN', size:3.4, anchor:'middle', mark:true});
      pieces.push(P({key:'rollTab', name:'Roll-top tab', mat:'Leather', w:tl, h:tw, qty:2, draw:td, seam:2*tl,
        dims:[D_('h',0,tl,-9,fmt(tl)), D_('v',0,tw,-9,fmt(tw)), D_('h',0,ti,tw+11,fmt(ti)+' in the hem',1)],
        formula:`caught in the mouth hem ${fmt(ti)} + reach to the anchor ${fmt(reach)} + ${fmt(wrap)} folded back round the bar = ${fmt(tl)}\n`+
                `The reach is what decides how tight the roll pulls up: shorten it and the bag closes harder.`}));
      const aw = rollAnchorW(), al = ROLL_ANCHOR_L, anl = 2*al + 14;
      const ad=[{t:'cut', d:rr(0,0,anl,aw,Math.min(aw/2,3))},
        {t:'wrap', x:anl/2 - Math.max(6,3*t+4), y:0, w:2*Math.max(6,3*t+4), h:aw, label:'ROUND THE RING BAR'},
        {t:'fold', d:vLine(anl/2,0,aw), label:'FOLD IN HALF'},
        {t:'text', x:anl*0.2, y:aw/2+2, s:'ANCHOR', size:4.2, anchor:'middle', dim:true}];
      attachOn(ad, anl-al, 0, al, aw, 'rollanchor', 'Roll-top anchor to the body', {axis:'x', far:'end', fix:'stitchbox'});
      ad.push({t:'text', x:anl-al, y:aw+5, s:'FOLD FIRST, THEN PRICK BOTH TAILS TOGETHER', size:3.4, anchor:'start', mark:true});
      pieces.push(P({key:'rollAnchor', name:'Roll-top anchor', mat:'Leather', w:anl, h:aw, qty:2, draw:ad, seam:2*anl,
        dims:[D_('h',0,anl,-9,fmt(anl)), D_('v',0,aw,-9,fmt(aw))],
        formula:`2 \u00d7 tail ${fmt(al)} + 14 mm to wrap the ring bar = ${fmt(anl)}.\nSits ${fmt(reach)} down from the rim on each side of the bag.`}));
      if(S.roll.closure==='clip'){
        HW.push({q:2, n:`G-hook, ${fmt(tw)} inside width \u2014 roll-top closure`});
        HW.push({q:2, n:`D-ring or rectangle ring, ${fmt(aw)} inside width \u2014 roll-top anchor`});
      } else {
        HW.push({q:2, n:`Side-release buckle, ${fmt(tw)} webbing width \u2014 roll-top closure`});
      }
    }
    STEPS.push(`Hem the mouth${S.roll.stiffener?', with the stiffener inside the fold':''}, catching the roll-top tabs at both ends before you close the row. Roll the mouth down ${turns} turns of ${fmt(per)} and clip it to the anchors \u2014 the last turn should sit just above the rim.`);
  }

  /* --- front patch pocket --- */
  if(S.pocket.on){
    const K = S.pocket, pw = K.w + 2*sa, ph = K.h + sa + K.topFold;
    const prun = openRectRun(sa, K.topFold, sa+K.w, K.topFold+K.h, K.radius);
    const d=[{t:'cut', d:rrE(0,0,pw,ph,{tl:0,tr:0,br:K.radius+sa,bl:K.radius+sa})},
      SEAM('pocket','Front pocket to panel', prun, {even:true, trim:sa}),
      {t:'ctr', d:vLine(pw/2,0,ph)},{t:'notch',x:pw/2,y:ph,dir:'up'},
      {t:'grain', x:pw-10, y:ph/2, len:Math.min(50,ph*0.4), dir:'v'},
      {t:'text', x:sa+6, y:ph-sa-6, s:'FRONT POCKET', size:6, anchor:'start', dim:true}];
    if(K.topFold>0) d.push({t:'fold', d:hLine(0,pw,K.topFold), label:'TOP HEM \u2014 FOLDS UNDER', band:[0,0,pw,K.topFold]});
    pieces.push(P({key:'pocket', name:'Front pocket', mat:'Leather', w:pw, h:ph, draw:d, seam:2*K.h+K.w,
      dims:[D_('h',0,pw,-9,fmt(pw)), D_('v',0,ph,-9,fmt(ph)), D_('v',K.topFold,ph-sa,pw+9,fmt(K.h),1)],
      formula:`width = ${fmt(K.w)} + 2 \u00d7 SA ${fmt(sa)} = ${fmt(pw)}\nheight = ${fmt(K.h)} + SA ${fmt(sa)} + top edge ${fmt(K.topFold)} = ${fmt(ph)}\n`+
              `Sits ${fmt(K.y)} up from the base seam, ${K.x===0?'centred':fmt(Math.abs(K.x))+(K.x>0?' right':' left')+' of centre'}.`}));
  }

  /* --- inside --- */
  if(S.lined && S.slip.on){
    const K = S.slip, pw = K.w + 2*sa, ph = 2*K.h + 2*sa;
    const d=[{t:'cut', d:rr(0,0,pw,ph,0)},{t:'fold', d:hLine(0,pw,ph/2), label:'FOLD \u2014 THE BASE, NOT A SEAM'},
      {t:'ctr', d:vLine(pw/2,0,ph)},{t:'notch',x:0,y:ph/2,dir:'right'},{t:'notch',x:pw,y:ph/2,dir:'left'},
      ...rectRunSides(sa, sa, K.w, K.h, 0, 'top', sa, sa)
           .map(run => SEAM('slip','Slip pocket to lining', run, {even:true})),
      {t:'text', x:pw/2, y:ph*0.28, s:'SLIP POCKET', size:6, anchor:'middle', dim:true},
      {t:'text', x:pw/2, y:sa-1.6, s:'FOLD FIRST, THEN PRICK BOTH LAYERS AND THE LINING TOGETHER', size:3.5, anchor:'middle', mark:true}];
    pieces.push(P({key:'slip', name:'Slip pocket', mat:'Lining', w:pw, h:ph, draw:d, seam:2*K.h+K.w,
      dims:[D_('h',0,pw,-9,fmt(pw)), D_('v',0,ph,-9,fmt(ph))],
      formula:`One piece folded: (${fmt(K.w)} + 2 \u00d7 SA) \u00d7 (2 \u00d7 ${fmt(K.h)} + 2 \u00d7 SA). Fold, stitch the sides, then set it into the lining.`}));
  }
  if(S.lined && S.zipPkt.on){
    const K = S.zipPkt, pw = K.w + 40, ph = 2*K.h + 20;
    const d=[{t:'cut', d:rr(0,0,pw,ph,0)},{t:'fold', d:hLine(0,pw,ph/2), label:'FOLD'},
      {t:'mark', d:rr(20,ph/2-K.h+10,K.w,12,0), label:'WINDOW'},
      SEAM('zipwindow','Zip window to lining', boxRun(17, ph/2-K.h+7, 23+K.w, ph/2-K.h+25), {closed:true}),
      // both sides walked from the WINDOW down to the fold, so the nth hole on one is the
      // nth hole on the other - as one run the hole on the join was drawn only once
      ...[12, pw-12].map(x => SEAM('zipbag','Zip pocket bag, up both sides',
           [['L', x, 12, x, ph/2]], {trim:sa})),
      {t:'text', x:pw/2, y:ph/2-4, s:'FOLD, THEN PRICK BOTH LAYERS TOGETHER UP THE SIDES', size:3.4, anchor:'middle', mark:true},
      {t:'text', x:pw/2, y:ph*0.25, s:'ZIP POCKET BAG', size:6, anchor:'middle', dim:true},
      {t:'ctr', d:vLine(pw/2,0,ph)}];
    pieces.push(P({key:'zipBag', name:'Zip pocket bag', mat:'Lining', w:pw, h:ph, draw:d, seam:2*K.h+K.w,
      dims:[D_('h',0,pw,-9,fmt(pw)), D_('v',0,ph,-9,fmt(ph)), D_('h',20,20+K.w,ph/2-K.h+4,fmt(K.w)+' opening',1)],
      formula:`Opening ${fmt(K.w)} + 20 mm each side, doubled depth 2 \u00d7 ${fmt(K.h)} + 20 mm.\nCut a ${fmt(K.w)} \u00d7 12 mm window in the lining first; box the corners of the window before you turn the bag through.`}));
    HW.push({q:1, n:`Zip, ${fmt(K.w+30)} closed length, for the interior pocket`});
  }
  if(S.cards.on){
    const K = S.cards, cw = cardSlotW() + 2*sa;
    const stackH = cardStackH() + sa;
    const grid = SEAMPLAN['cardside'] || planSeam('cardside','Card slot stack, each side', stackH - 2*sa, false);
    for(let i=1;i<=cardSlotN();i++){
      const ch = cardSlotH(i) + sa;
      const ni = Math.max(1, Math.floor((ch - 2*sa)/grid.pitch));  // measured up from the shared datum
      const d=[{t:'cut', d:rr(0,0,cw,ch,0)},{t:'ctr', d:vLine(cw/2,0,ch)},
        {t:'mark', d:hLine(0,cw,K.reveal), label:'REVEAL'},
        {t:'notch', x:cw/2, y:ch, dir:'up'},
        {t:'text', x:cw/2, y:ch-6, s:'CARD SLOT '+i+' OF '+K.n, size:5.4, anchor:'middle', dim:true},
        {t:'text', x:cw/2, y:ch-1.4, s:'ALIGN THIS EDGE WITH THE BOTTOM OF THE STACK', size:3.4, anchor:'middle', mark:true}];
      [sa, cw-sa].forEach(x=>d.push(SEAM('cardside','Card slot stack, each side',
        [['L', x, ch-sa, x, ch-sa-ni*grid.pitch]], {planLen:stackH - 2*sa, n:ni})));
      pieces.push(P({key:'card'+i, name:`Card slot ${i} (${i===1?'front':i===cardSlotN()?'back':'middle'})`, mat:'Leather', w:cw, h:ch, draw:d, seam:cw,
        dims:[D_('h',0,cw,-9,fmt(cw)), D_('v',0,ch,-9,fmt(ch))],
        formula:`width = slot ${fmt(cardSlotW())} + 2 \u00d7 SA ${fmt(sa)} = ${fmt(cw)} \u2014 a card is ${fmt(CARD_W)} across, so that is ${fmt(cardSlotW()-CARD_W)} of clearance\n`+
                `height = deepest slot ${fmt(K.h)} \u2212 ${cardSlotN()-i} \u00d7 reveal ${fmt(K.reveal)} + SA ${fmt(sa)} = ${fmt(ch)}\n`+
                `It covers ${fmt(cardSlotH(i))} of a ${fmt(CARD_H)} card, so ${fmt(CARD_H - cardSlotH(i))} of that one shows above it.\n`+
                `All ${cardSlotN()} slots share one bottom edge, so the side holes fall on the same ${fmtPitch(grid.pitch)} grid, starting ${fmt(sa)} up from it: ${ni+1} holes on this one.`}));
    }
  }

  /* --- carry --- */
  const K = S.strap;
  const buildW = (w) => K.build==='four' ? 4*w + 2*t : w;
  const buildQty = (n) => K.build==='two' ? n*2 : n;
  /* The footprint that lands on the bag is always the FINISHED width. On a single or
     two-layer strap the blank is already that width, so the holes can be marked now.
     A four-fold blank is four times too wide, so it gets the outline and a note instead
     - you fold and glue first, then mark the holes from the panel. */
  function strapAttach(list, along0, alongLen, key, far){
    const face = K.width, cutW = buildW(K.width), yOff = (cutW - face)/2;
    if(K.build === 'four'){
      list.push({t:'mark', d:rr(along0, yOff, alongLen, face, 1.5)});
      list.push({t:'text', x:along0 + alongLen/2, y:yOff - 2,
        s:'FOLD AND GLUE TO ' + fmt(face) + ' FIRST', size:3.4, anchor:'middle', mark:true});
      list.push({t:'text', x:along0 + alongLen/2, y:yOff + face + 4.4,
        s:'THEN MARK THIS FOOTPRINT FROM THE PANEL', size:3.4, anchor:'middle', mark:true});
      return;
    }
    attachOn(list, along0, yOff, alongLen, face, key, 'Strap end to panel',
             {axis:'x', far:far, outline:false});
  }
  /* A strap or handle blank. A two-layer build carries a real edge row down each side - it is
     what holds the two layers together, it is a long row, and it belongs on the drawing as
     well as in the plan. A four-fold blank is four times too wide to mark anything on. */
  /* `ends` is how much of each end is taken by an attachment footprint. The edge rows stop
     short of them: the box's own long sides sit at the same inset as the edge row, so running
     the row through as well drew two lines of holes a hair apart, at two different pitches -
     which is what "duplicated stitch markings" on the pack tail and the buckle tab was. */
  function strapPiece(key,name,len,qty,extra,formula,shape,ends){
    const w = buildW(K.width);
    const strip = {len, w, holes:[], vfolds:[], hfolds:[], rx:K.build==='single'?Math.min(w/2,4):0};
    const bx = shape && shape.box ? shape.box.w/2 : len/2;
    const by = shape && shape.mid != null ? shape.mid : w/2;
    const d=[{t:'cut', d: shape ? shape.cut : rr(0,0,len,w,K.build==='single'?Math.min(w/2,4):0)},
      {t:'grain', x:bx, y:by, len:Math.min(90,len*0.22), dir:'h'},
      {t:'text', x:bx, y:by - (w>20?6:4.2), s:name.toUpperCase(), size:Math.min(5.4,w*0.42), anchor:'middle', dim:true}];
    if(K.build==='four'){
      [w/4, w/2, 3*w/4].forEach((y,i)=>{
        d.push({t:'fold', d:hLine(0,len,y), label:i===1?'CENTRE FOLD':'',
                band:i===0?[0,0,len,w/4]:i===2?[0,3*w/4,len,w/4]:null});
        strip.hfolds.push(y); });
    }
    if(K.build==='two'){
      const ei = Math.max(2, Math.min(sa, w/4));
      const e0 = (ends && ends[0]) ? ends[0] + ei : ei;      // clear of the box at each end
      const e1 = (ends && ends[1]) ? len - ends[1] - ei : len - ei;
      const rows = shape ? shape.edge(ei)
                         : (e1 - e0 > 12 ? [[['L', e0, ei, e1, ei]], [['L', e0, w-ei, e1, w-ei]]] : []);
      // on a curved blank the inner edge is genuinely shorter than the outer one, so the two
      // rows cannot share a hole count - they are two seams, and the plan says so
      const split = !!(shape && shape.split);
      rows.forEach((run,i) => {
        /* A shaped blank comes to a thin tip at each end, so the row stops short of it - and
           it has to stop clear of an ATTACHMENT BOX as well, exactly as a straight one does.
           A shaped end was the one case that never got that clearance: on a 16 mm buckle tab
           the edge row and the box's long side came out 0.8 mm apart, which is two rows of
           holes at two different pitches in the same three millimetres of leather. */
        const t0 = (ends && ends[0]) ? ends[0] : 0, t1 = (ends && ends[1]) ? ends[1] : 0;
        const r2 = shape ? trimRun(run, ei + t0, ei + t1) : run;
        d.push(SEAM('edge-'+key+(split?(i?'-out':'-in'):''),
          name + ' edge row' + (split ? (i?' (outer)':' (inner)') : ''), r2, {planLen:runLen(r2), ins:ei}));
      });
      if(rows.length)
        d.push({t:'text', x:(e0+e1)/2, y:by + 1.2, s:'EDGE ROW \u2014 IT HOLDS THE TWO LAYERS TOGETHER', size:3.2, anchor:'middle', mark:true});
    } else if(K.build==='four'){
      planSeam('edge-'+key, name+' edge row', len, false); planSeam('edge-'+key, '', len, false);
      d.push({t:'text', x:bx, y:w/4-2, s:'EDGE ROWS GO ON AFTER THE FOLD, ' + fmt(Math.max(2,Math.min(sa,K.width/4))) + ' IN FROM EACH FINISHED EDGE', size:3.2, anchor:'middle', mark:true});
    }
    (extra||[]).forEach(e=>{ d.push(e);
      if(e.t==='hole') strip.holes.push(e);
      if(e.t==='fold'){ const m=/M ([-\d.]+) /.exec(e.d); if(m && /V /.test(e.d)) strip.vfolds.push(+m[1]); }
    });
    const extraNote = K.build==='four' ? `\nFour-fold: cut ${fmt(w)} wide, fold the long edges to the centre, finishes ${fmt(K.width)}.`
                    : K.build==='two'  ? `\nCut two and glue flesh-to-flesh \u2014 finished thickness ${fmt(2*t)} \u2014 then run the two edge rows.` : '';
    const bw = shape && shape.box ? shape.box.w : len, bh = shape && shape.box ? shape.box.h : w;
    return P({key, name, mat:'Leather', w:bw, h:bh, qty, draw:d, seam:len*2, strip: shape?null:strip, label:name,
      dims: shape && shape.box
        ? [D_('h',0,bw,-9,fmt(bw)+' across the blank'), D_('v',0,bh,-9,fmt(bh))]
        : [D_('h',0,len,-9,fmt(len)), D_('v',0,w,-9,fmt(w))],
      formula:formula+extraNote});
  }
  /* A straight strap has to twist to lie on a shoulder. Cut on a shallow arc it lies
     down on its own - and it eats a much bigger rectangle of hide, which is worth seeing. */
  const strapShape = (len2) => {
    if(!K.curve || K.build==='four') return null;
    const w2 = buildW(K.width), B = arcBand(len2, w2, Math.min(K.curve, len2*0.12));
    return {box:B.box, cut:B.cut, mid:B.box.h*0.5, split:true,
            edge: ei => [B.run(-w2/2 + ei), B.run(w2/2 - ei)], band:B};
  };
  if(K.type==='fixed' || K.type==='adjust'){
    const span = 2*K.drop + 50;
    const swivel = K.attach==='swivel';
    const endTake = swivel ? 2*28 : 0;
    const endAdd  = swivel ? 2*(K.width+8) : 2*30;
    if(K.type==='fixed'){
      const len = span - endTake + endAdd;
      const sEx = [];
      if(!swivel){
        const al = Math.max(18, K.tabLen);
        strapAttach(sEx, 0, al, 'strapbox', 'start');
        strapAttach(sEx, len-al, al, 'strapbox', 'end');
      }
      const sh = strapShape(len);
      if(sh) sEx.length = 0;                      // a curved blank cannot carry a straight footprint
      const sEnds = (!swivel && !sh) ? [Math.max(18, K.tabLen), Math.max(18, K.tabLen)] : null;
      pieces.push(strapPiece('strap','Shoulder strap',len,buildQty(1),sEx,
        `over-the-shoulder path = 2 \u00d7 drop ${fmt(K.drop)} + 50 mm shoulder curve = ${fmt(span)}\n`+
        (swivel?`less 2 \u00d7 28 mm taken up by the swivel snaps, plus 2 \u00d7 (width ${fmt(K.width)} + 8) folded back through the rings`
               :`plus 2 \u00d7 30 mm sewn onto the gusset`)+` = ${fmt(len)} measured along the centre line` +
        (sh?`\nCut on a ${fmt(Math.min(K.curve,len*0.12))} curve: the blank is only ${fmt(sh.box.w)} end to end but needs a strip ${fmt(sh.box.h)} deep, so it wants a straighter part of the hide than you would think.\nMark the ${fmt(Math.max(18,K.tabLen))} attachment footprint from the panel once it is cut \u2014 a curved end cannot be pricked flat.`:''),
        sh, sEnds));
    } else {
      const bt = 45, tail = 90;
      const longLen = span - bt - endTake/2 + endAdd/2 + tail;
      const holes = Math.floor(K.adjust/25)+1;
      const hx = [];
      for(let i=0;i<holes;i++) hx.push({t:'hole', x:longLen-40-i*25, y:buildW(K.width)/2, r:2.2, label:i===0?'LONGEST':''});
      const shA = strapShape(longLen) || tipStrip(longLen, buildW(K.width), K.tip, false);
      pieces.push(strapPiece('strap','Adjustable strap',longLen,buildQty(1),(strapShape(longLen)?[]:hx),
        `over-the-shoulder path at the longest setting = 2 \u00d7 drop ${fmt(K.drop)} + 50 mm = ${fmt(span)}\n`+
        `less the buckle tab ${fmt(bt)}, plus ${fmt(tail)} of tail past the last hole = ${fmt(longLen)} cut length\n`+
        `${holes} holes at 25 mm pitch, first one ${fmt(40)} from the tip \u2192 ${fmt((holes-1)*25)} of strap adjustment, which is a drop of ${fmt(K.drop-(holes-1)*12.5)}\u2013${fmt(K.drop)}`+
        (strapShape(longLen)?`\nCut on a ${fmt(Math.min(K.curve,longLen*0.12))} curve, so the blank measures ${fmt(shA.box.w)} \u00d7 ${fmt(shA.box.h)}. Space the adjustment holes along the centre line after it is cut.`
          : tipNote(buildW(K.width), K.tip, 'the tail')),
        shA));
      const btw = buildW(K.width), btl = 2*bt+12, btBox = Math.min(bt-4, 26);
      const bz = Math.max(6, 3*t + 4);
      const btEx = [{t:'wrap', x:bt+6-bz, y:0, w:2*bz, h:btw, label:'ROUND THE BUCKLE BAR'},
                    {t:'fold', d:vLine(bt+6,0,btw), label:'FOLD ROUND THE BAR'}];
      const btSh = tipStrip(btl, btw, K.tip, true);
      // a four-fold blank is four times the finished width, so nothing on it can be pricked
      if(K.build !== 'four')
        attachOn(btEx, 0, 0, btBox, btw, 'buckletail', 'Buckle tab, tail to tail',
                 {axis:'x', far:'start', fix:'stitchbox'});
      else
        btEx.push({t:'text', x:btBox/2, y:btw*0.5+4, s:'FOLD AND GLUE FIRST, THEN PRICK BOTH TAILS TOGETHER',
                   size:3.4, anchor:'middle', mark:true});
      btEx.push({t:'text', x:btBox+4, y:btw+5, s:'FOLD ROUND THE BAR, THEN PRICK BOTH TAILS TOGETHER', size:3.4, anchor:'start', mark:true});
      pieces.push(strapPiece('buckleTab','Buckle tab',btl,buildQty(1), btEx,
        `folds around the buckle bar: 2 \u00d7 ${fmt(bt)} + 12 mm for the bar and overlap = ${fmt(btl)}\n`+
        `The box at the free end goes through both tails and is what stops the buckle pulling out.`+
        tipNote(btw, K.tip, 'both tails'), btSh, K.build==='four' ? null : [btBox, 0]));
      const kl = 2*(K.width + 3*t) + 10, kh = 12, klap = 10;
      pieces.push(P({key:'keeper', name:'Keeper loop', mat:'Leather', w:kl, h:kh, qty:1, seam:kl,
        draw:[{t:'cut', d:rr(0,0,kl,kh,0)},
              {t:'mark', d:vLine(klap,0,kh)}, {t:'mark', d:vLine(kl-klap,0,kh)},
              SEAM('keeperlap','Keeper overlap', [['L', klap/2, kh-3, klap/2, 3]], {}),
              {t:'text', x:kl/2, y:8, s:'KEEPER', size:5, anchor:'middle', dim:true},
              {t:'text', x:kl/2, y:kh+4.2, s:'LAP THE ENDS '+fmt(klap)+' AND STITCH THE LAP', size:3.2, anchor:'middle', mark:true}],
        dims:[D_('h',0,kl,-9,fmt(kl))],
        formula:`wraps the doubled strap: 2 \u00d7 (width ${fmt(K.width)} + 3 \u00d7 thickness ${fmt(3*t)}) + ${fmt(klap)} overlap = ${fmt(kl)}\n`+
                `One short row through the lap is all the stitching it needs.`}));
      HW.push({q:1, n:`Buckle or slider, ${fmt(K.width)} inside width`});
    }
    if(swivel){
      /* The middle of this tab wraps the ring bar, and you cannot prick through a fold. The
         hatched zone was drawn 20 mm wide inside a 14 mm allowance, so the stitch box started
         INSIDE it. Size the allowance from the wrap it actually has to make, and keep a real
         gap between where the fold ends and where the first hole goes. */
      const gap = Math.max(3, sa*0.6);
      const bar = Math.max(14, Math.round(2*(1.6*t + 3 + gap)));
      const wrapZ = bar/2 - gap;
      const tl = 2*K.tabLen + bar;
      const tsh = tipStrip(tl, K.width, K.tip, true);
      const td=[{t:'cut', d: tsh ? tsh.cut : rr(0,0,tl,K.width,Math.min(K.width/2,3))},
                {t:'wrap', x:tl/2 - wrapZ, y:0, w:2*wrapZ, h:K.width, label:'ROUND THE RING BAR'},
                {t:'fold', d:vLine(tl/2,0,K.width), label:'FOLD ROUND THE RING'},
                {t:'text', x:tl*0.16, y:K.width/2+2, s:'TAB', size:5, anchor:'middle', dim:true}];
      attachOn(td, tl-K.tabLen, 0, K.tabLen, K.width, 'tabbox', 'D-ring tab to gusset',
               {axis:'x', far:'end'});
      td.push({t:'text', x:tl-K.tabLen, y:K.width+5, s:'FOLD FIRST, THEN PRICK BOTH TAILS TOGETHER', size:3.6, anchor:'start', mark:true});
      pieces.push(P({key:'tab', name:'D-ring tab', mat:'Leather', w:tl, h:K.width, qty:2, seam:tl*2, draw:td,
        dims:[D_('h',0,tl,-9,fmt(tl)), D_('v',0,K.width,-9,fmt(K.width)), D_('h',tl-K.tabLen,tl,K.width+11,fmt(K.tabLen)+' on the gusset',1)],
        formula:`2 \u00d7 tab length ${fmt(K.tabLen)} + ${fmt(bar)} to wrap the ring bar = ${fmt(tl)}.\nThe hatched zone is the fold: the first hole of the box sits ${fmt(gap)} clear of it, because you cannot prick leather that is bending. Folds in half; both tails ${S.strap.tabFix==='rivet'?'are riveted':S.strap.tabFix==='both'?'are stitched and riveted':'are stitched'} to the gusset.`+tipNote(K.width, K.tip, 'both tails')}));
      HW.push({q:2, n:`Swivel snap, ${fmt(K.width)} inside width`});
      HW.push({q:2, n:`D-ring or rectangle ring, ${fmt(K.width)} inside width`});
    }
  }
  if(K.type==='pack' && K.pad){
    /* A padded strap is a shaped sandwich, not a strip: wide where it crosses the shoulder,
       tapering to webbing width at the bottom, with closed-cell foam between two skins.
       The shoulder section is what carries the load; below it the strap only has to pull. */
    const len = K.drop, al = Math.max(18, K.tabLen);
    const pw3 = Math.max(K.width + 10, K.padW), nw = K.width;
    const padLen = Math.min(len*0.55, 320), tail = len - padLen;
    const bow = Math.min(pw3*0.42, 34);           // how far the S wanders off the straight
    const N = 24, EDGE = [];
    // the shape, walked down one side and back up the other
    const half = u => {                            // half-width at 0..1 down the strap
      if(u < 0.06) return pw3*0.5*(0.72 + 0.28*(u/0.06));
      if(u > padLen/len) { const v = (u - padLen/len)/(1 - padLen/len); return (pw3*0.5)*(1-v) + (nw*0.5)*v; }
      return pw3*0.5;
    };
    const off = u => Math.sin(Math.PI*Math.min(1,u/(padLen/len)))*bow*(1 - 0.5*u);
    const L2 = [], R2 = [];
    for(let i=0;i<=N;i++){ const u = i/N, y = u*len, c = bow + off(u);
      L2.push([c - half(u), y]); R2.push([c + half(u), y]); }
    // the S wanders, so the widest point is not where you would guess: measure the blank
    const sx3 = 2 - Math.min.apply(null, L2.map(q=>q[0]));
    L2.forEach(q=>q[0]+=sx3); R2.forEach(q=>q[0]+=sx3);
    const bboxW = Math.max.apply(null, R2.map(q=>q[0])) + 2;
    const cutPts = L2.concat(R2.slice().reverse());
    /* ONE definition of "the same shape, this far in". The strap tapers and its centre line
       wanders, so an inset is NOT a scaled copy of the outline: scaling about a fixed point
       takes proportionally less off the narrow end than the wide one AND drags the bow back
       towards the straight, which is what walked the foam line off the blank. Walk the same
       parameters instead, with the half-width reduced and the ends pulled in. */
    const insetPts = ins => {
      const pl = [], pr = [];
      for(let i=0;i<=N;i++){
        const u = i/N, y = Math.min(len-ins, Math.max(ins, u*len));
        const c = bow + off(u) + sx3, h2 = Math.max(2, half(u) - ins);
        pl.push([c-h2, y]); pr.push([c+h2, y]);
      }
      return pl.concat(pr.slice().reverse());
    };
    // one row right round the shape, inset - it has to close, or the hole count is nonsense
    const runOf = ins => {
      const pts = insetPts(ins), seg = [];
      for(let i=0;i<pts.length;i++){
        const a = pts[i], b = pts[(i+1)%pts.length];
        if(Math.hypot(b[0]-a[0], b[1]-a[1]) > 1e-6) seg.push(['L',a[0],a[1],b[0],b[1]]);
      }
      return seg;
    };
    const FOAM_IN = 6;                       // the foam stops this far short of the cut edge
    const foamPts = insetPts(FOAM_IN);
    const mk = (key, name, mat, inset, note, extra) => {
      const d = [{t:'cut', d: poly(inset ? cutPts.map(q=>[q[0], q[1]]) : cutPts)},
        {t:'grain', x:bow+sx3, y:len*0.5, len:Math.min(120, len*0.25), dir:'v'},
        {t:'text', x:bow+sx3, y:len*0.30, s:name.toUpperCase(), size:6, anchor:'middle', dim:true},
        {t:'text', x:bow+sx3, y:len*0.36, s:note, size:3.6, anchor:'middle', mark:true}];
      (extra||[]).forEach(e=>d.push(e));
      return P({key, name, mat, w:bboxW, h:len, qty:2, draw:d, seam:2*len,
        dims:[D_('h',0,bboxW,-9,fmt(bboxW)), D_('v',0,len,-9,fmt(len)),
              D_('h',bow+sx3-pw3/2,bow+sx3+pw3/2,len*0.08,fmt(pw3)+' at the shoulder',1)],
        formula:`Shaped strap: ${fmt(pw3)} across the shoulder for the first ${fmt(padLen)}, then tapering to ${fmt(nw)} over the last ${fmt(tail)}.\n`+
                `The S wanders ${fmt(bow)} off straight so the strap follows the collarbone instead of cutting across it.\n`+
                `Blank ${fmt(bboxW)} \u00d7 ${fmt(len)}; cut both skins from the same template so the edge row lands on both.`});
    };
    const sEdge = SEAM('padedge','Padded strap, right round the edge', runOf(Math.max(3,sa)), {closed:true});
    pieces.push(mk('packstrap','Pack strap, outer', 'Leather', false, 'GRAIN SIDE OUT', [sEdge,
      // the dashed red line is where the FOAM ends - a true inset of the outline, so it
      // stays the same distance from the cut edge all the way down a strap that tapers
      {t:'mark', d:poly(foamPts)},
      {t:'text', x:bow+sx3, y:len*0.62, s:'RED DASH = EDGE OF THE FOAM', size:3.6, anchor:'middle', mark:true},
      {t:'text', x:bow+sx3, y:len*0.66, s:'THE STITCH ROW STAYS OUTSIDE IT, THROUGH LEATHER ONLY', size:3.2, anchor:'middle', mark:true}]));
    pieces.push(mk('packstrapIn','Pack strap, backing', S.lined?'Lining':'Leather', false,
      'AGAINST YOU \u2014 SOFT SIDE OUT', [SEAM('padedge','Padded strap, right round the edge', runOf(Math.max(3,sa)), {closed:true})]));
    /* The foam is cut from its own inset shape, and a shaped blank is measured from its own
       drawing - reporting the leather blank's size here had her cutting foam 12 mm too big. */
    const fmX = Math.min.apply(null, foamPts.map(q=>q[0])), fmY = Math.min.apply(null, foamPts.map(q=>q[1]));
    const foamOwn = foamPts.map(q=>[q[0]-fmX, q[1]-fmY]);
    const foamW = Math.max.apply(null, foamOwn.map(q=>q[0])), foamH = Math.max.apply(null, foamOwn.map(q=>q[1]));
    pieces.push(P({key:'packFoam', name:'Pack strap foam', mat:'Foam', w:foamW, h:foamH, qty:2, seam:0,
      draw:[{t:'cut', d: poly(foamOwn)},
            {t:'text', x:foamW/2, y:foamH*0.5, s:'FOAM', size:7, anchor:'middle', dim:true},
            {t:'text', x:foamW/2, y:foamH*0.56, s:fmt(K.padThick)+' CLOSED-CELL, SKIVE THE EDGE TO NOTHING', size:3.6, anchor:'middle', mark:true}],
      dims:[D_('h',0,foamW,-9,fmt(foamW)), D_('v',0,foamH,-9,fmt(foamH))],
      formula:`Cut ${fmt(K.padThick)} closed-cell foam (EVA) inside the leather by ${fmt(FOAM_IN)} all round, so the edge row goes through leather only.\n`+
              `Under ${fmt(8)} you will feel the webbing through it; over ${fmt(15)} the strap stops following your shoulder.`}));
    const pEx = [];
    strapAttach(pEx, 0, al, 'packanchor', 'start');
    pieces.push(strapPiece('packTail','Pack strap tail', Math.max(120, K.drop*0.35), buildQty(2), pEx,
      `The adjustable tail below the pad: it runs from the bottom of the shaped strap through the ladder lock and back on itself.\n`+
      `Cut it ${fmt(K.width)} wide to match the hardware, and keep it flat \u2014 nothing about this part wants to be padded.`, null, [al, 0]));
    HW.push({q:2, n:`Ladder lock or slider, ${fmt(K.width)} inside width \u2014 for the pack strap tails`});
    HW.push({q:1, n:`Closed-cell foam, ${fmt(K.padThick)} \u2014 about ${fmtArea(2*foamW*foamH)} of it`});
    STEPS.push(`Build each shoulder strap as a sandwich: foam between the outer and the backing, everything glued, then one row right round the edge through leather only. Skive the foam edge to nothing first or the row will ride up over it.`);
  } else if(K.type==='pack'){
    const len = K.drop, w = buildW(K.width), al = Math.max(18, K.tabLen);
    const pEx = [];
    strapAttach(pEx, 0, al, 'packanchor', 'start');
    strapAttach(pEx, len-al, al, 'packanchor', 'end');
    pieces.push(strapPiece('packstrap','Pack strap', len, buildQty(2), pEx,
      `Each shoulder strap runs ${fmt(len)} from the top anchor, over the shoulder, down to the base anchor.\n`+
      `They sit ${fmt(K.packSpan)} apart at the top and about ${fmt(K.packSpan*0.55)} apart at the base, so they follow the shoulders rather than the spine.\n`+
      `Both ends carry the same ${fmt(K.width)} \u00d7 ${fmt(al)} footprint that is drawn on the back panel \u2014 prick them together.\n`+
      `Curve them if you like: cut straight and they will still work, but a gentle S takes the load off the neck.`, null, [al, al]));
    const pw2 = Math.max(28,K.width+8), ph2 = al+14;
    pieces.push(P({key:'packTop', name:'Strap anchor reinforcement', mat:'Leather', w:pw2, h:ph2, qty:4, seam:0,
      draw:[{t:'cut', d:rr(0,0,pw2,ph2,3)},
            {t:'mark', d:rr((pw2-K.width)/2, 7, K.width, al, 1.5)},
            {t:'text', x:pw2/2, y:ph2/2+2, s:'ANCHOR', size:4.4, anchor:'middle', dim:true},
            {t:'text', x:pw2/2, y:ph2-2.5, s:'SKIVE THE EDGES TO NOTHING', size:3.2, anchor:'middle', mark:true}],
      dims:[D_('h',0,pw2,-9,fmt(pw2)), D_('v',0,ph2,-9,fmt(ph2))],
      formula:`One behind each of the four strap anchors: the ${fmt(K.width)} \u00d7 ${fmt(al)} footprint plus 7 mm all round.\n`+
              `It is glued behind the panel, not stitched separately \u2014 the strap's own box goes through all three layers.`}));
    HW.push({q:2, n:`Slider or ladder lock, ${fmt(K.width)} inside width - for adjusting the pack straps`});
  }
  if(K.type==='belt'){
    /* A belt bag hangs on its belt, not on a strap sewn to it: the belt threads through the
       loops on the back and the bag slides along it. Cut it long - you can always punch more. */
    const waist = Math.max(600, K.drop*1.6), tail = 130, bt2 = 55;
    const blen = waist + tail;
    const holes2 = 7, hx2 = [];
    for(let i=0;i<holes2;i++)
      hx2.push({t:'hole', x:blen - 45 - i*25, y:buildW(K.width)/2, r:2.5, label:i===3?'MIDDLE HOLE':''});
    pieces.push(strapPiece('belt','Belt', blen, buildQty(1), hx2,
      `Cut for a ${fmt(waist)} waist plus ${fmt(tail)} of tail past the last hole = ${fmt(blen)}.\n`+
      `${holes2} holes at 25 mm pitch gives ${fmt((holes2-1)*25)} of adjustment either side of the middle one.\n`+
      `The bag rides on this belt through its loops \u2014 nothing is stitched between the two, which is why the loops have to be right.`+
      tipNote(buildW(K.width), K.tip, 'the tail'), tipStrip(blen, buildW(K.width), K.tip, false)));
    pieces.push(strapPiece('beltTab','Belt buckle tab', 2*bt2+14, buildQty(1),
      [{t:'wrap', x:bt2+7-Math.max(6,3*t+4), y:0, w:2*Math.max(6,3*t+4), h:buildW(K.width), label:'ROUND THE BUCKLE BAR'},
       {t:'fold', d:vLine(bt2+7,0,buildW(K.width)), label:'FOLD ROUND THE BAR'},
       {t:'hole', x:bt2+7, y:buildW(K.width)/2, r:3, label:'PRONG SLOT'}],
      `Folds round the buckle bar: 2 \u00d7 ${fmt(bt2)} + 14 mm = ${fmt(2*bt2+14)}. The prong comes through the slot on the fold.`));
    const kl2 = 2*(K.width + 3*t) + 10;
    pieces.push(P({key:'beltKeeper', name:'Belt keeper', mat:'Leather', w:kl2, h:12, qty:1, seam:kl2,
      draw:[{t:'cut', d:rr(0,0,kl2,12,0)},
            SEAM('keeperlap','Keeper overlap', [['L', 5, 9, 5, 3]], {}),
            {t:'text', x:kl2/2, y:8, s:'KEEPER', size:5, anchor:'middle', dim:true}],
      dims:[D_('h',0,kl2,-9,fmt(kl2))],
      formula:`Wraps the doubled belt: 2 \u00d7 (${fmt(K.width)} + 3 \u00d7 thickness ${fmt(3*t)}) + 10 mm overlap = ${fmt(kl2)}`}));
    HW.push({q:1, n:`Belt buckle, ${fmt(K.width)} inside width`});
    STEPS.push(`Thread the belt through both loops on the back before you buckle it. The loops want to be ${fmt(K.width + 4*t)} of clear span or the belt will not pass \u2014 that is what the belt-loop piece already allows for.`);
  }
  if(K.type==='handles'){
    /* A handle is built one of four ways, and each one changes the blank, the stitching and
       how wide the tail lands on the bag. Everything below reads off handles.build. */
    const Hd = S.handles, B = Hd.build, ends = Hd.ends || 'plain';
    const fw = Math.max(8, Hd.width);                 // finished width
    const bw = handleBlankW(), tailW = handleTailW();
    const arc = halfEllipse(Hd.span/2, Hd.rise);
    const len = arc + 2*Hd.attach;
    const bend = Hd.attach, grip0 = bend + Math.min(arc*0.22, 40), grip1 = len - grip0;
    const tp = (B==='single' || B==='layered') ? Math.max(0, Math.min(Hd.taper||0, fw-8)) : 0;
    const hdN = rivetCount(rivetSpecAt(Hd));
    const fixWord2 = Hd.fix==='rivet' ? `${hdN} rivets per tail`
                   : Hd.fix==='both'  ? `${hdN} rivets per tail and a stitched box round them`
                   : 'a stitched box';

    if(B === 'rolled'){
      /* Cord = handle less the two ends; strip = cord + four ends, because each end folds up
         over the cut end of the cord and then lies flat on the bag. */
      const E2 = Hd.attach, cordLen = Math.max(20, len - 2*E2), stripLen = cordLen + 4*E2;
      const core = Math.max(3, Hd.core);
      const rd = [{t:'cut', d:rr(0,0,stripLen,bw,3)},
        {t:'ctr', d:hLine(0,stripLen,bw/2)},
        {t:'mark', d:vLine(2*E2, 0, bw)}, {t:'mark', d:vLine(stripLen-2*E2, 0, bw)},
        {t:'notch', x:2*E2, y:0, dir:'down'}, {t:'notch', x:stripLen-2*E2, y:0, dir:'down'},
        SEAM('handleroll','Rolled handle, close in beside the cord',
             [['L', 2*E2, bw/2 + core*0.5 + 2, stripLen-2*E2, bw/2 + core*0.5 + 2]], {even:true}),
        {t:'text', x:stripLen/2, y:bw*0.34, s:'ROLLED TOP HANDLE', size:6, anchor:'middle', dim:true},
        {t:'text', x:stripLen/2, y:bw*0.28, s:'CORD ON THE CENTRE LINE, BETWEEN THE NOTCHES', size:3.4, anchor:'middle', mark:true},
        {t:'text', x:E2, y:bw*0.5+2, s:'FOLDS UP OVER THE CORD END', size:3.2, anchor:'middle', mark:true},
        {t:'text', x:E2, y:bw*0.5+7, s:'FLATTENS TO ' + fmt(tailW) + ' ON THE BAG', size:3.2, anchor:'middle', mark:true},
        {t:'grain', x:stripLen/2, y:bw-6, len:Math.min(120, stripLen*0.3), dir:'h'}];
      pieces.push(P({key:'handle', name:'Top handle, rolled', mat:'Leather', w:stripLen, h:bw, qty:2, draw:rd,
        seam:2*cordLen,
        dims:[D_('h',0,stripLen,-9,fmt(stripLen)), D_('v',0,bw,-9,fmt(bw)),
              D_('h',2*E2,stripLen-2*E2,bw+11,fmt(cordLen)+' of cord',1)],
        formula:`cord = handle ${fmt(len)} \u2212 2 \u00d7 end ${fmt(E2)} = ${fmt(cordLen)}\n`+
                `strip = cord ${fmt(cordLen)} + 4 \u00d7 end ${fmt(E2)} = ${fmt(stripLen)} \u2014 the extra two ends fold up over the cut ends of the cord\n`+
                `width = round a ${fmt(core)} cord in ${fmt(t)} leather (\u03c0 \u00d7 ${fmt(core+t)} = ${fmt(Math.PI*(core+t))}) + 2 \u00d7 ${fmt(HANDLE_LAP)} of flange to stitch through = ${fmt(bw)}\n`+
                `The finished handle is about ${fmt(core + 2*t)} across in the hand, but its tail lands on the bag flattened, ${fmt(tailW)} wide \u2014 that is the footprint drawn on the panel.\n`+
                `Glue the cord down the centre line, roll the leather over it, clamp until dry, then one row down the underside hard against the cord.`}));
      pieces.push(P({key:'handleCord', name:'Handle cord', mat:'Cord', w:cordLen, h:Math.max(4,core), qty:2, seam:0,
        draw:[{t:'cut', d:rr(0,0,cordLen,Math.max(4,core),Math.max(2,core/2))},
              {t:'text', x:cordLen/2, y:Math.max(4,core)*0.75, s:fmt(core)+' CORD', size:Math.min(4,core*0.6), anchor:'middle', dim:true}],
        dims:[D_('h',0,cordLen,-9,fmt(cordLen))],
        formula:`Cotton piping cord or a preformed handle core, ${fmt(core)} across. Firm enough to hold its shape, soft enough to bend over the hand.`}));
      STEPS.push(`Roll the handles first, before anything goes on the bag: cord glued to the centre line, leather rolled over and clamped, one row down the underside, then the four ends folded up over the cord and flattened.`);
    } else {
      const shape = tp > 0 && grip1 > grip0 ? {
        cut: poly([[0,0],[bend,0],[grip0,tp/2],[grip1,tp/2],[len-bend,0],[len,0],
                   [len,bw],[len-bend,bw],[grip1,bw-tp/2],[grip0,bw-tp/2],[bend,bw],[0,bw]]),
        edge: ei => [
          [['L',ei,ei,bend,ei],['L',bend,ei,grip0,ei+tp/2],['L',grip0,ei+tp/2,grip1,ei+tp/2],
           ['L',grip1,ei+tp/2,len-bend,ei],['L',len-bend,ei,len-ei,ei]],
          [['L',ei,bw-ei,bend,bw-ei],['L',bend,bw-ei,grip0,bw-ei-tp/2],['L',grip0,bw-ei-tp/2,grip1,bw-ei-tp/2],
           ['L',grip1,bw-ei-tp/2,len-bend,bw-ei],['L',len-bend,bw-ei,len-ei,bw-ei]]]
      } : null;
      const d = [{t:'cut', d: shape ? shape.cut : rr(0,0,len,bw,B==='single'?Math.min(bw/2,4):0)},
        {t:'grain', x:len*0.5, y:bw*0.5, len:Math.min(90,len*0.22), dir:'h'},
        {t:'text', x:len*0.5, y:bw*0.5 - (bw>20?6:4.2), s:'TOP HANDLE', size:Math.min(5.4,bw*0.42), anchor:'middle', dim:true}];
      if(B === 'folded'){
        [bw/4, bw/2, 3*bw/4].forEach((y,i)=>d.push({t:'fold', d:hLine(0,len,y), label:i===1?'CENTRE FOLD':'',
          band:i===0?[0,0,len,bw/4]:i===2?[0,3*bw/4,len,bw/4]:null}));
        planSeam('edge-handle','Top handle edge row', len, false); planSeam('edge-handle','', len, false);
        d.push({t:'text', x:len/2, y:bw/4-2, s:'EDGE ROWS GO ON AFTER THE FOLD, ' + fmt(Math.max(2,Math.min(sa,fw/4))) + ' IN FROM EACH FINISHED EDGE', size:3.2, anchor:'middle', mark:true});
      } else if(B === 'layered'){
        const ei = Math.max(2, Math.min(sa, bw/4));
        // stop clear of the tail boxes at each end, or the row and the box draw the same
        // line twice, a hair apart, at two different pitches
        const hasBox = ends === 'plain';
        const q0 = hasBox ? Hd.attach + ei : ei, q1 = hasBox ? len - Hd.attach - ei : len - ei;
        const rows = (shape ? shape.edge(ei).map(r => hasBox ? trimRun(r, Hd.attach) : r)
                            : (q1 - q0 > 12 ? [[['L', q0, ei, q1, ei]], [['L', q0, bw-ei, q1, bw-ei]]] : []))
                     .filter(r => runLen(r) > 12);
        rows.forEach(run => d.push(SEAM('edge-handle','Top handle edge row', run, {planLen:runLen(run), ins:ei})));
        // this used to sit at mid-span, on top of the piece name, the grain arrow and both
        // edge-row counts - four things in 4 mm of paper on a handle 26 mm tall
        if(rows.length)
          d.push({t:'text', x:(q0+q1)/2, y:bw*0.5 + 1.2, s:'EDGE ROW \u2014 IT HOLDS THE TWO LAYERS TOGETHER', size:3.2, anchor:'middle', mark:true});
      }
      if(ends === 'plain' && B !== 'folded'){
        attachOn(d, 0, 0, Hd.attach, bw, 'handlebox', 'Handle end to panel',
                 {axis:'x', far:'start', fix:Hd.fix, rivetSpec:rivetSpecAt(Hd), tipShape:S.strap.tip});
        attachOn(d, len-Hd.attach, 0, Hd.attach, bw, 'handlebox', 'Handle end to panel',
                 {axis:'x', far:'end', fix:Hd.fix, rivetSpec:rivetSpecAt(Hd), tipShape:S.strap.tip});
      } else if(ends === 'plain'){
        d.push({t:'mark', d:rr(0, (bw-fw)/2, Hd.attach, fw, 1.5)});
        d.push({t:'mark', d:rr(len-Hd.attach, (bw-fw)/2, Hd.attach, fw, 1.5)});
        d.push({t:'text', x:len/2, y:bw*0.5 - 9, s:'FOLD AND GLUE TO ' + fmt(fw) + ' FIRST, THEN MARK THE TAILS FROM THE PANEL', size:3.2, anchor:'middle', mark:true});
      }
      [bend, len-bend].forEach((bx,i)=>
        d.push({t:'fold', d:vLine(bx,0,bw), label:i===0?'BEND \u2014 THE ARC STARTS HERE':''}));
      d.push({t:'text', x:len*0.74, y:bw*0.5 + 1.2, s:'CUT IT STRAIGHT \u2014 THE ARC IS WHAT IT DOES, NOT HOW IT IS CUT', size:3.4, anchor:'middle', mark:true});
      const qty2 = B==='layered' ? 4 : 2;
      pieces.push(P({key:'handle', name:'Top handle', mat:'Leather', w:len, h:bw, qty:qty2, draw:d, seam:len*2,
        dims:[D_('h',0,len,-9,fmt(len)), D_('v',0,bw,-9,fmt(bw))],
        formula:`arc over the hand \u2248 half-ellipse with span/2 = ${fmt(Hd.span/2)} and rise ${fmt(Hd.rise)} \u2192 ${fmt(arc)}\n`+
                `plus 2 \u00d7 tail ${fmt(Hd.attach)} = ${fmt(len)} cut length\n`+
                `${HANDLE_BUILDS[B]}: ` + (B==='folded'
                  ? `cut ${fmt(bw)} wide (4 \u00d7 ${fmt(fw)} + 2 \u00d7 thickness), fold both long edges to the centre, finishes ${fmt(fw)} across and ${fmt(4*t)} thick.`
                  : B==='layered'
                  ? `cut ${qty2} at ${fmt(bw)} wide, glue flesh to flesh in pairs \u2014 finished thickness ${fmt(2*t)} \u2014 then run the two edge rows.`
                  : `one layer at ${fmt(bw)}, so it finishes ${fmt(t)} thick. Fine on a small bag, floppy on a big one.`) + `\n`+
                (tp>0 ? `The grip narrows by ${fmt(tp)} to ${fmt(fw-tp)} between ${fmt(grip0)} and ${fmt(grip1)}, so it sits in the hand instead of digging in.\n` : '')+
                `Crease it at the two bend marks: outside them it lies flat on the bag, between them it arches.\n`+
                `Each tail sits ${fmt(Hd.anchorY)} down from the rim, ${fmt(Hd.span)} apart, held by ${fixWord2}.`}));
    }

    /* How the ends are held. Stitched flat is the simple way and the one that tears panels;
       a wrap-over tab or a ring spreads the pull and lets the handle swing. */
    if(ends === 'tab'){
      const tw3 = tailW + 8, drop2 = Math.max(22, Hd.attach*0.7), tl3 = 2*drop2 + tw3*0.6 + 4*t;
      const td3 = [{t:'cut', d:(tipStrip(tl3, tw3, S.strap.tip, true)||{cut:rr(0,0,tl3,tw3,3)}).cut},
        {t:'fold', d:vLine(drop2,0,tw3), label:'FOLD'}, {t:'fold', d:vLine(tl3-drop2,0,tw3), label:'FOLD'},
        {t:'text', x:tl3/2, y:tw3*0.62, s:'HANDLE TAB', size:4.6, anchor:'middle', dim:true},
        {t:'text', x:tl3/2, y:tw3+4.4, s:'THE HANDLE END SITS IN THE MIDDLE; BOTH TAILS GO ON THE PANEL', size:3.2, anchor:'middle', mark:true}];
      attachOn(td3, 0, 0, drop2, tw3, 'handletab', 'Handle tab to panel',
               {axis:'x', far:'start', fix:Hd.fix, rivetSpec:rivetSpecAt(Hd)});
      attachOn(td3, tl3-drop2, 0, drop2, tw3, 'handletab', 'Handle tab to panel',
               {axis:'x', far:'end', fix:Hd.fix, rivetSpec:rivetSpecAt(Hd)});
      pieces.push(P({key:'handleTab', name:'Handle tab', mat:'Leather', w:tl3, h:tw3, qty:4, draw:td3, seam:4*drop2,
        dims:[D_('h',0,tl3,-9,fmt(tl3)), D_('v',0,tw3,-9,fmt(tw3))],
        formula:`Wraps over the handle end and is stitched down each side of it: 2 \u00d7 ${fmt(drop2)} of tail + ${fmt(tw3*0.6)} across the handle + 4 \u00d7 thickness ${fmt(4*t)} = ${fmt(tl3)}.\n`+
                `The handle is never stitched to the bag \u2014 the tab holds it, and the handle can swing.`+
                tipNote(tw3, S.strap.tip, 'both tails')}));
    }
    if(ends === 'ring'){
      const rw3 = Math.min(tailW + 4, 46), drop3 = Math.max(20, Hd.attach*0.6), rl = 2*drop3 + 16;
      const rd3 = [{t:'cut', d:(tipStrip(rl, rw3, S.strap.tip, true)||{cut:rr(0,0,rl,rw3,3)}).cut},
        {t:'wrap', x:rl/2 - Math.max(6,3*t+4), y:0, w:2*Math.max(6,3*t+4), h:rw3, label:'ROUND THE RING BAR'},
        {t:'fold', d:vLine(rl/2,0,rw3), label:'FOLD ROUND THE RING'},
        {t:'text', x:rl*0.22, y:rw3*0.62, s:'RING TAB', size:4.4, anchor:'middle', dim:true}];
      attachOn(rd3, rl-drop3, 0, drop3, rw3, 'handlering', 'Handle ring tab to panel',
               {axis:'x', far:'end', fix:Hd.fix, rivetSpec:rivetSpecAt(Hd)});
      rd3.push({t:'text', x:rl-drop3, y:rw3+4.4, s:'FOLD FIRST, THEN PRICK BOTH TAILS TOGETHER', size:3.2, anchor:'start', mark:true});
      pieces.push(P({key:'handleRing', name:'Handle ring tab', mat:'Leather', w:rl, h:rw3, qty:4, draw:rd3, seam:2*rl,
        dims:[D_('h',0,rl,-9,fmt(rl)), D_('v',0,rw3,-9,fmt(rw3))],
        formula:`2 \u00d7 tail ${fmt(drop3)} + 16 mm to wrap the ring bar = ${fmt(rl)}.\n`+
                `The handle end folds through the ring and is stitched back on itself, so the handle swings and the panel only ever sees a straight pull.`+
                tipNote(rw3, S.strap.tip, 'both tails')}));
      HW.push({q:4, n:`Triangle or D-ring, ${fmt(tailW)} inside width \u2014 handle ends`});
    }
    if(Hd.fix !== 'stitch') HW.push({q:rivetCount(rivetSpecAt(Hd))*4, n:`Double-cap rivets \u2014 handle tails`});
    // the steps have always said to back each anchor; here is the piece to do it with
    const hf3 = handleFoot(), rw = hf3.w + 14, rh = hf3.h + 14;
    pieces.push(P({key:'handleReinf', name:'Handle anchor reinforcement', mat:'Leather', w:rw, h:rh, qty:4, seam:0,
      draw:[{t:'cut', d:rr(0,0,rw,rh,4)},
            {t:'mark', d:rr(7,7,hf3.w,hf3.h,1.5)},
            {t:'text', x:rw/2, y:rh/2+2, s:'BACK THE HANDLE', size:4, anchor:'middle', dim:true},
            {t:'text', x:rw/2, y:rh-2.5, s:'SKIVE THE EDGES TO NOTHING', size:3.2, anchor:'middle', mark:true}],
      dims:[D_('h',0,rw,-9,fmt(rw)), D_('v',0,rh,-9,fmt(rh))],
      formula:`One behind each of the four ${ends==='plain'?'handle tails':'tabs'}: the footprint ${fmt(hf3.w)} \u00d7 ${fmt(hf3.h)} plus 7 mm all round.\n`+
              `A top handle carries the whole bag through two small boxes of stitching. Without a patch behind them the panel stretches and then tears.`}));
  }

  if(S.cards.on){
    // a card is 85.6 across whatever the bag is: a wallet narrower than the stack is a wallet
    // the cards do not go in, and that is a decision about W, not about the slots
    const need = cardSlotW() + 2*sa;
    if(need > W + 0.5)
      WARN.push(`The card stack is ${fmt(need)} across and the panel is only ${fmt(W)}. A card is ${fmt(CARD_W)} wide, so this bag has to be at least ${fmt(CARD_W + 3 + 2*sa)} across before the slots will fit \u2014 widen it, or narrow the slots.`);
  }
  S.elements.forEach(el=>{
    const bb = rotBox(el.w, elFootH(el), (el.rot||0) + (el.face==='gusset' ? 90 : 0));
    const across = el.face==='gusset' ? D : W, down = H;
    if(Math.abs(el.x) + bb.w/2 > across/2 + 0.5 || el.y + bb.h > down + 0.5)
      WARN.push(`${ELTYPES[el.type].name} ${el.id} runs off the ${FACENAME[el.face].toLowerCase()} panel once turned ${Math.round(el.rot||0)}\u00b0 \u2014 it needs ${fmt(bb.w)} \u00d7 ${fmt(bb.h)} and the panel gives ${fmt(across)} \u00d7 ${fmt(down)}.`);
  });

  /* --- added elements --- */
  pieces.push(...elementPieces(sa, t));

  /* --- reinforcements --- */
  if(S.top==='flap' && S.flap.closure!=='none' && S.thickness < 2.2){
    pieces.push(P({key:'reinf', name:'Closure reinforcement', mat:'Leather', w:40, h:40, qty:2, seam:0,
      draw:[{t:'cut', d:rr(0,0,40,40,6)},{t:'hole',x:20,y:20,r:3,label:'HARDWARE'},{t:'text',x:20,y:35,s:'REINFORCE',size:4.6,anchor:'middle',dim:true}],
      dims:[D_('h',0,40,-9,fmt(40)), D_('v',0,40,-9,fmt(40))],
      formula:`Leather under ${fmt(2.2)} will stretch around a turnlock or snap. Skive and glue a 40 \u00d7 40 patch behind each fitting.`}));
  }
  if(S.flap.closure==='turnlock' && S.top==='flap'){ HW.push({q:closureN(), n:'Turnlock / twist clasp'}); }
  if(S.flap.closure==='stud' && S.top==='flap'){ HW.push({q:closureN(), n:'Sam Browne stud, 10\u201312 mm head'}); }
  if(S.flap.closure==='magnet' && S.top==='flap'){ HW.push({q:closureN(), n:'Magnetic snap, 14\u201318 mm'}); }
  if(S.flap.closure==='strap' && S.top==='flap'){ HW.push({q:closureN(), n:'Buckle for the flap strap'}); }
  if(S.top !== 'flap' && S.elements.some(e=>e.face === 'top'))
    WARN.push(`The top face is the part of the flap that lies over the mouth, and this bag has no flap \u2014 anything you put there is cut but has nowhere to go. Move it to the back panel or the gusset.`);
  if(S.strap.type!=='none' && S.strap.tabFix!=='stitch'){
    const spots = S.strap.type==='handles' ? 4 : 2;
    HW.push({q:strapRivets()*spots, n:`Double-cap rivets, post about ${fmt(Math.ceil((S.thickness*2+1)*2)/2)} for a ${fmt(S.thickness*2)} stack`});
  }
  S.elements.forEach(el=>{
    const cnt = el.mirror ? 2 : 1;
    if(el.type==='tab'){ HW.push({q:cnt, n:`D-ring or rectangle ring, ${fmt(el.w)} inside width \u2014 for tab ${el.id}`}); }
    if(el.type==='snap'){ HW.push({q:cnt, n:`Magnetic snap or stud \u2014 element ${el.id}`}); }
    if(el.type==='buckle'){ HW.push({q:cnt, n:`Buckle, ${fmt(el.w)} inside width \u2014 tab ${el.id}`}); }
    if(el.type==='eyelet'){ HW.push({q:cnt, n:`Eyelet, ${fmt(el.w)} \u2014 element ${el.id}`}); }
    if(el.type==='foot'){ HW.push({q:cnt, n:`Bag foot / stud \u2014 element ${el.id}`}); }
    if(el.type==='feet'){ HW.push({q:feetCount(el)*cnt, n:`Bag feet / studs \u2014 set ${el.id}`}); }
    if(!ELTYPES[el.type].noFix && (el.fix==='rivet' || el.fix==='both')){ HW.push({q:rivetCount(rivetSpecAt(el))*cnt, n:`Double-cap rivets \u2014 ${ELTYPES[el.type].name.toLowerCase()} ${el.id}`}); }
  });
  HW.push({q:1, n:`Thread \u2014 polyester or linen, ${S.thickness>=2?'0.6\u20130.8 mm':'0.45\u20130.6 mm'}`});

  /* --- stats --- */
  let lea=0, lin=0, seam=0, edge=0;
  pieces.forEach(p=>{
    if(p.diagram) return;             // a diagram is not leather and is not cut
    const a = p.w*p.h*p.qty;
    if(p.mat==='Lining') lin+=a; else if(p.mat!=='Foam') lea+=a;
    seam += (p.seam||0)*p.qty;
    edge += 2*(p.w+p.h)*p.qty;
  });
  const waste = 1 + S.waste/100;
  const stitchPitch = S.stitch.pitch;
  const plan = Object.keys(SEAMPLAN).map(k=>SEAMPLAN[k]).sort((a,b)=>b.len*b.pieces - a.len*a.pieces);
  const planHoles = plan.reduce((n,p)=>n + p.holes*p.pieces, 0);
  const planStrikes = plan.reduce((n,p)=>n + p.strikes*p.pieces, 0);
  const planLen = plan.reduce((n,p)=>n + p.len*p.pieces, 0);
  const stats = {
    leather: lea*waste, lining: lin*waste, rawLeather: lea,
    seam, thread: planLen*3.5, stitches: planHoles, edge,
    pitch: stitchPitch, spi: IN/stitchPitch, plan, planStrikes, planLen,
    pieces: pieces.reduce((n,p)=>n + (p.diagram?0:p.qty), 0),
    unique: pieces.filter(p=>!p.diagram).length
  };

  /* --- assembly order --- */
  const st = [];
  st.push(`Cut every piece with the grain arrows running the same way \u2014 leather stretches across the backbone, so a strap cut the wrong way will grow.`);
  if(S.thickness>=2) st.push(`Skive all seam allowances down to about ${fmt(S.thickness/2)} where two pieces overlap, and skive the fold lines from the flesh side.`);
  st.push(`Scribe stitch lines ${fmt(sa)} in from the cut edge with a wing divider. Every run below is already worked out to a whole number of holes \u2014 start each one at its centre mark and prick outward to both ends so the two halves stay even.`);
  if(S.top==='flap' && S.flap.closure!=='none') st.push(`Set the ${CLOSURE_LABEL().toLowerCase()} in the <b>flap and front panel now</b>, while both are still flat \u2014 you cannot reach the back of either once the bag is closed up.`);
  STEPS.forEach(s=>st.push(s));
  if(S.pocket.on) st.push(`Fold and stitch the pocket's top edge, then stitch the pocket to the front panel ${fmt(S.pocket.y)} up from the base seam.`);
  if(S.cards.on) st.push(`Build the card slot stack on a common bottom edge \u2014 the deepest slot (${fmt(cardStackH())}) at the back, each one in front of it ${fmt(S.cards.reveal)} shallower, down to ${fmt(cardSlotH(1))} at the front. Because they share that edge the side holes all fall on the same grid and go through in one run.`);
  if(S.lined && (S.slip.on || S.zipPkt.on)) st.push(`Set the interior pockets into the lining panels before the lining goes anywhere near the shell.`);
  if(S.construction==='gusset'){
    st.push(`Notch the gusset at the marks, then glue and stitch it to the <b>back</b> panel first, working from the base centre outward so the notches stay matched.`);
    st.push(`Repeat on the front panel. Ease the gusset around the corner radius \u2014 do not stretch it, or the front will end up shorter than the back.`);
  }
  if(S.construction==='boxed'){
    st.push(`Fold at the base centre line, stitch both side seams, then stitch each corner cut-out closed to box the base out to ${fmt(D)}.`);
  }
  if(S.construction==='fold'){
    st.push(`Crease the wrap panel at every fold line, then stitch the side gussets in \u2014 front edge first, then around the base, then the back.`);
  }
  if(S.top==='flap' && S.construction!=='fold') st.push(`Stitch the flap to the back panel along the line ${fmt(S.flap.attach)} down from the rim, ${fmt(sa)} from the flap's top edge.`);
  const fixWord = S.strap.tabFix==='rivet' ? `set ${strapRivets()} rivets per end`
                : S.strap.tabFix==='both' ? `set ${strapRivets()} rivets per end, then stitch the box around them`
                : 'stitch the box';
  if(S.strap.type!=='none' && S.strap.type!=='handles') st.push(S.strap.attach==='swivel'
    ? `Fold each D-ring tab around its ring, lay the tails on the gusset ${fmt(S.strap.anchorY)} down from the rim, and ${fixWord}. The footprint and its marks are drawn on both the gusset and the tab.`
    : `Lay the strap ends on the gusset ${fmt(S.strap.anchorY)} down from the rim over ${fmt(Math.max(18,S.strap.tabLen))} of strap, and ${fixWord} \u2014 the footprint is drawn on both pieces.`);
  if(S.strap.type==='handles'){
    const Hd2 = S.handles;
    const hd2N = rivetCount(rivetSpecAt(Hd2));
    const hw2 = Hd2.fix==='rivet' ? `set ${hd2N} rivets per tail`
              : Hd2.fix==='both'  ? `set ${hd2N} rivets per tail, then stitch the box round them`
              : 'stitch the box';
    st.push(Hd2.build==='rolled'
      ? `Roll and flatten the handle ends first, then glue an anchor reinforcement behind each one on the inside of the panel and ${hw2}. The flattened tail is ${fmt(handleTailW())} wide \u2014 wider than the handle itself \u2014 and the footprint drawn on the panel is that width, not the handle's.`
      : `Crease each handle at its two bend marks, glue an anchor reinforcement behind every tail on the inside of the panel, then set the tails ${fmt(Hd2.span)} apart and ${fmt(Hd2.anchorY)} down from the rim, front and back, and ${hw2}. The box goes through handle, panel and patch together.`);
    if(Hd2.ends!=='plain') st.push(`The handles are not stitched to the bag at all: ${Hd2.ends==='tab'?'a tab wraps each end and is stitched down either side of it':'each end folds through a ring on its own tab'}, so the handle can swing and the panel only ever sees a straight pull.`);
  }
  if(S.strap.type==='pack') st.push(`Glue an anchor reinforcement behind each of the four strap footprints on the inside of the back panel, then ${fixWord} through strap, panel and patch together. The same footprint is drawn on both ends of every strap.`);
  if(rollOn()){
    const turns = Math.max(1, Math.round(S.roll.turns)), ext = rollExt();
    st.push(`Do not treat the roll as a lid. ${S.construction==='gusset'?'The panels and the gusset both carry on':'The whole body carries on'} ${fmt(ext)} past the rim as one tube \u2014 stitch the side seams the whole way up to the mouth`+(S.construction==='gusset'?`, and keep the gusset at full mouth width through the roll so it will fold flat.`:`, and pleat the corners in as you roll.`));
    if(S.roll.stiffener) st.push(`Slide a mouth stiffener into the fold at the mouth, front and back, and catch it with the second row. That strip is what keeps the roll square.`);
    if(S.roll.closure!=='none') st.push(`Catch a roll-top tab in the mouth hem at each end before you close that row, and set an anchor on each side of the bag ${fmt(rollAnchorY())} down from the rim. Roll the mouth down ${turns} turns of ${fmt(ext/turns)} and ${S.roll.closure==='clip'?'hook':'clip'} it to the anchors \u2014 the last turn should land just above the rim.`);
  }
  if(S.lined) st.push(`Drop the lining in, turn the ${rollOn()?'mouth':'rim'} ${S.edge==='turned'?fmt(S.turn)+' to the inside':'and stitch it flush'}, and stitch around the top.`);
  if(S.elements.length) st.push(`Set the added elements before the bag is closed up: ${S.elements.map(e=>ELTYPES[e.type].name.toLowerCase()+' '+e.id+' on the '+FACENAME[e.face].toLowerCase()+' at '+fmt(e.y)+' down').join('; ')}. Each footprint is drawn on the panel at full size.`);
  st.push(`Prick every mating pair with the <b>same</b> hole count \u2014 the stitch plan lists them. Punch the gusset and the panel together where you can, or mark one from the other.`);
  st.push(`Bevel, sand, dye and burnish every raw edge \u2014 about ${fmtLen(edge*0.45)} of it on this bag.`);

  return {pieces, hw:HW, warn:WARN, steps:st, stats, plan};
}
