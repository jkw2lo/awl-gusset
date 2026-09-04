/* Awl & Gusset - engine checks.  Run:  node tests/check.js  (or: npm test)

   The tests exercise the files the site actually serves. index.html lists them in load
   order, so that list is read from there rather than kept in step by hand: add a script tag
   and the suite picks it up. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const files = [...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
if (!files.length) { console.error('no <script src> tags in index.html'); process.exit(1); }
const sources = files.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8'));

// Take every file, but stop at the first statement that touches the live DOM.
// Everything above that point is pure: geometry, the drafting engine, the renderers
// and the design-file code, all of which run happily in node.
const WIRE = "document.getElementById('rail').addEventListener";
let engine = sources.map(b => { const i = b.indexOf(WIRE); return i < 0 ? b : b.slice(0, i); }).join('\n;\n');
// deepAssign lives down in the wiring but applyDesign needs it
const da = sources.join('\n').match(/function deepAssign\(dst, src\)\{[\s\S]*?\n\}/);
if (da && !/function deepAssign/.test(engine)) engine += '\n' + da[0];

let fail = 0, checks = 0;
/* A card stack's side rows are planned off ONE grid measured from the stack, and every piece
   takes the holes of it that land on its own leather - so those counts vary by design and the
   mating check has to know it. Everything else in the file shares a key only when it shares a
   length. */
const gridKey = k => k === 'cardside' || /^el\d+side$/.test(k);
const ck = (cond, msg) => { checks++; if (!cond) { fail++; console.log('   ** ' + msg); } };

eval(engine + '\nglobalThis.__E = {S, PRESETS, ELTYPES, SEAMPLAN, RIVET_PATS, draft, seamHoles, runLen, ptAt,' +
     ' segLen, newElement, snapshot, applyDesign, sanitise, render3d, renderElev, renderPattern, renderFull, fmt,' +
     ' placeText, textBox, layoutSheets, pageRole, SHEETS, MARGIN, OVERLAP, renderCut, polyDist,' + ' freeShape, freeProfile, freeRenorm, FREE_SHAPE_NAMES, offsetPoly, polyHas, renderShape,' + ' feetPts, rivetRows, seedFree,' +
     ' stitchFit, stitchAdvice, rivetSpecAt, rivetCount, sanitiseRivets, get, set,' +
     ' cardsGeom, CARD_W, CARD_H, elFootH, symErr, symScan, symAdvice, symGet, symSet, SYM_OK, zipSpan, zipCut, freeStraighten, freeSmooth, freeMirror,' +
     ' freeSymPartner, fselSet, insetPoly, polyArcSegs, SEAM};');
const E = globalThis.__E, S = E.S;

function load(key) {
  S.elements = []; S.elSeq = 0;
  (function deep(d, s) {
    for (const k in s) {
      if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) deep(d[k] = d[k] || {}, s[k]);
      else d[k] = s[k];
    }
  })(S, JSON.parse(JSON.stringify(E.PRESETS[key].s)));
  if (!Array.isArray(E.PRESETS[key].s.elements)) { S.elements = []; S.elSeq = 0; }
}

console.log('\nLOAD ORDER  (every file stands up on its own, in the order index.html lists it)');
/* The whole drafter shares one global scope, but each file is a separate script, and a
   function declaration only hoists to the top of the script it is written in. So a file may
   CALL anything from anywhere - calls happen after everything has loaded - but at load time
   it may only touch what an earlier file has already defined. That distinction does not exist
   while the tests below run, because they evaluate the files as one program; this section is
   what notices when index.html lists a file before the one it is seeded from. */
{
  const vm = require('vm');
  const ctx = vm.createContext({ console, setTimeout, clearTimeout, window: {},
                                 URL: { createObjectURL(){}, revokeObjectURL(){} } });
  files.forEach((f, i) => {
    const src = sources[i].indexOf(WIRE) < 0 ? sources[i] : sources[i].slice(0, sources[i].indexOf(WIRE));
    let err = null;
    try { new vm.Script(src, { filename: f }).runInContext(ctx); } catch (e) { err = e.message; }
    ck(!err, f + ' will not load in this position: ' + err);
  });
  console.log('   ' + files.length + ' files');
}

console.log('\nPRESETS');
for (const key of Object.keys(E.PRESETS)) {
  load(key);
  let m;
  try { m = E.draft(); } catch (e) { console.log('   ** ' + key + ' THREW ' + e.message); fail++; continue; }
  const html2 = E.renderPattern(m) + E.renderFull(m) + E.renderElev(m) + E.render3d();
  ck(!/NaN|undefined/.test(html2), key + ': NaN or undefined in the rendered output');

  m.pieces.forEach(p => {
    ck(p.w > 0 && p.h > 0 && isFinite(p.w) && isFinite(p.h), key + '/' + p.name + ': bad size');
    ck(!/NaN|undefined/.test(p.formula), key + '/' + p.name + ': bad formula');
    p.draw.forEach(sm => {
      // a rivet set off the edge of the blank is a rivet set in fresh air
      if (sm.t === 'hole') {
        ck(isFinite(sm.x) && isFinite(sm.y) && sm.x > 1 && sm.y > 1 &&
           sm.x < p.w - 1 && sm.y < p.h - 1,
           key + '/' + p.name + ': a ' + (sm.label || 'hole') + ' is off the blank');
      }
      if (sm.t !== 'seam') return;
      // every hole must land inside the blank, clear of the cut edge
      E.seamHoles(sm.segs, sm.n, sm.closed).forEach(h => {
        ck(isFinite(h.x) && isFinite(h.y), key + '/' + p.name + ': NaN hole');
        ck(h.x > 1.5 && h.y > 1.5 && h.x < p.w - 1.5 && h.y < p.h - 1.5,
           key + '/' + p.name + ' [' + sm.key + ']: hole outside the blank');
      });
      const pl = E.SEAMPLAN[sm.key];
      ck(pl && (gridKey(sm.key) || sm.n === pl.n),
         key + '/' + p.name + ' [' + sm.key + ']: hole count disagrees with the plan');
    });
  });

  // mating pairs must agree, and the design must survive a save/load round trip
  const runs = {};
  m.pieces.forEach(p => p.draw.forEach(sm => {
    // sm.len is the run as it was measured and planned, before entasis crowned the drawing
    if (sm.t === 'seam') (runs[sm.key] = runs[sm.key] || []).push({ n: sm.n, len: sm.len, on: p.name });
  }));
  Object.entries(runs).forEach(([k2, list]) => {
    if (gridKey(k2)) return;
    list.forEach(r => {
      ck(r.n === list[0].n, key + ' [' + k2 + ']: ' + r.on + ' has ' + r.n + ' spaces, expected ' + list[0].n);
      // A tapered gusset's stitch edge is a shade longer than the panel edge it meets,
      // because it slants. Hole COUNT is the invariant; length may differ by a whisker.
      ck(Math.abs(r.len - list[0].len) < 0.05,
         key + ' [' + k2 + ']: ' + r.on + ' run length differs by ' + Math.abs(r.len - list[0].len).toFixed(2) + ' mm');
    });
  });
  coincident(m, key, ck);
  const before = JSON.stringify(E.snapshot().design);
  E.applyDesign(JSON.parse(JSON.stringify(E.snapshot())));
  ck(JSON.stringify(E.snapshot().design) === before, key + ': design changed over a save/load round trip');

  console.log('   ' + key.padEnd(12) + String(m.pieces.length).padStart(2) + ' pieces  ' +
              String(m.plan.length).padStart(2) + ' seams  ' +
              (m.stats.leather / 92903.04).toFixed(2).padStart(6) + ' sq ft  ' +
              String(m.stats.stitches).padStart(5) + ' holes');
}

/* Presets only exercise the combinations the presets happen to use. Sweep the rest:
   every construction against every top, every gusset cut, every strap build. Two real
   bugs were found this way - a half gusset was given a rim row at its base join, and a
   boxed body's flap and zip panel were drafted W wide when its rim is W + D. */
