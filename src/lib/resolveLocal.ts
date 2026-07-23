import * as storage from "./storage";
import type {
  Block,
  LocalSource,
  Metric,
  Task,
  StatResult,
  StatGridResult,
  ListResult,
  ProgressListResult,
  TableResult,
  ChartResult,
  BreakdownResult,
  WeekResult,
} from "../types";

// The one local-source resolver (ARCHITECTURE.md): every local block goes
// through this, no per-block bespoke storage reads. Given a block's own
// type, it shapes tasks/metrics into that type's result, per DATA_MODEL.md.
// heatmap is deliberately absent — no local day-by-day collection exists in
// storage, so it degrades to the card's empty state, same as any other
// unhandled (source, type) pairing.

export type LocalResult =
  | StatResult
  | StatGridResult
  | ListResult
  | ProgressListResult
  | TableResult
  | ChartResult
  | BreakdownResult
  | WeekResult;

const today = () => new Date().toISOString().slice(0, 10);

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// A task's status, used only for breakdown segments — the one place
// success/warning/danger legitimately appear together (DESIGN.md).
function taskStatus(t: Task): "done" | "overdue" | "in-progress" | "not-started" {
  if (t.percent === 100) return "done";
  const d = today();
  if (t.date < d) return "overdue";
  if (t.percent > 0) return "in-progress";
  return "not-started";
}

function filterTasks(tasks: Task[], filter: LocalSource["filter"]): Task[] {
  const d = today();
  switch (filter) {
    case "today":
      return tasks.filter((t) => t.date === d);
    case "this-week":
      return tasks.filter((t) => t.date >= d && t.date <= addDays(d, 6));
    case "overdue":
      return tasks.filter((t) => t.date < d && t.percent < 100);
    case "in-progress":
      return tasks.filter((t) => t.percent > 0 && t.percent < 100);
    case "done":
      return tasks.filter((t) => t.percent === 100);
    case "all":
      return tasks;
  }
}

function sortTasks(tasks: Task[], sort: LocalSource["sort"]): Task[] {
  const copy = [...tasks];
  switch (sort) {
    case "date-asc":
      return copy.sort((a, b) => a.date.localeCompare(b.date));
    case "date-desc":
      return copy.sort((a, b) => b.date.localeCompare(a.date));
    case "percent-asc":
      return copy.sort((a, b) => a.percent - b.percent);
    case "percent-desc":
      return copy.sort((a, b) => b.percent - a.percent);
    case "name":
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case "priority":
      // ?? fallback matters: "Priority" is pickable from the sort dropdown
      // before anyone has dragged anything, so a task with no priority yet
      // needs to sort to the end rather than produce NaN comparisons.
      return copy.sort(
        (a, b) => (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER),
      );
  }
}

// ponytail: metrics have no date/percent field, so only a "name" sort
// applies to them; a date/percent sort request against metrics is a no-op.
function sortMetrics(metrics: Metric[], sort: LocalSource["sort"]): Metric[] {
  return sort === "name"
    ? [...metrics].sort((a, b) => a.name.localeCompare(b.name))
    : metrics;
}

const FILTER_LABEL: Record<LocalSource["filter"], string> = {
  all: "Tasks",
  today: "Due Today",
  "this-week": "Due This Week",
  overdue: "Overdue",
  "in-progress": "In Progress",
  done: "Done",
};

function groupByCategory(tasks: Task[]): Record<string, Task[]> {
  const groups: Record<string, Task[]> = {};
  for (const t of tasks) {
    const key = t.category || "Uncategorized";
    (groups[key] ??= []).push(t);
  }
  return groups;
}

