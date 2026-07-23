import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App, { defaultSettings } from "./App";
import * as storage from "./lib/storage";
import { migrateMetricNames, seedIfEmpty } from "./lib/seed";
import { applyTheme } from "./styles/themes";
import "./styles/tokens.css";
import "./styles/app.css";

// Apply the persisted theme before first render so even the pre-mount paint
// has the right palette — tokens.css only carries Forest dark defaults.
applyTheme(storage.get("settings") ?? defaultSettings);
seedIfEmpty();
migrateMetricNames();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
