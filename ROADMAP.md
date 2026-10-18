# Alpha roadmap and implementation status

Status reviewed 2026-10-18 against code, tests, CURRENT.md and the available
project conversation. [ALPHA.md](ALPHA.md) defines intent;
[ARCHITECTURE.md](ARCHITECTURE.md) describes implemented behavior.
“Completed” below means delivered within its stated incremental scope, not
completion of the entire product milestone or a final interaction-design approval.
No new feature is authorized by this roadmap alone.

## Completed increments

| Increment | Delivered scope |
| --- | --- |
| Two-column shell | Equal geometric panels and bottom command input; left SVG drawing, right empty gridded view |
| Established dark styling | Near-black surround, slightly lighter separated panels, subtle grids; restrained flat monospace UI |
| Genuine 2D point placement/editing | Sheet-local u/v only, point selection and dragging |
| Automatic local curves | Incremental inferred T, deterministic endpoint-local cubic segments |
| React migration | React owns UI/state; plain JavaScript geometry remains independent |
| Direct T editing | Selected point's minimal through-line rotates direction, keeps P fixed, preserves strict locality |
| Independent curves | Stable curve IDs, finish/start another, independent selection; no implicit reconnection |
| Column autocomplete prototype | Seven fake grammars, aligned selected baseline, keyboard/pointer choices, ordinary text, non-executing parse feedback |
| Migration context | Persistent agent instructions, product decisions, actual architecture and status captured in repository docs |

Tests/build passed at review: 46 tests. See CURRENT.md for validation provenance.

## Partial foundations and unresolved interaction work

| Area | What exists | What is still missing |
| --- | --- | --- |
| Milestone 1: genuine 2D drawing | Place/move points, fit/edit local curves, select curves, command shell | Insertion/deletion, further refinement and remaining intended interactions |
| Independent points vs connectivity | Document-owned points, explicit curve point-ID sequences | Creating standalone points and connecting pre-existing points as distinct user actions; today every new point starts/appends a curve |
| Selection vs topology | Selecting existing geometry never changes connectivity or resumes a curve | Future explicit connect/share/insert workflows; their exact gestures/commands are not decided |
| Shared points | Fixture proves one P, per-curve T and incident-segment locality | No sharing, unsharing, rewiring or joining action/UI |
| Local refinement | P and T editing with endpoint-local effect | Explicit insertion initialized from old curve position/tangent; deletion; curve pulling/correction strokes |
| Sheets and geometric views | One Sheet ID and two panels | Multiple Sheets, second-view interaction, linked observations and view navigation |
| Commands | Data-driven grammar/providers, parser and column presentation | Real object providers, execution, composition, pen-picked arguments; fake entries are not operations |
| Viewport navigation | Fixed local SVG coordinates and stable positions on resize | No implemented pan/zoom/orbit/fit; no new gesture policy agreed in this conversation |

The prior interaction review raised separating independent point creation,
connection and explicit refinement from selection. The following requested step
implemented independent **curves**, not all of those proposals. Do not infer that
point-to-point connection changes or insertion were approved or delivered.
Finishing a curve currently ends the input run; selecting it later does not resume
appending. Any future resume behavior needs an explicit design decision.

## Planned product milestones (from ALPHA.md §22)

1. **Complete genuine 2D drawing/refinement.** Preserve useful local curves and
   exact P/T locality while incrementally adding the missing explicit operations.
2. **Progressive spatialisation.** Use additional observations to spatialise only
   selected geometry; retain mixed free 2D and spatial state. Not started.
3. **Arbitrary-camera editing.** Edit the same spatial truth while preserving
   camera depth unless constrained; reproject in all views. Not started.
4. **Keep projection.** Preserve one observation while refining elsewhere,
   progressing from points to curves/sections. Not started.
5. **Sheets and Regions.** Multiple persistent Sheets, implied closed regions,
   offsets and simple 2D booleans. Not started beyond a single Sheet reference.
6. **Patches.** Curve-bounded surfaces and explicit continuity relations.
   Not started.
7. **Bodies and composed modelling.** Bodies, reusable operation composition,
   booleans and eventual extrusion shorthand. Not started.

Other product intentions include snapping distinct from constraints, shape
inference, dimensions, sections/analysis, symmetry, reference imagery and
cyberdeck inputs. They appear in ALPHA.md, not in the current implementation.
The fake `keep`, `go`, `insert` and `subtract` entries demonstrate language only;
they do not establish constraints, navigation, refinement or body modelling.

## Migration and operational gaps

The project was a local directory without Git history at the start of this
review. A local baseline commit captures its existing files before documentation
changes. The project and documentation were then published to the private
[rctdeclan/alpha](https://github.com/rctdeclan/alpha) repository on `main`, following
the user’s additional request. Local `origin` tracks that repository. No Codex
Cloud environment or deployment was configured. The source is portable React/Vite; local image attachments,
prior browser contents and an already-running dev server are not required assets.

Drawings are memory-only and disappear on reload. Save/load, undo/redo, CI and
cloud setup are absent; their priority and design are not established by the
conversation. Do not confuse documenting these gaps with a promise to implement
them next. The next experiential feature should be selected by the user after
migration and inspection of the current prototype.
