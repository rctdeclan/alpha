# Alpha

Minimal React drawing application. `ALPHA.md` is the product specification;
`CURRENT.md` records the implemented step and verification.

## Development

Use Node.js 22.12+ (or 20.19+).

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:8765/.

- Click empty space to start a curve and keep clicking to add points.
- Press Enter or Escape with the drawing focused to finish. The next empty-space click starts an independent curve.
- Click a curve stroke to select it, or a point to select and drag it. Selecting existing geometry ends the current drawing run; it never resumes or reconnects a finished curve.
- Drag the short dashed line through a selected point to rotate its trajectory without moving the point.

Curves share one document point pool by reference and store their own trajectory state. Point-sharing actions are not implemented yet. Drawings are in memory and reset on reload.

```sh
npm test
npm run build
npm run preview
```

Stop the development server before starting the production preview, since
both use port 8765. The production build is written to `dist/`.

React owns the interface and pointer interactions. The framework-independent
`drawing.mjs` model retains Sheet-local geometry and curve fitting.

## Command autocomplete prototype

Focus the bottom input and type `move`, then Space. Each command part opens a vertical column with all selected words aligned on one row. Space/Tab accepts and advances; Up/Down chooses alternatives; click any value to edit that part. Escape dismisses suggestions. Enter reports the parsed sentence and “not implemented.” All values are fake and no command changes the drawing.

Try `connect P1 P2`, `move P2 up 32mm`, `keep projection front`, `show curves`, `go origin`, `insert P3 C1`, or `subtract Helmet Visor`. Grammars and replaceable provider functions are defined in `commands.mjs`.
