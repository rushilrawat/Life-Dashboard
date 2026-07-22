# Data model

TypeScript, mirror these types exactly in `src/types.ts`. If code and
this doc drift, the code is wrong, fix the code.

## Block

```ts
type BlockType =
  | "stat" | "stat-grid" | "list" | "progress-list"
  | "table" | "chart" | "breakdown" | "heatmap" | "week"
  | "text" | "links" | "embed";

type SourceKind = "local" | "api";

interface LocalSource {
  kind: "local";
  collection: "tasks" | "metrics";
  sort: "date-asc" | "date-desc" | "percent-asc" | "percent-desc" | "name" | "priority";
  filter: "all" | "today" | "this-week" | "overdue" | "in-progress" | "done";
}

interface ApiSource {
  kind: "api";
  connectorId: string;      // resolves against Settings.connectors, gives the service
  capability: string;       // matches a Capability.id the connector's service adapter declares
  params?: Record<string, string>;   // e.g. { username: "rushil" } for GitHub's commit-heatmap
}

interface Block {
  id: string;
  type: BlockType;
  title: string;
  widthCols: 1 | 2 | 3 | 4;   // columns spanned out of the board's 4-column grid, drag-resizable
  heightPx?: number;          // user-set height override (drag-resizable); absent = content-driven
  order: number;
  category?: string;      // free text, drives the sidebar filter chips, blank = only shows under "Overview"
  source?: LocalSource | ApiSource;   // absent for "text", "links", and "embed"
}
```

`widthCols` and `heightPx` are the one reversal (not just a scoped
exception, unlike `embed`) of a documented non-negotiable — see
`CLAUDE.md`'s Resize bullet for why this was allowed back in. Resize
stays grid-snapped: width always resolves to a whole number of the
board's columns, height is a real pixel value with internal scroll past
it, never a fully arbitrary pixel/position canvas.

`filter` and `sort` on a `local` source aren't fixed at creation, the
block header exposes a small dropdown for both (see `DESIGN.md`) that
writes straight back to the block's own source config. Editing it from
the header and editing it from the Add/Edit panel are the same write,
just two entry points.

## Shapes returned per block type

What a `local` resolver or an `api` sync response must produce, keyed by
block ID for `api`, computed directly for `local`.

```ts
type StatResult = { value: string; label: string };

type StatGridResult = { items: { value: string; label: string; delta?: string }[] };

type ListItem = { id?: string; title: string; subtitle?: string; date?: string; tag?: string };
type ListResult = { items: ListItem[] };

type ProgressItem = { id?: string; title: string; subtitle?: string; date?: string; percent: number };
type ProgressListResult = { items: ProgressItem[] };
// id is optional and only meaningful for local, tasks-sourced rows — it's
// what lets a rendered row trace back to the Task it came from for
// drag-to-rank (see ARCHITECTURE.md's Task priority section). Absent for
// api-sourced or metrics-sourced rows, which just render without it.
// percent 0 or 100 renders as a checkbox, not a bar, see DESIGN.md.
// The data doesn't change, only how a row at either extreme is drawn.

type TableResult = { columns: string[]; rows: string[][] };

type ChartResult = { points: { label: string; value: number }[] };

type BreakdownResult = {
  total: { value: string; label: string };
  segments: { label: string; value: number; role?: "accent" | "success" | "warning" | "danger" }[];
};

type HeatmapResult = {
  days: { date: string; value: number }[];   // ISO date, one entry per day, gaps are treated as 0
};

type WeekResult = {
  days: {
    date: string;                             // ISO date
    entries: { title: string; time?: string; tag?: string }[];
  }[];                                          // always exactly 7, today through today+6
};

type BlockResult =
  | StatResult | StatGridResult | ListResult | ProgressListResult
  | TableResult | ChartResult | BreakdownResult | HeatmapResult | WeekResult;
```

`heatmap` is the day-by-day intensity grid, coding activity via a
GitHub connector is the obvious case, but a habit streak or workout
log fits the same shape. Color intensity is derived client-side from
`value` (a simple quartile or fixed-bucket scale against the max in
the set), the source never sends a color, just numbers.

`week` is seven fixed columns, each a day with a short entry list.
Almost always sourced from a calendar connector, but a `local` source
filtered to `"this-week"` against tasks works too, same shape either
way, that's the point of keeping type and source independent.

`breakdown` is the ring-plus-segments shape: a whole in the center, its
parts around it, task progress, focus time, a habit score. `role` on a
segment picks its color from the semantic palette in `DESIGN.md`, omit
it and the segment uses the plain accent color. A `breakdown` with one
segment or none is just a plain ring, that's a valid, common case, not
a special one.

`text`, `links`, and `embed` blocks don't use this shape system, see below.

## Connector

A connector represents a credential, not a credential-plus-one-query: no
params, no secret. The one real credential per service (e.g.
`GITHUB_TOKEN`) lives once in the backend's `.env`, never in a connector
instance — what to actually fetch lives on each block's `ApiSource`
instead. Adding a new service is one more union member plus one adapter
in `server/adapters/`, not a shape change.

