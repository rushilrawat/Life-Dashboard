import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { useState } from "react";
import { useDragReorder } from "../../lib/useDragReorder";
import type { ProgressItem, ProgressListResult } from "../../types";
import { EmptyState } from "../BlockCard";
import AddTaskRow from "./AddTaskRow";
import Row from "./Row";

const ROW_CAP = 5;

const today = () => new Date().toISOString().slice(0, 10);

// percent 0/100 renders as a checkbox (empty/checked), anything between as a
// slim bar — same data, three visual states at the extremes (DESIGN.md). The
// checkbox states are a real <button> (not a div) whenever a toggle handler
// is available, so tapping it flips the task done/not-done — native element,
// no manual key handling needed for Enter/Space.
function Leading({ percent, onToggle }: { percent: number; onToggle?: () => void }) {
  if (percent === 0 || percent === 100) {
    const icon =
      percent === 100 ? (
        <svg width="16" height="16" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="7" fill="var(--accent)" />
          <path d="M4.5 8.2 L7 10.7 L11.5 5.5" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="7" fill="none" stroke="var(--border-strong)" strokeWidth="1.5" />
        </svg>
      );
    if (!onToggle) return icon;
    return (
      <button
        type="button"
        className="row-check-btn"
        aria-label={percent === 100 ? "Mark as not done" : "Mark as done"}
        aria-pressed={percent === 100}
        onClick={onToggle}
      >
        {icon}
      </button>
    );
  }
  return (
    <div className="progress-bar-track">
      <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
    </div>
  );
}

function ProgressRow({
  item,
  onToggleDone,
  onRenameTask,
}: {
  item: ProgressItem;
  onToggleDone?: (id: string) => void;
  onRenameTask?: (id: string, title: string) => void;
}) {
  // Same "overdue" definition as resolveLocal.ts's taskStatus, just scoped to
  // what a ProgressItem already carries (percent + date) rather than a full
  // Task — progress-list is the one row view with a percent to tell a
  // legitimately-overdue task apart from a completed one with a past date.
  // ListBlock rows have no percent field and don't get this treatment.
  const overdue = item.percent < 100 && !!item.date && item.date < today();
  return (
    <Row
      leading={<Leading percent={item.percent} onToggle={item.id && onToggleDone ? () => onToggleDone(item.id!) : undefined} />}
      title={item.title}
      subtitle={item.subtitle}
      date={item.date}
      done={item.percent === 100}
      overdue={overdue}
      onRename={item.id && onRenameTask ? (t) => onRenameTask(item.id!, t) : undefined}
    />
  );
}

interface Props {
  result: ProgressListResult;
  // All four present only for local, tasks-sourced blocks (Board.tsx) —
  // undefined elsewhere renders exactly as before: no drag handle/rank
  // buttons, checkbox states render as plain (untappable) icons, no
  // click-to-rename, no add-task row.
  onReorder?: (newOrderedIds: string[]) => void;
  onToggleDone?: (id: string) => void;
  onRenameTask?: (id: string, title: string) => void;
  onAddTask?: (task: { title: string; category: string; date: string }) => void;
}

export default function ProgressListBlock({ result, onReorder, onToggleDone, onRenameTask, onAddTask }: Props) {
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? result.items : result.items.slice(0, ROW_CAP);
  const draggable = !!onReorder && visible.every((item) => item.id);
  const ids = draggable ? visible.map((item) => item.id!) : [];
  const byId = new Map(visible.map((item) => [item.id, item]));
  const { order, draggingId, dragProps } = useDragReorder(ids, onReorder ?? (() => {}));

  if (result.items.length === 0 && !onAddTask) return <EmptyState />;

  const orderedVisible = draggable ? order.map((id) => byId.get(id)!) : visible;

  function moveBy(id: string, delta: number) {
    const from = ids.indexOf(id);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= ids.length) return;
    const next = [...ids];
    [next[from], next[to]] = [next[to], next[from]];
    onReorder?.(next);
  }

  return (
    <div>
      {result.items.length === 0 && <EmptyState />}
      {orderedVisible.map((item, i) =>
        draggable ? (
          <div
            key={item.id}
            className={`row-draggable${draggingId === item.id ? " dragging" : ""}`}
            {...dragProps(item.id!)}
          >
            <GripVertical size={13} className="row-drag-handle" />
            <ProgressRow item={item} onToggleDone={onToggleDone} onRenameTask={onRenameTask} />
            <div className="row-rank-btns">
              <button
                type="button"
                className="row-rank-btn"
                aria-label="Rank up"
                disabled={i === 0}
                onClick={() => moveBy(item.id!, -1)}
              >
                <ChevronUp size={13} />
              </button>
              <button
                type="button"
                className="row-rank-btn"
                aria-label="Rank down"
                disabled={i === orderedVisible.length - 1}
                onClick={() => moveBy(item.id!, 1)}
              >
                <ChevronDown size={13} />
              </button>
            </div>
          </div>
        ) : (
          <ProgressRow key={item.id ?? i} item={item} onToggleDone={onToggleDone} onRenameTask={onRenameTask} />
        ),
      )}
      {result.items.length > ROW_CAP && (
        <button type="button" className="show-more-toggle" onClick={() => setExpanded((e) => !e)}>
          {expanded ? "Show less" : `Show ${result.items.length - ROW_CAP} more`}
        </button>
      )}
      {onAddTask && <AddTaskRow onAdd={onAddTask} />}
    </div>
  );
}
