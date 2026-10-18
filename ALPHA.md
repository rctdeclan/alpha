# ALPHA

> **Authoritative product and interaction specification**
>
> Alpha is a drawing-first 2D/3D precision modeller. It is not
> conventional CAD with different chrome.
>
> If implementation and this document disagree, change the
> implementation. Existing code is never evidence of intended Alpha
> behaviour.
>
> Codex should maintain `CURRENT.md` separately for implementation
> plans, status and compromises. Do not rewrite Alpha's principles
> merely to accommodate implementation.

## Reading this specification

This document describes product intent, including substantial future work. It is
not a list of implemented features. Read [ARCHITECTURE.md](ARCHITECTURE.md) for
actual behavior, [ROADMAP.md](ROADMAP.md) for completion status, and
[AGENTS.md](AGENTS.md) for persistent development instructions.

The migration review on 2026-10-18 preserved the original vision below and added
established decisions from the available development conversation: independent
curves, the dark separated view styling, and column-based command autocomplete.
Temporary prototype exceptions are identified explicitly; examples of future
operations do not mean those operations exist.

## 1. Central idea

Alpha lets a person **draw first and progressively give that drawing
spatial meaning**.

``` text
free 2D drawing
      ↓
meaningful 2D points
      ↓
automatically fitted local curves
      ↓
refine freely
      ↓
add another observation where useful
      ↓
selected geometry acquires spatial position
      ↓
refine the same geometry from any camera
      ↓
curves → patches → bodies
```

There is no conceptual boundary called "finish sketch and enter 3D".

2D is not disposable construction geometry. 3D is additional information
added to the design.

Spatialisation is progressive and local. A document can legitimately
contain free 2D points, spatial points, free drawing curves and spatial
curves at the same time. Never automatically promote an entire drawing
to 3D.

## 2. Intended work

Alpha targets precise industrial/product-form work: helmets, toys,
housings, props, shells and other curved designed forms.

It combines vector-drawing immediacy, measured CAD precision,
spatial-curve freedom, persistent technical observations, pen
manipulation, textual exactness and local predictable edits.

The user's attention should remain on **the object and its drawings**,
not application chrome.

## 3. Four defining interface ideas

### Two columns

Exactly two large geometric views normally remain visible side by side.

A column is a **geometric view**, not necessarily a 3D viewport. It can
show a flat Sheet, orthographic observation, arbitrary 3D camera,
section or another drawing.

Both are first-class and interactive. Hover/select linked geometry in
either and reveal its counterpart in the other.

Do not add permanent extra Front/Top/Side thumbnails.

The current shell uses equal-width panels, separated and inset so the darker
background remains visible. The left contains the Sheet drawing; the right is
currently empty apart from its grid. Do not interpret that empty view as a
request to implement 3D. Stored drawing positions remain stable when the window
resizes; current viewport mechanics and limitations are in ARCHITECTURE.md.

### View sphere

Camera orientation is spherical, with useful horizontal and vertical
increments rather than only six cube faces.

The view sphere is normally absent or extremely quiet. It appears during
orientation manipulation as fine geometry with tiny orientation text
such as `37° / +15°`.

Future cyberdeck orientation hardware may drive it. It is not a
decorative glowing widget.

### Command sentence

Operations compose into readable text:

``` text
C12 › copy › move 32.00mm › connect › subtract Helmet
```

The same system is the modelling expression and command interface.

``` text
› off
  offset
  offset normal
  offset from C12
```

Commands are text, not pills or graphical nodes. Commands and pen
manipulation mix: type `connect C12`, then tap `C18`.

### Spatial relations

Hierarchy/dependency is primarily understood around geometry rather than
through a permanent object tree.

When requested, show a selection-centred technical diagram using tiny
labels, leader lines, dashed relationships and restrained semantic
colour. It should resemble an engineering infographic, not a bubbly node
graph.

## 4. Genuine 2D first

A new Alpha document must be useful before any 3D geometry exists.

The first critical acceptance test is:

> Starting empty, place 2D points, receive useful fitted curves, and
> repeatedly refine the points and curves without supplying depth or
> creating fake XYZ positions.

