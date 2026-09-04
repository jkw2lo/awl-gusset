"use strict";
/* ============================================================
   AWL & GUSSET \u2014 parametric flat-pattern drafter
   All internal geometry is millimetres. y grows downward.
   ============================================================ */

/* ---------- state ---------- */
const S = {
  grid:true,                  // the 10 mm grid behind the elevations
  units:'mm',
  construction:'gusset',      // gusset | boxed | fold
  W:270, H:190, D:95,
  corner:22,                  // bottom corner radius (gusset mode)
  topR:0,                     // top corner radius - what makes a belt bag look like one
  taper:20,                   // gusset narrows by this much at the top
  squareness:0,               // 0 = a true ellipse, 100 = nearly a rectangle with soft corners
  squarenessTop:0,            // the same for the top half, so the base can square up alone
  shoulder:70,                // how far down the taper runs before the sides go parallel
  bellows:40,                 // extra depth folded into an accordion gusset
  gussetStyle:'wrap',         // wrap | split | base
  thickness:2.0,              // leather thickness, mm
  sa:5,                       // seam allowance at machine/hand seams
  entasis:0,                  // outward swell on long straight cut edges, at mid-span
  edge:'raw',                 // raw (burnished) | turned (folded & glued)
  turn:9,                     // turn-under allowance when edge = turned
  lined:true,
  top:'flap',                 // open | flap | zip | magnet | roll
  flap:{drop:95, attach:45, style:'round', radius:28, closure:'turnlock', cInset:24, lined:true,
        closures:1, cSpan:150,
        pull:{on:false, w:26, attach:30, drop:34, tip:'round', r:3, fix:'stitchbox',
              rivetPat:'across2', rivetInset:8, rivetPitch:11, rivetEdge:6, rivets:2}},
  roll:{turns:3, turn:60, closure:'clip', stiffener:true, anchorY:120},
  draw:{n:10, size:8, drop:26, style:'eyelet', toggle:true},
  pocket:{on:false, w:165, h:105, x:0, y:22, radius:8, topFold:14},
  slip:{on:true, w:150, h:120, x:0, y:55, face:'back'},
  zipPkt:{on:false, w:160, h:150, y:40, face:'back'},
  cards:{on:false, n:3, w:88.6, h:40, reveal:11, x:0, y:45, face:'back'},
  strap:{type:'adjust', width:20, drop:560, adjust:120, build:'two', attach:'swivel', anchorY:16, anchorX:0,
         tabLen:38, tabRot:0, tabFix:'stitch', rivets:2, rivetPat:'across2', rivetInset:11, rivetPitch:13, rivetEdge:6.5,
         packSpan:150, curve:0, pad:false, padW:70, padThick:10, tip:'round'},
  handles:{on:false, span:130, rise:85, width:22, attach:35, taper:0,
           build:'layered', core:9, ends:'plain', anchorY:16, fix:'stitch', rivets:2,
           rivetPat:'across2', rivetInset:11, rivetPitch:13, rivetEdge:6.5},
  zip:{style:'rim', panelH:35, gauge:5, wrap:32, tabs:true},
  stitch:{show:true, pitch:3.85, prongs:4, style:'slit', lean:'right', slit:1.7, reg:10},
  elements:[], elSeq:0,
  designName:'Untitled', designId:null,
  sheet:'A4', waste:30, zoom:'fit', dims:true, showLining:false, counts:true, pv:'sheets',
  notes:true,                 // the red instruction notes on the pattern
  /* A shape she drew herself. Points are stored NORMALISED, 0 to 1 of the bounding box, so
     W and H stay what they are everywhere else - the size of the bag - and the profile stays
     what it is: the shape. Moving a point re-reads the box and writes W and H back, so the
     two never disagree. `m` marks the two ends of the mouth; `skip` is a point the outline
     goes straight past, which is how a five-point star becomes a pentagon. */
  free:{ pts:freeShape('rounded'), sym:false },   // sym: drag a point and its mirror moves too
  arrange:{},                 // pieces the maker has placed by hand: key -> {s,x,y,r}
  labels:{},                  // notes the maker has moved or struck off: key -> {dx,dy} | {off:true}
  dropNotes:{},               // assembly diagrams taken off the pattern: key -> true

  view3d:{yaw:32, pitch:18}
};

