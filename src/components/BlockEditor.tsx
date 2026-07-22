import {
  BarChart3,
  CalendarDays,
  FileText,
  Frame,
  Grid3x3,
  Hash,
  LayoutGrid,
  Link2,
  List,
  ListChecks,
  PieChart,
  Table2,
  X,
} from "lucide-react";
import { useState } from "react";
import type React from "react";
import { FILTER_OPTIONS, SORT_OPTIONS } from "../lib/localSourceOptions";
import type { ApiSource, Block, BlockType, Connector, LocalSource } from "../types";
import { CAPABILITIES } from "../types";

const BLOCK_TYPES: { type: BlockType; label: string; icon: typeof Hash }[] = [
  { type: "stat", label: "Stat", icon: Hash },
  { type: "stat-grid", label: "Stat Grid", icon: LayoutGrid },
  { type: "list", label: "List", icon: List },
  { type: "progress-list", label: "Progress List", icon: ListChecks },
  { type: "table", label: "Table", icon: Table2 },
  { type: "chart", label: "Chart", icon: BarChart3 },
  { type: "breakdown", label: "Breakdown", icon: PieChart },
  { type: "heatmap", label: "Heatmap", icon: Grid3x3 },
  { type: "week", label: "Week", icon: CalendarDays },
  { type: "text", label: "Text", icon: FileText },
  { type: "links", label: "Links", icon: Link2 },
  { type: "embed", label: "Embed", icon: Frame },
];

const NO_SOURCE: BlockType[] = ["text", "links", "embed"];

export interface BlockFormData {
  type: BlockType;
  title: string;
  width: "half" | "full";
  category?: string;
  source?: LocalSource | ApiSource;
}

interface Props {
  mode: "add" | "edit";
  initial?: Block;
  categoriesInUse: string[];
  connectors: Connector[];
  onSave: (data: BlockFormData) => void;
  onClose: () => void;
}

const defaultLocal: LocalSource = { kind: "local", collection: "tasks", sort: "date-desc", filter: "all" };
const defaultApi: ApiSource = { kind: "api", connectorId: "", capability: "", params: {} };

