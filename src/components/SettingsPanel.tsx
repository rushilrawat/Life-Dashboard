import { Plug, Trash2, X } from "lucide-react";
import { useState } from "react";
import type React from "react";
import { themePresets } from "../styles/themes";
import type { Block, Connector, Settings } from "../types";

interface Props {
  settings: Settings;
  blocks: Block[];
  onSettingsChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
}

// Exactly two sections, per ARCHITECTURE.md — nothing else belongs here.
// Reuses the same slide-in panel treatment as BlockEditor.tsx (.editor-*
// classes): DESIGN.md never separately specifies a Settings panel look, and
// this is the only panel precedent the app has.
export default function SettingsPanel({ settings, blocks, onSettingsChange, onClose }: Props) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const dark = settings.themeMode === "dark";
  const preset = themePresets.find((p) => p.name === settings.themeName) ?? themePresets[0];
  const currentAccent = settings.customAccent ?? preset[settings.themeMode].accent;

  function addConnector(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    const connector: Connector = { id: crypto.randomUUID(), name: name.trim(), url: url.trim() };
    onSettingsChange({ connectors: [...settings.connectors, connector] });
    setName("");
    setUrl("");
  }

  function removeConnector(id: string) {
    onSettingsChange({ connectors: settings.connectors.filter((c) => c.id !== id) });
    setConfirmingId(null);
  }

  // ARCHITECTURE.md: deleting a connector should warn if blocks still
  // reference it, not silently break them.
  function usageCount(id: string): number {
    return blocks.filter((b) => b.source?.kind === "mcp" && b.source.connectorIds.includes(id)).length;
  }

  return (
    <div className="editor-overlay" onClick={onClose}>
      <div className="editor-panel" onClick={(e) => e.stopPropagation()}>
        <div className="editor-header">
          <h2>Settings</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="editor-body">
          <section>
            <div className="editor-section-label">Connectors</div>
            {settings.connectors.length === 0 && <p className="editor-hint">No connectors yet.</p>}
            {settings.connectors.map((c) => {
              const uses = usageCount(c.id);
              if (confirmingId === c.id) {
                return (
                  <div key={c.id} className="connector-row settings-connector-row settings-connector-confirm">
                    <span>
                      Used by {uses} block{uses === 1 ? "" : "s"} — remove anyway?
                    </span>
                    <button type="button" className="btn-ghost" onClick={() => setConfirmingId(null)}>
                      Cancel
                    </button>
                    <button type="button" className="danger-text" onClick={() => removeConnector(c.id)}>
                      Remove
                    </button>
                  </div>
                );
              }
              return (
                <div key={c.id} className="connector-row settings-connector-row">
                  <Plug size={14} />
                  <div className="settings-connector-info">
                    <span className="settings-connector-name">{c.name}</span>
                    <span className="settings-connector-url">{c.url}</span>
                  </div>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Remove ${c.name}`}
                    onClick={() => (uses > 0 ? setConfirmingId(c.id) : removeConnector(c.id))}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
            <form className="link-add-form" onSubmit={addConnector}>
              <div className="link-add-row">
                <input
                  className="text-input"
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  className="text-input"
                  placeholder="MCP server URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <button type="submit" className="btn-accent">
                  Add
                </button>
              </div>
            </form>
          </section>

          <section>
            <div className="editor-section-label">Theme</div>
            <div className="editor-fields">
              <label>
                Preset
                <select value={settings.themeName} onChange={(e) => onSettingsChange({ themeName: e.target.value })}>
                  {themePresets.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Mode
                <div className="segmented">
                  <button type="button" className={!dark ? "active" : ""} onClick={() => onSettingsChange({ themeMode: "light" })}>
                    Light
                  </button>
                  <button type="button" className={dark ? "active" : ""} onClick={() => onSettingsChange({ themeMode: "dark" })}>
                    Dark
                  </button>
                </div>
              </label>
              <label>
                Custom accent
                <div className="accent-picker-row">
                  <input
                    type="color"
                    className="accent-picker"
                    value={currentAccent}
                    onChange={(e) => onSettingsChange({ customAccent: e.target.value })}
                  />
                  {settings.customAccent && (
                    <button type="button" className="btn-ghost" onClick={() => onSettingsChange({ customAccent: undefined })}>
                      Reset to preset
                    </button>
                  )}
                </div>
              </label>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
