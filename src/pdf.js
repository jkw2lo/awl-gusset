/* ============================================================
   PDF
   The print button never worked here and never could: a sandboxed frame cannot open the
   browser's print dialog. So the pattern is written out as a PDF instead, page by page, at
   exactly 1:1 - being able to cut round what comes out of the printer is the whole point of
   the thing.

   It is a vector PDF, not a picture of one: every path in the drawing becomes a path in the
   file. A raster at any honest print resolution would run to tens of megabytes and would
   still look like a photocopy where the stitch holes are.

   The drawing is in millimetres with y growing downward; PDF is in points with y growing up.
   One page matrix fixes both, and the text matrix flips back so the letters are not upside
   down.
   ============================================================ */
const PT = 72/25.4;
/* Base-14 fonts need no embedding, and WinAnsi covers everything the drawing says. */
const WINANSI = {0x2014:151, 0x2013:150, 0x2018:145, 0x2019:146, 0x201c:147, 0x201d:148,
                 0x2020:134, 0x2026:133, 0x00d7:215, 0x00b7:183, 0x00b0:176, 0x00bd:189,
                 0x00bc:188, 0x00be:190, 0x2192:174, 0x2193:118, 0x00e9:233};
function pdfStr(s){
  let o = '';
  for(const ch of String(s)){
    const c = ch.codePointAt(0);
    const b = c < 128 ? c : (WINANSI[c] != null ? WINANSI[c] : (c < 256 ? c : 63));
    o += (b===40||b===41||b===92) ? '\\' + String.fromCharCode(b)
       : (b < 32 || b > 126) ? '\\' + ('00' + b.toString(8)).slice(-3)
       : String.fromCharCode(b);
  }
  return o;
}
const p3 = v => (Math.round(v*1000)/1000);

/** A page being written: millimetre coordinates in, PDF operators out. */
function pdfPage(wmm, hmm){
  let ops = '', gsDepth = 0;
  const st = {fill:null, stroke:null, lw:null, dash:null, cap:null, join:null};
  const col = c => {
    // getComputedStyle hands back rgb()/rgba(); anything else is a colour we never used
    const m = /rgba?\(([^)]+)\)/.exec(c || '');
    if(!m) return null;
    const p = m[1].split(/[,\s\/]+/).filter(x=>x!=='').map(parseFloat);
    if(p.length > 3 && p[3] < 0.04) return null;
    return [p[0]/255, p[1]/255, p[2]/255];
  };
  const api = {
    ops: () => ops,
    raw(s){ ops += s + '\n'; },
    save(){ ops += 'q\n'; gsDepth++; },
    restore(){ if(gsDepth){ ops += 'Q\n'; gsDepth--; } },
    matrix(m){ ops += `${p3(m[0])} ${p3(m[1])} ${p3(m[2])} ${p3(m[3])} ${p3(m[4])} ${p3(m[5])} cm\n`; },
    /** Style, then paint whatever path has just been built. */
    paint(style){
      const f = col(style.fill), s = col(style.stroke);
      const lw = parseFloat(style.strokeWidth) || 0;
      if(!f && !s){ ops += 'n\n'; return; }
      if(f) ops += `${p3(f[0])} ${p3(f[1])} ${p3(f[2])} rg\n`;
      if(s){
        ops += `${p3(s[0])} ${p3(s[1])} ${p3(s[2])} RG\n`;
        ops += `${p3(Math.max(lw, 0.06))} w\n`;
        ops += `${style.cap==='round'?1:style.cap==='square'?2:0} J\n`;
        ops += `${style.join==='round'?1:style.join==='bevel'?2:0} j\n`;
        const d = (style.dash || '').replace(/px/g,'').trim();
        ops += (d && d !== 'none') ? `[${d.split(/[\s,]+/).map(v=>p3(parseFloat(v))).join(' ')}] 0 d\n` : '[] 0 d\n';
      }
      ops += (f && s) ? 'B\n' : f ? 'f\n' : 'S\n';
    },
    text(x, y, str, size, font, fill, anchor){
      const f = col(fill) || [0,0,0];
      const w = str.length * size * (font === 'F2' ? 0.6 : 0.55);
      const dx = anchor === 'middle' ? -w/2 : anchor === 'end' ? -w : 0;
      ops += `BT ${p3(f[0])} ${p3(f[1])} ${p3(f[2])} rg /${font} ${p3(size)} Tf`
           + ` 1 0 0 -1 ${p3(x+dx)} ${p3(y)} Tm (${pdfStr(str)}) Tj ET\n`;
    },
    close(){ while(gsDepth) api.restore(); return ops; }
  };
  return api;
}