/* Two rows of holes drawn a hair apart, at two different pitches, is not a detail: it is a
   piece you cannot prick. It happened wherever a strap's edge row ran the whole length and an
   attachment box put its own long side at the same inset. Check every piece for it. */
function coincident(m, label, ck) {
  m.pieces.forEach(p => {
    const segs = [];
    p.draw.forEach(sm => {
      if (sm.t !== 'seam') return;
      sm.segs.forEach(g => { if (g[0] === 'L') segs.push({ k: sm.key, g }); });
    });
    for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
      if (segs[i].k === segs[j].k) continue;            // one run broken into parts is fine
      const a = segs[i].g, b = segs[j].g;
      const ax = a[3] - a[1], ay = a[4] - a[2], al = Math.hypot(ax, ay);
      const bx = b[3] - b[1], by = b[4] - b[2], bl = Math.hypot(bx, by);
      if (al < 10 || bl < 10) continue;
      const ux = ax / al, uy = ay / al;
      if (Math.abs(ux * (by / bl) - uy * (bx / bl)) > 0.05) continue;   // not parallel
      // perpendicular distance from b's ends to a's line
      const d = q => Math.abs((q[0] - a[1]) * -uy + (q[1] - a[2]) * ux);
      if (d([b[1], b[2]]) > 0.9 || d([b[3], b[4]]) > 0.9) continue;
      // and do they actually run alongside each other?
      const t = q => (q[0] - a[1]) * ux + (q[1] - a[2]) * uy;
      const lo = Math.max(0, Math.min(t([b[1], b[2]]), t([b[3], b[4]])));
      const hi = Math.min(al, Math.max(t([b[1], b[2]]), t([b[3], b[4]])));
      ck(hi - lo < 8, label + '/' + p.name + ': [' + segs[i].k + '] and [' + segs[j].k +
         '] run on top of each other for ' + (hi - lo).toFixed(0) + ' mm');
    }
  });
}

/* Text placement. Every label on a piece goes through one pass, and the pass promises two
   things: nothing overlaps anything else, and nothing lands outside the tile it belongs to.
   Both used to be false - the counts, the fold labels and the dimensions never went through
   it at all. */
console.log('\nTEXT PLACEMENT  (nothing overlaps, nothing leaves its own tile)');
{
  const words = ['EDGE ROW \u2014 IT HOLDS THE TWO LAYERS TOGETHER', 'GRAIN', '184', 'FOLD',
                 'TOP HANDLE', 'RIVET', 'CUT 2 \u00b7 LEATHER \u00b7 400 mm \u00d7 26 mm', '20\u2020'];
  const bx = { x0: -18, y0: -26, x1: 400, y1: 40 };
  const items = [];
  for (let i = 0; i < 90; i++) {
    items.push({ t: 'text', x: 20 + (i * 37) % 360, y: 6 + (i * 13) % 30,
                 s: words[i % words.length], size: 3 + (i % 4),
                 anchor: ['start', 'middle', 'end'][i % 3],
                 pri: i % 3, rot: (i % 7 === 0) ? -90 : 0 });
  }
  const laid = E.placeText(items, 1).filter(Boolean);
  const boxes = laid.map(it => E.textBox(it, 1));
  let clash = 0, out = 0;
  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i];
    if (a.x0 < bx.x0 - 60 || a.x1 > bx.x1 + 60) out++;
    for (let j = i + 1; j < boxes.length; j++) {
      const b = boxes[j];
      if (a.x0 < b.x1 - 0.01 && b.x0 < a.x1 - 0.01 && a.y0 < b.y1 - 0.01 && b.y0 < a.y1 - 0.01) clash++;
    }
  }
  ck(clash === 0, 'placeText let ' + clash + ' pairs of labels overlap');
  ck(laid.length > items.length * 0.4,
     'placeText dropped too much: kept ' + laid.length + ' of ' + items.length);
  console.log('   ' + laid.length + ' of ' + items.length + ' labels placed, ' + clash + ' overlapping');
  // and with a tile to stay inside, nothing may cross its edge
  const laid2 = E.placeText(items, 1, bx).filter(Boolean);
  let esc = 0;
  laid2.forEach(it => {
    const b = E.textBox(it, 1);
    if (b.x0 < bx.x0 - 0.6 || b.x1 > bx.x1 + 0.6 || b.y0 < bx.y0 - 0.6 || b.y1 > bx.y1 + 0.6) esc++;
  });
  ck(esc === 0, esc + ' labels were left hanging off their own tile');
  console.log('   ' + laid2.length + ' placed inside the tile, ' + esc + ' escaping');
}

console.log('\nCONSTRUCTION SWEEP  (every mating pair must agree, on every combination)');
{
  let n = 0;
  for (const con of ['gusset', 'boxed', 'fold', 'bucket', 'barrel'])
    for (const style of ['wrap', 'split', 'base', 'bellows'])
      for (const edge of ['raw', 'turned'])
        for (const top of ['flap', 'zip', 'magnet', 'open', 'roll', 'draw'])
          for (const build of ['single', 'two', 'four'])
            for (const carry of ['adjust', 'fixed', 'pack', 'handles', 'belt', 'none'])
              for (const zs of ['rim', 'wrap', 'panel']) {
              if (con !== 'gusset' && style !== 'wrap') continue;   // style only bites on a gusset
              if (top === 'draw' && (con === 'fold' || con === 'barrel')) continue;  // no mouth to gather
              if (top !== 'zip' && zs !== 'rim') continue;          // and the zip style only when there is a zip
              n++;
              const label = [con, style, edge, top, build, carry, zs].join('/');
              load('crossbody');
              S.construction = con; S.gussetStyle = style; S.edge = edge; S.turn = 9; S.top = top;
              S.strap.build = build; S.strap.type = carry;
              S.zip = { style: zs, panelH: 35, gauge: 5, wrap: 40, tabs: true };
              // curved and padded straps change the blank's shape, so sweep both settings
              S.strap.curve = (n % 2) ? 30 : 0;
              S.strap.pad = (n % 3) === 0;
              S.handles.build = ['single', 'layered', 'folded', 'rolled'][n % 4];
              S.handles.core = 9;
              S.handles.ends = ['plain', 'tab', 'ring'][n % 3];
              S.draw = { n: 10, size: 8, drop: 26, style: (n % 2) ? 'eyelet' : 'channel', toggle: true };
              S.topR = (n % 5) === 0 ? 40 : 0;   // rounded top corners change every run on the body
              S.strap.tip = ['square','round','point','english','almond','angle'][n % 6];
              S.shoulder = (n % 3) === 0 ? 70 : 0;      // a taper that stops partway down
              S.squareness = [0, 40, 90][n % 3];        // ellipse -> duffle -> nearly a box
              S.squarenessTop = [0, 15, 90][(n + 1) % 3];
              S.entasis = (n % 2) ? 0.8 : 0;            // a crown on every long edge
              // two closures, a pull tab off the flap tip, and a tab moved and turned
              S.flap.closures = (n % 2) ? 2 : 1;
              S.flap.cSpan = 150;
              S.flap.pull = { on: (n % 3) === 0, w: 26, attach: 30, drop: 34,
                              tip: ['square','round','point','english','almond','angle'][n % 6],
                              r: 3, fix: ['stitchbox','rivet','both'][n % 3] };
              S.strap.rivetPat = Object.keys(E.RIVET_PATS)[n % Object.keys(E.RIVET_PATS).length];
              S.strap.rivetInset = 11; S.strap.rivetPitch = 13; S.strap.rivetEdge = 6.5;
              S.pocket.on = (n % 2) === 0;              // the built-in pocket is off by default now
              S.stitch.reg = [0, 10, 15, 25][n % 4];
              S.strap.tabFix = ['stitch','rivet','both'][n % 3];
              S.strap.anchorX = [0, 12, -10][n % 3];
              S.strap.tabRot = [0, 18, -25][n % 3];
              S.bellows = 40;
              S.roll = { turns: 3, turn: 60, stiffener: (n % 2) === 0, anchorY: 120,
                         closure: ['clip','buckle','strap','none'][n % 4] };
              let m;
              try { m = E.draft(); } catch (e) { ck(false, label + ' THREW ' + e.message); continue; }
              coincident(m, label, ck);
              const runs = {};
              m.pieces.forEach(p => p.draw.forEach(sm => {
                if (sm.t === 'hole')
                  ck(isFinite(sm.x) && isFinite(sm.y) && sm.x > 1 && sm.y > 1 &&
                     sm.x < p.w - 1 && sm.y < p.h - 1,
                     label + '/' + p.name + ': a ' + (sm.label || 'hole') + ' is off the blank');
                if (sm.t === 'seam') (runs[sm.key] = runs[sm.key] || []).push({ n: sm.n, len: sm.len, on: p.name });
              }));
              Object.entries(runs).forEach(([k, list]) => {
                if (gridKey(k)) return;
                list.forEach(r => {
                  ck(r.n === list[0].n, label + ' [' + k + ']: ' + r.on + ' has ' + r.n + ' spaces, expected ' + list[0].n);
                  ck(Math.abs(r.len - list[0].len) < 0.05,
                     label + ' [' + k + ']: ' + r.on + ' run differs by ' + Math.abs(r.len - list[0].len).toFixed(2) + ' mm');
                });
              });
              m.pieces.forEach(p => p.draw.forEach(sm => {
                if (sm.t !== 'seam') return;
                E.seamHoles(sm.segs, sm.n, sm.closed).forEach(h =>
                  ck(h.x > 1.5 && h.y > 1.5 && h.x < p.w - 1.5 && h.y < p.h - 1.5,
                     label + ' | ' + p.name + ' [' + sm.key + ']: hole outside the blank'));
              }));
              ck(!/NaN|undefined/.test(E.renderPattern(m) + E.renderFull(m) + E.renderElev(m) + E.render3d()),
                 label + ': NaN or undefined in the rendered output');
            }
  console.log('   ' + n + ' combinations');
}

