# Design system

Forest is the default, dark by default, same family as the person's
own site (Playfair/Inter, forest green on off-white) re-tuned for a
dense tool instead of a paper-like editorial page. Three more named
presets exist for real personalization, not just an accent picker
bolted onto one fixed look. Deliberately none of these land on the
generic dark-plus-bright-violet look this category defaults to.

## Theme presets

Four named presets, each with a light and dark variant, defined in
`src/styles/themes.ts` per `DATA_MODEL.md`'s `ThemePreset` type. Every
token below is a CSS custom property, switching preset or mode swaps
the whole set at once via `document.documentElement.style`.

**Forest** (default)
```
dark:  bg #0F1210  surface #171B18  surfaceRaised #1E2420  border #2A2F2B  borderStrong #3A413C
       text #EDEEE9  textSecondary #9BA39A  textMuted #647063
       accent #3E7A5C  accentStrong #5FA97F  accentTint #16241C
light: bg #FAF8F1  surface #FFFFFE  surfaceRaised #F3F0E6  border #E6E2D6  borderStrong #D3CDBC
       text #22241F  textSecondary #6E6C61  textMuted #A6A395
       accent #2F4B3C  accentStrong #1B2E24  accentTint #E4ECE4
```

**Slate**
```
dark:  bg #0E1216  surface #161B21  surfaceRaised #1E252C  border #262E36  borderStrong #37424D
       text #E9EDF1  textSecondary #97A3AF  textMuted #5E6B78
       accent #4C7AA8  accentStrong #6FA0D4  accentTint #14202B
light: bg #F6F8FA  surface #FFFFFF  surfaceRaised #EEF2F5  border #DCE3E8  borderStrong #C3CDD4
       text #1B232B  textSecondary #5B6773  textMuted #8D97A1
       accent #33475B  accentStrong #1F2E3C  accentTint #E2E9EE
```

**Plum**
```
dark:  bg #140F14  surface #1D161D  surfaceRaised #261C26  border #302530  borderStrong #453445
       text #EEE7EC  textSecondary #A594A0  textMuted #6B5866
       accent #8B4E7E  accentStrong #B172A3  accentTint #261923
light: bg #FAF6F9  surface #FFFFFF  surfaceRaised #F2E9EF  border #E5D7E1  borderStrong #CFB9CA
       text #241820  textSecondary #6E5C68  textMuted #A38F9B
       accent #4A2E43  accentStrong #2F1C2A  accentTint #EFE1EA
```

**Charcoal** (monochrome)
```
dark:  bg #131313  surface #1B1B1B  surfaceRaised #242424  border #2E2E2E  borderStrong #404040
       text #EDEDEB  textSecondary #A0A09B  textMuted #6B6B67
       accent #8A8A83  accentStrong #B5B5AC  accentTint #232320
light: bg #F7F6F3  surface #FFFFFF  surfaceRaised #EEEDE8  border #DEDDD6  borderStrong #C6C5BC
       text #22221F  textSecondary #63625B  textMuted #97968C
       accent #33322D  accentStrong #1E1D1A  accentTint #E7E6E0
```

`customAccent`, when set, replaces only the `accent` token of whatever
preset/mode is active, `accentStrong`/`accentTint` re-derive from it.
The derivation (implemented as `mix()` inside `applyTheme()`,
`src/styles/themes.ts`) is a channel-wise RGB mix toward white or
black, with percentages tuned per mode to match how the shipped
palettes relate accent to its variants:

```
dark mode:  accentStrong = accent mixed 25% toward white
            accentTint   = accent mixed 70% toward black
light mode: accentStrong = accent mixed 35% toward black
            accentTint   = accent mixed 85% toward white
```

Preset switching, mode switching, and a custom accent all compose,
nothing resets the others.

## Semantic colors (shared across every preset)

```css
/* dark mode */
--success:  #5FA97F;   /* on-track */
--warning:  #D9A441;   /* at-risk */
--danger:   #C9564A;   /* overdue, needs-reply */

/* light mode */
--success:  #2E7D4F;
--warning:  #B8860B;
--danger:   #B23B2E;
```

