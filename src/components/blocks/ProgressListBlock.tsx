import type { ProgressItem, ProgressListResult } from "../../types";
import { EmptyState } from "../BlockCard";
import Row from "./Row";

// percent 0/100 renders as a checkbox (empty/checked), anything between as a
// slim bar — same data, three visual states at the extremes (DESIGN.md).
function Leading({ percent }: { percent: number }) {
  if (percent === 0) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" fill="none" stroke="var(--border-strong)" strokeWidth="1.5" />
      </svg>
    );
  }
  if (percent === 100) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" fill="var(--accent)" />
        <path d="M4.5 8.2 L7 10.7 L11.5 5.5" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <div className="progress-bar-track">
      <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
    </div>
  );
}

function ProgressRow({ item }: { item: ProgressItem }) {
  return (
    <Row
      leading={<Leading percent={item.percent} />}
      title={item.title}
      subtitle={item.subtitle}
      date={item.date}
      done={item.percent === 100}
    />
  );
}

export default function ProgressListBlock({ result }: { result: ProgressListResult }) {
  if (result.items.length === 0) return <EmptyState />;
  return (
    <div>
      {result.items.map((item, i) => (
        <ProgressRow key={i} item={item} />
      ))}
    </div>
  );
}
