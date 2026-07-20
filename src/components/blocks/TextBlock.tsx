import { useState } from "react";
import * as storage from "../../lib/storage";
import type { NoteBlockData } from "../../types";

export default function TextBlock({ blockId }: { blockId: string }) {
  const key = `blockdata:${blockId}` as const;
  const [content, setContent] = useState(
    () => (storage.get(key) as NoteBlockData | null)?.content ?? "",
  );

  return (
    <textarea
      className="note-textarea"
      value={content}
      onChange={(e) => {
        setContent(e.target.value);
        storage.set(key, { content: e.target.value });
      }}
    />
  );
}
