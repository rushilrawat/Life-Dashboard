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

The board grid was revisited later, post-Phase-5, at the user's request:
fixed 4-column desktop grid with dense auto-flow instead of a loose
`auto-fit`, so a normal block set packs onto one screen instead of
scrolling from wasted gaps — `card--half` reliably spans half the
columns now rather than whatever `auto-fit` happened to land on. See
`src/styles/app.css`'s `.board` rules.

Revisited again post-Phase-6, at the user's request for a genuinely
better UI: `stat`/`stat-grid` blocks now promote into a hero band above
the grid on Overview instead of rendering as regular cards, giving the
board an actual focal point. Also fixed two real content bugs this pass
surfaced: the seeded `stat` block was titled "Habit Score" but always
displayed `metrics[0]` ("Current Streak") due to how the local resolver
picks a single metric, and the seeded `chart` block bar-charted three
differently-scaled metrics (a day count, a percent, and hours) on one
linear axis, crushing two of the three bars. Both reseeded against
`tasks` instead, which the resolver already shapes correctly. See
`ARCHITECTURE.md`'s Board layout section and `DESIGN.md`'s Hero band
section.

A 10-angle `/code-review` pass on this change surfaced and fixed five
real issues before commit: an unresolved hero-eligible block used to
render nothing at all (no tile, no kebab — unreachable if uncategorized,
since it's also excluded from the grid on Overview by type), now falls
back to a compact tile with a working kebab, same spirit as `BlockBody`'s
empty state; hero tiles never showed the stale-sync indicator regular
cards get, now they do; the delta field was colored green/red by its
leading `+`/`-` character, a made-up convention this data model never
defined and a CLAUDE.md semantic-color violation once the same field's
plain rendering as a regular card was compared side by side, now plain
throughout; a CSS rule meant to remove the hero band's trailing divider
never matched (targeted the wrong element as "last child"), replaced
with an adjacent-sibling selector that can't have that failure mode; and
`BlockEditor`'s completeness check could mark a Connected-service source
"complete" with a stale, type-mismatched capability after switching the
block-type tile in Add mode, now the type switch resets the source.

Revisited a third time, same session: the board still needed scrolling
even with the hero band, so `list`/`progress-list`/`table` now cap to
their top 5 rows with a "Show more" toggle, and `list`/`progress-list`
blocks sourced from local tasks gained drag-to-rank — a new `Task.priority`
field, always-draggable regardless of the block's current sort (a drop
flips that block's sort to a new "Priority" option), plus keyboard-
reachable rank-up/down buttons as a full non-drag equivalent. This is
the first task-mutating code path anywhere in the app. See
`ARCHITECTURE.md`'s Task priority and drag-to-rank section and
`DESIGN.md`'s Row anatomy section for the visual spec. Caught one real
bug during verification: the drag hook's props-to-state sync ran in a
`useEffect`, which lagged one render behind a shrinking visible set
(collapsing "Show more") and crashed on a stale id lookup — fixed by
resetting the live order synchronously during render instead (React's
own sanctioned pattern for this), not in an effect.

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

Gear icon opens Connectors (add/remove name+service, connected/missing
status per connector against `GET /api/connectors/status`) and Theme
(preset switch, light/dark mode, custom accent override, derived
tint/strong applied live). Wire the sidebar's connector quick-list and
"Add connector" row to this same state. Confirm theme and mode changes
repaint every block correctly, including the ring/breakdown component,
before moving on.

## Phase 5 — Sync engine

Originally spec'd around an MCP+Anthropic-LLM sync engine (any MCP
server, a plain-English query, Claude as the adapter). Pivoted at the
user's request to hand-written per-service adapters calling each
service's own free API directly — genuinely $0 to run, no Anthropic key
involved, in exchange for a small adapter file per new service instead
of zero-code MCP connections. See `ARCHITECTURE.md`'s Source kinds and
Sync sections for the resulting design.