const PRESETS = {
  'crossbody':{ label:'Flap crossbody (start here)', s:{squareness:0,squarenessTop:0,zip:{style:'rim',panelH:35,gauge:5,wrap:32,tabs:true},topR:0,construction:'gusset',W:270,H:190,D:95,corner:22,taper:20,gussetStyle:'wrap',thickness:2,sa:5,edge:'raw',lined:true,top:'flap',
      flap:{drop:95,attach:45,style:'round',radius:28,closure:'turnlock',cInset:24,lined:true},
      pocket:{on:false,w:165,h:105,x:0,y:22,radius:8,topFold:14}, slip:{on:true,w:150,h:120,x:0,y:55}, zipPkt:{on:false,w:160,h:150,y:40}, cards:{on:false,n:3,reveal:16,x:0,y:45},
      strap:{type:'adjust',width:20,drop:560,adjust:120,build:'two',attach:'swivel',anchorY:16,tabLen:38,tabFix:'stitch',rivets:2,packSpan:150}, handles:{on:false,span:130,rise:85,width:22,attach:35,taper:0,build:'layered',core:9,ends:'plain',anchorY:16,fix:'stitch',rivets:2}} },
  'tote':{ label:'Boxed-corner tote', s:{squareness:0,squarenessTop:0,topR:0,construction:'boxed',W:330,H:300,D:130,thickness:2.4,sa:6,edge:'turned',turn:10,lined:true,top:'magnet',
      pocket:{on:false,w:190,h:150,x:0,y:40,radius:0,topFold:16}, slip:{on:true,w:170,h:140,x:0,y:70}, zipPkt:{on:false,w:170,h:150,y:45}, cards:{on:false,n:3,reveal:16,x:0,y:45},
      strap:{type:'handles',width:24,drop:300,adjust:0,build:'two',attach:'sewn',anchorY:26,tabLen:40,tabFix:'stitch',rivets:2,packSpan:150}, handles:{on:true,span:150,rise:110,width:24,attach:40,taper:6,build:'layered',core:9,ends:'plain',anchorY:26,fix:'stitch',rivets:2}} },
  'pouch':{ label:'Zip pouch', s:{squareness:0,squarenessTop:0,topR:0,construction:'boxed',W:210,H:130,D:60,thickness:1.6,sa:5,edge:'raw',lined:true,top:'zip',
      zip:{style:'rim',panelH:32,gauge:3,wrap:0,tabs:true}, pocket:{on:false,w:120,h:80,x:0,y:15,radius:6,topFold:12}, slip:{on:false,w:120,h:90,x:0,y:30}, zipPkt:{on:false,w:120,h:100,y:30}, cards:{on:false,n:3,reveal:16,x:0,y:45},
      strap:{type:'none',width:14,drop:0,adjust:0,build:'single',attach:'sewn',anchorY:12,tabLen:30,tabFix:'stitch',rivets:2,packSpan:150}, handles:{on:false,span:100,rise:60,width:16,attach:25,taper:0,build:'layered',core:9,ends:'plain',anchorY:16,fix:'stitch',rivets:2}} },
  /* A bifold is the folded wrap with no gusset at all: one blank creased down the middle,
     card slots on one half and a note pocket on the other. D is 0 on purpose - a wallet has
     no side gussets, and the moment D goes above 0 the drafter starts cutting them. */
  'bifold':{ label:'Bifold wallet', s:{squareness:0,squarenessTop:0,topR:0,construction:'fold',W:108,H:95,D:0,taper:0,thickness:1.4,sa:4,entasis:0,edge:'raw',lined:true,top:'open',
      flap:{drop:0,attach:0,style:'square',radius:0,closure:'none',cInset:24,lined:false},
      pocket:{on:false,w:80,h:60,x:0,y:12,radius:4,topFold:10}, slip:{on:false,w:96,h:72,x:0,y:14,face:'front'},
      zipPkt:{on:false,w:80,h:70,y:20,face:'back'}, cards:{on:false,n:3,w:88.6,h:40,reveal:11,x:0,y:20,face:'back'},
      stitch:{show:true,pitch:3,prongs:4,style:'slit',lean:'right',slit:1.5,reg:10},
      strap:{type:'none',width:14,drop:0,adjust:0,build:'single',attach:'sewn',anchorY:12,tabLen:30,tabFix:'stitch',rivets:2,packSpan:150},
      handles:{on:false,span:100,rise:60,width:16,attach:25,taper:0,build:'layered',core:9,ends:'plain',anchorY:16,fix:'stitch',rivets:2},
      /* A stack of card slots on each half, which is what a bifold is. They are ELEMENTS, so
         either one can be moved, turned, resized, given more or fewer slots, or built the
         other way round - and a third can be dropped in beside them. */
      elements:[
        {id:1,type:'cards',face:'front',x:0,y:16,w:97,h:40,r:0,dep:0,slots:3,reveal:11,build:'pockets',fix:'stitchbox',rivets:2,rivetPat:'across2',rivetInset:11,rivetPitch:13,rivetEdge:6.5,mirror:false,rot:0,open:'top'},
        {id:2,type:'cards',face:'back', x:0,y:16,w:97,h:40,r:0,dep:0,slots:3,reveal:11,build:'pockets',fix:'stitchbox',rivets:2,rivetPat:'across2',rivetInset:11,rivetPitch:13,rivetEdge:6.5,mirror:false,rot:0,open:'top'}
      ], elSeq:2} },
  /* A shape drawn rather than chosen, to show what the free construction is for: the profile
     is a crescent, the gusset wraps everything but the arc between the two mouth marks, and
     every corner of the profile is a notch on both pieces. */
  'moon':{ label:'Crescent moon bag', s:{squareness:0,squarenessTop:0,topR:0,construction:'free',W:300,H:210,D:70,corner:0,taper:0,gussetStyle:'wrap',thickness:2,sa:5,entasis:0,edge:'raw',lined:true,top:'magnet',
      free:{pts:freeShape('crescent')},
      flap:{drop:70,attach:40,style:'round',radius:30,closure:'magnet',cInset:20,lined:true},
      pocket:{on:false,w:120,h:80,x:0,y:20,radius:6,topFold:12}, slip:{on:false,w:120,h:80,x:0,y:30,face:'back'},
      zipPkt:{on:false,w:120,h:100,y:30,face:'back'}, cards:{on:false,n:3,reveal:16,x:0,y:45,face:'back'},
      stitch:{show:true,pitch:3.38,prongs:4,style:'slit',lean:'right',slit:1.6,reg:10},
      strap:{type:'adjust',width:16,drop:560,adjust:100,build:'two',attach:'swivel',anchorY:14,tabLen:34,tabFix:'stitch',rivets:2,packSpan:150},
      handles:{on:false,span:130,rise:85,width:22,attach:35,taper:0,build:'layered',core:9,ends:'plain',anchorY:16,fix:'stitch',rivets:2},
      elements:[], elSeq:0} },
  'daypack':{ label:'Day pack', s:{squareness:0,squarenessTop:0,topR:0,construction:'gusset',W:290,H:390,D:150,corner:35,taper:30,gussetStyle:'wrap',thickness:2.4,sa:6,edge:'raw',lined:true,top:'flap',
      flap:{drop:170,attach:60,style:'round',radius:45,closure:'strap',cInset:35,lined:true},
      pocket:{on:false,w:200,h:150,x:0,y:35,radius:10,topFold:14}, slip:{on:true,w:200,h:200,x:0,y:70}, zipPkt:{on:false,w:180,h:160,y:50}, cards:{on:false,n:3,reveal:16,x:0,y:45},
      strap:{type:'pack',width:38,drop:620,adjust:0,build:'two',attach:'sewn',anchorY:40,tabLen:55,tabFix:'both',rivets:2,packSpan:150,curve:0,pad:true,padW:68,padThick:10},
      handles:{on:false,span:120,rise:70,width:24,attach:35,taper:0,build:'layered',core:9,ends:'plain',anchorY:16,fix:'stitch',rivets:2},
      stitch:{show:true,pitch:4,prongs:4,style:'slit',lean:'right',slit:1.9},
      elements:[{id:1,type:'haul',face:'back',x:0,y:8,w:110,h:26,r:4,dep:0,slots:3,reveal:11,build:'pockets',fix:'stitchbox',rivets:2,rivetPat:'across2',rivetInset:11,rivetPitch:13,rivetEdge:6.5,mirror:false,rot:0,open:'top'}], elSeq:1} },
  'duffle':{ label:'Weekender duffle', s:{topR:0,construction:'barrel',W:520,H:280,D:280,corner:0,taper:0,shoulder:0,bellows:40,squareness:70,squarenessTop:15,gussetStyle:'wrap',thickness:2.6,sa:6,edge:'raw',lined:true,top:'zip',
      zip:{style:'rim',panelH:35,gauge:8,wrap:0,tabs:true},
      flap:{drop:95,attach:45,style:'round',radius:28,closure:'none',cInset:24,lined:true},
      pocket:{on:false,w:230,h:150,x:0,y:40,radius:8,topFold:16}, slip:{on:true,w:220,h:170,x:0,y:60,face:'back'},
      zipPkt:{on:false,w:180,h:160,y:50,face:'back'}, cards:{on:false,n:3,reveal:16,x:0,y:45,face:'back'},
      strap:{type:'handles',width:26,drop:560,adjust:0,build:'two',attach:'sewn',anchorY:70,tabLen:44,tabFix:'both',rivets:2,packSpan:150,curve:0,pad:false,padW:70,padThick:10,tip:'round'},
      handles:{on:true,span:190,rise:120,width:26,attach:70,taper:6,build:'layered',core:9,ends:'plain',anchorY:70,fix:'both',rivets:2},
      stitch:{show:true,pitch:4.5,prongs:4,style:'slit',lean:'right',slit:2},
      elements:[
        {id:1,type:'tab',face:'gusset',x:0,y:34,w:24,h:38,r:2,dep:0,slots:3,reveal:11,build:'pockets',fix:'stitchbox',rivets:2,rivetPat:'across2',rivetInset:11,rivetPitch:13,rivetEdge:6.5,mirror:false,rot:0,open:'top'}], elSeq:1} },
};

