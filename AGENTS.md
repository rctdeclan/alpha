# Working on Alpha

Read [ALPHA.md](ALPHA.md) in full before a product milestone. It defines intent;
[ARCHITECTURE.md](ARCHITECTURE.md) describes actual code;
[ROADMAP.md](ROADMAP.md) separates completed, partial and planned work.
[CURRENT.md](CURRENT.md) records the current task, acceptance and evidence.
The current user's scope takes priority; a roadmap entry is not permission to
implement it. Work in small experiential steps and stop for inspection when asked.

## Preserve these decisions

- Genuine Sheet-local `(u,v)` points first. Never introduce fake XYZ positions
  or promote the whole drawing to 3D. Future spatialisation is progressive/local.
- Exactly two geometric views side by side. Currently only the left is
  interactive; the gridded right view is intentionally empty. Resizing does not
  rescale stored points. Do not silently add cameras, pan/zoom, tools or panels.
- Segments depend only on their two endpoint P/T states. Moving P preserves T;
  editing T keeps P fixed. Non-adjacent segments and independent curves stay
  unchanged. Show only the selected point's minimal through-line, never
  conventional Bézier handles.
- Curves are first-class ordered references to document-owned points. T belongs
  to each curve's use of a point. Selection must not reconnect geometry or
  resume a finished curve. Sharing is representation-ready, not an implemented UI.
- Autocomplete uses separate vertical columns whose selected words share one
  exact baseline. Keep ordinary text input underneath. No dropdown cards/pills.
  Current fake grammars are an explicitly requested prototype exception: do not
  wire them to geometry until requested; never present them as working commands.
- Preserve the established dark flat styling and spacing in ALPHA.md §15.
  No permanent toolbar, inspector/tree, decorative chrome, bright reference-image
  surround, shadows or bundled proprietary fonts.

## Engineering and validation

- React + Vite, JavaScript/JSX and ES modules; plain CSS. Keep geometry independent
  of React, in `drawing.mjs`. Geometry helpers mutate their input; the reducer
  uses `structuredClone` to protect prior state and React StrictMode replay.
- Before implementation, inspect affected code and write acceptance in CURRENT.md.
  Do not rewrite product principles to accommodate a shortcut. Distinguish user
  decisions, temporary implementation choices and proposals in documentation.
- Setup/run: see [README.md](README.md). Use `npm ci`, `npm test`, `npm run build`.
  For behavior changes, exercise the affected interactions in a browser and
  check locality/independence; simulated DOM tests do not prove visual alignment.
  Report unavailable validation honestly. Documentation-only work needs no new UI.
- Update ARCHITECTURE.md/ROADMAP.md when implementation status changes. Keep
  CURRENT.md factual: a past local browser/server session does not survive a clone.
- Do not commit `node_modules/` or `dist/`. Local screenshots, chat attachments
  and machine-specific paths are not runtime dependencies. The private GitHub
  repository is linked in README.md; cloud environment and hosting setup remain
  separate from publishing the source.
