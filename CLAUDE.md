# life dashboard

Personal dashboard. Every block is a generic display primitive bound to
either local storage or any connected MCP tool, described in plain
language instead of hand-written parsers per service. Read every file in
`docs/` before writing code. They are the spec, not background reading,
follow them exactly unless they conflict with something below.

## Read order

1. `docs/ARCHITECTURE.md` — block model, sync engine, settings scope
2. `docs/DATA_MODEL.md` — exact schemas and storage keys
3. `docs/DESIGN.md` — palette, type, component styles
4. `docs/ROADMAP.md` — build order, work one phase at a time

## Stack decision (already made, do not re-litigate)

- Vite + React + TypeScript, frontend
- Plain CSS with custom properties for tokens, no Tailwind, no CSS-in-JS
- Minimal Express backend, one job: proxy the Anthropic API call so the
  API key never reaches the browser bundle
- Browser `localStorage` for persistence, wrapped in a small typed
  storage helper, not raw `localStorage.getItem` scattered through
  components

This is a step up from a single-file HTML build. The block system has
real state, real forms, and a real editor panel, React earns its keep
here. This is not a license to add a state management library, a router,
or a component library, plain `useState`/`useReducer` and context are
enough for a single-page, single-user tool.

## Non-negotiables

These were cut on purpose after scoping a larger version. Do not add
them back without a specific new reason, "would be nice" is not one.

- No pixel drag-to-position. Blocks move via up/down controls only.
- No freeform resize. Width is `"half" | "full"`, height is
  content-driven, never user-set.
- No custom-code / iframe block type. If a real gap shows up that the
  eleven primitives in `DATA_MODEL.md` can't express, that's a signal
  to design one new primitive, not a general escape hatch.
- Settings (gear icon) holds exactly two things: connector management
  and accent theme. Nothing else lives there.
- Every other block-level action, edit, reorder, resize, delete, lives
  on the block itself via its kebab menu. Never route a block action
  through a global settings screen.
- Batch every MCP-sourced block into one API call per sync. Never one
  request per block.
- Never call `api.anthropic.com` from browser code. Always through the
  local backend proxy.
- The sidebar is a category filter over the single board, not a
  router. Clicking a sidebar item filters which blocks are visible, it
  never navigates to a separate page, unmounts the board, or needs a
  routing library. "Overview" means no filter applied. Keep the chip
  list short in practice, it's driven entirely by what categories the
  person actually assigns to blocks, don't pre-seed a big taxonomy
  (Tasks/Projects/Learning/Work/Personal/Health/...) just because it's
  possible, most boards should land at two to four categories, not
  seven.
- Eleven block types, not eight. `breakdown`, `heatmap`, and `week`
  were each added because a distinct visual shape recurred across more
  than one real use case, not because they looked nice once. See
  `DATA_MODEL.md` for what each one is and why it earned its place.
  Still no domain-specific types, none of the eleven mention GitHub,
  Gmail, or any other service by name.
- Notes stays a single plain textarea per block instance. Don't
  restructure it into headings, bullet groups, or multiple entries,
  that was tried in a reference design and reverted, plain free text
  was the better call.
- A `progress-list` row at 0% or 100% renders as a checkbox (empty or
  checked, title struck through when checked), not a percent bar at
  its extreme. Anything in between renders as the bar. This is a
  rendering rule in `DESIGN.md`, not a schema change, `percent` is
  still just a number.
- One accent color drives the whole UI. Semantic colors
  (success/warning/danger) are reserved for real status meaning, never
  used for arbitrary variety between cards. If two cards both show
  progress bars, they are the same color. Don't reproduce the
  rainbow-per-card look from early reference mockups, that reads as
  noise, not polish.

## Conventions

- Component files match the block type they render:
  `StatBlock.tsx`, `ListBlock.tsx`, etc., living in
  `src/components/blocks/`. `BlockCard.tsx` (the shared card shell) and
  `Board.tsx` (resolves each block's data and dispatches to its type)
  live one level up in `src/components/`, since neither is itself a
  block type.
- The one local-source resolver is `resolveLocal()` in
  `src/lib/resolveLocal.ts` — every local-sourced block's data goes
  through it, no per-block bespoke storage reads. First-run sample
  data lives in `src/lib/seed.ts` (`seedIfEmpty()`, called once from
  `main.tsx`, writes only keys that are still empty).
- Types live in `src/types.ts`, mirror `DATA_MODEL.md` exactly, if the
  doc and the code drift, fix the code.
- No inline styles except values computed at runtime (derived accent
  tint/strong). Everything static comes from CSS custom properties
  defined in `src/styles/tokens.css`, per `DESIGN.md`.
- Theme application is `applyTheme()` in `src/styles/themes.ts`: sets
  every palette + semantic token on `document.documentElement.style`,
  including the `customAccent` derivation documented in `DESIGN.md`.
  Called once before first render (`main.tsx`) and again on every
  settings change (`App.tsx`).
- Before reporting a phase done, review this file and every file in
  `docs/` against what was actually built. Where reality diverged, a
  naming choice, a call the spec left open, a spec error, update the
  doc to match, and say what changed in the phase report. Docs
  describing a decision that isn't in the code are worse than no
  docs.
- Confirm with the person after each phase in `ROADMAP.md` before
  starting the next one. Do not run ahead through the whole roadmap in
  one pass.
