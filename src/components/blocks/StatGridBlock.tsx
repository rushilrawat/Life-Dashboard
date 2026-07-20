import type { StatGridResult } from "../../types";

export default function StatGridBlock({ result }: { result: StatGridResult }) {
  return (
    <div className="stat-grid">
      {result.items.map((item, i) => (
        <div className="stat-grid-item" key={i}>
          <div className="stat-value">{item.value}</div>
          <div className="stat-label">{item.label}</div>
          {item.delta && <div className="stat-delta">{item.delta}</div>}
        </div>
      ))}
    </div>
  );
}
