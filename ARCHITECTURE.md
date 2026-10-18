# Implemented Alpha architecture

Verified against the source and tests on 2026-10-18. This describes the current
prototype, not all of [ALPHA.md](ALPHA.md). See [ROADMAP.md](ROADMAP.md) for gaps.

## Runtime and ownership

A client-only React application, built by Vite with the React plugin. No server
API, database, persistence, router, geometry library or 3D renderer exists.
`package.json` and `package-lock.json` are the dependency sources of truth.

| File | Responsibility |
| --- | --- |
| `index.html`, `main.jsx` | Mount `App` into `#root`, React StrictMode, import CSS |
| `App.jsx` | Left DrawingSpace, empty right section, independent CommandBar |
| `DrawingSpace.jsx` | Own drawing reducer, SVG rendering, focus and pointer gestures |
| `drawing.mjs` | Framework-independent mutable 2D model and local curve evaluation |
| `drawingReducer.mjs` | Clone state before applying model operations |
| `commands.mjs` | Grammar data, fake providers, suggestions, token replacement, parser |
| `CommandBar.jsx` | Own text/caret/open/result state, keyboard and pointer completion |
| `style.css` | Global tokens, fixed shell, grids, geometry and command styling |
| `tests/*.test.mjs` | Node test runner; geometry, reducer, commands and React/JSDOM checks |

Drawing and command state are separate siblings. The command component receives
no drawing or dispatch prop. Reloading/unmounting resets both. There is no save,
load, undo/redo or document serialization format yet.

## Current document shape

Illustrative populated state (vectors shown as placeholders):

```js
{
  sheet: { id: 'sheet-1' },
  points: [
    { id: 'P1', sheet: 'sheet-1', position: { u: 40, v: 50 } },
    { id: 'P2', sheet: 'sheet-1', position: { u: 100, v: 100 } }
  ],
  curves: [{
    id: 'C1', sheet: 'sheet-1', pointIds: ['P1', 'P2'],
    trajectories: { P1: { u: 60, v: 50 }, P2: { u: 60, v: 50 } },
    editedTrajectories: {}
  }],
  nextPointId: 3, nextCurveId: 2,
  activeCurveId: 'C1', selectedCurveId: 'C1', selectedPointId: 'P2'
}
```

- `createDrawing()` starts empty with counters at 1 and selection/activity null.
  IDs are monotonic within the in-memory document, not globally unique IDs.
- `position2D` copies only finite `u` and `v`; there is no Z coordinate.
- Curve `pointIds` determine topology. The order of the document point array
  does not. References are resolved and checked for the curve's Sheet.
- Trajectories are 2D vectors with direction and magnitude, keyed by point ID
  **inside each curve**. `editedTrajectories[id] = true` protects manual direction
  edits when a curve is extended.
- A point can be referenced by multiple curves in a model fixture. Its position
  is shared; each curve has its own T. This is not a sharing/rewiring operation.
  An explicit or selected containing curve resolves trajectory-edit context;
  an unambiguous sole owner is a fallback, otherwise resolution throws.
- Only one Sheet object exists. There are no Sheet creation/selection operations.

## Lifecycle and selection

`addPoint` creates a document point and appends it to `activeCurveId`. If no curve
is active, it first creates a new curve. A single point therefore belongs to a
one-point curve; standalone point creation is not a separate workflow. Geometry
is added on pointer-down, with optional immediate drag, not deferred until click-up.

`finishCurve` clears activeCurveId and selectedPointId, leaving selectedCurveId
and geometry intact. Finishing an empty document creates nothing; finishing a
single-point curve keeps the point. There is no per-curve `finished` flag.

Selecting a curve or existing point finishes the active drawing run. A point
selection also selects its containing curve. Selecting never appends, connects,
shares, inserts, or resumes a finished curve. The next empty-space click starts
another curve. No command currently resumes/extends a previously finished curve.
Clicking a stroke only selects; dragging the stroke does not reshape it.

