import * as storage from "./storage";
import type { Block, EmbedBlockData, Group, LinksBlockData, Metric, NoteBlockData, Settings, Task } from "../types";

// sync-cache is deliberately excluded: it's a derived, re-fetchable result
// cache, not durable data — restoring a stale one would just delay the next
// real Sync rather than help.
interface BackupData {
  version: 1;
  exportedAt: string;
  blocks: Block[];
  groups: Group[];
  tasks: Task[];
  metrics: Metric[];
  settings: Settings;
  blockdata: Record<string, NoteBlockData | LinksBlockData | EmbedBlockData>;
}

export function exportBackup(): void {
  const blocks = storage.get("blocks") ?? [];
  const blockdata: BackupData["blockdata"] = {};
  for (const b of blocks) {
    const data = storage.get(`blockdata:${b.id}`);
    if (data !== null) blockdata[b.id] = data;
  }

  const data: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    blocks,
    groups: storage.get("groups") ?? [],
    tasks: storage.get("tasks") ?? [],
    metrics: storage.get("metrics") ?? [],
    settings: storage.get("settings") as Settings,
    blockdata,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `life-dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Minimal shape check, not a full schema validator — just enough to reject
// "that's not a life-dashboard backup" before restoreBackup overwrites
// anything real.
export function isBackupData(data: unknown): data is BackupData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    Array.isArray(d.blocks) &&
    Array.isArray(d.groups) &&
    Array.isArray(d.tasks) &&
    Array.isArray(d.metrics) &&
    typeof d.settings === "object" &&
    d.settings !== null &&
    typeof d.blockdata === "object" &&
    d.blockdata !== null
  );
}

// Caller is responsible for confirming with the user first — this
// overwrites every durable key with no further checks.
export function restoreBackup(data: BackupData): void {
  storage.set("blocks", data.blocks);
  storage.set("groups", data.groups);
  storage.set("tasks", data.tasks);
  storage.set("metrics", data.metrics);
  storage.set("settings", data.settings);
  for (const [blockId, blockdata] of Object.entries(data.blockdata)) {
    storage.set(`blockdata:${blockId}`, blockdata);
  }
}
