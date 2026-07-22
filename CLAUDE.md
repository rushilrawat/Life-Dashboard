# life dashboard

Personal dashboard. Every block is a generic display primitive bound to
either local storage or a connected external service, resolved through a
small hand-written adapter per service, each exposing a menu of named
capabilities (not a free-text query) — a deliberate pivot (see
`docs/ROADMAP.md` Phase 5) from an earlier MCP+Anthropic-LLM design that
could connect to any service with zero new code, but never ran for $0.
This version costs nothing to run, in exchange for writing an adapter
file per new service. A connector is a credential, not a query — what
to fetch is a per-block choice of capability + params, so one connector
backs many differently-configured blocks. Read every file in `docs/`
before writing code. They are the spec, not background reading, follow
them exactly unless they conflict with something below.

## Read order

1. `docs/ARCHITECTURE.md` — block model, sync engine, settings scope
2. `docs/DATA_MODEL.md` — exact schemas and storage keys
3. `docs/DESIGN.md` — palette, type, component styles
4. `docs/ROADMAP.md` — build order, work one phase at a time

## Stack decision (already made, do not re-litigate)

- Vite + React + TypeScript, frontend
- Plain CSS with custom properties for tokens, no Tailwind, no CSS-in-JS
- Minimal Express backend, one job: hold every external service
  credential (`server/adapters/`, loaded from `.env`) so no key ever
  reaches the browser bundle
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
  (This governs block position on the board grid. Row-level
  drag-to-set-priority inside `list`/`progress-list` blocks — see
  `docs/ARCHITECTURE.md`'s Task priority section — is a different axis
  entirely, it never touches `Block.order` or the grid, and isn't what
  this rule is about. It also ships with a full non-drag keyboard
  equivalent, unlike block reordering which never needed one since
  Move up/down already was the keyboard-accessible mechanism.)
- Resize is grid-snapped, not fully arbitrary. This one was reversed
  (not just carved a scoped exception, unlike the iframe rule below) at
  the person's explicit request, after being told it conflicted with
  the original cut. Width is `Block.widthCols` (1-4, columns spanned out
  of the board's 4-column grid), height is `Block.heightPx`, an optional
  override with internal scroll past it — content-driven when absent.
  Both are drag-resizable (a card's right/bottom edge handles,
  `BlockCard.tsx`), snapped to the column grid rather than free pixels
  or position, so CSS Grid, the hero band, and the responsive
  breakpoints all stay meaningful without a canvas-layout rewrite.
  Kebab's Wider/Narrower/Taller/Shorter/Reset height buttons are the
  keyboard-reachable equivalent of the drag, same pattern as
  drag-to-rank's rank buttons. Block *position* on the board grid is
  untouched by this and stays up/down-only, see the bullet above.
- No general-purpose iframe/custom-code escape hatch. The one exception
  is `embed` (see the block-type count below): a curated primitive that
  only recognizes a fixed allowlist of providers (YouTube, Google
  Sheets, Figma, Loom today) and renders each through that provider's
  own official embed URL, detected in `src/lib/embedProviders.ts`. A
  pasted link that matches none of these is rejected at input time —
  there is still no way to iframe an arbitrary URL or run custom code.
  Supporting a new provider means adding one more pattern to that file,
  not widening the hatch.
- Settings (gear icon) holds exactly two things: connector management
  and accent theme. Nothing else lives there.
- Every other block-level action, edit, reorder, resize, delete, lives
  on the block itself via its kebab menu. Never route a block action
  through a global settings screen.
- Never call a third-party service's API from browser code. Every
  service credential (`GITHUB_TOKEN`, and any future service's key)
  lives server-side only, behind the backend proxy.
- The sidebar is a category filter over the single board, not a
  router. Clicking a sidebar item filters which blocks are visible, it
  never navigates to a separate page, unmounts the board, or needs a
  routing library. "Overview" means no filter applied. Keep the chip
  list short in practice, it's driven entirely by what categories the
  person actually assigns to blocks, don't pre-seed a big taxonomy
  (Tasks/Projects/Learning/Work/Personal/Health/...) just because it's
  possible, most boards should land at two to four categories, not
  seven.
- Twelve block types, not eight. `breakdown`, `heatmap`, `week`, and
  `embed` were each added because a distinct visual shape recurred
  across more than one real use case, not because they looked nice
  once. See `DATA_MODEL.md` for what each one is and why it earned its
  place. Still no domain-specific types, none of the twelve mention
  GitHub, Gmail, or any other service by name — `embed` picks providers
  by URL shape, not by declaring a service in the type system.
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
  block type. `GroupSection.tsx` (the collapsible-section shell) and
  `GroupPicker.tsx` (a block's own add-to-group/remove-from-group
  control) live there too, same reasoning — a group isn't a block type
  either.
- The one local-source resolver is `resolveLocal()` in
  `src/lib/resolveLocal.ts` — every local-sourced block's data goes
  through it, no per-block bespoke storage reads. First-run sample
  data lives in `src/lib/seed.ts` (`seedIfEmpty()`, called once from
  `main.tsx`, writes only keys that are still empty).
- Settings is `src/components/SettingsPanel.tsx`, reusing the same
  `.editor-*` slide-in panel CSS as the Add/Edit Block panel (see
  `DESIGN.md`'s Settings panel section for why: it's the only panel
  precedent the app has, and `DESIGN.md` never specified a separate
  look for this one).
- The Add/Edit Block panel is `src/components/BlockEditor.tsx`, one
  component for both modes (`mode: "add" | "edit"`), not two. The
  kebab menu and per-card filter/sort dropdowns live inside
  `BlockCard.tsx` itself rather than their own files, they're small
  and only ever rendered as part of the card shell. Fixed dropdown
  option lists (`FILTER_OPTIONS`, `SORT_OPTIONS`) live once in
  `src/lib/localSourceOptions.ts`, shared by the card header and the
  editor panel so their labels can't drift apart.
- Block CRUD (add/edit/delete/reorder/resize) lives in `App.tsx`, the
  only component holding `blocks` state; children only ever call back
  up to it. Reordering swaps the `order` field between two block ids
  rather than taking a direction, so it works the same whether
  Overview or a category filter is the active view. Group CRUD (add/
  rename/delete/reorder/collapse, plus moving a block in or out of one)
  lives there too, alongside the only component holding `groups` state —
  same pattern, see `ARCHITECTURE.md`'s Groups section.
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
