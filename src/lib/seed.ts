import * as storage from "./storage";
import type { Block, LinksBlockData, Metric, NoteBlockData, Task } from "../types";

// First-run sample data so the board isn't empty (ROADMAP.md Phase 2).
// Each key seeds independently and only if empty, so a returning user's real
// data is never overwritten.

function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const tasks: Task[] = [
  { id: "t1", title: "Ship Phase 2 blocks", note: "", date: addDays(-2), percent: 100, category: "Builds", priority: 0 },
  { id: "t2", title: "Write project retro", note: "", date: addDays(-5), percent: 40, category: "Personal", priority: 1 },
  { id: "t3", title: "Review PR feedback", note: "", date: addDays(0), percent: 60, category: "Builds", priority: 2 },
  { id: "t4", title: "Plan Phase 3", note: "", date: addDays(1), percent: 0, category: "Builds", priority: 3 },
  { id: "t5", title: "Coursework reading", note: "", date: addDays(3), percent: 0, category: "Coursework", priority: 4 },
  { id: "t6", title: "Grocery run", note: "", date: addDays(0), percent: 0, category: "Personal", priority: 5 },
  { id: "t7", title: "Renew passport", note: "", date: addDays(-10), percent: 0, category: "Personal", priority: 6 },
];

const metrics: Metric[] = [
  { id: "m1", name: "Current Streak", value: "6 days" },
  // "Done This Week" and "Habit Score" are live-computed from tasks on every
  // read (resolveLocal.ts's computeLiveMetricValue) — these stored values
  // are placeholders, never actually rendered.
  { id: "m2", name: "Done This Week", value: "0/0" },
  { id: "m3", name: "Habit Score", value: "0%" },
];

const blocks: Block[] = [
  { id: "b-stat", type: "stat", title: "Due Today", widthCols: 2, order: 0,
    source: { kind: "local", collection: "tasks", sort: "date-asc", filter: "today" } },
  { id: "b-stat-grid", type: "stat-grid", title: "Metrics", widthCols: 2, order: 1,
    source: { kind: "local", collection: "metrics", sort: "name", filter: "all" } },
  { id: "b-list", type: "list", title: "Recent Tasks", widthCols: 2, order: 2,
    source: { kind: "local", collection: "tasks", sort: "date-desc", filter: "all" } },
  { id: "b-progress", type: "progress-list", title: "Task Progress", widthCols: 4, order: 3,
    category: "Tasks",
    source: { kind: "local", collection: "tasks", sort: "date-asc", filter: "all" } },
  { id: "b-table", type: "table", title: "All Tasks", widthCols: 4, order: 4,
    source: { kind: "local", collection: "tasks", sort: "name", filter: "all" } },
  { id: "b-chart", type: "chart", title: "Tasks by Category", widthCols: 2, order: 5,
    source: { kind: "local", collection: "tasks", sort: "name", filter: "all" } },
  { id: "b-breakdown", type: "breakdown", title: "Task Breakdown", widthCols: 2, order: 6,
    source: { kind: "local", collection: "tasks", sort: "date-asc", filter: "all" } },
  { id: "b-heatmap", type: "heatmap", title: "Activity", widthCols: 4, order: 7,
    source: { kind: "api", connectorId: "", capability: "commit-heatmap" } },
  { id: "b-week", type: "week", title: "This Week", widthCols: 4, order: 8,
    category: "Tasks",
    source: { kind: "local", collection: "tasks", sort: "date-asc", filter: "this-week" } },
  { id: "b-text", type: "text", title: "Notes", widthCols: 2, order: 9, category: "Personal" },
  { id: "b-links", type: "links", title: "Links", widthCols: 4, order: 10, category: "Personal" },
];

const noteData: NoteBlockData = {
  content:
    "Focus this week: finish the block system phases, keep sync scope small. " +
    "Ping design mock reference before touching the ring component again.",
};

const linksData: LinksBlockData = {
  links: [
    { id: "l1", label: "GitHub", url: "https://github.com", category: "Frequent", addedAt: "2026-07-18T09:00:00Z" },
    { id: "l2", label: "Anthropic Console", url: "https://console.anthropic.com", category: "Frequent", addedAt: "2026-07-17T09:00:00Z" },
    { id: "l3", label: "Vite Docs", url: "https://vite.dev", category: "Watch later", addedAt: "2026-07-16T09:00:00Z" },
    { id: "l4", label: "A Philosophy of Software Design", url: "https://web.stanford.edu/~ouster/cgi-bin/book.php", category: "Reading", addedAt: "2026-07-15T09:00:00Z" },
  ],
};

export function seedIfEmpty(): void {
  if (storage.get("tasks") === null) storage.set("tasks", tasks);
  if (storage.get("metrics") === null) storage.set("metrics", metrics);
  if (storage.get("blocks") === null) storage.set("blocks", blocks);
  if (storage.get("blockdata:b-text") === null) storage.set("blockdata:b-text", noteData);
  if (storage.get("blockdata:b-links") === null) storage.set("blockdata:b-links", linksData);
}

// One-time rename for a board seeded before "Weekly Focus" became "Done
// This Week" (a real, tasks-derived metric, see resolveLocal.ts) — no-op
// for a board that never had the old name.
export function migrateMetricNames(): void {
  const existing = storage.get("metrics");
  if (!existing) return;
  const renamed = existing.map((m) => (m.name === "Weekly Focus" ? { ...m, name: "Done This Week" } : m));
  if (renamed.some((m, i) => m.name !== existing[i].name)) storage.set("metrics", renamed);
}
