import { Plus } from "lucide-react";
import { resolveLocal } from "../lib/resolveLocal";
import { applyDragOrder } from "../lib/reorderTasks";
import * as storage from "../lib/storage";
import type {
  Block,
  BlockResult,
  BreakdownResult,
  ChartResult,
  HeatmapResult,
  ListResult,
  LocalSource,
  ProgressListResult,
  StatGridResult,
  StatResult,
  TableResult,
  WeekResult,
} from "../types";
import BlockCard, { EmptyState, KebabMenu, timeAgo } from "./BlockCard";
import BreakdownBlock from "./blocks/BreakdownBlock";
import ChartBlock from "./blocks/ChartBlock";
import HeatmapBlock from "./blocks/HeatmapBlock";
import LinksBlock from "./blocks/LinksBlock";
import ListBlock from "./blocks/ListBlock";
import ProgressListBlock from "./blocks/ProgressListBlock";
import StatBlock from "./blocks/StatBlock";
import StatGridBlock from "./blocks/StatGridBlock";
import TableBlock from "./blocks/TableBlock";
import TextBlock from "./blocks/TextBlock";
import WeekBlock from "./blocks/WeekBlock";

// Dispatch by type only — same result shapes whether they came from
// resolveLocal() or a sync-cache entry (ARCHITECTURE.md: the block
// component never knows where its data came from). `onReorder` only ever
// applies to list/progress-list — every other type ignores the third arg.
function renderResult(type: Block["type"], result: BlockResult, onReorder?: (ids: string[]) => void) {
  switch (type) {
    case "stat":
      return <StatBlock result={result as StatResult} />;
    case "stat-grid":
      return <StatGridBlock result={result as StatGridResult} />;
    case "list":
      return <ListBlock result={result as ListResult} onReorder={onReorder} />;
    case "progress-list":
      return <ProgressListBlock result={result as ProgressListResult} onReorder={onReorder} />;
    case "table":
      return <TableBlock result={result as TableResult} />;
    case "chart":
      return <ChartBlock result={result as ChartResult} />;
    case "breakdown":
      return <BreakdownBlock result={result as BreakdownResult} />;
    case "week":
      return <WeekBlock result={result as WeekResult} />;
    case "heatmap":
      return <HeatmapBlock result={result as HeatmapResult} />;
    default:
      return null;
  }
}

// A block is hero-eligible if it's a stat or stat-grid type — the only two
// shapes compact enough for the big-number band. Checked in exactly one
// place so the promote-filter and the exclude-filter can't drift apart if a
// third hero-eligible type is ever added.
function isHeroEligible(block: Block): boolean {
  return block.type === "stat" || block.type === "stat-grid";
}

// Shared by BlockBody (grid cards) and HeroBand (hero tiles) — resolves a
// block's source without dispatching to a renderer, so both call sites can
// read the raw result their own way.
function resolveBlockData(block: Block): BlockResult | null {
  if (block.source?.kind === "api") {
    return storage.get(`sync-cache:${block.id}`)?.result ?? null;
  }
  return resolveLocal(block);
}

// Drag-to-rank only makes sense for a task-backed local list — nothing to
// write a manual priority back to for an api-sourced or metrics-sourced
// block, and table rows aren't reorderable (DESIGN.md/plan scope it out).
function isDraggableTasksBlock(block: Block): boolean {
  return (
    block.source?.kind === "local" &&
    block.source.collection === "tasks" &&
    (block.type === "list" || block.type === "progress-list")
  );
}

// The one place that resolves a block's source and dispatches to its
// type's renderer.
function BlockBody({ block, onReorder }: { block: Block; onReorder?: (ids: string[]) => void }) {
  if (block.type === "text") return <TextBlock blockId={block.id} />;
  if (block.type === "links") return <LinksBlock blockId={block.id} width={block.width} />;

  const result = resolveBlockData(block);
  if (!result) {
    return <EmptyState message={block.source?.kind === "api" ? "Not synced yet" : "Source not configured"} />;
  }
  return renderResult(block.type, result, isDraggableTasksBlock(block) ? onReorder : undefined);
}

// The kebab-menu callback set for one block at position i within `list` —
// shared by the grid map and the hero-band map so the neighbor-index math
// (move up/down against list[i±1]) lives in exactly one place instead of
// being hand-repeated per view.
interface KebabCallbacks {
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSetWidth: (width: Block["width"]) => void;
  onDelete: () => void;
}

type BlockMutators = Pick<Props, "onEditBlock" | "onSwapOrder" | "onSetWidth" | "onDeleteBlock">;

function kebabCallbacks(list: Block[], i: number, block: Block, mutators: BlockMutators): KebabCallbacks {
  return {
    onEdit: () => mutators.onEditBlock(block),
    onMoveUp: () => mutators.onSwapOrder(block.id, list[i - 1].id),
    onMoveDown: () => mutators.onSwapOrder(block.id, list[i + 1].id),
    canMoveUp: i > 0,
    canMoveDown: i < list.length - 1,
    onSetWidth: (width) => mutators.onSetWidth(block.id, width),
    onDelete: () => mutators.onDeleteBlock(block.id),
  };
}

// One hero tile: a big number and its label, an optional delta shown plain —
// same treatment StatGridBlock already gives delta (DESIGN.md doesn't define
// any sign-to-status convention for it, so coloring by leading +/- would be
// arbitrary variety CLAUDE.md's semantic-color rule reserves for real status).
function HeroTile({ value, label, delta }: { value: string; label: string; delta?: string }) {
  return (
    <div className="hero-tile">
      <div className="hero-tile-value">{value}</div>
      <div className="hero-tile-label">{label}</div>
      {delta && <div className="hero-tile-delta">{delta}</div>}
    </div>
  );
}