/* The added elements had never been swept at all, and a bellows pocket was drafting a
   footprint on the panel that was 84 mm shorter than the run on its own blank - same seam
   key, same hole count, two quite different pitches. Presets do not carry one, so nothing
   caught it. Every element type, on every face it offers, every way its mouth can point and
   turned every which way. */
console.log('\nELEMENTS  (every added part must mate with the panel it is fixed to)');
{
  let n = 0;
  for (const preset of ['crossbody', 'tote', 'duffle'])
    for (const type of Object.keys(E.ELTYPES))
      for (const face of E.ELTYPES[type].faces)
        for (const open of ['top', 'right', 'bottom', 'left'])
          for (const rot of [0, 43, 90, 180]) {
            const T = E.ELTYPES[type];
            if (!T.opens && open !== 'top') continue;      // the mouth only means something on a pocket
            load(preset);
            S.elements = []; S.elSeq = 0;
            const el = E.newElement(type);
            el.face = face; el.open = open; el.rot = rot; el.y = 24;
            // a gusset strip is only as deep as the bag: put something on it that fits
            if (face === 'gusset' || face === 'base') { el.w = Math.min(el.w, 54); el.h = Math.min(el.h, 44); }
            if (T.dep) el.dep = [0, 8, 20, 45][n % 4];     // including 0, which means "work it out"
            el.fix = T.opens ? ['stitch3', 'rivet', 'both'][n % 3] : ['stitchbox', 'rivet', 'both'][n % 3];
            S.elements = [el];
            n++;
            const label = preset + '/' + type + '/' + face + '/' + open + '/' + rot;
            let m;
            try { m = E.draft(); } catch (e) { ck(false, label + ' THREW ' + e.message); continue; }
            // the drafter says so itself when something does not fit on the face it was put on;
            // that is a warning to the maker, not a fault in the draft
            if (m.warn.some(w => /runs off/.test(w))) continue;
            const runs = {};
            m.pieces.forEach(p => p.draw.forEach(sm => {
              if (sm.t === 'hole')
                ck(isFinite(sm.x) && isFinite(sm.y) && sm.x > 1 && sm.y > 1 &&
                   sm.x < p.w - 1 && sm.y < p.h - 1,
                   label + '/' + p.name + ': a ' + (sm.label || 'hole') + ' is off the blank');
              if (sm.t === 'seam') {
                (runs[sm.key] = runs[sm.key] || []).push({ n: sm.n, len: sm.len, on: p.name });
                E.seamHoles(sm.segs, sm.n, sm.closed).forEach(h =>
                  ck(h.x > 1.5 && h.y > 1.5 && h.x < p.w - 1.5 && h.y < p.h - 1.5,
                     label + ' | ' + p.name + ' [' + sm.key + ']: hole outside the blank'));
              }
            }));
            Object.entries(runs).forEach(([k, list]) => {
              if (gridKey(k)) return;
              list.forEach(r => {
                ck(r.n === list[0].n, label + ' [' + k + ']: ' + r.on + ' has ' + r.n + ' spaces, expected ' + list[0].n);
                ck(Math.abs(r.len - list[0].len) < 0.05,
                   label + ' [' + k + ']: ' + r.on + ' run differs by ' + Math.abs(r.len - list[0].len).toFixed(2) + ' mm');
              });
            });
            // A bellows pleat folds over itself at each bottom corner. That square is glued,
            // not stitched: a hole in it goes through three layers at a fold and cannot be
            // pricked. The run is three sections for exactly this reason.
            if (type === 'bellows') {
              const bp = m.pieces.find(q => q.key === 'el' + el.id);
              if (bp) {
                const dep = Math.max(4, Math.min(el.dep > 0 ? el.dep : Math.round(el.w * 0.16),
                                                 el.w / 3, el.h / 2));
                const sa = Math.max(2.5, S.sa);
                const sq = [[sa, bp.h - sa - dep, sa + dep, bp.h - sa],
                            [bp.w - sa - dep, bp.h - sa - dep, bp.w - sa, bp.h - sa]];
                bp.draw.forEach(sm => {
                  if (sm.t !== 'seam') return;
                  E.seamHoles(sm.segs, sm.n, sm.closed).forEach(h => sq.forEach(c =>
                    ck(!(h.x > c[0] + 0.6 && h.x < c[2] - 0.6 && h.y > c[1] + 0.6 && h.y < c[3] - 0.6),
                       label + ': a hole landed in the bellows corner that folds over itself')));
                });
              }
            }
            ck(!/NaN|undefined/.test(E.renderPattern(m) + E.renderElev(m)),
               label + ': NaN or undefined in the rendered output');
          }
  console.log('   ' + n + ' element placements');
}

console.log('\n3D PAINT ORDER  (nothing may be painted over the panel it is glued to)');
for (const key of Object.keys(E.PRESETS)) {
  load(key);
  for (let yaw = 0; yaw < 360; yaw += 30) for (let pitch = -40; pitch <= 40; pitch += 20) {
    S.view3d.yaw = yaw; S.view3d.pitch = pitch;
    const paths = E.render3d().split('<path').slice(1);
    const panelAt = {}, overlays = [];
    paths.forEach((p, i) => {
      const on = (p.match(/data-on="([a-zA-Z]+)"/) || [])[1];
      const ly = +((p.match(/data-layer="(\d+)"/) || [])[1] || 0);
      if (!on) return;
      if (ly === 0) panelAt[on] = i; else overlays.push({ i, on, ly });
    });
    overlays.forEach(o => ck(panelAt[o.on] == null || panelAt[o.on] < o.i,
      key + ' yaw' + yaw + ' pitch' + pitch + ': ' + o.on + ' panel covers its own overlay'));
  }
}

