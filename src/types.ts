// Mirrors docs/DATA_MODEL.md exactly. If this file and the doc drift, the
// doc wins — fix this file.

// ## Block

export type BlockType =
  | "stat" | "stat-grid" | "list" | "progress-list"
  | "table" | "chart" | "breakdown" | "heatmap" | "week"
  | "text" | "links" | "embed";

export type SourceKind = "local" | "api";

export interface LocalSource {
  kind: "local";
  collection: "tasks" | "metrics";
  sort: "date-asc" | "date-desc" | "percent-asc" | "percent-desc" | "name" | "priority";
  filter: "all" | "today" | "this-week" | "overdue" | "in-progress" | "done";
}

export interface ApiSource {
  kind: "api";
  connectorId: string;      // resolves against Settings.connectors, gives the service
  capability: string;       // matches a Capability.id the connector's service adapter declares
  params?: Record<string, string>;   // e.g. { username: "rushil" } for GitHub's commit-heatmap
}

export interface Block {
  id: string;
  type: BlockType;
  title: string;
  width: "half" | "full";
  order: number;
  category?: string;      // free text, drives the sidebar filter chips, blank = only shows under "Overview"
  source?: LocalSource | ApiSource;   // absent for "text", "links", and "embed"
}

// ## Shapes returned per block type
//
// What a `local` resolver or an `api` sync response must produce, keyed by
// block ID for `api`, computed directly for `local`.

export type StatResult = { value: string; label: string };

export type StatGridResult = { items: { value: string; label: string; delta?: string }[] };

export type ListItem = { id?: string; title: string; subtitle?: string; date?: string; tag?: string };
export type ListResult = { items: ListItem[] };

export type ProgressItem = { id?: string; title: string; subtitle?: string; date?: string; percent: number };
export type ProgressListResult = { items: ProgressItem[] };
// percent 0 or 100 renders as a checkbox, not a bar, see DESIGN.md.
// The data doesn't change, only how a row at either extreme is drawn.

export type TableResult = { columns: string[]; rows: string[][] };

export type ChartResult = { points: { label: string; value: number }[] };

export type BreakdownResult = {
  total: { value: string; label: string };
  segments: { label: string; value: number; role?: "accent" | "success" | "warning" | "danger" }[];
};

export type HeatmapResult = {
  days: { date: string; value: number }[];   // ISO date, one entry per day, gaps are treated as 0
};

export type WeekResult = {
  days: {
    date: string;                             // ISO date
    entries: { title: string; time?: string; tag?: string }[];
  }[];                                          // always exactly 7, today through today+6
};

export type BlockResult =
  | StatResult | StatGridResult | ListResult | ProgressListResult
  | TableResult | ChartResult | BreakdownResult | HeatmapResult | WeekResult;

// ## Connector
//
// A connector represents a credential, not a credential-plus-one-query: it
// records that a service is in use, nothing more. No URL, no params, no
// secret — the one real credential per service (e.g. GITHUB_TOKEN) lives
// once in the backend's .env, never in a Connector instance. What to
// actually fetch (which username, which capability) lives on each block's
// ApiSource instead, so one connector can back many differently-configured
// blocks. Adding a new service is one more union member here plus one
// adapter in server/adapters/, not a shape change to this type.

export type Connector = {
  id: string;
  name: string;
  service: "github";
};

export type ConnectorService = Connector["service"];

export const SERVICE_LABELS: Record<ConnectorService, string> = {
  github: "GitHub",
};

// A named, adapter-declared operation: what it returns (resultShape, one
// of the eleven block types) and what params it needs. Mirrors each
// backend adapter's own capability list (server/adapters/) — the block
// editor's capability dropdown reads from this once a connector's service
// is known, filtered to capabilities whose resultShape matches the block
// being configured.
export type Capability = {
  id: string;
  label: string;
  resultShape: BlockType;
  params: { key: string; label: string; type: "text" | "number" }[];
};

export const CAPABILITIES: Record<ConnectorService, Capability[]> = {
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
    {
      id: "recent-repos",
      label: "Recent repos",
      resultShape: "list",
      params: [{ key: "username", label: "GitHub username", type: "text" }],
    },
  ],
};

// ## Task (local collection)

export interface Task {
  id: string;
  title: string;
  note: string;
  date: string;        // ISO date, YYYY-MM-DD
  percent: number;      // 0-100
  category: string;     // free text, e.g. "TRS", "Coursework", "Builds", "Personal"
  priority: number;     // global manual rank, lower = ranked higher; set by drag-to-rank
}

// ## Metric (local collection)

export interface Metric {
  id: string;
  name: string;
  value: string;        // string, not number, so "6 days" and "98%" both work
}

// ## Note (used by `text` blocks)
// One per block instance, keyed by block ID, not a shared global note.

export interface NoteBlockData {
  content: string;
}

// ## Link (used by `links` blocks)
// One link collection per block instance, keyed by block ID. If more than
// one links block ever exists on the board, they do not share data.

export interface Link {
  id: string;
  label: string;
  url: string;
  category: string;     // free text, suggested defaults: "Frequent", "Watch later"
  addedAt: string;       // ISO timestamp
}

export interface LinksBlockData {
  links: Link[];
}

// ## Embed (used by `embed` blocks)
// A curated allowlist, not a general iframe escape hatch — provider
// detection and embed-URL construction live in src/lib/embedProviders.ts.
// One embed per block instance, keyed by block ID, like Note and Links.

export type EmbedProvider = "youtube" | "google-sheets" | "figma" | "loom";

export interface EmbedBlockData {
  url: string;             // the original URL the person pasted
  provider: EmbedProvider;
}

// ## Settings

export interface ThemePreset {
  name: string;                 // "Forest", "Slate", "Plum", "Charcoal"
  light: PaletteTokens;
  dark: PaletteTokens;
}

export interface PaletteTokens {
  bg: string; surface: string; surfaceRaised: string;
  border: string; borderStrong: string;
  text: string; textSecondary: string; textMuted: string;
  accent: string; accentStrong: string; accentTint: string;
}

export interface Settings {
  displayName: string;          // used in the header greeting, e.g. "Rushil"
  themeName: string;            // matches a ThemePreset.name
  themeMode: "light" | "dark";
  customAccent?: string;        // hex, overrides just the accent token of the active preset/mode
  connectors: Connector[];
}

// ## Sync cache (per api-sourced block)

export interface SyncCacheEntry {
  blockId: string;
  syncedAt: string;      // ISO timestamp
  result: BlockResult;
  stale: boolean;         // true if last sync attempt failed to return this block
}

// ## Sync request/response (frontend to backend proxy)
//
// Each request carries the connector's service directly — the backend has
// no database of its own to resolve connectorId -> service, and the
// frontend already has Settings.connectors in memory, so it resolves this
// once and sends it along. No dedupe, no batching beyond "one HTTP call
// covers every block": every request is an independent, cheap, direct
// call to that service's own API (no LLM in the loop), so the backend
// just fans them out in parallel.

export interface SyncRequest {
  requests: {
    blockId: string;
    connectorId: string;
    service: ConnectorService;
    capability: string;
    params?: Record<string, string>;
  }[];
}

export interface SyncResponse {
  results: Record<string, BlockResult>;
  failed: string[];      // block IDs that didn't come back, render stale instead of blank
}