/** Turn an SVG path `d` into PDF path operators, in the same coordinates. */
function pdfPath(d){
  let o = '', cx = 0, cy = 0, sx = 0, sy = 0, prev = '';
  const nums = /[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g;
  const toks = String(d).match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g) || [];
  let i = 0;
  const n = () => parseFloat(toks[i++]);
  const M = (x,y) => { o += `${p3(x)} ${p3(y)} m\n`; cx=x; cy=y; sx=x; sy=y; };
  const L = (x,y) => { o += `${p3(x)} ${p3(y)} l\n`; cx=x; cy=y; };
  const C = (a,b,c,e,x,y) => { o += `${p3(a)} ${p3(b)} ${p3(c)} ${p3(e)} ${p3(x)} ${p3(y)} c\n`; cx=x; cy=y; };
  const Q = (qx,qy,x,y) => C(cx + 2/3*(qx-cx), cy + 2/3*(qy-cy), x + 2/3*(qx-x), y + 2/3*(qy-y), x, y);
  /* An SVG arc is an ellipse by endpoints; PDF has only Beziers. This is the endpoint-to-
     centre conversion out of the SVG spec, then one Bezier per quarter turn or less. */
  const A = (rx, ry, rot, laf, swf, x, y) => {
    if(!rx || !ry){ L(x,y); return; }
    rx = Math.abs(rx); ry = Math.abs(ry);
    const ph = rot*Math.PI/180, cp = Math.cos(ph), sp = Math.sin(ph);
    const dx2 = (cx-x)/2, dy2 = (cy-y)/2;
    const x1 = cp*dx2 + sp*dy2, y1 = -sp*dx2 + cp*dy2;
    let lam = x1*x1/(rx*rx) + y1*y1/(ry*ry);
    if(lam > 1){ const k = Math.sqrt(lam); rx *= k; ry *= k; }
    const sign = laf === swf ? -1 : 1;
    const num = rx*rx*ry*ry - rx*rx*y1*y1 - ry*ry*x1*x1;
    const den = rx*rx*y1*y1 + ry*ry*x1*x1;
    const co = sign*Math.sqrt(Math.max(0, num/den));
    const cx1 = co*rx*y1/ry, cy1 = -co*ry*x1/rx;
    const ccx = cp*cx1 - sp*cy1 + (cx+x)/2, ccy = sp*cx1 + cp*cy1 + (cy+y)/2;
    const ang = (ux,uy,vx,vy) => {
      const s2 = (ux*vy - uy*vx) < 0 ? -1 : 1;
      const c2 = (ux*vx + uy*vy)/(Math.hypot(ux,uy)*Math.hypot(vx,vy));
      return s2*Math.acos(Math.max(-1, Math.min(1, c2)));
    };
    let th1 = ang(1, 0, (x1-cx1)/rx, (y1-cy1)/ry);
    let dth = ang((x1-cx1)/rx, (y1-cy1)/ry, (-x1-cx1)/rx, (-y1-cy1)/ry);
    if(!swf && dth > 0) dth -= 2*Math.PI;
    if(swf && dth < 0) dth += 2*Math.PI;
    const segs = Math.ceil(Math.abs(dth)/(Math.PI/2));
    const dd = dth/segs, k = 4/3*Math.tan(dd/4);
    for(let s2=0; s2<segs; s2++){
      const t1 = th1 + s2*dd, t2 = t1 + dd;
      const P = t => [ccx + rx*Math.cos(t)*cp - ry*Math.sin(t)*sp,
                      ccy + rx*Math.cos(t)*sp + ry*Math.sin(t)*cp];
      const D = t => [-rx*Math.sin(t)*cp - ry*Math.cos(t)*sp,
                      -rx*Math.sin(t)*sp + ry*Math.cos(t)*cp];
      const p1 = P(t1), p2 = P(t2), d1 = D(t1), d2 = D(t2);
      C(p1[0] + k*d1[0], p1[1] + k*d1[1], p2[0] - k*d2[0], p2[1] - k*d2[1], p2[0], p2[1]);
    }
  };
  while(i < toks.length){
    const t = toks[i];
    let cmd;
    if(/[a-zA-Z]/.test(t)){ cmd = t; i++; prev = cmd; }
    else cmd = (prev === 'M') ? 'L' : (prev === 'm') ? 'l' : prev;
    const rel = cmd === cmd.toLowerCase();
    const C2 = cmd.toUpperCase();
    if(C2 === 'M'){ const x=n(), y=n(); M(rel?cx+x:x, rel?cy+y:y); }
    else if(C2 === 'L'){ const x=n(), y=n(); L(rel?cx+x:x, rel?cy+y:y); }
    else if(C2 === 'H'){ const x=n(); L(rel?cx+x:x, cy); }
    else if(C2 === 'V'){ const y=n(); L(cx, rel?cy+y:y); }
    else if(C2 === 'C'){ const a=n(),b=n(),c=n(),e=n(),x=n(),y=n();
      C(rel?cx+a:a, rel?cy+b:b, rel?cx+c:c, rel?cy+e:e, rel?cx+x:x, rel?cy+y:y); }
    else if(C2 === 'Q'){ const a=n(),b=n(),x=n(),y=n();
      Q(rel?cx+a:a, rel?cy+b:b, rel?cx+x:x, rel?cy+y:y); }
    else if(C2 === 'A'){ const rx=n(),ry=n(),ro=n(),la=n(),sw=n(),x=n(),y=n();
      A(rx, ry, ro, la, sw, rel?cx+x:x, rel?cy+y:y); }
    else if(C2 === 'Z'){ o += 'h\n'; cx=sx; cy=sy; }
    else i++;                                  // a command we never emit: skip its letter
  }
  return o;
}

