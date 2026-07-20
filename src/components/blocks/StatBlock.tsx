import type { StatResult } from "../../types";

export default function StatBlock({ result }: { result: StatResult }) {
  return (
    <div>
      <div className="stat-value">{result.value}</div>
      <div className="stat-label">{result.label}</div>
    </div>
  );
}
