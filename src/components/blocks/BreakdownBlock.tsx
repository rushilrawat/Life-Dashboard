import type { BreakdownResult } from "../../types";

const R = 40;
const CIRCUMFERENCE = 2 * Math.PI * R;
const roleVar = (role?: string) => (role ? `var(--${role})` : "var(--accent)");

// The ring signature element (DESIGN.md), reused for task progress, a habit
// score, or anything else shaped like a whole and its parts.
//
// BreakdownResult carries no explicit max/denominator, so the ring has one
// convention for each of the two documented cases: a single segment (habit
// score) is drawn as that value's own 0-100 percentage of the circle, with
// the remainder left as empty track. Two or more segments (task progress)
// are drawn proportional to each other, summing to the full circle — see
// DESIGN.md's Ring section for this written out next to the palette.
export default function BreakdownBlock({ result }: { result: BreakdownResult }) {
  const { segments, total } = result;
  const sum = segments.reduce((a, s) => a + s.value, 0);
  const arcs =
    segments.length === 1
      ? [{ ...segments[0], fraction: Math.min(segments[0].value, 100) / 100 }]
      : segments.map((s) => ({ ...s, fraction: sum > 0 ? s.value / sum : 0 }));

  let offset = 0;
  const drawn = arcs.map((s) => {
    const len = s.fraction * CIRCUMFERENCE;
    const dash = `${len} ${CIRCUMFERENCE - len}`;
    const dashOffset = -offset;
    offset += len;
    return { ...s, dash, dashOffset };
  });

  return (
    <div className="ring-wrap">
      <div className="ring-container">
        <svg viewBox="0 0 100 100" width="120" height="120">
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--border)" strokeWidth="10" />
          <g transform="rotate(-90 50 50)">
            {drawn.map((s, i) => (
              <circle
                key={i}
                cx="50"
                cy="50"
                r={R}
                fill="none"
                stroke={roleVar(s.role)}
                strokeWidth="10"
                strokeDasharray={s.dash}
                strokeDashoffset={s.dashOffset}
                strokeLinecap={segments.length === 1 ? "round" : "butt"}
              />
            ))}
          </g>
        </svg>
        <div className="ring-total">
          <div className="ring-total-value">{total.value}</div>
          <div className="ring-total-label">{total.label}</div>
        </div>
      </div>
      {segments.length > 0 && (
        <div className="ring-segments">
          {segments.map((s, i) => (
            <div className="ring-segment-row" key={i}>
              <span className="status-dot" style={{ background: roleVar(s.role) }} />
              {s.label}
              <span className="ring-segment-value">{s.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