/* ---------- units ---------- */
const IN = 25.4;
function frac16(v){
  const neg = v<0; v = Math.abs(v);
  let whole = Math.floor(v), s = Math.round((v-whole)*16);
  if(s===16){whole++; s=0}
  let out;
  if(s===0) out = String(whole);
  else{
    let d=16; while(s%2===0){s/=2; d/=2}
    out = (whole? whole+' ' : '') + s+'/'+d;
  }
  return (neg?'-':'')+out;
}
/** Format a mm value in the active display unit. */
function fmt(mm, opt){
  opt = opt||{};
  if(S.units==='in'){
    const v = mm/IN;
    if(opt.raw) return (Math.round(v*100)/100).toFixed(2);
    return frac16(v) + (opt.unit===false? '' : '"');
  }
  const v = Math.round(mm*10)/10;
  const t = (Math.abs(v%1)<0.05) ? String(Math.round(v)) : v.toFixed(1);
  return opt.unit===false? t : t+' mm';
}
function fmtArea(mm2){
  const sqft = mm2/92903.04, sqdm = mm2/10000;
  return sqft.toFixed(2)+' sq ft  \u00b7  '+sqdm.toFixed(1)+' dm\u00b2';
}
function fmtLen(mm){
  if(S.units==='in'){ const ft=mm/IN/12; return ft>=1? ft.toFixed(1)+' ft' : frac16(mm/IN)+'"'; }
  return mm>=1000? (mm/1000).toFixed(2)+' m' : Math.round(mm)+' mm';
}
const R1 = v => Math.round(v*10)/10;
/** Stitch pitch is always shown in mm - irons are made in mm, and the drift lives in the 3rd decimal. */
const fmtPitch = v => (Math.round(v*1000)/1000) + ' mm';

/* ---------- dotted-path state access ---------- */
function get(p){ return p.split('.').reduce((o,k)=>o==null?o:o[k], S) }
function set(p,v){
  const ks = p.split('.'); let o=S;
  for(let i=0;i<ks.length-1;i++) o=o[ks[i]];
  o[ks[ks.length-1]] = v;
}

