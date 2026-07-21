import { RefreshCw, Settings as SettingsIcon } from "lucide-react";

// Greeting is derived on every render, never stored (ARCHITECTURE.md).
// Empty displayName falls back to the bare phrase, no placeholder name.
function greeting(name: string): string {
  const h = new Date().getHours();
  const phrase =
    h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return name ? `${phrase}, ${name}` : phrase;
}

interface Props {
  displayName: string;
  onOpenSettings: () => void;
  syncing: boolean;
  syncStatus: string;
  onSync: () => void;
}

export default function Header({ displayName, onOpenSettings, syncing, syncStatus, onSync }: Props) {
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
        <span className="sync-status">{syncStatus}</span>
        <button className="sync-btn" type="button" disabled={syncing} onClick={onSync}>
          <RefreshCw size={14} className={syncing ? "spin" : undefined} />
          Sync
        </button>
        <button className="icon-btn" type="button" aria-label="Settings" onClick={onOpenSettings}>
          <SettingsIcon size={18} />
        </button>
      </div>
    </header>
  );
}