/** Walk a live SVG subtree onto a page. Computed style is used rather than the class name,
    so the PDF gets whatever the drawing is actually showing - dark theme included, which is
    why the pattern card is deliberately paper-coloured in both. */
function pdfWalk(node, page, ctm){
  const mul = (a, b) => [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1],
                         a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3],
                         a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];
  const parse = t => {
    let m = [1,0,0,1,0,0];
    const re = /(translate|rotate|scale|matrix)\s*\(([^)]*)\)/g;
    let g;
    while((g = re.exec(t))){
      const v = g[2].split(/[\s,]+/).filter(x=>x!=='').map(parseFloat);
      if(g[1]==='translate') m = mul(m, [1,0,0,1, v[0]||0, v[1]||0]);
      else if(g[1]==='scale') m = mul(m, [v[0]||1, 0, 0, v.length>1?v[1]:(v[0]||1), 0, 0]);
      else if(g[1]==='matrix') m = mul(m, v);
      else {
        const a = (v[0]||0)*Math.PI/180, c = Math.cos(a), s = Math.sin(a);
        const cx = v[1]||0, cy = v[2]||0;
        m = mul(m, [1,0,0,1,cx,cy]); m = mul(m, [c,s,-s,c,0,0]); m = mul(m, [1,0,0,1,-cx,-cy]);
      }
    }
    return m;
  };
  const style = el => {
    const cs = getComputedStyle(el);
    return {fill:cs.fill, stroke:cs.stroke, strokeWidth:cs.strokeWidth,
            dash:cs.strokeDasharray, cap:cs.strokeLinecap, join:cs.strokeLinejoin};
  };
  (function walk(el, m){
    const tf = el.getAttribute && el.getAttribute('transform');
    const mm = tf ? mul(m, parse(tf)) : m;
    const tag = el.tagName;
    const put = body => {
      page.save(); page.matrix(mm); page.raw(body); page.paint(style(el)); page.restore();
    };
    if(tag === 'path'){ const d = el.getAttribute('d'); if(d) put(pdfPath(d)); }
    else if(tag === 'rect'){
      const x = +el.getAttribute('x')||0, y = +el.getAttribute('y')||0;
      const w = +el.getAttribute('width')||0, h = +el.getAttribute('height')||0;
      const r = Math.min(+el.getAttribute('rx')||0, w/2, h/2);
      put(r > 0.01 ? pdfPath(`M ${x+r} ${y} H ${x+w-r} A ${r} ${r} 0 0 1 ${x+w} ${y+r}`
            + ` V ${y+h-r} A ${r} ${r} 0 0 1 ${x+w-r} ${y+h} H ${x+r}`
            + ` A ${r} ${r} 0 0 1 ${x} ${y+h-r} V ${y+r} A ${r} ${r} 0 0 1 ${x+r} ${y} Z`)
          : `${p3(x)} ${p3(y)} ${p3(w)} ${p3(h)} re\n`);
    }
    else if(tag === 'circle'){
      const cx = +el.getAttribute('cx')||0, cy = +el.getAttribute('cy')||0, r = +el.getAttribute('r')||0;
      if(r > 0.005) put(pdfPath(`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`
                               + ` A ${r} ${r} 0 0 1 ${cx-r} ${cy} Z`));
    }
    else if(tag === 'text'){
      const cs = getComputedStyle(el);
      const sz = parseFloat(cs.fontSize) || 4;
      const mono = /Mono|mono|Courier/.test(cs.fontFamily);
      page.save(); page.matrix(mm);
      page.text(+el.getAttribute('x')||0, +el.getAttribute('y')||0, el.textContent,
                sz, mono ? 'F2' : 'F1', cs.fill, el.getAttribute('text-anchor') || cs.textAnchor);
      page.restore();
    }
    for(const c of el.children) walk(c, mm);
  })(node, ctm);
}

