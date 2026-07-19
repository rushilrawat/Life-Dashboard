# life dashboard

A personal dashboard where every block is generic and every block can be
pointed at anything, local tasks and metrics, or any MCP-connected tool,
described in plain language instead of a hand-built integration per
service.

Full spec lives in `CLAUDE.md` and `docs/`. This file is just orientation.

## What it is

Eleven block types (stat, stat-grid, list, progress-list, table,
chart, breakdown, heatmap, week, text, links). Each block, other than
text and links, is bound to a data source: either your own tasks and
metrics, resolved instantly and locally, or a connected tool, resolved
through one batched AI call at sync time. Add a block, describe what
it should show in plain language, pick which connectors it's allowed
to use, done.

`breakdown` is the ring-plus-segments pattern (a total in the middle,
colored categories around it), reused for task progress, focus time,
habit scores. `heatmap` is a GitHub-style day-by-day intensity grid,
coding activity, a habit streak, anything that's a count per day.
`week` is a seven-day agenda strip, calendar events or tasks due this
week.

Links block doubles as a link organizer, not just a settings shortcut
list, save frequent sites, save watch-later links, tag your own
categories.

The sidebar filters the board by category, it's not a page router,
there's still exactly one board. Theme supports light and dark mode
plus a few named presets, not just a single fixed dark palette.

## Stack

- Frontend: Vite, React, TypeScript, plain CSS
- Backend: minimal Express server, proxies the sync call to the
  Anthropic API so the key stays server-side
- Storage: browser `localStorage`, no database, single user, single
  machine

## Setup

```
npm install
cp .env.example .env        # add ANTHROPIC_API_KEY
npm run dev                 # frontend, http://localhost:5173
npm run server               # backend proxy, http://localhost:3001
```

Both need to be running. The frontend calls the local backend, the
backend calls Anthropic, the key never ships to the browser.

## Docs

- `docs/ARCHITECTURE.md` — how blocks, sources, and sync fit together
- `docs/DATA_MODEL.md` — exact schemas and storage keys
- `docs/DESIGN.md` — palette, type, component styles
- `docs/ROADMAP.md` — build phases, work through them in order
