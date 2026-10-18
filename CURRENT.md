# Current step: preserve migration context and publish repository

## Acceptance

- Review the available conversation, product specification, source and tests.
- Keep AGENTS.md concise; link to product intent, actual architecture and roadmap.
- Preserve established viewport, command, P/T, curve-selection and styling decisions.
- Separate implemented behavior, representation-only foundations and future proposals.
- Change documentation only; commit it and publish a private repository as requested.

## Status — 2026-10-18

Documentation complete. No application, dependency or test behavior changed.
Tests rerun: 46 passed. Production build passed with Node.js 22.14.0.
No fresh visual verification was needed or claimed for this documentation-only step.
The directory initially had no Git repository; an initial local baseline commit
captures the unchanged existing project. Remote publication is awaiting GitHub
authentication; no successful push is claimed yet.

The previous milestone record below is historical evidence, not live server state.

---

## Previous milestone: command sentence autocomplete prototype

## Acceptance

- Preserve all existing independent-curve and local P/T geometry behavior.
- Implement the seven requested fake grammars as data, with replaceable value providers independent of document geometry.
- Reveal a column per typed command part. All active values share one exact horizontal baseline; nearby alternatives sit above/below each value.
- Space advances; typing filters suggestions; arrow keys and text choices select values. Backtracking remains ordinary text editing. Keep the input visible beneath the suggestions.
- Use flat dark text/spacing, subtle lines and restrained semantic color, without dropdown cards or new modelling controls.
- Enter reports the parsed sentence and “not implemented”; no modelling actions execute. Fake entries are explicitly requested for this prototype, an intentional temporary exception to ALPHA.md's real-action rule.
- Test parsing, progressive disclosure, completion/backtracking, keyboard/pointer interaction, and geometry regressions. Build, run, and inspect the app.

## Status

Implemented and ready for inspection. ALPHA.md and the geometry implementation are unchanged.

- `commands.mjs` contains seven grammar definitions, fake provider functions, token completion, fixed-center column rows, and a non-executing parser. Providers receive prior arguments and a context object for later document integration. Duplicate slot names (subtract body/body) remain ordered in parsed output.
- `CommandBar.jsx` owns only command text, caret, visibility and feedback. Typing filters choices; Space/Tab accepts and advances; Up/Down cycles the caret's column; clicking an option edits that part; Escape dismisses. Ordinary input, cursor editing, and deletion remain available. Changing the verb clears arguments belonging to the old grammar.
- The completion area appears above the existing input. Each column has a role label and five fixed-height rows with the selected value centered. Narrow displays can scroll columns horizontally. Full option sets wrap around the selection; filtered sets with fewer options leave unused rows empty without duplicates.
- Enter reports a parsed sentence and “not implemented,” or missing/unknown arguments. It never dispatches a drawing action. Sample values are visibly identified as prototype data.
- All 46 automated tests pass, including a React regression test for rapid pointer → Tab → Arrow navigation. The production build passes.
- Verified in the live in-app browser: partial command completion, progressive columns, all seven parsed sentences, ordinary text, pointer selection, arrow/Tab navigation, backtracking, Escape, and Enter feedback. Measured all four selected words at exactly the same top position (739px), height (26px), and line height (26px). Inspected the rendered dark, flat design.
- Existing live drawing SVG markup remained identical through the command interactions. No page reload or geometry edit was needed. Existing 39 geometry/state/interaction tests still pass.
- At the end of that local milestone, the app was running with a four-column example. This is historical context; no running process or browser state is assumed after migration.

## Running

`npm run dev` — http://127.0.0.1:8765/
`npm test` — model and interaction tests
`npm run build` — production build
