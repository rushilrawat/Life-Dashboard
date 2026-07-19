# Roadmap

Work one phase at a time. Stop and show the result after each phase,
don't run ahead into the next one without confirmation. This mirrors
how the person's other Claude Code projects have gone, phased, reviewed
between phases, not one long unsupervised run.

## Phase 0 — Scaffold

Vite + React + TypeScript frontend. Minimal Express backend with one
route, `POST /api/sync`, stubbed to return an empty result for now.
`.env.example` with `ANTHROPIC_API_KEY`. `src/types.ts` matching
`DATA_MODEL.md` exactly. `src/lib/storage.ts` as the one typed wrapper
around `localStorage`. No UI yet beyond a blank page that confirms both
servers run and talk to each other.

## Phase 1 — Design system and shell

`src/styles/tokens.css` and `src/styles/themes.ts` with all four named
presets from `DESIGN.md`, Forest active by default, dark mode active
by default. Header (greeting, tagline, Sync button, Settings gear).
Sidebar shell: wordmark, "Overview" as the only nav item for now (no
categories exist yet), empty connector list, theme switcher
(preset dropdown + light/dark toggle) wired to real state even though
nothing else uses it yet. Empty board grid. No blocks render, this
phase is purely shell, palette, and the sidebar frame, confirm it
looks right, including a theme switch and a mode toggle, before any
block logic exists.

## Phase 2 — Local blocks, end to end

All eleven block components, including `breakdown` and the
checkbox/bar dual rendering for `progress-list`, rendering from
hardcoded sample data first, then wired to real `local` sources
reading from `tasks` and `metrics` in storage. `week` gets built here
too against a local `"this-week"` filter on tasks, since it doesn't
need a connector to prove out the layout, `heatmap` can render against
fake data for now, it won't have anything real to show until a
connector exists in Phase 5. Text and Links blocks fully built here,
including the Links block's category grouping, add form, and the
full/half responsive column layout, since both are entirely local with
no sync dependency. Seed a handful of sample tasks, metrics, and links
so the board isn't empty on first run. Give at least two seeded blocks
a `category` so the sidebar has something real to filter once Phase 3
wires it up.

## Phase 3 — Block editor and sidebar filtering

The Add/Edit Block slide-in panel, all three steps, including the
category field. Per-block kebab menu: edit, move up, move down, width
toggle, delete. Per-card `filter`/`sort` dropdown for local-sourced
blocks. Sidebar nav becomes live: category chips computed from blocks
actually on the board, clicking one filters, clicking Overview clears
it. By the end of this phase the board is fully self-service, someone
could add, configure, categorize, filter, reorder, resize, and remove
blocks without touching code.

## Phase 4 — Settings panel

Gear icon opens Connectors (add/remove name+URL) and Theme (preset
switch, light/dark mode, custom accent override, derived tint/strong
applied live). Wire the sidebar's connector quick-list and "Add
connector" row to this same state. Confirm theme and mode changes
repaint every block correctly, including the ring/breakdown component,
before moving on.

## Phase 5 — Sync engine

Backend proxy actually calls the Anthropic API with the deduped
connector list and batched per-block queries. Frontend sync button
wired to it. Response parsing into `sync-cache:<blockId>` entries.
Stale-state rendering for blocks whose result didn't come back. Test
with at least two real connectors before calling this phase done, one
connector alone won't exercise the batching or the dedupe logic. A
GitHub connector plus a `heatmap` block querying daily commit counts
for the last 12 weeks is a good concrete test case, it exercises the
type end to end, connector, batched query, real data, distinctive
rendering.

## Phase 6 — Polish

Weekly review banner (carried over from the earlier build: show after
7+ days since last review, one-click dismiss). Loading and error states
per `DESIGN.md`. Responsive check down to a narrow viewport. Keyboard
focus visible on every interactive element. README screenshot.

## Explicitly out of scope for this roadmap

Don't pull these in even if they seem like natural next steps mid-
build, they were cut deliberately, see `CLAUDE.md`:

- Drag-to-position or freeform resize
- A custom-code / iframe block type
- Any block action routed through Settings instead of the block's own
  kebab menu
- Multi-user, auth, or a real database, this is a single-user,
  single-machine tool
- A router or separate pages for sidebar nav items, it's a filter over
  one board, see `ARCHITECTURE.md`
- Real brand logos anywhere, connector rows and link rows both use
  generic icons, see `DESIGN.md`
