import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    // Spec pins the dev URL to :5173 — fail loudly rather than drift to 5174.
    strictPort: true,
    proxy: {
      // The browser only ever talks to relative /api paths; Express (:3001)
      // holds the API key. Never call api.anthropic.com from browser code.
      "/api": "http://localhost:3001",
    },
  },
});