console.log('\nMALFORMED DESIGN FILES  (must be refused, or clamped - never crash)');
[null, {}, { format: 'nope' }, { format: 'awl-gusset/design' },
 { format: 'awl-gusset/design', design: { W: 'big', elements: 'no' } },
 { format: 'awl-gusset/design', design: { W: -5, H: 1e9, construction: 'nope', elements: [{ type: 'bogus' }] } }
].forEach((junk, i) => {
  try { E.applyDesign(junk); E.draft(); } catch (e) { /* refused, which is fine */ }
  ck(isFinite(S.W) && S.W > 0, 'junk input ' + i + ' left the state unusable');
});

/* ------------------------------------------------------------------
   PAGINATION.  Every main piece gets a sheet of its own and overflows onto more; a long thin
   one is laid in lanes. Three things have to hold whatever the bag is: nothing may be left
   off the paper, nothing may hang off the printable area, and the windows onto a piece too
   big for one sheet must between them cover the whole of it - a gap in that cover is a strip
   of pattern that exists nowhere, and you do not find out until you have cut the leather.
   ------------------------------------------------------------------ */
console.log('\nPAGINATION  (every piece on paper, every window inside it, nothing missed)');
for (const key of Object.keys(E.PRESETS)) {
  for (const paper of ['A4', 'Letter', 'A3']) for (const dims of [true, false]) {
    load(key); S.sheet = paper; S.dims = dims;
    const m = E.draft();
    const shown = m.pieces.filter(p => !p.derived);
    const L = E.layoutSheets(shown);
    const tag = key + '/' + paper + (dims ? '/dims' : '');
    const seen = {};
    L.sheets.forEach((sh, i) => {
      ck(sh.items.length > 0, tag + ': sheet ' + (i + 1) + ' is empty');
      sh.items.forEach(it => {
        (seen[it.p.key] = seen[it.p.key] || []).push(it);
        ck(it.x >= -0.01 && it.y >= -0.01, tag + '/' + it.p.key + ': placed off the top or left');
        ck(it.x + it.fw <= L.PW + 0.02 && it.y + it.fh <= L.PH + 0.02,
           tag + '/' + it.p.key + ': hangs off the printable area');
        ck(!it.clip || (it.clip.w > 0 && it.clip.h > 0), tag + '/' + it.p.key + ': empty window');
      });
      // whatever else moves, a bit dropped on a sheet must be drawn after the piece it lands on
      let z = -1;
      sh.items.forEach(it => { ck((it.z || 0) >= z, tag + ': sheet ' + (i + 1) + ' draws its bits under a panel'); z = it.z || 0; });
    });
    // nothing lost, and every window a piece is cut into covers ground the next one meets
    shown.forEach(p => {
      const got = seen[p.key];
      ck(got && got.length, tag + '/' + p.key + ': never reaches paper');
      if (!got || !got[0].clip) return;
      const full = got[0].clip.full;
      const horiz = got.some(g => g.clip.right);
      const spans = got.map(g => horiz ? [g.clip.ox, g.clip.ox + g.clip.w] : [g.clip.oy, g.clip.oy + g.clip.h])
                       .sort((a, b) => a[0] - b[0]);
      let reach = 0;
      spans.forEach(sp => { if (sp[0] <= reach + 0.01) reach = Math.max(reach, sp[1]); });
      const need = horiz ? full.w : full.h;
      ck(reach >= need - 0.02 || got.length === 1,
         tag + '/' + p.key + ': the windows leave a gap - ' + reach.toFixed(0) + ' of ' + need.toFixed(0) + ' mm covered');
    });
  }
}

/* ------------------------------------------------------------------
   STITCH FIT.  The advice is allowed to be wrong about taste; it is not allowed to be wrong
   about arithmetic, and it is certainly not allowed to leave the seam registry describing a
   bag that is not on screen - every trial re-drafts, and the last draft has to be the real one.
   ------------------------------------------------------------------ */
console.log('\nSTITCH FIT  (the advice improves what it claims, and leaves the bag as it found it)');
for (const key of Object.keys(E.PRESETS)) {
  load(key);
  const was = { W: S.W, H: S.H, D: S.D };
  const before = JSON.stringify(E.draft().plan);
  const A = E.stitchAdvice();
  ck(S.W === was.W && S.H === was.H && S.D === was.D, key + ': the fit check moved the bag');
  ck(JSON.stringify(E.draft().plan) === before, key + ': the fit check left a trial in the seam plan');
  ck(isFinite(A.base.cost) && A.base.cost >= 0, key + ': nonsense fit score');
  ck(A.best.length <= 3, key + ': too many suggestions to read');
  A.best.forEach(o => {
    ck(o.gain > 0, key + ': suggested ' + o.k + ' ' + o.to + ' with nothing to gain');
    ck(o.to !== o.was && Math.abs(o.d) <= 10, key + ': suggested a nudge nobody asked for');
    // it has to be true: set it, re-draft, and the score really is better
    E.set(o.k, o.to);
    const now = E.stitchFit(E.draft().plan);
    E.set(o.k, o.was); E.draft();
    ck(Math.abs((A.base.cost - now.cost) - o.gain) < 1e-6,
       key + ': the ' + o.k + ' suggestion does not score what it says it does');
  });
  ck(!/NaN|undefined/.test(E.renderCut(E.draft())), key + ': NaN in the cut list');
}

/* ------------------------------------------------------------------
   RIVET ARRANGEMENTS.  Anything that can be riveted carries the same four fields now, and an
   old design carrying only a count must come back with the arrangement that count meant.
   ------------------------------------------------------------------ */
console.log('\nRIVETS  (one arrangement, read the same way wherever it is carried)');
[[1, 'one'], [2, 'across2'], [3, 'tri'], [4, 'quad'], [5, 'five'], [6, 'six']].forEach(([n, pat]) => {
  const o = E.sanitiseRivets({ rivets: n });
  ck(o.rivetPat === pat, 'a bare count of ' + n + ' read back as ' + o.rivetPat + ', not ' + pat);
  ck(o.rivets === n, 'the count did not follow the arrangement for ' + pat);
});
ck(E.rivetSpecAt({ rivetPat: 'quad', rivetInset: 9 }).inset === 9, 'an explicit inset was ignored');
ck(E.rivetCount(E.rivetSpecAt({ rivetPat: 'six' })) === 6, 'six is not six');
Object.keys(E.RIVET_PATS).forEach(pat => {
  load('crossbody');
  S.strap.tabFix = 'rivet'; S.strap.rivetPat = pat;
  S.handles.fix = 'rivet'; S.handles.rivetPat = pat;
  S.elements.forEach(e => { e.fix = 'rivet'; e.rivetPat = pat; });
  let m = null;
  try { m = E.draft(); } catch (e) { ck(false, 'rivet arrangement ' + pat + ' THREW ' + e.message); }
  if (m) m.pieces.forEach(p => p.draw.forEach(sm => {
    if (sm.t !== 'hole') return;
    ck(sm.x > 0.5 && sm.y > 0.5 && sm.x < p.w - 0.5 && sm.y < p.h - 0.5,
       'rivet arrangement ' + pat + ': a rivet is off ' + p.name);
  }));
});

/* ------------------------------------------------------------------
   THE PADDED STRAP.  The red dashed line on the blank is where the FOAM ends, and the whole
   point of it is that the stitch row outside it goes through leather only. A scaled copy of
   the outline takes proportionally less off the narrow end than the wide one and drags the
   S-bow back towards the straight - which is how that line ended up off the strap entirely.
   It has to be a true inset: the same distance from the cut edge the whole way down.
   ------------------------------------------------------------------ */
