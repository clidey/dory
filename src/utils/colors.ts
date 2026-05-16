import docsConfig from '../../docs/dory.json' with { type: 'json' };
import type { DoryConfig } from '../types/config';

const config = docsConfig as DoryConfig;

function hexToRgb(hex: string): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
}

export function loadColors() {
  const { colors } = config;
  if (!colors) return;

  const root = document.documentElement;

  // Brand accent colors
  if (colors.primary) {
    root.style.setProperty('--brand-primary', colors.primary);
    root.style.setProperty('--brand-primary-rgb', hexToRgb(colors.primary));
    root.style.setProperty('--brand-foreground', colors.primary);
  }

  if (colors.light) {
    root.style.setProperty('--brand-light', colors.light);
    root.style.setProperty('--brand-light-rgb', hexToRgb(colors.light));
  }

  if (colors.dark) {
    root.style.setProperty('--brand-dark', colors.dark);
    root.style.setProperty('--brand-dark-rgb', hexToRgb(colors.dark));
  }

  // Override shadcn/ux theme variables
  if (colors.background) {
    root.style.setProperty('--background', colors.background);
  }

  if (colors.foreground) {
    root.style.setProperty('--foreground', colors.foreground);
    root.style.setProperty('--card-foreground', colors.foreground);
    root.style.setProperty('--popover-foreground', colors.foreground);
    root.style.setProperty('--secondary-foreground', colors.foreground);
  }

  if (colors.surface) {
    root.style.setProperty('--card', colors.surface);
    root.style.setProperty('--popover', colors.surface);
    root.style.setProperty('--sidebar', colors.surface);
  }

  if (colors.surfaceElevated) {
    root.style.setProperty('--muted', colors.surfaceElevated);
    root.style.setProperty('--secondary', colors.surfaceElevated);
  }

  if (colors.mutedForeground) {
    root.style.setProperty('--muted-foreground', colors.mutedForeground);
  }

  if (colors.border) {
    root.style.setProperty('--border', colors.border);
    root.style.setProperty('--input', colors.border);
    root.style.setProperty('--sidebar-border', colors.border);
  }

  if (colors.accent) {
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--ring', colors.accent);
  }
}