A drawing point may simply be `(u,v)` on a Sheet. Do not require
`(x,y,z)` until it actually acquires spatial information.

## 5. Sheets

A **Sheet** is persistent 2D vector space, more than a temporary CAD
sketch plane.

It can contain free points, curves, regions, annotations, linked
observations and later reference imagery.

A complete orthographic drawing can contain geometry ultimately
belonging at different depths, so it may be separated into multiple
Sheets---for example Crown, Face, Eyes, Jaw and Panel Lines. They can
overlap into one coherent Front illustration while occupying different
depths elsewhere.

Sheets provide coarse spatial organisation before individual curves need
to become fully spatial.

Do not implement them as a conventional Layers sidebar. Prefer commands
such as `new sheet`, `separate to sheet`, `move sheet 18mm`,
`show sheets`.

## 6. Points and observations

A free `DrawingPoint` is genuinely 2D:

``` text
DrawingPoint
  sheet
  position (u,v)
```

A `SpatialPoint` has one underlying spatial position:

``` text
SpatialPoint
  position (x,y,z)
  observations [...]
```

Once spatial, Front, Side, 45°, Top, etc. do not own independent copies.
They project the same point:

``` text
                  P
             /    |              front  side   45°
            ●      ●      ●
```

### Establishing 3D

A drawing point acquires spatial meaning when Alpha has sufficient
information: another observation, known Sheet depth, surface relation,
or other geometric constraint.

The second view need not be Side; Front + 45° is valid. With imperfect
pen input Alpha may solve the best compatible spatial position.

**The user supplies observations; Alpha places the 3D point.**

### Arbitrary-camera editing

Once an initial 3D position exists, it can be edited from any camera.

With no additional constraint, dragging in an arbitrary camera means
moving parallel to the camera image plane while preserving existing
camera depth:

``` text
P' = P + dx * cameraRight + dy * cameraUp
```

Every linked view then reprojects `P'`. Front and Side are not
separately "corrected".

## 7. Screen-space intention and constraints

General principle:

> **The pen says what the user wants to happen on screen. Existing
> relationships determine how Alpha may satisfy that request in space.**

Examples:

-   unconstrained → move in camera plane;
-   on curve → solve along curve;
-   on surface → solve on surface;
-   fixed dimension → preserve it;
-   fixed projection → preserve that appearance;
-   trajectory relationship → respect the trajectory.

If the exact request is impossible, subtly distinguish requested and
solved screen positions rather than silently violating constraints.

## 8. Drawing relationship semantics

2D drawing must not automatically be overwritten by related 3D edits.

An observation can be:

**Free** --- independent drawing; 3D edits do not alter it.

**Drives / fixed** --- drawing is design intent the spatial model must
preserve.

**Follows** --- drawing documents the model and updates from it.

**Linked** --- editing either representation edits the same spatial
geometry.

Expose this lightly through tiny annotations and commands such as:

``` text
keep front
keep projection
release front
link
unlink
```

Do not create a giant relationship inspector.

### Preserve one view while refining another

This is a defining workflow:

> Keep the front silhouette exactly as designed while improving the
> three-quarter shape.

`keep front` fixes that observation. Editing from 45° changes remaining
spatial degrees of freedom while preserving Front.

Extend this from points to whole curves, silhouettes and sections:

``` text
keep side
keep section
keep projection
```

## 9. Curves: P/T model

Alpha's fundamental curve is not exposed as a Bézier/NURBS mode.

A local segment is conceptually:

``` text
S_i = F(P_i, T_i, P_{i+1}, T_{i+1})
```

`P` is meaningful position; `T` is trajectory/direction.

Complex curves are chains/networks of deterministic local segments.

### Click points, receive a good curve

Click meaningful points. Alpha infers useful initial trajectories and
produces a good curve without forcing manual spline handles.

Trajectory remains first-class and can later be exposed, dragged,
constrained or entered numerically.

### Locality

Changing internal `P_i` or `T_i` affects exactly the adjacent segments
unless an explicit higher-level relationship requires propagation.
Endpoint edits affect one adjacent segment.

This locality invariant is central.

When a position moves, its trajectory initially keeps its world
direction unless another relationship says otherwise.

### Independent curves and selection

