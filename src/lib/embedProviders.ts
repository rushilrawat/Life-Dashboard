import type { EmbedProvider } from "../types";

// The allowlist behind the `embed` block type (CLAUDE.md's iframe
// non-negotiable): a fixed set of recognized providers, each turned into
// that provider's own official embed URL. A link matching none of these
// is rejected, never iframed as-is — extending support means adding one
// more entry here, not opening a general "embed any URL" hatch.

export const EMBED_PROVIDER_LABELS: Record<EmbedProvider, string> = {
  youtube: "YouTube",
  "google-sheets": "Google Sheets",
  figma: "Figma",
  loom: "Loom",
};

interface ProviderMatcher {
  provider: EmbedProvider;
  pattern: RegExp;
  embedUrl: (match: RegExpMatchArray, url: string) => string;
}

const MATCHERS: ProviderMatcher[] = [
  {
    provider: "youtube",
    pattern: /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/,
    embedUrl: (m) => `https://www.youtube.com/embed/${m[1]}`,
  },
  {
    provider: "google-sheets",
    pattern: /docs\.google\.com\/spreadsheets\/d\/([\w-]+)/,
    embedUrl: (m) => `https://docs.google.com/spreadsheets/d/${m[1]}/preview`,
  },
  {
    provider: "figma",
    pattern: /figma\.com\/(?:file|design|proto)\/([\w-]+)/,
    embedUrl: (_m, url) => `https://www.figma.com/embed?embed_host=life-dashboard&url=${encodeURIComponent(url)}`,
  },
  {
    provider: "loom",
    pattern: /loom\.com\/share\/([\w-]+)/,
    embedUrl: (m) => `https://www.loom.com/embed/${m[1]}`,
  },
];

export function detectEmbed(url: string): { provider: EmbedProvider; embedUrl: string } | null {
  for (const matcher of MATCHERS) {
    const match = url.match(matcher.pattern);
    if (match) return { provider: matcher.provider, embedUrl: matcher.embedUrl(match, url) };
  }
  return null;
}
