import type { BlockResult, ConnectorService } from "../../src/types.ts";
import * as github from "./github.ts";
import * as weather from "./weather.ts";

export interface ApiResolveRequest {
  blockId: string;
  service: ConnectorService;
  capability: string;
  params?: Record<string, string>;
}

// One entry per supported service. Adding a new service (e.g. Google
// Calendar) is one more file in this directory plus one more line here.
const ADAPTERS: Record<ConnectorService, typeof github> = {
  github,
  weather,
};

export function resolveApiRequest(req: ApiResolveRequest): Promise<BlockResult | null> {
  const adapter = ADAPTERS[req.service];
  if (!adapter) throw new Error(`Unknown connector service "${req.service}"`);
  return adapter.runCapability(req.capability, req.params ?? {});
}

export function requiredEnvVars(service: ConnectorService): string[] {
  return ADAPTERS[service]?.requiredEnvVars ?? [];
}