Reducer actions are `add`, `select`, `finish`, `select-curve`, `move`, and
`trajectory`. Each action starts with `structuredClone(state)` and invokes a
mutating model helper. Replaying the same action from the same snapshot must be
deterministic. Segments are derived on render, not separately stored or cached.

## P/T fitting and strict locality

Each segment is a cubic Hermite-style interpolation of two adjacent P/T states,
rendered using equivalent SVG `M … C …` controls. Internal cubic controls are
rendering math, not exposed conventional Bézier handles.

Initial inference is incremental:

1. The first point gets T = `(0,0)`.
2. The new endpoint gets the incoming chord vector.
3. Unless manually edited, the former endpoint gets that chord for a two-point
   curve, or the normalized sum of incoming/outgoing unit chord directions,
   scaled to the shorter chord length, when it becomes internal.
4. Zero-length chords use the available chord; an opposing-direction bisector
   near zero yields a zero vector. Earlier trajectories stay fixed.

For a segment of chord length `d`, the controls are:

```text
C1 = P_i     + T_i     * min(1, d / |T_i|)     / 3
C2 = P_(i+1) - T_(i+1) * min(1, d / |T_(i+1)|) / 3
```

A zero T contributes zero offset. Each tangent reach is capped to `d/3` using
only this segment. Do not replace this with a global spline fit. Shared tangent
direction does not imply equal derivative magnitude after per-segment capping.

`movePoint` replaces P only. It never re-infers T. `setTrajectoryDirection`
normalizes a nonzero requested direction and preserves the stored magnitude;
for a zero stored T it uses the shortest nonzero adjacent chord, or 1 for an
isolated point. A near-zero requested direction is ignored; non-finite input
throws. Drag distance does not control tangent magnitude.

For ordinary independent curves, a P/T edit can change only the incident two
segments, or one at an endpoint. Appending changes the previous final segment
and adds a new segment; earlier segments stay unchanged. In the shared-point
fixture, moving shared P affects incident segments in every referencing curve,
while editing T affects only the chosen curve. There is no relationship solver
that propagates other edits.

## Viewport and pointer behavior

- Two equal-width columns, 12px outer padding and gaps; a 40px bottom input row.
  Both columns have a CSS grid. The right is an empty `section`, not another
  DrawingSpace and not a 3D preview. No splitter, extra view thumbnails or camera UI.
- The left SVG has no `viewBox` or camera transform. Sheet origin is upper-left,
  positive u rightward and v downward, in local SVG units (currently CSS pixels).
  Pointer coordinates use `getScreenCTM().inverse()`, accounting for view insets.
- Resizing reveals/clips a different extent without rewriting or scaling stored
  positions. Point dragging clamps to the current SVG client width/height.
  The model itself allows any finite coordinates, including negative positions.
- No pan, zoom, orbit, auto-fit, snapping or unit calibration is implemented.
  The visible 8px/40px grid is a CSS visual reference, not a snapping system.
- Only primary left-button pointer gestures are accepted. Point drags preserve
  the initial grab offset and use pointer capture. Up/cancel/lost capture ends
  the drag. Curve selection does not capture a pointer.
- A selected point shows a 64-unit dashed line through P, with a transparent
  14px hit stroke. Rotation uses angular delta from pointer-down, so either side
  can be dragged without reversing T initially. Motion within 3 units of P is
  ignored. A zero T displays a horizontal line until edited. No endpoint grips.
- Curves have 12px transparent hit strokes and 1.5px visible strokes. Points
  render once from the document pool, radius 3.5 (5 selected), with a 14px
  transparent hit stroke. The selected curve provides shared-point edit context
  when possible; otherwise rendering uses the first containing curve.
- Enter/Escape finishes drawing only when the SVG has focus. Command-bar keys
  do not reach the SVG handler. Merely focusing the command input does not finish
  the active curve. No global keyboard shortcut dispatcher exists.

## Command-bar prototype

`prototypeCommands = { grammars, providers }` is passed into CommandBar by
default; an optional `context` can be supplied to providers. The current App
supplies neither document objects nor an execution service.

