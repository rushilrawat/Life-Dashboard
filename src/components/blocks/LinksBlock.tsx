import { useState } from "react";
import * as storage from "../../lib/storage";
import type { Link, LinksBlockData } from "../../types";
import { EmptyState } from "../BlockCard";

const DEFAULT_CATEGORIES = ["Frequent", "Watch later"];

function groupByCategory(links: Link[]): [string, Link[]][] {
  const order: string[] = [];
  const groups: Record<string, Link[]> = {};
  // most recently added first within each group
  for (const link of [...links].sort((a, b) => b.addedAt.localeCompare(a.addedAt))) {
    if (!groups[link.category]) {
      groups[link.category] = [];
      order.push(link.category);
    }
    groups[link.category].push(link);
  }
  return order.map((cat) => [cat, groups[cat]]);
}

function LinkRow({ link }: { link: Link }) {
  return (
    <a className="link-row" href={link.url} target="_blank" rel="noreferrer">
      <span className="link-icon">{link.label[0]?.toUpperCase()}</span>
      {link.label}
    </a>
  );
}

export default function LinksBlock({ blockId, width }: { blockId: string; width: "half" | "full" }) {
  const key = `blockdata:${blockId}` as const;
  const [data, setData] = useState<LinksBlockData>(
    () => (storage.get(key) as LinksBlockData | null) ?? { links: [] },
  );
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");

  const categories = [...new Set([...DEFAULT_CATEGORIES, ...data.links.map((l) => l.category)])];

  function addLink(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !url.trim()) return;
    const link: Link = {
      id: crypto.randomUUID(),
      label: label.trim(),
      url: url.trim(),
      category: category.trim() || DEFAULT_CATEGORIES[0],
      addedAt: new Date().toISOString(),
    };
    const next = { links: [...data.links, link] };
    setData(next);
    storage.set(key, next);
    setLabel("");
    setUrl("");
    setCategory("");
  }

  const groups = groupByCategory(data.links);

  return (
    <div>
      {groups.length === 0 ? (
        <EmptyState message="No links yet" />
      ) : (
        <div className={width === "full" ? "links-columns" : "links-stacked"}>
          {groups.map(([cat, links]) => (
            <div key={cat}>
              <div className="links-group-label">{cat}</div>
              {links.map((link) => (
                <LinkRow key={link.id} link={link} />
              ))}
            </div>
          ))}
        </div>
      )}
      <form className="link-add-form" onSubmit={addLink}>
        <div className="link-add-row">
          <input
            className="text-input"
            placeholder="Label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <input
            className="text-input"
            placeholder="URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <div className="link-add-row">
          <input
            className="text-input"
            placeholder="Category"
            list={`${blockId}-categories`}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <datalist id={`${blockId}-categories`}>
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <button className="sync-btn" type="submit">
            Add
          </button>
        </div>
      </form>
    </div>
  );
}
