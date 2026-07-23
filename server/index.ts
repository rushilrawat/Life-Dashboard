import express from "express";
import type { ConnectorService, SyncRequest, SyncResponse } from "../src/types.ts";
import { requiredEnvVars, resolveApiRequest } from "./adapters/index.ts";
import { buildAuthUrl, exchangeCodeForRefreshToken, persistRefreshToken, verifyAndConsumeState } from "./googleAuth.ts";

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
    // A service with no required env vars (weather) needs no credential at
    // all, so it's always connected rather than always "missing" — the
    // vars.length > 0 case is what still gates a real credential like
    // GITHUB_TOKEN.
    status[service] = vars.length === 0 || vars.every((v) => Boolean(process.env[v]));
  }
  res.json(status);
});

// Google Calendar's connector isn't a token you paste in like GITHUB_TOKEN —
// it's a single-account OAuth2 consent flow, so the backend needs its own
// two routes to run it (see googleAuth.ts). The Settings panel links here
// directly (a plain page navigation, not a fetch) since step one is Google's
// own consent screen, which the app doesn't render.
app.get("/api/auth/google/start", (_req, res) => {
  try {
    res.redirect(buildAuthUrl());
  } catch (err) {
    res.status(500).send(err instanceof Error ? err.message : "Google auth failed");
  }
});

app.get("/api/auth/google/callback", async (req, res) => {
  const code = String(req.query.code ?? "");
  const state = String(req.query.state ?? "");
  if (!code) {
    res.status(400).send("Missing code");
    return;
  }
  if (!verifyAndConsumeState(state)) {
    res.status(400).send("Invalid or expired state — start the connection again from Settings");
    return;
  }
  try {
    const refreshToken = await exchangeCodeForRefreshToken(code);
    persistRefreshToken(refreshToken);
    res.redirect("http://localhost:5173/");
  } catch (err) {
    res.status(500).send(err instanceof Error ? err.message : "Google auth failed");
  }
});

app.listen(3001, () => {
  console.log("backend proxy listening on http://localhost:3001");
});
