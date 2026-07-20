import { Moon, Plug, Plus, Sun } from "lucide-react";
import { themePresets } from "../styles/themes";
import type { Settings } from "../types";

interface Props {
  settings: Settings;
  onSettingsChange: (patch: Partial<Settings>) => void;
}

export default function Sidebar({ settings, onSettingsChange }: Props) {
  const dark = settings.themeMode === "dark";

  return (
    <aside className="sidebar">
      <div className="wordmark">life dashboard</div>

      <nav>
        {/* Overview is the only item until blocks with categories exist. */}
        <button className="nav-item active" type="button">
          Overview
        </button>
      </nav>

      <div className="sidebar-label">Connectors</div>
      {settings.connectors.map((c) => (
        <div key={c.id} className="connector-row">
          <Plug size={14} />
          {c.name}
        </div>
      ))}
      {/* Opens the Settings add form once Phase 4 builds it. */}
      <button className="connector-row add-connector" type="button">
        <Plus size={14} />
        Add connector
      </button>

      <div className="sidebar-footer">
        <select
          className="theme-select"
          aria-label="Theme preset"
          value={settings.themeName}
          onChange={(e) => onSettingsChange({ themeName: e.target.value })}
        >
          {themePresets.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          className="icon-btn"
          type="button"
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => onSettingsChange({ themeMode: dark ? "light" : "dark" })}
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </aside>
  );
}