console.log('\nPADDED STRAP  (the foam line is an inset of the outline, not a shrunk copy)');
{
  load('daypack');
  const m = E.draft();
  const strap = m.pieces.find(p => p.key === 'packstrap');
  const foam = m.pieces.find(p => p.key === 'packFoam');
  ck(!!strap && !!foam, 'the day pack lost its padded strap');
  const pts = d => (String(d).match(/-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?/g) || [])
                     .map(q => q.trim().split(/\s+/).map(Number));
  const cut = pts((strap.draw.find(x => x.t === 'cut') || {}).d);
  const ring = strap.draw.find(x => x.t === 'mark' && /Z\s*$/.test(String(x.d)));
  ck(!!ring, 'the foam outline is not drawn on the strap blank');
  const mark = pts(ring && ring.d);
  ck(cut.length > 8 && mark.length > 8, 'the foam outline is not a closed shape');
  const inside = (q, poly) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++)
      if ((poly[i][1] > q[1]) !== (poly[j][1] > q[1]) &&
          q[0] < (poly[j][0] - poly[i][0]) * (q[1] - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0])
        c = !c;
    return c;
  };
  let off = 0, lo = Infinity, hi = 0;
  mark.forEach(q => {
    if (!inside(q, cut)) off++;
    const d2 = E.polyDist(q, cut);
    lo = Math.min(lo, d2); hi = Math.max(hi, d2);
  });
  ck(off === 0, off + ' points of the foam outline fall outside the strap blank');
  ck(lo > 4 && hi < 9, 'the foam line wanders: ' + lo.toFixed(1) + ' to ' + hi.toFixed(1) + ' mm from the cut edge');
  ck(foam.w < strap.w && foam.h < strap.h, 'the foam is cut the same size as the leather');
  ck(!/NaN|undefined/.test(foam.formula), 'the foam formula is broken');
}

/* ------------------------------------------------------------------
   A SHAPE SHE DREW.  The free construction is the gusset construction with the panel outline
   taken off a profile rather than out of a rounded rectangle, so the thing to prove is that
   nothing downstream noticed: the panel and the strip still agree hole for hole, every hole
   still lands on its own blank, and the strip is still cut to exactly the run it has to meet.
   The last one is the whole bag: get the gusset length wrong and nothing closes.
   ------------------------------------------------------------------ */
console.log('\nA SHAPE YOU DRAW  (the strip is cut to the run it meets, and every hole is on its blank)');
for (const [name] of E.FREE_SHAPE_NAMES) {
  for (const top of ['open', 'flap', 'zip', 'magnet']) {
    load('crossbody');
    S.construction = 'free'; S.top = top; S.gussetStyle = 'wrap';
    S.free = { pts: E.freeShape(name) };
    E.sanitise();
    const tag = name + '/' + top;
    let m;
    try { m = E.draft(); } catch (e) { ck(false, tag + ' THREW ' + e.message); continue; }

    const F = E.freeProfile(S.W, S.H);
    ck(Math.abs(F.mouthLen + F.bodyLen - F.total) < 0.01,
       tag + ': the mouth and the body do not add up to the way round');
    ck(F.mouthLen > 0 && F.bodyLen > 0, tag + ': the mouth swallowed the whole profile');
    ck(F.chord <= F.mouthLen + 0.01, tag + ': the mouth measures less straight across than round');

    const gus = m.pieces.find(p => p.key === 'Gusset');
    ck(!!gus, tag + ': no gusset');
    if (gus) ck(Math.abs(gus.w - F.bodyLen) < 0.01,
                tag + ': the gusset is ' + gus.w.toFixed(1) + ' long and has ' + F.bodyLen.toFixed(1) + ' to meet');

    // the panel's cut edge is the profile GROWN by the seam allowance, never shrunk by it
    const front = m.pieces.find(p => p.key === 'Front');
    if (front) ck(front.w > S.W - 0.01 && front.h > S.H - 0.01,
                  tag + ': the panel came out smaller than the shape it is cut from');

    const runs = {};
    m.pieces.forEach(p => p.draw.forEach(sm => {
      if (sm.t === 'seam') (runs[sm.key] = runs[sm.key] || []).push({ n: sm.n, len: sm.len, on: p.name });
    }));
    Object.entries(runs).forEach(([k2, list]) => list.forEach(r => {
      ck(r.n === list[0].n, tag + ' [' + k2 + ']: ' + r.on + ' has ' + r.n + ' spaces, expected ' + list[0].n);
      ck(Math.abs(r.len - list[0].len) < 0.05, tag + ' [' + k2 + ']: ' + r.on + ' run length differs');
    }));

    // anything the drafter warns does not fit is a message to the maker, not a fault
    const off = m.warn.some(w => /runs off|off the front panel/.test(w));
    m.pieces.forEach(p => {
      if (off && /lining|Slip|Card|Zip pocket/.test(p.name)) return;
      p.draw.forEach(sm => {
        if (sm.t === 'seam') E.seamHoles(sm.segs, sm.n, sm.closed).forEach(h => {
          ck(isFinite(h.x) && isFinite(h.y), tag + '/' + p.name + ': NaN hole');
          ck(h.x > 1.5 && h.y > 1.5 && h.x < p.w - 1.5 && h.y < p.h - 1.5,
             tag + '/' + p.name + ' [' + sm.key + ']: hole outside the blank');
        });
        if (sm.t === 'hole' && !off)
          ck(sm.x > 0.5 && sm.y > 0.5 && sm.x < p.w - 0.5 && sm.y < p.h - 0.5,
             tag + '/' + p.name + ': a mark is off the blank');
      });
    });
    coincident(m, tag, ck);
    const html3 = E.renderElev(m) + E.render3d() + E.renderPattern(m) + E.renderCut(m) + E.renderShape();
    ck(!/NaN|undefined/.test(html3), tag + ': NaN or undefined in the rendered output');
  }
}

/* Skipping a point is how a five-point star becomes a pentagon, and it has to be reversible:
   the outline goes straight past the point, and putting it back gives the shape you had. */
{
  load('crossbody');
  S.construction = 'free'; S.free = { pts: E.freeShape('star5') }; E.sanitise();
  const star = E.freeProfile(S.W, S.H).total;
  S.free.pts.forEach((q, i) => { if (i % 2 === 1) q.skip = true; });
  E.freeRenorm();
  const pent = E.freeProfile(S.W, S.H);
  ck(pent.total < star - 1, 'skipping the valleys did not shorten the star');
  ck(E.freeProfile(S.W, S.H).pts.length === 5, 'the pentagon did not come out with five sides');
  S.free.pts.forEach(q => { q.skip = false; });
  E.freeRenorm();
  ck(Math.abs(E.freeProfile(S.W, S.H).total - star) < 0.01, 'putting the valleys back did not give the star back');
}

/* The profile is stored 0 to 1 of its own box and W and H ARE that box. Moving a point has to
   put the box back and write the size out, or the sliders and the shape drift apart. */
for (const [name] of E.FREE_SHAPE_NAMES) {
  load('crossbody');
  S.construction = 'free'; S.free = { pts: E.freeShape(name) }; E.sanitise();
  const live = S.free.pts.filter(q => !q.skip);
  const xs = live.map(q => q.x), ys = live.map(q => q.y);
  ck(Math.abs(Math.min.apply(null, xs)) < 1e-9 && Math.abs(Math.max.apply(null, xs) - 1) < 1e-9,
     name + ': the profile does not fill its box across');
  ck(Math.abs(Math.min.apply(null, ys)) < 1e-9 && Math.abs(Math.max.apply(null, ys) - 1) < 1e-9,
     name + ': the profile does not fill its box down');
  const box = E.freeProfile(S.W, S.H);
  const bx = box.pts.map(q => q[0]), by = box.pts.map(q => q[1]);
  ck(Math.abs(Math.max.apply(null, bx) - Math.min.apply(null, bx) - S.W) < 0.6 &&
     Math.abs(Math.max.apply(null, by) - Math.min.apply(null, by) - S.H) < 0.6,
     name + ': the drawn profile is not W by H');
  /* Editing the profile has to put the box back and write the size out. Scale the whole
     profile out by a fifth and the bag has to come out a fifth bigger, still filling 0 to 1 -
     that is the contract between the shape and the two sliders, and it is the only thing
     stopping them drifting apart over a hundred small drags. */
  const was = { W: S.W, H: S.H };
  S.free.pts.forEach(q => { q.x = 0.5 + (q.x - 0.5)*1.2; q.y = 0.5 + (q.y - 0.5)*1.2; });
  E.freeRenorm();
  const l2 = S.free.pts.filter(q => !q.skip), x2 = l2.map(q => q.x), y2 = l2.map(q => q.y);
  ck(Math.abs(Math.min.apply(null, x2)) < 1e-9 && Math.abs(Math.max.apply(null, x2) - 1) < 1e-9,
     name + ': editing the profile left the box un-normalised across');
  ck(Math.abs(Math.min.apply(null, y2)) < 1e-9 && Math.abs(Math.max.apply(null, y2) - 1) < 1e-9,
     name + ': editing the profile left the box un-normalised down');
  ck(Math.abs(S.W - was.W*1.2) < 1.2 && Math.abs(S.H - was.H*1.2) < 1.2,
     name + ': scaling the profile by a fifth did not scale the bag with it');
}