Curves must be first-class objects: finish one, start another, and select either
independently. Preserve document-owned positions and curve-local trajectory
state so points can later be shared without implicitly sharing trajectories.
Selection is not a topology-changing action: it must not connect existing
points, insert points, or silently resume a finished curve.

The current incremental workflow creates new points while drawing a curve.
Creating standalone points, connecting pre-existing points and explicitly
inserting/refining a curve remain distinct interaction questions; they have
not all been implemented or given final gestures. Do not treat the current
append workflow as the complete intended 2D editor.

Direct trajectory editing uses a minimal line through the selected point only.
Dragging it changes direction without moving P. Do not expose conventional
Bézier handles or make drag distance a trajectory-length control.

### Pulling and correction

Pulling a curve first tries to satisfy the request by changing existing
local trajectories.

If the deterministic segment cannot express the desired shape, Alpha may
propose inserting one meaningful `(P,T)` state at that location,
initialized from the old curve position/tangent, splitting one segment
into two.

Do not silently flood curves with control points.

The pen can also draw a desired correction over a local curve. Alpha
interprets it as "make this region resemble this stroke while disturbing
as little else as possible."

## 10. Regions

Closed 2D boundaries automatically imply selectable **Regions**. Do not
require "make profile".

The user can select boundaries individually or tap inside to select the
Region. Regions remain related to their defining curves and participate
directly in modelling commands.

## 11. Small modelling vocabulary

Conceptual objects:

``` text
Point
Curve
Region
Sheet
Patch
Body
Instance
```

Primary operations:

``` text
move
copy
connect
insert
delete
offset
cut
boolean
extend
inspect
measure
constrain
```

Relationships/modifiers:

``` text
snap
align
tangent
smooth
curvature
symmetry
repeat
keep projection
```

Prefer composition over special-purpose tools.

### Extrusion as composition

Conceptually:

``` text
select face
› copy
› move normal 30mm
› connect
```

`extrude 30mm` may exist as shorthand, but should not require a separate
modelling mode.

A cutting extrusion can be:

``` text
copy region › move normal 30mm › connect › subtract Helmet
```

Preview the combined result while composing.

### Booleans

Support the conceptual operations `union`, `subtract`, `intersect` for
2D Regions and 3D Bodies where appropriate. Preserve
provenance/relationships when practical.

## 12. Patches and bodies

Curves can bound curved Patches. Suitable boundary curves should connect
into a Patch without entering an unrelated surface-modelling universe.

Patch relationships include:

``` text
G0  connected
G1  tangent
G2  curvature-continuous
```

Expose these as relationships/annotations rather than a forest of
special surface tools.

Do not accumulate Loft/Sweep/Boundary/Network tools as separate
conceptual modes unless names are merely useful shorthand over the
underlying model.

A Body is a coherent 3D form composed of patches/faces.

The same operation language should remain recognizable at point, curve,
patch/face and body levels.

## 13. 2D vector editing

Alpha's vector editor should be more capable than a CAD sketcher but
conceptually much smaller than Illustrator.

### Draw first, constrain afterwards

Draw quickly. Alpha may infer horizontal/vertical, alignment, tangent,
perpendicular, midpoint, symmetry, equality, likely circles/arcs, etc.

Inference is not automatically a hard constraint. Show it lightly;
accept it with `keep` or `constrain`.

### Snapping

Useful candidates: point, midpoint, intersection, tangent,
perpendicular, centre, projected point, curve.

**Snap** means "place it there now."\
**Constraint** means "keep it there."

Avoid a permanent OSnap toolbar.

### Shape recognition

Freehand may propose precise line, circle, rectangle, symmetry or
repetition interpretations. Never silently replace the user's drawing.

### Offset

Offset is fundamental for seams, panel borders, clearances, parallel
profiles and wall boundaries. Use the same concept in 2D and 3D.

### Trim without Trim mode

If intersections delimit a segment, selecting that segment and deleting
it is enough. Express extension naturally, e.g. `extend to C8`.

### Symmetry

Symmetry is a live relationship, e.g. `LeftEye ↔ RightEye`, with
`break symmetry` available later.

## 14. Dimensions, sections and analysis

