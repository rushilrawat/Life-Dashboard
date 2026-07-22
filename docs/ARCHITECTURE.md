# Architecture

## The core idea

A block is a container with a type (how it displays) and a source (where
its data comes from). Type and source are fully independent. A `list`
block can source from local tasks or from a connected service. A
`heatmap` block can source from local data (once something local is
day-by-day) or from a GitHub connector's contribution calendar. The
block component never knows or cares where its data came from, it only
knows the shape it was handed.

The shape contract is fixed (eleven shapes, see `DATA_MODEL.md`).
Getting an arbitrary external service into that fixed shape is a
hand-written adapter per service, in `server/adapters/`, exporting a
small menu of named **capabilities** — not an LLM call. This was a
deliberate pivot away from an earlier MCP+LLM design: that version could
connect to any MCP server with zero new code, but required a paid
Anthropic API call on every sync. This version costs nothing to run, in
exchange for a small adapter file per new service.

A connector represents a credential, not a credential-plus-one-query — a
GitHub connector just proves "GitHub is connected" (via `.env`). What to
actually fetch is a per-block choice: which capability of that connector
(`commit-heatmap`, `recent-commits`, ...) and that capability's own
params (e.g. a username). This is what lets one connector back many
differently-configured blocks, and lets one service expose two different
`list`-shaped views without them colliding.

## Block types (display primitives, not domain types)

`stat`, `stat-grid`, `list`, `progress-list`, `table`, `chart`,
`breakdown`, `heatmap`, `week`, `text`, `links`, `embed`. Never add a
domain-specific type like "github-block" or "email-block". If a new
need shows up, it is one of these twelve, shaped by its query, not a
thirteenth type. Each of the last four additions earned its place the
same way: a distinct visual shape that recurred across more than one
real use case, not something that just looked nice once.

- `breakdown`: a total plus categorized segments, task progress, focus
  time, a habit score, anything with a whole and its parts.
- `heatmap`: a day-by-day intensity grid, GitHub-style. Coding
  activity is the obvious case, but the same shape fits a habit
  streak, a workout log, a reading log, anything that's a count per
  day over time.
- `week`: seven day-columns, each holding a short list of entries.
  Calendar events are the obvious case, but the same shape fits "tasks
  due this week" from local data just as well, it's not calendar-
  specific, it's date-keyed-entries-specific.
- `embed`: inline external content that's genuinely more useful seen
  in place than linked out to, a spreadsheet, a video, a design file.
  Unlike every other type, it isn't shaped by an adapter's
  `resultShape` — it's a curated allowlist of embeddable providers
  (YouTube, Google Sheets, Figma, Loom today), see the Embed block
  section below and `CLAUDE.md`'s iframe non-negotiable for why this
  stays narrow rather than becoming a general "embed any URL" hatch.

`text`, `links`, and `embed` are the three exceptions to everything
below, they hold user-authored content directly (a note, a bookmark
list, a pasted URL) and have no source at all.

## Source kinds

### `local`

Reads directly from the app's own stored tasks or metrics. No network
call, no latency, always current. Config is a collection
(`"tasks" | "metrics"`) plus a sort and a filter, both fixed dropdown
options, not free text, see `DATA_MODEL.md` for the exact option list.

Local is not a lesser fallback, it's the correct choice whenever the
data already lives in this app. Don't route local data through an LLM
call, that only adds latency for data that's already structured.

`LocalSource` names a collection, not a block type, so one resolver
(`src/lib/resolveLocal.ts`) shapes whichever collection into whichever
type the block asks for. The mapping actually implemented:

- `stat` from `metrics`: passthrough of the first item after
  sort/filter (`{value: m.value, label: m.name}`) — a single Metric
  already matches StatResult's shape. From `tasks`: a count of the
  filtered set (`{value: "3", label: "Overdue"}`, label derived from
  the filter name).
- `stat-grid` from `metrics`: every item, mapped directly. From
  `tasks`: grouped by `category`, one item per group with the count.
- `list` / `table` from `tasks`: title/category/date map onto
  title/subtitle/date. Leading element is a plain generic dot/icon,
  not status-colored — `ListItem`/`TableResult` carry no per-row
  status field to color from.