These three don't vary by preset, forest green stays forest green,
plum stays plum, but "overdue" is always the same red regardless of
theme. Status dots (on-track / at-risk / overdue) use these directly,
never the brand accent. One rule worth repeating from `CLAUDE.md`: if
two cards both show plain progress, they're both `--accent`, don't
reach for `--success` or an unrelated hue just to make a card stand
out. Variety for its own sake is what makes a dashboard feel noisy
instead of considered, that's the one real weakness in the most recent
reference mockup, purple progress bars next to a green ring next to a
four-color focus-time ring reads as decoration, not signal.

## Typography

Inter throughout, both headers and body. This is a deliberate change
from the person's editorial site, which pairs Playfair Display with
Inter, that pairing suits a calm paper-like reading surface, not a
dense dark tool with a lot of numbers on screen at once. One typeface,
weight does the work.

```css
--font: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif;
```

Scale: card titles 15px/600, body 13-14px/400, big stat numbers
28-32px/700 with `font-variant-numeric: tabular-nums` so digits don't
jitter in width as they update.

## Layout

- Board is a fixed 4-column grid (`repeat(4, 1fr)`) with
  `grid-auto-flow: dense` so a wide card breaking the row doesn't leave
  a gap behind it — a normal block set packs onto one screen instead of
  scrolling from wasted space. A card's `widthCols` (1-4) is how many of
  the 4 columns it spans, drag-resizable (see Resize handles, below) —
  not just two named sizes anymore, a continuous 1-4 range. Below 900px
  width: 2 columns, a stored `widthCols` clamps down to `min(widthCols,
  2)` for display only, the stored value is untouched. Below 480px: 1
  column, everything clamps to it — there's no room left to justify a
  second column either way.
- Card: `--surface` background, `1px solid var(--border)`, 12px
  radius, 16px padding. No shadows, flat only, dark surfaces don't need
  elevation cues the way light ones do, contrast against `--bg` is
  enough. `position: relative`, to anchor the resize handles.
- Card header: title (15px/600) on the left, block-specific meta (a
  count, a fraction like "1/2") plus the edit pencil and kebab menu on
  the right, all inline, all vertically centered.
- `local`-sourced cards get two more header elements: plain-text
  dropdowns for `filter` and `sort` (e.g. "Today ▾", "Newest First ▾"),
  13px `--text-secondary`, positioned left of the edit pencil and
  kebab menu (`ARCHITECTURE.md`'s Per-block live filter section covers
  both, not just filter). No border, no button chrome, they read as
  text until clicked — in practice the browser's own native `<select>`
  arrow, not a hand-rolled one, trying to fake one with CSS gradients
  reliably produced a worse-looking glyph than just leaving border and
  background off and letting the native arrow show. `api`-sourced
  cards never show either, their data isn't re-orderable client-side.

## Hero band

On the **Overview** view only, every `stat` and `stat-grid` block renders in
a hero band above the board grid instead of as a regular card — a
glanceable strip of big numbers, the one deliberate focal point on the
page. Switching to a category filter drops the hero band entirely and
those same blocks fall back to rendering as regular cards, respecting
`width` like every other type; hero is a whole-board summary concept, it
doesn't make sense for a filtered slice.

This is a pure rendering rule keyed off `block.type` and whether a
category filter is active, not a new field — nothing changes in
`DATA_MODEL.md`. A `stat` block becomes one tile, labeled with the
block's own `title`. A `stat-grid` block flattens its `items` into one
tile per item, each labeled with *that item's own* `label` (the block's
`title` doesn't apply per-item, so using it would repeat the same label
across every tile from that block). Reordering: Move Up/Down on a hero
tile swaps `order` with the adjacent *hero* block, not whatever's
adjacent in the full board order, so it visibly reorders the strip
instead of silently doing nothing.