/* ---------- rivet arrangements ----------
   These live above the control schema because the schema is GENERATED from them: one table
   of arrangements, one block of controls, and every part of the bag that can be riveted gets
   the same four fields rather than the bare count it used to make do with. */
const RIVET_DEF = {inset:11, pitch:13, edge:6.5};
/* The arrangements worth having, named the way you would ask for them at the bench.
   "Across" runs the short way over the tab; "stacked" runs down its length. A triangle
   points at the free end and an inverted one points back into the bag - which one you want
   depends entirely on which way the pull comes. */
const RIVET_PATS = {
  one:     {name:'One',                  rows:[[0]]},
  across2: {name:'Two, across',          rows:[[-1,1]]},
  along2:  {name:'Two, stacked',         rows:[[0],[0]]},
  across3: {name:'Three, across',        rows:[[-1,0,1]]},
  along3:  {name:'Three, stacked',       rows:[[0],[0],[0]]},
  tri:     {name:'Three, triangle',      rows:[[0],[-1,1]]},
  triInv:  {name:'Three, inverted',      rows:[[-1,1],[0]]},
  quad:    {name:'Four, square',         rows:[[-1,1],[-1,1]]},
  diamond: {name:'Four, diamond',        rows:[[0],[-1,1],[0]]},
  five:    {name:'Five, like a die',     rows:[[-1,1],[0],[-1,1]]},
  six:     {name:'Six, three by two',    rows:[[-1,1],[-1,1],[-1,1]]}
};
/* The arrangement an old design meant when all it said was a NUMBER. Every entry has to hold
   that many rivets or the count quietly changes under her: five used to read back as the
   diamond, which is four, and a design saved with five rivets came back with four. */
const RIVET_BY_N = {1:'one', 2:'across2', 3:'tri', 4:'quad', 5:'five', 6:'six'};
/** The rivet controls for whoever is carrying them. `pfx` is the dotted path of the object
    (`strap`, `handles`); `show` is when that object is riveted at all. Adding the block to a
    new part is one line, and the part then behaves like every other riveted part. */
function rivetFields(pfx, show, insetLabel){
  const at = s2 => pfx.split('.').reduce((o,x)=>o==null?o:o[x], s2);
  const rows = s2 => {
    const o = at(s2), pat = (o && RIVET_PATS[o.rivetPat]) ? o.rivetPat
            : (RIVET_BY_N[Math.max(1, Math.min(6, Math.round((o&&o.rivets) || 2)))] || 'across2');
    return RIVET_PATS[pat].rows;
  };
  return [
    {p:pfx + '.rivetPat', t:'sel', label:'Rivet arrangement', show,
      opts:Object.keys(RIVET_PATS).map(k=>[k, RIVET_PATS[k].name])},
    {p:pfx + '.rivetInset', t:'dim', label:insetLabel || 'First row in from the end',
      min:3, max:60, show},
    {p:pfx + '.rivetPitch', t:'dim', label:'Between the rows', min:5, max:60,
      show:s2=>show(s2) && rows(s2).length > 1},
    {p:pfx + '.rivetEdge', t:'dim', label:'In from the side edge', min:2.5, max:30, step:0.5,
      show:s2=>show(s2) && rows(s2).some(r=>r.length > 1)}
  ];
}