| Verb | Ordered slots | Fake provider types |
| --- | --- | --- |
| connect | from, to | points, points |
| move | target, direction, distance | targets, directions, distances |
| keep | property, view | properties, views |
| show | subject | subjects |
| go | destination | destinations |
| insert | point, curve | points, curves |
| subtract | body, body | bodies, bodies |

Providers synchronously return arrays of strings and receive
`{ grammar, arguments, index, context }`. Fixtures include P1–P7, C1–C5, named
bodies, views, directions and distances. IDs that resemble real geometry are
still fake. Prior arguments are keyed by slot name; parsed arguments are an
ordered array, preserving both `body` slots. Future grammars with repeated names
would need care if providers require all preceding values with those names.

`commandSuggestions` tokenizes non-whitespace spans and tracks the caret's part.
Matching is case-insensitive; prefixes filter suggestions. An exact or empty
value exposes the full option list. Trailing whitespace reveals the next slot,
up to grammar length. Unknown text remains visible as unresolved text. Numeric
distances accept signed decimals with optional mm/cm/m as strings; there is no
unit conversion or binding to Sheet measurements. Numeric acceptance currently
special-cases the `distances` provider, not a general typed-value protocol.

`columnRows` produces five fixed rows, selected at index 2. Up to two alternatives
wrap above and below; short filtered lists leave blanks without duplicates.
CSS provides a 24px caption row plus five 26px value rows, with 24px column gaps.
Every chosen word shares exactly the same row and text baseline. The completion
area overlays the lower workspace above the always-visible text input; opening
it does not resize the underlying SVG. Columns scroll horizontally when needed.

- Focus/click/input opens suggestions; blur outside or Escape dismisses.
- Up/Down cycles the caret's column. Pointer-down on an option chooses it.
- At a token end, with no text selection and valid open suggestions, Space or
  unshifted Tab accepts and advances. Other text input remains ordinary editing.
- Choosing a different verb through completion drops its old arguments.
  Ordinary direct text editing does not automatically clear the rest of the line.
- `flushSync` commits a chosen replacement before setting the DOM selection;
  keyboard handling reads the live caret. Preserve this rapid-click/Tab/Arrow
  behavior covered by the interaction regression test.
- Enter invokes only `parseCommand` and displays its message. Status is `parsed`,
  `unknown`, `incomplete` or `invalid`; all messages state “not implemented.”
  Parsed output is `{ status, verb, arguments: [{name, value}], message }`.

No command execution, multi-operation chaining, quoted/multiword names, pen-picked
arguments, asynchronous provider API or real-document lookup is implemented.
The prototype explicitly labels its sample values. Semantic styling is detailed
in ALPHA.md §15–16; ARIA combobox/listbox roles do not imply dropdown-box visuals.

## Verification and portable development

Use `npm ci`, `npm test`, `npm run build`. Node 22.14.0 was used for the migration
review; use at least Node 22.13 on the Node 22 line (installed jsdom requirement).
The Vite dev/preview scripts bind 127.0.0.1:8765 with strictPort. Do not run both
on that port simultaneously. A cloud preview may require a host override and
its own port-forwarding setup; none is configured here.

46 tests passed at this review. Geometry tests cover finite genuine 2D state,
inference, degenerate segments, P/T locality, preserved manual T, independent
curves, reference order, shared-point fixtures and reducer replay. Two React
integration tests use JSDOM and Vite middleware. SVG transforms, dimensions and
pointer capture are stubbed in the drawing test; browser layout is not simulated.
Command tests cover parsing, filtering, progressive columns, provider context,
center rows, editing, rapid keyboard navigation and non-executing feedback.

The earlier command-prototype milestone was also exercised in the local browser:
all four chosen rows had equal top/height/line-height and the drawing SVG stayed
unchanged through commands. That is historical evidence, not a claim of current
cloud/browser availability. The migration review reran tests/build only and made
no application changes. There is no CI or cloud-specific setup committed yet.
