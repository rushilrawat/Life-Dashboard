import { useState } from "react";
import type { ReactNode } from "react";

// Shared row anatomy (DESIGN.md): leading element, title/subtitle, trailing
// date/tag. Used by ListBlock and ProgressListBlock so both stay consistent.
interface Props {
  leading: ReactNode;
  title: string;
  subtitle?: string;
  date?: string;
  tag?: string;
  done?: boolean;
  // progress-list only (see ProgressListBlock's ProgressRow) — colors the
  // trailing date `--danger`, DESIGN.md's reserved "overdue" semantic color.
  overdue?: boolean;
  // Present only for local, tasks-sourced rows (Board.tsx) — same
  // click-to-rename pattern as GroupSection's group title.
  onRename?: (newTitle: string) => void;
}

export default function Row({ leading, title, subtitle, date, tag, done, overdue, onRename }: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);

  function startEditing() {
    setTitleDraft(title);
    setEditingTitle(true);
  }

  function commitTitle() {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== title) onRename?.(trimmed);
  }

  return (
    <div className="row">
      <div className="row-leading">{leading}</div>
      <div className="row-main">
        {editingTitle ? (
          <input
            className="text-input row-title-input"
            value={titleDraft}
            autoFocus
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => e.key === "Enter" && commitTitle()}
          />
        ) : (
          <div
            className={`row-title${done ? " done" : ""}${onRename ? " editable" : ""}`}
            onClick={onRename ? startEditing : undefined}
            title={onRename ? "Click to rename" : undefined}
          >
            {title}
          </div>
        )}
        {subtitle && <div className="row-subtitle">{subtitle}</div>}
      </div>
      {(date || tag) && (
        <div className="row-trailing">
          {tag && <span className="tag-pill">{tag}</span>}
          {date && <span className={overdue ? "row-date-overdue" : undefined}>{date}</span>}
        </div>
      )}
    </div>
  );
}
