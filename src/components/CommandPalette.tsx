import {
  Filter,
  LayoutGrid,
  Plus,
  RefreshCw,
  Settings as SettingsIcon,
  SquareArrowOutUpRight,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { Block } from "../types";

interface Command {
  id: string;
  label: string;
  meta?: string;
  icon: typeof Plus;
  run: () => void;
}

interface Props {
  blocks: Block[];
  categories: string[];
  onJumpToBlock: (blockId: string) => void;
  onAddBlock: () => void;
  onSync: () => void;
  onOpenSettings: () => void;
  onFilterCategory: (category: string | null) => void;
  onClose: () => void;
}

// Cmd/Ctrl+K overlay: jump to a block by title, or run one of a handful of
// board-level actions — same list, filtered by one text input, standard
// command-palette shape. Centered near the top rather than this app's usual
// slide-in-from-the-right panel (`.editor-overlay`/`.editor-panel`) — that
// treatment is for editing a specific thing, this is a different, more
// universal interaction pattern with its own strong convention.
export default function CommandPalette({
  blocks,
  categories,
  onJumpToBlock,
  onAddBlock,
  onSync,
  onOpenSettings,
  onFilterCategory,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const commands: Command[] = useMemo(
    () => [
      { id: "add-block", label: "Add Block", icon: Plus, run: onAddBlock },
      { id: "sync", label: "Sync", icon: RefreshCw, run: onSync },
      { id: "settings", label: "Open Settings", icon: SettingsIcon, run: onOpenSettings },
      { id: "overview", label: "Show Overview", icon: LayoutGrid, run: () => onFilterCategory(null) },
      ...categories.map((c) => ({
        id: `category-${c}`,
        label: `Filter: ${c}`,
        icon: Filter,
        run: () => onFilterCategory(c),
      })),
      ...blocks.map((b) => ({
        id: `block-${b.id}`,
        label: b.title,
        meta: "Jump to block",
        icon: SquareArrowOutUpRight,
        run: () => onJumpToBlock(b.id),
      })),
    ],
    [blocks, categories, onAddBlock, onSync, onOpenSettings, onFilterCategory, onJumpToBlock],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function runActive() {
    const cmd = filtered[activeIndex];
    if (!cmd) return;
    cmd.run();
    onClose();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runActive();
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="command-palette-input"
          placeholder="Jump to a block or run a command…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="command-palette-results">
          {filtered.length === 0 ? (
            <p className="command-palette-empty">No matches</p>
          ) : (
            filtered.map((cmd, i) => (
              <div
                key={cmd.id}
                className={`command-palette-item${i === activeIndex ? " active" : ""}`}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => {
                  cmd.run();
                  onClose();
                }}
              >
                <cmd.icon size={15} />
                <span>{cmd.label}</span>
                {cmd.meta && <span className="command-palette-item-meta">{cmd.meta}</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
