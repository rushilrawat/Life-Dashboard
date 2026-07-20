import type { WeekResult } from "../../types";

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE = 3;
const isToday = (iso: string) => iso === new Date().toISOString().slice(0, 10);

export default function WeekBlock({ result }: { result: WeekResult }) {
  return (
    <div className="week-grid">
      {result.days.map((day) => {
        const d = new Date(`${day.date}T00:00:00`);
        const visible = day.entries.slice(0, MAX_VISIBLE);
        const extra = day.entries.length - visible.length;
        return (
          <div className={`week-day${isToday(day.date) ? " today" : ""}`} key={day.date}>
            <div className="week-day-label">{WEEKDAY[d.getDay()]}</div>
            <div className="week-day-date">{d.getDate()}</div>
            {visible.map((e, i) => (
              <div className="week-entry" key={i}>
                {e.time && <span className="week-entry-time">{e.time}</span>}
                {e.title}
              </div>
            ))}
            {extra > 0 && <div className="week-more">+{extra} more</div>}
          </div>
        );
      })}
    </div>
  );
}
