// Mirrors docs/DATA_MODEL.md exactly. If this file and the doc drift, the
// doc wins — fix this file.

// ## Block

export type BlockType =
  | "stat" | "stat-grid" | "list" | "progress-list"
  | "table" | "chart" | "breakdown" | "heatmap" | "week"
  | "text" | "links";

export type SourceKind = "local" | "mcp";

export interface LocalSource {
  kind: "local";
  collection: "tasks" | "metrics";
  sort: "date-asc" | "date-desc" | "percent-asc" | "percent-desc" | "name";
  filter: "all" | "today" | "this-week" | "overdue" | "in-progress" | "done";
}

export interface McpSource {
  kind: "mcp";
  connectorIds: string[];
  query: string;          // plain-language ask, e.g. "my 5 most recent commits"
}

export interface Block {
  id: string;
  type: BlockType;
  title: string;
  width: "half" | "full";
  order: number;
  category?: string;      // free text, drives the sidebar filter chips, blank = only shows under "Overview"
  source?: LocalSource | McpSource;   // absent for "text" and "links"
}

// ## Shapes returned per block type
//
// What a `local` resolver or an `mcp` sync response must produce, keyed by
// block ID for `mcp`, computed directly for `local`.

export type StatResult = { value: string; label: string };

export type StatGridResult = { items: { value: string; label: string; delta?: string }[] };

export type ListItem = { title: string; subtitle?: string; date?: string; tag?: string };
export type ListResult = { items: ListItem[] };

export type ProgressItem = { title: string; subtitle?: string; date?: string; percent: number };
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

// ## Connector

export interface Connector {
  id: string;
  name: string;
  url: string;
}

// ## Task (local collection)

export interface Task {
  id: string;
  title: string;
  note: string;
  date: string;        // ISO date, YYYY-MM-DD
  percent: number;      // 0-100
  category: string;     // free text, e.g. "TRS", "Coursework", "Builds", "Personal"
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

// ## Sync cache (per mcp-sourced block)

export interface SyncCacheEntry {
  blockId: string;
  syncedAt: string;      // ISO timestamp
  result: StatResult | StatGridResult | ListResult | ProgressListResult | TableResult | ChartResult | BreakdownResult | HeatmapResult | WeekResult;
  stale: boolean;         // true if last sync attempt failed to return this block
}

// ## Sync request/response (frontend to backend proxy)

export interface SyncRequest {
  connectors: Connector[];          // deduped, only ones referenced by mcp blocks
  requests: { blockId: string; query: string; shape: BlockType }[];
}

export interface SyncResponse {
  results: Record<string, StatResult | StatGridResult | ListResult | ProgressListResult | TableResult | ChartResult | BreakdownResult | HeatmapResult | WeekResult>;
  failed: string[];      // block IDs that didn't come back, render stale instead of blank
}
