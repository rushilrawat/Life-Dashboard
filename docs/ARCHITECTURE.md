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

## Per-block live filter

For a `local`-sourced block, its `sort` and `filter` aren't fixed at
creation. The card header exposes a small dropdown for both (visible
next to the title, e.g. "This Month ▾" on a metrics block, "Today ▾"
on a task list). Changing it writes straight back to that block's
`source` config and re-renders immediately, no sync required, this is
still local data. `api`-sourced blocks don't get this control, their
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
  title, connector, capability, params, or source config without
  deleting the block.
- **Move up / move down** — reorders within the board. This is the only
  positioning mechanism, no drag, no coordinates.
- **Width: Half / Width: Full** — the only sizing control. No custom
  width, no height control at all, blocks size to their content.
- **Delete** — removes the block and its cached sync data.

## Add / Edit Block flow

Three steps, in this order, matching the reference design:

1. **Choose block type** — grid of the eleven types.
2. **Data source** — for every type except text/links: toggle between
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
   consistency, don't special-case it out. For text/links: skip this
   step, there's nothing to configure.
3. **Block settings** — title, width (half/full), category (free text
   with autocomplete from categories already in use, optional, blank
   means the block only ever shows under Overview).

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
