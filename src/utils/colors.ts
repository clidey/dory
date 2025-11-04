import docsConfig from '../../docs/dory.json' with { type: 'json' };
import type { DoryConfig } from '../types/config';

const config = docsConfig as DoryConfig;

/**
 * Converts hex color to RGB values for CSS variable usage
 */
function hexToRgb(hex: string): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Parse hex values
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return `${r} ${g} ${b}`;
}

/**
 * Load and apply brand colors from dory.json configuration
 * Sets CSS variables for use throughout the application
 */
export function loadColors() {
  const { colors } = config;
  if (!colors) return;

  // Set CSS variables on the root element for both light and dark modes
  const root = document.documentElement;

  // Set primary color (used in both light and dark mode)
  if (colors.primary) {
    root.style.setProperty('--brand-primary', colors.primary);
    root.style.setProperty('--brand-primary-rgb', hexToRgb(colors.primary));
  }

  // Set light mode brand color
  if (colors.light) {
    root.style.setProperty('--brand-light', colors.light);
    root.style.setProperty('--brand-light-rgb', hexToRgb(colors.light));
  }

  // Set dark mode brand color
  if (colors.dark) {
    root.style.setProperty('--brand-dark', colors.dark);
    root.style.setProperty('--brand-dark-rgb', hexToRgb(colors.dark));
  }

  // Set the legacy variable for backward compatibility
  if (colors.primary) {
    root.style.setProperty('--brand-foreground', colors.primary);
  }
}