/** Assemble the file. Objects are written in order and the xref built as we go. */
function pdfFile(pages, title){
  const parts = [];
  let len = 0;
  const put = s => { parts.push(s); len += s.length; };
  const xref = [];
  const obj = (n, body) => { xref[n] = len; put(`${n} 0 obj\n${body}\nendobj\n`); };
  put('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const nPages = pages.length;
  const first = 5;                                   // page objects start here
  const kids = pages.map((p,i)=>`${first + i*2} 0 R`).join(' ');
  obj(1, `<< /Type /Catalog /Pages 2 0 R >>`);
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${nPages} >>`);
  obj(3, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);
  obj(4, `<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>`);
  pages.forEach((p,i)=>{
    const pg = first + i*2, cs = pg + 1;
    obj(pg, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${p3(p.w*PT)} ${p3(p.h*PT)}]`
          + ` /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${cs} 0 R >>`);
    obj(cs, `<< /Length ${p.content.length} >>\nstream\n${p.content}endstream`);
  });
  const info = first + nPages*2;
  obj(info, `<< /Title (${pdfStr(title || 'Awl & Gusset')}) /Producer (Awl & Gusset) >>`);
  const start = len;
  const n = info + 1;
  put(`xref\n0 ${n}\n0000000000 65535 f \n`);
  for(let i=1;i<n;i++) put(('0000000000' + (xref[i]||0)).slice(-10) + ' 00000 n \n');
  put(`trailer\n<< /Size ${n} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${start}\n%%EOF\n`);
  const s = parts.join('');
  const buf = new Uint8Array(s.length);
  for(let i=0;i<s.length;i++) buf[i] = s.charCodeAt(i) & 0xff;
  return buf;
}

