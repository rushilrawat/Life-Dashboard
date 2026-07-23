import * as storage from "./storage";
import type { Task } from "../types";

// Dragging only ever reorders the *visible* subset of tasks in one block
// (filtered, possibly capped to 5). To keep that coherent with the single
// global Task.priority ranking shared by every block, walk the full
// priority-ordered list and substitute the visible tasks' new drag order in
// place — everything not visible keeps its exact relative position.
export function computeReorderedPriorities(
  allByPriority: Task[],
  visibleOrderedIds: string[],
): Map<string, number> {
  const visible = new Set(visibleOrderedIds);
  const queue = [...visibleOrderedIds];
  const newOrder = allByPriority.map((t) => (visible.has(t.id) ? queue.shift()! : t.id));
  return new Map(newOrder.map((id, i) => [id, i]));
}

// Reads tasks from storage, applies a new drag order for the given visible
// subset, and writes the full task list back with updated priorities.
// A no-op (no write) if the drop didn't actually change anything.
export function applyDragOrder(visibleOrderedIds: string[]): void {
  const tasks = storage.get("tasks") ?? [];
  const allByPriority = [...tasks].sort(
    (a, b) => (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER),
  );
  const currentVisibleOrder = allByPriority.filter((t) => visibleOrderedIds.includes(t.id)).map((t) => t.id);
  if (currentVisibleOrder.join(",") === visibleOrderedIds.join(",")) return;

  const newPriorities = computeReorderedPriorities(allByPriority, visibleOrderedIds);
  storage.set(
    "tasks",
    tasks.map((t) => ({ ...t, priority: newPriorities.get(t.id) ?? t.priority })),
  );
}

// Tapping a progress-list row's checkbox (0%/100% only, see DESIGN.md) toggles
// it between not-started and done — the same read-modify-write-the-whole-
// collection shape as applyDragOrder above, just flipping percent instead of
// priority.
export function toggleTaskDone(taskId: string): void {
  const tasks = storage.get("tasks") ?? [];
  storage.set(
    "tasks",
    tasks.map((t) => (t.id === taskId ? { ...t, percent: t.percent === 100 ? 0 : 100 } : t)),
  );
}

// Click-to-rename a task row's title (Row.tsx), same pattern as
// GroupSection's click-to-rename-title.
export function renameTask(taskId: string, title: string): void {
  const tasks = storage.get("tasks") ?? [];
  storage.set(
    "tasks",
    tasks.map((t) => (t.id === taskId ? { ...t, title } : t)),
  );
}

// A new task joins at the back of the manual priority ranking (lowest rank)
// rather than jumping ahead of whatever's already been hand-ranked via
// drag-to-rank. note/priority aren't collected by the add form — note has
// no reader anywhere yet, and priority appending here is the same rule
// swapOrder/reorderTopLevel already use for "goes at the end."
export function addTask(task: { title: string; category: string; date: string }): void {
  const tasks = storage.get("tasks") ?? [];
  const nextPriority = Math.max(0, ...tasks.map((t) => t.priority ?? 0)) + 1;
  storage.set("tasks", [
    ...tasks,
    {
      id: crypto.randomUUID(),
      title: task.title,
      note: "",
      date: task.date,
      percent: 0,
      category: task.category,
      priority: nextPriority,
    },
  ]);
}
