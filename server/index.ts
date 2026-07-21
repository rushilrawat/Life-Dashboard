import express from "express";
import type { ConnectorService, SyncRequest, SyncResponse } from "../src/types.ts";
import { requiredEnvVars, resolveApiRequest } from "./adapters/index.ts";

// Native env loading, no dotenv dependency. Missing .env is fine — each
// adapter reports its own missing-credential error per request rather
// than gating sync globally.
if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile();
  } catch {
    // no .env present
  }
}

const app = express();
app.use(express.json());

// Every service credential (GITHUB_TOKEN, and any future service's key)
// lives only here, server-side. Browser code never calls a third-party
// API directly — it only ever POSTs to this route.
app.post("/api/sync", async (req, res) => {
  const { requests } = req.body as SyncRequest;

  const settled = await Promise.allSettled(
    requests.map(async (r) => ({ blockId: r.blockId, result: await resolveApiRequest(r) })),
  );

  const response: SyncResponse = { results: {}, failed: [] };
  settled.forEach((outcome, i) => {
    const blockId = requests[i].blockId;
    if (outcome.status === "fulfilled" && outcome.value.result !== null) {
      response.results[blockId] = outcome.value.result;
      return;
    }
    if (outcome.status === "rejected") {
      console.error(`sync failed for block ${blockId}:`, outcome.reason);
    }
    response.failed.push(blockId);
  });

  res.json(response);
});

// Lets Settings show connected/missing per connector without needing a
// failed sync first — checks each requested service's required env vars
// are actually set, never returns the values themselves.
app.get("/api/connectors/status", (req, res) => {
  const services = String(req.query.services ?? "").split(",").filter(Boolean) as ConnectorService[];
  const status: Record<string, boolean> = {};
  for (const service of services) {
    const vars = requiredEnvVars(service);
    status[service] = vars.length > 0 && vars.every((v) => Boolean(process.env[v]));
  }
  res.json(status);
});

app.listen(3001, () => {
  console.log("backend proxy listening on http://localhost:3001");
});
