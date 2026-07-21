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
