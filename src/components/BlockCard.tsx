import { ArrowDown, ArrowUp, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import GroupPicker from "./GroupPicker";
import type { GroupControls } from "./GroupPicker";
import { FILTER_OPTIONS, SORT_OPTIONS } from "../lib/localSourceOptions";
import * as storage from "../lib/storage";
import type { Block, LocalSource } from "../types";

export function timeAgo(iso: string): string {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const MIN_HEIGHT_PX = 120;

interface Props {
  block: Block;
  children: ReactNode;
  maxCols: number;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onResize: (widthCols: Block["widthCols"], heightPx: number | undefined) => void;
  onDelete: () => void;
  onSourceChange: (source: LocalSource) => void;
  groupControls: GroupControls;
}

interface KebabProps {
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onDelete: () => void;
  widthCols: number;
  heightPx: number | undefined;
  onWiden: () => void;
  onNarrow: () => void;
  onTaller: () => void;
  onShorter: () => void;
  onResetHeight: () => void;
}

export function KebabMenu({
  onEdit,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onDelete,
  widthCols,
  heightPx,
  onWiden,
  onNarrow,
  onTaller,
  onShorter,
  onResetHeight,
}: KebabProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function run(action: () => void) {
    action();
    setOpen(false);
  }

  return (
    <div className="kebab-menu" ref={ref}>
      <button className="icon-btn" type="button" aria-label="Block actions" onClick={() => setOpen((o) => !o)}>
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="kebab-dropdown">
          <button type="button" onClick={() => run(onEdit)}>
            Edit block
          </button>
          <button type="button" disabled={!canMoveUp} onClick={() => run(onMoveUp)}>
            <ArrowUp size={13} /> Move up
          </button>
          <button type="button" disabled={!canMoveDown} onClick={() => run(onMoveDown)}>
            <ArrowDown size={13} /> Move down
          </button>
          <button type="button" disabled={widthCols <= 1} onClick={() => run(onNarrow)}>
            Narrower
          </button>
          <button type="button" disabled={widthCols >= 4} onClick={() => run(onWiden)}>
            Wider
          </button>
          <button type="button" onClick={() => run(onTaller)}>
            Taller
          </button>
          <button type="button" disabled={!heightPx || heightPx <= MIN_HEIGHT_PX} onClick={() => run(onShorter)}>
            Shorter
          </button>
          <button type="button" disabled={!heightPx} onClick={() => run(onResetHeight)}>
            Reset height
          </button>
          <button type="button" className="danger" onClick={() => run(onDelete)}>
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

// The card shell every block type renders inside: title, the per-card
// sort/filter dropdown (local-sourced blocks only, DESIGN.md), edit pencil,
// and the kebab menu with the rest of the block-level operations. Also
// hosts the two drag-resize handles (DESIGN.md's Resize handles section) —
// width snaps to the board's column grid, height is a free pixel drag with
// internal scroll past it, both mirrored by kebab buttons as the
// keyboard-reachable equivalent (no drag has a keyboard-only path otherwise).
export default function BlockCard({
  block,
  children,
  maxCols,
  onEdit,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onResize,
  onDelete,
  onSourceChange,
  groupControls,
}: Props) {
  const local = block.source?.kind === "local" ? block.source : null;
  const syncCache = block.source?.kind === "api" ? storage.get(`sync-cache:${block.id}`) : null;

  const cardRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  // Live drag feedback, committed via onResize on pointer-up. Null means
  // "not dragging" — render straight from the block's stored size.
  const [drag, setDrag] = useState<{ widthCols: number; heightPx: number | undefined } | null>(null);

  const widthCols = drag?.widthCols ?? block.widthCols;
  const heightPx = drag ? drag.heightPx : block.heightPx;
  const effectiveWidthCols = Math.min(widthCols, maxCols);

  function startWidthDrag(e: React.PointerEvent) {
    e.preventDefault();
    // Without capture, the drag silently stalls the moment the pointer
    // crosses an embed block's <iframe> — a separate browsing context that
    // otherwise swallows pointermove before it reaches this window listener.
    e.currentTarget.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startCols = block.widthCols;
    const colPx = (cardRef.current?.getBoundingClientRect().width ?? 200) / startCols;

    function onMove(ev: PointerEvent) {
      const deltaCols = Math.round((ev.clientX - startX) / colPx);
      const next = Math.min(4, Math.max(1, startCols + deltaCols)) as Block["widthCols"];
      setDrag((d) => ({ widthCols: next, heightPx: d?.heightPx ?? block.heightPx }));
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDrag((d) => {
        if (d) onResize(d.widthCols as Block["widthCols"], d.heightPx);
        return null;
      });
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function startHeightDrag(e: React.PointerEvent) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const startY = e.clientY;
    const startHeight = block.heightPx ?? bodyRef.current?.getBoundingClientRect().height ?? MIN_HEIGHT_PX;

    function onMove(ev: PointerEvent) {
      const next = Math.max(MIN_HEIGHT_PX, Math.round(startHeight + (ev.clientY - startY)));
      setDrag((d) => ({ widthCols: d?.widthCols ?? block.widthCols, heightPx: next }));
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDrag((d) => {
        if (d) onResize(d.widthCols as Block["widthCols"], d.heightPx);
        return null;
      });
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function taller() {
    const base = block.heightPx ?? bodyRef.current?.getBoundingClientRect().height ?? MIN_HEIGHT_PX;
    onResize(block.widthCols, Math.round(base) + 40);
  }
  function shorter() {
    if (!block.heightPx) return;
    onResize(block.widthCols, Math.max(MIN_HEIGHT_PX, block.heightPx - 40));
  }

  return (
    <div className="card" ref={cardRef} style={{ gridColumn: `span ${effectiveWidthCols}` }}>
      <div className="card-header">
        <h2 className="card-title">{block.title}</h2>
        <div className="card-header-right">
          {syncCache?.stale && (
            <span className="stale-indicator" title="Last sync attempt failed for this block">
              <span className="stale-dot" />
              last synced {timeAgo(syncCache.syncedAt)}
            </span>
          )}
          {local && (
            <>
              <select
                className="header-select"
                aria-label="Filter"
                value={local.filter}
                onChange={(e) => onSourceChange({ ...local, filter: e.target.value as LocalSource["filter"] })}
              >
                {FILTER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                className="header-select"
                aria-label="Sort"
                value={local.sort}
                onChange={(e) => onSourceChange({ ...local, sort: e.target.value as LocalSource["sort"] })}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </>
          )}
          <GroupPicker {...groupControls} />
          <button className="icon-btn" type="button" aria-label="Edit block" onClick={onEdit}>
            <Pencil size={15} />
          </button>
          <KebabMenu
            onEdit={onEdit}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            onDelete={onDelete}
            widthCols={block.widthCols}
            heightPx={block.heightPx}
            onWiden={() => onResize(Math.min(4, block.widthCols + 1) as Block["widthCols"], block.heightPx)}
            onNarrow={() => onResize(Math.max(1, block.widthCols - 1) as Block["widthCols"], block.heightPx)}
            onTaller={taller}
            onShorter={shorter}
            onResetHeight={() => onResize(block.widthCols, undefined)}
          />
        </div>
      </div>
      <div className="card-body" ref={bodyRef} style={heightPx ? { height: heightPx, overflowY: "auto" } : undefined}>
        {children}
      </div>
      <div
        className="resize-handle resize-handle--width"
        onPointerDown={startWidthDrag}
        aria-hidden="true"
      />
      <div
        className="resize-handle resize-handle--height"
        onPointerDown={startHeightDrag}
        aria-hidden="true"
      />
    </div>
  );
}

export function EmptyState({ message = "No data yet" }: { message?: string }) {
  return <p className="empty-state">{message}</p>;
}
