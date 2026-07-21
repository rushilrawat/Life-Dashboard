import { Plus } from "lucide-react";
import { resolveLocal } from "../lib/resolveLocal";
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
import BlockCard, { EmptyState } from "./BlockCard";
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
// component never knows where its data came from).
function renderResult(type: Block["type"], result: BlockResult) {
  switch (type) {
    case "stat":
      return <StatBlock result={result as StatResult} />;
    case "stat-grid":
      return <StatGridBlock result={result as StatGridResult} />;
    case "list":
      return <ListBlock result={result as ListResult} />;
    case "progress-list":
      return <ProgressListBlock result={result as ProgressListResult} />;
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

// The one place that resolves a block's source and dispatches to its
// type's renderer.
function BlockBody({ block }: { block: Block }) {
  if (block.type === "text") return <TextBlock blockId={block.id} />;
  if (block.type === "links") return <LinksBlock blockId={block.id} width={block.width} />;

  if (block.source?.kind === "api") {
    const cached = storage.get(`sync-cache:${block.id}`);
    if (!cached) return <EmptyState message="Not synced yet" />;
    return renderResult(block.type, cached.result);
  }

  const result = resolveLocal(block);
  if (!result) return <EmptyState message="Source not configured" />;
  return renderResult(block.type, result);
}

interface Props {
  blocks: Block[];
  onAddBlock: () => void;
  onEditBlock: (block: Block) => void;
  onSwapOrder: (idA: string, idB: string) => void;
  onSetWidth: (id: string, width: Block["width"]) => void;
  onDeleteBlock: (id: string) => void;
  onSourceChange: (id: string, source: LocalSource) => void;
}

export default function Board({
  blocks,
  onAddBlock,
  onEditBlock,
  onSwapOrder,
  onSetWidth,
  onDeleteBlock,
  onSourceChange,
}: Props) {
  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  return (
    <section className="board" aria-label="Board">
      {sorted.map((block, i) => (
        <BlockCard
          key={block.id}
          block={block}
          onEdit={() => onEditBlock(block)}
          onMoveUp={() => onSwapOrder(block.id, sorted[i - 1].id)}
          onMoveDown={() => onSwapOrder(block.id, sorted[i + 1].id)}
          canMoveUp={i > 0}
          canMoveDown={i < sorted.length - 1}
          onSetWidth={(width) => onSetWidth(block.id, width)}
          onDelete={() => onDeleteBlock(block.id)}
          onSourceChange={(source) => onSourceChange(block.id, source)}
        >
          <BlockBody block={block} />
        </BlockCard>
      ))}
      <button className="add-block-tile" type="button" onClick={onAddBlock}>
        <Plus size={20} />
        Add Block
      </button>
    </section>
  );
}