/* ---------- control schema ---------- */
const HAS_FLAP = s => s.top==='flap';
const RIV = s => s.strap.type!=='none' && s.strap.type!=='handles' && s.strap.tabFix!=='stitch';
const HAS_CL = s => s.top==='flap' && s.flap.closure!=='none';
const PULL = s => HAS_CL(s) && s.flap.pull.on;
const IS_G = s => s.construction==='gusset';
const IS_FREE = s => s.construction==='free';
const MODULES = [
  {id:'designs', title:'Designs', open:false, custom:'designs', fields:[]},
  {id:'body', title:'Body', open:true, fields:[
    {p:'construction', t:'sel', label:'Construction', opts:[
      ['gusset','Front + back + gusset'],['boxed','One-piece, boxed corners'],
      ['bucket','Round base, wrapped body'],['barrel','Barrel \u2014 round ends, tube body'],
      ['fold','Folded wrap (clutch)'],['free','A shape you draw']]},
    {p:'W', t:'dim', label:'Width', min:60, max:600},
    {p:'H', t:'dim', label:'Height', min:60, max:520},
    {p:'D', t:'dim', label:'Depth', min:0, max:520},
    {p:'corner', t:'dim', label:'Bottom corner radius', min:0, max:120, show:IS_G},
    {p:'topR', t:'dim', label:'Top corner radius', min:0, max:120,
      show:s=>s.construction==='gusset' && s.top!=='flap' && s.top!=='roll'},
    {p:'taper', t:'dim', label:'Gusset taper (narrower at top)', min:0, max:120, show:IS_G},
    {p:'gussetStyle', t:'sel', label:'Gusset cut', show:IS_G, opts:[
      ['wrap','One wrap-around piece'],['split','Two halves, seam at base'],
      ['base','Separate base + 2 sides'],['bellows','Accordion, one piece']]},
    {p:'shoulder', t:'dim', label:'Taper finishes this far down', min:0, max:400,
      show:s=>s.construction==='gusset' && s.taper>0},
    {p:'bellows', t:'dim', label:'Extra depth in the pleat', min:10, max:160,
      show:s=>s.construction==='gusset' && s.gussetStyle==='bellows'},
    {p:'top', t:'sel', label:'Top / closure', opts:[
      ['flap','Flap'],['zip','Zip'],['magnet','Magnetic snap'],['draw','Drawstring'],['roll','Roll top'],['open','Open top']]},
    {p:'squareness', t:'int', label:'Squareness of the base', min:0, max:100,
      show:s=>s.construction==='bucket'||s.construction==='barrel'},
    {p:'squarenessTop', t:'int', label:'Squareness of the top', min:0, max:100,
      show:s=>s.construction==='barrel'},
    {p:'__sq', t:'hint', show:s=>s.construction==='barrel'||s.construction==='bucket',
      text:'At 0 it is a true ellipse. Square the base up and the bag stands on its own and stops rolling; leave the top round and you get the arch a duffle has \u2014 flat underneath, curved over the top.'},
    {p:'__bk', t:'hint', show:s=>s.construction==='bucket',
      text:'A round base and a body wrapped round it, seamed at both sides. Width and depth are the base\u2019s two axes \u2014 make them equal for a true round bottom.'}
  ]},
  {id:'draw', title:'Drawstring', open:true, show:s=>s.top==='draw', fields:[
    {p:'draw.style', t:'sel', label:'How the cord runs', opts:[
      ['eyelet','Through eyelets round the mouth'],['channel','Through a leather channel']]},
    {p:'draw.n', t:'int', label:'How many eyelets', min:4, max:24, show:s=>s.draw.style==='eyelet'},
    {p:'draw.size', t:'dim', label:'Eyelet inside diameter', min:4, max:16, show:s=>s.draw.style==='eyelet'},
    {p:'draw.drop', t:'dim', label:'Down from the rim', min:10, max:120},
    {p:'draw.toggle', t:'bool', label:'Leather toggle on the cord ends'},
    {p:'__dw', t:'hint', text:'Eyelets are set in pairs either side of a seam so the cord pulls the mouth into even gathers. An odd count puts one on a seam, which is exactly where the leather is thickest.'}
  ]},
  {id:'roll', title:'Roll top', open:true, show:s=>s.top==='roll', fields:[
    {p:'roll.turns', t:'int', label:'Turns in the roll', min:1, max:6},
    {p:'roll.turn', t:'dim', label:'Depth of each turn', min:25, max:140},
    {p:'roll.stiffener', t:'bool', label:'Stiffener strip in the mouth'},
    {p:'roll.closure', t:'sel', label:'Closure', opts:[
      ['clip','G-hooks onto side D-rings'],['buckle','Side-release buckles'],
      ['strap','A strap over the top'],['none','None \u2014 tuck it under the straps']]},
    {p:'roll.anchorY', t:'dim', label:'Anchor down from the rim', min:20, max:320, show:s=>s.roll.closure!=='none'},
    {p:'__rt', t:'hint', text:'The whole tube carries on above the rim \u2014 panels and gusset both grow, the side seams run right up to the mouth, and the gusset stops tapering at the rim so the mouth can fold flat.'}
  ]},
  {id:'flap', title:'Flap', open:true, show:HAS_FLAP, fields:[
    {p:'flap.drop', t:'dim', label:'Drop down the front', min:20, max:300},
    {p:'flap.attach', t:'dim', label:'Attachment onto back panel', min:0, max:200, show:s=>s.construction!=='fold'},
    {p:'flap.style', t:'sel', label:'Shape', opts:[['square','Square'],['round','Rounded corners'],['tongue','Tongue / centred tab'],['point','Envelope point']]},
    {p:'flap.radius', t:'dim', label:'Corner radius', min:0, max:140, show:s=>s.flap.style==='round'||s.flap.style==='tongue'},
    {p:'flap.closure', t:'sel', label:'Closure hardware', opts:[['turnlock','Turnlock'],['magnet','Magnetic snap'],['stud','Post / sam browne stud'],['strap','Strap & buckle'],['none','None']]},
    {p:'flap.cInset', t:'dim', label:'Closure inset from tip', min:8, max:120, show:s=>s.flap.closure!=='none'},
    {p:'flap.closures', t:'int', label:'How many closures', min:1, max:2, show:HAS_CL},
    {p:'flap.cSpan', t:'dim', label:'Set them this far apart', min:40, max:420, show:s=>HAS_CL(s)&&s.flap.closures>1},
    {p:'flap.lined', t:'bool', label:'Line the flap'},
    {p:'__r3', t:'rule'},
    {p:'flap.pull.on', t:'bool', label:'Pull tab off the flap tip', show:HAS_CL},
    {p:'flap.pull.w', t:'dim', label:'Tab width', min:10, max:90, show:PULL},
    {p:'flap.pull.attach', t:'dim', label:'How much sits under the flap', min:10, max:90, show:PULL},
    {p:'flap.pull.drop', t:'dim', label:'How far it hangs past the tip', min:8, max:140, show:PULL},
    {p:'flap.pull.tip', t:'sel', label:'Shape of its end', show:PULL, opts:[
      ['square','Square'],['round','Round'],['point','Point'],
      ['english','English point'],['almond','Almond'],['angle','Cut back']]},
    {p:'flap.pull.r', t:'dim', label:'Corner radius', min:0, max:20, step:0.5, show:s=>PULL(s)&&s.flap.pull.tip==='square'},
    {p:'flap.pull.fix', t:'sel', label:'Fixed by', show:PULL, opts:[
      ['stitchbox','Stitched box'],['rivet','Rivets'],['both','Rivets and stitching']]},
    ...rivetFields('flap.pull', s=>PULL(s) && s.flap.pull.fix !== 'stitchbox',
                   'First row in from the free end'),
    {p:'__pt', t:'hint', show:PULL, text:'The lock moves onto the tab and its mate on the body drops with it, so the flap still shuts where it did. The box goes through flap and tab together.'}
  ]},
  {id:'zip', title:'Zip top', open:true, show:s=>s.top==='zip', fields:[
    {p:'zip.style', t:'sel', label:'How the zip is set', opts:[
      ['rim','Tape straight to the rim'],
      ['wrap','Carried down the gusset ends'],
      ['panel','On its own zip panel']]},
    {p:'zip.wrap', t:'dim', label:'How far down the ends', min:10, max:120,
      show:s=>s.zip.style==='wrap' && s.construction==='gusset'},
    {p:'zip.panelH', t:'dim', label:'Zip panel height', min:16, max:90, show:s=>s.zip.style==='panel'},
    {p:'zip.gauge', t:'sel', label:'Zip size', num:true, opts:[
      ['3','#3 \u00b7 pouches and linings'],['5','#5 \u00b7 most bags'],['8','#8 \u00b7 heavy packs']]},
    {p:'zip.tabs', t:'bool', label:'Leather tabs over the tape ends'},
    {p:'__zw', t:'hint', text:'A zip that stops at the corners leaves the gusset ends pinched shut and the mouth will not open flat. Carrying it down the ends splits the top of the gusset so the bag opens right out \u2014 how a dopp kit or a belt bag is built.'}
  ]},
  {id:'pocket', title:'Front pocket', open:true, fields:[
    {p:'pocket.on', t:'bool', label:'Patch pocket on the front'},
    {p:'pocket.w', t:'dim', label:'Width', min:40, max:600, show:s=>s.pocket.on},
    {p:'pocket.h', t:'dim', label:'Height', min:30, max:400, show:s=>s.pocket.on},
    {p:'pocket.x', t:'dim', label:'Offset from centre', min:-140, max:140, show:s=>s.pocket.on},
    {p:'pocket.y', t:'dim', label:'Up from the base seam', min:0, max:300, show:s=>s.pocket.on},
    {p:'pocket.radius', t:'dim', label:'Corner radius', min:0, max:80, show:s=>s.pocket.on},
    {p:'pocket.topFold', t:'dim', label:'Top hem / fold-over', min:0, max:40, show:s=>s.pocket.on},
    {p:'__drag', t:'hint', text:'Drag the pocket on the front elevation to place it \u2014 the numbers follow.'}
  ]},
  {id:'inside', title:'Inside', open:false, fields:[
    {p:'lined', t:'bool', label:'Full lining'},
    {p:'slip.on', t:'bool', label:'Slip pocket'},
    {p:'slip.w', t:'dim', label:'Slip width', min:40, max:500, show:s=>s.slip.on},
    {p:'slip.h', t:'dim', label:'Slip depth', min:40, max:340, show:s=>s.slip.on},
    {p:'slip.y', t:'dim', label:'Down from the rim', min:0, max:300, show:s=>s.slip.on},
    {p:'slip.x', t:'dim', label:'Offset from centre', min:-120, max:120, show:s=>s.slip.on},
    {p:'slip.face', t:'sel', label:'Which side', show:s=>s.slip.on, opts:[['back','Back \u2014 against your body'],['front','Front']]},
    {p:'__r1', t:'rule'},
    {p:'zipPkt.on', t:'bool', label:'Zip pocket (welted)'},
    {p:'zipPkt.w', t:'dim', label:'Zip opening', min:60, max:500, show:s=>s.zipPkt.on},
    {p:'zipPkt.h', t:'dim', label:'Bag depth', min:60, max:340, show:s=>s.zipPkt.on},
    {p:'zipPkt.y', t:'dim', label:'Window down from the rim', min:10, max:300, show:s=>s.zipPkt.on},
    {p:'zipPkt.face', t:'sel', label:'Which side', show:s=>s.zipPkt.on, opts:[['back','Back \u2014 against your body'],['front','Front']]},
    {p:'__r2', t:'rule'},
    {p:'cards.on', t:'bool', label:'Card slots'},
    {p:'cards.n', t:'int', label:'How many', min:1, max:8, show:s=>s.cards.on},
    {p:'cards.w', t:'dim', label:'Slot width', min:50, max:200, show:s=>s.cards.on},
    {p:'cards.h', t:'dim', label:'Deepest slot covers', min:12, max:60, show:s=>s.cards.on},
    {p:'cards.reveal', t:'dim', label:'Reveal per slot', min:4, max:40, show:s=>s.cards.on},
    {p:'__cd', t:'hint', show:s=>s.cards.on, text:'A card is 85.6 &#xd7; 54. The slots share one bottom edge, so the one that decides whether you can get the back card out is the DEEPEST: cover more than about 44 of a 54 mm card and there is nothing left to pinch. Every slot in front of it is one reveal shallower.'},
    {p:'cards.y', t:'dim', label:'Stack down from the rim', min:0, max:300, show:s=>s.cards.on},
    {p:'cards.x', t:'dim', label:'Offset from centre', min:-120, max:120, show:s=>s.cards.on},
    {p:'cards.face', t:'sel', label:'Which side', show:s=>s.cards.on, opts:[['back','Back \u2014 against your body'],['front','Front']]},
    {p:'__pi', t:'hint', text:'Interior fittings are drawn in place on the panel that carries them \u2014 the lining back panel when the bag is lined, the leather back panel when it is not.'}
  ]},
  {id:'strap', title:'Strap & handles', open:true, fields:[
    {p:'strap.type', t:'sel', label:'Carry', opts:[
      ['adjust','Adjustable shoulder strap'],['fixed','Fixed-length strap'],['pack','Pack straps, a pair'],
      ['handles','Top handles'],['belt','Belt through the loops'],['none','No strap']]},
    {p:'strap.drop', t:'dim', label:'Waist to fit (half the belt)', min:300, max:800, show:s=>s.strap.type==='belt'},
    {p:'strap.packSpan', t:'dim', label:'Straps apart at the top', min:60, max:260, show:s=>s.strap.type==='pack'},
    {p:'strap.width', t:'dim', label:'Strap width', min:8, max:90, show:s=>s.strap.type!=='none'&&s.strap.type!=='handles'},
    {p:'strap.drop', t:'dim', label:'Shoulder drop (longest)', min:200, max:800, show:s=>s.strap.type==='adjust'||s.strap.type==='fixed'},
    {p:'strap.drop', t:'dim', label:'Strap length, each', min:300, max:900, show:s=>s.strap.type==='pack'},
    {p:'strap.adjust', t:'dim', label:'Adjustment range', min:40, max:300, show:s=>s.strap.type==='adjust'},
    {p:'strap.build', t:'sel', label:'Strap build', show:s=>s.strap.type!=='none'&&s.strap.type!=='handles', opts:[
      ['single','Single layer'],['two','Two layers glued back-to-back'],['four','Four-fold (folded edges)']]},
    {p:'strap.attach', t:'sel', label:'Attachment', show:s=>s.strap.type==='adjust'||s.strap.type==='fixed', opts:[
      ['swivel','Swivel snaps onto D-ring tabs'],['sewn','Sewn straight to the gusset']]},
    {p:'strap.anchorY', t:'dim', label:'Attachment down from the rim', min:0, max:160, show:s=>s.strap.type!=='none'&&s.strap.type!=='handles'},
    {p:'strap.anchorX', t:'dim', label:'\u2026 and across, off the vertical edge', min:-120, max:120,
      show:s=>s.strap.type!=='none'&&s.strap.type!=='handles'&&s.strap.type!=='pack'},
    {p:'strap.tabRot', t:'int', label:'Angle of the tab', min:-45, max:45,
      show:s=>s.strap.type!=='none'&&s.strap.type!=='handles'&&s.strap.type!=='pack'},
    {p:'strap.tabFix', t:'sel', label:'Fixed by', show:s=>s.strap.type!=='none'&&s.strap.type!=='handles', opts:[
      ['stitch','Stitching'],['rivet','Rivets'],['both','Rivets and stitching']]},
    ...rivetFields('strap', RIV),
    {p:'__rv', t:'hint', show:RIV, text:'Drag the rivets on the side elevation to place them. On a shaped end the first row is measured from where the shape starts, not from the point \u2014 the leather has run out long before the tip.'},
    {p:'strap.tabLen', t:'dim', label:'Attachment length on the bag', min:16, max:90, show:s=>s.strap.type==='adjust'||s.strap.type==='fixed'||s.strap.type==='pack'},
    {p:'strap.curve', t:'dim', label:'Cut it on a curve (rise)', min:0, max:90, show:s=>s.strap.type==='adjust'||s.strap.type==='fixed'},
    {p:'strap.tip', t:'sel', label:'Shape of the ends', show:s=>s.strap.type!=='none', opts:[
      ['square','Square'],['round','Round'],['point','Point'],
      ['english','English point'],['almond','Almond'],['angle','Cut back']]},
    {p:'strap.pad', t:'bool', label:'Padded, shaped pack straps', show:s=>s.strap.type==='pack'},
    {p:'strap.padW', t:'dim', label:'Width at the shoulder', min:40, max:110, show:s=>s.strap.type==='pack'&&s.strap.pad},
    {p:'strap.padThick', t:'dim', label:'Foam thickness', min:5, max:20, show:s=>s.strap.type==='pack'&&s.strap.pad},
    {p:'__ph', t:'hint', text:'Every attachment is drawn on the body at its real size, with the holes or rivets it needs \u2014 and the matching marks go on the strap piece itself.'}
  ]},
  {id:'handles', title:'Top handles', open:true, show:s=>s.strap.type==='handles', fields:[
    {p:'handles.build', t:'sel', label:'How it is made', opts:[
      ['single','One layer, cut flat'],
      ['layered','Two layers glued back to back'],
      ['folded','Four-fold, edges turned in'],
      ['rolled','Rolled round a cord']]},
    {p:'handles.core', t:'dim', label:'Cord inside it', min:3, max:18, show:s=>s.handles.build==='rolled'},
    {p:'handles.width', t:'dim', label:'Finished width', min:10, max:60},
    {p:'handles.taper', t:'dim', label:'Narrow the grip by', min:0, max:30,
      show:s=>s.handles.build==='single'||s.handles.build==='layered'},
    {p:'handles.span', t:'dim', label:'Anchor span', min:50, max:400},
    {p:'handles.rise', t:'dim', label:'Rise \u2014 the gap for your hand', min:30, max:220},
    {p:'handles.attach', t:'dim', label:'Tail on the bag', min:15, max:120},
    {p:'handles.anchorY', t:'dim', label:'Tail down from the rim', min:0, max:160},
    {p:'handles.ends', t:'sel', label:'How the ends are held', opts:[
      ['plain','Stitched flat to the panel'],['tab','Under a wrap-over tab'],['ring','Through a ring on a tab']]},
    {p:'handles.fix', t:'sel', label:'Fixed by', opts:[
      ['stitch','Stitching'],['rivet','Rivets'],['both','Rivets and stitching']]},
    ...rivetFields('handles', s=>s.handles.fix!=='stitch', 'First row in from the tail end'),
    {p:'__hv', t:'hint', show:s=>s.handles.fix!=='stitch', text:'The handle tails carry their own arrangement \u2014 they are a different shape from a strap tab and rarely want the same one.'},
    {p:'__hb', t:'hint', text:'A rolled handle is a different animal from a flat one: it is one strip wrapped round a cord and stitched underneath, and its tail lands on the bag flattened, so it is wider there than the handle itself. The footprint on the panel follows whichever you pick.'}
  ]},
  {id:'shape', title:'Shape', open:true, show:IS_FREE, custom:'shape', fields:[]},
  {id:'elements', title:'Elements', open:true, custom:'elements', fields:[]},
  {id:'stitch', title:'Stitching', open:true, fields:[
    {p:'stitch.show', t:'bool', label:'Mark the stitch holes'},
    {p:'stitch.pitch', t:'sel', label:'Pricking iron', opts:[
      ['2.45','2.45 mm \u00b7 10 SPI'],['2.7','2.7 mm \u00b7 9 SPI'],['3','3.0 mm \u00b7 8 SPI'],
      ['3.38','3.38 mm \u00b7 7.5 SPI'],['3.85','3.85 mm \u00b7 6.6 SPI'],['4','4.0 mm \u00b7 6.4 SPI'],
      ['4.5','4.5 mm \u00b7 5.6 SPI'],['5','5.0 mm \u00b7 5 SPI'],['6','6.0 mm \u00b7 4.2 SPI']], num:true},
    {p:'stitch.prongs', t:'int', label:'Prongs on the iron', min:2, max:12},
    {p:'stitch.style', t:'sel', label:'Mark as', opts:[['slit','Angled slits'],['dot','Dots']]},
    {p:'stitch.lean', t:'sel', label:'Slant', show:s=>s.stitch.style==='slit', opts:[['right','Leaning right'],['left','Leaning left']]},
    {p:'stitch.slit', t:'dim', label:'Slit length', min:0.8, max:3.5, step:0.1, show:s=>s.stitch.style==='slit'},
    {p:'stitch.reg', t:'sel', label:'Counting ticks every', num:true, opts:[
      ['0','Off'],['10','10 holes'],['15','15 holes'],['20','20 holes'],['25','25 holes']]},
    {p:'__rg', t:'hint', show:s=>s.stitch.reg>0, text:'Counted out from the centre of each run, both ways. Two pieces that meet are pricked to the same count, so the tick numbered 20 on one is the tick numbered 20 on the other \u2014 hold them together and you can see in a second whether they are still in step.'},
    {p:'__pl', t:'hint', text:'Each run is fitted to a whole number of holes, so the real pitch drifts a hair from the iron. Mating pieces always get the same count \u2014 see the stitch plan in the cut list.'}
  ]},
  {id:'mat', title:'Material & allowances', open:true, fields:[
    {p:'thickness', t:'dim', label:'Leather thickness', min:0.6, max:5, step:0.1, oz:true},
    {p:'edge', t:'sel', label:'Edge finish', opts:[['raw','Raw edge \u2014 burnished or painted'],['turned','Turned & glued edge']]},
    {p:'turn', t:'dim', label:'Turn allowance', min:5, max:20, show:s=>s.edge==='turned'},
    {p:'sa', t:'dim', label:'Seam allowance', min:0, max:16},
    {p:'entasis', t:'dim', label:'Entasis on long edges', min:0, max:4, step:0.1},
    {p:'__en', t:'hint', text:'A long straight edge reads hollow once it is sewn, because the stitching pulls it in. Crowning it outward by a hair at mid-span makes the finished edge look straight. 0.5\u20131 mm over 200\u2013300 mm is plenty; the drafter never applies it to a run shorter than 60 mm.'},
    {p:'waste', t:'int', label:'Waste allowance %', min:0, max:80}
  ]}
];

