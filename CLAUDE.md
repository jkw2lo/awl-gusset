# Awl & Gusset — working notes

A parametric flat-pattern drafter for hand-sewn leather bags. It runs as a static page with no
build step and no dependencies: open `index.html` and it works.

**Read this before changing anything.** Most of what follows is hard-won — several rules exist
because the obvious approach produced a pattern that could not be sewn, and the note says what
each one cost.

This repository is **v2**, the drafter that knows the most shapes. A separate ground-up rebuild
(v3) and a wallet drafter (Bill & Fold) live outside it; nothing here describes them.
`docs/rebuild-brief.html` is the handover written from v2 in August 2026 — it is the best single
account of what this tool knows about leather, and worth reading before a large change.

## Who it is for

Jennifer designs and draws bags, then struggles to draft the flat pattern. She **hand sews
with pricking irons**, so stitch-hole planning is a first-class part of the design, not a
finishing touch. She works at a bench: measurements matter more than renderings. Support mm
and inches (US leatherwork uses 1/16" fractions); leather is bought by the square foot.
"Seam allowance" to her means *the distance from the cut edge to the stitch line*.


## Layout

```
awl-gusset/
├── index.html            the page: the markup, and the load order of everything below
├── src/                  the drafter, one concern per file — see "Architecture"
│   ├── styles/           base.css (the page frame), app.css, sheet.css (the pattern card)
│   └── *.js              plain scripts, one shared global scope, no imports
├── tests/check.js        4.5M assertions over the same files the page loads
├── designs/*.bag.json    the seven starting points, also built into the drafter
├── docs/rebuild-brief.html   the August 2026 handover
└── CLAUDE.md             this file
```

There is nothing to install and nothing to build. `index.html` is the only place the load
order is written down, and `tests/check.js` reads it from there rather than keeping a second
copy — add a file to `src/`, add a `<script src>` line, and the suite picks it up.

## Working on it

1. Edit the file in `src/` that owns the concern. If it is a new concern, add a file and a
   `<script src>` line in `index.html` at the right point in the order.
2. `npm test` (or `node tests/check.js`) — must be all-pass. It takes under a minute.
3. Preview with `python3 -m http.server 8731` and open `http://localhost:8731`.

Two things bite every time when previewing: `http.server` sends `Last-Modified` and the
browser will happily 304 your edit away, so hard-reload or navigate with a `?v=N` that
changes; and the design autosaves to localStorage, so clear it before loading a preset or you
will be testing yesterday's bag.

**Load order is a real constraint.** Every file is a separate classic script sharing one global
scope, so a function may *call* anything from anywhere — calls happen long after the page has
loaded — but at *load* time a file may only touch what an earlier file has already defined.
That is why `free-shape.js` is read before `model.js`: the initial state is seeded with a
profile. The LOAD ORDER section of the test suite is what notices when this is got wrong; the
sections below it cannot, because they evaluate every file as one program.

**Publishing it as a Claude artifact still works**, and the source is kept dual-use on purpose:
`src/save-file.js` is the browser's own version of the artifact host's `downloads` capability,
and `wiring.js` prefers the host's when there is a host. To publish, inline the files back into
one HTML document in the order `index.html` lists, escape every non-ASCII character (`\uXXXX`
inside `<script>`, `&#xNNNN;` outside it — the artifact wrapper supplies its own `<head>`), and
pass `capabilities: {downloads: true}`.

## Architecture

Vanilla JS, no framework, no build. The shape of it is a pipeline: **the design** (`S`) is
drafted into **pieces** (`draft()`), and every renderer is a reader of those pieces. Nothing
downstream writes back.

| File | What it owns |
|---|---|
| `save-file.js` | Handing the reader a file, in a browser or in an artifact frame |
| `free-shape.js` | The drawn profile: `freeShape`, `filletPoly`, `freeProfile` |
| `model.js` | `S` — the whole design — plus the presets, units, rivet arrangements and the control schema |
| `geometry.js` | Path helpers, all in millimetres: entasis, shaped ends, arcs |
| `seams.js` | The seam registry and stitch holes — `planSeam`, `trimRun`, `attachOn` |
| `engine.js` | `bodyPanels()`: the shell constructions, `free` among them |
| `elements.js` | Every part you add to a bag: its footprint, its cut piece, its stitch runs |
| `draft.js` | `draft()` — assembles every piece, the stitch plan, hardware, stats and build order |
| `render-sheets.js` | The pattern on paper: `pageRole`, `layoutSheets`, `renderPattern`, `renderFull` |
| `render-inside.js` | The walls unrolled, plus a section — for designing the interior |
| `shape-editor.js` | `renderShape`, `freeRenorm`, `seedFree` — dragging the profile about |
| `render-elevation.js` | The six orthographic views, and dragging features into place on them |
| `render-3d.js` | The lit, depth-sorted model |
| `render-cutlist.js` | The cut list and build order, and `stitchFit` / `stitchAdvice` |
| `pdf.js` | A vector PDF written from scratch — pattern, and the info pack |
| `designs.js` | The design file: `snapshot`, `applyDesign`, `sanitise`, the browser library |
| `picker.js` | One menu, ours, in a layer of its own |
| `inspector.js` | The floating panel for whichever part is selected |
| `wiring.js` | The control rail, every event handler, and the only code that touches the DOM at load |

The **seam registry is the spine**. A seam is planned once to a hole count and every piece
carrying that key reads the same number off the plan; that is the single decision that makes
the drafter correct rather than approximately correct, and the invariants below hang from it.

### The tests

`tests/check.js` reads the load order out of `index.html`, takes everything above the first
`document.getElementById('rail')` — which is all of it bar the wiring — and runs it in node, so
the tests exercise the files the site actually serves rather than a copy.

Besides the presets it sweeps 2200+ combinations of construction, gusset cut, edge, top, strap
build, carry, zip style, end shape, handle build, squareness, entasis, roll closure, rivet
arrangement, tab angle and offset, closure count and pull tab — presets alone only cover the
combinations the presets happen to use, and three real bugs were hiding in the ones they miss.

A **second sweep covers the added elements** — every type, on every face it offers, every way
its mouth can point, turned four ways — because the presets carry almost none of them and the
construction sweep never touched them at all. It found two real bugs the day it was written: a
bellows pocket whose footprint on the panel was 84 mm shorter than the run on its own blank
under the same seam key, and a keeper element sharing the key `keeperlap` with the strap's
built-in keeper. Anything the drafter itself warns about (`runs off`) is skipped: that is a
message to the maker, not a fault in the draft.

The rest assert properties rather than snapshots, which is why they keep finding things:
**LOAD ORDER** stands each file up on its own, in the order `index.html` lists it.
**PAGINATION** lays every preset out on A4, Letter and A3 with dimensions on and off, and
asserts nothing is left off the paper, nothing hangs off the printable area, the bits are drawn
after the panels, and the windows onto an oversized piece cover the whole of it. **STITCH FIT**
asserts the advice leaves the bag and the seam registry exactly as it found them, and that
every suggestion really does score what it claims. **RIVETS** drives every arrangement through
the draft and checks a bare count reads back as an arrangement holding that many. **PADDED
STRAP** measures the foam line's distance from the cut edge all the way round. **SYMMETRY**
proves the arithmetic on a bare square, refuses to score an outline with no mirror, and drives
the search over every preset. **A MOUTH IS A HEM** measures every row that prints a distance
against the cut outline it actually has. **ARRANGING** puts every piece somewhere absurd and
asserts only the bits moved. **ZIPS** drives all three styles over all six constructions and
asserts every zip run meets a run of its own length, that the mouth has something to be
stitched to, that a zipped tube is not also seamed shut, and that the chain is never quoted
shorter than a single tape row. **MIRRORED RUNS** takes every open run whose SHAPE is a mirror
of itself and asserts the holes are too — the test that would have caught the pocket sides on
the day. **A SHAPE YOU DRAW** drafts every starting shape against every top it supports and
proves the three things that make the construction sewable: the mouth and the body add up to
the way round, the strip is cut to exactly the run it meets, and every hole lands on its own
blank.

## Invariants — do not break these

**Mating pieces share a seam KEY.** A seam is planned once (`planSeam`) and every piece
carrying that key gets the identical hole count. This is why a gusset cannot creep against its
panel. If you add a seam that joins two pieces, give both the same key.

**Every run is fitted to a whole number of holes** — the nearest EVEN count on symmetric runs,
so one hole lands on the centre mark. The real pitch drifts a few microns; that is fine and is
shown in the stitch plan.

**No hole may sit on a cut edge.** `trimRun` pulls every open run back by the seam allowance at
each end. She punches by hand and an edge hole tears out. The test asserts every hole is >1.5 mm
inside its blank.

**A fold is never pricked.** The edge opposite a folded pocket's mouth is a fold, so
`rectRunSides` (not `rectRunOpen`) is used and the fold ends are inset too.

**Rotation is an isometry.** Elements rotate freely (any degree). Panel run and piece run must
stay identical in length, count and spacing at every angle — the test checks this.

**A tapered edge slants, so it measures longer than its x-extent.** Gusset strips and clutch
side gussets are drafted *shorter* along x so the slanted stitch edge comes out the length the
panel needs (`flatLen`). Two bugs came from forgetting this.

**Strap boxes use `strapBox()`** — a canonical walk from the far corner, across the width first
— so a box on the panel and the same box on the strap land hole-for-hole however each is
rotated on the sheet.

**A four-fold strap blank is 4× the finished width**, so it cannot carry meaningful holes; it
gets the footprint outline and a "fold and glue first" note instead.

**3D paint order:** overlays inherit their host panel's sort depth via `data-on`/`data-layer`.
Average-depth sorting alone puts a tapered panel *in front of its own pocket*. The test sweeps
960 view angles asserting no panel paints over something glued to it. `pass` is the one escape
hatch, used only by the rolled mouth, which sits bodily on top of the bag but must still sort
its own faces against each other or the cylinder stops looking round.

**The model is lit, not flat.** Every face gets `fill:color-mix(var(--lea-hi) k%, var(--lea-lo))`
where k is Lambert plus a little rim light (`litPct`). The class carries the fallback colour and
the outline, so nothing is hard-coded per theme. Normals come from Newell on the bag-space
polygon, rotated with `rotDir` — not from `proj3`, whose z is a sort key rather than a true
view depth. Two things stop a flap parallel to the front from disappearing: a thickness band
along its free edge and a `v-shade` strip on the panel under it. Both are load-bearing.

**Loops and handles are held at the two ends of their LONG axis** — a pen loop is tall, a grab
handle is wide, and both the footprint and the piece must agree on which. `w × h` is the
**footprint on the bag**, tails included; the blank is that plus `loopSlack()`, the extra
length the loop needs to arch off the panel. Get this backwards and the loop either lies
flat with no gap or the two stitch boxes land in different places on panel and piece.

**A roll top is not a lid.** Panels *and* gusset carry on `rollExt()` past the finished rim as
one tube: the side seam runs to the mouth, and the gusset stops tapering at the rim
(`tA` in `gussetStrip`) because a tapered mouth cannot fold flat. `yRim` is the finished rim;
everything placed by eye — pockets, elements, strap anchors, interior — is measured from
`yRim`, never from the top of the blank.

**A zip is a chain, a tape and a slider, and the gauge drives all three.** `zipG()` fixes the
tape width, which fixes `zipInset()` — how far in the stitch line has to sit to clear the
chain. The tape is stitched the **whole** width and its ends go into the side seams; the
chain stops at the notches, `ZIP_TAB_COVER` in from each corner, so no stop is ever buried in
a seam. A run that stopped short of the corners is what made every zip in here look stuck on.

**A zip that stops at the corners cannot open.** On a gusseted bag the mouth is the front rim
*plus both gusset ends*: stop at the corners and the ends stay pinched. `zip.style: 'wrap'`
slits the top of the gusset and runs a tape each side of the slit (`zipwrap`), and `zipSpan()`
grows by `2 × zipWrap()`. Boxed bodies need none of this — they already open across W + D.

**A boxed body opens across W + D, not W.** Its flattened rim is the whole blank width, so the
mouth stiffener and the zip panel are `mouthSpan()` wide. The flap, though, attaches only
across the *back face*, inset D/2 from each side. Both of those were wrong once.

**Rounded top corners shrink the mouth.** `topR()` rounds the panel's top corners, and
everything that spans the mouth — the rim row, the zip, the drawstring channel, the zip panel,
the 3D rim plate — is `W - 2 × topR()` wide, not W. Above the rim there is no seam allowance at
all, so the body seam has to stop within SA of it: that is `topArcCut()`, and `topArcLen()` is
what the gusset must be lengthened by. Skip either and the first hole lands on the cut edge.

**A barrel is a bucket on its side.** Round panel at each end, a tube for the body, and the
seam it closes on runs along the **top** — which is where the zip goes. Its datum is that top
seam, not a rim: everything on a barrel is measured down from it, same as everywhere else.

**A taper can stop partway down.** `S.shoulder` finishes the taper before the base, leaving the
sides parallel below it — a satchel gusset. Only the slanted part gets the `flatLen` correction,
so the gusset splits into taper + rest and `at()` maps path distance across both.

**An accordion gusset is wider, not longer.** The pleat runs along the strip, so the stitch
edges do not move and the panel run is untouched; the gusset just carries `S.bellows` more
leather between them. Anything else that measures the gusset's mouth (the drawstring channel)
has to add the pleat back in.

**One definition of the mouth.** `mouthSpan()` is the only place that knows how wide the bag
opens — W for a gusset (less both top radii), W + D for a boxed body, half the base perimeter
for a bucket. The zip, the zip panel, the stiffener and the channel all read it. Three separate
copies of that rule is what put a 33 mm error in the bucket's stiffener.

**A bellows pleat folds back on itself, and the fold is not on the panel.** Each side and the
base carry `dep` of leather with TWO fold lines — out to the half fold, back at the face —
which is what lets an empty bellows lie flat and still open to `dep`. That leather is in the
FOLD: what the panel is pricked to is the finished face, w x h, and the same three sections on
the blank are the same three lengths. Both sides are therefore built from one walk,
`bellowsSegs`, with `gap` 0 on the panel and `dep` on the blank. Where the side pleat crosses
the base pleat there is a `dep` x `dep` square of leather folded over ITSELF at each bottom
corner: it is mitred and glued and **never pricked**, which is why the run is three separate
sections rather than one lap of the box — the gap between them is the corner. `attachOn` takes
an explicit `run` for exactly this, and both sides of the seam must be given the same one.
The blank is always drawn **mouth up**, so a pocket whose mouth points sideways on the bag has
its w and h swapped on its own blank; get that wrong and the run comes out `el.w - el.h` short.

**Two rows of counting numbers a strap's width apart is one number twice.** A strap carries an
edge row down each side, both pricked to the same count, and `inward()` points both sets of
numbers at the middle — so on anything narrow they land in the same three millimetres of
leather. The tick always goes down; the NUMBER is dropped when one with the same value has
already been drawn where it would land. On a wide piece both are drawn, because there both are
readable. It is measured, not switched on: the piece decides by whether the boxes touch.

**Text is laid out last, and the cheapest labels lose.** `placeText()` gives each label a box,
nudges a colliding one up to six times and then drops it. A note that cannot be read is worse
than no note. Every red note also carries a paper-coloured halo so it survives landing on a
stitch line — and so does the tile heading, which is drawn over everything on the sheet.

**Blue means both layers at once.** A run flagged `through` is one you prick with the piece
folded or clamped to its partner, so the two halves cannot drift; it is drawn in `--paper-thru`
and its count carries a dagger. Hatched panels (`{t:'wrap'}`) fold round a bar or a ring and
are not flat leather. Every run also prints its hole count, which is the fastest check there
is at the bench.

**Entasis crowns the cut edge AND the stitch line that follows it.** `S.entasis` swells long
straight cut edges outward at mid-span, so a seam that pulls in still reads straight.
`crownSeg()` puts the control point 2e off the middle because a quadratic bulges exactly half
of that, and nothing under 60 mm is crowned at all. The stitch line has to swell with it: seam
allowance here means *the distance from the cut edge to the stitch line*, and a crowned edge
against a dead-straight row of holes opens that gap by the whole crown at mid-span. So a piece
**registers** each crowned edge as it draws it (`entSide`, from inside `crownSeg`), and `SEAM()`
carries any open run that is parallel to a registered edge, inside it, and within one seam
allowance of it (`entCrown`). The run reads the parabola at its own position along *the edge*,
not along itself, which is what keeps the gap constant where it stops short of a corner.
`P()` clears the registry, because a piece's edges stop applying when the piece is finished.
Closed runs are never crowned: a box is a footprint, not an edge.
**A seam is measured before it is crowned.** `SEAM` keeps `len` from before `entCrown` and plans
off that. The crown adds about (8/3)e²/L — eight microns on a 200 mm edge — and both `planSeam`
and the test that compares two mating pieces must not be looking at drawing decoration.

**A shaped end is offset, not shrunk.** `footTipRun` pulls the footprint in with `offsetPoly`,
a true parallel offset: every edge moves its own perpendicular distance. Insetting the bounding
box instead — which is what it used to do — shortens a point in *proportion* rather than by the
inset, so the row crept in towards the tip and the margin was only right along the sides. A
corner too sharp to mitre is cut off, and where the offset folds back over itself (the two arcs
of an almond point) the vertices that fail the margin are dropped rather than drawn. The margin
is the specification; measure it, do not assume it.

**There is one definition of where a rivet goes.** `rivetPts()`, read by `attachOn` for the
pattern and by `renderElev` for the drawing. Two copies is why the tab on the elevation had its
rivets somewhere else entirely. Rows are measured in from the free end, and on a *shaped* end
from where the shape starts — nine millimetres in from an almond tip is four millimetres of
leather, and a pair set six either side of the centre line there is two holes in fresh air.
`S.strap.rivetRows/Cols/Inset/Pitch/Edge` are the arrangement; `S.strap.rivets` is derived from
it, and an old design that carries only a count has its rows and columns read back out of it.
The test asserts every `{t:'hole'}` lands on its blank, over the whole sweep.

**How square a round panel is lives in one exponent.** `baseExp(top)` turns `S.squareness` /
`S.squarenessTop` into a superellipse power that `basePts()` uses; the 3D rings and the
elevation's base plan sample the same function. Only a **barrel** end gets two of them — a
bucket's base is a plan view, and giving its halves different shapes stops them matching the
body halves. A square base with a round top is the arch a duffle actually has.

**A round base is measured off the drawing, not off a formula.** `basePerim()` walks the same
polyline `baseRun()` stitches, so the body halves and the base always add up. Ramanujan's
ellipse formula is close enough to look right and far enough out to leave you 2 mm short after
600 mm of edge. The bucket body is deliberately **straight-sided**: a flared tube is a cone,
and a cone does not unroll into a rectangle.

**A shaped blank is measured from its own drawing.** A curved strap's outer edge swings wider
than its chord; a padded strap's S wanders. Both compute their bounding box from the sampled
points and shift to the origin — guessing it put stitch holes off the edge of the piece twice.
And **concentric arcs are different lengths**, so a curved strap's two edge rows are two
seams (`edge-…-in` / `edge-…-out`), never one key.

**Render at most once a frame, and never with requestAnimationFrame alone.** One pattern can be
sixteen megabytes of SVG, and a slider fires on every pixel of travel: without coalescing, a
single drag queues dozens of full redraws and the page stops answering — that is what "it gets
stuck and I cannot switch bags" was. `renderWork()` arms **both** a frame and a 90 ms timer,
whichever lands first, because an artifact can be mounted in a hidden iframe where rAF never
fires and the page would simply stay blank. `drawNow()` catches everything and puts a
recoverable error card in the pane; nothing may leave the UI dead. The sheet view draws
`SHEET_CAP` sheets while you are editing — printing calls `renderSync()` and draws them all.

**Every label has a name, and the maker's placement outranks the pass.** `drawLabels` names
each label `piece|class|nth` — deliberately not out of its text, because a dimension that reads
130 mm today reads 140 mm the moment a slider moves and her nudge has to survive that. A label
she has dragged is put down FIRST and never nudged; one she has double-clicked off is simply
not placed. Both live in `S.labels` and therefore in the saved design. She is still held to her
own tile: a note that runs onto the neighbouring piece reads as that piece's note, which is
worse than the collision it was moved to fix — so a label already as wide as its tile can be
moved up and down but not sideways.

**A piece being dragged is what is under the pointer.** `elementFromPoint` during a sheet drag
would always answer "the sheet it came from", because the piece is following the cursor. The
drag sets `pointer-events:none` on the group for its duration so the sheet underneath answers
instead — without that a piece cannot be moved to another sheet AT ALL, which is what it did
for months. It also records where inside the piece the pointer took hold, or a piece dropped on
another sheet jumps so its top-left corner lands under the cursor.

**Below full width the sheets are a board, not a column.** `.sheetwrap.board` wraps them into
rows so the whole pattern is on screen at once — you cannot see the room left on sheet 2 while
you are scrolled to sheet 5, and you certainly cannot drag between them. `S.zoom` is `all`
(`fitAllZoom` picks the column count that fits biggest), `fit` (one sheet, full width, the old
behaviour), or a scale from 25% to 200%. `fitAllZoom` measures the pane in PIXELS and the sheet
in MILLIMETRES, so it has to go through 96/25.4; and it stops shrinking at about 150 px a sheet,
because a sheet too small to take hold of a piece on is not a view of anything. On paper the
print rules put it back to one sheet a page whatever the screen is doing.

**Every element is draggable, on every face.** Back and inside elements are drawn from behind,
so a drag right has to move them left: that is `flipX`. Gusset elements are limited by D, not W
(`across`). Anything that can be dragged also gets a `cx`/`cy0` so `guide()` can draw the centre
line and the two gaps, and snap to centre within `SNAP`.

**A shaped end is drawn in one direction.** `tipProfile()` walks from one side of the strap,
round the point, to the other — a single unbroken run. Building it out-and-back from the
middle draws a bow tie, which is exactly what it did the first time and why nothing looked
shaped. The same profile is used three times over: the cut outline of the piece, the footprint
`footTip()` puts on the panel, and the anchor in the elevations. The stitched box inside it
stays square, because a square box is what you actually prick.

**A handle is not a short strap.** `handles.build` — single, layered, folded or rolled —
decides the blank width (`handleBlankW()`), what stitching it carries, and how wide the tail
lands on the bag (`handleTailW()`). A rolled handle's tail is the strip squashed flat, which is
much wider than the handle you hold; `handleFoot()` is the one place that knows this, and the
panel footprint, the reinforcement patch and the 3D model all read it. Handles keep their own
width, anchor height, fixing and rivet count — borrowing the strap's was the confusing part.

**A shaped end is clamped in two places or not at all.** `tipStrip()` and `footTip()` both
shorten the point so it cannot eat a short tab — and both must pass that shortened length into
`tipProfile()`. Clamping the offset but not the profile is what walked the ring tab's stitch
line clean off the end of the piece.

**Both sides of a seam decide the same way, so the KEY decides.** `SHAPED_END` and
`THROUGH_BOTH` are keyed by seam key inside `attachOn`, not passed per call. Passing them at
each call site is how the panel ended up with a square box and the tab with a shaped one, 2 mm
apart. If a footprint needs a shape or a through-stitch, put it in those tables.

**A half gusset has one rim end.** The other end is the base join, which is a seam. Giving both
ends a `rimend` row put the same hole count on two runs 19 mm different in length.

**Two rows of holes on the same line is a piece you cannot prick.** A strap's edge row ran the
whole length while an attachment box put its own long side at the same inset — two rows a hair
apart at two different pitches. `strapPiece` takes an `ends` pair and stops the edge rows clear
of the boxes; the top handle does the same. The node test `coincident()` now checks *every*
piece on *every* sweep combination for parallel runs from different keys within 0.9 mm that
overlap for more than 8 mm, and it found five more the same shape: the pull tab's box on the
flap's edge row, the cord channel's upper row on the rim row (`rimRowOn()` — the channel's row
*is* the rim row and does the same job, so only one is drawn), the same on the gusset ends, and
the roll tab across the rim row. **You cannot prick a fold either:** the D-ring tab's hatched
wrap zone was drawn 20 mm wide inside a 14 mm allowance, so its stitch box started inside the
fold. The bar allowance is now sized from the wrap it has to make, with a real gap before the
first hole.

**A count belongs on the leather it is counting.** `inward()` points every hole count and
counting tick at the middle of the PIECE — not the tile, which on a 20 mm strap is above the
blank entirely — and labels flagged `keep` are held inside the piece box rather than the tile
box. A number in the waste is a number you burnish off.

**The count sheet is on the pattern, not just in the cut list**, because that is where you are
when a seam has drifted. Every run, piece by piece, with what it shares its count with.

**A bag has two sides and they are not the same drawing.** A D-ring tab on the left and a pen
loop on the right live at opposite ends of one gusset strip. `el.side` picks an end (`mirror`
still means both), and `sideView(px, isLeft)` draws either — the right one mirrored, front at
the right, with its own drag handles. `base` is a face too: it is drafted onto whatever piece
actually is the bottom (the middle of a wrap gusset, the separate base panel, the fold across a
boxed body, the round base of a bucket, the bottom of a barrel's tube) and placed from the
BOTTOM plan. Six views now: front, left, back, right, and the two plans under them.

**Every scrap of text on a piece goes through ONE placement pass.** It used not to: only
`{t:'text'}` items were laid out, while the hole counts, the fold and mark labels, the rivet
names, the grain caption, the dimension numbers and the tile's own heading were all drawn
straight down wherever their geometry happened to be. On a two-layer top handle — 26 mm tall,
with the piece name, two notes, the grain arrow and both edge-row counts at mid-span — that is
four things in the same 4 mm of paper. `drawItems` now *collects* every label (its own,
`drawDims`', and the tile heading pushed in by `pieceGroup`) and places them together.
`pri` ranks them: −2 the heading, −1 its subtitle, 0 the piece's own name, 1 a number or a
label belonging to one mark, 2 a note. Three things make the pass actually work, and all
three were bugs:
- **`textBox` turns with the text.** Measuring a rotated label as though it were lying down
  compares a box that was never there, which is how a vertical dimension sat on a grain arrow.
- **A rotated label moves too** — along its *own* perpendicular, so it stays parallel to
  whatever it labels. Nailing them down meant two turned labels in one place simply stacked.
  They are still sorted first, because they are the most constrained.
- **A label must stay on its own tile.** `placeText` takes the tile box: too wide and it is
  shrunk to fit, then slid back inside, and dropped if it still will not. A note that runs off
  its tile lands on the neighbour, where it reads as *that* piece's note.
The mono face advances about **0.62 em**, not 0.56; under-measuring is how a count ended up
half under a name the collision test thought it had cleared. A node test drives `placeText`
with 90 crowded labels and asserts nothing overlaps and nothing escapes the tile.

**Counting ticks are indexed from the centre, not from an end.** Two pieces sharing a seam KEY
are pricked to the same hole count, so the tenth hole out from the centre on one is the tenth
hole out from the centre on the other — hold them together and you can see whether they are
still in step, which is the thing that actually goes wrong halfway down a 600 mm seam.
Counting from an *end* would depend on which way each run happened to be walked, and the two
sides of a seam are built independently. `S.stitch.reg` is the interval; closed runs get none.

**One definition of a rivet arrangement.** `RIVET_PATS` names them the way you would ask at the
bench — two across, two stacked, triangle, inverted triangle — and `rivetPts()` is the only
thing that turns a name into positions. It is read by `attachOn` for the pattern and by
`renderElev` for the drawing; two copies of that rule is why the tab on the elevation had its
rivets somewhere else entirely. Rows are measured in from the free end, and on a *shaped* end
from where the shape starts, not from the point. `S.strap.rivets` is derived; an old design
carrying a bare count, or a rows/cols pair, has a pattern read back out of it in `sanitise`.

**A band means the leather folds under.** `{t:'fold', band:[x,y,w,h]}` tints the strip that
ends up behind the piece — turn allowances, a pocket's top hem, the outer quarters of a
four-fold blank. Only where the leather genuinely doubles: a boxed base fold or an accordion
pleat is a crease, not a doubling, and gets the line alone. Every fold line carries a label;
an unlabelled dash-dot line on a 40 mm tab is a riddle.

**An assembly diagram is a piece that is not a piece.** `diagram:true` keeps it out of the
stats, the cut list and the dimension pass, but it lays out on a sheet like any other tile and
says so in its subtitle. They exist for the things that are obvious once you have made one and
baffling before: a card stack is five pieces on one bottom edge, a padded strap is a sandwich
with the foam held back from the edge (which is what that dashed red outline on the blank
means), and an adjustable strap is four separate things that only make sense threaded. Each is
gated on the build it explains, so a given design sees the three or four that apply to it, not
all eight — if that reads as "some are missing", add one for the build that has none.

**The top face is the part of the flap that lies over the mouth**, so there is no top without a
flap — `faceOn()` is what the element face selector filters on, and the drafter warns rather
than silently moving anything. It is drafted into the band between the flap's two fold lines
and drawn in the plan view, which is where you place it.

**The plan goes under its elevation.** The top view is the only one that shows what the top of
a bag actually is: the mouth, how far the flap reaches across it, and whether a grab handle
would clear both.

**The drawing is an editor, and the schema is the single source of controls.** `MODULES` is
read twice: the rail stacks every module, and the inspector shows only the one belonging to
whatever was clicked. Both emit the same `data-p`, so a control can be on screen twice; that is
why `fieldHTML` takes an id prefix and why `syncInput` and the input handler write to
`querySelectorAll`, never `querySelector`. `SEL` is the selection; a part of the drawing opts in
by carrying `data-sel` (and `data-eid` for an element).

**The inspector lives outside the panes.** A pane's innerHTML is replaced on every render, and a
slider being dragged must not be pulled out from under the pointer. `#insp` is a sibling of the
shell, `position:fixed`, and is rebuilt only when the rail is (`drawNow`'s `railPending`) —
otherwise only its selection outline is refreshed.

**A grip changes the shape, so it redraws rather than nudges.** The old drags move an element
with a `transform` and redraw on pointerup; that cannot express "the bag is now 20 mm wider".
A `DRAGS` entry with a `move()` mutates state and calls `renderWork()` on every frame. The
pointer listeners are on the **window**, which is what lets the redraw replace the node under
the pointer without ending the drag. `LIM` gives every grip the range its own slider uses, so a
grip can never drag a number past where the rail could put it back.

**A drag is not a click.** `NODRAG` is set the moment a pointer actually moves and cleared on
every fresh press (a capture listener on `#p-bag`) — a drag that ended off the edge of its own
handle must not eat the next click as well.

**A pull tab takes the closure with it.** `pullOn()` moves the lock off the flap and onto the
tab, and every mate on the body drops by `pullDrop()`. There are four places that put a closure
hole down — front panel, barrel, folded wrap, flap piece — and all four go through
`closureXs()` and `pullDrop()`. Add a fifth and it has to as well, or two turnlocks will be one
turnlock on that construction.

**Every handle is drawn LAST, in a layer of its own.** `renderElev` builds the drawing in `o`
and every `grip` and `knob` in `HND`, and `HND` is concatenated once at the end. A size adjuster
that is emitted where its geometry happens to be gets buried by the flap, the pocket and every
element on the front panel, and a handle you cannot see is a handle you cannot find. The rail
you can SEE is a short bar floating just outside the middle of the edge, in the direction that
edge travels when the number grows — which `k` already knows; the thing you can GRAB is still
the whole edge, fat and invisible. Drawn on the edge itself it sat exactly on the outline;
drawn end to end it buried the dimension.

**A handle stops where the DRAWING stops, not where the slider does.** `GEOLIM` is one table of
what each shaped number can actually reach — a corner radius at half the shorter side, a flap
radius at the drop, a taper at the depth — and `limOf()` is read fresh on every frame of a drag,
because the cap moves when the bag does. `S.corner` used to climb to 120 while the drawing
stopped changing at 95, which at the end of a pointer reads as a knob that has jammed. Past the
cap the knob says so rather than simply stopping. And a knob is only drawn where the number it
carries is what shapes that corner: a boxed body's 12 mm is its own, and the corner knob used to
appear on it and do nothing at all.

**A radius knob rides its own arc, and that point travels 41% as fast as the radius grows.**
`ARCK` winds the gain up by exactly that factor so the disc stays under the cursor. At 1:1 it
crawls away from the pointer and the number appears to fight you.

**Every menu in the app is ours.** `pickHTML` draws a button carrying its option list as JSON;
one fixed `#pop` layer holds the open list. A native `<select>` paints its popup outside the
page, which inside an artifact frame means the first click often only moves focus into the frame
and nothing opens — "the bag type menu does not show unless I refresh" — and choosing an option
fires `input`, which rebuilds the rail and pulls the open menu out from under the pointer.
Choosing sets the button's own `value` and fires `input`, so every handler that reads
`data-p` / `data-k` / `data-el` off the target keeps working untouched. **If the rail is rebuilt
while a menu is open, `pickHost()` finds the control that replaced it** — surviving the rebuild
is the whole point, and a choice that lands on a detached node is a choice thrown away.

**One definition of what a piece IS, on paper.** `pageRole()` answers `note | small | strap |
continuous | panel` from SHAPE, never from the name — a 20 mm strap and a 26 mm grab handle want
the same treatment whatever they are called, and sniffing at names goes wrong the first time a
bag has a part this file has never heard of. Every MAIN piece then gets a sheet of its own and
overflows onto as many more as it needs; the bits and the diagrams are packed last.

**A long thin piece is laid in LANES, not given a sheet each.** The page is divided the short way
into `n` bands and the piece runs through them one after another, each overlapping the last by
`OVERLAP` so the joins tape. `LANE_TARGET` is 4 for a strap and 2 for a gusset; both ways round
are costed and the cheaper wins. A 1215 mm strap in quarter-page lanes is two sheets instead of
five nearly empty ones. **Lanes touch rather than lose one:** when closing the gap is what buys
another lane they simply meet, because each lane draws its own dashed edge — and the bottom
gutter is 8 mm rather than 9 for the same reason, which is exactly what lets a 105 mm gusset with
its dimension lines take half an A4 sheet instead of a whole one.

**A tile and a lane are the same thing: a WINDOW.** `{clip:{ox,oy,w,h,full,i,n,right,down}}` on a
sheet item, drawn by the same `drawItem` as a whole piece. There is no second code path and no
`sheet.tile` any more. The node test asserts the windows onto one piece cover the whole of it: a
gap in that cover is a strip of pattern that exists nowhere, and you find out after you have cut.

**The bits are drawn AFTER the panels.** Items carry `z` — 0 a main piece, 1 a bit or a diagram,
2 one she has placed by hand — and each sheet sorts by it. One dragged onto a panel's sheet has
to land ON it, not behind it; that is the only way to use the room round a big piece.

**An assembly diagram is the one thing allowed to be drawn small.** It says so on itself and it is
not a cutting pattern, so when it will not fit the paper it is scaled to (never below 0.55).
Anything that has to be cut to size is never scaled — it goes to a main-piece layout and is taped
like any other oversize piece. And a diagram can be taken off the pattern altogether
(`S.dropNotes`), which is what the cross on its corner is for.

**One rivet arrangement, carried by anything that can be riveted.** `RIVET_PATS` sits ABOVE the
control schema because the schema is generated from it: `rivetFields(prefix, show)` is one line
per part, and the strap, the handles, the pull tab and every element all get the same four
fields. `rivetSpecAt(o)` is the one reader and `sanitiseRivets(o)` the one sanitiser; anything
carrying only a COUNT has an arrangement read back out of it. **`RIVET_BY_N` has to hold the
number it is keyed by** — five used to read back as the diamond, which is four, so a design saved
with five rivets came back with four.

**An inset is not a scaled copy.** The padded strap tapers AND its centre line wanders, so
shrinking its outline about a fixed point takes proportionally less off the narrow end than the
wide one and drags the bow back towards the straight. That is what walked the foam line off the
day pack's strap — 1.4 mm from the cut edge at one end and 10.8 at the other, when the whole
point of it is that the stitch row outside it goes through leather only. `insetPts(ins)` walks
the same parameters with the half-width reduced, `runOf` is built from it, and the node test
measures the gap all the way round.

**The stitch fit is scored, not felt.** Every run is fitted to a whole number of spaces, so the
real pitch always drifts from the iron; on a 270 mm seam that is seven microns and on a 40 mm tab
it is half a millimetre. And a run whose spaces are not a multiple of `prongs - 1` ends on a
short strike, at the end of a seam, which is where the eye goes. `stitchFit` scores a draft;
`stitchAdvice` tries W, H and D five and ten millimetres each way and says whether any of them
lands better. **It must leave the seam registry describing the bag on screen** — every trial
re-drafts, so the last thing it does is draft the real one again. Where two nudges are as good as
each other it offers the one she would rather take: growing five millimetres is an easier
sentence than losing a centimetre.

**A shape she drew is the gusset construction with a different outline, and nothing else.**
`construction: 'free'` builds two panels and a strip exactly as the wrap gusset does; the only
thing that changed is where the panel outline comes from. That is why the seam registry, the
notches, the elements, the sheets, the stitch plan and the stitch-fit search all work on a
crescent without knowing anything about it. Three rules hold it up:

- **The profile is stored NORMALISED, 0 to 1 of its own bounding box.** W and H therefore stay
  the size of the bag and nothing else, and the profile stays the shape. `freeRenorm()` is the
  ONLY thing that writes W or H from an edit: it puts the box back to 0..1 and writes the box
  out. Skip it and the sliders and the shape drift apart over a hundred small drags.
- **The MOUTH is the arc between the two points marked `m`**, taken the way that passes over
  the top. Everything else round the profile is the run the gusset is stitched to, and the
  strip is cut to exactly that length. A shape has no obvious opening; this is how she says
  where it is, and `freeProfile` is the one place that decides.
- **A point marked `skip` is one the outline goes STRAIGHT PAST.** That is the whole of
  "connect the points how you like": leave a five-point star's five valleys in and the gusset
  follows them all the way round for a star bag; skip them and the same five points make a
  pentagon. It is reversible on purpose — the point is still there, hollow, to put back.

**A negative offset GROWS an outline.** On every other construction the panel is a rectangle
and the cut size is W + 2sa; on a profile she drew, the profile IS the stitch line and the cut
edge has to be offset outward from it. Reversing the polygon does not do that: the winding sign
and the edge vector both flip and the two cancel, so the normal comes out exactly where it was.
`offsetPoly` takes the sign instead.

**A notch on a shape she drew points along its own edge's normal.** `{t:'notch', nx, ny}`
rather than one of four compass points — the whole idea of a notch is that it is square to the
edge it sits on, and on a profile with no straight edges the notches are the only thing telling
you where you are. Every corner of the profile is notched on the panel AND at the same arc
distance along the strip.

**The middle of a crescent is not on the leather.** `polyAnchor` finds the point furthest
inside a polygon, and the piece name and the grain arrow go there. A bounding-box centre is
fine on a rectangle and nowhere at all on a shape with a hollow in it. The closure gets the
same treatment the other way round: if it lands off the front panel the drafter says so rather
than drawing a hole in mid-air.

**A barrel's plan is a rectangle.** A bucket's plan really is its base outline, so it really is
the superellipse; a barrel is a tube of length W lying on its side, so from above it is W x D
with a flat end panel at each end. Drawing it with `basePts` ran the barrel's CROSS-SECTION
squareness round the plan, and a duffle carries two of those - 70 at the bottom and 15 at the
top - which is what made the duffle's top and bottom views a lopsided blob that matched nothing
on the bag. Nothing opens upward on a barrel either: the top is the seam the tube closes on.

**Feet fill the box they are drawn in.** `feetPts` reads the same `RIVET_PATS` table everything
else riveted reads - four at the corners, five with one in the middle, six for a long base -
but SPREADS the rows over the whole footprint rather than measuring in from one end. A base has
no free end to measure from, which is why it is its own function and not another argument to
`rivetPts`. A base element is drawn on the underside in the model, not on the front panel,
which is where every one of them used to float.

**An edge row stops clear of an attachment box on a SHAPED end too.** The straight case was
fixed long ago; the shaped case never was, because `shape.edge(ei)` ignored the `ends` pair. On
a 16 mm buckle tab the edge row and the box's long side came out 0.8 mm apart - two rows of
holes at two different pitches in the same three millimetres of leather. `trimRun(run, ei + t0,
ei + t1)` is the fix, and the coincident test is what found it.

**A mouth is a hem, not a seam.** On a shape she drew the profile is the stitch line along the
BODY arc and the finished edge along the MOUTH, so what runs past it is a seam allowance on one
and a turn allowance on the other. `offsetPoly` therefore takes an ARRAY of per-edge distances
as well as a single one, and its "too near the edge" filter measures each output vertex against
the distance THAT vertex was given - filtering a 9 mm hem against a 5 mm seam allowance lets a
fold through where the hem doubled back on itself. Growing the whole outline by the seam
allowance is what put the mouth's rim row two allowances from the cut edge, which is not a
distance anything on the bag measures.

**A row prints how far it sits from the cut edge, and the drafter says so when it cannot hold
it.** `SEAM` carries `ins`, defaulting to null: a footprint in the middle of a panel has no edge
to measure from and a number invented for it is a number she measures against and cannot find.
`SL` in `bodyPanels` defaults it to `sa`, because that IS what seam allowance means here, and
the pocket and flap-attach rows opt out. The number is the one the row was DRAFTED to, not a
measurement, because on a profile it varies: `insCheck` walks the run against the cut outline
and warns where the shape pinches below the allowance or where a hem too tight to turn has left
the row further in than the number. The count sheet carries the same figure in an "off the
edge" column, and the piece subtitle states the standing rule once.

**The strap meets the bag on the gusset, and on a shape she drew the strip IS the gusset.** It
was drafted on every other construction and on none of these, so the tab you can see on the
side elevation - angle and all - had nothing on the pattern to be sewn to. The free panels
carry the handle tails and the pack anchors for the same reason, each checked against the
profile with `polyHas` and warned about rather than drawn in mid-air.

**A main piece is not draggable.** `ARRANGEABLE` is `small` and `note` only: a main piece has a
sheet of its own and nothing to gain from being moved, and one nudged half off its page was very
hard to put back. `layoutSheets` therefore ignores an `S.arrange` entry against anything else.

**You take hold of a piece by its HEADING.** A grab rectangle over the whole tile is a sheet of
glass over every note and number on it, and picking the small text off a drawing that is mostly
stitch marks is the thing she is usually trying to do. The bar is the two heading lines and
nothing else on the tile starts a drag, which is why the old "that is a note, not the piece"
guards are gone. `arrSnap` copies `{arrange, labels, dropNotes}` before every such change, so
Ctrl/Cmd+Z takes back the last one; it is a session stack, not part of the design.

**The shape editor's selection is a LIST.** Most of what you want to say about a profile is
about several points at once, and saying it one point at a time is how a shape ends up nearly
symmetric. `FSELS` is what the actions apply to and `FSEL` is the last one touched, whose own
numbers are shown. Shift-click adds; a box dragged from the background takes everything inside
it. The selection is changed by the CLICK and not by the press - both fire for a tap, and doing
it in both places toggled every shift-click straight back off again. `S.free.sym` moves each
point's mirror partner with it, found by looking (`freeSymPartner`) rather than assumed, because
a shape she has been pulling about is only nearly symmetric.

**A closed row is a mirror of itself, or it is not, and that is arithmetic.** The holes go round
at a fixed pitch p from wherever the walk started, and the mirror about the run's own centre
line maps arc s to c - s, where c is twice the distance from the start to the crossing. The
mirrored set is the SAME set exactly when c is a whole number of pitches - so how far c is from
the nearest whole number IS the asymmetry, and nothing is compared hole by hole. `symErr`
verifies the outline really does fold onto itself about that line before believing any of it;
an OPEN run needs none of this, because s to L - s maps hole i to hole n - i whatever the count.
c an EVEN number of pitches puts a hole ON the centre line, which is what she wants; an odd one
straddles it with a gap. `symAdvice` searches the numbers that actually drive the runs that are
out - the element's own size, the strap numbers, W/H/D - one millimetre at a time up to five,
and like the stitch-fit search it must leave the seam registry describing the bag on screen.

**The two sides of a pocket are two RUNS.** Drawn as one run it is walked down the right side
and back up the left, and the hole that lands exactly on the join between them is drawn once -
at the end of the first side. That is one more hole down the right of every pocket than down
its left, and it is what "the slip pocket stitch lines do not match from left to right" was.
`rectRunSides` returns the two sides as two runs, both walked from the MOUTH (`revRun` turns
the second one round), and each is its own SEAM under one KEY - so they are planned once, get
the identical count, and the nth hole down one is the nth hole down the other. The same fault
and the same fix apply to the zip pocket bag's two sides and to the two boxing lines at each
corner of a boxed body. A run with a GAP in it is never one run.

**A lining panel that carries anything is not derived.** It is hidden by default because you
cut it from the shell pattern, and that only holds while it IS the shell: the moment a slip
pocket, a zip window or a card stack is stitched to it, it carries a row the shell pattern does
not have and you would be marking that row off a drawing that was never printed. "Where does
the slip pocket stitch to?" was exactly that. `derived` is now `!!tag && no seam of its own`.

**A mouth being zipped is not also sewn shut.** A barrel's tube closes along the top, and on a
zipped bag that seam IS the mouth: both edges get a tape row, one each side of the chain.
Drawing `barrelseam` as well put a second row 8 mm from the first and left the other edge of
the tube with nothing at all to zip to.

**The zip panel is cut to the ROW it meets, not to a formula.** `SEAMPLAN['ziprim'].len` is
read back and the strip is cut to it. On a rectangular rim that is the same number as
`mouthSpan()`; on a shape she drew the mouth is a curve and the row that follows it, inset and
trimmed, is shorter - so a panel cut to the mouth came out longer than the run it had to meet.
On a free shape the panel style also has to use the `ziprim` KEY: keyed `ziptape` it was planned
against a run it never touches.

**A bucket's mouth is a closed ring.** `mouthSpan()` is HALF of it - one panel's rim - so
`zipSpan()` doubles it, or the chain is quoted at half the length you have to buy. A straight
chain cannot close a circle at all, and the drafter says so rather than drafting it silently.

**A card stack's depth is set by the DEEPEST slot.** In a faced stack the slots share one
bottom edge, which is what puts every side hole on one grid - and that construction has a limit
nobody mentions: what decides whether you can get the BACK card out is how deep the deepest slot
is. Growing the stack by one reveal per slot buried the back card of a three-slot stack 70 mm
into a 54 mm card. The deepest slot sets the depth and every slot in front of it is one `reveal`
shallower. A card is 85.6 x 54 (`CARD_W`, `CARD_H`) and `CARD_MIN` (14 mm) is the shallowest
slot that still holds one; the drafter warns when the back card is buried, when the front slot
is too shallow, and when the stack is wider than the panel it sits on.

**`cardsGeom(el)` is the only thing that knows how a card stack is built.** Every consumer -
the elevation, `cardsOn` on the panel, `elementPieces`, the live note, the assembly diagram,
the tests - asks it, so the two builds cannot drift apart:

- `build:'pockets'` - **all leather.** N identical pockets, each `w x (tuck + sa)`, stacked so
  each one covers the one behind by `reveal`. Each pocket is stitched to the panel along
  **its own bottom line** - that line is what makes the pocket - and the two sides go through
  the whole stack in one run at the end. The bottom lines are keyed `el<id>p` and the sides
  `el<id>side`, so the marks on the lining and the holes in the pocket are the same holes.
- `build:'faced'` - **leather trim over a lining pocket.** One common bottom edge, the panel
  behind is the back of every pocket, and the leather pieces cascade in height. This is what
  the old built-in stack always did; it is now a choice rather than the only option.

A faced stack cannot make its reveal any bigger than `(tuck - CARD_MIN)/(n-1)` without pushing
the front slot past zero depth (5 slots at 11 mm went to -4 mm), so `cardsGeom` caps it and
reports `capped`; the note and a warning say what the reveal actually came out as.

**A card stack is an ELEMENT.** `ELTYPES.cards` puts it on any face, at any offset, turned to
any angle, as many as you like - `elFootH(el)` (not `el.h`) is its footprint height everywhere,
because the stack is deeper than one pocket. `placeElements` hands a cards element to `cardsOn`,
which builds the whole stack upright and rotates it as one piece through `rotSegs`/`rotPt`, so
turning it turns the marks with it. `S.cards` (the built-in wallet stack) still exists and still
works; a bifold now ships two `cards` ELEMENTS instead, one per half.

**A shared grid is exempt from the equal-count check.** A faced stack's side runs deliberately
carry different counts per piece off one grid, so `gridKey()` in the tests (`cardside`,
`el<id>side`) skips them in the three mating checks. Nothing else may claim that exemption.

**A wallet is LAMINATED, not lined.** A bag's lining is a smaller bag dropped inside; a wallet's
two layers are the same size and stitched face to face up both sides only. `bodyPanels` takes a
`live` override so a wallet's lining panel carries the real seams instead of being a derived
outline, and the lining is drafted at the SAME W/H as the outer. The two top edges are left open
on purpose - that full-width gap between the layers is the note pocket - so a wallet draws no
`rim` seam, and two red notes on the pattern say the edge is meant to stay open. This is why a
wallet's fittings are placed on the INSIDE panel: on a laminated wrap the inside face is the
lining, and that is the piece the card pockets get stitched to.

**A derived panel that carries something is drawn.** `derived = !!tag && !p.draw.some(it => it.t
=== 'seam')`. The lining used to be an outline with no marks, so a slip pocket's mate - and now a
card stack's bottom lines - had nowhere to appear and the question "where does this stitch to?"
had no answer on the sheet. A lining panel carrying any seam is a real pattern piece.

**The back half of a wallet is drawn 180 degrees round.** `walletBody` adds `face180` to every
element's own `rot` on the half whose rim is at the bottom, matching `faceRotation` in the
drafter. Without it the elevation showed both stacks mouth-up while the pattern drafted one of
them upside down.

**A wallet is drawn OPEN.** A folded wrap with no depth is a bifold, and four elevations of one
is a single useful drawing and three 8 mm slivers. `isWallet` swaps the whole elevation body for
`walletBody()`: the blank opened flat, the fold across the middle as the spine, the front half's
rim along the top and the back half's along the bottom - which is how the blank is drafted, how
it folds, and exactly the piece the pattern cuts, so there is nothing to translate at the bench.
Everything inside is drawn on the half it lives on, draggable and pullable to size. A face whose
rim is at the BOTTOM measures y upward, which is what `flipY` is for in the drag handler and in
`guide()`.

**The underside is a face you can click.** The bottom plan carries `data-sel="base"`, and the
panel it opens offers the things that go THERE - a set of feet, a foot, a patch, a stamp - not
the body's width and height. `data-add` takes a `data-face` so a part added from a face's own
panel belongs to that face rather than to whichever one happens to be first in its type's list.

## Deliberate decisions

- **Two ways into a shape of your own, and they are the same drawing.** Switching Construction
  to "A shape you draw" seeds the profile from the shape the bag already had (`seedFree`), so
  route one is "take the duffle and start pulling its end panel about"; the Shape module's
  starting shapes are route two. A barrel is the one that moves its numbers, because its SIDE is
  the round end panel: what was the length of the tube becomes the depth of the gusset.
- The starting shapes are **normalised on the way out**, whatever the generator produced, so
  every one of them fills its own 0-to-1 box. That is the contract the whole construction rests
  on and it is enforced in one place rather than trusted twelve times.
- A **bifold** is the folded wrap with D at 0: one blank creased down the middle, card slots on
  one half and a note pocket on the other. The moment D goes above 0 the drafter starts cutting
  side gussets, which a wallet does not have.
- The **whole handle arch** is what you take hold of to move it up and down the panel, not the
  two tails. Up and down only: the rise and the span have knobs of their own, and one gesture
  may mean one thing.
- The **inside view** is its own drawing, not a pattern sheet: the walls unrolled side by side
  with the rim along the top, plus a section showing how far each fitting hangs and what is
  fighting what. Interior fittings carry a `face` so they can go on either wall.
- **Shaped ends** are all struck the same way: an ogive is a circle through the point that
  leaves the edge of the strap tangentially, radius `R = (T^2 + h^2) / 2h`. Square, round,
  point, English point, almond and cut-back are all that one construction with a different
  tip length, which is why `tipNote()` can explain any of them in one line.
- A **rolled handle** follows the maker's formula, not a guess: cord = handle - 2 ends, strip =
  cord + 4 ends (the extra two fold up over the cut ends of the cord), width = pi x (core +
  thickness) + 2 x lap. It gets no attachment box on the blank — it changes shape when rolled.
- Multi-layer straps and handles carry a **real edge row down each side**, drawn and planned.
  A four-fold blank still cannot: it is four times too wide, so it gets the note instead.
- A grab handle, belt loop or pen loop puts its **name in the middle of the span**, not in an
  end box, because that is where the rivet labels live.
- A boxed body's base is a **fold, not a seam**. The only stitching down there is the two corner
  boxing lines. The stitch plan says so, because its absence reads as an omission.
- Lining shell panels are flagged `derived` and hidden from the pattern by default (cut them from
  the shell pattern). Everything else — including lining-material pockets — is always drawn.
  Do not filter by material; that bug hid the slip pocket.
- Elements are **additive on top of** the built-in features, not a replacement. A front pocket can
  come from either — and having two routes to the same thing was confusing enough that the
  built-in one now starts **off** in every preset. Folding the built-ins into the elements list
  is still the obvious next move.
- The elevations and the shape editor draw a **10 mm grid** with a heavier line every 50, and
  both centre lines of every face, always. Symmetry is what you check by eye on an elevation and
  there was nothing on the drawing to check it against. The centre lines are collected and drawn
  over the panels and under the handles - a guide painted under a filled panel is not a guide.
  `S.grid` turns the grid off; the centre lines stay.
- The centring guide works **both ways**. Half of what you place on a bag is being lined up down
  the face, and all four gaps are written on the drawing at once: two that match is centred, and
  you can see it without moving anything.
- An added element has a **width grip and a height grip**. Width grows from the middle, because
  x is the offset of the centre; height grows downward, because y is measured to the top of the
  box. The pair rides the element's own frame, so a turned box's grips turn with it.
- **Every interior fitting can be pulled to size, not only dragged into place** - in the inside
  view and in the wallet view. Typing a number into the rail to find out whether a pocket is too
  deep is the slow way round.
- The **bifold preset** is 108 x 95 because a card is 85.6 across and the stack is 96.6 with
  seam allowance: at the old 95 the cards did not fit the wallet at all.
- The pattern card stays paper-coloured in both themes. It is what comes out of the printer.
- Print sets `@page{margin:0}` with a full-page SVG so 100% really is 1:1. Do not add page
  margins back.
- The stitch-fit panel offers **W, H and D only, five and ten millimetres each way**. They are the
  numbers she chose and the ones she can live with moving; the seam allowance and the iron change
  the fit too, but suggesting those is telling her how to make the bag rather than how big.
- The fit panel lives on the **cut list**, not the bag view: that is where you are before you cut,
  and thirteen drafts on every twitch of a slider is not a price worth paying. It caches on a
  signature of everything that moves the answer.

## Design files

`{format:'awl-gusset/design', version:1, name, saved, design:<the whole S>}`.
`applyDesign()` refuses anything else; `sanitise()` clamps every value and drops unknown element
types, so a bad file cannot break the drafter. Old files missing newer fields load with defaults.
Designs also autosave to localStorage and reopen on load.

## Ideas not yet built

- Curved/shaped gussets (only straight taper today)
- A flared bucket (a cone, so its body unrolls to an annular sector, not a rectangle)
- A gusset that tapers on a curve rather than in straight segments (needs a numeric solve for
  the strip length, since the edge is no longer a straight slant)
- A curved zip set into a front panel, the other way a belt bag gets built
- A strap-over-the-top roll closure as well as hooks and buckles
- Turned-edge allowance that varies by piece
- Nesting pieces on a hide outline to cut waste
- `sanitise` drops an element's `side` (which end of the gusset it goes on), so that control is
  lost on every save/load round trip. The presets would have to carry the field too.
- The 3D model shows the roll closed and the straps as worn; there is no way to see it open
- Assembly diagrams are drawn at 1:1 unless the paper forces a scale, so on A4 each of them takes
  most of a sheet. Drawing them at a fixed small scale with their own type size would put three on
  one sheet
- **A shape you draw has one profile, used for both sides.** Two DIFFERENT sides is the obvious
  next move and the user asked for it: for each edge of the profile the gusset segment becomes a
  trapezoid with side A's length on one edge and side B's on the other, so the strip develops
  into a fanned band rather than a rectangle. The seam lengths stay exact per segment; the work
  is laying the segments out with their rotation accumulating, and drafting two different panels
- A shape you draw is always gusseted with ONE wrap-around strip. Split halves and a separate
  base want a straight base to divide at, and a profile has none
- A shape you draw supports open, flap, zip and magnet. A roll top and a drawstring both want a
  straight rim to fold or gather on
- More than two sides on a free bag — a triangular-prism bag with three panels is a different
  topology from panel-and-gusset, not a wider version of it
- `strapbox` lands on ONE piece when the strap is **adjustable AND sewn** straight to the gusset:
  the bag gets the footprint and no strap piece carries the matching box, so that seam has no
  shared count. The fixed strap does it right (`strapAttach` at both ends); the adjustable branch
  never did. Same on every construction - it is not a free-shape fault.
- The stitch-fit search is one dimension at a time. Pairs (W and D together on a gusseted bag) are
  the obvious next step, but the suggestion stops being a sentence you can read at a glance
