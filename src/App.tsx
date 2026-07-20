import { useEffect, useState } from "react";
import type { SyncRequest, SyncResponse } from "./types";

// Phase 0: a blank page whose only job is proving both servers run and talk
// to each other. On load, POST an empty SyncRequest to the backend's one
// route and show the outcome on screen. Real UI arrives in Phase 1+.
export default function App() {
  const [status, setStatus] = useState("checking backend…");

  useEffect(() => {
    const body: SyncRequest = { connectors: [], requests: [] };
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: SyncResponse = await res.json();
        setStatus(`backend connected — POST /api/sync → ${JSON.stringify(data)}`);
      })
      .catch((err) => {
        setStatus(`backend unreachable — ${String(err)}`);
      });
  }, []);

  return (
    <main>
      <h1>life dashboard</h1>
      <p>Phase 0 scaffold.</p>
      <p>{status}</p>
    </main>
  );
}
