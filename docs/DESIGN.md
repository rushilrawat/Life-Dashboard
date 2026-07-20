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

- Board is a responsive grid, `repeat(auto-fit, minmax(320px, 1fr))`.
  A `full`-width block spans the full row (`grid-column: 1 / -1`), a
  `half`-width block takes one cell.
- Card: `--surface` background, `1px solid var(--border)`, 12px
  radius, 20px padding. No shadows, flat only, dark surfaces don't need
  elevation cues the way light ones do, contrast against `--bg` is
  enough.
- Card header: title (15px/600) on the left, block-specific meta (a
  count, a fraction like "1/2") plus the edit pencil and kebab menu on
  the right, all inline, all vertically centered.
- `local`-sourced cards get one more header element: a plain-text
  dropdown for `filter` (e.g. "Today ▾", "This Month ▾"), 13px
  `--text-secondary`, positioned left of the meta count. No border, no
  button chrome, it reads as text until clicked. `mcp`-sourced cards
  never show this, their data isn't re-orderable client-side.

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

## Sidebar

Fixed left column, `--surface` background, `1px solid var(--border)`
right edge, ~240px wide. Top: wordmark ("life dashboard"). Nav list:
"Overview" plus one entry per active category (see
`ARCHITECTURE.md`'s Board navigation), each a plain row, icon
optional, active one gets `--accent-tint` background and `--accent`
left border (2px, the one exception to the single-hairline rule,
reserved for the active nav state). Below the nav, a "Connectors"
section: small caps label, then one row per connector (generic icon
per `## Icons` below, name, no URL shown here, that detail stays in
Settings), then an "Add connector" row in `--text-muted` with a plus
icon that opens the same add form Settings uses. Bottom of the
sidebar: theme switcher, a small preset-name dropdown ("Forest ▾")
next to a sun/moon toggle for light/dark mode, both write straight to
`Settings` and repaint immediately.

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
bars carry the whole chart.

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

## Text and Links blocks

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

## Add / Edit Block panel

Slide-in panel from the right, `--surface-raised` background,
`--border-strong` left edge. Three stacked sections matching
`ARCHITECTURE.md`'s three-step flow, each with a numbered small-caps
label ("1. Choose block type", "2. Data source", "3. Block settings").
Block type picker is a 4-column icon grid (eleven tiles, three rows,
last row partial), each tile `--surface`/`--border` default,
`--accent-tint` background with `--accent` border when selected. Local/MCP-connected toggle is a two-
segment control, same selected treatment. Footer: Cancel (ghost) and
Add Block / Save (filled `--accent`), right-aligned.

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
