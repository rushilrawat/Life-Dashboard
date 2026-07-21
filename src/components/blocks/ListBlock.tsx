import { ChevronDown, ChevronUp, Circle, GripVertical } from "lucide-react";
import { useState } from "react";
import { useDragReorder } from "../../lib/useDragReorder";
import type { ListResult } from "../../types";
import { EmptyState } from "../BlockCard";
import Row from "./Row";

const ROW_CAP = 5;

interface Props {
  result: ListResult;
  // Present only for local, tasks-sourced blocks (Board.tsx) — undefined
  // elsewhere renders exactly as before, no drag handle, no rank buttons.
  onReorder?: (newOrderedIds: string[]) => void;
}

export default function ListBlock({ result, onReorder }: Props) {
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
            <Row
              leading={<Circle size={8} fill="var(--text-muted)" stroke="none" />}
              title={item.title}
              subtitle={item.subtitle}
              date={item.date}
              tag={item.tag}
            />
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
          <Row
            key={item.id ?? i}
            leading={<Circle size={8} fill="var(--text-muted)" stroke="none" />}
            title={item.title}
            subtitle={item.subtitle}
            date={item.date}
            tag={item.tag}
          />
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