Dimensions live directly in the drawing/model:

``` text
             84.00
        ←────────────→
       ●──────────────●
```

Tap the annotation and edit the value through the command line. Support
distance, horizontal/vertical distance, angle, radius/diameter,
curve/arc length and local curvature.

An arbitrary section through a 3D model can appear as useful 2D geometry
in a column. It can be inspected, snapped to, drawn against, offset and
measured. `keep section` makes it design intent.

Curve-analysis overlays are temporary and spatial: curvature combs,
inflection markers, radius at point, continuity at join, deviation from
another curve. Example: `show curvature C7`.

Reference images may later live on Sheets and be calibrated with
commands such as `this distance = 180mm`.

## 15. Visual design: measured minimalism

The viewport itself is the interface.

Target qualities:

-   quiet professional desktop tool;
-   VS Code-like restraint and density;
-   CLI textual simplicity;
-   industrial-design technical illustration;
-   precision instrument.

Not: futuristic HUD, bubbly SaaS, glassmorphism, CAD ribbon, or rounded
mobile UI.

### Permanent structure

Normal screen contains approximately:

1.  tiny title/status text;
2.  two geometric columns;
3.  command sentence/prompt;
4.  contextual information directly over geometry.

Avoid permanent toolbars, right inspector, feature tree, object browser,
mode tabs, large status panels and card controls.

### Flat UI rules

Use square geometry, 0--3px radii at most, subtle grayscale value
changes, occasional 1px low-contrast separators, compact typography and
alignment.

No pills, rounded cards, hard borders around every region, chrome
gradients, glow, glass, drop shadows, decorative colour or oversized
icons.

### Dark grayscale

Base chrome is near-black/charcoal and almost monochrome. Suggested
tuneable starting tokens:

``` css
--bg-0: #101112;
--bg-1: #151617;
--bg-2: #1b1c1e;
--bg-hover: #222326;
--fg-0: #ececeb;
--fg-1: #b9b9b7;
--fg-2: #777876;
--line: #303133;
--line-soft: #242527;
```

Semantic colour belongs primarily to geometry: restrained cyan/blue
selection, amber inference/unresolved state, violet free drawing/Sheets,
green satisfied relation, coral/red subtraction/conflict.

### Established prototype styling

The later user-supplied editor reference established a darker surround, slightly
lighter separate view panels, and subdued grids in both columns. Preserve this
implemented palette rather than reverting to the generic starting tokens above:

| Element | Established value |
| --- | --- |
| Outer background / autocomplete area | `#080808` |
| View panels / command input strip | `#111111` |
| Minor grid, every 8px | `#141414`, 1px lines |
| Major grid, every 40px | `#191919`, 1px lines |
| Main / secondary text | `#ececeb` / `#777876` |
| Subtle separators | `#242527` |
| Outer padding / gap between panels and command row | 12px |
| View corner radius / command corner radius | 3px / 0px |
| Command input row | 40px high |
| Autocomplete active part / unresolved feedback | `#9fbfc6` / `#bfa579` |
| Autocomplete alternative text | `#686967` |

These are the current established design values, not immutable physical units.
The pink surround, flamingo model, floating tools and menus in the reference
image were not added to Alpha. The reference supplied visual direction, not
permission to add modelling controls. No image attachment is a runtime asset.

### Typography

Operator Mono is a visual reference if appropriately licensed/installed.
Never redistribute proprietary font files.

Fallback:

``` css
font-family:
  "Operator Mono",
  "IBM Plex Mono",
  "SFMono-Regular",
  "Cascadia Mono",
  "Menlo",
  monospace;
```

Objects, IDs, values and measurements are upright. Operations/verbs may
be italic:

``` text
C12 › copy › move 32.00mm › connect › subtract Helmet
```

### Model rendering

Render like an **editable technical illustration**:

-   restrained 2--4 tone flat/cartoon industrial shading;
-   strong screen-space silhouette;
-   thin internal edges;
-   clean flat fills;
-   semantic construction lines;
-   no photorealism/glossy studio materials as the default.

Relevant hidden geometry can be dashed:

``` text
────────────   visible geometry
- - - - - -    relevant hidden geometry
···········    construction/projection
━━━━━━━━━━━━   selected/important geometry
```