/* A negative offset grows the outline. That is what puts the seam allowance OUTSIDE the
   profile, and reversing the polygon does not do it - the winding and the edge both flip. */
{
  const sq = [[0,0],[100,0],[100,60],[0,60]];
  const out = E.offsetPoly(sq, -5), inn = E.offsetPoly(sq, 5);
  const wide = a2 => Math.max.apply(null, a2.map(q=>q[0])) - Math.min.apply(null, a2.map(q=>q[0]));
  ck(Math.abs(wide(out) - 110) < 0.01, 'a negative offset did not grow the outline: ' + wide(out).toFixed(2));
  ck(Math.abs(wide(inn) - 90) < 0.01, 'a positive offset stopped pulling the outline in');
  ck(E.polyHas(sq, 50, 30) && !E.polyHas(sq, 150, 30), 'point-in-polygon is answering nonsense');
}

/* Feet fill the box they are drawn in, and the arrangement is the same table everything else
   riveted reads - four at the corners, five with one in the middle, six for a long base. */
{
  [['quad',4],['five',5],['six',6],['one',1]].forEach(([pat, n])=>{
    const pts = E.feetPts(0, 0, 120, 80, {pat, inset:20, edge:20, pitch:13});
    ck(pts.length === n, 'the ' + pat + ' arrangement gave ' + pts.length + ' feet, not ' + n);
    pts.forEach(q => ck(q[0] >= 0 && q[0] <= 120 && q[1] >= 0 && q[1] <= 80,
                        'a foot in the ' + pat + ' arrangement fell outside its own box'));
  });
  const four = E.feetPts(0, 0, 120, 80, {pat:'quad', inset:20, edge:20, pitch:13});
  const ys4 = [...new Set(four.map(q => q[1]))].sort((a2,b2)=>a2-b2);
  ck(ys4.length === 2 && Math.abs(ys4[0] - 20) < 0.01 && Math.abs(ys4[1] - 60) < 0.01,
     'four feet did not spread to the front and back of their box');
}

/* ------------------------------------------------------------------
   SYMMETRY.  A row that goes right round a shape is a mirror image of itself exactly when
   twice the arc distance from its start to its own centre line is a whole number of holes.
   The scan has to say so honestly, the search has to leave the bag it was given, and every
   suggestion has to score what it claims when you actually apply it.
   ------------------------------------------------------------------ */
console.log('\nSYMMETRY  (a closed row is a mirror of itself, or it says by how much it is not)');
{
  // a square walked from a corner: 4L round, and the centre line is crossed at L/2 and 3L/2.
  // c = L, so the holes are symmetric exactly when the count is a multiple of four
  const box = (n) => {
    const seg = [['L',0,0,80,0],['L',80,0,80,80],['L',80,80,0,80],['L',0,80,0,0]];
    return E.symErr(seg, n, true, 0);
  };
  /* Walked from a corner, the centre line falls at a quarter of the way round, so c is L/2
     and c/p is n/4: a multiple of four lands a hole on the line, an odd quarter straddles it
     with a gap, and anything else is out by whatever n/4's fraction is. */
  const r8 = box(8), r9 = box(9), r4 = box(4), r10 = box(10);
  ck(r8 && r8.err < 1e-6, 'eight holes round a square are symmetric and it said otherwise');
  ck(r8 && r8.onCentre, 'eight holes put one on the centre line and it said they did not');
  ck(r4 && r4.err < 1e-6 && !r4.onCentre,
     'four holes round a square are the corners: symmetric, with a gap on the centre line');
  ck(r9 && Math.abs(r9.err - 0.25) < 1e-6,
     'nine holes round a square are a quarter of a hole out; it said ' + (r9 ? r9.err.toFixed(3) : 'nothing'));
  ck(r10 && Math.abs(r10.err - 0.5) < 1e-6,
     'ten holes round a square are half a hole out; it said ' + (r10 ? r10.err.toFixed(3) : 'nothing'));
  ck(E.symErr([['L',0,0,80,0]], 8, false, 0) === null, 'an open run was given a symmetry error');
  // an outline with no mirror at all must not be scored as though it had one
  const skew = [['L',0,0,80,0],['L',80,0,60,50],['L',60,50,0,80],['L',0,80,0,0]];
  ck(E.symErr(skew, 12, true, 0) === null, 'a shape with no mirror was scored against one');
}
for (const key of Object.keys(E.PRESETS)) {
  load(key);
  const was = { W: S.W, H: S.H, D: S.D, sw: S.strap.width, tl: S.strap.tabLen,
                els: JSON.stringify(S.elements.map(e => [e.w, e.h])) };
  const before = JSON.stringify(E.draft().plan);
  const A = E.symAdvice();
  ck(S.W === was.W && S.H === was.H && S.D === was.D && S.strap.width === was.sw &&
     S.strap.tabLen === was.tl && JSON.stringify(S.elements.map(e => [e.w, e.h])) === was.els,
     key + ': the symmetry search moved the bag');
  ck(JSON.stringify(E.draft().plan) === before, key + ': the symmetry search left a trial in the seam plan');
  ck(isFinite(A.base.cost) && A.base.cost >= 0, key + ': nonsense symmetry score');
  ck(A.best.length <= 3, key + ': too many symmetry suggestions to read');
  A.base.runs.forEach(r => {
    ck(r.err >= 0 && r.err <= 0.5001, key + ' [' + r.key + ']: a symmetry error outside 0..half a hole');
    ck(r.axis === 0 || r.axis === 1, key + ' [' + r.key + ']: a mirror about no axis at all');
  });
  ck(A.base.off.every(r => r.err > E.SYM_OK), key + ': a row inside the tolerance was listed as out');
  A.best.forEach(o => {
    ck(o.gain > 0, key + ': suggested ' + o.k + ' ' + o.to + ' with nothing to gain');
    ck(o.to !== o.was && Math.abs(o.to - o.was) <= 5, key + ': suggested a nudge nobody asked for');
    // it has to be true: set it, re-draft, and the score really is better by what it says
    E.symSet(o.k, o.to);
    const now = E.symScan(E.draft());
    E.symSet(o.k, o.was); E.draft();
    ck(Math.abs((A.base.cost - now.cost) - o.gain) < 1e-9,
       key + ': the ' + o.k + ' symmetry suggestion does not score what it says it does');
  });
}

/* ------------------------------------------------------------------
   THE MOUTH OF A SHAPE YOU DRAW.  The profile is the stitch line along the BODY and the
   finished edge along the MOUTH, so the leather that runs past it is a seam allowance on one
   arc and a turn allowance on the other. Growing the whole outline by the seam allowance put
   the mouth's row two allowances from the cut edge, which is not a distance anything on the
   bag measures - and it is measured here, not assumed.
   ------------------------------------------------------------------ */
