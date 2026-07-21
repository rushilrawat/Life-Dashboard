import type { Block, Connector, SyncRequest, SyncResponse } from "../types";
import * as storage from "./storage";

// Every api-sourced block resolved against the current connectors, split
// into what can actually be sent to the backend and what's already known
// to fail (a connector that no longer exists) — the latter costs nothing,
// no network round trip needed to know it failed.
export function buildSyncRequests(
  blocks: Block[],
  connectors: Connector[],
): { request: SyncRequest; immediateFailures: string[] } {
  const request: SyncRequest = { requests: [] };
  const immediateFailures: string[] = [];

  for (const block of blocks) {
    const source = block.source;
    if (source?.kind !== "api") continue;
    const connector = connectors.find((c) => c.id === source.connectorId);
    if (!connector) {
      immediateFailures.push(block.id);
      continue;
    }
    request.requests.push({
      blockId: block.id,
      connectorId: connector.id,
      service: connector.service,
      capability: source.capability,
      params: source.params,
    });
  }

  return { request, immediateFailures };
}

// Writes fresh results into sync-cache, and marks failed blocks stale
// (keeping whatever data they last had) rather than blanking them.
export function applySyncResponse(response: SyncResponse, immediateFailures: string[] = []): void {
  const now = new Date().toISOString();

  for (const [blockId, result] of Object.entries(response.results)) {
    storage.set(`sync-cache:${blockId}`, { blockId, syncedAt: now, result, stale: false });
  }

  for (const blockId of [...response.failed, ...immediateFailures]) {
    const existing = storage.get(`sync-cache:${blockId}`);
    if (existing) storage.set(`sync-cache:${blockId}`, { ...existing, stale: true });
  }
}