```ts
type Connector = {
  id: string;
  name: string;
  service: "github";
};

type ConnectorService = Connector["service"];

const SERVICE_LABELS: Record<ConnectorService, string> = {
  github: "GitHub",
};

// A named, adapter-declared operation: what it returns (resultShape)
// and what params it needs. Mirrors each adapter's own capability list
// in server/adapters/ — the block editor's capability dropdown reads
// from this, filtered to capabilities whose resultShape matches the
// block being configured, so an unsupported pairing is never selectable.
type Capability = {
  id: string;
  label: string;
  resultShape: BlockType;
  params: { key: string; label: string; type: "text" | "number" }[];
};

const CAPABILITIES: Record<ConnectorService, Capability[]> = {
  github: [
    {
      id: "commit-heatmap",
      label: "Commit heatmap",
      resultShape: "heatmap",
      params: [{ key: "username", label: "GitHub username", type: "text" }],
    },
    {
      id: "recent-commits",
      label: "Recent commits",
      resultShape: "list",
      params: [{ key: "username", label: "GitHub username", type: "text" }],
    },
  ],
};
```

## Task (local collection)

```ts
interface Task {
  id: string;
  title: string;
  note: string;
  date: string;        // ISO date, YYYY-MM-DD
  percent: number;      // 0-100
  category: string;     // free text, e.g. "TRS", "Coursework", "Builds", "Personal"
  priority: number;     // global manual rank, lower = ranked higher; see ARCHITECTURE.md
}
```

## Metric (local collection)

```ts
interface Metric {
  id: string;
  name: string;
  value: string;        // string, not number, so "6 days" and "98%" both work
}
```

## Note (used by `text` blocks)

```ts
interface NoteBlockData {
  content: string;
}
```
One per block instance, keyed by block ID, not a shared global note.

## Link (used by `links` blocks)

```ts
interface Link {
  id: string;
  label: string;
  url: string;
  category: string;     // free text, suggested defaults: "Frequent", "Watch later"
  addedAt: string;       // ISO timestamp
}

interface LinksBlockData {
  links: Link[];
}
```
One link collection per block instance, keyed by block ID. If more than
one links block ever exists on the board, they do not share data.

## Embed (used by `embed` blocks)

```ts
type EmbedProvider = "youtube" | "google-sheets" | "figma" | "loom";

interface EmbedBlockData {
  url: string;             // the original URL the person pasted
  provider: EmbedProvider;
}
```
One embed per block instance, keyed by block ID, same storage pattern as
`NoteBlockData`/`LinksBlockData`. `provider` is decided by pattern-matching
the pasted URL against a fixed allowlist in `src/lib/embedProviders.ts`,
which also builds that provider's official embed URL (recomputed from
`url` at render time, not stored separately). A link matching none of the
allowlist is rejected at input time — see `CLAUDE.md`'s iframe
non-negotiable for why this stays a curated primitive, not a general
"embed any URL" hatch.

## Settings

```ts
interface ThemePreset {
  name: string;                 // "Forest", "Slate", "Plum", "Charcoal"
  light: PaletteTokens;
  dark: PaletteTokens;
}

interface PaletteTokens {
  bg: string; surface: string; surfaceRaised: string;
  border: string; borderStrong: string;
  text: string; textSecondary: string; textMuted: string;
  accent: string; accentStrong: string; accentTint: string;
}

interface Settings {
  displayName: string;          // used in the header greeting, e.g. "Rushil"
  themeName: string;            // matches a ThemePreset.name
  themeMode: "light" | "dark";
  customAccent?: string;        // hex, overrides just the accent token of the active preset/mode
  connectors: Connector[];
}
```

`ThemePreset[]` is a fixed list shipped with the app, not user-editable
data, define the four presets directly in
`src/styles/themes.ts`, matching the hex values in `DESIGN.md`. Only
`customAccent`, `themeName`, `themeMode`, and `displayName` are stored
per-user in `Settings`. Changing `customAccent` re-derives
`accentStrong`/`accentTint` the same way the single-accent picker
worked in the prior version of this app, it just now layers on top of
a named preset instead of standing alone.

## Sync cache (per api-sourced block)

```ts
interface SyncCacheEntry {
  blockId: string;
  syncedAt: string;      // ISO timestamp
  result: BlockResult;
  stale: boolean;         // true if last sync attempt failed to return this block
}
```

## localStorage keys

| Key                     | Value                                    |
|--------------------------|-------------------------------------------|
| `blocks`                 | `Block[]`                                 |
| `tasks`                  | `Task[]`                                  |
| `metrics`                | `Metric[]`                                |
| `blockdata:<blockId>`    | `NoteBlockData`, `LinksBlockData`, or `EmbedBlockData` |
| `sync-cache:<blockId>`   | `SyncCacheEntry`                          |
| `settings`               | `Settings`                                |
| `last-review`            | ISO timestamp string                      |

Wrap all reads/writes in one small typed module
(`src/lib/storage.ts`), don't call `localStorage` directly from
components.

## Sync request/response (frontend to backend proxy)

Each request carries the connector's `service` directly — the backend
has no database to resolve `connectorId -> service` on its own, and the
frontend already has `Settings.connectors` in memory, so it resolves
this once and sends it along. No dedupe, no batching beyond one HTTP
call covering every block: every request is an independent, cheap,
direct call to that service's own API (no LLM in the loop), so the
backend just fans them out in parallel.

Request:
```ts
interface SyncRequest {
  requests: {
    blockId: string;
    connectorId: string;
    service: ConnectorService;
    capability: string;
    params?: Record<string, string>;
  }[];
}
```

Response:
```ts
interface SyncResponse {
  results: Record<string, BlockResult>;
  failed: string[];      // block IDs that didn't come back, render stale instead of blank
}
```
