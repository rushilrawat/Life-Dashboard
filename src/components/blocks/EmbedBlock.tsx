import { useState } from "react";
import * as storage from "../../lib/storage";
import { detectEmbed, EMBED_PROVIDER_LABELS } from "../../lib/embedProviders";
import type { EmbedBlockData } from "../../types";

const SUPPORTED = Object.values(EMBED_PROVIDER_LABELS).join(", ");

export default function EmbedBlock({ blockId }: { blockId: string }) {
  const key = `blockdata:${blockId}` as const;
  const [data, setData] = useState<EmbedBlockData | null>(
    () => storage.get(key) as EmbedBlockData | null,
  );
  const [url, setUrl] = useState("");

  const match = detectEmbed(url);

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!match) return;
    const next: EmbedBlockData = { url: url.trim(), provider: match.provider };
    setData(next);
    storage.set(key, next);
    setUrl("");
  }

  if (data) {
    const embedUrl = detectEmbed(data.url)?.embedUrl;
    return (
      <div>
        <div className="embed-frame">
          {embedUrl && <iframe src={embedUrl} allowFullScreen title={EMBED_PROVIDER_LABELS[data.provider]} />}
        </div>
        <button type="button" className="embed-change-btn" onClick={() => setData(null)}>
          Change link
        </button>
      </div>
    );
  }

  return (
    <form className="embed-setup" onSubmit={save}>
      <input
        className="text-input"
        placeholder="Paste a link to embed"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button className="sync-btn" type="submit" disabled={!match}>
        Embed
      </button>
      <p className="embed-hint">Supports {SUPPORTED} links.</p>
    </form>
  );
}
