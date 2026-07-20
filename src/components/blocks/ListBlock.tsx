import { Circle } from "lucide-react";
import type { ListResult } from "../../types";
import { EmptyState } from "../BlockCard";
import Row from "./Row";

export default function ListBlock({ result }: { result: ListResult }) {
  if (result.items.length === 0) return <EmptyState />;
  return (
    <div>
      {result.items.map((item, i) => (
        <Row
          key={i}
          leading={<Circle size={8} fill="var(--text-muted)" stroke="none" />}
          title={item.title}
          subtitle={item.subtitle}
          date={item.date}
          tag={item.tag}
        />
      ))}
    </div>
  );
}
