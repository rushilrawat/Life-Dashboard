import { CalendarCheck, X } from "lucide-react";
import * as storage from "../lib/storage";

const REVIEW_INTERVAL_DAYS = 7;

// Computed at render, like the header greeting — last-review is just a
// timestamp, not a stored boolean, so "should the banner show" is derived
// fresh each time rather than tracked as separate state.
export function shouldShowReviewBanner(): boolean {
  const last = storage.get("last-review");
  if (!last) return true;
  const daysSince = (Date.now() - new Date(last).getTime()) / 86_400_000;
  return daysSince >= REVIEW_INTERVAL_DAYS;
}

export default function ReviewBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="review-banner">
      <CalendarCheck size={16} />
      <span>It's been a week — worth a quick look at your board.</span>
      <button type="button" className="icon-btn" aria-label="Dismiss" onClick={onDismiss}>
        <X size={14} />
      </button>
    </div>
  );
}
