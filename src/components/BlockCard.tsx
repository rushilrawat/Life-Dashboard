import type { ReactNode } from "react";
import type { Block } from "../types";

interface Props {
  block: Block;
  children: ReactNode;
}

// The card shell every block type renders inside. Kebab menu, edit pencil,
// and the per-card filter dropdown belong here too, added in Phase 3.
export default function BlockCard({ block, children }: Props) {
  return (
    <div className={`card card--${block.width}`}>
      <div className="card-header">
        <h2 className="card-title">{block.title}</h2>
      </div>
      {children}
    </div>
  );
}

export function EmptyState({ message = "No data yet" }: { message?: string }) {
  return <p className="empty-state">{message}</p>;
}