Do not show every hidden edge. Hidden-line rendering is semantic.

### Infographic overlays

Replace much inspector UI with tiny geometry-attached labels,
coordinates, dimensions, continuity, relation names and leader lines.

``` text
P17
x  42.00
y  18.25
z -12.80
    ●
```

The overlays should eventually be interactive. The model itself becomes
the inspector.

## 16. Command bar

The command area resembles a restrained CLI:

``` text
C12 › copy › move 32mm › connect

›
```

Autocomplete is essential:

``` text
› con
  connect
  constrain
  continuity
```

It eventually handles modelling, search, selection, navigation,
constraints, inspection, analysis, visibility, cameras and relations.

Examples:

``` text
focus jaw
show curvature C8
keep front
show sheets
relations eye
select connected C7
view 45 20
measure C8
```

Do not make it a rounded search field.

### Column-based autocomplete decision

The later command prototype request refines the simple suggestion sketch above:
each part of a command has its own vertical column of possible values. Every
selected value must sit on exactly the same horizontal baseline, reading as one
continuous command sentence. Alternatives appear above and below that shared
row; do not build a conventional dropdown, boxes, rounded cards or form controls
for individual parts.

Typing filters/selects the command column. Space and subsequent tokens introduce
additional columns. Preserve ordinary editable text in the command line beneath
the columns, including text that does not parse as a command. Use spacing,
subtle lines and restrained semantic color. Operations may be italic; object
IDs and values stay upright.

The first prototype deliberately uses these fake grammars:

```text
connect  <from> <to>
move     <target> <direction> <distance>
keep     <property> <view>
show     <subject>
go       <destination>
insert   <point> <curve>
subtract <body> <body>
```

Grammar definitions and value providers must be separate from presentation so
real document objects can be connected later. The current Space/Tab, arrow-key
and pointer interactions are documented in ARCHITECTURE.md. Enter only displays
the parsed command or diagnostic and “not implemented.” This is a user-requested,
explicitly labelled prototype exception to the real-action invariant, not a
claim that these modelling operations exist. It must not change geometry.
These example grammars are not a final language specification.

## 17. Cyberdeck

Alpha is intended to complement a flat wooden cyberdeck with side
handles, touchscreen/pen, physical buttons, rotary encoder and
orientation tracker.

Rule:

> **Never draw a digital control when an equivalent physical control is
> already under the user's hand.**

Show the value/meaning, not a fake knob:

``` text
move normal

  31.8
  31.9
> 32.0 mm
  32.1
  32.2
```

Physical button mappings can appear simply as text:
`1 copy   2 connect   3 constrain   4 inspect`.

The physical tracker should feed the same arbitrary-camera observation
model.

## 18. Precision

Alpha feels measured because exactness is always available, not because
precision requires special modes.

Direct manipulation supplies intent; text supplies exactness.

Examples:

``` text
radius 20
tangent C8
same height P12
keep front
offset 2.4
```

## 19. What Alpha must not become

Do not drift into:

-   **Fusion clone:** sketch → finish sketch → feature history → dozens
    of feature tools.
-   **Blender clone:** mode-heavy mesh editing and generic transforms.
-   **Illustrator clone:** huge vector vocabulary disconnected from
    spatial modelling.
-   **Shapr clone:** elegant direct manipulation but a fixed menu of
    isolated modelling operations.
-   **uMake clone:** spatial sketching where 2D drawing mainly becomes
    curves placed in 3D.

Alpha's distinction:

> **A rich 2D design remains meaningful while selected information
> progressively becomes a measured spatial model. Multiple observations
> remain useful relationships to that one model.**

## 20. Architecture invariants

1.  **Do not make every point XYZ.** Free drawing points are genuinely
    2D.
2.  **One spatial truth.** Once spatial, views project one underlying
    geometry.
3.  **Observations are first-class.** Do not discard drawing↔spatial
    relationships after construction.
4.  **Locality.** Curve edits affect the smallest meaningful
    neighbourhood unless explicit relationships propagate them.
5.  **Commands are real actions.** Do not present fake entries as working
    operations. The explicitly requested, labelled autocomplete prototype in
    §16 is a temporary exception; execution remains unimplemented.