- `progress-list` from `tasks`: title/category/date/percent map
  directly onto the shape; the checkbox/bar rendering is always
  accent-colored per `DESIGN.md`, never role-colored.
- `chart` from `metrics`: one bar per metric, value parsed from the
  metric's free-text value string (first number found, default 0 —
  `Metric.value` is display text like "6 days" by design, so this is
  best-effort, not a guarantee). From `tasks`: one bar per category,
  value is the count.
- `breakdown` from `tasks`: segments are Done/Overdue/In
  progress/Not started counts (the roles this ring is meant to show),
  `total` is `{value: "<done>/<total>", label: "Tasks Done"}`. See
  `DESIGN.md`'s Ring section for how segment count changes the arc math.
- `week` from `tasks`: intended to always pair with `filter:
  "this-week"`; groups the filtered tasks by exact date match across
  the 7 fixed days.
- `heatmap` has no local mapping — no local day-by-day collection exists
  in storage. It degrades to the card's empty state, same as any other
  unhandled (source, type) pairing, until it's `api`-sourced from a
  connector whose service declares a capability with `resultShape:
  "heatmap"` (GitHub's `commit-heatmap`, today).

Not every (type, collection) pair is meaningful — a `date-asc` sort
against `metrics`, for instance, is a no-op, since `Metric` has no date
field. The resolver degrades safely (returns the input unsorted, or
`null` for an unhandled pairing, which the card renders as its empty
state) rather than guessing at semantics that don't exist.

### `api`

Reads from one connected external service via a hand-written adapter,
resolved at sync time through a direct call to that service's own API.
Config is a connector ID, a capability ID, and that capability's params
(e.g. `{ username: "rushil" }`) — never a freeform query. A capability
is a named operation an adapter declares (`server/adapters/github.ts`
exports `commit-heatmap` and `recent-commits`, for instance), each with
its own `resultShape` (which of the eleven block types it fills) and its
own param schema. The block editor only offers capabilities whose
`resultShape` matches the block being configured, so an unsupported
pairing is never selectable in the first place.

## Connectors

A connector is `{ id, name, service }` — a registration that a service
is in use, not a credential and not a query. `service` picks which
adapter resolves it (`"github"` today). The one real credential per
service (e.g. `GITHUB_TOKEN`) lives once in the backend's `.env`, never
in a connector instance — this is a single-user tool, one account per
service is the realistic case. What to fetch (capability + params) lives
on each block's `ApiSource`, not the connector, so one connector can
back many differently-configured blocks — two heatmaps for two different
GitHub usernames don't need two connectors, just two blocks pointed at
the same one with different params.

Connectors are referenced by ID from any number of `api`-sourced blocks,
deleting a connector should warn if blocks still reference it rather
than silently breaking them. Settings shows each connector's
connected/missing status (`GET /api/connectors/status`, checks the
adapter's required env vars against `.env` without ever exposing their
values) — this is checked proactively, not discovered only after a
failed sync.

## Sync

One button, fires every `api`-sourced block's fetch in parallel — each
is an independent, cheap call to that service's own API, so there's
nothing to batch or dedupe the way a shared LLM call would need.

1. Collect every block where `source.kind === "api"`, resolve each
   one's `connectorId` against `Settings.connectors` (the frontend
   already holds this in memory, so it resolves the connector's
   `service` here rather than making the backend keep its own registry).
   A block whose connector no longer exists fails immediately, no
   network call.
2. One request to the backend proxy: `{ blockId, connectorId, service,
   capability, params }` per resolvable block.
3. The backend looks up each request's adapter by `service`, runs its
   `capability` function with `params`, in parallel
   (`Promise.allSettled`), and returns `{ results, failed }` keyed by
   block ID.
4. Write each result into that block's cache entry. A block whose ID
   comes back in `failed` renders its existing cached state with a
   stale indicator, never a hard error that blanks the block.

`local`-sourced blocks are not part of sync. They render on every app
load and every relevant data change (a task's percent changing
re-renders any block reading from tasks), independent of the sync
button entirely.

## Settings

The gear icon opens exactly two sections:

1. **Connectors** — add (name + service), view each one's
   connected/missing status, remove. The full manage surface.
2. **Theme** — named preset (Forest, Slate, Plum, Charcoal), light/dark
   mode, and a custom accent override, tint and "strong" shades
   derived programmatically from whichever accent ends up active.

