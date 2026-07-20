# Architecture

## The core idea

A block is a container with a type (how it displays) and a source (where
its data comes from). Type and source are fully independent. A `list`
block can source from local tasks or from a GitHub connector. A `chart`
block can source from local metrics or from a Slack connector's message
volume. The block component never knows or cares where its data came
from, it only knows the shape it was handed.

This is what makes "connect any block to anything" true without writing
a parser per integration: the shape contract is fixed (eleven shapes,
see `DATA_MODEL.md`), and an LLM call is the adapter between an
arbitrary external tool and that fixed shape.

## Block types (display primitives, not domain types)

`stat`, `stat-grid`, `list`, `progress-list`, `table`, `chart`,
`breakdown`, `heatmap`, `week`, `text`, `links`. Never add a
domain-specific type like "github-block" or "email-block". If a new
need shows up, it is one of these eleven, shaped by its query, not a
twelfth type. Each of the last three additions earned its place the
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

`text` and `links` are the two exceptions to everything below, they
hold user-authored content directly and have no source at all.

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
- `heatmap` has no local mapping yet — every heatmap block, local or
  mcp source alike, renders `sampleHeatmap()`'s fixed sample grid this
  phase. `ROADMAP.md`'s Phase 2 entry sanctions this explicitly ("won't
  have anything real to show until a connector exists in Phase 5").

Not every (type, collection) pair is meaningful — a `date-asc` sort
against `metrics`, for instance, is a no-op, since `Metric` has no date
field. The resolver degrades safely (returns the input unsorted, or
`null` for an unhandled pairing, which the card renders as its empty
state) rather than guessing at semantics that don't exist.

### `mcp`

Reads from one or more connected tools via a plain-language query,
resolved at sync time through a single batched API call. Config is a
list of connector IDs plus a free-text query
(e.g. "my 5 most recent commits, repo name as subtitle").

## Connectors

A connector is `{ id, name, url }`, an MCP server URL the user adds
through Settings. The dashboard doesn't validate or introspect a
connector on add, it trusts the URL and finds out whether it works at
the next sync. Connectors are referenced by ID from any number of
`mcp`-sourced blocks, deleting a connector should warn if blocks still
reference it rather than silently breaking them.

## Sync

One button, one batched call, covers every `mcp`-sourced block on the
board.

1. Collect every block where `source.kind === "mcp"`.
2. Dedupe the connector URLs referenced across all of them, that's the
   `mcp_servers` list for the API call.
3. Build one prompt containing every block's query, each tagged with
   its block ID and the JSON shape expected back (the shape matches the
   block's type, see `DATA_MODEL.md`).
4. One request to the backend proxy, which makes one Anthropic API call
   with all those MCP servers attached.
5. Parse the single JSON response, keyed by block ID. Write each
   result into that block's cache entry. A block whose ID is missing
   from the response, or whose tool call failed, renders its existing
   cached state with a stale indicator, never a hard error that blanks
   the block.

Cap at 15 `mcp`-sourced blocks per sync call. Past that, split into two
sequential calls and show progress, don't silently truncate which
blocks get resolved.

`local`-sourced blocks are not part of sync. They render on every app
load and every relevant data change (a task's percent changing
re-renders any block reading from tasks), independent of the sync
button entirely.

## Settings

The gear icon opens exactly two sections:

1. **Connectors** — add (name + URL), view, remove. The full manage
   surface.
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

## Per-block live filter

For a `local`-sourced block, its `sort` and `filter` aren't fixed at
creation. The card header exposes a small dropdown for both (visible
next to the title, e.g. "This Month ▾" on a metrics block, "Today ▾"
on a task list). Changing it writes straight back to that block's
`source` config and re-renders immediately, no sync required, this is
still local data. `mcp`-sourced blocks don't get this control, their
shape comes from whatever the last sync returned.

## Personalization

Header greeting is time-of-day (`"Good morning" | "Good afternoon" |
"Good evening"`, by local hour) plus `Settings.displayName`, computed
client-side, no stored greeting string. Falls back to just the
time-of-day phrase with no name if `displayName` is empty, never shows
a placeholder like "there" or "friend".

## Block-level operations

Every block (except while adding) shows a kebab menu with:

- **Edit block** — reopens the Add/Edit panel pre-filled, change
  title, query, connectors, or source config without deleting the
  block.
- **Move up / move down** — reorders within the board. This is the only
  positioning mechanism, no drag, no coordinates.
- **Width: Half / Width: Full** — the only sizing control. No custom
  width, no height control at all, blocks size to their content.
- **Delete** — removes the block and its cached sync data.

## Add / Edit Block flow

Three steps, in this order, matching the reference design:

1. **Choose block type** — grid of the eleven types.
2. **Data source** — for every type except text/links: toggle between
   Local and MCP-connected, then the relevant config (collection+sort+
   filter, or connector checkboxes+query). `heatmap` will almost
   always be MCP in practice, few people have a local day-by-day count
   worth a heatmap, but the toggle stays available for consistency,
   don't special-case it out. For text/links: skip this step, there's
   nothing to configure.
3. **Block settings** — title, width (half/full), category (free text
   with autocomplete from categories already in use, optional, blank
   means the block only ever shows under Overview).

Editing an existing block reopens this same flow pre-filled. Changing
the block's type mid-edit is not supported, delete and recreate
instead, that edge case isn't worth the UI complexity.

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

## Backend proxy

One route, roughly `POST /api/sync`. Accepts the batched prompt and the
deduped `mcp_servers` list from the frontend, makes the actual call to
`https://api.anthropic.com/v1/messages` with the server-side API key,
returns the parsed JSON to the frontend. This is the only place the key
exists. If this route is missing, sync must fail loudly in the UI, not
fall back to a client-side key.