Visual spec: one `--surface`/`--border`/12px-radius container spanning
the board width (same card language as `.card`, not a second visual
system), tiles separated by `1px solid var(--border)` dividers (drawn
between tiles and between clusters, never as a trailing border on the
band's outer edge), wrapping to more rows once tiles run out of
horizontal room. Value at 34-36px/700 tabular-nums — bigger than a
regular card's 30px `.stat-value`, so the band actually reads as "hero"
rather than more of the same. Label beneath at 12-13px
`--text-secondary`. `StatGridResult.delta`, when present, renders small
and plain — `--text-secondary`, same treatment `StatGridBlock` already
gives it as a regular card — not colored by its leading character: this
data model defines no sign-to-status convention for delta, so coloring
it by "+"/"-" would be exactly the arbitrary per-card variety
`CLAUDE.md`'s semantic-color rule reserves for real status meaning, and
would make the same field render two different ways depending only on
which view happened to be active. One kebab per block (not per tile),
opacity 0 by default and 1 on hover/focus-within, top-right of the
block's tile cluster — edit, move, width, and delete all still work
exactly as they do on a regular card, per `CLAUDE.md`'s
block-level-operations rule. A block whose data hasn't resolved yet
(not synced, or a local source that isn't configured) still renders as
a compact tile with its own working kebab, same as `BlockBody`'s empty
state for a regular card — it never just disappears, that would make an
uncategorized block unreachable on the one view it's guaranteed to
appear on. A hero tile whose last sync failed shows the same
`.stale-indicator` a regular card would ("last synced Xh ago"), not a
silently-outdated number.

Deliberately dropped from the hero tile: the per-card filter/sort
dropdowns `local`-sourced cards normally get in their header (see
Layout, below). Two inline `<select>`s on top of a big number undercuts
the point of the treatment. Quick-adjust is still available, just one
click further away via Edit Block — a real trade-off, not an oversight.

## Resize handles

Two thin invisible-until-hover strips per card (`ARCHITECTURE.md`'s
Resize section), `--accent-tint` on hover so they read as interactive
without adding chrome to every card at once when nothing's being
resized:

- **Width**: a 12px vertical strip on the card's right edge, `cursor:
  ew-resize`, centered on the card's border (extends slightly past it
  rather than sitting fully inside, so it doesn't eat into the card's
  own content padding).
- **Height**: a 12px horizontal strip on the card's bottom edge,
  `cursor: ns-resize`, same treatment.

No corner handle combining both — width and height are independent
drags, dragging diagonally would be ambiguous about which axis is
meant. Height, once set, makes the card body (everything beneath the
header) scroll internally past that height rather than clipping
silently; the header — title, filter/sort dropdowns, edit pencil,
kebab — always stays fully visible regardless of a height override.

## Row anatomy (list, progress-list, table)

The failure mode to design against: a card that's just lines of text
stacked up. Every `list` and `progress-list` row follows the same
anatomy, no exceptions, because the pattern itself is what makes it
read as designed instead of dumped:

- **Leading element**, 16-18px, one of: a status dot (`--success`/
  `--warning`/`--danger`/`--accent`), a checkbox (see below), or a
  small outline icon matching the row's nature (a commit gets
  `git-branch`, a calendar entry gets `calendar`). Never omit this,
  a row with no leading element is the wall-of-text failure mode.
- **Title**, 14px/500, `--text`, one line, truncate with ellipsis
  rather than wrap.
- **Subtitle**, 12px/400, `--text-secondary`, directly beneath the
  title, optional, this is where a repo name or a category lives.
- **Trailing content**, right-aligned, vertically centered against
  the title+subtitle block as a unit: a date, a tag pill
  (`--accent-tint` background, `--accent-strong` text, per the badge
  rule below), or both stacked (tag above date).

`table` follows the same spirit without the two-line title/subtitle:
first column gets the leading icon inline with its text, every other
column is plain `--text-secondary` unless it's the kind of numeric
column a `stat` would show, in which case it's `--text` and right-
aligned.

**Checkbox rows**: a `progress-list` item at `percent: 0` renders an
empty circle outline in place of the leading element, `percent: 100`
renders a filled circle with a check glyph, `--accent` fill, and the
title gets `text-decoration: line-through` in `--text-muted`. Anything
between 0 and 100 renders the leading element as a slim horizontal
progress bar instead (`--border` track, `--accent` fill), matching the
progress-list styling already used elsewhere on the board, not a
circle at all. Same data, three visual states at the two extremes and
everywhere in between, don't add a separate boolean field for this,
derive it from `percent`.

**Row cap**: `list`, `progress-list`, and `table` show at most 5 rows,
with a "Show N more" / "Show less" text toggle beneath when there's
more — same scale and color as `week`'s "+N more" note (11px,
`--text-muted`), just an interactive `<button>` instead of static text.

**Drag-to-rank** (`list`/`progress-list`, local tasks source only): a
grip handle (`GripVertical`, 13px, `--text-muted`) leads every row,
before the existing leading element, `cursor: grab`. A row mid-drag
drops to 50% opacity. Always-visible (not hover-gated) rank-up/rank-down
chevrons trail the row, same muted-then-secondary-on-hover treatment as
the grip, disabled (and visibly dimmed to `--border-strong`) at either
end of the visible list — this is the keyboard-reachable equivalent of
the drag, not a secondary affordance, so it never hides behind hover.
See `ARCHITECTURE.md`'s Task priority section for what a drop actually
does.

## Sidebar

Fixed left column, `--surface` background, `1px solid var(--border)`
right edge, ~240px wide. Top: wordmark ("life dashboard"). Nav list:
"Overview" plus one entry per active category (see
`ARCHITECTURE.md`'s Board navigation), each a plain row, icon
optional, active one gets `--accent-tint` background and `--accent`
left border (2px, the one exception to the single-hairline rule,
reserved for the active nav state). Below the nav, a "Connectors"
section: small caps label, then one row per connector (generic icon
per `## Icons` below, name only, the service label and connected/
missing status stay in Settings), then an "Add connector" row in
`--text-muted` with a plus icon that opens the same add form Settings
uses. Bottom of the
sidebar: theme switcher, a small preset-name dropdown ("Forest ▾")
next to a sun/moon toggle for light/dark mode, both write straight to
`Settings` and repaint immediately.

Below 640px width, the sidebar narrows to ~168px and every label drops
to 12px rather than collapsing to an icon-only rail — nav items are
freeform category text with no per-item icon to fall back to, so an
icon rail would need a category→icon mapping this app deliberately
doesn't have. Same list, same interaction, just tighter. The header
wraps at this width too, and the sync status text hides (the Sync
button and its spinner stay, that's the part that matters).

## Header

Above the board, not inside the sidebar. Left: greeting
("Good evening, Rushil") in 22px/600, tagline beneath in
`--text-secondary` 13px — the tagline is today's date ("Sunday,
July 19"), derived at render like the greeting, never stored. Right: sync status text, Sync button
(`--accent` filled, spinning refresh icon while active), gear icon for
Settings. The greeting recomputes on every load, it's derived, never
stored as text.

## Signature elements

Two hand-rolled SVG components, no charting library needed for either.

**Ring** (the `breakdown` block type): a circular arc via
`stroke-dasharray` per segment, `BreakdownResult.total.value` centered
inside in large `--text`, `total.label` beneath it in
`--text-secondary`, small rows beside the ring listing each segment
with a colored dot and its value. One component, reused for task
progress (segments colored by `role`, this is the one place
`--success`/`--warning`/`--danger` legitimately appear together, since
they're describing genuine status), for a habit score (a single
segment, no breakdown rows needed, just the ring and the number), and
for anything else shaped like a whole and its parts. Don't build a
separate component per use case, task-progress and habit-score are the
same `breakdown` block with different data.

`BreakdownResult` has no `max`/denominator field, so the ring needs a
convention for how full to draw it, given only segment values: **one
segment** (the habit-score case) draws its value as a 0-100 percentage
of the circle directly, remainder left as empty `--border` track — a
lone segment has nothing to be proportional *to*, so it's read as a
percentage. **Two or more segments** (the task-progress case) draw
proportional to each other, summing to the full circle with no
remainder track, since together they already account for the whole.
**Zero segments** draws an empty track, just the total number, no
arc.

**Bar chart**: simple vertical bars, `--accent` fill, day-of-week
labels beneath in `--text-muted`, no axis lines, no gridlines, the
bars carry the whole chart. A `chart` block should plot one comparable
series, same unit across every point (task counts by category, commits
by day) — not several differently-scaled named values side by side. The
local resolver can't tell "6 days," "82%," and "18h" apart, they're all
just numbers to a bar; picking comparable data for a `chart` block is on
whoever configures it, same as picking a sensible `local` collection for
any other type.

**Heatmap** (the `heatmap` block type): grid of small squares, one
column per week, one row per weekday, GitHub-contribution-graph
layout. Color is `--accent` at one of four fixed opacities (0, 25%,
55%, 100%) bucketed against the max value in the set, not a continuous
gradient, four steps read clearly, a gradient just looks smudgy at
12px. Empty/zero days use `--border` instead of a transparent accent,
so the grid has a visible shape even with no activity. No axis labels
beyond a small "Less → More" legend beneath, four swatches, if the
card has room. Fits a `half`-width card at roughly 12 weeks, a
`full`-width card can show a longer window.

**Week grid** (the `week` block type): seven equal columns, one per
day, today visually marked with an `--accent` top border on its
column. Each column: weekday abbreviation and date number at top
(`--text-muted` / `--text` per the row-anatomy scale), then up to
three entries stacked beneath as small chips (12px, `--surface-raised`
background, time prefix in `--accent-strong` if the entry has one),
"+N more" in `--text-muted` if there are more than three. This is
effectively a `list` per column, sharing the same row-anatomy rules at
a smaller scale, not a separate visual language.

## Icons

Outline style, one weight, from a neutral icon set (Lucide or Tabler
outline, not filled) — in practice `lucide-react`, the one icon
dependency. Never a brand logo, not for Gmail, GitHub,
Notion, or anything else, use a generic icon (mail, git-branch, book)
or a plain monogram square in a muted tone instead. This applies
everywhere a connector or a link might otherwise show a recognizable
brand mark, connector rows in Settings and link rows in the Links
block both need generic treatment.

## Text, Links, and Embed blocks

**Text**: one plain `<textarea>`, `--surface-raised` background,
`--border` outline, no rich formatting, no headings, no auto-detected
bullet lists, no separate "entries." A reference design once broke
this into titled sections with bullets under each, it looked more
structured but was harder to just dump a thought into, reverted, stay
plain. If structure is genuinely wanted later, that's a different
block, not a mutation of this one.

**Links**: grouped by category per `ARCHITECTURE.md`. At `full` width,
categories lay out as side-by-side columns (`repeat(auto-fit,
minmax(140px, 1fr))`, up to about 4 visible before wrapping), each
column a small caps category label over its rows. At `half` width,
categories stack vertically instead, each with its label as a plain
section header, not columns, there isn't room. Each link row: small
generic favicon-style icon or monogram square (never a real fetched
favicon of a brand mark, same rule as connectors), label, small
external-link glyph trailing on hover.

**Embed**: empty state is a single URL input (`--surface-raised`
background, matching Text's textarea) stacked above an "Embed" button,
`--accent` filled, disabled until the pasted link matches a supported
provider — no red error text, same disabled-button-is-the-signal
convention as the Add/Edit panel's own Save button (see States,
below), with a muted one-line hint beneath naming the supported
providers. Once set, the card body becomes a 16:9 `iframe`, full card
width, `8px` radius, no border of its own since the card's own border
already frames it. A small `--text-muted` "Change link" text button
sits beneath, `--text-secondary` on hover, the only way back to the
input without deleting and recreating the block.

## Add / Edit Block panel

Slide-in panel from the right, `--surface-raised` background,
`--border-strong` left edge. Three stacked sections matching
`ARCHITECTURE.md`'s three-step flow, each with a numbered small-caps
label ("1. Choose block type", "2. Data source", "3. Block settings").
Block type picker is a 4-column icon grid (twelve tiles, three even
rows), each tile `--surface`/`--border` default,
`--accent-tint` background with `--accent` border when selected. The
Local/Connected-service toggle is a two-segment control, same selected
treatment. Block settings' Width is a four-segment control (¼/½/¾/Full,
same `.segmented` treatment), just the starting size — a muted one-line
hint beneath it points at the card's own drag handles for fine-tuning
afterward, since this is only ever an initial value now, not the only
way to set it. When Connected service is active: a connector dropdown, then
a capability dropdown that populates once a connector's chosen (empty
and disabled until then, filtered to capabilities matching the block's
type), then that capability's param fields render below as plain
labeled text inputs, one row each, no more than two or three params in
practice given what GitHub's adapter needs. Footer: Cancel (ghost) and
Add Block / Save (filled `--accent`), right-aligned.