/* Every dimension a grip on the drawing can pull, with the range its own slider uses -
   drag past the end of the slider and the number would have nowhere to go back to. */
const LIM = {};
MODULES.forEach(m => m.fields.forEach(f => {
  if(f.min != null && f.max != null && !LIM[f.p]) LIM[f.p] = [f.min, f.max];
}));

/* What the DRAWING can do with a number is not always what the slider can hold. A corner
   radius is capped at half the shorter side, a flap radius at the drop, a taper at the depth.
   Past that point the number keeps climbing and the shape stops changing - which at the end
   of a pointer reads as a handle that has jammed. One table, evaluated fresh on every frame
   of a drag because the cap moves when the bag does, and read by nothing else: the sliders
   keep their generous range, so a value that is out of reach today comes back when the bag
   grows. */
const GEOLIM = {
  'corner':        s => [0, Math.min(s.W, s.H)/2],
  'topR':          s => [0, Math.min(s.W/2, s.H/2)],
  'taper':         s => [0, s.D*0.7],
  'flap.radius':   s => [0, Math.min(s.W/2, s.flap.drop)],
  'pocket.radius': s => [0, Math.min(s.pocket.w, s.pocket.h)/2]
};
function limOf(p){
  const base = LIM[p] || [0, 1000];
  const g = GEOLIM[p]; if(!g) return base;
  const q = g(S);
  return [Math.max(base[0], q[0]), Math.max(base[0], Math.min(base[1], q[1]))];
}