Nothing else belongs in Settings. Block visibility, order, width, and
content all live on the block itself.

The sidebar also shows a compact connector list with an "Add
connector" row at the bottom. This is a second entry point into the
exact same `Settings.connectors` state, not a parallel system: the
sidebar's add form opens the same add flow Settings uses, and the
sidebar list is read-only otherwise, no inline edit or remove there.
Removing or renaming a connector always happens in Settings. Two
places to see connectors, one place to actually manage them.

## Board navigation (sidebar)

The sidebar is a filter over the one board, never a router, never a
second page. Its items are computed, not hand-configured: "Overview"
always first (clears any filter, shows every visible block), then one
chip per distinct `category` value present across current blocks. A
task-progress block tagged `category: "Tasks"` makes a "Tasks" chip
exist, delete every block in that category and the chip disappears.
Clicking a chip filters the board to blocks whose category matches,
clicking it again (or clicking Overview) clears the filter. This is a
client-side array filter over blocks already in memory, nothing about
it touches routing, URL state, or a second render tree.

Don't pre-populate categories. A fresh install has zero chips beyond
Overview, they only appear as the person actually tags blocks. Most
real boards should land around two to four, treat a reference design
showing seven as illustrative range, not a target to hit.

## Board layout: hero band + grid

`Board.tsx` renders two regions, not one. On the Overview view (no
category filter active), every `stat` and `stat-grid` block is pulled
out of the regular grid and rendered in a hero band above it; every
other type, and every block when a category filter *is* active, renders
in the grid as before. This is a rendering-time split only — keyed off
`block.type` plus whether `activeCategory` is null in `App.tsx` — not a
new field on `Block`, so `DATA_MODEL.md` doesn't change. See `DESIGN.md`'s
Hero band section for the visual spec and the reasoning (a glanceable
focal point only makes sense for the whole board, not a filtered slice).

Reordering stays the single swap-two-ids mechanism `App.tsx.swapOrder`
already implements; a hero tile's Move Up/Down just resolves its
neighbor from the hero-only sub-list instead of the full board, so it
reorders visibly within the strip instead of silently matching against
a grid card it isn't rendered next to.

## Resize (width and height)

Grid-snapped, not a freeform pixel/position canvas — a deliberate
reversal of the original non-negotiable (`CLAUDE.md`), scoped to keep
CSS Grid as the layout model rather than rewriting the board around
absolute positioning. `Block.widthCols` (1-4) is the number of the
board's 4 columns a card spans; `Block.heightPx` is an optional pixel
override, absent by default (content-driven, as before).

- **Width drag**: a handle on the card's right edge (`BlockCard.tsx`).
  Dragging measures the card's current pixel width divided by its
  current `widthCols` to get one column's approximate width, then
  rounds the drag delta to the nearest whole column, clamped to
  `1..4`. Live visual feedback during the drag, committed to
  `Block.widthCols` on pointer-up.
- **Height drag**: a handle on the card's bottom edge. Dragging from an
  unset (content-driven) height starts from whatever the card's body is
  currently rendered at, so there's no jarring jump the first time it's
  touched. Clamped to a 120px floor. Once set, the card body scrolls
  internally (`overflow-y: auto`) past that height instead of clipping
  silently — the header stays fully visible either way, only the body
  is height-constrained.
- **Viewport clamping**: `widthCols` is never mutated by the current
  viewport, only clamped for *display* — `Board.tsx` computes the
  board's current column count (4 / 2 / 1 at the existing 900px/480px
  breakpoints) and renders `grid-column: span min(widthCols, maxCols)`.
  A block stored at `widthCols: 4` still renders full-width at a
  4-column viewport even if it was last viewed clamped to 2 at a
  narrower one.
- **Keyboard equivalent**: kebab's Wider / Narrower (±1 column, clamped
  1-4) and Taller / Shorter (±40px, floor 120) / Reset height (clears
  `heightPx` back to content-driven), same "every drag interaction ships
  a non-drag equivalent" rule the row-level drag-to-rank buttons already
  established.
