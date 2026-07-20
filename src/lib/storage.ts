import type {
  Block,
  LinksBlockData,
  Metric,
  NoteBlockData,
  Settings,
  SyncCacheEntry,
  Task,
} from "../types";

// The one typed wrapper around localStorage. Nothing else in the app calls
// localStorage directly. Keys and value types per the table in DATA_MODEL.md.

interface KeyValues {
  blocks: Block[];
  tasks: Task[];
  metrics: Metric[];
  settings: Settings;
  "last-review": string; // ISO timestamp
}

type StorageKey = keyof KeyValues | `blockdata:${string}` | `sync-cache:${string}`;

export function get<K extends keyof KeyValues>(key: K): KeyValues[K] | null;
export function get(key: `blockdata:${string}`): NoteBlockData | LinksBlockData | null;
export function get(key: `sync-cache:${string}`): SyncCacheEntry | null;
export function get(key: StorageKey): unknown {
  const raw = localStorage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null; // corrupt entry reads as absent rather than crashing the caller
  }
}

export function set<K extends keyof KeyValues>(key: K, value: KeyValues[K]): void;
export function set(key: `blockdata:${string}`, value: NoteBlockData | LinksBlockData): void;
export function set(key: `sync-cache:${string}`, value: SyncCacheEntry): void;
export function set(key: StorageKey, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function remove(key: StorageKey): void {
  localStorage.removeItem(key);
}
