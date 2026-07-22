import { useEffect, useState } from "react";
import Board from "./components/Board";
import BlockEditor from "./components/BlockEditor";
import type { BlockFormData } from "./components/BlockEditor";
import Header from "./components/Header";
import ReviewBanner, { shouldShowReviewBanner } from "./components/ReviewBanner";
import SettingsPanel from "./components/SettingsPanel";
import Sidebar from "./components/Sidebar";
import * as storage from "./lib/storage";
import { buildSyncRequests, applySyncResponse } from "./lib/sync";
import { applyTheme } from "./styles/themes";
import type { Block, Group, LocalSource, Settings } from "./types";

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
  const [groups, setGroups] = useState<Group[]>(() => storage.get("groups") ?? []);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Not synced yet");
  const [showReviewBanner, setShowReviewBanner] = useState(shouldShowReviewBanner);

  useEffect(() => {
    storage.set("settings", settings);
    applyTheme(settings);
  }, [settings]);

  useEffect(() => {
    storage.set("blocks", blocks);
  }, [blocks]);

  useEffect(() => {
    storage.set("groups", groups);
  }, [groups]);

  const updateSettings = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));

  // The only top-level reordering mechanism (no drag, no coordinates): swap
  // the `order` field between two top-level items. A group and an ungrouped
  // block share the same order namespace (Group.order / Block.order), so
  // idA/idB can be either kind — Board passes whichever's on-screen neighbor,
  // same as before groups existed.
  function swapOrder(idA: string, idB: string) {
    const orderOf = (id: string) => blocks.find((b) => b.id === id)?.order ?? groups.find((g) => g.id === id)?.order;
    const aOrder = orderOf(idA);
    const bOrder = orderOf(idB);
    if (aOrder === undefined || bOrder === undefined) return;
    setBlocks((bs) => bs.map((b) => (b.id === idA ? { ...b, order: bOrder } : b.id === idB ? { ...b, order: aOrder } : b)));
    setGroups((gs) => gs.map((g) => (g.id === idA ? { ...g, order: bOrder } : g.id === idB ? { ...g, order: aOrder } : g)));
  }

  // Reordering *within* a group is a separate axis from top-level order —
  // it swaps two ids inside that group's own `blockIds` sequence, never
  // touching either block's own (unused-while-grouped) `order` field.
  function swapWithinGroup(groupId: string, idA: string, idB: string) {
    setGroups((gs) =>
      gs.map((g) => {
        if (g.id !== groupId) return g;
        const ids = [...g.blockIds];
        const iA = ids.indexOf(idA);
        const iB = ids.indexOf(idB);
        if (iA === -1 || iB === -1) return g;
        [ids[iA], ids[iB]] = [ids[iB], ids[iA]];
        return { ...g, blockIds: ids };
      }),
    );
  }

  function nextTopLevelOrder(): number {
    return Math.max(0, ...blocks.map((b) => b.order), ...groups.map((g) => g.order)) + 1;
  }

  // Creates a new group holding just this one block, taking over the block's
  // old top-level slot (Group.order = the block's old order) — the group
  // appears right where the block used to be rather than jumping to the end.
  function createGroupWithBlock(blockId: string, title: string) {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    setGroups((gs) => [...gs, { id: crypto.randomUUID(), title, blockIds: [blockId], collapsed: false, order: block.order }]);
  }

  function addBlockToGroup(blockId: string, groupId: string) {
    setGroups((gs) =>
      gs.map((g) => (g.id === groupId && !g.blockIds.includes(blockId) ? { ...g, blockIds: [...g.blockIds, blockId] } : g)),
    );
  }

  // Ungrouping a single block: drop it from its group's blockIds (dissolving
  // the group entirely if that was the last member — an empty group has
  // nothing left to collapse or move as a unit) and give the block a fresh
  // top-level order so it reappears at the end of the board, not wherever
  // its stale pre-grouping order value happens to sort to.
  function removeBlockFromGroup(blockId: string) {
    const freshOrder = nextTopLevelOrder();
    setGroups((gs) => gs.map((g) => ({ ...g, blockIds: g.blockIds.filter((id) => id !== blockId) })).filter((g) => g.blockIds.length > 0));
    setBlocks((bs) => bs.map((b) => (b.id === blockId ? { ...b, order: freshOrder } : b)));
  }

  function renameGroup(groupId: string, title: string) {
    setGroups((gs) => gs.map((g) => (g.id === groupId ? { ...g, title } : g)));
  }

  function toggleGroupCollapsed(groupId: string) {
    setGroups((gs) => gs.map((g) => (g.id === groupId ? { ...g, collapsed: !g.collapsed } : g)));
  }

  // Ungroup releases every member block back to the top level, in their
  // existing relative order right where the group was — fractional offsets
  // off the group's own order slot the whole run in without renumbering
  // every other top-level item (ponytail: fine since order only has to sort
  // correctly, never be contiguous integers).
  function deleteGroup(groupId: string, alsoDeleteBlocks: boolean) {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    if (alsoDeleteBlocks) {
      group.blockIds.forEach((id) => {
        storage.remove(`blockdata:${id}`);
        storage.remove(`sync-cache:${id}`);
      });
      setBlocks((bs) => bs.filter((b) => !group.blockIds.includes(b.id)));
    } else {
      setBlocks((bs) =>
        bs.map((b) => {
          const i = group.blockIds.indexOf(b.id);
          return i === -1 ? b : { ...b, order: group.order + i * 0.001 };
        }),
      );
    }
    setGroups((gs) => gs.filter((g) => g.id !== groupId));
  }

  function resizeBlock(id: string, widthCols: Block["widthCols"], heightPx: number | undefined) {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, widthCols, heightPx } : b)));
  }

  function deleteBlock(id: string) {
    setBlocks((bs) => bs.filter((b) => b.id !== id));
    setGroups((gs) => gs.map((g) => ({ ...g, blockIds: g.blockIds.filter((bid) => bid !== id) })).filter((g) => g.blockIds.length > 0));
    storage.remove(`blockdata:${id}`);
    storage.remove(`sync-cache:${id}`);
  }

  function updateSource(id: string, source: LocalSource) {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, source } : b)));
  }

  function dismissReviewBanner() {
    storage.set("last-review", new Date().toISOString());
    setShowReviewBanner(false);
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
      setBlocks((bs) => [...bs, { id: crypto.randomUUID(), order: nextTopLevelOrder(), ...data }]);
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
        {showReviewBanner && <ReviewBanner onDismiss={dismissReviewBanner} />}
        <Board
          blocks={visibleBlocks}
          groups={groups}
          isOverview={activeCategory === null}
          onAddBlock={() => setEditor({ mode: "add" })}
          onEditBlock={(block) => setEditor({ mode: "edit", block })}
          onSwapOrder={swapOrder}
          onResizeBlock={resizeBlock}
          onDeleteBlock={deleteBlock}
          onSourceChange={updateSource}
          onSwapWithinGroup={swapWithinGroup}
          onCreateGroupWithBlock={createGroupWithBlock}
          onAddBlockToGroup={addBlockToGroup}
          onRemoveBlockFromGroup={removeBlockFromGroup}
          onRenameGroup={renameGroup}
          onToggleGroupCollapsed={toggleGroupCollapsed}
          onDeleteGroup={deleteGroup}
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
