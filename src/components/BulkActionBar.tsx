import { useState } from "react";
import type { Group } from "../types";

interface Props {
  count: number;
  groups: Group[];
  categoriesInUse: string[];
  onDelete: () => void;
  onMoveToGroup: (groupId: string) => void;
  onSetCategory: (category: string) => void;
  onCancel: () => void;
}

// Fixed bottom-center bar, shown only once at least one block is selected
// (Header's Select toggle enters select mode; this is what acts on the
// result). Every action reuses App.tsx's existing single-item mutators in
// a loop — see App.tsx's bulk* functions — so there's no bulk-specific
// business logic here, only the form chrome to collect what to run them
// with.
export default function BulkActionBar({ count, groups, categoriesInUse, onDelete, onMoveToGroup, onSetCategory, onCancel }: Props) {
  const [category, setCategory] = useState("");

  return (
    <div className="bulk-action-bar">
      <span className="bulk-action-count">{count} selected</span>
      <button type="button" className="btn-ghost" onClick={onCancel}>
        Cancel
      </button>
      {groups.length > 0 && (
        <select
          className="header-select bulk-action-select"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) onMoveToGroup(e.target.value);
          }}
        >
          <option value="" disabled>
            Move to group…
          </option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
      )}
      <form
        className="bulk-action-category"
        onSubmit={(e) => {
          e.preventDefault();
          if (category.trim()) onSetCategory(category);
        }}
      >
        <input
          className="text-input"
          placeholder="Set category…"
          list="bulk-category-options"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <datalist id="bulk-category-options">
          {categoriesInUse.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <button type="submit" className="btn-ghost" disabled={!category.trim()}>
          Apply
        </button>
      </form>
      <button type="button" className="bulk-action-delete" onClick={onDelete}>
        Delete
      </button>
    </div>
  );
}
