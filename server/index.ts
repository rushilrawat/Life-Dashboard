import express from "express";

const app = express();
app.use(express.json());

// Phase 0 stub: accepts a SyncRequest, returns an empty SyncResponse.
// Phase 5 replaces this body with the real batched Anthropic API call —
// the only place ANTHROPIC_API_KEY ever lives.
app.post("/api/sync", (_req, res) => {
  res.json({ results: {}, failed: [] });
});

app.listen(3001, () => {
  console.log("backend proxy listening on http://localhost:3001");
});
