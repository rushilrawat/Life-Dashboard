import type { PaletteTokens, Settings, ThemePreset } from "../types";

// The four shipped presets, hex values copied exactly from docs/DESIGN.md.
// Fixed list, not user-editable data.
export const themePresets: ThemePreset[] = [
  {
    name: "Forest",
    dark: {
      bg: "#0F1210", surface: "#171B18", surfaceRaised: "#1E2420",
      border: "#2A2F2B", borderStrong: "#3A413C",
      text: "#EDEEE9", textSecondary: "#9BA39A", textMuted: "#647063",
      accent: "#3E7A5C", accentStrong: "#5FA97F", accentTint: "#16241C",
    },
    light: {
      bg: "#FAF8F1", surface: "#FFFFFE", surfaceRaised: "#F3F0E6",
      border: "#E6E2D6", borderStrong: "#D3CDBC",
      text: "#22241F", textSecondary: "#6E6C61", textMuted: "#A6A395",
      accent: "#2F4B3C", accentStrong: "#1B2E24", accentTint: "#E4ECE4",
    },
  },
  {
    name: "Slate",
    dark: {
      bg: "#0E1216", surface: "#161B21", surfaceRaised: "#1E252C",
      border: "#262E36", borderStrong: "#37424D",
      text: "#E9EDF1", textSecondary: "#97A3AF", textMuted: "#5E6B78",
      accent: "#4C7AA8", accentStrong: "#6FA0D4", accentTint: "#14202B",
    },
    light: {
      bg: "#F6F8FA", surface: "#FFFFFF", surfaceRaised: "#EEF2F5",
      border: "#DCE3E8", borderStrong: "#C3CDD4",
      text: "#1B232B", textSecondary: "#5B6773", textMuted: "#8D97A1",
      accent: "#33475B", accentStrong: "#1F2E3C", accentTint: "#E2E9EE",
    },
  },
  {
    name: "Plum",
    dark: {
      bg: "#140F14", surface: "#1D161D", surfaceRaised: "#261C26",
      border: "#302530", borderStrong: "#453445",
      text: "#EEE7EC", textSecondary: "#A594A0", textMuted: "#6B5866",
      accent: "#8B4E7E", accentStrong: "#B172A3", accentTint: "#261923",
    },
    light: {
      bg: "#FAF6F9", surface: "#FFFFFF", surfaceRaised: "#F2E9EF",
      border: "#E5D7E1", borderStrong: "#CFB9CA",
      text: "#241820", textSecondary: "#6E5C68", textMuted: "#A38F9B",
      accent: "#4A2E43", accentStrong: "#2F1C2A", accentTint: "#EFE1EA",
    },
  },
  {
    name: "Charcoal",
    dark: {
      bg: "#131313", surface: "#1B1B1B", surfaceRaised: "#242424",
      border: "#2E2E2E", borderStrong: "#404040",
      text: "#EDEDEB", textSecondary: "#A0A09B", textMuted: "#6B6B67",
      accent: "#8A8A83", accentStrong: "#B5B5AC", accentTint: "#232320",
    },
    light: {
      bg: "#F7F6F3", surface: "#FFFFFF", surfaceRaised: "#EEEDE8",
      border: "#DEDDD6", borderStrong: "#C6C5BC",
      text: "#22221F", textSecondary: "#63625B", textMuted: "#97968C",
      accent: "#33322D", accentStrong: "#1E1D1A", accentTint: "#E7E6E0",
    },
  },
];

// Semantic colors are shared across every preset, varying only by mode.
const semantic = {
  dark: { success: "#5FA97F", warning: "#D9A441", danger: "#C9564A" },
  light: { success: "#2E7D4F", warning: "#B8860B", danger: "#B23B2E" },
};

const cssVar: Record<keyof PaletteTokens, string> = {
  bg: "--bg", surface: "--surface", surfaceRaised: "--surface-raised",
  border: "--border", borderStrong: "--border-strong",
  text: "--text", textSecondary: "--text-secondary", textMuted: "--text-muted",
  accent: "--accent", accentStrong: "--accent-strong", accentTint: "--accent-tint",
};

// Swaps the whole token set at once via document.documentElement.style,
// per DESIGN.md. Unknown themeName falls back to Forest.
export function applyTheme(settings: Settings): void {
  const preset =
    themePresets.find((p) => p.name === settings.themeName) ?? themePresets[0];
  const palette = preset[settings.themeMode];
  const style = document.documentElement.style;

  for (const key of Object.keys(cssVar) as (keyof PaletteTokens)[]) {
    style.setProperty(cssVar[key], palette[key]);
  }
  const sem = semantic[settings.themeMode];
  style.setProperty("--success", sem.success);
  style.setProperty("--warning", sem.warning);
  style.setProperty("--danger", sem.danger);
  style.colorScheme = settings.themeMode;
  // ponytail: customAccent ignored here until Phase 4 wires the accent picker
}
