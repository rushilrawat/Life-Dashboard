import { Circle } from "lucide-react";
import type { TableResult } from "../../types";
import { EmptyState } from "../BlockCard";

// Numeric-looking columns (percents, counts) render right-aligned per
// DESIGN.md; detected per-value rather than hardcoded to a column index so
// the same component works whatever columns a query happens to return.
const isNumeric = (v: string) => /^-?\d+(\.\d+)?%?$/.test(v.trim());

export default function TableBlock({ result }: { result: TableResult }) {
  if (result.rows.length === 0) return <EmptyState />;
  return (
    <table className="table">
      <thead>
        <tr>
          {result.columns.map((c) => (
            <th key={c}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {result.rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} className={isNumeric(cell) ? "numeric" : undefined}>
                {j === 0 && <Circle size={7} fill="var(--text-muted)" stroke="none" className="table-icon" />}
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