- **Hero band**: a hero-eligible block's kebab still exposes these
  controls (same reasoning `DESIGN.md`'s Hero band section already gives
  for keeping width controls there even though hero tiles don't render
  with a size at all) — they stage `widthCols`/`heightPx` for whenever
  the block next renders as a regular card (a category filter, or
  falling out of hero eligibility), with no visible effect on the tile
  itself in the meantime.

## Groups

A collapsible section (`Group`, see `DATA_MODEL.md`) holding several
blocks, collapsed and moved as one unit. Always full board width
(`grid-column: span` the current column count, same computed-inline
pattern `BlockCard.tsx` uses for a resizable card, just always maxed
out rather than reading a stored value) — a group is never itself
resized, only the blocks inside it are.

- **Assignment lives on the block, not the group**: `GroupPicker.tsx`,
  a small icon button next to the pencil/kebab on every regular card
  (not the hero band, see below), deliberately separate from
  `KebabMenu` so the shared kebab component (used by both regular cards
  and hero tiles) doesn't need to know about groups at all. Ungrouped
  shows an "add to group" icon opening a small dropdown: pick an
  existing group, or name a new one inline (same "swap the row/dropdown
  for a form" pattern as everywhere else in this app — no native
  `prompt()`). Already-grouped shows a single "remove from group" icon,
  no dropdown needed since there's only one thing to do.
- **New group**: created the first time a block is assigned to one
  (`onCreateGroupWith` in `App.tsx`) — there's no separate "create empty
  group" flow, a group with nothing in it has nothing to collapse or
  move as a unit. The new group's `order` takes over the block's old
  top-level slot, so it appears right where the block used to be rather
  than jumping to the end of the board.
- **Ordering**: top-level board order interleaves ungrouped blocks and
  groups by comparing whichever of `Block.order` / `Group.order`
  applies (`App.tsx.swapOrder`, generalized to look up either
  collection by id) — a group's kebab Move up/down uses the exact same
  mechanism a block's does. *Within* a group, order is `blockIds`'
  array order instead, reordered by a separate `swapWithinGroup`
  function; a grouped block's kebab Move up/down resolves its neighbor
  from the group's member list rather than the top-level board list.
  Both cases reuse one generic `neighborMove(list, i, onSwap)` helper in
  `Board.tsx` — list-of-ids-plus-a-swap-function is the same shape
  either way.
- **Removing a block from a group** drops it from `blockIds` (dissolving
  the group entirely if that was the last member) and gives it a fresh
  top-level `order`, so it reappears at the end of the board rather than
  wherever its stale pre-grouping order value happens to sort to now.
- **Deleting a group** (its own kebab) asks, inline, whether to delete
  the member blocks too or just ungroup — "Keep blocks, ungroup" releases
  every member back to the top level in their existing relative order,
  right where the group was (fractional order offsets off the group's
  own slot, so nothing else on the board needs renumbering); "Delete
  group and blocks" removes them outright, same cleanup `deleteBlock`
  already does (blockdata, sync-cache). Same inline-warning spirit as
  Settings' connector delete, not a native `confirm()`.
- **Category filter**: a group has no `category` of its own. Its
  members are looked up against the *already-filtered* blocks array
  (`App.tsx`'s existing `activeCategory` filter, unchanged), so a group
  with no member surviving the filter simply doesn't render, and one
  with some matching members shows only those — the same "filtered out
  means not rendered" rule an ordinary block already follows, extended
  to groups for free rather than needing its own category concept.
- **Hero band**: a grouped block is never hero-eligible regardless of
  type — grouping is an explicit choice to keep something with its
  group, hero promotion would silently defeat that. It only ever
  renders inside its group, as a regular card.
- **Rename**: click the group's title directly (a text input in place),
  not routed through the kebab — a single text field doesn't need a
  menu round-trip the way move/delete do.

## Per-block live filter

For a `local`-sourced block, its `sort` and `filter` aren't fixed at
creation. The card header exposes a small dropdown for both (visible
next to the title, e.g. "This Month ▾" on a metrics block, "Today ▾"
on a task list). Changing it writes straight back to that block's
`source` config and re-renders immediately, no sync required, this is
still local data. `api`-sourced blocks don't get this control, their
shape comes from whatever the last sync returned.

## Task priority and drag-to-rank

The first place anything in this app mutates the `tasks` collection from
the UI — every other write is to `Block`/`Settings` state. `Task` carries
a `priority: number`, a single global manual rank shared across the whole
app (lower = ranked higher), independent of `date`/`percent`/`name`. It
exists purely so a person can order their tasks by hand when none of the
other sorts reflect what actually matters right now.

A `list`/`progress-list` block whose source is `local` + `collection:
"tasks"` always shows a drag handle and rank-up/rank-down buttons per
row, regardless of the block's current sort — dragging (or clicking a
rank button) is never blocked by "wrong sort selected." A drop:

