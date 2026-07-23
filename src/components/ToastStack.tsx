import { X } from "lucide-react";

export interface ToastItem {
  id: string;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface Props {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

// A small fixed-position stack, bottom-left — auto-dismissed by App.tsx's
// pushToast after its duration, or manually via the × / an action button.
// Reused for three cases: block added, block deleted (with Undo), synced.
export default function ToastStack({ toasts, onDismiss }: Props) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span className="toast-message">{t.message}</span>
          {t.action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                t.action!.onClick();
                onDismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
          <button type="button" className="icon-btn toast-dismiss" aria-label="Dismiss" onClick={() => onDismiss(t.id)}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