Revised a second time, still within this phase: connectors moved from
holding one hardcoded query (`{service, config}`) to representing just a
credential (`{service}`), with each block instead picking a named
**capability** off that connector's service (`commit-heatmap`,
`recent-commits`, ...) plus that capability's own params. A connector
now backs many differently-configured blocks instead of one fixed query,
and one service can expose two different views of the same shape (two
`list` capabilities) without them colliding — the thing the first
revision's `(service, blockType)` mapping couldn't express. Added `GET
/api/connectors/status` alongside `POST /api/sync` so Settings can show
connected/missing proactively instead of only after a failed sync.

Backend proxy (`server/adapters/`) resolves each `api`-sourced block's
request directly against its service's capability function, all in
parallel — no batching or dedupe needed once there's no shared LLM call
to fit into. Frontend sync button wired to it. Response parsing into
`sync-cache:<blockId>` entries. Stale-state rendering for blocks whose
result didn't come back. Done criterion: a GitHub connector, real
contribution data rendering in a `heatmap` block via `commit-heatmap`,
end to end — verifiable live, for $0, no deferral needed since GitHub's
API is free. Google Calendar (or another service) is the natural next
connector, following the same adapter pattern, deferred pending its
OAuth setup (meaningfully more setup than GitHub's single pasted token).

Verified live post-roadmap: a real token in `.env` plus a real username
against `commit-heatmap` renders actual contribution data end to end in
the browser — the done criterion above, previously untested against a
live token. This run also surfaced that `recent-commits` was silently
broken for every user: GitHub removed the `commits` array from public
push-event payloads (now only `head`/`before` SHAs), so every row showed
"0 commits" regardless of what was actually pushed. Fixed by fetching
the head commit's message per event via `GET /repos/{repo}/commits/{sha}`
instead of reading it off the event payload. `server/adapters/github.ts`.

## Phase 6 — Polish

Weekly review banner (carried over from the earlier build: show after
7+ days since last review, one-click dismiss). Loading and error states
per `DESIGN.md`. Responsive check down to a narrow viewport. Keyboard
focus visible on every interactive element. README screenshot.

Delivered: `ReviewBanner.tsx`, accent-tint (not warning-colored, this
is a nudge not a status) with a calendar icon, dismiss writes
`last-review`. The one real "error state" gap turned out to be the
block editor letting an incomplete Connected-service source save
silently — Save now disables until connector, capability, and every
param are filled in, per `DESIGN.md`'s States section. Keyboard focus:
one global `:focus-visible` rule rather than per-component styling, so
nothing was missed by omission. Responsive: the board's existing
4-column dense grid gets a 2-column fallback at 900px (from the
earlier density pass) and a 1-column fallback at 480px; the sidebar
narrows at 640px rather than collapsing to an icon rail — nav items are
freeform category text with no icon to fall back to, an icon-only rail
was the original pitch but doesn't actually work without inventing a
category→icon mapping this app deliberately doesn't have, so a
narrower labeled sidebar shipped instead. README fully rewritten to
match the capability-based/$0 architecture (it had drifted all the way
back to describing the original MCP+Anthropic design) with a real
screenshot at `docs/screenshot.png`.

This was also the point the whole roadmap was executed through in one
pass, at the person's explicit request ("proceed with phase 6 ...
execute") — everywhere else in this doc, phases were built one at a
time with a stop-and-confirm between each.

A fourth post-roadmap addition, same session: a twelfth block type,
`embed`, for seeing a Google Sheet, a YouTube video, a Figma file, or a
Loom recording inline instead of just linked out to. This is a direct,
scoped exception to the no-iframe non-negotiable, not a reversal of it —
`embed` only recognizes a fixed provider allowlist
(`src/lib/embedProviders.ts`) and rejects anything else at input time,
there is still no way to iframe an arbitrary URL. See
`ARCHITECTURE.md`'s Embed block section and `DESIGN.md`'s Text, Links,
and Embed blocks section for the full spec, and `CLAUDE.md`'s
non-negotiables for the reasoning.

A fifth post-roadmap addition, same session, and the first actual
*reversal* rather than a scoped exception: freeform resize, at the
person's explicit request after being told it conflicted with the
original non-negotiable. `Block.width: "half" | "full"` became
`Block.widthCols: 1 | 2 | 3 | 4` (columns spanned out of the board's
4-column grid) plus an optional `Block.heightPx` override. Resize
stayed grid-snapped rather than fully arbitrary pixel/position — a
deliberate middle ground, chosen over a full canvas rewrite, that
keeps CSS Grid, the hero band, and the 900px/480px responsive
breakpoints all still meaningful. Drag handles on a card's right and
bottom edges do the resizing; kebab's new Wider/Narrower/Taller/
Shorter/Reset height buttons are the keyboard-reachable equivalent,
same pattern as drag-to-rank's rank buttons. See `ARCHITECTURE.md`'s
Board layout section and `DESIGN.md`'s Resize handles section.

A sixth post-roadmap addition, same session: box groups, a new `Group`
concept (not a block type) letting several blocks collapse and move as
one named section. Assignment lives on the block itself (a small
`GroupPicker` control next to the kebab, not folded into it, so the
kebab component shared with the hero band stays untouched), not routed
through Settings — consistent with the existing block-level-actions
rule even though a group is a new kind of thing. Top-level board order
interleaves ungrouped blocks and groups by sharing one `order`
namespace between `Block` and `Group`; within a group, order is just
`blockIds`' own array order. Grouped blocks are never hero-eligible
regardless of type, and a group with no member surviving the active
category filter simply doesn't render, same as an ordinary filtered-out
block. See `ARCHITECTURE.md`'s Groups section and `DESIGN.md`'s Groups
section for the full spec.

Two more post-roadmap changes landed in the same pass as a bug fix.
First, the fix: resize had shipped as a no-op for every block created
before the `widthCols` schema change — `App.tsx` never migrated legacy
`width: "half"|"full"` data, so `widthCols` read as `undefined` at
runtime and every resize computation evaluated to `NaN`. Fixed with a
one-time migration in `App.tsx`'s `blocks` initializer, plus
`setPointerCapture` on the resize handles (closes a real gap where
dragging across an `embed` block's `<iframe>` could silently stall the
drag) and a fix for the two resize handles overlapping ~12px at a
card's corner.

Second, a seventh post-roadmap addition: drag-and-drop board reordering
(`Block`/`Group` position — see `CLAUDE.md`'s Block position bullet for
why this is a genuine reversal, not a scoped exception) and, layered on
top of it, dragging a block into or out of a group as a second path
alongside `GroupPicker`'s menu. Both reuse `useDragReorder`, the same
hook already powering row-level drag-to-rank, rather than introducing
new drag infrastructure. See `ARCHITECTURE.md`'s Board reordering
section and the Groups section's "How reorder-drag and group-drag
coexist" note for the mechanism, and `DESIGN.md`'s Drag handle section
for the visual spec.

## Explicitly out of scope for this roadmap

Don't pull these in even if they seem like natural next steps mid-
build, they were cut deliberately, see `CLAUDE.md`:

- Drag-to-*position* — reversed post-roadmap (see below), same as
  freeform resize, both at explicit request after being told each
  conflicted with the original cut. What's still out of scope: free
  pixel/absolute placement. The reversal is drag-to-*reorder* only —
  dropping a card determines its new index in the board's order, same
  underlying mechanism `Move up`/`Move down` already used, just with a
  drag gesture added on top, not a coordinate-based canvas. Row-level
  drag-to-rank *inside* a list/progress-list block's task data (added
  post-Phase-6, see below) was always a different, older axis and
  doesn't reverse or get reversed by any of this; see `CLAUDE.md`'s
  Block position bullet for the full distinction.
- A general-purpose iframe/custom-code block type — still out of
  scope. The curated `embed` primitive (added post-roadmap, allowlisted
  providers only: YouTube, Google Sheets, Figma, Loom) is a different,
  narrower thing and doesn't reverse this, see `CLAUDE.md`'s
  non-negotiable for the distinction spelled out.
- Any block action routed through Settings instead of the block's own
  kebab menu
- Multi-user, auth, or a real database, this is a single-user,
  single-machine tool
- A router or separate pages for sidebar nav items, it's a filter over
  one board, see `ARCHITECTURE.md`
- Real brand logos anywhere, connector rows and link rows both use
  generic icons, see `DESIGN.md`
