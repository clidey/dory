import docsConfig from '../../docs/dory.json';

export function loadFonts() {
  const { fonts } = docsConfig;
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