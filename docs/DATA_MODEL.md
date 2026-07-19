# Data model

TypeScript, mirror these types exactly in `src/types.ts`. If code and
this doc drift, the code is wrong, fix the code.

## Block

```ts
type BlockType =
  | "stat" | "stat-grid" | "list" | "progress-list"
  | "table" | "chart" | "breakdown" | "heatmap" | "week"
  | "text" | "links";

type SourceKind = "local" | "mcp";

interface LocalSource {
  kind: "local";
  collection: "tasks" | "metrics";
  sort: "date-asc" | "date-desc" | "percent-asc" | "percent-desc" | "name";
  filter: "all" | "today" | "this-week" | "overdue" | "in-progress" | "done";
}

interface McpSource {
  kind: "mcp";
  connectorIds: string[];
  query: string;          // plain-language ask, e.g. "my 5 most recent commits"
}

interface Block {
  id: string;
  type: BlockType;
  title: string;
  width: "half" | "full";
  order: number;
  category?: string;      // free text, drives the sidebar filter chips, blank = only shows under "Overview"
  source?: LocalSource | McpSource;   // absent for "text" and "links"
}
```

`filter` and `sort` on a `local` source aren't fixed at creation, the
block header exposes a small dropdown for both (see `DESIGN.md`) that
writes straight back to the block's own source config. Editing it from
the header and editing it from the Add/Edit panel are the same write,
just two entry points.

## Shapes returned per block type

What a `local` resolver or an `mcp` sync response must produce, keyed by
block ID for `mcp`, computed directly for `local`.

```ts
type StatResult = { value: string; label: string };

type StatGridResult = { items: { value: string; label: string; delta?: string }[] };

type ListItem = { title: string; subtitle?: string; date?: string; tag?: string };
type ListResult = { items: ListItem[] };

type ProgressItem = { title: string; subtitle?: string; date?: string; percent: number };
type ProgressListResult = { items: ProgressItem[] };
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

`text` and `links` blocks don't use this shape system, see below.

## Connector

```ts
interface Connector {
  id: string;
  name: string;
  url: string;
}
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

## Sync cache (per mcp-sourced block)

```ts
interface SyncCacheEntry {
  blockId: string;
  syncedAt: string;      // ISO timestamp
  result: StatResult | StatGridResult | ListResult | ProgressListResult | TableResult | ChartResult | BreakdownResult | HeatmapResult | WeekResult;
  stale: boolean;         // true if last sync attempt failed to return this block
}
```

## localStorage keys

| Key                     | Value                                    |
|--------------------------|-------------------------------------------|
| `blocks`                 | `Block[]`                                 |
| `tasks`                  | `Task[]`                                  |
| `metrics`                | `Metric[]`                                |
| `blockdata:<blockId>`    | `NoteBlockData` or `LinksBlockData`       |
| `sync-cache:<blockId>`   | `SyncCacheEntry`                          |
| `settings`               | `Settings`                                |
| `last-review`            | ISO timestamp string                      |

Wrap all reads/writes in one small typed module
(`src/lib/storage.ts`), don't call `localStorage` directly from
components.

## Sync request/response (frontend to backend proxy)

Request:
```ts
interface SyncRequest {
  connectors: Connector[];          // deduped, only ones referenced by mcp blocks
  requests: { blockId: string; query: string; shape: BlockType }[];
}
```

Response:
```ts
interface SyncResponse {
  results: Record<string, StatResult | StatGridResult | ListResult | ProgressListResult | TableResult | ChartResult | BreakdownResult | HeatmapResult | WeekResult>;
  failed: string[];      // block IDs that didn't come back, render stale instead of blank
}
```