1. Reads every task, sorted by current `priority`.
2. Walks that full list, substituting the dragged block's *visible* rows
   (which may be a filtered subset, and may be capped to the top 5, see
   Row cap below) with their new drop order, leaving every task not
   currently visible in this block untouched, in its existing relative
   position around the ones that moved.
3. Writes the full task list back with recomputed `priority` values
   (`src/lib/reorderTasks.ts`).
4. Sets that block's own `source.sort` to `"priority"` through the same
   `onSourceChange` path the header's Sort dropdown already uses — this
   is also what makes the UI notice the write: nothing holds `tasks` as
   React state, so the re-render that picks up the fresh priorities is a
   side effect of the sort-field change, not a separate mechanism.

Because step 2 merges into the *global* order rather than just the
visible subset, ranking within one filtered block (e.g. only "Overdue"
tasks) can pull previously-hidden tasks into a different block's visible
set the next time it's viewed by priority — this is correct, not a bug:
priority is one ranking shared by the whole app, not a per-block-instance
setting.

Every interactive element here has a non-drag equivalent (rank-up/rank-down buttons, always visible, not hover-gated) — native HTML5
drag-and-drop has no keyboard path, and this app already treats keyboard
reachability as a baseline (see Keyboard focus in `DESIGN.md`), so the
buttons aren't optional polish, they're how a keyboard-only person ranks
a task at all.

This is row-level, inside one block's data — it doesn't touch `Block.order`
or move anything on the board grid, so it's a different axis from the
block-position drag-to-position CLAUDE.md's non-negotiables rule out (see
that file for the distinction spelled out explicitly).

### Row cap

`list`, `progress-list`, and `table` blocks all cap their rendered rows
to 5 by default, with a "Show N more" / "Show less" toggle when there
are more. Ephemeral component state, not persisted, not a per-block
setting — resets on reload, same content-driven-height spirit as
everything else about block sizing. When a block is collapsed to its
top 5, only those 5 are draggable; ranking a row currently hidden by the
cap means expanding first.

## Personalization

Header greeting is time-of-day (`"Good morning" | "Good afternoon" |
"Good evening"`, by local hour) plus `Settings.displayName`, computed
client-side, no stored greeting string. Falls back to just the
time-of-day phrase with no name if `displayName` is empty, never shows
a placeholder like "there" or "friend".

## Block-level operations

Every block (except while adding) shows a kebab menu with:

- **Edit block** — reopens the Add/Edit panel pre-filled, change
  title, connector, capability, params, or source config without
  deleting the block.
- **Move up / move down** — reorders within the board. This is the only
  positioning mechanism, no drag, no coordinates.
- **Wider / Narrower / Taller / Shorter / Reset height** — the
  keyboard-reachable equivalent of the card's drag-resize handles, see
  the Resize section above. Not the only sizing mechanism (unlike
  reordering above) — dragging the card's own edges is the primary one.
- **Delete** — removes the block and its cached sync data.

Group assignment (add to group / remove from group) is a block-level
action too, but lives in its own small `GroupPicker` control next to
the kebab rather than inside it — see the Groups section above for why.

## Add / Edit Block flow

Three steps, in this order, matching the reference design:

1. **Choose block type** — grid of the twelve types.
2. **Data source** — for every type except text/links/embed: toggle between
   Local and Connected service, then the relevant config. Local shows
   collection+sort+filter. Connected service shows a cascade: a
   connector picker (filtered to connectors whose service has any
   capability matching this block type), then a capability picker
   (filtered to that connector's capabilities matching this block
   type), then that capability's own params rendered as plain labeled
   fields (e.g. a GitHub username) — each level empty/disabled until
   the one before it is chosen. `heatmap` will almost always be a
   connected service in practice, few people have a local day-by-day
   count worth a heatmap, but the toggle stays available for
   consistency, don't special-case it out. For text/links/embed: skip
   this step, there's nothing to configure here — embed's one field
   (the URL) is entered on the block itself, same pattern as Links'
   add form, not in this panel.
