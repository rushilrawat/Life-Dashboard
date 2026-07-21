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
  { id: "t1", title: "Ship Phase 2 blocks", note: "", date: addDays(-2), percent: 100, category: "Builds" },
  { id: "t2", title: "Write project retro", note: "", date: addDays(-5), percent: 40, category: "Personal" },
  { id: "t3", title: "Review PR feedback", note: "", date: addDays(0), percent: 60, category: "Builds" },
  { id: "t4", title: "Plan Phase 3", note: "", date: addDays(1), percent: 0, category: "Builds" },
  { id: "t5", title: "Coursework reading", note: "", date: addDays(3), percent: 0, category: "Coursework" },
  { id: "t6", title: "Grocery run", note: "", date: addDays(0), percent: 0, category: "Personal" },
  { id: "t7", title: "Renew passport", note: "", date: addDays(-10), percent: 0, category: "Personal" },
];

const metrics: Metric[] = [
  { id: "m1", name: "Current Streak", value: "6 days" },
  { id: "m2", name: "Weekly Focus", value: "18h" },
  { id: "m3", name: "Habit Score", value: "82%" },
];

const blocks: Block[] = [
  { id: "b-stat", type: "stat", title: "Due Today", width: "half", order: 0,
    source: { kind: "local", collection: "tasks", sort: "date-asc", filter: "today" } },
  { id: "b-stat-grid", type: "stat-grid", title: "Metrics", width: "half", order: 1,
    source: { kind: "local", collection: "metrics", sort: "name", filter: "all" } },
  { id: "b-list", type: "list", title: "Recent Tasks", width: "half", order: 2,
    source: { kind: "local", collection: "tasks", sort: "date-desc", filter: "all" } },
  { id: "b-progress", type: "progress-list", title: "Task Progress", width: "full", order: 3,
    category: "Tasks",
    source: { kind: "local", collection: "tasks", sort: "date-asc", filter: "all" } },
  { id: "b-table", type: "table", title: "All Tasks", width: "full", order: 4,
    source: { kind: "local", collection: "tasks", sort: "name", filter: "all" } },
  { id: "b-chart", type: "chart", title: "Tasks by Category", width: "half", order: 5,
    source: { kind: "local", collection: "tasks", sort: "name", filter: "all" } },
  { id: "b-breakdown", type: "breakdown", title: "Task Breakdown", width: "half", order: 6,
    source: { kind: "local", collection: "tasks", sort: "date-asc", filter: "all" } },
  { id: "b-heatmap", type: "heatmap", title: "Activity", width: "full", order: 7,
    source: { kind: "api", connectorId: "", capability: "commit-heatmap" } },
  { id: "b-week", type: "week", title: "This Week", width: "full", order: 8,
    category: "Tasks",
    source: { kind: "local", collection: "tasks", sort: "date-asc", filter: "this-week" } },
  { id: "b-text", type: "text", title: "Notes", width: "half", order: 9, category: "Personal" },
  { id: "b-links", type: "links", title: "Links", width: "full", order: 10, category: "Personal" },
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