// ponytail: Metric.value is free text ("6 days", "98%") by design (DATA_MODEL.md),
// so charting it is inherently best-effort — pull the first number out, default 0.
function parseFirstNumber(s: string): number {
  const m = s.match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

// "Habit Score" and "Done This Week" were static seed strings until a user
// request to make them real. There's no formula field on Metric (and no UI
// to add one), so these two are special-cased by name — the stored
// Metric.value becomes a dead placeholder for exactly these two, live-
// computed from tasks on every read instead. ponytail: name-matching is
// fine for two known metrics; a real per-metric formula system would be
// overkill for a board only these two ever needed it on.
function computeLiveMetricValue(name: string, tasks: Task[]): string | null {
  if (name === "Habit Score") {
    if (tasks.length === 0) return "—";
    const done = tasks.filter((t) => t.percent === 100).length;
    return `${Math.round((done / tasks.length) * 100)}%`;
  }
  if (name === "Done This Week") {
    // Task has a due date, not a completed-at timestamp, so "done this
    // week" means of what's due in the current 7-day window (the same
    // window filterTasks's "this-week" already uses), how much is done —
    // not literally "finished in the last 7 days," which isn't knowable
    // from this schema.
    const dueThisWeek = filterTasks(tasks, "this-week");
    const done = dueThisWeek.filter((t) => t.percent === 100).length;
    return `${done}/${dueThisWeek.length}`;
  }
  return null;
}

function withLiveMetricValues(metrics: Metric[], tasks: Task[]): Metric[] {
  return metrics.map((m) => {
    const live = computeLiveMetricValue(m.name, tasks);
    return live === null ? m : { ...m, value: live };
  });
}

function buildWeek(tasks: Task[]): WeekResult {
  const start = today();
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    const dayTasks = tasks.filter((t) => t.date === date);
    return { date, entries: dayTasks.map((t) => ({ title: t.title, tag: t.category })) };
  });
  return { days };
}

function shapeFromTasks(
  type: Block["type"],
  tasks: Task[],
  filter: LocalSource["filter"],
): LocalResult | null {
  switch (type) {
    case "stat":
      return { value: String(tasks.length), label: FILTER_LABEL[filter] };
    case "stat-grid": {
      const groups = groupByCategory(tasks);
      return { items: Object.entries(groups).map(([label, ts]) => ({ value: String(ts.length), label })) };
    }
    case "list":
      return { items: tasks.map((t) => ({ id: t.id, title: t.title, subtitle: t.category, date: t.date })) };
    case "progress-list":
      return {
        items: tasks.map((t) => ({ id: t.id, title: t.title, subtitle: t.category, date: t.date, percent: t.percent })),
      };
    case "table":
      return {
        columns: ["Title", "Category", "Date", "Percent"],
        rows: tasks.map((t) => [t.title, t.category, t.date, `${t.percent}%`]),
      };
    case "chart": {
      const groups = groupByCategory(tasks);
      return { points: Object.entries(groups).map(([label, ts]) => ({ label, value: ts.length })) };
    }
    case "breakdown": {
      const buckets: Record<string, { count: number; role?: "success" | "warning" | "danger" }> = {
        Done: { count: 0, role: "success" },
        Overdue: { count: 0, role: "danger" },
        "In progress": { count: 0, role: "warning" },
        "Not started": { count: 0 },
      };
      const label: Record<ReturnType<typeof taskStatus>, string> = {
        done: "Done",
        overdue: "Overdue",
        "in-progress": "In progress",
        "not-started": "Not started",
      };
      for (const t of tasks) buckets[label[taskStatus(t)]].count++;
      const done = buckets.Done.count;
      return {
        total: { value: `${done}/${tasks.length}`, label: "Tasks Done" },
        segments: Object.entries(buckets)
          .filter(([, b]) => b.count > 0)
          .map(([label, b]) => ({ label, value: b.count, role: b.role })),
      };
    }
    case "week":
      return buildWeek(tasks);
    default:
      return null;
  }
}

function shapeFromMetrics(type: Block["type"], metrics: Metric[]): LocalResult | null {
  switch (type) {
    case "stat": {
      const m = metrics[0];
      return m ? { value: m.value, label: m.name } : { value: "—", label: "No data" };
    }
    case "stat-grid":
      return { items: metrics.map((m) => ({ value: m.value, label: m.name })) };
    case "chart":
      return { points: metrics.map((m) => ({ label: m.name, value: parseFirstNumber(m.value) })) };
    case "list":
      return { items: metrics.map((m) => ({ title: m.name, subtitle: m.value })) };
    default:
      return null;
  }
}

export function resolveLocal(block: Block): LocalResult | null {
  if (!block.source || block.source.kind !== "local") return null;
  const { collection, sort, filter } = block.source;

  if (collection === "tasks") {
    const tasks = sortTasks(filterTasks(storage.get("tasks") ?? [], filter), sort);
    return shapeFromTasks(block.type, tasks, filter);
  }
  const metrics = withLiveMetricValues(sortMetrics(storage.get("metrics") ?? [], sort), storage.get("tasks") ?? []);
  return shapeFromMetrics(block.type, metrics);
}
