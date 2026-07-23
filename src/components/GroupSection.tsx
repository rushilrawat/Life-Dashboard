import { ChevronDown, ChevronRight, GripVertical, MoreVertical, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { DragEvent, ReactNode } from "react";
import type { DragHandleProps } from "../lib/useDragReorder";
import type { Group } from "../types";

interface KebabProps {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: (alsoDeleteBlocks: boolean) => void;
}

function GroupKebab({ canMoveUp, canMoveDown, onMoveUp, onMoveDown, onDelete }: KebabProps) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function run(action: () => void) {
    action();
    setOpen(false);
    setConfirming(false);
  }

  return (
    <div className="kebab-menu" ref={ref}>
      <button className="icon-btn" type="button" aria-label="Group actions" onClick={() => setOpen((o) => !o)}>
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="kebab-dropdown">
          {confirming ? (
            <>
              <p className="editor-hint group-delete-hint">Delete the blocks inside too?</p>
              <button type="button" onClick={() => run(() => onDelete(false))}>
                Keep blocks, ungroup
              </button>
              <button type="button" className="danger" onClick={() => run(() => onDelete(true))}>
                <Trash2 size={13} /> Delete group and blocks
              </button>
            </>
          ) : (
            <>
              <button type="button" disabled={!canMoveUp} onClick={() => run(onMoveUp)}>
                Move up
              </button>
              <button type="button" disabled={!canMoveDown} onClick={() => run(onMoveDown)}>
                Move down
              </button>
              <button type="button" className="danger" onClick={() => setConfirming(true)}>
                <Trash2 size={13} /> Delete group…
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface Props extends KebabProps {
  group: Group;
  memberCount: number;
  maxCols: number;
  onToggleCollapsed: () => void;
  onRename: (title: string) => void;
  dragHandleProps: DragHandleProps;
  isDragging: boolean;
  // True while a plain ungrouped block is being dragged and could join this
  // group by being dropped on it — see Board.tsx for how this is computed.
  // When false, a drop here falls through to the normal top-level reorder
  // behavior carried by `dragHandleProps` instead (dragging this group, or
  // another top-level block/group, past this one to reorder it).
  canAcceptBlockDrop: boolean;
  onAcceptBlockDrop: () => void;
  children: ReactNode;
}

// A collapsible section holding several blocks, moved and collapsed as one
// unit (ARCHITECTURE.md's Groups section) — always full board width, never
// itself resized. `grid-column: span maxCols` is computed the same way
// BlockCard.tsx computes a resizable card's span, just always maxed out
// rather than reading from a stored value. Title is click-to-rename
// directly (no kebab round-trip needed for a single text field); the kebab
// holds move/delete instead.
export default function GroupSection({
  group,
  memberCount,
  maxCols,
  onToggleCollapsed,
  onRename,
  dragHandleProps,
  isDragging,
  canAcceptBlockDrop,
  onAcceptBlockDrop,
  children,
  ...kebab
}: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(group.title);
  const { draggable, onDragStart, onDragEnd, onDragOver, onDrop } = dragHandleProps;

  function commitTitle() {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== group.title) onRename(trimmed);
    else setTitleDraft(group.title);
  }

  // Two different drags can land here: a plain ungrouped block (join this
  // group) or a top-level reorder drag (this group's own position among
  // siblings) — `canAcceptBlockDrop` picks between them per drop, see the
  // prop's own comment above for why they can't just be two separate
  // handlers on the same element.
  function handleDragOver(e: DragEvent) {
    if (canAcceptBlockDrop) {
      e.preventDefault();
      return;
    }
    onDragOver(e);
  }
  function handleDrop(e: DragEvent) {
    if (canAcceptBlockDrop) {
      e.preventDefault();
      onAcceptBlockDrop();
      e.stopPropagation();
      return;
    }
    onDrop(e);
  }

  return (
    <div
      className={`card group-section${isDragging ? " dragging" : ""}`}
      style={{ gridColumn: `span ${maxCols}` }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="group-header">
        <span className="card-drag-handle" draggable={draggable} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <GripVertical size={14} />
        </span>
        <button
          className="icon-btn group-collapse-toggle"
          type="button"
          aria-label={group.collapsed ? "Expand group" : "Collapse group"}
          onClick={onToggleCollapsed}
        >
          {group.collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>
        {editingTitle ? (
          <input
            className="text-input group-title-input"
            value={titleDraft}
            autoFocus
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => e.key === "Enter" && commitTitle()}
          />
        ) : (
          <h2 className="card-title group-title" onClick={() => setEditingTitle(true)} title="Click to rename">
            {group.title}
          </h2>
        )}
        <span className="group-count">
          {memberCount} block{memberCount === 1 ? "" : "s"}
        </span>
        <GroupKebab {...kebab} />
      </div>
      {!group.collapsed && <div className="group-body board">{children}</div>}
    </div>
  );
}