## Settings panel

Not separately specified before now — this doc never described one, only
`ARCHITECTURE.md`'s two-section content list existed. It reuses the
Add/Edit Block panel's exact treatment (slide-in from the right,
`--surface-raised`, `--border-strong` left edge, numbered-label
sections), the only panel precedent this app has, rather than
inventing a second modal language for one more panel.

**Connectors**: each row is icon + name + service label
(`--text-muted`, small) + a connected/missing status dot (`--success`
or `--warning`, checked live against `GET /api/connectors/status`) + a
trash icon, `1px solid var(--border)` beneath each row. No url, no
per-connector params — those live on whichever blocks use the
connector, not here. Removing a connector still referenced by a block
doesn't pop a native
`confirm()` — nothing else in this app uses a browser-native dialog,
and one would break the fully custom-styled feel everywhere else. The
row instead swaps in place for an inline warning ("Used by N blocks —
remove anyway?") with Cancel / Remove, same pattern spirit as
everything else here staying in-system rather than reaching for a
platform default.

**Theme**: preset dropdown and a Light/Dark segmented control (same
`.segmented` treatment as the Add/Edit panel's Local/Connected-service toggle),
plus a native `<input type="color">` for the custom accent override —
no custom color-picker component, the platform picker already does
this well. A "Reset to preset" text button appears only once a custom
accent is actually set.

## States

- **Empty block** (no data yet, or source not configured): muted
  one-line message in `--text-muted`, never an empty white/dark void.
- **Stale block** (last sync failed to return this block): render the
  last cached result at full opacity, small `--warning`-colored dot
  and "last synced Xh ago" in the card header, don't grey out or hide
  data that's still probably accurate.
- **Loading (sync in progress)**: sync button shows a spinning refresh
  icon and disables, card contents stay as they were until the batch
  resolves, no per-card skeleton loaders, the whole sync is one atomic
  operation from the user's point of view.
- **Incomplete block config**: the Add/Edit panel's Save button
  disables (50% opacity) until a Connected-service source has a
  connector, a capability, and every one of that capability's params
  filled in — the same spirit as the browser-native `required` on
  Title, just for a multi-field cascade native validation can't cover.
  No red error text, the disabled button is the signal.

## Weekly review banner

A dismissible strip between the header and the board, shown when
`last-review` (`DATA_MODEL.md`'s localStorage key) is absent or more
than 7 days old. Deliberately **not** `--warning`-colored — this is a
nudge, not a status indicator, and semantic colors are reserved for
real data status per `CLAUDE.md`. `--accent-tint` background,
`--border` outline, matching the card radius. A small calendar icon in
`--accent-strong`, one line of copy, a dismiss × on the right that
writes `last-review` to now and hides the banner — it reappears
naturally once 7 more days pass.

## Keyboard focus

One global `:focus-visible` rule — 2px `--accent` outline, 2px offset
— rather than per-component focus styling. `:focus-visible` specifically,
not `:focus`, so it only appears for keyboard navigation, not mouse
clicks (`*:focus:not(:focus-visible) { outline: none }` suppresses the
browser default on click). Applies everywhere by default: nav items,
buttons, inputs, selects, the kebab menu, block-type tiles, all of it,
with no exceptions carved out.
