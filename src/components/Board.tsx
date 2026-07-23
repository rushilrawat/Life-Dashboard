import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { DragEvent } from "react";
import { resolveLocal } from "../lib/resolveLocal";
import { applyDragOrder } from "../lib/reorderTasks";
import * as storage from "../lib/storage";
import { useDragReorder } from "../lib/useDragReorder";
import type { DragHandleProps } from "../lib/useDragReorder";
import type {
  Block,
  BlockResult,
  BreakdownResult,
  ChartResult,
  Group,
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
import type { GroupControls } from "./GroupPicker";
import GroupSection from "./GroupSection";
import BreakdownBlock from "./blocks/BreakdownBlock";
import ChartBlock from "./blocks/ChartBlock";
import EmbedBlock from "./blocks/EmbedBlock";
import HeatmapBlock from "./blocks/HeatmapBlock";
import LinksBlock from "./blocks/LinksBlock";
import ListBlock from "./blocks/ListBlock";
import ProgressListBlock from "./blocks/ProgressListBlock";
import StatBlock from "./blocks/StatBlock";
import StatGridBlock from "./blocks/StatGridBlock";
import TableBlock from "./blocks/TableBlock";
import TextBlock from "./blocks/TextBlock";
import WeekBlock from "./blocks/WeekBlock";

const MIN_HEIGHT_PX = 120;

// The board's column count at the current viewport (ARCHITECTURE.md/
// DESIGN.md's 900px/480px breakpoints) — a block's stored `widthCols`
// clamps down against this at render time, never mutated by it, so a
// 4-wide block reverts to 4-wide once the viewport widens again.
function boardMaxCols(): number {
  if (window.innerWidth <= 480) return 1;
  if (window.innerWidth <= 900) return 2;
  return 4;
}

function useBoardMaxCols(): number {
  const [maxCols, setMaxCols] = useState(boardMaxCols);
  useEffect(() => {
    const onResize = () => setMaxCols(boardMaxCols());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return maxCols;
}

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
// third hero-eligible type is ever added. Grouped blocks are never hero-
// eligible regardless of type (see Board's ungroupedBlocks split below) —
// grouping something is an explicit choice to keep it with its group, hero
// promotion would silently defeat that.
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
  if (block.type === "links") return <LinksBlock blockId={block.id} widthCols={block.widthCols} />;
  if (block.type === "embed") return <EmbedBlock blockId={block.id} />;

  const result = resolveBlockData(block);
  if (!result) {
    return <EmptyState message={block.source?.kind === "api" ? "Not synced yet" : "Source not configured"} />;
  }
  return renderResult(block.type, result, isDraggableTasksBlock(block) ? onReorder : undefined);
}

// Generic neighbor-index move callbacks against any ordered `{id}` list —
// shared by top-level board order (blocks and groups together) and
// within-group order (a group's own blockIds), so the "swap with list[i±1]"
// math lives in exactly one place regardless of which list it's applied to.
function neighborMove(list: { id: string }[], i: number, onSwap: (idA: string, idB: string) => void) {
  return {
    onMoveUp: () => onSwap(list[i].id, list[i - 1].id),
    onMoveDown: () => onSwap(list[i].id, list[i + 1].id),
    canMoveUp: i > 0,
    canMoveDown: i < list.length - 1,
  };
}

interface KebabCallbacks {
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onResize: (widthCols: Block["widthCols"], heightPx: number | undefined) => void;
  onDelete: () => void;
}

// Hero tiles have no rendered content box to measure a "current" height
// from the way a regular card's drag handle can (BlockCard.tsx), so
// "Taller" from a hero kebab starts from the same fixed floor a fresh
// explicit height would. Resize here has no visible effect on the tile
// itself (DESIGN.md never gave hero tiles a width/height treatment) — it
// only stages the value for whenever this block next renders as a regular
// card (a category filter, or falling out of hero eligibility), same
// reasoning DESIGN.md already gives for keeping width controls in the
// hero kebab at all.
function heroResizeProps(block: Block, onResize: KebabCallbacks["onResize"]) {
  return {
    widthCols: block.widthCols,
    heightPx: block.heightPx,
    onWiden: () => onResize(Math.min(4, block.widthCols + 1) as Block["widthCols"], block.heightPx),
    onNarrow: () => onResize(Math.max(1, block.widthCols - 1) as Block["widthCols"], block.heightPx),
    onTaller: () => onResize(block.widthCols, (block.heightPx ?? MIN_HEIGHT_PX) + 40),
    onShorter: () =>
      block.heightPx && onResize(block.widthCols, Math.max(MIN_HEIGHT_PX, block.heightPx - 40)),
    onResetHeight: () => onResize(block.widthCols, undefined),
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
// per block, not per tile — edit/move/resize/delete still act on the block.
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
          <KebabMenu
            onEdit={kebab.onEdit}
            onMoveUp={kebab.onMoveUp}
            onMoveDown={kebab.onMoveDown}
            canMoveUp={kebab.canMoveUp}
            canMoveDown={kebab.canMoveDown}
            onDelete={kebab.onDelete}
            {...heroResizeProps(block, kebab.onResize)}
          />
        </div>
      </div>
    </div>
  );
}

// Overview-only glanceable strip (DESIGN.md's Hero band section): every
// ungrouped stat/stat-grid block, promoted out of the regular grid. Move
// up/down swaps order with the neighbor within this same list, so
// reordering a hero tile shuffles it among other hero tiles, not silently
// against an invisible grid-card neighbor. A block whose data hasn't
// resolved yet still renders — as a compact tile with a working kebab — so
// it's never unreachable the way a plain `return null` would leave it.
function HeroBand({
  blocks,
  onEditBlock,
  onSwapOrder,
  onResizeBlock,
  onDeleteBlock,
}: {
  blocks: Block[];
  onEditBlock: (block: Block) => void;
  onSwapOrder: (idA: string, idB: string) => void;
  onResizeBlock: (id: string, widthCols: Block["widthCols"], heightPx: number | undefined) => void;
  onDeleteBlock: (id: string) => void;
}) {
  return (
    <div className="hero-band">
      {blocks.map((block, i) => {
        const kebab: KebabCallbacks = {
          onEdit: () => onEditBlock(block),
          ...neighborMove(blocks, i, onSwapOrder),
          onResize: (w, h) => onResizeBlock(block.id, w, h),
          onDelete: () => onDeleteBlock(block.id),
        };
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
                  <KebabMenu
                    onEdit={kebab.onEdit}
                    onMoveUp={kebab.onMoveUp}
                    onMoveDown={kebab.onMoveDown}
                    canMoveUp={kebab.canMoveUp}
                    canMoveDown={kebab.canMoveDown}
                    onDelete={kebab.onDelete}
                    {...heroResizeProps(block, kebab.onResize)}
                  />
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
  groups: Group[];
  isOverview: boolean;
  onAddBlock: () => void;
  onEditBlock: (block: Block) => void;
  onSwapOrder: (idA: string, idB: string) => void;
  onReorderTopLevel: (visibleOrderedIds: string[]) => void;
  onResizeBlock: (id: string, widthCols: Block["widthCols"], heightPx: number | undefined) => void;
  onDeleteBlock: (id: string) => void;
  onSourceChange: (id: string, source: LocalSource) => void;
  onSwapWithinGroup: (groupId: string, idA: string, idB: string) => void;
  onCreateGroupWithBlock: (blockId: string, title: string) => void;
  onAddBlockToGroup: (blockId: string, groupId: string) => void;
  onRemoveBlockFromGroup: (blockId: string) => void;
  onRenameGroup: (groupId: string, title: string) => void;
  onToggleGroupCollapsed: (groupId: string) => void;
  onDeleteGroup: (groupId: string, alsoDeleteBlocks: boolean) => void;
  selectMode: boolean;
  selectedIds: Set<string>;
  onToggleSelected: (id: string) => void;
}

type TopLevelEntry =
  | { kind: "block"; id: string; order: number; block: Block }
  | { kind: "group"; id: string; order: number; group: Group; members: Block[] };

export default function Board({
  blocks,
  groups,
  isOverview,
  onAddBlock,
  onEditBlock,
  onSwapOrder,
  onReorderTopLevel,
  onResizeBlock,
  onDeleteBlock,
  onSourceChange,
  onSwapWithinGroup,
  onCreateGroupWithBlock,
  onAddBlockToGroup,
  onRemoveBlockFromGroup,
  onRenameGroup,
  onToggleGroupCollapsed,
  onDeleteGroup,
  selectMode,
  selectedIds,
  onToggleSelected,
}: Props) {
  const maxCols = useBoardMaxCols();

  // `blocks` here is already category-filtered (App.tsx). Looking a group's
  // blockIds up against this same filtered array means a group with no
  // member surviving the filter just disappears, and one with some matching
  // members shows only those — the same "filtered out means not rendered"
  // rule an ordinary block already follows, extended to groups for free.
  const groupedIds = new Set(groups.flatMap((g) => g.blockIds));
  const ungroupedBlocks = blocks.filter((b) => !groupedIds.has(b.id));
  const visibleGroups = groups
    .map((g) => ({ group: g, members: g.blockIds.map((id) => blocks.find((b) => b.id === id)).filter((b): b is Block => !!b) }))
    .filter((vg) => vg.members.length > 0);

  const sortedUngrouped = [...ungroupedBlocks].sort((a, b) => a.order - b.order);
  // Hero-eligible blocks only promote out of the grid on Overview — a
  // category filter is a slice of the board, not the glanceable-summary
  // view hero is for, so filtered stat/stat-grid blocks render as normal
  // cards, same as every other type. Grouped blocks never promote (see
  // isHeroEligible's comment).
  const heroBlocks = isOverview ? sortedUngrouped.filter(isHeroEligible) : [];
  const gridOnlyBlocks = isOverview ? sortedUngrouped.filter((b) => !isHeroEligible(b)) : sortedUngrouped;

  const topLevel: TopLevelEntry[] = [
    ...gridOnlyBlocks.map((block) => ({ kind: "block" as const, id: block.id, order: block.order, block })),
    ...visibleGroups.map(({ group, members }) => ({ kind: "group" as const, id: group.id, order: group.order, group, members })),
  ].sort((a, b) => a.order - b.order);

  const allGroupsForPicker = groups.map((g) => ({ id: g.id, title: g.title }));

  // Drag-to-reorder the board's top-level list (grip handles in
  // BlockCard/GroupSection). `topLevel`'s own ids drive the hook; the live,
  // mid-drag order it returns is what actually renders, so a drop's visual
  // preview matches what onReorderTopLevel commits.
  const topLevelIds = topLevel.map((e) => e.id);
  const {
    order: liveTopLevelOrder,
    draggingId: draggingTopLevelId,
    dragProps: topLevelDragProps,
  } = useDragReorder(topLevelIds, onReorderTopLevel);
  const topLevelById = new Map(topLevel.map((e) => [e.id, e]));
  const orderedTopLevel = liveTopLevelOrder.map((id) => topLevelById.get(id)!);

  // A second, simpler drag signal layered on the reorder one above: which
  // *block* (never a group) is currently being dragged, whether via a
  // top-level grip or a grouped block's own grip — drives GroupSection's
  // drop target (join a group) and the board's own drop target (leave
  // one). See ARCHITECTURE.md's Groups section for the full reasoning.
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const isDraggingBlockGrouped = draggingBlockId !== null && groups.some((g) => g.blockIds.includes(draggingBlockId));

  // An ungrouped block's grip drives top-level reorder (like any other
  // top-level entry) *and* announces itself as a candidate to join a group.
  function topLevelBlockDragHandleProps(id: string): DragHandleProps {
    const base = topLevelDragProps(id);
    return {
      ...base,
      onDragStart: () => {
        base.onDragStart();
        setDraggingBlockId(id);
      },
      onDragEnd: () => {
        base.onDragEnd();
        setDraggingBlockId(null);
      },
    };
  }

  // A grouped block's grip has no top-level reorder role (it isn't in
  // `topLevelIds` at all) — it's a drag *source* only, plain DOM props,
  // no hook involvement. onDragOver/onDrop stay no-ops since intra-group
  // member order is kebab-only in this pass, not drag-reorderable.
  function groupedBlockDragHandleProps(id: string): DragHandleProps {
    return {
      draggable: true,
      onDragStart: () => setDraggingBlockId(id),
      onDragOver: () => {},
      onDrop: () => {},
      onDragEnd: () => setDraggingBlockId(null),
    };
  }

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

  function renderCard(
    block: Block,
    move: ReturnType<typeof neighborMove>,
    groupControls: GroupControls,
    dragHandleProps: DragHandleProps,
    isDragging: boolean,
  ) {
    return (
      <BlockCard
        key={block.id}
        block={block}
        maxCols={maxCols}
        onEdit={() => onEditBlock(block)}
        {...move}
        onResize={(w, h) => onResizeBlock(block.id, w, h)}
        onDelete={() => onDeleteBlock(block.id)}
        onSourceChange={(source) => onSourceChange(block.id, source)}
        groupControls={groupControls}
        dragHandleProps={dragHandleProps}
        isDragging={isDragging}
        selectMode={selectMode}
        selected={selectedIds.has(block.id)}
        onToggleSelected={() => onToggleSelected(block.id)}
      >
        <BlockBody block={block} onReorder={(ids) => handleRowReorder(block, ids)} />
      </BlockCard>
    );
  }

  return (
    <>
      {heroBlocks.length > 0 && (
        <HeroBand
          blocks={heroBlocks}
          onEditBlock={onEditBlock}
          onSwapOrder={onSwapOrder}
          onResizeBlock={onResizeBlock}
          onDeleteBlock={onDeleteBlock}
        />
      )}
      <section
        className="board"
        aria-label="Board"
        onDragOver={(e: DragEvent) => {
          if (isDraggingBlockGrouped) e.preventDefault();
        }}
        onDrop={(e: DragEvent) => {
          if (isDraggingBlockGrouped && draggingBlockId) {
            e.preventDefault();
            onRemoveBlockFromGroup(draggingBlockId);
          }
        }}
      >
        {orderedTopLevel.map((entry, i) => {
          const move = neighborMove(orderedTopLevel, i, onSwapOrder);

          if (entry.kind === "block") {
            return renderCard(
              entry.block,
              move,
              {
                groups: allGroupsForPicker,
                currentGroupId: undefined,
                onAddToGroup: (groupId) => onAddBlockToGroup(entry.block.id, groupId),
                onCreateGroupWith: (title) => onCreateGroupWithBlock(entry.block.id, title),
                onRemoveFromGroup: () => {},
              },
              topLevelBlockDragHandleProps(entry.id),
              draggingTopLevelId === entry.id,
            );
          }

          const canAcceptBlockDrop =
            draggingBlockId !== null && !isDraggingBlockGrouped && !entry.group.blockIds.includes(draggingBlockId);
          // A member of *this* group being dropped back onto its own
          // GroupSection isn't a "decline" (that's what ejects a grouped
          // block per ARCHITECTURE.md's Groups section) — it's a genuine
          // no-op, since intra-group drag-reorder isn't supported this pass.
          const isDropInOwnGroup = draggingBlockId !== null && entry.group.blockIds.includes(draggingBlockId);

          return (
            <GroupSection
              key={entry.id}
              group={entry.group}
              memberCount={entry.members.length}
              maxCols={maxCols}
              {...move}
              onToggleCollapsed={() => onToggleGroupCollapsed(entry.group.id)}
              onRename={(title) => onRenameGroup(entry.group.id, title)}
              onDelete={(alsoDeleteBlocks) => onDeleteGroup(entry.group.id, alsoDeleteBlocks)}
              dragHandleProps={topLevelDragProps(entry.id)}
              isDragging={draggingTopLevelId === entry.id}
              canAcceptBlockDrop={canAcceptBlockDrop}
              isDropInOwnGroup={isDropInOwnGroup}
              onAcceptBlockDrop={() => draggingBlockId && onAddBlockToGroup(draggingBlockId, entry.group.id)}
            >
              {entry.members.map((block, j) =>
                renderCard(
                  block,
                  neighborMove(entry.members, j, (a, b) => onSwapWithinGroup(entry.group.id, a, b)),
                  {
                    groups: allGroupsForPicker,
                    currentGroupId: entry.group.id,
                    onAddToGroup: () => {},
                    onCreateGroupWith: () => {},
                    onRemoveFromGroup: () => onRemoveBlockFromGroup(block.id),
                  },
                  groupedBlockDragHandleProps(block.id),
                  draggingBlockId === block.id,
                ),
              )}
            </GroupSection>
          );
        })}
        <button className="add-block-tile" type="button" onClick={onAddBlock}>
          <Plus size={20} />
          Add Block
        </button>
      </section>
    </>
  );
}
