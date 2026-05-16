import docsConfig from '../../docs/dory.json' with { type: 'json' };
import type { DoryConfig } from '../types/config';

const config = docsConfig as DoryConfig;

export function loadFonts() {
  const { fonts } = config;
  if (!fonts) return;

  const root = document.documentElement;

  // If a stylesheet URL is provided (e.g. Google Fonts), use that
  if (fonts.stylesheet) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fonts.stylesheet;
    document.head.appendChild(link);
  } else if (fonts.source && fonts.format) {
    // Fallback: load individual font files via @font-face
    const style = document.createElement('style');
    let fontFaces = `
      @font-face {
        font-family: '${fonts.family}';
        src: url('${fonts.source}') format('${fonts.format}');
        font-display: swap;
      }
    `;

    if (fonts.heading?.source && fonts.heading?.format) {
      fontFaces += `
      @font-face {
        font-family: '${fonts.heading.family}';
        src: url('${fonts.heading.source}') format('${fonts.heading.format}');
        ${fonts.heading.weight ? `font-weight: ${fonts.heading.weight};` : ''}
        font-display: swap;
      }
      `;
    }

    if (fonts.mono?.source && fonts.mono?.format) {
      fontFaces += `
      @font-face {
        font-family: '${fonts.mono.family}';
        src: url('${fonts.mono.source}') format('${fonts.mono.format}');
        ${fonts.mono.weight ? `font-weight: ${fonts.mono.weight};` : ''}
        font-display: swap;
      }
      `;
    }

    style.textContent = fontFaces;
    document.head.appendChild(style);
  }

  // Set CSS variables for font families
  root.style.setProperty('--font-body', `'${fonts.family}', sans-serif`);
  root.style.fontFamily = `'${fonts.family}', sans-serif`;

  if (fonts.heading) {
    root.style.setProperty('--font-heading', `'${fonts.heading.family}', serif`);
  }

  if (fonts.mono) {
    root.style.setProperty('--font-mono', `'${fonts.mono.family}', monospace`);
  }
}