3. **Block settings** — title, an initial width (¼/½/¾/Full, fine-tuned
   later by dragging the card's own edge, see the Resize section),
   category (free text with autocomplete from categories already in
   use, optional, blank means the block only ever shows under
   Overview).

Editing an existing block reopens this same flow pre-filled. Changing
the block's type mid-edit is not supported, delete and recreate
instead, that edge case isn't worth the UI complexity. In practice
this means the type grid renders every other tile disabled while
editing, with a one-line hint explaining why, rather than removing the
step entirely, so the panel still shows what type the block is.

Nothing in this doc placed the trigger that *opens* this panel for a
brand-new block, every other entry point here is block-level (the
kebab's "Edit block") or reopens an existing block. It's a dashed-
outline "+ Add Block" tile at the end of the board grid, sized like any
other card. This was a genuine gap, not a spec detail, resolved this
way over a header button or a sidebar row so it doesn't add to either
of those two surfaces' otherwise-complete, deliberately short
enumerations elsewhere in this doc and in `DESIGN.md`.

## Links block: the organizer, not a settings shortcut

Links is not a static shortcut list. It's a small bookmark organizer
that lives entirely in this one block, `local` source, no network
call, ever.

- Each link has a `category`, free text, not a fixed enum. Suggest two
  on first use ("Frequent", "Watch later") but never restrict input to
  a preset list, autocomplete from categories already used.
- The block groups links by category, most recently added first within
  each group.
- Add form: label, URL, category (text input with datalist suggestions
  from existing categories).
- No click tracking, no auto-sort by usage, that's speculative
  infrastructure for a v1. If it's genuinely wanted later it's a small,
  isolated addition, not a reason to hold up the rest of this build.

## Embed block: curated, not a general iframe hatch

Like Links, this lives entirely in the block, `local`-shaped in spirit
(no connector, no sync) even though its source is technically absent
rather than `LocalSource`. One URL per block instance, keyed by block
ID, stored as `EmbedBlockData`.

- Empty state: a single URL input plus an "Embed" button. Pasting a
  link runs it through `detectEmbed()` (`src/lib/embedProviders.ts`),
  which pattern-matches it against a fixed allowlist (YouTube, Google
  Sheets, Figma, Loom) and, on a match, builds that provider's own
  official embed URL. No match keeps the Embed button disabled with a
  muted hint naming the supported providers — same "disabled button is
  the signal" convention as everywhere else in this app
  (`DESIGN.md`'s States section), not red error text.
- Once set, the card body becomes that provider's embed URL in an
  `iframe`, with a small "Change link" text control beneath to swap it
  without deleting and recreating the block.
- The embed URL itself is never stored, only the original pasted `url`
  and the detected `provider` — the embed URL is cheap to recompute
  from those two at render time, and storing it separately would let
  the two drift if `embedProviders.ts`'s URL-building logic ever
  changes.
- This is the one block type that renders a live iframe. It stays
  narrow on purpose: adding a new provider means adding one more
  pattern to `embedProviders.ts`'s matcher list, not opening a
  paste-any-URL hatch. See `CLAUDE.md`'s iframe non-negotiable.

## Backend proxy

Two routes:

- `POST /api/sync` — accepts a list of `{ blockId, connectorId, service,
  capability, params }` requests from the frontend, runs each through
  its service's adapter in `server/adapters/` in parallel, returns `{
  results, failed }` keyed by block ID. Every service credential
  (`GITHUB_TOKEN`, and any future service's key) lives only here,
  server-side, loaded from `.env`. Browser code never calls a
  third-party API directly — it only ever POSTs to this route. A
  missing credential fails that block's request, not the whole sync —
  there's no single shared gate the way one Anthropic key used to be.
- `GET /api/connectors/status?services=github,...` — for each requested
  service, checks whether its adapter's required env vars are actually
  set, returns `{ [service]: boolean }`. Lets Settings show
  connected/missing without a failed sync being the only way to find
  out, and never returns the credential values themselves.
