import type { HeatmapResult } from "../../types";

// GitHub-contribution-graph layout: one column per week, one row per
// weekday. Four fixed opacity steps against the max in the set, not a
// gradient (DESIGN.md).
function bucket(value: number, max: number): number {
  if (value <= 0) return 0;
  const ratio = value / max;
  if (ratio <= 0.33) return 0.25;
  if (ratio <= 0.66) return 0.55;
  return 1;
}

export default function HeatmapBlock({ result }: { result: HeatmapResult }) {
  const { days } = result;
  const max = Math.max(...days.map((d) => d.value), 1);
  const firstDow = new Date(`${days[0].date}T00:00:00`).getDay();
  const weeks = Math.ceil((firstDow + days.length) / 7);

  const cells = Array.from({ length: weeks * 7 }, (_, i) => {
    const dayIndex = i - firstDow;
    const day = days[dayIndex];
    return day ?? null;
  });

  return (
    <div>
      <div className="heatmap-grid">
        {cells.map((day, i) => {
          const opacity = day ? bucket(day.value, max) : 0;
          return (
            <div
              key={i}
              className="heatmap-cell"
              title={day ? `${day.date}: ${day.value}` : undefined}
              style={
                day && opacity > 0
                  ? { background: "var(--accent)", opacity }
                  : { background: "var(--border)" }
              }
            />
          );
        })}
      </div>
      <div className="heatmap-legend">
        Less
        {[0, 0.25, 0.55, 1].map((o, i) => (
          <div
            key={i}
            className="heatmap-cell"
            style={o > 0 ? { background: "var(--accent)", opacity: o } : { background: "var(--border)" }}
          />
        ))}
        More
      </div>
    </div>
  );
}
