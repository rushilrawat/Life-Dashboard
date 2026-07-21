# life dashboard

A personal dashboard where every block is generic and every block can
be pointed at anything, local tasks and metrics, or any connected
service, each service resolved through a small hand-written adapter
instead of one giant integration per feature.

Full spec lives in `CLAUDE.md` and `docs/`. This file is just orientation.

## What it is

Eleven block types (stat, stat-grid, list, progress-list, table,
chart, breakdown, heatmap, week, text, links). Each block, other than
text and links, is bound to a data source: either your own tasks and
metrics, resolved instantly and locally, or a connected service,
resolved through that service's adapter at sync time, no AI call
involved, adapters are plain code. Add a block, pick a connector, pick
what it should show from that connector's fixed menu of capabilities,
done.

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
- Backend: minimal Express server, holds every connected service's API
  key server-side and runs that service's adapter, no key of any kind
  ever reaches the browser
- Storage: browser `localStorage`, no database, single user, single
  machine

## Setup

```
npm install
cp .env.example .env        # add a token per service you connect, e.g. GITHUB_TOKEN
npm run dev                 # frontend, http://localhost:5173
npm run server               # backend, http://localhost:3001
```

Both need to be running. The frontend calls the local backend, the
backend calls each connected service directly, no key ever ships to
the browser. No Anthropic API key needed, this app doesn't call an LLM
anywhere in its own operation.

## Docs

- `docs/ARCHITECTURE.md` — how blocks, sources, and sync fit together
- `docs/DATA_MODEL.md` — exact schemas and storage keys
- `docs/DESIGN.md` — palette, type, component styles
- `docs/ROADMAP.md` — build phases, work through them in order