export default function BlockEditor({ mode, initial, categoriesInUse, connectors, onSave, onClose }: Props) {
  const [type, setType] = useState<BlockType>(initial?.type ?? "stat");
  const [sourceKind, setSourceKind] = useState<"local" | "api">(initial?.source?.kind ?? "local");
  // Local and api config are kept side by side, not reset when the toggle
  // flips, so switching back and forth doesn't lose what was picked.
  const [local, setLocal] = useState<LocalSource>(
    initial?.source?.kind === "local" ? initial.source : defaultLocal,
  );
  const [api, setApi] = useState<ApiSource>(initial?.source?.kind === "api" ? initial.source : defaultApi);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [width, setWidth] = useState<"half" | "full">(initial?.width ?? "half");
  const [category, setCategory] = useState(initial?.category ?? "");

  const isEdit = mode === "edit";
  const needsSource = !NO_SOURCE.includes(type);
  // Only offer connectors whose service has at least one capability that
  // can actually fill this block's type.
  const compatibleConnectors = connectors.filter((c) =>
    CAPABILITIES[c.service]?.some((cap) => cap.resultShape === type),
  );
  const selectedConnector = connectors.find((c) => c.id === api.connectorId);
  const availableCapabilities = selectedConnector
    ? CAPABILITIES[selectedConnector.service].filter((cap) => cap.resultShape === type)
    : [];
  const selectedCapability = availableCapabilities.find((cap) => cap.id === api.capability);
  // Connected-service sources need a fully-filled cascade before they're
  // worth saving — an incomplete one would just render "Not synced yet"
  // forever with no way to tell why.
  const apiSourceComplete =
    api.connectorId !== "" &&
    api.capability !== "" &&
    (selectedCapability?.params ?? []).every((p) => (api.params?.[p.key] ?? "").trim() !== "");
  const canSubmit = !needsSource || sourceKind === "local" || apiSourceComplete;

  function handleTypeChange(t: BlockType) {
    if (t === type) return;
    setType(t);
    // A connector/capability picked for the previous type doesn't
    // necessarily fill this one (a different resultShape, or none at all) —
    // clearing it forces the cascade to be re-picked, instead of leaving a
    // stale capability id that apiSourceComplete's `?? []` fallback would
    // treat as "no params to fill" and silently mark complete.
    setApi(defaultApi);
  }

  function handleConnectorChange(connectorId: string) {
    setApi({ kind: "api", connectorId, capability: "", params: {} });
  }

  function handleCapabilityChange(capability: string) {
    setApi((a) => ({ ...a, capability, params: {} }));
  }

  function handleParamChange(key: string, value: string) {
    setApi((a) => ({ ...a, params: { ...a.params, [key]: value } }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      type,
      title: title.trim(),
      width,
      category: category.trim() || undefined,
      source: needsSource ? (sourceKind === "local" ? local : api) : undefined,
    });
  }

  return (
    <div className="editor-overlay" onClick={onClose}>
      <form className="editor-panel" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="editor-header">
          <h2>{isEdit ? "Edit Block" : "Add Block"}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="editor-body">
          <section>
            <div className="editor-section-label">1. Choose block type</div>
            <div className="type-grid">
              {BLOCK_TYPES.map(({ type: t, label, icon: Icon }) => (
                <button
                  key={t}
                  type="button"
                  className={`type-tile${type === t ? " selected" : ""}`}
                  disabled={isEdit && t !== type}
                  onClick={() => handleTypeChange(t)}
                  title={label}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            {isEdit && <p className="editor-hint">Changing type isn't supported — delete and recreate instead.</p>}
          </section>

          {needsSource && (
            <section>
              <div className="editor-section-label">2. Data source</div>
              <div className="segmented">
                <button type="button" className={sourceKind === "local" ? "active" : ""} onClick={() => setSourceKind("local")}>
                  Local
                </button>
                <button type="button" className={sourceKind === "api" ? "active" : ""} onClick={() => setSourceKind("api")}>
                  Connected service
                </button>
              </div>

              {sourceKind === "local" ? (
                <div className="editor-fields">
                  <label>
                    Collection
                    <select
                      value={local.collection}
                      onChange={(e) => setLocal((l) => ({ ...l, collection: e.target.value as LocalSource["collection"] }))}
                    >
                      <option value="tasks">Tasks</option>
                      <option value="metrics">Metrics</option>
                    </select>
                  </label>
                  <label>
                    Sort
                    <select value={local.sort} onChange={(e) => setLocal((l) => ({ ...l, sort: e.target.value as LocalSource["sort"] }))}>
                      {SORT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Filter
                    <select value={local.filter} onChange={(e) => setLocal((l) => ({ ...l, filter: e.target.value as LocalSource["filter"] }))}>
                      {FILTER_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : (
                <div className="editor-fields">
                  {compatibleConnectors.length === 0 ? (
                    <p className="editor-hint">No compatible connector — add one in Settings.</p>
                  ) : (
                    <>
                      <label>
                        Connector
                        <select value={api.connectorId} onChange={(e) => handleConnectorChange(e.target.value)}>
                          <option value="">Select a connector…</option>
                          {compatibleConnectors.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Capability
                        <select
                          value={api.capability}
                          disabled={!selectedConnector}
                          onChange={(e) => handleCapabilityChange(e.target.value)}
                        >
                          <option value="">Select a capability…</option>
                          {availableCapabilities.map((cap) => (
                            <option key={cap.id} value={cap.id}>
                              {cap.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      {selectedCapability?.params.map((p) => (
                        <label key={p.key}>
                          {p.label}
                          <input
                            type={p.type}
                            value={api.params?.[p.key] ?? ""}
                            onChange={(e) => handleParamChange(p.key, e.target.value)}
                          />
                        </label>
                      ))}
                    </>
                  )}
                </div>
              )}
            </section>
          )}

          <section>
            <div className="editor-section-label">3. Block settings</div>
            <div className="editor-fields">
              <label>
                Title
                <input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </label>
              <label>
                Width
                <div className="segmented">
                  <button type="button" className={width === "half" ? "active" : ""} onClick={() => setWidth("half")}>
                    Half
                  </button>
                  <button type="button" className={width === "full" ? "active" : ""} onClick={() => setWidth("full")}>
                    Full
                  </button>
                </div>
              </label>
              <label>
                Category
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  list="editor-category-options"
                  placeholder="Optional — blank shows only under Overview"
                />
                <datalist id="editor-category-options">
                  {categoriesInUse.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>
            </div>
          </section>
        </div>

        <div className="editor-footer">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-accent" disabled={!canSubmit}>
            {isEdit ? "Save" : "Add Block"}
          </button>
        </div>
      </form>
    </div>
  );
}
