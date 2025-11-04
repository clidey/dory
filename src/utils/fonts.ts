import docsConfig from '../../docs/dory.json' with { type: 'json' };
import type { DoryConfig } from '../types/config';

const config = docsConfig as DoryConfig;

export function loadFonts() {
  const { fonts } = config;
  if (!fonts) return;

  // Create a style element for the font face
  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-family: '${fonts.family}';
      src: url('${fonts.source}') format('${fonts.format}');
      font-display: swap;
    }
  `;
  document.head.appendChild(style);

  // Apply the font family to the root element
  document.documentElement.style.fontFamily = fonts.family;
} 