import { ArrowDown, ArrowUp, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { FILTER_OPTIONS, SORT_OPTIONS } from "../lib/localSourceOptions";
import * as storage from "../lib/storage";
import type { Block, LocalSource } from "../types";

export function timeAgo(iso: string): string {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface Props {
  block: Block;
  children: ReactNode;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSetWidth: (width: Block["width"]) => void;
  onDelete: () => void;
  onSourceChange: (source: LocalSource) => void;
}

export function KebabMenu({ onEdit, onMoveUp, onMoveDown, canMoveUp, canMoveDown, onSetWidth, onDelete, width }: Omit<Props, "block" | "children" | "onSourceChange"> & { width: Block["width"] }) {
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
          <button type="button" disabled={width === "half"} onClick={() => run(() => onSetWidth("half"))}>
            Width: Half
          </button>
          <button type="button" disabled={width === "full"} onClick={() => run(() => onSetWidth("full"))}>
            Width: Full
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
// and the kebab menu with the rest of the block-level operations.
export default function BlockCard({
  block,
  children,
  onEdit,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onSetWidth,
  onDelete,
  onSourceChange,
}: Props) {
  const local = block.source?.kind === "local" ? block.source : null;
  const syncCache = block.source?.kind === "api" ? storage.get(`sync-cache:${block.id}`) : null;

  return (
    <div className={`card card--${block.width}`}>
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
          <button className="icon-btn" type="button" aria-label="Edit block" onClick={onEdit}>
            <Pencil size={15} />
          </button>
          <KebabMenu
            onEdit={onEdit}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            onSetWidth={onSetWidth}
            onDelete={onDelete}
            width={block.width}
          />
        </div>
      </div>
      {children}
    </div>
  );
}

export function EmptyState({ message = "No data yet" }: { message?: string }) {
  return <p className="empty-state">{message}</p>;
}
