import { RefreshCw, Settings as SettingsIcon } from "lucide-react";

// Greeting is derived on every render, never stored (ARCHITECTURE.md).
// Empty displayName falls back to the bare phrase, no placeholder name.
function greeting(name: string): string {
  const h = new Date().getHours();
  const phrase =
    h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return name ? `${phrase}, ${name}` : phrase;
}

export default function Header({ displayName, onOpenSettings }: { displayName: string; onOpenSettings: () => void }) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="header">
      <div>
        <h1 className="greeting">{greeting(displayName)}</h1>
        <p className="tagline">{today}</p>
      </div>
      <div className="header-right">
        <span className="sync-status">Not synced yet</span>
        {/* Sync is an inert shell until Phase 5 wires the backend proxy. */}
        <button className="sync-btn" type="button">
          <RefreshCw size={14} />
          Sync
        </button>
        <button className="icon-btn" type="button" aria-label="Settings" onClick={onOpenSettings}>
          <SettingsIcon size={18} />
        </button>
      </div>
    </header>
  );
}