// One hero-eligible block's cluster of tiles: a `stat` block is one tile
// labeled with the block's own title, a `stat-grid` block flattens into one
// tile per item, each labeled with that item's own label. One shared kebab
// per block, not per tile — edit/move/width/delete still act on the block.
// `stale` mirrors BlockCard's own stale-sync indicator — the same "last
// sync failed" signal applies here too, not just to regular cards.
function HeroBlockCluster({
  block,
  result,
  stale,
  syncedAt,
  ...kebab
}: {
  block: Block;
  result: BlockResult;
  stale: boolean;
  syncedAt?: string;
} & KebabCallbacks) {
  const tiles =
    block.type === "stat"
      ? [{ value: (result as StatResult).value, label: block.title, delta: undefined as string | undefined }]
      : (result as StatGridResult).items.map((item) => ({ value: item.value, label: item.label, delta: item.delta }));

  return (
    <div className="hero-block">
      {tiles.map((t) => (
        <HeroTile key={t.label} value={t.value} label={t.label} delta={t.delta} />
      ))}
      <div className="hero-block-meta">
        {stale && syncedAt && (
          <span className="stale-indicator" title="Last sync attempt failed for this block">
            <span className="stale-dot" />
            last synced {timeAgo(syncedAt)}
          </span>
        )}
        <div className="hero-kebab">
          <KebabMenu {...kebab} width={block.width} />
        </div>
      </div>
    </div>
  );
}

// Overview-only glanceable strip (DESIGN.md's Hero band section): every
// stat/stat-grid block, promoted out of the regular grid. Move up/down swaps
// order with the neighbor within this same list, so reordering a hero tile
// shuffles it among other hero tiles, not silently against an invisible
// grid-card neighbor. A block whose data hasn't resolved yet still renders —
// as a compact tile with a working kebab — so it's never unreachable the way
// a plain `return null` would leave it (no card anywhere, on Overview or off).
function HeroBand({ blocks, mutators }: { blocks: Block[]; mutators: BlockMutators }) {
  return (
    <div className="hero-band">
      {blocks.map((block, i) => {
        const kebab = kebabCallbacks(blocks, i, block, mutators);
        const result = resolveBlockData(block);

        if (!result) {
          return (
            <div className="hero-block" key={block.id}>
              <div className="hero-tile">
                <div className="hero-tile-label">
                  {block.source?.kind === "api" ? "Not synced yet" : "Source not configured"}
                </div>
              </div>
              <div className="hero-block-meta">
                <div className="hero-kebab">
                  <KebabMenu {...kebab} width={block.width} />
                </div>
              </div>
            </div>
          );
        }

        const syncCache = block.source?.kind === "api" ? storage.get(`sync-cache:${block.id}`) : null;
        return (
          <HeroBlockCluster
            key={block.id}
            block={block}
            result={result}
            stale={!!syncCache?.stale}
            syncedAt={syncCache?.syncedAt}
            {...kebab}
          />
        );
      })}
    </div>
  );
}

interface Props {
  blocks: Block[];
  isOverview: boolean;
  onAddBlock: () => void;
  onEditBlock: (block: Block) => void;
  onSwapOrder: (idA: string, idB: string) => void;
  onSetWidth: (id: string, width: Block["width"]) => void;
  onDeleteBlock: (id: string) => void;
  onSourceChange: (id: string, source: LocalSource) => void;
}

export default function Board({
  blocks,
  isOverview,
  onAddBlock,
  onEditBlock,
  onSwapOrder,
  onSetWidth,
  onDeleteBlock,
  onSourceChange,
}: Props) {
  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  // Hero-eligible blocks only promote out of the grid on Overview — a
  // category filter is a slice of the board, not the glanceable-summary
  // view hero is for, so filtered stat/stat-grid blocks render as normal
  // cards, same as every other type.
  const heroBlocks = isOverview ? sorted.filter(isHeroEligible) : [];
  const gridBlocks = isOverview ? sorted.filter((b) => !isHeroEligible(b)) : sorted;
  const mutators: BlockMutators = { onEditBlock, onSwapOrder, onSetWidth, onDeleteBlock };

  // Drag (or a rank-up/down click) always applies, regardless of the
  // block's current sort — a drop writes the new task priorities, then
  // flips this block's sort to "priority" through the same onSourceChange
  // path the header dropdown already uses, so the order never snaps back
  // to whatever date/percent/name sort was showing before.
  function handleRowReorder(block: Block, ids: string[]) {
    if (block.source?.kind !== "local") return;
    applyDragOrder(ids);
    onSourceChange(block.id, { ...block.source, sort: "priority" });
  }

  return (
    <>
      {heroBlocks.length > 0 && <HeroBand blocks={heroBlocks} mutators={mutators} />}
      <section className="board" aria-label="Board">
        {gridBlocks.map((block, i) => (
          <BlockCard
            key={block.id}
            block={block}
            {...kebabCallbacks(gridBlocks, i, block, mutators)}
            onSourceChange={(source) => onSourceChange(block.id, source)}
          >
            <BlockBody block={block} onReorder={(ids) => handleRowReorder(block, ids)} />
          </BlockCard>
        ))}
        <button className="add-block-tile" type="button" onClick={onAddBlock}>
          <Plus size={20} />
          Add Block
        </button>
      </section>
    </>
  );
}