console.log('\nA MOUTH IS A HEM, NOT A SEAM  (every row the distance from the cut edge it prints)');
for (const [name] of E.FREE_SHAPE_NAMES) {
  for (const edge of ['raw', 'turned']) {
    load('crossbody');
    S.construction = 'free'; S.top = 'open'; S.gussetStyle = 'wrap';
    S.edge = edge; S.lined = true;                  // lined, so the rim row is drawn at all
    S.free = { pts: E.freeShape(name) };
    E.sanitise();
    let m;
    try { m = E.draft(); } catch (e) { ck(false, name + '/' + edge + ' THREW ' + e.message); continue; }
    const tag = name + '/' + edge;
    // anything the drafter has warned about is a message to the maker, not a fault in the draft
    const quiet = m.warn.filter(w => /in from the cut edge|pinches/.test(w)).length;
    m.pieces.forEach(p => {
      if (p.derived || !/panel/i.test(p.name)) return;
      const cut = p.draw.find(i => i.t === 'cut');
      if (!cut) return;
      const pts = [...cut.d.matchAll(/([-\d.]+)[ ,]([-\d.]+)/g)].map(x => [+x[1], +x[2]]);
      p.draw.forEach(sm => {
        if (sm.t !== 'seam' || sm.ins == null) return;
        const ds = [];
        E.seamHoles(sm.segs, sm.n, sm.closed).forEach(h => {
          ck(E.polyHas(pts, h.x, h.y), tag + ' [' + sm.key + ']: a hole outside the cut outline');
          const d = E.polyDist([h.x, h.y], pts);
          ck(d > 1.5, tag + ' [' + sm.key + ']: a hole ' + d.toFixed(2) + ' mm from the cut edge');
          ds.push(d);
        });
        /* The number printed beside the row is what the row was drafted to, and it has to be
           what the row MEASURES along its length. A profile pinches here and there and the
           drafter warns where it does, so the typical hole is the one to check - and where it
           has warned, the maker has been told and the drawing is not lying to anybody. */
        if (!ds.length || quiet) return;
        ds.sort((a2, b2) => a2 - b2);
        const mid = ds[Math.floor(ds.length / 2)];
        ck(Math.abs(mid - sm.ins) < 0.8, tag + ' [' + sm.key + ']: prints ' + sm.ins.toFixed(1) +
           ' from the cut edge and the holes sit ' + mid.toFixed(1) + ' in');
      });
    });
  }
}
/* The strap meets the bag on the gusset, and on a shape she drew the strip IS the gusset.
   It was drafted on every other construction and on none of these, so the tab on the side
   elevation had nothing on the pattern to be sewn to. */
{
  ['adjust', 'fixed'].forEach(type => ['swivel', 'sewn'].forEach(attach => {
    load('crossbody');
    S.construction = 'free'; S.gussetStyle = 'wrap'; S.top = 'open';
    S.strap.type = type; S.strap.attach = attach; S.strap.tabRot = 18;
    S.free = { pts: E.freeShape('oval') };
    E.sanitise();
    const m = E.draft();
    const key = attach === 'swivel' ? 'tabbox' : 'strapbox';
    const on = m.pieces.filter(p => p.draw.some(sm => sm.t === 'seam' && sm.key === key));
    ck(on.some(p => /Gusset/.test(p.name)),
       type + '/' + attach + ': the strap does not land on the gusset of a shape you drew');
    // and it lands on exactly the pieces it does on a gusseted bag - the free construction is
    // the wrap gusset with a different outline and nothing else
    S.construction = 'gusset';
    const ref = E.draft().pieces.filter(p => p.draw.some(sm => sm.t === 'seam' && sm.key === key)).length;
    S.construction = 'free'; E.draft();
    ck(on.length === ref, type + '/' + attach + ': ' + key + ' is on ' + on.length +
       ' pieces here and ' + ref + ' on a gusseted bag');
  }));
}

/* ------------------------------------------------------------------
   ARRANGING.  A main piece has a sheet of its own and nothing to gain from being dragged
   about; a stray drag on one was hard to undo. Only the bits and the diagrams are moveable,
   and an arrange entry against a main piece has to be ignored rather than honoured.
   ------------------------------------------------------------------ */
console.log('\nARRANGING  (main pieces stay on their own sheet, bits go where they are put)');
for (const key of Object.keys(E.PRESETS)) {
  load(key);
  const m = E.draft();
  const shown = m.pieces.filter(p => !p.derived);
  const [sw2, sh2] = E.SHEETS[S.sheet];
  const pad2 = S.dims ? { l: 18, t: 27, r: 6, b: 8 } : { l: 6, t: 15, r: 6, b: 6 };
  const PW2 = sw2 - 2 * E.MARGIN, PH2 = sh2 - 2 * E.MARGIN;
  // put every piece somewhere absurd and see which ones actually move
  S.arrange = {};
  shown.forEach(p => { S.arrange[p.key] = { s: 0, x: 3, y: 3, r: false }; });
  const L = E.layoutSheets(shown);
  L.sheets.forEach(sh3 => sh3.items.forEach(it => {
    const role = E.pageRole(it.p, PW2, PH2, pad2);
    if (role === 'small' || role === 'note') return;
    ck(!it.held, key + '/' + it.p.name + ': a ' + role + ' piece was moved by hand');
  }));
  S.arrange = {};
}

/* ------------------------------------------------------------------
   TWO SIDES OF ONE POCKET.  Anything whose SHAPE is a mirror image of itself about its own
   centre line has to be pricked that way too. A run that goes down one side of a pocket and
   back up the other is not one run - the fold between them is never pricked - and drawn as
   one it lost the hole on the join, which put one more hole down the right of every pocket
   than down its left. Closed footprint boxes are excluded: those start at a corner and are
   the symmetry search's business, not this one.
   ------------------------------------------------------------------ */
/* ------------------------------------------------------------------
   ZIPS.  Three ways to put one on and six constructions to put it on. Every run a zip draws
   has to meet a run of the same length somewhere, the chain has to be quoted at the length
   the bag actually needs, and a mouth that is being zipped must not also be sewn shut.
   ------------------------------------------------------------------ */
console.log('\nZIPS  (every tape meets a row of its own length, and the mouth is not sewn shut)');
for (const con of ['gusset', 'boxed', 'bucket', 'barrel', 'fold', 'free']) {
  for (const st of ['rim', 'wrap', 'panel']) {
    load('crossbody');
    S.construction = con; S.top = 'zip'; S.zip.style = st; S.zipPkt.on = true;
    E.sanitise();
    const tag = con + '/' + st;
    let m; try { m = E.draft(); } catch (e) { ck(false, tag + ' THREW ' + e.message); continue; }
    const runs = {};
    m.pieces.forEach(p => p.draw.forEach(sm => {
      if (sm.t !== 'seam' || !/^zip/.test(sm.key)) return;
      (runs[sm.key] = runs[sm.key] || []).push({on: p.name, len: E.runLen(sm.segs), n: sm.n});
    }));
    Object.entries(runs).forEach(([k, list]) => list.forEach(r => {
      ck(Math.abs(r.len - list[0].len) < 0.05, tag + ' [' + k + ']: ' + r.on + ' is ' +
         r.len.toFixed(1) + ' long and ' + list[0].on + ' is ' + list[0].len.toFixed(1));
      ck(r.n === list[0].n, tag + ' [' + k + ']: ' + r.on + ' has ' + r.n + ' spaces, expected ' + list[0].n);
    }));
    // the tape has to land on something: a zip that draws no run at all is a zip you cannot sew
    ck(runs.ziptape || runs.ziprim, tag + ': nothing on the bag for the zip to be stitched to');
    // a mouth being zipped is not also seamed shut
    const shut = m.pieces.some(p => p.draw.some(sm => sm.t === 'seam' && sm.key === 'barrelseam'));
    ck(!(con === 'barrel' && shut), tag + ': the tube is zipped AND seamed shut along the same edge');
    /* The chain has to reach: never shorter than the row it runs beside. Only the rows the
       MOUTH zip draws count - zipwindow and zipbag belong to the interior pocket, which has a
       zip of its own quoted separately. */
    const mouthRuns = ['ziptape', 'ziprim', 'zipwrap'].flatMap(k => runs[k] || []);
    const longest = Math.max.apply(null, mouthRuns.map(r => r.len).concat([0]));
    ck(E.zipSpan() >= longest - 0.5, tag + ': the chain is quoted at ' + E.zipSpan().toFixed(0) +
       ' and a single tape row is already ' + longest.toFixed(0) + ' long');
  }
}