/** One page from one SVG element, fitted to the paper with a margin. `scale` null = 1:1. */
function pdfFromSvg(svg, wmm, hmm, fit){
  const page = pdfPage(wmm, hmm);
  page.matrix([PT, 0, 0, -PT, 0, hmm*PT]);           // millimetres, y down, from the top-left
  const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(parseFloat);
  if(fit && vb.length === 4){
    const k = Math.min((wmm - 2*fit)/vb[2], (hmm - 2*fit)/vb[3]);
    page.save();
    page.matrix([k, 0, 0, k, fit + (wmm - 2*fit - vb[2]*k)/2 - vb[0]*k,
                             fit + (hmm - 2*fit - vb[3]*k)/2 - vb[1]*k]);
  }
  pdfWalk(svg, page, [1,0,0,1,0,0]);
  return {w:wmm, h:hmm, content:page.close()};
}


/* ---------- what you can take away ----------
   Two files. The pattern is the thing you cut round, one page per sheet at 1:1. The info pack
   is the thing you keep: what the bag is, what it is made of, every piece with its size and
   its formula, the stitch counts, the order it goes together in, and the whole pattern on one
   page so you can see it without taping anything up. */
function offscreen(html){
  const box = document.createElement('div');
  // laid out, but nowhere anyone can see it: getComputedStyle has to work
  box.style.cssText = 'position:absolute; left:-99999px; top:0; width:1400px; visibility:hidden';
  box.innerHTML = html;
  document.body.appendChild(box);
  return box;
}
/** Every sheet of the pattern, at 1:1, one page each. */
function patternPages(){
  const keep = {pv:S.pv, zoom:S.zoom, all:PATTERN_ALL};
  S.pv = 'sheets'; S.zoom = '1'; PATTERN_ALL = true;   // a printed pattern is never abridged
  let html;
  try{ html = renderPattern(MODEL); }
  finally{ S.pv = keep.pv; S.zoom = keep.zoom; PATTERN_ALL = keep.all; }
  const box = offscreen(html);
  const [sw, sh] = SHEETS[S.sheet];
  const pages = [...box.querySelectorAll('.sheet > svg')].map(sv => pdfFromSvg(sv, sw, sh, null));
  box.remove();
  return pages;
}
/** A page of flowing text, in the same paper the pattern is on. */
function pdfTextPages(w, h, blocks){
  const M = 16, LH = {h1:9, h2:6.4, p:4.6, row:4.4, gap:3};
  const SZ = {h1:7.4, h2:5.2, p:4, row:3.7};
  const pages = [];
  let page = null, y = 0;
  const fresh = () => {
    page = pdfPage(w, h);
    page.matrix([PT, 0, 0, -PT, 0, h*PT]);
    y = M + 6;
  };
  const wrap = (str, size, width, font) => {
    const per = size * (font === 'F2' ? 0.6 : 0.52);
    const max = Math.max(8, Math.floor(width/per));
    const words = String(str).split(/\s+/), out = [];
    let line = '';
    for(const wd of words){
      if(line && (line + ' ' + wd).length > max){ out.push(line); line = wd; }
      else line = line ? line + ' ' + wd : wd;
    }
    if(line) out.push(line);
    return out;
  };
  fresh();
  for(const b of blocks){
    if(b.t === 'page'){ pages.push({w, h, content:page.close()}); fresh(); continue; }
    if(b.t === 'gap'){ y += LH.gap; continue; }
    const size = SZ[b.t] || SZ.p, lead = LH[b.t] || LH.p;
    const font = b.t === 'row' ? 'F2' : 'F1';
    const col = b.dim ? 'rgb(90,86,76)' : 'rgb(34,32,27)';
    if(b.t === 'row'){
      const lines = wrap(b.s, size, w - 2*M - (b.n ? 26 : 0), font);
      lines.forEach((ln,i)=>{
        if(y > h - M){ pages.push({w, h, content:page.close()}); fresh(); }
        page.text(M, y, ln, size, font, col, 'start');
        if(i === 0 && b.n != null) page.text(w - M, y, String(b.n), size, 'F2', col, 'end');
        y += lead;
      });
      continue;
    }
    const lines = wrap(b.s, size, w - 2*M, font);
    for(const ln of lines){
      if(y > h - M){ pages.push({w, h, content:page.close()}); fresh(); }
      page.text(M, y, ln, size, font, col, 'start');
      y += lead;
    }
    if(b.t === 'h1' || b.t === 'h2') y += 1.8;
  }
  pages.push({w, h, content:page.close()});
  return pages;
}
/** The design, everything about it, on paper. */
function infoPages(){
  const [sw, sh] = SHEETS[S.sheet];
  const st = MODEL.stats, pages = [];
  // the bag in the round, and the elevations, each fitted to a page
  const box = offscreen(`<div class="elevwrap">${renderElev(MODEL)}</div>`);
  const v3 = box.querySelector('.v3dbox svg'), ev = box.querySelector('#elevsvg');
  const ins = box.querySelector('#insidesvg');
  if(v3) pages.push(pdfFromSvg(v3, sw, sh, 18));
  if(ev) pages.push(pdfFromSvg(ev, sw, sh, 12));
  if(ins) pages.push(pdfFromSvg(ins, sw, sh, 12));
  box.remove();
  // the whole pattern on one page, scaled to fit - not for cutting, for seeing
  const keep = {pv:S.pv, zoom:S.zoom};
  S.pv = 'full'; S.zoom = 'fit';
  let fullHtml;
  try{ fullHtml = renderFull(MODEL); } finally{ S.pv = keep.pv; S.zoom = keep.zoom; }
  const fbox = offscreen(fullHtml);
  const fsv = fbox.querySelector('.sheet svg');
  if(fsv) pages.push(pdfFromSvg(fsv, sw, sh, 12));
  fbox.remove();
  // and the words
  const B = [];
  B.push({t:'h1', s:(S.designName || 'Untitled') + ' \u2014 Awl & Gusset'});
  B.push({t:'p', dim:true, s:`${fmt(S.W)} \u00d7 ${fmt(S.H)} \u00d7 ${fmt(S.D)} \u00b7 `
    + `${{gusset:'front + back + gusset',boxed:'one piece, boxed corners',bucket:'round base, wrapped body',barrel:'barrel, round ends',fold:'folded wrap'}[S.construction] || S.construction}`
    + ` \u00b7 ${fmt(S.thickness)} leather (${(S.thickness/0.397).toFixed(1)} oz)`
    + ` \u00b7 seam allowance ${fmt(S.sa)} \u00b7 ${S.edge==='raw'?'raw edge':'turned edge '+fmt(S.turn)}`});
  B.push({t:'gap'});
  B.push({t:'h2', s:'What it takes'});
  B.push({t:'row', s:'Leather, with waste', n:(st.leather/92903.04).toFixed(2) + ' sq ft'});
  if(st.lining > 0) B.push({t:'row', s:'Lining', n:(st.lining/92903.04).toFixed(2) + ' sq ft'});
  B.push({t:'row', s:'Pieces to cut', n:st.pieces + ' (' + st.unique + ' shapes)'});
  B.push({t:'row', s:'Holes to prick', n:st.stitches.toLocaleString()});
  B.push({t:'row', s:'Iron strikes, ' + S.stitch.prongs + ' prong at ' + fmtPitch(st.pitch), n:st.planStrikes.toLocaleString()});
  B.push({t:'row', s:'Thread, all seams', n:fmtLen(st.thread)});
  B.push({t:'row', s:'Edge to finish', n:fmtLen(st.edge*0.45)});
  B.push({t:'gap'});
  B.push({t:'h2', s:'Hardware'});
  MODEL.hw.forEach(h => B.push({t:'row', s:h.n, n:'\u00d7' + h.q}));
  B.push({t:'page'});
  B.push({t:'h2', s:'Every piece'});
  MODEL.pieces.filter(p=>!p.diagram).forEach(p=>{
    B.push({t:'row', s:p.name + '  \u2014  ' + p.mat.toLowerCase() + ', ' + fmt(p.w) + ' \u00d7 ' + fmt(p.h), n:'\u00d7' + p.qty});
    String(p.formula || '').split('\n').filter(Boolean).forEach(l => B.push({t:'p', dim:true, s:l}));
    B.push({t:'gap'});
  });
  B.push({t:'page'});
  B.push({t:'h2', s:'Stitch counts, run by run'});
  B.push({t:'p', dim:true, s:'Two pieces that meet are fitted to the same number of holes, so if two counts disagree the drift is in the one that does not match. A dagger means the run is pricked through both layers at once.'});
  MODEL.plan.forEach(pl=>{
    B.push({t:'row', s:pl.name + (pl.pieces > 1 ? '  (on ' + pl.pieces + ' pieces)' : '')
      + '  \u00b7  ' + fmt(pl.len) + ' at ' + fmtPitch(pl.pitch), n:pl.holes});
  });
  B.push({t:'page'});
  B.push({t:'h2', s:'The order it goes together in'});
  MODEL.steps.forEach((step,i)=> B.push({t:'p', s:(i+1) + '.  ' + String(step).replace(/<[^>]+>/g,'')}));
  if(MODEL.warn && MODEL.warn.length){
    B.push({t:'gap'});
    B.push({t:'h2', s:'Worth knowing'});
    MODEL.warn.forEach(wn => B.push({t:'p', dim:true, s:String(wn).replace(/<[^>]+>/g,'')}));
  }
  return pages.concat(pdfTextPages(sw, sh, B));
}
let PDFMSG = '';
async function savePDF(kind){
  if(!DL){ PDFMSG = 'Saving files is not available in this view.'; renderTools(TAB); return; }
  PDFMSG = 'Building\u2026'; renderTools(TAB);
  await new Promise(r=>setTimeout(r, 30));
  let buf, name;
  try{
    const pages = kind === 'pack' ? infoPages() : patternPages();
    name = fileName() + (kind === 'pack' ? '-info-pack.pdf' : '-pattern.pdf');
    buf = pdfFile(pages, (S.designName || 'Untitled') + (kind === 'pack' ? ' \u2014 info pack' : ' \u2014 pattern'));
  }catch(err){
    PDFMSG = 'Could not build the PDF: ' + (err && err.message ? err.message : err);
    renderTools(TAB); return;
  }
  const mb = buf.length/1048576;
  if(mb > 15.5){
    PDFMSG = `That came to ${mb.toFixed(1)} MB, over the 16 MB limit. Print fewer sheets, or use a bigger paper size.`;
    renderTools(TAB); return;
  }
  try{
    await DL.save({filename:name, data:buf.buffer});
    PDFMSG = 'Saved ' + name + ' \u2014 ' + mb.toFixed(1) + ' MB, ' + 'print it at 100% with no scaling.';
  }catch(err){
    const c = err && err.code;
    PDFMSG = c === 'declined' ? 'Save cancelled.'
      : c === 'extension_not_enabled' ? 'PDF saving is not switched on for this view, so the file cannot be handed over. Everything is still on screen.'
      : c === 'rate_limited' ? 'A save prompt is already open \u2014 try again in a moment.'
      : c === 'too_large' ? 'That PDF is too big to save. Try a bigger paper size, which needs fewer sheets.'
      : 'Could not save the PDF.';
  }
  renderTools(TAB);
}

