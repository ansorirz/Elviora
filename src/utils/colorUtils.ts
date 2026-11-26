import type { CustomPaletteColors } from '../types';

export function normalizeHex(input: string, fallback = '#5F7D63'): string {
  const trimmed = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return fallback;
}

export function hexToRgbTuple(hex: string): [number, number, number] {
  const safe = normalizeHex(hex);
  const num = parseInt(safe.slice(1), 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

export function mixHex(hexA: string, hexB: string, weightB: number): string {
  const [r1, g1, b1] = hexToRgbTuple(hexA);
  const [r2, g2, b2] = hexToRgbTuple(hexB);
  const w = Math.max(0, Math.min(1, weightB));
  return rgbToHex(r1 + (r2 - r1) * w, g1 + (g2 - g1) * w, b1 + (b2 - b1) * w);
}

export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgbTuple(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const CSS_TOKEN_KEYS = [
  '--accent',
  '--accent-light',
  '--accent-hover',
  '--accent-deep',
  '--accent-soft',
  '--accent-soft-border',
  '--accent-text',
  '--accent-text-dark',
  '--blob-1',
  '--blob-2',
  '--blob-3',
] as const;

export function applyCustomPaletteTokens(
  colors: CustomPaletteColors,
  theme: 'light' | 'dark'
): void {
  const rootStyle = document.documentElement.style;
  const primary = normalizeHex(colors.primaryHex, '#6C8469');
  const secondary = normalizeHex(colors.secondaryHex, '#C69C4D');
  const backdrop = normalizeHex(colors.backdropHex, '#D88C94');

  const accentLight = mixHex(primary, '#FFFFFF', 0.16);
  const accentHover = mixHex(primary, '#000000', 0.16);
  const accentDeep = mixHex(primary, '#000000', 0.34);
  const accentText = mixHex(primary, '#000000', 0.18);
  const accentTextDark = mixHex(primary, '#FFFFFF', 0.56);

  const isDark = theme === 'dark';

  rootStyle.setProperty('--accent', primary);
  rootStyle.setProperty('--accent-light', accentLight);
  rootStyle.setProperty('--accent-hover', accentHover);
  rootStyle.setProperty('--accent-deep', accentDeep);
  rootStyle.setProperty(
    '--accent-soft',
    isDark ? hexToRgba(primary, 0.24) : mixHex(primary, '#FFFFFF', 0.9)
  );
  rootStyle.setProperty(
    '--accent-soft-border',
    isDark ? hexToRgba(primary, 0.48) : mixHex(primary, '#FFFFFF', 0.72)
  );
  rootStyle.setProperty('--accent-text', accentText);
  rootStyle.setProperty('--accent-text-dark', accentTextDark);
  rootStyle.setProperty('--blob-1', hexToRgba(primary, isDark ? 0.18 : 0.4));
  rootStyle.setProperty('--blob-2', hexToRgba(backdrop, isDark ? 0.14 : 0.34));
  rootStyle.setProperty('--blob-3', hexToRgba(secondary, isDark ? 0.12 : 0.3));
}

export function clearCustomPaletteTokens(): void {
  const rootStyle = document.documentElement.style;
  CSS_TOKEN_KEYS.forEach((key) => rootStyle.removeProperty(key));
}