/* ------------------------------------------------------------------
   CARD SLOTS.  Two builds, and they are different bags of leather. `pockets` cuts n of one
   piece and makes the pocket with a stitch line ON THE LINING; `faced` cuts n heights on one
   common bottom edge and lets the lining be the back of the deepest. Either way a card is
   85.6 x 54 and has to fit, be held, and still be gettable - and every pocket line has to be
   on both the piece and the panel it is stitched to, or there is nothing to sew it against.
   ------------------------------------------------------------------ */
console.log('\nCARD SLOTS  (a card fits, is held, and can still be got out)');
for (const build of ['pockets', 'faced']) {
  for (const n of [1, 2, 3, 5]) {
    for (const rot of [0, 90, 200]) {
      load('bifold');
      S.cards.on = false; S.slip.on = false;
      const el = E.newElement('cards');
      el.face = 'inside'; el.build = build; el.slots = n; el.rot = rot; el.y = 14;
      S.elements = [el]; S.elSeq = el.id;
      E.sanitise();
      const tag = build + '/' + n + '/' + rot;
      let m; try { m = E.draft(); } catch (e) { ck(false, tag + ' THREW ' + e.message); continue; }
      const G = E.cardsGeom(S.elements[0]);
      // a card has to go in, be held, and still show enough to pinch
      ck(G.slotW >= E.CARD_W, tag + ': ' + G.slotW.toFixed(1) + ' between the stitch lines, and a card is ' + E.CARD_W);
      for (let k = 0; k < G.n; k++) {
        ck(G.depth(k) >= 12, tag + ': slot ' + (k+1) + ' is only ' + G.depth(k).toFixed(0) + ' deep');
        ck(E.CARD_H - G.depth(k) >= 6, tag + ': slot ' + (k+1) + ' leaves only ' +
           (E.CARD_H - G.depth(k)).toFixed(0) + ' of the card showing');
      }
      // all of one size on a pockets build; a cascade of heights on a faced one
      const hs = [...Array(G.n).keys()].map(k => +G.pieceH(k).toFixed(3));
      ck(build !== 'pockets' || new Set(hs).size === 1,
         tag + ': the pockets build cut ' + new Set(hs).size + ' different sizes, not one');
      ck(build !== 'faced' || G.n === 1 || new Set(hs).size === G.n,
         tag + ': the faced build did not cascade');
      // the pieces, and the runs that hold them on
      const cut = m.pieces.filter(p => /Card (pocket|slot) /.test(p.name));
      ck(cut.length === G.n, tag + ': ' + cut.length + ' pieces cut for ' + G.n + ' slots');
      const runs = {};
      m.pieces.forEach(p => p.draw.forEach(sm => {
        if (sm.t === 'seam' && /^el\d/.test(sm.key)) (runs[sm.key] = runs[sm.key] || []).push({on: p.name, len: sm.len, n: sm.n});
      }));
      if (build === 'pockets') {
        const bot = runs['el' + el.id + 'p'] || [];
        ck(bot.length === G.n + G.n, tag + ': ' + bot.length + ' pocket lines for ' + G.n +
           ' pockets - each one wants a line on its piece AND on the panel');
        bot.forEach(r => ck(Math.abs(r.len - bot[0].len) < 0.05 && r.n === bot[0].n,
          tag + ': ' + r.on + ' pocket line differs from the panel it is stitched to'));
        ck(bot.some(r => /lining|Wrap/.test(r.on)), tag + ': no pocket line on the panel');
      } else {
        const side = runs['el' + el.id + 'side'] || [];
        ck(side.length >= 2 + 2*G.n, tag + ': the faced stack has ' + side.length + ' side rows');
      }
      // and it is still on its own leather however it is turned
      m.pieces.forEach(p => p.draw.forEach(sm => {
        if (sm.t !== 'seam') return;
        E.seamHoles(sm.segs, sm.n, sm.closed).forEach(h =>
          ck(h.x > 1 && h.y > 1 && h.x < p.w - 1 && h.y < p.h - 1,
             tag + '/' + p.name + ' [' + sm.key + ']: hole off the blank'));
      }));
    }
  }
}
/* The wallet itself: laminated, and with a note pocket you can actually get a note into. */
{
  load('bifold'); E.sanitise();
  const m = E.draft();
  const outer = m.pieces.find(p => p.key === 'Wrap');
  const inner = m.pieces.find(p => p.key === 'liningWrap');
  ck(outer && inner, 'the wallet has no inside layer');
  if (outer && inner) {
    ck(Math.abs(outer.w - inner.w) < 0.01 && Math.abs(outer.h - inner.h) < 0.01,
       'a wallet is laminated: the inside layer is cut ' + inner.w.toFixed(1) + ' x ' + inner.h.toFixed(1) +
       ' and the outer ' + outer.w.toFixed(1) + ' x ' + outer.h.toFixed(1));
    const side = n2 => n2.draw.filter(sm => sm.t === 'seam' && sm.key === 'wrapside');
    ck(side(outer).length === 2 && side(inner).length === 2,
       'the two layers are not stitched to each other up both sides');
    ck(side(outer)[0] && side(inner)[0] && side(outer)[0].n === side(inner)[0].n,
       'the two layers are pricked to different counts');
    // the rims are the note pocket: stitching them shut is what leaves nowhere for a note
    ck(!outer.draw.some(sm => sm.t === 'seam' && sm.key === 'rim'),
       'the wallet sews its own note pocket shut along the rims');
  }
  ck(S.elements.filter(e => e.type === 'cards').length === 2,
     'the wallet does not come with two card stacks');
}

console.log('\nMIRRORED RUNS  (a symmetric run is pricked symmetrically)');
{
  const mirrorFaults = (m, tag) => {
    m.pieces.forEach(p => p.draw.forEach(sm => {
      if (sm.t !== 'seam' || sm.closed) return;
      const L = E.runLen(sm.segs);
      if (!(L > 2)) return;
      const K = 96, samp = [];
      for (let i = 0; i <= K; i++) { const q = E.ptAt(sm.segs, L*i/K); samp.push([q.x, q.y]); }
      const xs = samp.map(q => q[0]);
      const lo = Math.min.apply(null, xs), hi = Math.max.apply(null, xs);
      if (hi - lo < 3) return;                       // nothing wide enough to have two sides
      const cx = (lo + hi)/2;
      const near = (pt, set) => Math.min.apply(null, set.map(q => Math.hypot(q[0]-pt[0], q[1]-pt[1])));
      const geo = Math.max.apply(null, samp.map(q => near([2*cx - q[0], q[1]], samp)));
      if (geo > 0.6) return;                         // the shape itself is not a mirror image
      const hs = E.seamHoles(sm.segs, sm.n, sm.closed).map(h => [h.x, h.y]);
      const bad = hs.filter(h => near([2*cx - h[0], h[1]], hs) > 0.5).length;
      ck(!bad, tag + '/' + p.name + ' [' + sm.key + ']: ' + bad + ' of ' + hs.length +
         ' holes have nothing opposite them on a run that is a mirror image of itself');
    }));
  };
  for (const key of Object.keys(E.PRESETS)) { load(key); E.sanitise(); mirrorFaults(E.draft(), key); }
  // and every way a zip can be put on, on every construction that offers one
  for (const con of ['gusset', 'boxed', 'bucket', 'barrel', 'fold', 'free']) {
    for (const st of ['rim', 'wrap', 'panel']) {
      load('crossbody');
      S.construction = con; S.top = 'zip'; S.zip.style = st; S.slip.on = true; S.cards.on = true;
      E.sanitise();
      let m; try { m = E.draft(); } catch (e) { ck(false, con + '/' + st + ' THREW ' + e.message); continue; }
      mirrorFaults(m, con + '/' + st);
    }
  }
}

console.log('\n' + (fail ? fail + ' PROBLEMS in ' + checks + ' checks' : 'ALL ' + checks + ' CHECKS PASS'));
process.exit(fail ? 1 : 0);
