import type { ChartResult } from "../../types";
import { EmptyState } from "../BlockCard";

// Simple vertical bars, no library — DESIGN.md's Bar chart signature element.
export default function ChartBlock({ result }: { result: ChartResult }) {
  if (result.points.length === 0) return <EmptyState />;
  const max = Math.max(...result.points.map((p) => p.value), 1);
  return (
    <div className="chart">
      {result.points.map((p, i) => (
        <div className="chart-bar-wrap" key={i}>
          <div className="chart-bar" style={{ height: `${(p.value / max) * 100}%` }} />
          <div className="chart-bar-label">{p.label}</div>
        </div>
      ))}
    </div>
  );
}
