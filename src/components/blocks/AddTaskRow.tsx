import { useState } from "react";

interface Props {
  onAdd: (task: { title: string; category: string; date: string }) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

// Shared by ListBlock and ProgressListBlock when task-backed (Board.tsx
// gates which blocks get an onAddTask handler at all) — same inline
// add-form shape as LinksBlock's own add-link form, reusing its CSS.
// ponytail: category is plain text, no autocomplete datalist — that would
// need the full task category list threaded down just for this; add if
// typo'd duplicate categories become a real annoyance.
export default function AddTaskRow({ onAdd }: Props) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(today);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title: title.trim(), category: category.trim(), date });
    setTitle("");
    setCategory("");
    setDate(today());
  }

  return (
    <form className="link-add-form" onSubmit={submit}>
      <div className="link-add-row">
        <input className="text-input" placeholder="New task" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="link-add-row">
        <input
          className="text-input"
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <input className="text-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button className="sync-btn" type="submit">
          Add
        </button>
      </div>
    </form>
  );
}
