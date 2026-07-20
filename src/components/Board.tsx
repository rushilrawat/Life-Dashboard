import { resolveLocal, sampleHeatmap } from "../lib/resolveLocal";
import type {
  Block,
  BreakdownResult,
  ChartResult,
  ListResult,
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

// The block component never knows where its data came from (ARCHITECTURE.md)
// — this is the one place that resolves a block's source and dispatches to
// its type's renderer.
function BlockBody({ block }: { block: Block }) {
  if (block.type === "text") return <TextBlock blockId={block.id} />;
  if (block.type === "links") return <LinksBlock blockId={block.id} width={block.width} />;
  // ponytail: heatmap always shows fake data this phase, regardless of its
  // source — see resolveLocal.ts's sampleHeatmap() comment. Real sync-cache
  // lookup replaces this in Phase 5.
  if (block.type === "heatmap") return <HeatmapBlock result={sampleHeatmap()} />;

  const result = resolveLocal(block);
  if (!result) return <EmptyState message="Source not configured" />;

  switch (block.type) {
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
  }
}

export default function Board({ blocks }: { blocks: Block[] }) {
  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  return (
    <section className="board" aria-label="Board">
      {sorted.map((block) => (
        <BlockCard key={block.id} block={block}>
          <BlockBody block={block} />
        </BlockCard>
      ))}
    </section>
  );
}
