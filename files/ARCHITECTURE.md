# Architecture

## The core idea

A block is a container with a type (how it displays) and a source (where
its data comes from). Type and source are fully independent. A `list`
block can source from local tasks or from a GitHub connector. A `chart`
block can source from local metrics or from a Slack connector's message
volume. The block component never knows or cares where its data came
from, it only knows the shape it was handed.

This is what makes "connect any block to anything" true without every
service needing its own bespoke display component: the shape contract
is fixed (eleven shapes, see `DATA_MODEL.md`), and a small hand-written
adapter per service is what maps that service's real API onto one of
those fixed shapes. The block component never knows or cares which
adapter produced its data, it only knows the shape it was handed.

This was originally speced as an LLM-mediated adapter, one Anthropic
API call per sync interpreting a plain-language query against
whichever MCP tools were attached. That was deliberately reversed to
get sync cost to effectively zero, see Sync below. The fixed-shape
contract that made the original design work is the same reason this
one still works, only the thing that fills the shape changed, from an
LLM call to a small function.

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

### `api`

Reads from one connected service through that service's hand-written
adapter. Config is a connector ID (which service instance) plus a
capability ID (which of that adapter's fixed operations to run) plus
any params that capability needs (e.g. a GitHub username). No free-text
query, the capability picks the shape and the adapter, there's nothing
for a person to phrase.

An adapter is a small server-side module per service: `github.ts`
today, `slack.ts`/`notion.ts`/`calendar.ts` whenever those get built.
Each adapter declares its own capabilities, a capability is a plain
function that calls that service's real API and returns data already
shaped as one of the eleven result types from `DATA_MODEL.md`, nothing
in between interprets or guesses. Adding a new capability to an
existing adapter, or a new adapter for a new service, is ordinary
backend work, not a prompt-engineering problem.

## Connectors

A connector is `{ id, service, label }`, a registration that a given
service is in use, not a credential. The actual secret, `GITHUB_TOKEN`
and whatever follows it, lives in `.env` and never in `Settings` or
`localStorage`, same discipline as the Anthropic key had, extended to
every service. Adding a connector in the UI registers it and shows
whether its required key is actually present server-side (a small
`GET /api/connectors/status` route checks env vars and reports
connected/missing per service), it does not collect or store the key
itself, that step happens outside the app, in `.env`, by hand.

`service` is one of a small, growing enum (`"github"` today) matched
to an adapter module of the same name. The dashboard doesn't
free-form connect to arbitrary URLs anymore, every service it can talk
to has a real adapter behind it or it isn't offered as an option.
Connectors are referenced by ID from any number of `api`-sourced
blocks, deleting a connector should warn if blocks still reference it
rather than silently breaking them.

## Sync

One button, one batched request, covers every `api`-sourced block on
the board. No LLM call anywhere in this path, that's the entire point
of the adapter model, keep it that way.

1. Collect every block where `source.kind === "api"`.
2. One request to the backend: the list of `{ blockId, connectorId,
   capability, params }` tuples.
3. The backend resolves each one by looking up the connector's
   `service`, calling that service's adapter's matching capability
   function, in parallel (`Promise.allSettled`, not sequential, sync
   time shouldn't scale linearly with block count).
4. Each capability function returns data already in its declared
   result shape, no parsing, no JSON-from-text extraction, it's a
   normal typed return value.
5. Response keyed by block ID, same shape as before this change
   (`SyncResponse` in `DATA_MODEL.md` didn't need to change, only how
   it gets filled). A block whose adapter call failed, wrong or
   missing token, service downtime, rate limit, renders its existing
   cached state with a stale indicator, never a hard error that blanks
   the block.

No 15-block cap tied to LLM context the way the old design needed,
real API rate limits are the actual constraint now, and those vary by
service. Each adapter is responsible for its own reasonable
throttling, the sync endpoint doesn't need to know the details.

`local`-sourced blocks are not part of sync. They render on every app
load and every relevant data change (a task's percent changing
re-renders any block reading from tasks), independent of the sync
button entirely.

## Settings

The gear icon opens exactly two sections:

1. **Connectors** — pick a service from the supported list, give it a
   label, see its connected/missing status against the required env
   var. The full manage surface.
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
   Local and Connected app, then the relevant config. Local shows
   collection+sort+filter. Connected app shows a connector dropdown
   (which service instance), then a capability dropdown scoped to
   whatever that connector's adapter actually supports, then any
   params that capability needs (plain labeled fields, e.g. a GitHub
   username), never a free-text query, there's no LLM on the other end
   to interpret one anymore. `heatmap` will almost always be Connected
   app in practice, few people have a local day-by-day count worth a
   heatmap, but the toggle stays available for consistency, don't
   special-case it out. For text/links: skip this step, there's
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

## Backend

Two routes, both minimal:

- `POST /api/sync` — accepts the batched `{ blockId, connectorId,
  capability, params }[]` list from the frontend, resolves each one
  against the matching service adapter in parallel, returns
  `SyncResponse` keyed by block ID. This is the only place that reads
  third-party API keys, `GITHUB_TOKEN` and whatever's added later,
  they never leave the server.
- `GET /api/connectors/status` — given the list of services the
  frontend knows about, reports which ones have their required env
  var actually set, so Settings can show connected/missing without
  ever seeing the key itself.

No Anthropic API key or call anywhere in this app anymore, that
dependency left with the MCP design. If either route is missing or a
required env var isn't set, fail loudly and specifically in the UI
(which service, which env var), never fall back to a client-side key
or a silent no-op.
