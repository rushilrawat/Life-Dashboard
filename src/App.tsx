import { useEffect, useState } from "react";
import Board from "./components/Board";
import BlockEditor from "./components/BlockEditor";
import type { BlockFormData } from "./components/BlockEditor";
import Header from "./components/Header";
import SettingsPanel from "./components/SettingsPanel";
import Sidebar from "./components/Sidebar";
import * as storage from "./lib/storage";
import { buildSyncRequests, applySyncResponse } from "./lib/sync";
import { applyTheme } from "./styles/themes";
import type { Block, LocalSource, Settings } from "./types";

export const defaultSettings: Settings = {
  displayName: "",
  themeName: "Forest",
  themeMode: "dark",
  connectors: [],
};

type EditorState = { mode: "add" } | { mode: "edit"; block: Block } | null;

export default function App() {
  const [settings, setSettings] = useState<Settings>(
    () => storage.get("settings") ?? defaultSettings,
  );
  const [blocks, setBlocks] = useState<Block[]>(() => storage.get("blocks") ?? []);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Not synced yet");

  useEffect(() => {
    storage.set("settings", settings);
    applyTheme(settings);
  }, [settings]);

  useEffect(() => {
    storage.set("blocks", blocks);
  }, [blocks]);

  const updateSettings = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));

  // The only reordering mechanism (no drag, no coordinates): swap the order
  // field between two blocks. Board passes the on-screen neighbor's id, so
  // this works the same whether Overview or a category filter is active.
  function swapOrder(idA: string, idB: string) {
    setBlocks((bs) => {
      const a = bs.find((b) => b.id === idA);
      const b = bs.find((b) => b.id === idB);
      if (!a || !b) return bs;
      return bs.map((x) => (x.id === idA ? { ...x, order: b.order } : x.id === idB ? { ...x, order: a.order } : x));
    });
  }

  function setWidth(id: string, width: Block["width"]) {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, width } : b)));
  }

  function deleteBlock(id: string) {
    setBlocks((bs) => bs.filter((b) => b.id !== id));
    storage.remove(`blockdata:${id}`);
    storage.remove(`sync-cache:${id}`);
  }

  function updateSource(id: string, source: LocalSource) {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, source } : b)));
  }

  async function handleSync() {
    const { request, immediateFailures } = buildSyncRequests(blocks, settings.connectors);
    if (request.requests.length === 0 && immediateFailures.length === 0) {
      setSyncStatus("Nothing to sync");
      return;
    }

    setSyncing(true);
    try {
      const response =
        request.requests.length > 0
          ? await fetch("/api/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(request),
            }).then((res) => {
              if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
              return res.json();
            })
          : { results: {}, failed: [] };

      applySyncResponse(response, immediateFailures);
      const failedCount = response.failed.length + immediateFailures.length;
      setSyncStatus(failedCount > 0 ? `Synced — ${failedCount} block${failedCount === 1 ? "" : "s"} failed` : "Synced just now");
    } catch {
      setSyncStatus("Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  function saveBlock(data: BlockFormData) {
    if (editor?.mode === "edit") {
      const id = editor.block.id;
      setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...data } : b)));
    } else {
      const nextOrder = blocks.length === 0 ? 0 : Math.max(...blocks.map((b) => b.order)) + 1;
      setBlocks((bs) => [...bs, { id: crypto.randomUUID(), order: nextOrder, ...data }]);
    }
    setEditor(null);
  }

  const categoriesInUse = [...new Set(blocks.map((b) => b.category).filter((c): c is string => !!c))];
  const visibleBlocks = activeCategory ? blocks.filter((b) => b.category === activeCategory) : blocks;

  return (
    <>
      <Sidebar
        settings={settings}
        onSettingsChange={updateSettings}
        blocks={blocks}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <main className="main">
        <Header
          displayName={settings.displayName}
          onOpenSettings={() => setSettingsOpen(true)}
          syncing={syncing}
          syncStatus={syncStatus}
          onSync={handleSync}
        />
        <Board
          blocks={visibleBlocks}
          onAddBlock={() => setEditor({ mode: "add" })}
          onEditBlock={(block) => setEditor({ mode: "edit", block })}
          onSwapOrder={swapOrder}
          onSetWidth={setWidth}
          onDeleteBlock={deleteBlock}
          onSourceChange={updateSource}
        />
      </main>
      {editor && (
        <BlockEditor
          mode={editor.mode}
          initial={editor.mode === "edit" ? editor.block : undefined}
          categoriesInUse={categoriesInUse}
          connectors={settings.connectors}
          onSave={saveBlock}
          onClose={() => setEditor(null)}
        />
      )}
      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          blocks={blocks}
          onSettingsChange={updateSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </>
  );
}
