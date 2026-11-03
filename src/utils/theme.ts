import docsConfig from '../../docs/dory.json' with { type: 'json' };
import type { DoryConfig } from '../types/config';

const config = docsConfig as DoryConfig;

export function loadTheme() {
  const root = document.documentElement;
  const { theme } = config;

  // Apply forced dark/light mode
  if (theme?.mode === 'dark') {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else if (theme?.mode === 'light') {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }

  // Apply border radius
  if (theme?.radius) {
    root.style.setProperty('--radius', theme.radius);
  }
}