6.  **UI follows geometry semantics.** Do not add modes/panels merely
    because implementation is easier.

A conceptual model might distinguish `DrawingPoint`, `SpatialPoint`,
`Observation`, `Trajectory`, drawing curves and spatial curves rather
than forcing all of them into one universal XYZ type.

## 21. Development strategy for Codex

Codex does the heavy implementation work in experiential milestones.

Maintain:

``` text
AGENTS.md        concise persistent agent instructions
ALPHA.md         authoritative product/design principles
ARCHITECTURE.md  actual implementation and data structures
ROADMAP.md       completed, partial and planned features
CURRENT.md       current task, acceptance and validation
```

Before each milestone:

1.  read `ALPHA.md`;
2.  inspect current implementation;
3.  define the acceptance test in `CURRENT.md`;
4.  implement;
5.  run automated tests;
6.  run and exercise the app;
7.  compare against the acceptance test;
8.  fix deviations before continuing.

Do not rewrite `ALPHA.md` to justify implementation compromises.

## 22. Milestones

### Milestone 1 --- genuine 2D drawing

> Open an empty document. In one column, click several points. Alpha
> creates a well-fitted 2D curve. Move/insert/delete points and refine
> the curve. No depth is required and no spatial geometry has to exist.

Required: genuine 2D points, local fitted P/T-style curves, inferred
trajectories, local editing, selection/hover, command shell and Alpha
visual language.

Do **not** start by building two 3D viewports.

### Milestone 2 --- progressive spatialisation

> Select drawing information and use the second column to provide
> another observation. Alpha resolves only that selected information
> into spatial geometry without converting the whole drawing.

Mixed state such as `P1 2D / P2 spatial / P3 2D` is valid.

### Milestone 3 --- arbitrary-view editing

> Drag an established spatial point from a 45° camera. Alpha modifies
> the one spatial point and linked observations reproject automatically.

No independent duplicate coordinates per view.

### Milestone 4 --- keep projection

> Fix the Front observation. Modify geometry from 45°. Alpha uses
> remaining degrees of freedom while preserving Front.

Prove it with points, then curves.

### Milestone 5 --- Sheets and Regions

> A complex 2D drawing can contain separate Sheets and closed Regions
> without requiring spatialisation.

Add Sheet separation/positioning, Region detection/selection, offset and
simple 2D boolean foundations.

### Milestone 6 --- Patches

> Connect suitable boundary curves into a curved Patch. Editing defining
> curves updates the Patch locally and predictably.

Add boundary relationships and G0/G1/G2 foundation without proliferating
surface tools.

### Milestone 7 --- Bodies and composed modelling

> Build a simple body using the same vocabulary, including
> `copy › move › connect` and a boolean subtraction.

At this point `extrude 30mm` may be shorthand for
`copy › move normal 30mm › connect`.

## 23. Drift tests

At every milestone ask:

-   Can I begin with genuinely free 2D points?
-   Can I refine the drawing before 3D exists?
-   Can only part become spatial?
-   Is there one underlying spatial truth?
-   Can I edit it from arbitrary cameras?
-   Can I preserve an important projection?
-   Does unrelated 2D drawing remain untouched?
-   Are curve edits local?
-   Are trajectories meaningful rather than spline-handle clutter?
-   Does the small operation vocabulary continue into patches/bodies?
-   Did we add a toolbar/sidebar/card because it was easier?
-   Did colour become decorative?
-   Did rendering become more realistic but less legible?
-   Did we create extra modes instead of relationships/commands?

If the answer indicates drift, correct the implementation before
continuing.

## 24. Shortest description

> **Alpha is a drawing-first precision modeller in which 2D design
> remains first-class. The user places meaningful points and locally
> fitted curves, progressively adds observations to resolve selected
> geometry into 3D, and then edits the same spatial truth from any view
> while optionally preserving important drawings, silhouettes and
> sections. Point, curve, patch and body modelling share a small
> composable operation vocabulary. The interface is two-column,
> command-first, pen-friendly, dark, flat, measured, and rendered like
> an interactive technical illustration rather than conventional CAD
> software.**
