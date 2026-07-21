import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { useState } from "react";
import { useDragReorder } from "../../lib/useDragReorder";
import type { ProgressItem, ProgressListResult } from "../../types";
import { EmptyState } from "../BlockCard";
import Row from "./Row";

const ROW_CAP = 5;

// percent 0/100 renders as a checkbox (empty/checked), anything between as a
// slim bar — same data, three visual states at the extremes (DESIGN.md).
function Leading({ percent }: { percent: number }) {
  if (percent === 0) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" fill="none" stroke="var(--border-strong)" strokeWidth="1.5" />
      </svg>
    );
  }
  if (percent === 100) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" fill="var(--accent)" />
        <path d="M4.5 8.2 L7 10.7 L11.5 5.5" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <div className="progress-bar-track">
      <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
    </div>
  );
}

function ProgressRow({ item }: { item: ProgressItem }) {
  return (
    <Row
      leading={<Leading percent={item.percent} />}
      title={item.title}
      subtitle={item.subtitle}
      date={item.date}
      done={item.percent === 100}
    />
  );
}

interface Props {
  result: ProgressListResult;
  // Present only for local, tasks-sourced blocks (Board.tsx) — undefined
  // elsewhere renders exactly as before, no drag handle, no rank buttons.
  onReorder?: (newOrderedIds: string[]) => void;
}

export default function ProgressListBlock({ result, onReorder }: Props) {
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? result.items : result.items.slice(0, ROW_CAP);
  const draggable = !!onReorder && visible.every((item) => item.id);
  const ids = draggable ? visible.map((item) => item.id!) : [];
  const byId = new Map(visible.map((item) => [item.id, item]));
  const { order, draggingId, dragProps } = useDragReorder(ids, onReorder ?? (() => {}));

  if (result.items.length === 0) return <EmptyState />;

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
      {orderedVisible.map((item, i) =>
        draggable ? (
          <div
            key={item.id}
            className={`row-draggable${draggingId === item.id ? " dragging" : ""}`}
            {...dragProps(item.id!)}
          >
            <GripVertical size={13} className="row-drag-handle" />
            <ProgressRow item={item} />
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
          <ProgressRow key={item.id ?? i} item={item} />
        ),
      )}
      {result.items.length > ROW_CAP && (
        <button type="button" className="show-more-toggle" onClick={() => setExpanded((e) => !e)}>
          {expanded ? "Show less" : `Show ${result.items.length - ROW_CAP} more`}
        </button>
      )}
    </div>
  );
}
