import { FolderInput, FolderMinus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type React from "react";

export interface GroupControls {
  groups: { id: string; title: string }[];
  currentGroupId?: string;
  onAddToGroup: (groupId: string) => void;
  onCreateGroupWith: (title: string) => void;
  onRemoveFromGroup: () => void;
}

// Block-level group assignment, deliberately its own small control next to
// the kebab rather than folded into it — keeps KebabMenu (shared by regular
// cards and the hero band) untouched. Already-grouped is a single icon
// button (no picker needed, there's only one thing to do); not-yet-grouped
// opens a small dropdown: pick an existing group, or name a new one, same
// "swap the row for a form" spirit as the rest of this app's inline UI
// (no native dialogs anywhere).
export default function GroupPicker({ groups, currentGroupId, onAddToGroup, onCreateGroupWith, onRemoveFromGroup }: GroupControls) {
  const [open, setOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (currentGroupId) {
    return (
      <button className="icon-btn" type="button" aria-label="Remove from group" title="Remove from group" onClick={onRemoveFromGroup}>
        <FolderMinus size={15} />
      </button>
    );
  }

  function create(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    onCreateGroupWith(title);
    setNewTitle("");
    setOpen(false);
  }

  return (
    <div className="kebab-menu" ref={ref}>
      <button className="icon-btn" type="button" aria-label="Add to group" title="Add to group" onClick={() => setOpen((o) => !o)}>
        <FolderInput size={15} />
      </button>
      {open && (
        <div className="kebab-dropdown group-picker-dropdown">
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                onAddToGroup(g.id);
                setOpen(false);
              }}
            >
              {g.title}
            </button>
          ))}
          {groups.length > 0 && <div className="group-picker-divider" />}
          <form className="group-picker-form" onSubmit={create}>
            <input
              className="text-input"
              placeholder="New group name"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <button className="sync-btn" type="submit" disabled={!newTitle.trim()}>
              Create
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
