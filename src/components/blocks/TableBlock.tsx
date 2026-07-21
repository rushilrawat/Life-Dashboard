import { Circle } from "lucide-react";
import { useState } from "react";
import type { TableResult } from "../../types";
import { EmptyState } from "../BlockCard";

const ROW_CAP = 5;

// Numeric-looking columns (percents, counts) render right-aligned per
// DESIGN.md; detected per-value rather than hardcoded to a column index so
// the same component works whatever columns a query happens to return.
const isNumeric = (v: string) => /^-?\d+(\.\d+)?%?$/.test(v.trim());

export default function TableBlock({ result }: { result: TableResult }) {
  const [expanded, setExpanded] = useState(false);
  if (result.rows.length === 0) return <EmptyState />;
  const visibleRows = expanded ? result.rows : result.rows.slice(0, ROW_CAP);
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
        {visibleRows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} className={isNumeric(cell) ? "numeric" : undefined}>
                {j === 0 && <Circle size={7} fill="var(--text-muted)" stroke="none" className="table-icon" />}
                {cell}
              </td>
            ))}
          </tr>
        ))}
        {result.rows.length > ROW_CAP && (
          <tr>
            <td colSpan={result.columns.length}>
              <button type="button" className="show-more-toggle" onClick={() => setExpanded((e) => !e)}>
                {expanded ? "Show less" : `Show ${result.rows.length - ROW_CAP} more`}
              </button>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
