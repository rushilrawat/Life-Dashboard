import type { ReactNode } from "react";

// Shared row anatomy (DESIGN.md): leading element, title/subtitle, trailing
// date/tag. Used by ListBlock and ProgressListBlock so both stay consistent.
interface Props {
  leading: ReactNode;
  title: string;
  subtitle?: string;
  date?: string;
  tag?: string;
  done?: boolean;
}

export default function Row({ leading, title, subtitle, date, tag, done }: Props) {
  return (
    <div className="row">
      <div className="row-leading">{leading}</div>
      <div className="row-main">
        <div className={`row-title${done ? " done" : ""}`}>{title}</div>
        {subtitle && <div className="row-subtitle">{subtitle}</div>}
      </div>
      {(date || tag) && (
        <div className="row-trailing">
          {tag && <span className="tag-pill">{tag}</span>}
          {date && <span>{date}</span>}
        </div>
      )}
    </div>
  );
}
