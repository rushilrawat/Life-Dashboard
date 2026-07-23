import { CheckSquare, Download, RefreshCw, Settings as SettingsIcon, Upload } from "lucide-react";
import { useRef } from "react";

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
  selectMode: boolean;
  onToggleSelectMode: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
}

export default function Header({
  displayName,
  onOpenSettings,
  syncing,
  syncStatus,
  onSync,
  selectMode,
  onToggleSelectMode,
  onExportBackup,
  onImportBackup,
}: Props) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const importInputRef = useRef<HTMLInputElement>(null);

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
        <button
          className={`icon-btn${selectMode ? " active" : ""}`}
          type="button"
          aria-label={selectMode ? "Exit select mode" : "Select blocks"}
          title={selectMode ? "Exit select mode" : "Select blocks"}
          onClick={onToggleSelectMode}
        >
          <CheckSquare size={18} />
        </button>
        <button className="icon-btn" type="button" aria-label="Export backup" title="Export backup (JSON)" onClick={onExportBackup}>
          <Download size={18} />
        </button>
        <button
          className="icon-btn"
          type="button"
          aria-label="Import backup"
          title="Import backup (JSON)"
          onClick={() => importInputRef.current?.click()}
        >
          <Upload size={18} />
        </button>
        <input
          ref={importInputRef}
          className="file-input-hidden"
          type="file"
          accept="application/json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onImportBackup(file);
          }}
        />
        <button className="icon-btn" type="button" aria-label="Settings" onClick={onOpenSettings}>
          <SettingsIcon size={18} />
        </button>
      </div>
    </header>
  );
}
