import { Moon, Plug, Plus, Sun } from "lucide-react";
import { themePresets } from "../styles/themes";
import type { Block, Settings } from "../types";

interface Props {
  settings: Settings;
  onSettingsChange: (patch: Partial<Settings>) => void;
  blocks: Block[];
  activeCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

export default function Sidebar({ settings, onSettingsChange, blocks, activeCategory, onCategoryChange }: Props) {
  const dark = settings.themeMode === "dark";

  // Computed, not hand-configured: one chip per distinct category actually
  // present on the board, in the order it first appears (ARCHITECTURE.md's
  // Board navigation). A fresh install has zero chips beyond Overview.
  const categories: string[] = [];
  for (const b of [...blocks].sort((a, c) => a.order - c.order)) {
    if (b.category && !categories.includes(b.category)) categories.push(b.category);
  }

  return (
    <aside className="sidebar">
      <div className="wordmark">life dashboard</div>

      <nav>
        <button className={`nav-item${activeCategory === null ? " active" : ""}`} type="button" onClick={() => onCategoryChange(null)}>
          Overview
        </button>
        {categories.map((c) => (
          <button
            key={c}
            className={`nav-item${activeCategory === c ? " active" : ""}`}
            type="button"
            onClick={() => onCategoryChange(activeCategory === c ? null : c)}
          >
            {c}
          </button>
        ))}
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
